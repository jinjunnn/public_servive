/**
 * 这个是海淘达人，好好抽等代码
 */
const redisClient = require('./redis').redisClient; //使用redis客户端。
const base64 = require('base64encodedecode'); //将二进制数据转码成base64
const AV = require('leanengine');     //使用 leanengine
const Promise = require('bluebird');  //处理promise异步方法，将redis封装为promise的异步方法。
const _ = require('underscore');      //使用map() filter()等方法
const Order = require('./order');     //引用自定义Order类
const common = require('./common'); //存放可以复用的代码
const formid = require('./formid'); //发放formid
const goods = require('./goods'); //商品的管理
const upload_info = require('./upload_info'); //上传goods到redis
const axios = require('axios');
const uuid = require('uuid/v4');
const wxpay = require('./wxpay');     //使用微信支付。
const {
  getAccessToken,
  getAccessToken_lottery
} = require('./access-token'); //生成accesstoken并且保持有效。
const WXBizDataCrypt = require('./WXBizDataCrypt'); //解析用户数据
const userPrefix = 'user_';

/////////////////////////////////////////////////
// 核心代码区
/**
 * 查询第三方的商品信息,这段代码是用于查询多个listing，每个listing显示6个good
 */
AV.Cloud.define('query_listings_and_goods', (request, response) => {
  let {page_index=0} = request.params;
    let query_goods = (index) => {
      return redisClient.lrangeAsync('goods_list_' + index,0,4).then((items_set) => {
          let multi_goods = redisClient.multi();
          for (const i of items_set) { //这个i是每个商品的key
            multi_goods.hgetall(i);
          }
          return multi_goods.execAsync().then(function (result) {//用filter函数，将空数据清除掉。
            return result.filter(function (item) {
              return item;
            });
          });
        })
        .catch(() => {console.log('query_listings_and_goods函数出错');});
    }

    let query_listings = (index) => {
      return redisClient.lrangeAsync('lottery_app_free_lottery_list', index * 5, index * 5 + 4).then(list => {
        console.log('我是list',list);
        let multi = redisClient.multi();
        for (const item of list) {
          multi.hgetall(item);
        };
        return multi.execAsync().then(function (result) {
            return result;
          })
          .catch(() => {
            return false;
          });
      });
    }

    let query_listings_and_goods = async (i) => {
      let data = [];
      let listings = await query_listings(i);//获得5个listings
      for (const listing of listings) {
        let goods = await query_goods(listing.list_id);//获得listings下的商品
        let value = {
          listing: listing,
          goods: goods,
          index: i,
        }
        if (goods.length > 4){//如果这个listing下面有4个在售产品，才会显示，不然过滤掉。
            data.push(value);
        }
      }
      // console.log(data);
      response.success(data);
    }
    query_listings_and_goods(page_index);//执行函数
});
/**
 * 将redis 数组的key全部取出，再根据key，取出所有hash值
 * 向list数据皆为增加一条记录。
 */

AV.Cloud.define('get_list_details_new', (request, response) => {
  let {key,begin,end} = request.params;
  redisClient.lrangeAsync(key, begin, end).then(results => {
    let multi = redisClient.multi();
    for (const i of results) {
      multi.hgetall(i);
    }
    multi.execAsync().then(function (data) {
      response.success(data);
    }).catch(() => {
      response.error(error);
    });
  }).catch(console.error);
});

/**
 * 用户点赞，给用户和分享者发放奖励。
 */
AV.Cloud.define('send_wish', (request, response) => {
    //  这个是7月25号设计的，如果没有错误这个可以删掉了。
    common.find_fail(send_wish);
});

/**
 * 用户观看广告送积分。
 */
AV.Cloud.define('send_wish_tapad', (request, response) => {
  let {uid, code} = request.params;
  let user_today_watch_ad_times_key = 'watch_ad_today_' + common.get_full_time();
  let records = (i, obid) => {
      redisClient.lpush('record_wish_' + uid, JSON.stringify(i));
      redisClient.HINCRBYAsync(user_today_watch_ad_times_key, uid, 1).catch(console.error);
      redisClient.HINCRBYAsync('user_' + obid, 'watch_ad_times', 1).catch(console.error);
  }
  let query_user = async () => {
    let objectid = await common.get_field('user_uid', uid);
    if (objectid.slice(-4) == code) {
      let watch_today = await common.get_field(user_today_watch_ad_times_key,uid);
      let watch_total = await common.get_field('user_' + objectid, 'watch_ad_times');
      if (watch_today > 20 || watch_total>1000) {
        response.success(0);
      } else if (watch_today<10){
            let reward = common.creat_random(10, 30);
            console.log('用户' + uid + '观看广告发放' + reward + '积分');
            let infor = {}
            infor.uid = uid;
            infor.content = '您通过观看广告，获得' + reward + '积分';
            infor.timestamp = common.get_times();
            records(infor, objectid);
            common.increase_field('user_' + objectid, 'f_balance', reward);
            response.success(reward);
      } else{
            let reward = common.creat_random(2, 10);
            console.log('用户'+uid+'观看广告发放' + reward + '积分');
            let infor = {}
            infor.uid = uid;
            infor.content = '您通过观看广告，获得' + reward + '积分';
            infor.timestamp = common.get_times();
            records(infor,objectid);
            common.increase_field('user_' + objectid, 'f_balance', reward);
            response.success(reward);
      }
    } else {
      // 用户鉴权出现错误 黑客
      response.success(-1);
    };
  };
  query_user();
});
/**
 * 点击广告抽奖  ad_lottery
 */
AV.Cloud.define('ad_lottery', (request, response) => {
    let {uid,gid,code} = request.params;
    let query_user = async () => {
        let objectid = await common.get_field('user_uid', uid);
        if(objectid.slice(-4)==code){
          let lottery_times = await common.get_list_length('l1_' + uid + '_' + common.get_full_time() + '*');
          if (lottery_times<10) {
            let result = await common.adlottery(uid, gid);
            common.incre_hash_field('user_' + objectid,'lottery_times',1);
            common.lpush('record_19_'+ uid,result.key);
            response.success(result);
          } else {
            response.success(0);
          }
        }else{
          response.success(-1);
        };
    };
    query_user();
});

