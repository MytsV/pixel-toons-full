import { applyImageMixin } from '../utilities/image.js';
import { IdentifiedList } from '../utilities/intentified_list.js';

//Array of x and y coordinates of image start
const START_POS = [0, 0];
//The minimum number of layers for which we perform caching
const CACHE_MIN_LAYER_COUNT = 4;
//Id for a layer or frame which is never rendered
const OFFSCREEN_ID = -1;

/*
A class which stores canvas parameters that are changed outside of drawing.
It uses Memento pattern to implement Undo/Redo actions.
 */
class CanvasState {
  //Setting limit for the number of states which can be saved at the same time
  static stackLimit = 50;

  constructor(canvas) {
    /*
    Memento pattern is implemented with two stacks.
    Canvases state is a set of its layers.
    pastLayers contains all the states that have been "shown".
    nextLayers contains all the states that haven't been "shown".
    Being "shown" means to historically precede the current state.
     */
    this.pastLayers = [];
    this.nextLayers = [];
    this.currentLayers = null;

    //We keep the reference to the canvas which created us
    this.canvas = canvas;
  }

  save() {
    if (this.currentLayers !== null) {
      CanvasState.#pushLayers(this.pastLayers, this.currentLayers);
      this.nextLayers = [];
    }
    this.fixateCurrent();
  }

  retrieveState(stackRetrieved) {
    const retrievingPast = stackRetrieved === this.pastLayers;
    const stackSaved = retrievingPast ? this.nextLayers : this.pastLayers;
    if (stackRetrieved.length < 1) throw Error('There is nothing to retrieve');
    CanvasState.#pushLayers(stackSaved, this.#cloneLayers());
    return stackRetrieved.pop();
  }

  //The best use of the method is when layers are artificially changed
  fixateCurrent() {
    this.currentLayers = this.#cloneLayers();
  }

