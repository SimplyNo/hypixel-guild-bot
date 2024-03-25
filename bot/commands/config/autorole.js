const { Message, CommandInteraction, Client, Constants, MessageActionRow, MessageButton, SelectMenuInteraction, MessageSelectMenu, ButtonInteraction } = require("discord.js")
const autoRoleInterval = require("../../util/intervals/autorole.js")
var assert = require("assert");
const { SlashCommandBuilder } = require("@discordjs/builders");

function deepEqual(a, b) {
    try {
        assert.deepStrictEqual(a, b);
    } catch (error) {
        if (error.name === "AssertionError") {
            return false;
        }
        throw error;
    }
    return true;
};

module.exports = {
    name: "autorole",
    aliases: ['ar'],
    permissions: ["MANAGE_ROLES"],
    cooldown: 3,
    description: "Syncronizes ingame guild ranks with Discord roles.",
    usage: 'info',
    example: "add Guild Leader\nremove 0\nset 0 @Guild Leader",
    type: 'config',
    adminOnly: true,
    slash: new SlashCommandBuilder()
        .setName("autorole")
        .setDescription("Syncronizes ingame guild ranks with Discord roles.")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current AutoRole config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName("info")
                .setDescription("See autorole info."))
        .addSubcommand(subcmd =>
            subcmd
                .setName("setguild")
                .setDescription("Set server guild")
                .addStringOption(option =>
                    option
                        .setName("guild")
                        .setDescription("Guild name")
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("logchannel")
                .setDescription("Set what channel the bot should log actions")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to log to")
                        .addChannelTypes(Constants.ChannelTypes.GUILD_TEXT)
                        .setRequired(false)))

        .addSubcommand(subcmd =>
            subcmd
                .setName("setrole")
                .setDescription("Set guild rank role")
                .addIntegerOption(option =>
                    option
                        .setName('pos')
                        .setDescription("Guild rank position")
                        .setAutocomplete(true)
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription("Guild role")
                        .setRequired(false)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("memberrole")
                .setDescription("Set default role for guild members.")
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription("Guild member role")
                        .setRequired(false)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("guestrole")
                .setDescription("Set guest role to be given to verified, non-members of the guild.")
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription("Guest role")
                        .setRequired(false)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("reset")
                .setDescription("Reset AutoRole config")),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} context 
     * @param {Client} bot 
     */
    async run(interaction, { serverConf }, bot) {
        const subcommand = interaction.options.getSubcommand();
        let currentlyViewingSlot = serverConf.currentAutoRoleSlot;
        let currentAutoRole = serverConf[`autoRole${currentlyViewingSlot === 0 ? '' : currentlyViewingSlot}`];
        if (subcommand === "view") {
            await interaction.deferReply();
            /**
             * @type {Message}
             */
            const msg = await sendConfigEmbed();

        } else if (subcommand === "info") {
            bot.createEmbed(interaction)
                .setTitle("Auto Role Info")
                .setAuthor(interaction.guild.name, interaction.guild.iconURL())
                .setDescription(`
_Auto Role automatically syncs in-game Guild Ranks with their Discord Role counterparts._ Below you can find a list of all available auto role arguments and what they do:

• </autorole info:${interaction.commandId}> - \`Shows this command.\`
• </autorole logchannel:${interaction.commandId}> - \`Set what channel the bot should log actions.\`            
• </autorole reset:${interaction.commandId}> - \`Resets everything.\`
• </autorole setrole:${interaction.commandId}> - \`Set guild rank role.\`
• </autorole setguild:${interaction.commandId}> - \`Set server guild.\`
• </autorole memberrole:${interaction.commandId}> - \`Set default role for guild members.\`
• </autorole guestrole:${interaction.commandId}> - \`Set guest role to be given to verified, non-members of the guild.\`
`)
                .send()
        } else if (subcommand === 'logchannel') {
            let oldChannel = serverConf.autoRole.logChannel;
            const channel = interaction.options.getChannel('channel');
            currentAutoRole.logChannel = channel.id;
            bot.config.autoRole.setLogChannel(interaction.guild.id, serverConf.currentAutoRoleSlot, channel?.id)
            await bot.createEmbed(interaction)
                // .setAuthor(interaction.guild.name, interaction.guild.iconURL())
                .setTitle("Success!")
                .setDescription(`The bot will now log actions in ${channel}.`)
                .addField('\u200b', `${oldChannel ? "<#" + oldChannel + ">" : "\`No log channel\`"} → _**${channel ?? '`No log channel`'}**_`)
                .send(interaction)
            await sendConfigEmbed(true);
        } else if (subcommand === "setguild") {

            let guild = interaction.options.getString('guild', true);
            let oldGuild = currentAutoRole.guild ? await bot.wrappers.hypixelGuild.get(currentAutoRole.guild, 'id') : { exists: false };

            if (oldGuild.name && guild == oldGuild.name.toLowerCase()) return bot.createErrorEmbed().setDescription(`The server is already linked to **${oldGuild.name}**!`).send(interaction);
            let guildData = await bot.wrappers.hypixelGuild.get(guild, 'name');

            if (guildData.exists == false) {
                return bot.createErrorEmbed().setDescription(`The guild **${guild}** does not seem to exist... :thinking:`).send(interaction)
            }
            if (oldGuild.name) {
                bot.createErrorEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL).setTitle(":warning: Confirmation :warning:").setDescription(`Are you sure you want to change this server's guild from **${oldGuild.name}** to **${guildData.name}${guildData.tag ? ` [${guildData.tag}]` : ''}**? This action will RESET all role configurations and can NOT be undone! \n\nReact ☑️ to this interaction to proceed!`)
                    .setThumbnail(`https://hypixel.net/data/guild_banners/100x200/${guildData._id}.png`)
                    .sendAsConfirmation().then(async collector => {

                        collector.on("confirm", (button) => {
                            confirmSetGuild(button);
                        })
                        collector.on("cancel", (button) => {
                            button.reply("Action has been canceled!");
                        })

                    })
            } else {
                confirmSetGuild(interaction);
            }
            async function confirmSetGuild(button) {
                currentAutoRole.guild = guildData._id;
                currentAutoRole.guildName = guildData.name;
                await bot.config.autoRole.setGuild(interaction.guild.id, serverConf.currentAutoRoleSlot, guildData._id);
                await bot.config.autoRole.setGuildName(interaction.guild.id, serverConf.currentAutoRoleSlot, guildData.name);
                await bot.config.autoRole.assignGroup(interaction.guild.id, serverConf.currentAutoRoleSlot);
                console.log(`NEW CONFIG:`, await bot.config.getConfigAsObject(interaction.guildId), `SLOT:`, serverConf.currentAutoRoleSlot)

                await button.reply({
                    embeds: [bot.createEmbed().setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle("Success!").setDescription(`**${interaction.guild.name}**'s linked guild has been changed to **${guildData.name}**. Start configuring roles by using \`${serverConf.prefix}autorole setrole\`!`).addField('\u200b', `\`${oldGuild.name || "No set guild"}\` → _**${guildData.name}**_`)
                        .setThumbnail(`https://hypixel.net/data/guild_banners/100x200/${guildData._id}.png`)
                    ],
                    fetchReply: true
                })
                await sendConfigEmbed(true)
            }

        } else if (subcommand === "setrole") {
            if (!currentAutoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`/autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(interaction);
            const Pos = interaction.options.getInteger('pos', true);
            const role = interaction.options.getRole('role');
            let roleConfig = Object.entries((currentAutoRole.config));
            const pos = parseInt(Pos) > roleConfig.length ? roleConfig.length || 1 : parseInt(Pos) < 1 ? 1 : parseInt(Pos);

            // let role = args.slice(2, args.length).join(' ');

            // if (isNaN(args[1]) || !pos || !role) return bot.createErrorEmbed().setDescription(`Incorrect usage. \n\nExample Usage: \`${message.serverConf.prefix}autorole setrole 1 @Owner\``).send(message);
            // let roleObj = await bot.parseRole(role, message.guild)
            // if (!roleObj && args[2].toLowerCase() !== "none") return bot.createErrorEmbed().setDescription(`The role "\`${role}\`" could not be found! Please input a valid \`role name\`, a \`role ID\`, a \`role mention\` or \`'none'\`.`).send(message)
            let rankid = roleConfig.find(Role => Role[1].pos == pos) ? roleConfig.find(Role => Role[1].pos == pos)[0] : null;
            if (!rankid) return bot.createErrorEmbed().setDescription("Something went wrong whilst trying to find that rank. Please try again or report this to a developer.").send(interaction);

            if (role && interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to **${currentAutoRole.config[rankid].name}** because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && !interaction.guild.ownerID == interaction.user.id && interaction.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to **${currentAutoRole.config[rankid].name}** because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }
            let oldrole = currentAutoRole.config[rankid].role;
            if (!role) {
                delete currentAutoRole.config[rankid].role
            } else {
                currentAutoRole.config[rankid].role = role.id;
            }

            await bot.config.autoRole.setAutoRoleConfig(interaction.guild.id, serverConf.currentAutoRoleSlot, currentAutoRole.config);
            await bot.createEmbed(interaction)
                .setTitle("Success!")
                .setDescription(role ? `Verified members with the rank **${currentAutoRole.config[rankid].name}** will now receive the role ${role.toString()}!` : `Reset the role of **${currentAutoRole.config[rankid].name}**!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${currentAutoRole.guild}.png`)
                .addField('\u200b', `${oldrole ? "<@&" + oldrole + ">" : "`No Role Set`"} → _**${role ? role.toString() : "`No Role Set`"}**_`)
                .send(interaction)
            await sendConfigEmbed(true)
        } else if (subcommand === "memberrole") {
            if (!currentAutoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`/autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(interaction);
            const role = interaction.options.getRole('role');

            if (role && interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to the guild member role because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && !interaction.guild.ownerID == interaction.user.id && interaction.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to the guild member role because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }
            let oldrole = currentAutoRole.memberRole;
            if (!role) {
                delete currentAutoRole.memberRole;
            } else {
                currentAutoRole.memberRole = role.id;
            }

            await bot.config.autoRole.setMemberRole(interaction.guild.id, serverConf.currentAutoRoleSlot, currentAutoRole.memberRole);
            await bot.createEmbed(interaction)
                .setTitle("Success!")
                .setDescription(role ? `Verified guild members will now receive the role ${role.toString()}.` : `Reset the default guild member role!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${currentAutoRole.guild}.png`)
                .addField('\u200b', `${oldrole ? "<@&" + oldrole + ">" : "`No Role Set`"} → _**${role ? role.toString() : "`No Role Set`"}**_`)
                .send()
            await sendConfigEmbed(true)

        } else if (subcommand === "guestrole") {
            if (!currentAutoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`/autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(interaction);
            const role = interaction.options.getRole('role');

            if (role && interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to guest role because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && !interaction.guild.ownerID == interaction.user.id && interaction.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to guest role because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }
            let oldrole = currentAutoRole.guestRole;
            if (!role) {
                delete currentAutoRole.guestRole;
            } else {
                currentAutoRole.guestRole = role.id;
            }

            await bot.config.autoRole.setGuestRole(interaction.guild.id, serverConf.currentAutoRoleSlot, currentAutoRole.guestRole);
            await bot.createEmbed(interaction)
                .setTitle("Success!")
                .setDescription(role ? `Discord members who are either not verified or not in the guild will now receive the role ${role.toString()}.` : `Reset the guest role!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${currentAutoRole.guild}.png`)
                .addField('\u200b', `${oldrole ? "<@&" + oldrole + ">" : "`No Role Set`"} → _**${role ? role.toString() : "`No Role Set`"}**_`)
                .send()
            await sendConfigEmbed(true)

        } else if (subcommand === "reset") {
            let oldGuild = currentAutoRole.guild;
            if (oldGuild) {

                let col = await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL).setTitle(":warning: Confirmation :warning:").setDescription(`Are you sure you want to reset ALL AutoRole configuration for **Slot ${serverConf.currentAutoRoleSlot}: ${currentAutoRole.guildName}**? This action and can NOT be undone! \n\nReact ☑️ to this interaction to proceed!`)
                    .sendAsConfirmation();

                col.on('confirm', async (button) => {
                    bot.config.autoRole.delete(interaction.guild.id, serverConf.currentAutoRoleSlot).then(() => {
                        bot.createEmbed(button).setTitle("Success").setDescription("Auto role configuration reset!").send();
                    })
                })

                col.on('cancel', async (button) => {
                    button.reply("Action has been canceled!");

                })

            } else {
                interaction.reply("you have nothing to reset!")
            }

        }
        async function getConfigEmbed(ephemeral = false, replyInteraction = interaction) {
            const serverConfig = await bot.config.getConfigAsObject(replyInteraction.guild.id);
            let autoRole = serverConfig[`autoRole${currentlyViewingSlot === 0 ? '' : currentlyViewingSlot}`];
            // update guild (see if new ranks added, removed, if guild name changed, if guild doesnt exist anymore, etc)
            let guildData = autoRole.guild ? await bot.wrappers.hypixelGuild.get(autoRole.guild, 'id') : null;
            if (guildData && guildData.outage) {
                return bot.createAPIErrorEmbed(replyInteraction).send()
            }
            let guildConfig = JSON.parse(JSON.stringify(autoRole.config));

            let Embed = bot.createEmbed(replyInteraction)
                .setAuthor(replyInteraction.guild.name, replyInteraction.guild.iconURL())
                .setTitle(`Auto Role Config - Slot ${currentlyViewingSlot + 1}`)
                .setDescription(`Use **${serverConf.prefix}autorole info** for a list of valid subcommands.
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Server Guild: **${guildData ? guildData.name : "No Guild Set!"}**
Log Channel: **${replyInteraction.guild.channels.cache.get(autoRole.logChannel) || "No Log Channel Set!"}**
Default Guild Member Role: **${autoRole.memberRole ? '<@&' + autoRole.memberRole + '>' : "No Role Set"}**
Guest Role: **${autoRole.guestRole ? '<@&' + autoRole.guestRole + '>' : "No Role Set"}**
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${guildData ? guildData._id : null}.png`);
            if (guildData && guildData.exists == false) {
                return bot.createErrorEmbed().setDescription("This guild no longer exists and has been deleted from the database. If you believe this is an error please contact a developer.").send(replyInteraction)
            } else if (guildData) {
                let ranks = guildData.ranks ? guildData.ranks.sort((a, b) => b.priority - a.priority) : [];
                // console.log(ranks)
                ranks.forEach((rank, i) => {
                    if (!guildConfig[rank.created]) {
                        guildConfig[rank.created] = {
                            name: rank.name,
                            tag: rank.tag,
                            pos: Object.entries(guildConfig).length + 1,
                        }
                    } else {
                        guildConfig[rank.created].name = rank.name;
                        guildConfig[rank.created].tag = rank.tag;
                    }
                })

                // Check for removed ranks
                Object.entries(guildConfig).forEach((rank, i) => {
                    if (!ranks.reduce((prev, current) => [...prev, current.created], []).includes(parseInt(rank[0]))) {
                        delete guildConfig[rank[0]]
                    }
                })
                let str = ""
                Object.entries(guildConfig).sort((a, b) => a[1].pos - b[1].pos).forEach((rank, i) => {
                    guildConfig[rank[0]].pos = i + 1;
                    let Pos = i + 1;
                    let Rank = rank[1].name;
                    let Tag = rank[1].tag;
                    let Role = replyInteraction.guild.roles.cache.get(rank[1].role) || null;
                    let Pin = rank[1].pinned;
                    if (!Role) guildConfig[rank[0]].role = null;
                    str += `\`${Pos}\` **${Rank}** ${Tag ? `[${Tag}]` : ""} - ${Pin ? ":pushpin: " : ""}${Role || "`No Role Set`"}\n`
                })
                if (!str.length) str = "This guild has no ranks! Set them up by doing `/g ranks` on Hypixel!"
                if (!deepEqual(guildConfig, autoRole.config)) {
                    await bot.config.autoRole.setAutoRoleConfig(replyInteraction.guild.id, serverConf.currentAutoRoleSlot, guildConfig);
                }
                Embed.addField("Pos. | Rank Name | Role", str)
                // Embed.setDescription(Embed.description + "\n\n" + str)
                autoRoleInterval.interval(bot, replyInteraction.guild, guildData)
            } else {
                Embed.addField("No Server Guild Set!", `Use \`${serverConf.prefix}autorole setguild <GUILD NAME>\` to begin syncronizing roles.`)
            }
            return {
                embeds: [Embed],
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
                ephemeral: ephemeral
            };
        }
        async function sendConfigEmbed(ephemeral = false, replyInteraction = interaction) {
            /**
             * @type {Message}
             */
            const msg = await replyInteraction.followUp({ ...(await getConfigEmbed(ephemeral, replyInteraction)) });
            const collector = msg.createMessageComponentCollector({ idle: 600000, filter: (i) => i.user.id === interaction.user.id });
            collector.on('end', async (_, reason) => {
                // i want to delete the buttons when it ends but nothing ive tried works 😭    
            })
            collector.on('collect',
                async (i) => {
                    if (i.isSelectMenu()) {
                        const slot = i.values[0];
                        currentlyViewingSlot = parseInt(slot);
                        // await i.deferUpdate();
                        await i.update(await getConfigEmbed(ephemeral, replyInteraction));

                    } else if (i.isButton()) {
                        serverConf.currentAutoRoleSlot = currentlyViewingSlot;
                        await bot.config.autoRole.setCurrentSlot(interaction.guild.id, currentlyViewingSlot);
                        let autoRole = serverConf[`autoRole${currentlyViewingSlot === 0 ? '' : currentlyViewingSlot}`];
                        await i.update(await getConfigEmbed(ephemeral, replyInteraction));
                        i.followUp({ ephemeral: true, content: `🔄 You are now configuring AutoRole for **Guild ${currentlyViewingSlot + 1}: ${autoRole.guild ? autoRole.guildName : `No Guild Set`}**!\n\n*AutoRole commands that are ran will now apply to this guild.*` })
                    }
                })

        }
    },
    /**
* 
* @param {Message} message
* @param {*} args 
* @param {*} bot 
*/
    async execute(message, args, bot) {
        let sendConfigEmbed = async () => {
            // update guild (see if new ranks added, removed, if guild name changed, if guild doesnt exist anymore, etc)
            let guildData = message.serverConf.autoRole.guild ? await bot.wrappers.hypixelGuild.get(message.serverConf.autoRole.guild, 'id') : null;
            if (guildData && guildData.outage) {
                return bot.createAPIErrorEmbed(message).send()
            }
            let guildConfig = JSON.parse(JSON.stringify(message.serverConf.autoRole.config));

            let Embed = bot.createEmbed(message)
                .setAuthor(message.guild.name, message.guild.iconURL())
                .setTitle("Current Auto Role Config")
                .setDescription(`Use **${message.serverConf.prefix}autorole info** for a list of valid subcommands.
━━━━━━━━━━━━━━━━━━━━━━
Server Guild: **${guildData ? guildData.name : "No Guild Set!"}**
Log Channel: **${message.guild.channels.cache.get(message.serverConf.autoRole.logChannel) || "No Log Channel Set!"}**
Default Guild Member Role: **${message.serverConf.autoRole.memberRole ? '<@&' + message.serverConf.autoRole.memberRole + '>' : "No Role Set"}**
Guest Role: **${message.serverConf.autoRole.guestRole ? '<@&' + message.serverConf.autoRole.guestRole + '>' : "No Role Set"}**
━━━━━━━━━━━━━━━━━━━━━━`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${guildData ? guildData._id : null}.png`);
            if (guildData && guildData.exists == false) {
                return bot.createErrorEmbed().setDescription("This guild no longer exists and has been deleted from the database. If you believe this is an error please contact a developer.").send(message)
            } else if (guildData) {
                let ranks = guildData.ranks ? guildData.ranks.sort((a, b) => b.priority - a.priority) : [];
                // console.log(ranks)
                ranks.forEach((rank, i) => {
                    if (!guildConfig[rank.created]) {
                        guildConfig[rank.created] = {
                            name: rank.name,
                            tag: rank.tag,
                            pos: Object.entries(guildConfig).length + 1,
                        }
                    } else {
                        guildConfig[rank.created].name = rank.name;
                        guildConfig[rank.created].tag = rank.tag;
                    }
                })

                // Check for removed ranks
                Object.entries(guildConfig).forEach((rank, i) => {
                    if (!ranks.reduce((prev, current) => [...prev, current.created], []).includes(parseInt(rank[0]))) {
                        delete guildConfig[rank[0]]
                    }
                })


                let str = ""
                Object.entries(guildConfig).sort((a, b) => a[1].pos - b[1].pos).forEach((rank, i) => {
                    guildConfig[rank[0]].pos = i + 1;
                    let Pos = i + 1;
                    let Rank = rank[1].name;
                    let Tag = rank[1].tag;
                    let Role = message.guild.roles.cache.get(rank[1].role) || null;
                    let Pin = rank[1].pinned;
                    if (!Role) guildConfig[rank[0]].role = null;
                    str += `\`${Pos}\` **${Rank}** ${Tag ? `[${Tag}]` : ""} - ${Pin ? ":pushpin: " : ""}${Role || "`No Role Set`"}\n`
                })
                if (!str.length) str = "This guild has no ranks! Set them up by doing `/g ranks` on Hypixel!"
                if (!deepEqual(guildConfig, message.serverConf.autoRole.config)) {
                    await bot.config.autoRole.setAutoRoleConfig(message.guild.id, serverConf.currentAutoRoleSlot, guildConfig);
                }
                Embed.addField("Pos. | Rank Name | Role", str)
                // Embed.setDescription(Embed.description + "\n\n" + str)
                autoRoleInterval.interval(bot, message.guild, guildData)
            } else {
                Embed.addField("No Server Guild Set!", `Use \`${message.serverConf.prefix}autorole setguild <GUILD NAME>\` to begin syncronizing roles.`)
            }
            Embed.send(message)
        }
        if (!args.length) {
            sendConfigEmbed()
        } else if (["help", "info"].includes(args[0].toLowerCase())) {
            bot.createEmbed(message)
                .setTitle("Auto Role Info")
                .setAuthor(message.guild.name, message.guild.iconURL())
                .setDescription(`
_Auto Role automatically syncs in-game Guild Ranks with their Discord Role counterparts._ Below you can find a list of all available auto role arguments and what they do:

• \`${message.prefix}autorole info\` - Shows this command.
• \`${message.prefix}autorole logchannel [#Channel | "none"]\` - Set what channel the bot should log actions.            
• \`${message.prefix}autorole pin [pos]\` - Set persistant role.
• \`${message.prefix}autorole reset\` - Resets everything.
• \`${message.prefix}autorole setrole [pos] [@Role | Role Name | "none"]\` - Set guild rank role.
• \`${message.prefix}autorole setguild [Guild Name]\` - Set server guild.
• \`${message.prefix}autorole setmemberrole [@Role | Role Name | "none"]\` - Set default role for guild members.
• \`${message.prefix}autorole setguestrole [@Role | Role Name | "none"]\` - Set guest role to be given to verified, non-members of the guild.
• \`${message.prefix}autorole swap [pos1] [pos2]\` - Swaps the position of 2 ranks.
• \`${message.prefix}autorole unpin [pos]\` - Set unpersistant role.
`)
                .send()
        } else if (["setmemberrole", "memberrole", "defaultrole", "member", "default", "memrole", "setdefaultmemberrole", "setmemrole", "setdefaultmemrole"].includes(args[0].toLowerCase())) {
            if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`${message.serverConf.prefix}autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(message);
            let roleConfig = Object.entries((message.serverConf.autoRole.config));

            let role = args[1];

            if (!role) return bot.createErrorEmbed().setDescription(`Incorrect usage. \n\nExample Usage: \`${message.serverConf.prefix}autorole setmemberrole @Guild Member\``).send(message);
            let roleObj = await bot.parseRole(role, message.guild);
            if ((!args[1] || !roleObj) && args[1].toLowerCase() !== "none") return bot.createErrorEmbed().setDescription(`The role "\`${role}\`" could not be found! Please input a valid \`role name\`, a \`role ID\`, a \`role mention\` or \`'none'\`.`).send(message)

            if (roleObj && message.member.guild.me.roles.highest.comparePositionTo(roleObj) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${roleObj} to the guild member role because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${roleObj}, or give me a role that is already higher.`)
                    .send()
            }
            if (roleObj && !message.guild.ownerID == message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${roleObj} to the guild member role because it is higher than your highest role.\n\nTo fix this either move **your role** above ${roleObj}, or move the role under you.`)
                    .send()
            }
            let oldrole = message.serverConf.autoRole.memberRole;
            if (role.toLowerCase() == "none") {
                delete message.serverConf.autoRole.memberRole;
            } else {
                message.serverConf.autoRole.memberRole = roleObj.id;
            }

            await bot.config.autoRole.setMemberRole(message.guild.id, message.serverConf.autoRole.memberRole);
            bot.createEmbed(message)
                .setTitle("Success!")
                .setDescription(roleObj ? `Verified guild members will now receive the role ${roleObj.toString()}.` : `Reset the default guild member role!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${message.serverConf.autoRole.guild}.png`)
                .addField('\u200b', `${oldrole ? "<@&" + oldrole + ">" : "`No Role Set`"} → _**${roleObj ? roleObj.toString() : "`No Role Set`"}**_`)
                .send()


        } else if (["setguestrole", "guestrole", "gr"].includes(args[0].toLowerCase())) {
            if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`${message.serverConf.prefix}autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(message);
            let roleConfig = Object.entries((message.serverConf.autoRole.config));

            let role = args[1];

            if (!role) return bot.createErrorEmbed().setDescription(`Incorrect usage. \n\nExample Usage: \`${message.serverConf.prefix}autorole guestrole @Guest Role\``).send(message);
            let roleObj = await bot.parseRole(role, message.guild);
            if ((!args[1] || !roleObj) && args[1].toLowerCase() !== "none") return bot.createErrorEmbed().setDescription(`The role "\`${role}\`" could not be found! Please input a valid \`role name\`, a \`role ID\`, a \`role mention\` or \`'none'\`.`).send(message)

            if (roleObj && message.member.guild.me.roles.highest.comparePositionTo(roleObj) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${roleObj} to the guest role because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${roleObj}, or give me a role that is already higher.`)
                    .send()
            }
            if (roleObj && !message.guild.ownerID == message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${roleObj} to the guest role because it is higher than your highest role.\n\nTo fix this either move **your role** above ${roleObj}, or move the role under you.`)
                    .send()
            }
            let oldrole = message.serverConf.autoRole.guestRole;
            if (role.toLowerCase() == "none") {
                delete message.serverConf.autoRole.guestRole;
            } else {
                message.serverConf.autoRole.guestRole = roleObj.id;
            }

            await bot.config.autoRole.setGuestRole(message.guild.id, message.serverConf.autoRole.guestRole);
            bot.createEmbed(message)
                .setTitle("Success!")
                .setDescription(roleObj ? `Discord members who are either not verified or not in the guild will now receive the role ${roleObj.toString()}.` : `Reset the guest role!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${message.serverConf.autoRole.guild}.png`)
                .addField('\u200b', `${oldrole ? "<@&" + oldrole + ">" : "`No Role Set`"} → _**${roleObj ? roleObj.toString() : "`No Role Set`"}**_`)
                .send()

        }
        else if (["pin", "persistant", "sticky"].includes(args[0].toLowerCase())) {
            if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`${message.serverConf.prefix}autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(message);

            if (isNaN(args[1]) || !args[1]) return bot.createErrorEmbed().setDescription(`You did not specify a position to make persistant!\n\nExample Usage: \`${message.serverConf.prefix}autorole pin 5\``).send(message);

            let roleConfig = Object.entries(message.serverConf.autoRole.config);
            let pos = args[1] > roleConfig.length ? roleConfig.length || 1 : args[1] < 1 ? 1 : args[1];

            let rankid = roleConfig.find(Role => Role[1].pos == pos) ? roleConfig.find(Role => Role[1].pos == pos)[0] : null;
            if (!rankid) return bot.createErrorEmbed().setDescription("Something went wrong whilst trying to find that rank. Please try again or report this to a developer.").send(message);
            if (!message.serverConf.autoRole.config[rankid].role) return bot.createErrorEmbed().setDescription(`**${message.serverConf.autoRole.config[rankid].name}** needs to have an assigned role to make it persistant. Use **${message.serverConf.prefix}autorole setrole** to assign a role.`).send(message);
            let oldPin = message.serverConf.autoRole.config[rankid].pinned;

            message.serverConf.autoRole.config[rankid].pinned = true;
            await bot.config.autoRole.setAutoRoleConfig(message.guild.id, serverConf.currentAutoRoleSlot, message.serverConf.autoRole.config);
            bot.createEmbed(message)
                .setTitle("Success!")
                .setDescription(`**<@&${message.serverConf.autoRole.config[rankid].role}> (${message.serverConf.autoRole.config[rankid].name})** is now a persistant role!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${message.serverConf.autoRole.guild}.png`)
                .addField('\u200b', `${oldPin ? `:pushpin: <@&${message.serverConf.autoRole.config[rankid].role}>` : `<@&${message.serverConf.autoRole.config[rankid].role}>`} → _**:pushpin: <@&${message.serverConf.autoRole.config[rankid].role}>**_`)
                .send()

        } else if (["unpin", "unsticky"].includes(args[0].toLowerCase())) {
            if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed(message).setDescription(`You must have a server guild set to do this!\n\nUse \`${message.serverConf.prefix}autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(message);

            if (isNaN(args[1] || !args[1])) return bot.createErrorEmbed(message).setDescription(`You did not specify a position to make unpersistant!\n\nExample Usage: \`${mesage.serverConf.prefix}autorole unpin 7\``).send(message);

            let roleConfig = Object.entries(message.serverConf.autoRole.config);
            let pos = args[1] > roleConfig.length ? roleConfig.length || 1 : args[1] < 1 ? 1 : args[1];

            let rankid = roleConfig.find(Role => Role[1].pos == pos) ? roleConfig.find(Role => Role[1].pos == pos)[0] : null;
            if (!rankid) return bot.createErrorEmbed().setDescription("Something went wrong whilst trying to find that rank. Please try again or report this to a developer.").send(message);
            if (!message.serverConf.autoRole.config[rankid].role) return bot.createErrorEmbed().setDescription(`**${message.serverConf.autoRole.config[rankid].name}** needs to have an assigned role to make it unpersistant. Use **${message.serverConf.prefix}autorole setrole** to assign a role.`).send(message);
            let oldPin = message.serverConf.autoRole.config[rankid].pinned;

            delete message.serverConf.autoRole.config[rankid].pinned;
            await bot.config.autoRole.setAutoRoleConfig(message.guild.id, serverConf.currentAutoRoleSlot, message.serverConf.autoRole.config);
            bot.createEmbed(message)
                .setTitle("Success!")
                .setDescription(`**<@&${message.serverConf.autoRole.config[rankid].role}> (${message.serverConf.autoRole.config[rankid].name})** is no longer a persistant role!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${message.serverConf.autoRole.guild}.png`)
                .addField('\u200b', `${oldPin ? `:pushpin: <@&${message.serverConf.autoRole.config[rankid].role}>` : `<@&${message.serverConf.autoRole.config[rankid].role}>`} → _**<@&${message.serverConf.autoRole.config[rankid].role}>**_`)
                .send(message)

        } else if (["setrole", "role", "sr"].includes(args[0].toLowerCase())) {
            if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`${message.serverConf.prefix}autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(message);
            let roleConfig = Object.entries((message.serverConf.autoRole.config));

            let pos = parseInt(args[1]) > roleConfig.length ? roleConfig.length || 1 : parseInt(args[1]) < 1 ? 1 : parseInt(args[1]);
            let role = args.slice(2, args.length).join(' ');

            if (isNaN(args[1]) || !pos || !role) return bot.createErrorEmbed().setDescription(`Incorrect usage. \n\nExample Usage: \`${message.serverConf.prefix}autorole setrole 1 @Owner\``).send(message);
            let roleObj = await bot.parseRole(role, message.guild)
            if (!roleObj && args[2].toLowerCase() !== "none") return bot.createErrorEmbed().setDescription(`The role "\`${role}\`" could not be found! Please input a valid \`role name\`, a \`role ID\`, a \`role mention\` or \`'none'\`.`).send(message)
            let rankid = roleConfig.find(Role => Role[1].pos == pos) ? roleConfig.find(Role => Role[1].pos == pos)[0] : null;
            if (!rankid) return bot.createErrorEmbed().setDescription("Something went wrong whilst trying to find that rank. Please try again or report this to a developer.").send(message);

            if (roleObj && message.member.guild.me.roles.highest.comparePositionTo(roleObj) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${roleObj} to **${message.serverConf.autoRole.config[rankid].name}** because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${roleObj}, or give me a role that is already higher.`)
                    .send()
            }
            if (roleObj && !message.guild.ownerID == message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${roleObj} to **${message.serverConf.autoRole.config[rankid].name}** because it is higher than your highest role.\n\nTo fix this either move **your role** above ${roleObj}, or move the role under you.`)
                    .send()
            }
            let oldrole = message.serverConf.autoRole.config[rankid].role;
            if (role.toLowerCase() == "none") {
                delete message.serverConf.autoRole.config[rankid].role
            } else {
                message.serverConf.autoRole.config[rankid].role = roleObj.id;
            }

            await bot.config.autoRole.setAutoRoleConfig(message.guild.id, serverConf.currentAutoRoleSlot, message.serverConf.autoRole.config);
            bot.createEmbed(message)
                .setTitle("Success!")
                .setDescription(roleObj ? `Verified members with the rank **${message.serverConf.autoRole.config[rankid].name}** will now receive the role ${roleObj.toString()}!` : `Reset the role of **${message.serverConf.autoRole.config[rankid].name}**!`)
                .setThumbnail(`https://hypixel.net/data/guild_banners/200x400/${message.serverConf.autoRole.guild}.png`)
                .addField('\u200b', `${oldrole ? "<@&" + oldrole + ">" : "`No Role Set`"} → _**${roleObj ? roleObj.toString() : "`No Role Set`"}**_`)
                .send(message)
        } else if (args[0].toLowerCase() == "swap") {
            if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed().setDescription(`You must have a server guild set to do this!\n\nUse \`${message.serverConf.prefix}autorole setguild [YOUR GUILD NAME]\` to set the guild.`).send(message);
            let pos1 = parseInt(args[1]);
            let pos2 = parseInt(args[2]);

            if (isNaN(pos1) || isNaN(pos2)) {
                return bot.createErrorEmbed().setDescription(`You need to specify 2 positions to swap places.\n\nExample Usage: \`${message.serverConf.prefix}autorole swap 1 5\``).send(message);
            }
            let roleConfig = Object.entries(message.serverConf.autoRole.config);
            pos1 = pos1 > roleConfig.length ? roleConfig.length || 1 : pos1 < 1 ? 1 : pos1;
            pos2 = pos2 > roleConfig.length ? roleConfig.length || 1 : pos2 < 1 ? 1 : pos2;

            let pos1Obj = roleConfig.find((item) => item[1].pos == pos1);
            let pos2Obj = roleConfig.find((item) => item[1].pos == pos2);
            if (!pos1Obj || !pos2Obj) return bot.createErrorEmbed().setDescription("Something went wrong, please report this to a developer!").send(message);
            message.serverConf.autoRole.config[pos1Obj[0]].pos = pos2;
            message.serverConf.autoRole.config[pos2Obj[0]].pos = pos1;
            await bot.config.autoRole.setAutoRoleConfig(message.guild.id, serverConf.currentAutoRoleSlot, message.serverConf.autoRole.config);
            bot.createEmbed(message).setTitle("Success").setDescription(`Swapped position of **${pos1Obj[1].name}** with **${pos2Obj[1].name}**`).send(message)
            sendConfigEmbed()
        } else if (args[0].toLowerCase() == "reset") {
            let oldGuild = message.serverConf.autoRole.guild;
            if (oldGuild) {
                bot.createErrorEmbed().setAuthor(message.guild.name, message.guild.iconURL).setTitle(":warning: Confirmation :warning:").setDescription(`Are you sure you want to reset ALL auto role configuration for this server? This action and can NOT be undone! \n\nReact ☑️ to this message to proceed!`)
                    .send(message).then(async msg => {
                        await msg.react('☑️');
                        await msg.react('🚫');
                        let collector = msg.createReactionCollector({ filter: (reaction, user) => (reaction.emoji.name == "☑️" || reaction.emoji.name == "🚫") && user.id == message.author.id, time: 60000 })
                        collector.on("collect", (reaction, user) => {
                            if (reaction.emoji.name == "☑️") {
                                collector.stop();
                                bot.config.autoRole.delete(message.guild.id).then(() => {
                                    bot.createEmbed(message).setTitle("Success").setDescription("Auto role configuration reset!").send(message);
                                })
                            } else {
                                collector.stop();
                                message.channel.send("Action has been canceled!");
                            }
                        })
                        collector.on("end", (collected) => {
                            msg.reactions.removeAll();
                        })
                    })
            } else {
                message.reply("you have nothing to reset!")
            }

        } else if (['setguild', 'guild', 'sg'].includes(args[0].toLowerCase())) {
            if (!args[1]) {
                return bot.createErrorEmbed().setDescription(`You need to specify a guild to link to.\n\nExample Usage: \`${message.serverConf.prefix}autorole setguild Bluebloods\``).send(message);
            } else {
                let guild = args.splice(1, Infinity).join(" ");
                let oldGuild = message.serverConf.autoRole.guild ? await bot.wrappers.hypixelGuild.get(message.serverConf.autoRole.guild, 'id') : { exists: false };

                if (oldGuild.name && guild == oldGuild.name.toLowerCase()) return bot.createErrorEmbed().setDescription(`The server is already linked to **${oldGuild.name}**!`).send(message);
                let guildData = await bot.wrappers.hypixelGuild.get(guild, 'name');

                if (guildData.exists == false) {
                    return bot.createErrorEmbed().setDescription(`The guild **${guild}** does not seem to exist... :thinking:`).send(message)
                }
                if (oldGuild.name) {
                    bot.createErrorEmbed().setAuthor(message.guild.name, message.guild.iconURL).setTitle(":warning: Confirmation :warning:").setDescription(`Are you sure you want to change this server's guild from **${oldGuild.name}** to **${guildData.name} [${guildData.tag}]**? This action will RESET all role configurations and can NOT be undone! \n\nReact ☑️ to this message to proceed!`)
                        .setThumbnail(`https://hypixel.net/data/guild_banners/100x200/${guildData._id}.png`)
                        .send(message).then(async msg => {
                            await msg.react('☑️');
                            await msg.react('🚫');
                            let collector = msg.createReactionCollector({ filter: (reaction, user) => (reaction.emoji.name == "☑️" || reaction.emoji.name == "🚫") && user.id == message.author.id, time: 60000 })
                            collector.on("collect", (reaction, user) => {
                                if (reaction.emoji.name == "☑️") {
                                    collector.stop();
                                    confirmSetGuild();
                                } else {
                                    collector.stop();
                                    message.channel.send("Action has been canceled!");
                                }
                            })
                            collector.on("end", (collected) => {
                                msg.delete()
                            })
                        })
                } else {
                    confirmSetGuild();
                }
                async function confirmSetGuild() {
                    message.serverConf.autoRole.guild = guildData._id;

                    await bot.config.autoRole.setGuild(message.guild.id, guildData._id);
                    await bot.config.autoRole.assignGroup(message.guild.id);
                    await bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle("Success!").setDescription(`**${message.guild.name}**'s linked guild has been changed to **${guildData.name}**. Start configuring roles by using \`${message.serverConf.prefix}autorole\`!`).addField('\u200b', `\`${oldGuild.name || "No set guild"}\` → _**${guildData.name}**_`)
                        .setThumbnail(`https://hypixel.net/data/guild_banners/100x200/${guildData._id}.png`)
                        .send(message);
                    sendConfigEmbed()
                }
            }
        } else if (["logchannel", "channel", 'setchannel', 'sc', 'setlogchannel'].includes(args[0].toLowerCase())) {
            if (!args[1]) {
                return bot.createErrorEmbed().setDescription(`You need to specify a channel to log actions to.\n\nExample Usage: \`${message.serverConf.prefix}autorole setchannel #general\``).send(message);
            } else {
                let oldChannel = message.serverConf.autoRole.logChannel;
                let channel = await bot.parseChannel(args[1], message.guild)

                if (channel && channel.type == "GUILD_TEXT") {
                    bot.config.autoRole.setLogChannel(message.guild.id, channel.id)
                    bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle("Success!").setDescription(`The bot will now log actions in ${channel}.`)
                        .addField('\u200b', `${oldChannel ? "<#" + oldChannel + ">" : "\`No log channel\`"} → _**${channel}**_`)
                        .send(message)
                } else {
                    bot.createErrorEmbed().setDescription(`\`${args[1]}\` is not a valid text channel! Example channel: \`#general\``).send(message)
                }

            }
        } else {
            return bot.createErrorEmbed().setDescription(`Unknown argument: \`${args[0]}\`.\n Use \`${message.serverConf.prefix}autorole info\` to see all the valid arguments.`).send(message)
        }
    }
}