// Offline regression tests: node test/autorole.js
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const mongoose = require('mongoose');
const configHelpers = require('../src/util/functionsConfig');

const sourcePath = path.resolve(__dirname, '../src/util/intervals/autorole.js');
const clone = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

function loadInterval() {
    const context = {
        module: { exports: {} }, require: createRequire(sourcePath), setTimeout,
        console: { log() {}, error() {} },
    };
    vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
    return context.module.exports;
}

function fixture({ id = 'server', count = 1, lookup, send } = {}) {
    const old = Array.from({ length: 114 }, (_, i) => ({ uuid: `existing-${i}`, joined: i }));
    const arrivals = Array.from({ length: count }, (_, i) => ({ uuid: `${id}-new-${i}`, joined: 1000 + i }));
    const guildData = { _id: id, name: id, ranks: [], members: [...old, ...arrivals] };
    const state = { id, config: { autoRole: {
        guild: id, config: {}, lastUsers: [], updateGroup: 0,
        joinLogs: { channel: 'members', lastGuild: id, lastMembers: old.map(m => m.uuid) },
    } } };
    const server = { id, name: id, members: { fetch: async () => new Map() } };
    const sent = [];
    const lookups = [];
    const bot = {
        log() {}, slog() {}, getAllUsers: async () => [],
        guilds: { cache: new Map([[id, server]]), fetch: async () => server },
        channels: { fetch: async () => ({ id: 'members' }) },
        config: {
            getConfig: async () => clone(state),
            autoRole: {
                findByGroup: async () => [clone(state)],
                setGuildName: async () => {},
                setLastUsers: async () => {},
                setJoinLogs: async (serverID, slot, update) => {
                    Object.assign(state.config.autoRole.joinLogs, clone(update));
                },
            },
        },
        wrappers: {
            hypixelGuild: { get: async () => clone(guildData) },
            hypixelPlayer: { get: async uuid => {
                lookups.push(uuid);
                return lookup ? lookup(uuid) : { emojiRank: '[MVP+]', displayname: uuid };
            } },
        },
        skin: uuid => uuid,
        createEmbed() {
            const embed = {};
            for (const prop of ['Title', 'Description', 'Footer', 'Thumbnail', 'Color']) {
                embed[`set${prop}`] = function(value) { this[prop.toLowerCase()] = value; return this; };
            }
            embed.send = async () => {
                sent.push(clone(embed));
                if (send) await send(embed);
            };
            return embed;
        },
    };
    return { bot, server, sent, state, guildData, lookups };
}

async function sequentialChecks() {
    const interval = loadInterval();
    const f = fixture();
    await interval.interval(f.bot, f.server);
    await interval.interval(f.bot, f.server);
    assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].footer, 'New Member Count - 115');
    assert.equal(f.lookups.length, 1);
}

async function overlappingChecks() {
    for (const modes of [[false, false], [false, true], [true, true]]) {
        const interval = loadInterval();
        const sending = deferred();
        const release = deferred();
        const f = fixture({ send: async () => { sending.resolve(); await release.promise; } });
        const first = interval.interval(f.bot, modes[0] ? f.server : undefined);
        await sending.promise;
        const second = interval.interval(f.bot, modes[1] ? f.server : undefined);
        await tick();
        assert.equal(f.sent.length, 1, 'a concurrent check must wait for the first check');
        release.resolve();
        await Promise.all([first, second]);
        assert.equal(f.sent.length, 1, 'the queued check must read the updated membership history');
    }
}

async function queuedCheckSurvivesFailure() {
    const interval = loadInterval();
    const started = deferred();
    const release = deferred();
    const f = fixture();
    const getGuild = f.bot.wrappers.hypixelGuild.get;
    let calls = 0;
    f.bot.wrappers.hypixelGuild.get = async () => {
        if (++calls === 1) {
            started.resolve();
            await release.promise;
            throw new Error('temporary guild API failure');
        }
        return getGuild();
    };
    const failed = assert.rejects(interval.interval(f.bot, f.server), /temporary guild API failure/);
    await started.promise;
    const queued = interval.interval(f.bot, f.server);
    await tick();
    release.resolve();
    await Promise.all([failed, queued]);
    await interval.interval(f.bot, f.server);
    assert.equal(f.sent.length, 1);
}

async function independentServers() {
    const interval = loadInterval();
    const started = deferred();
    const release = deferred();
    const first = fixture({ id: 'first', lookup: async uuid => {
        started.resolve();
        await release.promise;
        return { emojiRank: '[MVP+]', displayname: uuid };
    } });
    const second = fixture({ id: 'second' });
    const pending = interval.interval(first.bot, first.server);
    await started.promise;
    await interval.interval(second.bot, second.server);
    assert.equal(second.sent.length, 1, 'another server should not be blocked');
    release.resolve();
    await pending;
    assert(first.sent[0].description.includes('first-new-0'));
    assert.equal(first.sent[0].thumbnail, 'first-new-0', 'concurrent servers must not share the loop variable');
}

