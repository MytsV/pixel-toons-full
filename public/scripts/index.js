import { CanvasRenderer, setupColorPicker } from './core/canvas_renderer.js';
import { Canvas } from './core/canvas.js';
import { downloadByteArray } from './utilities/file_download.js';
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
  canvas.refreshImageData();
  const encoder = new BmpEncoder(canvas.image);
  downloadByteArray(encoder.encode(), 'image.bmp');
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
