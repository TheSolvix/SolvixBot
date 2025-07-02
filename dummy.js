/*
================================================================================
Discord Bot Code Documentation
Generated on: 7/2/2025, 11:22:41 PM
Root Directory: /data/data/com.termux/files/home/Projects/SolvixBot
Total Files: 15
================================================================================
*/

// TABLE OF CONTENTS
// ==================================================
// 1. commands/normal/BotInfo/ping.js
// 2. commands/normal/Settings/prefix.js
// 3. commands/slash/BotInfo/ping.js
// 4. commands/slash/Settings/prefix.js
// 5. config.js
// 6. handlers/autoExecute.js
// 7. handlers/normalCommands.js
// 8. handlers/slashCommands.js
// 9. index.js
// 10. package.json
// 11. prefixes.json
// 12. status.js
// 13. variables/colors.js
// 14. variables/emojis.js
// 15. variables.js


================================================================================
// 1. FILE: commands/normal/BotInfo/ping.js
================================================================================
const { EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    name: 'ping',
    description: 'Check the bot\'s latency and response time',
    usage: 'ping',
    aliases: ['pong', 'latency', 'lag', 'ms', 'speed', 'connection', 'test'],
    category: 'BotInfo',
    
    async execute(message, args, client) {
        const startTime = Date.now();
        const websocketLatency = Math.round(client.ws.ping);
        
        // Get dynamic ping emojis and statuses for both latencies
        const websocketPingEmoji = variables.getPingEmoji(websocketLatency);
        const websocketPingStatus = variables.getPingStatus(websocketLatency);
        
        // Calculate round trip latency after sending the message
        const sent = await message.reply({ embeds: [new EmbedBuilder().setDescription("Measuring ping...").setColor(variables.embedColor)] });
        const roundTripLatency = Date.now() - startTime;
        
        const roundTripPingEmoji = variables.getRoundTripEmoji(roundTripLatency);
        const roundTripPingStatus = variables.getRoundTripStatus(roundTripLatency);
        
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${websocketPingEmoji} Pong!`)
            .setAuthor({
                name: `${variables.botName} • v${variables.botVersion}`,
                iconURL: client.user.displayAvatarURL()
            })
            .addFields(
                { 
                    name: `${roundTripPingEmoji} Roundtrip Latency`, 
                    value: `\`${roundTripLatency}ms\` - ${roundTripPingStatus}`, 
                    inline: true 
                },
                { 
                    name: `${websocketPingEmoji} Bot Latency`, 
                    value: `\`${websocketLatency}ms\` - ${websocketPingStatus}`, 
                    inline: true 
                },
                {
                    name: `${variables.emojis.world} Overall Quality`,
                    value: `\`${variables.getOverallStatus(roundTripLatency, websocketLatency)}\``,
                    inline: true
                }
            )
            .setFooter({ 
                text: `Requested by ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();
        
        await sent.edit({ 
            embeds: [embed] 
        });
    }
};

================================================================================
// 2. FILE: commands/normal/Settings/prefix.js
================================================================================
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    name: 'prefix',
    description: 'Set or reset the bot\'s prefix for this server',
    usage: 'prefix <set/reset> [new_prefix]',
    aliases: ['setprefix', 'changeprefix', 'resetprefix'],
    category: 'Settings',
    permissions: [PermissionFlagsBits.ManageGuild],

    async execute(message, args, client) {
        // Check if user has permission to manage the guild
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.error} Insufficient Permissions`)
                .setDescription('You need the **Manage Server** permission to change the bot prefix.')
                .setFooter(variables.getNormalCommandFooter(message))
                .setTimestamp();

            return await message.reply({ embeds: [noPermEmbed] });
        }

        // If no arguments provided, show current prefix and help
        if (args.length === 0) {
            const helpEmbed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.bot} Prefix Settings`)
                .setAuthor(variables.getAuthor(client))
                .setDescription(`Current prefix: \`${client.config.guildPrefixes[message.guild.id] || 'sv!'}\``)
                .addFields(
                    {
                        name: `${variables.emojis.plus} Set Prefix`,
                        value: '`prefix set <new_prefix>`\nChange the bot prefix for this server',
                        inline: false
                    },
                    {
                        name: `${variables.emojis.minus} Reset Prefix`,
                        value: '`prefix reset`\nReset the prefix back to default (`sv!`)',
                        inline: false
                    },
                    {
                        name: `${variables.emojis.system} Examples`,
                        value: '• `prefix set !` - Set prefix to `!`\n• `prefix set bot.` - Set prefix to `bot.`\n• `prefix reset` - Reset to default prefix',
                        inline: false
                    }
                )
                .setFooter(variables.getNormalCommandFooter(message))
                .setTimestamp();

            return await message.reply({ embeds: [helpEmbed] });
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'set': {
                if (args.length < 2) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Usage`)
                        .setDescription('Please provide a new prefix.\n\n**Usage:** `prefix set <new_prefix>`')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [errorEmbed] });
                }

                const newPrefix = args.slice(1).join(' ');

                // Validation checks
                if (newPrefix.length === 0 || newPrefix.trim().length === 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Prefix`)
                        .setDescription('Prefix cannot be empty or only whitespace!')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [errorEmbed] });
                }

                if (newPrefix.length > 10) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Prefix`)
                        .setDescription('Prefix cannot be longer than 10 characters!')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [errorEmbed] });
                }

                const oldPrefix = client.config.guildPrefixes[message.guild.id] || 'sv!';
                client.config.guildPrefixes[message.guild.id] = newPrefix;
                client.config.savePrefixes();

                const successEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.tick} Prefix Updated Successfully`)
                    .setAuthor(variables.getAuthor(client))
                    .setDescription(
                        `**Old Prefix:** \`${oldPrefix}\`\n` +
                        `**New Prefix:** \`${newPrefix}\`\n\n` +
                        `You can now use commands like: \`${newPrefix}ping\``
                    )
                    .addFields({
                        name: `${variables.emojis.plus} Quick Tips`,
                        value:
                            `• Use \`${newPrefix}help\` to see all commands\n` +
                            `• You can change the prefix again anytime\n` +
                            `• Slash commands (/) still work normally`,
                        inline: false
                    })
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [successEmbed] });
                break;
            }

            case 'reset': {
                const currentPrefix = client.config.guildPrefixes[message.guild.id];

                if (!currentPrefix || currentPrefix === 'sv!') {
                    const alreadyDefaultEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.system} Already Default`)
                        .setDescription('The prefix is already set to the default (`sv!`).')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [alreadyDefaultEmbed] });
                }

                delete client.config.guildPrefixes[message.guild.id];
                client.config.savePrefixes();
                const defaultPrefix = 'sv!';

                const resetEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.tick} Prefix Reset`)
                    .setAuthor(variables.getAuthor(client))
                    .setDescription(
                        `Successfully reset the prefix back to default.\n\n` +
                        `You can now use commands like: \`${defaultPrefix}ping\``
                    )
                    .addFields({
                        name: `${variables.emojis.plus} Quick Tips`,
                        value:
                            `• Use \`${defaultPrefix}help\` to see all commands\n` +
                            `• You can change the prefix again anytime with \`${defaultPrefix}prefix set <new_prefix>\`\n` +
                            `• Slash commands (/) still work normally`,
                        inline: false
                    })
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [resetEmbed] });
                break;
            }

            default: {
                const invalidActionEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.error} Invalid Action`)
                    .setDescription('Please use either `set` or `reset`.')
                    .addFields({
                        name: `${variables.emojis.system} Valid Actions`,
                        value: '• `prefix set <new_prefix>` - Set a new prefix\n• `prefix reset` - Reset to default prefix',
                        inline: false
                    })
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [invalidActionEmbed] });
                break;
            }
        }
    }
};

================================================================================
// 3. FILE: commands/slash/BotInfo/ping.js
================================================================================
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and response time')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Make the response visible only to you')
                .setRequired(false)),
    
    category: 'BotInfo',
    
    async execute(interaction, client) {
        // Get ephemeral option (default to false if not specified)
        const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
        
        // Start measuring time immediately
        const startTime = Date.now();
        
        // Get WebSocket latency first (instant)
        const websocketLatency = Math.round(client.ws.ping);
        
        // Send initial empty response to measure round trip
        await interaction.reply({
            content: ' ',
            embeds: [new EmbedBuilder().setDescription("Measuring ping...").setColor(variables.embedColor)],
            ephemeral: isEphemeral,
            fetchReply: true
        });
        
        // Calculate round trip latency
        const roundTripLatency = Date.now() - startTime;
        
        // Get dynamic ping emojis and statuses
        const websocketPingEmoji = variables.getPingEmoji(websocketLatency);
        const websocketPingStatus = variables.getPingStatus(websocketLatency);
        const roundTripPingEmoji = variables.getRoundTripEmoji(roundTripLatency);
        const roundTripPingStatus = variables.getRoundTripStatus(roundTripLatency);
        
        // Create the final embed
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${websocketPingEmoji} Pong!`)
            .setAuthor({
                name: `${variables.botName} • v${variables.botVersion}`,
                iconURL: client.user.displayAvatarURL()
            })
            .addFields(
                { 
                    name: `${roundTripPingEmoji} Roundtrip Latency`, 
                    value: `\`${roundTripLatency}ms\` - ${roundTripPingStatus}`, 
                    inline: true 
                },
                { 
                    name: `${websocketPingEmoji} Bot Latency`, 
                    value: `\`${websocketLatency}ms\` - ${websocketPingStatus}`, 
                    inline: true 
                },
                {
                    name: `${variables.emojis.world} Overall Quality`,
                    value: `\`${variables.getOverallStatus(roundTripLatency, websocketLatency)}\``,
                    inline: true
                }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();
        
        // Edit the initial response with the final embed
        await interaction.editReply({ 
            content: null,
            embeds: [embed]
        });
    }
};

