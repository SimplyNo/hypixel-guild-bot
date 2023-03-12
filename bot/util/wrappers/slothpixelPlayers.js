const main = (q) => `https://api.slothpixel.me/api/players/${q}`;
const slothpixelPlayer = require('./slothpixelPlayer').get;
const fetch = require('node-fetch');
const { slothpixel_key } = require('../../../config.json');

module.exports = {
    async get(players = [], options = { progressCallback: (num, total) => { } }) {
        let data = [];

        for (let i = 0; i < players.length / 16; i++) {
            const uuids = players.slice(i * 16, (i + 1) * 16);
            const unparsed = await fetch(main(uuids.join(',')), { headers: { ["user-agent"]: "hypixelguildbot/1.0.0", Authorization: `Bearer ${slothpixel_key}` } }).then(e => e.json()).catch(e => null);
            if (!unparsed) return null;
            options.progressCallback(i * 16 + uuids.length, players.length);
            const playerData = await Promise.all(unparsed.map((data, i) => slothpixelPlayer(uuids[i], { data })));
            data.push(...playerData)
        }
        return data;
    }
}