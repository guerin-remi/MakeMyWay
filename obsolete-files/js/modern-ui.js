/**
 * Extensions modernes pour RunMyWay
 * Améliore l'interface utilisateur avec les dernières tendances 2025
 */

// Extension de la classe RunMyWayApp pour la moderniser
if (typeof RunMyWayApp !== 'undefined') {
    
    // Méthodes modernes pour l'UI
    RunMyWayApp.prototype.initModernUI = function() {
        console.log('🎨 Initialisation de l\'UI moderne...');
        
        // Initialiser les composants modernes
        this.initSliderInteractions();
        this.initModeToggleAnimations();
        this.initHelpBubble();
        this.initMicroInteractions();
        this.initAccessibilityFeatures();
        this.initResponsiveHandlers();
        
        console.log('✨ UI moderne initialisée');
    };
    
    // Interactions modernes du slider
    RunMyWayApp.prototype.initSliderInteractions = function() {
        const slider = document.getElementById('targetDistance');
        const valueDisplay = document.getElementById('distanceValue');
        
        if (!slider || !valueDisplay) return;
        
        // Mise à jour fluide en temps réel
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = `${value} km`;
            
            // Animation de feedback
            valueDisplay.style.transform = 'scale(1.1)';
            setTimeout(() => {
                valueDisplay.style.transform = 'scale(1)';
            }, 150);
        });
        
        // Ajustement du slider selon le mode
        const modeInputs = document.querySelectorAll('input[name="travelMode"]');
        modeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateSliderForMode(input.value);
            });
        });
    };
    
    // Mise à jour du slider selon le mode de transport
    RunMyWayApp.prototype.updateSliderForMode = function(mode) {
        const slider = document.getElementById('targetDistance');
        const maxLabel = document.getElementById('maxLabel');
        const valueDisplay = document.getElementById('distanceValue');
        
        if (!slider || !maxLabel) return;
        
        const modeConfig = {
            walking: { max: 15, default: 5 },
            running: { max: 30, default: 10 },
            cycling: { max: 80, default: 25 }
        };
        
        const config = modeConfig[mode] || modeConfig.walking;
        
        // Animation fluide du changement
        slider.style.transition = 'all 0.3s ease';
        slider.max = config.max;
        
        // Ajuster la valeur si elle dépasse le nouveau maximum
        const currentValue = parseFloat(slider.value);
        if (currentValue > config.max) {
            slider.value = config.default;
            valueDisplay.textContent = `${config.default} km`;
        }
        
        maxLabel.textContent = `${config.max}km`;
        
        // Animation du label
        maxLabel.style.transform = 'scale(1.1)';
        maxLabel.style.color = 'var(--primary-color)';
        setTimeout(() => {
            maxLabel.style.transform = 'scale(1)';
            maxLabel.style.color = 'var(--text-tertiary)';
        }, 300);
    };
    
    // Animations des modes de transport
    RunMyWayApp.prototype.initModeToggleAnimations = function() {
        const modeInputs = document.querySelectorAll('input[name="travelMode"]');
        
        modeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                // Animation de sélection
                const label = e.target.nextElementSibling;
                if (label) {
                    label.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        label.style.transform = 'scale(1)';
                    }, 150);
                }
                
                // Mise à jour du status
                this.updateModeStatus(e.target.value);
            });
        });
    };
    
    // Mise à jour du status selon le mode
    RunMyWayApp.prototype.updateModeStatus = function(mode) {
        const statusText = {
            walking: 'Mode marche sélectionné - Parfait pour la découverte',
            running: 'Mode course sélectionné - Optimisé pour l\'entraînement',
            cycling: 'Mode vélo sélectionné - Idéal pour les longues distances'
        };
        
        // Afficher un feedback temporaire
        this.showTempFeedback(statusText[mode] || 'Mode de transport mis à jour');
    };
    
    // Feedback temporaire moderne
    RunMyWayApp.prototype.showTempFeedback = function(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.className = `alert alert-${type}`;
        feedback.style.position = 'fixed';
        feedback.style.top = '20px';
        feedback.style.right = '20px';
        feedback.style.zIndex = '10000';
        feedback.style.maxWidth = '300px';
        feedback.style.animation = 'slideInRight 0.3s ease-out';
        
        feedback.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(feedback);
        
        // Suppression automatique
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    };
    
    // Gestion moderne de la bulle d'aide
    RunMyWayApp.prototype.initHelpBubble = function() {
        const helpBtn = document.getElementById('routeHelpBtn');
        const helpBubble = document.getElementById('routeHelpBubble');
        
        if (!helpBtn || !helpBubble) return;
        
        let isHelpVisible = false;
        let hideTimeout;
        
        // Affichage au survol
        helpBtn.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
            if (!isHelpVisible) {
                helpBubble.style.display = 'block';
                helpBubble.style.animation = 'slideInDown 0.3s ease-out';
                isHelpVisible = true;
            }
        });
        
        // Masquage différé
        helpBtn.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                if (isHelpVisible) {
                    helpBubble.style.animation = 'fadeOut 0.3s ease-in';
                    setTimeout(() => {
                        helpBubble.style.display = 'none';
                        isHelpVisible = false;
                    }, 300);
                }
            }, 500); // Délai pour permettre le survol de la bulle
        });
        
        // Maintenir la bulle ouverte au survol
        helpBubble.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
        });
        
        helpBubble.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                if (isHelpVisible) {
                    helpBubble.style.animation = 'fadeOut 0.3s ease-in';
                    setTimeout(() => {
                        helpBubble.style.display = 'none';
                        isHelpVisible = false;
                    }, 300);
                }
            }, 200);
        });
    };
    
    // Micro-interactions pour tous les boutons
    RunMyWayApp.prototype.initMicroInteractions = function() {
        // Effet de vague pour les boutons principaux
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.createRippleEffect(e, btn);
            });
        });
        
        // Hover effects pour les cartes/sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.addEventListener('mouseenter', () => {
                section.style.transform = 'translateY(-2px)';
                section.style.boxShadow = 'var(--shadow-lg)';
            });
            
            section.addEventListener('mouseleave', () => {
                section.style.transform = 'translateY(0)';
                section.style.boxShadow = 'var(--shadow-sm)';
            });
        });
    };
    
    // Effet de vague (ripple) sur les boutons
    RunMyWayApp.prototype.createRippleEffect = function(event, button) {
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.background = 'rgba(255, 255, 255, 0.3)';
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.pointerEvents = 'none';
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    };
    
    // Fonctionnalités d'accessibilité
    RunMyWayApp.prototype.initAccessibilityFeatures = function() {
        // Navigation au clavier améliorée
        document.addEventListener('keydown', (e) => {
            // Échap pour fermer les modales/bulles
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Enter/Space pour activer les boutons custom
            if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute('role') === 'button') {
                e.preventDefault();
                e.target.click();
            }
        });
        
        // Annonces pour lecteurs d'écran
        this.initScreenReaderAnnouncements();
        
        // Mode sombre automatique
        this.initDarkModeDetection();
    };
    
    // Annonces pour lecteurs d'écran
    RunMyWayApp.prototype.initScreenReaderAnnouncements = function() {
        // Créer une zone d'annonces cachée
        const announcer = document.createElement('div');
        announcer.id = 'screen-reader-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'visually-hidden';
        document.body.appendChild(announcer);
        
        this.screenReaderAnnouncer = announcer;
    };
    
    // Annoncer un message aux lecteurs d'écran
    RunMyWayApp.prototype.announceToScreenReader = function(message) {
        if (this.screenReaderAnnouncer) {
            this.screenReaderAnnouncer.textContent = message;
            
            // Effacer après un délai pour permettre de nouvelles annonces
            setTimeout(() => {
                this.screenReaderAnnouncer.textContent = '';
            }, 1000);
        }
    };
    
    // Détection du mode sombre
    RunMyWayApp.prototype.initDarkModeDetection = function() {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleDarkModeChange = (e) => {
            console.log(`🌙 Mode ${e.matches ? 'sombre' : 'clair'} détecté`);
            // Ici on pourrait ajuster l'apparence de la carte ou d'autres éléments
        };
        
        darkModeQuery.addEventListener('change', handleDarkModeChange);
        handleDarkModeChange(darkModeQuery); // Initialisation
    };
    
    // Gestion responsive améliorée
    RunMyWayApp.prototype.initResponsiveHandlers = function() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResponsiveResize();
            }, 250);
        });
        
        // Détection d'orientation sur mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 500);
        });
    };
    
    // Adaptation responsive
    RunMyWayApp.prototype.handleResponsiveResize = function() {
        if (this.map) {
            this.map.invalidateSize();
        }
        
        // Ajuster l'interface selon la taille d'écran
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.querySelector('.sidebar');
        
        if (isMobile && sidebar) {
            sidebar.style.height = '60vh';
        }
    };
    
    // Gestion du changement d'orientation
    RunMyWayApp.prototype.handleOrientationChange = function() {
        if (this.map) {
            this.map.invalidateSize();
        }
        
        this.announceToScreenReader('Orientation de l\'écran modifiée');
    };
    
    // Fermer toutes les modales
    RunMyWayApp.prototype.closeAllModals = function() {
        const helpBubble = document.getElementById('routeHelpBubble');
        if (helpBubble && helpBubble.style.display !== 'none') {
            helpBubble.style.animation = 'fadeOut 0.3s ease-in';
            setTimeout(() => {
                helpBubble.style.display = 'none';
            }, 300);
        }
    };
    
    // Override de showError pour une présentation moderne
    const originalShowError = RunMyWayApp.prototype.showError;
    RunMyWayApp.prototype.showError = function(message) {
        // Utiliser la nouvelle méthode moderne
        this.showModernAlert(message, 'error');
        
        // Conserver l'ancienne fonctionnalité si nécessaire
        if (originalShowError) {
            originalShowError.call(this, message);
        }
    };
    
    // Alert moderne
    RunMyWayApp.prototype.showModernAlert = function(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.left = '50%';
        alert.style.transform = 'translateX(-50%)';
        alert.style.zIndex = '10000';
        alert.style.maxWidth = '90vw';
        alert.style.animation = 'slideInDown 0.3s ease-out';
        
        const icons = {
            error: 'fas fa-exclamation-triangle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        alert.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
            <button type="button" style="margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; padding: 0;" onclick="this.parentNode.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(alert);
        
        // Suppression automatique
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'slideOutUp 0.3s ease-in';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 300);
            }
        }, 5000);
        
        // Annonce pour accessibilité
        this.announceToScreenReader(`${type}: ${message}`);
    };
    
    // CSS pour les animations manquantes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
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
        
        @keyframes slideOutUp {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Auto-initialisation si RunMyWayApp existe déjà
    if (window.runMyWayApp) {
        window.runMyWayApp.initModernUI();
    }
}

// Amélioration du chargement
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que l'app principale soit initialisée
    if (window.runMyWayApp && typeof window.runMyWayApp.initModernUI === 'function') {
        window.runMyWayApp.initModernUI();
    } else {
        // Réessayer après un délai
        setTimeout(() => {
            if (window.runMyWayApp && typeof window.runMyWayApp.initModernUI === 'function') {
                window.runMyWayApp.initModernUI();
            }
        }, 1000);
    }
});