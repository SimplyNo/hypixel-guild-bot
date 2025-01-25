const Discord = require('discord.js');

module.exports = {
    name: "debug",
    /**
     * 
     * @param {Discord.CloseEvent} event 
     */
    async execute(bot, log) {
        console.log(log);
    }
}