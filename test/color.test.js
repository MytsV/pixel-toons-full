import { Color } from '../public/scripts/utilities/color.js';
import { expect } from 'chai';
import { describe, it } from 'mocha';

const colorRange = 255;

describe('Color class', () => {
  it('Converts itself into CSS RGBA format', () => cssToRgba());

  it('Converts HEX value into color', () => hexToColor());
});

function cssToRgba() {
  const caseCount = 20;
  const colorAnswers = [...Array(caseCount).keys()].map(() => generateRandomRgba());
  const colors = colorAnswers.map((color) => getColorFromRgba(color));

  colors.forEach((color, index) => {
    const string = color.toString();
    expect(string).to.equal(colorAnswers[index]);
  });
}

function hexToColor() {
  const radix = 16;

  const testCases = [['ff', '00', '00'], ['65', '33', 'a4', '54'], ['ad', 'cc', '33']];
  const hexStrings = testCases.map((test) => '#' + test.reduce((prev, curr) => prev + curr));

  const colors = hexStrings.map((string) => Color.fromHex(string));
  colors.forEach((color, index) => {
    const test = testCases[index];
    expect(color.r).to.equal(parseInt(test[0], radix));
    expect(color.g).to.equal(parseInt(test[1], radix));
    expect(color.b).to.equal(parseInt(test[2], radix));
    if (test.length > 3) {
      expect(color.alpha).to.equal(parseInt(test[3], radix));
    }
  });
}

function generateRandomRgba() {
  const alpha = Math.round(Math.random() * 100) / 100;
  return `rgba(${getRandInt(colorRange)},${getRandInt(colorRange)},${getRandInt(colorRange)},${alpha})`;
}

function getColorFromRgba(string) {
  const values = RegExp('rgba\\((\\d+),(\\d+),(\\d+),(.+)\\)').exec(string);
  values[4] *= colorRange;
  return new Color(...values.slice(1, 5)); //take only second to fifth group
}

function getRandInt(max) {
  return Math.floor(Math.random() * max);
}
