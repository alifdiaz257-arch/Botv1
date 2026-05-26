// Fetch user info
async function fetchUser() {
    try {
        const res = await fetch('/api/user');
        if (res.status === 401) {
            window.location.href = '/';
            return;
        }
        const data = await res.json();
        document.getElementById('username').innerText = data.username;
        document.getElementById('userAvatar').innerText = data.username?.charAt(0).toUpperCase() || 'U';
    } catch(e) {
        console.error(e);
        window.location.href = '/';
    }
}

// Fetch bot stats
async function fetchStats() {
    try {
        const res = await fetch('/api/bot/stats');
        const data = await res.json();
        document.getElementById('statUptime').innerText = Math.floor((data.uptime || 0) / 3600);
        document.getElementById('statPing').innerText = data.ping || 0;
        document.getElementById('statServers').innerText = data.servers || 0;
        document.getElementById('statUsers').innerText = data.users || 0;
        document.getElementById('statCommands').innerText = data.commands || 0;
        document.getElementById('statStatus').innerHTML = data.status === 'online' ? '🟢 Online' : '🔴 Offline';
    } catch(e) {
        console.error(e);
    }
}

// Fetch user's servers
async function fetchServers() {
    try {
        const res = await fetch('/api/servers');
        const servers = await res.json();
        const grid = document.getElementById('serversGrid');
        if (grid) {
            grid.innerHTML = '';
            if (!servers.length) {
                grid.innerHTML = '<p style="color: gray;">Belum ada server yang terdeteksi. Pastikan bot sudah diinvite!</p>';
                return;
            }
            servers.forEach(server => {
                const card = document.createElement('div');
                card.className = 'server-card';
                card.innerHTML = `
                    <div class="user-avatar" style="width: 50px; height: 50px;">${(server.name || 'S').charAt(0)}</div>
                    <div><strong>${server.name}</strong><br><span style="font-size:12px;color:gray;">ID: ${server.id}</span></div>
                `;
                grid.appendChild(card);
            });
        }
    } catch(e) {
        console.error(e);
    }
}

// Fetch all commands
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
        console.error(e);
    }
}

// Section navigation
function showSection(section) {
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('serversSection').style.display = 'none';
    document.getElementById('commandsSection').style.display = 'none';
    document.getElementById('settingsSection').style.display = 'none';
    
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    
    if (section === 'dashboard') {
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('nav-dashboard')?.classList.add('active');
        fetchStats();
    }
    if (section === 'servers') {
        document.getElementById('serversSection').style.display = 'block';
        document.getElementById('nav-servers')?.classList.add('active');
        fetchServers();
    }
    if (section === 'commands') {
        document.getElementById('commandsSection').style.display = 'block';
        document.getElementById('nav-commands')?.classList.add('active');
        fetchCommands();
    }
    if (section === 'settings') {
        document.getElementById('settingsSection').style.display = 'block';
        document.getElementById('nav-settings')?.classList.add('active');
    }
}

// Initial load
fetchUser();
fetchStats();
setInterval(fetchStats, 10000);