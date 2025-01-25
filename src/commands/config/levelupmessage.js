const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageActionRow, MessageSelectMenu, MessageButton } = require("discord.js");
const autorole = require("../../util/intervals/autorole");

module.exports = {
    name: "levelupmessage",
    adminOnly: true,
    description: "Set a message to send when the guild level ups!",
    type: "config",
    usage: "<#Channel | \"reset\">",
    cooldown: 5,
    slash: new SlashCommandBuilder()
        .setName('levelupmessage')
        .setDescription("Set a message to send when the guild levels up!")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View level up message config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('reset')
                .setDescription('Reset level up message config.'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription('Set the channel and message that will send when the guild levels up.')
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to send the message in.")
                        .addChannelTypes(0)
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription("Use {level} to display the new guild level. Example: \"Lucid is now **level {level}**!\"")
                        .setRequired(true))),
    async run(interaction, { serverConf }, bot) {
        let currentlyViewingSlot = serverConf.currentAutoRoleSlot;
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "view") {
            const getConfigEmbed = (replyInteraction) => {
                const autoRole = serverConf[`autoRole${currentlyViewingSlot === 0 ? '' : currentlyViewingSlot}`];
                if (!autoRole.guild) {
                    return {
                        embeds: [bot.createErrorEmbed(interaction).setDescription(`You need to set an **AutoRole Guild** for **Slot ${currentlyViewingSlot + 1}** in order to use this command!\n\n\`${interaction.prefix}autorole setguild [guild name]\``)
                        ]
                    }
                }
                let currentChannel = autoRole.levelUpMessage?.channelID || null;
                let currentMessage = autoRole.levelUpMessage?.message || null;
                let previewMessage = currentMessage ? currentMessage.replaceAll("{level}", Math.floor(Math.random() * 100)) : null;
                return {
                    embeds: [bot.createEmbed(replyInteraction)
                        .setAuthor(`Guild Level Up Message`, interaction.guild.iconURL())
                        .setFancyGuild()
                        .setDescription(`
                        `)
                        .addField('» Guild Level Up Message', `Current Channel: ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}\nCurrent Message: ${currentMessage ? `\`${currentMessage}\`.` : `**No Message Set!**`}`)
                        .addField('Preview', `${previewMessage ? `${previewMessage}` : `*No Message Set!*`}`)
                        .setFooter(`${interaction.prefix}levelupmessage set <channel> <message>`)],
                    components: [
                        new MessageActionRow()
                            .setComponents(
                                new MessageSelectMenu()
                                    .setCustomId('setslot')
                                    .addOptions([
                                        {
                                            label: `Guild 1 - ${serverConf.autoRole?.guildName ?? "No Guild Set!"}`,
                                            value: '0',
                                            description: 0 == serverConf.currentAutoRoleSlot ? 'Currently Configuring' : null,
                                            emoji: 0 == serverConf.currentAutoRoleSlot ? '✏' : null,
                                            default: currentlyViewingSlot == 0,
                                        },
                                        {
                                            label: `Guild 2 - ${serverConf.autoRole1?.guildName ?? "No Guild Set!"}`,
                                            value: '1',
                                            description: 1 == serverConf.currentAutoRoleSlot ? 'Currently Configuring' : null,
                                            emoji: 1 == serverConf.currentAutoRoleSlot ? '✏' : null,
                                            default: currentlyViewingSlot == 1,
                                        },
                                        {
                                            label: `Guild 3 - ${serverConf.autoRole2?.guildName ?? "No Guild Set!"}`,
                                            value: '2',
                                            description: 2 == serverConf.currentAutoRoleSlot ? 'Currently Configuring' : null,
                                            emoji: 2 == serverConf.currentAutoRoleSlot ? '✏' : null,
                                            default: currentlyViewingSlot == 2,
                                        }
                                    ])),
                        new MessageActionRow()
                            .setComponents(
                                new MessageButton()
                                    .setCustomId('select')
                                    .setLabel(currentlyViewingSlot == serverConf.currentAutoRoleSlot ? `You Are Currently Configuring This Guild!` : `Click To Configure This Guild`)
                                    .setStyle(currentlyViewingSlot == serverConf.currentAutoRoleSlot ? 'SUCCESS' : 'PRIMARY')
                                    .setDisabled(currentlyViewingSlot == serverConf.currentAutoRoleSlot ? true : false)
                            )

                    ],
                }
            }
            const msg = await interaction.reply({
                ...getConfigEmbed(interaction),
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({ idle: 600000, filter: (i) => i.user.id === interaction.user.id });
            collector.on('end', async (_, reason) => {
                // i want to delete the buttons when it ends but nothing ive tried works 😭    
            })
            collector.on('collect',
                async (i) => {
                    if (i.isSelectMenu()) {
                        const slot = i.values[0];
                        console.log(slot)
                        currentlyViewingSlot = parseInt(slot);
                        // await i.deferUpdate();
                        await i.update(await getConfigEmbed(i));

                    } else if (i.isButton()) {
                        serverConf.currentAutoRoleSlot = currentlyViewingSlot;
                        await bot.config.autoRole.setCurrentSlot(interaction.guild.id, currentlyViewingSlot);
                        let autoRole = serverConf[`autoRole${currentlyViewingSlot === 0 ? '' : currentlyViewingSlot}`];
                        await i.update(await getConfigEmbed(i));
                        i.followUp({ ephemeral: true, content: `🔄 You are now configuring AutoRole for **Guild ${currentlyViewingSlot + 1}: ${autoRole.guild ? autoRole.guildName : `No Guild Set`}**!\n\n*Level up message commands that are ran will now apply to this guild.*` })
                    }
                })



        } else if (subcommand === "reset") {
            await bot.config.autoRole.deleteLevelUpMessage(interaction.guild.id, currentlyViewingSlot);
            return interaction.reply(`**Success!** Level up message reset!`);
        } else if (subcommand === "set") {
            const channel = interaction.options.getChannel('channel');
            const message = interaction.options.getString('message');
            await bot.config.autoRole.setLevelUpMessage(interaction.guild.id, currentlyViewingSlot, channel.id, message);
            autorole.interval(bot, interaction.guild)
            return interaction.reply(`**Success!** Level up message set to ${channel}!`);
        }
    }
}