const { SlashCommandBuilder } = require("@discordjs/builders");
const Discord = require("discord.js");

module.exports = {
  name: "help",
  type: "info",
  usage: "[command]",
  cooldown: 1,
  slash: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the bot\'s commands.'),
  async run(interaction, { serverConf }, bot) {
    let serverCommands = [];
    let guildCommands = [];
    let miscCommands = [];
    let devCommands = [];
    let infoCommands = [];
    let comingsoonCommands = [];
    const slashCmds = await bot.application.commands.fetch()
    bot.commands.forEach(item => {
      let cmdId = slashCmds.find(c => c.name == item.name)?.id;
      let name = item.new ? `**__NEW!__** </${item.name}:${cmdId}>` : `</${item.name}:${cmdId}>`;
      if ((bot.isCommandDisabled(item.name))) {
        name = "(disabled) " + item.name;
      }
      if (item.devOnly) {
        name = "(d) /" + item.name;
        devCommands.push(name)
      } else if ((item.type == "guild")) {
        guildCommands.push(name);
      } else if (item.type == "server" || item.type == "config") {
        serverCommands.push(name);
      } else if (item.type == "comingsoon") {
        comingsoonCommands.push(name);
      } else if (item.type == "info") {
        infoCommands.push(name);
      } else {
        miscCommands.push(name);
      }
    });
    let fields = [
      { name: "<:hgb:864300514057781269> Guild Commands", value: '' + (guildCommands.sort().join(" ") || 'No Commands') + '' },
      { name: "⚙️ Server Config", value: '' + (serverCommands.sort().join(" ") || 'No Commands') + '' },
      { name: "ℹ️ Information", value: '' + (infoCommands.sort().join(" ") || 'No Commands') + '' },
      { name: "🤷‍♂️ Misc", value: '' + (miscCommands.sort().join(" ") || 'No Commands') + '' },
      { name: "👀 Coming Soon", value: '' + (comingsoonCommands.sort().join(" ") || 'No Commands') + '' }
    ];


    if (bot.hasDev(interaction.user.id)) {
      fields.push({ name: "🛠️ Developer", value: '`' + (devCommands.join("` `") || 'No Commands') + '`' })
    }

    fields.push({ name: 'Useful Links', value: "[Support Discord Server](https://discord.gg/BgWcvKf)\n[Bot Invite](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot)" })


    bot.createEmbed(interaction)
      .setAuthor({ name: 'Hypixel Guild Bot', iconURL: bot.user.avatarURL() })
      .setDescription(``)
      .setTitle('Commands')
      .addFields(fields)
      .send();

  },
  execute(message, args, bot) {
    if (!args.length) {
      let serverCommands = [];
      let guildCommands = [];
      let miscCommands = [];
      let devCommands = [];
      let infoCommands = [];
      let comingsoonCommands = [];

      bot.commands.forEach(item => {
        let cmdId = bot.application.commands.cache.find(c => c.name == item.name)?.id;
        let name = item.new ? `**__NEW!__** </${item.name}:${cmdId}>` : `</${item.name}:${cmdId}>`;
        if ((bot.isCommandDisabled(item.name))) {
          name = "(disabled) " + item.name;
        }
        if (item.devOnly) {
          name = "(d) " + item.name;
          devCommands.push(name)
        } else if ((item.type == "guild")) {
          guildCommands.push(name);
        } else if (item.type == "server" || item.type == "config") {
          serverCommands.push(name);
        } else if (item.type == "comingsoon") {
          comingsoonCommands.push(name);
        } else if (item.type == "info") {
          infoCommands.push(name);
        } else {
          miscCommands.push(name);
        }
      });
      let fields = [
        { name: "<:hgb:864300514057781269> Guild Commands", value: '' + (guildCommands.sort().join(", ") || 'No Commands') + '' },
        { name: "⚙️ Server Config", value: '' + (serverCommands.sort().join(", ") || 'No Commands') + '' },
        { name: "ℹ️ Information", value: '' + (infoCommands.sort().join(", ") || 'No Commands') + '' },
        { name: "🤷‍♂️ Misc", value: '' + (miscCommands.sort().join(", ") || 'No Commands') + '' },
        { name: "👀 Coming Soon", value: '' + (comingsoonCommands.sort().join(", ") || 'No Commands') + '' }
      ];


      if (bot.hasDev(message.author.id)) {
        fields.push({ name: "🛠️ Developer", value: '`' + (devCommands.join("`, `") || 'No Commands') + '`' })
      }

      fields.push({ name: 'Useful Links', value: "[Support Discord Server](https://discord.gg/BgWcvKf)\n[Bot Invite](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot)" })
      bot.createEmbed(message).addFields(fields)
        .setDescription(`Use \`${message.prefix}help <Command/Alias>\` for a detailed description of the command.`)
        .setTitle('Commands')
        .setAuthor('Hypixel Guild Bot', bot.user.avatarURL())
        .send();


    } else {
      let commandName = args[0];
      let command =
        bot.commands.get(commandName) ||
        bot.commands.find(
          cmd => cmd.aliases && cmd.aliases.includes(commandName)
        );
      if (!command) bot.createErrorEmbed(message)
        .setTitle("Unknown Command!")
        .setDescription("This command does not exist smh").send()
      return bot.createUsageEmbed(command, message).setTitle(`Showing Command Usage for '${command.name}'`).send()

    }
  }
};
