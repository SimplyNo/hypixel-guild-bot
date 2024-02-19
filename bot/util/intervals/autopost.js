const { Client, Collection, Structures, TextChannel, Message } = require("discord.js");
const messageCreateEvent = require('../../events/messageCreate');
const interactionCreate = require('../../events/interactionCreate');
// const Message = Structures.get('Message');
module.exports = {
    /**
     * 
     * @param {Client} bot 
     */
    async interval(bot) {
        let currentDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));

        // let currentDate = new Date(1630295940000 + (4 * 6.048e+8));
        // let currentDate = new Date(new Date().setHours(new Date().getHours() + 2, 0, 0, 0))
        // console.log(currentDate.toLocaleString())
        let servers;
        let types = [];

        // weekly
        if (currentDate.getDay() == 0 && currentDate.getHours() == 23 && currentDate.getMinutes() >= 55) types.push("weekly");
        // daily
        if (currentDate.getHours() == 23 && currentDate.getMinutes() >= 55) types.push("daily");
        // if (true) types.push("daily");

        // hourly
        if (currentDate.getMinutes() >= 0 && currentDate.getMinutes() <= 5) types.push("hourly");


        servers = await bot.config.autoPost.findByType(types).then(s => { return s.filter(e => bot.guilds.cache.has(e.id)) })
        if (servers) {
            for (const serverConf of servers) {
                let autoPost = serverConf.config.autoPost;

                Object.entries(autoPost).forEach(async _v => {
                    const slot = _v[0];
                    const slotConfig = _v[1];
                    // console.log(slotConfig.intervalType, types)
                    if (!slotConfig || !slotConfig.channel || !types.includes(slotConfig.intervalType)) return;
                    // console.log((((currentDate.getTime() - slotConfig.lastSent) / (10 * 60 * 1000))))
                    // console.log(`current date: ` + currentDate.toLocaleTimeString())
                    // console.log(`last sent: ` + new Date(slotConfig.lastSent).toLocaleTimeString())
                    // console.log(`diff: ` + ((currentDate.getTime() - slotConfig.lastSent) / (60 * 1000)))


                    if (!slotConfig.lastSent || (Math.abs(((currentDate.getTime() - slotConfig.lastSent)) / (60 * 1000)) > 10)) {
                        // if (!slotConfig.lastSent || (Math.abs(((currentDate.getTime() - slotConfig.lastSent)) / (60 * 1000)) > 0)) {

                        /**
                         * @type {TextChannel}
                        */
                        const channel = await bot.channels.fetch(slotConfig.channel).catch(e => 0);
                        if (!channel || channel.type !== 'GUILD_TEXT') {
                            bot.log(`&4error fetching channel... deleted? im gonna delete this slot now... hopefully nothing breaks!!!!!!`)
                            await bot.config.autoPost.deleteSlot(serverConf.id, slot);
                            return bot.log(`&4 it has been done !`)
                        }
                        console.log(slotConfig);

                        let user = await bot.users.fetch(slotConfig.author).catch(e => 0)
                        if (!user) return;
                        bot.log(`&5[AutoPost] sending post. ${!!serverConf.config.prefix}`)
                        if (slotConfig.slashCommand) {
                            const { slashCommand } = slotConfig;
                            const q = slashCommand.split(' ');
                            const command = q.shift().slice(1);
                            const args = Object.fromEntries(slashCommand.split(' ').map(e => e.split(':')))
                            console.log('args', args)
                            console.log('command', command)


                            let replaceMessage = slotConfig.doEditMessage && slotConfig.lastMessageID ? await channel.messages.fetch(slotConfig.lastMessageID).catch(e => false) : null;

                            const fakeInteraction = {
                                user,
                                guild: channel.guild,
                                channel,
                                commandName: command,
                                deferReply: async () => { },
                                editReply: async () => { },
                                fetchReply: async () => { },
                                isCommand: async () => true,
                                options: {
                                    getString: (i) => { return args[i] },
                                    getInteger: (i) => { return Number(args[i]) },
                                    getBoolean: (i) => { return args[i] == "true" },
                                    // getMember: (i) => { return message.mentions.members.first() },
                                    // getRole: (i) => { return message.mentions.roles.first() },
                                    // getChannel: (i) => { return message.mentions.channels.first() },
                                    // getMentionable: (i) => { return message.mentions.roles.first() || message.mentions.members.first() || message.mentions.channels.first() },
                                    getNumber: (i) => { return Number(args[i]) },
                                }, reply: async (...options) => {
                                    const [{ components, ...restOptions }] = options;
                                    if (options && options[0].embeds) {
                                        options[0].embeds.forEach(e => {
                                            e.setFooter(`AutoPost Command`).setTimestamp()
                                        })
                                    }
                                    return channel.send({ ...restOptions });
                                },
                                followUp: async (...options) => {
                                    const [{ components, ...restOptions }] = options;
                                    if (options && options[0].embeds) {
                                        options[0].embeds.forEach(e => {
                                            console.log(`embed`, e)
                                            e.setFooter(`AutoPost Command`).setTimestamp()
                                        })
                                    } return channel.send({ ...restOptions });
                                }
                            }
                            // bot.commands.get('monthly').run(fakeInteraction, args, bot)
                            interactionCreate.execute(bot, fakeInteraction);
                        } else if (slotConfig.command) {
                            // old text commands 
                            let command = slotConfig.command;
                            if (command == 'leaderboard') return bot.log(`&4skipping leaderboard command`);
                            let replaceMessage = slotConfig.doEditMessage && slotConfig.lastMessageID ? await channel.messages.fetch(slotConfig.lastMessageID).catch(e => false) : null;
                            // console.log(replaceMessage)
                            let fakeMessage = {
                                autoPost: {
                                    replaceMessage: replaceMessage,
                                    callback(message) {
                                        // console.log("CALL BACK RECEIVED!!!")
                                        bot.config.autoPost.setSlot(serverConf.id, slot, { lastSent: currentDate.getTime(), lastMessageID: message.id })


                                    }
                                },
                                id: Math.random().toString(),
                                type: 'text',
                                content: `${serverConf.config.prefix || `${bot.CONFIG.PREFIX}`}${command}`,
                                author: user,
                                pinned: false,
                                tts: false,
                                embeds: [],
                                attachments: new Collection,
                                nonce: Math.random(),
                                channel: channel,
                                guild: channel.guild,
                                reply: async (options) => {
                                    let msg;
                                    if (options.embeds) {
                                        options.embeds.forEach(e => {
                                            e.setFooter(`AutoPost Command`).setTimestamp()
                                        })
                                    }
                                    if (replaceMessage) {
                                        msg = await replaceMessage.edit(options).catch(e => console.log(e))
                                    } else {
                                        msg = await channel.send(options).catch(e => console.log(e))
                                    }
                                    if (msg) fakeMessage.autoPost.callback(msg);
                                }
                            }

                            messageCreateEvent.execute(bot, fakeMessage)
                        }
                        bot.config.autoPost.setSlot(serverConf.id, slot, { lastSent: currentDate.getTime() })

                    }

                })
                if (types.includes('daily')) await wait(5);
            }
        }

    },
    beginInterval(bot) {
        bot.log(`&e[AutoPost] starting autopost interval`)
        return setInterval(() => {
            this.interval(bot);
        }, 5 * 1000)
    }
}
function wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    })
}