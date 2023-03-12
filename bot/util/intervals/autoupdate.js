const { Collection, Message } = require("discord.js");
const MemberRoles = require("../setup/MemberRoles");
/**
 * @TODO make it so that adding guest role will send a log message to auto role log channel!
 */
module.exports = {
    /**
     * @param {{autoUpdateCache: Set}} bot 
     */
    async execute(member, serverConf, bot, force) {
        const verificationConf = serverConf.verification;
        const { autoNick, autoNickExcludedRoles, role, unverified } = verificationConf;
        const doRankCheck = Object.values(serverConf.rankRoles).some(e => e.id);
        const requirements = Object.entries(serverConf.requirements).filter(e => [e[1].role, e[1].min, e[1].max].some(el => el !== null));
        const autoRole = serverConf.autoRole;

        // const doReqCheck = requirements.length;


        // Update user
        if (autoNick || role || unverified || doRankCheck) {
            let memberRoles = new MemberRoles([...member.roles.cache.keys()]);
            if (force || !bot.autoUpdateCache.has(member.user.id)) {
                if (!force) {
                    bot.autoUpdateCache.set(member.user.id, true);
                    setTimeout(() => bot.autoUpdateCache.delete(member.user.id), bot.CONFIG.autoUpdate.cooldown);
                }

                let verified = await bot.getUser({ id: member.user.id });
                if (verified) {
                    // add guest role!
                    if ((autoRole.guestRole && autoRole.guild && autoRole.lastUsers?.length && !autoRole.lastUsers.find(e => e.uuid == verified.uuid))) {
                        memberRoles.addRole(autoRole.guestRole)
                        bot.log(`&5[AutoUpdate] adding guest role!`)
                    } else if (autoRole.guestRole && autoRole.guild && autoRole.lastUsers?.length) {
                        memberRoles.removeRole(autoRole.guestRole)
                    }
                    // todo: per guild verification

                    // Update Verification Role
                    if (role && !member.roles.cache.has(role)) {
                        memberRoles.addRole(role);
                    }
                    // Remove Unverified Role
                    if (unverified && member.roles.cache.has(unverified)) {
                        memberRoles.removeRole(unverified);
                    }

                    let player = (autoNick || doRankCheck) ? await bot.wrappers.hypixelPlayer.get(verified.uuid) : null;
                    if (player && !player.outage) {
                        // // Requirement Checks
                        // if (doReqCheck) {
                        //     let sortedRequirements = Object.fromEntries(Object.entries(requirements).sort((a, b) => {
                        //         if (getGameTypeFromID(a[0].toLowerCase()).name < getGameTypeFromID(b[0].toLowerCase()).name) { return -1; }
                        //         if (getGameTypeFromID(a[0].toLowerCase()).name > getGameTypeFromID(b[0].toLowerCase()).name) { return 1; }
                        //         return 0;
                        //     }))
                        //     const [check, outcome] = bot.requirementCheck(player, sortedRequirements);
                        // }
                        // AutoNick
                        if (autoNick && !autoNickExcludedRoles?.some(e => member.roles.cache.has(e))) {
                            let username = player.displayname;
                            // ^(\[.*?\] ?)?(.*?)( ?\[.*?\])?$
                            const nickname = member.nickname || member.user.username;
                            const match = nickname.match(/^(\[.*?\] ?)?(.*?)( ?\[.*?\])?$/);
                            const prefix = match[1] || "";
                            const oldNickname = match[2];
                            const suffix = match[3] || "";

                            // nickname must be diff, username must be diff
                            if (oldNickname != username) {
                                const newNickname = `${prefix}${username}${suffix}`;
                                console.log(`updating ${member.user.tag} username: ${nickname} -> ${newNickname}`)
                                await member.setNickname(newNickname, `Hypixel Guild Bot AutoNick`)
                                    .then(() => {
                                        bot.log(`&6[AutoNick] ${member.user.tag} was renamed to ${newNickname}`);
                                    })
                                    .catch(e => bot.log(`&6[AutoNick] &ccouldnt rename ${member.user.tag} because of permissions error.`));
                            }
                        }


                        // console.log(serverConf.rankRoles)
                        if (doRankCheck) {
                            let playerRank = player.rank.replace('[', '').replace(']', '');
                            // make sure the rank exists in our rank dictionary
                            if (serverConf.rankRoles.hasOwnProperty(playerRank)) {

                                let rankRoles = Object.entries(serverConf.rankRoles).sort((a, b) => a[1].weight - b[1].weight);
                                let rankWeight = serverConf.rankRoles[playerRank].weight;

                                for (const rank_ of rankRoles) {
                                    let rank = rank_[0];
                                    let role = rank_[1];
                                    if (role.weight == rankWeight) memberRoles.addRole(role.id);
                                    if (role.weight < rankWeight) role.pinned ? memberRoles.addRole(role.id) : memberRoles.removeRole(role.id);
                                    if (role.weight > rankWeight) memberRoles.removeRole(role.id)
                                }
                            }
                        }
                    }
                } else {
                    console.log(`[autoupdate] ${member.user.tag} IS NOT VERIFIED!`)
                    // remove rank roles
                    if (doRankCheck) {
                        let rankRoles = Object.values(serverConf.rankRoles);
                        rankRoles.forEach(r => memberRoles.removeRole(r.id));
                    }
                    // add guestt role
                    if (autoRole.guestRole && autoRole.guild) {
                        console.log(`[autoupdate] ADD GUEST ROLE TO ${member.user.tag}!`)

                        memberRoles.addRole(autoRole.guestRole)
                    }
                    // verified role
                    if (role && member.roles.cache.has(role)) {
                        // console.log("tested positive for verified role")
                        console.log(`[autoupdate] REMOVE VERIFIED ROLE FROM ${member.user.tag}!`)

                        memberRoles.removeRole(role);
                    }
                    // unverified role
                    if (unverified && !member.roles.cache.has(unverified)) {
                        // console.log("tested positive for unverifed role")
                        memberRoles.addRole(unverified);
                    }
                }
                if (memberRoles.rolesToAdd.length || memberRoles.rolesToRemove.length) {
                    bot.log(`&5[AutoUpdate] [${member.user.tag}] Roles added: ${memberRoles.rolesToAdd.map(e => e.id)} Roles removed: ${memberRoles.rolesToRemove.map(e => e.id)}`);
                    await member.roles.set(memberRoles.array(), "Hypixel Guild Bot Rank Roles").catch(e => bot.log(`&4[${member.user.tag}] AutoUpdate error - permissions error.`))
                }
            }
        }
    }
}

