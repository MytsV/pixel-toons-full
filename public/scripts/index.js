import { CanvasRenderer } from './core/canvas_renderer.js';
import { AnimationFile } from './core/canvas.js';
import {
  FileMenu,
  LayerMenu,
  StateButtons,
  Toolbar,
  ZoomButtons,
  ShortcutsMenu, FrameMenu
} from './core/ui_elements.js';
import { ShortcutManager } from './core/key_shortcuts.js';

class Application {
  constructor() {
    this.canvasRenderer = new CanvasRenderer();
    this.uiElements = [
      new StateButtons(),
      new FileMenu((width, height) => this.#setNewFile(width, height)),
      new Toolbar(),
      new LayerMenu(),
      new ZoomButtons(this.canvasRenderer),
    ];
    this.frameMenu = new FrameMenu();
    this.shortcuts = new ShortcutManager();
    this.uiElements.push(new ShortcutsMenu(this.shortcuts));
  }

  #setNewFile(width, height) {
    const file = new AnimationFile(width, height);
    this.frameMenu.refresh(file);
    const refresh = () => this.#refreshRenderer(file.canvas);
    refresh();
    file.listenToUpdates(refresh);
  }

  #refreshRenderer(canvas) {
    this.canvasRenderer.removeCanvases();
    this.canvasRenderer.appendCanvas(canvas);
    this.uiElements.forEach((element) => element.refresh(canvas));
  }

  start() {
    this.shortcuts.enable();
    window.onresize = () => this.canvasRenderer.adjustSize();
  }
}

window.onload = () => {
  const application = new Application();
  application.start();
};
