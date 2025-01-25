const { SlashCommandBuilder } = require("@discordjs/builders");
const { CommandInteraction } = require("discord.js");

module.exports = {
    name: "afk",
    aliases: ['afk'],
    cooldown: 5,
    description: "Keeps track of your current game session and notifies you when you are no longer in game.",
    usage: '<start | stop>',
    example: "stop",
    type: 'guild',
    slash: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Keeps track of your current game session and notifies you when you are no longer in game.')
        .addSubcommand(subcmd =>
            subcmd
                .setName('start')
                .setDescription('Begin AFK session'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('stop')
                .setDescription('End AFK session')),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} param1 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        const subcommand = interaction.options.getSubcommand()
        if (subcommand == 'start') {
            let user = await bot.getUser({
                id: interaction.user.id
            });
            if (!user) return bot.createErrorEmbed(interaction).setDescription(`You need to be verified to use the session command!\n\nUse \`${interaction.prefix}verify [Username]\` to verify yourself.`).send();
            let afkUser = await bot.getAfk({
                id: interaction.user.id
            });
            if (afkUser) {
                let stats = await bot.getAfk({
                    id: interaction.user.id
                });
                let difference = Date.now() - parseInt(stats.startTime);
                bot.afkInterval.interval(bot, afkUser);
                bot.createEmbed(interaction).setAuthor("Currently in game", interaction.user.avatarURL()).setDescription(`You have been in game for **${getDateString(difference)}**.`)
                    .send()
            } else {
                let data = await bot.wrappers.hypixelPlayer.get(user.uuid);
                if (data.outage) return bot.createAPIErrorEmbed(interaction).send();
                let username = data.displayname;

                await bot.setAfk(interaction.user.id, user.uuid);
                bot.createEmbed(interaction).setTitle("Success!").setDescription(`:white_check_mark: Your account, ${data.emojiRank} **${username}**'s game session has started.
                            \n:alarm_clock: You will be notified through DMs if you are no longer in game.`)
                    .send()
            }

        } else if (subcommand == "stop") {
            let stats = await bot.getAfk({
                id: interaction.user.id
            })
            if (!stats) {
                return bot.createErrorEmbed(interaction).setDescription(`You are not in a session!\n\nUse \`${interaction.prefix}session\` to begin one.`).send()
            }

            await bot.removeAfk({
                id: interaction.user.id
            });
            let difference = Date.now() - parseInt(stats.startTime);
            diff = Math.floor(difference / 1000);
            var secs = diff % 60;
            diff = Math.floor(diff / 60);
            var mins = diff % 60;
            diff = Math.floor(diff / 60);
            var hours = diff % 24;
            diff = Math.floor(diff / 24);

            bot.createEmbed(interaction).setTitle("Session stopped!", interaction.user.avatarURL()).setDescription(`You are no longer in session.\n\n:stopwatch: Your session lasted **${hours} hours, ${mins} minutes, and ${secs} seconds**.`)
                .send()
        }
    },
    async execute(message, args, bot) {
        if (!args.length || args[0].toLowerCase() == 'start') {
            let user = await bot.getUser({
                id: message.author.id
            });
            if (!user) return bot.createErrorEmbed(message).setDescription(`You need to be verified to use the session command!\n\nUse \`${message.prefix}verify [Username]\` to verify yourself.`).send();
            let afkUser = await bot.getAfk({
                id: message.author.id
            });
            if (afkUser) {
                let stats = await bot.getAfk({
                    id: message.author.id
                });
                let difference = Date.now() - parseInt(stats.startTime);
                bot.afkInterval.interval(bot, afkUser);
                bot.createEmbed(message).setAuthor("Currently in game", message.author.avatarURL()).setDescription(`You have been in game for **${getDateString(difference)}**.`)
                    .send()
            } else {
                let data = await bot.wrappers.hypixelPlayer.get(user.uuid);
                if (data.outage) return bot.createAPIErrorEmbed(message).send();
                let username = data.displayname;

                await bot.setAfk(message.author.id, user.uuid);
                bot.createEmbed(message).setTitle("Success!").setDescription(`:white_check_mark: Your account, ${data.emojiRank} **${username}**'s game session has started.
                \n:alarm_clock: You will be notified through DMs if you are no longer in game.`)
                    .send()
            }

        } else if (args[0].toLowerCase() == "stop") {
            let stats = await bot.getAfk({
                id: message.author.id
            })
            if (!stats) {
                return bot.createErrorEmbed(message).setDescription(`You are not in a session!\n\nUse \`${message.prefix}session\` to begin one.`).send()
            }

            await bot.removeAfk({
                id: message.author.id
            });
            let difference = Date.now() - parseInt(stats.startTime);
            diff = Math.floor(difference / 1000);
            var secs = diff % 60;
            diff = Math.floor(diff / 60);
            var mins = diff % 60;
            diff = Math.floor(diff / 60);
            var hours = diff % 24;
            diff = Math.floor(diff / 24);

            bot.createEmbed(message).setTitle("Session stopped!", message.author.avatarURL()).setDescription(`You are no longer in session.\n\n:stopwatch: Your session lasted **${hours} hours, ${mins} minutes, and ${secs} seconds**.`)
                .send()
        } else {
            return bot.createErrorEmbed(message).setDescription(`Unknown argument: \`${args[0].toLowerCase()}\`.`).send()
        }
    }
}


