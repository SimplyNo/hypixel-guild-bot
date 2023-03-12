const Discord = require('discord.js')

module.exports = {
    name: "forceverify",
    aliases: ["fv"],
    description: 'Allows our development team to forcefully link a user to a minecraft account',
    usage: '[USER | USER ID] [IGN]',
    example: '370440034987409419 gamerboy80',
    devOnly: true,
    async execute(message, args, bot) {
        if (!args[0] || !args[1]) return bot.createEmbed(message).setDescription(`Missing Arguments \`[DiscordID] [Username]\``).send()
        const user = args[0]
        const player = await bot.wrappers.hypixelPlayer.get(args[1])
        const requestUser = await bot.getUser({ id: message.author.id }) || {} || {}
        if (!user) return bot.createEmbed(message).setDescription(`Invalid User ID`).send()
        if (player.exists == false) return bot.sendErrorEmbed(message, "Please specifiy a valid username or uuid.")
        else if (player.outage == true) return bot.sendErrorEmbed(message, "There is currently a Hypixel API Outage, responses may be slower or nonexistent")

        if (await bot.getUser({ id: user })) {
            await bot.removeUser({ id: user });
            console.log("Already Linked.")
        }
        var fetched = bot.users.cache.find(u => u.tag == user) || (await bot.users.fetch(user).catch(e => null));

        if (fetched) {
            bot.addUser(fetched.id, player.uuid)
            var embed = bot.createEmbed(message)
                .setAuthor(`Verification Successful`, bot.assets.check)
                .setColor(bot.color)
                .setThumbnail(await bot.skin(player.uuid))
                .setDescription(`<:Check:737967744976289802> Successfully linked \`${fetched ? `${fetched.username}#${fetched.discriminator}` : user}\`'s account with ${!requestUser.emojiRanks || requestUser.emojiRanks == "true" ? player.emojiRank : player.rank} **${player.displayname}**!`)
                .setFooter("ID: " + fetched.id)
                .send()

        } else {
            bot.createErrorEmbed(message)
                .setDescription(`Could not find user: \`${user}\`.`)
                .send()
        }
    }
}