import { UnicodeService } from 'common/services/UnicodeService';

var TINF_OK = 0;
var TINF_DATA_ERROR = -3;
class Tree {
    constructor() {
        this.table = new Uint16Array(16);
        this.trans = new Uint16Array(288);
    }
}
class Data {
    constructor(source, dest) {
        this.tag = 0;
        this.bitcount = 0;
        this.destLen = 0;
        this.sourceIndex = 0;
        this.source = source;
        this.dest = dest;
        this.ltree = new Tree();
        this.dtree = new Tree();
    }
}
var sltree = new Tree();
var sdtree = new Tree();
var length_bits = new Uint8Array(30);
var length_base = new Uint16Array(30);
var dist_bits = new Uint8Array(30);
var dist_base = new Uint16Array(30);
var clcidx = new Uint8Array([
    16, 17, 18, 0, 8, 7, 9, 6,
    10, 5, 11, 4, 12, 3, 13, 2,
    14, 1, 15
]);
const code_tree = new Tree();
const lengths = new Uint8Array(288 + 32);
function tinf_build_bits_base(bits, base, delta, first) {
    var i, sum;
    for (i = 0; i < delta; ++i)
        bits[i] = 0;
    for (i = 0; i < 30 - delta; ++i)
        bits[i + delta] = i / delta | 0;
    for (sum = first, i = 0; i < 30; ++i) {
        base[i] = sum;
        sum += 1 << bits[i];
    }
}
function tinf_build_fixed_trees(lt, dt) {
    var i;
    for (i = 0; i < 7; ++i)
        lt.table[i] = 0;
    lt.table[7] = 24;
    lt.table[8] = 152;
    lt.table[9] = 112;
    for (i = 0; i < 24; ++i)
        lt.trans[i] = 256 + i;
    for (i = 0; i < 144; ++i)
        lt.trans[24 + i] = i;
    for (i = 0; i < 8; ++i)
        lt.trans[24 + 144 + i] = 280 + i;
    for (i = 0; i < 112; ++i)
        lt.trans[24 + 144 + 8 + i] = 144 + i;
    for (i = 0; i < 5; ++i)
        dt.table[i] = 0;
    dt.table[5] = 32;
    for (i = 0; i < 32; ++i)
        dt.trans[i] = i;
}
var offs = new Uint16Array(16);
function tinf_build_tree(t, lengths, off, num) {
    var i, sum;
    for (i = 0; i < 16; ++i)
        t.table[i] = 0;
    for (i = 0; i < num; ++i)
        t.table[lengths[off + i]]++;
    t.table[0] = 0;
    for (sum = 0, i = 0; i < 16; ++i) {
        offs[i] = sum;
        sum += t.table[i];
    }
    for (i = 0; i < num; ++i) {
        if (lengths[off + i])
            t.trans[offs[lengths[off + i]]++] = i;
    }
}
function tinf_getbit(d) {
    if (!d.bitcount--) {
        d.tag = d.source[d.sourceIndex++];
        d.bitcount = 7;
    }
    var bit = d.tag & 1;
    d.tag >>>= 1;
    return bit;
}
function tinf_read_bits(d, num, base) {
    if (!num)
        return base;
    while (d.bitcount < 24) {
        d.tag |= d.source[d.sourceIndex++] << d.bitcount;
        d.bitcount += 8;
    }
    var val = d.tag & (0xffff >>> (16 - num));
    d.tag >>>= num;
    d.bitcount -= num;
    return val + base;
}
function tinf_decode_symbol(d, t) {
    while (d.bitcount < 24) {
        d.tag |= d.source[d.sourceIndex++] << d.bitcount;
        d.bitcount += 8;
    }
    var sum = 0, cur = 0, len = 0;
    var tag = d.tag;
    do {
        cur = 2 * cur + (tag & 1);
        tag >>>= 1;
        ++len;
        sum += t.table[len];
        cur -= t.table[len];
    } while (cur >= 0);
    d.tag = tag;
    d.bitcount -= len;
    return t.trans[sum + cur];
}
function tinf_decode_trees(d, lt, dt) {
    var hlit, hdist, hclen;
    var i, num, length;
    hlit = tinf_read_bits(d, 5, 257);
    hdist = tinf_read_bits(d, 5, 1);
    hclen = tinf_read_bits(d, 4, 4);
    for (i = 0; i < 19; ++i)
        lengths[i] = 0;
    for (i = 0; i < hclen; ++i) {
        var clen = tinf_read_bits(d, 3, 0);
        lengths[clcidx[i]] = clen;
    }
    tinf_build_tree(code_tree, lengths, 0, 19);
    for (num = 0; num < hlit + hdist;) {
        var sym = tinf_decode_symbol(d, code_tree);
        switch (sym) {
            case 16:
                var prev = lengths[num - 1];
                for (length = tinf_read_bits(d, 2, 3); length; --length) {
                    lengths[num++] = prev;
                }
                break;
            case 17:
                for (length = tinf_read_bits(d, 3, 3); length; --length) {
                    lengths[num++] = 0;
                }
                break;
            case 18:
                for (length = tinf_read_bits(d, 7, 11); length; --length) {
                    lengths[num++] = 0;
                }
                break;
            default:
                lengths[num++] = sym;
                break;
        }
    }
    tinf_build_tree(lt, lengths, 0, hlit);
    tinf_build_tree(dt, lengths, hlit, hdist);
}
function tinf_inflate_block_data(d, lt, dt) {
    for (;;) {
        var sym = tinf_decode_symbol(d, lt);
        if (sym === 256) {
            return TINF_OK;
        }
        if (sym < 256) {
            d.dest[d.destLen++] = sym;
        }
        else {
            var length, dist, offs;
            var i;
            sym -= 257;
            length = tinf_read_bits(d, length_bits[sym], length_base[sym]);
            dist = tinf_decode_symbol(d, dt);
            offs = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);
            for (i = offs; i < offs + length; ++i) {
                d.dest[d.destLen++] = d.dest[i];
            }
        }
    }
}
function tinf_inflate_uncompressed_block(d) {
    var length, invlength;
    var i;
    while (d.bitcount > 8) {
        d.sourceIndex--;
        d.bitcount -= 8;
    }
    length = d.source[d.sourceIndex + 1];
    length = 256 * length + d.source[d.sourceIndex];
    invlength = d.source[d.sourceIndex + 3];
    invlength = 256 * invlength + d.source[d.sourceIndex + 2];
    if (length !== (~invlength & 0x0000ffff))
        return TINF_DATA_ERROR;
    d.sourceIndex += 4;
    for (i = length; i; --i)
        d.dest[d.destLen++] = d.source[d.sourceIndex++];
    d.bitcount = 0;
    return TINF_OK;
}
function tinf_uncompress(source, dest) {
    var d = new Data(source, dest);
    var bfinal, btype, res;
    do {
        bfinal = tinf_getbit(d);
        btype = tinf_read_bits(d, 2, 0);
        switch (btype) {
            case 0:
                res = tinf_inflate_uncompressed_block(d);
                break;
            case 1:
                res = tinf_inflate_block_data(d, sltree, sdtree);
                break;
            case 2:
                tinf_decode_trees(d, d.ltree, d.dtree);
                res = tinf_inflate_block_data(d, d.ltree, d.dtree);
                break;
            default:
                res = TINF_DATA_ERROR;
        }
        if (res !== TINF_OK)
            throw new Error('Data error');
    } while (!bfinal);
    if (d.destLen < d.dest.length) {
        if (typeof d.dest.slice === 'function')
            return d.dest.slice(0, d.destLen);
        else
            return d.dest.subarray(0, d.destLen);
    }
    return d.dest;
}
tinf_build_fixed_trees(sltree, sdtree);
tinf_build_bits_base(length_bits, length_base, 4, 3);
tinf_build_bits_base(dist_bits, dist_base, 2, 1);
length_bits[28] = 0;
length_base[28] = 258;

