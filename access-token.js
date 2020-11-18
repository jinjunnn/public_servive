



const axios = require('axios');
const APPID = process.env.WEIXIN_APPID;
const APPSECRET = process.env.WEIXIN_APPSECRET;


// 这个是海淘达人 的accessToken
let accessToken = {
  value: null,
  expiredAt: 0,
};

// 这个是好好抽小程序  的accessToken
let accessToken_lottery = {
  value: null,
  expiredAt: 0,
};

const refreshToken = () => {
  return axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid: APPID,
      secret: APPSECRET,
    }
  }).then(({data : { access_token, expires_in, errcode, errmsg }}) => {
    if (errcode) {
      console.error(errcode, errmsg);
      throw new Eror(errmsg);
    }
    accessToken = {
      value: access_token,
      expiredAt: Date.now() + expires_in * 1000,
    };
    return access_token;
  })
  };

//这个是好好抽小程序  的refreshToken
const refreshToken_lottery = () => {
  return axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid: process.env.WEIXIN_APPID_LOTTERY,
      secret: process.env.WEIXIN_APPSECRET_LOTTERY,
    }
  }).then(({data : { access_token, expires_in, errcode, errmsg }}) => {
    if (errcode) {
      console.error(errcode, errmsg);
      throw new Eror(errmsg);
    }
    accessToken_lottery = {
      value: access_token,
      expiredAt: Date.now() + expires_in * 1000,
    };
    return access_token;
  })
  };

exports.getAccessToken = () => Promise.resolve().then(() => {
  if (accessToken.expiredAt > Date.now()) {
    if (accessToken.value) return accessToken.value;
  }
  return refreshToken();
})

exports.getAccessToken_lottery = () => Promise.resolve().then(() => {
  if (accessToken_lottery.expiredAt > Date.now()) {
    if (accessToken_lottery.value) return accessToken_lottery.value;
  }
  return refreshToken_lottery();
})