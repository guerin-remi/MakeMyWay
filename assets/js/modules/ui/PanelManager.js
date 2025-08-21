import { CONFIG } from '../../config.js';

/**
 * Gestionnaire des panneaux flottants pour MakeMyWay
 * Gère l'ouverture, fermeture et interactions tactiles des panneaux
 */
export class PanelManager {
    constructor(elements) {
        // Éléments DOM
        this.elements = {
            mainPanel: elements.mainPanel,
            helpPanel: elements.helpPanel,
            settingsBtn: elements.settingsBtn,
            helpBtn: elements.helpBtn
        };
    }

    /**
     * Toggle du panneau principal
     */
    toggleMainPanel() {
        if (this.elements.mainPanel && this.elements.settingsBtn) {
            this.elements.settingsBtn.classList.toggle('active');
            this.elements.mainPanel.classList.toggle('collapsed');
        }
    }

    /**
     * Ferme le panneau principal
     */
    closeMainPanel() {
        if (this.elements.mainPanel && this.elements.settingsBtn) {
            this.elements.settingsBtn.classList.remove('active');
            this.elements.mainPanel.classList.add('collapsed');
        }
    }

    /**
     * Toggle du panneau d'aide
     */
    toggleHelpPanel() {
        if (this.elements.helpPanel && this.elements.helpBtn) {
            this.elements.helpBtn.classList.toggle('active');
            this.elements.helpPanel.classList.toggle('show');
        }
    }

    /**
     * Ferme le panneau d'aide
     */
    closeHelpPanel() {
        if (this.elements.helpPanel && this.elements.helpBtn) {
            this.elements.helpBtn.classList.remove('active');
            this.elements.helpPanel.classList.remove('show');
        }
    }

    /**
     * Ferme tous les panneaux
     */
    closeAllPanels() {
        this.closeMainPanel();
        this.closeHelpPanel();
    }

    /**
     * Configure les gestes tactiles pour le panneau mobile
     */
    setupMobilePanelGestures() {
        const panel = this.elements.mainPanel;
        const panelHandle = panel?.querySelector('.panel-handle');
        const panelHeader = panel?.querySelector('.panel-header');
        
        if (!panel) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const elements = [panelHandle, panelHeader].filter(Boolean);
        
        elements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
                panel.style.transition = 'none';
            });
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (deltaY > 0) {
                panel.style.transform = `translateY(${deltaY}px)`;
            }
        });

        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            const deltaY = currentY - startY;
            panel.style.transition = 'transform 0.3s ease-out';
            
            if (deltaY > 100) {
                this.closeMainPanel();
            } else {
                panel.style.transform = 'translateY(0)';
            }
            
            isDragging = false;
            startY = 0;
            currentY = 0;
        });
    }

    /**
     * Configure les gestionnaires responsive pour les panneaux
     */
    setupResponsiveHandlers() {
        // Support tactile pour le glissement du panneau (mobile)
        if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
            this.setupMobilePanelGestures();
        }

        // Redimensionnement de fenêtre
        window.addEventListener('resize', () => {
            // Réinitialiser les gestes mobiles si nécessaire
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                this.setupMobilePanelGestures();
            }
        });
    }

    /**
     * Configure les écouteurs d'événements globaux pour les panneaux
     */
    setupGlobalEventListeners() {
        // Fermeture avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllPanels();
            }
        });

        // Fermeture des panneaux en cliquant à l'extérieur (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                if (!this.elements.mainPanel?.contains(e.target) && 
                    !this.elements.settingsBtn?.contains(e.target) &&
                    !this.elements.mainPanel?.classList.contains('collapsed')) {
                    this.closeMainPanel();
                }
            }
        });
    }
}