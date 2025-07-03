/*
================================================================================
Discord Bot Code Documentation
Generated on: 7/3/2025, 1:11:26 PM
Root Directory: /data/data/com.termux/files/home/Projects/SolvixBot
Total Files: 24
================================================================================
*/

// TABLE OF CONTENTS
// ==================================================
// 1. autoexecute/guildjoin.js
// 2. autoexecute/guildleave.js
// 3. commands/normal/BotInfo/help.js
// 4. commands/normal/BotInfo/ping.js
// 5. commands/normal/Settings/resetprefix.js
// 6. commands/normal/Settings/setprefix.js
// 7. commands/normal/Utility/embedcreator.js
// 8. commands/slash/BotInfo/help.js
// 9. commands/slash/BotInfo/ping.js
// 10. commands/slash/Settings/resetprefix.js
// 11. commands/slash/Settings/setprefix.js
// 12. commands/slash/Utility/embedcreator.js
// 13. config.js
// 14. data/guild_prefixes.json
// 15. handlers/autoExecute.js
// 16. handlers/normalCommands.js
// 17. handlers/slashCommands.js
// 18. index.js
// 19. package.json
// 20. status.js
// 21. utils/database.js
// 22. variables/colors.js
// 23. variables/emojis.js
// 24. variables.js


