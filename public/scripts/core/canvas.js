import { applyImageMixin } from '../utilities/image.js';

class Canvas {
  #element;
  #context;
  #image;

  constructor(width, height) {
    const canvasElement = document.createElement('canvas');
    canvasElement.width = width;
    canvasElement.height = height;

    this.#element = canvasElement;
    this.#context = canvasElement.getContext('2d');
    this.updateImageData();
  }

  updateImageData() {
    this.#image = this.#context.getImageData(0, 0, this.#element.width, this.#element.height);
    applyImageMixin(this.#image);
  }

  update() {
    this.#context.putImageData(this.#image, 0, 0);
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
}

export { Canvas };
