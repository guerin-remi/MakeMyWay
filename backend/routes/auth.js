const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// Fonction pour générer un JWT
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '7d' // Token valide 7 jours
    });
};

// Validation des données d'entrée
const validateRegisterInput = (name, email, password) => {
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
};

// Middleware d'authentification
const auth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token manquant - accès refusé'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.userId };
        next();
        
    } catch (error) {
        console.error('❌ Erreur authentification middleware:', error);
        res.status(401).json({
            success: false,
            message: 'Token invalide - accès refusé'
        });
    }
};

// Route d'inscription
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log('📝 Tentative d\'inscription:', { name, email });
        
        // Validation des données
        const validationErrors = validateRegisterInput(name, email, password);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: validationErrors
            });
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Un compte existe déjà avec cet email'
            });
        }
        
        // Créer le nouvel utilisateur
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password
        });
        
        // Sauvegarder l'utilisateur (le mot de passe sera hashé automatiquement)
        const savedUser = await newUser.save();
        
        // Générer le token JWT
        const token = generateToken(savedUser._id);
        
        console.log('✅ Nouvel utilisateur créé:', savedUser.email);
        
        res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            token: token,
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                createdAt: savedUser.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation',
                errors: validationErrors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Route de connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Tentative de connexion:', { email });
        
        // Validation des données
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }
        
        // Trouver l'utilisateur par email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }
        
        // Vérifier le mot de passe
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email ou mot de passe incorrect'
            });
        }
        
        // Générer le token JWT
        const token = generateToken(user._id);
        
        console.log('✅ Connexion réussie pour:', user.email);
        
        res.status(200).json({
            success: true,
            message: 'Connexion réussie',
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// Route de vérification du token (optionnelle, pour validation côté client)
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token manquant'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token invalide'
            });
        }
        
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur vérification token:', error);
        res.status(401).json({
            success: false,
            message: 'Token invalide ou expiré'
        });
    }
});

// Route pour mettre à jour le profil
router.put('/profile', auth, async (req, res) => {
    try {
        const { name } = req.body;

        // Validation
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                message: 'Le nom doit contenir au moins 2 caractères',
                errors: ['Nom invalide']
            });
        }

        // Mettre à jour l'utilisateur
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name: name.trim() },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                message: 'Utilisateur non trouvé'
            });
        }

        console.log(`✅ Profil mis à jour pour ${user.email}: ${user.name}`);

        res.json({
            message: 'Profil mis à jour avec succès',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Erreur mise à jour profil:', error);
        res.status(500).json({
            message: 'Erreur serveur lors de la mise à jour du profil'
        });
    }
});

// Route pour mettre à jour le mot de passe
router.put('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: 'Mot de passe actuel et nouveau mot de passe requis'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
            });
        }

        // Récupérer l'utilisateur avec le mot de passe
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier le mot de passe actuel
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                message: 'Mot de passe actuel incorrect'
            });
        }

        // Hacher le nouveau mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Mettre à jour le mot de passe
        await User.findByIdAndUpdate(req.user.id, {
            password: hashedPassword
        });

        console.log(`✅ Mot de passe mis à jour pour ${user.email}`);

        res.json({
            message: 'Mot de passe mis à jour avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur mise à jour mot de passe:', error);
        res.status(500).json({
            message: 'Erreur serveur lors de la mise à jour du mot de passe'
        });
    }
});

// Route pour supprimer le compte
router.delete('/delete', auth, async (req, res) => {
    try {
        const { password } = req.body;

        // Validation
        if (!password) {
            return res.status(400).json({
                message: 'Mot de passe de confirmation requis'
            });
        }

        // Récupérer l'utilisateur avec le mot de passe
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérifier le mot de passe de confirmation
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                message: 'Mot de passe de confirmation incorrect'
            });
        }

        // Supprimer l'utilisateur
        await User.findByIdAndDelete(req.user.id);

        console.log(`✅ Compte supprimé pour ${user.email}`);

        res.json({
            message: 'Compte supprimé avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur suppression compte:', error);
        res.status(500).json({
            message: 'Erreur serveur lors de la suppression du compte'
        });
    }
});

module.exports = router;