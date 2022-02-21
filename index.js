const Jimp = require('jimp');

const defaultOptions = {
    ratio: 0.6,
    opacity: 0.6,
    dstPath: './watermark.jpg',
    text: 'jimp-watermark',
    textSize: 1,
    rotation: 30,
    colWidth: 300,
    rowHeight: 50
}


const SizeEnum = Object.freeze({
    1: Jimp.FONT_SANS_8_BLACK,
    2: Jimp.FONT_SANS_10_BLACK,
    3: Jimp.FONT_SANS_12_BLACK,
    4: Jimp.FONT_SANS_14_BLACK,
    5: Jimp.FONT_SANS_16_BLACK,
    6: Jimp.FONT_SANS_32_BLACK,
    7: Jimp.FONT_SANS_64_BLACK,
    8: Jimp.FONT_SANS_128_BLACK,
})
const ErrorTextSize = new Error("Text size must range from 1 - 8");
const ErrorScaleRatio = new Error("Scale Ratio must be less than one!");
const ErrorOpacity = new Error("Opacity must be less than one!");
const ErrorRotation = new Error("Rotation must be range from 1 - 360");
const ErrorColWidth = new Error("ColWidth must be greater than 0");
const ErrorRowHeight = new Error("RowHeight must be greater than  0");

const getDimensions = (H, W, h, w, ratio) => {
    let hh, ww;
    if ((H / W) < (h / w)) {    //GREATER HEIGHT
        hh = ratio * H;
        ww = hh / h * w;
    } else {                //GREATER WIDTH
        ww = ratio * W;
        hh = ww / w * h;
    }
    return [hh, ww];
}

const textWatermark = async (text, options) => {
  const image = await new Jimp(options.colWidth, options.rowHeight, '#FFFFFF00');
  const font = await Jimp.loadFont(SizeEnum[options.textSize])
  image.print(font, 10, 0, {
    text,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
  },
  400,
  50)
  image.opacity(options.opacity);
  image.scale(3)
  image.rotate( options.rotation )
  image.scale(0.3)
  return image
}

const calculatePositionList = (mainImage, watermarkImg) => {
  const width = mainImage.getWidth()
  const height = mainImage.getHeight()
  const stepWidth = watermarkImg.getWidth()
  const stepHeight = watermarkImg.getHeight()
  let ret = []
  for(let i=0; i < width; i=i+stepWidth) {
    for (let j = 0; j < height; j=j+stepHeight) {
      ret.push([i, j])
    }
  }
  return ret
}

const checkOptions = (options) => {
    options = { ...defaultOptions, ...options };
    if (options.ratio > 1) {
        throw ErrorScaleRatio;
    }
    if (options.opacity > 1) {
        throw ErrorOpacity;
    }
    if (options.rotation < 1 || options.rotation > 360) {
      throw ErrorRotation;
    }
    if (!Object.keys(SizeEnum).includes(String(options.textSize))) {
      throw ErrorTextSize
    }
    return options;
}

/**
 * @param {String} mainImage - Path of the image to be watermarked
 * @param {Object} options
 * @param {String} options.text     - String to be watermarked
 * @param {Number} options.textSize - Text size ranging from 1 to 8
 * @param {String} options.dstPath  - Destination path where image is to be exported
 */
module.exports.addTextWatermark = async (mainImage, options) => {
    try {
        options = checkOptions(options);
        const main = await Jimp.read(mainImage);
        const maxHeight = main.getHeight();
        const maxWidth = main.getWidth();
        if (Object.keys(SizeEnum).includes(String(options.textSize))) {
            const font = await Jimp.loadFont(SizeEnum[options.textSize]);
            const X = 0,        //Always center aligned
                Y = 0
            const finalImage = await main.print(font, X, Y, {
                text: options.text,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, maxWidth, maxHeight);
            finalImage.quality(100).write(options.dstPath);
            return {
                destinationPath: options.dstPath,
                imageHeight: main.getHeight(),
                imageWidth: main.getWidth(),
            };
        } else {
            throw ErrorTextSize;
        }
    } catch (err) {
        throw err;
    }
}

/**
 * @param {String} mainImage - Path of the image to be watermarked
 * @param {String} watermarkImage - Path of the watermark image to be applied
 * @param {Object} options
 * @param {Float} options.ratio     - Ratio in which the watermark is overlaid
 * @param {Float} options.opacity   - Value of opacity of the watermark image during overlay
 * @param {String} options.dstPath  - Destination path where image is to be exported
 */
module.exports.addWatermark = async (mainImage, watermarkImage, options) => {
    try {
        options = checkOptions(options);
        const main = await Jimp.read(mainImage);
        const watermark = await Jimp.read(watermarkImage);
        const [newHeight, newWidth] = getDimensions(main.getHeight(), main.getWidth(), watermark.getHeight(), watermark.getWidth(), options.ratio);
        watermark.resize(newWidth, newHeight);
        const positionX = (main.getWidth() - newWidth) / 2;     //Centre aligned
        const positionY = (main.getHeight() - newHeight) / 2;   //Centre aligned
        watermark.opacity(options.opacity);
        main.composite(watermark,
            positionX,
            positionY,
            Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
        main.quality(100).write(options.dstPath);
        return {
            destinationPath: options.dstPath,
            imageHeight: main.getHeight(),
            imageWidth: main.getWidth(),
        };
    } catch (err) {
        throw err;
    }
}

/**
 * @param {String} mainImage - Path of the image to be watermarked
 * @param {Object} options
 * @param {String} options.text     - String to be watermarked
 * @param {Number} options.textSize - Text size ranging from 1 to 8
 * @param {String} options.dstPath  - Destination path where image is to be exported
 * @param {Number} options.rotate   - Text rotate ranging from 1 to 360
 * @param {Number} options.colWidth - Text watermark column width
 * @param {Number} options.rowHeight- Text watermark row height
 */

module.exports.coverTextWatermark = async (mainImage, options) => {
  try {
    options = checkOptions(options);
    const main = await Jimp.read(mainImage);
    const watermark = await textWatermark(options.text, options);
    const positionList = calculatePositionList(main, watermark)
    for (let i =0; i < positionList.length; i++) {
      const coords = positionList[i]
      main.composite(watermark,
        coords[0], coords[1] );
    }
    main.quality(100).write(options.dstPath);
    return {
      destinationPath: options.dstPath,
      imageHeight: main.getHeight(),
      imageWidth: main.getWidth(),
    };
  } catch (err) {
    throw err;
  }
}

