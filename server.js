const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ CENTURIO ---
const MOT_DE_PASSE_MATIN = "admincenturio25";
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; // Le badge invisible donné au téléphone

app.use(express.static('public'));
app.use(express.json());

// Gestion des connexions temps réel
io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
        socket.join(userId); 
        console.log('📱 Un visiteur est connecté avec l\'ID :', userId);
    });
});

// --- ROUTE 1 : Connexion de l'animateur le matin ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === MOT_DE_PASSE_MATIN) {
        // Mot de passe correct, on donne le badge invisible !
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.json({ success: false });
    }
});

// --- ROUTE 2 : Validation ultra-sécurisée du défi ---
app.post('/api/validate', (req, res) => {
    const { userId, gameId, token } = req.body;

    // Le serveur vérifie que le téléphone possède bien le badge invisible
    if (token === ADMIN_TOKEN) {
        io.to(userId).emit('challenge_validated', gameId);
        res.json({ success: true });
        console.log(`✅ Défi ${gameId} validé pour le joueur ${userId}`);
    } else {
        res.json({ success: false, message: "🚨 TENTATIVE DE TRICHE ! Vous n'êtes pas animateur." });
        console.log(`❌ Tentative de triche bloquée pour le défi ${gameId}`);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur Centurio sécurisé démarré sur http://localhost:${PORT}`);
});