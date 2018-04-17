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

var model = require('./model');
var moment = require('moment-timezone');
//var collection = require( './mongoclient');

// var helper = require('sendgrid').mail;
var i18n = require("i18n");
var User = model.User;
var Connect = model.Connect;
var ConnectPage = model.ConnectPage;
var Scenario = model.Scenario;
var LogReportTotalDate = model.LogReportTotalDate;
var BotMessage = model.BotMessage;
var UserProfile = model.UserProfile;
var UserPosition = model.UserPosition;
var LogChatMessage = model.LogChatMessage;
var NotificationHistory = model.NotificationHistory;
var Library = model.Library;
var ApiConnect = model.Api;
var Variable = model.Variable;
var MessageVariable = model.MessageVariable;
var Slot = model.Slot;
var Email = model.Email;
var BotLastTime = model.BotLastTime;
var Menu = model.Menu;
var Exception = model.Exception;
var Plan = model.Plan;
var Nlp = model.Nlp;
var SessionScenario = model.SessionScenario;
var SessionUser = model.SessionUser;
var UserScenario = model.UserScenario;
var BotNoReply = model.BotNoReply;
var Zipcode = model.Zipcode;
var PrefJp = model.PrefJp;
var PrefCityJp = model.PrefCityJp;

//var EfoCv = model.EfoCv;
var CreateModelLogForName = model.CreateModelLogForName;
var CreateModelUserProfileForName = model.CreateModelUserProfileForName;
var CreateModelEfoCvForName = model.CreateModelEfoCvForName;
var CreateModelMessageVariableForName = model.CreateModelMessageVariableForName;
var CreateModelScenarioTotalForName = model.CreateModelScenarioTotalForName;
//var CreateModelUserActiveForName = model.CreateModelUserActiveForName;
var CreateModelUseScenarioForName = model.CreateModelUseScenarioForName;
var TotalUserChat = model.TotalUserChat;
var EfoAnalytic = model.EfoAnalytic;
var EfoCookie = model.EfoCookie;
var EfoCaptcha = model.EfoCaptcha;
var EfoCart = model.EfoCart;

var RoomList = model.RoomList;
var RoomMemberProfile = model.RoomMemberProfile;
var RoomMessageVariable = model.RoomMessageVariable;

const default_variable = ["current_url", "user_first_name", "user_last_name", "user_full_name", "user_gender", "user_locale", "user_timezone", "user_referral", "user_lat", "user_long", "user_display_name", "user_id", "preview_flg"];
const default_variable_chatwork = ["user_account_id", "user_name", "user_organization_name", "user_organization_id"];
const filter_variable = ["user_gender", "user_locale", "user_timezone", "user_referral"];
const line_user_variable = ["text", "image", "sticker", "location"];

const LINE_MAX_USER_PUSH = 150;
const LOG_MESSAGE_LIMIT = 300;
const LINE_PUSH_MESSAGE_USER_LIMIT = 6000;

const cluster = require('cluster');
const os = require( "os" );
const numCPUs = os.cpus().length;
const
    WEBCHAT_DEFAULT_MESSAGE_TYPE = "001";

