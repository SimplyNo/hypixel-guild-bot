const messageCreate = require("../../events/messageCreate");
const interactionCreate = require("../../events/interactionCreate");
const { Client, Collection, Structures, TextChannel, Message } = require("discord.js");
const { slash } = require("../config/autopost");


module.exports = {
    name: "runap",
    description: "Force run autopost command",
    devOnly: true,
    aliases: ['runautopost', 'sendap'],
    async execute(message, args, bot) {
        let serverConf = message.serverConf
        let autoPost = serverConf.autoPost;
        let slot = parseInt(args[0]) || 1;


        let slotConfig = autoPost[slot];
        console.log(slotConfig)
        if ((!slotConfig?.command && !slotConfig?.slashCommand) || !slotConfig?.channel) return bot.createErrorEmbed(message).setDescription('This slot does not exist or is not configured correctly.').send()
        // console.log(slotConfig.intervalType, types)
        // console.log((((currentDate.getTime() - slotConfig.lastSent) / (10 * 60 * 1000))))
        // console.log(`current date: ` + currentDate.toLocaleTimeString())
        // console.log(`last sent: ` + new Date(slotConfig.lastSent).toLocaleTimeString())
        // console.log(`diff: ` + ((currentDate.getTime() - slotConfig.lastSent) / (60 * 1000)))


        message.reply(`Attempting to send command \`${slotConfig.command || slotConfig.slashCommand}\` to <#${slotConfig.channel}>`);
        /**
         * @type {TextChannel}
         */
        const channel = await bot.channels.fetch(slotConfig.channel).catch(e => 0);
        if (!channel) return bot.log(`&4error fetching channel... deleted?`)
        console.log(slotConfig);

        let user = await bot.users.fetch(slotConfig.author).catch(e => 0)
        if (!user) return;
        bot.log(`&5[AutoPost] sending post. ${!!serverConf.prefix}`)
        if (slotConfig.slashCommand) {
            const { slashCommand } = slotConfig;
            const q = slashCommand.split(' ');
            const command = q.shift().slice(1);
            const args = Object.fromEntries(slashCommand.split(' ').map(e => e.split(':')))
            console.log('args', args)
            console.log('command', command)


            let replaceMessage = slotConfig.doEditMessage && slotConfig.lastMessageID ? await channel.messages.fetch(slotConfig.lastMessageID).catch(e => false) : null;

            const fakeInteraction = {
                user: message.author,
                guild: message.guild,
                channel: message.channel,
                commandName: command,
                deferReply: async () => { },
                editReply: async () => { },
                followUp: async () => { },
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
                    return message.channel.send({ ...restOptions });
                },
                followUp: async (...options) => {
                    const [{ components, ...restOptions }] = options;
                    return message.channel.send({ ...restOptions });
                }
            }
            // bot.commands.get('monthly').run(fakeInteraction, args, bot)
            interactionCreate.execute(bot, fakeInteraction);
        } else if (slotConfig.command) {

            let command = slotConfig.command;
            if (command == 'leaderboard' && slotConfig.doEditMessage) return bot.log(`&4skipping leaderboard EDIT command`);
            let replaceMessage = slotConfig.doEditMessage && slotConfig.lastMessageID ? await channel.messages.fetch(slotConfig.lastMessageID).catch(e => false) : null;
            // console.log(replaceMessage)
            let fakeMessage = {
                autoPost: {
                    replaceMessage: replaceMessage,
                    callback(message) {
                        // console.log("CALL BACK RECEIVED!!!")
                        // bot.config.autoPost.setSlot(serverConf.id, slot, { lastSent: currentDate.getTime(), lastMessageID: message.id })


                    }
                },
                id: Math.random().toString(),
                type: 'text',
                content: `${message.prefix || `${bot.CONFIG.PREFIX}`}${command}`,
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

            messageCreate.execute(bot, fakeMessage)
            // bot.config.autoPost.setSlot(serverConf.id, slot, { lastSent: currentDate.getTime() })


        }
    }

}