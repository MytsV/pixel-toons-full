import { expect } from 'chai';
import { describe, it } from 'mocha';
import { applyImageMixin } from '../public/scripts/utilities/image.js';

const parameterCount = 4;

//stub class with interface identical to real ImageData
class ImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * parameterCount);
  }
}

describe('ImageData mixins', () => {
  it('Get the right pixel color', () => {
    const imageSize = 50;
    const image = new ImageData(imageSize, imageSize);
    const firstColorTest = {
      r: image.data[0],
      g: image.data[1],
      b: image.data[2],
      alpha: image.data[3]
    };
    applyImageMixin(image);
    const firstColor = image.getPixelColor(0, 0);
    expect(firstColor).to.deep.equal(firstColorTest);
  });
});
