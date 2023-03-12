const { execute } = require("./messageCreate");

module.exports = {
    name: "guildCreate",
    async execute(bot, guild) {
        bot.log(`&1[GUILD ADD] &bThe bot has been added to &6${guild.name}&b!`);

        let settings = await bot.config.getConfigAsObject(guild.id)
        const channel = await guild.channels.cache.find(channel => channel.type === 'text' && channel.permissionsFor(guild.me).has('SEND_MESSAGES'))
        if (channel) bot.createEmbed().setTitle(`🎉 Thanks for adding Hypixel Guild Bot!`)
            .setDescription(`Hey there! To get started use \`${settings.prefix}help\` to get a list of commands!\nIf you want to just jump in try using \`${settings.prefix}guild Rebel\`. \n\nTry verifying yourself, by using \`${settings.prefix}verify [IGN]\`, to use quick commands like \`${settings.prefix}member\` without having to input your username.\n\nTo set up the bot's **autorole features**, go ahead and try \`${settings.prefix}autorole\`.\n\n**Useful links**:\n[Support Discord Server](https://discord.gg/BgWcvKf)\n[Bot Invite](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot)`)
            .setThumbnail(bot.user.avatarURL())
            .send(channel)
    }
}