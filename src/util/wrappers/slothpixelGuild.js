const fetch = require('node-fetch');
const { colorCodeToColor } = require('../rankFunctions');
const endpoints = {
    player: (q) => `https://api.slothpixel.me/api/guilds/${q}?populatePlayers=true`,
    id: (q) => `https://api.slothpixel.me/api/guilds/id/${q}?populatePlayers=true`,
    name: (q) => `https://api.slothpixel.me/api/guilds/name/${q}?populatePlayers=true`
}
const myHeaders = new fetch.Headers();
const { slothpixel_key } = require('../../../config.json');

myHeaders.append("Authorization", `Bearer ${slothpixel_key}`);

const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
};

module.exports = {
    get(query, type) {
        return new Promise(async res => {
            if (!query) {
                res({ exists: false })
            } else {

                let unparsed = await fetch(endpoints[type](query), { headers: { ["user-agent"]: "hypixelguildbot/1.0.0", Authorization: `Bearer ${slothpixel_key}` } }).catch(e => ({ json: () => new Promise((res, rej) => rej(null)) }));

                // let headers = console.log(unparsed.headers)
                let data = await unparsed.json().catch(e => ({ outage: true }));
                if (data.outage) return res(data);
                // let guild = data.guild || { exists: false };
                let guild = data.guild ? data : { exists: false };
                // console.log(data.guild)

                if (guild && guild.members) {
                    let members = guild.members;
                    for (const [index, member] of members.entries()) {


                        // // set member vars:
                        let weekly = Object.entries(member.exp_history).reduce((prev, current) => prev + parseInt(current[1]), 0);
                        guild.members[index].weekly = weekly;

                        // fill rnkas
                        if (guild.ranks) {
                            let ranks = Array.from(new Set(guild.members.map(el => el.rank)));
                            let missing = ranks.filter((el) => !guild.ranks.find(e => e.name == el));
                            if (missing.includes(guild.members[index].rank) && !["Guild Master", "GUILDMASTER"].includes(guild.members[index].rank)) {
                                let defaultRank = guild.ranks.find(e => e.default) || { name: guild.members[index].rank };
                                guild.members[index].rank = defaultRank.name;
                            }
                        }
                        guild.members[index].uuid = member.profile.uuid;
                        guild.members[index].username = member.profile.username;

                        guild.members[index].expHistory = member.exp_history;
                    }
                    let lvl = guildLevel(guild.exp);
                    guild.expNeeded = lvl.needed;

                    // calculate total guild member avereage
                    let totalMembers = guild.members.length;
                    let totalDailyExp = guild.members.reduce((prev, curr) => prev + Object.values(curr.exp_history)[0], 0)
                    let dailyAverage = totalDailyExp / totalMembers;
                    guild.dailyAverage = dailyAverage;

                    // misc
                    let scaledExpHistory = guild.members.map((value, index) => Object.values(value.expHistory)).reduce((prev, curr) => curr.map((v, i) => prev[i] += v), [0, 0, 0, 0, 0, 0, 0]).map((e) => scaledGEXP(e));
                    // scaledExpHistory.weekly = (Object.values(guild.scaledExpHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()}** | ${(Object.values(guild.expHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()
                    guild.scaledExpHistory = scaledExpHistory.reduce((prev, curr, index) => Object.assign({ [Object.keys(guild.members[0].expHistory)[index]]: curr }, prev), {});


                    let expHistory = guild.members.map((value, index) => Object.values(value.expHistory)).reduce((prev, curr) => curr.map((v, i) => prev[i] += v), [0, 0, 0, 0, 0, 0, 0]);
                    guild.expHistory = expHistory.reduce((prev, curr, index) => Object.assign({ [Object.keys(guild.members[0].expHistory)[index]]: curr }, prev), {});


                    guild.expByGame = guild.exp_by_game;


                    // color
                    guild.tagColor = colorMap[colorCodeToColor(guild.tag_color.replace(/&/g, '§'))];

                    // level
                    let level = guildLevel(guild.exp);
                    guild.level = level.level;
                    guild.expToNextLevel = level.nextLevel;
                }
                // console.log(guild)
                res(guild)
                // fetch(endpoints[type](query), requestOptions)
                //     .then(response => response.text())
                //     .then(result => console.log(result))
                //     .catch(error => console.log('error', error));
                // res()   
            }
        })
    }
}


function guildLevel(exp) {
    const EXP_NEEDED = [
        100000,
        150000,
        250000,
        500000,
        750000,
        1000000,
        1250000,
        1500000,
        2000000,
        2500000,
        2500000,
        2500000,
        2500000,
        2500000,
        3000000
    ];
    var level = 0;

    for (let i = 0; i <= 1000; i += 1) {
        var need = 0;

        if (i >= EXP_NEEDED.length) need = EXP_NEEDED[EXP_NEEDED.length - 1];
        else need = EXP_NEEDED[i];

        if (exp - need < 0)
            return {
                level: Math.round((level + exp / need) * 100) / 100,
                nextLevel: Math.round(need - exp),
                needed: Math.round(need)
            };

        level += 1;
        exp -= need;
    }

    return { level: 1000, nextLevel: 0, needed: 0 };
};
function scaledGEXP(input) {
    if (input <= 200000) return Number(input);
    if (input <= 700000) return Number(Math.round(((input - 200000) / 10) + 200000));
    if (input > 700000) return Number(Math.round(((input - 700000) / 33) + 250000));
}

const colorMap = {
    WHITE: { code: '§f', hex: '#F2F2F2', color: 'WHITE' },
    YELLOW: { code: '§e', hex: '#FFFF55', color: 'YELLOW' },
    LIGHT_PURPLE: { code: '§d', hex: '#FF55FF', color: 'LIGHT_PURPLE' },
    RED: { code: '§c', hex: '#FF5555', color: 'RED' },
    AQUA: { code: '§b', hex: '#55FFFF', color: 'AQUA' },
    GREEN: { code: '§a', hex: '#55FF55', color: 'GREEN' },
    BLUE: { code: '§9', hex: '#5555FF', color: 'BLUE' },
    DARK_GRAY: { code: '§8', hex: '#555555', color: 'DARK_GRAY' },
    GRAY: { code: '§7', hex: '#BAB6B6', color: 'GRAY' },
    GOLD: { code: '§6', hex: '#FFAA00', color: 'GOLD' },
    DARK_PURPLE: { code: '§5', hex: '#AA00AA', color: 'DARK_PURPLE' },
    DARK_RED: { code: '§4', hex: '#AA0000', color: 'DARK_RED' },
    DARK_AQUA: { code: '§3', hex: '#00AAAA', color: 'DARK_AQUA' },
    DARK_GREEN: { code: '§2', hex: '#00AA00', color: 'DARK_GREEN' },
    DARK_BLUE: { code: '§1', hex: '#0000AA', color: 'DARK_BLUE' },
    BLACK: { code: '§0', hex: '#000000', color: 'BLACK' }
};