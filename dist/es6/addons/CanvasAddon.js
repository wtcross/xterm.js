import { EventEmitter, forwardEvent } from 'common/EventEmitter';
import { Disposable, MutableDisposable, toDisposable } from 'common/Lifecycle';
import { setTraceLogger } from 'common/services/LogService';
import { acquireTextureAtlas, removeTerminalFromCache } from 'browser/renderer/shared/CharAtlasCache';
import { observeDevicePixelDimensions } from 'browser/renderer/shared/DevicePixelObserver';
import { throwIfFalsy, createRenderDimensions } from 'browser/renderer/shared/RendererUtils';
import { CursorBlinkStateManager } from 'browser/renderer/shared/CursorBlinkStateManager';
import { isSafari, isFirefox } from 'common/Platform';
import { CellData } from 'common/buffer/CellData';
import { CellColorResolver } from 'browser/renderer/shared/CellColorResolver';
import { TEXT_BASELINE, INVERTED_DEFAULT_COLOR } from 'browser/renderer/shared/Constants';
import { tryDrawCustomChar } from 'browser/renderer/shared/CustomGlyphs';
import { createSelectionRenderModel } from 'browser/renderer/shared/SelectionRenderModel';
import { WHITESPACE_CELL_CODE, NULL_CELL_CODE } from 'common/buffer/Constants';
import { is256Color } from 'browser/renderer/shared/CharAtlasUtils';
import { JoinedCellData } from 'browser/services/CharacterJoinerService';
import { AttributeData } from 'common/buffer/AttributeData';

