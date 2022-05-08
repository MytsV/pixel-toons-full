import { applyImageMixin } from '../utilities/image.js';
import { Color } from '../utilities/color.js';

const DEFAULT_PENCIL_COLOR = '#000000';

/*
A class which stores changeable canvas data.
It uses Memento pattern to implement Undo/Redo actions
 */
class CanvasState {
  constructor() {
    this.color = Color.fromHex(DEFAULT_PENCIL_COLOR);
    //Memento implementation with two stacks
    this.previousImages = [];
    this.nextImages = [];
  }
}

const IMAGE_POS = 0;

/*
A class which wraps HTML <canvas> element
 */
class Canvas {
  #layers; //An array of "virtual" canvases

  constructor(width, height) {
    const canvasElement = createCanvasElement(width, height);

    this.element = canvasElement;
    this.context = canvasElement.getContext('2d');
    this.state = new CanvasState();
    this.#layers = [];

    this.#setBackground();
    this.appendLayer();
  }

  #setBackground() {
    this.appendLayer();
    this.refreshImageData();
    toBasicBackground(this.image);
    this.update();
    this.save();
  }

  //Get ImageData
  refreshImageData() {
    this.image = this.context.getImageData(IMAGE_POS, IMAGE_POS, this.element.width, this.element.height);
    applyImageMixin(this.image);
  }

  //Put ImageData
  update() {
    this.context.putImageData(this.image, IMAGE_POS, IMAGE_POS);
    const emptyImage = new ImageData(this.element.width, this.element.height);
    const mainContext = this.element.getContext('2d');

    mainContext.putImageData(emptyImage, IMAGE_POS, IMAGE_POS);

    this.#layers.forEach((layer) => mainContext.drawImage(layer, IMAGE_POS, IMAGE_POS));
  }

  appendLayer() {
    const canvas = createCanvasElement(this.element.width, this.element.height);
    this.context = canvas.getContext('2d');
    this.refreshImageData();
    this.#layers.push(canvas);
  }

  //Saves the current image on the canvas
  save() {
    this.state.previousImages.push(this.image.clone());
    this.state.nextImages = [];
  }

  undo() {
    this.#retrieveImage(this.state.previousImages, this.state.nextImages);
  }

  redo() {
    this.#retrieveImage(this.state.nextImages, this.state.previousImages);
  }

  #retrieveImage(stackRetrieved, stackSaved) {
    if (stackRetrieved.length < 1) return; //If the stack is empty, we don't do anything

    this.refreshImageData();
    stackSaved.push(this.image.clone()); //Current image is appended to one of the stacks

    this.image = stackRetrieved.pop();
    this.update();
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
function toBasicBackground(image) {
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
