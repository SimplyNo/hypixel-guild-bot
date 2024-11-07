const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
module.exports = {
    name: "firstjoins",
    cooldown: 5,
    description: "View all the members of a guild",
    usage: '<GUILD | -p IGN | @USER>',
    example: "Lucid",
    type: 'guild',
    autoPost: true,
    slash: new SlashCommandBuilder()
        .setName("firstjoins")
        .setDescription("View the first joins of a guild")
        .addStringOption(option =>
            option
                .setName('query')
                .setRequired(false)
                .setAutocomplete(true)
                .setDescription('Guild name or player name'))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription(`Whether to search by player or by guild name`)
                .setRequired(false)
                .setChoices({ name: 'player', value: "player" }, { name: 'guild', value: "guild" })),
    async run(interaction, { serverConf }, bot, uuid) {
        async function command() {

            let user = await bot.getUser({ id: interaction.user.id })

            const query = interaction.options.getString("query", false);
            let memberCount = interaction.options.getString('count', false) ?? 15;
            const type = interaction.options.getString('type', false) ?? 'guild';
            if (type === 'guild' && query) {
                // set recently searched
                bot.addRecentSearch(interaction.user.id, query)
            }
            await interaction.deferReply();

            let guild;
            if (!query && !user) return bot.createErrorEmbed(interaction).setDescription("To use this command without arguments, verify by doing `/verify [username]`!").send();
            else if (!query) guild = await bot.wrappers.hypixelGuild.get((user.uuid), 'player', true);
            else if (type === "player") guild = await bot.wrappers.hypixelGuild.get((query), 'player', true);
            else if (type === "guild") guild = await bot.wrappers.hypixelGuild.get((query), 'name', true);

            if (guild.exists == false && !query) return bot.createErrorEmbed(interaction).setDescription("You are not in a guild!").send();
            if (guild.exists == false && type === 'guild') return bot.sendErrorEmbed(interaction, `We couldn't find a guild with the information you gave us.`)
            if (guild.exists == false && type === 'player') return bot.sendErrorEmbed(interaction, `This player is not in a guild!`)
            if (guild.outage) return bot.sendErrorEmbed(interaction, `There is a Hypixel API Outage, please try again within a few minutes`)

            const members = guild.members.sort((a, b) => a.joined - b.joined).map((m, i) => `${i + 1}. **${m.username}** <t:${Math.floor(m.joined / 1000)}:f>`)
            const usersPerPage = 30;
            const pages = Math.ceil(members.length / usersPerPage);
            let pageNumber = 0;
            const getPage = () => {
                const start = pageNumber * usersPerPage;
                const end = start + usersPerPage;
                return members.slice(start, end);
            }
            const getEmbed = () => {
                const embed = bot.createEmbed(interaction)
                    .setTitle(`Guild Members Join Date`)
                    .setDescription(getPage().join('\n') || "No members found.")
                    .setFooter({
                        text: bot.createEmbed().footer.text + ` | Page ${pageNumber + 1} of ${pages}`, iconURL: bot.createEmbed().footer.iconURL
                    })
                return embed;
            }
            const msg = await interaction.followUp({
                embeds: [getEmbed()],
                components: [
                    new Discord.MessageActionRow()
                        .addComponents(
                            new Discord.MessageButton().setCustomId('prev').setEmoji('◀️').setStyle("SECONDARY"),
                            new Discord.MessageButton().setCustomId('next').setEmoji('▶️').setStyle("SECONDARY")
                        )
                ]
            })


            const filter = (i) => i.user.id === interaction.user.id;
            const collector = msg.createMessageComponentCollector({ filter, idle: 60000 });
            collector.on('collect', async i => {
                if (i.customId === 'prev') {
                    pageNumber--;
                    if (pageNumber < 0) pageNumber = pages - 1;
                } else if (i.customId === 'next') {
                    pageNumber++;
                    if (pageNumber >= pages) pageNumber = 0;
                }
                await i.update({
                    embeds: [getEmbed()]
                })
            })
            collector.on('end', () => {
                msg.edit({
                    embeds: [getEmbed()],
                    components: []
                })
            })
        }
        command()

    },
}