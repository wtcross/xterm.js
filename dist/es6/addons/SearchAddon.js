import { EventEmitter } from 'common/EventEmitter';
import { Disposable, MutableDisposable, toDisposable, disposeArray } from 'common/Lifecycle';

const NON_WORD_CHARACTERS = ' ~!@#$%^&*()+`-=[]{}|\\;:"\',./<>?';
const LINES_CACHE_TIME_TO_LIVE = 15 * 1000;
const DEFAULT_HIGHLIGHT_LIMIT = 1000;
class SearchAddon extends Disposable {
    constructor(options) {
        super();
        this._highlightedLines = new Set();
        this._highlightDecorations = [];
        this._selectedDecoration = this.register(new MutableDisposable());
        this._linesCacheTimeoutId = 0;
        this._onDidChangeResults = this.register(new EventEmitter());
        this.onDidChangeResults = this._onDidChangeResults.event;
        this._highlightLimit = options?.highlightLimit ?? DEFAULT_HIGHLIGHT_LIMIT;
    }
    activate(terminal) {
        this._terminal = terminal;
        this.register(this._terminal.onWriteParsed(() => this._updateMatches()));
        this.register(this._terminal.onResize(() => this._updateMatches()));
        this.register(toDisposable(() => this.clearDecorations()));
    }
    _updateMatches() {
        if (this._highlightTimeout) {
            window.clearTimeout(this._highlightTimeout);
        }
        if (this._cachedSearchTerm && this._lastSearchOptions?.decorations) {
            this._highlightTimeout = setTimeout(() => {
                const term = this._cachedSearchTerm;
                this._cachedSearchTerm = undefined;
                this.findPrevious(term, { ...this._lastSearchOptions, incremental: true, noScroll: true });
            }, 200);
        }
    }
    clearDecorations(retainCachedSearchTerm) {
        this._selectedDecoration.clear();
        disposeArray(this._highlightDecorations);
        this._highlightDecorations = [];
        this._highlightedLines.clear();
        if (!retainCachedSearchTerm) {
            this._cachedSearchTerm = undefined;
        }
    }
    clearActiveDecoration() {
        this._selectedDecoration.clear();
    }
    findNext(term, searchOptions) {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded');
        }
        const didOptionsChanged = this._lastSearchOptions ? this._didOptionsChange(this._lastSearchOptions, searchOptions) : true;
        this._lastSearchOptions = searchOptions;
        if (searchOptions?.decorations) {
            if (this._cachedSearchTerm === undefined || term !== this._cachedSearchTerm || didOptionsChanged) {
                this._highlightAllMatches(term, searchOptions);
            }
        }
        const found = this._findNextAndSelect(term, searchOptions);
        this._fireResults(searchOptions);
        this._cachedSearchTerm = term;
        return found;
    }
    _highlightAllMatches(term, searchOptions) {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded');
        }
        if (!term || term.length === 0) {
            this.clearDecorations();
            return;
        }
        searchOptions = searchOptions || {};
        this.clearDecorations(true);
        const searchResultsWithHighlight = [];
        let prevResult = undefined;
        let result = this._find(term, 0, 0, searchOptions);
        while (result && (prevResult?.row !== result.row || prevResult?.col !== result.col)) {
            if (searchResultsWithHighlight.length >= this._highlightLimit) {
                break;
            }
            prevResult = result;
            searchResultsWithHighlight.push(prevResult);
            result = this._find(term, prevResult.col + prevResult.term.length >= this._terminal.cols ? prevResult.row + 1 : prevResult.row, prevResult.col + prevResult.term.length >= this._terminal.cols ? 0 : prevResult.col + 1, searchOptions);
        }
        for (const match of searchResultsWithHighlight) {
            const decoration = this._createResultDecoration(match, searchOptions.decorations);
            if (decoration) {
                this._highlightedLines.add(decoration.marker.line);
                this._highlightDecorations.push({ decoration, match, dispose() { decoration.dispose(); } });
            }
        }
    }
    _find(term, startRow, startCol, searchOptions) {
        if (!this._terminal || !term || term.length === 0) {
            this._terminal?.clearSelection();
            this.clearDecorations();
            return undefined;
        }
        if (startCol > this._terminal.cols) {
            throw new Error(`Invalid col: ${startCol} to search in terminal of ${this._terminal.cols} cols`);
        }
        let result = undefined;
        this._initLinesCache();
        const searchPosition = {
            startRow,
            startCol
        };
        result = this._findInLine(term, searchPosition, searchOptions);
        if (!result) {
            for (let y = startRow + 1; y < this._terminal.buffer.active.baseY + this._terminal.rows; y++) {
                searchPosition.startRow = y;
                searchPosition.startCol = 0;
                result = this._findInLine(term, searchPosition, searchOptions);
                if (result) {
                    break;
                }
            }
        }
        return result;
    }
    _findNextAndSelect(term, searchOptions) {
        if (!this._terminal || !term || term.length === 0) {
            this._terminal?.clearSelection();
            this.clearDecorations();
            return false;
        }
        const prevSelectedPos = this._terminal.getSelectionPosition();
        this._terminal.clearSelection();
        let startCol = 0;
        let startRow = 0;
        if (prevSelectedPos) {
            if (this._cachedSearchTerm === term) {
                startCol = prevSelectedPos.end.x;
                startRow = prevSelectedPos.end.y;
            }
            else {
                startCol = prevSelectedPos.start.x;
                startRow = prevSelectedPos.start.y;
            }
        }
        this._initLinesCache();
        const searchPosition = {
            startRow,
            startCol
        };
        let result = this._findInLine(term, searchPosition, searchOptions);
        if (!result) {
            for (let y = startRow + 1; y < this._terminal.buffer.active.baseY + this._terminal.rows; y++) {
                searchPosition.startRow = y;
                searchPosition.startCol = 0;
                result = this._findInLine(term, searchPosition, searchOptions);
                if (result) {
                    break;
                }
            }
        }
        if (!result && startRow !== 0) {
            for (let y = 0; y < startRow; y++) {
                searchPosition.startRow = y;
                searchPosition.startCol = 0;
                result = this._findInLine(term, searchPosition, searchOptions);
                if (result) {
                    break;
                }
            }
        }
        if (!result && prevSelectedPos) {
            searchPosition.startRow = prevSelectedPos.start.y;
            searchPosition.startCol = 0;
            result = this._findInLine(term, searchPosition, searchOptions);
        }
        return this._selectResult(result, searchOptions?.decorations, searchOptions?.noScroll);
    }
    findPrevious(term, searchOptions) {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded');
        }
        const didOptionsChanged = this._lastSearchOptions ? this._didOptionsChange(this._lastSearchOptions, searchOptions) : true;
        this._lastSearchOptions = searchOptions;
        if (searchOptions?.decorations) {
            if (this._cachedSearchTerm === undefined || term !== this._cachedSearchTerm || didOptionsChanged) {
                this._highlightAllMatches(term, searchOptions);
            }
        }
        const found = this._findPreviousAndSelect(term, searchOptions);
        this._fireResults(searchOptions);
        this._cachedSearchTerm = term;
        return found;
    }
    _didOptionsChange(lastSearchOptions, searchOptions) {
        if (!searchOptions) {
            return false;
        }
        if (lastSearchOptions.caseSensitive !== searchOptions.caseSensitive) {
            return true;
        }
        if (lastSearchOptions.regex !== searchOptions.regex) {
            return true;
        }
        if (lastSearchOptions.wholeWord !== searchOptions.wholeWord) {
            return true;
        }
        return false;
    }
    _fireResults(searchOptions) {
        if (searchOptions?.decorations) {
            let resultIndex = -1;
            if (this._selectedDecoration.value) {
                const selectedMatch = this._selectedDecoration.value.match;
                for (let i = 0; i < this._highlightDecorations.length; i++) {
                    const match = this._highlightDecorations[i].match;
                    if (match.row === selectedMatch.row && match.col === selectedMatch.col && match.size === selectedMatch.size) {
                        resultIndex = i;
                        break;
                    }
                }
            }
            this._onDidChangeResults.fire({ resultIndex, resultCount: this._highlightDecorations.length });
        }
    }
    _findPreviousAndSelect(term, searchOptions) {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded');
        }
        if (!this._terminal || !term || term.length === 0) {
            this._terminal?.clearSelection();
            this.clearDecorations();
            return false;
        }
        const prevSelectedPos = this._terminal.getSelectionPosition();
        this._terminal.clearSelection();
        let startRow = this._terminal.buffer.active.baseY + this._terminal.rows - 1;
        let startCol = this._terminal.cols;
        const isReverseSearch = true;
        this._initLinesCache();
        const searchPosition = {
            startRow,
            startCol
        };
        let result;
        if (prevSelectedPos) {
            searchPosition.startRow = startRow = prevSelectedPos.start.y;
            searchPosition.startCol = startCol = prevSelectedPos.start.x;
            if (this._cachedSearchTerm !== term) {
                result = this._findInLine(term, searchPosition, searchOptions, false);
                if (!result) {
                    searchPosition.startRow = startRow = prevSelectedPos.end.y;
                    searchPosition.startCol = startCol = prevSelectedPos.end.x;
                }
            }
        }
        if (!result) {
            result = this._findInLine(term, searchPosition, searchOptions, isReverseSearch);
        }
        if (!result) {
            searchPosition.startCol = Math.max(searchPosition.startCol, this._terminal.cols);
            for (let y = startRow - 1; y >= 0; y--) {
                searchPosition.startRow = y;
                result = this._findInLine(term, searchPosition, searchOptions, isReverseSearch);
                if (result) {
                    break;
                }
            }
        }
        if (!result && startRow !== (this._terminal.buffer.active.baseY + this._terminal.rows - 1)) {
            for (let y = (this._terminal.buffer.active.baseY + this._terminal.rows - 1); y >= startRow; y--) {
                searchPosition.startRow = y;
                result = this._findInLine(term, searchPosition, searchOptions, isReverseSearch);
                if (result) {
                    break;
                }
            }
        }
        return this._selectResult(result, searchOptions?.decorations, searchOptions?.noScroll);
    }
    _initLinesCache() {
        const terminal = this._terminal;
        if (!this._linesCache) {
            this._linesCache = new Array(terminal.buffer.active.length);
            this._cursorMoveListener = terminal.onCursorMove(() => this._destroyLinesCache());
            this._resizeListener = terminal.onResize(() => this._destroyLinesCache());
        }
        window.clearTimeout(this._linesCacheTimeoutId);
        this._linesCacheTimeoutId = window.setTimeout(() => this._destroyLinesCache(), LINES_CACHE_TIME_TO_LIVE);
    }
    _destroyLinesCache() {
        this._linesCache = undefined;
        if (this._cursorMoveListener) {
            this._cursorMoveListener.dispose();
            this._cursorMoveListener = undefined;
        }
        if (this._resizeListener) {
            this._resizeListener.dispose();
            this._resizeListener = undefined;
        }
        if (this._linesCacheTimeoutId) {
            window.clearTimeout(this._linesCacheTimeoutId);
            this._linesCacheTimeoutId = 0;
        }
    }
    _isWholeWord(searchIndex, line, term) {
        return ((searchIndex === 0) || (NON_WORD_CHARACTERS.includes(line[searchIndex - 1]))) &&
            (((searchIndex + term.length) === line.length) || (NON_WORD_CHARACTERS.includes(line[searchIndex + term.length])));
    }
    _findInLine(term, searchPosition, searchOptions = {}, isReverseSearch = false) {
        const terminal = this._terminal;
        const row = searchPosition.startRow;
        const col = searchPosition.startCol;
        const firstLine = terminal.buffer.active.getLine(row);
        if (firstLine?.isWrapped) {
            if (isReverseSearch) {
                searchPosition.startCol += terminal.cols;
                return;
            }
            searchPosition.startRow--;
            searchPosition.startCol += terminal.cols;
            return this._findInLine(term, searchPosition, searchOptions);
        }
        let cache = this._linesCache?.[row];
        if (!cache) {
            cache = this._translateBufferLineToStringWithWrap(row, true);
            if (this._linesCache) {
                this._linesCache[row] = cache;
            }
        }
        const [stringLine, offsets] = cache;
        const offset = this._bufferColsToStringOffset(row, col);
        const searchTerm = searchOptions.caseSensitive ? term : term.toLowerCase();
        const searchStringLine = searchOptions.caseSensitive ? stringLine : stringLine.toLowerCase();
        let resultIndex = -1;
        if (searchOptions.regex) {
            const searchRegex = RegExp(searchTerm, 'g');
            let foundTerm;
            if (isReverseSearch) {
                while (foundTerm = searchRegex.exec(searchStringLine.slice(0, offset))) {
                    resultIndex = searchRegex.lastIndex - foundTerm[0].length;
                    term = foundTerm[0];
                    searchRegex.lastIndex -= (term.length - 1);
                }
            }
            else {
                foundTerm = searchRegex.exec(searchStringLine.slice(offset));
                if (foundTerm && foundTerm[0].length > 0) {
                    resultIndex = offset + (searchRegex.lastIndex - foundTerm[0].length);
                    term = foundTerm[0];
                }
            }
        }
        else {
            if (isReverseSearch) {
                if (offset - searchTerm.length >= 0) {
                    resultIndex = searchStringLine.lastIndexOf(searchTerm, offset - searchTerm.length);
                }
            }
            else {
                resultIndex = searchStringLine.indexOf(searchTerm, offset);
            }
        }
        if (resultIndex >= 0) {
            if (searchOptions.wholeWord && !this._isWholeWord(resultIndex, searchStringLine, term)) {
                return;
            }
            let startRowOffset = 0;
            while (startRowOffset < offsets.length - 1 && resultIndex >= offsets[startRowOffset + 1]) {
                startRowOffset++;
            }
            let endRowOffset = startRowOffset;
            while (endRowOffset < offsets.length - 1 && resultIndex + term.length >= offsets[endRowOffset + 1]) {
                endRowOffset++;
            }
            const startColOffset = resultIndex - offsets[startRowOffset];
            const endColOffset = resultIndex + term.length - offsets[endRowOffset];
            const startColIndex = this._stringLengthToBufferSize(row + startRowOffset, startColOffset);
            const endColIndex = this._stringLengthToBufferSize(row + endRowOffset, endColOffset);
            const size = endColIndex - startColIndex + terminal.cols * (endRowOffset - startRowOffset);
            return {
                term,
                col: startColIndex,
                row: row + startRowOffset,
                size
            };
        }
    }
    _stringLengthToBufferSize(row, offset) {
        const line = this._terminal.buffer.active.getLine(row);
        if (!line) {
            return 0;
        }
        for (let i = 0; i < offset; i++) {
            const cell = line.getCell(i);
            if (!cell) {
                break;
            }
            const char = cell.getChars();
            if (char.length > 1) {
                offset -= char.length - 1;
            }
            const nextCell = line.getCell(i + 1);
            if (nextCell && nextCell.getWidth() === 0) {
                offset++;
            }
        }
        return offset;
    }
    _bufferColsToStringOffset(startRow, cols) {
        const terminal = this._terminal;
        let lineIndex = startRow;
        let offset = 0;
        let line = terminal.buffer.active.getLine(lineIndex);
        while (cols > 0 && line) {
            for (let i = 0; i < cols && i < terminal.cols; i++) {
                const cell = line.getCell(i);
                if (!cell) {
                    break;
                }
                if (cell.getWidth()) {
                    offset += cell.getCode() === 0 ? 1 : cell.getChars().length;
                }
            }
            lineIndex++;
            line = terminal.buffer.active.getLine(lineIndex);
            if (line && !line.isWrapped) {
                break;
            }
            cols -= terminal.cols;
        }
        return offset;
    }
    _translateBufferLineToStringWithWrap(lineIndex, trimRight) {
        const terminal = this._terminal;
        const strings = [];
        const lineOffsets = [0];
        let line = terminal.buffer.active.getLine(lineIndex);
        while (line) {
            const nextLine = terminal.buffer.active.getLine(lineIndex + 1);
            const lineWrapsToNext = nextLine ? nextLine.isWrapped : false;
            let string = line.translateToString(!lineWrapsToNext && trimRight);
            if (lineWrapsToNext && nextLine) {
                const lastCell = line.getCell(line.length - 1);
                const lastCellIsNull = lastCell && lastCell.getCode() === 0 && lastCell.getWidth() === 1;
                if (lastCellIsNull && nextLine.getCell(0)?.getWidth() === 2) {
                    string = string.slice(0, -1);
                }
            }
            strings.push(string);
            if (lineWrapsToNext) {
                lineOffsets.push(lineOffsets[lineOffsets.length - 1] + string.length);
            }
            else {
                break;
            }
            lineIndex++;
            line = nextLine;
        }
        return [strings.join(''), lineOffsets];
    }
    _selectResult(result, options, noScroll) {
        const terminal = this._terminal;
        this._selectedDecoration.clear();
        if (!result) {
            terminal.clearSelection();
            return false;
        }
        terminal.select(result.col, result.row, result.size);
        if (options) {
            const marker = terminal.registerMarker(-terminal.buffer.active.baseY - terminal.buffer.active.cursorY + result.row);
            if (marker) {
                const decoration = terminal.registerDecoration({
                    marker,
                    x: result.col,
                    width: result.size,
                    backgroundColor: options.activeMatchBackground,
                    layer: 'top',
                    overviewRulerOptions: {
                        color: options.activeMatchColorOverviewRuler
                    }
                });
                if (decoration) {
                    const disposables = [];
                    disposables.push(marker);
                    disposables.push(decoration.onRender((e) => this._applyStyles(e, options.activeMatchBorder, true)));
                    disposables.push(decoration.onDispose(() => disposeArray(disposables)));
                    this._selectedDecoration.value = { decoration, match: result, dispose() { decoration.dispose(); } };
                }
            }
        }
        if (!noScroll) {
            if (result.row >= (terminal.buffer.active.viewportY + terminal.rows) || result.row < terminal.buffer.active.viewportY) {
                let scroll = result.row - terminal.buffer.active.viewportY;
                scroll -= Math.floor(terminal.rows / 2);
                terminal.scrollLines(scroll);
            }
        }
        return true;
    }
    _applyStyles(element, borderColor, isActiveResult) {
        if (!element.classList.contains('xterm-find-result-decoration')) {
            element.classList.add('xterm-find-result-decoration');
            if (borderColor) {
                element.style.outline = `1px solid ${borderColor}`;
            }
        }
        if (isActiveResult) {
            element.classList.add('xterm-find-active-result-decoration');
        }
    }
    _createResultDecoration(result, options) {
        const terminal = this._terminal;
        const marker = terminal.registerMarker(-terminal.buffer.active.baseY - terminal.buffer.active.cursorY + result.row);
        if (!marker) {
            return undefined;
        }
        const findResultDecoration = terminal.registerDecoration({
            marker,
            x: result.col,
            width: result.size,
            backgroundColor: options.matchBackground,
            overviewRulerOptions: this._highlightedLines.has(marker.line) ? undefined : {
                color: options.matchOverviewRuler,
                position: 'center'
            }
        });
        if (findResultDecoration) {
            const disposables = [];
            disposables.push(marker);
            disposables.push(findResultDecoration.onRender((e) => this._applyStyles(e, options.matchBorder, false)));
            disposables.push(findResultDecoration.onDispose(() => disposeArray(disposables)));
        }
        return findResultDecoration;
    }
}

export { SearchAddon };
//# sourceMappingURL=SearchAddon.js.map
