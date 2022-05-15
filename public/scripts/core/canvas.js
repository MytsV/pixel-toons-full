import { applyImageMixin } from '../utilities/image.js';
import { Color } from '../utilities/color.js';

const DEFAULT_PENCIL_COLOR = '#000000';
const IMAGE_POS = 0;

/*
A class which stores canvas parameters that are changed outside of drawing.
It uses Memento pattern to implement Undo/Redo actions.
 */
class CanvasState {
  static stackLimit = 50; //Setting limit for the number of states which can be saved at the same time

  constructor() {
    this.color = Color.fromHex(DEFAULT_PENCIL_COLOR);
    /*
    Memento pattern is implemented with two stacks.
    Canvases state is a set of its layers.
    pastLayers contains all the states that have been "shown".
    nextLayers contains all the states that haven't been "shown".
    Being "shown" means to historically precede or equal the current state.
     */
    this.pastLayers = [];
    this.nextLayers = [];
    this.currentLayers = null;
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

//Duration of update decreased by 20%
class LayerCache {
  #lastChanged;
  #lastChangedIndex;

  constructor(width, height) {
    this.#lastChanged = null;
    this.#lastChangedIndex = null;
    this.width = width;
    this.height = height;

    this.#resetCache();
  }

  updateCache(layers, current) {
    const currentIndex = layers.findIndex((layer) => layer === current);
    this.#lastChanged = current;
    this.#lastChangedIndex = currentIndex;

    if (this.#lastChanged.id !== current.id || this.#lastChangedIndex !== currentIndex) return;
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
    if (this.#lastChanged.visible) {
      context.drawImage(this.#lastChanged.virtualCanvas, IMAGE_POS, IMAGE_POS);
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

  //Refresh the visual representation of the canvas with layers
  redraw() {
    //Apply changes to current layer
    this.context.putImageData(this.image, IMAGE_POS, IMAGE_POS);

    //Reset the image on real canvas to fully transparent
    const transparentImage = new ImageData(this.mainElement.width, this.mainElement.height);
    this.mainContext.putImageData(transparentImage, IMAGE_POS, IMAGE_POS);

    //Iterate through virtual canvases and draw them over the main canvas
    this.#mergeLayers();
  }

  getMergedImage() {
    return this.mainContext.getImageData(IMAGE_POS, IMAGE_POS, this.mainElement.width, this.mainElement.height);
  }

  #mergeLayers() {
    const uncachedLimit = 3; //The maximum number of layers for which we won't perform caching

    if (this.#layers.length > uncachedLimit) {
      this.cache.updateCache(this.#layers, this.drawingLayer);
      this.cache.drawFromCache(this.mainContext);
    } else {
      this.#layers.forEach((layer) => {
        this.mainContext.drawImage(layer.virtualCanvas, IMAGE_POS, IMAGE_POS);
      });
    }
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

    this.redraw();
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
    if (layerPosition < 1) return; //There exists such layer and it is not the bottom one
    this.#reorderLayer(this.#layers[layerPosition], layerPosition - 1);
  }

  #reorderLayer(layer, position) {
    this.#layers = this.#layers.filter((element) => element !== layer);
    if (position >= this.#layers.length) {
      this.#layers.push(layer);
    } else {
      this.#layers.splice(position, 0, layer); //We insert the layer at certain index, deleting 0 items
    }

    this.redraw();
    this.save();
  }

  /*
  We make the variable private and create a getter to ensure encapsulation.
  Layers variable should never get assigned outside the class.
   */
  get layers() {
    return this.#layers;
  }

  //Saves the current layers on the canvas for retrieving them later
  save() {
    const currentLayers = this.state.currentLayers;
    if (currentLayers !== null) {
      pushLayers(this.state.pastLayers, currentLayers);
      this.state.nextLayers = [];
    }

    this.state.currentLayers = this.#cloneLayers();
    this.#fixateChanges();
  }

  //Reverts the layers to the previously saved ones
  undo() {
    this.#retrieveImage(this.state.pastLayers, this.state.nextLayers);
  }

  //Reverts the layers to the set of historically following ones
  redo() {
    this.#retrieveImage(this.state.nextLayers, this.state.pastLayers);
  }

  //Generalized method for working with undo/redo
  #retrieveImage(stackRetrieved, stackSaved) {
    if (stackRetrieved.length < 1) return; //If the stack is empty, we don't do anything

    pushLayers(stackSaved, this.#layers.map((layer) => layer.clone())); //Updating the other stack

    this.#layers = stackRetrieved.pop();
    const lastLayer = this.#layers[this.#layers.length - 1];
    this.state.currentLayers = this.#cloneLayers();
    this.#setDrawingLayer(lastLayer);

    this.redraw();
    this.#fixateChanges();
  }

  //Update instance variables with current layer data
  #setDrawingLayer(layer) {
    this.drawingLayer = layer;

    this.context = layer.virtualCanvas.getContext('2d');
    this.image = this.context.getImageData(IMAGE_POS, IMAGE_POS, this.mainElement.width, this.mainElement.height);
    applyImageMixin(this.image);
  }

  //Receive an array of new Layer instances
  #cloneLayers() {
    return this.#layers.map((layer) => layer.clone());
  }

  //The implementation of EventEmitter pattern. Allows other entities to know when the canvas is getting a fixated state
  listenToUpdates(listener) {
    this.#listeners.push(listener);
  }

  #fixateChanges() {
    this.#listeners.forEach((listener) => listener());
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
