let promptLabel = 'Terminal input';
let tooMuchOutput = 'Too much output to announce, navigate to rows manually to read';

var Strings = /*#__PURE__*/Object.freeze({
    __proto__: null,
    promptLabel: promptLabel,
    tooMuchOutput: tooMuchOutput
});

function prepareTextForTerminal(text) {
    return text.replace(/\r?\n/g, '\r');
}
function bracketTextForPaste(text, bracketedPasteMode) {
    if (bracketedPasteMode) {
        return '\x1b[200~' + text + '\x1b[201~';
    }
    return text;
}
function copyHandler(ev, selectionService) {
    if (ev.clipboardData) {
        ev.clipboardData.setData('text/plain', selectionService.selectionText);
    }
    ev.preventDefault();
}
function handlePasteEvent(ev, textarea, coreService, optionsService) {
    ev.stopPropagation();
    if (ev.clipboardData) {
        const text = ev.clipboardData.getData('text/plain');
        paste(text, textarea, coreService, optionsService);
    }
}
function paste(text, textarea, coreService, optionsService) {
    text = prepareTextForTerminal(text);
    text = bracketTextForPaste(text, coreService.decPrivateModes.bracketedPasteMode && optionsService.rawOptions.ignoreBracketedPasteMode !== true);
    coreService.triggerDataEvent(text, true);
    textarea.value = '';
}
function moveTextAreaUnderMouseCursor(ev, textarea, screenElement) {
    const pos = screenElement.getBoundingClientRect();
    const left = ev.clientX - pos.left - 10;
    const top = ev.clientY - pos.top - 10;
    textarea.style.width = '20px';
    textarea.style.height = '20px';
    textarea.style.left = `${left}px`;
    textarea.style.top = `${top}px`;
    textarea.style.zIndex = '1000';
    textarea.focus();
}
function rightClickHandler(ev, textarea, screenElement, selectionService, shouldSelectWord) {
    moveTextAreaUnderMouseCursor(ev, textarea, screenElement);
    if (shouldSelectWord) {
        selectionService.rightClickSelect(ev);
    }
    textarea.value = selectionService.selectionText;
    textarea.select();
}

function addDisposableDomListener(node, type, handler, options) {
    node.addEventListener(type, handler, options);
    let disposed = false;
    return {
        dispose: () => {
            if (disposed) {
                return;
            }
            disposed = true;
            node.removeEventListener(type, handler, options);
        }
    };
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
function getDisposeArrayDisposable(array) {
    return { dispose: () => disposeArray(array) };
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
const IDecorationService = createDecorator('DecorationService');

let Linkifier2 = class Linkifier2 extends Disposable {
    get currentLink() { return this._currentLink; }
    constructor(_bufferService) {
        super();
        this._bufferService = _bufferService;
        this._linkProviders = [];
        this._linkCacheDisposables = [];
        this._isMouseOut = true;
        this._wasResized = false;
        this._activeLine = -1;
        this._onShowLinkUnderline = this.register(new EventEmitter());
        this.onShowLinkUnderline = this._onShowLinkUnderline.event;
        this._onHideLinkUnderline = this.register(new EventEmitter());
        this.onHideLinkUnderline = this._onHideLinkUnderline.event;
        this.register(getDisposeArrayDisposable(this._linkCacheDisposables));
        this.register(toDisposable(() => {
            var _a;
            this._lastMouseEvent = undefined;
            this._linkProviders.length = 0;
            (_a = this._activeProviderReplies) === null || _a === void 0 ? void 0 : _a.clear();
        }));
        this.register(this._bufferService.onResize(() => {
            this._clearCurrentLink();
            this._wasResized = true;
        }));
    }
    registerLinkProvider(linkProvider) {
        this._linkProviders.push(linkProvider);
        return {
            dispose: () => {
                const providerIndex = this._linkProviders.indexOf(linkProvider);
                if (providerIndex !== -1) {
                    this._linkProviders.splice(providerIndex, 1);
                }
            }
        };
    }
    attachToDom(element, mouseService, renderService) {
        this._element = element;
        this._mouseService = mouseService;
        this._renderService = renderService;
        this.register(addDisposableDomListener(this._element, 'mouseleave', () => {
            this._isMouseOut = true;
            this._clearCurrentLink();
        }));
        this.register(addDisposableDomListener(this._element, 'mousemove', this._handleMouseMove.bind(this)));
        this.register(addDisposableDomListener(this._element, 'mousedown', this._handleMouseDown.bind(this)));
        this.register(addDisposableDomListener(this._element, 'mouseup', this._handleMouseUp.bind(this)));
    }
    _handleMouseMove(event) {
        this._lastMouseEvent = event;
        if (!this._element || !this._mouseService) {
            return;
        }
        const position = this._positionFromMouseEvent(event, this._element, this._mouseService);
        if (!position) {
            return;
        }
        this._isMouseOut = false;
        const composedPath = event.composedPath();
        for (let i = 0; i < composedPath.length; i++) {
            const target = composedPath[i];
            if (target.classList.contains('xterm')) {
                break;
            }
            if (target.classList.contains('xterm-hover')) {
                return;
            }
        }
        if (!this._lastBufferCell || (position.x !== this._lastBufferCell.x || position.y !== this._lastBufferCell.y)) {
            this._handleHover(position);
            this._lastBufferCell = position;
        }
    }
    _handleHover(position) {
        if (this._activeLine !== position.y || this._wasResized) {
            this._clearCurrentLink();
            this._askForLink(position, false);
            this._wasResized = false;
            return;
        }
        const isCurrentLinkInPosition = this._currentLink && this._linkAtPosition(this._currentLink.link, position);
        if (!isCurrentLinkInPosition) {
            this._clearCurrentLink();
            this._askForLink(position, true);
        }
    }
    _askForLink(position, useLineCache) {
        var _a, _b;
        if (!this._activeProviderReplies || !useLineCache) {
            (_a = this._activeProviderReplies) === null || _a === void 0 ? void 0 : _a.forEach(reply => {
                reply === null || reply === void 0 ? void 0 : reply.forEach(linkWithState => {
                    if (linkWithState.link.dispose) {
                        linkWithState.link.dispose();
                    }
                });
            });
            this._activeProviderReplies = new Map();
            this._activeLine = position.y;
        }
        let linkProvided = false;
        for (const [i, linkProvider] of this._linkProviders.entries()) {
            if (useLineCache) {
                const existingReply = (_b = this._activeProviderReplies) === null || _b === void 0 ? void 0 : _b.get(i);
                if (existingReply) {
                    linkProvided = this._checkLinkProviderResult(i, position, linkProvided);
                }
            }
            else {
                linkProvider.provideLinks(position.y, (links) => {
                    var _a, _b;
                    if (this._isMouseOut) {
                        return;
                    }
                    const linksWithState = links === null || links === void 0 ? void 0 : links.map(link => ({ link }));
                    (_a = this._activeProviderReplies) === null || _a === void 0 ? void 0 : _a.set(i, linksWithState);
                    linkProvided = this._checkLinkProviderResult(i, position, linkProvided);
                    if (((_b = this._activeProviderReplies) === null || _b === void 0 ? void 0 : _b.size) === this._linkProviders.length) {
                        this._removeIntersectingLinks(position.y, this._activeProviderReplies);
                    }
                });
            }
        }
    }
    _removeIntersectingLinks(y, replies) {
        const occupiedCells = new Set();
        for (let i = 0; i < replies.size; i++) {
            const providerReply = replies.get(i);
            if (!providerReply) {
                continue;
            }
            for (let i = 0; i < providerReply.length; i++) {
                const linkWithState = providerReply[i];
                const startX = linkWithState.link.range.start.y < y ? 0 : linkWithState.link.range.start.x;
                const endX = linkWithState.link.range.end.y > y ? this._bufferService.cols : linkWithState.link.range.end.x;
                for (let x = startX; x <= endX; x++) {
                    if (occupiedCells.has(x)) {
                        providerReply.splice(i--, 1);
                        break;
                    }
                    occupiedCells.add(x);
                }
            }
        }
    }
    _checkLinkProviderResult(index, position, linkProvided) {
        var _a;
        if (!this._activeProviderReplies) {
            return linkProvided;
        }
        const links = this._activeProviderReplies.get(index);
        let hasLinkBefore = false;
        for (let j = 0; j < index; j++) {
            if (!this._activeProviderReplies.has(j) || this._activeProviderReplies.get(j)) {
                hasLinkBefore = true;
            }
        }
        if (!hasLinkBefore && links) {
            const linkAtPosition = links.find(link => this._linkAtPosition(link.link, position));
            if (linkAtPosition) {
                linkProvided = true;
                this._handleNewLink(linkAtPosition);
            }
        }
        if (this._activeProviderReplies.size === this._linkProviders.length && !linkProvided) {
            for (let j = 0; j < this._activeProviderReplies.size; j++) {
                const currentLink = (_a = this._activeProviderReplies.get(j)) === null || _a === void 0 ? void 0 : _a.find(link => this._linkAtPosition(link.link, position));
                if (currentLink) {
                    linkProvided = true;
                    this._handleNewLink(currentLink);
                    break;
                }
            }
        }
        return linkProvided;
    }
    _handleMouseDown() {
        this._mouseDownLink = this._currentLink;
    }
    _handleMouseUp(event) {
        if (!this._element || !this._mouseService || !this._currentLink) {
            return;
        }
        const position = this._positionFromMouseEvent(event, this._element, this._mouseService);
        if (!position) {
            return;
        }
        if (this._mouseDownLink === this._currentLink && this._linkAtPosition(this._currentLink.link, position)) {
            this._currentLink.link.activate(event, this._currentLink.link.text);
        }
    }
    _clearCurrentLink(startRow, endRow) {
        if (!this._element || !this._currentLink || !this._lastMouseEvent) {
            return;
        }
        if (!startRow || !endRow || (this._currentLink.link.range.start.y >= startRow && this._currentLink.link.range.end.y <= endRow)) {
            this._linkLeave(this._element, this._currentLink.link, this._lastMouseEvent);
            this._currentLink = undefined;
            disposeArray(this._linkCacheDisposables);
        }
    }
    _handleNewLink(linkWithState) {
        if (!this._element || !this._lastMouseEvent || !this._mouseService) {
            return;
        }
        const position = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
        if (!position) {
            return;
        }
        if (this._linkAtPosition(linkWithState.link, position)) {
            this._currentLink = linkWithState;
            this._currentLink.state = {
                decorations: {
                    underline: linkWithState.link.decorations === undefined ? true : linkWithState.link.decorations.underline,
                    pointerCursor: linkWithState.link.decorations === undefined ? true : linkWithState.link.decorations.pointerCursor
                },
                isHovered: true
            };
            this._linkHover(this._element, linkWithState.link, this._lastMouseEvent);
            linkWithState.link.decorations = {};
            Object.defineProperties(linkWithState.link.decorations, {
                pointerCursor: {
                    get: () => { var _a, _b; return (_b = (_a = this._currentLink) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.decorations.pointerCursor; },
                    set: v => {
                        var _a, _b;
                        if (((_a = this._currentLink) === null || _a === void 0 ? void 0 : _a.state) && this._currentLink.state.decorations.pointerCursor !== v) {
                            this._currentLink.state.decorations.pointerCursor = v;
                            if (this._currentLink.state.isHovered) {
                                (_b = this._element) === null || _b === void 0 ? void 0 : _b.classList.toggle('xterm-cursor-pointer', v);
                            }
                        }
                    }
                },
                underline: {
                    get: () => { var _a, _b; return (_b = (_a = this._currentLink) === null || _a === void 0 ? void 0 : _a.state) === null || _b === void 0 ? void 0 : _b.decorations.underline; },
                    set: v => {
                        var _a, _b, _c;
                        if (((_a = this._currentLink) === null || _a === void 0 ? void 0 : _a.state) && ((_c = (_b = this._currentLink) === null || _b === void 0 ? void 0 : _b.state) === null || _c === void 0 ? void 0 : _c.decorations.underline) !== v) {
                            this._currentLink.state.decorations.underline = v;
                            if (this._currentLink.state.isHovered) {
                                this._fireUnderlineEvent(linkWithState.link, v);
                            }
                        }
                    }
                }
            });
            if (this._renderService) {
                this._linkCacheDisposables.push(this._renderService.onRenderedViewportChange(e => {
                    if (!this._currentLink) {
                        return;
                    }
                    const start = e.start === 0 ? 0 : e.start + 1 + this._bufferService.buffer.ydisp;
                    const end = this._bufferService.buffer.ydisp + 1 + e.end;
                    if (this._currentLink.link.range.start.y >= start && this._currentLink.link.range.end.y <= end) {
                        this._clearCurrentLink(start, end);
                        if (this._lastMouseEvent && this._element) {
                            const position = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
                            if (position) {
                                this._askForLink(position, false);
                            }
                        }
                    }
                }));
            }
        }
    }
    _linkHover(element, link, event) {
        var _a;
        if ((_a = this._currentLink) === null || _a === void 0 ? void 0 : _a.state) {
            this._currentLink.state.isHovered = true;
            if (this._currentLink.state.decorations.underline) {
                this._fireUnderlineEvent(link, true);
            }
            if (this._currentLink.state.decorations.pointerCursor) {
                element.classList.add('xterm-cursor-pointer');
            }
        }
        if (link.hover) {
            link.hover(event, link.text);
        }
    }
    _fireUnderlineEvent(link, showEvent) {
        const range = link.range;
        const scrollOffset = this._bufferService.buffer.ydisp;
        const event = this._createLinkUnderlineEvent(range.start.x - 1, range.start.y - scrollOffset - 1, range.end.x, range.end.y - scrollOffset - 1, undefined);
        const emitter = showEvent ? this._onShowLinkUnderline : this._onHideLinkUnderline;
        emitter.fire(event);
    }
    _linkLeave(element, link, event) {
        var _a;
        if ((_a = this._currentLink) === null || _a === void 0 ? void 0 : _a.state) {
            this._currentLink.state.isHovered = false;
            if (this._currentLink.state.decorations.underline) {
                this._fireUnderlineEvent(link, false);
            }
            if (this._currentLink.state.decorations.pointerCursor) {
                element.classList.remove('xterm-cursor-pointer');
            }
        }
        if (link.leave) {
            link.leave(event, link.text);
        }
    }
    _linkAtPosition(link, position) {
        const lower = link.range.start.y * this._bufferService.cols + link.range.start.x;
        const upper = link.range.end.y * this._bufferService.cols + link.range.end.x;
        const current = position.y * this._bufferService.cols + position.x;
        return (lower <= current && current <= upper);
    }
    _positionFromMouseEvent(event, element, mouseService) {
        const coords = mouseService.getCoords(event, element, this._bufferService.cols, this._bufferService.rows);
        if (!coords) {
            return;
        }
        return { x: coords[0], y: coords[1] + this._bufferService.buffer.ydisp };
    }
    _createLinkUnderlineEvent(x1, y1, x2, y2, fg) {
        return { x1, y1, x2, y2, cols: this._bufferService.cols, fg };
    }
};
Linkifier2 = __decorate([
    __param(0, IBufferService),
    __metadata("design:paramtypes", [Object])
], Linkifier2);

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

let OscLinkProvider = class OscLinkProvider {
    constructor(_bufferService, _optionsService, _oscLinkService) {
        this._bufferService = _bufferService;
        this._optionsService = _optionsService;
        this._oscLinkService = _oscLinkService;
    }
    provideLinks(y, callback) {
        var _a;
        const line = this._bufferService.buffer.lines.get(y - 1);
        if (!line) {
            callback(undefined);
            return;
        }
        const result = [];
        const linkHandler = this._optionsService.rawOptions.linkHandler;
        const cell = new CellData();
        const lineLength = line.getTrimmedLength();
        let currentLinkId = -1;
        let currentStart = -1;
        let finishLink = false;
        for (let x = 0; x < lineLength; x++) {
            if (currentStart === -1 && !line.hasContent(x)) {
                continue;
            }
            line.loadCell(x, cell);
            if (cell.hasExtendedAttrs() && cell.extended.urlId) {
                if (currentStart === -1) {
                    currentStart = x;
                    currentLinkId = cell.extended.urlId;
                    continue;
                }
                else {
                    finishLink = cell.extended.urlId !== currentLinkId;
                }
            }
            else {
                if (currentStart !== -1) {
                    finishLink = true;
                }
            }
            if (finishLink || (currentStart !== -1 && x === lineLength - 1)) {
                const text = (_a = this._oscLinkService.getLinkData(currentLinkId)) === null || _a === void 0 ? void 0 : _a.uri;
                if (text) {
                    const range = {
                        start: {
                            x: currentStart + 1,
                            y
                        },
                        end: {
                            x: x + (!finishLink && x === lineLength - 1 ? 1 : 0),
                            y
                        }
                    };
                    let ignoreLink = false;
                    if (!(linkHandler === null || linkHandler === void 0 ? void 0 : linkHandler.allowNonHttpProtocols)) {
                        try {
                            const parsed = new URL(text);
                            if (!['http:', 'https:'].includes(parsed.protocol)) {
                                ignoreLink = true;
                            }
                        }
                        catch (e) {
                            ignoreLink = true;
                        }
                    }
                    if (!ignoreLink) {
                        result.push({
                            text,
                            range,
                            activate: (e, text) => (linkHandler ? linkHandler.activate(e, text, range) : defaultActivate(e, text)),
                            hover: (e, text) => { var _a; return (_a = linkHandler === null || linkHandler === void 0 ? void 0 : linkHandler.hover) === null || _a === void 0 ? void 0 : _a.call(linkHandler, e, text, range); },
                            leave: (e, text) => { var _a; return (_a = linkHandler === null || linkHandler === void 0 ? void 0 : linkHandler.leave) === null || _a === void 0 ? void 0 : _a.call(linkHandler, e, text, range); }
                        });
                    }
                }
                finishLink = false;
                if (cell.hasExtendedAttrs() && cell.extended.urlId) {
                    currentStart = x;
                    currentLinkId = cell.extended.urlId;
                }
                else {
                    currentStart = -1;
                    currentLinkId = -1;
                }
            }
        }
        callback(result);
    }
};
OscLinkProvider = __decorate([
    __param(0, IBufferService),
    __param(1, IOptionsService),
    __param(2, IOscLinkService),
    __metadata("design:paramtypes", [Object, Object, Object])
], OscLinkProvider);
function defaultActivate(e, uri) {
    const answer = confirm(`Do you want to navigate to ${uri}?\n\nWARNING: This link could potentially be dangerous`);
    if (answer) {
        const newWindow = window.open();
        if (newWindow) {
            try {
                newWindow.opener = null;
            }
            catch (_a) {
            }
            newWindow.location.href = uri;
        }
        else {
            console.warn('Opening link blocked as opener could not be cleared');
        }
    }
}

const ICharSizeService$1 = createDecorator('CharSizeService');
const ICoreBrowserService = createDecorator('CoreBrowserService');
const IMouseService = createDecorator('MouseService');
const IRenderService$1 = createDecorator('RenderService');
const ISelectionService = createDecorator('SelectionService');
const ICharacterJoinerService = createDecorator('CharacterJoinerService');
const IThemeService = createDecorator('ThemeService');

const FALLBACK_SCROLL_BAR_WIDTH = 15;
let Viewport = class Viewport extends Disposable {
    constructor(_viewportElement, _scrollArea, _bufferService, _optionsService, _charSizeService, _renderService, _coreBrowserService, themeService) {
        super();
        this._viewportElement = _viewportElement;
        this._scrollArea = _scrollArea;
        this._bufferService = _bufferService;
        this._optionsService = _optionsService;
        this._charSizeService = _charSizeService;
        this._renderService = _renderService;
        this._coreBrowserService = _coreBrowserService;
        this.scrollBarWidth = 0;
        this._currentRowHeight = 0;
        this._currentDeviceCellHeight = 0;
        this._lastRecordedBufferLength = 0;
        this._lastRecordedViewportHeight = 0;
        this._lastRecordedBufferHeight = 0;
        this._lastTouchY = 0;
        this._lastScrollTop = 0;
        this._wheelPartialScroll = 0;
        this._refreshAnimationFrame = null;
        this._ignoreNextScrollEvent = false;
        this._smoothScrollState = {
            startTime: 0,
            origin: -1,
            target: -1
        };
        this._onRequestScrollLines = this.register(new EventEmitter());
        this.onRequestScrollLines = this._onRequestScrollLines.event;
        this.scrollBarWidth = (this._viewportElement.offsetWidth - this._scrollArea.offsetWidth) || FALLBACK_SCROLL_BAR_WIDTH;
        this.register(addDisposableDomListener(this._viewportElement, 'scroll', this._handleScroll.bind(this)));
        this._activeBuffer = this._bufferService.buffer;
        this.register(this._bufferService.buffers.onBufferActivate(e => this._activeBuffer = e.activeBuffer));
        this._renderDimensions = this._renderService.dimensions;
        this.register(this._renderService.onDimensionsChange(e => this._renderDimensions = e));
        this._handleThemeChange(themeService.colors);
        this.register(themeService.onChangeColors(e => this._handleThemeChange(e)));
        this.register(this._optionsService.onSpecificOptionChange('scrollback', () => this.syncScrollArea()));
        setTimeout(() => this.syncScrollArea());
    }
    _handleThemeChange(colors) {
        this._viewportElement.style.backgroundColor = colors.background.css;
    }
    reset() {
        this._currentRowHeight = 0;
        this._currentDeviceCellHeight = 0;
        this._lastRecordedBufferLength = 0;
        this._lastRecordedViewportHeight = 0;
        this._lastRecordedBufferHeight = 0;
        this._lastTouchY = 0;
        this._lastScrollTop = 0;
        this._coreBrowserService.window.requestAnimationFrame(() => this.syncScrollArea());
    }
    _refresh(immediate) {
        if (immediate) {
            this._innerRefresh();
            if (this._refreshAnimationFrame !== null) {
                this._coreBrowserService.window.cancelAnimationFrame(this._refreshAnimationFrame);
            }
            return;
        }
        if (this._refreshAnimationFrame === null) {
            this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh());
        }
    }
    _innerRefresh() {
        if (this._charSizeService.height > 0) {
            this._currentRowHeight = this._renderDimensions.device.cell.height / this._coreBrowserService.dpr;
            this._currentDeviceCellHeight = this._renderDimensions.device.cell.height;
            this._lastRecordedViewportHeight = this._viewportElement.offsetHeight;
            const newBufferHeight = Math.round(this._currentRowHeight * this._lastRecordedBufferLength) + (this._lastRecordedViewportHeight - this._renderDimensions.css.canvas.height);
            if (this._lastRecordedBufferHeight !== newBufferHeight) {
                this._lastRecordedBufferHeight = newBufferHeight;
                this._scrollArea.style.height = this._lastRecordedBufferHeight + 'px';
            }
        }
        const scrollTop = this._bufferService.buffer.ydisp * this._currentRowHeight;
        if (this._viewportElement.scrollTop !== scrollTop) {
            this._ignoreNextScrollEvent = true;
            this._viewportElement.scrollTop = scrollTop;
        }
        this._refreshAnimationFrame = null;
    }
    syncScrollArea(immediate = false) {
        if (this._lastRecordedBufferLength !== this._bufferService.buffer.lines.length) {
            this._lastRecordedBufferLength = this._bufferService.buffer.lines.length;
            this._refresh(immediate);
            return;
        }
        if (this._lastRecordedViewportHeight !== this._renderService.dimensions.css.canvas.height) {
            this._refresh(immediate);
            return;
        }
        if (this._lastScrollTop !== this._activeBuffer.ydisp * this._currentRowHeight) {
            this._refresh(immediate);
            return;
        }
        if (this._renderDimensions.device.cell.height !== this._currentDeviceCellHeight) {
            this._refresh(immediate);
            return;
        }
    }
    _handleScroll(ev) {
        this._lastScrollTop = this._viewportElement.scrollTop;
        if (!this._viewportElement.offsetParent) {
            return;
        }
        if (this._ignoreNextScrollEvent) {
            this._ignoreNextScrollEvent = false;
            this._onRequestScrollLines.fire({ amount: 0, suppressScrollEvent: true });
            return;
        }
        const newRow = Math.round(this._lastScrollTop / this._currentRowHeight);
        const diff = newRow - this._bufferService.buffer.ydisp;
        this._onRequestScrollLines.fire({ amount: diff, suppressScrollEvent: true });
    }
    _smoothScroll() {
        if (this._isDisposed || this._smoothScrollState.origin === -1 || this._smoothScrollState.target === -1) {
            return;
        }
        const percent = this._smoothScrollPercent();
        this._viewportElement.scrollTop = this._smoothScrollState.origin + Math.round(percent * (this._smoothScrollState.target - this._smoothScrollState.origin));
        if (percent < 1) {
            this._coreBrowserService.window.requestAnimationFrame(() => this._smoothScroll());
        }
        else {
            this._clearSmoothScrollState();
        }
    }
    _smoothScrollPercent() {
        if (!this._optionsService.rawOptions.smoothScrollDuration || !this._smoothScrollState.startTime) {
            return 1;
        }
        return Math.max(Math.min((Date.now() - this._smoothScrollState.startTime) / this._optionsService.rawOptions.smoothScrollDuration, 1), 0);
    }
    _clearSmoothScrollState() {
        this._smoothScrollState.startTime = 0;
        this._smoothScrollState.origin = -1;
        this._smoothScrollState.target = -1;
    }
    _bubbleScroll(ev, amount) {
        const scrollPosFromTop = this._viewportElement.scrollTop + this._lastRecordedViewportHeight;
        if ((amount < 0 && this._viewportElement.scrollTop !== 0) ||
            (amount > 0 && scrollPosFromTop < this._lastRecordedBufferHeight)) {
            if (ev.cancelable) {
                ev.preventDefault();
            }
            return false;
        }
        return true;
    }
    handleWheel(ev) {
        const amount = this._getPixelsScrolled(ev);
        if (amount === 0) {
            return false;
        }
        if (!this._optionsService.rawOptions.smoothScrollDuration) {
            this._viewportElement.scrollTop += amount;
        }
        else {
            this._smoothScrollState.startTime = Date.now();
            if (this._smoothScrollPercent() < 1) {
                this._smoothScrollState.origin = this._viewportElement.scrollTop;
                if (this._smoothScrollState.target === -1) {
                    this._smoothScrollState.target = this._viewportElement.scrollTop + amount;
                }
                else {
                    this._smoothScrollState.target += amount;
                }
                this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0);
                this._smoothScroll();
            }
            else {
                this._clearSmoothScrollState();
            }
        }
        return this._bubbleScroll(ev, amount);
    }
    scrollLines(disp) {
        if (disp === 0) {
            return;
        }
        if (!this._optionsService.rawOptions.smoothScrollDuration) {
            this._onRequestScrollLines.fire({ amount: disp, suppressScrollEvent: false });
        }
        else {
            const amount = disp * this._currentRowHeight;
            this._smoothScrollState.startTime = Date.now();
            if (this._smoothScrollPercent() < 1) {
                this._smoothScrollState.origin = this._viewportElement.scrollTop;
                this._smoothScrollState.target = this._smoothScrollState.origin + amount;
                this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0);
                this._smoothScroll();
            }
            else {
                this._clearSmoothScrollState();
            }
        }
    }
    _getPixelsScrolled(ev) {
        if (ev.deltaY === 0 || ev.shiftKey) {
            return 0;
        }
        let amount = this._applyScrollModifier(ev.deltaY, ev);
        if (ev.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            amount *= this._currentRowHeight;
        }
        else if (ev.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            amount *= this._currentRowHeight * this._bufferService.rows;
        }
        return amount;
    }
    getBufferElements(startLine, endLine) {
        var _a;
        let currentLine = '';
        let cursorElement;
        const bufferElements = [];
        const end = endLine !== null && endLine !== void 0 ? endLine : this._bufferService.buffer.lines.length;
        const lines = this._bufferService.buffer.lines;
        for (let i = startLine; i < end; i++) {
            const line = lines.get(i);
            if (!line) {
                continue;
            }
            const isWrapped = (_a = lines.get(i + 1)) === null || _a === void 0 ? void 0 : _a.isWrapped;
            currentLine += line.translateToString(!isWrapped);
            if (!isWrapped || i === lines.length - 1) {
                const div = document.createElement('div');
                div.textContent = currentLine;
                bufferElements.push(div);
                if (currentLine.length > 0) {
                    cursorElement = div;
                }
                currentLine = '';
            }
        }
        return { bufferElements, cursorElement };
    }
    getLinesScrolled(ev) {
        if (ev.deltaY === 0 || ev.shiftKey) {
            return 0;
        }
        let amount = this._applyScrollModifier(ev.deltaY, ev);
        if (ev.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
            amount /= this._currentRowHeight + 0.0;
            this._wheelPartialScroll += amount;
            amount = Math.floor(Math.abs(this._wheelPartialScroll)) * (this._wheelPartialScroll > 0 ? 1 : -1);
            this._wheelPartialScroll %= 1;
        }
        else if (ev.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            amount *= this._bufferService.rows;
        }
        return amount;
    }
    _applyScrollModifier(amount, ev) {
        const modifier = this._optionsService.rawOptions.fastScrollModifier;
        if ((modifier === 'alt' && ev.altKey) ||
            (modifier === 'ctrl' && ev.ctrlKey) ||
            (modifier === 'shift' && ev.shiftKey)) {
            return amount * this._optionsService.rawOptions.fastScrollSensitivity * this._optionsService.rawOptions.scrollSensitivity;
        }
        return amount * this._optionsService.rawOptions.scrollSensitivity;
    }
    handleTouchStart(ev) {
        this._lastTouchY = ev.touches[0].pageY;
    }
    handleTouchMove(ev) {
        const deltaY = this._lastTouchY - ev.touches[0].pageY;
        this._lastTouchY = ev.touches[0].pageY;
        if (deltaY === 0) {
            return false;
        }
        this._viewportElement.scrollTop += deltaY;
        return this._bubbleScroll(ev, deltaY);
    }
};
Viewport = __decorate([
    __param(2, IBufferService),
    __param(3, IOptionsService),
    __param(4, ICharSizeService$1),
    __param(5, IRenderService$1),
    __param(6, ICoreBrowserService),
    __param(7, IThemeService),
    __metadata("design:paramtypes", [HTMLElement,
        HTMLElement, Object, Object, Object, Object, Object, Object])
], Viewport);

