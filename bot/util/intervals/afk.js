module.exports = {
    async interval(bot, specific) {
        let users = specific ? [specific] : await bot.getAllAfk();

        users.forEach(async user => {
            let status = await bot.wrappers.hypixelStatus.get(user.uuid);
            if (status.outage) return;
            if (status.success && (!status.session.online || status.session.mode.toLowerCase() == "lobby" || status.session.mode.toLowerCase() == "hub")) {
                await bot.removeAfk({ id: user.id })
                console.log(user)

                let difference = Date.now() - user.startTime;
                diff = Math.floor(difference / 1000);
                var secs = diff % 60;
                diff = Math.floor(diff / 60);
                var mins = diff % 60;
                diff = Math.floor(diff / 60);
                var hours = diff % 24;
                diff = Math.floor(diff / 24);
                let User = await bot.users.fetch(user.id);
                User.send({embeds: [bot.createEmbed().setTitle(":warning: Session stopped!", User.avatarURL()).setDescription(`Current Gamemode: **${status.session.online ? status.session.mode : "OFFLINE"}**\nYou are no longer in game!\n\n:stopwatch: Your session lasted **${hours} hours, ${mins} minutes, and ${secs} seconds**!`)]})
                    .catch(e => {
                        console.log("[Error] Unable to AFK warning messages to " + User.tag)
                    })
            }
        })
    },
    beginInterval(bot) {
        this.currentInterval = setInterval(() => {
            this.interval(bot);
        }, 120 * 1000)
    }
}