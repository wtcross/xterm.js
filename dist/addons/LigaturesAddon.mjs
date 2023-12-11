Object.defineProperty(exports, "__esModule", { value: true });
const opentype = require("opentype.js");
const lru = require("lru-cache");
const merge_1 = require("./merge");
const walk_1 = require("./walk");
const mergeRange_1 = require("./mergeRange");
const _6_1_1 = require("./processors/6-1");
const _6_2_1 = require("./processors/6-2");
const _6_3_1 = require("./processors/6-3");
const _8_1_1 = require("./processors/8-1");
const flatten_1 = require("./flatten");
class FontImpl {
    constructor(font, options) {
        this._lookupTrees = [];
        this._glyphLookups = {};
        this._font = font;
        if (options.cacheSize > 0) {
            this._cache = new lru({
                max: options.cacheSize,
                length: ((val, key) => key.length)
            });
        }
        const caltFeatures = this._font.tables.gsub && this._font.tables.gsub.features.filter(f => f.tag === 'calt') || [];
        const lookupIndices = caltFeatures
            .reduce((acc, val) => [...acc, ...val.feature.lookupListIndexes], []);
        const allLookups = this._font.tables.gsub && this._font.tables.gsub.lookups || [];
        const lookupGroups = allLookups.filter((l, i) => lookupIndices.some(idx => idx === i));
        for (const [index, lookup] of lookupGroups.entries()) {
            const trees = [];
            switch (lookup.lookupType) {
                case 6:
                    for (const [index, table] of lookup.subtables.entries()) {
                        switch (table.substFormat) {
                            case 1:
                                trees.push(_6_1_1.default(table, allLookups, index));
                                break;
                            case 2:
                                trees.push(_6_2_1.default(table, allLookups, index));
                                break;
                            case 3:
                                trees.push(_6_3_1.default(table, allLookups, index));
                                break;
                        }
                    }
                    break;
                case 8:
                    for (const [index, table] of lookup.subtables.entries()) {
                        trees.push(_8_1_1.default(table, index));
                    }
                    break;
            }
            const tree = flatten_1.default(merge_1.default(trees));
            this._lookupTrees.push({
                tree,
                processForward: lookup.lookupType !== 8
            });
            for (const glyphId of Object.keys(tree)) {
                if (!this._glyphLookups[glyphId]) {
                    this._glyphLookups[glyphId] = [];
                }
                this._glyphLookups[glyphId].push(index);
            }
        }
    }
    findLigatures(text) {
        const cached = this._cache && this._cache.get(text);
        if (cached && !Array.isArray(cached)) {
            return cached;
        }
        const glyphIds = [];
        for (const char of text) {
            glyphIds.push(this._font.charToGlyphIndex(char));
        }
        // If there are no lookup groups, there's no point looking for
        // replacements. This gives us a minor performance boost for fonts with
        // no ligatures
        if (this._lookupTrees.length === 0) {
            return {
                inputGlyphs: glyphIds,
                outputGlyphs: glyphIds,
                contextRanges: []
            };
        }
        const result = this._findInternal(glyphIds.slice());
        const finalResult = {
            inputGlyphs: glyphIds,
            outputGlyphs: result.sequence,
            contextRanges: result.ranges
        };
        if (this._cache) {
            this._cache.set(text, finalResult);
        }
        return finalResult;
    }
    findLigatureRanges(text) {
        // Short circuit the process if there are no possible ligatures in the
        // font
        if (this._lookupTrees.length === 0) {
            return [];
        }
        const cached = this._cache && this._cache.get(text);
        if (cached) {
            return Array.isArray(cached) ? cached : cached.contextRanges;
        }
        const glyphIds = [];
        for (const char of text) {
            glyphIds.push(this._font.charToGlyphIndex(char));
        }
        const result = this._findInternal(glyphIds);
        if (this._cache) {
            this._cache.set(text, result.ranges);
        }
        return result.ranges;
    }
    _findInternal(sequence) {
        const ranges = [];
        let nextLookup = this._getNextLookup(sequence, 0);
        while (nextLookup.index !== null) {
            const lookup = this._lookupTrees[nextLookup.index];
            if (lookup.processForward) {
                let lastGlyphIndex = nextLookup.last;
                for (let i = nextLookup.first; i < lastGlyphIndex; i++) {
                    const result = walk_1.default(lookup.tree, sequence, i, i);
                    if (result) {
                        for (let j = 0; j < result.substitutions.length; j++) {
                            const sub = result.substitutions[j];
                            if (sub !== null) {
                                sequence[i + j] = sub;
                            }
                        }
                        mergeRange_1.default(ranges, result.contextRange[0] + i, result.contextRange[1] + i);
                        // Substitutions can end up extending the search range
                        if (i + result.length >= lastGlyphIndex) {
                            lastGlyphIndex = i + result.length + 1;
                        }
                        i += result.length - 1;
                    }
                }
            }
            else {
                // We don't need to do the lastGlyphIndex tracking here because
                // reverse processing isn't allowed to replace more than one
                // character at a time.
                for (let i = nextLookup.last - 1; i >= nextLookup.first; i--) {
                    const result = walk_1.default(lookup.tree, sequence, i, i);
                    if (result) {
                        for (let j = 0; j < result.substitutions.length; j++) {
                            const sub = result.substitutions[j];
                            if (sub !== null) {
                                sequence[i + j] = sub;
                            }
                        }
                        mergeRange_1.default(ranges, result.contextRange[0] + i, result.contextRange[1] + i);
                        i -= result.length - 1;
                    }
                }
            }
            nextLookup = this._getNextLookup(sequence, nextLookup.index + 1);
        }
        return { sequence, ranges };
    }
    /**
     * Returns the lookup and glyph range for the first lookup that might
     * contain a match.
     *
     * @param sequence Input glyph sequence
     * @param start The first input to try
     */
    _getNextLookup(sequence, start) {
        const result = {
            index: null,
            first: Infinity,
            last: -1
        };
        // Loop through each glyph and find the first valid lookup for it
        for (let i = 0; i < sequence.length; i++) {
            const lookups = this._glyphLookups[sequence[i]];
            if (!lookups) {
                continue;
            }
            for (let j = 0; j < lookups.length; j++) {
                const lookupIndex = lookups[j];
                if (lookupIndex >= start) {
                    // Update the lookup information if it's the one we're
                    // storing or earlier than it.
                    if (result.index === null || lookupIndex <= result.index) {
                        result.index = lookupIndex;
                        if (result.first > i) {
                            result.first = i;
                        }
                        result.last = i + 1;
                    }
                    break;
                }
            }
        }
        return result;
    }
}
/**
 * Load the font with the given name. The returned value can be used to find
 * ligatures for the font.
 *
 * @param name Font family name for the font to load
 */