class BaseRenderLayer extends Disposable {
    get canvas() { return this._canvas; }
    get cacheCanvas() { return this._charAtlas?.pages[0].canvas; }
    constructor(_terminal, _container, id, zIndex, _alpha, _themeService, _bufferService, _optionsService, _decorationService, _coreBrowserService) {
        super();
        this._terminal = _terminal;
        this._container = _container;
        this._alpha = _alpha;
        this._themeService = _themeService;
        this._bufferService = _bufferService;
        this._optionsService = _optionsService;
        this._decorationService = _decorationService;
        this._coreBrowserService = _coreBrowserService;
        this._deviceCharWidth = 0;
        this._deviceCharHeight = 0;
        this._deviceCellWidth = 0;
        this._deviceCellHeight = 0;
        this._deviceCharLeft = 0;
        this._deviceCharTop = 0;
        this._selectionModel = createSelectionRenderModel();
        this._bitmapGenerator = [];
        this._charAtlasDisposable = this.register(new MutableDisposable());
        this._onAddTextureAtlasCanvas = this.register(new EventEmitter());
        this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
        this._cellColorResolver = new CellColorResolver(this._terminal, this._optionsService, this._selectionModel, this._decorationService, this._coreBrowserService, this._themeService);
        this._canvas = this._coreBrowserService.mainDocument.createElement('canvas');
        this._canvas.classList.add(`xterm-${id}-layer`);
        this._canvas.style.zIndex = zIndex.toString();
        this._initCanvas();
        this._container.appendChild(this._canvas);
        this._refreshCharAtlas(this._themeService.colors);
        this.register(this._themeService.onChangeColors(e => {
            this._refreshCharAtlas(e);
            this.reset();
            this.handleSelectionChanged(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode);
        }));
        this.register(toDisposable(() => {
            this._canvas.remove();
        }));
    }
    _initCanvas() {
        this._ctx = throwIfFalsy(this._canvas.getContext('2d', { alpha: this._alpha }));
        if (!this._alpha) {
            this._clearAll();
        }
    }
    handleBlur() { }
    handleFocus() { }
    handleCursorMove() { }
    handleGridChanged(startRow, endRow) { }
    handleSelectionChanged(start, end, columnSelectMode = false) {
        this._selectionModel.update(this._terminal._core, start, end, columnSelectMode);
    }
    _setTransparency(alpha) {
        if (alpha === this._alpha) {
            return;
        }
        const oldCanvas = this._canvas;
        this._alpha = alpha;
        this._canvas = this._canvas.cloneNode();
        this._initCanvas();
        this._container.replaceChild(this._canvas, oldCanvas);
        this._refreshCharAtlas(this._themeService.colors);
        this.handleGridChanged(0, this._bufferService.rows - 1);
    }
    _refreshCharAtlas(colorSet) {
        if (this._deviceCharWidth <= 0 && this._deviceCharHeight <= 0) {
            return;
        }
        this._charAtlas = acquireTextureAtlas(this._terminal, this._optionsService.rawOptions, colorSet, this._deviceCellWidth, this._deviceCellHeight, this._deviceCharWidth, this._deviceCharHeight, this._coreBrowserService.dpr);
        this._charAtlasDisposable.value = forwardEvent(this._charAtlas.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas);
        this._charAtlas.warmUp();
        for (let i = 0; i < this._charAtlas.pages.length; i++) {
            this._bitmapGenerator[i] = new BitmapGenerator(this._charAtlas.pages[i].canvas);
        }
    }
    resize(dim) {
        this._deviceCellWidth = dim.device.cell.width;
        this._deviceCellHeight = dim.device.cell.height;
        this._deviceCharWidth = dim.device.char.width;
        this._deviceCharHeight = dim.device.char.height;
        this._deviceCharLeft = dim.device.char.left;
        this._deviceCharTop = dim.device.char.top;
        this._canvas.width = dim.device.canvas.width;
        this._canvas.height = dim.device.canvas.height;
        this._canvas.style.width = `${dim.css.canvas.width}px`;
        this._canvas.style.height = `${dim.css.canvas.height}px`;
        if (!this._alpha) {
            this._clearAll();
        }
        this._refreshCharAtlas(this._themeService.colors);
    }
    clearTextureAtlas() {
        this._charAtlas?.clearTexture();
    }
    _fillCells(x, y, width, height) {
        this._ctx.fillRect(x * this._deviceCellWidth, y * this._deviceCellHeight, width * this._deviceCellWidth, height * this._deviceCellHeight);
    }
    _fillMiddleLineAtCells(x, y, width = 1) {
        const cellOffset = Math.ceil(this._deviceCellHeight * 0.5);
        this._ctx.fillRect(x * this._deviceCellWidth, (y + 1) * this._deviceCellHeight - cellOffset - this._coreBrowserService.dpr, width * this._deviceCellWidth, this._coreBrowserService.dpr);
    }
    _fillBottomLineAtCells(x, y, width = 1, pixelOffset = 0) {
        this._ctx.fillRect(x * this._deviceCellWidth, (y + 1) * this._deviceCellHeight + pixelOffset - this._coreBrowserService.dpr - 1, width * this._deviceCellWidth, this._coreBrowserService.dpr);
    }
    _curlyUnderlineAtCell(x, y, width = 1) {
        this._ctx.save();
        this._ctx.beginPath();
        this._ctx.strokeStyle = this._ctx.fillStyle;
        const lineWidth = this._coreBrowserService.dpr;
        this._ctx.lineWidth = lineWidth;
        for (let xOffset = 0; xOffset < width; xOffset++) {
            const xLeft = (x + xOffset) * this._deviceCellWidth;
            const xMid = (x + xOffset + 0.5) * this._deviceCellWidth;
            const xRight = (x + xOffset + 1) * this._deviceCellWidth;
            const yMid = (y + 1) * this._deviceCellHeight - lineWidth - 1;
            const yMidBot = yMid - lineWidth;
            const yMidTop = yMid + lineWidth;
            this._ctx.moveTo(xLeft, yMid);
            this._ctx.bezierCurveTo(xLeft, yMidBot, xMid, yMidBot, xMid, yMid);
            this._ctx.bezierCurveTo(xMid, yMidTop, xRight, yMidTop, xRight, yMid);
        }
        this._ctx.stroke();
        this._ctx.restore();
    }
    _dottedUnderlineAtCell(x, y, width = 1) {
        this._ctx.save();
        this._ctx.beginPath();
        this._ctx.strokeStyle = this._ctx.fillStyle;
        const lineWidth = this._coreBrowserService.dpr;
        this._ctx.lineWidth = lineWidth;
        this._ctx.setLineDash([lineWidth * 2, lineWidth]);
        const xLeft = x * this._deviceCellWidth;
        const yMid = (y + 1) * this._deviceCellHeight - lineWidth - 1;
        this._ctx.moveTo(xLeft, yMid);
        for (let xOffset = 0; xOffset < width; xOffset++) {
            const xRight = (x + width + xOffset) * this._deviceCellWidth;
            this._ctx.lineTo(xRight, yMid);
        }
        this._ctx.stroke();
        this._ctx.closePath();
        this._ctx.restore();
    }
    _dashedUnderlineAtCell(x, y, width = 1) {
        this._ctx.save();
        this._ctx.beginPath();
        this._ctx.strokeStyle = this._ctx.fillStyle;
        const lineWidth = this._coreBrowserService.dpr;
        this._ctx.lineWidth = lineWidth;
        this._ctx.setLineDash([lineWidth * 4, lineWidth * 3]);
        const xLeft = x * this._deviceCellWidth;
        const xRight = (x + width) * this._deviceCellWidth;
        const yMid = (y + 1) * this._deviceCellHeight - lineWidth - 1;
        this._ctx.moveTo(xLeft, yMid);
        this._ctx.lineTo(xRight, yMid);
        this._ctx.stroke();
        this._ctx.closePath();
        this._ctx.restore();
    }
    _fillLeftLineAtCell(x, y, width) {
        this._ctx.fillRect(x * this._deviceCellWidth, y * this._deviceCellHeight, this._coreBrowserService.dpr * width, this._deviceCellHeight);
    }
    _strokeRectAtCell(x, y, width, height) {
        const lineWidth = this._coreBrowserService.dpr;
        this._ctx.lineWidth = lineWidth;
        this._ctx.strokeRect(x * this._deviceCellWidth + lineWidth / 2, y * this._deviceCellHeight + (lineWidth / 2), width * this._deviceCellWidth - lineWidth, (height * this._deviceCellHeight) - lineWidth);
    }
    _clearAll() {
        if (this._alpha) {
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        }
        else {
            this._ctx.fillStyle = this._themeService.colors.background.css;
            this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
        }
    }
    _clearCells(x, y, width, height) {
        if (this._alpha) {
            this._ctx.clearRect(x * this._deviceCellWidth, y * this._deviceCellHeight, width * this._deviceCellWidth, height * this._deviceCellHeight);
        }
        else {
            this._ctx.fillStyle = this._themeService.colors.background.css;
            this._ctx.fillRect(x * this._deviceCellWidth, y * this._deviceCellHeight, width * this._deviceCellWidth, height * this._deviceCellHeight);
        }
    }
    _fillCharTrueColor(cell, x, y) {
        this._ctx.font = this._getFont(false, false);
        this._ctx.textBaseline = TEXT_BASELINE;
        this._clipRow(y);
        let drawSuccess = false;
        if (this._optionsService.rawOptions.customGlyphs !== false) {
            drawSuccess = tryDrawCustomChar(this._ctx, cell.getChars(), x * this._deviceCellWidth, y * this._deviceCellHeight, this._deviceCellWidth, this._deviceCellHeight, this._optionsService.rawOptions.fontSize, this._coreBrowserService.dpr);
        }
        if (!drawSuccess) {
            this._ctx.fillText(cell.getChars(), x * this._deviceCellWidth + this._deviceCharLeft, y * this._deviceCellHeight + this._deviceCharTop + this._deviceCharHeight);
        }
    }
    _drawChars(cell, x, y) {
        const chars = cell.getChars();
        this._cellColorResolver.resolve(cell, x, this._bufferService.buffer.ydisp + y, this._deviceCellWidth);
        if (!this._charAtlas) {
            return;
        }
        let glyph;
        if (chars && chars.length > 1) {
            glyph = this._charAtlas.getRasterizedGlyphCombinedChar(chars, this._cellColorResolver.result.bg, this._cellColorResolver.result.fg, this._cellColorResolver.result.ext, true);
        }
        else {
            glyph = this._charAtlas.getRasterizedGlyph(cell.getCode() || WHITESPACE_CELL_CODE, this._cellColorResolver.result.bg, this._cellColorResolver.result.fg, this._cellColorResolver.result.ext, true);
        }
        if (!glyph.size.x || !glyph.size.y) {
            return;
        }
        this._ctx.save();
        this._clipRow(y);
        if (this._bitmapGenerator[glyph.texturePage] && this._charAtlas.pages[glyph.texturePage].canvas !== this._bitmapGenerator[glyph.texturePage].canvas) {
            this._bitmapGenerator[glyph.texturePage]?.bitmap?.close();
            delete this._bitmapGenerator[glyph.texturePage];
        }
        if (this._charAtlas.pages[glyph.texturePage].version !== this._bitmapGenerator[glyph.texturePage]?.version) {
            if (!this._bitmapGenerator[glyph.texturePage]) {
                this._bitmapGenerator[glyph.texturePage] = new BitmapGenerator(this._charAtlas.pages[glyph.texturePage].canvas);
            }
            this._bitmapGenerator[glyph.texturePage].refresh();
            this._bitmapGenerator[glyph.texturePage].version = this._charAtlas.pages[glyph.texturePage].version;
        }
        this._ctx.drawImage(this._bitmapGenerator[glyph.texturePage]?.bitmap || this._charAtlas.pages[glyph.texturePage].canvas, glyph.texturePosition.x, glyph.texturePosition.y, glyph.size.x, glyph.size.y, x * this._deviceCellWidth + this._deviceCharLeft - glyph.offset.x, y * this._deviceCellHeight + this._deviceCharTop - glyph.offset.y, glyph.size.x, glyph.size.y);
        this._ctx.restore();
    }
    _clipRow(y) {
        this._ctx.beginPath();
        this._ctx.rect(0, y * this._deviceCellHeight, this._bufferService.cols * this._deviceCellWidth, this._deviceCellHeight);
        this._ctx.clip();
    }
    _getFont(isBold, isItalic) {
        const fontWeight = isBold ? this._optionsService.rawOptions.fontWeightBold : this._optionsService.rawOptions.fontWeight;
        const fontStyle = isItalic ? 'italic' : '';
        return `${fontStyle} ${fontWeight} ${this._optionsService.rawOptions.fontSize * this._coreBrowserService.dpr}px ${this._optionsService.rawOptions.fontFamily}`;
    }
}
const GLYPH_BITMAP_COMMIT_DELAY = 100;
class BitmapGenerator {
    get bitmap() { return this._bitmap; }
    constructor(canvas) {
        this.canvas = canvas;
        this._state = 0;
        this._commitTimeout = undefined;
        this._bitmap = undefined;
        this.version = -1;
    }
    refresh() {
        this._bitmap?.close();
        this._bitmap = undefined;
        if (isSafari) {
            return;
        }
        if (this._commitTimeout === undefined) {
            this._commitTimeout = window.setTimeout(() => this._generate(), GLYPH_BITMAP_COMMIT_DELAY);
        }
        if (this._state === 1) {
            this._state = 2;
        }
    }
    _generate() {
        if (this._state === 0) {
            this._bitmap?.close();
            this._bitmap = undefined;
            this._state = 1;
            window.createImageBitmap(this.canvas).then(bitmap => {
                if (this._state === 2) {
                    this.refresh();
                }
                else {
                    this._bitmap = bitmap;
                }
                this._state = 0;
            });
            if (this._commitTimeout) {
                this._commitTimeout = undefined;
            }
        }
    }
}

