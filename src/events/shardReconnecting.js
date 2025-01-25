const Discord = require('discord.js');

module.exports = {
    name: "shardReconnecting",
    /**
     * 
     * @param {Discord.CloseEvent} event 
     */
    async execute(bot, id) {
        bot.log(`[SHARD RECONNECT] [ID: ${id}] Reconnecting...`);
    }
}