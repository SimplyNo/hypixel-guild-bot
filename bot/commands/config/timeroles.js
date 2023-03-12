const { SlashCommandBuilder } = require("@discordjs/builders");
const { CommandInteraction } = require("discord.js");

module.exports = {
    name: 'timeroles',
    description: 'Configure roles that will be given to guild members based on the time since they joined.',
    adminOnly: true,
    cooldown: 5,
    type: "config",
    aliases: ['tr', 'timerole'],
    slash: new SlashCommandBuilder()
        .setName('timeroles')
        .setDescription('Configure roles that will be given to guild members based on the time since they joined.')

        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current TimeRoles config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('info')
                .setDescription('View command info'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('add')
                .setDescription(`Adds a new time role`)
                .addIntegerOption(option =>
                    option
                        .setName("time")
                        .setDescription("The days since the member joined the guild.")
                        .setMinValue(0)
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to give to members.")
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('remove')
                .setDescription('Removes a time role')
                .addIntegerOption(option =>
                    option
                        .setName("pos")
                        .setDescription("The position of the time role to remove.")
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription('Sets a new time role')
                .addIntegerOption(option =>
                    option
                        .setName("pos")
                        .setDescription("The position of the time role to set.")
                        .setAutocomplete(true)
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to give to members.")
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('pin')
                .setDescription(`Makes a Time Role persistant.`)
                .addIntegerOption(option =>
                    option
                        .setName("pos")
                        .setDescription("The position of the time role to make persistant.")
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('reset')
                .setDescription('Resets Time Role configuration')),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} param1 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        if (!serverConf.autoRole.guild) return bot.createErrorEmbed(interaction).setDescription(`You need to set your guild in autorole before you can use this command!\n\n\`${interaction.prefix}autorole setguild <GUILD NAME>\``).send()
        const subcommand = interaction.options.getSubcommand();
        let timeRoles = serverConf.timeRoles.sort((a, b) => b.days - a.days);

        // console.log(message.serverConf)
        if (subcommand === 'view') {
            sendInfo()
        } else if (subcommand.toLowerCase() == 'help' || subcommand.toLowerCase() == 'info') {
            bot.createEmbed(interaction)
                .setAuthor(interaction.guild.name, interaction.guild.iconURL())
                .setTitle(`Time Roles Info`)
                .setDescription(`_Time Role will automatically give roles to verified guild members based off of the time since they joined the guild._ Below you can find a list of all available Time Role arguments and what they do:\n
• </timeroles help:${interaction.commandId}> - Shows this command
• </timeroles add:${interaction.commandId}> - Adds a new time role.
• </timeroles remove:${interaction.commandId}> - Removes time role.
• </timeroles set:${interaction.commandId}> - Sets a new Time Role.
• </timeroles pin:${interaction.commandId}> - Makes a Time Role persistant.
• </timeroles reset:${interaction.commandId}> - Resets Time Role configuration.
            `).send()
        } else if (subcommand == 'add') {
            const days = interaction.options.getInteger('time', true);
            const role = interaction.options.getRole('role', true);
            if (timeRoles.find(e => e.days == days)) return bot.createErrorEmbed(interaction).setDescription(`You already have a role for that number of days! Use \`${interaction.prefix}timeroles set\` to edit the role.`).send();
            // let role = await bot.parseRole(args[2], interaction.guild);
            // if (!role) return bot.createErrorEmbed(interaction).setDescription(`Invalid Role. Please input a valid \`Role name\`, \`role ID\`, or \`@Role\``).send();

            if (interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to add timerole ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }

            if (timeRoles.length > 10) return bot.createErrorEmbed(interaction).setDescription(`You have reached the maximum number of time roles (10)!`).send()
            // timeRoles.push({ role: role.id, days: days , test: 1});

            await bot.config.timeRoles.setConfig(interaction.guild.id, [...timeRoles, { role: role.id, days: days }]);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who have been in the guild for **${days} days** or more will receive the ${role} role.`).send()
            sendInfo(true)

        } else if (subcommand == 'remove') {

            const pos = interaction.options.getInteger('pos', true);

            if (!timeRoles[pos - 1]) return bot.createErrorEmbed(interaction).setDescription(`That position does not exist!`).send();
            let deleted = timeRoles.splice(pos - 1, 1)[0];
            await bot.config.timeRoles.setConfig(interaction.guild.id, timeRoles);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`Removed Time Role **${deleted.days} days**`).send()
            sendInfo(true)

        } else if (subcommand == 'pin') {

            const pos = interaction.options.getInteger('pos', true);

            if (!timeRoles[pos - 1]) return bot.createErrorEmbed(interaction).setDescription(`That position does not exist!`).send();

            timeRoles[pos - 1].pinned = true;
            await bot.config.timeRoles.setConfig(interaction.guild.id, timeRoles);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`📌 Success!`).setDescription(`**${timeRoles[pos - 1].days} days** Time Role will now be persistant.`).send()
            sendInfo(true)

        } else if (subcommand == 'set') {
            const pos = interaction.options.getInteger('pos', true);
            const role = interaction.options.getRole('role', true);
            if (isNaN(pos)) return bot.createErrorEmbed(interaction).setDescription(`Please input a valid position!`).send();
            if (!timeRoles[pos - 1]) return bot.createErrorEmbed(interaction).setDescription(`You do not have a role for that number of days! Use \`${interaction.prefix}timeroles add\` to add a role.`).send();
            // let role = await bot.parseRole(args[2], interaction.guild);
            // if (!role) return bot.createErrorEmbed(interaction).setDescription(`"\`${args[2]}\`" is an invalid role. Please input a valid \`Role name\`, \`role ID\`, or \`@Role\``).send();


            timeRoles[pos - 1].role = role.id;
            await bot.config.timeRoles.setConfig(interaction.guild.id, timeRoles);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who have been in the guild for **${timeRoles[pos - 1].days} days** or more will now receive the ${role} role.`).send()
            sendInfo(true)
        } else if (subcommand == 'reset') {
            bot.config.timeRoles.delete(interaction.guild.id);
            bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`Time Role configuration has been reset.`).send()
        }
        async function sendInfo(ephemeral) {
            timeRoles = (await bot.config.getConfigAsObject(interaction.guild.id)).timeRoles.sort((a, b) => b.days - a.days);


            let description = `Use **${interaction.prefix}timeroles help** to see a list of available arguments!`;
            // let guild = message.serverConf.guild

            let embed = bot.createEmbed(interaction)
                .setAuthor(interaction.guild.name, interaction.guild.iconURL())
                .setTitle(`Time Roles Config`)
                .setDescription(description)
                .setFooter('Timeroles guild is based off of your AUTOROLE guild.')
            if (!timeRoles.length) {
                embed.addField(`No time roles set!`, `Use \`>timeroles add [#DaysSinceJoin] [@Role]\` to add a new time role.`)
            } else {
                let str = "";
                timeRoles.forEach((tr, index) => {
                    str += `\`${index + 1}\` **${tr.days} days** - ${tr.pinned ? '📌 ' : ''}<@&${tr.role}>\n`
                })
                embed.addField(`ID | Days | Role`, str)
            }
            embed.send({ ephemeral })

        }
    },
    async execute(message, args, bot) {
        if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed(message).setDescription(`You need to set your guild in autorole before you can use this command!\n\n\`${message.prefix}autorole setguild <GUILD NAME>\``).send()
        let timeRoles = message.serverConf.timeRoles.sort((a, b) => b.days - a.days);
        // console.log(message.serverConf)
        if (!args.length) {
            let description = `Use **${message.prefix}timeroles help** to see a list of available arguments!`;
            // let guild = message.serverConf.guild

            let embed = bot.createEmbed(message)
                .setAuthor(message.guild.name, message.guild.iconURL())
                .setTitle(`Time Roles Config`)
                .setDescription(description)
                .setFooter('Timeroles guild is based off of your AUTOROLE guild.')
            if (!timeRoles.length) {
                embed.addField(`No time roles set!`, `Use \`>timeroles add [#DaysSinceJoin] [@Role]\` to add a new time role.`)
            } else {
                let str = "";
                timeRoles.forEach((tr, index) => {
                    str += `\`${index + 1}\` **${tr.days} days** - ${tr.pinned ? '📌 ' : ''}<@&${tr.role}>\n`
                })
                embed.addField(`ID | Days | Role`, str)
            }
            embed.send()

        } else if (args[0].toLowerCase() == 'help' || args[0].toLowerCase() == 'info') {
            bot.createEmbed(message)
                .setAuthor(message.guild.name, message.guild.iconURL())
                .setTitle(`Time Roles Info`)
                .setDescription(`_Time Role will automatically give roles to verified guild members based off of the time since they joined the guild._ Below you can find a list of all available Time Role arguments and what they do:\n
• \`${message.prefix}timeroles help\` - Shows this command
• \`${message.prefix}timeroles add [#DaysSinceJoin] [Role]\` - Adds a new time role.
• \`${message.prefix}timeroles remove [pos]\` - Removes time role.
• \`${message.prefix}timeroles set [pos] [Role]\` - Sets a new Time Role.
• \`${message.prefix}timeroles pin [pos]\` - Makes a Time Role persistant.
• \`${message.prefix}timeroles reset\` - Resets Time Role configuration.
`).send()
        } else if (args[0].toLowerCase() == 'add') {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}timeroles add [#DaysSinceJoin] [Role]\``).send()
            let days = parseInt(args[1]);
            if (isNaN(days)) return bot.createErrorEmbed(message).setDescription(`Please input a valid number of days!`).send();
            if (timeRoles.find(e => e.days == days)) return bot.createErrorEmbed(message).setDescription(`You already have a role for that number of days! Use \`${message.prefix}timeroles set\` to edit the role.`).send();
            let role = await bot.parseRole(args[2], message.guild);
            if (!role) return bot.createErrorEmbed(message).setDescription(`Invalid Role. Please input a valid \`Role name\`, \`role ID\`, or \`@Role\``).send();

            if (message.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to add timerole ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }

            if (timeRoles.length > 5) return bot.createErrorEmbed(message).setDescription(`You have reached the maximum number of time roles (5)!`).send()
            // timeRoles.push({ role: role.id, days: days , test: 1});

            bot.config.timeRoles.setConfig(message.guild.id, [...timeRoles, { role: role.id, days: days }]);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who have been in the guild for **${days} days** or more will receive the ${role} role.`).send()
        } else if (args[0].toLowerCase() == 'remove') {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}timeroles remove [pos]\``).send()
            let pos = parseInt(args[1]);
            if (isNaN(pos)) return bot.createErrorEmbed(message).setDescription(`Please input a valid Time Role position!`).send();
            if (!timeRoles[pos - 1]) return bot.createErrorEmbed(message).setDescription(`That position does not exist!`).send();
            let deleted = timeRoles.splice(pos - 1, 1)[0];
            bot.config.timeRoles.setConfig(message.guild.id, timeRoles);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`Removed Time Role **${deleted.days} days**`).send()
        } else if (args[0].toLowerCase() == 'pin') {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}timeroles pin [pos]\``).send()
            let pos = parseInt(args[1]);
            if (isNaN(pos)) return bot.createErrorEmbed(message).setDescription(`Please input a valid Time Role position!`).send();
            if (!timeRoles[pos - 1]) return bot.createErrorEmbed(message).setDescription(`That position does not exist!`).send();

            timeRoles[pos - 1].pinned = true;
            bot.config.timeRoles.setConfig(message.guild.id, timeRoles);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`📌 Success!`).setDescription(`**${timeRoles[pos - 1].days} days** Time Role will now be persistant.`).send()
        } else if (args[0].toLowerCase() == 'set') {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}timeroles set [pos] [Role]\``).send()
            let pos = parseInt(args[1]);
            if (isNaN(pos)) return bot.createErrorEmbed(message).setDescription(`Please input a valid position!`).send();
            if (!timeRoles[pos - 1]) return bot.createErrorEmbed(message).setDescription(`You do not have a role for that number of days! Use \`${message.prefix}timeroles add\` to add a role.`).send();
            let role = await bot.parseRole(args[2], message.guild);
            if (!role) return bot.createErrorEmbed(message).setDescription(`"\`${args[2]}\`" is an invalid role. Please input a valid \`Role name\`, \`role ID\`, or \`@Role\``).send();


            timeRoles[pos - 1].role = role.id;
            bot.config.timeRoles.setConfig(message.guild.id, timeRoles);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who have been in the guild for **${timeRoles[pos - 1].days} days** or more will now receive the ${role} role.`).send()
        } else if (args[0].toLowerCase() == 'reset') {
            bot.config.timeRoles.delete(message.guild.id);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`Time Role configuration has been reset.`).send()
        }

    }
}