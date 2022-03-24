fetch("https://api.pro.coinbase.com/currencies")
  .then((res) => {
    return res.json();
  })
  .then((currencies) => {
    fetch("https://api.pro.coinbase.com/products")
      .then((res) => {
        return res.json();
      })
      .then((prods) => {
        let tempProducts = [];
        let tempTickers = {};

        prods.forEach((prod) => {
          let obj = {};

          obj.id = prod.id;
          obj.name = currencies.find((cur) => {
            return cur.id == prod.id.split("-")[0];
          }).name;

          tempProducts.push(obj);

          tempTickers[obj.id] = {
            name: obj.name,
            product_id: "n/a",
            price: "n/a",
            open_24h: "n/a",
            volume_24h: "n/a",
            low_24h: "n/a",
            high_24h: "n/a",
            changePercent: "n/a",
            vol_quote_24h: "n/a",
          };
          // Vue.set(app.tickers, obj.id, tikerObj );
        });

        app.products = tempProducts;
        app.tickers = tempTickers;
        app.holdedTickers = Object.assign({}, tempTickers);

        startWebSocketConnection();
      });
  });

var app = new Vue({
  el: "#app",
  data: {
    showCharts: false,
    onFirstChart: true,
    products: [],
    tickers: {},
    holdedTickers: {},
    ignoreNewData: false,
    sortByOptions: {
      alphabetical: {
        name: "A - Z",
        active: false,
      },
      quoteVolume: {
        name: "Quote Volume",
        active: false,
      },
      changePercent: {
        name: "Percent Change",
        active: false,
      },
    },
    sortBy: "quoteVolume",
    sortDirection: "descending",
    checkedAssets: {
      ALL: false,
      USD: true,
      USDC: true,
      USDT: true,
      BTC: false,
      EUR: false,
      GBP: false,
      DAI: false,
      ETH: false,
    },
  },
  computed: {
    computeSortBy: function () {
      let filteredProducts = this.products
        .map((item) => item.id)
        .filter((pid) => {
          let asset = pid.split("-")[1];

          return this.checkedAssets[asset];
        });

      return {
        alphabetical: () => {
          if (this.sortDirection == "descending") {
            return filteredProducts.sort().reverse();
          } else {
            return filteredProducts.sort();
          }
        },
        quoteVolume: () => {
          return filteredProducts.sort((a, b) => {
            if (this.sortDirection == "descending") {
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
          return filteredProducts.sort((a, b) => {
            if (this.sortDirection == "descending") {
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
        },
      };
    },
    product_ids: function () {
      return this.products.map((item) => item.id);
    },
  },
  methods: {
    loadChart(product) {
      if (document.getElementById("app").clientWidth < 900) {
        return;
      }
      this.showCharts = true;
      setTimeout(() => {
        if (this.onFirstChart) {
          populateChart(document.getElementById("chart1"), "628e7", product);
        } else {
          populateChart(document.getElementById("chart2"), "628e8", product);
        }
        this.onFirstChart = !this.onFirstChart;
      }, 500);
    },
    base(p) {
      return p.split("-")[0];
    },
    quote(p) {
      return p.split("-")[1];
    },
    changeSortBy(order) {
      // this.holdNewDataUpdate();
      this.sortBy = order;
      if (this.sortDirection == "ascending") {
        this.sortDirection = "descending";
      } else {
        this.sortDirection = "ascending";
      }
    },
    getDisplayNum(num) {
      if (num == "n/a") {
        // console.log(`typeof num: ${typeof num}, num: ${num}`);
        return "N/A";
      }
      let stringNum =
        typeof num == "number" ? num.toFixed() : Number(num).toFixed(); // toFixed is to get rid of number after decimal.
      if (stringNum.length > 9) {
        return `${stringNum.slice(0, -9)}.${stringNum.slice(-9, -7)}B`;
      } else if (stringNum.length > 6) {
        return `${stringNum.slice(0, -6)}.${stringNum.slice(-6, -4)}M`;
      } else if (stringNum.length > 3) {
        return `${stringNum.slice(0, -3)}.${stringNum.slice(-3, -1)}K`;
      } else {
        return stringNum;
      }
    },
    toggleCheckboxes: function () {
      // this.holdNewDataUpdate();
      for (const key in this.checkedAssets) {
        if (this.checkedAssets.hasOwnProperty(key)) {
          this.checkedAssets[key] = this.checkedAssets.ALL;
        }
      }
    },
    toggleAll: function () {
      // this.holdNewDataUpdate();
      for (const key in this.checkedAssets) {
        if (!this.checkedAssets[key] && key != "ALL") {
          this.checkedAssets.ALL = false;
          return;
        }
      }
      this.checkedAssets.ALL = true;
    },
    /*  holdNewDataUpdate: function () {
      this.ignoreNewData = true;
      setTimeout(() => {
        this.ignoreNewData = false;
      }, 3000);
    }, */
  },
  mounted: function () {
    setInterval(() => {
      this.tickers = Object.assign({}, this.holdedTickers);
    }, 1000);
  },
});

// ############################ SOCKET CONNECTION #####################################

let socket;
let isSocketConnected = false;
let subscribed = false;
let unsubscribeTimeout = null;
let aboutToUnsubscribe = false;

function startWebSocketConnection() {
  socket = new WebSocket("wss://ws-feed.pro.coinbase.com");
  let subscribeMsg = {
    type: "subscribe",
    product_ids: app.product_ids,
    channels: ["ticker_1000"],
  };

  socket.addEventListener("open", (event) => {
    isSocketConnected = true;
    socket.send(JSON.stringify(subscribeMsg));
    subscribed = true;
    setTimeout(() => {
      app.ignoreNewData = true;
    }, 500);
    setTimeout(() => {
      app.ignoreNewData = false;
    }, 5000);
  });

  socket.addEventListener("message", (event) => {
    let data = JSON.parse(event.data);

    if (data.type == "ticker") {
      if (!app.ignoreNewData) {
        updateData(data);
      }
    }
  });

  socket.addEventListener("close", (event) => {
    isSocketConnected = false;
    subscribed = false;
    // console.log("Websocket disconnected @ " + new Date().toLocaleString());

    if (document.visibilityState === "visible") {
      // console.log("Abrupt disconnection occured!! Reconnecting Websocket..");
      startWebSocketConnection();
    }
  });
}

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    if (aboutToUnsubscribe) {
      clearTimeout(unsubscribeTimeout);
      aboutToUnsubscribe = false;
    }
  }

  if (document.visibilityState === "visible" && !isSocketConnected) {
    // console.log("Reconnecting Websocket... @ " + new Date().toLocaleString());
    startWebSocketConnection();
  } else if (document.visibilityState === "visible" && !subscribed) {
    subscribe(app.product_ids, ["ticker"]);
    subscribed = true;
    // console.log(`subscribed`);
  } else if (document.visibilityState !== "visible" && subscribed) {
    unsubscribeTimeout = setTimeout(() => {
      unsubscribe(app.product_ids, ["ticker"]);
      subscribed = false;
      // console.log(`UNsubscribed`);
      aboutToUnsubscribe = false;
    }, 60000);
    aboutToUnsubscribe = true;
  }
});

function subscribe(product_ids, channels) {
  let subscribeMsg = {
    type: "subscribe",
    product_ids,
    channels,
  };

  socket.send(JSON.stringify(subscribeMsg));
}

function unsubscribe(product_ids, channels) {
  let subscribeMsg = {
    type: "unsubscribe",
    product_ids,
    channels,
  };

  socket.send(JSON.stringify(subscribeMsg));
}

function updateData(data) {
  let tempObj = {};
  let vol24 = parseFloat(data.volume_24h);
  let last = parseFloat(data.price);
  let open = parseFloat(data.open_24h);
  let diff = last - open;
  let changePercent = ((diff / open) * 100).toFixed(2);
  let quoteTicker = data.product_id.split("-")[1];

  // this logic doesn't work if in future the baseTicker with no USD or USDC pair is launched.
  // to find the quote volume in USD equivalent.
  if (quoteTicker == "USD" || quoteTicker == "USDC" || quoteTicker == "USDT") {
    // app.tickers[data.product_id].vol_quote_24h = (vol24 * last)
    tempObj.vol_quote_24h = (vol24 * last).toFixed(8).slice(0, 11);
  } else {
    let baseTicker = data.product_id.split("-")[0];
    let usdBaseLastPrice = app.tickers[`${baseTicker}-USD`];
    let usdcBaseLastPrice = app.tickers[`${baseTicker}-USDC`];
    let baseLastPrice;

    if (usdBaseLastPrice != undefined && usdBaseLastPrice.price != "n/a") {
      baseLastPrice = usdBaseLastPrice.price;
    } else if (
      usdcBaseLastPrice != undefined &&
      usdcBaseLastPrice.price != "n/a"
    ) {
      baseLastPrice = usdcBaseLastPrice.price;
    } else {
      baseLastPrice = "n/a";
    }

    if (baseLastPrice != "n/a") {
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

  app.holdedTickers[data.product_id] = Object.assign(
    {},
    app.holdedTickers[data.product_id],
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
        tickers[id].vol_quote_24h == "n/a" &&
        tickers[id].volume_24h != "n/a"
      ) {
        naFound = true;
        updateData(tickers[id]);
      }
    }
  }

  if (!naFound) {
    clearInterval(naCheckInterval);
  }

  // console.count("checkForNa() is called");
}

setTimeout(() => {
  naCheckInterval = setInterval(checkForNa, 1000);
}, 1000);

function scrollToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
}

window.onscroll = handleScroll;
// document.querySelector("body").onscroll = handleScroll;
let scrollToTopBtn = document.querySelector("#scroll-to-top");

function handleScroll() {
  if (window.pageYOffset > 500) {
    scrollToTopBtn.style.opacity = 1;
  } else {
    scrollToTopBtn.style.opacity = 0;
  }
}

function populateChart(elem, cid, product) {
  let width = elem.clientWidth;
  let height = elem.clientHeight;
  let symbol = `COINBASE:${product.split("-").join("")}`;

  elem.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container">
            <div id="tradingview_${cid}"></div>
        </div>
        <!-- TradingView Widget END -->
    `;

  tvScript = document.createElement("script");
  tvScript.textContent = `
        new TradingView.widget(
            {
                "width": ${width},
                "height": ${height},
                "symbol": "${symbol}",
                "interval": "60",
                "timezone": "America/Chicago",
                "theme": "Dark",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "hide_side_toolbar": false,
                "allow_symbol_change": true,
                "studies": [
                  "BB@tv-basicstudies"
                ],
                "container_id": "tradingview_${cid}"
            }
        );
    `;

  elem.children[0].appendChild(tvScript);
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
        console.log(`typeof oldAnimation: ${typeof oldAnimation} `);
        console.log(`oldAnimation: ${oldAnimation}`);

        if(oldAnimation.includes("anim")){
            parent.style.animation = "anim2 1s";
        }else if(oldAnimation.includes("anim2")){
            parent.style.animation = "anim 1s";
        }else{
            parent.style.animation = "anim 1s"
        }
        
        console.log(mutation);
        console.log(mutation.oldValue);
        console.log(mutation.target.textContent);
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
