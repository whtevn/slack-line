import { slack_request, slack_post } from './lib/slack';
const RtmClient = require('@slack/client').RtmClient;

const minutes_ago = (t) => {
  if(!t) return undefined
  return (new Date(new Date().getTime() - t*60000).getTime()/1000.0)
};

export function start(slack_info){
  if(!slack_info.user || !slack_info.user.token) throw new Error("No slack token provided");
  const query_obj = {token: slack_info.user.token};
  return slack_request("rtm.start", query_obj)
           .then(response => response.data)
           .then(data => {
             const self = data.self;
             const user_dictionary = get_dictionary([...data.users, ...data.bots])
             const channel_dictionary = get_dictionary([...data.channels, ...data.groups]);
             const channel_name_dictionary = invert_object(channel_dictionary);
             const followed_channels = data.channels
                                           .filter(channel => {
                                             return slack_info.follow.indexOf(channel.id) > 0
                                           })
                                           .map(channel => channel.id);

             return {
               self,
               user_dictionary,
               channel_dictionary,
               channel_name_dictionary,
               followed_channels,
               slack_context: data
             }
           })
}

export function read(slack_info, channel_name, constraints={}, log_function){
  const channel = (channel_name || slack_info.user.channel);
  if(!channel) throw new Error("no channel defined");
  return start(slack_info).then(env => {
     const query_obj = {
       token: slack_info.user.token,
       channel: env.channel_name_dictionary[channel],
       oldest: minutes_ago(constraints.oldest),
       count: constraints.count
     };
     return slack_request("channels.history", query_obj)
                    .then(result =>  result.data.messages)
                    .then(messages => messages.reverse())
                    .then(messages => messages.map(message => {
                      message.channel = query_obj.channel;
                      return log_function(breakdown(message, env))
                    }))
  })
}

export function write(slack_info, channel_name, text){
  const channel = (channel_name || slack_info.user.channel);
  if(!channel) throw new Error("no channel defined");
  return start(slack_info).then(env => {
     const query_obj = {
       token: slack_info.user.token,
       channel: env.channel_name_dictionary[channel],
       link_names: 1,
       text
     };
    return slack_post("chat.postMessage", query_obj)
  })
}

export function follow(slack_info, log_function){
  if(!slack_info.follow) throw new Error("not following any channels or groups");
  return start(slack_info).then(env => {
    const rtm = new RtmClient(info.user.token, {logLevel: 'error'});
    const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
    const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
    const followed_channels = slack_info.follow.reduce((map, channel_id) => {
      let result = {};
      result[channel_id] = env.channel_name_dictionary[channel_id];
      return Object.assign({}, map, result);
    }, {})
    rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
      console.log(`Logged in as ${rtmStartData.self.name} to the ${rtmStartData.team.name} team`);
    })
    rtm.on(RTM_EVENTS.MESSAGE, function (message) {
      const channel = followed_channels[message.channel];
      if(channel){
        log_function(breakdown(message, env));
      }
    })
  })
}

const breakdown = (message, environment) => {
  const user= environment.user_dictionary[message.user||message.bot_id]
  const channel_info = environment.channel_dictionary[message.channel];
  const attachments = message.attachments;
  const date = new Date(message.ts.split('.')[0]*1000);
  const text = message.text

  return {
    attachments, text, date,
    channel: channel_info.name,
    username: message.username||(user&&user.name)||'unknown-bot'
  }
}

const get_dictionary = (item) => {
  return item.filter(i => !i.hasOwnProperty('deleted') || !i.deleted)
      .reduce((item_set, item) => {
        let new_item = {};
        new_item[item.id] = item;
        return Object.assign({}, item_set, new_item);
      }, {})
}

const invert_object = (obj) => {
  return Object.keys(obj).reduce((inverted, value, key) => {
    let new_obj = {}
    new_obj[obj[value].name] = value;
    return Object.assign({}, inverted, new_obj)
  }, {})
}

