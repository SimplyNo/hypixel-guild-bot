const { SlashCommandBuilder } = require("@discordjs/builders");
const { execute } = require("../../util/intervals/autoupdate");
const rankFunctions = require("../../util/rankFunctions");
const config = require("../../../config.json");
const defaultSettings = require("../../../default-settings.json")
const { CommandInteraction } = require("discord.js");
const ranks = Object.keys(defaultSettings.rankRoles);
module.exports = {
    name: "rankroles",
    aliases: ["rr", "roleranks", "rankrole"],
    cooldown: 5,
    description: "Give roles to players based on their Hypixel rank.",
    usage: '[set|pin|remove|reset]',
    example: "set mvp+ @Mvp+",
    adminOnly: true,
    type: 'config',
    slash: new SlashCommandBuilder()
        .setName('rankroles')
        .setDescription("Give roles to players based on their Hypixel rank.")
        .addSubcommand(subcmd =>
            subcmd
                .setName('view')
                .setDescription('View current RankRoles config'))
        .addSubcommand(subcmd =>
            subcmd
                .setName('set')
                .setDescription('Set a role to give to players based on their Hypixel rank.')
                .addStringOption(option =>
                    option
                        .setName("rank")
                        .setDescription("The rank to give the role to.")
                        .setRequired(true)
                        .addChoices(...ranks.map(e => ({ name: e, value: e }))))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to give to players.")
                        .setRequired(true)))
        .addSubcommand(subcmd =>
            subcmd
                .setName('pin')
                .setDescription('Make a role persistant.')
                .addStringOption(option =>
                    option
                        .setName("rank")
                        .setDescription("The rank to make persistant.")
                        .setRequired(true)
                        .addChoices(...ranks.map(e => ({ name: e, value: e })))))
        .addSubcommand(subcmd =>
            subcmd
                .setName('remove')
                .setDescription('Remove a rank role.')
                .addStringOption(option =>
                    option
                        .setName("rank")
                        .setDescription("The rank to remove.")
                        .setRequired(true)
                        .addChoices(...ranks.map(e => ({ name: e, value: e }))
                        )
                ))
        .addSubcommand(subcmd =>
            subcmd
                .setName('reset')
                .setDescription('Reset all rank roles.')
        ),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} param1 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        const subcommand = interaction.options.getSubcommand();
        let rankRoles = Object.fromEntries(Object.entries(serverConf.rankRoles).sort((a, b) => b[1].weight - a[1].weight).map(e => e[1].id ? e : [e[0], null]));
        console.log(rankRoles)
        if (subcommand === 'view') {
            let Embed = bot.createEmbed(interaction).setTitle("Rank Roles Config").setFancyGuild().setDescription(`Give roles to players based on their Hypixel rank. Members must be **verified** to receive roles.
            
\`•\` </rankroles set:${interaction.commandId}> - Assign a role to a rank.
\`•\` </rankroles pin:${interaction.commandId}> - Set rank as persistent.
\`•\` </rankroles remove:${interaction.commandId}> - Unassign rank role.
\`•\` </rankroles reset:${interaction.commandId}> - Reset all configuration.`);
            let rankFieldValues = "";
            for (rank in rankRoles) {
                const role = rankRoles[rank];
                // let rank = ;
                rankFieldValues += `**${rank}** → ${role && role.pinned ? '📌' : ''} ${role ? `<@&${role.id}>` : '`No role`'}\n`;
            }
            Embed.addField("Rank Name | Role", rankFieldValues, true).send()
        } else if (['set', 'bind'].includes(subcommand)) {
            // if (!args[1] || !args[2]) return bot.createErrorEmbed(interaction).setTitle(`Invalid Usage!`).setDescription(`Correct Usage: \`${interaction.prefix}rankroles set [rank] [role]\``).send()
            const rank = interaction.options.getString("rank", true);
            const role = interaction.options.getRole("role", true);
            // console.log(rankRoles)

            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(interaction).setTitle(`Unknown Rank`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${interaction.prefix}rankedroles\` to see all the bindable ranks!`).send()

            if (role && interaction.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to **${rank}** because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && !interaction.guild.ownerID == interaction.user.id && interaction.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(interaction).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to **${rank}** because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }


            await bot.config.rankRoles.setRank(interaction.guild.id, rank, { id: role.id });
            bot.createEmbed(interaction).setTitle(`Success!`).setDescription(`Verified members with **${rank}** will now receive the ${role} role.`).send()
        } else if (['unset', 'remove', 'unbind', 'delete'].includes(subcommand)) {
            const rank = interaction.options.getString("rank", true);
            // console.log(rankRoles)
            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(interaction).setTitle(`Unknown Rank!`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${interaction.prefix}rankedroles\` to see all the bindable ranks!`).send()
            if (!rankRoles[rank]) return bot.createErrorEmbed(interaction).setTitle(`Nothing to Remove!`).setDescription(`The rank **${rank}** already has no role!`).send()

            let role = rankRoles[rank];

            await bot.config.rankRoles.deleteRank(interaction.guild.id, rank);
            bot.createEmbed(interaction).setTitle(`Success!`).setDescription(`Players with **${rank}** will no longer receive the <@&${role.id}> role!`).send()
        } else if (['pin'].includes(subcommand)) {
            const rank = interaction.options.getString("rank", true);
            // console.log(rankRoles)
            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(interaction).setTitle(`Unknown Rank!`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${interaction.prefix}rankedroles\` to see all the bindable ranks!`).send()
            if (!rankRoles[rank]) return bot.createErrorEmbed(interaction).setTitle(`Nothing to Pin!`).setDescription(`Bind a role to **${rank}** before pinning it!`).send()

            let role = rankRoles[rank];

            await bot.config.rankRoles.setRank(interaction.guild.id, rank, { pinned: true });
            bot.createEmbed(interaction).setTitle(`📌 Successfully Pinned!`).setDescription(`Players with **${rank}** will now keep the <@&${role.id}> role if they get a higher role!`).send()

        } else if (['unpin'].includes(subcommand)) {
            const rank = interaction.options.getString("rank", true);
            // console.log(rankRoles)
            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(interaction).setTitle(`Unknown Rank!`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${interaction.prefix}rankedroles\` to see all the bindable ranks!`).send()
            if (!rankRoles[rank] || !rankRoles[rank].pinned) return bot.createErrorEmbed(interaction).setTitle(`Rank not pinned!`).setDescription(`**${rank}** is already not pinned!`).send()

            let role = rankRoles[rank];

            await bot.config.rankRoles.setRank(interaction.guild.id, rank, { pinned: false });
            bot.createEmbed(interaction).setTitle(`📌 Successfully Unpinned!`).setDescription(`Players with **${rank}** will no longer keep the <@&${role.id}> role if they get a higher role!`).send()


        } else if (['reset'].includes(subcommand)) {
            bot.config.rankRoles.delete(interaction.guild.id);
            bot.createEmbed(interaction).setAuthor(interaction.guild.name, interaction.guild.iconURL()).setTitle(`Success!`).setDescription(`All Rank Role configurations have been reset!`).send()

        }
    },
    async execute(message, args, bot) {
        let rankRoles = Object.fromEntries(Object.entries(message.serverConf.rankRoles).sort((a, b) => b[1].weight - a[1].weight).map(e => e[1].id ? e : [e[0], null]));
        console.log(rankRoles)
        if (!args.length) {
            let Embed = bot.createEmbed(message).setTitle("Rank Roles Config").setFancyGuild().setDescription(`Give roles to players based on their Hypixel rank. Members must be **verified** to receive roles.\n\n• \`${message.prefix}rankroles set [rank] [role]\` - Assign a role to a rank.\n• \`${message.prefix}rankroles pin [rank]\` Set rank as persistent.\n• \`${message.prefix}rankroles remove [rank]\` - Unassign rank role.\n• \`${message.prefix}rankroles reset\` - Reset all configuration.`);
            let rankFieldValues = "";
            for (rank in rankRoles) {
                const role = rankRoles[rank];
                // let rank = ;
                rankFieldValues += `**${rank}** → ${role && role.pinned ? '📌' : ''} ${role ? `<@&${role.id}>` : '`No role`'}\n`;
            }
            Embed.addField("Rank Name | Role", rankFieldValues, true).send()
        } else if (['set', 'bind'].includes(args[0].toLowerCase())) {
            if (!args[1] || !args[2]) return bot.createErrorEmbed(message).setTitle(`Invalid Usage!`).setDescription(`Correct Usage: \`${message.prefix}rankroles set [rank] [role]\``).send()
            let rank = args[1].toUpperCase();
            // console.log(rankRoles)
            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(message).setTitle(`Unknown Rank`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${message.prefix}rankedroles\` to see all the bindable ranks!`).send()

            let role = await bot.parseRole(args.slice(2, args.length).join(' '), message.guild);
            if (!role) return bot.createErrorEmbed(message).setTitle(`Invalid Role`).setDescription(`The role, \`${args.slice(2, args.length).join(' ')}\` could not be found or was an invalid role!`).send()

            if (role && message.member.guild.me.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to **${rank}** because of bad [role hierarchy](https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101#:~:text=Part%20Two%3A%20Role%20Hierarchies,helping%20out%20here%20and%20there.).\n\nTo fix this either move **my role** above ${role}, or give me a role that is already higher.`)
                    .send()
            }
            if (role && !message.guild.ownerID == message.author.id && message.member.roles.highest.comparePositionTo(role) < 0) {
                return bot.createErrorEmbed(message).setFancyGuild().setTitle(`Permissions Error!`)
                    .setDescription(`Unable to assign the role ${role} to **${rank}** because it is higher than your highest role.\n\nTo fix this either move **your role** above ${role}, or move the role under you.`)
                    .send()
            }


            await bot.config.rankRoles.setRank(message.guild.id, rank, { id: role.id });
            bot.createEmbed(message).setTitle(`Success!`).setDescription(`Verified members with **${rank}** will now receive the ${role} role.`).send()
        } else if (['unset', 'remove', 'unbind', 'delete'].includes(args[0].toLowerCase())) {
            if (!args[1]) return bot.createErrorEmbed(message).setTitle(`Invalid Usage!`).setDescription(`Correct Usage: \`${message.prefix}rankroles remove [rank]\``).send()
            let rank = args[1].toUpperCase();
            // console.log(rankRoles)
            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(message).setTitle(`Unknown Rank!`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${message.prefix}rankedroles\` to see all the bindable ranks!`).send()
            if (!rankRoles[rank]) return bot.createErrorEmbed(message).setTitle(`Nothing to Remove!`).setDescription(`The rank **${rank}** already has no role!`).send()

            let role = rankRoles[rank];

            await bot.config.rankRoles.deleteRank(message.guild.id, rank);
            bot.createEmbed(message).setTitle(`Success!`).setDescription(`Players with **${rank}** will no longer receive the <@&${role.id}> role!`).send()
        } else if (['pin'].includes(args[0].toLowerCase())) {
            if (!args[1]) return bot.createErrorEmbed(message).setTitle(`Invalid Usage!`).setDescription(`Correct Usage: \`${message.prefix}rankroles pin [rank]\``).send()
            let rank = args[1].toUpperCase();
            // console.log(rankRoles)
            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(message).setTitle(`Unknown Rank!`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${message.prefix}rankedroles\` to see all the bindable ranks!`).send()
            if (!rankRoles[rank]) return bot.createErrorEmbed(message).setTitle(`Nothing to Pin!`).setDescription(`Bind a role to **${rank}** before pinning it!`).send()

            let role = rankRoles[rank];

            await bot.config.rankRoles.setRank(message.guild.id, rank, { pinned: true });
            bot.createEmbed(message).setTitle(`📌 Successfully Pinned!`).setDescription(`Players with **${rank}** will now keep the <@&${role.id}> role if they get a higher role!`).send()

        } else if (['unpin'].includes(args[0].toLowerCase)) {
            if (!args[1]) return bot.createErrorEmbed(message).setTitle(`Invalid Usage!`).setDescription(`Correct Usage: \`${message.prefix}rankroles unpin [rank]\``).send()
            let rank = args[1].toUpperCase();
            // console.log(rankRoles)
            if (!rankRoles.hasOwnProperty(rank)) return bot.createErrorEmbed(message).setTitle(`Unknown Rank!`).setDescription(`The rank \`${args[1]}\` is not bindable! Do \`${message.prefix}rankedroles\` to see all the bindable ranks!`).send()
            if (!rankRoles[rank] || !rankRoles[rank].pinned) return bot.createErrorEmbed(message).setTitle(`Rank not pinned!`).setDescription(`**${rank}** is already not pinned!`).send()

            let role = rankRoles[rank];

            await bot.config.rankRoles.setRank(message.guild.id, rank, { pinned: false });
            bot.createEmbed(message).setTitle(`📌 Successfully Unpinned!`).setDescription(`Players with **${rank}** will no longer keep the <@&${role.id}> role if they get a higher role!`).send()


        } else if (['reset'].includes(args[0].toLowerCase())) {
            bot.config.rankRoles.delete(message.guild.id);
            bot.createEmbed(message).setAuthor(message.guild.name, message.guild.iconURL()).setTitle(`Success!`).setDescription(`All Rank Role configurations have been reset!`).send()

        } else {
            bot.createErrorEmbed(message).setTitle('Invalid Args!').setDescription(`Unknown Argument \`${args[0]}\`.\n\nValid Usage:\n\`${message.prefix}rankroles set [rank] [role]\`\n\`${message.prefix}rankroles pin [rank]\`\n\`${message.prefix}rankroles remove [rank]\`\n\`${message.prefix}rankroles reset\``).send()
        }
    }
}