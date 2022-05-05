/*There is a native implementation of canvas BMP conversion, but it is not supported by all browsers.
And, after all, why not have fun?
 */

class Buffer {
  constructor(size) {
    this.data = new Uint8Array(size);
  }

  writeString(string, offset) {
    this.data.set(stringToByteArray(string), offset);
  }

  write16Integer(number, offset) {
    const array = intToByteArray(number, 2);
    this.data.set(array, offset);
  }

  write32Integer(number, offset) {
    const array = intToByteArray(number, 4);
    this.data.set(array, offset);
  }

  writeColor({ r, g, b }, offset) {
    //color is stored in reversed BGR order
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
  let int = number;

  for (let i = 0; i < size; i++) {
    const byte = int & 0xff;
    array[i] = byte;
    int = (int - byte) / 0xff;
  }

  return array;
}

/*
Creating a byte array which represents an image file of BMP24 format.
Each pixel will be represented as a triplet of bytes: red, green and blue intensity accordingly.
Refer to this link if you want to know more about BMP file format
http://www.ece.ualberta.ca/~elliott/ee552/studentAppNotes/2003_w/misc/bmp_file_format/bmp_file_format.htm
 */
export const bmpEncode = (imageData) => {
  const perPixel = 3 * 8;

  const padding = imageData.width % 4;

  const headerSize = 0x0E;
  const infoHeaderSize = 0x28;
  const pixelDataSize = (3 * imageData.width + padding) * imageData.height;
  const fileSize = headerSize + infoHeaderSize + pixelDataSize;

  const data = new Buffer(fileSize);

  /*
  Setting up the HEADER of the file
   */

  //Signature | 2 bytes | 0x00 | 'BM'
  data.writeString('BM', 0x00);
  //FileSize | 4 bytes | 0x02 | File size in bytes
  data.write32Integer(fileSize, 0x02);
  //Reserved | 4 bytes | 0x06 | Left empty
  //DataOffset | 4 bytes | 0x0A | Offset from beginning of file to the beginning of the bitmap data
  data.write32Integer(headerSize + infoHeaderSize, 0x0A);

  /*
  Setting up the INFO HEADER of the file
   */

  //Size | 4 bytes | 0x0E | Size of InfoHeader
  data.write32Integer(infoHeaderSize, 0x0E);
  //Width | 4 bytes | 0x12 | Horizontal width in pixels
  data.write32Integer(imageData.width, 0x12);
  //Height | 4 bytes | 0x16 | Vertical height in pixels
  data.write32Integer(imageData.width, 0x16);
  //Planes | 2 bytes | 0x1A | Number of planes = 1
  data.write16Integer(1, 0x1A);
  //Bits Per Pixel | 2 bytes | 0x1C | We are using 24bit RGB, so = 24
  data.write16Integer(perPixel, 0x1C);
  //Compression | 4 bytes | 0x1E | We aren't using any compression, so = 0
  data.write32Integer(0, 0x1E);
  //ImageSize | 4 bytes | 0x22 | We aren't using any compression, so = 0
  data.write32Integer(0, 0x22);
  //XPixelsPerM | 4 bytes | 0x26 | Horizontal resolution: Pixels/meter
  data.write32Integer(0, 0x26);
  //YPixelsPerM | 4 bytes | 0x2A | Vertical resolution: Pixels/meter
  data.write32Integer(0, 0x2A);
  //Colors Used | 4 bytes | 0x2E | Number of actually used colors
  data.write32Integer(0, 0x2E);
  //Important Colors | 4 bytes | 0x32 | Number of important colors
  data.write32Integer(0, 0x32);

  /*
  Setting up Pixel Data
   */

  let position = 0x36;

  for (let i = imageData.width - 1; i >= 0; i--) {
    for (let j = 0; j < imageData.height; j++) {
      data.writeColor(imageData.getPixelColor(i, j), position);
      position += 3;
    }
    position += padding;
  }

  return data;
};
