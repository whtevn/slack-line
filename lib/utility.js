function log_message(message, environment, slack_info){
  const user = environment.users[message.user].name
  const channel = environment.channels[message.channel].name
  const attachments = message.attachments
  return `${date_of(message).yellow}\t${user.cyan}\t${message.text}${display_attachments(attachments)}`
}

function record(slack_info={history: DEFAULT_HISTORY}, message, channel){
  const filename = `${slack_info.history}/${channel}.log`;
}

const date_of = entry => {
  const entry_date = new Date(entry.ts.split('.')[0]*1000)
  return dateFormat(entry_date, "h:MMt");
}
