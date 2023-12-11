import { DEFAULT_ANSI_COLORS } from 'browser/services/ThemeService';

function constrain(value, low, high) {
    return Math.max(low, Math.min(value, high));
}
class BaseSerializeHandler {
    constructor(_buffer) {
        this._buffer = _buffer;
    }
    serialize(range, excludeFinalCursorPosition) {
        const cell1 = this._buffer.getNullCell();
        const cell2 = this._buffer.getNullCell();
        let oldCell = cell1;
        const startRow = range.start.y;
        const endRow = range.end.y;
        const startColumn = range.start.x;
        const endColumn = range.end.x;
        this._beforeSerialize(endRow - startRow, startRow, endRow);
        for (let row = startRow; row <= endRow; row++) {
            const line = this._buffer.getLine(row);
            if (line) {
                const startLineColumn = row === range.start.y ? startColumn : 0;
                const endLineColumn = row === range.end.y ? endColumn : line.length;
                for (let col = startLineColumn; col < endLineColumn; col++) {
                    const c = line.getCell(col, oldCell === cell1 ? cell2 : cell1);
                    if (!c) {
                        console.warn(`Can't get cell at row=${row}, col=${col}`);
                        continue;
                    }
                    this._nextCell(c, oldCell, row, col);
                    oldCell = c;
                }
            }
            this._rowEnd(row, row === endRow);
        }
        this._afterSerialize();
        return this._serializeString(excludeFinalCursorPosition);
    }
    _nextCell(cell, oldCell, row, col) { }
    _rowEnd(row, isLastRow) { }
    _beforeSerialize(rows, startRow, endRow) { }
    _afterSerialize() { }
    _serializeString(excludeFinalCursorPosition) { return ''; }
}
function equalFg(cell1, cell2) {
    return cell1.getFgColorMode() === cell2.getFgColorMode()
        && cell1.getFgColor() === cell2.getFgColor();
}
function equalBg(cell1, cell2) {
    return cell1.getBgColorMode() === cell2.getBgColorMode()
        && cell1.getBgColor() === cell2.getBgColor();
}
function equalFlags(cell1, cell2) {
    return cell1.isInverse() === cell2.isInverse()
        && cell1.isBold() === cell2.isBold()
        && cell1.isUnderline() === cell2.isUnderline()
        && cell1.isOverline() === cell2.isOverline()
        && cell1.isBlink() === cell2.isBlink()
        && cell1.isInvisible() === cell2.isInvisible()
        && cell1.isItalic() === cell2.isItalic()
        && cell1.isDim() === cell2.isDim()
        && cell1.isStrikethrough() === cell2.isStrikethrough();
}
class StringSerializeHandler extends BaseSerializeHandler {
    constructor(buffer, _terminal) {
        super(buffer);
        this._terminal = _terminal;
        this._rowIndex = 0;
        this._allRows = new Array();
        this._allRowSeparators = new Array();
        this._currentRow = '';
        this._nullCellCount = 0;
        this._cursorStyle = this._buffer.getNullCell();
        this._cursorStyleRow = 0;
        this._cursorStyleCol = 0;
        this._backgroundCell = this._buffer.getNullCell();
        this._firstRow = 0;
        this._lastCursorRow = 0;
        this._lastCursorCol = 0;
        this._lastContentCursorRow = 0;
        this._lastContentCursorCol = 0;
        this._thisRowLastChar = this._buffer.getNullCell();
        this._thisRowLastSecondChar = this._buffer.getNullCell();
        this._nextRowFirstChar = this._buffer.getNullCell();
    }
    _beforeSerialize(rows, start, end) {
        this._allRows = new Array(rows);
        this._lastContentCursorRow = start;
        this._lastCursorRow = start;
        this._firstRow = start;
    }
    _rowEnd(row, isLastRow) {
        if (this._nullCellCount > 0 && !equalBg(this._cursorStyle, this._backgroundCell)) {
            this._currentRow += `\u001b[${this._nullCellCount}X`;
        }
        let rowSeparator = '';
        if (!isLastRow) {
            if (row - this._firstRow >= this._terminal.rows) {
                this._buffer.getLine(this._cursorStyleRow)?.getCell(this._cursorStyleCol, this._backgroundCell);
            }
            const currentLine = this._buffer.getLine(row);
            const nextLine = this._buffer.getLine(row + 1);
            if (!nextLine.isWrapped) {
                rowSeparator = '\r\n';
                this._lastCursorRow = row + 1;
                this._lastCursorCol = 0;
            }
            else {
                rowSeparator = '';
                const thisRowLastChar = currentLine.getCell(currentLine.length - 1, this._thisRowLastChar);
                const thisRowLastSecondChar = currentLine.getCell(currentLine.length - 2, this._thisRowLastSecondChar);
                const nextRowFirstChar = nextLine.getCell(0, this._nextRowFirstChar);
                const isNextRowFirstCharDoubleWidth = nextRowFirstChar.getWidth() > 1;
                let isValid = false;
                if (nextRowFirstChar.getChars() &&
                    isNextRowFirstCharDoubleWidth ? this._nullCellCount <= 1 : this._nullCellCount <= 0) {
                    if ((thisRowLastChar.getChars() || thisRowLastChar.getWidth() === 0) &&
                        equalBg(thisRowLastChar, nextRowFirstChar)) {
                        isValid = true;
                    }
                    if (isNextRowFirstCharDoubleWidth &&
                        (thisRowLastSecondChar.getChars() || thisRowLastSecondChar.getWidth() === 0) &&
                        equalBg(thisRowLastChar, nextRowFirstChar) &&
                        equalBg(thisRowLastSecondChar, nextRowFirstChar)) {
                        isValid = true;
                    }
                }
                if (!isValid) {
                    rowSeparator = '-'.repeat(this._nullCellCount + 1);
                    rowSeparator += '\u001b[1D\u001b[1X';
                    if (this._nullCellCount > 0) {
                        rowSeparator += '\u001b[A';
                        rowSeparator += `\u001b[${currentLine.length - this._nullCellCount}C`;
                        rowSeparator += `\u001b[${this._nullCellCount}X`;
                        rowSeparator += `\u001b[${currentLine.length - this._nullCellCount}D`;
                        rowSeparator += '\u001b[B';
                    }
                    this._lastContentCursorRow = row + 1;
                    this._lastContentCursorCol = 0;
                    this._lastCursorRow = row + 1;
                    this._lastCursorCol = 0;
                }
            }
        }
        this._allRows[this._rowIndex] = this._currentRow;
        this._allRowSeparators[this._rowIndex++] = rowSeparator;
        this._currentRow = '';
        this._nullCellCount = 0;
    }
    _diffStyle(cell, oldCell) {
        const sgrSeq = [];
        const fgChanged = !equalFg(cell, oldCell);
        const bgChanged = !equalBg(cell, oldCell);
        const flagsChanged = !equalFlags(cell, oldCell);
        if (fgChanged || bgChanged || flagsChanged) {
            if (cell.isAttributeDefault()) {
                if (!oldCell.isAttributeDefault()) {
                    sgrSeq.push(0);
                }
            }
            else {
                if (fgChanged) {
                    const color = cell.getFgColor();
                    if (cell.isFgRGB()) {
                        sgrSeq.push(38, 2, (color >>> 16) & 0xFF, (color >>> 8) & 0xFF, color & 0xFF);
                    }
                    else if (cell.isFgPalette()) {
                        if (color >= 16) {
                            sgrSeq.push(38, 5, color);
                        }
                        else {
                            sgrSeq.push(color & 8 ? 90 + (color & 7) : 30 + (color & 7));
                        }
                    }
                    else {
                        sgrSeq.push(39);
                    }
                }
                if (bgChanged) {
                    const color = cell.getBgColor();
                    if (cell.isBgRGB()) {
                        sgrSeq.push(48, 2, (color >>> 16) & 0xFF, (color >>> 8) & 0xFF, color & 0xFF);
                    }
                    else if (cell.isBgPalette()) {
                        if (color >= 16) {
                            sgrSeq.push(48, 5, color);
                        }
                        else {
                            sgrSeq.push(color & 8 ? 100 + (color & 7) : 40 + (color & 7));
                        }
                    }
                    else {
                        sgrSeq.push(49);
                    }
                }
                if (flagsChanged) {
                    if (cell.isInverse() !== oldCell.isInverse()) {
                        sgrSeq.push(cell.isInverse() ? 7 : 27);
                    }
                    if (cell.isBold() !== oldCell.isBold()) {
                        sgrSeq.push(cell.isBold() ? 1 : 22);
                    }
                    if (cell.isUnderline() !== oldCell.isUnderline()) {
                        sgrSeq.push(cell.isUnderline() ? 4 : 24);
                    }
                    if (cell.isOverline() !== oldCell.isOverline()) {
                        sgrSeq.push(cell.isOverline() ? 53 : 55);
                    }
                    if (cell.isBlink() !== oldCell.isBlink()) {
                        sgrSeq.push(cell.isBlink() ? 5 : 25);
                    }
                    if (cell.isInvisible() !== oldCell.isInvisible()) {
                        sgrSeq.push(cell.isInvisible() ? 8 : 28);
                    }
                    if (cell.isItalic() !== oldCell.isItalic()) {
                        sgrSeq.push(cell.isItalic() ? 3 : 23);
                    }
                    if (cell.isDim() !== oldCell.isDim()) {
                        sgrSeq.push(cell.isDim() ? 2 : 22);
                    }
                    if (cell.isStrikethrough() !== oldCell.isStrikethrough()) {
                        sgrSeq.push(cell.isStrikethrough() ? 9 : 29);
                    }
                }
            }
        }
        return sgrSeq;
    }
    _nextCell(cell, oldCell, row, col) {
        const isPlaceHolderCell = cell.getWidth() === 0;
        if (isPlaceHolderCell) {
            return;
        }
        const isEmptyCell = cell.getChars() === '';
        const sgrSeq = this._diffStyle(cell, this._cursorStyle);
        const styleChanged = isEmptyCell ? !equalBg(this._cursorStyle, cell) : sgrSeq.length > 0;
        if (styleChanged) {
            if (this._nullCellCount > 0) {
                if (!equalBg(this._cursorStyle, this._backgroundCell)) {
                    this._currentRow += `\u001b[${this._nullCellCount}X`;
                }
                this._currentRow += `\u001b[${this._nullCellCount}C`;
                this._nullCellCount = 0;
            }
            this._lastContentCursorRow = this._lastCursorRow = row;
            this._lastContentCursorCol = this._lastCursorCol = col;
            this._currentRow += `\u001b[${sgrSeq.join(';')}m`;
            const line = this._buffer.getLine(row);
            if (line !== undefined) {
                line.getCell(col, this._cursorStyle);
                this._cursorStyleRow = row;
                this._cursorStyleCol = col;
            }
        }
        if (isEmptyCell) {
            this._nullCellCount += cell.getWidth();
        }
        else {
            if (this._nullCellCount > 0) {
                if (equalBg(this._cursorStyle, this._backgroundCell)) {
                    this._currentRow += `\u001b[${this._nullCellCount}C`;
                }
                else {
                    this._currentRow += `\u001b[${this._nullCellCount}X`;
                    this._currentRow += `\u001b[${this._nullCellCount}C`;
                }
                this._nullCellCount = 0;
            }
            this._currentRow += cell.getChars();
            this._lastContentCursorRow = this._lastCursorRow = row;
            this._lastContentCursorCol = this._lastCursorCol = col + cell.getWidth();
        }
    }
    _serializeString(excludeFinalCursorPosition) {
        let rowEnd = this._allRows.length;
        if (this._buffer.length - this._firstRow <= this._terminal.rows) {
            rowEnd = this._lastContentCursorRow + 1 - this._firstRow;
            this._lastCursorCol = this._lastContentCursorCol;
            this._lastCursorRow = this._lastContentCursorRow;
        }
        let content = '';
        for (let i = 0; i < rowEnd; i++) {
            content += this._allRows[i];
            if (i + 1 < rowEnd) {
                content += this._allRowSeparators[i];
            }
        }
        if (!excludeFinalCursorPosition) {
            const realCursorRow = this._buffer.baseY + this._buffer.cursorY;
            const realCursorCol = this._buffer.cursorX;
            const cursorMoved = (realCursorRow !== this._lastCursorRow || realCursorCol !== this._lastCursorCol);
            const moveRight = (offset) => {
                if (offset > 0) {
                    content += `\u001b[${offset}C`;
                }
                else if (offset < 0) {
                    content += `\u001b[${-offset}D`;
                }
            };
            const moveDown = (offset) => {
                if (offset > 0) {
                    content += `\u001b[${offset}B`;
                }
                else if (offset < 0) {
                    content += `\u001b[${-offset}A`;
                }
            };
            if (cursorMoved) {
                moveDown(realCursorRow - this._lastCursorRow);
                moveRight(realCursorCol - this._lastCursorCol);
            }
        }
        const curAttrData = this._terminal._core._inputHandler._curAttrData;
        const sgrSeq = this._diffStyle(curAttrData, this._cursorStyle);
        if (sgrSeq.length > 0) {
            content += `\u001b[${sgrSeq.join(';')}m`;
        }
        return content;
    }
}
class SerializeAddon {
    activate(terminal) {
        this._terminal = terminal;
    }
    _serializeBufferByScrollback(terminal, buffer, scrollback) {
        const maxRows = buffer.length;
        const correctRows = (scrollback === undefined) ? maxRows : constrain(scrollback + terminal.rows, 0, maxRows);
        return this._serializeBufferByRange(terminal, buffer, {
            start: maxRows - correctRows,
            end: maxRows - 1
        }, false);
    }
    _serializeBufferByRange(terminal, buffer, range, excludeFinalCursorPosition) {
        const handler = new StringSerializeHandler(buffer, terminal);
        return handler.serialize({
            start: { x: 0, y: typeof range.start === 'number' ? range.start : range.start.line },
            end: { x: terminal.cols, y: typeof range.end === 'number' ? range.end : range.end.line }
        }, excludeFinalCursorPosition);
    }
    _serializeBufferAsHTML(terminal, options) {
        const buffer = terminal.buffer.active;
        const handler = new HTMLSerializeHandler(buffer, terminal, options);
        const onlySelection = options.onlySelection ?? false;
        if (!onlySelection) {
            const maxRows = buffer.length;
            const scrollback = options.scrollback;
            const correctRows = (scrollback === undefined) ? maxRows : constrain(scrollback + terminal.rows, 0, maxRows);
            return handler.serialize({
                start: { x: 0, y: maxRows - correctRows },
                end: { x: terminal.cols, y: maxRows - 1 }
            });
        }
        const selection = this._terminal?.getSelectionPosition();
        if (selection !== undefined) {
            return handler.serialize({
                start: { x: selection.start.x, y: selection.start.y },
                end: { x: selection.end.x, y: selection.end.y }
            });
        }
        return '';
    }
    _serializeModes(terminal) {
        let content = '';
        const modes = terminal.modes;
        if (modes.applicationCursorKeysMode)
            content += '\x1b[?1h';
        if (modes.applicationKeypadMode)
            content += '\x1b[?66h';
        if (modes.bracketedPasteMode)
            content += '\x1b[?2004h';
        if (modes.insertMode)
            content += '\x1b[4h';
        if (modes.originMode)
            content += '\x1b[?6h';
        if (modes.reverseWraparoundMode)
            content += '\x1b[?45h';
        if (modes.sendFocusMode)
            content += '\x1b[?1004h';
        if (modes.wraparoundMode === false)
            content += '\x1b[?7l';
        if (modes.mouseTrackingMode !== 'none') {
            switch (modes.mouseTrackingMode) {
                case 'x10':
                    content += '\x1b[?9h';
                    break;
                case 'vt200':
                    content += '\x1b[?1000h';
                    break;
                case 'drag':
                    content += '\x1b[?1002h';
                    break;
                case 'any':
                    content += '\x1b[?1003h';
                    break;
            }
        }
        return content;
    }
    serialize(options) {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded');
        }
        let content = options?.range
            ? this._serializeBufferByRange(this._terminal, this._terminal.buffer.normal, options.range, true)
            : this._serializeBufferByScrollback(this._terminal, this._terminal.buffer.normal, options?.scrollback);
        if (!options?.excludeAltBuffer) {
            if (this._terminal.buffer.active.type === 'alternate') {
                const alternativeScreenContent = this._serializeBufferByScrollback(this._terminal, this._terminal.buffer.alternate, undefined);
                content += `\u001b[?1049h\u001b[H${alternativeScreenContent}`;
            }
        }
        if (!options?.excludeModes) {
            content += this._serializeModes(this._terminal);
        }
        return content;
    }
    serializeAsHTML(options) {
        if (!this._terminal) {
            throw new Error('Cannot use addon until it has been loaded');
        }
        return this._serializeBufferAsHTML(this._terminal, options || {});
    }
    dispose() { }
}
class HTMLSerializeHandler extends BaseSerializeHandler {
    constructor(buffer, _terminal, _options) {
        super(buffer);
        this._terminal = _terminal;
        this._options = _options;
        this._currentRow = '';
        this._htmlContent = '';
        if (_terminal._core._themeService) {
            this._ansiColors = _terminal._core._themeService.colors.ansi;
        }
        else {
            this._ansiColors = DEFAULT_ANSI_COLORS;
        }
    }
    _padStart(target, targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = padString ?? ' ';
        if (target.length > targetLength) {
            return target;
        }
        targetLength -= target.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length);
        }
        return padString.slice(0, targetLength) + target;
    }
    _beforeSerialize(rows, start, end) {
        this._htmlContent += '<html><body><!--StartFragment--><pre>';
        let foreground = '#000000';
        let background = '#ffffff';
        if (this._options.includeGlobalBackground ?? false) {
            foreground = this._terminal.options.theme?.foreground ?? '#ffffff';
            background = this._terminal.options.theme?.background ?? '#000000';
        }
        const globalStyleDefinitions = [];
        globalStyleDefinitions.push('color: ' + foreground + ';');
        globalStyleDefinitions.push('background-color: ' + background + ';');
        globalStyleDefinitions.push('font-family: ' + this._terminal.options.fontFamily + ';');
        globalStyleDefinitions.push('font-size: ' + this._terminal.options.fontSize + 'px;');
        this._htmlContent += '<div style=\'' + globalStyleDefinitions.join(' ') + '\'>';
    }
    _afterSerialize() {
        this._htmlContent += '</div>';
        this._htmlContent += '</pre><!--EndFragment--></body></html>';
    }
    _rowEnd(row, isLastRow) {
        this._htmlContent += '<div><span>' + this._currentRow + '</span></div>';
        this._currentRow = '';
    }
    _getHexColor(cell, isFg) {
        const color = isFg ? cell.getFgColor() : cell.getBgColor();
        if (isFg ? cell.isFgRGB() : cell.isBgRGB()) {
            const rgb = [
                (color >> 16) & 255,
                (color >> 8) & 255,
                (color) & 255
            ];
            return '#' + rgb.map(x => this._padStart(x.toString(16), 2, '0')).join('');
        }
        if (isFg ? cell.isFgPalette() : cell.isBgPalette()) {
            return this._ansiColors[color].css;
        }
        return undefined;
    }
    _diffStyle(cell, oldCell) {
        const content = [];
        const fgChanged = !equalFg(cell, oldCell);
        const bgChanged = !equalBg(cell, oldCell);
        const flagsChanged = !equalFlags(cell, oldCell);
        if (fgChanged || bgChanged || flagsChanged) {
            const fgHexColor = this._getHexColor(cell, true);
            if (fgHexColor) {
                content.push('color: ' + fgHexColor + ';');
            }
            const bgHexColor = this._getHexColor(cell, false);
            if (bgHexColor) {
                content.push('background-color: ' + bgHexColor + ';');
            }
            if (cell.isInverse()) {
                content.push('color: #000000; background-color: #BFBFBF;');
            }
            if (cell.isBold()) {
                content.push('font-weight: bold;');
            }
            if (cell.isUnderline() && cell.isOverline()) {
                content.push('text-decoration: overline underline;');
            }
            else if (cell.isUnderline()) {
                content.push('text-decoration: underline;');
            }
            else if (cell.isOverline()) {
                content.push('text-decoration: overline;');
            }
            if (cell.isBlink()) {
                content.push('text-decoration: blink;');
            }
            if (cell.isInvisible()) {
                content.push('visibility: hidden;');
            }
            if (cell.isItalic()) {
                content.push('font-style: italic;');
            }
            if (cell.isDim()) {
                content.push('opacity: 0.5;');
            }
            if (cell.isStrikethrough()) {
                content.push('text-decoration: line-through;');
            }
            return content;
        }
        return undefined;
    }
    _nextCell(cell, oldCell, row, col) {
        const isPlaceHolderCell = cell.getWidth() === 0;
        if (isPlaceHolderCell) {
            return;
        }
        const isEmptyCell = cell.getChars() === '';
        const styleDefinitions = this._diffStyle(cell, oldCell);
        if (styleDefinitions) {
            this._currentRow += styleDefinitions.length === 0 ?
                '</span><span>' :
                '</span><span style=\'' + styleDefinitions.join(' ') + '\'>';
        }
        if (isEmptyCell) {
            this._currentRow += ' ';
        }
        else {
            this._currentRow += cell.getChars();
        }
    }
    _serializeString() {
        return this._htmlContent;
    }
}

export { HTMLSerializeHandler, SerializeAddon };
//# sourceMappingURL=SerializeAddon.js.map
