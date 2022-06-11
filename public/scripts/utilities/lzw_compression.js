const MAX_BLOCK_SIZE = 255;
const SPECIAL_CODE_COUNT = 2;
const BITS_IN_BYTE = 8;
const MAX_CODE_SIZE = 12;

/*
Lempel–Ziv–Welch (LZW) is a universal lossless data compression algorithm
created by Abraham Lempel, Jacob Ziv, and Terry Welch.
Pleaser refer to this link for details:
https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Welch
 */
class LZWCompressor {
  constructor(codeSize) {
    this.minCodeSize = codeSize;
    this.accumulant = '';
    this.blocks = [];
    this.currentBlock = [];
  }

  compress(input) {
    this.#clearTable();
    let previous = input[0];
    for (let pos = 1; pos < input.length; pos++) {
      const current = input[pos];
      const appended = (previous << 8) | current;
      if (this.table.has(appended)) {
        previous = this.table.get(appended);
      } else {
        this.#output(previous);
        if (this.tableIndex < 1 << MAX_CODE_SIZE) {
          this.table.set(appended, this.tableIndex);
          if (this.tableIndex > (2 ** this.codeSize - 1)) {
            this.codeSize++;
          }
          this.tableIndex++;
        }
        previous = current;
      }
    }
    this.#output(previous);
    this.#addEOFCode();
    return this.blocks;
  }

  #output(byte) {
    const string = this.#byteToString(byte);
    for (let i = string.length - 1; i >= 0; i--) {
      this.accumulant = string.charAt(i) + this.accumulant;
      if (this.accumulant.length >= BITS_IN_BYTE) {
        this.currentBlock.push(parseInt(this.accumulant, 2));
        if (this.currentBlock.length >= MAX_BLOCK_SIZE) {
          this.blocks.push(this.currentBlock);
          this.currentBlock = [];
        }
        this.accumulant = '';
      }
    }
    if (this.currentBlock.length >= MAX_BLOCK_SIZE) {
      this.blocks.push(this.currentBlock);
      this.currentBlock = [];
    }
  }

  #byteToString(byte) {
    let string = byte.toString(2);
    while (string.length < this.codeSize) {
      string = '0' + string;
    }
    return string;
  }

  #addClearCode() {
    this.#output(this.initialSize);
  }

  #clearTable() {
    this.table = new Map();
    this.initialSize = 2 ** this.minCodeSize;
    this.tableIndex = this.initialSize + SPECIAL_CODE_COUNT;
    this.codeSize = this.minCodeSize + 1;
    this.#addClearCode();
  }

  #addEOFCode() {
    this.#output(this.initialSize + 1);
    if (this.currentBlock.length !== 0) {
      if (this.accumulant) {
        this.currentBlock.push(parseInt(this.accumulant, 2));
      }
      this.blocks.push(this.currentBlock);
    }
  }
}

export { LZWCompressor };
