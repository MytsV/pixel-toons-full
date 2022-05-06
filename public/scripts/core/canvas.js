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
    this.updateImageData();
  }

  updateImageData() {
    this.#image = this.#context.getImageData(imagePos, imagePos, this.#element.width, this.#element.height);
    applyImageMixin(this.#image);
  }

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

export { Canvas };
