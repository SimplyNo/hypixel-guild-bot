const { SlashCommandBuilder } = require("@discordjs/builders");
const { Client } = require("undici");

module.exports = {
    name: "gxproles",
    aliases: ["xproles", "gexproles", "guildxproles"],
    adminOnly: true,
    description: 'Configure roles that will be given to guild members based on guild experience.',
    cooldown: 5,
    usage: "[info|add|remove|set|pin|reset]",
    example: "add 100000 @GrinderGod",
    type: "config",
    slash: new SlashCommandBuilder()
        .setName("gxproles")
        .setDescription("Configure roles that will be given to guild members based on guild experience.")
        .addSubcommand(subcmd =>
            subcmd
                .setName("info")
                .setDescription("Command info"))
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current GXPRoles config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('add')
                .setDescription('Adds a new GXP role.')
                .addIntegerOption(option =>
                    option
                        .setName("gxp")
                        .setDescription(`The minimum GXP required to get the role.`)
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(`The role to give to the guild member.`)
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("remove")
                .setDescription("Removes a GXP role.")
                .addIntegerOption(option =>
                    option
                        .setName('pos')
                        .setDescription('Role position')
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("set")
                .setDescription("Sets a new GXP Role.")
                .addIntegerOption(option =>
                    option
                        .setName('pos')
                        .setDescription('Position.')
                        .setAutocomplete(true)
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(`The role to give to the guild member.`)
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("pin")
                .setDescription("Makes a GXP Role consistent")
                .addIntegerOption(option =>
                    option
                        .setName('pos')
                        .setDescription('Position.')
                        .setAutocomplete(true)
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName("reset")
                .setDescription("Resets GXP Role configuration.")),
    /**
     * 
     * @param {Interaction} interaction 
     * @param {*} param1 
     * @param {Client} bot 
     */
    async run(interaction, { serverConf }, bot) {
        if (!serverConf.autoRole.guild) return bot.createErrorEmbed(interaction).setDescription(`You need to set your guild in autorole before you can use this command!\n\n\`${interaction.prefix}autorole setguild <GUILD NAME>\``).send()
        let gxpRoles = serverConf.gxpRoles.sort((a, b) => b.gxp - a.gxp);
        console.log(gxpRoles);
        const subcommand = interaction.options.getSubcommand();
        // console.log(serverConf)
        if (subcommand === 'view') {
            sendInfo()
        } else if (subcommand == 'info') {
            bot.createEmbed(interaction)
                .setAuthor(interaction.guild.name, interaction.guild.iconURL())
                .setTitle(`GXP Roles Info`)
                .setDescription(`_GXP Roles will automatically give roles to verified guild members based off of the guild experience they earned in the past week._ Below you can find a list of all available GXP role arguments and what they do:\n
• </gxproles help:${interaction.commandId}> - \`Shows this command\`
• </gxproles add:${interaction.commandId}> - \`Adds a new GXP role.\`
• </gxproles remove:${interaction.commandId}> - \`Removes GXP role.\`
• </gxproles set:${interaction.commandId}> - \`Sets a new GXP Role.\`
• </gxproles pin:${interaction.commandId}> - \`Makes a GXP Role persistant.\`
• </gxproles reset:${interaction.commandId}> - \`Resets GXP Role configuration.\`
`).send()
        } else if (subcommand == "add") {
            // if (!args[1]) return bot.createErrorEmbed(interaction).setDescription(`Invalid Usage.\n\nExample Usage: \`${interaction.prefix}gxproles add [Minimum Guild Experience] [Role]\``).send()
            const gxp = interaction.options.getInteger('gxp', true);
            const role = interaction.options.getRole('role', true);

            if (isNaN(gxp)) return bot.createErrorEmbed(interaction).setDescription(`Please input a valid number for guild experience!`).send();
            if (gxpRoles.find(e => e.gxp == gxp)) return bot.createErrorEmbed(interaction).setDescription(`You already have a role for that number of guild xp! Use \`${interaction.prefix}gxproles set\` to edit the role.`).send();
            // if (!role) return bot.createErrorEmbed(interaction).setDescription(`Invalid Role. Please input a valid \`Role name\`, \`role ID\`, or \`@Role\``).send();

            if (interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to add GXP role ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }

            if (gxpRoles.length > 5) return bot.createErrorEmbed(interaction).setDescription(`You have reached the maximum number of GXP roles (5)!`).send()
            // timeRoles.push({ role: role.id, days: days , test: 1});

            await bot.config.gxpRoles.setConfig(interaction.guild.id, [...gxpRoles, { role: role.id, gxp: gxp }]);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who have earned more than \`${gxp.toLocaleString()} GEXP\` or more will receive the ${role} role.`).send()
            sendInfo(true)

        } else if (subcommand == "remove") {
            // if (!args[1]) return bot.createErrorEmbed(interaction).setDescription(`Invalid Usage.\n\nExample Usage: \`${interaction.prefix}gxproles remove [pos]\``).send()
            const pos = interaction.options.getInteger('pos', true);

            // let pos = parseInt(args[1]);
            // if (isNaN(pos)) return bot.createErrorEmbed(interaction).setDescription(`Please input a valid GXP Role position!`).send();
            if (!gxpRoles[pos - 1]) return bot.createErrorEmbed(interaction).setDescription(`That position does not exist!`).send();
            let deleted = gxpRoles.splice(pos - 1, 1)[0];
            await bot.config.gxpRoles.setConfig(interaction.guild.id, gxpRoles);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`Removed GXP Role \`${deleted.gxp.toLocaleString()} GEXP\``).send()
            sendInfo(true)

        } else if (subcommand == "set") {

            const pos = interaction.options.getInteger('pos', true);
            const role = interaction.options.getRole('role', true);

            if (!gxpRoles[pos - 1]) return bot.createErrorEmbed(interaction).setDescription(`That is not a valid position! Use \`${interaction.prefix}gxproles add\` to add a role.`).send();

            gxpRoles[pos - 1].role = role.id;
            await bot.config.gxpRoles.setConfig(interaction.guild.id, gxpRoles);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who earned **${gxpRoles[pos - 1].gxp.toLocaleString()} GEXP** or more will now receive the ${role} role.`).send()
            sendInfo(true)

        } else if (subcommand == "pin") {
            const pos = interaction.options.getInteger('pos', true);
            if (isNaN(pos)) return bot.createErrorEmbed(interaction).setDescription(`Please input a valid GXP Role position!`).send();
            if (!gxpRoles[pos - 1]) return bot.createErrorEmbed(interaction).setDescription(`That position does not exist!`).send();

            gxpRoles[pos - 1].pinned = true;
            await bot.config.gxpRoles.setConfig(interaction.guild.id, gxpRoles);
            await bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`📌 Success!`).setDescription(`\`${gxpRoles[pos - 1].gxp.toLocaleString()} GEXP\` GXP Role will now be persistant.`).send()
            sendInfo(true)

        } else if (subcommand == "reset") {
            bot.config.gxpRoles.delete(interaction.guild.id);
            bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`GXP roles configuration has been reset.`).send()
        } else {
            bot.createErrorEmbed(interaction).setDescription(`\`${args[0]}\` is not a valid GXP Roles subcommand!\n\n Use \`${interaction.prefix}gxproles help\` to see all subcommands!`).send()
        }

        async function sendInfo(ephemeral) {
            gxpRoles = (await bot.config.getConfigAsObject(interaction.guild.id)).gxpRoles.sort((a, b) => b.gxp - a.gxp);

            let description = `Use **${interaction.prefix}gxproles help** to see a list of available arguments!`;
            let guild = await bot.wrappers.hypixelGuild.get(serverConf.autoRole.guild, "id");
            if (guild && guild.exists == false) {
                interaction.reply("Unable to get GXP roles config because this guild seems to not exist anymore...")
            } else {
                let embed = bot.createEmbed(interaction)
                    .setAuthor(interaction.guild.name, interaction.guild.iconURL())
                    .setTitle(`${guild.name} GXP Roles Config`)
                    .setDescription(description)
                    .setFooter('GXP Roles guild is based on your autorole guild!')
                if (!gxpRoles.length) {
                    embed.addField(`No GXP roles set!`, `Use \`${interaction.prefix}gxproles add [Guild Experience Amount] [@Role]\` to add a new GXP role.`)
                } else {
                    let str = "";
                    gxpRoles.forEach((gr, index) => {
                        str += `\`${index + 1}\` \`${gr.gxp.toLocaleString()} GEXP\` - ${gr.pinned ? '📌 ' : ''}<@&${gr.role}>\n`
                    })
                    embed.addField(`ID | GEXP Needed | Role`, str)
                }
                embed.send({ ephemeral: ephemeral })
            }
            bot.autoRoleInterval.interval(bot, interaction.guild, guild);
        }
    },
    async execute(message, args, bot) {
        if (!message.serverConf.autoRole.guild) return bot.createErrorEmbed(message).setDescription(`You need to set your guild in autorole before you can use this command!\n\n\`${message.prefix}autorole setguild <GUILD NAME>\``).send()
        let gxpRoles = message.serverConf.gxpRoles.sort((a, b) => b.gxp - a.gxp);
        console.log(gxpRoles)
        // console.log(message.serverConf)
        if (!args.length) {
            let description = `Use **${message.prefix}gxproles help** to see a list of available arguments!`;
            let guild = await bot.wrappers.hypixelGuild.get(message.serverConf.autoRole.guild, "id");
            if (guild && guild.exists == false) {
                message.reply("Unable to get GXP roles config because this guild seems to not exist anymore...")
            } else {
                let embed = bot.createEmbed(message)
                    .setAuthor(message.guild.name, message.guild.iconURL())
                    .setTitle(`${guild.name} GXP Roles Config`)
                    .setDescription(description)
                    .setFooter('GXP Roles guild is based on your autorole guild!')
                if (!gxpRoles.length) {
                    embed.addField(`No GXP roles set!`, `Use \`${message.prefix}gxproles add [Guild Experience Amount] [@Role]\` to add a new GXP role.`)
                } else {
                    let str = "";
                    gxpRoles.forEach((gr, index) => {
                        str += `\`${index + 1}\` \`${gr.gxp.toLocaleString()} GEXP\` - ${gr.pinned ? '📌 ' : ''}<@&${gr.role}>\n`
                    })
                    embed.addField(`ID | GEXP Needed | Role`, str)
                }
                embed.send()
            }
            bot.autoRoleInterval.interval(bot, message.guild, guild);

        } else if (args[0].toLowerCase() == 'help' || args[0].toLowerCase() == 'info') {
            bot.createEmbed(message)
                .setAuthor(message.guild.name, message.guild.iconURL())
                .setTitle(`GXP Roles Info`)
                .setDescription(`_GXP Roles will automatically give roles to verified guild members based off of the guild experience they earned in the past week._ Below you can find a list of all available GXP role arguments and what they do:\n
• \`${message.prefix}gxproles help\` - Shows this command
• \`${message.prefix}gxproles add [GXP] [Role]\` - Adds a new GXP role.
• \`${message.prefix}gxproles remove [pos]\` - Removes GXP role.
• \`${message.prefix}gxproles set [pos] [Role]\` - Sets a new GXP Role.
• \`${message.prefix}gxproles pin [pos]\` - Makes a GXP Role persistant.
• \`${message.prefix}gxproles reset\` - Resets GXP Role configuration.
`).send()
        } else if (args[0].toLowerCase() == "add") {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}gxproles add [Minimum Guild Experience] [Role]\``).send()
            let gxp = parseInt(args[1]);
            if (isNaN(gxp)) return bot.createErrorEmbed(message).setDescription(`Please input a valid number for guild experience!`).send();
            if (gxpRoles.find(e => e.gxp == gxp)) return bot.createErrorEmbed(message).setDescription(`You already have a role for that number of guild xp! Use \`${message.prefix}gxproles set\` to edit the role.`).send();
            let role = await bot.parseRole(args[2], message.guild);
            if (!role) return bot.createErrorEmbed(message).setDescription(`Invalid Role. Please input a valid \`Role name\`, \`role ID\`, or \`@Role\``).send();

            if (message.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to add GXP role ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }

            if (gxpRoles.length > 5) return bot.createErrorEmbed(message).setDescription(`You have reached the maximum number of GXP roles (5)!`).send()
            // timeRoles.push({ role: role.id, days: days , test: 1});

            bot.config.gxpRoles.setConfig(message.guild.id, [...gxpRoles, { role: role.id, gxp: gxp }]);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who have earned more than \`${gxp.toLocaleString()} GEXP\` or more will receive the ${role} role.`).send()

        } else if (args[0].toLowerCase() == "remove") {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}gxproles remove [pos]\``).send()
            let pos = parseInt(args[1]);
            if (isNaN(pos)) return bot.createErrorEmbed(message).setDescription(`Please input a valid GXP Role position!`).send();
            if (!gxpRoles[pos - 1]) return bot.createErrorEmbed(message).setDescription(`That position does not exist!`).send();
            let deleted = gxpRoles.splice(pos - 1, 1)[0];
            bot.config.gxpRoles.setConfig(message.guild.id, gxpRoles);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`Removed GXP Role \`${deleted.gxp.toLocaleString()} GEXP\``).send()

        } else if (args[0].toLowerCase() == "set") {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}gxproles set [pos] [GEXP amount]\``).send()
            let pos = parseInt(args[1]);
            if (isNaN(pos)) return bot.createErrorEmbed(message).setDescription(`Please input a valid position!`).send();
            if (!gxpRoles[pos - 1]) return bot.createErrorEmbed(message).setDescription(`That is not a valid position! Use \`${message.prefix}gxproles add\` to add a role.`).send();
            let role = await bot.parseRole(args[2], message.guild);
            if (!role) return bot.createErrorEmbed(message).setDescription(`"\`${args[2]}\`" is an invalid role. Please input a valid \`Role name\`, \`role ID\`, or \`@Role\``).send();


            gxpRoles[pos - 1].role = role.id;
            bot.config.gxpRoles.setConfig(message.guild.id, gxpRoles);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`**Verified guild members** who earned **${gxpRoles[pos - 1].gxp.toLocaleString()} GEXP** or more will now receive the ${role} role.`).send()

        } else if (args[0].toLowerCase() == "pin") {
            if (!args[1]) return bot.createErrorEmbed(message).setDescription(`Invalid Usage.\n\nExample Usage: \`${message.prefix}gxproles pin [pos]\``).send()
            let pos = parseInt(args[1]);
            if (isNaN(pos)) return bot.createErrorEmbed(message).setDescription(`Please input a valid GXP Role position!`).send();
            if (!gxpRoles[pos - 1]) return bot.createErrorEmbed(message).setDescription(`That position does not exist!`).send();

            gxpRoles[pos - 1].pinned = true;
            bot.config.gxpRoles.setConfig(message.guild.id, gxpRoles);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`📌 Success!`).setDescription(`\`${gxpRoles[pos - 1].gxp.toLocaleString()} GEXP\` GXP Role will now be persistant.`).send()

        } else if (args[0].toLowerCase() == "reset") {
            bot.config.gxpRoles.delete(message.guild.id);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`GXP roles configuration has been reset.`).send()
        } else {
            bot.createErrorEmbed(message).setDescription(`\`${args[0]}\` is not a valid GXP Roles subcommand!\n\n Use \`${message.prefix}gxproles help\` to see all subcommands!`).send()
        }
    }
}