function getDateString(ms, format) {
    if (!ms) return "0 minutes and 0 seconds";
    let seconds = Math.floor(ms / 1000 % 60);
    let secondsStr = seconds && getPlural(seconds, 'second');
    let minutes = Math.floor(ms / 1000 / 60 % 60);
    let minutesStr = minutes && getPlural(minutes, 'minute');
    let hours = Math.floor(ms / 1000 / 60 / 60 % 24);
    let hoursStr = hours && getPlural(hours, 'hour');
    let days = Math.floor(ms / 1000 / 60 / 60 / 24 % 7);
    let daysStr = days && getPlural(days, 'day');
    let weeks = Math.floor(ms / 1000 / 60 / 60 / 24 / 7 % 31);
    let weeksStr = weeks && getPlural(weeks, 'week');
    let months = Math.floor(ms / 1000 / 60 / 60 / 24 / 7 / 31 % 365);
    let monthsStr = months && getPlural(months, 'month');
    let years = Math.floor(ms / 1000 / 60 / 60 / 24 / 7 / 31 / 365);
    let yearsStr = years && getPlural(years, 'year');
    if (!format) {
        format = "%year% %yearStr% %month% %monthStr% %week% %weekStr% %day% %dayStr% %hour% %hourStr% %min% %minStr% %sec% %secStr%"
    }
    let dateString = format
        .replace('%SEC%', seconds)
        .replace('%SECSTR%', secondsStr)
        .replace('%MIN%', minutes)
        .replace('%MINSTR%', minutesStr)
        .replace('%HOUR%', hours)
        .replace('%HOURSTR%', hoursStr)
        .replace('%DAY%', days)
        .replace('%DAYSTR%', daysStr)
        .replace('%WEEK%', weeks)
        .replace('%WEEKSTR%', weeksStr)
        .replace('%MONTH%', months)
        .replace('%MONTHSTR%', monthsStr)
        .replace('%YEAR%', years)
        .replace('%YEARSTR%', yearsStr)
        .replace('%sec%', seconds || '')
        .replace('%secStr%', secondsStr || '')
        .replace('%min%', minutes || '')
        .replace('%minStr%', minutesStr || '')
        .replace('%hour%', hours || '')
        .replace('%hourStr%', hoursStr || '')
        .replace('%day%', days || '')
        .replace('%dayStr%', daysStr || '')
        .replace('%week%', weeks || '')
        .replace('%weekStr%', weeksStr || '')
        .replace('%month%', months || '')
        .replace('%monthStr%', monthsStr || '')
        .replace('%year%', years || '')
        .replace('%yearStr%', yearsStr || '')
    // let dateString = `${years ? years + getPlural(years, ' year') : ''} ${months ? months + getPlural(months, ' month') : ''} ${weeks ? weeks + getPlural(weeks, ' week') : ''} ${days ? days + getPlural(days, ' day') : ''} ${hours ? hours + getPlural(hours, ' hour') : ''} ${minutes ? minutes + getPlural(minutes, ' minute') : ''} ${seconds ? seconds + getPlural(seconds, 'second') : ''}`.trim();
    return dateString.trim();
}
function getPlural(num, string) {
    if (num == 1) return string;
    return string + 's';
}
