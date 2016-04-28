#!/usr/bin/env node
'use strict';

var _index = require('../index.js');

var Slack = _interopRequireWildcard(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var dateFormat = require('dateformat');
var colors = require('colors');
var project_info = require('../package.json');


var HOME = function HOME(_) {
  return process.env.HOME || process.env.USERPROFILE;
};
var default_home = HOME() + '/.slack_info.json';

var date_of = function date_of(entry) {
  var entry_date = new Date(entry.ts.split('.')[0] * 1000);
  return dateFormat(entry_date, "h:MMt");
};

function slack_info(loc) {
  var slack_info = void 0;
  try {
    slack_info = require(loc);
  } catch (e) {
    console.log('slack info file not found in ' + loc);
    slack_info = { user: {} };
  }
  var token = slack_info.user.slack_token || process.env.SLACK_TOKEN;
  slack_info.user = Object.assign(slack_info.user, { token: token });
  return slack_info;
}

var read_options = {
  'slack-info': {
    alias: 's',
    default: default_home,
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

var write_options = {
  'slack-info': {
    alias: 's',
    default: default_home,
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
};

var display_attachments = function display_attachments(attachments) {
  return attachments && attachments.map(function (a) {
    return a.text;
  }) || '';
};

function read_from_slack(argv) {
  var info = slack_info(argv.slackInfo);
  var channel = argv.channel || info.user.channel;

  return Slack.read(info.feed_ids[channel], { time: argv.time, count: argv.number }, info.user).then(function (history) {
    return history.map(function (entry) {
      return date_of(entry).yellow + '\t' + entry.username.cyan + '\t' + entry.text + display_attachments(entry.attachments);
    });
  }).then(function (history) {
    return history.reverse();
  }).then(function (history) {
    return history.join("\n");
  }).then(function (history) {
    return console.log(history);
  }).catch(function (e) {
    console.log(e.stack);
    process.exit(1);
  });
}

function write_to_slack(argv) {
  var info = slack_info(argv.slackInfo);
  var channel = argv.channel || info.user.channel;
  return Slack.write(channel, argv.message, info.user).then(function (_) {
    return console.log('message sent to #' + channel);
  }).catch(function (e) {
    console.log(e.stack);
    process.exit(1);
  });
}

var yargs = require('yargs');

yargs.usage('$0 <cmd> [args]').command('read', 'Read recent messages from a channel', read_options, read_from_slack).command('write', 'write a message to a slack channel', write_options, write_to_slack)
/*.command('repl', 'interactive command line interface', function(argv){
  var inquirer = require('inquirer');
  const repl = function(){
    const new_yarg = yargs
                      .reset()
                      .resetOptions()
                      .help()
                      .command(
                        'read',
                        'Read recent messages from a channel', 
                        read_options, 
                        read_from_slack
                      )
                      .command('write', 'write a message to a slack channel', 
                        write_options,
                        write_to_slack 
                      )
    return inquirer.prompt([
              {
                type: 'input',
                name: 'command',
                message: '>'
              }
            ])
            .then((answers) => {
              new_yarg
                .parse(answers.command)
                .argv
            })
            .then(repl)
            .catch(e => console.log(e))
  }
  repl();
})*/
.help('help').alias('h', 'help').version(function (_) {
  return 'slack-line version ' + project_info.version;
}).alias('v', 'version').argv;