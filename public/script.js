console.log("🚀 Script Centurio v57 - Sans Groupe & Thème Persistant !");

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Error', err));
    });
}

window.toggleLang = function() {
    const menu = document.getElementById('lang-list');
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

window.changeLang = function(langCode, flag) {
    const btn = document.querySelector('.lang-btn');
    if (btn) btn.innerText = flag;
    if (document.getElementById('lang-list')) document.getElementById('lang-list').style.display = 'none';
    
    localStorage.setItem('centurioFlag', flag);
    
    if (langCode === 'fr') {
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" + window.location.hostname + "; path=/;";
        window.location.reload();
        return;
    }
    
    const select = document.querySelector('.goog-te-combo');
    if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
    } else {
        document.cookie = `googtrans=/fr/${langCode}; path=/`;
        window.location.reload();
    }
};

window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('centurioTheme', isLight ? 'light' : 'dark');
    
    const btn = document.getElementById('night-btn');
    if (btn) btn.innerText = isLight ? '🌙' : '☀️';
    
    if (typeof renderGames === 'function' && document.getElementById('progress-chart')) renderGames();
    if (typeof updateDisplay === 'function' && document.getElementById('day-selector')) updateDisplay();
};

// 🎮 LISTE DES STANDS (IDs s1 à s7)
const games = [
    { id: 's1', name: 'Stand 1', desc: 'Animation du Stand 1' },
    { id: 's2', name: 'Stand 2', desc: 'Animation du Stand 2' },
    { id: 's3', name: 'Stand 3', desc: 'Animation du Stand 3' },
    { id: 's4', name: 'Stand 4', desc: 'Animation du Stand 4' },
    { id: 's5', name: 'Stand 5', desc: 'Animation du Stand 5' },
    { id: 's6', name: 'Stand 6', desc: 'Animation du Stand 6' },
    { id: 's7', name: 'Stand 7', desc: 'Animation du Stand 7' },
    { id: 'cadeau', name: '🎁 Cadeau <span class="notranslate">Centurio</span>', desc: 'Récupérez votre lot !' }
];

let userId = localStorage.getItem('centurioUserId') || 'user_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('centurioUserId', userId);
let socket = null;

// SYNC AVEC LE SERVEUR
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

// GESTION DU SOCKET
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

            if (typeof closeModal === 'function') closeModal();
            if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            
            if (gameId === 'cadeau') {
                if(document.getElementById('final-modal')) document.getElementById('final-modal').style.display = 'flex';
            } else {
                const sModal = document.getElementById('success-modal');
                if(sModal) { sModal.style.display = 'flex'; setTimeout(() => sModal.style.display = 'none', 3000); }
            }

            if (document.getElementById('games-list')) renderGames();
        });
    }
} catch(e) {}

// FINGERPRINT
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
    } else { syncWithServer(); }
} catch(e) { syncWithServer(); }

