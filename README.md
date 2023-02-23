A Simple Javascript library for web media editing using ffmpeg.wasm 

## Installation

```
$ npm i @dev-talha-anwar/ffmpeg-wasm-media-editor

```

**Note: Following Steps Are Important**

### Headers
you must set following headers in order to use this package \
Cross-Origin-Opener-Policy =  same-origin \
Cross-Origin-Embedder-Policy = require-corp

**For ReactJs**
create a file named "setupProxy.js" in src folder with following content in it 
```javascript
module.exports = (app) => {
  app.use((_, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });
};

```

**For NextJs**
copy following code in your page to set server side headers or you can add this code in pages/index.js file in bottom.
```javascript
export async function getServerSideProps(context) {
  // set HTTP header
  context.res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  context.res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  console.log({ isSecureContext: context });
  return {
    props: {}
  };
}

```


### FFMPEG core files
you must host ffmpeg core files to you domain and pass the path of ffmpeg-core.js in constructor (core files are provided in the core directory of the library) \
you must upload all your assets files (fonts,stickers) on the same domain and provide path in constructor

## Usage

ffmpeg-wasm-media-editor provides simple to use APIs, to edit a media you only need few lines of code:

```javascript
import FFMPEGWasmMediaEditor from "@dev-talha-anwar/ffmpeg-wasm-media-editor";

(async () => {
    let editor = await new FFMPEGWasmMediaEditor(
      'http://localhost:3000/core/ffmpeg-core.js', 
      p => console.log(p),
      true,[
        'http://localhost:3000/fonts/font.ttf', 
      ],[
        'http://localhost:3000/stickers/sticker.png', 
      ],
    ).init('/samplevideo.mp4', '/samplevideo.mp4');
    
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


