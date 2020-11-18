const AV = require('leanengine');
const axios = require('axios');
const wxpay = require('./wxpay');
const {
  validateSign,
  handleError,
} = require('./utils');
const { getAccessToken } = require('./access-token');

class Order extends AV.Object {
    
  get piece() { return this.get('piece'); }
  set piece(value) { this.set('piece', value); }

  get sharer() { return this.get('sharer'); }
  set sharer(value) { this.set('sharer', value); }

  get price() { return this.get('price'); }
  set price(value) { this.set('price', value); }

  get commodity_type() { return this.get('commodity_type'); }
  set commodity_type(value) { this.set('commodity_type', value); }

  get fee() { return this.get('fee'); }
  set fee(value) { this.set('fee', value); }

  get transmit() { return this.get('transmit'); }
  set transmit(value) { this.set('transmit', value); }

  get coins() { return this.get('coins'); }
  set coins(value) { this.set('coins', value); }

  get remark() { return this.get('remark'); }
  set remark(value) { this.set('remark', value); }

  get coupon() { return this.get('coupon'); }
  set coupon(value) { this.set('coupon', value); }

  get address() { return this.get('address'); }
  set address(value) { this.set('address', value); }

  get uid() { return this.get('uid'); }
  set uid(value) { this.set('uid', value); }

  get username() { return this.get('username'); }
  set username(value) { this.set('username', value); }

  get openid() { return this.get('openid'); }
  set openid(value) { this.set('openid', value); }

  get key() { return this.get('key'); }
  set key(value) { this.set('key', value); }

  get sku() { return this.get('sku'); }
  set sku(value) { this.set('sku', value); }

  get tradeId() { return this.get('tradeId'); }
  set tradeId(value) { this.set('tradeId', value); }

  get amount() { return this.get('amount'); }
  set amount(value) { this.set('amount', value); }

  get image() { return this.get('image'); }
  set image(value) { this.set('image', value); }

  get orderMode() { return this.get('orderMode'); }
  set orderMode(value) { this.set('orderMode', value); }

  get list_id() { return this.get('list_id'); }
  set list_id(value) { this.set('list_id', value); }

  get productDescription() { return this.get('productDescription'); }
  set productDescription(value) { this.set('productDescription', value); }

  get ip() { return this.get('ip'); }
  set ip(value) { this.set('ip', value); }

  get tradeType() { return this.get('tradeType'); }
  set tradeType(value) { this.set('tradeType', value); }

  get prepayId() { return this.get('prepayId'); }
  set prepayId(value) { this.set('prepayId', value); }

  place() {
    return new Promise((resolve, reject) => {
      // 参数文档： https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=9_1
      wxpay.createUnifiedOrder({
        openid: this.openid,
        body: this.productDescription,
        out_trade_no: this.tradeId,
        total_fee: this.amount,
        spbill_create_ip: this.ip,
        notify_url: process.env.WEIXIN_NOTIFY_URL,
        trade_type: this.tradeType,
      }, function (err, result) {
        console.log(err, result);
        if (err) return reject(err);
        return resolve(result);
      });
    }).then(handleError).then(validateSign).then(({
      prepay_id,
    }) => {
      this.prepayId = prepay_id;
      return this.save();
    });
  }

}
AV.Object.register(Order);

module.exports = Order;