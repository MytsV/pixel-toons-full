import { applyImageMixin } from '../utilities/image.js';
import { Color } from '../utilities/color.js';

const DEFAULT_PENCIL_COLOR = '#000000';
const IMAGE_POS = 0;

/*
A class which stores changeable canvas data.
It uses Memento pattern to implement Undo/Redo actions
 */
class CanvasState {
  constructor() {
    this.color = Color.fromHex(DEFAULT_PENCIL_COLOR);
    //Memento implementation with two stacks
    this.previousImages = [];
    this.nextImages = []; //To refactor and optimize using state class and deleted/added layers?
  }
}

const layerIdGiver = () => {
  let index = 0;
  return () => index++;
};

const idGiver = layerIdGiver();

class Layer {
  constructor(id, width, height) {
    this.virtualCanvas = createCanvasElement(width, height);
    this.id = id;
    this.visible = true;
  }

  //Prototype pattern implementation
  clone() {
    const width = this.virtualCanvas.width;
    const height = this.virtualCanvas.height;

    const cloned = new Layer(this.id, width, height);
    const imageData = this.virtualCanvas.getContext('2d').getImageData(IMAGE_POS, IMAGE_POS, width, height);
    applyImageMixin(imageData);

    cloned.virtualCanvas.getContext('2d').putImageData(imageData.clone(), IMAGE_POS, IMAGE_POS);

    return cloned;
  }
}

/*
A class which wraps HTML <canvas> element
 */
class Canvas {
  #layers; //An array of "virtual" canvases
  #subscribers;

  constructor(width, height) {
    const canvasElement = createCanvasElement(width, height);

    this.element = canvasElement;
    this.mainContext = canvasElement.getContext('2d');

    this.state = new CanvasState();
    this.#layers = [];
    this.#subscribers = [];

    this.appendLayer();
  }

  //Get combined ImageData from all layers
  getCombinedImage() {
    return this.mainContext.getImageData(IMAGE_POS, IMAGE_POS, this.element.width, this.element.height);
  }

  //Put ImageData
  update() {
    this.context.putImageData(this.image, IMAGE_POS, IMAGE_POS);
    const emptyImage = new ImageData(this.element.width, this.element.height);

    this.mainContext.putImageData(emptyImage, IMAGE_POS, IMAGE_POS);

    this.#layers.forEach((layer) => {
      if (!layer.visible) return;
      this.mainContext.drawImage(layer.virtualCanvas, IMAGE_POS, IMAGE_POS);
    });
  }

  fixateChanges() { //Move to save
    this.#subscribers.forEach((listener) => listener());
  }

  appendLayer() {
    this.save();

    const layer = new Layer(idGiver(), this.element.width, this.element.height);
    this.#setDrawingLayer(layer);
    this.#layers.push(layer);

    this.fixateChanges();
  }

  removeLayer(id) {
    if (this.#layers.length <= 1) return;
    this.save();

    this.#layers = this.#layers.filter((layer) => layer.id !== id);
    const topLayer = this.#layers.slice(-1).pop();
    this.#setDrawingLayer(topLayer);
    this.update();

    this.fixateChanges();
  }

  switchLayer(id) {
    const layer = this.#layers.find((layer) => layer.id === id);
    if (!layer) return;
    this.#setDrawingLayer(layer);
    this.fixateChanges();
  }

  moveUp(id) {
    const layerPosition = this.#layers.findIndex((layer) => layer.id === id);
    if (layerPosition < 0 || layerPosition === this.#layers.length) return;
    this.#reorderLayer(this.#layers[layerPosition], layerPosition + 1);
  }

  moveDown(id) {
    const layerPosition = this.#layers.findIndex((layer) => layer.id === id);
    if (layerPosition < 1) return;
    this.#reorderLayer(this.#layers[layerPosition], layerPosition - 1);
  }

  //Saves the current image on the canvas
  save() {
    if (this.#layers.length < 1) return;

    const newLayers = this.#cloneLayers();
    this.state.previousImages.push(newLayers);
    this.state.nextImages = [];
  }

  undo() {
    this.#retrieveImage(this.state.previousImages, this.state.nextImages);
  }

  redo() {
    this.#retrieveImage(this.state.nextImages, this.state.previousImages);
  }

  subscribeToUpdate(listener) {
    this.#subscribers.push(listener);
  }

  #retrieveImage(stackRetrieved, stackSaved) {
    if (stackRetrieved.length < 1) return; //If the stack is empty, we don't do anything

    stackSaved.push(this.#cloneLayers()); //Current image is appended to one of the stacks

    this.#layers = stackRetrieved.pop();
    this.#setDrawingLayer(this.#layers.slice(-1).pop());

    this.update();
    this.fixateChanges();
  }

  #reorderLayer(layer, position) {
    this.save();

    this.#layers = this.#layers.filter((element) => element !== layer); //i don't like it, optimize
    if (position >= this.#layers.length) {
      this.#layers.push(layer);
    } else {
      this.#layers.splice(position, 0, layer);
    }

    this.update();
    this.fixateChanges();
  }

  #setDrawingLayer(layer) {
    this.context = layer.virtualCanvas.getContext('2d');
    this.#refreshImageData();
    this.drawingLayer = layer;
  }

  //Get ImageData from current layer
  #refreshImageData() {
    this.image = this.context.getImageData(IMAGE_POS, IMAGE_POS, this.element.width, this.element.height);
    applyImageMixin(this.image);
  }

  #cloneLayers() {
    return this.#layers.map((layer) => layer.clone());
  }

  get layers() {
    return this.#layers;
  }
}

function createCanvasElement(width, height) {
  const canvasElement = document.createElement('canvas');
  canvasElement.width = width;
  canvasElement.height = height;
  return canvasElement;
}

export { Canvas };
