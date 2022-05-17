const bytesToBase64 = (data) => {
  window.btoa(data.reduce((prev, curr) => {
    const encoded = String.fromCharCode(curr);
    return prev + encoded;
  }, ''));
};

const bytesToUrl = (data) => {
  const blob = new Blob([data]);
  //Create a special url that points to an object in the browser's memory
  return URL.createObjectURL(blob);
};

const downloadLocalUrl = (url, filename) => {
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.dispatchEvent(
    new MouseEvent('click', {
      view: window
    })
  );

  document.body.removeChild(link);
};

export { bytesToUrl, downloadLocalUrl, bytesToBase64 };
