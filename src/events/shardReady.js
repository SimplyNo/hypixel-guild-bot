const Discord = require('discord.js');

module.exports = {
    name: "shardReady",
    /**
     * 
     * @param {Discord.CloseEvent} event 
     */
    async execute(bot, id) {
        bot.log(`[SHARD CONNECT] [ID: ${id}] &aShard ready!`);
        
    }
}