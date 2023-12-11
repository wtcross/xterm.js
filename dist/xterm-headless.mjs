function stringFromCodePoint(codePoint) {
    if (codePoint > 0xFFFF) {
        codePoint -= 0x10000;
        return String.fromCharCode((codePoint >> 10) + 0xD800) + String.fromCharCode((codePoint % 0x400) + 0xDC00);
    }
    return String.fromCharCode(codePoint);
}
function utf32ToString(data, start = 0, end = data.length) {
    let result = '';
    for (let i = start; i < end; ++i) {
        let codepoint = data[i];
        if (codepoint > 0xFFFF) {
            codepoint -= 0x10000;
            result += String.fromCharCode((codepoint >> 10) + 0xD800) + String.fromCharCode((codepoint % 0x400) + 0xDC00);
        }
        else {
            result += String.fromCharCode(codepoint);
        }
    }
    return result;
}
class StringToUtf32 {
    constructor() {
        this._interim = 0;
    }
    clear() {
        this._interim = 0;
    }
    decode(input, target) {
        const length = input.length;
        if (!length) {
            return 0;
        }
        let size = 0;
        let startPos = 0;
        if (this._interim) {
            const second = input.charCodeAt(startPos++);
            if (0xDC00 <= second && second <= 0xDFFF) {
                target[size++] = (this._interim - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
            }
            else {
                target[size++] = this._interim;
                target[size++] = second;
            }
            this._interim = 0;
        }
        for (let i = startPos; i < length; ++i) {
            const code = input.charCodeAt(i);
            if (0xD800 <= code && code <= 0xDBFF) {
                if (++i >= length) {
                    this._interim = code;
                    return size;
                }
                const second = input.charCodeAt(i);
                if (0xDC00 <= second && second <= 0xDFFF) {
                    target[size++] = (code - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
                }
                else {
                    target[size++] = code;
                    target[size++] = second;
                }
                continue;
            }
            if (code === 0xFEFF) {
                continue;
            }
            target[size++] = code;
        }
        return size;
    }
}
class Utf8ToUtf32 {
    constructor() {
        this.interim = new Uint8Array(3);
    }
    clear() {
        this.interim.fill(0);
    }
    decode(input, target) {
        const length = input.length;
        if (!length) {
            return 0;
        }
        let size = 0;
        let byte1;
        let byte2;
        let byte3;
        let byte4;
        let codepoint = 0;
        let startPos = 0;
        if (this.interim[0]) {
            let discardInterim = false;
            let cp = this.interim[0];
            cp &= ((((cp & 0xE0) === 0xC0)) ? 0x1F : (((cp & 0xF0) === 0xE0)) ? 0x0F : 0x07);
            let pos = 0;
            let tmp;
            while ((tmp = this.interim[++pos] & 0x3F) && pos < 4) {
                cp <<= 6;
                cp |= tmp;
            }
            const type = (((this.interim[0] & 0xE0) === 0xC0)) ? 2 : (((this.interim[0] & 0xF0) === 0xE0)) ? 3 : 4;
            const missing = type - pos;
            while (startPos < missing) {
                if (startPos >= length) {
                    return 0;
                }
                tmp = input[startPos++];
                if ((tmp & 0xC0) !== 0x80) {
                    startPos--;
                    discardInterim = true;
                    break;
                }
                else {
                    this.interim[pos++] = tmp;
                    cp <<= 6;
                    cp |= tmp & 0x3F;
                }
            }
            if (!discardInterim) {
                if (type === 2) {
                    if (cp < 0x80) {
                        startPos--;
                    }
                    else {
                        target[size++] = cp;
                    }
                }
                else if (type === 3) {
                    if (cp < 0x0800 || (cp >= 0xD800 && cp <= 0xDFFF) || cp === 0xFEFF) ;
                    else {
                        target[size++] = cp;
                    }
                }
                else {
                    if (cp < 0x010000 || cp > 0x10FFFF) ;
                    else {
                        target[size++] = cp;
                    }
                }
            }
            this.interim.fill(0);
        }
        const fourStop = length - 4;
        let i = startPos;
        while (i < length) {
            while (i < fourStop
                && !((byte1 = input[i]) & 0x80)
                && !((byte2 = input[i + 1]) & 0x80)
                && !((byte3 = input[i + 2]) & 0x80)
                && !((byte4 = input[i + 3]) & 0x80)) {
                target[size++] = byte1;
                target[size++] = byte2;
                target[size++] = byte3;
                target[size++] = byte4;
                i += 4;
            }
            byte1 = input[i++];
            if (byte1 < 0x80) {
                target[size++] = byte1;
            }
            else if ((byte1 & 0xE0) === 0xC0) {
                if (i >= length) {
                    this.interim[0] = byte1;
                    return size;
                }
                byte2 = input[i++];
                if ((byte2 & 0xC0) !== 0x80) {
                    i--;
                    continue;
                }
                codepoint = (byte1 & 0x1F) << 6 | (byte2 & 0x3F);
                if (codepoint < 0x80) {
                    i--;
                    continue;
                }
                target[size++] = codepoint;
            }
            else if ((byte1 & 0xF0) === 0xE0) {
                if (i >= length) {
                    this.interim[0] = byte1;
                    return size;
                }
                byte2 = input[i++];
                if ((byte2 & 0xC0) !== 0x80) {
                    i--;
                    continue;
                }
                if (i >= length) {
                    this.interim[0] = byte1;
                    this.interim[1] = byte2;
                    return size;
                }
                byte3 = input[i++];
                if ((byte3 & 0xC0) !== 0x80) {
                    i--;
                    continue;
                }
                codepoint = (byte1 & 0x0F) << 12 | (byte2 & 0x3F) << 6 | (byte3 & 0x3F);
                if (codepoint < 0x0800 || (codepoint >= 0xD800 && codepoint <= 0xDFFF) || codepoint === 0xFEFF) {
                    continue;
                }
                target[size++] = codepoint;
            }
            else if ((byte1 & 0xF8) === 0xF0) {
                if (i >= length) {
                    this.interim[0] = byte1;
                    return size;
                }
                byte2 = input[i++];
                if ((byte2 & 0xC0) !== 0x80) {
                    i--;
                    continue;
                }
                if (i >= length) {
                    this.interim[0] = byte1;
                    this.interim[1] = byte2;
                    return size;
                }
                byte3 = input[i++];
                if ((byte3 & 0xC0) !== 0x80) {
                    i--;
                    continue;
                }
                if (i >= length) {
                    this.interim[0] = byte1;
                    this.interim[1] = byte2;
                    this.interim[2] = byte3;
                    return size;
                }
                byte4 = input[i++];
                if ((byte4 & 0xC0) !== 0x80) {
                    i--;
                    continue;
                }
                codepoint = (byte1 & 0x07) << 18 | (byte2 & 0x3F) << 12 | (byte3 & 0x3F) << 6 | (byte4 & 0x3F);
                if (codepoint < 0x010000 || codepoint > 0x10FFFF) {
                    continue;
                }
                target[size++] = codepoint;
            }
            else ;
        }
        return size;
    }
}

const CHAR_DATA_ATTR_INDEX = 0;
const CHAR_DATA_CHAR_INDEX = 1;
const CHAR_DATA_WIDTH_INDEX = 2;
const CHAR_DATA_CODE_INDEX = 3;
const NULL_CELL_CHAR = '';
const NULL_CELL_WIDTH = 1;
const NULL_CELL_CODE = 0;
const WHITESPACE_CELL_CHAR = ' ';
const WHITESPACE_CELL_WIDTH = 1;
const WHITESPACE_CELL_CODE = 32;

class AttributeData {
    constructor() {
        this.fg = 0;
        this.bg = 0;
        this.extended = new ExtendedAttrs();
    }
    static toColorRGB(value) {
        return [
            value >>> 16 & 255,
            value >>> 8 & 255,
            value & 255
        ];
    }
    static fromColorRGB(value) {
        return (value[0] & 255) << 16 | (value[1] & 255) << 8 | value[2] & 255;
    }
    clone() {
        const newObj = new AttributeData();
        newObj.fg = this.fg;
        newObj.bg = this.bg;
        newObj.extended = this.extended.clone();
        return newObj;
    }
    isInverse() { return this.fg & 67108864; }
    isBold() { return this.fg & 134217728; }
    isUnderline() {
        if (this.hasExtendedAttrs() && this.extended.underlineStyle !== 0) {
            return 1;
        }
        return this.fg & 268435456;
    }
    isBlink() { return this.fg & 536870912; }
    isInvisible() { return this.fg & 1073741824; }
    isItalic() { return this.bg & 67108864; }
    isDim() { return this.bg & 134217728; }
    isStrikethrough() { return this.fg & 2147483648; }
    isProtected() { return this.bg & 536870912; }
    isOverline() { return this.bg & 1073741824; }
    getFgColorMode() { return this.fg & 50331648; }
    getBgColorMode() { return this.bg & 50331648; }
    isFgRGB() { return (this.fg & 50331648) === 50331648; }
    isBgRGB() { return (this.bg & 50331648) === 50331648; }
    isFgPalette() { return (this.fg & 50331648) === 16777216 || (this.fg & 50331648) === 33554432; }
    isBgPalette() { return (this.bg & 50331648) === 16777216 || (this.bg & 50331648) === 33554432; }
    isFgDefault() { return (this.fg & 50331648) === 0; }
    isBgDefault() { return (this.bg & 50331648) === 0; }
    isAttributeDefault() { return this.fg === 0 && this.bg === 0; }
    getFgColor() {
        switch (this.fg & 50331648) {
            case 16777216:
            case 33554432: return this.fg & 255;
            case 50331648: return this.fg & 16777215;
            default: return -1;
        }
    }
    getBgColor() {
        switch (this.bg & 50331648) {
            case 16777216:
            case 33554432: return this.bg & 255;
            case 50331648: return this.bg & 16777215;
            default: return -1;
        }
    }
    hasExtendedAttrs() {
        return this.bg & 268435456;
    }
    updateExtended() {
        if (this.extended.isEmpty()) {
            this.bg &= ~268435456;
        }
        else {
            this.bg |= 268435456;
        }
    }
    getUnderlineColor() {
        if ((this.bg & 268435456) && ~this.extended.underlineColor) {
            switch (this.extended.underlineColor & 50331648) {
                case 16777216:
                case 33554432: return this.extended.underlineColor & 255;
                case 50331648: return this.extended.underlineColor & 16777215;
                default: return this.getFgColor();
            }
        }
        return this.getFgColor();
    }
    getUnderlineColorMode() {
        return (this.bg & 268435456) && ~this.extended.underlineColor
            ? this.extended.underlineColor & 50331648
            : this.getFgColorMode();
    }
    isUnderlineColorRGB() {
        return (this.bg & 268435456) && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) === 50331648
            : this.isFgRGB();
    }
    isUnderlineColorPalette() {
        return (this.bg & 268435456) && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) === 16777216
                || (this.extended.underlineColor & 50331648) === 33554432
            : this.isFgPalette();
    }
    isUnderlineColorDefault() {
        return (this.bg & 268435456) && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) === 0
            : this.isFgDefault();
    }
    getUnderlineStyle() {
        return this.fg & 268435456
            ? (this.bg & 268435456 ? this.extended.underlineStyle : 1)
            : 0;
    }
    getUnderlineVariantOffset() {
        return this.extended.underlineVariantOffset;
    }
}
class ExtendedAttrs {
    get ext() {
        if (this._urlId) {
            return ((this._ext & ~469762048) |
                (this.underlineStyle << 26));
        }
        return this._ext;
    }
    set ext(value) { this._ext = value; }
    get underlineStyle() {
        if (this._urlId) {
            return 5;
        }
        return (this._ext & 469762048) >> 26;
    }
    set underlineStyle(value) {
        this._ext &= ~469762048;
        this._ext |= (value << 26) & 469762048;
    }
    get underlineColor() {
        return this._ext & (50331648 | 16777215);
    }
    set underlineColor(value) {
        this._ext &= ~(50331648 | 16777215);
        this._ext |= value & (50331648 | 16777215);
    }
    get urlId() {
        return this._urlId;
    }
    set urlId(value) {
        this._urlId = value;
    }
    get underlineVariantOffset() {
        const val = (this._ext & 3758096384) >> 29;
        if (val < 0) {
            return val ^ 0xFFFFFFF8;
        }
        return val;
    }
    set underlineVariantOffset(value) {
        this._ext &= ~3758096384;
        this._ext |= (value << 29) & 3758096384;
    }
    constructor(ext = 0, urlId = 0) {
        this._ext = 0;
        this._urlId = 0;
        this._ext = ext;
        this._urlId = urlId;
    }
    clone() {
        return new ExtendedAttrs(this._ext, this._urlId);
    }
    isEmpty() {
        return this.underlineStyle === 0 && this._urlId === 0;
    }
}

class CellData extends AttributeData {
    constructor() {
        super(...arguments);
        this.content = 0;
        this.fg = 0;
        this.bg = 0;
        this.extended = new ExtendedAttrs();
        this.combinedData = '';
    }
    static fromCharData(value) {
        const obj = new CellData();
        obj.setFromCharData(value);
        return obj;
    }
    isCombined() {
        return this.content & 2097152;
    }
    getWidth() {
        return this.content >> 22;
    }
    getChars() {
        if (this.content & 2097152) {
            return this.combinedData;
        }
        if (this.content & 2097151) {
            return stringFromCodePoint(this.content & 2097151);
        }
        return '';
    }
    getCode() {
        return (this.isCombined())
            ? this.combinedData.charCodeAt(this.combinedData.length - 1)
            : this.content & 2097151;
    }
    setFromCharData(value) {
        this.fg = value[CHAR_DATA_ATTR_INDEX];
        this.bg = 0;
        let combined = false;
        if (value[CHAR_DATA_CHAR_INDEX].length > 2) {
            combined = true;
        }
        else if (value[CHAR_DATA_CHAR_INDEX].length === 2) {
            const code = value[CHAR_DATA_CHAR_INDEX].charCodeAt(0);
            if (0xD800 <= code && code <= 0xDBFF) {
                const second = value[CHAR_DATA_CHAR_INDEX].charCodeAt(1);
                if (0xDC00 <= second && second <= 0xDFFF) {
                    this.content = ((code - 0xD800) * 0x400 + second - 0xDC00 + 0x10000) | (value[CHAR_DATA_WIDTH_INDEX] << 22);
                }
                else {
                    combined = true;
                }
            }
            else {
                combined = true;
            }
        }
        else {
            this.content = value[CHAR_DATA_CHAR_INDEX].charCodeAt(0) | (value[CHAR_DATA_WIDTH_INDEX] << 22);
        }
        if (combined) {
            this.combinedData = value[CHAR_DATA_CHAR_INDEX];
            this.content = 2097152 | (value[CHAR_DATA_WIDTH_INDEX] << 22);
        }
    }
    getAsCharData() {
        return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
    }
}

class BufferLineApiView {
    constructor(_line) {
        this._line = _line;
    }
    get isWrapped() { return this._line.isWrapped; }
    get length() { return this._line.length; }
    getCell(x, cell) {
        if (x < 0 || x >= this._line.length) {
            return undefined;
        }
        if (cell) {
            this._line.loadCell(x, cell);
            return cell;
        }
        return this._line.loadCell(x, new CellData());
    }
    translateToString(trimRight, startColumn, endColumn) {
        return this._line.translateToString(trimRight, startColumn, endColumn);
    }
}

class BufferApiView {
    constructor(_buffer, type) {
        this._buffer = _buffer;
        this.type = type;
    }
    init(buffer) {
        this._buffer = buffer;
        return this;
    }
    get cursorY() { return this._buffer.y; }
    get cursorX() { return this._buffer.x; }
    get viewportY() { return this._buffer.ydisp; }
    get baseY() { return this._buffer.ybase; }
    get length() { return this._buffer.lines.length; }
    getLine(y) {
        const line = this._buffer.lines.get(y);
        if (!line) {
            return undefined;
        }
        return new BufferLineApiView(line);
    }
    getNullCell() { return new CellData(); }
}

class EventEmitter {
    constructor() {
        this._listeners = [];
        this._disposed = false;
    }
    get event() {
        if (!this._event) {
            this._event = (listener) => {
                this._listeners.push(listener);
                const disposable = {
                    dispose: () => {
                        if (!this._disposed) {
                            for (let i = 0; i < this._listeners.length; i++) {
                                if (this._listeners[i] === listener) {
                                    this._listeners.splice(i, 1);
                                    return;
                                }
                            }
                        }
                    }
                };
                return disposable;
            };
        }
        return this._event;
    }
    fire(arg1, arg2) {
        const queue = [];
        for (let i = 0; i < this._listeners.length; i++) {
            queue.push(this._listeners[i]);
        }
        for (let i = 0; i < queue.length; i++) {
            queue[i].call(undefined, arg1, arg2);
        }
    }
    dispose() {
        this.clearListeners();
        this._disposed = true;
    }
    clearListeners() {
        if (this._listeners) {
            this._listeners.length = 0;
        }
    }
}
function forwardEvent(from, to) {
    return from(e => to.fire(e));
}

class Disposable {
    constructor() {
        this._disposables = [];
        this._isDisposed = false;
    }
    dispose() {
        this._isDisposed = true;
        for (const d of this._disposables) {
            d.dispose();
        }
        this._disposables.length = 0;
    }
    register(d) {
        this._disposables.push(d);
        return d;
    }
    unregister(d) {
        const index = this._disposables.indexOf(d);
        if (index !== -1) {
            this._disposables.splice(index, 1);
        }
    }
}
class MutableDisposable {
    constructor() {
        this._isDisposed = false;
    }
    get value() {
        return this._isDisposed ? undefined : this._value;
    }
    set value(value) {
        var _a;
        if (this._isDisposed || value === this._value) {
            return;
        }
        (_a = this._value) === null || _a === void 0 ? void 0 : _a.dispose();
        this._value = value;
    }
    clear() {
        this.value = undefined;
    }
    dispose() {
        var _a;
        this._isDisposed = true;
        (_a = this._value) === null || _a === void 0 ? void 0 : _a.dispose();
        this._value = undefined;
    }
}
function toDisposable(f) {
    return { dispose: f };
}
function disposeArray(disposables) {
    for (const d of disposables) {
        d.dispose();
    }
    disposables.length = 0;
}

class BufferNamespaceApi extends Disposable {
    constructor(_core) {
        super();
        this._core = _core;
        this._onBufferChange = this.register(new EventEmitter());
        this.onBufferChange = this._onBufferChange.event;
        this._normal = new BufferApiView(this._core.buffers.normal, 'normal');
        this._alternate = new BufferApiView(this._core.buffers.alt, 'alternate');
        this._core.buffers.onBufferActivate(() => this._onBufferChange.fire(this.active));
    }
    get active() {
        if (this._core.buffers.active === this._core.buffers.normal) {
            return this.normal;
        }
        if (this._core.buffers.active === this._core.buffers.alt) {
            return this.alternate;
        }
        throw new Error('Active buffer is neither normal nor alternate');
    }
    get normal() {
        return this._normal.init(this._core.buffers.normal);
    }
    get alternate() {
        return this._alternate.init(this._core.buffers.alt);
    }
}

class ParserApi {
    constructor(_core) {
        this._core = _core;
    }
    registerCsiHandler(id, callback) {
        return this._core.registerCsiHandler(id, (params) => callback(params.toArray()));
    }
    addCsiHandler(id, callback) {
        return this.registerCsiHandler(id, callback);
    }
    registerDcsHandler(id, callback) {
        return this._core.registerDcsHandler(id, (data, params) => callback(data, params.toArray()));
    }
    addDcsHandler(id, callback) {
        return this.registerDcsHandler(id, callback);
    }
    registerEscHandler(id, handler) {
        return this._core.registerEscHandler(id, handler);
    }
    addEscHandler(id, handler) {
        return this.registerEscHandler(id, handler);
    }
    registerOscHandler(ident, callback) {
        return this._core.registerOscHandler(ident, callback);
    }
    addOscHandler(ident, callback) {
        return this.registerOscHandler(ident, callback);
    }
}

class UnicodeApi {
    constructor(_core) {
        this._core = _core;
    }
    register(provider) {
        this._core.unicodeService.register(provider);
    }
    get versions() {
        return this._core.unicodeService.versions;
    }
    get activeVersion() {
        return this._core.unicodeService.activeVersion;
    }
    set activeVersion(version) {
        this._core.unicodeService.activeVersion = version;
    }
}

const CELL_SIZE = 3;
const DEFAULT_ATTR_DATA = Object.freeze(new AttributeData());
let $startIndex = 0;
const CLEANUP_THRESHOLD = 2;
class BufferLine {
    constructor(cols, fillCellData, isWrapped = false) {
        this.isWrapped = isWrapped;
        this._combined = {};
        this._extendedAttrs = {};
        this._data = new Uint32Array(cols * CELL_SIZE);
        const cell = fillCellData || CellData.fromCharData([0, NULL_CELL_CHAR, NULL_CELL_WIDTH, NULL_CELL_CODE]);
        for (let i = 0; i < cols; ++i) {
            this.setCell(i, cell);
        }
        this.length = cols;
    }
    get(index) {
        const content = this._data[index * CELL_SIZE + 0];
        const cp = content & 2097151;
        return [
            this._data[index * CELL_SIZE + 1],
            (content & 2097152)
                ? this._combined[index]
                : (cp) ? stringFromCodePoint(cp) : '',
            content >> 22,
            (content & 2097152)
                ? this._combined[index].charCodeAt(this._combined[index].length - 1)
                : cp
        ];
    }
    set(index, value) {
        this._data[index * CELL_SIZE + 1] = value[CHAR_DATA_ATTR_INDEX];
        if (value[CHAR_DATA_CHAR_INDEX].length > 1) {
            this._combined[index] = value[1];
            this._data[index * CELL_SIZE + 0] = index | 2097152 | (value[CHAR_DATA_WIDTH_INDEX] << 22);
        }
        else {
            this._data[index * CELL_SIZE + 0] = value[CHAR_DATA_CHAR_INDEX].charCodeAt(0) | (value[CHAR_DATA_WIDTH_INDEX] << 22);
        }
    }
    getWidth(index) {
        return this._data[index * CELL_SIZE + 0] >> 22;
    }
    hasWidth(index) {
        return this._data[index * CELL_SIZE + 0] & 12582912;
    }
    getFg(index) {
        return this._data[index * CELL_SIZE + 1];
    }
    getBg(index) {
        return this._data[index * CELL_SIZE + 2];
    }
    hasContent(index) {
        return this._data[index * CELL_SIZE + 0] & 4194303;
    }
    getCodePoint(index) {
        const content = this._data[index * CELL_SIZE + 0];
        if (content & 2097152) {
            return this._combined[index].charCodeAt(this._combined[index].length - 1);
        }
        return content & 2097151;
    }
    isCombined(index) {
        return this._data[index * CELL_SIZE + 0] & 2097152;
    }
    getString(index) {
        const content = this._data[index * CELL_SIZE + 0];
        if (content & 2097152) {
            return this._combined[index];
        }
        if (content & 2097151) {
            return stringFromCodePoint(content & 2097151);
        }
        return '';
    }
    isProtected(index) {
        return this._data[index * CELL_SIZE + 2] & 536870912;
    }
    loadCell(index, cell) {
        $startIndex = index * CELL_SIZE;
        cell.content = this._data[$startIndex + 0];
        cell.fg = this._data[$startIndex + 1];
        cell.bg = this._data[$startIndex + 2];
        if (cell.content & 2097152) {
            cell.combinedData = this._combined[index];
        }
        if (cell.bg & 268435456) {
            cell.extended = this._extendedAttrs[index];
        }
        return cell;
    }
    setCell(index, cell) {
        if (cell.content & 2097152) {
            this._combined[index] = cell.combinedData;
        }
        if (cell.bg & 268435456) {
            this._extendedAttrs[index] = cell.extended;
        }
        this._data[index * CELL_SIZE + 0] = cell.content;
        this._data[index * CELL_SIZE + 1] = cell.fg;
        this._data[index * CELL_SIZE + 2] = cell.bg;
    }
    setCellFromCodepoint(index, codePoint, width, attrs) {
        if (attrs.bg & 268435456) {
            this._extendedAttrs[index] = attrs.extended;
        }
        this._data[index * CELL_SIZE + 0] = codePoint | (width << 22);
        this._data[index * CELL_SIZE + 1] = attrs.fg;
        this._data[index * CELL_SIZE + 2] = attrs.bg;
    }
    addCodepointToCell(index, codePoint, width) {
        let content = this._data[index * CELL_SIZE + 0];
        if (content & 2097152) {
            this._combined[index] += stringFromCodePoint(codePoint);
        }
        else {
            if (content & 2097151) {
                this._combined[index] = stringFromCodePoint(content & 2097151) + stringFromCodePoint(codePoint);
                content &= ~2097151;
                content |= 2097152;
            }
            else {
                content = codePoint | (1 << 22);
            }
        }
        if (width) {
            content &= ~12582912;
            content |= width << 22;
        }
        this._data[index * CELL_SIZE + 0] = content;
    }
    insertCells(pos, n, fillCellData) {
        pos %= this.length;
        if (pos && this.getWidth(pos - 1) === 2) {
            this.setCellFromCodepoint(pos - 1, 0, 1, fillCellData);
        }
        if (n < this.length - pos) {
            const cell = new CellData();
            for (let i = this.length - pos - n - 1; i >= 0; --i) {
                this.setCell(pos + n + i, this.loadCell(pos + i, cell));
            }
            for (let i = 0; i < n; ++i) {
                this.setCell(pos + i, fillCellData);
            }
        }
        else {
            for (let i = pos; i < this.length; ++i) {
                this.setCell(i, fillCellData);
            }
        }
        if (this.getWidth(this.length - 1) === 2) {
            this.setCellFromCodepoint(this.length - 1, 0, 1, fillCellData);
        }
    }
    deleteCells(pos, n, fillCellData) {
        pos %= this.length;
        if (n < this.length - pos) {
            const cell = new CellData();
            for (let i = 0; i < this.length - pos - n; ++i) {
                this.setCell(pos + i, this.loadCell(pos + n + i, cell));
            }
            for (let i = this.length - n; i < this.length; ++i) {
                this.setCell(i, fillCellData);
            }
        }
        else {
            for (let i = pos; i < this.length; ++i) {
                this.setCell(i, fillCellData);
            }
        }
        if (pos && this.getWidth(pos - 1) === 2) {
            this.setCellFromCodepoint(pos - 1, 0, 1, fillCellData);
        }
        if (this.getWidth(pos) === 0 && !this.hasContent(pos)) {
            this.setCellFromCodepoint(pos, 0, 1, fillCellData);
        }
    }
    replaceCells(start, end, fillCellData, respectProtect = false) {
        if (respectProtect) {
            if (start && this.getWidth(start - 1) === 2 && !this.isProtected(start - 1)) {
                this.setCellFromCodepoint(start - 1, 0, 1, fillCellData);
            }
            if (end < this.length && this.getWidth(end - 1) === 2 && !this.isProtected(end)) {
                this.setCellFromCodepoint(end, 0, 1, fillCellData);
            }
            while (start < end && start < this.length) {
                if (!this.isProtected(start)) {
                    this.setCell(start, fillCellData);
                }
                start++;
            }
            return;
        }
        if (start && this.getWidth(start - 1) === 2) {
            this.setCellFromCodepoint(start - 1, 0, 1, fillCellData);
        }
        if (end < this.length && this.getWidth(end - 1) === 2) {
            this.setCellFromCodepoint(end, 0, 1, fillCellData);
        }
        while (start < end && start < this.length) {
            this.setCell(start++, fillCellData);
        }
    }
    resize(cols, fillCellData) {
        if (cols === this.length) {
            return this._data.length * 4 * CLEANUP_THRESHOLD < this._data.buffer.byteLength;
        }
        const uint32Cells = cols * CELL_SIZE;
        if (cols > this.length) {
            if (this._data.buffer.byteLength >= uint32Cells * 4) {
                this._data = new Uint32Array(this._data.buffer, 0, uint32Cells);
            }
            else {
                const data = new Uint32Array(uint32Cells);
                data.set(this._data);
                this._data = data;
            }
            for (let i = this.length; i < cols; ++i) {
                this.setCell(i, fillCellData);
            }
        }
        else {
            this._data = this._data.subarray(0, uint32Cells);
            const keys = Object.keys(this._combined);
            for (let i = 0; i < keys.length; i++) {
                const key = parseInt(keys[i], 10);
                if (key >= cols) {
                    delete this._combined[key];
                }
            }
            const extKeys = Object.keys(this._extendedAttrs);
            for (let i = 0; i < extKeys.length; i++) {
                const key = parseInt(extKeys[i], 10);
                if (key >= cols) {
                    delete this._extendedAttrs[key];
                }
            }
        }
        this.length = cols;
        return uint32Cells * 4 * CLEANUP_THRESHOLD < this._data.buffer.byteLength;
    }
    cleanupMemory() {
        if (this._data.length * 4 * CLEANUP_THRESHOLD < this._data.buffer.byteLength) {
            const data = new Uint32Array(this._data.length);
            data.set(this._data);
            this._data = data;
            return 1;
        }
        return 0;
    }
    fill(fillCellData, respectProtect = false) {
        if (respectProtect) {
            for (let i = 0; i < this.length; ++i) {
                if (!this.isProtected(i)) {
                    this.setCell(i, fillCellData);
                }
            }
            return;
        }
        this._combined = {};
        this._extendedAttrs = {};
        for (let i = 0; i < this.length; ++i) {
            this.setCell(i, fillCellData);
        }
    }
    copyFrom(line) {
        if (this.length !== line.length) {
            this._data = new Uint32Array(line._data);
        }
        else {
            this._data.set(line._data);
        }
        this.length = line.length;
        this._combined = {};
        for (const el in line._combined) {
            this._combined[el] = line._combined[el];
        }
        this._extendedAttrs = {};
        for (const el in line._extendedAttrs) {
            this._extendedAttrs[el] = line._extendedAttrs[el];
        }
        this.isWrapped = line.isWrapped;
    }
    clone() {
        const newLine = new BufferLine(0);
        newLine._data = new Uint32Array(this._data);
        newLine.length = this.length;
        for (const el in this._combined) {
            newLine._combined[el] = this._combined[el];
        }
        for (const el in this._extendedAttrs) {
            newLine._extendedAttrs[el] = this._extendedAttrs[el];
        }
        newLine.isWrapped = this.isWrapped;
        return newLine;
    }
    getTrimmedLength() {
        for (let i = this.length - 1; i >= 0; --i) {
            if ((this._data[i * CELL_SIZE + 0] & 4194303)) {
                return i + (this._data[i * CELL_SIZE + 0] >> 22);
            }
        }
        return 0;
    }
    getNoBgTrimmedLength() {
        for (let i = this.length - 1; i >= 0; --i) {
            if ((this._data[i * CELL_SIZE + 0] & 4194303) || (this._data[i * CELL_SIZE + 2] & 50331648)) {
                return i + (this._data[i * CELL_SIZE + 0] >> 22);
            }
        }
        return 0;
    }
    copyCellsFrom(src, srcCol, destCol, length, applyInReverse) {
        const srcData = src._data;
        if (applyInReverse) {
            for (let cell = length - 1; cell >= 0; cell--) {
                for (let i = 0; i < CELL_SIZE; i++) {
                    this._data[(destCol + cell) * CELL_SIZE + i] = srcData[(srcCol + cell) * CELL_SIZE + i];
                }
                if (srcData[(srcCol + cell) * CELL_SIZE + 2] & 268435456) {
                    this._extendedAttrs[destCol + cell] = src._extendedAttrs[srcCol + cell];
                }
            }
        }
        else {
            for (let cell = 0; cell < length; cell++) {
                for (let i = 0; i < CELL_SIZE; i++) {
                    this._data[(destCol + cell) * CELL_SIZE + i] = srcData[(srcCol + cell) * CELL_SIZE + i];
                }
                if (srcData[(srcCol + cell) * CELL_SIZE + 2] & 268435456) {
                    this._extendedAttrs[destCol + cell] = src._extendedAttrs[srcCol + cell];
                }
            }
        }
        const srcCombinedKeys = Object.keys(src._combined);
        for (let i = 0; i < srcCombinedKeys.length; i++) {
            const key = parseInt(srcCombinedKeys[i], 10);
            if (key >= srcCol) {
                this._combined[key - srcCol + destCol] = src._combined[key];
            }
        }
    }
    translateToString(trimRight, startCol, endCol, outColumns) {
        startCol = startCol !== null && startCol !== void 0 ? startCol : 0;
        endCol = endCol !== null && endCol !== void 0 ? endCol : this.length;
        if (trimRight) {
            endCol = Math.min(endCol, this.getTrimmedLength());
        }
        if (outColumns) {
            outColumns.length = 0;
        }
        let result = '';
        while (startCol < endCol) {
            const content = this._data[startCol * CELL_SIZE + 0];
            const cp = content & 2097151;
            const chars = (content & 2097152) ? this._combined[startCol] : (cp) ? stringFromCodePoint(cp) : WHITESPACE_CELL_CHAR;
            result += chars;
            if (outColumns) {
                for (let i = 0; i < chars.length; ++i) {
                    outColumns.push(startCol);
                }
            }
            startCol += (content >> 22) || 1;
        }
        if (outColumns) {
            outColumns.push(startCol);
        }
        return result;
    }
}

