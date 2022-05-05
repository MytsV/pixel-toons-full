const download = (data, filename, type) => {
  const file = new Blob([data], { type });

  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(file, filename);
  } else {
    const linkElement = document.createElement('a');
    const url = URL.createObjectURL(file);

    linkElement.href = url;
    linkElement.download = filename;

    document.body.appendChild(linkElement);
    linkElement.click();

    setTimeout(() => {
      document.body.removeChild(linkElement);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
};

export { download };
