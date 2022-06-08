const compress = (data) => {
  const table = new Map();
  for (let i = 0; i < 256; i++) {
    table.set(String.fromCharCode(i), i);
  }

  const output = [];
  let element = data.charAt(0);
  let index = 1;
  let tableIndex = 256;
  while (index < data.length) {
    const c = data.charAt(index);
    if (table.has(element + c)) {
      element += c;
    } else {
      output.push(table.get(element));
      table.set(element + c, tableIndex);
      tableIndex++;
      element = c;
    }
    index++;
  }
  output.push(table.get(element));

  return output;
};

const data = 'WYS*WYGWYS*WYSWYSG';
console.log(compress(data));
