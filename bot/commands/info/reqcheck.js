const { SlashCommandBuilder } = require('@discordjs/builders');
const validReqs = require('../../../valid-requirements.json');

function getGameTypeFromID(id) {
    // console.log(id);
    // console.log(validReqs.find(el => el.reqs.find(e => e.id.toLowerCase() == id)))
    return validReqs.find(el => el.reqs.find(e => e.id.toLowerCase() == id));
}
function getReqFromID(id) {
    return validReqs.flatMap(e => e.reqs).find(e => e.id.toLowerCase() == id);
}

module.exports = {
    name: "reqcheck",
    type: "info",
    aliases: ["checkreq", "myreqs", "reqscheck", "checkreqs"],
    description: "Check a players requirements!",
    slash: new SlashCommandBuilder()
        .setName("reqcheck")
        .setDescription("Check a players requirements!")
        .addStringOption(option =>
            option
                .setName("username")
                .setDescription("The username of the player to check")
                .setRequired(true)),
    async run(interaction, { serverConf }, bot) {
        let requirements = Object.fromEntries(Object.entries(serverConf.requirements).filter(e => [e[1].role, e[1].min, e[1].max].some(el => el !== null)));
        const username = interaction.options.getString("username", true);
        if (!Object.entries(requirements).length) return bot.createErrorEmbed(interaction).setDescription(`This server does not have requirements set up!`).send()
        // let memberCheck = await bot.parseMember(args[0], interaction.guild);
        // let user = memberCheck ? (await bot.getUser({ id: memberCheck.id }))?.uuid : args[0] ? args[0] : (await bot.getUser({ id: interaction.author.id })).uuid;


        let data = await bot.wrappers.hypixelPlayer.get(username);

        if (!data || data.outage || data.exists == false) {
            return bot.createErrorEmbed(interaction).setDescription("Could not find that player!").send()
        }

        let sortedRequirements = Object.fromEntries(Object.entries(requirements).sort((a, b) => {
            if (getGameTypeFromID(a[0].toLowerCase()).name < getGameTypeFromID(b[0].toLowerCase()).name) { return -1; }
            if (getGameTypeFromID(a[0].toLowerCase()).name > getGameTypeFromID(b[0].toLowerCase()).name) { return 1; }
            return 0;
        }))
        const [check, outcome] = bot.requirementCheck(data, sortedRequirements);
        console.log(check)
        let desc = Object.entries(check).map(e => {
            let [id, result] = e;
            let { name, accepts } = getReqFromID(id);
            // return `${result.passed ? '<:pass:1028363845749710878>' : result.verdict > 0 ? '<:toohigh:926634633741889586>' : '<:toolow:926634691728125992>'} \`${name}\` → ${result.min !== null ? `${result.min.toLocaleString()} ≤ ` : ''} **${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}** ${result.max !== null ? `≤ ${result.max.toLocaleString()}` : ''} ${result.passed ? '' : result.verdict > 0 ? '(Too high!)' : '(Too low!)'}`
            return `${result.passed ? '<:pass:1028363845749710878>' : result.verdict > 0 ? '<:toohigh:926634633741889586>' : '<:toolow:926634691728125992>'} **${name}** → ${result.max ?? false ? `${result.max?.toLocaleString()}/` : ''}__**${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}**__${result.min ?? false ? `/${result.min.toLocaleString()}` : ''} ${result.passed ? '' : result.verdict > 0 ? `(Must be *at most* ${result.max.toLocaleString()}!)` : `(Must be *at least* ${result.min.toLocaleString()}!)`}`
            //                 return {
            //                     name: `${result.passed ? '✅' : '❌'} ${name}`,
            //                     value: `
            //                     \`Minimum:\` ${result.min}
            //                     \`Minimum:\` ${result.min}
            // **Current: ${accepts !== "FLOAT" ? parseInt(result.currentValue).toLocaleString() : result.currentValue}**
            // ${result.passMessage ? `**${result.passMessage}**` : ''}`,
            //                     inline: true
            //                 }
        })
        bot.createEmbed(interaction)
            .setTitle(`${data.emojiRank} ${data.displayname}'s Requirements Check`)
            // .setDescription(`${outcome.passed}/${outcome.total} requirements passed:`)
            .addField(`${outcome.passed}/${outcome.total} Passed:`, desc.join('\n'))
            // .addFields(desc)
            .setThumbnail(bot.skin(data.uuid))
            .send()
    }
}