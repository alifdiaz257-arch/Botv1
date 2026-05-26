const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

// ============ READY EVENT ============
client.once('ready', async () => {
    console.log(`✅ Bot online sebagai ${client.user.tag}`);
    
    client.user.setPresence({
        activities: [{ name: '/help | LifxAi Bot', type: 3 }],
        status: 'online'
    });
    
    await registerSlashCommands();
});

// ============ SLASH COMMANDS ============
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('Menampilkan semua command'),
    new SlashCommandBuilder().setName('ping').setDescription('Cek ping bot'),
    new SlashCommandBuilder().setName('invite').setDescription('Invite bot ke server lo'),
    new SlashCommandBuilder().setName('stats').setDescription('Statistik bot'),
    new SlashCommandBuilder().setName('kick').setDescription('Kick member').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Ban member').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Hapus pesan').addIntegerOption(opt => opt.setName('amount').setDescription('Jumlah').setRequired(true)),
    new SlashCommandBuilder().setName('meme').setDescription('Random meme'),
    new SlashCommandBuilder().setName('joke').setDescription('Random joke lucu'),
    new SlashCommandBuilder().setName('quote').setDescription('Quote inspiratif'),
    new SlashCommandBuilder().setName('avatar').setDescription('Lihat avatar user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),
    new SlashCommandBuilder().setName('daily').setDescription('Claim daily reward'),
    new SlashCommandBuilder().setName('balance').setDescription('Cek saldo coins'),
    new SlashCommandBuilder().setName('work').setDescription('Kerja dapet duit'),
    new SlashCommandBuilder().setName('ai').setDescription('Chat dengan AI').addStringOption(opt => opt.setName('prompt').setDescription('Pertanyaan').setRequired(true))
];

async function registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands.map(cmd => cmd.toJSON()) });
        console.log(`✅ Registered ${commands.length} slash commands`);
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
}

// ============ ECONOMY SYSTEM ============
const economy = new Map();

function getBalance(userId) {
    return economy.get(userId) || { coins: 1000, lastDaily: 0 };
}

// ============ COMMAND HANDLER ============
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName, user, channel, member } = interaction;
    
    // HELP
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('💙 LIFX AI BOT — PUBLIC EDITION 💙')
            .setDescription(`
**📌 GENERAL**
\`/help\` - Menu bantuan
\`/ping\` - Cek ping bot
\`/invite\` - Invite bot
\`/stats\` - Statistik bot

**🎮 FUN**
\`/meme\` - Random meme
\`/joke\` - Random joke
\`/quote\` - Quote inspiratif
\`/avatar\` - Lihat avatar

**💰 ECONOMY**
\`/daily\` - Claim daily reward
\`/balance\` - Cek saldo
\`/work\` - Kerja dapet duit

**🤖 AI**
\`/ai\` - Chat dengan AI

**🔧 MODERATION** *(Admin only)*
\`/kick\`, \`/ban\`, \`/clear\`
            `)
            .setColor('#3B82F6')
            .setFooter({ text: 'Bot by LifxAi' });
        
        await interaction.reply({ embeds: [embed] });
    }
    
    // PING
    if (commandName === 'ping') {
        await interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }
    
    // INVITE
    if (commandName === 'invite') {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
        await interaction.reply(`🔗 **Invite Bot ke server lo:**\n${inviteUrl}`);
    }
    
    // STATS
    if (commandName === 'stats') {
        const embed = new EmbedBuilder()
            .setTitle('📊 BOT STATISTICS')
            .setColor('#3B82F6')
            .addFields(
                { name: '🟢 Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
                { name: '⚡ Ping', value: `${client.ws.ping}ms`, inline: true }
            );
        await interaction.reply({ embeds: [embed] });
    }
    
    // KICK (Admin only)
    if (commandName === 'kick') {
        if (!member.permissions.has('KickMembers')) {
            return interaction.reply({ content: '❌ Lo gak punya permission kick!', ephemeral: true });
        }
        const target = interaction.options.getMember('user');
        await target.kick();
        await interaction.reply(`✅ ${target.user.tag} di-kick dari server!`);
    }
    
    // BAN (Admin only)
    if (commandName === 'ban') {
        if (!member.permissions.has('BanMembers')) {
            return interaction.reply({ content: '❌ Lo gak punya permission ban!', ephemeral: true });
        }
        const target = interaction.options.getMember('user');
        await target.ban();
        await interaction.reply(`✅ ${target.user.tag} di-ban dari server!`);
    }
    
    // CLEAR (Admin only)
    if (commandName === 'clear') {
        if (!member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ Lo gak punya permission clear!', ephemeral: true });
        }
        const amount = interaction.options.getInteger('amount');
        await channel.bulkDelete(Math.min(amount, 100));
        await interaction.reply({ content: `✅ ${amount} pesan dihapus!`, ephemeral: true });
    }
    
    // MEME
    if (commandName === 'meme') {
        const memes = ['https://i.imgflip.com/1bij.jpg', 'https://i.imgflip.com/26am.jpg', 'https://i.imgflip.com/43a4p.jpg'];
        await interaction.reply(memes[Math.floor(Math.random() * memes.length)]);
    }
    
    // JOKE
    if (commandName === 'joke') {
        const jokes = ['Kenapa ayam nyeberang jalan? Biar sampai ke seberang!', 'Programmer mana yang suka game? Yang lagi debug!'];
        await interaction.reply(jokes[Math.floor(Math.random() * jokes.length)]);
    }
    
    // QUOTE
    if (commandName === 'quote') {
        const quotes = ['✨ Jangan takut gagal, takutlah untuk tidak mencoba ✨', '💪 Sukses dimulai dari mimpi 💪'];
        await interaction.reply(quotes[Math.floor(Math.random() * quotes.length)]);
    }
    
    // AVATAR
    if (commandName === 'avatar') {
        const target = interaction.options.getUser('user') || user;
        await interaction.reply(target.displayAvatarURL({ size: 1024, dynamic: true }));
    }
    
    // DAILY
    if (commandName === 'daily') {
        const data = getBalance(user.id);
        const now = Date.now();
        if (now - (data.lastDaily || 0) < 86400000) {
            return interaction.reply({ content: '⏰ Daily reward bisa diambil lagi besok!', ephemeral: true });
        }
        data.coins += 500;
        data.lastDaily = now;
        economy.set(user.id, data);
        await interaction.reply(`🎉 Daily reward 500 coins! Balance: ${data.coins} coins`);
    }
    
    // BALANCE
    if (commandName === 'balance') {
        const data = getBalance(user.id);
        await interaction.reply(`💰 Balance: ${data.coins} coins`);
    }
    
    // WORK
    if (commandName === 'work') {
        const reward = Math.floor(Math.random() * 200) + 50;
        const data = getBalance(user.id);
        data.coins += reward;
        economy.set(user.id, data);
        await interaction.reply(`💼 Kerja dapet ${reward} coins! Total: ${data.coins} coins`);
    }
    
    // AI
    if (commandName === 'ai') {
        const prompt = interaction.options.getString('prompt');
        await interaction.reply(`🤖 *Processing...*`);
        setTimeout(() => {
            interaction.editReply(`💙 **LifxAi:** "${prompt}" itu pertanyaan bagus! Teruslah belajar dan berkembang! 🔥`);
        }, 1500);
    }
});

client.login(TOKEN);