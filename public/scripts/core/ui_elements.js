import { BmpEncoder, bmpVersions } from '../utilities/bmp_encoder.js';
import {
  bytesToUrl,
  downloadLocalUrl,
  setImageUrl
} from '../utilities/bytes_conversion.js';
import { BucketFill, Eraser, Pencil, Tool } from './tools.js';
import { Color } from '../utilities/color.js';

const HIDE_DISPLAY = 'none';
const SHOW_DISPLAY = 'block';

class VariableDependentButtons {
  constructor() {
    this.buttons = new Map();
  }

  addButton(id, listener) {
    const element = document.getElementById(id);
    const closureListener = (variable) => () => listener(variable);
    this.buttons.set(element, closureListener);
  }

  enableButtons(variable) {
    for (const [element, listener] of this.buttons) {
      element.onclick = listener(variable);
    }
  }
}

class Modal {
  constructor(id) {
    this.element = document.getElementById(id);
  }

  #setUpEvents() {
    window.onclick = (event) => {
      if (event.target === this.element) {
        this.hide();
      }
    };
  }

  show() {
    this.element.style.display = SHOW_DISPLAY;
    this.#setUpEvents();
  }

  hide() {
    this.element.style.display = HIDE_DISPLAY;
  }
}

class StateButtons {
  constructor() {
    this.buttons = new VariableDependentButtons();
    this.buttons.addButton('undo', (canvas) => canvas.undo());
    this.buttons.addButton('redo', (canvas) => canvas.redo());
  }

  refresh(canvas) {
    this.buttons.enableButtons(canvas);
  }
}

const sizeLimit = 250;

class FileMenu {
  constructor(createNewFile) {
    this.createNewFile = createNewFile; //A function passed from the context
    this.buttons = new VariableDependentButtons();
    this.#setUpDependentButtons();

    this.modal = new Modal('file-create-modal');
    this.#setUpCreateButton();
    this.#setUpCreateFinish();
    FileMenu.#setUpLimit();
  }

  refresh(canvas) {
    this.buttons.enableButtons(canvas);
  }

  #setUpDependentButtons() {
    this.buttons.addButton('clear-file', (canvas) => this.#clear(canvas));
    this.buttons.addButton('export-image', (canvas) => {
      FileMenu.#exportImage(canvas);
    });
  }

  #clear(canvas) {
    this.createNewFile(canvas.width, canvas.height);
  }

  static #exportImage(canvas) {
    const image = canvas.getJoinedImage();
    const encoder = new BmpEncoder(bmpVersions.bmp32);
    downloadLocalUrl(bytesToUrl(encoder.encode(image)), 'image.bmp');
  }

  #setUpCreateButton() {
    const createButton = document.getElementById('create-file');
    createButton.onclick = () => this.modal.show();
  }

  #setUpCreateFinish() {
    const createFinishButton = document.getElementById('create-file-final');
    const inRange = (value) => value > 0 && value <= sizeLimit;
    createFinishButton.onclick = () => {
      const inputWidth = document.getElementById('width-input');
      const inputHeight = document.getElementById('height-input');
      if (!inRange(inputWidth.value) || !inRange(inputHeight.value)) {
        throw Error('Size values are illegal');
      }
      this.createNewFile(inputWidth.value, inputHeight.value);
      this.modal.hide();
    };
  }

  static #setUpLimit() {
    const limit = document.getElementById('limit');
    limit.innerText = `Size limit is ${sizeLimit}x${sizeLimit}`;
  }
}

//A wrapper class for tool which defines its display
class ToolInfo {
  constructor(tool, name) {
    this.tool = tool;
    this.name = name;
    this.element = this.#createElement();
  }

  #createElement() {
    const element = document.createElement('div');
    element.id = this.name.toLowerCase();
    element.classList.add('single-tool', 'label-panel', 'main-panel');
    element.appendChild(getTextElement(this.name));
    return element;
  }
}

class Toolbar {
  static #activeClass = 'active-tool';

  constructor() {
    this.toolsInfo = [
      new ToolInfo(new Pencil(), 'Pencil'),
      new ToolInfo(new Eraser(), 'Eraser'),
      new ToolInfo(new BucketFill(), 'Bucket Fill')
    ];
    this.buttons = new VariableDependentButtons();
    this.container = document.getElementById('tools');
    this.#setUpTools();
    this.#setUpColorPicker();
    this.chosen = this.toolsInfo[0];
  }

  refresh(canvas) {
    this.#setChosen(this.chosen, canvas);
    this.buttons.enableButtons(canvas);
  }

