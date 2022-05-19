import { applyImageMixin } from '../utilities/image.js';
import { Color } from '../utilities/color.js';

const DEFAULT_PENCIL_COLOR = '#000000';
//Array of x and y coordinates of image start
const START_POS = [0, 0];
//The minimum number of layers for which we perform caching
const CACHE_MIN_LAYER_COUNT = 4;

/*
A class which stores canvas parameters that are changed outside of drawing.
It uses Memento pattern to implement Undo/Redo actions.
 */
class CanvasState {
  //Setting limit for the number of states which can be saved at the same time
  static stackLimit = 50;

  constructor(canvas) {
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

    //We keep the reference to the canvas which created "us"
    this.canvas = canvas;
  }

  save() {
    if (this.currentLayers !== null) {
      CanvasState.#pushLayers(this.pastLayers, this.currentLayers);
      this.nextLayers = [];
    }
    this.currentLayers = this.#cloneLayers();
  }

  retrieveState(stackRetrieved) {
    const retrievingPast = stackRetrieved === this.pastLayers;
    const stackSaved = retrievingPast ? this.nextLayers : this.pastLayers;
    if (stackRetrieved.length < 1) throw Error('There is nothing to retrieve');

    //Updating the other stack
    CanvasState.#pushLayers(stackSaved, this.#cloneLayers());
    return stackRetrieved.pop();
  }

  retrieveDrawnLayer() {
    const layers = this.canvas.layers;

    const lastLayer = layers[layers.length - 1];
    this.currentLayers = this.#cloneLayers();
    return lastLayer;
  }

  //Receive an array of new Layer instances
  #cloneLayers() {
    return this.canvas.layers.map((layer) => layer.clone());
  }

  static #pushLayers(stack, layers) {
    stack.push(layers);
    if (stack.length >= CanvasState.stackLimit) {
      stack.shift();
    }
  }
}

/*
Each layer is assigned its own id.
Ids are implemented with number indices being updated through closure usage.
 */
const layerIdGetter = () => {
  let index = 0;
  return {
    get: () => index++,
    refresh: () => {
      index = 0;
    }
  };
};

/*
A set of virtual canvas and its visibility, marked with a unique identifier.
 */
class Layer {
  constructor(id, width, height) {
    Object.assign(this, { width, height });
    /*
    Virtual canvas is a canvas which is not appended to DOM.
    Instead, it is drawn over the main canvas element.
    This is done for optimization and increases performance over other methods.
     */
    this.virtualCanvas = createCanvasElement(width, height);
    //We save context to avoid retrieving it multiple times
    this.context = this.virtualCanvas.getContext('2d');
    this.id = id;
    //Determines whether the layer will be drawn
    this.visible = true;
  }

  //Prototype pattern implementation
  clone() {
    const cloned = new Layer(this.id, this.width, this.height);
    const imageData = this.#getImageData(this.width, this.height);
    //We clone the ImageData object to avoid changing pixel data by reference
    cloned.context.putImageData(imageData.clone(), ...START_POS);
    return cloned;
  }

  #getImageData(width, height) {
    const imageData = this.context.getImageData(...START_POS, width, height);
    //We apply mixin to be able to use clone() function
    applyImageMixin(imageData);
    return imageData;
  }
}

/*
A class implemented for faster update of canvas with many layers.
The usage of caching decreases update time by circa 20%.
 */
class LayerCache {
  #lastChanged;
  #lastChangedIndex;

  constructor(width, height) {
    Object.assign(this, { width, height });
    this.#resetCache();
  }

  updateCache(layers, current) {
    const currentIndex = layers.findIndex((layer) => layer === current);
    this.#lastChanged = current;
    this.#lastChangedIndex = currentIndex;

    if (!this.#currentStable(current, currentIndex)) return;
    this.#resetCache();
    for (const [index, layer] of layers.entries()) {
      if (!layer.visible || index === currentIndex) continue;
      const isLayerBefore = index < currentIndex;
      const appendedCache = isLayerBefore ? this.beforeCache : this.afterCache;
      appendedCache.context.drawImage(layer.virtualCanvas, ...START_POS);
    }
  }

  #currentStable(current, currentIndex) {
    const idStable = this.#lastChanged.id === current.id;
    const positionStable = this.#lastChangedIndex === currentIndex;
    return idStable && positionStable;
  }

  #resetCache() {
    //IDs are set to -1 as these layers are "off-screen"
    this.beforeCache = new Layer(-1, this.width, this.height);
    this.afterCache = new Layer(-1, this.width, this.height);
  }

  drawFromCache(context) {
    context.drawImage(this.beforeCache.virtualCanvas, ...START_POS);
    //Handle only the visibility of middle layer
    if (this.#lastChanged.visible) {
      context.drawImage(this.#lastChanged.virtualCanvas, ...START_POS);
    }
    context.drawImage(this.afterCache.virtualCanvas, ...START_POS);
  }
}

/*
A class which wraps HTML <canvas> element and adds functionality to it.
Implements undo/redo actions, layering and listening to changes.
 */
class Canvas {
  #layers; //An ordered array of virtual canvases
  #listeners; //A variable needed to implement simple EventEmitter

  drawnLayerId; //The ID of the currently drawn on layer
  image; //Image associated with the currently drawn on layer

