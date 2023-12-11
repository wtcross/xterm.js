import { Disposable, MutableDisposable, toDisposable } from 'common/Lifecycle';

/**
 * Copyright (c) 2019 Joerg Breitbart.
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FOREGROUND = exports.DEFAULT_BACKGROUND = exports.PALETTE_ANSI_256 = exports.PALETTE_VT340_GREY = exports.PALETTE_VT340_COLOR = exports.normalizeHLS = exports.normalizeRGB = exports.nearestColorIndex = exports.fromRGBA8888 = exports.toRGBA8888 = exports.alpha = exports.blue = exports.green = exports.red = exports.BIG_ENDIAN = void 0;
// FIXME: cleanup this mess, move things either to decoder/encoder, keep only shared things
// system endianess
exports.BIG_ENDIAN = new Uint8Array(new Uint32Array([0xFF000000]).buffer)[0] === 0xFF;
if (exports.BIG_ENDIAN) {
    console.warn('BE platform detected. This version of node-sixel works only on LE properly.');
}
// channel values
function red(n) {
    return n & 0xFF;
}
exports.red = red;
function green(n) {
    return (n >>> 8) & 0xFF;
}
exports.green = green;
function blue(n) {
    return (n >>> 16) & 0xFF;
}
exports.blue = blue;
function alpha(n) {
    return (n >>> 24) & 0xFF;
}
exports.alpha = alpha;
/**
 * Convert RGB channels to native color RGBA8888.
 */
function toRGBA8888$2(r, g, b, a = 255) {
    return ((a & 0xFF) << 24 | (b & 0xFF) << 16 | (g & 0xFF) << 8 | (r & 0xFF)) >>> 0; // ABGR32
}
exports.toRGBA8888 = toRGBA8888$2;
/**
 * Convert native color to [r, g, b, a].
 */
function fromRGBA8888(color) {
    return [color & 0xFF, (color >> 8) & 0xFF, (color >> 16) & 0xFF, color >>> 24];
}
exports.fromRGBA8888 = fromRGBA8888;
/**
 * Get index of nearest color in `palette` for `color`.
 * Uses euclidean distance without any luminescence correction.
 */
function nearestColorIndex(color, palette) {
    const r = red(color);
    const g = green(color);
    const b = blue(color);
    let min = Number.MAX_SAFE_INTEGER;
    let idx = -1;
    // use euclidean distance (manhattan gives very poor results)
    for (let i = 0; i < palette.length; ++i) {
        const dr = r - palette[i][0];
        const dg = g - palette[i][1];
        const db = b - palette[i][2];
        const d = dr * dr + dg * dg + db * db;
        if (!d)
            return i;
        if (d < min) {
            min = d;
            idx = i;
        }
    }
    return idx;
}
exports.nearestColorIndex = nearestColorIndex;
// color conversions
// HLS taken from: http://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl
function clamp(low, high, value) {
    return Math.max(low, Math.min(value, high));
}
function h2c(t1, t2, c) {
    if (c < 0)
        c += 1;
    if (c > 1)
        c -= 1;
    return c * 6 < 1
        ? t2 + (t1 - t2) * 6 * c
        : c * 2 < 1
            ? t1
            : c * 3 < 2
                ? t2 + (t1 - t2) * (4 - c * 6)
                : t2;
}
function HLStoRGB(h, l, s) {
    if (!s) {
        const v = Math.round(l * 255);
        return toRGBA8888$2(v, v, v);
    }
    const t1 = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const t2 = 2 * l - t1;
    return toRGBA8888$2(clamp(0, 255, Math.round(h2c(t1, t2, h + 1 / 3) * 255)), clamp(0, 255, Math.round(h2c(t1, t2, h) * 255)), clamp(0, 255, Math.round(h2c(t1, t2, h - 1 / 3) * 255)));
}
/**
 * Normalize SIXEL RGB values (percent based, 0-100) to RGBA8888.
 */
function normalizeRGB(r, g, b) {
    return (0xFF000000 | Math.round(b / 100 * 255) << 16 | Math.round(g / 100 * 255) << 8 | Math.round(r / 100 * 255)) >>> 0; // ABGR32
}
exports.normalizeRGB = normalizeRGB;
/**
 * Normalize SIXEL HLS values to RGBA8888. Applies hue correction of +240°.
 */
function normalizeHLS(h, l, s) {
    // Note: hue value is turned by 240° in VT340, all values given as fractions
    return HLStoRGB((h + 240 % 360) / 360, l / 100, s / 100);
}
exports.normalizeHLS = normalizeHLS;
/**
 * default palettes
 */
// FIXME: move palettes to Decoder.ts
/**
 * 16 predefined color registers of VT340 (values in %):
 * ```
 *                R   G   B
 * 0  Black       0   0   0
 * 1  Blue        20  20  80
 * 2  Red         80  13  13
 * 3  Green       20  80  20
 * 4  Magenta     80  20  80
 * 5  Cyan        20  80  80
 * 6  Yellow      80  80  20
 * 7  Gray 50%    53  53  53
 * 8  Gray 25%    26  26  26
 * 9  Blue*       33  33  60
 * 10 Red*        60  26  26
 * 11 Green*      33  60  33
 * 12 Magenta*    60  33  60
 * 13 Cyan*       33  60  60
 * 14 Yellow*     60  60  33
 * 15 Gray 75%    80  80  80
 * ```
 * (*) less saturated
 *
 * @see https://vt100.net/docs/vt3xx-gp/chapter2.html#S2.4
*/
exports.PALETTE_VT340_COLOR = new Uint32Array([
    normalizeRGB(0, 0, 0),
    normalizeRGB(20, 20, 80),
    normalizeRGB(80, 13, 13),
    normalizeRGB(20, 80, 20),
    normalizeRGB(80, 20, 80),
    normalizeRGB(20, 80, 80),
    normalizeRGB(80, 80, 20),
    normalizeRGB(53, 53, 53),
    normalizeRGB(26, 26, 26),
    normalizeRGB(33, 33, 60),
    normalizeRGB(60, 26, 26),
    normalizeRGB(33, 60, 33),
    normalizeRGB(60, 33, 60),
    normalizeRGB(33, 60, 60),
    normalizeRGB(60, 60, 33),
    normalizeRGB(80, 80, 80)
]);
/**
 * 16 predefined monochrome registers of VT340 (values in %):
 * ```
 *              R   G   B
 * 0  Black     0   0   0
 * 1  Gray-2    13  13  13
 * 2  Gray-4    26  26  26
 * 3  Gray-6    40  40  40
 * 4  Gray-1    6   6   6
 * 5  Gray-3    20  20  20
 * 6  Gray-5    33  33  33
 * 7  White 7   46  46  46
 * 8  Black 0   0   0   0
 * 9  Gray-2    13  13  13
 * 10 Gray-4    26  26  26
 * 11 Gray-6    40  40  40
 * 12 Gray-1    6   6   6
 * 13 Gray-3    20  20  20
 * 14 Gray-5    33  33  33
 * 15 White 7   46  46  46
 * ```
 *
 * @see https://vt100.net/docs/vt3xx-gp/chapter2.html#S2.4
 */
exports.PALETTE_VT340_GREY = new Uint32Array([
    normalizeRGB(0, 0, 0),
    normalizeRGB(13, 13, 13),
    normalizeRGB(26, 26, 26),
    normalizeRGB(40, 40, 40),
    normalizeRGB(6, 6, 6),
    normalizeRGB(20, 20, 20),
    normalizeRGB(33, 33, 33),
    normalizeRGB(46, 46, 46),
    normalizeRGB(0, 0, 0),
    normalizeRGB(13, 13, 13),
    normalizeRGB(26, 26, 26),
    normalizeRGB(40, 40, 40),
    normalizeRGB(6, 6, 6),
    normalizeRGB(20, 20, 20),
    normalizeRGB(33, 33, 33),
    normalizeRGB(46, 46, 46)
]);
/**
 * 256 predefined ANSI colors.
 *
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit
 */
exports.PALETTE_ANSI_256 = (() => {
    // 16 lower colors (taken from xterm)
    const p = [
        toRGBA8888$2(0, 0, 0),
        toRGBA8888$2(205, 0, 0),
        toRGBA8888$2(0, 205, 0),
        toRGBA8888$2(205, 205, 0),
        toRGBA8888$2(0, 0, 238),
        toRGBA8888$2(205, 0, 205),
        toRGBA8888$2(0, 250, 205),
        toRGBA8888$2(229, 229, 229),
        toRGBA8888$2(127, 127, 127),
        toRGBA8888$2(255, 0, 0),
        toRGBA8888$2(0, 255, 0),
        toRGBA8888$2(255, 255, 0),
        toRGBA8888$2(92, 92, 255),
        toRGBA8888$2(255, 0, 255),
        toRGBA8888$2(0, 255, 255),
        toRGBA8888$2(255, 255, 255),
    ];
    // colors up to 232
    const d = [0, 95, 135, 175, 215, 255];
    for (let r = 0; r < 6; ++r) {
        for (let g = 0; g < 6; ++g) {
            for (let b = 0; b < 6; ++b) {
                p.push(toRGBA8888$2(d[r], d[g], d[b]));
            }
        }
    }
    // grey scale to up 255
    for (let v = 8; v <= 238; v += 10) {
        p.push(toRGBA8888$2(v, v, v));
    }
    return new Uint32Array(p);
})();
/**
 * Background: Black by default.
 * Foreground: White by default.
 *
 * Background color is used whenever a fill color is needed and not explicitly set.
 * Foreground color is used as default initial sixel color.
 */
exports.DEFAULT_BACKGROUND = toRGBA8888$2(0, 0, 0, 255);
exports.DEFAULT_FOREGROUND = toRGBA8888$2(255, 255, 255, 255);

var Colors = /*#__PURE__*/Object.freeze({
    __proto__: null
});

/**
 * Copyright (c) 2020 The xterm.js authors. All rights reserved.
 * @license MIT
 */
const toRGBA8888$1 = undefined;
const PLACEHOLDER_LENGTH = 4096;
const PLACEHOLDER_HEIGHT = 24;
/**
 * ImageRenderer - terminal frontend extension:
 * - provide primitives for canvas, ImageData, Bitmap (static)
 * - add canvas layer to DOM (browser only for now)
 * - draw image tiles onRender
 */
