module.exports = {
    name: 'disablecmd',
    aliases: ['togglecmd'],
    devOnly: true,
    execute(message, args, bot) {
        let command = bot.commands.get(args[0]) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(args[0]));
        if(!command) {
            return bot.createErrorEmbed(message).setDescription(`Unknown command.`).send()
        } else {
            let reason = args.slice(1, args.length).join(' ');
            let res = bot.toggleCommand(command.name, reason);
            if(res) message.channel.send(`Command \`${command.name}\` is now DISABLED.`)
            else message.channel.send(`Command \`${command.name}\` is now ENABLED.`)
        }
    }
}