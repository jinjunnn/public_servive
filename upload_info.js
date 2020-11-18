const redisClient = require('./redis').redisClient; //使用redis客户端。
const {getAccessToken} = require('./access-token'); //生成accesstoken并且保持有效。
const AV = require('leanengine');
const common = require('./common'); //存放可以复用的代码

//定时函数上传listings 到redis；
function upload_goods_list_info_to_redis() {
    // //这个函数的目的是当用户没有cover的时候，上传shop_images（这个是用户自己传的封面）如果有cover的时候，这个cover是后台传的
    // let image = (cover, shop_images) => {
    //     if(cover==undefined){
    //         console.log('cover==undefined');
    //         return shop_images;
    //     }else{
    //         console.log('cover!=undefined');
    //         return cover.attributes.url;
    //     }
    // }
    // let query = new AV.Query('List');
    // query.equalTo('verify', true);//只查询审核通过的数据
    // query.equalTo('upload', false);//只查询没有上传过的数据
    // query.limit(1000);
    // query.find().then(function (lists) {
    //     console.log(lists);
    //     for (const list of lists) {
    //         let {address,shop_desc,phone,nickname,shop_name,shop_images,cover,list_id} = list.attributes;
    //         console.log(address, shop_desc, phone, nickname, shop_name, shop_images,cover,list_id);
    //         redisClient.hmsetAsync('list' + list_id, 'objectid', list.id, 'address', address, 'shop_desc', shop_desc, 'phone', phone, 'nickname', nickname, 'shop_name', shop_name, 'shop_images', image(cover, shop_images), 'list_id', list_id).then(result => {
    //             console.log('完成上传Listing', list_id);
    //             redisClient.sadd('set_list', 'list' + list_id);//将listing存在集合中。
    //             let update_list = AV.Object.createWithoutData('List', list.id);
    //             update_list.set('upload', true);
    //             update_list.save();
    //         })
    //         .catch((error) => {
    //             console.log(error);
    //         });
    //     }
    //     console.log('listings上传完成！');
    // });
}

/**
 * 定时上传商品信息到redis；
 * 将30分钟内有改动的数据全部上传到redis中；
 * 如果上传的商品在在售的状态， 将它存在在售集合（ goods_list_uid） 中
 */
function upload_goods_info_to_redis() {
    // let now = new Date();
    // console.log(new Date(now.getTime() - 1800000));
    // var query = new AV.Query('Goods');
    // query.equalTo('verify', true);//只查询审核通过的数据
    // goods.equalTo('self', false);//只查询不是电商自营的数据
    // query.greaterThanOrEqualTo('updatedAt', new Date(now.getTime() - 1800000));//只查询半小时内修改过的数据
    // query.limit(1000);
    // query.find().then(function (goods) {
    //     console.log('即将上传的商品数量为', goods.length);
    //     for (const good of goods) {    
    //         let {status,images,order_images,name,sub_name,remark,content,fee,price,original_price,stock,sold, list_id, id } = good.attributes;
    //         redisClient.hmsetAsync('goods_agency_' + list_id + '_' + id, 'key', 'goods_agency_' + list_id + '_' + id, 'shop_key', 'list' + list_id, 'objectid', good.id, 'images', images, 'order_images', order_images, 'name', name, 'sub_name', sub_name, 'remark', remark, 'content', content, 'fee', fee, 'price', price, 'original_price', original_price, 'stock', stock, 'sold', sold, 'list_id', list_id, 'id', id).then(result => {
    //             console.log('完成上传', 'goods_agency_' + list_id + '_' + id);
    //             if(status == 2){//只有当产品处于上架状态，才可以放在set中，在前台显示。
    //                 redisClient.rpush('goods_list_' + list_id, 'goods_agency_' + list_id + '_' + id);
    //             }
    //         }).catch((error) => {
    //             console.log(error);
    //         });
    //     }
    //     console.log('完成上传商品！');
    // });
}

/**
 * 将商品的一级目录存到redis 的settings中
 */
