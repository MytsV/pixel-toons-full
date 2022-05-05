/*
Class that represents color in RGBA format.
Parameters r, g, b range from 0 to 255.
Parameter alpha ranges from 0 to 255.
 */

const range = 255;

class Color {
  constructor(r, g, b, alpha = 255) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.alpha = alpha;
  }

  //"Factory method" that creates color from given HEX value
  static fromHex(hexColor) {
    const radix = 16;
    const noAlphaLength = 7;

    const r = parseInt(hexColor.slice(1, 3), radix);
    const g = parseInt(hexColor.slice(3, 5), radix);
    const b = parseInt(hexColor.slice(5, 7), radix);
    if (hexColor.length > noAlphaLength) {
      const alpha = parseInt(hexColor.slice(7, 9), radix);
      return new Color(r, g, b, alpha);
    }
    return new Color(r, g, b);
  }

  blend(color) {
    const newAlpha = color.alpha / range + this.alpha / range * (1 - color.alpha / range);
    const getNewParameter = (parameterA, parameterB) => {
      const numerator = parameterA * color.alpha / range + parameterB * (1 - color.alpha / range);
      return Math.floor(numerator / newAlpha);
    };

    return new Color(getNewParameter(color.r, this.r), getNewParameter(color.g, this.g),
      getNewParameter(color.b, this.b), newAlpha);
  }

  //Converts color to RGBA CSS format. Use when passing color to CSS style parameter
  toString() {
    return `rgba(${this.r},${this.g},${this.b},${this.alpha / range})`;
  }
}

export { Color };