const
    LINE_USER_TEXT = "001",
    LINE_USER_IMAGE = "002",
    LINE_USER_STICKER = "003",
    LINE_USER_LOCATION =  "004",
    SLOT_ACTION_SCENARIO = "001",
    SLOT_ACTION_API = "002",
    SLOT_ACTION_MAIL = "003",
    API_TYPE_DIRECT = "001",
    API_TYPE_VARIABLE = "002",
    MESSAGE_USER_TEXT = "001",
    MESSAGE_USER_PAYLOAD = "003",
    MESSAGE_USER_ATTACHMENT = "004",
    USER_TYPE = 1,
    BOT_TYPE = 2,
    SNS_TYPE_FACEBOOK = '001',
    SNS_TYPE_LINE = '002',
    SNS_TYPE_WEBCHAT = '005',
    SNS_TYPE_EFO = '006',
    SNS_TYPE_CHATWORK = '007',
    MESSAGE_USER = '001',
    MESSAGE_BOT = '002',
    USER_TYPE_TEXT = "001",
    USER_TYPE_LIBRARY = "002",
    USER_TYPE_API = "003",
    BOT_TYPE_QUICK_REPLIES = "005",
    BOT_TYPE_API = "006",
    BOT_TYPE_SCENARIO = "007",
    BOT_TYPE_TEXT = "001",
    BOT_TYPE_BUTTON = "002",
    BOT_TYPE_GENERIC = "003",
    BOT_TYPE_STICKER = "009",
    BOT_TYPE_MAIL = "020",
    LIBRARY_TEXT = "001",
    LIBRARY_SCENARIO = "002",
    MENU_TYPE_URL = "1",
    MENU_TYPE_SCENARIO = "2",
    MENU_TYPE_SUBMENU = "3",


    EFO_USER_INPUT_TEXT = "002",
    EFO_USER_INPUT_TEXTAREA = "003",
    EFO_USER_RADIO_BUTTON = "004",
    EFO_USER_CHECKBOX = "005",
    EFO_USER_PULLDOWN = "006",
    EFO_USER_POSTAL_CODE = "007",
    EFO_USER_FILE = "008",
    EFO_USER_CALENDAR = "009",
    EFO_USER_TERMS = "010",
    EFO_USER_CAROUSEL = "012",
    EFO_BOT_TEXT = "001",
    EFO_BOT_FILE = "002",
    EFO_BOT_MAIL = "003",

    CALENDAR_TYPE_INPUT = "001",
    CALENDAR_TYPE_EMBED = "002",
    CALENDAR_TYPE_PERIOD = "003";
const
    EFO_INPUT_TYPE_CUSTOMIZE = "001",
    EFO_INPUT_TYPE_TIME = "002",
    EFO_INPUT_TYPE_DATE = "003",
    EFO_INPUT_TYPE_MD = "009",
    EFO_INPUT_TYPE_DATETIME = "004",
    EFO_INPUT_TYPE_BIRTHDAY = "005",
    EFO_INPUT_TYPE_PERIOD_HM = "006",
    EFO_INPUT_TYPE_PERIOD_YMD = "007",
    EFO_INPUT_TYPE_PREF_CITY = "100",
    EFO_RADIO_TYPE_IMAGE = "002";

const
    EFO_INPUT_TYPE_TEL = "004",
    EFO_TEL_INPUT_NO_HYPHEN = "001",
    EFO_TEL_INPUT_HYPHEN = "002";

const
    bodyParser = require('body-parser'),
    config = require('config'),
    crypto = require('crypto'),
    express = require('express'),
    https = require('https'),
    request = require('request'),
    validation    =     require("validator"),
    mongoose = require('mongoose'),
    Q = require('q');
var fs = require('fs');
var mailer = require('nodemailer');
var dateFormat = require('dateformat');
var timediff = require('timediff');

// 定義フェーズ
var Schema   = mongoose.Schema;

const APP_ENV = config.get('appEnv') ?
    config.get('appEnv') :
    'local';
i18n.configure({
    locales:['ja', 'en', 'th', 'vn'],
    defaultLocale: 'ja',
    objectNotation: true,
    directory: __dirname + '/public/assets/locales'
});

var Redis = require('ioredis');
var redis = new Redis({
  port: config.get('redisPort'),
  host: config.get('redisPushHost')
});
var g_bot_language = 'ja';
redis.subscribe('notification');
redis.on("message", function(channel, message) {
    if(typeof cluster.worker !== "undefined" && typeof cluster.worker.id !== "undefined"){
        return;
    }
    var data = JSON.parse(message);
    console.log(data);
    data =data.data.arr_notification;
    data.forEach(function(row) {
        //console.log(row.connect_page_id + " " + row.page_access_token + " " + row.scenario_id);
        if(row.sns_type == SNS_TYPE_LINE){
            setPushMessageLine(row);
        }else{
            redisPublicMessage(row)
                .fail(function(){
                    console.log("fail");
                })
                .catch(function(err) {
                    saveException(err);
                });
        }
    });
});

