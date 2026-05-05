class EncryptionService {
    constructor() {
        this.masterKey = null;
        this.ready = new Promise(r => this._resolveReady = r);
        this.initialize();
    }
    async initialize() {
        try {
            if (!window.crypto || !window.crypto.subtle) throw new Error('Web Crypto API not supported');
            await this.loadOrGenerateMasterKey();
            this._resolveReady();
        } catch(e) { console.error('Encryption init failed', e); }
    }
    async loadOrGenerateMasterKey() {
        const stored = localStorage.getItem('vibe_master_key');
        if (stored) this.masterKey = await crypto.subtle.importKey('raw', this.base64ToArrayBuffer(stored), { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        else {
            this.masterKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
            const exported = await crypto.subtle.exportKey('raw', this.masterKey);
            localStorage.setItem('vibe_master_key', this.arrayBufferToBase64(exported));
        }
    }
    async encrypt(data) {
        await this.ready;
        const enc = new TextEncoder().encode(JSON.stringify(data));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.masterKey, enc);
        return { iv: this.arrayBufferToBase64(iv), data: this.arrayBufferToBase64(cipher), timestamp: Date.now() };
    }
    async decrypt(payload) {
        await this.ready;
        const iv = this.base64ToArrayBuffer(payload.iv);
        const data = this.base64ToArrayBuffer(payload.data);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.masterKey, data);
        return JSON.parse(new TextDecoder().decode(decrypted));
    }
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let bin = '';
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
    }
    base64ToArrayBuffer(base64) {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
    }
}
window.EncryptionService = EncryptionService;