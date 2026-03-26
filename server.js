const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // <-- NOUVEAU : Outil pour gérer les dossiers sur Linux

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ CENTURIO ---
const MOT_DE_PASSE_MATIN = "centurio24"; 
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 

// <-- NOUVEAU : On force le serveur à trouver le dossier exact pour Render
app.use(express.static(path.join(__dirname, 'public')));
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
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.json({ success: false });
    }
});

// --- ROUTE 2 : Validation ultra-sécurisée du défi ---
app.post('/api/validate', (req, res) => {
    const { userId, gameId, token } = req.body;

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
    console.log(`🚀 Serveur Centurio sécurisé démarré sur le port ${PORT}`);
});
