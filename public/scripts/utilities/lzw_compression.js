/*
Lempel–Ziv–Welch (LZW) is a universal lossless data compression algorithm
created by Abraham Lempel, Jacob Ziv, and Terry Welch.
Pleaser refer to this link for details:
https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Welch
 */
class LZWCompressor {
  constructor(codeSize) {
    this.codeSize = codeSize;
    this.#clearTable();
    this.blocks = [];
    this.accumulant = '';
  }

  compress(input) {
    let previous = input[0];
    for (let pos = 1; pos < input.length; pos++) {
      const current = input[pos];
      const appended = previous + current;
      if (this.table.has(appended)) {
        previous = appended;
      } else {
        const previousCode = previous < this.initialSize ? previous : this.table.get(previous);
        this.#output(previousCode);
        this.table.set(appended, this.tableIndex);
        this.tableIndex++;
        previous = current;
      }
    }
    this.#output(this.table.get(previous));
    return this.blocks;
  }

  #output(byte) {
    this.blocks.push(byte);
  }

  #addClearCode() {

  }

  #clearTable() {
    this.table = new Map();
    this.initialSize = 2 ** this.codeSize;
    this.tableIndex = this.initialSize;
  }

  #addEOFCode() {

  }
}

export { LZWCompressor };
