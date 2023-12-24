
const fetch = require("node-fetch");
const { tracker_api } = require('../../../config.json');

const main = (q) => `${tacker_api}/tracked/${q}?lean=true&`;
const mojang = `https://api.mojang.com/users/profiles/minecraft/`;


module.exports = {
    get(query) {
        return new Promise(async res => {
            if (!tracker_api) res(console.log(`[TRACKER-GUILD] Tracker API not set up!`))

            let unparsed = await fetch(main + query);
            let data = await unparsed.json().catch(e => { outage: true });
            if (data.outage) return res(data);
            res(data)
        })
    }
}