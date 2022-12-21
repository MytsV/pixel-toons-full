const CHANNEL_COUNT = 4;
const COLOR_RANGE = 255;

/*
This file implements an algorithm created by Dominic Szablewski.
Full appreciation to the author!
Check the original code in C:
https://github.com/phoboslab/qoi
And specifications:
https://phoboslab.org/log/2021/11/qoi-fast-lossless-image-compression
 */

//Byte padding specified by format
const PADDING = [0, 0, 0, 0, 0, 0, 0, 1];

/*
"Tags" which define chunk types. They can be either two-bit or eight-bit.
 */

/*
Tag after which the 6-bit index of previously seen pixel is inserted.
┌─ TAG_INDEX ─────────────┐
│         Byte[0]         │
│  7  6  5  4  3  2  1  0 │
│───────┼─────────────────│
│  0  0 │     index       │
└───────┴─────────────────┘
 */
const TAG_INDEX = 0x00;

/*
Tag after which the 2-bit differences from previous pixel color are inserted.
These differences should lay in the range -2..1
┌─ TAG_DIFF ──────────────┐
│         Byte[0]         │
│  7  6  5  4  3  2  1  0 │
│───────┼─────┼─────┼─────│
│  0  1 │  dr │  dg │  db │
└───────┴─────┴─────┴─────┘
 */
const TAG_DIFF = 0b01000000;
const DIFF_RANGE = 2;

/*
Tag after which such differences are inserted:
- of green channel in range -32..31
- of red and blue channels with green one in range -8..7
┌─ TAG_LUMA ──────────────┬─────────────────────────┐
│         Byte[0]         │         Byte[1]         │
│  7  6  5  4  3  2  1  0 │  7  6  5  4  3  2  1  0 │
│───────┼─────────────────┼─────────────┼───────────│
│  1  0 │   diff green    │   dr - dg   │  db - dg  │
└───────┴─────────────────┴─────────────┴───────────┘
 */
const TAG_LUMA = 0b10000000;
const LUMA_GREEN_RANGE = 32;
const LUMA_MISC_RANGE = 8;

/*
Tag after which the run length in range 1..62 of previous pixel is inserted:
┌─ TAG_RUN ───────────────┐
│         Byte[0]         │
│  7  6  5  4  3  2  1  0 │
│───────┼─────────────────│
│  1  1 │       run       │
└───────┴─────────────────┘
 */
const TAG_RUN = 0b11000000;
const MAX_RUN_LENGTH = 62;

/*
Tag after which the full RGB color value is inserted
┌─ TAG_RGB ───────────────┬─────────┬─────────┬─────────┐
│         Byte[0]         │ Byte[1] │ Byte[2] │ Byte[3] │
│  7  6  5  4  3  2  1  0 │ 7 .. 0  │ 7 .. 0  │ 7 .. 0  │
│─────────────────────────┼─────────┼─────────┼─────────│
│  1  1  1  1  1  1  1  0 │   red   │  green  │  blue   │
└─────────────────────────┴─────────┴─────────┴─────────┘
 */
const TAG_RGB = 0xfe;

/*
Tag after which the full RGBA color value is inserted
┌─ TAG_RGBA ──────────────┬─────────┬─────────┬─────────┬─────────┐
│         Byte[0]         │ Byte[1] │ Byte[2] │ Byte[3] │ Byte[4] │
│  7  6  5  4  3  2  1  0 │ 7 .. 0  │ 7 .. 0  │ 7 .. 0  │ 7 .. 0  │
│─────────────────────────┼─────────┼─────────┼─────────┼─────────│
│  1  1  1  1  1  1  1  1 │   red   │  green  │  blue   │  alpha  │
└─────────────────────────┴─────────┴─────────┴─────────┴─────────┘
 */
const TAG_RGBA = 0xff;

//Mask for retrieving 2-bit tags
const TWO_BIT_MASK = 0b11000000;

const TABLE_SIZE = 64;

class Pixel {
  constructor(r, g, b, a = COLOR_RANGE) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  equals(pixel) {
    const { r, g, b, a } = this;
    return r === pixel.r && g === pixel.g && b === pixel.b && a === pixel.a;
  }

  clone() {
    const { r, g, b, a } = this;
    return new Pixel(r, g, b, a);
  }
}

//Stub class with interface identical to real ImageData
class ImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * CHANNEL_COUNT);
  }
}

class QoiCompressor {
  constructor() {
  }

