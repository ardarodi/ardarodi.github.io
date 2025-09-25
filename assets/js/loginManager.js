// Login Page Manager - Sadece login sayfası işlemleri
// Modular ve clean implementation

import {
    authManager,
    navigationManager,
    notificationManager,
    Validator,
    ErrorTranslator
} from './supbaseManager.js';

export class LoginManager {
    constructor() {
        this.isProcessing = false;
        this.loginAttempts = this.getLoginAttempts();
        this.maxAttempts = 3;
        this.lockoutDuration = 5 * 60 * 1000; // 5 minutes
        this.isRedirecting = false;

        this.init();
    }

    async init() {
        console.log('🔐 Login Page Manager initializing...');

        // Wait for auth manager to be ready
        if (!authManager.isInitialized) {
            await new Promise(resolve => {
                const checkInit = () => {
                    if (authManager.isInitialized) {
                        resolve();
                    } else {
                        setTimeout(checkInit, 100);
                    }
                };
                checkInit();
            });
        }

        this.setupEventListeners();
        this.setupAuthStateListener();
        this.checkExistingSession();

        console.log('✅ Login Page Manager ready');
    }

    setupEventListeners() {
        // Form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Real-time validation
        this.setupRealTimeValidation();

        // Password visibility toggle
        this.setupPasswordToggle();

        // Forgot password
        this.setupForgotPassword();

        // Social login
        this.setupSocialLogin();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupRealTimeValidation() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail());
            emailInput.addEventListener('input', () => this.clearEmailError());
        }

        if (passwordInput) {
            passwordInput.addEventListener('blur', () => this.validatePassword());
            passwordInput.addEventListener('input', () => this.clearPasswordError());
        }
    }

    setupPasswordToggle() {
        const toggleButton = document.getElementById('toggle-password');
        if (toggleButton) {
            toggleButton.addEventListener('click', this.togglePasswordVisibility.bind(this));
        }
    }

    setupForgotPassword() {
        const forgotButton = document.getElementById('forgot-password');
        if (forgotButton) {
            forgotButton.addEventListener('click', this.handleForgotPassword.bind(this));
        }
    }

    setupSocialLogin() {
        const googleButton = document.getElementById('google-login');
        if (googleButton) {
            googleButton.addEventListener('click', this.handleGoogleLogin.bind(this));
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && ['email', 'password'].includes(e.target.id)) {
                if (!this.isProcessing) {
                    const form = document.getElementById('loginForm');
                    form?.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    setupAuthStateListener() {
        authManager.onAuthStateChange((event, user) => {
            if (this.isRedirecting) return;

            if (event === 'SIGNED_IN' && user) {
                this.handleSuccessfulAuth(user);
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();

        if (this.isProcessing) {
            console.log('⚠️ Login already in progress');
            return;
        }

        if (this.isLockedOut()) {
            this.showLockoutMessage();
            return;
        }

        const formData = this.getFormData();

        if (!this.validateForm(formData)) {
            return;
        }

        this.isProcessing = true;
        this.setLoadingState(true);

        try {
            console.log('🔐 Attempting login for:', formData.email);

            const result = await authManager.signIn(formData.email, formData.password);

            if (result.success) {
                console.log('✅ Login successful');
                this.resetLoginAttempts();
                notificationManager.success('Giriş başarılı! Yönlendiriliyor...');
                await this.redirectToDashboard();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.setLoadingState(false);
            this.isProcessing = false;
        }
    }

    getFormData() {
        return {
            email: document.getElementById('email')?.value.trim() || '',
            password: document.getElementById('password')?.value || ''
        };
    }

    validateForm({ email, password }) {
        let isValid = true;

        // Email validation
        if (!Validator.required(email)) {
            this.showEmailError('Email adresi gerekli');
            isValid = false;
        } else if (!Validator.email(email)) {
            this.showEmailError('Geçerli bir email adresi girin');
            isValid = false;
        } else {
            this.clearEmailError();
        }

        // Password validation
        if (!Validator.required(password)) {
            this.showPasswordError('Şifre gerekli');
            isValid = false;
        } else if (!Validator.password(password)) {
            this.showPasswordError('Şifre en az 6 karakter olmalı');
            isValid = false;
        } else {
            this.clearPasswordError();
        }

        return isValid;
    }

    validateEmail() {
        const email = document.getElementById('email')?.value.trim();
        if (email && !Validator.email(email)) {
            this.showEmailError('Geçerli bir email adresi girin');
            return false;
        }
        this.clearEmailError();
        return true;
    }

    validatePassword() {
        const password = document.getElementById('password')?.value;
        if (password && !Validator.password(password)) {
            this.showPasswordError('Şifre en az 6 karakter olmalı');
            return false;
        }
        this.clearPasswordError();
        return true;
    }

    showEmailError(message) {
        this.showFieldError('email', message);
    }

    clearEmailError() {
        this.clearFieldError('email');
    }

    showPasswordError(message) {
        this.showFieldError('password', message);
    }

    clearPasswordError() {
        this.clearFieldError('password');
    }

    showFieldError(fieldId, message) {
        const errorDiv = document.getElementById(`${fieldId}-error`);
        const input = document.getElementById(fieldId);

        if (errorDiv && input) {
            errorDiv.querySelector('span').textContent = message;
            errorDiv.classList.remove('hidden');
            input.classList.add('border-red-300', 'ring-red-300');
        }
    }

    clearFieldError(fieldId) {
        const errorDiv = document.getElementById(`${fieldId}-error`);
        const input = document.getElementById(fieldId);

        if (errorDiv && input) {
            errorDiv.classList.add('hidden');
            input.classList.remove('border-red-300', 'ring-red-300');
        }
    }

    handleLoginError(error) {
        this.incrementLoginAttempts();
        console.error('❌ Login error:', error);

        const errorMessage = ErrorTranslator.translate(error.message);
        notificationManager.error(errorMessage);

        // Clear password and focus
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }

        this.updateAttemptsDisplay();

        if (this.loginAttempts >= this.maxAttempts) {
            this.lockoutUser();
        }
    }

    setLoadingState(isLoading) {
        const submitButton = document.getElementById('login-submit');
        const loginText = document.getElementById('login-text');

        if (!submitButton || !loginText) return;

        if (isLoading) {
            submitButton.disabled = true;
            loginText.innerHTML = `
                <div class="flex items-center justify-center space-x-2">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Giriş yapılıyor...</span>
                </div>
            `;
        } else {
            submitButton.disabled = false;
            loginText.textContent = 'Giriş Yap';
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const eyeOpen = document.getElementById('eye-open');
        const eyeClosed = document.getElementById('eye-closed');

        if (passwordInput && eyeOpen && eyeClosed) {
            const isPassword = passwordInput.type === 'password';

            passwordInput.type = isPassword ? 'text' : 'password';
            eyeOpen.classList.toggle('hidden', isPassword);
            eyeClosed.classList.toggle('hidden', !isPassword);
        }
    }

    async handleForgotPassword() {
        const email = document.getElementById('email')?.value.trim();

        if (!email) {
            notificationManager.error('Şifre sıfırlama için email adresinizi girin');
            document.getElementById('email')?.focus();
            return;
        }

        if (!Validator.email(email)) {
            notificationManager.error('Geçerli bir email adresi girin');
            document.getElementById('email')?.focus();
            return;
        }

        try {
            const result = await authManager.resetPassword(email);

            if (result.success) {
                notificationManager.success(`Şifre sıfırlama linki ${email} adresine gönderildi`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            notificationManager.error('Şifre sıfırlama linki gönderilemedi');
        }
    }

    handleGoogleLogin() {
        notificationManager.info('Google ile giriş özelliği yakında aktif olacak');
    }

    // Rate limiting methods
    getLoginAttempts() {
        try {
            const data = localStorage.getItem('login_attempts');
            if (data) {
                const { attempts, timestamp } = JSON.parse(data);
                if (Date.now() - timestamp > this.lockoutDuration) {
                    localStorage.removeItem('login_attempts');
                    return 0;
                }
                return attempts || 0;
            }
            return 0;
        } catch {
            return 0;
        }
    }

    incrementLoginAttempts() {
        this.loginAttempts++;
        localStorage.setItem('login_attempts', JSON.stringify({
            attempts: this.loginAttempts,
            timestamp: Date.now()
        }));
    }

    resetLoginAttempts() {
        this.loginAttempts = 0;
        localStorage.removeItem('login_attempts');
        this.hideAttemptsDisplay();
        this.hideRateLimitWarning();
    }

    isLockedOut() {
        return this.loginAttempts >= this.maxAttempts;
    }

    lockoutUser() {
        this.showRateLimitWarning();
        this.disableForm();

        setTimeout(() => {
            this.resetLoginAttempts();
            this.enableForm();
        }, this.lockoutDuration);
    }

    showLockoutMessage() {
        const remaining = this.getRemainingLockoutTime();
        notificationManager.error(`Hesap kilitli. ${Math.ceil(remaining / 60000)} dakika sonra tekrar deneyin`);
    }

    getRemainingLockoutTime() {
        try {
            const data = localStorage.getItem('login_attempts');
            if (data) {
                const { timestamp } = JSON.parse(data);
                return Math.max(0, this.lockoutDuration - (Date.now() - timestamp));
            }
        } catch {}
        return 0;
    }

    showRateLimitWarning() {
        const warning = document.getElementById('rate-limit-warning');
        const message = document.getElementById('rate-limit-message');
        if (warning && message) {
            message.textContent = `Hesap ${Math.ceil(this.lockoutDuration / 60000)} dakika kilitlendi`;
            warning.classList.remove('hidden');
        }
    }

    hideRateLimitWarning() {
        const warning = document.getElementById('rate-limit-warning');
        if (warning) {
            warning.classList.add('hidden');
        }
    }

    updateAttemptsDisplay() {
        const attemptsDiv = document.getElementById('login-attempts');
        const attemptsText = document.getElementById('attempts-text');

        if (this.loginAttempts > 0 && attemptsDiv && attemptsText) {
            attemptsText.textContent = `Başarısız deneme: ${this.loginAttempts}/${this.maxAttempts}`;
            attemptsDiv.classList.remove('hidden');
        }
    }

    hideAttemptsDisplay() {
        const attemptsDiv = document.getElementById('login-attempts');
        if (attemptsDiv) {
            attemptsDiv.classList.add('hidden');
        }
    }

    disableForm() {
        ['email', 'password', 'login-submit', 'google-login'].forEach(id => {
            document.getElementById(id)?.setAttribute('disabled', 'true');
        });
    }

    enableForm() {
        ['email', 'password', 'login-submit', 'google-login'].forEach(id => {
            document.getElementById(id)?.removeAttribute('disabled');
        });
    }

    async checkExistingSession() {
        if (authManager.isAuthenticated && navigationManager.isLoginPage()) {
            console.log('ℹ️ User already authenticated, redirecting...');
            await this.redirectToDashboard();
        }
    }

    handleSuccessfulAuth(user) {
        if (navigationManager.isLoginPage() && !this.isRedirecting) {
            this.redirectToDashboard();
        }
    }

    async redirectToDashboard() {
        if (this.isRedirecting) return;

        this.isRedirecting = true;
        console.log('🚀 Redirecting to dashboard...');

        // Show loading overlay
        const authLoading = document.getElementById('auth-loading');
        if (authLoading) {
            authLoading.classList.remove('hidden');
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
        navigationManager.redirectToDashboard();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.loginPageManager = new LoginManager();
    });
} else {
    window.loginPageManager = new LoginManager();
}

console.log('🔐 Login Page Manager loaded');