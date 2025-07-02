const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Check the bot\'s uptime and version information')
        .addBooleanOption(option =>
            option.setName('ephemeral')
                .setDescription('Make the response visible only to you')
                .setRequired(false)),
    
    category: 'BotInfo',
    
    async execute(interaction, client) {
        const isEphemeral = interaction.options.getBoolean('ephemeral') ?? false;
        
        // Calculate uptime immediately
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        // Format uptime string
        let uptimeString = '';
        if (days > 0) uptimeString += `${days}d `;
        if (hours > 0) uptimeString += `${hours}h `;
        if (minutes > 0) uptimeString += `${minutes}m `;
        uptimeString += `${seconds}s`;
        
        // Calculate start time
        const startTime = Math.floor((Date.now() - uptime * 1000) / 1000);
        
        // Create and send the embed directly
        const embed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle(`${variables.emojis.uptime} Bot Uptime Information`)
            .setAuthor(variables.getAuthor(client))
            .addFields(
                {
                    name: 'Total Uptime Duration',
                    value: `\`${uptimeString}\``,
                    inline: true
                },
                {
                    name: 'Bot Start Time',
                    value: `<t:${startTime}:F>\n(<t:${startTime}:R>)`,
                    inline: true
                },
                {
                    name: 'Bot Version',
                    value: `\`v${variables.botVersion}\``,
                    inline: true
                }
            )
            .setFooter({
                text: `Requested by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();
        
        await interaction.reply({
            embeds: [embed],
            ephemeral: isEphemeral
        });
    }
};