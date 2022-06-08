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
  const headerSize = 0x11;
  const logicalDescriptorSize = 0x01;
  const globalColorTableSize = 0xFF;
  const trailerSize = 0x02;
  const buffer = new Buffer(headerSize + logicalDescriptorSize + globalColorTableSize + trailerSize);
};
