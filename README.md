A Simple Javascript library for web media editing using ffmpeg.wasm 

## Installation

```
$ npm i @dev-talha-anwar/ffmpeg-wasm-media-editor

```

## Usage

ffmpeg-wasm-media-editor provides simple to use APIs, to edit a media you only need few lines of code:

```javascript
import FFMPEGWasmMediaEditor from "@dev-talha-anwar/ffmpeg-wasm-media-editor";

(async () => {
    let editor = await new FFMPEGWasmMediaEditor('path-to-ffmpeg-core.js', p => console.log(p),true).init('/samplevideo.mp4', '/samplevideo.mp4');
    editor
    .addTrim('00:00:00', '00:00:05')
    .addCrop('245','245','100','25')
    .addText('0','0',"Stack Overflow","24","white","0","FF0000","5")
    .addFilter("5")
    .addSticker("0","100","100","100","100")
    .addImage('/logo.png','/logo.png', "100","100","200","200")
    await editor.run();
    const data = await editor.getOutput();
    console.log(data);
})();
```

**Note: Following Steps Are Important**

### Headers
you must set following headers in order to use this package \
Cross-Origin-Opener-Policy =  same-origin \
Cross-Origin-Embedder-Policy = require-corp \


### FFMPEG core files
you must host ffmpeg core files to you domain and pass the path in constructor (ffmpeg-core version 0.9.0) \
you must upload all your assets files (fonts,stickers) on the same domain 
