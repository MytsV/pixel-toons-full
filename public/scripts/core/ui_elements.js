import { BmpEncoder, BmpVersions } from '../utilities/bmp_encoder.js';
import * as conv from '../utilities/bytes_conversion.js';
import { BucketFill, Eraser, Pencil, Pointer, Tool } from './tools.js';
import { Color } from '../utilities/color.js';
import { GifEncoder } from '../utilities/gif_encoder.js';

const HIDE_DISPLAY = 'none';
const SHOW_DISPLAY = 'block';
const SHOW_DISPLAY_FLEX = 'flex';

class VariableDependentButtons {
  constructor() {
    this.buttons = new Map();
  }

  addButton(id, listener) {
    const element = document.getElementById(id);
    const closureListener = (variable) => (event) => {
      event.stopPropagation();
      listener(variable);
    };
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

class UiElement {
  constructor() {
    if (new.target === UiElement) {
      throw Error('Abstract class cannot be instantiated');
    }
    this.buttons = new VariableDependentButtons();
  }

  refresh() {
  }
}

export class StateButtons extends UiElement {
  constructor() {
    super();
    this.buttons.addButton('undo', (canvas) => canvas.undo());
    this.buttons.addButton('redo', (canvas) => canvas.redo());
  }

  refresh({ canvas }) {
    this.buttons.enableButtons(canvas);
  }
}

const FILE_SIZE_LIMIT = 250;

export class FileMenu extends UiElement {
  constructor(createNewFile) {
    super();
    this.#setUpDependentButtons();

    this.createNewFile = createNewFile; //A function passed from the context
    this.#setUpCreateButton();
    this.#setUpCreateFinish();
    FileMenu.#setUpLimit();
  }

  refresh({ canvas }) {
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
    const encoder = new BmpEncoder(BmpVersions.BMP_32);
    const data = encoder.encode(image);
    conv.downloadLocalUrl(conv.bytesToUrl(data), 'image.bmp');
  }

  #setUpCreateButton() {
    this.modal = new Modal('file-create-modal');
    const createButton = document.getElementById('create-file');
    createButton.onclick = () => this.modal.show();
  }

  #setUpCreateFinish() {
    const createFinishButton = document.getElementById('create-file-final');
    const inRange = (value) => value > 0 && value <= FILE_SIZE_LIMIT;
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
    limit.innerText = `Size limit is ${FILE_SIZE_LIMIT}x${FILE_SIZE_LIMIT}`;
  }
}

//A wrapper class for tool which defines its display
class ToolInfo {
  constructor(tool, name) {
    this.tool = tool;
    this.name = name;
    this.element = this.#createElement();
    this.options = [];
  }

  #createElement() {
    const element = document.createElement('div');
    element.id = this.name.toLowerCase();
    element.classList.add('single-tool', 'label-panel', 'main-panel');
    element.appendChild(getTextElement(this.name));
    return element;
  }

  addOption(option, listener) {
    option.input.oninput = (event) => listener(event, this.tool);
    this.options.push(option);
  }
}

class ToolOptionRange {
  constructor(name, min, max, step = 1) {
    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.min = min;
    this.input.max = max;
    this.input.step = step;
    this.input.value = min;

    this.name = name;
  }

  getElement() {
    const element = document.createElement('span');
    element.classList.add('tool-option');
    element.appendChild(getTextElement(this.name));
    element.appendChild(this.input);
    return element;
  }
}

export class Toolbar extends UiElement {
  static #activeClass = 'active-tool';

  constructor() {
    super();

    this.toolsInfo = [
      new ToolInfo(new Pencil(), 'Pencil'),
      new ToolInfo(new Eraser(), 'Eraser'),
      new ToolInfo(new BucketFill(), 'Bucket Fill')
    ];
    this.pointer = new Pointer();

    this.container = document.getElementById('tools');
    this.#setUpTools();
    this.#setUpOptions();
    this.#setUpColorPicker();
    this.chosen = this.toolsInfo[0];
  }

  refresh({ canvas }) {
    this.#setChosen(this.chosen, canvas);
    this.buttons.enableButtons(canvas);
    this.#setUpPointer(canvas);
  }

