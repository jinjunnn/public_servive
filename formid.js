const redisClient = require('./redis').redisClient; //使用redis客户端。
const {getAccessToken} = require('./access-token'); //生成accesstoken并且保持有效。
const AV = require('leanengine');
const common = require('./common'); //存放可以复用的代码

//向STRING赋值函数；
function sendFormMessage() {
    console.log('sendFormMessage函数');
    let a = 0; //游标的起始位置
    let b = 'formid_*';
    let f = (a, b) => {
        redisClient.scanAsync(a, 'MATCH', b, 'COUNT', 1000).then(data => {
            a = data[0];
            for (const i of data[1]) {
                send_message(i);
            }
            if(a !=0 ){
                f(a, b);
            }
        }).catch(() => {
            console.log('这里有个错误');
        });
    };
    let send_message = (i) => {
        common.sendFormMessage(i);
    };
    f(a, b);

}

module.exports.sendFormMessage = sendFormMessage;