const DI_TARGET = 'di$target';
const DI_DEPENDENCIES = 'di$dependencies';
const serviceRegistry = new Map();
function getServiceDependencies(ctor) {
    return ctor[DI_DEPENDENCIES] || [];
}
function createDecorator(id) {
    if (serviceRegistry.has(id)) {
        return serviceRegistry.get(id);
    }
    const decorator = function (target, key, index) {
        if (arguments.length !== 3) {
            throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
        }
        storeServiceDependency(decorator, target, index);
    };
    decorator.toString = () => id;
    serviceRegistry.set(id, decorator);
    return decorator;
}
function storeServiceDependency(id, target, index) {
    if (target[DI_TARGET] === target) {
        target[DI_DEPENDENCIES].push({ id, index });
    }
    else {
        target[DI_DEPENDENCIES] = [{ id, index }];
        target[DI_TARGET] = target;
    }
}

const IBufferService = createDecorator('BufferService');
const ICoreMouseService = createDecorator('CoreMouseService');
const ICoreService = createDecorator('CoreService');
const ICharsetService = createDecorator('CharsetService');
const IInstantiationService = createDecorator('InstantiationService');
var LogLevelEnum;
(function (LogLevelEnum) {
    LogLevelEnum[LogLevelEnum["TRACE"] = 0] = "TRACE";
    LogLevelEnum[LogLevelEnum["DEBUG"] = 1] = "DEBUG";
    LogLevelEnum[LogLevelEnum["INFO"] = 2] = "INFO";
    LogLevelEnum[LogLevelEnum["WARN"] = 3] = "WARN";
    LogLevelEnum[LogLevelEnum["ERROR"] = 4] = "ERROR";
    LogLevelEnum[LogLevelEnum["OFF"] = 5] = "OFF";
})(LogLevelEnum || (LogLevelEnum = {}));
const ILogService = createDecorator('LogService');
const IOptionsService = createDecorator('OptionsService');
const IOscLinkService = createDecorator('OscLinkService');
const IUnicodeService = createDecorator('UnicodeService');
createDecorator('DecorationService');

class ServiceCollection {
    constructor(...entries) {
        this._entries = new Map();
        for (const [id, service] of entries) {
            this.set(id, service);
        }
    }
    set(id, instance) {
        const result = this._entries.get(id);
        this._entries.set(id, instance);
        return result;
    }
    forEach(callback) {
        for (const [key, value] of this._entries.entries()) {
            callback(key, value);
        }
    }
    has(id) {
        return this._entries.has(id);
    }
    get(id) {
        return this._entries.get(id);
    }
}
class InstantiationService {
    constructor() {
        this._services = new ServiceCollection();
        this._services.set(IInstantiationService, this);
    }
    setService(id, instance) {
        this._services.set(id, instance);
    }
    getService(id) {
        return this._services.get(id);
    }
    createInstance(ctor, ...args) {
        const serviceDependencies = getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
        const serviceArgs = [];
        for (const dependency of serviceDependencies) {
            const service = this._services.get(dependency.id);
            if (!service) {
                throw new Error(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`);
            }
            serviceArgs.push(service);
        }
        const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;
        if (args.length !== firstServiceArgPos) {
            throw new Error(`[createInstance] First service dependency of ${ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`);
        }
        return new ctor(...[...args, ...serviceArgs]);
    }
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
  return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const optionsKeyToLogLevel = {
    trace: LogLevelEnum.TRACE,
    debug: LogLevelEnum.DEBUG,
    info: LogLevelEnum.INFO,
    warn: LogLevelEnum.WARN,
    error: LogLevelEnum.ERROR,
    off: LogLevelEnum.OFF
};
const LOG_PREFIX = 'xterm.js: ';
let LogService = class LogService extends Disposable {
    get logLevel() { return this._logLevel; }
    constructor(_optionsService) {
        super();
        this._optionsService = _optionsService;
        this._logLevel = LogLevelEnum.OFF;
        this._updateLogLevel();
        this.register(this._optionsService.onSpecificOptionChange('logLevel', () => this._updateLogLevel()));
    }
    _updateLogLevel() {
        this._logLevel = optionsKeyToLogLevel[this._optionsService.rawOptions.logLevel];
    }
    _evalLazyOptionalParams(optionalParams) {
        for (let i = 0; i < optionalParams.length; i++) {
            if (typeof optionalParams[i] === 'function') {
                optionalParams[i] = optionalParams[i]();
            }
        }
    }
    _log(type, message, optionalParams) {
        this._evalLazyOptionalParams(optionalParams);
        type.call(console, (this._optionsService.options.logger ? '' : LOG_PREFIX) + message, ...optionalParams);
    }
    trace(message, ...optionalParams) {
        var _a, _b;
        if (this._logLevel <= LogLevelEnum.TRACE) {
            this._log((_b = (_a = this._optionsService.options.logger) === null || _a === void 0 ? void 0 : _a.trace.bind(this._optionsService.options.logger)) !== null && _b !== void 0 ? _b : console.log, message, optionalParams);
        }
    }
    debug(message, ...optionalParams) {
        var _a, _b;
        if (this._logLevel <= LogLevelEnum.DEBUG) {
            this._log((_b = (_a = this._optionsService.options.logger) === null || _a === void 0 ? void 0 : _a.debug.bind(this._optionsService.options.logger)) !== null && _b !== void 0 ? _b : console.log, message, optionalParams);
        }
    }
    info(message, ...optionalParams) {
        var _a, _b;
        if (this._logLevel <= LogLevelEnum.INFO) {
            this._log((_b = (_a = this._optionsService.options.logger) === null || _a === void 0 ? void 0 : _a.info.bind(this._optionsService.options.logger)) !== null && _b !== void 0 ? _b : console.info, message, optionalParams);
        }
    }
    warn(message, ...optionalParams) {
        var _a, _b;
        if (this._logLevel <= LogLevelEnum.WARN) {
            this._log((_b = (_a = this._optionsService.options.logger) === null || _a === void 0 ? void 0 : _a.warn.bind(this._optionsService.options.logger)) !== null && _b !== void 0 ? _b : console.warn, message, optionalParams);
        }
    }
    error(message, ...optionalParams) {
        var _a, _b;
        if (this._logLevel <= LogLevelEnum.ERROR) {
            this._log((_b = (_a = this._optionsService.options.logger) === null || _a === void 0 ? void 0 : _a.error.bind(this._optionsService.options.logger)) !== null && _b !== void 0 ? _b : console.error, message, optionalParams);
        }
    }
};
LogService = __decorate([
    __param(0, IOptionsService),
    __metadata("design:paramtypes", [Object])
], LogService);

class CircularList extends Disposable {
    constructor(_maxLength) {
        super();
        this._maxLength = _maxLength;
        this.onDeleteEmitter = this.register(new EventEmitter());
        this.onDelete = this.onDeleteEmitter.event;
        this.onInsertEmitter = this.register(new EventEmitter());
        this.onInsert = this.onInsertEmitter.event;
        this.onTrimEmitter = this.register(new EventEmitter());
        this.onTrim = this.onTrimEmitter.event;
        this._array = new Array(this._maxLength);
        this._startIndex = 0;
        this._length = 0;
    }
    get maxLength() {
        return this._maxLength;
    }
    set maxLength(newMaxLength) {
        if (this._maxLength === newMaxLength) {
            return;
        }
        const newArray = new Array(newMaxLength);
        for (let i = 0; i < Math.min(newMaxLength, this.length); i++) {
            newArray[i] = this._array[this._getCyclicIndex(i)];
        }
        this._array = newArray;
        this._maxLength = newMaxLength;
        this._startIndex = 0;
    }
    get length() {
        return this._length;
    }
    set length(newLength) {
        if (newLength > this._length) {
            for (let i = this._length; i < newLength; i++) {
                this._array[i] = undefined;
            }
        }
        this._length = newLength;
    }
    get(index) {
        return this._array[this._getCyclicIndex(index)];
    }
    set(index, value) {
        this._array[this._getCyclicIndex(index)] = value;
    }
    push(value) {
        this._array[this._getCyclicIndex(this._length)] = value;
        if (this._length === this._maxLength) {
            this._startIndex = ++this._startIndex % this._maxLength;
            this.onTrimEmitter.fire(1);
        }
        else {
            this._length++;
        }
    }
    recycle() {
        if (this._length !== this._maxLength) {
            throw new Error('Can only recycle when the buffer is full');
        }
        this._startIndex = ++this._startIndex % this._maxLength;
        this.onTrimEmitter.fire(1);
        return this._array[this._getCyclicIndex(this._length - 1)];
    }
    get isFull() {
        return this._length === this._maxLength;
    }
    pop() {
        return this._array[this._getCyclicIndex(this._length-- - 1)];
    }
    splice(start, deleteCount, ...items) {
        if (deleteCount) {
            for (let i = start; i < this._length - deleteCount; i++) {
                this._array[this._getCyclicIndex(i)] = this._array[this._getCyclicIndex(i + deleteCount)];
            }
            this._length -= deleteCount;
            this.onDeleteEmitter.fire({ index: start, amount: deleteCount });
        }
        for (let i = this._length - 1; i >= start; i--) {
            this._array[this._getCyclicIndex(i + items.length)] = this._array[this._getCyclicIndex(i)];
        }
        for (let i = 0; i < items.length; i++) {
            this._array[this._getCyclicIndex(start + i)] = items[i];
        }
        if (items.length) {
            this.onInsertEmitter.fire({ index: start, amount: items.length });
        }
        if (this._length + items.length > this._maxLength) {
            const countToTrim = (this._length + items.length) - this._maxLength;
            this._startIndex += countToTrim;
            this._length = this._maxLength;
            this.onTrimEmitter.fire(countToTrim);
        }
        else {
            this._length += items.length;
        }
    }
    trimStart(count) {
        if (count > this._length) {
            count = this._length;
        }
        this._startIndex += count;
        this._length -= count;
        this.onTrimEmitter.fire(count);
    }
    shiftElements(start, count, offset) {
        if (count <= 0) {
            return;
        }
        if (start < 0 || start >= this._length) {
            throw new Error('start argument out of range');
        }
        if (start + offset < 0) {
            throw new Error('Cannot shift elements in list beyond index 0');
        }
        if (offset > 0) {
            for (let i = count - 1; i >= 0; i--) {
                this.set(start + i + offset, this.get(start + i));
            }
            const expandListBy = (start + count + offset) - this._length;
            if (expandListBy > 0) {
                this._length += expandListBy;
                while (this._length > this._maxLength) {
                    this._length--;
                    this._startIndex++;
                    this.onTrimEmitter.fire(1);
                }
            }
        }
        else {
            for (let i = 0; i < count; i++) {
                this.set(start + i + offset, this.get(start + i));
            }
        }
    }
    _getCyclicIndex(index) {
        return (this._startIndex + index) % this._maxLength;
    }
}

const isNode = (typeof process !== 'undefined') ? true : false;
const userAgent = (isNode) ? 'node' : navigator.userAgent;
const platform = (isNode) ? 'node' : navigator.platform;
userAgent.includes('Firefox');
userAgent.includes('Edge');
const isMac = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'].includes(platform);
platform.indexOf('Linux') >= 0;

class TaskQueue {
    constructor() {
        this._tasks = [];
        this._i = 0;
    }
    enqueue(task) {
        this._tasks.push(task);
        this._start();
    }
    flush() {
        while (this._i < this._tasks.length) {
            if (!this._tasks[this._i]()) {
                this._i++;
            }
        }
        this.clear();
    }
    clear() {
        if (this._idleCallback) {
            this._cancelCallback(this._idleCallback);
            this._idleCallback = undefined;
        }
        this._i = 0;
        this._tasks.length = 0;
    }
    _start() {
        if (!this._idleCallback) {
            this._idleCallback = this._requestCallback(this._process.bind(this));
        }
    }
    _process(deadline) {
        this._idleCallback = undefined;
        let taskDuration = 0;
        let longestTask = 0;
        let lastDeadlineRemaining = deadline.timeRemaining();
        let deadlineRemaining = 0;
        while (this._i < this._tasks.length) {
            taskDuration = Date.now();
            if (!this._tasks[this._i]()) {
                this._i++;
            }
            taskDuration = Math.max(1, Date.now() - taskDuration);
            longestTask = Math.max(taskDuration, longestTask);
            deadlineRemaining = deadline.timeRemaining();
            if (longestTask * 1.5 > deadlineRemaining) {
                if (lastDeadlineRemaining - taskDuration < -20) {
                    console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(lastDeadlineRemaining - taskDuration))}ms`);
                }
                this._start();
                return;
            }
            lastDeadlineRemaining = deadlineRemaining;
        }
        this.clear();
    }
}
class PriorityTaskQueue extends TaskQueue {
    _requestCallback(callback) {
        return setTimeout(() => callback(this._createDeadline(16)));
    }
    _cancelCallback(identifier) {
        clearTimeout(identifier);
    }
    _createDeadline(duration) {
        const end = Date.now() + duration;
        return {
            timeRemaining: () => Math.max(0, end - Date.now())
        };
    }
}
class IdleTaskQueueInternal extends TaskQueue {
    _requestCallback(callback) {
        return requestIdleCallback(callback);
    }
    _cancelCallback(identifier) {
        cancelIdleCallback(identifier);
    }
}
const IdleTaskQueue = (!isNode && 'requestIdleCallback' in window) ? IdleTaskQueueInternal : PriorityTaskQueue;

function reflowLargerGetLinesToRemove(lines, oldCols, newCols, bufferAbsoluteY, nullCell) {
    const toRemove = [];
    for (let y = 0; y < lines.length - 1; y++) {
        let i = y;
        let nextLine = lines.get(++i);
        if (!nextLine.isWrapped) {
            continue;
        }
        const wrappedLines = [lines.get(y)];
        while (i < lines.length && nextLine.isWrapped) {
            wrappedLines.push(nextLine);
            nextLine = lines.get(++i);
        }
        if (bufferAbsoluteY >= y && bufferAbsoluteY < i) {
            y += wrappedLines.length - 1;
            continue;
        }
        let destLineIndex = 0;
        let destCol = getWrappedLineTrimmedLength(wrappedLines, destLineIndex, oldCols);
        let srcLineIndex = 1;
        let srcCol = 0;
        while (srcLineIndex < wrappedLines.length) {
            const srcTrimmedTineLength = getWrappedLineTrimmedLength(wrappedLines, srcLineIndex, oldCols);
            const srcRemainingCells = srcTrimmedTineLength - srcCol;
            const destRemainingCells = newCols - destCol;
            const cellsToCopy = Math.min(srcRemainingCells, destRemainingCells);
            wrappedLines[destLineIndex].copyCellsFrom(wrappedLines[srcLineIndex], srcCol, destCol, cellsToCopy, false);
            destCol += cellsToCopy;
            if (destCol === newCols) {
                destLineIndex++;
                destCol = 0;
            }
            srcCol += cellsToCopy;
            if (srcCol === srcTrimmedTineLength) {
                srcLineIndex++;
                srcCol = 0;
            }
            if (destCol === 0 && destLineIndex !== 0) {
                if (wrappedLines[destLineIndex - 1].getWidth(newCols - 1) === 2) {
                    wrappedLines[destLineIndex].copyCellsFrom(wrappedLines[destLineIndex - 1], newCols - 1, destCol++, 1, false);
                    wrappedLines[destLineIndex - 1].setCell(newCols - 1, nullCell);
                }
            }
        }
        wrappedLines[destLineIndex].replaceCells(destCol, newCols, nullCell);
        let countToRemove = 0;
        for (let i = wrappedLines.length - 1; i > 0; i--) {
            if (i > destLineIndex || wrappedLines[i].getTrimmedLength() === 0) {
                countToRemove++;
            }
            else {
                break;
            }
        }
        if (countToRemove > 0) {
            toRemove.push(y + wrappedLines.length - countToRemove);
            toRemove.push(countToRemove);
        }
        y += wrappedLines.length - 1;
    }
    return toRemove;
}
function reflowLargerCreateNewLayout(lines, toRemove) {
    const layout = [];
    let nextToRemoveIndex = 0;
    let nextToRemoveStart = toRemove[nextToRemoveIndex];
    let countRemovedSoFar = 0;
    for (let i = 0; i < lines.length; i++) {
        if (nextToRemoveStart === i) {
            const countToRemove = toRemove[++nextToRemoveIndex];
            lines.onDeleteEmitter.fire({
                index: i - countRemovedSoFar,
                amount: countToRemove
            });
            i += countToRemove - 1;
            countRemovedSoFar += countToRemove;
            nextToRemoveStart = toRemove[++nextToRemoveIndex];
        }
        else {
            layout.push(i);
        }
    }
    return {
        layout,
        countRemoved: countRemovedSoFar
    };
}
function reflowLargerApplyNewLayout(lines, newLayout) {
    const newLayoutLines = [];
    for (let i = 0; i < newLayout.length; i++) {
        newLayoutLines.push(lines.get(newLayout[i]));
    }
    for (let i = 0; i < newLayoutLines.length; i++) {
        lines.set(i, newLayoutLines[i]);
    }
    lines.length = newLayout.length;
}
function reflowSmallerGetNewLineLengths(wrappedLines, oldCols, newCols) {
    const newLineLengths = [];
    const cellsNeeded = wrappedLines.map((l, i) => getWrappedLineTrimmedLength(wrappedLines, i, oldCols)).reduce((p, c) => p + c);
    let srcCol = 0;
    let srcLine = 0;
    let cellsAvailable = 0;
    while (cellsAvailable < cellsNeeded) {
        if (cellsNeeded - cellsAvailable < newCols) {
            newLineLengths.push(cellsNeeded - cellsAvailable);
            break;
        }
        srcCol += newCols;
        const oldTrimmedLength = getWrappedLineTrimmedLength(wrappedLines, srcLine, oldCols);
        if (srcCol > oldTrimmedLength) {
            srcCol -= oldTrimmedLength;
            srcLine++;
        }
        const endsWithWide = wrappedLines[srcLine].getWidth(srcCol - 1) === 2;
        if (endsWithWide) {
            srcCol--;
        }
        const lineLength = endsWithWide ? newCols - 1 : newCols;
        newLineLengths.push(lineLength);
        cellsAvailable += lineLength;
    }
    return newLineLengths;
}
function getWrappedLineTrimmedLength(lines, i, cols) {
    if (i === lines.length - 1) {
        return lines[i].getTrimmedLength();
    }
    const endsInNull = !(lines[i].hasContent(cols - 1)) && lines[i].getWidth(cols - 1) === 1;
    const followingLineStartsWithWide = lines[i + 1].getWidth(0) === 2;
    if (endsInNull && followingLineStartsWithWide) {
        return cols - 1;
    }
    return cols;
}

class Marker {
    get id() { return this._id; }
    constructor(line) {
        this.line = line;
        this.isDisposed = false;
        this._disposables = [];
        this._id = Marker._nextId++;
        this._onDispose = this.register(new EventEmitter());
        this.onDispose = this._onDispose.event;
    }
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.isDisposed = true;
        this.line = -1;
        this._onDispose.fire();
        disposeArray(this._disposables);
        this._disposables.length = 0;
    }
    register(disposable) {
        this._disposables.push(disposable);
        return disposable;
    }
}
Marker._nextId = 1;

const CHARSETS = {};
const DEFAULT_CHARSET = CHARSETS['B'];
CHARSETS['0'] = {
    '`': '\u25c6',
    'a': '\u2592',
    'b': '\u2409',
    'c': '\u240c',
    'd': '\u240d',
    'e': '\u240a',
    'f': '\u00b0',
    'g': '\u00b1',
    'h': '\u2424',
    'i': '\u240b',
    'j': '\u2518',
    'k': '\u2510',
    'l': '\u250c',
    'm': '\u2514',
    'n': '\u253c',
    'o': '\u23ba',
    'p': '\u23bb',
    'q': '\u2500',
    'r': '\u23bc',
    's': '\u23bd',
    't': '\u251c',
    'u': '\u2524',
    'v': '\u2534',
    'w': '\u252c',
    'x': '\u2502',
    'y': '\u2264',
    'z': '\u2265',
    '{': '\u03c0',
    '|': '\u2260',
    '}': '\u00a3',
    '~': '\u00b7'
};
CHARSETS['A'] = {
    '#': '£'
};
CHARSETS['B'] = undefined;
CHARSETS['4'] = {
    '#': '£',
    '@': '¾',
    '[': 'ij',
    '\\': '½',
    ']': '|',
    '{': '¨',
    '|': 'f',
    '}': '¼',
    '~': '´'
};
CHARSETS['C'] =
    CHARSETS['5'] = {
        '[': 'Ä',
        '\\': 'Ö',
        ']': 'Å',
        '^': 'Ü',
        '`': 'é',
        '{': 'ä',
        '|': 'ö',
        '}': 'å',
        '~': 'ü'
    };
CHARSETS['R'] = {
    '#': '£',
    '@': 'à',
    '[': '°',
    '\\': 'ç',
    ']': '§',
    '{': 'é',
    '|': 'ù',
    '}': 'è',
    '~': '¨'
};
CHARSETS['Q'] = {
    '@': 'à',
    '[': 'â',
    '\\': 'ç',
    ']': 'ê',
    '^': 'î',
    '`': 'ô',
    '{': 'é',
    '|': 'ù',
    '}': 'è',
    '~': 'û'
};
CHARSETS['K'] = {
    '@': '§',
    '[': 'Ä',
    '\\': 'Ö',
    ']': 'Ü',
    '{': 'ä',
    '|': 'ö',
    '}': 'ü',
    '~': 'ß'
};
CHARSETS['Y'] = {
    '#': '£',
    '@': '§',
    '[': '°',
    '\\': 'ç',
    ']': 'é',
    '`': 'ù',
    '{': 'à',
    '|': 'ò',
    '}': 'è',
    '~': 'ì'
};
CHARSETS['E'] =
    CHARSETS['6'] = {
        '@': 'Ä',
        '[': 'Æ',
        '\\': 'Ø',
        ']': 'Å',
        '^': 'Ü',
        '`': 'ä',
        '{': 'æ',
        '|': 'ø',
        '}': 'å',
        '~': 'ü'
    };
CHARSETS['Z'] = {
    '#': '£',
    '@': '§',
    '[': '¡',
    '\\': 'Ñ',
    ']': '¿',
    '{': '°',
    '|': 'ñ',
    '}': 'ç'
};
CHARSETS['H'] =
    CHARSETS['7'] = {
        '@': 'É',
        '[': 'Ä',
        '\\': 'Ö',
        ']': 'Å',
        '^': 'Ü',
        '`': 'é',
        '{': 'ä',
        '|': 'ö',
        '}': 'å',
        '~': 'ü'
    };
CHARSETS['='] = {
    '#': 'ù',
    '@': 'à',
    '[': 'é',
    '\\': 'ç',
    ']': 'ê',
    '^': 'î',
    '_': 'è',
    '`': 'ô',
    '{': 'ä',
    '|': 'ö',
    '}': 'ü',
    '~': 'û'
};

