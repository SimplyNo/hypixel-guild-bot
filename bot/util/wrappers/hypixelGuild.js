
const fetch = require("node-fetch");
const { hypixel_key } = require('../../../config.json');
const main = `http://api.hypixel.net/guild?key=${hypixel_key}`;
const endpoints = {
    player: main + "&player=",
    id: main + "&id=",
    name: main + "&name="
}
// const mojang = require("./mojangPlayer");


module.exports = {
    get(query, type) {
        return new Promise(async res => {
            let unparsed = await fetch(endpoints[type] + encodeURI(query)).catch(e => { outage: true });
            let data = await unparsed.json().catch(e => ({ outage: true }));
            if (data.outage) return res(data);
            // console.log(data)
            if (data.guild) {
                data.guild.members = data.guild.members.filter(m => data.guild.members.filter(e => e.uuid == m.uuid).length == 1)
                let members = data.guild.members;

                let ranks = Array.from(new Set(data.guild.members.map(el => el.rank)));
                let missingRanks = ranks.filter((el) => !data.guild.ranks?.find(e => e.name == el));
                missingRanks.forEach(r => {
                    if (r.match(/^guild\s*master$/i)) return;
                    data.guild.ranks.push({ name: r, tag: null, priority: 1, created: Array.from(r).map(c => c.charCodeAt(0)).reduce((prev, curr) => prev + curr) })
                })

                for (const [index, member] of members.entries()) {
                    // set member vars:
                    let weekly = Object.entries(member.expHistory).reduce((prev, current) => prev + parseInt(current[1]), 0);
                    data.guild.members[index].weekly = weekly;


                    // fill rnkas
                    if (data.guild && data.guild.ranks) {
                        if (missingRanks.includes(data.guild.members[index].rank) && !["Guild Master", "GUILDMASTER"].includes(data.guild.members[index].rank)) {
                            // console.log(data.guild.members[index].rank)

                            let defaultRank = data.guild.ranks.find(e => e.default);
                            if (defaultRank) data.guild.members[index].rank = defaultRank.name;

                        }
                    }
                }
            }
            res(data.guild || { exists: false })
        })
    }
}