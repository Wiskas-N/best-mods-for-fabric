const DISCORD_ID = "1474075672526852158";

const startScreen = document.getElementById('start-screen');
const container = document.querySelector('.container');
const cursor = document.querySelector('.cursor');

const video = document.getElementById('bg-video');
const audio = document.getElementById('bg-audio');

let isLoaded = { video: false, audio: false, discord: false };

let spotifyInterval = null;
let lastSong = null;
let currentSpotify = null;

function checkReady() {
    if (isLoaded.video && isLoaded.audio && isLoaded.discord) {
        document.getElementById('status-text').style.display = 'none';
        document.getElementById('loader-circle').style.display = 'none';
        document.getElementById('enter-hint').style.display = 'block';

        startScreen.onclick = () => {
            startScreen.classList.add('hidden');
            container.classList.add('visible');

            video?.play();

            if (audio) {
                audio.volume = 0.2;
                audio.play().catch(() => {});
            }
        };
    }
}

if (video) {
    video.onloadeddata = () => {
        isLoaded.video = true;
        checkReady();
    };
}

if (audio) {
    audio.oncanplay = () => {
        isLoaded.audio = true;
        checkReady();
    };
}

setTimeout(() => {
    if (!isLoaded.audio) {
        isLoaded.audio = true;
        checkReady();
    }
}, 2000);

document.addEventListener('mousemove', (e) => {
    if (!cursor) return;
    cursor.style.opacity = "1";
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

function connectLanyard() {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');

    ws.onopen = () => {
        ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: DISCORD_ID }
        }));
    };

    ws.onclose = () => {
        setTimeout(connectLanyard, 3000);
    };

    ws.onmessage = (event) => {
        const { t, d } = JSON.parse(event.data);

        if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
            updateProfile(d);

            if (!isLoaded.discord) {
                isLoaded.discord = true;
                checkReady();
            }
        }
    };
}

function updateProfile(data) {
    const {
        discord_user,
        discord_status,
        listening_to_spotify,
        spotify,
        activities
    } = data;

    const nameEl = document.getElementById('discord-name');
    const avEl = document.getElementById('discord-av');
    const statusDot = document.getElementById('status-dot');

    if (nameEl) {
        nameEl.textContent = discord_user.global_name || discord_user.username;
    }

    if (avEl) {
        avEl.src = `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.png?size=160`;
    }

    const colors = {
        online: '#23a55a',
        idle: '#f0b232',
        dnd: '#f23f43',
        offline: '#80848e'
    };

    const color = colors[discord_status] || colors.offline;

    if (statusDot) {
        statusDot.style.background = color;
        statusDot.style.boxShadow = `0 0 15px ${color}`;
    }

    const customStatus = activities?.find(a => a.type === 4);

    const miniStatus = document.getElementById('custom-status-mini');

    if (miniStatus) {
        if (customStatus?.state) {
            miniStatus.style.display = "flex";

            const emoji = customStatus.emoji
                ? (customStatus.emoji.id
                    ? `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.png">`
                    : customStatus.emoji.name)
                : '';

            miniStatus.innerHTML = `${emoji}${customStatus.state}`;
        } else {
            miniStatus.style.display = "none";
        }
    }

    const customStatusEl = document.getElementById('custom-status');

    if (customStatusEl) {
        if (customStatus?.state) {
            customStatusEl.style.display = "flex";

            customStatusEl.innerHTML = `
                <div class="custom-status-flex">
                    ${
                        customStatus.emoji?.id
                            ? `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.png" class="cs-emoji">`
                            : `<div class="cs-emoji" style="display:flex;align-items:center;justify-content:center;font-size:24px;">
                                ${customStatus.emoji?.name || ''}
                               </div>`
                    }
                    <div class="cs-content">
                        <p class="cs-label">STATUS</p>
                        <p class="cs-text">${customStatus.state}</p>
                    </div>
                </div>
            `;
        } else {
            customStatusEl.style.display = "none";
        }
    }

    const dynamicTile = document.getElementById('dynamic-tile');

    if (listening_to_spotify && spotify) {
        currentSpotify = spotify;
        dynamicTile.style.display = "block";

        if (spotify.song !== lastSong) {
            lastSong = spotify.song;

            dynamicTile.innerHTML = `
                <div class="spotify-flex">
                    <img src="${spotify.album_art_url}" class="sp-art">
                    <div style="flex:1; min-width:0;">
                        <p style="color:#1DB954; font-size:10px; font-weight:900;">SPOTIFY</p>
                        <p style="font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${spotify.song}
                        </p>
                        <div class="sp-bar">
                            <div class="sp-progress" id="sp-prog"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!spotifyInterval) {
            spotifyInterval = setInterval(() => {
                const prog = document.getElementById('sp-prog');
                if (!prog || !currentSpotify) return;

                const duration = currentSpotify.timestamps.end - currentSpotify.timestamps.start;
                const current = Date.now() - currentSpotify.timestamps.start;

                const prc = Math.min(100, (current / duration) * 100);
                prog.style.width = prc + "%";
            }, 1000);
        }

    } else {
        dynamicTile.style.display = "none";

        if (spotifyInterval) {
            clearInterval(spotifyInterval);
            spotifyInterval = null;
        }

        lastSong = null;
        currentSpotify = null;
    }
}

connectLanyard();