class ImageRenderer extends Disposable {
    // drawing primitive - canvas
    static createCanvas(localDocument, width, height) {
        /**
         * NOTE: We normally dont care, from which document the canvas
         * gets created, so we can fall back to global document,
         * if the terminal has no document associated yet.
         * This way early image loads before calling .open keep working
         * (still discouraged though, as the metrics will be screwed up).
         * Only the DOM output canvas should be on the terminal's document,
         * which gets explicitly checked in `insertLayerToDom`.
         */
        const canvas = (localDocument || document).createElement('canvas');
        canvas.width = width | 0;
        canvas.height = height | 0;
        return canvas;
    }
    // drawing primitive - ImageData with optional buffer
    static createImageData(ctx, width, height, buffer) {
        if (typeof ImageData !== 'function') {
            const imgData = ctx.createImageData(width, height);
            if (buffer) {
                imgData.data.set(new Uint8ClampedArray(buffer, 0, width * height * 4));
            }
            return imgData;
        }
        return buffer
            ? new ImageData(new Uint8ClampedArray(buffer, 0, width * height * 4), width, height)
            : new ImageData(width, height);
    }
    // drawing primitive - ImageBitmap
    static createImageBitmap(img) {
        if (typeof createImageBitmap !== 'function') {
            return Promise.resolve(undefined);
        }
        return createImageBitmap(img);
    }
    constructor(_terminal) {
        super();
        this._terminal = _terminal;
        this._optionsRefresh = this.register(new MutableDisposable());
        this._oldOpen = this._terminal._core.open;
        this._terminal._core.open = (parent) => {
            var _a;
            (_a = this._oldOpen) === null || _a === void 0 ? void 0 : _a.call(this._terminal._core, parent);
            this._open();
        };
        if (this._terminal._core.screenElement) {
            this._open();
        }
        // hack to spot fontSize changes
        this._optionsRefresh.value = this._terminal._core.optionsService.onOptionChange(option => {
            var _a;
            if (option === 'fontSize') {
                this.rescaleCanvas();
                (_a = this._renderService) === null || _a === void 0 ? void 0 : _a.refreshRows(0, this._terminal.rows);
            }
        });
        this.register(toDisposable(() => {
            var _a;
            this.removeLayerFromDom();
            if (this._terminal._core && this._oldOpen) {
                this._terminal._core.open = this._oldOpen;
                this._oldOpen = undefined;
            }
            if (this._renderService && this._oldSetRenderer) {
                this._renderService.setRenderer = this._oldSetRenderer;
                this._oldSetRenderer = undefined;
            }
            this._renderService = undefined;
            this.canvas = undefined;
            this._ctx = undefined;
            (_a = this._placeholderBitmap) === null || _a === void 0 ? void 0 : _a.close();
            this._placeholderBitmap = undefined;
            this._placeholder = undefined;
        }));
    }
    /**
     * Enable the placeholder.
     */
    showPlaceholder(value) {
        var _a, _b;
        if (value) {
            if (!this._placeholder && this.cellSize.height !== -1) {
                this._createPlaceHolder(Math.max(this.cellSize.height + 1, PLACEHOLDER_HEIGHT));
            }
        }
        else {
            (_a = this._placeholderBitmap) === null || _a === void 0 ? void 0 : _a.close();
            this._placeholderBitmap = undefined;
            this._placeholder = undefined;
        }
        (_b = this._renderService) === null || _b === void 0 ? void 0 : _b.refreshRows(0, this._terminal.rows);
    }
    /**
     * Dimensions of the terminal.
     * Forwarded from internal render service.
     */
    get dimensions() {
        var _a;
        return (_a = this._renderService) === null || _a === void 0 ? void 0 : _a.dimensions;
    }
    /**
     * Current cell size (float).
     */
    get cellSize() {
        var _a, _b;
        return {
            width: ((_a = this.dimensions) === null || _a === void 0 ? void 0 : _a.css.cell.width) || -1,
            height: ((_b = this.dimensions) === null || _b === void 0 ? void 0 : _b.css.cell.height) || -1
        };
    }
    /**
     * Clear a region of the image layer canvas.
     */
    clearLines(start, end) {
        var _a, _b, _c, _d;
        (_a = this._ctx) === null || _a === void 0 ? void 0 : _a.clearRect(0, start * (((_b = this.dimensions) === null || _b === void 0 ? void 0 : _b.css.cell.height) || 0), ((_c = this.dimensions) === null || _c === void 0 ? void 0 : _c.css.canvas.width) || 0, (++end - start) * (((_d = this.dimensions) === null || _d === void 0 ? void 0 : _d.css.cell.height) || 0));
    }
    /**
     * Clear whole image canvas.
     */
    clearAll() {
        var _a, _b, _c;
        (_a = this._ctx) === null || _a === void 0 ? void 0 : _a.clearRect(0, 0, ((_b = this.canvas) === null || _b === void 0 ? void 0 : _b.width) || 0, ((_c = this.canvas) === null || _c === void 0 ? void 0 : _c.height) || 0);
    }
    /**
     * Draw neighboring tiles on the image layer canvas.
     */
    draw(imgSpec, tileId, col, row, count = 1) {
        if (!this._ctx) {
            return;
        }
        const { width, height } = this.cellSize;
        // Don't try to draw anything, if we cannot get valid renderer metrics.
        if (width === -1 || height === -1) {
            return;
        }
        this._rescaleImage(imgSpec, width, height);
        const img = imgSpec.actual;
        const cols = Math.ceil(img.width / width);
        const sx = (tileId % cols) * width;
        const sy = Math.floor(tileId / cols) * height;
        const dx = col * width;
        const dy = row * height;
        // safari bug: never access image source out of bounds
        const finalWidth = count * width + sx > img.width ? img.width - sx : count * width;
        const finalHeight = sy + height > img.height ? img.height - sy : height;
        // Floor all pixel offsets to get stable tile mapping without any overflows.
        // Note: For not pixel perfect aligned cells like in the DOM renderer
        // this will move a tile slightly to the top/left (subpixel range, thus ignore it).
        // FIX #34: avoid striping on displays with pixelDeviceRatio != 1 by ceiling height and width
        this._ctx.drawImage(img, Math.floor(sx), Math.floor(sy), Math.ceil(finalWidth), Math.ceil(finalHeight), Math.floor(dx), Math.floor(dy), Math.ceil(finalWidth), Math.ceil(finalHeight));
    }
    /**
     * Extract a single tile from an image.
     */
    extractTile(imgSpec, tileId) {
        const { width, height } = this.cellSize;
        // Don't try to draw anything, if we cannot get valid renderer metrics.
        if (width === -1 || height === -1) {
            return;
        }
        this._rescaleImage(imgSpec, width, height);
        const img = imgSpec.actual;
        const cols = Math.ceil(img.width / width);
        const sx = (tileId % cols) * width;
        const sy = Math.floor(tileId / cols) * height;
        const finalWidth = width + sx > img.width ? img.width - sx : width;
        const finalHeight = sy + height > img.height ? img.height - sy : height;
        const canvas = ImageRenderer.createCanvas(this.document, finalWidth, finalHeight);
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, Math.floor(sx), Math.floor(sy), Math.floor(finalWidth), Math.floor(finalHeight), 0, 0, Math.floor(finalWidth), Math.floor(finalHeight));
            return canvas;
        }
    }
    /**
     * Draw a line with placeholder on the image layer canvas.
     */
    drawPlaceholder(col, row, count = 1) {
        if (this._ctx) {
            const { width, height } = this.cellSize;
            // Don't try to draw anything, if we cannot get valid renderer metrics.
            if (width === -1 || height === -1) {
                return;
            }
            if (!this._placeholder) {
                this._createPlaceHolder(Math.max(height + 1, PLACEHOLDER_HEIGHT));
            }
            else if (height >= this._placeholder.height) {
                this._createPlaceHolder(height + 1);
            }
            if (!this._placeholder)
                return;
            this._ctx.drawImage(this._placeholderBitmap || this._placeholder, col * width, (row * height) % 2 ? 0 : 1, // needs %2 offset correction
            width * count, height, col * width, row * height, width * count, height);
        }
    }
    /**
     * Rescale image layer canvas if needed.
     * Checked once from `ImageStorage.render`.
     */
    rescaleCanvas() {
        if (!this.canvas) {
            return;
        }
        if (this.canvas.width !== this.dimensions.css.canvas.width || this.canvas.height !== this.dimensions.css.canvas.height) {
            this.canvas.width = this.dimensions.css.canvas.width || 0;
            this.canvas.height = this.dimensions.css.canvas.height || 0;
        }
    }
    /**
     * Rescale image in storage if needed.
     */
    _rescaleImage(spec, currentWidth, currentHeight) {
        if (currentWidth === spec.actualCellSize.width && currentHeight === spec.actualCellSize.height) {
            return;
        }
        const { width: originalWidth, height: originalHeight } = spec.origCellSize;
        if (currentWidth === originalWidth && currentHeight === originalHeight) {
            spec.actual = spec.orig;
            spec.actualCellSize.width = originalWidth;
            spec.actualCellSize.height = originalHeight;
            return;
        }
        const canvas = ImageRenderer.createCanvas(this.document, Math.ceil(spec.orig.width * currentWidth / originalWidth), Math.ceil(spec.orig.height * currentHeight / originalHeight));
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(spec.orig, 0, 0, canvas.width, canvas.height);
            spec.actual = canvas;
            spec.actualCellSize.width = currentWidth;
            spec.actualCellSize.height = currentHeight;
        }
    }
    /**
     * Lazy init for the renderer.
     */
    _open() {
        this._renderService = this._terminal._core._renderService;
        this._oldSetRenderer = this._renderService.setRenderer.bind(this._renderService);
        this._renderService.setRenderer = (renderer) => {
            var _a;
            this.removeLayerFromDom();
            (_a = this._oldSetRenderer) === null || _a === void 0 ? void 0 : _a.call(this._renderService, renderer);
        };
    }
    insertLayerToDom() {
        var _a, _b;
        // make sure that the terminal is attached to a document and to DOM
        if (this.document && this._terminal._core.screenElement) {
            if (!this.canvas) {
                this.canvas = ImageRenderer.createCanvas(this.document, ((_a = this.dimensions) === null || _a === void 0 ? void 0 : _a.css.canvas.width) || 0, ((_b = this.dimensions) === null || _b === void 0 ? void 0 : _b.css.canvas.height) || 0);
                this.canvas.classList.add('xterm-image-layer');
                this._terminal._core.screenElement.appendChild(this.canvas);
                this._ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
                this.clearAll();
            }
        }
        else {
            console.warn('image addon: cannot insert output canvas to DOM, missing document or screenElement');
        }
    }
    removeLayerFromDom() {
        if (this.canvas) {
            this._ctx = undefined;
            this.canvas.remove();
            this.canvas = undefined;
        }
    }
    _createPlaceHolder(height = PLACEHOLDER_HEIGHT) {
        var _a;
        (_a = this._placeholderBitmap) === null || _a === void 0 ? void 0 : _a.close();
        this._placeholderBitmap = undefined;
        // create blueprint to fill placeholder with
        const bWidth = 32; // must be 2^n
        const blueprint = ImageRenderer.createCanvas(this.document, bWidth, height);
        const ctx = blueprint.getContext('2d', { alpha: false });
        if (!ctx)
            return;
        const imgData = ImageRenderer.createImageData(ctx, bWidth, height);
        const d32 = new Uint32Array(imgData.data.buffer);
        const black = toRGBA8888$1(0, 0, 0);
        const white = toRGBA8888$1(255, 255, 255);
        d32.fill(black);
        for (let y = 0; y < height; ++y) {
            const shift = y % 2;
            const offset = y * bWidth;
            for (let x = 0; x < bWidth; x += 2) {
                d32[offset + x + shift] = white;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        // create placeholder line, width aligned to blueprint width
        const width = (screen.width + bWidth - 1) & ~(bWidth - 1) || PLACEHOLDER_LENGTH;
        this._placeholder = ImageRenderer.createCanvas(this.document, width, height);
        const ctx2 = this._placeholder.getContext('2d', { alpha: false });
        if (!ctx2) {
            this._placeholder = undefined;
            return;
        }
        for (let i = 0; i < width; i += bWidth) {
            ctx2.drawImage(blueprint, i, 0);
        }
        ImageRenderer.createImageBitmap(this._placeholder).then(bitmap => this._placeholderBitmap = bitmap);
    }
    get document() {
        var _a;
        return (_a = this._terminal._core._coreBrowserService) === null || _a === void 0 ? void 0 : _a.window.document;
    }
}

/**
 * Copyright (c) 2020 The xterm.js authors. All rights reserved.
 * @license MIT
 */
// fallback default cell size
const CELL_SIZE_DEFAULT = {
    width: 7,
    height: 14
};
/**
 * Extend extended attribute to also hold image tile information.
 *
 * Object definition is copied from base repo to fully mimick its behavior.
 * Image data is added as additional public properties `imageId` and `tileId`.
 */
class ExtendedAttrsImage {
    get ext() {
        if (this._urlId) {
            return ((this._ext & ~469762048 /* ExtFlags.UNDERLINE_STYLE */) |
                (this.underlineStyle << 26));
        }
        return this._ext;
    }
    set ext(value) { this._ext = value; }
    get underlineStyle() {
        // Always return the URL style if it has one
        if (this._urlId) {
            return 5 /* UnderlineStyle.DASHED */;
        }
        return (this._ext & 469762048 /* ExtFlags.UNDERLINE_STYLE */) >> 26;
    }
    set underlineStyle(value) {
        this._ext &= ~469762048 /* ExtFlags.UNDERLINE_STYLE */;
        this._ext |= (value << 26) & 469762048 /* ExtFlags.UNDERLINE_STYLE */;
    }
    get underlineColor() {
        return this._ext & (50331648 /* Attributes.CM_MASK */ | 16777215 /* Attributes.RGB_MASK */);
    }
    set underlineColor(value) {
        this._ext &= ~(50331648 /* Attributes.CM_MASK */ | 16777215 /* Attributes.RGB_MASK */);
        this._ext |= value & (50331648 /* Attributes.CM_MASK */ | 16777215 /* Attributes.RGB_MASK */);
    }
    get underlineVariantOffset() {
        const val = (this._ext & 3758096384 /* ExtFlags.VARIANT_OFFSET */) >> 29;
        if (val < 0) {
            return val ^ 0xFFFFFFF8;
        }
        return val;
    }
    set underlineVariantOffset(value) {
        this._ext &= ~3758096384 /* ExtFlags.VARIANT_OFFSET */;
        this._ext |= (value << 29) & 3758096384 /* ExtFlags.VARIANT_OFFSET */;
    }
    get urlId() {
        return this._urlId;
    }
    set urlId(value) {
        this._urlId = value;
    }
    constructor(ext = 0, urlId = 0, imageId = -1, tileId = -1) {
        this.imageId = imageId;
        this.tileId = tileId;
        this._ext = 0;
        this._urlId = 0;
        this._ext = ext;
        this._urlId = urlId;
    }
    clone() {
        /**
         * Technically we dont need a clone variant of ExtendedAttrsImage,
         * as we never clone a cell holding image data.
         * Note: Clone is only meant to be used by the InputHandler for
         * sticky attributes, which is never the case for image data.
         * We still provide a proper clone method to reflect the full ext attr
         * state in case there are future use cases for clone.
         */
        return new ExtendedAttrsImage(this._ext, this._urlId, this.imageId, this.tileId);
    }
    isEmpty() {
        return this.underlineStyle === 0 /* UnderlineStyle.NONE */ && this._urlId === 0 && this.imageId === -1;
    }
}
const EMPTY_ATTRS = new ExtendedAttrsImage();
/**
 * ImageStorage - extension of CoreTerminal:
 * - hold image data
 * - write/read image data to/from buffer
 *
 * TODO: image composition for overwrites
 */
class ImageStorage {
    constructor(_terminal, _renderer, _opts) {
        this._terminal = _terminal;
        this._renderer = _renderer;
        this._opts = _opts;
        // storage
        this._images = new Map();
        // last used id
        this._lastId = 0;
        // last evicted id
        this._lowestId = 0;
        // whether a full clear happened before
        this._fullyCleared = false;
        // whether render should do a full clear
        this._needsFullClear = false;
        // hard limit of stored pixels (fallback limit of 10 MB)
        this._pixelLimit = 2500000;
        try {
            this.setLimit(this._opts.storageLimit);
        }
        catch (e) {
            console.error(e.message);
            console.warn(`storageLimit is set to ${this.getLimit()} MB`);
        }
        this._viewportMetrics = {
            cols: this._terminal.cols,
            rows: this._terminal.rows
        };
    }
    dispose() {
        this.reset();
    }
    reset() {
        var _a;
        for (const spec of this._images.values()) {
            (_a = spec.marker) === null || _a === void 0 ? void 0 : _a.dispose();
        }
        // NOTE: marker.dispose above already calls ImageBitmap.close
        // therefore we can just wipe the map here
        this._images.clear();
        this._renderer.clearAll();
    }
    getLimit() {
        return this._pixelLimit * 4 / 1000000;
    }
    setLimit(value) {
        if (value < 0.5 || value > 1000) {
            throw RangeError('invalid storageLimit, should be at least 0.5 MB and not exceed 1G');
        }
        this._pixelLimit = (value / 4 * 1000000) >>> 0;
        this._evictOldest(0);
    }
    getUsage() {
        return this._getStoredPixels() * 4 / 1000000;
    }
    _getStoredPixels() {
        let storedPixels = 0;
        for (const spec of this._images.values()) {
            if (spec.orig) {
                storedPixels += spec.orig.width * spec.orig.height;
                if (spec.actual && spec.actual !== spec.orig) {
                    storedPixels += spec.actual.width * spec.actual.height;
                }
            }
        }
        return storedPixels;
    }
    _delImg(id) {
        const spec = this._images.get(id);
        this._images.delete(id);
        // FIXME: really ugly workaround to get bitmaps deallocated :(
        if (spec && window.ImageBitmap && spec.orig instanceof ImageBitmap) {
            spec.orig.close();
        }
    }
    /**
     * Wipe canvas and images on alternate buffer.
     */
    wipeAlternate() {
        var _a;
        // remove all alternate tagged images
        const zero = [];
        for (const [id, spec] of this._images.entries()) {
            if (spec.bufferType === 'alternate') {
                (_a = spec.marker) === null || _a === void 0 ? void 0 : _a.dispose();
                zero.push(id);
            }
        }
        for (const id of zero) {
            this._delImg(id);
        }
        // mark canvas to be wiped on next render
        this._needsFullClear = true;
        this._fullyCleared = false;
    }
    /**
     * Only advance text cursor.
     * This is an edge case from empty sixels carrying only a height but no pixels.
     * Partially fixes https://github.com/jerch/xterm-addon-image/issues/37.
     */
    advanceCursor(height) {
        if (this._opts.sixelScrolling) {
            let cellSize = this._renderer.cellSize;
            if (cellSize.width === -1 || cellSize.height === -1) {
                cellSize = CELL_SIZE_DEFAULT;
            }
            const rows = Math.ceil(height / cellSize.height);
            for (let i = 1; i < rows; ++i) {
                this._terminal._core._inputHandler.lineFeed();
            }
        }
    }
    /**
     * Method to add an image to the storage.
     */
    addImage(img) {
        var _a;
        // never allow storage to exceed memory limit
        this._evictOldest(img.width * img.height);
        // calc rows x cols needed to display the image
        let cellSize = this._renderer.cellSize;
        if (cellSize.width === -1 || cellSize.height === -1) {
            cellSize = CELL_SIZE_DEFAULT;
        }
        const cols = Math.ceil(img.width / cellSize.width);
        const rows = Math.ceil(img.height / cellSize.height);
        const imageId = ++this._lastId;
        const buffer = this._terminal._core.buffer;
        const termCols = this._terminal.cols;
        const termRows = this._terminal.rows;
        const originX = buffer.x;
        const originY = buffer.y;
        let offset = originX;
        let tileCount = 0;
        if (!this._opts.sixelScrolling) {
            buffer.x = 0;
            buffer.y = 0;
            offset = 0;
        }
        this._terminal._core._inputHandler._dirtyRowTracker.markDirty(buffer.y);
        for (let row = 0; row < rows; ++row) {
            const line = buffer.lines.get(buffer.y + buffer.ybase);
            for (let col = 0; col < cols; ++col) {
                if (offset + col >= termCols)
                    break;
                this._writeToCell(line, offset + col, imageId, row * cols + col);
                tileCount++;
            }
            if (this._opts.sixelScrolling) {
                if (row < rows - 1)
                    this._terminal._core._inputHandler.lineFeed();
            }
            else {
                if (++buffer.y >= termRows)
                    break;
            }
            buffer.x = offset;
        }
        this._terminal._core._inputHandler._dirtyRowTracker.markDirty(buffer.y);
        // cursor positioning modes
        if (this._opts.sixelScrolling) {
            buffer.x = offset;
        }
        else {
            buffer.x = originX;
            buffer.y = originY;
        }
        // deleted images with zero tile count
        const zero = [];
        for (const [id, spec] of this._images.entries()) {
            if (spec.tileCount < 1) {
                (_a = spec.marker) === null || _a === void 0 ? void 0 : _a.dispose();
                zero.push(id);
            }
        }
        for (const id of zero) {
            this._delImg(id);
        }
        // eviction marker:
        // delete the image when the marker gets disposed
        const endMarker = this._terminal.registerMarker(0);
        endMarker === null || endMarker === void 0 ? void 0 : endMarker.onDispose(() => {
            const spec = this._images.get(imageId);
            if (spec) {
                this._delImg(imageId);
            }
        });
        // since markers do not work on alternate for some reason,
        // we evict images here manually
        if (this._terminal.buffer.active.type === 'alternate') {
            this._evictOnAlternate();
        }
        // create storage entry
        const imgSpec = {
            orig: img,
            origCellSize: cellSize,
            actual: img,
            actualCellSize: Object.assign({}, cellSize),
            marker: endMarker || undefined,
            tileCount,
            bufferType: this._terminal.buffer.active.type
        };
        // finally add the image
        this._images.set(imageId, imgSpec);
    }
    /**
     * Render method. Collects buffer information and triggers
     * canvas updates.
     */
    // TODO: Should we move this to the ImageRenderer?
    render(range) {
        // setup image canvas in case we have none yet, but have images in store
        if (!this._renderer.canvas && this._images.size) {
            this._renderer.insertLayerToDom();
            // safety measure - in case we cannot spawn a canvas at all, just exit
            if (!this._renderer.canvas) {
                return;
            }
        }
        // rescale if needed
        this._renderer.rescaleCanvas();
        // exit early if we dont have any images to test for
        if (!this._images.size) {
            if (!this._fullyCleared) {
                this._renderer.clearAll();
                this._fullyCleared = true;
                this._needsFullClear = false;
            }
            if (this._renderer.canvas) {
                this._renderer.removeLayerFromDom();
            }
            return;
        }
        // buffer switches force a full clear
        if (this._needsFullClear) {
            this._renderer.clearAll();
            this._fullyCleared = true;
            this._needsFullClear = false;
        }
        const { start, end } = range;
        const buffer = this._terminal._core.buffer;
        const cols = this._terminal._core.cols;
        // clear drawing area
        this._renderer.clearLines(start, end);
        // walk all cells in viewport and draw tiles found
        for (let row = start; row <= end; ++row) {
            const line = buffer.lines.get(row + buffer.ydisp);
            if (!line)
                return;
            for (let col = 0; col < cols; ++col) {
                if (line.getBg(col) & 268435456 /* BgFlags.HAS_EXTENDED */) {
                    let e = line._extendedAttrs[col] || EMPTY_ATTRS;
                    const imageId = e.imageId;
                    if (imageId === undefined || imageId === -1) {
                        continue;
                    }
                    const imgSpec = this._images.get(imageId);
                    if (e.tileId !== -1) {
                        const startTile = e.tileId;
                        const startCol = col;
                        let count = 1;
                        /**
                         * merge tiles to the right into a single draw call, if:
                         * - not at end of line
                         * - cell has same image id
                         * - cell has consecutive tile id
                         */
                        while (++col < cols
                            && (line.getBg(col) & 268435456 /* BgFlags.HAS_EXTENDED */)
                            && (e = line._extendedAttrs[col] || EMPTY_ATTRS)
                            && (e.imageId === imageId)
                            && (e.tileId === startTile + count)) {
                            count++;
                        }
                        col--;
                        if (imgSpec) {
                            if (imgSpec.actual) {
                                this._renderer.draw(imgSpec, startTile, startCol, row, count);
                            }
                        }
                        else if (this._opts.showPlaceholder) {
                            this._renderer.drawPlaceholder(startCol, row, count);
                        }
                        this._fullyCleared = false;
                    }
                }
            }
        }
    }
    viewportResize(metrics) {
        var _a;
        // exit early if we have nothing in storage
        if (!this._images.size) {
            this._viewportMetrics = metrics;
            return;
        }
        // handle only viewport width enlargements, exit all other cases
        // TODO: needs patch for tile counter
        if (this._viewportMetrics.cols >= metrics.cols) {
            this._viewportMetrics = metrics;
            return;
        }
        // walk scrollbuffer at old col width to find all possible expansion matches
        const buffer = this._terminal._core.buffer;
        const rows = buffer.lines.length;
        const oldCol = this._viewportMetrics.cols - 1;
        for (let row = 0; row < rows; ++row) {
            const line = buffer.lines.get(row);
            if (line.getBg(oldCol) & 268435456 /* BgFlags.HAS_EXTENDED */) {
                const e = line._extendedAttrs[oldCol] || EMPTY_ATTRS;
                const imageId = e.imageId;
                if (imageId === undefined || imageId === -1) {
                    continue;
                }
                const imgSpec = this._images.get(imageId);
                if (!imgSpec) {
                    continue;
                }
                // found an image tile at oldCol, check if it qualifies for right exapansion
                const tilesPerRow = Math.ceil((((_a = imgSpec.actual) === null || _a === void 0 ? void 0 : _a.width) || 0) / imgSpec.actualCellSize.width);
                if ((e.tileId % tilesPerRow) + 1 >= tilesPerRow) {
                    continue;
                }
                // expand only if right side is empty (nothing got wrapped from below)
                let hasData = false;
                for (let rightCol = oldCol + 1; rightCol > metrics.cols; ++rightCol) {
                    if (line._data[rightCol * 3 /* Cell.SIZE */ + 0 /* Cell.CONTENT */] & 4194303 /* Content.HAS_CONTENT_MASK */) {
                        hasData = true;
                        break;
                    }
                }
                if (hasData) {
                    continue;
                }
                // do right expansion on terminal buffer
                const end = Math.min(metrics.cols, tilesPerRow - (e.tileId % tilesPerRow) + oldCol);
                let lastTile = e.tileId;
                for (let expandCol = oldCol + 1; expandCol < end; ++expandCol) {
                    this._writeToCell(line, expandCol, imageId, ++lastTile);
                    imgSpec.tileCount++;
                }
            }
        }
        // store new viewport metrics
        this._viewportMetrics = metrics;
    }
    /**
     * Retrieve original canvas at buffer position.
     */
    getImageAtBufferCell(x, y) {
        var _a, _b;
        const buffer = this._terminal._core.buffer;
        const line = buffer.lines.get(y);
        if (line && line.getBg(x) & 268435456 /* BgFlags.HAS_EXTENDED */) {
            const e = line._extendedAttrs[x] || EMPTY_ATTRS;
            if (e.imageId && e.imageId !== -1) {
                const orig = (_a = this._images.get(e.imageId)) === null || _a === void 0 ? void 0 : _a.orig;
                if (window.ImageBitmap && orig instanceof ImageBitmap) {
                    const canvas = ImageRenderer.createCanvas(window.document, orig.width, orig.height);
                    (_b = canvas.getContext('2d')) === null || _b === void 0 ? void 0 : _b.drawImage(orig, 0, 0, orig.width, orig.height);
                    return canvas;
                }
                return orig;
            }
        }
    }
    /**
     * Extract active single tile at buffer position.
     */
    extractTileAtBufferCell(x, y) {
        const buffer = this._terminal._core.buffer;
        const line = buffer.lines.get(y);
        if (line && line.getBg(x) & 268435456 /* BgFlags.HAS_EXTENDED */) {
            const e = line._extendedAttrs[x] || EMPTY_ATTRS;
            if (e.imageId && e.imageId !== -1 && e.tileId !== -1) {
                const spec = this._images.get(e.imageId);
                if (spec) {
                    return this._renderer.extractTile(spec, e.tileId);
                }
            }
        }
    }
    // TODO: Do we need some blob offloading tricks here to avoid early eviction?
    // also see https://stackoverflow.com/questions/28307789/is-there-any-limitation-on-javascript-max-blob-size
    _evictOldest(room) {
        var _a;
        const used = this._getStoredPixels();
        let current = used;
        while (this._pixelLimit < current + room && this._images.size) {
            const spec = this._images.get(++this._lowestId);
            if (spec && spec.orig) {
                current -= spec.orig.width * spec.orig.height;
                if (spec.actual && spec.orig !== spec.actual) {
                    current -= spec.actual.width * spec.actual.height;
                }
                (_a = spec.marker) === null || _a === void 0 ? void 0 : _a.dispose();
                this._delImg(this._lowestId);
            }
        }
        return used - current;
    }
    _writeToCell(line, x, imageId, tileId) {
        if (line._data[x * 3 /* Cell.SIZE */ + 2 /* Cell.BG */] & 268435456 /* BgFlags.HAS_EXTENDED */) {
            const old = line._extendedAttrs[x];
            if (old) {
                if (old.imageId !== undefined) {
                    // found an old ExtendedAttrsImage, since we know that
                    // they are always isolated instances (single cell usage),
                    // we can re-use it and just update their id entries
                    const oldSpec = this._images.get(old.imageId);
                    if (oldSpec) {
                        // early eviction for in-viewport overwrites
                        oldSpec.tileCount--;
                    }
                    old.imageId = imageId;
                    old.tileId = tileId;
                    return;
                }
                // found a plain ExtendedAttrs instance, clone it to new entry
                line._extendedAttrs[x] = new ExtendedAttrsImage(old.ext, old.urlId, imageId, tileId);
                return;
            }
        }
        // fall-through: always create new ExtendedAttrsImage entry
        line._data[x * 3 /* Cell.SIZE */ + 2 /* Cell.BG */] |= 268435456 /* BgFlags.HAS_EXTENDED */;
        line._extendedAttrs[x] = new ExtendedAttrsImage(0, 0, imageId, tileId);
    }
    _evictOnAlternate() {
        var _a, _b;
        // nullify tile count of all images on alternate buffer
        for (const spec of this._images.values()) {
            if (spec.bufferType === 'alternate') {
                spec.tileCount = 0;
            }
        }
        // re-count tiles on whole buffer
        const buffer = this._terminal._core.buffer;
        for (let y = 0; y < this._terminal.rows; ++y) {
            const line = buffer.lines.get(y);
            if (!line) {
                continue;
            }
            for (let x = 0; x < this._terminal.cols; ++x) {
                if (line._data[x * 3 /* Cell.SIZE */ + 2 /* Cell.BG */] & 268435456 /* BgFlags.HAS_EXTENDED */) {
                    const imgId = (_a = line._extendedAttrs[x]) === null || _a === void 0 ? void 0 : _a.imageId;
                    if (imgId) {
                        const spec = this._images.get(imgId);
                        if (spec) {
                            spec.tileCount++;
                        }
                    }
                }
            }
        }
        // deleted images with zero tile count
        const zero = [];
        for (const [id, spec] of this._images.entries()) {
            if (spec.bufferType === 'alternate' && !spec.tileCount) {
                (_b = spec.marker) === null || _b === void 0 ? void 0 : _b.dispose();
                zero.push(id);
            }
        }
        for (const id of zero) {
            this._delImg(id);
        }
    }
}

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (c) 2023 The xterm.js authors. All rights reserved.
 * @license MIT
 */
const inwasm_1 = require("inwasm");
/**
 * wasm base64 decoder.
 */
const wasmDecode = (0, inwasm_1.InWasm)(/*inwasm#6ccf778dadd2ee40:rdef-start:"decode"*/{s:1,t:0,d:'AGFzbQEAAAABBQFgAAF/Ag8BA2VudgZtZW1vcnkCAAEDAwIAAAcNAgNkZWMAAANlbmQAAQqxAwKuAQEFf0GIKCgCAEGgKGohAUGEKCgCACIAQYAoKAIAQQFrQXxxIgJIBEAgAkGgKGohAyAAQaAoaiEAA0AgAC0AA0ECdCgCgCAgAC0AAkECdCgCgBggAC0AAUECdCgCgBAgAC0AAEECdCgCgAhycnIiBEH///8HSwRAQQEPCyABIAQ2AgAgAUEDaiEBIABBBGoiACADSQ0ACwtBhCggAjYCAEGIKCABQaAoazYCAEEAC/4BAQZ/AkBBgCgoAgAiAUGEKCgCACIAa0EFTgRAQQEhAxAADQFBgCgoAgAhAUGEKCgCACEAC0EBIQMgASAAayIEQQJIDQAgAEGhKGotAABBAnQoAoAQIABBoChqLQAAQQJ0KAKACHIhAQJAIARBAkYEQEEBIQIMAQtBASECIAAtAKIoIgVBPUcEQEECIQIgBUECdCgCgBggAXIhAQsgBEEERw0AIAAtAKMoIgBBPUYNACACQQFqIQIgAEECdCgCgCAgAXIhAQsgAUH///8HSw0AQYgoKAIAQaAoaiABNgIAQYgoQYgoKAIAIAJqIgA2AgAgAEGQKCgCAEchAwsgAwsAdglwcm9kdWNlcnMBDHByb2Nlc3NlZC1ieQEFY2xhbmdWMTguMC4wIChodHRwczovL2dpdGh1Yi5jb20vbGx2bS9sbHZtLXByb2plY3QgZDFlNjg1ZGY0NWRjNTk0NGI0M2QyNTQ3ZDAxMzhjZDRhM2VlNGVmZSkALA90YXJnZXRfZmVhdHVyZXMCKw9tdXRhYmxlLWdsb2JhbHMrCHNpZ24tZXh0'}/*inwasm#6ccf778dadd2ee40:rdef-end:"decode"*/);
// base64 map
const MAP = new Uint8Array('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .map(el => el.charCodeAt(0)));
// init decoder maps in LE order
const D = new Uint32Array(1024);
D.fill(0xFF000000);
for (let i = 0; i < MAP.length; ++i)
    D[MAP[i]] = i << 2;
for (let i = 0; i < MAP.length; ++i)
    D[256 + MAP[i]] = i >> 4 | ((i << 4) & 0xFF) << 8;
for (let i = 0; i < MAP.length; ++i)
    D[512 + MAP[i]] = (i >> 2) << 8 | ((i << 6) & 0xFF) << 16;
for (let i = 0; i < MAP.length; ++i)
    D[768 + MAP[i]] = i << 16;
const EMPTY = new Uint8Array(0);
/**
 * base64 streamline inplace decoder.
 *
 * Features / assumptions:
 * - optimized uint32 read/write (only LE support!)
 * - lazy chunkwise decoding
 * - errors out on any non base64 chars (no support for NL formatted base64)
 * - decodes in wasm
 * - inplace decoding to save memory
 * - supports a keepSize for lazy memory release
 */
class Base64Decoder {
    constructor(keepSize) {
        this.keepSize = keepSize;
    }
    /**
     * Currently decoded bytes (borrowed).
     * Must be accessed before calling `release` or `init`.
     */
    get data8() {
        return this._inst ? this._d.subarray(0, this._m32[1282 /* P32.STATE_DP */]) : EMPTY;
    }
    /**
     * Release memory conditionally based on `keepSize`.
     * If memory gets released, also the wasm instance will be freed and recreated on next `init`,
     * otherwise the instance will be reused.
     */
    release() {
        if (!this._inst)
            return;
        if (this._mem.buffer.byteLength > this.keepSize) {
            this._inst = this._m32 = this._d = this._mem = null;
        }
        else {
            this._m32[1280 /* P32.STATE_WP */] = 0;
            this._m32[1281 /* P32.STATE_SP */] = 0;
            this._m32[1282 /* P32.STATE_DP */] = 0;
        }
    }
    /**
     * Initializes the decoder for new base64 data.
     * Must be called before doing any decoding attempts.
     * `size` is the amount of decoded bytes to be expected.
     * The method will either spawn a new wasm instance or grow
     * the needed memory of an existing instance.
     */
    init(size) {
        let m = this._m32;
        const bytes = (Math.ceil(size / 3) + 1288 /* P32.STATE_DATA */) * 4;
        if (!this._inst) {
            this._mem = new WebAssembly.Memory({ initial: Math.ceil(bytes / 65536) });
            this._inst = wasmDecode({ env: { memory: this._mem } });
            m = new Uint32Array(this._mem.buffer, 0);
            m.set(D, 256 /* P32.D0 */);
            this._d = new Uint8Array(this._mem.buffer, 1288 /* P32.STATE_DATA */ * 4);
        }
        else if (this._mem.buffer.byteLength < bytes) {
            this._mem.grow(Math.ceil((bytes - this._mem.buffer.byteLength) / 65536));
            m = new Uint32Array(this._mem.buffer, 0);
            this._d = new Uint8Array(this._mem.buffer, 1288 /* P32.STATE_DATA */ * 4);
        }
        m[1284 /* P32.STATE_BSIZE */] = size;
        m[1283 /* P32.STATE_ESIZE */] = Math.ceil(size / 3) * 4;
        m[1280 /* P32.STATE_WP */] = 0;
        m[1281 /* P32.STATE_SP */] = 0;
        m[1282 /* P32.STATE_DP */] = 0;
        this._m32 = m;
    }
    /**
     * Put bytes in `data` from `start` to `end` (exclusive) into the decoder.
     * Also decodes base64 data inplace once the payload exceeds 2^17 bytes.
     * Returns 1 on error, else 0.
     */
    put(data, start, end) {
        if (!this._inst)
            return 1;
        const m = this._m32;
        if (end - start + m[1280 /* P32.STATE_WP */] > m[1283 /* P32.STATE_ESIZE */])
            return 1;
        this._d.set(data.subarray(start, end), m[1280 /* P32.STATE_WP */]);
        m[1280 /* P32.STATE_WP */] += end - start;
        // max chunk in input handler is 2^17, try to run in "tandem mode"
        // also assures that we dont run into illegal offsets in the wasm part
        return m[1280 /* P32.STATE_WP */] - m[1281 /* P32.STATE_SP */] >= 131072 ? this._inst.exports.dec() : 0;
    }
    /**
     * End the current decoding.
     * Decodes leftover payload and finally checks for the correct amount of
     * decoded bytes by comparing to the value given to `init`.
     * Returns 1 on error, else 0.
     */
    end() {
        return this._inst ? this._inst.exports.end() : 1;
    }
}
exports.default = Base64Decoder;

var Base64Decoder$1 = /*#__PURE__*/Object.freeze({
    __proto__: null
});

/**
 * Copyright (c) 2023 The xterm.js authors. All rights reserved.
 * @license MIT
 */
// field value decoders
// ASCII bytes to string
function toStr(data) {
    let s = '';
    for (let i = 0; i < data.length; ++i) {
        s += String.fromCharCode(data[i]);
    }
    return s;
}
// digits to integer
function toInt(data) {
    let v = 0;
    for (let i = 0; i < data.length; ++i) {
        if (data[i] < 48 || data[i] > 57) {
            throw new Error('illegal char');
        }
        v = v * 10 + data[i] - 48;
    }
    return v;
}
// check for correct size entry
function toSize(data) {
    const v = toStr(data);
    if (!v.match(/^((auto)|(\d+?((px)|(%)){0,1}))$/)) {
        throw new Error('illegal size');
    }
    return v;
}
// name is base64 encoded utf-8
function toName(data) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(toStr(data), 'base64').toString();
    }
    const bs = atob(toStr(data));
    const b = new Uint8Array(bs.length);
    for (let i = 0; i < b.length; ++i) {
        b[i] = bs.charCodeAt(i);
    }
    return new TextDecoder().decode(b);
}
const DECODERS = {
    inline: toInt,
    size: toInt,
    name: toName,
    width: toSize,
    height: toSize,
    preserveAspectRatio: toInt
};
const FILE_MARKER = [70, 105, 108, 101];
const MAX_FIELDCHARS = 1024;
class HeaderParser {
    constructor() {
        this.state = 0 /* HeaderState.START */;
        this._buffer = new Uint32Array(MAX_FIELDCHARS);
        this._position = 0;
        this._key = '';
        this.fields = {};
    }
    reset() {
        this._buffer.fill(0);
        this.state = 0 /* HeaderState.START */;
        this._position = 0;
        this.fields = {};
        this._key = '';
    }
    parse(data, start, end) {
        let state = this.state;
        let pos = this._position;
        const buffer = this._buffer;
        if (state === 1 /* HeaderState.ABORT */ || state === 4 /* HeaderState.END */)
            return -1;
        if (state === 0 /* HeaderState.START */ && pos > 6)
            return -1;
        for (let i = start; i < end; ++i) {
            const c = data[i];
            switch (c) {
                case 59: // ;
                    if (!this._storeValue(pos))
                        return this._a();
                    state = 2 /* HeaderState.KEY */;
                    pos = 0;
                    break;
                case 61: // =
                    if (state === 0 /* HeaderState.START */) {
                        for (let k = 0; k < FILE_MARKER.length; ++k) {
                            if (buffer[k] !== FILE_MARKER[k])
                                return this._a();
                        }
                        state = 2 /* HeaderState.KEY */;
                        pos = 0;
                    }
                    else if (state === 2 /* HeaderState.KEY */) {
                        if (!this._storeKey(pos))
                            return this._a();
                        state = 3 /* HeaderState.VALUE */;
                        pos = 0;
                    }
                    else if (state === 3 /* HeaderState.VALUE */) {
                        if (pos >= MAX_FIELDCHARS)
                            return this._a();
                        buffer[pos++] = c;
                    }
                    break;
                case 58: // :
                    if (state === 3 /* HeaderState.VALUE */) {
                        if (!this._storeValue(pos))
                            return this._a();
                    }
                    this.state = 4 /* HeaderState.END */;
                    return i + 1;
                default:
                    if (pos >= MAX_FIELDCHARS)
                        return this._a();
                    buffer[pos++] = c;
            }
        }
        this.state = state;
        this._position = pos;
        return -2;
    }
    _a() {
        this.state = 1 /* HeaderState.ABORT */;
        return -1;
    }
    _storeKey(pos) {
        const k = toStr(this._buffer.subarray(0, pos));
        if (k) {
            this._key = k;
            this.fields[k] = null;
            return true;
        }
        return false;
    }
    _storeValue(pos) {
        if (this._key) {
            try {
                const v = this._buffer.slice(0, pos);
                this.fields[this._key] = DECODERS[this._key] ? DECODERS[this._key](v) : v;
            }
            catch (e) {
                return false;
            }
            return true;
        }
        return false;
    }
}

