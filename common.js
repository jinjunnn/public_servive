const redisClient = require('./redis').redisClient; //使用redis客户端。
const AV = require('leanengine'); //使用 leanengine
const Promise = require('bluebird'); //处理promise异步方法，将redis封装为promise的异步方法。
const _ = require('underscore'); //使用map() filter()等方法
const common = require('./common'); //存放可以复用的代码
const axios = require('axios');
const uuid = require('uuid/v4');
const wxpay = require('./wxpay'); //使用微信支付。
const {
    getAccessToken,
    getAccessToken_lottery
} = require('./access-token'); //生成accesstoken并且保持有效。
const WXBizDataCrypt = require('./WXBizDataCrypt'); //解析用户数据

const APPID = process.env.WEIXIN_APPID;
const APPSECRET = process.env.WEIXIN_APPSECRET;

/**
 * 生成年时间戳
 */
function get_times() {
    let t = new Date();
    return t.getTime();
}


/**
 * 生成随机数
 */
function creat_random(start, end, fixed=0) {
     let differ = end - start;
     let random = Math.random();
     return (start + differ * random).toFixed(fixed);
}

/**
 * 生成年月日8位数字符串
 */
function get_full_time() {
    let d = new Date();
    return String(d.getFullYear()) + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + (d.getDate())).slice(-2);
}

//向STRING赋值函数；
function set_string(key,value) {
    return redisClient.setAsync(key, value).then(results => {
        return results;
    }).catch(console.error);
}

//向STRING取值函数；
function get_string(key) {
    return redisClient.getAsync(key, value).then(results => {
        return results;
    }).catch(console.error);
}

//向hash赋值函数；
function set_hash(key, field, value) {
    return redisClient.hsetAsync(key,field, value).then(results => {
        return results;
    }).catch(console.error);
}

//只有当 hash中没有key时，才set value
function set_hash_only(key, field, value) {
    return redisClient.hsetnxAsync(key, field, value).then(results => {
        return results;
    }).catch(console.error);
}

//取 hash 的所有值
function get_field(key,field) {
    return redisClient.hgetAsync(key, field).then(results => {
        return results;
    }).catch(console.error);
}

//取 hash 的所有值
function has_field(key, field) {
    return redisClient.HEXISTSAsync(key, field).then(results => {
        return results;
    }).catch(console.error);
}


//取 hash 的所有值
async function get_hash(key) {
      return redisClient.hgetallAsync(key).then(results => {
          return results;
      }).catch(console.error);
}


//hash 表field字段 增加或减少整数
function increase_field(key,field,value) {
    return redisClient.HINCRBYAsync(key, field, value).then(results => {
        return results;
    }).catch(console.error);
}
//集合中增加一个元素
function add_set(key,value) {
    return redisClient.saddAsync(key,value).then(results => {
        return results;
    }).catch(console.error);
}

//取出集合中所有元素
function get_set(key) {
    return redisClient.SMEMBERSAsync(key).then(results => {
        return results;
    }).catch(console.error);
}

//向hash取值函数；
function get_list_length(key) {
    return redisClient.keysAsync(key).then(results => {
        return results.length;
    }).catch(console.error);
}

//在有序列表{{头部}}增加值
function lpush(key,value) {
    return redisClient.lpushAsync(key,value).then(results => {
        return results;
    }).catch(console.error);
}
//在有序列表{{尾部}}增加值
function rpush(key, value) {
    return redisClient.rpushAsync(key, value).then(results => {
        return results;
    }).catch(console.error);
}

//向hash field 字段增加一定的值
function incre_hash_field(key,field,value) {
    return redisClient.HINCRBYAsync(key, field, value).then(results => {
        return results;
    }).catch(console.error);
}

// 查询redis list长度
function query_list_length(key) {
    return redisClient.llenAsync(key).then(results => {
        return results;
    }).catch(console.error);
}

// 查询list信息
async function query_list(key, begin, end) {
    return redisClient.lrangeAsync(key,begin,end).then(results => {
        return results;
    }).catch(console.error);
}

//设置定时删除key 
function del_expired_key(key, time) {
    return redisClient.EXPIREAsync(key, time).then(results => {
        return results;
    }).catch(console.error);
}

//设置定时删除key 
function set_expire_time(key, time) {
    return redisClient.EXPIREAsync(key, time).then(results => {
        return results;
    }).catch(console.error);
}

// 查询集合中是否有某个元素
function query_set_exist_item(key,value){
    return redisClient.SISMEMBERAsync(key,value).then(results => {
        return results;
    }).catch(console.error);
}
// 查询集合中元素数量
function query_set_amount(key) {
    return redisClient.scardAsync(key).then(results => {
        return results;
    }).catch(console.error);
}