let BufferDecorationRenderer = class BufferDecorationRenderer extends Disposable {
    constructor(_screenElement, _bufferService, _coreBrowserService, _decorationService, _renderService) {
        super();
        this._screenElement = _screenElement;
        this._bufferService = _bufferService;
        this._coreBrowserService = _coreBrowserService;
        this._decorationService = _decorationService;
        this._renderService = _renderService;
        this._decorationElements = new Map();
        this._altBufferIsActive = false;
        this._dimensionsChanged = false;
        this._container = document.createElement('div');
        this._container.classList.add('xterm-decoration-container');
        this._screenElement.appendChild(this._container);
        this.register(this._renderService.onRenderedViewportChange(() => this._doRefreshDecorations()));
        this.register(this._renderService.onDimensionsChange(() => {
            this._dimensionsChanged = true;
            this._queueRefresh();
        }));
        this.register(this._coreBrowserService.onDprChange(() => this._queueRefresh()));
        this.register(this._bufferService.buffers.onBufferActivate(() => {
            this._altBufferIsActive = this._bufferService.buffer === this._bufferService.buffers.alt;
        }));
        this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh()));
        this.register(this._decorationService.onDecorationRemoved(decoration => this._removeDecoration(decoration)));
        this.register(toDisposable(() => {
            this._container.remove();
            this._decorationElements.clear();
        }));
    }
    _queueRefresh() {
        if (this._animationFrame !== undefined) {
            return;
        }
        this._animationFrame = this._renderService.addRefreshCallback(() => {
            this._doRefreshDecorations();
            this._animationFrame = undefined;
        });
    }
    _doRefreshDecorations() {
        for (const decoration of this._decorationService.decorations) {
            this._renderDecoration(decoration);
        }
        this._dimensionsChanged = false;
    }
    _renderDecoration(decoration) {
        this._refreshStyle(decoration);
        if (this._dimensionsChanged) {
            this._refreshXPosition(decoration);
        }
    }
    _createElement(decoration) {
        var _a, _b;
        const element = this._coreBrowserService.mainDocument.createElement('div');
        element.classList.add('xterm-decoration');
        element.classList.toggle('xterm-decoration-top-layer', ((_a = decoration === null || decoration === void 0 ? void 0 : decoration.options) === null || _a === void 0 ? void 0 : _a.layer) === 'top');
        element.style.width = `${Math.round((decoration.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`;
        element.style.height = `${(decoration.options.height || 1) * this._renderService.dimensions.css.cell.height}px`;
        element.style.top = `${(decoration.marker.line - this._bufferService.buffers.active.ydisp) * this._renderService.dimensions.css.cell.height}px`;
        element.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`;
        const x = (_b = decoration.options.x) !== null && _b !== void 0 ? _b : 0;
        if (x && x > this._bufferService.cols) {
            element.style.display = 'none';
        }
        this._refreshXPosition(decoration, element);
        return element;
    }
    _refreshStyle(decoration) {
        const line = decoration.marker.line - this._bufferService.buffers.active.ydisp;
        if (line < 0 || line >= this._bufferService.rows) {
            if (decoration.element) {
                decoration.element.style.display = 'none';
                decoration.onRenderEmitter.fire(decoration.element);
            }
        }
        else {
            let element = this._decorationElements.get(decoration);
            if (!element) {
                element = this._createElement(decoration);
                decoration.element = element;
                this._decorationElements.set(decoration, element);
                this._container.appendChild(element);
                decoration.onDispose(() => {
                    this._decorationElements.delete(decoration);
                    element.remove();
                });
            }
            element.style.top = `${line * this._renderService.dimensions.css.cell.height}px`;
            element.style.display = this._altBufferIsActive ? 'none' : 'block';
            decoration.onRenderEmitter.fire(element);
        }
    }
    _refreshXPosition(decoration, element = decoration.element) {
        var _a;
        if (!element) {
            return;
        }
        const x = (_a = decoration.options.x) !== null && _a !== void 0 ? _a : 0;
        if ((decoration.options.anchor || 'left') === 'right') {
            element.style.right = x ? `${x * this._renderService.dimensions.css.cell.width}px` : '';
        }
        else {
            element.style.left = x ? `${x * this._renderService.dimensions.css.cell.width}px` : '';
        }
    }
    _removeDecoration(decoration) {
        var _a;
        (_a = this._decorationElements.get(decoration)) === null || _a === void 0 ? void 0 : _a.remove();
        this._decorationElements.delete(decoration);
        decoration.dispose();
    }
};
BufferDecorationRenderer = __decorate([
    __param(1, IBufferService),
    __param(2, ICoreBrowserService),
    __param(3, IDecorationService),
    __param(4, IRenderService$1),
    __metadata("design:paramtypes", [HTMLElement, Object, Object, Object, Object])
], BufferDecorationRenderer);

class ColorZoneStore {
    constructor() {
        this._zones = [];
        this._zonePool = [];
        this._zonePoolIndex = 0;
        this._linePadding = {
            full: 0,
            left: 0,
            center: 0,
            right: 0
        };
    }
    get zones() {
        this._zonePool.length = Math.min(this._zonePool.length, this._zones.length);
        return this._zones;
    }
    clear() {
        this._zones.length = 0;
        this._zonePoolIndex = 0;
    }
    addDecoration(decoration) {
        if (!decoration.options.overviewRulerOptions) {
            return;
        }
        for (const z of this._zones) {
            if (z.color === decoration.options.overviewRulerOptions.color &&
                z.position === decoration.options.overviewRulerOptions.position) {
                if (this._lineIntersectsZone(z, decoration.marker.line)) {
                    return;
                }
                if (this._lineAdjacentToZone(z, decoration.marker.line, decoration.options.overviewRulerOptions.position)) {
                    this._addLineToZone(z, decoration.marker.line);
                    return;
                }
            }
        }
        if (this._zonePoolIndex < this._zonePool.length) {
            this._zonePool[this._zonePoolIndex].color = decoration.options.overviewRulerOptions.color;
            this._zonePool[this._zonePoolIndex].position = decoration.options.overviewRulerOptions.position;
            this._zonePool[this._zonePoolIndex].startBufferLine = decoration.marker.line;
            this._zonePool[this._zonePoolIndex].endBufferLine = decoration.marker.line;
            this._zones.push(this._zonePool[this._zonePoolIndex++]);
            return;
        }
        this._zones.push({
            color: decoration.options.overviewRulerOptions.color,
            position: decoration.options.overviewRulerOptions.position,
            startBufferLine: decoration.marker.line,
            endBufferLine: decoration.marker.line
        });
        this._zonePool.push(this._zones[this._zones.length - 1]);
        this._zonePoolIndex++;
    }
    setPadding(padding) {
        this._linePadding = padding;
    }
    _lineIntersectsZone(zone, line) {
        return (line >= zone.startBufferLine &&
            line <= zone.endBufferLine);
    }
    _lineAdjacentToZone(zone, line, position) {
        return ((line >= zone.startBufferLine - this._linePadding[position || 'full']) &&
            (line <= zone.endBufferLine + this._linePadding[position || 'full']));
    }
    _addLineToZone(zone, line) {
        zone.startBufferLine = Math.min(zone.startBufferLine, line);
        zone.endBufferLine = Math.max(zone.endBufferLine, line);
    }
}

const drawHeight = {
    full: 0,
    left: 0,
    center: 0,
    right: 0
};
const drawWidth = {
    full: 0,
    left: 0,
    center: 0,
    right: 0
};
const drawX = {
    full: 0,
    left: 0,
    center: 0,
    right: 0
};
let OverviewRulerRenderer = class OverviewRulerRenderer extends Disposable {
    get _width() {
        return this._optionsService.options.overviewRulerWidth || 0;
    }
    constructor(_viewportElement, _screenElement, _bufferService, _decorationService, _renderService, _optionsService, _coreBrowserService) {
        var _a;
        super();
        this._viewportElement = _viewportElement;
        this._screenElement = _screenElement;
        this._bufferService = _bufferService;
        this._decorationService = _decorationService;
        this._renderService = _renderService;
        this._optionsService = _optionsService;
        this._coreBrowserService = _coreBrowserService;
        this._colorZoneStore = new ColorZoneStore();
        this._shouldUpdateDimensions = true;
        this._shouldUpdateAnchor = true;
        this._lastKnownBufferLength = 0;
        this._canvas = this._coreBrowserService.mainDocument.createElement('canvas');
        this._canvas.classList.add('xterm-decoration-overview-ruler');
        this._refreshCanvasDimensions();
        (_a = this._viewportElement.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this._canvas, this._viewportElement);
        const ctx = this._canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Ctx cannot be null');
        }
        else {
            this._ctx = ctx;
        }
        this._registerDecorationListeners();
        this._registerBufferChangeListeners();
        this._registerDimensionChangeListeners();
        this.register(toDisposable(() => {
            var _a;
            (_a = this._canvas) === null || _a === void 0 ? void 0 : _a.remove();
        }));
    }
    _registerDecorationListeners() {
        this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh(undefined, true)));
        this.register(this._decorationService.onDecorationRemoved(() => this._queueRefresh(undefined, true)));
    }
    _registerBufferChangeListeners() {
        this.register(this._renderService.onRenderedViewportChange(() => this._queueRefresh()));
        this.register(this._bufferService.buffers.onBufferActivate(() => {
            this._canvas.style.display = this._bufferService.buffer === this._bufferService.buffers.alt ? 'none' : 'block';
        }));
        this.register(this._bufferService.onScroll(() => {
            if (this._lastKnownBufferLength !== this._bufferService.buffers.normal.lines.length) {
                this._refreshDrawHeightConstants();
                this._refreshColorZonePadding();
            }
        }));
    }
    _registerDimensionChangeListeners() {
        this.register(this._renderService.onRender(() => {
            if (!this._containerHeight || this._containerHeight !== this._screenElement.clientHeight) {
                this._queueRefresh(true);
                this._containerHeight = this._screenElement.clientHeight;
            }
        }));
        this.register(this._optionsService.onSpecificOptionChange('overviewRulerWidth', () => this._queueRefresh(true)));
        this.register(this._coreBrowserService.onDprChange(() => this._queueRefresh(true)));
        this._queueRefresh(true);
    }
    _refreshDrawConstants() {
        const outerWidth = Math.floor(this._canvas.width / 3);
        const innerWidth = Math.ceil(this._canvas.width / 3);
        drawWidth.full = this._canvas.width;
        drawWidth.left = outerWidth;
        drawWidth.center = innerWidth;
        drawWidth.right = outerWidth;
        this._refreshDrawHeightConstants();
        drawX.full = 0;
        drawX.left = 0;
        drawX.center = drawWidth.left;
        drawX.right = drawWidth.left + drawWidth.center;
    }
    _refreshDrawHeightConstants() {
        drawHeight.full = Math.round(2 * this._coreBrowserService.dpr);
        const pixelsPerLine = this._canvas.height / this._bufferService.buffer.lines.length;
        const nonFullHeight = Math.round(Math.max(Math.min(pixelsPerLine, 12), 6) * this._coreBrowserService.dpr);
        drawHeight.left = nonFullHeight;
        drawHeight.center = nonFullHeight;
        drawHeight.right = nonFullHeight;
    }
    _refreshColorZonePadding() {
        this._colorZoneStore.setPadding({
            full: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * drawHeight.full),
            left: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * drawHeight.left),
            center: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * drawHeight.center),
            right: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * drawHeight.right)
        });
        this._lastKnownBufferLength = this._bufferService.buffers.normal.lines.length;
    }
    _refreshCanvasDimensions() {
        this._canvas.style.width = `${this._width}px`;
        this._canvas.width = Math.round(this._width * this._coreBrowserService.dpr);
        this._canvas.style.height = `${this._screenElement.clientHeight}px`;
        this._canvas.height = Math.round(this._screenElement.clientHeight * this._coreBrowserService.dpr);
        this._refreshDrawConstants();
        this._refreshColorZonePadding();
    }
    _refreshDecorations() {
        if (this._shouldUpdateDimensions) {
            this._refreshCanvasDimensions();
        }
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._colorZoneStore.clear();
        for (const decoration of this._decorationService.decorations) {
            this._colorZoneStore.addDecoration(decoration);
        }
        this._ctx.lineWidth = 1;
        const zones = this._colorZoneStore.zones;
        for (const zone of zones) {
            if (zone.position !== 'full') {
                this._renderColorZone(zone);
            }
        }
        for (const zone of zones) {
            if (zone.position === 'full') {
                this._renderColorZone(zone);
            }
        }
        this._shouldUpdateDimensions = false;
        this._shouldUpdateAnchor = false;
    }
    _renderColorZone(zone) {
        this._ctx.fillStyle = zone.color;
        this._ctx.fillRect(drawX[zone.position || 'full'], Math.round((this._canvas.height - 1) *
            (zone.startBufferLine / this._bufferService.buffers.active.lines.length) - drawHeight[zone.position || 'full'] / 2), drawWidth[zone.position || 'full'], Math.round((this._canvas.height - 1) *
            ((zone.endBufferLine - zone.startBufferLine) / this._bufferService.buffers.active.lines.length) + drawHeight[zone.position || 'full']));
    }
    _queueRefresh(updateCanvasDimensions, updateAnchor) {
        this._shouldUpdateDimensions = updateCanvasDimensions || this._shouldUpdateDimensions;
        this._shouldUpdateAnchor = updateAnchor || this._shouldUpdateAnchor;
        if (this._animationFrame !== undefined) {
            return;
        }
        this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
            this._refreshDecorations();
            this._animationFrame = undefined;
        });
    }
};
OverviewRulerRenderer = __decorate([
    __param(2, IBufferService),
    __param(3, IDecorationService),
    __param(4, IRenderService$1),
    __param(5, IOptionsService),
    __param(6, ICoreBrowserService),
    __metadata("design:paramtypes", [HTMLElement,
        HTMLElement, Object, Object, Object, Object, Object])
], OverviewRulerRenderer);

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

let CompositionHelper = class CompositionHelper {
    get isComposing() { return this._isComposing; }
    constructor(_textarea, _compositionView, _bufferService, _optionsService, _coreService, _renderService) {
        this._textarea = _textarea;
        this._compositionView = _compositionView;
        this._bufferService = _bufferService;
        this._optionsService = _optionsService;
        this._coreService = _coreService;
        this._renderService = _renderService;
        this._isComposing = false;
        this._isSendingComposition = false;
        this._compositionPosition = { start: 0, end: 0 };
        this._dataAlreadySent = '';
    }
    compositionstart() {
        this._isComposing = true;
        this._compositionPosition.start = this._textarea.value.length;
        this._compositionView.textContent = '';
        this._dataAlreadySent = '';
        this._compositionView.classList.add('active');
    }
    compositionupdate(ev) {
        this._compositionView.textContent = ev.data;
        this.updateCompositionElements();
        setTimeout(() => {
            this._compositionPosition.end = this._textarea.value.length;
        }, 0);
    }
    compositionend() {
        this._finalizeComposition(true);
    }
    keydown(ev) {
        if (this._isComposing || this._isSendingComposition) {
            if (ev.keyCode === 229) {
                return false;
            }
            if (ev.keyCode === 16 || ev.keyCode === 17 || ev.keyCode === 18) {
                return false;
            }
            this._finalizeComposition(false);
        }
        if (ev.keyCode === 229) {
            this._handleAnyTextareaChanges();
            return false;
        }
        return true;
    }
    _finalizeComposition(waitForPropagation) {
        this._compositionView.classList.remove('active');
        this._isComposing = false;
        if (!waitForPropagation) {
            this._isSendingComposition = false;
            const input = this._textarea.value.substring(this._compositionPosition.start, this._compositionPosition.end);
            this._coreService.triggerDataEvent(input, true);
        }
        else {
            const currentCompositionPosition = {
                start: this._compositionPosition.start,
                end: this._compositionPosition.end
            };
            this._isSendingComposition = true;
            setTimeout(() => {
                if (this._isSendingComposition) {
                    this._isSendingComposition = false;
                    let input;
                    currentCompositionPosition.start += this._dataAlreadySent.length;
                    if (this._isComposing) {
                        input = this._textarea.value.substring(currentCompositionPosition.start, currentCompositionPosition.end);
                    }
                    else {
                        input = this._textarea.value.substring(currentCompositionPosition.start);
                    }
                    if (input.length > 0) {
                        this._coreService.triggerDataEvent(input, true);
                    }
                }
            }, 0);
        }
    }
    _handleAnyTextareaChanges() {
        const oldValue = this._textarea.value;
        setTimeout(() => {
            if (!this._isComposing) {
                const newValue = this._textarea.value;
                const diff = newValue.replace(oldValue, '');
                this._dataAlreadySent = diff;
                if (newValue.length > oldValue.length) {
                    this._coreService.triggerDataEvent(diff, true);
                }
                else if (newValue.length < oldValue.length) {
                    this._coreService.triggerDataEvent(`${C0.DEL}`, true);
                }
                else if ((newValue.length === oldValue.length) && (newValue !== oldValue)) {
                    this._coreService.triggerDataEvent(newValue, true);
                }
            }
        }, 0);
    }
    updateCompositionElements(dontRecurse) {
        if (!this._isComposing) {
            return;
        }
        if (this._bufferService.buffer.isCursorInViewport) {
            const cursorX = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1);
            const cellHeight = this._renderService.dimensions.css.cell.height;
            const cursorTop = this._bufferService.buffer.y * this._renderService.dimensions.css.cell.height;
            const cursorLeft = cursorX * this._renderService.dimensions.css.cell.width;
            this._compositionView.style.left = cursorLeft + 'px';
            this._compositionView.style.top = cursorTop + 'px';
            this._compositionView.style.height = cellHeight + 'px';
            this._compositionView.style.lineHeight = cellHeight + 'px';
            this._compositionView.style.fontFamily = this._optionsService.rawOptions.fontFamily;
            this._compositionView.style.fontSize = this._optionsService.rawOptions.fontSize + 'px';
            const compositionViewBounds = this._compositionView.getBoundingClientRect();
            this._textarea.style.left = cursorLeft + 'px';
            this._textarea.style.top = cursorTop + 'px';
            this._textarea.style.width = Math.max(compositionViewBounds.width, 1) + 'px';
            this._textarea.style.height = Math.max(compositionViewBounds.height, 1) + 'px';
            this._textarea.style.lineHeight = compositionViewBounds.height + 'px';
        }
        if (!dontRecurse) {
            setTimeout(() => this.updateCompositionElements(true), 0);
        }
    }
};
CompositionHelper = __decorate([
    __param(2, IBufferService),
    __param(3, IOptionsService),
    __param(4, ICoreService),
    __param(5, IRenderService$1),
    __metadata("design:paramtypes", [HTMLTextAreaElement,
        HTMLElement, Object, Object, Object, Object])
], CompositionHelper);

const isNode = (typeof process !== 'undefined') ? true : false;
const userAgent = (isNode) ? 'node' : navigator.userAgent;
const platform = (isNode) ? 'node' : navigator.platform;
const isFirefox = userAgent.includes('Firefox');
const isLegacyEdge = userAgent.includes('Edge');
const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
function getSafariVersion() {
    if (!isSafari) {
        return 0;
    }
    const majorVersion = userAgent.match(/Version\/(\d+)/);
    if (majorVersion === null || majorVersion.length < 2) {
        return 0;
    }
    return parseInt(majorVersion[1]);
}
const isMac = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'].includes(platform);
const isIpad = platform === 'iPad';
const isIphone = platform === 'iPhone';
const isWindows = ['Windows', 'Win16', 'Win32', 'WinCE'].includes(platform);
const isLinux = platform.indexOf('Linux') >= 0;
const isChromeOS = /\bCrOS\b/.test(userAgent);

var Browser = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getSafariVersion: getSafariVersion,
    isChromeOS: isChromeOS,
    isFirefox: isFirefox,
    isIpad: isIpad,
    isIphone: isIphone,
    isLegacyEdge: isLegacyEdge,
    isLinux: isLinux,
    isMac: isMac,
    isNode: isNode,
    isSafari: isSafari,
    isWindows: isWindows
});

const INVERTED_DEFAULT_COLOR = 257;

let $r = 0;
let $g = 0;
let $b = 0;
let $a = 0;
const NULL_COLOR = {
    css: '#00000000',
    rgba: 0
};
var channels;
(function (channels) {
    function toCss(r, g, b, a) {
        if (a !== undefined) {
            return `#${toPaddedHex(r)}${toPaddedHex(g)}${toPaddedHex(b)}${toPaddedHex(a)}`;
        }
        return `#${toPaddedHex(r)}${toPaddedHex(g)}${toPaddedHex(b)}`;
    }
    channels.toCss = toCss;
    function toRgba(r, g, b, a = 0xFF) {
        return (r << 24 | g << 16 | b << 8 | a) >>> 0;
    }
    channels.toRgba = toRgba;
})(channels || (channels = {}));
var color;
(function (color_1) {
    function blend(bg, fg) {
        $a = (fg.rgba & 0xFF) / 255;
        if ($a === 1) {
            return {
                css: fg.css,
                rgba: fg.rgba
            };
        }
        const fgR = (fg.rgba >> 24) & 0xFF;
        const fgG = (fg.rgba >> 16) & 0xFF;
        const fgB = (fg.rgba >> 8) & 0xFF;
        const bgR = (bg.rgba >> 24) & 0xFF;
        const bgG = (bg.rgba >> 16) & 0xFF;
        const bgB = (bg.rgba >> 8) & 0xFF;
        $r = bgR + Math.round((fgR - bgR) * $a);
        $g = bgG + Math.round((fgG - bgG) * $a);
        $b = bgB + Math.round((fgB - bgB) * $a);
        const css = channels.toCss($r, $g, $b);
        const rgba = channels.toRgba($r, $g, $b);
        return { css, rgba };
    }
    color_1.blend = blend;
    function isOpaque(color) {
        return (color.rgba & 0xFF) === 0xFF;
    }
    color_1.isOpaque = isOpaque;
    function ensureContrastRatio(bg, fg, ratio) {
        const result = rgba.ensureContrastRatio(bg.rgba, fg.rgba, ratio);
        if (!result) {
            return undefined;
        }
        return rgba.toColor((result >> 24 & 0xFF), (result >> 16 & 0xFF), (result >> 8 & 0xFF));
    }
    color_1.ensureContrastRatio = ensureContrastRatio;
    function opaque(color) {
        const rgbaColor = (color.rgba | 0xFF) >>> 0;
        [$r, $g, $b] = rgba.toChannels(rgbaColor);
        return {
            css: channels.toCss($r, $g, $b),
            rgba: rgbaColor
        };
    }
    color_1.opaque = opaque;
    function opacity(color, opacity) {
        $a = Math.round(opacity * 0xFF);
        [$r, $g, $b] = rgba.toChannels(color.rgba);
        return {
            css: channels.toCss($r, $g, $b, $a),
            rgba: channels.toRgba($r, $g, $b, $a)
        };
    }
    color_1.opacity = opacity;
    function multiplyOpacity(color, factor) {
        $a = color.rgba & 0xFF;
        return opacity(color, ($a * factor) / 0xFF);
    }
    color_1.multiplyOpacity = multiplyOpacity;
    function toColorRGB(color) {
        return [(color.rgba >> 24) & 0xFF, (color.rgba >> 16) & 0xFF, (color.rgba >> 8) & 0xFF];
    }
    color_1.toColorRGB = toColorRGB;
})(color || (color = {}));
var css;
(function (css_1) {
    let $ctx;
    let $litmusColor;
    if (!isNode) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', {
            willReadFrequently: true
        });
        if (ctx) {
            $ctx = ctx;
            $ctx.globalCompositeOperation = 'copy';
            $litmusColor = $ctx.createLinearGradient(0, 0, 1, 1);
        }
    }
    function toColor(css) {
        if (css.match(/#[\da-f]{3,8}/i)) {
            switch (css.length) {
                case 4: {
                    $r = parseInt(css.slice(1, 2).repeat(2), 16);
                    $g = parseInt(css.slice(2, 3).repeat(2), 16);
                    $b = parseInt(css.slice(3, 4).repeat(2), 16);
                    return rgba.toColor($r, $g, $b);
                }
                case 5: {
                    $r = parseInt(css.slice(1, 2).repeat(2), 16);
                    $g = parseInt(css.slice(2, 3).repeat(2), 16);
                    $b = parseInt(css.slice(3, 4).repeat(2), 16);
                    $a = parseInt(css.slice(4, 5).repeat(2), 16);
                    return rgba.toColor($r, $g, $b, $a);
                }
                case 7:
                    return {
                        css,
                        rgba: (parseInt(css.slice(1), 16) << 8 | 0xFF) >>> 0
                    };
                case 9:
                    return {
                        css,
                        rgba: parseInt(css.slice(1), 16) >>> 0
                    };
            }
        }
        const rgbaMatch = css.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
        if (rgbaMatch) {
            $r = parseInt(rgbaMatch[1]);
            $g = parseInt(rgbaMatch[2]);
            $b = parseInt(rgbaMatch[3]);
            $a = Math.round((rgbaMatch[5] === undefined ? 1 : parseFloat(rgbaMatch[5])) * 0xFF);
            return rgba.toColor($r, $g, $b, $a);
        }
        if (!$ctx || !$litmusColor) {
            throw new Error('css.toColor: Unsupported css format');
        }
        $ctx.fillStyle = $litmusColor;
        $ctx.fillStyle = css;
        if (typeof $ctx.fillStyle !== 'string') {
            throw new Error('css.toColor: Unsupported css format');
        }
        $ctx.fillRect(0, 0, 1, 1);
        [$r, $g, $b, $a] = $ctx.getImageData(0, 0, 1, 1).data;
        if ($a !== 0xFF) {
            throw new Error('css.toColor: Unsupported css format');
        }
        return {
            rgba: channels.toRgba($r, $g, $b, $a),
            css
        };
    }
    css_1.toColor = toColor;
})(css || (css = {}));
var rgb;
(function (rgb_1) {
    function relativeLuminance(rgb) {
        return relativeLuminance2((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, (rgb) & 0xFF);
    }
    rgb_1.relativeLuminance = relativeLuminance;
    function relativeLuminance2(r, g, b) {
        const rs = r / 255;
        const gs = g / 255;
        const bs = b / 255;
        const rr = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
        const rg = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
        const rb = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
        return rr * 0.2126 + rg * 0.7152 + rb * 0.0722;
    }
    rgb_1.relativeLuminance2 = relativeLuminance2;
})(rgb || (rgb = {}));
var rgba;
(function (rgba) {
    function ensureContrastRatio(bgRgba, fgRgba, ratio) {
        const bgL = rgb.relativeLuminance(bgRgba >> 8);
        const fgL = rgb.relativeLuminance(fgRgba >> 8);
        const cr = contrastRatio(bgL, fgL);
        if (cr < ratio) {
            if (fgL < bgL) {
                const resultA = reduceLuminance(bgRgba, fgRgba, ratio);
                const resultARatio = contrastRatio(bgL, rgb.relativeLuminance(resultA >> 8));
                if (resultARatio < ratio) {
                    const resultB = increaseLuminance(bgRgba, fgRgba, ratio);
                    const resultBRatio = contrastRatio(bgL, rgb.relativeLuminance(resultB >> 8));
                    return resultARatio > resultBRatio ? resultA : resultB;
                }
                return resultA;
            }
            const resultA = increaseLuminance(bgRgba, fgRgba, ratio);
            const resultARatio = contrastRatio(bgL, rgb.relativeLuminance(resultA >> 8));
            if (resultARatio < ratio) {
                const resultB = reduceLuminance(bgRgba, fgRgba, ratio);
                const resultBRatio = contrastRatio(bgL, rgb.relativeLuminance(resultB >> 8));
                return resultARatio > resultBRatio ? resultA : resultB;
            }
            return resultA;
        }
        return undefined;
    }
    rgba.ensureContrastRatio = ensureContrastRatio;
    function reduceLuminance(bgRgba, fgRgba, ratio) {
        const bgR = (bgRgba >> 24) & 0xFF;
        const bgG = (bgRgba >> 16) & 0xFF;
        const bgB = (bgRgba >> 8) & 0xFF;
        let fgR = (fgRgba >> 24) & 0xFF;
        let fgG = (fgRgba >> 16) & 0xFF;
        let fgB = (fgRgba >> 8) & 0xFF;
        let cr = contrastRatio(rgb.relativeLuminance2(fgR, fgG, fgB), rgb.relativeLuminance2(bgR, bgG, bgB));
        while (cr < ratio && (fgR > 0 || fgG > 0 || fgB > 0)) {
            fgR -= Math.max(0, Math.ceil(fgR * 0.1));
            fgG -= Math.max(0, Math.ceil(fgG * 0.1));
            fgB -= Math.max(0, Math.ceil(fgB * 0.1));
            cr = contrastRatio(rgb.relativeLuminance2(fgR, fgG, fgB), rgb.relativeLuminance2(bgR, bgG, bgB));
        }
        return (fgR << 24 | fgG << 16 | fgB << 8 | 0xFF) >>> 0;
    }
    rgba.reduceLuminance = reduceLuminance;
    function increaseLuminance(bgRgba, fgRgba, ratio) {
        const bgR = (bgRgba >> 24) & 0xFF;
        const bgG = (bgRgba >> 16) & 0xFF;
        const bgB = (bgRgba >> 8) & 0xFF;
        let fgR = (fgRgba >> 24) & 0xFF;
        let fgG = (fgRgba >> 16) & 0xFF;
        let fgB = (fgRgba >> 8) & 0xFF;
        let cr = contrastRatio(rgb.relativeLuminance2(fgR, fgG, fgB), rgb.relativeLuminance2(bgR, bgG, bgB));
        while (cr < ratio && (fgR < 0xFF || fgG < 0xFF || fgB < 0xFF)) {
            fgR = Math.min(0xFF, fgR + Math.ceil((255 - fgR) * 0.1));
            fgG = Math.min(0xFF, fgG + Math.ceil((255 - fgG) * 0.1));
            fgB = Math.min(0xFF, fgB + Math.ceil((255 - fgB) * 0.1));
            cr = contrastRatio(rgb.relativeLuminance2(fgR, fgG, fgB), rgb.relativeLuminance2(bgR, bgG, bgB));
        }
        return (fgR << 24 | fgG << 16 | fgB << 8 | 0xFF) >>> 0;
    }
    rgba.increaseLuminance = increaseLuminance;
    function toChannels(value) {
        return [(value >> 24) & 0xFF, (value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF];
    }
    rgba.toChannels = toChannels;
    function toColor(r, g, b, a) {
        return {
            css: channels.toCss(r, g, b, a),
            rgba: channels.toRgba(r, g, b, a)
        };
    }
    rgba.toColor = toColor;
})(rgba || (rgba = {}));
function toPaddedHex(c) {
    const s = c.toString(16);
    return s.length < 2 ? '0' + s : s;
}
function contrastRatio(l1, l2) {
    if (l1 < l2) {
        return (l2 + 0.05) / (l1 + 0.05);
    }
    return (l1 + 0.05) / (l2 + 0.05);
}

class JoinedCellData extends AttributeData {
    constructor(firstCell, chars, width) {
        super();
        this.content = 0;
        this.combinedData = '';
        this.fg = firstCell.fg;
        this.bg = firstCell.bg;
        this.combinedData = chars;
        this._width = width;
    }
    isCombined() {
        return 2097152;
    }
    getWidth() {
        return this._width;
    }
    getChars() {
        return this.combinedData;
    }
    getCode() {
        return 0x1FFFFF;
    }
    setFromCharData(value) {
        throw new Error('not implemented');
    }
    getAsCharData() {
        return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
    }
}
let CharacterJoinerService = class CharacterJoinerService {
    constructor(_bufferService) {
        this._bufferService = _bufferService;
        this._characterJoiners = [];
        this._nextCharacterJoinerId = 0;
        this._workCell = new CellData();
    }
    register(handler) {
        const joiner = {
            id: this._nextCharacterJoinerId++,
            handler
        };
        this._characterJoiners.push(joiner);
        return joiner.id;
    }
    deregister(joinerId) {
        for (let i = 0; i < this._characterJoiners.length; i++) {
            if (this._characterJoiners[i].id === joinerId) {
                this._characterJoiners.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    getJoinedCharacters(row) {
        if (this._characterJoiners.length === 0) {
            return [];
        }
        const line = this._bufferService.buffer.lines.get(row);
        if (!line || line.length === 0) {
            return [];
        }
        const ranges = [];
        const lineStr = line.translateToString(true);
        let rangeStartColumn = 0;
        let currentStringIndex = 0;
        let rangeStartStringIndex = 0;
        let rangeAttrFG = line.getFg(0);
        let rangeAttrBG = line.getBg(0);
        for (let x = 0; x < line.getTrimmedLength(); x++) {
            line.loadCell(x, this._workCell);
            if (this._workCell.getWidth() === 0) {
                continue;
            }
            if (this._workCell.fg !== rangeAttrFG || this._workCell.bg !== rangeAttrBG) {
                if (x - rangeStartColumn > 1) {
                    const joinedRanges = this._getJoinedRanges(lineStr, rangeStartStringIndex, currentStringIndex, line, rangeStartColumn);
                    for (let i = 0; i < joinedRanges.length; i++) {
                        ranges.push(joinedRanges[i]);
                    }
                }
                rangeStartColumn = x;
                rangeStartStringIndex = currentStringIndex;
                rangeAttrFG = this._workCell.fg;
                rangeAttrBG = this._workCell.bg;
            }
            currentStringIndex += this._workCell.getChars().length || WHITESPACE_CELL_CHAR.length;
        }
        if (this._bufferService.cols - rangeStartColumn > 1) {
            const joinedRanges = this._getJoinedRanges(lineStr, rangeStartStringIndex, currentStringIndex, line, rangeStartColumn);
            for (let i = 0; i < joinedRanges.length; i++) {
                ranges.push(joinedRanges[i]);
            }
        }
        return ranges;
    }
    _getJoinedRanges(line, startIndex, endIndex, lineData, startCol) {
        const text = line.substring(startIndex, endIndex);
        let allJoinedRanges = [];
        try {
            allJoinedRanges = this._characterJoiners[0].handler(text);
        }
        catch (error) {
            console.error(error);
        }
        for (let i = 1; i < this._characterJoiners.length; i++) {
            try {
                const joinerRanges = this._characterJoiners[i].handler(text);
                for (let j = 0; j < joinerRanges.length; j++) {
                    CharacterJoinerService._mergeRanges(allJoinedRanges, joinerRanges[j]);
                }
            }
            catch (error) {
                console.error(error);
            }
        }
        this._stringRangesToCellRanges(allJoinedRanges, lineData, startCol);
        return allJoinedRanges;
    }
    _stringRangesToCellRanges(ranges, line, startCol) {
        let currentRangeIndex = 0;
        let currentRangeStarted = false;
        let currentStringIndex = 0;
        let currentRange = ranges[currentRangeIndex];
        if (!currentRange) {
            return;
        }
        for (let x = startCol; x < this._bufferService.cols; x++) {
            const width = line.getWidth(x);
            const length = line.getString(x).length || WHITESPACE_CELL_CHAR.length;
            if (width === 0) {
                continue;
            }
            if (!currentRangeStarted && currentRange[0] <= currentStringIndex) {
                currentRange[0] = x;
                currentRangeStarted = true;
            }
            if (currentRange[1] <= currentStringIndex) {
                currentRange[1] = x;
                currentRange = ranges[++currentRangeIndex];
                if (!currentRange) {
                    break;
                }
                if (currentRange[0] <= currentStringIndex) {
                    currentRange[0] = x;
                    currentRangeStarted = true;
                }
                else {
                    currentRangeStarted = false;
                }
            }
            currentStringIndex += length;
        }
        if (currentRange) {
            currentRange[1] = this._bufferService.cols;
        }
    }
    static _mergeRanges(ranges, newRange) {
        let inRange = false;
        for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];
            if (!inRange) {
                if (newRange[1] <= range[0]) {
                    ranges.splice(i, 0, newRange);
                    return ranges;
                }
                if (newRange[1] <= range[1]) {
                    range[0] = Math.min(newRange[0], range[0]);
                    return ranges;
                }
                if (newRange[0] < range[1]) {
                    range[0] = Math.min(newRange[0], range[0]);
                    inRange = true;
                }
                continue;
            }
            else {
                if (newRange[1] <= range[0]) {
                    ranges[i - 1][1] = newRange[1];
                    return ranges;
                }
                if (newRange[1] <= range[1]) {
                    ranges[i - 1][1] = Math.max(newRange[1], range[1]);
                    ranges.splice(i, 1);
                    return ranges;
                }
                ranges.splice(i, 1);
                i--;
            }
        }
        if (inRange) {
            ranges[ranges.length - 1][1] = newRange[1];
        }
        else {
            ranges.push(newRange);
        }
        return ranges;
    }
};
CharacterJoinerService = __decorate([
    __param(0, IBufferService),
    __metadata("design:paramtypes", [Object])
], CharacterJoinerService);

function isPowerlineGlyph(codepoint) {
    return 0xE0A4 <= codepoint && codepoint <= 0xE0D6;
}
function isBoxOrBlockGlyph(codepoint) {
    return 0x2500 <= codepoint && codepoint <= 0x259F;
}
function excludeFromContrastRatioDemands(codepoint) {
    return isPowerlineGlyph(codepoint) || isBoxOrBlockGlyph(codepoint);
}
function createRenderDimensions() {
    return {
        css: {
            canvas: createDimension(),
            cell: createDimension()
        },
        device: {
            canvas: createDimension(),
            cell: createDimension(),
            char: {
                width: 0,
                height: 0,
                left: 0,
                top: 0
            }
        }
    };
}
function createDimension() {
    return {
        width: 0,
        height: 0
    };
}

let DomRendererRowFactory = class DomRendererRowFactory {
    constructor(_document, _characterJoinerService, _optionsService, _coreBrowserService, _coreService, _decorationService, _themeService) {
        this._document = _document;
        this._characterJoinerService = _characterJoinerService;
        this._optionsService = _optionsService;
        this._coreBrowserService = _coreBrowserService;
        this._coreService = _coreService;
        this._decorationService = _decorationService;
        this._themeService = _themeService;
        this._workCell = new CellData();
        this._columnSelectMode = false;
        this.defaultSpacing = 0;
    }
    handleSelectionChanged(start, end, columnSelectMode) {
        this._selectionStart = start;
        this._selectionEnd = end;
        this._columnSelectMode = columnSelectMode;
    }
    createRow(lineData, row, isCursorRow, cursorStyle, cursorInactiveStyle, cursorX, cursorBlink, cellWidth, widthCache, linkStart, linkEnd) {
        const elements = [];
        const joinedRanges = this._characterJoinerService.getJoinedCharacters(row);
        const colors = this._themeService.colors;
        let lineLength = lineData.getNoBgTrimmedLength();
        if (isCursorRow && lineLength < cursorX + 1) {
            lineLength = cursorX + 1;
        }
        let charElement;
        let cellAmount = 0;
        let text = '';
        let oldBg = 0;
        let oldFg = 0;
        let oldExt = 0;
        let oldLinkHover = false;
        let oldSpacing = 0;
        let oldIsInSelection = false;
        let spacing = 0;
        const classes = [];
        const hasHover = linkStart !== -1 && linkEnd !== -1;
        for (let x = 0; x < lineLength; x++) {
            lineData.loadCell(x, this._workCell);
            let width = this._workCell.getWidth();
            if (width === 0) {
                continue;
            }
            let isJoined = false;
            let lastCharX = x;
            let cell = this._workCell;
            if (joinedRanges.length > 0 && x === joinedRanges[0][0]) {
                isJoined = true;
                const range = joinedRanges.shift();
                cell = new JoinedCellData(this._workCell, lineData.translateToString(true, range[0], range[1]), range[1] - range[0]);
                lastCharX = range[1] - 1;
                width = cell.getWidth();
            }
            const isInSelection = this._isCellInSelection(x, row);
            const isCursorCell = isCursorRow && x === cursorX;
            const isLinkHover = hasHover && x >= linkStart && x <= linkEnd;
            let isDecorated = false;
            this._decorationService.forEachDecorationAtCell(x, row, undefined, d => {
                isDecorated = true;
            });
            let chars = cell.getChars() || WHITESPACE_CELL_CHAR;
            if (chars === ' ' && (cell.isUnderline() || cell.isOverline())) {
                chars = '\xa0';
            }
            spacing = width * cellWidth - widthCache.get(chars, cell.isBold(), cell.isItalic());
            if (!charElement) {
                charElement = this._document.createElement('span');
            }
            else {
                if (cellAmount
                    && ((isInSelection && oldIsInSelection)
                        || (!isInSelection && !oldIsInSelection && cell.bg === oldBg))
                    && ((isInSelection && oldIsInSelection && colors.selectionForeground)
                        || cell.fg === oldFg)
                    && cell.extended.ext === oldExt
                    && isLinkHover === oldLinkHover
                    && spacing === oldSpacing
                    && !isCursorCell
                    && !isJoined
                    && !isDecorated) {
                    if (cell.isInvisible()) {
                        text += WHITESPACE_CELL_CHAR;
                    }
                    else {
                        text += chars;
                    }
                    cellAmount++;
                    continue;
                }
                else {
                    if (cellAmount) {
                        charElement.textContent = text;
                    }
                    charElement = this._document.createElement('span');
                    cellAmount = 0;
                    text = '';
                }
            }
            oldBg = cell.bg;
            oldFg = cell.fg;
            oldExt = cell.extended.ext;
            oldLinkHover = isLinkHover;
            oldSpacing = spacing;
            oldIsInSelection = isInSelection;
            if (isJoined) {
                if (cursorX >= x && cursorX <= lastCharX) {
                    cursorX = x;
                }
            }
            if (!this._coreService.isCursorHidden && isCursorCell && this._coreService.isCursorInitialized) {
                classes.push("xterm-cursor");
                if (this._coreBrowserService.isFocused) {
                    if (cursorBlink) {
                        classes.push("xterm-cursor-blink");
                    }
                    classes.push(cursorStyle === 'bar'
                        ? "xterm-cursor-bar"
                        : cursorStyle === 'underline'
                            ? "xterm-cursor-underline"
                            : "xterm-cursor-block");
                }
                else {
                    if (cursorInactiveStyle) {
                        switch (cursorInactiveStyle) {
                            case 'outline':
                                classes.push("xterm-cursor-outline");
                                break;
                            case 'block':
                                classes.push("xterm-cursor-block");
                                break;
                            case 'bar':
                                classes.push("xterm-cursor-bar");
                                break;
                            case 'underline':
                                classes.push("xterm-cursor-underline");
                                break;
                        }
                    }
                }
            }
            if (cell.isBold()) {
                classes.push("xterm-bold");
            }
            if (cell.isItalic()) {
                classes.push("xterm-italic");
            }
            if (cell.isDim()) {
                classes.push("xterm-dim");
            }
            if (cell.isInvisible()) {
                text = WHITESPACE_CELL_CHAR;
            }
            else {
                text = cell.getChars() || WHITESPACE_CELL_CHAR;
            }
            if (cell.isUnderline()) {
                classes.push(`${"xterm-underline"}-${cell.extended.underlineStyle}`);
                if (text === ' ') {
                    text = '\xa0';
                }
                if (!cell.isUnderlineColorDefault()) {
                    if (cell.isUnderlineColorRGB()) {
                        charElement.style.textDecorationColor = `rgb(${AttributeData.toColorRGB(cell.getUnderlineColor()).join(',')})`;
                    }
                    else {
                        let fg = cell.getUnderlineColor();
                        if (this._optionsService.rawOptions.drawBoldTextInBrightColors && cell.isBold() && fg < 8) {
                            fg += 8;
                        }
                        charElement.style.textDecorationColor = colors.ansi[fg].css;
                    }
                }
            }
            if (cell.isOverline()) {
                classes.push("xterm-overline");
                if (text === ' ') {
                    text = '\xa0';
                }
            }
            if (cell.isStrikethrough()) {
                classes.push("xterm-strikethrough");
            }
            if (isLinkHover) {
                charElement.style.textDecoration = 'underline';
            }
            let fg = cell.getFgColor();
            let fgColorMode = cell.getFgColorMode();
            let bg = cell.getBgColor();
            let bgColorMode = cell.getBgColorMode();
            const isInverse = !!cell.isInverse();
            if (isInverse) {
                const temp = fg;
                fg = bg;
                bg = temp;
                const temp2 = fgColorMode;
                fgColorMode = bgColorMode;
                bgColorMode = temp2;
            }
            let bgOverride;
            let fgOverride;
            let isTop = false;
            this._decorationService.forEachDecorationAtCell(x, row, undefined, d => {
                if (d.options.layer !== 'top' && isTop) {
                    return;
                }
                if (d.backgroundColorRGB) {
                    bgColorMode = 50331648;
                    bg = d.backgroundColorRGB.rgba >> 8 & 0xFFFFFF;
                    bgOverride = d.backgroundColorRGB;
                }
                if (d.foregroundColorRGB) {
                    fgColorMode = 50331648;
                    fg = d.foregroundColorRGB.rgba >> 8 & 0xFFFFFF;
                    fgOverride = d.foregroundColorRGB;
                }
                isTop = d.options.layer === 'top';
            });
            if (!isTop && isInSelection) {
                bgOverride = this._coreBrowserService.isFocused ? colors.selectionBackgroundOpaque : colors.selectionInactiveBackgroundOpaque;
                bg = bgOverride.rgba >> 8 & 0xFFFFFF;
                bgColorMode = 50331648;
                isTop = true;
                if (colors.selectionForeground) {
                    fgColorMode = 50331648;
                    fg = colors.selectionForeground.rgba >> 8 & 0xFFFFFF;
                    fgOverride = colors.selectionForeground;
                }
            }
            if (isTop) {
                classes.push('xterm-decoration-top');
            }
            let resolvedBg;
            switch (bgColorMode) {
                case 16777216:
                case 33554432:
                    resolvedBg = colors.ansi[bg];
                    classes.push(`xterm-bg-${bg}`);
                    break;
                case 50331648:
                    resolvedBg = rgba.toColor(bg >> 16, bg >> 8 & 0xFF, bg & 0xFF);
                    this._addStyle(charElement, `background-color:#${padStart((bg >>> 0).toString(16), '0', 6)}`);
                    break;
                case 0:
                default:
                    if (isInverse) {
                        resolvedBg = colors.foreground;
                        classes.push(`xterm-bg-${INVERTED_DEFAULT_COLOR}`);
                    }
                    else {
                        resolvedBg = colors.background;
                    }
            }
            if (!bgOverride) {
                if (cell.isDim()) {
                    bgOverride = color.multiplyOpacity(resolvedBg, 0.5);
                }
            }
            switch (fgColorMode) {
                case 16777216:
                case 33554432:
                    if (cell.isBold() && fg < 8 && this._optionsService.rawOptions.drawBoldTextInBrightColors) {
                        fg += 8;
                    }
                    if (!this._applyMinimumContrast(charElement, resolvedBg, colors.ansi[fg], cell, bgOverride, undefined)) {
                        classes.push(`xterm-fg-${fg}`);
                    }
                    break;
                case 50331648:
                    const color = rgba.toColor((fg >> 16) & 0xFF, (fg >> 8) & 0xFF, (fg) & 0xFF);
                    if (!this._applyMinimumContrast(charElement, resolvedBg, color, cell, bgOverride, fgOverride)) {
                        this._addStyle(charElement, `color:#${padStart(fg.toString(16), '0', 6)}`);
                    }
                    break;
                case 0:
                default:
                    if (!this._applyMinimumContrast(charElement, resolvedBg, colors.foreground, cell, bgOverride, fgOverride)) {
                        if (isInverse) {
                            classes.push(`xterm-fg-${INVERTED_DEFAULT_COLOR}`);
                        }
                    }
            }
            if (classes.length) {
                charElement.className = classes.join(' ');
                classes.length = 0;
            }
            if (!isCursorCell && !isJoined && !isDecorated) {
                cellAmount++;
            }
            else {
                charElement.textContent = text;
            }
            if (spacing !== this.defaultSpacing) {
                charElement.style.letterSpacing = `${spacing}px`;
            }
            elements.push(charElement);
            x = lastCharX;
        }
        if (charElement && cellAmount) {
            charElement.textContent = text;
        }
        return elements;
    }
    _applyMinimumContrast(element, bg, fg, cell, bgOverride, fgOverride) {
        if (this._optionsService.rawOptions.minimumContrastRatio === 1 || excludeFromContrastRatioDemands(cell.getCode())) {
            return false;
        }
        const cache = this._getContrastCache(cell);
        let adjustedColor = undefined;
        if (!bgOverride && !fgOverride) {
            adjustedColor = cache.getColor(bg.rgba, fg.rgba);
        }
        if (adjustedColor === undefined) {
            const ratio = this._optionsService.rawOptions.minimumContrastRatio / (cell.isDim() ? 2 : 1);
            adjustedColor = color.ensureContrastRatio(bgOverride || bg, fgOverride || fg, ratio);
            cache.setColor((bgOverride || bg).rgba, (fgOverride || fg).rgba, adjustedColor !== null && adjustedColor !== void 0 ? adjustedColor : null);
        }
        if (adjustedColor) {
            this._addStyle(element, `color:${adjustedColor.css}`);
            return true;
        }
        return false;
    }
    _getContrastCache(cell) {
        if (cell.isDim()) {
            return this._themeService.colors.halfContrastCache;
        }
        return this._themeService.colors.contrastCache;
    }
    _addStyle(element, style) {
        element.setAttribute('style', `${element.getAttribute('style') || ''}${style};`);
    }
    _isCellInSelection(x, y) {
        const start = this._selectionStart;
        const end = this._selectionEnd;
        if (!start || !end) {
            return false;
        }
        if (this._columnSelectMode) {
            if (start[0] <= end[0]) {
                return x >= start[0] && y >= start[1] &&
                    x < end[0] && y <= end[1];
            }
            return x < start[0] && y >= start[1] &&
                x >= end[0] && y <= end[1];
        }
        return (y > start[1] && y < end[1]) ||
            (start[1] === end[1] && y === start[1] && x >= start[0] && x < end[0]) ||
            (start[1] < end[1] && y === end[1] && x < end[0]) ||
            (start[1] < end[1] && y === start[1] && x >= start[0]);
    }
};
DomRendererRowFactory = __decorate([
    __param(1, ICharacterJoinerService),
    __param(2, IOptionsService),
    __param(3, ICoreBrowserService),
    __param(4, ICoreService),
    __param(5, IDecorationService),
    __param(6, IThemeService),
    __metadata("design:paramtypes", [Document, Object, Object, Object, Object, Object, Object])
], DomRendererRowFactory);
function padStart(text, padChar, length) {
    while (text.length < length) {
        text = padChar + text;
    }
    return text;
}

class WidthCache {
    constructor(_document, _helperContainer) {
        this._flat = new Float32Array(256);
        this._font = '';
        this._fontSize = 0;
        this._weight = 'normal';
        this._weightBold = 'bold';
        this._measureElements = [];
        this._container = _document.createElement('div');
        this._container.classList.add('xterm-width-cache-measure-container');
        this._container.setAttribute('aria-hidden', 'true');
        this._container.style.whiteSpace = 'pre';
        this._container.style.fontKerning = 'none';
        const regular = _document.createElement('span');
        regular.classList.add('xterm-char-measure-element');
        const bold = _document.createElement('span');
        bold.classList.add('xterm-char-measure-element');
        bold.style.fontWeight = 'bold';
        const italic = _document.createElement('span');
        italic.classList.add('xterm-char-measure-element');
        italic.style.fontStyle = 'italic';
        const boldItalic = _document.createElement('span');
        boldItalic.classList.add('xterm-char-measure-element');
        boldItalic.style.fontWeight = 'bold';
        boldItalic.style.fontStyle = 'italic';
        this._measureElements = [regular, bold, italic, boldItalic];
        this._container.appendChild(regular);
        this._container.appendChild(bold);
        this._container.appendChild(italic);
        this._container.appendChild(boldItalic);
        _helperContainer.appendChild(this._container);
        this.clear();
    }
    dispose() {
        this._container.remove();
        this._measureElements.length = 0;
        this._holey = undefined;
    }
    clear() {
        this._flat.fill(-9999);
        this._holey = new Map();
    }
    setFont(font, fontSize, weight, weightBold) {
        if (font === this._font
            && fontSize === this._fontSize
            && weight === this._weight
            && weightBold === this._weightBold) {
            return;
        }
        this._font = font;
        this._fontSize = fontSize;
        this._weight = weight;
        this._weightBold = weightBold;
        this._container.style.fontFamily = this._font;
        this._container.style.fontSize = `${this._fontSize}px`;
        this._measureElements[0].style.fontWeight = `${weight}`;
        this._measureElements[1].style.fontWeight = `${weightBold}`;
        this._measureElements[2].style.fontWeight = `${weight}`;
        this._measureElements[3].style.fontWeight = `${weightBold}`;
        this.clear();
    }
    get(c, bold, italic) {
        let cp = 0;
        if (!bold && !italic && c.length === 1 && (cp = c.charCodeAt(0)) < 256) {
            return this._flat[cp] !== -9999
                ? this._flat[cp]
                : (this._flat[cp] = this._measure(c, 0));
        }
        let key = c;
        if (bold)
            key += 'B';
        if (italic)
            key += 'I';
        let width = this._holey.get(key);
        if (width === undefined) {
            let variant = 0;
            if (bold)
                variant |= 1;
            if (italic)
                variant |= 2;
            width = this._measure(c, variant);
            this._holey.set(key, width);
        }
        return width;
    }
    _measure(c, variant) {
        const el = this._measureElements[variant];
        el.textContent = c.repeat(32);
        return el.offsetWidth / 32;
    }
}

class SelectionRenderModel {
    constructor() {
        this.clear();
    }
    clear() {
        this.hasSelection = false;
        this.columnSelectMode = false;
        this.viewportStartRow = 0;
        this.viewportEndRow = 0;
        this.viewportCappedStartRow = 0;
        this.viewportCappedEndRow = 0;
        this.startCol = 0;
        this.endCol = 0;
        this.selectionStart = undefined;
        this.selectionEnd = undefined;
    }
    update(terminal, start, end, columnSelectMode = false) {
        this.selectionStart = start;
        this.selectionEnd = end;
        if (!start || !end || (start[0] === end[0] && start[1] === end[1])) {
            this.clear();
            return;
        }
        const viewportY = terminal.buffers.active.ydisp;
        const viewportStartRow = start[1] - viewportY;
        const viewportEndRow = end[1] - viewportY;
        const viewportCappedStartRow = Math.max(viewportStartRow, 0);
        const viewportCappedEndRow = Math.min(viewportEndRow, terminal.rows - 1);
        if (viewportCappedStartRow >= terminal.rows || viewportCappedEndRow < 0) {
            this.clear();
            return;
        }
        this.hasSelection = true;
        this.columnSelectMode = columnSelectMode;
        this.viewportStartRow = viewportStartRow;
        this.viewportEndRow = viewportEndRow;
        this.viewportCappedStartRow = viewportCappedStartRow;
        this.viewportCappedEndRow = viewportCappedEndRow;
        this.startCol = start[0];
        this.endCol = end[0];
    }
    isCellSelected(terminal, x, y) {
        if (!this.hasSelection) {
            return false;
        }
        y -= terminal.buffer.active.viewportY;
        if (this.columnSelectMode) {
            if (this.startCol <= this.endCol) {
                return x >= this.startCol && y >= this.viewportCappedStartRow &&
                    x < this.endCol && y <= this.viewportCappedEndRow;
            }
            return x < this.startCol && y >= this.viewportCappedStartRow &&
                x >= this.endCol && y <= this.viewportCappedEndRow;
        }
        return (y > this.viewportStartRow && y < this.viewportEndRow) ||
            (this.viewportStartRow === this.viewportEndRow && y === this.viewportStartRow && x >= this.startCol && x < this.endCol) ||
            (this.viewportStartRow < this.viewportEndRow && y === this.viewportEndRow && x < this.endCol) ||
            (this.viewportStartRow < this.viewportEndRow && y === this.viewportStartRow && x >= this.startCol);
    }
}
function createSelectionRenderModel() {
    return new SelectionRenderModel();
}

const TERMINAL_CLASS_PREFIX = 'xterm-dom-renderer-owner-';
const ROW_CONTAINER_CLASS = 'xterm-rows';
const FG_CLASS_PREFIX = 'xterm-fg-';
const BG_CLASS_PREFIX = 'xterm-bg-';
const FOCUS_CLASS = 'xterm-focus';
const SELECTION_CLASS = 'xterm-selection';
let nextTerminalId = 1;
let DomRenderer = class DomRenderer extends Disposable {
    constructor(_terminal, _document, _element, _screenElement, _viewportElement, _helperContainer, _linkifier2, instantiationService, _charSizeService, _optionsService, _bufferService, _coreBrowserService, _themeService) {
        super();
        this._terminal = _terminal;
        this._document = _document;
        this._element = _element;
        this._screenElement = _screenElement;
        this._viewportElement = _viewportElement;
        this._helperContainer = _helperContainer;
        this._linkifier2 = _linkifier2;
        this._charSizeService = _charSizeService;
        this._optionsService = _optionsService;
        this._bufferService = _bufferService;
        this._coreBrowserService = _coreBrowserService;
        this._themeService = _themeService;
        this._terminalClass = nextTerminalId++;
        this._rowElements = [];
        this._selectionRenderModel = createSelectionRenderModel();
        this.onRequestRedraw = this.register(new EventEmitter()).event;
        this._rowContainer = this._document.createElement('div');
        this._rowContainer.classList.add(ROW_CONTAINER_CLASS);
        this._rowContainer.style.lineHeight = 'normal';
        this._rowContainer.setAttribute('aria-hidden', 'true');
        this._refreshRowElements(this._bufferService.cols, this._bufferService.rows);
        this._selectionContainer = this._document.createElement('div');
        this._selectionContainer.classList.add(SELECTION_CLASS);
        this._selectionContainer.setAttribute('aria-hidden', 'true');
        this.dimensions = createRenderDimensions();
        this._updateDimensions();
        this.register(this._optionsService.onOptionChange(() => this._handleOptionsChanged()));
        this.register(this._themeService.onChangeColors(e => this._injectCss(e)));
        this._injectCss(this._themeService.colors);
        this._rowFactory = instantiationService.createInstance(DomRendererRowFactory, document);
        this._element.classList.add(TERMINAL_CLASS_PREFIX + this._terminalClass);
        this._screenElement.appendChild(this._rowContainer);
        this._screenElement.appendChild(this._selectionContainer);
        this.register(this._linkifier2.onShowLinkUnderline(e => this._handleLinkHover(e)));
        this.register(this._linkifier2.onHideLinkUnderline(e => this._handleLinkLeave(e)));
        this.register(toDisposable(() => {
            this._element.classList.remove(TERMINAL_CLASS_PREFIX + this._terminalClass);
            this._rowContainer.remove();
            this._selectionContainer.remove();
            this._widthCache.dispose();
            this._themeStyleElement.remove();
            this._dimensionsStyleElement.remove();
        }));
        this._widthCache = new WidthCache(this._document, this._helperContainer);
        this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold);
        this._setDefaultSpacing();
    }
    _updateDimensions() {
        const dpr = this._coreBrowserService.dpr;
        this.dimensions.device.char.width = this._charSizeService.width * dpr;
        this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * dpr);
        this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing);
        this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight);
        this.dimensions.device.char.left = 0;
        this.dimensions.device.char.top = 0;
        this.dimensions.device.canvas.width = this.dimensions.device.cell.width * this._bufferService.cols;
        this.dimensions.device.canvas.height = this.dimensions.device.cell.height * this._bufferService.rows;
        this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / dpr);
        this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / dpr);
        this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols;
        this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows;
        for (const element of this._rowElements) {
            element.style.width = `${this.dimensions.css.canvas.width}px`;
            element.style.height = `${this.dimensions.css.cell.height}px`;
            element.style.lineHeight = `${this.dimensions.css.cell.height}px`;
            element.style.overflow = 'hidden';
        }
        if (!this._dimensionsStyleElement) {
            this._dimensionsStyleElement = this._document.createElement('style');
            this._screenElement.appendChild(this._dimensionsStyleElement);
        }
        const styles = `${this._terminalSelector} .${ROW_CONTAINER_CLASS} span {` +
            ` display: inline-block;` +
            ` height: 100%;` +
            ` vertical-align: top;` +
            `}`;
        this._dimensionsStyleElement.textContent = styles;
        this._selectionContainer.style.height = this._viewportElement.style.height;
        this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`;
        this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
    }
    _injectCss(colors) {
        if (!this._themeStyleElement) {
            this._themeStyleElement = this._document.createElement('style');
            this._screenElement.appendChild(this._themeStyleElement);
        }
        let styles = `${this._terminalSelector} .${ROW_CONTAINER_CLASS} {` +
            ` color: ${colors.foreground.css};` +
            ` font-family: ${this._optionsService.rawOptions.fontFamily};` +
            ` font-size: ${this._optionsService.rawOptions.fontSize}px;` +
            ` font-kerning: none;` +
            ` white-space: pre` +
            `}`;
        styles +=
            `${this._terminalSelector} .${ROW_CONTAINER_CLASS} .xterm-dim {` +
                ` color: ${color.multiplyOpacity(colors.foreground, 0.5).css};` +
                `}`;
        styles +=
            `${this._terminalSelector} span:not(.${"xterm-bold"}) {` +
                ` font-weight: ${this._optionsService.rawOptions.fontWeight};` +
                `}` +
                `${this._terminalSelector} span.${"xterm-bold"} {` +
                ` font-weight: ${this._optionsService.rawOptions.fontWeightBold};` +
                `}` +
                `${this._terminalSelector} span.${"xterm-italic"} {` +
                ` font-style: italic;` +
                `}`;
        styles +=
            `@keyframes blink_box_shadow` + `_` + this._terminalClass + ` {` +
                ` 50% {` +
                `  border-bottom-style: hidden;` +
                ` }` +
                `}`;
        styles +=
            `@keyframes blink_block` + `_` + this._terminalClass + ` {` +
                ` 0% {` +
                `  background-color: ${colors.cursor.css};` +
                `  color: ${colors.cursorAccent.css};` +
                ` }` +
                ` 50% {` +
                `  background-color: inherit;` +
                `  color: ${colors.cursor.css};` +
                ` }` +
                `}`;
        styles +=
            `${this._terminalSelector} .${ROW_CONTAINER_CLASS}.${FOCUS_CLASS} .${"xterm-cursor"}.${"xterm-cursor-blink"}:not(.${"xterm-cursor-block"}) {` +
                ` animation: blink_box_shadow` + `_` + this._terminalClass + ` 1s step-end infinite;` +
                `}` +
                `${this._terminalSelector} .${ROW_CONTAINER_CLASS}.${FOCUS_CLASS} .${"xterm-cursor"}.${"xterm-cursor-blink"}.${"xterm-cursor-block"} {` +
                ` animation: blink_block` + `_` + this._terminalClass + ` 1s step-end infinite;` +
                `}` +
                `${this._terminalSelector} .${ROW_CONTAINER_CLASS} .${"xterm-cursor"}.${"xterm-cursor-block"} {` +
                ` background-color: ${colors.cursor.css} !important;` +
                ` color: ${colors.cursorAccent.css} !important;` +
                `}` +
                `${this._terminalSelector} .${ROW_CONTAINER_CLASS} .${"xterm-cursor"}.${"xterm-cursor-outline"} {` +
                ` outline: 1px solid ${colors.cursor.css};` +
                ` outline-offset: -1px;` +
                `}` +
                `${this._terminalSelector} .${ROW_CONTAINER_CLASS} .${"xterm-cursor"}.${"xterm-cursor-bar"} {` +
                ` box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${colors.cursor.css} inset;` +
                `}` +
                `${this._terminalSelector} .${ROW_CONTAINER_CLASS} .${"xterm-cursor"}.${"xterm-cursor-underline"} {` +
                ` border-bottom: 1px ${colors.cursor.css};` +
                ` border-bottom-style: solid;` +
                ` height: calc(100% - 1px);` +
                `}`;
        styles +=
            `${this._terminalSelector} .${SELECTION_CLASS} {` +
                ` position: absolute;` +
                ` top: 0;` +
                ` left: 0;` +
                ` z-index: 1;` +
                ` pointer-events: none;` +
                `}` +
                `${this._terminalSelector}.focus .${SELECTION_CLASS} div {` +
                ` position: absolute;` +
                ` background-color: ${colors.selectionBackgroundOpaque.css};` +
                `}` +
                `${this._terminalSelector} .${SELECTION_CLASS} div {` +
                ` position: absolute;` +
                ` background-color: ${colors.selectionInactiveBackgroundOpaque.css};` +
                `}`;
        for (const [i, c] of colors.ansi.entries()) {
            styles +=
                `${this._terminalSelector} .${FG_CLASS_PREFIX}${i} { color: ${c.css}; }` +
                    `${this._terminalSelector} .${FG_CLASS_PREFIX}${i}.${"xterm-dim"} { color: ${color.multiplyOpacity(c, 0.5).css}; }` +
                    `${this._terminalSelector} .${BG_CLASS_PREFIX}${i} { background-color: ${c.css}; }`;
        }
        styles +=
            `${this._terminalSelector} .${FG_CLASS_PREFIX}${INVERTED_DEFAULT_COLOR} { color: ${color.opaque(colors.background).css}; }` +
                `${this._terminalSelector} .${FG_CLASS_PREFIX}${INVERTED_DEFAULT_COLOR}.${"xterm-dim"} { color: ${color.multiplyOpacity(color.opaque(colors.background), 0.5).css}; }` +
                `${this._terminalSelector} .${BG_CLASS_PREFIX}${INVERTED_DEFAULT_COLOR} { background-color: ${colors.foreground.css}; }`;
        this._themeStyleElement.textContent = styles;
    }
    _setDefaultSpacing() {
        const spacing = this.dimensions.css.cell.width - this._widthCache.get('W', false, false);
        this._rowContainer.style.letterSpacing = `${spacing}px`;
        this._rowFactory.defaultSpacing = spacing;
    }
    handleDevicePixelRatioChange() {
        this._updateDimensions();
        this._widthCache.clear();
        this._setDefaultSpacing();
    }
    _refreshRowElements(cols, rows) {
        for (let i = this._rowElements.length; i <= rows; i++) {
            const row = this._document.createElement('div');
            this._rowContainer.appendChild(row);
            this._rowElements.push(row);
        }
        while (this._rowElements.length > rows) {
            this._rowContainer.removeChild(this._rowElements.pop());
        }
    }
    handleResize(cols, rows) {
        this._refreshRowElements(cols, rows);
        this._updateDimensions();
        this.handleSelectionChanged(this._selectionRenderModel.selectionStart, this._selectionRenderModel.selectionEnd, this._selectionRenderModel.columnSelectMode);
    }
    handleCharSizeChanged() {
        this._updateDimensions();
        this._widthCache.clear();
        this._setDefaultSpacing();
    }
    handleBlur() {
        this._rowContainer.classList.remove(FOCUS_CLASS);
        this.renderRows(0, this._bufferService.rows - 1);
    }
    handleFocus() {
        this._rowContainer.classList.add(FOCUS_CLASS);
        this.renderRows(this._bufferService.buffer.y, this._bufferService.buffer.y);
    }
    handleSelectionChanged(start, end, columnSelectMode) {
        this._selectionContainer.replaceChildren();
        this._rowFactory.handleSelectionChanged(start, end, columnSelectMode);
        this.renderRows(0, this._bufferService.rows - 1);
        if (!start || !end) {
            return;
        }
        this._selectionRenderModel.update(this._terminal, start, end, columnSelectMode);
        const viewportStartRow = this._selectionRenderModel.viewportStartRow;
        const viewportEndRow = this._selectionRenderModel.viewportEndRow;
        const viewportCappedStartRow = this._selectionRenderModel.viewportCappedStartRow;
        const viewportCappedEndRow = this._selectionRenderModel.viewportCappedEndRow;
        if (viewportCappedStartRow >= this._bufferService.rows || viewportCappedEndRow < 0) {
            return;
        }
        const documentFragment = this._document.createDocumentFragment();
        if (columnSelectMode) {
            const isXFlipped = start[0] > end[0];
            documentFragment.appendChild(this._createSelectionElement(viewportCappedStartRow, isXFlipped ? end[0] : start[0], isXFlipped ? start[0] : end[0], viewportCappedEndRow - viewportCappedStartRow + 1));
        }
        else {
            const startCol = viewportStartRow === viewportCappedStartRow ? start[0] : 0;
            const endCol = viewportCappedStartRow === viewportEndRow ? end[0] : this._bufferService.cols;
            documentFragment.appendChild(this._createSelectionElement(viewportCappedStartRow, startCol, endCol));
            const middleRowsCount = viewportCappedEndRow - viewportCappedStartRow - 1;
            documentFragment.appendChild(this._createSelectionElement(viewportCappedStartRow + 1, 0, this._bufferService.cols, middleRowsCount));
            if (viewportCappedStartRow !== viewportCappedEndRow) {
                const endCol = viewportEndRow === viewportCappedEndRow ? end[0] : this._bufferService.cols;
                documentFragment.appendChild(this._createSelectionElement(viewportCappedEndRow, 0, endCol));
            }
        }
        this._selectionContainer.appendChild(documentFragment);
    }
    _createSelectionElement(row, colStart, colEnd, rowCount = 1) {
        const element = this._document.createElement('div');
        const left = colStart * this.dimensions.css.cell.width;
        let width = this.dimensions.css.cell.width * (colEnd - colStart);
        if (left + width > this.dimensions.css.canvas.width) {
            width = this.dimensions.css.canvas.width - left;
        }
        element.style.height = `${rowCount * this.dimensions.css.cell.height}px`;
        element.style.top = `${row * this.dimensions.css.cell.height}px`;
        element.style.left = `${left}px`;
        element.style.width = `${width}px`;
        return element;
    }
    handleCursorMove() {
    }
    _handleOptionsChanged() {
        this._updateDimensions();
        this._injectCss(this._themeService.colors);
        this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold);
        this._setDefaultSpacing();
    }
    clear() {
        for (const e of this._rowElements) {
            e.replaceChildren();
        }
    }
    renderRows(start, end) {
        const buffer = this._bufferService.buffer;
        const cursorAbsoluteY = buffer.ybase + buffer.y;
        const cursorX = Math.min(buffer.x, this._bufferService.cols - 1);
        const cursorBlink = this._optionsService.rawOptions.cursorBlink;
        const cursorStyle = this._optionsService.rawOptions.cursorStyle;
        const cursorInactiveStyle = this._optionsService.rawOptions.cursorInactiveStyle;
        for (let y = start; y <= end; y++) {
            const row = y + buffer.ydisp;
            const rowElement = this._rowElements[y];
            const lineData = buffer.lines.get(row);
            if (!rowElement || !lineData) {
                break;
            }
            rowElement.replaceChildren(...this._rowFactory.createRow(lineData, row, row === cursorAbsoluteY, cursorStyle, cursorInactiveStyle, cursorX, cursorBlink, this.dimensions.css.cell.width, this._widthCache, -1, -1));
        }
    }
    get _terminalSelector() {
        return `.${TERMINAL_CLASS_PREFIX}${this._terminalClass}`;
    }
    _handleLinkHover(e) {
        this._setCellUnderline(e.x1, e.x2, e.y1, e.y2, e.cols, true);
    }
    _handleLinkLeave(e) {
        this._setCellUnderline(e.x1, e.x2, e.y1, e.y2, e.cols, false);
    }
    _setCellUnderline(x, x2, y, y2, cols, enabled) {
        if (y < 0)
            x = 0;
        if (y2 < 0)
            x2 = 0;
        const maxY = this._bufferService.rows - 1;
        y = Math.max(Math.min(y, maxY), 0);
        y2 = Math.max(Math.min(y2, maxY), 0);
        cols = Math.min(cols, this._bufferService.cols);
        const buffer = this._bufferService.buffer;
        const cursorAbsoluteY = buffer.ybase + buffer.y;
        const cursorX = Math.min(buffer.x, cols - 1);
        const cursorBlink = this._optionsService.rawOptions.cursorBlink;
        const cursorStyle = this._optionsService.rawOptions.cursorStyle;
        const cursorInactiveStyle = this._optionsService.rawOptions.cursorInactiveStyle;
        for (let i = y; i <= y2; ++i) {
            const row = i + buffer.ydisp;
            const rowElement = this._rowElements[i];
            const bufferline = buffer.lines.get(row);
            if (!rowElement || !bufferline) {
                break;
            }
            rowElement.replaceChildren(...this._rowFactory.createRow(bufferline, row, row === cursorAbsoluteY, cursorStyle, cursorInactiveStyle, cursorX, cursorBlink, this.dimensions.css.cell.width, this._widthCache, enabled ? (i === y ? x : 0) : -1, enabled ? ((i === y2 ? x2 : cols) - 1) : -1));
        }
    }
};
DomRenderer = __decorate([
    __param(7, IInstantiationService),
    __param(8, ICharSizeService$1),
    __param(9, IOptionsService),
    __param(10, IBufferService),
    __param(11, ICoreBrowserService),
    __param(12, IThemeService),
    __metadata("design:paramtypes", [Object, Document,
        HTMLElement,
        HTMLElement,
        HTMLElement,
        HTMLElement, Object, Object, Object, Object, Object, Object, Object])
], DomRenderer);

let CharSizeService = class CharSizeService extends Disposable {
    get hasValidSize() { return this.width > 0 && this.height > 0; }
    constructor(document, parentElement, _optionsService) {
        super();
        this._optionsService = _optionsService;
        this.width = 0;
        this.height = 0;
        this._onCharSizeChange = this.register(new EventEmitter());
        this.onCharSizeChange = this._onCharSizeChange.event;
        this._measureStrategy = new DomMeasureStrategy(document, parentElement, this._optionsService);
        this.register(this._optionsService.onMultipleOptionChange(['fontFamily', 'fontSize'], () => this.measure()));
    }
    measure() {
        const result = this._measureStrategy.measure();
        if (result.width !== this.width || result.height !== this.height) {
            this.width = result.width;
            this.height = result.height;
            this._onCharSizeChange.fire();
        }
    }
};
CharSizeService = __decorate([
    __param(2, IOptionsService),
    __metadata("design:paramtypes", [Document,
        HTMLElement, Object])
], CharSizeService);
class DomMeasureStrategy {
    constructor(_document, _parentElement, _optionsService) {
        this._document = _document;
        this._parentElement = _parentElement;
        this._optionsService = _optionsService;
        this._result = { width: 0, height: 0 };
        this._measureElement = this._document.createElement('span');
        this._measureElement.classList.add('xterm-char-measure-element');
        this._measureElement.textContent = 'W'.repeat(32);
        this._measureElement.setAttribute('aria-hidden', 'true');
        this._measureElement.style.whiteSpace = 'pre';
        this._measureElement.style.fontKerning = 'none';
        this._parentElement.appendChild(this._measureElement);
    }
    measure() {
        this._measureElement.style.fontFamily = this._optionsService.rawOptions.fontFamily;
        this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`;
        const geometry = {
            height: Number(this._measureElement.offsetHeight),
            width: Number(this._measureElement.offsetWidth)
        };
        if (geometry.width !== 0 && geometry.height !== 0) {
            this._result.width = geometry.width / 32;
            this._result.height = Math.ceil(geometry.height);
        }
        return this._result;
    }
}

