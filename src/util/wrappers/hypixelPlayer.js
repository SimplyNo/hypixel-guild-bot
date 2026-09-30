const fetch = require("node-fetch");
const { hypixel_key } = require("../../../config.json");

const playerDB = require("./playerDB.js");
const redis = require("../../index").redis;
const util = require("../gameFunctions.js");
const playerUtil = require("../playerFunctions.js");

const PLAYER_CACHE_SECONDS = 300;
const FETCH_TIMEOUT_MS = 10_000;

let lastTimeReset = 30;

const main = uuid =>
    `https://api.hypixel.net/player?key=${hypixel_key}&uuid=${uuid}`;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    try {
        return await fetch(url, {
            signal: controller.signal
        });
    } catch (error) {
        if (error.name === "AbortError") {
            return { fetchtimeout: true };
        }

        console.error("[Hypixel-Player] Request failed:", error);
        return { outage: true };
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    async get(query, force = false) {
        const {
            getRank,
            getPlusColor,
            getEmojiRank,
            getFormattedRank,
            getPlusColorMC
        } = require("../functions.js");

        if (typeof query !== "string" || !query.trim()) {
            return null;
        }

        query = query.trim();

        console.log("[Hypixel-Player] Query:", query);

        // Convert a username into a UUID.
        if (query.length <= 16) {
            const uuidResponse = await playerDB.get(query).catch(error => {
                console.error(
                    "[Hypixel-Player] Failed to resolve username:",
                    error
                );

                return null;
            });

            if (!uuidResponse?.data?.player?.id) {
                return null;
            }

            query = uuidResponse.data.player.id;
        } else {
            query = query.replace(/-/g, "");
        }

        // Return cached data unless a forced refresh was requested.
        if (!force) {
            const cached = await redis.get(`player:${query}`);

            if (cached) {
                try {
                    const parsedCache = JSON.parse(cached);

                    console.log(
                        `[Hypixel-Player] Found cached stats for ${query}`
                    );

                    return parsedCache;
                } catch (error) {
                    console.error(
                        `[Hypixel-Player] Invalid cache for ${query}:`,
                        error
                    );
                }
            }
        }

        let data = { throttle: true };

        while (data?.throttle) {
            console.log(`[Hypixel-Player] Fetching stats for ${query}`);

            const response = await fetchWithTimeout(main(query));

            if (response.fetchtimeout) {
                console.error(
                    `[Hypixel-Player] Request for ${query} timed out`
                );

                return null;
            }

            if (response.outage) {
                return response;
            }

            data = await response.json().catch(error => {
                console.error(
                    "[Hypixel-Player] Failed to parse response:",
                    error
                );

                return { outage: true };
            });

            if (data?.throttle) {
                const retryAfter = Number.parseInt(
                    response.headers.get("retry-after"),
                    10
                );

                const nextReset =
                    Number.isFinite(retryAfter) && retryAfter > 0
                        ? retryAfter
                        : lastTimeReset;

                lastTimeReset = nextReset || 30;

                console.log(
                    `[Hypixel-Player] Key throttled. Retrying in ${lastTimeReset} seconds...`
                );

                await wait(lastTimeReset * 1000);
            }
        }

        if (data.outage) {
            return data;
        }

        if (!data.player) {
            return data.player;
        }

        const player = data.player;

        player.plusColor = {
            id: player.rankPlusColor
        };

        player.rank = getRank(player);
        player.color = getPlusColor(
            player.rankPlusColor,
            player.rank
        );
        player.emojiRank = getEmojiRank(player);
        player.mcPlusColor = getPlusColorMC(
            player.rank,
            player.rankPlusColor
        );
        player.formattedRank = getFormattedRank(
            player.rank,
            player.mcPlusColor
        );
        player.level = Math.floor(
            playerUtil.getLevel(player.networkExp)
        );

        if (player.stats?.SkyWars) {
            player.stats.SkyWars.level = util.getSkywarsLevel(
                player.stats.SkyWars.skywars_experience || 0
            );
        }

        if (player.stats?.Pit?.profile?.prestiges) {
            player.stats.Pit.prestige =
                player.stats.Pit.profile.prestiges.length;
        }

        await redis.setex(
            `player:${query}`,
            PLAYER_CACHE_SECONDS,
            JSON.stringify(player)
        );

        return player;
    }
};