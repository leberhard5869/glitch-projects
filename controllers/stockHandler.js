function StockHandler() {
  var MongoClient = require("mongodb");
  var mongoose = require("mongoose");
  var fetch = require("node-fetch");

  mongoose.set("useFindAndModify", false);

  // Connect DB
  mongoose.connect(
    process.env.DATABASE,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    (err, client) => {
      if (err) {
        console.log("Database error: " + err);
      } else {
        console.log("Successful database connection");
      }
    }
  );

  // Set up schema
  const Schema = mongoose.Schema;
  const stocksSchema = new Schema({
    stock: { type: String, required: true },
    price: { type: String, required: true },
    likes: { type: Number },
    ipLikes: [{ ipAdd: String, like: Number }]
  });
  const Model = mongoose.model("Stocks", stocksSchema);

  function newStock(stock, ip, ipLikeNum, done) {
    var stockUrl =
      "https://repeated-alpaca.glitch.me/v1/stock/" + stock + "/quote";
    fetch(stockUrl)
      .then(response => response.json())
      .then(json => {
        var newStockInfo = new Model({
          stock: json.symbol,
          price: json.latestPrice,
          likes: ipLikeNum,
          ipLikes: { ipAdd: ip, like: ipLikeNum }
        });
        newStockInfo
          .save()
          .then(() => console.log("New save successful"))
          .catch(err => done(err));
        done(null, newStockInfo);
      });
  }

  this.getPrice = function(stock, stock2, like, ip, done) {
    
    !stock2 ? (stock2 = "empty") : stock2;
    let ipLikeNum, ipLikeTotal = 0, newStockName;
    like == "true" ? (ipLikeNum = 1) : (ipLikeNum = 0);

    // Access DB
    var query = Model.find({
      $or: [{ stock: stock.toUpperCase() }, { stock: stock2.toUpperCase() }]
    });
    var promise = query.exec();
    promise

      // Existing stocks if any
      .then(data => {
        return new Promise(function(resolve, reject) {
          if (data.length > 0) {
            data.forEach(function(elm) {
              elm.ipLikes.forEach(function(elm2) {
                if (elm2.ipAdd == ip) ipLikeTotal += elm2.like;
              });
              if (ipLikeTotal === 0) elm.likes += ipLikeNum;
              elm.ipLikes.push({ ipAdd: ip, like: ipLikeNum });
              elm
                .save()
                .then(() => console.log("Existing save successful"))
                .catch(err => done(err));
              ipLikeTotal = 0;
            });
          }
       //   console.log("First", data);
          resolve(data);
        });
      })

      // New stocks if any
      .then(data => {
        return new Promise(function(resolve, reject) {
          if (stock2 == "empty" && data.length === 0) {
            newStock(stock, ip, ipLikeNum, function(err, result) {
              if (err) done(err);
              data[0] = result;
          //    console.log("Second", data);
              resolve(data);
            });
          } else if (stock2 != "empty" && data.length === 1) {
            data[0].stock == stock.toUpperCase()
              ? (newStockName = stock2)
              : (newStockName = stock);
            newStock(newStockName, ip, ipLikeNum, function(err, result) {
              if (err) done(err);
              data[1] = result;
          //    console.log("Second", data);
              resolve(data);
            });
          } else if (stock2 != "empty" && data.length === 0) {
            newStock(stock, ip, ipLikeNum, function(err, result) {
              if (err) done(err);
              data[0] = result;
            });
            newStock(stock2, ip, ipLikeNum, function(err, result) {
              if (err) done(err);
              data[1] = result;
            });
        //    console.log("Second", data);
            resolve(data);
          } else resolve(data);
          //     resolve(data);  ***Resolve cannot be here, must be within async function callback***
        });
      })

      // Compile results
      .then(data => {
        console.log("Third", data);
        if (data.length === 1) {
          var result = {
            stockData: {
              stock: data[0].stock,
              price: data[0].price,
              likes: data[0].likes
            }
          };
        } else if (data.length === 2) {
          result = {
            stockData: [
              {
                stock: data[0].stock,
                price: data[0].price,
                rel_likes: data[1].likes - data[0].likes
              },
              {
                stock: data[1].stock,
                price: data[1].price,
                rel_likes: data[0].likes - data[1].likes
              }
            ]
          };
        }
        return done(null, result);
      })
      .catch(err => done(err));
  };
}

module.exports = StockHandler;