/**
 * 积分抽奖 wish_lottery
 */
AV.Cloud.define('wish_lottery', (request, response) => {
    let {uid,gid,code,groupid,sharer} = request.params;
    console.log('用户：' + uid + '积分抽奖');
    let query_user = async () => {
        let objectid = await common.get_field('user_uid', uid);
        if(objectid.slice(-4)==code){
          let result = await common.wish_lottery(uid, objectid, gid, groupid);
          if(result==0){//未抽奖

          }
          else{//抽奖了
              common.lpush('record_20_' + uid, result.key); //积分抽奖记录
              common.increase_field('user_' + objectid, 'f_balance', -result.amount); //
              common.increase_field('user_' + objectid, 'f_consume', result.amount);
              if(sharer!=null){
                common.send_wish(uid, sharer, groupid);
              }
          }
          response.success(result);
        }else{
          response.success(-1);//鉴权失败
        };
    };
    query_user();
});


/**
 * 查询用户的某个属性
 */
AV.Cloud.define('query_user_field', (request, response) => {
    let {uid,code,field} = request.params;
    let query_user = async () => {
        let objectid = await common.get_field('user_uid', uid);
        if(objectid.slice(-4)==code){
          let result = await common.get_field('user_' + objectid, field);
          response.success(result);
        }else{
          response.success(-1);//鉴权失败
        };
    };
    query_user();
});

/**
 * 积分兑换 wish_exchange
 */
AV.Cloud.define('wish_exchange', (request, response) => {
    let {uid,code} = request.params;
    let query_user = async () => {
        let objectid = await common.get_field('user_uid', uid);
        if (objectid.slice(-4) == code) {
              let user = await common.get_hash('user_' + objectid)//查询用户
              if (user.f_balance<200){
                response.success(0); //积分不足
              }
              else{
                  console.log('user：'+uid,'进行了积分兑换。')
                  let result = await common.wish_exchange(objectid);
                  if (result != 0) {
                    common.incre_hash_field('user_' + objectid, 'exchange_times', 1);
                    common.record_wish_exchange(user, result); //将用户的兑换记录放在leancloud数据看板上。
                  }
                  response.success(result);
              }
        } 
        else {
          response.success(-1);//鉴权失败
        };
    };
    query_user();
});

/**
 * 发送订阅消息
 */
AV.Cloud.define('send_subscribe_message', (request, response) => {
  let donate = async () =>{
      let result = await common.send_subscribe_message(request.params.data, request.params.programid);
      let data = {
        user: request.params.uid,
        result: result,
      }
      response.success(data);
  }
  donate();
});


/**
 * 0元砍
 *用户发起砍价
 */
AV.Cloud.define('create_handsel', (request, response) => {
    let {uid,goodid} = request.params;
    let handsel_key = 'hs_' + uid + '_' + goodid;
    let expired = common.get_times() + 86400000;

    let records = () => {
      redisClient.lpushAsync('wish_list_' + uid, handsel_key);
      redisClient.EXPIREAsync(handsel_key, 2592000);
    }

    let create_handsel = (total,pce) => {
      return redisClient.hmsetAsync(handsel_key, 'expired', expired, 'total', total, 'paid', pce, 'key', handsel_key, 'goodid', goodid, 'uid', uid, 'times', 1).then(() => {
        records();
        return redisClient.hgetallAsync(handsel_key).then(data => {
          return data;
        }).catch(console.error);
      });
    }

    let query_goods = () => {
      return redisClient.hgetallAsync('item_' + goodid).then(goods => {
        let add_price = Number(goods.price) * 100;
        return add_price;
      }).catch(console.error);
    }

    let donate = async () => {
      let total = await query_goods();
      let price = common.creat_random(total * 6 / 10 - 50, total * 6 / 10 + 50);
      let user_get_handsel_times = await common.get_field('get_handsel_times', uid);
      if (user_get_handsel_times>=3){
        price = common.creat_random(total * 3 / 10 - 50, total * 3 / 10 + 50);
      } else if ((user_get_handsel_times >= 1)) {
        price = common.creat_random(total * 4 / 10 - 50, total * 4 / 10 + 50);
      }
      let result = await create_handsel(Number(total) ,price);
      console.log('用户' + uid + '发起了砍价');
      response.success(result);
    }
    donate();
});

/**
 * 0元砍
 * 参与砍价
 */
AV.Cloud.define('update_handsel', (request, response) => {
  let user_today_handsel_times_key = 'handsel_today_' + common.get_full_time(); //查询今日用户抽奖次数的 key
  let handsel_item_today_times = 'attend_handsels'; //查询项目今日是否有抽过奖
  let { handsel_key,uid,is_new_user=false,code,groupid=null} = request.params;
    let records = (id) => {
      console.log('用户' + uid + '参与砍价');
      redisClient.HINCRBYAsync(handsel_key, 'times', 1); //增加一次抽奖
      redisClient.HINCRBYAsync(user_today_handsel_times_key, uid, 1).catch(console.error); //用户今日抽奖的次数增加1
      redisClient.HINCRBYAsync('user_' + id, 'handsel_times', 1).catch(console.error); //用户总抽奖次数增加1
      redisClient.HSETAsync(handsel_item_today_times, handsel_key + '_' + uid, common.get_full_time()).catch(console.error); //今日已经完成对此项目的抽奖

    }
    let update_handsel = (price,id) => {
       redisClient.HINCRBYAsync(handsel_key, 'paid', price).then(() => {
        records(id);
         redisClient.hgetallAsync(handsel_key).then(handsel => {
           handsel.pay = price;
           response.success(handsel);
        }).catch(console.error);
      });
    }

    let handsel_it = async (objectid) => {
          //查询  handsel 项目
          let price = 5;
          let handsel = await common.get_hash(handsel_key);//助力项目
          // let user_handsel_times = await common.get_field('user_' + objectid, 'handsel_times');//用户总的抽奖次数
          let user_handsel_times_today = await common.get_field(user_today_handsel_times_key, uid); // 今日的抽奖次数
          if (user_handsel_times_today > 6) {
            response.success(0); //如果用户助力超过 6次，今日不可以再次助力
          } else {
              if(Number(handsel.times) < 10) {
                price = common.creat_random(20, 50);
              }else {
                price = common.creat_random(3, 10);
              }
              update_handsel(price, objectid);
          }
    }
    let query_user = async () => {
      let objectid = await common.get_field('user_uid', uid);
      if (objectid.slice(-4) == code) {
        let is_user_handsel = await common.has_field('attend_handsels', handsel_key + '_' + uid)
          if (is_user_handsel==0){
            handsel_it(objectid); // 用户未助力过，进行助力操作
          }else{
            response.success(-2);//用户今日已经助力过。
          }
      } else {
        response.success(-1); //鉴权失败
      };
    };
    query_user();
});

