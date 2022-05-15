import { CanvasRenderer, setupColorPicker } from './core/canvas_renderer.js';
import { Canvas } from './core/canvas.js';
import { bytesToUrl, downloadLocalUrl } from './utilities/bytes_conversion.js';
import { BmpEncoder, bmpVersions } from './utilities/bmp_encoder.js';
import { BucketFill, Eraser, Pencil } from './core/tools.js';

/*
This file is far from being finished.
It will be refactored structurally.
Mostly it consists of UI boilerplate. Other files have more interesting content
 */

const canvasWidth = 50;
const canvasHeight = 50;

const canvas = new Canvas(canvasWidth, canvasHeight);
const renderer = new CanvasRenderer();

let chosenTool = undefined;

window.onload = () => {
  renderer.appendCanvas(canvas);
  setUpExporter();
  setupColorPicker(canvas);

  chosenTool = new Pencil();
  chosenTool.link(canvas);

  setUpUserInterface();
};

function setUpExporter() {
  const button = document.getElementById('export-button');
  button.onclick = downloadImage;
}

function downloadImage() {
  const image = canvas.getMergedImage();
  const encoder = new BmpEncoder(image, bmpVersions.bmp32);
  downloadLocalUrl(bytesToUrl(encoder.encode()), 'image.bmp');
}

function setUpUserInterface() {
  createToolbar();
  assignStateButtons();
  assignLayerButtons();
  setUpUpdateListener();
}

/*
Handling of toolbar creation
 */

//A wrapper class for tool which defines its display name and icon
class ToolInfo {
  constructor(tool, name, icon) {
    this.tool = tool;
    this.name = name;
    this.icon = icon;
  }
}

function createToolbar() {
  const toolsInfo = [
    new ToolInfo(new Pencil(), 'Pencil', './images/favicon.ico'),
    new ToolInfo(new Eraser(), 'Eraser', './images/eraser.ico'),
    new ToolInfo(new BucketFill(), 'BucketFill', './images/bucket.png')
  ];
  const elements = toolsInfo.map((toolInfo) => createToolElement(toolInfo));
  const container = document.getElementById('tools');
  elements.forEach((element) => container.appendChild(element));
}

function createToolElement(toolInfo) {
  const element = document.createElement('div');
  element.id = toolInfo.name.toLowerCase();

  element.classList.add('single-tool');
  element.onclick = () => {
    chosenTool.disable();
    chosenTool = toolInfo.tool;
    chosenTool.link(canvas);
  };
  element.style.backgroundImage = `url(${toolInfo.icon})`;

  return element;
}

/*
Handling of zoom
 */

const zoomCodes = {
  '+': true,
  '=': true,
  '-': false,
  '_': false
};

document.addEventListener('keypress', (event) => {
  const index = Object.keys(zoomCodes).indexOf(event.key);
  if (index !== -1) {
    renderer.zoom(zoomCodes[event.key]);
  }
});

function assignStateButtons() {
  const undoButton = document.getElementById('undo-button');
  const redoButton = document.getElementById('redo-button');
  undoButton.onclick = () => canvas.undo();
  redoButton.onclick = () => canvas.redo();
}

/*
Handling of layer-specific functions
 */

function assignLayerButtons() {
  const addLayerButton = document.getElementById('add-layer-button');
  const removeLayerButton = document.getElementById('remove-layer-button');
  const moveUpLayerButton = document.getElementById('move-up-layer-button');
  const moveDownLayerButton = document.getElementById('move-down-layer-button');

  addLayerButton.onclick = () => canvas.appendLayer();
  removeLayerButton.onclick = () => canvas.removeLayer(canvas.drawingLayer.id);
  moveUpLayerButton.onclick = () => canvas.moveLayerUp(canvas.drawingLayer.id);
  moveDownLayerButton.onclick = () => canvas.moveLayerDown(canvas.drawingLayer.id);
}

function setUpUpdateListener() {
  setLayerMenu();
  canvas.listenToUpdates(setLayerMenu);
}

function setLayerMenu() {
  const layers = canvas.layers;
  let container = document.getElementById('layer-container');
  container = clearLayerContainer(container);

  for (let i = layers.length - 1; i >= 0; i--) { //Iterate the list in reversed order
    const layer = layers[i];
    const layerElement = document.createElement('div');
    layerElement.appendChild(getLayerImage(layer));

    appendLayerName(layer, layerElement);
    handleLayerClasses(layer, layerElement);
    layerElement.onclick = () => {
      canvas.switchLayer(layer.id);
    };
    layerElement.appendChild(getVisibilityButton(layer));

    container.appendChild(layerElement);
  }
}

function clearLayerContainer(container) {
  const sidebar = document.getElementById('sidebar');
  container.remove();

  const newContainer = document.createElement('div');
  newContainer.id = 'layer-container';
  sidebar.appendChild(newContainer);

  return newContainer;
}

function appendLayerName(layer, layerElement) {
  const name = document.createElement('p');
  name.innerText = `Layer ${layer.id}`;
  layerElement.appendChild(name);
}

function handleLayerClasses(layer, layerElement) {
  layerElement.classList.add('layer-element');
  if (layer === canvas.drawingLayer) {
    layerElement.classList.add('layer-element-selected');
  }
}

function getVisibilityButton(layer) {
  const visibilityButton = document.createElement('div');
  visibilityButton.classList.add('visibility-button');
  if (!layer.visible) {
    visibilityButton.classList.add('visibility-button-inactive');
  }
  visibilityButton.onclick = () => {
    layer.visible = !layer.visible;
    canvas.redraw();
  };
  return visibilityButton;
}

const IMAGE_POS = 0;

function getLayerImage(layer) { //To be optimized by caching
  const imageElement = document.createElement('div');
  imageElement.classList.add('layer-image');
  imageElement.style.aspectRatio = renderer.canvasWrapper.style.aspectRatio;

  const image = layer.context.getImageData(IMAGE_POS, IMAGE_POS, layer.virtualCanvas.width, layer.virtualCanvas.height);
  const encoder = new BmpEncoder(image, bmpVersions.bmp32); //Render image with transparency
  const data = encoder.encode();
  const url = bytesToUrl(data); //Possibly replace with base64 encoded data

  imageElement.style.backgroundImage = `url(${url})`;
  return imageElement;
}

window.addEventListener('resize', () => renderer.adjustSize());
