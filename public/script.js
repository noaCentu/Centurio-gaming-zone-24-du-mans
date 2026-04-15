console.log("🚀 Script Centurio v43 - Thème global, Stands, Groupe !");

// 📱 SERVICE WORKER (Mode hors-ligne)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Error', err));
    });
}

// 🌓 GESTION GLOBALE DU THÈME JOUR / NUIT
window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('centurioTheme', isLight ? 'light' : 'dark');
    
    const btn = document.getElementById('night-btn');
    if (btn) btn.innerText = isLight ? '🌙' : '☀️';
    
    // Si on est sur la page des défis, on redessine le graphique
    if (typeof renderGames === 'function' && document.getElementById('progress-chart')) {
        renderGames(); 
    }
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
                if (document.getElementById('games-list')) renderGames();
            }
        }).catch(() => {});
};

try {
    if (typeof io !== 'undefined') {
        socket = io();
        socket.emit('register_user', userId);
        socket.on('challenge_validated', (gameId) => {
            let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
            progress[gameId] = true;
            localStorage.setItem('centurioProgress', JSON.stringify(progress));
            if (typeof closeModal === 'function') closeModal();
            if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            if (document.getElementById('games-list')) renderGames();
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

// AFFICHAGE DES DÉFIS (Seulement sur defis.html)
window.renderGames = function() {
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
        
        let btnHtml = `<button class="btn-group-select" onclick="openModal('${game.id}')">Scan</button>`;
        if (isDone) btnHtml = `<span style="color:#4CAF50; font-weight:bold;">OK ✅</span>`;
        if (game.id === 'cadeau' && !surveyDone && !isDone) btnHtml = `<button class="btn-group-select" style="background:var(--border-line); color:var(--text-muted);" onclick="alert('Faites le questionnaire !')">🔒</button>`;

        card.innerHTML = `
            <div style="text-align:left;">
                <h3 style="margin:0; font-size:16px;">${game.name}</h3>
                <p style="margin:0; font-size:12px; opacity:0.8;">${game.desc}</p>
            </div>
            ${btnHtml}
        `;
        list.appendChild(card);
    });

    if (!surveyDone) {
        const surveyCard = document.createElement('div');
        surveyCard.className = 'game-card';
        surveyCard.style.borderLeft = '4px dashed var(--brand)';
        surveyCard.innerHTML = `
            <div style="text-align: left;">
                <h3 style="margin:0; font-size:16px;">📝 Votre avis !</h3>
                <p style="margin:0; font-size:11px; opacity:0.8;">Obligatoire pour le cadeau.</p>
            </div>
            <button class="btn-group-select" style="background: #55acee;" onclick="openSurvey()">Répondre</button>
        `;
        list.appendChild(surveyCard);
    }

    updateChart(count);
};

window.updateChart = function(count) {
    const percentage = Math.round((count / 7) * 100);
    const chartText = document.getElementById('chart-text');
    if(chartText) chartText.innerText = `${percentage}%`;

    const canvas = document.getElementById('progress-chart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 160, 160);
        
        const isLight = document.body.classList.contains('light-mode');
        ctx.beginPath(); ctx.arc(80, 80, 70, 0, 2 * Math.PI); 
        ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'; 
        ctx.lineWidth = 14; ctx.stroke(); 
        
        if (percentage > 0) {
            ctx.beginPath(); ctx.arc(80, 80, 70, -0.5 * Math.PI, (-0.5 * Math.PI) + (percentage / 100) * 2 * Math.PI);
            ctx.strokeStyle = '#f8aa37'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
        }
    }
};

// 🚀 LE QR CODE (Parfait et Unique)
window.openModal = function(gameId) {
    document.getElementById('animator-modal').style.display = 'flex';
    const group = localStorage.getItem('centurioGroupSize') || 1;
    const adminUrl = `${window.location.origin}/scan.html?user=${userId}&game=${gameId}&group=${group}`;
    
    const qrContainer = document.getElementById('qr-container');
    qrContainer.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: adminUrl, width: 200, height: 200, colorDark: "#291834", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
        setTimeout(() => {
            const canvas = qrContainer.querySelector('canvas');
            const img = qrContainer.querySelector('img');
            
            if (canvas) canvas.style.display = "none";
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
        if (document.getElementById('games-list')) renderGames();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    // Appliquer le thème au lancement
    const isLight = localStorage.getItem('centurioTheme') === 'light';
    if (isLight) document.body.classList.add('light-mode');
    const btn = document.getElementById('night-btn');
    if (btn) btn.innerText = isLight ? '🌙' : '☀️';

    checkGroupSize();
    if (document.getElementById('games-list')) {
        renderGames();
        syncWithServer();
    }
});