================================================================================
// 1. FILE: autoexecute/guildjoin.js
================================================================================
const { EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'guildjoin',
    description: 'Handles guild join events and sends welcome messages',
    event: 'guildCreate',
    
    async execute(guild, client) {
        try {
            await this.registerSlashCommands(guild, client);
            await this.sendWelcomeMessage(guild, client);
            await this.logServerJoin(guild, client);
        } catch (error) {
            console.error('Error in guildCreate event:', error);
        }
    },

    async registerSlashCommands(guild, client) {
        try {
            const config = require('../config.js');
            const commands = [];
            const slashCommandsPath = path.join(__dirname, '../commands', 'slash');

            if (!fs.existsSync(slashCommandsPath)) return;

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
                    if (command.data && command.execute) {
                        commands.push(command.data.toJSON());
                    }
                } catch (error) {
                    console.error(`Error loading slash command file ${file}:`, error);
                }
            }

            if (commands.length === 0) return;

            const rest = new REST({ version: '10' }).setToken(config.token);

            await rest.put(
                Routes.applicationGuildCommands(config.clientId, guild.id),
                { body: commands }
            );
        } catch (error) {
            console.error('Error registering slash commands:', error);
        }
    },

    async sendWelcomeMessage(guild, client) {
        try {
            const config = require('../config.js');
            const variables = require('../variables.js');
            const targetChannel = await this.findBestChannel(guild);

            if (!targetChannel) return;

            const welcomeEmbed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.bot} Hello ${guild.name}!`)
                .setDescription(`Thanks for adding **${variables.botName}** to your server! I'm ready to help make your Discord experience better.`)
                .addFields(
                    {
                        name: `${variables.emojis.rocket} Getting Started`,
                        value: `Use \`${config.prefix}help\` to see all available commands, or try slash commands by typing \`/\`!`,
                        inline: false
                    },
                    {
                        name: `${variables.emojis.star} Features`,
                        value: `• Moderation\n• Fun Commands\n• Utility Tools`,
                        inline: true
                    }
                )
                .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
                .setFooter({
                    text: `${variables.botName} v${variables.botVersion} • Now serving ${client.guilds.cache.size} servers`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            if (guild.iconURL()) {
                welcomeEmbed.setAuthor({
                    name: `Welcome to ${guild.name}!`,
                    iconURL: guild.iconURL({ dynamic: true })
                });
            }

            setTimeout(async () => {
                try {
                    await targetChannel.send({ embeds: [welcomeEmbed] });
                } catch (error) {
                    console.error('Error sending welcome message:', error);
                }
            }, 1500);
        } catch (error) {
            console.error('Error in sendWelcomeMessage:', error);
        }
    },

    async findBestChannel(guild) {
        try {
            const requiredPermissions = ['SendMessages', 'EmbedLinks', 'ViewChannel'];

            if (guild.systemChannel && guild.systemChannel.permissionsFor(guild.members.me)?.has(requiredPermissions)) {
                return guild.systemChannel;
            }

            if (guild.rulesChannel && guild.rulesChannel.permissionsFor(guild.members.me)?.has(requiredPermissions)) {
                return guild.rulesChannel;
            }

            if (guild.publicUpdatesChannel && guild.publicUpdatesChannel.permissionsFor(guild.members.me)?.has(requiredPermissions)) {
                return guild.publicUpdatesChannel;
            }

            const commonNames = [
                'welcome', 'general', 'main', 'chat', 'lobby',
                'bot-commands', 'commands', 'bots', 'bot-chat',
                'announcements', 'info', 'start-here'
            ];

            for (const name of commonNames) {
                const channel = guild.channels.cache.find(ch => 
                    ch.type === 0 &&
                    ch.name.toLowerCase().includes(name) &&
                    ch.permissionsFor(guild.members.me)?.has(requiredPermissions)
                );
                if (channel) return channel;
            }

            const textChannels = guild.channels.cache.filter(channel => 
                channel.type === 0 &&
                channel.permissionsFor(guild.members.me)?.has(requiredPermissions)
            );

            if (textChannels.size > 0) {
                const sortedChannels = textChannels.sort((a, b) => a.position - b.position);
                return sortedChannels.first();
            }

            return null;
        } catch (error) {
            console.error('Error in findBestChannel:', error);
            return null;
        }
    },

    async logServerJoin(guild, client) {
        try {
            const variables = require('../variables.js');
            
            // Target the specific channel ID
            const logChannel = client.channels.cache.get('1389927187926224979');
            if (!logChannel) {
                console.error('Log channel not found');
                return;
            }

            // Create an invite link
            let invite;
            try {
                const channel = await this.findBestChannel(guild);
                if (channel) {
                    invite = await channel.createInvite({
                        maxAge: 0, // Permanent
                        maxUses: 0, // Unlimited uses
                        unique: true,
                        reason: 'Server join logging'
                    });
                }
            } catch (error) {
                console.error('Error creating invite:', error);
            }

            // Get server owner
            let owner;
            try {
                owner = await guild.fetchOwner();
            } catch (error) {
                console.error('Error fetching owner:', error);
            }

            // Prepare server information
            const serverInfo = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.plus} Bot Joined a New Server`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || client.user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: 'Server Name', value: guild.name, inline: true },
                    { name: 'Server ID', value: guild.id, inline: true },
                    { name: 'Member Count', value: guild.memberCount.toString(), inline: true },
                    { name: 'Server Owner', value: owner ? `${owner.user.tag} (${owner.id})` : 'Unknown', inline: true },
                    { name: 'Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: 'Bot Count', value: guild.members.cache.filter(m => m.user.bot).size.toString(), inline: true },
                    { name: 'Server Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
                    { name: 'Verification Level', value: this.getVerificationLevel(guild.verificationLevel), inline: true },
                    { name: 'Invite Link', value: invite ? `[Click here to join](${invite.url})` : 'Could not create invite', inline: false }
                )
                .setFooter({
                    text: `Now in ${client.guilds.cache.size} servers | ${variables.botName} v${variables.botVersion}`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            await logChannel.send({ embeds: [serverInfo] });
        } catch (error) {
            console.error('Error in logServerJoin:', error);
        }
    },

    getVerificationLevel(level) {
        const levels = {
            NONE: 'None',
            LOW: 'Low',
            MEDIUM: 'Medium',
            HIGH: 'High',
            VERY_HIGH: 'Highest'
        };
        return levels[level] || 'Unknown';
    }
};

================================================================================
// 2. FILE: autoexecute/guildleave.js
================================================================================
const { EmbedBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    name: 'guildleave',
    description: 'Handles guild leave events and sends leave messages',
    event: 'guildDelete',
    
    async execute(guild, client) {
        try {
            await this.logServerLeave(guild, client);
        } catch (error) {
            console.error('Error in guildDelete event:', error);
        }
    },

    async logServerLeave(guild, client) {
        try {
            const variables = require('../variables.js');
            
            // Target the specific channel ID for leave logs
            const logChannel = client.channels.cache.get('1389930783858491482');
            if (!logChannel) {
                console.error('Leave log channel not found');
                return;
            }

            // Get server owner (try to fetch if not cached)
            let owner;
            try {
                owner = await guild.fetchOwner();
            } catch (error) {
                // If fetch fails, try to get from cache
                owner = guild.members.cache.get(guild.ownerId);
                console.error('Error fetching owner:', error);
            }

            // Calculate duration the bot was in the server
            let durationInServer = 'Unknown';
            try {
                const joinDate = guild.me?.joinedAt;
                if (joinDate) {
                    const durationMs = Date.now() - joinDate.getTime();
                    durationInServer = this.formatDuration(durationMs);
                }
            } catch (error) {
                console.error('Error calculating duration:', error);
            }

            // Prepare server leave information
            const leaveEmbed = new EmbedBuilder()
                .setColor(`${variables.embedColor}`) // Red color for leave events
                .setTitle(`${variables.emojis.minus} Bot Left a Server`)
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || client.user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: 'Server Name', value: guild.name, inline: true },
                    { name: 'Server ID', value: guild.id, inline: true },
                    { name: 'Member Count', value: guild.memberCount?.toString() || 'Unknown', inline: true },
                    { name: 'Server Owner', value: owner ? `${owner.user?.tag || 'Unknown'} (${owner.id})` : 'Unknown', inline: true },
                    { name: 'Bot Was in Server For', value: durationInServer, inline: true },
                    { name: 'Left At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Server Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true }
                )
                .setFooter({
                    text: `Now in ${client.guilds.cache.size} servers | ${variables.botName} v${variables.botVersion}`,
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            await logChannel.send({ embeds: [leaveEmbed] });
        } catch (error) {
            console.error('Error in logServerLeave:', error);
        }
    },

    formatDuration(ms) {
        if (isNaN(ms)) return 'Unknown';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
};

================================================================================
// 3. FILE: commands/normal/BotInfo/help.js
================================================================================

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    name: 'help',
    aliases: ['h', 'commands'],
    description: 'Get help with bot commands and features',
    usage: 'help [command]',
    category: 'BotInfo',
    cooldown: 3000,
    
    // Configuration for command visibility (same as slash version)
    config: {
        // Category visibility (set to false to hide entire category)
        category_BotInfo: true,
        category_Settings: true,
        category_Utility: true,
        
        // Individual command visibility (set to false to hide specific command)
        command_ping: true,
        command_botinfo: true,
        command_stats: true,
        command_uptime: true,
        command_setprefix: true,
        command_resetprefix: true,
        command_embedcreator: true,
        command_help: true
    },
    
    async execute(message, args, client) {
        try {
            const specificCommand = args[0];
            
            if (specificCommand) {
                return await this.showSpecificCommand(message, client, specificCommand);
            }
            
            // Get current server prefix
            const database = require('../../../utils/database.js');
            const guildPrefix = message.guild ? await database.getGuildPrefix(message.guild.id) : null;
            const currentPrefix = guildPrefix || require('../../../config.js').prefix;
            
            // Get all available commands
            const commands = await this.getAvailableCommands(client);
            
            // Create main help embed
            const mainEmbed = this.createMainHelpEmbed(client, commands, message, currentPrefix);
            
            // Create components
            const components = this.createComponents(commands);
            
            const response = await message.reply({
                embeds: [mainEmbed],
                components: components
            });
            
            // Handle component interactions
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 300000 // 5 minutes
            });
            
            const buttonCollector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });
            
            collector.on('collect', async (selectInteraction) => {
                if (selectInteraction.user.id !== message.author.id) {
                    return selectInteraction.reply({
                        content: 'This help menu is not for you!',
                        ephemeral: true
                    });
                }
                
                const selectedCategory = selectInteraction.values[0];
                
                if (selectedCategory === 'overview') {
                    await selectInteraction.update({
                        embeds: [mainEmbed],
                        components: components
                    });
                } else {
                    const database = require('../../../utils/database.js');
                    const guildPrefix = message.guild ? await database.getGuildPrefix(message.guild.id) : null;
                    const currentPrefix = guildPrefix || require('../../../config.js').prefix;
                    const categoryEmbed = this.createCategoryEmbed(client, commands, selectedCategory, message, currentPrefix);
                    const backComponents = this.createBackComponents(commands);
                    
                    await selectInteraction.update({
                        embeds: [categoryEmbed],
                        components: backComponents
                    });
                }
            });
            
            buttonCollector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== message.author.id) {
                    return buttonInteraction.reply({
                        content: 'This help menu is not for you!',
                        ephemeral: true
                    });
                }
                
                const buttonId = buttonInteraction.customId;
                
                if (buttonId === 'help_overview') {
                    await buttonInteraction.update({
                        embeds: [mainEmbed],
                        components: components
                    });
                } else if (buttonId === 'help_links') {
                    const linksEmbed = this.createLinksEmbed(client, message);
                    const backComponents = this.createBackComponents(commands);
                    
                    await buttonInteraction.update({
                        embeds: [linksEmbed],
                        components: backComponents
                    });
                } else if (buttonId === 'help_support') {
                    const supportEmbed = this.createSupportEmbed(client, message);
                    const backComponents = this.createBackComponents(commands);
                    
                    await buttonInteraction.update({
                        embeds: [supportEmbed],
                        components: backComponents
                    });
                }
            });
            
            collector.on('end', async () => {
                try {
                    await response.edit({
                        components: []
                    });
                } catch (error) {
                    // Ignore errors when editing expired interactions
                }
            });
            
        } catch (error) {
            console.error('Error in help command:', error);
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Error`)
                    .setDescription('An error occurred while loading the help menu.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }
    },
    
    // Include all the same methods as the slash command version
    async getAvailableCommands(client) {
        const commands = {
            slash: new Map(),
            normal: new Map()
        };
        
        // Only get normal commands for normal command execution
        for (const [name, command] of client.normalCommands) {
            if (this.isCommandVisible(name, command.category)) {
                commands.normal.set(name, command);
            }
        }
        
        return commands;
    },
    
    isCommandVisible(commandName, category) {
        // Check if category is hidden
        if (this.config[`category_${category}`] === false) {
            return false;
        }
        
        // Check if specific command is hidden
        if (this.config[`command_${commandName}`] === false) {
            return false;
        }
        
        return true;
    },
    
    createMainHelpEmbed(client, commands, message, currentPrefix) {
        const totalCommands = commands.slash.size + commands.normal.size;
        const categories = this.getCategories(commands);
        
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${variables.emojis.bot} ${variables.botName} Help Menu`)
            .setDescription(`Welcome to ${variables.botName}! I'm here to help you with various tasks.`)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .addFields(
                {
                    name: `📊 Command Statistics`,
                    value: [
                        `**Total Commands:** \`${totalCommands}\``,
                        `**Categories:** \`${categories.length}\``,
                        `**Command Type:** Normal Commands Only`,
                        `**Current Prefix:** \`${currentPrefix}\``
                    ].join('\n'),
                    inline: true
                },
                {
                    name: `🎯 Quick Navigation`,
                    value: [
                        `Use the **select menu** below to browse categories`,
                        `Use the **buttons** for quick access`,
                        `Use \`${currentPrefix}help <command>\` for detailed help`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: `📂 Available Categories`,
                    value: categories.map(cat => `**${cat.name}** - ${cat.description}`).join('\n') || 'No categories available',
                    inline: false
                }
            )
            .setFooter(variables.getNormalCommandFooter(message))
            .setTimestamp();
        
        return embed;
    },
    
    createCategoryEmbed(client, commands, category, message, currentPrefix) {
        const categoryCommands = this.getCommandsByCategory(commands, category);
        const categoryInfo = this.getCategoryInfo(category);
        
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${categoryInfo.emoji} ${categoryInfo.name} Commands`)
            .setDescription(categoryInfo.description)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }));
        
        if (categoryCommands.length > 0) {
            const commandFields = categoryCommands.map(cmd => {
                return {
                    name: `${currentPrefix}${cmd.name}`,
                    value: cmd.description || 'No description available',
                    inline: true
                };
            });
            
            embed.addFields(commandFields);
        } else {
            embed.addFields({
                name: 'No Commands Available',
                value: 'No commands are currently available in this category.',
                inline: false
            });
        }
        
        embed.setFooter(variables.getNormalCommandFooter(message))
            .setTimestamp();
        
        return embed;
    },
    
    createLinksEmbed(client, message) {
        return new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${variables.emojis.world} Important Links`)
            .setDescription('Here are some useful links related to the bot:')
            .addFields(
                { name: '🔗 Bot Invite', value: '[Add to Server](https://discord.com/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot%20applications.commands)', inline: true },
                { name: '📚 Documentation', value: '[View Docs](https://example.com/docs)', inline: true },
                { name: '💬 Support Server', value: '[Join Support](https://discord.gg/support)', inline: true },
                { name: '🐛 Report Issues', value: '[GitHub Issues](https://github.com/example/issues)', inline: true },
                { name: '⭐ Rate Us', value: '[Top.gg](https://top.gg/bot/' + client.user.id + ')', inline: true },
                { name: '💝 Donate', value: '[Support Development](https://example.com/donate)', inline: true }
            )
            .setFooter(variables.getNormalCommandFooter(message))
            .setTimestamp();
    },
    
    createSupportEmbed(client, message) {
        return new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${variables.emojis.help} Support & Assistance`)
            .setDescription('Need help? Here\'s how to get support:')
            .addFields(
                { name: '💬 Support Server', value: 'Join our Discord server for real-time help', inline: false },
                { name: '📧 Contact', value: 'Email: support@example.com', inline: true },
                { name: '🕒 Response Time', value: 'Usually within 24 hours', inline: true },
                { name: '🐛 Bug Reports', value: 'Use GitHub Issues for bug reports', inline: false },
                { name: '💡 Feature Requests', value: 'Submit ideas in our support server', inline: false }
            )
            .setFooter(variables.getNormalCommandFooter(message))
            .setTimestamp();
    },
    
    createComponents(commands) {
        const categories = this.getCategories(commands);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('📂 Select a category to view commands')
            .addOptions(
                {
                    label: 'Overview',
                    description: 'Return to main help menu',
                    value: 'overview',
                    emoji: '🏠'
                },
                ...categories.map(cat => ({
                    label: cat.name,
                    description: cat.description,
                    value: cat.value,
                    emoji: cat.emoji
                }))
            );
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_overview')
                    .setLabel('Overview')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏠'),
                new ButtonBuilder()
                    .setCustomId('help_links')
                    .setLabel('Links')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔗'),
                new ButtonBuilder()
                    .setCustomId('help_support')
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💬')
            );
        
        return [
            new ActionRowBuilder().addComponents(selectMenu),
            buttons
        ];
    },
    
    createBackComponents(commands) {
        const categories = this.getCategories(commands);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('📂 Select a category to view commands')
            .addOptions(
                {
                    label: 'Overview',
                    description: 'Return to main help menu',
                    value: 'overview',
                    emoji: '🏠'
                },
                ...categories.map(cat => ({
                    label: cat.name,
                    description: cat.description,
                    value: cat.value,
                    emoji: cat.emoji
                }))
            );
        
        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_overview')
                    .setLabel('Back to Overview')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⬅️')
            );
        
        return [
            new ActionRowBuilder().addComponents(selectMenu),
            backButton
        ];
    },
    
    getCategories(commands) {
        const categories = new Set();
        
        for (const [name, command] of commands.normal) {
            if (command.category) categories.add(command.category);
        }
        
        return Array.from(categories).map(cat => this.getCategoryInfo(cat));
    },
    
    getCategoryInfo(category) {
        const categoryMap = {
            'BotInfo': {
                name: 'Bot Information',
                description: 'Information about the bot',
                emoji: '🤖',
                value: 'BotInfo'
            },
            'Settings': {
                name: 'Settings',
                description: 'Server and bot configuration',
                emoji: '⚙️',
                value: 'Settings'
            },
            'Utility': {
                name: 'Utility',
                description: 'Useful tools and utilities',
                emoji: '🛠️',
                value: 'Utility'
            }
        };
        
        return categoryMap[category] || {
            name: category,
            description: 'Commands in this category',
            emoji: '📁',
            value: category
        };
    },
    
    getCommandsByCategory(commands, category) {
        const categoryCommands = [];
        
        for (const [name, command] of commands.normal) {
            if (command.category === category) {
                categoryCommands.push({
                    name: name,
                    description: command.description,
                    type: 'normal'
                });
            }
        }
        
        return categoryCommands.sort((a, b) => a.name.localeCompare(b.name));
    },
    
    async showSpecificCommand(message, client, commandName) {
        const normalCommand = client.normalCommands.get(commandName);
        
        if (!normalCommand) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Not Found`)
                    .setDescription(`The normal command \`${commandName}\` was not found.`)
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }
        
        const command = normalCommand;
        
        // Get current server prefix
        const database = require('../../../utils/database.js');
        const guildPrefix = message.guild ? await database.getGuildPrefix(message.guild.id) : null;
        const currentPrefix = guildPrefix || require('../../../config.js').prefix;
        
        // Check if command is visible
        if (!this.isCommandVisible(commandName, command.category)) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Not Available`)
                    .setDescription(`The command \`${commandName}\` is not currently available.`)
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${currentPrefix}${commandName}`)
            .setDescription(command.description || 'No description available')
            .addFields(
                { name: 'Type', value: 'Normal Command', inline: true },
                { name: 'Category', value: command.category || 'Unknown', inline: true },
                { name: 'Cooldown', value: `${(command.cooldown || 0) / 1000}s`, inline: true }
            );
        
        if (command.usage) {
            // Replace the usage to use current prefix
            const updatedUsage = command.usage.replace(/^[^\s]+/, `${currentPrefix}${commandName}`);
            embed.addFields({ name: 'Usage', value: `\`${updatedUsage}\``, inline: false });
        }
        
        if (command.aliases && command.aliases.length > 0) {
            embed.addFields({ name: 'Aliases', value: command.aliases.map(alias => `\`${alias}\``).join(', '), inline: false });
        }
        
        if (command.permissions && command.permissions.length > 0) {
            embed.addFields({ name: 'Required Permissions', value: command.permissions.map(perm => `\`${perm}\``).join(', '), inline: false });
        }
        
        embed.setFooter(variables.getNormalCommandFooter(message))
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};


================================================================================
// 4. FILE: commands/normal/BotInfo/ping.js
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
// 5. FILE: commands/normal/Settings/resetprefix.js
================================================================================

const { EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');
const database = require('../../../utils/database.js');
const config = require('../../../config.js');

module.exports = {
    name: 'resetprefix',
    description: 'Reset the server prefix to the default',
    usage: 'resetprefix',
    aliases: ['defaultprefix', 'rp'],
    category: 'Moderation',
    cooldown: 5000,
    permissions: ['ManageGuild'],
    
    async execute(message, args, client) {
        // Check permissions
        if (!message.member.permissions.has('ManageGuild')) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Insufficient Permissions`)
                    .setDescription('You need the `Manage Server` permission to reset the prefix.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        try {
            const success = await database.removeGuildPrefix(message.guild.id);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Prefix Reset`)
                    .setDescription(`Server prefix has been reset to the default: \`${config.prefix}\``)
                    .addFields(
                        { name: 'Default Prefix', value: `\`${config.prefix}\``, inline: true },
                        { name: 'Example Usage', value: `\`${config.prefix}ping\``, inline: true }
                    )
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            } else {
                throw new Error('Database operation failed');
            }
        } catch (error) {
            console.error('Error resetting prefix:', error);
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Database Error`)
                    .setDescription('Failed to reset prefix. Please try again later.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }
    }
};


================================================================================
// 6. FILE: commands/normal/Settings/setprefix.js
================================================================================

const { EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');
const database = require('../../../utils/database.js');

module.exports = {
    name: 'setprefix',
    description: 'Set a custom prefix for this server',
    usage: 'setprefix <new_prefix>',
    aliases: ['prefix', 'changeprefix', 'sp'],
    category: 'Moderation',
    cooldown: 5000,
    permissions: ['ManageGuild'],
    
    async execute(message, args, client) {
        // Check permissions
        if (!message.member.permissions.has('ManageGuild')) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Insufficient Permissions`)
                    .setDescription('You need the `Manage Server` permission to change the prefix.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        const newPrefix = args[0];
        
        if (!newPrefix) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.warningColor)
                    .setTitle(`${variables.emojis.warning} Missing Argument`)
                    .setDescription(`Please provide a new prefix.\n\n**Usage:** \`${message.content.split(' ')[0]} <new_prefix>\``)
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        // Validation
        if (newPrefix.length < 1 || newPrefix.length > 5) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Prefix`)
                    .setDescription('Prefix must be between 1 and 5 characters long.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        // Check for invalid characters
        const invalidChars = ['@', '#', '`', '\\', '/'];
        if (invalidChars.some(char => newPrefix.includes(char))) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Characters`)
                    .setDescription(`Prefix cannot contain: \`${invalidChars.join(' ')}\``)
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        try {
            // Always save the prefix, even if it matches the default
            const success = await database.setGuildPrefix(message.guild.id, newPrefix);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Prefix Updated`)
                    .setDescription(`Server prefix has been set to: \`${newPrefix}\``)
                    .addFields(
                        { name: 'New Prefix', value: `\`${newPrefix}\``, inline: true },
                        { name: 'Example Usage', value: `\`${newPrefix}ping\``, inline: true }
                    )
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            } else {
                throw new Error('Database operation failed');
            }
        } catch (error) {
            console.error('Error setting prefix:', error);
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Database Error`)
                    .setDescription('Failed to update prefix. Please try again later.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }
    }
};


================================================================================
// 7. FILE: commands/normal/Utility/embedcreator.js
================================================================================

const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    name: 'embedcreator',
    aliases: ['embed', 'createembed'],
    description: 'Create a custom embed with solvix options',
    usage: 'embedcreator [channel] [title] [description]',
    category: 'Utility',
    permissions: ['ManageMessages'],
    cooldown: 5000,
    
    async execute(message, args, client) {
        try {
            // Check permissions
            if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(variables.errorColor)
                        .setTitle(`${variables.emojis.error} Insufficient Permissions`)
                        .setDescription('You need the `Manage Messages` permission to use this command.')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp()
                    ]
                });
            }

            // Parse arguments
            let targetChannel = message.channel;
            let title = 'Custom Embed';
            let description = 'This is a custom embed created with the solvix embed creator.';

            // Try to parse channel mention or ID
            if (args[0]) {
                const channelMatch = args[0].match(/^<#(\d+)>$/) || args[0].match(/^(\d+)$/);
                if (channelMatch) {
                    const foundChannel = message.guild.channels.cache.get(channelMatch[1]);
                    if (foundChannel && foundChannel.type === ChannelType.GuildText) {
                        targetChannel = foundChannel;
                        args.shift(); // Remove channel from args
                    }
                }
            }

            // Get title and description from remaining args
            if (args.length > 0) {
                const fullText = args.join(' ');
                const parts = fullText.split('|');
                if (parts.length >= 2) {
                    title = parts[0].trim();
                    description = parts[1].trim();
                } else {
                    title = fullText;
                }
            }

            // Store embed data for later use
            const embedData = {
                title,
                description,
                color: variables.embedColor,
                thumbnail: null,
                image: null,
                footer: 'Created with Solvix Embed Creator',
                author: message.author.username,
                timestamp: true,
                footerIcon: null,
                authorIcon: message.author.displayAvatarURL(),
                authorUrl: null,
                targetChannel: targetChannel.id,
                fields: []
            };

            // Create the embed
            const embed = this.createEmbed(embedData);

            // Create advanced control components
            const components = this.createComponents(embedData);

            // Send the preview
            const previewEmbed = new EmbedBuilder()
                .setColor(variables.successColor)
                .setTitle(`${variables.emojis.tick} Solvix Embed Creator`)
                .setDescription(`**Target Channel:** ${targetChannel}\n**Status:** Ready to customize\n\nUse the controls below to modify your embed or send it directly.`)
                .addFields(
                    { name: '🎨 Quick Actions', value: 'Use buttons for common actions', inline: true },
                    { name: '⚙️ Advanced Settings', value: 'Use select menus for detailed customization', inline: true },
                    { name: '📤 Publishing', value: 'Send to the selected channel when ready', inline: true }
                )
                .setFooter(variables.getNormalCommandFooter(message))
                .setTimestamp();

            const reply = await message.reply({
                embeds: [previewEmbed, embed],
                components: components
            });

            // Create collector for component interactions
            const collector = reply.createMessageComponentCollector({
                time: 600000 // 10 minutes
            });

            collector.on('collect', async (componentInteraction) => {
                if (componentInteraction.user.id !== message.author.id) {
                    return await componentInteraction.reply({
                        content: 'You cannot use these controls.',
                        ephemeral: true
                    });
                }

                await this.handleComponentInteraction(componentInteraction, embedData, message);
            });

            collector.on('end', () => {
                // Disable all components after timeout
                const disabledComponents = components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach(component => component.setDisabled(true));
                    return newRow;
                });
                
                reply.edit({
                    components: disabledComponents
                }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in embedcreator command:', error);
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Error`)
                    .setDescription('An error occurred while creating the embed.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }
    },

    createEmbed(embedData) {
        const embed = new EmbedBuilder()
            .setColor(embedData.color);

        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
        if (embedData.image) embed.setImage(embedData.image);
        
        // Enhanced footer with icon support
        if (embedData.footer) {
            const footerObj = { text: embedData.footer };
            if (embedData.footerIcon) footerObj.iconURL = embedData.footerIcon;
            embed.setFooter(footerObj);
        }
        
        // Enhanced author with icon and URL support
        if (embedData.author) {
            const authorObj = { name: embedData.author };
            if (embedData.authorIcon) authorObj.iconURL = embedData.authorIcon;
            if (embedData.authorUrl) authorObj.url = embedData.authorUrl;
            embed.setAuthor(authorObj);
        }
        
        if (embedData.timestamp) embed.setTimestamp();

        // Add fields if any
        if (embedData.fields && embedData.fields.length > 0) {
            embed.addFields(embedData.fields);
        }

        return embed;
    },

    createComponents(embedData) {
        // Row 1: Quick Action Buttons
        const quickActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_field')
                    .setLabel('Add Field')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('edit_basic')
                    .setLabel('Edit Content')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('change_channel')
                    .setLabel('Change Channel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📍'),
                new ButtonBuilder()
                    .setCustomId('send_embed')
                    .setLabel('Send Embed')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📤')
            );

        // Row 2: Advanced Settings Select Menu
        const advancedSettingsRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('advanced_settings')
                    .setPlaceholder('🛠️ Advanced Settings')
                    .addOptions([
                        {
                            label: 'Edit Images & Media',
                            value: 'edit_media',
                            description: 'Modify thumbnail, image, and media settings',
                            emoji: '🖼️'
                        },
                        {
                            label: 'Styling Options',
                            value: 'edit_styling',
                            description: 'Change colors, appearance, and layout',
                            emoji: '🎨'
                        },
                        {
                            label: 'Author & Footer',
                            value: 'edit_metadata',
                            description: 'Configure author info and footer details',
                            emoji: '👤'
                        },
                        {
                            label: 'Create from JSON',
                            value: 'create_json',
                            description: 'Create embed using raw JSON data',
                            emoji: '📝'
                        }
                    ])
            );

        // Row 3: Utility Buttons
        const utilityRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('preview_json')
                    .setLabel('JSON Preview')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('reset_embed')
                    .setLabel('Reset')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('duplicate_embed')
                    .setLabel('Duplicate')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('help_embed')
                    .setLabel('Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        return [quickActionRow, advancedSettingsRow, utilityRow];
    },

    async handleComponentInteraction(componentInteraction, embedData, originalMessage) {
        try {
            switch (componentInteraction.customId) {
                case 'add_field':
                    await this.handleAddField(componentInteraction, embedData, originalMessage);
                    break;
                case 'edit_basic':
                    await this.handleEditBasic(componentInteraction, embedData, originalMessage);
                    break;
                case 'change_channel':
                    await this.handleChangeChannel(componentInteraction, embedData, originalMessage);
                    break;
                case 'send_embed':
                    await this.handleSendEmbed(componentInteraction, embedData, originalMessage);
                    break;
                case 'advanced_settings':
                    await this.handleAdvancedSettings(componentInteraction, embedData, originalMessage);
                    break;
                case 'preview_json':
                    await this.handleJsonPreview(componentInteraction, embedData);
                    break;
                case 'reset_embed':
                    await this.handleResetEmbed(componentInteraction, embedData, originalMessage);
                    break;
                case 'duplicate_embed':
                    await this.handleDuplicateEmbed(componentInteraction, embedData);
                    break;
                case 'help_embed':
                    await this.handleHelpEmbed(componentInteraction);
                    break;
            }
        } catch (error) {
            console.error('Error handling component interaction:', error);
            await componentInteraction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true
            });
        }
    },

    async handleAddField(interaction, embedData, originalMessage) {
        // Check if interaction is still valid
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp({
                content: 'This interaction has expired. Please try again.',
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('add_field_modal')
            .setTitle('Add Embed Field');

        const nameInput = new TextInputBuilder()
            .setCustomId('field_name')
            .setLabel('Field Name')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(true);

        const valueInput = new TextInputBuilder()
            .setCustomId('field_value')
            .setLabel('Field Value')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1024)
            .setRequired(true);

        const inlineInput = new TextInputBuilder()
            .setCustomId('field_inline')
            .setLabel('Inline (true/false)')
            .setStyle(TextInputStyle.Short)
            .setValue('false')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(valueInput),
            new ActionRowBuilder().addComponents(inlineInput)
        );

        try {
            await interaction.showModal(modal);

            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const fieldName = modalSubmission.fields.getTextInputValue('field_name');
            const fieldValue = modalSubmission.fields.getTextInputValue('field_value');
            const fieldInline = modalSubmission.fields.getTextInputValue('field_inline').toLowerCase() === 'true';

            embedData.fields.push({ name: fieldName, value: fieldValue, inline: fieldInline });

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Field Added`)
                        .setDescription(`**Field Name:** ${fieldName}\n**Field Value:** ${fieldValue}\n**Inline:** ${fieldInline}`)
                        .setFooter(variables.getNormalCommandFooter(originalMessage))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            console.error('Error in handleAddField:', error);
            // Try to respond if possible
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while adding the field. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    },

    async handleEditBasic(interaction, embedData, originalMessage) {
        const modal = new ModalBuilder()
            .setCustomId('edit_basic_modal')
            .setTitle('Edit Basic Content');

        const titleInput = new TextInputBuilder()
            .setCustomId('edit_title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setValue(embedData.title || '')
            .setRequired(false);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('edit_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setValue(embedData.description || '')
            .setRequired(false);

        const colorInput = new TextInputBuilder()
            .setCustomId('edit_color')
            .setLabel('Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.color || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(colorInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newTitle = modalSubmission.fields.getTextInputValue('edit_title');
            const newDescription = modalSubmission.fields.getTextInputValue('edit_description');
            const newColor = modalSubmission.fields.getTextInputValue('edit_color');

            if (newTitle) embedData.title = newTitle;
            if (newDescription) embedData.description = newDescription;
            if (newColor) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexRegex.test(newColor)) {
                    embedData.color = newColor;
                }
            }

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Basic Content Updated`)
                        .setDescription('Your embed content has been updated successfully!')
                        .setFooter(variables.getNormalCommandFooter(originalMessage))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleChangeChannel(interaction, embedData, originalMessage) {
        const channels = originalMessage.guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildText && channel.permissionsFor(originalMessage.guild.members.me).has(PermissionFlagsBits.SendMessages))
            .map(channel => ({
                label: `#${channel.name}`,
                value: channel.id,
                description: channel.topic ? channel.topic.substring(0, 100) : 'No description'
            }))
            .slice(0, 25);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_channel')
            .setPlaceholder('Select a channel to send the embed to')
            .addOptions(channels);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '**Select Target Channel**\nChoose where you want to send this embed:',
            components: [selectRow],
            ephemeral: true
        });

        try {
            const collector = interaction.channel.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id && i.customId === 'select_channel',
                time: 30000,
                max: 1
            });

            collector.on('collect', async (selectComponentInteraction) => {
                const selectedChannelId = selectComponentInteraction.values[0];
                const selectedChannel = originalMessage.guild.channels.cache.get(selectedChannelId);
                
                embedData.targetChannel = selectedChannelId;

                const updatedEmbed = this.createEmbed(embedData);
                const components = this.createComponents(embedData);

                await selectComponentInteraction.update({
                    content: `✅ **Channel Updated**\nTarget channel changed to: ${selectedChannel}`,
                    components: []
                });

                // Update the original message
                const originalReply = await originalMessage.fetchReply();
                await originalReply.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(variables.successColor)
                            .setTitle(`${variables.emojis.tick} Solvix Embed Creator`)
                            .setDescription(`**Target Channel:** ${selectedChannel}\n**Status:** Ready to customize\n\nUse the controls below to modify your embed or send it directly.`)
                            .addFields(
                                { name: '🎨 Quick Actions', value: 'Use buttons for common actions', inline: true },
                                { name: '⚙️ Advanced Settings', value: 'Use select menus for detailed customization', inline: true },
                                { name: '📤 Publishing', value: 'Send to the selected channel when ready', inline: true }
                            )
                            .setFooter(variables.getNormalCommandFooter(originalMessage))
                            .setTimestamp(),
                        updatedEmbed
                    ],
                    components: components
                });
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.editReply({
                        content: '❌ **Channel Selection Timeout**\nNo channel was selected.',
                        components: []
                    }).catch(() => {});
                }
            });
        } catch (error) {
            console.error('Error in handleChangeChannel:', error);
        }
    },

    async handleSendEmbed(interaction, embedData, originalMessage) {
        try {
            const targetChannel = originalMessage.guild.channels.cache.get(embedData.targetChannel);
            const finalEmbed = this.createEmbed(embedData);
            
            await targetChannel.send({ embeds: [finalEmbed] });
            
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Embed Sent Successfully`)
                    .setDescription(`Your embed has been sent to ${targetChannel}!`)
                    .addFields(
                        { name: 'Channel', value: `${targetChannel}`, inline: true },
                        { name: 'Fields', value: `${embedData.fields.length}`, inline: true },
                        { name: 'Created By', value: `${originalMessage.author}`, inline: true }
                    )
                    .setFooter(variables.getNormalCommandFooter(originalMessage))
                    .setTimestamp()
                ],
                components: []
            });
        } catch (error) {
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Send Failed`)
                    .setDescription('Failed to send the embed. Please check permissions and try again.')
                    .setFooter(variables.getNormalCommandFooter(originalMessage))
                    .setTimestamp()
                ],
                components: []
            });
        }
    },

    async handleAdvancedSettings(interaction, embedData, originalMessage) {
        const selectedOption = interaction.values[0];

        switch (selectedOption) {
            case 'edit_media':
                await this.handleEditMedia(interaction, embedData, originalMessage);
                break;
            case 'edit_styling':
                await this.handleEditStyling(interaction, embedData, originalMessage);
                break;
            case 'edit_metadata':
                await this.handleEditMetadata(interaction, embedData, originalMessage);
                break;
            case 'create_json':
                await this.handleCreateFromJson(interaction, embedData, originalMessage);
                break;
        }
    },

    async handleEditMedia(interaction, embedData, originalMessage) {
        const modal = new ModalBuilder()
            .setCustomId('edit_media_modal')
            .setTitle('Edit Images & Media');

        const thumbnailInput = new TextInputBuilder()
            .setCustomId('edit_thumbnail')
            .setLabel('Thumbnail URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.thumbnail || '')
            .setRequired(false);

        const imageInput = new TextInputBuilder()
            .setCustomId('edit_image')
            .setLabel('Main Image URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.image || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(thumbnailInput),
            new ActionRowBuilder().addComponents(imageInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newThumbnail = modalSubmission.fields.getTextInputValue('edit_thumbnail');
            const newImage = modalSubmission.fields.getTextInputValue('edit_image');

            if (newThumbnail) embedData.thumbnail = newThumbnail;
            if (newImage) embedData.image = newImage;

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Media Updated`)
                        .setDescription('Your embed media has been updated successfully!')
                        .setFooter(variables.getNormalCommandFooter(originalMessage))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleEditMetadata(interaction, embedData, originalMessage) {
        const modal = new ModalBuilder()
            .setCustomId('edit_metadata_modal')
            .setTitle('Edit Author & Footer');

        const authorInput = new TextInputBuilder()
            .setCustomId('edit_author')
            .setLabel('Author Name')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.author || '')
            .setRequired(false);

        const authorIconInput = new TextInputBuilder()
            .setCustomId('edit_author_icon')
            .setLabel('Author Icon URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.authorIcon || '')
            .setRequired(false);

        const footerInput = new TextInputBuilder()
            .setCustomId('edit_footer')
            .setLabel('Footer Text')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.footer || '')
            .setRequired(false);

        const footerIconInput = new TextInputBuilder()
            .setCustomId('edit_footer_icon')
            .setLabel('Footer Icon URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.footerIcon || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(authorInput),
            new ActionRowBuilder().addComponents(authorIconInput),
            new ActionRowBuilder().addComponents(footerInput),
            new ActionRowBuilder().addComponents(footerIconInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            embedData.author = modalSubmission.fields.getTextInputValue('edit_author');
            embedData.authorIcon = modalSubmission.fields.getTextInputValue('edit_author_icon');
            embedData.footer = modalSubmission.fields.getTextInputValue('edit_footer');
            embedData.footerIcon = modalSubmission.fields.getTextInputValue('edit_footer_icon');

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Metadata Updated`)
                        .setDescription('Author and footer information has been updated!')
                        .setFooter(variables.getNormalCommandFooter(originalMessage))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleJsonPreview(interaction, embedData) {
        const embed = this.createEmbed(embedData);
        const jsonString = JSON.stringify(embed.toJSON(), null, 2);
        
        if (jsonString.length > 1900) {
            await interaction.reply({
                content: '```json\n' + jsonString.substring(0, 1900) + '\n... (truncated)\n```',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '```json\n' + jsonString + '\n```',
                ephemeral: true
            });
        }
    },

    async handleEditStyling(interaction, embedData, originalMessage) {
        const modal = new ModalBuilder()
            .setCustomId('edit_styling_modal')
            .setTitle('Edit Styling Options');

        const colorInput = new TextInputBuilder()
            .setCustomId('styling_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.color || '')
            .setRequired(false);

        const timestampInput = new TextInputBuilder()
            .setCustomId('styling_timestamp')
            .setLabel('Show Timestamp (true/false)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.timestamp ? 'true' : 'false')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(timestampInput)
        );

        try {
            await interaction.showModal(modal);

            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newColor = modalSubmission.fields.getTextInputValue('styling_color');
            const newTimestamp = modalSubmission.fields.getTextInputValue('styling_timestamp').toLowerCase() === 'true';

            if (newColor) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexRegex.test(newColor)) {
                    embedData.color = newColor;
                }
            }
            embedData.timestamp = newTimestamp;

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Styling Updated`)
                        .setDescription('Embed styling has been updated successfully!')
                        .setFooter(variables.getNormalCommandFooter(originalMessage))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            console.error('Error in handleEditStyling:', error);
        }
    },

    async handleCreateFromJson(interaction, embedData, originalMessage) {
        const modal = new ModalBuilder()
            .setCustomId('create_json_modal')
            .setTitle('Create Embed from JSON');

        const jsonInput = new TextInputBuilder()
            .setCustomId('embed_json')
            .setLabel('Embed JSON Data')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Paste your embed JSON here...')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(jsonInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const jsonString = modalSubmission.fields.getTextInputValue('embed_json');
            
            try {
                const jsonData = JSON.parse(jsonString);
                
                // Update embedData with JSON values
                if (jsonData.title) embedData.title = jsonData.title;
                if (jsonData.description) embedData.description = jsonData.description;
                if (jsonData.color) embedData.color = jsonData.color;
                if (jsonData.thumbnail && jsonData.thumbnail.url) embedData.thumbnail = jsonData.thumbnail.url;
                if (jsonData.image && jsonData.image.url) embedData.image = jsonData.image.url;
                if (jsonData.footer) {
                    embedData.footer = jsonData.footer.text || embedData.footer;
                    embedData.footerIcon = jsonData.footer.icon_url || embedData.footerIcon;
                }
                if (jsonData.author) {
                    embedData.author = jsonData.author.name || embedData.author;
                    embedData.authorIcon = jsonData.author.icon_url || embedData.authorIcon;
                    embedData.authorUrl = jsonData.author.url || embedData.authorUrl;
                }
                if (jsonData.timestamp) embedData.timestamp = true;
                if (jsonData.fields && Array.isArray(jsonData.fields)) {
                    embedData.fields = jsonData.fields;
                }

                const updatedEmbed = this.createEmbed(embedData);
                const components = this.createComponents(embedData);

                await modalSubmission.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(variables.successColor)
                            .setTitle(`${variables.emojis.tick} Embed Created from JSON`)
                            .setDescription('Your embed has been successfully created from the provided JSON data!')
                            .setFooter(variables.getNormalCommandFooter(originalMessage))
                            .setTimestamp(),
                        updatedEmbed
                    ],
                    components: components
                });
            } catch (jsonError) {
                await modalSubmission.update({
                    embeds: [new EmbedBuilder()
                        .setColor(variables.errorColor)
                        .setTitle(`${variables.emojis.error} Invalid JSON`)
                        .setDescription('The provided JSON is not valid. Please check your syntax and try again.')
                        .addFields(
                            { name: 'Error', value: jsonError.message, inline: false }
                        )
                        .setFooter(variables.getNormalCommandFooter(originalMessage))
                        .setTimestamp()
                    ],
                    components: this.createComponents(embedData)
                });
            }
        } catch (error) {
            console.error('Error in handleCreateFromJson:', error);
        }
    },

    async handleResetEmbed(interaction, embedData, originalMessage) {
        // Reset to default values
        embedData.title = 'Custom Embed';
        embedData.description = 'This is a custom embed created with the solvix embed creator.';
        embedData.color = variables.embedColor;
        embedData.thumbnail = null;
        embedData.image = null;
        embedData.footer = 'Created with Solvix Embed Creator';
        embedData.author = originalMessage.author.username;
        embedData.timestamp = true;
        embedData.footerIcon = null;
        embedData.authorIcon = originalMessage.author.displayAvatarURL();
        embedData.authorUrl = null;
        embedData.fields = [];

        const updatedEmbed = this.createEmbed(embedData);
        const components = this.createComponents(embedData);

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Embed Reset`)
                    .setDescription('Your embed has been reset to default values.')
                    .setFooter(variables.getNormalCommandFooter(originalMessage))
                    .setTimestamp(),
                updatedEmbed
            ],
            components: components
        });
    },

    async handleDuplicateEmbed(interaction, embedData) {
        const embed = this.createEmbed(embedData);
        const jsonString = JSON.stringify(embed.toJSON(), null, 2);
        
        const duplicateEmbed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle('📋 Embed Duplicated')
            .setDescription('Here\'s your embed JSON that you can use to recreate this embed:')
            .setFooter({ text: 'Copy this JSON to recreate the embed' })
            .setTimestamp();

        if (jsonString.length > 1900) {
            await interaction.reply({
                embeds: [duplicateEmbed],
                content: '```json\n' + jsonString.substring(0, 1900) + '\n... (truncated)\n```',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                embeds: [duplicateEmbed],
                content: '```json\n' + jsonString + '\n```',
                ephemeral: true
            });
        }
    },

    async handleHelpEmbed(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle('🛠️ Solvix Embed Creator Help')
            .setDescription('Here\'s how to use the solvix embed creator:')
            .addFields(
                { name: 'Usage', value: '`embedcreator [#channel] [title | description]`', inline: false },
                { name: '📝 Add Field', value: 'Add custom fields to your embed', inline: true },
                { name: '✏️ Edit Content', value: 'Modify title, description, and color', inline: true },
                { name: '📍 Change Channel', value: 'Select where to send the embed', inline: true },
                { name: '🖼️ Edit Images', value: 'Add thumbnail and main images', inline: true },
                { name: '🎨 Styling', value: 'Customize colors and appearance', inline: true },
                { name: '👤 Author & Footer', value: 'Set author info and footer details', inline: true },
                { name: '📝 Create from JSON', value: 'Create embed using raw JSON data', inline: true },
                { name: '🔍 JSON Preview', value: 'View the raw embed JSON', inline: true }
            )
            .setFooter({ text: 'Solvix Embed Creator | Use components to interact' })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }
};


