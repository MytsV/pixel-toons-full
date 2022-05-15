import { applyImageMixin } from '../utilities/image.js';
import { Color } from '../utilities/color.js';

const DEFAULT_PENCIL_COLOR = '#000000';
const IMAGE_POS = 0;

/*
A class which stores canvas parameters that are changed outside of drawing.
It uses Memento pattern to implement Undo/Redo actions.
 */
class CanvasState {
  static stackLimit = 50; //Setting limit for the number of states saved at the moment

  constructor() {
    this.color = Color.fromHex(DEFAULT_PENCIL_COLOR);
    /*
    Memento pattern is implemented with two stacks.
    shownLayers contains current state on top and past states underneath, so the ones that have been "shown".
    nextLayers contains all the states that haven't been "shown".
    Being "shown" means to historically precede or equal the current state.

    The class is about to be optimized with usage of more variables.
     */
    this.shownLayers = [];
    this.nextLayers = [];
    this.currentLayer = null;
  }
}

/*
Each layer is assigned its own id.
Ids are implemented with simple number indices being updated through closure usage.
 */
const layerIdGetter = () => {
  let index = 0;
  return {
    get: () => index++
  };
};

const idGetter = layerIdGetter();

/*
A set of virtual canvas and its visibility, marked with a unique identifier.
 */
class Layer {
  constructor(id, width, height) {
    /*
    Virtual canvas is a canvas which is not appended to DOM.
    Instead, it is drawn over the main canvas element.
    This is done for optimization and increases performance over any other method (checked now).
     */
    this.virtualCanvas = createCanvasElement(width, height);
    //We save context to avoid retrieving it multiple times
    this.context = this.virtualCanvas.getContext('2d');
    this.id = id;
    //A variable to determine whether the virtual canvas is drawn over the main canvas
    this.visible = true;
  }

  //Prototype pattern implementation
  clone() {
    const width = this.virtualCanvas.width;
    const height = this.virtualCanvas.height;

    const cloned = new Layer(this.id, width, height);
    const imageData = this.#getImageData(width, height);
    //We clone the ImageData object to avoid changing pixel data by reference
    cloned.context.putImageData(imageData.clone(), IMAGE_POS, IMAGE_POS);
    return cloned;
  }

  #getImageData(width, height) {
    const imageData = this.context.getImageData(IMAGE_POS, IMAGE_POS, width, height);
    applyImageMixin(imageData); //We apply mixin to be able to use clone() function
    return imageData;
  }
}

class LayerCache {
  #lastCurrent;
  #lastCurrentIndex;

  constructor(width, height) {
    this.#lastCurrent = null;
    this.#lastCurrentIndex = null;
    this.width = width;
    this.height = height;

    this.#resetCache();
  }

  updateCache(layers, current) {
    const currentIndex = layers.findIndex((layer) => layer === current);

    this.#lastCurrent = current;
    this.#lastCurrentIndex = currentIndex;

    if (this.#lastCurrent.id !== current.id || this.#lastCurrentIndex !== currentIndex) return;
    this.#resetCache();
    layers.forEach((layer, index) => {
      if (!layer.visible || index === currentIndex) return;
      const appendedCache = index < currentIndex ? this.beforeCache : this.afterCache;
      appendedCache.context.drawImage(layer.virtualCanvas, IMAGE_POS, IMAGE_POS);
    });
  }

  #resetCache() {
    this.beforeCache = new Layer(-1, this.width, this.height);
    this.afterCache = new Layer(-1, this.width, this.height);
  }

  drawFromCache(context) {
    context.drawImage(this.beforeCache.virtualCanvas, IMAGE_POS, IMAGE_POS);
    if (this.#lastCurrent.visible) {
      context.drawImage(this.#lastCurrent.virtualCanvas, IMAGE_POS, IMAGE_POS);
    }
    context.drawImage(this.afterCache.virtualCanvas, IMAGE_POS, IMAGE_POS);
  }
}

/*
A class which wraps HTML <canvas> element and adds functionality to it.
Implements undo/redo actions, layering and listening to changes.
 */
class Canvas {
  #layers; //An ordered array of virtual canvases
  #listeners; //A variable needed to implement simple EventEmitter

  constructor(width, height) {
    const canvasElement = createCanvasElement(width, height);

    //The element is the only HTMLCanvasElement that is appended to the DOM. We save its context for reuse
    this.mainElement = canvasElement;
    this.mainContext = canvasElement.getContext('2d');
    //Context associated with the current drawing layer
    this.context = null;
    //Image associated with the current drawing layer
    this.image = null;

    this.state = new CanvasState();
    this.#layers = [];
    this.#listeners = [];

    this.cache = new LayerCache(width, height);

    //Create the first empty layer
    this.appendLayer();
  }

