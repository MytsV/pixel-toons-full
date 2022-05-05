import { renderCanvas } from './canvas_renderer.js';
import { Canvas } from './canvas.js';
import { download } from './file_download.js';
import { BmpEncoder } from './bmp_encoder.js';

const canvas = new Canvas(50, 50);

window.onload = () => {
  renderCanvas(canvas);
  setUpExporter();
};

const downloadImage = () => {
  canvas.updateImageData();
  const encoder = new BmpEncoder(canvas.image);
  download(encoder.encode().data, 'image.bmp', 'image/bmp');
};

function setUpExporter() {
  const button = document.getElementById('export-button');
  button.onclick = downloadImage;
}