  #setUpTools() {
    this.toolsInfo.forEach((toolInfo) => {
      this.container.appendChild(toolInfo.element);
      this.buttons.addButton(toolInfo.element.id, (canvas) => {
        this.#setChosen(toolInfo, canvas);
      });
    });
  }

  //To be refactored!
  #setUpOptions() {
    const thickMin = 1;
    const thickMax = 10;
    const pencilOption = new ToolOptionRange('Thickness', thickMin, thickMax);
    this.toolsInfo[0].addOption(pencilOption, (event, tool) => {
      tool.thickness = event.target.value;
    });
    const eraserOption = new ToolOptionRange('Thickness', thickMin, thickMax);
    this.toolsInfo[1].addOption(eraserOption, (event, tool) => {
      tool.thickness = event.target.value;
    });
    const bucketOption = new ToolOptionRange('tolerance', 0, 255);
    this.toolsInfo[2].addOption(bucketOption, (event, tool) => {
      tool.tolerance = parseFloat(event.target.value);
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
    this.#enableOptions(toolInfo);
  }

  #enableOptions(toolInfo) {
    const container = document.getElementById('tool-options');
    container.innerHTML = '';
    toolInfo.options.forEach((option) => container.appendChild(option.getElement()));
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

  #setUpPointer(canvas) {
    this.pointer.link(canvas);
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
    conv.setImageUrl(image, url);

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
    const encoder = new BmpEncoder(BmpVersions.BMP_32);
    const data = encoder.encode(image);
    return encoder.isLastEncodedTransparent() ? '' : conv.bytesToUrl(data);
  }
}

export class LayerMenu extends UiElement {
  constructor() {
    super();
    this.#setUpButtons();
    this.container = document.getElementById('layer-container');
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

  refresh({ canvas }) {
    this.buttons.enableButtons(canvas);
    this.#updateLayers(canvas);
    this.#setFixationListener(canvas);
    this.#enableOpacity(canvas);
  }

  #enableOpacity(canvas) {
    this.input = document.getElementById('layer-opacity');
    this.input.oninput = (event) => {
      const id = canvas.drawnId;
      const layer = canvas.layers.byIdentifier(id);
      layer.opacity = parseFloat(event.target.value);
      canvas.redraw();
    };
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

export class ZoomButtonsManager extends UiElement {
  constructor(renderer) {
    super();
    this.buttons.addButton('zoom-in', () => renderer.zoomIn());
    this.buttons.addButton('zoom-out', () => renderer.zoomOut());
  }

  refresh() {
    this.buttons.enableButtons();
  }
}

export class ShortcutsMenu extends UiElement {
  constructor(manager) {
    super();
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
}

const frameDurations = [
  100,
  200,
  300,
  500,
  1000
];

export class FrameBox {
  constructor(file, frameIndex) {
    this.file = file;
    this.frame = file.frames[frameIndex];
    this.frameIndex = frameIndex;
    this.element = this.#createElement();
    this.#setUpElementClasses();
    this.#appendFrameLabel();
    this.#appendFrameImage();
  }

  #createElement() {
    const element =  document.createElement('div');
    element.onclick = () => {
      this.file.switchFrame(this.frame.id);
    };
    return element;
  }

  #setUpElementClasses() {
    this.element.classList.add('frame');
    if (this.frame.id === this.frame.drawnId) {
      this.element.classList.add('frame-selected');
    }
  }

  #appendFrameLabel() {
    const container = document.createElement('div');

    container.classList.add('frame-label');
    const name = getTextElement(this.frameIndex + 1);
    name.classList.add('frame-index');

    container.appendChild(name);
    container.appendChild(this.#getDurationElement());
    this.element.appendChild(container);
  }

  #getDurationElement() {
    const duration = document.createElement('select');
    duration.classList.add('frame-duration', 'text');
    const options = this.#getOptions();
    options.forEach((option) => duration.appendChild(option));
    duration.onclick = (event) => {
      event.stopPropagation();
    };
    duration.onchange = (event) => {
      this.frame.duration = parseInt(event.target.value);
    };
    return duration;
  }

  #getOptions() {
    return frameDurations.map((duration) => {
      const option = document.createElement('option');
      option.value = duration.toString();
      option.innerText = duration + 'ms';
      if (duration === this.frame.duration) {
        option.defaultSelected = true;
      }
      return option;
    });
  }

  #appendFrameImage() {
    const image = document.createElement('div');
    image.classList.add('frame-image');

    const url = this.#getFrameImageUrl();
    conv.setImageUrl(image, url);

    this.element.appendChild(image);
  }

  #getFrameImageUrl() {
    const image = this.frame.canvas.getJoinedImage();
    //Render image with transparency
    const encoder = new BmpEncoder(BmpVersions.BMP_32);
    const data = encoder.encode(image);
    return encoder.isLastEncodedTransparent() ? '' : conv.bytesToUrl(data);
  }
}

export class FrameMenu extends UiElement {
  constructor() {
    super();
    this.#setUpButtons();

    this.label = document.getElementById('frame-label');
    this.container = document.getElementById('frame-container');
    this.footer = document.getElementById('footer');
    this.opacity = document.getElementById('opacity');
    this.#setUpOpacity();
  }