function push_catelories_to_redis() {
//   console.log('进入push_catelories_to_redis流程');
//   let catelories = [];
//   let query = new AV.Query('Categories');
//   query.find().then(lists => {
//       lists.map(list => {
//           let {
//               name,
//               index,
//               id
//           } = list.attributes;
//           let catelory = {
//               name: name,
//               index: index,
//               id: id
//           }
//           catelories.push(catelory);
//       });
//       redisClient.hsetAsync('settings', 'categories', JSON.stringify(catelories)).then(res => {
//           console.log('成功将商品的一级目录上传到redis settings(哈希表)categories字段中');
//       }).catch(console.error);
//   }).catch(console.error);
}

/**
 * 将商品的二级目录存到redis 的settings中
 */
function push_sub_catelories_to_redis() {
//   let catelories = [];
//   let query = new AV.Query('SubCategories');
//   query.find().then(lists => {
//       lists.map(list => {
//           console.log()
//           let {
//               name,
//               index,
//               id,
//               brand = ''
//           } = list.attributes;
//           let catelory = {
//               name: name,
//               index: index + brand,
//               id: id
//           }
//           catelories.push(catelory);
//       });
//       redisClient.hsetAsync('settings', 'sub_categories', JSON.stringify(catelories)).then(res => {
//           console.log('成功将商品的二级目录上传到redis settings(哈希表)sub_categories字段中');
//       }).catch(console.error);
//   }).catch(console.error);
}

/**
 * 将Commodity表中的数据存为redis hash的数据
 * 目前的数量不足1000，所以不需要迭代数据
 */
function pushCommodityToRedisHash() {
//   console.log('进入pushPropertyToRedisHash流程');
//   let query = new AV.Query('Commodity');
//   let id = 10000000;
//   let cagelogies = 10;
//   let sub_cagelogies = 10;
//   let brand_id = 1000;
  
//   query.limit(1000);
//   query.find().then(lists => {
//     lists.map(list => {
//       id++;
//       let pid = String(cagelogies) + String(sub_cagelogies) + String(brand_id) + String(id);
//       console.log(pid);
//       let {images,name, params, original_price, tax, sku, keyword, price, category } = list.attributes;
//       let i_price = Number(list.attributes.original_price) * 20;
//       let f_price = parseInt(Number(list.attributes.original_price) /25);
//       redisClient.hmsetAsync('goods_self_' + pid, 'key', 'goods_self_' + pid, 'goodid', pid, 'i_price', i_price, 'f_price', f_price, 'images', JSON.parse(images), 'name', name, 'params', params, 'original_price', original_price, 'tax', tax, 'sku', sku, 'keyword', keyword, 'price', price, 'category', category).then(res => {}).catch(console.error);
//     });
//   }).catch(console.error);
//   console.log('已经成功将商品的信息上传到redis中');
}

/**
 * 将Mall表中的数据存为redis hash的数据
 */
function pushMallToRedisHash() {
    // console.log('进入pushMallToRedisHash流程');
    // redisClient.delAsync('malls').then(() => {
    //     let query = new AV.Query('Mall');
    //     query.limit(1000);
    //     query.find().then(lists => {
    //         lists.map(list => {
    //             let {sub_name,name,content} = list.attributes;
    //             console.log(sub_name, name);
    //             let key = list.id;
    //             console.log(key);
    //             let image = list.attributes.image.attributes.url
    //             console.log(image);
    //             let value = {
    //                 name:name,
    //                 sub_name:sub_name,
    //                 objectid:key,
    //                 image:image,
    //                 content:content,
    //             }
    //             console.log(JSON.stringify(value));
    //             redisClient.hsetAsync('malls' ,key,JSON.stringify(value)).then(res => {}).catch(console.error);
    //         });
    //     }).catch(console.error);
    // });
    // console.log('已经将mall信息上传到redis中');
}

/**
 * 将Commodity表中的数据存为redis hash的数据
 * 目前的数量不足1000，所以不需要迭代数据
 */
function pushBannerToRedisHash() {
    // console.log('进入pushBannerToRedisHash流程');
    // redisClient.delAsync('banners').then(()=>{
    //     let query = new AV.Query('Banner');
    //     query.limit(1000);
    //     query.find().then(lists => {
    //         lists.map(list => {
    //             let {sub_name,name,type,content,display,target_key} = list.attributes;
    //             let key = list.id;
    //             let image = list.attributes.image.attributes.url
    //             let value = {
    //                 objectid: target_key,
    //                 image: image,
    //                 name:name,
    //                 sub_name:sub_name,
    //                 type:type,
    //                 content:content,
    //                 display:display
    //             }
    //             redisClient.hsetAsync('banners', key, JSON.stringify(value)).then(res => {}).catch(console.error);
    //         });
    //     }).catch(console.error);
    // });
    // console.log('已经将banner信息上传到redis中');
}