const SHIFT_1 = 6 + 5;
const SHIFT_2 = 5;
const SHIFT_1_2 = SHIFT_1 - SHIFT_2;
const OMITTED_BMP_INDEX_1_LENGTH = 0x10000 >> SHIFT_1;
const INDEX_2_BLOCK_LENGTH = 1 << SHIFT_1_2;
const INDEX_2_MASK = INDEX_2_BLOCK_LENGTH - 1;
const INDEX_SHIFT = 2;
const DATA_BLOCK_LENGTH = 1 << SHIFT_2;
const DATA_MASK = DATA_BLOCK_LENGTH - 1;
const LSCP_INDEX_2_OFFSET = 0x10000 >> SHIFT_2;
const LSCP_INDEX_2_LENGTH = 0x400 >> SHIFT_2;
const INDEX_2_BMP_LENGTH = LSCP_INDEX_2_OFFSET + LSCP_INDEX_2_LENGTH;
const UTF8_2B_INDEX_2_OFFSET = INDEX_2_BMP_LENGTH;
const UTF8_2B_INDEX_2_LENGTH = 0x800 >> 6;
const INDEX_1_OFFSET = UTF8_2B_INDEX_2_OFFSET + UTF8_2B_INDEX_2_LENGTH;
const DATA_GRANULARITY = 1 << INDEX_SHIFT;
const isBigEndian = (new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x12);
class UnicodeTrie {
    constructor(data) {
        const view = new DataView(data.buffer);
        this.highStart = view.getUint32(0, true);
        this.errorValue = view.getUint32(4, true);
        let uncompressedLength = view.getUint32(8, true);
        data = data.subarray(12);
        data = tinf_uncompress(data, new Uint8Array(uncompressedLength));
        data = tinf_uncompress(data, new Uint8Array(uncompressedLength));
        if (isBigEndian) {
            const len = data.length;
            for (let i = 0; i < len; i += 4) {
                let x = data[i];
                data[i] = data[i + 3];
                data[i + 3] = x;
                let y = data[i + 1];
                data[i + 1] = data[i + 2];
                data[i + 2] = y;
            }
        }
        this.data = new Uint32Array(data.buffer);
    }
    get(codePoint) {
        let index;
        if ((codePoint < 0) || (codePoint > 0x10ffff)) {
            return this.errorValue;
        }
        if ((codePoint < 0xd800) || ((codePoint > 0xdbff) && (codePoint <= 0xffff))) {
            index = (this.data[codePoint >> SHIFT_2] << INDEX_SHIFT) + (codePoint & DATA_MASK);
            return this.data[index];
        }
        if (codePoint <= 0xffff) {
            index = (this.data[LSCP_INDEX_2_OFFSET + ((codePoint - 0xd800) >> SHIFT_2)] << INDEX_SHIFT) + (codePoint & DATA_MASK);
            return this.data[index];
        }
        if (codePoint < this.highStart) {
            index = this.data[(INDEX_1_OFFSET - OMITTED_BMP_INDEX_1_LENGTH) + (codePoint >> SHIFT_1)];
            index = this.data[index + ((codePoint >> SHIFT_2) & INDEX_2_MASK)];
            index = (index << INDEX_SHIFT) + (codePoint & DATA_MASK);
            return this.data[index];
        }
        return this.data[this.data.length - DATA_GRANULARITY];
    }
}

