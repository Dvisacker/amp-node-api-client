import WebSocket from 'ws'
import messageListener from './listener'


const ws = new WebSocket("ws://ampapi:8081/socket")


ws.onmessage = messageListener


ws.onerror = (err) => {
  console.log('err: ', err)
}


ws.onclose = () => {
  console.log("Connection is closed...")
}


ws.onopen = (ev) => {
  console.log('Connection is open ...')
  ws.send(JSON.stringify(
    {
      "channel": "orderbook",
      "event": {
        "type": "UNSUBSCRIBE",
      }
    }
  ))
}


ws.reopen = _ => {
  setTimeout( _ => {
    if( ws.readyState === ws.CLOSED ) {
      ws = new WebSocket("ws://ampapi:8081/socket")
    } else if( ws.readyState === ws.CONNECTING || ws.readyState === ws.OPEN ){
      return
    } else {
      ws.reopen()
    }
  }, 500)
}


process.on('SIGINT', () => {
  console.log("Caught interrupt signal")
  ws.close()
  setTimeout(process.exit, 500)
})


process.once('SIGUSR2', () => {
  ws.close()
  setTimeout(() => process.kill(process.pid, 'SIGUSR2'), 500)
})


export default ws