class CursorRenderLayer extends BaseRenderLayer {
    constructor(terminal, container, zIndex, _onRequestRedraw, bufferService, optionsService, _coreService, coreBrowserService, decorationService, themeService) {
        super(terminal, container, 'cursor', zIndex, true, themeService, bufferService, optionsService, decorationService, coreBrowserService);
        this._onRequestRedraw = _onRequestRedraw;
        this._coreService = _coreService;
        this._cursorBlinkStateManager = this.register(new MutableDisposable());
        this._cell = new CellData();
        this._state = {
            x: 0,
            y: 0,
            isFocused: false,
            style: '',
            width: 0
        };
        this._cursorRenderers = {
            'bar': this._renderBarCursor.bind(this),
            'block': this._renderBlockCursor.bind(this),
            'underline': this._renderUnderlineCursor.bind(this),
            'outline': this._renderOutlineCursor.bind(this)
        };
        this.register(optionsService.onOptionChange(() => this._handleOptionsChanged()));
        this._handleOptionsChanged();
    }
    resize(dim) {
        super.resize(dim);
        this._state = {
            x: 0,
            y: 0,
            isFocused: false,
            style: '',
            width: 0
        };
    }
    reset() {
        this._clearCursor();
        this._cursorBlinkStateManager.value?.restartBlinkAnimation();
        this._handleOptionsChanged();
    }
    handleBlur() {
        this._cursorBlinkStateManager.value?.pause();
        this._onRequestRedraw.fire({ start: this._bufferService.buffer.y, end: this._bufferService.buffer.y });
    }
    handleFocus() {
        this._cursorBlinkStateManager.value?.resume();
        this._onRequestRedraw.fire({ start: this._bufferService.buffer.y, end: this._bufferService.buffer.y });
    }
    _handleOptionsChanged() {
        if (this._optionsService.rawOptions.cursorBlink) {
            if (!this._cursorBlinkStateManager.value) {
                this._cursorBlinkStateManager.value = new CursorBlinkStateManager(() => this._render(true), this._coreBrowserService);
            }
        }
        else {
            this._cursorBlinkStateManager.clear();
        }
        this._onRequestRedraw.fire({ start: this._bufferService.buffer.y, end: this._bufferService.buffer.y });
    }
    handleCursorMove() {
        this._cursorBlinkStateManager.value?.restartBlinkAnimation();
    }
    handleGridChanged(startRow, endRow) {
        if (!this._cursorBlinkStateManager.value || this._cursorBlinkStateManager.value.isPaused) {
            this._render(false);
        }
        else {
            this._cursorBlinkStateManager.value.restartBlinkAnimation();
        }
    }
    _render(triggeredByAnimationFrame) {
        if (!this._coreService.isCursorInitialized || this._coreService.isCursorHidden) {
            this._clearCursor();
            return;
        }
        const cursorY = this._bufferService.buffer.ybase + this._bufferService.buffer.y;
        const viewportRelativeCursorY = cursorY - this._bufferService.buffer.ydisp;
        if (viewportRelativeCursorY < 0 || viewportRelativeCursorY >= this._bufferService.rows) {
            this._clearCursor();
            return;
        }
        const cursorX = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1);
        this._bufferService.buffer.lines.get(cursorY).loadCell(cursorX, this._cell);
        if (this._cell.content === undefined) {
            return;
        }
        if (!this._coreBrowserService.isFocused) {
            this._clearCursor();
            this._ctx.save();
            this._ctx.fillStyle = this._themeService.colors.cursor.css;
            const cursorStyle = this._optionsService.rawOptions.cursorStyle;
            const cursorInactiveStyle = this._optionsService.rawOptions.cursorInactiveStyle;
            if (cursorInactiveStyle && cursorInactiveStyle !== 'none') {
                this._cursorRenderers[cursorInactiveStyle](cursorX, viewportRelativeCursorY, this._cell);
            }
            this._ctx.restore();
            this._state.x = cursorX;
            this._state.y = viewportRelativeCursorY;
            this._state.isFocused = false;
            this._state.style = cursorStyle;
            this._state.width = this._cell.getWidth();
            return;
        }
        if (this._cursorBlinkStateManager.value && !this._cursorBlinkStateManager.value.isCursorVisible) {
            this._clearCursor();
            return;
        }
        if (this._state) {
            if (this._state.x === cursorX &&
                this._state.y === viewportRelativeCursorY &&
                this._state.isFocused === this._coreBrowserService.isFocused &&
                this._state.style === this._optionsService.rawOptions.cursorStyle &&
                this._state.width === this._cell.getWidth()) {
                return;
            }
            this._clearCursor();
        }
        this._ctx.save();
        this._cursorRenderers[this._optionsService.rawOptions.cursorStyle || 'block'](cursorX, viewportRelativeCursorY, this._cell);
        this._ctx.restore();
        this._state.x = cursorX;
        this._state.y = viewportRelativeCursorY;
        this._state.isFocused = false;
        this._state.style = this._optionsService.rawOptions.cursorStyle;
        this._state.width = this._cell.getWidth();
    }
    _clearCursor() {
        if (this._state) {
            if (isFirefox || this._coreBrowserService.dpr < 1) {
                this._clearAll();
            }
            else {
                this._clearCells(this._state.x, this._state.y, this._state.width, 1);
            }
            this._state = {
                x: 0,
                y: 0,
                isFocused: false,
                style: '',
                width: 0
            };
        }
    }
    _renderBarCursor(x, y, cell) {
        this._ctx.save();
        this._ctx.fillStyle = this._themeService.colors.cursor.css;
        this._fillLeftLineAtCell(x, y, this._optionsService.rawOptions.cursorWidth);
        this._ctx.restore();
    }
    _renderBlockCursor(x, y, cell) {
        this._ctx.save();
        this._ctx.fillStyle = this._themeService.colors.cursor.css;
        this._fillCells(x, y, cell.getWidth(), 1);
        this._ctx.fillStyle = this._themeService.colors.cursorAccent.css;
        this._fillCharTrueColor(cell, x, y);
        this._ctx.restore();
    }
    _renderUnderlineCursor(x, y, cell) {
        this._ctx.save();
        this._ctx.fillStyle = this._themeService.colors.cursor.css;
        this._fillBottomLineAtCells(x, y);
        this._ctx.restore();
    }
    _renderOutlineCursor(x, y, cell) {
        this._ctx.save();
        this._ctx.strokeStyle = this._themeService.colors.cursor.css;
        this._strokeRectAtCell(x, y, cell.getWidth(), 1);
        this._ctx.restore();
    }
}

