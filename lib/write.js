
export const write_options = {
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

export function write_to_slack(argv){
  const info = slack_info(argv.slackInfo);
  const channel = argv.channel||info.user.channel;
  return Slack.write(channel, argv.message, info.user)
              .then(_ => console.log(`message sent to #${channel}`))
              .catch(e => {
                console.log(e.stack)
                process.exit(1)
              })
}