/**
 * Copyright (c) 2023 The xterm.js authors. All rights reserved.
 * @license MIT
 */
const UNSUPPORTED_TYPE = {
    mime: 'unsupported',
    width: 0,
    height: 0
};
function imageType(d) {
    if (d.length < 24) {
        return UNSUPPORTED_TYPE;
    }
    const d32 = new Uint32Array(d.buffer, d.byteOffset, 6);
    // PNG: 89 50 4E 47 0D 0A 1A 0A (8 first bytes == magic number for PNG)
    // + first chunk must be IHDR
    if (d32[0] === 0x474E5089 && d32[1] === 0x0A1A0A0D && d32[3] === 0x52444849) {
        return {
            mime: 'image/png',
            width: d[16] << 24 | d[17] << 16 | d[18] << 8 | d[19],
            height: d[20] << 24 | d[21] << 16 | d[22] << 8 | d[23]
        };
    }
    // JPEG: FF D8 FF E0 xx xx JFIF  or  FF D8 FF E1 xx xx Exif 00 00
    if ((d32[0] === 0xE0FFD8FF || d32[0] === 0xE1FFD8FF)
        && ((d[6] === 0x4a && d[7] === 0x46 && d[8] === 0x49 && d[9] === 0x46)
            || (d[6] === 0x45 && d[7] === 0x78 && d[8] === 0x69 && d[9] === 0x66))) {
        const [width, height] = jpgSize(d);
        return { mime: 'image/jpeg', width, height };
    }
    // GIF: GIF87a or GIF89a
    if (d32[0] === 0x38464947 && (d[4] === 0x37 || d[4] === 0x39) && d[5] === 0x61) {
        return {
            mime: 'image/gif',
            width: d[7] << 8 | d[6],
            height: d[9] << 8 | d[8]
        };
    }
    return UNSUPPORTED_TYPE;
}
function jpgSize(d) {
    const len = d.length;
    let i = 4;
    let blockLength = d[i] << 8 | d[i + 1];
    while (true) {
        i += blockLength;
        if (i >= len) {
            // exhausted without size info
            return [0, 0];
        }
        if (d[i] !== 0xFF) {
            return [0, 0];
        }
        if (d[i + 1] === 0xC0 || d[i + 1] === 0xC2) {
            if (i + 8 < len) {
                return [
                    d[i + 7] << 8 | d[i + 8],
                    d[i + 5] << 8 | d[i + 6]
                ];
            }
            return [0, 0];
        }
        i += 2;
        blockLength = d[i] << 8 | d[i + 1];
    }
}

