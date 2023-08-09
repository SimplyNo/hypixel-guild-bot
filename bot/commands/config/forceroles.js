const { SlashCommandBuilder } = require("@discordjs/builders");
const { Message, Collection, GuildMember, MessageButton, ButtonInteraction, CommandInteraction } = require("discord.js");
const MemberRoles = require("../../util/setup/MemberRoles");
module.exports = {
    name: "forceroles",
    aliases: ["forceverifiedroles", "fvr", "forcevr", "forceroles", "updateall", "forceupdate", "forceverifyroles"],
    type: "config",
    description: "Force updates verified, unverified, and guest role to all members.",
    adminOnly: true,
    cooldown: 30,
    slash: new SlashCommandBuilder()
        .setName("forceroles")
        .setDescription("Force updates verified, unverified, and guest role to all members."),
    /**
     * 
     * @param {CommandInteraction} interaction 
     * @param {*} args 
     * @param {*} bot 
     */
    async run(interaction, { serverConf }, bot) {
        // let verifiedRole = message.serverConf.verification.role;
        // if (!verifiedRole || !message.guild.roles.cache.has(verifiedRole)) return message.reply(`You need a server **verified role** to use this command. To add one use \`${message.prefix}verifyconfig setrole <@Role | RoleID>\`.`)

        let possibleRoles = {
            verifiedRole: serverConf.verification.role || null,
            guestRole: serverConf.autoRole.guestRole || null,
            unverified: serverConf.verification.unverified || null
        }
        const memberRole = serverConf.autoRole.memberRole || null;
        console.log(Object.values(possibleRoles))
        if (Object.values(possibleRoles).every(e => !e) && !memberRole) {
            return bot.createEmbed(interaction).setTitle(`️️:warning: No roles!`)
                .setDescription(`
You need to have set at least **one** of the following roles to use this command:

\`•\` **Verified Role** (\`${interaction.prefix}verifyconfig\`)
\`•\` **Unverified Role** (\`${interaction.prefix}verifyconfig\`)
\`•\` **Guest Role** (\`${interaction.prefix}autorole\`)

**»** _The bot **automatically** updates members' roles as they send messages in the server. This command force updates everyone and shouldn't need to be used often._

**»** _Roles that are not listed here such as **guild rank roles**, **guild member role**, and **guild GEXP roles**, are updated every ~15 minutes and don't need to be manually updated._
`).send()
        } else {
            let collector = await bot.createEmbed(interaction)
                .setTitle(":warning: Confirmation")
                .setDescription(`
The bot will update all members according to the following roles:

\`•\` **Verified Role** (\`${interaction.prefix}verifyconfig\`) ${possibleRoles.verifiedRole ? `- <@&${possibleRoles.verifiedRole}>` : ``}
\`•\` **Unverified Role** (\`${interaction.prefix}verifyconfig\`) ${possibleRoles.unverified ? `- <@&${possibleRoles.unverified}>` : ``}
\`•\` **Guest Role** (\`${interaction.prefix}autorole\`) ${possibleRoles.guestRole ? `- <@&${possibleRoles.guestRole}>` : ``}

**_This may take some time depending on large your server is._**
    `).sendAsConfirmation();
            collector.on("cancel", async btn => {
                btn.deferUpdate();
                interaction.followUp("Cancelled!")
            })
            collector.on("confirm", async btn => {
                let startTime = Date.now();
                await btn.deferUpdate()
                let embed = bot.createEmbed(interaction)
                    .setAuthor(`Step 1/2 » Fetching Members`)
                    .setDescription(`
        Fetching server members...
        
        Elapsed Time: \`${Math.floor((Date.now() - startTime) / 1000 / 60)}m ${Math.floor((Date.now() - startTime) / 1000 % 60)}s\`
        `);
                let updateMessage = await embed.send({ followUp: true }).catch(e => console.log(`error while sending forceroles msg: `, e));
                if (!updateMessage) return interaction.reply(`Something went wrong with sending force roles message. Please report this to a developer!`);
                let currentState = 0;
                let verifiedUsersSize = null;
                let currentAdded = 0;
                let totalUpdated = 0;

                let updateMessageInterval = setInterval(async () => {
                    if (currentState == 1) {
                        await updateMessage.edit({
                            embeds: [embed.setAuthor(`Step 2/2 » Updating Roles`).setDescription(`
Updating the following roles for server members: 

\`•\` **Verified Role** (\`${interaction.prefix}verifyconfig\`) ${possibleRoles.verifiedRole ? `- <@&${possibleRoles.verifiedRole}>` : ``}
\`•\` **Unverified Role** (\`${interaction.prefix}verifyconfig\`) ${possibleRoles.unverified ? `- <@&${possibleRoles.unverified}>` : ``}
\`•\` **Guest Role** (\`${interaction.prefix}autorole\`) ${possibleRoles.guestRole ? `- <@&${possibleRoles.guestRole}>` : ``}

Members Checked: \`${currentAdded}/${interaction.guild.memberCount}\`
Members Updated: \`${totalUpdated}\`
Elapsed Time: \`${Math.floor((Date.now() - startTime) / 1000 / 60)}m ${Math.floor((Date.now() - startTime) / 1000 % 60)}s\`
`)]
                        }).catch(e => console.log(`error while editing forceroles msg: `, e))
                    }
                }, 1500)
                let allUsers = await bot.getAllUsers();

                /**
                 * @type {Collection<String, GuildMember>}
                 */
                let allMembers = await interaction.guild.members.fetch().then(members => members.filter(e => !e.user.bot)).catch(e => console.log(e));
                let verifiedUsersInServer = allMembers.filter((m) => allUsers.find((u) => u.id == m.id));
                // console.log(verifiedUsersInServer)
                // update state
                currentState = 1;

                verifiedUsersSize = verifiedUsersInServer.size;
                const guildData = serverConf.autoRole.guild ? await bot.wrappers.hypixelGuild.get(serverConf.autoRole.guild, "id") : {};
                for (const member of [...allMembers.values()]) {
                    let memberRoles = new MemberRoles([...member.roles.cache.keys()]);
                    let verified = allUsers.find(u => u.id == member.id);
                    if (verified) {
                        // verified: remove unverified role
                        if (memberRoles.array().includes(possibleRoles.unverified)) memberRoles.removeRole(possibleRoles.unverified);
                        let inGuild = guildData.members?.find(m => m.uuid == verified.uuid);
                        if (inGuild) {
                            // verified: remove guest role if in guild
                            if (memberRoles.array().includes(possibleRoles.guestRole)) memberRoles.removeRole(possibleRoles.guestRole);
                        } else {
                            // verified: add guest role if not in guild
                            if (!memberRoles.array().includes(possibleRoles.guestRole)) memberRoles.addRole(possibleRoles.guestRole);
                            // verified: remove member role if not in guild
                            if (memberRoles.array().includes(memberRole)) memberRoles.removeRole(memberRole);
                        }

                        // verified: add verified role
                        if (!memberRoles.array().includes(possibleRoles.verifiedRole)) memberRoles.addRole(possibleRoles.verifiedRole);

                    } else {
                        // not verified: add guest role if not verified
                        if (!memberRoles.array().includes(possibleRoles.guestRole)) memberRoles.addRole(possibleRoles.guestRole);

                        // not verified: remove verified role
                        if (memberRoles.array().includes(possibleRoles.verifiedRole)) memberRoles.removeRole(possibleRoles.verifiedRole);
                        // not verified: add unverified role
                        if (!memberRoles.array().includes(possibleRoles.unverified)) memberRoles.addRole(possibleRoles.unverified);
                        // not verified: remove member role
                        if (memberRoles.array().includes(memberRole)) memberRoles.removeRole(memberRole)
                    }
                    currentAdded++;
                    // fix when have 2 roles . . .



                    if (memberRoles.rolesToAdd.length || memberRoles.rolesToRemove.length) {
                        await member.roles.set(memberRoles.array());
                        totalUpdated++;
                    }
                }

                await updateMessage.edit({
                    embeds: [
                        bot.createEmbed().setTitle(`${bot.assets.emotes.other.check} Success!`)
                            .setDescription(`
Checked \`${allMembers.size}\` members, of which \`${totalUpdated}\` member(s) needed role changes.

**Total Members Checked**: \`${currentAdded}/${allMembers.size}\`
**Total Members Updated**: \`${totalUpdated}\`
**Total Elapsed Time**: \`${Math.floor((Date.now() - startTime) / 1000 / 60)}m ${Math.floor((Date.now() - startTime) / 1000 % 60)}s\`
`)]
                })
                interaction.followUp(`Roles have been updated for \`${totalUpdated}/${allMembers.size}\` members. Time took: ${Math.floor((Date.now() - startTime) / 1000 / 60)} minute(s) ${Math.floor((Date.now() - startTime) / 1000 % 60)} second(s).`);
                clearInterval(updateMessageInterval)
            })

        }
    }
}