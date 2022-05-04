/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Canvas } from './canvas.js';

let drawing = false;
let lastCoordinates = undefined;

const pencilColor = '#ff00ddff';

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

function setPixelEvents(canvas) {
  canvas.element.onmousedown = (event) => { //if mouse button is held pressed, we draw
    lastCoordinates = getCoordinates(canvas.element, event);
    drawing = true;
  };

  document.onmouseup = () => { //if mouse button is released anywhere, we stop drawing
    drawing = false;
  };

  canvas.element.onmousemove = (event) => {
    if (drawing) {
      drawCanvasLine(canvas, event);
    }
  };
}

function drawCanvasLine(canvas, event) {
  const coordinates = getCoordinates(canvas.element, event);
  const ctx = canvas.context;
  ctx.strokeStyle = pencilColor;

  ctx.beginPath();
  ctx.moveTo(lastCoordinates.x, lastCoordinates.y);
  ctx.lineTo(coordinates.x, coordinates.y);

  ctx.strokeWidth = 1;
  ctx.stroke();

  ctx.closePath();

  lastCoordinates = coordinates;
}

function getCoordinates(canvasElement, event) {
  const relX = event.clientX - canvasElement.offsetLeft;
  const relY = event.clientY - canvasElement.offsetTop;

  const x = relX * canvasElement.width / canvasElement.offsetWidth;
  const y = relY * canvasElement.height / canvasElement.offsetHeight;
  return { 'x': Math.floor(x), 'y': Math.floor(y) };
}

export { setPixelEvents };
