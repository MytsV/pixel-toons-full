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

  #clear() {
    this.codeIndices = new Map();
    this.nextUnused = this.endCode + 1;
    this.codeSize = this.colorBits + 1;
  }

  getNewCode(previous, current) {
    const hash = CodeTable.#getHash(previous, current);
    const hasCode = this.codeIndices.has(hash);
    return hasCode ? this.codeIndices.get(hash) : null;
  }

  set(previous, current) {
    //Stop populating the table when its size exceeds limit
    if (this.nextUnused >= MAX_TABLE_SIZE) return;

    const hash = CodeTable.#getHash(previous, current);
    this.codeIndices.set(hash, this.nextUnused++);

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
}

class LZWOutput {
  constructor(codeTable) {
    this.table = codeTable;
    this.accumulator = 0;
    this.accumulatorLength = 0;
    this.bytes = [];
  }

  write(byte) {
    this.accumulator |= byte << this.accumulatorLength;
    this.accumulatorLength += this.table.codeSize;
    while (this.accumulatorLength >= BITS_IN_BYTE) {
      this.bytes.push(this.#cropAccumulator());
      this.accumulator >>= BITS_IN_BYTE;
      this.accumulatorLength -= BITS_IN_BYTE;
    }
  }
  writeClearCode() {
    this.write(this.table.clearCode);
  }

  writeEndCode() {
    this.write(this.table.endCode);
  }

  get() {
    if (this.accumulatorLength > 0) {
      this.bytes.push(this.#cropAccumulator());
    }

    const data = [];
    data.push(this.table.colorBits);

    const addBlock = (start, length) => {
      data.push(length);
      data.push(...this.bytes.slice(start, start + length));
    };

    const { length } = this.bytes;
    for (let i = 0; i < this.bytes.length; /* Don't perform any operation */) {
      if (length - i >= MAX_BLOCK_SIZE) {
        addBlock(i, MAX_BLOCK_SIZE);
        i += MAX_BLOCK_SIZE;
      } else {
        addBlock(i, length - i);
        break;
      }
    }

    return data;
  }

  #cropAccumulator() {
    return this.accumulator & 0xFF;
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
    this.output = new LZWOutput(this.table);
  }

  compress(input) {
    this.output.writeClearCode();

    let previous = input[0];
    for (const current of input.slice(1)) {
      const newCode = this.table.getNewCode(previous, current);
      if (newCode !== null) {
        previous = newCode;
      } else {
        this.output.write(previous);
        this.table.set(previous, current);
        previous = current;
      }
    }

    this.output.write(previous);
    this.output.writeEndCode();
    return this.output.get();
  }
}

export { LZWCompressor };