class LinkRenderLayer extends BaseRenderLayer {
    constructor(terminal, container, zIndex, linkifier2, bufferService, optionsService, decorationService, coreBrowserService, themeService) {
        super(terminal, container, 'link', zIndex, true, themeService, bufferService, optionsService, decorationService, coreBrowserService);
        this.register(linkifier2.onShowLinkUnderline(e => this._handleShowLinkUnderline(e)));
        this.register(linkifier2.onHideLinkUnderline(e => this._handleHideLinkUnderline(e)));
    }
    resize(dim) {
        super.resize(dim);
        this._state = undefined;
    }
    reset() {
        this._clearCurrentLink();
    }
    _clearCurrentLink() {
        if (this._state) {
            this._clearCells(this._state.x1, this._state.y1, this._state.cols - this._state.x1, 1);
            const middleRowCount = this._state.y2 - this._state.y1 - 1;
            if (middleRowCount > 0) {
                this._clearCells(0, this._state.y1 + 1, this._state.cols, middleRowCount);
            }
            this._clearCells(0, this._state.y2, this._state.x2, 1);
            this._state = undefined;
        }
    }
    _handleShowLinkUnderline(e) {
        if (e.fg === INVERTED_DEFAULT_COLOR) {
            this._ctx.fillStyle = this._themeService.colors.background.css;
        }
        else if (e.fg && is256Color(e.fg)) {
            this._ctx.fillStyle = this._themeService.colors.ansi[e.fg].css;
        }
        else {
            this._ctx.fillStyle = this._themeService.colors.foreground.css;
        }
        if (e.y1 === e.y2) {
            this._fillBottomLineAtCells(e.x1, e.y1, e.x2 - e.x1);
        }
        else {
            this._fillBottomLineAtCells(e.x1, e.y1, e.cols - e.x1);
            for (let y = e.y1 + 1; y < e.y2; y++) {
                this._fillBottomLineAtCells(0, y, e.cols);
            }
            this._fillBottomLineAtCells(0, e.y2, e.x2);
        }
        this._state = e;
    }
    _handleHideLinkUnderline(e) {
        this._clearCurrentLink();
    }
}

