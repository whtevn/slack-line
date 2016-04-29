#!/usr/bin/env node
var RtmClient = require('@slack/client').RtmClient;
var mkdirp = require('mkdirp');
    
var logrotate = require('logrotate-stream')


const fs = require('fs');
var dateFormat = require('dateformat');
var colors = require('colors');
var project_info   = require('../package.json');
import * as Slack from '../index.js';

const HOME = _ => process.env.HOME || process.env.USERPROFILE;
const DEFAULT_HOME = `${HOME()}/.slack_info.json`;
const DEFAULT_HISTORY = `${HOME()}/.slack`;

const date_of = entry => {
  const entry_date = new Date(entry.ts.split('.')[0]*1000)
  return dateFormat(entry_date, "h:MMt");
}
const WebSocket = require('ws');

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

const follow_options = {
  quiet: {
    alias: 'q',
    describe: 'silence output to stdout'
  },
  zen: {
    alias: 'z',
    describe: 'do not write history to files (live in the moment)'
  }
}
const read_options = {
      'slack-info': {
        alias: 's',
        default: DEFAULT_HOME,
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
        describe: 'name of the channel you wish to read or write to'
      }
    };

const write_options = {
      'slack-info': {
        alias: 's',
        default: DEFAULT_HOME,
        describe: 'location of slack info file'
      },
      'channel': {
        alias: 'c',
        describe: 'name of the channel you wish to read or write to'
      },
      message: {
        alias: "m",
        demand: true
      }
    }

const display_attachments = attachments=>(attachments&&attachments.map((a)=>a.text)||'')

function read_from_slack(argv) {
  const info = slack_info(argv.slackInfo)
  const channel = argv.channel||info.user.channel;
  
  return start_slack(info)
              .then(function(result){
                const channels = result.slack_data.channels.filter(function(c){ return c.name == channel })
                if(!channels.length) throw 'no such channel';
                const channel_id = channels[0].id
                return Slack.read(channel_id,
                    {time: argv.time, count: argv.number},
                    info.user)
              })
              .then(history => history.map(entry => `${date_of(entry).yellow}\t${entry.username.cyan}\t${entry.text}${display_attachments(entry.attachments)}`))
              .then(history => history.reverse())
              .then(history => history.join("\n"))
              .then(history => console.log(history))
              .catch(e => {
                console.log(e)
                process.exit(1)
              })
}

function write_to_slack(argv){
  const info = slack_info(argv.slackInfo);
  const channel = argv.channel||info.user.channel;
  return start_slack(info).then(result =>{
    const username = result.slack_data.self.name;
    const token = info.user.token;
    return Slack.write(channel, argv.message, {username}, info.user)
                .then(_ => console.log(`message sent to #${channel}`))
  })
  .catch(e => {
    console.log(e.stack)
    process.exit(1)
  })
}

const get_dictionary = (item) => item.filter(i => !i.hasOwnProperty('deleted') || !i.deleted)
                                     .reduce((item_set, item) => {
                                        let new_item = {};
                                        new_item[item.id] = {name: item.name};
                                        return Object.assign({}, item_set, new_item);
                                      }, {})

function log_message(message, environment, slack_info){
  let name;
  if(message.user){
    name = environment.users[message.user].name
  }
  if(message.bot){
    name = environment.bots[message.bot].name
  }
  const channel = environment.channels[message.channel].name
  const attachments = message.attachments
  return `${date_of(message).yellow}\t${name.cyan}\t${message.text}${display_attachments(attachments)}`
}

function record(slack_info={history: DEFAULT_HISTORY}, message, channel){

}

function start_slack(info){
  return Slack.start(info.user)
      .then(slack_data => {
        if(!slack_data.ok) throw new Error(slack_data.error)
        const followed_channels = slack_data
                                    .channels
                                    .filter(channel => info.follow.indexOf(channel.name)>-1)
        const user_dictionary = get_dictionary(slack_data.users)
        const bot_dictionary = get_dictionary(slack_data.bots)
        const channel_dictionary = get_dictionary(followed_channels)
        const environment = {
          users: user_dictionary,
          bots: bot_dictionary,
          channels: channel_dictionary
        }
        return {
          environment,
          slack_data
        }
      })
}

function follow_slack(argv){
  const info = slack_info(argv.slackInfo);
  const channel = argv.channel||info.user.channel;
  return start_slack(info)
        .then(info =>{
          info.buffer_base = slack_info.history || DEFAULT_HISTORY;

          return new Promise((resolve, reject) => mkdirp(info.buffer_base, function (err) {
            if (err) throw reject(err);
            resolve(info);
          }))
        })
        .then(function(result){
                const environment = result.environment;
                const slack_data  = result.slack_data;
                const buffer_base  = result.buffer_base;
                const rtm = new RtmClient(info.user.token, {logLevel: 'error'});
                var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

                rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
                  console.log(`Logged in as ${rtmStartData.self.name} to the ${rtmStartData.team.name} team`);
                  const channel_buffers = Object.keys(environment.channels).reduce((buffers, channel_id) => {
                    const name = environment.channels[channel_id].name;
                    const filename = `${buffer_base}/${name}.log`;
                    buffers[channel_id] = {
                      writeable: !argv.zen && fs.createWriteStream(filename),
                      filename,
                      name
                    };
                    return buffers;
                  }, {})

                  rtm.on(RTM_EVENTS.MESSAGE, function (message) {
                    const buffer = channel_buffers[message.channel];
                    if(buffer){
                      // add -q --quiet option
                      if(!argv.quiet){
                        console.log(buffer.name, log_message(message, environment));
                      }
                      if(!argv.zen){
                        buffer.writeable.write(`${log_message(message, environment)}\n`)
                      }
                    }
                  });
                });
                var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

                rtm.start();
              })
              .catch(e => console.log(e.stack))
}

const yargs = require('yargs')
yargs
  .usage('$0 <cmd> [args]')
  .command('read', 'Read recent messages from a channel', 
    read_options, 
    read_from_slack
  )
  .command('write', 'write a message to a slack channel', 
    write_options,
    write_to_slack 
  )
  .command('follow', 'pipe channels defined in --slack-info to files', 
    Object.assign({}, read_options, follow_options),
    follow_slack 
  )
  .help('help')
  .alias('h', 'help')
  .version(_ => `slack-line version ${project_info.version}`)
  .alias('v', 'version')
  .argv
 
