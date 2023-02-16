import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export default class FFMPEGWasmMediaEditor {

  constructor(progressCallback = null, log = false) {
    this.ffmpeg = createFFmpeg({
      log: log,
      ...( progressCallback && { progress : progressCallback} )
    });
    this.fonts = [ '/font.ttf' ];
    this.stickers = [ '/logo.png' ];
    this.filters = [ "hue=h=-60", "hue=h=0", "hue=h=60", "hue=h=120", "hue=h=180", "hue=h=240" ];
    this.layers = [];
    this.layerTypes = {
      Image: 'image',
      Text: 'text',
      Sticker: 'sticker',
      Filter: 'filter',
      Trim: 'trim',
      Crop: 'crop'
    }
    this.priorities = {
      High: '0',
      Medium: '1',
      Low: '2'
    }
    this.isRun = false;
    this.inputFile = undefined
    this.overlay = undefined
    this.complexInputValue = "[0]";
    this.outputFile = 'test.mp4';
    return this;
  }

  async init( inputFile, fileName){
    console.log('Loading ffmpeg-core.js');
    await this.ffmpeg.load();
    console.log('Loading Input File');
    this.inputFile = inputFile;
    this.fileName = fileName;
    this.ffmpeg.FS('writeFile', fileName, await fetchFile(inputFile));
    return this;
  }

  async addImage(imageFile, fileName ,width,height,horizontalStart,verticalStart){
    this.layers.push({
      type: this.layerTypes.Image,
      complex: true,
      imageFile: imageFile,
      fileName: fileName,
      priority: this.priorities.Medium,
      imageIndex: this.layers.filter((layer) => layer.type == this.layerTypes.Image).length,
      ...this.getPositionObject(width,height,horizontalStart,verticalStart)
    })
    this.ffmpeg.FS('writeFile', fileName, await fetchFile(imageFile));
    return this;
  }

  addText(horizontalStart, verticalStart, text, fontSize = "24", fontColor = "black", fontIndex = 0, backgroundColor = "white", borderWidth = "0"){
    this.layers.push({
      type: this.layerTypes.Text,
      complex: true,
      priority: this.priorities.Low,
      ...this.getTextObject(horizontalStart, verticalStart, text, fontSize, fontColor, fontIndex, backgroundColor, borderWidth)
    })
    return this;
  }
  
  addSticker(stickerIndex, width,height,horizontalStart,verticalStart){
    let customIndex = 0;
    let stickerLayers = this.layers.filter((layer) => layer.type == this.layerTypes.Sticker )
    if(stickerLayers.length){
      let check = stickerLayers.filter((layer) => layer.stickerIndex == stickerIndex)
      if(check.length){
        customIndex = check[0].customIndex;
      }else{
        customIndex = stickerLayers.map((layer) => layer.customIndex).sort((a, b) => a-b).pop() + 1
      }
    }
    this.layers.push({
      type: this.layerTypes.Sticker,
      complex: true,
      stickerIndex: stickerIndex,
      customIndex: customIndex,
      priority: this.priorities.Medium,
      ...this.getPositionObject(width,height,horizontalStart,verticalStart),
    })
    return this;
  }

  addFilter(filterIndex){
    if(!this.layers.filter((obj) => obj.type == 'filter').length){
      this.layers.push({
        type: this.layerTypes.Filter,
        complex: true,
        priority: this.priorities.High,
        filterIndex: filterIndex
      })
    }else{
      console.error('Layer Already Added.')
    }
    return this;
  }

  addCrop(width,height,horizontalStart,verticalStart){
    if(!this.layers.filter((obj) => obj.type == this.layerTypes.Crop).length){
      this.layers.push({
        type: this.layerTypes.Crop,
        complex: true,
        priority: this.priorities.Low,
        ...this.getPositionObject(width,height,horizontalStart,verticalStart)
      })
    }else{
      console.error('Layer Already Added.')
    }
    return this;
  }

  addTrim(startTime, endTime){
    if(!this.layers.filter((obj) => obj.type == this.layerTypes.Trim).length){
      this.layers.push({
        type: this.layerTypes.Trim,
        complex: false,
        startTime: startTime,
        endTime:  endTime,
        priority: this.priorities.Low,
      })
    }else{
      console.error('Layer Already Added.')
    }
    return this;
  }

  async run(){
    try {
      console.log('loading assets');
      await this.loadAssets()
      console.log('starting transcode');
      await this.ffmpeg.run(...this.getCommand());
      this.isRun = true;
      console.log('transcode completed');        
    } catch (error) {
      console.log(error)
    }
  }

  getCommand(){
    return [
      '-i', 
      this.fileName,
      ...this.getCommandParamsForInputFiles(),
      ...this.getComplexLayersCommandParams(),
      ...this.getSimpleLayersCommandParams(),
      "-segment_format_options", "movflags=frag_keyframe+empty_moov+default_base_moof", 
      '-movflags',
      'faststart',
      "-vsync", "0",
      '-f',
      'mp4',
      this.outputFile
    ];
  }
  
  getCommandParamsForInputFiles(){
    let inputFiles = [];
    this.layers.filter((obj) => obj.type == this.layerTypes.Image).forEach((el) => {
      inputFiles.push('-i', el.fileName)
    });
    [...new Set(this.layers.filter((obj) => obj.type == this.layerTypes.Sticker).map(el => el.stickerIndex))].forEach((el) => {
      inputFiles.push('-i', this.stickers[el])
    });
    return inputFiles;
  }

  getComplexLayersCommandParams(){
    let params = []
    let complexLayers = this.layers.filter((obj) => obj.complex)
    if(complexLayers.length){
      params.push('-filter_complex');
      let cParams = [];
      let ccParams = [];
      let count = 0;
      let imageStickerCount = complexLayers.filter(el => el.type == this.layerTypes.Image || el.type == this.layerTypes.Sticker).length;
      complexLayers.sort((a,b) => a.priority - b.priority).forEach((layer, index) => {
        switch (layer.type) {
          case this.layerTypes.Crop:
            cParams.push(this.getCropValue(layer))
            break;
          case this.layerTypes.Filter:
            ccParams.push(this.getFilterValue(layer.filterIndex))
            break;
          case this.layerTypes.Text:
            cParams.push(this.getTextValue(layer))
            break;
          case this.layerTypes.Image:
            count++;
            ccParams.push(this.getImageValue(layer, index, count == imageStickerCount)) 
            break;
          case this.layerTypes.Sticker:
            count++;
            ccParams.push(this.getStickerValue(layer, index,  count == imageStickerCount)) 
            break;
        }
      })
      params.push([ccParams.join(';')].concat(cParams).join(','))
    }
    return params;
  }
  
  getSimpleLayersCommandParams(){
    let params = []
    this.layers.filter((obj) => !obj.complex).forEach((el) => {
      if(el.type == this.layerTypes.Trim){
        params.push( '-ss', el.startTime, '-to', el.endTime)
      }
    })
    return params;
  }

  async loadAssets(){
    let fontFileIndexes = [...new Set(this.layers.filter((obj) => obj.type == this.layerTypes.Text).map((obj) => obj.fontIndex))]
    for(let i=0;i< fontFileIndexes.length;i++){
      this.ffmpeg.FS('writeFile', this.fonts[fontFileIndexes[i]], await fetchFile(this.fonts[fontFileIndexes[i]]));
    }
    let stickerFileIndexes = [...new Set(this.layers.filter((obj) => obj.type == this.layerTypes.Sticker).map((obj) => obj.stickerIndex))]
    for(let i=0;i< stickerFileIndexes.length;i++){
      this.ffmpeg.FS('writeFile', this.stickers[stickerFileIndexes[i]], await fetchFile(this.stickers[stickerFileIndexes[i]]));
    }
  }

  removeLayer(index){
    this.layers = this.layers.filter((obj,i) => i != index)
    return this;
  }

  getOutput(){
    if(!this.inputFile || !this.isRun){
      console.error('Something Went Wrong.')
    }else{
      return this.ffmpeg.FS('readFile', this.outputFile);
    }
  }

  getPositionObject(width, height, horizontalStart, verticalStart){
    return {
      width: width,
      height: height,
      horizontalStart: horizontalStart,
      verticalStart: verticalStart
    }
  }

  getTextObject(horizontalStart, verticalStart, text, fontSize, fontColor, fontIndex, backgroundColor, borderWidth){
    return {
      horizontalStart: horizontalStart,
      verticalStart: verticalStart, 
      text: text,
      fontSize: fontSize,
      fontColor: fontColor, 
      fontIndex: fontIndex, 
      backgroundColor: backgroundColor+"@1", 
      borderWidth: borderWidth
    }
  }

  getFilterValue(filterIndex){
    this.complexInputValue = "[complexInputValue]";
    return `[0]${this.filters[filterIndex]}${ this.layers.filter(el => el.priority == this.priorities.Medium).length ? this.complexInputValue : '' }`;
  }

  getCropValue(layer){
    return `crop=${layer.width}:${layer.height}:${layer.horizontalStart}:${layer.verticalStart}`
  }

  getTextValue(layer){
    return `drawtext=fontfile=${this.fonts[layer.fontIndex]}:text=${layer.text}:fontcolor=${layer.fontColor}:fontsize=${layer.fontSize}:box=1:boxcolor=${layer.backgroundColor}:boxborderw=${layer.borderWidth}:x=${layer.horizontalStart}:y=${layer.verticalStart}`
  }

  getImageValue(layer, index, isLast = false){
    let overlay = `[overImg${index}]`
    let command = `[${layer.imageIndex + 1}]scale=${layer.width}x${layer.height}[img${index}];${!this.overlay ? this.complexInputValue : this.overlay }[img${index}]overlay=${layer.horizontalStart}:${layer.verticalStart}${ !isLast ? overlay : ''}`
    if(!this.overlay){
      this.overlay = overlay
    }
    return command;
  }

  getStickerValue(layer, index, isLast = false){
    let overlay = `[overStick${index}]`
    let command =  `[${ this.layers.filter((l) => l.type == this.layerTypes.Image ).length + 1 + layer.customIndex}]scale=${layer.width}x${layer.height}[sticker${index}];${!this.overlay ? this.complexInputValue : this.overlay }[sticker${index}]overlay=${layer.horizontalStart}:${layer.verticalStart}${ !isLast ? overlay : ''}`
    if(!this.overlay){
      this.overlay = overlay
    }
    return command;
  }
  
}