class CoreBrowserService extends Disposable {
    constructor(_textarea, _window, mainDocument) {
        super();
        this._textarea = _textarea;
        this._window = _window;
        this.mainDocument = mainDocument;
        this._isFocused = false;
        this._cachedIsFocused = undefined;
        this._screenDprMonitor = new ScreenDprMonitor(this._window);
        this._onDprChange = this.register(new EventEmitter());
        this.onDprChange = this._onDprChange.event;
        this._onWindowChange = this.register(new EventEmitter());
        this.onWindowChange = this._onWindowChange.event;
        this.register(this.onWindowChange(w => this._screenDprMonitor.setWindow(w)));
        this.register(forwardEvent(this._screenDprMonitor.onDprChange, this._onDprChange));
        this._textarea.addEventListener('focus', () => this._isFocused = true);
        this._textarea.addEventListener('blur', () => this._isFocused = false);
    }
    get window() {
        return this._window;
    }
    set window(value) {
        if (this._window !== value) {
            this._window = value;
            this._onWindowChange.fire(this._window);
        }
    }
    get dpr() {
        return this.window.devicePixelRatio;
    }
    get isFocused() {
        if (this._cachedIsFocused === undefined) {
            this._cachedIsFocused = this._isFocused && this._textarea.ownerDocument.hasFocus();
            queueMicrotask(() => this._cachedIsFocused = undefined);
        }
        return this._cachedIsFocused;
    }
}
class ScreenDprMonitor extends Disposable {
    constructor(_parentWindow) {
        super();
        this._parentWindow = _parentWindow;
        this._windowResizeListener = this.register(new MutableDisposable());
        this._onDprChange = this.register(new EventEmitter());
        this.onDprChange = this._onDprChange.event;
        this._outerListener = () => this._setDprAndFireIfDiffers();
        this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio;
        this._updateDpr();
        this._setWindowResizeListener();
        this.register(toDisposable(() => this.clearListener()));
    }
    setWindow(parentWindow) {
        this._parentWindow = parentWindow;
        this._setWindowResizeListener();
        this._setDprAndFireIfDiffers();
    }
    _setWindowResizeListener() {
        this._windowResizeListener.value = addDisposableDomListener(this._parentWindow, 'resize', () => this._setDprAndFireIfDiffers());
    }
    _setDprAndFireIfDiffers() {
        if (this._parentWindow.devicePixelRatio !== this._currentDevicePixelRatio) {
            this._onDprChange.fire(this._parentWindow.devicePixelRatio);
        }
        this._updateDpr();
    }
    _updateDpr() {
        var _a;
        if (!this._outerListener) {
            return;
        }
        (_a = this._resolutionMediaMatchList) === null || _a === void 0 ? void 0 : _a.removeListener(this._outerListener);
        this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio;
        this._resolutionMediaMatchList = this._parentWindow.matchMedia(`screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`);
        this._resolutionMediaMatchList.addListener(this._outerListener);
    }
    clearListener() {
        if (!this._resolutionMediaMatchList || !this._outerListener) {
            return;
        }
        this._resolutionMediaMatchList.removeListener(this._outerListener);
        this._resolutionMediaMatchList = undefined;
        this._outerListener = undefined;
    }
}

