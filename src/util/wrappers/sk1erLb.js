const HtmlTableToJson = require('html-table-to-json')
const fetch = require("node-fetch");

module.exports = {
    get() {
        return new Promise(async resolve => {
            var lb = []
            
            const data = await fetch("https://sk1er.club/leaderboards/newdata/GUILD_LEVEL/", {headers: {["user-agent"]: "hypixelguildbot/1.0.0"}})
            var body = await data.text()
            body = body.toString();
            var parsedHTML = HtmlTableToJson.parse(body, { values: true }).results[0];

            parsedHTML.forEach(item => lb.push({position: item[0], name: item[2], level: item[3], exp: item[5]}))
            resolve(lb)
        })
    }
}