================================================================================
// 4. FILE: commands/slash/Settings/prefix.js
================================================================================
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Set or reset the bot\'s prefix for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a new prefix for this server')
                .addStringOption(option =>
                    option.setName('new_prefix')
                        .setDescription('The new prefix to set')
                        .setRequired(true)
                        .setMaxLength(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the prefix back to default (sv!)')),
    
    category: 'Settings',
    
    async execute(interaction, client) {
        // Check if user has permission to manage the guild
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.error} Insufficient Permissions`)
                .setDescription('You need the **Manage Server** permission to change the bot prefix.')
                .setFooter(variables.getSlashCommandFooter(interaction))
                .setTimestamp();

            return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const currentPrefix = client.config.guildPrefixes[interaction.guild.id] || 'sv!';

        switch (subcommand) {
            case 'set': {
                const newPrefix = interaction.options.getString('new_prefix');

                // Validation checks
                if (newPrefix.length === 0 || newPrefix.trim().length === 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Prefix`)
                        .setDescription('Prefix cannot be empty or only whitespace!')
                        .setFooter(variables.getSlashCommandFooter(interaction))
                        .setTimestamp();

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                const oldPrefix = currentPrefix;
                client.config.guildPrefixes[interaction.guild.id] = newPrefix;
                client.config.savePrefixes();

                const successEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.tick} Prefix Updated Successfully`)
                    .setAuthor(variables.getAuthor(client))
                    .setDescription(
                        `**Old Prefix:** \`${oldPrefix}\`\n` +
                        `**New Prefix:** \`${newPrefix}\`\n\n` +
                        `You can now use commands like: \`${newPrefix}ping\``
                    )
                    .addFields({
                        name: `${variables.emojis.plus} Quick Tips`,
                        value:
                            `• Use \`${newPrefix}help\` to see all commands\n` +
                            `• You can change the prefix again anytime\n` +
                            `• Slash commands (/) still work normally`,
                        inline: false
                    })
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [successEmbed] });
                break;
            }

            case 'reset': {
                if (currentPrefix === 'sv!') {
                    const alreadyDefaultEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.system} Already Default`)
                        .setDescription('The prefix is already set to the default (`sv!`).')
                        .setFooter(variables.getSlashCommandFooter(interaction))
                        .setTimestamp();

                    return await interaction.reply({ embeds: [alreadyDefaultEmbed], ephemeral: true });
                }

                delete client.config.guildPrefixes[interaction.guild.id];
                client.config.savePrefixes();
                const defaultPrefix = 'sv!';

                const resetEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.tick} Prefix Reset`)
                    .setAuthor(variables.getAuthor(client))
                    .setDescription(
                        `Successfully reset the prefix back to default.\n\n` +
                        `You can now use commands like: \`${defaultPrefix}ping\``
                    )
                    .addFields({
                        name: `${variables.emojis.plus} Quick Tips`,
                        value:
                            `• Use \`${defaultPrefix}help\` to see all commands\n` +
                            `• You can change the prefix again anytime with \`${defaultPrefix}prefix set <new_prefix>\`\n` +
                            `• Slash commands (/) still work normally`,
                        inline: false
                    })
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [resetEmbed] });
                break;
            }
        }
    }
};

