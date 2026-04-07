const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ ---
const MOT_DE_PASSE_MATIN = "admincenturio25"; 
const MOT_DE_PASSE_STATS = "stat2026"; 
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 
const STATS_TOKEN = "jeton_secret_stats_2026_abc"; 

const memoireJoueurs = {}; 

// --- 📊 GESTION DES STATS ET DU QUESTIONNAIRE ---
const statsFilePath = path.join(__dirname, 'stats.json');
let stats = { 
    totalVisiteurs: 0, 
    totalGagnants: 0, 
    totalAdmins: 0,
    surveyRespondents: 0,
    surveyScores: {
        q1: { 1:0, 2:0, 3:0, 4:0, 5:0 }, // Gaming Zone
        q2: { 1:0, 2:0, 3:0, 4:0, 5:0 }, // App mobile
        q3: { 1:0, 2:0, 3:0, 4:0, 5:0 }  // Facilité
    },
    surveyComments: {} // Ex: { "Amélioration du design": 5, "Plus de jeux": 2 }
};

if (fs.existsSync(statsFilePath)) {
    const rawData = fs.readFileSync(statsFilePath);
    stats = JSON.parse(rawData);
    // Rétrocompatibilité si les stats du questionnaire n'existaient pas encore
    if(!stats.surveyScores) {
        stats.surveyRespondents = 0;
        stats.surveyScores = { q1: {1:0,2:0,3:0,4:0,5:0}, q2: {1:0,2:0,3:0,4:0,5:0}, q3: {1:0,2:0,3:0,4:0,5:0} };
        stats.surveyComments = {};
    }
}

function sauvegarderStats() {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
}

// 🧠 LOGIQUE DE REGROUPEMENT DES COMMENTAIRES (IA Basique)
function normalizeComment(text) {
    if (!text) return null;
    let t = text.toLowerCase().trim();
    if (t.length < 2) return null;

    if (t.includes('design') || t.includes('interface') || t.includes('visuel') || t.includes('couleur')) return "Nouveau design / Interface";
    if (t.includes('bug') || t.includes('lent') || t.includes('fluide') || t.includes('chargement')) return "Améliorer la fluidité / Bugs";
    if (t.includes('jeu') || t.includes('défi') || t.includes('defi') || t.includes('stand')) return "Ajouter plus de jeux";
    if (t.includes('cadeau') || t.includes('lot') || t.includes('recompense')) return "De meilleurs cadeaux";
    
    // Si pas de mot-clé, on met une majuscule et on renvoie le texte tel quel
    return text.charAt(0).toUpperCase() + text.slice(1);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
        socket.join(userId); 
        if (!memoireJoueurs[userId]) {
            memoireJoueurs[userId] = [];
            stats.totalVisiteurs++; 
            sauvegarderStats(); 
        }
    });
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === MOT_DE_PASSE_MATIN) {
        stats.totalAdmins++; sauvegarderStats();
        res.json({ success: true, token: ADMIN_TOKEN, role: 'admin' });
    } else if (password === MOT_DE_PASSE_STATS) {
        res.json({ success: true, token: STATS_TOKEN, role: 'stats' });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/validate', (req, res) => {
    const { userId, gameId, token } = req.body;
    if (token === ADMIN_TOKEN) {
        if (!memoireJoueurs[userId]) { memoireJoueurs[userId] = []; stats.totalVisiteurs++; sauvegarderStats(); }
        if (memoireJoueurs[userId].includes(gameId)) return res.json({ success: false, message: "⚠️ Ce joueur a DÉJÀ validé ce défi !" });
        if (memoireJoueurs[userId].length >= 8) return res.json({ success: false, message: "🛑 TRICHE : Cadeau déjà récupéré !" });
        
        memoireJoueurs[userId].push(gameId);
        if (memoireJoueurs[userId].length === 8) { stats.totalGagnants++; sauvegarderStats(); }

        io.to(userId).emit('challenge_validated', gameId);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "🚨 FRAUDE !" });
    }
});

// --- 📝 NOUVEAU : SAUVEGARDER LE QUESTIONNAIRE ---
app.post('/api/survey', (req, res) => {
    const { q1, q2, q3, comment } = req.body;
    
    // Vérifier que les questions obligatoires sont répondues
    if(!q1 || !q2 || !q3) return res.json({ success: false, message: "Questions 1 à 3 obligatoires." });

    stats.surveyRespondents++;
    stats.surveyScores.q1[q1]++;
    stats.surveyScores.q2[q2]++;
    stats.surveyScores.q3[q3]++;

    const groupedComment = normalizeComment(comment);
    if (groupedComment) {
        if (!stats.surveyComments[groupedComment]) stats.surveyComments[groupedComment] = 0;
        stats.surveyComments[groupedComment]++;
    }

    sauvegarderStats();
    res.json({ success: true });
});

// --- 📊 NOUVEAU : RÉCUPÉRER LES STATS SÉCURISÉES ---
app.post('/api/stats_data', (req, res) => {
    if (req.body.token === STATS_TOKEN) {
        res.json({ success: true, stats: stats });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("🚀 Serveur Centurio démarré sur le port " + PORT);
});
