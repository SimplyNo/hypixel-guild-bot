const { Interaction, CommandInteraction, Collection } = require("discord.js");

module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(bot, interaction) {
        if (!interaction.isCommand()) return;
        const command = bot.commands.get(interaction.commandName) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!interaction.guild) return interaction.reply(`Commands don't work in DMs please use them in a server.`)
        if (command) {
            bot.log(`&a[COMMAND] ${interaction.guild.name} &7>>> &3${interaction.user.tag}&7 used &3/${interaction.toString()}&7 in &3#${interaction.channel.name}`);


            if (bot.isInMaintenance() && !bot.hasDev(interaction.user.id)) {
                return bot.createErrorEmbed(interaction).setTitle(`Maintenance Mode`).setDescription(`The bot is currently in **MAINTENANCE MODE**. It will be back as soon as possible. In the mean time join the [support server](https://discord.gg/BgWcvKf) for updates and information.\n\n\`Reason:\` **${bot.isInMaintenance().reason || "No reason specified"}**\n\`Start Time:\` **${moment(bot.isInMaintenance().start).fromNow()}.**`).setColor('#FFFF00').send()
            }
            if (bot.isCommandDisabled(command.name) && !bot.hasDev(interaction.user.id)) {
                return bot.createErrorEmbed(interaction).setTitle(`:warning: Command Disabled`).setDescription(`Oops! Looks like this command has been disabled by a developer.\n\n\`Reason:\` ${bot.isCommandDisabled(command.name).reason}`).send();
            }
            if (command.permissions && !interaction.guild.me.permissions.has(command.permissions)) {
                return bot.createErrorEmbed(interaction).setDescription(`The command \`${command.name}\` requires permissions that the bot does not have! **To fix this, please [reinvite the bot](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot)**.\n\nAlternatively, you add these permissions to the bot's role: \n• **${command.permissions.join('\n• **')}**`).send()
            }
            // check autopost setcommand
            const tempUserConfig = bot.tempUserConfig.get(interaction.user.id) || {};
            // console.log(tempUserConfig)
            if (tempUserConfig.autopost) {
                // callback
                tempUserConfig.autopost.callback(interaction);
                tempUserConfig.autopost = null;
                bot.tempUserConfig.set(interaction.user.id, tempUserConfig);
                return;
            }
            const now = Date.now();
            const cooldowns = bot.cooldowns;
            // console.log(cooldowns)
            if (!cooldowns.has(command.name)) {
                cooldowns.set(command.name, new Collection());
            }
            const timestamps = cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;

            if (timestamps.has(interaction.user.id) && !interaction.autoPost && !bot.hasDev(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply(`This command is on cooldown! Please wait ${timeLeft.toFixed(1)} more second(s) before trying again.`);
                }
            }
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            if (command.type == "comingsoon" && !bot.hasDev(interaction.user.id)) {
                return bot.createErrorEmbed(interaction).setDescription("Wooah there time traveler, this command hasn't been released yet!").send()
            }
            // if (command.adminOnly && !interaction.member.permissions.has("ADMINISTRATOR") && !bot.hasDev(interaction.user.id)) {
            //     return bot.createErrorEmbed(interaction).setDescription("You need server **administrator permissions** to use this command. [Invite the bot](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot) to your server to see what this command has to offer!").send()
            // }
            if (command.devOnly && !bot.hasDev(interaction.user.id)) {
                return;
            }

            // console.log('marker 1')
            const context = {
                serverConf: { ...await bot.config.getConfigAsObject(interaction.guild.id), prefix: '/', },
            }
            // console.log('marker 2')
            interaction.prefix = '/';
            try {
                bot.addCommand();
                await command.run(interaction, context, bot);
            } catch (e) {
                console.error(e)
                if (e.name == "Error [SHARDING_IN_PROCESS]") {
                    bot.createErrorEmbed(interaction).setTitle(`:warning: Bot Currently Starting`).setDescription("This shard is currently in the process of starting, please try again in a few moments.").send()
                } else {
                    bot.createErrorEmbed(interaction).setDescription("Oh no! There was an error trying to execute that command! Please report this in our [support server](https://discord.com/invite/BgWcvKf).").send()
                }
            }
        }
    }
}