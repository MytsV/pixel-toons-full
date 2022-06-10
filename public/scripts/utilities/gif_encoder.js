import { Buffer } from './buffer.js';
import { LZWCompressor } from './lzw_compression.js';

const BITS_IN_BYTE = 8;
const COLOR_PARAMETERS = 3;
const MAX_COLOR_PARAMETERS = 4;

/*
GIF (Graphics Interchange Format) is used to store
multiple bitmap images in a single file
Please refer to this link for specification source:
https://www.w3.org/Graphics/GIF/spec-gif89a.txt
 */
class GifEncoder {
  static #headerSize = 0x06;
  static #logicalDescriptorSize = 0x07;
  static #trailerSize = 0x01;
  static #localImageDescriptorSize = 0x0A;
  static #applicationExtensionSize = 19;
  static #graphicsControlExtensionSize = 8;
  #mainBuffer;

  constructor() {
  }

  /*
  Creates a byte array which represents a file of GIF89a format.
  The comment lines represent structures of format in a format:
  Name | Size | Offset | Description
   */
  encode(frames) {
    this.#mainBuffer = new Buffer();
    this.#setHeader();
    this.#setLogicalScreenDescriptor(GifEncoder.#getImageSize(frames));
    this.#setApplicationExtension();
    frames.forEach((frame) => this.#setFrameData(frame));
    this.#setTerminator();
    return this.#mainBuffer.data;
  }

  #setHeader() {
    const buffer = new Buffer(GifEncoder.#headerSize);
    //Signature and version | 6 bytes | 0x00 | 'GIF89a'
    buffer.writeString('GIF89a');
    this.#appendBuffer(buffer);
  }

  #setLogicalScreenDescriptor({ width, height }) {
    const buffer = new Buffer(GifEncoder.#logicalDescriptorSize);

    //Logical Screen Width | 2 bytes | 0x06 | Width of any frame
    buffer.write16Integer(width);
    //Logical Screen Height | 2 bytes | 0x08 | Height of any frame
    buffer.write16Integer(height);
    /*
    Packed fields | 1 byte | 0x0A | Contains following subfields of data:
    Bit 7 - Global Color Table Flag - 0, not used
    Bit 4-6 - Color Resolution - Number of bits in original palette
    Bit 3 - Color Table Sort Flag - 0, not used
    Bit 0-2 - Size of the Global Color Table - Not used
     */
    const fields = 0b00000000;
    buffer.writeInteger(BITS_IN_BYTE, fields);

    //Background Color | 1 byte | 0x0B | Skipped, not used
    //Aspect Ratio | 1 byte | 0x0C | Skipped, not used

    this.#appendBuffer(buffer);
  }

  static #getImageSize(frames) {
    const firstFrame = frames[0];
    return {
      width: firstFrame.width,
      height: firstFrame.height
    };
  }

  #setApplicationExtension() {
    const buffer = new Buffer(GifEncoder.#applicationExtensionSize);
    //Extension introducer | 1 byte | 0x00 | Special value 21h
    buffer.writeInteger(BITS_IN_BYTE, 0x21);
    //Application Extension Label | 1 byte | 0x01 | Special value 0xFF
    buffer.writeInteger(BITS_IN_BYTE, 0xFF);
    //Byte size of block | 1 byte | 0x02 | Special value - 11 bytes
    buffer.writeInteger(BITS_IN_BYTE, 0x0B);
    //Special label | 11 bytes | 0x03 | NETSCAPE2.0
    buffer.writeString('NETSCAPE2.0');
    //Length of data sub-block | 1 byte | 0x0E | Special value - 3 bytes
    buffer.writeInteger(BITS_IN_BYTE, 0x03);
    //Data block values | 3 bytes | 0x0F | Special values
    buffer.writeArray([0x01, 0x00, 0x00]);

    //Block terminator | 1 byte | 0x10 | Special value 00h

    this.#appendBuffer(buffer);
  }

  #setTerminator() {
    const buffer = new Buffer(GifEncoder.#trailerSize);
    //Terminator | 2 bytes | 0x00 | Special value 3Bh
    buffer.writeInteger(BITS_IN_BYTE, 0x3B);
    this.#appendBuffer(buffer);
  }

