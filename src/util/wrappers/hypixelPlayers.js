const main = (uuid) => `http://api.hypixel.net/player?key=${hypixel_key}&uuid=${uuid}`;
const fetch = require('node-fetch');
const { hypixel_key } = require('../../../config.json');
const hypixelPlayer = require('./hypixelPlayer');

module.exports = {
    async get(players = [], options = { progressCallback: (num, total) => { } }) {
        let data = [];

        for (let i = 0; i < players.length; i++) {
            // const uuids = players.slice(i, (i + 1));
            const uuid = players[i];
            // const unparsed = await fetch(main(uuids.join(',')), { headers: { ["user-agent"]: "hypixelguildbot/1.0.0", "API-Key": `${hypixel_key}` } }).then(e => e.json()).catch(e => null);
            const player = await hypixelPlayer.get(uuid || 'null');
            console.log(`uuids:`, uuid)
            if (!player?.displayname) return null;
            options.progressCallback(i + 1, players.length);
            data.push(player)
        }
        return data;
    }
}