const CHANNEL_COUNT = 4;

const QOI_OP_INDEX = 0x00; /* 00xxxxxx */
const QOI_OP_DIFF = 0x40; /* 01xxxxxx */
const QOI_OP_LUMA = 0x80; /* 10xxxxxx */
const QOI_OP_RUN = 0xc0; /* 11xxxxxx */
const QOI_OP_RGB = 0xfe; /* 11111110 */
const QOI_OP_RGBA = 0xff; /* 11111111 */
const QOI_MASK_2 = 0xc0;

const qoiPadding = [0,0,0,0,0,0,0,1];

function compress(imageData) {
  const length = imageData.width * imageData.height * CHANNEL_COUNT;
  let pxPrevious = {
    r: 0,
    g: 0,
    b: 0,
    a: 255
  };
  const px = Object.assign({}, pxPrevious);
  const pxEnd = length - CHANNEL_COUNT;
  const bytes = [];
  let run = 0;
  const index = new Uint8Array(64);

  for (let pxPos = 0; pxPos < length; pxPos += CHANNEL_COUNT) {
    px.r = imageData.data[pxPos];
    px.g = imageData.data[pxPos + 1];
    px.b = imageData.data[pxPos + 2];
    px.a = imageData.data[pxPos + 3];

    if (colorsEqual(px, pxPrevious)) {
      run++;
      if (run === 62 || pxPos === pxEnd) {
        bytes.push(QOI_OP_RUN | (run - 1));
        run = 0;
      }
    } else {
      const indexPos = hashColor(px) % 64;

      if (run > 0) {
        bytes.push(QOI_OP_RUN | (run - 1));
        run = 0;
      }

      if (colorsEqual(index[indexPos], px)) {
        bytes.push(QOI_OP_INDEX | indexPos);
      } else {
        index[indexPos] = px;

        if (px.a === pxPrevious.a) {
          const vr = px.r - pxPrevious.r;
          const vg = px.g - pxPrevious.g;
          const vb = px.b - pxPrevious.b;

          const vgR = vr - vg;
          const vgB = vb - vg;

          if (
            vr > -3 && vr < 2 &&
            vg > -3 && vg < 2 &&
            vb > -3 && vb < 2
          ) {
            bytes.push(QOI_OP_DIFF | (vr + 2) << 4 | (vg + 2) << 2 | (vb + 2));
          } else if (
            vgR >  -9 && vgR <  8 &&
            vg   > -33 && vg   < 32 &&
            vgB >  -9 && vgB <  8
          ) {
            bytes.push(QOI_OP_LUMA     | (vg   + 32));
            bytes.push((vgR + 8) << 4 | (vgB +  8));
          } else {
            bytes.push(QOI_OP_RGB);
            bytes.push(px.r);
            bytes.push(px.g);
            bytes.push(px.b);
          }
        } else {
          bytes.push(QOI_OP_RGBA);
          bytes.push(px.r);
          bytes.push(px.g);
          bytes.push(px.b);
          bytes.push(px.a);
        }
      }
    }
    pxPrevious = Object.assign({}, px);
  }

  bytes.push(...qoiPadding);

  return bytes;
}

function decompress(bytes, width, height) {
  const pixels = new ImageData(width, height);
  const index = new Uint8Array(64);
  const pxLen = width * height * CHANNEL_COUNT;

  let px = {
    r: 0,
    g: 0,
    b: 0,
    a: 255
  };

  const chunksLen = bytes.length - qoiPadding.length;
  let run = 0;
  let p = 0;

  for (let pxPos = 0; pxPos < pxLen; pxPos += CHANNEL_COUNT) {
    if (run > 0) {
      run--;
    } else if (p < chunksLen) {
      const b1 = bytes[p++];

      if (b1 === QOI_OP_RGB) {
        px.r = bytes[p++];
        px.g = bytes[p++];
        px.b = bytes[p++];
      } else if (b1 === QOI_OP_RGBA) {
        px.r = bytes[p++];
        px.g = bytes[p++];
        px.b = bytes[p++];
        px.a = bytes[p++];
      } else if ((b1 & QOI_MASK_2) === QOI_OP_INDEX) {
        px = index[b1];
      } else if ((b1 & QOI_MASK_2) === QOI_OP_DIFF) {
        px.r += ((b1 >> 4) & 0x03) - 2;
        px.rg += ((b1 >> 2) & 0x03) - 2;
        px.b += (b1 & 0x03) - 2;
      } else if ((b1 & QOI_MASK_2) === QOI_OP_LUMA) {
        const b2 = bytes[p++];
        const vg = (b1 & 0x3f) - 32;
        px.r += vg - 8 + ((b2 >> 4) & 0x0f);
        px.g += vg;
        px.b += vg - 8 +  (b2       & 0x0f);
      } else if ((b1 & QOI_MASK_2) === QOI_OP_RUN) {
        run = b1 & 0x3f;
      }

      index[hashColor(px) % 64] = px;
    }

    pixels.data[pxPos] = px.r;
    pixels.data[pxPos + 1] = px.g;
    pixels.data[pxPos + 2] = px.b;
    pixels.data[pxPos + 3] = px.a;
  }

  return pixels;
}

function colorsEqual(a, b) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function hashColor(color) {
  return color.r * 3 + color.g * 5 + color.b * 7 + color.a * 11;
}
