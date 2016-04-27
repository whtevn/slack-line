#!/usr/bin/env node
'use strict';

var _index = require('../index.js');

var Slack = _interopRequireWildcard(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var dateFormat = require('dateformat');
var colors = require('colors');


var HOME = function HOME(_) {
  return process.env.HOME || process.env.USERPROFILE;
};

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

require('yargs').usage('$0 <cmd> [args]').command('read', 'Read recent messages from a channel', {
  'slack-info': {
    alias: 's',
    default: HOME() + '/.slack_info.json',
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
}, function (argv) {
  var info = slack_info(argv.slackInfo);

  return Slack.read(info.feed_ids[argv.channel], { time: argv.time, count: argv.number }, info.user).then(function (history) {
    return history.map(function (entry) {
      return date_of(entry).yellow + '\t' + entry.username.cyan + '\t' + entry.text;
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
}).command('write', 'write a message to a slack channel', {
  'slack-info': {
    alias: 's',
    default: HOME() + '/.slack_info.json',
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
}, function (argv) {
  return Slack.write(argv.channel, argv.message, slack_info(argv.slackInfo).user).then(function (_) {
    return console.log('message sent to #' + argv.channel);
  }).catch(function (e) {
    console.log(e.stack);
    process.exit(1);
  });
}).help('help').argv;