const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Get detailed information about the bot including system stats, performance metrics, and more')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Make the response visible only to you')
                .setRequired(false)),
    
    category: 'BotInfo',
    cooldown: 5000,
    
    async execute(interaction, client) {
        const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
        
        try {
            // Calculate metrics immediately
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();
            
            // Format uptime
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            let uptimeString = `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`;
            
            // Memory calculations
            const memUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            const memTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
            const memPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
            
            // System info
            const platform = os.platform();
            const architecture = os.arch();
            const systemUptime = os.uptime();
            const totalMemory = Math.round(os.totalmem() / 1024 / 1024 / 1024);
            const freeMemory = Math.round(os.freemem() / 1024 / 1024 / 1024);
            const usedSystemMemory = totalMemory - freeMemory;
            const systemMemPercentage = Math.round((usedSystemMemory / totalMemory) * 100);
            
            // Discord stats
            const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
            const websocketPing = Math.round(client.ws.ping);
            
            // Create progress bars
            const memoryBar = this.createProgressBar(memPercentage);
            const systemMemoryBar = this.createProgressBar(systemMemPercentage);
            
            // Build embed
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
                            `**Version:** \`v${variables.botVersion}\``,
                            `**Ping:** ${variables.getPingEmoji(websocketPing)} \`${websocketPing}ms\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.world} Discord Stats`,
                        value: [
                            `**Servers:** \`${client.guilds.cache.size.toLocaleString()}\``,
                            `**Users:** \`${totalUsers.toLocaleString()}\``,
                            `**Channels:** \`${client.channels.cache.size.toLocaleString()}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.star} System Info`,
                        value: [
                            `**Platform:** \`${platform} ${architecture}\``,
                            `**Node.js:** \`${process.version}\``,
                            `**CPU Cores:** \`${os.cpus().length}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: `${variables.emojis.memory} Memory Usage`,
                        value: [
                            `**Bot:** ${memoryBar}`,
                            `**System:** ${systemMemoryBar}`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Send immediately without loading message
            await interaction.reply({
                embeds: [embed],
                ephemeral: isEphemeral
            });
            
        } catch (error) {
            console.error('Error in botinfo command:', error);
            await interaction.reply({
                content: `${variables.emojis.error} An error occurred while gathering bot information.`,
                ephemeral: true
            });
        }
    },
    
    createProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        return `\`${'█'.repeat(filled)}${'░'.repeat(length - filled)}\` ${percentage}%`;
    },
    
    getPerformanceIndicators(ping, memUsage, systemMemUsage) {
        const indicators = [];
        if (ping <= 50) indicators.push(`${variables.emojis.ping_excellent} Excellent Connection`);
        else if (ping <= 150) indicators.push(`${variables.emojis.ping_good} Good Connection`);
        else if (ping <= 400) indicators.push(`${variables.emojis.ping_noticeable} Noticeable Delay`);
        else indicators.push(`${variables.emojis.ping_poor} Poor Connection`);
        
        if (memUsage < 70) indicators.push(`${variables.emojis.tick} Healthy Memory`);
        else if (memUsage < 85) indicators.push(`${variables.emojis.warning} Moderate Memory`);
        else indicators.push(`${variables.emojis.error} High Memory`);
        
        if (systemMemUsage < 80) indicators.push(`${variables.emojis.tick} System Resources OK`);
        else if (systemMemUsage < 90) indicators.push(`${variables.emojis.warning} System Under Load`);
        else indicators.push(`${variables.emojis.error} System Critical`);
        
        return indicators;
    }
};