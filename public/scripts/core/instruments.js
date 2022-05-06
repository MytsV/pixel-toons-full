import { Coordinates } from '../utilities/coordinates.js';
import { Color } from '../utilities/color.js';

/*
An abstract class which defines drawing operations
 */
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

  setEvents() { //A method which will subscribe to events in web browser
    throw Error('The method is not implemented');
  }
}

/*
Instrument which draws simple lines on the canvas
 */
class Pencil extends Instrument {
  #lastCoordinates;
  #drawing;

  constructor() {
    super();
    this.#lastCoordinates = undefined;
    this.#drawing = false;
  }

  setEvents() {
    this.canvas.element.onmousedown = (event) => this.#onMouseDown(event);
    this.canvas.element.onclick = (event) => this.#onClick(event);
    //If mouse button is released anywhere, we stop drawing
    document.onmouseup = () => {
      this.#drawing = false;
    };
    document.onmousemove = (event) => this.#onMouseMove(event);
  }

  //When mouse button is initially pressed, we start drawing
  #onMouseDown(event) {
    this.#lastCoordinates = new Coordinates(event.clientX, event.clientY);
    this.#drawing = true;
  }

  //When mouse is pressed and release, we draw one pixel
  #onClick(event) {
    const coordinates = getRealCoordinates(this.canvas.element, event.clientX, event.clientY);
    drawPoint(this.canvas, this.getColor(), coordinates);
  }

  //When mouse is moved throughout canvas, we leave trail
  #onMouseMove(event) {
    if (!this.#drawing) return; //We don't draw if mouse button is not held pressed
    if (!this.#isOffsetValid(event)) return; //We don't draw if between last drawn point there is not enough space

    const dest = new Coordinates(event.clientX, event.clientY);
    drawCanvasLine(this.canvas, this.getColor(), this.#lastCoordinates, dest);
    this.#lastCoordinates = dest;
  }

  //Determines if there is enough distance between last and current point of drawing
  #isOffsetValid(event) {
    const canvasElement = this.canvas.element;
    let minOffset = canvasElement.offsetWidth / canvasElement.width;

    //We decrease minimal offset to make drawing more smooth
    const ERROR = 0.3;
    minOffset -= minOffset * ERROR;

    const dx = event.clientX - this.#lastCoordinates.x;
    const dy = event.clientY - this.#lastCoordinates.y;
    return Math.abs(dx) >= minOffset || Math.abs(dy) >= minOffset;
  }

  //Makes the class open to extensions
  getColor() {
    return this.canvas.state.color;
  }
}

/*
Instrument which turns canvas pixels fully transparent
 */
class Eraser extends Pencil {
  getColor() {
    return Color.fromHex('#00000000');
  }
}

function drawCanvasLine(canvas, color, src, dest) {
  const srcReal = getRealCoordinates(canvas.element, dest.x, dest.y);
  const destReal = getRealCoordinates(canvas.element, src.x, src.y);
  plotBresenhamLine(destReal, srcReal, ({ x, y }) => drawPoint(canvas, color, { x, y }));
}

function drawPoint(canvas, color, { x, y }) {
  canvas.image.setPixelColor(y, x, color);
  canvas.update();
}

/*
Antialiasing is not suited for the application,
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

export { Pencil, Eraser };
