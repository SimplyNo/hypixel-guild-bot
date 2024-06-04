let genThumbnail = (uuid) => {
    return `https://crafatar.com/avatars/${uuid}?overlay&size=128`;
}
const { ifError } = require("assert");
const assert = require("assert");
const { GuildMember, Client, GuildAuditLogs } = require("discord.js");
const { MongoServerSelectionError } = require("mongodb");
const { isFunction } = require("util");
// const joinlogs = require("../../old_commands/config/joinlogs");
const MemberRoles = require("../setup/MemberRoles");


function deepEqual(a, b) {
    try {
        assert.deepStrictEqual(a, b);
    } catch (error) {
        if (error.name === "AssertionError") {
            return false;
        }
        throw error;
    }
    return true;
};
let currentGroup = 0;
let running = false;

module.exports = {
    /**
     * 
     * @param {Client} bot 
     * @param {*} server 
     * @param {*} data 
     * @returns 
     */
    async interval(bot, server, data) {
        const force = !!server;
        if (running && !force) return;
        // running = true;
        // wait 60 seconds if this is not a forced check
        let currentShardID = bot.shard?.ids[0] || -1;
        let totalShards = bot.shard?.count || -1;
        let shardInfo = `[SHARD ID: ${currentShardID}/${bot.shard?.count - 1}]`;
        let updateGroup = !server;
        let servers = server ? await bot.config.getConfig(server.id) : await bot.config.autoRole.findByGroup(currentGroup).then(s => s.filter((conf) => bot.guilds.cache.has(conf.id)));
        if (server) servers = [servers];
        if (server) {
            bot.log(`&5FORCE checking autorole on ${server.name}`)
        }
        else bot.slog(`&6--------------------------------------------\n${shardInfo} [AutoRole] &aBeginning AutoRole check on ${servers.length} guilds. Group: ${currentGroup}\n&a--------------------------------------------`);

        const verified = await bot.getAllUsers();
        let totalServers = servers.length - 1;

        // loop through servers in this update group
        for (let serverConf of servers) {
            const currentServer = servers.indexOf(serverConf);
            // make copy of server conf (so that we can compare them later)
            serverConf = JSON.parse(JSON.stringify(serverConf))

            // check if the guild is on this shard
            let onThisShard = bot.guilds.cache.get(serverConf.id);
            // if not, skip
            if (!onThisShard) {
                continue;
            }
            // console.log(serverConf.id);

            // fetch guild
            let server = await bot.guilds.fetch(serverConf.id).catch(e => {
                return 0;
            });

            // console.log(server.id, server.name);

            // delete server if not on shard, and not in cache
            if (!server) {
                bot.log(`&4Deleting the server (${serverConf.id})`);
                // await bot.config.deleteServer(serverConf.id);
                continue;
            }
            // console.log(verifiedUsers.map(el => el.id).length ? verifiedUsers.map(el => el.id) : [])
            // fetch the members from verified users
            // let members = await server.members.fetch({
            //     user: verifiedUsers.map(el => el.id).length ? verifiedUsers.map(el => el.id) : [],
            //     // force: true
            let members = await server.members.fetch().catch(e => {
                bot.log(`&4unknown member maybe??? amount of users: ${(verifiedUsers.map(el => el.id).length ? verifiedUsers.map(el => el.id) : []).length}`)
                console.log(e);
                return null;
            })
            if (!members) continue;
            // if (force) bot.log(`&6[AutoRole] &a${members.size} members fetched.`)
            bot.log(`&6[AutoRole] &a${members.size} members fetched.`)

            // get log channel and guest role cuz they arent changed by slots
            const logChannel = serverConf.config.autoRole?.logChannel ? await bot.channels.fetch(serverConf.config.autoRole.logChannel).catch(e => null) : null;
            const guestRole = serverConf.config.autoRole?.guestRole;
            // if ID exists, but channel couldnt be fetched, delete from db
            if (serverConf.config.autoRole?.logChannel && !logChannel) {
                await bot.config.autoRole.setLogChannel(server.id, 0, undefined)
            }

            for (let slot = 0; slot < 3; slot++) {
                // console.log(`slot: ${slot}`)
                let autoRole = serverConf.config[`autoRole${slot === 0 ? '' : slot}`];
                console.log(`Autorole: ${`autoRole${slot === 0 ? '' : slot}`}`)
                if (!autoRole?.guild) continue;
                let timeRoles = serverConf.config.timeRoles;
                let gxpRoles = serverConf.config.gxpRoles;
                let verification = serverConf.config.verification;
                let joinLogs = serverConf.config.joinLogs;

                // get guild api data of this server (or use data if given manually)
                let guildData = await bot.wrappers.hypixelGuild.get(autoRole.guild, "id");
                // let statsifyData = bot.wrappers.slothpixelGuild.get(autoRole.guild, "id");

                if (server) {
                    bot.log(`&6[AutoRole] &7(${currentServer}/${totalServers}) Retrieved guild data of &5${guildData?.name}!`)
                    if (guildData?.name) {
                        console.log(`setting guild name of slot ${slot}: ${guildData.name}`)
                        bot.config.autoRole.setGuildName(server.id, slot, guildData.name);
                    }
                }

                if (guildData?.outage || !guildData) {
                    bot.log(`OUTAGE: ${guildData?.outage}, ${autoRole.guild}`)
                    bot.log(`&6[AutoRole] &4Skipping because of API outage.`)
                    return;
                }
                if (guildData.exists == false) {
                    bot.log(`&4${autoRole.guild} does not exist.`)
                    // logChannel && bot.createEmbed().setTitle("⚠️ No guild found").setDescription("The previous guild linked to this server no longer exists, and has been deleted from the database.").send(logChannel)
                    // await bot.config.autoRole.delete(serverConf.id)
                    continue;
                }

                // if this check is an automatic check, do normal sorting of ranks
                if (!data) {
                    /**
                     * @todo make it so that bot makes sure ranks are sort by priority each time
                     *
                    **/

                    let ranks = guildData.ranks ? guildData.ranks.sort((a, b) => b.priority - a.priority) : [];

                    let guildConfig = autoRole.config ? JSON.parse(JSON.stringify(autoRole.config)) : {};
                    ranks.forEach((rank, i) => {
                        if (!guildConfig[rank.created]) {
                            guildConfig[rank.created] = {
                                name: rank.name,
                                tag: rank.tag,
                                pos: Object.entries(guildConfig).length + 1,
                            }
                        } else {
                            guildConfig[rank.created].name = rank.name;
                            guildConfig[rank.created].tag = rank.tag;
                        }
                    })
                    // Check for removed ranks
                    Object.entries(guildConfig).forEach((rank, i) => {
                        if (!ranks.reduce((prev, current) => [...prev, current.created], []).includes(parseInt(rank[0]))) {
                            delete guildConfig[rank[0]]
                        }
                    })
                    if (!deepEqual(guildConfig, autoRole.config)) {
                        await bot.config.autoRole.setAutoRoleConfig(serverConf.id, slot, guildConfig);
                    }
                }
                // bot.log(`&6[AutoRole] &e(${currentServer}/${totalServers}) &fBeginning check on &6${server.name}`);

                // get the verified GUILD MEMBERS of this server
                let verifiedUsers = verified.filter(verifiedUser => guildData.members.some(user => user.uuid == verifiedUser.uuid));
                if (force) bot.log(`&6[AutoRole] &aAttempting to fetch ${verifiedUsers.length} members...`);
                if (force) console.log(JSON.stringify(verifiedUsers.map(u => u.id)))


                // loop through guild members, update each member
                updateGuildMembers();
                // ---- MAIN AUTOROLE LOOP THROUGH GUILD MEMBERS ----
                async function updateGuildMembers() {
                    for (let index = 0; index < guildData.members.length; index++) {
                        const user = guildData.members[index];
                        // bot.log(`&6[AutoRole] guild members loop: ${user.uuid}`)
                        // check if guild member is verified
                        // if (force) bot.log(`check - ${user.uuid}`);
                        let verifiedUser = verified.find((User) => User.uuid == user.uuid)

                        if (verifiedUser) {
                            if (force) bot.log(`${user.uuid} is verified (${verifiedUser.id})! (${index}/${guildData.members.length})`);

                            let rankName = user.rank;

                            // get rank ID (rank creation date)
                            let rankID = !guildData.ranks ? null : guildData.ranks.find(Rank => Rank.name == rankName) ? guildData.ranks.find(Rank => Rank.name == rankName).created : null;
                            // rank not in ranks list e.g. guild master rank
                            if (!rankID && !["Guild Master", "GUILDMASTER"].includes(rankName)) return console.log(`Rank not in ranks list??? + [${rankName}]`);

                            // console.log(rankID, autoRole.config)

                            // somehow this rank is not in the autorole rank config, which is weird cuz above code should have updated ranks...
                            if (rankID && !autoRole?.config[rankID]) return bot.log(`this rank isn't in the autorole config? ${rankID}`)
                            // get the rank role linked to the guild rank
                            let rankRole = rankID ? autoRole.config[rankID].role : null;
                            // get the member role linked to the guild
                            let memberRole = autoRole.memberRole;
                            // get the rank position (todo: remove editable rank position)
                            let rankPos = rankID ? autoRole.config[rankID].pos : null;
                            // the rank does not have a position value...?
                            if (!rankPos && rankID) return bot.log(`${user.uuid} rank does not have a position value??? ${rankID}`);

                            /**
                             * get member object from when earlier fetched members
                             * @type {GuildMember}
                            */
                            let member = members.get(verifiedUser.id);
                            if (!member) {
                                force ? bot.log(`&6[AutoRole] ${verifiedUser.id} (${verifiedUser.uuid}) not in server?!`) : undefined;
                                continue;
                            }
                            // console.log(`verfication:`, serverConf.config.verification?.autoRoleExcludedRoles)
                            // let memberRoles = new Set([...member.roles.cache.keys()]);
                            const excludedRole = member.roles.cache.has(serverConf.config.verification?.autoRoleExcludedRoles?.[0]);
                            let memberRoles = new MemberRoles([...member.roles.cache.keys()])

                            // Default Member role
                            // bot.log(`&6[AutoRole] OK we've made it this far, gonna try and see if they have a member role`)
                            if (memberRole) {
                                let memberRoleObj = await member.guild.roles.fetch(memberRole);
                                if (!memberRoleObj) await bot.config.autoRole.setMemberRole(server.id, slot, undefined);
                                memberRoles.addRole(memberRole, `Member role`);
                            }
                            // remove guest role
                            if (guestRole) {
                                let guestRoleObj = await member.guild.roles.fetch(guestRole);
                                if (!guestRoleObj) await bot.config.autoRole.setGuestRole(server.id, slot, undefined);

                                memberRoles.removeRole(guestRole, `Guest role`);
                            }
                            // console.log(...member.roles.cache.keys())
                            // Time role
                            let time = parseInt(user.joined);
                            if (time && timeRoles) {
                                let days = Math.floor((Date.now() - time) / 1000 / 60 / 60 / 24);
                                timeRoles = timeRoles.sort((a, b) => a.days - b.days);
                                timeRoles.forEach((tr, index) => {
                                    let ahead = timeRoles[index + 1] || { days: 99999 };
                                    if ((days >= tr.days && days <= ahead.days) || (days >= tr.days && tr.pinned)) {
                                        memberRoles.addRole(tr.role, `For staying in the guild for more than **${tr.days} days** (${days})`);

                                        // bot.log(`&6[AutoRole] &e(${currentServer}/${totalServers})&f Adding &5TIME ROLES&f to ${member.user.tag} for staying in the guild for &5${tr.days} days&f.`)
                                    } else {
                                        memberRoles.removeRole(tr.role, `Has not been in the guild for **${tr.days} days** (${days})`);

                                        // bot.log(`&6[AutoRole] &e(${currentServer}/${totalServers})&f Removing &5TIME ROLES&f to ${member.user.tag} for staying in the guild for &5${days} days&f.`)


                                    }
                                })
                            }
                            // gxp role
                            if (gxpRoles) {
                                let memberGXP = user.weekly;
                                gxpRoles = gxpRoles.sort((a, b) => a.gxp - b.gxp);
                                gxpRoles.forEach((gxprole, index) => {
                                    let ahead = gxpRoles[index + 1] || { gxp: 1000000000 };
                                    if ((memberGXP >= gxprole.gxp && memberGXP <= ahead.gxp) || (memberGXP >= gxprole.gxp && gxprole.pinned)) {
                                        memberRoles.addRole(gxprole.role, `For having more than **${gxprole.gxp.toLocaleString()} GEXP**! (${memberGXP.toLocaleString()})`);
                                        // bot.log(`&6[AutoRole] &e(${currentServer}/${totalServers})&f Adding &2GEXP ROLES&f to ${member.user.tag} for having &2${gxprole.gxp} GXP&f. (&2${memberGXP}&f)`)


                                    } else {
                                        memberRoles.removeRole(gxprole.role, `For not having **${gxprole.gxp.toLocaleString()}** GEXP`);
                                        // bot.log(`&6[AutoRole] &e(${currentServer}/${totalServers})&f Removing &2GEXP ROLES&f from ${member.user.tag} for not having &2${gxprole.gxp} GXP&f. (&2${memberGXP}&f)`)


                                    }
                                })
                            }


                            // rank roles
                            if (rankRole) {
                                // console.log(`[+] ADDING RANK ROLE FOR HAVING: ${rankName}`)
                                memberRoles.addRole(rankRole, `For having rank **${rankName}**`);
                            }
                            // handle pinned roles, remove roles etc
                            Object.entries(autoRole.config).forEach((ROLE) => {
                                if (ROLE[1].pos >= rankPos && ROLE[1].pinned && ROLE[1].role) {
                                    //console.log(`Added Role: ${member.guild.roles.cache.get(ROLE[1].role).name} (Pinned!)`)
                                    memberRoles.addRole(ROLE[1].role, `Persistant rank.`)
                                }

                                if (ROLE[1].pos > rankPos && member.roles.cache.has(ROLE[1].role) && !ROLE[1].pinned) {
                                    // console.log(`[-] REMOVING RANK ROLE NOT HAVING: ${ROLE[1].name} (position is higher)`)

                                    //console.log(`Removed Role: ${member.guild.roles.cache.get(ROLE[1].role).name} (Already had!)`)
                                    memberRoles.removeRole(ROLE[1].role, `For not having rank **${ROLE[1].name}**`);
                                }
                                if (member.roles.cache.has(ROLE[1].role) && member.roles.cache.has(ROLE[1].role) && ROLE[1].pos < rankPos) {
                                    // console.log(`[-] REMOVING RANK ROLE FOR NOT HAVING: ${ROLE[1].name} (position is lower)`)

                                    //rolesToRemove.push(ROLE[1].role);
                                    //console.log(`Removed Role: ${member.guild.roles.cache.get(ROLE[1].role).name} (Demoted!)`)
                                    memberRoles.removeRole(ROLE[1].role, `For not having rank **${ROLE[1].name}**`);
                                }
                            })

                            let str = `${member.toString()} received the following role changes:\n\n`;

                            if (force) bot.log(`trying to set the roles of ${member.user.tag} (${member.id}). ${index}/${guildData.members.length}`, memberRoles.rolesToAdd, memberRoles.rolesToRemove);

                            try {
                                // if (force) bot.log(user.uuid, member.user.tag, memberRoles.rolesToAdd, memberRoles.rolesToRemove);
                                if (memberRoles.rolesToAdd.length || memberRoles.rolesToRemove.length) {

                                    console.log(`setting roles of ${member.user.tag}`)
                                    if (excludedRole) {
                                        bot.log(`&6[AutoRole] autorole excluded role detected... skipping`)
                                    } else {
                                        await member.roles.set(memberRoles.array());
                                    }
                                }
                            } catch (e) {
                                if (force) bot.log(`couldnt set roles of ${user.uuid}, ${member.user.tag}`, memberRoles.rolesToAdd, memberRoles.rolesToRemove, e);
                                let roles = [...memberRoles.rolesToAdd.map(r => r.id), ...memberRoles.rolesToRemove.map(r => r.id)];
                                let rolesHigher = roles.filter(r => member.guild.me.roles.highest.comparePositionTo(r) <= 0);
                                if (rolesHigher.length) {
                                    if (logChannel) {
                                        bot.log(`${shardInfo} &4Error whilst trying to do autorole: Invalid role hierarchy`);
                                        return bot.createErrorEmbed().setTitle("Invalid Permissions!").setDescription(`**Uh oh, looks like I do not have permissions to add/remove the following roles:**\n\n• <@&${rolesHigher.join('>\n<@&')}>\n\nTo fix this, please either set my role to be higher than those roles, or give a role that is already higher.`).send(logChannel)
                                    }
                                } else {
                                    console.log(e)
                                    return;
                                }
                            }
                            if (memberRoles.rolesToAdd.length) {
                                if (server.id == '877855420599894147') {
                                    bot.log(`ADD - ${member.user.tag} - ${memberRoles.rolesToAdd.join(', ')}`)
                                }
                                //await member.roles.add(rolesToAdd, "(Auto Role)");
                                str += "**Roles Added:**\n";
                                console.log(memberRoles.rolesToAdd)
                                memberRoles.rolesToAdd.forEach((role) => str += `\`+\` <@&${role.id}> - ${role.reason}\n`);
                            }
                            if (memberRoles.rolesToRemove.length) {
                                if (server.id == '877855420599894147') {
                                    console.log(`REMOVE - ${member.user.tag} - ${memberRoles.rolesToRemove.join(', ')}`)
                                    console.log(`TOTAL: ${memberRoles.array()}`)
                                }

                                //await member.roles.remove(rolesToRemove, "(Auto Role)");
                                str += "**Roles Removed:**\n";

                                memberRoles.rolesToRemove.forEach((role) => str += `\`-\` <@&${role.id}> - ${role.reason}\n`);
                            }

                            if (logChannel && !excludedRole && (memberRoles.rolesToRemove.length || memberRoles.rolesToAdd.length)) {
                                // bot.log(`&6[AutoRole] Guild Member New Roles: Added roles to ${member.user.tag}. &aRoles added: ${rolesToAdd.length} Roles removed: ${rolesToRemove.length}`);
                                // console.log("SENDING MESSAGE")
                                bot.createEmbed()
                                    .setAuthor(`Auto Role → Role Changes`, member.user.avatarURL())
                                    .setDescription(str)
                                    .setTimestamp()
                                    .setThumbnail(genThumbnail(verifiedUser.uuid))
                                    .send(logChannel).catch(e => bot.log(`&6${shardInfo}[AutoRole]&e (${currentServer}/${totalServers}) &4Could not send message in log channel channel name: ${logChannel.name}`))
                            }


                        }
                    }
                    /**
                     * keeps copy of verified users in the guild
                     * 
                     * every check: if verified users are missing, remove roles for them.
                     */
                }
                // last verified users in guild check (checking for people who left guild)
                if (autoRole.lastUsers) {
                    // console.log('----------------- DEBUG MARKER -------------------\nthey have last users\n---------------------------')

                    // get people who left guild OR unverified
                    let difference = autoRole.lastUsers.filter((user) => !verifiedUsers.some(currentuser => currentuser.uuid == user.uuid));
                    // console.log(difference)
                    difference.forEach(async user => {
                        let isVerified = await bot.getUser({ id: user.id });
                        // console.log('----------------- DEBUG MARKER -------------------\ntryna fetch some members\n---------------------------')
                        // fetch member who left/unverified
                        const member = await server.members.fetch(user.id).catch(e => false)
                        // console.log('----------------- DEBUG MARKER -------------------\nmembers fetched POG.\n---------------------------')
                        // if member left the server
                        if (!member) return;


                        let allGuildRoles = Object.entries(autoRole.config).filter(el => el[1].role);

                        // let memberRoles = new Set([...member.roles.cache.keys()]);
                        let memberRoles = new MemberRoles([...member.roles.cache.keys()]);

                        let str = `${member.toString()} received the following role changes:\n\n`;
                        // rmove member role
                        if (autoRole.memberRole) {
                            memberRoles.removeRole(autoRole.memberRole, `Member role`);
                        }
                        console.log(`allGuildRoles: ${allGuildRoles}`)
                        // remove guild rank roles
                        allGuildRoles.forEach(([roleID, role]) => {
                            memberRoles.removeRole(role.role, `**${role.name}** rank role`);

                        })
                        // add guest role 
                        if (autoRole.guestRole) {
                            memberRoles.addRole(autoRole.guestRole, `Guest Role`);

                        }
                        // remove time role
                        if (timeRoles) {
                            timeRoles.forEach(e => {
                                memberRoles.removeRole(e.role, `Time roles`);

                            })
                        }
                        // remove gxp role
                        if (gxpRoles) {
                            gxpRoles.forEach(e => {
                                memberRoles.removeRole(e.role, `GEXP roles`);

                            })
                        }
                        // remove verify role
                        if (verification && verification.role && !isVerified) {
                            memberRoles.removeRole(verification.role, `Verified Role`);
                        }
                        // add unverified role
                        if (verification && verification.unverified && !isVerified) {
                            memberRoles.addRole(verification.unverified, `Unverified Role`);
                        }
                        memberRoles.rolesToRemove.length && bot.log(`&6${shardInfo} [AutoRole] &fremoving ${memberRoles.rolesToRemove.length} roles from ${member.user.tag}`);
                        try {
                            if (member.roles.cache.has(verification?.autoRoleExcludedRoles?.[0])) {
                                bot.log(`&6[AutoRole] autorole excluded role detected... skipping (left)`)
                            } else {
                                await member.roles.set(memberRoles.array());
                            }
                        } catch (e) {
                            let roles = [...memberRoles.rolesToAdd.map(r => r.id), ...memberRoles.rolesToRemove.map(r => r.id)];
                            let rolesHigher = roles.filter(r => member.guild.me.roles.highest.comparePositionTo(r) <= 0);
                            if (rolesHigher.length) {
                                if (logChannel) {
                                    bot.log(`${shardInfo} & 4Error whilst trying to do autorole: Invalid role hierarchy`);
                                    return bot.createErrorEmbed().setTitle("Invalid Permissions!").setDescription(`** Uh oh, looks like I do not have permissions to add / remove the following roles:**\n\n• < @& ${rolesHigher.join('>\n<@&')}>\n\nTo fix this, please either set my role to be higher than those roles, or give a role that is already higher.`).send(logChannel)
                                }
                            } else {
                                console.log(`error whilst adding roles: ` + e)
                                return;
                            }
                        }
                        console.log(memberRoles.rolesToAdd)
                        memberRoles.rolesToRemove.length && (str += "**Roles Removed:**\n", memberRoles.rolesToRemove.forEach((role) => str += `\`-\` <@&${role.id}> - ${role.reason}\n`));;
                        memberRoles.rolesToAdd.length && (str += "**Roles Added:**\n", memberRoles.rolesToAdd.forEach((role) => str += `\`+\` <@&${role.id}> - ${role.reason}\n`));

                        if (logChannel && !excludedRole && (memberRoles.rolesToRemove.length || memberRoles.rolesToAdd.length)) {
                            bot.log(`&6${shardInfo} [AutoRole] &cGuild Member Left/Unverified&6 Added roles to ${member.user.tag}. &aRoles added: ${memberRoles.rolesToAdd.length} Roles removed: ${memberRoles.rolesToRemove.length}`);

                            bot.createEmbed()
                                .setAuthor(`Auto Role → Role Changes (Member Left/Unverified)`, member.user.avatarURL())
                                .setDescription(str)
                                .setTimestamp()
                                .setThumbnail(genThumbnail(user.uuid))
                                .send(logChannel)
                        }

                    })
                }
                // update users in db
                await bot.config.autoRole.setLastUsers(server.id, slot, verifiedUsers);
                // console.log(joinLogs)
                // join logs
                if (joinLogs && joinLogs.channel) {
                    let joinLogsChannel = await bot.channels.fetch(joinLogs.channel).catch(e => null);
                    let lastMembers = joinLogs.lastMembers;
                    let lastUpdate = joinLogs.lastUpdate || 0;
                    let lastGuild = joinLogs.lastGuild;
                    // bot.log(`&e(${currentServer}/${totalServers}) Join logs check starting...`)
                    if (joinLogsChannel && lastMembers && (((Date.now() - lastUpdate) / 1000 / 60) < 30) && lastGuild == guildData._id) {
                        // console.log("Checking join logs.")

                        let joined = guildData.members.sort((a, b) => parseInt(a.joined) - parseInt(b.joined)).filter(m => !lastMembers.includes(m.uuid)).map(e => e.uuid);
                        let left = lastMembers.filter(m => !guildData.members.find(e => e.uuid == m));

                        let changed = [...joined.map(m => ({ uuid: m, join: true })), ...left.map(m => ({ uuid: m, left: true }))].sort((a, b) => parseInt(a.joined) - parseInt(b.joined))

                        if (joined.length || left.length) {
                            console.log(joined, left)

                        }
                        let totalMembers = lastMembers.length;
                        for (m of changed) {
                            // let i = left.indexOf(m);
                            let playerData = await bot.wrappers.hypixelPlayer.get(m.uuid);
                            // let memberNum = lastMembers.length - i - 1;
                            if (m.left) {

                                totalMembers--;
                                console.log(`&e(${currentServer}/${totalServers}) Leave Detected: ${m}`)
                                await bot.createEmbed()
                                    .setTitle(`${guildData.name} → Member Left!`)
                                    .setDescription(`${playerData.emojiRank} **${playerData.displayname}** left (or was kicked) from the guild!`)
                                    .setFooter(`New Member Count - ${totalMembers}`)
                                    .setThumbnail(bot.skin(m.uuid))
                                    .setColor('FF0000')
                                    .send(joinLogsChannel)
                                    .catch(e => bot.log(`&4Couldn't send join logs LEAVE message!`))

                            } else {
                                // let i = joined.indexOf(m);
                                // console.log(m)
                                let playerData = await bot.wrappers.hypixelPlayer.get(m.uuid);
                                // let memberNum = lastMembers.length - left.length + i + 1;
                                totalMembers++;
                                bot.log(`&e(${currentServer}/${totalServers}) Join Detected: ${m}`)
                                await bot.createEmbed()
                                    .setTitle(`${guildData.name} → New Member!`)
                                    .setDescription(`${playerData.emojiRank} **${playerData.displayname}** joined the guild!`)
                                    .setFooter(`New Member Count - ${totalMembers}`)
                                    .setThumbnail(bot.skin(m.uuid))
                                    .setColor('00FF00')
                                    .send(joinLogsChannel)
                                    .catch(e => bot.log(`&4Couldn't send join logs JOIN message!`))

                            }
                        }

                    }
                    await bot.config.joinLogs.setLastMembers(server.id, slot, guildData.members.map(e => e.uuid), guildData._id);
                }
                // currentServer++;
            }
        }
        if (updateGroup) {
            running = false;
            currentGroup++;
            if (currentGroup > 5) currentGroup = 0;
        }
    },
    async beginInterval(bot) {
        bot.log(`&6[SHARD ${bot.shard?.ids[0] || -1}] [AutoRole] Began AutoRole interval.`)
        while (true) {
            this.interval(bot).catch(e => console.error(`-------------AutoRole ERROR------------\n`, e, `\n-------------------------------`))
            await new Promise(r => setTimeout(r, 5 * 60 * 1000))
        }
    }
}