async function outageRetriesSameGroup() {
    const interval = loadInterval();
    const f = fixture();
    const groups = [];
    f.bot.config.autoRole.findByGroup = async group => { groups.push(group); return [clone(f.state)]; };
    const getGuild = f.bot.wrappers.hypixelGuild.get;
    f.bot.wrappers.hypixelGuild.get = async () => ({ outage: true });
    await interval.interval(f.bot);
    f.bot.wrappers.hypixelGuild.get = getGuild;
    await interval.interval(f.bot);
    await interval.interval(f.bot);
    assert.deepEqual(groups, [0, 0, 1]);
    assert.equal(f.sent.length, 1);
}

async function failedPlayerLookups() {
    for (const failure of [null, { outage: true }, new Error('timeout')]) {
        const interval = loadInterval();
        const f = fixture({ count: 2, lookup: async uuid => {
            if (uuid === 'server-new-0') return { emojiRank: '[MVP+]', displayname: uuid };
            if (failure instanceof Error) throw failure;
            return failure;
        } });
        // Include a leave after the joins so a failed lookup must not replay either kind of event.
        f.guildData.members.shift();
        for (let i = 0; i < 3; i++) await interval.interval(f.bot, f.server);
        assert.equal(f.sent.length, 3);
        assert(f.sent[1].description.includes('server-new-1'));
        assert(f.sent[2].description.includes('existing-0'));
        assert.deepEqual(f.sent.map(m => m.footer), [
            'New Member Count - 115', 'New Member Count - 116', 'New Member Count - 115',
        ]);
        assert.equal(f.state.config.autoRole.joinLogs.lastMembers.length, 115);
        assert.equal(f.lookups.length, 3);
    }
}

async function initializationAndRejoin() {
    const interval = loadInterval();
    const f = fixture();
    delete f.state.config.autoRole.joinLogs.lastMembers;
    await interval.interval(f.bot, f.server);
    assert.equal(f.sent.length, 0, 'initial setup must not announce existing members');
    const member = f.guildData.members.pop();
    await interval.interval(f.bot, f.server);
    f.guildData.members.push(member);
    await interval.interval(f.bot, f.server);
    assert.equal(f.sent.length, 2, 'a genuine leave and rejoin must still be announced');
    assert(f.sent[0].title.includes('Member Left'));
    assert(f.sent[1].title.includes('New Member'));
}

async function concurrentSettingsWrites() {
    // Use real Mongoose casting and change tracking with an in-memory database transport.
    const Model = mongoose.model('AutoRoleRegression', new mongoose.Schema({ id: String, config: Map }));
    const stored = { _id: new mongoose.Types.ObjectId(), id: 'server', config: {} };
    Model.findOne = (query, callback) => callback(null, Model.hydrate(clone(stored)));
    let pendingWrites;
    Model.collection.updateOne = (filter, update, options, callback) => {
        const persist = () => {
            for (const operator of ['$set', '$unset']) {
                for (const [field, value] of Object.entries(update[operator] || {})) {
                    const keys = field.split('.');
                    let target = stored;
                    for (const key of keys.slice(0, -1)) target = target[key] || (target[key] = {});
                    if (operator === '$unset') delete target[keys[keys.length - 1]];
                    else target[keys[keys.length - 1]] = clone(value);
                }
            }
            callback(null, { acknowledged: true, matchedCount: 1, modifiedCount: 1 });
        };
        if (pendingWrites) pendingWrites.push(persist);
        else persist();
    };
    const config = configHelpers.init(Model).autoRole;
    for (const slot of [0, 1, 2]) {
        const slotKey = `autoRole${slot === 0 ? '' : slot}`;
        await config.setJoinLogs('server', slot, { channel: 'members', lastMembers: ['old'] });
        pendingWrites = [];
        const staleWrites = [
            config.setGuildName('server', slot, 'Spawnblock'),
            config.setMemberRole('server', slot, 'role'),
            config.setLastUsers('server', slot, []),
            config.setJoinLogs('server', slot, { channel: 'new-channel' }),
        ];
        await tick();
        assert.equal(pendingWrites.length, staleWrites.length);
        const delayed = pendingWrites;
        pendingWrites = null;
        await config.setJoinLogs('server', slot, { lastMembers: ['old', 'new'], lastGuild: 'guild' });
        delayed.forEach(persist => persist());
        await Promise.all(staleWrites);
        assert.deepEqual(stored.config[slotKey].joinLogs, {
            channel: 'new-channel', lastMembers: ['old', 'new'], lastGuild: 'guild',
        });
        assert.equal(stored.config[slotKey].guildName, 'Spawnblock');
        await config.setMemberRole('server', slot, undefined);
        assert.equal(stored.config[slotKey].memberRole, undefined);
        assert.deepEqual(stored.config[slotKey].joinLogs.lastMembers, ['old', 'new']);
    }
    mongoose.deleteModel('AutoRoleRegression');
}

async function main() {
    for (const test of [sequentialChecks, overlappingChecks, queuedCheckSurvivesFailure,
        independentServers, outageRetriesSameGroup, failedPlayerLookups, initializationAndRejoin, concurrentSettingsWrites]) {
        await test();
        console.log(`PASS ${test.name}`);
    }
}

const watchdog = setTimeout(() => { console.error('Tests timed out'); process.exit(1); }, 10000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