/**
 * 通过200积分对砍价进行加速
 */
AV.Cloud.define('handsel_quicken', (request, response) => {
  let result = {};
  let handsel_quicken = async () => {
      let handsel = await common.get_hash(request.params.key);
      console.log('handsel的key:',handsel.key);
      let objectid = await common.get_field('user_uid', handsel.uid);
      let intergal = await common.get_field('user_' + objectid,'f_balance');
      if(intergal>=200){
        common.increase_field('user_' + objectid, 'f_balance',-200);
        common.set_hash(request.params.key,'quicken',1);
        common.increase_field(request.params.key, 'paid', 200);
        result.data = await common.get_hash(request.params.key);
        result.code = 1;
        response.success(result);
      }else{
        result.code = 0;
        response.success(result);
      }
  };
  handsel_quicken();
});

/**
 * 查询某用户今日抽奖次数。
 */
AV.Cloud.define('query_user_group_lottery_times', (request, response) => {
  let {app_name = null, encryptedData, iv, uid, sharer = null, goodid} = request.params;
  let result = {};
  let get_info = async (appid) => {
    let user_lottery_key = 'l3_' + common.get_full_time();
    let has_lotteryed = await common.query_set_exist_item(user_lottery_key, uid);
    //用户今日可以抽奖
    if (has_lotteryed == 0) {
      let openid = await common.get_field('user_uid', uid);
      let sessionKey = await common.get_field('user_' + openid, 'session_key');
      let pc = new WXBizDataCrypt(appid, sessionKey);
      let data = pc.decryptData(encryptedData, iv);
      let gid = data.openGId;

      let key = 'gl_' + common.get_full_time() + '_' + gid + '_' + goodid;
      let lottery_times = await common.query_set_amount(key);
      let gl_times = await common.get_field('item_' + goodid, 'gl_times');

      gl_times = Number(gl_times);
      if (lottery_times >= gl_times) {
        result.code = -1; //已经完成抽奖。
        response.success(result);
      } else {
        result.code = 0; //已经完成抽奖。
        response.success(result);
      }
    } 
    //用户今日不能抽奖。
    else {
      result.code = -2; //用户今日已经抽过奖；
      response.success(result);
    }
  }
  get_info(process.env.WEIXIN_APPID_LOTTERY);
});

/**
 * 群抽奖
 */
AV.Cloud.define('group_lottery', (request, response) => {
  let {app_name = null, encryptedData, iv, uid, sharer = null, goodid} = request.params;
  let result = {};
  let get_info = async (appid) => {
    let user_lottery_key = 'l3_' + common.get_full_time();
    let has_lotteryed = await common.query_set_exist_item(user_lottery_key, uid);
    if (has_lotteryed == 0) {
      let openid = await common.get_field('user_uid', uid);
      let sessionKey = await common.get_field('user_' + openid, 'session_key');
      let pc = new WXBizDataCrypt(appid, sessionKey);
      let data = pc.decryptData(encryptedData, iv);
      let gid = data.openGId;//群id

      let times = common.get_full_time();
      let key = 'gl_' + times + '_' + gid + '_' + goodid;
      let lottery_times = await common.query_set_amount(key);
      let gl_times = await common.get_field('item_' + goodid, 'gl_times');
      gl_times = Number(gl_times);
      if (lottery_times < gl_times) {
        console.log('用户' + uid + '进行群抽奖,群id是' + gid);
        await common.group_lottery(uid, sharer, openid, key, lottery_times, gl_times,goodid,gid,times);
        result.msg = await common.get_set(key);
        result.code = 0; //正常，可以抽奖的状态
        response.success(result);
      } else {
        result.code = -1; //已经完成抽奖。
        response.success(result);
      }
    } else {
      result.code = -2; //用户今日已经抽过奖；
      response.success(result);
    }
  }
  get_info(process.env.WEIXIN_APPID_LOTTERY);//如果将来其他小程序则这里增加一个if语句
});

/**
 * 获取群id
 */
AV.Cloud.define('get_group_id', (request, response) => {
  let {app_name = null, encryptedData, iv, uid} = request.params;
  let get_info = async (appid) => {
    let openid = await common.get_field('user_uid', uid);
    let sessionKey = await common.get_field('user_' + openid, 'session_key');
    let pc = new WXBizDataCrypt(appid, sessionKey);
    let data = pc.decryptData(encryptedData, iv);
    common.set_hash_only('groups', data.openGId, 0);
    console.log('群id==',data.openGId);
    response.success(data.openGId);
  }
  if(app_name == 'lottery'){
      get_info(process.env.WEIXIN_APPID_LOTTERY);
  }else{
      get_info(process.env.WEIXIN_APPID);
  }
});

/**
 * 用户打开 页面后查询 限定抽奖 的数据有没有自己，以及自己是否符合抽奖规则。
 * 后台设置的限定次数抽奖的关键词： good.ll_times
 */
