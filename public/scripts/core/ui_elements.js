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
    this.buttons.addButton('file-clear', (canvas) => this.#clear(canvas));
    this.buttons.addButton('export-button', (canvas) => {
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
    const createButton = document.getElementById('file-create');
    createButton.onclick = () => this.#showModal();
  }

  #setUpCreateFinish() {
    const createFinishButton = document.getElementById('file-create-finish');
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

function getTextElement(text) {
  const textElement = document.createElement('span');
  textElement.innerText = text;
  textElement.classList.add('text');
  return textElement;
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
    this.buttons.addButton('remove-layer-button', (canvas) => {
      LayerMenu.#removeLayer(canvas);
    });
    this.buttons.addButton('move-up-layer-button', (canvas) => {
      LayerMenu.#moveLayerUp(canvas);
    });
    this.buttons.addButton('move-down-layer-button', (canvas) => {
      LayerMenu.#moveLayerDown(canvas);
    });
    this.buttons.addButton('merge-layers-button', (canvas) => {
      LayerMenu.#mergeLayers(canvas);
    });
  }

  refresh(file) {
    this.buttons.enableButtons(file.canvas);
  }

  #updateLayers() {

  }

  static #addLayer(canvas) {
    canvas.appendLayer();
  }

  static #removeLayer(canvas) {
    const removedId = canvas.drawnLayerID;
    canvas.removeLayer(removedId);
  }

  static #moveLayerUp(canvas) {
    const movedId = canvas.drawnLayerID;
    canvas.moveLayerUp(movedId);
  }

  static #moveLayerDown(canvas) {
    const movedId = canvas.drawnLayerID;
    canvas.moveLayerDown(movedId);
  }

  static #mergeLayers(canvas) {
    const isLayerDrawn = (layer) => layer.id === canvas.drawnLayerID;
    const mergedId = canvas.drawnLayerID;

    const currentIndex = canvas.layers.findIndex(isLayerDrawn);
    const bottomLayer = canvas.layers[currentIndex - 1];

    canvas.mergeLayers(mergedId, bottomLayer.id);
  }
}

export { StateButtons, FileMenu, Toolbar, LayerMenu };
