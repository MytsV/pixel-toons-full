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
  static #trailerSize = 0x02;

  constructor() {
  }

  /*
  Creates a byte array which represents a file of GIF89a format.
  The comment lines represent structures of format in a format:
  Name | Size | Offset | Description
   */
  encode(frames) {
    this.buffer = new Buffer(GifEncoder.#headerSize + GifEncoder.#trailerSize);
    this.#setHeader();
    this.#setLogicalScreenDescriptor();
    this.#setTerminator();
    return this.buffer.data;
  }

  #setHeader() {
    //Signature | 3 bytes | 0x00 | 'GIF'
    this.buffer.writeString('GIF', 0x00);
    //Version | 3 bytes | 0x03 | The version we use is 89a
    this.buffer.writeString('89a', 0x03);
  }

  #setLogicalScreenDescriptor() {
    //Logical Screen Width | 2 bytes | 0x06 | Width of any frame
    this.buffer.write16Integer(256, 0x06);
    //Logical Screen Height | 2 bytes | 0x08 | Height of any frame
    this.buffer.write16Integer(256, 0x08);
    /*
    Packed fields | 1 byte | 0x0A | Contains following subfields of data:
    Bit 0 - Global Color Table Flag - 0, not used
    Bit 1-3 - Color Resolution - Number of bits in original palette
    Bit 4 - Color Table Sort Flag - 0, not used
    Bit 5-7 - Size of the Global Color Table - Not used
     */
    const fields = 0b01110111;
    this.buffer.writeInteger(BITS_IN_BYTE, fields, 0x0A);

    //Background Color | 1 byte | 0x0B | Skipped, not used
    //Aspect Ratio | 1 byte | 0x0C | Skipped, not used
  }

  #setTerminator() {
    this.buffer.write16Integer(0x3B, 0x0D);
  }
}

export { GifEncoder };
