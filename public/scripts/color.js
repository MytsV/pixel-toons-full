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

    const r = parseInt(hexColor.slice(1, 3), radix);
    const g = parseInt(hexColor.slice(3, 5), radix);
    const b = parseInt(hexColor.slice(5, 7), radix);
    return new Color(r, g, b);
  }

  //Converts color to RGBA CSS format. Use when passing color to CSS style parameter
  toString() {
    return `rgba(${this.r},${this.g},${this.b},${this.alpha / range})`;
  }
}

export { Color };
