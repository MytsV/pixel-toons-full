const ASCII_COUNT = 256;

/*
Lempel–Ziv–Welch (LZW) is a universal lossless data compression algorithm
created by Abraham Lempel, Jacob Ziv, and Terry Welch.
Pleaser refer to this link for details:
https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Welch
 */
const compress = (input) => {
  const table = new Map();
  const output = [];
  for (let code = 0; code < ASCII_COUNT; code++) {
    table.set(String.fromCharCode(code), code);
  }
  let tableIndex = ASCII_COUNT;

  let previous = input.charAt(0);
  for (let pos = 1; pos < input.length; pos++) {
    const current = input.charAt(pos);
    const appended = previous + current;
    if (table.has(appended)) {
      previous = appended;
    } else {
      output.push(table.get(previous));
      table.set(appended, tableIndex);
      tableIndex++;
      previous = current;
    }
  }
  output.push(table.get(previous));

  return output;
};

export { compress };
