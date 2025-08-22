/**
 * Gestionnaire de feedback visuel pour la génération de parcours
 * Améliore l'expérience utilisateur avec des messages et animations
 */
export class RouteFeedback {
    constructor() {
        this.feedbackElement = null;
        this.progressBar = null;
        this.currentAttempt = 0;
        this.maxAttempts = 8;
        this.initFeedbackUI();
    }

    /**
     * Initialise l'interface de feedback
     */
    initFeedbackUI() {
        // Créer le conteneur de feedback s'il n'existe pas
        if (!document.getElementById('route-feedback')) {
            const feedbackHTML = `
                <div id="route-feedback" class="route-feedback hidden">
                    <div class="feedback-content">
                        <div class="feedback-icon">
                            <span class="spinner"></span>
                        </div>
                        <div class="feedback-message">
                            <h3 class="feedback-title">Génération du parcours...</h3>
                            <p class="feedback-text">Recherche du meilleur itinéraire</p>
                        </div>
                        <div class="feedback-progress">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <span class="attempt-counter">Tentative 1/8</span>
                        </div>
                        <div class="feedback-details hidden">
                            <span class="distance-info"></span>
                            <span class="tolerance-info"></span>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', feedbackHTML);
            this.feedbackElement = document.getElementById('route-feedback');
            this.progressBar = this.feedbackElement.querySelector('.progress-fill');
            
            // Ajouter les styles CSS
            this.injectStyles();
        }
    }

    /**
     * Injecte les styles CSS pour le feedback
     */
    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .route-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: var(--radius-xl);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                padding: var(--space-4);
                z-index: 10000;
                min-width: 320px;
                max-width: 90vw;
                animation: slideIn 0.3s ease-out;
            }

            .route-feedback.hidden {
                display: none;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -40%);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
            }

            .feedback-content {
                text-align: center;
            }

            .feedback-icon {
                margin-bottom: var(--space-3);
            }

            .spinner {
                display: inline-block;
                width: 48px;
                height: 48px;
                border: 4px solid var(--border);
                border-top-color: var(--primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .feedback-title {
                font-size: 1.2rem;
                margin-bottom: var(--space-1);
                color: var(--text-primary);
            }

            .feedback-text {
                color: var(--text-secondary);
                margin-bottom: var(--space-3);
            }

            .progress-bar {
                height: 6px;
                background: var(--bg-secondary);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: var(--space-2);
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary), var(--primary-dark));
                width: 0%;
                transition: width 0.3s ease;
            }

            .attempt-counter {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }

            .feedback-details {
                margin-top: var(--space-2);
                padding-top: var(--space-2);
                border-top: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                font-size: 0.85rem;
                color: var(--text-secondary);
            }

            .feedback-details.hidden {
                display: none;
            }

            /* États de succès et d'erreur */
            .route-feedback.success .feedback-icon {
                color: var(--success);
            }

            .route-feedback.success .spinner {
                display: none;
            }

            .route-feedback.success .feedback-icon::after {
                content: "✓";
                font-size: 48px;
                animation: scaleIn 0.3s ease;
            }

            .route-feedback.error .feedback-icon {
                color: var(--error);
            }

            .route-feedback.error .spinner {
                display: none;
            }

            .route-feedback.error .feedback-icon::after {
                content: "✕";
                font-size: 48px;
            }

            @keyframes scaleIn {
                from {
                    transform: scale(0);
                }
                to {
                    transform: scale(1);
                }
            }

            /* Adaptation mobile */
            @media (max-width: 768px) {
                .route-feedback {
                    min-width: 280px;
                    padding: var(--space-3);
                    top: auto;
                    bottom: 80px;
                    transform: translateX(-50%);
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Affiche le feedback de génération
     * @param {Object} options - Options d'affichage
     */
    show(options = {}) {
        const {
            title = 'Génération du parcours...',
            message = 'Recherche du meilleur itinéraire',
            showProgress = true
        } = options;

        this.currentAttempt = 0;
        this.feedbackElement.classList.remove('hidden', 'success', 'error');
        
        this.updateContent({
            title,
            message,
            showProgress
        });
    }

    /**
     * Met à jour le contenu du feedback
     * @param {Object} content - Contenu à afficher
     */
    updateContent(content) {
        const { title, message, showProgress } = content;
        
        const titleEl = this.feedbackElement.querySelector('.feedback-title');
        const textEl = this.feedbackElement.querySelector('.feedback-text');
        const progressEl = this.feedbackElement.querySelector('.feedback-progress');
        
        if (title) titleEl.textContent = title;
        if (message) textEl.textContent = message;
        if (showProgress !== undefined) {
            progressEl.style.display = showProgress ? 'block' : 'none';
        }
    }

    /**
     * Met à jour la progression
     * @param {number} attempt - Numéro de tentative
     * @param {Object} details - Détails de la tentative
     */
    updateProgress(attempt, details = {}) {
        this.currentAttempt = attempt;
        const progress = (attempt / this.maxAttempts) * 100;
        
        // Mettre à jour la barre de progression
        this.progressBar.style.width = `${progress}%`;
        
        // Mettre à jour le compteur
        const counter = this.feedbackElement.querySelector('.attempt-counter');
        counter.textContent = `Tentative ${attempt}/${this.maxAttempts}`;
        
        // Afficher les détails si fournis
        if (details.distance || details.tolerance) {
            const detailsEl = this.feedbackElement.querySelector('.feedback-details');
            detailsEl.classList.remove('hidden');
            
            if (details.distance) {
                const distanceEl = detailsEl.querySelector('.distance-info');
                distanceEl.textContent = `Distance: ${details.distance.toFixed(1)}km`;
            }
            
            if (details.tolerance) {
                const toleranceEl = detailsEl.querySelector('.tolerance-info');
                toleranceEl.textContent = `Tolérance: ±${(details.tolerance * 100).toFixed(0)}%`;
            }
        }
        
        // Messages variés selon la progression
        const messages = [
            'Optimisation du parcours...',
            'Ajustement de la distance...',
            'Intégration des points d\'intérêt...',
            'Calcul de l\'itinéraire optimal...',
            'Finalisation du parcours...'
        ];
        
        const messageIndex = Math.min(Math.floor(attempt / 2), messages.length - 1);
        this.updateContent({ message: messages[messageIndex] });
    }

    /**
     * Affiche un succès
     * @param {string} message - Message de succès
     * @param {number} duration - Durée d'affichage en ms
     */
    showSuccess(message = 'Parcours généré avec succès !', duration = 2000) {
        this.feedbackElement.classList.add('success');
        this.feedbackElement.classList.remove('error');
        
        this.updateContent({
            title: 'Succès',
            message,
            showProgress: false
        });
        
        // Masquer automatiquement après la durée
        setTimeout(() => this.hide(), duration);
    }

    /**
     * Affiche une erreur
     * @param {string} message - Message d'erreur
     * @param {number} duration - Durée d'affichage en ms
     */
    showError(message = 'Impossible de générer le parcours', duration = 3000) {
        this.feedbackElement.classList.add('error');
        this.feedbackElement.classList.remove('success');
        
        this.updateContent({
            title: 'Erreur',
            message,
            showProgress: false
        });
        
        // Masquer automatiquement après la durée
        if (duration > 0) {
            setTimeout(() => this.hide(), duration);
        }
    }

    /**
     * Masque le feedback
     */
    hide() {
        this.feedbackElement.classList.add('hidden');
        
        // Réinitialiser après l'animation
        setTimeout(() => {
            this.feedbackElement.classList.remove('success', 'error');
            this.progressBar.style.width = '0%';
        }, 300);
    }

    /**
     * Affiche un message temporaire
     * @param {string} message - Message à afficher
     * @param {string} type - Type de message (info, success, error)
     * @param {number} duration - Durée d'affichage
     */
    showToast(message, type = 'info', duration = 3000) {
        const toastHTML = `
            <div class="route-toast route-toast-${type}">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toastHTML);
        const toast = document.body.lastElementChild;
        
        // Ajouter les styles pour le toast
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .route-toast {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-full);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    z-index: 10001;
                    animation: toastSlideIn 0.3s ease;
                }

                @keyframes toastSlideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }

                .route-toast-success {
                    background: var(--success-light);
                    color: var(--success-dark);
                }

                .route-toast-error {
                    background: var(--error-light);
                    color: var(--error-dark);
                }

                .route-toast-info {
                    background: var(--primary-light);
                    color: var(--primary-dark);
                }

                .toast-icon {
                    font-size: 1.2rem;
                }

                .toast-message {
                    font-size: 0.9rem;
                    font-weight: 500;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Animation de sortie et suppression
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Obtient l'icône pour un type de toast
     * @param {string} type - Type de toast
     * @returns {string} Icône
     */
    getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };
        return icons[type] || icons.info;
    }
}

// Export singleton
export default new RouteFeedback();