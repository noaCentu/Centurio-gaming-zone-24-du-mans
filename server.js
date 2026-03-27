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
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 

// 🧠 LA MÉMOIRE ABSOLUE DU SERVEUR
const memoireJoueurs = {}; 

// --- 📊 GESTION DU FICHIER DE STATISTIQUES ---
const statsFilePath = path.join(__dirname, 'stats.json');
let stats = { totalVisiteurs: 0, totalGagnants: 0, totalAdmins: 0 };

if (fs.existsSync(statsFilePath)) {
    const rawData = fs.readFileSync(statsFilePath);
    stats = JSON.parse(rawData);
}

function sauvegarderStats() {
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
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
        stats.totalAdmins++;
        sauvegarderStats();
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/validate', (req, res) => {
    const { userId, gameId, token } = req.body;

    if (token === ADMIN_TOKEN) {
        
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

        memoireJoueurs[userId].push(gameId);

        if (memoireJoueurs[userId].length === 7) {
            stats.totalGagnants++; 
            sauvegarderStats(); 
        }

        io.to(userId).emit('challenge_validated', gameId);
        res.json({ success: true });

    } else {
        res.json({ success: false, message: "🚨 TENTATIVE DE FRAUDE ! Vous n'êtes pas Staff." });
    }
});

app.get('/api/stats_centurio_secret', (req, res) => {
    const html = "<!DOCTYPE html>\n" +
    "<html lang='fr'>\n" +
    "<head>\n" +
    "    <meta charset='UTF-8'>\n" +
    "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n" +
    "    <title>Bilan - Centurio Gaming</title>\n" +
    "    <link href='https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap' rel='stylesheet'>\n" +
    "    <style>\n" +
    "        body { font-family: 'Poppins', sans-serif; background-color: #f4f7f6; color: #333; text-align: center; padding: 40px 20px; margin: 0; }\n" +
    "        h1 { color: #f8aa37; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; font-size: 28px; }\n" +
    "        p.subtitle { color: #666; margin-bottom: 40px; font-size: 14px; }\n" +
    "        .stats-container { display: flex; flex-direction: column; gap: 20px; max-width: 400px; margin: 0 auto; }\n" +
    "        .stat-card { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); border-left: 6px solid #f8aa37; display: flex; flex-direction: column; align-items: center; }\n" +
    "        .stat-card.admin { border-left-color: #2c3e50; }\n" +
    "        .stat-card.winner { border-left-color: #28a745; }\n" +
    "        .stat-number { font-size: 45px; font-weight: 800; margin: 5px 0; line-height: 1; }\n" +
    "        .stat-label { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }\n" +
    "        .footer { margin-top: 50px; font-size: 11px; color: #aaa; }\n" +
    "    </style>\n" +
    "</head>\n" +
    "<body>\n" +
    "    <h1>📊 Bilan en Direct</h1>\n" +
    "    <p class='subtitle'>Statistiques officielles - Gaming Zone 24h</p>\n" +
    "    <div class='stats-container'>\n" +
    "        <div class='stat-card'>\n" +
    "            <div class='stat-label'>🎮 Visiteurs Uniques</div>\n" +
    "            <div class='stat-number' style='color: #f8aa37;'>" + stats.totalVisiteurs + "</div>\n" +
    "        </div>\n" +
    "        <div class='stat-card winner'>\n" +
    "            <div class='stat-label'>🏆 Défis 7/7 Complétés</div>\n" +
    "            <div class='stat-number' style='color: #28a745;'>" + stats.totalGagnants + "</div>\n" +
    "        </div>\n" +
    "        <div class='stat-card admin'>\n" +
    "            <div class='stat-label'>👮‍♂️ Connexions Staff</div>\n" +
    "            <div class='stat-number' style='color: #2c3e50;'>" + stats.totalAdmins + "</div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class='footer'>\n" +
    "        Système Centurio Pro &copy; 2024<br>\n" +
    "        Mise à jour automatique à chaque actualisation de la page.\n" +
    "    </div>\n" +
    "</body>\n" +
    "</html>";
    
    res.send(html);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("🚀 Serveur Centurio securise demarre sur le port " + PORT);
});
