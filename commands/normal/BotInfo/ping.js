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