const { SlashCommandBuilder } = require("@discordjs/builders");
const { Util, Message, CommandInteraction } = require("discord.js");

module.exports = {
    name: "discordcheck",
    adminOnly: true,
    aliases: ['dc', 'checkdiscord'],
    description: "View who members who are in the discord based on your autorole guild.",
    slash: new SlashCommandBuilder()
        .setName('discordcheck')
        .setDescription("View who members who are in the discord based on your autorole guild."),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} args 
     * @param {*} bot 
     * @returns 
     */
    async run(interaction, { serverConf }, bot) {
        let autoRole = serverConf.autoRole;
        await interaction.deferReply();

        if (!autoRole.guild) return bot.createErrorEmbed(interaction).setDescription(`You need to set an autorole guild to do this!`).send()
        let data = await bot.wrappers.hypixelGuild.get(autoRole.guild, 'id', true);
        // let data = await bot.wrappers.slothpixelGuild.get('HypixelDuck', 'name');
        if (!data || data.exists == false || !data.members?.length) return bot.createErrorEmbed(interaction).setDescription('could not find the guild!').send()

        let members = data.members;
        // let str = [];
        let unverifiedMembers = [];
        let verifiedMembers = [];

        // let allVerifiedGuildMembers = [];
        // for (guildmember of members) {

        // }
        let editable = await interaction.followUp({ content: `Fetching ${data.members.length} members...` });
        let allVerifiedGuildMembers = await bot.getAllUsers(members.map(m => ({ uuid: m.uuid })));
        let allServerMembers = await interaction.guild.members.fetch().then(members => members.filter(e => !e.user.bot)).catch(e => console.log(e));

        // let allGuildDiscordMembers = await Promise.all(allVerifiedGuildMembers.map(e => bot.parseMember(e.id, message.guild )))
        // console.log(allGuildDiscordMembers)
        for (guildmember of members) {
            let verified = allVerifiedGuildMembers.find(m => m.uuid == guildmember.uuid);

            if (verified) {
                let member = allServerMembers.get(verified.id);
                verifiedMembers.push(`${bot.assets.emotes.other.check} \`${guildmember.username}\` → ${member ? `<@${member.id}> (${Util.escapeItalic(member.user.tag)})` : "Not in server."}`)

            } else {
                unverifiedMembers.push(`\`${guildmember.username}\``)
            }
        }

        let verifiedFields = verifiedMembers.length && Util.splitMessage(verifiedMembers.join('\n'), { maxLength: 1024, char: '\n' }).map((e, i) => ({ name: i == 0 ? `Verified Members (${verifiedMembers.length}/${members.length})` : '\u200b', value: e }))
        let unverifiedFields = unverifiedMembers.length && Util.splitMessage(unverifiedMembers.join(', '), { maxLength: 1024, char: ',' }).map((e, i) => ({ name: i == 0 ? `Unverified Members (${unverifiedMembers.length}/${members.length})` : '\u200b', value: e }));

        let allFields = [...(verifiedFields ? verifiedFields : [{ name: 'Verified Members', value: "**No members verified!**" }]), ...(unverifiedFields ? unverifiedFields : [{ name: 'Unverified Members', value: '**All members verified!**' }])];

        let embeds = [];
        let currentFields = [];
        for (let i = 0; i < allFields.length; i++) {
            const field = allFields[i];

            let currentFieldSize = currentFields.reduce((prev, curr) => prev + curr.value.length, 0);
            if ((currentFieldSize + field.value.length) > 5500) {
                embeds.push(bot.createEmbed().addFields(currentFields))
                console.log(currentFields)
                currentFields = [];
            }
            currentFields.push(field)
        }
        embeds.push(bot.createEmbed().addFields(currentFields))

        embeds[0].setAuthor(`${data.name} → Discord Check`)



        // editable.edit(
        //     {
        //         embeds: embeds
        //     })
        for (embed of embeds) {
            await interaction.followUp({ embeds: [embed] })
        }

        // bot.createEmbed()
        //     .setAuthor(`${data.name} → Discord Check`)
        //     .addFields(verifiedFields.length ? verifiedFields : [{ name: "Verified Members", value: "No members verified." }])
        //     .addFields(unverifiedFields.length ? unverifiedFields : [{ name: "Unverified Members", value: "All members verified!" }])


    }
}