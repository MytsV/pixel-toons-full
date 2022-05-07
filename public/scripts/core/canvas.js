import { applyImageMixin } from '../utilities/image.js';
import { Color } from '../utilities/color.js';

const BASE_COLOR = '#000000';
const IMAGE_POS = 0;

/*
A class with some canvas-specific variables
 */
class CanvasState {
  constructor() {
    this.color = Color.fromHex(BASE_COLOR);
  }
}

/*
A class which wraps HTML <canvas> element
 */
class Canvas {
  constructor(width, height) {
    const canvasElement = createCanvasElement(width, height);

    this.element = canvasElement;
    this.context = canvasElement.getContext('2d');
    this.state = new CanvasState();
    this.refreshImageData();
    createBasicBackground(this.image);
    this.update();
  }

  //Get ImageData
  refreshImageData() {
    this.image = this.context.getImageData(IMAGE_POS, IMAGE_POS, this.element.width, this.element.height);
    applyImageMixin(this.image);
  }

  //Put ImageData
  update() {
    this.context.putImageData(this.image, IMAGE_POS, IMAGE_POS);
  }
}

function createCanvasElement(width, height) {
  const canvasElement = document.createElement('canvas');
  canvasElement.width = width;
  canvasElement.height = height;
  return canvasElement;
}

//Colors for creating a basic grey-white background
const BACKGROUND_COLOR_WHITE = '#ffffff';
const BACKGROUND_COLOR_GREY = '#e3e3e3';

//Function to turn image into a basic grey-white background which indicates transparency
function createBasicBackground(image) {
  for (let i = 0; i < image.height; i++) {
    for (let j = 0; j < image.width; j++) {
      const pixelColor = getClearPixelColor(i, j);
      image.setPixelColor(i, j, Color.fromHex(pixelColor));
    }
  }
}

//Get color of transparent pixel based on its coordinates
function getClearPixelColor(i, j) {
  if (i % 2 !== j % 2) { //The condition makes sure that neighbouring pixels are always of different color
    return BACKGROUND_COLOR_WHITE; //First pixel is always white
  } else {
    return BACKGROUND_COLOR_GREY;
  }
}

export { Canvas };
