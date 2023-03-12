const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js')

module.exports = {
  name: 'unverify',
  aliases: ['unlink'],
  description: 'Allows for users to unlink their account',
  usage: '',
  example: '',
  cooldown: 3,
  slash: new SlashCommandBuilder()
    .setName('unverify')
    .setDescription("Allows for users to unlink their account"),
  async run(interaction, { serverConf }, bot) {
    // await interaction.deferReply();
    await interaction.deferReply();

    let user = await bot.getUser({ id: interaction.user.id })
    let verificationDeleteTimeout = serverConf.verification.deleteTimeout;

    if (!user) {
      var embed = bot.createEmbed(interaction)
        .setAuthor(`❌ Unverification Error`)
        .setColor(bot.color)
        .setDescription(`Your Discord is not linked with an account.`)
        .send().then(msg => {
          if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch(); }, verificationDeleteTimeout * 1000)

        })
    } else {
      let player = await bot.wrappers.hypixelPlayer.get(user.uuid);
      await bot.removeUser({ id: interaction.user.id })
      var embed = bot.createEmbed(interaction)
        .setAuthor(`✅ Unverification Successful`)
        .setColor(bot.color)
        .setDescription(`Successfully unlinked from ${player.emojiRank} **${player.displayname}**`)
        .send().then(async (msg) => {
          if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch(); }, verificationDeleteTimeout * 1000)


          if (serverConf.verification.autoNick) {
            interaction.member.setNickname(interaction.user.username).catch(e => bot.log(`&4Couldn't unick user because mssing perms.`));
          }

          bot.autoUpdateInterval.execute(interaction.member, serverConf, bot, true)

          if (serverConf.verification.role) {
            let logChannel = await bot.parseChannel(serverConf.autoRole.logChannel, interaction.guild);
            if (logChannel) logChannel.send({ embeds: [bot.createEmbed().setAuthor(`Verification → Role Changes`, interaction.user.avatarURL()).setDescription(`${interaction.member} unverified as ${player.emojiRank} **${player.displayname}** and was removed from the <@&${serverConf.verification.role}> role.`).setTimestamp()] })
          }
          if (serverConf.autoRole.guild) {
            bot.autoRoleInterval.interval(bot, interaction.guild);

          }
        })
    }
  }
}