const MAX_BUFFER_SIZE = 4294967295;
class Buffer {
    constructor(_hasScrollback, _optionsService, _bufferService) {
        this._hasScrollback = _hasScrollback;
        this._optionsService = _optionsService;
        this._bufferService = _bufferService;
        this.ydisp = 0;
        this.ybase = 0;
        this.y = 0;
        this.x = 0;
        this.tabs = {};
        this.savedY = 0;
        this.savedX = 0;
        this.savedCurAttrData = DEFAULT_ATTR_DATA.clone();
        this.savedCharset = DEFAULT_CHARSET;
        this.markers = [];
        this._nullCell = CellData.fromCharData([0, NULL_CELL_CHAR, NULL_CELL_WIDTH, NULL_CELL_CODE]);
        this._whitespaceCell = CellData.fromCharData([0, WHITESPACE_CELL_CHAR, WHITESPACE_CELL_WIDTH, WHITESPACE_CELL_CODE]);
        this._isClearing = false;
        this._memoryCleanupQueue = new IdleTaskQueue();
        this._memoryCleanupPosition = 0;
        this._cols = this._bufferService.cols;
        this._rows = this._bufferService.rows;
        this.lines = new CircularList(this._getCorrectBufferLength(this._rows));
        this.scrollTop = 0;
        this.scrollBottom = this._rows - 1;
        this.setupTabStops();
    }
    getNullCell(attr) {
        if (attr) {
            this._nullCell.fg = attr.fg;
            this._nullCell.bg = attr.bg;
            this._nullCell.extended = attr.extended;
        }
        else {
            this._nullCell.fg = 0;
            this._nullCell.bg = 0;
            this._nullCell.extended = new ExtendedAttrs();
        }
        return this._nullCell;
    }
    getWhitespaceCell(attr) {
        if (attr) {
            this._whitespaceCell.fg = attr.fg;
            this._whitespaceCell.bg = attr.bg;
            this._whitespaceCell.extended = attr.extended;
        }
        else {
            this._whitespaceCell.fg = 0;
            this._whitespaceCell.bg = 0;
            this._whitespaceCell.extended = new ExtendedAttrs();
        }
        return this._whitespaceCell;
    }
    getBlankLine(attr, isWrapped) {
        return new BufferLine(this._bufferService.cols, this.getNullCell(attr), isWrapped);
    }
    get hasScrollback() {
        return this._hasScrollback && this.lines.maxLength > this._rows;
    }
    get isCursorInViewport() {
        const absoluteY = this.ybase + this.y;
        const relativeY = absoluteY - this.ydisp;
        return (relativeY >= 0 && relativeY < this._rows);
    }
    _getCorrectBufferLength(rows) {
        if (!this._hasScrollback) {
            return rows;
        }
        const correctBufferLength = rows + this._optionsService.rawOptions.scrollback;
        return correctBufferLength > MAX_BUFFER_SIZE ? MAX_BUFFER_SIZE : correctBufferLength;
    }
    fillViewportRows(fillAttr) {
        if (this.lines.length === 0) {
            if (fillAttr === undefined) {
                fillAttr = DEFAULT_ATTR_DATA;
            }
            let i = this._rows;
            while (i--) {
                this.lines.push(this.getBlankLine(fillAttr));
            }
        }
    }
    clear() {
        this.ydisp = 0;
        this.ybase = 0;
        this.y = 0;
        this.x = 0;
        this.lines = new CircularList(this._getCorrectBufferLength(this._rows));
        this.scrollTop = 0;
        this.scrollBottom = this._rows - 1;
        this.setupTabStops();
    }
    resize(newCols, newRows) {
        const nullCell = this.getNullCell(DEFAULT_ATTR_DATA);
        let dirtyMemoryLines = 0;
        const newMaxLength = this._getCorrectBufferLength(newRows);
        if (newMaxLength > this.lines.maxLength) {
            this.lines.maxLength = newMaxLength;
        }
        if (this.lines.length > 0) {
            if (this._cols < newCols) {
                for (let i = 0; i < this.lines.length; i++) {
                    dirtyMemoryLines += +this.lines.get(i).resize(newCols, nullCell);
                }
            }
            let addToY = 0;
            if (this._rows < newRows) {
                for (let y = this._rows; y < newRows; y++) {
                    if (this.lines.length < newRows + this.ybase) {
                        if (this._optionsService.rawOptions.windowsMode || this._optionsService.rawOptions.windowsPty.backend !== undefined || this._optionsService.rawOptions.windowsPty.buildNumber !== undefined) {
                            this.lines.push(new BufferLine(newCols, nullCell));
                        }
                        else {
                            if (this.ybase > 0 && this.lines.length <= this.ybase + this.y + addToY + 1) {
                                this.ybase--;
                                addToY++;
                                if (this.ydisp > 0) {
                                    this.ydisp--;
                                }
                            }
                            else {
                                this.lines.push(new BufferLine(newCols, nullCell));
                            }
                        }
                    }
                }
            }
            else {
                for (let y = this._rows; y > newRows; y--) {
                    if (this.lines.length > newRows + this.ybase) {
                        if (this.lines.length > this.ybase + this.y + 1) {
                            this.lines.pop();
                        }
                        else {
                            this.ybase++;
                            this.ydisp++;
                        }
                    }
                }
            }
            if (newMaxLength < this.lines.maxLength) {
                const amountToTrim = this.lines.length - newMaxLength;
                if (amountToTrim > 0) {
                    this.lines.trimStart(amountToTrim);
                    this.ybase = Math.max(this.ybase - amountToTrim, 0);
                    this.ydisp = Math.max(this.ydisp - amountToTrim, 0);
                    this.savedY = Math.max(this.savedY - amountToTrim, 0);
                }
                this.lines.maxLength = newMaxLength;
            }
            this.x = Math.min(this.x, newCols - 1);
            this.y = Math.min(this.y, newRows - 1);
            if (addToY) {
                this.y += addToY;
            }
            this.savedX = Math.min(this.savedX, newCols - 1);
            this.scrollTop = 0;
        }
        this.scrollBottom = newRows - 1;
        if (this._isReflowEnabled) {
            this._reflow(newCols, newRows);
            if (this._cols > newCols) {
                for (let i = 0; i < this.lines.length; i++) {
                    dirtyMemoryLines += +this.lines.get(i).resize(newCols, nullCell);
                }
            }
        }
        this._cols = newCols;
        this._rows = newRows;
        this._memoryCleanupQueue.clear();
        if (dirtyMemoryLines > 0.1 * this.lines.length) {
            this._memoryCleanupPosition = 0;
            this._memoryCleanupQueue.enqueue(() => this._batchedMemoryCleanup());
        }
    }
    _batchedMemoryCleanup() {
        let normalRun = true;
        if (this._memoryCleanupPosition >= this.lines.length) {
            this._memoryCleanupPosition = 0;
            normalRun = false;
        }
        let counted = 0;
        while (this._memoryCleanupPosition < this.lines.length) {
            counted += this.lines.get(this._memoryCleanupPosition++).cleanupMemory();
            if (counted > 100) {
                return true;
            }
        }
        return normalRun;
    }
    get _isReflowEnabled() {
        const windowsPty = this._optionsService.rawOptions.windowsPty;
        if (windowsPty && windowsPty.buildNumber) {
            return this._hasScrollback && windowsPty.backend === 'conpty' && windowsPty.buildNumber >= 21376;
        }
        return this._hasScrollback && !this._optionsService.rawOptions.windowsMode;
    }
    _reflow(newCols, newRows) {
        if (this._cols === newCols) {
            return;
        }
        if (newCols > this._cols) {
            this._reflowLarger(newCols, newRows);
        }
        else {
            this._reflowSmaller(newCols, newRows);
        }
    }
    _reflowLarger(newCols, newRows) {
        const toRemove = reflowLargerGetLinesToRemove(this.lines, this._cols, newCols, this.ybase + this.y, this.getNullCell(DEFAULT_ATTR_DATA));
        if (toRemove.length > 0) {
            const newLayoutResult = reflowLargerCreateNewLayout(this.lines, toRemove);
            reflowLargerApplyNewLayout(this.lines, newLayoutResult.layout);
            this._reflowLargerAdjustViewport(newCols, newRows, newLayoutResult.countRemoved);
        }
    }
    _reflowLargerAdjustViewport(newCols, newRows, countRemoved) {
        const nullCell = this.getNullCell(DEFAULT_ATTR_DATA);
        let viewportAdjustments = countRemoved;
        while (viewportAdjustments-- > 0) {
            if (this.ybase === 0) {
                if (this.y > 0) {
                    this.y--;
                }
                if (this.lines.length < newRows) {
                    this.lines.push(new BufferLine(newCols, nullCell));
                }
            }
            else {
                if (this.ydisp === this.ybase) {
                    this.ydisp--;
                }
                this.ybase--;
            }
        }
        this.savedY = Math.max(this.savedY - countRemoved, 0);
    }
    _reflowSmaller(newCols, newRows) {
        const nullCell = this.getNullCell(DEFAULT_ATTR_DATA);
        const toInsert = [];
        let countToInsert = 0;
        for (let y = this.lines.length - 1; y >= 0; y--) {
            let nextLine = this.lines.get(y);
            if (!nextLine || !nextLine.isWrapped && nextLine.getTrimmedLength() <= newCols) {
                continue;
            }
            const wrappedLines = [nextLine];
            while (nextLine.isWrapped && y > 0) {
                nextLine = this.lines.get(--y);
                wrappedLines.unshift(nextLine);
            }
            const absoluteY = this.ybase + this.y;
            if (absoluteY >= y && absoluteY < y + wrappedLines.length) {
                continue;
            }
            const lastLineLength = wrappedLines[wrappedLines.length - 1].getTrimmedLength();
            const destLineLengths = reflowSmallerGetNewLineLengths(wrappedLines, this._cols, newCols);
            const linesToAdd = destLineLengths.length - wrappedLines.length;
            let trimmedLines;
            if (this.ybase === 0 && this.y !== this.lines.length - 1) {
                trimmedLines = Math.max(0, this.y - this.lines.maxLength + linesToAdd);
            }
            else {
                trimmedLines = Math.max(0, this.lines.length - this.lines.maxLength + linesToAdd);
            }
            const newLines = [];
            for (let i = 0; i < linesToAdd; i++) {
                const newLine = this.getBlankLine(DEFAULT_ATTR_DATA, true);
                newLines.push(newLine);
            }
            if (newLines.length > 0) {
                toInsert.push({
                    start: y + wrappedLines.length + countToInsert,
                    newLines
                });
                countToInsert += newLines.length;
            }
            wrappedLines.push(...newLines);
            let destLineIndex = destLineLengths.length - 1;
            let destCol = destLineLengths[destLineIndex];
            if (destCol === 0) {
                destLineIndex--;
                destCol = destLineLengths[destLineIndex];
            }
            let srcLineIndex = wrappedLines.length - linesToAdd - 1;
            let srcCol = lastLineLength;
            while (srcLineIndex >= 0) {
                const cellsToCopy = Math.min(srcCol, destCol);
                if (wrappedLines[destLineIndex] === undefined) {
                    break;
                }
                wrappedLines[destLineIndex].copyCellsFrom(wrappedLines[srcLineIndex], srcCol - cellsToCopy, destCol - cellsToCopy, cellsToCopy, true);
                destCol -= cellsToCopy;
                if (destCol === 0) {
                    destLineIndex--;
                    destCol = destLineLengths[destLineIndex];
                }
                srcCol -= cellsToCopy;
                if (srcCol === 0) {
                    srcLineIndex--;
                    const wrappedLinesIndex = Math.max(srcLineIndex, 0);
                    srcCol = getWrappedLineTrimmedLength(wrappedLines, wrappedLinesIndex, this._cols);
                }
            }
            for (let i = 0; i < wrappedLines.length; i++) {
                if (destLineLengths[i] < newCols) {
                    wrappedLines[i].setCell(destLineLengths[i], nullCell);
                }
            }
            let viewportAdjustments = linesToAdd - trimmedLines;
            while (viewportAdjustments-- > 0) {
                if (this.ybase === 0) {
                    if (this.y < newRows - 1) {
                        this.y++;
                        this.lines.pop();
                    }
                    else {
                        this.ybase++;
                        this.ydisp++;
                    }
                }
                else {
                    if (this.ybase < Math.min(this.lines.maxLength, this.lines.length + countToInsert) - newRows) {
                        if (this.ybase === this.ydisp) {
                            this.ydisp++;
                        }
                        this.ybase++;
                    }
                }
            }
            this.savedY = Math.min(this.savedY + linesToAdd, this.ybase + newRows - 1);
        }
        if (toInsert.length > 0) {
            const insertEvents = [];
            const originalLines = [];
            for (let i = 0; i < this.lines.length; i++) {
                originalLines.push(this.lines.get(i));
            }
            const originalLinesLength = this.lines.length;
            let originalLineIndex = originalLinesLength - 1;
            let nextToInsertIndex = 0;
            let nextToInsert = toInsert[nextToInsertIndex];
            this.lines.length = Math.min(this.lines.maxLength, this.lines.length + countToInsert);
            let countInsertedSoFar = 0;
            for (let i = Math.min(this.lines.maxLength - 1, originalLinesLength + countToInsert - 1); i >= 0; i--) {
                if (nextToInsert && nextToInsert.start > originalLineIndex + countInsertedSoFar) {
                    for (let nextI = nextToInsert.newLines.length - 1; nextI >= 0; nextI--) {
                        this.lines.set(i--, nextToInsert.newLines[nextI]);
                    }
                    i++;
                    insertEvents.push({
                        index: originalLineIndex + 1,
                        amount: nextToInsert.newLines.length
                    });
                    countInsertedSoFar += nextToInsert.newLines.length;
                    nextToInsert = toInsert[++nextToInsertIndex];
                }
                else {
                    this.lines.set(i, originalLines[originalLineIndex--]);
                }
            }
            let insertCountEmitted = 0;
            for (let i = insertEvents.length - 1; i >= 0; i--) {
                insertEvents[i].index += insertCountEmitted;
                this.lines.onInsertEmitter.fire(insertEvents[i]);
                insertCountEmitted += insertEvents[i].amount;
            }
            const amountToTrim = Math.max(0, originalLinesLength + countToInsert - this.lines.maxLength);
            if (amountToTrim > 0) {
                this.lines.onTrimEmitter.fire(amountToTrim);
            }
        }
    }
    translateBufferLineToString(lineIndex, trimRight, startCol = 0, endCol) {
        const line = this.lines.get(lineIndex);
        if (!line) {
            return '';
        }
        return line.translateToString(trimRight, startCol, endCol);
    }
    getWrappedRangeForLine(y) {
        let first = y;
        let last = y;
        while (first > 0 && this.lines.get(first).isWrapped) {
            first--;
        }
        while (last + 1 < this.lines.length && this.lines.get(last + 1).isWrapped) {
            last++;
        }
        return { first, last };
    }
    setupTabStops(i) {
        if (i !== null && i !== undefined) {
            if (!this.tabs[i]) {
                i = this.prevStop(i);
            }
        }
        else {
            this.tabs = {};
            i = 0;
        }
        for (; i < this._cols; i += this._optionsService.rawOptions.tabStopWidth) {
            this.tabs[i] = true;
        }
    }
    prevStop(x) {
        if (x === null || x === undefined) {
            x = this.x;
        }
        while (!this.tabs[--x] && x > 0)
            ;
        return x >= this._cols ? this._cols - 1 : x < 0 ? 0 : x;
    }
    nextStop(x) {
        if (x === null || x === undefined) {
            x = this.x;
        }
        while (!this.tabs[++x] && x < this._cols)
            ;
        return x >= this._cols ? this._cols - 1 : x < 0 ? 0 : x;
    }
    clearMarkers(y) {
        this._isClearing = true;
        for (let i = 0; i < this.markers.length; i++) {
            if (this.markers[i].line === y) {
                this.markers[i].dispose();
                this.markers.splice(i--, 1);
            }
        }
        this._isClearing = false;
    }
    clearAllMarkers() {
        this._isClearing = true;
        for (let i = 0; i < this.markers.length; i++) {
            this.markers[i].dispose();
            this.markers.splice(i--, 1);
        }
        this._isClearing = false;
    }
    addMarker(y) {
        const marker = new Marker(y);
        this.markers.push(marker);
        marker.register(this.lines.onTrim(amount => {
            marker.line -= amount;
            if (marker.line < 0) {
                marker.dispose();
            }
        }));
        marker.register(this.lines.onInsert(event => {
            if (marker.line >= event.index) {
                marker.line += event.amount;
            }
        }));
        marker.register(this.lines.onDelete(event => {
            if (marker.line >= event.index && marker.line < event.index + event.amount) {
                marker.dispose();
            }
            if (marker.line > event.index) {
                marker.line -= event.amount;
            }
        }));
        marker.register(marker.onDispose(() => this._removeMarker(marker)));
        return marker;
    }
    _removeMarker(marker) {
        if (!this._isClearing) {
            this.markers.splice(this.markers.indexOf(marker), 1);
        }
    }
}

class BufferSet extends Disposable {
    constructor(_optionsService, _bufferService) {
        super();
        this._optionsService = _optionsService;
        this._bufferService = _bufferService;
        this._onBufferActivate = this.register(new EventEmitter());
        this.onBufferActivate = this._onBufferActivate.event;
        this.reset();
        this.register(this._optionsService.onSpecificOptionChange('scrollback', () => this.resize(this._bufferService.cols, this._bufferService.rows)));
        this.register(this._optionsService.onSpecificOptionChange('tabStopWidth', () => this.setupTabStops()));
    }
    reset() {
        this._normal = new Buffer(true, this._optionsService, this._bufferService);
        this._normal.fillViewportRows();
        this._alt = new Buffer(false, this._optionsService, this._bufferService);
        this._activeBuffer = this._normal;
        this._onBufferActivate.fire({
            activeBuffer: this._normal,
            inactiveBuffer: this._alt
        });
        this.setupTabStops();
    }
    get alt() {
        return this._alt;
    }
    get active() {
        return this._activeBuffer;
    }
    get normal() {
        return this._normal;
    }
    activateNormalBuffer() {
        if (this._activeBuffer === this._normal) {
            return;
        }
        this._normal.x = this._alt.x;
        this._normal.y = this._alt.y;
        this._alt.clearAllMarkers();
        this._alt.clear();
        this._activeBuffer = this._normal;
        this._onBufferActivate.fire({
            activeBuffer: this._normal,
            inactiveBuffer: this._alt
        });
    }
    activateAltBuffer(fillAttr) {
        if (this._activeBuffer === this._alt) {
            return;
        }
        this._alt.fillViewportRows(fillAttr);
        this._alt.x = this._normal.x;
        this._alt.y = this._normal.y;
        this._activeBuffer = this._alt;
        this._onBufferActivate.fire({
            activeBuffer: this._alt,
            inactiveBuffer: this._normal
        });
    }
    resize(newCols, newRows) {
        this._normal.resize(newCols, newRows);
        this._alt.resize(newCols, newRows);
        this.setupTabStops(newCols);
    }
    setupTabStops(i) {
        this._normal.setupTabStops(i);
        this._alt.setupTabStops(i);
    }
}

const MINIMUM_COLS = 2;
const MINIMUM_ROWS = 1;
let BufferService = class BufferService extends Disposable {
    get buffer() { return this.buffers.active; }
    constructor(optionsService) {
        super();
        this.isUserScrolling = false;
        this._onResize = this.register(new EventEmitter());
        this.onResize = this._onResize.event;
        this._onScroll = this.register(new EventEmitter());
        this.onScroll = this._onScroll.event;
        this.cols = Math.max(optionsService.rawOptions.cols || 0, MINIMUM_COLS);
        this.rows = Math.max(optionsService.rawOptions.rows || 0, MINIMUM_ROWS);
        this.buffers = this.register(new BufferSet(optionsService, this));
    }
    resize(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.buffers.resize(cols, rows);
        this._onResize.fire({ cols, rows });
    }
    reset() {
        this.buffers.reset();
        this.isUserScrolling = false;
    }
    scroll(eraseAttr, isWrapped = false) {
        const buffer = this.buffer;
        let newLine;
        newLine = this._cachedBlankLine;
        if (!newLine || newLine.length !== this.cols || newLine.getFg(0) !== eraseAttr.fg || newLine.getBg(0) !== eraseAttr.bg) {
            newLine = buffer.getBlankLine(eraseAttr, isWrapped);
            this._cachedBlankLine = newLine;
        }
        newLine.isWrapped = isWrapped;
        const topRow = buffer.ybase + buffer.scrollTop;
        const bottomRow = buffer.ybase + buffer.scrollBottom;
        if (buffer.scrollTop === 0) {
            const willBufferBeTrimmed = buffer.lines.isFull;
            if (bottomRow === buffer.lines.length - 1) {
                if (willBufferBeTrimmed) {
                    buffer.lines.recycle().copyFrom(newLine);
                }
                else {
                    buffer.lines.push(newLine.clone());
                }
            }
            else {
                buffer.lines.splice(bottomRow + 1, 0, newLine.clone());
            }
            if (!willBufferBeTrimmed) {
                buffer.ybase++;
                if (!this.isUserScrolling) {
                    buffer.ydisp++;
                }
            }
            else {
                if (this.isUserScrolling) {
                    buffer.ydisp = Math.max(buffer.ydisp - 1, 0);
                }
            }
        }
        else {
            const scrollRegionHeight = bottomRow - topRow + 1;
            buffer.lines.shiftElements(topRow + 1, scrollRegionHeight - 1, -1);
            buffer.lines.set(bottomRow, newLine.clone());
        }
        if (!this.isUserScrolling) {
            buffer.ydisp = buffer.ybase;
        }
        this._onScroll.fire(buffer.ydisp);
    }
    scrollLines(disp, suppressScrollEvent, source) {
        const buffer = this.buffer;
        if (disp < 0) {
            if (buffer.ydisp === 0) {
                return;
            }
            this.isUserScrolling = true;
        }
        else if (disp + buffer.ydisp >= buffer.ybase) {
            this.isUserScrolling = false;
        }
        const oldYdisp = buffer.ydisp;
        buffer.ydisp = Math.max(Math.min(buffer.ydisp + disp, buffer.ybase), 0);
        if (oldYdisp === buffer.ydisp) {
            return;
        }
        if (!suppressScrollEvent) {
            this._onScroll.fire(buffer.ydisp);
        }
    }
};
BufferService = __decorate([
    __param(0, IOptionsService),
    __metadata("design:paramtypes", [Object])
], BufferService);