================================================================================
// 8. FILE: commands/slash/BotInfo/help.js
================================================================================

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const variables = require('../../../variables.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with bot commands and features')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed help for a specific command')
                .setRequired(false)
        ),
    
    category: 'BotInfo',
    cooldown: 3000,
    
    // Configuration for command visibility
    config: {
        // Category visibility (set to false to hide entire category)
        category_BotInfo: true,
        category_Settings: true,
        category_Utility: true,
        
        // Individual command visibility (set to false to hide specific command)
        command_ping: true,
        command_botinfo: true,
        command_stats: true,
        command_uptime: true,
        command_setprefix: true,
        command_resetprefix: true,
        command_embedcreator: true,
        command_help: true
    },
    
    async execute(interaction, client) {
        try {
            const specificCommand = interaction.options.getString('command');
            
            if (specificCommand) {
                return await this.showSpecificCommand(interaction, client, specificCommand);
            }
            
            // Get all available commands
            const commands = await this.getAvailableCommands(client);
            
            // Create main help embed
            const mainEmbed = this.createMainHelpEmbed(client, commands, interaction);
            
            // Create components
            const components = this.createComponents(commands);
            
            const response = await interaction.reply({
                embeds: [mainEmbed],
                components: components,
                ephemeral: false
            });
            
            // Handle component interactions
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 300000 // 5 minutes
            });
            
            const buttonCollector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });
            
            collector.on('collect', async (selectInteraction) => {
                if (selectInteraction.user.id !== interaction.user.id) {
                    return selectInteraction.reply({
                        content: 'This help menu is not for you!',
                        ephemeral: true
                    });
                }
                
                const selectedCategory = selectInteraction.values[0];
                
                if (selectedCategory === 'overview') {
                    await selectInteraction.update({
                        embeds: [mainEmbed],
                        components: components
                    });
                } else {
                    const categoryEmbed = this.createCategoryEmbed(client, commands, selectedCategory, interaction);
                    const backComponents = this.createBackComponents(commands);
                    
                    await selectInteraction.update({
                        embeds: [categoryEmbed],
                        components: backComponents
                    });
                }
            });
            
            buttonCollector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    return buttonInteraction.reply({
                        content: 'This help menu is not for you!',
                        ephemeral: true
                    });
                }
                
                const buttonId = buttonInteraction.customId;
                
                if (buttonId === 'help_overview') {
                    await buttonInteraction.update({
                        embeds: [mainEmbed],
                        components: components
                    });
                } else if (buttonId === 'help_links') {
                    const linksEmbed = this.createLinksEmbed(client, interaction);
                    const backComponents = this.createBackComponents(commands);
                    
                    await buttonInteraction.update({
                        embeds: [linksEmbed],
                        components: backComponents
                    });
                } else if (buttonId === 'help_support') {
                    const supportEmbed = this.createSupportEmbed(client, interaction);
                    const backComponents = this.createBackComponents(commands);
                    
                    await buttonInteraction.update({
                        embeds: [supportEmbed],
                        components: backComponents
                    });
                }
            });
            
            collector.on('end', async () => {
                try {
                    await response.edit({
                        components: []
                    });
                } catch (error) {
                    // Ignore errors when editing expired interactions
                }
            });
            
        } catch (error) {
            console.error('Error in help command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Error`)
                    .setDescription('An error occurred while loading the help menu.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    },
    
    async getAvailableCommands(client) {
        const commands = {
            slash: new Map(),
            normal: new Map()
        };
        
        // Get slash commands for slash command execution
        if (client.slashCommands && client.slashCommands.size > 0) {
            console.log(`Debug: Found ${client.slashCommands.size} slash commands`);
            for (const [name, command] of client.slashCommands) {
                console.log(`Debug: Processing command ${name} with category ${command.category}`);
                if (this.isCommandVisible(name, command.category)) {
                    commands.slash.set(name, command);
                    console.log(`Debug: Added command ${name} to available commands`);
                } else {
                    console.log(`Debug: Command ${name} filtered out by visibility check`);
                }
            }
        } else {
            console.log('Debug: No slash commands found or slashCommands is empty');
        }
        
        console.log(`Debug: Final slash commands count: ${commands.slash.size}`);
        return commands;
    },
    
    isCommandVisible(commandName, category) {
        // Check if category is hidden
        if (this.config[`category_${category}`] === false) {
            console.log(`Debug: Category ${category} is hidden for command ${commandName}`);
            return false;
        }
        
        // Check if specific command is hidden
        if (this.config[`command_${commandName}`] === false) {
            console.log(`Debug: Command ${commandName} is hidden`);
            return false;
        }
        
        return true;
    },
    
    createMainHelpEmbed(client, commands, interaction) {
        const totalCommands = commands.slash.size + commands.normal.size;
        const categories = this.getCategories(commands);
        
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${variables.emojis.bot} ${variables.botName} Help Menu`)
            .setDescription(`Welcome to ${variables.botName}! I'm here to help you with various tasks.`)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .addFields(
                {
                    name: `📊 Command Statistics`,
                    value: [
                        `**Total Commands:** \`${totalCommands}\``,
                        `**Categories:** \`${categories.length}\``,
                        `**Command Type:** Slash Commands Only`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: `🎯 Quick Navigation`,
                    value: [
                        `Use the **select menu** below to browse categories`,
                        `Use the **buttons** for quick access`,
                        `Use \`/help <command>\` for detailed help`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: `📂 Available Categories`,
                    value: categories.map(cat => `**${cat.name}** - ${cat.description}`).join('\n') || 'No categories available',
                    inline: false
                }
            )
            .setFooter(variables.getSlashCommandFooter(interaction))
            .setTimestamp();
        
        return embed;
    },
    
    createCategoryEmbed(client, commands, category, interaction) {
        const categoryCommands = this.getCommandsByCategory(commands, category);
        const categoryInfo = this.getCategoryInfo(category);
        
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${categoryInfo.emoji} ${categoryInfo.name} Commands`)
            .setDescription(categoryInfo.description)
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }));
        
        if (categoryCommands.length > 0) {
            const commandFields = categoryCommands.map(cmd => {
                const usage = cmd.type === 'slash' ? `/${cmd.name}` : `${variables.prefix || 'sv!'}${cmd.name}`;
                return {
                    name: `${cmd.type === 'slash' ? '/' : variables.prefix || 'sv!'}${cmd.name}`,
                    value: cmd.description || 'No description available',
                    inline: true
                };
            });
            
            embed.addFields(commandFields);
        } else {
            embed.addFields({
                name: 'No Commands Available',
                value: 'No commands are currently available in this category.',
                inline: false
            });
        }
        
        embed.setFooter(variables.getSlashCommandFooter(interaction))
            .setTimestamp();
        
        return embed;
    },
    
    createLinksEmbed(client, interaction) {
        return new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${variables.emojis.world} Important Links`)
            .setDescription('Here are some useful links related to the bot:')
            .addFields(
                { name: '🔗 Bot Invite', value: '[Add to Server](https://discord.com/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot%20applications.commands)', inline: true },
                { name: '📚 Documentation', value: '[View Docs](https://example.com/docs)', inline: true },
                { name: '💬 Support Server', value: '[Join Support](https://discord.gg/support)', inline: true },
                { name: '🐛 Report Issues', value: '[GitHub Issues](https://github.com/example/issues)', inline: true },
                { name: '⭐ Rate Us', value: '[Top.gg](https://top.gg/bot/' + client.user.id + ')', inline: true },
                { name: '💝 Donate', value: '[Support Development](https://example.com/donate)', inline: true }
            )
            .setFooter(variables.getSlashCommandFooter(interaction))
            .setTimestamp();
    },
    
    createSupportEmbed(client, interaction) {
        return new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${variables.emojis.help} Support & Assistance`)
            .setDescription('Need help? Here\'s how to get support:')
            .addFields(
                { name: '💬 Support Server', value: 'Join our Discord server for real-time help', inline: false },
                { name: '📧 Contact', value: 'Email: support@example.com', inline: true },
                { name: '🕒 Response Time', value: 'Usually within 24 hours', inline: true },
                { name: '🐛 Bug Reports', value: 'Use GitHub Issues for bug reports', inline: false },
                { name: '💡 Feature Requests', value: 'Submit ideas in our support server', inline: false }
            )
            .setFooter(variables.getSlashCommandFooter(interaction))
            .setTimestamp();
    },
    
    createComponents(commands) {
        const categories = this.getCategories(commands);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('📂 Select a category to view commands')
            .addOptions(
                {
                    label: 'Overview',
                    description: 'Return to main help menu',
                    value: 'overview',
                    emoji: '🏠'
                },
                ...categories.map(cat => ({
                    label: cat.name,
                    description: cat.description,
                    value: cat.value,
                    emoji: cat.emoji
                }))
            );
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_overview')
                    .setLabel('Overview')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏠'),
                new ButtonBuilder()
                    .setCustomId('help_links')
                    .setLabel('Links')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔗'),
                new ButtonBuilder()
                    .setCustomId('help_support')
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💬')
            );
        
        return [
            new ActionRowBuilder().addComponents(selectMenu),
            buttons
        ];
    },
    
    createBackComponents(commands) {
        const categories = this.getCategories(commands);
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('📂 Select a category to view commands')
            .addOptions(
                {
                    label: 'Overview',
                    description: 'Return to main help menu',
                    value: 'overview',
                    emoji: '🏠'
                },
                ...categories.map(cat => ({
                    label: cat.name,
                    description: cat.description,
                    value: cat.value,
                    emoji: cat.emoji
                }))
            );
        
        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_overview')
                    .setLabel('Back to Overview')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⬅️')
            );
        
        return [
            new ActionRowBuilder().addComponents(selectMenu),
            backButton
        ];
    },
    
    getCategories(commands) {
        const categories = new Set();
        
        // Collect categories from slash commands
        for (const [name, command] of commands.slash) {
            if (command.category && this.isCommandVisible(name, command.category)) {
                categories.add(command.category);
                console.log(`Debug: Added category ${command.category} from command ${name}`);
            }
        }
        
        console.log(`Debug: Final categories: ${Array.from(categories).join(', ')}`);
        return Array.from(categories).map(cat => this.getCategoryInfo(cat));
    },
    
    getCategoryInfo(category) {
        const categoryMap = {
            'BotInfo': {
                name: 'Bot Information',
                description: 'Information about the bot',
                emoji: '🤖',
                value: 'BotInfo'
            },
            'Settings': {
                name: 'Settings',
                description: 'Server and bot configuration',
                emoji: '⚙️',
                value: 'Settings'
            },
            'Utility': {
                name: 'Utility',
                description: 'Useful tools and utilities',
                emoji: '🛠️',
                value: 'Utility'
            }
        };
        
        return categoryMap[category] || {
            name: category,
            description: 'Commands in this category',
            emoji: '📁',
            value: category
        };
    },
    
    getCommandsByCategory(commands, category) {
        const categoryCommands = [];
        
        // Get slash commands for the specific category
        for (const [name, command] of commands.slash) {
            if (command.category === category && this.isCommandVisible(name, command.category)) {
                categoryCommands.push({
                    name: name,
                    description: command.data.description || command.description || 'No description available',
                    type: 'slash'
                });
            }
        }
        
        return categoryCommands.sort((a, b) => a.name.localeCompare(b.name));
    },
    
    async showSpecificCommand(interaction, client, commandName) {
        const slashCommand = client.slashCommands.get(commandName);
        const normalCommand = client.normalCommands.get(commandName);
        
        if (!slashCommand && !normalCommand) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Not Found`)
                    .setDescription(`The command \`${commandName}\` was not found.`)
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
        
        const command = slashCommand || normalCommand;
        const isSlash = !!slashCommand;
        
        // Check if command is visible
        if (!this.isCommandVisible(commandName, command.category)) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Not Available`)
                    .setDescription(`The command \`${commandName}\` is not currently available.`)
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${isSlash ? '/' : variables.prefix || 'sv!'}${commandName}`)
            .setDescription(command.description || (isSlash ? command.data.description : 'No description available'))
            .addFields(
                { name: 'Type', value: isSlash ? 'Slash Command' : 'Normal Command', inline: true },
                { name: 'Category', value: command.category || 'Unknown', inline: true },
                { name: 'Cooldown', value: `${(command.cooldown || 0) / 1000}s`, inline: true }
            );
        
        if (command.usage) {
            embed.addFields({ name: 'Usage', value: `\`${command.usage}\``, inline: false });
        }
        
        if (command.aliases && command.aliases.length > 0) {
            embed.addFields({ name: 'Aliases', value: command.aliases.map(alias => `\`${alias}\``).join(', '), inline: false });
        }
        
        if (command.permissions && command.permissions.length > 0) {
            embed.addFields({ name: 'Required Permissions', value: command.permissions.map(perm => `\`${perm}\``).join(', '), inline: false });
        }
        
        embed.setFooter(variables.getSlashCommandFooter(interaction))
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};


