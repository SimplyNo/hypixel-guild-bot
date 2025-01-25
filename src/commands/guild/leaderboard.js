const { SlashCommandBuilder } = require('@discordjs/builders');
const Canvas = require('canvas');
const chalk = require('chalk');
const { MessageEmbed, DiscordAPIError, MessageAttachment } = require('discord.js');

module.exports = {
    name: "leaderboard",
    aliases: ["lb", "glb"],
    cooldown: 5,
    description: "Show leaderboard stats of a guild.",
    usage: '<GUILD | -p IGN | @User>',
    example: "Lucid",
    type: 'guild',
    autoPost: true,
    async execute(message, args, bot) {
        const command = async () => {

            if (!message.channel.permissionsFor(message.guild.me).has(['SEND_MESSAGES', "ADD_REACTIONS", "MANAGE_MESSAGES", "ATTACH_FILES"])) {
                console.log(chalk.red(`[INVITE ERR] ${message.guild.name} invited the bot with missing perms`))
                return message.channel.send(`${bot.assets.emotes.other.cross} Hypixel Guild Bot has been added with the incorrect permissions. Please **reinvite** with administrator (g!invite) **OR** you can assign the following permissions:\n\n\`+\` **SEND_MESSAGES**\n\`+\` **ADD_REACTIONS**\n\`+\` **MANAGE_MESSAGES**\n\`+\` **ATTACH_FILES**`).catch(e => {
                    console.log(chalk.red(`[INVITE ERR] ${message.guild.name} could not send invite error message.`))
                })
            }

            let user = await bot.getUser({ id: message.author.id });

            if (args[0] == "-p") {
                if (!args[1]) return bot.sendErrorEmbed(message, `You did not include a user to check the guild of`)
                var guild = await bot.wrappers.slothpixelGuild.get(encodeURI(args[1]), "player")
            } else {
                if (!args[0]) {
                    if (!user) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    var guild = await bot.wrappers.slothpixelGuild.get(encodeURI(user.uuid), "player")
                } else if (args[0].match(/<@.?[0-9]*?>/)) {
                    var mentionedID = args[0].replace(/!/g, '').slice(2, -1)
                    var mentioned = await bot.getUser({ id: mentionedID })
                    var guild = await bot.wrappers.slothpixelGuild.get(encodeURI(mentioned.uuid), "playe=")
                } else var guild = await bot.wrappers.slothpixelGuild.get(encodeURI(args.join(" ")), "name")
            }

            if (guild.exists == false) return bot.sendErrorEmbed(message, `We couldn't find a guild with the information you gave us.`)
            if (guild.outage) return bot.sendErrorEmbed(message, `There is a Hypixel API Outage, please try again within a few minutes`)

            const guildLeaderboard = await bot.wrappers.statsifyLb.get(guild.id)
            var guilds = []

            var index = guildLeaderboard.findIndex(item => item.name == guild.name)
            if (index == -1) return bot.sendErrorEmbed(message, `We couldn't fetch the leaderboard position of the guild you gave us as it's not in the top 1000 guilds.`)

            for (var x = 0, guildsAbove = 3, guildsBelow = 3; x < 3; x++) {
                if ((index - x) < 0) guildsAbove--, guildsBelow++
                if ((index + x) > (guildLeaderboard.length - 1)) guildsBelow--, guildsAbove++
            }

            guilds.push(guildLeaderboard[index])
            for (var x = 1; x < guildsBelow; x++) guilds.push(guildLeaderboard[index + x])
            for (var x = 1; x < guildsAbove; x++) guilds.unshift(guildLeaderboard[index - x])

            const canvas = Canvas.createCanvas(1700, 900)
            const ctx = canvas.getContext('2d');

            const guildLBimage = await Canvas.loadImage("https://statsify.net/img/profiles/guildLB.png")
            ctx.drawImage(guildLBimage, 0, 0, canvas.width, canvas.height)

            guilds.forEach((item, guildIndex) => {
                var index = guildLeaderboard.findIndex(i => i.name == item.name)
                bot.printText(canvas, `§e${item.position.toLocaleString()}. ${item.name.toLowerCase() == guild.name.toLowerCase() ? "§l" : ""}§6${item.name}§r §7- §e${item.level} §a(${item.exp.toLocaleString()}) §c${guildLeaderboard[index - 1] ? `-${(Number(guildLeaderboard[index - 1].exp) - Number(item.exp)).toLocaleString()}` : ""}`, { size: 48, x: 195, y: 400 + (guildIndex * 65) })
            })

            if (message.autoPost) {
                let attachment = new MessageAttachment(canvas.toBuffer(), "image.png")
                let embed = bot.createEmbed(message)
                    .setImage(`attachment://image.png`)
                message.reply({ embeds: [embed], files: [attachment] })
            } else {
                message.reply({ files: [canvas.toBuffer()] })
            }
        }
        command()

    }
};