================================================================================
// 5. FILE: config.js
================================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Path to the prefixes file
const prefixesPath = path.join(__dirname, 'prefixes.json');

// Load prefixes from file or create empty object
let guildPrefixes = {};
if (fs.existsSync(prefixesPath)) {
    guildPrefixes = JSON.parse(fs.readFileSync(prefixesPath, 'utf8'));
}

// Function to save prefixes
function savePrefixes() {
    fs.writeFileSync(prefixesPath, JSON.stringify(guildPrefixes, null, 2));
}

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: '1389543343595327618',
    prefix: 'sv!',
    mention: false,
    ownerId: '1356342705784881368',
    allowDMs: false,
    guildPrefixes, // Add the loaded prefixes
    savePrefixes   // Add the save function
};

================================================================================
// 6. FILE: handlers/autoExecute.js
================================================================================
// handlers/autoExecute.js
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const loadAutoExecuteModules = () => {
        const autoExecutePath = path.join(__dirname, '../autoexecute');
        
        // Create AutoExecute directory if it doesn't exist
        if (!fs.existsSync(autoExecutePath)) {
            fs.mkdirSync(autoExecutePath, { recursive: true });
            console.log('📁 Created AutoExecute directory');
            return;
        }
        
        const autoExecuteFiles = fs.readdirSync(autoExecutePath).filter(file => file.endsWith('.js'));
        
        if (autoExecuteFiles.length === 0) {
            console.log('📂 No AutoExecute modules found');
            return;
        }
        
        for (const file of autoExecuteFiles) {
            try {
                const filePath = path.join(autoExecutePath, file);
                
                // Clear cache to ensure fresh load
                delete require.cache[require.resolve(filePath)];
                
                const autoExecuteModule = require(filePath);
                
                // Validate the module structure
                if (!autoExecuteModule.name || !autoExecuteModule.event || !autoExecuteModule.execute) {
                    console.warn(`⚠️ Invalid AutoExecute module: ${file} (missing required properties)`);
                    continue;
                }
                
                // Register the event listener
                client.on(autoExecuteModule.event, (...args) => {
                    try {
                        autoExecuteModule.execute(...args, client);
                    } catch (error) {
                        console.error(`❌ Error executing AutoExecute module ${autoExecuteModule.name}:`, error);
                    }
                });
                
                console.log(`✅ Loaded AutoExecute module: ${autoExecuteModule.name} (${autoExecuteModule.event})`);
                
            } catch (error) {
                console.error(`❌ Error loading AutoExecute module ${file}:`, error);
            }
        }
        
        console.log(`📦 Loaded ${autoExecuteFiles.length} AutoExecute modules`);
    };
    
    // Watch for changes in AutoExecute directory for hot reloading
    const watchAutoExecuteDirectory = () => {
        const autoExecutePath = path.join(__dirname, '../AutoExecute');
        
        if (!fs.existsSync(autoExecutePath)) {
            return;
        }
        
        fs.watch(autoExecutePath, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                console.log(`🔄 AutoExecute file changed: ${filename}, reloading...`);
                
                // Remove all existing listeners for auto-execute events
                const autoExecuteEvents = ['guildCreate', 'guildDelete', 'guildMemberAdd', 'guildMemberRemove',];
                autoExecuteEvents.forEach(event => {
                    client.removeAllListeners(event);
                });
                
                // Reload all auto-execute modules
                loadAutoExecuteModules();
            }
        });
    };
    
    // Load modules and start watching
    loadAutoExecuteModules();
    watchAutoExecuteDirectory();
};

