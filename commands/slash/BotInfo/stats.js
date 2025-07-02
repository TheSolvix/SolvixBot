// commands/slash/BotInfo/stats.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Get detailed statistics about the bot\'s usage and performance')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Make the response visible only to you')
                .setRequired(false)),
    
    category: 'BotInfo',
    cooldown: 10000, // 10 seconds cooldown for this resource-intensive command
    
    async execute(interaction, client) {
        const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
        
        try {
            // Calculate various metrics
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();
            
            // Format uptime
            const uptimeString = this.formatDuration(uptime);
            
            // Calculate memory usage
            const memUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const memTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            const memPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
            
            // System information
            const platform = os.platform();
            const architecture = os.arch();
            const nodeVersion = process.version;
            const systemUptime = os.uptime();
            const totalMemory = Math.round(os.totalmem() / 1024 / 1024 / 1024); // GB
            const freeMemory = Math.round(os.freemem() / 1024 / 1024 / 1024); // GB
            const usedSystemMemory = totalMemory - freeMemory;
            const systemMemPercentage = Math.round((usedSystemMemory / totalMemory) * 100);
            
            // Discord client stats
            const guildCount = client.guilds.cache.size;
            const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const channelCount = client.channels.cache.size;
            const commandCount = client.slashCommands.size + client.normalCommands.size;
            
            // Calculate server distribution by size
            const serverSizes = {
                small: 0,    // 1-100 members
                medium: 0,   // 101-1000 members
                large: 0,    // 1001-10000 members
                xlarge: 0    // 10000+ members
            };
            
            client.guilds.cache.forEach(guild => {
                if (guild.memberCount <= 100) serverSizes.small++;
                else if (guild.memberCount <= 1000) serverSizes.medium++;
                else if (guild.memberCount <= 10000) serverSizes.large++;
                else serverSizes.xlarge++;
            });
            
            // Get command usage statistics
            const commandStats = variables.commandStats;
            const sortedCommands = Object.entries(commandStats.commands)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5) // Show top 5 commands
                .map(([name, count]) => ({ name, count }));

            const commandUsage = {
                topCommands: sortedCommands,
                totalCommandsExecuted: commandStats.total
            };
            
            // Calculate shard information (if sharded)
            const shardInfo = {
                id: client.shard?.ids?.[0] || 0,
                count: client.shard?.count || 1,
                status: 'Single Shard'
            };
            
            if (shardInfo.count > 1) {
                shardInfo.status = `Shard ${shardInfo.id + 1}/${shardInfo.count}`;
            }
            
            // Create the main embed
            const embed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.bot} ${variables.botName} - Statistics`)
                .setAuthor(variables.getAuthor(client))
                .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
                .addFields(
                    {
                        name: `${variables.emojis.world} Discord Statistics`,
                        value: [
                            `**Servers:** \`${guildCount.toLocaleString()}\``,
                            `**Users:** \`${userCount.toLocaleString()}\``,
                            `**Channels:** \`${channelCount.toLocaleString()}\``,
                            `**Commands:** \`${commandCount.toLocaleString()}\``,
                            `**Shard:** \`${shardInfo.status}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.server} Server Distribution`,
                        value: [
                            `**Small:** \`${serverSizes.small}\` (1-100)`,
                            `**Medium:** \`${serverSizes.medium}\` (101-1k)`,
                            `**Large:** \`${serverSizes.large}\` (1k-10k)`,
                            `**X-Large:** \`${serverSizes.xlarge}\` (10k+)`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.rocket} Performance`,
                        value: [
                            `**Uptime:** \`${uptimeString}\``,
                            `**Memory:** \`${memUsedMB}MB\`/\`${memTotalMB}MB\` (${memPercentage}%)`,
                            `**System Memory:** \`${usedSystemMemory}GB\`/\`${totalMemory}GB\` (${systemMemPercentage}%)`,
                            `**Ping:** \`${Math.round(client.ws.ping)}ms\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.star} Technical Info`,
                        value: [
                            `**Node.js:** \`${nodeVersion}\``,
                            `**Discord.js:** \`v${require('discord.js').version}\``,
                            `**Platform:** \`${platform} ${architecture}\``,
                            `**CPU Cores:** \`${os.cpus().length}\``
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();
            
            // Add command usage if available
            
            await interaction.reply({
                embeds: [embed],
                ephemeral: isEphemeral
            });
            
        } catch (error) {
            console.error('Error in stats command:', error);
            await interaction.reply({
                content: `${variables.emojis.error} An error occurred while gathering statistics. Please try again later.`,
                ephemeral: true
            });
        }
    },
    
    formatDuration(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        let duration = '';
        if (days > 0) duration += `${days}d `;
        if (hours > 0) duration += `${hours}h `;
        if (minutes > 0) duration += `${minutes}m `;
        duration += `${secs}s`;
        
        return duration;
    }
};