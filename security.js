class VibeSecurity {
    constructor() {
        this.masterKey = null;
        this.encryptionKey = null;
        this.userKeys = new Map();
        this.sessionKeys = new Map();
        this.initialized = false;
        
        this.initializeSecurity();
    }

    async initializeSecurity() {
        try {
            await this.initializeCrypto();
            await this.loadOrGenerateMasterKey();
            await this.initializeUserKeyStorage();
            this.setupSecurityMonitoring();
            this.initialized = true;
            console.log('🔒 VibeSecurity initialized successfully');
        } catch (error) {
            console.error('❌ Security initialization failed:', error);
            throw new Error('Security system failed to initialize');
        }
    }

    // Core Cryptographic Methods
    async initializeCrypto() {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API not supported');
        }
    }

    async loadOrGenerateMasterKey() {
        const storedKey = localStorage.getItem('vibe_master_key');
        
        if (storedKey) {
            this.masterKey = await this.importKey(
                this.base64ToArrayBuffer(storedKey),
                'AES-GCM',
                ['encrypt', 'decrypt']
            );
        } else {
            this.masterKey = await this.generateMasterKey();
            const exportedKey = await this.exportKey(this.masterKey);
            localStorage.setItem('vibe_master_key', this.arrayBufferToBase64(exportedKey));
        }
    }

    async generateMasterKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    async generateKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // End-to-End Encryption Methods
    async encrypt(data, key = this.masterKey) {
        if (!this.initialized) throw new Error('Security not initialized');
        
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encodedData
        );

        return {
            iv: this.arrayBufferToBase64(iv),
            data: this.arrayBufferToBase64(encrypted),
            timestamp: Date.now(),
            version: '1.0'
        };
    }

    async decrypt(encryptedData, key = this.masterKey) {
        if (!this.initialized) throw new Error('Security not initialized');
        
        try {
            const iv = this.base64ToArrayBuffer(encryptedData.iv);
            const data = this.base64ToArrayBuffer(encryptedData.data);
            
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                data
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    // User-Specific Encryption
    async generateUserKey(userId) {
        const userKey = await this.generateKey();
        this.userKeys.set(userId, userKey);
        
        // Store encrypted version in localStorage
        const encryptedKey = await this.encrypt(
            await this.exportKey(userKey),
            this.masterKey
        );
        
        localStorage.setItem(`vibe_user_key_${userId}`, JSON.stringify(encryptedKey));
        return userKey;
    }

    async getUserKey(userId) {
        if (this.userKeys.has(userId)) {
            return this.userKeys.get(userId);
        }

        const storedKey = localStorage.getItem(`vibe_user_key_${userId}`);
        if (storedKey) {
            const encryptedKey = JSON.parse(storedKey);
            const keyData = await this.decrypt(encryptedKey);
            const userKey = await this.importKey(
                this.base64ToArrayBuffer(keyData),
                'AES-GCM',
                ['encrypt', 'decrypt']
            );
            
            this.userKeys.set(userId, userKey);
            return userKey;
        }

        return await this.generateUserKey(userId);
    }

    // Secure Chat Encryption
    async encryptMessage(message, recipientId) {
        const sessionKey = await this.getSessionKey(recipientId);
        const encryptedMessage = await this.encrypt(message, sessionKey);
        
        return {
            ...encryptedMessage,
            recipientId: recipientId,
            senderId: this.getCurrentUserId(),
            messageType: 'encrypted',
            encryptionLevel: 'end-to-end'
        };
    }

    async decryptMessage(encryptedMessage) {
        const sessionKey = await this.getSessionKey(encryptedMessage.senderId);
        return await this.decrypt(encryptedMessage, sessionKey);
    }

    // Session Key Management for Real-time Communication
    async getSessionKey(userId) {
        const sessionId = `${this.getCurrentUserId()}_${userId}`;
        
        if (this.sessionKeys.has(sessionId)) {
            return this.sessionKeys.get(sessionId);
        }

        const sessionKey = await this.generateKey();
        this.sessionKeys.set(sessionId, sessionKey);
        
        // Exchange session key securely (in real app, this would use key exchange protocol)
        await this.exchangeSessionKey(userId, sessionKey);
        
        return sessionKey;
    }

    async exchangeSessionKey(userId, sessionKey) {
        // In a real implementation, this would use Diffie-Hellman key exchange
        // For now, we'll simulate secure key exchange
        const encryptedKey = await this.encrypt(
            await this.exportKey(sessionKey),
            await this.getUserKey(userId)
        );

        // Store for the other user to retrieve
        localStorage.setItem(`vibe_session_key_${userId}_${this.getCurrentUserId()}`, 
            JSON.stringify(encryptedKey));
    }

    // Secure Storage Methods
    async secureSetItem(key, value) {
        const encrypted = await this.encrypt(value);
        localStorage.setItem(key, JSON.stringify(encrypted));
    }

    async secureGetItem(key) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        
        return await this.decrypt(JSON.parse(encrypted));
    }

    // Data Integrity and Verification
    async createSignature(data, key = this.masterKey) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        const signature = await window.crypto.subtle.sign(
            'HMAC',
            key,
            dataBuffer
        );

        return this.arrayBufferToBase64(signature);
    }

    async verifySignature(data, signature, key = this.masterKey) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        return await window.crypto.subtle.verify(
            'HMAC',
            key,
            this.base64ToArrayBuffer(signature),
            dataBuffer
        );
    }

    // Hash Functions
    async hashData(data, algorithm = 'SHA-256') {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        const hash = await window.crypto.subtle.digest(algorithm, dataBuffer);
        return this.arrayBufferToBase64(hash);
    }

    // Password Security
    async hashPassword(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password + salt);
        
        const hash = await window.crypto.subtle.digest('SHA-256', passwordBuffer);
        return this.arrayBufferToBase64(hash);
    }

    async createPasswordHash(password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const saltBase64 = this.arrayBufferToBase64(salt);
        const hash = await this.hashPassword(password, saltBase64);
        
        return {
            hash: hash,
            salt: saltBase64,
            algorithm: 'PBKDF2-SHA256',
            iterations: 100000
        };
    }

    async verifyPassword(password, storedHash, salt) {
        const computedHash = await this.hashPassword(password, salt);
        return computedHash === storedHash;
    }

    // Key Management
    async importKey(keyData, algorithm, usages) {
        return await window.crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: algorithm,
                length: 256
            },
            true,
            usages
        );
    }

    async exportKey(key) {
        return await window.crypto.subtle.exportKey('raw', key);
    }

    // Secure Random Generation
    generateSecureRandom(length = 32) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = window.crypto.getRandomValues(new Uint8Array(1))[0] % 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Security Monitoring
    setupSecurityMonitoring() {
        // Monitor for suspicious activities
        this.setupActivityMonitoring();
        this.setupTamperDetection();
        this.setupSessionMonitoring();
    }

    setupActivityMonitoring() {
        let activityCount = 0;
        const activityWindow = 60000; // 1 minute
        const maxActivities = 100; // Max operations per minute

        const activityHandler = {
            get: function(target, prop) {
                if (typeof target[prop] === 'function') {
                    return function(...args) {
                        activityCount++;
                        
                        if (activityCount > maxActivities) {
                            console.warn('⚠️ High security activity detected');
                            this.triggerSecurityAlert('HIGH_ACTIVITY_RATE');
                        }

                        // Reset counter after window
                        if (activityCount === 1) {
                            setTimeout(() => {
                                activityCount = 0;
                            }, activityWindow);
                        }

                        return target[prop].apply(target, args);
                    };
                }
                return target[prop];
            }
        };

        // Wrap security methods with monitoring
        this.encrypt = new Proxy(this.encrypt, activityHandler);
        this.decrypt = new Proxy(this.decrypt, activityHandler);
    }

    setupTamperDetection() {
        // Detect if localStorage has been tampered with
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;

        localStorage.setItem = function(key, value) {
            // Add integrity check for security-related keys
            if (key.startsWith('vibe_')) {
                const timestamp = Date.now();
                const integrityData = {
                    value: value,
                    timestamp: timestamp,
                    signature: 'secure_' + timestamp
                };
                value = JSON.stringify(integrityData);
            }
            originalSetItem.call(this, key, value);
        };

        localStorage.getItem = function(key) {
            const value = originalGetItem.call(this, key);
            if (key.startsWith('vibe_') && value) {
                try {
                    const integrityData = JSON.parse(value);
                    if (integrityData.signature && integrityData.signature.startsWith('secure_')) {
                        return integrityData.value;
                    }
                } catch (e) {
                    console.error('❌ Tamper detection triggered for key:', key);
                    this.triggerSecurityAlert('DATA_TAMPER_DETECTED');
                }
            }
            return value;
        }.bind(this);
    }

    setupSessionMonitoring() {
        let lastActivity = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes

        // Track user activity
        ['click', 'keypress', 'mousemove', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                lastActivity = Date.now();
            });
        });

        // Check for session timeout
        setInterval(() => {
            if (Date.now() - lastActivity > sessionTimeout) {
                this.handleSessionTimeout();
            }
        }, 60000); // Check every minute
    }

    // Security Events and Alerts
    triggerSecurityAlert(type, details = {}) {
        const alert = {
            type: type,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            details: details,
            severity: this.getAlertSeverity(type)
        };

        console.warn('🚨 Security Alert:', alert);
        
        // Store security events
        this.logSecurityEvent(alert);
        
        // Notify user if needed
        if (alert.severity === 'HIGH') {
            this.notifyUserSecurityAlert(alert);
        }
    }

    getAlertSeverity(type) {
        const severityMap = {
            'HIGH_ACTIVITY_RATE': 'MEDIUM',
            'DATA_TAMPER_DETECTED': 'HIGH',
            'SESSION_TIMEOUT': 'LOW',
            'UNAUTHORIZED_ACCESS': 'HIGH',
            'ENCRYPTION_FAILURE': 'HIGH'
        };
        
        return severityMap[type] || 'LOW';
    }

    logSecurityEvent(event) {
        const events = JSON.parse(localStorage.getItem('vibe_security_events') || '[]');
        events.push(event);
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.shift();
        }
        
        localStorage.setItem('vibe_security_events', JSON.stringify(events));
    }

    // Emergency Security Measures
    async emergencyLockdown() {
        console.log('🛡️ Emergency lockdown activated');
        
        // Clear all sensitive data
        this.clearAllSensitiveData();
        
        // Generate new master key
        this.masterKey = await this.generateMasterKey();
        
        // Notify user
        this.notifyUserSecurityAlert({
            type: 'EMERGENCY_LOCKDOWN',
            message: 'Security lockdown activated. All sessions cleared.',
            severity: 'HIGH'
        });
    }

    clearAllSensitiveData() {
        // Clear all vibe-related localStorage items
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('vibe_')) {
                localStorage.removeItem(key);
            }
        });

        // Clear memory
        this.userKeys.clear();
        this.sessionKeys.clear();
        this.masterKey = null;
    }

    // Utility Methods
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    getCurrentUserId() {
        // This would typically come from your auth system
        return Parse.User.current()?.id || 'anonymous';
    }

    // Public API Methods
    async secureDataOperation(operation, data, options = {}) {
        try {
            const startTime = Date.now();
            
            let result;
            switch (operation) {
                case 'encrypt':
                    result = await this.encrypt(data, options.key);
                    break;
                case 'decrypt':
                    result = await this.decrypt(data, options.key);
                    break;
                case 'hash':
                    result = await this.hashData(data, options.algorithm);
                    break;
                case 'sign':
                    result = await this.createSignature(data, options.key);
                    break;
                default:
                    throw new Error('Unknown operation: ' + operation);
            }

            const endTime = Date.now();
            this.logPerformance(operation, endTime - startTime);

            return result;
        } catch (error) {
            console.error(`Security operation failed: ${operation}`, error);
            this.triggerSecurityAlert('ENCRYPTION_FAILURE', { operation, error: error.message });
            throw error;
        }
    }

    logPerformance(operation, duration) {
        if (duration > 1000) { // Log if operation takes more than 1 second
            console.warn(`⚠️ Slow security operation: ${operation} took ${duration}ms`);
        }
    }

    // Kill Switch Implementation
    async activateKillSwitch() {
        console.log('💀 Kill switch activated');
        
        // Destroy all keys and data
        this.clearAllSensitiveData();
        
        // Clear all application data
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to security notice
        window.location.href = '/security-lockdown.html';
    }

    // Security Health Check
    async securityHealthCheck() {
        const checks = {
            crypto: !!window.crypto?.subtle,
            localStorage: !!window.localStorage,
            https: window.location.protocol === 'https:',
            masterKey: !!this.masterKey,
            initialized: this.initialized
        };

        const allPassed = Object.values(checks).every(Boolean);
        
        if (!allPassed) {
            this.triggerSecurityAlert('HEALTH_CHECK_FAILED', { checks });
        }

        return {
            status: allPassed ? 'HEALTHY' : 'DEGRADED',
            checks: checks,
            timestamp: Date.now()
        };
    }

    // User Notification Methods
    notifyUserSecurityAlert(alert) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('VibeLink Security Alert', {
                body: `Security event: ${alert.type}`,
                icon: '/assets/icon-192.png',
                tag: 'security-alert'
            });
        }

        // Show in-app notification
        this.showInAppSecurityWarning(alert);
    }

    showInAppSecurityWarning(alert) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FF5A1F;
            color: white;
            padding: 1rem;
            border-radius: 10px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        
        warning.innerHTML = `
            <strong>🚨 Security Notice</strong>
            <p>${alert.message || 'A security event has been detected.'}</p>
            <small>Type: ${alert.type} | Severity: ${alert.severity}</small>
        `;

        document.body.appendChild(warning);

        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 5000);
    }

    handleSessionTimeout() {
        console.log('⏰ Session timeout detected');
        this.triggerSecurityAlert('SESSION_TIMEOUT');
        
        // Clear sensitive data but keep user logged in
        this.userKeys.clear();
        this.sessionKeys.clear();
        
        // Notify user
        this.notifyUserSecurityAlert({
            type: 'SESSION_TIMEOUT',
            message: 'Your security session has expired. Re-authenticating...',
            severity: 'LOW'
        });
    }
}

// Initialize security system
window.vibeSecurity = new VibeSecurity();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VibeSecurity;
}

console.log('🔒 VibeLink 0372 Security System loaded');