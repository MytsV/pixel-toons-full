const BITS_IN_BYTE = 8;

/*
A class that represents a writable array of bytes.
Created for easier work with byte size and different types of written values.
Has similar interface to the Node.js Buffer class.
 */
class Buffer {
  constructor(size) {
    this.data = new Uint8Array(size);
  }

  writeString(string, offset) {
    this.writeArray(stringToByteArray(string), offset);
  }

  write16Integer(number, offset) {
    this.#writeInteger(16, number, offset);
  }

  write32Integer(number, offset) {
    this.#writeInteger(32, number, offset);
  }

  #writeInteger(bits, number, offset) {
    const array = intToByteArray(number, bits / BITS_IN_BYTE);
    this.writeArray(array, offset);
  }

  writeArray(array, offset) {
    this.data.set(array, offset);
  }
}

//Converts a string to ASCII code characters array
function stringToByteArray(string) {
  const array = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    array[i] = string[i].charCodeAt(0);
  }
  return array;
}

//Converts an unsigned integer into a byte array depending on integer size
function intToByteArray(number, size) {
  const array = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = number >> BITS_IN_BYTE * i;
  }
  return array;
}

export { Buffer };
