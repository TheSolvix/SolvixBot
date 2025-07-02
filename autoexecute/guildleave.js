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