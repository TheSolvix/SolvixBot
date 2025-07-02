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