const ICharSizeService = createDecorator('CharSizeService');
createDecorator('CoreBrowserService');
createDecorator('MouseService');
const IRenderService = createDecorator('RenderService');
createDecorator('SelectionService');
createDecorator('CharacterJoinerService');
createDecorator('ThemeService');

function getCoordsRelativeToElement(window, event, element) {
    const rect = element.getBoundingClientRect();
    const elementStyle = window.getComputedStyle(element);
    const leftPadding = parseInt(elementStyle.getPropertyValue('padding-left'));
    const topPadding = parseInt(elementStyle.getPropertyValue('padding-top'));
    return [
        event.clientX - rect.left - leftPadding,
        event.clientY - rect.top - topPadding
    ];
}
function getCoords(window, event, element, colCount, rowCount, hasValidCharSize, cssCellWidth, cssCellHeight, isSelection) {
    if (!hasValidCharSize) {
        return undefined;
    }
    const coords = getCoordsRelativeToElement(window, event, element);
    if (!coords) {
        return undefined;
    }
    coords[0] = Math.ceil((coords[0] + (isSelection ? cssCellWidth / 2 : 0)) / cssCellWidth);
    coords[1] = Math.ceil(coords[1] / cssCellHeight);
    coords[0] = Math.min(Math.max(coords[0], 1), colCount + (isSelection ? 1 : 0));
    coords[1] = Math.min(Math.max(coords[1], 1), rowCount);
    return coords;
}

let MouseService = class MouseService {
    constructor(_renderService, _charSizeService) {
        this._renderService = _renderService;
        this._charSizeService = _charSizeService;
    }
    getCoords(event, element, colCount, rowCount, isSelection) {
        return getCoords(window, event, element, colCount, rowCount, this._charSizeService.hasValidSize, this._renderService.dimensions.css.cell.width, this._renderService.dimensions.css.cell.height, isSelection);
    }
    getMouseReportCoords(event, element) {
        const coords = getCoordsRelativeToElement(window, event, element);
        if (!this._charSizeService.hasValidSize) {
            return undefined;
        }
        coords[0] = Math.min(Math.max(coords[0], 0), this._renderService.dimensions.css.canvas.width - 1);
        coords[1] = Math.min(Math.max(coords[1], 0), this._renderService.dimensions.css.canvas.height - 1);
        return {
            col: Math.floor(coords[0] / this._renderService.dimensions.css.cell.width),
            row: Math.floor(coords[1] / this._renderService.dimensions.css.cell.height),
            x: Math.floor(coords[0]),
            y: Math.floor(coords[1])
        };
    }
};
MouseService = __decorate([
    __param(0, IRenderService),
    __param(1, ICharSizeService),
    __metadata("design:paramtypes", [Object, Object])
], MouseService);

class RenderDebouncer {
    constructor(_parentWindow, _renderCallback) {
        this._parentWindow = _parentWindow;
        this._renderCallback = _renderCallback;
        this._refreshCallbacks = [];
    }
    dispose() {
        if (this._animationFrame) {
            this._parentWindow.cancelAnimationFrame(this._animationFrame);
            this._animationFrame = undefined;
        }
    }
    addRefreshCallback(callback) {
        this._refreshCallbacks.push(callback);
        if (!this._animationFrame) {
            this._animationFrame = this._parentWindow.requestAnimationFrame(() => this._innerRefresh());
        }
        return this._animationFrame;
    }
    refresh(rowStart, rowEnd, rowCount) {
        this._rowCount = rowCount;
        rowStart = rowStart !== undefined ? rowStart : 0;
        rowEnd = rowEnd !== undefined ? rowEnd : this._rowCount - 1;
        this._rowStart = this._rowStart !== undefined ? Math.min(this._rowStart, rowStart) : rowStart;
        this._rowEnd = this._rowEnd !== undefined ? Math.max(this._rowEnd, rowEnd) : rowEnd;
        if (this._animationFrame) {
            return;
        }
        this._animationFrame = this._parentWindow.requestAnimationFrame(() => this._innerRefresh());
    }
    _innerRefresh() {
        this._animationFrame = undefined;
        if (this._rowStart === undefined || this._rowEnd === undefined || this._rowCount === undefined) {
            this._runRefreshCallbacks();
            return;
        }
        const start = Math.max(this._rowStart, 0);
        const end = Math.min(this._rowEnd, this._rowCount - 1);
        this._rowStart = undefined;
        this._rowEnd = undefined;
        this._renderCallback(start, end);
        this._runRefreshCallbacks();
    }
    _runRefreshCallbacks() {
        for (const callback of this._refreshCallbacks) {
            callback(0);
        }
        this._refreshCallbacks = [];
    }
}

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
class DebouncedIdleTask {
    constructor() {
        this._queue = new IdleTaskQueue();
    }
    set(task) {
        this._queue.clear();
        this._queue.enqueue(task);
    }
    flush() {
        this._queue.flush();
    }
}

