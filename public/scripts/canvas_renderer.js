/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Canvas } from './canvas.js';
import { Color } from './color.js';

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
  createBasicBackground(canvas);

  renderElement(canvas.element);
  setPixelEvents(canvas);
};

function renderElement(canvasElement) {
  const canvasParent = document.getElementById('canvas-parent'); //parent-wrapper is needed for effective zooming
  canvasElement.classList.add('canvas-element');

  const canvasWrapper = document.createElement('div');
  canvasWrapper.id = 'canvas-wrapper';

  canvasWrapper.appendChild(canvasElement);
  canvasParent.appendChild(canvasWrapper);
}

//Colors for creating a basic grey-white background
const transparentColorFirst = '#ffffff';
const transparentColorSecond = '#e3e3e3';

//Function to turn image into a basic grey-white background which indicates transparency
function createBasicBackground(canvas) {
  const image = canvas.image;

  for (let i = 0; i < image.height; i++) {
    for (let j = 0; j < image.width; j++) {
      const pixelColor = getClearPixelColor(i, j);
      image.setPixelColor(i, j, Color.fromHex(pixelColor));
    }
  }

  canvas.update();
}

//Get color of transparent pixel based on its coordinates
function getClearPixelColor(i, j) {
  if (i % 2 !== j % 2) { //the condition makes sure that neighbouring pixels are always of different color
    return transparentColorFirst; //first pixel is always white
  } else {
    return transparentColorSecond;
  }
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

  const drawPoint = (x, y) => {
    canvas.context.fillStyle = pencilColor;
    canvas.context.fillRect(x, y, 1, 1);
  };

  plotBresenhamLine(coordinates, lastReal, drawPoint);

  last = new Coordinates(event.clientX, event.clientY);
}

/*We wouldn't like to use anti-aliasing,
hence instead of native lineTo() function we use Bresenham's algorithm to draw a line.

Implementation is taken from https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
 */
function plotBresenhamLine(src, dest, drawPoint) {
  if (Math.abs(dest.y - src.y) < Math.abs(dest.x - src.x)) {
    if (src.x > dest.x) {
      plotLineLow(dest, src, drawPoint);
    } else {
      plotLineLow(src, dest, drawPoint);
    }
  } else if (src.y > dest.y) {
    plotLineHigh(dest, src, drawPoint);
  } else {
    plotLineHigh(src, dest, drawPoint);
  }
}

function plotLineLow(src, dest, drawPoint) {
  const dx = dest.x - src.x;
  let dy = dest.y - src.y;

  let yi = 1;
  if (dy < 0) {
    yi = -1;
    dy = -dy;
  }

  let diff = (2 * dy) - dx;
  let y = src.y;

  for (let x = src.x; x <= dest.x; x++) {
    drawPoint(x, y);
    if (diff > 0) {
      y += yi;
      diff += 2 * (dy - dx);
    } else {
      diff += 2 * dy;
    }
  }
}

function plotLineHigh(src, dest, drawPoint) {
  let dx = dest.x - src.x;
  const dy = dest.y - src.y;

  let xi = 1;
  if (dx < 0) {
    xi = -1;
    dx = -dx;
  }

  let diff = (2 * dx) - dy;
  let x = src.x;

  for (let y = src.y; y <= dest.y; y++) {
    drawPoint(x, y);
    if (diff > 0) {
      x += xi;
      diff += 2 * (dx - dy);
    } else {
      diff += 2 * dx;
    }
  }
}

function isOffsetValid(canvasElement, event) {
  const plausible = canvasElement.offsetWidth / canvasElement.width;
  return Math.abs(event.clientX - last.x) >= plausible || Math.abs(event.clientY - last.y) >= plausible;
}

function getRealCoordinates(canvasElement, clientX, clientY) {
  const rect = canvasElement.getBoundingClientRect();

  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  const x = relX * canvasElement.width / canvasElement.offsetWidth;
  const y = relY * canvasElement.height / canvasElement.offsetHeight;
  return new Coordinates(Math.floor(x), Math.floor(y));
}

export { renderCanvas };
