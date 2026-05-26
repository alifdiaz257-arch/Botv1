const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// ============ CONFIGURATION ============
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lifxai_default_secret_change_this';

// FALLBACK MANUAL (GUNAKAN INI KALAU ENV DI VERCEL TIDAK TERBACA)
const CLIENT_ID_FALLBACK = '1495417904085205152';
const CLIENT_SECRET_FALLBACK = 'GWLHyZ_cHdI2lXOzBrz7qiBMqpPkUDMJ3jHJqLVoEMM3o';

// Ambil dari env, kalau undefined pake fallback
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || CLIENT_ID_FALLBACK;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || CLIENT_SECRET_FALLBACK;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://bot-woad-six.vercel.app/auth/discord/callback';
const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Middleware autentikasi
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.user = null;
        return next();
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        req.user = null;
    }
    next();
}

// ============ ROUTES ============

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard (harus login)
app.get('/dashboard', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Invite page
app.get('/invite', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'invite.html'));
});

// ============ DISCORD OAUTH2 ============

// Step 1: Redirect ke Discord login
app.get('/auth/discord', (req, res) => {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds%20email`;
    console.log('🔐 Redirecting to:', authUrl);
    res.redirect(authUrl);
});

// Step 2: Callback setelah user login
app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        console.log('❌ No code received');
        return res.redirect('/?error=no_code');
    }
    
    console.log('📩 Code received:', code.substring(0, 20) + '...');
    
    try {
        // Tukar code dengan access token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
            new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }), {
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        );
        
        const { access_token } = tokenResponse.data;
        console.log('✅ Access token obtained');
        
        // Ambil data user
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        // Ambil list server user
        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        const userData = userResponse.data;
        const isOwner = OWNER_IDS.includes(userData.id);
        
        // Buat JWT token
        const jwtToken = jwt.sign({
            id: userData.id,
            username: userData.username,
            avatar: userData.avatar,
            email: userData.email,
            guilds: guildsResponse.data,
            isOwner: isOwner
        }, JWT_SECRET, { expiresIn: '7d' });
        
        // Set cookie
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        console.log('✅ Login successful for:', userData.username);
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('❌ OAuth Error:', error.response?.data || error.message);
        res.redirect('/?error=login_failed');
    }
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// ============ API ENDPOINTS ============

// Get current user
app.get('/api/user', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        email: req.user.email,
        isOwner: req.user.isOwner,
        guildCount: req.user.guilds?.length || 0
    });
});

// Get bot stats
app.get('/api/bot/stats', (req, res) => {
    res.json({
        uptime: process.uptime(),
        ping: 42,
        servers: 247,
        users: 15892,
        commands: 52,
        status: 'online'
    });
});

// Get user's servers
app.get('/api/servers', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(req.user.guilds || []);
});

// Get all commands
app.get('/api/commands', (req, res) => {
    const commands = [
        { name: 'help', description: 'Menu bantuan', category: 'general' },
        { name: 'ping', description: 'Cek ping bot', category: 'general' },
        { name: 'invite', description: 'Invite bot ke server', category: 'general' },
        { name: 'kick', description: 'Kick member', category: 'moderation' },
        { name: 'ban', description: 'Ban member', category: 'moderation' },
        { name: 'clear', description: 'Hapus pesan', category: 'moderation' },
        { name: 'meme', description: 'Random meme', category: 'fun' },
        { name: 'joke', description: 'Random joke', category: 'fun' },
        { name: 'quote', description: 'Quote inspiratif', category: 'fun' },
        { name: 'daily', description: 'Claim daily reward', category: 'economy' },
        { name: 'balance', description: 'Cek saldo', category: 'economy' },
        { name: 'work', description: 'Kerja dapet duit', category: 'economy' }
    ];
    res.json(commands);
});

// Get invite URL
app.get('/api/invite', (req, res) => {
    const clientId = DISCORD_CLIENT_ID;
    if (!clientId || clientId === 'undefined') {
        return res.status(500).json({ error: 'CLIENT_ID not configured' });
    }
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    res.json({ url: inviteUrl });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
    res.json({
        clientId: DISCORD_CLIENT_ID ? DISCORD_CLIENT_ID.substring(0, 10) + '...' : 'MISSING',
        clientIdFull: DISCORD_CLIENT_ID,
        redirectUri: REDIRECT_URI,
        hasCookie: !!req.cookies.token,
        nodeEnv: process.env.NODE_ENV || 'development'
    });
});

// ============ START SERVER ============
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════╗
║   💙 LIFX AI — DISCORD BOT DASHBOARD 💙              ║
║   🚀 Server running on http://localhost:${PORT}        ║
║   🔐 Client ID: ${DISCORD_CLIENT_ID ? '✅ ADA' : '❌ MISSING'}
║   🔑 Client Secret: ${DISCORD_CLIENT_SECRET ? '✅ ADA' : '❌ MISSING'}
║   🌐 Redirect URI: ${REDIRECT_URI}
╚══════════════════════════════════════════════════════╝
        `);
    });
}

module.exports = app;
