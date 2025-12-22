(function() {
    'use strict';

    // Minimal module state
    const state = {
        _initialized: false,
        _exportTimer: null,
        _exportPercent: 0,
    };

    // Utility: emit custom pf:* events
    function emitEvent(name, detail = {}) {
        const ev = new CustomEvent(name, { detail });
        (document || window.document).dispatchEvent(ev);
    }

    // ============================================================
    // PUBLIC APP API (attached to window.app)
    // ============================================================
    const app = {
        init,
        highlightActiveNav,
        toggleMobileMenu,
        activateCard,
        showexportModal,
        hideexportModal,
    };

    window.app = window.app || {};
    // Attach methods but allow overrides if already present ? keep our implementations
    Object.assign(window.app, app);

    // ============================================================
    // IDPOMOTENT INITIALIZER
    // ============================================================
    function init(rootDocument = document) {
        if (state._initialized) {
            return true;
        }

        // Basic integrity checks: require header and nav (canonical selectors)
        const header = rootDocument.querySelector('header');
        const navLinksExist = rootDocument.querySelector('[data-pf="nav-link"]');
        if (!header || !navLinksExist) {
            // integrity check failed
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn('PanelForge App init aborted: missing header or nav links (data-pf="nav-link")');
            }
            return false;
        }

        // ============================================================
        // ACTIVE NAVIGATION HIGHLIGHT
        // ============================================================
        // Determine default path key from filename (without extension)
        const currentPath = window.location.pathname;
        const fileName = currentPath.split('/').pop() || 'index.html';
        const defaultKey = fileName.split('.').shift() || 'index';

        // Run initial highlight
        highlightActiveNav(defaultKey, rootDocument);

        // Update active state on navigation clicks (canonical selector)
        const navLinks = rootDocument.querySelectorAll('[data-pf="nav-link"]');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Allow normal navigation but update highlight for SPA-like behavior
                const key = this.getAttribute('data-nav-key') || (this.getAttribute('href') || '').split('/').pop().split('.').shift();
                highlightActiveNav(key, rootDocument);
            });
        });

        // ============================================================
        // HERO CTA WIRING (index.html) - keep existing broad selector
        // ============================================================
        const heroCTA = rootDocument.querySelector('.hero-cta, .cta-button, .primary-cta, [data-cta="create"]');
        if (heroCTA) {
            heroCTA.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'create.html';
            });
        }

        // ============================================================
        // MOBILE MENU TOGGLE (canonical selectors)
        // ============================================================
        const menuButton = rootDocument.querySelector('button.pf-mobile-toggle[data-pf="mobile-toggle"]');
        const mobilePanel = rootDocument.querySelector('#pf-mobile-menu');

        if (menuButton && mobilePanel) {
            menuButton.addEventListener('click', function(e) {
                e.preventDefault();
                toggleMobileMenu(rootDocument);
            });
        }

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const panel = rootDocument.querySelector('#pf-mobile-menu');
                const btn = rootDocument.querySelector('button.pf-mobile-toggle[data-pf="mobile-toggle"]');
                if (panel && panel.classList.contains('is-open')) {
                    panel.classList.remove('is-open');
                    panel.setAttribute('aria-hidden', 'true');
                    if (btn) {
                        btn.setAttribute('aria-expanded', 'false');
                    }
                }
            }
        });

        // ============================================================
        // SIMULATED UI STATES VIA CSS CLASS TOGGLES
        // (unchanged selectors preserved)
        // ============================================================

        // Upload tiles toggle
        const uploadTiles = rootDocument.querySelectorAll('.upload-slot, .upload-tile, [data-upload-slot]');
        uploadTiles.forEach(tile => {
            tile.addEventListener('click', function() {
                this.classList.toggle('active');
                this.classList.toggle('glow');
            });

            tile.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.classList.toggle('active');
                    this.classList.toggle('glow');
                }
            });
        });

        // Character cards toggle (legacy bindings remain)
        const characterCards = rootDocument.querySelectorAll('.character-card, [data-character]');
        characterCards.forEach(card => {
            card.addEventListener('click', function() {
                // Toggle active/glow on click
                this.classList.toggle('active');
                this.classList.toggle('glow');

                const isActive = this.classList.contains('active');
                this.setAttribute('aria-pressed', isActive);
            });

            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.classList.toggle('active');
                    this.classList.toggle('glow');

                    const isActive = this.classList.contains('active');
                    this.setAttribute('aria-pressed', isActive);
                }
            });
        });

        // Recent comics tiles toggle
        const recentComicsTiles = rootDocument.querySelectorAll('.recent-comic-tile, .comic-tile, [data-comic-tile]');
        recentComicsTiles.forEach(tile => {
            tile.addEventListener('click', function() {
                this.classList.toggle('active');
                this.classList.toggle('glow');
            });

            tile.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.classList.toggle('active');
                    this.classList.toggle('glow');
                }
            });
        });

        // Generic interactive elements with data-interactive attribute
        const interactiveElements = rootDocument.querySelectorAll('[data-interactive]');
        interactiveElements.forEach(element => {
            element.addEventListener('click', function() {
                this.classList.toggle('active');
                this.classList.toggle('glow');
            });

            element.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.classList.toggle('active');
                    this.classList.toggle('glow');
                }
            });
        });

        // ============================================================
        // SLIDER UPDATES (from studio.html reference)
        // ============================================================
        const sliders = rootDocument.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            const sliderId = slider.id;
            const valueId = sliderId.replace('-slider', '-value');
            const valueEl = rootDocument.getElementById(valueId);

            if (valueEl) {
                slider.addEventListener('input', function() {
                    valueEl.textContent = this.value;
                });
            }
        });

        // ============================================================
        // STYLE PILLS TOGGLE (from studio.html reference)
        // ============================================================
        const stylePills = rootDocument.querySelectorAll('.style-pill:not(.inactive)');
        stylePills.forEach(pill => {
            pill.addEventListener('click', function() {
                stylePills.forEach(p => {
                    p.classList.remove('active');
                    p.setAttribute('aria-checked', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-checked', 'true');
            });

            pill.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });

        // ============================================================
        // ACCESSIBILITY ENHANCEMENTS
        // ============================================================
        document.addEventListener('keydown', function(e) {
            // Tab trap for modals/overlays if needed
            if (e.key === 'Tab') {
                const focusableElements = rootDocument.querySelectorAll(
                    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );

                if (focusableElements.length > 0) {
                    const firstFocusable = focusableElements[0];
                    const lastFocusable = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });

        // ============================================================
        // EXPORT MODAL FLOW (pf export modal)
        // ============================================================
        const exportStartButtons = rootDocument.querySelectorAll('.pf-export-start');
        exportStartButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                showexportModal(rootDocument);
            });
        });

        // ============================================================
        // PF CARD BINDINGS (canonical selectors)
        // Targets .pf-card[data-card-id] and .pf-card-select
        // ============================================================
        const pfCards = rootDocument.querySelectorAll('.pf-card[data-card-id]');
        pfCards.forEach(card => {
            card.addEventListener('click', function() {
                const id = this.getAttribute('data-card-id');
                if (id) {
                    activateCard(id, rootDocument);
                }
            });

            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const id = this.getAttribute('data-card-id');
                    if (id) {
                        activateCard(id, rootDocument);
                    }
                }
            });
        });

        const pfCardSelects = rootDocument.querySelectorAll('.pf-card-select');
        pfCardSelects.forEach(sel => {
            sel.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target-card-id') || this.getAttribute('data-card-id');
                if (targetId) {
                    activateCard(targetId, rootDocument);
                }
            });
        });

        // Mark initialized
        state._initialized = true;

        // Logging for dev
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('PanelForge App Initialized');
            console.log('Current page:', window.location.pathname);
        }

        return true;
    }

    // ============================================================
    // NAV HIGHLIGHT HELPER / API
    // ============================================================
    function highlightActiveNav(pathKey, rootDocument = document) {
        const navLinks = rootDocument.querySelectorAll('[data-pf="nav-link"]');
        let activatedKey = null;

        navLinks.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });

        if (!pathKey) {
            pathKey = 'index';
        }

        navLinks.forEach(link => {
            const key = link.getAttribute('data-nav-key') || (link.getAttribute('href') || '').split('/').pop().split('.').shift();
            if (key === pathKey) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
                activatedKey = key;
            }
        });

        // If none matched, try matching by href filename as fallback
        if (!activatedKey) {
            const fileName = (window.location.pathname.split('/').pop() || 'index.html');
            navLinks.forEach(link => {
                const href = link.getAttribute('href') || '';
                if (href === fileName || (fileName === '' && href === 'index.html')) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                    activatedKey = link.getAttribute('data-nav-key') || href.split('.').shift();
                }
            });
        }

        if (activatedKey) {
            emitEvent('pf:nav:activated', { key: activatedKey });
        }

        return activatedKey;
    }

    // ============================================================
    // MOBILE MENU TOGGLE API
    // ============================================================
    function toggleMobileMenu(rootDocument = document) {
        const btn = rootDocument.querySelector('button.pf-mobile-toggle[data-pf="mobile-toggle"]');
        const panel = rootDocument.querySelector('#pf-mobile-menu');
        if (!btn || !panel) return false;

        const willOpen = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', willOpen);
        panel.setAttribute('aria-hidden', !willOpen ? 'true' : 'false');

        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

        return willOpen;
    }

    // ============================================================
    // CARD ACTIVATION API
    // ============================================================
    function activateCard(cardId, rootDocument = document) {
        if (!cardId) return false;
        const cards = rootDocument.querySelectorAll('.pf-card[data-card-id]');
        let found = false;
        cards.forEach(c => {
            const id = c.getAttribute('data-card-id');
            if (id === cardId) {
                c.classList.add('is-active');
                c.setAttribute('aria-pressed', 'true');
                found = true;
            } else {
                c.classList.remove('is-active');
                c.setAttribute('aria-pressed', 'false');
            }
        });

        if (found) {
            emitEvent('pf:card:activated', { cardId });
            return true;
        }
        return false;
    }

    // ============================================================
    // EXPORT MODAL FLOW API
    // ============================================================
    function showexportModal(rootDocument = document) {
        const modal = rootDocument.querySelector('#pf-export-modal');
        if (!modal) return false;

        // Reset state
        state._exportPercent = 0;
        clearInterval(state._exportTimer);

        modal.classList.add('is-open');
        modal.classList.remove('is-complete');
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('aria-modal', 'true');

        emitEvent('pf:export:start', {});

        // Start synthetic progress
        state._exportTimer = setInterval(() => {
            state._exportPercent = Math.min(100, state._exportPercent + Math.floor(Math.random() * 15) + 5);
            emitEvent('pf:export:progress', { percent: state._exportPercent });

            // Toggle exporting class while in progress
            if (state._exportPercent < 100) {
                modal.classList.add('is-exporting');
            } else {
                // complete
                clearInterval(state._exportTimer);
                state._exportTimer = null;
                modal.classList.remove('is-exporting');
                modal.classList.add('is-complete');
                emitEvent('pf:export:complete', {});
            }
        }, 400);

        return true;
    }

    function hideexportModal(rootDocument = document) {
        const modal = rootDocument.querySelector('#pf-export-modal');
        if (!modal) return false;

        clearInterval(state._exportTimer);
        state._exportTimer = null;
        state._exportPercent = 0;

        modal.classList.remove('is-open', 'is-exporting', 'is-complete');
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');

        emitEvent('pf:export:closed', {});

        return true;
    }

    // ============================================================
    // PERFORMANCE OPTIMIZATIONS (unchanged)
    // ============================================================
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

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });

        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // ============================================================
    // LOGGING & DEBUG (already covered in init)
    // ============================================================

    // Auto-init on load (keep legacy behavior)
    try {
        app.init(document);
    } catch (e) {
        // swallow to avoid breaking pages that include this script in strange contexts
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.error('PanelForge App init error', e);
        }
    }

})();