// Roman's Rater 4.21 - Interactive Scripts

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    initSmoothScroll();

    // Mobile menu toggle
    initMobileMenu();

    // Animated counter for stats
    initCounters();

    // Code block copy functionality
    initCodeCopy();

    // Active nav highlighting
    initActiveNav();

    // Fade-in animations on scroll
    initScrollAnimations();
});

// Smooth scrolling for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Mobile menu toggle (if needed for responsive)
function initMobileMenu() {
    // Add hamburger menu for mobile if needed
    const navbar = document.querySelector('.navbar');
    if (window.innerWidth <= 768) {
        // Mobile menu logic here
    }
}

// Animated counters for statistics
function initCounters() {
    const counters = document.querySelectorAll('.stat-number, .stat h3');
    const speed = 200; // Animation speed

    const animateCounter = (counter) => {
        const target = counter.textContent.trim();

        // Extract number from text (e.g., "85%" -> 85, "5,531" -> 5531)
        const match = target.match(/[\d,]+/);
        if (!match) return;

        const num = parseInt(match[0].replace(/,/g, ''));
        if (isNaN(num)) return;

        const increment = num / speed;
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < num) {
                counter.textContent = target.replace(/[\d,]+/, Math.ceil(current).toLocaleString());
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        updateCounter();
    };

    // Intersection Observer to trigger animation when in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateCounter(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// Add copy button to code blocks
function initCodeCopy() {
    const codeBlocks = document.querySelectorAll('.code-block');

    codeBlocks.forEach(block => {
        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.85rem;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        // Make code block position relative
        block.style.position = 'relative';
        block.appendChild(copyBtn);

        // Show button on hover
        block.addEventListener('mouseenter', () => {
            copyBtn.style.opacity = '1';
        });

        block.addEventListener('mouseleave', () => {
            copyBtn.style.opacity = '0';
        });

        // Copy functionality
        copyBtn.addEventListener('click', async () => {
            const code = block.querySelector('code').textContent;

            try {
                await navigator.clipboard.writeText(code);
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.style.background = 'var(--success-color)';

                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    copyBtn.style.background = 'var(--primary-color)';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    });
}

// Highlight active navigation section
function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Add active style
    const style = document.createElement('style');
    style.textContent = `
        .nav-menu a.active {
            color: var(--primary-color);
            border-bottom: 2px solid var(--primary-color);
        }
    `;
    document.head.appendChild(style);
}

// Fade-in animations on scroll
function initScrollAnimations() {
    const animateElements = document.querySelectorAll(
        '.feature-card, .doc-card, .download-card, .tech-column'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, {
        threshold: 0.1
    });

    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Download button handlers
document.querySelectorAll('.download-card .btn').forEach(btn => {
    if (!btn.href || btn.href === '#') {
        btn.addEventListener('click', (e) => {
            if (btn.textContent.includes('Windows') ||
                btn.textContent.includes('macOS') ||
                btn.textContent.includes('Linux')) {
                e.preventDefault();
                showNotification('Standalone executables coming soon!', 'info');
            }
        });
    }
});

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'info' ? 'var(--secondary-color)' : 'var(--success-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: var(--shadow-lg);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add slide animation styles
const animStyle = document.createElement('style');
animStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(animStyle);

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;

    if (currentScroll > lastScroll && currentScroll > 100) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;
});

// Add transition to navbar
document.querySelector('.navbar').style.transition = 'transform 0.3s ease';

// Console easter egg
console.log(`
%c Roman's Rater 4.21
%c Production Ready | Offline-First | Fully Tested
%c
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Statistics:
   • 5,531 lines of code
   • 73 test cases
   • 85% test coverage
   • 47/47 requirements met
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Built with: Python 3.11+ | NiceGUI | SQLite
🚀 Ready for: Rating auto liability policies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
'color: #7E369F; font-size: 20px; font-weight: bold;',
'color: #27AE60; font-size: 12px;',
'color: #95A5A6; font-size: 11px; font-family: monospace;'
);
