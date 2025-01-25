const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'support',
    aliases: ['supportserver', 'supportdiscord', 'discord'],
    type: "info",
    slash: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Join the bot\'s support server.'),
    run(interaction, { serverConf }, bot) {
        bot.createEmbed(interaction)
            .setTitle(`Support Server`)
            .setDescription(`To report bugs, give a suggestion, or hang out, join our support server by [clicking here](https://discord.gg/BgWcvKf).`).send()

    }
}