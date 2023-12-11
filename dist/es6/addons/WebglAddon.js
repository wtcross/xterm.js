import { EventEmitter, forwardEvent } from 'common/EventEmitter';
import { Disposable, toDisposable, MutableDisposable, getDisposeArrayDisposable } from 'common/Lifecycle';
import { isSafari, getSafariVersion } from 'common/Platform';
import { addDisposableDomListener } from 'browser/Lifecycle';
import { CellColorResolver } from 'browser/renderer/shared/CellColorResolver';
import { acquireTextureAtlas, removeTerminalFromCache } from 'browser/renderer/shared/CharAtlasCache';
import { CursorBlinkStateManager } from 'browser/renderer/shared/CursorBlinkStateManager';
import { observeDevicePixelDimensions } from 'browser/renderer/shared/DevicePixelObserver';
import { throwIfFalsy, createRenderDimensions } from 'browser/renderer/shared/RendererUtils';
import { AttributeData } from 'common/buffer/AttributeData';
import { CellData } from 'common/buffer/CellData';
import { NULL_CELL_CODE, NULL_CELL_CHAR } from 'common/buffer/Constants';
import { TextureAtlas } from 'browser/renderer/shared/TextureAtlas';
import { createSelectionRenderModel } from 'browser/renderer/shared/SelectionRenderModel';
import { is256Color } from 'browser/renderer/shared/CharAtlasUtils';
import { TEXT_BASELINE, INVERTED_DEFAULT_COLOR } from 'browser/renderer/shared/Constants';
import { setTraceLogger } from 'common/services/LogService';

const PROJECTION_MATRIX = new Float32Array([
    2, 0, 0, 0,
    0, -2, 0, 0,
    0, 0, 1, 0,
    -1, 1, 0, 1
]);
function createProgram(gl, vertexSource, fragmentSource) {
    const program = throwIfFalsy(gl.createProgram());
    gl.attachShader(program, throwIfFalsy(createShader(gl, gl.VERTEX_SHADER, vertexSource)));
    gl.attachShader(program, throwIfFalsy(createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)));
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}
function createShader(gl, type, source) {
    const shader = throwIfFalsy(gl.createShader(type));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}
function expandFloat32Array(source, max) {
    const newLength = Math.min(source.length * 2, max);
    const newArray = new Float32Array(newLength);
    for (let i = 0; i < source.length; i++) {
        newArray[i] = source[i];
    }
    return newArray;
}
class GLTexture {
    constructor(texture) {
        this.texture = texture;
        this.version = -1;
    }
}

