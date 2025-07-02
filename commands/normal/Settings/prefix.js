const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    name: 'prefix',
    description: 'Set or reset the bot\'s prefix for this server',
    usage: 'prefix <set/reset> [new_prefix]',
    aliases: ['setprefix', 'changeprefix', 'resetprefix'],
    category: 'Settings',
    permissions: [PermissionFlagsBits.ManageGuild],

    async execute(message, args, client) {
        // Check if user has permission to manage the guild
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.error} Insufficient Permissions`)
                .setDescription('You need the **Manage Server** permission to change the bot prefix.')
                .setFooter(variables.getNormalCommandFooter(message))
                .setTimestamp();

            return await message.reply({ embeds: [noPermEmbed] });
        }

        // If no arguments provided, show current prefix and help
        if (args.length === 0) {
            const helpEmbed = new EmbedBuilder()
                .setColor(variables.embedColor)
                .setTitle(`${variables.emojis.bot} Prefix Settings`)
                .setAuthor(variables.getAuthor(client))
                .setDescription(`Current prefix: \`${client.config.guildPrefixes[message.guild.id] || 'sv!'}\``)
                .addFields(
                    {
                        name: `${variables.emojis.plus} Set Prefix`,
                        value: '`prefix set <new_prefix>`\nChange the bot prefix for this server',
                        inline: false
                    },
                    {
                        name: `${variables.emojis.minus} Reset Prefix`,
                        value: '`prefix reset`\nReset the prefix back to default (`sv!`)',
                        inline: false
                    },
                    {
                        name: `${variables.emojis.system} Examples`,
                        value: '• `prefix set !` - Set prefix to `!`\n• `prefix set bot.` - Set prefix to `bot.`\n• `prefix reset` - Reset to default prefix',
                        inline: false
                    }
                )
                .setFooter(variables.getNormalCommandFooter(message))
                .setTimestamp();

            return await message.reply({ embeds: [helpEmbed] });
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'set': {
                if (args.length < 2) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Usage`)
                        .setDescription('Please provide a new prefix.\n\n**Usage:** `prefix set <new_prefix>`')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [errorEmbed] });
                }

                const newPrefix = args.slice(1).join(' ');

                // Validation checks
                if (newPrefix.length === 0 || newPrefix.trim().length === 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Prefix`)
                        .setDescription('Prefix cannot be empty or only whitespace!')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [errorEmbed] });
                }

                if (newPrefix.length > 10) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.error} Invalid Prefix`)
                        .setDescription('Prefix cannot be longer than 10 characters!')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [errorEmbed] });
                }

                const oldPrefix = client.config.guildPrefixes[message.guild.id] || 'sv!';
                client.config.guildPrefixes[message.guild.id] = newPrefix;
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
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [successEmbed] });
                break;
            }

            case 'reset': {
                const currentPrefix = client.config.guildPrefixes[message.guild.id];

                if (!currentPrefix || currentPrefix === 'sv!') {
                    const alreadyDefaultEmbed = new EmbedBuilder()
                        .setColor(variables.embedColor)
                        .setTitle(`${variables.emojis.system} Already Default`)
                        .setDescription('The prefix is already set to the default (`sv!`).')
                        .setFooter(variables.getNormalCommandFooter(message))
                        .setTimestamp();

                    return await message.reply({ embeds: [alreadyDefaultEmbed] });
                }

                delete client.config.guildPrefixes[message.guild.id];
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
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [resetEmbed] });
                break;
            }

            default: {
                const invalidActionEmbed = new EmbedBuilder()
                    .setColor(variables.embedColor)
                    .setTitle(`${variables.emojis.error} Invalid Action`)
                    .setDescription('Please use either `set` or `reset`.')
                    .addFields({
                        name: `${variables.emojis.system} Valid Actions`,
                        value: '• `prefix set <new_prefix>` - Set a new prefix\n• `prefix reset` - Reset to default prefix',
                        inline: false
                    })
                    .setFooter(variables.getNormalCommandFooter(message))
                    .setTimestamp();

                await message.reply({ embeds: [invalidActionEmbed] });
                break;
            }
        }
    }
};