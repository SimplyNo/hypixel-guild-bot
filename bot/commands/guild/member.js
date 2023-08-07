const { SlashCommandBuilder } = require("@discordjs/builders");
const Discord = require("discord.js");
const Moment = require("moment");

module.exports = {
    name: "member",
    aliases: ["m", "mem"],
    description: "View individual member GEXP earnings.",
    usage: 'IGN',
    example: "Simplyno",
    type: 'guild',
    cooldown: 1,
    autoPost: true,
    slash: new SlashCommandBuilder()
        .setName("member")
        .setDescription("View individual member GEXP earnings.")
        .addStringOption(option =>
            option
                .setName('name')
                .setRequired(false)
                .setDescription('username')),
    async run(interaction, { serverConf }, bot) {
        await interaction.deferReply();

        let requestUser = await bot.getUser({ id: interaction.user.id });
        let name = interaction.options.getString("name", false);
        if (!requestUser && !name) return bot.sendErrorEmbed(interaction, "To use this command without arguments, verify yourself by using `/verify [username]`!");
        else if (!name) name = requestUser.uuid;


        let player = await bot.wrappers.hypixelPlayer.get(name)

        const errorCheck = bot.playerErrorCheck(player)
        if (errorCheck) return bot.sendErrorEmbed(interaction, errorCheck)
        let user = await bot.getUser({ uuid: player.uuid }) || {}
        const emoji = user.emoji || ""

        const guild = await bot.wrappers.hypixelGuild.get(encodeURI(player.uuid), "player", true)



        if (guild.exists == false) return bot.sendErrorEmbed(interaction, `This user is not in a guild.`)
        if (guild.outage) return bot.sendErrorEmbed(interaction, `There is a Hypixel API Outage, please try again within a few minutes`);
        var member = (guild.members || []).find(member => member.uuid == player.uuid)
        var rank = (guild.ranks || []).find(r => r.name == member.rank)

        if (!rank) rank = { tag: "GM" }

        var GEXPFormatted = [];
        var weeklyExp = [];
        var dates = Object.keys(member.expHistory || {}).map(e => ({ key: e, date: new Date(`${e} EST`).setHours(0, 0, 0) }));

        var dailyPos = 1
        var weeklyPos = 1
        // var monthlyPos = 1

        let weeklyAverage = Object.entries(member.expHistory).reduce((p, c) => p + c[1], 0) / 7;
        for (var n = 0; n < 7; n++) {
            var dailyPos = 1
            guild.members.forEach(otherMember => { if (otherMember.expHistory[dates[n].key] > member.expHistory[dates[n].key]) dailyPos++ })
            GEXPFormatted[n] = `\`•\` ${Moment(dates[n].date).format('MMM. Do')}: **${member.expHistory[dates[n].key].toLocaleString()}** \`[#${dailyPos}/${guild.members.length}]\`\n`
            weeklyExp.push(member.expHistory[dates[n].key])
        }

        GEXPFormatted.push(`\`•\` Daily Average: **${Math.floor(weeklyAverage).toLocaleString()}**`)
        guild.members.forEach(otherMember => {
            if (otherMember.weekly > member.weekly) weeklyPos++
            // if (otherMember.monthly > member.monthly) monthlyPos++
        })

        let weeklyGEXP = [
            `\`•\` Weekly: **${(member.weekly || 0).toLocaleString()}** \`[#${weeklyPos}/${guild.members.length}]\`\n`,
            // `\`•\` Monthly: **${(member.monthly || 0).toLocaleString()}** \`[#${monthlyPos}/${guild.members.length}]\`\n`
        ]

        const embed = {
            description: `**${Discord.Util.escapeMarkdown(`${emoji} ${player.emojiRank} ${player.displayname}${guild.tag ? ` [${guild.tag}]` : ""}`)}**`,
            thumbnail: bot.skin(player.uuid),
            icon: bot.assets.hypixel.guild,
            color: player.plusColor.hex,
            footer: true
        }

        let pages = [
            {
                author: "Guild Overall Stats",
                // thumbnail: `https://hypixel.paniek.de/guild/${guild.id || guild._id}/banner.png`,
                fields: [
                    { name: "Guild", value: `[\`${guild.name}\`](https://plancke.io/hypixel/guild/name/${encodeURI(guild.name)})`, options: { escapeFormatting: true } },
                    { name: "Guild Rank", value: `${member.rank}${rank.tag ? ` [${rank.tag}]` : ""}` },
                    { name: "Total Quest Participation", value: member.quest_participation },
                    // { options: { blank: true, inline: true } },
                    { name: "Daily Experience History", value: GEXPFormatted.join(""), options: { inline: true, escapeFormatting: true }, },
                    { name: "\u200B", value: weeklyGEXP.join(""), options: { inline: true, escapeFormatting: true } },
                    { name: "Join Date", value: `<t:${Math.floor(member.joined / 1000)}:f> (<t:${Math.floor(member.joined / 1000)}:R>)`, options: { inline: false, escapeFormatting: true } },
                ]
            }
        ]

        const embeds = bot.pageEmbedMaker(embed, pages)
        bot.sendPages(interaction, embeds)

    },
    async execute(message, args, bot) {
        var { name, page } = await bot.argFormatter(message.author.id, args, [])
        let player = await bot.wrappers.hypixelPlayer.get(name)

        const errorCheck = bot.playerErrorCheck(player)
        if (errorCheck) return bot.sendErrorEmbed(message, errorCheck)
        let user = await bot.getUser({ uuid: player.uuid }) || {}
        let requestUser = await bot.getUser({ id: message.author.id }) || {}
        const emoji = user.emoji || ""
        const guild = args ? await bot.wrappers.hypixelGuild.get(encodeURI(player.uuid), "player", true) : await bot.wrappers.hypixelGuild.get(encodeURI(user.uuid), "player", true)

        if (guild.exists == false) return bot.sendErrorEmbed(message, `This user is not in a guild.`)
        if (guild.outage) return bot.sendErrorEmbed(message, `There is a Hypixel API Outage, please try again within a few minutes`);
        var member = (guild.members || []).find(member => member.uuid == player.uuid)
        var rank = (guild.ranks || []).find(r => r.name == member.rank)

        if (!rank) rank = { tag: "GM" }

        var GEXPFormatted = [];
        var weeklyExp = [];
        var dates = Object.keys(member.expHistory || {}).map(e => ({ key: e, date: new Date(`${e} EST`).setHours(0, 0, 0) }));

        var dailyPos = 1
        var weeklyPos = 1
        // var monthlyPos = 1

        let weeklyAverage = Object.entries(member.expHistory).reduce((p, c) => p + c[1], 0) / 7;
        for (var n = 0; n < 7; n++) {
            var dailyPos = 1
            guild.members.forEach(otherMember => { if (otherMember.expHistory[dates[n].key] > member.expHistory[dates[n].key]) dailyPos++ })
            GEXPFormatted[n] = `\`•\` ${Moment(dates[n].date).format('MMM. Do')}: **${member.expHistory[dates[n].key].toLocaleString()}** \`[#${dailyPos}/${guild.members.length}]\`\n`
            weeklyExp.push(member.expHistory[dates[n].key])
        }

        GEXPFormatted.push(`\`•\` Daily Average: **${Math.floor(weeklyAverage).toLocaleString()}**`)
        guild.members.forEach(otherMember => {
            if (otherMember.weekly > member.weekly) weeklyPos++
            // if (otherMember.monthly > member.monthly) monthlyPos++
        })

        let weeklyGEXP = [
            `\`•\` Weekly: **${(member.weekly || 0).toLocaleString()}** \`[#${weeklyPos}/${guild.members.length}]\`\n`,
            // `\`•\` Monthly: **${(member.monthly || 0).toLocaleString()}** \`[#${monthlyPos}/${guild.members.length}]\`\n`
        ]

        const embed = {
            description: `**${Discord.Util.escapeMarkdown(`${emoji} ${player.emojiRank} ${player.displayname}${guild.tag ? ` [${guild.tag}]` : ""}`)}**`,
            thumbnail: bot.skin(player.uuid),
            icon: bot.assets.hypixel.guild,
            color: player.plusColor.hex,
            footer: true
        }

        let pages = [
            {
                author: "Guild Overall Stats",
                // thumbnail: `https://hypixel.paniek.de/guild/${guild.id || guild._id}/banner.png`,
                fields: [
                    { name: "Guild", value: `[\`${guild.name}\`](https://plancke.io/hypixel/guild/name/${encodeURI(guild.name)})`, options: { escapeFormatting: true } },
                    { name: "Guild Rank", value: `${member.rank}${rank.tag ? ` [${rank.tag}]` : ""}` },
                    { name: "Total Quest Participation", value: member.quest_participation },
                    // { options: { blank: true, inline: true } },
                    { name: "Daily Experience History", value: GEXPFormatted.join(""), options: { inline: true, escapeFormatting: true }, },
                    { name: "\u200B", value: weeklyGEXP.join(""), options: { inline: true, escapeFormatting: true } },
                    { name: "Join Date", value: `<t:${Math.floor(member.joined / 1000)}:f> (<t:${Math.floor(member.joined / 1000)}:R>)`, options: { inline: false, escapeFormatting: true } },
                ]
            }
        ]

        const embeds = bot.pageEmbedMaker(embed, pages)
        bot.sendPages(message, embeds)

    }



}