const DEFAULT_OPTIONS = {
    cols: 80,
    rows: 24,
    cursorBlink: false,
    cursorStyle: 'block',
    cursorWidth: 1,
    cursorInactiveStyle: 'outline',
    customGlyphs: true,
    drawBoldTextInBrightColors: true,
    documentOverride: null,
    fastScrollModifier: 'alt',
    fastScrollSensitivity: 5,
    fontFamily: 'courier-new, courier, monospace',
    fontSize: 15,
    fontWeight: 'normal',
    fontWeightBold: 'bold',
    ignoreBracketedPasteMode: false,
    lineHeight: 1.0,
    letterSpacing: 0,
    linkHandler: null,
    logLevel: 'info',
    logger: null,
    scrollback: 1000,
    scrollOnUserInput: true,
    scrollSensitivity: 1,
    screenReaderMode: false,
    smoothScrollDuration: 0,
    macOptionIsMeta: false,
    macOptionClickForcesSelection: false,
    minimumContrastRatio: 1,
    disableStdin: false,
    allowProposedApi: false,
    allowTransparency: false,
    tabStopWidth: 8,
    theme: {},
    rightClickSelectsWord: isMac,
    windowOptions: {},
    windowsMode: false,
    windowsPty: {},
    wordSeparator: ' ()[]{}\',"`',
    altClickMovesCursor: true,
    convertEol: false,
    termName: 'xterm',
    cancelEvents: false,
    overviewRulerWidth: 0
};
const FONT_WEIGHT_OPTIONS = ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
class OptionsService extends Disposable {
    constructor(options) {
        super();
        this._onOptionChange = this.register(new EventEmitter());
        this.onOptionChange = this._onOptionChange.event;
        const defaultOptions = Object.assign({}, DEFAULT_OPTIONS);
        for (const key in options) {
            if (key in defaultOptions) {
                try {
                    const newValue = options[key];
                    defaultOptions[key] = this._sanitizeAndValidateOption(key, newValue);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        this.rawOptions = defaultOptions;
        this.options = Object.assign({}, defaultOptions);
        this._setupOptions();
        this.register(toDisposable(() => {
            this.rawOptions.linkHandler = null;
            this.rawOptions.documentOverride = null;
        }));
    }
    onSpecificOptionChange(key, listener) {
        return this.onOptionChange(eventKey => {
            if (eventKey === key) {
                listener(this.rawOptions[key]);
            }
        });
    }
    onMultipleOptionChange(keys, listener) {
        return this.onOptionChange(eventKey => {
            if (keys.indexOf(eventKey) !== -1) {
                listener();
            }
        });
    }
    _setupOptions() {
        const getter = (propName) => {
            if (!(propName in DEFAULT_OPTIONS)) {
                throw new Error(`No option with key "${propName}"`);
            }
            return this.rawOptions[propName];
        };
        const setter = (propName, value) => {
            if (!(propName in DEFAULT_OPTIONS)) {
                throw new Error(`No option with key "${propName}"`);
            }
            value = this._sanitizeAndValidateOption(propName, value);
            if (this.rawOptions[propName] !== value) {
                this.rawOptions[propName] = value;
                this._onOptionChange.fire(propName);
            }
        };
        for (const propName in this.rawOptions) {
            const desc = {
                get: getter.bind(this, propName),
                set: setter.bind(this, propName)
            };
            Object.defineProperty(this.options, propName, desc);
        }
    }
    _sanitizeAndValidateOption(key, value) {
        switch (key) {
            case 'cursorStyle':
                if (!value) {
                    value = DEFAULT_OPTIONS[key];
                }
                if (!isCursorStyle(value)) {
                    throw new Error(`"${value}" is not a valid value for ${key}`);
                }
                break;
            case 'wordSeparator':
                if (!value) {
                    value = DEFAULT_OPTIONS[key];
                }
                break;
            case 'fontWeight':
            case 'fontWeightBold':
                if (typeof value === 'number' && 1 <= value && value <= 1000) {
                    break;
                }
                value = FONT_WEIGHT_OPTIONS.includes(value) ? value : DEFAULT_OPTIONS[key];
                break;
            case 'cursorWidth':
                value = Math.floor(value);
            case 'lineHeight':
            case 'tabStopWidth':
                if (value < 1) {
                    throw new Error(`${key} cannot be less than 1, value: ${value}`);
                }
                break;
            case 'minimumContrastRatio':
                value = Math.max(1, Math.min(21, Math.round(value * 10) / 10));
                break;
            case 'scrollback':
                value = Math.min(value, 4294967295);
                if (value < 0) {
                    throw new Error(`${key} cannot be less than 0, value: ${value}`);
                }
                break;
            case 'fastScrollSensitivity':
            case 'scrollSensitivity':
                if (value <= 0) {
                    throw new Error(`${key} cannot be less than or equal to 0, value: ${value}`);
                }
                break;
            case 'rows':
            case 'cols':
                if (!value && value !== 0) {
                    throw new Error(`${key} must be numeric, value: ${value}`);
                }
                break;
            case 'windowsPty':
                value = value !== null && value !== void 0 ? value : {};
                break;
        }
        return value;
    }
}
function isCursorStyle(value) {
    return value === 'block' || value === 'underline' || value === 'bar';
}

function clone(val, depth = 5) {
    if (typeof val !== 'object') {
        return val;
    }
    const clonedObject = Array.isArray(val) ? [] : {};
    for (const key in val) {
        clonedObject[key] = depth <= 1 ? val[key] : (val[key] && clone(val[key], depth - 1));
    }
    return clonedObject;
}

const DEFAULT_MODES = Object.freeze({
    insertMode: false
});
const DEFAULT_DEC_PRIVATE_MODES = Object.freeze({
    applicationCursorKeys: false,
    applicationKeypad: false,
    bracketedPasteMode: false,
    origin: false,
    reverseWraparound: false,
    sendFocus: false,
    wraparound: true
});
let CoreService = class CoreService extends Disposable {
    constructor(_bufferService, _logService, _optionsService) {
        super();
        this._bufferService = _bufferService;
        this._logService = _logService;
        this._optionsService = _optionsService;
        this.isCursorInitialized = false;
        this.isCursorHidden = false;
        this._onData = this.register(new EventEmitter());
        this.onData = this._onData.event;
        this._onUserInput = this.register(new EventEmitter());
        this.onUserInput = this._onUserInput.event;
        this._onBinary = this.register(new EventEmitter());
        this.onBinary = this._onBinary.event;
        this._onRequestScrollToBottom = this.register(new EventEmitter());
        this.onRequestScrollToBottom = this._onRequestScrollToBottom.event;
        this.modes = clone(DEFAULT_MODES);
        this.decPrivateModes = clone(DEFAULT_DEC_PRIVATE_MODES);
    }
    reset() {
        this.modes = clone(DEFAULT_MODES);
        this.decPrivateModes = clone(DEFAULT_DEC_PRIVATE_MODES);
    }
    triggerDataEvent(data, wasUserInput = false) {
        if (this._optionsService.rawOptions.disableStdin) {
            return;
        }
        const buffer = this._bufferService.buffer;
        if (wasUserInput && this._optionsService.rawOptions.scrollOnUserInput && buffer.ybase !== buffer.ydisp) {
            this._onRequestScrollToBottom.fire();
        }
        if (wasUserInput) {
            this._onUserInput.fire();
        }
        this._logService.debug(`sending data "${data}"`, () => data.split('').map(e => e.charCodeAt(0)));
        this._onData.fire(data);
    }
    triggerBinaryEvent(data) {
        if (this._optionsService.rawOptions.disableStdin) {
            return;
        }
        this._logService.debug(`sending binary "${data}"`, () => data.split('').map(e => e.charCodeAt(0)));
        this._onBinary.fire(data);
    }
};
CoreService = __decorate([
    __param(0, IBufferService),
    __param(1, ILogService),
    __param(2, IOptionsService),
    __metadata("design:paramtypes", [Object, Object, Object])
], CoreService);

const DEFAULT_PROTOCOLS = {
    NONE: {
        events: 0,
        restrict: () => false
    },
    X10: {
        events: 1,
        restrict: (e) => {
            if (e.button === 4 || e.action !== 1) {
                return false;
            }
            e.ctrl = false;
            e.alt = false;
            e.shift = false;
            return true;
        }
    },
    VT200: {
        events: 1 | 2 | 16,
        restrict: (e) => {
            if (e.action === 32) {
                return false;
            }
            return true;
        }
    },
    DRAG: {
        events: 1 | 2 | 16 | 4,
        restrict: (e) => {
            if (e.action === 32 && e.button === 3) {
                return false;
            }
            return true;
        }
    },
    ANY: {
        events: 1 | 2 | 16
            | 4 | 8,
        restrict: (e) => true
    }
};
function eventCode(e, isSGR) {
    let code = (e.ctrl ? 16 : 0) | (e.shift ? 4 : 0) | (e.alt ? 8 : 0);
    if (e.button === 4) {
        code |= 64;
        code |= e.action;
    }
    else {
        code |= e.button & 3;
        if (e.button & 4) {
            code |= 64;
        }
        if (e.button & 8) {
            code |= 128;
        }
        if (e.action === 32) {
            code |= 32;
        }
        else if (e.action === 0 && !isSGR) {
            code |= 3;
        }
    }
    return code;
}
const S = String.fromCharCode;
const DEFAULT_ENCODINGS = {
    DEFAULT: (e) => {
        const params = [eventCode(e, false) + 32, e.col + 32, e.row + 32];
        if (params[0] > 255 || params[1] > 255 || params[2] > 255) {
            return '';
        }
        return `\x1b[M${S(params[0])}${S(params[1])}${S(params[2])}`;
    },
    SGR: (e) => {
        const final = (e.action === 0 && e.button !== 4) ? 'm' : 'M';
        return `\x1b[<${eventCode(e, true)};${e.col};${e.row}${final}`;
    },
    SGR_PIXELS: (e) => {
        const final = (e.action === 0 && e.button !== 4) ? 'm' : 'M';
        return `\x1b[<${eventCode(e, true)};${e.x};${e.y}${final}`;
    }
};
let CoreMouseService = class CoreMouseService extends Disposable {
    constructor(_bufferService, _coreService) {
        super();
        this._bufferService = _bufferService;
        this._coreService = _coreService;
        this._protocols = {};
        this._encodings = {};
        this._activeProtocol = '';
        this._activeEncoding = '';
        this._lastEvent = null;
        this._onProtocolChange = this.register(new EventEmitter());
        this.onProtocolChange = this._onProtocolChange.event;
        for (const name of Object.keys(DEFAULT_PROTOCOLS))
            this.addProtocol(name, DEFAULT_PROTOCOLS[name]);
        for (const name of Object.keys(DEFAULT_ENCODINGS))
            this.addEncoding(name, DEFAULT_ENCODINGS[name]);
        this.reset();
    }
    addProtocol(name, protocol) {
        this._protocols[name] = protocol;
    }
    addEncoding(name, encoding) {
        this._encodings[name] = encoding;
    }
    get activeProtocol() {
        return this._activeProtocol;
    }
    get areMouseEventsActive() {
        return this._protocols[this._activeProtocol].events !== 0;
    }
    set activeProtocol(name) {
        if (!this._protocols[name]) {
            throw new Error(`unknown protocol "${name}"`);
        }
        this._activeProtocol = name;
        this._onProtocolChange.fire(this._protocols[name].events);
    }
    get activeEncoding() {
        return this._activeEncoding;
    }
    set activeEncoding(name) {
        if (!this._encodings[name]) {
            throw new Error(`unknown encoding "${name}"`);
        }
        this._activeEncoding = name;
    }
    reset() {
        this.activeProtocol = 'NONE';
        this.activeEncoding = 'DEFAULT';
        this._lastEvent = null;
    }
    triggerMouseEvent(e) {
        if (e.col < 0 || e.col >= this._bufferService.cols
            || e.row < 0 || e.row >= this._bufferService.rows) {
            return false;
        }
        if (e.button === 4 && e.action === 32) {
            return false;
        }
        if (e.button === 3 && e.action !== 32) {
            return false;
        }
        if (e.button !== 4 && (e.action === 2 || e.action === 3)) {
            return false;
        }
        e.col++;
        e.row++;
        if (e.action === 32
            && this._lastEvent
            && this._equalEvents(this._lastEvent, e, this._activeEncoding === 'SGR_PIXELS')) {
            return false;
        }
        if (!this._protocols[this._activeProtocol].restrict(e)) {
            return false;
        }
        const report = this._encodings[this._activeEncoding](e);
        if (report) {
            if (this._activeEncoding === 'DEFAULT') {
                this._coreService.triggerBinaryEvent(report);
            }
            else {
                this._coreService.triggerDataEvent(report, true);
            }
        }
        this._lastEvent = e;
        return true;
    }
    explainEvents(events) {
        return {
            down: !!(events & 1),
            up: !!(events & 2),
            drag: !!(events & 4),
            move: !!(events & 8),
            wheel: !!(events & 16)
        };
    }
    _equalEvents(e1, e2, pixels) {
        if (pixels) {
            if (e1.x !== e2.x)
                return false;
            if (e1.y !== e2.y)
                return false;
        }
        else {
            if (e1.col !== e2.col)
                return false;
            if (e1.row !== e2.row)
                return false;
        }
        if (e1.button !== e2.button)
            return false;
        if (e1.action !== e2.action)
            return false;
        if (e1.ctrl !== e2.ctrl)
            return false;
        if (e1.alt !== e2.alt)
            return false;
        if (e1.shift !== e2.shift)
            return false;
        return true;
    }
};
CoreMouseService = __decorate([
    __param(0, IBufferService),
    __param(1, ICoreService),
    __metadata("design:paramtypes", [Object, Object])
], CoreMouseService);

const BMP_COMBINING = [
    [0x0300, 0x036F], [0x0483, 0x0486], [0x0488, 0x0489],
    [0x0591, 0x05BD], [0x05BF, 0x05BF], [0x05C1, 0x05C2],
    [0x05C4, 0x05C5], [0x05C7, 0x05C7], [0x0600, 0x0603],
    [0x0610, 0x0615], [0x064B, 0x065E], [0x0670, 0x0670],
    [0x06D6, 0x06E4], [0x06E7, 0x06E8], [0x06EA, 0x06ED],
    [0x070F, 0x070F], [0x0711, 0x0711], [0x0730, 0x074A],
    [0x07A6, 0x07B0], [0x07EB, 0x07F3], [0x0901, 0x0902],
    [0x093C, 0x093C], [0x0941, 0x0948], [0x094D, 0x094D],
    [0x0951, 0x0954], [0x0962, 0x0963], [0x0981, 0x0981],
    [0x09BC, 0x09BC], [0x09C1, 0x09C4], [0x09CD, 0x09CD],
    [0x09E2, 0x09E3], [0x0A01, 0x0A02], [0x0A3C, 0x0A3C],
    [0x0A41, 0x0A42], [0x0A47, 0x0A48], [0x0A4B, 0x0A4D],
    [0x0A70, 0x0A71], [0x0A81, 0x0A82], [0x0ABC, 0x0ABC],
    [0x0AC1, 0x0AC5], [0x0AC7, 0x0AC8], [0x0ACD, 0x0ACD],
    [0x0AE2, 0x0AE3], [0x0B01, 0x0B01], [0x0B3C, 0x0B3C],
    [0x0B3F, 0x0B3F], [0x0B41, 0x0B43], [0x0B4D, 0x0B4D],
    [0x0B56, 0x0B56], [0x0B82, 0x0B82], [0x0BC0, 0x0BC0],
    [0x0BCD, 0x0BCD], [0x0C3E, 0x0C40], [0x0C46, 0x0C48],
    [0x0C4A, 0x0C4D], [0x0C55, 0x0C56], [0x0CBC, 0x0CBC],
    [0x0CBF, 0x0CBF], [0x0CC6, 0x0CC6], [0x0CCC, 0x0CCD],
    [0x0CE2, 0x0CE3], [0x0D41, 0x0D43], [0x0D4D, 0x0D4D],
    [0x0DCA, 0x0DCA], [0x0DD2, 0x0DD4], [0x0DD6, 0x0DD6],
    [0x0E31, 0x0E31], [0x0E34, 0x0E3A], [0x0E47, 0x0E4E],
    [0x0EB1, 0x0EB1], [0x0EB4, 0x0EB9], [0x0EBB, 0x0EBC],
    [0x0EC8, 0x0ECD], [0x0F18, 0x0F19], [0x0F35, 0x0F35],
    [0x0F37, 0x0F37], [0x0F39, 0x0F39], [0x0F71, 0x0F7E],
    [0x0F80, 0x0F84], [0x0F86, 0x0F87], [0x0F90, 0x0F97],
    [0x0F99, 0x0FBC], [0x0FC6, 0x0FC6], [0x102D, 0x1030],
    [0x1032, 0x1032], [0x1036, 0x1037], [0x1039, 0x1039],
    [0x1058, 0x1059], [0x1160, 0x11FF], [0x135F, 0x135F],
    [0x1712, 0x1714], [0x1732, 0x1734], [0x1752, 0x1753],
    [0x1772, 0x1773], [0x17B4, 0x17B5], [0x17B7, 0x17BD],
    [0x17C6, 0x17C6], [0x17C9, 0x17D3], [0x17DD, 0x17DD],
    [0x180B, 0x180D], [0x18A9, 0x18A9], [0x1920, 0x1922],
    [0x1927, 0x1928], [0x1932, 0x1932], [0x1939, 0x193B],
    [0x1A17, 0x1A18], [0x1B00, 0x1B03], [0x1B34, 0x1B34],
    [0x1B36, 0x1B3A], [0x1B3C, 0x1B3C], [0x1B42, 0x1B42],
    [0x1B6B, 0x1B73], [0x1DC0, 0x1DCA], [0x1DFE, 0x1DFF],
    [0x200B, 0x200F], [0x202A, 0x202E], [0x2060, 0x2063],
    [0x206A, 0x206F], [0x20D0, 0x20EF], [0x302A, 0x302F],
    [0x3099, 0x309A], [0xA806, 0xA806], [0xA80B, 0xA80B],
    [0xA825, 0xA826], [0xFB1E, 0xFB1E], [0xFE00, 0xFE0F],
    [0xFE20, 0xFE23], [0xFEFF, 0xFEFF], [0xFFF9, 0xFFFB]
];
const HIGH_COMBINING = [
    [0x10A01, 0x10A03], [0x10A05, 0x10A06], [0x10A0C, 0x10A0F],
    [0x10A38, 0x10A3A], [0x10A3F, 0x10A3F], [0x1D167, 0x1D169],
    [0x1D173, 0x1D182], [0x1D185, 0x1D18B], [0x1D1AA, 0x1D1AD],
    [0x1D242, 0x1D244], [0xE0001, 0xE0001], [0xE0020, 0xE007F],
    [0xE0100, 0xE01EF]
];
let table;
function bisearch(ucs, data) {
    let min = 0;
    let max = data.length - 1;
    let mid;
    if (ucs < data[0][0] || ucs > data[max][1]) {
        return false;
    }
    while (max >= min) {
        mid = (min + max) >> 1;
        if (ucs > data[mid][1]) {
            min = mid + 1;
        }
        else if (ucs < data[mid][0]) {
            max = mid - 1;
        }
        else {
            return true;
        }
    }
    return false;
}
class UnicodeV6 {
    constructor() {
        this.version = '6';
        if (!table) {
            table = new Uint8Array(65536);
            table.fill(1);
            table[0] = 0;
            table.fill(0, 1, 32);
            table.fill(0, 0x7f, 0xa0);
            table.fill(2, 0x1100, 0x1160);
            table[0x2329] = 2;
            table[0x232a] = 2;
            table.fill(2, 0x2e80, 0xa4d0);
            table[0x303f] = 1;
            table.fill(2, 0xac00, 0xd7a4);
            table.fill(2, 0xf900, 0xfb00);
            table.fill(2, 0xfe10, 0xfe1a);
            table.fill(2, 0xfe30, 0xfe70);
            table.fill(2, 0xff00, 0xff61);
            table.fill(2, 0xffe0, 0xffe7);
            for (let r = 0; r < BMP_COMBINING.length; ++r) {
                table.fill(0, BMP_COMBINING[r][0], BMP_COMBINING[r][1] + 1);
            }
        }
    }
    wcwidth(num) {
        if (num < 32)
            return 0;
        if (num < 127)
            return 1;
        if (num < 65536)
            return table[num];
        if (bisearch(num, HIGH_COMBINING))
            return 0;
        if ((num >= 0x20000 && num <= 0x2fffd) || (num >= 0x30000 && num <= 0x3fffd))
            return 2;
        return 1;
    }
    charProperties(codepoint, preceding) {
        let width = this.wcwidth(codepoint);
        let shouldJoin = width === 0 && preceding !== 0;
        if (shouldJoin) {
            const oldWidth = UnicodeService.extractWidth(preceding);
            if (oldWidth === 0) {
                shouldJoin = false;
            }
            else if (oldWidth > width) {
                width = oldWidth;
            }
        }
        return UnicodeService.createPropertyValue(0, width, shouldJoin);
    }
}

class UnicodeService {
    static extractShouldJoin(value) {
        return (value & 1) !== 0;
    }
    static extractWidth(value) {
        return ((value >> 1) & 0x3);
    }
    static extractCharKind(value) {
        return value >> 3;
    }
    static createPropertyValue(state, width, shouldJoin = false) {
        return ((state & 0xffffff) << 3) | ((width & 3) << 1) | (shouldJoin ? 1 : 0);
    }
    constructor() {
        this._providers = Object.create(null);
        this._active = '';
        this._onChange = new EventEmitter();
        this.onChange = this._onChange.event;
        const defaultProvider = new UnicodeV6();
        this.register(defaultProvider);
        this._active = defaultProvider.version;
        this._activeProvider = defaultProvider;
    }
    dispose() {
        this._onChange.dispose();
    }
    get versions() {
        return Object.keys(this._providers);
    }
    get activeVersion() {
        return this._active;
    }
    set activeVersion(version) {
        if (!this._providers[version]) {
            throw new Error(`unknown Unicode version "${version}"`);
        }
        this._active = version;
        this._activeProvider = this._providers[version];
        this._onChange.fire(version);
    }
    register(provider) {
        this._providers[provider.version] = provider;
    }
    wcwidth(num) {
        return this._activeProvider.wcwidth(num);
    }
    getStringCellWidth(s) {
        let result = 0;
        let precedingInfo = 0;
        const length = s.length;
        for (let i = 0; i < length; ++i) {
            let code = s.charCodeAt(i);
            if (0xD800 <= code && code <= 0xDBFF) {
                if (++i >= length) {
                    return result + this.wcwidth(code);
                }
                const second = s.charCodeAt(i);
                if (0xDC00 <= second && second <= 0xDFFF) {
                    code = (code - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
                }
                else {
                    result += this.wcwidth(second);
                }
            }
            const currentInfo = this.charProperties(code, precedingInfo);
            let chWidth = UnicodeService.extractWidth(currentInfo);
            if (UnicodeService.extractShouldJoin(currentInfo)) {
                chWidth -= UnicodeService.extractWidth(precedingInfo);
            }
            result += chWidth;
            precedingInfo = currentInfo;
        }
        return result;
    }
    charProperties(codepoint, preceding) {
        return this._activeProvider.charProperties(codepoint, preceding);
    }
}

class CharsetService {
    constructor() {
        this.glevel = 0;
        this._charsets = [];
    }
    reset() {
        this.charset = undefined;
        this._charsets = [];
        this.glevel = 0;
    }
    setgLevel(g) {
        this.glevel = g;
        this.charset = this._charsets[g];
    }
    setgCharset(g, charset) {
        this._charsets[g] = charset;
        if (this.glevel === g) {
            this.charset = charset;
        }
    }
}

function updateWindowsModeWrappedState(bufferService) {
    const line = bufferService.buffer.lines.get(bufferService.buffer.ybase + bufferService.buffer.y - 1);
    const lastChar = line === null || line === void 0 ? void 0 : line.get(bufferService.cols - 1);
    const nextLine = bufferService.buffer.lines.get(bufferService.buffer.ybase + bufferService.buffer.y);
    if (nextLine && lastChar) {
        nextLine.isWrapped = (lastChar[CHAR_DATA_CODE_INDEX] !== NULL_CELL_CODE && lastChar[CHAR_DATA_CODE_INDEX] !== WHITESPACE_CELL_CODE);
    }
}

var C0;
(function (C0) {
    C0.NUL = '\x00';
    C0.SOH = '\x01';
    C0.STX = '\x02';
    C0.ETX = '\x03';
    C0.EOT = '\x04';
    C0.ENQ = '\x05';
    C0.ACK = '\x06';
    C0.BEL = '\x07';
    C0.BS = '\x08';
    C0.HT = '\x09';
    C0.LF = '\x0a';
    C0.VT = '\x0b';
    C0.FF = '\x0c';
    C0.CR = '\x0d';
    C0.SO = '\x0e';
    C0.SI = '\x0f';
    C0.DLE = '\x10';
    C0.DC1 = '\x11';
    C0.DC2 = '\x12';
    C0.DC3 = '\x13';
    C0.DC4 = '\x14';
    C0.NAK = '\x15';
    C0.SYN = '\x16';
    C0.ETB = '\x17';
    C0.CAN = '\x18';
    C0.EM = '\x19';
    C0.SUB = '\x1a';
    C0.ESC = '\x1b';
    C0.FS = '\x1c';
    C0.GS = '\x1d';
    C0.RS = '\x1e';
    C0.US = '\x1f';
    C0.SP = '\x20';
    C0.DEL = '\x7f';
})(C0 || (C0 = {}));
var C1;
(function (C1) {
    C1.PAD = '\x80';
    C1.HOP = '\x81';
    C1.BPH = '\x82';
    C1.NBH = '\x83';
    C1.IND = '\x84';
    C1.NEL = '\x85';
    C1.SSA = '\x86';
    C1.ESA = '\x87';
    C1.HTS = '\x88';
    C1.HTJ = '\x89';
    C1.VTS = '\x8a';
    C1.PLD = '\x8b';
    C1.PLU = '\x8c';
    C1.RI = '\x8d';
    C1.SS2 = '\x8e';
    C1.SS3 = '\x8f';
    C1.DCS = '\x90';
    C1.PU1 = '\x91';
    C1.PU2 = '\x92';
    C1.STS = '\x93';
    C1.CCH = '\x94';
    C1.MW = '\x95';
    C1.SPA = '\x96';
    C1.EPA = '\x97';
    C1.SOS = '\x98';
    C1.SGCI = '\x99';
    C1.SCI = '\x9a';
    C1.CSI = '\x9b';
    C1.ST = '\x9c';
    C1.OSC = '\x9d';
    C1.PM = '\x9e';
    C1.APC = '\x9f';
})(C1 || (C1 = {}));
var C1_ESCAPED;
(function (C1_ESCAPED) {
    C1_ESCAPED.ST = `${C0.ESC}\\`;
})(C1_ESCAPED || (C1_ESCAPED = {}));

const MAX_VALUE = 0x7FFFFFFF;
const MAX_SUBPARAMS = 256;
class Params {
    static fromArray(values) {
        const params = new Params();
        if (!values.length) {
            return params;
        }
        for (let i = (Array.isArray(values[0])) ? 1 : 0; i < values.length; ++i) {
            const value = values[i];
            if (Array.isArray(value)) {
                for (let k = 0; k < value.length; ++k) {
                    params.addSubParam(value[k]);
                }
            }
            else {
                params.addParam(value);
            }
        }
        return params;
    }
    constructor(maxLength = 32, maxSubParamsLength = 32) {
        this.maxLength = maxLength;
        this.maxSubParamsLength = maxSubParamsLength;
        if (maxSubParamsLength > MAX_SUBPARAMS) {
            throw new Error('maxSubParamsLength must not be greater than 256');
        }
        this.params = new Int32Array(maxLength);
        this.length = 0;
        this._subParams = new Int32Array(maxSubParamsLength);
        this._subParamsLength = 0;
        this._subParamsIdx = new Uint16Array(maxLength);
        this._rejectDigits = false;
        this._rejectSubDigits = false;
        this._digitIsSub = false;
    }
    clone() {
        const newParams = new Params(this.maxLength, this.maxSubParamsLength);
        newParams.params.set(this.params);
        newParams.length = this.length;
        newParams._subParams.set(this._subParams);
        newParams._subParamsLength = this._subParamsLength;
        newParams._subParamsIdx.set(this._subParamsIdx);
        newParams._rejectDigits = this._rejectDigits;
        newParams._rejectSubDigits = this._rejectSubDigits;
        newParams._digitIsSub = this._digitIsSub;
        return newParams;
    }
    toArray() {
        const res = [];
        for (let i = 0; i < this.length; ++i) {
            res.push(this.params[i]);
            const start = this._subParamsIdx[i] >> 8;
            const end = this._subParamsIdx[i] & 0xFF;
            if (end - start > 0) {
                res.push(Array.prototype.slice.call(this._subParams, start, end));
            }
        }
        return res;
    }
    reset() {
        this.length = 0;
        this._subParamsLength = 0;
        this._rejectDigits = false;
        this._rejectSubDigits = false;
        this._digitIsSub = false;
    }
    addParam(value) {
        this._digitIsSub = false;
        if (this.length >= this.maxLength) {
            this._rejectDigits = true;
            return;
        }
        if (value < -1) {
            throw new Error('values lesser than -1 are not allowed');
        }
        this._subParamsIdx[this.length] = this._subParamsLength << 8 | this._subParamsLength;
        this.params[this.length++] = value > MAX_VALUE ? MAX_VALUE : value;
    }
    addSubParam(value) {
        this._digitIsSub = true;
        if (!this.length) {
            return;
        }
        if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) {
            this._rejectSubDigits = true;
            return;
        }
        if (value < -1) {
            throw new Error('values lesser than -1 are not allowed');
        }
        this._subParams[this._subParamsLength++] = value > MAX_VALUE ? MAX_VALUE : value;
        this._subParamsIdx[this.length - 1]++;
    }
    hasSubParams(idx) {
        return ((this._subParamsIdx[idx] & 0xFF) - (this._subParamsIdx[idx] >> 8) > 0);
    }
    getSubParams(idx) {
        const start = this._subParamsIdx[idx] >> 8;
        const end = this._subParamsIdx[idx] & 0xFF;
        if (end - start > 0) {
            return this._subParams.subarray(start, end);
        }
        return null;
    }
    getSubParamsAll() {
        const result = {};
        for (let i = 0; i < this.length; ++i) {
            const start = this._subParamsIdx[i] >> 8;
            const end = this._subParamsIdx[i] & 0xFF;
            if (end - start > 0) {
                result[i] = this._subParams.slice(start, end);
            }
        }
        return result;
    }
    addDigit(value) {
        let length;
        if (this._rejectDigits
            || !(length = this._digitIsSub ? this._subParamsLength : this.length)
            || (this._digitIsSub && this._rejectSubDigits)) {
            return;
        }
        const store = this._digitIsSub ? this._subParams : this.params;
        const cur = store[length - 1];
        store[length - 1] = ~cur ? Math.min(cur * 10 + value, MAX_VALUE) : value;
    }
}

const PAYLOAD_LIMIT = 10000000;

const EMPTY_HANDLERS$1 = [];
class OscParser {
    constructor() {
        this._state = 0;
        this._active = EMPTY_HANDLERS$1;
        this._id = -1;
        this._handlers = Object.create(null);
        this._handlerFb = () => { };
        this._stack = {
            paused: false,
            loopPosition: 0,
            fallThrough: false
        };
    }
    registerHandler(ident, handler) {
        if (this._handlers[ident] === undefined) {
            this._handlers[ident] = [];
        }
        const handlerList = this._handlers[ident];
        handlerList.push(handler);
        return {
            dispose: () => {
                const handlerIndex = handlerList.indexOf(handler);
                if (handlerIndex !== -1) {
                    handlerList.splice(handlerIndex, 1);
                }
            }
        };
    }
    clearHandler(ident) {
        if (this._handlers[ident])
            delete this._handlers[ident];
    }
    setHandlerFallback(handler) {
        this._handlerFb = handler;
    }
    dispose() {
        this._handlers = Object.create(null);
        this._handlerFb = () => { };
        this._active = EMPTY_HANDLERS$1;
    }
    reset() {
        if (this._state === 2) {
            for (let j = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; j >= 0; --j) {
                this._active[j].end(false);
            }
        }
        this._stack.paused = false;
        this._active = EMPTY_HANDLERS$1;
        this._id = -1;
        this._state = 0;
    }
    _start() {
        this._active = this._handlers[this._id] || EMPTY_HANDLERS$1;
        if (!this._active.length) {
            this._handlerFb(this._id, 'START');
        }
        else {
            for (let j = this._active.length - 1; j >= 0; j--) {
                this._active[j].start();
            }
        }
    }
    _put(data, start, end) {
        if (!this._active.length) {
            this._handlerFb(this._id, 'PUT', utf32ToString(data, start, end));
        }
        else {
            for (let j = this._active.length - 1; j >= 0; j--) {
                this._active[j].put(data, start, end);
            }
        }
    }
    start() {
        this.reset();
        this._state = 1;
    }
    put(data, start, end) {
        if (this._state === 3) {
            return;
        }
        if (this._state === 1) {
            while (start < end) {
                const code = data[start++];
                if (code === 0x3b) {
                    this._state = 2;
                    this._start();
                    break;
                }
                if (code < 0x30 || 0x39 < code) {
                    this._state = 3;
                    return;
                }
                if (this._id === -1) {
                    this._id = 0;
                }
                this._id = this._id * 10 + code - 48;
            }
        }
        if (this._state === 2 && end - start > 0) {
            this._put(data, start, end);
        }
    }
    end(success, promiseResult = true) {
        if (this._state === 0) {
            return;
        }
        if (this._state !== 3) {
            if (this._state === 1) {
                this._start();
            }
            if (!this._active.length) {
                this._handlerFb(this._id, 'END', success);
            }
            else {
                let handlerResult = false;
                let j = this._active.length - 1;
                let fallThrough = false;
                if (this._stack.paused) {
                    j = this._stack.loopPosition - 1;
                    handlerResult = promiseResult;
                    fallThrough = this._stack.fallThrough;
                    this._stack.paused = false;
                }
                if (!fallThrough && handlerResult === false) {
                    for (; j >= 0; j--) {
                        handlerResult = this._active[j].end(success);
                        if (handlerResult === true) {
                            break;
                        }
                        else if (handlerResult instanceof Promise) {
                            this._stack.paused = true;
                            this._stack.loopPosition = j;
                            this._stack.fallThrough = false;
                            return handlerResult;
                        }
                    }
                    j--;
                }
                for (; j >= 0; j--) {
                    handlerResult = this._active[j].end(false);
                    if (handlerResult instanceof Promise) {
                        this._stack.paused = true;
                        this._stack.loopPosition = j;
                        this._stack.fallThrough = true;
                        return handlerResult;
                    }
                }
            }
        }
        this._active = EMPTY_HANDLERS$1;
        this._id = -1;
        this._state = 0;
    }
}
class OscHandler {
    constructor(_handler) {
        this._handler = _handler;
        this._data = '';
        this._hitLimit = false;
    }
    start() {
        this._data = '';
        this._hitLimit = false;
    }
    put(data, start, end) {
        if (this._hitLimit) {
            return;
        }
        this._data += utf32ToString(data, start, end);
        if (this._data.length > PAYLOAD_LIMIT) {
            this._data = '';
            this._hitLimit = true;
        }
    }
    end(success) {
        let ret = false;
        if (this._hitLimit) {
            ret = false;
        }
        else if (success) {
            ret = this._handler(this._data);
            if (ret instanceof Promise) {
                return ret.then(res => {
                    this._data = '';
                    this._hitLimit = false;
                    return res;
                });
            }
        }
        this._data = '';
        this._hitLimit = false;
        return ret;
    }
}

const EMPTY_HANDLERS = [];
class DcsParser {
    constructor() {
        this._handlers = Object.create(null);
        this._active = EMPTY_HANDLERS;
        this._ident = 0;
        this._handlerFb = () => { };
        this._stack = {
            paused: false,
            loopPosition: 0,
            fallThrough: false
        };
    }
    dispose() {
        this._handlers = Object.create(null);
        this._handlerFb = () => { };
        this._active = EMPTY_HANDLERS;
    }
    registerHandler(ident, handler) {
        if (this._handlers[ident] === undefined) {
            this._handlers[ident] = [];
        }
        const handlerList = this._handlers[ident];
        handlerList.push(handler);
        return {
            dispose: () => {
                const handlerIndex = handlerList.indexOf(handler);
                if (handlerIndex !== -1) {
                    handlerList.splice(handlerIndex, 1);
                }
            }
        };
    }
    clearHandler(ident) {
        if (this._handlers[ident])
            delete this._handlers[ident];
    }
    setHandlerFallback(handler) {
        this._handlerFb = handler;
    }
    reset() {
        if (this._active.length) {
            for (let j = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; j >= 0; --j) {
                this._active[j].unhook(false);
            }
        }
        this._stack.paused = false;
        this._active = EMPTY_HANDLERS;
        this._ident = 0;
    }
    hook(ident, params) {
        this.reset();
        this._ident = ident;
        this._active = this._handlers[ident] || EMPTY_HANDLERS;
        if (!this._active.length) {
            this._handlerFb(this._ident, 'HOOK', params);
        }
        else {
            for (let j = this._active.length - 1; j >= 0; j--) {
                this._active[j].hook(params);
            }
        }
    }
    put(data, start, end) {
        if (!this._active.length) {
            this._handlerFb(this._ident, 'PUT', utf32ToString(data, start, end));
        }
        else {
            for (let j = this._active.length - 1; j >= 0; j--) {
                this._active[j].put(data, start, end);
            }
        }
    }
    unhook(success, promiseResult = true) {
        if (!this._active.length) {
            this._handlerFb(this._ident, 'UNHOOK', success);
        }
        else {
            let handlerResult = false;
            let j = this._active.length - 1;
            let fallThrough = false;
            if (this._stack.paused) {
                j = this._stack.loopPosition - 1;
                handlerResult = promiseResult;
                fallThrough = this._stack.fallThrough;
                this._stack.paused = false;
            }
            if (!fallThrough && handlerResult === false) {
                for (; j >= 0; j--) {
                    handlerResult = this._active[j].unhook(success);
                    if (handlerResult === true) {
                        break;
                    }
                    else if (handlerResult instanceof Promise) {
                        this._stack.paused = true;
                        this._stack.loopPosition = j;
                        this._stack.fallThrough = false;
                        return handlerResult;
                    }
                }
                j--;
            }
            for (; j >= 0; j--) {
                handlerResult = this._active[j].unhook(false);
                if (handlerResult instanceof Promise) {
                    this._stack.paused = true;
                    this._stack.loopPosition = j;
                    this._stack.fallThrough = true;
                    return handlerResult;
                }
            }
        }
        this._active = EMPTY_HANDLERS;
        this._ident = 0;
    }
}
const EMPTY_PARAMS = new Params();
EMPTY_PARAMS.addParam(0);
class DcsHandler {
    constructor(_handler) {
        this._handler = _handler;
        this._data = '';
        this._params = EMPTY_PARAMS;
        this._hitLimit = false;
    }
    hook(params) {
        this._params = (params.length > 1 || params.params[0]) ? params.clone() : EMPTY_PARAMS;
        this._data = '';
        this._hitLimit = false;
    }
    put(data, start, end) {
        if (this._hitLimit) {
            return;
        }
        this._data += utf32ToString(data, start, end);
        if (this._data.length > PAYLOAD_LIMIT) {
            this._data = '';
            this._hitLimit = true;
        }
    }
    unhook(success) {
        let ret = false;
        if (this._hitLimit) {
            ret = false;
        }
        else if (success) {
            ret = this._handler(this._data, this._params);
            if (ret instanceof Promise) {
                return ret.then(res => {
                    this._params = EMPTY_PARAMS;
                    this._data = '';
                    this._hitLimit = false;
                    return res;
                });
            }
        }
        this._params = EMPTY_PARAMS;
        this._data = '';
        this._hitLimit = false;
        return ret;
    }
}

class TransitionTable {
    constructor(length) {
        this.table = new Uint8Array(length);
    }
    setDefault(action, next) {
        this.table.fill(action << 4 | next);
    }
    add(code, state, action, next) {
        this.table[state << 8 | code] = action << 4 | next;
    }
    addMany(codes, state, action, next) {
        for (let i = 0; i < codes.length; i++) {
            this.table[state << 8 | codes[i]] = action << 4 | next;
        }
    }
}
const NON_ASCII_PRINTABLE = 0xA0;
const VT500_TRANSITION_TABLE = (function () {
    const table = new TransitionTable(4095);
    const BYTE_VALUES = 256;
    const blueprint = Array.apply(null, Array(BYTE_VALUES)).map((unused, i) => i);
    const r = (start, end) => blueprint.slice(start, end);
    const PRINTABLES = r(0x20, 0x7f);
    const EXECUTABLES = r(0x00, 0x18);
    EXECUTABLES.push(0x19);
    EXECUTABLES.push.apply(EXECUTABLES, r(0x1c, 0x20));
    const states = r(0, 13 + 1);
    let state;
    table.setDefault(1, 0);
    table.addMany(PRINTABLES, 0, 2, 0);
    for (state in states) {
        table.addMany([0x18, 0x1a, 0x99, 0x9a], state, 3, 0);
        table.addMany(r(0x80, 0x90), state, 3, 0);
        table.addMany(r(0x90, 0x98), state, 3, 0);
        table.add(0x9c, state, 0, 0);
        table.add(0x1b, state, 11, 1);
        table.add(0x9d, state, 4, 8);
        table.addMany([0x98, 0x9e, 0x9f], state, 0, 7);
        table.add(0x9b, state, 11, 3);
        table.add(0x90, state, 11, 9);
    }
    table.addMany(EXECUTABLES, 0, 3, 0);
    table.addMany(EXECUTABLES, 1, 3, 1);
    table.add(0x7f, 1, 0, 1);
    table.addMany(EXECUTABLES, 8, 0, 8);
    table.addMany(EXECUTABLES, 3, 3, 3);
    table.add(0x7f, 3, 0, 3);
    table.addMany(EXECUTABLES, 4, 3, 4);
    table.add(0x7f, 4, 0, 4);
    table.addMany(EXECUTABLES, 6, 3, 6);
    table.addMany(EXECUTABLES, 5, 3, 5);
    table.add(0x7f, 5, 0, 5);
    table.addMany(EXECUTABLES, 2, 3, 2);
    table.add(0x7f, 2, 0, 2);
    table.add(0x5d, 1, 4, 8);
    table.addMany(PRINTABLES, 8, 5, 8);
    table.add(0x7f, 8, 5, 8);
    table.addMany([0x9c, 0x1b, 0x18, 0x1a, 0x07], 8, 6, 0);
    table.addMany(r(0x1c, 0x20), 8, 0, 8);
    table.addMany([0x58, 0x5e, 0x5f], 1, 0, 7);
    table.addMany(PRINTABLES, 7, 0, 7);
    table.addMany(EXECUTABLES, 7, 0, 7);
    table.add(0x9c, 7, 0, 0);
    table.add(0x7f, 7, 0, 7);
    table.add(0x5b, 1, 11, 3);
    table.addMany(r(0x40, 0x7f), 3, 7, 0);
    table.addMany(r(0x30, 0x3c), 3, 8, 4);
    table.addMany([0x3c, 0x3d, 0x3e, 0x3f], 3, 9, 4);
    table.addMany(r(0x30, 0x3c), 4, 8, 4);
    table.addMany(r(0x40, 0x7f), 4, 7, 0);
    table.addMany([0x3c, 0x3d, 0x3e, 0x3f], 4, 0, 6);
    table.addMany(r(0x20, 0x40), 6, 0, 6);
    table.add(0x7f, 6, 0, 6);
    table.addMany(r(0x40, 0x7f), 6, 0, 0);
    table.addMany(r(0x20, 0x30), 3, 9, 5);
    table.addMany(r(0x20, 0x30), 5, 9, 5);
    table.addMany(r(0x30, 0x40), 5, 0, 6);
    table.addMany(r(0x40, 0x7f), 5, 7, 0);
    table.addMany(r(0x20, 0x30), 4, 9, 5);
    table.addMany(r(0x20, 0x30), 1, 9, 2);
    table.addMany(r(0x20, 0x30), 2, 9, 2);
    table.addMany(r(0x30, 0x7f), 2, 10, 0);
    table.addMany(r(0x30, 0x50), 1, 10, 0);
    table.addMany(r(0x51, 0x58), 1, 10, 0);
    table.addMany([0x59, 0x5a, 0x5c], 1, 10, 0);
    table.addMany(r(0x60, 0x7f), 1, 10, 0);
    table.add(0x50, 1, 11, 9);
    table.addMany(EXECUTABLES, 9, 0, 9);
    table.add(0x7f, 9, 0, 9);
    table.addMany(r(0x1c, 0x20), 9, 0, 9);
    table.addMany(r(0x20, 0x30), 9, 9, 12);
    table.addMany(r(0x30, 0x3c), 9, 8, 10);
    table.addMany([0x3c, 0x3d, 0x3e, 0x3f], 9, 9, 10);
    table.addMany(EXECUTABLES, 11, 0, 11);
    table.addMany(r(0x20, 0x80), 11, 0, 11);
    table.addMany(r(0x1c, 0x20), 11, 0, 11);
    table.addMany(EXECUTABLES, 10, 0, 10);
    table.add(0x7f, 10, 0, 10);
    table.addMany(r(0x1c, 0x20), 10, 0, 10);
    table.addMany(r(0x30, 0x3c), 10, 8, 10);
    table.addMany([0x3c, 0x3d, 0x3e, 0x3f], 10, 0, 11);
    table.addMany(r(0x20, 0x30), 10, 9, 12);
    table.addMany(EXECUTABLES, 12, 0, 12);
    table.add(0x7f, 12, 0, 12);
    table.addMany(r(0x1c, 0x20), 12, 0, 12);
    table.addMany(r(0x20, 0x30), 12, 9, 12);
    table.addMany(r(0x30, 0x40), 12, 0, 11);
    table.addMany(r(0x40, 0x7f), 12, 12, 13);
    table.addMany(r(0x40, 0x7f), 10, 12, 13);
    table.addMany(r(0x40, 0x7f), 9, 12, 13);
    table.addMany(EXECUTABLES, 13, 13, 13);
    table.addMany(PRINTABLES, 13, 13, 13);
    table.add(0x7f, 13, 0, 13);
    table.addMany([0x1b, 0x9c, 0x18, 0x1a], 13, 14, 0);
    table.add(NON_ASCII_PRINTABLE, 0, 2, 0);
    table.add(NON_ASCII_PRINTABLE, 8, 5, 8);
    table.add(NON_ASCII_PRINTABLE, 6, 0, 6);
    table.add(NON_ASCII_PRINTABLE, 11, 0, 11);
    table.add(NON_ASCII_PRINTABLE, 13, 13, 13);
    return table;
})();
class EscapeSequenceParser extends Disposable {
    constructor(_transitions = VT500_TRANSITION_TABLE) {
        super();
        this._transitions = _transitions;
        this._parseStack = {
            state: 0,
            handlers: [],
            handlerPos: 0,
            transition: 0,
            chunkPos: 0
        };
        this.initialState = 0;
        this.currentState = this.initialState;
        this._params = new Params();
        this._params.addParam(0);
        this._collect = 0;
        this.precedingJoinState = 0;
        this._printHandlerFb = (data, start, end) => { };
        this._executeHandlerFb = (code) => { };
        this._csiHandlerFb = (ident, params) => { };
        this._escHandlerFb = (ident) => { };
        this._errorHandlerFb = (state) => state;
        this._printHandler = this._printHandlerFb;
        this._executeHandlers = Object.create(null);
        this._csiHandlers = Object.create(null);
        this._escHandlers = Object.create(null);
        this.register(toDisposable(() => {
            this._csiHandlers = Object.create(null);
            this._executeHandlers = Object.create(null);
            this._escHandlers = Object.create(null);
        }));
        this._oscParser = this.register(new OscParser());
        this._dcsParser = this.register(new DcsParser());
        this._errorHandler = this._errorHandlerFb;
        this.registerEscHandler({ final: '\\' }, () => true);
    }
    _identifier(id, finalRange = [0x40, 0x7e]) {
        let res = 0;
        if (id.prefix) {
            if (id.prefix.length > 1) {
                throw new Error('only one byte as prefix supported');
            }
            res = id.prefix.charCodeAt(0);
            if (res && 0x3c > res || res > 0x3f) {
                throw new Error('prefix must be in range 0x3c .. 0x3f');
            }
        }
        if (id.intermediates) {
            if (id.intermediates.length > 2) {
                throw new Error('only two bytes as intermediates are supported');
            }
            for (let i = 0; i < id.intermediates.length; ++i) {
                const intermediate = id.intermediates.charCodeAt(i);
                if (0x20 > intermediate || intermediate > 0x2f) {
                    throw new Error('intermediate must be in range 0x20 .. 0x2f');
                }
                res <<= 8;
                res |= intermediate;
            }
        }
        if (id.final.length !== 1) {
            throw new Error('final must be a single byte');
        }
        const finalCode = id.final.charCodeAt(0);
        if (finalRange[0] > finalCode || finalCode > finalRange[1]) {
            throw new Error(`final must be in range ${finalRange[0]} .. ${finalRange[1]}`);
        }
        res <<= 8;
        res |= finalCode;
        return res;
    }
    identToString(ident) {
        const res = [];
        while (ident) {
            res.push(String.fromCharCode(ident & 0xFF));
            ident >>= 8;
        }
        return res.reverse().join('');
    }
    setPrintHandler(handler) {
        this._printHandler = handler;
    }
    clearPrintHandler() {
        this._printHandler = this._printHandlerFb;
    }
    registerEscHandler(id, handler) {
        const ident = this._identifier(id, [0x30, 0x7e]);
        if (this._escHandlers[ident] === undefined) {
            this._escHandlers[ident] = [];
        }
        const handlerList = this._escHandlers[ident];
        handlerList.push(handler);
        return {
            dispose: () => {
                const handlerIndex = handlerList.indexOf(handler);
                if (handlerIndex !== -1) {
                    handlerList.splice(handlerIndex, 1);
                }
            }
        };
    }
    clearEscHandler(id) {
        if (this._escHandlers[this._identifier(id, [0x30, 0x7e])])
            delete this._escHandlers[this._identifier(id, [0x30, 0x7e])];
    }
    setEscHandlerFallback(handler) {
        this._escHandlerFb = handler;
    }
    setExecuteHandler(flag, handler) {
        this._executeHandlers[flag.charCodeAt(0)] = handler;
    }
    clearExecuteHandler(flag) {
        if (this._executeHandlers[flag.charCodeAt(0)])
            delete this._executeHandlers[flag.charCodeAt(0)];
    }
    setExecuteHandlerFallback(handler) {
        this._executeHandlerFb = handler;
    }
    registerCsiHandler(id, handler) {
        const ident = this._identifier(id);
        if (this._csiHandlers[ident] === undefined) {
            this._csiHandlers[ident] = [];
        }
        const handlerList = this._csiHandlers[ident];
        handlerList.push(handler);
        return {
            dispose: () => {
                const handlerIndex = handlerList.indexOf(handler);
                if (handlerIndex !== -1) {
                    handlerList.splice(handlerIndex, 1);
                }
            }
        };
    }
    clearCsiHandler(id) {
        if (this._csiHandlers[this._identifier(id)])
            delete this._csiHandlers[this._identifier(id)];
    }
    setCsiHandlerFallback(callback) {
        this._csiHandlerFb = callback;
    }
    registerDcsHandler(id, handler) {
        return this._dcsParser.registerHandler(this._identifier(id), handler);
    }
    clearDcsHandler(id) {
        this._dcsParser.clearHandler(this._identifier(id));
    }
    setDcsHandlerFallback(handler) {
        this._dcsParser.setHandlerFallback(handler);
    }
    registerOscHandler(ident, handler) {
        return this._oscParser.registerHandler(ident, handler);
    }
    clearOscHandler(ident) {
        this._oscParser.clearHandler(ident);
    }
    setOscHandlerFallback(handler) {
        this._oscParser.setHandlerFallback(handler);
    }
    setErrorHandler(callback) {
        this._errorHandler = callback;
    }
    clearErrorHandler() {
        this._errorHandler = this._errorHandlerFb;
    }
    reset() {
        this.currentState = this.initialState;
        this._oscParser.reset();
        this._dcsParser.reset();
        this._params.reset();
        this._params.addParam(0);
        this._collect = 0;
        this.precedingJoinState = 0;
        if (this._parseStack.state !== 0) {
            this._parseStack.state = 2;
            this._parseStack.handlers = [];
        }
    }
    _preserveStack(state, handlers, handlerPos, transition, chunkPos) {
        this._parseStack.state = state;
        this._parseStack.handlers = handlers;
        this._parseStack.handlerPos = handlerPos;
        this._parseStack.transition = transition;
        this._parseStack.chunkPos = chunkPos;
    }
    parse(data, length, promiseResult) {
        let code = 0;
        let transition = 0;
        let start = 0;
        let handlerResult;
        if (this._parseStack.state) {
            if (this._parseStack.state === 2) {
                this._parseStack.state = 0;
                start = this._parseStack.chunkPos + 1;
            }
            else {
                if (promiseResult === undefined || this._parseStack.state === 1) {
                    this._parseStack.state = 1;
                    throw new Error('improper continuation due to previous async handler, giving up parsing');
                }
                const handlers = this._parseStack.handlers;
                let handlerPos = this._parseStack.handlerPos - 1;
                switch (this._parseStack.state) {
                    case 3:
                        if (promiseResult === false && handlerPos > -1) {
                            for (; handlerPos >= 0; handlerPos--) {
                                handlerResult = handlers[handlerPos](this._params);
                                if (handlerResult === true) {
                                    break;
                                }
                                else if (handlerResult instanceof Promise) {
                                    this._parseStack.handlerPos = handlerPos;
                                    return handlerResult;
                                }
                            }
                        }
                        this._parseStack.handlers = [];
                        break;
                    case 4:
                        if (promiseResult === false && handlerPos > -1) {
                            for (; handlerPos >= 0; handlerPos--) {
                                handlerResult = handlers[handlerPos]();
                                if (handlerResult === true) {
                                    break;
                                }
                                else if (handlerResult instanceof Promise) {
                                    this._parseStack.handlerPos = handlerPos;
                                    return handlerResult;
                                }
                            }
                        }
                        this._parseStack.handlers = [];
                        break;
                    case 6:
                        code = data[this._parseStack.chunkPos];
                        handlerResult = this._dcsParser.unhook(code !== 0x18 && code !== 0x1a, promiseResult);
                        if (handlerResult) {
                            return handlerResult;
                        }
                        if (code === 0x1b)
                            this._parseStack.transition |= 1;
                        this._params.reset();
                        this._params.addParam(0);
                        this._collect = 0;
                        break;
                    case 5:
                        code = data[this._parseStack.chunkPos];
                        handlerResult = this._oscParser.end(code !== 0x18 && code !== 0x1a, promiseResult);
                        if (handlerResult) {
                            return handlerResult;
                        }
                        if (code === 0x1b)
                            this._parseStack.transition |= 1;
                        this._params.reset();
                        this._params.addParam(0);
                        this._collect = 0;
                        break;
                }
                this._parseStack.state = 0;
                start = this._parseStack.chunkPos + 1;
                this.precedingJoinState = 0;
                this.currentState = this._parseStack.transition & 15;
            }
        }
        for (let i = start; i < length; ++i) {
            code = data[i];
            transition = this._transitions.table[this.currentState << 8 | (code < 0xa0 ? code : NON_ASCII_PRINTABLE)];
            switch (transition >> 4) {
                case 2:
                    for (let j = i + 1;; ++j) {
                        if (j >= length || (code = data[j]) < 0x20 || (code > 0x7e && code < NON_ASCII_PRINTABLE)) {
                            this._printHandler(data, i, j);
                            i = j - 1;
                            break;
                        }
                        if (++j >= length || (code = data[j]) < 0x20 || (code > 0x7e && code < NON_ASCII_PRINTABLE)) {
                            this._printHandler(data, i, j);
                            i = j - 1;
                            break;
                        }
                        if (++j >= length || (code = data[j]) < 0x20 || (code > 0x7e && code < NON_ASCII_PRINTABLE)) {
                            this._printHandler(data, i, j);
                            i = j - 1;
                            break;
                        }
                        if (++j >= length || (code = data[j]) < 0x20 || (code > 0x7e && code < NON_ASCII_PRINTABLE)) {
                            this._printHandler(data, i, j);
                            i = j - 1;
                            break;
                        }
                    }
                    break;
                case 3:
                    if (this._executeHandlers[code])
                        this._executeHandlers[code]();
                    else
                        this._executeHandlerFb(code);
                    this.precedingJoinState = 0;
                    break;
                case 0:
                    break;
                case 1:
                    const inject = this._errorHandler({
                        position: i,
                        code,
                        currentState: this.currentState,
                        collect: this._collect,
                        params: this._params,
                        abort: false
                    });
                    if (inject.abort)
                        return;
                    break;
                case 7:
                    const handlers = this._csiHandlers[this._collect << 8 | code];
                    let j = handlers ? handlers.length - 1 : -1;
                    for (; j >= 0; j--) {
                        handlerResult = handlers[j](this._params);
                        if (handlerResult === true) {
                            break;
                        }
                        else if (handlerResult instanceof Promise) {
                            this._preserveStack(3, handlers, j, transition, i);
                            return handlerResult;
                        }
                    }
                    if (j < 0) {
                        this._csiHandlerFb(this._collect << 8 | code, this._params);
                    }
                    this.precedingJoinState = 0;
                    break;
                case 8:
                    do {
                        switch (code) {
                            case 0x3b:
                                this._params.addParam(0);
                                break;
                            case 0x3a:
                                this._params.addSubParam(-1);
                                break;
                            default:
                                this._params.addDigit(code - 48);
                        }
                    } while (++i < length && (code = data[i]) > 0x2f && code < 0x3c);
                    i--;
                    break;
                case 9:
                    this._collect <<= 8;
                    this._collect |= code;
                    break;
                case 10:
                    const handlersEsc = this._escHandlers[this._collect << 8 | code];
                    let jj = handlersEsc ? handlersEsc.length - 1 : -1;
                    for (; jj >= 0; jj--) {
                        handlerResult = handlersEsc[jj]();
                        if (handlerResult === true) {
                            break;
                        }
                        else if (handlerResult instanceof Promise) {
                            this._preserveStack(4, handlersEsc, jj, transition, i);
                            return handlerResult;
                        }
                    }
                    if (jj < 0) {
                        this._escHandlerFb(this._collect << 8 | code);
                    }
                    this.precedingJoinState = 0;
                    break;
                case 11:
                    this._params.reset();
                    this._params.addParam(0);
                    this._collect = 0;
                    break;
                case 12:
                    this._dcsParser.hook(this._collect << 8 | code, this._params);
                    break;
                case 13:
                    for (let j = i + 1;; ++j) {
                        if (j >= length || (code = data[j]) === 0x18 || code === 0x1a || code === 0x1b || (code > 0x7f && code < NON_ASCII_PRINTABLE)) {
                            this._dcsParser.put(data, i, j);
                            i = j - 1;
                            break;
                        }
                    }
                    break;
                case 14:
                    handlerResult = this._dcsParser.unhook(code !== 0x18 && code !== 0x1a);
                    if (handlerResult) {
                        this._preserveStack(6, [], 0, transition, i);
                        return handlerResult;
                    }
                    if (code === 0x1b)
                        transition |= 1;
                    this._params.reset();
                    this._params.addParam(0);
                    this._collect = 0;
                    this.precedingJoinState = 0;
                    break;
                case 4:
                    this._oscParser.start();
                    break;
                case 5:
                    for (let j = i + 1;; j++) {
                        if (j >= length || (code = data[j]) < 0x20 || (code > 0x7f && code < NON_ASCII_PRINTABLE)) {
                            this._oscParser.put(data, i, j);
                            i = j - 1;
                            break;
                        }
                    }
                    break;
                case 6:
                    handlerResult = this._oscParser.end(code !== 0x18 && code !== 0x1a);
                    if (handlerResult) {
                        this._preserveStack(5, [], 0, transition, i);
                        return handlerResult;
                    }
                    if (code === 0x1b)
                        transition |= 1;
                    this._params.reset();
                    this._params.addParam(0);
                    this._collect = 0;
                    this.precedingJoinState = 0;
                    break;
            }
            this.currentState = transition & 15;
        }
    }
}

const RGB_REX = /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/;
const HASH_REX = /^[\da-f]+$/;
function parseColor(data) {
    if (!data)
        return;
    let low = data.toLowerCase();
    if (low.indexOf('rgb:') === 0) {
        low = low.slice(4);
        const m = RGB_REX.exec(low);
        if (m) {
            const base = m[1] ? 15 : m[4] ? 255 : m[7] ? 4095 : 65535;
            return [
                Math.round(parseInt(m[1] || m[4] || m[7] || m[10], 16) / base * 255),
                Math.round(parseInt(m[2] || m[5] || m[8] || m[11], 16) / base * 255),
                Math.round(parseInt(m[3] || m[6] || m[9] || m[12], 16) / base * 255)
            ];
        }
    }
    else if (low.indexOf('#') === 0) {
        low = low.slice(1);
        if (HASH_REX.exec(low) && [3, 6, 9, 12].includes(low.length)) {
            const adv = low.length / 3;
            const result = [0, 0, 0];
            for (let i = 0; i < 3; ++i) {
                const c = parseInt(low.slice(adv * i, adv * i + adv), 16);
                result[i] = adv === 1 ? c << 4 : adv === 2 ? c : adv === 3 ? c >> 4 : c >> 8;
            }
            return result;
        }
    }
}

const GLEVEL = { '(': 0, ')': 1, '*': 2, '+': 3, '-': 1, '.': 2 };
const MAX_PARSEBUFFER_LENGTH = 131072;
const STACK_LIMIT = 10;
function paramToWindowOption(n, opts) {
    if (n > 24) {
        return opts.setWinLines || false;
    }
    switch (n) {
        case 1: return !!opts.restoreWin;
        case 2: return !!opts.minimizeWin;
        case 3: return !!opts.setWinPosition;
        case 4: return !!opts.setWinSizePixels;
        case 5: return !!opts.raiseWin;
        case 6: return !!opts.lowerWin;
        case 7: return !!opts.refreshWin;
        case 8: return !!opts.setWinSizeChars;
        case 9: return !!opts.maximizeWin;
        case 10: return !!opts.fullscreenWin;
        case 11: return !!opts.getWinState;
        case 13: return !!opts.getWinPosition;
        case 14: return !!opts.getWinSizePixels;
        case 15: return !!opts.getScreenSizePixels;
        case 16: return !!opts.getCellSizePixels;
        case 18: return !!opts.getWinSizeChars;
        case 19: return !!opts.getScreenSizeChars;
        case 20: return !!opts.getIconTitle;
        case 21: return !!opts.getWinTitle;
        case 22: return !!opts.pushTitle;
        case 23: return !!opts.popTitle;
        case 24: return !!opts.setWinLines;
    }
    return false;
}
var WindowsOptionsReportType;
(function (WindowsOptionsReportType) {
    WindowsOptionsReportType[WindowsOptionsReportType["GET_WIN_SIZE_PIXELS"] = 0] = "GET_WIN_SIZE_PIXELS";
    WindowsOptionsReportType[WindowsOptionsReportType["GET_CELL_SIZE_PIXELS"] = 1] = "GET_CELL_SIZE_PIXELS";
})(WindowsOptionsReportType || (WindowsOptionsReportType = {}));
const SLOW_ASYNC_LIMIT = 5000;
let $temp = 0;
class InputHandler extends Disposable {
    getAttrData() { return this._curAttrData; }
    constructor(_bufferService, _charsetService, _coreService, _logService, _optionsService, _oscLinkService, _coreMouseService, _unicodeService, _parser = new EscapeSequenceParser()) {
        super();
        this._bufferService = _bufferService;
        this._charsetService = _charsetService;
        this._coreService = _coreService;
        this._logService = _logService;
        this._optionsService = _optionsService;
        this._oscLinkService = _oscLinkService;
        this._coreMouseService = _coreMouseService;
        this._unicodeService = _unicodeService;
        this._parser = _parser;
        this._parseBuffer = new Uint32Array(4096);
        this._stringDecoder = new StringToUtf32();
        this._utf8Decoder = new Utf8ToUtf32();
        this._workCell = new CellData();
        this._windowTitle = '';
        this._iconName = '';
        this._windowTitleStack = [];
        this._iconNameStack = [];
        this._curAttrData = DEFAULT_ATTR_DATA.clone();
        this._eraseAttrDataInternal = DEFAULT_ATTR_DATA.clone();
        this._onRequestBell = this.register(new EventEmitter());
        this.onRequestBell = this._onRequestBell.event;
        this._onRequestRefreshRows = this.register(new EventEmitter());
        this.onRequestRefreshRows = this._onRequestRefreshRows.event;
        this._onRequestReset = this.register(new EventEmitter());
        this.onRequestReset = this._onRequestReset.event;
        this._onRequestSendFocus = this.register(new EventEmitter());
        this.onRequestSendFocus = this._onRequestSendFocus.event;
        this._onRequestSyncScrollBar = this.register(new EventEmitter());
        this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event;
        this._onRequestWindowsOptionsReport = this.register(new EventEmitter());
        this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event;
        this._onA11yChar = this.register(new EventEmitter());
        this.onA11yChar = this._onA11yChar.event;
        this._onA11yTab = this.register(new EventEmitter());
        this.onA11yTab = this._onA11yTab.event;
        this._onCursorMove = this.register(new EventEmitter());
        this.onCursorMove = this._onCursorMove.event;
        this._onLineFeed = this.register(new EventEmitter());
        this.onLineFeed = this._onLineFeed.event;
        this._onScroll = this.register(new EventEmitter());
        this.onScroll = this._onScroll.event;
        this._onTitleChange = this.register(new EventEmitter());
        this.onTitleChange = this._onTitleChange.event;
        this._onColor = this.register(new EventEmitter());
        this.onColor = this._onColor.event;
        this._parseStack = {
            paused: false,
            cursorStartX: 0,
            cursorStartY: 0,
            decodedLength: 0,
            position: 0
        };
        this._specialColors = [256, 257, 258];
        this.register(this._parser);
        this._dirtyRowTracker = new DirtyRowTracker(this._bufferService);
        this._activeBuffer = this._bufferService.buffer;
        this.register(this._bufferService.buffers.onBufferActivate(e => this._activeBuffer = e.activeBuffer));
        this._parser.setCsiHandlerFallback((ident, params) => {
            this._logService.debug('Unknown CSI code: ', { identifier: this._parser.identToString(ident), params: params.toArray() });
        });
        this._parser.setEscHandlerFallback(ident => {
            this._logService.debug('Unknown ESC code: ', { identifier: this._parser.identToString(ident) });
        });
        this._parser.setExecuteHandlerFallback(code => {
            this._logService.debug('Unknown EXECUTE code: ', { code });
        });
        this._parser.setOscHandlerFallback((identifier, action, data) => {
            this._logService.debug('Unknown OSC code: ', { identifier, action, data });
        });
        this._parser.setDcsHandlerFallback((ident, action, payload) => {
            if (action === 'HOOK') {
                payload = payload.toArray();
            }
            this._logService.debug('Unknown DCS code: ', { identifier: this._parser.identToString(ident), action, payload });
        });
        this._parser.setPrintHandler((data, start, end) => this.print(data, start, end));
        this._parser.registerCsiHandler({ final: '@' }, params => this.insertChars(params));
        this._parser.registerCsiHandler({ intermediates: ' ', final: '@' }, params => this.scrollLeft(params));
        this._parser.registerCsiHandler({ final: 'A' }, params => this.cursorUp(params));
        this._parser.registerCsiHandler({ intermediates: ' ', final: 'A' }, params => this.scrollRight(params));
        this._parser.registerCsiHandler({ final: 'B' }, params => this.cursorDown(params));
        this._parser.registerCsiHandler({ final: 'C' }, params => this.cursorForward(params));
        this._parser.registerCsiHandler({ final: 'D' }, params => this.cursorBackward(params));
        this._parser.registerCsiHandler({ final: 'E' }, params => this.cursorNextLine(params));
        this._parser.registerCsiHandler({ final: 'F' }, params => this.cursorPrecedingLine(params));
        this._parser.registerCsiHandler({ final: 'G' }, params => this.cursorCharAbsolute(params));
        this._parser.registerCsiHandler({ final: 'H' }, params => this.cursorPosition(params));
        this._parser.registerCsiHandler({ final: 'I' }, params => this.cursorForwardTab(params));
        this._parser.registerCsiHandler({ final: 'J' }, params => this.eraseInDisplay(params, false));
        this._parser.registerCsiHandler({ prefix: '?', final: 'J' }, params => this.eraseInDisplay(params, true));
        this._parser.registerCsiHandler({ final: 'K' }, params => this.eraseInLine(params, false));
        this._parser.registerCsiHandler({ prefix: '?', final: 'K' }, params => this.eraseInLine(params, true));
        this._parser.registerCsiHandler({ final: 'L' }, params => this.insertLines(params));
        this._parser.registerCsiHandler({ final: 'M' }, params => this.deleteLines(params));
        this._parser.registerCsiHandler({ final: 'P' }, params => this.deleteChars(params));
        this._parser.registerCsiHandler({ final: 'S' }, params => this.scrollUp(params));
        this._parser.registerCsiHandler({ final: 'T' }, params => this.scrollDown(params));
        this._parser.registerCsiHandler({ final: 'X' }, params => this.eraseChars(params));
        this._parser.registerCsiHandler({ final: 'Z' }, params => this.cursorBackwardTab(params));
        this._parser.registerCsiHandler({ final: '`' }, params => this.charPosAbsolute(params));
        this._parser.registerCsiHandler({ final: 'a' }, params => this.hPositionRelative(params));
        this._parser.registerCsiHandler({ final: 'b' }, params => this.repeatPrecedingCharacter(params));
        this._parser.registerCsiHandler({ final: 'c' }, params => this.sendDeviceAttributesPrimary(params));
        this._parser.registerCsiHandler({ prefix: '>', final: 'c' }, params => this.sendDeviceAttributesSecondary(params));
        this._parser.registerCsiHandler({ final: 'd' }, params => this.linePosAbsolute(params));
        this._parser.registerCsiHandler({ final: 'e' }, params => this.vPositionRelative(params));
        this._parser.registerCsiHandler({ final: 'f' }, params => this.hVPosition(params));
        this._parser.registerCsiHandler({ final: 'g' }, params => this.tabClear(params));
        this._parser.registerCsiHandler({ final: 'h' }, params => this.setMode(params));
        this._parser.registerCsiHandler({ prefix: '?', final: 'h' }, params => this.setModePrivate(params));
        this._parser.registerCsiHandler({ final: 'l' }, params => this.resetMode(params));
        this._parser.registerCsiHandler({ prefix: '?', final: 'l' }, params => this.resetModePrivate(params));
        this._parser.registerCsiHandler({ final: 'm' }, params => this.charAttributes(params));
        this._parser.registerCsiHandler({ final: 'n' }, params => this.deviceStatus(params));
        this._parser.registerCsiHandler({ prefix: '?', final: 'n' }, params => this.deviceStatusPrivate(params));
        this._parser.registerCsiHandler({ intermediates: '!', final: 'p' }, params => this.softReset(params));
        this._parser.registerCsiHandler({ intermediates: ' ', final: 'q' }, params => this.setCursorStyle(params));
        this._parser.registerCsiHandler({ final: 'r' }, params => this.setScrollRegion(params));
        this._parser.registerCsiHandler({ final: 's' }, params => this.saveCursor(params));
        this._parser.registerCsiHandler({ final: 't' }, params => this.windowOptions(params));
        this._parser.registerCsiHandler({ final: 'u' }, params => this.restoreCursor(params));
        this._parser.registerCsiHandler({ intermediates: '\'', final: '}' }, params => this.insertColumns(params));
        this._parser.registerCsiHandler({ intermediates: '\'', final: '~' }, params => this.deleteColumns(params));
        this._parser.registerCsiHandler({ intermediates: '"', final: 'q' }, params => this.selectProtected(params));
        this._parser.registerCsiHandler({ intermediates: '$', final: 'p' }, params => this.requestMode(params, true));
        this._parser.registerCsiHandler({ prefix: '?', intermediates: '$', final: 'p' }, params => this.requestMode(params, false));
        this._parser.setExecuteHandler(C0.BEL, () => this.bell());
        this._parser.setExecuteHandler(C0.LF, () => this.lineFeed());
        this._parser.setExecuteHandler(C0.VT, () => this.lineFeed());
        this._parser.setExecuteHandler(C0.FF, () => this.lineFeed());
        this._parser.setExecuteHandler(C0.CR, () => this.carriageReturn());
        this._parser.setExecuteHandler(C0.BS, () => this.backspace());
        this._parser.setExecuteHandler(C0.HT, () => this.tab());
        this._parser.setExecuteHandler(C0.SO, () => this.shiftOut());
        this._parser.setExecuteHandler(C0.SI, () => this.shiftIn());
        this._parser.setExecuteHandler(C1.IND, () => this.index());
        this._parser.setExecuteHandler(C1.NEL, () => this.nextLine());
        this._parser.setExecuteHandler(C1.HTS, () => this.tabSet());
        this._parser.registerOscHandler(0, new OscHandler(data => { this.setTitle(data); this.setIconName(data); return true; }));
        this._parser.registerOscHandler(1, new OscHandler(data => this.setIconName(data)));
        this._parser.registerOscHandler(2, new OscHandler(data => this.setTitle(data)));
        this._parser.registerOscHandler(4, new OscHandler(data => this.setOrReportIndexedColor(data)));
        this._parser.registerOscHandler(8, new OscHandler(data => this.setHyperlink(data)));
        this._parser.registerOscHandler(10, new OscHandler(data => this.setOrReportFgColor(data)));
        this._parser.registerOscHandler(11, new OscHandler(data => this.setOrReportBgColor(data)));
        this._parser.registerOscHandler(12, new OscHandler(data => this.setOrReportCursorColor(data)));
        this._parser.registerOscHandler(104, new OscHandler(data => this.restoreIndexedColor(data)));
        this._parser.registerOscHandler(110, new OscHandler(data => this.restoreFgColor(data)));
        this._parser.registerOscHandler(111, new OscHandler(data => this.restoreBgColor(data)));
        this._parser.registerOscHandler(112, new OscHandler(data => this.restoreCursorColor(data)));
        this._parser.registerEscHandler({ final: '7' }, () => this.saveCursor());
        this._parser.registerEscHandler({ final: '8' }, () => this.restoreCursor());
        this._parser.registerEscHandler({ final: 'D' }, () => this.index());
        this._parser.registerEscHandler({ final: 'E' }, () => this.nextLine());
        this._parser.registerEscHandler({ final: 'H' }, () => this.tabSet());
        this._parser.registerEscHandler({ final: 'M' }, () => this.reverseIndex());
        this._parser.registerEscHandler({ final: '=' }, () => this.keypadApplicationMode());
        this._parser.registerEscHandler({ final: '>' }, () => this.keypadNumericMode());
        this._parser.registerEscHandler({ final: 'c' }, () => this.fullReset());
        this._parser.registerEscHandler({ final: 'n' }, () => this.setgLevel(2));
        this._parser.registerEscHandler({ final: 'o' }, () => this.setgLevel(3));
        this._parser.registerEscHandler({ final: '|' }, () => this.setgLevel(3));
        this._parser.registerEscHandler({ final: '}' }, () => this.setgLevel(2));
        this._parser.registerEscHandler({ final: '~' }, () => this.setgLevel(1));
        this._parser.registerEscHandler({ intermediates: '%', final: '@' }, () => this.selectDefaultCharset());
        this._parser.registerEscHandler({ intermediates: '%', final: 'G' }, () => this.selectDefaultCharset());
        for (const flag in CHARSETS) {
            this._parser.registerEscHandler({ intermediates: '(', final: flag }, () => this.selectCharset('(' + flag));
            this._parser.registerEscHandler({ intermediates: ')', final: flag }, () => this.selectCharset(')' + flag));
            this._parser.registerEscHandler({ intermediates: '*', final: flag }, () => this.selectCharset('*' + flag));
            this._parser.registerEscHandler({ intermediates: '+', final: flag }, () => this.selectCharset('+' + flag));
            this._parser.registerEscHandler({ intermediates: '-', final: flag }, () => this.selectCharset('-' + flag));
            this._parser.registerEscHandler({ intermediates: '.', final: flag }, () => this.selectCharset('.' + flag));
            this._parser.registerEscHandler({ intermediates: '/', final: flag }, () => this.selectCharset('/' + flag));
        }
        this._parser.registerEscHandler({ intermediates: '#', final: '8' }, () => this.screenAlignmentPattern());
        this._parser.setErrorHandler((state) => {
            this._logService.error('Parsing error: ', state);
            return state;
        });
        this._parser.registerDcsHandler({ intermediates: '$', final: 'q' }, new DcsHandler((data, params) => this.requestStatusString(data, params)));
    }
    _preserveStack(cursorStartX, cursorStartY, decodedLength, position) {
        this._parseStack.paused = true;
        this._parseStack.cursorStartX = cursorStartX;
        this._parseStack.cursorStartY = cursorStartY;
        this._parseStack.decodedLength = decodedLength;
        this._parseStack.position = position;
    }
    _logSlowResolvingAsync(p) {
        if (this._logService.logLevel <= LogLevelEnum.WARN) {
            Promise.race([p, new Promise((res, rej) => setTimeout(() => rej('#SLOW_TIMEOUT'), SLOW_ASYNC_LIMIT))])
                .catch(err => {
                if (err !== '#SLOW_TIMEOUT') {
                    throw err;
                }
                console.warn(`async parser handler taking longer than ${SLOW_ASYNC_LIMIT} ms`);
            });
        }
    }
    _getCurrentLinkId() {
        return this._curAttrData.extended.urlId;
    }
    parse(data, promiseResult) {
        let result;
        let cursorStartX = this._activeBuffer.x;
        let cursorStartY = this._activeBuffer.y;
        let start = 0;
        const wasPaused = this._parseStack.paused;
        if (wasPaused) {
            if (result = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, promiseResult)) {
                this._logSlowResolvingAsync(result);
                return result;
            }
            cursorStartX = this._parseStack.cursorStartX;
            cursorStartY = this._parseStack.cursorStartY;
            this._parseStack.paused = false;
            if (data.length > MAX_PARSEBUFFER_LENGTH) {
                start = this._parseStack.position + MAX_PARSEBUFFER_LENGTH;
            }
        }
        if (this._logService.logLevel <= LogLevelEnum.DEBUG) {
            this._logService.debug(`parsing data${typeof data === 'string' ? ` "${data}"` : ` "${Array.prototype.map.call(data, e => String.fromCharCode(e)).join('')}"`}`, typeof data === 'string'
                ? data.split('').map(e => e.charCodeAt(0))
                : data);
        }
        if (this._parseBuffer.length < data.length) {
            if (this._parseBuffer.length < MAX_PARSEBUFFER_LENGTH) {
                this._parseBuffer = new Uint32Array(Math.min(data.length, MAX_PARSEBUFFER_LENGTH));
            }
        }
        if (!wasPaused) {
            this._dirtyRowTracker.clearRange();
        }
        if (data.length > MAX_PARSEBUFFER_LENGTH) {
            for (let i = start; i < data.length; i += MAX_PARSEBUFFER_LENGTH) {
                const end = i + MAX_PARSEBUFFER_LENGTH < data.length ? i + MAX_PARSEBUFFER_LENGTH : data.length;
                const len = (typeof data === 'string')
                    ? this._stringDecoder.decode(data.substring(i, end), this._parseBuffer)
                    : this._utf8Decoder.decode(data.subarray(i, end), this._parseBuffer);
                if (result = this._parser.parse(this._parseBuffer, len)) {
                    this._preserveStack(cursorStartX, cursorStartY, len, i);
                    this._logSlowResolvingAsync(result);
                    return result;
                }
            }
        }
        else {
            if (!wasPaused) {
                const len = (typeof data === 'string')
                    ? this._stringDecoder.decode(data, this._parseBuffer)
                    : this._utf8Decoder.decode(data, this._parseBuffer);
                if (result = this._parser.parse(this._parseBuffer, len)) {
                    this._preserveStack(cursorStartX, cursorStartY, len, 0);
                    this._logSlowResolvingAsync(result);
                    return result;
                }
            }
        }
        if (this._activeBuffer.x !== cursorStartX || this._activeBuffer.y !== cursorStartY) {
            this._onCursorMove.fire();
        }
        const viewportEnd = this._dirtyRowTracker.end + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
        const viewportStart = this._dirtyRowTracker.start + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
        if (viewportStart < this._bufferService.rows) {
            this._onRequestRefreshRows.fire(Math.min(viewportStart, this._bufferService.rows - 1), Math.min(viewportEnd, this._bufferService.rows - 1));
        }
    }
    print(data, start, end) {
        let code;
        let chWidth;
        const charset = this._charsetService.charset;
        const screenReaderMode = this._optionsService.rawOptions.screenReaderMode;
        const cols = this._bufferService.cols;
        const wraparoundMode = this._coreService.decPrivateModes.wraparound;
        const insertMode = this._coreService.modes.insertMode;
        const curAttr = this._curAttrData;
        let bufferRow = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        if (this._activeBuffer.x && end - start > 0 && bufferRow.getWidth(this._activeBuffer.x - 1) === 2) {
            bufferRow.setCellFromCodepoint(this._activeBuffer.x - 1, 0, 1, curAttr);
        }
        let precedingJoinState = this._parser.precedingJoinState;
        for (let pos = start; pos < end; ++pos) {
            code = data[pos];
            if (code < 127 && charset) {
                const ch = charset[String.fromCharCode(code)];
                if (ch) {
                    code = ch.charCodeAt(0);
                }
            }
            const currentInfo = this._unicodeService.charProperties(code, precedingJoinState);
            chWidth = UnicodeService.extractWidth(currentInfo);
            const shouldJoin = UnicodeService.extractShouldJoin(currentInfo);
            const oldWidth = shouldJoin ? UnicodeService.extractWidth(precedingJoinState) : 0;
            precedingJoinState = currentInfo;
            if (screenReaderMode) {
                this._onA11yChar.fire(stringFromCodePoint(code));
            }
            if (this._getCurrentLinkId()) {
                this._oscLinkService.addLineToLink(this._getCurrentLinkId(), this._activeBuffer.ybase + this._activeBuffer.y);
            }
            if (this._activeBuffer.x + chWidth - oldWidth > cols) {
                if (wraparoundMode) {
                    const oldRow = bufferRow;
                    let oldCol = this._activeBuffer.x - oldWidth;
                    this._activeBuffer.x = oldWidth;
                    this._activeBuffer.y++;
                    if (this._activeBuffer.y === this._activeBuffer.scrollBottom + 1) {
                        this._activeBuffer.y--;
                        this._bufferService.scroll(this._eraseAttrData(), true);
                    }
                    else {
                        if (this._activeBuffer.y >= this._bufferService.rows) {
                            this._activeBuffer.y = this._bufferService.rows - 1;
                        }
                        this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = true;
                    }
                    bufferRow = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
                    if (oldWidth > 0 && bufferRow instanceof BufferLine) {
                        bufferRow.copyCellsFrom(oldRow, oldCol, 0, oldWidth, false);
                    }
                    while (oldCol < cols) {
                        oldRow.setCellFromCodepoint(oldCol++, 0, 1, curAttr);
                    }
                }
                else {
                    this._activeBuffer.x = cols - 1;
                    if (chWidth === 2) {
                        continue;
                    }
                }
            }
            if (shouldJoin && this._activeBuffer.x) {
                const offset = bufferRow.getWidth(this._activeBuffer.x - 1) ? 1 : 2;
                bufferRow.addCodepointToCell(this._activeBuffer.x - offset, code, chWidth);
                for (let delta = chWidth - oldWidth; --delta >= 0;) {
                    bufferRow.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, curAttr);
                }
                continue;
            }
            if (insertMode) {
                bufferRow.insertCells(this._activeBuffer.x, chWidth - oldWidth, this._activeBuffer.getNullCell(curAttr));
                if (bufferRow.getWidth(cols - 1) === 2) {
                    bufferRow.setCellFromCodepoint(cols - 1, NULL_CELL_CODE, NULL_CELL_WIDTH, curAttr);
                }
            }
            bufferRow.setCellFromCodepoint(this._activeBuffer.x++, code, chWidth, curAttr);
            if (chWidth > 0) {
                while (--chWidth) {
                    bufferRow.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, curAttr);
                }
            }
        }
        this._parser.precedingJoinState = precedingJoinState;
        if (this._activeBuffer.x < cols && end - start > 0 && bufferRow.getWidth(this._activeBuffer.x) === 0 && !bufferRow.hasContent(this._activeBuffer.x)) {
            bufferRow.setCellFromCodepoint(this._activeBuffer.x, 0, 1, curAttr);
        }
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    }
    registerCsiHandler(id, callback) {
        if (id.final === 't' && !id.prefix && !id.intermediates) {
            return this._parser.registerCsiHandler(id, params => {
                if (!paramToWindowOption(params.params[0], this._optionsService.rawOptions.windowOptions)) {
                    return true;
                }
                return callback(params);
            });
        }
        return this._parser.registerCsiHandler(id, callback);
    }
    registerDcsHandler(id, callback) {
        return this._parser.registerDcsHandler(id, new DcsHandler(callback));
    }
    registerEscHandler(id, callback) {
        return this._parser.registerEscHandler(id, callback);
    }
    registerOscHandler(ident, callback) {
        return this._parser.registerOscHandler(ident, new OscHandler(callback));
    }
    bell() {
        this._onRequestBell.fire();
        return true;
    }
    lineFeed() {
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        if (this._optionsService.rawOptions.convertEol) {
            this._activeBuffer.x = 0;
        }
        this._activeBuffer.y++;
        if (this._activeBuffer.y === this._activeBuffer.scrollBottom + 1) {
            this._activeBuffer.y--;
            this._bufferService.scroll(this._eraseAttrData());
        }
        else if (this._activeBuffer.y >= this._bufferService.rows) {
            this._activeBuffer.y = this._bufferService.rows - 1;
        }
        else {
            this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false;
        }
        if (this._activeBuffer.x >= this._bufferService.cols) {
            this._activeBuffer.x--;
        }
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        this._onLineFeed.fire();
        return true;
    }
    carriageReturn() {
        this._activeBuffer.x = 0;
        return true;
    }
    backspace() {
        var _a;
        if (!this._coreService.decPrivateModes.reverseWraparound) {
            this._restrictCursor();
            if (this._activeBuffer.x > 0) {
                this._activeBuffer.x--;
            }
            return true;
        }
        this._restrictCursor(this._bufferService.cols);
        if (this._activeBuffer.x > 0) {
            this._activeBuffer.x--;
        }
        else {
            if (this._activeBuffer.x === 0
                && this._activeBuffer.y > this._activeBuffer.scrollTop
                && this._activeBuffer.y <= this._activeBuffer.scrollBottom
                && ((_a = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)) === null || _a === void 0 ? void 0 : _a.isWrapped)) {
                this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false;
                this._activeBuffer.y--;
                this._activeBuffer.x = this._bufferService.cols - 1;
                const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
                if (line.hasWidth(this._activeBuffer.x) && !line.hasContent(this._activeBuffer.x)) {
                    this._activeBuffer.x--;
                }
            }
        }
        this._restrictCursor();
        return true;
    }
    tab() {
        if (this._activeBuffer.x >= this._bufferService.cols) {
            return true;
        }
        const originalX = this._activeBuffer.x;
        this._activeBuffer.x = this._activeBuffer.nextStop();
        if (this._optionsService.rawOptions.screenReaderMode) {
            this._onA11yTab.fire(this._activeBuffer.x - originalX);
        }
        return true;
    }
    shiftOut() {
        this._charsetService.setgLevel(1);
        return true;
    }
    shiftIn() {
        this._charsetService.setgLevel(0);
        return true;
    }
    _restrictCursor(maxCol = this._bufferService.cols - 1) {
        this._activeBuffer.x = Math.min(maxCol, Math.max(0, this._activeBuffer.x));
        this._activeBuffer.y = this._coreService.decPrivateModes.origin
            ? Math.min(this._activeBuffer.scrollBottom, Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y))
            : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y));
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    }
    _setCursor(x, y) {
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        if (this._coreService.decPrivateModes.origin) {
            this._activeBuffer.x = x;
            this._activeBuffer.y = this._activeBuffer.scrollTop + y;
        }
        else {
            this._activeBuffer.x = x;
            this._activeBuffer.y = y;
        }
        this._restrictCursor();
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
    }
    _moveCursor(x, y) {
        this._restrictCursor();
        this._setCursor(this._activeBuffer.x + x, this._activeBuffer.y + y);
    }
    cursorUp(params) {
        const diffToTop = this._activeBuffer.y - this._activeBuffer.scrollTop;
        if (diffToTop >= 0) {
            this._moveCursor(0, -Math.min(diffToTop, params.params[0] || 1));
        }
        else {
            this._moveCursor(0, -(params.params[0] || 1));
        }
        return true;
    }
    cursorDown(params) {
        const diffToBottom = this._activeBuffer.scrollBottom - this._activeBuffer.y;
        if (diffToBottom >= 0) {
            this._moveCursor(0, Math.min(diffToBottom, params.params[0] || 1));
        }
        else {
            this._moveCursor(0, params.params[0] || 1);
        }
        return true;
    }
    cursorForward(params) {
        this._moveCursor(params.params[0] || 1, 0);
        return true;
    }
    cursorBackward(params) {
        this._moveCursor(-(params.params[0] || 1), 0);
        return true;
    }
    cursorNextLine(params) {
        this.cursorDown(params);
        this._activeBuffer.x = 0;
        return true;
    }
    cursorPrecedingLine(params) {
        this.cursorUp(params);
        this._activeBuffer.x = 0;
        return true;
    }
    cursorCharAbsolute(params) {
        this._setCursor((params.params[0] || 1) - 1, this._activeBuffer.y);
        return true;
    }
    cursorPosition(params) {
        this._setCursor((params.length >= 2) ? (params.params[1] || 1) - 1 : 0, (params.params[0] || 1) - 1);
        return true;
    }
    charPosAbsolute(params) {
        this._setCursor((params.params[0] || 1) - 1, this._activeBuffer.y);
        return true;
    }
    hPositionRelative(params) {
        this._moveCursor(params.params[0] || 1, 0);
        return true;
    }
    linePosAbsolute(params) {
        this._setCursor(this._activeBuffer.x, (params.params[0] || 1) - 1);
        return true;
    }
    vPositionRelative(params) {
        this._moveCursor(0, params.params[0] || 1);
        return true;
    }
    hVPosition(params) {
        this.cursorPosition(params);
        return true;
    }
    tabClear(params) {
        const param = params.params[0];
        if (param === 0) {
            delete this._activeBuffer.tabs[this._activeBuffer.x];
        }
        else if (param === 3) {
            this._activeBuffer.tabs = {};
        }
        return true;
    }
    cursorForwardTab(params) {
        if (this._activeBuffer.x >= this._bufferService.cols) {
            return true;
        }
        let param = params.params[0] || 1;
        while (param--) {
            this._activeBuffer.x = this._activeBuffer.nextStop();
        }
        return true;
    }
    cursorBackwardTab(params) {
        if (this._activeBuffer.x >= this._bufferService.cols) {
            return true;
        }
        let param = params.params[0] || 1;
        while (param--) {
            this._activeBuffer.x = this._activeBuffer.prevStop();
        }
        return true;
    }
    selectProtected(params) {
        const p = params.params[0];
        if (p === 1)
            this._curAttrData.bg |= 536870912;
        if (p === 2 || p === 0)
            this._curAttrData.bg &= ~536870912;
        return true;
    }
    _eraseInBufferLine(y, start, end, clearWrap = false, respectProtect = false) {
        const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
        line.replaceCells(start, end, this._activeBuffer.getNullCell(this._eraseAttrData()), respectProtect);
        if (clearWrap) {
            line.isWrapped = false;
        }
    }
    _resetBufferLine(y, respectProtect = false) {
        const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
        if (line) {
            line.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), respectProtect);
            this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + y);
            line.isWrapped = false;
        }
    }
    eraseInDisplay(params, respectProtect = false) {
        this._restrictCursor(this._bufferService.cols);
        let j;
        switch (params.params[0]) {
            case 0:
                j = this._activeBuffer.y;
                this._dirtyRowTracker.markDirty(j);
                this._eraseInBufferLine(j++, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, respectProtect);
                for (; j < this._bufferService.rows; j++) {
                    this._resetBufferLine(j, respectProtect);
                }
                this._dirtyRowTracker.markDirty(j);
                break;
            case 1:
                j = this._activeBuffer.y;
                this._dirtyRowTracker.markDirty(j);
                this._eraseInBufferLine(j, 0, this._activeBuffer.x + 1, true, respectProtect);
                if (this._activeBuffer.x + 1 >= this._bufferService.cols) {
                    this._activeBuffer.lines.get(j + 1).isWrapped = false;
                }
                while (j--) {
                    this._resetBufferLine(j, respectProtect);
                }
                this._dirtyRowTracker.markDirty(0);
                break;
            case 2:
                j = this._bufferService.rows;
                this._dirtyRowTracker.markDirty(j - 1);
                while (j--) {
                    this._resetBufferLine(j, respectProtect);
                }
                this._dirtyRowTracker.markDirty(0);
                break;
            case 3:
                const scrollBackSize = this._activeBuffer.lines.length - this._bufferService.rows;
                if (scrollBackSize > 0) {
                    this._activeBuffer.lines.trimStart(scrollBackSize);
                    this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - scrollBackSize, 0);
                    this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - scrollBackSize, 0);
                    this._onScroll.fire(0);
                }
                break;
        }
        return true;
    }
    eraseInLine(params, respectProtect = false) {
        this._restrictCursor(this._bufferService.cols);
        switch (params.params[0]) {
            case 0:
                this._eraseInBufferLine(this._activeBuffer.y, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, respectProtect);
                break;
            case 1:
                this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, false, respectProtect);
                break;
            case 2:
                this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, true, respectProtect);
                break;
        }
        this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        return true;
    }
    insertLines(params) {
        this._restrictCursor();
        let param = params.params[0] || 1;
        if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
            return true;
        }
        const row = this._activeBuffer.ybase + this._activeBuffer.y;
        const scrollBottomRowsOffset = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom;
        const scrollBottomAbsolute = this._bufferService.rows - 1 + this._activeBuffer.ybase - scrollBottomRowsOffset + 1;
        while (param--) {
            this._activeBuffer.lines.splice(scrollBottomAbsolute - 1, 1);
            this._activeBuffer.lines.splice(row, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom);
        this._activeBuffer.x = 0;
        return true;
    }
    deleteLines(params) {
        this._restrictCursor();
        let param = params.params[0] || 1;
        if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
            return true;
        }
        const row = this._activeBuffer.ybase + this._activeBuffer.y;
        let j;
        j = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom;
        j = this._bufferService.rows - 1 + this._activeBuffer.ybase - j;
        while (param--) {
            this._activeBuffer.lines.splice(row, 1);
            this._activeBuffer.lines.splice(j, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom);
        this._activeBuffer.x = 0;
        return true;
    }
    insertChars(params) {
        this._restrictCursor();
        const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
        if (line) {
            line.insertCells(this._activeBuffer.x, params.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData()));
            this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        return true;
    }
    deleteChars(params) {
        this._restrictCursor();
        const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
        if (line) {
            line.deleteCells(this._activeBuffer.x, params.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData()));
            this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        return true;
    }
    scrollUp(params) {
        let param = params.params[0] || 1;
        while (param--) {
            this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 1);
            this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
        return true;
    }
    scrollDown(params) {
        let param = params.params[0] || 1;
        while (param--) {
            this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 1);
            this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 0, this._activeBuffer.getBlankLine(DEFAULT_ATTR_DATA));
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
        return true;
    }
    scrollLeft(params) {
        if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
            return true;
        }
        const param = params.params[0] || 1;
        for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
            const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
            line.deleteCells(0, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
            line.isWrapped = false;
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
        return true;
    }
    scrollRight(params) {
        if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
            return true;
        }
        const param = params.params[0] || 1;
        for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
            const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
            line.insertCells(0, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
            line.isWrapped = false;
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
        return true;
    }
    insertColumns(params) {
        if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
            return true;
        }
        const param = params.params[0] || 1;
        for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
            const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
            line.insertCells(this._activeBuffer.x, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
            line.isWrapped = false;
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
        return true;
    }
    deleteColumns(params) {
        if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) {
            return true;
        }
        const param = params.params[0] || 1;
        for (let y = this._activeBuffer.scrollTop; y <= this._activeBuffer.scrollBottom; ++y) {
            const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + y);
            line.deleteCells(this._activeBuffer.x, param, this._activeBuffer.getNullCell(this._eraseAttrData()));
            line.isWrapped = false;
        }
        this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
        return true;
    }
    eraseChars(params) {
        this._restrictCursor();
        const line = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
        if (line) {
            line.replaceCells(this._activeBuffer.x, this._activeBuffer.x + (params.params[0] || 1), this._activeBuffer.getNullCell(this._eraseAttrData()));
            this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        return true;
    }
    repeatPrecedingCharacter(params) {
        const joinState = this._parser.precedingJoinState;
        if (!joinState) {
            return true;
        }
        const length = params.params[0] || 1;
        const chWidth = UnicodeService.extractWidth(joinState);
        const x = this._activeBuffer.x - chWidth;
        const bufferRow = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
        const text = bufferRow.getString(x);
        const data = new Uint32Array(text.length * length);
        let idata = 0;
        for (let itext = 0; itext < text.length;) {
            const ch = text.codePointAt(itext) || 0;
            data[idata++] = ch;
            itext += ch > 0xffff ? 2 : 1;
        }
        let tlength = idata;
        for (let i = 1; i < length; ++i) {
            data.copyWithin(tlength, 0, idata);
            tlength += idata;
        }
        this.print(data, 0, tlength);
        return true;
    }
    sendDeviceAttributesPrimary(params) {
        if (params.params[0] > 0) {
            return true;
        }
        if (this._is('xterm') || this._is('rxvt-unicode') || this._is('screen')) {
            this._coreService.triggerDataEvent(C0.ESC + '[?1;2c');
        }
        else if (this._is('linux')) {
            this._coreService.triggerDataEvent(C0.ESC + '[?6c');
        }
        return true;
    }
    sendDeviceAttributesSecondary(params) {
        if (params.params[0] > 0) {
            return true;
        }
        if (this._is('xterm')) {
            this._coreService.triggerDataEvent(C0.ESC + '[>0;276;0c');
        }
        else if (this._is('rxvt-unicode')) {
            this._coreService.triggerDataEvent(C0.ESC + '[>85;95;0c');
        }
        else if (this._is('linux')) {
            this._coreService.triggerDataEvent(params.params[0] + 'c');
        }
        else if (this._is('screen')) {
            this._coreService.triggerDataEvent(C0.ESC + '[>83;40003;0c');
        }
        return true;
    }
    _is(term) {
        return (this._optionsService.rawOptions.termName + '').indexOf(term) === 0;
    }
    setMode(params) {
        for (let i = 0; i < params.length; i++) {
            switch (params.params[i]) {
                case 4:
                    this._coreService.modes.insertMode = true;
                    break;
                case 20:
                    this._optionsService.options.convertEol = true;
                    break;
            }
        }
        return true;
    }
    setModePrivate(params) {
        for (let i = 0; i < params.length; i++) {
            switch (params.params[i]) {
                case 1:
                    this._coreService.decPrivateModes.applicationCursorKeys = true;
                    break;
                case 2:
                    this._charsetService.setgCharset(0, DEFAULT_CHARSET);
                    this._charsetService.setgCharset(1, DEFAULT_CHARSET);
                    this._charsetService.setgCharset(2, DEFAULT_CHARSET);
                    this._charsetService.setgCharset(3, DEFAULT_CHARSET);
                    break;
                case 3:
                    if (this._optionsService.rawOptions.windowOptions.setWinLines) {
                        this._bufferService.resize(132, this._bufferService.rows);
                        this._onRequestReset.fire();
                    }
                    break;
                case 6:
                    this._coreService.decPrivateModes.origin = true;
                    this._setCursor(0, 0);
                    break;
                case 7:
                    this._coreService.decPrivateModes.wraparound = true;
                    break;
                case 12:
                    this._optionsService.options.cursorBlink = true;
                    break;
                case 45:
                    this._coreService.decPrivateModes.reverseWraparound = true;
                    break;
                case 66:
                    this._logService.debug('Serial port requested application keypad.');
                    this._coreService.decPrivateModes.applicationKeypad = true;
                    this._onRequestSyncScrollBar.fire();
                    break;
                case 9:
                    this._coreMouseService.activeProtocol = 'X10';
                    break;
                case 1000:
                    this._coreMouseService.activeProtocol = 'VT200';
                    break;
                case 1002:
                    this._coreMouseService.activeProtocol = 'DRAG';
                    break;
                case 1003:
                    this._coreMouseService.activeProtocol = 'ANY';
                    break;
                case 1004:
                    this._coreService.decPrivateModes.sendFocus = true;
                    this._onRequestSendFocus.fire();
                    break;
                case 1005:
                    this._logService.debug('DECSET 1005 not supported (see #2507)');
                    break;
                case 1006:
                    this._coreMouseService.activeEncoding = 'SGR';
                    break;
                case 1015:
                    this._logService.debug('DECSET 1015 not supported (see #2507)');
                    break;
                case 1016:
                    this._coreMouseService.activeEncoding = 'SGR_PIXELS';
                    break;
                case 25:
                    this._coreService.isCursorHidden = false;
                    break;
                case 1048:
                    this.saveCursor();
                    break;
                case 1049:
                    this.saveCursor();
                case 47:
                case 1047:
                    this._bufferService.buffers.activateAltBuffer(this._eraseAttrData());
                    this._coreService.isCursorInitialized = true;
                    this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1);
                    this._onRequestSyncScrollBar.fire();
                    break;
                case 2004:
                    this._coreService.decPrivateModes.bracketedPasteMode = true;
                    break;
            }
        }
        return true;
    }
    resetMode(params) {
        for (let i = 0; i < params.length; i++) {
            switch (params.params[i]) {
                case 4:
                    this._coreService.modes.insertMode = false;
                    break;
                case 20:
                    this._optionsService.options.convertEol = false;
                    break;
            }
        }
        return true;
    }
    resetModePrivate(params) {
        for (let i = 0; i < params.length; i++) {
            switch (params.params[i]) {
                case 1:
                    this._coreService.decPrivateModes.applicationCursorKeys = false;
                    break;
                case 3:
                    if (this._optionsService.rawOptions.windowOptions.setWinLines) {
                        this._bufferService.resize(80, this._bufferService.rows);
                        this._onRequestReset.fire();
                    }
                    break;
                case 6:
                    this._coreService.decPrivateModes.origin = false;
                    this._setCursor(0, 0);
                    break;
                case 7:
                    this._coreService.decPrivateModes.wraparound = false;
                    break;
                case 12:
                    this._optionsService.options.cursorBlink = false;
                    break;
                case 45:
                    this._coreService.decPrivateModes.reverseWraparound = false;
                    break;
                case 66:
                    this._logService.debug('Switching back to normal keypad.');
                    this._coreService.decPrivateModes.applicationKeypad = false;
                    this._onRequestSyncScrollBar.fire();
                    break;
                case 9:
                case 1000:
                case 1002:
                case 1003:
                    this._coreMouseService.activeProtocol = 'NONE';
                    break;
                case 1004:
                    this._coreService.decPrivateModes.sendFocus = false;
                    break;
                case 1005:
                    this._logService.debug('DECRST 1005 not supported (see #2507)');
                    break;
                case 1006:
                    this._coreMouseService.activeEncoding = 'DEFAULT';
                    break;
                case 1015:
                    this._logService.debug('DECRST 1015 not supported (see #2507)');
                    break;
                case 1016:
                    this._coreMouseService.activeEncoding = 'DEFAULT';
                    break;
                case 25:
                    this._coreService.isCursorHidden = true;
                    break;
                case 1048:
                    this.restoreCursor();
                    break;
                case 1049:
                case 47:
                case 1047:
                    this._bufferService.buffers.activateNormalBuffer();
                    if (params.params[i] === 1049) {
                        this.restoreCursor();
                    }
                    this._coreService.isCursorInitialized = true;
                    this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1);
                    this._onRequestSyncScrollBar.fire();
                    break;
                case 2004:
                    this._coreService.decPrivateModes.bracketedPasteMode = false;
                    break;
            }
        }
        return true;
    }
    requestMode(params, ansi) {
        const dm = this._coreService.decPrivateModes;
        const { activeProtocol: mouseProtocol, activeEncoding: mouseEncoding } = this._coreMouseService;
        const cs = this._coreService;
        const { buffers, cols } = this._bufferService;
        const { active, alt } = buffers;
        const opts = this._optionsService.rawOptions;
        const f = (m, v) => {
            cs.triggerDataEvent(`${C0.ESC}[${ansi ? '' : '?'}${m};${v}$y`);
            return true;
        };
        const b2v = (value) => value ? 1 : 2;
        const p = params.params[0];
        if (ansi) {
            if (p === 2)
                return f(p, 4);
            if (p === 4)
                return f(p, b2v(cs.modes.insertMode));
            if (p === 12)
                return f(p, 3);
            if (p === 20)
                return f(p, b2v(opts.convertEol));
            return f(p, 0);
        }
        if (p === 1)
            return f(p, b2v(dm.applicationCursorKeys));
        if (p === 3)
            return f(p, opts.windowOptions.setWinLines ? (cols === 80 ? 2 : cols === 132 ? 1 : 0) : 0);
        if (p === 6)
            return f(p, b2v(dm.origin));
        if (p === 7)
            return f(p, b2v(dm.wraparound));
        if (p === 8)
            return f(p, 3);
        if (p === 9)
            return f(p, b2v(mouseProtocol === 'X10'));
        if (p === 12)
            return f(p, b2v(opts.cursorBlink));
        if (p === 25)
            return f(p, b2v(!cs.isCursorHidden));
        if (p === 45)
            return f(p, b2v(dm.reverseWraparound));
        if (p === 66)
            return f(p, b2v(dm.applicationKeypad));
        if (p === 67)
            return f(p, 4);
        if (p === 1000)
            return f(p, b2v(mouseProtocol === 'VT200'));
        if (p === 1002)
            return f(p, b2v(mouseProtocol === 'DRAG'));
        if (p === 1003)
            return f(p, b2v(mouseProtocol === 'ANY'));
        if (p === 1004)
            return f(p, b2v(dm.sendFocus));
        if (p === 1005)
            return f(p, 4);
        if (p === 1006)
            return f(p, b2v(mouseEncoding === 'SGR'));
        if (p === 1015)
            return f(p, 4);
        if (p === 1016)
            return f(p, b2v(mouseEncoding === 'SGR_PIXELS'));
        if (p === 1048)
            return f(p, 1);
        if (p === 47 || p === 1047 || p === 1049)
            return f(p, b2v(active === alt));
        if (p === 2004)
            return f(p, b2v(dm.bracketedPasteMode));
        return f(p, 0);
    }
    _updateAttrColor(color, mode, c1, c2, c3) {
        if (mode === 2) {
            color |= 50331648;
            color &= ~16777215;
            color |= AttributeData.fromColorRGB([c1, c2, c3]);
        }
        else if (mode === 5) {
            color &= ~(50331648 | 255);
            color |= 33554432 | (c1 & 0xff);
        }
        return color;
    }
    _extractColor(params, pos, attr) {
        const accu = [0, 0, -1, 0, 0, 0];
        let cSpace = 0;
        let advance = 0;
        do {
            accu[advance + cSpace] = params.params[pos + advance];
            if (params.hasSubParams(pos + advance)) {
                const subparams = params.getSubParams(pos + advance);
                let i = 0;
                do {
                    if (accu[1] === 5) {
                        cSpace = 1;
                    }
                    accu[advance + i + 1 + cSpace] = subparams[i];
                } while (++i < subparams.length && i + advance + 1 + cSpace < accu.length);
                break;
            }
            if ((accu[1] === 5 && advance + cSpace >= 2)
                || (accu[1] === 2 && advance + cSpace >= 5)) {
                break;
            }
            if (accu[1]) {
                cSpace = 1;
            }
        } while (++advance + pos < params.length && advance + cSpace < accu.length);
        for (let i = 2; i < accu.length; ++i) {
            if (accu[i] === -1) {
                accu[i] = 0;
            }
        }
        switch (accu[0]) {
            case 38:
                attr.fg = this._updateAttrColor(attr.fg, accu[1], accu[3], accu[4], accu[5]);
                break;
            case 48:
                attr.bg = this._updateAttrColor(attr.bg, accu[1], accu[3], accu[4], accu[5]);
                break;
            case 58:
                attr.extended = attr.extended.clone();
                attr.extended.underlineColor = this._updateAttrColor(attr.extended.underlineColor, accu[1], accu[3], accu[4], accu[5]);
        }
        return advance;
    }
    _processUnderline(style, attr) {
        attr.extended = attr.extended.clone();
        if (!~style || style > 5) {
            style = 1;
        }
        attr.extended.underlineStyle = style;
        attr.fg |= 268435456;
        if (style === 0) {
            attr.fg &= ~268435456;
        }
        attr.updateExtended();
    }
    _processSGR0(attr) {
        attr.fg = DEFAULT_ATTR_DATA.fg;
        attr.bg = DEFAULT_ATTR_DATA.bg;
        attr.extended = attr.extended.clone();
        attr.extended.underlineStyle = 0;
        attr.extended.underlineColor &= ~(50331648 | 16777215);
        attr.updateExtended();
    }
    charAttributes(params) {
        if (params.length === 1 && params.params[0] === 0) {
            this._processSGR0(this._curAttrData);
            return true;
        }
        const l = params.length;
        let p;
        const attr = this._curAttrData;
        for (let i = 0; i < l; i++) {
            p = params.params[i];
            if (p >= 30 && p <= 37) {
                attr.fg &= ~(50331648 | 255);
                attr.fg |= 16777216 | (p - 30);
            }
            else if (p >= 40 && p <= 47) {
                attr.bg &= ~(50331648 | 255);
                attr.bg |= 16777216 | (p - 40);
            }
            else if (p >= 90 && p <= 97) {
                attr.fg &= ~(50331648 | 255);
                attr.fg |= 16777216 | (p - 90) | 8;
            }
            else if (p >= 100 && p <= 107) {
                attr.bg &= ~(50331648 | 255);
                attr.bg |= 16777216 | (p - 100) | 8;
            }
            else if (p === 0) {
                this._processSGR0(attr);
            }
            else if (p === 1) {
                attr.fg |= 134217728;
            }
            else if (p === 3) {
                attr.bg |= 67108864;
            }
            else if (p === 4) {
                attr.fg |= 268435456;
                this._processUnderline(params.hasSubParams(i) ? params.getSubParams(i)[0] : 1, attr);
            }
            else if (p === 5) {
                attr.fg |= 536870912;
            }
            else if (p === 7) {
                attr.fg |= 67108864;
            }
            else if (p === 8) {
                attr.fg |= 1073741824;
            }
            else if (p === 9) {
                attr.fg |= 2147483648;
            }
            else if (p === 2) {
                attr.bg |= 134217728;
            }
            else if (p === 21) {
                this._processUnderline(2, attr);
            }
            else if (p === 22) {
                attr.fg &= ~134217728;
                attr.bg &= ~134217728;
            }
            else if (p === 23) {
                attr.bg &= ~67108864;
            }
            else if (p === 24) {
                attr.fg &= ~268435456;
                this._processUnderline(0, attr);
            }
            else if (p === 25) {
                attr.fg &= ~536870912;
            }
            else if (p === 27) {
                attr.fg &= ~67108864;
            }
            else if (p === 28) {
                attr.fg &= ~1073741824;
            }
            else if (p === 29) {
                attr.fg &= ~2147483648;
            }
            else if (p === 39) {
                attr.fg &= ~(50331648 | 16777215);
                attr.fg |= DEFAULT_ATTR_DATA.fg & (255 | 16777215);
            }
            else if (p === 49) {
                attr.bg &= ~(50331648 | 16777215);
                attr.bg |= DEFAULT_ATTR_DATA.bg & (255 | 16777215);
            }
            else if (p === 38 || p === 48 || p === 58) {
                i += this._extractColor(params, i, attr);
            }
            else if (p === 53) {
                attr.bg |= 1073741824;
            }
            else if (p === 55) {
                attr.bg &= ~1073741824;
            }
            else if (p === 59) {
                attr.extended = attr.extended.clone();
                attr.extended.underlineColor = -1;
                attr.updateExtended();
            }
            else if (p === 100) {
                attr.fg &= ~(50331648 | 16777215);
                attr.fg |= DEFAULT_ATTR_DATA.fg & (255 | 16777215);
                attr.bg &= ~(50331648 | 16777215);
                attr.bg |= DEFAULT_ATTR_DATA.bg & (255 | 16777215);
            }
            else {
                this._logService.debug('Unknown SGR attribute: %d.', p);
            }
        }
        return true;
    }
    deviceStatus(params) {
        switch (params.params[0]) {
            case 5:
                this._coreService.triggerDataEvent(`${C0.ESC}[0n`);
                break;
            case 6:
                const y = this._activeBuffer.y + 1;
                const x = this._activeBuffer.x + 1;
                this._coreService.triggerDataEvent(`${C0.ESC}[${y};${x}R`);
                break;
        }
        return true;
    }
    deviceStatusPrivate(params) {
        switch (params.params[0]) {
            case 6:
                const y = this._activeBuffer.y + 1;
                const x = this._activeBuffer.x + 1;
                this._coreService.triggerDataEvent(`${C0.ESC}[?${y};${x}R`);
                break;
        }
        return true;
    }
    softReset(params) {
        this._coreService.isCursorHidden = false;
        this._onRequestSyncScrollBar.fire();
        this._activeBuffer.scrollTop = 0;
        this._activeBuffer.scrollBottom = this._bufferService.rows - 1;
        this._curAttrData = DEFAULT_ATTR_DATA.clone();
        this._coreService.reset();
        this._charsetService.reset();
        this._activeBuffer.savedX = 0;
        this._activeBuffer.savedY = this._activeBuffer.ybase;
        this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg;
        this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg;
        this._activeBuffer.savedCharset = this._charsetService.charset;
        this._coreService.decPrivateModes.origin = false;
        return true;
    }
    setCursorStyle(params) {
        const param = params.params[0] || 1;
        switch (param) {
            case 1:
            case 2:
                this._optionsService.options.cursorStyle = 'block';
                break;
            case 3:
            case 4:
                this._optionsService.options.cursorStyle = 'underline';
                break;
            case 5:
            case 6:
                this._optionsService.options.cursorStyle = 'bar';
                break;
        }
        const isBlinking = param % 2 === 1;
        this._optionsService.options.cursorBlink = isBlinking;
        return true;
    }
    setScrollRegion(params) {
        const top = params.params[0] || 1;
        let bottom;
        if (params.length < 2 || (bottom = params.params[1]) > this._bufferService.rows || bottom === 0) {
            bottom = this._bufferService.rows;
        }
        if (bottom > top) {
            this._activeBuffer.scrollTop = top - 1;
            this._activeBuffer.scrollBottom = bottom - 1;
            this._setCursor(0, 0);
        }
        return true;
    }
    windowOptions(params) {
        if (!paramToWindowOption(params.params[0], this._optionsService.rawOptions.windowOptions)) {
            return true;
        }
        const second = (params.length > 1) ? params.params[1] : 0;
        switch (params.params[0]) {
            case 14:
                if (second !== 2) {
                    this._onRequestWindowsOptionsReport.fire(WindowsOptionsReportType.GET_WIN_SIZE_PIXELS);
                }
                break;
            case 16:
                this._onRequestWindowsOptionsReport.fire(WindowsOptionsReportType.GET_CELL_SIZE_PIXELS);
                break;
            case 18:
                if (this._bufferService) {
                    this._coreService.triggerDataEvent(`${C0.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`);
                }
                break;
            case 22:
                if (second === 0 || second === 2) {
                    this._windowTitleStack.push(this._windowTitle);
                    if (this._windowTitleStack.length > STACK_LIMIT) {
                        this._windowTitleStack.shift();
                    }
                }
                if (second === 0 || second === 1) {
                    this._iconNameStack.push(this._iconName);
                    if (this._iconNameStack.length > STACK_LIMIT) {
                        this._iconNameStack.shift();
                    }
                }
                break;
            case 23:
                if (second === 0 || second === 2) {
                    if (this._windowTitleStack.length) {
                        this.setTitle(this._windowTitleStack.pop());
                    }
                }
                if (second === 0 || second === 1) {
                    if (this._iconNameStack.length) {
                        this.setIconName(this._iconNameStack.pop());
                    }
                }
                break;
        }
        return true;
    }
    saveCursor(params) {
        this._activeBuffer.savedX = this._activeBuffer.x;
        this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y;
        this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg;
        this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg;
        this._activeBuffer.savedCharset = this._charsetService.charset;
        return true;
    }
    restoreCursor(params) {
        this._activeBuffer.x = this._activeBuffer.savedX || 0;
        this._activeBuffer.y = Math.max(this._activeBuffer.savedY - this._activeBuffer.ybase, 0);
        this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg;
        this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg;
        this._charsetService.charset = this._savedCharset;
        if (this._activeBuffer.savedCharset) {
            this._charsetService.charset = this._activeBuffer.savedCharset;
        }
        this._restrictCursor();
        return true;
    }
    setTitle(data) {
        this._windowTitle = data;
        this._onTitleChange.fire(data);
        return true;
    }
    setIconName(data) {
        this._iconName = data;
        return true;
    }
    setOrReportIndexedColor(data) {
        const event = [];
        const slots = data.split(';');
        while (slots.length > 1) {
            const idx = slots.shift();
            const spec = slots.shift();
            if (/^\d+$/.exec(idx)) {
                const index = parseInt(idx);
                if (isValidColorIndex(index)) {
                    if (spec === '?') {
                        event.push({ type: 0, index });
                    }
                    else {
                        const color = parseColor(spec);
                        if (color) {
                            event.push({ type: 1, index, color });
                        }
                    }
                }
            }
        }
        if (event.length) {
            this._onColor.fire(event);
        }
        return true;
    }
    setHyperlink(data) {
        const args = data.split(';');
        if (args.length < 2) {
            return false;
        }
        if (args[1]) {
            return this._createHyperlink(args[0], args[1]);
        }
        if (args[0]) {
            return false;
        }
        return this._finishHyperlink();
    }
    _createHyperlink(params, uri) {
        if (this._getCurrentLinkId()) {
            this._finishHyperlink();
        }
        const parsedParams = params.split(':');
        let id;
        const idParamIndex = parsedParams.findIndex(e => e.startsWith('id='));
        if (idParamIndex !== -1) {
            id = parsedParams[idParamIndex].slice(3) || undefined;
        }
        this._curAttrData.extended = this._curAttrData.extended.clone();
        this._curAttrData.extended.urlId = this._oscLinkService.registerLink({ id, uri });
        this._curAttrData.updateExtended();
        return true;
    }
    _finishHyperlink() {
        this._curAttrData.extended = this._curAttrData.extended.clone();
        this._curAttrData.extended.urlId = 0;
        this._curAttrData.updateExtended();
        return true;
    }
    _setOrReportSpecialColor(data, offset) {
        const slots = data.split(';');
        for (let i = 0; i < slots.length; ++i, ++offset) {
            if (offset >= this._specialColors.length)
                break;
            if (slots[i] === '?') {
                this._onColor.fire([{ type: 0, index: this._specialColors[offset] }]);
            }
            else {
                const color = parseColor(slots[i]);
                if (color) {
                    this._onColor.fire([{ type: 1, index: this._specialColors[offset], color }]);
                }
            }
        }
        return true;
    }
    setOrReportFgColor(data) {
        return this._setOrReportSpecialColor(data, 0);
    }
    setOrReportBgColor(data) {
        return this._setOrReportSpecialColor(data, 1);
    }
    setOrReportCursorColor(data) {
        return this._setOrReportSpecialColor(data, 2);
    }
    restoreIndexedColor(data) {
        if (!data) {
            this._onColor.fire([{ type: 2 }]);
            return true;
        }
        const event = [];
        const slots = data.split(';');
        for (let i = 0; i < slots.length; ++i) {
            if (/^\d+$/.exec(slots[i])) {
                const index = parseInt(slots[i]);
                if (isValidColorIndex(index)) {
                    event.push({ type: 2, index });
                }
            }
        }
        if (event.length) {
            this._onColor.fire(event);
        }
        return true;
    }
    restoreFgColor(data) {
        this._onColor.fire([{ type: 2, index: 256 }]);
        return true;
    }
    restoreBgColor(data) {
        this._onColor.fire([{ type: 2, index: 257 }]);
        return true;
    }
    restoreCursorColor(data) {
        this._onColor.fire([{ type: 2, index: 258 }]);
        return true;
    }
    nextLine() {
        this._activeBuffer.x = 0;
        this.index();
        return true;
    }
    keypadApplicationMode() {
        this._logService.debug('Serial port requested application keypad.');
        this._coreService.decPrivateModes.applicationKeypad = true;
        this._onRequestSyncScrollBar.fire();
        return true;
    }
    keypadNumericMode() {
        this._logService.debug('Switching back to normal keypad.');
        this._coreService.decPrivateModes.applicationKeypad = false;
        this._onRequestSyncScrollBar.fire();
        return true;
    }
    selectDefaultCharset() {
        this._charsetService.setgLevel(0);
        this._charsetService.setgCharset(0, DEFAULT_CHARSET);
        return true;
    }
    selectCharset(collectAndFlag) {
        if (collectAndFlag.length !== 2) {
            this.selectDefaultCharset();
            return true;
        }
        if (collectAndFlag[0] === '/') {
            return true;
        }
        this._charsetService.setgCharset(GLEVEL[collectAndFlag[0]], CHARSETS[collectAndFlag[1]] || DEFAULT_CHARSET);
        return true;
    }
    index() {
        this._restrictCursor();
        this._activeBuffer.y++;
        if (this._activeBuffer.y === this._activeBuffer.scrollBottom + 1) {
            this._activeBuffer.y--;
            this._bufferService.scroll(this._eraseAttrData());
        }
        else if (this._activeBuffer.y >= this._bufferService.rows) {
            this._activeBuffer.y = this._bufferService.rows - 1;
        }
        this._restrictCursor();
        return true;
    }
    tabSet() {
        this._activeBuffer.tabs[this._activeBuffer.x] = true;
        return true;
    }
    reverseIndex() {
        this._restrictCursor();
        if (this._activeBuffer.y === this._activeBuffer.scrollTop) {
            const scrollRegionHeight = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
            this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase + this._activeBuffer.y, scrollRegionHeight, 1);
            this._activeBuffer.lines.set(this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.getBlankLine(this._eraseAttrData()));
            this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
        }
        else {
            this._activeBuffer.y--;
            this._restrictCursor();
        }
        return true;
    }
    fullReset() {
        this._parser.reset();
        this._onRequestReset.fire();
        return true;
    }
    reset() {
        this._curAttrData = DEFAULT_ATTR_DATA.clone();
        this._eraseAttrDataInternal = DEFAULT_ATTR_DATA.clone();
    }
    _eraseAttrData() {
        this._eraseAttrDataInternal.bg &= ~(50331648 | 0xFFFFFF);
        this._eraseAttrDataInternal.bg |= this._curAttrData.bg & ~0xFC000000;
        return this._eraseAttrDataInternal;
    }
    setgLevel(level) {
        this._charsetService.setgLevel(level);
        return true;
    }
    screenAlignmentPattern() {
        const cell = new CellData();
        cell.content = 1 << 22 | 'E'.charCodeAt(0);
        cell.fg = this._curAttrData.fg;
        cell.bg = this._curAttrData.bg;
        this._setCursor(0, 0);
        for (let yOffset = 0; yOffset < this._bufferService.rows; ++yOffset) {
            const row = this._activeBuffer.ybase + this._activeBuffer.y + yOffset;
            const line = this._activeBuffer.lines.get(row);
            if (line) {
                line.fill(cell);
                line.isWrapped = false;
            }
        }
        this._dirtyRowTracker.markAllDirty();
        this._setCursor(0, 0);
        return true;
    }
    requestStatusString(data, params) {
        const f = (s) => {
            this._coreService.triggerDataEvent(`${C0.ESC}${s}${C0.ESC}\\`);
            return true;
        };
        const b = this._bufferService.buffer;
        const opts = this._optionsService.rawOptions;
        const STYLES = { 'block': 2, 'underline': 4, 'bar': 6 };
        if (data === '"q')
            return f(`P1$r${this._curAttrData.isProtected() ? 1 : 0}"q`);
        if (data === '"p')
            return f(`P1$r61;1"p`);
        if (data === 'r')
            return f(`P1$r${b.scrollTop + 1};${b.scrollBottom + 1}r`);
        if (data === 'm')
            return f(`P1$r0m`);
        if (data === ' q')
            return f(`P1$r${STYLES[opts.cursorStyle] - (opts.cursorBlink ? 1 : 0)} q`);
        return f(`P0$r`);
    }
    markRangeDirty(y1, y2) {
        this._dirtyRowTracker.markRangeDirty(y1, y2);
    }
}
let DirtyRowTracker = class DirtyRowTracker {
    constructor(_bufferService) {
        this._bufferService = _bufferService;
        this.clearRange();
    }
    clearRange() {
        this.start = this._bufferService.buffer.y;
        this.end = this._bufferService.buffer.y;
    }
    markDirty(y) {
        if (y < this.start) {
            this.start = y;
        }
        else if (y > this.end) {
            this.end = y;
        }
    }
    markRangeDirty(y1, y2) {
        if (y1 > y2) {
            $temp = y1;
            y1 = y2;
            y2 = $temp;
        }
        if (y1 < this.start) {
            this.start = y1;
        }
        if (y2 > this.end) {
            this.end = y2;
        }
    }
    markAllDirty() {
        this.markRangeDirty(0, this._bufferService.rows - 1);
    }
};
DirtyRowTracker = __decorate([
    __param(0, IBufferService),
    __metadata("design:paramtypes", [Object])
], DirtyRowTracker);
function isValidColorIndex(value) {
    return 0 <= value && value < 256;
}

