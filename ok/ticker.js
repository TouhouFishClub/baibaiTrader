var fs = require('fs');
var http = require('http');
var https = require('https');
var crypto=require('crypto');


var HttpsProxyAgent = require('https-proxy-agent')
var proxy = 'http://192.168.17.62:3128';
var agent = new HttpsProxyAgent(proxy);

var apikey = fs.readFileSync('./apikey.txt','utf-8').trim();
var secretkey = fs.readFileSync('./secretkey.txt','utf-8').trim();


var timer = 0;
var mem={};


function run(){
  getMyOrder('bch_eth',function(){
    console.log(mem);
    runticker();
    runNotify();
  })
}

function runticker(){
  setTimeout(function(){
    ticker();
    runticker();
  },10000);
}

function runNotify(){
  var left = 1800000 - new Date().getTime()%1800000;
  console.log('left:'+left);
  if(timer==0){
    timer = 1;
    setTimeout(function(){
      myinfo();
      setTimeout(function () {
        timer = 0;
        runNotify();
      },10000);
    },left)
  }
}

run();


function ticker(){
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/ticker.do?symbol=bch_eth',
    method: 'GET',
    agent:agent
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      handle(data);
    });
  });
  req.on('error', function(err) {
    console.log('req err1:');
    console.log(err);
  });
  req.end();
}






function handle(tickerdata){
  var symbol = 'bch_eth';
  var pricedata= tickerdata.ticker;
  var buy = parseFloat(pricedata.buy.trim());
  var sell = parseFloat(pricedata.sell.trim());
  var last = parseFloat(pricedata.last.trim());
  var ts = new Date().getTime();
  var then = mem['p5'];
  if(mem['p5']){
    var thents = mem['p5'].ts;
    if(ts-thents>300000){
      mem['p5']={p:last,buy:buy,sell:sell,ts:ts};
    }
  }else{
    mem['p5']={p:last,buy:buy,sell:sell,ts:ts};
  }
  if(then){
    var lastp = then.p;
    var willsell = Math.max(lastp,last)*1.17.toFixed(6);
    var willbuy  = Math.min(lastp,last)*0.83.toFixed(6);
    var nowbuy = mem['buy']?mem['buy'].p:0.0001;
    var nowsell = mem['sell']?mem['sell'].p:999.99;
    var exc=false;
    if(Math.abs(willbuy-nowbuy)/nowbuy>0.05){
      console.log('will refresh buy order from '+nowbuy+' to '+willbuy);
      if(mem['buy']){
        var orderid = mem['buy'].id;
        cancel(orderid,symbol,function(){
          trade('buy',symbol,willbuy,0.01);
        })
      }else{
        trade('buy',symbol,willbuy,0.01);
      }
      exc=true;
    }
    if(Math.abs(willsell-nowsell)/nowsell>0.05){
      console.log('will refresh buy sell from '+nowsell+' to '+willsell);
      if(mem['sell']){
        var orderid = mem['sell'].id;
        cancel(orderid,symbol,function(){
          trade('sell',symbol,willsell,0.01);
        });
      }else{
        trade('sell',symbol,willsell,0.01);
      }
      exc=true;
    }
    if(exc){
      setTimeout(function(){
        getMyOrder(symbol,function(){
          console.log('new order refreshed;');
          console.log(mem);
        },true)
      },5000)
    }
  }
  console.log(mem);
}





//cancel(5701,'dgd_bch')
function cancel(orderid,symbol,callback){
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
    },
    agent:agent
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
      callback();
    });
  });
  req.on('error', function(err) {
    console.log('req err2:');
    console.log(err);
  });
  req.write(body);
  req.end();
}

//trade('sell','dgd_bch',0.06029890,0.01);
//type:buy/sell symbol:ltc_btc
//0：未完成的订单 1：已经完成的订单
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
    },
    agent:agent
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
  req.on('error', function(err) {
    console.log('req err3:');
    console.log(err);
  });
  req.write(body);
  req.end();
}

//getMyOrder('dgd_bch')
function getMyOrder(symbol,callback,is_notify){
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
    },
    agent:agent
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      var orders = data.orders;
      var str = '当前订单详情\n';
      for(var i=0;i<orders.length;i++){
        var order = orders[i];
        var status = order.status;
        var price = order.price;
        var type = order.type;
        str = str + type + '\t'+price+'\t'+order.amount+'\t'+status+'\n';
        if(status==0){
          var orderid = order.order_id;
          mem[type]={p:price,id:orderid};
        }
      }
      if(is_notify){
        notify(str.trim());
      }
      callback();
    });
  });
  req.on('error', function(err) {
    console.log('req err4:');
    console.log(err);
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


function myinfo(){
  console.log('will get my info');
  var param = {};
  var body = sign(param);
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/userinfo.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    agent:agent
  };
  var req = https.request(options, function(res) {
    res.setEncoding('utf8');
    var resdata = '';
    res.on('data', function (chunk) {
      resdata = resdata + chunk;
    });
    res.on('end', function () {
      var data = eval('('+resdata+')');
      var free = data.info.funds.free;
      var freezed = data.info.funds.freezed;
      var str = 'Free:\n';
      str = str + 'ETH:\t'+free.eth+'\tBCH:'+free.bch+'\n';
      str = str + 'Freezed:\n';
      str = str + 'ETH:\t'+freezed.eth+'\tBCH:'+freezed.bch+'\n';
      notify(str);
    });
  });
  req.on('error', function(err) {
    console.log('req err4:');
    console.log(err);
  });
  req.write(body);
  req.end();
}

function notify(msg){
  msg = msg.trim();
  var groupid = 221698514;
  setTimeout(function(){
    var options = {
      host: '192.168.17.52',
      port: 23334,
      path: '/send_group_msg?group_id='+groupid+'&message='+encodeURIComponent(msg),
      method: 'GET',
      headers: {

      }
    };
    var req = http.request(options);
    req.end();
  },1000);
}