/**
 * 后台将list表的数据传到redis
 */
function upload_goods_list_info_to_redis_backend() {
    // let i = 1;
    /**
     * 查询商品，并将商品的id上传到redis goods_list_{{list_id}},item是商品的key
     * list_id: list_id
     * name:查询关联表的表名
     * table:关联的表
     * id：关联表的字段id
     */
    // let set_good_list = async (list_id, name, table, id) => {
    //     console.log(list_id,name, table, id);
    //     setTimeout(() => {
    //         query_goods(list_id, name, table, id);
    //     }, 5000 * i++);
    // };
    // let query_goods = (list_id, name, table, id) => {
    //     var post = AV.Object.createWithoutData(name, id);
    //     var query = new AV.Query('Goods');
    //     query.ascending('prior');
    //     query.equalTo(table, post);
    //     query.find().then(function (goods) {
    //             goods.map(good => {
    //                 console.log('goods_list_' + list_id, 'gid_' + good.attributes.id);
    //                redisClient.rpush('goods_list_' + list_id, 'gid_' + good.attributes.id);
    //             });
    //         })
    //         .catch((error) => {
    //             console.log(error);
    //         });
    // };
    /**
     * 
     */
    //将list上传 list_{{list_id}},item是商品的key
    // let upload_list = (list) => {
    //     let {
    //         address = null, shop_desc = null, phone = null, nickname = null, shop_name = null, cover = null, list_id = null
    //     } = list.attributes;
    //     redisClient.hmsetAsync('list' + list_id, 'objectid', list.id, 'address', address, 'shop_desc', shop_desc, 'phone', phone, 'nickname', nickname, 'shop_name', shop_name, 'shop_images', cover.attributes.url, 'list_id', list_id).then(result => {
    //             redisClient.rpush('list_list', 'list' + list_id); //将listing存在集合中。
    //         })
    //         .catch((error) => {
    //             console.log(error);
    //         });

    // };

    // let query_list = async () =>{
    //     //组合查询，查询具有指向 品牌或者自分类或者标签指针的list
    //     let query_brand = new AV.Query('List');
    //     query_brand.exists('bind_brand');
    //     let query_sub_cat = new AV.Query('List');
    //     query_sub_cat.exists('bind_sub_cat');
    //     let query_tag = new AV.Query('List');
    //     query_tag.exists('bind_tag');
    //     let query = AV.Query.or(query_brand, query_sub_cat, query_tag);
    //     query.limit(1000);
    //     query.include('bind_brand');
    //     query.ascending('prior');
    //     query.include('bind_sub_cat');
    //     query.include('bind_tag');
    //     query.find().then(function (lists) {

    //         lists.map(list =>{
    //             let {
    //                 bind_brand = null, bind_sub_cat = null, bind_tag = null
    //             } = list.attributes;
    //             //这里将list信息上传到redis
    //             upload_list(list);
    //             //设置商品集合goods_list

    //             if (bind_brand != null) {
    //                 //这里通过指针查询good表，将符合条件的good key传到list 集合中。
    //                 set_good_list(list.attributes.list_id, 'Brand', 'bind_brand', bind_brand.id);
    //             } else if (bind_sub_cat != null) {
    //                 //这里通过指针查询good表，将符合条件的good key传到list 集合中。
    //                 set_good_list(list.attributes.list_id, 'SubCategories', 'bind_cat2', bind_sub_cat.id);
    //             } else if (bind_tag != null) {
    //                 //这里通过指针查询good表，将符合条件的good key传到list 集合中。
    //                 set_good_list(list.attributes.list_id, 'Tags', 'bind_tag', bind_sub_cat.id);
    //             }
    //         })
    //     });
    // }
    // query_list();
}


/**
 * 后台将goods表的数据上传到redis
 */
