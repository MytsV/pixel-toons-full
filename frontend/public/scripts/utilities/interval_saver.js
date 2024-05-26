import { PxtDecoder, PxtEncoder } from './pxt.js';

const SAVED_FILE_KEY = 'pxt_last';

class IntervalSaver {
  setIntervalSave(file) {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      const encoder = new PxtEncoder();
      const data = encoder.encode(file);
      const base64Data = btoa(String.fromCharCode.apply(null, data));
      localStorage.setItem(SAVED_FILE_KEY, base64Data);
    }, 30 * 1000); //30s
  }

  retrieveFile() {
    const base64Data = localStorage.getItem(SAVED_FILE_KEY);
    if (!base64Data) return;
    const bytes = Array.prototype.map.call(
      atob(base64Data),
      (c) => c.charCodeAt(0)
    );
    return new PxtDecoder().decode(bytes);
  }
}

// Singleton
const intervalSaver = new IntervalSaver();

export { intervalSaver };
