import { Buffer } from './buffer.js';

/*
GIF (Graphics Interchange Format) is a creation of CompuServe and is used
to store multiple bitmap images in a single file
for exchange between platforms and systems.
Please refer to this link for specification source:
https://www.cs.albany.edu/~sdc/csi333/Fal07/Lect/L18/Summary
I take word as 64 bits (for x64 architecture)
This file implements GIF87a version
 */

const encode = (images) => {
  //First we have to convert images, cause another way we don't know the size...
  const headerSize = 0x0D;
  const trailerSize = 0x02;
  const buffer = new Buffer(headerSize + trailerSize);
  let offset = 0x00;
  buffer.writeString('GIF', offset);
  offset += 3;
  buffer.writeString('87a', offset);
  offset += 3;
  buffer.write16Integer(256, offset);
  offset += 2;
  buffer.write16Integer(256, offset);
  offset += 2;
  buffer.writeArray([0b00101110], offset);
  offset += 3;
  buffer.write16Integer(0x3B, offset);

  return buffer.data;
};

export { encode };