class SelectionRenderLayer extends BaseRenderLayer {
    constructor(terminal, container, zIndex, bufferService, coreBrowserService, decorationService, optionsService, themeService) {
        super(terminal, container, 'selection', zIndex, true, themeService, bufferService, optionsService, decorationService, coreBrowserService);
        this._clearState();
    }
    _clearState() {
        this._state = {
            start: undefined,
            end: undefined,
            columnSelectMode: undefined,
            ydisp: undefined
        };
    }
    resize(dim) {
        super.resize(dim);
        if (this._selectionModel.selectionStart && this._selectionModel.selectionEnd) {
            this._clearState();
            this._redrawSelection(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode);
        }
    }
    reset() {
        if (this._state.start && this._state.end) {
            this._clearState();
            this._clearAll();
        }
    }
    handleBlur() {
        this.reset();
        this._redrawSelection(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode);
    }
    handleFocus() {
        this.reset();
        this._redrawSelection(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode);
    }
    handleSelectionChanged(start, end, columnSelectMode) {
        super.handleSelectionChanged(start, end, columnSelectMode);
        this._redrawSelection(start, end, columnSelectMode);
    }
    _redrawSelection(start, end, columnSelectMode) {
        if (!this._didStateChange(start, end, columnSelectMode, this._bufferService.buffer.ydisp)) {
            return;
        }
        this._clearAll();
        if (!start || !end) {
            this._clearState();
            return;
        }
        const viewportStartRow = start[1] - this._bufferService.buffer.ydisp;
        const viewportEndRow = end[1] - this._bufferService.buffer.ydisp;
        const viewportCappedStartRow = Math.max(viewportStartRow, 0);
        const viewportCappedEndRow = Math.min(viewportEndRow, this._bufferService.rows - 1);
        if (viewportCappedStartRow >= this._bufferService.rows || viewportCappedEndRow < 0) {
            this._state.ydisp = this._bufferService.buffer.ydisp;
            return;
        }
        this._ctx.fillStyle = (this._coreBrowserService.isFocused
            ? this._themeService.colors.selectionBackgroundTransparent
            : this._themeService.colors.selectionInactiveBackgroundTransparent).css;
        if (columnSelectMode) {
            const startCol = start[0];
            const width = end[0] - startCol;
            const height = viewportCappedEndRow - viewportCappedStartRow + 1;
            this._fillCells(startCol, viewportCappedStartRow, width, height);
        }
        else {
            const startCol = viewportStartRow === viewportCappedStartRow ? start[0] : 0;
            const startRowEndCol = viewportCappedStartRow === viewportEndRow ? end[0] : this._bufferService.cols;
            this._fillCells(startCol, viewportCappedStartRow, startRowEndCol - startCol, 1);
            const middleRowsCount = Math.max(viewportCappedEndRow - viewportCappedStartRow - 1, 0);
            this._fillCells(0, viewportCappedStartRow + 1, this._bufferService.cols, middleRowsCount);
            if (viewportCappedStartRow !== viewportCappedEndRow) {
                const endCol = viewportEndRow === viewportCappedEndRow ? end[0] : this._bufferService.cols;
                this._fillCells(0, viewportCappedEndRow, endCol, 1);
            }
        }
        this._state.start = [start[0], start[1]];
        this._state.end = [end[0], end[1]];
        this._state.columnSelectMode = columnSelectMode;
        this._state.ydisp = this._bufferService.buffer.ydisp;
    }
    _didStateChange(start, end, columnSelectMode, ydisp) {
        return !this._areCoordinatesEqual(start, this._state.start) ||
            !this._areCoordinatesEqual(end, this._state.end) ||
            columnSelectMode !== this._state.columnSelectMode ||
            ydisp !== this._state.ydisp;
    }
    _areCoordinatesEqual(coord1, coord2) {
        if (!coord1 || !coord2) {
            return false;
        }
        return coord1[0] === coord2[0] && coord1[1] === coord2[1];
    }
}