  constructor(width, height) {
    //Saving width and height for later reuse
    Object.assign(this, { width, height });

    //The element is the only HTMLCanvasElement that is appended to the DOM
    this.element = createCanvasElement(width, height);
    //We save its context for later reuse
    this.context = this.element.getContext('2d');

    this.state = new CanvasState(this);
    this.#layers = [];
    this.#listeners = [];
    this.idGetter = layerIdGetter();

    this.cache = new LayerCache(width, height);
    //Create the first empty layer
    this.appendLayer();
  }

  //Refresh the visual representation of the canvas with layers
  redraw() {
    //Apply changes to current layer
    this.#getDrawnLayer().context.putImageData(this.image, ...START_POS);

    //Reset the image on real canvas to fully transparent
    const transparentImage = new ImageData(this.width, this.height);
    this.context.putImageData(transparentImage, ...START_POS);

    this.#joinLayers();
  }

  //Iterate through virtual canvases and draw them over the main canvas
  #joinLayers() {
    if (this.#layers.length >= CACHE_MIN_LAYER_COUNT) {
      this.cache.updateCache(this.#layers, this.#getDrawnLayer());
      this.cache.drawFromCache(this.context);
    } else {
      this.#layers.forEach((layer) => {
        if (!layer.visible) return;
        this.context.drawImage(layer.virtualCanvas, ...START_POS);
      });
    }
  }

  #getDrawnLayer() {
    return this.#layers.find((layer) => layer.id === this.drawnLayerId);
  }

  getJoinedImage() {
    return this.context.getImageData(...START_POS, this.width, this.height);
  }

  //Creates a new layer and stacks in on top of other layers
  appendLayer() {
    const layer = new Layer(this.idGetter.get(), this.width, this.height);
    this.#setDrawnLayer(layer);
    this.#layers.push(layer);

    this.save();
  }

  removeLayer(id) {
    if (this.#layers.length <= 1) throw Error('Cannot remove the only layer');

    this.#layers = this.#layers.filter((layer) => layer.id !== id);
    const topLayer = this.#layers[this.#layers.length - 1];
    this.#setDrawnLayer(topLayer);

    this.redraw();
    this.save();
  }

  switchLayer(id) {
    const layer = this.#layers.find((layer) => layer.id === id);
    if (!layer) throw Error(`There is no layer with id ${id}`);
    this.#setDrawnLayer(layer);
    this.#fixateChanges();
  }

  moveLayerUp(id) {
    const layerPosition = this.#layers.findIndex((layer) => layer.id === id);
    //There exists such layer and it is not the top one
    if (layerPosition < 0 || layerPosition === this.#layers.length) {
      throw Error('Cannot move layer up');
    }
    this.#reorderLayer(this.#layers[layerPosition], layerPosition + 1);
  }

  moveLayerDown(id) {
    const layerPosition = this.#layers.findIndex((layer) => layer.id === id);
    //There exists such layer and it is not the bottom one
    if (layerPosition < 1) {
      throw Error('Cannot move layer down');
    }
    this.#reorderLayer(this.#layers[layerPosition], layerPosition - 1);
  }

  #reorderLayer(layer, position) {
    this.#layers = this.#layers.filter((element) => element !== layer);
    if (position >= this.#layers.length) {
      this.#layers.push(layer);
    } else {
      //We insert the layer at certain index, deleting 0 items
      this.#layers.splice(position, 0, layer);
    }

    this.redraw();
    this.save();
  }

  mergeLayers(idA, idB) {
    const posA = this.#layers.findIndex((layer) => layer.id === idA);
    const posB = this.#layers.findIndex((layer) => layer.id === idB);
    const aPrecedes = posA < posB;
    const [updatedPos, deletedPos] = aPrecedes ? [posA, posB] : [posB, posA];
    const updatedLayer = this.#layers[updatedPos];
    const deletedLayer = this.#layers[deletedPos];

    updatedLayer.context.drawImage(deletedLayer.virtualCanvas, ...START_POS);
    this.#setDrawnLayer(updatedLayer);
    this.#layers.splice(deletedPos, 1); //Remove one element at certain index

    this.redraw();
    this.save();
  }

  //Saves the current layers on the canvas for retrieving them later
  save() {
    this.state.save(this.#layers);
    this.#fixateChanges();
  }

  //Reverts the layers to the previously saved ones
  undo() {
    this.#retrieveImage(this.state.pastLayers);
  }

  //Reverts the layers to the set of historically following ones
  redo() {
    this.#retrieveImage(this.state.nextLayers);
  }

  //Generalized method for working with undo/redo
  #retrieveImage(stackRetrieved) {
    this.#layers = this.state.retrieveState(stackRetrieved);
    const drawnLayer = this.state.retrieveDrawnLayer();

    this.#setDrawnLayer(drawnLayer);
    this.redraw();
    this.#fixateChanges();
  }

  //Update instance variables with current layer data
  #setDrawnLayer(layer) {
    this.drawnLayerId = layer.id;
    const { width, height } = this;
    this.image = layer.context.getImageData(...START_POS, width, height);
    applyImageMixin(this.image);
  }

  /*
  The implementation of EventEmitter pattern.
  Allows other entities to know when the canvas is getting a fixated state
   */
  listenToUpdates(listener) {
    this.#listeners.push(listener);
  }

  #fixateChanges() {
    this.#listeners.forEach((listener) => listener());
  }

  /*
  We make the variable private and create a getter to ensure encapsulation.
  Layers variable should never get assigned outside the class.
   */
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

class AnimationFile {
  constructor(width, height) {
    this.canvas = new Canvas(width, height);
    this.width = width;
    this.height = height;
  }
}

export { Canvas, AnimationFile };
