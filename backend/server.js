require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import des routes
const authRoutes = require('./routes/auth');
const mapsRoutes = require('./routes/maps');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS - Plus permissif pour le debug
app.use(cors({
    origin: function (origin, callback) {
        // Permettre les requêtes sans origin (comme Postman) en développement
        if (!origin && process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:5500', 
            'http://localhost:8000',
            'http://127.0.0.1:8000',
            'https://guerin-remi.github.io',
            'https://guerin-remi.github.io/MakeMyWay',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        // En développement, permettre tout localhost
        if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            return callback(null, true);
        }
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('⚠️ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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