  #setFrameData(imageData) {
    this.#setGraphicControlExtension();
    this.#setLocalImageDescriptor(imageData);
    this.#setLocalColorTable(imageData);
    this.#setImage(imageData);
  }

  #setLocalImageDescriptor(imageData) {
    const buffer = new Buffer(GifEncoder.#localImageDescriptorSize);

    //Separator | 1 byte | 0x00 | Special value 2Ch
    buffer.writeInteger(BITS_IN_BYTE, 0x2C);

    //Left | 2 byte | 0x01 | X position, skipped
    //Top | 2 byte | 0x03 | Y position, skipped

    //Width | 2 byte | 0x05 | Width of the image in pixels
    buffer.write16Integer(imageData.width, 0x05);
    //Height | 2 byte | 0x07 | Height of the image in pixels
    buffer.write16Integer(imageData.height);

    /*
    Packed fields | 1 byte | 0x0A | Contains following subfields of data:
    Bit 7 - Local Color Table Flag - 1, always used
    Bit 6 - Interlace Flag - 0, not interlaced
    Bit 5 - Sort Flag - 0, not sorted
    Bit 3-4 - Reserved
    Bit 0-2 - Size of Local Color Table Entry - Number of bits per entry
     */
    const fields = 0b10000001;
    buffer.writeInteger(BITS_IN_BYTE, fields);
    this.#appendBuffer(buffer);
  }

  #setGraphicControlExtension() {
    const buffer = new Buffer(GifEncoder.#graphicsControlExtensionSize);
    //Extension introducer | 1 byte | 0x00 | Special value 21h
    buffer.writeInteger(BITS_IN_BYTE, 0x21);
    //Graphic Control Label | 1 byte | 0x01 | Special value 0xF9
    buffer.writeInteger(BITS_IN_BYTE, 0xF9);
    //Byte size of block | 1 byte | 0x02 | Special value of 4 bytes
    buffer.writeInteger(BITS_IN_BYTE, 0x04);
    /*
    Packed fields | 1 byte | 0x03 | Contains following subfields of data:
    Bit 5-7 - Reserved
    Bit 2-4 - Disposal Method - Not used
    Bit 1 - User Input Flag - Don't wait for input
    Bit 0 - Transparent Color Flag - Don't specify transparent color
     */
    const fields = 0b10000001;
    buffer.writeInteger(BITS_IN_BYTE, fields);
    //Delay time | 2 bytes | 0x04 | Time in 1/100 of seconds
    buffer.write16Integer(0x0a);

    //Transparent color index | 1 byte | 0x06 | Not used
    //Block terminator | 1 byte | 0x07 | Special value 00h

    this.#appendBuffer(buffer);
  }

  //Temporary
  #setLocalColorTable(imageData) {
    const table = GifEncoder.#getLocalColorTable(imageData);
    const buffer = new Buffer(COLOR_PARAMETERS * table.length);
    table.forEach((color) => buffer.writeInteger(COLOR_PARAMETERS * BITS_IN_BYTE, color));
    this.#appendBuffer(buffer);
  }

  static #getLocalColorTable(imageData) {
    return [
      0xFFFFFF,
      0xFF0000,
      0x0000FF,
      0x000000
    ];
  }

  #setImage(imageData) {
    const indices = GifEncoder.#pixelsToIndices(imageData);
    const codeSize = 2;
    const compressor = new LZWCompressor(codeSize);
    const compressed = compressor.compress(indices);
    const length = 2 + compressed.reduce((acc, block) => acc + block.length + 1, 0);
    const buffer = new Buffer(length);
    buffer.writeInteger(BITS_IN_BYTE, codeSize);
    compressed.forEach((block) => {
      buffer.writeArray([block.length, ...block]);
    });
    buffer.writeInteger(BITS_IN_BYTE, 0);

    this.#appendBuffer(buffer);
  }

  static #pixelsToIndices(imageData) {
    const indices = new Uint8Array(imageData.height * imageData.width);
    const table = GifEncoder.#getLocalColorTable(imageData);
    for (let i = 0; i < imageData.height; i++) {
      for (let j = imageData.width - 1; j >= 0; j--) {
        const dataPos = (i * imageData.width + j) * MAX_COLOR_PARAMETERS;
        const color = imageData.data.slice(dataPos, dataPos + COLOR_PARAMETERS);
        const colorConverted = (color[2] !== 0 ? color[2] << 16 : color[2]) + (color[1] !== 0 ? color[1] << 8 : color[1]) + color[0];
        const index = table.indexOf(colorConverted);
        indices.set([index], i * imageData.width + j);
      }
    }
    return indices;
  }

  #appendBuffer(buffer) {
    const newArray = [...this.#mainBuffer.data, ...buffer.data];
    this.#mainBuffer = new Buffer(new Uint8Array(newArray));
  }
}



export { GifEncoder };
