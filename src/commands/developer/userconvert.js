const fetch = require('node-fetch');
module.exports = {
    name: "userconvert",
    aliases: ['convertusers', 'addusers'],
    devOnly: true,
    async execute(message, args, bot) {
        let url = args[0];

        let data = await fetch(url).then(res => res.json()).then(json => json).catch(e => 0);
        console.log(data)
        if (!data) return message.channel.send(`Invalid user list.`)

        let start = Date.now();
        let allUsers = await bot.getAllUsers();
        let duplicates = [];
        for (let user of data) {

            if (!allUsers.find(el => el.uuid == user.uuid || el.id == user.id)) {
                bot.log(`&a${data.indexOf(user) + 1}/${data.length}`)
                await bot.addUser(user.id, user.uuid)
            } else {
                duplicates.push(user)
                bot.log(`&a${data.indexOf(user) + 1}/${data.length} &cDuplicate!`)
            }
        }
        message.channel.send(`${data.length - duplicates.length} users converted | ${duplicates.length} duplicates | ${(Date.now() - start)}ms`)

    }
}