const DISCARD_WATERMARK = 50000000;
const WRITE_TIMEOUT_MS = 12;
const WRITE_BUFFER_LENGTH_THRESHOLD = 50;
class WriteBuffer extends Disposable {
    constructor(_action) {
        super();
        this._action = _action;
        this._writeBuffer = [];
        this._callbacks = [];
        this._pendingData = 0;
        this._bufferOffset = 0;
        this._isSyncWriting = false;
        this._syncCalls = 0;
        this._didUserInput = false;
        this._onWriteParsed = this.register(new EventEmitter());
        this.onWriteParsed = this._onWriteParsed.event;
    }
    handleUserInput() {
        this._didUserInput = true;
    }
    writeSync(data, maxSubsequentCalls) {
        if (maxSubsequentCalls !== undefined && this._syncCalls > maxSubsequentCalls) {
            this._syncCalls = 0;
            return;
        }
        this._pendingData += data.length;
        this._writeBuffer.push(data);
        this._callbacks.push(undefined);
        this._syncCalls++;
        if (this._isSyncWriting) {
            return;
        }
        this._isSyncWriting = true;
        let chunk;
        while (chunk = this._writeBuffer.shift()) {
            this._action(chunk);
            const cb = this._callbacks.shift();
            if (cb)
                cb();
        }
        this._pendingData = 0;
        this._bufferOffset = 0x7FFFFFFF;
        this._isSyncWriting = false;
        this._syncCalls = 0;
    }
    write(data, callback) {
        if (this._pendingData > DISCARD_WATERMARK) {
            throw new Error('write data discarded, use flow control to avoid losing data');
        }
        if (!this._writeBuffer.length) {
            this._bufferOffset = 0;
            if (this._didUserInput) {
                this._didUserInput = false;
                this._pendingData += data.length;
                this._writeBuffer.push(data);
                this._callbacks.push(callback);
                this._innerWrite();
                return;
            }
            setTimeout(() => this._innerWrite());
        }
        this._pendingData += data.length;
        this._writeBuffer.push(data);
        this._callbacks.push(callback);
    }
    _innerWrite(lastTime = 0, promiseResult = true) {
        const startTime = lastTime || Date.now();
        while (this._writeBuffer.length > this._bufferOffset) {
            const data = this._writeBuffer[this._bufferOffset];
            const result = this._action(data, promiseResult);
            if (result) {
                const continuation = (r) => Date.now() - startTime >= WRITE_TIMEOUT_MS
                    ? setTimeout(() => this._innerWrite(0, r))
                    : this._innerWrite(startTime, r);
                result.catch(err => {
                    queueMicrotask(() => { throw err; });
                    return Promise.resolve(false);
                }).then(continuation);
                return;
            }
            const cb = this._callbacks[this._bufferOffset];
            if (cb)
                cb();
            this._bufferOffset++;
            this._pendingData -= data.length;
            if (Date.now() - startTime >= WRITE_TIMEOUT_MS) {
                break;
            }
        }
        if (this._writeBuffer.length > this._bufferOffset) {
            if (this._bufferOffset > WRITE_BUFFER_LENGTH_THRESHOLD) {
                this._writeBuffer = this._writeBuffer.slice(this._bufferOffset);
                this._callbacks = this._callbacks.slice(this._bufferOffset);
                this._bufferOffset = 0;
            }
            setTimeout(() => this._innerWrite());
        }
        else {
            this._writeBuffer.length = 0;
            this._callbacks.length = 0;
            this._pendingData = 0;
            this._bufferOffset = 0;
        }
        this._onWriteParsed.fire();
    }
}

