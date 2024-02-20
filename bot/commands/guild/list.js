const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
module.exports = {
    name: "list",
    aliases: ["members"],
    cooldown: 5,
    description: "View all the members of a guild",
    usage: '<GUILD | -p IGN | @USER>',
    example: "Lucid",
    type: 'guild',
    autoPost: true,
    slash: new SlashCommandBuilder()
        .setName("list")
        .setDescription("View all the members of a guild")
        .addStringOption(option =>
            option
                .setName('query')
                .setRequired(false)
                .setAutocomplete(true)
                .setDescription('Guild name or player name'))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription(`Whether to search by player or by guild name`)
                .setRequired(false)
                .setChoices({ name: 'player', value: "player" }, { name: 'guild', value: "guild" })),
    async run(interaction, { serverConf }, bot, uuid) {
        async function command() {

            let user = await bot.getUser({ id: interaction.user.id })

            const query = interaction.options.getString("query", false);
            let memberCount = interaction.options.getString('count', false) ?? 15;
            const type = interaction.options.getString('type', false) ?? 'guild';
            if (type === 'guild' && query) {
                // set recently searched
                bot.addRecentSearch(interaction.user.id, query)
            }
            await interaction.deferReply();

            let guild;
            if (!query && !user) return bot.createErrorEmbed(interaction).setDescription("To use this command without arguments, verify by doing `/verify [username]`!").send();
            else if (!query) guild = await bot.wrappers.hypixelGuild.get((user.uuid), 'player', true);
            else if (type === "player") guild = await bot.wrappers.hypixelGuild.get((query), 'player', true);
            else if (type === "guild") guild = await bot.wrappers.hypixelGuild.get((query), 'name', true);

            if (guild.exists == false && !query) return bot.createErrorEmbed(interaction).setDescription("You are not in a guild!").send();
            if (guild.exists == false && type === 'guild') return bot.sendErrorEmbed(interaction, `We couldn't find a guild with the information you gave us.`)
            if (guild.exists == false && type === 'player') return bot.sendErrorEmbed(interaction, `This player is not in a guild!`)
            if (guild.outage) return bot.sendErrorEmbed(interaction, `There is a Hypixel API Outage, please try again within a few minutes`)

            var guildRanks = guild.ranks || []
            let ranks = {}

            var guildMaster = guild.members.find(m => m.rank.match(/^guild\s*master$/i)).username
            var guildMembersFiltered = guild.members.filter(m => m.username != guildMaster)

            guildMembersFiltered.forEach(member => {
                var guildRankInfo = guildRanks.find(g => g.name == member.rank) || {}
                ranks[member.rank] ? null : ranks[member.rank] = { name: member.rank, tag: guildRankInfo.tag ? `[${guildRankInfo.tag}]` : ``, priority: guildRankInfo.priority || 1, members: [] }
                ranks[member.rank].members.push(member.username)

            })

            guildRanks.forEach(rank => {
                if (rank.name.toLowerCase() != "guild master" && rank.name.toLowerCase() != "guildmaster") {
                    var guildRankInfo = guildRanks.find(g => g.name == rank.name) || {}
                    ranks[rank.name] ? null : ranks[rank.name] = { name: rank.name, tag: guildRankInfo.tag ? `[${guildRankInfo.tag}]` : ``, priority: guildRankInfo.priority || 1, members: [] }
                }
            })

            var ranksArray = Object.keys(ranks).map(key => ranks[key]);
            ranksArray.sort((a, b) => b.priority - a.priority)
            console.log(ranks)

            const embed = {
                title: `${Discord.Util.escapeMarkdown(`${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`)}`,
                description: `Guild Member count: **${guild.members.length}/125**`,
                icon: bot.assets.hypixel.guild,
                thumbnail: `https://hypixel.paniek.de/guild/${guild.id || guild._id}/banner.png`,
                color: guild.tagColor.hex,
                footer: true
            }

            let pages = [
                {
                    author: "Guild Member List",
                    fields: [
                        { name: `Guild Master [GM] » 1`, value: guildMaster ? `\`${guildMaster}\`` : "Error", options: { escapeFormatting: true } }
                    ]
                }
            ]

            for (const rank of ranksArray) {
                joinedMembers = rank.members.length ? rank.members.map(e => `\`${e}\``).join(" ᛫ ") : "No Members"
                if (joinedMembers.length > 950) {
                    var first = joinedMembers.split(" ᛫ ")
                    var second = first.splice(0, Math.floor(first.length / 2));
                    pages[0].fields.push({
                        name: `${rank.name} ${rank.tag} » ${rank.members.length}`,
                        value: first.join(" ᛫ "),
                        options: { escapeFormatting: true, inline: false }
                    });
                    pages[0].fields.push({
                        name: `\u200b`,
                        value: second.join(" ᛫ "),
                        options: { escapeFormatting: true, inline: false }
                    });
                } else {
                    pages[0].fields.push({
                        name: `${rank.name} ${rank.tag} » ${rank.members.length}`,
                        value: joinedMembers,
                        options: { escapeFormatting: true, inline: false }
                    });
                }
            }


            const embeds = bot.pageEmbedMaker(embed, pages)
            bot.sendPages(interaction, embeds)
        }
        command()

    },
    async execute(message, args, bot, uuid) {
        async function command() {

            let user = await bot.getUser({ id: message.author.id })

            if (args[0] == "-p") {
                if (!args[1]) return bot.sendErrorEmbed(message, `You did not include a user to check the guild of`)
                var guild = await bot.wrappers.hypixelGuild.get((args[1]), "player", true)
            } else {
                if (!args[0]) {
                    if (!user) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    var guild = await bot.wrappers.hypixelGuild.get((user.uuid), "player", true)
                } else if (args[0].match(/<@.?[0-9]*?>/)) {
                    var mentionedID = args[0].replace(/!/g, '').slice(2, -1)
                    var mentioned = await bot.getUser({ id: mentionedID })
                    if (!mentioned) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    var guild = await bot.wrappers.hypixelGuild.get((mentioned.uuid), "player", true)
                } else var guild = await bot.wrappers.hypixelGuild.get((args.join(" ")), "name", true)
            }

            if (!guild || guild.exists == false) return bot.sendErrorEmbed(message, `We couldn't find a guild with the information you gave us.`)
            if (guild.outage) return bot.sendErrorEmbed(message, `There is a Hypixel API Outage, please try again within a few minutes`)

            var guildRanks = guild.ranks || []
            let ranks = {}

            var guildMaster = guild.members.find(m => m.rank.match(/^guild\s*master$/i)).username
            var guildMembersFiltered = guild.members.filter(m => m.username != guildMaster)

            guildMembersFiltered.forEach(member => {
                var guildRankInfo = guildRanks.find(g => g.name == member.rank) || {}
                ranks[member.rank] ? null : ranks[member.rank] = { name: member.rank, tag: guildRankInfo.tag ? `[${guildRankInfo.tag}]` : ``, priority: guildRankInfo.priority || 1, members: [] }
                ranks[member.rank].members.push(member.username)

            })

            guildRanks.forEach(rank => {
                if (rank.name.toLowerCase() != "guild master" && rank.name.toLowerCase() != "guildmaster") {
                    var guildRankInfo = guildRanks.find(g => g.name == rank.name) || {}
                    ranks[rank.name] ? null : ranks[rank.name] = { name: rank.name, tag: guildRankInfo.tag ? `[${guildRankInfo.tag}]` : ``, priority: guildRankInfo.priority || 1, members: [] }
                }
            })

            var ranksArray = Object.keys(ranks).map(key => ranks[key]);
            ranksArray.sort((a, b) => b.priority - a.priority)
            console.log(ranks)

            const embed = {
                title: `${Discord.Util.escapeMarkdown(`${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`)}`,
                description: `Guild Member count: **${guild.members.length}/125**`,
                icon: bot.assets.hypixel.guild,
                thumbnail: `https://hypixel.paniek.de/guild/${guild.id || guild._id}/banner.png`,
                color: guild.tagColor.hex,
                footer: true
            }

            let pages = [
                {
                    author: "Guild Member List",
                    fields: [
                        { name: `Guild Master [GM] » 1`, value: guildMaster ? `\`${guildMaster}\`` : "Error", options: { escapeFormatting: true } }
                    ]
                }
            ]

            for (const rank of ranksArray) {
                joinedMembers = rank.members.length ? rank.members.map(e => `\`${e}\``).join(" ᛫ ") : "No Members"
                if (joinedMembers.length > 950) {
                    var first = joinedMembers.split(" ᛫ ")
                    var second = first.splice(0, Math.floor(first.length / 2));
                    pages[0].fields.push({
                        name: `${rank.name} ${rank.tag} » ${rank.members.length}`,
                        value: first.join(" ᛫ "),
                        options: { escapeFormatting: true, inline: false }
                    });
                    pages[0].fields.push({
                        name: `\u200b`,
                        value: second.join(" ᛫ "),
                        options: { escapeFormatting: true, inline: false }
                    });
                } else {
                    pages[0].fields.push({
                        name: `${rank.name} ${rank.tag} » ${rank.members.length}`,
                        value: joinedMembers,
                        options: { escapeFormatting: true, inline: false }
                    });
                }
            }


            const embeds = bot.pageEmbedMaker(embed, pages)
            bot.sendPages(message, embeds)
        }
        command()

    }
}