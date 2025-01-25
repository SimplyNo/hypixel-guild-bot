const Discord = require('discord.js')

module.exports = {
    name: "forceunverify",
    aliases: ["ufv", "fuv"],
    description: 'Allows our development team to forcefully unlink a user to a minecraft account',
    usage: '[USER | USER ID] [IGN]',
    example: '370440034987409419 gamerboy80',
    devOnly: true,
    async execute(message, args, bot) {
        const user = args[0];
        const requestUser = await bot.getUser({ id: message.author.id }) || {} || {}

        if (!(await bot.getUser({ id: user }))) {
            var embed = bot.createEmbed(message)
                .setAuthor(`Verification Error`, bot.assets.error)
                .setColor(bot.color)
                .setDescription(`<:cross:746448664347803648> Their discord is not linked with an account.`)
                .send()
        }
        bot.removeUser({ id: user })
        var fetched = await bot.users.fetch(user)
        var embed = bot.createEmbed(message)
            .setAuthor(`Unverification Successful`, bot.assets.check)
            .setColor(bot.color)
            .setDescription(`<:Check:737967744976289802> Successfully unlinked \`${fetched ? `${fetched.username}#${fetched.discriminator}` : user}\`'s account!`)
            .send()
        return message.channel.send({ embeds: [embed] })
    }
}