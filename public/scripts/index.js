import { CanvasRenderer } from './core/canvas_renderer.js';
import { AnimationFile } from './core/canvas.js';
import {
  FileMenu,
  LayerMenu,
  StateButtons,
  Toolbar,
  ZoomButtons,
  ShortcutsMenu, FrameMenu, Preview
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
    this.preview = new Preview();
    this.shortcuts = new ShortcutManager();
    this.uiElements.push(new ShortcutsMenu(this.shortcuts));
  }

  #setNewFile(width, height) {
    const file = new AnimationFile(width, height);
    const refresh = () => this.#refreshRenderer(file);
    file.listenToUpdates(refresh);
    refresh();
  }

  #refreshRenderer(file) {
    this.canvasRenderer.removeCanvases();
    this.canvasRenderer.appendCanvas(file.canvas);
    this.canvasRenderer.setOverlay(file.overlay);
    this.uiElements.forEach((element) => element.refresh(file.canvas));
    this.frameMenu.refresh(file);
    this.preview.refresh(file);
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
