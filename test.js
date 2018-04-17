/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const
    bodyParser = require('body-parser'),
    config = require('config'),
    crypto = require('crypto'),
    express = require('express'),
    https = require('https'),
    request = require('request'),
    validation    =     require("validator"),
    mongoose = require('mongoose');
var fs = require('fs');
var mailer = require('nodemailer');
// 定義フェーズ
var Schema   = mongoose.Schema;

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
    process.env.MESSENGER_APP_SECRET :
    config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
    (process.env.MESSENGER_VALIDATION_TOKEN) :
    config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
    (process.env.SERVER_URL) :
    config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
    console.error("Missing config values");
    process.exit(1);
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
    var signature = req.headers["x-hub-signature"];

    if (!signature) {
        // For testing, let's log an error. In production, you should throw an
        // error.
        console.error("Couldn't validate the signature.");
    } else {
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];

        var expectedHash = crypto.createHmac('sha1', APP_SECRET)
            .update(buf)
            .digest('hex');

        if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
        }
    }
}

mongoose.Promise = global.Promise;

connect()
    .on('error', console.log)
    .on('disconnected', connect)
    .once('open', listen);

function listen () {
    app.listen(app.get('port'), function() {
        console.log('Node app is running on port', app.get('port'));
    });
}

function connect () {
    var options = { server: { socketOptions: { keepAlive: 1 } } };
    return mongoose.connect(config.get('dbURL'), options).connection;
}

// スキーマ
var SakeType = new Schema({
    _id: Number,
    type: String
});

var Temperature = new Schema({
    _id: Number,
    temperature: String
});

mongoose.model('Temperature', SakeType);
mongoose.model('SakeType', Temperature);

// ドキュメントの作成
//var tmp1 = mongoose.model('Temperature');
//var temperature = new tmp1(
//    {
//    _id : 2,
//        temperature: '飛び切り燗(55℃以上)'
//    }
//);
//
//// ドキュメントの保存
//temperature.save(function(err) {
//    if (err) throw err;
//});


// ドキュメントの作成
//var tmp2 = mongoose.model('SakeType');
//var sakeType = new tmp2(
//    {
//        _id : 2,
//        type: '普通酒'
//    }
//);
//
//// ドキュメントの保存
//sakeType.save(function(err) {
//    if (err) throw err;
//});


var Sake = new Schema({
    brand: String,
    type: { type: Number, ref: 'SakeType' },
    impressions: [{
        temperature: { type: Number, ref: 'Temperature' },
        impression: String
    }]
});


mongoose.model('Sake', Sake);

var tmp3= mongoose.model('Sake');

//// ドキュメントの作成
//var kuheiji = new tmp3({
//    brand: '2',
//    type: 1,
//    impressions: [
//        { temperature: 1, impression: 'めちゃうま' },
//        { temperature: 2, impression: '激うま' }
//    ]
//});
//
//// ドキュメントの保存
//kuheiji.save(function(err) {
//    if (err) throw err;
//});


tmp3.find({ 'impressions.temperature': "めちゃうま" }, function(err, docs) {
    console.log(docs);
    //for (var i=0, size=docs.length; i<size; ++i) {
    //    console.log(docs[i].brand);
    //    //console.log(docs[i].doc.brand);
    //}
});

//var UserSchema = new Schema({
//    name:  String,
//    point: Number
//});
//mongoose.model('User', UserSchema);
//
//var User = mongoose.model('User');
//var user = new User();
//user.name  = 'KrdLab';
//user.point = 777;
//user.save(function(err) {
//    if (err) { console.log(err); }
//});

module.exports = app;

