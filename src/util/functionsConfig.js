/**
 * ext.
 */
function fillObject(from, to) {

    for (var key in from) {
        if (from.hasOwnProperty(key)) {
            if (Object.prototype.toString.call(from[key]) === '[object Object]') {
                if (!to.hasOwnProperty(key)) {
                    to[key] = {};
                }
                fillObject(from[key], to[key]);
            }
            else if (to && !to.hasOwnProperty(key)) {
                to[key] = from[key];
            }
        }
    }
}


const mongoose = require("mongoose");
const defaultSettings = {
    ...require("../../default-settings.json"),
    prefix: '/'
}
const defaultServer = {
    config: new Map()
}
module.exports = {
    /**
     * 
     * @param {mongoose.Model} serverConf 
     */
    init(serverConf) {
        // Update only the changed fields so concurrent settings saves cannot restore old join history.
        function updateAutoRole(serverID, slot, fields) {
            const update = {};
            for (const [field, value] of Object.entries(fields)) {
                const operation = value === undefined ? '$unset' : '$set';
                if (!update[operation]) update[operation] = {};
                update[operation][`config.autoRole${slot === 0 ? '' : slot}.${field}`] = value === undefined ? 1 : value;
            }
            return serverConf.updateOne({ id: serverID }, update, { upsert: !!update.$set });
        }

        let settings = {

            /**
             * 
             * @param {*} serverID 
             * @returns {Promise<mongoose.Document>}
             */
            getConfig(serverID) {
                return new Promise(res => {
                    serverConf.findOne({ id: serverID }, (err, server) => {
                        if (err) console.warn("uh oh: " + err);

                        res(server || { doesNotExist: true, config: new Map });
                    })
                });
            },
            getConfigAsObject(serverID) {
                return new Promise(async res => {
                    let server = await settings.getConfig(serverID);
                    let config = server.config;

                    let configObj = {};
                    for (let [key, value] of config) {
                        configObj[key] = value;
                    }

                    fillObject(defaultSettings, configObj);
                    res(configObj);

                })
            },
            /**
             * 
             * @param {*} serverID 
             * @returns {Promise<defaultServer>}
             */
            async ensure(serverID) {
                let server = await settings.getConfig(serverID);
                if (server.doesNotExist) {
                    server = new serverConf({ id: serverID, config: {} });
                }
                return server
            },
            listAllDoc() {
                serverConf.find({}, (err, server) => {
                    if (err) console.error(err);
                    console.log(server)
                })
            },
            deleteServer(serverID) {
                return new Promise(res => {
                    serverConf.findOneAndDelete({ id: serverID }, (err, server) => {
                        if (err) console.error(err);
                        res(1);
                    })

                })
            },
            welcome: {
                async delete(serverID) {
                    let server = await settings.ensure(serverID);
                    server.config.delete('welcome');
                    return server.save();
                },
                async setChannel(serverID, channelID) {
                    let server = await settings.ensure(serverID);

                    server.config.set('welcome', { ...server.config.get('welcome'), channel: channelID });
                    await server.save()
                    return 1;
                },
                async setMessage(serverID, message) {
                    let server = await settings.ensure(serverID);

                    server.config.set('welcome', { ...server.config.get('welcome'), message: message });
                    await server.save()
                    return 1;

                }
            },
            rankRoles: {
                async delete(serverID) {
                    let server = await settings.ensure(serverID);
                    server.config.delete('rankRoles');
                    return server.save();
                },
                async setRank(serverID, rank, config) {
                    let server = await settings.ensure(serverID);
                    let rankRoles = JSON.parse(JSON.stringify(server.config.get('rankRoles') || {}));
                    rankRoles[rank] = { ...rankRoles[rank], ...config };
                    // console.log(rankRoles);
                    server.config.set('rankRoles', rankRoles)
                    return await server.save();
                },
                async deleteRank(serverID, rank) {
                    let server = await settings.ensure(serverID);
                    let rankRoles = JSON.parse(JSON.stringify(server.config.get('rankRoles') || {}));
                    delete rankRoles[rank];
                    console.log(rankRoles);
                    server.config.set('rankRoles', rankRoles)
                    return await server.save();
                }
            },
            verification: {
                async delete(serverID) {
                    let server = await settings.ensure(serverID);

                    server.config.delete('verification');
                    await server.save();
                    return 1;
                },
                async setChannel(serverID, channelID) {
                    let server = await settings.ensure(serverID);

                    server.config.set('verification', { ...server.config.get('verification'), channel: channelID });
                    await server.save()
                    return 1;
                },
                async setRole(serverID, roleID) {
                    let server = await settings.ensure(serverID);
                    server.config.set('verification', { ...server.config.get('verification'), role: roleID });
                    await server.save()
                    return 1;
                },
                async setUnverified(serverID, roleID) {
                    let server = await settings.ensure(serverID);
                    server.config.set('verification', { ...server.config.get('verification'), unverified: roleID });
                    await server.save()
                    return 1;
                },
                async setDeleteTimeout(serverID, seconds) {
                    let server = await settings.ensure(serverID);
                    server.config.set('verification', { ...server.config.get('verification'), deleteTimeout: seconds });
                    await server.save()
                    return 1;
                },
                async setAutoNick(serverID, option) {
                    let server = await settings.ensure(serverID);
                    server.config.set('verification', { ...server.config.get('verification'), autoNick: !!option });
                    await server.save();
                    return 1;
                },
                async setAutoNickExcludedRoles(serverID, roles) {
                    let server = await settings.ensure(serverID);
                    server.config.set('verification', { ...server.config.get('verification'), autoNickExcludedRoles: roles });
                    await server.save();
                    return 1;
                },
                async setAutoRoleExcludedRoles(serverID, roles) {
                    let server = await settings.ensure(serverID);
                    server.config.set('verification', { ...server.config.get('verification'), autoRoleExcludedRoles: roles });
                    await server.save();
                    return 1;
                }
            },
            requirements: {
                async delete(serverID) {
                    let server = await settings.ensure(serverID);

                    server.config.delete('requirements');
                    return await server.save();
                },
                async setRequirement(serverID, requirement, options) {
                    let server = await settings.ensure(serverID);
                    console.log(server.config)
                    server.config.set('requirements', {
                        ...server.config.get('requirements'), [requirement]:
                        {
                            min: options.min === null ? null : options.min ?? server.config.get('requirements')?.[requirement]?.min,
                            max: options.max === null ? null : options.max ?? server.config.get('requirements')?.[requirement]?.max,
                            role: options.role === null ? null : options.role ?? server.config.get('requirements')?.[requirement]?.role,
                        }
                    })
                    return await server.save();
                },
                async deleteRequirement(serverID, requirement) {
                    let server = await settings.ensure(serverID);
                    let reqs = JSON.parse(JSON.stringify(server.config.get('requirements') || {}));
                    delete reqs[requirement];
                    server.config.set('requirements', { ...reqs });

                    return await server.save();
                },


            },
            autoPost: {
                delete(serverID) {
                    return new Promise(async res => {
                        // get server object (without filling)
                        let server = await settings.getConfig(serverID);
                        // if it doesn't exist, add it to database
                        if (server.doesNotExist) {
                            server = new serverConf({ id: serverID, config: {} });
                        }
                        // delete autoPost from map
                        server.config.delete('autoPost');
                        // save to mongo
                        await server.save();
                        res(1);
                    })
                },
                async findByType(type) {
                    const servers = await serverConf.find({
                        $or: [
                            { 'config.autoPost.1.intervalType': { $in: type } },
                            { 'config.autoPost.2.intervalType': { $in: type } },
                            { 'config.autoPost.3.intervalType': { $in: type } }
                        ]
                    }).lean();
                    // console.log(servers)
                    return servers;
                },
                async deleteSlot(serverID, slot) {
                    let server = await settings.ensure(serverID);
                    let autoPost = JSON.parse(JSON.stringify(server.config.get('autoPost') || {}));
                    delete autoPost[slot];
                    // console.log({ ...autoPost })
                    server.config.set('autoPost', { ...autoPost });
                    return await server.save();
                },
                async setSlot(serverID, slot, config) {
                    let server = await settings.ensure(serverID);
                    server.config.set('autoPost', { ...server.config.get('autoPost'), [slot]: { ...(server.config.get('autoPost') ? server.config.get('autoPost')[slot] : {}), ...config } })
                    return await server.save();
                }
            },
            gxpRoles: {
                async delete(serverID) {
                    let server = await settings.ensure(serverID);
                    server.config.delete('gxpRoles');
                    return await server.save();
                },
                /**
                 * 
                 * @param {*} serverID 
                 * @param {Array<String>} config 
                 * @returns 
                 */
                async setConfig(serverID, config) {
                    let server = await settings.ensure(serverID);
                    server.config.set('gxpRoles', config);
                    return await server.save();
                }
            },
            timeRoles: {
                async delete(serverID) {
                    let server = await settings.getConfig(serverID);
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    server.config.delete('timeRoles');
                    return await server.save();

                },
                // time roles is an array :)
                async setConfig(serverID, config) {

                    let server = await settings.getConfig(serverID);
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    server.config.set('timeRoles', config);
                    return await server.save();
                }
            },
            autoRole: {
                async delete(serverID, slot) {

                    // get server object (without filling)
                    let server = await settings.getConfig(serverID);
                    // if it doesn't exist, add it to database
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    // delete autoRole from map
                    server.config.delete(`autoRole${slot === 0 ? '' : slot}`);
                    // save to mongo
                    return await server.save();


                },
                async findByGroup(group) {
                    return await serverConf.find({
                        $or: [
                            { 'config.autoRole.updateGroup': group },
                            {
                                'config.autoRole.updateGroup': null,
                                'config.autoRole1.updateGroup': group
                            },
                            {
                                'config.autoRole.updateGroup': null,
                                'config.autoRole1.updateGroup': null,
                                'config.autoRole2.updateGroup': group
                            }
                        ]
                    });
                },
                async assignGroup(serverID, slot = 0) {
                    // random 0-5
                    let group = Math.floor(Math.random() * 6);
                    return updateAutoRole(serverID, slot, { updateGroup: group });
                },
                async setLastUsers(serverID, slot, users = []) {
                    return updateAutoRole(serverID, slot, { lastUsers: users });
                },
                async setMemberRole(serverID, slot, roleID) {
                    return updateAutoRole(serverID, slot, { memberRole: roleID });
                },
                async setGuestRole(serverID, slot, roleID) {
                    return updateAutoRole(serverID, slot, { guestRole: roleID });
                },
                async setAutoRoleConfig(serverID, slot, config) {
                    return updateAutoRole(serverID, slot, { config });
                },
                async setGuild(serverID, slot, guild) {
                    console.log(`setting guild ${guild} for slot ${slot}`)
                    return updateAutoRole(serverID, slot, { guild });
                },
                async setGuildName(serverID, slot, guildName) {
                    return updateAutoRole(serverID, slot, { guildName });
                },
                async setLogChannel(serverID, slot, channelID) {
                    return updateAutoRole(serverID, slot, { logChannel: channelID });
                },
                async setCurrentSlot(serverID, slot) {
                    let server = await settings.ensure(serverID);
                    server.config.set('currentAutoRoleSlot', slot);
                    return server.save();
                },
                async deleteJoinLogs(serverID, slot) {
                    return updateAutoRole(serverID, slot, { joinLogs: {} });
                },
                async setJoinLogs(serverID, slot, joinLogs) {
                    return updateAutoRole(serverID, slot, Object.fromEntries(
                        Object.entries(joinLogs).map(([key, value]) => [`joinLogs.${key}`, value])
                    ));
                },
                async setMemberCountChannel(serverID, slot, channelID, format) {
                    return updateAutoRole(serverID, slot, { memberCountChannel: { channelID, format } });
                },
                async deleteMemberCountChannel(serverID, slot) {
                    return updateAutoRole(serverID, slot, { memberCountChannel: null });
                },
                async setLevelUpMessage(serverID, slot, channelID, message) {
                    return updateAutoRole(serverID, slot, { levelUpMessage: { channelID, message } });
                },
                async setLastLevel(serverID, slot, level) {
                    return updateAutoRole(serverID, slot, { lastLevel: level });
                },
                async deleteLevelUpMessage(serverID, slot) {
                    return updateAutoRole(serverID, slot, { levelUpMessage: null });
                }
            },
            joinLogs: {
                async delete(serverID) {
                    let server = await settings.ensure(serverID);
                    server.config.delete('joinLogs');
                    return server.save();
                },
                async setLastMembers(serverID, members, guildID) {
                    let server = await settings.ensure(serverID);
                    server.config.set('joinLogs', { ...server.config.get('joinLogs'), lastUpdate: Date.now(), lastMembers: members, lastGuild: guildID })
                    return server.save();
                },
                async set(serverID, channel) {
                    let server = await settings.ensure(serverID);
                    server.config.set('joinLogs', { ...server.config.get('joinLogs'), channel: channel });
                    return server.save();
                }
            },
            prefix: {
                async set(serverID, prefix) {
                    let server = await settings.ensure(serverID);

                    server.config.set('prefix', prefix);
                    return await server.save();

                },
                async get(serverID) {
                    let server = await settings.getConfig(serverID);
                    if (server && server.config.get('prefix')) {
                        let prefix = server.config.get('prefix');
                        return (prefix);
                    } else return (defaultSettings.prefix);

                },
                async reset(serverID) {
                    let server = await settings.getConfig(serverID);
                    if (server && server.config.get('prefix')) {
                        server.config.delete('prefix');
                        return await server.save();
                    } else return (defaultSettings.prefix);

                }
            },
            verifyMessage: {
                async set(serverID, messageID) {
                    let server = await settings.ensure(serverID);

                    server.config.set('verifyMessage', { ...server.config.get('verifyMessage'), messageID });
                    return await server.save();

                },
                async get(serverID) {
                    let server = await settings.getConfig(serverID);
                    if (server && server.config.get('verifyMessage')) {
                        let message = server.config.get('verifyMessage');
                        return (message);
                    } else return (defaultSettings.verifyMessage);

                },
                async reset(serverID) {
                    let server = await settings.getConfig(serverID);
                    if (server && server.config.get('verifyMessage')) {
                        server.config.delete('verifyMessage');
                        return await server.save();
                    } else return (defaultSettings.verifyMessage);

                }
            }
        }
        return settings
    }
}
