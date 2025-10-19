// Initialize Jarallax
document.addEventListener('DOMContentLoaded', function() {
    // Initialize jarallax (guard if not loaded on this page)
    if (typeof jarallax === 'function') {
        jarallax(document.querySelectorAll('.jarallax'), {
            speed: 0.2,
            type: 'scroll',
            imgSrc: 'background.jpg'
        });
    }

    // Session-aware nav (replace Login with Dashboard if logged in)
    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
    }
    const sessionUser = getCurrentUser();
    const navMenuEl = document.getElementById('nav-menu');
    if (navMenuEl) {
        const loginLink = navMenuEl.querySelector('.login-btn');
        if (sessionUser) {
            if (loginLink) {
                const dashboardHref = sessionUser.role === 'therapist' ? 'therapist-dashboard.html' : 'user-dashboard.html';
                loginLink.textContent = 'Dashboard';
                loginLink.setAttribute('href', dashboardHref);
                loginLink.classList.remove('login-btn');
                loginLink.classList.add('dashboard-btn');
            }
        }
    }

    // Mobile Navigation Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link (works across all pages)
    document.querySelectorAll('.nav-link, .dashboard-btn').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active', !isActive);
        });
    });

    // Smooth scrolling for anchor links (ignore bare '#')
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return; // let default or no-op
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.step, .review-card, .feature-card').forEach(el => {
        observer.observe(el);
    });

    // Add loading animation
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
    });

    // Button hover effects
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Card hover effects
    document.querySelectorAll('.step, .review-card, .feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Form validation (for future forms)
    function validateForm(form) {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });
        
        return isValid;
    }

    // Add error styles for form validation
    const style = document.createElement('style');
    style.textContent = `
        .error {
            border-color: #e74c3c !important;
            box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2) !important;
        }
    `;
    document.head.appendChild(style);

    // Preload critical images
    const criticalImages = ['background.jpg'];
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });

    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });

    // Performance optimization: Debounce scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(function() {
            // Scroll-dependent code here
        }, 10);
    });

    // Add focus styles for accessibility
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-navigation');
        }
    });

    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-navigation');
    });

    // Add focus styles
    const focusStyle = document.createElement('style');
    focusStyle.textContent = `
        .keyboard-navigation *:focus {
            outline: 2px solid var(--primary-blue) !important;
            outline-offset: 2px !important;
        }
    `;
    document.head.appendChild(focusStyle);
    // Expose utilities where safe
    window.VKareUtils = {
        debounce,
        throttle
    };
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// (moved VKareUtils assignment inside DOMContentLoaded; avoid referencing local validateForm here)