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
let file = null;

class AnimationFile {
  constructor(width, height) {
    this.canvas = new Canvas(width, height);
    this.width = width;
    this.height = height;
  }
}

const renderer = new CanvasRenderer();
let chosenTool = undefined;

window.onload = () => {
  const fileCreateButton = document.getElementById('file-create');
  const fileClearButton = document.getElementById('file-clear');

  fileCreateButton.onclick = () => onFileCreate();
  fileClearButton.onclick = () => onFileClear();

  newFile(50, 50);
};

function onFileCreate() {
  const modal = document.getElementById('file-create-modal');
  modal.style.display = 'block';

  const createFinishButton = document.getElementById('file-create-finish');
  createFinishButton.onclick = () => {
    const inputWidth = document.getElementById('width-input');
    const inputHeight = document.getElementById('height-input');
    newFile(inputWidth.value, inputHeight.value);
    modal.style.display = 'none';
  };
}

window.onclick = function(event) {
  const modal = document.getElementById('file-create-modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

function onFileClear() {
  newFile(file.width, file.height);
}

function newFile(width, height) {
  file = new AnimationFile(width, height);

  renderer.removeCanvases();
  renderer.appendCanvas(file.canvas);

  setUpExporter();

  chosenTool = new Pencil();
  chosenTool.link(file.canvas);

  setUpUserInterface();
}

function setUpExporter() {
  const button = document.getElementById('export-button');
  button.onclick = downloadImage;
}

function downloadImage() {
  const image = file.canvas.getJoinedImage();
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
  constructor(tool, name) {
    this.tool = tool;
    this.name = name;
  }
}

function createToolbar() {
  const toolsInfo = [
    new ToolInfo(new Pencil(), 'Pencil'),
    new ToolInfo(new Eraser(), 'Eraser'),
    new ToolInfo(new BucketFill(), 'Bucket Fill')
  ];
  const elements = toolsInfo.map((toolInfo) => createToolElement(toolInfo));
  const container = document.getElementById('tools');
  container.innerHTML = '';

  elements.forEach((element) => container.appendChild(element));
  container.appendChild(setupColorPicker(file.canvas));
}

function createToolElement(toolInfo) {
  const element = document.createElement('div');
  element.id = toolInfo.name.toLowerCase();

  element.classList.add('single-tool');
  element.classList.add('label-panel');
  element.classList.add('main-panel');

  const text = document.createElement('span');
  text.innerText = toolInfo.name;
  text.classList.add('text');

  element.appendChild(text);
  element.onclick = () => {
    chosenTool.disable();
    chosenTool = toolInfo.tool;
    chosenTool.link(file.canvas);
  };

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
  undoButton.onclick = () => file.canvas.undo();
  redoButton.onclick = () => file.canvas.redo();
}

/*
Handling of layer-specific functions
 */

function assignLayerButtons() {
  const addLayerButton = document.getElementById('add-layer-button');
  const removeLayerButton = document.getElementById('remove-layer-button');
  const moveUpLayerButton = document.getElementById('move-up-layer-button');
  const moveDownLayerButton = document.getElementById('move-down-layer-button');
  const uniteLayerButton = document.getElementById('unite-layer-button');

  addLayerButton.onclick = () => file.canvas.appendLayer();
  removeLayerButton.onclick = () => file.canvas.removeLayer(file.canvas.drawnLayerID);
  moveUpLayerButton.onclick = () => file.canvas.moveLayerUp(file.canvas.drawnLayerID);
  moveDownLayerButton.onclick = () => file.canvas.moveLayerDown(file.canvas.drawnLayerID);
  uniteLayerButton.onclick = () => {
    const currentIndex = file.canvas.layers.findIndex((layer) => layer.id === file.canvas.drawnLayerID);
    file.canvas.mergeLayers(file.canvas.drawnLayerID, file.canvas.layers[currentIndex - 1].id);
  };
}

function setUpUpdateListener() {
  setLayerMenu();
  file.canvas.listenToUpdates(setLayerMenu);
}

function setLayerMenu() {
  const layers = file.canvas.layers;
  const container = document.getElementById('layer-container');
  container.innerHTML = '';

  for (let i = layers.length - 1; i >= 0; i--) { //Iterate the list in reversed order
    const layer = layers[i];
    const layerElement = document.createElement('div');
    layerElement.appendChild(getLayerImage(layer));

    appendLayerName(layer, layerElement);
    handleLayerClasses(layer, layerElement);
    // eslint-disable-next-line no-loop-func
    layerElement.onclick = () => {
      file.canvas.switchLayer(layer.id);
    };
    layerElement.appendChild(getVisibilityButton(layer));

    container.appendChild(layerElement);
  }
}

function appendLayerName(layer, layerElement) {
  const name = document.createElement('span');
  name.classList.add('text');
  name.classList.add('layer-name');
  name.innerText = `Layer ${layer.id}`;
  layerElement.appendChild(name);
}

function handleLayerClasses(layer, layerElement) {
  layerElement.classList.add('layer-element');
  if (layer.id === file.canvas.drawnLayerID) {
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
    file.canvas.redraw();
  };
  return visibilityButton;
}

const IMAGE_POS = 0;
const layerCache = new Map(); //Keys are layer IDs, values - URLs of layer images

function getLayerImage(layer) {
  const imageElement = document.createElement('div');
  imageElement.classList.add('layer-image');
  imageElement.style.aspectRatio = renderer.canvasWrapper.style.aspectRatio;

  let url;

  if (file.canvas.drawnLayerID !== layer.id && layerCache.has(layer.id)) {
    url = layerCache.get(layer.id);
  } else {
    const image = layer.context.getImageData(IMAGE_POS, IMAGE_POS, layer.virtualCanvas.width, layer.virtualCanvas.height);
    const encoder = new BmpEncoder(image, bmpVersions.bmp32); //Render image with transparency
    const data = encoder.encode();
    url = bytesToUrl(data);
  }

  layerCache.set(layer.id, url);
  imageElement.style.backgroundImage = `url(${url})`;
  return imageElement;
}

window.addEventListener('resize', () => renderer.adjustSize());
