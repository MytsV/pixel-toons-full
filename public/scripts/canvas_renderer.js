/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Canvas } from './canvas.js';

let drawing = false;
const pencilColor = '#ff00ddff';

let lastCoordinates;

export const renderCanvas = (width, height) => {
  const canvas = new Canvas(width, height);
  renderElement(canvas.element);
  setPixelEvents(canvas);
};

function renderElement(canvasElement) {
  const canvasParent = document.getElementById('canvas-parent'); //parent-wrapper is needed for effective zooming
  canvasElement.classList.add('canvas-element');

  canvasParent.appendChild(canvasElement);

  return canvasElement;
}

export function setPixelEvents(canvas) {
  canvas.element.onmousedown = (event) => { //if mouse button is held pressed, we draw
    lastCoordinates = getCoordinates(canvas.element, event);
    drawing = true;
  };

  document.onmouseup = () => { //if mouse button is released anywhere, we stop drawing
    drawing = false;
  };

  canvas.element.onmousemove = (event) => {
    if (drawing) {
      const coordinates = getCoordinates(canvas.element, event);
      canvas.context.strokeStyle = pencilColor;

      canvas.context.beginPath();
      canvas.context.moveTo(lastCoordinates.x, lastCoordinates.y);
      canvas.context.lineTo(coordinates.x, coordinates.y);

      canvas.context.strokeWidth = 1;
      canvas.context.stroke();

      canvas.context.closePath();

      lastCoordinates = coordinates;
    }
  };
}

function getCoordinates(canvasElement, event) {
  const x = (event.clientX - canvasElement.offsetLeft) * canvasElement.width / canvasElement.offsetWidth;
  const y = (event.clientY - canvasElement.offsetTop) * canvasElement.height / canvasElement.offsetHeight;
  return { 'x': Math.floor(x), 'y': Math.floor(y) };
}