let RenderService = class RenderService extends Disposable {
    get dimensions() { return this._renderer.value.dimensions; }
    constructor(_rowCount, screenElement, optionsService, _charSizeService, decorationService, bufferService, coreBrowserService, instantiationService, themeService) {
        super();
        this._rowCount = _rowCount;
        this._charSizeService = _charSizeService;
        this._renderer = this.register(new MutableDisposable());
        this._pausedResizeTask = new DebouncedIdleTask();
        this._isPaused = false;
        this._needsFullRefresh = false;
        this._isNextRenderRedrawOnly = true;
        this._needsSelectionRefresh = false;
        this._canvasWidth = 0;
        this._canvasHeight = 0;
        this._selectionState = {
            start: undefined,
            end: undefined,
            columnSelectMode: false
        };
        this._onDimensionsChange = this.register(new EventEmitter());
        this.onDimensionsChange = this._onDimensionsChange.event;
        this._onRenderedViewportChange = this.register(new EventEmitter());
        this.onRenderedViewportChange = this._onRenderedViewportChange.event;
        this._onRender = this.register(new EventEmitter());
        this.onRender = this._onRender.event;
        this._onRefreshRequest = this.register(new EventEmitter());
        this.onRefreshRequest = this._onRefreshRequest.event;
        this._renderDebouncer = new RenderDebouncer(coreBrowserService.window, (start, end) => this._renderRows(start, end));
        this.register(this._renderDebouncer);
        this.register(coreBrowserService.onDprChange(() => this.handleDevicePixelRatioChange()));
        this.register(bufferService.onResize(() => this._fullRefresh()));
        this.register(bufferService.buffers.onBufferActivate(() => { var _a; return (_a = this._renderer.value) === null || _a === void 0 ? void 0 : _a.clear(); }));
        this.register(optionsService.onOptionChange(() => this._handleOptionsChanged()));
        this.register(this._charSizeService.onCharSizeChange(() => this.handleCharSizeChanged()));
        this.register(decorationService.onDecorationRegistered(() => this._fullRefresh()));
        this.register(decorationService.onDecorationRemoved(() => this._fullRefresh()));
        this.register(optionsService.onMultipleOptionChange([
            'customGlyphs',
            'drawBoldTextInBrightColors',
            'letterSpacing',
            'lineHeight',
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontWeightBold',
            'minimumContrastRatio'
        ], () => {
            this.clear();
            this.handleResize(bufferService.cols, bufferService.rows);
            this._fullRefresh();
        }));
        this.register(optionsService.onMultipleOptionChange([
            'cursorBlink',
            'cursorStyle'
        ], () => this.refreshRows(bufferService.buffer.y, bufferService.buffer.y, true)));
        this.register(themeService.onChangeColors(() => this._fullRefresh()));
        if ('IntersectionObserver' in coreBrowserService.window) {
            const observer = new coreBrowserService.window.IntersectionObserver(e => this._handleIntersectionChange(e[e.length - 1]), { threshold: 0 });
            observer.observe(screenElement);
            this.register({ dispose: () => observer.disconnect() });
        }
    }
    _handleIntersectionChange(entry) {
        this._isPaused = entry.isIntersecting === undefined ? (entry.intersectionRatio === 0) : !entry.isIntersecting;
        if (!this._isPaused && !this._charSizeService.hasValidSize) {
            this._charSizeService.measure();
        }
        if (!this._isPaused && this._needsFullRefresh) {
            this._pausedResizeTask.flush();
            this.refreshRows(0, this._rowCount - 1);
            this._needsFullRefresh = false;
        }
    }
    refreshRows(start, end, isRedrawOnly = false) {
        if (this._isPaused) {
            this._needsFullRefresh = true;
            return;
        }
        if (!isRedrawOnly) {
            this._isNextRenderRedrawOnly = false;
        }
        this._renderDebouncer.refresh(start, end, this._rowCount);
    }
    _renderRows(start, end) {
        if (!this._renderer.value) {
            return;
        }
        start = Math.min(start, this._rowCount - 1);
        end = Math.min(end, this._rowCount - 1);
        this._renderer.value.renderRows(start, end);
        if (this._needsSelectionRefresh) {
            this._renderer.value.handleSelectionChanged(this._selectionState.start, this._selectionState.end, this._selectionState.columnSelectMode);
            this._needsSelectionRefresh = false;
        }
        if (!this._isNextRenderRedrawOnly) {
            this._onRenderedViewportChange.fire({ start, end });
        }
        this._onRender.fire({ start, end });
        this._isNextRenderRedrawOnly = true;
    }
    resize(cols, rows) {
        this._rowCount = rows;
        this._fireOnCanvasResize();
    }
    _handleOptionsChanged() {
        if (!this._renderer.value) {
            return;
        }
        this.refreshRows(0, this._rowCount - 1);
        this._fireOnCanvasResize();
    }
    _fireOnCanvasResize() {
        if (!this._renderer.value) {
            return;
        }
        if (this._renderer.value.dimensions.css.canvas.width === this._canvasWidth && this._renderer.value.dimensions.css.canvas.height === this._canvasHeight) {
            return;
        }
        this._onDimensionsChange.fire(this._renderer.value.dimensions);
    }
    hasRenderer() {
        return !!this._renderer.value;
    }
    setRenderer(renderer) {
        this._renderer.value = renderer;
        if (this._renderer.value) {
            this._renderer.value.onRequestRedraw(e => this.refreshRows(e.start, e.end, true));
            this._needsSelectionRefresh = true;
            this._fullRefresh();
        }
    }
    addRefreshCallback(callback) {
        return this._renderDebouncer.addRefreshCallback(callback);
    }
    _fullRefresh() {
        if (this._isPaused) {
            this._needsFullRefresh = true;
        }
        else {
            this.refreshRows(0, this._rowCount - 1);
        }
    }
    clearTextureAtlas() {
        var _a, _b;
        if (!this._renderer.value) {
            return;
        }
        (_b = (_a = this._renderer.value).clearTextureAtlas) === null || _b === void 0 ? void 0 : _b.call(_a);
        this._fullRefresh();
    }
    handleDevicePixelRatioChange() {
        this._charSizeService.measure();
        if (!this._renderer.value) {
            return;
        }
        this._renderer.value.handleDevicePixelRatioChange();
        this.refreshRows(0, this._rowCount - 1);
    }
    handleResize(cols, rows) {
        if (!this._renderer.value) {
            return;
        }
        if (this._isPaused) {
            this._pausedResizeTask.set(() => this._renderer.value.handleResize(cols, rows));
        }
        else {
            this._renderer.value.handleResize(cols, rows);
        }
        this._fullRefresh();
    }
    handleCharSizeChanged() {
        var _a;
        (_a = this._renderer.value) === null || _a === void 0 ? void 0 : _a.handleCharSizeChanged();
    }
    handleBlur() {
        var _a;
        (_a = this._renderer.value) === null || _a === void 0 ? void 0 : _a.handleBlur();
    }
    handleFocus() {
        var _a;
        (_a = this._renderer.value) === null || _a === void 0 ? void 0 : _a.handleFocus();
    }
    handleSelectionChanged(start, end, columnSelectMode) {
        var _a;
        this._selectionState.start = start;
        this._selectionState.end = end;
        this._selectionState.columnSelectMode = columnSelectMode;
        (_a = this._renderer.value) === null || _a === void 0 ? void 0 : _a.handleSelectionChanged(start, end, columnSelectMode);
    }
    handleCursorMove() {
        var _a;
        (_a = this._renderer.value) === null || _a === void 0 ? void 0 : _a.handleCursorMove();
    }
    clear() {
        var _a;
        (_a = this._renderer.value) === null || _a === void 0 ? void 0 : _a.clear();
    }
};
RenderService = __decorate([
    __param(2, IOptionsService),
    __param(3, ICharSizeService$1),
    __param(4, IDecorationService),
    __param(5, IBufferService),
    __param(6, ICoreBrowserService),
    __param(7, IInstantiationService),
    __param(8, IThemeService),
    __metadata("design:paramtypes", [Number, HTMLElement, Object, Object, Object, Object, Object, Object, Object])
], RenderService);

function moveToCellSequence(targetX, targetY, bufferService, applicationCursor) {
    const startX = bufferService.buffer.x;
    const startY = bufferService.buffer.y;
    if (!bufferService.buffer.hasScrollback) {
        return resetStartingRow(startX, startY, targetX, targetY, bufferService, applicationCursor) +
            moveToRequestedRow(startY, targetY, bufferService, applicationCursor) +
            moveToRequestedCol(startX, startY, targetX, targetY, bufferService, applicationCursor);
    }
    let direction;
    if (startY === targetY) {
        direction = startX > targetX ? "D" : "C";
        return repeat(Math.abs(startX - targetX), sequence(direction, applicationCursor));
    }
    direction = startY > targetY ? "D" : "C";
    const rowDifference = Math.abs(startY - targetY);
    const cellsToMove = colsFromRowEnd(startY > targetY ? targetX : startX, bufferService) +
        (rowDifference - 1) * bufferService.cols + 1 +
        colsFromRowBeginning(startY > targetY ? startX : targetX);
    return repeat(cellsToMove, sequence(direction, applicationCursor));
}
function colsFromRowBeginning(currX, bufferService) {
    return currX - 1;
}
function colsFromRowEnd(currX, bufferService) {
    return bufferService.cols - currX;
}
function resetStartingRow(startX, startY, targetX, targetY, bufferService, applicationCursor) {
    if (moveToRequestedRow(startY, targetY, bufferService, applicationCursor).length === 0) {
        return '';
    }
    return repeat(bufferLine(startX, startY, startX, startY - wrappedRowsForRow(startY, bufferService), false, bufferService).length, sequence("D", applicationCursor));
}
function moveToRequestedRow(startY, targetY, bufferService, applicationCursor) {
    const startRow = startY - wrappedRowsForRow(startY, bufferService);
    const endRow = targetY - wrappedRowsForRow(targetY, bufferService);
    const rowsToMove = Math.abs(startRow - endRow) - wrappedRowsCount(startY, targetY, bufferService);
    return repeat(rowsToMove, sequence(verticalDirection(startY, targetY), applicationCursor));
}
function moveToRequestedCol(startX, startY, targetX, targetY, bufferService, applicationCursor) {
    let startRow;
    if (moveToRequestedRow(startY, targetY, bufferService, applicationCursor).length > 0) {
        startRow = targetY - wrappedRowsForRow(targetY, bufferService);
    }
    else {
        startRow = startY;
    }
    const endRow = targetY;
    const direction = horizontalDirection(startX, startY, targetX, targetY, bufferService, applicationCursor);
    return repeat(bufferLine(startX, startRow, targetX, endRow, direction === "C", bufferService).length, sequence(direction, applicationCursor));
}
function wrappedRowsCount(startY, targetY, bufferService) {
    let wrappedRows = 0;
    const startRow = startY - wrappedRowsForRow(startY, bufferService);
    const endRow = targetY - wrappedRowsForRow(targetY, bufferService);
    for (let i = 0; i < Math.abs(startRow - endRow); i++) {
        const direction = verticalDirection(startY, targetY) === "A" ? -1 : 1;
        const line = bufferService.buffer.lines.get(startRow + (direction * i));
        if (line === null || line === void 0 ? void 0 : line.isWrapped) {
            wrappedRows++;
        }
    }
    return wrappedRows;
}
function wrappedRowsForRow(currentRow, bufferService) {
    let rowCount = 0;
    let line = bufferService.buffer.lines.get(currentRow);
    let lineWraps = line === null || line === void 0 ? void 0 : line.isWrapped;
    while (lineWraps && currentRow >= 0 && currentRow < bufferService.rows) {
        rowCount++;
        line = bufferService.buffer.lines.get(--currentRow);
        lineWraps = line === null || line === void 0 ? void 0 : line.isWrapped;
    }
    return rowCount;
}
function horizontalDirection(startX, startY, targetX, targetY, bufferService, applicationCursor) {
    let startRow;
    if (moveToRequestedRow(targetX, targetY, bufferService, applicationCursor).length > 0) {
        startRow = targetY - wrappedRowsForRow(targetY, bufferService);
    }
    else {
        startRow = startY;
    }
    if ((startX < targetX &&
        startRow <= targetY) ||
        (startX >= targetX &&
            startRow < targetY)) {
        return "C";
    }
    return "D";
}
function verticalDirection(startY, targetY) {
    return startY > targetY ? "A" : "B";
}
function bufferLine(startCol, startRow, endCol, endRow, forward, bufferService) {
    let currentCol = startCol;
    let currentRow = startRow;
    let bufferStr = '';
    while (currentCol !== endCol || currentRow !== endRow) {
        currentCol += forward ? 1 : -1;
        if (forward && currentCol > bufferService.cols - 1) {
            bufferStr += bufferService.buffer.translateBufferLineToString(currentRow, false, startCol, currentCol);
            currentCol = 0;
            startCol = 0;
            currentRow++;
        }
        else if (!forward && currentCol < 0) {
            bufferStr += bufferService.buffer.translateBufferLineToString(currentRow, false, 0, startCol + 1);
            currentCol = bufferService.cols - 1;
            startCol = currentCol;
            currentRow--;
        }
    }
    return bufferStr + bufferService.buffer.translateBufferLineToString(currentRow, false, startCol, currentCol);
}
function sequence(direction, applicationCursor) {
    const mod = applicationCursor ? 'O' : '[';
    return C0.ESC + mod + direction;
}
function repeat(count, str) {
    count = Math.floor(count);
    let rpt = '';
    for (let i = 0; i < count; i++) {
        rpt += str;
    }
    return rpt;
}

class SelectionModel {
    constructor(_bufferService) {
        this._bufferService = _bufferService;
        this.isSelectAllActive = false;
        this.selectionStartLength = 0;
    }
    clearSelection() {
        this.selectionStart = undefined;
        this.selectionEnd = undefined;
        this.isSelectAllActive = false;
        this.selectionStartLength = 0;
    }
    get finalSelectionStart() {
        if (this.isSelectAllActive) {
            return [0, 0];
        }
        if (!this.selectionEnd || !this.selectionStart) {
            return this.selectionStart;
        }
        return this.areSelectionValuesReversed() ? this.selectionEnd : this.selectionStart;
    }
    get finalSelectionEnd() {
        if (this.isSelectAllActive) {
            return [this._bufferService.cols, this._bufferService.buffer.ybase + this._bufferService.rows - 1];
        }
        if (!this.selectionStart) {
            return undefined;
        }
        if (!this.selectionEnd || this.areSelectionValuesReversed()) {
            const startPlusLength = this.selectionStart[0] + this.selectionStartLength;
            if (startPlusLength > this._bufferService.cols) {
                if (startPlusLength % this._bufferService.cols === 0) {
                    return [this._bufferService.cols, this.selectionStart[1] + Math.floor(startPlusLength / this._bufferService.cols) - 1];
                }
                return [startPlusLength % this._bufferService.cols, this.selectionStart[1] + Math.floor(startPlusLength / this._bufferService.cols)];
            }
            return [startPlusLength, this.selectionStart[1]];
        }
        if (this.selectionStartLength) {
            if (this.selectionEnd[1] === this.selectionStart[1]) {
                const startPlusLength = this.selectionStart[0] + this.selectionStartLength;
                if (startPlusLength > this._bufferService.cols) {
                    return [startPlusLength % this._bufferService.cols, this.selectionStart[1] + Math.floor(startPlusLength / this._bufferService.cols)];
                }
                return [Math.max(startPlusLength, this.selectionEnd[0]), this.selectionEnd[1]];
            }
        }
        return this.selectionEnd;
    }
    areSelectionValuesReversed() {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        if (!start || !end) {
            return false;
        }
        return start[1] > end[1] || (start[1] === end[1] && start[0] > end[0]);
    }
    handleTrim(amount) {
        if (this.selectionStart) {
            this.selectionStart[1] -= amount;
        }
        if (this.selectionEnd) {
            this.selectionEnd[1] -= amount;
        }
        if (this.selectionEnd && this.selectionEnd[1] < 0) {
            this.clearSelection();
            return true;
        }
        if (this.selectionStart && this.selectionStart[1] < 0) {
            this.selectionStart[1] = 0;
        }
        return false;
    }
}

function getRangeLength(range, bufferCols) {
    if (range.start.y > range.end.y) {
        throw new Error(`Buffer range end (${range.end.x}, ${range.end.y}) cannot be before start (${range.start.x}, ${range.start.y})`);
    }
    return bufferCols * (range.end.y - range.start.y) + (range.end.x - range.start.x + 1);
}

const DRAG_SCROLL_MAX_THRESHOLD = 50;
const DRAG_SCROLL_MAX_SPEED = 15;
const DRAG_SCROLL_INTERVAL = 50;
const ALT_CLICK_MOVE_CURSOR_TIME = 500;
const NON_BREAKING_SPACE_CHAR = String.fromCharCode(160);
const ALL_NON_BREAKING_SPACE_REGEX = new RegExp(NON_BREAKING_SPACE_CHAR, 'g');
let SelectionService = class SelectionService extends Disposable {
    constructor(_element, _screenElement, _linkifier, _bufferService, _coreService, _mouseService, _optionsService, _renderService, _coreBrowserService) {
        super();
        this._element = _element;
        this._screenElement = _screenElement;
        this._linkifier = _linkifier;
        this._bufferService = _bufferService;
        this._coreService = _coreService;
        this._mouseService = _mouseService;
        this._optionsService = _optionsService;
        this._renderService = _renderService;
        this._coreBrowserService = _coreBrowserService;
        this._dragScrollAmount = 0;
        this._enabled = true;
        this._workCell = new CellData();
        this._mouseDownTimeStamp = 0;
        this._oldHasSelection = false;
        this._oldSelectionStart = undefined;
        this._oldSelectionEnd = undefined;
        this._onLinuxMouseSelection = this.register(new EventEmitter());
        this.onLinuxMouseSelection = this._onLinuxMouseSelection.event;
        this._onRedrawRequest = this.register(new EventEmitter());
        this.onRequestRedraw = this._onRedrawRequest.event;
        this._onSelectionChange = this.register(new EventEmitter());
        this.onSelectionChange = this._onSelectionChange.event;
        this._onRequestScrollLines = this.register(new EventEmitter());
        this.onRequestScrollLines = this._onRequestScrollLines.event;
        this._mouseMoveListener = event => this._handleMouseMove(event);
        this._mouseUpListener = event => this._handleMouseUp(event);
        this._coreService.onUserInput(() => {
            if (this.hasSelection) {
                this.clearSelection();
            }
        });
        this._trimListener = this._bufferService.buffer.lines.onTrim(amount => this._handleTrim(amount));
        this.register(this._bufferService.buffers.onBufferActivate(e => this._handleBufferActivate(e)));
        this.enable();
        this._model = new SelectionModel(this._bufferService);
        this._activeSelectionMode = 0;
        this.register(toDisposable(() => {
            this._removeMouseDownListeners();
        }));
    }
    reset() {
        this.clearSelection();
    }
    disable() {
        this.clearSelection();
        this._enabled = false;
    }
    enable() {
        this._enabled = true;
    }
    get selectionStart() { return this._model.finalSelectionStart; }
    get selectionEnd() { return this._model.finalSelectionEnd; }
    get hasSelection() {
        const start = this._model.finalSelectionStart;
        const end = this._model.finalSelectionEnd;
        if (!start || !end) {
            return false;
        }
        return start[0] !== end[0] || start[1] !== end[1];
    }
    get selectionText() {
        const start = this._model.finalSelectionStart;
        const end = this._model.finalSelectionEnd;
        if (!start || !end) {
            return '';
        }
        const buffer = this._bufferService.buffer;
        const result = [];
        if (this._activeSelectionMode === 3) {
            if (start[0] === end[0]) {
                return '';
            }
            const startCol = start[0] < end[0] ? start[0] : end[0];
            const endCol = start[0] < end[0] ? end[0] : start[0];
            for (let i = start[1]; i <= end[1]; i++) {
                const lineText = buffer.translateBufferLineToString(i, true, startCol, endCol);
                result.push(lineText);
            }
        }
        else {
            const startRowEndCol = start[1] === end[1] ? end[0] : undefined;
            result.push(buffer.translateBufferLineToString(start[1], true, start[0], startRowEndCol));
            for (let i = start[1] + 1; i <= end[1] - 1; i++) {
                const bufferLine = buffer.lines.get(i);
                const lineText = buffer.translateBufferLineToString(i, true);
                if (bufferLine === null || bufferLine === void 0 ? void 0 : bufferLine.isWrapped) {
                    result[result.length - 1] += lineText;
                }
                else {
                    result.push(lineText);
                }
            }
            if (start[1] !== end[1]) {
                const bufferLine = buffer.lines.get(end[1]);
                const lineText = buffer.translateBufferLineToString(end[1], true, 0, end[0]);
                if (bufferLine && bufferLine.isWrapped) {
                    result[result.length - 1] += lineText;
                }
                else {
                    result.push(lineText);
                }
            }
        }
        const formattedResult = result.map(line => {
            return line.replace(ALL_NON_BREAKING_SPACE_REGEX, ' ');
        }).join(isWindows ? '\r\n' : '\n');
        return formattedResult;
    }
    clearSelection() {
        this._model.clearSelection();
        this._removeMouseDownListeners();
        this.refresh();
        this._onSelectionChange.fire();
    }
    refresh(isLinuxMouseSelection) {
        if (!this._refreshAnimationFrame) {
            this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._refresh());
        }
        if (isLinux && isLinuxMouseSelection) {
            const selectionText = this.selectionText;
            if (selectionText.length) {
                this._onLinuxMouseSelection.fire(this.selectionText);
            }
        }
    }
    _refresh() {
        this._refreshAnimationFrame = undefined;
        this._onRedrawRequest.fire({
            start: this._model.finalSelectionStart,
            end: this._model.finalSelectionEnd,
            columnSelectMode: this._activeSelectionMode === 3
        });
    }
    _isClickInSelection(event) {
        const coords = this._getMouseBufferCoords(event);
        const start = this._model.finalSelectionStart;
        const end = this._model.finalSelectionEnd;
        if (!start || !end || !coords) {
            return false;
        }
        return this._areCoordsInSelection(coords, start, end);
    }
    isCellInSelection(x, y) {
        const start = this._model.finalSelectionStart;
        const end = this._model.finalSelectionEnd;
        if (!start || !end) {
            return false;
        }
        return this._areCoordsInSelection([x, y], start, end);
    }
    _areCoordsInSelection(coords, start, end) {
        return (coords[1] > start[1] && coords[1] < end[1]) ||
            (start[1] === end[1] && coords[1] === start[1] && coords[0] >= start[0] && coords[0] < end[0]) ||
            (start[1] < end[1] && coords[1] === end[1] && coords[0] < end[0]) ||
            (start[1] < end[1] && coords[1] === start[1] && coords[0] >= start[0]);
    }
    _selectWordAtCursor(event, allowWhitespaceOnlySelection) {
        var _a, _b;
        const range = (_b = (_a = this._linkifier.currentLink) === null || _a === void 0 ? void 0 : _a.link) === null || _b === void 0 ? void 0 : _b.range;
        if (range) {
            this._model.selectionStart = [range.start.x - 1, range.start.y - 1];
            this._model.selectionStartLength = getRangeLength(range, this._bufferService.cols);
            this._model.selectionEnd = undefined;
            return true;
        }
        const coords = this._getMouseBufferCoords(event);
        if (coords) {
            this._selectWordAt(coords, allowWhitespaceOnlySelection);
            this._model.selectionEnd = undefined;
            return true;
        }
        return false;
    }
    selectAll() {
        this._model.isSelectAllActive = true;
        this.refresh();
        this._onSelectionChange.fire();
    }
    selectLines(start, end) {
        this._model.clearSelection();
        start = Math.max(start, 0);
        end = Math.min(end, this._bufferService.buffer.lines.length - 1);
        this._model.selectionStart = [0, start];
        this._model.selectionEnd = [this._bufferService.cols, end];
        this.refresh();
        this._onSelectionChange.fire();
    }
    _handleTrim(amount) {
        const needsRefresh = this._model.handleTrim(amount);
        if (needsRefresh) {
            this.refresh();
        }
    }
    _getMouseBufferCoords(event) {
        const coords = this._mouseService.getCoords(event, this._screenElement, this._bufferService.cols, this._bufferService.rows, true);
        if (!coords) {
            return undefined;
        }
        coords[0]--;
        coords[1]--;
        coords[1] += this._bufferService.buffer.ydisp;
        return coords;
    }
    _getMouseEventScrollAmount(event) {
        let offset = getCoordsRelativeToElement(this._coreBrowserService.window, event, this._screenElement)[1];
        const terminalHeight = this._renderService.dimensions.css.canvas.height;
        if (offset >= 0 && offset <= terminalHeight) {
            return 0;
        }
        if (offset > terminalHeight) {
            offset -= terminalHeight;
        }
        offset = Math.min(Math.max(offset, -DRAG_SCROLL_MAX_THRESHOLD), DRAG_SCROLL_MAX_THRESHOLD);
        offset /= DRAG_SCROLL_MAX_THRESHOLD;
        return (offset / Math.abs(offset)) + Math.round(offset * (DRAG_SCROLL_MAX_SPEED - 1));
    }
    shouldForceSelection(event) {
        if (isMac) {
            return event.altKey && this._optionsService.rawOptions.macOptionClickForcesSelection;
        }
        return event.shiftKey;
    }
    handleMouseDown(event) {
        this._mouseDownTimeStamp = event.timeStamp;
        if (event.button === 2 && this.hasSelection) {
            return;
        }
        if (event.button !== 0) {
            return;
        }
        if (!this._enabled) {
            if (!this.shouldForceSelection(event)) {
                return;
            }
            event.stopPropagation();
        }
        event.preventDefault();
        this._dragScrollAmount = 0;
        if (this._enabled && event.shiftKey) {
            this._handleIncrementalClick(event);
        }
        else {
            if (event.detail === 1) {
                this._handleSingleClick(event);
            }
            else if (event.detail === 2) {
                this._handleDoubleClick(event);
            }
            else if (event.detail === 3) {
                this._handleTripleClick(event);
            }
        }
        this._addMouseDownListeners();
        this.refresh(true);
    }
    _addMouseDownListeners() {
        if (this._screenElement.ownerDocument) {
            this._screenElement.ownerDocument.addEventListener('mousemove', this._mouseMoveListener);
            this._screenElement.ownerDocument.addEventListener('mouseup', this._mouseUpListener);
        }
        this._dragScrollIntervalTimer = this._coreBrowserService.window.setInterval(() => this._dragScroll(), DRAG_SCROLL_INTERVAL);
    }
    _removeMouseDownListeners() {
        if (this._screenElement.ownerDocument) {
            this._screenElement.ownerDocument.removeEventListener('mousemove', this._mouseMoveListener);
            this._screenElement.ownerDocument.removeEventListener('mouseup', this._mouseUpListener);
        }
        this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer);
        this._dragScrollIntervalTimer = undefined;
    }
    _handleIncrementalClick(event) {
        if (this._model.selectionStart) {
            this._model.selectionEnd = this._getMouseBufferCoords(event);
        }
    }
    _handleSingleClick(event) {
        this._model.selectionStartLength = 0;
        this._model.isSelectAllActive = false;
        this._activeSelectionMode = this.shouldColumnSelect(event) ? 3 : 0;
        this._model.selectionStart = this._getMouseBufferCoords(event);
        if (!this._model.selectionStart) {
            return;
        }
        this._model.selectionEnd = undefined;
        const line = this._bufferService.buffer.lines.get(this._model.selectionStart[1]);
        if (!line) {
            return;
        }
        if (line.length === this._model.selectionStart[0]) {
            return;
        }
        if (line.hasWidth(this._model.selectionStart[0]) === 0) {
            this._model.selectionStart[0]++;
        }
    }
    _handleDoubleClick(event) {
        if (this._selectWordAtCursor(event, true)) {
            this._activeSelectionMode = 1;
        }
    }
    _handleTripleClick(event) {
        const coords = this._getMouseBufferCoords(event);
        if (coords) {
            this._activeSelectionMode = 2;
            this._selectLineAt(coords[1]);
        }
    }
    shouldColumnSelect(event) {
        return event.altKey && !(isMac && this._optionsService.rawOptions.macOptionClickForcesSelection);
    }
    _handleMouseMove(event) {
        event.stopImmediatePropagation();
        if (!this._model.selectionStart) {
            return;
        }
        const previousSelectionEnd = this._model.selectionEnd ? [this._model.selectionEnd[0], this._model.selectionEnd[1]] : null;
        this._model.selectionEnd = this._getMouseBufferCoords(event);
        if (!this._model.selectionEnd) {
            this.refresh(true);
            return;
        }
        if (this._activeSelectionMode === 2) {
            if (this._model.selectionEnd[1] < this._model.selectionStart[1]) {
                this._model.selectionEnd[0] = 0;
            }
            else {
                this._model.selectionEnd[0] = this._bufferService.cols;
            }
        }
        else if (this._activeSelectionMode === 1) {
            this._selectToWordAt(this._model.selectionEnd);
        }
        this._dragScrollAmount = this._getMouseEventScrollAmount(event);
        if (this._activeSelectionMode !== 3) {
            if (this._dragScrollAmount > 0) {
                this._model.selectionEnd[0] = this._bufferService.cols;
            }
            else if (this._dragScrollAmount < 0) {
                this._model.selectionEnd[0] = 0;
            }
        }
        const buffer = this._bufferService.buffer;
        if (this._model.selectionEnd[1] < buffer.lines.length) {
            const line = buffer.lines.get(this._model.selectionEnd[1]);
            if (line && line.hasWidth(this._model.selectionEnd[0]) === 0) {
                if (this._model.selectionEnd[0] < this._bufferService.cols) {
                    this._model.selectionEnd[0]++;
                }
            }
        }
        if (!previousSelectionEnd ||
            previousSelectionEnd[0] !== this._model.selectionEnd[0] ||
            previousSelectionEnd[1] !== this._model.selectionEnd[1]) {
            this.refresh(true);
        }
    }
    _dragScroll() {
        if (!this._model.selectionEnd || !this._model.selectionStart) {
            return;
        }
        if (this._dragScrollAmount) {
            this._onRequestScrollLines.fire({ amount: this._dragScrollAmount, suppressScrollEvent: false });
            const buffer = this._bufferService.buffer;
            if (this._dragScrollAmount > 0) {
                if (this._activeSelectionMode !== 3) {
                    this._model.selectionEnd[0] = this._bufferService.cols;
                }
                this._model.selectionEnd[1] = Math.min(buffer.ydisp + this._bufferService.rows, buffer.lines.length - 1);
            }
            else {
                if (this._activeSelectionMode !== 3) {
                    this._model.selectionEnd[0] = 0;
                }
                this._model.selectionEnd[1] = buffer.ydisp;
            }
            this.refresh();
        }
    }
    _handleMouseUp(event) {
        const timeElapsed = event.timeStamp - this._mouseDownTimeStamp;
        this._removeMouseDownListeners();
        if (this.selectionText.length <= 1 && timeElapsed < ALT_CLICK_MOVE_CURSOR_TIME && event.altKey && this._optionsService.rawOptions.altClickMovesCursor) {
            if (this._bufferService.buffer.ybase === this._bufferService.buffer.ydisp) {
                const coordinates = this._mouseService.getCoords(event, this._element, this._bufferService.cols, this._bufferService.rows, false);
                if (coordinates && coordinates[0] !== undefined && coordinates[1] !== undefined) {
                    const sequence = moveToCellSequence(coordinates[0] - 1, coordinates[1] - 1, this._bufferService, this._coreService.decPrivateModes.applicationCursorKeys);
                    this._coreService.triggerDataEvent(sequence, true);
                }
            }
        }
        else {
            this._fireEventIfSelectionChanged();
        }
    }
    _fireEventIfSelectionChanged() {
        const start = this._model.finalSelectionStart;
        const end = this._model.finalSelectionEnd;
        const hasSelection = !!start && !!end && (start[0] !== end[0] || start[1] !== end[1]);
        if (!hasSelection) {
            if (this._oldHasSelection) {
                this._fireOnSelectionChange(start, end, hasSelection);
            }
            return;
        }
        if (!start || !end) {
            return;
        }
        if (!this._oldSelectionStart || !this._oldSelectionEnd || (start[0] !== this._oldSelectionStart[0] || start[1] !== this._oldSelectionStart[1] ||
            end[0] !== this._oldSelectionEnd[0] || end[1] !== this._oldSelectionEnd[1])) {
            this._fireOnSelectionChange(start, end, hasSelection);
        }
    }
    _fireOnSelectionChange(start, end, hasSelection) {
        this._oldSelectionStart = start;
        this._oldSelectionEnd = end;
        this._oldHasSelection = hasSelection;
        this._onSelectionChange.fire();
    }
    _handleBufferActivate(e) {
        this.clearSelection();
        this._trimListener.dispose();
        this._trimListener = e.activeBuffer.lines.onTrim(amount => this._handleTrim(amount));
    }
    _convertViewportColToCharacterIndex(bufferLine, x) {
        let charIndex = x;
        for (let i = 0; x >= i; i++) {
            const length = bufferLine.loadCell(i, this._workCell).getChars().length;
            if (this._workCell.getWidth() === 0) {
                charIndex--;
            }
            else if (length > 1 && x !== i) {
                charIndex += length - 1;
            }
        }
        return charIndex;
    }
    setSelection(col, row, length) {
        this._model.clearSelection();
        this._removeMouseDownListeners();
        this._model.selectionStart = [col, row];
        this._model.selectionStartLength = length;
        this.refresh();
        this._fireEventIfSelectionChanged();
    }
    rightClickSelect(ev) {
        if (!this._isClickInSelection(ev)) {
            if (this._selectWordAtCursor(ev, false)) {
                this.refresh(true);
            }
            this._fireEventIfSelectionChanged();
        }
    }
    _getWordAt(coords, allowWhitespaceOnlySelection, followWrappedLinesAbove = true, followWrappedLinesBelow = true) {
        if (coords[0] >= this._bufferService.cols) {
            return undefined;
        }
        const buffer = this._bufferService.buffer;
        const bufferLine = buffer.lines.get(coords[1]);
        if (!bufferLine) {
            return undefined;
        }
        const line = buffer.translateBufferLineToString(coords[1], false);
        let startIndex = this._convertViewportColToCharacterIndex(bufferLine, coords[0]);
        let endIndex = startIndex;
        const charOffset = coords[0] - startIndex;
        let leftWideCharCount = 0;
        let rightWideCharCount = 0;
        let leftLongCharOffset = 0;
        let rightLongCharOffset = 0;
        if (line.charAt(startIndex) === ' ') {
            while (startIndex > 0 && line.charAt(startIndex - 1) === ' ') {
                startIndex--;
            }
            while (endIndex < line.length && line.charAt(endIndex + 1) === ' ') {
                endIndex++;
            }
        }
        else {
            let startCol = coords[0];
            let endCol = coords[0];
            if (bufferLine.getWidth(startCol) === 0) {
                leftWideCharCount++;
                startCol--;
            }
            if (bufferLine.getWidth(endCol) === 2) {
                rightWideCharCount++;
                endCol++;
            }
            const length = bufferLine.getString(endCol).length;
            if (length > 1) {
                rightLongCharOffset += length - 1;
                endIndex += length - 1;
            }
            while (startCol > 0 && startIndex > 0 && !this._isCharWordSeparator(bufferLine.loadCell(startCol - 1, this._workCell))) {
                bufferLine.loadCell(startCol - 1, this._workCell);
                const length = this._workCell.getChars().length;
                if (this._workCell.getWidth() === 0) {
                    leftWideCharCount++;
                    startCol--;
                }
                else if (length > 1) {
                    leftLongCharOffset += length - 1;
                    startIndex -= length - 1;
                }
                startIndex--;
                startCol--;
            }
            while (endCol < bufferLine.length && endIndex + 1 < line.length && !this._isCharWordSeparator(bufferLine.loadCell(endCol + 1, this._workCell))) {
                bufferLine.loadCell(endCol + 1, this._workCell);
                const length = this._workCell.getChars().length;
                if (this._workCell.getWidth() === 2) {
                    rightWideCharCount++;
                    endCol++;
                }
                else if (length > 1) {
                    rightLongCharOffset += length - 1;
                    endIndex += length - 1;
                }
                endIndex++;
                endCol++;
            }
        }
        endIndex++;
        let start = startIndex
            + charOffset
            - leftWideCharCount
            + leftLongCharOffset;
        let length = Math.min(this._bufferService.cols, endIndex
            - startIndex
            + leftWideCharCount
            + rightWideCharCount
            - leftLongCharOffset
            - rightLongCharOffset);
        if (!allowWhitespaceOnlySelection && line.slice(startIndex, endIndex).trim() === '') {
            return undefined;
        }
        if (followWrappedLinesAbove) {
            if (start === 0 && bufferLine.getCodePoint(0) !== 32) {
                const previousBufferLine = buffer.lines.get(coords[1] - 1);
                if (previousBufferLine && bufferLine.isWrapped && previousBufferLine.getCodePoint(this._bufferService.cols - 1) !== 32) {
                    const previousLineWordPosition = this._getWordAt([this._bufferService.cols - 1, coords[1] - 1], false, true, false);
                    if (previousLineWordPosition) {
                        const offset = this._bufferService.cols - previousLineWordPosition.start;
                        start -= offset;
                        length += offset;
                    }
                }
            }
        }
        if (followWrappedLinesBelow) {
            if (start + length === this._bufferService.cols && bufferLine.getCodePoint(this._bufferService.cols - 1) !== 32) {
                const nextBufferLine = buffer.lines.get(coords[1] + 1);
                if ((nextBufferLine === null || nextBufferLine === void 0 ? void 0 : nextBufferLine.isWrapped) && nextBufferLine.getCodePoint(0) !== 32) {
                    const nextLineWordPosition = this._getWordAt([0, coords[1] + 1], false, false, true);
                    if (nextLineWordPosition) {
                        length += nextLineWordPosition.length;
                    }
                }
            }
        }
        return { start, length };
    }
    _selectWordAt(coords, allowWhitespaceOnlySelection) {
        const wordPosition = this._getWordAt(coords, allowWhitespaceOnlySelection);
        if (wordPosition) {
            while (wordPosition.start < 0) {
                wordPosition.start += this._bufferService.cols;
                coords[1]--;
            }
            this._model.selectionStart = [wordPosition.start, coords[1]];
            this._model.selectionStartLength = wordPosition.length;
        }
    }
    _selectToWordAt(coords) {
        const wordPosition = this._getWordAt(coords, true);
        if (wordPosition) {
            let endRow = coords[1];
            while (wordPosition.start < 0) {
                wordPosition.start += this._bufferService.cols;
                endRow--;
            }
            if (!this._model.areSelectionValuesReversed()) {
                while (wordPosition.start + wordPosition.length > this._bufferService.cols) {
                    wordPosition.length -= this._bufferService.cols;
                    endRow++;
                }
            }
            this._model.selectionEnd = [this._model.areSelectionValuesReversed() ? wordPosition.start : wordPosition.start + wordPosition.length, endRow];
        }
    }
    _isCharWordSeparator(cell) {
        if (cell.getWidth() === 0) {
            return false;
        }
        return this._optionsService.rawOptions.wordSeparator.indexOf(cell.getChars()) >= 0;
    }
    _selectLineAt(line) {
        const wrappedRange = this._bufferService.buffer.getWrappedRangeForLine(line);
        const range = {
            start: { x: 0, y: wrappedRange.first },
            end: { x: this._bufferService.cols - 1, y: wrappedRange.last }
        };
        this._model.selectionStart = [0, wrappedRange.first];
        this._model.selectionEnd = undefined;
        this._model.selectionStartLength = getRangeLength(range, this._bufferService.cols);
    }
};
SelectionService = __decorate([
    __param(3, IBufferService),
    __param(4, ICoreService),
    __param(5, IMouseService),
    __param(6, IOptionsService),
    __param(7, IRenderService$1),
    __param(8, ICoreBrowserService),
    __metadata("design:paramtypes", [HTMLElement,
        HTMLElement, Object, Object, Object, Object, Object, Object, Object])
], SelectionService);