function upload_goods_info_to_redis_backend() {
    //修改后台的数据，将status修改为2（上架状态）；self修改为true，自营商品
    // let set_backend = (id) => {
    //     let goods = AV.Object.createWithoutData('Goods', id);
    //     // goods.set('status', 2);
    //     goods.set('self', true); //第一次就这样了，下一次要把这个打开
    //     goods.save().then((result) => {
    //         console.log(result);
    //     })
    // };
    
    // let query = new AV.Query('Goods');
    // //query.equalTo('verify', true);
    // query.ascending('prior');
    // query.limit(1000);
    // query.include('bind_brand');
    // query.include('bind_cat2');
    // query.include('bind_mall');
    // query.include('bind_tag');
    // query.include('bind_transfee');
    // // query.equalTo('list_id', '10000002')
    // query.find().then(function (goods) {
    //     console.log('即将上传的商品数量为', goods.length);
    //     goods.map(good =>{    
    //         let {
    //             images,
    //             order_images = null,
    //             name = null,
    //             sub_name = null,
    //             remark = null,
    //             content = null,
    //             fee = 30,
    //             share_discount = 0,
    //             price,
    //             stock = 0,
    //             sold = 0,
    //             list_id,
    //             id
    //         } = good.attributes;
    //         redisClient.hmsetAsync('gid_'+ id, 'key', 'gid_' + id, 'shop_key', 'list' + list_id, 'objectid', good.id, 'images', images, 'order_images', order_images, 'name', name, 'sub_name', sub_name, 'remark', remark, 'content', content, 'fee', 30, 'price', parseInt(price), 'stock', stock, 'sold', sold, 'list_id', list_id, 'id', id, 'share_discount', share_discount).then(result => {
    //             console.log('完成上传gid', 'gid_' + id);
    //            // set_backend(good.id);//上传到redis后，给后台数据库一个反馈
    //         }).catch((error) => {
    //             console.log(error);
    //         });
    //     });
    //     console.log('完成上传商品！');
    // });
}

/**
 * 将选中的商品传到某一个list中。
 */
function upload_a_list_of_goods_info_to_redis_backend(list) {
    //修改后台的数据，将status修改为2（上架状态）；self修改为true，自营商品
    // let set_backend = (id) => {
    //     let goods = AV.Object.createWithoutData('Goods', id);
    //     // goods.set('status', 2);
    //     goods.set('self', true); //第一次就这样了，下一次要把这个打开
    //     goods.save().then((result) => {
    //         console.log(result);
    //     })
    // };
    // let query = new AV.Query('Goods');
    // //query.equalTo('verify', true);
    // query.ascending('prior');
    // query.equalTo('list_id', list)
    // query.limit(1000);
    // query.find().then(function (goods) {
    //     console.log('即将上传的商品数量为', goods.length);
    //     for (const good of goods) {
    //         let {
    //             images,
    //             order_images = null,
    //             name = null,
    //             sub_name = null,
    //             remark = null,
    //             content = null,
    //             fee = 30,
    //             share_discount = 0,
    //             price,
    //             stock = 0,
    //             sold = 0,
    //             list_id,
    //             id
    //         } = good.attributes;
    //         redisClient.hmsetAsync('goods_agency_' + list_id + '_' + id, 'key', 'goods_agency_' + list_id + '_' + id, 'shop_key', 'list' + list_id, 'objectid', good.id, 'images', images, 'order_images', order_images, 'name', name, 'sub_name', sub_name, 'remark', remark, 'content', content, 'fee', 30, 'price', parseInt(price), 'stock', stock, 'sold', sold, 'list_id', list_id, 'id', id, 'share_discount', share_discount).then(result => {
    //             console.log('完成上传', 'goods_agency_' + list_id + '_' + id);
    //             redisClient.rpush('goods_list_' + list_id, 'goods_agency_' + list_id + '_' + id); //
    //             set_backend(good.id);
    //         }).catch((error) => {
    //             console.log(error);
    //         });
    //     }
    //     console.log('完成上传商品！');
    // });
}

/**
 * 后台将Trial表的数据上传到redis
 */
