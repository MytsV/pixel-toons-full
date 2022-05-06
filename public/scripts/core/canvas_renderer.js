/*
Set of functions which define how canvas is rendered into HTML.
 */
import { Color } from '../utilities/color.js';

class CanvasRenderer {
  constructor() {
    this.canvasWrapper = document.getElementById('canvas-wrapper');
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
}

function setupColorPicker(canvas) {
  const colorPicker = document.getElementById('color-picker');
  colorPicker.oninput = () => {
    canvas.state.color = Color.fromHex(colorPicker.value);
  };
}

export { CanvasRenderer, setupColorPicker };