================================================================================
// 9. FILE: commands/slash/BotInfo/ping.js
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
// 10. FILE: commands/slash/Settings/resetprefix.js
================================================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');
const database = require('../../../utils/database.js');
const config = require('../../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetprefix')
        .setDescription('Reset the server prefix to the default')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    cooldown: 5000,
    
    async execute(interaction, client) {
        try {
            const success = await database.removeGuildPrefix(interaction.guild.id);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Prefix Reset`)
                    .setDescription(`Server prefix has been reset to the default: \`${config.prefix}\``)
                    .addFields(
                        { name: 'Default Prefix', value: `\`${config.prefix}\``, inline: true },
                        { name: 'Example Usage', value: `\`${config.prefix}ping\``, inline: true }
                    )
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                throw new Error('Database operation failed');
            }
        } catch (error) {
            console.error('Error resetting prefix:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Database Error`)
                    .setDescription('Failed to reset prefix. Please try again later.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};


================================================================================
// 11. FILE: commands/slash/Settings/setprefix.js
================================================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');
const database = require('../../../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Set a custom prefix for this server')
        .addStringOption(option =>
            option.setName('prefix')
                .setDescription('The new prefix to set (1-5 characters)')
                .setRequired(true)
                .setMaxLength(5)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    cooldown: 5000,
    
    async execute(interaction, client) {
        const newPrefix = interaction.options.getString('prefix');
        
        // Validation
        if (newPrefix.length < 1 || newPrefix.length > 5) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Prefix`)
                    .setDescription('Prefix must be between 1 and 5 characters long.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }

        // Check for invalid characters
        const invalidChars = ['@', '#', '`', '\\', '/'];
        if (invalidChars.some(char => newPrefix.includes(char))) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Characters`)
                    .setDescription(`Prefix cannot contain: \`${invalidChars.join(' ')}\``)
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }

        try {
            // Always save the prefix, even if it matches the default
            const success = await database.setGuildPrefix(interaction.guild.id, newPrefix);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Prefix Updated`)
                    .setDescription(`Server prefix has been set to: \`${newPrefix}\``)
                    .addFields(
                        { name: 'New Prefix', value: `\`${newPrefix}\``, inline: true },
                        { name: 'Example Usage', value: `\`${newPrefix}ping\``, inline: true }
                    )
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                throw new Error('Database operation failed');
            }
        } catch (error) {
            console.error('Error setting prefix:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Database Error`)
                    .setDescription('Failed to update prefix. Please try again later.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};


================================================================================
// 12. FILE: commands/slash/Utility/embedcreator.js
================================================================================

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedcreator')
        .setDescription('Create a custom embed with solvix options')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the embed to')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the embed')
                .setRequired(false)
                .setMaxLength(256)
        )
        .addStringOption(option =>
            option.setName('description')
                .setDescription('The description of the embed')
                .setRequired(false)
                .setMaxLength(4096)
        )
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color of the embed (hex code, e.g., #ff0000)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('URL for the thumbnail image')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL for the main image')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Footer text')
                .setRequired(false)
                .setMaxLength(2048)
        )
        .addStringOption(option =>
            option.setName('author')
                .setDescription('Author name')
                .setRequired(false)
                .setMaxLength(256)
        )
        .addBooleanOption(option =>
            option.setName('timestamp')
                .setDescription('Add current timestamp to the embed')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('footer_icon')
                .setDescription('URL for the footer icon')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('author_icon')
                .setDescription('URL for the author icon')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('author_url')
                .setDescription('URL for the author link')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    cooldown: 5000,
    
    async execute(interaction, client) {
        try {
            // Get all the options
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const title = interaction.options.getString('title') || 'Custom Embed';
            const description = interaction.options.getString('description') || 'This is a custom embed created with the solvix embed creator.';
            const color = interaction.options.getString('color');
            const thumbnail = interaction.options.getString('thumbnail');
            const image = interaction.options.getString('image');
            const footer = interaction.options.getString('footer') || 'Created with Solvix Embed Creator';
            const author = interaction.options.getString('author') || interaction.user.username;
            const timestamp = interaction.options.getBoolean('timestamp') ?? true;
            const footerIcon = interaction.options.getString('footer_icon');
            const authorIcon = interaction.options.getString('author_icon') || interaction.user.displayAvatarURL();
            const authorUrl = interaction.options.getString('author_url');

            // Store embed data for later use
            const embedData = {
                title,
                description,
                color: color || variables.embedColor,
                thumbnail,
                image,
                footer,
                author,
                timestamp,
                footerIcon,
                authorIcon,
                authorUrl,
                targetChannel: targetChannel.id,
                fields: []
            };

            // Validate color if provided
            if (color) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (!hexRegex.test(color)) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(variables.errorColor)
                            .setTitle(`${variables.emojis.error} Invalid Color`)
                            .setDescription('Please provide a valid hex color code (e.g., #ff0000)')
                            .setFooter(variables.getSlashCommandFooter(interaction))
                            .setTimestamp()
                        ],
                        ephemeral: true
                    });
                }
                embedData.color = color;
            }

            // Validate URLs if provided
            const urlRegex = /^https?:\/\/.+/;
            const urlFields = ['thumbnail', 'image', 'footerIcon', 'authorIcon', 'authorUrl'];
            
            for (const field of urlFields) {
                const value = embedData[field];
                if (value && !urlRegex.test(value)) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(variables.errorColor)
                            .setTitle(`${variables.emojis.error} Invalid URL`)
                            .setDescription(`Please provide a valid URL for ${field}`)
                            .setFooter(variables.getSlashCommandFooter(interaction))
                            .setTimestamp()
                        ],
                        ephemeral: true
                    });
                }
            }

            // Create the embed
            const embed = this.createEmbed(embedData);

            // Create advanced control components
            const components = this.createComponents(embedData);

            // Send the preview
            const previewEmbed = new EmbedBuilder()
                .setColor(variables.successColor)
                .setTitle(`${variables.emojis.tick} Solvix Embed Creator`)
                .setDescription(`**Target Channel:** ${targetChannel}\n**Status:** Ready to customize\n\nUse the controls below to modify your embed or send it directly.`)
                .addFields(
                    { name: '🎨 Quick Actions', value: 'Use buttons for common actions', inline: true },
                    { name: '⚙️ Advanced Settings', value: 'Use select menus for detailed customization', inline: true },
                    { name: '📤 Publishing', value: 'Send to the selected channel when ready', inline: true }
                )
                .setFooter(variables.getSlashCommandFooter(interaction))
                .setTimestamp();

            await interaction.reply({
                embeds: [previewEmbed, embed],
                components: components,
                ephemeral: true
            });

            // Create collector for component interactions
            const collector = interaction.channel.createMessageComponentCollector({
                time: 600000 // 10 minutes
            });

            collector.on('collect', async (componentInteraction) => {
                if (componentInteraction.user.id !== interaction.user.id) {
                    return await componentInteraction.reply({
                        content: 'You cannot use these controls.',
                        ephemeral: true
                    });
                }

                await this.handleComponentInteraction(componentInteraction, embedData, interaction);
            });

            collector.on('end', () => {
                // Disable all components after timeout
                const disabledComponents = components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach(component => component.setDisabled(true));
                    return newRow;
                });
                
                interaction.editReply({
                    components: disabledComponents
                }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in embedcreator command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Error`)
                    .setDescription('An error occurred while creating the embed.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    },

    createEmbed(embedData) {
        const embed = new EmbedBuilder()
            .setColor(embedData.color);

        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
        if (embedData.image) embed.setImage(embedData.image);
        
        // Enhanced footer with icon support
        if (embedData.footer) {
            const footerObj = { text: embedData.footer };
            if (embedData.footerIcon) footerObj.iconURL = embedData.footerIcon;
            embed.setFooter(footerObj);
        }
        
        // Enhanced author with icon and URL support
        if (embedData.author) {
            const authorObj = { name: embedData.author };
            if (embedData.authorIcon) authorObj.iconURL = embedData.authorIcon;
            if (embedData.authorUrl) authorObj.url = embedData.authorUrl;
            embed.setAuthor(authorObj);
        }
        
        if (embedData.timestamp) embed.setTimestamp();

        // Add fields if any
        if (embedData.fields && embedData.fields.length > 0) {
            embed.addFields(embedData.fields);
        }

        return embed;
    },

    createComponents(embedData) {
        // Row 1: Quick Action Buttons
        const quickActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_field')
                    .setLabel('Add Field')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('edit_basic')
                    .setLabel('Edit Content')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('change_channel')
                    .setLabel('Change Channel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📍'),
                new ButtonBuilder()
                    .setCustomId('send_embed')
                    .setLabel('Send Embed')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📤')
            );

        // Row 2: Advanced Settings Select Menu
        const advancedSettingsRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('advanced_settings')
                    .setPlaceholder('🛠️ Advanced Settings')
                    .addOptions([
                        {
                            label: 'Edit Images & Media',
                            value: 'edit_media',
                            description: 'Modify thumbnail, image, and media settings',
                            emoji: '🖼️'
                        },
                        {
                            label: 'Styling Options',
                            value: 'edit_styling',
                            description: 'Change colors, appearance, and layout',
                            emoji: '🎨'
                        },
                        {
                            label: 'Author & Footer',
                            value: 'edit_metadata',
                            description: 'Configure author info and footer details',
                            emoji: '👤'
                        },
                        {
                            label: 'Create from JSON',
                            value: 'create_json',
                            description: 'Create embed using raw JSON data',
                            emoji: '📝'
                        }
                    ])
            );

        // Row 3: Utility Buttons
        const utilityRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('preview_json')
                    .setLabel('JSON Preview')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('reset_embed')
                    .setLabel('Reset')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('duplicate_embed')
                    .setLabel('Duplicate')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('help_embed')
                    .setLabel('Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        return [quickActionRow, advancedSettingsRow, utilityRow];
    },

    async handleComponentInteraction(componentInteraction, embedData, originalInteraction) {
        try {
            switch (componentInteraction.customId) {
                case 'add_field':
                    await this.handleAddField(componentInteraction, embedData, originalInteraction);
                    break;
                case 'edit_basic':
                    await this.handleEditBasic(componentInteraction, embedData, originalInteraction);
                    break;
                case 'change_channel':
                    await this.handleChangeChannel(componentInteraction, embedData, originalInteraction);
                    break;
                case 'send_embed':
                    await this.handleSendEmbed(componentInteraction, embedData, originalInteraction);
                    break;
                case 'advanced_settings':
                    await this.handleAdvancedSettings(componentInteraction, embedData, originalInteraction);
                    break;
                case 'preview_json':
                    await this.handleJsonPreview(componentInteraction, embedData);
                    break;
                case 'reset_embed':
                    await this.handleResetEmbed(componentInteraction, embedData, originalInteraction);
                    break;
                case 'duplicate_embed':
                    await this.handleDuplicateEmbed(componentInteraction, embedData);
                    break;
                case 'help_embed':
                    await this.handleHelpEmbed(componentInteraction);
                    break;
            }
        } catch (error) {
            console.error('Error handling component interaction:', error);
            await componentInteraction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true
            });
        }
    },

    async handleAddField(interaction, embedData, originalInteraction) {
        // Check if interaction is still valid
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp({
                content: 'This interaction has expired. Please try again.',
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('add_field_modal')
            .setTitle('Add Embed Field');

        const nameInput = new TextInputBuilder()
            .setCustomId('field_name')
            .setLabel('Field Name')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(true);

        const valueInput = new TextInputBuilder()
            .setCustomId('field_value')
            .setLabel('Field Value')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1024)
            .setRequired(true);

        const inlineInput = new TextInputBuilder()
            .setCustomId('field_inline')
            .setLabel('Inline (true/false)')
            .setStyle(TextInputStyle.Short)
            .setValue('false')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(valueInput),
            new ActionRowBuilder().addComponents(inlineInput)
        );

        try {
            await interaction.showModal(modal);

            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const fieldName = modalSubmission.fields.getTextInputValue('field_name');
            const fieldValue = modalSubmission.fields.getTextInputValue('field_value');
            const fieldInline = modalSubmission.fields.getTextInputValue('field_inline').toLowerCase() === 'true';

            embedData.fields.push({ name: fieldName, value: fieldValue, inline: fieldInline });

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Field Added`)
                        .setDescription(`**Field Name:** ${fieldName}\n**Field Value:** ${fieldValue}\n**Inline:** ${fieldInline}`)
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            console.error('Error in handleAddField:', error);
            // Try to respond if possible
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while adding the field. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    },

    async handleEditBasic(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_basic_modal')
            .setTitle('Edit Basic Content');

        const titleInput = new TextInputBuilder()
            .setCustomId('edit_title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setValue(embedData.title || '')
            .setRequired(false);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('edit_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setValue(embedData.description || '')
            .setRequired(false);

        const colorInput = new TextInputBuilder()
            .setCustomId('edit_color')
            .setLabel('Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.color || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(colorInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newTitle = modalSubmission.fields.getTextInputValue('edit_title');
            const newDescription = modalSubmission.fields.getTextInputValue('edit_description');
            const newColor = modalSubmission.fields.getTextInputValue('edit_color');

            if (newTitle) embedData.title = newTitle;
            if (newDescription) embedData.description = newDescription;
            if (newColor) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexRegex.test(newColor)) {
                    embedData.color = newColor;
                }
            }

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Basic Content Updated`)
                        .setDescription('Your embed content has been updated successfully!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleChangeChannel(interaction, embedData, originalInteraction) {
        const channels = originalInteraction.guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildText && channel.permissionsFor(originalInteraction.guild.members.me).has(PermissionFlagsBits.SendMessages))
            .map(channel => ({
                label: `#${channel.name}`,
                value: channel.id,
                description: channel.topic ? channel.topic.substring(0, 100) : 'No description'
            }))
            .slice(0, 25);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_channel')
            .setPlaceholder('Select a channel to send the embed to')
            .addOptions(channels);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '**Select Target Channel**\nChoose where you want to send this embed:',
            components: [selectRow],
            ephemeral: true
        });

        try {
            const collector = interaction.channel.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id && i.customId === 'select_channel',
                time: 30000,
                max: 1
            });

            collector.on('collect', async (selectComponentInteraction) => {
                const selectedChannelId = selectComponentInteraction.values[0];
                const selectedChannel = originalInteraction.guild.channels.cache.get(selectedChannelId);
                
                embedData.targetChannel = selectedChannelId;

                const updatedEmbed = this.createEmbed(embedData);
                const components = this.createComponents(embedData);

                await selectComponentInteraction.update({
                    content: `✅ **Channel Updated**\nTarget channel changed to: ${selectedChannel}`,
                    components: []
                });

                await originalInteraction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(variables.successColor)
                            .setTitle(`${variables.emojis.tick} Solvix Embed Creator`)
                            .setDescription(`**Target Channel:** ${selectedChannel}\n**Status:** Ready to customize\n\nUse the controls below to modify your embed or send it directly.`)
                            .addFields(
                                { name: '🎨 Quick Actions', value: 'Use buttons for common actions', inline: true },
                                { name: '⚙️ Advanced Settings', value: 'Use select menus for detailed customization', inline: true },
                                { name: '📤 Publishing', value: 'Send to the selected channel when ready', inline: true }
                            )
                            .setFooter(variables.getSlashCommandFooter(originalInteraction))
                            .setTimestamp(),
                        updatedEmbed
                    ],
                    components: components
                });
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.editReply({
                        content: '❌ **Channel Selection Timeout**\nNo channel was selected.',
                        components: []
                    }).catch(() => {});
                }
            });
        } catch (error) {
            console.error('Error in handleChangeChannel:', error);
        }
    },

    async handleSendEmbed(interaction, embedData, originalInteraction) {
        try {
            const targetChannel = originalInteraction.guild.channels.cache.get(embedData.targetChannel);
            const finalEmbed = this.createEmbed(embedData);
            
            await targetChannel.send({ embeds: [finalEmbed] });
            
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Embed Sent Successfully`)
                    .setDescription(`Your embed has been sent to ${targetChannel}!`)
                    .addFields(
                        { name: 'Channel', value: `${targetChannel}`, inline: true },
                        { name: 'Fields', value: `${embedData.fields.length}`, inline: true },
                        { name: 'Created By', value: `${originalInteraction.user}`, inline: true }
                    )
                    .setFooter(variables.getSlashCommandFooter(originalInteraction))
                    .setTimestamp()
                ],
                components: []
            });
        } catch (error) {
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Send Failed`)
                    .setDescription('Failed to send the embed. Please check permissions and try again.')
                    .setFooter(variables.getSlashCommandFooter(originalInteraction))
                    .setTimestamp()
                ],
                components: []
            });
        }
    },

    async handleAdvancedSettings(interaction, embedData, originalInteraction) {
        const selectedOption = interaction.values[0];

        switch (selectedOption) {
            case 'edit_media':
                await this.handleEditMedia(interaction, embedData, originalInteraction);
                break;
            case 'edit_styling':
                await this.handleEditStyling(interaction, embedData, originalInteraction);
                break;
            case 'edit_metadata':
                await this.handleEditMetadata(interaction, embedData, originalInteraction);
                break;
            case 'create_json':
                await this.handleCreateFromJson(interaction, embedData, originalInteraction);
                break;
        }
    },

    async handleEditMedia(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_media_modal')
            .setTitle('Edit Images & Media');

        const thumbnailInput = new TextInputBuilder()
            .setCustomId('edit_thumbnail')
            .setLabel('Thumbnail URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.thumbnail || '')
            .setRequired(false);

        const imageInput = new TextInputBuilder()
            .setCustomId('edit_image')
            .setLabel('Main Image URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.image || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(thumbnailInput),
            new ActionRowBuilder().addComponents(imageInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newThumbnail = modalSubmission.fields.getTextInputValue('edit_thumbnail');
            const newImage = modalSubmission.fields.getTextInputValue('edit_image');

            if (newThumbnail) embedData.thumbnail = newThumbnail;
            if (newImage) embedData.image = newImage;

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Media Updated`)
                        .setDescription('Your embed media has been updated successfully!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleEditMetadata(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_metadata_modal')
            .setTitle('Edit Author & Footer');

        const authorInput = new TextInputBuilder()
            .setCustomId('edit_author')
            .setLabel('Author Name')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.author || '')
            .setRequired(false);

        const authorIconInput = new TextInputBuilder()
            .setCustomId('edit_author_icon')
            .setLabel('Author Icon URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.authorIcon || '')
            .setRequired(false);

        const footerInput = new TextInputBuilder()
            .setCustomId('edit_footer')
            .setLabel('Footer Text')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.footer || '')
            .setRequired(false);

        const footerIconInput = new TextInputBuilder()
            .setCustomId('edit_footer_icon')
            .setLabel('Footer Icon URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.footerIcon || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(authorInput),
            new ActionRowBuilder().addComponents(authorIconInput),
            new ActionRowBuilder().addComponents(footerInput),
            new ActionRowBuilder().addComponents(footerIconInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            embedData.author = modalSubmission.fields.getTextInputValue('edit_author');
            embedData.authorIcon = modalSubmission.fields.getTextInputValue('edit_author_icon');
            embedData.footer = modalSubmission.fields.getTextInputValue('edit_footer');
            embedData.footerIcon = modalSubmission.fields.getTextInputValue('edit_footer_icon');

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Metadata Updated`)
                        .setDescription('Author and footer information has been updated!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleJsonPreview(interaction, embedData) {
        const embed = this.createEmbed(embedData);
        const jsonString = JSON.stringify(embed.toJSON(), null, 2);
        
        if (jsonString.length > 1900) {
            await interaction.reply({
                content: '```json\n' + jsonString.substring(0, 1900) + '\n... (truncated)\n```',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '```json\n' + jsonString + '\n```',
                ephemeral: true
            });
        }
    },

    async handleEditStyling(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_styling_modal')
            .setTitle('Edit Styling Options');

        const colorInput = new TextInputBuilder()
            .setCustomId('styling_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.color || '')
            .setRequired(false);

        const timestampInput = new TextInputBuilder()
            .setCustomId('styling_timestamp')
            .setLabel('Show Timestamp (true/false)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.timestamp ? 'true' : 'false')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(timestampInput)
        );

        try {
            await interaction.showModal(modal);

            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newColor = modalSubmission.fields.getTextInputValue('styling_color');
            const newTimestamp = modalSubmission.fields.getTextInputValue('styling_timestamp').toLowerCase() === 'true';

            if (newColor) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexRegex.test(newColor)) {
                    embedData.color = newColor;
                }
            }
            embedData.timestamp = newTimestamp;

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Styling Updated`)
                        .setDescription('Embed styling has been updated successfully!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            console.error('Error in handleEditStyling:', error);
        }
    },

    async handleCreateFromJson(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('create_json_modal')
            .setTitle('Create Embed from JSON');

        const jsonInput = new TextInputBuilder()
            .setCustomId('embed_json')
            .setLabel('Embed JSON Data')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Paste your embed JSON here...')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(jsonInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const jsonString = modalSubmission.fields.getTextInputValue('embed_json');
            
            try {
                const jsonData = JSON.parse(jsonString);
                
                // Update embedData with JSON values
                if (jsonData.title) embedData.title = jsonData.title;
                if (jsonData.description) embedData.description = jsonData.description;
                if (jsonData.color) embedData.color = jsonData.color;
                if (jsonData.thumbnail && jsonData.thumbnail.url) embedData.thumbnail = jsonData.thumbnail.url;
                if (jsonData.image && jsonData.image.url) embedData.image = jsonData.image.url;
                if (jsonData.footer) {
                    embedData.footer = jsonData.footer.text || embedData.footer;
                    embedData.footerIcon = jsonData.footer.icon_url || embedData.footerIcon;
                }
                if (jsonData.author) {
                    embedData.author = jsonData.author.name || embedData.author;
                    embedData.authorIcon = jsonData.author.icon_url || embedData.authorIcon;
                    embedData.authorUrl = jsonData.author.url || embedData.authorUrl;
                }
                if (jsonData.timestamp) embedData.timestamp = true;
                if (jsonData.fields && Array.isArray(jsonData.fields)) {
                    embedData.fields = jsonData.fields;
                }

                const updatedEmbed = this.createEmbed(embedData);
                const components = this.createComponents(embedData);

                await modalSubmission.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(variables.successColor)
                            .setTitle(`${variables.emojis.tick} Embed Created from JSON`)
                            .setDescription('Your embed has been successfully created from the provided JSON data!')
                            .setFooter(variables.getSlashCommandFooter(originalInteraction))
                            .setTimestamp(),
                        updatedEmbed
                    ],
                    components: components
                });
            } catch (jsonError) {
                await modalSubmission.update({
                    embeds: [new EmbedBuilder()
                        .setColor(variables.errorColor)
                        .setTitle(`${variables.emojis.error} Invalid JSON`)
                        .setDescription('The provided JSON is not valid. Please check your syntax and try again.')
                        .addFields(
                            { name: 'Error', value: jsonError.message, inline: false }
                        )
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp()
                    ],
                    components: this.createComponents(embedData)
                });
            }
        } catch (error) {
            console.error('Error in handleCreateFromJson:', error);
        }
    },

    async handleResetEmbed(interaction, embedData, originalInteraction) {
        // Reset to default values
        embedData.title = 'Custom Embed';
        embedData.description = 'This is a custom embed created with the solvix embed creator.';
        embedData.color = variables.embedColor;
        embedData.thumbnail = null;
        embedData.image = null;
        embedData.footer = 'Created with Solvix Embed Creator';
        embedData.author = originalInteraction.user.username;
        embedData.timestamp = true;
        embedData.footerIcon = null;
        embedData.authorIcon = originalInteraction.user.displayAvatarURL();
        embedData.authorUrl = null;
        embedData.fields = [];

        const updatedEmbed = this.createEmbed(embedData);
        const components = this.createComponents(embedData);

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Embed Reset`)
                    .setDescription('Your embed has been reset to default values.')
                    .setFooter(variables.getSlashCommandFooter(originalInteraction))
                    .setTimestamp(),
                updatedEmbed
            ],
            components: components
        });
    },

    async handleDuplicateEmbed(interaction, embedData) {
        const embed = this.createEmbed(embedData);
        const jsonString = JSON.stringify(embed.toJSON(), null, 2);
        
        const duplicateEmbed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle('📋 Embed Duplicated')
            .setDescription('Here\'s your embed JSON that you can use to recreate this embed:')
            .setFooter({ text: 'Copy this JSON to recreate the embed' })
            .setTimestamp();

        if (jsonString.length > 1900) {
            await interaction.reply({
                embeds: [duplicateEmbed],
                content: '```json\n' + jsonString.substring(0, 1900) + '\n... (truncated)\n```',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                embeds: [duplicateEmbed],
                content: '```json\n' + jsonString + '\n```',
                ephemeral: true
            });
        }
    },

    async handleHelpEmbed(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle('🛠️ Solvix Embed Creator Help')
            .setDescription('Here\'s how to use the solvix embed creator:')
            .addFields(
                { name: '📝 Add Field', value: 'Add custom fields to your embed', inline: true },
                { name: '✏️ Edit Content', value: 'Modify title, description, and color', inline: true },
                { name: '📍 Change Channel', value: 'Select where to send the embed', inline: true },
                { name: '🖼️ Edit Images', value: 'Add thumbnail and main images', inline: true },
                { name: '🎨 Styling', value: 'Customize colors and appearance', inline: true },
                { name: '👤 Author & Footer', value: 'Set author info and footer details', inline: true },
                { name: '📝 Create from JSON', value: 'Create embed using raw JSON data', inline: true },
                { name: '🔍 JSON Preview', value: 'View the raw embed JSON', inline: true }
            )
            .setFooter({ text: 'Solvix Embed Creator | Use components to interact' })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }
};


