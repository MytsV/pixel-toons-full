import { CanvasRenderer } from './core/canvas_renderer.js';
import { AnimationFile } from './core/canvas.js';
import {
  FileMenu,
  LayerMenu,
  StateButtons,
  Toolbar,
  ZoomButtonsManager,
  ShortcutsMenu, FrameMenu, Preview
} from './core/ui_elements.js';
import { ShortcutManager } from './core/key_shortcuts.js';
import { GifEncoder, GifFrame } from './utilities/gif_encoder.js';
import * as conv from './utilities/bytes_conversion.js';

const setUpGifExporter = (file) => {
  const button = document.getElementById('gif-export');
  button.onclick = () => {
    const encoder = new GifEncoder();
    const frames = file.frames.map((frame) => GifFrame.from(frame));
    const data = encoder.encode(frames);
    conv.downloadLocalUrl(conv.bytesToUrl(data), 'image.gif');
  };
};

class Application {
  constructor() {
    this.canvasRenderer = new CanvasRenderer();
    this.uiElements = [
      new StateButtons(),
      new FileMenu((width, height) => this.#setNewFile(width, height)),
      new Toolbar(),
      new LayerMenu(),
      new ZoomButtonsManager(this.canvasRenderer),
      new FrameMenu(),
      new Preview(),
    ];
    this.shortcuts = new ShortcutManager();
    this.uiElements.push(new ShortcutsMenu(this.shortcuts));
  }

  #setNewFile(width, height) {
    const file = new AnimationFile(width, height);
    const refresh = () => this.#refreshRenderer(file);
    file.listenToUpdates(refresh);
    setUpGifExporter(file);
    refresh();
  }

  #refreshRenderer(file) {
    this.canvasRenderer.removeCanvases();
    this.canvasRenderer.appendCanvas(file.canvas);
    this.canvasRenderer.setOverlay(file.overlay);
    this.uiElements.forEach((element) => element.refresh(file));
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
