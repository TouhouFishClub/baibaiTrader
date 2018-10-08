var ws = require("nodejs-websocket")
var conn = ws.connect("wss://real.okex.com:10441/websocket");
var fs = require('fs');
var http = require('http');
var https = require('https');
var crypto=require('crypto');

setTimeout(function(){
  console.log(111);
  conn.send("{'event':'addChannel','channel':'ok_sub_spot_dgd_bch_ticker'}");
},2000);


conn.on('text',function(tickerdatastr){
  var tickerdata = eval('('+tickerdatastr+')');
  handle(tickerdata)
});

function handle(tickerdata){
  console.log(tickerdata);
}

function runTrade(from,peak,type,symbol,amount){

}



var apikey = fs.readFileSync('./apikey.txt','utf-8').trim();
var secretkey = fs.readFileSync('./secretkey.txt','utf-8').trim();
var mylist={};



//cancel(5701,'dgd_bch')
function cancel(orderid,symbol){
  console.log('will cancel order:'+orderid);
  var param = {};
  param.symbol=symbol;
  param.order_id=orderid;
  var body = sign(param);
  console.log(body);
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/cancel_order.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      //console.log(res);
      //console.log(res.Location)
      var data = eval('('+resdata+')');
      console.log(data);

    });
  });
  req.write(body);
  req.end();
}

//trade('sell','dgd_bch',0.06029890,0.01);
//type:buy/sell symbol:ltc_btc
function trade(type,symbol,price,amount,callback){
  console.log('will trade');
  var param = {};
  param.symbol=symbol;
  param.price=price;
  param.amount=amount;
  param.type=type;
  var body = sign(param);
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/trade.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  console.log(body);
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      console.log(data);
    });
  });
  req.write(body);
  req.end();
}

//getMyOrder('dgd_bch')
function getMyOrder(symbol){
  console.log('will get my order');
  var param = {};
  param.symbol=symbol;
  param.status=0;
  param.current_page=0;
  param.page_length=100;
  var body = sign(param);
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/order_history.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      //console.log(res);
      //console.log(res.Location)
      var data = eval('('+resdata+')');
      console.log(data);
    });
  });
  req.write(body);
  req.end();
}






function sign(param){
  param["api_key"]=apikey;
  var keys = Object.keys(param);
  keys.sort();
  var str="";
  for(var i=0;i<keys.length;i++){
    str = str + keys[i] + "=" + param[keys[i]] + "&";
  }
  var rstr = str;
  str = str + "secret_key="+secretkey;
  console.log(str);
  var md5=crypto.createHash("md5");
  md5.update(str);
  var sign=md5.digest('hex').toUpperCase();
  rstr = rstr + "sign="+sign;
  return rstr;
}


