const games = [
    { id: 'mk', name: 'Mario Kart', desc: 'Finir dans le Top 3' },
    { id: 'mp', name: 'Mario Party', desc: 'Gagner un mini-jeu' },
    { id: 'ss', name: 'Switch Sports', desc: 'Faire un strike au Bowling' },
    { id: 'tk', name: 'Tekken', desc: 'Gagner un combat' },
    { id: 'jd', name: 'Just Dance', desc: 'Obtenir 4 étoiles minimum' },
    { id: 'tm', name: 'Trackmania', desc: 'Battre le temps fantôme' },
    { id: 'fg', name: 'Fall Guys', desc: 'Se qualifier à la 1ère manche' },
    { id: 'cadeau', name: '🎁 Cadeau Centurio', desc: "Présente ce QR Code à l'accueil pour récupérer ton lot !" }
];

let userId = localStorage.getItem('centurioUserId');
const socket = io();

// 🛡️ Chargement de l'empreinte matérielle (Anti-Triche)
FingerprintJS.load().then(fp => {
    fp.get().then(result => {
        const hardwareId = result.visitorId; 
        if (!userId || userId !== hardwareId) {
            userId = hardwareId;
            localStorage.setItem('centurioUserId', userId);
        }
        socket.emit('register_user', userId);
    });
});

// 🔄 Polling indestructible : on rappelle au serveur qui on est toutes les 2s
setInterval(() => {
    let realUserId = localStorage.getItem('centurioUserId');
    if (realUserId) socket.emit('register_user', realUserId);
}, 2000);

// 🌟 LE SPECTACLE : Quand l'animateur scanne avec succès !
socket.on('challenge_validated', (gameId) => {
    let savedProgress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    savedProgress[gameId] = true;
    localStorage.setItem('centurioProgress', JSON.stringify(savedProgress));
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR');
    const formattedTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    const timeString = `Dernier défi validé le ${formattedDate} à ${formattedTime}`;
    localStorage.setItem('centurioLastValidationTime', timeString);

    closeModal(); 
    
    if (gameId === 'cadeau') {
        document.getElementById('final-modal').style.display = 'flex';
    } else {
        const successModal = document.getElementById('success-modal');
        if(successModal) {
            successModal.style.display = 'flex';
            setTimeout(() => { successModal.style.display = 'none'; }, 2000);
        }
    }
    
    renderGames(); // Redessine l'écran en direct
});

