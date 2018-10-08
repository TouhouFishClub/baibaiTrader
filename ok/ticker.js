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
  console.log(tickerdata);
});

function handle(tickerdata){
  var channel=tickerdata.channel;
  var n = channel.indexOf('ticker');
  if(n>0){
    var contract_type=channel.substring(n+7);
    var buy=parseFloat(tickerdata.data.buy);
    var sell=parseFloat(tickerdata.data.sell);
    var mywillbuy=parseFloat((buy+0.002).toFixed(3));
    var mywillsell=parseFloat((sell-0.002).toFixed(3));
    if(mywillbuy<mywillsell){
      var keys=Object.keys(mylist);
      var maxbuynow=0;
      var minsellnow=9999999;
      for(var i=0;i<keys.length;i++){
        var oid=keys[i];
        var orderdetail=mylist[oid];
        var type=orderdetail.type;
        var price=orderdetail.price;
        if(type==1){
          if(price<buy){
            cancel(oid,contract_type);
          }
          if(price>maxbuynow){
            maxbuynow=price;
          }
        }
        if(type==2){
          if(price>sell){
            cancel(oid,contract_type);
          }
          if(price<minsellnow){
            minsellnow=price;
          }
        }
      }
      console.log(buy,sell,mywillbuy,mywillsell)
      console.log('==========mylist:=======');
      console.log(mylist);
      console.log('========================\n');
      if(maxbuynow<buy){
        console.log('will buy at:'+mywillbuy);
        runtrade(1,contract_type,mywillbuy,1);
      }
      if(minsellnow>sell){
        console.log('will sell at:'+mywillsell);
        runtrade(2,contract_type,mywillsell,1);
      }
    }
  }
}


var apikey = fs.readFileSync('./apikey.txt','utf-8');
var secretkey = fs.readFileSync('./secretkey.txt','utf-8');

var mylist={};


//runtrade(2,'next_week',6000,1);
//cancel(15880472245,'next_week');
//type1 buy type2 sell
function runtrade(type,contract_type,price,amount){
  var callback=function(orderid){
    mylist[orderid]={type:type,price:price,amount:amount,ts:new Date(),orderid:orderid};
    console.log('==========mylist:=======');
    console.log(mylist);
    console.log('========================\n');
  }
  console.log('will trade:')
  getMyU(function(ret){
    if(ret.result){
      var holding=ret.holding;
      var buyavl = 0;
      var sellavl = 0;
      var realtype = type;
      for(var i=0;i<holding.length;i++){
        var d=holding[i];
        var ct=d.contract_type;
        if(ct==contract_type){
          buyavl = d.buy_available;
          sellavl = d.sell_available;
          if(buyavl>0&&type==2){
            realtype=3;
            break;
          }
          if(sellavl>0&&type==1){
            realtype=4;
            break;
          }
        }
      }
      trade(realtype,contract_type,price,amount,callback)
    }
  })
}

function cancel(orderid,contract_type){
  console.log('will cancel order:'+orderid);
  var param = {};
  param.symbol='eth_usd';
  param.contract_type=contract_type;
  param.order_id=orderid;
  var body = sign(param);
  console.log(body);

  delete(mylist[orderid]);
  console.log('==========mylist:=======');
  console.log(mylist);
  console.log('========================\n');

  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/future_cancel.do',
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

    });
  });
  req.write(body);
  req.end();
}



//realtype 1:开多   2:开空   3:平多   4:平空(1=4,2=3)
function trade(realtype,contract_type,price,amount,callback){
  console.log('will trade');
  var param = {};
  param.symbol='eth_usd';
  param.contract_type=contract_type;
  param.price=price;
  param.amount=amount;
  param.match_price=0;
  param.type=realtype;
  var body = sign(param);
  console.log(body);
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/future_trade.do',
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
      callback(data.order_id);
    });
  });
  req.write(body);
  req.end();
}












function getMyU(callback){
  console.log('will get my u');
  var url = 'https://www.okex.com/api/v1/future_position_4fix.do';
  var param = {};
  param.symbol='eth_usd';
  var body = sign(param);
  console.log(body);
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/future_position_4fix.do',
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
      callback(data);
    });
  });
  req.write(body);
  req.end();
}

function getMyOrder(contract_type,orderID){
  console.log('will get my order');
  var param = {};
  param.symbol='eth_usd';
  param.contract_type=contract_type;
  param.order_id=-1;
  param.status=2;
  var body = sign(param);
  console.log(body);
  var options = {
    host: 'www.okex.com',
    port: 443,
    path: '/api/v1/future_order_info.do',
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
  var md5=crypto.createHash("md5");
  md5.update(str);
  var sign=md5.digest('hex').toUpperCase();
  rstr = rstr + "sign="+sign;
  return rstr;
}


