import { renderCanvas, setUpColorPicker } from './core/canvas_renderer.js';
import { zoom } from './core/zoom.js';
import { Canvas } from './core/canvas.js';
import { download } from './utilities/file_download.js';
import { BmpEncoder } from './utilities/bmp_encoder.js';

const canvas = new Canvas(50, 50);

window.onload = () => {
  renderCanvas(canvas);
  setUpExporter();
  setUpColorPicker();
};

const downloadImage = () => {
  canvas.updateImageData();
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
    zoom(zoomCodes[event.key]);
  }
});
