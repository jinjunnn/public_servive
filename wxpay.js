const WXPay = require('weixin-pay');//微信支付sdk
let config = require('./config');

/*拼接微信企业付款字符串 */
let request = require('request'); //用于node 的http请求
let xml2js = require('xml2js');//将xml转化为json
let fs = require('fs');
let https = require('https');

if (!process.env.WEIXIN_APPID) throw new Error('environment variable WEIXIN_APPID missing');
if (!process.env.WEIXIN_MCHID) throw new Error('environment variable WEIXIN_MCHID missing');
if (!process.env.WEIXIN_PAY_SECRET) throw new Error('environment variable WEIXIN_PAY_SECRET missing');
if (!process.env.WEIXIN_NOTIFY_URL) throw new Error('environment variable WEIXIN_NOTIFY_URL missing');

const wxpay = WXPay({
    appid: process.env.WEIXIN_APPID,
    mch_id: process.env.WEIXIN_MCHID,
    partner_key: process.env.WEIXIN_PAY_SECRET, //微信商户平台 API secret，非小程序 secret
    // pfx: fs.readFileSync('./wxpay_cert.p12'), //微信商户平台证书，暂不需要
});

//生成xml函数
let fnCreateXml = function (json) {
    let _xml = '';
    for (let key in json) {
        _xml += '<' + key + '>' + json[key] + '</' + key + '>';
    }
    return _xml;
}

/*生成url串用于微信md5校验*/
let fnCreateUrlParam = function (json) {
    let _str = '';
    let _arr = []
    for (let key in json) {
        _arr.push(key + '=' + json[key]);
    }
    return _arr.join('&');
}

/*生成付款xml参数数据*/
let fnGetWeixinBonus = function (option) {
    console.log("option===", option);
    let amount = option.amount; //红包总金额
    let openid = option.openid; //红包发送的目标用户
    let now = new Date();
    let showName = config.showName;
    let clientIp = config.clientIp; //ip地址
    let desc = option.desc; //企业付款备注
    let mch_id = config.mch_id; //商户号
    let mch_appid = config.appid; //appid
    let wxkey = config.wxkey; //key为在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置

    let date_time = now.getFullYear() + '' + (now.getMonth() + 1) + '' + now.getDate();
    let date_no = (now.getTime() + '').substr(-8); //生成8为日期数据，精确到毫秒
    let random_no = Math.floor(Math.random() * 99);
    if (random_no < 10) { //生成位数为2的随机码
        random_no = '0' + random_no;
    }

    let nonce_str = Math.random().toString(36).substr(2, 15); //生成随机字符串
    let partner_trade_no = mch_id + date_time + date_no + random_no; //生成商户订单号

    let contentJson = {};
    contentJson.amount = amount; // '100';
    contentJson.check_name = "NO_CHECK"; // '强制验证名字';FORCE_CHECK
    contentJson.desc = desc; //'恭喜发财';
    contentJson.mch_appid = mch_appid; //商户appid
    contentJson.mchid = mch_id;
    contentJson.nonce_str = nonce_str;
    contentJson.openid = openid; // 'oovyt4u9yTamaCAxlZ-U2HjH-Z'; //墨色梧桐的openid // 'oovyt4u9yTamaCAxlZ-U2HjH-Z';
    contentJson.partner_trade_no = partner_trade_no; //订单号为 mch_id + yyyymmdd+10位一天内不能重复的数字; //+201502041234567893';
    // contentJson.re_user_name = showName;
    contentJson.spbill_create_ip = clientIp; //IP地址
    contentJson.key = wxkey; //微信安全密钥

    /*生成url串用于微信md5校验*/
    let contentStr = fnCreateUrlParam(contentJson);
    console.log('content=' + contentStr);
    //生成签名
    let crypto = require('crypto');
    contentJson.sign = crypto.createHash('md5').update(contentStr, 'utf8').digest('hex').toUpperCase();

    //删除 contentJson对象中的key (key不参与签名)
    delete contentJson.key;
    //生成xml函数
    let xmlData = fnCreateXml(contentJson);
    let sendData = '<xml>' + xmlData + '</xml>'; //_xmlTemplate.replace(/{content}/)
    console.log('xml=' + sendData);
    return sendData;
}


//微信企业支付到零钱
let wxcompay = function (requ, callback) {
    // https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers
    let amount = requ.amount; //金额
    let openid = requ.openid;
    let desc = requ.desc;
    let option = {
        amount,
        openid,
        desc
    };
    let sendData = fnGetWeixinBonus(option);
    console.log('sendData=====', sendData);
    //读取微信生成的证书用作加密
    let opt = {
        url: "https://api.mch.weixin.qq.com/mmpaymkttransfers/promotion/transfers",
        body: sendData,
        key: fs.readFileSync('./cert/apiclient_key.pem'), //将微信生成的证书放入 cert目录下
        cert: fs.readFileSync('./cert/apiclient_cert.pem'), //将微信生成的证书放入 cert目录下
    }
    request.post(opt, function (err, res, body) {
        console.log('err==', err);
        console.log("body==", body);
        let parser = new xml2js.Parser({
            trim: true,
            explicitArray: false,
            explicitRoot: false
        }); //解析签名结果xml转json
        parser.parseString(body, function (err, res) {
            console.log("res==", res);
            if (res.result_code == 'SUCCESS') {
                return callback({
                    flag: true
                });
            } else {
                return callback({
                    flag: false
                });
            }
        });
    });
}


module.exports = wxpay;
module.exports.wxcompay = wxcompay;