async function load$1(name, options) {
    // We just grab the first font variant we find for now.
    // TODO: allow users to specify information to pick a specific variant
    const [fontInfo] = await Promise.resolve().then(() => require('font-finder')).then(fontFinder => fontFinder.listVariants(name));
    if (!fontInfo) {
        throw new Error(`Font ${name} not found`);
    }
    return loadFile(fontInfo.path, options);
}
exports.load = load$1;
/**
 * Load the font at the given file path. The returned value can be used to find
 * ligatures for the font.
 *
 * @param path Path to the file containing the font
 */
async function loadFile(path, options) {
    const font = await Promise.resolve().then(() => require('util')).then(util => util.promisify(opentype.load)(path));
    return new FontImpl(font, Object.assign({ cacheSize: 0 }, options));
}
exports.loadFile = loadFile;
/**
 * Load the font from it's binary data. The returned value can be used to find
 * ligatures for the font.
 *
 * @param buffer ArrayBuffer of the font to load
 */
function loadBuffer$1(buffer, options) {
    const font = opentype.parse(buffer);
    return new FontImpl(font, Object.assign({ cacheSize: 0 }, options));
}
exports.loadBuffer = loadBuffer$1;

/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */
/**
 * Parses a CSS font family value, returning the component font families
 * contained within.
 *
 * @param family The CSS font family input string to parse
 */
function parse(family) {
    if (typeof family !== 'string') {
        throw new Error('Font family must be a string');
    }
    const context = {
        input: family,
        offset: 0
    };
    const families = [];
    let currentFamily = '';
    // Work through the input character by character until there are none left.
    // This lexing and parsing in one pass.
    while (context.offset < context.input.length) {
        const char = context.input[context.offset++];
        switch (char) {
            // String
            case '\'':
            case '"':
                currentFamily += parseString(context, char);
                break;
            // End of family
            case ',':
                families.push(currentFamily);
                currentFamily = '';
                break;
            default:
                // Identifiers (whitespace between families is swallowed)
                if (!/\s/.test(char)) {
                    context.offset--;
                    currentFamily += parseIdentifier(context);
                    families.push(currentFamily);
                    currentFamily = '';
                }
        }
    }
    return families;
}
/**
 * Parse a CSS string.
 *
 * @param context Parsing input and offset
 * @param quoteChar The quote character for the string (' or ")
 */
