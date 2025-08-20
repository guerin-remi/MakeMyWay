/**
 * Service d'authentification pour MakeMyWay
 * Gère l'inscription, la connexion et les tokens JWT
 */
export class AuthService {
    constructor() {
        // Détection automatique de l'environnement
        this.baseURL = this.getApiBaseUrl();
        this.token = localStorage.getItem('makemyway_token');
        this.user = this.loadUserFromStorage();
        this.isAuthenticated = !!this.token;
        
        console.log(`🔧 AuthService configuré pour: ${this.baseURL}`);
    }

    /**
     * Détermine l'URL de l'API selon l'environnement
     * @returns {string} URL de base de l'API
     */
    getApiBaseUrl() {
        // Si on est sur GitHub Pages ou un domaine de production
        if (window.location.hostname.includes('github.io') || 
            window.location.hostname.includes('makemyway') ||
            window.location.protocol === 'https:') {
            return 'https://makemyway-backend.onrender.com/api/auth';
        }
        
        // Sinon on est en développement local
        return 'http://localhost:3001/api/auth';
    }

    /**
     * Charge les données utilisateur depuis le localStorage
     * @returns {Object|null} Données utilisateur ou null
     */
    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('makemyway_user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Erreur chargement données utilisateur:', error);
            return null;
        }
    }

    /**
     * Sauvegarde les données utilisateur dans le localStorage
     * @param {Object} user - Données utilisateur
     */
    saveUserToStorage(user) {
        try {
            localStorage.setItem('makemyway_user', JSON.stringify(user));
            this.user = user;
        } catch (error) {
            console.error('Erreur sauvegarde données utilisateur:', error);
        }
    }

    /**
     * Inscription d'un nouvel utilisateur
     * @param {string} name - Nom de l'utilisateur
     * @param {string} email - Email de l'utilisateur
     * @param {string} password - Mot de passe
     * @returns {Promise<Object>} Résultat de l'inscription
     */
    async register(name, email, password) {
        try {
            console.log('📝 Tentative d\'inscription:', { name, email });

            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de l\'inscription');
            }

            // Sauvegarde du token et des données utilisateur
            this.token = data.token;
            this.isAuthenticated = true;
            localStorage.setItem('makemyway_token', this.token);
            this.saveUserToStorage(data.user);

            console.log('✅ Inscription réussie:', data.user.name);
            return { success: true, user: data.user, message: data.message };

        } catch (error) {
            console.error('❌ Erreur inscription:', error);
            return { 
                success: false, 
                message: error.message,
                errors: error.errors || []
            };
        }
    }

    /**
     * Connexion d'un utilisateur existant
     * @param {string} email - Email de l'utilisateur
     * @param {string} password - Mot de passe
     * @returns {Promise<Object>} Résultat de la connexion
     */
    async login(email, password) {
        try {
            console.log('🔐 Tentative de connexion:', { email });

            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de la connexion');
            }

            // Sauvegarde du token et des données utilisateur
            this.token = data.token;
            this.isAuthenticated = true;
            localStorage.setItem('makemyway_token', this.token);
            this.saveUserToStorage(data.user);

            console.log('✅ Connexion réussie:', data.user.name);
            return { success: true, user: data.user, message: data.message };

        } catch (error) {
            console.error('❌ Erreur connexion:', error);
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    /**
     * Vérification de la validité du token
     * @returns {Promise<boolean>} True si le token est valide
     */
    async verifyToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseURL}/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Token invalide');
            }

            const data = await response.json();
            this.saveUserToStorage(data.user);
            this.isAuthenticated = true;
            
            console.log('✅ Token valide:', data.user.name);
            return true;

        } catch (error) {
            console.warn('⚠️ Token invalide ou expiré:', error.message);
            this.logout();
            return false;
        }
    }

    /**
     * Déconnexion de l'utilisateur
     */
    logout() {
        console.log('👋 Déconnexion utilisateur');
        
        // Suppression des données locales
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        localStorage.removeItem('makemyway_token');
        localStorage.removeItem('makemyway_user');
    }

    /**
     * Obtient les données utilisateur actuelles
     * @returns {Object|null} Données utilisateur ou null
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Vérifie si l'utilisateur est connecté
     * @returns {boolean} True si connecté
     */
    isLoggedIn() {
        return this.isAuthenticated && !!this.token;
    }

    /**
     * Obtient le token d'authentification
     * @returns {string|null} Token JWT ou null
     */
    getToken() {
        return this.token;
    }

    /**
     * Obtient les headers d'authentification pour les requêtes API
     * @returns {Object} Headers avec Authorization si connecté
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Initialise le service d'authentification
     * Vérifie automatiquement la validité du token au démarrage
     * @returns {Promise<boolean>} True si l'utilisateur est connecté
     */
    async initialize() {
        console.log('🔧 Initialisation du service d\'authentification...');
        
        if (this.token) {
            const isValid = await this.verifyToken();
            if (isValid) {
                console.log('✅ Utilisateur connecté:', this.user?.name);
                return true;
            }
        }
        
        console.log('👤 Utilisateur non connecté');
        return false;
    }

    /**
     * Validation côté client des données d'inscription
     * @param {string} name - Nom
     * @param {string} email - Email
     * @param {string} password - Mot de passe
     * @returns {Array} Liste des erreurs (vide si valide)
     */
    validateRegisterData(name, email, password) {
        const errors = [];

        if (!name || name.trim().length < 2) {
            errors.push('Le nom doit contenir au moins 2 caractères');
        }

        if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            errors.push('Veuillez fournir un email valide');
        }

        if (!password || password.length < 6) {
            errors.push('Le mot de passe doit contenir au moins 6 caractères');
        }

        return errors;
    }

    /**
     * Validation côté client des données de connexion
     * @param {string} email - Email
     * @param {string} password - Mot de passe
     * @returns {Array} Liste des erreurs (vide si valide)
     */
    validateLoginData(email, password) {
        const errors = [];

        if (!email) {
            errors.push('Email requis');
        }

        if (!password) {
            errors.push('Mot de passe requis');
        }

        return errors;
    }
}