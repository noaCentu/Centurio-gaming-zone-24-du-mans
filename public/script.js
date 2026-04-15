console.log("🚀 Script Centurio v50 - Ordre Formulaire/Cadeau & Heure du Scan !");

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
    
    const menu = document.getElementById('lang-list');
    if (menu) menu.style.display = 'none';
    
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
    
    if (typeof renderGames === 'function' && document.getElementById('progress-chart')) {
        renderGames(); 
    }
};

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
            
            // SAUVEGARDE DE LA DATE ET L'HEURE DU DERNIER SCAN
            const now = new Date();
            const formattedDate = now.toLocaleDateString('fr-FR');
            const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
            localStorage.setItem('centurioLastValidationTime', `Dernier défi validé le ${formattedDate} à ${formattedTime}`);

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

// AFFICHAGE DES DÉFIS DANS LE BON ORDRE
window.renderGames = function() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    list.innerHTML = '';
    
    let progress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let count = 0;
    const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';

    // 1. AFFICHER UNIQUEMENT LES STANDS DE JEU (Pas le cadeau)
    games.filter(g => g.id !== 'cadeau').forEach(game => {
        const isDone = progress[game.id] === true;
        if (isDone) count++;

        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'done' : ''}`;
        
        let btnHtml = `<button class="btn-group-select" onclick="openModal('${game.id}')">Scan</button>`;
        if (isDone) btnHtml = `<span style="color:#4CAF50; font-weight:bold;">OK ✅</span>`;

        card.innerHTML = `
            <div style="text-align:left;">
                <h3 style="margin:0; font-size:16px;">${game.name}</h3>
                <p style="margin:0; font-size:12px; opacity:0.8;">${game.desc}</p>
            </div>
            ${btnHtml}
        `;
        list.appendChild(card);
    });

    // 2. AFFICHER LE FORMULAIRE DE RETOUR (S'il n'est pas fait, placé AVANT le cadeau)
    if (!surveyDone) {
        const surveyCard = document.createElement('div');
        surveyCard.className = 'game-card';
        surveyCard.style.borderLeft = '4px dashed var(--brand, #f8aa37)';
        surveyCard.innerHTML = `
            <div style="text-align: left;">
                <h3 style="margin:0; font-size:16px;">📝 Votre avis !</h3>
                <p style="margin:0; font-size:11px; opacity:0.8;">Obligatoire pour le cadeau.</p>
            </div>
            <button class="btn-group-select" style="background: #55acee;" onclick="openSurvey()">Répondre</button>
        `;
        list.appendChild(surveyCard);
    }

    // 3. AFFICHER LE CADEAU TOUT EN BAS
    const cadeauGame = games.find(g => g.id === 'cadeau');
    if (cadeauGame) {
        const isDone = progress['cadeau'] === true;
        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'done' : ''}`;

        let btnHtml = `<button class="btn-group-select" onclick="openModal('cadeau')">Scan</button>`;
        if (isDone) {
            btnHtml = `<span style="color:#4CAF50; font-weight:bold;">OK ✅</span>`;
        } else if (!surveyDone) {
            btnHtml = `<button class="btn-group-select" style="background:var(--border-line); color:var(--text-muted);" onclick="alert('Veuillez remplir le questionnaire juste au-dessus pour débloquer votre cadeau !')">🔒</button>`;
            card.style.opacity = '0.6'; // Effet grisé pour montrer qu'il est bloqué
        }

        card.innerHTML = `
            <div style="text-align:left;">
                <h3 style="margin:0; font-size:16px;">${cadeauGame.name}</h3>
                <p style="margin:0; font-size:12px; opacity:0.8;">${cadeauGame.desc}</p>
            </div>
            ${btnHtml}
        `;
        list.appendChild(card);
    }

    updateChart(count);
    
    // 4. AFFICHER L'HEURE DU DERNIER SCAN (Sous le graphique)
    const timeInfo = document.getElementById('last-validation-info');
    const savedTime = localStorage.getItem('centurioLastValidationTime');
    if (timeInfo) {
        if (savedTime && count > 0) {
            timeInfo.innerText = savedTime;
            timeInfo.style.display = 'block';
        } else {
            timeInfo.style.display = 'none';
        }
    }
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
    const savedFlag = localStorage.getItem('centurioFlag');
    if (savedFlag) {
        const langBtn = document.querySelector('.lang-btn');
        if (langBtn) langBtn.innerText = savedFlag;
    }

    const isLight = localStorage.getItem('centurioTheme') === 'light';
    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    
    if (isLight && !isIndexPage) {
        document.body.classList.add('light-mode');
    }
    
    const btn = document.getElementById('night-btn');
    if (btn) btn.innerText = isLight ? '🌙' : '☀️';

    checkGroupSize();
    if (document.getElementById('games-list')) {
        renderGames();
        syncWithServer();
    }
});
