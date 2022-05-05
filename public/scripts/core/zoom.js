const MAX_ZOOM = 5;
const MIN_ZOOM = 1;
const STEP = 1;

let zoomValue = 1;

const translation = 50;

function zoom(positive) {
  if (!canScale(positive)) return;

  const element = document.getElementById('canvas-wrapper');
  zoomValue = positive ? zoomValue + STEP : zoomValue - STEP;
  element.style.height = `${zoomValue * 100}%`;

  handleCentering(element);
}

function canScale(positive) {
  if (positive) {
    return zoomValue <= MAX_ZOOM;
  } else {
    return zoomValue > MIN_ZOOM;
  }
}

function handleCentering(element) {
  const centered = zoomValue <= 1;
  element.style.transform = centered ? `translate(-${translation}%, -${translation}%)` : 'none';
  element.style.left = centered ? `${translation}%` : '0pt';
  element.style.top = centered ? `${translation}%` : '0pt';
}

export { zoom };
