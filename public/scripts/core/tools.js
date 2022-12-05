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

  setPixel(color, { x, y }) {
    for (let i = 0; i < this.thickness; i++) {
      for (let j = 0; j < this.thickness; j++) {
        this.canvas.image.setPixelColor(x + i, y + j, color);
      }
    }
  }

  plotLine(color, src, dest) {
    const plotPoint = ({ x, y }) => this.setPixel(color, { x, y });
    bresenhamLine(dest, src, plotPoint);
  }

  getRealCoords(element, abs) {
    const { width, height, offsetWidth, offsetHeight } = element;

    const rect = element.getBoundingClientRect(); //Allows to retrieve offset
    const rel = new Coordinates(abs.x - rect.left, abs.y - rect.top);

    const ratio = {
      width: width / offsetWidth,
      height: height / offsetHeight
    };
    const curr = new Coordinates(rel.x * ratio.width, rel.y * ratio.height);

    const overflowOff = (this.thickness / 2) | 0;
    const sideOff = this.thickness % 2;
    //Check for overflow
    curr.x = Math.min(width - overflowOff - sideOff, curr.x);
    curr.x = Math.max(overflowOff, curr.x);
    curr.y = Math.min(height - overflowOff - sideOff, curr.y);
    curr.y = Math.max(overflowOff, curr.y);

    return new Coordinates(Math.floor(curr.x), Math.floor(curr.y));
  }
}

/*
Tool which draws simple lines on the canvas
 */
class Pencil extends Tool {
  #lastCoords;
  #drawing;

  constructor() {
    super();
    this.#lastCoords = undefined;
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
    this.#lastCoords = new Coordinates(event.clientX, event.clientY);
    this.#drawing = true;
  }

  //When mouse is pressed and release, we draw one pixel
  #onClick(event) {
    const mouseCoords = new Coordinates(event.clientX, event.clientY);
    const canvasCoords = this.getRealCoords(this.canvas.element, mouseCoords);
    this.setPixel(this.getColor(), this.#center(canvasCoords));
    this.canvas.redraw();
  }

  //When mouse is moved throughout canvas, we leave trail
  #onMouseMove(event) {
    //We don't draw if mouse button is not held pressed
    if (!this.#drawing) return;
    //We don't draw if between last drawn point there is not enough space
    if (!this.#isOffsetValid(event)) return;

    const destAbs = new Coordinates(event.clientX, event.clientY);
    const destReal = this.getRealCoords(this.canvas.element, destAbs);
    const src = this.getRealCoords(this.canvas.element, this.#lastCoords);

    this.plotLine(this.getColor(), this.#center(src), this.#center(destReal));
    this.canvas.redraw();

    this.#lastCoords = destAbs;
  }

  #center(coords) {
    if (this.thickness <= 1) return coords;
    const difference = (this.thickness / 2) | 0;
    const delta = new Coordinates(difference, difference);
    return Coordinates.getDifference(delta, coords);
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
    minOffset -= minOffset * ERROR * this.thickness;

    const dx = event.clientX - this.#lastCoords.x;
    const dy = event.clientY - this.#lastCoords.y;
    return Math.abs(dx) >= minOffset || Math.abs(dy) >= minOffset;
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
    const realCoords = this.getRealCoords(this.canvas.element, mouseCoords);
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
      this.setPixel(this.getColor(), current);

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

export { Tool, Pencil, Eraser, BucketFill };
