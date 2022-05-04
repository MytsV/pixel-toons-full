/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Canvas } from './canvas.js';

class Coordinates {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

let drawing = false;
let last = undefined;

const pencilColor = '#ff00ddff';

const renderCanvas = (width, height) => {
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
    last = new Coordinates(event.clientX, event.clientY);
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
  if (!isOffsetValid(canvas.element, event)) return;

  const coordinates = getRealCoordinates(canvas.element, event.clientX, event.clientY);
  const lastReal = getRealCoordinates(canvas.element, last.x, last.y);

  const ctx = canvas.context;
  ctx.strokeStyle = pencilColor;

  ctx.beginPath();
  ctx.moveTo(lastReal.x, lastReal.y);
  ctx.lineTo(coordinates.x, coordinates.y);
  ctx.stroke();

  ctx.closePath();

  last = new Coordinates(event.clientX, event.clientY);
}

function isOffsetValid(canvasElement, event) {
  const plausible = canvasElement.offsetWidth / canvasElement.width;
  return Math.abs(event.clientX - last.x) >= plausible || Math.abs(event.clientY - last.y) >= plausible;
}

function getRealCoordinates(canvasElement, clientX, clientY) {
  const relX = clientX - canvasElement.offsetLeft;
  const relY = clientY - canvasElement.offsetTop;

  const x = relX * canvasElement.width / canvasElement.offsetWidth;
  const y = relY * canvasElement.height / canvasElement.offsetHeight;
  return new Coordinates(Math.floor(x), Math.floor(y));
}

export { renderCanvas };
