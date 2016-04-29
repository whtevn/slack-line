
export function data(argv) {
  const info = slack_info(argv.slackInfo)
  const channel = argv.channel||info.user.channel;
  
  return Slack.read(info.feed_ids[channel],
                    {time: argv.time, count: argv.number},
                    info.user)
              .then(history => history.map(entry => `${date_of(entry).yellow}\t${entry.username.cyan}\t${entry.text}${display_attachments(entry.attachments)}`))
              .then(history => history.reverse())
              .then(history => history.join("\n"))
              .then(history => console.log(history))
              .catch(e => {
                console.log(e.stack)
                process.exit(1)
              })
}
