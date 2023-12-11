/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { perfContext, before, ThroughputRuntimeCase } from 'xterm-benchmark';
import { spawn } from 'node-pty';
import { Utf8ToUtf32, stringFromCodePoint } from 'common/input/TextDecoder';
import { Terminal } from 'browser/Terminal';
import { UnicodeGraphemeProvider } from 'UnicodeGraphemeProvider';
function fakedAddonLoad(terminal) {
    // resembles what UnicodeGraphemesAddon.activate does under the hood
    terminal.unicodeService.register(new UnicodeGraphemeProvider());
    terminal.unicodeService.activeVersion = '15-graphemes';
}
perfContext('Terminal: ls -lR /usr/lib', () => {
    let content = '';
    let contentUtf8;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        // grab output from "ls -lR /usr"
        const p = spawn('ls', ['--color=auto', '-lR', '/usr/lib'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 25,
            cwd: process.env.HOME,
            env: process.env,
            encoding: null // needs to be fixed in node-pty
        });
        const chunks = [];
        let length = 0;
        p.onData(data => {
            chunks.push(data);
            length += data.length;
        });
        yield new Promise(resolve => p.onExit(() => resolve()));
        contentUtf8 = Buffer.concat(chunks, length);
        // translate to content string
        const buffer = new Uint32Array(contentUtf8.length);
        const decoder = new Utf8ToUtf32();
        const codepoints = decoder.decode(contentUtf8, buffer);
        for (let i = 0; i < codepoints; ++i) {
            content += stringFromCodePoint(buffer[i]);
            // peek into content to force flat repr in v8
            if (!(i % 10000000)) {
                content[i];
            }
        }
    }));
    perfContext('write/string/async', () => {
        let terminal;
        before(() => {
            terminal = new Terminal({ cols: 80, rows: 25, scrollback: 1000 });
            fakedAddonLoad(terminal);
        });
        new ThroughputRuntimeCase('', () => __awaiter(void 0, void 0, void 0, function* () {
            yield new Promise(res => terminal.write(content, res));
            return { payloadSize: contentUtf8.length };
        }), { fork: false }).showAverageThroughput();
    });
    perfContext('write/Utf8/async', () => {
        let terminal;
        before(() => {
            terminal = new Terminal({ cols: 80, rows: 25, scrollback: 1000 });
        });
        new ThroughputRuntimeCase('', () => __awaiter(void 0, void 0, void 0, function* () {
            yield new Promise(res => terminal.write(content, res));
            return { payloadSize: contentUtf8.length };
        }), { fork: false }).showAverageThroughput();
    });
});
