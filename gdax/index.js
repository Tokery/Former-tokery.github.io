
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

// TODO: Create an order book
// TODO: Do basic analysis. How? Well...
/**
 * Calculate average sell volume over the past half hour
 * Calculate standard deviation
 * If outside, something is up
 */


window.onload = function() {
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
            dir: 'priceup',
            accountBalance: 100000,
            netTokensHeld: 0,
            coinsOwned: {},
            orderBook: {}
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
                this.marketSell = 0;
                this.marketBuy = 0;
                this.uniqueSells = 0;
                this.uniqueBuys = 0;
            },
            performTrade(type) {
                // TODO: Convert accountBalance to current profit
                var newCoin = {};
                if (type === 'buy') {
                    this.accountBalance -= oldPrice;
                    this.netTokensHeld += 1;
                    if (oldPrice in this.coinsOwned) {
                        this.coinsOwned[oldPrice] += 1;
                    }
                    else {
                        this.coinsOwned[oldPrice] = 1;
                    }
                }
                else {
                    if (oldPrice in this.coinsOwned) {
                        this.coinsOwned[oldPrice] -= 1;
                    }
                    else {
                        this.coinsOwned[oldPrice] = -1;
                    }
                    this.netTokensHeld -= 1;
                    this.accountBalance += Number(oldPrice);
                }
            }
        }
    })
    container.checkWebsocket();
    getRestData();
    socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        //console.log(data);
        if (data.type == "received") {
            // Move to separate function
            actionsSeen += 1;

            if (data.side == "sell") {
                container.uniqueSells += 1;
                container.sellVol += data.size ? Number(data.size) : 0;
                container.sellOrder = 'Received: ' + data.order_type + ' @ ' + data.price;        
                container.marketSell += data.price ? 0 : 1; // Increment if no price (market sell)        
            }
            else if (data.side == "buy") {
                container.uniqueBuys += 1;
                container.buyVol += data.size ? Number(data.size) : 0;
                container.buyOrder = 'Received: ' + data.order_type + ' @ ' + data.price;                
                container.marketBuy += data.price ? 0 : 1;
            }
        }
        else if (data.type == "match") {
            container.lastPrice = '$' + data.price + ' ' + ((data.price - oldPrice) / oldPrice * 100).toFixed(3) + '%';
            if (data.price < oldPrice) {
                container.dir = 'pricedown';
            }
            else {
                container.dir = 'priceup';
            }
            oldPrice = data.price;
            addData(oldPrice);
        }
        else if (data.type == "done") {
            if (data.reason = "canceled") {
                if (data.side == "sell") {
                    container.sellVol -= data.remaining_size ? Number(data.remaining_size) : 0;
                }
                else if (data.side == "buy") {
                    container.buyVol -= data.remaining_size ? Number(data.remaining_size) : 0;
                }
            }
        }
    }
}