// 发送订阅消息
function send_subscribe_message(msg,programid) {
    console.log('发送服务消息');
    if (programid==1) {
            return getAccessToken().then(accessToken => {
        return axios.post('https://api.weixin.qq.com/cgi-bin/message/subscribe/send', msg, {
            params: {access_token: accessToken,},
        }).then(({data}) => {
            console.log('我是data', data.errcode);
            return data;
        });
    });
    }else if (programid==2) {
            return getAccessToken_lottery().then(accessToken => {
        return axios.post('https://api.weixin.qq.com/cgi-bin/message/subscribe/send', msg, {
            params: {access_token: accessToken,},
        }).then(({data}) => {
            console.log('我是data', data.errcode);
            return data;
        });
    });
    }
}


/**
 * 如果用户有sharer，将用户的key添加到sharer的集合中。
 * 后续需要修改这个，查询sharees_uid表中，是否有超过50人，如果有超过50人则不进行操作。
 */
function set_sharer(sharer_uid,key) {
    redisClient.smembersAsync('sharees_' + sharer_uid).then(results => {
        let amounts = results.length;
        if (amounts<50){
            redisClient.saddAsync('sharees_' + sharer_uid, key).then(result => {
                console.log(result);
            }).catch(console.error);
        }
    }).catch(console.error);
}

/**
 * 广告抽奖
 * 返回值是抽奖结果抽奖结果：object
 */
async function adlottery(uid, gid) {
    console.log('广告抽奖：用户:',uid,',抽奖商品',gid);
    let type = await this.get_field('item_' + gid, 'lottery_rank');
    if (!type) {type = '2';}
    let time_stamp = this.get_times();
    let period = await this.get_field('settings', 'period');
    let key = 'l1_' + uid + '_' + this.get_full_time() + '_' + time_stamp;
    let code = this.get_times();
    return redisClient.hmsetAsync(key, 'gid', gid, 'code', String(code).slice(-Number(type)-3), 'period', period, 'uid', uid, 'time_stamp', time_stamp, 'key', key, 'type', type).then(results => {
        this.del_expired_key(key,2592000);
        return this.get_hash(key);
    }).catch(console.error);
}


/**
 * 积分抽奖
 * 返回值是抽奖结果抽奖结果：object
 */
async function wish_lottery(uid, objectid, gid ,groupid) {
    console.log('积分抽奖:user=',uid,';gid=',gid,';groupid=',groupid,';objectid=',objectid);
    let that = this;
    let item = await this.get_hash('item_' + gid);//抽奖类型，排列3还是排列5，默认排列3
    let {type ='2',wish_price = 20} = item;
    let intergal = await that.get_field('user_' + objectid, 'f_balance');
    if (Number(intergal) >= Number(wish_price)) {
        let time_stamp = this.get_times();
        let period = await this.get_field('settings', 'period'); //抽奖期次
        let key = 'l2_' + uid + '_' + this.get_full_time() + '_' + time_stamp; //
        let code = this.get_times();//抽奖的券号
        return redisClient.hmsetAsync(key, 'groupid', groupid, 'amount', Number(wish_price), 'gid', gid, 'code', String(code).slice(-Number(type) - 3), 'period', period, 'uid', uid, 'time_stamp', time_stamp, 'key', key, 'type', type).then(results => {
            this.del_expired_key(key, 2592000);
            this.wish_record(uid, -wish_price, '您参与' + item.name + '产品积分抽奖消耗' + wish_price + '积分')
            return this.get_hash(key);
        }).catch(console.error);
    } else {
        return 0;
    }
}

/**
 * 群抽奖
 */
