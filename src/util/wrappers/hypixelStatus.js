
const fetch = require("node-fetch");
const { hypixel_key } = require('../../../config.json');

const main = `http://api.hypixel.net/status?key=${hypixel_key}&uuid=`;
const mojang = `https://api.mojang.com/users/profiles/minecraft/`;


module.exports = {
    get(query) {
        return new Promise(async res => {
            if (query.length <= 16) {
                let $uuid = await fetch(mojang + query);
                try {
                    let uuid = await $uuid.json();
                    query = uuid.id;
                } catch (e) {
                    res(0);
                }
            } else {
                query = query.replace(/-/g, "");
            }
            let unparsed = await fetch(main + query);
            let data = await unparsed.json().catch(e => ({ outage: true }));
            if (data.outage) return res(data);
            res(data)
        })
    }
}