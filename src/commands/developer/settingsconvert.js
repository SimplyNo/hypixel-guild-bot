const fetch = require('node-fetch');

module.exports = {
    name: "settingsconvert",
    aliases: ['convertsettings'],
    devOnly: true,
    async execute(message, args, bot) {
        let url = args[0];

        let data = await fetch(url).then(res => res.json()).then(json => json).catch(e => 0);
        if (!data) return message.channel.send(`Invalid server settings list.`)

        let start = Date.now();
        for (let server of data) {
            bot.log(`&a${data.indexOf(server) + 1}/${data.length}`)
            await bot.config.prefix.set(server[0], server[1].prefix)
        }
        message.channel.send(`${data.length} servers converted | ${(Date.now() - start)}ms`)

    }
}