/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Color } from '../utilities/color.js';
import { Coordinates } from '../utilities/coordinates.js';

let drawing = false;
let last = undefined;

class CanvasRenderer {
  constructor() {
    this.canvasWrapper = document.getElementById('canvas-wrapper');
  }

  appendCanvas(canvas) {
    canvas.element.oncontextmenu = () => false; //Disable right click context menu on canvas
    this.#setUpElement(canvas.element);
    setPixelEvents(canvas);
  }

  #setUpElement(canvasElement) {
    canvasElement.oncontextmenu = () => false;
    canvasElement.classList.add('canvas-element');
    this.canvasWrapper.appendChild(canvasElement); //Canvas is wrapped to manage zooming
  }

  removeCanvases() {
    const children = this.canvasWrapper.children;
    for (const child of children) {
      child.remove();
    }
  }
}

function setUpColorPicker(canvas) {
  const colorPicker = document.getElementById('color-picker');
  colorPicker.oninput = () => {
    canvas.state.color = Color.fromHex(colorPicker.value);
  };
}

function setPixelEvents(canvas) {
  canvas.element.onmousedown = (event) => { //If mouse button is held pressed, we draw
    last = new Coordinates(event.clientX, event.clientY);
    drawing = true;
  };

  canvas.element.onclick = (event) => {
    const coordinates = getRealCoordinates(canvas.element, event.clientX, event.clientY);
    drawPoint(canvas, coordinates);
  };

  document.onmouseup = () => { //If mouse button is released anywhere, we stop drawing
    drawing = false;
  };

  document.onmousemove = (event) => {
    if (drawing) {
      drawCanvasLine(canvas, event);
    }
  };
}

function drawCanvasLine(canvas, event) {
  if (!isOffsetValid(canvas.element, event)) return;

  const coordinates = getRealCoordinates(canvas.element, event.clientX, event.clientY);
  const lastReal = getRealCoordinates(canvas.element, last.x, last.y);

  plotBresenhamLine(lastReal, coordinates, ({ x, y }) => drawPoint(canvas, { x, y }));

  last = new Coordinates(event.clientX, event.clientY);
}

/*We wouldn't like to use antialiasing,
hence instead of native lineTo() function we use Bresenham's algorithm to draw a line.

Implementation is taken from https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
 */
function plotBresenhamLine(src, dest, plotPoint) {
  const diff = Coordinates.getDifference(src, dest);
  const signX = Math.sign(diff.x);
  const signY = Math.sign(diff.y);
  diff.x = Math.abs(diff.x);
  diff.y = -Math.abs(diff.y);

  //Error allows us to perform all octant drawing. The algorithm is still precise.
  let error = diff.x + diff.y;
  const curr = new Coordinates(src.x, src.y);

  do {
    plotPoint(curr);
    if (curr.equal(dest)) break;
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
  } while (true);
}

function drawPoint(canvas, { x, y }) {
  canvas.context.fillStyle = canvas.state.color.toString();
  canvas.context.fillRect(x, y, 1, 1);
}

function isOffsetValid(canvasElement, event) {
  const error = 0.35;

  let plausible = canvasElement.offsetWidth / canvasElement.width;
  plausible -= plausible * error;
  return Math.abs(event.clientX - last.x) >= plausible || Math.abs(event.clientY - last.y) >= plausible;
}

function getRealCoordinates(canvasElement, clientX, clientY) {
  const rect = canvasElement.getBoundingClientRect();

  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  let x = relX * canvasElement.width / canvasElement.offsetWidth;
  let y = relY * canvasElement.height / canvasElement.offsetHeight;

  if (x > canvasElement.width - 1) {
    x = canvasElement.width - 1;
  } else if (x < 0) {
    x = 0;
  }

  if (y > canvasElement.height - 1) {
    y = canvasElement.height - 1;
  } else if (y < 0) {
    y = 0;
  }

  return new Coordinates(Math.floor(x), Math.floor(y));
}

export { CanvasRenderer, setUpColorPicker };