var emailValidator = require("email-validator");

var transporter = mailer.createTransport({
    host: config.get('mail_host'),
    port: 25,
    secure: false,
    tls:{
        rejectUnauthorized: false
    }
});




// var sg = require('sendgrid')(config.get('sendgrid_api_key'));

//const GOOGLE_API_KEY = config.get('googleapi_api_key');
//const GOOGLE_CLIENT_ID = config.get('googleapi_client_id');
//const GOOGLE_CLIENT_SECRET = config.get('googleapi_client_secret');

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

const APP_URL = config.get('appURL');

const SOCKET_URL = config.get('socketURL');

const TIMEZONE = config.get('timezone');

const AZURE_STORAGE_URL = 'https://' + config.get('azure_storage_name') + '.blob.core.windows.net/' + config.get('azure_storage_container') + "/uploads/bot_picture/";
const AZURE_STORAGE_UPLOAD_URL = 'https://' + config.get('azure_storage_name') + '.blob.core.windows.net/' + config.get('azure_storage_container') + "/";
const EMBED_AZURE_STORAGE_URL = 'https://' + config.get('app_azure_storage_name') + '.blob.core.windows.net/' + config.get('app_azure_storage_container') + "/";
const APP_VERSION = config.get('app_version');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
    console.error("Missing config values");
    process.exit(1);
}

var http = require('http');


var svgCaptcha = require('svg-captcha');

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        // Create a worker
        cluster.fork();
    }
} else {
    // Workers share the TCP connection in this server
    var app = express();
    var server = http.createServer(app);

    if(APP_ENV == "embot_dev" || APP_ENV == "embot_staging" ){
        var options = {
            key: fs.readFileSync('/etc/pki/tls/private/' + APP_ENV + '.key', 'utf8'),
            cert: fs.readFileSync('/etc/pki/tls/certs/' + APP_ENV + '.crt', 'utf8'),
            ca: fs.readFileSync('/etc/pki/tls/certs/' + APP_ENV + '_chain.crt', 'utf8'),
            passphrase: config.get('ssl_passphrase')
        };
        server = https.createServer(options, app);
    }
    app.set('port', config.get('appPort2'));
    app.set('views', __dirname + '/public/assets/view');
    app.set('view engine', 'ejs');
    app.use(bodyParser.json({verify: verifyRequestSignature}));
    app.use(abortOnError);
    app.use(express.static('public'));
    app.use(i18n.init);

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());


    process.on('uncaughtException', function (err) {
        console.log("uncaughtException");
        console.log(err);
        saveException(err);
    });

    process.on('unhandledRejection', function (err) {
        console.log("unhandledRejection");
        console.log(err);
        saveException(err);
    });

    app.get('/webchat', function (req, res) {
        console.log("worker=" + cluster.worker.id);
        res.render('index', { azure_storage_url: EMBED_AZURE_STORAGE_URL, version: APP_VERSION, socket_url: SOCKET_URL });
    });

    app.get('/efo', function (req, res) {
        res.render('efo', { azure_storage_url: EMBED_AZURE_STORAGE_URL, version: APP_VERSION, socket_url: SOCKET_URL });
    });

    app.get('/captcha', function (req, res) {
        //svgCaptcha.loadFont(" https://fonts.googleapis.com/css?family=Crimson+Text|Open+Sans:400,600");
        var cid = req.query.cid;
        var uid = req.query.uid;
        var charPreset = req.query.charPreset;
        var color = req.query.color;
        var size = req.query.size;
        if(typeof charPreset === "undefined"){
            charPreset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        }
        if(typeof cid !== "undefined" && typeof uid !== "undefined" && mongoose.Types.ObjectId.isValid(cid)){
            ConnectPage.findOne({_id: cid, deleted_at: null}, function (err, result) {
                if(result){
                    var option = {size: size, noise: 1, charPreset: charPreset};
                    if(color){
                        option.color = true;
                    }
                    var captcha = svgCaptcha.create(option);
                    //req.session.captcha = captcha.text;
                    var now = new Date();
                    EfoCaptcha.update({
                            cid: cid,
                            uid: uid
                        }, {
                            $set: {
                                text: captcha.text,
                                updated_at: now
                            },
                            $setOnInsert: {created_at: now}
                        },
                        {upsert: true, multi: false}, function (err) {
                            if (err) throw err;
                            res.type('svg');
                            res.status(200).send(captcha.data);
                        });
                }else{
                    res.sendStatus(403);
                }
            });
        }else{
            res.sendStatus(403);
        }
    });

    app.get('/captchapreview', function (req, res) {
        var size = req.query.size;
        var color = req.query.color;
        var charPreset = req.query.charPreset;
        var option = {size: size, noise: 1, charPreset: charPreset};
        if(color){
            option.color = true;
        }

        //background: '#efefef'
        var captcha = svgCaptcha.create(option);
        res.type('svg');
        res.status(200).send(captcha.data);
    });

    app.listen(app.get('port'));
}