class TwoKeyMap {
    constructor() {
        this._data = {};
    }
    set(first, second, value) {
        if (!this._data[first]) {
            this._data[first] = {};
        }
        this._data[first][second] = value;
    }
    get(first, second) {
        return this._data[first] ? this._data[first][second] : undefined;
    }
    clear() {
        this._data = {};
    }
}

class ColorContrastCache {
    constructor() {
        this._color = new TwoKeyMap();
        this._css = new TwoKeyMap();
    }
    setCss(bg, fg, value) {
        this._css.set(bg, fg, value);
    }
    getCss(bg, fg) {
        return this._css.get(bg, fg);
    }
    setColor(bg, fg, value) {
        this._color.set(bg, fg, value);
    }
    getColor(bg, fg) {
        return this._color.get(bg, fg);
    }
    clear() {
        this._color.clear();
        this._css.clear();
    }
}

const DEFAULT_FOREGROUND = css.toColor('#ffffff');
const DEFAULT_BACKGROUND = css.toColor('#000000');
const DEFAULT_CURSOR = css.toColor('#ffffff');
const DEFAULT_CURSOR_ACCENT = css.toColor('#000000');
const DEFAULT_SELECTION = {
    css: 'rgba(255, 255, 255, 0.3)',
    rgba: 0xFFFFFF4D
};
const DEFAULT_ANSI_COLORS = Object.freeze((() => {
    const colors = [
        css.toColor('#2e3436'),
        css.toColor('#cc0000'),
        css.toColor('#4e9a06'),
        css.toColor('#c4a000'),
        css.toColor('#3465a4'),
        css.toColor('#75507b'),
        css.toColor('#06989a'),
        css.toColor('#d3d7cf'),
        css.toColor('#555753'),
        css.toColor('#ef2929'),
        css.toColor('#8ae234'),
        css.toColor('#fce94f'),
        css.toColor('#729fcf'),
        css.toColor('#ad7fa8'),
        css.toColor('#34e2e2'),
        css.toColor('#eeeeec')
    ];
    const v = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
    for (let i = 0; i < 216; i++) {
        const r = v[(i / 36) % 6 | 0];
        const g = v[(i / 6) % 6 | 0];
        const b = v[i % 6];
        colors.push({
            css: channels.toCss(r, g, b),
            rgba: channels.toRgba(r, g, b)
        });
    }
    for (let i = 0; i < 24; i++) {
        const c = 8 + i * 10;
        colors.push({
            css: channels.toCss(c, c, c),
            rgba: channels.toRgba(c, c, c)
        });
    }
    return colors;
})());
let ThemeService = class ThemeService extends Disposable {
    get colors() { return this._colors; }
    constructor(_optionsService) {
        super();
        this._optionsService = _optionsService;
        this._contrastCache = new ColorContrastCache();
        this._halfContrastCache = new ColorContrastCache();
        this._onChangeColors = this.register(new EventEmitter());
        this.onChangeColors = this._onChangeColors.event;
        this._colors = {
            foreground: DEFAULT_FOREGROUND,
            background: DEFAULT_BACKGROUND,
            cursor: DEFAULT_CURSOR,
            cursorAccent: DEFAULT_CURSOR_ACCENT,
            selectionForeground: undefined,
            selectionBackgroundTransparent: DEFAULT_SELECTION,
            selectionBackgroundOpaque: color.blend(DEFAULT_BACKGROUND, DEFAULT_SELECTION),
            selectionInactiveBackgroundTransparent: DEFAULT_SELECTION,
            selectionInactiveBackgroundOpaque: color.blend(DEFAULT_BACKGROUND, DEFAULT_SELECTION),
            ansi: DEFAULT_ANSI_COLORS.slice(),
            contrastCache: this._contrastCache,
            halfContrastCache: this._halfContrastCache
        };
        this._updateRestoreColors();
        this._setTheme(this._optionsService.rawOptions.theme);
        this.register(this._optionsService.onSpecificOptionChange('minimumContrastRatio', () => this._contrastCache.clear()));
        this.register(this._optionsService.onSpecificOptionChange('theme', () => this._setTheme(this._optionsService.rawOptions.theme)));
    }
    _setTheme(theme = {}) {
        const colors = this._colors;
        colors.foreground = parseColor$1(theme.foreground, DEFAULT_FOREGROUND);
        colors.background = parseColor$1(theme.background, DEFAULT_BACKGROUND);
        colors.cursor = parseColor$1(theme.cursor, DEFAULT_CURSOR);
        colors.cursorAccent = parseColor$1(theme.cursorAccent, DEFAULT_CURSOR_ACCENT);
        colors.selectionBackgroundTransparent = parseColor$1(theme.selectionBackground, DEFAULT_SELECTION);
        colors.selectionBackgroundOpaque = color.blend(colors.background, colors.selectionBackgroundTransparent);
        colors.selectionInactiveBackgroundTransparent = parseColor$1(theme.selectionInactiveBackground, colors.selectionBackgroundTransparent);
        colors.selectionInactiveBackgroundOpaque = color.blend(colors.background, colors.selectionInactiveBackgroundTransparent);
        colors.selectionForeground = theme.selectionForeground ? parseColor$1(theme.selectionForeground, NULL_COLOR) : undefined;
        if (colors.selectionForeground === NULL_COLOR) {
            colors.selectionForeground = undefined;
        }
        if (color.isOpaque(colors.selectionBackgroundTransparent)) {
            const opacity = 0.3;
            colors.selectionBackgroundTransparent = color.opacity(colors.selectionBackgroundTransparent, opacity);
        }
        if (color.isOpaque(colors.selectionInactiveBackgroundTransparent)) {
            const opacity = 0.3;
            colors.selectionInactiveBackgroundTransparent = color.opacity(colors.selectionInactiveBackgroundTransparent, opacity);
        }
        colors.ansi = DEFAULT_ANSI_COLORS.slice();
        colors.ansi[0] = parseColor$1(theme.black, DEFAULT_ANSI_COLORS[0]);
        colors.ansi[1] = parseColor$1(theme.red, DEFAULT_ANSI_COLORS[1]);
        colors.ansi[2] = parseColor$1(theme.green, DEFAULT_ANSI_COLORS[2]);
        colors.ansi[3] = parseColor$1(theme.yellow, DEFAULT_ANSI_COLORS[3]);
        colors.ansi[4] = parseColor$1(theme.blue, DEFAULT_ANSI_COLORS[4]);
        colors.ansi[5] = parseColor$1(theme.magenta, DEFAULT_ANSI_COLORS[5]);
        colors.ansi[6] = parseColor$1(theme.cyan, DEFAULT_ANSI_COLORS[6]);
        colors.ansi[7] = parseColor$1(theme.white, DEFAULT_ANSI_COLORS[7]);
        colors.ansi[8] = parseColor$1(theme.brightBlack, DEFAULT_ANSI_COLORS[8]);
        colors.ansi[9] = parseColor$1(theme.brightRed, DEFAULT_ANSI_COLORS[9]);
        colors.ansi[10] = parseColor$1(theme.brightGreen, DEFAULT_ANSI_COLORS[10]);
        colors.ansi[11] = parseColor$1(theme.brightYellow, DEFAULT_ANSI_COLORS[11]);
        colors.ansi[12] = parseColor$1(theme.brightBlue, DEFAULT_ANSI_COLORS[12]);
        colors.ansi[13] = parseColor$1(theme.brightMagenta, DEFAULT_ANSI_COLORS[13]);
        colors.ansi[14] = parseColor$1(theme.brightCyan, DEFAULT_ANSI_COLORS[14]);
        colors.ansi[15] = parseColor$1(theme.brightWhite, DEFAULT_ANSI_COLORS[15]);
        if (theme.extendedAnsi) {
            const colorCount = Math.min(colors.ansi.length - 16, theme.extendedAnsi.length);
            for (let i = 0; i < colorCount; i++) {
                colors.ansi[i + 16] = parseColor$1(theme.extendedAnsi[i], DEFAULT_ANSI_COLORS[i + 16]);
            }
        }
        this._contrastCache.clear();
        this._halfContrastCache.clear();
        this._updateRestoreColors();
        this._onChangeColors.fire(this.colors);
    }
    restoreColor(slot) {
        this._restoreColor(slot);
        this._onChangeColors.fire(this.colors);
    }
    _restoreColor(slot) {
        if (slot === undefined) {
            for (let i = 0; i < this._restoreColors.ansi.length; ++i) {
                this._colors.ansi[i] = this._restoreColors.ansi[i];
            }
            return;
        }
        switch (slot) {
            case 256:
                this._colors.foreground = this._restoreColors.foreground;
                break;
            case 257:
                this._colors.background = this._restoreColors.background;
                break;
            case 258:
                this._colors.cursor = this._restoreColors.cursor;
                break;
            default:
                this._colors.ansi[slot] = this._restoreColors.ansi[slot];
        }
    }
    modifyColors(callback) {
        callback(this._colors);
        this._onChangeColors.fire(this.colors);
    }
    _updateRestoreColors() {
        this._restoreColors = {
            foreground: this._colors.foreground,
            background: this._colors.background,
            cursor: this._colors.cursor,
            ansi: this._colors.ansi.slice()
        };
    }
};
ThemeService = __decorate([
    __param(0, IOptionsService),
    __metadata("design:paramtypes", [Object])
], ThemeService);
function parseColor$1(cssString, fallback) {
    if (cssString !== undefined) {
        try {
            return css.toColor(cssString);
        }
        catch (_a) {
        }
    }
    return fallback;
}

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
function pad(n, bits) {
    const s = n.toString(16);
    const s2 = s.length < 2 ? '0' + s : s;
    switch (bits) {
        case 4:
            return s[0];
        case 8:
            return s2;
        case 12:
            return (s2 + s2).slice(0, 3);
        default:
            return s2 + s2;
    }
}
function toRgbString(color, bits = 16) {
    const [r, g, b] = color;
    return `rgb:${pad(r, bits)}/${pad(g, bits)}/${pad(b, bits)}`;
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
var WindowsOptionsReportType$1;
(function (WindowsOptionsReportType) {
    WindowsOptionsReportType[WindowsOptionsReportType["GET_WIN_SIZE_PIXELS"] = 0] = "GET_WIN_SIZE_PIXELS";
    WindowsOptionsReportType[WindowsOptionsReportType["GET_CELL_SIZE_PIXELS"] = 1] = "GET_CELL_SIZE_PIXELS";
})(WindowsOptionsReportType$1 || (WindowsOptionsReportType$1 = {}));
const SLOW_ASYNC_LIMIT = 5000;
let $temp$1 = 0;
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
        this._dirtyRowTracker = new DirtyRowTracker$1(this._bufferService);
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
                    this._onRequestWindowsOptionsReport.fire(WindowsOptionsReportType$1.GET_WIN_SIZE_PIXELS);
                }
                break;
            case 16:
                this._onRequestWindowsOptionsReport.fire(WindowsOptionsReportType$1.GET_CELL_SIZE_PIXELS);
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
let DirtyRowTracker$1 = class DirtyRowTracker {
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
            $temp$1 = y1;
            y1 = y2;
            y2 = $temp$1;
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
DirtyRowTracker$1 = __decorate([
    __param(0, IBufferService),
    __metadata("design:paramtypes", [Object])
], DirtyRowTracker$1);
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

const KEYCODE_KEY_MAPPINGS = {
    48: ['0', ')'],
    49: ['1', '!'],
    50: ['2', '@'],
    51: ['3', '#'],
    52: ['4', '$'],
    53: ['5', '%'],
    54: ['6', '^'],
    55: ['7', '&'],
    56: ['8', '*'],
    57: ['9', '('],
    186: [';', ':'],
    187: ['=', '+'],
    188: [',', '<'],
    189: ['-', '_'],
    190: ['.', '>'],
    191: ['/', '?'],
    192: ['`', '~'],
    219: ['[', '{'],
    220: ['\\', '|'],
    221: [']', '}'],
    222: ['\'', '"']
};
function evaluateKeyboardEvent(ev, applicationCursorMode, isMac, macOptionIsMeta) {
    const result = {
        type: 0,
        cancel: false,
        key: undefined
    };
    const modifiers = (ev.shiftKey ? 1 : 0) | (ev.altKey ? 2 : 0) | (ev.ctrlKey ? 4 : 0) | (ev.metaKey ? 8 : 0);
    switch (ev.keyCode) {
        case 0:
            if (ev.key === 'UIKeyInputUpArrow') {
                if (applicationCursorMode) {
                    result.key = C0.ESC + 'OA';
                }
                else {
                    result.key = C0.ESC + '[A';
                }
            }
            else if (ev.key === 'UIKeyInputLeftArrow') {
                if (applicationCursorMode) {
                    result.key = C0.ESC + 'OD';
                }
                else {
                    result.key = C0.ESC + '[D';
                }
            }
            else if (ev.key === 'UIKeyInputRightArrow') {
                if (applicationCursorMode) {
                    result.key = C0.ESC + 'OC';
                }
                else {
                    result.key = C0.ESC + '[C';
                }
            }
            else if (ev.key === 'UIKeyInputDownArrow') {
                if (applicationCursorMode) {
                    result.key = C0.ESC + 'OB';
                }
                else {
                    result.key = C0.ESC + '[B';
                }
            }
            break;
        case 8:
            result.key = ev.ctrlKey ? '\b' : C0.DEL;
            if (ev.altKey) {
                result.key = C0.ESC + result.key;
            }
            break;
        case 9:
            if (ev.shiftKey) {
                result.key = C0.ESC + '[Z';
                break;
            }
            result.key = C0.HT;
            result.cancel = true;
            break;
        case 13:
            result.key = ev.altKey ? C0.ESC + C0.CR : C0.CR;
            result.cancel = true;
            break;
        case 27:
            result.key = C0.ESC;
            if (ev.altKey) {
                result.key = C0.ESC + C0.ESC;
            }
            result.cancel = true;
            break;
        case 37:
            if (ev.metaKey) {
                break;
            }
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'D';
                if (result.key === C0.ESC + '[1;3D') {
                    result.key = C0.ESC + (isMac ? 'b' : '[1;5D');
                }
            }
            else if (applicationCursorMode) {
                result.key = C0.ESC + 'OD';
            }
            else {
                result.key = C0.ESC + '[D';
            }
            break;
        case 39:
            if (ev.metaKey) {
                break;
            }
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'C';
                if (result.key === C0.ESC + '[1;3C') {
                    result.key = C0.ESC + (isMac ? 'f' : '[1;5C');
                }
            }
            else if (applicationCursorMode) {
                result.key = C0.ESC + 'OC';
            }
            else {
                result.key = C0.ESC + '[C';
            }
            break;
        case 38:
            if (ev.metaKey) {
                break;
            }
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'A';
                if (!isMac && result.key === C0.ESC + '[1;3A') {
                    result.key = C0.ESC + '[1;5A';
                }
            }
            else if (applicationCursorMode) {
                result.key = C0.ESC + 'OA';
            }
            else {
                result.key = C0.ESC + '[A';
            }
            break;
        case 40:
            if (ev.metaKey) {
                break;
            }
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'B';
                if (!isMac && result.key === C0.ESC + '[1;3B') {
                    result.key = C0.ESC + '[1;5B';
                }
            }
            else if (applicationCursorMode) {
                result.key = C0.ESC + 'OB';
            }
            else {
                result.key = C0.ESC + '[B';
            }
            break;
        case 45:
            if (!ev.shiftKey && !ev.ctrlKey) {
                result.key = C0.ESC + '[2~';
            }
            break;
        case 46:
            if (modifiers) {
                result.key = C0.ESC + '[3;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[3~';
            }
            break;
        case 36:
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'H';
            }
            else if (applicationCursorMode) {
                result.key = C0.ESC + 'OH';
            }
            else {
                result.key = C0.ESC + '[H';
            }
            break;
        case 35:
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'F';
            }
            else if (applicationCursorMode) {
                result.key = C0.ESC + 'OF';
            }
            else {
                result.key = C0.ESC + '[F';
            }
            break;
        case 33:
            if (ev.shiftKey) {
                result.type = 2;
            }
            else if (ev.ctrlKey) {
                result.key = C0.ESC + '[5;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[5~';
            }
            break;
        case 34:
            if (ev.shiftKey) {
                result.type = 3;
            }
            else if (ev.ctrlKey) {
                result.key = C0.ESC + '[6;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[6~';
            }
            break;
        case 112:
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'P';
            }
            else {
                result.key = C0.ESC + 'OP';
            }
            break;
        case 113:
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'Q';
            }
            else {
                result.key = C0.ESC + 'OQ';
            }
            break;
        case 114:
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'R';
            }
            else {
                result.key = C0.ESC + 'OR';
            }
            break;
        case 115:
            if (modifiers) {
                result.key = C0.ESC + '[1;' + (modifiers + 1) + 'S';
            }
            else {
                result.key = C0.ESC + 'OS';
            }
            break;
        case 116:
            if (modifiers) {
                result.key = C0.ESC + '[15;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[15~';
            }
            break;
        case 117:
            if (modifiers) {
                result.key = C0.ESC + '[17;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[17~';
            }
            break;
        case 118:
            if (modifiers) {
                result.key = C0.ESC + '[18;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[18~';
            }
            break;
        case 119:
            if (modifiers) {
                result.key = C0.ESC + '[19;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[19~';
            }
            break;
        case 120:
            if (modifiers) {
                result.key = C0.ESC + '[20;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[20~';
            }
            break;
        case 121:
            if (modifiers) {
                result.key = C0.ESC + '[21;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[21~';
            }
            break;
        case 122:
            if (modifiers) {
                result.key = C0.ESC + '[23;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[23~';
            }
            break;
        case 123:
            if (modifiers) {
                result.key = C0.ESC + '[24;' + (modifiers + 1) + '~';
            }
            else {
                result.key = C0.ESC + '[24~';
            }
            break;
        default:
            if (ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey) {
                if (ev.keyCode >= 65 && ev.keyCode <= 90) {
                    result.key = String.fromCharCode(ev.keyCode - 64);
                }
                else if (ev.keyCode === 32) {
                    result.key = C0.NUL;
                }
                else if (ev.keyCode >= 51 && ev.keyCode <= 55) {
                    result.key = String.fromCharCode(ev.keyCode - 51 + 27);
                }
                else if (ev.keyCode === 56) {
                    result.key = C0.DEL;
                }
                else if (ev.keyCode === 219) {
                    result.key = C0.ESC;
                }
                else if (ev.keyCode === 220) {
                    result.key = C0.FS;
                }
                else if (ev.keyCode === 221) {
                    result.key = C0.GS;
                }
            }
            else if ((!isMac || macOptionIsMeta) && ev.altKey && !ev.metaKey) {
                const keyMapping = KEYCODE_KEY_MAPPINGS[ev.keyCode];
                const key = keyMapping === null || keyMapping === void 0 ? void 0 : keyMapping[!ev.shiftKey ? 0 : 1];
                if (key) {
                    result.key = C0.ESC + key;
                }
                else if (ev.keyCode >= 65 && ev.keyCode <= 90) {
                    const keyCode = ev.ctrlKey ? ev.keyCode - 64 : ev.keyCode + 32;
                    let keyString = String.fromCharCode(keyCode);
                    if (ev.shiftKey) {
                        keyString = keyString.toUpperCase();
                    }
                    result.key = C0.ESC + keyString;
                }
                else if (ev.keyCode === 32) {
                    result.key = C0.ESC + (ev.ctrlKey ? C0.NUL : ' ');
                }
                else if (ev.key === 'Dead' && ev.code.startsWith('Key')) {
                    let keyString = ev.code.slice(3, 4);
                    if (!ev.shiftKey) {
                        keyString = keyString.toLowerCase();
                    }
                    result.key = C0.ESC + keyString;
                    result.cancel = true;
                }
            }
            else if (isMac && !ev.altKey && !ev.ctrlKey && !ev.shiftKey && ev.metaKey) {
                if (ev.keyCode === 65) {
                    result.type = 1;
                }
            }
            else if (ev.key && !ev.ctrlKey && !ev.altKey && !ev.metaKey && ev.keyCode >= 48 && ev.key.length === 1) {
                result.key = ev.key;
            }
            else if (ev.key && ev.ctrlKey) {
                if (ev.key === '_') {
                    result.key = C0.US;
                }
                if (ev.key === '@') {
                    result.key = C0.NUL;
                }
            }
            break;
    }
    return result;
}