  #setUpTools() {
    this.toolsInfo.forEach((toolInfo) => {
      this.container.appendChild(toolInfo.element);
      this.buttons.addButton(toolInfo.element.id, (canvas) => {
        this.#setChosen(toolInfo, canvas);
      });
    });
  }

  #setChosen(toolInfo, canvas) {
    if (this.chosen) {
      this.chosen.tool.disable();
      this.chosen.element.classList.remove(Toolbar.#activeClass);
    }
    this.chosen = toolInfo;
    this.chosen.tool.link(canvas);
    this.chosen.element.classList.add(Toolbar.#activeClass);
  }

  #setUpColorPicker() {
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.id = 'color-picker';

    this.container.appendChild(colorPicker);
    colorPicker.oninput = () => {
      Tool.color = Color.fromHex(colorPicker.value);
    };
  }
}

class LayerBox {
  static #imageCache = new Map();

  constructor(canvas, layerIndex) {
    this.canvas = canvas;
    this.layer = canvas.layers[layerIndex];
    this.element = this.#createElement();
    this.#setUpElementClasses();
    this.#appendLayerImage();
    this.#appendLayerName();
    this.#appendVisibilityButton();
  }

  #createElement() {
    const element = document.createElement('div');
    element.onclick = () => {
      this.canvas.switchLayer(this.layer.id);
    };
    return element;
  }

  #setUpElementClasses() {
    this.element.classList.add('layer');
    if (this.layer.id === this.canvas.drawnId) {
      this.element.classList.add('layer-selected');
    }
  }

  #appendLayerName() {
    const name = getTextElement(this.layer.name);
    name.classList.add('layer-name');
    this.element.appendChild(name);
  }

  #appendVisibilityButton() {
    const button = document.createElement('div');
    this.#setVisibility(button);
    button.onclick = () => {
      this.layer.visible = !this.layer.visible;
      this.canvas.redraw();
      this.#setVisibility(button);
    };
    this.element.appendChild(button);
  }

  #setVisibility(button) {
    button.classList.remove(...button.classList);
    button.classList.add('visibility-button');
    if (!this.layer.visible) {
      button.classList.add('visibility-button-inactive');
    }
  }

  #appendLayerImage() {
    const image = document.createElement('div');
    image.classList.add('layer-image');

    const url = this.#getLayerImageUrl();
    LayerBox.#imageCache.set(this.layer, url);
    setImageUrl(image, url);

    this.element.appendChild(image);
  }

  #getLayerImageUrl() {
    const layer = this.layer;
    const isLayerDrawnOn = this.canvas.drawnId === layer.id;
    const isCached = LayerBox.#imageCache.has(layer);
    if (!isLayerDrawnOn) {
      if (isCached) {
        return LayerBox.#imageCache.get(layer);
      }
    } else if (!isCached) {
      LayerBox.#imageCache.clear();
    }

    const imagePosition = [0, 0];
    const { width, height } = layer;
    const image = layer.context.getImageData(...imagePosition, width, height);

    //Render image with transparency
    const encoder = new BmpEncoder(bmpVersions.bmp32);
    const data = encoder.encode(image);
    return encoder.isLastEncodedTransparent() ? '' : bytesToUrl(data);
  }
}

class LayerMenu {
  constructor() {
    this.container = document.getElementById('layer-container');
    this.buttons = new VariableDependentButtons();
    this.#setUpButtons();
  }

  #setUpButtons() {
    this.buttons.addButton('add-layer', (canvas) => {
      LayerMenu.#addLayer(canvas);
    });
    this.buttons.addButton('remove-layer', (canvas) => {
      LayerMenu.#removeLayer(canvas);
    });
    this.buttons.addButton('move-layer-up', (canvas) => {
      LayerMenu.#moveLayerUp(canvas);
    });
    this.buttons.addButton('move-layer-down', (canvas) => {
      LayerMenu.#moveLayerDown(canvas);
    });
    this.buttons.addButton('merge-layers', (canvas) => {
      LayerMenu.#mergeLayers(canvas);
    });
    this.buttons.addButton('duplicate-layer', (canvas) => {
      LayerMenu.#duplicateLayer(canvas);
    });
  }

  refresh(canvas) {
    this.buttons.enableButtons(canvas);
    this.#updateLayers(canvas);
    this.#setFixationListener(canvas);
  }

  #updateLayers(canvas) {
    this.container.innerHTML = '';

    //Iterate the list in reversed order
    for (let i = canvas.layers.length - 1; i >= 0; i--) {
      const layerBox = new LayerBox(canvas, i);
      this.container.appendChild(layerBox.element);
    }
  }

  #setFixationListener(canvas) {
    canvas.listenToUpdates(() => this.#updateLayers(canvas));
  }

  static #addLayer(canvas) {
    canvas.appendLayer();
  }

  static #removeLayer(canvas) {
    const removedId = canvas.drawnId;
    canvas.removeLayer(removedId);
  }

  static #moveLayerUp(canvas) {
    const movedId = canvas.drawnId;
    canvas.moveLayerUp(movedId);
  }

  static #moveLayerDown(canvas) {
    const movedId = canvas.drawnId;
    canvas.moveLayerDown(movedId);
  }

  static #mergeLayers(canvas) {
    const mergedId = canvas.drawnId;
    const currentIndex = canvas.layers.getIndex(mergedId);
    const bottomLayer = canvas.layers[currentIndex - 1];
    canvas.mergeLayers(mergedId, bottomLayer.id);
  }

  static #duplicateLayer(canvas) {
    const duplicatedId = canvas.drawnId;
    canvas.duplicateLayer(duplicatedId);
  }
}

