import { Coordinates } from '../utilities/coordinates.js';
import { Color } from '../utilities/color.js';

const DEFAULT_PENCIL_COLOR = '#000000';
const DEFAULT_THICKNESS = 1;

/*
An abstract class which defines drawing operations.
It is linked with canvas when chosen and must be disabled after the stop of use
 */
class Tool {
  static color = Color.fromHex(DEFAULT_PENCIL_COLOR);

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
      this.thickness = DEFAULT_THICKNESS;
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
    if (!this.canvas) return;
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

  //Makes the class open to extensions
  getColor() {
    return Tool.color;
  }

  _drawPoint(color, { x, y }) {
    for (let i = 0; i < this.thickness; i++) {
      for (let j = 0; j < this.thickness; j++) {
        this.canvas.image.setPixelColor(x + i, y + j, color);
      }
    }
  }

  _plotLine(color, src, dest) {
    const plotPoint = ({ x, y }) => this._drawPoint(color, { x, y });
    bresenhamLine(dest, src, plotPoint);
  }

  _toRealCoords(element, abs) {
    const rect = element.getBoundingClientRect(); //Allows to retrieve offset
    const rel = new Coordinates(abs.x - rect.left, abs.y - rect.top);

    const ratio = Tool.#getRatio(element);
    const curr = new Coordinates(rel.x * ratio.width, rel.y * ratio.height);

    const overflowOff = (this.thickness / 2) | 0;
    const sideOff = this.thickness % 2;
    //Check for overflow
    curr.x = Math.min(element.width - overflowOff - sideOff, curr.x);
    curr.x = Math.max(overflowOff, curr.x);
    curr.y = Math.min(element.height - overflowOff - sideOff, curr.y);
    curr.y = Math.max(overflowOff, curr.y);

    return new Coordinates(Math.floor(curr.x), Math.floor(curr.y));
  }

  _toAbsCoords(element, real) {
    const ratio = Tool.#getRatio(element);
    const curr = new Coordinates(real.x / ratio.width, real.y / ratio.height);
    const rect = element.getBoundingClientRect();
    return new Coordinates(curr.x + rect.left, curr.y + rect.top);
  }

  static #getRatio(element) {
    const { width, height, offsetWidth, offsetHeight } = element;
    return {
      width: width / offsetWidth,
      height: height / offsetHeight
    };
  }
}

class PointedTool extends Tool {
  _lastCoords;

  constructor() {
    super();
    if (new.target === PointedTool) {
      throw Error('Abstract class cannot be instantiated');
    }
  }

  //Is there enough distance between last and current point of drawing
  _isOffsetValid(event) {
    const canvasElement = this.canvas.element;
    let minOffset = canvasElement.offsetWidth / canvasElement.width;

    //We decrease minimal offset to make drawing more smooth
    const ERROR = 0.5;
    minOffset -= minOffset * ERROR * this.thickness;

    const dx = event.clientX - this._lastCoords.x;
    const dy = event.clientY - this._lastCoords.y;
    return Math.sqrt(dx * dx + dy * dy) >= minOffset;
  }

  _center(coords) {
    if (this.thickness <= 1) return coords;
    const difference = (this.thickness / 2) | 0;
    const delta = new Coordinates(difference, difference);
    return Coordinates.getDifference(delta, coords);
  }
}

/*
Tool which draws simple lines on the canvas
 */
class Pencil extends PointedTool {
  #drawing;

  constructor() {
    super();
    this.#drawing = false;
  }

  link(canvas) {
    super.link(canvas);
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
    this._lastCoords = new Coordinates(event.clientX, event.clientY);
    this.#drawing = true;
  }

  //When mouse is pressed and release, we draw one pixel
  #onClick(event) {
    const mouseCoords = new Coordinates(event.clientX, event.clientY);
    const canvasCoords = this._toRealCoords(this.canvas.element, mouseCoords);
    this._drawPoint(this.getColor(), this._center(canvasCoords));
    this.canvas.redraw();
  }

  //When mouse is moved throughout canvas, we leave trail
  #onMouseMove(event) {
    //We don't draw if mouse button is not held pressed
    if (!this.#drawing) return;
    //We don't draw if between last drawn point there is not enough space
    if (!this._isOffsetValid(event)) return;

    const destAbs = new Coordinates(event.clientX, event.clientY);
    const destReal = this._toRealCoords(this.canvas.element, destAbs);
    const src = this._toRealCoords(this.canvas.element, this._lastCoords);

    this._plotLine(this.getColor(), this._center(src), this._center(destReal));
    this.canvas.redraw();

    this._lastCoords = destAbs;
  }

  #onMouseUp() {
    if (this.#drawing) {
      this.canvas.save();
    }
    this.#drawing = false;
  }
}

/*
Tool which turns canvas pixels fully transparent
 */
class Eraser extends Pencil {
  getColor() {
    return Color.fromHex('#00000000');
  }
}

class Pointer extends PointedTool {
  constructor() {
    super();
    this.pointerElement = document.getElementById('canvas-pointer');
    this.cleared = true;
  }

  link(canvas) {
    super.link(canvas);
    this.pointerElement.width = canvas.width;
    this.pointerElement.height = canvas.height;
  }

  setEvents() {
    const { listenersDocument } = this;
    listenersDocument.set('mousemove', (event) => this.#onMouseMove(event));
    super.setEvents();
  }

  #onMouseMove(event) {
    if (event.target !== this.canvas.element) {
      if (!this.cleared) {
        this.cleared = true;
        const context = this.pointerElement.getContext('2d');
        context.fillStyle = '#00000000';
        context.globalCompositeOperation = 'copy';
        context.fillRect(0, 0, this.thickness, this.thickness);
      }
      return;
    }
    if (this._lastCoords && !this._isOffsetValid(event)) return;
    this.cleared = false;

    const destAbs = new Coordinates(event.clientX, event.clientY);
    const destReal = this._toRealCoords(this.pointerElement, destAbs);

    const context = this.pointerElement.getContext('2d');
    context.fillStyle = this.getColor().toString();
    context.globalCompositeOperation = 'copy';
    const coords = this._center(destReal);
    context.fillRect(coords.x, coords.y, this.thickness, this.thickness);

    this._lastCoords = this._toAbsCoords(this.canvas.element, this._center(destReal));
  }

  getColor() {
    return new Color(0, 0, 0, 60);
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
  }

  setEvents() {
    this.listenersCanvas.set('click', (event) => this.#onClick(event));
    super.setEvents();
  }

  #onClick(event) {
    const mouseCoords = new Coordinates(event.clientX, event.clientY);
    const realCoords = this._toRealCoords(this.canvas.element, mouseCoords);
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
      this._drawPoint(this.getColor(), current);

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
    return Tool.color;
  }
}

export { Tool, Pencil, Eraser, BucketFill, Pointer };
