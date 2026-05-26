// Fetch stats dari API
async function fetchStats() {
    try {
        const res = await fetch('/api/bot/stats');
        const data = await res.json();
        document.getElementById('statServers').innerText = data.servers || 0;
        document.getElementById('statUsers').innerText = data.users || 0;
        document.getElementById('statCommands').innerText = data.commands || 0;
        document.getElementById('statPing').innerText = data.ping || 0;
    } catch(e) {
        console.error('Stats error:', e);
    }
}

// Fetch commands dari API
async function fetchCommands() {
    try {
        const res = await fetch('/api/commands');
        const commands = await res.json();
        const grid = document.getElementById('commandsGrid');
        if (grid) {
            grid.innerHTML = '';
            commands.forEach(cmd => {
                const badge = document.createElement('div');
                badge.className = 'command-badge';
                badge.innerText = `/${cmd.name || cmd}`;
                grid.appendChild(badge);
            });
        }
    } catch(e) {
        console.error('Commands error:', e);
    }
}

// Cek status login (untuk update tombol)
async function checkLogin() {
    try {
        const res = await fetch('/api/user');
        if (res.status === 200) {
            const user = await res.json();
            // Update UI jika perlu
        }
    } catch(e) {}
}

// Load semua data
fetchStats();
fetchCommands();
checkLogin();
setInterval(fetchStats, 30000);