================================================================================
// 7. FILE: handlers/normalCommands.js
================================================================================
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const loadNormalCommands = (dir = '') => {
        const commandsPath = path.join(__dirname, '../commands/normal', dir);
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            return;
        }
        
        const items = fs.readdirSync(commandsPath, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                // Recursively load commands from subdirectories
                loadNormalCommands(path.join(dir, item.name));
            } else if (item.name.endsWith('.js')) {
                const filePath = path.join(commandsPath, item.name);
                
                delete require.cache[require.resolve(filePath)];
                
                try {
                    const command = require(filePath);
                    if ('name' in command && 'execute' in command) {
                        client.normalCommands.set(command.name, command);
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
        }
    };
    
    const watchDirectory = (dir) => {
        const watchPath = path.join(__dirname, '../commands/normal', dir);
        if (!fs.existsSync(watchPath)) return;
        
        fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                client.normalCommands.clear();
                loadNormalCommands();
            }
        });
    };
    
    loadNormalCommands();
    watchDirectory('');
};

================================================================================
// 8. FILE: handlers/slashCommands.js
================================================================================
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const loadSlashCommands = (dir = '') => {
        const commandsPath = path.join(__dirname, '../commands/slash', dir);
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath, { recursive: true });
            return;
        }
        
        const items = fs.readdirSync(commandsPath, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                // Recursively load commands from subdirectories
                loadSlashCommands(path.join(dir, item.name));
            } else if (item.name.endsWith('.js')) {
                const filePath = path.join(commandsPath, item.name);
                
                delete require.cache[require.resolve(filePath)];
                
                try {
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        // Check for duplicates before setting
                        if (client.slashCommands.has(command.data.name)) {
                            continue;
                        }
                        
                        client.slashCommands.set(command.data.name, command);
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
        }
    };
    
    const watchDirectory = (dir) => {
        const watchPath = path.join(__dirname, '../commands/slash', dir);
        if (!fs.existsSync(watchPath)) return;
        
        fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                client.slashCommands.clear();
                loadSlashCommands();
            }
        });
    };
    
    // Clear existing commands before loading to prevent duplicates
    client.slashCommands.clear();
    loadSlashCommands();
    watchDirectory('');
};