const vertexShaderSource$1 = `#version 300 es
layout (location = ${0}) in vec2 a_unitquad;
layout (location = ${1}) in vec2 a_cellpos;
layout (location = ${2}) in vec2 a_offset;
layout (location = ${3}) in vec2 a_size;
layout (location = ${4}) in float a_texpage;
layout (location = ${5}) in vec2 a_texcoord;
layout (location = ${6}) in vec2 a_texsize;

uniform mat4 u_projection;
uniform vec2 u_resolution;

out vec2 v_texcoord;
flat out int v_texpage;

void main() {
  vec2 zeroToOne = (a_offset / u_resolution) + a_cellpos + (a_unitquad * a_size);
  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);
  v_texpage = int(a_texpage);
  v_texcoord = a_texcoord + a_unitquad * a_texsize;
}`;
function createFragmentShaderSource(maxFragmentShaderTextureUnits) {
    let textureConditionals = '';
    for (let i = 1; i < maxFragmentShaderTextureUnits; i++) {
        textureConditionals += ` else if (v_texpage == ${i}) { outColor = texture(u_texture[${i}], v_texcoord); }`;
    }
    return (`#version 300 es
precision lowp float;

in vec2 v_texcoord;
flat in int v_texpage;

uniform sampler2D u_texture[${maxFragmentShaderTextureUnits}];

out vec4 outColor;

void main() {
  if (v_texpage == 0) {
    outColor = texture(u_texture[0], v_texcoord);
  } ${textureConditionals}
}`);
}
const INDICES_PER_CELL = 11;
const BYTES_PER_CELL = INDICES_PER_CELL * Float32Array.BYTES_PER_ELEMENT;
const CELL_POSITION_INDICES = 2;
let $i = 0;
let $glyph = undefined;
let $leftCellPadding = 0;
let $clippedPixels = 0;
class GlyphRenderer extends Disposable {
    constructor(_terminal, _gl, _dimensions) {
        super();
        this._terminal = _terminal;
        this._gl = _gl;
        this._dimensions = _dimensions;
        this._activeBuffer = 0;
        this._vertices = {
            count: 0,
            attributes: new Float32Array(0),
            attributesBuffers: [
                new Float32Array(0),
                new Float32Array(0)
            ]
        };
        const gl = this._gl;
        if (TextureAtlas.maxAtlasPages === undefined) {
            TextureAtlas.maxAtlasPages = Math.min(32, throwIfFalsy(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)));
            TextureAtlas.maxTextureSize = throwIfFalsy(gl.getParameter(gl.MAX_TEXTURE_SIZE));
        }
        this._program = throwIfFalsy(createProgram(gl, vertexShaderSource$1, createFragmentShaderSource(TextureAtlas.maxAtlasPages)));
        this.register(toDisposable(() => gl.deleteProgram(this._program)));
        this._projectionLocation = throwIfFalsy(gl.getUniformLocation(this._program, 'u_projection'));
        this._resolutionLocation = throwIfFalsy(gl.getUniformLocation(this._program, 'u_resolution'));
        this._textureLocation = throwIfFalsy(gl.getUniformLocation(this._program, 'u_texture'));
        this._vertexArrayObject = gl.createVertexArray();
        gl.bindVertexArray(this._vertexArrayObject);
        const unitQuadVertices = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
        const unitQuadVerticesBuffer = gl.createBuffer();
        this.register(toDisposable(() => gl.deleteBuffer(unitQuadVerticesBuffer)));
        gl.bindBuffer(gl.ARRAY_BUFFER, unitQuadVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, unitQuadVertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, this._gl.FLOAT, false, 0, 0);
        const unitQuadElementIndices = new Uint8Array([0, 1, 2, 3]);
        const elementIndicesBuffer = gl.createBuffer();
        this.register(toDisposable(() => gl.deleteBuffer(elementIndicesBuffer)));
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementIndicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, unitQuadElementIndices, gl.STATIC_DRAW);
        this._attributesBuffer = throwIfFalsy(gl.createBuffer());
        this.register(toDisposable(() => gl.deleteBuffer(this._attributesBuffer)));
        gl.bindBuffer(gl.ARRAY_BUFFER, this._attributesBuffer);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, BYTES_PER_CELL, 0);
        gl.vertexAttribDivisor(2, 1);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, BYTES_PER_CELL, 2 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribDivisor(3, 1);
        gl.enableVertexAttribArray(4);
        gl.vertexAttribPointer(4, 1, gl.FLOAT, false, BYTES_PER_CELL, 4 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribDivisor(4, 1);
        gl.enableVertexAttribArray(5);
        gl.vertexAttribPointer(5, 2, gl.FLOAT, false, BYTES_PER_CELL, 5 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribDivisor(5, 1);
        gl.enableVertexAttribArray(6);
        gl.vertexAttribPointer(6, 2, gl.FLOAT, false, BYTES_PER_CELL, 7 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribDivisor(6, 1);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, BYTES_PER_CELL, 9 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribDivisor(1, 1);
        gl.useProgram(this._program);
        const textureUnits = new Int32Array(TextureAtlas.maxAtlasPages);
        for (let i = 0; i < TextureAtlas.maxAtlasPages; i++) {
            textureUnits[i] = i;
        }
        gl.uniform1iv(this._textureLocation, textureUnits);
        gl.uniformMatrix4fv(this._projectionLocation, false, PROJECTION_MATRIX);
        this._atlasTextures = [];
        for (let i = 0; i < TextureAtlas.maxAtlasPages; i++) {
            const glTexture = new GLTexture(throwIfFalsy(gl.createTexture()));
            this.register(toDisposable(() => gl.deleteTexture(glTexture.texture)));
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, glTexture.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
            this._atlasTextures[i] = glTexture;
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.handleResize();
    }
    beginFrame() {
        return this._atlas ? this._atlas.beginFrame() : true;
    }
    updateCell(x, y, code, bg, fg, ext, chars, lastBg) {
        this._updateCell(this._vertices.attributes, x, y, code, bg, fg, ext, chars, lastBg);
    }
    _updateCell(array, x, y, code, bg, fg, ext, chars, lastBg) {
        $i = (y * this._terminal.cols + x) * INDICES_PER_CELL;
        if (code === NULL_CELL_CODE || code === undefined) {
            array.fill(0, $i, $i + INDICES_PER_CELL - 1 - CELL_POSITION_INDICES);
            return;
        }
        if (!this._atlas) {
            return;
        }
        if (chars && chars.length > 1) {
            $glyph = this._atlas.getRasterizedGlyphCombinedChar(chars, bg, fg, ext, false);
        }
        else {
            $glyph = this._atlas.getRasterizedGlyph(code, bg, fg, ext, false);
        }
        $leftCellPadding = Math.floor((this._dimensions.device.cell.width - this._dimensions.device.char.width) / 2);
        if (bg !== lastBg && $glyph.offset.x > $leftCellPadding) {
            $clippedPixels = $glyph.offset.x - $leftCellPadding;
            array[$i] = -($glyph.offset.x - $clippedPixels) + this._dimensions.device.char.left;
            array[$i + 1] = -$glyph.offset.y + this._dimensions.device.char.top;
            array[$i + 2] = ($glyph.size.x - $clippedPixels) / this._dimensions.device.canvas.width;
            array[$i + 3] = $glyph.size.y / this._dimensions.device.canvas.height;
            array[$i + 4] = $glyph.texturePage;
            array[$i + 5] = $glyph.texturePositionClipSpace.x + $clippedPixels / this._atlas.pages[$glyph.texturePage].canvas.width;
            array[$i + 6] = $glyph.texturePositionClipSpace.y;
            array[$i + 7] = $glyph.sizeClipSpace.x - $clippedPixels / this._atlas.pages[$glyph.texturePage].canvas.width;
            array[$i + 8] = $glyph.sizeClipSpace.y;
        }
        else {
            array[$i] = -$glyph.offset.x + this._dimensions.device.char.left;
            array[$i + 1] = -$glyph.offset.y + this._dimensions.device.char.top;
            array[$i + 2] = $glyph.size.x / this._dimensions.device.canvas.width;
            array[$i + 3] = $glyph.size.y / this._dimensions.device.canvas.height;
            array[$i + 4] = $glyph.texturePage;
            array[$i + 5] = $glyph.texturePositionClipSpace.x;
            array[$i + 6] = $glyph.texturePositionClipSpace.y;
            array[$i + 7] = $glyph.sizeClipSpace.x;
            array[$i + 8] = $glyph.sizeClipSpace.y;
        }
    }
    clear() {
        const terminal = this._terminal;
        const newCount = terminal.cols * terminal.rows * INDICES_PER_CELL;
        if (this._vertices.count !== newCount) {
            this._vertices.attributes = new Float32Array(newCount);
        }
        else {
            this._vertices.attributes.fill(0);
        }
        let i = 0;
        for (; i < this._vertices.attributesBuffers.length; i++) {
            if (this._vertices.count !== newCount) {
                this._vertices.attributesBuffers[i] = new Float32Array(newCount);
            }
            else {
                this._vertices.attributesBuffers[i].fill(0);
            }
        }
        this._vertices.count = newCount;
        i = 0;
        for (let y = 0; y < terminal.rows; y++) {
            for (let x = 0; x < terminal.cols; x++) {
                this._vertices.attributes[i + 9] = x / terminal.cols;
                this._vertices.attributes[i + 10] = y / terminal.rows;
                i += INDICES_PER_CELL;
            }
        }
    }
    handleResize() {
        const gl = this._gl;
        gl.useProgram(this._program);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.uniform2f(this._resolutionLocation, gl.canvas.width, gl.canvas.height);
        this.clear();
    }
    render(renderModel) {
        if (!this._atlas) {
            return;
        }
        const gl = this._gl;
        gl.useProgram(this._program);
        gl.bindVertexArray(this._vertexArrayObject);
        this._activeBuffer = (this._activeBuffer + 1) % 2;
        const activeBuffer = this._vertices.attributesBuffers[this._activeBuffer];
        let bufferLength = 0;
        for (let y = 0; y < renderModel.lineLengths.length; y++) {
            const si = y * this._terminal.cols * INDICES_PER_CELL;
            const sub = this._vertices.attributes.subarray(si, si + renderModel.lineLengths[y] * INDICES_PER_CELL);
            activeBuffer.set(sub, bufferLength);
            bufferLength += sub.length;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this._attributesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, activeBuffer.subarray(0, bufferLength), gl.STREAM_DRAW);
        for (let i = 0; i < this._atlas.pages.length; i++) {
            if (this._atlas.pages[i].version !== this._atlasTextures[i].version) {
                this._bindAtlasPageTexture(gl, this._atlas, i);
            }
        }
        gl.drawElementsInstanced(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_BYTE, 0, bufferLength / INDICES_PER_CELL);
    }
    setAtlas(atlas) {
        this._atlas = atlas;
        for (const glTexture of this._atlasTextures) {
            glTexture.version = -1;
        }
    }
    _bindAtlasPageTexture(gl, atlas, i) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, this._atlasTextures[i].texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.pages[i].canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
        this._atlasTextures[i].version = atlas.pages[i].version;
    }
    setDimensions(dimensions) {
        this._dimensions = dimensions;
    }
}

const RENDER_MODEL_INDICIES_PER_CELL = 4;
const RENDER_MODEL_BG_OFFSET = 1;
const RENDER_MODEL_FG_OFFSET = 2;
const RENDER_MODEL_EXT_OFFSET = 3;
const COMBINED_CHAR_BIT_MASK = 0x80000000;
class RenderModel {
    constructor() {
        this.cells = new Uint32Array(0);
        this.lineLengths = new Uint32Array(0);
        this.selection = createSelectionRenderModel();
    }
    resize(cols, rows) {
        const indexCount = cols * rows * RENDER_MODEL_INDICIES_PER_CELL;
        if (indexCount !== this.cells.length) {
            this.cells = new Uint32Array(indexCount);
            this.lineLengths = new Uint32Array(rows);
        }
    }
    clear() {
        this.cells.fill(0, 0);
        this.lineLengths.fill(0, 0);
    }
}

const vertexShaderSource = `#version 300 es
layout (location = ${0}) in vec2 a_position;
layout (location = ${1}) in vec2 a_size;
layout (location = ${2}) in vec4 a_color;
layout (location = ${3}) in vec2 a_unitquad;

uniform mat4 u_projection;

out vec4 v_color;

void main() {
  vec2 zeroToOne = a_position + (a_unitquad * a_size);
  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);
  v_color = a_color;
}`;
const fragmentShaderSource = `#version 300 es
precision lowp float;

in vec4 v_color;

out vec4 outColor;

void main() {
  outColor = v_color;
}`;
const INDICES_PER_RECTANGLE = 8;
const BYTES_PER_RECTANGLE = INDICES_PER_RECTANGLE * Float32Array.BYTES_PER_ELEMENT;
const INITIAL_BUFFER_RECTANGLE_CAPACITY = 20 * INDICES_PER_RECTANGLE;
class Vertices {
    constructor() {
        this.attributes = new Float32Array(INITIAL_BUFFER_RECTANGLE_CAPACITY);
        this.count = 0;
    }
}
let $rgba = 0;
let $x1 = 0;
let $y1 = 0;
let $r = 0;
let $g = 0;
let $b = 0;
let $a = 0;
class RectangleRenderer extends Disposable {
    constructor(_terminal, _gl, _dimensions, _themeService) {
        super();
        this._terminal = _terminal;
        this._gl = _gl;
        this._dimensions = _dimensions;
        this._themeService = _themeService;
        this._vertices = new Vertices();
        this._verticesCursor = new Vertices();
        const gl = this._gl;
        this._program = throwIfFalsy(createProgram(gl, vertexShaderSource, fragmentShaderSource));
        this.register(toDisposable(() => gl.deleteProgram(this._program)));
        this._projectionLocation = throwIfFalsy(gl.getUniformLocation(this._program, 'u_projection'));
        this._vertexArrayObject = gl.createVertexArray();
        gl.bindVertexArray(this._vertexArrayObject);
        const unitQuadVertices = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
        const unitQuadVerticesBuffer = gl.createBuffer();
        this.register(toDisposable(() => gl.deleteBuffer(unitQuadVerticesBuffer)));
        gl.bindBuffer(gl.ARRAY_BUFFER, unitQuadVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, unitQuadVertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, this._gl.FLOAT, false, 0, 0);
        const unitQuadElementIndices = new Uint8Array([0, 1, 2, 3]);
        const elementIndicesBuffer = gl.createBuffer();
        this.register(toDisposable(() => gl.deleteBuffer(elementIndicesBuffer)));
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementIndicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, unitQuadElementIndices, gl.STATIC_DRAW);
        this._attributesBuffer = throwIfFalsy(gl.createBuffer());
        this.register(toDisposable(() => gl.deleteBuffer(this._attributesBuffer)));
        gl.bindBuffer(gl.ARRAY_BUFFER, this._attributesBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, BYTES_PER_RECTANGLE, 0);
        gl.vertexAttribDivisor(0, 1);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, BYTES_PER_RECTANGLE, 2 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, BYTES_PER_RECTANGLE, 4 * Float32Array.BYTES_PER_ELEMENT);
        gl.vertexAttribDivisor(2, 1);
        this._updateCachedColors(_themeService.colors);
        this.register(this._themeService.onChangeColors(e => {
            this._updateCachedColors(e);
            this._updateViewportRectangle();
        }));
    }
    renderBackgrounds() {
        this._renderVertices(this._vertices);
    }
    renderCursor() {
        this._renderVertices(this._verticesCursor);
    }
    _renderVertices(vertices) {
        const gl = this._gl;
        gl.useProgram(this._program);
        gl.bindVertexArray(this._vertexArrayObject);
        gl.uniformMatrix4fv(this._projectionLocation, false, PROJECTION_MATRIX);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._attributesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices.attributes, gl.DYNAMIC_DRAW);
        gl.drawElementsInstanced(this._gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_BYTE, 0, vertices.count);
    }
    handleResize() {
        this._updateViewportRectangle();
    }
    setDimensions(dimensions) {
        this._dimensions = dimensions;
    }
    _updateCachedColors(colors) {
        this._bgFloat = this._colorToFloat32Array(colors.background);
        this._cursorFloat = this._colorToFloat32Array(colors.cursor);
    }
    _updateViewportRectangle() {
        this._addRectangleFloat(this._vertices.attributes, 0, 0, 0, this._terminal.cols * this._dimensions.device.cell.width, this._terminal.rows * this._dimensions.device.cell.height, this._bgFloat);
    }
    updateBackgrounds(model) {
        const terminal = this._terminal;
        const vertices = this._vertices;
        let rectangleCount = 1;
        let y;
        let x;
        let currentStartX;
        let currentBg;
        let currentFg;
        let currentInverse;
        let modelIndex;
        let bg;
        let fg;
        let inverse;
        let offset;
        for (y = 0; y < terminal.rows; y++) {
            currentStartX = -1;
            currentBg = 0;
            currentFg = 0;
            currentInverse = false;
            for (x = 0; x < terminal.cols; x++) {
                modelIndex = ((y * terminal.cols) + x) * RENDER_MODEL_INDICIES_PER_CELL;
                bg = model.cells[modelIndex + RENDER_MODEL_BG_OFFSET];
                fg = model.cells[modelIndex + RENDER_MODEL_FG_OFFSET];
                inverse = !!(fg & 67108864);
                if (bg !== currentBg || (fg !== currentFg && (currentInverse || inverse))) {
                    if (currentBg !== 0 || (currentInverse && currentFg !== 0)) {
                        offset = rectangleCount++ * INDICES_PER_RECTANGLE;
                        this._updateRectangle(vertices, offset, currentFg, currentBg, currentStartX, x, y);
                    }
                    currentStartX = x;
                    currentBg = bg;
                    currentFg = fg;
                    currentInverse = inverse;
                }
            }
            if (currentBg !== 0 || (currentInverse && currentFg !== 0)) {
                offset = rectangleCount++ * INDICES_PER_RECTANGLE;
                this._updateRectangle(vertices, offset, currentFg, currentBg, currentStartX, terminal.cols, y);
            }
        }
        vertices.count = rectangleCount;
    }
    updateCursor(model) {
        const vertices = this._verticesCursor;
        const cursor = model.cursor;
        if (!cursor || cursor.style === 'block') {
            vertices.count = 0;
            return;
        }
        let offset;
        let rectangleCount = 0;
        if (cursor.style === 'bar' || cursor.style === 'outline') {
            offset = rectangleCount++ * INDICES_PER_RECTANGLE;
            this._addRectangleFloat(vertices.attributes, offset, cursor.x * this._dimensions.device.cell.width, cursor.y * this._dimensions.device.cell.height, cursor.style === 'bar' ? cursor.dpr * cursor.cursorWidth : cursor.dpr, this._dimensions.device.cell.height, this._cursorFloat);
        }
        if (cursor.style === 'underline' || cursor.style === 'outline') {
            offset = rectangleCount++ * INDICES_PER_RECTANGLE;
            this._addRectangleFloat(vertices.attributes, offset, cursor.x * this._dimensions.device.cell.width, (cursor.y + 1) * this._dimensions.device.cell.height - cursor.dpr, cursor.width * this._dimensions.device.cell.width, cursor.dpr, this._cursorFloat);
        }
        if (cursor.style === 'outline') {
            offset = rectangleCount++ * INDICES_PER_RECTANGLE;
            this._addRectangleFloat(vertices.attributes, offset, cursor.x * this._dimensions.device.cell.width, cursor.y * this._dimensions.device.cell.height, cursor.width * this._dimensions.device.cell.width, cursor.dpr, this._cursorFloat);
            offset = rectangleCount++ * INDICES_PER_RECTANGLE;
            this._addRectangleFloat(vertices.attributes, offset, (cursor.x + cursor.width) * this._dimensions.device.cell.width - cursor.dpr, cursor.y * this._dimensions.device.cell.height, cursor.dpr, this._dimensions.device.cell.height, this._cursorFloat);
        }
        vertices.count = rectangleCount;
    }
    _updateRectangle(vertices, offset, fg, bg, startX, endX, y) {
        if (fg & 67108864) {
            switch (fg & 50331648) {
                case 16777216:
                case 33554432:
                    $rgba = this._themeService.colors.ansi[fg & 255].rgba;
                    break;
                case 50331648:
                    $rgba = (fg & 16777215) << 8;
                    break;
                case 0:
                default:
                    $rgba = this._themeService.colors.foreground.rgba;
            }
        }
        else {
            switch (bg & 50331648) {
                case 16777216:
                case 33554432:
                    $rgba = this._themeService.colors.ansi[bg & 255].rgba;
                    break;
                case 50331648:
                    $rgba = (bg & 16777215) << 8;
                    break;
                case 0:
                default:
                    $rgba = this._themeService.colors.background.rgba;
            }
        }
        if (vertices.attributes.length < offset + 4) {
            vertices.attributes = expandFloat32Array(vertices.attributes, this._terminal.rows * this._terminal.cols * INDICES_PER_RECTANGLE);
        }
        $x1 = startX * this._dimensions.device.cell.width;
        $y1 = y * this._dimensions.device.cell.height;
        $r = (($rgba >> 24) & 0xFF) / 255;
        $g = (($rgba >> 16) & 0xFF) / 255;
        $b = (($rgba >> 8) & 0xFF) / 255;
        $a = 1;
        this._addRectangle(vertices.attributes, offset, $x1, $y1, (endX - startX) * this._dimensions.device.cell.width, this._dimensions.device.cell.height, $r, $g, $b, $a);
    }
    _addRectangle(array, offset, x1, y1, width, height, r, g, b, a) {
        array[offset] = x1 / this._dimensions.device.canvas.width;
        array[offset + 1] = y1 / this._dimensions.device.canvas.height;
        array[offset + 2] = width / this._dimensions.device.canvas.width;
        array[offset + 3] = height / this._dimensions.device.canvas.height;
        array[offset + 4] = r;
        array[offset + 5] = g;
        array[offset + 6] = b;
        array[offset + 7] = a;
    }
    _addRectangleFloat(array, offset, x1, y1, width, height, color) {
        array[offset] = x1 / this._dimensions.device.canvas.width;
        array[offset + 1] = y1 / this._dimensions.device.canvas.height;
        array[offset + 2] = width / this._dimensions.device.canvas.width;
        array[offset + 3] = height / this._dimensions.device.canvas.height;
        array[offset + 4] = color[0];
        array[offset + 5] = color[1];
        array[offset + 6] = color[2];
        array[offset + 7] = color[3];
    }
    _colorToFloat32Array(color) {
        return new Float32Array([
            ((color.rgba >> 24) & 0xFF) / 255,
            ((color.rgba >> 16) & 0xFF) / 255,
            ((color.rgba >> 8) & 0xFF) / 255,
            ((color.rgba) & 0xFF) / 255
        ]);
    }
}

