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

const layerIndexer = () => {
  let index = 0;
  return () => index++;
};

const indexer = layerIndexer();

class Layer {
  constructor(index, width, height) {
    this.virtualCanvas = createCanvasElement(width, height);
    this.index = index;
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
    this.appendLayer();
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

    this.#layers.forEach((layer) => mainContext.drawImage(layer.virtualCanvas, IMAGE_POS, IMAGE_POS));
  }

  appendLayer() {
    const layer = new Layer(indexer(), this.element.width, this.element.height);
    this.#setDrawingLayer(layer);
    this.#layers.push(layer);
  }

  removeLayer(index) {
    this.#layers = this.#layers.filter((layer) => layer.index !== index);
    this.#setDrawingLayer(this.#layers[this.#layers.length - 1]);
    this.update();
  }

  switchLayer(index) {
    const layer = this.#layers.find((layer) => layer.index === index);
    this.#setDrawingLayer(layer);
  }

  moveUp(index) {
    const layerIndex = this.#layers.findIndex((layer) => layer.index === index);
    this.#reorderLayer(this.#layers[layerIndex], layerIndex + 1);
  }

  moveDown(index) {
    const layerIndex = this.#layers.findIndex((layer) => layer.index === index);
    this.#reorderLayer(this.#layers[layerIndex], layerIndex - 1);
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

  #reorderLayer(layer, position) {
    this.#layers = this.#layers.filter((element) => element !== layer); //i don't like it, optimize
    if (position >= this.#layers.length) {
      this.#layers.push(layer);
    } else {
      this.#layers.splice(position, 0, layer);
    }
    this.update();
  }

  #setDrawingLayer(layer) {
    this.context = layer.virtualCanvas.getContext('2d');
    this.refreshImageData();
  }
}

function createCanvasElement(width, height) {
  const canvasElement = document.createElement('canvas');
  canvasElement.width = width;
  canvasElement.height = height;
  return canvasElement;
}

export { Canvas };
