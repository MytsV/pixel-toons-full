const mixin = {
  byIdentifier,
  getIndex,
  remove,
  getReorderedList,
};

function IdentifiedList(array = []) {
  Object.assign(array, mixin);
  return array;
}

/**
 * Find an element by its identifier.
 * @param {string|number} id - The id of the element to find.
 * @throws Will throw an error if no element with the given id is found.
 * @return {Object} The found element.
 * @this {Array<Object>}
 */
function byIdentifier(id) {
  const element = this.find((element) => element.id === id);
  if (!element) {
    throw Error(`There is no element with id ${id}`);
  }
  return element;
}

/**
 * Reorder an element within the array by its identifier.
 *
 * @param {string|number} id - The id of the element to reorder.
 * @param {number} position - The new position for the element in the array.
 * @throws Will throw an error if the position is out of bounds.
 * @throws Will throw an error if no element with the given id is found.
 * @return {Array<Object>} A new array with the element reordered.
 * @this {Array<Object>} The array of elements with unique ids.
 */
function getReorderedList(id, position) {
  if (position < 0 || position >= this.length) {
    throw Error('Cannot reorder element: position is out of bounds');
  }
  const newList = this.remove(id);
  const element = this.byIdentifier(id);

  if (position >= this.length) {
    newList.push(element);
  } else {
    //We insert the element at certain index, deleting 0 items
    newList.splice(position, 0, element);
  }

  return newList;
}

/**
 * Get the index of an element by its identifier.
 *
 * @param {string|number} id - The id of the element to find the index of.
 * @return {number} The index of the element in the array, or -1 if not found.
 * @this {Array<Object>} The array of elements with unique ids.
 */
function getIndex(id) {
  return this.findIndex((element) => element.id === id);
}

/**
 * Remove an element by its identifier.
 *
 * @param {string|number} id - The id of the element to remove.
 * @return {IdentifiedList} A new IdentifiedList with the element removed.
 * @this {Array<Object>} The array of elements with unique ids.
 */
function remove(id) {
  const filteredArray = this.filter((element) => element.id !== id);
  return new IdentifiedList(filteredArray);
}

export { IdentifiedList };