function upload_trial_info_to_redis_backend() {
    //修改后台的数据，将上传状态修改为true，已上传
    // let set_backend = (id) => {
    //     let goods = AV.Object.createWithoutData('Trial', id);
    //     goods.set('upload', true);
    //     goods.save().then((result) => {
    //         console.log(result);
    //     })
    // };
    // let query = new AV.Query('Trial');
    // query.limit(1000);
    // query.find().then(function (goods) {
    //     console.log('即将上传的商品数量为', goods.length);
    //     for (const good of goods) {
    //         let {
    //             images = [],
    //             name = null,
    //             sub_name = null,
    //             remark = null,
    //             content = null,
    //             fee = 0,
    //             price,
    //             id
    //         } = good.attributes;
    //         redisClient.hmsetAsync('goods_trial_' + id, 'key', 'goods_trial_' + id,'objectid', good.id, 'images', images[0],  'name', name, 'sub_name', sub_name, 'remark', remark, 'content', content, 'fee', fee, 'price', price, 'id', id).then(result => {
    //             console.log('完成上传', 'goods_trial_' + id);
    //             redisClient.sadd('trial_list', 'goods_trial_' + id);
    //             set_backend(good.id);
    //         }).catch((error) => {
    //             console.log(error);
    //         });
    //     }
    //     console.log('完成上传商品！');
    // });
}


/**
 * 上传box
 */
function upload_actinfo_redis_backend(act) {
    console.log('actinfo');
    console.log(act);
    let {
        type,
        a_image,
        b_image, 
        c_image,
        d_image, 
        e_image,
        f_image,
        g_image,
        h_image, 
        i_image,
        j_image,
        k_image,
        l_image,
        currency,
        price,
        banner,
        icon,
        title,
        content,
        detail,
        id,
        key,
        link,
        image,
        buttons,
        share_card,
        a,
        b,
        c,
        d,
        e,
        f,
        g,
        h,
        i,
        j,
        k,
        l,
        m
    } = act.act;
    redisClient.hmsetAsync(key,
                            'key',key,
                            'type',type ,
                            'currency', currency,
                            'price', price, 
                            'banner', banner, 
                            'icon', icon, 
                            'title', title, 
                            'content', content,
                            'detail', detail,
                            'id',id,
                            'link', link, 
                            'image', image, 
                            'buttons', buttons, 
                            'share_card', share_card, 
                            'a', a, 
                            'b', b, 
                            'c', c,
                            'd', d,
                            'e', e,
                            'f', f,
                            'g', g,
                            'h', h,
                            'i', i,
                            'j', j,
                            'k', k,
                            'l', l, 
                            'a_image', a_image,
                            'b_image', b_image,
                            'c_image', c_image,
                            'd_image', d_image,
                            'e_image', e_image,
                            'f_image', f_image,
                            'g_image', g_image,
                            'h_image', h_image,
                            'i_image', i_image,
                            'j_image', j_image,
                            'k_image', k_image,
                            'l_image', l_image,
                            'm', m,
                            'x','m',
                           ).then(result => {
    }).catch((error) => {
        console.log(error);
    });

}

/**
 * 上传box表中的details
 */
function upload_box_details() {
        var query = new AV.Query('Box');
        query.find().then(function (boxs) {
                boxs.map(box => {
                    let {
                        key,details
                    } = box.attributes;
                    redisClient.hsetAsync(key, 'details', details).then(result => {

                    }).catch((error) => {
                        console.log(error);
                    });
                });
        });
}

module.exports.upload_goods_list_info_to_redis = upload_goods_list_info_to_redis;
module.exports.upload_goods_info_to_redis = upload_goods_info_to_redis;
module.exports.push_catelories_to_redis = push_catelories_to_redis;
module.exports.push_sub_catelories_to_redis = push_sub_catelories_to_redis;
module.exports.pushCommodityToRedisHash = pushCommodityToRedisHash;
module.exports.pushMallToRedisHash = pushMallToRedisHash;
module.exports.pushBannerToRedisHash = pushBannerToRedisHash;

module.exports.upload_goods_info_to_redis_backend = upload_goods_info_to_redis_backend;
module.exports.upload_goods_list_info_to_redis_backend = upload_goods_list_info_to_redis_backend;

module.exports.upload_trial_info_to_redis_backend = upload_trial_info_to_redis_backend;
module.exports.upload_a_list_of_goods_info_to_redis_backend = upload_a_list_of_goods_info_to_redis_backend;

module.exports.upload_actinfo_redis_backend = upload_actinfo_redis_backend;
module.exports.upload_box_details = upload_box_details;