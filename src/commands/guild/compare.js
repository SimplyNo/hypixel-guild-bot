const { SlashCommandBuilder } = require("@discordjs/builders");
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const Moment = require("moment");

function getTimeTillOvertake(guild1, guild2, bot) {
    console.log(`scaled EXP history:`, guild1.scaledExpHistory)
    const totalScaled1 = Object.values(guild1.scaledExpHistory).reduce((a, b) => a + b, 0);
    const totalScaled2 = Object.values(guild2.scaledExpHistory).reduce((a, b) => a + b, 0);
    const diffScaled = totalScaled1 - totalScaled2;
    const totalGEXPDiff = guild1.exp - guild2.exp;

    const weeksToOvertake = totalGEXPDiff / diffScaled;
    return {
        time: (Math.abs(weeksToOvertake) * 7 * 24 * 60 * 60 * 1000)
    }
}

function getDiscordTimeFormat(ms, type) {
    return `<t:${Math.floor(ms / 1000)}:${type}>`
}
module.exports = {
    name: "compare",
    type: "guild",
    slash: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare guild stats!')
        .addStringOption(option =>
            option
                .setName('guild1')
                .setDescription('The first guild to compare')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option
                .setName('guild2')
                .setDescription('The second guild to compare')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    async run(interaction, { serverConf }, bot) {
        await interaction.deferReply();
        const guild1 = interaction.options.getString('guild1', true);
        const guild2 = interaction.options.getString('guild2', true);
        if (!guild1 || !guild2) return bot.createErrorEmbed(interaction)
            .setDescription(`Please provide 2 guilds to compare.`).send()
        const guildData1 = await bot.wrappers.hypixelGuild.get(guild1, 'name');
        if (!guildData1 || guildData1.error) {
            return bot.createErrorEmbed(interaction)
                .setDescription(`Guild \`${guild1}\` not found.`)
                .send()
        }
        const guildData2 = await bot.wrappers.hypixelGuild.get(guild2, 'name');
        if (!guildData2 || guildData2.error) {
            return bot.createErrorEmbed(interaction)
                .setDescription(`Guild \`${guild2}\` not found.`)
                .send()
        }
        const diffStr = (guild1, guild2) => guild1 - guild2 > 0 ? `<:greenarrow:1238706774987636746> \`${(guild1 - guild2).toLocaleString()}\`` : `🔻 \`${Math.abs(guild1 - guild2).toLocaleString()}\``;
        const diffLevelStr = diffStr(guildData1.level, guildData2.level);
        const diffTotalGEXPStr = diffStr(guildData1.exp, guildData2.exp);
        const diffMemberCountStr = diffStr(guildData1.members.length, guildData2.members.length);
        const diffScaledDailyGEXPstr = diffStr(Object.values(guildData1.scaledExpHistory)[6], Object.values(guildData2.scaledExpHistory)[6]);
        const diffRawDailyGEXPstr = diffStr(Object.values(guildData1.expHistory)[6], Object.values(guildData2.expHistory)[6]);
        const diffScaledWeeklyGEXPstr = diffStr(Object.values(guildData1.scaledExpHistory).reduce((a, b) => a + b, 0), Object.values(guildData2.scaledExpHistory).reduce((a, b) => a + b, 0));
        const diffRawWeeklyGEXPstr = diffStr(Object.values(guildData1.expHistory).reduce((a, b) => a + b, 0), Object.values(guildData2.expHistory).reduce((a, b) => a + b, 0));
        const memberDailyAverage1 = guildData1.members.map(m => Object.values(m.expHistory).reduce((a, b) => a + b, 0) / Object.keys(m.expHistory).length).reduce((a, b) => a + b, 0) / guildData1.members.length;
        const memberDailyAverage2 = guildData2.members.map(m => Object.values(m.expHistory).reduce((a, b) => a + b, 0) / Object.keys(m.expHistory).length).reduce((a, b) => a + b, 0) / guildData2.members.length;
        const diffMemberDailyAverageStr = diffStr(Math.floor(memberDailyAverage1), Math.floor(memberDailyAverage2));
        const sorted = [guildData1, guildData2].sort((a, b) => b.exp - a.exp);
        const overTake = getTimeTillOvertake(guildData1, guildData2, bot);
        const chart = new ChartJSNodeCanvas({ width: 600, height: 400 })
        const embed = bot.createEmbed()
            .setAuthor({
                name: 'Guild Overall Stats',
                iconURL: interaction.guild.iconURL()
            })
            .setTitle(`${guildData1.name}${guildData1.tag ? ` [${guildData1.tag}]` : ''} vs ${guildData2.name}${guildData2.tag ? ` [${guildData2.tag}]` : ''}`)
            .setDescription(`
\`•\` **Level**: \`${guildData1.level}\` ⚔️ \`${guildData2.level}\` ${diffLevelStr}
\`•\` **Total GEXP**: \`${guildData1.exp.toLocaleString()}\` ⚔️ \`${guildData2.exp.toLocaleString()}\` ${diffTotalGEXPStr}
\`•\` **Member Count**: \`${guildData1.members.length}\` ⚔️ \`${guildData2.members.length}\` ${diffMemberCountStr}
\`•\` **Avg. Member Daily GEXP**: \`${Math.floor(memberDailyAverage1).toLocaleString()}\` ⚔️ \`${Math.floor(memberDailyAverage2).toLocaleString()}\` ${diffMemberDailyAverageStr}

\`•\` **Daily GEXP (Scaled)**: \`${Object.values(guildData1.scaledExpHistory)[6]?.toLocaleString()}\` ⚔️ \`${Object.values(guildData2.scaledExpHistory)[6]?.toLocaleString()}\` ${diffScaledDailyGEXPstr}
\`•\` **Daily GEXP (Raw)**: \`${Object.values(guildData1.expHistory)[6]?.toLocaleString()}\` ⚔️ \`${Object.values(guildData2.expHistory)[6]?.toLocaleString()}\` ${diffRawDailyGEXPstr}
\`•\` **Weekly GEXP (Scaled)**: \`${Object.values(guildData1.scaledExpHistory).reduce((a, b) => a + b, 0)?.toLocaleString()}\` ⚔️ \`${Object.values(guildData2.scaledExpHistory).reduce((a, b) => a + b, 0)?.toLocaleString()}\` ${diffScaledWeeklyGEXPstr}
\`•\` **Weekly GEXP (Raw)**: \`${Object.values(guildData1.expHistory).reduce((a, b) => a + b, 0)?.toLocaleString()}\` ⚔️ \`${Object.values(guildData2.expHistory).reduce((a, b) => a + b, 0)?.toLocaleString()}\` ${diffRawWeeklyGEXPstr}
`)
            .addFields([
                {
                    name: `Estimated time of ${sorted[1].name} Overtaking ${sorted[0].name}`,
                    value: `${getDiscordTimeFormat(Date.now() + overTake?.time, 'R')}`,
                    inline: false
                }
            ])
            .setImage(`attachment://chart.png`)

        interaction.followUp({
            embeds: [
                embed
            ],
            files: [
                {
                    name: 'chart.png',
                    attachment: await chart.renderToBuffer({
                        type: 'line',
                        options: {
                            scales: {
                                y: {
                                    ticks: {
                                        font: {
                                            family: "Minecraft",
                                            size: '14px'
                                        }
                                    }
                                },
                                x: {
                                    ticks: {
                                        font: {
                                            family: "Minecraft",
                                            size: '14px'
                                        }
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    labels: {
                                        font: {
                                            family: "Minecraft",
                                            size: '14px'
                                        }
                                    }
                                }

                            }
                        },
                        data: {
                            labels: Object.keys(guildData1.expHistory).map(d => Moment(d).format('MMM. Do')),

                            datasets: [
                                {
                                    label: guildData1.name,
                                    data: Object.values(guildData1.expHistory),
                                    borderColor: '#FF0000',
                                    // fill: true,
                                    // backgroundColor: 'rgba(255, 0, 0, 0.2)'
                                },
                                {
                                    label: guildData2.name,
                                    data: Object.values(guildData2.expHistory),
                                    borderColor: '#0000FF',
                                    // fill: true,
                                    // backgroundColor: 'rgba(0, 0, 255, 0.2)'
                                }
                            ]
                        },
                    })
                }
            ]
        })
    }



}