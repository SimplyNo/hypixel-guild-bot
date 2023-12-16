const { SlashCommandBuilder } = require('@discordjs/builders');
const { Role, Constants, Permissions, CommandInteraction, Util, MessageActionRow, MessageButton, Message } = require('discord.js');
const validReqs = require('../../../valid-requirements.json');
function getGameTypeFromID(id) {
    console.log(id);
    console.log(validReqs.find(el => el.reqs.find(e => e.id.toLowerCase() == id)))
    return validReqs.find(el => el.reqs.find(e => e.id.toLowerCase() == id));
}
function getReqFromID(id) {
    return validReqs.flatMap(e => e.reqs).find(e => e.id.toLowerCase() == id);
}

module.exports = {
    name: "requirements",
    aliases: ['reqs', 'req'],
    cooldown: 5,
    type: "config",
    adminOnly: true,
    usage: "[check|checkguild|set|list|remove]",
    example: "set bedwarsStar min 100",
    description: "Assign requirements for your guild.",
    slash: new SlashCommandBuilder()
        .setName('requirements')
        .setDescription("Assign requirements for your guild.")
        .setDefaultMemberPermissions(Permissions.FLAGS.ADMINISTRATOR)
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current Requirements config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('info')
                .setDescription('View command info.'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('check')
                .setDescription('Check a specific user')
                .addStringOption(option =>
                    option
                        .setName("username")
                        .setDescription("The username of the player to check.")
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('checkguild')
                .setDescription(`Check a whole guild.`)
                .addStringOption(option =>
                    option
                        .setName("guild")
                        .setDescription("The guild to check")
                        .setRequired(false)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription('Set a max/min value for a requirement.')
                .addStringOption(option =>
                    option
                        .setName("requirement")
                        .setDescription("The requirement to set.")
                        .setAutocomplete(true)
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("Whether the requirement is the maximum or minimum")
                        .setRequired(true)
                        .setChoices({ name: 'max', value: 'max' }, { name: 'min', value: 'min' }))
                .addNumberOption(option =>
                    option
                        .setName("value")
                        .setDescription("The value to set the requirement to.")
                        .setRequired(true)
                        .setMinValue(0)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('list')
                .setDescription('List all available requirements.'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('remove')
                .setDescription('Remove a requirement.')
                .addStringOption(option =>
                    option
                        .setName("requirement")
                        .setDescription("The requirement to remove.")
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('reset')
                .setDescription('Remove all requirements.')),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} param1 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        let requirements = Object.fromEntries(Object.entries(serverConf.requirements).filter(e => [e[1].role, e[1].min, e[1].max].some(el => el !== null)));
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'view') {
            sendInfo()
        } else if (subcommand == 'check') {
            if (!Object.entries(requirements).length) return bot.createErrorEmbed(interaction).setDescription(`This server does not have requirements set up!`).send()
            const username = interaction.options.getString('username', true);
            // let memberCheck = await bot.parseMember(args[1], interaction.guild);
            // let user = memberCheck ? (await bot.getUser({ id: memberCheck.id }))?.uuid : args[1];

            let data = await bot.wrappers.hypixelPlayer.get(username);

            if (!data || data.outage || data.exists == false) {
                return bot.createErrorEmbed(interaction).setDescription("Could not find that player!").send()
            }

            let sortedRequirements = Object.fromEntries(Object.entries(requirements).sort((a, b) => {
                if (getGameTypeFromID(a[0].toLowerCase()).name < getGameTypeFromID(b[0].toLowerCase()).name) { return -1; }
                if (getGameTypeFromID(a[0].toLowerCase()).name > getGameTypeFromID(b[0].toLowerCase()).name) { return 1; }
                return 0;
            }))
            const [check, outcome] = bot.requirementCheck(data, sortedRequirements);
            console.log(check)
            let desc = Object.entries(check).map(e => {
                let [id, result] = e;
                let { name, accepts } = getReqFromID(id);
                // return `${result.passed ? '<:pass:1028363845749710878>' : result.verdict > 0 ? '<:toohigh:926634633741889586>' : '<:toolow:926634691728125992>'} \`${name}\` → ${result.min !== null ? `${result.min.toLocaleString()} ≤ ` : ''} **${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}** ${result.max !== null ? `≤ ${result.max.toLocaleString()}` : ''} ${result.passed ? '' : result.verdict > 0 ? '(Too high!)' : '(Too low!)'}`
                return `${result.passed ? '<:pass:1028363845749710878>' : result.verdict > 0 ? '<:toohigh:926634633741889586>' : '<:toolow:926634691728125992>'} **${name}** → ${result.max ?? false ? `${result.max?.toLocaleString()}/` : ''}__**${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}**__${result.min ?? false ? `/${result.min.toLocaleString()}` : ''} ${result.passed ? '' : result.verdict > 0 ? `(Must be *at most* ${result.max.toLocaleString()}!)` : `(Must be *at least* ${result.min.toLocaleString()}!)`}`
                //                 return {
                //                     name: `${result.passed ? '✅' : '❌'} ${name}`,
                //                     value: `
                //                     \`Minimum:\` ${result.min}
                //                     \`Minimum:\` ${result.min}
                // **Current: ${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}**
                // ${result.passMessage ? `**${result.passMessage}**` : ''}`,
                //                     inline: true
                //                 }
            })
            bot.createEmbed(interaction)
                .setTitle(`${data.emojiRank} ${data.displayname}'s Requirements Check`)
                // .setDescription(`${outcome.passed}/${outcome.total} requirements passed:`)
                .addField(`${outcome.passed}/${outcome.total} Passed:`, desc.join('\n'))
                // .addFields(desc)
                .setThumbnail(bot.skin(data.uuid))
                .send()

            // @ TODO
        } else if (['help', 'info'].includes(subcommand)) {
            bot.createEmbed(interaction)
                .setTitle("Requirements Help")
                .addField("Valid Subcommands:",
                    `
• </requirements info:${interaction.commandId}> - Show this embed.
• </requirements view:${interaction.commandId}> - View current requirements,.
• </requirements check:${interaction.commandId}> - Check a specific user.
• </requirements checkguild:${interaction.commandId}> - Check the whole guild.
• </requirements set:${interaction.commandId}> - Set a max/min value for a requirement.
• </requirements list:${interaction.commandId}> - List all available requirements.
• </requirements remove:${interaction.commandId}> - Remove a requirement.
• </requirements reset:${interaction.commandId}> - Remove all requirements.

• </reqcheck:${(await bot.application.commands.fetch()).find(c => c.name === 'reqcheck').id}> - A command available to everyone for checking reqs.`)

                .send()

        } else if (subcommand == 'checkguild') {
            await interaction.deferReply();
            const guild_ = interaction.options.getString('guild', false);
            const guild = serverConf.autoRole.guild;
            // if (!guild) return bot.createErrorEmbed(interaction).setDescription(`You need to set your guild in autorole before you can use this command!\n\n\`${interaction.prefix}autorole setguild <GUILD NAME>\``).send()
            let guildData;
            if (guild_) {
                guildData = await bot.wrappers.hypixelGuild.get(guild_, 'name', true);
            } else {
                guildData = await bot.wrappers.hypixelGuild.get(guild, 'id', true);
            }
            if (!guildData || guildData.outage || guildData.exists == false) return bot.createErrorEmbed(interaction).setDescription(`Could not find that guild!`).send();
            await interaction.followUp({
                embeds: [
                    bot.createEmbed()
                        .setDescription(`Fetching member data... \`0/${guildData.members.length}\``)
                ]
            })
            let members = guildData.members.map(m => m.uuid);

            let membersData = await bot.wrappers.hypixelPlayers.get(members, {
                progressCallback(num, total) {
                    interaction.editReply({
                        embeds: [
                            bot.createEmbed()
                                .setDescription(`Fetching member data... \`${num}/${total}\``)
                        ]
                    })
                }
            });
            // console.log(membersData)
            let membersDataWithReqs = membersData.map(m => {
                let [check, outcome] = bot.requirementCheck(m, requirements);
                const data = {
                    // l: m.stats.BedWars.level,
                    uuid: m.uuid,
                    displayname: m.displayname,
                    emojiRank: m.emojiRank,
                    check,
                    outcome
                }
                return data;
            })


            let membersDataWithReqsSorted = membersDataWithReqs.sort((a, b) => {
                if (a.outcome.passed > b.outcome.passed) return -1;
                if (a.outcome.passed < b.outcome.passed) return 1;
            })

            let detailedDesc = membersDataWithReqs.map(m => {
                let { emojiRank } = m;
                let { check, outcome } = m;
                let failed = Object.entries(check).filter(([n, c]) => !c.passed);
                return `${outcome.passed == outcome.total ? '<:pass:1028363845749710878>' : '<:fail:1028363703298568244>'} ${emojiRank} **${m.displayname}** (${outcome.passed}/${outcome.total}) ${`${Object.entries(check).map(
                    ([n, result]) => {
                        let { name, accepts } = getReqFromID(n);
                        return `\n└ \`${name}\`: ${result.max ?? false ? `${result.max?.toLocaleString()}/` : ''}${result.passed ? `**` : ''}${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}${result.passed ? `**` : ''}${result.min ?? false ? `/${result.min.toLocaleString()}` : ''}`

                        // return `${c.verdict < 0 ? `${(c.min - c.currentValue).toLocaleString()} more` : `${(c.currentValue - c.max).toLocaleString()} less`} ${name}(s)`
                    })
                    .join('')}`}`

            })
            let passedFields = Util.splitMessage(membersDataWithReqs.filter(m => m.outcome.passed == m.outcome.total).map(m => `\`${m.displayname}\``).join(' • ') || "No members!", { maxLength: 1024, char: '•' }).map((m, i) => {
                return {
                    name: i === 0 ? `<:pass:1028363845749710878> Passed (${membersDataWithReqs.filter(m => m.outcome.passed == m.outcome.total).length}/${membersDataWithReqs.length})` : "\u200b",
                    value: m,
                }
            })
            let failedFields = Util.splitMessage(membersDataWithReqs.filter(m => m.outcome.passed !== m.outcome.total).map(m => `\`${m.displayname}\``).join(' • ') || "No members!", { maxLength: 1024, char: '•' }).map((m, i) => {
                return {
                    name: i === 0 ? `<:fail:1028363703298568244> Failed (${membersDataWithReqs.filter(m => m.outcome.passed !== m.outcome.total).length}/${membersDataWithReqs.length})` : "\u200b",
                    value: m,
                }
            })
            const overallCheck = bot.createEmbed()
                .setTitle(`${guildData.name}'s Requirements Check`)
                .addFields(passedFields)
                .addFields(failedFields)
            const overallCheckOptions = {
                embeds: [overallCheck],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('viewdetail')
                            .setLabel('View Detailed')
                            .setStyle('SECONDARY'))
                ]
            };
            const detailedCheckOptions = (page = 0) => {
                const maxPage = Math.ceil(detailedDesc.length / 10) - 1;
                return {
                    embeds: [
                        bot.createEmbed()
                            .setTitle(`${guildData.name}'s Requirements Check`)
                            .setDescription(detailedDesc.slice(page * 10, page * 10 + 10).join('\n'))
                            .setFooter(`Page ${page + 1}/${maxPage + 1}`)
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageButton()
                                .setCustomId('viewoverall')
                                .setLabel('View Overall')
                                .setStyle('SECONDARY'),
                            new MessageButton()
                                .setCustomId('back')
                                .setLabel('Back')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('next')
                                .setLabel('Next')
                                .setStyle('PRIMARY'),
                        )
                    ]
                }
            }
            /**
             * @type {Message<true>}
             */
            const cmdMsg = await interaction.followUp(overallCheckOptions);
            const buttonCollector = cmdMsg.createMessageComponentCollector({ filter: i => i.user.id == interaction.user.id, idle: 6000000 });
            buttonCollector.on('end', (_, reason) => {
                if (reason === 'time') {
                    cmdMsg.edit({ components: [] })
                }
            })
            buttonCollector.on('collect', async i => {
                if (i.customId == 'viewdetail') {
                    i.update(detailedCheckOptions());
                }
                if (i.customId == 'viewoverall') {
                    i.update(overallCheckOptions);
                }
                if (i.customId == 'back') {
                    let page = parseInt(i.message.embeds[0].footer.text.split(' ')[1]) - 2;
                    if (page < 0) page = Math.ceil(detailedDesc.length / 10) - 1;
                    i.update(detailedCheckOptions(page));
                }
                if (i.customId == 'next') {
                    let page = parseInt(i.message.embeds[0].footer.text.split(' ')[1]);
                    if (page >= Math.ceil(detailedDesc.length / 10)) page = 0;
                    i.update(detailedCheckOptions(page));
                }
            })


        } else if (subcommand == 'list') {
            let dropdowns = validReqs.map(e => ({
                embeds: [
                    bot.createEmbed()
                        .setAuthor(`${interaction.guild.name} `, interaction.guild.iconURL())
                        .setTitle(`List of Valid Requirements: ${e.name} `)
                        .setDescription(`Use \`${interaction.prefix}req set [RequirementID] ["min" | "max"] [number | "none"]\` to add a requirement.`)
                        .addField('ID | Name', e.reqs.map(e => `\`${e.id}\` - **${e.name}**`).join('\n'))
                        .addField('━━━━━━━━━━━━━━━━━━━━━━', `Can't find the requirement stat your looking for? Join our [support server](https://discord.gg/invite/BgWcvKf) and suggest it!`)
                ],
                menu: {
                    label: e.name,
                    description: `View ${e.name} stats`,
                }
            }));
            bot.createEmbed(interaction)
                .setTitle("Current Available Requirements").addDropdowns(dropdowns).send()
        } else if (subcommand == 'set') {
            const reqID = interaction.options.getString('requirement').toLowerCase();
            const type = interaction.options.getString('type');
            const value_ = interaction.options.getNumber('value');

            const reqObj = getReqFromID(reqID);
            if (!reqObj) return bot.createErrorEmbed(interaction).setDescription(`The requirement \`${reqID}\` could not be found!\n\nUse \`${interaction.prefix}requirements list\` to see a list of possible requirements.`).send();
            const value = reqObj.accepts == "FLOAT" ? parseFloat(value_) : parseInt(value_);

            const realID = reqObj.id;
            // check for max reqs
            if (Object.entries(requirements).length > 20) return bot.createErrorEmbed(interaction).setDescription("You have reached the current requirement limit of 20!").send()
            // if (!args[2] || !['min', 'max'].includes(args[2].toLowerCase())) return bot.createErrorEmbed(interaction).setDescription(`You need to specify whether this is a **MIN** or a **MAX** value for this requirement.\n\nExample: \`${interaction.prefix}requirements set bedwarsStar min 100\``).send()

            if (isNaN(value)) return bot.createErrorEmbed(interaction).setDescription(`You need to specify a **value** (or "none") to set for this requirement.\n\nExample: \`${interaction.prefix}requirements set bedwarsStar min 100\``).send()
            if (type == 'min') {
                if (requirements[realID]?.max !== null && value > requirements[realID]?.max) return bot.createErrorEmbed(interaction).setDescription(`The minimum can not be more than the maximum (${requirements[realID].max.toLocaleString()})!`).send()
            } else {
                if (requirements[realID]?.max !== null && value < requirements[realID]?.min) return bot.createErrorEmbed(interaction).setDescription(`The maximum can not be less than the minimum (${requirements[realID].min.toLocaleString()})!`).send()
            }

            await bot.config.requirements.setRequirement(interaction.guild.id, realID, {
                [type]: value == 'none' ? null : value
            })
            await bot.createEmbed(interaction)
                .setTitle(`${bot.assets.emotes.other.check} Requirement Set!`)
                .setDescription(`Successfully set ${type == 'min' ? "MIN" : "MAX"} value of **${realID}** to \`${value}\`.`)
                .send()
            sendInfo(true)

            // } else if (args[0].toLowerCase() == "setrole") {
            //     if (!args[1]) return bot.createErrorEmbed(message).setDescription(`You need to specify a **requirement** to set a role for!\n\nUsage: \`${message.prefix}requirements setrole [RequirementID] [@Role | "none"]\`.`).send();
            //     const reqID = args[1].toLowerCase();
            //     const reqObj = getReqFromID(reqID);
            //     if (!reqObj) return bot.createErrorEmbed(message).setDescription(`The requirement \`${args[1]}\` could not be found!\n\nUse \`${message.prefix}requirements list\` to see a list of possible requirements.`).send();
            //     const realID = reqObj.id;
            //     // chjeck for max reqs
            //     if (Object.entries(requirements).length > 20) return bot.createErrorEmbed(message).setDescription("You have reached the current requirement limit of 20!").send()

            //     let role = args[2].toLowerCase() == 'none' ? 'none' : await bot.parseRole(args.slice(2, args.length).join(" "), message.guild);
            //     if (args[2].toLowerCase() !== 'none') {

            //         if (!role) return bot.createErrorEmbed(message).setDescription(`The role \`${args.slice(2, args.length).join(" ")}\` does not exist!`).send()
            //         // standard role error checking
            //         if (role && message.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
            //             return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
            //                 .setDescription(`Unable to assign the role ${role} to **${realID}** because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
            //                 .send()
            //         }
            //         if (role && !message.guild.ownerID == message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
            //             return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
            //                 .setDescription(`Unable to assign the role ${role} to **${realID}** because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
            //                 .send()
            //         }
            //     }
            //     await bot.config.requirements.setRequirement(message.guild.id, realID, {
            //         role: role == 'none' ? null : role.id
            //     })
            //     bot.createEmbed(message)
            //         .setTitle(`${bot.assets.emotes.other.check} Role Set!`)
            //         .setDescription(`Verified members who pass the requirement for **${realID}** will receive the role ${role == 'none' ? "`none`" : role}!\n\nMember's stats are checked based on their chat activity.`).send()
        } else if (subcommand == 'remove') {

            const reqID = interaction.options.getString('requirement');
            const reqObj = getReqFromID(reqID);
            if (!reqObj) return bot.createErrorEmbed(interaction).setDescription(`The requirement \`${reqID}\` could not be found!\n\nUse \`${interaction.prefix}requirements list\` to see a list of possible requirements.`).send();
            const realID = reqObj.id;

            await bot.config.requirements.deleteRequirement(interaction.guild.id, realID);
            await bot.createEmbed(interaction)
                .setTitle(`${bot.assets.emotes.other.check} Requirement Removed!`)
                .setDescription(`The requirement \`${realID}\` has been removed.`).send();
            sendInfo(true)
        } else if (subcommand == 'reset') {
            let confirmationEmbed = await bot.createEmbed(interaction).setDescription("Are you sure you want to reset ALL requirement configurations?").sendAsConfirmation();
            confirmationEmbed.on('confirm', async (button) => {
                await button.deferUpdate()
                await bot.config.requirements.delete(interaction.guild.id);
                bot.createEmbed(interaction)
                    .setTitle(`${bot.assets.emotes.other.check} Requirements Reset!`)
                    .setDescription(`Reset all requirement configurations.`).send()
            })
            confirmationEmbed.on('cancel', async (button) => {
                await button.deferUpdate()
                interaction.followUp('Cancelled!')
            })

        } else {
            bot.createErrorEmbed(interaction).setDescription(`\`${args[0]}\` is not a valid subcommand! Use \`${interaction.prefix}requirements\` to see a list of valid subcommands.`).send()
        }
        async function sendInfo(ephemeral) {
            requirements = Object.fromEntries(Object.entries((await bot.config.getConfigAsObject(interaction.guild.id)).requirements).filter(e => [e[1].role, e[1].min, e[1].max].some(el => el !== null)));
            let desc = Object.entries(requirements).sort((a, b) => {
                if (getGameTypeFromID(a[0].toLowerCase()).name < getGameTypeFromID(b[0].toLowerCase()).name) { return -1; }
                if (getGameTypeFromID(a[0].toLowerCase()).name > getGameTypeFromID(b[0].toLowerCase()).name) { return 1; }
                return 0;


            }).map(e => ({
                name: '» ' + getReqFromID(e[0].toLowerCase()).name,
                value: `
┣ ID: \`${e[0] ?? "null"}\`
┣ Min: \`${e[1].min ?? "None"}\`
┗ Max: \`${e[1].max ?? "None"}\``,
                inline: true
            }))
            bot.createEmbed(interaction)
                .setFancyGuild()
                .setTitle('Guild Requirements')
                .setDescription(`Use \`${interaction.prefix}requirements info\` to see a list of valid subcommands!`)
                // .addField('Current Requirements')
                .addFields(desc.length ? desc : [{ name: "No requirements set!", value: `Use \`${interaction.prefix}requirements set [RequirementID] ["min" | "max"] [number]\` to set a requirement!\n\nE.g. \`${interaction.prefix}requirements set bedwars_star min 50\`` }])
                .send({ ephemeral })

        }

    },
    async execute(message, args, bot) {
        let requirements = Object.fromEntries(Object.entries(message.serverConf.requirements).filter(e => [e[1].role, e[1].min, e[1].max].some(el => el !== null)));
        if (!args.length) {
            let desc = Object.entries(requirements).sort((a, b) => {
                if (getGameTypeFromID(a[0].toLowerCase()).name < getGameTypeFromID(b[0].toLowerCase()).name) { return -1; }
                if (getGameTypeFromID(a[0].toLowerCase()).name > getGameTypeFromID(b[0].toLowerCase()).name) { return 1; }
                return 0;


            }).map(e => ({
                name: '» ' + getReqFromID(e[0].toLowerCase()).name,
                value: `
┣ ID: \`${e[0] ?? "null"}\`
┣ Min: \`${e[1].min ?? "None"}\`
┗ Max: \`${e[1].max ?? "None"}\``,
                inline: true
            }))
            bot.createEmbed(message)
                .setFancyGuild()
                .setTitle('Guild Requirements')
                .setDescription(`Use \`${message.prefix}requirements info\` to see a list of valid subcommands!`)
                // .addField('Current Requirements')
                .addFields(desc.length ? desc : [{ name: "No requirements set!", value: `Use \`${message.prefix}requirements set [RequirementID] ["min" | "max"] [number]\` to set a requirement!\n\nE.g. \`${message.prefix}requirements set bedwars_star min 50\`` }])
                .send()
        } else if (args[0].toLowerCase() == 'check' || args[0].toLowerCase() == 'c') {
            if (!Object.entries(requirements).length) return bot.createErrorEmbed(message).setDescription(`This server does not have requirements set up!`).send()

            let memberCheck = await bot.parseMember(args[1], message.guild);
            let user = memberCheck ? (await bot.getUser({ id: memberCheck.id }))?.uuid : args[1];

            let data = await bot.wrappers.hypixelPlayer.get(user);

            if (!data || data.outage || data.exists == false) {
                return bot.createErrorEmbed(message).setDescription("Could not find that player!").send()
            }

            let sortedRequirements = Object.fromEntries(Object.entries(requirements).sort((a, b) => {
                if (getGameTypeFromID(a[0].toLowerCase()).name < getGameTypeFromID(b[0].toLowerCase()).name) { return -1; }
                if (getGameTypeFromID(a[0].toLowerCase()).name > getGameTypeFromID(b[0].toLowerCase()).name) { return 1; }
                return 0;
            }))
            const [check, outcome] = bot.requirementCheck(data, sortedRequirements);
            console.log(check)
            let desc = Object.entries(check).map(e => {
                let [id, result] = e;
                let { name, accepts } = getReqFromID(id);
                // return `${result.passed ? '<:pass:1028363845749710878>' : result.verdict > 0 ? '<:toohigh:926634633741889586>' : '<:toolow:926634691728125992>'} \`${name}\` → ${result.min !== null ? `${result.min.toLocaleString()} ≤ ` : ''} **${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}** ${result.max !== null ? `≤ ${result.max.toLocaleString()}` : ''} ${result.passed ? '' : result.verdict > 0 ? '(Too high!)' : '(Too low!)'}`
                // return `${result.passed ? '<:pass:1028363845749710878>' : result.verdict > 0 ? '<:toohigh:926634633741889586>' : '<:toolow:926634691728125992>'} \`${name}\` → **${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}** ${result.passed ? '' : result.verdict > 0 ? `(Must be *at most* ${result.max.toLocaleString()}!)` : `(Must be *at least* ${result.min.toLocaleString()}!)`}`
                return `${result.passed ? '<:pass:1028363845749710878>' : result.verdict > 0 ? '<:toohigh:926634633741889586>' : '<:toolow:926634691728125992>'} \`${name}\` → **${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}** ${result.verdict > 0 ? `(Must be *at most* ${result.max.toLocaleString()}!)` : `(Must be *at least* ${result.min.toLocaleString()}!)`}`
                //                 return {
                //                     name: `${result.passed ? '✅' : '❌'} ${name}`,
                //                     value: `
                //                     \`Minimum:\` ${result.min}
                //                     \`Minimum:\` ${result.min}
                // **Current: ${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}**
                // ${result.passMessage ? `**${result.passMessage}**` : ''}`,
                //                     inline: true
                //                 }
            })
            bot.createEmbed(message)
                .setTitle(`${data.emojiRank} ${data.displayname}'s Requirements Check`)
                // .setDescription(`${outcome.passed}/${outcome.total} requirements passed:`)
                .addField(`${outcome.passed}/${outcome.total} requirements passed:`, desc.join('\n'))
                // .addFields(desc)
                .setThumbnail(bot.skin(data.uuid))
                .send()

            // @ TODO
        } else if (['help', 'info'].includes(args[0].toLowerCase())) {
            bot.createEmbed(message)
                .setTitle("Requirements Help")
                .addField("Valid Subcommands:",
                    `
• \`${message.prefix}req info\` - Show this embed.
• \`${message.prefix}req check [Username]\` - Check a specific user.
~~• \`${message.prefix}req checkguild\` - Check the whole guild.~~ coming soon
• \`${message.prefix}req set [RequirementID] ["min" | "max"] [number | "none"]\` - Set a max/min value for a requirement.
• \`${message.prefix}req list\` - List all available requirements.
• \`${message.prefix}req remove [RequirementID]\` - Remove a requirement.
• \`${message.prefix}req reset\` - Remove all requirements.

• \`${message.prefix}reqcheck [Username]\` - A command available to everyone for checking reqs.`)

                .send()

        } else if (args[0].toLowerCase() == 'checkguild') {
            message.reply("feature is coming soon!")

        } else if (args[0].toLowerCase() == 'list') {
            let dropdowns = validReqs.map(e => ({
                embeds: [
                    bot.createEmbed()
                        .setAuthor(`${message.guild.name} `, message.guild.iconURL())
                        .setTitle(`List of Valid Requirements: ${e.name} `)
                        .setDescription(`Use \`${message.prefix}req set [RequirementID] ["min" | "max"] [number | "none"]\` to add a requirement.`)
                        .addField('ID | Name', e.reqs.map(e => `\`${e.id}\` - **${e.name}**`).join('\n'))
                        .addField('━━━━━━━━━━━━━━━━━━━━━━', `Can't find the requirement stat your looking for? Join our [support server](https://discord.gg/invite/BgWcvKf) and suggest it!`)
                ],
                menu: {
                    label: e.name,
                    description: `View ${e.name} stats`,
                }
            }));
            bot.createEmbed(message)
                .setTitle("Current Available Requirements").addDropdowns(dropdowns).send()
        } else if (args[0].toLowerCase() == 'set') {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`You need to specify a **requirement** to set!\n\nUsage: \`${message.prefix}requirements set [RequirementID] ["min" | "max"] [number | "none"]\`.`).send();
            const reqID = args[1].toLowerCase();
            const reqObj = getReqFromID(reqID);
            if (!reqObj) return bot.createErrorEmbed(message).setDescription(`The requirement \`${args[1]}\` could not be found!\n\nUse \`${message.prefix}requirements list\` to see a list of possible requirements.`).send();
            const realID = reqObj.id;
            // check for max reqs
            if (Object.entries(requirements).length > 20) return bot.createErrorEmbed(message).setDescription("You have reached the current requirement limit of 20!").send()
            if (!args[2] || !['min', 'max'].includes(args[2].toLowerCase())) return bot.createErrorEmbed(message).setDescription(`You need to specify whether this is a **MIN** or a **MAX** value for this requirement.\n\nExample: \`${message.prefix}requirements set bedwarsStar min 100\``).send()
            const operator = args[2].toLowerCase();
            let value = args[3].toLowerCase() == 'none' ? 'none' : reqObj.accepts == "FLOAT" ? parseFloat(args[3]) : parseInt(args[3]);
            if (args[3].toLowerCase() !== 'none') {
                if (isNaN(value)) return bot.createErrorEmbed(message).setDescription(`You need to specify a **value** (or "none") to set for this requirement.\n\nExample: \`${message.prefix}requirements set bedwarsStar min 100\``).send()
                if (value < 0) return bot.createErrorEmbed(message).setDescription(`The value can not be less than 0!`).send();
                if (operator == 'min') {
                    if (requirements[realID]?.max !== null && value > requirements[realID]?.max) return bot.createErrorEmbed(message).setDescription(`The minimum can not be more than the maximum (${requirements[realID].max.toLocaleString()})!`).send()
                } else {
                    if (requirements[realID]?.max !== null && value < requirements[realID]?.min) return bot.createErrorEmbed(message).setDescription(`The maximum can not be less than the minimum (${requirements[realID].min.toLocaleString()})!`).send()
                }
            }
            console.log(value == 'none' ? null : value)
            await bot.config.requirements.setRequirement(message.guild.id, realID, {
                [operator]: value == 'none' ? null : value
            })
            bot.createEmbed(message)
                .setTitle(`${bot.assets.emotes.other.check} Requirement Set!`)
                .setDescription(`Successfully set ${operator == 'min' ? "MIN" : "MAX"} value of **${realID}** to \`${value}\`.`)
                .send()

            // } else if (args[0].toLowerCase() == "setrole") {
            //     if (!args[1]) return bot.createErrorEmbed(message).setDescription(`You need to specify a **requirement** to set a role for!\n\nUsage: \`${message.prefix}requirements setrole [RequirementID] [@Role | "none"]\`.`).send();
            //     const reqID = args[1].toLowerCase();
            //     const reqObj = getReqFromID(reqID);
            //     if (!reqObj) return bot.createErrorEmbed(message).setDescription(`The requirement \`${args[1]}\` could not be found!\n\nUse \`${message.prefix}requirements list\` to see a list of possible requirements.`).send();
            //     const realID = reqObj.id;
            //     // chjeck for max reqs
            //     if (Object.entries(requirements).length > 20) return bot.createErrorEmbed(message).setDescription("You have reached the current requirement limit of 20!").send()

            //     let role = args[2].toLowerCase() == 'none' ? 'none' : await bot.parseRole(args.slice(2, args.length).join(" "), message.guild);
            //     if (args[2].toLowerCase() !== 'none') {

            //         if (!role) return bot.createErrorEmbed(message).setDescription(`The role \`${args.slice(2, args.length).join(" ")}\` does not exist!`).send()
            //         // standard role error checking
            //         if (role && message.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
            //             return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
            //                 .setDescription(`Unable to assign the role ${role} to **${realID}** because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
            //                 .send()
            //         }
            //         if (role && !message.guild.ownerID == message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
            //             return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
            //                 .setDescription(`Unable to assign the role ${role} to **${realID}** because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
            //                 .send()
            //         }
            //     }
            //     await bot.config.requirements.setRequirement(message.guild.id, realID, {
            //         role: role == 'none' ? null : role.id
            //     })
            //     bot.createEmbed(message)
            //         .setTitle(`${bot.assets.emotes.other.check} Role Set!`)
            //         .setDescription(`Verified members who pass the requirement for **${realID}** will receive the role ${role == 'none' ? "`none`" : role}!\n\nMember's stats are checked based on their chat activity.`).send()
        } else if (args[0].toLowerCase() == 'remove') {

            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`You need to specify a **requirement** to remove!\n\nUsage: \`${message.prefix}requirements remove [RequirementID]\`.`).send();
            const reqID = args[1].toLowerCase();
            const reqObj = getReqFromID(reqID);
            if (!reqObj) return bot.createErrorEmbed(message).setDescription(`The requirement \`${args[1]}\` could not be found!\n\nUse \`${message.prefix}requirements list\` to see a list of possible requirements.`).send();
            const realID = reqObj.id;

            await bot.config.requirements.deleteRequirement(message.guild.id, realID);
            bot.createEmbed(message)
                .setTitle(`${bot.assets.emotes.other.check} Requirement Removed!`)
                .setDescription(`The requirement \`${realID}\` has been removed.`).send()
        } else if (args[0].toLowerCase() == 'reset') {
            let confirmationEmbed = await bot.createConfirmationEmbed(message).setDescription("Are you sure you want to reset ALL requirement configurations?").send();
            confirmationEmbed.confirmation.on('confirm', async (button) => {
                await button.deferUpdate()
                await bot.config.requirements.delete(message.guild.id);
                bot.createEmbed(message)
                    .setTitle(`${bot.assets.emotes.other.check} Requirements Reset!`)
                    .setDescription(`Reset all requirement configurations.`).send()
            })
            confirmationEmbed.confirmation.on('cancel', async (button) => {
                await button.deferUpdate()
                message.reply('Cancelled!')
            })

        } else {
            bot.createErrorEmbed(message).setDescription(`\`${args[0]}\` is not a valid subcommand! Use \`${message.prefix}requirements\` to see a list of valid subcommands.`).send()
        }


    }
}