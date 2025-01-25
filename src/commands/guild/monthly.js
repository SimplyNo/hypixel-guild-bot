const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder } = require("@discordjs/builders");
const Discord = require("discord.js");
const moment = require('moment')
function calculateMonthlyExp(expHistory, monthLookup) {
    return Object.entries(expHistory)
        .filter(([date]) => date.startsWith(monthLookup))
        .reduce((prev, [date, val]) => prev + val, 0);
}
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
module.exports = {
    name: "monthly",
    aliases: ["month"],
    cooldown: 5,
    description: "Monthly GEXP leaderboard of a guild [BETA]",
    usage: '<GUILD | -p IGN | @USER> [>=|<=|==|all|NUMBER] [<REQUIREMENT>]',
    example: "Lucid all",
    type: 'guild',
    autoPost: true,
    slash: new SlashCommandBuilder()
        .setName("monthly")
        .setDescription("Monthly GEXP leaderboard of a guild")
        .addStringOption(option =>
            option
                .setName('query')
                .setRequired(false)
                .setAutocomplete(true)
                .setDescription('Guild name or player name'))
        .addStringOption(option =>
            option
                .setName("period")
                .setDescription("The month period to show")
                .addChoices(
                    { name: "Last 30 Days", value: "0" },
                    { name: "This Month", value: "1" },
                    { name: "Last Month", value: "2" },
                    { name: "2 Months Ago", value: "3" },
                    { name: "3 Months Ago", value: "4" }

                ))
        .addStringOption(option =>
            option
                .setName("count")
                .setDescription("The number of players to show"))
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription(`Whether to search by player or by guild name`)
                .setRequired(false)
                .addChoices({ name: "player", value: "player" }, { name: "guild", value: "guild" }))
        .addStringOption(option =>
            option
                .setName("filter")
                .setDescription("The GEXP filter. Examples: '>10000' for more than 10000 GEXP, '<1000' for less than 1000 GEXP")),
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {*} param1 
     * @param {*} bot 
    */
    async run(interaction, { serverConf }, bot) {
        await interaction.deferReply();

        let user = await bot.getUser({ id: interaction.user.id });

        const period = Number(interaction.options.getString("period", false));
        console.log(interaction.options.getString("period", false))
        const query = interaction.options.getString("query", false);
        let memberCount = interaction.options.getString('count', false) ?? 15;
        const type = interaction.options.getString('type', false) ?? 'guild';
        const filter = interaction.options.getString('filter', false) ?? ">=0";
        if (type === 'guild' && query) {
            // set recently searched
            bot.addRecentSearch(interaction.user.id, query)
        }
        const check = filter.match(/^([<=>]{1,2}) ?(\d+)$/);
        if (!check || ![">=", ">", "<", "<=", "=="].includes(check[1])) return bot.createErrorEmbed(interaction).setDescription(`Malformed filter: \`${filter}\``).send();

        const gexpReq = check[2];
        const gexpOperator = check[1];

        let guild;
        if (!query && !user) return bot.createErrorEmbed(interaction).setDescription("To use this command without arguments, verify by doing `/verify [username]`!").send();
        else if (!query) guild = await bot.wrappers.trackerGuild.get((user.uuid), true, 'player', true);
        else if (type === "player") guild = await bot.wrappers.trackerGuild.get((query), true, 'player', true);
        else if (type === "guild") guild = await bot.wrappers.trackerGuild.get((query), true, 'name', true);

        if (guild?.error == 'notfound' && !query) return bot.createErrorEmbed(interaction).setDescription("You are not in a guild!").send();
        if (guild?.error == 'notfound' && type === 'guild') return bot.sendErrorEmbed(interaction, `No guild was found with the name \`${query}\`!`)
        if (guild?.error == 'notfound' && type === 'player') return bot.sendErrorEmbed(interaction, `The player \`${query}\` is not in a guild!`)
        if (guild?.error) return bot.sendErrorEmbed(interaction, `There is a Hypixel API Outage, please try again within a few minutes`)

        const thisMonth = moment(getMonth(0));
        const lastMonth = moment(getMonth(1));
        const twoMonthAgo = moment(getMonth(2));
        const threeMonthAgo = moment(getMonth(3));

        const thisMonthLookup = thisMonth.format("YYYY-MM");
        const lastMonthLookup = lastMonth.format("YYYY-MM");
        const twoMonthAgoLookup = twoMonthAgo.format("YYYY-MM");
        const threeMonthAgoLookup = threeMonthAgo.format("YYYY-MM");

        const dateNow = new Date();
        const thirtyDaysAgo = new Date(dateNow - 30 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgoLookup = moment(thirtyDaysAgo).format("YYYY-MM-DD");
        const dateLookup = {
            monthlyThisMonth: thisMonthLookup,
            monthlyLastMonth: lastMonthLookup,
            monthlyTwoMonthAgo: twoMonthAgoLookup,
            monthlyThreeMonthAgo: threeMonthAgoLookup,
            monthlyLast30Days: thirtyDaysAgoLookup
        }
        /**
         * 
         * monthlyThisMonth
         * monthlyLastMonth
         * monthlyTwoMonthAgo
         * monthlyThreeMonthAgo
         * monthlyLast30Days
        */
        const command = (monthLookup, niceName, period, memberCount) => {

            let gexp = {};

            const embed = {
                title: `Top ${memberCount} Monthly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`,
                url: `https://plancke.io/hypixel/guild/name/${encodeURI(guild.name)}`,
                icon: bot.assets.hypixel.guild,
                color: colorMap[guild?.tagColor || "GRAY"].hex,
                footer: true
            }

            let pages = []
            guild.allMembers.forEach(member => {
                member.monthlyThisMonth = calculateMonthlyExp(member.expHistory, thisMonthLookup);
                member.monthlyLastMonth = calculateMonthlyExp(member.expHistory, lastMonthLookup);
                member.monthlyTwoMonthAgo = calculateMonthlyExp(member.expHistory, twoMonthAgoLookup);
                member.monthlyThreeMonthAgo = calculateMonthlyExp(member.expHistory, threeMonthAgoLookup);
                member.monthlyLast30Days = Object.entries(member.expHistory).filter(([date]) => ((new Date(date).getTime()) - thirtyDaysAgo.getTime()) > 0).reduce((prev, [date, val]) => prev + val, 0);
                // Object.entries(member.expHistory).forEach(([date, exp]) => new Date(date).getTime() > new Date(dateLookup[monthLookup]).getTime() gexp[date] = (gexp[date] || 0) + exp);
                // member.monthlyLast30Days = Object.entries(member.expHistory).slice(-30).reduce((prev, [date, val]) => prev + val, 0);
            })
            guild.monthlyThisMonth = guild.allMembers.reduce((prev, member) => prev + member.monthlyThisMonth, 0);
            guild.monthlyLast30Days = guild.allMembers.reduce((prev, member) => prev + member.monthlyLast30Days, 0);
            guild.monthlyLastMonth = guild.allMembers.reduce((prev, member) => prev + member.monthlyLastMonth, 0);
            guild.monthlyTwoMonthAgo = guild.allMembers.reduce((prev, member) => prev + member.monthlyTwoMonthAgo, 0);
            guild.monthlyThreeMonthAgo = guild.allMembers.reduce((prev, member) => prev + member.monthlyThreeMonthAgo, 0);
            // people might leve and join back then bot counts wrong gexp [BUG]
            guild.allMembers = guild.allMembers.filter(member => eval(`${member[monthLookup]} ${gexpOperator} ${gexpReq}`))
            if (memberCount == "all" || memberCount > guild.allMembers.length) memberCount = guild.allMembers.length
            gexp["weekly"] = 0;
            gexp["weeklyScaled"] = 0;
            pages[0] = {}
            pages[0].fields = []
            let players = []
            console.log(gexp)
            pages[0].author = "Guild Monthly GEXP"
            pages[0].title = `Top ${memberCount} Monthly GEXP ${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`
            const missingGuildData = hasMissingData(guild, dateLookup[monthLookup], guild.firstUpdated);
            if (missingGuildData) {
                pages[0].fields.push({ name: "⚠️ Not enough data!", value: `\`•\` Not enough data has been collected to show GEXP in this period (${period.replace('-', 'to')})!\n\`•\` Hang tight, collection will be complete <t:${Math.floor((Date.now() + missingGuildData.difference) / 1000)}:R>!`, options: { escapeFormatting: true } })
                return bot.pageEmbedMaker(embed, pages)
            }
            pages[0].description = `\`\`\`CSS\nShowing results for ${guild.name}${guild.tag ? ` [${guild.tag}] ` : " "}Top ${memberCount} Monthly GEXP\nFrom ${period.replace('-', 'to')} (${niceName})\`\`\`\n\`\`\`js\nTotal RAW Monthly GEXP: ${((guild[monthLookup]) || 0).toLocaleString()}\`\`\``

            guild.allMembers.sort((a, b) => b[monthLookup] - a[monthLookup])
            // console.log(guild)
            guild.allMembers.forEach((member, index) => {
                if (index < memberCount) players.push(`\`#${index + 1}\` ${(user && user.uuid == member.uuid) ? "**" : ""}${(Date.now() - parseInt(member.joined)) < (7 * 24 * 60 * 60 * 1000) ? ' 🆕 ' : ''}${Discord.Util.escapeMarkdown(member.username || "Error")}: ${(member[monthLookup] || 0).toLocaleString()}${(user && user.uuid == member.uuid) ? "**" : ""}\n`)
            })

            let sliceSize = memberCount / 3;
            let list = Array.from({ length: 3 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))

            list.forEach((item, index) => {
                if (item.length === 0) return;
                pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
            })

            let secPage = false

            pages[0].fields.forEach(field => { if (field.value.length >= 1024) secPage = true })

            if (secPage) {
                let sliceSize = memberCount / 6;
                let list = Array.from({ length: 6 }, (_, i) => players.slice(i * sliceSize, (i + 1) * sliceSize))

                list.forEach((item, index) => {
                    if (item.length === 0) return;
                    if (index > guild.allMembers.length / 2) pages[1].fields[index - 3] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                    else pages[0].fields[index] = { value: item.join(""), options: { blankTitle: true, escapeFormatting: true } }
                })
            }



            const embeds = bot.pageEmbedMaker(embed, pages)
            return embeds
        }
        let optionSelected = period || 0;
        const selectMenu = () => {
            let menu = new Discord.MessageSelectMenu()
                .setCustomId('monthly')
                .setPlaceholder('Select Time Period')
                .addOptions([
                    {
                        label: 'Last 30 Days',
                        description: `${moment(thirtyDaysAgo).format('MMMM D')} - Today`,
                        value: `monthlyLast30Days,Last 30 Days,${moment(thirtyDaysAgo).format('MMMM D')} - Today`,
                        emoji: '🔁',
                    },
                    {
                        label: 'This Month',
                        description: `${thisMonth.format('MMMM D')} - Today`,
                        emoji: '🗓️',
                        value: `monthlyThisMonth,This Month,${thisMonth.format('MMMM D')} - Today`,
                    },
                    {
                        label: 'Last Month',
                        description: `${lastMonth.format('MMMM D')} - ${thisMonth.clone().subtract(1, 'day').format('MMMM D')}`,
                        emoji: '🗓️',
                        value: `monthlyLastMonth,Last Month,${lastMonth.format('MMMM D')} - ${thisMonth.clone().subtract(1, 'day').format('MMMM D')}`,
                    },
                    {
                        label: '2 Months Ago',
                        description: `${twoMonthAgo.format('MMMM D')} - ${lastMonth.clone().subtract(1, 'day').format('MMMM D')}`,
                        emoji: '🗓️',
                        value: `monthlyTwoMonthAgo,2 Months Ago,${twoMonthAgo.format('MMMM D')} - ${lastMonth.clone().subtract(1, 'day').format('MMMM D')}`,
                    },
                    {
                        label: '3 Months Ago',
                        description: `${threeMonthAgo.format('MMMM D')} - ${twoMonthAgo.clone().subtract(1, 'day').format('MMMM D')}`,
                        emoji: '🗓️',
                        value: `monthlyThreeMonthAgo,3 Months Ago,${threeMonthAgo.format('MMMM D')} - ${twoMonthAgo.clone().subtract(1, 'day').format('MMMM D')}`,
                    },

                ])
            menu.options[optionSelected].default = true
            return menu;
        }
        const embeds = command(...selectMenu().options.find(o => o.default).value.split(','), memberCount)
        const setCountBtn = new Discord.MessageButton()
            .setCustomId('setcount')
            .setLabel('Set Count')
            .setStyle('SECONDARY')
        const msg = await interaction.followUp({
            embeds: embeds,
            components: [
                new Discord.MessageActionRow().addComponents(selectMenu()),
                new Discord.MessageActionRow().addComponents(setCountBtn)
            ]
        })
        if (interaction.autoPost) return;
        const collector = msg.createMessageComponentCollector({ idle: 300000 });
        collector.on('end', () => {
            msg.edit({ components: [] })
        })
        collector.on('collect',
            /**
             * 
             * @param {Discord.SelectMenuInteraction} i 
             * @returns 
             */
            async (i) => {
                if (i.customId === 'setcount') {
                    await i.showModal(new Discord.Modal()
                        .setTitle('Set Count')
                        .setCustomId('count')
                        .addComponents(
                            new Discord.MessageActionRow().addComponents(new Discord.TextInputComponent().setCustomId('ct').setRequired(true).setPlaceholder('Enter a number').setStyle('SHORT').setLabel('Member Count').setValue(memberCount.toString()).setPlaceholder('15'))
                        ))
                    const resp = await i.awaitModalSubmit({ time: 30000 }).catch(e => null);
                    if (resp === null) return;
                    let setMemberCount = Number(resp.components[0].components[0].value) && Number(resp.components[0].components[0].value) >= 0 ? Number(resp.components[0].components[0].value) : 125;
                    if (i.user.id !== interaction.user.id) return resp.reply({ embeds: command(...selectMenu().options[optionSelected].value.split(','), setMemberCount), ephemeral: true });
                    resp.deferUpdate()
                    memberCount = setMemberCount;
                    i.message.edit({
                        embeds: command(...selectMenu().options[optionSelected].value.split(','), memberCount), components: [
                            new Discord.MessageActionRow().addComponents(selectMenu()),
                            new Discord.MessageActionRow().addComponents(setCountBtn)
                        ]
                    })
                }
                if (i.customId === 'monthly') {
                    const [monthLookup, niceName, period] = i.values[0].split(',')

                    optionSelected = selectMenu().options.findIndex(option => option.value === i.values[0]);
                    if (i.user.id !== interaction.user.id) return i.reply({ embeds: command(monthLookup, niceName, period, memberCount), ephemeral: true });
                    i.update({
                        embeds: command(monthLookup, niceName, period, memberCount), components: [
                            new Discord.MessageActionRow().addComponents(selectMenu()),
                            new Discord.MessageActionRow().addComponents(setCountBtn)
                        ]
                    })
                }
            });
    }
}
function scaledGEXP(input) {
    if (input <= 200000) return Number(input);
    if (input <= 700000) return Number(Math.round(((input - 200000) / 10) + 200000));
    if (input > 700000) return Number(Math.round(((input - 700000) / 33) + 250000));
}

