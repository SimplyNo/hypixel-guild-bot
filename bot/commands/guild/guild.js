const Discord = require("discord.js");
const MomentTZ = require("moment-timezone");
const Moment = require("moment");
const Constants = require("../../../constants");
const { SlashCommandBuilder } = require("@discordjs/builders");
module.exports = {
    name: "guild",
    aliases: ["g", "info"],
    cooldown: 5,
    description: "General guild stats.",
    usage: '<GUILD | -p IGN | @USER>',
    example: "Lucid",
    type: 'guild',
    autoPost: true,
    slash: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('General guild stats.')
        .addStringOption(option =>
            option
                .setName('query')
                .setRequired(false)
                .setDescription('Guild name or player name')
                .setAutocomplete(true))
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription(`Whether to search by player or by guild name`)
                .setRequired(false)
                .setChoices({ name: 'player', value: "player" }, { name: 'guild', value: "guild" })),
    async run(interaction, { serverConf }, bot) {
        const command = async () => {
            let user = await bot.getUser({ id: interaction.user.id }) || {}

            await interaction.deferReply();

            const query = interaction.options.getString("query", false);
            let memberCount = interaction.options.getString('count', false) ?? 15;
            const type = interaction.options.getString('type', false) ?? 'guild';
            if (type === 'guild' && query) {
                // set recently searched
                bot.addRecentSearch(interaction.user.id, query)
            }

            let guild;
            if (!query && !user) return bot.createErrorEmbed(interaction).setDescription("To use this command without arguments, verify by doing `/verify [username]`!").send();
            else if (!query) guild = await bot.wrappers.hypixelGuild.get((user.uuid), 'player', true);
            else if (type === "player") guild = await bot.wrappers.hypixelGuild.get((query), 'player', true);
            else if (type === "guild") guild = await bot.wrappers.hypixelGuild.get((query), 'name', true);

            if (guild.exists == false && !query) return bot.createErrorEmbed(interaction).setDescription("You are not in a guild!").send();
            if (guild.exists == false && type === 'guild') return bot.sendErrorEmbed(interaction, `No guild was found with the name \`${query}\`!`)
            if (guild.exists == false && type === 'player') return bot.sendErrorEmbed(interaction, `The player \`${query}\` is not in a guild!`)
            if (guild.outage) return bot.sendErrorEmbed(interaction, `There is a Hypixel API Outage, please try again within a few minutes`)

            const guildMaster = (guild.members || []).find(m => m.rank.match(/^guild\s*master$/i))
            const guildMasterProfile = await bot.wrappers.hypixelPlayer.get(guildMaster.uuid);

            const guildCreated = new MomentTZ(guild.createdAt).tz("America/New_York").format("MM/DD/YY HH:mm A");
            const emotes = bot.assets.emotes.games;
            const guildExpByGameType = guild.guildExpByGameType;

            let guildGames = [];
            let dates = Object.keys(guild.members[0].expHistory || {}).map(e => ({ key: e, date: new Date(`${e} EST`).setHours(0, 0, 0) }));
            let GEXPFormatted = [];
            let gexp = new Map();
            let ranks = null;

            let memberAverages = Object.fromEntries(dates.map(date => {
                let avg = guild.members.reduce((prev, curr) => prev + curr.expHistory[date.key] || 0, 0) / guild.members.length;
                return [date.key, Math.floor(avg)]
            }))
            // console.log(`preferred games:`, guild)
            if (guild.preferredGames) {
                guildGames = [];

                guild.preferredGames.forEach(game => {
                    let gameFormat = Constants.game_types.find(g => g.type_name === game)
                    let formattedGame = game;
                    if (gameFormat) {
                        formattedGame = `${emotes[gameFormat.standard_name.toLowerCase()] || emotes[gameFormat.database_name.toLowerCase()] || ''} ${gameFormat.clean_name}`;
                    }
                    // let formattedGame = game
                    //     .replace(/Arcade/, `${emotes.arcade} Arcade`)
                    //     .replace(/Arena/, `${emotes.arena} Arena`)
                    //     .replace(/BedWars/, `${emotes.bedwars} Bedwars`)
                    //     .replace(/Blitz/, `${emotes.blitz} Blitz SG`)
                    //     .replace(/BuildBattle/, `${emotes.buildbattle} Build Battle`)
                    //     .replace(/Classic/, `${emotes.classiclobby} Classic Games`)
                    //     .replace(/CvC/, `${emotes.cvc} Cops and Crims`)
                    //     .replace(/Duels/, `${emotes.duels} Duels`)
                    //     .replace(/Housing/, `${emotes.housing} Housing`)
                    //     .replace(/MegaWalls/, `${emotes.megawalls} Mega Walls`)
                    //     .replace(/MurderMystery/, `${emotes.murdermystery} Murder Mystery`)
                    //     .replace(/Paintball/, `${emotes.paintball} Paintball`)
                    //     .replace(/Pit/, `${emotes.smp} Pit`)
                    //     .replace(/Prototype/, `${emotes.prototype} Prototype`)
                    //     .replace(/Quake/, `${emotes.quake} Quakecraft`)
                    //     .replace(/Replay/, `Replay`)
                    //     .replace(/SMP/, `${emotes.pit} SMP`)
                    //     .replace(/SkyBlock/, `${emotes.skyblock} Skyblock`)
                    //     .replace(/SkyWars/, `${emotes.skywars} Skywars`)
                    //     .replace(/Smash/, `${emotes.smashheroes} Smash Heroes`)
                    //     .replace(/SpeedUHC/, `${emotes.speeduhc} Speed UHC`)
                    //     .replace(/TKR/, `${emotes.turbokartracers} Turbo Kart Racers`)
                    //     .replace(/TNT/, `${emotes.tntgames} TNT Games`)
                    //     .replace(/UHC/, `${emotes.uhc} UHC`)
                    //     .replace(/VampireZ/, `${emotes.vampirez} VampireZ`)
                    //     .replace(/WOOL_GAMES/, `Wool Games`)
                    //     .replace(/Walls/, `${emotes.walls} Walls`)
                    //     .replace(/Warlords/, `${emotes.warlords} Warlords`)
                    // let formattedGame = game
                    //     .replace(/QUAKECRAFT/, `${emotes.quake} Quakecraft`)
                    //     .replace(/Walls3/i, `${emotes.megawalls} Mega Walls`)
                    //     .replace(/WALLS/, `${emotes.walls} Walls`)
                    //     .replace(/PAINTBALL/, `${emotes.paintball} Paintball`)
                    //     .replace(/SURVIVAL_GAMES/, `${emotes.blitz} Blitz SG`)
                    //     .replace(/TNTGAMES/, `${emotes.tntgames} TNT Games`)
                    //     .replace(/VAMPIREZ/, `${emotes.vampirez} VampireZ`)
                    //     .replace(/ARCADE/, `${emotes.arcade} Arcade`)
                    //     .replace(/ARENA/, `${emotes.arena} Arena`)
                    //     .replace(/\bUHC\b/, `${emotes.uhc} UHC`)
                    //     .replace(/\bSPEED_UHC\b/, `${emotes.speeduhc} Speed UHC`)
                    //     .replace(/MCGO/, `${emotes.cvc} Cops and Crims`)
                    //     .replace(/BATTLEGROUND/, `${emotes.warlords} Warlords`)
                    //     .replace(/SUPER_SMASH/, `${emotes.smashheroes} Smash Heroes`)
                    //     .replace(/GINGERBREAD/, `${emotes.turbokartracers} Turbo Kart Racers`)
                    //     .replace(/HOUSING/, `${emotes.housing} Housing`)
                    //     .replace(/SKYWARS/, `${emotes.skywars} Skywars`)
                    //     .replace(/TRUE_COMBAT/, `${emotes.crazywalls} Crazy Walls`)
                    //     .replace(/SKYCLASH/, `${emotes.skyclash} SkyClash`)
                    //     .replace(/LEGACY/, `${emotes.classiclobby} Classic Games`)
                    //     .replace(/PROTOTYPE/, `${emotes.prototype} Prototype`)
                    //     .replace(/BEDWARS/, `${emotes.bedwars} Bedwars`)
                    //     .replace(/MURDER_MYSTERY/, `${emotes.murdermystery} Murder Mystery`)
                    //     .replace(/BUILD_BATTLE/, `${emotes.buildbattle} Build Battle`)
                    //     .replace(/DUELS/, `${emotes.duels} Duels`)
                    //     .replace(/SKYBLOCK/, `${emotes.skyblock} Skyblock`)
                    //     .replace(/PIT/, `${emotes.smp} Pit`)
                    //     .replace(/SMP/, `${emotes.pit} SMP`);
                    guildGames.push(`\`•\` ${formattedGame}\n`)
                })
            }

            const guildRanks = guild.ranks
            if (guildRanks) {
                ranks = []
                guildRanks.sort((a, b) => b.priority - a.priority)
                for (const rank of guildRanks) ranks.push(`\`•\` **${rank.name}** ${rank.tag ? `[${rank.tag}]` : ""}\n`);
            }

            for (let i = 0; i < 7; i++) GEXPFormatted.push(`\`•\` ${Moment(dates[i].date).format('MMM. Do')}: **\`${Math.floor((guild.scaledExpHistory[dates[i].key] || 0)).toLocaleString()}\`** | \`${(guild.expHistory[dates[i].key] || 0).toLocaleString()}\` | \`${memberAverages[dates[i].key].toLocaleString()}\`\n`)
            // GEXPFormatted.push(
            //     `\u200b\n`,
            //     `\`+\` Weekly: **${(guild.scaledExpHistory.weekly || 0).toLocaleString()}** | ${(guild.expHistory.weekly || 0).toLocaleString()}\n`,
            //     `\`+\` Monthly: **${(guild.scaledExpHistory.monthly || 0).toLocaleString()}** | ${(guild.expHistory.monthly || 0).toLocaleString()}\n`,
            // )
            // console.log(guild.id)
            const embed = {
                title: `${Discord.Util.escapeMarkdown(`${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`)}`,
                thumbnail: `https://hypixel.paniek.de/guild/${guild.id || guild._id}/banner.png`,
                description: `${guild.description || ""}`,
                icon: bot.assets.hypixel.guild,
                color: guild.tagColor.hex,
                footer: true
            }
            const total = Object.values(guildExpByGameType).reduce((prev, curr) => prev + curr, 0)
            console.log(guildExpByGameType)
            const games = Constants.game_types.filter(g => guildExpByGameType[g.standard_name] === 0 || guildExpByGameType[g.type_name]).map(game => ({
                name: `${emotes[game.standard_name.toLowerCase()] || emotes[game.database_name.toLowerCase()] || ''} ${game.clean_name}`,
                value: guildExpByGameType[game.type_name]
            }))
            console.log('games', games)
            // const games = [
            //     { name: `${emotes.quake} Quakecraft`, value: guildExpByGameType.QUAKECRAFT },
            //     { name: `${emotes.walls} Walls`, value: guildExpByGameType.WALLS },
            //     { name: `${emotes.paintball} Paintball`, value: guildExpByGameType.PAINTBALL },
            //     { name: `${emotes.blitz} Blitz SG`, value: guildExpByGameType.SURVIVAL_GAMES },
            //     { name: `${emotes.tntgames} TNT Games`, value: guildExpByGameType.TNTGAMES },
            //     { name: `${emotes.vampirez} VampireZ`, value: guildExpByGameType.VAMPIREZ },
            //     { name: `${emotes.megawalls} Mega Walls`, value: guildExpByGameType.WALLS3 },
            //     { name: `${emotes.arcade}Arcade`, value: guildExpByGameType.ARCADE },
            //     { name: `${emotes.arena} Arena Brawl`, value: guildExpByGameType.ARENA },
            //     { name: `${emotes.cvc} Cops and Crims`, value: guildExpByGameType.MCGO },
            //     { name: `${emotes.uhc} UHC`, value: guildExpByGameType.UHC },
            //     { name: `${emotes.warlords} Warlords`, value: guildExpByGameType.BATTLEGROUND },
            //     { name: `${emotes.smashheroes} Smash Heroes`, value: guildExpByGameType.SUPER_SMASH },
            //     { name: `${emotes.turbokartracers} Turbo Kart Racers`, value: guildExpByGameType.GINGERBREAD },
            //     { name: `${emotes.housing} Housing`, value: guildExpByGameType.HOUSING },
            //     { name: `${emotes.skywars} Skywars`, value: guildExpByGameType.SKYWARS },
            //     { name: `${emotes.speeduhc} Speed UHC`, value: guildExpByGameType.SPEED_UHC },
            //     { name: `${emotes.prototype} Prototype`, value: guildExpByGameType.PROTOTYPE },
            //     { name: `${emotes.bedwars} Bedwars`, value: guildExpByGameType.BEDWARS },
            //     { name: `${emotes.murdermystery} Murder Mystery`, value: guildExpByGameType.MURDER_MYSTERY },
            //     { name: `${emotes.buildbattle} Build Battle`, value: guildExpByGameType.BUILD_BATTLE },
            //     { name: `${emotes.duels} Duels`, value: guildExpByGameType.DUELS }
            // ]
            let pages = [
                {
                    author: "Guild Overall Stats",
                    fields: [
                        { name: "Guild Master", value: `${guildMaster ? `${!user.emojiRanks || user.emojiRanks == "true" ? guildMasterProfile.emojiRank : `**[${guildMaster.displayName.split(" ")[0].replace(/§1|§2|§3|§4|§5|§6|§7|§8|§9|§0|§a|§b|§c|§d|§e|§f|§k|§r|§l|§|\[|\]/g, "")}]**`} **${Discord.Util.escapeMarkdown(guildMaster.username)}**` : "Error"}`, options: { escapeFormatting: true } },
                        { name: "Created", value: `<t:${Math.floor(guild.created / 1000)}:R>`, options: { escapeFormatting: true } },
                        { name: "Members", value: `${guild.members.length || 0}/125` },
                        { name: "Level", value: guild.level },
                        { name: "GEXP to Next Level", value: `${(guild.expNeeded - guild.expToNextLevel).toLocaleString()} / ${guild.expNeeded.toLocaleString()}` },
                        { name: "Total Experience", value: guild.exp },
                        {
                            name: "GEXP History (Scaled | Raw | Member Average)", value: `${GEXPFormatted.join("")}
\`•\` Weekly: **\`${(Object.values(guild.scaledExpHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()}\`** | \`${(Object.values(guild.expHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()}\`\n   `, options: { inline: false, escapeFormatting: true }
                        },

                    ]
                },
                {
                    author: "Misc Guild Stats",
                    fields: [
                        {
                            name: "Ranks", value: ranks ? ranks.join("") : "\`None\`", options: { escapeFormatting: true }
                        },
                        { name: "Preferred Games", value: guildGames.length > 0 ? guildGames.join("") : "\`None\`", options: { escapeFormatting: true } },
                    ]
                },
                {
                    author: "GEXP by Game",
                    description: games.sort((a, b) => b.value - a.value).map(e => `\`•\` **${e.name}**: \`${e.value.toLocaleString()}\` (${Math.floor((e.value / total) * 10000) / 100}%)`).join('\n'),


                }
            ]

            if (guild.coinsEver) pages[1].fields.unshift({ name: "Lifetime Guild Coins (Legacy)", value: guild.coinsEver })
            if (guild.coins) pages[1].fields.unshift({ name: "Current Guild Coins (Legacy)", value: guild.coins })
            if (guild.legacyPositions) pages[1].fields.unshift({ name: "Legacy Ranking", value: `#${(guild.legacyPositions).toLocaleString()}` })

            const embeds = bot.pageEmbedMaker(embed, pages)
            bot.sendPages(interaction, embeds)
        }
        command()

    },
    async execute(message, args, bot) {
        const command = async () => {
            let user = await bot.getUser({ id: message.author.id }) || {}
            if (args[0] == "-p") {
                if (!args[1]) return bot.sendErrorEmbed(message, `You did not include a user to check the guild of`)
                let guild = await bot.wrappers.hypixelGuild.get((args[1]), "player", true)
            } else {
                if (!args[0]) {
                    if (!user.uuid) return bot.sendErrorEmbed(message, `You did not include a guild to check`)

                    let guild = await bot.wrappers.hypixelGuild.get((user.uuid), "player", true)
                } else if (args[0].match(/<@.?[0-9]*?>/)) {
                    let mentionedID = args[0].replace(/!/g, '').slice(2, -1)
                    let mentioned = await bot.getUser({ id: mentionedID })
                    if (!mentioned) return bot.sendErrorEmbed(message, `You did not include a guild to check`)
                    let guild = await bot.wrappers.hypixelGuild.get((mentioned.uuid), "player", true)
                } else var guild = await bot.wrappers.hypixelGuild.get((args.join(" ")), "name", true)
            }
            // console.log(guild)
            if (guild.exists == false) return bot.sendErrorEmbed(message, `We couldn't find a guild with the information you gave us.`)
            if (guild.outage) return bot.sendErrorEmbed(message, `There is a Hypixel API Outage, please try again within a few minutes`)

            const guildMaster = (guild.members || []).find(m => m.rank.match(/^guild\s*master$/i))
            const guildMasterProfile = await bot.wrappers.hypixelPlayer.get(guildMaster.uuid);
            const guildCreated = new MomentTZ(guild.createdAt).tz("America/New_York").format("MM/DD/YY HH:mm A");
            const emotes = bot.assets.emotes.games;
            const guildExpByGameType = guild.guildExpByGameType;

            let guildGames = [];
            let dates = Object.keys(guild.members[0].expHistory || {}).map(e => ({ key: e, date: new Date(`${e} EST`).setHours(0, 0, 0) }));
            let GEXPFormatted = [];
            let gexp = new Map();
            let ranks = null;

            let memberAverages = Object.fromEntries(dates.map(date => {
                let avg = guild.members.reduce((prev, curr) => prev + curr.expHistory[date.key] || 0, 0) / guild.members.length;
                return [date.key, Math.floor(avg)]
            }))

            if (guild.preferredGames) {
                guildGames = [];

                guild.preferredGames.forEach(game => {
                    let gameFormat = Constants.game_types.find(g => g.clean_name === game)
                    let formattedGame = game;
                    if (gameFormat) {
                        formattedGame = `${emotes[gameFormat.standard_name.toLowerCase()] || emotes[gameFormat.database_name.toLowerCase()] || ''} ${gameFormat.clean_name}`;
                    }
                    // let formattedGame = game
                    //     .replace(/Arcade/, `${emotes.arcade} Arcade`)
                    //     .replace(/Arena/, `${emotes.arena} Arena`)
                    //     .replace(/BedWars/, `${emotes.bedwars} Bedwars`)
                    //     .replace(/Blitz/, `${emotes.blitz} Blitz SG`)
                    //     .replace(/BuildBattle/, `${emotes.buildbattle} Build Battle`)
                    //     .replace(/Classic/, `${emotes.classiclobby} Classic Games`)
                    //     .replace(/CvC/, `${emotes.cvc} Cops and Crims`)
                    //     .replace(/Duels/, `${emotes.duels} Duels`)
                    //     .replace(/Housing/, `${emotes.housing} Housing`)
                    //     .replace(/MegaWalls/, `${emotes.megawalls} Mega Walls`)
                    //     .replace(/MurderMystery/, `${emotes.murdermystery} Murder Mystery`)
                    //     .replace(/Paintball/, `${emotes.paintball} Paintball`)
                    //     .replace(/Pit/, `${emotes.smp} Pit`)
                    //     .replace(/Prototype/, `${emotes.prototype} Prototype`)
                    //     .replace(/Quake/, `${emotes.quake} Quakecraft`)
                    //     .replace(/Replay/, `Replay`)
                    //     .replace(/SMP/, `${emotes.pit} SMP`)
                    //     .replace(/SkyBlock/, `${emotes.skyblock} Skyblock`)
                    //     .replace(/SkyWars/, `${emotes.skywars} Skywars`)
                    //     .replace(/Smash/, `${emotes.smashheroes} Smash Heroes`)
                    //     .replace(/SpeedUHC/, `${emotes.speeduhc} Speed UHC`)
                    //     .replace(/TKR/, `${emotes.turbokartracers} Turbo Kart Racers`)
                    //     .replace(/TNT/, `${emotes.tntgames} TNT Games`)
                    //     .replace(/UHC/, `${emotes.uhc} UHC`)
                    //     .replace(/VampireZ/, `${emotes.vampirez} VampireZ`)
                    //     .replace(/WOOL_GAMES/, `Wool Games`)
                    //     .replace(/Walls/, `${emotes.walls} Walls`)
                    //     .replace(/Warlords/, `${emotes.warlords} Warlords`)
                    // let formattedGame = game
                    //     .replace(/QUAKECRAFT/, `${emotes.quake} Quakecraft`)
                    //     .replace(/Walls3/i, `${emotes.megawalls} Mega Walls`)
                    //     .replace(/WALLS/, `${emotes.walls} Walls`)
                    //     .replace(/PAINTBALL/, `${emotes.paintball} Paintball`)
                    //     .replace(/SURVIVAL_GAMES/, `${emotes.blitz} Blitz SG`)
                    //     .replace(/TNTGAMES/, `${emotes.tntgames} TNT Games`)
                    //     .replace(/VAMPIREZ/, `${emotes.vampirez} VampireZ`)
                    //     .replace(/ARCADE/, `${emotes.arcade} Arcade`)
                    //     .replace(/ARENA/, `${emotes.arena} Arena`)
                    //     .replace(/\bUHC\b/, `${emotes.uhc} UHC`)
                    //     .replace(/\bSPEED_UHC\b/, `${emotes.speeduhc} Speed UHC`)
                    //     .replace(/MCGO/, `${emotes.cvc} Cops and Crims`)
                    //     .replace(/BATTLEGROUND/, `${emotes.warlords} Warlords`)
                    //     .replace(/SUPER_SMASH/, `${emotes.smashheroes} Smash Heroes`)
                    //     .replace(/GINGERBREAD/, `${emotes.turbokartracers} Turbo Kart Racers`)
                    //     .replace(/HOUSING/, `${emotes.housing} Housing`)
                    //     .replace(/SKYWARS/, `${emotes.skywars} Skywars`)
                    //     .replace(/TRUE_COMBAT/, `${emotes.crazywalls} Crazy Walls`)
                    //     .replace(/SKYCLASH/, `${emotes.skyclash} SkyClash`)
                    //     .replace(/LEGACY/, `${emotes.classiclobby} Classic Games`)
                    //     .replace(/PROTOTYPE/, `${emotes.prototype} Prototype`)
                    //     .replace(/BEDWARS/, `${emotes.bedwars} Bedwars`)
                    //     .replace(/MURDER_MYSTERY/, `${emotes.murdermystery} Murder Mystery`)
                    //     .replace(/BUILD_BATTLE/, `${emotes.buildbattle} Build Battle`)
                    //     .replace(/DUELS/, `${emotes.duels} Duels`)
                    //     .replace(/SKYBLOCK/, `${emotes.skyblock} Skyblock`)
                    //     .replace(/PIT/, `${emotes.smp} Pit`)
                    //     .replace(/SMP/, `${emotes.pit} SMP`);
                    guildGames.push(`\`•\` ${formattedGame}\n`)
                })
            }

            const guildRanks = guild.ranks
            if (guildRanks) {
                ranks = []
                guildRanks.sort((a, b) => b.priority - a.priority)
                for (const rank of guildRanks) ranks.push(`\`•\` **${rank.name}** ${rank.tag ? `[${rank.tag}]` : ""}\n`);
            }

            for (let i = 0; i < 7; i++) GEXPFormatted.push(`\`•\` ${Moment(dates[i].date).format('MMM. Do')}: **\`${Math.floor((guild.scaledExpHistory[dates[i].key] || 0)).toLocaleString()}\`** | \`${(guild.expHistory[dates[i].key] || 0).toLocaleString()}\` | \`${memberAverages[dates[i].key].toLocaleString()}\`\n`)
            // GEXPFormatted.push(
            //     `\u200b\n`,
            //     `\`+\` Weekly: **${(guild.scaledExpHistory.weekly || 0).toLocaleString()}** | ${(guild.expHistory.weekly || 0).toLocaleString()}\n`,
            //     `\`+\` Monthly: **${(guild.scaledExpHistory.monthly || 0).toLocaleString()}** | ${(guild.expHistory.monthly || 0).toLocaleString()}\n`,
            // )
            // console.log(guild.id)
            const embed = {
                title: `${Discord.Util.escapeMarkdown(`${guild.name} ${guild.tag ? `[${guild.tag}]` : ""}`)}`,
                thumbnail: `https://hypixel.paniek.de/guild/${guild.id || guild._id}/banner.png`,
                description: `${guild.description || ""}`,
                icon: bot.assets.hypixel.guild,
                color: guild.tagColor.hex,
                footer: true
            }
            const total = Object.values(guildExpByGameType).reduce((prev, curr) => prev + curr, 0)
            const games = Constants.game_types.filter(g => guildExpByGameType[g.standard_name] === 0 || guildExpByGameType[g.standard_name]).map(game => ({
                name: `${emotes[game.standard_name.toLowerCase()] || emotes[game.database_name.toLowerCase()] || ''} ${game.clean_name}`,
                value: guildExpByGameType[game.standard_name]
            }))
            // const games = [
            //     { name: `${emotes.quake} Quakecraft`, value: guildExpByGameType.QUAKECRAFT },
            //     { name: `${emotes.walls} Walls`, value: guildExpByGameType.WALLS },
            //     { name: `${emotes.paintball} Paintball`, value: guildExpByGameType.PAINTBALL },
            //     { name: `${emotes.blitz} Blitz SG`, value: guildExpByGameType.SURVIVAL_GAMES },
            //     { name: `${emotes.tntgames} TNT Games`, value: guildExpByGameType.TNTGAMES },
            //     { name: `${emotes.vampirez} VampireZ`, value: guildExpByGameType.VAMPIREZ },
            //     { name: `${emotes.megawalls} Mega Walls`, value: guildExpByGameType.WALLS3 },
            //     { name: `${emotes.arcade}Arcade`, value: guildExpByGameType.ARCADE },
            //     { name: `${emotes.arena} Arena Brawl`, value: guildExpByGameType.ARENA },
            //     { name: `${emotes.cvc} Cops and Crims`, value: guildExpByGameType.MCGO },
            //     { name: `${emotes.uhc} UHC`, value: guildExpByGameType.UHC },
            //     { name: `${emotes.warlords} Warlords`, value: guildExpByGameType.BATTLEGROUND },
            //     { name: `${emotes.smashheroes} Smash Heroes`, value: guildExpByGameType.SUPER_SMASH },
            //     { name: `${emotes.turbokartracers} Turbo Kart Racers`, value: guildExpByGameType.GINGERBREAD },
            //     { name: `${emotes.housing} Housing`, value: guildExpByGameType.HOUSING },
            //     { name: `${emotes.skywars} Skywars`, value: guildExpByGameType.SKYWARS },
            //     { name: `${emotes.speeduhc} Speed UHC`, value: guildExpByGameType.SPEED_UHC },
            //     { name: `${emotes.prototype} Prototype`, value: guildExpByGameType.PROTOTYPE },
            //     { name: `${emotes.bedwars} Bedwars`, value: guildExpByGameType.BEDWARS },
            //     { name: `${emotes.murdermystery} Murder Mystery`, value: guildExpByGameType.MURDER_MYSTERY },
            //     { name: `${emotes.buildbattle} Build Battle`, value: guildExpByGameType.BUILD_BATTLE },
            //     { name: `${emotes.duels} Duels`, value: guildExpByGameType.DUELS }
            // ]
            let pages = [
                {
                    author: "Guild Overall Stats",
                    fields: [
                        { name: "Guild Master", value: `${guildMaster ? `${!user.emojiRanks || user.emojiRanks == "true" ? guildMasterProfile.emojiRank : `**[${guildMaster.displayName.split(" ")[0].replace(/§1|§2|§3|§4|§5|§6|§7|§8|§9|§0|§a|§b|§c|§d|§e|§f|§k|§r|§l|§|\[|\]/g, "")}]**`} **${Discord.Util.escapeMarkdown(guildMaster.username)}**` : "Error"}`, options: { escapeFormatting: true } },
                        { name: "Created", value: `<t:${Math.floor(guild.created / 1000)}:R>`, options: { escapeFormatting: true } },
                        { name: "Members", value: `${guild.members.length || 0}/125` },
                        { name: "Level", value: guild.level },
                        { name: "GEXP to Next Level", value: `${(guild.expNeeded - guild.expToNextLevel).toLocaleString()} / ${guild.expNeeded.toLocaleString()}` },
                        { name: "Total Experience", value: guild.exp },
                        { name: "GEXP History (Scaled | Raw | Member Average)", value: GEXPFormatted.join(""), options: { inline: false, escapeFormatting: true } },
                        { name: "\u200b", value: `\`•\` Weekly: **${(Object.values(guild.scaledExpHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()}** | ${(Object.values(guild.expHistory).reduce((p, c) => p + c, 0) || 0).toLocaleString()}\n   `, options: { inline: true, escapeFormatting: true } },

                    ]
                },
                {
                    author: "Misc Guild Stats",
                    fields: [
                        {
                            name: "Ranks", value: ranks ? ranks.join("") : "\`None\`", options: { escapeFormatting: true }
                        },
                        { name: "Preferred Games", value: guildGames.length > 0 ? guildGames.join("") : "\`None\`", options: { escapeFormatting: true } },
                    ]
                },
                {
                    author: "GEXP by Game",
                    description: games.sort((a, b) => b.value - a.value).map(e => `\`•\` **${e.name}**: \`${e.value.toLocaleString()}\` (${Math.floor((e.value / total) * 10000) / 100}%)`).join('\n'),


                }
            ]

            if (guild.coinsEver) pages[1].fields.unshift({ name: "Lifetime Guild Coins (Legacy)", value: guild.coinsEver })
            if (guild.coins) pages[1].fields.unshift({ name: "Current Guild Coins (Legacy)", value: guild.coins })
            if (guild.legacyPositions) pages[1].fields.unshift({ name: "Legacy Ranking", value: `#${(guild.legacyPositions).toLocaleString()}` })

            const embeds = bot.pageEmbedMaker(embed, pages)
            bot.sendPages(message, embeds)
        }
        command()

    },
}   