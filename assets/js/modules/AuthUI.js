import { AuthService } from './AuthService.js';

/**
 * Gestionnaire d'interface utilisateur pour l'authentification
 */
export class AuthUI {
    constructor() {
        this.authService = new AuthService();
        this.initializeElements();
        this.attachEventListeners();
    }

    /**
     * Initialise les références aux éléments DOM
     */
    initializeElements() {
        // Bouton utilisateur
        this.userBtn = document.getElementById('userBtn');
        this.userBtnText = document.getElementById('userBtnText');
        
        // Modales
        this.loginModal = document.getElementById('loginModal');
        this.registerModal = document.getElementById('registerModal');
        
        // Menu utilisateur
        this.userMenu = document.getElementById('userMenu');
        this.userName = document.getElementById('userName');
        this.userEmail = document.getElementById('userEmail');
        
        // Formulaires
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        
        // Boutons de contrôle
        this.closeLogin = document.getElementById('closeLogin');
        this.closeRegister = document.getElementById('closeRegister');
        this.showRegister = document.getElementById('showRegister');
        this.showLogin = document.getElementById('showLogin');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    /**
     * Attache les événements aux éléments
     */
    attachEventListeners() {
        // Bouton utilisateur principal
        this.userBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleUserButtonClick();
        });

        // Fermeture des modales
        this.closeLogin?.addEventListener('click', () => this.hideLoginModal());
        this.closeRegister?.addEventListener('click', () => this.hideRegisterModal());
        
        // Navigation entre modales
        this.showRegister?.addEventListener('click', () => this.showRegisterModal());
        this.showLogin?.addEventListener('click', () => this.showLoginModal());
        
        // Soumission des formulaires
        this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm?.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Déconnexion
        this.logoutBtn?.addEventListener('click', () => this.handleLogout());

        // Fermeture des modales en cliquant sur l'overlay
        this.loginModal?.addEventListener('click', (e) => {
            if (e.target === this.loginModal) this.hideLoginModal();
        });
        this.registerModal?.addEventListener('click', (e) => {
            if (e.target === this.registerModal) this.hideRegisterModal();
        });

