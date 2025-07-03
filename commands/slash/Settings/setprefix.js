
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');
const database = require('../../../utils/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Set a custom prefix for this server')
        .addStringOption(option =>
            option.setName('prefix')
                .setDescription('The new prefix to set (1-5 characters)')
                .setRequired(true)
                .setMaxLength(5)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    cooldown: 5000,
    
    async execute(interaction, client) {
        const newPrefix = interaction.options.getString('prefix');
        
        // Validation
        if (newPrefix.length < 1 || newPrefix.length > 5) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Prefix`)
                    .setDescription('Prefix must be between 1 and 5 characters long.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }

        // Check for invalid characters
        const invalidChars = ['@', '#', '`', '\\', '/'];
        if (invalidChars.some(char => newPrefix.includes(char))) {
            return await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Invalid Characters`)
                    .setDescription(`Prefix cannot contain: \`${invalidChars.join(' ')}\``)
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }

        try {
            // Always save the prefix, even if it matches the default
            const success = await database.setGuildPrefix(interaction.guild.id, newPrefix);
            
            if (success) {
                const embed = new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Prefix Updated`)
                    .setDescription(`Server prefix has been set to: \`${newPrefix}\``)
                    .addFields(
                        { name: 'New Prefix', value: `\`${newPrefix}\``, inline: true },
                        { name: 'Example Usage', value: `\`${newPrefix}ping\``, inline: true }
                    )
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                throw new Error('Database operation failed');
            }
        } catch (error) {
            console.error('Error setting prefix:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Database Error`)
                    .setDescription('Failed to update prefix. Please try again later.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};