class GridCache {
    constructor() {
        this.cache = [];
    }
    resize(width, height) {
        for (let x = 0; x < width; x++) {
            if (this.cache.length <= x) {
                this.cache.push([]);
            }
            for (let y = this.cache[x].length; y < height; y++) {
                this.cache[x].push(undefined);
            }
            this.cache[x].length = height;
        }
        this.cache.length = width;
    }
    clear() {
        for (let x = 0; x < this.cache.length; x++) {
            for (let y = 0; y < this.cache[x].length; y++) {
                this.cache[x][y] = undefined;
            }
        }
    }
}

class TextRenderLayer extends BaseRenderLayer {
    constructor(terminal, container, zIndex, alpha, bufferService, optionsService, _characterJoinerService, decorationService, coreBrowserService, themeService) {
        super(terminal, container, 'text', zIndex, alpha, themeService, bufferService, optionsService, decorationService, coreBrowserService);
        this._characterJoinerService = _characterJoinerService;
        this._characterWidth = 0;
        this._characterFont = '';
        this._characterOverlapCache = {};
        this._workCell = new CellData();
        this._state = new GridCache();
        this.register(optionsService.onSpecificOptionChange('allowTransparency', value => this._setTransparency(value)));
    }
    resize(dim) {
        super.resize(dim);
        const terminalFont = this._getFont(false, false);
        if (this._characterWidth !== dim.device.char.width || this._characterFont !== terminalFont) {
            this._characterWidth = dim.device.char.width;
            this._characterFont = terminalFont;
            this._characterOverlapCache = {};
        }
        this._state.clear();
        this._state.resize(this._bufferService.cols, this._bufferService.rows);
    }
    reset() {
        this._state.clear();
        this._clearAll();
    }
    _forEachCell(firstRow, lastRow, callback) {
        for (let y = firstRow; y <= lastRow; y++) {
            const row = y + this._bufferService.buffer.ydisp;
            const line = this._bufferService.buffer.lines.get(row);
            const joinedRanges = this._characterJoinerService.getJoinedCharacters(row);
            for (let x = 0; x < this._bufferService.cols; x++) {
                line.loadCell(x, this._workCell);
                let cell = this._workCell;
                let isJoined = false;
                let lastCharX = x;
                if (cell.getWidth() === 0) {
                    continue;
                }
                if (joinedRanges.length > 0 && x === joinedRanges[0][0]) {
                    isJoined = true;
                    const range = joinedRanges.shift();
                    cell = new JoinedCellData(this._workCell, line.translateToString(true, range[0], range[1]), range[1] - range[0]);
                    lastCharX = range[1] - 1;
                }
                if (!isJoined && this._isOverlapping(cell)) {
                    if (lastCharX < line.length - 1 && line.getCodePoint(lastCharX + 1) === NULL_CELL_CODE) {
                        cell.content &= ~12582912;
                        cell.content |= 2 << 22;
                    }
                }
                callback(cell, x, y);
                x = lastCharX;
            }
        }
    }
    _drawBackground(firstRow, lastRow) {
        const ctx = this._ctx;
        const cols = this._bufferService.cols;
        let startX = 0;
        let startY = 0;
        let prevFillStyle = null;
        ctx.save();
        this._forEachCell(firstRow, lastRow, (cell, x, y) => {
            let nextFillStyle = null;
            if (cell.isInverse()) {
                if (cell.isFgDefault()) {
                    nextFillStyle = this._themeService.colors.foreground.css;
                }
                else if (cell.isFgRGB()) {
                    nextFillStyle = `rgb(${AttributeData.toColorRGB(cell.getFgColor()).join(',')})`;
                }
                else {
                    nextFillStyle = this._themeService.colors.ansi[cell.getFgColor()].css;
                }
            }
            else if (cell.isBgRGB()) {
                nextFillStyle = `rgb(${AttributeData.toColorRGB(cell.getBgColor()).join(',')})`;
            }
            else if (cell.isBgPalette()) {
                nextFillStyle = this._themeService.colors.ansi[cell.getBgColor()].css;
            }
            let isTop = false;
            this._decorationService.forEachDecorationAtCell(x, this._bufferService.buffer.ydisp + y, undefined, d => {
                if (d.options.layer !== 'top' && isTop) {
                    return;
                }
                if (d.backgroundColorRGB) {
                    nextFillStyle = d.backgroundColorRGB.css;
                }
                isTop = d.options.layer === 'top';
            });
            if (prevFillStyle === null) {
                startX = x;
                startY = y;
            }
            if (y !== startY) {
                ctx.fillStyle = prevFillStyle || '';
                this._fillCells(startX, startY, cols - startX, 1);
                startX = x;
                startY = y;
            }
            else if (prevFillStyle !== nextFillStyle) {
                ctx.fillStyle = prevFillStyle || '';
                this._fillCells(startX, startY, x - startX, 1);
                startX = x;
                startY = y;
            }
            prevFillStyle = nextFillStyle;
        });
        if (prevFillStyle !== null) {
            ctx.fillStyle = prevFillStyle;
            this._fillCells(startX, startY, cols - startX, 1);
        }
        ctx.restore();
    }
    _drawForeground(firstRow, lastRow) {
        this._forEachCell(firstRow, lastRow, (cell, x, y) => this._drawChars(cell, x, y));
    }
    handleGridChanged(firstRow, lastRow) {
        if (this._state.cache.length === 0) {
            return;
        }
        if (this._charAtlas) {
            this._charAtlas.beginFrame();
        }
        this._clearCells(0, firstRow, this._bufferService.cols, lastRow - firstRow + 1);
        this._drawBackground(firstRow, lastRow);
        this._drawForeground(firstRow, lastRow);
    }
    _isOverlapping(cell) {
        if (cell.getWidth() !== 1) {
            return false;
        }
        if (cell.getCode() < 256) {
            return false;
        }
        const chars = cell.getChars();
        if (this._characterOverlapCache.hasOwnProperty(chars)) {
            return this._characterOverlapCache[chars];
        }
        this._ctx.save();
        this._ctx.font = this._characterFont;
        const overlaps = Math.floor(this._ctx.measureText(chars).width) > this._characterWidth;
        this._ctx.restore();
        this._characterOverlapCache[chars] = overlaps;
        return overlaps;
    }
}

