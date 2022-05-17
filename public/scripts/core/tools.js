import { Coordinates } from '../utilities/coordinates.js';
import { Color } from '../utilities/color.js';

/*
An abstract class which defines drawing operations.
It is linked with canvas when chosen and must be disabled after the stop of use
 */
class Tool {
  constructor() {
    if (new.target === Tool) {
      throw Error('Abstract class cannot be instantiated');
    } else {
      /*
      For code reuse we create collections of listeners.
      The key is the event name corresponding to Web API event.
      listenersCanvas are assigned to <canvas> element
      listenersDocument are assigned to whole document
       */
      this.listenersCanvas = new Map();
      this.listenersDocument = new Map();
    }
  }

  link(canvas) {
    this.canvas = canvas;
    this.setEvents();
  }

  //A method which will subscribe to events in web browser
  setEvents() {
    this.#iterateListeners((element, [key, listener]) => {
      element.addEventListener(key, listener);
    });
  }

  //Unsubscribing from events when the tool is not used
  disable() {
    this.#iterateListeners((element, [key, listener]) => {
      element.removeEventListener(key, listener);
    });
    this.canvas = null;
  }

  #iterateListeners(updateEvent) {
    const listenersWithElement = [
      [this.listenersDocument, document],
      [this.listenersCanvas, this.canvas.element]
    ];
    for (const [listeners, element] of listenersWithElement) {
      for (const listenerEntry of listeners.entries()) {
        updateEvent(element, listenerEntry);
      }
    }
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
    //To achieve less arguments for functions we assign mixins to canvas
    const mixin = {
      drawPoint,
      plotLine
    };
    Object.assign(canvas, mixin);
  }

  setEvents() {
    const { listenersCanvas, listenersDocument } = this;

    listenersCanvas.set('mousedown', (event) => this.#onMouseDown(event));
    listenersCanvas.set('click', (event) => this.#onClick(event));
    listenersDocument.set('mouseup', () => this.#onMouseUp());
    listenersDocument.set('mousemove', (event) => this.#onMouseMove(event));

    super.setEvents();
  }

  //When mouse button is initially pressed, we start drawing
  #onMouseDown(event) {
    this.#lastCoordinates = new Coordinates(event.clientX, event.clientY);
    this.#drawing = true;
  }

  //When mouse is pressed and release, we draw one pixel
  #onClick(event) {
    const mouseCoords = new Coordinates(event.clientX, event.clientY);
    const canvasCoords = getRealCoordinates(this.canvas.element, mouseCoords);
    this.canvas.drawPoint(this.getColor(), canvasCoords);
    this.canvas.redraw();
  }

  //When mouse is moved throughout canvas, we leave trail
  #onMouseMove(event) {
    //We don't draw if mouse button is not held pressed
    if (!this.#drawing) return;
    //We don't draw if between last drawn point there is not enough space
    if (!this.#isOffsetValid(event)) return;

    const dest = new Coordinates(event.clientX, event.clientY);
    this.canvas.plotLine(this.getColor(), this.#lastCoordinates, dest);
    this.canvas.redraw();

    this.#lastCoordinates = dest;
  }

  #onMouseUp() {
    if (this.#drawing) {
      this.canvas.save();
    }
    this.#drawing = false;
  }

  //Is there enough distance between last and current point of drawing
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
  const plotPoint = ({ x, y }) => this.drawPoint(color, { x, y });
  bresenhamLine(destReal, srcReal, plotPoint);
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
Antialiasing is not suited for the application.
Instead of native lineTo() function we use Bresenham's algorithm to draw a line.

Refer to this link for implementation details:
https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
 */
function bresenhamLine(src, dest, plotPoint) {
  const diff = Coordinates.getDifference(src, dest);
  const signX = Math.sign(diff.x);
  const signY = Math.sign(diff.y);
  diff.x = Math.abs(diff.x);
  diff.y = -Math.abs(diff.y);

  //Error allows us to perform all octant drawing
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

  link(canvas) {
    super.link(canvas);
    const mixin = {
      drawPoint,
    };
    Object.assign(canvas, mixin);
  }

  setEvents() {
    this.listenersCanvas.set('click', (event) => this.#onClick(event));
    super.setEvents();
  }

  #onClick(event) {
    const mouseCoords = new Coordinates(event.clientX, event.clientY);
    const realCoords = getRealCoordinates(this.canvas.element, mouseCoords);
    this.#floodFill(realCoords);
    this.canvas.redraw();
    this.canvas.save();
  }

  #floodFill(initial) {
    const image = this.canvas.image;
    const initialColor = image.getPixelColor(initial.x, initial.y);

    this.#queue = [];
    this.#visited = this.#initVisited();
    this.#visit(initial); //Initiate queue with first element

    while (this.#queue.length !== 0) {
      const current = this.#queue.shift();
      const currentColor = image.getPixelColor(current.x, current.y);
      if (!this.#isColorValid(initialColor, currentColor)) continue;
      this.canvas.drawPoint(this.getColor(), current);

      this.#visit(new Coordinates(current.x - 1, current.y));
      this.#visit(new Coordinates(current.x + 1, current.y));
      this.#visit(new Coordinates(current.x, current.y - 1));
      this.#visit(new Coordinates(current.x, current.y + 1));
    }
  }

  #initVisited() {
    const width = this.canvas.image.width;
    const height = this.canvas.image.height;
    //Create a matrix
    return Array(width).fill(null).map(() => Array(height).fill(false));
  }

  #isColorValid(initial, current) {
    const inRange = (parameterA, parameterB) => {
      if (parameterB < (parameterA - this.tolerance)) return false;
      return parameterB <= (parameterA + this.tolerance);
    };

    return inRange(initial.r, current.r) && inRange(initial.g, current.g) &&
      inRange(initial.b, current.b) && inRange(initial.alpha, current.alpha);
  }

  #visit(pixel) {
    //Check for overflow
    if (pixel.x < 0 || pixel.x >= this.canvas.image.width) return;
    if (pixel.y < 0 || pixel.y >= this.canvas.image.height) return;
    //If a pixel has already been viewed, skip it
    if (this.#visited[pixel.x][pixel.y]) return;
    //Mark pixel as already viewed
    this.#visited[pixel.x][pixel.y] = true;
    this.#queue.push(pixel);
  }

  getColor() {
    return this.canvas.state.color;
  }
}

function drawPoint(color, { x, y }) {
  this.image.setPixelColor(x, y, color);
}

function getRealCoordinates(element, absCoords) {
  const { width, height, offsetWidth, offsetHeight } = element;

  const rect = element.getBoundingClientRect(); //Allows to retrieve offset
  const rel = new Coordinates(absCoords.x - rect.left, absCoords.y - rect.top);

  const ratio = {
    width: width / offsetWidth,
    height: height / offsetHeight
  };
  const curr = new Coordinates(rel.x * ratio.width, rel.y * ratio.height);

  //Check for overflow
  curr.x = Math.min(width - 1, curr.x);
  curr.x = Math.max(0, curr.x);
  curr.y = Math.min(width - 1, curr.y);
  curr.y = Math.max(0, curr.y);

  return new Coordinates(Math.floor(curr.x), Math.floor(curr.y));
}

export { Pencil, Eraser, BucketFill };
