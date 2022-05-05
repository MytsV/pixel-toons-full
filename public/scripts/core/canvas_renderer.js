/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Canvas } from './canvas.js';
import { Color } from '../utilities/color.js';
import { Coordinates } from '../utilities/coordinates.js';

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

/*We wouldn't like to use antialiasing,
hence instead of native lineTo() function we use Bresenham's algorithm to draw a line.

Implementation is taken from https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
 */
function plotBresenhamLine(src, dest, drawPoint) {
  const diff = Coordinates.getDifference(src, dest);
  const signX = Math.sign(diff.x);
  const signY = Math.sign(diff.y);
  diff.x = Math.abs(diff.x);
  diff.y = -Math.abs(diff.y);

  //Error allows us to perform all octant drawing. The algorithm is still precise.
  let error = diff.x + diff.y;
  const curr = new Coordinates(src.x, src.y);

  do {
    drawPoint(curr.x, curr.y);
    const doubleError = 2 * error;

    if (doubleError >= diff.y) {
      if (curr.equalX(dest)) break;
      error += diff.y;
      curr.x += signX;
    } else if (doubleError <= diff.x) {
      if (curr.equalY(dest)) break;
      error += diff.x;
      curr.y += signY;
    }
  } while (!curr.equal(dest));
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
