const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- 🔒 PARAMÈTRES DE SÉCURITÉ ---
const MOT_DE_PASSE_MATIN = "admincenturio25"; 
const ADMIN_TOKEN = "jeton_secret_incassable_2024_xyz"; 

// 🧠 LA LISTE NOIRE : Mémoire vive du serveur
const joueursTermines = new Set(); 

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

// --- ROUTE DE VALIDATION DU SCANNER ---
app.post('/api/validate', (req, res) => {
    const { userId, gameId, token } = req.body;

    if (token === ADMIN_TOKEN) {
        // 🚨 SÉCURITÉ : Est-ce que ce téléphone a déjà fini le jeu avant de vider son cache ?
        if (joueursTermines.has(userId)) {
            return res.json({ success: false, message: "🛑 TRICHE : Ce joueur a déjà complété les 7 défis !" });
        }

        io.to(userId).emit('challenge_validated', gameId);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "🚨 TENTATIVE DE FRAUDE !" });
    }
});

// 🚨 NOUVELLE ROUTE : Inscrire un joueur sur la liste noire quand il a 100%
app.post('/api/finish', (req, res) => {
    const { userId } = req.body;
    if (userId) {
        joueursTermines.add(userId);
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur Centurio sécurisé démarré sur le port ${PORT}`);
});
