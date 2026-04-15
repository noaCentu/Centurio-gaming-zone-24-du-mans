console.log("🚀 Script Centurio v40 - Stands, Groupe & Sans PWA !");

// 📱 LE SERVICE WORKER RESTE (Pour le mode hors-ligne) MAIS PLUS D'INSTALLATION
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
        .catch(err => console.log('❌ PWA : Erreur', err));
    });
}

// 👨‍👩‍👧‍👦 LOGIQUE DU GROUPE (Nombre de personnes)
function checkGroupSize() {
    let groupSize = localStorage.getItem('centurioGroupSize');
    const groupBadge = document.getElementById('group-badge');
    
    if (!groupSize) {
        // Si pas de groupe défini, on affiche le pop-up
        const groupModal = document.getElementById('group-modal');
        if(groupModal) groupModal.style.display = 'flex';
    } else if (groupBadge) {
        // Si déjà défini, on l'affiche en haut de l'écran
        groupBadge.innerHTML = `👨‍👩‍👧‍👦 Groupe : <b>${groupSize}</b> pers.`;
        groupBadge.style.display = 'inline-block';
    }
}

window.setGroupSize = function(size) {
    localStorage.setItem('centurioGroupSize', size);
    document.getElementById('group-modal').style.display = 'none';
    checkGroupSize(); // Met à jour l'affichage
};

// 🎮 NOUVELLE LISTE DES STANDS
const games = [
    { id: 's1', name: 'Stand 1', desc: 'Valider l\'animation du Stand 1' },
    { id: 's2', name: 'Stand 2', desc: 'Valider l\'animation du Stand 2' },
    { id: 's3', name: 'Stand 3', desc: 'Valider l\'animation du Stand 3' },
    { id: 's4', name: 'Stand 4', desc: 'Valider l\'animation du Stand 4' },
    { id: 's5', name: 'Stand 5', desc: 'Valider l\'animation du Stand 5' },
    { id: 's6', name: 'Stand 6', desc: 'Valider l\'animation du Stand 6' },
    { id: 's7', name: 'Stand 7', desc: 'Valider l\'animation du Stand 7' },
    { id: 'cadeau', name: '🎁 Cadeau Centurio', desc: 'Présentez ce QR Code à l accueil !' }
];

let userId = localStorage.getItem('centurioUserId');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('centurioUserId', userId);
}

let socket = null;

