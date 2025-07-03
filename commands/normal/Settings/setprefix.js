
const { EmbedBuilder } = require('discord.js');
const variables = require('../../../variables.js');
const database = require('../../../utils/database.js');

module.exports = {
    name: 'setprefix',
    description: 'Set a custom prefix for this server',
    usage: 'setprefix <new_prefix>',
    aliases: ['prefix', 'changeprefix', 'sp'],
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
                    .setDescription('You need the `Manage Server` permission to change the prefix.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        const newPrefix = args[0];
        
        if (!newPrefix) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.warningColor)
                    .setTitle(`${variables.emojis.warning} Missing Argument`)
                    .setDescription(`Please provide a new prefix.\n\n**Usage:** \`${message.content.split(' ')[0]} <new_prefix>\``)
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        // Validation
        if (newPrefix.length < 1 || newPrefix.length > 5) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Prefix`)
                    .setDescription('Prefix must be between 1 and 5 characters long.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        // Check for invalid characters
        const invalidChars = ['@', '#', '`', '\\', '/'];
        if (invalidChars.some(char => newPrefix.includes(char))) {
            return await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Characters`)
                    .setDescription(`Prefix cannot contain: \`${invalidChars.join(' ')}\``)
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }

        try {
            // Always save the prefix, even if it matches the default
            const success = await database.setGuildPrefix(message.guild.id, newPrefix);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Prefix Updated`)
                    .setDescription(`Server prefix has been set to: \`${newPrefix}\``)
                    .addFields(
                        { name: 'New Prefix', value: `\`${newPrefix}\``, inline: true },
                        { name: 'Example Usage', value: `\`${newPrefix}ping\``, inline: true }
                    )
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            } else {
                throw new Error('Database operation failed');
            }
        } catch (error) {
            console.error('Error setting prefix:', error);
            await message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Database Error`)
                    .setDescription('Failed to update prefix. Please try again later.')
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp()
                ]
            });
        }
    }
};