function parseString(context, quoteChar) {
    let str = '';
    let escaped = false;
    while (context.offset < context.input.length) {
        const char = context.input[context.offset++];
        if (escaped) {
            if (/[\dA-Fa-f]/.test(char)) {
                // Unicode escape
                context.offset--;
                str += parseUnicode(context);
            }
            else if (char !== '\n') {
                // Newlines are ignored if escaped. Other characters are used as is.
                str += char;
            }
            escaped = false;
        }
        else {
            switch (char) {
                // Terminated quote
                case quoteChar:
                    return str;
                // Begin escape
                case '\\':
                    escaped = true;
                    break;
                // Add character to string
                default:
                    str += char;
            }
        }
    }
    throw new Error('Unterminated string');
}
/**
 * Parse a CSS custom identifier.
 *
 * @param context Parsing input and offset
 */
function parseIdentifier(context) {
    let str = '';
    let escaped = false;
    while (context.offset < context.input.length) {
        const char = context.input[context.offset++];
        if (escaped) {
            if (/[\dA-Fa-f]/.test(char)) {
                // Unicode escape
                context.offset--;
                str += parseUnicode(context);
            }
            else {
                // Everything else is used as is
                str += char;
            }
            escaped = false;
        }
        else {
            switch (char) {
                // Begin escape
                case '\\':
                    escaped = true;
                    break;
                // Terminate identifier
                case ',':
                    return str;
                default:
                    if (/\s/.test(char)) {
                        // Whitespace is collapsed into a single space within an identifier
                        if (!str.endsWith(' ')) {
                            str += ' ';
                        }
                    }
                    else {
                        // Add other characters directly
                        str += char;
                    }
            }
        }
    }
    return str;
}
/**
 * Parse a CSS unicode escape.
 *
 * @param context Parsing input and offset
 */
function parseUnicode(context) {
    let str = '';
    while (context.offset < context.input.length) {
        const char = context.input[context.offset++];
        if (/\s/.test(char)) {
            // The first whitespace character after a unicode escape indicates the end
            // of the escape and is swallowed.
            return unicodeToString(str);
        }
        if (str.length >= 6 || !/[\dA-Fa-f]/.test(char)) {
            // If the next character is not a valid hex digit or we have reached the
            // maximum of 6 digits in the escape, terminate the escape.
            context.offset--;
            return unicodeToString(str);
        }
        // Otherwise, just add it to the escape
        str += char;
    }
    return unicodeToString(str);
}
/**
 * Convert a unicode code point from a hex string to a utf8 string.
 *
 * @param codePoint Unicode code point represented as a hex string
 */
function unicodeToString(codePoint) {
    return String.fromCodePoint(parseInt(codePoint, 16));
}

/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */
const loadBuffer = undefined;
let fontsPromise = undefined;
/**
 * Loads the font ligature wrapper for the specified font family if it could be
 * resolved, throwing if it is unable to find a suitable match.
 * @param fontFamily The CSS font family definition to resolve
 * @param cacheSize The size of the ligature cache to maintain if the font is resolved
 */
async function load(fontFamily, cacheSize) {
    var _a, _b;
    if (!fontsPromise) {
        // Web environment that supports font access API
        if (typeof navigator !== 'undefined' && 'fonts' in navigator) {
            try {
                const status = await ((_b = (_a = navigator.permissions).request) === null || _b === void 0 ? void 0 : _b.call(_a, {
                    name: 'local-fonts'
                }));
                if (status && status.state !== 'granted') {
                    throw new Error('Permission to access local fonts not granted.');
                }
            }
            catch (err) {
                // A `TypeError` indicates the 'local-fonts'
                // permission is not yet implemented, so
                // only `throw` if this is _not_ the problem.
                if (err.name !== 'TypeError') {
                    throw err;
                }
            }
            const fonts = {};
            try {
                const fontsIterator = await navigator.fonts.query();
                for (const metadata of fontsIterator) {
                    if (!fonts.hasOwnProperty(metadata.family)) {
                        fonts[metadata.family] = [];
                    }
                    fonts[metadata.family].push(metadata);
                }
                fontsPromise = Promise.resolve(fonts);
            }
            catch (err) {
                console.error(err.name, err.message);
            }
        }
        // Latest proposal https://bugs.chromium.org/p/chromium/issues/detail?id=1312603
        else if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
            const fonts = {};
            try {
                const fontsIterator = await window.queryLocalFonts();
                for (const metadata of fontsIterator) {
                    if (!fonts.hasOwnProperty(metadata.family)) {
                        fonts[metadata.family] = [];
                    }
                    fonts[metadata.family].push(metadata);
                }
                fontsPromise = Promise.resolve(fonts);
            }
            catch (err) {
                console.error(err.name, err.message);
            }
        }
        if (!fontsPromise) {
            fontsPromise = Promise.resolve({});
        }
    }
    const fonts = await fontsPromise;
    for (const family of parse(fontFamily)) {
        // If we reach one of the generic font families, the font resolution
        // will end for the browser and we can't determine the specific font
        // used. Throw.
        if (genericFontFamilies.includes(family)) {
            return undefined;
        }
        if (fonts.hasOwnProperty(family) && fonts[family].length > 0) {
            const font = fonts[family][0];
            if ('blob' in font) {
                const bytes = await font.blob();
                const buffer = await bytes.arrayBuffer();
                return loadBuffer(buffer, { cacheSize });
            }
            return undefined;
        }
    }
    // If none of the fonts could resolve, throw an error
    return undefined;
}
// https://drafts.csswg.org/css-fonts-4/#generic-font-families
const genericFontFamilies = [
    'serif',
    'sans-serif',
    'cursive',
    'fantasy',
    'monospace',
    'system-ui',
    'emoji',
    'math',
    'fangsong'
];