// limit hold memory in base64 decoder
const KEEP_DATA = 4194304;
// default IIP header values
const DEFAULT_HEADER = {
    name: 'Unnamed file',
    size: 0,
    width: 'auto',
    height: 'auto',
    preserveAspectRatio: 1,
    inline: 0
};
class IIPHandler {
    constructor(_opts, _renderer, _storage, _coreTerminal) {
        this._opts = _opts;
        this._renderer = _renderer;
        this._storage = _storage;
        this._coreTerminal = _coreTerminal;
        this._aborted = false;
        this._hp = new HeaderParser();
        this._header = DEFAULT_HEADER;
        this._dec = new Base64Decoder$1(KEEP_DATA);
        this._metrics = UNSUPPORTED_TYPE;
    }
    reset() { }
    start() {
        this._aborted = false;
        this._header = DEFAULT_HEADER;
        this._metrics = UNSUPPORTED_TYPE;
        this._hp.reset();
    }
    put(data, start, end) {
        if (this._aborted)
            return;
        if (this._hp.state === 4 /* HeaderState.END */) {
            if (this._dec.put(data, start, end)) {
                this._dec.release();
                this._aborted = true;
            }
        }
        else {
            const dataPos = this._hp.parse(data, start, end);
            if (dataPos === -1) {
                this._aborted = true;
                return;
            }
            if (dataPos > 0) {
                this._header = Object.assign({}, DEFAULT_HEADER, this._hp.fields);
                if (!this._header.inline || !this._header.size || this._header.size > this._opts.iipSizeLimit) {
                    this._aborted = true;
                    return;
                }
                this._dec.init(this._header.size);
                if (this._dec.put(data, dataPos, end)) {
                    this._dec.release();
                    this._aborted = true;
                }
            }
        }
    }
    end(success) {
        if (this._aborted)
            return true;
        let w = 0;
        let h = 0;
        // early exit condition chain
        let cond = true;
        if (cond = success) {
            if (cond = !this._dec.end()) {
                this._metrics = imageType(this._dec.data8);
                if (cond = this._metrics.mime !== 'unsupported') {
                    w = this._metrics.width;
                    h = this._metrics.height;
                    if (cond = w && h && w * h < this._opts.pixelLimit) {
                        [w, h] = this._resize(w, h).map(Math.floor);
                        cond = w && h && w * h < this._opts.pixelLimit;
                    }
                }
            }
        }
        if (!cond) {
            this._dec.release();
            return true;
        }
        const blob = new Blob([this._dec.data8], { type: this._metrics.mime });
        this._dec.release();
        if (!window.createImageBitmap) {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            return new Promise(r => {
                img.addEventListener('load', () => {
                    var _a;
                    URL.revokeObjectURL(url);
                    const canvas = ImageRenderer.createCanvas(window.document, w, h);
                    (_a = canvas.getContext('2d')) === null || _a === void 0 ? void 0 : _a.drawImage(img, 0, 0, w, h);
                    this._storage.addImage(canvas);
                    r(true);
                });
                img.src = url;
                // sanity measure to avoid terminal blocking from dangling promise
                // happens from corrupt data (onload never gets fired)
                setTimeout(() => r(true), 1000);
            });
        }
        return createImageBitmap(blob, { resizeWidth: w, resizeHeight: h })
            .then(bm => {
            this._storage.addImage(bm);
            return true;
        });
    }
    _resize(w, h) {
        var _a, _b, _c, _d;
        const cw = ((_a = this._renderer.dimensions) === null || _a === void 0 ? void 0 : _a.css.cell.width) || CELL_SIZE_DEFAULT.width;
        const ch = ((_b = this._renderer.dimensions) === null || _b === void 0 ? void 0 : _b.css.cell.height) || CELL_SIZE_DEFAULT.height;
        const width = ((_c = this._renderer.dimensions) === null || _c === void 0 ? void 0 : _c.css.canvas.width) || cw * this._coreTerminal.cols;
        const height = ((_d = this._renderer.dimensions) === null || _d === void 0 ? void 0 : _d.css.canvas.height) || ch * this._coreTerminal.rows;
        const rw = this._dim(this._header.width, width, cw);
        const rh = this._dim(this._header.height, height, ch);
        if (!rw && !rh) {
            const wf = width / w; // TODO: should this respect initial cursor offset?
            const hf = (height - ch) / h; // TODO: fix offset issues from float cell height
            const f = Math.min(wf, hf);
            return f < 1 ? [w * f, h * f] : [w, h];
        }
        return !rw
            ? [w * rh / h, rh]
            : this._header.preserveAspectRatio || !rw || !rh
                ? [rw, h * rw / w] : [rw, rh];
    }
    _dim(s, total, cdim) {
        if (s === 'auto')
            return 0;
        if (s.endsWith('%'))
            return parseInt(s.slice(0, -1)) * total / 100;
        if (s.endsWith('px'))
            return parseInt(s.slice(0, -2));
        return parseInt(s) * cdim;
    }
}