  //Receive an array of new Layer instances
  #cloneLayers() {
    return deepCloneList(this.canvas.layers);
  }

  //A function that handles adding data to a stack with overflow control
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
function IdGetter() {
  let index = 0;
  return {
    get: () => index++,
    refresh: () => {
      index = 0;
    }
  };
}

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

    //We save the context to avoid retrieving it multiple times
    this.context = this.virtualCanvas.getContext('2d');

    this.id = id;
    this.name = `Layer ${id}`;

    //Determines whether the layer will be drawn over the main canvas
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
    const currentIndex = layers.getIndex(current.id);
    this.#lastChanged = current;
    this.#lastChangedIndex = currentIndex;

    if (!this.#isCurrentStable(current, currentIndex)) return;
    this.#resetCache();
    for (const [index, layer] of layers.entries()) {
      if (!layer.visible || index === currentIndex) continue;
      const beforeCurrent = index < currentIndex;
      const appendedCache = beforeCurrent ? this.beforeCache : this.afterCache;
      appendedCache.context.drawImage(layer.virtualCanvas, ...START_POS);
    }
  }

  //Determines whether the current layer is the only one that must be redrawn
  #isCurrentStable(current, currentIndex) {
    const idStable = this.#lastChanged.id === current.id;
    const positionStable = this.#lastChangedIndex === currentIndex;
    return idStable && positionStable;
  }

  #resetCache() {
    this.beforeCache = new Layer(OFFSCREEN_ID, this.width, this.height);
    this.afterCache = new Layer(OFFSCREEN_ID, this.width, this.height);
  }

  drawFromCache(context) {
    context.drawImage(this.beforeCache.virtualCanvas, ...START_POS);
    //Handling only the visibility of middle layer
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

  drawnId; //The ID of the currently drawn on layer
  image; //Image associated with the currently drawn on layer

  constructor(width, height) {
    //Saving width and height for later reuse
    Object.assign(this, { width, height });

    //The element is the only HTMLCanvasElement that is appended to the DOM
    this.element = createCanvasElement(width, height);
    //We save its context for later reuse
    this.context = this.element.getContext('2d');

    this.state = new CanvasState(this);
    this.#layers = new IdentifiedList();
    this.#listeners = [];
    this.idGetter = new IdGetter();

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
    const position = this.#layers.getIndex(this.drawnId);
    return this.#layers[position];
  }

  getJoinedImage() {
    return this.context.getImageData(...START_POS, this.width, this.height);
  }

  //Creates a new layer and stacks in on top of other layers
  appendLayer(layer) {
    const { width, height } = this;
    const appended = layer ?? new Layer(this.idGetter.get(), width, height);
    this.#setDrawnLayer(appended);
    this.#layers.push(appended);

    if (layer) this.redraw();
    this.save();
  }

  removeLayer(id) {
    if (this.#layers.length <= 1) throw Error('Cannot remove the only layer');

    this.#layers = this.#layers.remove(id);
    const topLayer = this.#layers[this.#layers.length - 1];
    this.#setDrawnLayer(topLayer);

    this.redraw();
    this.save();
  }

  switchLayer(id) {
    const layer = this.#layers.byIdentifier(id);
    if (!layer) throw Error(`There is no layer with id ${id}`);
    this.#setDrawnLayer(layer);
    this.#fixateChanges();
  }

  moveLayerUp(id) {
    const layerPosition = this.#layers.getIndex(id);
    //There exists such layer and it is not the top one
    if (layerPosition < 0 || layerPosition === this.#layers.length) {
      throw Error('Cannot move layer up');
    }
    this.#reorderLayer(this.#layers[layerPosition], layerPosition + 1);
  }

  moveLayerDown(id) {
    const layerPosition = this.#layers.getIndex(id);
    //There exists such layer and it is not the bottom one
    if (layerPosition < 1) {
      throw Error('Cannot move layer down');
    }
    this.#reorderLayer(this.#layers[layerPosition], layerPosition - 1);
  }

  #reorderLayer(layer, position) {
    this.#layers = this.#layers.remove(layer.id);
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
    const posA = this.#layers.getIndex(idA);
    const posB = this.#layers.getIndex(idB);
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

  duplicateLayer(id) {
    const copyVal = ' copy';

    const layer = this.#layers.byIdentifier(id);
    const duplicate = layer.clone();
    duplicate.id = this.idGetter.get();
    duplicate.name = layer.name.replace(copyVal, '') + copyVal;

    this.#setDrawnLayer(duplicate);
    this.#layers.push(duplicate);
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
    const lastLayer = this.#layers[this.#layers.length - 1];
    this.state.fixateCurrent();

    this.#setDrawnLayer(lastLayer);
    this.redraw();
    this.#fixateChanges();
  }

  //Update instance variables with current layer data
  #setDrawnLayer(layer) {
    this.drawnId = layer.id;
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

  clone() {
    const cloned = new Canvas(this.width, this.height);
    const layers = deepCloneList(this.#layers);
    cloned.#layers = new IdentifiedList();
    layers.forEach((layer) => cloned.appendLayer(layer));
    return cloned;
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

class Frame {
  constructor(id, canvas, duration = 100) {
    this.id = id;
    this.canvas = canvas;
    this.duration = duration;
  }

  clone() {
    return new Frame(this.id, this.canvas.clone(), this.duration);
  }
}

class AnimationFile {
  #frames;
  #listeners;

  constructor(width, height) {
    this.idGetter = new IdGetter();
    this.#frames = new IdentifiedList();
    this.#listeners = [];
    Object.assign(this, { width, height });
    this.appendFrame();
  }

  appendFrame() {
    const canvas = new Canvas(this.width, this.height);
    const frame = new Frame(this.idGetter.get(), canvas);
    this.#frames.push(frame);
    this.#setCurrentFrame(frame);
  }

  switchFrame(id) {
    const frame = this.#frames.byIdentifier(id);
    if (!frame) throw Error(`There is no frame with id ${id}`);
    this.#setCurrentFrame(frame);
  }

  removeFrame(id) {
    if (this.#frames.length <= 1) throw Error('Cannot remove the only frame');

    this.#frames = this.#frames.remove(id);
    const topFrame = this.#frames[this.#frames.length - 1];
    this.#setCurrentFrame(topFrame);
    this.#update();
  }

  duplicateFrame(id) {
    const frame = this.#frames.byIdentifier(id);
    const duplicate = frame.clone();
    duplicate.id = this.idGetter.get();

    this.#frames.push(duplicate);
    this.#setCurrentFrame(duplicate);
  }

  moveFrameUp(id) {
    const framePosition = this.#frames.getIndex(id);
    if (framePosition < 0 || framePosition === this.#frames.length) {
      throw Error('Cannot move frame up');
    }
    this.#reorderFrame(this.#frames[framePosition], framePosition + 1);
  }

  moveFrameDown(id) {
    const framePosition = this.#frames.getIndex(id);
    if (framePosition < 1) {
      throw Error('Cannot move frame down');
    }
    this.#reorderFrame(this.#frames[framePosition], framePosition - 1);
  }

  #reorderFrame(frame, position) {
    this.#frames = this.#frames.remove(frame.id);
    if (position >= this.#frames.length) {
      this.#frames.push(frame);
    } else {
      this.#frames.splice(position, 0, frame);
    }
    this.#update();
  }

  #setCurrentFrame(frame) {
    this.currentId = frame.id;
    this.#update();
  }

  listenToUpdates(listener) {
    this.#listeners.push(listener);
  }

  #update() {
    const index = this.#frames.getIndex(this.currentId);
    const overlayFrame = this.#frames[index - 1];
    this.overlayId = overlayFrame ? overlayFrame.id : -1;
    this.#listeners.forEach((listener) => listener());
  }

  get canvas() {
    return this.#frames.byIdentifier(this.currentId).canvas;
  }

  get overlay() {
    const overlay = this.#frames.byIdentifier(this.overlayId);
    return overlay ? overlay.canvas : null;
  }

  get frames() {
    return this.#frames;
  }
}

function deepCloneList(list) {
  const clonedArray = list.map((value) => value.clone());
  return new IdentifiedList(clonedArray);
}

export { Canvas, AnimationFile };
