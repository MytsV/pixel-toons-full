import { expect } from 'chai';
import { describe, it } from 'mocha';
import {
  BmpEncoder,
  BmpVersions
} from '../public/scripts/utilities/bmp_encoder.js';
import { readFile } from 'fs/promises';

describe('BmpEncode class', () => {
  it('Can encode fully black image', () => testBlack());
});

async function testBlack() {
  const imageSize = 10;
  const parameterCount = 4;

  const imageData = {
    width: imageSize,
    height: imageSize,
    data:  new Uint8Array(imageSize * imageSize * parameterCount)
  };

  const start = parameterCount - 1;
  for (let i = start; i < imageData.data.length; i += parameterCount) {
    imageData.data[i] = 255;
  }
  const encoder = new BmpEncoder(BmpVersions.BMP_32);
  const data = encoder.encode(imageData);

  const result = await readFile('./test/images/black.bmp');
  expect(data).to.deep.equal(new Uint8Array(result));
}
