const ioredis = require("ioredis");
const playerDB = (uuid) => `https://playerdb.co/api/player/minecraft/${uuid}`;
const fetch = require("node-fetch");
/**
 * @type {ioredis.Redis}
 */
const redis = require("../../index.js").redis;
module.exports = {
    async get(query) {
        return new Promise(async (res) => {
            let cached = await redis.get(`playerDB:${query.toLowerCase()}`);
            cached && console.log(`cache (playerDB):`, cached)
            if (cached?.success) return res(cached);

            let url = playerDB(query);
            let resp = await fetch(url);
            resp
                .json()
                .then((body) => {
                    !body.success && res(0);

                    this.save(query.toLowerCase(), body);
                    res(body);
                })
                .catch((e) => {
                    res(0);
                });
        });
    },
    save: (query, body) => {
        redis.setex(`playerDB:${query}`, 60 * 60 * 24, body);
    },
};
