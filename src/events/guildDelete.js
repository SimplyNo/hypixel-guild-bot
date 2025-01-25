
module.exports = {
    name: "guildDelete",
    async execute(bot, guild) {
        if (guild.name) {
            bot.log(`&4[GUILD DELETE] &cThe bot has been removed from &6${guild.name}&c... :'(`);
            // bot.config.deleteServer(guild.id)
        }
    }
}