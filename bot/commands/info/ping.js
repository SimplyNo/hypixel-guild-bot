const { Message, Client } = require('discord.js');
let fetch = require('node-fetch');
let moment = require('moment');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  name: "ping",
  type: "info",
  devOnly: false,
  slash: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('See bot information'),
  /**
   * 
   * @param {Message} interaction 
   * @param {*} {serverConf} 
   * @param {Client} bot 
   */
  async run(interaction, { serverConf }, bot) {
    let stats = await bot.getStats();
    let serverValues = await bot.shard?.fetchClientValues('guilds.cache.size') ?? [bot.guilds.cache.size];
    let channelValues = await bot.shard?.fetchClientValues('channels.cache.size') ?? [bot.channels.cache.size];
    let userValues = await bot.shard?.broadcastEval(client => client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)) ?? [bot.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)];

    let serverCount = serverValues.reduce((prev, curr) => prev + curr, 0);
    let channelCount = channelValues.reduce((prev, curr) => prev + curr, 0);
    let userCount = userValues.reduce((prev, curr) => prev + curr, 0);

    bot.createEmbed(interaction).setTitle(`:ping_pong: Pong!`)
      .setAuthor('Hypixel Guild Bot', bot.user.avatarURL())
      .addField(`Shard Latency`, `:hourglass_flowing_sand: \`${(Date.now() - interaction.createdTimestamp).toLocaleString()}ms\``, true)
      .addField(`Shard Uptime`, `:alarm_clock: \`${moment(Date.now() + bot.uptime).fromNow(true)}\``, true)
      .addField(`Total Commands Sent`, `:scroll: \`${stats.get('cmds').toLocaleString()}\``, true)
      .addField(`Bot Server Count`, `:homes: \`${serverCount.toLocaleString()}\``, true)
      .addField(`Bot User Count`, `:bust_in_silhouette: \`${userCount.toLocaleString()}\``, true)
      .addField(`Channel Count`, `:hash: \`${channelCount.toLocaleString()}\``, true)
      .addField(`Current Shard`, `💎 ID: \`${interaction.guild.shardId}\`/ Total: \`${bot.shard?.count ?? 0}\``)
      .setFooter(`Version ${bot.CONFIG.version} | Created and developed by SimplyNo#8524`)
      .send()
    //     let url = args[0];
    //     let now = Date.now();
    //     message.channel.send(`Pinging ${url}...`)
    //     fetch(url).then(async res => {

    //       let newnow = Date.now();
    //       let time = (newnow - now) / 1000;
    //       let json = await res.text();
    //       message.channel.send(bot.createEmbed().setAuthor(`It took ${time.toFixed(2)} seconds to ping.`).setDescription("```json\n" + text_truncate(json, 2030) + "```"))
    //     }).catch(e => {
    //       message.channel.send("Invalid url")
    //     })
  }
}




let text_truncate = function (str, length, ending) {
  if (length == null) {
    length = 100;
  }
  if (ending == null) {
    ending = '...';
  }
  if (str.length > length) {
    return str.substring(0, length - ending.length) + ending;
  } else {
    return str;
  }
};