class ZoomButtons {
  constructor(renderer) {
    this.buttons = new VariableDependentButtons();
    this.buttons.addButton('zoom-in', () => renderer.zoomIn());
    this.buttons.addButton('zoom-out', () => renderer.zoomOut());
  }

  refresh() {
    this.buttons.enableButtons();
  }
}

class ShortcutsMenu {
  constructor(manager) {
    this.manager = manager;
    this.modal = new Modal('shortcuts-modal');
    this.classList = ['white-panel', 'label-panel', 'text-ordinary'];
    this.#setUpButton();
    this.#setUpShortcuts();
  }

  #setUpShortcuts() {
    const container = document.getElementById('shortcuts-table');
    const shortcuts = this.manager.shortcuts;
    for (const [keybinding, shortcut] of shortcuts) {
      const name = this.#getNameElement(shortcut);
      const bindingElement = this.#getBindingElement(keybinding);
      container.appendChild(name);
      container.appendChild(bindingElement);
    }
  }

  #getNameElement(shortcut) {
    const name = document.createElement('div');
    name.classList.add(...this.classList);
    name.innerText = shortcut.name;
    return name;
  }

  #getBindingElement(keybinding) {
    const bindingElement = document.createElement('div');
    bindingElement.classList.add(...this.classList);
    bindingElement.innerText = keybinding;
    return bindingElement;
  }

  #setUpButton() {
    const button = document.getElementById('shortcuts');
    button.onclick = () => {
      this.modal.show();
    };
  }

  refresh() {
  }
}


class FrameMenu {
  constructor() {
    this.buttons = new VariableDependentButtons();
    this.buttons.addButton('add-frame', (file) => file.appendFrame());
    this.buttons.addButton('switch-frame', (file) => {
      const input = document.getElementById('switch-input');
      file.switchFrame(parseInt(input.value));
    });
    this.buttons.addButton('duplicate-frame', (file) => {
      file.duplicateFrame(file.currentId);
    });
  }

  refresh(file) {
    this.buttons.enableButtons(file);
  }
}

class Preview {
  #savedFrames;

  constructor() {
    this.#setUpButtons();
    this.#setUpElements();
    this.encoder = new BmpEncoder(bmpVersions.bmp32);
    this.playing = false;
  }

  #setUpButtons() {
    this.buttons = new VariableDependentButtons();
    this.buttons.addButton('preview-animation', (file) => this.#play(file));
    this.buttons.addButton('stop-animation', () => this.#stop());
  }

  #setUpElements() {
    this.background = document.getElementById('canvas-background');
    this.container = document.getElementById('preview');
  }

  #play(file) {
    this.#showPreview();
    this.playing = true;
    this.#savedFrames = new Map();

    const changeImage = this.#getImageChanger(file.frames);
    changeImage();
  }

  #getImageChanger(frames) {
    let index = 0;
    const changeImage = () => {
      if (!this.playing) return;

      const frame = frames[index];
      this.#setImage(this.#getImageUrl(frame));
      window.setTimeout(changeImage, frame.duration);
      index++;
      if (index >= frames.length) {
        index = 0;
      }
    };
    return changeImage;
  }

  #getImageUrl(frame) {
    let url;
    if (this.#savedFrames.has(frame.id)) {
      url = this.#savedFrames.get(frame.id);
    } else {
      const image = frame.canvas.getJoinedImage();
      const data = this.encoder.encode(image);
      url = this.encoder.isLastEncodedTransparent() ? null : bytesToUrl(data);
    }
    return url;
  }

  #setImage(url) {
    if (url) {
      setImageUrl(this.container, url);
    } else {
      this.container.style.backgroundImage = '';
    }
  }

  #stop() {
    this.playing = false;
    this.#hidePreview();
  }

  #showPreview() {
    this.container.style.display = SHOW_DISPLAY;
    const frontIndex = 1;
    this.background.style.zIndex = frontIndex.toString();
  }

  #hidePreview() {
    this.container.style.display = HIDE_DISPLAY;
    const backIndex = 0;
    this.background.style.zIndex = backIndex.toString();
  }

  refresh(file) {
    this.buttons.enableButtons(file);
  }
}

function getTextElement(text) {
  const textElement = document.createElement('span');
  textElement.innerText = text;
  textElement.classList.add('text');
  return textElement;
}

export {
  StateButtons,
  FileMenu,
  Toolbar,
  LayerMenu,
  ZoomButtons,
  ShortcutsMenu,
  FrameMenu,
  Preview
};
