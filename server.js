const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ ---
const MOT_DE_PASSE_MATIN = "admincenturio26"; 
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 

// 🧠 LA MÉMOIRE ABSOLUE DU SERVEUR
// On va stocker les défis de chaque joueur sous cette forme : { "id_du_telephone": ["mk", "mp"] }
const memoireJoueurs = {}; 

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
        socket.join(userId); 
    });
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === MOT_DE_PASSE_MATIN) {
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.json({ success: false });
    }
});

// --- ROUTE DE VALIDATION DU SCANNER (ULTRA SÉCURISÉE) ---
app.post('/api/validate', (req, res) => {
    const { userId, gameId, token } = req.body;

    // 1. Est-ce bien un animateur ?
    if (token === ADMIN_TOKEN) {
        
        // 2. Si c'est un nouveau joueur qu'on n'a jamais vu, on lui crée un dossier vide
        if (!memoireJoueurs[userId]) {
            memoireJoueurs[userId] = [];
        }

        // 3. 🚨 ANTI-TRICHE : Est-ce qu'il a DÉJÀ fait ce défi précis ?
        if (memoireJoueurs[userId].includes(gameId)) {
            return res.json({ success: false, message: "⚠️ Ce joueur a DÉJÀ validé ce défi précis !" });
        }

        // 4. 🚨 ANTI-TRICHE : Est-ce qu'il a déjà fait les 7 défis au total ?
        if (memoireJoueurs[userId].length >= 7) {
            return res.json({ success: false, message: "🛑 Ce joueur a déjà eu son cadeau !" });
        }

        // 5. TOUT EST BON ! On enregistre la victoire dans la mémoire du serveur
        memoireJoueurs[userId].push(gameId);

        // On envoie l'animation au joueur
        io.to(userId).emit('challenge_validated', gameId);
        res.json({ success: true });

    } else {
        // Le token est faux
        res.json({ success: false, message: "🚨 TENTATIVE DE FRAUDE ! Vous n'êtes pas Staff." });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur Centurio sécurisé démarré sur le port ${PORT}`);
});
