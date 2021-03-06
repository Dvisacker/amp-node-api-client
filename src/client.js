import rp from 'request-promise-native'
import * as msgOrder from './messages/messageOrder'
import msgRawOrderbook from './messages/messageRawOrderbook'
import wsclient from './connection/wsclient'
import orderbook, {subscriptions} from './market/orderbook'
import pairs, {updatePairs} from './market/pairs'
import deferred from './utils/deferred'
import { utils } from 'ethers'


export default class {
  constructor(wallet) {
    this.wallet = wallet
  }


  start( func ) {
    return new Promise( (res, rej) => {
        wsclient.once('open', res)
      }).then( _ => {
        return updatePairs()
      })
  }


  submit( msg ) {
    wsclient.send(JSON.stringify(msg))
    return msg
  }


  new_order(order) {
    return msgOrder.new_order(order).sign(this.wallet)
      .then( this.submit )
      .then( msg => {
        let order = Object.assign(orderbook[msg.event.hash], msg.event.payload)
        order.added = new deferred(40000)
        return order.added.promise
      }).catch( msg => {
        throw {err: 'new order failed', msg: msg, order: order, time: Date.now()}
      })
  }


  cancel_order(hash) {
    return  msgOrder.cancel_order(hash).sign(this.wallet)
      .then( this.submit )
      .then( msg => {
        let order = orderbook[hash]
        if (order.status == null || ( order.status!='CANCELLED' && order.status!='FILLED') ){
          order.cancelled = new deferred(35000)
        } else {
          order.cancelled = Promise.resolve()
        }
        return order.cancelled.promise
      }).catch( msg => {
        throw {err: 'cancel order failed', msg: msg, hash: hash, order: orderbook[hash], time: Date.now()}
      })
  }


  my_orders() {
    return Object.values(orderbook).filter(ord => ord && ord.userAddress && utils.getAddress(ord.userAddress) === this.wallet.address)
//    return rp('http://ampapi:8081/orders?address='+this.wallet.address, {json: true})
//             .catch('couldn\'t access AMP REST API')
  }


  pairs() {
    return pairs()
  }


  subscribe (baseAddr, quoteAddr) {
    let ord = {
      baseToken: baseAddr,
      quoteToken: quoteAddr
    }
    let pair = pairs().find(ele => ele.baseTokenAddress === baseAddr && ele.quoteTokenAddress === quoteAddr)
    let pairName = `${pair.baseTokenSymbol}/${pair.quoteTokenSymbol}`
    subscriptions[pairName] = new deferred(20000)
    this.submit(msgRawOrderbook.subscribe(ord))

    return subscriptions[pairName]
  }
}


