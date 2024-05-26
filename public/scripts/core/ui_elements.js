import { BmpEncoder, BmpVersions } from '../utilities/bmp_encoder.js';
import * as conv from '../utilities/bytes_conversion.js';
import {
  BucketFill,
  Eraser,
  Line,
  Pencil,
  Pipette,
  Pointer,
  Tool
} from './tools.js';
import { Color } from '../utilities/color.js';
import { PxtDecoder, PxtEncoder } from '../utilities/pxt.js';
import { GifEncoder, GifFrame } from '../utilities/gif_encoder.js';
import { flip, FlipModes, scale } from '../utilities/image.js';

const HIDE_DISPLAY = 'none';
const SHOW_DISPLAY = 'block';

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

class DropDownPopup {
  constructor(elements) {
    this.items = elements;
  }

  enable(x, y) {
    this.element = document.createElement('div');
    this.element.classList.add('drop-down-menu');
    for (const [key, value] of Object.entries(this.items)) {
      const item = document.createElement('div');
      item.classList.add('drop-down-item', 'text', 'button');
      item.innerText = key;
      item.onclick = () => {
        value();
        this.disable();
      };
      this.element.appendChild(item);
    }

    const offsetSide = 20;
    document.body.appendChild(this.element);

    const left = x - offsetSide;
    const top = y;
    this.element.style.position = 'absolute';
    this.element.style.left = left + 'px';
    this.element.style.top = top + 'px';

    this.element.onmouseleave = () => this.disable();
  }

  disable() {
    document.body.removeChild(this.element);
    this.element.onmouseleave = undefined;
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
const IMAGE_SIZE_LIMIT = 2000;

export class FileMenu extends UiElement {
  constructor(createNewFile, openFile) {
    super();
    this.#setUpDependentButtons();

    this.createNewFile = createNewFile; //A function passed from the context
    this.openFile = openFile;
    this.#setUpNewButton();
    this.#setUpCreateFinish();
    FileMenu.#setUpLimit();
  }

  refresh(file) {
    this.buttons.enableButtons(file);
    this.#setUpNewButton(file);
    this.#setUpEditButton(file);
    this.#setUpSlider(file.canvas);
  }

  #setUpDependentButtons() {
    this.buttons.addButton('export-image', () => {
      FileMenu.#exportImage();
    });
    this.buttons.addButton('export-to-bmp', ({ canvas }) => {
      const image = scale(canvas.getJoinedImage(), FileMenu.#getEnlargement());
      const encoder = new BmpEncoder(BmpVersions.BMP_32);
      const data = encoder.encode(image);
      conv.downloadLocalUrl(conv.bytesToUrl(data), 'image.bmp');
    });
    this.buttons.addButton('export-to-gif', (file) => {
      const encoder = new GifEncoder();
      const scale = FileMenu.#getEnlargement();
      const frames = file.frames.map((frame) => GifFrame.from(frame, scale));
      const data = encoder.encode(frames);
      conv.downloadLocalUrl(conv.bytesToUrl(data), 'image.gif');
    });
  }

  static #setUpSlider(canvas) {
    const slider = document.getElementById('enlarge-slider');
    const title = document.getElementById('enlarge-text');
    title.innerText = `Enlarge: 1x ${canvas.width}x${canvas.height}`;
    slider.value = 1;
    slider.oninput = () => {
      const val = parseInt(slider.value);
      const { width, height } = canvas;
      title.innerText = `Enlarge: ${val}x ${val * width}x${val * height}`;
    };
    slider.max = (IMAGE_SIZE_LIMIT / Math.max(canvas.width, canvas.height)) | 0;
  }

  static #getEnlargement() {
    const slider = document.getElementById('enlarge-slider');
    return parseInt(slider.value);
  }

