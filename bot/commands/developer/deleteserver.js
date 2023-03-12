module.exports = {
    name: "deleteserverconfig",
    aliases: ["dsc"],
    devOnly: true,
    execute(message, args, bot) {
        let guildid = (!args[0] || args[0] == "this") ? message.guild.id : args[0];

        bot.config.deleteServer(guildid).then(() => {
            message.channel.send("Server config deleted.")
        })
    }
}