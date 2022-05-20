class InterfaceShortcut {
  static #event = new Event('click');

  constructor(id) {
    this.id = id;
    this.name = this.#getName();
  }

  fire() {
    const button = document.getElementById(this.id);
    button.dispatchEvent(InterfaceShortcut.#event);
  }

  #getName() {
    const parts = this.id.split('-');
    parts[0] = InterfaceShortcut.#capitalize(parts[0]);
    return parts.reduce((prev, curr) => `${prev} ${curr}`, '');
  }

  static #capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

class Shortcuts {
  constructor() {
    this.shortcuts = toMap({
      'ctrl+shift+n': new InterfaceShortcut('create-file'),
      'ctrl+shift+c': new InterfaceShortcut('clear-file'),
      'ctrl+shift+e': new InterfaceShortcut('export-image'),
      'p': new InterfaceShortcut('pencil'),
      'e': new InterfaceShortcut('eraser'),
      'b': new InterfaceShortcut('bucket fill'),
      '=': new InterfaceShortcut('zoom-in'),
      '-': new InterfaceShortcut('zoom-out'),
      'ctrl+z': new InterfaceShortcut('undo'),
      'ctrl+y': new InterfaceShortcut('redo'),
      'shift+a': new InterfaceShortcut('add-layer'),
      'shift+r': new InterfaceShortcut('remove-layer'),
      'shift+u': new InterfaceShortcut('move-layer-up'),
      'shift+d': new InterfaceShortcut('move-layer-down'),
      'shift+m': new InterfaceShortcut('merge-layers'),
      'shift+c': new InterfaceShortcut('duplicate-layer'),
      'shift+e': new InterfaceShortcut('rename-layer')
    });
  }

  enable() {
    document.addEventListener('keydown', (event) => {
      const keybinding = parseKeybinding(event).toLowerCase();
      if (this.shortcuts.has(keybinding)) {
        const shortcut = this.shortcuts.get(keybinding);
        shortcut.fire();
      }
    });
  }
}

const modifierParsing = toMap({
  'ctrlKey': 'ctrl',
  'shiftKey': 'shift',
  'altKey': 'alt',
});

function parseKeybinding(event) {
  const modifiers = [];
  for (const [key, value] of modifierParsing) {
    if (event[key]) modifiers.push(value);
  }

  let modString = '';
  for (const [index, modifier] of modifiers.entries()) {
    if (index > 0) {
      modString += '+';
    }
    modString += modifier;
  }

  if (modString.length > 0) {
    return `${modString}+${event.key}`;
  }
  return event.key;
}

function toMap(obj) {
  return new Map(Object.entries(obj));
}

export { Shortcuts };
