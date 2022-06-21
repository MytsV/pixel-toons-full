/*
PXT is my own file format.
 */

import { Buffer, ByteReader } from './buffer.js';
import { QoiCompressor, QoiDecompressor } from './quite_ok.js';
import { AnimationFile, Canvas, Frame, Layer } from '../core/canvas.js';

const EXTENSION = 'PXT';
const VERSION = 1;

const FRAME_NAME_TEMP = 'Frame';

class PxtEncoder {
  #mainBuffer;

  /*
  Creates a byte array which represents a file of GIF89a format.
  The comment lines represent structures of format in a format:
  Name | Size | Description
   */
  encode(file) {
    this.#mainBuffer = new Buffer();
    this.#setHeader();
    this.#setInfoHeader(file);
    file.frames.forEach((frame) => this.#setFrameData(frame));
    return this.#mainBuffer.data;
  }

  //Required. Tells the decoder it's a PXT file
  #setHeader() {
    //Signature | 3 bytes | Special value PXT
    this.#mainBuffer.writeString(EXTENSION);
    //Version code | 1 byte | Currently - 1
    this.#mainBuffer.writeByte(VERSION);
  }

  //Required. Tells the decoder how much space the file takes
  #setInfoHeader(file) {
    //Logical Screen Width | 2 bytes | Width of any frame
    this.#mainBuffer.write16Integer(file.width);
    //Logical Screen Height | 2 bytes | Height of any frame
    this.#mainBuffer.write16Integer(file.height);
    //Frame count | 1 byte | Number of frames
    this.#mainBuffer.writeByte(file.frames.length);
    //Current ID | 2 bytes | ID of currently selected frame
    this.#mainBuffer.write16Integer(file.currentId);
    //Overlay ID | 2 bytes | ID of currently rendered beneath frame
    this.#mainBuffer.write16Integer(file.overlayId);
  }

  #setFrameData(frame) {
    this.#setFrameHeader(frame);
    this.#setCanvasData(frame.canvas);
  }

  #setFrameHeader(frame) {
    //ID | 2 bytes | Unique identifier of the frame
    this.#mainBuffer.write16Integer(frame.id);
    //Frame name length | 1 byte | Length of frame's name
    this.#mainBuffer.writeByte(FRAME_NAME_TEMP.length);
    //Frame name | [Frame name length] bytes | Name string
    this.#mainBuffer.writeString(FRAME_NAME_TEMP);
    //Frame duration | 2 bytes | Duration in milliseconds
    this.#mainBuffer.write16Integer(frame.duration);
  }

  #setCanvasData(canvas) {
    this.#setCanvasHeader(canvas);
    canvas.layers.forEach((layer) => this.#setLayerData(layer));
  }

  #setCanvasHeader(canvas) {
    //Drawn ID | 2 bytes | ID of currently selected layer
    this.#mainBuffer.write16Integer(canvas.drawnId);
    //Layer count | 1 byte | Number of layers
    this.#mainBuffer.writeByte(canvas.layers.length);
  }

  #setLayerData(layer) {
    this.#setLayerHeader(layer);
    this.#setImageData(layer.getImageData(layer.width, layer.height));
  }

  #setLayerHeader(layer) {
    //ID | 2 bytes | Unique identifier of the layer
    this.#mainBuffer.write16Integer(layer.id);
    //Name length | 1 byte | Length of layer name
    this.#mainBuffer.writeByte(layer.name.length);
    //Name | [Name length] bytes | Name string
    this.#mainBuffer.writeString(layer.name);
    //Opacity | 1 byte | In range 0..255
    this.#mainBuffer.writeByte(layer.opacity * 255 | 0);
  }

  #setImageData(imageData) {
    const compressor = new QoiCompressor();
    const compressed = compressor.compress(imageData);
    this.#mainBuffer.writeInteger(4, compressed.length);
    this.#mainBuffer.writeArray(compressed);
  }
}

class PxtDecoder {
  decode(bytes) {
    const reader = new ByteReader(bytes);
    const signature = reader.readString(EXTENSION.length);
    if (signature !== EXTENSION) throw Error('Extension is not valid');
    const version = reader.readByte();
    if (version !== VERSION) throw Error('Version is not valid');
    const width = reader.readInteger(2);
    const height = reader.readInteger(2);
    const frameCount = reader.readByte();
    const currentId = reader.readInteger(2);
    const overlayId = reader.readInteger(2);
    const file = new AnimationFile(width, height);
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      const frameId = reader.readInteger(2);
      const frameNameLength = reader.readByte();
      const frameName = reader.readString(frameNameLength);
      const duration = reader.readInteger(2);

      const drawnId = reader.readInteger(2);
      const layerCount = reader.readByte();
      const layers = [];
      for (let j = 0; j < layerCount; j++) {
        const layerId = reader.readInteger(2);
        const layerNameLength = reader.readByte();
        const layerName = reader.readString(layerNameLength);
        const opacity = reader.readByte();
        const length = reader.readInteger(4);
        const data = reader.readArray(length);

        const layer = new Layer(layerId, width, height);
        layer.name = layerName;
        layer.opacity = opacity / 255;
        const decompressed = new QoiDecompressor().decompress(data, width, height);
        layer.setData(decompressed);
        layers.push(layer);
      }
      const canvas = new Canvas(width, height);
      canvas.layers.splice(0, canvas.layers.length);
      layers.forEach((layer) => canvas.appendLayer(layer));
      canvas.switchLayer(drawnId);

      const frame = new Frame(frameId, canvas, duration);
      frames.push(frame);
    }
    file.frames.splice(0, file.frames.length);
    frames.forEach((frame) => file.appendFrame(frame));
    file.switchFrame(currentId);
    return file;
  }
}

export { PxtEncoder, PxtDecoder };
