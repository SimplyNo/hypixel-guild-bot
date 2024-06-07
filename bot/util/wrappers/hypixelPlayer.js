
const fetch = require("node-fetch");
const { hypixel_key } = require('../../../config.json');
const { Response } = require("node-fetch");
const mojangPlayer = require("./mojangPlayer");
const redis = require("../../../index").redis;
const util = require('../../util/gameFunctions.js');
const playerUtil = require('../../util/playerFunctions');
const main = (uuid) => `http://api.hypixel.net/player?key=${hypixel_key}&uuid=${uuid}`;
const mojang = `https://api.mojang.com/users/profiles/minecraft/`;
let lastTimeReset = 30;
let cacheSaveTime = 300;
function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
}
module.exports = {
    get(query) {
        console.log(`q: `, query)
        const { getRank, getPlusColor, getEmojiRank, getFormattedRank, getPlusColorMC } = require('../functions.js')
        return new Promise(async res => {
            if (query.length <= 16) {
                let $uuid = await mojangPlayer.get(query).catch(e => null)
                if (!$uuid) return res(null);
                query = $uuid.id;
            } else {
                query = query.replace(/-/g, "");
            }
            let cached = await redis.get(`player:${query}`);
            if (cached) return res(JSON.parse(cached));
            let unparsed = await fetch(main(query)).catch(e => ({ outage: true }));
            if (unparsed.outage) return res(unparsed);

            let data = { throttle: true };
            while (data?.throttle) {
                const q = main(query);
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
            if (!data.player) return res(data.player);

            data.player.plusColor = {
                id: data.player.rankPlusColor
            }
            data.player.rank = getRank(data.player);
            data.player.color = getPlusColor(data.player.rankPlusColor, data.player.rank);
            data.player.emojiRank = getEmojiRank(data.player);
            data.player.mcPlusColor = getPlusColorMC(data.player.rank, data.player.rankPlusColor);
            data.player.formattedRank = getFormattedRank(data.player.rank, data.player.mcPlusColor);
            data.player.level = Math.floor(playerUtil.getLevel(data.player.networkExp));
            if (data.player.stats?.SkyWars) data.player.stats.SkyWars.level = util.getSkywarsLevel(data.player.stats.SkyWars.skywars_experience || 0);
            if (data.player.stats?.Pit?.profile?.prestiges) data.player.stats.Pit.prestige = data.player.stats.Pit.profile.prestiges.length;
            redis.setex(`player:${query}`, cacheSaveTime, JSON.stringify(data.player))

            res(data.player)
        })
    }
}