const moment = require('moment');
const Discord = require("discord.js");

const autorole = require("../../util/intervals/autorole");

module.exports = {
  name: 'eval',
  description: 'Evaluate JavaScript',
  args: true,
  devOnly: true,
  async execute(message, args, bot) {

    const evalUnformatted = message.content.replace(/(^(?:<.{1,2}\d{18}>)? ?eval)/, "");
    const evalFormatted = evalUnformatted.match(/```(?:js)*(.*)```$/ms)?.[1] || evalUnformatted;
    console.log(evalFormatted)
    try {
      let actualEval = await eval("(async () => {" + evalFormatted + "})()");

      var evalEmbed = bot.createEmbed()
        .setTitle(` Successful Evaluation.`)
        .setDescription(` Output Type: **${typeOf(eval(actualEval))}**\n`)
        .addFields({
          name: `:inbox_tray: Input ->`,
          value: `\`\`\`js\n${evalFormatted}\n\`\`\``,
          inline: false
        }, {
          name: `:outbox_tray: Output ->`,
          value: `\`\`\`js\n${actualEval}\`\`\``,
          inline: false
        })
      message.reply({ embeds: [evalEmbed] });
    } catch (e) {

      let evalEmbed = bot.createEmbed()
        .setTitle(` Unsuccessful Evaluation`)
        .addFields({
          name: `:inbox_tray: Input ->`,
          value: `\`\`\`js\n${evalFormatted}\`\`\``,
          inline: false
        }, {
          name: `:outbox_tray: Output (ERROR) ->`,
          value: `\`\`\`js\n${e} \`\`\``,
          inline: false
        })
      message.reply({ embeds: [evalEmbed] });
      return;
    }

  },
};

function typeOf(obj) {
  return {}.toString
    .call(obj)
    .split(" ")[1]
    .slice(0, -1)
    .toLowerCase();
}