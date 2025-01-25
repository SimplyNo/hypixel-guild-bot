
module.exports = {
    name: "guildMemberAdd",
    async execute(bot, member) {
        if (member.guild.id == bot.supportServer.id && bot.isProduction()) {
            let welcome = await bot.parseChannel(bot.supportServer.welcome, member.guild);
            if (welcome) {
                welcome.send(`Welcome ${member} to the Hypixel Guild Discord Bot server! Enjoy your stay :)`)
            }
            member.roles.add('699073207000367196')
        }
        let serverConf = await bot.config.getConfigAsObject(member.guild.id);
        if (serverConf.welcome.channel && serverConf.welcome.message) {
            let welcomeChannel = await bot.parseChannel(serverConf.welcome.channel, member.guild);
            if (welcomeChannel) {
                welcomeChannel.send({
                    content: serverConf.welcome.message.replace(/{member}/gim, member.toString())
                })
            }
        }

        let user = await bot.getUser({ id: member.id });
        let verificationRole = await bot.parseRole(serverConf.verification.role, member.guild);
        if (user && verificationRole) {
            let logChannel = await bot.parseChannel(serverConf.autoRole.logChannel, member.guild);
            await member.roles.fetch();
            await member.roles.add(serverConf.verification.role);
            bot.autoUpdateInterval.execute(member, serverConf, bot, true)
            if (logChannel) {
                const player = await bot.wrappers.hypixelPlayer.get(user.uuid);

                logChannel.send({ embeds: [bot.createEmbed().setAuthor(`Verification → Role Changes`, member.user.avatarURL()).setDescription(`${member} joined and was already verified as ${player.emojiRank} **${player.displayname}** and was given the <@&${serverConf.verification.role}> role.`).setTimestamp()] })
            }
        }
    }
}