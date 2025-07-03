const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const variables = require('../../../variables.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Get detailed information about the bot including system stats and performance metrics'),
    
    category: 'BotInfo',
    cooldown: 5000, // 5 seconds cooldown for this resource-intensive command
    
    async execute(interaction, client) {
        try {
            // Calculate various metrics
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();
            
            // Format uptime
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            let uptimeString = '';
            if (days > 0) uptimeString += `${days}d `;
            if (hours > 0) uptimeString += `${hours}h `;
            if (minutes > 0) uptimeString += `${minutes}m `;
            uptimeString += `${seconds}s`;
            
            // Calculate memory usage in MB
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
            const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const totalChannels = client.channels.cache.size;
            const slashCommands = client.slashCommands.size;
            const normalCommands = client.normalCommands.size;
            
            // Ping information
            const websocketPing = Math.round(client.ws.ping);
            const pingEmoji = variables.getPingEmoji(websocketPing);
            const pingStatus = variables.getPingStatus(websocketPing);
            
            // Get CPU load average (if available)
            const loadAvg = os.loadavg();
            const cpuCount = os.cpus().length;
            
            // Calculate start time
            const startTime = Math.floor((Date.now() - uptime * 1000) / 1000);
            
            // System uptime formatting
            const sysDays = Math.floor(systemUptime / 86400);
            const sysHours = Math.floor((systemUptime % 86400) / 3600);
            let systemUptimeString = '';
            if (sysDays > 0) systemUptimeString += `${sysDays}d `;
            if (sysHours > 0 || sysDays > 0) systemUptimeString += `${sysHours}h`;
            if (!systemUptimeString) systemUptimeString = '<1h';
            
            // Memory usage bar
            const memoryBar = this.createProgressBar(memPercentage, 10);
            const systemMemoryBar = this.createProgressBar(systemMemPercentage, 10);
            
            // Create the main embed
            const embed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.bot} ${variables.botName} - Bot Information`)
                .setAuthor(variables.getAuthor(client))
                .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
                .addFields(
                    {
                        name: `${variables.emojis.uptime} Bot Statistics`,
                        value: [
                            `**Uptime:** \`${uptimeString}\``,
                            `**Started:** <t:${startTime}:F>`,
                            `**Version:** \`v${variables.botVersion}\``,
                            `**Ping:** ${pingEmoji} \`${websocketPing}ms\` - ${pingStatus}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.world} Discord Stats`,
                        value: [
                            `**Servers:** \`${client.guilds.cache.size.toLocaleString()}\``,
                            `**Users:** \`${totalUsers.toLocaleString()}\``,
                            `**Channels:** \`${totalChannels.toLocaleString()}\``,
                            `**Commands:** \`${slashCommands + normalCommands}\` (${slashCommands}/${normalCommands})`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.star} Technical Info`,
                        value: [
                            `**Node.js:** \`${nodeVersion}\``,
                            `**Discord.js:** \`v${djsVersion}\``,
                            `**Platform:** \`${platform} ${architecture}\``,
                            `**CPU Cores:** \`${cpuCount}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.memory} Bot Memory Usage`,
                        value: [
                            `**Used:** \`${memUsedMB}MB\` / \`${memTotalMB}MB\` (${memPercentage}%)`,
                            `${memoryBar}`,
                            `**RSS:** \`${Math.round(memoryUsage.rss / 1024 / 1024)}MB\``,
                            `**External:** \`${Math.round(memoryUsage.external / 1024 / 1024)}MB\``
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: `️${variables.emojis.system} System Resources`,
                        value: [
                            `**System Memory:** \`${usedSystemMemory}GB\` / \`${totalMemory}GB\` (${systemMemPercentage}%)`,
                            `${systemMemoryBar}`,
                            `**System Uptime:** \`${systemUptimeString}\``,
                            `**Load Average:** \`${loadAvg[0].toFixed(2)}\` / \`${loadAvg[1].toFixed(2)}\` / \`${loadAvg[2].toFixed(2)}\``
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();
            
            // Add performance indicators
            const performanceIndicators = this.getPerformanceIndicators(websocketPing, memPercentage, systemMemPercentage);
            if (performanceIndicators.length > 0) {
                embed.addFields({
                    name: `${variables.emojis.rocket} Performance Status`,
                    value: performanceIndicators.join('\n'),
                    inline: false
                });
            }
            
            await interaction.reply({
                embeds: [embed]
            });
            
        } catch (error) {
            console.error('Error in botinfo command:', error);
            await interaction.reply({
                content: `${variables.emojis.error} An error occurred while gathering bot information. Please try again later.`,
                ephemeral: true
            });
        }
    },
    
    // Helper function to create progress bars
    createProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        
        const fillChar = '█';
        const emptyChar = '░';
        
        return `\`${'█'.repeat(filled)}${'░'.repeat(empty)}\` ${percentage}%`;
    },
    
    // Helper function to get performance indicators
    getPerformanceIndicators(ping, memUsage, systemMemUsage) {
        const indicators = [];
        
        // Ping status
        if (ping <= 50) {
            indicators.push(`${variables.emojis.ping_excellent} Excellent Connection Quality`);
        } else if (ping <= 150) {
            indicators.push(`${variables.emojis.ping_good} Good Connection Quality`);
        } else if (ping <= 400) {
            indicators.push(`${variables.emojis.ping_noticeable} Connection Has Noticeable Delay`);
        } else {
            indicators.push(`${variables.emojis.ping_poor} Poor Connection Quality`);
        }
        
        // Memory usage status
        if (memUsage < 70) {
            indicators.push(`${variables.emojis.tick} Healthy Memory Usage`);
        } else if (memUsage < 85) {
            indicators.push(`${variables.emojis.warning} Moderate Memory Usage`);
        } else {
            indicators.push(`${variables.emojis.error} High Memory Usage`);
        }
        
        // System memory status
        if (systemMemUsage < 80) {
            indicators.push(`${variables.emojis.tick} System Resources Available`);
        } else if (systemMemUsage < 90) {
            indicators.push(`${variables.emojis.warning} System Resources Under Load`);
        } else {
            indicators.push(`${variables.emojis.error} System Resources Critically Low`);
        }
        
        return indicators;
    }
};