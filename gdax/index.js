
var getRestData = function () {
    var apiURL = 'https://api.gdax.com/products/eth-usd/book?level=2';
    axios.get(apiURL)
    .then(function(response) {
        var data = response.data;
        console.log(response);
    })
    .catch(function(error) {
        console.log(error);
    })
}

// Match the live data to the data from the api
var matchLiveData = function () {

}

window.onload = function() {
    var sellVolume = 0;
    var buyVolume = 0;
    var actionsSeen = 0;
    var oldPrice = 0;

    var socket;
    var container = new Vue({
        el: '#container',
        data: {
            sellOrder: 'Sell Data...',
            buyOrder: 'Buy Data...',
            sellVol: 0,
            buyVol: 0,
            lastPrice: 0,
            marketBuy: 0,
            marketSell: 0,
            uniqueBuys: 0,
            uniqueSells: 0,
            status: 'Starting...',
            dir: 'priceup'
        },
        methods: {
            checkWebsocket: function() {
                if (!("WebSocket" in window)) {
                    this.message = "Your browser does not support WebSockets :("
                } else {
                    this.connect();
                }
            },
            connect() {
                var vue = this;
                try {
                    var host = "wss://ws-feed.gdax.com";
                    socket = new WebSocket(host);

                    vue.status = socket.readyState;
                    socket.onopen = function () {
                        vue.status = socket.readyState + ' open';
                    }

                    socket.onmessage = function(msg) {
                        console.log(msg);
                        vue.status = 'Recieved ' + msg.data;
                    }

                    socket.onclose = function() {
                        vue.status = socket.readyState + ' closed';
                    }
                } catch(exp) {
                    vue.status = 'ERROR: ' + exp;
                }
            },
            sendMessage() {
                var data = {
                    "type": "subscribe",
                    "product_ids": [
                        "ETH-USD"
                    ]
                }
                socket.send(JSON.stringify(data));
            },
            closeConnection() {
                socket.close();
            },
            resetNumbers() {
                this.sellVol = 0;
                this.buyVol = 0;
                sellVolume = 0;
                buyVolume = 0;
                this.marketSell = 0;
                this.marketBuy = 0;
                this.uniqueSells = 0;
                this.uniqueBuys = 0;
            }
        }
    })
    container.checkWebsocket();
    getRestData();
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        //console.log(data);
        if (data.type == "received") {
            actionsSeen += 1;

            // Clear volume every 500 actions
            if (actionsSeen == 500) {
                sellVolume = 0;
                buyVolume = 0;
                actionsSeen = 0;
            }

            if (data.side == "sell") {
                container.uniqueSells += 1;
                sellVolume += data.size ? Number(data.size) : 0;
                container.sellOrder = 'Received: ' + data.order_type + ' @ ' + data.price;        
                container.marketSell += data.price ? 0 : 1; // Increment if no price (market sell)        
                container.sellVol = sellVolume;
            }
            else if (data.side == "buy") {
                container.uniqueBuys += 1;
                buyVolume += data.size ? Number(data.size) : 0;
                container.buyOrder = 'Received: ' + data.order_type + ' @ ' + data.price;                
                container.marketBuy += data.price ? 0 : 1;
                container.buyVol = buyVolume;
            }
        }
        else if (data.type == "match") {
            container.lastPrice = data.price + ' ' + ((data.price - oldPrice) / oldPrice * 100).toFixed(3) + '%';
            if (data.price < oldPrice) {
                container.dir = 'pricedown';
            }
            else {
                container.dir = 'priceup';
            }
            oldPrice = data.price;
        }
    }
}