/**
 * Copyright (c) 2021 Joerg Breitbart.
 * @license MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeAsync = exports.decode = exports.Decoder = exports.DecoderAsync = void 0;
const Colors_1 = require("./Colors");
const wasm_1 = require("./wasm");
/* istanbul ignore next */
function decodeBase64(s) {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(s, 'base64');
    }
    const bytestring = atob(s);
    const result = new Uint8Array(bytestring.length);
    for (let i = 0; i < result.length; ++i) {
        result[i] = bytestring.charCodeAt(i);
    }
    return result;
}
const WASM_BYTES = decodeBase64(wasm_1.LIMITS.BYTES);
let WASM_MODULE;
// empty canvas
const NULL_CANVAS = new Uint32Array();
// proxy for lazy binding of decoder methods to wasm env callbacks
class CallbackProxy {
    constructor() {
        this.bandHandler = (width) => 1;
        this.modeHandler = (mode) => 1;
    }
    handle_band(width) {
        return this.bandHandler(width);
    }
    mode_parsed(mode) {
        return this.modeHandler(mode);
    }
}
// default decoder options
const DEFAULT_OPTIONS$1 = {
    memoryLimit: 2048 * 65536,
    sixelColor: Colors_1.DEFAULT_FOREGROUND,
    fillColor: Colors_1.DEFAULT_BACKGROUND,
    palette: Colors_1.PALETTE_VT340_COLOR,
    paletteLimit: wasm_1.LIMITS.PALETTE_SIZE,
    truncate: true
};
/**
 * Create a decoder instance asynchronously.
 * To be used in the browser main thread.
 */
