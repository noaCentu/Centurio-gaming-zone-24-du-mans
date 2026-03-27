const games = [
    { id: 'mk', name: 'Mario Kart', desc: 'Finir dans le Top 3' },
    { id: 'mp', name: 'Mario Party', desc: 'Gagner un mini-jeu' },
    { id: 'ss', name: 'Switch Sports', desc: 'Faire un strike au Bowling' },
    { id: 'tk', name: 'Tekken', desc: 'Gagner un combat' },
    { id: 'jd', name: 'Just Dance', desc: 'Obtenir 4 étoiles minimum' },
    { id: 'tm', name: 'Trackmania', desc: 'Battre le temps fantôme' },
    { id: 'fg', name: 'Fall Guys', desc: 'Se qualifier à la 1ère manche' }
];

// 1. Identité du Visiteur
let userId = localStorage.getItem('centurioUserId');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('centurioUserId', userId);
}

// 2. Connexion Magique au Serveur (Temps Réel)
const socket = io();
socket.emit('register_user', userId);

// 🌟 3. LE SPECTACLE : Quand l'animateur scanne avec succès !
socket.on('challenge_validated', (gameId) => {
    // A. On sauvegarde la victoire dans le téléphone du joueur
    let savedProgress = JSON.parse(localStorage.getItem('centurioProgress')) || {};
    savedProgress[gameId] = true;
    localStorage.setItem('centurioProgress', JSON.stringify(savedProgress));
    
    // B. On cache le QR Code instantanément
    closeModal();
    
    // C. On fait exploser l'animation de succès sur l'écran du joueur !
    const successModal = document.getElementById('success-modal');
    if(successModal) {
        successModal.style.display = 'flex';
        // L'animation reste à l'écran 3 secondes puis se ferme toute seule
        setTimeout(() => {
            successModal.style.display = 'none';
        }, 3000);
    }
    
    // D. On met à jour la jauge et les boutons
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
            ? '<button class="btn-valider">Validé</button>' 
            : `<button class="btn-valider" onclick="openModal('${game.id}')">QR Code</button>`;

        card.innerHTML = `
            <div class="game-info">
                <h3>${game.name}</h3>
                <p>${isDone ? '✅ Défi réussi' : game.desc}</p>
            </div>
            ${buttonHtml}
        `;
        list.appendChild(card);
    });

    updateProgressChart(completedCount, games.length);
    if (completedCount === games.length) {
        // Un petit délai pour que le joueur voit d'abord la modale de succès du dernier défi
        setTimeout(() => {
            openFinalModal();
        }, 3500); 
    }
}

// Graphique Camembert
function updateProgressChart(completed, total) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const chartText = document.getElementById('chart-text');
    
    const percentage = (completed / total) * 100;
    chartText.innerText = `${Math.round(percentage)}%`;

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
    document.getElementById('animator-modal').style.display = 'flex';
    
    const myDomain = window.location.origin; 
    const adminUrl = `${myDomain}/scan.html?user=${userId}&game=${gameId}`;
    
    // QR Code HD
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(adminUrl)}`;
    document.getElementById('qr-container').innerHTML = `<img src="${qrCodeUrl}" alt="QR Code" style="border-radius:10px; border: 5px solid var(--primary); max-width: 100%;">`;
}

function closeModal() { document.getElementById('animator-modal').style.display = 'none'; }
function openFinalModal() { document.getElementById('final-modal').style.display = 'flex'; }
function closeFinalModal() { document.getElementById('final-modal').style.display = 'none'; }

window.onload = function() { renderGames(); };
