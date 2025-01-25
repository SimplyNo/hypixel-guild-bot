const { SlashCommandBuilder } = require('@discordjs/builders');
module.exports = {
    name: "invite",
    type: "info",
    slash: new SlashCommandBuilder()
        .setName('invite').setDescription('Invite the bot to your server!'),
    async run(interaction, { serverConf }, bot) {
        interaction.user.send({ embeds: [bot.createEmbed(`Bot Invite`).setDescription(`To invite the bot to your own server, [click here](https://discord.com/oauth2/authorize?client_id=${bot.user.id}&permissions=469888080&scope=bot).`)] })
        interaction.reply(`:envelope: An invite has been sent to your DMs!`)
    }
}