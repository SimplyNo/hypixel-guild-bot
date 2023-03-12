const assets = require('../../assets/assets.json');
const rankFunctions = {
  getRank: json => {
    let rank = 'NON';
    if (!json) return `[${rank}]`;
    if (json.monthlyPackageRank || json.packageRank || json.newPackageRank) {
      if (json.monthlyPackageRank == "SUPERSTAR") rank = replaceRank(json.monthlyPackageRank);
      else {
        if (json.packageRank && json.newPackageRank) rank = replaceRank(json.newPackageRank);
        else rank = replaceRank(json.packageRank || json.newPackageRank);
      }
    }
    if (json.rank && json.rank != 'NORMAL') rank = json.rank.replace('MODERATOR', 'MOD');
    if (json.prefix) rank = json.prefix.replace(/§.|\[|]/g, '');
    if (rank == "YOUTUBER") rank = "YOUTUBE"

    function replaceRank(toReplace) {
      return toReplace
        .replace('SUPERSTAR', "MVP++")
        .replace('VIP_PLUS', 'VIP+')
        .replace('MVP_PLUS', 'MVP+')
        .replace('NONE', 'NON');
    }

    return `[${rank}]`;
  },
  getRankSlothPixel: json => {
    let rank = 'NON';
    if (!json) return `[${rank}]`;
    if (json.rank) rank = replaceRank(json.rank);


    // if (json.monthlyPackageRank || json.packageRank || json.newPackageRank || json.rank) {
    //   if (json.rank == "SUPERSTAR" || json.rank == "MVP_PLUS_PLUS") rank = replaceRank(json.rank);
    //   else {
    //     if (json.packageRank && json.newPackageRank) rank = replaceRank(json.rank);
    //     else rank = replaceRank(json.rank);
    //   }
    // }
    // if (json.rank && json.rank != 'NORMAL') rank = json.rank.replace('MODERATOR', 'MOD');
    if (json.prefix) rank = json.prefix.replace(/§.|\[|]/g, '');
    if (rank == "YOUTUBER") rank = "YOUTUBE"
    // console.log("json rank" + json.rank)
    // console.log("RANK: " + rank)
    function replaceRank(toReplace) {
      return toReplace
        .replace('MVP_PLUS_PLUS', "MVP++")
        .replace('SUPERSTAR', "MVP++")
        .replace('VIP_PLUS', 'VIP+')
        .replace('MVP_PLUS', 'MVP+')
        .replace('NONE', 'NON');
    }

    return `[${rank}]`;
  },
  getSk1erRank: (rank) => {
    return rank
      .replace('MVP_PLUS_PLUS', 'MVP++')
      .replace('MVP_PLUS', 'MVP+')
      .replace('VIP_PLUS', 'VIP+')
      .replace('NONE', '')
  },
  getPlusColor: (plus, rank) => {
    let rankColor = '#BAB6B6'
    if (plus == undefined || rank == '[PIG+++]') {
      rankColor = {
        '[MVP+]': '#FF5555',
        '[MVP++]': '#FF5555',
        '[VIP+]': '#FFAA00',
        '[PIG+++]': '#55FFFF'
      }[rank]
      if (!rankColor) rankColor = '#BAB6B6'
    } else {
      rankColor = {
        RED: '#FF5555',
        GOLD: '#FFAA00',
        GREEN: '#55FF55',
        YELLOW: '#FFFF55',
        LIGHT_PURPLE: '#FF55FF',
        WHITE: '#F2F2F2',
        BLUE: '#5555FF',
        DARK_GREEN: '#00AA00',
        DARK_RED: '#AA0000',
        DARK_AQUA: '#00AAAA',
        DARK_PURPLE: '#AA00AA',
        DARK_GRAY: '#555555',
        BLACK: '#000000'
      }[plus]
      if (!rankColor) rankColor = '#BAB6B6'
    }
    return rankColor;
  },
  colorCodeToColor: code => {
    return {
      '§c': "RED",
      '§6': "GOLD",
      '§a': "GREEN",
      '§e': "YELLOW",
      '§d': "LIGHT_PURPLE",
      '§f': "WHITE",
      '§9': "BLUE",
      '§1': "DARK_BLUE",
      '§2': "DARK_GREEN",
      '§4': "DARK_RED",
      '§3': "DARK_AQUA",
      '§5': "DARK_PURPLE",
      '§7': "GRAY",
      '§8': "DARK_GRAY",
      '§0': "BLACK"
    }[code]
  },
  getPlusColorObject: (data) => {
    let id = rankFunctions.colorCodeToColor(data.color);
    return {
      id: id,
      code: data.color,
      hex: rankFunctions.getPlusColor(id, data.rank)
    }
  },

  getEmojiRank: player => {
    const {
      ranks
    } = assets

    // console.log(player.plusColor.id)
    var rank = player.rank.slice(1, -1)
    if (rank == "MVP+") return ranks["MVP+"].START.join("") + (ranks["MVP+"][player.plusColor.id || "RED"].join(""))
    else if (rank == "MVP++") {
      if (player.monthlyRankColor == "AQUA") return ranks["MVP++"].AQUA.START.join("") + ranks["MVP++"].AQUA[player.plusColor.id || "RED"].join("")
      return ranks["MVP++"].GOLD.START.join("") + ranks["MVP++"].GOLD[player.plusColor.id || "RED"].join("")
    } else {
      if (ranks[rank]) return ranks[rank].join("")
      return "[NON]"
    }
  },

  getEmojiRankStatsify: player => {
    const {
      ranks
    } = assets


    // console.log(player.plusColor.id)
    // console.log(`pluscollor: ${player.plusColor}`)
    var rank = player.rank.slice(1, -1)
    // console.log(rank)
    if (rank == "MVP+") return ranks["MVP+"].START.join("") + (ranks["MVP+"][player.plusColor.id || "RED"].join(""))
    else if (rank == "MVP++") return ranks["MVP++"].GOLD.START.join("") + ranks["MVP++"].GOLD[player.plusColor.id || "RED"].join("")
    else if (rank == "bMVP++") return ranks["MVP++"].AQUA.START.join("") + ranks["MVP++"].AQUA[player.plusColor.id || "RED"].join("")
    else {
      if (ranks[rank]) return ranks[rank].join("")
      return "[NON]"
    }
  },

  getEmojiRankFromFormatted: (rank = "", name) => {
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
  },
  getPlusColorMC: (rank, plus) => {
    var rankColor;
    if (plus == undefined || rank == '[PIG+++]') {
      rankColor = {
        '[MVP+]': '§c',
        '[MVP++]': '§c',
        '[VIP+]': '§6',
        '[PIG+++]': '§b'
      }[rank]
      if (!rankColor) return '§7'
    } else {
      rankColor = {
        RED: '§c',
        GOLD: '§6',
        GREEN: '§a',
        YELLOW: '§e',
        LIGHT_PURPLE: '§d',
        WHITE: '§f',
        BLUE: '§9',
        DARK_GREEN: '§2',
        DARK_RED: '§4',
        DARK_AQUA: '§3',
        DARK_PURPLE: '§5',
        DARK_GRAY: '§8',
        BLACK: '§0'
      }[plus]
      if (!rankColor) return '§7'
    }
    return rankColor;
  },
  genRandomColor: () => {
    let colors = ["#006400", "#00ff00", "#008000"]
    return colors[Math.floor(Math.random() * colors.length)]
  },
  getFormattedRank: (rank, color) => {
    rank = {
      '[MVP+]': `§b[MVP${color}+§b]`,
      '[MVP++]': `§6[MVP${color}++§6]`,
      '[MVP]': '§b[MVP]',
      '[VIP+]': `§a[VIP${color}+§a]`,
      '[VIP]': `§a[VIP]`,
      '[YOUTUBE]': `§c[§fYOUTUBE§c]`,
      '[PIG+++]': `§d[PIG${color}+++§d]`,
      '[HELPER]': `§9[HELPER]`,
      '[MOD]': `§2[MOD]`,
      '[ADMIN]': `§c[ADMIN]`,
      '[OWNER]': `§c[OWNER]`,
      '[SLOTH]': `§c[SLOTH]`,
      '[ANGUS]': `§c[ANGUS]`,
      '[APPLE]': '§6[APPLE]',
      '[MOJANG]': `§6[MOJANG]`,
      '[BUILD TEAM]': `§3[BUILD TEAM]`
    }[rank]
    if (!rank) return `§7`
    return rank
  }
}
module.exports = {
  ...rankFunctions
}