class CanvasRenderer extends Disposable {
    constructor(_terminal, _screenElement, linkifier2, _bufferService, _charSizeService, _optionsService, characterJoinerService, coreService, _coreBrowserService, decorationService, _themeService) {
        super();
        this._terminal = _terminal;
        this._screenElement = _screenElement;
        this._bufferService = _bufferService;
        this._charSizeService = _charSizeService;
        this._optionsService = _optionsService;
        this._coreBrowserService = _coreBrowserService;
        this._themeService = _themeService;
        this._onRequestRedraw = this.register(new EventEmitter());
        this.onRequestRedraw = this._onRequestRedraw.event;
        this._onChangeTextureAtlas = this.register(new EventEmitter());
        this.onChangeTextureAtlas = this._onChangeTextureAtlas.event;
        this._onAddTextureAtlasCanvas = this.register(new EventEmitter());
        this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
        const allowTransparency = this._optionsService.rawOptions.allowTransparency;
        this._renderLayers = [
            new TextRenderLayer(this._terminal, this._screenElement, 0, allowTransparency, this._bufferService, this._optionsService, characterJoinerService, decorationService, this._coreBrowserService, _themeService),
            new SelectionRenderLayer(this._terminal, this._screenElement, 1, this._bufferService, this._coreBrowserService, decorationService, this._optionsService, _themeService),
            new LinkRenderLayer(this._terminal, this._screenElement, 2, linkifier2, this._bufferService, this._optionsService, decorationService, this._coreBrowserService, _themeService),
            new CursorRenderLayer(this._terminal, this._screenElement, 3, this._onRequestRedraw, this._bufferService, this._optionsService, coreService, this._coreBrowserService, decorationService, _themeService)
        ];
        for (const layer of this._renderLayers) {
            forwardEvent(layer.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas);
        }
        this.dimensions = createRenderDimensions();
        this._devicePixelRatio = this._coreBrowserService.dpr;
        this._updateDimensions();
        this.register(observeDevicePixelDimensions(this._renderLayers[0].canvas, this._coreBrowserService.window, (w, h) => this._setCanvasDevicePixelDimensions(w, h)));
        this.register(toDisposable(() => {
            for (const l of this._renderLayers) {
                l.dispose();
            }
            removeTerminalFromCache(this._terminal);
        }));
    }
    get textureAtlas() {
        return this._renderLayers[0].cacheCanvas;
    }
    handleDevicePixelRatioChange() {
        if (this._devicePixelRatio !== this._coreBrowserService.dpr) {
            this._devicePixelRatio = this._coreBrowserService.dpr;
            this.handleResize(this._bufferService.cols, this._bufferService.rows);
        }
    }
    handleResize(cols, rows) {
        this._updateDimensions();
        for (const l of this._renderLayers) {
            l.resize(this.dimensions);
        }
        this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`;
        this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
    }
    handleCharSizeChanged() {
        this.handleResize(this._bufferService.cols, this._bufferService.rows);
    }
    handleBlur() {
        this._runOperation(l => l.handleBlur());
    }
    handleFocus() {
        this._runOperation(l => l.handleFocus());
    }
    handleSelectionChanged(start, end, columnSelectMode = false) {
        this._runOperation(l => l.handleSelectionChanged(start, end, columnSelectMode));
        if (this._themeService.colors.selectionForeground) {
            this._onRequestRedraw.fire({ start: 0, end: this._bufferService.rows - 1 });
        }
    }
    handleCursorMove() {
        this._runOperation(l => l.handleCursorMove());
    }
    clear() {
        this._runOperation(l => l.reset());
    }
    _runOperation(operation) {
        for (const l of this._renderLayers) {
            operation(l);
        }
    }
    renderRows(start, end) {
        for (const l of this._renderLayers) {
            l.handleGridChanged(start, end);
        }
    }
    clearTextureAtlas() {
        for (const layer of this._renderLayers) {
            layer.clearTextureAtlas();
        }
    }
    _updateDimensions() {
        if (!this._charSizeService.hasValidSize) {
            return;
        }
        const dpr = this._coreBrowserService.dpr;
        this.dimensions.device.char.width = Math.floor(this._charSizeService.width * dpr);
        this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * dpr);
        this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight);
        this.dimensions.device.char.top = this._optionsService.rawOptions.lineHeight === 1 ? 0 : Math.round((this.dimensions.device.cell.height - this.dimensions.device.char.height) / 2);
        this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing);
        this.dimensions.device.char.left = Math.floor(this._optionsService.rawOptions.letterSpacing / 2);
        this.dimensions.device.canvas.height = this._bufferService.rows * this.dimensions.device.cell.height;
        this.dimensions.device.canvas.width = this._bufferService.cols * this.dimensions.device.cell.width;
        this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / dpr);
        this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / dpr);
        this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows;
        this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols;
    }
    _setCanvasDevicePixelDimensions(width, height) {
        this.dimensions.device.canvas.height = height;
        this.dimensions.device.canvas.width = width;
        for (const l of this._renderLayers) {
            l.resize(this.dimensions);
        }
        this._requestRedrawViewport();
    }
    _requestRedrawViewport() {
        this._onRequestRedraw.fire({ start: 0, end: this._bufferService.rows - 1 });
    }
}

class CanvasAddon extends Disposable {
    constructor() {
        super(...arguments);
        this._onChangeTextureAtlas = this.register(new EventEmitter());
        this.onChangeTextureAtlas = this._onChangeTextureAtlas.event;
        this._onAddTextureAtlasCanvas = this.register(new EventEmitter());
        this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
    }
    get textureAtlas() {
        return this._renderer?.textureAtlas;
    }
    activate(terminal) {
        const core = terminal._core;
        if (!terminal.element) {
            this.register(core.onWillOpen(() => this.activate(terminal)));
            return;
        }
        this._terminal = terminal;
        const coreService = core.coreService;
        const optionsService = core.optionsService;
        const screenElement = core.screenElement;
        const linkifier = core.linkifier2;
        const unsafeCore = core;
        const bufferService = unsafeCore._bufferService;
        const renderService = unsafeCore._renderService;
        const characterJoinerService = unsafeCore._characterJoinerService;
        const charSizeService = unsafeCore._charSizeService;
        const coreBrowserService = unsafeCore._coreBrowserService;
        const decorationService = unsafeCore._decorationService;
        const logService = unsafeCore._logService;
        const themeService = unsafeCore._themeService;
        setTraceLogger(logService);
        this._renderer = new CanvasRenderer(terminal, screenElement, linkifier, bufferService, charSizeService, optionsService, characterJoinerService, coreService, coreBrowserService, decorationService, themeService);
        this.register(forwardEvent(this._renderer.onChangeTextureAtlas, this._onChangeTextureAtlas));
        this.register(forwardEvent(this._renderer.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas));
        renderService.setRenderer(this._renderer);
        renderService.handleResize(bufferService.cols, bufferService.rows);
        this.register(toDisposable(() => {
            renderService.setRenderer(this._terminal._core._createRenderer());
            renderService.handleResize(terminal.cols, terminal.rows);
            this._renderer?.dispose();
            this._renderer = undefined;
        }));
    }
    clearTextureAtlas() {
        this._renderer?.clearTextureAtlas();
    }
}

export { CanvasAddon };
//# sourceMappingURL=CanvasAddon.js.map
