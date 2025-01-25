const Discord = require('discord.js');

module.exports = {
    name: "shardDisconnect",
    /**
     * 
     * @param {Discord.CloseEvent} event 
     */
    async execute(bot, event, id) {
        console.error(`[SHARD DISCONNECT] [ID: ${id}] Bot shard disconnected.\nReason: ${event.reason}\nCode: ${event.code}`);
    }
}