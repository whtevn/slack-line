'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.start = start;
exports.read = read;
exports.write = write;
exports.follow = follow;

var _slack = require('./lib/slack');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var RtmClient = require('@slack/client').RtmClient;

var minutes_ago = function minutes_ago(t) {
  if (!t) return undefined;
  return new Date(new Date().getTime() - t * 60000).getTime() / 1000.0;
};

function start(slack_info) {
  if (!slack_info.user || !slack_info.user.token) throw new Error("No slack token provided");
  var query_obj = { token: slack_info.user.token };
  return (0, _slack.slack_request)("rtm.start", query_obj).then(function (response) {
    return response.data;
  }).then(function (data) {
    var self = data.self;
    var user_dictionary = get_dictionary([].concat(_toConsumableArray(data.users), _toConsumableArray(data.bots)));
    var channel_dictionary = get_dictionary([].concat(_toConsumableArray(data.channels), _toConsumableArray(data.groups)));
    var channel_name_dictionary = invert_object(channel_dictionary);
    var followed_channels = data.channels.filter(function (channel) {
      return slack_info.follow.indexOf(channel.id) > 0;
    }).map(function (channel) {
      return channel.id;
    });

    return {
      self: self,
      user_dictionary: user_dictionary,
      channel_dictionary: channel_dictionary,
      channel_name_dictionary: channel_name_dictionary,
      followed_channels: followed_channels,
      slack_context: data
    };
  });
}

function read(slack_info, channel_name) {
  var constraints = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
  var log_function = arguments[3];

  var channel = channel_name || slack_info["default-channel"];
  if (!channel) throw new Error("no channel defined");
  return start(slack_info).then(function (env) {
    var query_obj = {
      token: slack_info.user.token,
      channel: env.channel_name_dictionary[channel],
      oldest: minutes_ago(constraints.oldest),
      count: constraints.count
    };
    return (0, _slack.slack_request)("channels.history", query_obj).then(function (result) {
      return result.data.messages;
    }).then(function (messages) {
      return messages.reverse();
    }).then(function (messages) {
      return messages.map(function (message) {
        message.channel = query_obj.channel;
        return log_function(breakdown(message, env));
      });
    });
  });
}

function write(slack_info, channel_name, text) {
  var channel = channel_name || slack_info["default-channel"];
  if (!channel) throw new Error("no channel defined");
  return start(slack_info).then(function (env) {
    var query_obj = {
      token: slack_info.user.token,
      channel: env.channel_name_dictionary[channel],
      link_names: 1,
      text: text
    };
    return (0, _slack.slack_post)("chat.postMessage", Object.assign({}, query_obj, slack_info.user)).then(function (_) {
      return channel;
    });
  });
}

function follow(slack_info, log_function) {
  if (!slack_info.follow) throw new Error("not following any channels or groups");
  return start(slack_info).then(function (env) {
    var rtm = new RtmClient(slack_info.user.token, { logLevel: 'error' });
    var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
    var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
    var followed_channels = slack_info.follow.reduce(function (map, channel_id) {
      var result = {};
      result[env.channel_name_dictionary[channel_id]] = channel_id;
      return Object.assign({}, map, result);
    }, {});
    rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
      console.log('Logged in as ' + rtmStartData.self.name + ' to the ' + rtmStartData.team.name + ' team');
    });
    rtm.on(RTM_EVENTS.ERROR, function (err) {
      return console.log(err);
    });
    rtm.on(RTM_EVENTS.MESSAGE, function (message) {
      var channel = followed_channels[message.channel];
      if (channel) {
        log_function(breakdown(message, env), { id: message.channel, name: channel });
      }
    });
    rtm.start();
  });
}

var breakdown = function breakdown(message, environment) {
  var user = environment.user_dictionary[message.user || message.bot_id];
  var channel_info = environment.channel_dictionary[message.channel];
  var attachments = message.attachments;
  var date = new Date(message.ts.split('.')[0] * 1000);
  var text = message.text;

  return {
    attachments: attachments, text: text, date: date,
    channel: channel_info.name,
    channel_id: message.channel,
    username: message.username || user && user.name || 'unknown-bot'
  };
};

var get_dictionary = function get_dictionary(item) {
  return item.filter(function (i) {
    return !i.hasOwnProperty('deleted') || !i.deleted;
  }).reduce(function (item_set, item) {
    var new_item = {};
    new_item[item.id] = item;
    return Object.assign({}, item_set, new_item);
  }, {});
};

var invert_object = function invert_object(obj) {
  return Object.keys(obj).reduce(function (inverted, value, key) {
    var new_obj = {};
    new_obj[obj[value].name] = value;
    return Object.assign({}, inverted, new_obj);
  }, {});
};