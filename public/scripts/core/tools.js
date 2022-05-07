import { Coordinates } from '../utilities/coordinates.js';
import { Color } from '../utilities/color.js';

/*
An abstract class which defines drawing operations
 */
class Tool {
  constructor() {
    if (new.target === Tool) {
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
Tool which draws simple lines on the canvas
 */
class Pencil extends Tool {
  #lastCoordinates;
  #drawing;

  constructor() {
    super();
    this.#lastCoordinates = undefined;
    this.#drawing = false;
  }

  link(canvas) {
    super.link(canvas);
    const mixin = {
      drawPoint,
      plotLine
    };
    Object.assign(canvas, mixin);
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
    const coordinates = getRealCoordinates(this.canvas.element, new Coordinates(event.clientX, event.clientY));
    this.canvas.drawPoint(this.getColor(), coordinates);
  }

  //When mouse is moved throughout canvas, we leave trail
  #onMouseMove(event) {
    if (!this.#drawing) return; //We don't draw if mouse button is not held pressed
    if (!this.#isOffsetValid(event)) return; //We don't draw if between last drawn point there is not enough space

    const dest = new Coordinates(event.clientX, event.clientY);
    this.canvas.plotLine(this.getColor(), this.#lastCoordinates, dest);
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

function plotLine(color, src, dest) {
  const srcReal = getRealCoordinates(this.element, dest);
  const destReal = getRealCoordinates(this.element, src);
  bresenhamLine(destReal, srcReal, ({ x, y }) => this.drawPoint(color, { x, y }));
}

function drawPoint(color, { x, y }) {
  this.image.setPixelColor(x, y, color);
  this.update();
}

/*
Tool which turns canvas pixels fully transparent
 */
class Eraser extends Pencil {
  getColor() {
    return Color.fromHex('#00000000');
  }
}

/*
Antialiasing is not suited for the application,
hence instead of native lineTo() function we use Bresenham's algorithm to draw a line.

Refer to this link https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm for implementation details
 */
function bresenhamLine(src, dest, plotPoint) {
  const diff = Coordinates.getDifference(src, dest);
  const signX = Math.sign(diff.x);
  const signY = Math.sign(diff.y);
  diff.x = Math.abs(diff.x);
  diff.y = -Math.abs(diff.y);

  //Error allows us to perform all octant drawing. The algorithm is still precise
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

const DEFAULT_TOLERANCE = 0;

class BucketFill extends Tool {
  #visited;
  #queue;

  constructor() {
    super();
    this.tolerance = DEFAULT_TOLERANCE;
  }

  setEvents() {
    this.canvas.element.onclick = (event) => this.#onClick(event);
  }

  #onClick(event) {
    const coordinates = getRealCoordinates(this.canvas.element, new Coordinates(event.clientX, event.clientY));
    this.#floodFill(coordinates);
    this.canvas.update();
  }

  #floodFill(initial) {
    const initialColor = this.canvas.image.getPixelColor(initial.x, initial.y);

    this.#queue = [];
    this.#visited = this.#initVisited();
    this.#visit(initial); //Initiate queue with first element

    while (this.#queue.length !== 0) {
      const current = this.#queue.shift();
      const currentColor = this.canvas.image.getPixelColor(current.x, current.y);
      if (!this.#isColorValid(initialColor, currentColor)) continue;
      this.#fillPixel(current);

      this.#visit(new Coordinates(current.x - 1, current.y));
      this.#visit(new Coordinates(current.x + 1, current.y));
      this.#visit(new Coordinates(current.x, current.y - 1));
      this.#visit(new Coordinates(current.x, current.y + 1));
    }
  }

  #initVisited() {
    const width = this.canvas.image.width;
    const height = this.canvas.image.height;
    return Array(width).fill(null).map(() => Array(height).fill(false)); //Create a matrix
  }

  #isColorValid(initial, current) {
    const inRange = (parameterA, parameterB) => {
      if (parameterB < (parameterA - this.tolerance)) return false;
      return parameterB <= (parameterA + this.tolerance);
    };

    return inRange(initial.r, current.r) && inRange(initial.g, current.g) && inRange(initial.b, current.b) &&
      inRange(initial.alpha, current.alpha);
  }

  #visit(pixel) {
    if (pixel.x < 0 || pixel.x >= this.canvas.image.width) return; //Check for overflow
    if (pixel.y < 0 || pixel.y >= this.canvas.image.height) return;
    if (this.#visited[pixel.x][pixel.y]) return; //If a pixel has already been viewed, skip it
    this.#visited[pixel.x][pixel.y] = true; //Mark pixel as already viewed
    this.#queue.push(pixel);
  }

  #fillPixel(pixel) {
    this.canvas.image.setPixelColor(pixel.x, pixel.y, this.getColor());
  }

  getColor() {
    return this.canvas.state.color;
  }
}

function getRealCoordinates(element, absCoordinates) {
  const rect = element.getBoundingClientRect(); //Allows to retrieve offset
  const relative = new Coordinates(absCoordinates.x - rect.left, absCoordinates.y - rect.top);

  const resolution = { width: element.width / element.offsetWidth, height: element.height / element.offsetHeight };
  const curr = new Coordinates(relative.x * resolution.width, relative.y * resolution.height);

  //Check for overflow
  curr.x = Math.min(element.width - 1, curr.x);
  curr.x = Math.max(0, curr.x);
  curr.y = Math.min(element.height - 1, curr.y);
  curr.y = Math.max(0, curr.y);

  return new Coordinates(Math.floor(curr.x), Math.floor(curr.y));
}

export { Pencil, Eraser, BucketFill };