  #setUpButtons() {
    this.buttons.addButton('add-frame', (file) => file.appendFrame());
    this.buttons.addButton('duplicate-frame', (file) => {
      file.duplicateFrame(file.currentId);
    });
    this.buttons.addButton('frame-menu', () => this.#switchContainer());
    this.buttons.addButton('move-frame-up', (file) => {
      file.moveFrameUp(file.currentId);
    });
    this.buttons.addButton('move-frame-down', (file) => {
      file.moveFrameDown(file.currentId);
    });
    this.buttons.addButton('remove-frame', (file) => {
      file.removeFrame(file.currentId);
    });
  }

  #setUpOpacity() {
    this.overlayElement = document.getElementById('canvas-overlay');
    this.opacity.onclick = (event) => {
      event.stopPropagation();
    };
    this.opacity.oninput = () => {
      this.overlayElement.style.opacity = this.opacity.value;
    };
  }

  refresh(file) {
    this.buttons.enableButtons(file);
    FrameMenu.#updateFrames(file);
    this.#refreshLabel(file);
  }

  static #updateFrames(file) {
    const list = document.getElementById('frame-list');
    list.innerHTML = '';

    //Iterate the list in reversed order
    for (let i = 0; i < file.frames.length; i++) {
      const frameBox = new FrameBox(file, i);
      list.appendChild(frameBox.element);
    }
  }

  #refreshLabel(file) {
    const baseLabel = 'Frames';
    const frames = file.frames;

    if (frames.length <= 1) {
      this.label.innerText = baseLabel;
      return;
    }

    const currentPos = frames.getIndex(file.currentId) + 1;
    this.label.innerText = baseLabel + ` (${currentPos}/${frames.length})`;
  }

  #switchContainer() {
    if (this.container.style.display !== HIDE_DISPLAY) this.#hideContainer();
    else this.#showContainer();
  }

  #showContainer() {
    this.container.style.display = SHOW_DISPLAY_FLEX;
    this.footer.style.width = 'calc(100% - 2 * var(--inter-element-spacing))';
    this.footer.style.bottom = 'var(--inter-element-spacing)';
    this.footer.style.position = 'absolute';
  }

  #hideContainer() {
    this.container.style.display = HIDE_DISPLAY;
    this.footer.style.width = '';
    this.footer.style.bottom = '';
    this.footer.style.position = 'relative';
  }
}

export class Preview extends UiElement {
  #savedFrames;

  constructor() {
    super();
    this.#setUpButtons();
    this.#setUpElements();
    this.encoder = new BmpEncoder(BmpVersions.BMP_32);
    this.playing = false;
    this.playButton = document.getElementById('preview-animation');
  }

  #setUpButtons() {
    this.buttons.addButton('preview-menu', (file) => this.#preview(file));
  }

  #setUpElements() {
    this.background = document.getElementById('canvas-background');
    this.container = document.getElementById('preview');
  }

  refresh(file) {
    this.buttons.enableButtons(file);
  }

  #preview(file) {
    if (!this.playing) this.#play(file);
    else this.#stop();
  }

  #play(file) {
    this.#showPreviewElement();
    this.playing = true;
    this.timeouts = [];

    const changeImage = this.#getImageChanger(file.frames);
    changeImage();
  }

  #getImageChanger(frames) {
    let index = 0;
    this.#savedFrames = new Map();

    const changeImage = () => {
      if (!this.playing) {
        return;
      }

      const frame = frames[index];
      this.#setImage(this.#getImageData(frame));
      this.timeouts.push(window.setTimeout(changeImage, frame.duration));
      index++;
      if (index >= frames.length) {
        index = 0;
      }
    };
    return changeImage;
  }

  #getImageData(frame) {
    let data;
    if (this.#savedFrames.has(frame.id)) {
      data = this.#savedFrames.get(frame.id);
    } else {
      const image = frame.canvas.getJoinedImage();
      const encoded = this.encoder.encode(image);
      const isFullyTransparent = this.encoder.isLastEncodedTransparent();
      data = isFullyTransparent ? null : conv.bytesToBase64(encoded);
    }
    return data;
  }

  #stop() {
    this.playing = false;
    this.#setImage(null);
    this.#hidePreviewElement();
    this.timeouts.forEach((id) => window.clearTimeout(id));
  }

  #setImage(url) {
    if (url) {
      conv.setImageBase64(this.container, url);
    } else {
      this.container.style.backgroundImage = '';
    }
  }

  #showPreviewElement() {
    this.container.style.display = SHOW_DISPLAY;
    const frontIndex = 2;
    this.background.style.zIndex = frontIndex.toString();
    this.playButton.classList.remove('play');
    this.playButton.classList.add('stop');
  }

  #hidePreviewElement() {
    this.container.style.display = HIDE_DISPLAY;
    const backIndex = 0;
    this.background.style.zIndex = backIndex.toString();
    this.playButton.classList.remove('stop');
    this.playButton.classList.add('play');
  }
}

function getTextElement(text) {
  const textElement = document.createElement('span');
  textElement.innerText = text;
  textElement.classList.add('text');
  return textElement;
}