function DecoderAsync$1(opts) {
    const cbProxy = new CallbackProxy();
    const importObj = {
        env: {
            handle_band: cbProxy.handle_band.bind(cbProxy),
            mode_parsed: cbProxy.mode_parsed.bind(cbProxy)
        }
    };
    return WebAssembly.instantiate(WASM_MODULE || WASM_BYTES, importObj)
        .then((inst) => {
        WASM_MODULE = WASM_MODULE || inst.module;
        return new Decoder(opts, inst.instance || inst, cbProxy);
    });
}
exports.DecoderAsync = DecoderAsync$1;
/**
 * Decoder - web assembly based sixel stream decoder.
 *
 * Usage pattern:
 *  - call `init` to initialize decoder for new image
 *  - feed data chunks to `decode` or `decodeString`
 *  - grab pixels from `data32`
 *  - optional: call `release` to free memory (e.g. after big images)
 *  - start over with next image by calling `init`
 *
 * Properties:
 *  - max width of 2^14 - 4 pixels (compile time setting in wasm)
 *  - no explicit height limit (only limited by memory)
 *  - max 4096 colors palette (compile time setting in wasm)
 *
 * Explanation operation modes:
 * - M1   Mode chosen for level 1 images (no raster attributes),
 *        or for level 2 images with `truncate=false`.
 * - M2   Mode chosen for level 2 images with `truncate=true` (default).
 *        While this mode is not fully spec conform (decoder not expected to truncate),
 *        it is what spec conform encoders should create (should not excess raster).
 *        This mode has several advantages:
 *        - ~15% faster decoding speed
 *        - image dimensions can be evaluated early without processing the whole data
 *        - faster pixel access in `data32` (precalulated)
 *        - image height is not reported as multiple of 6 pixels
 * - M0   Undecided mode state after `init`.
 * The level of an image is determined during early decoding based on the fact,
 * whether the data contains valid raster attributes before any sixel data.
 * Until then the mode of an image is marked as M0, meaning the real operation mode
 * could not be decided yet.
 */
