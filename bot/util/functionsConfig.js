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
                async delete(serverID) {

                    // get server object (without filling)
                    let server = await settings.getConfig(serverID);
                    // if it doesn't exist, add it to database
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    // delete autoRole from map
                    server.config.delete('autoRole');
                    // save to mongo
                    return await server.save();


                },
                findByGroup(group) {
                    return new Promise(async res => {
                        serverConf.find({ 'config.autoRole.updateGroup': group }, (err, servers) => {
                            res(servers)
                        })
                    })
                },
                async assignGroup(serverID) {
                    // random 0-5
                    let group = Math.floor(Math.random() * 6);
                    let server = await settings.getConfig(serverID);
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    server.config.set('autoRole', { ...server.config.get('autoRole'), updateGroup: group });
                    return await server.save();
                },
                async setLastUsers(serverID, users = []) {
                    let server = await settings.getConfig(serverID);
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    server.config.set('autoRole', { ...server.config.get('autoRole'), lastUsers: users })
                    return await server.save();
                },
                async setMemberRole(serverID, roleID) {
                    let server = await settings.getConfig(serverID);
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    server.config.set('autoRole', { ...server.config.get('autoRole'), memberRole: roleID });
                    return await server.save();

                },
                async setGuestRole(serverID, roleID) {
                    let server = await settings.ensure(serverID);
                    server.config.set('autoRole', { ...server.config.get('autoRole'), guestRole: roleID })
                    return await server.save();
                },
                async setAutoRoleConfig(serverID, config) {

                    let server = await settings.getConfig(serverID);
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    server.config.set('autoRole', { ...server.config.get('autoRole'), config: config });
                    return await server.save();
                },
                async setGuild(serverID, guild) {

                    let server = await settings.getConfig(serverID);
                    if (server.doesNotExist) {
                        server = new serverConf({ id: serverID, config: {} });
                    }
                    server.config.set('autoRole', { ...server.config.get('autoRole'), guild: guild });
                    return await server.save();


                },
                async setLogChannel(serverID, channelID) {
                    let server = await settings.ensure(serverID);

                    server.config.set('autoRole', { ...server.config.get('autoRole'), logChannel: channelID });
                    return server.save();


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
            }
        }
        return settings
    }
}
