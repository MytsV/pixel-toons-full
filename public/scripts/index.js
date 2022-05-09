import { CanvasRenderer, setupColorPicker } from './core/canvas_renderer.js';
import { Canvas } from './core/canvas.js';
import { bytesToUrl, downloadLocalUrl } from './utilities/file_download.js';
import { BmpEncoder } from './utilities/bmp_encoder.js';
import { BucketFill, Eraser, Pencil } from './core/tools.js';

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

  createToolbar();
  assignStateButtons();
  assignLayerButtons();
};

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
  const elements = toolsInfo.map((toolInfo) => {
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
  });

  const wrapper = document.getElementById('tools');
  elements.forEach((element) => wrapper.appendChild(element));
}

const downloadImage = () => {
  const image = canvas.getCombinedImage();
  const encoder = new BmpEncoder(image);
  downloadLocalUrl(bytesToUrl(encoder.encode()), 'image.bmp');
};

function setUpExporter() {
  const button = document.getElementById('export-button');
  button.onclick = downloadImage;
}

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

function assignLayerButtons() {
  const addLayerButton = document.getElementById('add-layer-button');

  const removeLayerButton = document.getElementById('remove-layer-button');
  const moveUpLayerButton = document.getElementById('move-up-layer-button');
  const moveDownLayerButton = document.getElementById('move-down-layer-button');

  addLayerButton.onclick = () => canvas.appendLayer();
  removeLayerButton.onclick = () => {
    canvas.removeLayer(canvas.drawingLayer.id);
  };
  moveUpLayerButton.onclick = () => {
    canvas.moveLayerUp(canvas.drawingLayer.id);
  };
  moveDownLayerButton.onclick = () => {
    canvas.moveLayerDown(canvas.drawingLayer.id);
  };
  setLayerMenu();
  canvas.subscribeToUpdate(setLayerMenu);
}

function setLayerMenu() {
  const layers = canvas.layers;
  const sidebar = document.getElementById('sidebar');

  let container = document.getElementById('layer-container');
  container.remove();
  container = document.createElement('div');
  container.id = 'layer-container';
  sidebar.appendChild(container);

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const layerElement = document.createElement('div');
    layerElement.appendChild(getLayerImage(layer));

    const name = document.createElement('p');
    name.innerText = `Layer ${layer.id}`;
    layerElement.appendChild(name);
    container.appendChild(layerElement);

    layerElement.classList.add('layer-element');
    if (layer === canvas.drawingLayer) {
      layerElement.classList.add('layer-element-selected');
    }

    layerElement.onclick = () => {
      canvas.switchLayer(layer.id);
    };

    const visibilityButton = document.createElement('div');
    visibilityButton.classList.add('visibility-button');
    if (!layer.visible) {
      visibilityButton.classList.add('visibility-button-inactive');
    }
    visibilityButton.onclick = () => {
      layer.visible = !layer.visible;
      canvas.update();
    };
    layerElement.appendChild(visibilityButton);
  }
}

function getLayerImage(layer) { //optimize by caching
  const imageElement = document.createElement('div');
  imageElement.classList.add('layer-image');

  const image = layer.virtualCanvas.getContext('2d')
    .getImageData(0, 0, layer.virtualCanvas.width, layer.virtualCanvas.height);
  const encoder = new BmpEncoder(image);
  const data = encoder.encode();
  const url = bytesToUrl(data);

  imageElement.style.backgroundImage = `url(${url})`;
  return imageElement;
}
