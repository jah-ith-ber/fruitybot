const Discord = require("discord.js");
const client = new Discord.Client();
const config = require('./config.json');
const TOKEN = config.token;
const PREFIX = config.prefix;


// DB.
var mongojs = require('mongojs');
var db = mongojs('localhost:27017/fruitybot', ['solos','collabs']);
var sanitize = require('mongo-sanitize');


client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}!`);
});

client.on('message', msg => {
  // Help.
  if (msg.content === PREFIX + 'help' || msg.content === PREFIX + 'h') {
    msg.channel.send('List of help commands (don\'t forget to use the ";"" for separating title;genre etc [look at the examples!]');
    msg.channel.send(`\`${PREFIX}ca: (collab add) add a new collaboration entry. \n   Ex: .ca Song Title;Genre;@user1 @user2 @user3\n\``);
    msg.channel.send(`\`${PREFIX}cd: ([mod only] collab delete) delete a collaboration entry. \n   Ex: .cd songtitle\``);
    msg.channel.send(`\`${PREFIX}cl: (collab list) list all collaboration entries. \n   Ex: .cl\``);
    msg.channel.send(`\`${PREFIX}cu: (collab update) Update a collab entry (searches by songname).\n  Ex: .cu oldsongname;newsongname;newgenre;newuserlist \``);
    msg.channel.send(`\`${PREFIX}sa: (solo add) add new solo entry. \n   Ex: .sa songtitle;genre\n    Note: Only one entry allowed per user.\``);
    msg.channel.send(`\`${PREFIX}sd: ([mod only] solo delete) delete solo entry. \n   Ex: .sd wolf#6047\``);
    msg.channel.send(`\`${PREFIX}sl: (solo list) list all solo entries. \n   Ex: .sl\``);
    msg.channel.send(`\`${PREFIX}su: (solo update) update your solo entry. \n   Ex: .su Title;Genre\``);
  }//Help

  // Solo list.
  if (msg.content === PREFIX + 'sl') {
    db.solos.find(function(err,res){
        if (res.length > 0) {
            res.map(t => msg.channel.send(`\`${t.title} - ${t.genre}. By:[${t.user}]\``));
        }
        else {
          msg.reply('no entries!');
        }
    });
  }// Solo list

  // Solo add.
  if (msg.content.startsWith(PREFIX + 'sa')) {

    let [title, genre] = msg.content.substr(4).split(';');

    title = sanitize(title);
    genre = sanitize(genre);

    db.solos.count({user:msg.author.username + '#' + msg.author.discriminator}, function(err, num) {

      if (num > 0) {
        msg.reply('Entry exists - use su to update, use sl to see all solo entries.');
      }
      else {
        db.solos.insert({user:msg.author.username + '#' + msg.author.discriminator, title: title.trim(), genre:genre.trim()});
        msg.channel.send('Solo entry added!');
      }
    });
  }// Solo add

  // Solo update.
  if (msg.content.startsWith(PREFIX + 'su')) {
    let [title, genre] = msg.content.toLowerCase().substr(4).split(';');

    title = sanitize(title);
    genre = sanitize(genre);

      db.solos.count({user:msg.author.username + '#' + msg.author.discriminator}, function(err, num) {

        if (num > 0) {
          db.solos.update(
            { user:msg.author.username + '#' + msg.author.discriminator },
            { $set: {title: title.trim(), genre:genre.trim()}}
          );
          msg.channel.send('Entry updated. Use sl to list all entries.');
        } 
        else {
          msg.channel.send('No entry found. Use sa to add an entry!')
        }

      });
    
  }//

  // Collab list.
  if (msg.content === PREFIX + 'cl') {
    db.collabs.find(function(err,res){
        if (res.length > 0) {
            res.map((t,o) => msg.channel.send(`\`${o+1}. ${t.title} - ${t.genre}. By:[${t.users}]\``));
        }
        else {
          msg.reply('No collab entries found!');
        }
    });
  }//

  // Collab add.
  if (msg.content.startsWith(PREFIX + 'ca')) {

    let [title, genre, users] = msg.content.toLowerCase().substr(4).split(';');

    title = sanitize(title);
    genre = sanitize(genre);
    users = sanitize(users);

    db.collabs.find({title:title.trim()}, function(err, res) {
      console.log(res);
      if (res.length === 0) {
        db.collabs.insert({user:msg.author.username + '#' + msg.author.discriminator,title:title.trim(),genre:genre.trim(),users:users.trim()});
        msg.channel.send('Collab entry added! Use "cl" to list all collab entries');
      }
      else {
        msg.reply('Entry with that name already exists. Please user another songname.')
      }
    })

   

  }//

  // Collab update.
  if (msg.content.startsWith(PREFIX + 'cu')) {

    let [searchTerm, newTitle, genre, users] = msg.content.toLowerCase().substr(4).split(';');

    searchTerm = sanitize(searchTerm);
    newTitle = sanitize(newTitle);
    genre = sanitize(genre);
    users = sanitize(users);

    let modRole = msg.guild.roles.find("name", "Moderator");
    let user = msg.content.toLowerCase().substr(4);

    user = sanitize(user);


    db.collabs.find({title:searchTerm.trim()}, function(err, res) {
      console.log(res);
      if (res.length > 0 && res[0].user == msg.author.username + '#' + msg.author.discriminator || res.length > 0 &&
        msg.member.roles.has(modRole.id)) {
        db.collabs.update(
            { title:searchTerm.trim() },
            { $set: {title: newTitle.toLowerCase().trim(), genre:genre.toLowerCase().trim(), users: users.trim()}}
          );
          msg.channel.send('Collab entry updated! Use "cl" to list all collab entries');
      }
      else {
        msg.reply('No entry found or improper permissions.')
      }
    })

  }//



 // Solo remove (mod only).
  if (msg.content.startsWith(PREFIX + 'sd')) {

    let modRole = msg.guild.roles.find("name", "Moderator");
    let user = msg.content.toLowerCase().substr(4);

    user = sanitize(user);

    // assuming role.id is an actual ID of a valid role:
    if(msg.member.roles.has(modRole.id)) {

      db.solos.find({user:user}, function(err, res) {
        console.log(res);
        if (res.length > 0) {
          
          db.solos.remove({user:user});
          msg.channel.send(user + '\'s entry removed.');
          
        }
        else {
          msg.reply('No solo entry found for that user.');
        }
      })
    } 
    else {
      msg.channel.send('you are not a mod.');
    }

  }//

  // Mod only collab remove

  // Solo remove (mod only).
  if (msg.content.startsWith(PREFIX + 'cd')) {

    let modRole = msg.guild.roles.find("name", "Moderator");
    let title = msg.content.toLowerCase().substr(4);

    title = sanitize(title);

    // assuming role.id is an actual ID of a valid role:
    if(msg.member.roles.has(modRole.id)) {

      db.collabs.find({title:title}, function(err, res) {
        console.log(res);
        if (res.length > 0) {
          
          db.collabs.remove({title:title});
          msg.channel.send(title + ' - entry removed.');
          
        }
        else {
          msg.reply('No collab entry found for that title.');
        }
      })
    } 
    else {
      msg.channel.send('you are not a mod.');
    }

  }//

});

client.login(TOKEN);