const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Set or reset the bot\'s prefix for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a new prefix for this server')
                .addStringOption(option =>
                    option.setName('new_prefix')
                        .setDescription('The new prefix to set')
                        .setRequired(true)
                        .setMaxLength(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the prefix back to default (sv!)')),
    
    category: 'Settings',
    
    async execute(interaction, client) {
        // Check if user has permission to manage the guild
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.error} Insufficient Permissions`)
                .setDescription('You need the **Manage Server** permission to change the bot prefix.')
                .setFooter(variables.getSlashCommandFooter(interaction))
                .setTimestamp();

            return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const currentPrefix = client.config.guildPrefixes[interaction.guild.id] || 'sv!';

        switch (subcommand) {
            case 'set': {
                const newPrefix = interaction.options.getString('new_prefix');

                // Validation checks
                if (newPrefix.length === 0 || newPrefix.trim().length === 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Prefix`)
                        .setDescription('Prefix cannot be empty or only whitespace!')
                        .setFooter(variables.getSlashCommandFooter(interaction))
                        .setTimestamp();

                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                const oldPrefix = currentPrefix;
                client.config.guildPrefixes[interaction.guild.id] = newPrefix;
                client.config.savePrefixes();

                const successEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.tick} Prefix Updated Successfully`)
                    .setAuthor(variables.getAuthor(client))
                    .setDescription(
                        `**Old Prefix:** \`${oldPrefix}\`\n` +
                        `**New Prefix:** \`${newPrefix}\`\n\n` +
                        `You can now use commands like: \`${newPrefix}ping\``
                    )
                    .addFields({
                        name: `${variables.emojis.plus} Quick Tips`,
                        value:
                            `• Use \`${newPrefix}help\` to see all commands\n` +
                            `• You can change the prefix again anytime\n` +
                            `• Slash commands (/) still work normally`,
                        inline: false
                    })
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [successEmbed] });
                break;
            }

            case 'reset': {
                if (currentPrefix === 'sv!') {
                    const alreadyDefaultEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.system} Already Default`)
                        .setDescription('The prefix is already set to the default (`sv!`).')
                        .setFooter(variables.getSlashCommandFooter(interaction))
                        .setTimestamp();

                    return await interaction.reply({ embeds: [alreadyDefaultEmbed], ephemeral: true });
                }

                delete client.config.guildPrefixes[interaction.guild.id];
                client.config.savePrefixes();
                const defaultPrefix = 'sv!';

                const resetEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.tick} Prefix Reset`)
                    .setAuthor(variables.getAuthor(client))
                    .setDescription(
                        `Successfully reset the prefix back to default.\n\n` +
                        `You can now use commands like: \`${defaultPrefix}ping\``
                    )
                    .addFields({
                        name: `${variables.emojis.plus} Quick Tips`,
                        value:
                            `• Use \`${defaultPrefix}help\` to see all commands\n` +
                            `• You can change the prefix again anytime with \`${defaultPrefix}prefix set <new_prefix>\`\n` +
                            `• Slash commands (/) still work normally`,
                        inline: false
                    })
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp();

                await interaction.reply({ embeds: [resetEmbed] });
                break;
            }
        }
    }
};