require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Test de connexion MongoDB...');
console.log('URI:', process.env.MONGO_URI.replace(/:[^:@]+@/, ':***@')); // Masquer le mot de passe

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Connexion MongoDB réussie !');
        console.log('📊 Base de données:', mongoose.connection.name);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Erreur connexion MongoDB:', error.message);
        console.log('\n💡 Vérifiez que :');
        console.log('- Username/password sont corrects dans .env');
        console.log('- L\'utilisateur existe dans MongoDB Atlas');
        console.log('- Votre IP est autorisée (Network Access)');
        process.exit(1);
    });