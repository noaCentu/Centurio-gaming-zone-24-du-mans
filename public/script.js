console.log("🚀 Script Centurio v41 - Thème Adaptatif & Contraste !");

// 📱 SERVICE WORKER POUR LE MODE HORS-LIGNE
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Error', err));
    });
}

// 🌓 GESTION DU THÈME JOUR / NUIT
window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('centurioTheme', isLight ? 'light' : 'dark');
    
    const btn = document.getElementById('night-btn');
    if (btn) btn.innerText = isLight ? '🌙' : '☀️';
    
    // On redessine le graphique pour qu'il change de couleur !
    if (typeof renderGames === 'function') renderGames(); 
};

// 👨‍👩‍👧‍👦 GESTION DU GROUPE
function checkGroupSize() {
    let groupSize = localStorage.getItem('centurioGroupSize');
    const badge = document.getElementById('group-badge');
    const modal = document.getElementById('group-modal');
    
    if (!groupSize) {
        if(modal) modal.style.display = 'flex';
    } else if (badge) {
        badge.innerHTML = `👨‍👩‍👧‍👦 Groupe : <b>${groupSize}</b> pers.`;
        badge.style.display = 'inline-block';
    }
}

window.setGroupSize = function(size) {
    localStorage.setItem('centurioGroupSize', size);
    const modal = document.getElementById('group-modal');
    if(modal) modal.style.display = 'none';
    checkGroupSize();
};

// 🎮 LISTE DES STANDS
const games = [
    { id: 's1', name: 'Stand 1', desc: 'Animation du Stand 1' },
    { id: 's2', name: 'Stand 2', desc: 'Animation du Stand 2' },
    { id: 's3', name: 'Stand 3', desc: 'Animation du Stand 3' },
    { id: 's4', name: 'Stand 4', desc: 'Animation du Stand 4' },
    { id: 's5', name: 'Stand 5', desc: 'Animation du Stand 5' },
    { id: 's6', name: 'Stand 6', desc: 'Animation du Stand 6' },
    { id: 's7', name: 'Stand 7', desc: 'Animation du Stand 7' },
    { id: 'cadeau', name: '🎁 Cadeau Centurio', desc: 'Récupérez votre lot !' }
];

let userId = localStorage.getItem('centurioUserId') || 'user_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('centurioUserId', userId);

let socket = null;

// SYNC AVEC RENDER
window.syncWithServer = function() {
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
        }).catch(() => {});
};

// SOCKET POUR RECEVOIR LA VALIDATION
try {
    if (typeof io !== 'undefined') {
        socket = io();
        socket.emit('register_user', userId);
        socket.on('challenge_validated', (gameId) => {
            let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
            progress[gameId] = true;
            localStorage.setItem('centurioProgress', JSON.stringify(progress));
            closeModal();
            if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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

// AFFICHAGE DES CARTES
function renderGames() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    list.innerHTML = '';
    
    let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let count = 0;
    const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';

    games.forEach(game => {
        const isDone = progress[game.id] === true;
        if (isDone && game.id !== 'cadeau') count++;

        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'done' : ''}`;
        
        let btnHtml = `<button class="btn-valider" onclick="openModal('${game.id}')" style="background:#f8aa37; border:none; color:white; padding:8px 15px; border-radius:8px; font-weight:bold;">Scan</button>`;
        if (isDone) btnHtml = `<span style="color:#4CAF50; font-weight:bold;">OK ✅</span>`;
        if (game.id === 'cadeau' && !surveyDone && !isDone) btnHtml = `<button onclick="alert('Faites le questionnaire !')" style="background:#444; border:none; color:#888; padding:8px 15px; border-radius:8px;">🔒</button>`;

        card.innerHTML = `
            <div style="text-align:left;">
                <h3 style="margin:0; font-size:16px;">${game.name}</h3>
                <p style="margin:0; font-size:12px; opacity: 0.8;">${game.desc}</p>
            </div>
            ${btnHtml}
        `;
        list.appendChild(card);
    });

    updateChart(count);
}

function updateChart(count) {
    const percentage = Math.round((count / 7) * 100);
    const chartText = document.getElementById('chart-text');
    if(chartText) chartText.innerText = `${percentage}%`;

    const canvas = document.getElementById('progress-chart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 160, 160);
        
        // 🎨 Adaptation de la couleur du fond du graphique selon le thème
        const isLight = document.body.classList.contains('light-mode');
        ctx.beginPath(); ctx.arc(80, 80, 70, 0, 2 * Math.PI); 
        ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'; // Bien visible dans les 2 cas
        ctx.lineWidth = 14; ctx.stroke(); // Plus épais
        
        if (percentage > 0) {
            ctx.beginPath(); ctx.arc(80, 80, 70, -0.5 * Math.PI, (-0.5 * Math.PI) + (percentage / 100) * 2 * Math.PI);
            ctx.strokeStyle = '#f8aa37'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
        }
    }
}

// QR CODE AVEC TAILLE DE GROUPE
window.openModal = function(gameId) {
    document.getElementById('animator-modal').style.display = 'flex';
    const group = localStorage.getItem('centurioGroupSize') || 1;
    const adminUrl = `${window.location.origin}/scan.html?user=${userId}&game=${gameId}&group=${group}`;
    
    const qrContainer = document.getElementById('qr-container');
    qrContainer.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: adminUrl, width: 200, height: 200, colorDark: "#291834", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
        setTimeout(() => {
            const img = qrContainer.querySelector('img');
            if (img) {
                img.style.padding = "10px"; img.style.background = "white"; img.style.borderRadius = "10px";
                img.style.border = "4px solid #f8aa37"; img.style.margin = "0 auto"; img.style.display = "block";
                img.style.maxWidth = "100%"; img.style.height = "auto";
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
    // 🌓 Initialisation du thème au lancement
    const isLight = localStorage.getItem('centurioTheme') === 'light';
    if (isLight) {
        document.body.classList.add('light-mode');
    }
    const btn = document.getElementById('night-btn');
    if (btn) btn.innerText = isLight ? '🌙' : '☀️';

    checkGroupSize();
    renderGames();
    syncWithServer();
});
