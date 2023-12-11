/**
 * Copyright (c) 2023 The xterm.js authors. All rights reserved.
 * @license MIT
 *
 * UnicodeVersionProvider for V15 with grapeme cluster handleing.
 */
import { UnicodeGraphemeProvider } from './UnicodeGraphemeProvider';
export class UnicodeGraphemesAddon {
    constructor() {
        this._oldVersion = '';
    }
    activate(terminal) {
        if (!this._provider15) {
            this._provider15 = new UnicodeGraphemeProvider(false);
        }
        if (!this._provider15Graphemes) {
            this._provider15Graphemes = new UnicodeGraphemeProvider(true);
        }
        const unicode = terminal.unicode;
        this._unicode = unicode;
        unicode.register(this._provider15);
        unicode.register(this._provider15Graphemes);
        this._oldVersion = unicode.activeVersion;
        unicode.activeVersion = '15-graphemes';
    }
    dispose() {
        if (this._unicode) {
            this._unicode.activeVersion = this._oldVersion;
        }
    }
}
