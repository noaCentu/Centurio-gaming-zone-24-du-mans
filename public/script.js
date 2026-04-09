console.log("🚀 Script Centurio v18 - PWA & Hors-Ligne activés !");

// 📱 INSTALLATION DE LA PWA (Mode hors-ligne)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ PWA : Service Worker activé !'))
        .catch(err => console.log('❌ PWA : Erreur', err));
    });
}

const games = [
    { id: 'mk', name: 'Mario Kart', desc: 'Finir dans le Top 3' },
    { id: 'mp', name: 'Mario Party', desc: 'Gagner un mini-jeu' },
    { id: 'ss', name: 'Switch Sports', desc: 'Faire un strike au Bowling' },
    { id: 'tk', name: 'Tekken', desc: 'Gagner un combat' },
    { id: 'jd', name: 'Just Dance', desc: 'Obtenir 4 étoiles minimum' },
    { id: 'tm', name: 'Trackmania', desc: 'Battre le temps fantôme' },
    { id: 'fg', name: 'Fall Guys', desc: 'Se qualifier à la 1ère manche' },
    { id: 'cadeau', name: '🎁 Cadeau Centurio', desc: 'Présentez ce QR Code à l accueil pour votre lot !' }
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
        }).catch(err => console.log("Sync ignorée (Réseau faible ou Hors-ligne)"));
};

try {
    if (typeof io !== 'undefined') {
        socket = io();
        socket.emit('register_user', userId);
        
        socket.on('challenge_validated', (gameId) => {
            let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
            progress[gameId] = true;
            localStorage.setItem('centurioProgress', JSON.stringify(progress));
            
            const now = new Date();
            const formattedDate = now.toLocaleDateString('fr-FR');
            const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
            localStorage.setItem('centurioLastValidationTime', `Dernier défi validé le ${formattedDate} à ${formattedTime}`);
            
            closeModal();

            if (typeof confetti !== 'undefined') {
                confetti({
                    particleCount: 150, spread: 80, origin: { y: 0.6 },
                    colors: ['#f8aa37', '#3a2a40', '#4CAF50', '#ffffff']
                });
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
} catch(e) { console.error("Radio bloquée, mode Manuel"); }

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
                    <p>${isDone ? 'Défi validé ✅' : game.desc}</p>
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
                    <p style="font-size: 11px; color: #666; margin-top: 5px;">Questionnaire 100% anonyme.</p>
                    <p style="font-size: 12px; color: #d32f2f; font-weight: bold; margin-top: 5px;">⚠️ Obligatoire pour le cadeau.</p>
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
                card.innerHTML = `<div class="game-info" style="text-align: left;"><h3 style="color:#888;">${cadeauGame.name}</h3><p>Bloqué (Faites le questionnaire)</p></div><button class="btn-valider" style="background-color: #888;" onclick="alert('Remplissez le questionnaire !')">🔒</button>`;
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
            ctx.beginPath(); ctx.arc(100, 100, 90, 0, 2 * Math.PI); ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 15; ctx.stroke();
            if (percentage > 0) {
                ctx.beginPath(); ctx.arc(100, 100, 90, -0.5 * Math.PI, (-0.5 * Math.PI) + (percentage / 100) * 2 * Math.PI);
                ctx.strokeStyle = '#f8aa37'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke();
            }
        }

        const timeInfo = document.getElementById('last-validation-info');
        const savedTime = localStorage.getItem('centurioLastValidationTime');
        if (savedTime && count > 0 && timeInfo) {
            timeInfo.innerText = savedTime;
            timeInfo.style.display = 'block';
            timeInfo.style.animation = 'fadeIn 0.5s ease-out'; 
        } else if (timeInfo) {
            timeInfo.style.display = 'none';
        }

    } catch(err) { console.error("Erreur Affichage :", err); }
}

window.openModal = function(gameId) {
    if (!userId) return alert("Chargement du profil, patientez 1 seconde !");
    document.getElementById('animator-modal').style.display = 'flex';
    const adminUrl = `${window.location.origin}/scan.html?user=${userId}&game=${gameId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=20&data=${encodeURIComponent(adminUrl)}`;
    document.getElementById('qr-container').innerHTML = `<img src="${qrCodeUrl}" alt="QR Code" style="border-radius:10px; border: 5px solid var(--primary); max-width: 100%;">`;
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
    }).catch(e => console.error(e));
};

document.addEventListener('DOMContentLoaded', renderGames);
