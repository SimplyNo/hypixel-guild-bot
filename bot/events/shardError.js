const Discord = require('discord.js');

module.exports = {
    name: "shardError",
    /**
     * 
     * @param {Discord.CloseEvent} event 
     */
    async execute(bot, error, id) {
        console.error(`[SHARD ERROR] [ID: ${id}] Bot shard errored.`, error);
    }
}