  #clear(canvas) {
    this.createNewFile(canvas.width, canvas.height);
  }

  static #exportImage() {
    const modal = new Modal('file-export-modal');
    modal.show();
  }

  #setUpNewButton(file) {
    this.modal = new Modal('file-create-modal');
    const elements = {
      'New': () => this.modal.show(),
      'Open': () => this.#onOpen(),
      'Save': () => {
        const encoder = new PxtEncoder();
        const data = encoder.encode(file);
        const decoder = new PxtDecoder();
        decoder.decode(data);
        conv.downloadLocalUrl(conv.bytesToUrl(data), 'image.pxt');
      },
      'Clear': () => this.#clear(file.canvas),
    };
    const button = document.getElementById('create-file');
    const dropdown = new DropDownPopup(elements);
    button.onclick = (event) => {
      dropdown.enable(event.clientX, event.clientY);
    };
  }

  static #setUpEditButton({ canvas }) {
    const elements = {
      'Flip Horizontal': () => {
        const flipped = flip(canvas.image);
        canvas.image.data.set(flipped.data);
        canvas.redraw();
        canvas.save();
      },
      'Flip Vertical': () => {
        const flipped = flip(canvas.image, FlipModes.VERTICAL);
        canvas.image.data.set(flipped.data);
        canvas.redraw();
        canvas.save();
      }
    };
    const button = document.getElementById('edit-file');
    const dropdown = new DropDownPopup(elements);
    button.onclick = (event) => {
      dropdown.enable(event.clientX, event.clientY);
    };
  }

  #onOpen() {
    const openFile = this.openFile;
    const button = document.createElement('input');
    button.type = 'file';
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
    document.body.appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { view: window }));
    document.body.removeChild(button);
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
    element.classList.add('single-tool');
    this.#setImage();
    element.appendChild(this.image);
    return element;
  }

  #setImage() {
    this.image = document.createElement('img');
    this.image.classList.add('tool-image');
    this.disable();
  }

  enable() {
    const imageName = this.name.toLowerCase();
    this.image.src = `./images/${imageName}-active.png`;
  }

  disable() {
    const imageName = this.name.toLowerCase();
    this.image.src = `./images/${imageName}.png`;
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
    this.input.step = step.toString();
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
  constructor() {
    super();

    this.toolsInfo = [
      new ToolInfo(new Pencil(), 'Pencil'),
      new ToolInfo(new Eraser(), 'Eraser'),
      new ToolInfo(new BucketFill(), 'Bucket Fill'),
      new ToolInfo(new Pipette(), 'Pipette'),
      new ToolInfo(new Line(), 'Line')
    ];
    this.pointer = new Pointer();

    this.container = document.getElementById('tools');
    this.#setUpTools();
    this.#setUpOptions();
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
      this.chosen.disable();
    }
    this.chosen = toolInfo;
    this.chosen.tool.link(canvas);
    this.chosen.enable();
    //this.#enableOptions(toolInfo);
  }

  #setUpPointer(canvas) {
    this.pointer.link(canvas);
  }
}

const HUE_MAX = 360;
const SL_MAX = 100;
const PADDING_WHEEL = 10;

const inRadius = 150;
const outRadius = 200;

export class ColorPicker {
  constructor() {
    this.wheel = document.getElementById('wheel-canvas');
    this.triangle = document.getElementById('triangle-canvas');
    this.colorDisplay = document.getElementById('color-chosen');
    this.hue = HUE_MAX;
    this.saturation = 1;
    this.lightness = 0.5;
    this.#drawWheel();
    this.#drawTriangle();
    this.#setTrianglePos();
    updateColorDisplay();
    this.colorDisplay.onclick = () => {
      const hex = window.prompt('Enter color', Tool.color.toHex());
      Tool.color = Color.fromHex(hex);
      updateColorDisplay();
    };
  }