// Express error-handling middleware function.
// Read more: http://expressjs.com/en/guide/error-handling.html
function abortOnError(err, req, res, next) {
    if (err) {
        console.error("abortOnError Couldn't validate the signature.");
    } else {
        console.log("next");
        next();
    }
}

function saveException(err){
    var now = new Date();
    var exception = new Exception({
        err: err,
        created_at : now,
        updated_at : now
    });
    exception.save(function(err) {
    });
}

function verifyRequestSignature(req, res, buf) {
    console.log("verifyRequestSignature");
    var signature = req.headers["x-hub-signature"];
    var signature_line = req.headers["x-line-signature"];
    var signature_chatwork = req.headers["x-chatworkwebhooksignature"];

    var secret_key = req.query.secret_key;
    if(signature_chatwork){
        //var token = req.query.token;
        //var cipheredBody = digest(buf);
        //console.log("secret_key=" + secret_key);
        //console.log(cipheredBody == signature_chatwork);
        //if(cipheredBody != signature_chatwork){
        //    throw new Error("Couldn't validate the request signature.");
        //}
        if(secret_key){
            //ConnectPage.findOne({ validate_token: secret_key}, function(err, result) {
            //    if (err) throw err;
            //    console.log(result);
            //    if (result) {
            //        var expectedHashLine = crypto.createHmac('sha256', result.channel_secret)
            //            .update(buf)
            //            .digest('base64');
            //        if (signature_line != expectedHashLine) {
            //            throw new Error("Couldn't validate the request signature.");
            //        }
            //    }
            //});
        }else{
            throw new Error("Couldn't validate the request signature.");
        }
    }
    else if(signature_line){
        if(secret_key){
            //ConnectPage.findOne({ validate_token: secret_key}, function(err, result) {
            //    if (err) throw err;
            //    console.log(result);
            //    if (result) {
            //        var expectedHashLine = crypto.createHmac('sha256', result.channel_secret)
            //            .update(buf)
            //            .digest('base64');
            //        if (signature_line != expectedHashLine) {
            //            throw new Error("Couldn't validate the request signature.");
            //        }
            //    }
            //});
        }else{
            throw new Error("Couldn't validate the request signature.");
        }
    }else if (signature){
        var elements = signature.split('=');
        var method = elements[0];
        var signatureHash = elements[1];
        //if(secret_key){
        //ConnectPage.findOne({ validate_token: secret_key}, function(err, result) {
        //    if (err) throw err;
        //    console.log(result);
        //    if (result) {
        //        var expectedHash = crypto.createHmac('sha1', result.app_secret)
        //            .update(buf)
        //            .digest('hex');
        //        if (signatureHash != expectedHash) {
        //            throw new Error("Couldn't validate the request signature.");
        //        }
        //    }else{
        //        //throw new Error("Couldn't validate the request signature.");
        //        throw new NotFound("Couldn't validate the request signature.");
        //    }
        //});
        //}
        if(secret_key == APP_SECRET){
            var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                .update(buf)
                .digest('hex');
            if (signatureHash != expectedHash) {
                throw new Error("Couldn't validate the request signature.");
            }
        }
    }else{
        throw new Error("Couldn't validate the request signature.");
    }
}