  compress({ data }) {
    const output = [];
    const colorTable = new Uint8Array(TABLE_SIZE);

    let previousPix = getDefaultPixel();
    let currentPix = previousPix.clone();
    let runLength = 0;

    for (let pxPos = 0; pxPos < data.length; pxPos += CHANNEL_COUNT) {
      const colorArray = data.slice(pxPos, pxPos + CHANNEL_COUNT);
      currentPix = new Pixel(...colorArray);

      if (currentPix.equals(previousPix)) {
        runLength++;
        if (runLength === MAX_RUN_LENGTH || pxPos === data.length - CHANNEL_COUNT) {
          output.push(TAG_RUN | (runLength - 1));
          runLength = 0;
        }
      } else {
        const indexPos = hashColor(currentPix) % TABLE_SIZE;

        if (runLength > 0) {
          output.push(TAG_RUN | (runLength - 1));
          runLength = 0;
        }

        if (currentPix.equals(colorTable[indexPos])) {
          output.push(TAG_INDEX | indexPos);
        } else {
          colorTable[indexPos] = currentPix;

          if (currentPix.a === previousPix.a) {
            const vr = currentPix.r - previousPix.r;
            const vg = currentPix.g - previousPix.g;
            const vb = currentPix.b - previousPix.b;

            const vgR = vr - vg;
            const vgB = vb - vg;

            if (
              vr >= DIFF_RANGE && vr < DIFF_RANGE &&
              vg >= DIFF_RANGE && vg < DIFF_RANGE &&
              vb >= DIFF_RANGE && vb < DIFF_RANGE
            ) {
              output.push(TAG_DIFF | (vr + DIFF_RANGE) << 4 | (vg + DIFF_RANGE) << 2 | (vb + DIFF_RANGE));
            } else if (
              vgR >= LUMA_MISC_RANGE && vgR < LUMA_MISC_RANGE &&
              vg >= LUMA_GREEN_RANGE && vg < LUMA_GREEN_RANGE &&
              vgB >= LUMA_MISC_RANGE && vgB < LUMA_MISC_RANGE
            ) {
              output.push(TAG_LUMA | (vg + LUMA_GREEN_RANGE));
              output.push((vgR + LUMA_MISC_RANGE) << 4 | (vgB + LUMA_MISC_RANGE));
            } else {
              output.push(TAG_RGB);
              output.push(currentPix.r);
              output.push(currentPix.g);
              output.push(currentPix.b);
            }
          } else {
            output.push(TAG_RGBA);
            output.push(currentPix.r);
            output.push(currentPix.g);
            output.push(currentPix.b);
            output.push(currentPix.a);
          }
        }
      }
      previousPix = currentPix.clone();
    }

    output.push(...PADDING);

    return output;
  }
}

function decompress(bytes, width, height) {
  const pixels = new ImageData(width, height);
  const index = new Uint8Array(TABLE_SIZE);
  const pxLen = width * height * CHANNEL_COUNT;

  let px = getDefaultPixel();

  const chunksLen = bytes.length - PADDING.length;
  let run = 0;
  let p = 0;

  for (let pxPos = 0; pxPos < pxLen; pxPos += CHANNEL_COUNT) {
    if (run > 0) {
      run--;
    } else if (p < chunksLen) {
      const b1 = bytes[p++];

      if (b1 === TAG_RGB) {
        px.r = bytes[p++];
        px.g = bytes[p++];
        px.b = bytes[p++];
      } else if (b1 === TAG_RGBA) {
        px.r = bytes[p++];
        px.g = bytes[p++];
        px.b = bytes[p++];
        px.a = bytes[p++];
      } else if ((b1 & TWO_BIT_MASK) === TAG_INDEX) {
        px = index[b1];
      } else if ((b1 & TWO_BIT_MASK) === TAG_DIFF) {
        px.r += ((b1 >> 4) & 0x03) - 2;
        px.rg += ((b1 >> 2) & 0x03) - 2;
        px.b += (b1 & 0x03) - 2;
      } else if ((b1 & TWO_BIT_MASK) === TAG_LUMA) {
        const b2 = bytes[p++];
        const vg = (b1 & 0x3f) - 32;
        px.r += vg - 8 + ((b2 >> 4) & 0x0f);
        px.g += vg;
        px.b += vg - 8 + (b2 & 0x0f);
      } else if ((b1 & TWO_BIT_MASK) === TAG_RUN) {
        run = b1 & 0x3f;
      }

      index[hashColor(px) % TABLE_SIZE] = px;
    }

    pixels.data[pxPos] = px.r;
    pixels.data[pxPos + 1] = px.g;
    pixels.data[pxPos + 2] = px.b;
    pixels.data[pxPos + 3] = px.a;
  }

  return pixels;
}

function getDefaultPixel() {
  return new Pixel(0, 0, 0);
}

const imageData = new ImageData(50, 50);
imageData.data.set([255,65,43,24,245,24,235,4], 0);
const compressed = (new QoiCompressor()).compress(imageData);
console.log(decompress(compressed, 50, 50));

function hashColor(color) {
  return color.r * 3 + color.g * 5 + color.b * 7 + color.a * 11;
}