class Decoder {
    /**
     * Synchonous ctor. Can be called from nodejs or a webworker context.
     * For instantiation in the browser main thread use `WasmDecoderAsync` instead.
     */
    constructor(opts, _instance, _cbProxy) {
        this._PIXEL_OFFSET = wasm_1.LIMITS.MAX_WIDTH + 4;
        this._canvas = NULL_CANVAS;
        this._bandWidths = [];
        this._maxWidth = 0;
        this._minWidth = wasm_1.LIMITS.MAX_WIDTH;
        this._lastOffset = 0;
        this._currentHeight = 0;
        this._opts = Object.assign({}, DEFAULT_OPTIONS$1, opts);
        if (this._opts.paletteLimit > wasm_1.LIMITS.PALETTE_SIZE) {
            throw new Error(`DecoderOptions.paletteLimit must not exceed ${wasm_1.LIMITS.PALETTE_SIZE}`);
        }
        if (!_instance) {
            const module = WASM_MODULE || (WASM_MODULE = new WebAssembly.Module(WASM_BYTES));
            _instance = new WebAssembly.Instance(module, {
                env: {
                    handle_band: this._handle_band.bind(this),
                    mode_parsed: this._initCanvas.bind(this)
                }
            });
        }
        else {
            _cbProxy.bandHandler = this._handle_band.bind(this);
            _cbProxy.modeHandler = this._initCanvas.bind(this);
        }
        this._instance = _instance;
        this._wasm = this._instance.exports;
        this._chunk = new Uint8Array(this._wasm.memory.buffer, this._wasm.get_chunk_address(), wasm_1.LIMITS.CHUNK_SIZE);
        this._states = new Uint32Array(this._wasm.memory.buffer, this._wasm.get_state_address(), 12);
        this._palette = new Uint32Array(this._wasm.memory.buffer, this._wasm.get_palette_address(), wasm_1.LIMITS.PALETTE_SIZE);
        this._palette.set(this._opts.palette);
        this._pSrc = new Uint32Array(this._wasm.memory.buffer, this._wasm.get_p0_address());
        this._wasm.init(Colors_1.DEFAULT_FOREGROUND, 0, this._opts.paletteLimit, 0);
    }
    // some readonly parser states for internal usage
    get _fillColor() { return this._states[0]; }
    get _truncate() { return this._states[8]; }
    get _rasterWidth() { return this._states[6]; }
    get _rasterHeight() { return this._states[7]; }
    get _width() { return this._states[2] ? this._states[2] - 4 : 0; }
    get _height() { return this._states[3]; }
    get _level() { return this._states[9]; }
    get _mode() { return this._states[10]; }
    get _paletteLimit() { return this._states[11]; }
    _initCanvas(mode) {
        if (mode === 2 /* M2 */) {
            const pixels = this.width * this.height;
            if (pixels > this._canvas.length) {
                if (this._opts.memoryLimit && pixels * 4 > this._opts.memoryLimit) {
                    this.release();
                    throw new Error('image exceeds memory limit');
                }
                this._canvas = new Uint32Array(pixels);
            }
            this._maxWidth = this._width;
        }
        else if (mode === 1 /* M1 */) {
            if (this._level === 2) {
                // got raster attributes, use them as initial size hint
                const pixels = Math.min(this._rasterWidth, wasm_1.LIMITS.MAX_WIDTH) * this._rasterHeight;
                if (pixels > this._canvas.length) {
                    if (this._opts.memoryLimit && pixels * 4 > this._opts.memoryLimit) {
                        this.release();
                        throw new Error('image exceeds memory limit');
                    }
                    this._canvas = new Uint32Array(pixels);
                }
            }
            else {
                // else fallback to generic resizing, starting with 256*256 pixels
                if (this._canvas.length < 65536) {
                    this._canvas = new Uint32Array(65536);
                }
            }
        }
        return 0; // 0 - continue, 1 - abort right away
    }
    _realloc(offset, additionalPixels) {
        const pixels = offset + additionalPixels;
        if (pixels > this._canvas.length) {
            if (this._opts.memoryLimit && pixels * 4 > this._opts.memoryLimit) {
                this.release();
                throw new Error('image exceeds memory limit');
            }
            // extend in 65536 pixel blocks
            const newCanvas = new Uint32Array(Math.ceil(pixels / 65536) * 65536);
            newCanvas.set(this._canvas);
            this._canvas = newCanvas;
        }
    }
    _handle_band(width) {
        const adv = this._PIXEL_OFFSET;
        let offset = this._lastOffset;
        if (this._mode === 2 /* M2 */) {
            let remaining = this.height - this._currentHeight;
            let c = 0;
            while (c < 6 && remaining > 0) {
                this._canvas.set(this._pSrc.subarray(adv * c, adv * c + width), offset + width * c);
                c++;
                remaining--;
            }
            this._lastOffset += width * c;
            this._currentHeight += c;
        }
        else if (this._mode === 1 /* M1 */) {
            this._realloc(offset, width * 6);
            this._maxWidth = Math.max(this._maxWidth, width);
            this._minWidth = Math.min(this._minWidth, width);
            for (let i = 0; i < 6; ++i) {
                this._canvas.set(this._pSrc.subarray(adv * i, adv * i + width), offset + width * i);
            }
            this._bandWidths.push(width);
            this._lastOffset += width * 6;
            this._currentHeight += 6;
        }
        return 0; // 0 - continue, 1 - abort right away
    }
    /**
     * Width of the image data.
     * Returns the rasterWidth in level2/truncating mode,
     * otherwise the max width, that has been seen so far.
     */
    get width() {
        return this._mode !== 1 /* M1 */
            ? this._width
            : Math.max(this._maxWidth, this._wasm.current_width());
    }
    /**
     * Height of the image data.
     * Returns the rasterHeight in level2/truncating mode,
     * otherwise height touched by sixels.
     */
    get height() {
        return this._mode !== 1 /* M1 */
            ? this._height
            : this._wasm.current_width()
                ? this._bandWidths.length * 6 + this._wasm.current_height()
                : this._bandWidths.length * 6;
    }
    /**
     * Get active palette colors as RGBA8888[] (borrowed).
     */
    get palette() {
        return this._palette.subarray(0, this._paletteLimit);
    }
    /**
     * Get the memory used by the decoder.
     *
     * This is a rough estimate accounting the wasm instance memory
     * and pixel buffers held on JS side (real value will be slightly
     * higher due to JS book-keeping).
     * Note that the decoder does not free ressources on its own,
     * call `release` to free excess memory.
     */
    get memoryUsage() {
        return this._canvas.byteLength + this._wasm.memory.buffer.byteLength + 8 * this._bandWidths.length;
    }
    /**
     * Get various properties of the decoder and the current image.
     */
    get properties() {
        return {
            width: this.width,
            height: this.height,
            mode: this._mode,
            level: this._level,
            truncate: !!this._truncate,
            paletteLimit: this._paletteLimit,
            fillColor: this._fillColor,
            memUsage: this.memoryUsage,
            rasterAttributes: {
                numerator: this._states[4],
                denominator: this._states[5],
                width: this._rasterWidth,
                height: this._rasterHeight,
            }
        };
    }
    /**
     * Initialize decoder for next image. Must be called before
     * any calls to `decode` or `decodeString`.
     */
    // FIXME: reorder arguments, better palette handling
    init(fillColor = this._opts.fillColor, palette = this._opts.palette, paletteLimit = this._opts.paletteLimit, truncate = this._opts.truncate) {
        this._wasm.init(this._opts.sixelColor, fillColor, paletteLimit, truncate ? 1 : 0);
        if (palette) {
            this._palette.set(palette.subarray(0, wasm_1.LIMITS.PALETTE_SIZE));
        }
        this._bandWidths.length = 0;
        this._maxWidth = 0;
        this._minWidth = wasm_1.LIMITS.MAX_WIDTH;
        this._lastOffset = 0;
        this._currentHeight = 0;
    }
    /**
     * Decode next chunk of data from start to end index (exclusive).
     * @throws Will throw if the image exceeds the memory limit.
     */
    decode(data, start = 0, end = data.length) {
        let p = start;
        while (p < end) {
            const length = Math.min(end - p, wasm_1.LIMITS.CHUNK_SIZE);
            this._chunk.set(data.subarray(p, p += length));
            this._wasm.decode(0, length);
        }
    }
    /**
     * Decode next chunk of string data from start to end index (exclusive).
     * Note: Decoding from string data is rather slow, use `decode` with byte data instead.
     * @throws Will throw if the image exceeds the memory limit.
     */
    decodeString(data, start = 0, end = data.length) {
        let p = start;
        while (p < end) {
            const length = Math.min(end - p, wasm_1.LIMITS.CHUNK_SIZE);
            for (let i = 0, j = p; i < length; ++i, ++j) {
                this._chunk[i] = data.charCodeAt(j);
            }
            p += length;
            this._wasm.decode(0, length);
        }
    }
    /**
     * Get current pixel data as 32-bit typed array (RGBA8888).
     * Also peeks into pixel data of the current band, that got not pushed yet.
     */
    get data32() {
        if (this._mode === 0 /* M0 */ || !this.width || !this.height) {
            return NULL_CANVAS;
        }
        // get width of pending band to peek into left-over data
        const currentWidth = this._wasm.current_width();
        if (this._mode === 2 /* M2 */) {
            let remaining = this.height - this._currentHeight;
            if (remaining > 0) {
                const adv = this._PIXEL_OFFSET;
                let offset = this._lastOffset;
                let c = 0;
                while (c < 6 && remaining > 0) {
                    this._canvas.set(this._pSrc.subarray(adv * c, adv * c + currentWidth), offset + currentWidth * c);
                    c++;
                    remaining--;
                }
                if (remaining) {
                    this._canvas.fill(this._fillColor, offset + currentWidth * c);
                }
            }
            return this._canvas.subarray(0, this.width * this.height);
        }
        if (this._mode === 1 /* M1 */) {
            if (this._minWidth === this._maxWidth) {
                let escape = false;
                if (currentWidth) {
                    if (currentWidth !== this._minWidth) {
                        escape = true;
                    }
                    else {
                        const adv = this._PIXEL_OFFSET;
                        let offset = this._lastOffset;
                        this._realloc(offset, currentWidth * 6);
                        for (let i = 0; i < 6; ++i) {
                            this._canvas.set(this._pSrc.subarray(adv * i, adv * i + currentWidth), offset + currentWidth * i);
                        }
                    }
                }
                if (!escape) {
                    return this._canvas.subarray(0, this.width * this.height);
                }
            }
            // worst case: re-align pixels if we have bands with different width
            // This is somewhat allocation intensive, any way to do that in-place, and just once?
            const final = new Uint32Array(this.width * this.height);
            final.fill(this._fillColor);
            let finalOffset = 0;
            let start = 0;
            for (let i = 0; i < this._bandWidths.length; ++i) {
                const bw = this._bandWidths[i];
                for (let p = 0; p < 6; ++p) {
                    final.set(this._canvas.subarray(start, start += bw), finalOffset);
                    finalOffset += this.width;
                }
            }
            // also handle left-over pixels of the current band
            if (currentWidth) {
                const adv = this._PIXEL_OFFSET;
                // other than finished bands, this runs only up to currentHeight
                const currentHeight = this._wasm.current_height();
                for (let i = 0; i < currentHeight; ++i) {
                    final.set(this._pSrc.subarray(adv * i, adv * i + currentWidth), finalOffset + this.width * i);
                }
            }
            return final;
        }
        // fallthrough for all not handled cases
        return NULL_CANVAS;
    }
    /**
     * Same as `data32`, but returning pixel data as Uint8ClampedArray suitable
     * for direct usage with `ImageData`.
     */
    get data8() {
        return new Uint8ClampedArray(this.data32.buffer, 0, this.width * this.height * 4);
    }
    /**
     * Release image ressources on JS side held by the decoder.
     *
     * The decoder tries to re-use memory ressources of a previous image
     * to lower allocation and GC pressure. Decoding a single big image
     * will grow the memory usage of the decoder permanently.
     * Call `release` to reset the internal buffers and free the memory.
     * Note that this destroys the image data, call it when done processing
     * a rather big image, otherwise it is not needed. Use `memoryUsage`
     * to decide, whether the held memory is still within your limits.
     * This does not affect the wasm module (operates on static memory).
     */
    release() {
        this._canvas = NULL_CANVAS;
        this._bandWidths.length = 0;
        this._maxWidth = 0;
        this._minWidth = wasm_1.LIMITS.MAX_WIDTH;
        // also nullify parser states in wasm to avoid
        // width/height reporting potential out-of-bound values
        this._wasm.init(Colors_1.DEFAULT_FOREGROUND, 0, this._opts.paletteLimit, 0);
    }
}
exports.Decoder = Decoder;
/**
 * Convenient decoding functions for easier usage.
 *
 * These can be used for casual decoding of sixel images,
 * that dont come in as stream chunks.
 * Note that the functions instantiate a stream decoder for every call,
 * which comes with a performance penalty of ~25%.
 */
/**
 * Decode function with synchronous wasm loading.
 * Can be used in a web worker or in nodejs. Does not work reliable in normal browser context.
 * @throws Will throw if the image exceeds the memory limit.
 */
function decode(data, opts) {
    const dec = new Decoder(opts);
    dec.init();
    typeof data === 'string' ? dec.decodeString(data) : dec.decode(data);
    return {
        width: dec.width,
        height: dec.height,
        data32: dec.data32,
        data8: dec.data8
    };
}
exports.decode = decode;
/**
 * Decode function with asynchronous wasm loading.
 * Use this version in normal browser context.
 * @throws Will throw if the image exceeds the memory limit.
 */
async function decodeAsync(data, opts) {
    const dec = await DecoderAsync$1(opts);
    dec.init();
    typeof data === 'string' ? dec.decodeString(data) : dec.decode(data);
    return {
        width: dec.width,
        height: dec.height,
        data32: dec.data32,
        data8: dec.data8
    };
}
exports.decodeAsync = decodeAsync;

/**
 * Copyright (c) 2020, 2023 The xterm.js authors. All rights reserved.
 * @license MIT
 */
const { toRGBA8888, BIG_ENDIAN, PALETTE_ANSI_256, PALETTE_VT340_COLOR } = Colors;
const DecoderAsync = undefined;
// always free decoder ressources after decoding if it exceeds this limit
const MEM_PERMA_LIMIT = 4194304; // 1024 pixels * 1024 pixels * 4 channels = 4MB
// custom default palette: VT340 (lower 16 colors) + ANSI256 (up to 256) + zeroed (up to 4096)
const DEFAULT_PALETTE = PALETTE_ANSI_256;
DEFAULT_PALETTE.set(PALETTE_VT340_COLOR);
class SixelHandler {
    constructor(_opts, _storage, _coreTerminal) {
        this._opts = _opts;
        this._storage = _storage;
        this._coreTerminal = _coreTerminal;
        this._size = 0;
        this._aborted = false;
        DecoderAsync({
            memoryLimit: this._opts.pixelLimit * 4,
            palette: DEFAULT_PALETTE,
            paletteLimit: this._opts.sixelPaletteLimit
        }).then(d => this._dec = d);
    }
    reset() {
        /**
         * reset sixel decoder to defaults:
         * - release all memory
         * - nullify palette (4096)
         * - apply default palette (256)
         */
        if (this._dec) {
            this._dec.release();
            // FIXME: missing interface on decoder to nullify full palette
            this._dec._palette.fill(0);
            this._dec.init(0, DEFAULT_PALETTE, this._opts.sixelPaletteLimit);
        }
    }
    hook(params) {
        var _a;
        this._size = 0;
        this._aborted = false;
        if (this._dec) {
            const fillColor = params.params[1] === 1 ? 0 : extractActiveBg(this._coreTerminal._core._inputHandler._curAttrData, (_a = this._coreTerminal._core._themeService) === null || _a === void 0 ? void 0 : _a.colors);
            this._dec.init(fillColor, null, this._opts.sixelPaletteLimit);
        }
    }
    put(data, start, end) {
        if (this._aborted || !this._dec) {
            return;
        }
        this._size += end - start;
        if (this._size > this._opts.sixelSizeLimit) {
            console.warn(`SIXEL: too much data, aborting`);
            this._aborted = true;
            this._dec.release();
            return;
        }
        try {
            this._dec.decode(data, start, end);
        }
        catch (e) {
            console.warn(`SIXEL: error while decoding image - ${e}`);
            this._aborted = true;
            this._dec.release();
        }
    }
    unhook(success) {
        var _a;
        if (this._aborted || !success || !this._dec) {
            return true;
        }
        const width = this._dec.width;
        const height = this._dec.height;
        // partial fix for https://github.com/jerch/xterm-addon-image/issues/37
        if (!width || !height) {
            if (height) {
                this._storage.advanceCursor(height);
            }
            return true;
        }
        const canvas = ImageRenderer.createCanvas(undefined, width, height);
        (_a = canvas.getContext('2d')) === null || _a === void 0 ? void 0 : _a.putImageData(new ImageData(this._dec.data8, width, height), 0, 0);
        if (this._dec.memoryUsage > MEM_PERMA_LIMIT) {
            this._dec.release();
        }
        this._storage.addImage(canvas);
        return true;
    }
}
/**
 * Some helpers to extract current terminal colors.
 */