AV.Cloud.define('query_limit_lottory', (request, response) => {
  let {gid,sid,uid} = request.params; //gid:商品id sid：分享id；uid:userid；
  console.log('查询限定抽奖:', '商品id:', gid, '分享用户:', sid, '查询用户:', uid);
  let each_day_top_lottery_times = 5;
  let key = 'limit_lottery_' + common.get_full_time() + '_' + sid + '_' + gid;

  let query_good_status = async () => {
    let limit_lottery_info = await common.query_list(key, 0, -1);
    let goodinfo = await common.get_hash('item_' + gid); //商品的状态，如果是1，则代表这个商品的助力已经结束了。
    let {
      limit_lottery_ended = null, ll_times
    } = goodinfo;
    if (limit_lottery_ended == '1') { //如果商品已经结束了，返回code = -1
      let result = {};
      result.code = -1;
      result.data = limit_lottery_info;
      response.success(result);
    } else {
      let today_lottery_times = await common.get_field('limit_lottery_each_day_' + common.get_full_time(), uid);
      console.log(today_lottery_times);
      if (Number(ll_times) <= limit_lottery_info.length) {
        let result = {};
        result.code = -2; // 已经完成助力
        result.data = limit_lottery_info;
        response.success(result);
      } else if (common.in_array(uid, limit_lottery_info)) {
        let result = {};
        result.code = -3; // 用户已经助力过。
        result.data = limit_lottery_info;
        response.success(result);
      } else if (Number(today_lottery_times) >= each_day_top_lottery_times) {
        let result = {};
        result.code = -5; // 用户今日助力册数已经达到最高。
        result.data = limit_lottery_info;
        response.success(result);
      } else {
        let result = {};
        result.code = 0; // 用户未助力过。
        result.data = limit_lottery_info;
        response.success(result);
      }
    }
  }
  query_good_status();
});

/**
 * 限定次数助力
 */
AV.Cloud.define('limit_lottery', (request, response) => {
  let {gid,sid,uid,code} = request.params;//gid:商品id sid：分享id；uid:userid；code:objectid的后四位
  console.log('查询限定抽奖:', '商品id:', gid, '分享用户:', sid, '查询用户:', uid);
  let each_day_top_lottery_times = 5;
  let times = common.get_full_time()
  let key = 'limit_lottery_' + times + '_' + sid + '_' + gid;

  let query_good_status = async () =>{
    let limit_lottery_info = await common.query_list(key, 0, -1);
    let goodinfo = await common.get_hash('item_' + gid);//商品的状态，如果是1，则代表这个商品的助力已经结束了。
    let {limit_lottery_ended=null,ll_times} = goodinfo;
    if (limit_lottery_ended == '1') { //如果商品已经结束了，返回code = -1
      let result = {};
      result.code = -1;
      result.data = limit_lottery_info;
      response.success(result);
    }else{
      let today_lottery_times = await common.get_field('limit_lottery_each_day_' + common.get_full_time(), uid);
      if (Number(ll_times) <= limit_lottery_info.length){
              let result = {};
              result.code = -2;// 已经完成助力
              result.data = limit_lottery_info;
              response.success(result);
      } else if (common.in_array(uid, limit_lottery_info)) {
              let result = {};
              result.code = -3; // 用户已经助力过。
              result.data = limit_lottery_info;
              response.success(result);
      } else if (Number(today_lottery_times) >= each_day_top_lottery_times) {
              let result = {};
              result.code = -5; // 用户今日助力册数已经达到最高。
              result.data = limit_lottery_info;
              response.success(result);
      } else {
              let result = {};
              result.code = 0; // 用户未助力过。
              let limit_lottery_times = await common.lpush(key,uid);//增加用户助力记录。
              if (limit_lottery_times==1){
                //如果如果有第一个用户参与 限定助力，建立限定助力表。
                let info = {}
                info.key = key;
                info.gid = gid;
                info.code  = times;
                common.lpush('record_limit_'+sid,JSON.stringify(info));
                common.set_expire_time(key,259200);
              }
              await common.increase_field('limit_lottery_each_day_' + common.get_full_time(), uid,1);//增加助力用户  今日助力次数；

              let new_limit_lottery_info = await common.query_list(key, 0, -1);
              result.data = new_limit_lottery_info;
              response.success(result);
      }
    }
  }
  let query_objectid = async () => {
    let objectid = await common.get_field('user_uid', uid);
    if (objectid.slice(-4) == code) {
      query_good_status();
    } else {
      let result = {};
      result.code = -4;//用户鉴权失败。
      response.success(result);
    }
  }
  query_objectid();
});


/**
 * 查询用户限定抽奖的数据表并返回
 */
AV.Cloud.define('query_limit_lottery_records', (request, response) => {
  let lst = [];
  let query_info = async (data) => {
      for (const i of data) {
          let item = JSON.parse(i);
          let b = await common.get_hash('item_' + item.gid);
          item.goods_info = b;
          if (request.params.product == 'limit_lottery'){
             let a = await common.query_list(item.key, 0, -1);
             item.lottery_info = a;
             item.lottery_times = a.length;
          }
          else if (request.params.product == 'group_lottery'){
            let c = await common.get_set(item.key);
            let a = [];
            c.map(item =>{
              a.push(JSON.parse(item));
            });
            item.lottery_info = a;
            item.lottery_times = a.length;
          }
          lst.push(item);
      }
      response.success(lst);
  }
  redisClient.lrangeAsync(request.params.key, request.params.begin, request.params.end).then(results => {
      query_info(results);
  }).catch(console.error);
});


/**
 * 限定抽奖  领取奖品
 */
AV.Cloud.define('get_limit_lottery_award', (request, response) => {
  let {uid,code,key,gid} = request.params;
  let donate = async () => {
        let lottery_times = await common.query_list_length(key);
        let goodinfos = await common.get_hash('item_' + gid);
        if (Number(goodinfos.ll_times) > Number(lottery_times)) {
          response.success(-1); //未完成
        } else {
          common.get_limit_lottery_award(uid, code, key, goodinfos, lottery_times);
          response.success(1); //已完成
        }
  } 
  const query = new AV.Query('Handsel');
  query.equalTo('key', key);
  query.first().then((result) => {
    if (result) {
      response.success(0);//已经领取过奖励
    } else {
      donate()
    }
  });
});