// RENDER DE LA LISTE DES DÉFIS
window.renderGames = function() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    list.innerHTML = '';
    
    let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let count = 0;
    const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';

    games.filter(g => g.id !== 'cadeau').forEach(game => {
        const isDone = progress[game.id] === true;
        if (isDone) count++;
        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'done' : ''}`;
        let btnHtml = isDone ? `<span style="color:#4CAF50; font-weight:bold;">OK ✅</span>` : `<button class="btn-group-select" onclick="openModal('${game.id}')">Scan</button>`;
        card.innerHTML = `<div style="text-align:left;"><h3 style="margin:0; font-size:16px;">${game.name}</h3><p style="margin:0; font-size:12px; opacity:0.8;">${game.desc}</p></div>${btnHtml}`;
        list.appendChild(card);
    });

    if (!surveyDone) {
        const sCard = document.createElement('div');
        sCard.className = 'game-card';
        sCard.style.borderLeft = '4px dashed var(--brand, #f8aa37)';
        sCard.innerHTML = `<div style="text-align: left;"><h3 style="margin:0; font-size:16px;">📝 Votre avis !</h3><p style="margin:0; font-size:11px; opacity:0.8;">Obligatoire pour le cadeau.</p></div><button class="btn-group-select" style="background: #55acee;" onclick="openSurvey()">Répondre</button>`;
        list.appendChild(sCard);
    }

    const cadeauGame = games.find(g => g.id === 'cadeau');
    const cadeauDone = progress['cadeau'] === true;
    const cCard = document.createElement('div');
    cCard.className = `game-card ${cadeauDone ? 'done' : ''}`;
    let cBtn = '';
    if (cadeauDone) { cBtn = `<span style="color:#4CAF50; font-weight:bold;">OK ✅</span>`; }
    else if (!surveyDone) { 
        cBtn = `<button class="btn-group-select" style="background:var(--border-line); color:var(--text-muted);" onclick="alert('Remplissez le questionnaire au-dessus !')">🔒</button>`;
        cCard.style.opacity = '0.6';
    } else { cBtn = `<button class="btn-group-select" onclick="openModal('cadeau')">Scan</button>`; cCard.style.borderLeft = '4px solid var(--brand, #f8aa37)'; }
    
    cCard.innerHTML = `<div style="text-align:left;"><h3 style="margin:0; font-size:16px; ${!surveyDone && !cadeauDone ? 'color:var(--text-muted);' : 'color:var(--brand, #f8aa37);'}">${cadeauGame.name}</h3><p style="margin:0; font-size:12px; opacity:0.8;">${cadeauGame.desc}</p></div>${cBtn}`;
    list.appendChild(cCard);

    updateChart(count);
    
    const tInfo = document.getElementById('last-validation-info');
    const sTime = localStorage.getItem('centurioLastValidationTime');
    if (tInfo) { if (sTime && count > 0) { tInfo.innerText = sTime; tInfo.style.display = 'block'; } else tInfo.style.display = 'none'; }
};

window.updateChart = function(count) {
    const pcent = Math.round((count / 7) * 100);
    if(document.getElementById('chart-text')) document.getElementById('chart-text').innerText = `${pcent}%`;
    const canv = document.getElementById('progress-chart');
    if (canv) {
        const ctx = canv.getContext('2d');
        ctx.clearRect(0, 0, 160, 160);
        const isL = document.body.classList.contains('light-mode');
        ctx.beginPath(); ctx.arc(80, 80, 70, 0, 2 * Math.PI); 
        ctx.strokeStyle = isL ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'; 
        ctx.lineWidth = 14; ctx.stroke(); 
        if (pcent > 0) {
            ctx.beginPath(); ctx.arc(80, 80, 70, -0.5 * Math.PI, (-0.5 * Math.PI) + (pcent / 100) * 2 * Math.PI);
            ctx.strokeStyle = '#f8aa37'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
        }
    }
};

window.openModal = function(gameId) {
    if(document.getElementById('animator-modal')) document.getElementById('animator-modal').style.display = 'flex';
    // 🚨 On a supprimé la variable "group" ici 🚨
    const url = `${window.location.origin}/scan.html?user=${userId}&game=${gameId}`;
    const qrC = document.getElementById('qr-container');
    if (qrC) {
        qrC.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrC, { text: url, width: 200, height: 200, colorDark: "#291834", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L });
            setTimeout(() => {
                const img = qrC.querySelector('img');
                if (img) {
                    img.style.padding = "12px"; img.style.background = "#ffffff"; img.style.borderRadius = "15px"; 
                    img.style.border = "5px solid #f8aa37"; img.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)"; 
                    img.style.margin = "0 auto"; img.style.display = "block"; img.style.maxWidth = "100%"; img.style.height = "auto";
                }
                if (qrC.querySelector('canvas')) qrC.querySelector('canvas').style.display = 'none';
            }, 50);
        }
    }
};

window.closeModal = function() { if(document.getElementById('animator-modal')) document.getElementById('animator-modal').style.display = 'none'; };
window.openSurvey = function() { document.getElementById('survey-modal').style.display = 'flex'; };

window.answers = { q1: null, q2: null, q3: null };
window.selectOpt = function(q, v) {
    window.answers[q] = v;
    const opts = document.getElementById('scale-' + q).children;
    for(let i=0; i<opts.length; i++) opts[i].classList.remove('selected');
    opts[v - 1].classList.add('selected');
};

window.submitSurvey = function() {
    if(!window.answers.q1 || !window.answers.q2 || !window.answers.q3) {
        if(document.getElementById('survey-error')) document.getElementById('survey-error').style.display = 'block'; return;
    }
    const comm = document.getElementById('survey-comment').value;
    fetch('/api/survey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1: window.answers.q1, q2: window.answers.q2, q3: window.answers.q3, comment: comm, userId: userId })
    }).then(() => {
        localStorage.setItem('centurioSurveyDone', 'true');
        if(document.getElementById('survey-modal')) document.getElementById('survey-modal').style.display = 'none';
        if (typeof confetti !== 'undefined') confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        setTimeout(() => alert("Merci ! Cadeau débloqué ! 🎁"), 500);
        if (document.getElementById('games-list')) renderGames();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const sFlag = localStorage.getItem('centurioFlag');
    if (sFlag && document.querySelector('.lang-btn')) document.querySelector('.lang-btn').innerText = sFlag;

    const isL = localStorage.getItem('centurioTheme') === 'light';
    const isIdx = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    if (isL && !isIdx) document.body.classList.add('light-mode');
    
    const nBtn = document.getElementById('night-btn');
    if (nBtn) nBtn.innerText = document.body.classList.contains('light-mode') ? '🌙' : '☀️';

    if (document.getElementById('games-list')) { renderGames(); syncWithServer(); }
    setInterval(syncWithServer, 10000);
});
