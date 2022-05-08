/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Color } from '../utilities/color.js';
import { BmpEncoder } from '../utilities/bmp_encoder.js';
import { applyImageMixin } from '../utilities/image.js';
import { bytesToUrl } from '../utilities/file_download.js';

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

    const width = canvas.element.width;
    const height = canvas.element.height;

    this.canvasWrapper.style.aspectRatio = width / height;
    this.#setUpElement(canvas.element);
    CanvasRenderer.#setUpBackground(width, height);
  }

  static #setUpBackground(width, height) {
    const image = new ImageData(width, height);
    applyImageMixin(image);

    toBasicBackground(image);

    const encoder = new BmpEncoder(image);

    const url = bytesToUrl(encoder.encode());
    const imageElement = document.getElementById('canvas-background');
    imageElement.style.backgroundImage = `url(${url})`;
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

//Colors for creating a basic grey-white background
const BACKGROUND_COLOR_WHITE = '#ffffff';
const BACKGROUND_COLOR_GREY = '#e3e3e3';

//Function to turn image into a basic grey-white background which indicates transparency
function toBasicBackground(image) {
  for (let i = 0; i < image.height; i++) {
    for (let j = 0; j < image.width; j++) {
      const pixelColor = getClearPixelColor(i, j);
      image.setPixelColor(i, j, Color.fromHex(pixelColor));
    }
  }
}

//Get color of transparent pixel based on its coordinates
function getClearPixelColor(i, j) {
  if (i % 2 !== j % 2) { //The condition makes sure that neighbouring pixels are always of different color
    return BACKGROUND_COLOR_WHITE; //First pixel is always white
  } else {
    return BACKGROUND_COLOR_GREY;
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
