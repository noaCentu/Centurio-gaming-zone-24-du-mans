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
    
    // Le déclenchement des modales "Succès" et "Final" se fait maintenant dans defis.html
    renderGames(); 
});

function renderGames() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    
    list.innerHTML = '';
    const savedProgress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let completedCount = 0;

    // On sépare les vrais jeux du Cadeau final
    const normalGames = games.filter(g => g.id !== 'cadeau');
    const cadeauGame = games.find(g => g.id === 'cadeau');

    // 1. Affichage des jeux normaux
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
            // On le place visuellement AVANT le cadeau
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
            // Cadeau déjà récupéré à l'accueil
            card.className = `game-card animate-pop-in done`;
            card.style.borderLeftColor = 'var(--brand)';
            buttonHtml = '<button class="btn-valider" style="background-color: var(--brand); opacity: 0.8; cursor: default;">Récupéré 🎁</button>';
        } else if (!surveyDone) {
            // Bloqué tant que le questionnaire n'est pas fait
            card.className = `game-card animate-pop-in`;
            card.style.opacity = '0.5';
            card.style.borderLeftColor = '#888';
            card.style.filter = 'grayscale(100%)';
            buttonHtml = `<button class="btn-valider" style="background-color: #888; cursor: not-allowed;" onclick="alert('Veuillez remplir le questionnaire juste au-dessus pour débloquer votre cadeau !')">🔒 Bloqué</button>`;
        } else {
            // Débloqué !
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

    // Camembert basé uniquement sur les 7 vrais jeux
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
function openFinalModal() { document.getElementById('final-modal').style.display = 'flex'; }
function closeFinalModal() { document.getElementById('final-modal').style.display = 'none'; }

window.onload = function() { renderGames(); };
