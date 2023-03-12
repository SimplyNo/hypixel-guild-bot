const { Client, Interaction } = require("discord.js");
const validReqs = require('../../valid-requirements.json');
module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {Client} bot 
     * @param {Interaction} autocomplete 
     */
    async execute(bot, autocomplete) {
        if (!autocomplete.isAutocomplete()) return;
        const serverConf = await bot.config.getConfigAsObject(autocomplete.guild.id);
        if (autocomplete.commandName === 'autorole' && autocomplete.options.getSubcommand() === 'setrole') {
            // console.log(serverConf.autoRole) 
            const resps = Object.values(serverConf.autoRole?.config ?? {}).map(role => {
                return {
                    name: `(${role.pos}) ${role.name} ${role.tag ? `[${role.tag}]` : ''}`,
                    value: role.pos,
                }
            }) ?? [];
            autocomplete.respond(resps);

        } else if (autocomplete.commandName === 'gxproles') {
            // console.log(serverConf.gxpRoles)
            const resps = serverConf.gxpRoles.map((role, pos) => ({ name: `(${pos + 1}) ${role.gxp} GXP`, value: pos + 1 }));
            autocomplete.respond(resps);
        } else if (autocomplete.commandName === 'requirements') {
            if (autocomplete.options.getSubcommand() === 'set') {
                const req = autocomplete.options.getString('requirement', true);
                const search = validReqs.flatMap(e => e.reqs).filter(e => e.name.toLowerCase().includes(req.toLowerCase())).sort((a, b) => a.name.indexOf(req) - b.name.indexOf(req));
                const resps = search.slice(0, 25).map(e => ({ name: e.name, value: e.id }));
                autocomplete.respond(resps);
            } else if (autocomplete.options.getSubcommand() === 'remove') {
                const req = autocomplete.options.getString('requirement', true);
                const search = Object.keys(serverConf.requirements).map(e => getReqFromID(e)).filter(e => e.name.toLowerCase().includes(req.toLowerCase())).map(e => ({ name: e.name, value: e.id }));
                const resps = search.slice(0, 25);
                autocomplete.respond(resps);
            }
        } else if (autocomplete.commandName === 'timeroles') {
            const resps = serverConf.timeRoles.map((e, pos) => ({ name: `(${pos + 1}) ${e.days} days`, value: pos + 1 }))
            autocomplete.respond(resps);
        }
    }
}
function getReqFromID(id) {
    return validReqs.flatMap(e => e.reqs).find(e => e.id.toLowerCase() == id);
}
