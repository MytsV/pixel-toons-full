import { renderCanvas } from './core/canvas_renderer.js';
import { zoom } from './core/zoom.js';

window.onload = () => {
  renderCanvas(50, 50);
};

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
