class EncryptionService {
    constructor() {
        this.encryptionKey = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            this.encryptionKey = await this.generateKey();
            this.initialized = true;
            console.log('✅ Encryption service initialized');
        } catch (error) {
            throw new Error(`Encryption service initialization failed: ${error.message}`);
        }
    }

    async generateKey() {
        return await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
        );
    }

    async encrypt(data) {
        if (!this.initialized) throw new Error('Encryption service not initialized');
        
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv }, this.encryptionKey, dataBuffer
        );

        const encryptedArray = new Uint8Array(encryptedBuffer);
        const result = new Uint8Array(iv.length + encryptedArray.length);
        result.set(iv);
        result.set(encryptedArray, iv.length);

        return btoa(String.fromCharCode(...result));
    }

    async decrypt(encryptedData) {
        if (!this.initialized) throw new Error('Encryption service not initialized');
        
        const encryptedArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        const iv = encryptedArray.slice(0, 12);
        const data = encryptedArray.slice(12);
        
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv }, this.encryptionKey, data
        );

        return new TextDecoder().decode(decryptedBuffer);
    }

    async exportKey() {
        return await window.crypto.subtle.exportKey('raw', this.encryptionKey);
    }

    async importKey(keyData) {
        return await window.crypto.subtle.importKey(
            'raw', keyData, 'AES-GCM', true, ['encrypt', 'decrypt']
        );
    }

    isInitialized() {
        return this.initialized;
    }
}

export default EncryptionService;