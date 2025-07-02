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