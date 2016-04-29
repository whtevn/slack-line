import { log_message, record } from './utility';

var RtmClient = require('@slack/client').RtmClient;
export function start(argv){
  const info = slack_info(argv.slackInfo);
  const channel = argv.channel||info.user.channel;
  return Slack.start(info.user)
              .then(slack_data => {
                const followed_channels = slack_data
                                            .channels
                                            .filter(channel => info.follow.includes(channel.name))
                const user_dictionary = get_dictionary(slack_data.users)
                const bot_dictionary = get_dictionary(slack_data.bots)
                const channel_dictionary = get_dictionary(followed_channels)
                const environment = {
                  users: user_dictionary,
                  bots: bot_dictionary,
                  channels: channel_dictionary
                }
                const rtm = new RtmClient(info.user.token, {logLevel: 'error'});
                var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

                rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
                  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
                });
                var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

                rtm.on(RTM_EVENTS.MESSAGE, function (message) {
                  const channel = channel_dictionary[message.channel];
                  if(channel){
                    record(info, log_message(message, environment), channel);
                  }
                });
                rtm.start();
              })
              .catch(e => console.log(e.stack))
}

