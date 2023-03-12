const messageCreate = require("../../events/messageCreate")
const { Client, Collection, Structures, TextChannel, Message } = require("discord.js");


module.exports = {
    name: "runap",
    description: "Force run autopost command",
    devOnly: true,
    aliases: ['runautopost', 'sendap'],
    async execute(message, args, bot) {
        let serverConf = message.serverConf
        let autoPost = serverConf.autoPost;
        let slot = parseInt(args[0]) || 1;

        console.log(slot)

        let slotConfig = autoPost[slot];
        if (!slotConfig?.command || !slotConfig?.channel) return bot.createErrorEmbed(message).description('This slot does not exist or is not configured correctly.').send()
        // console.log(slotConfig.intervalType, types)
        // console.log((((currentDate.getTime() - slotConfig.lastSent) / (10 * 60 * 1000))))
        // console.log(`current date: ` + currentDate.toLocaleTimeString())
        // console.log(`last sent: ` + new Date(slotConfig.lastSent).toLocaleTimeString())
        // console.log(`diff: ` + ((currentDate.getTime() - slotConfig.lastSent) / (60 * 1000)))


        message.reply(`Attempting to send command \`${slotConfig.command}\` to <#${slotConfig.channel}>`);
        /**
         * @type {TextChannel}
         */
        const channel = await bot.channels.fetch(slotConfig.channel).catch(e => 0);
        if (!channel) return bot.log(`&4error fetching channel... deleted?`)
        console.log(slotConfig);

        let user = await bot.users.fetch(slotConfig.author).catch(e => 0)
        if (!user) return;
        bot.log(`&5[AutoPost] sending post. ${!!serverConf.prefix}`)
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