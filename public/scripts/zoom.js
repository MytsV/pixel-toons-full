const MAX_ZOOM = 5;
const MIN_ZOOM = 1;
const STEP = 1;

let zoomValue = 1;

function zoom(positive) {
  if (!canScale(positive)) return;

  const elements = document.querySelectorAll('.canvas-element');
  const element = elements[0];

  zoomValue = positive ? zoomValue + STEP : zoomValue - STEP;

  element.style.transform = `scale(${zoomValue})`;
}

function canScale(positive) {
  if (positive) {
    return zoomValue <= MAX_ZOOM;
  } else {
    return zoomValue > MIN_ZOOM;
  }
}

export { zoom };
