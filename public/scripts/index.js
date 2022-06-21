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
import { PxtDecoder, PxtEncoder } from './utilities/pxt.js';

const setUpGifExporter = (file) => {
  const button = document.getElementById('gif-export');
  button.onclick = () => {
    const encoder = new GifEncoder();
    const frames = file.frames.map((frame) => GifFrame.from(frame));
    const data = encoder.encode(frames);
    conv.downloadLocalUrl(conv.bytesToUrl(data), 'image.gif');
  };
};

const setUpSaver = (file) => {
  const button = document.getElementById('file-save');
  button.onclick = () => {
    const encoder = new PxtEncoder();
    const data = encoder.encode(file);
    const decoder = new PxtDecoder();
    decoder.decode(data);
    conv.downloadLocalUrl(conv.bytesToUrl(data), 'image.pxt');
  };
};

const setUpOpener = (openFile) => {
  const button = document.getElementById('file-open');
  button.oninput = () => {
    const reader = new FileReader();
    reader.onload = function() {
      const arrayBuffer = this.result;
      const array = new Uint8Array(arrayBuffer);

      const file = new PxtDecoder().decode(array);
      openFile(file);
    };
    reader.readAsArrayBuffer(button.files[0]);
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
    setUpOpener((file) => this.#openFile(file));
  }

  #setNewFile(width, height) {
    const file = new AnimationFile(width, height);
    const refresh = () => this.#refreshRenderer(file);
    file.listenToUpdates(refresh);
    setUpGifExporter(file);
    setUpSaver(file);
    refresh();
  }

  #openFile(file) {
    const refresh = () => this.#refreshRenderer(file);
    file.listenToUpdates(refresh);
    setUpGifExporter(file);
    setUpSaver(file);
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
