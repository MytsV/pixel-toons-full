import { CanvasRenderer } from './core/canvas_renderer.js';
import { AnimationFile } from './core/canvas.js';
import { bytesToUrl } from './utilities/bytes_conversion.js';
import { BmpEncoder, bmpVersions } from './utilities/bmp_encoder.js';
import {
  FileMenu,
  LayerMenu,
  StateButtons,
  Toolbar
} from './core/ui_elements.js';

let file; //to fix
const renderer = new CanvasRenderer();
let elements = [];

window.onload = () => {
  elements = [
    new StateButtons(),
    new FileMenu(createNewFile),
    new Toolbar(),
    new LayerMenu()
  ];
};

function createNewFile(width, height) {
  file = new AnimationFile(width, height);

  renderer.removeCanvases();
  renderer.appendCanvas(file.canvas);

  elements.forEach((element) => element.refresh(file));
  setUpUserInterface();
}


/*
NOT REFACTORED ZONE
These functions will turn into classes
in ui_elements.js or new key shortcuts handler
 */

function setUpUserInterface() {
  setUpUpdateListener();
}

/*
Handling of zoom
 */

const zoomCodes = {
  '+': true,
  '=': true,
  '-': false,
  '_': false
};

document.addEventListener('keypress', (event) => {
  if (Object.keys(zoomCodes).includes(event.key)) {
    if (zoomCodes[event.key]) {
      renderer.zoomIn();
    } else {
      renderer.zoomOut();
    }
  }
});

/*
Handling of layer-specific functions
 */

function setUpUpdateListener() {
  setLayerMenu();
  file.canvas.listenToUpdates(setLayerMenu);
}

const onLayerClick = (id) => () => file.canvas.switchLayer(id);

function setLayerMenu() {
  const layers = file.canvas.layers;
  const container = document.getElementById('layer-container');
  container.innerHTML = '';

  //Iterate the list in reversed order
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const layerElement = document.createElement('div');
    layerElement.appendChild(getLayerImage(layer));

    appendLayerName(layer, layerElement);
    handleLayerClasses(layer, layerElement);
    layerElement.onclick = onLayerClick(layer.id);
    layerElement.appendChild(getVisibilityButton(layer));

    container.appendChild(layerElement);
  }
}

function appendLayerName(layer, layerElement) {
  const name = document.createElement('span');
  name.classList.add('text');
  name.classList.add('layer-name');
  name.innerText = `Layer ${layer.id}`;
  layerElement.appendChild(name);
}

function handleLayerClasses(layer, layerElement) {
  layerElement.classList.add('layer-element');
  if (layer.id === file.canvas.drawnLayerID) {
    layerElement.classList.add('layer-element-selected');
  }
}

function getVisibilityButton(layer) {
  const visibilityButton = document.createElement('div');
  visibilityButton.classList.add('visibility-button');
  if (!layer.visible) {
    visibilityButton.classList.add('visibility-button-inactive');
  }
  visibilityButton.onclick = () => {
    layer.visible = !layer.visible;
    file.canvas.redraw();
  };
  return visibilityButton;
}

const IMAGE_POS = 0;
//Keys are layer IDs, values - URLs of layer images
const layerCache = new Map();

function getLayerImage(layer) {
  const imageElement = document.createElement('div');
  imageElement.classList.add('layer-image');
  imageElement.style.aspectRatio = renderer.canvasWrapper.style.aspectRatio;

  let url;

  if (file.canvas.drawnLayerID !== layer.id && layerCache.has(layer.id)) {
    url = layerCache.get(layer.id);
  } else {
    const image = layer.context.getImageData(IMAGE_POS, IMAGE_POS, layer.virtualCanvas.width, layer.virtualCanvas.height);
    //Render image with transparency
    const encoder = new BmpEncoder(image, bmpVersions.bmp32);
    const data = encoder.encode();
    url = bytesToUrl(data);
  }

  layerCache.set(layer.id, url);
  imageElement.style.backgroundImage = `url(${url})`;
  return imageElement;
}

window.addEventListener('resize', () => renderer.adjustSize());
