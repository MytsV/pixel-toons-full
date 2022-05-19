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
    this.shortcuts = new Map(Object.entries({
      'c': new InterfaceShortcut('create-file'),
      'p': new InterfaceShortcut('pencil'),
      '=': new InterfaceShortcut('zoom-in'),
      '-': new InterfaceShortcut('zoom-out')
    }));
  }

  enable() {
    document.addEventListener('keydown', (event) => {
      const keybinding = parseKeybinding(event);
      if (this.shortcuts.has(keybinding)) {
        const shortcut = this.shortcuts.get(keybinding);
        shortcut.fire();
      }
    });
  }
}

const modifierParsing = new Map(Object.entries({
  'ctrlKey': 'ctrl',
  'shiftKey': 'shift',
  'altKey': 'alt',
}));

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

export { Shortcuts };