class BaseRenderLayer extends Disposable {
    constructor(terminal, _container, id, zIndex, _alpha, _coreBrowserService, _optionsService, _themeService) {
        super();
        this._container = _container;
        this._alpha = _alpha;
        this._coreBrowserService = _coreBrowserService;
        this._optionsService = _optionsService;
        this._themeService = _themeService;
        this._deviceCharWidth = 0;
        this._deviceCharHeight = 0;
        this._deviceCellWidth = 0;
        this._deviceCellHeight = 0;
        this._deviceCharLeft = 0;
        this._deviceCharTop = 0;
        this._canvas = this._coreBrowserService.mainDocument.createElement('canvas');
        this._canvas.classList.add(`xterm-${id}-layer`);
        this._canvas.style.zIndex = zIndex.toString();
        this._initCanvas();
        this._container.appendChild(this._canvas);
        this.register(this._themeService.onChangeColors(e => {
            this._refreshCharAtlas(terminal, e);
            this.reset(terminal);
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
    handleBlur(terminal) { }
    handleFocus(terminal) { }
    handleCursorMove(terminal) { }
    handleGridChanged(terminal, startRow, endRow) { }
    handleSelectionChanged(terminal, start, end, columnSelectMode = false) { }
    _setTransparency(terminal, alpha) {
        if (alpha === this._alpha) {
            return;
        }
        const oldCanvas = this._canvas;
        this._alpha = alpha;
        this._canvas = this._canvas.cloneNode();
        this._initCanvas();
        this._container.replaceChild(this._canvas, oldCanvas);
        this._refreshCharAtlas(terminal, this._themeService.colors);
        this.handleGridChanged(terminal, 0, terminal.rows - 1);
    }
    _refreshCharAtlas(terminal, colorSet) {
        if (this._deviceCharWidth <= 0 && this._deviceCharHeight <= 0) {
            return;
        }
        this._charAtlas = acquireTextureAtlas(terminal, this._optionsService.rawOptions, colorSet, this._deviceCellWidth, this._deviceCellHeight, this._deviceCharWidth, this._deviceCharHeight, this._coreBrowserService.dpr);
        this._charAtlas.warmUp();
    }
    resize(terminal, dim) {
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
        this._refreshCharAtlas(terminal, this._themeService.colors);
    }
    _fillBottomLineAtCells(x, y, width = 1) {
        this._ctx.fillRect(x * this._deviceCellWidth, (y + 1) * this._deviceCellHeight - this._coreBrowserService.dpr - 1, width * this._deviceCellWidth, this._coreBrowserService.dpr);
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
    _fillCharTrueColor(terminal, cell, x, y) {
        this._ctx.font = this._getFont(terminal, false, false);
        this._ctx.textBaseline = TEXT_BASELINE;
        this._clipCell(x, y, cell.getWidth());
        this._ctx.fillText(cell.getChars(), x * this._deviceCellWidth + this._deviceCharLeft, y * this._deviceCellHeight + this._deviceCharTop + this._deviceCharHeight);
    }
    _clipCell(x, y, width) {
        this._ctx.beginPath();
        this._ctx.rect(x * this._deviceCellWidth, y * this._deviceCellHeight, width * this._deviceCellWidth, this._deviceCellHeight);
        this._ctx.clip();
    }
    _getFont(terminal, isBold, isItalic) {
        const fontWeight = isBold ? terminal.options.fontWeightBold : terminal.options.fontWeight;
        const fontStyle = isItalic ? 'italic' : '';
        return `${fontStyle} ${fontWeight} ${terminal.options.fontSize * this._coreBrowserService.dpr}px ${terminal.options.fontFamily}`;
    }
}

class LinkRenderLayer extends BaseRenderLayer {
    constructor(container, zIndex, terminal, linkifier2, coreBrowserService, optionsService, themeService) {
        super(terminal, container, 'link', zIndex, true, coreBrowserService, optionsService, themeService);
        this.register(linkifier2.onShowLinkUnderline(e => this._handleShowLinkUnderline(e)));
        this.register(linkifier2.onHideLinkUnderline(e => this._handleHideLinkUnderline(e)));
    }
    resize(terminal, dim) {
        super.resize(terminal, dim);
        this._state = undefined;
    }
    reset(terminal) {
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
        else if (e.fg !== undefined && is256Color(e.fg)) {
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

class WebglRenderer extends Disposable {
    constructor(_terminal, _characterJoinerService, _charSizeService, _coreBrowserService, _coreService, _decorationService, _optionsService, _themeService, preserveDrawingBuffer) {
        super();
        this._terminal = _terminal;
        this._characterJoinerService = _characterJoinerService;
        this._charSizeService = _charSizeService;
        this._coreBrowserService = _coreBrowserService;
        this._coreService = _coreService;
        this._decorationService = _decorationService;
        this._optionsService = _optionsService;
        this._themeService = _themeService;
        this._cursorBlinkStateManager = new MutableDisposable();
        this._charAtlasDisposable = this.register(new MutableDisposable());
        this._model = new RenderModel();
        this._workCell = new CellData();
        this._rectangleRenderer = this.register(new MutableDisposable());
        this._glyphRenderer = this.register(new MutableDisposable());
        this._onChangeTextureAtlas = this.register(new EventEmitter());
        this.onChangeTextureAtlas = this._onChangeTextureAtlas.event;
        this._onAddTextureAtlasCanvas = this.register(new EventEmitter());
        this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
        this._onRemoveTextureAtlasCanvas = this.register(new EventEmitter());
        this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event;
        this._onRequestRedraw = this.register(new EventEmitter());
        this.onRequestRedraw = this._onRequestRedraw.event;
        this._onContextLoss = this.register(new EventEmitter());
        this.onContextLoss = this._onContextLoss.event;
        this.register(this._themeService.onChangeColors(() => this._handleColorChange()));
        this._cellColorResolver = new CellColorResolver(this._terminal, this._optionsService, this._model.selection, this._decorationService, this._coreBrowserService, this._themeService);
        this._core = this._terminal._core;
        this._renderLayers = [
            new LinkRenderLayer(this._core.screenElement, 2, this._terminal, this._core.linkifier2, this._coreBrowserService, _optionsService, this._themeService)
        ];
        this.dimensions = createRenderDimensions();
        this._devicePixelRatio = this._coreBrowserService.dpr;
        this._updateDimensions();
        this._updateCursorBlink();
        this.register(_optionsService.onOptionChange(() => this._handleOptionsChanged()));
        this._canvas = this._coreBrowserService.mainDocument.createElement('canvas');
        const contextAttributes = {
            antialias: false,
            depth: false,
            preserveDrawingBuffer
        };
        this._gl = this._canvas.getContext('webgl2', contextAttributes);
        if (!this._gl) {
            throw new Error('WebGL2 not supported ' + this._gl);
        }
        this.register(addDisposableDomListener(this._canvas, 'webglcontextlost', (e) => {
            console.log('webglcontextlost event received');
            e.preventDefault();
            this._contextRestorationTimeout = setTimeout(() => {
                this._contextRestorationTimeout = undefined;
                console.warn('webgl context not restored; firing onContextLoss');
                this._onContextLoss.fire(e);
            }, 3000);
        }));
        this.register(addDisposableDomListener(this._canvas, 'webglcontextrestored', (e) => {
            console.warn('webglcontextrestored event received');
            clearTimeout(this._contextRestorationTimeout);
            this._contextRestorationTimeout = undefined;
            removeTerminalFromCache(this._terminal);
            this._initializeWebGLState();
            this._requestRedrawViewport();
        }));
        this.register(observeDevicePixelDimensions(this._canvas, this._coreBrowserService.window, (w, h) => this._setCanvasDevicePixelDimensions(w, h)));
        this._core.screenElement.appendChild(this._canvas);
        [this._rectangleRenderer.value, this._glyphRenderer.value] = this._initializeWebGLState();
        this._isAttached = this._coreBrowserService.window.document.body.contains(this._core.screenElement);
        this.register(toDisposable(() => {
            for (const l of this._renderLayers) {
                l.dispose();
            }
            this._canvas.parentElement?.removeChild(this._canvas);
            removeTerminalFromCache(this._terminal);
        }));
    }
    get textureAtlas() {
        return this._charAtlas?.pages[0].canvas;
    }
    _handleColorChange() {
        this._refreshCharAtlas();
        this._clearModel(true);
    }
    handleDevicePixelRatioChange() {
        if (this._devicePixelRatio !== this._coreBrowserService.dpr) {
            this._devicePixelRatio = this._coreBrowserService.dpr;
            this.handleResize(this._terminal.cols, this._terminal.rows);
        }
    }
    handleResize(cols, rows) {
        this._updateDimensions();
        this._model.resize(this._terminal.cols, this._terminal.rows);
        for (const l of this._renderLayers) {
            l.resize(this._terminal, this.dimensions);
        }
        this._canvas.width = this.dimensions.device.canvas.width;
        this._canvas.height = this.dimensions.device.canvas.height;
        this._canvas.style.width = `${this.dimensions.css.canvas.width}px`;
        this._canvas.style.height = `${this.dimensions.css.canvas.height}px`;
        this._core.screenElement.style.width = `${this.dimensions.css.canvas.width}px`;
        this._core.screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
        this._rectangleRenderer.value?.setDimensions(this.dimensions);
        this._rectangleRenderer.value?.handleResize();
        this._glyphRenderer.value?.setDimensions(this.dimensions);
        this._glyphRenderer.value?.handleResize();
        this._refreshCharAtlas();
        this._clearModel(false);
    }
    handleCharSizeChanged() {
        this.handleResize(this._terminal.cols, this._terminal.rows);
    }
    handleBlur() {
        for (const l of this._renderLayers) {
            l.handleBlur(this._terminal);
        }
        this._cursorBlinkStateManager.value?.pause();
        this._requestRedrawViewport();
    }
    handleFocus() {
        for (const l of this._renderLayers) {
            l.handleFocus(this._terminal);
        }
        this._cursorBlinkStateManager.value?.resume();
        this._requestRedrawViewport();
    }
    handleSelectionChanged(start, end, columnSelectMode) {
        for (const l of this._renderLayers) {
            l.handleSelectionChanged(this._terminal, start, end, columnSelectMode);
        }
        this._model.selection.update(this._core, start, end, columnSelectMode);
        this._requestRedrawViewport();
    }
    handleCursorMove() {
        for (const l of this._renderLayers) {
            l.handleCursorMove(this._terminal);
        }
        this._cursorBlinkStateManager.value?.restartBlinkAnimation();
    }
    _handleOptionsChanged() {
        this._updateDimensions();
        this._refreshCharAtlas();
        this._updateCursorBlink();
    }
    _initializeWebGLState() {
        this._rectangleRenderer.value = new RectangleRenderer(this._terminal, this._gl, this.dimensions, this._themeService);
        this._glyphRenderer.value = new GlyphRenderer(this._terminal, this._gl, this.dimensions);
        this.handleCharSizeChanged();
        return [this._rectangleRenderer.value, this._glyphRenderer.value];
    }
    _refreshCharAtlas() {
        if (this.dimensions.device.char.width <= 0 && this.dimensions.device.char.height <= 0) {
            this._isAttached = false;
            return;
        }
        const atlas = acquireTextureAtlas(this._terminal, this._optionsService.rawOptions, this._themeService.colors, this.dimensions.device.cell.width, this.dimensions.device.cell.height, this.dimensions.device.char.width, this.dimensions.device.char.height, this._coreBrowserService.dpr);
        if (this._charAtlas !== atlas) {
            this._onChangeTextureAtlas.fire(atlas.pages[0].canvas);
            this._charAtlasDisposable.value = getDisposeArrayDisposable([
                forwardEvent(atlas.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas),
                forwardEvent(atlas.onRemoveTextureAtlasCanvas, this._onRemoveTextureAtlasCanvas)
            ]);
        }
        this._charAtlas = atlas;
        this._charAtlas.warmUp();
        this._glyphRenderer.value?.setAtlas(this._charAtlas);
    }
    _clearModel(clearGlyphRenderer) {
        this._model.clear();
        if (clearGlyphRenderer) {
            this._glyphRenderer.value?.clear();
        }
    }
    clearTextureAtlas() {
        this._charAtlas?.clearTexture();
        this._clearModel(true);
        this._requestRedrawViewport();
    }
    clear() {
        this._clearModel(true);
        for (const l of this._renderLayers) {
            l.reset(this._terminal);
        }
        this._cursorBlinkStateManager.value?.restartBlinkAnimation();
        this._updateCursorBlink();
    }
    registerCharacterJoiner(handler) {
        return -1;
    }
    deregisterCharacterJoiner(joinerId) {
        return false;
    }
    renderRows(start, end) {
        if (!this._isAttached) {
            if (this._coreBrowserService.window.document.body.contains(this._core.screenElement) && this._charSizeService.width && this._charSizeService.height) {
                this._updateDimensions();
                this._refreshCharAtlas();
                this._isAttached = true;
            }
            else {
                return;
            }
        }
        for (const l of this._renderLayers) {
            l.handleGridChanged(this._terminal, start, end);
        }
        if (!this._glyphRenderer.value || !this._rectangleRenderer.value) {
            return;
        }
        if (this._glyphRenderer.value.beginFrame()) {
            this._clearModel(true);
            this._updateModel(0, this._terminal.rows - 1);
        }
        else {
            this._updateModel(start, end);
        }
        this._rectangleRenderer.value.renderBackgrounds();
        this._glyphRenderer.value.render(this._model);
        if (!this._cursorBlinkStateManager.value || this._cursorBlinkStateManager.value.isCursorVisible) {
            this._rectangleRenderer.value.renderCursor();
        }
    }
    _updateCursorBlink() {
        if (this._terminal.options.cursorBlink) {
            this._cursorBlinkStateManager.value = new CursorBlinkStateManager(() => {
                this._requestRedrawCursor();
            }, this._coreBrowserService);
        }
        else {
            this._cursorBlinkStateManager.clear();
        }
        this._requestRedrawCursor();
    }
    _updateModel(start, end) {
        const terminal = this._core;
        let cell = this._workCell;
        let lastBg;
        let y;
        let row;
        let line;
        let joinedRanges;
        let isJoined;
        let lastCharX;
        let range;
        let chars;
        let code;
        let i;
        let x;
        let j;
        start = clamp(start, terminal.rows - 1, 0);
        end = clamp(end, terminal.rows - 1, 0);
        const cursorY = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY;
        const viewportRelativeCursorY = cursorY - terminal.buffer.ydisp;
        const cursorX = Math.min(this._terminal.buffer.active.cursorX, terminal.cols - 1);
        let lastCursorX = -1;
        const isCursorVisible = this._coreService.isCursorInitialized &&
            !this._coreService.isCursorHidden &&
            (!this._cursorBlinkStateManager.value || this._cursorBlinkStateManager.value.isCursorVisible);
        this._model.cursor = undefined;
        let modelUpdated = false;
        for (y = start; y <= end; y++) {
            row = y + terminal.buffer.ydisp;
            line = terminal.buffer.lines.get(row);
            this._model.lineLengths[y] = 0;
            joinedRanges = this._characterJoinerService.getJoinedCharacters(row);
            for (x = 0; x < terminal.cols; x++) {
                lastBg = this._cellColorResolver.result.bg;
                line.loadCell(x, cell);
                if (x === 0) {
                    lastBg = this._cellColorResolver.result.bg;
                }
                isJoined = false;
                lastCharX = x;
                if (joinedRanges.length > 0 && x === joinedRanges[0][0]) {
                    isJoined = true;
                    range = joinedRanges.shift();
                    cell = new JoinedCellData(cell, line.translateToString(true, range[0], range[1]), range[1] - range[0]);
                    lastCharX = range[1] - 1;
                }
                chars = cell.getChars();
                code = cell.getCode();
                i = ((y * terminal.cols) + x) * RENDER_MODEL_INDICIES_PER_CELL;
                this._cellColorResolver.resolve(cell, x, row, this.dimensions.device.cell.width);
                if (isCursorVisible && row === cursorY) {
                    if (x === cursorX) {
                        this._model.cursor = {
                            x: cursorX,
                            y: viewportRelativeCursorY,
                            width: cell.getWidth(),
                            style: this._coreBrowserService.isFocused ?
                                (terminal.options.cursorStyle || 'block') : terminal.options.cursorInactiveStyle,
                            cursorWidth: terminal.options.cursorWidth,
                            dpr: this._devicePixelRatio
                        };
                        lastCursorX = cursorX + cell.getWidth() - 1;
                    }
                    if (x >= cursorX && x <= lastCursorX &&
                        ((this._coreBrowserService.isFocused &&
                            (terminal.options.cursorStyle || 'block') === 'block') ||
                            (this._coreBrowserService.isFocused === false &&
                                terminal.options.cursorInactiveStyle === 'block'))) {
                        this._cellColorResolver.result.fg =
                            50331648 | (this._themeService.colors.cursorAccent.rgba >> 8 & 16777215);
                        this._cellColorResolver.result.bg =
                            50331648 | (this._themeService.colors.cursor.rgba >> 8 & 16777215);
                    }
                }
                if (code !== NULL_CELL_CODE) {
                    this._model.lineLengths[y] = x + 1;
                }
                if (this._model.cells[i] === code &&
                    this._model.cells[i + RENDER_MODEL_BG_OFFSET] === this._cellColorResolver.result.bg &&
                    this._model.cells[i + RENDER_MODEL_FG_OFFSET] === this._cellColorResolver.result.fg &&
                    this._model.cells[i + RENDER_MODEL_EXT_OFFSET] === this._cellColorResolver.result.ext) {
                    continue;
                }
                modelUpdated = true;
                if (chars.length > 1) {
                    code |= COMBINED_CHAR_BIT_MASK;
                }
                this._model.cells[i] = code;
                this._model.cells[i + RENDER_MODEL_BG_OFFSET] = this._cellColorResolver.result.bg;
                this._model.cells[i + RENDER_MODEL_FG_OFFSET] = this._cellColorResolver.result.fg;
                this._model.cells[i + RENDER_MODEL_EXT_OFFSET] = this._cellColorResolver.result.ext;
                this._glyphRenderer.value.updateCell(x, y, code, this._cellColorResolver.result.bg, this._cellColorResolver.result.fg, this._cellColorResolver.result.ext, chars, lastBg);
                if (isJoined) {
                    cell = this._workCell;
                    for (x++; x < lastCharX; x++) {
                        j = ((y * terminal.cols) + x) * RENDER_MODEL_INDICIES_PER_CELL;
                        this._glyphRenderer.value.updateCell(x, y, NULL_CELL_CODE, 0, 0, 0, NULL_CELL_CHAR, 0);
                        this._model.cells[j] = NULL_CELL_CODE;
                        this._model.cells[j + RENDER_MODEL_BG_OFFSET] = this._cellColorResolver.result.bg;
                        this._model.cells[j + RENDER_MODEL_FG_OFFSET] = this._cellColorResolver.result.fg;
                        this._model.cells[j + RENDER_MODEL_EXT_OFFSET] = this._cellColorResolver.result.ext;
                    }
                }
            }
        }
        if (modelUpdated) {
            this._rectangleRenderer.value.updateBackgrounds(this._model);
        }
        this._rectangleRenderer.value.updateCursor(this._model);
    }
    _updateDimensions() {
        if (!this._charSizeService.width || !this._charSizeService.height) {
            return;
        }
        this.dimensions.device.char.width = Math.floor(this._charSizeService.width * this._devicePixelRatio);
        this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * this._devicePixelRatio);
        this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight);
        this.dimensions.device.char.top = this._optionsService.rawOptions.lineHeight === 1 ? 0 : Math.round((this.dimensions.device.cell.height - this.dimensions.device.char.height) / 2);
        this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing);
        this.dimensions.device.char.left = Math.floor(this._optionsService.rawOptions.letterSpacing / 2);
        this.dimensions.device.canvas.height = this._terminal.rows * this.dimensions.device.cell.height;
        this.dimensions.device.canvas.width = this._terminal.cols * this.dimensions.device.cell.width;
        this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / this._devicePixelRatio);
        this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / this._devicePixelRatio);
        this.dimensions.css.cell.height = this.dimensions.device.cell.height / this._devicePixelRatio;
        this.dimensions.css.cell.width = this.dimensions.device.cell.width / this._devicePixelRatio;
    }
    _setCanvasDevicePixelDimensions(width, height) {
        if (this._canvas.width === width && this._canvas.height === height) {
            return;
        }
        this._canvas.width = width;
        this._canvas.height = height;
        this._requestRedrawViewport();
    }
    _requestRedrawViewport() {
        this._onRequestRedraw.fire({ start: 0, end: this._terminal.rows - 1 });
    }
    _requestRedrawCursor() {
        const cursorY = this._terminal.buffer.active.cursorY;
        this._onRequestRedraw.fire({ start: cursorY, end: cursorY });
    }
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
function clamp(value, max, min = 0) {
    return Math.max(Math.min(value, max), min);
}

class WebglAddon extends Disposable {
    constructor(_preserveDrawingBuffer) {
        if (isSafari && getSafariVersion() < 16) {
            const contextAttributes = {
                antialias: false,
                depth: false,
                preserveDrawingBuffer: true
            };
            const gl = document.createElement('canvas').getContext('webgl2', contextAttributes);
            if (!gl) {
                throw new Error('Webgl2 is only supported on Safari 16 and above');
            }
        }
        super();
        this._preserveDrawingBuffer = _preserveDrawingBuffer;
        this._onChangeTextureAtlas = this.register(new EventEmitter());
        this.onChangeTextureAtlas = this._onChangeTextureAtlas.event;
        this._onAddTextureAtlasCanvas = this.register(new EventEmitter());
        this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
        this._onRemoveTextureAtlasCanvas = this.register(new EventEmitter());
        this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event;
        this._onContextLoss = this.register(new EventEmitter());
        this.onContextLoss = this._onContextLoss.event;
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
        const unsafeCore = core;
        const renderService = unsafeCore._renderService;
        const characterJoinerService = unsafeCore._characterJoinerService;
        const charSizeService = unsafeCore._charSizeService;
        const coreBrowserService = unsafeCore._coreBrowserService;
        const decorationService = unsafeCore._decorationService;
        const logService = unsafeCore._logService;
        const themeService = unsafeCore._themeService;
        setTraceLogger(logService);
        this._renderer = this.register(new WebglRenderer(terminal, characterJoinerService, charSizeService, coreBrowserService, coreService, decorationService, optionsService, themeService, this._preserveDrawingBuffer));
        this.register(forwardEvent(this._renderer.onContextLoss, this._onContextLoss));
        this.register(forwardEvent(this._renderer.onChangeTextureAtlas, this._onChangeTextureAtlas));
        this.register(forwardEvent(this._renderer.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas));
        this.register(forwardEvent(this._renderer.onRemoveTextureAtlasCanvas, this._onRemoveTextureAtlasCanvas));
        renderService.setRenderer(this._renderer);
        this.register(toDisposable(() => {
            const renderService = this._terminal._core._renderService;
            renderService.setRenderer(this._terminal._core._createRenderer());
            renderService.handleResize(terminal.cols, terminal.rows);
        }));
    }
    get textureAtlas() {
        return this._renderer?.textureAtlas;
    }
    clearTextureAtlas() {
        this._renderer?.clearTextureAtlas();
    }
}

export { WebglAddon };
//# sourceMappingURL=WebglAddon.js.map
