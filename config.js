'use strict';

module.exports = {
    clientIp: "126.77.66.132",
    mch_id: process.env.WEIXIN_MCHID,
    wxkey: process.env.WEIXIN_PAY_SECRET, //key为在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置
    appid: process.env.WEIXIN_APPID, //微信支付app的appid
    appsecret: process.env.WEIXIN_APPSECRET //公众号secret
}