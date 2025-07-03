
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
