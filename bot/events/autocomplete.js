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
        if (['guild', 'weekly', 'daily', 'monthly', 'list', 'leaderboard', 'compare'].includes(autocomplete.commandName)) {
            const query = autocomplete.options.getFocused().trim();
            if (query.length > 100) return;
            if (!query.length) {
                const guildLeaderboard = await bot.wrappers.trackerLeaderboard.get();
                const recentlySearched = (await bot.userConfig.findOne({ id: autocomplete.user.id }))?.recentlySearched ?? [];
                const resp = [
                    ...(recentlySearched.filter(e => e).slice(0, 5).map(e => ({ name: e, value: e }))),
                    ...guildLeaderboard.map(e => ({ name: e.name, value: e.name }))
                ].slice(0, 25);
                return autocomplete.respond(resp)
            }
            const search = await bot.wrappers.trackerSearch.get(query);

            if (search && search.length) return autocomplete.respond([...search.map(e => ({ name: e.name, value: e.name }))].slice(0, 25));
            return autocomplete.respond([{ name: query, value: query }])
        }
        if (autocomplete.commandName === 'discordcheck') {
            const currentlyViewingSlot = serverConf.currentAutoRoleSlot ?? 0;
            const autoRoleSlots = ['autoRole', 'autoRole1', 'autoRole2'];
            const resps = autoRoleSlots.map((slot, pos) => {
                return serverConf[slot].guild ? ({
                    name: `(Guild ${pos + 1}) ${serverConf[slot].guild ? serverConf[slot].guildName : 'Not set'}`,
                    value: pos + 1
                }) : null
            })
            autocomplete.respond(resps.filter(e => e));
        }
        if (autocomplete.commandName === 'autorole' && autocomplete.options.getSubcommand() === 'setrole') {
            // console.log(serverConf.autoRole) 
            const currentlyViewingSlot = serverConf.currentAutoRoleSlot ?? 0;
            const autoRole = serverConf[`autoRole${currentlyViewingSlot === 0 ? '' : currentlyViewingSlot}`]
            const resps = Object.values(autoRole?.config ?? {}).map(role => {
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