================================================================================
// 9. FILE: index.js
================================================================================
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

================================================================================
// 10. FILE: package.json
================================================================================
{
    "name": "solvix-discord-bot",
    "version": "1.0.0",
    "description": "Advanced Discord bot with slash commands, prefix commands, and mention commands",
    "main": "index.js",
    "scripts": {
        "start": "node index.js",
        "dev": "nodemon index.js",
        "docs": "node docs.js"
    },
    "keywords": [
        "discord",
        "bot",
        "slash-commands",
        "discord.js"
    ],
    "author": "Your Name",
    "license": "MIT",
    "dependencies": {
        "discord.js": "^14.21.0",
        "dotenv": "^17.0.1",
        "mongodb": "^6.17.0"
    },
    "devDependencies": {
        "nodemon": "^3.1.10"
    }
}


================================================================================
// 11. FILE: prefixes.json
================================================================================
{}

================================================================================
// 12. FILE: status.js
================================================================================
module.exports = {
    statuses: [
        {
            name: 'with slash commands',
            type: 'Playing'
        },
        {
            name: 'sv!help for commands',
            type: 'Listening'
        },
        {
            name: 'your messages',
            type: 'Watching'
        },
        {
            name: 'discord.js',
            type: 'Competing'
        },
        {
            name: 'Solvix v1.0.0',
            type: 'Playing'
        }
    ]
};

