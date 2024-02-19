
const fetch = require("node-fetch");
const { tracker_api } = require('../../../config.json');

const main = (query, parseNames = true) => ({
    guild: `/api/guild/${query}`,
    tracked: `/api/tracked/${query}?fetch=true&currentMembersOnly=true`,
})
module.exports = {
    get(query, tracked = false, type = "name", parseNames = false) {
        return new Promise(async res => {
            if (!tracker_api || !tracker_api.length) res(console.error(`[TRACKER-GUILD] Tracker API not set up!`))

            const url = new URL(tracker_api + main(query, parseNames)[tracked ? "tracked" : "guild"]);
            url.searchParams.append('type', type)
            if (parseNames) url.searchParams.append('parseNames', parseNames)
            console.log(url.toString())
            let unparsed = await fetch(url).catch(e => null);
            let data = await unparsed?.json().catch(e => { outage: true });
            if (!data || data.error) {
                if (data?.error === 'notfound') data.exists = false;
                if (data?.error === 'outage') data.outage = true;
                return res(data)
            };
            return res(data)
        })
    }
}