const trieRaw = "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";
function _dec(s) {
    if (typeof Buffer !== 'undefined')
        return Buffer.from(s, 'base64');
    const bs = atob(s);
    const r = new Uint8Array(bs.length);
    for (let i = 0; i < r.length; ++i)
        r[i] = bs.charCodeAt(i);
    return r;
}
const trieData = new UnicodeTrie(_dec(trieRaw));
const GRAPHEME_BREAK_MASK = 0xF;
const GRAPHEME_BREAK_SHIFT = 0;
const CHARWIDTH_MASK = 0x30;
const CHARWIDTH_SHIFT = 4;
const GRAPHEME_BREAK_Other = 0;
const GRAPHEME_BREAK_Prepend = 1;
const GRAPHEME_BREAK_Extend = 2;
const GRAPHEME_BREAK_Regional_Indicator = 3;
const GRAPHEME_BREAK_SpacingMark = 4;
const GRAPHEME_BREAK_Hangul_L = 5;
const GRAPHEME_BREAK_Hangul_V = 6;
const GRAPHEME_BREAK_Hangul_T = 7;
const GRAPHEME_BREAK_Hangul_LV = 8;
const GRAPHEME_BREAK_Hangul_LVT = 9;
const GRAPHEME_BREAK_ZWJ = 10;
const GRAPHEME_BREAK_ExtPic = 11;
const GRAPHEME_BREAK_SAW_Regional_Pair = 32;
function infoToWidthInfo(info) {
    return (info & CHARWIDTH_MASK) >> CHARWIDTH_SHIFT;
}
function shouldJoin(beforeState, afterInfo) {
    let beforeCode = (beforeState & GRAPHEME_BREAK_MASK) >> GRAPHEME_BREAK_SHIFT;
    let afterCode = (afterInfo & GRAPHEME_BREAK_MASK) >> GRAPHEME_BREAK_SHIFT;
    if (_shouldJoin(beforeCode, afterCode)) {
        if (afterCode === GRAPHEME_BREAK_Regional_Indicator)
            return GRAPHEME_BREAK_SAW_Regional_Pair;
        else
            return afterCode + 16;
    }
    else
        return afterCode - 16;
}
function _shouldJoin(beforeCode, afterCode) {
    if (beforeCode >= GRAPHEME_BREAK_Hangul_L
        && beforeCode <= GRAPHEME_BREAK_Hangul_LVT) {
        if (beforeCode == GRAPHEME_BREAK_Hangul_L
            && (afterCode == GRAPHEME_BREAK_Hangul_L
                || afterCode == GRAPHEME_BREAK_Hangul_V
                || afterCode == GRAPHEME_BREAK_Hangul_LV
                || afterCode == GRAPHEME_BREAK_Hangul_LVT))
            return true;
        if ((beforeCode == GRAPHEME_BREAK_Hangul_LV
            || beforeCode == GRAPHEME_BREAK_Hangul_V)
            && (afterCode == GRAPHEME_BREAK_Hangul_V
                || afterCode == GRAPHEME_BREAK_Hangul_T))
            return true;
        if ((beforeCode == GRAPHEME_BREAK_Hangul_LVT
            || beforeCode == GRAPHEME_BREAK_Hangul_T)
            && afterCode == GRAPHEME_BREAK_Hangul_T)
            return true;
    }
    if (afterCode == GRAPHEME_BREAK_Extend
        || afterCode == GRAPHEME_BREAK_ZWJ
        || beforeCode == GRAPHEME_BREAK_Prepend
        || afterCode == GRAPHEME_BREAK_SpacingMark)
        return true;
    if (beforeCode == GRAPHEME_BREAK_ZWJ
        && afterCode == GRAPHEME_BREAK_ExtPic)
        return true;
    if (afterCode == GRAPHEME_BREAK_Regional_Indicator
        && beforeCode == GRAPHEME_BREAK_Regional_Indicator)
        return true;
    return false;
}
function getInfo(codePoint) {
    return trieData.get(codePoint);
}

