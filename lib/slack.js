import axios from 'axios';

const slack_base_url = (method, ...qstring) => `https://slack.com/api/${method}?${queryify(...qstring)}`;
const objects_as_qstrings = (obj, ...remaining) => {
  if(!obj) return [];
  const qstring = Object.keys(obj).map((key)=>`${key}=${obj[key]}`)
  return [...qstring, ...objects_as_qstrings(...remaining)]
}
const queryify = (...objs) => objects_as_qstrings(...objs).join("&")

export const slack_request = (method, ...query) => axios(slack_base_url(method, ...query));
export const slack_post = (method, ...query) => axios({
  method: 'post',
  url: slack_base_url(method, ...query),
});
