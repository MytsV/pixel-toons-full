class KeyBinding {
  constructor(mainKey, modifiers = []) {
    this.mainKey = mainKey;
    this.modifiers = modifiers;
  }
}

/*
Interface shortcut is connected with a button.
It triggers button click event when the keybinding is pressed.
 */
class InterfaceShortcut {
  constructor(id, shortcut) {
    this.id = id;
    this.shortcut = shortcut;
    this.name = this.#getName();
  }

  setListener() {
    const button = document.getElementById(this.id);
    document.addEventListener('keydown', (event) => {
      const modified = this.shortcut.modifiers.reduce((prev, curr) => {
        const applied = event[curr];
        return prev && applied;
      }, true);
      const isKeyPressed = this.shortcut.mainKey === event.key;
      if (modified && isKeyPressed) {
        button.dispatchEvent(new Event('click'));
      }
    });
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
    this.shortcuts = [
      new InterfaceShortcut('file-create', new KeyBinding('c')),
      new InterfaceShortcut('pencil', new KeyBinding('p'))
    ];
    this.shortcuts.forEach((shortcut) => shortcut.setListener());
  }
}

export { Shortcuts };
