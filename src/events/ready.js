const Discord = require('discord.js');

module.exports = {
  name: "ready",
  /**
   * 
   * @param {Discord.Client} bot 
   */
  async execute(bot) {
    bot.startTime = Date.now();
    bot.slog(`
      &a----------------------------------------------------
                  &6BOT &c${bot.user.tag}&6 IS READY ON SHARD &c${bot.shard?.ids[0] || "-1"}&6.
                  Shard Guild Count: &f${bot.guilds.cache.size.toLocaleString()}
      &a----------------------------------------------------
        `)

    bot.autoRoleInterval.beginInterval(bot);
    bot.afkInterval.beginInterval(bot);
    bot.autoPostInterval.beginInterval(bot);
  }
}