================================================================================
// 13. FILE: variables/colors.js
================================================================================
module.exports = {
    // Main theme color
    embedColor: '#0ccdd8',
    
    // Status colors
    errorColor: '#ff0000',
    warningColor: '#ffff00',
    successColor: '#0ccdd8',
    
    // Additional useful colors
    primaryColor: '#0ccdd8',
    secondaryColor: '#36393f',
    infoColor: '#3498db',
    dangerColor: '#e74c3c',
    darkColor: '#2c2f33',
    lightColor: '#ffffff',
    mutedColor: '#99aab5',
    
    // Discord brand colors
    discordBlurple: '#5865f2',
    discordGreen: '#57f287',
    discordYellow: '#fee75c',
    discordFuchsia: '#eb459e',
    discordRed: '#ed4245'
};

================================================================================
// 14. FILE: variables/emojis.js
================================================================================
module.exports = {
    // Basic emojis
    server: '<:solvix_server:1389949054481600583>',
    memory: '<:solvix_memory:1389944264775045160>',
    error: '<:solvix_wrong:1389942418857660546>',
    system: '<:solvix_system:1389941562569396284>',
    plus: '<:solvix_plus:1389933034308112384>',
    minus: '<:solvix_minus:1389933117221109844>',
    right_arrow: '<:solvix_right_arrow:1389929459444092969>',
    bot: '<:solvix_bot:1389924004353151016>',
    solvix_loading: '<:solvix_loading:1389898159530180741>',
    solvix_clock: '<:solvix_clock:1389903761945923616>',
    world: '<:solvix_world:1389882708112703521>',
    uptime: '<:solvix_uptime:1389910756689969192>',
    
    // Ping status emojis
    ping_excellent: '<:solvix_ping_excellent:1389879070191521802>',
    ping_good: '<:solvix_ping_good:1389879134959828993>',
    ping_noticeable: '<:solvix_ping_noticeable:1389879216077668444>',
    ping_poor: '<:solvix_ping_poor:1389879302593581086>',
    
    // Other emojis
    star: '<:solvix_star:1389926371689500672>',
    rocket: '<:solvix_rocket:1389926286381547551>',
    fire: '🔥',
    heart: '❤️',
    thumbsup: '👍',
    tick: '<:solvix_tick:1389888270867107921>'
};

================================================================================
// 15. FILE: variables.js
================================================================================
// variables.js
const emojis = require('./variables/emojis.js');
const colors = require('./variables/colors.js');

