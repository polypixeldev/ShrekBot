// discord.js import
const Discord = require('discord.js');
// node-fetch for making HTTP requests
const fetch = require('node-fetch');

//keepalive function
const keepalive = require('./keepalive.js')();

// initialize client
const client = new Discord.Client({intents: ["GUILD_MESSAGES", "GUILDS"]});
// my model URL
const MODEL = 'shrek-medium'

const API_URL = `https://api-inference.huggingface.co/models/Poly-Pixel/${MODEL}`;

// log out some info
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// when the bot receives a message
// need async message because we are making HTTP requests
let loading = false;
client.on('message', async message => {
    // ignore messages from the bot itself
    if (message.author.bot || message.author.system || message.cleanContent === '') {
        return;
    }
    // form the payload
    const payload = {
        inputs: {
            text: message.cleanContent
        }
    };
    // form the request headers with Hugging Face API key
    const headers = {
        'Authorization': 'Bearer ' + process.env.HUGGINGFACE_TOKEN
    };
    
    // set status to typing
    message.channel.startTyping();
    // query the server
    const response = await fetch(API_URL, {
        method: 'post',
        body: JSON.stringify(payload),
        headers: headers
    });
    const data = await response.json();
    let botResponse = '';
    if (data.hasOwnProperty('generated_text')) {
        botResponse = data.generated_text;
    } else if (data.hasOwnProperty('error')) { // error condition
        console.log(data)
        let embed;
        if(data.error === `Model Poly-Pixel/${MODEL} is currently loading`){
          if(loading === false){
            embed = new Discord.MessageEmbed()
            .setColor(0x00FF00)
            .setDescription(`Shrek will be at the swamp soon... \n \n Est. Time left: \`${data.estimated_time}\``) 
            
            message.react('⏲')
            loading = true;
          } else {
            message.react('⏲')
            return;
          }
        } else {
          embed = new Discord.MessageEmbed()
          .setColor(0xFF0000)
          .setDescription(data.error)
        }
        botResponse = embed;
    }

    if(botResponse.length > 2000){
      botResponse = botResponse.slice(0, 1986)
      botResponse = botResponse + "`(truncated)`"
    }

    // send message to channel as a reply
    message.channel.stopTyping()
    if(botResponse.trim){
      if(botResponse.trim().length > 0){
        message.channel.send(botResponse);
      }
    } else {
      message.channel.send(botResponse);
    }
})

client.login(process.env.DISCORD_TOKEN);
