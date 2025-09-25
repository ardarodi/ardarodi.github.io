// Core Supabase Manager - Tek merkezi yönetim sistemi
// Tüm authentication, session ve state management işlemleri

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'https://segvixpoyzbactfpweqe.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZ3ZpeHBveXpiYWN0ZnB3ZXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjMxNDksImV4cCI6MjA3NDAzOTE0OX0.B_lrrwthqkIcK5yGrJWWJzOFFSs5EHeQsi7nXaVFSGA'
};

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

/**
 * Core Authentication Manager
 * Handles all authentication operations in one place
 */
export class CoreAuthManager {
    constructor() {
        this.currentUser = null;
        this.currentSession = null;
        this.isInitialized = false;
        this.authCallbacks = new Set();

        this.init();
    }

    async init() {
        try {
            console.log('🔐 Core Auth Manager initializing...');

            // Check existing session
            const { data: { session }, error } = await supabase.auth.getSession();

            if (!error && session) {
                this.setAuthState(session, session.user);
            }

            // Setup auth listener
            this.setupAuthListener();

            this.isInitialized = true;
            console.log('✅ Core Auth Manager ready');

        } catch (error) {
            console.error('❌ Auth Manager init error:', error);
        }
    }

    setupAuthListener() {
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);

            switch (event) {
                case 'SIGNED_IN':
                    this.setAuthState(session, session?.user);
                    this.notifyCallbacks('SIGNED_IN', session?.user);
                    break;

                case 'SIGNED_OUT':
                    this.clearAuthState();
                    this.notifyCallbacks('SIGNED_OUT', null);
                    break;

                case 'TOKEN_REFRESHED':
                    this.setAuthState(session, session?.user);
                    this.notifyCallbacks('TOKEN_REFRESHED', session?.user);
                    break;
            }
        });
    }

    setAuthState(session, user) {
        this.currentSession = session;
        this.currentUser = user;

        if (session && user) {
            SessionStorage.save(session, user);
        }
    }

    clearAuthState() {
        this.currentSession = null;
        this.currentUser = null;
        SessionStorage.clear();
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                throw new AuthError(error.message);
            }

            if (!data.session || !data.user) {
                throw new AuthError('Invalid authentication response');
            }

            return {
                success: true,
                user: data.user,
                session: data.session
            };

        } catch (error) {
            console.error('❌ Sign in error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.warn('Supabase signOut warning:', error);
            }

            // Always clear local state
            this.clearAuthState();

            return { success: true };

        } catch (error) {
            console.error('❌ Sign out error:', error);

            // Force clear on error
            this.clearAuthState();

            return { success: false, error: error.message };
        }
    }

    /**
     * Reset password
     */
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

            if (error) {
                throw new AuthError(error.message);
            }

            return { success: true };

        } catch (error) {
            console.error('❌ Reset password error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback) {
        this.authCallbacks.add(callback);

        // Return unsubscribe function
        return () => {
            this.authCallbacks.delete(callback);
        };
    }

    notifyCallbacks(event, user) {
        this.authCallbacks.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('Auth callback error:', error);
            }
        });
    }

    // Getters
    get user() {
        return this.currentUser;
    }

    get session() {
        return this.currentSession;
    }

    get isAuthenticated() {
        return !!(this.currentUser && this.currentSession);
    }
}

/**
 * Session Storage Manager
 * Handles local session persistence
 */
export class SessionStorage {
    static keys = {
        SESSION: 'supabase_session',
        USER: 'supabase_user',
        LOGIN_TIME: 'login_time'
    };

    static save(session, user) {
        try {
            const sessionData = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: {
                    id: user.id,
                    email: user.email,
                    email_verified: !!user.email_confirmed_at,
                    created_at: user.created_at
                },
                loginTime: new Date().toISOString()
            };

            localStorage.setItem(this.keys.SESSION, JSON.stringify(sessionData));
            localStorage.setItem(this.keys.USER, JSON.stringify(user));
            localStorage.setItem(this.keys.LOGIN_TIME, sessionData.loginTime);

            // Set security cookie
            this.setSecurityCookie();

            console.log('✅ Session saved');

        } catch (error) {
            console.error('❌ Session save error:', error);
        }
    }

    static get() {
        try {
            const sessionData = localStorage.getItem(this.keys.SESSION);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);

            // Check expiry
            if (session.expires_at && Date.now() > session.expires_at * 1000) {
                this.clear();
                return null;
            }

            return session;

        } catch (error) {
            console.error('❌ Session read error:', error);
            this.clear();
            return null;
        }
    }

    static getUser() {
        try {
            const userData = localStorage.getItem(this.keys.USER);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ User read error:', error);
            return null;
        }
    }

    static clear() {
        try {
            // Clear Supabase data
            Object.values(this.keys).forEach(key => {
                localStorage.removeItem(key);
            });

            // Clear legacy data
            localStorage.removeItem('userSession');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('loginTime');

            // Clear cookies
            document.cookie = 'supabase_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'userLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

            console.log('🧹 Session cleared');

        } catch (error) {
            console.error('❌ Session clear error:', error);
        }
    }

    static setSecurityCookie() {
        try {
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `supabase_logged_in=true; expires=${expires}; path=/; SameSite=Strict`;
        } catch (error) {
            console.error('❌ Cookie set error:', error);
        }
    }
}

