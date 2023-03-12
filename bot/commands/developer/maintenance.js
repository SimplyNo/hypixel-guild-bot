module.exports = {
    name: "maintenance",
    aliases: ['maintenance', 'bottoggle'],
    devOnly: true,
    execute(message, args, bot) {
        let reason = args.join(' ');
        let toggle = bot.toggleMaintenance(reason);
        if (toggle) {
            bot.createEmbed(message).setTitle(`:warning: Maintenance ON`).setDescription(`Maintenance Mode has been ENABLED.`).send()
        } else {
            bot.createEmbed(message).setTitle(`:warning: Maintenance OFF`).setDescription(`Maintenance Mode has been DISABLED.`).send()

        }
    }

}