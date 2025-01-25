const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: "update",
    description: "Force update yourself.",
    cooldown: 3,
    slash: new SlashCommandBuilder()
        .setName("update")
        .setDescription("Force update yourself."),
    async run(interaction, { serverConf }, bot) {
        await interaction.deferReply();
        await bot.autoUpdateInterval.execute(interaction.member, serverConf, bot, true);
        if (serverConf.autoRole.guild) {
            await bot.autoRoleInterval.interval(bot, interaction.guild);
        }
        return bot.replyGracefully(interaction, `Your nickname and Hypixel rank roles have been manually updated. (Based on **RankRoles** and **Verification Config**)\n\n**NOTE:** The bot automatically updates users who sends messages in the server!`)
    }
}