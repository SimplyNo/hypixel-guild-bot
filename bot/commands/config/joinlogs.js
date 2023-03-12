const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    name: "joinlogs",
    adminOnly: true,
    description: "Set bot to send guild join/leave logs.",
    aliases: ["leavelogs"],
    type: "config",
    usage: "<#Channel | \"reset\">",
    cooldown: 5,
    slash: new SlashCommandBuilder()
        .setName('joinlogs')
        .setDescription("Set bot to send guild join/leave logs.")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current JoinLogs config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription('Set the channel to send join/leave logs to.')
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to send join/leave logs to.")
                        .setRequired(false))),
    async run(interaction, { serverConf }, bot) {
        let autoRole = serverConf.autoRole;
        let currentChannel = serverConf.joinLogs.channel;
        const subcommand = interaction.options.getSubcommand();
        if (!autoRole.guild) {
            return bot.createErrorEmbed(interaction).setDescription(`You need to set an **AutoRole Guild** in order to use this command!\n\n\`${interaction.prefix}autorole setguild [guild name]\``)
                .send()
        }
        if (subcommand === "view") {
            let embed = bot.createEmbed(interaction)
                .setAuthor(`Guild Join/Leave Logs`, interaction.guild.iconURL())
                .setFancyGuild()
                .setDescription(`
                    `)
                .addField('» Join Logs', `\`Current Channel:\` ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}`)
                // .addField('» Leave Logs', `\`Current Channel\`: ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}`)
                .setFooter(`${interaction.prefix}joinlogs ${this.usage}`)
                .send()
        } else if (subcommand === "reset") {
            await bot.config.joinLogs.delete(interaction.guild.id);
            return interaction.reply(`**Success!** Join logs reset!`);
        } else if (subcommand === "set") {
            const channel = interaction.options.getChannel('channel');
            if (!channel) await bot.config.joinLogs.set(interaction.guild.id, undefined);
            else await bot.config.joinLogs.set(interaction.guild.id, channel.id);
            return interaction.reply(`**Success!** The bot will now send join/leave logs in ${channel ?? `\`No Channel\``}!`);
        }

    },
    async execute(message, args, bot) {
        let autoRole = message.serverConf.autoRole;
        let currentChannel = message.serverConf.joinLogs.channel;
        if (!autoRole.guild) {
            return bot.createErrorEmbed(message).setDescription(`You need to set an **AutoRole Guild** in order to use this command!\n\n\`${message.prefix}autorole setguild [guild name]\``)
                .send()
        }
        if (!args.length) {
            let embed = bot.createEmbed(message)
                .setAuthor(`Guild Join/Leave Logs`, message.guild.iconURL())
                .setFancyGuild()
                .setDescription(`
                `)
                .addField('» Join Logs', `\`Current Channel:\` ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}`)
                // .addField('» Leave Logs', `\`Current Channel\`: ${currentChannel ? `<#${currentChannel}>.` : `**No Channel Set!**`}`)
                .setFooter(`${message.prefix}joinlogs ${this.usage}`)
                .send()
        } else if (args[0].toLowerCase() == "reset") {
            await bot.config.joinLogs.delete(message.guild.id);
            return message.reply(`**Success!** Join logs reset!`);
        } else {
            let channel = await bot.parseChannel(args.join(' '), message.guild);
            if (!channel) return message.reply(`That is not a valid channel!`);
            await bot.config.joinLogs.set(message.guild.id, channel.id);
            return message.reply(`**Success!** The bot will now send join/leave logs in ${channel}!`);
        }
    }
}