================================================================================
// 13. FILE: config.js
================================================================================
require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: '1389543343595327618',
    prefix: 'sv!',
    mention: false,
    ownerId: '1356342705784881368',
    allowDMs: false
};

================================================================================
// 14. FILE: data/guild_prefixes.json
================================================================================
{}

================================================================================
// 15. FILE: handlers/autoExecute.js
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
// 16. FILE: handlers/normalCommands.js
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
// 17. FILE: handlers/slashCommands.js
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
// 18. FILE: index.js
================================================================================
const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const variables = require('./variables.js');
const { statuses } = require('./status.js');
const database = require('./utils/database.js');

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
    
    // Connect to MongoDB
    const dbConnected = await database.connect();
    if (!dbConnected) {
        console.warn('⚠️  Running without database - prefix commands will use default prefix only');
    }
    
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
    
    try {
        // Get guild-specific prefix or use default
        const guildPrefix = message.guild ? await database.getGuildPrefix(message.guild.id) : null;
        const currentPrefix = guildPrefix || config.prefix;
        
        // Check for prefix match (case-insensitive for default prefix, exact for custom)
        if (message.content.startsWith(currentPrefix)) {
            prefix = currentPrefix;
            args = message.content.slice(currentPrefix.length).trim().split(/ +/);
        }
        // Check for default prefix with case-insensitive matching (when no custom prefix or when custom matches default)
        else if (message.content.toLowerCase().startsWith(config.prefix.toLowerCase())) {
            // Only allow case-insensitive default prefix if no custom prefix is set OR custom prefix equals default
            if (!guildPrefix || guildPrefix.toLowerCase() === config.prefix.toLowerCase()) {
                prefix = config.prefix;
                args = message.content.slice(config.prefix.length).trim().split(/ +/);
            }
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
                        client.normalCommands.find(cmd => cmd.aliases && cmd.aliases.map(alias => alias.toLowerCase()).includes(commandName));
        
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
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    await database.disconnect();
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
// 19. FILE: package.json
================================================================================
{
    "name": "solvix-discord-bot",
    "version": "1.0.0",
    "description": "Advanced Discord bot with slash commands, prefix commands, and mention commands",
    "main": "index.js",
    "scripts": {
        "start": "node index.js",
        "dev": "nodemon index.js"
    },
    "keywords": [
        "discord",
        "bot",
        "slash-commands",
        "discord.js"
    ],
    "author": "Team Solvix",
    "license": "MIT",
    "dependencies": {
        "discord.js": "^14.21.0",
        "dotenv": "^17.0.1"
    },
    "devDependencies": {
        "nodemon": "^3.1.10"
    }
}


================================================================================
// 20. FILE: status.js
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
// 21. FILE: utils/database.js
================================================================================
const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.guildPrefixesFile = path.join(this.dataDir, 'guild_prefixes.json');
        this.isConnected = false;
        this.guildPrefixes = {};
    }

    async connect() {
        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataDir, { recursive: true });

            // Load existing guild prefixes or create empty file
            try {
                const data = await fs.readFile(this.guildPrefixesFile, 'utf8');
                this.guildPrefixes = JSON.parse(data);
            } catch (error) {
                // File doesn't exist or is invalid, start with empty data
                this.guildPrefixes = {};
                await this.saveGuildPrefixes();
            }

            this.isConnected = true;
            console.log('✅ Connected to JSON file database');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize JSON database:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await this.saveGuildPrefixes();
            console.log('✅ Disconnected from JSON file database');
        }
    }

    async saveGuildPrefixes() {
        try {
            await fs.writeFile(this.guildPrefixesFile, JSON.stringify(this.guildPrefixes, null, 2));
        } catch (error) {
            console.error('Error saving guild prefixes:', error.message);
        }
    }

    getCollection(name) {
        if (!this.isConnected) {
            return null;
        }
        // For compatibility with existing code
        return { name };
    }

    async getGuildPrefix(guildId) {
        try {
            if (!this.isConnected) {
                return null;
            }

            return this.guildPrefixes[guildId] || null;
        } catch (error) {
            console.error('Error getting guild prefix:', error.message);
            return null;
        }
    }

    async setGuildPrefix(guildId, prefix) {
        try {
            if (!this.isConnected) {
                console.warn('Database not connected, cannot set guild prefix');
                return false;
            }

            this.guildPrefixes[guildId] = prefix;
            await this.saveGuildPrefixes();
            return true;
        } catch (error) {
            console.error('Error setting guild prefix:', error.message);
            return false;
        }
    }

    async removeGuildPrefix(guildId) {
        try {
            if (!this.isConnected) {
                console.warn('Database not connected, cannot remove guild prefix');
                return false;
            }

            delete this.guildPrefixes[guildId];
            await this.saveGuildPrefixes();
            return true;
        } catch (error) {
            console.error('Error removing guild prefix:', error.message);
            return false;
        }
    }

    async removeGuild(guildId) {
        try {
            if (!this.isConnected) {
                console.warn('Database not connected, cannot remove guild');
                return false;
            }

            delete this.guildPrefixes[guildId];
            await this.saveGuildPrefixes();
            return true;
        } catch (error) {
            console.error('Error removing guild:', error.message);
            return false;
        }
    }

    // Get all guild prefixes (for statistics or management)
    async getAllGuildPrefixes() {
        try {
            if (!this.isConnected) {
                return {};
            }

            return { ...this.guildPrefixes };
        } catch (error) {
            console.error('Error getting all guild prefixes:', error.message);
            return {};
        }
    }
}

module.exports = new Database();

================================================================================
// 22. FILE: variables/colors.js
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
// 23. FILE: variables/emojis.js
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
// 24. FILE: variables.js
================================================================================
// variables.js
const emojis = require('./variables/emojis.js');
const colors = require('./variables/colors.js');

module.exports = {
    // Bot information
    botName: 'Solvix',
    botVersion: '1.0.0',
    
    // Import colors and emojis
    ...require('./variables/colors.js'),
    emojis: require('./variables/emojis.js'),
    
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
Total Files Documented: 24
Generated by: Discord Bot Documentation Generator
Date: 7/3/2025, 1:11:26 PM
================================================================================
*/