/**
 * 群抽奖  领取奖品
 */
AV.Cloud.define('get_group_lottery_award', (request, response) => {
  let {uid,code,key,gid} = request.params;
  let donate = async () => {
        let lottery_users = await common.get_set(key);
        let lottery_times = lottery_users.length;
        let query_winner = lottery_users.filter(i => {
            let user = JSON.parse(i);
            return user.get == true;
        })
        let winner = null;
        if (query_winner[0]) {
            winner = JSON.parse(query_winner[0]);
        }
        let goodinfos = await common.get_hash('item_' + gid);
        
        if (Number(goodinfos.gl_times) > Number(lottery_times)) {
          response.success(-1); //未完成
        } else if (winner.hasOwnProperty('uid') && winner.uid == uid) {
          common.get_group_lottery_award(uid, code, key, goodinfos, lottery_times);
          response.success(1); //已完成
        } else {
          response.success(-2); //奖励用户和用户本人不一样。
        }
  } 
  const query = new AV.Query('Handsel');
  query.equalTo('key', key);
  query.first().then((result) => {
    if (result) {
      response.success(0);//已经领取过奖励
    } else {
      donate()
    }
  });
});

/**
 * 通过用户uid 列表查询用户名和用户头像等信息
 * 
 */
AV.Cloud.define('query_users_infors', (request, response) => {
  let {users} = request.params;
  let query = async () => {
    let info = await common.get_user_name_and_image(users);
    response.success(info);
  }
  query();
});

/**
 * 设置用户的信息
 * 
 */
AV.Cloud.define('set_users_field', (request, response) => {
  let {uid,code,field,value} = request.params;
  let donate = (objectid) => {
      if (objectid.slice(-4) == code) {
        common.set_hash('user_'+objectid,field,value);
        let result = {};
        result.code = 0;//修改成功
        response.success(result);
      } else {
        let result = {};
        result.code = -1;//用户鉴权失败。
        response.success(result);
      }
  }
  let query_objectid = async () => {
      let objectid = await common.get_field('user_uid',uid);
      donate(objectid);
  }
  query_objectid()
});
/**
 * incre 用户的数值 
 * 
 */
AV.Cloud.define('increase_users_field', (request, response) => {
  let {uid,code,field,value} = request.params;
  let donate = (objectid) => {
      if (objectid.slice(-4) == code) {
        common.increase_field('user_'+objectid,field,value);
        let result = {};
        result.code = 0;//修改成功
        response.success(result);
      } else {
        let result = {};
        result.code = -1;//用户鉴权失败。
        response.success(result);
      }
  }
  let query_objectid = async () => {
      let objectid = await common.get_field('user_uid',uid);
      donate(objectid);
  }
  query_objectid()
});

////////////////////////////////////////////////////////////这个是海淘工具箱的代码
/**
 * 确认订单
 *
 * 1.交易双方的用户trading_time增加 1
 * 2. quote 的 accept == 1； wechatid 显示对方的wechatid；
 * 3. order 的 accept == 1; wechatid 显示对方的 wechatid；
 * 4. 给quote 发送一个服务通知
 * 5. 全新的页面，页面内容包含服务双方的信息。
 */

AV.Cloud.define('accept_order', (request, response) => {
  let {acceptid,orderid,quoteid} = request.params;
  let get_hash = (key) => {
    return redisClient.hgetallAsync(key).then(results => {
      return results;
    });
  };
  let set_accept = async () => {
      let quote = await get_hash(quoteid);
      let order = await get_hash(orderid);
      redisClient.hmsetAsync(acceptid,
                            'order_id', order.time,
                            'order_type', quote.item_type,
                            'order_title', order.title,
                            'order_content', order.content,
                            'order_image', order.image,
                            'accept_key', acceptid,
                            'accept_price', quote.amount,
                            'accept_rate', quote.rate,
                            'order_key', orderid,
                            'order_uid', order.uid,
                            'order_wechatid', order.wechatid,
                            'order_uimage', order.uimage,
                            'quote_key', quoteid,
                            'quote_uid', quote.uid,
                            'quote_wechatid', quote.wechatid,
                            'quote_uimage', quote.uimage
                            )
                  .then(results => {
                        response.success(1);
      }).catch(console.error);
      
  };
  set_accept();
});


/**
 * 用户输入邀请码注册
 */
AV.Cloud.define('invitation_code', (request, response) => {
  let {code,uid,invitation_code} = request.params;
  console.log(code,uid,invitation_code);
  let donate = async (objectid) => {
      let result = await common.has_field('invitation_code', invitation_code);
      if (result == 1) {
        let set_user_status = await common.set_hash('user_'+ objectid,'status',2);
        let  sharer = await common.get_field('invitation_code', invitation_code);
        common.add_set('invater_' + sharer,uid);
        let result = {};
        result.result = 2;
        result.code = 0;//用户鉴权失败。
        response.success(result);
      }else{
          let result = {};
          result.code = -1;//用户鉴权失败。
          response.success(result);
      }
  }
  let query_objectid = async () => {
      let objectid = await common.get_field('user_uid',uid);
      donate(objectid);
  }
  query_objectid()
});


///////////////////////////////////////////////////////////////注册和登录的API
/**
用户登录：
1.通过传的res.code 解密用户的openid
2.查询用户的openid，是否存在于redis的key中；
3.如果存在key，证明用户已经登录过；更新用户的基础信息；
4.如果未存在key，证明用户是新用户。
5.数据返回值。
 */
