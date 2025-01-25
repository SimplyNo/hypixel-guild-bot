const ioredis = require("ioredis");
const geturl = (uuid) =>
    `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`;
const fetch = require("node-fetch");
/**
 * @type {ioredis.Redis}
 */
const redis = require("../../index.js").redis;
module.exports = {
    async get(query) {
        return new Promise(async (res) => {
            let cached = await redis.get(`mojang:${query.toLowerCase()}`);
            cached && console.log(`cache:`, cached)
            if (cached) return res({ name: cached });

            let url = geturl(query);
            let resp = await fetch(url);
            resp
                .json()
                .then((body) => {
                    body.error && res(0);

                    this.save(query.toLowerCase(), body.name);
                    res(body);
                })
                .catch((e) => {
                    res(0);
                });
        });
    },
    save: (uuid, name) => {
        redis.setex(`mojang:${uuid}`, 60 * 60 * 24 * 14, name);
    },
};
