const DISCORD_ID = "1474075672526852158";

const startScreen = document.getElementById('start-screen');
const container = document.querySelector('.container');
const cursor = document.querySelector('.cursor');

let isLoaded = { video: false, audio: false, discord: false };

let spotifyInterval = null;
let lastSong = null;

function checkReady() {
    if (isLoaded.video && isLoaded.audio && isLoaded.discord) {
        document.getElementById('status-text').style.display = 'none';
        document.getElementById('loader-circle').style.display = 'none';
        document.getElementById('enter-hint').style.display = 'block';

        startScreen.onclick = () => {
            startScreen.classList.add('hidden');
            container.classList.add('visible');

            const video = document.getElementById('bg-video');
            const audio = document.getElementById('bg-audio');

            video.play();

            audio.volume = 0.2;
            audio.play().catch(() => {});
        };
    }
}

const video = document.getElementById('bg-video');
const audio = document.getElementById('bg-audio');

// Быстрые события загрузки вместо canplaythrough
video.onloadeddata = () => {
    isLoaded.video = true;
    checkReady();
};

audio.oncanplay = () => {
    isLoaded.audio = true;
    checkReady();
};

// fallback если аудио тупит
setTimeout(() => {
    if (!isLoaded.audio) {
        isLoaded.audio = true;
        checkReady();
    }
}, 2000);

document.addEventListener('mousemove', (e) => {
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
        spotify
    } = data;

    document.getElementById('discord-name').textContent =
        discord_user.global_name || discord_user.username;

    document.getElementById('discord-av').src =
        `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.png?size=160`;

    const colors = {
        online: '#23a55a',
        idle: '#f0b232',
        dnd: '#f23f43',
        offline: '#80848e'
    };

    const statusDot = document.getElementById('status-dot');
    const color = colors[discord_status] || colors.offline;

    statusDot.style.background = color;
    statusDot.style.boxShadow = `0 0 15px ${color}`;

    const dynamicTile = document.getElementById('dynamic-tile');

    if (listening_to_spotify && spotify) {
        dynamicTile.style.display = "block";

        // если трек сменился - перерисовываем
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
                </div>`;
        }

        // чистим старый интервал
        if (spotifyInterval) clearInterval(spotifyInterval);

        spotifyInterval = setInterval(() => {
            const prog = document.getElementById('sp-prog');
            if (!prog) return;

            const duration = spotify.timestamps.end - spotify.timestamps.start;
            const current = Date.now() - spotify.timestamps.start;

            const prc = Math.min(100, (current / duration) * 100);
            prog.style.width = prc + "%";
        }, 1000);

    } else {
        dynamicTile.style.display = "none";

        if (spotifyInterval) {
            clearInterval(spotifyInterval);
            spotifyInterval = null;
        }

        lastSong = null;
    }
}

connectLanyard();