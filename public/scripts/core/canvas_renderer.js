/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Color } from '../utilities/color.js';

/*
Constants associated with zoom system
 */

const ZOOM_MAX = 5;
const ZOOM_MIN = 1;
const ZOOM_STEP = 1;

const TRANSLATION = 50;

/*
A class for managing graphic representation of canvas
 */
class CanvasRenderer {
  constructor() {
    this.canvasWrapper = document.getElementById('canvas-wrapper');
    this.zoomValue = 1;
  }

  appendCanvas(canvas) {
    canvas.element.oncontextmenu = () => false; //Disable right click context menu on canvas
    this.#setUpElement(canvas.element);
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

  zoom(positive) {
    if (!this.#canScale(positive)) return;

    this.zoomValue = positive ? this.zoomValue + ZOOM_STEP : this.zoomValue - ZOOM_STEP;
    this.canvasWrapper.style.height = `${this.zoomValue * 100}%`;

    //If canvas is zoomed, than we don't center the canvas
    handleCentering(this.canvasWrapper, this.zoomValue <= 1);
  }

  #canScale(positive) {
    if (positive) {
      return this.zoomValue <= ZOOM_MAX;
    } else {
      return this.zoomValue > ZOOM_MIN;
    }
  }
}

function handleCentering(element, centered) {
  element.style.transform = centered ? `translate(-${TRANSLATION}%, -${TRANSLATION}%)` : 'none';
  element.style.left = centered ? `${TRANSLATION}%` : '0pt';
  element.style.top = centered ? `${TRANSLATION}%` : '0pt';
}

function setupColorPicker(canvas) {
  const colorPicker = document.getElementById('color-picker'); //Input element with type "color"
  colorPicker.oninput = () => {
    canvas.state.color = Color.fromHex(colorPicker.value);
  };
}

export { CanvasRenderer, setupColorPicker };
