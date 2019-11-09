fetch('https://api.pro.coinbase.com/currencies')
  .then(res => {
    return res.json();
  })
  .then(currencies => {
    fetch('https://api.pro.coinbase.com/products')
      .then(res => {
        return res.json();
      })
      .then(prods => {
        let tempProducts = [];
        let tempTickers = {};

        prods.forEach(prod => {
          let obj = {};

          obj.id = prod.id;
          obj.name = currencies.find(cur => {
            return cur.id == prod.id.split('-')[0];
          }).name;

          tempProducts.push(obj);

          tempTickers[obj.id] = {
            name: obj.name,
            product_id: 'n/a',
            price: 'n/a',
            open_24h: 'n/a',
            volume_24h: 'n/a',
            low_24h: 'n/a',
            high_24h: 'n/a',
            changePercent: 'n/a',
            vol_quote_24h: 'n/a'
          };
          // Vue.set(app.tickers, obj.id, tikerObj );
        });

        app.products = tempProducts;
        app.tickers = tempTickers;

        startWebSocketConnection();
      });
  });

var app = new Vue({
  el: '#app',
  data: {
    products: [],
    tickers: {},
    sortByOptions: {
      alphabetical: {
        name: 'A - Z',
        active: false
      },
      quoteVolume: {
        name: 'Quote Volume',
        active: false
      },
      changePercent: {
        name: 'Percent Change',
        active: false
      }
    },
    sortBy: 'quoteVolume',
    sortDirection: 'descending'
  },
  computed: {
    computeSortBy: function() {
      return {
        alphabetical: () => {
          if (this.sortDirection == 'descending') {
            return this.products
              .map(item => item.id)
              .sort()
              .reverse();
          } else {
            return this.products.map(item => item.id).sort();
          }
        },
        quoteVolume: () => {
          return this.products
            .map(item => item.id)
            .sort((a, b) => {
              if (this.sortDirection == 'descending') {
                return (
                  parseFloat(this.tickers[b].vol_quote_24h) -
                  parseFloat(this.tickers[a].vol_quote_24h)
                );
              } else {
                return (
                  parseFloat(this.tickers[a].vol_quote_24h) -
                  parseFloat(this.tickers[b].vol_quote_24h)
                );
              }
            });
        },
        changePercent: () => {
          return this.products
            .map(item => item.id)
            .sort((a, b) => {
              if (this.sortDirection == 'descending') {
                return (
                  parseFloat(this.tickers[b].changePercent) -
                  parseFloat(this.tickers[a].changePercent)
                );
              } else {
                return (
                  parseFloat(this.tickers[a].changePercent) -
                  parseFloat(this.tickers[b].changePercent)
                );
              }
            });
        }
      };
    }
  },
  methods: {
    base(p) {
      return p.split('-')[0];
    },
    quote(p) {
      return p.split('-')[1];
    },
    changeSortBy(order) {
      this.sortBy = order;
      if (this.sortDirection == 'ascending') {
        this.sortDirection = 'descending';
      } else {
        this.sortDirection = 'ascending';
      }
    },
    getDisplayNum(num) {
      if (num == 'n/a') {
        // console.log(`typeof num: ${typeof num}, num: ${num}`);
        return 'N/A';
      }
      let stringNum =
        typeof num == 'number' ? num.toFixed() : Number(num).toFixed(); // toFixed is to get rid of number after decimal.
      if (stringNum.length > 9) {
        return `${stringNum.slice(0, -9)}.${stringNum.slice(-9, -7)}B`;
      } else if (stringNum.length > 6) {
        return `${stringNum.slice(0, -6)}.${stringNum.slice(-6, -4)}M`;
      } else if (stringNum.length > 3) {
        return `${stringNum.slice(0, -3)}.${stringNum.slice(-3, -1)}K`;
      } else {
        return stringNum;
      }
    }
  }
});

// ############################ SOCKET CONNECTION #####################################

let socket;

function startWebSocketConnection() {
  socket = new WebSocket('wss://ws-feed.pro.coinbase.com');
  let subscribeMsg = {
    type: 'subscribe',
    product_ids: app.products.map(item => item.id),
    channels: ['ticker']
  };

  socket.addEventListener('open', event => {
    socket.send(JSON.stringify(subscribeMsg));
  });

  socket.addEventListener('message', event => {
    let data = JSON.parse(event.data);

    if (data.type == 'ticker') {
      updateData(data);
    }
  });

  socket.addEventListener('close', event => {
    if (confirm('Websocket Disconnected!!, Connect Again?')) {
      startWebSocketConnection();
    }
  });
}

function updateData(data) {
  let tempObj = {};
  let vol24 = parseFloat(data.volume_24h);
  let last = parseFloat(data.price);
  let open = parseFloat(data.open_24h);
  let diff = last - open;
  let changePercent = ((diff / open) * 100).toFixed(2);
  let quoteTicker = data.product_id.split('-')[1];

  // this logic doesn't work if in future the baseTicker with no USD or USDC pair is launched.
  // to find the quote volume in USD equivalent.
  if (quoteTicker == 'USD' || quoteTicker == 'USDC') {
    // app.tickers[data.product_id].vol_quote_24h = (vol24 * last)
    tempObj.vol_quote_24h = (vol24 * last).toFixed(8).slice(0, 11);
  } else {
    let baseTicker = data.product_id.split('-')[0];
    let usdBaseLastPrice = app.tickers[`${baseTicker}-USD`];
    let usdcBaseLastPrice = app.tickers[`${baseTicker}-USDC`];
    let baseLastPrice;

    if (usdBaseLastPrice != undefined && usdBaseLastPrice.price != 'n/a') {
      baseLastPrice = usdBaseLastPrice.price;
    } else if (
      usdcBaseLastPrice != undefined &&
      usdcBaseLastPrice.price != 'n/a'
    ) {
      baseLastPrice = usdcBaseLastPrice.price;
    } else {
      baseLastPrice = 'n/a';
    }

    if (baseLastPrice != 'n/a') {
      tempObj.vol_quote_24h = (vol24 * parseFloat(baseLastPrice))
        .toFixed(8)
        .slice(0, 11);
    }
  }

  tempObj.product_id = data.product_id;
  tempObj.volume_24h = data.volume_24h.slice(0, 11);
  tempObj.changePercent = changePercent;
  tempObj.price = data.price;

  tempObj.open_24h = parseFloat(data.open_24h).toString();
  tempObj.low_24h = parseFloat(data.low_24h).toString();
  tempObj.high_24h = parseFloat(data.high_24h).toString();

  app.tickers[data.product_id] = Object.assign(
    {},
    app.tickers[data.product_id],
    tempObj
  );
}

let naCheckInterval;
// check for ticker that has USD volume N/A because of unknown base currency price that has non USD quote price
// and force to recalculate if corresponding USD price is available
function checkForNa() {
  let tickers = app.tickers;
  let naFound = false;

  for (const id in tickers) {
    if (tickers.hasOwnProperty(id)) {
      if (
        tickers[id].vol_quote_24h == 'n/a' &&
        tickers[id].volume_24h != 'n/a'
      ) {
        naFound = true;
        updateData(tickers[id]);
      }
    }
  }

  if (!naFound) {
    clearInterval(naCheckInterval);
  }

  // console.count('checkForNa() is called');
}

setTimeout(() => {
  naCheckInterval = setInterval(checkForNa, 1000);
}, 1000);
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
