// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.module-view');
    const pageTitle = document.getElementById('page-title');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    // Routing Logic to handle Single Page App feel
    function switchView(targetId) {
        // 1. Hide all views and remove animation classes
        views.forEach(view => {
            view.classList.add('hidden');
            view.classList.remove('animate__fadeIn');
        });

        // 2. Reset nav links styling
        navLinks.forEach(link => {
            link.classList.remove('active');
            // Remove hardcoded text colors and backgrounds if custom injected
            link.style.backgroundColor = '';
            link.style.color = '';
        });

        // 3. Show target view with animation
        const targetView = document.getElementById(`view-${targetId}`);
        if (targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('animate__fadeIn');
        }

        // 4. Highlight active nav link
        const activeLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            const navTextSpan = activeLink.querySelector('.nav-text');
            if (navTextSpan) {
                pageTitle.innerHTML = navTextSpan.innerHTML.trim(); // Update title to match nav
            } else {
                pageTitle.innerHTML = activeLink.innerHTML.trim();
            }
        }

        // 5. Close mobile sidebar if open (for responsive behavior)
        if (window.innerWidth < 768 && sidebar) {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('translate-x-0');
        }

        // 6. Broadcast event so specific modules can load data when their view opens
        document.dispatchEvent(new CustomEvent('moduleSwitched', { detail: { target: targetId } }));
    }

    // Attach click listeners to sidebar nav
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            switchView(target);
        });
    });

    // Mobile menu toggle
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                sidebar.classList.add('translate-x-0');
            } else {
                sidebar.classList.add('-translate-x-full');
                sidebar.classList.remove('translate-x-0');
            }
        });
    }

    // Initialize default dashboard chart
    initDashboardChart();
});

// A placeholder/mock chart for the dashboard overview
let dbChartInstance = null;
function initDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    if (dbChartInstance) dbChartInstance.destroy();

    dbChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Savings Collected (Rs)',
                data: [12000, 19000, 15000, 25000, 22000, 30000],
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // Tailwind Blue-500
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [4, 4], color: '#e2e8f0' } // slate-200
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Global Notification Helpers
window.showToast = (message, icon = 'success') => {
    Swal.fire({
        text: message,
        icon: icon,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#fff',
        color: '#1e293b'
    });
};

window.showAlert = (title, text, icon = 'info') => {
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        confirmButtonColor: '#1a56db',
        confirmButtonText: 'OK'
    });
};

window.showConfirm = async (title, text, confirmButtonText = 'Yes, delete it!', icon = 'warning') => {
    const result = await Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#64748b',
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Cancel'
    });
    return result.isConfirmed;
};
