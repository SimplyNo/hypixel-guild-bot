// /**
//  * Hypixel Guild Bot
//  * By SimplyNo
//  * 
//  * 
//  */


const Discord = require('discord.js');
const { APIMessage, Structures } = require("discord.js");
const Redis = require('ioredis');

new Redis("redis://whatevergoeshere/o"); //You can get this in Redis

let intents = new Discord.Intents([
    "GUILD_MEMBERS",
    "GUILD_MESSAGES",
    "GUILD_MESSAGE_REACTIONS",
    'DIRECT_MESSAGES',
    'GUILDS',
    'GUILD_MESSAGES',
    'GUILD_MESSAGE_REACTIONS',
    'GUILD_MESSAGE_TYPING',
    'GUILD_WEBHOOKS'

])

const enmap = require('enmap');
const fs = require('fs');
const util = require('./bot/util/functions.js');

const { token, version } = require('./config.json');
let bot = new Discord.Client({ shards: "auto", presence: { activities: [{ name: `/help | /autorole`, type: "WATCHING" }] }, intents: intents, partials: ["REACTION", "MESSAGE"], failIfNotExists: false, allowedMentions: { repliedUser: false, parse: ["users"] } });

// load commands
util.init(bot).then(() => {


    bot.commands = new Discord.Collection();
    bot.cooldowns = new Discord.Collection();
    bot.autoUpdateCache = new Discord.Collection();

    const files = bot.getAllFiles("./bot/commands")
    for (const file of files) {
        if (!file.endsWith(".js")) continue;
        let commands = require(`./${file}`);
        bot.commands.set(commands.name, commands);
        if (!commands.name) console.log(file)
    }


    const eventFiles = fs.readdirSync('./bot/events').filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(`./bot/events/${file}`);
        if (event.once) {
            bot.once(event.name, (...args) => event.execute(bot, ...args));
        } else {
            bot.on(event.name, (...args) => event.execute(bot, ...args));
        }
    }

    bot.login(token);

});

// (async function () {
//     require('dotenv').config();
//     const { ShardingManager, Util } = require('discord.js');

//     const { TOKEN, VERSION } = process.env;
//     const chalk = require('chalk');
//     console.clear()

//     // let totalShards = await Util.fetchRecommendedShards(TOKEN);
//     let totalShards = 1;
//     const manager = new ShardingManager('./bot/bot.js', { token: TOKEN, totalShards: totalShards, shardArgs: ['--color'] });

//     console.log(`${chalk.green(`\n\nStarting Hypixel Guild Bot on ${chalk.greenBright(totalShards)} shards`)} [${chalk.magenta("v" + VERSION)}]`);

//     manager.on('shardCreate', shard => console.log(`${chalk.green(`Launching shard ${shard.id}...`)}`));
//     manager.spawn({ amount: totalShards, delay: 5000 }).then(shards => {
//         shards.forEach(shard => {
//             shard.on('disconnect', () => {
//                 console.log("BOT DISCONNECTED IM RESPAWING IT !!!")
//                 shard.respawn()
//             })
//         })
//     });
// })()
