#!/usr/bin/env node

var dateFormat = require('dateformat');
var colors = require('colors');
import * as Slack from '../index.js';

const HOME = _ => process.env.HOME || process.env.USERPROFILE;

const date_of = entry => {
  const entry_date = new Date(entry.ts.split('.')[0]*1000)
  return dateFormat(entry_date, "h:MMt");
}

function slack_info(loc){
  let slack_info;
  try{
    slack_info = require(loc);
  }catch(e){
    console.log(`slack info file not found in ${loc}`)
    slack_info = {user: {}};
  }
  const token = slack_info.user.slack_token  || process.env.SLACK_TOKEN
  slack_info.user = Object.assign(slack_info.user, {token}); 
  return slack_info
}

require('yargs')
  .usage('$0 <cmd> [args]')
  .command('read', 'Read recent messages from a channel', {
      'slack-info': {
        alias: 's',
        default: `${HOME()}/.slack_info.json`,
        describe: 'location of slack info file'
      },
      time: {
        alias: "t",
        description: "get all messages since this time"
      },
      number: {
        alias: "n",
        description: "get this many messages"
      },
      'channel': {
        alias: 'c',
        demand: true,
        describe: 'name of the channel you wish to read or write to'
      }
    }, 
    function (argv) {
      const info = slack_info(argv.slackInfo)
      
      return Slack.read(info.feed_ids[argv.channel],
                        {time: argv.time, count: argv.number},
                        info.user)
                  .then(history => history.map(entry => `${date_of(entry).yellow}\t${entry.username.cyan}\t${entry.text}`))
                  .then(history => history.reverse())
                  .then(history => history.join("\n"))
                  .then(history => console.log(history));
    }
  )
  .command('write', 'write a message to a slack channel', {
      'slack-info': {
        alias: 's',
        default: `${HOME()}/.slack_info.json`,
        describe: 'location of slack info file'
      },
      'channel': {
        alias: 'c',
        demand: true,
        describe: 'name of the channel you wish to read or write to'
      },
      message: {
        alias: "m",
        demand: true
      }
    },
    function(argv){
      return Slack.write(argv.channel, argv.message, slack_info(argv.slack_info).user)
        .catch(e => console.log(e))
    }
  )
  .help('help')
  .argv
