const Discord = require("discord.js")
module.exports = {
    name: "monthly",
    aliases: ["month"],
    cooldown: 5,
    description: "Monthly GEXP leaderboard of a guild [BETA]",
    usage: '<GUILD | -p IGN | @USER> [>=|<=|==|all|NUMBER] [<REQUIREMENT>]',
    example: "Lucid all",
    type: 'guild',
    autoPost: true,

    async execute(message, args, bot) {
        
        const command = async () => {
            let user = await bot.getUser({ id: message.author.id });

            var memberCount, gexpReq, gexpOperator;

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

            if (!gexpReq || !gexpOperator){
                gexpReq = 0; 
                gexpOperator = ">=";
            }

            if (args[0] == "-p") {
                if (!args[1]) return bot.sendErrorEmbed(message, `You did not include a user to check the guild of`)
                var guild = await bot.wrappers.statsifyGuild.get(encodeURI(args[1]), "player")
            } else {
                if (!args[0]) {
                    if (!user) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    var guild = await bot.wrappers.statsifyGuild.get(encodeURI(user.uuid), "player")
                } else if (args[0].match(/<@.?[0-9]*?>/)) {
                    var mentionedID = args[0].replace(/!/g, '').slice(2, -1)
                    var mentioned = await bot.getUser({ id: mentionedID })
                    if (!mentioned) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    var guild = await bot.wrappers.statsifyGuild.get(encodeURI(mentioned.uuid), "player")
                } else var guild = await bot.wrappers.statsifyGuild.get(encodeURI(args.join(" ")), "name")
            }

            if (guild.exists == false) return bot.sendErrorEmbed(message, `We couldn't find a guild with the information you gave us.`)
            if (guild.outage) return bot.sendErrorEmbed(message, `There is a Hypixel API Outage, please try again within a few minutes`)
            
            var gexp = {}

            const embed = {
                title: `Top ${memberCount} Monthly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`,
                url: `https://plancke.io/hypixel/guild/name/${encodeURI(guild.name)}`,
                icon: bot.assets.hypixel.guild,
                color: guild.tagColor.hex,
                footer: true
            }

            let pages = []

            guild.members = guild.members.filter(member => eval(`${member.monthly} ${gexpOperator} ${gexpReq}`))
            if (memberCount == "all" || memberCount > guild.members.length) memberCount = guild.members.length

            gexp["monthly"] = guild.expHistory.monthly
            gexp["monthlyScaled"] = guild.scaledExpHistory.monthly

            pages[0] = {}
            pages[0].fields = []
            var players = []

            pages[0].author = "Guild Monthly GEXP"
            pages[0].title = `Top ${memberCount} Monthly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`
            pages[0].description = `\`\`\`CSS\nShowing results for ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""} Top ${memberCount} Monthly GEXP\`\`\`\n\`\`\`js\nTotal RAW Monthly GEXP: ${(gexp["monthly"] || 0).toLocaleString()}\nTotal SCALED Monthly GEXP: ${(gexp["monthlyScaled"] || 0).toLocaleString()} (Approximated)\`\`\``

            guild.members.sort((a, b) => b.monthly - a.monthly)
            guild.members.forEach((member, index) => {
                if (index < memberCount) players.push(`\`#${index + 1}\` ${Discord.Util.escapeMarkdown(member.username || "Error")}: ${(member.monthly || 0).toLocaleString()}\n`)
            })

            var sliceSize = memberCount / 3;
            var list = Array.from({ length: 3 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))

            list.forEach((item, index) => {
                if (item.length === 0) return;
                pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
            })

            var secPage = false

            pages[0].fields.forEach(field => { if (field.value.length >= 1024) secPage = true})
            
            if (secPage){
                var sliceSize = memberCount / 6;
                var list = Array.from({ length: 6 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))
    
                list.forEach((item, index) => {
                    if (item.length === 0) return;
                    if (index > guild.members.length/2) pages[1].fields[index - 3] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                    else pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                })
            }

            const embeds = bot.pageEmbedMaker(embed, pages)
            bot.sendPages(message, embeds)
        }
        command()
        
    },
}