const mixin = {
  byIdentifier,
  getIndex,
  remove,
};

function IdentifiedList(array = []) {
  Object.assign(array, mixin);
  return array;
}

function byIdentifier(id) {
  return this.find((value) => value.id === id);
}

function getIndex(id) {
  return this.findIndex((value) => value.id === id);
}

function remove(id) {
  const filteredArray = this.filter((value) => value.id !== id);
  return new IdentifiedList(filteredArray);
}

export { IdentifiedList };
