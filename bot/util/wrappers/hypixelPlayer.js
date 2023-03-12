
const fetch = require("node-fetch");
const { hypixel_key } = require('../../../config.json');

const getMain = (uuid) => `http://api.hypixel.net/player?key=${hypixel_key}&uuid=${uuid}`;
const mojang = `https://api.mojang.com/users/profiles/minecraft/`;


module.exports = {
    get(query) {
        const { getRank, getPlusColor, getEmojiRank, getFormattedRank, getPlusColorMC } = require('../functions.js')
        return new Promise(async res => {
            if (query.length <= 16) {
                let $uuid = await fetch(mojang + query);
                try {
                    let uuid = await $uuid.json();
                    query = uuid.id;
                } catch (e) {
                    res(0)
                }
            } else {
                query = query.replace(/-/g, "");
            }
            let unparsed = await fetch(getMain(query)).catch(e => ({ outage: true }));
            if (unparsed.outage) return res(unparsed);
            let data = await unparsed.json().catch(e => ({ outage: true }));
            if (data.outage) return res(data);
            if (!data.player) return res(data.player);

            data.player.plusColor = {
                id: data.player.rankPlusColor
            }
            data.player.rank = getRank(data.player),
                data.player.color = getPlusColor(data.player.rankPlusColor, data.player.rank),
                data.player.emojiRank = getEmojiRank(data.player),
                data.player.mcPlusColor = getPlusColorMC(data.player.rank, data.player.rankPlusColor),
                data.player.formattedRank = getFormattedRank(data.player.rank, data.player.mcPlusColor),
                res(data.player)
        })
    }
}