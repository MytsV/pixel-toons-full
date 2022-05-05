/*
Useful mixin functions for working with ImageData class. Created to avoid complications in working with pixel color array
 */

import { Color } from './color.js';

//The number is four, because we use RGBA as our main format
const colorParameterCount = 4;

//Set color to a pixel with set coordinates
function setPixelColor(coords, { r, g, b, alpha }) {
  const position = this.getPixelPosition(coords);

  const colorArray = [r, g, b, alpha];
  for (let i = 0; i < colorArray.length; i++) {
    this.data[position + i] = colorArray[i];
  }
}

//Get color of a pixel with set coordinates
function getPixelColor(coords) {
  const position = this.getPixelPosition(coords);

  const colorArray = [];
  for (let i = 0; i < colorParameterCount; i++) {
    colorArray[i] = this.data[position + i];
  }
  return new Color(...colorArray);
}

//Get array index of a pixel with set coordinates
function getPixelPosition(coords) {
  return coords.x * this.width * colorParameterCount + coords.y * colorParameterCount;
}

const mixin = {
  setPixelColor,
  getPixelPosition,
  getPixelColor
};

const applyImageMixin = (imageData) => {
  Object.assign(imageData, mixin);
};

export { applyImageMixin };
