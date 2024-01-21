const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js')

module.exports = {
    name: "verify",
    aliases: ["link", "v", "connect", "register"],
    description: "Links your Hypixel account with your Discord account.",
    usage: '[IGN]',
    example: 'gamerboy80',
    cooldown: 3,
    slash: new SlashCommandBuilder()
        .setName('verify')
        .setDescription("Links your Hypixel account with your Discord account.")
        .addStringOption(option =>
            option
                .setName("username")
                .setDescription("The username of the player you want to link your account with.")
                .setRequired(true)
        ),
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {*} args 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        await interaction.deferReply();
        const username = interaction.options.getString('username', true);
        let verificationDeleteTimeout = serverConf.verification.deleteTimeout;
        if (serverConf.verification.channel && interaction.channel.id !== serverConf.verification.channel) return interaction.followUp(`Verification is only enabled in <#${serverConf.verification.channel}>!`);
        // console.log(Number(interaction.user?.discriminator) ? (player.socialMedia.links.DISCORD == interaction.user.tag) : (player.socialMedia.links.DISCORD == interaction.username))        

        if (await bot.getUser({ id: interaction.user.id })) {
            return embed = bot.createEmbed(interaction)
                .setAuthor(`❌ Verification Error`)
                .setColor(bot.color)
                .setDescription(`Your Discord is already linked with an account! You can use \`${interaction.prefix}unverify\` to unlink.`)
                .send().then(msg => {
                    if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch(); }, verificationDeleteTimeout * 1000)
                })
        }
        // if (!args.length) return bot.createErrorEmbed(interaction).setDescription("You need to provide a username to verify as!").send().then(msg => {
        //     if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch(); ; }, verificationDeleteTimeout * 1000)
        // });
        const player = await bot.wrappers.hypixelPlayer.get(username);
        const requestUser = await bot.getUser({ id: interaction.user.id }) || {}

        if (!player || player.exists == false) return bot.sendErrorEmbed(interaction, "Please specify a valid username or uuid.").then(msg => {
            if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch(); }, verificationDeleteTimeout * 1000)
        })
        else if (player.outage == true) return bot.sendErrorEmbed(interaction, "There is currently a Hypixel API Outage, responses may be slower or nonexistent").then(msg => {
            if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch(); }, verificationDeleteTimeout * 1000)
        })

        if (!player.socialMedia || !player.socialMedia.links || !player.socialMedia.links.DISCORD) {
            var embed = bot.createEmbed(interaction)
                .setAuthor(`❌ Verification Error`)
                .setColor(bot.color)
                .setDescription(`This username does not have their Discord account linked on Hypixel!`)
                .setImage(`https://i.imgur.com/8ILZ3LX.gif`).send().then(msg => {
                    if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch();; }, verificationDeleteTimeout * 1000)
                })
        } else if (Number(interaction.user?.discriminator) ? (player.socialMedia.links.DISCORD == interaction.user.tag) : (player.socialMedia.links.DISCORD.toLowerCase() == interaction.user.username)) {
            await bot.addUser(interaction.user.id, player.uuid);
            var embed = bot.createEmbed(interaction)
                .setAuthor(`✅ Verification Successful`)
                .setColor(bot.color)
                .setDescription(`Successfully linked your account with ${player.emojiRank} **${player.displayname}**!`).send().then(async (msg) => {
                    if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch();; }, verificationDeleteTimeout * 1000)



                    bot.autoUpdateInterval.execute(interaction.member, serverConf, bot, true)

                    if (serverConf.verification.role) {
                        let logChannel = await bot.parseChannel(serverConf.autoRole.logChannel, interaction.guild);
                        await interaction.member.roles.add(serverConf.verification.role);
                        if (logChannel) logChannel.send({ embeds: [bot.createEmbed().setAuthor(`Verification → Role Changes`, interaction.user.avatarURL()).setDescription(`${interaction.member} sucessfully verified as ${!requestUser.emojiRanks || requestUser.emojiRanks == "true" ? player.emojiRank : player.rank} **${player.displayname}** and was given the <@&${serverConf.verification.role}> role.`).setTimestamp()] })
                    }
                    if (serverConf.autoRole.guild) {
                        bot.autoRoleInterval.interval(bot, interaction.guild);
                    }
                })
        } else {
            var embed = bot.createEmbed(interaction)
                .setAuthor(`❌ Verification Error`)
                .setColor(bot.color)
                .setDescription(`Your discord (\`${Number(interaction.user?.discriminator) ? (interaction.user.tag) : (interaction.user.username)}\`) does not match the one linked with your account! (\`${player.socialMedia.links.DISCORD}\`)`)
                .setImage(`https://i.imgur.com/8ILZ3LX.gif`).send().then(msg => {
                    if (verificationDeleteTimeout) setTimeout(() => { msg.delete().catch(); }, verificationDeleteTimeout * 1000)
                })
        }
    }
}