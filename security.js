class VibeSecurity {
    constructor() {
        this.encryptionKey = null;
        this.ivLength = 16;
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.hashAlgorithm = 'SHA-256';
        this.keyDerivationIterations = 100000;
        this.initialized = false;
        
        this.securityConfig = {
            minPasswordLength: 12,
            requireSpecialChars: true,
            requireNumbers: true,
            requireMixedCase: true,
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000, // 15 minutes
            encryptionLevel: 'enterprise',
            auditLogging: true,
            realTimeMonitoring: true
        };

        this.auditLog = [];
        this.failedAttempts = new Map();
        this.activeSessions = new Map();
        
        this.init();
    }

    async init() {
        try {
            await this.initializeEncryption();
            this.setupSecurityMonitoring();
            this.initializeSessionManagement();
            this.setupAutoLock();
            this.initialized = true;
            console.log('🔒 VibeSecurity initialized successfully');
        } catch (error) {
            console.error('❌ Security initialization failed:', error);
            throw new Error('Security system initialization failed');
        }
    }

    async initializeEncryption() {
        try {
            // Generate or retrieve encryption key
            let keyData = localStorage.getItem('vibelink_encryption_key');
            
            if (!keyData) {
                // Generate new encryption key
                this.encryptionKey = await this.generateEncryptionKey();
                const exportedKey = await crypto.subtle.exportKey('jwk', this.encryptionKey);
                const encryptedKey = await this.encryptData(JSON.stringify(exportedKey), 'master_key');
                localStorage.setItem('vibelink_encryption_key', encryptedKey);
            } else {
                // Import existing key
                const decryptedKey = await this.decryptData(keyData, 'master_key');
                const jwk = JSON.parse(decryptedKey);
                this.encryptionKey = await crypto.subtle.importKey(
                    'jwk',
                    jwk,
                    { name: this.algorithm, length: this.keyLength },
                    true,
                    ['encrypt', 'decrypt']
                );
            }

            // Initialize additional security keys
            await this.initializeDerivedKeys();
            
        } catch (error) {
            console.error('Encryption initialization error:', error);
            throw error;
        }
    }

    async generateEncryptionKey() {
        return await crypto.subtle.generateKey(
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    async initializeDerivedKeys() {
        // Generate keys for different security levels
        this.derivedKeys = {
            session: await this.deriveKey('session_encryption_key'),
            messaging: await this.deriveKey('messaging_encryption_key'),
            wallet: await this.deriveKey('wallet_encryption_key'),
            biometric: await this.deriveKey('biometric_encryption_key')
        };
    }

    async deriveKey(purpose) {
        const salt = await this.generateSalt();
        const baseKey = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(purpose + this.getDeviceFingerprint()),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.keyDerivationIterations,
                hash: this.hashAlgorithm
            },
            baseKey,
            { name: this.algorithm, length: this.keyLength },
            true,
            ['encrypt', 'decrypt']
        );
    }

    async generateSalt() {
        return crypto.getRandomValues(new Uint8Array(16));
    }

    getDeviceFingerprint() {
        const fingerprintData = [
            navigator.userAgent,
            navigator.language,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            !!navigator.cookieEnabled,
            !!navigator.javaEnabled(),
            navigator.hardwareConcurrency || 'unknown'
        ].join('|');

        return this.hashData(fingerprintData);
    }

    async hashData(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest(this.hashAlgorithm, dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // END-TO-END ENCRYPTION METHODS
    async encryptData(data, keyType = 'default') {
        if (!this.initialized) {
            throw new Error('Security system not initialized');
        }

        try {
            const key = keyType === 'default' ? this.encryptionKey : this.derivedKeys[keyType];
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);

            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    tagLength: 128
                },
                key,
                dataBuffer
            );

            // Combine IV and encrypted data
            const resultBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            resultBuffer.set(iv, 0);
            resultBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

            // Convert to base64 for storage
            return btoa(String.fromCharCode(...resultBuffer));

        } catch (error) {
            this.logSecurityEvent('ENCRYPTION_FAILED', { error: error.message });
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    async decryptData(encryptedData, keyType = 'default') {
        if (!this.initialized) {
            throw new Error('Security system not initialized');
        }

        try {
            const key = keyType === 'default' ? this.encryptionKey : this.derivedKeys[keyType];
            const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            // Extract IV from beginning of buffer
            const iv = encryptedBuffer.slice(0, this.ivLength);
            const data = encryptedBuffer.slice(this.ivLength);

            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    tagLength: 128
                },
                key,
                data
            );

            return new TextDecoder().decode(decryptedBuffer);

        } catch (error) {
            this.logSecurityEvent('DECRYPTION_FAILED', { error: error.message });
            throw new Error('Decryption failed: ' + error.message);
        }
    }

    // SECURE MESSAGING ENCRYPTION
    async encryptMessage(message, recipientPublicKey) {
        try {
            // Generate ephemeral key pair for forward secrecy
            const ephemeralKeyPair = await crypto.subtle.generateKey(
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true,
                ['deriveKey']
            );

            // Derive shared secret
            const sharedSecret = await crypto.subtle.deriveKey(
                {
                    name: 'ECDH',
                    public: recipientPublicKey
                },
                ephemeralKeyPair.privateKey,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            );

            // Encrypt message with shared secret
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                sharedSecret,
                new TextEncoder().encode(message)
            );

            // Export public key for transmission
            const publicKey = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);

            return {
                encryptedMessage: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
                ephemeralPublicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
                iv: btoa(String.fromCharCode(...iv)),
                timestamp: Date.now(),
                messageId: await this.generateMessageId()
            };

        } catch (error) {
            this.logSecurityEvent('MESSAGE_ENCRYPTION_FAILED', { error: error.message });
            throw error;
        }
    }

    async generateMessageId() {
        const randomBytes = crypto.getRandomValues(new Uint8Array(16));
        return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // PASSWORD SECURITY
    async hashPassword(password, salt = null) {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(16));
        }

        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const saltBuffer = salt;

        const key = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 310000, // OWASP recommended
                hash: this.hashAlgorithm
            },
            key,
            256
        );

        return {
            hash: btoa(String.fromCharCode(...new Uint8Array(derivedBits))),
            salt: btoa(String.fromCharCode(...saltBuffer))
        };
    }

    async verifyPassword(password, hash, salt) {
        try {
            const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
            const newHash = await this.hashPassword(password, saltBuffer);
            return newHash.hash === hash;
        } catch (error) {
            this.logSecurityEvent('PASSWORD_VERIFICATION_FAILED', { error: error.message });
            return false;
        }
    }

    validatePasswordStrength(password) {
        const requirements = {
            minLength: this.securityConfig.minPasswordLength,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        const errors = [];

        if (password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long`);
        }
        if (this.securityConfig.requireMixedCase && (!requirements.hasUpperCase || !requirements.hasLowerCase)) {
            errors.push('Password must contain both uppercase and lowercase letters');
        }
        if (this.securityConfig.requireNumbers && !requirements.hasNumbers) {
            errors.push('Password must contain at least one number');
        }
        if (this.securityConfig.requireSpecialChars && !requirements.hasSpecialChars) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            score: this.calculatePasswordScore(password),
            errors: errors,
            requirements: requirements
        };
    }

    calculatePasswordScore(password) {
        let score = 0;
        
        // Length
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;
        
        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^a-zA-Z\d]/.test(password)) score += 1;
        
        // Entropy calculation
        const charSetSize = this.getCharSetSize(password);
        const entropy = password.length * Math.log2(charSetSize);
        
        if (entropy > 64) score += 2;
        if (entropy > 96) score += 2;
        
        return Math.min(10, score);
    }

    getCharSetSize(password) {
        let size = 0;
        if (/[a-z]/.test(password)) size += 26;
        if (/[A-Z]/.test(password)) size += 26;
        if (/\d/.test(password)) size += 10;
        if (/[^a-zA-Z\d]/.test(password)) size += 32;
        return size || 1;
    }

    // SESSION MANAGEMENT
    initializeSessionManagement() {
        this.sessionInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60000); // Check every minute
    }

    async createSecureSession(userData) {
        try {
            const sessionId = this.generateSessionId();
            const sessionData = {
                userId: userData.id,
                username: userData.username,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                ipAddress: await this.getClientIP(),
                userAgent: navigator.userAgent,
                deviceFingerprint: this.getDeviceFingerprint()
            };

            const encryptedSession = await this.encryptData(JSON.stringify(sessionData), 'session');
            
            this.activeSessions.set(sessionId, {
                ...sessionData,
                encryptedToken: encryptedSession
            });

            // Store session with expiration
            const sessionStorage = {
                sessionId: sessionId,
                encryptedData: encryptedSession,
                expiresAt: Date.now() + this.securityConfig.sessionTimeout
            };

            localStorage.setItem(`vibelink_session_${sessionId}`, JSON.stringify(sessionStorage));
            this.logSecurityEvent('SESSION_CREATED', { userId: userData.id, sessionId });

            return sessionId;

        } catch (error) {
            this.logSecurityEvent('SESSION_CREATION_FAILED', { error: error.message });
            throw error;
        }
    }

    generateSessionId() {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async validateSession(sessionId) {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            
            if (!sessionData) {
                const stored = localStorage.getItem(`vibelink_session_${sessionId}`);
                if (!stored) {
                    this.logSecurityEvent('SESSION_NOT_FOUND', { sessionId });
                    return false;
                }
                
                const sessionStorage = JSON.parse(stored);
                if (Date.now() > sessionStorage.expiresAt) {
                    this.destroySession(sessionId);
                    return false;
                }
                
                const decrypted = await this.decryptData(sessionStorage.encryptedData, 'session');
                sessionData = JSON.parse(decrypted);
                this.activeSessions.set(sessionId, sessionData);
            }

            // Check session expiration
            if (Date.now() - sessionData.lastActivity > this.securityConfig.sessionTimeout) {
                this.destroySession(sessionId);
                return false;
            }

            // Verify device fingerprint
            if (sessionData.deviceFingerprint !== this.getDeviceFingerprint()) {
                this.logSecurityEvent('SESSION_DEVICE_MISMATCH', { sessionId });
                this.destroySession(sessionId);
                return false;
            }

            // Update last activity
            sessionData.lastActivity = Date.now();
            this.activeSessions.set(sessionId, sessionData);

            return sessionData;

        } catch (error) {
            this.logSecurityEvent('SESSION_VALIDATION_FAILED', { sessionId, error: error.message });
            this.destroySession(sessionId);
            return false;
        }
    }

    destroySession(sessionId) {
        this.activeSessions.delete(sessionId);
        localStorage.removeItem(`vibelink_session_${sessionId}`);
        this.logSecurityEvent('SESSION_DESTROYED', { sessionId });
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, sessionData] of this.activeSessions.entries()) {
            if (now - sessionData.lastActivity > this.securityConfig.sessionTimeout) {
                this.destroySession(sessionId);
            }
        }
    }

    // SECURITY MONITORING & AUDITING
    setupSecurityMonitoring() {
        // Monitor for suspicious activities
        this.monitorNetworkRequests();
        this.monitorStorageAccess();
        this.monitorCryptographicOperations();
    }

    logSecurityEvent(eventType, details) {
        if (!this.securityConfig.auditLogging) return;

        const event = {
            timestamp: new Date().toISOString(),
            eventType: eventType,
            details: details,
            userAgent: navigator.userAgent,
            ipAddress: this.getClientIP() || 'unknown',
            sessionId: details.sessionId || 'unknown'
        };

        this.auditLog.push(event);

        // Keep only last 1000 events
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }

        // Real-time alerting for critical events
        if (this.isCriticalEvent(eventType)) {
            this.triggerSecurityAlert(event);
        }

        console.log(`🔒 Security Event: ${eventType}`, details);
    }

    isCriticalEvent(eventType) {
        const criticalEvents = [
            'MULTIPLE_FAILED_LOGINS',
            'SESSION_HIJACKING_ATTEMPT',
            'ENCRYPTION_FAILED',
            'UNAUTHORIZED_ACCESS'
        ];
        return criticalEvents.includes(eventType);
    }

    triggerSecurityAlert(event) {
        // In production, this would send to security monitoring system
        console.warn('🚨 SECURITY ALERT:', event);
        
        // Could integrate with:
        // - SIEM systems
        // - Email/SMS alerts
        // - Security team notifications
    }

    monitorNetworkRequests() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            
            try {
                const response = await originalFetch.apply(this, args);
                const duration = Date.now() - startTime;
                
                this.logSecurityEvent('NETWORK_REQUEST', {
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    status: response.status,
                    duration: duration
                });
                
                return response;
            } catch (error) {
                this.logSecurityEvent('NETWORK_REQUEST_FAILED', {
                    url: args[0],
                    error: error.message
                });
                throw error;
            }
        };
    }

    // BRUTE FORCE PROTECTION
    async trackLoginAttempt(identifier, success) {
        const now = Date.now();
        const attempts = this.failedAttempts.get(identifier) || [];

        if (success) {
            this.failedAttempts.delete(identifier);
            return true;
        }

        // Add failed attempt
        attempts.push(now);
        
        // Remove attempts older than lockout duration
        const recentAttempts = attempts.filter(time => 
            now - time < this.securityConfig.lockoutDuration
        );

        this.failedAttempts.set(identifier, recentAttempts);

        if (recentAttempts.length >= this.securityConfig.maxLoginAttempts) {
            this.logSecurityEvent('ACCOUNT_LOCKED', { 
                identifier, 
                attempts: recentAttempts.length 
            });
            return false;
        }

        return true;
    }

    isAccountLocked(identifier) {
        const attempts = this.failedAttempts.get(identifier) || [];
        const now = Date.now();
        const recentAttempts = attempts.filter(time => 
            now - time < this.securityConfig.lockoutDuration
        );

        return recentAttempts.length >= this.securityConfig.maxLoginAttempts;
    }

    // AUTO-LOCK FEATURE
    setupAutoLock() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.lastInactiveTime = Date.now();
            }
        });

        document.addEventListener('mousemove', this.resetAutoLockTimer.bind(this));
        document.addEventListener('keypress', this.resetAutoLockTimer.bind(this));
        document.addEventListener('click', this.resetAutoLockTimer.bind(this));

        this.autoLockInterval = setInterval(() => {
            this.checkAutoLock();
        }, 30000); // Check every 30 seconds
    }

    resetAutoLockTimer() {
        this.lastInactiveTime = Date.now();
    }

    checkAutoLock() {
        if (!this.lastInactiveTime) return;

        const inactiveTime = Date.now() - this.lastInactiveTime;
        const autoLockTime = 5 * 60 * 1000; // 5 minutes

        if (inactiveTime > autoLockTime) {
            this.lockApplication();
        }
    }

    lockApplication() {
        // Clear sensitive data
        this.encryptionKey = null;
        this.derivedKeys = null;
        this.activeSessions.clear();
        
        // Redirect to lock screen or require re-authentication
        this.logSecurityEvent('APPLICATION_AUTO_LOCKED', {});
        
        // In a real app, you'd show a lock screen
        if (window.vibeLinkApp && window.vibeLinkApp.currentUser) {
            window.vibeLinkApp.handleLogout();
        }
    }

    // UTILITY METHODS
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    generateSecureRandom(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    async generateKeyPair() {
        return await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256'
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // SECURE STORAGE UTILITIES
    secureSetItem(key, value) {
        try {
            const encryptedValue = this.encryptData(JSON.stringify(value));
            localStorage.setItem(key, encryptedValue);
            return true;
        } catch (error) {
            console.error('Secure storage error:', error);
            return false;
        }
    }

    async secureGetItem(key) {
        try {
            const encryptedValue = localStorage.getItem(key);
            if (!encryptedValue) return null;
            
            const decryptedValue = await this.decryptData(encryptedValue);
            return JSON.parse(decryptedValue);
        } catch (error) {
            console.error('Secure retrieval error:', error);
            return null;
        }
    }

    secureRemoveItem(key) {
        localStorage.removeItem(key);
    }

    // SECURITY HEALTH CHECK
    async performSecurityAudit() {
        const audit = {
            timestamp: new Date().toISOString(),
            encryption: await this.checkEncryptionHealth(),
            sessions: this.checkSessionHealth(),
            network: this.checkNetworkSecurity(),
            storage: this.checkStorageSecurity(),
            overallScore: 0
        };

        audit.overallScore = this.calculateSecurityScore(audit);
        return audit;
    }

    async checkEncryptionHealth() {
        try {
            // Test encryption/decryption cycle
            const testData = 'VibeLink Security Test ' + Date.now();
            const encrypted = await this.encryptData(testData);
            const decrypted = await this.decryptData(encrypted);
            
            return {
                status: testData === decrypted ? 'healthy' : 'compromised',
                testPassed: testData === decrypted,
                lastTest: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'failed',
                testPassed: false,
                error: error.message,
                lastTest: new Date().toISOString()
            };
        }
    }

    calculateSecurityScore(audit) {
        let score = 100;

        if (!audit.encryption.testPassed) score -= 40;
        if (audit.sessions.activeSessions > 10) score -= 10;
        if (!audit.network.https) score -= 20;
        if (!audit.storage.secureStorage) score -= 15;

        return Math.max(0, score);
    }

    // CLEANUP
    destroy() {
        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
        }
        if (this.autoLockInterval) {
            clearInterval(this.autoLockInterval);
        }
        
        // Clear all sensitive data
        this.encryptionKey = null;
        this.derivedKeys = null;
        this.activeSessions.clear();
        this.failedAttempts.clear();
        
        this.initialized = false;
    }
}

// Initialize global security instance
window.VibeSecurity = new VibeSecurity();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VibeSecurity;
}