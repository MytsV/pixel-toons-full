<!-- PROJECT LOGO -->
<br />
<div align="center">
    <img src="docs/logo.gif" alt="Logo" width="210">
    <br />
    <span style="font-size:8pt"><i>I was created in Pixel-Toons Editor, meow!</i></span>

<h2 align="center">🎨 Vivid pixel-art in your browser 🎨</h3>



  <p align="center">
    An open-source platform for creating and sharing pixelated animations. 
    <br />
    School project by <b>Victoria Myts</b> for 🎓KPI
    <br />
    <br />
    <a href="https://github.com/MytsV/pixel-toons-backend"><strong>⚙️ Explore the backend source code ⚙️</strong></a>
    <br />
    <br />
    <a href="#features">Features</a>
    ·
    <a href="#roadmap">Roadmap</a>
    ·
    <a href="https://github.com/MytsV/pixel-toons-editor/issues">Report Bug</a>
    <br />
  </p>
</div>

<div align="center">

![screenshot](./docs/example.gif)

</div>

<h2>🚀 Getting started</h2>

<i>Installation via GitHub:</i>

```bash
git clone https://github.com/MytsV/pixel-toons-editor
npm i --force
```

<i>Running the app:</i>

```bash
#Check and fix syntax via eslint
npm run check
#Run tests
npm run test
#Start the server
npm run start
```

<h2>🛠 Technologies</h2>

[![My Skills](https://skills.thijs.gg/icons?i=js,html,css)](https://skills.thijs.gg)

* Modular JS on the frontend with <b>Web API</b>
* No external libraries used!
* <b>Babel</b> for deployment compilation
* Unit-tests with <b>Mocha</b>

<a name ="roadmap"></a>
<h2>🗺 Roadmap</h2>

| Future features        | Implemented |
|------------------------|-------------|
| ⚙️ Integration of backend service | 🎬 [ Frames ](#frames)           |
| 🚀 Assembly and deploy    | 🎨 [Canvas & Layers](#canvas)            |
|                        | 👩‍🎨 [Tools](#tools) |
| | 🌠 [BMP encoder](#bmp) |
| | 🍿 [LZW compression & GIF encoder](#gif) |
| | 👤 [Database handling & Authentication](#auth) |
| | 💾 [Own file format](#pxt) |

<a name ="features"></a>
<h2>✨ Features</h2>

<a name ="frames"></a>
<h3>Frames</h3>

> Implemented as a part of File class. Can have variable duration and order.

<a name="canvas"></a>
<h3>Canvas & Layers</h3>

> Caching, implementations of Prototype and Memento patterns and high encapsulation.

<a name="tools"></a>
<h3>Tools</h3>

> Convenient abstraction for easy creation of new tools

<a name="bmp"></a>
<h3>BMP encoder</h3>

> Implementation of open-source file format specification. See code comments for source.

<a name="gif"></a>
<h3>LZW compression & GIF encoder</h3>

> Implementation of LZW compression algorithm and popular file format. See code comments for source.

<a name="auth"></a>
<h3>Database handling & Authentication</h3>

> Almost the only part using asynchronous programming. Implemented with Firebase. The public key in the files is secure to be shared.

<a name ="pxt"></a>
<h2>💾 .PXT file format</h2>

Consists of <b>five</b> structures:
<br/>
Header
<br/>
InfoHeader
<br/>
FrameData
<br/>
<span style="padding-left:20pt">CanvasData</span>
<br/>
<span style="padding-left:40pt">LayerData</span>

<h3>Header</h3>

| Field name      | Size      | Value & Description |
|------------|-----------|-------------|
| Signature | 3 bytes | "PXT" |
| Version code | 1 byte | "1" |
| Per pixel | 1 byte | "3" - RGB |

<h3>InfoHeader</h3>

| Field name      | Size      | Value & Description |
|------------|-----------|-------------|
| Width | 2 bytes | Width of canvas |
| Height | 2 bytes | Height of canvas |
| Frame count | 1 byte | Number of frames |
| Current ID | 2 bytes | ID of a currently chosen frame |
| Overlay ID | 2 bytes | ID of a frame, currently displayed underneath |

(
<h3>FrameData</h3>

| Field name      | Size      | Value & Description |
|------------|-----------|-------------|
| ID | 2 bytes |  |
| Name length | 1 byte | Length of the frame name in bytes |
| Name | ${Name length} bytes |  |
| Duration | 2 bytes | Duration in milliseconds |

<h3>CanvasData</h3>

| Field name      | Size      | Value & Description |
|------------|-----------|-------------|
| Drawn ID | 2 bytes | ID of currently chosen layer |
| Layer count | 1 byte | Number of layers |

(

<h3>LayerData</h3>

| Field name      | Size      | Value & Description |
|------------|-----------|-------------|
| ID | 2 bytes |  |
| Name length | 1 byte | Length of the layer name in bytes |
| Name | ${Name length} bytes |  |
| Opacity | 1 byte | 0...255 |
| Image data length | 4 bytes |  |
| Image data | ${Image data length} bytes | Sequence of bytes, which represent an image. Compressed by <a href="https://github.com/phoboslab/qoi">Quite OK Algorithm</a>. |

) - ${Layer count} times

) - ${Frame count} times

<a name ="credits"></a>
<h2>❤️ Credits</h2>

<a href="https://github.com/phoboslab">Dominic Szablewski<a/> - Quite OK Algorithm author
