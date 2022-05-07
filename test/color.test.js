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
  const caseCount = 10;

  const testCases = [...Array(caseCount).keys()].map(() => generateRandomHex());
  const hexStrings = testCases.map((test) => '#' + test.reduce((prev, curr) => prev + curr));

  const colors = hexStrings.map((string) => Color.fromHex(string));
  colors.forEach((color, index) => {
    const test = testCases[index];
    expect(color.r).to.equal(parseInt(test[0], radix));
    expect(color.g).to.equal(parseInt(test[1], radix));
    expect(color.b).to.equal(parseInt(test[2], radix));
    if (test[3]) {
      expect(color.alpha).to.equal(parseInt(test[3], radix));
    }
  });
}

function generateRandomRgba() {
  const alphaPrecision = 100;
  const alpha = Math.round(Math.random() * alphaPrecision) / alphaPrecision;
  return `rgba(${getRandInt(colorRange)},${getRandInt(colorRange)},${getRandInt(colorRange)},${alpha})`;
}

function getColorFromRgba(string) {
  const values = RegExp('rgba\\((\\d+),(\\d+),(\\d+),(.+)\\)').exec(string);
  const alphaIndex = 4;
  values[alphaIndex] *= colorRange;
  return new Color(...values.slice(1, 5)); //Take only second to fifth group
}

function generateRandomHex() {
  const parameterCount = 3;
  const getRandomParameter = () => Math.floor(Math.random() * colorRange);

  const color = [...Array(parameterCount).keys()].map(() => getRandomParameter());
  if (color[0] % 2 === 0) { //only some part of colors will have alpha parameter specified
    color.push(getRandomParameter());
  }

  //Make sure every number is padded with 0s
  return color.map((parameter) => parameter.toString(16).padStart(2, '0'));
}

function getRandInt(max) {
  return Math.floor(Math.random() * max);
}
