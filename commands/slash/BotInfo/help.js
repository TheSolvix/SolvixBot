
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
