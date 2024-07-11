const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageActionRow, MessageSelectMenu, MessageButton } = require("discord.js");
const autorole = require("../../util/intervals/autorole");

module.exports = {
    name: "membercountchannel",
    adminOnly: true,
    description: "Set a channel which will show the amount of members in the guild.",
    aliases: ["leavelogs"],
    type: "config",
    usage: "<#Channel | \"reset\">",
    cooldown: 5,
    slash: new SlashCommandBuilder()
        .setName('membercountchannel')
        .setDescription("Set a channel which will display the member count of your guild in the channel's name.")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current member count channel config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('reset')
                .setDescription('Reset member count channel config.'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription('Set the channel which will be edited with the member count.')
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to set as the member count channel.")
                        .addChannelTypes(2)
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("format")
                        .setDescription("Use {member} to display the member count. Example: \"Members: {members}/125\"")
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
                let currentChannel = autoRole.memberCountChannel?.channelID || null;
                let currentFormat = autoRole.memberCountChannel?.format || null;
                let testChannelName = currentFormat ? currentFormat.replaceAll("{members}", Math.floor(Math.random() * 125)) : null;
                return {
                    embeds: [bot.createEmbed(replyInteraction)
                        .setAuthor(`Guild Member Count Channel`, interaction.guild.iconURL())
                        .setFancyGuild()
                        .setDescription(`
                        `)
                        .addField('» Guild Member Count Channel', `Current Channel: ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}\nCurrent Format: ${currentFormat ? `\`${currentFormat}\`.` : `**No Format Set!**`}` + (currentFormat ? `\n\nPreview: ${testChannelName ? `${testChannelName}` : `**No Format Set!**`}` : ``))
                        // .addField('» Leave Logs', `\`Current Channel\`: ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}`)
                        .setFooter(`${interaction.prefix}membercountchannel set <channel> <format>`)],
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
                        i.followUp({ ephemeral: true, content: `🔄 You are now configuring AutoRole for **Guild ${currentlyViewingSlot + 1}: ${autoRole.guild ? autoRole.guildName : `No Guild Set`}**!\n\n*Member count channel commands that are ran will now apply to this guild.*` })
                    }
                })



        } else if (subcommand === "reset") {
            await bot.config.autoROle.deleteMemberCountChannel(interaction.guild.id, currentlyViewingSlot);
            return interaction.reply(`**Success!** Member count channel reset!`);
        } else if (subcommand === "set") {
            const channel = interaction.options.getChannel('channel');
            const format = interaction.options.getString('format');
            await bot.config.autoRole.setMemberCountChannel(interaction.guild.id, currentlyViewingSlot, channel.id, format);
            autorole.interval(bot, interaction.guild)
            return interaction.reply(`**Success!** Member count channel set to ${channel}!`);
        }
    }
}