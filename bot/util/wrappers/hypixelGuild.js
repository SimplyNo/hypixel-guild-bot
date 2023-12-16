const fetch = require("node-fetch");
const { hypixel_key } = require("../../../config.json");
const main = `http://api.hypixel.net/guild?key=${hypixel_key}`;
const { colorCodeToColor } = require("../rankFunctions");
const { Response } = require("node-fetch");
const mojangPlayer = require("./mojangPlayer");

const endpoints = {
    player: main + "&player=",
    id: main + "&id=",
    name: main + "&name=",
};
const mojang = require("./mojangProfile");

module.exports = {
    get(query, type, parseNames = false) {
        return new Promise(async (res) => {
            let data = { throttle: true };
            if (type === 'player') {
                if (query.length <= 16) {
                    let $uuid = await mojangPlayer.get(query).catch(e => null)
                    if (!$uuid) return res(null);
                    query = $uuid.id;
                } else {
                    query = query.replace(/-/g, "");
                }
            }
            while (data?.throttle) {
                const q = endpoints[type] + encodeURI(query);
                console.log(q)
                // console.log(`[Hypixel-Player] Fetching Stats of ${q}...`);
                let unparsed = await (Promise.race([fetch(q), new Promise(res => setTimeout(() => res({ fetchtimeout: true }), 10000))]));

                // maybe timeout ?? idfk .
                if (!(unparsed instanceof Response)) {
                    console.log('THE TIME OUT WORKED ?!')
                    return res(null);
                }

                data = await unparsed.json().catch(e => ({ outage: true }));
                // console.log(`[Hypixel-Player] Fetched stats of ${query}! (parsed)`, util.inspect(data, { depth: 0, colors: true }));
                // console.log(`${q}`, data.displayname)
                if (data?.throttle) {
                    // console.log(`running throttle loop`)
                    const nextReset = parseInt(unparsed.headers.get('retry-after')) || (lastTimeReset ?? 30);
                    lastTimeReset = nextReset;
                    console.log(`[HYPIXEL-PLAYER] Key throttled:`, data, `Trying again in ${nextReset} seconds...`)
                    await wait(nextReset * 1000)
                }
            }
            if (data.outage) return res(data);
            // console.log(data)
            // console.log(query)

            if (data.guild) {
                data.guild.members = data.guild.members.filter(
                    (m) => data.guild.members.filter((e) => e.uuid == m.uuid).length == 1
                );
                let members = data.guild.members;

                let ranks = [];
                let missing = [];
                if (data.guild.ranks) {
                    ranks = Array.from(new Set(data.guild.members.map(el => el.rank)));
                    missing = ranks.filter((el) => !data.guild.ranks.find(e => e.name == el));
                }
                // let ranks = Array.from(
                //     new Set(data.guild.members.map((el) => el.rank))
                // );
                // let missingRanks = ranks.filter(
                //     (el) => !data.guild.ranks?.find((e) => e.name == el)
                // );
                // missingRanks.forEach((r) => {
                //     if (r.match(/^guild\s*master$/i)) return;
                //     data.guild.ranks.push({
                //         name: r,
                //         tag: null,
                //         priority: 1,
                //         created: Array.from(r)
                //             .map((c) => c.charCodeAt(0))
                //             .reduce((prev, curr) => prev + curr),
                //     });
                // });

                data.guild.tagColor = colorMap[data.guild?.tagColor || "GRAY"];
                let parsedNames = [];
                if (parseNames) {
                    parsedNames = await Promise.all(members.map(async m => (({ uuid: m.uuid, ...await mojang.get(m.uuid, "uuid") }))));

                }
                console.log(`parsed names: `, parsedNames)
                for (const [index, member] of members.entries()) {
                    // set member vars:
                    let weekly = Object.entries(member.expHistory).reduce(
                        (prev, current) => prev + parseInt(current[1]), 0);
                    data.guild.members[index].weekly = weekly;
                    if (parseNames) {
                        let name = parsedNames.find(e => e.uuid == member.uuid);
                        if (name) data.guild.members[index].username = name.name;
                    }

                    // fill rnkas
                    if (data.guild && data.guild.ranks) {
                        if (missing.includes(data.guild.members[index].rank) && !["Guild Master", "GUILDMASTER"].includes(data.guild.members[index].rank)) {
                            let defaultRank = data.guild.ranks.find(e => e.default) || { name: data.guild.members[index].rank };
                            data.guild.members[index].rank = defaultRank.name;
                        }
                    }
                }
                // level
                let lvl = guildLevel(data.guild.exp);
                data.guild.expNeeded = lvl.needed;
                data.guild.level = lvl.level;
                data.guild.expToNextLevel = lvl.nextLevel;
                let totalMembers = data.guild.members.length;
                let totalDailyExp = data.guild.members.reduce((prev, curr) => prev + Object.values(curr.expHistory)[0], 0)
                let dailyAverage = totalDailyExp / totalMembers;
                data.guild.dailyAverage = dailyAverage;

                // misc
                let scaledExpHistory = data.guild.members.map((value, index) => Object.values(value.expHistory)).reduce((prev, curr) => curr.map((v, i) => prev[i] += v), [0, 0, 0, 0, 0, 0, 0]).map((e) => scaledGEXP(e));
                // scaledExpHistory.weekly = (Object.values(data.guild.scaledExpHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()}** | ${(Object.values(data.guild.expHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()
                data.guild.scaledExpHistory = scaledExpHistory.reduce((prev, curr, index) => Object.assign({ [Object.keys(data.guild.members[0].expHistory)[index]]: curr }, prev), {});


                let expHistory = data.guild.members.map((value, index) => Object.values(value.expHistory)).reduce((prev, curr) => curr.map((v, i) => prev[i] += v), [0, 0, 0, 0, 0, 0, 0]);
                data.guild.expHistory = expHistory.reduce((prev, curr, index) => Object.assign({ [Object.keys(data.guild.members[0].expHistory)[index]]: curr }, prev), {});

                data.guild.expByGame = data.guild.guildExpByGameType;

            }

            res(data.guild || { exists: false });
        });
    },
};

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
