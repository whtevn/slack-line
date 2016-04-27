import { slack_request, slack_post } from './lib/slack';

const minutes_ago = (t=20) => (new Date(new Date().getTime() - t*60000).getTime()/1000.0);

export function read(channel, constraints={}, slack_info){
  // read all messages since some given time
  if(channel) constraints.channel = channel;
  if(constraints.time){
    constraints.oldest = minutes_ago(constraints.time);
    delete constraints.time;
  }
  return Promise.all([slack_request("users.list", slack_info), slack_request("channels.history", Object.assign(slack_info, constraints))])
          .then(result => {
            const users = result[0].data.members.reduce((p, c)=>{
              p[c.id] = c.name;
              return p;
            }, {}); 
            const history = result[1].data.messages.map((c)=>{
              c.username = users[c.user]||"bot"
              return c
            })
            return history
          })
}

export function write(channel, text, slack_info){
  return slack_post("chat.postMessage", Object.assign(slack_info, { channel, text }))
}
