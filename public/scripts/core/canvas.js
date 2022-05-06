import { applyImageMixin } from '../utilities/image.js';
import { Color } from '../utilities/color.js';

const black = '#000000';

class CanvasState {
  constructor() {
    this.color = Color.fromHex(black);
  }
}

const imagePos = 0;

class Canvas {
  #element;
  #context;
  #image;
  #state;

  constructor(width, height) {
    const canvasElement = createCanvasElement(width, height);

    this.#element = canvasElement;
    this.#context = canvasElement.getContext('2d');
    this.#state = new CanvasState();
    this.refreshImageData();
    createBasicBackground(this.#image);
    this.update();
  }

  //GET ImageData
  refreshImageData() {
    this.#image = this.#context.getImageData(imagePos, imagePos, this.#element.width, this.#element.height);
    applyImageMixin(this.#image);
  }

  //PUT ImageData
  update() {
    this.#context.putImageData(this.#image, imagePos, imagePos);
  }

  get context() {
    return this.#context;
  }

  get element() {
    return this.#element;
  }

  get image() {
    return this.#image;
  }

  get state() {
    return this.#state;
  }
}

function createCanvasElement(width, height) {
  const canvasElement = document.createElement('canvas');
  canvasElement.width = width;
  canvasElement.height = height;
  return canvasElement;
}

//Colors for creating a basic grey-white background
const transparentColorFirst = '#ffffff';
const transparentColorSecond = '#e3e3e3';

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
    return transparentColorFirst; //First pixel is always white
  } else {
    return transparentColorSecond;
  }
}

export { Canvas };