  //Redrawing the canvas with virtual canvases
  update() {
    this.context.putImageData(this.image, IMAGE_POS, IMAGE_POS); //Apply changes to current layer
    const emptyImage = new ImageData(this.mainElement.width, this.mainElement.height);
    this.mainContext.putImageData(emptyImage, IMAGE_POS, IMAGE_POS);

    //Iterate through virtual canvases and draw them over the main canvas
    this.#mergeLayers();
  }

  //Gets combined ImageData from all layers
  getCombinedImage() {
    return this.mainContext.getImageData(IMAGE_POS, IMAGE_POS, this.mainElement.width, this.mainElement.height);
  }

  //Duration of update decreased by 20%
  #mergeLayers() {
    this.cache.updateCache(this.#layers, this.state.currentLayer);
    this.cache.drawFromCache(this.mainContext);
  }

  //The implementation of EventEmitter pattern. Allows other entities to know when the canvas is getting a fixated state
  listenToUpdates(listener) {
    this.#listeners.push(listener);
  }

  #fixateChanges() {
    this.#listeners.forEach((listener) => listener());
  }

  //Creates a new layer and stacks in on top of other layers
  appendLayer() {
    const layer = new Layer(idGetter.get(), this.mainElement.width, this.mainElement.height);
    this.#setDrawingLayer(layer);
    this.#layers.push(layer);

    this.save();
  }

  removeLayer(id) {
    if (this.#layers.length <= 1) return;

    this.#layers = this.#layers.filter((layer) => layer.id !== id);
    const topLayer = this.#layers[this.#layers.length - 1];
    this.#setDrawingLayer(topLayer);

    this.update(); //We should redraw the image without the removed layer
    this.save();
  }

  switchLayer(id) {
    const layer = this.#layers.find((layer) => layer.id === id);
    if (!layer) return;
    this.#setDrawingLayer(layer);
    this.#fixateChanges();
  }

  moveLayerUp(id) {
    const layerPosition = this.#layers.findIndex((layer) => layer.id === id);
    //There exists such layer and it is not the top one
    if (layerPosition < 0 || layerPosition === this.#layers.length) return;
    this.#reorderLayer(this.#layers[layerPosition], layerPosition + 1);
  }

  moveLayerDown(id) {
    const layerPosition = this.#layers.findIndex((layer) => layer.id === id);
    //There exists such layer and it is not the bottom one
    if (layerPosition < 1) return;
    this.#reorderLayer(this.#layers[layerPosition], layerPosition - 1);
  }

  #reorderLayer(layer, position) {
    this.#layers = this.#layers.filter((element) => element !== layer);
    if (position >= this.#layers.length) {
      this.#layers.push(layer);
    } else {
      this.#layers.splice(position, 0, layer);
    }

    this.update();
    this.save();
  }

  #setDrawingLayer(layer) {
    this.context = layer.virtualCanvas.getContext('2d');
    this.#refreshImageData();
    this.drawingLayer = layer;
  }

  //Get ImageData from current layer
  #refreshImageData() {
    this.image = this.context.getImageData(IMAGE_POS, IMAGE_POS, this.mainElement.width, this.mainElement.height);
    applyImageMixin(this.image);
  }

  #cloneLayers() {
    return this.#layers.map((layer) => layer.clone());
  }

  /*
  We make the variable private and create a getter to ensure encapsulation.
  Layers variable should never get assigned outside the class.
   */
  get layers() {
    return this.#layers;
  }

  //Saves the current layers of the canvas to be able to retrieve them later
  save() {
    const currentState = this.state.currentLayer;
    if (currentState !== null) {
      pushLayers(this.state.shownLayers, currentState);
      this.state.nextLayers = [];
    }

    this.state.currentLayer = this.#cloneLayers();
    this.#fixateChanges();
  }

  //Reverts the state to the previous layers
  undo() {
    this.#retrieveImage(this.state.shownLayers, this.state.nextLayers);
  }

  //Reverts the state to the next layers
  redo() {
    this.#retrieveImage(this.state.nextLayers, this.state.shownLayers);
  }

  #retrieveImage(stackRetrieved, stackSaved) {
    if (stackRetrieved.length < 1) return; //If the stack is empty, we don't do anything

    pushLayers(stackSaved, this.#layers.map((layer) => layer.clone())); //Current image is appended to one of the stacks

    this.#layers = stackRetrieved.pop();
    const lastLayer = this.#layers[this.#layers.length - 1];
    this.state.currentLayer = this.#cloneLayers();
    this.#setDrawingLayer(lastLayer);

    this.update();
    this.#fixateChanges();
  }
}

function createCanvasElement(width, height) {
  const canvasElement = document.createElement('canvas');
  canvasElement.width = width;
  canvasElement.height = height;
  return canvasElement;
}

function pushLayers(stack, layers) {
  stack.push(layers);
  if (stack.length >= CanvasState.stackLimit) {
    stack.shift();
  }
}

export { Canvas };
