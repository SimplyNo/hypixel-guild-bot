const { SlashCommandBuilder } = require("@discordjs/builders");
const Discord = require("discord.js");
module.exports = {
    name: "weekly",
    aliases: ["pw", "pastweek", "w"],
    cooldown: 5,
    description: "Weekly GEXP leaderboard of a guild",
    usage: '<GUILD | -p IGN | @USER> [>=|<=|==|all|NUMBER] [<REQUIREMENT>]',
    example: "Lucid >= 50000",
    type: 'guild',
    autoPost: true,
    slash: new SlashCommandBuilder()
        .setName("weekly")
        .setDescription("Weekly GEXP leaderboard of a guild")
        .addStringOption(option =>
            option
                .setName('query')
                .setRequired(false)
                .setAutocomplete(true)
                .setDescription('Guild name or player name'))
        .addStringOption(option =>
            option
                .setName("count")
                .setDescription("The number of players to show"))
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription(`Whether to search by player or by guild name`)
                .setRequired(false)
                .addChoices({ name: "player", value: "player" }, { name: "guild", value: "guild" }))
        .addStringOption(option =>
            option
                .setName("filter")
                .setDescription("The GEXP filter. Examples: '>10000' for more than 10000 GEXP, '<1000' for less than 1000 GEXP")),
    async run(interaction, { serverConf }, bot) {
        await interaction.deferReply();

        const command = async () => {
            let user = await bot.getUser({ id: interaction.user.id });

            const query = interaction.options.getString("query", false);
            let memberCount = interaction.options.getString('count', false) ?? 15;
            const type = interaction.options.getString('type', false) ?? 'guild';
            const filter = interaction.options.getString('filter', false) ?? ">=0";
            if (type === 'guild' && query) {
                // set recently searched
                bot.addRecentSearch(interaction.user.id, query)
            }
            const check = filter.match(/^([<=>]{1,2}) ?(\d+)$/);
            if (!check || ![">=", ">", "<", "<=", "=="].includes(check[1])) return bot.createErrorEmbed(interaction).setDescription(`Malformed filter: \`${filter}\``).send();

            const gexpReq = check[2];
            const gexpOperator = check[1];

            let guild;
            if (!query && !user) return bot.createErrorEmbed(interaction).setDescription("To use this command without arguments, verify by doing `/verify [username]`!").send();
            else if (!query) guild = await bot.wrappers.hypixelGuild.get((user.uuid), 'player', true);
            else if (type === "player") guild = await bot.wrappers.hypixelGuild.get((query), 'player', true);
            else if (type === "guild") guild = await bot.wrappers.hypixelGuild.get((query), 'name', true);

            if (guild.exists == false && !query) return bot.createErrorEmbed(interaction).setDescription("You are not in a guild!").send();
            if (guild.exists == false && type === 'guild') return bot.sendErrorEmbed(interaction, `No guild was found with the name \`${query}\`!`)
            if (guild.exists == false && type === 'player') return bot.sendErrorEmbed(interaction, `The player \`${query}\` is not in a guild!`)
            if (guild.outage) return bot.sendErrorEmbed(interaction, `There is a Hypixel API Outage, please try again within a few minutes`)

            let gexp = {}

            const embed = {
                title: `Top ${memberCount} Weekly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`,
                url: `https://plancke.io/hypixel/guild/name/${encodeURI(guild.name)}`,
                icon: bot.assets.hypixel.guild,
                color: guild.tagColor.hex,
                footer: true
            }

            let pages = []

            guild.members = guild.members.filter(member => eval(`${member.weekly} ${gexpOperator} ${gexpReq}`))
            if (memberCount == "all" || memberCount > guild.members.length) memberCount = guild.members.length

            gexp["weekly"] = (Object.values(guild.expHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()
            gexp["weeklyScaled"] = (Object.values(guild.scaledExpHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()

            pages[0] = {}
            pages[0].fields = []
            let players = []

            pages[0].author = "Guild Weekly GEXP"
            pages[0].title = `Top ${memberCount} Weekly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`
            pages[0].description = `\`\`\`CSS\nShowing results for ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""} Top ${memberCount} Weekly GEXP\`\`\`\n\`\`\`js\nTotal RAW Weekly GEXP: ${(gexp["weekly"] || 0).toLocaleString()}\nTotal SCALED Weekly GEXP: ${(gexp["weeklyScaled"] || 0).toLocaleString()} (Approximated)\`\`\``

            guild.members.sort((a, b) => b.weekly - a.weekly)
            guild.members.forEach((member, index) => {
                if (index < memberCount) players.push(`\`#${index + 1}\` ${(user && user.uuid == member.uuid) ? "**" : ""}${(Date.now() - parseInt(member.joined)) < (7 * 24 * 60 * 60 * 1000) ? ' 🆕 ' : ''}${Discord.Util.escapeMarkdown(member.username || "Error")}: ${(member.weekly || 0).toLocaleString()}${(user && user.uuid == member.uuid) ? "**" : ""}\n`)
            })

            let sliceSize = memberCount / 3;
            let list = Array.from({ length: 3 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))

            list.forEach((item, index) => {
                if (item.length === 0) return;
                pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
            })

            let secPage = false

            pages[0].fields.forEach(field => { if (field.value.length >= 1024) secPage = true })

            if (secPage) {
                let sliceSize = memberCount / 6;
                let list = Array.from({ length: 6 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))

                list.forEach((item, index) => {
                    if (item.length === 0) return;
                    if (index > guild.members.length / 2) pages[1].fields[index - 3] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                    else pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                })
            }

            const embeds = bot.pageEmbedMaker(embed, pages)
            bot.sendPages(interaction, embeds)
        }
        command()

    },
    async execute(message, args, bot) {

        const command = async () => {
            let user = await bot.getUser({ id: message.author.id });

            let memberCount, gexpReq, gexpOperator;

            if (args[args.length - 2] && [">=", ">", "<", "<=", "=="].includes(args[args.length - 2])) {
                gexpOperator = args[args.length - 2]
                args.splice(args.length - 2, 1);
                if (args[args.length - 2] && ((Number(args[args.length - 2]) >= 1 && Number(args[args.length - 2]) <= 125) || args[args.length - 2].toLowerCase() == "all")) {
                    if (args[args.length - 2].toLowerCase() == "all") memberCount = "all"
                    else memberCount = Number(args[args.length - 2])
                    args.splice(args.length - 2, 1);
                } else memberCount = "all"
                if (args[args.length - 1] && isFinite(Number(args[args.length - 1]))) {
                    gexpReq = Number(args[args.length - 1])
                    args.pop()
                } else gexpReq = 0
            } else if (args[args.length - 1] && ((Number(args[args.length - 1]) >= 1 && Number(args[args.length - 1]) <= 125) || args[args.length - 1].toLowerCase() == "all")) {
                if (args[[args.length - 1]].toLowerCase() == "all") memberCount = "all"
                else memberCount = Number(args[args.length - 1])
                args.pop()
            } else memberCount = 15;

            if (!gexpReq || !gexpOperator) {
                gexpReq = 0;
                gexpOperator = ">=";
            }

            if (args[0] == "-p") {
                if (!args[1]) return bot.sendErrorEmbed(message, `You did not include a user to check the guild of`)
                let guild = await bot.wrappers.hypixelGuild.get((args[1]), "player", true)
            } else {
                if (!args[0]) {
                    if (!user) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    let guild = await bot.wrappers.hypixelGuild.get((user.uuid), "player", true)
                } else if (args[0].match(/<@.?[0-9]*?>/)) {
                    let mentionedID = args[0].replace(/!/g, '').slice(2, -1)
                    let mentioned = await bot.getUser({ id: mentionedID })
                    if (!mentioned) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    let guild = await bot.wrappers.hypixelGuild.get((mentioned.uuid), "player", true)
                } else var guild = await bot.wrappers.hypixelGuild.get((args.join(" ")), "name", true)
            }

            if (!guild || guild.exist == false) return bot.sendErrorEmbed(message, `We couldn't find a guild with the information you gave us.`)
            if (guild.outage) return bot.sendErrorEmbed(message, `There is a Hypixel API Outage, please try again within a few minutes`)

            let gexp = {}

            const embed = {
                title: `Top ${memberCount} Weekly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`,
                url: `https://plancke.io/hypixel/guild/name/${encodeURI(guild.name)}`,
                icon: bot.assets.hypixel.guild,
                color: guild.tagColor.hex,
                footer: true
            }

            let pages = []

            guild.members = guild.members.filter(member => eval(`${member.weekly} ${gexpOperator} ${gexpReq}`))
            if (memberCount == "all" || memberCount > guild.members.length) memberCount = guild.members.length

            gexp["weekly"] = (Object.values(guild.expHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()
            gexp["weeklyScaled"] = (Object.values(guild.scaledExpHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()

            pages[0] = {}
            pages[0].fields = []
            let players = []

            pages[0].author = "Guild Weekly GEXP"
            pages[0].title = `Top ${memberCount} Weekly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`
            pages[0].description = `\`\`\`CSS\nShowing results for ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""} Top ${memberCount} Weekly GEXP\`\`\`\n\`\`\`js\nTotal RAW Weekly GEXP: ${(gexp["weekly"] || 0).toLocaleString()}\nTotal SCALED Weekly GEXP: ${(gexp["weeklyScaled"] || 0).toLocaleString()} (Approximated)\`\`\``

            guild.members.sort((a, b) => b.weekly - a.weekly)
            guild.members.forEach((member, index) => {
                if (index < memberCount) players.push(`\`#${index + 1}\` ${(user && user.uuid == member.uuid) ? "**" : ""}${(Date.now() - parseInt(member.joined)) < (7 * 24 * 60 * 60 * 1000) ? ' 🆕 ' : ''}${Discord.Util.escapeMarkdown(member.username || "Error")}: ${(member.weekly || 0).toLocaleString()}${(user && user.uuid == member.uuid) ? "**" : ""}\n`)
            })

            let sliceSize = memberCount / 3;
            let list = Array.from({ length: 3 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))

            list.forEach((item, index) => {
                if (item.length === 0) return;
                pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
            })

            let secPage = false

            pages[0].fields.forEach(field => { if (field.value.length >= 1024) secPage = true })

            if (secPage) {
                let sliceSize = memberCount / 6;
                let list = Array.from({ length: 6 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))

                list.forEach((item, index) => {
                    if (item.length === 0) return;
                    if (index > guild.members.length / 2) pages[1].fields[index - 3] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                    else pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                })
            }

            const embeds = bot.pageEmbedMaker(embed, pages)
            bot.sendPages(message, embeds)
        }
        command()

    },
}