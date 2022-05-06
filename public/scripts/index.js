import { CanvasRenderer, setupColorPicker } from './core/canvas_renderer.js';
import { Canvas } from './core/canvas.js';
import { download } from './utilities/file_download.js';
import { BmpEncoder } from './utilities/bmp_encoder.js';
import { Eraser, Pencil } from './core/instruments.js';

const canvasWidth = 50;
const canvasHeight = 50;

const canvas = new Canvas(canvasWidth, canvasHeight);
const renderer = new CanvasRenderer();

window.onload = () => {
  renderer.appendCanvas(canvas);
  setUpExporter();
  setupColorPicker(canvas);

  const instrument = new Pencil();
  instrument.link(canvas);
};

const downloadImage = () => {
  canvas.refreshImageData();
  const encoder = new BmpEncoder(canvas.image);
  download(encoder.encode(), 'image.bmp', 'image/bmp');
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
