#!/usr/bin/env node
'use strict';

var _index = require('../index.js');

var Slack = _interopRequireWildcard(_index);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var RtmClient = require('@slack/client').RtmClient;
var mkdirp = require('mkdirp');

var logrotate = require('logrotate-stream');

var fs = require('fs');
var dateFormat = require('dateformat');
var colors = require('colors');
var project_info = require('../package.json');


var HOME = function HOME(_) {
  return process.env.HOME || process.env.USERPROFILE;
};
var DEFAULT_HOME = HOME() + '/.slack_info.json';
var DEFAULT_HISTORY = HOME() + '/.slack';

var date_of = function date_of(entry) {
  var entry_date = new Date(entry.ts.split('.')[0] * 1000);
  return dateFormat(entry_date, "h:MMt");
};
var WebSocket = require('ws');

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

var follow_options = {
  quiet: {
    alias: 'q',
    describe: 'silence output to stdout'
  },
  zen: {
    alias: 'z',
    describe: 'do not write history to files (live in the moment)'
  }
};
var read_options = {
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

var write_options = {
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
};

var display_attachments = function display_attachments(attachments) {
  return attachments && attachments.map(function (a) {
    return a.text;
  }) || '';
};

function read_from_slack(argv) {
  var info = slack_info(argv.slackInfo);
  var channel = argv.channel || info.user.channel;

  return start_slack(info).then(function (result) {
    var channels = result.slack_data.channels.filter(function (c) {
      return c.name == channel;
    });
    if (!channels.length) throw 'no such channel';
    var channel_id = channels[0].id;
    return Slack.read(channel_id, { time: argv.time, count: argv.number }, info.user);
  }).then(function (history) {
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
    console.log(e);
    process.exit(1);
  });
}

function write_to_slack(argv) {
  var info = slack_info(argv.slackInfo);
  var channel = argv.channel || info.user.channel;
  return start_slack(info).then(function (result) {
    var username = result.slack_data.self.name;
    var token = info.user.token;
    return Slack.write(channel, argv.message, { username: username }, info.user).then(function (_) {
      return console.log('message sent to #' + channel);
    });
  }).catch(function (e) {
    console.log(e.stack);
    process.exit(1);
  });
}

var get_dictionary = function get_dictionary(item) {
  return item.filter(function (i) {
    return !i.hasOwnProperty('deleted') || !i.deleted;
  }).reduce(function (item_set, item) {
    var new_item = {};
    new_item[item.id] = { name: item.name };
    return Object.assign({}, item_set, new_item);
  }, {});
};

function log_message(message, environment, slack_info) {
  var name = void 0;
  if (message.user) {
    name = environment.users[message.user].name;
  }
  if (message.bot) {
    name = environment.bots[message.bot].name;
  }
  var channel = environment.channels[message.channel].name;
  var attachments = message.attachments;
  return date_of(message).yellow + '\t' + name.cyan + '\t' + message.text + display_attachments(attachments);
}

function record() {
  var slack_info = arguments.length <= 0 || arguments[0] === undefined ? { history: DEFAULT_HISTORY } : arguments[0];
  var message = arguments[1];
  var channel = arguments[2];
}

function start_slack(info) {
  return Slack.start(info.user).then(function (slack_data) {
    if (!slack_data.ok) throw new Error(slack_data.error);
    var followed_channels = slack_data.channels.filter(function (channel) {
      return info.follow.indexOf(channel.name) > -1;
    });
    var user_dictionary = get_dictionary(slack_data.users);
    var bot_dictionary = get_dictionary(slack_data.bots);
    var channel_dictionary = get_dictionary(followed_channels);
    var environment = {
      users: user_dictionary,
      bots: bot_dictionary,
      channels: channel_dictionary
    };
    return {
      environment: environment,
      slack_data: slack_data
    };
  });
}

function follow_slack(argv) {
  var info = slack_info(argv.slackInfo);
  var channel = argv.channel || info.user.channel;
  return start_slack(info).then(function (info) {
    info.buffer_base = slack_info.history || DEFAULT_HISTORY;

    return new Promise(function (resolve, reject) {
      return mkdirp(info.buffer_base, function (err) {
        if (err) throw reject(err);
        resolve(info);
      });
    });
  }).then(function (result) {
    var environment = result.environment;
    var slack_data = result.slack_data;
    var buffer_base = result.buffer_base;
    var rtm = new RtmClient(info.user.token, { logLevel: 'error' });
    var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

    rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
      console.log('Logged in as ' + rtmStartData.self.name + ' to the ' + rtmStartData.team.name + ' team');
      var channel_buffers = Object.keys(environment.channels).reduce(function (buffers, channel_id) {
        var name = environment.channels[channel_id].name;
        var filename = buffer_base + '/' + name + '.log';
        buffers[channel_id] = {
          writeable: !argv.zen && fs.createWriteStream(filename),
          filename: filename,
          name: name
        };
        return buffers;
      }, {});

      rtm.on(RTM_EVENTS.MESSAGE, function (message) {
        var buffer = channel_buffers[message.channel];
        if (buffer) {
          // add -q --quiet option
          if (!argv.quiet) {
            console.log(buffer.name, log_message(message, environment));
          }
          if (!argv.zen) {
            buffer.writeable.write(log_message(message, environment) + '\n');
          }
        }
      });
    });
    var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

    rtm.start();
  }).catch(function (e) {
    return console.log(e.stack);
  });
}

var yargs = require('yargs');
yargs.usage('$0 <cmd> [args]').command('read', 'Read recent messages from a channel', read_options, read_from_slack).command('write', 'write a message to a slack channel', write_options, write_to_slack).command('follow', 'pipe channels defined in --slack-info to files', Object.assign({}, read_options, follow_options), follow_slack).help('help').alias('h', 'help').version(function (_) {
  return 'slack-line version ' + project_info.version;
}).alias('v', 'version').argv;