/*
There is a native implementation of canvas BMP conversion, but it is not supported by all browsers.
And, after all, why not have fun?
 */

/*
A class that represents a writable array of bytes.
Created for easier work with byte size and different types of written values.
 */
class Buffer {
  constructor(size) {
    this.data = new Uint8Array(size);
  }

  writeString(string, offset) {
    this.data.set(stringToByteArray(string), offset);
  }

  write16Integer(number, offset) {
    const bits = 16;
    const array = intToByteArray(number, bits / 8);
    this.data.set(array, offset);
  }

  write32Integer(number, offset) {
    const bits = 32;
    const array = intToByteArray(number, bits / 8);
    this.data.set(array, offset);
  }

  //Color is stored in reversed BGR order
  writeColor({ r, g, b }, offset) {
    this.data.set([b, g, r], offset);
  }
}

//Converts a string to ASCII code characters array
function stringToByteArray(string) {
  const array = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    array[i] = string[i].charCodeAt(0);
  }
  return array;
}

//Converts an unsigned integer into a byte array depending on integer size
function intToByteArray(number, size) {
  const array = new Uint8Array(size);
  let tempNumber = number;

  for (let i = 0; i < size; i++) {
    const byte = tempNumber & 0xff; //Retrieves the last byte of an integer
    array[i] = byte;
    tempNumber = (tempNumber - byte) / 0xff;
  }

  return array;
}

/*
Only supports BMP24 format for now.
 */
class BmpEncoder {
  static #headerSize = 0x0E;
  static #infoHeaderSize = 0x28;
  static #perPixel = 3 * 8;

  #data;

  constructor(image) {
    const padding = image.width % 4;
    const pixelDataSize = (3 * image.width + padding) * image.height;
    this.fileSize = BmpEncoder.#headerSize + BmpEncoder.#infoHeaderSize + pixelDataSize;

    this.#data = new Buffer(this.fileSize);
    this.image = image;
  }

  /*
  Creates a byte array which represents an image file of BMP24 format (opacity not included).
  Each pixel will be represented as a triplet of bytes: red, green and blue intensity accordingly.
  Refer to this link if you want to know more about BMP file format:
  http://www.ece.ualberta.ca/~elliott/ee552/studentAppNotes/2003_w/misc/bmp_file_format/bmp_file_format.htm
  The comment lines represent structures of format in a format:
  Name | Size | Offset | Description
   */
  encode() {
    this.#setHeader();
    this.#setInfoHeader();
    this.#setPixelData();

    return this.#data;
  }

  #setHeader() {
    //Signature | 2 bytes | 0x00 | 'BM'
    this.#data.writeString('BM', 0x00);
    //FileSize | 4 bytes | 0x02 | File size in bytes
    this.#data.write32Integer(this.fileSize, 0x02);

    //Reserved | 4 bytes | 0x06 | Left filled with 0 bytes

    //DataOffset | 4 bytes | 0x0A | Offset from beginning of file to the beginning of the bitmap data
    this.#data.write32Integer(BmpEncoder.#headerSize + BmpEncoder.#infoHeaderSize, 0x0A);
  }

  #setInfoHeader() {
    //Size | 4 bytes | 0x0E | Size of InfoHeader
    this.#data.write32Integer(BmpEncoder.#infoHeaderSize, 0x0E);
    //Width | 4 bytes | 0x12 | Horizontal width in pixels
    this.#data.write32Integer(this.image.width, 0x12);
    //Height | 4 bytes | 0x16 | Vertical height in pixels
    this.#data.write32Integer(this.image.height, 0x16);
    //Planes | 2 bytes | 0x1A | Number of planes = 1
    this.#data.write16Integer(1, 0x1A);
    //Bits Per Pixel | 2 bytes | 0x1C | We are using 24bit RGB, so = 24
    this.#data.write16Integer(BmpEncoder.#perPixel, 0x1C);

    /*
    The following structures are always filled with 0 bytes:
    Compression | 4 bytes | 0x1E | We aren't using any compression, so = 0
    ImageSize | 4 bytes | 0x22 | We aren't using any compression, so = 0
    XPixelsPerM | 4 bytes | 0x26 | Horizontal resolution: Pixels/meter
    YPixelsPerM | 4 bytes | 0x2A | Vertical resolution: Pixels/meter
    Colors Used | 4 bytes | 0x2E | Number of actually used colors
    Important Colors | 4 bytes | 0x32 | Number of important colors
     */
  }

  #setPixelData() {
    let position = 0x36;
    const padding = this.image.width % 4;
    const bytesPerPixel = BmpEncoder.#perPixel / 8;

    for (let i = this.image.width - 1; i >= 0; i--) {
      for (let j = 0; j < this.image.height; j++) {
        this.#data.writeColor(this.image.getPixelColor(i, j), position);
        position += bytesPerPixel;
      }
      position += padding;
    }
  }
}

export { BmpEncoder };
