const Discord = require('discord.js');

module.exports = {
    name: "shardResume",
    /**
     * 
     * @param {Discord.CloseEvent} event 
     */
    async execute(bot, id, replayedEvents) {
        bot.log(`[SHARD RESUME] [ID: ${id}] Shard resumed.\nReplayed Events: ${replayedEvents}`);
    }
}