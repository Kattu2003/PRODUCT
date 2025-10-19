// Resources Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const contentSections = document.querySelectorAll('.content-section');
    const faqItems = document.querySelectorAll('.faq-item');

    // Tab navigation functionality
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all tabs
            navTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all content sections
            contentSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Show target content section
            const targetSection = document.getElementById(targetTab);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Scroll to top of content
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // FAQ Accordion functionality
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

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
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
    document.querySelectorAll('.content-card, .therapy-type, .paper-card, .struggle-card, .stat-item').forEach(el => {
        observer.observe(el);
    });

    // Paper link click tracking (for analytics)
    document.querySelectorAll('.paper-link').forEach(link => {
        link.addEventListener('click', function(e) {
            // In a real application, you would track this click
            console.log('Paper link clicked:', this.textContent.trim());
            
            // Prevent default to show that it's a demo
            e.preventDefault();
            
            // Show a demo message
            showDemoMessage('This is a demo link. In the real application, this would open the research paper.');
        });
    });

    // Show demo message function
    function showDemoMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'demo-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-blue);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-size: 0.9rem;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // Add CSS for demo message animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Search functionality (if needed)
    function initializeSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const cards = document.querySelectorAll('.content-card, .therapy-type, .struggle-card');
                
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    }

    // Initialize search if search input exists
    initializeSearch();

    // Keyboard navigation for tabs
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const activeTab = document.querySelector('.nav-tab.active');
            const currentIndex = Array.from(navTabs).indexOf(activeTab);
            
            let newIndex;
            if (e.key === 'ArrowLeft') {
                newIndex = currentIndex > 0 ? currentIndex - 1 : navTabs.length - 1;
            } else {
                newIndex = currentIndex < navTabs.length - 1 ? currentIndex + 1 : 0;
            }
            
            navTabs[newIndex].click();
        }
    });

    // Print functionality for resources
    function addPrintButton() {
        const printButton = document.createElement('button');
        printButton.textContent = 'Print Resources';
        printButton.className = 'btn btn-secondary print-btn';
        printButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 100;
        `;
        
        printButton.addEventListener('click', function() {
            window.print();
        });
        
        document.body.appendChild(printButton);
    }

    // Add print button
    addPrintButton();

    // Print styles
    const printStyle = document.createElement('style');
    printStyle.textContent = `
        @media print {
            .navbar, .quick-nav, .footer, .print-btn, .cta {
                display: none !important;
            }
            
            .content-section {
                display: block !important;
                page-break-inside: avoid;
            }
            
            .content-card, .therapy-type, .struggle-card {
                page-break-inside: avoid;
                margin-bottom: 1rem;
            }
            
            body {
                font-size: 12pt;
                line-height: 1.4;
            }
            
            h1, h2, h3 {
                page-break-after: avoid;
            }
        }
    `;
    document.head.appendChild(printStyle);

    // Statistics counter animation
    function animateCounters() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(stat => {
            const target = parseInt(stat.textContent.replace(/[^\d]/g, ''));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                if (stat.textContent.includes('%')) {
                    stat.textContent = Math.floor(current) + '%';
                } else if (stat.textContent.includes('-')) {
                    stat.textContent = Math.floor(current) + '-';
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 16);
        });
    }

    // Trigger counter animation when stats section is visible
    const statsSection = document.querySelector('.research-stats');
    if (statsSection) {
        const statsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        statsObserver.observe(statsSection);
    }

    // Tooltip functionality for therapy badges
    function addTooltips() {
        const badges = document.querySelectorAll('.therapy-badge');
        
        badges.forEach(badge => {
            badge.addEventListener('mouseenter', function() {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = this.textContent + ' therapy approach';
                tooltip.style.cssText = `
                    position: absolute;
                    background: var(--text-dark);
                    color: white;
                    padding: 0.5rem;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    z-index: 1000;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                
                document.body.appendChild(tooltip);
                
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.bottom + 5) + 'px';
                
                setTimeout(() => {
                    tooltip.style.opacity = '1';
                }, 10);
                
                this.addEventListener('mouseleave', function() {
                    tooltip.style.opacity = '0';
                    setTimeout(() => {
                        if (tooltip.parentNode) {
                            tooltip.parentNode.removeChild(tooltip);
                        }
                    }, 300);
                });
            });
        });
    }

    // Initialize tooltips
    addTooltips();
});