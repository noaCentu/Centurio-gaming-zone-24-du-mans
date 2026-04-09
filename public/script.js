console.log("🚀 Script Centurio v10 - Correction Finale");

const games = [
    { id: 'mk', name: 'Mario Kart', desc: 'Finir dans le Top 3' },
    { id: 'mp', name: 'Mario Party', desc: 'Gagner un mini-jeu' },
    { id: 'ss', name: 'Switch Sports', desc: 'Faire un strike au Bowling' },
    { id: 'tk', name: 'Tekken', desc: 'Gagner un combat' },
    { id: 'jd', name: 'Just Dance', desc: 'Obtenir 4 etoiles minimum' },
    { id: 'tm', name: 'Trackmania', desc: 'Battre le temps fantôme' },
    { id: 'fg', name: 'Fall Guys', desc: 'Se qualifier a la 1ere manche' },
    { id: 'cadeau', name: '🎁 Cadeau Centurio', desc: "Presente ce QR Code a l accueil pour ton lot !" }
];

let userId = localStorage.getItem('centurioUserId');
let socket;

// Initialisation Radio (Socket.io)
try {
    socket = io();
} catch(e) { console.log("Erreur Radio"); }

// Identification unique (Anti-triche)
try {
    FingerprintJS.load().then(fp => {
        fp.get().then(result => {
            userId = result.visitorId;
            localStorage.setItem('centurioUserId', userId);
            if(socket) socket.emit('register_user', userId);
        });
    });
} catch(e) { console.log("FP Skip"); }

// Signal du scanner
if(socket) {
    socket.on('challenge_validated', (gameId) => {
        let progress = {};
        try { progress = JSON.parse(localStorage.getItem('centurioProgress')) || {}; } catch(e) {}
        progress[gameId] = true;
        localStorage.setItem('centurioProgress', JSON.stringify(progress));
        
        if (gameId === 'cadeau') {
            document.getElementById('final-modal').style.display = 'flex';
        }
        renderGames(); 
    });
}

// 🎨 DESSIN DE LA PAGE
function renderGames() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    
    list.innerHTML = ''; 
    let progress = {};
    try {
        const raw = localStorage.getItem('centurioProgress');
        progress = raw ? JSON.parse(raw) : {};
    } catch(e) { progress = {}; }

    let count = 0;
    const normalOnes = games.filter(g => g.id !== 'cadeau');
    const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';

    // 1. Liste des 7 jeux
    normalOnes.forEach((game) => {
        const isDone = progress[game.id] === true;
        if (isDone) count++;
        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'done' : ''}`;
        card.innerHTML = `
            <div class="game-info" style="text-align: left;">
                <h3>${game.name}</h3>
                <p>${isDone ? 'Defi valide !' : game.desc}</p>
            </div>
            ${isDone ? '<button class="btn-valider" style="opacity:0.6; cursor:default;">OK ✅</button>' : `<button class="btn-valider" onclick="openModal('${game.id}')">QR Code</button>`}
        `;
        list.appendChild(card);
    });

    // 2. Bloc Questionnaire
    if (!surveyDone) {
        const sCard = document.createElement('div');
        sCard.className = 'game-card';
        sCard.style.borderLeft = "4px dashed #f8aa37";
        sCard.innerHTML = `
            <div class="game-info" style="text-align: left;">
                <h3>📝 Questionnaire</h3>
                <p style="font-size:11px;">Donnez votre avis pour débloquer le cadeau !</p>
            </div>
            <button class="btn-valider" style="background:#55acee;" onclick="openSurvey()">Repondre</button>
        `;
        list.appendChild(sCard);
    }

    // 3. Bloc Cadeau
    const cadeauDone = progress['cadeau'] === true;
    const cCard = document.createElement('div');
    cCard.className = `game-card ${cadeauDone ? 'done' : ''}`;
    
    if (!surveyDone && !cadeauDone) {
        cCard.style.opacity = "0.5";
        cCard.style.filter = "grayscale(1)";
        cCard.innerHTML = `
            <div class="game-info" style="text-align: left;"><h3>🎁 Cadeau Centurio</h3><p>Bloque (Faites le questionnaire)</p></div>
            <button class="btn-valider" style="background:#888; cursor:not-allowed;">🔒</button>
        `;
    } else {
        cCard.innerHTML = `
            <div class="game-info" style="text-align: left;"><h3>🎁 Cadeau Centurio</h3><p>${cadeauDone ? 'Cadeau recupere !' : 'Allez a l accueil'}</p></div>
            ${cadeauDone ? '<button class="btn-valider" style="cursor:default;">Fini 🏆</button>' : `<button class="btn-valider" style="background:#f8aa37;" onclick="openModal('cadeau')">QR Code</button>`}
        `;
    }
    list.appendChild(cCard);

    // Mise à jour du graphique
    const percentage = Math.round((count / 7) * 100);
    const chartText = document.getElementById('chart-text');
    if(chartText) chartText.innerText = percentage + "%";
    
    // Animation camembert
    const canvas = document.getElementById('progress-chart');
    if(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,200,200);
        ctx.beginPath(); ctx.arc(100,100,90,0,2*Math.PI); ctx.strokeStyle="#e0e0e0"; ctx.lineWidth=15; ctx.stroke();
        if(percentage > 0) {
            ctx.beginPath(); ctx.arc(100,100,90,-0.5*Math.PI, (-0.5*Math.PI)+(percentage/100)*2*Math.PI);
            ctx.strokeStyle="#f8aa37"; ctx.lineWidth=18; ctx.lineCap="round"; ctx.stroke();
        }
    }
}

// Fonctions cliquables
window.openModal = (id) => {
    document.getElementById('animator-modal').style.display = 'flex';
    const url = window.location.origin + "/scan.html?user=" + userId + "&game=" + id;
    document.getElementById('qr-container').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" style="width:100%; max-width:250px;">`;
};
window.closeModal = () => document.getElementById('animator-modal').style.display = 'none';
window.openSurvey = () => document.getElementById('survey-modal').style.display = 'flex';

// Au chargement
document.addEventListener('DOMContentLoaded', renderGames);