let OscLinkService = class OscLinkService {
    constructor(_bufferService) {
        this._bufferService = _bufferService;
        this._nextId = 1;
        this._entriesWithId = new Map();
        this._dataByLinkId = new Map();
    }
    registerLink(data) {
        const buffer = this._bufferService.buffer;
        if (data.id === undefined) {
            const marker = buffer.addMarker(buffer.ybase + buffer.y);
            const entry = {
                data,
                id: this._nextId++,
                lines: [marker]
            };
            marker.onDispose(() => this._removeMarkerFromLink(entry, marker));
            this._dataByLinkId.set(entry.id, entry);
            return entry.id;
        }
        const castData = data;
        const key = this._getEntryIdKey(castData);
        const match = this._entriesWithId.get(key);
        if (match) {
            this.addLineToLink(match.id, buffer.ybase + buffer.y);
            return match.id;
        }
        const marker = buffer.addMarker(buffer.ybase + buffer.y);
        const entry = {
            id: this._nextId++,
            key: this._getEntryIdKey(castData),
            data: castData,
            lines: [marker]
        };
        marker.onDispose(() => this._removeMarkerFromLink(entry, marker));
        this._entriesWithId.set(entry.key, entry);
        this._dataByLinkId.set(entry.id, entry);
        return entry.id;
    }
    addLineToLink(linkId, y) {
        const entry = this._dataByLinkId.get(linkId);
        if (!entry) {
            return;
        }
        if (entry.lines.every(e => e.line !== y)) {
            const marker = this._bufferService.buffer.addMarker(y);
            entry.lines.push(marker);
            marker.onDispose(() => this._removeMarkerFromLink(entry, marker));
        }
    }
    getLinkData(linkId) {
        var _a;
        return (_a = this._dataByLinkId.get(linkId)) === null || _a === void 0 ? void 0 : _a.data;
    }
    _getEntryIdKey(linkData) {
        return `${linkData.id};;${linkData.uri}`;
    }
    _removeMarkerFromLink(entry, marker) {
        const index = entry.lines.indexOf(marker);
        if (index === -1) {
            return;
        }
        entry.lines.splice(index, 1);
        if (entry.lines.length === 0) {
            if (entry.data.id !== undefined) {
                this._entriesWithId.delete(entry.key);
            }
            this._dataByLinkId.delete(entry.id);
        }
    }
};
OscLinkService = __decorate([
    __param(0, IBufferService),
    __metadata("design:paramtypes", [Object])
], OscLinkService);

