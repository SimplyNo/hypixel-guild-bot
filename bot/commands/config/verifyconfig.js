const { SlashCommandBuilder } = require("@discordjs/builders");
const { CommandInteraction, Constants } = require("discord.js");

const yes = ['yes', 'true', 'y', '1', 'ye', 'yep', 'yea', 'yeah', 'on', 'enable'];
const no = ['no', 'n', 'false', '0', 'nope', 'nah', 'na', 'nop', 'off', 'disable'];

module.exports = {
    name: "verifyconfig",
    aliases: ['vr', 'verifyroles', 'verifyrole', 'verifychannel', 'verifysettings', 'verification', 'vconfig', 'vc', 'verifyconf'],
    description: "Configure verification settings.",
    cooldown: 5,
    adminOnly: true,
    type: "config",
    slash: new SlashCommandBuilder()
        .setName('verifyconfig')
        .setDescription("Configure verification settings.")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current Verification config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName("reset")
                .setDescription('Reset configurations'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('autonick')
                .setDescription('Set whether the bot should automatically nickname users to their username when they verify.')
                .addBooleanOption(option =>
                    option
                        .setName("enabled")
                        .setDescription("Enable/Disable auto-nickname feature.")
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('autonickexcludedroles')
                .setDescription("Set the roles the bot will ignore while autonicknaming users.")
                .addStringOption(option =>
                    option
                        .setName("roles")
                        .setDescription("Mention the roles you want to exclude, seperated by spaces.")))
        .addSubcommand(subcmd =>
            subcmd
                .setName('verifiedrole')
                .setDescription('Set verified members role')
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to give verified members.")
                        .setRequired(false)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('unverifiedrole')
                .setDescription('Set unverified members role')
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to give unverified members.")
                        .setRequired(false)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('deletetimeout')
                .setDescription('Set the delete timeout for verify messages.')
                .addIntegerOption(option =>
                    option
                        .setName("timeout")
                        .setDescription("The timeout in seconds.")
                        .setMinValue(0)
                        .setMaxValue(600)
                        .setRequired(false)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('channel')
                .setDescription('Set the verification channel')
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to limit verification messages to.")
                        .setRequired(false)
                        .addChannelTypes(Constants.ChannelTypes.GUILD_TEXT))),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} param1 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'view') {
            showInfo()
        } else if (subcommand == "deletetimeout") {
            // let seconds = parseInt(args[1]);
            // if (!args[1] || (isNaN(seconds) && args[1].toLowerCase() !== 'none')) return bot.createErrorEmbed(interaction).setDescription(`You need to specify a valid timeout in seconds!\n\nUsage: \`${interaction.prefix}verifyconfig deletetimeout [Seconds]\``).send()
            // if (!isNaN(seconds) && (seconds <= 0) || (seconds > 600)) return bot.createErrorEmbed(interaction).setDescription(`The amount of seconds should be more than 0, and less than 600!`).send()
            const seconds = interaction.options.getInteger('timeout');
            await bot.config.verification.setDeleteTimeout(interaction.guild.id, seconds || null);

            await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verification Delete Timeout** has been set to \`${seconds ? `${seconds} seconds` : "None"}\`!`).send();
            showInfo(true)

        } else if (subcommand == "channel" || subcommand == "setchannel") {
            const channel = interaction.options.getChannel('channel');

            await bot.config.verification.setChannel(interaction.guild.id, channel || null);
            await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verification Channel** has been set to ${channel || "`None`"}!`).send();
            showInfo(true)

        } else if (["unverifiedrole", "setunverifiedrole", "setunverifyrole", "unverifyrole"].includes(subcommand)) {
            const role = interaction.options.getRole('role');

            if (role && interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign unverification role to ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && interaction.guild.ownerID != interaction.user.id && interaction.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to unverification role, because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }
            await bot.config.verification.setUnverified(interaction.guild.id, role ? role.id : null);
            await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Unverified users** will now receive the ${role || "`no role`"} role. \n\nUse \`${interaction.prefix}forceverifyroles\` to update all members' roles.`).send();

            showInfo(true)

        } else if (["role", "setrole", "verifyrole", "verifiedrole"].includes(subcommand)) {
            const role = interaction.options.getRole('role');
            if (role && interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign verification role to ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && !interaction.guild.ownerID == interaction.user.id && interaction.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to verification role, because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }
            await bot.config.verification.setRole(interaction.guild.id, role ? role.id : null);
            await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verified users** will now receive the ${role || "`no role`"} role. \n\nUse \`${interaction.prefix}forceverifyroles\` to update all members' roles.`).send();
            showInfo(true)
        } else if (subcommand == "autonickexcludedroles") {
            const unparsed = interaction.options.getString('roles');
            if (unparsed) {
                const rolesUnparsed = unparsed.split(" ");
                const roles = (await Promise.all(rolesUnparsed.map(r => bot.parseRole(r, interaction.guild, true)))).map((r, i) => ({ unparsed: rolesUnparsed[i], role: r }));
                const invalidRoles = roles.filter(r => !r.role);
                if (invalidRoles.length > 0) return bot.createErrorEmbed(interaction).setDescription(`Could not parse the following roles: ${invalidRoles.map(r => `\`${r.unparsed}\``).join(", ")}`).send();

                await bot.config.verification.setAutoNickExcludedRoles(interaction.guild.id, roles.map(r => r.role.id));
                await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verified members** who have ${roles.map(r => `<@&${r.role.id}>`).join(', ')} will be excluded from auto nick (if it's enabled).`).send();
            } else {
                await bot.config.verification.setAutoNickExcludedRoles(interaction.guild.id, undefined);
                await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Everyone** will now be subject to autonick (if it's enabled).`).send()
                showInfo(true)
            }

        } else if (subcommand == "autonick") {
            const yes = interaction.options.getBoolean('enabled', true);
            if (!yes) {
                await bot.config.verification.setAutoNick(interaction.guild.id, false);
                await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verified Users** will no longer have their nickname updated.`).send()
                showInfo(true)

            } else {
                await bot.config.verification.setAutoNick(interaction.guild.id, true);
                await bot.createEmbed(interaction).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verified Users** will now have their nickname set to their Minecraft IGN, if the bot has necessary permissions.\n\n**NOTE:** For existing verified users to have their name changed, they must simply send a message in a channel, and the bot should update their names.`).send()
                showInfo(true)
            }
        } else if (subcommand == "reset") {
            await bot.config.verification.delete(interaction.guild.id);
            bot.createEmbed(interaction).setTitle('Success!').setDescription(`Reset verification configurations.`).send()
        }
        async function showInfo(ephemeral) {
            let vSettings = (await bot.config.getConfigAsObject(interaction.guild.id)).verification;
            let Embed = bot.createEmbed(interaction).setFancyGuild({ subtext: "Verification Config" })
                .setTitle('Current Settings').setDescription(`
            🔨 **Auto Nickname** - ${vSettings.autoNick ? `${bot.assets.emotes.other.check} On` : `❌ \`Off\``}
            _Whether verified members of this server will be **renamed** to their Minecraft IGN (if the bot has permission)._
            
            ⛔ **Auto Nickname Excluded Roles** - ${vSettings.autoNickExcludedRoles ? `${vSettings.autoNickExcludedRoles.map(r => `<@&${r}>`).join(', ')}` : `\`None\``}
            _Roles that will be excluded from auto nick (if it's enabled)._
                    
            #️⃣ **Verification Channel** - ${vSettings.channel ? `<#${vSettings.channel}>` : "`None`"}    
            _Verification Channel limits the \`verify\` command to one channel._
            
            ✅ **Verified Role** - ${vSettings.role ? `<@&${vSettings.role}>` : "`None`"}     
            _Verified Role is given to ${bot.assets.emotes.other.check} **Verified** members of this server._
            
            ❌ **Unverified Role** - ${vSettings.unverified ? `<@&${vSettings.unverified}>` : "`None`"}         
            _Unverified Role is given to **Unverified** members of this server._  
            
            ⏲️ **Verify Message Delete Timeout** - ${vSettings.deleteTimeout ? `\`${vSettings.deleteTimeout}\` seconds` : "`None`"}         
            _The amount of seconds the bot waits after a user verifies to delete the verification messages._  
            `)
            // let Embed = bot.createEmbed(message).setFancyGuild().setTitle(`Verification Config`).setDescription(`\`${message.prefix}verifyconfig reset\` - Reset configurations`)
            //     .addField(`Auto Nickname » ${vSettings.autoNick ? `Yes ${bot.assets.emotes.other.check}` : `No ❌`}`, `> \`Whether verified members of this server will be **renamed** to their Minecraft IGN (if the bot has permission).\`\n__Usage__: **\`${message.prefix}verifyconfig autonick [yes/no]\`**\nCurrent Value: **${vSettings.autoNick ? `Yes ${bot.assets.emotes.other.check}` : `No ❌`}**`)
            //     .addField(`» Verification Channel`, `> **Description**: Limit the \`verify\` command to one channel.\n> **Current Channel**: ${vSettings.channel ? `<#${vSettings.channel}>` : "**None**"}\nUsage: \`${message.prefix}verifyconfig channel [Channel]\``)
            //     .addField(`» Verified Role`, `> **Description**: Role given to ${bot.assets.emotes.other.check} **Verified** members of this server.\n> **Current Role**: ${vSettings.role ? `<@&${vSettings.role}>` : "**None**"}\nUsage: \`${message.prefix}verifyconfig role [Role]\``)
            //     .addField(`» :new: Unverified Role`, `> **Description**: Role given to **Unverified** members of this server.\n> **Current Role**: ${vSettings.unverified ? `<@&${vSettings.unverified}>` : "**None**"}\nUsage: \`${message.prefix}verifyconfig unverifiedrole [Role]\``)
            Embed.send({ ephemeral })
        }
    },
    async execute(message, args, bot) {
        if (!args.length) {
            let vSettings = message.serverConf.verification;
            let Embed = bot.createEmbed(message).setFancyGuild({ subtext: "Verification Config" }).setDescription(`
~~—————————————————————~~
**Valid Arguments:**
• \`${message.prefix}verifyconfig reset\` - Reset configurations.
• \`${message.prefix}verifyconfig autonick [yes | no]\` - Turn autonick on/off.
• \`${message.prefix}verifyconfig channel [Channel | 'none']\` - Set verification channel.
• \`${message.prefix}verifyconfig verifiedrole [Role | 'none']\` - Set verified members role.
• \`${message.prefix}verifyconfig unverifiedrole [Role | 'none']\` - Set unverified members role.
• \`${message.prefix}verifyconfig deletetimeout [Seconds]\` - Set the delete timeout for verify messages.
~~—————————————————————~~

⚙️ **Auto Nickname** - ${vSettings.autoNick ? `${bot.assets.emotes.other.check} On` : `❌ \`Off\``}
_Whether verified members of this server will be **renamed** to their Minecraft IGN (if the bot has permission)._

⚙️ **Verification Channel** - ${vSettings.channel ? `<#${vSettings.channel}>` : "`None`"}    
_Verification Channel limits the \`verify\` command to one channel._

⚙️ **Verified Role** - ${vSettings.role ? `<@&${vSettings.role}>` : "`None`"}     
_Verified Role is given to ${bot.assets.emotes.other.check} **Verified** members of this server._

⚙️ **Unverified Role** - ${vSettings.unverified ? `<@&${vSettings.unverified}>` : "`None`"}         
_Unverified Role is given to **Unverified** members of this server._  

⚙️ **Verify Message Delete Timeout** - ${vSettings.deleteTimeout ? `\`${vSettings.deleteTimeout}\` seconds` : "`None`"}         
_The amount of seconds the bot waits after a user verifies to delete the verification messages._  
`)
            // let Embed = bot.createEmbed(message).setFancyGuild().setTitle(`Verification Config`).setDescription(`\`${message.prefix}verifyconfig reset\` - Reset configurations`)
            //     .addField(`Auto Nickname » ${vSettings.autoNick ? `Yes ${bot.assets.emotes.other.check}` : `No ❌`}`, `> \`Whether verified members of this server will be **renamed** to their Minecraft IGN (if the bot has permission).\`\n__Usage__: **\`${message.prefix}verifyconfig autonick [yes/no]\`**\nCurrent Value: **${vSettings.autoNick ? `Yes ${bot.assets.emotes.other.check}` : `No ❌`}**`)
            //     .addField(`» Verification Channel`, `> **Description**: Limit the \`verify\` command to one channel.\n> **Current Channel**: ${vSettings.channel ? `<#${vSettings.channel}>` : "**None**"}\nUsage: \`${message.prefix}verifyconfig channel [Channel]\``)
            //     .addField(`» Verified Role`, `> **Description**: Role given to ${bot.assets.emotes.other.check} **Verified** members of this server.\n> **Current Role**: ${vSettings.role ? `<@&${vSettings.role}>` : "**None**"}\nUsage: \`${message.prefix}verifyconfig role [Role]\``)
            //     .addField(`» :new: Unverified Role`, `> **Description**: Role given to **Unverified** members of this server.\n> **Current Role**: ${vSettings.unverified ? `<@&${vSettings.unverified}>` : "**None**"}\nUsage: \`${message.prefix}verifyconfig unverifiedrole [Role]\``)
            Embed.send()
        } else if (args[0].toLowerCase() == "deletetimeout") {
            let seconds = parseInt(args[1]);
            if (!args[1] || (isNaN(seconds) && args[1].toLowerCase() !== 'none')) return bot.createErrorEmbed(message).setDescription(`You need to specify a valid timeout in seconds!\n\nUsage: \`${message.prefix}verifyconfig deletetimeout [Seconds]\``).send()
            if (!isNaN(seconds) && (seconds <= 0) || (seconds > 600)) return bot.createErrorEmbed(message).setDescription(`The amount of seconds should be more than 0, and less than 600!`).send()

            await bot.config.verification.setDeleteTimeout(message.guild.id, seconds || null);

            bot.createEmbed(message).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verification Delete Timeout** has been set to \`${seconds ? `${seconds} seconds` : "None"}\`!`).send();
        } else if (args[0].toLowerCase() == "channel" || args[0].toLowerCase() == "setchannel") {

            let channel = await bot.parseChannel(args[1], message.guild);
            if (!channel && (!args[1] || args[1].toLowerCase() !== 'none')) return bot.createErrorEmbed(message).setDescription(`You need to specify a valid \`Channel Name\`, \`ID\`, \`#Mention\` or 'none'!\n\nUsage: \`${message.prefix}verifyconfig channel [Channel]\``).send()

            await bot.config.verification.setChannel(message.guild.id, channel || null);
            bot.createEmbed(message).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verification Channel** has been set to ${channel || "`None`"}!`).send();
        } else if (["unverifiedrole", "setunverifiedrole", "setunverifyrole", "unverifyrole"].includes(args[0].toLowerCase())) {
            let role = await bot.parseRole(args[1], message.guild);
            if (!role && (!args[1] || args[1].toLowerCase() !== 'none')) return bot.createErrorEmbed(message).setDescription(`You need to specify a valid \`Role Name\`, \`ID\`, \`@Mention\` or 'none'!\n\nUsage: \`${message.prefix}verifyconfig unverifiedrole [Role]\``).send()

            if (role && message.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign unverification role to ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && message.guild.ownerID != message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to unverification role, because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }
            await bot.config.verification.setUnverified(message.guild.id, role ? role.id : null);
            bot.createEmbed(message).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Unverified users** will now receive the ${role || "`no role`"} role. \n\nUse \`${message.prefix}forceverifyroles\` to update all members' roles.`).send();


        } else if (["role", "setrole", "verifyrole", "verifiedrole"].includes(args[0].toLowerCase())) {
            let role = await bot.parseRole(args[1], message.guild);
            if (!role && (!args[1] || args[1].toLowerCase() !== 'none')) return bot.createErrorEmbed(message).setDescription(`You need to specify a valid \`Role Name\`, \`ID\`, \`@Mention\` or 'none'!\n\nUsage: \`${message.prefix}verifyconfig verifiedrole [Role]\``).send()

            if (role && message.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign verification role to ${role} because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && !message.guild.ownerID == message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to verification role, because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }
            await bot.config.verification.setRole(message.guild.id, role ? role.id : null);
            bot.createEmbed(message).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verified users** will now receive the ${role || "`no role`"} role. \n\nUse \`${message.prefix}forceverifyroles\` to update all members' roles.`).send();
        } else if (args[0].toLowerCase() == "autonick") {
            if (!args[1] || !no.includes(args[1].toLowerCase()) && !yes.includes(args[1].toLowerCase())) {
                return bot.createErrorEmbed(message).setDescription(`That's not a valid option for that setting. Try \`yes\` or \`no\`.`).send()
            }
            if (no.includes(args[1].toLowerCase())) {
                await bot.config.verification.setAutoNick(message.guild.id, false);
                return bot.createEmbed(message).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verified Users** will no longer have their nickname updated.`).send()
            } else {
                await bot.config.verification.setAutoNick(message.guild.id, true);
                return bot.createEmbed(message).setTitle(`${bot.assets.emotes.other.check} Success!`).setDescription(`**Verified Users** will now have their nickname set to their Minecraft IGN, if the bot has necessary permissions.\n\n**NOTE:** For existing verified users to have their name changed, they must simply send a message in a channel, and the bot should update their names.`).send()
            }

        } else if (args[0].toLowerCase() == "reset") {
            await bot.config.verification.delete(message.guild.id);
            bot.createEmbed(message).setTitle('Success!').setDescription(`Reset verification configurations.`).send()
        } else {
            bot.createErrorEmbed(message).setTitle(`Invalid Subcommand`).setDescription(`\`${args[0]}\` is not a valid subcommand! Do \`${message.prefix}verifyconfig\` to see all available options`).send()
        }
    }
}