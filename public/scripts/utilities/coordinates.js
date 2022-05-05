class Coordinates {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  equalX(coordinates) {
    return this.x === coordinates.x;
  }

  equalY(coordinates) {
    return this.y === coordinates.y;
  }

  equal(coordinates) {
    return this.equalX(coordinates) && this.equalY(coordinates);
  }

  static getDifference(src, dest) {
    return new Coordinates(dest.x - src.x, dest.y - src.y);
  }
}

export { Coordinates };