let hasWriteSyncWarnHappened = false;
class CoreTerminal extends Disposable {
    get onScroll() {
        if (!this._onScrollApi) {
            this._onScrollApi = this.register(new EventEmitter());
            this._onScroll.event(ev => {
                var _a;
                (_a = this._onScrollApi) === null || _a === void 0 ? void 0 : _a.fire(ev.position);
            });
        }
        return this._onScrollApi.event;
    }
    get cols() { return this._bufferService.cols; }
    get rows() { return this._bufferService.rows; }
    get buffers() { return this._bufferService.buffers; }
    get options() { return this.optionsService.options; }
    set options(options) {
        for (const key in options) {
            this.optionsService.options[key] = options[key];
        }
    }
    constructor(options) {
        super();
        this._windowsWrappingHeuristics = this.register(new MutableDisposable());
        this._onBinary = this.register(new EventEmitter());
        this.onBinary = this._onBinary.event;
        this._onData = this.register(new EventEmitter());
        this.onData = this._onData.event;
        this._onLineFeed = this.register(new EventEmitter());
        this.onLineFeed = this._onLineFeed.event;
        this._onResize = this.register(new EventEmitter());
        this.onResize = this._onResize.event;
        this._onWriteParsed = this.register(new EventEmitter());
        this.onWriteParsed = this._onWriteParsed.event;
        this._onScroll = this.register(new EventEmitter());
        this._instantiationService = new InstantiationService();
        this.optionsService = this.register(new OptionsService(options));
        this._instantiationService.setService(IOptionsService, this.optionsService);
        this._bufferService = this.register(this._instantiationService.createInstance(BufferService));
        this._instantiationService.setService(IBufferService, this._bufferService);
        this._logService = this.register(this._instantiationService.createInstance(LogService));
        this._instantiationService.setService(ILogService, this._logService);
        this.coreService = this.register(this._instantiationService.createInstance(CoreService));
        this._instantiationService.setService(ICoreService, this.coreService);
        this.coreMouseService = this.register(this._instantiationService.createInstance(CoreMouseService));
        this._instantiationService.setService(ICoreMouseService, this.coreMouseService);
        this.unicodeService = this.register(this._instantiationService.createInstance(UnicodeService));
        this._instantiationService.setService(IUnicodeService, this.unicodeService);
        this._charsetService = this._instantiationService.createInstance(CharsetService);
        this._instantiationService.setService(ICharsetService, this._charsetService);
        this._oscLinkService = this._instantiationService.createInstance(OscLinkService);
        this._instantiationService.setService(IOscLinkService, this._oscLinkService);
        this._inputHandler = this.register(new InputHandler(this._bufferService, this._charsetService, this.coreService, this._logService, this.optionsService, this._oscLinkService, this.coreMouseService, this.unicodeService));
        this.register(forwardEvent(this._inputHandler.onLineFeed, this._onLineFeed));
        this.register(this._inputHandler);
        this.register(forwardEvent(this._bufferService.onResize, this._onResize));
        this.register(forwardEvent(this.coreService.onData, this._onData));
        this.register(forwardEvent(this.coreService.onBinary, this._onBinary));
        this.register(this.coreService.onRequestScrollToBottom(() => this.scrollToBottom()));
        this.register(this.coreService.onUserInput(() => this._writeBuffer.handleUserInput()));
        this.register(this.optionsService.onMultipleOptionChange(['windowsMode', 'windowsPty'], () => this._handleWindowsPtyOptionChange()));
        this.register(this._bufferService.onScroll(event => {
            this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 });
            this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
        }));
        this.register(this._inputHandler.onScroll(event => {
            this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 });
            this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
        }));
        this._writeBuffer = this.register(new WriteBuffer((data, promiseResult) => this._inputHandler.parse(data, promiseResult)));
        this.register(forwardEvent(this._writeBuffer.onWriteParsed, this._onWriteParsed));
    }
    write(data, callback) {
        this._writeBuffer.write(data, callback);
    }
    writeSync(data, maxSubsequentCalls) {
        if (this._logService.logLevel <= LogLevelEnum.WARN && !hasWriteSyncWarnHappened) {
            this._logService.warn('writeSync is unreliable and will be removed soon.');
            hasWriteSyncWarnHappened = true;
        }
        this._writeBuffer.writeSync(data, maxSubsequentCalls);
    }
    resize(x, y) {
        if (isNaN(x) || isNaN(y)) {
            return;
        }
        x = Math.max(x, MINIMUM_COLS);
        y = Math.max(y, MINIMUM_ROWS);
        this._bufferService.resize(x, y);
    }
    scroll(eraseAttr, isWrapped = false) {
        this._bufferService.scroll(eraseAttr, isWrapped);
    }
    scrollLines(disp, suppressScrollEvent, source) {
        this._bufferService.scrollLines(disp, suppressScrollEvent, source);
    }
    scrollPages(pageCount) {
        this.scrollLines(pageCount * (this.rows - 1));
    }
    scrollToTop() {
        this.scrollLines(-this._bufferService.buffer.ydisp);
    }
    scrollToBottom() {
        this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
    }
    scrollToLine(line) {
        const scrollAmount = line - this._bufferService.buffer.ydisp;
        if (scrollAmount !== 0) {
            this.scrollLines(scrollAmount);
        }
    }
    registerEscHandler(id, callback) {
        return this._inputHandler.registerEscHandler(id, callback);
    }
    registerDcsHandler(id, callback) {
        return this._inputHandler.registerDcsHandler(id, callback);
    }
    registerCsiHandler(id, callback) {
        return this._inputHandler.registerCsiHandler(id, callback);
    }
    registerOscHandler(ident, callback) {
        return this._inputHandler.registerOscHandler(ident, callback);
    }
    _setup() {
        this._handleWindowsPtyOptionChange();
    }
    reset() {
        this._inputHandler.reset();
        this._bufferService.reset();
        this._charsetService.reset();
        this.coreService.reset();
        this.coreMouseService.reset();
    }
    _handleWindowsPtyOptionChange() {
        let value = false;
        const windowsPty = this.optionsService.rawOptions.windowsPty;
        if (windowsPty && windowsPty.buildNumber !== undefined && windowsPty.buildNumber !== undefined) {
            value = !!(windowsPty.backend === 'conpty' && windowsPty.buildNumber < 21376);
        }
        else if (this.optionsService.rawOptions.windowsMode) {
            value = true;
        }
        if (value) {
            this._enableWindowsWrappingHeuristics();
        }
        else {
            this._windowsWrappingHeuristics.clear();
        }
    }
    _enableWindowsWrappingHeuristics() {
        if (!this._windowsWrappingHeuristics.value) {
            const disposables = [];
            disposables.push(this.onLineFeed(updateWindowsModeWrappedState.bind(null, this._bufferService)));
            disposables.push(this.registerCsiHandler({ final: 'H' }, () => {
                updateWindowsModeWrappedState(this._bufferService);
                return false;
            }));
            this._windowsWrappingHeuristics.value = toDisposable(() => {
                for (const d of disposables) {
                    d.dispose();
                }
            });
        }
    }
}

