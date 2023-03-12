const path = require('path');
const Discord = require('discord.js');
const { format } = require('path');

module.exports = {
    name: 'reload',
    aliases: ['r', 'rl'],
    description: 'Reloads a command',
    devOnly: true,
    async execute(message, args, bot) {
        if (!args[0]) return bot.sendErrorEmbed(message, `You did not include a command to reload.`)
        const commandName = args[0].toLowerCase();
        const command = bot.commands.get(commandName) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command) return bot.sendErrorEmbed(message, `There is no command with name or alias \`${commandName}\``);

        const commandsFiles = bot.getAllFiles('../commands');

        for (const file of commandsFiles) {
            if (path.basename(file) == `${command.name}.js`) {
                var formattedPath = path.join(__dirname, '..', '..', file).replace(/\\/g, '\\\\')
                try {
                    const startTime = Date.now()
                    delete require.cache[require.resolve(formattedPath)];
                    const newCommand = require(formattedPath);
                    bot.commands.set(newCommand.name, newCommand);

                    // await bot.shard.broadcastEval(`
                    // delete require.cache[require.resolve('${formattedPath}')];
                    // const newCommand = require('${formattedPath}');
                    // this.commands.set(newCommand.name, newCommand);
                    // `)
                    delete require.cache[require.resolve(formattedPath)];
                    bot.commands.set(newCommand.name, newCommand);

                    let embed = new Discord.MessageEmbed()
                        .setTitle(`${bot.assets.emotes.other.check} Command Reloaded`)
                        .addFields(
                            { name: `Command`, value: `\`${command.name}\`` },
                            { name: `Aliases`, value: `\`${command.aliases ? command.aliases.join(", ") : "No Aliases."}\`` },
                            { name: `Description`, value: `\`${command.description ? command.description : "No Description."}\`` },
                            { name: `Reload time`, value: `\`${Date.now() - startTime} ms\`` })
                        .setColor(bot.color)
                        .setThumbnail(bot.assets.logowhite)
                        .setFooter(bot.config.footer);
                    message.channel.send({ embeds: [embed] })

                } catch (error) {
                    bot.sendErrorEmbed(message, `${bot.assets.emotes.other.cross} There was an error while reloading command \`${command.name}\`\n\n\`\`\`${error.message}\`\`\``);
                }
            }
        }

    },
};