// get currently active background color from terminal
// also respect INVERSE setting
function extractActiveBg(attr, colors) {
    let bg = 0;
    if (!colors) {
        // FIXME: theme service is prolly not available yet,
        // happens if .open() was not called yet (bug in core?)
        return bg;
    }
    if (attr.isInverse()) {
        if (attr.isFgDefault()) {
            bg = convertLe(colors.foreground.rgba);
        }
        else if (attr.isFgRGB()) {
            const t = attr.constructor.toColorRGB(attr.getFgColor());
            bg = toRGBA8888(...t);
        }
        else {
            bg = convertLe(colors.ansi[attr.getFgColor()].rgba);
        }
    }
    else {
        if (attr.isBgDefault()) {
            bg = convertLe(colors.background.rgba);
        }
        else if (attr.isBgRGB()) {
            const t = attr.constructor.toColorRGB(attr.getBgColor());
            bg = toRGBA8888(...t);
        }
        else {
            bg = convertLe(colors.ansi[attr.getBgColor()].rgba);
        }
    }
    return bg;
}
// rgba values on the color managers are always in BE, thus convert to LE
function convertLe(color) {
    if (BIG_ENDIAN)
        return color;
    return (color & 0xFF) << 24 | (color >>> 8 & 0xFF) << 16 | (color >>> 16 & 0xFF) << 8 | color >>> 24 & 0xFF;
}

/**
 * Copyright (c) 2020 The xterm.js authors. All rights reserved.
 * @license MIT
 */
// default values of addon ctor options
const DEFAULT_OPTIONS = {
    enableSizeReports: true,
    pixelLimit: 16777216,
    sixelSupport: true,
    sixelScrolling: true,
    sixelPaletteLimit: 256,
    sixelSizeLimit: 25000000,
    storageLimit: 128,
    showPlaceholder: true,
    iipSupport: true,
    iipSizeLimit: 20000000
};
// max palette size supported by the sixel lib (compile time setting)
const MAX_SIXEL_PALETTE_SIZE = 4096;
class ImageAddon {
    constructor(opts) {
        this._disposables = [];
        this._handlers = new Map();
        this._opts = Object.assign({}, DEFAULT_OPTIONS, opts);
        this._defaultOpts = Object.assign({}, DEFAULT_OPTIONS, opts);
    }
    dispose() {
        for (const obj of this._disposables) {
            obj.dispose();
        }
        this._disposables.length = 0;
        this._handlers.clear();
    }
    _disposeLater(...args) {
        for (const obj of args) {
            this._disposables.push(obj);
        }
    }
    activate(terminal) {
        this._terminal = terminal;
        // internal data structures
        this._renderer = new ImageRenderer(terminal);
        this._storage = new ImageStorage(terminal, this._renderer, this._opts);
        // enable size reports
        if (this._opts.enableSizeReports) {
            // const windowOptions = terminal.getOption('windowOptions');
            // windowOptions.getWinSizePixels = true;
            // windowOptions.getCellSizePixels = true;
            // windowOptions.getWinSizeChars = true;
            // terminal.setOption('windowOptions', windowOptions);
            const windowOps = terminal.options.windowOptions || {};
            windowOps.getWinSizePixels = true;
            windowOps.getCellSizePixels = true;
            windowOps.getWinSizeChars = true;
            terminal.options.windowOptions = windowOps;
        }
        this._disposeLater(this._renderer, this._storage, 
        // DECSET/DECRST/DA1/XTSMGRAPHICS handlers
        terminal.parser.registerCsiHandler({ prefix: '?', final: 'h' }, params => this._decset(params)), terminal.parser.registerCsiHandler({ prefix: '?', final: 'l' }, params => this._decrst(params)), terminal.parser.registerCsiHandler({ final: 'c' }, params => this._da1(params)), terminal.parser.registerCsiHandler({ prefix: '?', final: 'S' }, params => this._xtermGraphicsAttributes(params)), 
        // render hook
        terminal.onRender(range => { var _a; return (_a = this._storage) === null || _a === void 0 ? void 0 : _a.render(range); }), 
        /**
         * reset handlers covered:
         * - DECSTR
         * - RIS
         * - Terminal.reset()
         */
        terminal.parser.registerCsiHandler({ intermediates: '!', final: 'p' }, () => this.reset()), terminal.parser.registerEscHandler({ final: 'c' }, () => this.reset()), terminal._core._inputHandler.onRequestReset(() => this.reset()), 
        // wipe canvas and delete alternate images on buffer switch
        terminal.buffer.onBufferChange(() => { var _a; return (_a = this._storage) === null || _a === void 0 ? void 0 : _a.wipeAlternate(); }), 
        // extend images to the right on resize
        terminal.onResize(metrics => { var _a; return (_a = this._storage) === null || _a === void 0 ? void 0 : _a.viewportResize(metrics); }));
        // SIXEL handler
        if (this._opts.sixelSupport) {
            const sixelHandler = new SixelHandler(this._opts, this._storage, terminal);
            this._handlers.set('sixel', sixelHandler);
            this._disposeLater(terminal._core._inputHandler._parser.registerDcsHandler({ final: 'q' }, sixelHandler));
        }
        // iTerm IIP handler
        if (this._opts.iipSupport) {
            const iipHandler = new IIPHandler(this._opts, this._renderer, this._storage, terminal);
            this._handlers.set('iip', iipHandler);
            this._disposeLater(terminal._core._inputHandler._parser.registerOscHandler(1337, iipHandler));
        }
    }
    // Note: storageLimit is skipped here to not intoduce a surprising side effect.
    reset() {
        var _a;
        // reset options customizable by sequences to defaults
        this._opts.sixelScrolling = this._defaultOpts.sixelScrolling;
        this._opts.sixelPaletteLimit = this._defaultOpts.sixelPaletteLimit;
        // also clear image storage
        (_a = this._storage) === null || _a === void 0 ? void 0 : _a.reset();
        // reset protocol handlers
        for (const handler of this._handlers.values()) {
            handler.reset();
        }
        return false;
    }
    get storageLimit() {
        var _a;
        return ((_a = this._storage) === null || _a === void 0 ? void 0 : _a.getLimit()) || -1;
    }
    set storageLimit(limit) {
        var _a;
        (_a = this._storage) === null || _a === void 0 ? void 0 : _a.setLimit(limit);
        this._opts.storageLimit = limit;
    }
    get storageUsage() {
        if (this._storage) {
            return this._storage.getUsage();
        }
        return -1;
    }
    get showPlaceholder() {
        return this._opts.showPlaceholder;
    }
    set showPlaceholder(value) {
        var _a;
        this._opts.showPlaceholder = value;
        (_a = this._renderer) === null || _a === void 0 ? void 0 : _a.showPlaceholder(value);
    }
    getImageAtBufferCell(x, y) {
        var _a;
        return (_a = this._storage) === null || _a === void 0 ? void 0 : _a.getImageAtBufferCell(x, y);
    }
    extractTileAtBufferCell(x, y) {
        var _a;
        return (_a = this._storage) === null || _a === void 0 ? void 0 : _a.extractTileAtBufferCell(x, y);
    }
    _report(s) {
        var _a;
        (_a = this._terminal) === null || _a === void 0 ? void 0 : _a._core.coreService.triggerDataEvent(s);
    }
    _decset(params) {
        for (let i = 0; i < params.length; ++i) {
            switch (params[i]) {
                case 80:
                    this._opts.sixelScrolling = false;
                    break;
            }
        }
        return false;
    }
    _decrst(params) {
        for (let i = 0; i < params.length; ++i) {
            switch (params[i]) {
                case 80:
                    this._opts.sixelScrolling = true;
                    break;
            }
        }
        return false;
    }
    // overload DA to return something more appropriate
    _da1(params) {
        if (params[0]) {
            return true;
        }
        // reported features:
        // 62 - VT220
        // 4 - SIXEL support
        // 9 - charsets
        // 22 - ANSI colors
        if (this._opts.sixelSupport) {
            this._report(`\x1b[?62;4;9;22c`);
            return true;
        }
        return false;
    }
    /**
     * Implementation of xterm's graphics attribute sequence.
     *
     * Supported features:
     * - read/change palette limits (max 4096 by sixel lib)
     * - read SIXEL canvas geometry (reports current window canvas or
     *   squared pixelLimit if canvas > pixel limit)
     *
     * Everything else is deactivated.
     */
    _xtermGraphicsAttributes(params) {
        var _a, _b, _c, _d, _e, _f;
        if (params.length < 2) {
            return true;
        }
        if (params[0] === 1 /* GaItem.COLORS */) {
            switch (params[1]) {
                case 1 /* GaAction.READ */:
                    this._report(`\x1b[?${params[0]};${0 /* GaStatus.SUCCESS */};${this._opts.sixelPaletteLimit}S`);
                    return true;
                case 2 /* GaAction.SET_DEFAULT */:
                    this._opts.sixelPaletteLimit = this._defaultOpts.sixelPaletteLimit;
                    this._report(`\x1b[?${params[0]};${0 /* GaStatus.SUCCESS */};${this._opts.sixelPaletteLimit}S`);
                    // also reset protocol handlers for now
                    for (const handler of this._handlers.values()) {
                        handler.reset();
                    }
                    return true;
                case 3 /* GaAction.SET */:
                    if (params.length > 2 && !(params[2] instanceof Array) && params[2] <= MAX_SIXEL_PALETTE_SIZE) {
                        this._opts.sixelPaletteLimit = params[2];
                        this._report(`\x1b[?${params[0]};${0 /* GaStatus.SUCCESS */};${this._opts.sixelPaletteLimit}S`);
                    }
                    else {
                        this._report(`\x1b[?${params[0]};${2 /* GaStatus.ACTION_ERROR */}S`);
                    }
                    return true;
                case 4 /* GaAction.READ_MAX */:
                    this._report(`\x1b[?${params[0]};${0 /* GaStatus.SUCCESS */};${MAX_SIXEL_PALETTE_SIZE}S`);
                    return true;
                default:
                    this._report(`\x1b[?${params[0]};${2 /* GaStatus.ACTION_ERROR */}S`);
                    return true;
            }
        }
        if (params[0] === 2 /* GaItem.SIXEL_GEO */) {
            switch (params[1]) {
                // we only implement read and read_max here
                case 1 /* GaAction.READ */:
                    let width = (_b = (_a = this._renderer) === null || _a === void 0 ? void 0 : _a.dimensions) === null || _b === void 0 ? void 0 : _b.css.canvas.width;
                    let height = (_d = (_c = this._renderer) === null || _c === void 0 ? void 0 : _c.dimensions) === null || _d === void 0 ? void 0 : _d.css.canvas.height;
                    if (!width || !height) {
                        // for some reason we have no working image renderer
                        // --> fallback to default cell size
                        const cellSize = CELL_SIZE_DEFAULT;
                        width = (((_e = this._terminal) === null || _e === void 0 ? void 0 : _e.cols) || 80) * cellSize.width;
                        height = (((_f = this._terminal) === null || _f === void 0 ? void 0 : _f.rows) || 24) * cellSize.height;
                    }
                    if (width * height < this._opts.pixelLimit) {
                        this._report(`\x1b[?${params[0]};${0 /* GaStatus.SUCCESS */};${width.toFixed(0)};${height.toFixed(0)}S`);
                    }
                    else {
                        // if we overflow pixelLimit report that squared instead
                        const x = Math.floor(Math.sqrt(this._opts.pixelLimit));
                        this._report(`\x1b[?${params[0]};${0 /* GaStatus.SUCCESS */};${x};${x}S`);
                    }
                    return true;
                case 4 /* GaAction.READ_MAX */:
                    // read_max returns pixelLimit as square area
                    const x = Math.floor(Math.sqrt(this._opts.pixelLimit));
                    this._report(`\x1b[?${params[0]};${0 /* GaStatus.SUCCESS */};${x};${x}S`);
                    return true;
                default:
                    this._report(`\x1b[?${params[0]};${2 /* GaStatus.ACTION_ERROR */}S`);
                    return true;
            }
        }
        // exit with error on ReGIS or any other requests
        this._report(`\x1b[?${params[0]};${1 /* GaStatus.ITEM_ERROR */}S`);
        return true;
    }
}

export { ImageAddon };
//# sourceMappingURL=ImageAddon.js.map