/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */
// Caches 100K characters worth of ligatures. In practice this works out to
// about 650 KB worth of cache, when a moderate number of ligatures are present.
const CACHE_SIZE = 100000;
/**
 * Enable ligature support for the provided Terminal instance. To function
 * properly, this must be called after `open()` is called on the therminal. If
 * the font currently in use supports ligatures, the terminal will automatically
 * start to render them.
 * @param term Terminal instance from xterm.js
 */
function enableLigatures(term, fallbackLigatures = []) {
    let currentFontName = undefined;
    let font = undefined;
    let loadingState = 0 /* LoadingState.UNLOADED */;
    let loadError = undefined;
    return term.registerCharacterJoiner((text) => {
        // If the font hasn't been loaded yet, load it and return an empty result
        const termFont = term.options.fontFamily;
        if (termFont &&
            (loadingState === 0 /* LoadingState.UNLOADED */ || currentFontName !== termFont)) {
            font = undefined;
            loadingState = 1 /* LoadingState.LOADING */;
            currentFontName = termFont;
            const currentCallFontName = currentFontName;
            load(currentCallFontName, CACHE_SIZE)
                .then(f => {
                // Another request may have come in while we were waiting, so make
                // sure our font is still vaild.
                if (currentCallFontName === term.options.fontFamily) {
                    loadingState = 2 /* LoadingState.LOADED */;
                    font = f;
                    // Only refresh things if we actually found a font
                    if (f) {
                        term.refresh(0, term.rows - 1);
                    }
                }
            })
                .catch(e => {
                // Another request may have come in while we were waiting, so make
                // sure our font is still vaild.
                if (currentCallFontName === term.options.fontFamily) {
                    loadingState = 3 /* LoadingState.FAILED */;
                    if (term.options.logLevel === 'debug') {
                        console.debug(loadError, new Error('Failure while loading font'));
                    }
                    font = undefined;
                    loadError = e;
                }
            });
        }
        if (font && loadingState === 2 /* LoadingState.LOADED */) {
            // We clone the entries to avoid the internal cache of the ligature finder
            // getting messed up.
            return font.findLigatureRanges(text).map(range => [range[0], range[1]]);
        }
        return getFallbackRanges(text, fallbackLigatures);
    });
}
function getFallbackRanges(text, fallbackLigatures) {
    const ranges = [];
    for (let i = 0; i < text.length; i++) {
        for (let j = 0; j < fallbackLigatures.length; j++) {
            if (text.startsWith(fallbackLigatures[j], i)) {
                ranges.push([i, i + fallbackLigatures[j].length]);
                i += fallbackLigatures[j].length - 1;
                break;
            }
        }
    }
    return ranges;
}

/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */
class LigaturesAddon {
    constructor(options) {
        this._fallbackLigatures = ((options === null || options === void 0 ? void 0 : options.fallbackLigatures) || [
            '<--', '<---', '<<-', '<-', '->', '->>', '-->', '--->',
            '<==', '<===', '<<=', '<=', '=>', '=>>', '==>', '===>', '>=', '>>=',
            '<->', '<-->', '<--->', '<---->', '<=>', '<==>', '<===>', '<====>', '-------->',
            '<~~', '<~', '~>', '~~>', '::', ':::', '==', '!=', '===', '!==',
            ':=', ':-', ':+', '<*', '<*>', '*>', '<|', '<|>', '|>', '+:', '-:', '=:', ':>',
            '++', '+++', '<!--', '<!---', '<***>'
        ]).sort((a, b) => b.length - a.length);
    }
    activate(terminal) {
        this._terminal = terminal;
        this._characterJoinerId = enableLigatures(terminal, this._fallbackLigatures);
    }
    dispose() {
        var _a;
        if (this._characterJoinerId !== undefined) {
            (_a = this._terminal) === null || _a === void 0 ? void 0 : _a.deregisterCharacterJoiner(this._characterJoinerId);
            this._characterJoinerId = undefined;
        }
    }
}

export { LigaturesAddon };
//# sourceMappingURL=LigaturesAddon.mjs.map
