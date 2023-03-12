// require('dotenv').config();

// const Discord = require('discord.js');
// const { APIMessage, Structures } = require("discord.js");


// let intents = new Discord.Intents([
//   "GUILD_MEMBERS",
//   "GUILD_MESSAGES",
//   "GUILD_MESSAGE_REACTIONS",
//   'DIRECT_MESSAGES',
//   'GUILDS',
//   'GUILD_MESSAGES',
//   'GUILD_MESSAGE_REACTIONS',
//   'GUILD_MESSAGE_TYPING',
//   'GUILD_WEBHOOKS'

// ])

// const enmap = require('enmap');
// const fs = require('fs');
// const util = require('./util/functions.js');


// const TOKEN = process.env.TOKEN;
// const VERSION = process.env.VERSION;

// let bot = new Discord.Client({ shardsCount: "auto", presence: { activities: [{ name: `g!help | g!autorole`, type: "WATCHING" }] }, intents: intents, partials: ["REACTION", "MESSAGE"], failIfNotExists: false, allowedMentions: { repliedUser: false } });

// // load commands
// util.init(bot).then(() => {


//   bot.commands = new Discord.Collection();
//   bot.cooldowns = new Discord.Collection();
//   bot.autoUpdateCache = new Discord.Collection();

//   const files = bot.getAllFiles('./bot/commands')
//   for (const file of files) {
//     if (!file.endsWith(".js")) return;
//     let commands = require(`../${file}`);
//     bot.commands.set(commands.name, commands);
//     if (!commands.name) console.log(file)
//   }


//   const eventFiles = fs.readdirSync('./bot/events').filter(file => file.endsWith('.js'));

//   for (const file of eventFiles) {
//     const event = require(`./events/${file}`);
//     if (event.once) {
//       bot.once(event.name, (...args) => event.execute(bot, ...args));
//     } else {
//       bot.on(event.name, (...args) => event.execute(bot, ...args));
//     }
//   }

//   bot.login(TOKEN);

// });