let Terminal$1 = class Terminal extends CoreTerminal {
    constructor(options = {}) {
        super(options);
        this._onBell = this.register(new EventEmitter());
        this.onBell = this._onBell.event;
        this._onCursorMove = this.register(new EventEmitter());
        this.onCursorMove = this._onCursorMove.event;
        this._onTitleChange = this.register(new EventEmitter());
        this.onTitleChange = this._onTitleChange.event;
        this._onA11yCharEmitter = this.register(new EventEmitter());
        this.onA11yChar = this._onA11yCharEmitter.event;
        this._onA11yTabEmitter = this.register(new EventEmitter());
        this.onA11yTab = this._onA11yTabEmitter.event;
        this._setup();
        this.register(this._inputHandler.onRequestBell(() => this.bell()));
        this.register(this._inputHandler.onRequestReset(() => this.reset()));
        this.register(forwardEvent(this._inputHandler.onCursorMove, this._onCursorMove));
        this.register(forwardEvent(this._inputHandler.onTitleChange, this._onTitleChange));
        this.register(forwardEvent(this._inputHandler.onA11yChar, this._onA11yCharEmitter));
        this.register(forwardEvent(this._inputHandler.onA11yTab, this._onA11yTabEmitter));
    }
    get buffer() {
        return this.buffers.active;
    }
    get markers() {
        return this.buffer.markers;
    }
    addMarker(cursorYOffset) {
        if (this.buffer !== this.buffers.normal) {
            return;
        }
        return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + cursorYOffset);
    }
    bell() {
        this._onBell.fire();
    }
    resize(x, y) {
        if (x === this.cols && y === this.rows) {
            return;
        }
        super.resize(x, y);
    }
    clear() {
        if (this.buffer.ybase === 0 && this.buffer.y === 0) {
            return;
        }
        this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y));
        this.buffer.lines.length = 1;
        this.buffer.ydisp = 0;
        this.buffer.ybase = 0;
        this.buffer.y = 0;
        for (let i = 1; i < this.rows; i++) {
            this.buffer.lines.push(this.buffer.getBlankLine(DEFAULT_ATTR_DATA));
        }
        this._onScroll.fire({ position: this.buffer.ydisp, source: 0 });
    }
    reset() {
        this.options.rows = this.rows;
        this.options.cols = this.cols;
        this._setup();
        super.reset();
    }
};

class AddonManager {
    constructor() {
        this._addons = [];
    }
    dispose() {
        for (let i = this._addons.length - 1; i >= 0; i--) {
            this._addons[i].instance.dispose();
        }
    }
    loadAddon(terminal, instance) {
        const loadedAddon = {
            instance,
            dispose: instance.dispose,
            isDisposed: false
        };
        this._addons.push(loadedAddon);
        instance.dispose = () => this._wrappedAddonDispose(loadedAddon);
        instance.activate(terminal);
    }
    _wrappedAddonDispose(loadedAddon) {
        if (loadedAddon.isDisposed) {
            return;
        }
        let index = -1;
        for (let i = 0; i < this._addons.length; i++) {
            if (this._addons[i] === loadedAddon) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            throw new Error('Could not dispose an addon that has not been loaded');
        }
        loadedAddon.isDisposed = true;
        loadedAddon.dispose.apply(loadedAddon.instance);
        this._addons.splice(index, 1);
    }
}

const CONSTRUCTOR_ONLY_OPTIONS = ['cols', 'rows'];
class Terminal extends Disposable {
    constructor(options) {
        super();
        this._core = this.register(new Terminal$1(options));
        this._addonManager = this.register(new AddonManager());
        this._publicOptions = Object.assign({}, this._core.options);
        const getter = (propName) => {
            return this._core.options[propName];
        };
        const setter = (propName, value) => {
            this._checkReadonlyOptions(propName);
            this._core.options[propName] = value;
        };
        for (const propName in this._core.options) {
            Object.defineProperty(this._publicOptions, propName, {
                get: () => {
                    return this._core.options[propName];
                },
                set: (value) => {
                    this._checkReadonlyOptions(propName);
                    this._core.options[propName] = value;
                }
            });
            const desc = {
                get: getter.bind(this, propName),
                set: setter.bind(this, propName)
            };
            Object.defineProperty(this._publicOptions, propName, desc);
        }
    }
    _checkReadonlyOptions(propName) {
        if (CONSTRUCTOR_ONLY_OPTIONS.includes(propName)) {
            throw new Error(`Option "${propName}" can only be set in the constructor`);
        }
    }
    _checkProposedApi() {
        if (!this._core.optionsService.options.allowProposedApi) {
            throw new Error('You must set the allowProposedApi option to true to use proposed API');
        }
    }
    get onBell() { return this._core.onBell; }
    get onBinary() { return this._core.onBinary; }
    get onCursorMove() { return this._core.onCursorMove; }
    get onData() { return this._core.onData; }
    get onLineFeed() { return this._core.onLineFeed; }
    get onResize() { return this._core.onResize; }
    get onScroll() { return this._core.onScroll; }
    get onTitleChange() { return this._core.onTitleChange; }
    get parser() {
        this._checkProposedApi();
        if (!this._parser) {
            this._parser = new ParserApi(this._core);
        }
        return this._parser;
    }
    get unicode() {
        this._checkProposedApi();
        return new UnicodeApi(this._core);
    }
    get rows() { return this._core.rows; }
    get cols() { return this._core.cols; }
    get buffer() {
        this._checkProposedApi();
        if (!this._buffer) {
            this._buffer = this.register(new BufferNamespaceApi(this._core));
        }
        return this._buffer;
    }
    get markers() {
        this._checkProposedApi();
        return this._core.markers;
    }
    get modes() {
        const m = this._core.coreService.decPrivateModes;
        let mouseTrackingMode = 'none';
        switch (this._core.coreMouseService.activeProtocol) {
            case 'X10':
                mouseTrackingMode = 'x10';
                break;
            case 'VT200':
                mouseTrackingMode = 'vt200';
                break;
            case 'DRAG':
                mouseTrackingMode = 'drag';
                break;
            case 'ANY':
                mouseTrackingMode = 'any';
                break;
        }
        return {
            applicationCursorKeysMode: m.applicationCursorKeys,
            applicationKeypadMode: m.applicationKeypad,
            bracketedPasteMode: m.bracketedPasteMode,
            insertMode: this._core.coreService.modes.insertMode,
            mouseTrackingMode: mouseTrackingMode,
            originMode: m.origin,
            reverseWraparoundMode: m.reverseWraparound,
            sendFocusMode: m.sendFocus,
            wraparoundMode: m.wraparound
        };
    }
    get options() {
        return this._publicOptions;
    }
    set options(options) {
        for (const propName in options) {
            this._publicOptions[propName] = options[propName];
        }
    }
    resize(columns, rows) {
        this._verifyIntegers(columns, rows);
        this._core.resize(columns, rows);
    }
    registerMarker(cursorYOffset = 0) {
        this._checkProposedApi();
        this._verifyIntegers(cursorYOffset);
        return this._core.addMarker(cursorYOffset);
    }
    addMarker(cursorYOffset) {
        return this.registerMarker(cursorYOffset);
    }
    dispose() {
        super.dispose();
    }
    scrollLines(amount) {
        this._verifyIntegers(amount);
        this._core.scrollLines(amount);
    }
    scrollPages(pageCount) {
        this._verifyIntegers(pageCount);
        this._core.scrollPages(pageCount);
    }
    scrollToTop() {
        this._core.scrollToTop();
    }
    scrollToBottom() {
        this._core.scrollToBottom();
    }
    scrollToLine(line) {
        this._verifyIntegers(line);
        this._core.scrollToLine(line);
    }
    clear() {
        this._core.clear();
    }
    write(data, callback) {
        this._core.write(data, callback);
    }
    writeln(data, callback) {
        this._core.write(data);
        this._core.write('\r\n', callback);
    }
    reset() {
        this._core.reset();
    }
    loadAddon(addon) {
        this._addonManager.loadAddon(this, addon);
    }
    _verifyIntegers(...values) {
        for (const value of values) {
            if (value === Infinity || isNaN(value) || value % 1 !== 0) {
                throw new Error('This API only accepts integers');
            }
        }
    }
}

export { Terminal };
//# sourceMappingURL=xterm-headless.mjs.map
