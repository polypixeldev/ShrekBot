require('./keepalive.js')();

const Discord = require('discord.js');

const client = new Discord.Client({ intents: ["GUILD_MESSAGES", "GUILDS"] });

client.commands = new Discord.Collection();
client.events = new Discord.Collection();

['command_handler', 'event_handler'].forEach(handler =>{
    require(`./handlers/${handler}`)(Discord, client);
});

client.login(process.env.DISCORD_TOKEN);
