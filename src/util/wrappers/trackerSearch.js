
const fetch = require("node-fetch");
const { tracker_api } = require('../../../config.json');

const main = (query) => `api/search/${query}`;
module.exports = {
    get(query) {
        return new Promise(async res => {
            if (!tracker_api || !tracker_api.length) res(console.error(`[TRACKER-GUILD] Tracker API not set up!`))

            const url = new URL(tracker_api + main(query));
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