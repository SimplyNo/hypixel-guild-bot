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

        console.log((await bot.wrappers.mojangPlayer.get(user)).id)
        const mcUserLinked = (await bot.getUser({ uuid: (await bot.wrappers.mojangPlayer.get(user)).id }));
        const discordUserLinked = (await bot.getUser({ id: user }));

        if (!discordUserLinked && !mcUserLinked) {
            var embed = bot.createEmbed(message)
                .setAuthor(`Verification Error`, bot.assets.error)
                .setColor(bot.color)
                .setDescription(`<:cross:746448664347803648> Their discord is not linked with an account.`)
                .send()
        }
        if (discordUserLinked) bot.removeUser({ id: discordUserLinked.id });
        if (mcUserLinked) bot.removeUser({ uuid: mcUserLinked.uuid });
        var fetched = await bot.users.fetch((discordUserLinked || mcUserLinked)?.id)
        var embed = bot.createEmbed(message)
            .setAuthor(`Unverification Successful`, bot.assets.check)
            .setColor(bot.color)
            .setDescription(`<:Check:737967744976289802> Successfully unlinked \`${fetched ? `${fetched.username}#${fetched.discriminator}` : user}\`'s account!`)
        return message.channel.send({ embeds: [embed] })
    }
}