class UnicodeGraphemeProvider {
    constructor(handleGraphemes = true) {
        this.ambiguousCharsAreWide = false;
        this.version = handleGraphemes ? '15-graphemes' : '15';
        this.handleGraphemes = handleGraphemes;
    }
    charProperties(codepoint, preceding) {
        if ((codepoint >= 32 && codepoint < 127) && (preceding >> 3) === 0) {
            return UnicodeGraphemeProvider._plainNarrowProperties;
        }
        let charInfo = getInfo(codepoint);
        let w = infoToWidthInfo(charInfo);
        let shouldJoin$1 = false;
        if (w >= 2) {
            w = w === 3 || this.ambiguousCharsAreWide || codepoint === 0xfe0f ? 2 : 1;
        }
        else {
            w = 1;
        }
        if (preceding !== 0) {
            const oldWidth = UnicodeService.extractWidth(preceding);
            if (this.handleGraphemes) {
                charInfo = shouldJoin(UnicodeService.extractCharKind(preceding), charInfo);
            }
            else {
                charInfo = w === 0 ? 1 : 0;
            }
            shouldJoin$1 = charInfo > 0;
            if (shouldJoin$1) {
                if (oldWidth > w) {
                    w = oldWidth;
                }
                else if (charInfo === 32) {
                    w = 2;
                }
            }
        }
        return UnicodeService.createPropertyValue(charInfo, w, shouldJoin$1);
    }
    wcwidth(codepoint) {
        const charInfo = getInfo(codepoint);
        const w = infoToWidthInfo(charInfo);
        const kind = (charInfo & GRAPHEME_BREAK_MASK) >> GRAPHEME_BREAK_SHIFT;
        if (kind === GRAPHEME_BREAK_Extend || kind === GRAPHEME_BREAK_Prepend) {
            return 0;
        }
        if (w >= 2 && (w === 3 || this.ambiguousCharsAreWide)) {
            return 2;
        }
        return 1;
    }
}
UnicodeGraphemeProvider._plainNarrowProperties = UnicodeService.createPropertyValue(GRAPHEME_BREAK_Other, 1, false);

class UnicodeGraphemesAddon {
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

export { UnicodeGraphemesAddon };
//# sourceMappingURL=UnicodeGraphemesAddon.js.map
