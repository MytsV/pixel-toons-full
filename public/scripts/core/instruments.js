import { Coordinates } from '../utilities/coordinates.js';

class Instrument {
  constructor() {
    if (new.target === Instrument) {
      throw Error('Abstract class cannot be instantiated');
    }
  }

  link(canvas) {
    this.canvas = canvas;
    this.setEvents();
  }

  setEvents() {
    throw Error('The method is not implemented');
  }
}

class Pencil extends Instrument {
  #lastCoordinates;
  #drawing;

  constructor() {
    super();
    this.#lastCoordinates = undefined;
    this.#drawing = false;
  }

  setEvents() {
    this.canvas.element.onmousedown = (event) => { //If mouse button is held pressed, we draw
      this.#lastCoordinates = new Coordinates(event.clientX, event.clientY);
      this.#drawing = true;
    };

    this.canvas.element.onclick = (event) => {
      const coordinates = getRealCoordinates(this.canvas.element, event.clientX, event.clientY);
      drawPoint(this.canvas, coordinates);
    };

    document.onmouseup = () => { //If mouse button is released anywhere, we stop drawing
      this.#drawing = false;
    };

    document.onmousemove = (event) => {
      if (this.#drawing) {
        if (!this.#isOffsetValid(event)) return;
        const dest = new Coordinates(event.clientX, event.clientY);
        drawCanvasLine(this.canvas, this.#lastCoordinates, dest);
        this.#lastCoordinates = dest;
      }
    };
  }

  #isOffsetValid(event) {
    const error = 0.35;
    const canvasElement = this.canvas.element;

    let plausible = canvasElement.offsetWidth / canvasElement.width;
    plausible -= plausible * error;
    return Math.abs(event.clientX - this.#lastCoordinates.x) >= plausible ||
      Math.abs(event.clientY - this.#lastCoordinates.y) >= plausible;
  }
}

function drawCanvasLine(canvas, src, dest) {
  const srcReal = getRealCoordinates(canvas.element, dest.x, dest.y);
  const destReal = getRealCoordinates(canvas.element, src.x, src.y);
  plotBresenhamLine(destReal, srcReal, ({ x, y }) => drawPoint(canvas, { x, y }));
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

function getRealCoordinates(canvasElement, clientX, clientY) { //у теорії можна запхати в клас Canvas?
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

export { Pencil };