        // Fermeture du menu utilisateur en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!this.userBtn?.contains(e.target) && !this.userMenu?.contains(e.target)) {
                this.hideUserMenu();
            }
        });

        // Échap pour fermer les modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
                this.hideUserMenu();
            }
        });
    }

    /**
     * Gère le clic sur le bouton utilisateur
     */
    handleUserButtonClick() {
        if (this.authService.isLoggedIn()) {
            this.toggleUserMenu();
        } else {
            this.showLoginModal();
        }
    }

    /**
     * Gère la soumission du formulaire de connexion
     * @param {Event} e - Événement du formulaire
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Validation côté client
        const errors = this.authService.validateLoginData(email, password);
        if (errors.length > 0) {
            this.showMessage(this.loginForm, errors.join('<br>'), 'error');
            return;
        }

        // Afficher le loading
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);
        
        try {
            const result = await this.authService.login(email, password);
            
            if (result.success) {
                this.showMessage(this.loginForm, result.message, 'success');
                setTimeout(() => {
                    this.hideLoginModal();
                    this.updateUIForLoggedInUser(result.user);
                    this.showNotification('Connexion réussie !', 'success');
                }, 1000);
            } else {
                this.showMessage(this.loginForm, result.message, 'error');
            }
        } catch (error) {
            this.showMessage(this.loginForm, 'Erreur de connexion', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Gère la soumission du formulaire d'inscription
     * @param {Event} e - Événement du formulaire
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        // Validation côté client
        const errors = this.authService.validateRegisterData(name, email, password);
        if (errors.length > 0) {
            this.showMessage(this.registerForm, errors.join('<br>'), 'error');
            return;
        }

        // Afficher le loading
        const submitBtn = this.registerForm.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);
        
        try {
            const result = await this.authService.register(name, email, password);
            
            if (result.success) {
                this.showMessage(this.registerForm, result.message, 'success');
                setTimeout(() => {
                    this.hideRegisterModal();
                    this.updateUIForLoggedInUser(result.user);
                    this.showNotification(`Bienvenue ${result.user.name} !`, 'success');
                }, 1000);
            } else {
                const errorMessage = result.errors && result.errors.length > 0 
                    ? result.errors.join('<br>') 
                    : result.message;
                this.showMessage(this.registerForm, errorMessage, 'error');
            }
        } catch (error) {
            this.showMessage(this.registerForm, 'Erreur lors de l\'inscription', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Gère la déconnexion
     */
    handleLogout() {
        this.authService.logout();
        this.updateUIForLoggedOutUser();
        this.hideUserMenu();
        this.showNotification('Déconnexion réussie', 'info');
    }

    /**
     * Met à jour l'interface pour un utilisateur connecté
     * @param {Object} user - Données utilisateur
     */
    updateUIForLoggedInUser(user) {
        if (this.userBtn) {
            this.userBtn.classList.add('logged-in');
            this.userBtn.title = `Connecté en tant que ${user.name}`;
        }
        
        if (this.userBtnText) {
            this.userBtnText.textContent = user.name;
        }
        
        if (this.userName) {
            this.userName.textContent = user.name;
        }
        
        if (this.userEmail) {
            this.userEmail.textContent = user.email;
        }

        // Réinitialiser les formulaires
        this.resetForms();
    }

    /**
     * Met à jour l'interface pour un utilisateur déconnecté
     */
    updateUIForLoggedOutUser() {
        if (this.userBtn) {
            this.userBtn.classList.remove('logged-in');
            this.userBtn.title = 'Se connecter';
        }
        
        if (this.userBtnText) {
            this.userBtnText.textContent = 'Connexion';
        }
        
        // Réinitialiser les formulaires
        this.resetForms();
    }

    /**
     * Affiche la modal de connexion
     */
    showLoginModal() {
        this.hideAllModals();
        this.loginModal?.classList.add('active');
        document.getElementById('loginEmail')?.focus();
    }

    /**
     * Affiche la modal d'inscription
     */
    showRegisterModal() {
        this.hideAllModals();
        this.registerModal?.classList.add('active');
        document.getElementById('registerName')?.focus();
    }

    /**
     * Cache la modal de connexion
     */
    hideLoginModal() {
        this.loginModal?.classList.remove('active');
    }

    /**
     * Cache la modal d'inscription
     */
    hideRegisterModal() {
        this.registerModal?.classList.remove('active');
    }

    /**
     * Cache toutes les modales
     */
    hideAllModals() {
        this.hideLoginModal();
        this.hideRegisterModal();
    }

    /**
     * Affiche/cache le menu utilisateur
     */
    toggleUserMenu() {
        if (this.userMenu) {
            this.userMenu.classList.toggle('active');
        }
    }

    /**
     * Cache le menu utilisateur
     */
    hideUserMenu() {
        this.userMenu?.classList.remove('active');
    }

    /**
     * Affiche un message dans un formulaire
     * @param {Element} form - Formulaire cible
     * @param {string} message - Message à afficher
     * @param {string} type - Type de message ('success', 'error', 'info')
     */
    showMessage(form, message, type = 'info') {
        // Supprimer les anciens messages
        const oldMessages = form.querySelectorAll('.error-message, .success-message, .info-message');
        oldMessages.forEach(msg => msg.remove());
        
        // Créer le nouveau message
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-triangle' : 
                    'fas fa-info-circle';
        
        messageDiv.innerHTML = `<i class="${icon}"></i>${message}`;
        
        // Insérer au début du formulaire
        form.insertBefore(messageDiv, form.firstChild);
        
        // Supprimer automatiquement après 5 secondes pour les messages de succès
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }

    /**
     * Active/désactive le state de chargement d'un bouton
     * @param {Element} button - Bouton cible
     * @param {boolean} loading - État de chargement
     */
    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * Réinitialise tous les formulaires
     */
    resetForms() {
        this.loginForm?.reset();
        this.registerForm?.reset();
        
        // Supprimer tous les messages
        document.querySelectorAll('.error-message, .success-message, .info-message')
            .forEach(msg => msg.remove());
    }

    /**
     * Affiche une notification temporaire
     * @param {string} message - Message à afficher
     * @param {string} type - Type de notification
     */
    showNotification(message, type = 'info') {
        // Créer la notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10001;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Animation de sortie et suppression
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    /**
     * Initialise l'interface d'authentification
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('🔧 Initialisation de l\'interface d\'authentification...');
        
        // Vérifier si l'utilisateur est déjà connecté
        const isLoggedIn = await this.authService.initialize();
        
        if (isLoggedIn) {
            const user = this.authService.getCurrentUser();
            this.updateUIForLoggedInUser(user);
        } else {
            this.updateUIForLoggedOutUser();
        }
        
        console.log('✅ Interface d\'authentification initialisée');
    }

    /**
     * Obtient le service d'authentification
     * @returns {AuthService} Service d'authentification
     */
    getAuthService() {
        return this.authService;
    }
}