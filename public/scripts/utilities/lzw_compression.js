const MAX_BLOCK_SIZE = 255;
const BITS_IN_BYTE = 8;
const MAX_TABLE_SIZE = 1 << /* Max code size */ 12;

class CodeTable {
  constructor(codeSize) {
    this.colorBits = codeSize;
    this.clearCode = 1 << this.colorBits;
    this.endCode = this.clearCode + 1;
    this.#clear();
  }

  getNewCode(previous, current) {
    const appended = CodeTable.#getHash(previous, current);
    const hasCode = this.table.has(appended);
    return hasCode ? this.table.get(appended) : null;
  }

  set(previous, current) {
    //Stop populating the table when its size exceeds limit
    if (this.nextUnused >= MAX_TABLE_SIZE) return;

    this.table.set(CodeTable.#getHash(previous, current), this.nextUnused++);

    const size = 1 << this.codeSize;
    /*
    If the next entry will be bigger than the maximally supported one,
    we increase the code size
     */
    if (this.nextUnused > size) {
      this.codeSize++;
    }
  }

  static #getHash(previous, current) {
    return (previous << 8) | current;
  }

  #clear() {
    this.table = new Map();
    this.nextUnused = this.endCode + 1;
    this.codeSize = this.colorBits + 1;
  }
}

/*
Lempel–Ziv–Welch (LZW) is a universal lossless data compression algorithm
created by Abraham Lempel, Jacob Ziv, and Terry Welch.
Pleaser refer to this link for details:
https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Welch
 */
class LZWCompressor {
  constructor(codeSize) {
    this.table = new CodeTable(codeSize);
    this.accumulant = '';
    this.blocks = [];
    this.currentBlock = [];
  }

  compress(input) {
    this.#addClearCode();

    let previous = input[0];
    for (const current of input.slice(1)) {
      const newCode = this.table.getNewCode(previous, current);
      if (newCode !== null) {
        previous = newCode;
      } else {
        this.#output(previous);
        this.table.set(previous, current);
        previous = current;
      }
    }

    this.#output(previous);
    this.#addEndCode();
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
    while (string.length < this.table.codeSize) {
      string = '0' + string;
    }
    return string;
  }

  #addClearCode() {
    this.#output(this.table.clearCode);
  }

  #addEndCode() {
    this.#output(this.table.endCode);
    if (this.currentBlock.length !== 0) {
      if (this.accumulant) {
        this.currentBlock.push(parseInt(this.accumulant, 2));
      }
      this.blocks.push(this.currentBlock);
    }
  }
}

export { LZWCompressor };
