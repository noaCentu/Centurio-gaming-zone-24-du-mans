const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs'); // 🛠️ NOUVEAU : Outil pour créer et lire des fichiers

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ ---
const MOT_DE_PASSE_MATIN = "admincenturio25"; 
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 

// 🧠 LA MÉMOIRE ABSOLUE DU SERVEUR
const memoireJoueurs = {}; 

// --- 📊 GESTION DU FICHIER DE STATISTIQUES ---
const statsFilePath = path.join(__dirname, 'stats.json');
let stats = { totalVisiteurs: 0, totalGagnants: 0 };

// Si le fichier existe déjà, on le charge pour ne pas repartir de zéro
if (fs.existsSync(statsFilePath)) {
    const rawData = fs.readFileSync(statsFilePath);
    stats = JSON.parse(rawData);
}

// Fonction qui écrit les chiffres dans le fichier
function sauvegarderStats() {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
        socket.join(userId); 
        
        // 📊 STATS : Si c'est la toute première fois qu'on voit cette empreinte
        if (!memoireJoueurs[userId]) {
            memoireJoueurs[userId] = [];
            stats.totalVisiteurs++; // On ajoute +1 au compteur des visiteurs
            sauvegarderStats(); // On sauvegarde dans le fichier
        }
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

// --- ROUTE DE VALIDATION DU SCANNER ---
app.post('/api/validate', (req, res) => {
    const { userId, gameId, token } = req.body;

    if (token === ADMIN_TOKEN) {
        
        // Sécurité au cas où le joueur n'a pas été détecté au lancement
        if (!memoireJoueurs[userId]) {
            memoireJoueurs[userId] = [];
            stats.totalVisiteurs++;
            sauvegarderStats();
        }

        if (memoireJoueurs[userId].includes(gameId)) {
            return res.json({ success: false, message: "⚠️ Ce joueur a DÉJÀ validé ce défi précis !" });
        }

        if (memoireJoueurs[userId].length >= 7) {
            return res.json({ success: false, message: "🛑 TRICHE : Ce joueur a déjà eu son cadeau !" });
        }

        // On enregistre la victoire
        memoireJoueurs[userId].push(gameId);

        // 📊 STATS : Si avec ce scan, il atteint exactement 7 défis validés
        if (memoireJoueurs[userId].length === 7) {
            stats.totalGagnants++; // On ajoute +1 au compteur des gagnants
            sauvegarderStats(); // On sauvegarde
        }

        io.to(userId).emit('challenge_validated', gameId);
        res.json({ success: true });

    } else {
        res.json({ success: false, message: "🚨 TENTATIVE DE FRAUDE ! Vous n'êtes pas Staff." });
    }
});

// --- 🕵️‍♂️ ROUTE SECRÈTE POUR VOIR LES STATS EN DIRECT ---
app.get('/api/stats_centurio_secret', (req, res) => {
    // Cette page affichera simplement le contenu du fichier
    res.json(stats);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur Centurio sécurisé démarré sur le port ${PORT}`);
});
