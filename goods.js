const redisClient = require('./redis').redisClient; //使用redis客户端。
const {getAccessToken} = require('./access-token'); //生成accesstoken并且保持有效。
const AV = require('leanengine');
const common = require('./common'); //存放可以复用的代码