function renderGames() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    
    list.innerHTML = '';
    const savedProgress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let completedCount = 0;

    const normalGames = games.filter(g => g.id !== 'cadeau');
    const cadeauGame = games.find(g => g.id === 'cadeau');

    // 1. Affichage des 7 jeux normaux
    normalGames.forEach(function(game, index) {
        const isDone = savedProgress[game.id] === true;
        if (isDone) completedCount++;

        const card = document.createElement('div');
        card.className = `game-card animate-pop-in ${isDone ? 'done' : ''}`;
        card.style.animationDelay = `${index * 80}ms`;
        
        let buttonHtml = isDone 
            ? '<button class="btn-valider" style="opacity: 0.8; cursor: default;">Validé ✅</button>' 
            : `<button class="btn-valider" onclick="openModal('${game.id}')">QR Code</button>`;

        card.innerHTML = `
            <div class="game-info" style="text-align: left;">
                <h3>${game.name}</h3>
                <p>${isDone ? 'Défi brillamment accompli' : game.desc}</p>
            </div>
            ${buttonHtml}
        `;
        list.appendChild(card);
    });

    // 2. Affichage du Questionnaire (S'il n'est pas fait)
    const surveyCard = document.getElementById('survey-card');
    if (surveyCard) {
        if(localStorage.getItem('centurioSurveyDone')) {
            surveyCard.style.display = 'none';
        } else {
            surveyCard.style.display = 'flex';
            surveyCard.innerHTML = `
                <div class="game-info" style="text-align: left;">
                    <h3>📝 Votre avis compte !</h3>
                    <p style="font-size: 11px; color: #666; margin-top: 5px;">Questionnaire 100% anonyme pour nous aider à améliorer la prochaine édition.</p>
                    <p style="font-size: 12px; color: #d32f2f; font-weight: bold; margin-top: 5px;">⚠️ Remplissez-le pour débloquer le cadeau.</p>
                </div>
                <button class="btn-valider" style="background-color: var(--secondary);" onclick="openSurvey()">Répondre</button>
            `;
            list.appendChild(surveyCard);
        }
    }

    // 3. Affichage du Cadeau à la toute fin
    if (cadeauGame) {
        const isDone = savedProgress['cadeau'] === true;
        const surveyDone = localStorage.getItem('centurioSurveyDone') === 'true';
        
        const card = document.createElement('div');
        let buttonHtml = '';

        if (isDone) {
            card.className = `game-card animate-pop-in done`;
            card.style.borderLeftColor = 'var(--brand)';
            buttonHtml = '<button class="btn-valider" style="background-color: var(--brand); opacity: 0.8; cursor: default;">Récupéré 🎁</button>';
        } else if (!surveyDone) {
            card.className = `game-card animate-pop-in`;
            card.style.opacity = '0.5';
            card.style.borderLeftColor = '#888';
            card.style.filter = 'grayscale(100%)';
            buttonHtml = `<button class="btn-valider" style="background-color: #888; cursor: not-allowed;" onclick="alert('Veuillez remplir le questionnaire juste au-dessus pour débloquer votre cadeau !')">🔒 Bloqué</button>`;
        } else {
            card.className = `game-card animate-pop-in`;
            card.style.borderLeftColor = 'var(--brand)';
            buttonHtml = `<button class="btn-valider" style="background-color: var(--brand);" onclick="openModal('cadeau')">QR Code 🎁</button>`;
        }

        card.innerHTML = `
            <div class="game-info" style="text-align: left;">
                <h3 style="color: ${isDone || surveyDone ? 'var(--brand)' : '#888'};">${cadeauGame.name}</h3>
                <p style="font-size: 12px;">${isDone ? 'Cadeau récupéré à l\\'accueil, merci d\\'avoir participé !' : cadeauGame.desc}</p>
            </div>
            ${buttonHtml}
        `;
        list.appendChild(card);
    }

    updateProgressChart(completedCount, normalGames.length);

    const timeInfo = document.getElementById('last-validation-info');
    const savedTime = localStorage.getItem('centurioLastValidationTime');
    if (savedTime && completedCount > 0 && timeInfo) {
        timeInfo.innerText = savedTime;
        timeInfo.style.display = 'block';
    }
}

function updateProgressChart(completed, total) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const chartText = document.getElementById('chart-text');
    
    const percentage = (completed / total) * 100;
    if(chartText) chartText.innerText = `${Math.round(percentage)}%`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 90;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 15;
    ctx.stroke();
    
    if (percentage > 0) {
        const startAngle = -0.5 * Math.PI;
        const endAngle = startAngle + (percentage / 100) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = '#f8aa37';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

function openModal(gameId) {
    if (!userId) {
        alert("Génération de votre profil sécurisé en cours. Réessayez dans 1 seconde !");
        return;
    }
    document.getElementById('animator-modal').style.display = 'flex';
    const myDomain = window.location.origin; 
    const adminUrl = `${myDomain}/scan.html?user=${userId}&game=${gameId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(adminUrl)}`;
    document.getElementById('qr-container').innerHTML = `<img src="${qrCodeUrl}" alt="QR Code" style="border-radius:10px; border: 5px solid var(--primary); max-width: 100%;">`;
}

function closeModal() { document.getElementById('animator-modal').style.display = 'none'; }
function closeFinalModal() { document.getElementById('final-modal').style.display = 'none'; }

// --- LOGIQUE DU QUESTIONNAIRE ---
let answers = { q1: null, q2: null, q3: null };

function openSurvey() { document.getElementById('survey-modal').style.display = 'flex'; }

function selectOpt(question, value) {
    answers[question] = value;
    const options = document.getElementById('scale-' + question).children;
    for(let i=0; i<options.length; i++) {
        options[i].classList.remove('selected');
    }
    options[value - 1].classList.add('selected');
}

function submitSurvey() {
    if(!answers.q1 || !answers.q2 || !answers.q3) {
        document.getElementById('survey-error').style.display = 'block';
        return;
    }
    document.getElementById('survey-error').style.display = 'none';
    const comment = document.getElementById('survey-comment').value;

    fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1: answers.q1, q2: answers.q2, q3: answers.q3, comment: comment })
    }).then(() => {
        localStorage.setItem('centurioSurveyDone', 'true');
        document.getElementById('survey-modal').style.display = 'none';
        alert("Merci beaucoup ! Votre cadeau est débloqué ! 🎁");
        renderGames(); // Recharge l'affichage instantanément
    });
}

window.onload = function() { renderGames(); };
