"use strict";

var expect = require("chai").expect;
var StockHandler = require("../controllers/stockHandler.js");

module.exports = function(app) {
  
  var stockHandler = new StockHandler();

  app.route("/api/stock-prices").get(function(req, res, next) {
    stockHandler.getPrice(
      req.query.stock,
      req.query.stock2,
      req.query.like,
      req.ip,
      function(err, result) {
        if (err) console.log(err);
        else res.json(result);
      }
    );
  });

};