let i = 0;
class SortedList {
    constructor(_getKey) {
        this._getKey = _getKey;
        this._array = [];
    }
    clear() {
        this._array.length = 0;
    }
    insert(value) {
        if (this._array.length === 0) {
            this._array.push(value);
            return;
        }
        i = this._search(this._getKey(value));
        this._array.splice(i, 0, value);
    }
    delete(value) {
        if (this._array.length === 0) {
            return false;
        }
        const key = this._getKey(value);
        if (key === undefined) {
            return false;
        }
        i = this._search(key);
        if (i === -1) {
            return false;
        }
        if (this._getKey(this._array[i]) !== key) {
            return false;
        }
        do {
            if (this._array[i] === value) {
                this._array.splice(i, 1);
                return true;
            }
        } while (++i < this._array.length && this._getKey(this._array[i]) === key);
        return false;
    }
    *getKeyIterator(key) {
        if (this._array.length === 0) {
            return;
        }
        i = this._search(key);
        if (i < 0 || i >= this._array.length) {
            return;
        }
        if (this._getKey(this._array[i]) !== key) {
            return;
        }
        do {
            yield this._array[i];
        } while (++i < this._array.length && this._getKey(this._array[i]) === key);
    }
    forEachByKey(key, callback) {
        if (this._array.length === 0) {
            return;
        }
        i = this._search(key);
        if (i < 0 || i >= this._array.length) {
            return;
        }
        if (this._getKey(this._array[i]) !== key) {
            return;
        }
        do {
            callback(this._array[i]);
        } while (++i < this._array.length && this._getKey(this._array[i]) === key);
    }
    values() {
        return [...this._array].values();
    }
    _search(key) {
        let min = 0;
        let max = this._array.length - 1;
        while (max >= min) {
            let mid = (min + max) >> 1;
            const midKey = this._getKey(this._array[mid]);
            if (midKey > key) {
                max = mid - 1;
            }
            else if (midKey < key) {
                min = mid + 1;
            }
            else {
                while (mid > 0 && this._getKey(this._array[mid - 1]) === key) {
                    mid--;
                }
                return mid;
            }
        }
        return min;
    }
}

let $xmin = 0;
let $xmax = 0;
class DecorationService extends Disposable {
    get decorations() { return this._decorations.values(); }
    constructor() {
        super();
        this._decorations = new SortedList(e => e === null || e === void 0 ? void 0 : e.marker.line);
        this._onDecorationRegistered = this.register(new EventEmitter());
        this.onDecorationRegistered = this._onDecorationRegistered.event;
        this._onDecorationRemoved = this.register(new EventEmitter());
        this.onDecorationRemoved = this._onDecorationRemoved.event;
        this.register(toDisposable(() => this.reset()));
    }
    registerDecoration(options) {
        if (options.marker.isDisposed) {
            return undefined;
        }
        const decoration = new Decoration(options);
        if (decoration) {
            const markerDispose = decoration.marker.onDispose(() => decoration.dispose());
            decoration.onDispose(() => {
                if (decoration) {
                    if (this._decorations.delete(decoration)) {
                        this._onDecorationRemoved.fire(decoration);
                    }
                    markerDispose.dispose();
                }
            });
            this._decorations.insert(decoration);
            this._onDecorationRegistered.fire(decoration);
        }
        return decoration;
    }
    reset() {
        for (const d of this._decorations.values()) {
            d.dispose();
        }
        this._decorations.clear();
    }
    *getDecorationsAtCell(x, line, layer) {
        var _a, _b, _c;
        let xmin = 0;
        let xmax = 0;
        for (const d of this._decorations.getKeyIterator(line)) {
            xmin = (_a = d.options.x) !== null && _a !== void 0 ? _a : 0;
            xmax = xmin + ((_b = d.options.width) !== null && _b !== void 0 ? _b : 1);
            if (x >= xmin && x < xmax && (!layer || ((_c = d.options.layer) !== null && _c !== void 0 ? _c : 'bottom') === layer)) {
                yield d;
            }
        }
    }
    forEachDecorationAtCell(x, line, layer, callback) {
        this._decorations.forEachByKey(line, d => {
            var _a, _b, _c;
            $xmin = (_a = d.options.x) !== null && _a !== void 0 ? _a : 0;
            $xmax = $xmin + ((_b = d.options.width) !== null && _b !== void 0 ? _b : 1);
            if (x >= $xmin && x < $xmax && (!layer || ((_c = d.options.layer) !== null && _c !== void 0 ? _c : 'bottom') === layer)) {
                callback(d);
            }
        });
    }
}
class Decoration extends Disposable {
    get isDisposed() { return this._isDisposed; }
    get backgroundColorRGB() {
        if (this._cachedBg === null) {
            if (this.options.backgroundColor) {
                this._cachedBg = css.toColor(this.options.backgroundColor);
            }
            else {
                this._cachedBg = undefined;
            }
        }
        return this._cachedBg;
    }
    get foregroundColorRGB() {
        if (this._cachedFg === null) {
            if (this.options.foregroundColor) {
                this._cachedFg = css.toColor(this.options.foregroundColor);
            }
            else {
                this._cachedFg = undefined;
            }
        }
        return this._cachedFg;
    }
    constructor(options) {
        super();
        this.options = options;
        this.onRenderEmitter = this.register(new EventEmitter());
        this.onRender = this.onRenderEmitter.event;
        this._onDispose = this.register(new EventEmitter());
        this.onDispose = this._onDispose.event;
        this._cachedBg = null;
        this._cachedFg = null;
        this.marker = options.marker;
        if (this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position) {
            this.options.overviewRulerOptions.position = 'full';
        }
    }
    dispose() {
        this._onDispose.fire();
        super.dispose();
    }
}

var WindowsOptionsReportType;
(function (WindowsOptionsReportType) {
    WindowsOptionsReportType[WindowsOptionsReportType["GET_WIN_SIZE_PIXELS"] = 0] = "GET_WIN_SIZE_PIXELS";
    WindowsOptionsReportType[WindowsOptionsReportType["GET_CELL_SIZE_PIXELS"] = 1] = "GET_CELL_SIZE_PIXELS";
})(WindowsOptionsReportType || (WindowsOptionsReportType = {}));
let $temp = 0;
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

const RENDER_DEBOUNCE_THRESHOLD_MS = 1000;
class TimeBasedDebouncer {
    constructor(_renderCallback, _debounceThresholdMS = RENDER_DEBOUNCE_THRESHOLD_MS) {
        this._renderCallback = _renderCallback;
        this._debounceThresholdMS = _debounceThresholdMS;
        this._lastRefreshMs = 0;
        this._additionalRefreshRequested = false;
    }
    dispose() {
        if (this._refreshTimeoutID) {
            clearTimeout(this._refreshTimeoutID);
        }
    }
    refresh(rowStart, rowEnd, rowCount) {
        this._rowCount = rowCount;
        rowStart = rowStart !== undefined ? rowStart : 0;
        rowEnd = rowEnd !== undefined ? rowEnd : this._rowCount - 1;
        this._rowStart = this._rowStart !== undefined ? Math.min(this._rowStart, rowStart) : rowStart;
        this._rowEnd = this._rowEnd !== undefined ? Math.max(this._rowEnd, rowEnd) : rowEnd;
        const refreshRequestTime = Date.now();
        if (refreshRequestTime - this._lastRefreshMs >= this._debounceThresholdMS) {
            this._lastRefreshMs = refreshRequestTime;
            this._innerRefresh();
        }
        else if (!this._additionalRefreshRequested) {
            const elapsed = refreshRequestTime - this._lastRefreshMs;
            const waitPeriodBeforeTrailingRefresh = this._debounceThresholdMS - elapsed;
            this._additionalRefreshRequested = true;
            this._refreshTimeoutID = window.setTimeout(() => {
                this._lastRefreshMs = Date.now();
                this._innerRefresh();
                this._additionalRefreshRequested = false;
                this._refreshTimeoutID = undefined;
            }, waitPeriodBeforeTrailingRefresh);
        }
    }
    _innerRefresh() {
        if (this._rowStart === undefined || this._rowEnd === undefined || this._rowCount === undefined) {
            return;
        }
        const start = Math.max(this._rowStart, 0);
        const end = Math.min(this._rowEnd, this._rowCount - 1);
        this._rowStart = undefined;
        this._rowEnd = undefined;
        this._renderCallback(start, end);
    }
}

const MAX_ROWS_TO_READ = 20;
let AccessibilityManager = class AccessibilityManager extends Disposable {
    constructor(_terminal, instantiationService, _coreBrowserService, _renderService) {
        super();
        this._terminal = _terminal;
        this._coreBrowserService = _coreBrowserService;
        this._renderService = _renderService;
        this._rowColumns = new WeakMap();
        this._liveRegionLineCount = 0;
        this._charsToConsume = [];
        this._charsToAnnounce = '';
        this._accessibilityContainer = this._coreBrowserService.mainDocument.createElement('div');
        this._accessibilityContainer.classList.add('xterm-accessibility');
        this._rowContainer = this._coreBrowserService.mainDocument.createElement('div');
        this._rowContainer.setAttribute('role', 'list');
        this._rowContainer.classList.add('xterm-accessibility-tree');
        this._rowElements = [];
        for (let i = 0; i < this._terminal.rows; i++) {
            this._rowElements[i] = this._createAccessibilityTreeNode();
            this._rowContainer.appendChild(this._rowElements[i]);
        }
        this._topBoundaryFocusListener = e => this._handleBoundaryFocus(e, 0);
        this._bottomBoundaryFocusListener = e => this._handleBoundaryFocus(e, 1);
        this._rowElements[0].addEventListener('focus', this._topBoundaryFocusListener);
        this._rowElements[this._rowElements.length - 1].addEventListener('focus', this._bottomBoundaryFocusListener);
        this._refreshRowsDimensions();
        this._accessibilityContainer.appendChild(this._rowContainer);
        this._liveRegion = this._coreBrowserService.mainDocument.createElement('div');
        this._liveRegion.classList.add('live-region');
        this._liveRegion.setAttribute('aria-live', 'assertive');
        this._accessibilityContainer.appendChild(this._liveRegion);
        this._liveRegionDebouncer = this.register(new TimeBasedDebouncer(this._renderRows.bind(this)));
        if (!this._terminal.element) {
            throw new Error('Cannot enable accessibility before Terminal.open');
        }
        {
            this._terminal.element.insertAdjacentElement('afterbegin', this._accessibilityContainer);
        }
        this.register(this._terminal.onResize(e => this._handleResize(e.rows)));
        this.register(this._terminal.onRender(e => this._refreshRows(e.start, e.end)));
        this.register(this._terminal.onScroll(() => this._refreshRows()));
        this.register(this._terminal.onA11yChar(char => this._handleChar(char)));
        this.register(this._terminal.onLineFeed(() => this._handleChar('\n')));
        this.register(this._terminal.onA11yTab(spaceCount => this._handleTab(spaceCount)));
        this.register(this._terminal.onKey(e => this._handleKey(e.key)));
        this.register(this._terminal.onBlur(() => this._clearLiveRegion()));
        this.register(this._renderService.onDimensionsChange(() => this._refreshRowsDimensions()));
        this.register(addDisposableDomListener(document, 'selectionchange', () => this._handleSelectionChange()));
        this.register(this._coreBrowserService.onDprChange(() => this._refreshRowsDimensions()));
        this._refreshRows();
        this.register(toDisposable(() => {
            {
                this._accessibilityContainer.remove();
            }
            this._rowElements.length = 0;
        }));
    }
    _handleTab(spaceCount) {
        for (let i = 0; i < spaceCount; i++) {
            this._handleChar(' ');
        }
    }
    _handleChar(char) {
        if (this._liveRegionLineCount < MAX_ROWS_TO_READ + 1) {
            if (this._charsToConsume.length > 0) {
                const shiftedChar = this._charsToConsume.shift();
                if (shiftedChar !== char) {
                    this._charsToAnnounce += char;
                }
            }
            else {
                this._charsToAnnounce += char;
            }
            if (char === '\n') {
                this._liveRegionLineCount++;
                if (this._liveRegionLineCount === MAX_ROWS_TO_READ + 1) {
                    this._liveRegion.textContent += tooMuchOutput;
                }
            }
        }
    }
    _clearLiveRegion() {
        this._liveRegion.textContent = '';
        this._liveRegionLineCount = 0;
    }
    _handleKey(keyChar) {
        this._clearLiveRegion();
        if (!/\p{Control}/u.test(keyChar)) {
            this._charsToConsume.push(keyChar);
        }
    }
    _refreshRows(start, end) {
        this._liveRegionDebouncer.refresh(start, end, this._terminal.rows);
    }
    _renderRows(start, end) {
        const buffer = this._terminal.buffer;
        const setSize = buffer.lines.length.toString();
        for (let i = start; i <= end; i++) {
            const line = buffer.lines.get(buffer.ydisp + i);
            const columns = [];
            const lineData = (line === null || line === void 0 ? void 0 : line.translateToString(true, undefined, undefined, columns)) || '';
            const posInSet = (buffer.ydisp + i + 1).toString();
            const element = this._rowElements[i];
            if (element) {
                if (lineData.length === 0) {
                    element.innerText = '\u00a0';
                    this._rowColumns.set(element, [0, 1]);
                }
                else {
                    element.textContent = lineData;
                    this._rowColumns.set(element, columns);
                }
                element.setAttribute('aria-posinset', posInSet);
                element.setAttribute('aria-setsize', setSize);
            }
        }
        this._announceCharacters();
    }
    _announceCharacters() {
        if (this._charsToAnnounce.length === 0) {
            return;
        }
        this._liveRegion.textContent += this._charsToAnnounce;
        this._charsToAnnounce = '';
    }
    _handleBoundaryFocus(e, position) {
        const boundaryElement = e.target;
        const beforeBoundaryElement = this._rowElements[position === 0 ? 1 : this._rowElements.length - 2];
        const posInSet = boundaryElement.getAttribute('aria-posinset');
        const lastRowPos = position === 0 ? '1' : `${this._terminal.buffer.lines.length}`;
        if (posInSet === lastRowPos) {
            return;
        }
        if (e.relatedTarget !== beforeBoundaryElement) {
            return;
        }
        let topBoundaryElement;
        let bottomBoundaryElement;
        if (position === 0) {
            topBoundaryElement = boundaryElement;
            bottomBoundaryElement = this._rowElements.pop();
            this._rowContainer.removeChild(bottomBoundaryElement);
        }
        else {
            topBoundaryElement = this._rowElements.shift();
            bottomBoundaryElement = boundaryElement;
            this._rowContainer.removeChild(topBoundaryElement);
        }
        topBoundaryElement.removeEventListener('focus', this._topBoundaryFocusListener);
        bottomBoundaryElement.removeEventListener('focus', this._bottomBoundaryFocusListener);
        if (position === 0) {
            const newElement = this._createAccessibilityTreeNode();
            this._rowElements.unshift(newElement);
            this._rowContainer.insertAdjacentElement('afterbegin', newElement);
        }
        else {
            const newElement = this._createAccessibilityTreeNode();
            this._rowElements.push(newElement);
            this._rowContainer.appendChild(newElement);
        }
        this._rowElements[0].addEventListener('focus', this._topBoundaryFocusListener);
        this._rowElements[this._rowElements.length - 1].addEventListener('focus', this._bottomBoundaryFocusListener);
        this._terminal.scrollLines(position === 0 ? -1 : 1);
        this._rowElements[position === 0 ? 1 : this._rowElements.length - 2].focus();
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    _handleSelectionChange() {
        var _a, _b;
        if (this._rowElements.length === 0) {
            return;
        }
        const selection = document.getSelection();
        if (!selection) {
            return;
        }
        if (selection.isCollapsed) {
            if (this._rowContainer.contains(selection.anchorNode)) {
                this._terminal.clearSelection();
            }
            return;
        }
        if (!selection.anchorNode || !selection.focusNode) {
            console.error('anchorNode and/or focusNode are null');
            return;
        }
        let begin = { node: selection.anchorNode, offset: selection.anchorOffset };
        let end = { node: selection.focusNode, offset: selection.focusOffset };
        if ((begin.node.compareDocumentPosition(end.node) & Node.DOCUMENT_POSITION_PRECEDING) || (begin.node === end.node && begin.offset > end.offset)) {
            [begin, end] = [end, begin];
        }
        if (begin.node.compareDocumentPosition(this._rowElements[0]) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING)) {
            begin = { node: this._rowElements[0].childNodes[0], offset: 0 };
        }
        if (!this._rowContainer.contains(begin.node)) {
            return;
        }
        const lastRowElement = this._rowElements.slice(-1)[0];
        if (end.node.compareDocumentPosition(lastRowElement) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_PRECEDING)) {
            end = {
                node: lastRowElement,
                offset: (_b = (_a = lastRowElement.textContent) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0
            };
        }
        if (!this._rowContainer.contains(end.node)) {
            return;
        }
        const toRowColumn = ({ node, offset }) => {
            const rowElement = node instanceof Text ? node.parentNode : node;
            let row = parseInt(rowElement === null || rowElement === void 0 ? void 0 : rowElement.getAttribute('aria-posinset'), 10) - 1;
            if (isNaN(row)) {
                console.warn('row is invalid. Race condition?');
                return null;
            }
            const columns = this._rowColumns.get(rowElement);
            if (!columns) {
                console.warn('columns is null. Race condition?');
                return null;
            }
            let column = offset < columns.length ? columns[offset] : columns.slice(-1)[0] + 1;
            if (column >= this._terminal.cols) {
                ++row;
                column = 0;
            }
            return {
                row,
                column
            };
        };
        const beginRowColumn = toRowColumn(begin);
        const endRowColumn = toRowColumn(end);
        if (!beginRowColumn || !endRowColumn) {
            return;
        }
        if (beginRowColumn.row > endRowColumn.row || (beginRowColumn.row === endRowColumn.row && beginRowColumn.column >= endRowColumn.column)) {
            throw new Error('invalid range');
        }
        this._terminal.select(beginRowColumn.column, beginRowColumn.row, (endRowColumn.row - beginRowColumn.row) * this._terminal.cols - beginRowColumn.column + endRowColumn.column);
    }
    _handleResize(rows) {
        this._rowElements[this._rowElements.length - 1].removeEventListener('focus', this._bottomBoundaryFocusListener);
        for (let i = this._rowContainer.children.length; i < this._terminal.rows; i++) {
            this._rowElements[i] = this._createAccessibilityTreeNode();
            this._rowContainer.appendChild(this._rowElements[i]);
        }
        while (this._rowElements.length > rows) {
            this._rowContainer.removeChild(this._rowElements.pop());
        }
        this._rowElements[this._rowElements.length - 1].addEventListener('focus', this._bottomBoundaryFocusListener);
        this._refreshRowsDimensions();
    }
    _createAccessibilityTreeNode() {
        const element = this._coreBrowserService.mainDocument.createElement('div');
        element.setAttribute('role', 'listitem');
        element.tabIndex = -1;
        this._refreshRowDimensions(element);
        return element;
    }
    _refreshRowsDimensions() {
        if (!this._renderService.dimensions.css.cell.height) {
            return;
        }
        this._accessibilityContainer.style.width = `${this._renderService.dimensions.css.canvas.width}px`;
        if (this._rowElements.length !== this._terminal.rows) {
            this._handleResize(this._terminal.rows);
        }
        for (let i = 0; i < this._terminal.rows; i++) {
            this._refreshRowDimensions(this._rowElements[i]);
        }
    }
    _refreshRowDimensions(element) {
        element.style.height = `${this._renderService.dimensions.css.cell.height}px`;
    }
};
AccessibilityManager = __decorate([
    __param(1, IInstantiationService),
    __param(2, ICoreBrowserService),
    __param(3, IRenderService$1),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], AccessibilityManager);

