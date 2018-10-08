var express = require('express');
var app = express();
var URL = require('url');
var fs = require('fs');
const path = require('path')
const Axios = require('axios')
const opn = require('opn')
app.use(express.static('./static'));
var bodyParser = require('body-parser');
app.use(bodyParser.json());


/*
  import
 */
require('./ok/ticker');




app.listen(32768,function(){
  //opn('http://127.0.0.1:10086/test2', {app: ['chrome']})
});

app.get('/hello',function(req,res){
  res.send('hello world')
});

app.post('/event',function(req,res){
  console.log(req.query);
  console.log(req.body);
  res.send('ok');
});

app.get('/test',function(req,res){
  res.send('test ok');
});
app.get('/test2',function(req,res){
  res.send('ok');
})



var callback = function(res){
  if(res.trim().length>0){
    setTimeout(function(){
      console.log(res)
      console.log('\n=========\n')
    },1000);
  }
}

