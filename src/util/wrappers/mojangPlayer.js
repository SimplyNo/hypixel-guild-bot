const uuidToUsername = (uuid) => `https://api.mojang.com/user/profiles/${uuid}/names`;
const usernameToUUID = (username) => `https://api.mojang.com/users/profiles/minecraft/${username}`;
const fetch = require("node-fetch")
module.exports = {
    async get(query) {
        return new Promise(async res => {
            let url = query.length > 16 ? uuidToUsername(query) : usernameToUUID(query);
            let resp = await fetch(url)
            resp.json().then(body => {
                body.error && res(0);
                res(body);
            }).catch(e => {
                res(0)
            })

        })
    }
}