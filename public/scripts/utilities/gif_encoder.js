import { Buffer } from './buffer.js';

const BITS_IN_BYTE = 8;

/*
GIF (Graphics Interchange Format) is used to store
multiple bitmap images in a single file
Please refer to this link for specification source:
https://www.w3.org/Graphics/GIF/spec-gif89a.txt
 */
class GifEncoder {
  static #headerSize = 0x0D;
  static #trailerSize = 0x01;
  static #localImageDescriptorSize = 0x0A;

  constructor() {
  }

  /*
  Creates a byte array which represents a file of GIF89a format.
  The comment lines represent structures of format in a format:
  Name | Size | Offset | Description
   */
  encode(frames) {
    this.fileBuffer = new Buffer();
    this.#setHeader();
    frames.forEach((frame) => this.#setFrame(frame));
    this.#setTerminator();
    return this.fileBuffer.data;
  }

  #setHeader() {
    const buffer = new Buffer(GifEncoder.#headerSize);
    //Signature | 3 bytes | 0x00 | 'GIF'
    buffer.writeString('GIF', 0x00);
    //Version | 3 bytes | 0x03 | The version we use is 89a
    buffer.writeString('89a', 0x03);
    GifEncoder.#setLogicalScreenDescriptor(buffer);
    this.#appendBuffer(buffer);
    // const bufferTwo = new Buffer(8);
    // bufferTwo.writeArray([0x21, 0xF9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00], 0x00);
    // this.#appendBuffer(bufferTwo);
  }

  static #setLogicalScreenDescriptor(buffer) {
    //Logical Screen Width | 2 bytes | 0x06 | Width of any frame
    buffer.write16Integer(10, 0x06);
    //Logical Screen Height | 2 bytes | 0x08 | Height of any frame
    buffer.write16Integer(10, 0x08);
    /*
    Packed fields | 1 byte | 0x0A | Contains following subfields of data:
    Bit 7 - Global Color Table Flag - 0, not used
    Bit 4-6 - Color Resolution - Number of bits in original palette
    Bit 3 - Color Table Sort Flag - 0, not used
    Bit 0-2 - Size of the Global Color Table - Not used
     */
    const fields = 0b00000000;
    buffer.writeInteger(BITS_IN_BYTE, fields, 0x0A);

    //Background Color | 1 byte | 0x0B | Skipped, not used
    //Aspect Ratio | 1 byte | 0x0C | Skipped, not used
  }

  #setTerminator() {
    const buffer = new Buffer(GifEncoder.#trailerSize);
    //Terminator | 2 bytes | 0x00 | Special value 3Bh
    buffer.writeInteger(BITS_IN_BYTE, 0x3B, 0x00);
    this.#appendBuffer(buffer);
  }

  #appendBuffer(buffer) {
    const newArray = [...this.fileBuffer.data, ...buffer.data];
    this.fileBuffer = new Buffer(new Uint8Array(newArray));
  }

  #setFrame(imageData) {
    this.#setLocalImageDescriptor(imageData);
    this.#setLocalColorTable(imageData);
    this.#setImage(imageData);
  }

  #setLocalImageDescriptor(imageData) {
    const buffer = new Buffer(GifEncoder.#localImageDescriptorSize);
    //Separator | 1 byte | 0x00 | Special value 2Ch
    buffer.writeInteger(BITS_IN_BYTE, 0x2C, 0x00);
    //Left | 2 byte | 0x01 | X position
    buffer.write16Integer(0x00, 0x01);
    //Top | 2 byte | 0x03 | Y position
    buffer.write16Integer(0x00, 0x03);
    //Width | 2 byte | 0x05 | Width of the image in pixels
    buffer.write16Integer(10, 0x05);
    //Height | 2 byte | 0x07 | Height of the image in pixels
    buffer.write16Integer(10, 0x07);
    /*
    Packed fields | 1 byte | 0x0A | Contains following subfields of data:
    Bit 7 - Local Color Table Flag - 1, always used
    Bit 6 - Interlace Flag - 0, not interlaced
    Bit 5 - Sort Flag - 0, not sorted
    Bit 3-4 - Reserved
    Bit 0-2 - Size of Local Color Table Entry - Number of bits per entry
     */
    const fields = 0b10000001;
    buffer.writeInteger(BITS_IN_BYTE, fields, 0x09);
    this.#appendBuffer(buffer);
  }

  //Temporary implementation
  #setLocalColorTable(imageData) {
    const colorLength = 3;
    const size = 4;
    const buffer = new Buffer(colorLength * size);
    //Only black and white color
    buffer.writeInteger(colorLength * BITS_IN_BYTE, 0xFFFFFF, 0x00);
    buffer.writeInteger(colorLength * BITS_IN_BYTE, 0xFF0000, 0x03);
    buffer.writeInteger(colorLength * BITS_IN_BYTE, 0x0000FF, 0x06);
    buffer.writeInteger(colorLength * BITS_IN_BYTE, 0x000000, 0x09);
    this.#appendBuffer(buffer);
  }

  #setImage(imageData) {
    const buffer = new Buffer(25);
    buffer.writeArray([0x02, 0x16, 0x8C, 0x2D, 0x99, 0x87, 0x2A, 0x1C, 0xDC, 0x33, 0xA0, 0x02, 0x75, 0xEC, 0x95, 0xFA, 0xA8, 0xDE, 0x60, 0x8C, 0x04, 0x91, 0x4C, 0x01, 0x00], 0x00);
    this.#appendBuffer(buffer);
  }
}

export { GifEncoder };
