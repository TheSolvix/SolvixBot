
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const variables = require('../../../variables.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedcreator')
        .setDescription('Create a custom embed with solvix options')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the embed to')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the embed')
                .setRequired(false)
                .setMaxLength(256)
        )
        .addStringOption(option =>
            option.setName('description')
                .setDescription('The description of the embed')
                .setRequired(false)
                .setMaxLength(4096)
        )
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color of the embed (hex code, e.g., #ff0000)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('URL for the thumbnail image')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL for the main image')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Footer text')
                .setRequired(false)
                .setMaxLength(2048)
        )
        .addStringOption(option =>
            option.setName('author')
                .setDescription('Author name')
                .setRequired(false)
                .setMaxLength(256)
        )
        .addBooleanOption(option =>
            option.setName('timestamp')
                .setDescription('Add current timestamp to the embed')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('footer_icon')
                .setDescription('URL for the footer icon')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('author_icon')
                .setDescription('URL for the author icon')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('author_url')
                .setDescription('URL for the author link')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    cooldown: 5000,
    
    async execute(interaction, client) {
        try {
            // Get all the options
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const title = interaction.options.getString('title') || 'Custom Embed';
            const description = interaction.options.getString('description') || 'This is a custom embed created with the solvix embed creator.';
            const color = interaction.options.getString('color');
            const thumbnail = interaction.options.getString('thumbnail');
            const image = interaction.options.getString('image');
            const footer = interaction.options.getString('footer') || 'Created with Solvix Embed Creator';
            const author = interaction.options.getString('author') || interaction.user.username;
            const timestamp = interaction.options.getBoolean('timestamp') ?? true;
            const footerIcon = interaction.options.getString('footer_icon');
            const authorIcon = interaction.options.getString('author_icon') || interaction.user.displayAvatarURL();
            const authorUrl = interaction.options.getString('author_url');

            // Store embed data for later use
            const embedData = {
                title,
                description,
                color: color || variables.embedColor,
                thumbnail,
                image,
                footer,
                author,
                timestamp,
                footerIcon,
                authorIcon,
                authorUrl,
                targetChannel: targetChannel.id,
                fields: []
            };

            // Validate color if provided
            if (color) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (!hexRegex.test(color)) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(variables.errorColor)
                            .setTitle(`${variables.emojis.error} Invalid Color`)
                            .setDescription('Please provide a valid hex color code (e.g., #ff0000)')
                            .setFooter(variables.getSlashCommandFooter(interaction))
                            .setTimestamp()
                        ],
                        ephemeral: true
                    });
                }
                embedData.color = color;
            }

            // Validate URLs if provided
            const urlRegex = /^https?:\/\/.+/;
            const urlFields = ['thumbnail', 'image', 'footerIcon', 'authorIcon', 'authorUrl'];
            
            for (const field of urlFields) {
                const value = embedData[field];
                if (value && !urlRegex.test(value)) {
                    return await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(variables.errorColor)
                            .setTitle(`${variables.emojis.error} Invalid URL`)
                            .setDescription(`Please provide a valid URL for ${field}`)
                            .setFooter(variables.getSlashCommandFooter(interaction))
                            .setTimestamp()
                        ],
                        ephemeral: true
                    });
                }
            }

            // Create the embed
            const embed = this.createEmbed(embedData);

            // Create advanced control components
            const components = this.createComponents(embedData);

            // Send the preview
            const previewEmbed = new EmbedBuilder()
                .setColor(variables.successColor)
                .setTitle(`${variables.emojis.tick} Solvix Embed Creator`)
                .setDescription(`**Target Channel:** ${targetChannel}\n**Status:** Ready to customize\n\nUse the controls below to modify your embed or send it directly.`)
                .addFields(
                    { name: '🎨 Quick Actions', value: 'Use buttons for common actions', inline: true },
                    { name: '⚙️ Advanced Settings', value: 'Use select menus for detailed customization', inline: true },
                    { name: '📤 Publishing', value: 'Send to the selected channel when ready', inline: true }
                )
                .setFooter(variables.getSlashCommandFooter(interaction))
                .setTimestamp();

            await interaction.reply({
                embeds: [previewEmbed, embed],
                components: components,
                ephemeral: true
            });

            // Create collector for component interactions
            const collector = interaction.channel.createMessageComponentCollector({
                time: 600000 // 10 minutes
            });

            collector.on('collect', async (componentInteraction) => {
                if (componentInteraction.user.id !== interaction.user.id) {
                    return await componentInteraction.reply({
                        content: 'You cannot use these controls.',
                        ephemeral: true
                    });
                }

                await this.handleComponentInteraction(componentInteraction, embedData, interaction);
            });

            collector.on('end', () => {
                // Disable all components after timeout
                const disabledComponents = components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach(component => component.setDisabled(true));
                    return newRow;
                });
                
                interaction.editReply({
                    components: disabledComponents
                }).catch(() => {});
            });

        } catch (error) {
            console.error('Error in embedcreator command:', error);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Command Error`)
                    .setDescription('An error occurred while creating the embed.')
                    .setFooter(variables.getSlashCommandFooter(interaction))
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    },

    createEmbed(embedData) {
        const embed = new EmbedBuilder()
            .setColor(embedData.color);

        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
        if (embedData.image) embed.setImage(embedData.image);
        
        // Enhanced footer with icon support
        if (embedData.footer) {
            const footerObj = { text: embedData.footer };
            if (embedData.footerIcon) footerObj.iconURL = embedData.footerIcon;
            embed.setFooter(footerObj);
        }
        
        // Enhanced author with icon and URL support
        if (embedData.author) {
            const authorObj = { name: embedData.author };
            if (embedData.authorIcon) authorObj.iconURL = embedData.authorIcon;
            if (embedData.authorUrl) authorObj.url = embedData.authorUrl;
            embed.setAuthor(authorObj);
        }
        
        if (embedData.timestamp) embed.setTimestamp();

        // Add fields if any
        if (embedData.fields && embedData.fields.length > 0) {
            embed.addFields(embedData.fields);
        }

        return embed;
    },

    createComponents(embedData) {
        // Row 1: Quick Action Buttons
        const quickActionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_field')
                    .setLabel('Add Field')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('edit_basic')
                    .setLabel('Edit Content')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('change_channel')
                    .setLabel('Change Channel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📍'),
                new ButtonBuilder()
                    .setCustomId('send_embed')
                    .setLabel('Send Embed')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📤')
            );

        // Row 2: Advanced Settings Select Menu
        const advancedSettingsRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('advanced_settings')
                    .setPlaceholder('🛠️ Advanced Settings')
                    .addOptions([
                        {
                            label: 'Edit Images & Media',
                            value: 'edit_media',
                            description: 'Modify thumbnail, image, and media settings',
                            emoji: '🖼️'
                        },
                        {
                            label: 'Styling Options',
                            value: 'edit_styling',
                            description: 'Change colors, appearance, and layout',
                            emoji: '🎨'
                        },
                        {
                            label: 'Author & Footer',
                            value: 'edit_metadata',
                            description: 'Configure author info and footer details',
                            emoji: '👤'
                        },
                        {
                            label: 'Create from JSON',
                            value: 'create_json',
                            description: 'Create embed using raw JSON data',
                            emoji: '📝'
                        }
                    ])
            );

        // Row 3: Utility Buttons
        const utilityRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('preview_json')
                    .setLabel('JSON Preview')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('reset_embed')
                    .setLabel('Reset')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('duplicate_embed')
                    .setLabel('Duplicate')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('help_embed')
                    .setLabel('Help')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        return [quickActionRow, advancedSettingsRow, utilityRow];
    },

    async handleComponentInteraction(componentInteraction, embedData, originalInteraction) {
        try {
            switch (componentInteraction.customId) {
                case 'add_field':
                    await this.handleAddField(componentInteraction, embedData, originalInteraction);
                    break;
                case 'edit_basic':
                    await this.handleEditBasic(componentInteraction, embedData, originalInteraction);
                    break;
                case 'change_channel':
                    await this.handleChangeChannel(componentInteraction, embedData, originalInteraction);
                    break;
                case 'send_embed':
                    await this.handleSendEmbed(componentInteraction, embedData, originalInteraction);
                    break;
                case 'advanced_settings':
                    await this.handleAdvancedSettings(componentInteraction, embedData, originalInteraction);
                    break;
                case 'preview_json':
                    await this.handleJsonPreview(componentInteraction, embedData);
                    break;
                case 'reset_embed':
                    await this.handleResetEmbed(componentInteraction, embedData, originalInteraction);
                    break;
                case 'duplicate_embed':
                    await this.handleDuplicateEmbed(componentInteraction, embedData);
                    break;
                case 'help_embed':
                    await this.handleHelpEmbed(componentInteraction);
                    break;
            }
        } catch (error) {
            console.error('Error handling component interaction:', error);
            await componentInteraction.reply({
                content: 'An error occurred while processing your request.',
                ephemeral: true
            });
        }
    },

    async handleAddField(interaction, embedData, originalInteraction) {
        // Check if interaction is still valid
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp({
                content: 'This interaction has expired. Please try again.',
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('add_field_modal')
            .setTitle('Add Embed Field');

        const nameInput = new TextInputBuilder()
            .setCustomId('field_name')
            .setLabel('Field Name')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setRequired(true);

        const valueInput = new TextInputBuilder()
            .setCustomId('field_value')
            .setLabel('Field Value')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1024)
            .setRequired(true);

        const inlineInput = new TextInputBuilder()
            .setCustomId('field_inline')
            .setLabel('Inline (true/false)')
            .setStyle(TextInputStyle.Short)
            .setValue('false')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(valueInput),
            new ActionRowBuilder().addComponents(inlineInput)
        );

        try {
            await interaction.showModal(modal);

            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const fieldName = modalSubmission.fields.getTextInputValue('field_name');
            const fieldValue = modalSubmission.fields.getTextInputValue('field_value');
            const fieldInline = modalSubmission.fields.getTextInputValue('field_inline').toLowerCase() === 'true';

            embedData.fields.push({ name: fieldName, value: fieldValue, inline: fieldInline });

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Field Added`)
                        .setDescription(`**Field Name:** ${fieldName}\n**Field Value:** ${fieldValue}\n**Inline:** ${fieldInline}`)
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            console.error('Error in handleAddField:', error);
            // Try to respond if possible
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while adding the field. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Error sending error reply:', replyError);
            }
        }
    },

    async handleEditBasic(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_basic_modal')
            .setTitle('Edit Basic Content');

        const titleInput = new TextInputBuilder()
            .setCustomId('edit_title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(256)
            .setValue(embedData.title || '')
            .setRequired(false);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('edit_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(4000)
            .setValue(embedData.description || '')
            .setRequired(false);

        const colorInput = new TextInputBuilder()
            .setCustomId('edit_color')
            .setLabel('Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.color || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(colorInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newTitle = modalSubmission.fields.getTextInputValue('edit_title');
            const newDescription = modalSubmission.fields.getTextInputValue('edit_description');
            const newColor = modalSubmission.fields.getTextInputValue('edit_color');

            if (newTitle) embedData.title = newTitle;
            if (newDescription) embedData.description = newDescription;
            if (newColor) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexRegex.test(newColor)) {
                    embedData.color = newColor;
                }
            }

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Basic Content Updated`)
                        .setDescription('Your embed content has been updated successfully!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleChangeChannel(interaction, embedData, originalInteraction) {
        const channels = originalInteraction.guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildText && channel.permissionsFor(originalInteraction.guild.members.me).has(PermissionFlagsBits.SendMessages))
            .map(channel => ({
                label: `#${channel.name}`,
                value: channel.id,
                description: channel.topic ? channel.topic.substring(0, 100) : 'No description'
            }))
            .slice(0, 25);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_channel')
            .setPlaceholder('Select a channel to send the embed to')
            .addOptions(channels);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '**Select Target Channel**\nChoose where you want to send this embed:',
            components: [selectRow],
            ephemeral: true
        });

        try {
            const collector = interaction.channel.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id && i.customId === 'select_channel',
                time: 30000,
                max: 1
            });

            collector.on('collect', async (selectComponentInteraction) => {
                const selectedChannelId = selectComponentInteraction.values[0];
                const selectedChannel = originalInteraction.guild.channels.cache.get(selectedChannelId);
                
                embedData.targetChannel = selectedChannelId;

                const updatedEmbed = this.createEmbed(embedData);
                const components = this.createComponents(embedData);

                await selectComponentInteraction.update({
                    content: `✅ **Channel Updated**\nTarget channel changed to: ${selectedChannel}`,
                    components: []
                });

                await originalInteraction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(variables.successColor)
                            .setTitle(`${variables.emojis.tick} Solvix Embed Creator`)
                            .setDescription(`**Target Channel:** ${selectedChannel}\n**Status:** Ready to customize\n\nUse the controls below to modify your embed or send it directly.`)
                            .addFields(
                                { name: '🎨 Quick Actions', value: 'Use buttons for common actions', inline: true },
                                { name: '⚙️ Advanced Settings', value: 'Use select menus for detailed customization', inline: true },
                                { name: '📤 Publishing', value: 'Send to the selected channel when ready', inline: true }
                            )
                            .setFooter(variables.getSlashCommandFooter(originalInteraction))
                            .setTimestamp(),
                        updatedEmbed
                    ],
                    components: components
                });
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.editReply({
                        content: '❌ **Channel Selection Timeout**\nNo channel was selected.',
                        components: []
                    }).catch(() => {});
                }
            });
        } catch (error) {
            console.error('Error in handleChangeChannel:', error);
        }
    },

    async handleSendEmbed(interaction, embedData, originalInteraction) {
        try {
            const targetChannel = originalInteraction.guild.channels.cache.get(embedData.targetChannel);
            const finalEmbed = this.createEmbed(embedData);
            
            await targetChannel.send({ embeds: [finalEmbed] });
            
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Embed Sent Successfully`)
                    .setDescription(`Your embed has been sent to ${targetChannel}!`)
                    .addFields(
                        { name: 'Channel', value: `${targetChannel}`, inline: true },
                        { name: 'Fields', value: `${embedData.fields.length}`, inline: true },
                        { name: 'Created By', value: `${originalInteraction.user}`, inline: true }
                    )
                    .setFooter(variables.getSlashCommandFooter(originalInteraction))
                    .setTimestamp()
                ],
                components: []
            });
        } catch (error) {
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setColor(variables.errorColor)
                    .setTitle(`${variables.emojis.error} Send Failed`)
                    .setDescription('Failed to send the embed. Please check permissions and try again.')
                    .setFooter(variables.getSlashCommandFooter(originalInteraction))
                    .setTimestamp()
                ],
                components: []
            });
        }
    },

    async handleAdvancedSettings(interaction, embedData, originalInteraction) {
        const selectedOption = interaction.values[0];

        switch (selectedOption) {
            case 'edit_media':
                await this.handleEditMedia(interaction, embedData, originalInteraction);
                break;
            case 'edit_styling':
                await this.handleEditStyling(interaction, embedData, originalInteraction);
                break;
            case 'edit_metadata':
                await this.handleEditMetadata(interaction, embedData, originalInteraction);
                break;
            case 'create_json':
                await this.handleCreateFromJson(interaction, embedData, originalInteraction);
                break;
        }
    },

    async handleEditMedia(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_media_modal')
            .setTitle('Edit Images & Media');

        const thumbnailInput = new TextInputBuilder()
            .setCustomId('edit_thumbnail')
            .setLabel('Thumbnail URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.thumbnail || '')
            .setRequired(false);

        const imageInput = new TextInputBuilder()
            .setCustomId('edit_image')
            .setLabel('Main Image URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.image || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(thumbnailInput),
            new ActionRowBuilder().addComponents(imageInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newThumbnail = modalSubmission.fields.getTextInputValue('edit_thumbnail');
            const newImage = modalSubmission.fields.getTextInputValue('edit_image');

            if (newThumbnail) embedData.thumbnail = newThumbnail;
            if (newImage) embedData.image = newImage;

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Media Updated`)
                        .setDescription('Your embed media has been updated successfully!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleEditMetadata(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_metadata_modal')
            .setTitle('Edit Author & Footer');

        const authorInput = new TextInputBuilder()
            .setCustomId('edit_author')
            .setLabel('Author Name')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.author || '')
            .setRequired(false);

        const authorIconInput = new TextInputBuilder()
            .setCustomId('edit_author_icon')
            .setLabel('Author Icon URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.authorIcon || '')
            .setRequired(false);

        const footerInput = new TextInputBuilder()
            .setCustomId('edit_footer')
            .setLabel('Footer Text')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.footer || '')
            .setRequired(false);

        const footerIconInput = new TextInputBuilder()
            .setCustomId('edit_footer_icon')
            .setLabel('Footer Icon URL')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.footerIcon || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(authorInput),
            new ActionRowBuilder().addComponents(authorIconInput),
            new ActionRowBuilder().addComponents(footerInput),
            new ActionRowBuilder().addComponents(footerIconInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            embedData.author = modalSubmission.fields.getTextInputValue('edit_author');
            embedData.authorIcon = modalSubmission.fields.getTextInputValue('edit_author_icon');
            embedData.footer = modalSubmission.fields.getTextInputValue('edit_footer');
            embedData.footerIcon = modalSubmission.fields.getTextInputValue('edit_footer_icon');

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Metadata Updated`)
                        .setDescription('Author and footer information has been updated!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            // Modal timeout or error
        }
    },

    async handleJsonPreview(interaction, embedData) {
        const embed = this.createEmbed(embedData);
        const jsonString = JSON.stringify(embed.toJSON(), null, 2);
        
        if (jsonString.length > 1900) {
            await interaction.reply({
                content: '```json\n' + jsonString.substring(0, 1900) + '\n... (truncated)\n```',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '```json\n' + jsonString + '\n```',
                ephemeral: true
            });
        }
    },

    async handleEditStyling(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_styling_modal')
            .setTitle('Edit Styling Options');

        const colorInput = new TextInputBuilder()
            .setCustomId('styling_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.color || '')
            .setRequired(false);

        const timestampInput = new TextInputBuilder()
            .setCustomId('styling_timestamp')
            .setLabel('Show Timestamp (true/false)')
            .setStyle(TextInputStyle.Short)
            .setValue(embedData.timestamp ? 'true' : 'false')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(timestampInput)
        );

        try {
            await interaction.showModal(modal);

            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const newColor = modalSubmission.fields.getTextInputValue('styling_color');
            const newTimestamp = modalSubmission.fields.getTextInputValue('styling_timestamp').toLowerCase() === 'true';

            if (newColor) {
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                if (hexRegex.test(newColor)) {
                    embedData.color = newColor;
                }
            }
            embedData.timestamp = newTimestamp;

            const updatedEmbed = this.createEmbed(embedData);
            const components = this.createComponents(embedData);

            await modalSubmission.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(variables.successColor)
                        .setTitle(`${variables.emojis.tick} Styling Updated`)
                        .setDescription('Embed styling has been updated successfully!')
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp(),
                    updatedEmbed
                ],
                components: components
            });
        } catch (error) {
            console.error('Error in handleEditStyling:', error);
        }
    },

    async handleCreateFromJson(interaction, embedData, originalInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('create_json_modal')
            .setTitle('Create Embed from JSON');

        const jsonInput = new TextInputBuilder()
            .setCustomId('embed_json')
            .setLabel('Embed JSON Data')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Paste your embed JSON here...')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(jsonInput)
        );

        await interaction.showModal(modal);

        try {
            const modalSubmission = await interaction.awaitModalSubmit({ time: 60000 });
            
            const jsonString = modalSubmission.fields.getTextInputValue('embed_json');
            
            try {
                const jsonData = JSON.parse(jsonString);
                
                // Update embedData with JSON values
                if (jsonData.title) embedData.title = jsonData.title;
                if (jsonData.description) embedData.description = jsonData.description;
                if (jsonData.color) embedData.color = jsonData.color;
                if (jsonData.thumbnail && jsonData.thumbnail.url) embedData.thumbnail = jsonData.thumbnail.url;
                if (jsonData.image && jsonData.image.url) embedData.image = jsonData.image.url;
                if (jsonData.footer) {
                    embedData.footer = jsonData.footer.text || embedData.footer;
                    embedData.footerIcon = jsonData.footer.icon_url || embedData.footerIcon;
                }
                if (jsonData.author) {
                    embedData.author = jsonData.author.name || embedData.author;
                    embedData.authorIcon = jsonData.author.icon_url || embedData.authorIcon;
                    embedData.authorUrl = jsonData.author.url || embedData.authorUrl;
                }
                if (jsonData.timestamp) embedData.timestamp = true;
                if (jsonData.fields && Array.isArray(jsonData.fields)) {
                    embedData.fields = jsonData.fields;
                }

                const updatedEmbed = this.createEmbed(embedData);
                const components = this.createComponents(embedData);

                await modalSubmission.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(variables.successColor)
                            .setTitle(`${variables.emojis.tick} Embed Created from JSON`)
                            .setDescription('Your embed has been successfully created from the provided JSON data!')
                            .setFooter(variables.getSlashCommandFooter(originalInteraction))
                            .setTimestamp(),
                        updatedEmbed
                    ],
                    components: components
                });
            } catch (jsonError) {
                await modalSubmission.update({
                    embeds: [new EmbedBuilder()
                        .setColor(variables.errorColor)
                        .setTitle(`${variables.emojis.error} Invalid JSON`)
                        .setDescription('The provided JSON is not valid. Please check your syntax and try again.')
                        .addFields(
                            { name: 'Error', value: jsonError.message, inline: false }
                        )
                        .setFooter(variables.getSlashCommandFooter(originalInteraction))
                        .setTimestamp()
                    ],
                    components: this.createComponents(embedData)
                });
            }
        } catch (error) {
            console.error('Error in handleCreateFromJson:', error);
        }
    },

    async handleResetEmbed(interaction, embedData, originalInteraction) {
        // Reset to default values
        embedData.title = 'Custom Embed';
        embedData.description = 'This is a custom embed created with the solvix embed creator.';
        embedData.color = variables.embedColor;
        embedData.thumbnail = null;
        embedData.image = null;
        embedData.footer = 'Created with Solvix Embed Creator';
        embedData.author = originalInteraction.user.username;
        embedData.timestamp = true;
        embedData.footerIcon = null;
        embedData.authorIcon = originalInteraction.user.displayAvatarURL();
        embedData.authorUrl = null;
        embedData.fields = [];

        const updatedEmbed = this.createEmbed(embedData);
        const components = this.createComponents(embedData);

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(variables.successColor)
                    .setTitle(`${variables.emojis.tick} Embed Reset`)
                    .setDescription('Your embed has been reset to default values.')
                    .setFooter(variables.getSlashCommandFooter(originalInteraction))
                    .setTimestamp(),
                updatedEmbed
            ],
            components: components
        });
    },

    async handleDuplicateEmbed(interaction, embedData) {
        const embed = this.createEmbed(embedData);
        const jsonString = JSON.stringify(embed.toJSON(), null, 2);
        
        const duplicateEmbed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle('📋 Embed Duplicated')
            .setDescription('Here\'s your embed JSON that you can use to recreate this embed:')
            .setFooter({ text: 'Copy this JSON to recreate the embed' })
            .setTimestamp();

        if (jsonString.length > 1900) {
            await interaction.reply({
                embeds: [duplicateEmbed],
                content: '```json\n' + jsonString.substring(0, 1900) + '\n... (truncated)\n```',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                embeds: [duplicateEmbed],
                content: '```json\n' + jsonString + '\n```',
                ephemeral: true
            });
        }
    },

    async handleHelpEmbed(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(variables.embedColor)
            .setTitle('🛠️ Solvix Embed Creator Help')
            .setDescription('Here\'s how to use the solvix embed creator:')
            .addFields(
                { name: '📝 Add Field', value: 'Add custom fields to your embed', inline: true },
                { name: '✏️ Edit Content', value: 'Modify title, description, and color', inline: true },
                { name: '📍 Change Channel', value: 'Select where to send the embed', inline: true },
                { name: '🖼️ Edit Images', value: 'Add thumbnail and main images', inline: true },
                { name: '🎨 Styling', value: 'Customize colors and appearance', inline: true },
                { name: '👤 Author & Footer', value: 'Set author info and footer details', inline: true },
                { name: '📝 Create from JSON', value: 'Create embed using raw JSON data', inline: true },
                { name: '🔍 JSON Preview', value: 'View the raw embed JSON', inline: true }
            )
            .setFooter({ text: 'Solvix Embed Creator | Use components to interact' })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }
};
