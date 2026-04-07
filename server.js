const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose'); // 🧲 Le fameux connecteur MongoDB !

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ ---
const MOT_DE_PASSE_MATIN = "admincenturio25"; 
const MOT_DE_PASSE_STATS = "stat2026"; 
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 
const STATS_TOKEN = "jeton_secret_stats_2026_abc"; 

// --- 🗄️ CONNEXION À MONGODB ---
// J'ai ajouté /centurioDB pour nommer ta base de données proprement
const MONGO_URI = "mongodb+srv://CenturioAdmin:CenturioAdmin@cluster0.xdadatq.mongodb.net/centurioDB?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("🟢 Connecté avec succès au coffre-fort MongoDB !"))
    .catch(err => console.error("🔴 Erreur de connexion MongoDB :", err));

// --- 🏗️ STRUCTURE DE LA BASE DE DONNÉES (SCHÉMAS) ---

// 1. Structure pour mémoriser les joueurs et leurs défis
const PlayerSchema = new mongoose.Schema({
    userId: String,
    games: [String] // Liste des défis validés
});
const Player = mongoose.model('Player', PlayerSchema);

// 2. Structure pour mémoriser les statistiques globales
const StatsSchema = new mongoose.Schema({
    idName: { type: String, default: "main" }, // Un seul document global
    totalVisiteurs: { type: Number, default: 0 },
    totalGagnants: { type: Number, default: 0 },
    totalAdmins: { type: Number, default: 0 },
    surveyRespondents: { type: Number, default: 0 },
    surveyScores: {
        q1: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} },
        q2: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} },
        q3: { 1:{type:Number, default:0}, 2:{type:Number, default:0}, 3:{type:Number, default:0}, 4:{type:Number, default:0}, 5:{type:Number, default:0} }
    },
    surveyComments: { type: Map, of: Number, default: {} } // Permet de stocker des textes variables
});
const GlobalStat = mongoose.model('GlobalStat', StatsSchema);

// Création du document de stats s'il n'existe pas encore
async function initStats() {
    let stats = await GlobalStat.findOne({ idName: "main" });
    if (!stats) {
        stats = new GlobalStat();
        await stats.save();
    }
}
initStats();

// 🧠 LOGIQUE DE REGROUPEMENT DES COMMENTAIRES (IA Basique)
function normalizeComment(text) {
    if (!text) return null;
    let t = text.toLowerCase().trim();
    if (t.length < 2) return null;

    if (t.includes('design') || t.includes('interface') || t.includes('visuel') || t.includes('couleur')) return "Nouveau design / Interface";
    if (t.includes('bug') || t.includes('lent') || t.includes('fluide') || t.includes('chargement')) return "Améliorer la fluidité / Bugs";
    if (t.includes('jeu') || t.includes('défi') || t.includes('defi') || t.includes('stand')) return "Ajouter plus de jeux";
    if (t.includes('cadeau') || t.includes('lot') || t.includes('recompense')) return "De meilleurs cadeaux";
    
    return text.charAt(0).toUpperCase() + text.slice(1);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- 📡 GESTION EN TEMPS RÉEL (SOCKET.IO) ---
io.on('connection', (socket) => {
    socket.on('register_user', async (userId) => {
        socket.join(userId); 
        
        // Vérifie dans MongoDB si le joueur existe
        let player = await Player.findOne({ userId: userId });
        if (!player) {
            // C'est un nouveau joueur ! On le crée.
            player = new Player({ userId: userId, games: [] });
            await player.save();
            
            // On ajoute +1 aux visiteurs
            await GlobalStat.updateOne({ idName: "main" }, { $inc: { totalVisiteurs: 1 } });
        }
    });
});

// --- 🚦 ROUTES DE L'API ---

// 1. Connexion (Staff & Stats)
app.post('/api/login', async (req, res) => {
    const { password } = req.body;
    if (password === MOT_DE_PASSE_MATIN) {
        await GlobalStat.updateOne({ idName: "main" }, { $inc: { totalAdmins: 1 } });
        res.json({ success: true, token: ADMIN_TOKEN, role: 'admin' });
    } else if (password === MOT_DE_PASSE_STATS) {
        res.json({ success: true, token: STATS_TOKEN, role: 'stats' });
    } else {
        res.json({ success: false });
    }
});

// 2. Validation d'un défi par l'animateur
app.post('/api/validate', async (req, res) => {
    const { userId, gameId, token } = req.body;
    
    if (token !== ADMIN_TOKEN) return res.json({ success: false, message: "🚨 FRAUDE !" });

    let player = await Player.findOne({ userId: userId });
    if (!player) {
        player = new Player({ userId: userId, games: [] });
        await GlobalStat.updateOne({ idName: "main" }, { $inc: { totalVisiteurs: 1 } });
    }

    if (player.games.includes(gameId)) {
        return res.json({ success: false, message: "⚠️ Ce joueur a DÉJÀ validé ce défi !" });
    }

    if (player.games.length >= 8) {
        return res.json({ success: false, message: "🛑 TRICHE : Cadeau déjà récupéré !" });
    }

    player.games.push(gameId);
    await player.save();

    if (player.games.length === 8) {
        await GlobalStat.updateOne({ idName: "main" }, { $inc: { totalGagnants: 1 } });
    }

    io.to(userId).emit('challenge_validated', gameId);
    res.json({ success: true });
});

// 3. Sauvegarder le questionnaire
app.post('/api/survey', async (req, res) => {
    const { q1, q2, q3, comment } = req.body;
    if(!q1 || !q2 || !q3) return res.json({ success: false, message: "Questions obligatoires." });

    const stats = await GlobalStat.findOne({ idName: "main" });
    
    stats.surveyRespondents++;
    stats.surveyScores.q1[q1]++;
    stats.surveyScores.q2[q2]++;
    stats.surveyScores.q3[q3]++;

    const groupedComment = normalizeComment(comment);
    if (groupedComment) {
        let currentCount = stats.surveyComments.get(groupedComment) || 0;
        stats.surveyComments.set(groupedComment, currentCount + 1);
    }

    // Informe MongoDB que des données imbriquées ont changé
    stats.markModified('surveyScores');
    await stats.save();

    res.json({ success: true });
});

// 4. Récupérer les statistiques
app.post('/api/stats_data', async (req, res) => {
    if (req.body.token === STATS_TOKEN) {
        const stats = await GlobalStat.findOne({ idName: "main" });
        // Transformation de la Map des commentaires en objet simple pour le frontend
        const commentsObj = Object.fromEntries(stats.surveyComments);
        
        res.json({ 
            success: true, 
            stats: { 
                totalVisiteurs: stats.totalVisiteurs,
                totalGagnants: stats.totalGagnants,
                totalAdmins: stats.totalAdmins,
                surveyRespondents: stats.surveyRespondents,
                surveyScores: stats.surveyScores,
                surveyComments: commentsObj
            } 
        });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("🚀 Serveur Centurio démarré sur le port " + PORT);
});
