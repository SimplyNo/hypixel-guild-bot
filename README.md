<div align="center">

<img src="https://i.imgur.com/rSHFZuM.png" alt="logo" />

A Discord Bot for managing and viewing Hypixel Guilds!

[Invite the Bot](https://discord.com/oauth2/authorize?client_id=684986294459564042&permissions=469888080&scope=bot)

[Join the Support Server](https://discord.gg/BgWcvKf)
</div>

## 🤖 Bot Features
### 😎 Current!
- Lookup guild stats of players and guilds (/guild, /member, /list, /weekly, /daily)
- Log member joins/leaves (/joinlogs)
- Rename Discord members to Username (/verifyconfig)
- Automatically send guild stat commands for tracking (/autopost)
- Set game stat requirements for the guild (/requirements, /reqcheck)
- Syncronize guild ranks with Discord roles (/autorole, /timeroles, /gxproles)
- Syncronize Hypixel ranks with Discord roles (/rankroles)

### 📝 Planned...
- More detailed logging
- Compare guilds
- Historical guild stats w/ graphs
- Guild Applications
- More role links
- Inactive requests

## 💻 Running Locally
#### ⚠ Disclaimer: Currently, emoji rank visibility will likely be lost when running locally.
- Ensure you have a working version of [Node 16](https://nodejs.org/en/blog/release/v16.16.0), [MongoDB](https://www.mongodb.com/docs/manual/installation/), and [Redis](https://redis.io) installed.
- Clone the repository: `git clone https://github.com/SimplyNo/hypixel-guild-bot.git`.
- Install dependencies: `npm i`.
- Setup the `config.json` file according to `config.schema.json`. 
    - Here are the main values you should be worrying about:
```
{
  "version": "3.2.0",
  "env": "PROD",        --> "ENV" or "PROD"
  "mongo": "",          --> MongoDB URI e.g. mongodb://localhost/hypixelguildbot
  "hypixel_key": "",    --> Hypixel API key
  "token": "",          --> The Discord Bot Token
  "slothpixel_key": "", --> (OPTIONAL) Slothpixel API key if you have one
  "client_id": "",      --> Your bot's client (user) ID
  ...
  }
```
- Deploy slash commands with `npm run deploy`.
- Start the bot with `npm start`, and you're done! 😎

## 🙏 Contributing
- Contributions are greatly appreciated!
- Please follow contribution guidelines in [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md).

## 🙋‍️Questions or Need Help?
- Join the [support server](https://discord.gg/BgWcvKf) or [DM me](https://discord.com/users/280466694663831553) (`SimplyNo#8524`). I'm always happy to help!
