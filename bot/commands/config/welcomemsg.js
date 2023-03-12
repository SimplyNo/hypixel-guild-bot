const { SlashCommandBuilder } = require("@discordjs/builders");
const { Constants } = require("discord.js");

module.exports = {
    name: "welcomemsg",
    aliases: ['welcomemessage', 'wlcmsg', 'wlcmessage', 'welcomer'],
    adminOnly: true,
    description: "Set a welcome message for the bot!",
    slash: new SlashCommandBuilder()
        .setName('welcomemsg')
        .setDescription("Set a welcome message for the bot!")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View the current welcome message'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription("Set a welcome message for the bot!")
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription("The message to set as the welcome message. You can use {member} to mention the member.")
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to send the welcome message in.")
                        .setRequired(true)
                        .addChannelTypes(Constants.ChannelTypes.GUILD_TEXT)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('reset')
                .setDescription('Reset the welcome message')),
    async run(interaction, { serverConf }, bot) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            let embed = bot.createEmbed(interaction)
                .setAuthor(`${interaction.guild.name} → Welcome Message`, interaction.guild.iconURL())
                .setTitle(`Current Welcome Message`)
                .setDescription(`_Configure a welcome message to be sent when new members join the server!_`)
                .addField('Welcome Channel', `${serverConf.welcome.channel ? `<#${serverConf.welcome.channel}>` : "\`No channel set!\`"}`)
                .addField('Welcome Message', `${serverConf.welcome.message ? `${serverConf.welcome.message}` : "\`No message set!\`"}\n\n*You can use \`{member}\` to be replaced with the member's mention!*`)

                .send()
        } else if (subcommand === 'set') {
            const channel = interaction.options.getChannel('channel', true);
            const message = interaction.options.getString('message', true);
            await bot.config.welcome.setChannel(interaction.guild.id, channel.id);
            await bot.config.welcome.setMessage(interaction.guild.id, message);
            bot.createEmbed(interaction)
                .setTitle(`Welcome Message Set`)
                .setDescription(`The bot will now welcome new members with \`${message}\` in <#${channel.id}>.`)
                .send()

        } else if (subcommand == 'reset') {

            bot.config.welcome.delete(interaction.guild.id);
            bot.createEmbed(interaction)
                .setTitle('Success!')
                .setDescription(`Successfully reset all welcome configurations!`)
                .send()
        }
    },
    async execute(message, args, bot) {
        if (!args.length) {
            let embed = bot.createEmbed(message)
                .setAuthor(`${message.guild.name} → Welcome Message`, message.guild.iconURL())
                .setTitle(`Current Welcome Message`)
                .setDescription(`
**Valid Arguments:**
━━━━━━━━━━━━━━━━━━━━━━
\`${message.prefix}welcomemsg setchannel [#Channel]\` - Set the channel the bot will send the welcome message to.
\`${message.prefix}welcomemsg setmessage [message]\` - Set the message to be sent when someone joins the server. 
\`${message.prefix}welcomemsg reset\` - Delete all welcome configurations. 
━━━━━━━━━━━━━━━━━━━━━━
                `)
                .addField('Welcome Channel', `${message.serverConf.welcome.channel ? `<#${message.serverConf.welcome.channel}>` : "No channel set!"}`)
                .addField('Welcome Message', `${message.serverConf.welcome.message ? `${message.serverConf.welcome.message}` : "No message set!"}\n\n*You can use \`{member}\` to be replaced with the member's mention!*`)

                .send()
        } else if (args[0].toLowerCase() == 'setchannel') {
            let channel = await bot.parseChannel(args.slice(1, args.length).join(' '), message.guild);
            if (!channel) return bot.createErrorEmbed(message).setDescription('You didn\'t provide a welcome channel!').send()
            bot.config.welcome.setChannel(message.guild.id, channel);

            bot.createEmbed(message)
                .setTitle('Success!')
                .setDescription(`Successfully set welcome channel to: ${channel}!`)
                .send()

        } else if (args[0].toLowerCase() == 'setmessage') {

            let msg = args.slice(1, args.length).join(' ');
            if (!msg) return bot.createErrorEmbed(message).setDescription('You didn\'t provide a message to send!').send()
            bot.config.welcome.setMessage(message.guild.id, msg);

            bot.createEmbed(message)
                .setTitle('Success!')
                .setDescription(`Successfully set welcome message to:\n\n${msg}`)
                .send()

        } else if (args[0].toLowerCase() == 'reset') {

            bot.config.welcome.delete(message.guild.id);
            bot.createEmbed(message)
                .setTitle('Success!')
                .setDescription(`Successfully reset all welcome configurations!`)
                .send()
        } else {
            return bot.createErrorEmbed(message)
                .setDescription(`\`${args[0]}\` is not a valid argument! Use \`${message.prefix}wlcmsg\` to see a list of valid arguments!`)
                .send()
        }
    }
}