  #drawWheel() {
    const size = outRadius * 2;
    this.wheel.width = this.wheel.height = size;
    const ctx = this.wheel.getContext('2d');
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = i - size / 2;
        const y = size / 2 - j;
        const length = Math.sqrt(x * x + y * y);
        if (length < inRadius || length > outRadius) continue;
        ctx.fillStyle = this.#getWheelColor(x, y).toString();
        ctx.fillRect(i, j, 1, 1);
      }
    }
    this.wheel.onmousedown = (event) => {
      this.#pickHue(event);
    };
    this.wheel.onmousemove = (event) => {
      if (!this.wheelMoving) return;
      this.#pickHue(event);
    };
    document.body.addEventListener('mouseup', () => {
      this.triangleMoving = false;
      if (!this.wheelMoving) return;
      this.#drawTriangle();
      this.wheelMoving = false;
    });
  }

  #getWheelColor(x, y) {
    this.hue = ColorPicker.#getAngle(x, y);
    return Color.fromHsl(this.hue, this.saturation, this.lightness);
  }

  static #getAngle(x, y) {
    let angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (angle < 0) {
      angle = Math.abs(angle);
    } else {
      angle = HUE_MAX - angle;
    }
    return angle;
  }

  #setTrianglePos() {
    const wheelWidth = this.wheel.offsetWidth;
    const inWidth = inRadius * wheelWidth / outRadius;
    const triangleWidth = inWidth * this.triangle.width / (inRadius * 2);
    const realTopOffset = (wheelWidth - inWidth) / 2;
    this.triangle.style.width = `${triangleWidth - PADDING_WHEEL}px`;
    this.triangle.style.top = `${realTopOffset + PADDING_WHEEL / 2}px`;
  }

  #drawTriangle() {
    const width = inRadius * 3 / Math.sqrt(3);
    this.triangle.width = width;
    this.triangle.height = width * Math.sqrt(3) / 2;
    const stepX = this.triangle.width / SL_MAX;
    const stepY = this.triangle.height / SL_MAX;
    const xCenter = this.triangle.width / 2;
    const ctx = this.triangle.getContext('2d');
    for (let i = 0; i < this.triangle.width; i++) {
      for (let j = 0; j < this.triangle.height; j++) {
        const offset = j * 2 / Math.sqrt(3) / 2;
        if (i >= xCenter - offset && i <= xCenter + offset) {
          const saturation = i / stepX;
          const lightness = j / stepY;
          ctx.fillStyle = `hsl(${this.hue}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(i, j, 1, 1);
        }
      }
    }
  }

  #pickHue(event) {
    let { x, y } = ColorPicker.#getRelativeCoordinates(event, this.wheel);
    x *= outRadius * 2 / this.wheel.offsetWidth;
    y *= outRadius * 2 / this.wheel.offsetWidth;
    x -= outRadius;
    y = outRadius - y;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < inRadius) {
      if (!this.wheelMoving) {
        this.triangleMoving = true;
        this.wheelMoving = true;
      }
      this.#pickSL(event);
      return;
    } else if (dist > outRadius) { return; }
    if (this.triangleMoving) return;
    this.wheelMoving = true;
    Tool.color = this.#getWheelColor(x, y);
    updateColorDisplay();
  }

  #pickSL(event) {
    if (!this.triangleMoving) return;
    const { x, y } = ColorPicker.#getRelativeCoordinates(event, this.triangle);
    const stepX = this.triangle.offsetWidth / SL_MAX;
    const stepY = this.triangle.offsetHeight / SL_MAX;
    const xCenter = this.triangle.offsetWidth / 2;
    const offset = y * 2 / Math.sqrt(3) / 2;
    if (x < xCenter - offset || x > xCenter + offset) return;
    const saturation = x / stepX / SL_MAX;
    const lightness = y / stepY / SL_MAX;
    try {
      Tool.color = Color.fromHsl(this.hue, saturation, lightness);
      this.saturation = saturation;
      this.lightness = lightness;
      updateColorDisplay();
    } catch (e) {
      //It's okay, don't display error
    }
  }

  static #getRelativeCoordinates(event, element) {
    const rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
}

export class Palette {
  constructor() {
    this.colors = [];
    this.container = document.getElementById('palette-container');
    this.addButton = document.getElementById('palette-add');
    this.addButton.onclick = () => this.#addColor();
  }

  #updatePalette() {
    this.container.innerHTML = '';
    for (const color of this.colors) {
      this.container.appendChild(Palette.#createColorElement(color));
    }
  }

  static #createColorElement(color) {
    const element = document.createElement('div');
    element.classList.add('palette-color');
    element.style.backgroundColor = color.toString();
    element.onclick = () => Palette.#selectColor(color);
    return element;
  }

  #addColor() {
    this.colors.push(Tool.color);
    this.#updatePalette();
  }

  static #selectColor(color) {
    Tool.color = color;
    updateColorDisplay();
  }
}

export function updateColorDisplay() {
  const colorDisplay = document.getElementById('color-chosen');
  colorDisplay.style.backgroundColor = Tool.color.toString();
  colorDisplay.innerText = Tool.color.toHex();
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

class RangePopup {
  constructor(min, max, name) {
    this.name = name;
    this.#setUpInput(min, max);
    this.#setUpElement();
  }

  #setUpInput(min, max) {
    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.min = min;
    this.input.max = max;
  }

  #setUpElement() {
    const id = `${this.name.toLowerCase()}-range`;
    this.element = document.createElement('div');
    this.element.id = id;
    this.element.classList.add('range-popup');
    this.nameElement = getTextElement(this.#getText(this.input.value));
    this.element.appendChild(this.nameElement);
    this.element.appendChild(this.input);
  }

  enable(x, y, setValue) {
    const offset = 15;
    this.element.style.display = SHOW_DISPLAY;
    document.body.appendChild(this.element);

    const rect = this.element.getBoundingClientRect();
    const left = x - rect.width + offset;
    const top = y - rect.height + offset;
    this.element.style.position = 'absolute';
    this.element.style.left = left + 'px';
    this.element.style.top = top + 'px';

    this.element.onmouseleave = () => this.disable();
    this.input.oninput = () => {
      const value = this.input.value;
      this.nameElement.innerText = this.#getText(value);
      setValue(value);
    };
  }

  updateValue(value) {
    this.input.value = value;
    this.nameElement.innerText = this.#getText(value);
  }

  disable() {
    this.element.style.display = HIDE_DISPLAY;
    this.element.onmouseout = undefined;
    document.body.removeChild(this.element);
  }

  #getText(value) {
    return `${this.name}: ${value}`;
  }
}

const MIN_DURATION = 100;
const MAX_DURATION = 1000;
const popupDuration = new RangePopup(MIN_DURATION, MAX_DURATION, 'Duration');

export class FrameBox {
  constructor(file, frameIndex) {
    this.file = file;
    this.frame = file.frames[frameIndex];
    this.frameIndex = frameIndex;
    this.element = this.#createElement();
    this.#setUpElementClasses();
    this.#appendFrameImage();
    this.#appendFrameLabel();
  }

  #createElement() {
    const element = document.createElement('div');
    element.onclick = () => {
      this.file.switchFrame(this.frame.id);
    };
    return element;
  }

  #setUpElementClasses() {
    this.element.classList.add('entity');
    if (this.frame.id === this.file.currentId) {
      this.element.classList.add('entity-selected');
    }
  }

  #appendFrameLabel() {
    const container = document.createElement('div');
    container.classList.add('entity-label');
    const name = getTextElement('Frame ' + this.frame.id);
    container.appendChild(name);
    container.appendChild(this.#getDurationElement());
    this.element.appendChild(container);
  }

  #getDurationElement() {
    const duration = document.createElement('div');
    duration.classList.add('frame-duration');
    const image = document.createElement('img');
    const text = document.createElement('div');
    text.innerText = `${this.frame.duration}ms`;
    duration.appendChild(image);
    duration.appendChild(text);

    const setValue = (value) => {
      this.frame.duration = parseInt(value);
    };
    duration.onclick = (event) => {
      popupDuration.enable(event.clientX, event.clientY, setValue);
      popupDuration.updateValue(this.frame.duration);
    };

    return duration;
  }

  #appendFrameImage() {
    const image = document.createElement('div');
    image.classList.add('entity-image');

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

class FrameMenu extends UiElement {
  constructor() {
    super();
    this.#setUpButtons();
    this.label = document.getElementById('show-frames');
  }

  #setUpButtons() {
    this.buttons.addButton('add-entity', (file) => file.appendFrame());
    this.buttons.addButton('duplicate-entity', (file) => {
      file.duplicateFrame(file.currentId);
    });
    this.buttons.addButton('move-entity-up', (file) => {
      file.moveFrameUp(file.currentId);
    });
    this.buttons.addButton('move-entity-down', (file) => {
      file.moveFrameDown(file.currentId);
    });
    this.buttons.addButton('remove-entity', (file) => {
      file.removeFrame(file.currentId);
    });
    this.buttons.addButton('merge-entities', () => {
      throw Error('Merge operation is not implemented for frames');
    });
  }

  refresh(file) {
    this.buttons.enableButtons(file);
    FrameMenu.#updateFrames(file);
    file.canvas.listenToUpdates(() => FrameMenu.#updateFrames(file));
    this.#refreshLabel(file);
  }

  static #updateFrames(file) {
    const list = document.getElementById('entity-list');
    list.innerHTML = '';

    //Iterate the list in reversed order
    for (let i = file.frames.length - 1; i >= 0; i--) {
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
}

const MIN_OPACITY = 0;
const MAX_OPACITY = 255;
const popupOpacity = new RangePopup(MIN_OPACITY, MAX_OPACITY, 'Opacity');

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
    this.element.classList.add('entity');
    if (this.layer.id === this.canvas.drawnId) {
      this.element.classList.add('entity-selected');
    }
  }

  #appendLayerName() {
    const name = getTextElement(this.layer.name);
    name.classList.add('entity-name');
    this.element.appendChild(name);
  }

  #appendVisibilityButton() {
    this.visibilityButton = document.createElement('div');
    this.#setVisibility(this.visibilityButton);
    const setValue = (value) => {
      this.layer.opacity = parseInt(value) / MAX_OPACITY;
      this.canvas.redraw();
      this.#setVisibility(this.visibilityButton);
    };
    this.visibilityButton.onclick = (event) => {
      popupOpacity.enable(event.clientX, event.clientY, setValue);
      popupOpacity.updateValue(this.layer.opacity * MAX_OPACITY);
    };
    this.element.appendChild(this.visibilityButton);
  }

  #setVisibility(button) {
    button.classList.remove(...button.classList);
    button.classList.add('visibility-button');
    if (this.layer.opacity <= 0) {
      button.classList.add('visibility-button-inactive');
    }
  }

  #appendLayerImage() {
    const image = document.createElement('div');
    image.classList.add('entity-image');

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

class LayerMenu extends UiElement {
  constructor() {
    super();
    this.#setUpButtons();
    this.container = document.getElementById('entity-list');
  }

  #setUpButtons() {
    this.buttons.addButton('add-entity', (canvas) => {
      LayerMenu.#addLayer(canvas);
    });
    this.buttons.addButton('remove-entity', (canvas) => {
      LayerMenu.#removeLayer(canvas);
    });
    this.buttons.addButton('move-entity-up', (canvas) => {
      LayerMenu.#moveLayerUp(canvas);
    });
    this.buttons.addButton('move-entity-down', (canvas) => {
      LayerMenu.#moveLayerDown(canvas);
    });
    this.buttons.addButton('merge-entities', (canvas) => {
      LayerMenu.#mergeLayers(canvas);
    });
    this.buttons.addButton('duplicate-entity', (canvas) => {
      LayerMenu.#duplicateLayer(canvas);
    });
  }

  refresh({ canvas }) {
    this.buttons.enableButtons(canvas);
    this.#updateLayers(canvas);
    this.#setFixationListener(canvas);
  }

  #updateLayers(canvas) {
    const layerBoxes = [];
    //Iterate the list in reversed order
    for (let i = canvas.layers.length - 1; i >= 0; i--) {
      const layerBox = new LayerBox(canvas, i);
      layerBoxes.push(layerBox.element);
    }

    this.container.innerHTML = '';

    layerBoxes.forEach((box) => this.container.appendChild(box));
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

const LAYERS_ID = 'show-layers';
const FRAMES_ID = 'show-frames';

export class EntityChooser extends UiElement {
  constructor() {
    super();
    this.#setUpButtons();
  }

  refresh(file) {
    this.buttons.enableButtons();
    this.file = file;
    if (!this.chosen || this.chosen === LAYERS_ID) {
      this.#showLayers();
    } else {
      this.#showFrames();
    }
  }

  #setUpButtons() {
    this.buttons.addButton(LAYERS_ID, () => {
      this.#showLayers();
    });
    this.buttons.addButton(FRAMES_ID, () => {
      this.#showFrames();
    });
  }

  #showLayers() {
    const menu = new LayerMenu();
    menu.refresh(this.file);
    EntityChooser.#changeActive(FRAMES_ID, LAYERS_ID);
    this.chosen = LAYERS_ID;
  }

  #showFrames() {
    const menu = new FrameMenu();
    menu.refresh(this.file);
    EntityChooser.#changeActive(LAYERS_ID, FRAMES_ID);
    this.chosen = FRAMES_ID;
  }

  static #changeActive(previousId, currentId) {
    const activeId = 'entity-chosen';
    document.getElementById(previousId).classList.remove(activeId);
    document.getElementById(currentId).classList.add(activeId);
  }
}

class FilePreviewer {
  #savedFrames;

  constructor(container) {
    this.container = container;
    this.encoder = new BmpEncoder(BmpVersions.BMP_24);
  }

  play(file) {
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

  stop() {
    this.playing = false;
    this.#setImage(null);
    this.timeouts.forEach((id) => window.clearTimeout(id));
  }

  #setImage(url) {
    if (url) {
      conv.setImageBase64(this.container, url);
    } else {
      this.container.style.backgroundImage = '';
    }
  }
}

export class Preview extends UiElement {
  constructor() {
    super();
    this.#setUpButtons();
    this.#setUpElements();
    this.playing = false;
  }

  #setUpButtons() {
    this.buttons.addButton('preview-menu', (file) => this.#play(file));
  }

  #setUpElements() {
    this.modal = new Modal('preview-modal');
    this.preview = new FilePreviewer(document.getElementById('preview'));
  }

  refresh(file) {
    this.buttons.enableButtons(file);
  }

  #play(file) {
    this.modal.show();
    this.preview.play(file);
    window.onclick = (event) => {
      if (event.target === this.modal.element) {
        this.preview.stop();
        this.modal.hide();
      }
    };
  }
}

function getTextElement(text) {
  const textElement = document.createElement('span');
  textElement.innerText = text;
  textElement.classList.add('text');
  return textElement;
}
