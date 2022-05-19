import { CanvasRenderer } from './core/canvas_renderer.js';
import { AnimationFile } from './core/canvas.js';
import {
  FileMenu,
  LayerMenu,
  StateButtons,
  Toolbar
} from './core/ui_elements.js';
import { Shortcuts } from './core/key_shortcuts.js';

let file;
const renderer = new CanvasRenderer();
let elements = [];

window.onload = () => {
  elements = [
    new StateButtons(),
    new FileMenu(createNewFile),
    new Toolbar(),
    new LayerMenu()
  ];
  const shortcuts = new Shortcuts();
  shortcuts.enable();
};

function createNewFile(width, height) {
  file = new AnimationFile(width, height);

  renderer.removeCanvases();
  renderer.appendCanvas(file.canvas);

  elements.forEach((element) => element.refresh(file));
}

/*
Handling of zoom
 */

const zoomCodes = {
  '+': true,
  '=': true,
  '-': false,
  '_': false
};

document.addEventListener('keypress', (event) => {
  if (Object.keys(zoomCodes).includes(event.key)) {
    if (zoomCodes[event.key]) {
      renderer.zoomIn();
    } else {
      renderer.zoomOut();
    }
  }
});

window.addEventListener('resize', () => renderer.adjustSize());
