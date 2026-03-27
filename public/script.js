const games = [
    { id: 'mk', name: 'Mario Kart', desc: 'Finir dans le Top 3' },
    { id: 'mp', name: 'Mario Party', desc: 'Gagner un mini-jeu' },
    { id: 'ss', name: 'Switch Sports', desc: 'Faire un strike au Bowling' },
    { id: 'tk', name: 'Tekken', desc: 'Gagner un combat' },
    { id: 'jd', name: 'Just Dance', desc: 'Obtenir 4 étoiles minimum' },
    { id: 'tm', name: 'Trackmania', desc: 'Battre le temps fantôme' },
    { id: 'fg', name: 'Fall Guys', desc: 'Se qualifier à la 1ère manche' },
    { id: 'cadeau', name: '🎁 Cadeau Centurio', desc: "Va à l'accueil récupérer ton cadeau                                 ⚠️ Plus tu as de défis validés, plus ton cadeau sera gros !" }
];

// 1. Identité du Visiteur : On charge ce qu'on a en mémoire
let userId = localStorage.getItem('centurioUserId');
const socket = io();

// 🛡️ NOUVEAU : Chargement de l'empreinte matérielle (Anti-Triche)
FingerprintJS.load().then(fp => {
    fp.get().then(result => {
        const hardwareId = result.visitorId; // Le code unique et indestructible de ce téléphone
        
        // Si c'est un nouveau ou qu'il a supprimé son historique, on force son ID matériel
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
    
    const successModal = document.getElementById('success-modal');
    if(successModal) {
        successModal.style.display = 'flex';
        setTimeout(() => { successModal.style.display = 'none'; }, 3000);
    }
    
    renderGames(); 
});

// Gère l'affichage sur la page "Défis"
function renderGames() {
    const list = document.getElementById('games-list');
    if (!list) return; 
    
    list.innerHTML = '';
    const savedProgress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    let completedCount = 0;

    games.forEach(function(game, index) {
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

    updateProgressChart(completedCount, games.length);

    const timeInfo = document.getElementById('last-validation-info');
    const savedTime = localStorage.getItem('centurioLastValidationTime');
    if (savedTime && completedCount > 0 && timeInfo) {
        timeInfo.innerText = savedTime;
        timeInfo.style.display = 'block';
    }

    if (completedCount === games.length) {
        // 🚨 NOUVEAU : Le joueur a fini ! On envoie son ID matériel à la liste noire du serveur
        fetch('/api/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });

        setTimeout(() => { openFinalModal(); }, 3500); 
    }
}

// Graphique Camembert
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
