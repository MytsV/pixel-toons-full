/*
PXT is my own file format.
 */

import { Buffer, ByteReader } from './buffer.js';
import { QoiCompressor } from './quite_ok.js';

const VERSION = 1;

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
    this.#mainBuffer.writeString('PXT');
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
    //Current ID | 1 byte | ID of currently selected frame
    this.#mainBuffer.writeByte(file.currentId);
    //Overlay ID | 1 byte | ID of currently rendered beneath frame
    this.#mainBuffer.writeByte(file.currentId);
  }

  #setFrameData(frame) {
    this.#setFrameHeader(frame);
    this.#setCanvasData(frame.canvas);
  }

  #setFrameHeader(frame) {
    //ID | 2 bytes | Unique identifier of the frame
    this.#mainBuffer.write16Integer(frame.id);
    //Frame name length | 1 byte | Length of frame's name
    this.#mainBuffer.writeByte(1);
    //Frame name | [Frame name length] bytes | Name string
    this.#mainBuffer.writeString('w');
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
    this.#mainBuffer.writeByte(layer.opacity);
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
    console.log(reader.readString(3));
  }
}

export { PxtEncoder, PxtDecoder };
