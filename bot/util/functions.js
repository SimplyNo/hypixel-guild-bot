/**
 * Appends various helper functions to 'bot'.
 */

const Canvas = require("canvas")
const Discord = require("discord.js");
const Enmap = require("enmap");
const EventEmitter = require('events');
const Mongoose = require("mongoose");
const chalk = require("chalk");
const config = require("../../config.json");
const { env, version, mongo } = config;
const assets = require("../../assets/assets.json");
const fs = require("fs");
const functionsConfig = require("./functionsConfig.js");
const path = require("path");
const rankFunctions = require("./rankFunctions.js");
const validReqs = require('../../valid-requirements.json');
const Redis = require('ioredis');
// const requirements = require("../old_commands/config/requirements");

// update footer
config.footer.text = config.footer.text.replace("%version%", version)
// color table for debugging
const table = {
    0: chalk.black,
    1: chalk.blue,
    2: chalk.green,
    3: chalk.cyan,
    4: chalk.red,
    5: chalk.magenta,
    6: chalk.yellow,
    7: chalk.gray,
    8: chalk.white,
    9: chalk.bgBlue,
    a: chalk.greenBright,
    b: chalk.cyanBright,
    c: chalk.redBright,
    d: chalk.bgRedBright,
    e: chalk.yellowBright,
    f: chalk.white
}
function parseMessageCodes(msg) {
    if (typeof msg !== "string") return msg;
    msg = '&f' + msg;
    let codes = msg.match(/&[0-9a-f]/g) || [];

    let ary = Array.from(msg);
    let parts = [];
    codes.forEach((char, i) => {
        let nextCodeStart = msg.indexOf(codes[i + 1]) != -1 ? msg.indexOf(codes[i + 1]) : ary.length;
        let index = msg.indexOf(char);
        let part = msg.slice(index, nextCodeStart);

        parts.push(table[char[1]](part.replace(char, '')))
        msg = msg.replace(part, '');
    })

    return parts.join('')
}


