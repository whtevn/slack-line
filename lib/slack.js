import axios from 'axios';

function slack_base_url(method, ...qstring){
  return `https://slack.com/api/${method}?${queryify(...qstring)}`;
}

function objects_as_qstrings(obj, ...remaining){
  if(!obj) return [];
  const qstring = Object.keys(obj).map((key)=>`${key}=${obj[key]}`)
  return [...qstring, ...objects_as_qstrings(...remaining)]
}

function queryify(...objs){
 return objects_as_qstrings(Object.assign({}, ...objs)).join("&")
}

export function slack_request(method, ...query){
  return axios(slack_base_url(method, ...query));
}

export function slack_post(method, ...query){
  return axios({
    method: 'post',
    url: slack_base_url(method, ...query),
  });
}
