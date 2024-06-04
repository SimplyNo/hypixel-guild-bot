const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageActionRow, MessageSelectMenu, MessageButton } = require("discord.js");
const autorole = require("../../util/intervals/autorole");

module.exports = {
    name: "joinlogs",
    adminOnly: true,
    description: "Set bot to send guild join/leave logs.",
    aliases: ["leavelogs"],
    type: "config",
    usage: "<#Channel | \"reset\">",
    cooldown: 5,
    slash: new SlashCommandBuilder()
        .setName('joinlogs')
        .setDescription("Set bot to send guild join/leave logs.")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current JoinLogs config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('reset')
                .setDescription('Reset join logs channel.'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription('Set the channel to send join/leave logs to.')
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to send join/leave logs to.")
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
                let currentChannel = autoRole.joinLogs.channel || serverConf.joinLogs.channel || null;


                return {
                    embeds: [bot.createEmbed(replyInteraction)
                        .setAuthor(`Guild Join/Leave Logs`, interaction.guild.iconURL())
                        .setFancyGuild()
                        .setDescription(`
                    `)
                        .addField('» Join Logs', `\`Current Channel:\` ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}`)
                        // .addField('» Leave Logs', `\`Current Channel\`: ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}`)
                        .setFooter(`${interaction.prefix}joinlogs set <channel>`)],
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
                        i.followUp({ ephemeral: true, content: `🔄 You are now configuring AutoRole for **Guild ${currentlyViewingSlot + 1}: ${autoRole.guild ? autoRole.guildName : `No Guild Set`}**!\n\n*AutoRole/JoinLog commands that are ran will now apply to this guild.*` })
                    }
                })



        } else if (subcommand === "reset") {
            bot.config.joinLogs.delete(interaction.guild.id);
            await bot.config.autoRole.delete(interaction.guild.id);
            return interaction.reply(`**Success!** Join logs reset!`);
        } else if (subcommand === "set") {
            const channel = interaction.options.getChannel('channel');
            if (!channel) await bot.config.autoRole.setJoinLogs(interaction.guild.id, currentlyViewingSlot, { channel: null, lastMembers: null, lastUpdate: null });
            else await bot.config.autoRole.setJoinLogs(interaction.guild.id, currentlyViewingSlot, { channel: channel.id });
            autorole.interval(bot, interaction.guild)
            return interaction.reply(`**Success!** The bot will now send join/leave logs in ${channel ?? `\`No Channel\``}!`);
        }

    },
}