AV.Cloud.define('login', (request, response) => {
  let {app_name=null,sharer=null,code} = request.params;
  let donate_user = async (openid,session_key) => {
    let key = userPrefix + openid;
    let userinfo = await common.get_hash(key);
    if(userinfo){
          let set_session_key = await common.set_hash(key,'session_key',session_key);
          userinfo.is_new_user = false;
          userinfo.code = userinfo.objectid.slice(-4)
          delete userinfo.objectid;
          delete userinfo.session_key;
          console.log('user login=',userinfo.uid);
          response.success(userinfo);
    }else{
          let current_user_id = await common.get_field('settings', 'current_user_id');
          if (sharer != null) {common.set_sharer(sharer, key)}//如果存在sharer，把sharer记录下来。}
          let multi = redisClient.multi();
          multi.hset('user_uid', current_user_id, openid); //建立uid 与openid的对应表;
          if(app_name='lottery'){multi.hmset(key, 'objectid', openid, 'sharer', sharer, 'session_key', session_key, 'uid', current_user_id, 'balance', 0, 'consume', 0, 'i_balance', 0, 'i_consume', 0, 'f_balance', 0, 'f_consume', 0, 'share_times', 0, 'watch_times', 0, 'deposit', 0);
          }else{multi.hmset(key, 'objectid', openid, 'sharer', sharer, 'session_key', session_key, 'uid', res, 'balance', 6, 'consume', 0, 'i_balance', 18, 'i_consume', 0, 'f_balance', 100, 'f_consume', 0, 'share_times', 0, 'watch_times', 0, 'deposit', 0);
          }
          multi.hincrby('settings', 'current_user_id', 1);
          multi.execAsync().then(() => {
            redisClient.hgetallAsync(key).then(result => {
              let user = result;
              user.is_new_user = true;
              user.code = user.objectid.slice(-4)
              delete user.objectid;
              delete user.session_key;
              console.log('new user login=',user.uid);
              response.success(user);
            });
          });
    }
  }
  let get_user_openid_and_session_key = (appid,appsecret) => {
          axios.get('https://api.weixin.qq.com/sns/jscode2session', {
            params: {
              grant_type: 'authorization_code',
              appid: appid,
              secret: appsecret,
              js_code: code,
            }
          }).then(({
            data: {openid,session_key}
          }) => {
            donate_user(openid,session_key);
          })
  }
  if(app_name=='lottery'){get_user_openid_and_session_key(process.env.WEIXIN_APPID_LOTTERY,process.env.WEIXIN_APPSECRET_LOTTERY)}
  else if(app_name=='shop'){get_user_openid_and_session_key(process.env.WEIXIN_APPID_SHOP,process.env.WEIXIN_APPSECRET_SHOP)}
  else{get_user_openid_and_session_key(process.env.WEIXIN_APPID,process.env.WEIXIN_APPSECRET)}
});


/**
 * 获取用户的小程序码
 */
AV.Cloud.define('getMiniQRCode', (request,response) => {
      /**
       * programid 是哪个小程序， 因为要用到getAccessToken
       */
      let {scene=null,page=null,type=null,programid=null} = request.params;
      const data = {
        scene: scene,
        page:page,
      };
      getAccessToken().then(accessToken => {
        axios.post('https://api.weixin.qq.com/wxa/getwxacodeunlimit', data, {
          params: {access_token: accessToken}, 
          responseType: 'arraybuffer', 
          responseEncoding: null, // default
        }).then(({
          data
        }) => {
          if(type == 'user'){
            let message64 = {
              base64: data.toString('base64')
            };
            let file1 = new AV.File('resume.png', message64);
            file1.save().then(function (file) {
              response.success(file);
            }, function (error) {
              // 保存失败，可能是文件无法被读取，或者上传过程中出现问题
            });
          }
          else {
            response.success(data);
          }
          
        })
      });
});

/**
用户授权后，获取用户的基础信息：
1.通过传的res.code 解密用户的openid；
2.查询用户的openid，是否存在于redis的key中；
3.如果存在key，证明用户已经登录过；更新用户的基础信息；
4.如果未存在key，证明用户是新用户。
 */
AV.Cloud.define('set_user_info', (request, response) => {
    let {gender, nickName, language, city, province, country, avatarUrl} = request.params.userinfo;
    let query_key = async() => {
        let key = await common.get_field('user_uid',request.params.uid);
        redisClient.hmsetAsync('user_' + key, 'gender', gender, 'nickName', nickName, 'language', language, 'city', city, 'province', province, 'country', country, 'image', avatarUrl).then((results) => {
          response.success(results);
        }).catch(console.error);
    }
    query_key();
});

/**
 * 获取用户的信息
 */
AV.Cloud.define('get_user_info', (request, response) => {
    let query_key = async() => {
        let key = await common.get_field('user_uid', request.params.uid);
        redisClient.hgetallAsync('user_' + key).then(result => {
          let user = result;
          user.is_new_user = true;
          user.code = user.objectid.slice(-4)
          delete user.objectid;
          delete user.session_key;
          // console.log('我是新用户注册',user);
          response.success(user);
        }).catch(console.error);
    }
    query_key();
});

/**
 * 用户授权后， 解密用户的手机号码， 并将手机号码传到用户key 的field（ phoneNmuber） 中
 * 如果用户同意了授权，返回手机号码，如果用户没有同意授权，返回0
 */
AV.Cloud.define('getPhoneNumber', (request, response) => {
    const field = 'phoneNumber';
    let {uid,code,encryptedData,iv,app_name} = request.params;
    let donate = async (appid, session_key) => {
        let pc = new WXBizDataCrypt(appid, session_key);
        let data = pc.decryptData(encryptedData, iv);
        let set_phoneNumber = await common.set_hash(userPrefix + openid, field, data.phoneNumber);
        response.success(data);
    }
    let query_user_sessionKey = async () => {
        let openid = await common.get_field('user_uid',uid);
        if(openid.slice(-4) == code){
          let userinfo = await common.get_hash('user_' + openid);
          if(app_name=='lottery'){
              donate(process.env.WEIXIN_APPID_LOTTERY,userinfo.session_key);
          }
          else if (app_name=='shop') {donate(process.env.WEIXIN_APPID_SHOP,userinfo.session_key);}
          else{
              donate(process.env.WEIXIN_APPID,userinfo.session_key);
          }
        }
    }
    query_user_sessionKey()
});

/**
 * 向redis set  hash key  value=
 * 
 */
AV.Cloud.define('setString', (request, response) => {
  let {key ,value} = request.params;
  redisClient.setAsync(key, value).then(result => {
    response.success(result);
  }).catch(() => {
    response.error(error);
  });
});

