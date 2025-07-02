const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const variables = require('./variables.js');
const { statuses } = require('./status.js');

// Enhanced client with additional options
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages
    ],
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: false
    }
});

// Collections for commands
client.slashCommands = new Collection();
client.normalCommands = new Collection();
client.cooldowns = new Collection();

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Load handlers
const loadHandlers = () => {
    try {
        const handlerPath = path.join(__dirname, 'handlers');
        if (!fs.existsSync(handlerPath)) {
            fs.mkdirSync(handlerPath, { recursive: true });
            return;
        }

        const handlerFiles = fs.readdirSync(handlerPath).filter(file => file.endsWith('.js'));
        
        if (handlerFiles.length === 0) {
            return;
        }

        for (const file of handlerFiles) {
            try {
                delete require.cache[require.resolve(`./handlers/${file}`)];
                const handler = require(`./handlers/${file}`);
                handler(client);
                console.log(`✅ Loaded handler: ${file}`);
            } catch (error) {
                console.error(`❌ Error loading handler ${file}:`, error);
            }
        }
        
        console.log(`📦 Loaded ${handlerFiles.length} handlers`);
    } catch (error) {
        console.error('❌ Error loading handlers:', error);
    }
};

// Refresh slash commands
const refreshSlashCommands = async () => {
    try {
        const commands = [];
        const slashCommandsPath = path.join(__dirname, 'commands', 'slash');
        
        if (!fs.existsSync(slashCommandsPath)) {
            return;
        }
        
        const getSlashCommandFiles = (dir = slashCommandsPath) => {
            const files = [];
            try {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(dir, item.name);
                    if (item.isDirectory()) {
                        files.push(...getSlashCommandFiles(fullPath));
                    } else if (item.name.endsWith('.js')) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.error('Error reading slash commands directory:', error);
            }
            return files;
        };
        
        const slashCommandFiles = getSlashCommandFiles();
        
        for (const file of slashCommandFiles) {
            try {
                delete require.cache[require.resolve(file)];
                const command = require(file);
                
                if (!command.data || !command.execute) {
                    continue;
                }
                
                commands.push(command.data.toJSON());
            } catch (error) {
                console.error(`Error loading slash command file ${file}:`, error);
            }
        }

        if (commands.length === 0) {
            return;
        }

        const rest = new REST({ version: '10' }).setToken(config.token);
        
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        for (const [index, guild] of client.guilds.cache.entries()) {
            try {
                await rest.put(
                    Routes.applicationGuildCommands(config.clientId, guild.id),
                    { body: commands }
                );
                
                if (index < client.guilds.cache.size - 1) {
                    await delay(600);
                }
            } catch (error) {
                if (error.status === 429) {
                    const retryAfter = error.retry_after || 5000;
                    await delay(retryAfter);
                }
                console.error(`Error refreshing commands for guild ${guild.id}:`, error);
            }
        }
        
        console.log(`🔄 Refreshed slash commands for ${client.guilds.cache.size} guilds`);
    } catch (error) {
        console.error('❌ Error refreshing slash commands:', error);
    }
};

// Status rotation
let statusIndex = 0;
const rotateStatus = () => {
    try {
        if (!statuses || statuses.length === 0 || !client.user) return;
        
        const status = statuses[statusIndex];
        if (!status || !status.name || !status.type) {
            return;
        }
        
        client.user.setActivity(status.name, { type: ActivityType[status.type] });
        statusIndex = (statusIndex + 1) % statuses.length;
    } catch (error) {
        console.error('Error rotating status:', error);
    }
};

// Ready event
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Logged in as ${readyClient.user.tag}`);
    client.config = config;
    loadHandlers();
    await refreshSlashCommands();
    
    rotateStatus();
    const statusInterval = setInterval(rotateStatus, variables.statusRotationInterval);
    const refreshInterval = setInterval(refreshSlashCommands, variables.slashCommandRefreshInterval);
    
    client.on('disconnect', () => {
        clearInterval(statusInterval);
        clearInterval(refreshInterval);
    });
});

// Message handler
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.system) return;
    if (!message.guild && !config.allowDMs) return;
    
let prefix = null;
let args = [];

// Check for custom guild prefix first
const customPrefix = client.config.guildPrefixes[message.guild?.id];
const prefixToUse = customPrefix || config.prefix;
    
    try {
        if (message.content.startsWith(prefixToUse)) {
            prefix = prefixToUse;
            args = message.content.slice(prefixToUse.length).trim().split(/ +/);
        }
        
        if (!prefix && config.mention && message.mentions.has(client.user)) {
            const mentionRegex = new RegExp(`^<@!?${client.user.id}>\\s*`);
            if (mentionRegex.test(message.content)) {
                prefix = `<@${client.user.id}>`;
                args = message.content.replace(mentionRegex, '').trim().split(/ +/);
            }
        }
        
        if (!prefix || args.length === 0) return;
        
        const commandName = args.shift().toLowerCase();
        const command = client.normalCommands.get(commandName) || 
                        client.normalCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        
        if (!command) return;
        
        // Cooldown handling
        if (!client.cooldowns.has(command.name)) {
            client.cooldowns.set(command.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = client.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || variables.commandCooldown);
        
        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const cooldownMessage = await message.reply(
                    `${variables.emojis.solvix_clock} Please wait ${timeLeft.toFixed(1)} more seconds before using \`${command.name}\` again.`
                );
                
                setTimeout(async () => {
                    try {
                        await cooldownMessage.delete();
                    } catch (error) {
                        console.error('Error deleting cooldown message:', error);
                    }
                }, variables.cooldownMessageDeleteTime);
                
                return;
            }
        }
        
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        
        await command.execute(message, args, client);
        
    } catch (error) {
        console.error('Command execution error:', error);
        const errorMessage = `${variables.emojis.error} There was an error executing that command!`;
        
        try {
            if (message.replied || message.deferred) {
                await message.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await message.reply(errorMessage);
            }
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }
});

// Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.slashCommands.get(interaction.commandName);
    
    if (!command) return;
    
    try {
        
        // Cooldown handling
        if (!client.cooldowns.has(command.data.name)) {
            client.cooldowns.set(command.data.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = client.cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || variables.commandCooldown);
        
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                await interaction.reply({
                    content: `${variables.emojis.solvix_clock} Please wait ${timeLeft.toFixed(1)} more seconds before using this command again.`,
                    ephemeral: true
                });
                return;
            }
        }
        
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
        await command.execute(interaction, client);
        
    } catch (error) {
        console.error('Interaction error:', error);
        const errorReply = { 
            content: `${variables.emojis.error} There was an error executing this command!`, 
            ephemeral: true 
        };
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorReply);
            } else {
                await interaction.reply(errorReply);
            }
        } catch (replyError) {
            console.error('Error sending error reply:', replyError);
        }
    }
});

// Error handlers
client.on(Events.Error, error => {
    console.error('Client error:', error);
});

client.on(Events.Warn, info => {
    console.warn('Client warning:', info);
});

client.on(Events.Debug, info => {
    console.debug('Client debug:', info);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('Shutting down gracefully...');
    client.destroy();
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Login
client.login(config.token).catch(error => {
    console.error('Login error:', error);
    process.exit(1);
});