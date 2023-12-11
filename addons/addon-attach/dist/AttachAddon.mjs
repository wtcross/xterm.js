class AttachAddon {
    constructor(socket, options) {
        this._disposables = [];
        this._socket = socket;
        this._socket.binaryType = 'arraybuffer';
        this._bidirectional = !(options && options.bidirectional === false);
    }
    activate(terminal) {
        this._disposables.push(addSocketListener(this._socket, 'message', ev => {
            const data = ev.data;
            terminal.write(typeof data === 'string' ? data : new Uint8Array(data));
        }));
        if (this._bidirectional) {
            this._disposables.push(terminal.onData(data => this._sendData(data)));
            this._disposables.push(terminal.onBinary(data => this._sendBinary(data)));
        }
        this._disposables.push(addSocketListener(this._socket, 'close', () => this.dispose()));
        this._disposables.push(addSocketListener(this._socket, 'error', () => this.dispose()));
    }
    dispose() {
        for (const d of this._disposables) {
            d.dispose();
        }
    }
    _sendData(data) {
        if (!this._checkOpenSocket()) {
            return;
        }
        this._socket.send(data);
    }
    _sendBinary(data) {
        if (!this._checkOpenSocket()) {
            return;
        }
        const buffer = new Uint8Array(data.length);
        for (let i = 0; i < data.length; ++i) {
            buffer[i] = data.charCodeAt(i) & 255;
        }
        this._socket.send(buffer);
    }
    _checkOpenSocket() {
        switch (this._socket.readyState) {
            case WebSocket.OPEN:
                return true;
            case WebSocket.CONNECTING:
                throw new Error('Attach addon was loaded before socket was open');
            case WebSocket.CLOSING:
                console.warn('Attach addon socket is closing');
                return false;
            case WebSocket.CLOSED:
                throw new Error('Attach addon socket is closed');
            default:
                throw new Error('Unexpected socket state');
        }
    }
}
function addSocketListener(socket, type, handler) {
    socket.addEventListener(type, handler);
    return {
        dispose: () => {
            if (!handler) {
                return;
            }
            socket.removeEventListener(type, handler);
        }
    };
}

export { AttachAddon };
//# sourceMappingURL=AttachAddon.mjs.map
