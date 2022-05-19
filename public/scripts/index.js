import { CanvasRenderer } from './core/canvas_renderer.js';
import { AnimationFile } from './core/canvas.js';
import {
  FileMenu,
  LayerMenu,
  StateButtons,
  Toolbar, ZoomButtons
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
    new LayerMenu(),
    new ZoomButtons(renderer)
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

window.addEventListener('resize', () => renderer.adjustSize());