/**
 * Navigation Manager
 * Handles page routing and redirects
 */
export class NavigationManager {
    constructor() {
        this.currentPath = window.location.pathname;
        this.isInPagesFolder = this.currentPath.includes('/pages/');
    }

    isLoginPage() {
        return this.currentPath.includes('login.html');
    }

    isDashboardPage() {
        return this.currentPath.includes('dashboard.html');
    }

    navigateTo(page) {
        const routes = {
            login: this.isInPagesFolder ? './login.html' : './pages/login.html',
            dashboard: this.isInPagesFolder ? './dashboard.html' : './pages/dashboard.html',
            home: this.isInPagesFolder ? '../index.html' : './index.html'
        };

        const url = routes[page];
        if (url) {
            window.location.href = url;
        } else {
            console.error('Unknown page:', page);
        }
    }

    redirectToDashboard() {
        this.navigateTo('dashboard');
    }

    redirectToLogin() {
        this.navigateTo('login');
    }

    redirectToHome() {
        this.navigateTo('home');
    }
}

/**
 * Notification Manager
 * Handles toast notifications
 */
export class NotificationManager {
    constructor() {
        this.container = this.createContainer();
        this.notifications = new Map();
    }

    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const id = this.generateId();
        const notification = this.createNotification(id, message, type);

        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full');
        });

        // Auto remove
        const timeout = setTimeout(() => {
            this.remove(id);
        }, type === 'error' ? duration + 2000 : duration);

        // Store timeout for manual removal
        notification.dataset.timeout = timeout;

        return id;
    }

    createNotification(id, message, type) {
        const configs = {
            success: { class: 'bg-green-500 text-white', icon: '✓', title: 'Başarılı' },
            error: { class: 'bg-red-500 text-white', icon: '✗', title: 'Hata' },
            warning: { class: 'bg-yellow-500 text-black', icon: '⚠', title: 'Uyarı' },
            info: { class: 'bg-blue-500 text-white', icon: 'ℹ', title: 'Bilgi' }
        };

        const config = configs[type] || configs.info;
        const notification = document.createElement('div');

        notification.id = `notification-${id}`;
        notification.className = `transform translate-x-full transition-all duration-300 ${config.class} p-4 rounded-lg shadow-lg min-w-72`;

        notification.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-3">
                    <span class="font-bold text-lg">${config.icon}</span>
                    <div>
                        <p class="font-semibold text-sm">${config.title}</p>
                        <p class="text-sm opacity-90">${message}</p>
                    </div>
                </div>
                <button onclick="window.notificationManager?.remove('${id}')" 
                        class="ml-2 hover:opacity-70 transition-opacity text-lg">
                    ×
                </button>
            </div>
        `;

        return notification;
    }

    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Clear timeout
        if (notification.dataset.timeout) {
            clearTimeout(notification.dataset.timeout);
        }

        // Animate out
        notification.classList.add('translate-x-full');

        setTimeout(() => {
            notification.remove();
            this.notifications.delete(id);
        }, 300);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Convenience methods
    success(message, duration) { return this.show(message, 'success', duration); }
    error(message, duration) { return this.show(message, 'error', duration); }
    warning(message, duration) { return this.show(message, 'warning', duration); }
    info(message, duration) { return this.show(message, 'info', duration); }
}

/**
 * Custom Error Classes
 */
export class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validation Utilities
 */
export class Validator {
    static email(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static password(password) {
        return password && password.length >= 6;
    }

    static required(value) {
        return value && value.trim().length > 0;
    }
}

/**
 * Error Message Translator
 */
export class ErrorTranslator {
    static translations = {
        'Invalid login credentials': 'Email veya şifre hatalı',
        'Email not confirmed': 'Email adresiniz henüz doğrulanmamış',
        'Too many requests': 'Çok fazla deneme. Lütfen bekleyin',
        'User not found': 'Bu email ile kayıtlı kullanıcı bulunamadı',
        'Invalid email': 'Geçersiz email formatı',
        'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalı'
    };

    static translate(errorMessage) {
        return this.translations[errorMessage] || errorMessage;
    }
}

// Global singleton instances
export const authManager = new CoreAuthManager();
export const navigationManager = new NavigationManager();
export const notificationManager = new NotificationManager();

// Export for global access
window.authManager = authManager;
window.navigationManager = navigationManager;
window.notificationManager = notificationManager;

console.log('✅ Core Supabase Manager loaded');