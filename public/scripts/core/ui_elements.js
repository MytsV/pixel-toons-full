import { BmpEncoder, bmpVersions } from '../utilities/bmp_encoder.js';
import { bytesToUrl, downloadLocalUrl } from '../utilities/bytes_conversion.js';
import { BucketFill, Eraser, Pencil } from './tools.js';
import { Color } from '../utilities/color.js';

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

class StateButtons {
  constructor() {
    this.buttons = new VariableDependentButtons();
    this.buttons.addButton('undo-button', (canvas) => canvas.undo());
    this.buttons.addButton('redo-button', (canvas) => canvas.redo());
  }

  refresh(file) {
    this.buttons.enableButtons(file.canvas);
  }
}

class FileMenu {
  constructor(createNewFile) {
    this.createNewFile = createNewFile; //A function passed from the context
    this.buttons = new VariableDependentButtons();
    this.#setUpDependentButtons();

    this.#setUpModal();
    this.#setUpCreateButton();
    this.#setUpCreateFinish();
  }

  refresh(file) {
    this.buttons.enableButtons(file.canvas);
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
    const encoder = new BmpEncoder(image, bmpVersions.bmp32);
    downloadLocalUrl(bytesToUrl(encoder.encode()), 'image.bmp');
  }

  #setUpModal() {
    this.modal = document.getElementById('file-create-modal');
    window.onclick = (event) => {
      if (event.target === this.modal) {
        this.#hideModal();
      }
    };
  }

  #setUpCreateButton() {
    const createButton = document.getElementById('create-file');
    createButton.onclick = () => this.#showModal();
  }

  #setUpCreateFinish() {
    const createFinishButton = document.getElementById('create-file-final');
    createFinishButton.onclick = () => {
      const inputWidth = document.getElementById('width-input');
      const inputHeight = document.getElementById('height-input');
      this.createNewFile(inputWidth.value, inputHeight.value);
      this.#hideModal();
    };
  }

  #showModal() {
    this.modal.style.display = 'block';
  }

  #hideModal() {
    this.modal.style.display = 'none';
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
  chosen;
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
  }

  refresh(file) {
    const canvas = file.canvas;
    this.#setChosen(this.toolsInfo[0], canvas);
    this.buttons.enableButtons(canvas);
    this.#refreshColorPicker(canvas);
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

  #refreshColorPicker(canvas) {
    //this.colorPicker.value = canvas.state.color.toHex();
    this.colorPicker.oninput = () => {
      canvas.state.color = Color.fromHex(this.colorPicker.value);
    };
  }

  #setUpColorPicker() {
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.id = 'color-picker';

    this.container.appendChild(colorPicker);
    this.colorPicker = colorPicker;
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
    if (this.layer.id === this.canvas.drawnLayerId) {
      this.element.classList.add('layer-selected');
    }
  }

  #appendLayerName() {
    const name = getTextElement(`Layer ${this.layer.id}`);
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
    image.style.backgroundImage = `url(${url})`;

    this.element.appendChild(image);
  }

  #getLayerImageUrl() {
    const layer = this.layer;
    const isLayerDrawnOn = this.canvas.drawnLayerId === layer.id;
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
    const encoder = new BmpEncoder(image, bmpVersions.bmp32);
    const data = encoder.encode();
    return bytesToUrl(data);
  }
}

class LayerMenu {
  constructor() {
    this.container = document.getElementById('layer-container');
    this.buttons = new VariableDependentButtons();
    this.#setUpButtons();
  }

  #setUpButtons() {
    this.buttons.addButton('add-layer-button', (canvas) => {
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
  }

  refresh(file) {
    this.buttons.enableButtons(file.canvas);
    this.#updateLayers(file.canvas);
    this.#setFixationListener(file.canvas);
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
    const removedId = canvas.drawnLayerId;
    canvas.removeLayer(removedId);
  }

  static #moveLayerUp(canvas) {
    const movedId = canvas.drawnLayerId;
    canvas.moveLayerUp(movedId);
  }

  static #moveLayerDown(canvas) {
    const movedId = canvas.drawnLayerId;
    canvas.moveLayerDown(movedId);
  }

  static #mergeLayers(canvas) {
    const isLayerDrawnOn = (layer) => layer.id === canvas.drawnLayerId;
    const mergedId = canvas.drawnLayerId;

    const currentIndex = canvas.layers.findIndex(isLayerDrawnOn);
    const bottomLayer = canvas.layers[currentIndex - 1];

    canvas.mergeLayers(mergedId, bottomLayer.id);
  }
}

function getTextElement(text) {
  const textElement = document.createElement('span');
  textElement.innerText = text;
  textElement.classList.add('text');
  return textElement;
}

export { StateButtons, FileMenu, Toolbar, LayerMenu };
