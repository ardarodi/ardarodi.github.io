// Dashboard Page Manager - Sadece dashboard sayfası işlemleri
// Clean ve modular implementation

import {
    authManager,
    navigationManager,
    notificationManager,
    SessionStorage
} from './supbaseManager.js';

export class DashboardManager {
    constructor() {
        this.isLoading = false;
        this.isRedirecting = false;
        this.currentUser = null;

        this.init();
    }

    async init() {
        console.log('📊 Dashboard Manager initializing...');

        // Wait for auth manager
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

        // Check authentication
        const isAuthenticated = await this.checkAuthentication();

        if (isAuthenticated) {
            this.setupDashboard();
            this.setupEventListeners();
            this.setupAuthStateListener();
            await this.loadDashboardData();
        }

        console.log('✅ Dashboard Manager ready');
    }

    async checkAuthentication() {
        try {
            // Check if user is authenticated
            if (authManager.isAuthenticated) {
                this.currentUser = authManager.user;
                console.log('📋 User authenticated:', this.currentUser.email);
                return true;
            }

            // Check local session as fallback
            const localUser = SessionStorage.getUser();
            if (localUser) {
                this.currentUser = localUser;
                console.log('📋 Local session found:', localUser.email);
                return true;
            }

            // No authentication found
            console.log('❌ No authentication found');
            this.redirectToLogin();
            return false;

        } catch (error) {
            console.error('❌ Authentication check error:', error);
            this.redirectToLogin();
            return false;
        }
    }

    setupDashboard() {
        this.updateUserInterface();
        this.hideLoadingScreen();
        this.startSessionTimer();
    }

