
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');
const database = require('../../../utils/database.js');
const config = require('../../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetprefix')
        .setDescription('Reset the server prefix to the default')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    cooldown: 5000,
    
    async execute(interaction, client) {
        try {
            const success = await database.removeGuildPrefix(interaction.guild.id);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Prefix Reset`)
                    .setDescription(`Server prefix has been reset to the default: \`${config.prefix}\``)
                    .addFields(
                        { name: 'Default Prefix', value: `\`${config.prefix}\``, inline: true },
                        { name: 'Example Usage', value: `\`${config.prefix}ping\``, inline: true }
                    )
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                throw new Error('Database operation failed');
            }
        } catch (error) {
            console.error('Error resetting prefix:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Database Error`)
                    .setDescription('Failed to reset prefix. Please try again later.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};
