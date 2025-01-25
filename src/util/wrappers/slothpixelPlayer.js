const fetch = require('node-fetch');

const main = (q) => `https://api.slothpixel.me/api/players/${q}`

const myHeaders = new fetch.Headers();
const { slothpixel_key } = require('../../../config.json');
myHeaders.append("Authorization", `Bearer ${slothpixel_key}`);

const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
};

module.exports = {
    get(query, options = { data: false }) {
        return new Promise(async res => {
            const { getRank, getPlusColor, getEmojiRankStatsify, getFormattedRank, getRankSlothPixel, getPlusColorObject, getEmojiRankFromFormatted } = require('../functions.js')

            if (!query) {
                res({ exists: false })
            } else {
                let unparsed, data;
                if (!options.data) {
                    unparsed = await fetch(main(query), { headers: { ["user-agent"]: "hypixelguildbot/1.0.0", Authorization: `Bearer ${slothpixel_key}` } }).catch(e => ({ json: () => new Promise((res, rej) => rej(null)) }));
                    // console.log(unparsed.headers)   
                }
                data = options.data ? options.data : await unparsed.json().catch(e => ({ outage: true }));
                // console.log(data)
                let player = !data.error ? data : { exists: false };

                if (data.outage || player.exists == false) {
                    console.log(unparsed)
                    return res(data);
                }
                player.rank = getRankSlothPixel(player);
                player.color = player.rank_plus_color.replace('&', '§');
                player.plusColor = getPlusColorObject(player);
                // player.emojiRank = getEmojiRankStatsify(player);
                player.emojiRank = getEmojiRankFromFormatted(player.rank_formatted.replace(/&/g, '§'));
                // console.log(player.plusColor    )
                // player.mcPlusColor = getPlusColorMC(player.rank, player.plusColor.id);
                // player.formattedRank = getFormattedRank(player.rank, player.mcPlusColor.id);
                player.formattedRank = player.rank_formatted;
                res(player)
            }
        })

    }
}