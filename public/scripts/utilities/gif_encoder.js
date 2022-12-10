import { Buffer } from './buffer.js';
import { LZWCompressor } from './lzw_compression.js';

const BITS_IN_BYTE = 8;
const MIN_COLOR_PARAMETERS = 3;
const MAX_COLOR_PARAMETERS = 4;

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
    this.#setHeader(frames[0]);
    this.#setNetscape();
    frames.forEach((frame) => this.#setFrameData(frame));
    this.#setTerminator();
    return this.fileBuffer.data;
  }

  #setHeader(frame) {
    const buffer = new Buffer(GifEncoder.#headerSize);
    //Signature and version | 6 bytes | 0x00 | 'GIF89a'
    buffer.writeString('GIF89a');
    this.#setLogicalScreenDescriptor(buffer, frame);
    this.#appendBuffer(buffer);
  }

  #setLogicalScreenDescriptor(buffer, frame) {
    //Logical Screen Width | 2 bytes | 0x06 | Width of any frame
    buffer.write16Integer(frame.width);
    //Logical Screen Height | 2 bytes | 0x08 | Height of any frame
    buffer.write16Integer(frame.height);
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
  }

  #setNetscape() {
    const array = [0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, 0x03, 0x01, 0x00, 0x00, 0x00];
    const buffer = new Buffer(array.length);
    buffer.writeArray(array);
    this.#appendBuffer(buffer);
  }

  #setTerminator() {
    const buffer = new Buffer(GifEncoder.#trailerSize);
    //Terminator | 2 bytes | 0x00 | Special value 3Bh
    buffer.writeInteger(BITS_IN_BYTE, 0x3B);
    this.#appendBuffer(buffer);
  }

  #appendBuffer(buffer) {
    const newArray = [...this.fileBuffer.data, ...buffer.data];
    this.fileBuffer = new Buffer(new Uint8Array(newArray));
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
    const bufferTwo = new Buffer(8);
    bufferTwo.writeArray([0x21, 0xF9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00]);
    this.#appendBuffer(bufferTwo);
  }

  //Temporary
  #setLocalColorTable(imageData) {
    const table = GifEncoder.#getLocalColorTable(imageData);
    const buffer = new Buffer(MIN_COLOR_PARAMETERS * table.length);
    table.forEach((color) => buffer.writeInteger(MIN_COLOR_PARAMETERS * BITS_IN_BYTE, color));
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
        const color = imageData.data.slice(dataPos, dataPos + MIN_COLOR_PARAMETERS);
        const colorConverted = (color[2] !== 0 ? color[2] << 16 : color[2]) + (color[1] !== 0 ? color[1] << 8 : color[1]) + color[0];
        const index = table.indexOf(colorConverted);
        indices.set([index], i * imageData.width + j);
      }
    }
    return indices;
  }
}

export { GifEncoder };
