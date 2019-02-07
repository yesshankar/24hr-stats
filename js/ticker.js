var products = [
    {"id":"BCH-USD","name":"Bitcoin Cash"},{"id":"BCH-BTC","name":"Bitcoin Cash"},{"id":"BTC-GBP","name":"Bitcoin"},
    {"id":"BTC-EUR","name":"Bitcoin"},{"id":"BCH-GBP","name":"Bitcoin Cash"},
    {"id":"BCH-EUR","name":"Bitcoin Cash"},{"id":"BTC-USD","name":"Bitcoin"},{"id":"ZEC-USDC","name":"Zcash"},
    {"id":"DNT-USDC","name":"district0x"},{"id":"LOOM-USDC","name":"Loom Network"},{"id":"DAI-USDC","name":"Dai"},
    {"id":"GNT-USDC","name":"Golem"},{"id":"MANA-USDC","name":"Decentraland"},
    {"id":"CVC-USDC","name":"Civic"},{"id":"ETH-USDC","name":"Ether"},{"id":"ZRX-EUR","name":"0x"},
    {"id":"BAT-USDC","name":"Basic Attention Token"},{"id":"ETC-EUR","name":"Ether Classic"},{"id":"BTC-USDC","name":"Bitcoin"},
    {"id":"ZRX-USD","name":"0x"},{"id":"ETH-BTC","name":"Ether"},{"id":"ETH-EUR","name":"Ether"},
    {"id":"ETH-USD","name":"Ether"},{"id":"LTC-BTC","name":"Litecoin"},{"id":"LTC-EUR","name":"Litecoin"},
    {"id":"LTC-USD","name":"Litecoin"},{"id":"ETC-USD","name":"Ether Classic"},{"id":"ETC-BTC","name":"Ether Classic"},
    {"id":"ZRX-BTC","name":"0x"},{"id":"ETC-GBP","name":"Ether Classic"},{"id":"ETH-GBP","name":"Ether"},
    {"id":"LTC-GBP","name":"Litecoin"}];

var tickers = {};

products.forEach((item) => {
    tickers[item.id] = {
        "name": item.name,
        "price":"n/a",
        "open_24h":"n/a",
        "volume_24h":"n/a",
        "low_24h":"n/a",
        "high_24h":"n/a",
        "changePercent":"n/a",
        "vol_quote_24h":"n/a",
        };
});

var app = new Vue({
    el: '#app',
    data: {
        products,
        tickers,
        sortByOptions: {
            "alphabetical": { 
                name: "A - Z",
                active: false
            },
            "quoteVolume": {
                name: "Quote Volume",
                active: false
            },
            "changePercent": {   
                name: "Percent Change",
                active: false
            }
        },
        sortBy: "quoteVolume",
        sortDirection: "descending"
    },
    computed: {
        computeSortBy: function() {
            return {
                "alphabetical": () => {
                    if(this.sortDirection == "descending"){
                        return products.map((item) => item.id).sort().reverse();
                    }else{
                        return products.map((item) => item.id).sort();
                    }                  
                },
                "quoteVolume": () => {
                    return products.map((item) => item.id).sort((a, b) => {
                        if(this.sortDirection == "descending"){
                            return parseFloat(this.tickers[b].vol_quote_24h) - parseFloat(this.tickers[a].vol_quote_24h);
                        }else{
                            return parseFloat(this.tickers[a].vol_quote_24h) - parseFloat(this.tickers[b].vol_quote_24h);
                        }
                    });
                },
                "changePercent": () => {
                    return products.map((item) => item.id).sort((a, b) => {
                        if(this.sortDirection == "descending"){
                            return parseFloat(this.tickers[b].changePercent) - parseFloat(this.tickers[a].changePercent);
                        }else{
                            return parseFloat(this.tickers[a].changePercent) - parseFloat(this.tickers[b].changePercent);
                        }
                    });
                }
            }
        }
    },
    methods: {
        base(p){
            return p.split('-')[0];
        },
        quote(p){
            return p.split('-')[1];
        },
        changeSortBy(order){
            this.sortBy = order;
            if(this.sortDirection == "ascending"){
                this.sortDirection = "descending";
            }else{
                this.sortDirection = "ascending";
            }
        }
    }
});

// ############################ SOCKET CONNECTION #####################################

const socket = new WebSocket('wss://ws-feed.pro.coinbase.com');
let subscribeMsg = {
    "type": "subscribe",
    "product_ids": products.map((item) => item.id),
    "channels": ["ticker"]
}

socket.addEventListener('open', (event) => {

    socket.send(JSON.stringify(subscribeMsg));
});

socket.addEventListener('message', (event) => {

    let data = JSON.parse(event.data);

    if (data.type == "ticker"){
        updateData(data);
    }

});

socket.addEventListener('close', (event) => {
    alert('Disconnected!!, Websocket connection is disconnected.');
});

function updateData(data){
    let vol24 = parseFloat(data.volume_24h);
    let last = parseFloat(data.price);
    let open = parseFloat(data.open_24h);
    let diff = last - open;
    let changePercent = (diff/open * 100).toFixed(2);

    app.tickers[data.product_id].volume_24h = data.volume_24h.slice(0, 11);
    app.tickers[data.product_id].vol_quote_24h = (vol24 * last).toFixed(8).slice(0, 11);
    app.tickers[data.product_id].changePercent = changePercent;

    // remove extra zeros form fiat currency and stablecoins with value greater than 1
    if(open > 1){
        app.tickers[data.product_id].price = data.price.slice(0, -6);
        app.tickers[data.product_id].open_24h = data.open_24h.slice(0, -6);
        app.tickers[data.product_id].low_24h = data.low_24h.slice(0, -6);
        app.tickers[data.product_id].high_24h = data.high_24h.slice(0, -6);
    }else{
        app.tickers[data.product_id].price = data.price;
        app.tickers[data.product_id].open_24h = data.open_24h;
        app.tickers[data.product_id].low_24h = data.low_24h;
        app.tickers[data.product_id].high_24h = data.high_24h;
    }
    
}






/* setInterval(() => {
    if(app.anim == "anim 1s"){
        app.anim = "anim2 1s";
    }else{
        app.anim = "anim 1s";
    }
    
}, 3000); */
/* 
var mutationObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        let parent = mutation.target.parentElement;
        let oldAnimation = mutation.target.parentElement.style.animation;
        // console.log(`typeof oldAnimation: ${typeof oldAnimation} `);
        // console.log(`oldAnimation: ${oldAnimation}`);

        if(oldAnimation.includes("anim")){
            parent.style.animation = "anim2 1s";
        }else if(oldAnimation.includes("anim2")){
            parent.style.animation = "anim 1s";
        }else{
            parent.style.animation = "anim 1s"
        }
        
        // console.log(mutation);
        // console.log(mutation.oldValue);
        // console.log(mutation.target.textContent);
    });
});

// Starts listening for changes in the root HTML element of the page.
mutationObserver.observe(document.getElementById('app'), {
    subtree: true,
    characterData: true,
    // childList: false,
    // attributes: false,
    // attributeOldValue: false,
    // characterDataOldValue: false
});
 */