/**
 * 设置key的过期时间
 */
AV.Cloud.define('setExpireTime', (request, response) => {
  let {key ,value} = request.params;
  redisClient.expireAsync(key,value).then(result => {
    response.success(result);
  }).catch(() => {
    response.error(error);
  });
});

/**
 * 向redis的key中取值
 * 
 */
AV.Cloud.define('getValue', (request, response) => {
  redisClient.getAsync(request.params.key).then(result => {
    response.success(result);
  }).catch(() => {
    response.error(error);
  });
});

/**
 * 向redis某个key的feild中设值
 * 
 */
AV.Cloud.define('setField', (request, response) => {
  let {key,field,value} = request.params;
  redisClient.hsetAsync(key, field, value).then(result => {
    response.success(result);
  }).catch(() => {
    response.error(error);
  });
});
/**
 * 向redis某个key的feild中取值
 * 
 */
AV.Cloud.define('getField', (request, response) => {
  let {key,field} = request.params;
  redisClient.hgetAsync(key, field).then(result => {
    response.success(result);
  }).catch(() => {response.error(error);});
});


/**
 * increment 某个hash表的某个field
 * 这个是新的。
 */
AV.Cloud.define('increField', (request, response) => {
  let {key,field,value} = request.params;
  redisClient.HINCRBYAsync(key, field, value).then(result => {
    response.success(result);
  }).catch(() => {
    response.error(error);
  });
});

/**
 * 向redis某个hash表取全部值；
 * 
 */
AV.Cloud.define('getHash', (request, response) => {
  redisClient.hgetallAsync(request.params.key).then(result => {
    response.success(result);
  }).catch(() => {response.error(error);});
});

/**
 * hash表中是否有某field；如果result == 1 存在，如果result ==0 不存在
 */
AV.Cloud.define('hasField', (request, response) => {
  let {key,field} = request.params;
  redisClient.HEXISTSAsync(key, field).then(result => {
    response.success(result);
  }).catch(() => {
    response.error(error);
  });
});


/**
 * 是否存在key
 */
AV.Cloud.define('has_key', (request, response) => {
  let {key} = request.params;
  console.log(key);
  redisClient.EXISTSAsync(key).then(result => {
    console.log(result)
    response.success(result);
  }).catch(() => {
    response.error(error);
  });
});

/**
 * 向redis模糊查询一个hash类型的[],再将列表中的值全部取出；
 * 
 */
AV.Cloud.define('getListItemHash', (request, response) => {
  redisClient.keysAsync(request.params.key).then(key => {
    let multi = redisClient.multi();
    for (const i of key) {
      multi.hgetall(i);
    }
    multi.execAsync().then(function (data) {
      response.success(data);
    }).catch(() => {
      response.error(error);
    });
  })
});

/**
 * 参数key:是一个list，将参数的值取出；
 * 
 */
AV.Cloud.define('get_list_hash', (request, response) => {
  let multi = redisClient.multi();
  for (const i of request.params.key) {
    multi.hgetall(i);
  }
  multi.execAsync().then(function (data) {
    response.success(data);
  }).catch(() => {
    response.error(error);
  });
});

/**
 * 向redis模糊查询一个string类型的[],再将列表中的值全部取出；
 * 
 */
AV.Cloud.define('getListItemString', (request, response) => {
  redisClient.keysAsync(request.params.key).then(key => {
    let multi = redisClient.multi();
      for (const i of key) {
        multi.get(i);
      }
    multi.execAsync().then(function (data) {
      response.success(data);
    }).catch(() => {
      response.error(error);
    });
  })
});

/**
 * 向redis模糊查询一个[],并返回长度；
 */
AV.Cloud.define('getListAmount', (request, response) => {
  redisClient.keysAsync(request.params.key).then(list => {
    response.success(list.length);
  }).catch(console.error);
});

/**
 * 向redis 的 某个key 设置 集合（set)
 */

AV.Cloud.define('setSet', (request, response) => {
  redisClient.saddAsync(request.params.key,request.params.value).then(result => {
    response.success(result);
  }).catch(console.error);
});


/**
 * 删除redis某个set中的值
 */

AV.Cloud.define('delSet', (request, response) => {
  redisClient.sremAsync(request.params.key, request.params.value).then(result => {
    response.success(result);
  }).catch(console.error);
});

/**
 * 向redis 的 某个key 取值 集合（ set)
 */
AV.Cloud.define('getSet', (request, response) => {
  redisClient.SMEMBERSAsync(request.params.key).then(result => {
    response.success(result);
  }).catch(console.error);
});

/**
 * 查询集合中是否有某个值
 */
AV.Cloud.define('exist_member', (request, response) => {
  let {key,value} = request.params;
  redisClient.SISMEMBERAsync(key,value).then(result => {
    response.success(result);
  }).catch(console.error);
});

/**
 * 取出集合中所有值，返回一个string list
 */
AV.Cloud.define('get_set_item_strings', (request, response) => {
  redisClient.SMEMBERSAsync(request.params.key).then(result => {
      let multi = redisClient.multi();
      for (const i of result) {
        multi.get(i);
      }
      multi.execAsync().then(function (data) {
        data.map(item =>{
          item = JSON.parse(item);
        })
        response.success(data);
      }).catch(() => {
        response.error(error);
      });
  }).catch(console.error);
});
/**
 * 取出集合中所有值， 返回一个hash list
 */
AV.Cloud.define('get_set_item_hash', (request, response) => {
  redisClient.SMEMBERSAsync(request.params.key).then(result => {
      let multi = redisClient.multi();
      for (const i of result) {
        multi.hgetall(i);
      }
      multi.execAsync().then(function (data) {
        response.success(data);
      }).catch(() => {
        response.error(error);
      });
  }).catch(console.error);
});

/**
 * 取出集合中所有值， 返回一个hash list
 */
AV.Cloud.define('get_set_item_set', (request, response) => {
  redisClient.SMEMBERSAsync(request.params.key).then(result => {
    let multi = redisClient.multi();
    for (const i of result) {
      multi.smembers(i);
    }
    multi.execAsync().then(function (data) {
      response.success(data);
    }).catch(() => {
      response.error(error);
    });
  }).catch(console.error);
});

