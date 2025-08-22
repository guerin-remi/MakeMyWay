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
            settingsBtn: elements.settingsBtn   // Bouton settings
        };

        // Initialiser le bottom sheet en mode collapsed (barre d'action seule visible)
        if (this.elements.mainPanel) {
            this.elements.mainPanel.classList.add('collapsed');
        }
        
        // Initialiser le bouton de géolocalisation visible (panneau replié)
        this.updateGeolocationButtonVisibility('collapsed');
    }

    /**
     * Toggle du panneau principal (bottom sheet) - maintenant par geste tactile uniquement
     */
    toggleMainPanel() {
        if (this.elements.mainPanel) {
            if (this.elements.mainPanel.classList.contains('collapsed')) {
                this.elements.mainPanel.classList.remove('collapsed');
                this.elements.mainPanel.classList.add('peek');
                this.updateGeolocationButtonVisibility('peek');
            } else {
                this.closeMainPanel();
            }
        }
    }

    /**
     * Ferme le panneau principal
     */
    closeMainPanel() {
        if (this.elements.mainPanel) {
            this.elements.mainPanel.classList.remove('peek', 'half', 'full');
            this.elements.mainPanel.classList.add('collapsed');
            this.updateGeolocationButtonVisibility('collapsed');
        }
    }

    /**
     * Met à jour la visibilité du bouton de géolocalisation selon l'état du panneau
     * @param {string} panelState - État du panneau: 'collapsed', 'peek', 'half', 'full'
     */
    updateGeolocationButtonVisibility(panelState) {
        const geoBtn = document.getElementById('geoLocationBtn');
        if (!geoBtn) return;

        // Supprimer toutes les classes d'état
        geoBtn.classList.remove('panel-open', 'panel-closed');

        if (panelState === 'collapsed') {
            // Panneau fermé : bouton visible
            geoBtn.classList.add('panel-closed');
            console.log('🔧 Bouton géolocalisation: VISIBLE (panneau fermé)');
        } else {
            // Panneau ouvert (peek, half, full) : bouton masqué
            geoBtn.classList.add('panel-open');
            console.log('🔧 Bouton géolocalisation: MASQUÉ (panneau ouvert)');
        }
    }

    /**
     * Toggle du panneau d'aide (maintenant via settings)
     */
    toggleHelpPanel() {
        if (this.elements.helpPanel && this.elements.settingsBtn) {
            this.elements.settingsBtn.classList.toggle('active');
            this.elements.helpPanel.classList.toggle('show');
        }
    }

    /**
     * Ferme le panneau d'aide
     */
    closeHelpPanel() {
        if (this.elements.helpPanel && this.elements.settingsBtn) {
            this.elements.settingsBtn.classList.remove('active');
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
     * Configure les gestes tactiles pour le bottom sheet moderne
     */
    setupMobilePanelGestures() {
        const panel = this.elements.mainPanel;
        const panelHandle = panel?.querySelector('.panel-handle');
        const panelHeader = panel?.querySelector('.panel-header');
        
        if (!panel) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let currentState = 'collapsed'; // collapsed, peek, half, full

        // États du bottom sheet
        const states = {
            collapsed: { height: '80px', class: 'collapsed' },
            peek: { height: '30vh', class: 'peek' },
            half: { height: '50vh', class: 'half' },
            full: { height: '85vh', class: 'full' }
        };

        const setBottomSheetState = (state) => {
            panel.classList.remove('collapsed', 'peek', 'half', 'full');
            panel.classList.add(states[state].class);
            currentState = state;
            // Mettre à jour la visibilité du bouton de géolocalisation
            this.updateGeolocationButtonVisibility(state);
        };

        // Initialiser en mode collapsed
        setBottomSheetState('collapsed');

        const elements = [panelHandle, panelHeader].filter(Boolean);
        
        elements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                isDragging = true;
                panel.style.transition = 'none';
            }, { passive: true });

            // Double tap sur le handle pour mode full
            let tapCount = 0;
            element.addEventListener('touchend', (e) => {
                if (!isDragging) {
                    tapCount++;
                    setTimeout(() => {
                        if (tapCount === 1) {
                            // Single tap : next state
                            const nextState = currentState === 'collapsed' ? 'peek' :
                                            currentState === 'peek' ? 'half' : 
                                            currentState === 'half' ? 'full' : 'peek';
                            setBottomSheetState(nextState);
                        } else if (tapCount === 2) {
                            // Double tap : full state
                            setBottomSheetState('full');
                        }
                        tapCount = 0;
                    }, 300);
                }
            });
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // Limiter le drag vers le haut et le bas
            if (Math.abs(deltaY) > 10) {
                try {
                    e.preventDefault();
                } catch (err) {
                    // Ignore passive listener errors
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            const deltaY = currentY - startY;
            panel.style.transition = '';
            
            // Seuils de déclenchement
            const threshold = 50;
            
            if (deltaY < -threshold) {
                // Swipe up : état suivant
                const nextState = currentState === 'collapsed' ? 'peek' :
                                currentState === 'peek' ? 'half' : 
                                currentState === 'half' ? 'full' : 'full';
                setBottomSheetState(nextState);
            } else if (deltaY > threshold) {
                // Swipe down : état précédent ou repli vers collapsed
                if (currentState === 'peek') {
                    // Replier vers l'état collapsed au lieu de fermer complètement
                    setBottomSheetState('collapsed');
                } else if (currentState === 'half') {
                    setBottomSheetState('peek');
                } else if (currentState === 'full') {
                    setBottomSheetState('half');
                }
            }
            
            isDragging = false;
            startY = 0;
            currentY = 0;
        });

        // Exposer la méthode pour usage externe
        panel._setBottomSheetState = setBottomSheetState;
        
        // Ajouter l'interactivité pour le champ de recherche en mode collapsed
        const searchBarPrimary = panel.querySelector('.search-bar-primary');
        const searchInputContainer = panel.querySelector('.search-input-container');
        const searchPlaceholder = panel.querySelector('.search-placeholder');
        const destinationInput = panel.querySelector('#destinationAddress');
        
        if (searchInputContainer && destinationInput && searchPlaceholder) {
            // Clic sur la barre de recherche en mode collapsed
            searchInputContainer.addEventListener('click', (e) => {
                if (currentState === 'collapsed') {
                    setBottomSheetState('peek');
                    // Afficher le vrai champ et masquer le placeholder
                    searchPlaceholder.style.display = 'none';
                    destinationInput.style.display = 'block';
                    // Focus automatique sur le champ après ouverture
                    setTimeout(() => {
                        destinationInput.focus();
                    }, 100);
                }
            });
            
            // Focus sur le champ de recherche en mode collapsed
            destinationInput.addEventListener('focus', (e) => {
                if (currentState === 'collapsed') {
                    setBottomSheetState('peek');
                }
            });
            
            // Gérer l'affichage du placeholder vs input
            destinationInput.addEventListener('blur', (e) => {
                if (!destinationInput.value && currentState === 'collapsed') {
                    searchPlaceholder.style.display = 'block';
                    destinationInput.style.display = 'none';
                }
            });
        }
    }

    /**
     * Configure les gestionnaires responsive pour les panneaux
     */
    setupResponsiveHandlers() {
        // Support tactile pour le bottom sheet (tous écrans)
        this.setupMobilePanelGestures();

        // Redimensionnement de fenêtre
        window.addEventListener('resize', () => {
            // Le bottom sheet fonctionne sur tous les écrans maintenant
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

        // Fermeture des panneaux en cliquant à l'extérieur (mobile) - maintenant uniquement par geste
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= CONFIG.UI.BREAKPOINTS.MOBILE) {
                // Panneau contrôlé uniquement par gestes tactiles
                // Plus de fermeture par clic extérieur pour éviter fermeture accidentelle
            }
        });
    }
}