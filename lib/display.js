const dateFormat = require('dateFormat');
const date_of = entry => dateFormat(entry, "h:MMt");

const display_attachments = attachments=>(attachments&&attachments.map((a)=>a.text)||'')

export function log_message(message, environment){
  const date = message.date;
  const name = message.username;
  const text = message.text;
  const attachments = message.attachments;
  return `${date_of(date).yellow}\t${name.cyan}\t${text}${display_attachments(attachments)}`
}