const botEnmap = new Enmap({
    name: "bot"
})
module.exports = {
    /**
     *  
     * @param {Discord.Client} bot
     * @returns {Discord.Client}
     * 
     */
    async init(bot, options) {


        bot.CONFIG = config;
        bot.CONFIG.PREFIX = '/';
        bot.isProduction = () => env == "PRODUCTION";
        bot.supportServer = config.supportServer;
        bot.log = (msg, ...args) => {
            msg = parseMessageCodes(`&7[LOG] [ID: ${bot.shard?.ids[0] || -1}/${(bot.shard?.count - 1) || -1}] &8` + msg)
            console.log(msg, ...args);
        }
        bot.logj = (msg) => {
            console.log(`[LOG] ${JSON.stringify(msg, null, 2)}`)
        }
        bot.slog = (msg, ...args) => {
            msg = parseMessageCodes(msg);
            console.log(msg, ...args);
        }
        bot.debug = (msg) => bot.log(`&6[DEBUG] ${msg}`)

        console.log(chalk.yellow("Connecting to database..."))
        let current = Date.now();
        await Mongoose.connect(mongo, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        console.log(chalk.green("Connected!") + chalk.cyan(` (${Date.now() - current}ms)`))
        const afkSchema = new Mongoose.Schema({
            id: {
                type: String,
                required: true
            },
            uuid: {
                type: String,
                require: true
            },
            startTime: {
                type: String,
                required: true
            }
        })
        const userSchema = new Mongoose.Schema({
            id: {
                type: String,
                required: true
            },
            uuid: {
                type: String,
                required: true
            },
            emoji: {
                type: String
            },
        })

        const configSchema = new Mongoose.Schema({
            id: {
                type: String,
                required: true
            },
            config: Map
        })
        const statsSchema = new Mongoose.Schema({
            id: String,
            stats: Map
        })
        bot.afking = Mongoose.model('afking', afkSchema, 'afking');
        bot.verified = Mongoose.model('users', userSchema, 'users');
        bot.stats = Mongoose.model('stats', statsSchema, 'stats');
        const defaultStats = {
            cmds: 0
        }
        bot.getStats = async () => {
            return new Promise(res => {
                bot.stats.findOne({ id: 'stats' }, (err, result) => {
                    if (!result) {
                        result = new bot.stats({ id: 'stats', stats: {} })
                    }
                    for (const key in defaultStats) {
                        let val = defaultStats[key];
                        !result.stats.has(key) && result.stats.set(key, val)
                    }
                    res(result.stats)
                })
            })
        }
        bot.addCommand = (num = 1) => {
            return new Promise(res => {
                bot.stats.findOne({ id: 'stats' }, async (err, result) => {
                    if (!result) {
                        result = new bot.stats({ id: 'stats', stats: {} })
                    }
                    for (const key in defaultStats) {
                        let val = defaultStats[key];
                        !result.stats.has(key) && result.stats.set(key, val)
                    }
                    let cmds = result.stats.get('cmds') + num;
                    result.stats.set('cmds', cmds);
                    await result.save()
                    res(cmds);
                })
            })
        }
        /**
         * @type {mongoose.Model}
         */
        let verified = bot.verified;
        bot.serverConf = Mongoose.model('config', configSchema, 'config')

        bot.getAllAfk = async () => await bot.afking.find({})
        bot.setAfk = async (id, uuid) => await new bot.afking({
            id: id,
            uuid: uuid,
            startTime: Date.now()
        }).save();
        bot.getAfk = async obj => {
            var user = await bot.afking.findOne(obj);
            if (user) return user;
        }
        bot.removeAfk = async obj => await bot.afking.deleteOne(obj)

        bot.addUser = async (id, uuid) => await new bot.verified({
            id,
            uuid
        }).save()
        // bot.verified.deleteMany({}, (err, res) => {
        //   if(err) console.log(err)
        //   console.log(res)
        // })
        bot.getAllUsers = async () => await bot.verified.find({})
        bot.getUser = async obj => {
            var user = await bot.verified.findOne(obj)
            if (user && !user.emoji) user.emoji = assets.emotes.other.check;
            return user
        }
        bot.getUsers = async users => {
            return (await Promise.all(users.map(u => bot.getUser(u)))).filter(u => !!u)
        }
        bot.removeUser = async obj => await bot.verified.deleteOne(obj)

        bot.setUser = async (obj, data) => await bot.verified.findOneAndUpdate(obj, data, {
            useFindAndModify: false
        })
        bot.resetUser = async (obj, key) => {
            return await bot.verified.findOne(obj, (err, user) => {
                delete user[key]
                user.save();
            });
        }

        bot.config = functionsConfig.init(bot.serverConf);

        /**
         * 
         * 
         * 
         */
        bot.assets = assets;
        bot.argFormatter = async (id, args, modes = []) => {
            var user = await bot.getUser({
                id: id
            })
            if (args.length < 1 && !user) return {
                name: undefined,
                page: 1
            }
            if (args.length < 1) return {
                name: user.uuid,
                page: 1
            }
            if (modes.filter(mode => mode.includes(args[0].toLowerCase())) && modes.filter(mode => mode.includes(args[0].toLowerCase())).length != 0 && user) return {
                name: user.uuid,
                page: bot.pageFinder(args[0], modes)
            }
            else if (args[0].match(/<@.?[0-9]*?>/)) {
                var mentionedID = args[0].replace(/!/g, '').slice(2, -1)
                var mentioned = await bot.getUser({
                    id: mentionedID
                })
                if (args[1] && mentioned) return {
                    name: mentioned.uuid,
                    page: bot.pageFinder(args[1], modes)
                }
                if (!args[1] && mentioned) return {
                    name: mentioned.uuid,
                    page: 1
                }
            }
            if (args[0] && args[1] && args[0] != "-p") return {
                name: args[0],
                page: bot.pageFinder(args[1], modes)
            }
            else if (args[0] && args[1] && args[2] && args[0] == "-p") return {
                name: args[1],
                page: bot.pageFinder(args[2], modes)
            }
            else if (args[0] && args[1] && args[0] == "-p") return {
                name: args[1],
                page: 1
            }
            return {
                name: args[0],
                page: 1
            }
        }


        bot.defaultSettings = config.defaultSettings;
        bot.autoRoleInterval = require("./intervals/autorole");
        bot.afkInterval = require("./intervals/afk.js");
        bot.autoPostInterval = require("./intervals/autopost.js");
        bot.autoUpdateInterval = require("./intervals/autoupdate");

        bot.toggleMaintenance = (reason) => {
            botEnmap.ensure('maintenance', { maintenance: false, reason: "No reason specified.", start: 0 })
            botEnmap.set('maintenance', { maintenance: !botEnmap.get('maintenance').maintenance, reason: reason, start: Date.now() })
            console.log(botEnmap)
            return botEnmap.get('maintenance').maintenance;
        }
        bot.isInMaintenance = () => botEnmap.ensure('maintenance', { maintenance: false, reason: "No reason specified.", start: 0 }).maintenance ? botEnmap.get('maintenance') : null;
        bot.toggleCommand = (cmd, reason) => {
            let disabled = botEnmap.ensure('disabled', [])
            if (disabled.find(e => e.name == cmd)) {
                disabled.splice(disabled.indexOf(e => e.name == cmd), 1);
                botEnmap.set('disabled', disabled)
                return false;
            } else {
                disabled.push({ name: cmd, reason: reason })
                botEnmap.set('disabled', disabled)
                return true;
            }
        }
        bot.isCommandDisabled = (cmd) => botEnmap.ensure('disabled', []).find(e => e.name == cmd)
        /**
         * Default Embeds for multi purpose use.
         */
        bot.createEmbed = (message) => {
            let MessageEmbed = new Discord.MessageEmbed().setColor(rankFunctions.genRandomColor());
            let footerText = !bot.isInMaintenance() ? config.footer.text : "Hypixel Guild Bot | %VERSION%-MAINTENANCE";
            MessageEmbed.setFooter(footerText.replace(/%VERSION%/g, version));
            MessageEmbed.send = async (channelOrOptions) => {
                if (channelOrOptions instanceof Discord.Interaction || channelOrOptions instanceof Discord.Message) {
                    message = channelOrOptions;
                    channelOrOptions = channelOrOptions.channel;
                }
                let channel = channelOrOptions instanceof Discord.TextChannel ? channelOrOptions : message?.channel || channelOrOptions.channel;
                let options = (channelOrOptions && !(channelOrOptions instanceof Discord.TextChannel)) ? channelOrOptions : {};
                let Embeds = [MessageEmbed];
                if (MessageEmbed.dropdowns) {
                    if (!MessageEmbed.dropdowns.find(e => e.menu.default)) {
                        MessageEmbed.dropdowns[0].menu.default = true;
                    }
                    options.components = options.components || [];
                    options.components.push(new Discord.MessageActionRow().addComponents(new Discord.MessageSelectMenu().setCustomId('optionMenu').addOptions(MessageEmbed.dropdowns.map((e, i) => e.menu))))
                    Embeds = MessageEmbed.dropdowns.find(e => e.menu.default)?.embeds ?? MessageEmbed.dropdowns[0].embeds;
                }
                options.fetchReply = true;
                if (message?.replied) {
                    options.followUp = true;
                }

                /**
                 * @type {Discord.Message}
                 */
                let msg = await (message ? bot.replyGracefully(message, { embeds: Embeds, ...options }) : channel.send({ embeds: Embeds, ...options })).catch(e => console.log(options, e));
                if (!msg) {
                    // console.log(`message: `, message)
                    console.log(`${message ? 'Replying Gracefully' : 'Sending through channel'}: Couldn't send a message because of missing permissions?!`)
                    return null;
                }

                if (MessageEmbed.dropdowns) {
                    msg.createMessageComponentCollector({ filter: (interaction) => interaction.customId == "optionMenu", componentType: "SELECT_MENU", time: 60 * 1000 })
                        .on('collect', async interaction => {

                            if (interaction.user.id !== msg.author.id) interaction.deferUpdate();
                            let currentlySelected = interaction.values[0];
                            let selected = MessageEmbed.dropdowns.find(e => e.menu.value == currentlySelected)
                            // console.log(interaction)

                            // interaction.update({
                            //     content: "hello!"
                            // })
                            await interaction.message.edit({
                                embeds: selected.embeds,
                                components: [
                                    new Discord.MessageActionRow()
                                        .addComponents([
                                            new Discord.MessageSelectMenu()
                                                .setCustomId("optionMenu")
                                                .addOptions(MessageEmbed.dropdowns.map(e => e.menu.value == currentlySelected ? ({ ...e.menu, default: true }) : ({ ...e.menu, default: false })))
                                        ])
                                ]
                            })
                        })
                        .on('end', (_, reason) => {
                            msg.edit({
                                components: []
                            })
                        })
                }
                return msg;
            }
            MessageEmbed.sendAsConfirmation = async (channelOrOptions) => {
                if (channelOrOptions instanceof Discord.Message) channelOrOptions = channelOrOptions.channel;
                const channel = channelOrOptions instanceof Discord.TextChannel ? channelOrOptions : message?.channel;
                const options = (channelOrOptions && !(channelOrOptions instanceof Discord.TextChannel)) ? channelOrOptions : {};
                const user = message ? message.user || message.author : null;

                let emitter = new EventEmitter();
                const confirmButton = new Discord.MessageButton()
                    .setCustomId("confirm")
                    .setLabel("Confirm")
                    .setStyle("PRIMARY");
                const cancelButton = new Discord.MessageButton()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle("SECONDARY")

                const row = new Discord.MessageActionRow()
                    .addComponents([confirmButton, cancelButton]);
                let data = {
                    embeds: [MessageEmbed],
                    components: [row],
                    content: MessageEmbed.content,
                    fetchReply: true,
                    ...options
                }
                const msg = await (message ? message.reply(data) : channel.send(data)).catch(e => console.log(e));
                const collector = msg.channel.createMessageComponentCollector({
                    componentType: "BUTTON",
                    max: 1,
                    idle: 30000,
                    filter: (button) => button.user.id == user.id
                })
                collector.on("collect", button => {
                    collector.stop("ended")
                    if (button.customId == "confirm") {
                        emitter.emit("confirm", button)
                        msg.edit({ components: [new Discord.MessageActionRow().addComponents(confirmButton.setDisabled())] })
                    } else if (button.customId == "cancel") {
                        emitter.emit("cancel", button)
                        msg.edit({ components: [new Discord.MessageActionRow().addComponents(cancelButton.setDisabled())] })
                    }
                })
                collector.on("end", (_, reason) => {
                    if (reason == "idle") {
                        row.components.forEach((e, i) => row.components[i].setDisabled(true));

                        // options.components = 
                        msg.channel.send("Confirmation cancelled due to inactivity.")
                        msg.edit({ components: [row] });

                    } else if (reason == "ended") {
                        // row.components.forEach((e, i) => row.components[i].setDisabled(true));

                        // msg.edit({ components: [row] })

                    }
                })
                // Embed.message = msg;
                return emitter;

            }

            MessageEmbed.addDropdowns = (dropdowns) => {
                // dropdowns = [
                //     {
                //         menu: {
                //             label: "heyo!",
                //             description: "hey!",
                //             value: "heyyyyy!"
                //         },
                //         embeds: []

                //     }
                // ]
                dropdowns = dropdowns.map((e, i) => ({ ...e, menu: { ...e.menu, value: `option-${i}` } }))

                MessageEmbed.dropdowns = dropdowns;
                return MessageEmbed;
            }

            MessageEmbed.setFancyGuild = (options = {}) => {
                let guild = options.guild || message.guild;
                let subtext = options.subtext || null;
                if (guild) {
                    return MessageEmbed.setAuthor(`${guild.name}${subtext ? ` → ${subtext}` : ``}`, guild.iconURL())
                } else {
                    console.log(`ERROR: MESSAGEEMBED.setFancyGuild CALLED WITHOUT GUILD OBJECT`)
                    return MessageEmbed;
                }
            }
            MessageEmbed.setFancy = (user) => {
                user = user || message.author;
                return MessageEmbed.setAuthor(user.tag, user.avatarURL());
            }
            return MessageEmbed;
        }
        /**
         * 
         * @param {*} message 
         * @returns A embed with property 'confirmation' (events: "confrim", "cancel")
         */
        bot.createConfirmationEmbed = (message) => {
            const user = message.author;
            let Embed = bot.createEmbed(message).setTitle("Confirmation").setDescription(`Are you sure you want to do this?`);
            Embed.confirmation = new EventEmitter();
            Embed.send = async (channel) => {
                const row = new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton()
                            .setCustomId("confirm")
                            .setLabel("Confirm")
                            .setStyle("PRIMARY")
                    )
                    .addComponents(
                        new Discord.MessageButton()
                            .setCustomId("cancel")
                            .setLabel("Cancel")
                            .setStyle("SECONDARY")
                    )
                let options = {
                    embeds: [Embed],
                    components: [row]
                }
                /**
                 * @type {Discord.Message}
                 */
                let msg;
                if (message) {
                    msg = await message.reply(options)
                } else if (channel instanceof Discord.Message) {
                    msg = await channel.reply(options)

                }
                else {
                    msg = await channel.send(options);
                }
                let collector = msg.createMessageComponentCollector({
                    componentType: "BUTTON",
                    max: 1,
                    idle: 30000,
                    filter: (button) => button.user.id == user.id
                })
                collector.on("collect", button => {
                    collector.stop("ended")
                    if (button.customId == "confirm") {

                        Embed.confirmation.emit("confirm", button)
                    } else if (button.customId == "cancel") {
                        Embed.confirmation.emit("cancel", button)
                    }
                })
                collector.on("end", (_, reason) => {
                    if (reason == "idle") {
                        row.components.forEach((e, i) => row.components[i].setDisabled(true));

                        // options.components = 
                        msg.channel.send("Confirmation cancelled due to inactivity.")
                        return msg.edit(options);

                    } else if (reason == "ended") {
                        row.components.forEach((e, i) => row.components[i].setDisabled(true));

                        return msg.edit(options)

                    }
                })
                Embed.message = msg;
                return Embed;
            }
            return Embed;
        }
        /**
         * Error Embeds
         */
        bot.createErrorEmbed = (message) => {
            return bot.createEmbed(message).setTitle(":warning: Error!").setColor('#FF0000');
        }
        bot.sendErrorEmbed = (messageObj, errorMsg) => {

            return bot.createErrorEmbed(messageObj).setDescription(errorMsg).send();
        }
        bot.createUsageEmbed = (command, message) => {
            let embed = bot.createEmbed(message)
                .setAuthor(message.author.username, message.author.avatarURL())
                .setTitle("Invalid Usage!")
                .setDescription(`Command: \`${command.name}\`\nAliases: \`${command.aliases ? command.aliases.join(", ") : "None"}\`\nUsage: \`${message.prefix}${command.name}${command.usage ? " " + command.usage : command.args ? " <args>" : ""}\`\nCooldown: \`${command.cooldown || 3} seconds\`\nSupports linked account use: \`${command.linkedSupport ? "Yes" : "No"}\``)
                .addField("Description", `\`${command.description}\`` || "No description set.")
                .addField("Example", `${command.example ? `\`${message.prefix}${command.name} ${command.example}\`` : "No example set."}`)

            return embed;
        }
        bot.createAPIErrorEmbed = (message) => {
            return bot.createEmbed(message).setTitle(":warning: API Outage").setDescription("There currently seems to be a **Hypixel API outage** at the moment. Please try this command again later.")
        }
        bot.pageEmbedMaker = (embed = {}, pages = []) => {
            let embeds = []
            embed = {
                title: null,
                icon: false,
                color: config.color,
                url: false,
                footer: true,
                description: null,
                image: false,
                thumbnail: false,
                files: false,
                ...embed
            }

            pages.forEach((page, pageIndex) => {
                let embeded = new Discord.MessageEmbed()
                if (page.title) embeded.setTitle(page.title)
                else if (embed.title) embeded.setTitle(embed.title)

                if (embed.url) embeded.setURL(embed.url)
                else if (embed.url) embeded.setURL(embed.url)

                if (embed.files) embeded.attachFiles(embed.files)

                if (page.description) embeded.setDescription(page.description)
                else if (embed.description) embeded.setDescription(embed.description)

                if (page.thumbnail) embeded.setThumbnail(page.thumbnail)
                else if (embed.thumbnail) embeded.setThumbnail(embed.thumbnail)

                if (page.image) embeded.setImage(page.image)
                else if (embed.image) embeded.setImage(embed.image)

                if (page.author || embed.author || page.icon || embed.icon) embeded.setAuthor(page.author ? page.author : embed.author, page.icon ? page.icon : embed.icon)
                else if (page.author) embeded.setAuthor(page.author)

                if (page.color) embeded.setColor(page.color)
                else if (embed.color) embeded.setColor(embed.color)

                if (embed.footer && pages.length > 1) embeded.setFooter(`『 Page ${pageIndex + 1}/${pages.length}』 ${config.footer.text}`)
                else if (embed.footer) embeded.setFooter(`${config.footer.text}`)

                if (page.fields) {
                    let blanks = 0
                    let fields = []
                    const firstPage = pages[0]
                    page.fields.forEach((field, index) => {
                        field.options = {
                            inline: true,
                            blank: false,
                            blankTitle: false,
                            escapeFormatting: false,
                            compare: false,
                            ...field.options
                        }
                        if (field.options.blank == true) {
                            if (firstPage.fields[index].options.blank !== true) blanks++
                            fields.push({
                                name: "\u200b",
                                value: "\u200b",
                                inline: field.options.inline
                            })
                        } else {
                            if (field.options.changelog == true) {
                                var values = []
                                field.value.forEach((subValue, index) => {
                                    values.push(`\`+\` ${subValue.name ? `**${subValue.name}**:` : ""} ${subValue.value}`)
                                })
                                fields.push({
                                    name: field.name ? field.name : "\u200b",
                                    value: values,
                                    inline: false
                                })
                            } else if (Array.isArray(field.value)) {
                                var values = []
                                field.value.forEach((subValue, index) => {
                                    values.push(`+ **${subValue.name}**: \`${(subValue.value || 0).toLocaleString()}\``)
                                })
                                fields.push({
                                    name: field.name ? field.name : "\u200b",
                                    value: values,
                                    inline: field.options.inline
                                })
                            } else {
                                let firstField = firstPage.fields[index - blanks]
                                if (field.options.escapeFormatting == true) {
                                    fields.push({
                                        name: field.name ? field.name : "\u200b",
                                        value: `${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}`,
                                        inline: field.options.inline
                                    })
                                } else if (field.options.blankTitle == true) {
                                    fields.push({
                                        name: "\u200b",
                                        value: `\`${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}\``,
                                        inline: field.options.inline
                                    })
                                } else if (field.options.compare == true) {
                                    fields.push({
                                        name: field.name ? field.name : "\u200b",
                                        value: `\`${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}\` **|** \`${field.value2 ? Number.isInteger(field.value2) ? field.value2.toLocaleString() : field.value2 : 0}\`\n ${!isNaN(field.value) || field.value == undefined && !isNaN(field.value2) || field.value == undefined ? `${emoji(field.value || 0, field.value2 || 0)} \`${Math.abs((field.value || 0) - (field.value2 || 0)).toLocaleString()}\`` : ` `}`,
                                        inline: field.options.inline
                                    })
                                } else {
                                    fields.push({
                                        name: field.name ? field.name : firstField ? firstField.name : "\u200b",
                                        value: `\`${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}\``,
                                        inline: field.options.inline
                                    })
                                }
                            }
                        }
                    })
                    embeded.addFields(fields)
                }
                embeds.push(embeded)
            })

            return embeds
        }
        bot.requirementCheck = (data, requirements) => {
            let totalPassed = 0;
            let totalFailed = 0;
            requirements = JSON.parse(JSON.stringify(requirements));
            Object.entries(requirements).forEach(req_ => {
                let [id, req] = req_;

                const min = req.min ?? null;
                const max = req.max ?? null;

                // the game type object where gameType.name = the game type
                let gameType = validReqs.find(el => el.reqs.find(e => e.id.toLowerCase() == id.toLowerCase()));
                // the predefined config for this requirement including 'path'
                let reqConfig = validReqs.flatMap(e => e.reqs).find(e => e.id.toLowerCase() == id.toLowerCase());

                // temp variable storing last data
                // parse the path string
                const totalPath = reqConfig.path;
                const operator = totalPath.match(/\/|\+|\-|\*/)?.['0'];
                const paths = operator ? totalPath.split(/\s(?:\/|\+|\-|\*)\s/g) : [totalPath];
                const parsedPaths = paths.map(path => {
                    let lastData = data;
                    path.split('.').forEach(key => {
                        // if the next property exists, set the lastdata to the next property 
                        if (lastData[key] !== undefined) {
                            lastData = lastData[key]
                        } else {
                            return;
                        }
                    })
                    return !lastData || isNaN(lastData) ? 0 : lastData;
                })
                let reqValue = 0;
                // get the total value
                if (paths.length > 1) {
                    console.log(parsedPaths, paths);

                    reqValue = parsedPaths.reduce((a, b) => eval(`a ${operator} b`)).toPrecision(2);
                } else {
                    reqValue = parsedPaths[0];
                }
                if (!reqValue || isNaN(reqValue)) reqValue = 0;
                let passCheck = (min === null || reqValue >= min) && (max === null || reqValue <= max) ? true : false;
                if (!passCheck) {
                    // -1 = too low, 1 = too high
                    if (min !== null && reqValue < min) requirements[id].verdict = -1;
                    if (max !== null && reqValue > max) requirements[id].verdict = 1;
                }
                // add to total passed
                if (passCheck) totalPassed++;
                else totalFailed++;

                requirements[id].currentValue = reqValue;
                requirements[id].passed = passCheck;
            })
            // requirements.TOTAL_PASSED = totalPassed;
            // requirements.TOTAL_FAILED = totalFailed;
            return [requirements, { passed: totalPassed, failed: totalFailed, total: Object.keys(requirements).length }];
        }
        bot.getAllFiles = (dirPath, arrayOfFiles) => {
            const files = fs.readdirSync(dirPath)
            arrayOfFiles = arrayOfFiles || []
            files.forEach(function (file) {
                if (fs.statSync(dirPath + "/" + file).isDirectory()) arrayOfFiles = bot.getAllFiles(dirPath + "/" + file, arrayOfFiles)
                else arrayOfFiles.push(path.join(dirPath, "/", file))
            })
            return arrayOfFiles
        }
        bot.getEmojiRankFromFormatted = (rank = "", name) => {
            rank = rank.replace(/&/g, '§');
            const {
                ranks
            } = assets
            const colorCodeRank = rank.replace(`${name}`, "").replace(" ", "") || "&7"
            const blankRank = colorCodeRank.replace(/§1|§2|§3|§4|§5|§6|§7|§8|§9|§0|§a|§b|§c|§d|§e|§f|§k|§r|§l|§|\[|\]/g, "")
            if (blankRank == "MVP+") return ranks["MVP+"].START.join("") + (ranks["MVP+"][rankFunctions.colorCodeToColor(colorCodeRank.substring(6, colorCodeRank.indexOf('+'))) || "RED"].join(""))
            else if (blankRank == "MVP++") {
                if (colorCodeRank.substring(0, colorCodeRank.indexOf('[')) == "§b") return ranks["MVP++"].AQUA.START.join("") + ranks["MVP++"].AQUA[rankFunctions.colorCodeToColor(colorCodeRank.substring(6, colorCodeRank.indexOf('++'))) || "RED"].join("")
                return ranks["MVP++"].GOLD.START.join("") + ranks["MVP++"].GOLD[rankFunctions.colorCodeToColor(colorCodeRank.substring(6, colorCodeRank.indexOf('++'))) || "RED"].join("")
            } else {
                if (ranks[blankRank]) return ranks[blankRank].join("")
                return ""
            }
        }
        /**
         * Gets server configurations, returns default value if not present.
         * @param {String} i
         * @param {String} setting 
         */
        bot.getGuildLevel = exp => {
            var EXP_NEEDED = [100000, 150000, 250000, 500000, 750000, 1000000, 1250000, 1500000, 2000000, 2500000, 2500000, 2500000, 2500000, 2500000, 3000000];

            var level = 0;

            for (var i = 0; i <= 1000; i += 1) {
                var need = 0;
                if (i >= EXP_NEEDED.length) {
                    need = EXP_NEEDED[EXP_NEEDED.length - 1];
                } else {
                    need = EXP_NEEDED[i];
                }

                if ((exp - need) < 0) {

                    return {
                        "level": Math.round((level + (exp / need)) * 100) / 100,
                        "nextLevel": Math.round(need - exp)
                    };
                }

                level += 1;
                exp -= need;
            }

            return 1000; // Only Change if Max Level Changes
        }
        bot.getServerConf = (id, setting) => {
            if (bot.serverConf.has(id) && bot.serverConf.has(id, setting)) {
                return bot.serverConf.get(id, setting)
            } else {
                return bot.defaultSettings[setting];
            }
        }
        bot.hasDev = (id) => {
            return config.developers.includes(id);
        }
        /**
         * 
         * @param {*} input 
         * @param {Discord.Guild} guild 
         */
        bot.parseMember = async (input, guild) => {
            if (!input) return null;
            let match = input.match(/<@.?[0-9]*?>/);
            let mentionedID;
            if (match) {
                mentionedID = input.replace(/!/g, '').slice(2, -1)
            } else {
                mentionedID = input;
            }
            let member = await guild.members.fetch(mentionedID).catch(e => null);
            return member;
        }
        bot.parseChannel = async (input, guild) => {
            if (!input || !guild) {
                return null
            }
            else if (guild.channels.cache.get(input)) {
                return guild.channels.cache.get(input)
            } else if (guild.channels.cache.get(input.match(/\<#([0-9]*?)\>/) ? input.match(/\<#([0-9]*?)\>/)[1] : null)) {
                return guild.channels.cache.get(input.match(/\<#([0-9]*?)\>/)[1]);
            } else if (guild.channels.cache.find(ch => ch.name.toLowerCase() == input.toLowerCase())) {
                return guild.channels.cache.find(ch => ch.name.toLowerCase() == input.toLowerCase());
            } else {
                return null;
            }
        }
        /**
         * 
         * @param {*} input 
         * @param {Discord.Guild} guild 
         */
        bot.parseRole = async (input, guild, includeManagedRoles = false) => {
            if (!input) return null;
            let role;
            if (guild.roles.cache.get(input)) {
                role = guild.roles.cache.get(input)
            } else if (guild.roles.cache.get(input.match(/\<@&([0-9]*?)\>/) ? input.match(/\<@&([0-9]*?)\>/)[1] : null)) {
                role = guild.roles.cache.get(input.match(/\<@&([0-9]*?)\>/)[1]);
            } else if (guild.roles.cache.find(r => r.name.toLowerCase() == input.toLowerCase())) {
                role = guild.roles.cache.find(r => r.name.toLowerCase() == input.toLowerCase());
            }
            if (!role || (!includeManagedRoles && role.managed) || guild.roles.everyone.id == role.id) {
                return null
            }
            return role
        }

        bot.pageFinder = (mode, modes) => {
            if (mode == undefined) return 1
            if (!isNaN(mode)) return mode > modes.length ? 1 : mode
            for (x in modes)
                if (modes[x].map(e => e.toLowerCase()).indexOf(mode.toLowerCase()) != -1) return ++x
            return 1
        }
        bot.playerErrorCheck = (player, mode) => {
            if (!player) return "Please specifiy a valid username or uuid."
            if (player.exists == false) return "Please specifiy a valid username or uuid."
            else if (player.outage == true) return "There is currently a Hypixel API Outage, responses may be slower or nonexistent."
            else if (mode)
                if (!player.stats || !player.stats[mode]) return `${player.displayname} has not played this gamemode.`
        }
        Canvas.registerFont("./fonts/minecraft-special.ttf", {
            family: "Minecraft"
        });
        Canvas.registerFont("./fonts/minecraft-bold.otf", {
            family: "Minecraft",
            weight: "bold"
        });
        Canvas.registerFont("./fonts/minecraft-bold-italic.otf", {
            family: "Minecraft",
            weight: "bold",
            style: "italic"
        });
        Canvas.registerFont("./fonts/minecraft-italic.otf", {
            family: "Minecraft",
            style: "italic"
        });

        bot.printText = (cvs, msg, options = {}) => {
            options = {
                x: 0,
                y: 0,
                size: 40,
                shadow: true,
                shadowOffset: 0.1,
                allignVertical: "top",
                allignHorizontal: "left",
                ...options
            };

            if (options.allignVertical === 'center') {
                options.y -= options.size / 2;
            } else if (options.allignVertical === 'bottom') {
                options.y = options.y - options.size;
            } else if (options.allignVertical === 'photoshop') {
                options.y = options.y - options.size + 8;
            }

            if (options.allignHorizontal !== 'left') {
                const width = client.measureText(msg, options.size, cvs);
                if (options.allignHorizontal === 'center') {
                    options.x -= width / 2;
                } else if (options.allignHorizontal === 'right') {
                    options.x -= width;
                }
            }

            if (!msg.startsWith("§")) msg = "§7" + msg;
            const ctx = cvs.getContext("2d");
            ctx.fillStyle = "#ffffff";
            let parts = msg.split("§");
            let position = options.size * 0.05;
            const offset = Math.max(1, options.size * options.shadowOffset);
            const adjustedy = options.y + options.size * (5 / 6);
            let bold = false;
            let italic = false;
            let color = colors["7"];
            for (const part of parts) {
                const key = part.charAt(0);
                color = colors[key] || color;
                if (key === "l") bold = true;
                else if (key === "n") italic = true;
                else if (key === "r") {
                    bold = false;
                    italic = false;
                }
                ctx.font = `${bold ? "bold" : ""} ${italic ? "italic" : ""} ${options.size}px "Minecraft"`;
                if (options.shadow) {
                    ctx.fillStyle = `#${color.textshadow}`;
                    ctx.fillText(
                        part.substring(1),
                        Math.floor(options.x + position + offset),
                        Math.floor(adjustedy + offset)
                    );
                }
                ctx.fillStyle = `#${color.color}`;
                ctx.fillText(
                    part.substring(1),
                    Math.floor(options.x + position),
                    Math.floor(adjustedy)
                );
                position += ctx.measureText(part.substring(1)).width;
            }
        };


        const colors = {
            "0": {
                color: "000000",
                textshadow: "000000"
            },
            "1": {
                color: "0000AA",
                textshadow: "00002A"
            },
            "2": {
                color: "00AA00",
                textshadow: "002A00"
            },
            "3": {
                color: "00AAAA",
                textshadow: "002A2A"
            },
            "4": {
                color: "AA0000",
                textshadow: "2A0000"
            },
            "5": {
                color: "AA00AA",
                textshadow: "2A002A"
            },
            "6": {
                color: "FFAA00",
                textshadow: "2A2A00"
            },
            "7": {
                color: "AAAAAA",
                textshadow: "2A2A2A"
            },
            "8": {
                color: "555555",
                textshadow: "151515"
            },
            "9": {
                color: "5555FF",
                textshadow: "15153F"
            },
            a: {
                color: "55FF55",
                textshadow: "153F15"
            },
            b: {
                color: "55FFFF",
                textshadow: "153F3F"
            },
            c: {
                color: "FF5555",
                textshadow: "3F1515"
            },
            d: {
                color: "FF55FF",
                textshadow: "3F153F"
            },
            e: {
                color: "FFFF55",
                textshadow: "3F3F15"
            },
            f: {
                color: "FFFFFF",
                textshadow: "3F3F3F"
            }
        };


        // ok
        /**
         * 
         * @param {Discord.CommandInteraction<true>} message 
         * @param  {...any} args 
         * @returns 
         */
        bot.replyGracefully = async (message, ...args) => {
            // console.log(args, `defer: ${message.deferred} replied: ${message.replied}`);
            if (message.deferred) return message.editReply(...args);
            // if (message.deferred) return message.channel.send(...args);
            else if (message.replied) return message.followUp(...args);
            const reply = await message.reply(...args).catch(e => null);
            // const reply = await message.followUp(...args);
            // console.log(`args: `, args);
            // console.log(`reply: `, reply);
            return reply;
        }
        bot.sendPages = (message, embeds = [], page = 1, time) => {
            message.user = message.user || message.author;

            if (!message.channel.permissionsFor(message.guild.me).has(['SEND_MESSAGES', "ADD_REACTIONS", "MANAGE_MESSAGES", "ATTACH_FILES"])) {
                console.log(chalk.red(`[INVITE ERR] ${message.guild.name} invited the bot with missing perms`))
                return bot.replyGracefully(message, `:x: Hypixel Guild Bot has been added with the incorrect permissions. Please **reinvite** with correct permissions (<https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot>) **OR** you can assign the following permissions:\n\n\`+\` **SEND_MESSAGES**\n\`+\` **ADD_REACTIONS**\n\`+\` **MANAGE_MESSAGES**\n\`+\` **ATTACH_FILES**`).catch(e => {
                    console.log(chalk.red(`[INVITE ERR] ${message.guild.name} could not send invite error message.`))
                })
            }


            if (embeds.length == 1 || message.autoPost) return bot.replyGracefully(message, { embeds: [embeds[0]] }).catch(e => console.log(`error caught with no pages. deferred: ${message.deferred}`, e))
            bot.replyGracefully(message, { embeds: [embeds[page - 1]], fetchReply: true }).then(msg => {
                // console.log(`message: `, message);
                msg.react("◀️").then(r => {
                    msg.react("▶️").then(msg.react("⏹️"));

                    const stopFilter = (reaction, user) => reaction.emoji.name === "⏹️" && user.id == message.user.id;
                    const backwardsFilter = (reaction, user) => reaction.emoji.name === "◀️" && user.id == message.user.id;
                    const forwardsFilter = (reaction, user) => reaction.emoji.name === "▶️" && user.id == message.user.id;

                    const backwards = msg.createReactionCollector({
                        filter: backwardsFilter,
                        time
                    });
                    const forwards = msg.createReactionCollector({
                        filter: forwardsFilter,
                        time
                    });
                    const stop = msg.createReactionCollector({
                        filter: stopFilter,
                        time
                    });

                    stop.on("collect", r => msg.reactions.removeAll());
                    stop.on("end", r => msg.reactions.removeAll().catch(e => { }));

                    forwards.on("collect", r => {
                        if (page === embeds.length) page = 1;
                        else page++;
                        msg.edit({ embeds: [embeds[page - 1]] });
                        r.users.remove(message.user.id)
                    });

                    backwards.on("collect", r => {
                        if (page === 1) page = embeds.length;
                        else page--
                        msg.edit({ embeds: [embeds[page - 1]] });
                        r.users.remove(message.user.id)
                    });

                });
            }).catch(e => console.log(`error caught`, e));
        }
        bot.skin = (uuid, idLength) => {
            if (!idLength) idLength = 12;
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (var i = 0; i < idLength; i++) result += characters.charAt(Math.floor(Math.random() * characters.length));
            //return `https://crafatar.com/avatars/${uuid}?overlay&size=128`
            return `https://mc-heads.net/avatar/${uuid}/128`;
        }


        bot.wrappers = {
            hypixelPlayer: require('./wrappers/hypixelPlayer'),
            hypixelPlayers: require('./wrappers/hypixelPlayers'),
            hypixelGuild: require('./wrappers/hypixelGuild'),
            hypixelStatus: require('./wrappers/hypixelStatus'),
            sk1erLb: require('./wrappers/sk1erLb'),
            mojangPlayer: require('./wrappers/mojangPlayer'),
            slothpixelGuild: require('./wrappers/slothpixelGuild'),
            slothpixelPlayer: require('./wrappers/slothpixelPlayer'),
            slothpixelPlayers: require('./wrappers/slothpixelPlayers'),
            guildTracker: require('./wrappers/guildTracker.js'),
        }
        return bot;

    },
    ...rankFunctions
}

/*
  ranks stuff idkaoiudgb02qwpiasnfd
*/
