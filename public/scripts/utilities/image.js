/*
Useful mixin functions for working with ImageData class
Created to avoid complications in working with pixel color array
 */

import { Color } from './color.js';

const mixin = {
  setPixelColor,
  getPixelPosition,
  getPixelColor,
  clone,
  append
};

const applyImageMixin = (imageData) => {
  Object.assign(imageData, mixin);
};

//The number is four, because we use RGBA as our main format
const COLOR_PARAMETERS = 4;

/**
 * Set the color of a pixel at the specified coordinates.
 *
 * @param {number} i - The x-coordinate of the pixel.
 * @param {number} j - The y-coordinate of the pixel.
 * @param {Object} color - The color object containing the RGBA values.
 * @param {number} color.r - The red component of the color (0-255).
 * @param {number} color.g - The green component of the color (0-255).
 * @param {number} color.b - The blue component of the color (0-255).
 * @param {number} color.alpha - The alpha component of the color (0-255).
 * @this {Object} The object containing image data and related methods.
 */
function setPixelColor(i, j, { r, g, b, alpha }) {
  const position = this.getPixelPosition(i, j);

  const colorArray = [r, g, b, alpha];
  for (let i = 0; i < colorArray.length; i++) {
    this.data[position + i] = colorArray[i];
  }
}

/**
 * Get the color of a pixel at the specified coordinates.
 *
 * @param {number} i - The x-coordinate of the pixel.
 * @param {number} j - The y-coordinate of the pixel.
 * @return {Color} The color object representing the RGBA values of the pixel.
 * @this {Object} The object containing image data and related methods.
 */
function getPixelColor(i, j) {
  const position = this.getPixelPosition(i, j);

  const colorArray = [];
  for (let i = 0; i < COLOR_PARAMETERS; i++) {
    colorArray[i] = this.data[position + i];
  }
  return new Color(...colorArray);
}

/**
 * Get the position within the data array
 * for the pixel at the specified coordinates.
 *
 * @param {number} i - The x-coordinate of the pixel.
 * @param {number} j - The y-coordinate of the pixel.
 * @return {number} The position in the data array corresponding to the pixel.
 * @this {Object} The object containing image data and related methods,
 * including the width of the image.
 */
function getPixelPosition(i, j) {
  return (j * this.width + i) * COLOR_PARAMETERS;
}

/**
 * Create a deep copy of the image data.
 *
 * @return {ImageData} A deep copy of the image data.
 * @this {ImageData} The object containing image data and related methods, including width and height.
 */
function clone() {
  const cloned = new ImageData(this.width, this.height);
  cloned.data.set(this.data);
  applyImageMixin(cloned);
  return cloned;
}

/**
 * Append images to the current image data.
 *
 * @param {...ImageData} images - The images to append.
 * @return {ImageData} The image data with the appended images.
 * @this {ImageData} The object containing image data and related methods.
 */
function append(...images) {
  const appendedData = this.clone();
  for (let i = 0; i < this.width; i++) {
    for (let j = 0; j < this.height; j++) {
      const color = images.reduce((accumulator, curr) => {
        const currColor = curr.getPixelColor(i, j);
        return accumulator.blend(currColor);
      }, appendedData.getPixelColor(i, j));
      appendedData.setPixelColor(i, j, color);
    }
  }
  return appendedData;
}

/*
Image is an instance of ImageData class.
Amount is an integer, which is bigger or equal to 1.
We use simple integer scaling.
 */
function scale(image, degree) {
  if (degree < 1 || (degree | 0) !== degree) {
    throw Error('Illegal degree value');
  }

  const scaled = new ImageData(image.width * degree, image.height * degree);
  let scaledPos = 0;
  for (let i = 0; i < image.height; i++) {
    const row = [];

    for (let j = 0; j < image.width; j++) {
      const dataPos = (i * image.width + j) * COLOR_PARAMETERS;
      const color = image.data.slice(dataPos, dataPos + COLOR_PARAMETERS);
      for (let k = 0; k < degree; k++) {
        row.push(...color);
      }
    }

    for (let k = 0; k < degree; k++) {
      scaled.data.set(row, scaledPos);
      scaledPos += image.width * COLOR_PARAMETERS * degree;
    }
  }
  return scaled;
}

const FlipModes = Object.freeze({
  VERTICAL: 0,
  HORIZONTAL: 1
});

function flip({ width, height, data }, mode = FlipModes.HORIZONTAL) {
  const flipped = new ImageData(width, height);
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const iNew = mode === FlipModes.VERTICAL ? height - i - 1 : i;
      const jNew = mode === FlipModes.HORIZONTAL ? width - j - 1 : j;
      const dataPos = (i * width + j) * COLOR_PARAMETERS;
      const dataPosFlip = (iNew * width + jNew) * COLOR_PARAMETERS;
      const color = data.slice(dataPos, dataPos + COLOR_PARAMETERS);
      flipped.data.set(color, dataPosFlip);
    }
  }
  return flipped;
}

export { applyImageMixin, scale, FlipModes, flip };