function getMonth(num) {
    let lastMonth = new Date();
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);
    lastMonth.setMonth(lastMonth.getMonth() - num);
    return lastMonth;
}


function hasMissingData(guild, startingDay, firstUpdated) {
    const startDate = new Date(startingDay);
    const firstUpdatedDate = new Date(firstUpdated);
    if (startDate.getTime() < firstUpdatedDate.getTime()) return {
        hasMissingData: true,
        difference: firstUpdatedDate.getTime() - startDate.getTime()
    }
    return null;
}


const colorMap = {
    WHITE: { code: "§f", hex: "#F2F2F2", color: "WHITE" },
    YELLOW: { code: "§e", hex: "#FFFF55", color: "YELLOW" },
    LIGHT_PURPLE: { code: "§d", hex: "#FF55FF", color: "LIGHT_PURPLE" },
    RED: { code: "§c", hex: "#FF5555", color: "RED" },
    AQUA: { code: "§b", hex: "#55FFFF", color: "AQUA" },
    GREEN: { code: "§a", hex: "#55FF55", color: "GREEN" },
    BLUE: { code: "§9", hex: "#5555FF", color: "BLUE" },
    DARK_GRAY: { code: "§8", hex: "#555555", color: "DARK_GRAY" },
    GRAY: { code: "§7", hex: "#BAB6B6", color: "GRAY" },
    GOLD: { code: "§6", hex: "#FFAA00", color: "GOLD" },
    DARK_PURPLE: { code: "§5", hex: "#AA00AA", color: "DARK_PURPLE" },
    DARK_RED: { code: "§4", hex: "#AA0000", color: "DARK_RED" },
    DARK_AQUA: { code: "§3", hex: "#00AAAA", color: "DARK_AQUA" },
    DARK_GREEN: { code: "§2", hex: "#00AA00", color: "DARK_GREEN" },
    DARK_BLUE: { code: "§1", hex: "#0000AA", color: "DARK_BLUE" },
    BLACK: { code: "§0", hex: "#000000", color: "BLACK" },
};