async function group_lottery(uid, sharer, openid, key, lottery_times, gl_times,gid,groupid,times) {
    console.log('群抽奖:user=', uid, ';sharer=', sharer, ';openid=', openid, ';key=', key, ';lottery_times=', lottery_times, ';lottery_times=', gl_times);
    let that = this;
    //设置用户今天已经抽奖
    let user_lottery_key = 'l3_' + that.get_full_time();
    let setinfo = await that.add_set(user_lottery_key, uid);
    //当第一次抽奖时，将这个抽奖人的sharer设置为抽奖发起人
    if (lottery_times == 0) {
        that.set_hash('lottery_owner',key,sharer);
    }
    let record = () =>{
        let info = {}
        info.key = key;
        info.gid = gid;
        info.code = times;
        info.groupid = groupid;
        that.lpush('record_group_' + uid, JSON.stringify(info));
        that.set_expire_time(key, 259200);
    }

    //当抽奖次数 == 设置抽奖的次数时，开奖
    if (lottery_times == gl_times-1) {
        //  进入抽奖流程
        let has_award_person = false;//记录中是否有中奖的人员
        let msg = await that.get_set(key);
        msg.map(i => {
            let item = JSON.parse(i);
            if(item.get == true) {
                has_award_person = true;
            }
            return item;
        })
        if (has_award_person) {
            //已经抽出了奖品
        } else {
            //未抽奖，进行抽奖
            console.log(groupid,'群进入抽奖流程');
            redisClient.spopAsync(key).then(results => {
                let dt = JSON.parse(results);
                dt.get = true;
                that.add_set(key,JSON.stringify(dt));
            });
        }
    };
    //设置抽奖信息
    let userinfo = await that.get_hash('user_'+openid);
    let info = {};
    info.name = userinfo.nickName;
    info.image = userinfo.image;
    info.get = false;
    info.uid = uid;
    that.add_set(key, JSON.stringify(info));
    record(); //生成抽奖记录。
}

/**
 * 积分兑换
 * 返回值是抽奖结果抽奖结果：object
 */
async function wish_exchange(objectid) {
    console.log('积分兑换:objectid');
    let that = this;
    let timestamp = this.get_times();
    let intergal = await that.get_field('user_' + objectid,'f_balance');
    if (intergal>200) {
        that.increase_field('user_' + objectid,'f_balance',-200);
        that.increase_field('user_' + objectid, 'f_consume', 200);
        return String(timestamp).slice(-6);
    } else {
        return 0;
    }
}

/**
 * 生成积分兑换记录
 * @param {} user 
 * @param {*} code 
 */
function record_wish_exchange(user,code){
    console.log('生成积分兑换记录,到leancloud后台');
    let {uid = null, nickName = null} = user;
    const Exchange = AV.Object.extend('Exchange');
    const exchange = new Exchange();

    exchange.set('name', nickName);
    exchange.set('code', code);
    exchange.set('exchange', false);
    exchange.set('uid', uid);
    exchange.save()
}

/**
 * 给用户发奖励
 * @param {} sharer 
 * @param {*} ticket 
 * @param {*} uid 
 * @param {*} code 
 * @param {*} user 
 * 1 。要把 被分享人添加到 ticket_uid 中
 * 2. 查询 ticket_uid 的数量
 * 3. 查询分享人和被分享人是否已经超过100次，
 * 4.ticket,就是groupid
 */
function send_wish(uid, sharer, groupid) {
    let that = this;
    console.log('给用户发放奖励：',uid, sharer, groupid);
    let key = 'today_sharer_reward_' + that.get_full_time();
    //设置赠送积分的数量
    let reward = common.creat_random(15,25);
    let send_wish_to_sharer = () => {
        redisClient.hgetAsync(key, groupid + '_' + sharer).then(times => {
            if(times<100){
                redisClient.hgetAsync('user_uid', id).then(objectid => {
                    redisClient.HINCRBY('user_' + objectid, 'f_balance',reward)
                    redisClient.HINCRBY(key, groupid + '_' + sharer, 1)
                    this.wish_record(sharer, reward, '恭喜您通过分享好友抽奖获得' + reward + '积分。您的好友ID：' + uid + '。');
                })
            }
        })
    }

    let query_ticket_list_item_amount = async () => {
        //查询每日 这个用户在某个群里获得奖励的次数
        redisClient.hgetAsync('today_sharer_group_reward_' + that.get_full_time(), groupid + '_' + sharer).then(group_rewrad_times => {
            if (group_rewrad_times < 6) {
                redisClient.hincrby('today_sharer_group_reward_' + that.get_full_time(), groupid + '_' + sharer,1)
                send_wish_to_sharer()
            } else {
            }
        }).catch(console.error);
    }
    query_ticket_list_item_amount()
}

/**
 * 记录错误
 */
function find_fail(func){
        const Fail = AV.Object.extend('Fail');
        const fail = new Fail();
        fail.set('func_name', func);
        fail.save()
}

/**
 * 积分消耗记录
 */
function wish_record(uid,amount,content) {
    let records = () => {
        let infor = {};
        infor.uid = uid;
        infor.content = content;
        infor.amount = amount;
        redisClient.lpushAsync('record_wish_' + uid, JSON.stringify(infor));
    }
    records();
}

/**
 * 心愿积分使用记录
 */