module.exports = {
    // Bot information
    botName: 'Solvix',
    botVersion: '1.0.0',
    
    // Import colors and emojis
    ...colors,
    emojis: emojis,
    
    // Timing (in milliseconds)
    statusRotationInterval: 30000, // 30 seconds
    slashCommandRefreshInterval: 1800000, // 30 minutes
    
    // Command settings
    commandCooldown: 3000, // 3 seconds
    maxCommandLength: 2000,
    cooldownMessageDeleteTime: 2500, // Time to delete cooldown message (in ms)
    
    // Embed settings
    embedThumbnail: null,
    embedFooter: 'Solvix', // Default fallback footer
    embedTimestamp: true,
    
    // Command statistics tracking
    commandStats: {
        total: 0,
        commands: {}
    },
    
    // Author helper function
    getAuthor: function(client) {
        return {
            name: `${this.botName} • v${this.botVersion}`,
            iconURL: client.user.displayAvatarURL()
        };
    },
    
    // Rest of your existing functions...
    // (keep all the existing functions like getPingEmoji, getPingStatus, etc.)
    
    // Footer helper functions
    getSlashCommandFooter: function(interaction) {
        return {
            text: `Requested by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        };
    },
    
    getNormalCommandFooter: function(message) {
        return {
            text: `Requested by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        };
    },
    
    // Generic footer function that detects the type
    getCommandFooter: function(context) {
        if (context.user) {
            // It's an interaction
            return this.getSlashCommandFooter(context);
        } else if (context.author) {
            // It's a message
            return this.getNormalCommandFooter(context);
        } else {
            // Fallback
            return { text: this.embedFooter };
        }
    },
    
    // Websocket Latency (Bot Latency) utility functions
    getPingEmoji: function(ping) {
        if (ping > 400) return emojis.ping_poor;
        if (ping > 150) return emojis.ping_noticeable;
        if (ping > 50) return emojis.ping_good;
        return emojis.ping_excellent;
    },
    
    getPingStatus: function(ping) {
        if (ping > 400) return 'Poor';
        if (ping > 150) return 'Noticeable';
        if (ping > 50) return 'Good';
        return 'Excellent';
    },
    
    // Round Trip Latency utility functions (using different thresholds)
    getRoundTripEmoji: function(latency) {
        if (latency > 800) return emojis.ping_poor;      // Very slow round trip
        if (latency > 400) return emojis.ping_noticeable; // Noticeable delay
        if (latency > 200) return emojis.ping_good;       // Good response
        return emojis.ping_excellent;                     // Excellent response
    },
    
    getRoundTripStatus: function(latency) {
        if (latency > 800) return 'Poor';
        if (latency > 400) return 'Noticeable';
        if (latency > 200) return 'Good';
        return 'Excellent';
    },
    
    // Overall connection quality based on both metrics
    getOverallStatus: function(roundTrip, websocket) {
        const roundTripScore = this.getLatencyScore(roundTrip, 'roundtrip');
        const websocketScore = this.getLatencyScore(websocket, 'websocket');
        
        // Calculate average score
        const averageScore = (roundTripScore + websocketScore) / 2;
        
        if (averageScore >= 4) return 'Excellent';
        if (averageScore >= 3) return 'Good';
        if (averageScore >= 2) return 'Noticeable';
        return 'Poor';
    },
    
    // Helper function to convert latency to score
    getLatencyScore: function(latency, type) {
        if (type === 'roundtrip') {
            if (latency <= 200) return 4;  // Excellent
            if (latency <= 400) return 3;  // Good
            if (latency <= 800) return 2;  // Noticeable
            return 1;                      // Poor
        } else { // websocket
            if (latency <= 50) return 4;   // Excellent
            if (latency <= 150) return 3;  // Good
            if (latency <= 400) return 2;  // Noticeable
            return 1;                      // Poor
        }
    },
    
    // Get color based on latency (useful for future enhancements)
    getLatencyColor: function(latency, type = 'websocket') {
        const score = this.getLatencyScore(latency, type);
        switch (score) {
            case 4: return colors.successColor;    // Excellent - Green
            case 3: return colors.infoColor;       // Good - Blue
            case 2: return colors.warningColor;    // Noticeable - Yellow
            case 1: return colors.errorColor;      // Poor - Red
            default: return colors.embedColor;     // Default
        }
    }
};

/*
================================================================================
End of Documentation
Total Files Documented: 15
Generated by: Discord Bot Documentation Generator
Date: 7/2/2025, 11:22:41 PM
================================================================================
*/