window.syncWithServer = function() {
    if (!userId) return;
    fetch(`/api/my-progress/${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.success) {
                let progress = {};
                data.games.forEach(gId => { progress[gId] = true; });
                localStorage.setItem('centurioProgress', JSON.stringify(progress));
                if (data.surveyDone) localStorage.setItem('centurioSurveyDone', 'true');
                renderGames();
            }
        }).catch(err => console.log("Sync ignorée (Réseau faible)"));
};

try {
    if (typeof io !== 'undefined') {
        socket = io();
        socket.emit('register_user', userId);
        
        socket.on('challenge_validated', (gameId) => {
            let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
            progress[gameId] = true;
            localStorage.setItem('centurioProgress', JSON.stringify(progress));
            
            closeModal();

            if (typeof confetti !== 'undefined') {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#f8aa37', '#3a2a40', '#4CAF50', '#ffffff'] });
            }
            
            if (gameId === 'cadeau') {
                document.getElementById('final-modal').style.display = 'flex';
            } else {
                const m = document.getElementById('success-modal');
                if(m){ 
                    m.style.display = 'flex'; 
                    m.querySelector('.modal').style.animation = 'pulse 0.5s ease';
                    setTimeout(() => m.style.display = 'none', 3000); 
                }
            }
            renderGames();
        });
    }
} catch(e) {}

try {
    if (typeof FingerprintJS !== 'undefined') {
        FingerprintJS.load().then(fp => {
            fp.get().then(result => {
                userId = result.visitorId;
                localStorage.setItem('centurioUserId', userId);
                if(socket) socket.emit('register_user', userId);
                syncWithServer();
            });
        }).catch(() => syncWithServer());
    } else {
        syncWithServer();
    }
} catch(e) { syncWithServer(); }

setInterval(syncWithServer, 5000);

function renderGames() {
    try {
        const list = document.getElementById('games-list');
        if (!list) return; 
        list.innerHTML = '';
        
        let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
        let count = 0;
        const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';

        games.filter(g => g.id !== 'cadeau').forEach(function(game) {
            const isDone = progress[game.id] === true;
            if (isDone) count++;

            const card = document.createElement('div');
            card.className = `game-card animate-pop-in ${isDone ? 'done' : ''}`;
            card.innerHTML = `
                <div class="game-info" style="text-align: left;">
                    <h3>${game.name}</h3>
                    <p>${isDone ? 'Validé ✅' : game.desc}</p>
                </div>
                ${isDone ? '<button class="btn-valider" style="opacity: 0.5; cursor: default;">OK</button>' : `<button class="btn-valider" onclick="openModal('${game.id}')">Scan</button>`}
            `;
            list.appendChild(card);
        });

        if (!surveyDone) {
            const surveyCard = document.createElement('div');
            surveyCard.className = 'game-card animate-pop-in';
            surveyCard.style.borderLeft = '4px dashed var(--brand)';
            surveyCard.innerHTML = `
                <div class="game-info" style="text-align: left;">
                    <h3>📝 Votre avis compte !</h3>
                    <p style="font-size: 11px; color: #aaa; margin-top: 5px;">Questionnaire obligatoire pour le cadeau.</p>
                </div>
                <button class="btn-valider" style="background-color: #55acee;" onclick="openSurvey()">Répondre</button>
            `;
            list.appendChild(surveyCard);
        }

        const cadeauGame = games.find(g => g.id === 'cadeau');
        if (cadeauGame) {
            const isDone = progress['cadeau'] === true;
            const card = document.createElement('div');
            card.className = `game-card animate-pop-in ${isDone ? 'done' : ''}`;

            if (isDone) {
                card.style.borderLeftColor = 'var(--brand)';
                card.innerHTML = `<div class="game-info" style="text-align: left;"><h3 style="color:var(--brand);">${cadeauGame.name}</h3><p>Cadeau récupéré !</p></div><button class="btn-valider" style="background-color: var(--brand); opacity: 0.8;">🎁</button>`;
            } else if (!surveyDone) {
                card.style.opacity = '0.5';
                card.style.filter = 'grayscale(100%)';
                card.innerHTML = `<div class="game-info" style="text-align: left;"><h3 style="color:#aaa;">${cadeauGame.name}</h3><p>Bloqué (Faites le questionnaire)</p></div><button class="btn-valider" style="background-color: #888;" onclick="alert('Remplissez le questionnaire !')">🔒</button>`;
            } else {
                card.style.borderLeftColor = 'var(--brand)';
                card.innerHTML = `<div class="game-info" style="text-align: left;"><h3 style="color:var(--brand);">${cadeauGame.name}</h3><p>Allez à l accueil !</p></div><button class="btn-valider" style="background-color: var(--brand);" onclick="openModal('cadeau')">Scan</button>`;
            }
            list.appendChild(card);
        }

        const percentage = Math.round((count / 7) * 100);
        const chartText = document.getElementById('chart-text');
        if(chartText) chartText.innerText = `${percentage}%`;

        const canvas = document.getElementById('progress-chart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 200, 200);
            ctx.beginPath(); ctx.arc(100, 100, 90, 0, 2 * Math.PI); 
            ctx.strokeStyle = 'rgba(255,255,255,0.1)'; 
            ctx.lineWidth = 15; ctx.stroke();
            if (percentage > 0) {
                ctx.beginPath(); ctx.arc(100, 100, 90, -0.5 * Math.PI, (-0.5 * Math.PI) + (percentage / 100) * 2 * Math.PI);
                ctx.strokeStyle = '#f8aa37'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke();
            }
        }
    } catch(err) { console.error("Erreur :", err); }
}

window.openModal = function(gameId) {
    if (!userId) return alert("Chargement, patientez...");
    
    document.getElementById('animator-modal').style.display = 'flex';
    
    // On attache la taille du groupe à l'URL du QR Code pour que l'animateur la lise !
    const groupSize = localStorage.getItem('centurioGroupSize') || 1;
    const adminUrl = `${window.location.origin}/scan.html?user=${userId}&game=${gameId}&group=${groupSize}`;
    
    const qrContainer = document.getElementById('qr-container');
    qrContainer.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: adminUrl, width: 200, height: 200, colorDark: "#291834", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
        setTimeout(() => {
            const img = qrContainer.querySelector('img');
            if (img) {
                img.style.padding = "12px"; img.style.background = "#ffffff";
                img.style.borderRadius = "15px"; img.style.border = "5px solid var(--brand, #f8aa37)"; 
                img.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)"; img.style.margin = "0 auto";
                img.style.display = "block"; img.style.maxWidth = "100%"; img.style.height = "auto";
                img.style.boxSizing = "border-box";
            }
        }, 50);
    }
};

window.closeModal = function() { document.getElementById('animator-modal').style.display = 'none'; };
window.openSurvey = function() { document.getElementById('survey-modal').style.display = 'flex'; };

window.answers = { q1: null, q2: null, q3: null };
window.selectOpt = function(question, value) {
    window.answers[question] = value;
    const options = document.getElementById('scale-' + question).children;
    for(let i=0; i<options.length; i++) options[i].classList.remove('selected');
    options[value - 1].classList.add('selected');
};

window.submitSurvey = function() {
    if(!window.answers.q1 || !window.answers.q2 || !window.answers.q3) {
        document.getElementById('survey-error').style.display = 'block'; return;
    }
    document.getElementById('survey-error').style.display = 'none';
    const comment = document.getElementById('survey-comment').value;

    fetch('/api/survey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1: window.answers.q1, q2: window.answers.q2, q3: window.answers.q3, comment: comment, userId: userId })
    }).then(() => {
        localStorage.setItem('centurioSurveyDone', 'true');
        document.getElementById('survey-modal').style.display = 'none';
        if (typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        setTimeout(() => alert("Merci beaucoup ! Cadeau débloqué ! 🎁"), 500);
        renderGames();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    renderGames();
    checkGroupSize(); // Lance la vérification du groupe au démarrage !
});