async function get_user_name_and_image(users) {
    let query_name_and_image = async (objectid) => {
        return redisClient.hmgetAsync('user_' + objectid, 'nickName', 'image').then(results => {
            let user_info = {};
            user_info.name = results[0];
            user_info.image = results[1];
            console.log(user_info);
            return user_info;
        });
    }
    let users_info = []
    
    for (let index = 0; index < users.length; index++) {
        let uid = users[index];
        let objectid = await common.get_field('user_uid', uid);
        let u_info = await query_name_and_image(objectid);
        users_info.push(u_info);
    }
    return users_info;
}
/**
 * 查询某个数据是否在list中
 * lst 是list
 * da 是key
 */
function in_array(key,lst) {
    if(!lst[0]){
        console.log('空数组');
        return false;
    }else {
        console.log('数组里有信息');
        let winner = lst.filter(item => {
            return item == key;
        });
        console.log(winner);
        if (winner[0]) {
            return true
        } else {
            return false
        }
    }

}
/**
    limit_lottery 发放奖励
 */
function get_limit_lottery_award(uid, code, key, goodinfos, lottery_times) {
        const Handsel = AV.Object.extend('Handsel');
        const handsel = new Handsel();
        handsel.set('user', uid);
        handsel.set('item', goodinfos.goodid);
        handsel.set('key', key);
        handsel.set('times', String(lottery_times));
        handsel.set('send', false);
        handsel.set('name', goodinfos.name);
        handsel.set('price', goodinfos.price);
        handsel.set('image', goodinfos.image);
        handsel.set('type', 3);// 2 handsel  3 limit_lottery 
        handsel.set('set_lottery_times', goodinfos.ll_times);
        handsel.save().then(() => {
            console.log('用户:'+uid+'领取限定助力商品');
        }, (error) => {
            console.log(error);
        });
}

/**
    limit_lottery 发放奖励
 */
function get_group_lottery_award(uid, code, key, goodinfos, lottery_times) {
    const Handsel = AV.Object.extend('Handsel');
    const handsel = new Handsel();
    handsel.set('user', uid);
    handsel.set('item', goodinfos.goodid);
    handsel.set('key', key);
    handsel.set('times', String(lottery_times));
    handsel.set('send', false);
    handsel.set('name', goodinfos.name);
    handsel.set('price', goodinfos.price);
    handsel.set('image', goodinfos.image);
    handsel.set('type', 4); // 2 handsel  3 limit_lottery 4 group_lottery
    handsel.set('set_lottery_times', goodinfos.ll_times);
    handsel.save().then(() => {
        console.log('用户:' + uid + '领取限定助力商品');
    }, (error) => {
        console.log(error);
    });
}

module.exports.creat_random = creat_random;
module.exports.get_times = get_times;
module.exports.set_string = set_string;
module.exports.get_string = get_string;

module.exports.get_set = get_set;
module.exports.set_hash = set_hash;
module.exports.set_hash_only = set_hash_only;
module.exports.get_field = get_field;
module.exports.get_hash = get_hash;
module.exports.increase_field = increase_field;

module.exports.add_set = add_set;
module.exports.query_set_exist_item = query_set_exist_item; 
module.exports.query_set_amount = query_set_amount;// 查询集合元素数量
module.exports.query_list = query_list; //    查询list信息
module.exports.query_list_length = query_list_length; //    查询list长度

module.exports.get_list_length = get_list_length;
module.exports.get_full_time = get_full_time;
module.exports.incre_hash_field = incre_hash_field;
module.exports.lpush = lpush;
module.exports.rpush = rpush;
module.exports.del_expired_key = del_expired_key;
module.exports.has_field = has_field; //积分抽奖

module.exports.send_subscribe_message = send_subscribe_message;
module.exports.set_sharer = set_sharer;
module.exports.adlottery = adlottery;//广告抽奖
module.exports.creat_random = creat_random; //创建一个随机数
module.exports.send_wish = send_wish; //给用户发奖励
module.exports.wish_exchange = wish_exchange; //积分兑换
module.exports.wish_lottery = wish_lottery; //积分抽奖
module.exports.record_wish_exchange = record_wish_exchange; //积分抽奖
module.exports.group_lottery = group_lottery; //群抽奖



module.exports.find_fail = find_fail; // 云函数报错
module.exports.wish_record = wish_record; //    生成积分记录
module.exports.get_user_name_and_image = get_user_name_and_image; //    通过uid查询用户的name 和image


module.exports.in_array = in_array; //    通过uid查询用户的name 和image
module.exports.set_expire_time = set_expire_time; //    通过uid查询用户的name 和image
module.exports.get_limit_lottery_award = get_limit_lottery_award; //    发放limit_lottery 抽奖的奖励
module.exports.get_group_lottery_award = get_group_lottery_award; //    发放group_lottery 抽奖的奖励