/**
 * 设置redis数据类型为list的数据
 * 向list数据皆为增加一条记录。
 */
AV.Cloud.define('rpush', (request, response) => {
  redisClient.rpushAsync(request.params.key, request.params.value).then(result => {
    response.success(result);
  }).catch(console.error);
});


/**
 * 设置redis数据类型为list的数据
 */
AV.Cloud.define('lpush', (request, response) => {
  redisClient.lpushAsync(request.params.key, request.params.value).then(result => {
    response.success(result);
  }).catch(console.error);
});

/**
 * 有序列表增加一个值
 */
AV.Cloud.define('zadd', (request, response) => {
  let {key,score,member} = request.params;
  redisClient.zaddAsync(key, score, member).then(result => {
    response.success(result);
  }).catch(console.error);
});


/**
 * 增加  increment 值
 */
AV.Cloud.define('zincrby', (request, response) => {
  let {key,increment,member} = request.params;
  redisClient.ZINCRBYAsync(key, increment, member).then(result => {
    response.success(result);
  }).catch(console.error);
});

/**
 * 删除 区间内的  member
 */
AV.Cloud.define('zremrangebyscore', (request, response) => {
  let {key,min,max} = request.params;
  redisClient.ZREMRANGEBYSCOREAsync(key, min, max).then(result => {
    response.success(result);
  }).catch(console.error);
});

/**
 * 删除 某个值
 */
AV.Cloud.define('zrem', (request, response) => {
  let {key,member} = request.params;
  redisClient.ZREMAsync(key, member).then(result => {
    response.success(result);
  }).catch(console.error);
});


/**
 * 按照分数自高向低排序
 */
AV.Cloud.define('zrevrangebyscore', (request, response) => {
  let {key,start,stop} = request.params;
  redisClient.ZrevrangebyscoreAsync(key, start, stop).then(result => {
    response.success(result);
  }).catch(console.error);
});

/**
 * 查询一个list 下的数据
 */
AV.Cloud.define('query_list', (request, response) => {
  redisClient.lrangeAsync(request.params.key, request.params.begin, request.params.end).then((data) => {
    response.success(data);
  });
});


/**
 * 将redis 数组的key全部取出，再根据key，取出所有hash值
 * 向list数据皆为增加一条记录。
 */

AV.Cloud.define('get_list_details', (request, response) => {
  let {key,begin=0,end=0} = request.params;
  redisClient.lrangeAsync(key, begin, end).then(results => {
      let multi = redisClient.multi();
      for (const i of results) {
        multi.hgetall(i);
      }
      multi.execAsync().then(function (data) {
      response.success(data);
      }).catch(() => {
      response.error(error);
      });
      }).catch(console.error);
});
//list 是string类型
AV.Cloud.define('get_list_details_strings', (request, response) => {
  redisClient.lrangeAsync(request.params.key, request.params.begin, request.params.end).then(results => {
    let multi = redisClient.multi();
    for (const i of results) {
      multi.get(i);
    }
    multi.execAsync().then(function (data) {
      response.success(data);
    }).catch(() => {
      response.error(error);
    });
  }).catch(console.error);
});

//list item 是json 字符串  
AV.Cloud.define('get_list_details_json_value', (request, response) => {
  redisClient.lrangeAsync(request.params.key, request.params.begin, request.params.end).then(results => {
    response.success(results);
  }).catch(console.error);
});
/**
 * 将redis 数组的key全部取出，再根据key，取出所有hash值
 * 向list数据皆为增加一条记录。
 */

AV.Cloud.define('keys', (request, response) => {
  redisClient.keysAsync(request.params.key).then(results => {
      response.success(results);
    }).catch(() => {
      response.error(error);
    });
});
/**
 * 查询符合搜索的key的数量，返回数量
 */
AV.Cloud.define('query_keys_amount', (request, response) => {
  redisClient.keysAsync(request.params.key).then(results => {
    response.success(results.length);
  }).catch(() => {
    response.error(error);
  });
});


/**
 * Scan 数据，通过一个给定的key
 * {key(要筛选的key，比如 'user*'),account(一次性查询多少个),key_type(key的类型，1 string，2 hash，3 set )}
 */
AV.Cloud.define('scan', (request, response) => {
  let a = request.params.index;//游标的起始位置
  let b = request.params.key;
  let {count,key_type} = request.params;
  let f = (a, b) => {
    redisClient.scanAsync(a, 'MATCH', b, 'COUNT', count).then(data => {
      a = data[0];
      //如果key_type == 1  get(i)
      if (key_type == 1){
          let multi = redisClient.multi();
              for (const i of data[1]) {
                multi.get(i);
              }
          multi.execAsync().then(function (result) {
              let data = {
                index: a,
                list: result
              }
              response.success(data);
          }).catch(() => {
            response.error(error);
          });

      } else if (key_type == 2) {
          let multi = redisClient.multi();
              for (const i of data[1]) {
                multi.hgetall(i);
              }
          multi.execAsync().then(function (result) {
            let data = {
              index:a,
              list:result
            }
            response.success(data);
          }).catch(() => {
            response.error(error);
          });
      }
      f(a, b); 
    }).catch(() => {
      response.error(error,b);
    });
  }
  f(a, b);
});



////////////////////////////////////////////////////////////////
/**
 * 以下存放定时函数
 */


////////////////////////////////////////////////////////////////
/**
 * 以下存放，与业务无关的程序代码
 */

/**
 * 批量删除KEY
 */
AV.Cloud.define('del_key', (request, response) => {
  redisClient.keysAsync(request.params.key).then(list => {
    list.map(item => {
      redisClient.del(item);
    })
  }).catch(console.error);
  response.success('成功');
});

/**
 * 删除一个key
 */
AV.Cloud.define('del_one_key', (request, response) => {
  redisClient.delAsync(request.params.key).then(()=>{
    response.success('成功');
  });
});


