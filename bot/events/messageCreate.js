const Discord = require('discord.js');
const moment = require('moment');
module.exports = {
    name: "messageCreate",
    /**
     * 
     * @param {Discord.Client} bot 
     * @param {Discord.Message} message 
     * @returns 
     */
    async execute(bot, message) {
        const mentionRegex = new RegExp(`^<@[!]?${bot.user.id}>`);
        const mentionMatch = message.content.match(mentionRegex);
        // console.log(message.content.match(mentionRegex));
        if (message.channel.type !== "GUILD_TEXT") return;
        message.serverConf = await bot.config.getConfigAsObject(message.guild.id);
        if (message.author.bot && !mentionMatch) return;
        if (!message.autoPost) {
            if (message.member) {
                bot.autoUpdateInterval.execute(message.member, message.serverConf, bot)
            }
        }
        let prefix = message.serverConf.prefix;


        if (!message.content.toLowerCase().startsWith(prefix.toLowerCase()) && !mentionMatch) {
            return;
        };

        if (mentionMatch) prefix = `<@!${bot.user.id}>`;
        if (!message.autoPost) {
            let hasWhitelistedRole = message.member.roles.cache.some((role) => message.serverConf.roles.whitelist.includes(role.id));
            let hasBlacklistedRole = message.member.roles.cache.some((role) => message.serverConf.roles.blacklist.includes(role.id));
            if (hasBlacklistedRole && !hasWhitelistedRole) {
                return bot.createErrorEmbed().setDescription(`Uh oh, looks like your server role in **${message.guild.name}** has been blacklisted from using the bot. Contact a server admin if you believe this is an error!`).send(message.author).catch(e => {
                    console.log(`[ERROR] Unable to inform ${message.author.tag} that their role is banned because they have DMs off.`);
                })
            }
        }


        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = bot.commands.get(commandName) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command) return;

        const cooldowns = bot.cooldowns;
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Discord.Collection());
        }
        bot.log(`${message.autoPost ? "&e[AUTOPOST]" : "&3[COMMAND]"} &2${message.author.tag} &fin &2${message.guild.name}&f &2#${message.channel.name} &fused command &a${message.content}`)
        if (bot.isInMaintenance() && !bot.hasDev(message.author.id)) {
            return bot.createErrorEmbed(message).setTitle(`Maintenance Mode`).setDescription(`The bot is currently in **MAINTENANCE MODE**. It will be back as soon as possible. In the mean time join the [support server](https://discord.gg/BgWcvKf) for updates and information.\n\n\`Reason:\` **${bot.isInMaintenance().reason || "No reason specified"}**\n\`Start Time:\` **${moment(bot.isInMaintenance().start).fromNow()}.**`).setColor('#FFFF00').send()
        }
        if (bot.isCommandDisabled(command.name) && !bot.hasDev(message.author.id)) {
            return bot.createErrorEmbed(message).setTitle(`:warning: Command Disabled`).setDescription(`Oops! Looks like this command has been disabled by a developer.\n\n\`Reason:\` ${bot.isCommandDisabled(command.name).reason}`).send();
        }
        if (command.permissions && !message.guild.me.permissions.has(command.permissions)) {
            return bot.createErrorEmbed(message).setDescription(`The command \`${command.name}\` requires permissions that the bot does not have! **To fix this, please [reinvite the bot](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot)**.\n\nAlternatively, you add these permissions to the bot's role: \n• **${command.permissions.join('\n• **')}**`).send()
        }
        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id) && !message.autoPost && !bot.hasDev(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(`This command is on cooldown! Please wait ${timeLeft.toFixed(1)} more second(s) before trying again.`);
            }
        }
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        if (command.type == "comingsoon" && !bot.hasDev(message.author.id)) {
            return bot.createErrorEmbed(message).setDescription("Wooah there time traveler, this command hasn't been released yet!").send()
        }
        if (command.adminOnly && !message.member.permissions.has("ADMINISTRATOR") && !bot.hasDev(message.author.id)) {
            return bot.createErrorEmbed(message).setDescription("You need server **administrator permissions** to use this command. [Invite the bot](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot) to your server to see what this command has to offer!").send()
        }
        if (command.devOnly && !bot.hasDev(message.author.id)) {
            return;
        }

        // test for flags:
        message.flags = !bot.hasDev(message.author.id) ? {} : args.reduce((prev, curr, index) => { return curr.startsWith('--') ? { ...prev, [curr.replace(/^--*/, '')]: { name: curr.replace(/^--*/, ''), value: args[index + 1] || false, index: index, fullValue: args.filter((el, i) => { let iNxt = args.indexOf(args.find((e, indx) => indx > index && e.startsWith('-'))); return index < i && i < (iNxt != -1 ? iNxt : args.length) }).join(" ") } } : prev }, {});
        Object.values(message.flags).forEach(f => args.splice(f.index, f.index + 2))

        if (message.flags['ref']) {
            let guildID = message.flags['ref'].value;
            message.guildId = bot.guilds.cache.get(guildID)?.id || message.guild.id;
            message.serverConf = await bot.config.getConfigAsObject(guildID);

        }
        message.serverConf.prefix = '/';
        message.prefix = message.serverConf.prefix;



        try {
            !message.autoPost && bot.addCommand();
            if (!message.autoPost && !mentionMatch) {
                return bot.createErrorEmbed(message).setTitle(`Slash Command Switch!`).setDescription(`_Hypixel Guild Bot has made the switch to **[slash commands](https://discord.com/blog/slash-commands-are-here)**!_\n\n> The command you are looking for is now **\`/${command.name}\`**.\n\nIf slash commands are not showing up, please try **[reinviting the bot](https://discord.com/api/oauth2/authorize?client_id=684986294459564042&permissions=140593458288&scope=bot%20applications.commandshttps://discord.com/api/oauth2/authorize?client_id=684986294459564042&permissions=140593458288&scope=bot%20applications.commands)**, & making sure you have the \`USE_APPLICATION_COMMANDS\` permission.\n\n**For further help, please don't hesitate to join our [support server](https://discord.gg/BgWcvKf)!**`).send()
            }
            if (!command.execute) return bot.createErrorEmbed(message).setTitle(`Text Command No Longer Supported!`).setDescription(`_This command is no longer supported with text commands, instead use its new **[slash command](https://discord.com/blog/slash-commands-are-here)**._\n\n> The command you are looking for is now **\`/${command.name}\`**.\n\nIf slash commands are not showing up, please try **[reinviting the bot](https://discord.com/api/oauth2/authorize?client_id=684986294459564042&permissions=140593458288&scope=bot%20applications.commands)**, & making sure you have the \`USE_APPLICATION_COMMANDS\` permission.\n\n**For further help, please don't hesitate to join our [support server](https://discord.gg/BgWcvKf)!**`).send()

            message.channel.sendTyping().catch(e => bot.log(`&4couldnt type??? LMAO?`));
            await command.execute(message, args, bot);

        } catch (e) {
            console.error(e)
            if (e.name == "Error [SHARDING_IN_PROCESS]") {
                bot.createErrorEmbed(message).setTitle(`:warning: Bot Currently Starting`).setDescription("This shard is currently in the process of starting, please try again in a few moments.").send()
            } else {
                bot.createErrorEmbed(message).setDescription("Oh no! There was an error trying to execute that command! Please report this in our [support server](https://discord.com/invite/BgWcvKf).").send()
            }

        }
    }
}