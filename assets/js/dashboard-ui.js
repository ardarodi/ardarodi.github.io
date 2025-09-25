// Dashboard UI helpers - DashboardManager ile çakışmayan ek fonksiyonlar
// Sadece UI state management için

// Sidebar submenu toggle - mevcut sistemle çakışmayacak
function toggleSidebarSubmenu(menuId) {
    const submenu = document.getElementById(menuId + '-menu');
    const icon = document.getElementById(menuId + '-icon');

    if (submenu && icon) {
        submenu.classList.toggle('active');
        icon.classList.toggle('rotate-180');
    }
}

// User menu toggle
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.toggle('hidden');
    }
}

// Close user menu on outside click
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenu');
    const userMenuButton = e.target.closest('[onclick="toggleUserMenu()"]');

    if (userMenu && !userMenu.contains(e.target) && !userMenuButton) {
        userMenu.classList.add('hidden');
    }
});

// Active sidebar item management
document.addEventListener('click', (e) => {
    const sidebarItem = e.target.closest('.sidebar-item');
    if (sidebarItem && sidebarItem.matches('a[href]')) {
        // Remove active class from all items
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active', 'bg-white/20');
        });

        // Add active class to clicked item
        sidebarItem.classList.add('active', 'bg-white/20');
    }
});

// Set theme on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
});

// Export functions for external use
window.toggleSidebarSubmenu = toggleSidebarSubmenu;
window.toggleUserMenu = toggleUserMenu;

console.log('🎨 Dashboard UI helpers loaded');