    setupEventListeners() {
        // Logout button - single handler for all logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-logout]') || e.target.closest('[data-logout]')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Profile update
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-profile-update]')) {
                e.preventDefault();
                this.handleProfileUpdate();
            }
        });

        // Theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-theme-toggle]')) {
                e.preventDefault();
                this.handleThemeToggle();
            }
        });

        // Refresh data
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-refresh]')) {
                e.preventDefault();
                this.refreshDashboardData();
            }
        });

        // Navigate to home
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-home]')) {
                e.preventDefault();
                navigationManager.redirectToHome();
            }
        });

        // Mobile menu toggle
        this.setupMobileMenu();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupAuthStateListener() {
        authManager.onAuthStateChange((event, user) => {
            if (this.isRedirecting) return;

            switch (event) {
                case 'SIGNED_OUT':
                    console.log('👋 User signed out from dashboard');
                    this.handleAuthSignOut();
                    break;

                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed');
                    this.currentUser = user;
                    this.updateUserInterface();
                    break;
            }
        });
    }

    setupMobileMenu() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-mobile-menu-toggle]')) {
                const menu = document.querySelector('[data-mobile-menu]');
                if (menu) {
                    menu.classList.toggle('hidden');
                }
            }
        });

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            const menu = document.querySelector('[data-mobile-menu]');
            const toggle = document.querySelector('[data-mobile-menu-toggle]');

            if (menu && !menu.contains(e.target) && !toggle?.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+L for logout
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.handleLogout();
            }

            // Ctrl+R for refresh (prevent default and use custom)
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshDashboardData();
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Update user email
        this.updateElements('[data-user-email]', this.currentUser.email);

        // Update user name
        const displayName = this.currentUser.user_metadata?.full_name ||
            this.currentUser.email.split('@')[0];
        this.updateElements('[data-user-name]', displayName);

        // Update user ID
        this.updateElements('[data-user-id]', this.currentUser.id);

        // Update join date
        const joinDate = new Date(this.currentUser.created_at).toLocaleDateString('tr-TR');
        this.updateElements('[data-join-date]', joinDate);

        // Update email verification status
        const isVerified = !!this.currentUser.email_confirmed_at;
        this.updateElements('[data-email-verified]',
            isVerified ?
                '<span class="text-green-600">✓ Doğrulandı</span>' :
                '<span class="text-yellow-600">⚠ Doğrulanmadı</span>',
            true
        );

        // Update session info
        this.updateSessionInfo();
        this.updateBrowserInfo();
    }

    updateElements(selector, content, isHTML = false) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (isHTML) {
                el.innerHTML = content;
            } else {
                el.textContent = content;
            }
        });
    }

    updateSessionInfo() {
        const session = SessionStorage.get();
        if (session?.loginTime) {
            // Update last login
            const loginDate = new Date(session.loginTime).toLocaleString('tr-TR');
            this.updateElements('[data-last-login]', loginDate);

            // Update session duration
            this.updateSessionDuration(session.loginTime);
        }
    }

    updateSessionDuration(loginTime) {
        const duration = Date.now() - new Date(loginTime).getTime();
        const minutes = Math.floor(duration / 60000);
        this.updateElements('[data-session-duration]', `${minutes} dakika`);
    }

    updateBrowserInfo() {
        // Update browser info
        const browser = this.detectBrowser();
        this.updateElements('[data-browser-info]', browser);

        // Update platform info
        this.updateElements('[data-platform]', navigator.platform || 'Bilinmeyen');
    }

    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Bilinmeyen';
    }

    startSessionTimer() {
        // Update session duration every minute
        setInterval(() => {
            const session = SessionStorage.get();
            if (session?.loginTime) {
                this.updateSessionDuration(session.loginTime);
            }
        }, 60000);
    }

    async loadDashboardData() {
        try {
            this.setLoadingState(true);

            // Simulate loading dashboard data
            await new Promise(resolve => setTimeout(resolve, 1000));

            notificationManager.success('Dashboard yüklendi');

        } catch (error) {
            console.error('❌ Dashboard data load error:', error);
            notificationManager.error('Dashboard verileri yüklenemedi');

        } finally {
            this.setLoadingState(false);
        }
    }

    async refreshDashboardData() {
        try {
            console.log('🔄 Refreshing dashboard data...');
            this.setLoadingState(true);

            // Get fresh user data
            if (authManager.isAuthenticated) {
                this.currentUser = authManager.user;
                this.updateUserInterface();
                notificationManager.success('Veriler güncellendi');
            } else {
                throw new Error('Authentication required');
            }

        } catch (error) {
            console.error('❌ Refresh error:', error);
            notificationManager.error('Veriler güncellenemedi');

        } finally {
            this.setLoadingState(false);
        }
    }

    async handleLogout() {
        try {
            console.log('👋 Logout initiated from dashboard...');

            // Show confirmation
            const confirmed = confirm('Çıkış yapmak istediğinizden emin misiniz?');
            if (!confirmed) return;

            this.setLoadingState(true);

            const result = await authManager.signOut();

            if (result.success) {
                notificationManager.info('Başarıyla çıkış yapıldı');
                this.redirectToLogin();
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('❌ Logout error:', error);

            // Force logout on error
            SessionStorage.clear();
            notificationManager.warning('Çıkış yapıldı');
            this.redirectToLogin();

        } finally {
            this.setLoadingState(false);
        }
    }

    handleAuthSignOut() {
        if (!this.isRedirecting) {
            notificationManager.info('Oturum kapatıldı');
            this.redirectToLogin();
        }
    }

    handleProfileUpdate() {
        notificationManager.info('Profil güncelleme özelliği yakında...');
        // TODO: Implement profile update modal
    }

    handleThemeToggle() {
        const isDarkMode = document.documentElement.classList.contains('dark');

        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            notificationManager.info('Açık tema aktif');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            notificationManager.info('Koyu tema aktif');
        }
    }

    redirectToLogin() {
        if (this.isRedirecting) return;

        this.isRedirecting = true;
        notificationManager.warning('Giriş sayfasına yönlendiriliyor...');

        setTimeout(() => {
            navigationManager.redirectToLogin();
        }, 2000);
    }

    setLoadingState(isLoading) {
        this.isLoading = isLoading;

        // Update loading overlays
        const loadingElements = document.querySelectorAll('[data-loading]');
        loadingElements.forEach(el => {
            el.classList.toggle('hidden', !isLoading);
        });

        // Update content opacity
        const contentElements = document.querySelectorAll('[data-content]');
        contentElements.forEach(el => {
            el.classList.toggle('opacity-50', isLoading);
            el.classList.toggle('pointer-events-none', isLoading);
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => loadingScreen.remove(), 300);
            }, 500);
        }
    }

    closeModals() {
        const modals = document.querySelectorAll('[data-modal]');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboardPageManager = new DashboardManager();
    });
} else {
    window.dashboardPageManager = new DashboardManager();
}

console.log('📊 Dashboard Page Manager loaded');