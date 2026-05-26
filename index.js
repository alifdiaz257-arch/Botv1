const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'lifxai_default_secret';

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Middleware autentikasi JWT
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.user = null;
        return next();
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (error) {
        req.user = null;
    }
    next();
}

// ============ DISCORD OAUTH2 CONFIG ============
const DISCORD_API = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const OWNER_IDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [];

// ============ ROUTES WEB ============

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard page (harus login)
app.get('/dashboard', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Invite page (halaman khusus invite bot)
app.get('/invite', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'invite.html'));
});

// ============ DISCORD OAUTH2 ROUTES ============

// Redirect ke Discord login
app.get('/auth/discord', (req, res) => {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds%20email`;
    res.redirect(authUrl);
});

// Callback setelah login Discord
app.get('/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.redirect('/?error=no_code');
    }
    
    try {
        // Exchange code untuk access token
        const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`, 
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        const { access_token } = tokenResponse.data;
        
        // Ambil data user
        const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        // Ambil list server user
        const guildsResponse = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        // Cek apakah user adalah owner bot
        const isOwner = OWNER_IDS.includes(userResponse.data.id);
        
        // Buat JWT token
        const jwtToken = jwt.sign({
            id: userResponse.data.id,
            username: userResponse.data.username,
            discriminator: userResponse.data.discriminator,
            avatar: userResponse.data.avatar,
            email: userResponse.data.email,
            guilds: guildsResponse.data,
            isOwner: isOwner
        }, JWT_SECRET, { expiresIn: '7d' });
        
        // Set cookie
        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.redirect('/?error=login_failed');
    }
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// ============ API ENDPOINTS ============

// Get current user info
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

// Get bot statistics
app.get('/api/bot/stats', (req, res) => {
    res.json({
        uptime: process.uptime(),
        ping: 42,
        servers: 247,
        users: 15892,
        commands: 52,
        status: 'online',
        version: '2.0.0'
    });
});

// Get user's servers (guilds)
app.get('/api/servers', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(req.user.guilds || []);
});

// Get all available commands
app.get('/api/commands', (req, res) => {
    const commands = [
        { name: 'help', description: 'Menampilkan semua command', category: 'general' },
        { name: 'ping', description: 'Cek ping bot', category: 'general' },
        { name: 'invite', description: 'Invite bot ke server', category: 'general' },
        { name: 'stats', description: 'Statistik bot', category: 'general' },
        { name: 'kick', description: 'Kick member dari server', category: 'moderation' },
        { name: 'ban', description: 'Ban member dari server', category: 'moderation' },
        { name: 'clear', description: 'Hapus pesan di channel', category: 'moderation' },
        { name: 'meme', description: 'Random meme dari Reddit', category: 'fun' },
        { name: 'joke', description: 'Random joke lucu', category: 'fun' },
        { name: 'quote', description: 'Quote inspiratif', category: 'fun' },
        { name: 'avatar', description: 'Lihat avatar user', category: 'fun' },
        { name: 'daily', description: 'Claim daily reward', category: 'economy' },
        { name: 'balance', description: 'Cek saldo coins', category: 'economy' },
        { name: 'work', description: 'Kerja dapet duit', category: 'economy' },
        { name: 'leaderboard', description: 'Top 10 richest users', category: 'economy' },
        { name: 'ai', description: 'Chat dengan AI', category: 'ai' }
    ];
    res.json(commands);
});

// Get bot invite URL
app.get('/api/invite', (req, res) => {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
    res.json({ url: inviteUrl });
});

// Check if user is owner
app.get('/api/isOwner', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ isOwner: req.user.isOwner });
});

// ============ START SERVER (untuk local) ============
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}

// Export untuk Vercel
module.exports = app;