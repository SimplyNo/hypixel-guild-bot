const { Client, Interaction, ButtonInteraction, Modal, TextInputComponent, MessageActionRow } = require("discord.js");
const validReqs = require('../../valid-requirements.json');
module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {Client} bot 
     * @param {ButtonInteraction} button 
     */
    async execute(bot, button) {
        if (!button.isButton()) return;
        if (!button.customId.startsWith('verify-')) return;
        const serverConf = await bot.config.getConfigAsObject(button.guild.id);
        const verifyMessageID = serverConf?.verifyMessage?.messageID;
        if (verifyMessageID !== button.message.id) return;
        button.showModal(new Modal()
            .setCustomId('verify')
            .setTitle('Verification')
            .addComponents([
                new MessageActionRow()
                    .addComponents(
                        new TextInputComponent()
                            .setCustomId('username')
                            .setPlaceholder('Your Minecraft Username')
                            .setStyle('SHORT')
                            .setLabel('Username')
                            .setMinLength(1)
                            .setMaxLength(16)
                            .setRequired(true)
                    )
            ]))
        button.awaitModalSubmit({ time: 60000 }).then(async (modal) => {
            const username = modal.components[0].components[0].value;
            const player = await bot.wrappers.hypixelPlayer.get(username);
            const requestUser = await bot.getUser({ id: button.user.id }) || {}
            if (requestUser?.uuid) {
                embed = bot.createEmbed()
                    .setAuthor(`❌ Verification Error`)
                    .setColor(bot.color)
                    .setDescription(`Your Discord is already linked with an account! You can use \`/unverify\` to unlink.`)
            }
            else if (!player || player.exists == false) embed = bot.createEmbed().setDescription("Please specify a valid username or uuid.")
            else if (player.outage == true) embed = bot.createEmbed().setDescription("There is currently a Hypixel API Outage, responses may be slower or nonexistent")
            else if (!player.socialMedia || !player.socialMedia.links || !player.socialMedia.links.DISCORD) {
                var embed = bot.createEmbed(button)
                    .setAuthor(`❌ Verification Error`)
                    .setColor(bot.color)
                    .setDescription(`This username does not have their Discord account linked on Hypixel! Please follow the directions below to link your account:\n\n**1.** Log on to Hypixel and type \`/profile\`\n**2.** Click on "Social Medias"\n**3.** Click on "Discord"\n**4.** Type the following in the chat: **\`${Number(button.user.discriminator) ? button.user.tag : button.user.username}\`**\n**5.** Use \`/verify ${player.displayname}\` again to verify!\n\n_Having trouble verifying? Join [our support server](https://discord.gg/BgWcvKf)!_`)
            } else if (Number(button.user?.discriminator) ? (player.socialMedia.links.DISCORD == button.user.tag) : (player.socialMedia.links.DISCORD.toLowerCase() == button.user.username)) {
                await bot.addUser(button.user.id, player.uuid);
                var embed = bot.createEmbed(button)
                    .setAuthor(`✅ Verification Successful`)
                    .setColor(bot.color)
                    .setDescription(`Successfully linked your account with ${player.emojiRank} **${player.displayname}**!`)
                bot.autoUpdateInterval.execute(button.member, serverConf, bot, true)

                if (serverConf.verification.role) {
                    let logChannel = await bot.parseChannel(serverConf.autoRole.logChannel, button.guild);
                    await button.member.roles.add(serverConf.verification.role);
                    if (logChannel) logChannel.send({ embeds: [bot.createEmbed().setAuthor(`Verification → Role Changes`, button.user.avatarURL()).setDescription(`${button.member} sucessfully verified as ${!requestUser.emojiRanks || requestUser.emojiRanks == "true" ? player.emojiRank : player.rank} **${player.displayname}** and was given the <@&${serverConf.verification.role}> role.`).setTimestamp()] })
                }
                if (serverConf.autoRole.guild) {
                    bot.autoRoleInterval.interval(bot, button.guild);
                }

            } else {
                var embed = bot.createEmbed(button)
                    .setAuthor(`❌ Verification Error`)
                    .setColor(bot.color)
                    .setDescription(`Your discord does not match the one linked with your account! (\`${player.socialMedia.links.DISCORD}\`) Please follow the directions below to link your account:\n\n **1.** Log on to Hypixel and type \`/profile\`\n**2.** Click on "Social Medias"\n**3.** Click on "Discord"\n**4.** Type the following in the chat: **\`${Number(button.user.discriminator) ? button.user.tag : button.user.username}\`**\n**5.** Use \`/verify ${player.displayname}\` again to verify!\n\n_Having trouble verifying? Join [our support server](https://discord.gg/BgWcvKf)!_`)
            }
            modal.reply({ embeds: [embed], ephemeral: true })

        })
    }
}
