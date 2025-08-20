require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import des routes
const authRoutes = require('./routes/auth');
const mapsRoutes = require('./routes/maps');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:5500', 
        'http://localhost:8000',
        'https://guerin-remi.github.io', // GitHub Pages
        'https://guerin-remi.github.io/MakeMyWay', // Sous-domaine si nécessaire
        process.env.FRONTEND_URL // Variable d'environnement pour flexibilité
    ].filter(Boolean), // Supprimer les valeurs undefined
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connexion à MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Erreur connexion MongoDB:', error.message);
        process.exit(1);
    }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapsRoutes);

// Route de test
app.get('/api/health', (req, res) => {
    res.json({
        message: 'MakeMyWay Backend API fonctionnel',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} non trouvée`
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erreur interne du serveur',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Démarrage du serveur
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Serveur MakeMyWay démarré sur le port ${PORT}`);
        console.log(`📍 API disponible à: http://localhost:${PORT}/api`);
        console.log(`🔍 Test: http://localhost:${PORT}/api/health`);
    });
};

startServer().catch(error => {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
});

module.exports = app;