let Terminal$1 = class Terminal extends CoreTerminal {
    get onFocus() { return this._onFocus.event; }
    get onBlur() { return this._onBlur.event; }
    get onA11yChar() { return this._onA11yCharEmitter.event; }
    get onA11yTab() { return this._onA11yTabEmitter.event; }
    get onWillOpen() { return this._onWillOpen.event; }
    constructor(options = {}) {
        super(options);
        this.browser = Browser;
        this._keyDownHandled = false;
        this._keyDownSeen = false;
        this._keyPressHandled = false;
        this._unprocessedDeadKey = false;
        this._accessibilityManager = this.register(new MutableDisposable());
        this._onCursorMove = this.register(new EventEmitter());
        this.onCursorMove = this._onCursorMove.event;
        this._onKey = this.register(new EventEmitter());
        this.onKey = this._onKey.event;
        this._onRender = this.register(new EventEmitter());
        this.onRender = this._onRender.event;
        this._onSelectionChange = this.register(new EventEmitter());
        this.onSelectionChange = this._onSelectionChange.event;
        this._onTitleChange = this.register(new EventEmitter());
        this.onTitleChange = this._onTitleChange.event;
        this._onBell = this.register(new EventEmitter());
        this.onBell = this._onBell.event;
        this._onFocus = this.register(new EventEmitter());
        this._onBlur = this.register(new EventEmitter());
        this._onA11yCharEmitter = this.register(new EventEmitter());
        this._onA11yTabEmitter = this.register(new EventEmitter());
        this._onWillOpen = this.register(new EventEmitter());
        this._setup();
        this.linkifier2 = this.register(this._instantiationService.createInstance(Linkifier2));
        this.linkifier2.registerLinkProvider(this._instantiationService.createInstance(OscLinkProvider));
        this._decorationService = this._instantiationService.createInstance(DecorationService);
        this._instantiationService.setService(IDecorationService, this._decorationService);
        this.register(this._inputHandler.onRequestBell(() => this._onBell.fire()));
        this.register(this._inputHandler.onRequestRefreshRows((start, end) => this.refresh(start, end)));
        this.register(this._inputHandler.onRequestSendFocus(() => this._reportFocus()));
        this.register(this._inputHandler.onRequestReset(() => this.reset()));
        this.register(this._inputHandler.onRequestWindowsOptionsReport(type => this._reportWindowsOptions(type)));
        this.register(this._inputHandler.onColor((event) => this._handleColorEvent(event)));
        this.register(forwardEvent(this._inputHandler.onCursorMove, this._onCursorMove));
        this.register(forwardEvent(this._inputHandler.onTitleChange, this._onTitleChange));
        this.register(forwardEvent(this._inputHandler.onA11yChar, this._onA11yCharEmitter));
        this.register(forwardEvent(this._inputHandler.onA11yTab, this._onA11yTabEmitter));
        this.register(this._bufferService.onResize(e => this._afterResize(e.cols, e.rows)));
        this.register(toDisposable(() => {
            var _a, _b;
            this._customKeyEventHandler = undefined;
            (_b = (_a = this.element) === null || _a === void 0 ? void 0 : _a.parentNode) === null || _b === void 0 ? void 0 : _b.removeChild(this.element);
        }));
    }
    _handleColorEvent(event) {
        if (!this._themeService)
            return;
        for (const req of event) {
            let acc;
            let ident = '';
            switch (req.index) {
                case 256:
                    acc = 'foreground';
                    ident = '10';
                    break;
                case 257:
                    acc = 'background';
                    ident = '11';
                    break;
                case 258:
                    acc = 'cursor';
                    ident = '12';
                    break;
                default:
                    acc = 'ansi';
                    ident = '4;' + req.index;
            }
            switch (req.type) {
                case 0:
                    const channels = color.toColorRGB(acc === 'ansi'
                        ? this._themeService.colors.ansi[req.index]
                        : this._themeService.colors[acc]);
                    this.coreService.triggerDataEvent(`${C0.ESC}]${ident};${toRgbString(channels)}${C1_ESCAPED.ST}`);
                    break;
                case 1:
                    if (acc === 'ansi') {
                        this._themeService.modifyColors(colors => colors.ansi[req.index] = rgba.toColor(...req.color));
                    }
                    else {
                        const narrowedAcc = acc;
                        this._themeService.modifyColors(colors => colors[narrowedAcc] = rgba.toColor(...req.color));
                    }
                    break;
                case 2:
                    this._themeService.restoreColor(req.index);
                    break;
            }
        }
    }
    _setup() {
        super._setup();
        this._customKeyEventHandler = undefined;
    }
    get buffer() {
        return this.buffers.active;
    }
    focus() {
        if (this.textarea) {
            this.textarea.focus({ preventScroll: true });
        }
    }
    _handleScreenReaderModeOptionChange(value) {
        if (value) {
            if (!this._accessibilityManager.value && this._renderService) {
                this._accessibilityManager.value = this._instantiationService.createInstance(AccessibilityManager, this);
            }
        }
        else {
            this._accessibilityManager.clear();
        }
    }
    _handleTextAreaFocus(ev) {
        if (this.coreService.decPrivateModes.sendFocus) {
            this.coreService.triggerDataEvent(C0.ESC + '[I');
        }
        this.updateCursorStyle(ev);
        this.element.classList.add('focus');
        this._showCursor();
        this._onFocus.fire();
    }
    blur() {
        var _a;
        return (_a = this.textarea) === null || _a === void 0 ? void 0 : _a.blur();
    }
    _handleTextAreaBlur() {
        this.textarea.value = '';
        this.refresh(this.buffer.y, this.buffer.y);
        if (this.coreService.decPrivateModes.sendFocus) {
            this.coreService.triggerDataEvent(C0.ESC + '[O');
        }
        this.element.classList.remove('focus');
        this._onBlur.fire();
    }
    _syncTextArea() {
        if (!this.textarea || !this.buffer.isCursorInViewport || this._compositionHelper.isComposing || !this._renderService) {
            return;
        }
        const cursorY = this.buffer.ybase + this.buffer.y;
        const bufferLine = this.buffer.lines.get(cursorY);
        if (!bufferLine) {
            return;
        }
        const cursorX = Math.min(this.buffer.x, this.cols - 1);
        const cellHeight = this._renderService.dimensions.css.cell.height;
        const width = bufferLine.getWidth(cursorX);
        const cellWidth = this._renderService.dimensions.css.cell.width * width;
        const cursorTop = this.buffer.y * this._renderService.dimensions.css.cell.height;
        const cursorLeft = cursorX * this._renderService.dimensions.css.cell.width;
        this.textarea.style.left = cursorLeft + 'px';
        this.textarea.style.top = cursorTop + 'px';
        this.textarea.style.width = cellWidth + 'px';
        this.textarea.style.height = cellHeight + 'px';
        this.textarea.style.lineHeight = cellHeight + 'px';
        this.textarea.style.zIndex = '-5';
    }
    _initGlobal() {
        this._bindKeys();
        this.register(addDisposableDomListener(this.element, 'copy', (event) => {
            if (!this.hasSelection()) {
                return;
            }
            copyHandler(event, this._selectionService);
        }));
        const pasteHandlerWrapper = (event) => handlePasteEvent(event, this.textarea, this.coreService, this.optionsService);
        this.register(addDisposableDomListener(this.textarea, 'paste', pasteHandlerWrapper));
        this.register(addDisposableDomListener(this.element, 'paste', pasteHandlerWrapper));
        if (isFirefox) {
            this.register(addDisposableDomListener(this.element, 'mousedown', (event) => {
                if (event.button === 2) {
                    rightClickHandler(event, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
                }
            }));
        }
        else {
            this.register(addDisposableDomListener(this.element, 'contextmenu', (event) => {
                rightClickHandler(event, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
            }));
        }
        if (isLinux) {
            this.register(addDisposableDomListener(this.element, 'auxclick', (event) => {
                if (event.button === 1) {
                    moveTextAreaUnderMouseCursor(event, this.textarea, this.screenElement);
                }
            }));
        }
    }
    _bindKeys() {
        this.register(addDisposableDomListener(this.textarea, 'keyup', (ev) => this._keyUp(ev), true));
        this.register(addDisposableDomListener(this.textarea, 'keydown', (ev) => this._keyDown(ev), true));
        this.register(addDisposableDomListener(this.textarea, 'keypress', (ev) => this._keyPress(ev), true));
        this.register(addDisposableDomListener(this.textarea, 'compositionstart', () => this._compositionHelper.compositionstart()));
        this.register(addDisposableDomListener(this.textarea, 'compositionupdate', (e) => this._compositionHelper.compositionupdate(e)));
        this.register(addDisposableDomListener(this.textarea, 'compositionend', () => this._compositionHelper.compositionend()));
        this.register(addDisposableDomListener(this.textarea, 'input', (ev) => this._inputEvent(ev), true));
        this.register(this.onRender(() => this._compositionHelper.updateCompositionElements()));
    }
    open(parent) {
        var _a, _b, _c;
        if (!parent) {
            throw new Error('Terminal requires a parent element.');
        }
        if (!parent.isConnected) {
            this._logService.debug('Terminal.open was called on an element that was not attached to the DOM');
        }
        if (((_a = this.element) === null || _a === void 0 ? void 0 : _a.ownerDocument.defaultView) && this._coreBrowserService) {
            if (this.element.ownerDocument.defaultView !== this._coreBrowserService.window) {
                this._coreBrowserService.window = this.element.ownerDocument.defaultView;
            }
            return;
        }
        this._document = parent.ownerDocument;
        if (this.options.documentOverride && this.options.documentOverride instanceof Document) {
            this._document = this.optionsService.rawOptions.documentOverride;
        }
        this.element = this._document.createElement('div');
        this.element.dir = 'ltr';
        this.element.classList.add('terminal');
        this.element.classList.add('xterm');
        parent.appendChild(this.element);
        const fragment = this._document.createDocumentFragment();
        this._viewportElement = this._document.createElement('div');
        this._viewportElement.classList.add('xterm-viewport');
        fragment.appendChild(this._viewportElement);
        this._viewportScrollArea = this._document.createElement('div');
        this._viewportScrollArea.classList.add('xterm-scroll-area');
        this._viewportElement.appendChild(this._viewportScrollArea);
        this.screenElement = this._document.createElement('div');
        this.screenElement.classList.add('xterm-screen');
        this._helperContainer = this._document.createElement('div');
        this._helperContainer.classList.add('xterm-helpers');
        this.screenElement.appendChild(this._helperContainer);
        fragment.appendChild(this.screenElement);
        this.textarea = this._document.createElement('textarea');
        this.textarea.classList.add('xterm-helper-textarea');
        this.textarea.setAttribute('aria-label', promptLabel);
        if (!isChromeOS) {
            this.textarea.setAttribute('aria-multiline', 'false');
        }
        this.textarea.setAttribute('autocorrect', 'off');
        this.textarea.setAttribute('autocapitalize', 'off');
        this.textarea.setAttribute('spellcheck', 'false');
        this.textarea.tabIndex = 0;
        this._coreBrowserService = this.register(this._instantiationService.createInstance(CoreBrowserService, this.textarea, (_b = parent.ownerDocument.defaultView) !== null && _b !== void 0 ? _b : window, ((_c = this._document) !== null && _c !== void 0 ? _c : (typeof window !== 'undefined')) ? window.document : null));
        this._instantiationService.setService(ICoreBrowserService, this._coreBrowserService);
        this.register(addDisposableDomListener(this.textarea, 'focus', (ev) => this._handleTextAreaFocus(ev)));
        this.register(addDisposableDomListener(this.textarea, 'blur', () => this._handleTextAreaBlur()));
        this._helperContainer.appendChild(this.textarea);
        this._charSizeService = this._instantiationService.createInstance(CharSizeService, this._document, this._helperContainer);
        this._instantiationService.setService(ICharSizeService$1, this._charSizeService);
        this._themeService = this._instantiationService.createInstance(ThemeService);
        this._instantiationService.setService(IThemeService, this._themeService);
        this._characterJoinerService = this._instantiationService.createInstance(CharacterJoinerService);
        this._instantiationService.setService(ICharacterJoinerService, this._characterJoinerService);
        this._renderService = this.register(this._instantiationService.createInstance(RenderService, this.rows, this.screenElement));
        this._instantiationService.setService(IRenderService$1, this._renderService);
        this.register(this._renderService.onRenderedViewportChange(e => this._onRender.fire(e)));
        this.onResize(e => this._renderService.resize(e.cols, e.rows));
        this._compositionView = this._document.createElement('div');
        this._compositionView.classList.add('composition-view');
        this._compositionHelper = this._instantiationService.createInstance(CompositionHelper, this.textarea, this._compositionView);
        this._helperContainer.appendChild(this._compositionView);
        this.element.appendChild(fragment);
        try {
            this._onWillOpen.fire(this.element);
        }
        catch (_d) { }
        if (!this._renderService.hasRenderer()) {
            this._renderService.setRenderer(this._createRenderer());
        }
        this._mouseService = this._instantiationService.createInstance(MouseService);
        this._instantiationService.setService(IMouseService, this._mouseService);
        this.viewport = this._instantiationService.createInstance(Viewport, this._viewportElement, this._viewportScrollArea);
        this.viewport.onRequestScrollLines(e => this.scrollLines(e.amount, e.suppressScrollEvent, 1)),
            this.register(this._inputHandler.onRequestSyncScrollBar(() => this.viewport.syncScrollArea()));
        this.register(this.viewport);
        this.register(this.onCursorMove(() => {
            this._renderService.handleCursorMove();
            this._syncTextArea();
        }));
        this.register(this.onResize(() => this._renderService.handleResize(this.cols, this.rows)));
        this.register(this.onBlur(() => this._renderService.handleBlur()));
        this.register(this.onFocus(() => this._renderService.handleFocus()));
        this.register(this._renderService.onDimensionsChange(() => this.viewport.syncScrollArea()));
        this._selectionService = this.register(this._instantiationService.createInstance(SelectionService, this.element, this.screenElement, this.linkifier2));
        this._instantiationService.setService(ISelectionService, this._selectionService);
        this.register(this._selectionService.onRequestScrollLines(e => this.scrollLines(e.amount, e.suppressScrollEvent)));
        this.register(this._selectionService.onSelectionChange(() => this._onSelectionChange.fire()));
        this.register(this._selectionService.onRequestRedraw(e => this._renderService.handleSelectionChanged(e.start, e.end, e.columnSelectMode)));
        this.register(this._selectionService.onLinuxMouseSelection(text => {
            this.textarea.value = text;
            this.textarea.focus();
            this.textarea.select();
        }));
        this.register(this._onScroll.event(ev => {
            this.viewport.syncScrollArea();
            this._selectionService.refresh();
        }));
        this.register(addDisposableDomListener(this._viewportElement, 'scroll', () => this._selectionService.refresh()));
        this.linkifier2.attachToDom(this.screenElement, this._mouseService, this._renderService);
        this.register(this._instantiationService.createInstance(BufferDecorationRenderer, this.screenElement));
        this.register(addDisposableDomListener(this.element, 'mousedown', (e) => this._selectionService.handleMouseDown(e)));
        if (this.coreMouseService.areMouseEventsActive) {
            this._selectionService.disable();
            this.element.classList.add('enable-mouse-events');
        }
        else {
            this._selectionService.enable();
        }
        if (this.options.screenReaderMode) {
            this._accessibilityManager.value = this._instantiationService.createInstance(AccessibilityManager, this);
        }
        this.register(this.optionsService.onSpecificOptionChange('screenReaderMode', e => this._handleScreenReaderModeOptionChange(e)));
        if (this.options.overviewRulerWidth) {
            this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(OverviewRulerRenderer, this._viewportElement, this.screenElement));
        }
        this.optionsService.onSpecificOptionChange('overviewRulerWidth', value => {
            if (!this._overviewRulerRenderer && value && this._viewportElement && this.screenElement) {
                this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(OverviewRulerRenderer, this._viewportElement, this.screenElement));
            }
        });
        this._charSizeService.measure();
        this.refresh(0, this.rows - 1);
        this._initGlobal();
        this.bindMouse();
    }
    _createRenderer() {
        return this._instantiationService.createInstance(DomRenderer, this, this._document, this.element, this.screenElement, this._viewportElement, this._helperContainer, this.linkifier2);
    }
    bindMouse() {
        const self = this;
        const el = this.element;
        function sendEvent(ev) {
            const pos = self._mouseService.getMouseReportCoords(ev, self.screenElement);
            if (!pos) {
                return false;
            }
            let but;
            let action;
            switch (ev.overrideType || ev.type) {
                case 'mousemove':
                    action = 32;
                    if (ev.buttons === undefined) {
                        but = 3;
                        if (ev.button !== undefined) {
                            but = ev.button < 3 ? ev.button : 3;
                        }
                    }
                    else {
                        but = ev.buttons & 1 ? 0 :
                            ev.buttons & 4 ? 1 :
                                ev.buttons & 2 ? 2 :
                                    3;
                    }
                    break;
                case 'mouseup':
                    action = 0;
                    but = ev.button < 3 ? ev.button : 3;
                    break;
                case 'mousedown':
                    action = 1;
                    but = ev.button < 3 ? ev.button : 3;
                    break;
                case 'wheel':
                    const amount = self.viewport.getLinesScrolled(ev);
                    if (amount === 0) {
                        return false;
                    }
                    action = ev.deltaY < 0 ? 0 : 1;
                    but = 4;
                    break;
                default:
                    return false;
            }
            if (action === undefined || but === undefined || but > 4) {
                return false;
            }
            return self.coreMouseService.triggerMouseEvent({
                col: pos.col,
                row: pos.row,
                x: pos.x,
                y: pos.y,
                button: but,
                action,
                ctrl: ev.ctrlKey,
                alt: ev.altKey,
                shift: ev.shiftKey
            });
        }
        const requestedEvents = {
            mouseup: null,
            wheel: null,
            mousedrag: null,
            mousemove: null
        };
        const eventListeners = {
            mouseup: (ev) => {
                sendEvent(ev);
                if (!ev.buttons) {
                    this._document.removeEventListener('mouseup', requestedEvents.mouseup);
                    if (requestedEvents.mousedrag) {
                        this._document.removeEventListener('mousemove', requestedEvents.mousedrag);
                    }
                }
                return this.cancel(ev);
            },
            wheel: (ev) => {
                sendEvent(ev);
                return this.cancel(ev, true);
            },
            mousedrag: (ev) => {
                if (ev.buttons) {
                    sendEvent(ev);
                }
            },
            mousemove: (ev) => {
                if (!ev.buttons) {
                    sendEvent(ev);
                }
            }
        };
        this.register(this.coreMouseService.onProtocolChange(events => {
            if (events) {
                if (this.optionsService.rawOptions.logLevel === 'debug') {
                    this._logService.debug('Binding to mouse events:', this.coreMouseService.explainEvents(events));
                }
                this.element.classList.add('enable-mouse-events');
                this._selectionService.disable();
            }
            else {
                this._logService.debug('Unbinding from mouse events.');
                this.element.classList.remove('enable-mouse-events');
                this._selectionService.enable();
            }
            if (!(events & 8)) {
                el.removeEventListener('mousemove', requestedEvents.mousemove);
                requestedEvents.mousemove = null;
            }
            else if (!requestedEvents.mousemove) {
                el.addEventListener('mousemove', eventListeners.mousemove);
                requestedEvents.mousemove = eventListeners.mousemove;
            }
            if (!(events & 16)) {
                el.removeEventListener('wheel', requestedEvents.wheel);
                requestedEvents.wheel = null;
            }
            else if (!requestedEvents.wheel) {
                el.addEventListener('wheel', eventListeners.wheel, { passive: false });
                requestedEvents.wheel = eventListeners.wheel;
            }
            if (!(events & 2)) {
                this._document.removeEventListener('mouseup', requestedEvents.mouseup);
                requestedEvents.mouseup = null;
            }
            else if (!requestedEvents.mouseup) {
                requestedEvents.mouseup = eventListeners.mouseup;
            }
            if (!(events & 4)) {
                this._document.removeEventListener('mousemove', requestedEvents.mousedrag);
                requestedEvents.mousedrag = null;
            }
            else if (!requestedEvents.mousedrag) {
                requestedEvents.mousedrag = eventListeners.mousedrag;
            }
        }));
        this.coreMouseService.activeProtocol = this.coreMouseService.activeProtocol;
        this.register(addDisposableDomListener(el, 'mousedown', (ev) => {
            ev.preventDefault();
            this.focus();
            if (!this.coreMouseService.areMouseEventsActive || this._selectionService.shouldForceSelection(ev)) {
                return;
            }
            sendEvent(ev);
            if (requestedEvents.mouseup) {
                this._document.addEventListener('mouseup', requestedEvents.mouseup);
            }
            if (requestedEvents.mousedrag) {
                this._document.addEventListener('mousemove', requestedEvents.mousedrag);
            }
            return this.cancel(ev);
        }));
        this.register(addDisposableDomListener(el, 'wheel', (ev) => {
            if (requestedEvents.wheel)
                return;
            if (!this.buffer.hasScrollback) {
                const amount = this.viewport.getLinesScrolled(ev);
                if (amount === 0) {
                    return;
                }
                const sequence = C0.ESC + (this.coreService.decPrivateModes.applicationCursorKeys ? 'O' : '[') + (ev.deltaY < 0 ? 'A' : 'B');
                let data = '';
                for (let i = 0; i < Math.abs(amount); i++) {
                    data += sequence;
                }
                this.coreService.triggerDataEvent(data, true);
                return this.cancel(ev, true);
            }
            if (this.viewport.handleWheel(ev)) {
                return this.cancel(ev);
            }
        }, { passive: false }));
        this.register(addDisposableDomListener(el, 'touchstart', (ev) => {
            if (this.coreMouseService.areMouseEventsActive)
                return;
            this.viewport.handleTouchStart(ev);
            return this.cancel(ev);
        }, { passive: true }));
        this.register(addDisposableDomListener(el, 'touchmove', (ev) => {
            if (this.coreMouseService.areMouseEventsActive)
                return;
            if (!this.viewport.handleTouchMove(ev)) {
                return this.cancel(ev);
            }
        }, { passive: false }));
    }
    refresh(start, end) {
        var _a;
        (_a = this._renderService) === null || _a === void 0 ? void 0 : _a.refreshRows(start, end);
    }
    updateCursorStyle(ev) {
        var _a;
        if ((_a = this._selectionService) === null || _a === void 0 ? void 0 : _a.shouldColumnSelect(ev)) {
            this.element.classList.add('column-select');
        }
        else {
            this.element.classList.remove('column-select');
        }
    }
    _showCursor() {
        if (!this.coreService.isCursorInitialized) {
            this.coreService.isCursorInitialized = true;
            this.refresh(this.buffer.y, this.buffer.y);
        }
    }
    scrollLines(disp, suppressScrollEvent, source = 0) {
        var _a;
        if (source === 1) {
            super.scrollLines(disp, suppressScrollEvent, source);
            this.refresh(0, this.rows - 1);
        }
        else {
            (_a = this.viewport) === null || _a === void 0 ? void 0 : _a.scrollLines(disp);
        }
    }
    paste(data) {
        paste(data, this.textarea, this.coreService, this.optionsService);
    }
    attachCustomKeyEventHandler(customKeyEventHandler) {
        this._customKeyEventHandler = customKeyEventHandler;
    }
    registerLinkProvider(linkProvider) {
        return this.linkifier2.registerLinkProvider(linkProvider);
    }
    registerCharacterJoiner(handler) {
        if (!this._characterJoinerService) {
            throw new Error('Terminal must be opened first');
        }
        const joinerId = this._characterJoinerService.register(handler);
        this.refresh(0, this.rows - 1);
        return joinerId;
    }
    deregisterCharacterJoiner(joinerId) {
        if (!this._characterJoinerService) {
            throw new Error('Terminal must be opened first');
        }
        if (this._characterJoinerService.deregister(joinerId)) {
            this.refresh(0, this.rows - 1);
        }
    }
    get markers() {
        return this.buffer.markers;
    }
    registerMarker(cursorYOffset) {
        return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + cursorYOffset);
    }
    registerDecoration(decorationOptions) {
        return this._decorationService.registerDecoration(decorationOptions);
    }
    hasSelection() {
        return this._selectionService ? this._selectionService.hasSelection : false;
    }
    select(column, row, length) {
        this._selectionService.setSelection(column, row, length);
    }
    getSelection() {
        return this._selectionService ? this._selectionService.selectionText : '';
    }
    getSelectionPosition() {
        if (!this._selectionService || !this._selectionService.hasSelection) {
            return undefined;
        }
        return {
            start: {
                x: this._selectionService.selectionStart[0],
                y: this._selectionService.selectionStart[1]
            },
            end: {
                x: this._selectionService.selectionEnd[0],
                y: this._selectionService.selectionEnd[1]
            }
        };
    }
    clearSelection() {
        var _a;
        (_a = this._selectionService) === null || _a === void 0 ? void 0 : _a.clearSelection();
    }
    selectAll() {
        var _a;
        (_a = this._selectionService) === null || _a === void 0 ? void 0 : _a.selectAll();
    }
    selectLines(start, end) {
        var _a;
        (_a = this._selectionService) === null || _a === void 0 ? void 0 : _a.selectLines(start, end);
    }
    _keyDown(event) {
        this._keyDownHandled = false;
        this._keyDownSeen = true;
        if (this._customKeyEventHandler && this._customKeyEventHandler(event) === false) {
            return false;
        }
        const shouldIgnoreComposition = this.browser.isMac && this.options.macOptionIsMeta && event.altKey;
        if (!shouldIgnoreComposition && !this._compositionHelper.keydown(event)) {
            if (this.options.scrollOnUserInput && this.buffer.ybase !== this.buffer.ydisp) {
                this.scrollToBottom();
            }
            return false;
        }
        if (!shouldIgnoreComposition && (event.key === 'Dead' || event.key === 'AltGraph')) {
            this._unprocessedDeadKey = true;
        }
        const result = evaluateKeyboardEvent(event, this.coreService.decPrivateModes.applicationCursorKeys, this.browser.isMac, this.options.macOptionIsMeta);
        this.updateCursorStyle(event);
        if (result.type === 3 || result.type === 2) {
            const scrollCount = this.rows - 1;
            this.scrollLines(result.type === 2 ? -scrollCount : scrollCount);
            return this.cancel(event, true);
        }
        if (result.type === 1) {
            this.selectAll();
        }
        if (this._isThirdLevelShift(this.browser, event)) {
            return true;
        }
        if (result.cancel) {
            this.cancel(event, true);
        }
        if (!result.key) {
            return true;
        }
        if (event.key && !event.ctrlKey && !event.altKey && !event.metaKey && event.key.length === 1) {
            if (event.key.charCodeAt(0) >= 65 && event.key.charCodeAt(0) <= 90) {
                return true;
            }
        }
        if (this._unprocessedDeadKey) {
            this._unprocessedDeadKey = false;
            return true;
        }
        if (result.key === C0.ETX || result.key === C0.CR) {
            this.textarea.value = '';
        }
        this._onKey.fire({ key: result.key, domEvent: event });
        this._showCursor();
        this.coreService.triggerDataEvent(result.key, true);
        if (!this.optionsService.rawOptions.screenReaderMode || event.altKey || event.ctrlKey) {
            return this.cancel(event, true);
        }
        this._keyDownHandled = true;
    }
    _isThirdLevelShift(browser, ev) {
        const thirdLevelKey = (browser.isMac && !this.options.macOptionIsMeta && ev.altKey && !ev.ctrlKey && !ev.metaKey) ||
            (browser.isWindows && ev.altKey && ev.ctrlKey && !ev.metaKey) ||
            (browser.isWindows && ev.getModifierState('AltGraph'));
        if (ev.type === 'keypress') {
            return thirdLevelKey;
        }
        return thirdLevelKey && (!ev.keyCode || ev.keyCode > 47);
    }
    _keyUp(ev) {
        this._keyDownSeen = false;
        if (this._customKeyEventHandler && this._customKeyEventHandler(ev) === false) {
            return;
        }
        if (!wasModifierKeyOnlyEvent(ev)) {
            this.focus();
        }
        this.updateCursorStyle(ev);
        this._keyPressHandled = false;
    }
    _keyPress(ev) {
        let key;
        this._keyPressHandled = false;
        if (this._keyDownHandled) {
            return false;
        }
        if (this._customKeyEventHandler && this._customKeyEventHandler(ev) === false) {
            return false;
        }
        this.cancel(ev);
        if (ev.charCode) {
            key = ev.charCode;
        }
        else if (ev.which === null || ev.which === undefined) {
            key = ev.keyCode;
        }
        else if (ev.which !== 0 && ev.charCode !== 0) {
            key = ev.which;
        }
        else {
            return false;
        }
        if (!key || ((ev.altKey || ev.ctrlKey || ev.metaKey) && !this._isThirdLevelShift(this.browser, ev))) {
            return false;
        }
        key = String.fromCharCode(key);
        this._onKey.fire({ key, domEvent: ev });
        this._showCursor();
        this.coreService.triggerDataEvent(key, true);
        this._keyPressHandled = true;
        this._unprocessedDeadKey = false;
        return true;
    }
    _inputEvent(ev) {
        if (ev.data && ev.inputType === 'insertText' && (!ev.composed || !this._keyDownSeen) && !this.optionsService.rawOptions.screenReaderMode) {
            if (this._keyPressHandled) {
                return false;
            }
            this._unprocessedDeadKey = false;
            const text = ev.data;
            this.coreService.triggerDataEvent(text, true);
            this.cancel(ev);
            return true;
        }
        return false;
    }
    resize(x, y) {
        if (x === this.cols && y === this.rows) {
            if (this._charSizeService && !this._charSizeService.hasValidSize) {
                this._charSizeService.measure();
            }
            return;
        }
        super.resize(x, y);
    }
    _afterResize(x, y) {
        var _a, _b;
        (_a = this._charSizeService) === null || _a === void 0 ? void 0 : _a.measure();
        (_b = this.viewport) === null || _b === void 0 ? void 0 : _b.syncScrollArea(true);
    }
    clear() {
        var _a;
        if (this.buffer.ybase === 0 && this.buffer.y === 0) {
            return;
        }
        this.buffer.clearAllMarkers();
        this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y));
        this.buffer.lines.length = 1;
        this.buffer.ydisp = 0;
        this.buffer.ybase = 0;
        this.buffer.y = 0;
        for (let i = 1; i < this.rows; i++) {
            this.buffer.lines.push(this.buffer.getBlankLine(DEFAULT_ATTR_DATA));
        }
        this._onScroll.fire({ position: this.buffer.ydisp, source: 0 });
        (_a = this.viewport) === null || _a === void 0 ? void 0 : _a.reset();
        this.refresh(0, this.rows - 1);
    }
    reset() {
        var _a, _b;
        this.options.rows = this.rows;
        this.options.cols = this.cols;
        const customKeyEventHandler = this._customKeyEventHandler;
        this._setup();
        super.reset();
        (_a = this._selectionService) === null || _a === void 0 ? void 0 : _a.reset();
        this._decorationService.reset();
        (_b = this.viewport) === null || _b === void 0 ? void 0 : _b.reset();
        this._customKeyEventHandler = customKeyEventHandler;
        this.refresh(0, this.rows - 1);
    }
    clearTextureAtlas() {
        var _a;
        (_a = this._renderService) === null || _a === void 0 ? void 0 : _a.clearTextureAtlas();
    }
    _reportFocus() {
        var _a;
        if ((_a = this.element) === null || _a === void 0 ? void 0 : _a.classList.contains('focus')) {
            this.coreService.triggerDataEvent(C0.ESC + '[I');
        }
        else {
            this.coreService.triggerDataEvent(C0.ESC + '[O');
        }
    }
    _reportWindowsOptions(type) {
        if (!this._renderService) {
            return;
        }
        switch (type) {
            case WindowsOptionsReportType.GET_WIN_SIZE_PIXELS:
                const canvasWidth = this._renderService.dimensions.css.canvas.width.toFixed(0);
                const canvasHeight = this._renderService.dimensions.css.canvas.height.toFixed(0);
                this.coreService.triggerDataEvent(`${C0.ESC}[4;${canvasHeight};${canvasWidth}t`);
                break;
            case WindowsOptionsReportType.GET_CELL_SIZE_PIXELS:
                const cellWidth = this._renderService.dimensions.css.cell.width.toFixed(0);
                const cellHeight = this._renderService.dimensions.css.cell.height.toFixed(0);
                this.coreService.triggerDataEvent(`${C0.ESC}[6;${cellHeight};${cellWidth}t`);
                break;
        }
    }
    cancel(ev, force) {
        if (!this.options.cancelEvents && !force) {
            return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        return false;
    }
};
function wasModifierKeyOnlyEvent(ev) {
    return ev.keyCode === 16 ||
        ev.keyCode === 17 ||
        ev.keyCode === 18;
}

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
        if (!this._core.optionsService.rawOptions.allowProposedApi) {
            throw new Error('You must set the allowProposedApi option to true to use proposed API');
        }
    }
    get onBell() { return this._core.onBell; }
    get onBinary() { return this._core.onBinary; }
    get onCursorMove() { return this._core.onCursorMove; }
    get onData() { return this._core.onData; }
    get onKey() { return this._core.onKey; }
    get onLineFeed() { return this._core.onLineFeed; }
    get onRender() { return this._core.onRender; }
    get onResize() { return this._core.onResize; }
    get onScroll() { return this._core.onScroll; }
    get onSelectionChange() { return this._core.onSelectionChange; }
    get onTitleChange() { return this._core.onTitleChange; }
    get onWriteParsed() { return this._core.onWriteParsed; }
    get element() { return this._core.element; }
    get parser() {
        if (!this._parser) {
            this._parser = new ParserApi(this._core);
        }
        return this._parser;
    }
    get unicode() {
        this._checkProposedApi();
        return new UnicodeApi(this._core);
    }
    get textarea() { return this._core.textarea; }
    get rows() { return this._core.rows; }
    get cols() { return this._core.cols; }
    get buffer() {
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
    blur() {
        this._core.blur();
    }
    focus() {
        this._core.focus();
    }
    resize(columns, rows) {
        this._verifyIntegers(columns, rows);
        this._core.resize(columns, rows);
    }
    open(parent) {
        this._core.open(parent);
    }
    attachCustomKeyEventHandler(customKeyEventHandler) {
        this._core.attachCustomKeyEventHandler(customKeyEventHandler);
    }
    registerLinkProvider(linkProvider) {
        return this._core.registerLinkProvider(linkProvider);
    }
    registerCharacterJoiner(handler) {
        this._checkProposedApi();
        return this._core.registerCharacterJoiner(handler);
    }
    deregisterCharacterJoiner(joinerId) {
        this._checkProposedApi();
        this._core.deregisterCharacterJoiner(joinerId);
    }
    registerMarker(cursorYOffset = 0) {
        this._verifyIntegers(cursorYOffset);
        return this._core.registerMarker(cursorYOffset);
    }
    registerDecoration(decorationOptions) {
        var _a, _b, _c;
        this._checkProposedApi();
        this._verifyPositiveIntegers((_a = decorationOptions.x) !== null && _a !== void 0 ? _a : 0, (_b = decorationOptions.width) !== null && _b !== void 0 ? _b : 0, (_c = decorationOptions.height) !== null && _c !== void 0 ? _c : 0);
        return this._core.registerDecoration(decorationOptions);
    }
    hasSelection() {
        return this._core.hasSelection();
    }
    select(column, row, length) {
        this._verifyIntegers(column, row, length);
        this._core.select(column, row, length);
    }
    getSelection() {
        return this._core.getSelection();
    }
    getSelectionPosition() {
        return this._core.getSelectionPosition();
    }
    clearSelection() {
        this._core.clearSelection();
    }
    selectAll() {
        this._core.selectAll();
    }
    selectLines(start, end) {
        this._verifyIntegers(start, end);
        this._core.selectLines(start, end);
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
    paste(data) {
        this._core.paste(data);
    }
    refresh(start, end) {
        this._verifyIntegers(start, end);
        this._core.refresh(start, end);
    }
    reset() {
        this._core.reset();
    }
    clearTextureAtlas() {
        this._core.clearTextureAtlas();
    }
    loadAddon(addon) {
        this._addonManager.loadAddon(this, addon);
    }
    static get strings() {
        return Strings;
    }
    _verifyIntegers(...values) {
        for (const value of values) {
            if (value === Infinity || isNaN(value) || value % 1 !== 0) {
                throw new Error('This API only accepts integers');
            }
        }
    }
    _verifyPositiveIntegers(...values) {
        for (const value of values) {
            if (value && (value === Infinity || isNaN(value) || value % 1 !== 0 || value < 0)) {
                throw new Error('This API only accepts positive integers');
            }
        }
    }
}

export { Terminal };
//# sourceMappingURL=xterm.mjs.map
