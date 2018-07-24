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
var UnreadMessage = model.UnreadMessage;
var LastMessage = model.LastMessage;

var moment = require('moment');

var date_format_global = 'YYYY-MM-DD HH:mm:ss';
var date_format_mini_global = 'YYYY-MM-DD';

var Room = model.Room;

//var EfoCv = model.EfoCv;
var CreateModelLogForName = model.CreateModelLogForName;
var CreateModelEfoCvForName = model.CreateModelEfoCvForName;
//var CreateModelUserActiveForName = model.CreateModelUserActiveForName;

var EfoCart = model.EfoCart;

var RoomList = model.RoomList;

var UserIdsArr = {};
var KeyByRoom = {};
// user đang có key secret nào
// format: {user_id_1: key_1; user_id_2: key_2}
var UserKey = {};
// trong room đang có user nào online, offline
// format: {room_id_1 : {user_id_1: true, user_id_2: false}, room_id_2: {user_id_2 : false, user_id_3: true}} ( true: user online, false: offline)
var UserRoom = {};


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
    ROOM_TYPE_ONE_ONE = "001",
    ROOM_TYPE_ONE_MANY = "002";

const
    USER_SEND_TEXT = "001",
    USER_SEND_FILE = "002";

const
    USER_AUTHORITY_SUPER_ADMIN = "001",
    USER_AUTHORITY_ADMIN_LV_1 = "002",
    USER_AUTHORITY_ADMIN_LV_2 = "003",
    USER_AUTHORITY_CLIENT = "004";

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

const server_url = config.get('serverURL');
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

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
    (process.env.SERVER_URL) :
    config.get('serverURL');

const APP_URL = config.get('appURL');

const SOCKET_URL = config.get('socketURL');

const TIMEZONE = config.get('timezone');

const APP_VERSION = config.get('app_version');

// if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
//     console.error("Missing config values");
//     process.exit(1);
// }

var http = require('http');

const sticky = require('sticky-session');
const sredis = require('socket.io-redis');
const io = require('socket.io')();
io.adapter(sredis({
    port: config.get('redisPort'),
    host: config.get('redisHost')}));

var io_socket;
var app = express();
//var server = http.createServer(app);
var server = http.createServer(app, function(req, res) {
    res.end('worker: ' + cluster.worker.id);
});

if(APP_ENV == "embot_dev" || APP_ENV == "embot_staging" ){
    var options = {
        key: fs.readFileSync('/etc/pki/tls/private/' + APP_ENV + '.key', 'utf8'),
        cert: fs.readFileSync('/etc/pki/tls/certs/' + APP_ENV + '.crt', 'utf8'),
        ca: fs.readFileSync('/etc/pki/tls/certs/' + APP_ENV + '_chain.crt', 'utf8'),
        passphrase: config.get('ssl_passphrase')
    };
    server = https.createServer(options, app, function(req, res) {
        res.end('worker: ' + cluster.worker.id);
    });
}

app.get('/captcha', function (req, res) {
    console.log('capchat');
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

            }else{
                res.sendStatus(403);
            }
        });
    }else{
        res.sendStatus(403);
    }
});

//var io = require('socket.io')(app.server);
io.attach( server ,{
    transports: ['polling', 'websocket'],
    origin: '*'
});
//var isWorker = sticky.listen(server, config.get('socketPort'));

//server.listen(config.get('socketPort'), function () {
//    var host = server.address().address;
//    var port = server.address().port;
//    console.log("Server listening at http://%s:%s", host, port)
//});
var svgCaptcha = require('svg-captcha');

if (!sticky.listen(server, config.get('socketPort'))) {
    // Master code
    server.once('listening', function() {
        console.log('server started on socket port', config.get('socketPort'));
    });
} else {
    app.set('port', process.env.PORT || config.get('appPort'));
    app.set('views', __dirname + '/public/assets/view');
    app.set('view engine', 'ejs');
    app.use(bodyParser.json({verify: verifyRequestSignature}));
    //app.use(session({
    //    resave: false,
    //    saveUninitialized: false,
    //    store: new RedisStore({
    //        port: config.get('redisPort'),
    //        host: config.get('redisHost')}),
    //    secret: 'Ll8VC5qTdArHxgb5WKoMe2ZiuLNxGxCi',
    //    cookie: { secure: true }
    //}));
    app.use(abortOnError);
    app.use(express.static('public'));
    app.use(i18n.init);

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    app.use('/css', express.static(__dirname + '/public/assets/css'));
    app.use('/js', express.static(__dirname + '/public/assets/js'));
    app.use('/fonts', express.static(__dirname + '/public/assets/fonts'));
    app.use('/images', express.static(__dirname + '/public/assets/images/'));

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

    // socketIO check connection status
    io.on('connection', function (socket) {
        console.log(io.engine.clientsCount);
        console.log("client connected");
        console.log("connection worker =" + cluster.worker.id);

        socket.on('disconnect', function () {
            console.log('client disconnected');
        });

        socket.on('user_join', function (data) {
            console.log('event user_join ', data);
            showListRoom(socket);
            validUserId(data, function (error, result, params) {
                if(!error && result){
                    var user_id = data.user_id;
                    userJoinRoom(socket, user_id, function(success){
                       if(success){
                           setNickNameSocket(socket, user_id, function(success){
                               if(success){
                                   sendKeyUserInRoom(data, params, function(success){
                                       var data_return = {
                                           success: true,
                                       };
                                       io.to(user_id).emit('status_join', data_return);
                                       return;
                                   });
                               }
                           });
                       }
                    });
                }
            });
        });

        socket.on('user_join_room', function (data) {
            var user_id = data.user_id;
            console.log('user_join_room', data);
            userJoinRoom(socket, user_id, function(success){
               if(success){
                   setNickNameSocket(socket, user_id, function(success){
                       if(success){
                           validRoom(data, function( error, result, param){
                               if(!error && result){
                                   var data_result = {
                                       success: true,
                                       room_id: param.room_id
                                   };
                                   userJoinRoom(socket, param.room_id, function (success) {
                                       if(success){
                                           io.to(user_id).emit('status_join_room', data_result);
                                           resetUnreadMessage(param);
                                           return;
                                       }
                                       data.success = false;
                                       data.message = "message.not_join_room ," + param.room_id;
                                       io.to(user_id).emit('status_join_room', data);
                                   });
                               }
                           });
                       }
                   });
               }
            });
        });


        socket.on('webchat_user_conversation', function (msg) {
            //console.log("webchat_user_conversation");

            var data = msg.data;
            data.preview_flg = msg.preview_flg;
            var userAgent = msg.userAgent;
            var browser = (typeof userAgent.browser.name !== "undefined") ? userAgent.browser.name.replace(/Mobile /g, "") : undefined;
            var device = (typeof userAgent.device.type !== "undefined") ? userAgent.device.type : "pc";
            var os = (typeof userAgent.os.name !== "undefined") ? userAgent.os.name : undefined;
            var userLang = msg.userLang;
            if (os == "iOS") {
                os = userAgent.device.model;
            } else if (os == "Windows") {
                os = os + " " + userAgent.os.version;
            }

            if (typeof userLang !== "undefined") {
                userLang = userLang.slice(0, 2);
            }

            validConnectPageId(data, function (err, event, params) {
                //console.log(event);
                if (!err) {
                    params.ref = event.ref;
                    params.browser = browser;
                    params.device = device;
                    params.os = os;
                    params.lang = userLang;

                    checkLimitUserChat(event.connect_page_id, params.sns_type, event.user_id, function (result_check, user) {
                        if (result_check) {
                            getStartScenarioId(params, function (start_scenario_id) {
                                params.current_scenario_id = start_scenario_id;
                                saveUserProfileWebchat(params);
                            });
                            //socket.broadcast.to(event.user_id).emit("efo_other_user_start");
                        } else {
                            data.success = 0;
                            data.limit_user_chat = 1;
                            params.limit_user_chat = 1;
                            sendMessageLimit(params, user);
                            data.limit_user_msg = i18n.__('max_limit_user_chat');
                            //io.to(data.user_id).emit('efo_status_join', data);
                            io.to(socket.id).emit('webchat_status_join', data);
                            //saveUserProfileWebchat(params);
                        }
                    });
                } else {
                    data.success = 0;
                    socket.emit('webchat_status_join', data);
                }
            });
        });

        socket.on('webchat_user_start', function (data) {
            //console.log("webchat_user_start");
            socket.join(data.user_id);
            var connect_page_id = data.connect_page_id;
            if (!connect_page_id || !mongoose.Types.ObjectId.isValid(connect_page_id)) {
                data.new_flg = 0;
                io.to(data.user_id).emit('webchat_bot_start', data);
                return true;
            }

            UserProfile.findOne({
                connect_page_id: connect_page_id,
                user_id: data.user_id
            }, function (err, result) {
                //console.log(result);
                if (result && result.new_flg == 1) {
                    data.new_flg = 1;
                    result.new_flg = undefined;
                    result.save();

                    //io.to(data.user_id).emit('efo_bot_start', data);
                    io.to(socket.id).emit('webchat_bot_start', data);
                } else {
                    data.new_flg = 0;
                    //io.to(data.user_id).emit('efo_bot_start', data);
                    io.to(socket.id).emit('webchat_bot_start', data);
                }
            });
        });

        socket.on('user_send_message', function (data) {
            console.log("user_send_message data",data);
            var room_id = data.room_id;
            var user_id = data.user_id;
            var message_type = data.message_type;
            if(isEmpty(room_id) || isEmpty(user_id) || isEmpty(data.message_type)){
                console.log('data send empty');
                return;
            }
            userJoinRoom(socket, user_id, function(success){
                if(success){
                    setNickNameSocket(socket, user_id, function(success) {
                        if (success) {
                            getRoom(data, function( error, result, params){
                                console.log("user_send_message error",error, result, params);
                                if(!error && result){
                                    userJoinRoom(socket, params.room_id, function (success) {
                                        if(success){
                                            getUserNotExistsRoom(socket, params.room_id, params.member, function(user_id_not_arr, client_in_room){
                                                console.log('getUserNotExistsRoom', user_id_not_arr);
                                                user_id_not_arr = removeElementFromArray(user_id_not_arr, params.user_id);
                                                params.user_id_not_arr = user_id_not_arr;
                                                params.client_in_room = client_in_room;
                                                console.log('parama, ', params);
                                                switch (message_type){
                                                    case USER_SEND_FILE:
                                                        var message = data.message;
                                                        if(!isEmpty(message) && Array.isArray(message)){
                                                            var msg = [];
                                                            message.forEach(function(row) {
                                                                var obj = {
                                                                  'path' : !isEmpty(row.path) ?  row.path : '',
                                                                  'name_origin' : !isEmpty(row.name_origin) ?  row.name_origin : '',
                                                                };
                                                                msg.push(obj);
                                                            });
                                                            sendMessage(params, data.message, data.message_type);
                                                        }

                                                        break;
                                                    case USER_SEND_TEXT:
                                                        sendMessage(params, data.message, data.message_type);
                                                        break;
                                                }
                                            });
                                        }
                                        data.success = false;
                                        data.message = "message.not_join_room ," + params.room_id;
                                        io.to(user_id).emit('status_join_room', data);
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });

        //webchat client to server
        socket.on('webchat_join', function (data) {
            //console.log("webchat_join");
            //console.log(data);
            socket.join(data.user_id);
            var connect_page_id = data.connect_page_id;
            if (!connect_page_id || !mongoose.Types.ObjectId.isValid(connect_page_id)) {
                data.success = 0;
                io.to(data.user_id).emit('webchat_status_join', data);
                return true;
            }
            getConnectPageBySns(connect_page_id, SNS_TYPE_WEBCHAT)
                .then(function (connect_page) {
                    data.success = 1
                    var tmp_picture = (typeof connect_page.picture !== "undefined") ? connect_page.picture : "default_web_embed.png";
                    data.setting = connect_page.setting;
                    data.page_name = connect_page.page_name;
                    //return[
                    //    Q(LogChatMessage.find({ connect_page_id: connect_page.id, user_id: data.user_id, background_flg : null, error_flg: null}, {}, {sort: {created_at: 1}}).exec()),
                    //    Q(Menu.find({connect_page_id: connect_page.id, parent_id: ""}).exec())
                    //]
                    return connect_page.id;
                })
                .then(getFullPersistentMenu)
                .then(function (menus) {
                    data.persistent_menu = menus;
                    validConnectPageId(data, function (err, event, params) {
                        //console.log(event);
                        if (!err) {
                            params.ref = event.ref;
                            checkLimitUserChat(event.connect_page_id, params.sns_type, event.user_id, function (result_check, user) {
                                if (result_check) {
                                    //getStartScenarioId(params, function (start_scenario_id) {
                                    //    params.current_scenario_id = start_scenario_id;
                                    //    saveUserProfileWebchat(params);
                                    //});
                                    //socket.broadcast.to(event.user_id).emit("webchat_other_user_start");
                                } else {
                                    data.success = 0;
                                    data.limit_user_chat = 1;
                                    params.limit_user_chat = 1;
                                    sendMessageLimit(params, user);
                                    data.limit_user_msg = i18n.__('max_limit_user_chat');
                                    //saveUserProfileWebchat(params);
                                }
                                io.to(data.user_id).emit('webchat_status_join', data);
                            });
                            //if(event.new_conversation_flg){
                            //    saveUserProfileWebchat(params);
                            //}
                        } else {
                            data.success = 0;
                            socket.emit('webchat_status_join', data);
                        }
                    });
                    // console.log(menus.persistent_menu[0]['call_to_actions'][1]['call_to_actions']);
                    // return Q(LogChatMessage.find({ connect_page_id: connect_page_id, user_id: data.user_id, background_flg : null, error_flg: null}, {}, {sort: {created_at: -1}}).limit(LOG_MESSAGE_LIMIT).exec());
                })

                //.spread(function(logs, menus) {
                //    console.log(logs);
                //    data.message = logs;
                //    data.persistent_menu = getPersistentMenu(menus);
                //    validConnectPageId(data, function (err, event, params) {
                //        if(!err){
                //            params.ref = event.ref;
                //            socket.broadcast.to(event.user_id).emit("webchat_other_user_start");
                //            if(event.new_conversation_flg){
                //                saveUserProfileWebchat(params);
                //            }
                //        }
                //    });
                //    socket.emit('webchat_status_join', data);
                //})
                .fail(function () {
                    console.log("fail");
                    data.success = 0;
                    io.to(data.user_id).emit('webchat_status_join', data);
                })
                .catch(function (err) {
                    console.error('Something went wrong: ' + err);
                    saveException(err);
                    data.success = 0;
                    io.to(data.user_id).emit('webchat_status_join', data);
                });
        });

        socket.on('webchat_client_get_log', function (data) {
            //console.log("webchat_client_get_log");
            var connect_page_id = data.connect_page_id;
            var user_id = data.user_id;
            var rooms = Object.keys(socket.rooms);
            if (rooms.indexOf(user_id) == -1) {
                socket.join(user_id);
            }
            LogChatMessage.find({
                connect_page_id: connect_page_id,
                user_id: data.user_id,
                background_flg: null,
                error_flg: null
            }, {}, {sort: {created_at: 1}, limit: LOG_MESSAGE_LIMIT}, function (err, result) {
                if (err) throw err;
                if (result && result.length > 0) {
                    //data.message = result.reverse();
                    //io.to(user_id).emit('webchat_server_send_log', data);
                    var messages = [];
                    result.forEach(function (row) {
                        messages.push({message: row.message, log_message_id: row._id, type: row.type, message_type: row.message_type });
                    });
                    io.to(socket.id).emit('webchat_server_send_log', {message: messages, user_id: user_id, connect_page_id: connect_page_id});
                }else{
                    io.to(socket.id).emit('webchat_bot_newconversation', data);
                }
            });
        });

        socket.on('efo_client_get_log', function (data) {
            console.log("efo_client_get_log worker =" + cluster.worker.id);
            var connect_page_id = data.connect_page_id;
            var logCollectionName = connect_page_id + "_logs";
            var logCollection = CreateModelLogForName(logCollectionName);

            var logEfoCvCollectionName = connect_page_id + "_efo_cvs";
            var logEfoCvCollection = CreateModelEfoCvForName(logEfoCvCollectionName);

            var user_id = data.user_id;
            var rooms = Object.keys(socket.rooms);
            if (rooms.indexOf(user_id) == -1) {
                socket.join(user_id);
            }

            logEfoCvCollection.findOne({connect_page_id: connect_page_id, user_id: user_id}, function (err, result) {
                if (err) throw err;
                current_position = LOG_MESSAGE_LIMIT;
                if (result) {
                    var current_position = result.position;
                }
                logCollection.find({
                    connect_page_id: connect_page_id,
                    user_id: user_id,
                    background_flg: null,
                    error_flg: null,
                    b_position: {$lte: current_position}
                }, {}, {sort: {b_position: -1}}, function (err, result) {
                    if (err) throw err;
                    if (result && result.length > 0) {
                        var question_answer_count = 0;
                        result.forEach(function (row) {
                            if (row.type == USER_TYPE) {
                                var data = row.message;
                                if (data) {
                                    question_answer_count++;
                                }
                            }
                        });
                        data.message = result.reverse();
                        EfoCart.find({cid: connect_page_id, uid: user_id}, {data : 1, _id : 0 }, {sort: {updated_at: 1}}, function(err, result_cart){
                            if (err) throw err;
                            if(result){
                                data.data_cart = result_cart;
                            }
                            //console.log("question_answer_count=" + question_answer_count);
                            //console.log(result[0]);
                            //console.log(result[0].scenario_id);
                            var start_scenario_id = (typeof result[0].scenario_id !== "undefined") ? result[0].scenario_id : "";
                            if (start_scenario_id && start_scenario_id.length > 0) {
                                //getQuestionCountEfo(start_scenario_id, connect_page_id, function (question_count) {
                                //    data.question_count = question_count;
                                //
                                //});
                                getCountQuestionEfo([], question_answer_count, start_scenario_id, user_id, current_position + 1);
                                io.to(socket.id).emit('efo_server_send_log', data);
                                //io.to(user_id).emit('efo_server_send_log', data);
                            } else {
                                data.question_count = 0;
                                io.to(socket.id).emit('efo_server_send_log', data);
                                //io.to(user_id).emit('efo_server_send_log', data);
                                //socket.broadcast.to(user_id).emit("efo_server_send_log", data);
                            }
                        });
                    } else {
                        //console.log("efo_bot_newconversation");
                        io.to(socket.id).emit('efo_bot_newconversation', data);
                    }
                });
            });
        });

        socket.on('webchat_user_send_postback', function (data) {
            //console.log("webchat_user_send_postback");
            //console.log(data);
            var user_id = data.user_id;
            var rooms = Object.keys(socket.rooms);
            if (rooms.indexOf(user_id) == -1) {
                socket.join(user_id);
            }
            updateUserLastTime(data.connect_page_id, data.user_id);
            receivedWebchatPostback(data);
        });

        socket.on('webchat_user_send_quickreplies', function (data) {
            //console.log("webchat_user_send_quickreplies");
            //console.log(data);
            var user_id = data.user_id;
            var rooms = Object.keys(socket.rooms);
            if (rooms.indexOf(user_id) == -1) {
                socket.join(user_id);
            }
            updateUserLastTime(data.connect_page_id, data.user_id);
            receivedWebchatQuickreplies(data);
        });

        socket.on('webchat_user_send_message', function (data) {
            //console.log("webchat_user_send_message");
            //console.log(data);
            var user_id = data.user_id;
            var rooms = Object.keys(socket.rooms);
            if (rooms.indexOf(user_id) == -1) {
                socket.join(user_id);
            }
            validConnectPageId(data, function (err, event, params) {
                if (!err) {
                    saveLogChatMessage(params, MESSAGE_USER_TEXT, USER_TYPE, event.message, new Date());
                    socket.broadcast.to(event.user_id).emit("webchat_other_user_send_message", event);
                    updateUserLastTime(event.connect_page_id, event.user_id);
                    params.start_flg = 1;
                    params.user_said = event.message.text;
                    setTimeout(function() {
                        receivedTextMessage(params, event.message.text);
                    }, 900);
                }
            });
        });

        socket.on('efo_join', function (data) {
            //console.log("efo_join");
            //console.log(data);
            socket.join(data.user_id);
            var connect_page_id = data.connect_page_id;
            if (!connect_page_id || !mongoose.Types.ObjectId.isValid(connect_page_id)) {
                data.success = 0;
                io.to(data.user_id).emit('efo_status_join', data);
                return true;
            }
            data.server_url = SERVER_URL;
            data.app_url = APP_URL;
            getConnectPageBySns(connect_page_id, SNS_TYPE_EFO)
                .then(function (connect_page) {
                    data.success = 1;
                    var tmp_picture = (typeof connect_page.picture !== "undefined") ? connect_page.picture : "default_web_embed_efo.png";
                    data.setting = connect_page.setting;
                    data.cv_setting = connect_page.conversion_setting;
                    data.scenario_type = (typeof connect_page.scenario_type !== "undefined") ? connect_page.scenario_type : "100";
                    data.page_name = connect_page.page_name;
                    g_bot_language = connect_page.setting.lang;
                    validConnectPageIdEfo(data, function (err, event, params) {
                        //console.log(event);
                        if (!err) {
                            params.ref = event.ref;
                            checkLimitUserChat(event.connect_page_id, params.sns_type, event.user_id, function (result_check, user) {
                                if (result_check) {
                                    //getStartScenarioId(params, function (start_scenario_id) {
                                    //    params.current_scenario_id = start_scenario_id;
                                    //    saveUserProfileWebchat(params);
                                    //});
                                    //socket.broadcast.to(event.user_id).emit("efo_other_user_start");
                                } else {
                                    data.success = 0;
                                    data.limit_user_chat = 1;
                                    params.limit_user_chat = 1;
                                    sendMessageLimit(params, user);
                                    data.limit_user_msg = i18n.__('max_limit_user_chat');
                                    //saveUserProfileWebchat(params);
                                }
                                //io.to(data.user_id).emit('efo_status_join', data);
                                //socket.emit("efo_status_join", data);
                                if(event.cart_error_message != undefined){
                                    data.cart_error_message = event.cart_error_message;
                                }
                                io.to(socket.id).emit('efo_status_join', data);

                            });
                            //if(event.new_conversation_flg){
                            //    saveUserProfileWebchat(params);
                            //}
                        } else {
                            data.success = 0;
                            //socket.emit('efo_status_join', data);
                            io.to(data.user_id).emit('efo_status_join', data);
                        }
                    });
                })
                .fail(function () {
                    console.log("fail");
                    data.success = 0;
                    io.to(data.user_id).emit('efo_status_join', data);
                })
                .catch(function (err) {
                    console.error('Something went wrong: ' + err);
                    saveException(err);
                    data.success = 0;
                    io.to(data.user_id).emit('efo_status_join', data);
                });
        });

        socket.on('efo_user_conversation', function (msg) {
            //console.log("efo_user_conversation");
            //console.log(msg);

            var data = msg.data;
            data.preview_flg = msg.preview_flg;
            var userAgent = msg.userAgent;
            var browser = (typeof userAgent.browser.name !== "undefined") ? userAgent.browser.name.replace(/Mobile /g, "") : undefined;
            var device = (typeof userAgent.device.type !== "undefined") ? userAgent.device.type : "pc";
            var os = (typeof userAgent.os.name !== "undefined") ? userAgent.os.name : undefined;
            var userLang = msg.userLang;
            if (os == "iOS") {
                os = userAgent.device.model;
            } else if (os == "Windows") {
                os = os + " " + userAgent.os.version;
            }

            if (typeof userLang !== "undefined") {
                userLang = userLang.slice(0, 2);
            }

            validConnectPageIdEfo(data, function (err, event, params) {
                //console.log(event);
                if (!err) {
                    params.ref = event.ref;
                    params.browser = browser;
                    params.device = device;
                    params.os = os;
                    params.lang = userLang;

                    checkLimitUserChat(event.connect_page_id, params.sns_type, event.user_id, function (result_check, user) {
                        if (result_check) {
                            getStartScenarioId(params, function (start_scenario_id) {
                                params.current_scenario_id = start_scenario_id;
                                saveUserProfileEfo(params);
                            });
                            //socket.broadcast.to(event.user_id).emit("efo_other_user_start");
                        } else {
                            data.success = 0;
                            data.limit_user_chat = 1;
                            params.limit_user_chat = 1;
                            sendMessageLimit(params, user);
                            data.limit_user_msg = i18n.__('max_limit_user_chat');
                            //io.to(data.user_id).emit('efo_status_join', data);
                            io.to(socket.id).emit('efo_status_join', data);
                            //saveUserProfileWebchat(params);
                        }
                    });
                } else {
                    data.success = 0;
                    socket.emit('efo_status_join', data);
                }
            });
        });

        socket.on('efo_document_event', function (data) {
            console.log(data);
            var action_name = data.action_name;
            var action_data = data.action_data;

            var rooms = Object.keys(socket.rooms);
            if (rooms.indexOf(data.user_id) == -1) {
                socket.join(data.user_id);
            }
            if(action_data != undefined && action_data.id != undefined){
                validConnectPageIdEfo(data, function (err, event, params) {
                    if (!err){
                        updateUserEfoLastTime(params.connect_page_id, params.user_id);
                        if(action_name == "add_or_update"){
                            var now = new Date();
                            EfoCart.findOneAndUpdate({cid: params.connect_page_id, uid: params.user_id, p_id: action_data.id}, { $set: {data: action_data, updated_at: new Date()}, $setOnInsert: {created_at: now}}, {upsert: true, multi: false}, function(err, result) {
                                if (err) throw err;
                                if(result){

                                }
                            });
                        }else if(action_name == "remove"){
                            EfoCart.remove({cid: params.connect_page_id, uid: params.user_id, p_id: action_data.id}, function(err) {
                                if (err) throw err;
                            });
                        }
                    }
                });
            }
        });

        socket.on('efo_add_to_cart_event', function (data) {
            console.log(data);
            var action_name = data.action_name;
            var action_data = data.action_data;

            var rooms = Object.keys(socket.rooms);
            if (rooms.indexOf(data.user_id) == -1) {
                socket.join(data.user_id);
            }

            if(action_data != undefined && action_data.id != undefined){
                validConnectPageIdEfo(data, function (err, event, params) {
                    if (!err){
                        updateUserEfoLastTime(params.connect_page_id, params.user_id);
                        if(action_name == "add"){
                            var now = new Date();
                            EfoCart.findOne({cid: params.connect_page_id, uid: params.user_id, p_id: action_data.id}, function(err, result) {
                                if (err) throw err;
                                if(result){
                                    var data = Object.assign({}, result.data);
                                    data.amount += action_data.amount;
                                    result.data = data;
                                    result.updated_at = new Date();
                                    result.save();
                                }else{
                                    EfoCart.findOneAndUpdate({cid: params.connect_page_id, uid: params.user_id, p_id: action_data.id}, { $set: {data: action_data, updated_at: new Date()}, $setOnInsert: {created_at: now}}, {upsert: true, multi: false}, function(err, result) {
                                        if (err) throw err;
                                    });
                                }
                            });
                        }
                        else if(action_name == "update"){
                            EfoCart.findOne({cid: params.connect_page_id, uid: params.user_id, p_id: action_data.id}, function(err, result) {
                                if (err) throw err;
                                if(result){
                                    var data = Object.assign({}, result.data);
                                    data.amount = action_data.amount;
                                    result.data = data;
                                    result.updated_at = new Date();
                                    result.save();
                                }
                            });
                        }else if(action_name == "remove"){
                            EfoCart.remove({cid: params.connect_page_id, uid: params.user_id, p_id: action_data.id}, function(err) {
                                if (err) throw err;
                            });
                        }
                    }
                });
            }
        });

        socket.on('efo_user_confirm_reject', function (data) {
            validConnectPageIdEfo(data, function (err, event, params) {
                if (!err) {
                    //console.log(params);
                    var log_message_id = data.log_message_id;
                    var user_id = data.user_id;
                    LogChatMessage.findOne({_id: log_message_id}, function (err, result) {
                        if (result) {
                            var now = new Date();
                            LogChatMessage.find({
                                connect_page_id: result.connect_page_id,
                                user_id: result.user_id,
                                background_flg: null,
                                error_flg: null
                            }, {}, {sort: {created_at: -1}}, function (err, results) {
                                if (err) throw err;
                                if (results) {
                                    var size = results.length;
                                    var msg_arr = [];
                                    for (var i = 0; i < size; i++) {
                                        var msg = results[i];
                                        if (msg.message_type == MESSAGE_BOT) {
                                            msg.remove();
                                        }
                                        else if (msg.message_type == MESSAGE_USER) {
                                            break;
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            });
        });

        socket.on('efo_user_send_postal', function (data) {
            searchAddressJPFromZipcode(data.zipcode, function (result) {
                result.data = data;
                socket.emit('efo_bot_send_postal', result);
            });
        });

        socket.on('efo_user_send_pref', function (data) {
            searchPrefJP(function (result) {
                var tmp = {};
                tmp.result = result;
                tmp.param = data;
                socket.emit('efo_bot_send_pref', tmp);
            });
        });

        socket.on('efo_user_send_city', function (data) {
            searchCityJP(data.pref, function (result) {
                var tmp = {};
                tmp.result = result;
                tmp.param = data;
                socket.emit('efo_bot_send_city', tmp);
            });
        });

        socket.on('disconnecting', function () {
            console.log('disconnecting');
            var rooms = Object.keys(socket.rooms);
            if (rooms) {
                rooms.forEach(function (value) {
                    socket.leave(value);
                    console.log('value', value);
                    if(!isEmpty(UserIdsArr[value])){
                        console.log(UserIdsArr);
                        delete UserIdsArr[value];
                        console.log(UserIdsArr);
                    }
                    if(!isEmpty(UserRoom[value])){
                        setUserStatus(value);
                    }
                });
            }
        });

        socket.on('join', function (data) {
            console.log("join=" ,  data);
            socket.join(data.connect_page_id);
        });

        socket.on('client_to_server_receive_message', function (data) {
            updateBotLastTime(data.connect_page_id, data.user_id);
        });

        //from cms
        socket.on('send_new_message', function (data) {
            //console.log("send_new_message");
            //console.log(data);
            var result;
            getConnectPageById(data.connect_page_id)
                .then(function (connect_page) {
                    result = connect_page;
                    return Q(UserPosition.findOne({connect_page_id: connect_page.id, user_id: data.user_id}).exec());
                })
                .then(function (resultPosition) {
                    var current_scenario_id = undefined;
                    if (resultPosition) {
                        current_scenario_id = resultPosition.scenario_id;
                    }
                    updateBotLastTime(data.connect_page_id, data.user_id);
                    var params = {};

                    if (result.sns_type == SNS_TYPE_WEBCHAT) {
                        params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id);
                        params.current_scenario_id = current_scenario_id;
                        sendMessageWebchat(params, data.data);
                    } else if (result.sns_type == SNS_TYPE_LINE) {
                        params = createParameterDefault(result.sns_type, result._id, data.user_id, result.channel_id, result.channel_access_token, current_scenario_id);
                        params.conversation_flg = 1;
                        sendMessageConversationLine(params, data.data);
                    } else {
                        params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id, result.page_access_token, current_scenario_id);
                        params.conversation_flg = 1;
                        sendMessageConversationFacebook(params, data.data);
                    }
                })
                .catch(function (err) {
                    saveException(err);
                });
        });
    });

    app.post('/webhook/chatwork', function (req, res) {
        var secret_key = req.query.secret_key;
        var data = req.body;
        //console.log(secret_key);
        //console.log(data);
        if(secret_key) {
            var webhook_event_type = data.webhook_event_type;
            //console.log("webhook_event_type=" + webhook_event_type);
            if (webhook_event_type == 'message_created' || webhook_event_type == 'mention_to_me') {
                receivedMessage(data, secret_key, SNS_TYPE_CHATWORK);
            }
            res.sendStatus(200);
        }else{
            console.error("Failed validation secret_key.");
            res.sendStatus(403);
        }
    });

    app.post('/webhook/line', function (req, res) {
        var data = req.body;
        var events = req.body.events;
        //console.log("/webhook/line");
        //console.log(events);
        var secret_key = req.query.secret_key;
        if(secret_key) {
            events.forEach(function(messagingEvent) {
                if (messagingEvent.type == 'message' ) {
                    receivedMessage(messagingEvent, secret_key, SNS_TYPE_LINE);
                }else if (messagingEvent.type == 'postback') {
                    receivedLinePostback(messagingEvent, secret_key);
                }else if (messagingEvent.type == 'follow') {
                    receivedFollowLine(messagingEvent, secret_key);
                }else if (messagingEvent.type == 'unfollow') {
                    receivedUnfollowLine(messagingEvent, secret_key);
                }
            });
            res.sendStatus(200);
        }else{
            console.error("Failed validation secret_key.");
            res.sendStatus(403);
        }
    });

    /*
     * Use your own validation token. Check that the token used in the Webhook
     * setup is the same token used here.
     *
     */
    app.get('/webhook', function(req, res) {
        //console.log(req.query['hub.mode']);
        console.log(req.query['hub.verify_token'] === VALIDATION_TOKEN);
        if(req.query['hub.mode'] === 'subscribe'){
            //console.log(req.query);
            var secret_key = req.query.secret_key;
            if (req.query['hub.verify_token'] === VALIDATION_TOKEN) {
                res.status(200).send(req.query['hub.challenge']);
            }
            else if(secret_key) {
                ConnectPage.findOne({ validate_token: secret_key, deleted_at: null}, function(err, result) {
                    if (err) throw err;
                    if (result) {
                        var page_access_token = result.my_app_flg ?  result.origin_page_access_token : result.page_access_token;

                        res.status(200).send(req.query['hub.challenge']);

                        setTimeout(function() {
                            subscribedApps(page_access_token);
                        }, 3000);

                        setTimeout(function() {
                            startButton(page_access_token);
                            if(result.greeting_message && result.greeting_message.length > 0){
                                setGreetingMessage(result.greeting_message, page_access_token);
                            }else{
                                unsetGreetingMessage(page_access_token);
                            }
                        }, 5000);
                    }else {
                        res.sendStatus(403);
                    }
                });
            }else {
                console.error("Failed validation. Make sure the validation tokens match.");
                res.sendStatus(403);
            }
        }else{
            console.error("Failed validation. Make sure the validation tokens match.");
            res.sendStatus(403);
        }
        //if (req.query['hub.mode'] === 'subscribe' &&
        //    req.query['hub.verify_token'] === VALIDATION_TOKEN) {
        //  console.log("Validating webhook");
        //  res.status(200).send(req.query['hub.challenge']);
        //} else {
        //  console.error("Failed validation. Make sure the validation tokens match.");
        //  res.sendStatus(403);
        //}
    });

    app.post('/webhook', function (req, res) {
        var data = req.body;
        var secret_key = req.query.secret_key;

        //console.log("secret_key="+secret_key);
        //console.log(data);
        // Make sure this is a page subscription
        if (data.object == 'page') {
            // Iterate over each entry
            // There may be multiple if batched
            data.entry.forEach(function(pageEntry) {
                var pageID = pageEntry.id;
                var timeOfEvent = pageEntry.time;

                // Iterate over each messaging event
                pageEntry.messaging.forEach(function(messagingEvent) {
                    //console.log(messagingEvent);
                    if (messagingEvent.optin) {
                        receivedAuthentication(messagingEvent);
                    } else if (messagingEvent.message) {
                        receivedMessage(messagingEvent, secret_key);
                    } else if (messagingEvent.delivery) {
                        receivedDeliveryConfirmation(messagingEvent);
                    } else if (messagingEvent.postback) {
                        receivedPostback(messagingEvent, secret_key);
                    } else if (messagingEvent.read) {
                        receivedMessageRead(messagingEvent, secret_key);
                    }else if (messagingEvent.account_linking) {
                        receivedAccountLink(messagingEvent);
                    }
                    else {
                        console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                    }
                });
            });

            // Assume all went well.
            //
            // You must send back a 200, within 20 seconds, to let us know you've
            // successfully received the callback. Otherwise, the request will time out.
            res.sendStatus(200);
        }
    });

    listen();
    module.exports = app;
}

var getConnectPageById = function(connect_page_id) {
    return Q.Promise(function (resolve, reject) {(ConnectPage.findOne({_id: connect_page_id, deleted_at: null}).exec())
        .then(function(result) {
            if(result){
                return resolve(result);
            }
            return reject();
        });
    });
};

var getConnectPageBySns = function(connect_page_id, sns_type) {
    return Q.Promise(function (resolve, reject) {(ConnectPage.findOne({_id: connect_page_id, sns_type: sns_type, deleted_at: null}).exec())
        .then(function(result) {
            if(result){
                return resolve(result);
            }
            return reject();
        });
    });
};

var getConnectPageByPageId = function(page_id, sns_type) {
    console.log(page_id);
    console.log(sns_type);
    return Q.Promise(function (resolve, reject) {(ConnectPage.findOne({page_id: page_id, sns_type: sns_type, deleted_at: null}).exec())
        .then(function(result) {
            console.log(result);
            if(result){
                return resolve(result);
            }
            return reject(result);
        });
    });
};

var getConnectPageBySecretKey = function(secret_key, sns_type) {
    return Q.Promise(function (resolve, reject) {(ConnectPage.findOne({validate_token: secret_key, sns_type: sns_type, deleted_at: null}).exec())
        .then(function(result) {
            if(result){
                return resolve(result);
            }
            return reject(result);
        });
    });
};

var redisPublicMessage = function(row){
    console.log("redisPublicMessage=");
    console.log(row);
    var new_position = 0;
    var scenarioResult;
    var botResult;
    var userProfileResult;
    return Q.Promise(function (resolve, reject) {
        Scenario.findOne({_id: row.scenario_id, connect_page_id: row.connect_page_id, deleted_at: null}).exec()
            .then(function (result) {
                if (result) {
                    scenarioResult = result;
                    return Q(BotMessage.find({
                        scenario_id: result.id,
                        message_type: MESSAGE_BOT,
                        position: {$gte: new_position}
                    }, {}, {sort: {position: 1}}).exec())
                }
                return reject();
            })
            .then(function (result) {
                if (result) {
                    botResult = result;
                    if(row.sns_type == SNS_TYPE_LINE){
                        return Q(UserProfile.find({connect_page_id: row.connect_page_id, unfollow_at: null}).exec());
                    }
                    return Q(UserProfile.find({connect_page_id: row.connect_page_id}).exec());
                }
                return reject();
            })
            .then(function (result) {
                if(result && result.length > 0){
                    userProfileResult = result;
                    return Q(Variable.find({connect_page_id: row.connect_page_id}).exec())
                }
                return reject();
            })
            .then(function (variableResult) {
                var variable_id_arr = [];
                if (variableResult && variableResult.length > 0) {
                    for (var i = 0, size = variableResult.length; i < size; i++) {
                        variable_id_arr.push(variableResult[i]._id);
                    }
                }
                return {connect_page_id: row.connect_page_id, userProfileArr: userProfileResult, variableArr: variable_id_arr};
            })
            .then(getAllVariableValueNew)
            .then(function (result) {
                if(result && result.length > 0){
                    sendBroadcastMessage(row, scenarioResult, botResult, result);
                    return resolve(result);
                }
                return reject();
            });
    });

};

function setPushMessageLine(row){
    Scenario.findOne({_id: row.scenario_id, connect_page_id: row.connect_page_id, deleted_at: null}, function(err, result) {
        if(result){
            var new_position = 0;
            BotMessage.find({scenario_id: result.id, message_type: MESSAGE_BOT, position: {$gte: new_position}}, {}, {sort: {position: 1}}, function(err, result) {
                if(result && result.length > 0 && result[0].position == new_position){
                    //sendBroadcastMessage(row, scenarioResult, botResult, result);
                    var system_param = createParameterDefault(row.sns_type, row.connect_page_id, [], row.page_id, row.page_access_token, row.scenario_id, row.notification_id);
                    var now = new Date();
                    system_param.push_time = now.getTime();
                    sendPushMultiMessageLine(system_param, result, 0, [], function (msg) {
                        if(msg.length > 0){
                            getLineUserProfileLimit(system_param, msg, 0);
                        }
                    });
                }
            });
        }
    });
}

function getLineUserProfileLimit(params, send_message, index){
    var limit = LINE_PUSH_MESSAGE_USER_LIMIT;

    console.log("skip=" + (index * limit));

    //UserProfile.find({connect_page_id: "59d751f1059408e48a0a3adb", unfollow_at: null})
    //    .select('user_id')
    //    .limit(limit)
    //    .skip(index * limit)
    //    .sort({
    //        user_id: 'asc'
    //    })
    //    .exec(function(err, result) {
    //        var user_list = [];
    //        if(result && result.length > 0){
    //            result.forEach(function (user_profile) {
    //                user_list.push(user_profile.user_id);
    //            });
    //            params.user_id = user_list;
    //            saveNotificationHistory(params.connect_page_id, params.page_id, params.notification_id, send_message, user_list, user_list.length);
    //            //sendMessage(params, USER_TYPE_TEXT,  send_message);
    //            getLineUserProfileLimit(params, send_message, ++index);
    //        }
    //    });

    UserProfile.find({connect_page_id: params.connect_page_id, unfollow_at: null}, 'user_id', {sort: {user_id: 1}, skip: index * limit, limit: limit}, function(err, result){
        var user_list = [];
        if(result && result.length > 0){
            result.forEach(function (user_profile) {
                user_list.push(user_profile.user_id);
            });
            params.user_id = user_list;
            saveNotificationHistory(params.connect_page_id, params.page_id, params.notification_id, send_message, user_list, user_list.length, params.push_time);
            sendMessage(params, USER_TYPE_TEXT,  send_message);
            setTimeout(function() {
                getLineUserProfileLimit(params, send_message, ++index);
            }, 500);
        }
    });
}

function sendBroadcastMessage(row, scenarioResult, botResult, userProfileResult){
    console.log("sendBroadcastMessage");
    var filter = ((typeof row.notification_filter !== 'undefined') ? row.notification_filter : []);
    var filter_user_profile = [];
    if(!(filter instanceof Array) || filter.length == 0){
        filter_user_profile = userProfileResult;
    }else{
        userProfileResult.forEach(function (user_profile) {
            var default_value_cnt = filter.length;
            var match_value_cnt = 0;
            filter.forEach(function (filter_row) {
                var variable = filter_row.condition;
                var variable_value = filter_row.value;
                var compare = filter_row.compare;
                if (filter_variable.indexOf(variable) > -1 && (typeof user_profile[variable] !== 'undefined') ) {
                    if((compare == "is" && user_profile[variable] == variable_value) || (compare == "isNot" && user_profile[variable] != variable_value)){
                        match_value_cnt++;
                    }
                }else if(typeof user_profile[variable] === 'undefined'){
                    if((compare == "is" && variable_value.length == 0) || (compare == "isNot" && variable_value.length > 0)){
                        match_value_cnt++;
                    }
                }else  if(typeof user_profile[variable] !== 'undefined'){
                    if((compare == "is" && user_profile[variable] == variable_value) || (compare == "isNot" && user_profile[variable] != variable_value)){
                        match_value_cnt++;
                    }
                }
            });
            if(match_value_cnt == default_value_cnt){
                filter_user_profile.push(user_profile);
            }
        });
    }
    var user_list = [];
    filter_user_profile.forEach(function (user_profile) {
        user_list.push(user_profile.user_id);
    });

    var now = new Date();
    saveNotificationHistory(row.connect_page_id, row.page_id, row.notification_id, botResult, user_list, filter_user_profile.length, now.getTime());
    if(user_list.length < 1) return;

    if(row.sns_type == SNS_TYPE_LINE){
        //user_list =  [ 'Uf5d367f64e5fb0aed6373ec17588e4ae', 'U2dc367b901366f38f756554cb6d82d30'];
        //
        //var system_param = createParameterDefault(row.sns_type, row.connect_page_id, user_list, row.page_id, row.page_access_token, row.scenario_id, row.notification_id);
        //sendMultiMessageLine(system_param, botResult, 0);
    }else{
        filter_user_profile.forEach(function (user_profile) {
            var system_param = createParameterDefault(row.sns_type, row.connect_page_id, user_profile.user_id, row.page_id, row.page_access_token, row.scenario_id, row.notification_id);
            sendMultiMessage(system_param, botResult, 0);
        });
    }

}
var getLogChatMessage = function(connect_page_id) {
    return Q.Promise(function (resolve, reject) {
        (Menu.find({connect_page_id: connect_page_id, parent_id: ""}).exec())
            .then(function (menu_mains) {
                var result = {};
                if (menu_mains && menu_mains.length) {
                    var data = [];
                    menu_mains.forEach(function (menu_main) {
                        var tmp_main = generateDataMenu(menu_main);
                        data.push(tmp_main);
                    });
                    result = {
                        "persistent_menu": [
                            {
                                "locale": "default",
                                "composer_input_disabled": true,
                                "call_to_actions": data
                            }
                        ]
                    };
                }
                return resolve(result);
            });
    });
};

function efoAfterClickNext(params){
    var logEfoCvCollection = params.logEfoCvCollection;
    if(!logEfoCvCollection){
        logEfoCvCollection = CreateModelEfoCvForName(params.connect_page_id + "_efo_cvs");
    }

    logEfoCvCollection.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
        if (err) throw err;
        if(result){
            var current_scenario_id = result.scenario_id;
            var current_position =  result.position;
            params.current_scenario_id = current_scenario_id;
            //saveEfoUserPosition(params);
            Scenario.findOne({_id: current_scenario_id, connect_page_id: result.connect_page_id, deleted_at: null }, function(err, result) {
                if (err) throw err;
                if(result){
                    var new_position = current_position + 1;
                    BotMessage.find({scenario_id: result._id, position: {$lt: new_position }}, {}, {sort: {position: 1}}, function(err, result1) {
                        if (err) throw err;
                        params.old_bot_message = result1;
                        BotMessage.find({scenario_id: result._id, position: {$gte: new_position }}, {}, {sort: {position: 1}}, function(err, result) {
                            if (err) throw err;
                            if(result && result.length >0 && result[0].position == new_position){
                                sendMultiMessageEfo(params, result);
                            }
                        });
                    });
                }
            });
        }
    });
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 *
 */
function receivedAccountLink(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;

    var status = event.account_linking.status;
    var authCode = event.account_linking.authorization_code;

    console.log("Received account link event with for user %d with status %s " +
        "and auth code %s ", senderID, status, authCode);
}

var digest = function(value){
    var secret = decode("GG1ThyNt8N0gJvGgGhpfwuRCitJ92Nezph0lBhef9Cs=");
    var crypto = require('crypto');
    var hash = crypto.createHmac('SHA256', secret).update(value).digest('base64');
    return hash;
};

var encode = function(value){
    var buffer = new Buffer(value);
    var encoded = buffer.toString('base64');
    return encoded;
};

var decode = function(value){
    var buffer = new Buffer(value, 'base64');
    return buffer;
};

function verifyRequestSignature(req, res, buf) {
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

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
      "through param '%s' at %d", senderID, recipientID, passThroughParam,
      timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  //sendTextMessage(senderID, "Authentication successful");
}

function receivedFollowLine(event, secret_key){
    ConnectPage.findOne({validate_token: secret_key, deleted_at: null}, function (err, result) {
        if (err) throw err;
        if (result) {
            var page_access_token = result.channel_access_token;
            var replyToken = event.replyToken;
            var token = replyToken + ":" + page_access_token;
            var connect_page_id = result._id;
            var connect_id = result.connect_id;
            var user_chat_id = event.source.userId;
            var system_param = createParameterDefault(result.sns_type, result._id, event.source.userId, result.channel_id, token);
            checkLimitUserChat(connect_page_id, result.sns_type, user_chat_id, function (result_check, user) {
                //console.log(result_check);
                if(result_check){
                    getStartScenarioId(system_param, function (start_scenario_id) {
                        system_param.current_scenario_id = start_scenario_id;
                        saveLogChatMessage(system_param, MESSAGE_USER_PAYLOAD, USER_TYPE, 'Follow', event.timestamp, event.type);
                        saveUserLineProfile(system_param, page_access_token);
                    });
                    //setTimeout(function() {
                    //    getStartScenario(system_param);
                    //}, 1500);
                } else {
                    sendMessageLimit(system_param, user);
                }
            });
        }
    });
}

function receivedUnfollowLine(event, secret_key){
    ConnectPage.findOne({validate_token: secret_key, deleted_at: null}, function (err, result) {
        if (err) throw err;
        if (result) {
            var params = createParameterDefault(result.sns_type, result._id, event.source.userId, result.channel_id);
            saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, 'Unfollow', event.timestamp, event.type);
            UserProfile.findOneAndUpdate({ connect_page_id: params.connect_page_id, user_id: params.user_id}, { $set: {unfollow_at: event.timestamp, last_active_at: event.timestamp, updated_at: new Date(), profile_pic: ""}}, { upsert: false }, function(err, result) {
                if (err) throw err;
                if(result){
                    NotificationHistory.update({ connect_page_id: result.connect_page_id, 'user_list' : [result.user_id], time_of_message : { $gte: result.last_active_at } }, { $inc: {read_count: 1} },
                        { upsert: false, multi: true }, function(err) {
                        });
                }
            });
        }
    });
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message'
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've
 * created. If we receive a message with an attachment (image, video, audio),
 * then we'll simply confirm that we've received the attachment.
 *
 */
function receivedMessage(event, secret_key, type) {
    if(type == SNS_TYPE_CHATWORK){
        ConnectPage.findOne({validate_token: secret_key, deleted_at: null}, function (err, result) {
            if (err) throw err;
            if (result) {
                var webhook_event = event.webhook_event;
                var bot_account_id = result.chatwork_account_id;
                var account_id = webhook_event.account_id;
                var webhook_event_type = event.webhook_event_type;
                var messageText = webhook_event.body;
                var timeOfMessage = webhook_event.send_time;
                var sns_type = result.sns_type;
                var page_access_token = result.channel_access_token;
                var connect_page_id = result._id;
                var room_id = webhook_event.room_id;
                var message_id = webhook_event.message_id;
                var from_account_id = undefined;

                var params = createParameterDefault(sns_type, connect_page_id, account_id, room_id, page_access_token);
                params.message_id = message_id;
                params.messageTextLower = messageText.toLowerCase();
                params.list_option = result.list_option;

                params.from_account_id = account_id;
                if(webhook_event_type == "mention_to_me"){
                    from_account_id = webhook_event.from_account_id;
                    account_id = webhook_event.to_account_id;
                    params.from_account_id = from_account_id;
                    params.user_id = account_id;
                }else if(bot_account_id == account_id){
                    saveLogChatMessage(params, webhook_event_type , BOT_TYPE, messageText, timeOfMessage);
                    return;
                }

                //console.log("messageText=" + messageText);
                //console.log("account_id=" + account_id);
                //console.log("room_id=" + room_id);
                //console.log("timeOfMessage=" + timeOfMessage);
                //console.log(params);

                RoomList.findOne({connect_page_id: connect_page_id, room_id: room_id}, function(err, result) {
                    if (err) throw err;
                    //console.log("UserPosition");
                    //console.log(result);
                    if(result){
                        params.current_scenario_id = result.scenario_id;
                        saveLogChatMessage(params, webhook_event_type , USER_TYPE, messageText, timeOfMessage);
                        receivedTextMessage(params, messageText);
                    }else{
                        saveLogChatMessage(params, webhook_event_type , USER_TYPE, messageText, timeOfMessage);
                        getStartScenarioId(params, function (start_scenario_id) {
                            params.current_scenario_id = start_scenario_id;
                            var now = new Date();
                            var roomList = new RoomList({
                                connect_page_id: params.connect_page_id,
                                room_id: params.page_id,
                                to_account_id: params.user_id,
                                from_account_id: params.from_account_id,
                                scenario_id: params.current_scenario_id,
                                position: -1,
                                created_at : now,
                                updated_at : now
                            });
                            roomList.save(function(err) {
                                if (err) throw err;
                                getChatworkMember(params);
                                //console.log("323232");
                                //connectScenario(params);
                                if(!mongoose.Types.ObjectId.isValid(params.current_scenario_id)){
                                    var messageTextLower = messageText.toLowerCase();
                                }else{
                                    connectScenario(params);
                                }
                                //io.to(params.connect_page_id).emit('receive_new_user', userProfile);
                                //setTimeout(function() {
                                //    receivedTextMessage(system_param, messageText);
                                //}, 2000);
                            });

                        });
                        //saveUserLineProfile(system_param, page_access_token);
                        //getStartScenario(system_param);
                    }
                });
            }
        });
    }
    else if(type == SNS_TYPE_LINE){
        ConnectPage.findOne({validate_token: secret_key, deleted_at: null}, function (err, result) {
            if (err) throw err;
            if (result) {
                var sns_type = result.sns_type;
                var page_access_token = result.channel_access_token;
                var connect_page_id = result._id;
                var message = event.message;
                var senderID = event.source.userId;
                var recipientID = result.channel_id;
                var messageText = message.text;
                var timeOfMessage = event.timestamp;
                var replyToken = event.replyToken;
                var token = replyToken + ":" + page_access_token;
                var line_user_type = message.type;
                var system_param = createParameterDefault(sns_type, connect_page_id, senderID, recipientID, token);
                system_param.user_said = messageText;
                checkLimitUserChat(connect_page_id, sns_type, senderID, function (result_check, user) {
                    if (err) throw err;
                    if (result_check) {
                        if(messageText){
                            UserPosition.findOne({connect_page_id: connect_page_id, user_id: senderID}, function(err, result) {
                                if (err) throw err;
                                //console.log("UserPosition");
                                //console.log(result);
                                if(result){
                                    system_param.current_scenario_id = result.scenario_id;
                                    if (line_user_variable.indexOf(line_user_type) > -1){
                                        saveLogChatMessage(system_param, eval("LINE_USER_" +  line_user_type.toUpperCase()), USER_TYPE, message, timeOfMessage);
                                    }
                                    updateNotification(system_param);
                                    receivedTextMessage(system_param, messageText);
                                }else{
                                    getStartScenarioId(system_param, function (start_scenario_id) {
                                        system_param.current_scenario_id = start_scenario_id;
                                        saveUserLineProfile(system_param, page_access_token);
                                        setTimeout(function() {
                                            receivedTextMessage(system_param, messageText);
                                        }, 2000);
                                    });
                                    //saveUserLineProfile(system_param, page_access_token);
                                    //getStartScenario(system_param);
                                }
                            });
                        }
                    } else {
                        sendMessageLimit(system_param, user);
                    }
                });
            }
        });
    }else{
        var senderID = event.sender.id.toString();
        var recipientID = event.recipient.id.toString();
        var timeOfMessage = event.timestamp;
        var message = event.message;
        //console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
        //console.log("ConnectPage");
        //console.log(recipientID);
        ConnectPage.findOne({page_id: recipientID, sns_type: SNS_TYPE_FACEBOOK, deleted_at: null}, function(err, result) {
            if (err) throw err;
            if (result && (secret_key == result.validate_token || secret_key == VALIDATION_TOKEN)){
                var page_access_token = result.my_app_flg ?  result.origin_page_access_token : result.page_access_token;
                var connect_page_id = result._id;
                var params = createParameterDefault(result.sns_type, result._id, senderID, recipientID, page_access_token);
                var isEcho = message.is_echo;
                var messageId = message.mid;
                var appId = message.app_id;
                var metadata = message.metadata;

                // You may get a text or attachment but not both
                var messageText = message.text;
                var messageAttachments = message.attachments;
                var quickReply = message.quick_reply;
                params.user_said = messageText;
                checkLimitUserChat(connect_page_id, result.sns_type, senderID, function (result_check, user) {
                    if (err) throw err;
                    if (result_check) {
                        UserPosition.findOne({connect_page_id: connect_page_id, user_id: senderID}, function(err, result) {
                            if (err) throw err;
                            if(result){
                                params.current_scenario_id = result.scenario_id;
                            }
                            if (isEcho) {
                                // Just logging message echoes to console
                                console.log("Received echo for message %s and app %d with metadata %s",
                                    messageId, appId, metadata);
                            }else if (quickReply) {
                                var quickReplyPayload = quickReply.payload;
                                if(quickReplyPayload){
                                    //console.log(messageText);
                                    //console.log(quickReplyPayload);
                                    saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, messageText, timeOfMessage, quickReplyPayload);
                                    var quick_replies_index = quickReplyPayload.indexOf("QUICK_REPLIES_");
                                    var keyword_matching_flg = 0;
                                    if(quick_replies_index > -1){
                                        var current_payload = quickReplyPayload.replace( /QUICK_REPLIES_/g , "");
                                        var arr_index = current_payload.split("_");
                                        var variable_value = messageText;
                                        //console.log(arr_index);
                                        if(arr_index[2] !== undefined && arr_index[2]){
                                            variable_value = decodeBase64(arr_index[2]);
                                        }
                                        if(arr_index[1] !== undefined && parseInt(arr_index[1]) != -1){
                                            //saveCarouselToVariable(params, arr_index[1], messageText);
                                            saveQuickReplyToVariable(params, arr_index[1], variable_value);
                                        }
                                        if(arr_index[0] !== undefined && parseInt(arr_index[0]) != -1){
                                            params.current_scenario_id = arr_index[0];
                                            connectScenario(params);
                                            return;
                                        }
                                        if(arr_index[3] !== undefined && parseInt(arr_index[3]) == 1){
                                            keyword_matching_flg = 1;
                                        }
                                    }
                                    quickRepliesAfterClickButton(params, messageText, keyword_matching_flg);
                                }
                            }else if (messageText) {
                                if(result){
                                    saveLogChatMessage(params, MESSAGE_USER_TEXT, USER_TYPE, messageText, timeOfMessage);
                                    receivedTextMessage(params, messageText);
                                }else{
                                    saveLogChatMessage(params, MESSAGE_USER_TEXT, USER_TYPE, messageText, timeOfMessage);
                                    params.payload = "GET_STARTED_PAYLOAD";
                                    getStartScenarioId(params, function (start_scenario_id) {
                                        params.current_scenario_id = start_scenario_id;
                                        saveUserProfile(params);
                                        setTimeout(function() {
                                            receivedTextMessage(params, messageText);
                                        }, 2000);
                                    });
                                    //newUserProfile(params);
                                    //setTimeout(function() {
                                    //    receivedTextMessage(params, messageText);
                                    //}, 2200);
                                }
                            }else if (messageAttachments) {
                                saveLogChatMessage(params, MESSAGE_USER_ATTACHMENT, USER_TYPE, messageAttachments, timeOfMessage);
                                if(messageAttachments[0] && messageAttachments[0].type == "location"){
                                    var coordinates = messageAttachments[0].payload.coordinates;
                                    saveUserCoordinates(params, coordinates);
                                }
                            }
                        });
                    } else {
                        sendMessageLimit(params, user);
                    }
                });
            }
        });
    }
  //console.log("Received message for user %d and page %d at %d with message:",
  //    senderID, recipientID, timeOfMessage);
  //console.log(JSON.stringify(message));
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

function receivedTextMessage(params, messageText){
    var messageTextLower = messageText.toLowerCase();
    params.user_said = undefined;
    getAllVariableValue(params, function (err, result1) {
        params.user_variable = result1.variable_result;
        params.preview_flg = result1.preview_flg;
        var userPosition = UserPosition;
        var request_params = { connect_page_id: params.connect_page_id, user_id: params.user_id};

        if(params.sns_type == SNS_TYPE_CHATWORK){
            userPosition = RoomList;
            request_params = { connect_page_id: params.connect_page_id, room_id: params.page_id};
        }
        userPosition.findOne(request_params, function(err, user_position) {
            if (err) throw err;
            //console.log("UserPosition2");
            //console.log(user_position);
            if(user_position){
                var current_scenario_id = user_position.scenario_id.toString();
                var current_position =  user_position.position;
                //var slot_id = user_position.slot_id;
                //if(slot_id && mongoose.Types.ObjectId.isValid(slot_id)){
                //    console.log("slot_id");
                //    return true;
                //}
                params.current_scenario_id = current_scenario_id;
                if(!mongoose.Types.ObjectId.isValid(current_scenario_id)){
                    //console.log("allDialogLibrary");
                    return true;
                }
                Scenario.findOne({_id: current_scenario_id, connect_page_id: user_position.connect_page_id, deleted_at: null}, function(err, result) {
                    if (err) throw err;
                    //console.log(result);
                    if(result){
                        BotMessage.findOne({ scenario_id: result._id, message_type: MESSAGE_USER, position: current_position + 1}, function(err, result) {
                            if (err) throw err;
                            //console.log("user talk");
                            //console.log(result);
                            if(result && result.data){
                                params.variable_id = result.data[0].variable_id;
                                params.nlp_id = result.data[0].nlp_id;
                                params.current_user_position = user_position;
                            }else{
                                //console.log("no botmessage");
                                scenarioDialogLibrary(params, messageTextLower, scenario_library_arr);
                                return true;
                            }
                        });
                        return true;
                    }
                    allDialogLibrary(params, messageTextLower);
                    return true;
                });
            }else{
                allDialogLibrary(params, messageTextLower);
            }
        });
    });
}

function userVariableSettingApi(params, messageText){
    saveUserSpeechVariable(params, messageText, function (err) {
        getAllVariableValue(params, function (err, user_variable) {
            params.user_variable = user_variable;
            getApiConnect(params, params.api_id);
        });
    });
}

function getMaxLength(arr){
  var max = -10000;
  var tmp = null;
  arr.forEach(function (value) {
    ////console.log(value);
    if ( max < value.length) {
      max =  value.length;
      tmp = value;
    }
  });
  return tmp;
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
function receivedPostback(event, secret_key) {
  var senderID = event.sender.id.toString();
  var recipientID = event.recipient.id.toString();
  var timeOfPostback = event.timestamp;
  var referral = event.postback.referral;
  console.log("referral");
  console.log(referral);
  ////console.log(event);
  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;
  //console.log(event.postback);


  if(payload) {
      ConnectPage.findOne({page_id: recipientID, sns_type: SNS_TYPE_FACEBOOK, deleted_at: null}, function (err, result) {
          if (err) throw err;
          if (result && (secret_key == result.validate_token || secret_key == VALIDATION_TOKEN)){
              var start_message = result.start_message;
              var page_access_token = result.my_app_flg ? result.origin_page_access_token : result.page_access_token;
              var sns_type = result.sns_type;
              var connect_id = result.connect_id;
              var connect_page_id = result._id;
              var params = createParameterDefault(result.sns_type, result._id, senderID, recipientID, page_access_token);
              checkLimitUserChat(connect_page_id, result.sns_type, senderID, function (result_check, user) {
                  if (err) throw err;
                  if (result_check) {
                      UserPosition.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
                          if (err) throw err;
                          switch (payload) {
                              case 'GET_STARTED_PAYLOAD':
                                  console.log("GET_STARTED_PAYLOAD");
                                  getStartScenarioId(params, function (start_scenario_id) {
                                      params.payload = payload;
                                      params.current_scenario_id = start_scenario_id;
                                      saveUserPosition(params, -1);
                                      saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, 'Start', timeOfPostback, payload);
                                      saveUserProfile(params, referral);
                                  });
                                  //params.current_scenario_id = '';
                                  //saveUserPosition(params, -1);
                                  //params.payload = payload;
                                  //saveUserProfile(params, referral);
                                  //if (typeof start_message !== "undefined" && start_message) {
                                  //    var answer = convertTextMessage(sns_type, start_message);
                                  //    sendMessage(params, USER_TYPE_TEXT, answer);
                                  //}
                                  break;
                              default:
                                  //console.log(result);
                                  if(result){
                                      params.current_scenario_id = result.scenario_id;
                                  } else {
                                      saveUserProfile(params, referral);
                                  }
                                  var scenario_index1 = payload.indexOf("MENU_SCENARIO_");
                                  var scenario_index2 = payload.indexOf("SCENARIO_");
                                  var current_scenario_id = null;
                                  var arr  = [];
                                  var new_payload = '';
                                  if (scenario_index1 > -1) {
                                      new_payload = payload.replace(/MENU_SCENARIO_/g, "");
                                      arr = new_payload.split("_");
                                      if(arr.length == 2){
                                          current_scenario_id = arr[0];
                                          params.payload_value = arr[1];
                                      }
                                  } else if (scenario_index2 > -1) {
                                      new_payload = payload.replace(/SCENARIO_/g, "");
                                      arr = new_payload.split("_");
                                      current_scenario_id = arr[0];
                                      if(arr.length == 2){
                                          params.payload_value = arr[1];
                                      }else if(arr.length == 3){
                                          var tmp_variable = arr[1];
                                          params.payload_value = decodeBase64(arr[2]);
                                          if(parseInt(tmp_variable) != -1){
                                              saveQuickReplyToVariable(params, tmp_variable, params.payload_value);
                                          }
                                      }else if(arr.length == 4){
                                          var item_variable = arr[1];
                                          var item_id = arr[2];
                                          params.payload_value = arr[3];
                                          saveCarouselToVariable(params, item_variable, item_id);
                                      }
                                  }
                                  saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, params.payload_value, timeOfPostback, payload);
                                  //console.log("current_scenario_id  = " + current_scenario_id);
                                  if (current_scenario_id) {
                                      params.current_scenario_id = current_scenario_id;
                                      connectScenario(params);
                                  }
                              //sendTextMessage(senderID, "Postback called");
                          }
                      });
                  } else {
                      sendMessageLimit(params, user);
                  }
              });
          }
      });
  }
  console.log("Received postback for user %d and page %d with payload '%s' " +
      "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
}

function receivedLinePostback(event, secret_key) {
    ConnectPage.findOne({validate_token: secret_key, deleted_at: null}, function (err, result) {
        if (err) throw err;
        if (result) {
            var page_access_token = result.channel_access_token;
            var payload = event.postback.data;
            var timeOfMessage = event.timestamp;
            var replyToken = event.replyToken;
            var token = replyToken + ":" + page_access_token;
            if(payload){
                var params = createParameterDefault(result.sns_type, result._id, event.source.userId, result.channel_id, token);
                UserPosition.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
                    if(result){
                        params.current_scenario_id = result.scenario_id;
                        var scenario_index = payload.indexOf("SCENARIO_");
                        var timeout = 100;

                        var arr_index  = [];
                        var new_payload = '';
                        if(scenario_index > -1) {
                            new_payload = payload.replace(/SCENARIO_/g , "");
                            arr_index = new_payload.split("_");
                        }
                        var variable_value = "";
                        if(arr_index[2] !== undefined && arr_index[2]){
                            variable_value = decodeBase64(arr_index[2]);
                            var payload_message  =  {
                                text: variable_value,
                                type: "text"
                            };
                            saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, payload_message, timeOfMessage, payload);
                        }

                        if(arr_index[0] !== undefined && parseInt(arr_index[0]) != -1){
                            params.current_scenario_id = arr_index[0];
                        }

                        if(arr_index[1] !== undefined && parseInt(arr_index[1]) != -1){
                            saveQuickReplyToVariableNew(params, arr_index[1], variable_value, function (err) {
                                connectScenario(params);
                            });
                        }else{
                            connectScenario(params);
                        }
                        updateNotification(params);
                    }
                });
            }
        }
    });
}

function validConnectPageIdEfo(data, callback){
    var connect_page_id = data.connect_page_id;
    data.server_url = SERVER_URL;
    data.app_url = APP_URL;
    if(!connect_page_id || !mongoose.Types.ObjectId.isValid(connect_page_id)){
        data.success = 0;
        io.to(data.user_id).emit('efo_status_join', data);
        return callback(true);
    }
    ConnectPage.findOne({_id: connect_page_id, deleted_at: null}, function (err, result) {
        if (!err && result) {
            data.connect_id = result.connect_id;
            var logEfoCvCollection = CreateModelEfoCvForName(connect_page_id + "_efo_cvs");

            logEfoCvCollection.findOne({connect_page_id: connect_page_id, user_id: data.user_id}, function(err, resultPosition) {
                if (!err){
                    var current_scenario_id = undefined;

                    var params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id);
                    if(resultPosition){
                        current_scenario_id = resultPosition.scenario_id;
                        params.log_order_id = resultPosition._id;
                    }
                    params.logEfoCvCollection = logEfoCvCollection;
                    params.current_url = data.current_url;
                    params.language = data.language;
                    params.current_scenario_id = current_scenario_id;
                    params.preview_flg = data.preview_flg;
                    params.scenario_type = result.scenario_type;
                    params.connect_id = result.connect_id;
                    params.lang = result.setting.lang;
                    if(params.scenario_type == "001"){
                        CrdPayment.getPaymentGateway(params, function (error, result) {
                            if(error){
                                data.cart_error_message = result.msg;
                            }
                            return callback(false, data, params);
                        });
                    }else{
                        return callback(false, data, params);
                    }
                }else{
                    data.success = 0;
                    io.to(data.user_id).emit('efo_status_join', data);
                    return callback(true);
                }
            });
        }else{
            data.success = 0;
            io.to(data.user_id).emit('efo_status_join', data);
            return callback(true);
        }
    });
}

function validConnectPageId(data, callback){
    var connect_page_id = data.connect_page_id;
    if(!connect_page_id || !mongoose.Types.ObjectId.isValid(connect_page_id)){
        data.success = 0;
        io.to(data.user_id).emit('webchat_status_join', data);
        return callback(true);
    }
    ConnectPage.findOne({_id: connect_page_id, deleted_at: null}, function (err, result) {
        if (!err && result) {
            data.connect_id = result.connect_id;
            UserPosition.findOne({connect_page_id: connect_page_id, user_id: data.user_id}, function(err, resultPosition) {
                if (!err){
                    var current_scenario_id = undefined;
                    if(resultPosition){
                        current_scenario_id = resultPosition.scenario_id;
                    }
                    var params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id);
                    params.current_url = data.current_url;
                    params.language = data.language;
                    params.current_scenario_id = current_scenario_id;
                    params.list_option = result.list_option;
                    params.preview_flg = data.preview_flg;
                    return callback(false, data, params);
                }else{
                    data.success = 0;
                    io.to(data.user_id).emit('webchat_status_join', data);
                    return callback(true);
                }
            });
        }else{
            data.success = 0;
            io.to(data.user_id).emit('webchat_status_join', data);
            return callback(true);
        }
    });
}

function validRoom(data, callback){
    var room_id = data.room_id;
    var user_id = data.user_id;
    var room_type = data.room_type;
    var member = data.member;
    var room_type_arr = [ROOM_TYPE_ONE_MANY, ROOM_TYPE_ONE_ONE];
    console.log('validRoom');
    if(!user_id || !mongoose.Types.ObjectId.isValid(user_id)){
        data.success = 0;
        data.message = 'message.user_id_validate';
        console.log('user_id_validate');
        io.to(user_id).emit('status_join_room', data);
        return callback(true);
    }
    if(room_id){
        var query = {_id: room_id, room_type: room_type, deleted_at: null};
    }else {
        if (!room_type || !room_type_arr.indexOf(room_type)) {
            data.success = 0;
            data.message = 'message.room_type_validate';
            io.to(user_id).emit('status_join_room', data);
            console.log('room_type_validate');
            return callback(true);
        } else if (!member || !(member instanceof Array) || (room_type == ROOM_TYPE_ONE_ONE && member.length != 2)) {
            data.success = 0;
            data.message = 'message.member_validate_1';
            console.log('member_validate_1');
            io.to(user_id).emit('status_join_room', data);
            return callback(true);
        }
        var query = {member: {$all : member, $size : 2},room_type: room_type, deleted_at: null}
    }
    console.log('validRoom find user', data);
    User.findOne({_id: user_id, deleted_at: null}, function (err, result) {
        console.log('validRoom find user ', err, result);
        var params = createParameterDefault(room_type, undefined, data.user_id, member);
        if(err || !result){
            data.success = false;
            data.message = "message.user_not_exsits";
            io.to(user_id).emit('status_join_room', data);
            console.log('user_not_exsits');
            return callback(true);
        }
        var user = result;
        if(room_type == ROOM_TYPE_ONE_ONE){
            var u1 = member[0];
            var u2 = member[1];
            var contact = user.contact != void 0 ? user.contact : [];
            //console.log(user._id, result._id, contact, u1, contact.indexOf(u2), u2, contact.indexOf(u1));
            console.log('---------------', user);
            console.log('user.authority: ', user.authority , USER_AUTHORITY_SUPER_ADMIN);
            console.log('query', query);
            Room.findOne(query, function (err, result) {
                if (!err && result) {
                    // nếu room đã tồn tại và đã share key
                    var room_id = result._id;
                    updateUserRoom(room_id, member);
                    console.log('user in room', UserRoom[room_id]);
                    if(result.share_key_flag){
                        console.log('room: '. room_id, ' da share key');
                        params.room_id = room_id;
                        console.log('room true', result);
                        return callback(false, data, params);
                    }else{
                    // nếu chưa share key => check member có online hết ko
                        var current_room_id = room_id;
                        var user_room = getUserRoomKey(room_id);
                        var check_user_key = checkUserRoomOnline(current_room_id);
                        if(check_user_key){
                        // share key
                            console.log('room: ', room_id, ' vua share key');
                            io.to(room_id).emit('user_share_key', user_room);
                            // update share key flg cho user
                            result.share_key_flag = true;
                            result.save();
                            deleteAllUserInRoom(room_id);
                            return callback(false, data, params);
                        }else{
                            var message = {
                               message: "user chua share key",
                                success: false
                            };
                            for(var i = 0; i < member.length; i++){
                                io.to(member[i]).emit('status_join_room', message);
                            }
                            return callback(true, data, params);
                        }
                    }
                }else if(user.authority == USER_AUTHORITY_SUPER_ADMIN || (contact instanceof Array  && contact.length > 0 &&
                        ((u1 == user._id && contact.indexOf(u2) >= 0) ||( u2 == user._id && contact.indexOf(u1) >= 0)))){
                    var now = new Date();
                    var roomStore = new Room({
                        name: member.join('_'),
                        user_id: user_id,
                        member: member,
                        room_type: room_type,
                        share_key_flag: false,
                        created_at : now,
                        updated_at : now
                    });
                    roomStore.save(function(err, roomStore) {
                        if (err) throw err;
                        console.log('room true store');
                        var current_room_id = roomStore._id;
                        params.room_id = roomStore._id;

                        updateUserRoom(current_room_id, member);
                        var check_user_key = checkUserRoomOnline(current_room_id);
                        if(check_user_key){
                            // share key
                            result.share_key_flag = true;
                            result.save();
                            io.to(room_id).emit('user_share_key', user_room);
                            deleteAllUserInRoom(current_room_id);
                            return callback(false, data, params);
                        }else{
                            var message = {
                                message: "user chua share key",
                                success: false
                            };
                            for(var i = 0; i < member.length; i++){
                                io.to(member[i]).emit('status_join_room', message);
                            };
                            return callback(true, data, params);
                        }

                        return callback(false, data, params);
                    });
                }else {
                    console.log('member_validate_2');
                    data.success = 0;
                    data.message = 'message.member_validate_2';
                    io.to(user_id).emit('status_join_room', data);
                    return callback(true);
                }
            });
        }else{
            Room.findOne(query, function (err, result) {
                if (!err && result) {
                    if(result.share_key_flag){
                        params.room_id = result._id;
                        updateUserRoom(result._id, member);
                        console.log('room true', result);
                        return callback(false, data, params);
                    }else{
                        var check_user_key = checkUserRoomOnline(room_id);
                        if(check_user_key){
                            // share key
                            var user_room = getUserRoomKey(room_id);
                            io.to(room_id).emit('user_share_key', user_room);

                            params.room_id = result._id;
                            console.log('room true', result);
                            deleteAllUserInRoom(room_id);
                            return callback(false, data, params);
                        }else{
                            var message = {
                                message: "user chua share key",
                                success: false
                            };
                            for(var i = 0; i < member.length; i++){
                                io.to(member[i]).emit('status_join_room', message);
                            }
                            return callback(true, data, params);
                        }
                    }
                }
                console.log('member_validate_3');
                data.success = 0;
                data.message = 'message.room_not_exits';
                io.to(user_id).emit('status_join_room', data);
                return callback(true);
            });
        }
    });
}

function userJoinRoom(socket, room_id, callback) {
    showListRoom(socket);
    var rooms = Object.keys(socket.rooms);
    if (rooms.indexOf(room_id) >= 0) {
        showListRoom(socket);
        return callback(true);
    }else if (rooms.indexOf(room_id) == -1) {
        socket.join(room_id, function() {
            showListRoom(socket);
            return callback(true);
        });
    }else{
        console.log('error join room with ' +room_id);
        return callback(false);
    }
}

function validUserId(data, callback){
    var user_id = data.user_id,
        key = data.key;
    if(!user_id || !mongoose.Types.ObjectId.isValid(user_id) || isEmpty(key)){
        data.success = 0;
        io.to(user_id).emit('status_join', data);
        return callback(true);
    }
    User.findOne({_id: user_id, deleted_at: null}, function (err, result) {
        if (!err && result) {
            // update login user
            result.is_login = true;
            result.save();
            setUserKey('', user_id, key);
            //update key user
            console.log('user key: ', user_id, key, UserKey);
            var params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id);
            return callback(false, data, params);
        }else{
            data.success = 0;
            io.to(user_id).emit('status_join', data);
            return callback(true);
        }
    });
}

function  sendKeyUserInRoom(data, params, callback) {
    var user_id = data.user_id;
    var room_id_arr = setUserStatus(user_id);
    Room.find({_id: {$in: room_id_arr}, deleted_at: null}, function (err, rooms) {
        console.log('rooms : ', rooms);
        if(!err && rooms){
            rooms.forEach(function (room) {
                if(isEmpty(room.share_key_flag) || !room.share_key_flag){
                    var member = room.member;
                    var room_id= room._id;
                    console.log('room_id', room_id, 'member', member, ' check all user online');
                    // check all member_onine
                    var room_flg = checkUserRoomOnline(room_id);
                    if(room_flg){
                        var user_room_key = getUserRoomKey(room_id);
                        for(var i = 0; i < member.length; i++){
                            io.to(member[i]).emit('user_share_key', user_room_key);
                        }
                        room.share_key_flag = true;
                        room.save();
                        deleteAllUserInRoom(room_id);
                    }
                }
            });
            return callback(true);
        }
        return callback(false);
    });
}

var getRoom = function(data, callback) {
    var user_id = data.user_id;
    var room_id = data.room_id;
    console.log('user_id: ', user_id, 'room_id: ', room_id);
    Room.findOne({_id : room_id, member : {$in: [user_id]}, deleted_at: null}, function (err, result) {
        console.log('getRoom', result);
        if(err || !result){
            console.log('error getroom');
            data.success = 0;
            data.message = 'message.room_not-exits';
            io.to(user_id).emit('status_join_room', data);
            return callback(true);
        }
        if(isEmpty(result.share_key_flag) || !result.share_key_flag){
            console.log('room chua share key');
            data.success = 0;
            data.message = 'message.room_not_share_key';
            io.to(user_id).emit('status_join_room', data);
            return callback(true);
        }
        var params = createParameterDefault(data.message_type, room_id, data.user_id, result.member);
        return callback(false, result, params);
    });
};

function validUserContact(data, callback){
    var user_id = data.user_id;
    var room_id = data.room_id;
    var member = data.member;
    var room_type = data.room_type;
    if(!user_id || !room_type || !mongoose.Types.ObjectId.isValid(user_id)){
        data.success = 0;
        io.to(user_id).emit('status_join', data);
        return callback(true);
    }
    if(room_id){
        Room.findOne({_id: user_id, deleted_at: null}, function (err, result) {
            if (!err && result) {
                var params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id);
                return callback(false, data, params);
            }else{
                data.success = 0;
                io.to(user_id).emit('status_join', data);
                return callback(true);
            }
        });
    }else{

    }
}

function receivedWebchatQuickreplies(data) {
    validConnectPageId(data, function (err, event, params) {
        if(!err){
            var message = event.message;
            if(message) {
                var messageText = message.text;
                var quickReply = message.quick_reply;
                if (quickReply) {
                    var quickReplyPayload = quickReply.payload;
                    if (quickReplyPayload) {
                        params.start_flg = 1;
                        saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, messageText, new Date(), quickReplyPayload);
                        var quick_replies_index = quickReplyPayload.indexOf("QUICK_REPLIES_");
                        if (quick_replies_index > -1) {
                            var keyword_matching_flg = 0;
                            var current_payload = quickReplyPayload.replace(/QUICK_REPLIES_/g, "");
                            var arr_index = current_payload.split("_");
                            var variable_value = messageText;
                            if(arr_index[2] !== undefined && arr_index[2]){
                                variable_value = decodeBase64(arr_index[2]);
                            }
                            if(arr_index[1] !== undefined && parseInt(arr_index[1]) != -1){
                                //saveCarouselToVariable(params, arr_index[1], messageText);
                                saveQuickReplyToVariable(params, arr_index[1], variable_value);
                            }
                            if(arr_index[0] !== undefined && parseInt(arr_index[0]) != -1){
                                params.current_scenario_id = arr_index[0];
                                setTimeout(function() {
                                    connectScenario(params);
                                }, 900);
                                return;
                            }
                            if(arr_index[3] !== undefined && parseInt(arr_index[3]) == 1){
                                keyword_matching_flg = 1;
                            }
                            setTimeout(function() {
                                quickRepliesAfterClickButton(params, messageText, keyword_matching_flg);
                            }, 500);
                        }
                    }
                }
            }
        }
    });
}

//非同期処理
var stepA = function(page_id) {
    //var d = Q.defer();
    //d.reject('piyo');
    //
    //var result = ConnectPage.findOne({page_id: page_id, sns_type: SNS_TYPE_FACEBOOK, deleted_at: null}).exec())
    //.then(function(result) {
    //    console.log(result);
    //    return {
    //        result: result
    //    };
    //}
    return Q.Promise(function (resolve, reject) {(ConnectPage.findOne({page_id: page_id, sns_type: SNS_TYPE_FACEBOOK, deleted_at: null}).exec())
        .then(function(result) {
            return reject(result);
           if(result){
               return resolve(result);
           }
           return reject(result);
        });
    });


    //ConnectPage.findOne({page_id: page_id, sns_type: SNS_TYPE_FACEBOOK, deleted_at: null}, function (err, result) {
    //    d.resolve("result");
    //    d.resolve(result);
    //});
    //return d.promise;
};

//同期処理
var stepB = function(val) {
    var d = Q.defer();
    console.log("stepB");
    console.log(val);
    d.resolve('piyo');
    return d.promise;
};

function receivedWebchatPostback(event) {
    var connect_page_id = event.connect_page_id;
    ConnectPage.findOne({_id: connect_page_id, sns_type: SNS_TYPE_WEBCHAT, deleted_at: null}, function (err, result) {
        if(result){
            var payload = event.payload;
            //console.log(event);
            //console.log(payload);
            if(payload){
                var params = createParameterDefault(result.sns_type, result._id, event.user_id, result.page_id);
                params.start_flg = 1;
                var scenario_index1 = payload.indexOf("MENU_SCENARIO_");
                var scenario_index2 = payload.indexOf("SCENARIO_");
                var current_scenario_id = null;
                var arr  = [];
                var new_payload = '';
                if (scenario_index1 > -1) {
                    new_payload = payload.replace(/MENU_SCENARIO_/g, "");
                    arr = new_payload.split("_");
                    if(arr.length == 2){
                        current_scenario_id = arr[0];
                        params.payload_value = arr[1];
                    }
                } else if (scenario_index2 > -1) {
                    new_payload = payload.replace(/SCENARIO_/g, "");
                    arr = new_payload.split("_");
                    current_scenario_id = arr[0];
                    if(arr.length == 2){
                        params.payload_value = arr[1];
                    }else if(arr.length == 3){
                        var tmp_variable = arr[1];
                        params.payload_value = decodeBase64(arr[2]);
                        if(parseInt(tmp_variable) != -1){
                            saveQuickReplyToVariable(params, tmp_variable, params.payload_value);
                        }
                    }
                }
                if(params.payload_value) {
                    saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, params.payload_value, new Date(), payload);
                }
                if(current_scenario_id){
                    params.current_scenario_id = current_scenario_id;
                    setTimeout(function() {
                        connectScenario(params);
                    }, 900);
                }
            }
        }else{
            event.status = 0;
            io.to(event.user_id).emit('webchat_status_join', event);
        }
    });
}

//全体適用シナリオ
function allDialogLibrary(params, message_text){
    //console.log(params);
    Library.find({connect_page_id: params.connect_page_id, all_dialog_flg: 1}, function(err, library_result) {
        if (err) throw err;
        //console.log(connect_page_id);
        //console.log(library_result);
        var position_arr = [];
        if(library_result && library_result.length > 0){
            position_arr = getMatchData(message_text, library_result);
        }
        if(position_arr.length > 0){
            ////console.log(tmp_index);
            var element = getMaxLength(position_arr);
            if(element){
                var row = element.data;
                if(row.type == LIBRARY_TEXT){
                    row.answer = variableTextToValue(row.answer, params.user_variable);
                    var answer = convertTextMessage(params.sns_type, row.answer);
                    if(element.scenario_id && mongoose.Types.ObjectId.isValid(element.scenario_id)){
                        params.keyword_scenario_id = element.scenario_id;
                    }
                    sendMessage(params, USER_TYPE_TEXT, answer);
                }else if(row.type == LIBRARY_SCENARIO){
                    params.current_scenario_id = row.answer;
                    //console.log("LIBRARY_SCENARIO");
                    //console.log(params);
                    connectScenario(params);
                }
            }else{
                saveBotNoReply(params, message_text);
            }
        }else {
            saveBotNoReply(params, message_text);
        }
    })
}

function saveBotNoReply(params, message_text){
    console.log("saveBotNoReply");
    if(params.sns_type == SNS_TYPE_WEBCHAT || params.sns_type == SNS_TYPE_CHATWORK){
        if(typeof params.list_option !== "undefined" && params.list_option.length > 0){
            for(var i = 0; i < params.list_option.length; i++){
                var row = params.list_option[i];
                if(row.option == WEBCHAT_DEFAULT_MESSAGE_TYPE){
                    params.current_scenario_id = row.scenario_connect;
                    connectScenario(params);
                    break;
                }
            }
        }
    }

    if(params.sns_type != SNS_TYPE_CHATWORK){
        var now = new Date();
        var date = moment().tz(TIMEZONE).format("YYYY-MM-DD"); //dateFormat(now, "yyyy-mm-dd");


        BotNoReply.findOneAndUpdate({ connect_page_id: params.connect_page_id, user_id: params.user_id, date: date}, { $inc: {count: 1}, $addToSet: {user_said: message_text }, $set: {updated_at : now}, $setOnInsert: {created_at: now}}, { upsert: true }, function(err, result) {
            if (err) throw err;
        });
    }
}

//シナリオ内キーワードマッチ適用
function scenarioDialogLibrary(params, message_text, library_arr){
    if(library_arr && library_arr.length > 0){
        Library.find({ _id: { "$in" : library_arr}}, function(err, library_result) {
            if (err) throw err;
            //console.log("library_result");
            //console.log(library_result);
            var position_arr = [];
            if(library_result && library_result.length > 0){
                position_arr = getMatchData(message_text, library_result);
            }
            ////console.log("position_arr");
            ////console.log(position_arr);
            if(position_arr.length > 0){
                ////console.log(tmp_index);
                var element = getMaxLength(position_arr);
                if(element){
                    var row = element.data;
                    if(row.type == LIBRARY_TEXT){
                        row.answer = variableTextToValue(row.answer, params.user_variable);
                        var answer = convertTextMessage(params.sns_type, row.answer);
                        if(element.scenario_id && mongoose.Types.ObjectId.isValid(element.scenario_id)){
                            params.keyword_scenario_id = element.scenario_id;
                        }
                        sendMessage(params, USER_TYPE_TEXT, answer);
                        return true;

                    }else if(row.type == LIBRARY_SCENARIO){
                        params.current_scenario_id = row.answer;
                        connectScenario(params);
                        return true;
                    }
                }
                allDialogLibrary(params, message_text);
            }else{
                allDialogLibrary(params, message_text);
            }
        })
    }else{
        allDialogLibrary(params, message_text);
    }
}

//キーワードマッチライブラリ参照からマッチデータ取得
function getMatchData(message, rows){
    var result = [];
    var item;
    for (var i=0, size = rows.length; i < size; ++i) {
        var library_msg = rows[i].messages;
        if(library_msg && library_msg.length > 0) {
            for (var j = 0; j < library_msg.length; j++) {
                item = library_msg[j];
                if(item.question){
                    var arr = item.question.toLowerCase().split(",");
                    arr.some(function (value, index2, _ary2) {
                        if (message.indexOf(value) > -1) {
                            result.push({"length" : value.length, "data" : item, "scenario_id" : rows[i].scenario_id});
                        }
                    });
                }
            }
        }
    }
    return result;
}

function createParameterDefault(room_type, room_id, user_id, member){
    var params = {};
    params.room_type = room_type;
    params.room_id = room_id;
    params.user_id = user_id;
    params.member = member;
    return params;
}

var getAllVariableValueNew = function(param) {
    return Q.Promise(function (resolve, reject) {(MessageVariable.find({connect_page_id: param.connect_page_id, variable_id: {"$in" : param.variableArr}}).exec())
        .then(function (result) {
            var variable_result_arr = {};
            if(param.userProfileArr) {
                param.userProfileArr.forEach(function (userProfile) {
                    var variable_result = {};
                    default_variable.forEach(function (variable) {
                        if (userProfile[variable]) {
                            variable_result[variable] =  userProfile[variable];
                        }
                    });
                    variable_result_arr["_" + userProfile.user_id] = variable_result;
                });
            }
            if(result && result.length > 0) {
                for (var i=0, size = result.length; i < size; i++) {
                    var tmp_variable = result[i].variable_value;
                    var user_id = "_" + result[i].user_id;
                    var variable = variable_result_arr[user_id];

                    if(tmp_variable instanceof Array){
                        tmp_variable = arrayUnique(tmp_variable);
                    }
                    if(variable !== undefined){
                        variable[result[i].variable_id] = tmp_variable;
                    }

                }
            }
            var result_arr = [];
            for (var j in variable_result_arr) {
                result_arr.push(variable_result_arr[j]);
            }

            return resolve(result_arr);
        })
    });
};

function getArrayDiff(arr1, arr2) {
    var newArr = [];
    for(var a = 0 ; a < arr1.length; a++){
        if(arr2.indexOf(arr1[a]) === -1 ){
            newArr.push(arr1[a]);
        }
    }
    for(var b = 0; b < arr2.length; b++){
        if(arr1.indexOf(arr2[b]) === -1 ){
            newArr.push(arr2[b]);
        }
    }
    return newArr;
}

function arrayUnique(arr){
    if(arr.length > 0) {
        arr = arr.filter(function (x, i, self) {
            return self.indexOf(x) === i;
        });
    }
    return arr;
}

function variableTextToValue(text, variable_arr){
    ////console.log("variableTextToValue");
    for(var variable in variable_arr){
        var tmp = "{{" + variable + "}}";
        text = text.replace(new RegExp(preg_quote(tmp), 'g'), variable_arr[variable]);
    }
    text = text.replace(/\{\{[^\}]+\}\}/gi, '');
    return text;
}

function variableTextToValueArray(text, variable_arr){
    //console.log("variableTextToValue");
    //console.log(text);
    if(typeof text === "undefined" || text.length == 0){
        return '';
    }
    for(var variable in variable_arr){
        var tmp = "{{" + variable + "}}";
        //console.log(tmp);
        var value = variable_arr[variable];
        if(value && Array.isArray(value)){
            value = value.join(",");
        }
        //console.log(value);
        text = text.replace(new RegExp(preg_quote(tmp), 'g'), value);
    }
    //console.log(text);
    text = text.replace(/\{\{[^\}]+\}\}/gi, '');
    return text;
}

function preg_quote (str, delimiter) {
    // Quote regular expression characters plus an optional character
    //
    // version: 1107.2516
    // discuss at: http://phpjs.org/functions/preg_quote
    // +   original by: booeyOH
    // +   improved by: Ates Goral (http://magnetiq.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Onno Marsman
    // +   improved by: Brett Zamir (http://brett-zamir.me)
    // *     example 1: preg_quote("$40");
    // *     returns 1: '\$40'
    // *     example 2: preg_quote("*RRRING* Hello?");
    // *     returns 2: '\*RRRING\* Hello\?'
    // *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
    // *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'
    return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
}

//type = ボタン or カルーセル  URL上の変数参照
function variableUrlToValue(params, row){
    //console.log("variableUrlToValue");
    var message = row.message;
    var variable_arr = [];
    if (row.type == BOT_TYPE_QUICK_REPLIES) {
        if(message && message.text){
            message.text = variableTextToValue(message.text, params.user_variable);
        }
        return row;
    }
    if(message && message.attachment && message.attachment.payload && ( message.attachment.payload.elements || message.attachment.payload.buttons)) {
        var elements = message.attachment.payload.elements ? message.attachment.payload.elements : message.attachment.payload.buttons;
        //console.log("elements");
        //console.log(elements);
        if (elements) {
            elements.forEach(function (element) {
                if (row.type == BOT_TYPE_GENERIC) {
                    if (element.item_url) {
                        element.item_url = encodeURI(variableTextToValue(element.item_url, params.user_variable));
                    }
                    if (element.buttons) {
                        var buttons = element.buttons;
                        buttons.forEach(function (button) {
                            if (button && button.type == "web_url" && button.url) {
                                button.url = encodeURI(variableTextToValue(button.url, params.user_variable));
                            }
                        });
                    }
                } else if (row.type == BOT_TYPE_BUTTON) {
                    if (elements.length > 0) {
                        elements.forEach(function (button) {
                            if (button && button.type == "web_url" && button.url) {
                                button.url = encodeURI(variableTextToValue(button.url, params.user_variable));
                            }
                        });
                    }
                }
            });
        }
    }
    return row;
}

//type = ボタン or カルーセル  URL上の変数参照
function lineVariableUrlToValue(params, row){
    //console.log("variableUrlToValue");
    var message = row.message;
    //confirm
    if (row.type == BOT_TYPE_QUICK_REPLIES) {
        if(message && message.altText && message.template.text){
            message.altText = variableTextToValue(message.altText, params.user_variable);
            message.template.text = variableTextToValue(message.template.text, params.user_variable);
        }
        return row;
    }
    if(message && message.template && message.template.columns) {
        if(message.altText){
            message.altText = variableTextToValue(message.altText, params.user_variable);
        }
        var elements = message.template.columns;
        //console.log("elements");
        //console.log(elements);
        if (elements) {
            elements.forEach(function (element) {
                if (element.title) {
                    element.title = variableTextToValue(element.title, params.user_variable);
                }
                if (element.actions) {
                    var buttons = element.actions;
                    buttons.forEach(function (button) {
                        if (button && button.type == "uri" && button.uri) {
                            button.uri = encodeURI(variableTextToValue(button.uri, params.user_variable));
                        }
                    });
                }
            });
        }
    }
    return row;
}

//クイック返信でクリックしたボタンの値を変数に保存する
function saveQuickReplyToVariable(params, variable_id, msgText){
    console.log("saveQuickReplyToVariable");
    Variable.findOne({ _id: variable_id, connect_page_id: params.connect_page_id}, function(err, result) {
        if (err) throw err;
        var new_position = 0;
        if(result){
            var now = new Date();
            MessageVariable.update({connect_page_id: result.connect_page_id, user_id: params.user_id, variable_id: variable_id}, {$set: {page_id: params.page_id, variable_value: msgText, created_at : now, updated_at : now}},
                {upsert: true, multi: false}, function (err) {
                    if (err) throw err;
                });
        }
    });
}

function saveQuickReplyToVariableNew(params, variable_id, msgText, callback){
    console.log("saveQuickReplyToVariable");
    Variable.findOne({ _id: variable_id, connect_page_id: params.connect_page_id}, function(err, result) {
        if (err) throw err;
        var new_position = 0;
        if(result){
            var now = new Date();
            MessageVariable.update({connect_page_id: result.connect_page_id, user_id: params.user_id, variable_id: variable_id}, {$set: {page_id: params.page_id, variable_value: msgText, created_at : now, updated_at : now}},
                {upsert: true, multi: false}, function (err) {
                    if (err) throw err;
                    return callback(true);
                });
        }else{
            return callback(true);
        }
    });
}

function saveCarouselToVariable(params, variable_id, item_id){
    console.log("saveCarouselToVariable");
    Variable.findOne({ _id: variable_id, connect_page_id: params.connect_page_id}, function(err, result) {
        if (err) throw err;
        if(result){
            var now = new Date();
            MessageVariable.update({connect_page_id: result.connect_page_id, user_id: params.user_id, variable_id: variable_id}, {$push: {variable_value: item_id}, $set: {page_id: params.page_id, created_at : now, updated_at : now}},
                {upsert: true, multi: false}, function (err) {
                    if (err) throw err;
                });
        }
    });
}

//シナリオ接続
function connectScenario(params, messages){
    //console.log("connectScenario");
    if(params.current_scenario_id && mongoose.Types.ObjectId.isValid(params.current_scenario_id)){
        if(params.sns_type != SNS_TYPE_EFO && params.sns_type != SNS_TYPE_CHATWORK){
            updateUserScenario(params);
        }

        Scenario.findOne({ _id: params.current_scenario_id, connect_page_id: params.connect_page_id, deleted_at: null}, function(err, result) {
            if (err) throw err;
            var new_position = 0;
            //console.log(result);
            if(result){
                getAllVariableValue(params, function (err, result1) {
                    params.user_variable = result1.variable_result;
                    params.preview_flg = result1.preview_flg;
                    var is_valid =  checkScenarioCondition(params, result);
                    //console.log("is_valid=" + is_valid);
                    if(is_valid){
                        BotMessage.find({ scenario_id: params.current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                            if (err) throw err;
                            //console.log(result);
                            if(result && result.length > 0){
                                if(params.sns_type == SNS_TYPE_LINE){
                                    sendMultiMessageLine(params, result, new_position, messages);
                                }else if(params.sns_type == SNS_TYPE_WEBCHAT){
                                    sendMultiMessageWebchat(params, result, new_position, messages);
                                } else if(params.sns_type == SNS_TYPE_CHATWORK){
                                    sendMultiMessageChatwork(params, result, new_position);
                                }
                                else{
                                    sendMultiMessage(params, result, new_position);
                                }
                            }else{
                                console.log("connectScenario no MESSAGE_BOT="+params.current_scenario_id);
                                saveUserPosition(params, -1);
                                if(messages && messages.length > 0){
                                    sendMessage(params, USER_TYPE_TEXT, messages);
                                }
                                if(params.sns_type == SNS_TYPE_CHATWORK && (typeof params.messageTextLower !== "undefined")){
                                    allDialogLibrary(params, params.messageTextLower);
                                }
                            }
                        });
                    }
                });
            }else {
                saveUserPosition(params, -1);
                if(messages && messages.length > 0){
                    sendMessage(params, USER_TYPE_TEXT, messages);
                }
            }
        });
    }else{
        saveUserPosition(params, -1);
        if(messages && messages.length > 0){
            sendMessage(params, USER_TYPE_TEXT, messages);
        }
    }
}

function getQuestionCountEfo(current_scenario_id, connect_page_id, callback){
    console.log("connectScenario");
    if(current_scenario_id && mongoose.Types.ObjectId.isValid(current_scenario_id)){
        Scenario.findOne({ _id: current_scenario_id, connect_page_id: connect_page_id, deleted_at: null}, function(err, result) {
            if (err) throw err;
            if(result){
                BotMessage.find({ scenario_id: current_scenario_id}, {}, {sort: {position: 1}}, function(err, result) {
                    if (err) throw err;
                    //console.log(result);
                    if(result && result.length > 0){
                        var cnt = 0;
                        result.forEach(function (row) {
                            if(row.message_type == MESSAGE_USER){
                                var data = row.data[0].message;
                                if(data){
                                    cnt += data.length;
                                }
                            }
                        });
                        return callback(cnt);
                    }else{
                        return callback(0);
                    }
                });
            }else {
                return callback(0);
            }
        });
    }else{
       return callback(0);
    }
}

function connectScenarioEfo(params, messages){
    //console.log("connectScenario");
    if(params.current_scenario_id && mongoose.Types.ObjectId.isValid(params.current_scenario_id)){
        Scenario.findOne({ _id: params.current_scenario_id, connect_page_id: params.connect_page_id, deleted_at: null}, function(err, result) {
            if (err) throw err;
            var new_position = 0;
            //console.log(result);
            if(result){
                getAllVariableValue(params, function (err, user_variable) {
                    params.user_variable = user_variable;
                    var is_valid =  checkScenarioCondition(params, result);
                    //console.log("is_valid=" + is_valid);
                    if(is_valid){
                        BotMessage.find({ scenario_id: params.current_scenario_id}, {}, {sort: {position: 1}}, function(err, result) {
                            if (err) throw err;
                            //console.log(result);
                            if(result && result.length > 0){
                                var cnt = 0;
                                result.forEach(function (row) {
                                    if(row.message_type == MESSAGE_USER){
                                        //var data = row.data[0].message;
                                        var isMatchFilter = checkFilterEfo([], row);
                                        if(isMatchFilter){
                                            cnt++;
                                        }
                                    }
                                });
                                params.question_count = cnt;
                                //console.log("params.question_count=" + params.question_count);
                                sendMultiMessageEfo(params, result, messages);
                            }
                            //else{
                            //    saveUserPosition(params, -1);
                            //    if(messages && messages.length > 0){
                            //        sendMessage(params, USER_TYPE_TEXT, messages);
                            //    }
                            //}
                        });
                    }
                });
            }
            //else {
            //    saveUserPosition(params, -1);
            //    if(messages && messages.length > 0){
            //        sendMessage(params, USER_TYPE_TEXT, messages);
            //    }
            //}
        });
    }
    //else{
    //    saveUserPosition(params, -1);
    //    if(messages && messages.length > 0){
    //        sendMessage(params, USER_TYPE_TEXT, messages);
    //    }
    //}
}

//クイック返信のメッセージでボタンを押下した後、次はボットの発言がある場合、そのメッセージを送信する
function quickRepliesAfterClickButton(params, messageText, keyword_matching_flg){
    UserPosition.findOne({ connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
        if (err) throw err;
        if(result){
            var current_scenario_id = result.scenario_id;
            var current_position =  result.position;
            params.current_scenario_id = current_scenario_id;
            Scenario.findOne({ _id: current_scenario_id, connect_page_id: result.connect_page_id, deleted_at: null }, function(err, result) {
                if (err) throw err;
                if(result){
                    var new_position = current_position + 1;
                    BotMessage.find({ scenario_id: result._id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                        if (err) throw err;
                        if(result && result.length >0 && result[0].position == new_position){
                            if(params.sns_type == SNS_TYPE_WEBCHAT){
                                sendMultiMessageWebchat(params, result, new_position);
                            }
                            else{
                                sendMultiMessage(params, result, new_position);
                            }
                            setTimeout(function() {
                                quickRepliesKeywordMatching(params, messageText, keyword_matching_flg);
                            }, 1000);
                        }else{
                            quickRepliesKeywordMatching(params, messageText, keyword_matching_flg);
                        }
                    });
                }else{
                    quickRepliesKeywordMatching(params, messageText, keyword_matching_flg);
                }
            });
        }else{
            quickRepliesKeywordMatching(params, messageText, keyword_matching_flg);
        }
    });
}

function quickRepliesKeywordMatching(params, messageText, keyword_matching_flg){
    if(keyword_matching_flg){
        var messageTextLower = messageText.toLowerCase();
        console.log("messageTextLower="+messageTextLower);
        allDialogLibrary(params, messageTextLower);
    }
}

function getStartScenarioId(params, callback){
    Scenario.findOne({ connect_page_id: params.connect_page_id, start_flg : 1, deleted_at: null}, function(err, result) {
        if (err) throw err;
        if(result) {
            return callback(result._id);
        }else{
            return callback('');
        }
    });
}

//function getStartScenario(params, payload){
//  //console.log("connect_page_id="+connect_page_id);
//  Scenario.findOne({ connect_page_id: params.connect_page_id, start_flg : 1, deleted_at: null}, function(err, result) {
//    if (err) throw err;
//    //console.log(result);
//    var message = '';
//    if(result) {
//        params.current_scenario_id = result._id;
//        getAllVariableValue(params, function (err, user_variable) {
//            params.user_variable = user_variable;
//            var is_valid = checkScenarioCondition(params, result);
//            if(is_valid){
//                var new_position = 0;
//                BotMessage.find({ scenario_id: params.current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
//                    if (err) throw err;
//                    if(result && result.length > 0){
//                        if(params.sns_type == SNS_TYPE_LINE){
//                            sendMultiMessageLine(params, result, new_position);
//                        }else if(params.sns_type == SNS_TYPE_FACEBOOK){
//                            sendMultiMessage(params, result, new_position);
//                        }else if(params.sns_type == SNS_TYPE_WEBCHAT){
//                            sendMultiMessageWebchat(params, result, new_position);
//                        }
//                    }else{
//                        console.log("saveUserPosition");
//                        saveUserPosition(params, -1);
//                    }
//                });
//            }
//        });
//    }
//  });
//}

function checkScenarioCondition(params, scenarioResult){
    var filter = ((typeof scenarioResult.filter !== 'undefined') ? scenarioResult.filter : []);
    if(filter.length > 0){
        var variables = params.user_variable;
        var match_value_cnt = 0;
        var user_variable_value = "";
        for (var i = 0; i < filter.length; i++)
        {
            var filter_row = filter[i];
            var scenario_id = filter_row.scenario_id;
            if(typeof scenario_id !== 'undefined' && mongoose.Types.ObjectId.isValid(scenario_id)){
                var condition = filter_row.condition;
                if(condition instanceof Array && condition.length > 0){
                    match_value_cnt = 0;
                    for (var j = 0; j < condition.length; j++)
                    {
                        var row = condition[j];
                        var variable = row.condition;
                        var variable_value = row.value;
                        var compare = row.compare;
                        user_variable_value = "";
                        if(typeof variables[variable] !== 'undefined'){
                            user_variable_value = variables[variable];
                        }
                        if((compare == "is" && user_variable_value == variable_value) || (compare == "isNot" && user_variable_value != variable_value)){
                            match_value_cnt++;
                        }
                    }
                    if(match_value_cnt == condition.length){
                        params.current_scenario_id = scenario_id;
                        return true;
                    }
                }
            }
        }
    }
    return true;
}

function checkFilterEfo(variables, user_msg){
    //console.log("checkFilterEfo");
    var filter = ((typeof user_msg.filter !== 'undefined') ? user_msg.filter : []);
    //console.log(filter);
    if(filter.length > 0){
        var match_value_cnt = 0;
        var user_variable_value = "";
        for (var i = 0; i < filter.length; i++)
        {
            var condition = filter[i];
            if(condition instanceof Array && condition.length > 0){
                match_value_cnt = 0;
                for (var j = 0; j < condition.length; j++)
                {
                    var row = condition[j];
                    //console.log(row);
                    var variable = row.condition;
                    var variable_value = row.value;
                    var compare = row.compare;
                    user_variable_value = "";
                    if(typeof variables[variable] !== 'undefined'){
                        user_variable_value = variables[variable];
                    }
                    if((compare == "is" && user_variable_value == variable_value) || (compare == "isNot" && user_variable_value != variable_value)){
                        match_value_cnt++;
                    }else if(compare == "including" && user_variable_value.length > 0 && variable_value.length > 0 && user_variable_value.indexOf(variable_value) > -1){
                        match_value_cnt++;
                    }
                }
                //console.log("match_value_cnt=" + match_value_cnt);
                if(match_value_cnt == condition.length){
                    return true;
                }
            }
        }
        return false;
    }
    return true;
}

function getBotMessage(data, position){
    var size = data.length;
    //console.log(data);
    var msg_arr =[];
    for (var i=0; i < size; i++) {
        var msg = data[i];
        if(msg.position != position){
            break;
        }
        position++;
        msg_arr.push(msg);
    }
    return msg_arr;
}

function sendPushMultiMessageLine(params, data, new_position, messages, callback){
    var msg_arr = getBotMessage(data, new_position);
    if(msg_arr.length == 0){
        return callback([]);
    }
    for (var i=0; i < msg_arr.length; i++) {
        if(messages.length == 5) break;
        var msg = msg_arr[i];
        var row = msg.data[0];
        if(row.type == BOT_TYPE_TEXT){
            if(row.message && row.message.text){
                messages.push(
                    row.message
                );
            }
        }else if(row.type == BOT_TYPE_API){
            continue;
        }
        else if(row.type == BOT_TYPE_SCENARIO){
            params.current_scenario_id = row.message.scenario;
            Scenario.findOne({ _id: params.current_scenario_id, connect_page_id: params.connect_page_id, deleted_at: null}, function(err, result) {
                if (err) throw err;
                var new_position = 0;
                //console.log(result);
                if(result){
                    var is_valid =  checkScenarioCondition(params, result);
                    //console.log("is_valid=" + is_valid);
                    if(is_valid){
                        BotMessage.find({ scenario_id: params.current_scenario_id, message_type: MESSAGE_BOT}, {}, {sort: {position: 1}}, function(err, result) {
                            if (err) throw err;
                            //console.log(result);
                            if(result && result.length > 0){
                                var msg_arr1 = getBotMessage(result, new_position);
                                if(msg_arr1.length == 0){
                                    return callback(messages);
                                }

                                for (var i=0; i < msg_arr1.length; i++) {
                                    if(messages.length == 5) break;
                                    var msg = msg_arr1[i];
                                    var row = msg.data[0];
                                    if(row.type != BOT_TYPE_API && row.type != BOT_TYPE_MAIL && row.type != BOT_TYPE_SCENARIO){
                                        messages.push(
                                            row.message
                                        );
                                    }
                                }
                                return callback(messages);
                            }else{
                                return callback(messages);
                            }
                        });
                    }
                }else {
                    return callback(messages);
                }
            });
            return;
        }else if(row.type == BOT_TYPE_MAIL){
            continue;
        }
        //confirm
        else if(row.type == BOT_TYPE_QUICK_REPLIES || row.type == BOT_TYPE_GENERIC){
            messages.push(
                row.message
            );
        }
        else{
            messages.push(
                row.message
            );
        }
    }
    if(messages.length > 0){
        return callback(messages);
    }
    return callback([]);
}

function sendMultiMessageLine(params, data, new_position, messages){
    var msg_arr = getBotMessage(data, new_position);
    if(msg_arr.length == 0){
        saveUserPosition(params, -1);
        return;
    }
    getAllVariableValue(params, function (err, result1) {
        if (!err) {
            if(!messages){
                messages = [];
            }
            params.user_variable = result1.variable_result;
            params.preview_flg = result1.preview_flg;
            for (var i=0; i < msg_arr.length; i++) {
                if(messages.length == 5) break;
                var msg = msg_arr[i];
                var row = msg.data[0];
                if(row.type == BOT_TYPE_TEXT){
                    if(row.message && row.message.text){
                        row.message.text = variableTextToValue(row.message.text, params.user_variable);
                        messages.push(
                            row.message
                        );
                    }
                }else if(row.type == BOT_TYPE_API){
                    //params.current_scenario_id = msg.scenario_id;
                    //saveUserPosition(params, msg.position);
                    //if(messages.length > 0){
                    //    sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                    //}
                    //messages = [];
                    params.nosend_messages = messages;
                    var remain_arr = msg_arr.slice(i + 1, msg_arr.length);
                    if(remain_arr.length > 0){
                        params.remain_data = remain_arr;
                        params.remain_position = msg.position + 1;
                    }
                    getApiConnect(params, row.message.api);
                    return;
                }
                else if(row.type == BOT_TYPE_SCENARIO){
                    params.current_scenario_id = row.message.scenario;
                    connectScenario(params, messages);
                    return;
                }else if(row.type == BOT_TYPE_MAIL){
                    sendEmail(params, row.message.mail);
                }
                //confirm
                else if(row.type == BOT_TYPE_QUICK_REPLIES || row.type == BOT_TYPE_GENERIC){
                    row = lineVariableUrlToValue(params, row);
                    messages.push(
                        row.message
                    );
                }
                else{
                    messages.push(
                        row.message
                    );
                }
            }
            var last_msg = msg_arr[msg_arr.length - 1];
            if(last_msg){
                params.current_scenario_id = last_msg.scenario_id;
                saveUserPosition(params, last_msg.position);
            }else{
                saveUserPosition(params, -1);
            }

            if(messages.length > 0){
                sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
            }
        }});
}

//From conversations
function sendMessageConversationLine(params, msg_arr){
    console.log("sendMessageConversationLine");
    if(msg_arr && Array.isArray(msg_arr)){
        getAllVariableValue(params, function (err, result1) {
            params.user_variable = result1.variable_result;
            params.preview_flg = result1.preview_flg;
            if (!err) {
                var messages = [];
                for (var i=0; i < msg_arr.length; i++) {
                    if(messages.length == 5) break;
                    var row = msg_arr[i];
                    if(row.type == BOT_TYPE_TEXT){
                        if(row.message && row.message.text){
                            row.message.text = variableTextToValue(row.message.text, params.user_variable);
                            messages.push(
                                row.message
                            );
                        }
                    }else if(row.type == BOT_TYPE_SCENARIO){
                        params.current_scenario_id = row.message.scenario;
                        connectScenario(params, messages);
                        return;
                    }
                    //confirm
                    else if(row.type == BOT_TYPE_QUICK_REPLIES || row.type == BOT_TYPE_GENERIC){
                        row = lineVariableUrlToValue(params, row);
                        messages.push(
                            row.message
                        );
                    }
                    else if(row.type == BOT_TYPE_MAIL){
                        sendEmail(params, row.message.mail);
                    }
                    else{
                        messages.push(
                            row.message
                        );
                    }
                }
                var last_msg = msg_arr[msg_arr.length - 1];
                if(last_msg){
                    params.current_scenario_id = last_msg.scenario_id;
                }
                if(messages.length > 0){
                    sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                }
            }});
    }
}

function sendMultiMessageChatwork(params, data, new_position){
    var msg_arr = getBotMessage(data, new_position);
    if(msg_arr.length == 0){
        saveUserPosition(params, -1);
        return;
    }
    getAllVariableValue(params, function (err, result1) {
        if (!err) {
            params.user_variable = result1.variable_result;
            params.preview_flg = result1.preview_flg;
            var messages = [];
            params.current_scenario_id =  msg_arr[0].scenario_id;
            for (var i=0; i < msg_arr.length; i++) {
                var msg = msg_arr[i];
                var row = msg.data[0];
                if(row.type == BOT_TYPE_TEXT){
                    if(row.message && row.message.text){
                        row.message.text = variableTextToValue(row.message.text, params.user_variable);
                        messages.push(msg);
                    }
                }else if(row.type == BOT_TYPE_API){
                    sendMessageChatwork(params, messages);
                    messages = [];
                    var remain_arr = msg_arr.slice(i + 1, msg_arr.length);
                    if(remain_arr.length > 0){
                        params.remain_data = remain_arr;
                        params.remain_position = msg.position + 1;
                    }
                    getApiConnect(params, row.message.api);
                    return;
                }else if(row.type == BOT_TYPE_SCENARIO){
                    if(row.message.scenario !=  params.current_scenario_id){
                        params.connect_scenario_id = row.message.scenario;
                    }
                    sendMessageChatwork(params, messages);
                    return;
                }else if(row.type == BOT_TYPE_MAIL){
                    sendEmail(params, row.message.mail);
                }
                else{
                    messages.push(msg);
                }
            }
            sendMessageChatwork(params, messages);
        }});
}

function sendMultiMessage(params, data, new_position){
    var msg_arr = getBotMessage(data, new_position);
    if(msg_arr.length == 0){
        saveUserPosition(params, -1);
        return;
    }
    getAllVariableValue(params, function (err, result1) {
        if (!err) {
            params.user_variable = result1.variable_result;
            params.preview_flg = result1.preview_flg;
            var messages = [];
            params.current_scenario_id =  msg_arr[0].scenario_id;
            for (var i=0; i < msg_arr.length; i++) {
                var msg = msg_arr[i];
                var row = msg.data[0];
                if(row.type == BOT_TYPE_TEXT){
                    if(row.message && row.message.text){
                        row.message.text = variableTextToValue(row.message.text, params.user_variable);
                        messages.push(msg);
                    }
                }else if(row.type == BOT_TYPE_API){
                    sendMessageFacebook(params, messages);
                    messages = [];
                    var remain_arr = msg_arr.slice(i + 1, msg_arr.length);
                    if(remain_arr.length > 0){
                        params.remain_data = remain_arr;
                        params.remain_position = msg.position + 1;
                    }
                    getApiConnect(params, row.message.api);
                    return;
                }else if(row.type == BOT_TYPE_QUICK_REPLIES){
                    row = variableUrlToValue(params, row);
                    messages.push(msg);
                    sendMessageFacebook(params, messages);
                    return;
                }
                else if(row.type == BOT_TYPE_SCENARIO){
                    if(row.message.scenario !=  params.current_scenario_id){
                        params.connect_scenario_id = row.message.scenario;
                    }
                    sendMessageFacebook(params, messages);
                    return;
                }else if(row.type == BOT_TYPE_BUTTON || row.type == BOT_TYPE_GENERIC){
                    row = variableUrlToValue(params, row);
                    messages.push(msg);
                }else if(row.type == BOT_TYPE_MAIL){
                    sendEmail(params, row.message.mail);
                }
                else{
                    messages.push(msg);
                }
            }
            sendMessageFacebook(params, messages);
    }});
}

function sendMessageConversationFacebook(params, msg_arr){
    if(msg_arr && Array.isArray(msg_arr)){
        getAllVariableValue(params, function (err, result1) {
            if (!err) {
                params.user_variable = result1.variable_result;
                params.preview_flg = result1.preview_flg;
                var messages = [];
                for (var i=0; i < msg_arr.length; i++) {
                    var row = msg_arr[i];
                    if(row.type == BOT_TYPE_TEXT){
                        if(row.message && row.message.text){
                            row.message.text = variableTextToValue(row.message.text, params.user_variable);
                            messages.push(row);
                        }
                    }else if(row.type == BOT_TYPE_API){
                        sendMessageFacebook2(params, messages);
                        messages = [];
                        var remain_arr = msg_arr.slice(i + 1, msg_arr.length);
                        if(remain_arr.length > 0){
                            params.remain_data = remain_arr;
                        }
                        getApiConnect(params, row.message.api);
                        return;

                    }else if(row.type == BOT_TYPE_QUICK_REPLIES){
                        row = variableUrlToValue(params, row);
                        messages.push(row);
                        sendMessageFacebook2(params, messages);
                        return;
                    }
                    else if(row.type == BOT_TYPE_SCENARIO){
                        params.connect_scenario_id = row.message.scenario;
                        sendMessageFacebook2(params, messages);
                        return;
                    }else if(row.type == BOT_TYPE_BUTTON || row.type == BOT_TYPE_GENERIC){
                        row = variableUrlToValue(params, row);
                        messages.push(row);
                    }else if(row.type == BOT_TYPE_MAIL){
                        sendEmail(params, row.message.mail);
                    }
                    else{
                        messages.push(row);
                    }
                }
                //console.log("messagesvfacbeook=");
                //console.log(messages);
                sendMessageFacebook2(params, messages);
            }});
    }

}

function sendMessageWebchat(params, msg_arr){
    //console.log(msg_arr);
    if(msg_arr && Array.isArray(msg_arr)){
        getAllVariableValue(params, function (err, result1) {
            if (!err) {
                params.user_variable = result1.variable_result;
                params.preview_flg = result1.preview_flg;
                for (var i=0; i < msg_arr.length; i++) {
                    var row = msg_arr[i];
                    var messages = [];
                    if (row.type == BOT_TYPE_TEXT) {
                        if (row.message && row.message.text) {
                            row.message.text = variableTextToValue(row.message.text, params.user_variable);
                            messages.push(
                                row.message
                            );
                        }
                    } else if (row.type == BOT_TYPE_API) {
                        getApiConnect(params, row.message.api);
                    } else if (row.type == BOT_TYPE_QUICK_REPLIES) {
                        row = variableUrlToValue(params, row);
                        messages.push(
                            row.message
                        );
                        sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                        return;
                    }
                    else if (row.type == BOT_TYPE_SCENARIO) {
                        sendMessage(params, row ? row.type : USER_TYPE_TEXT, messages);
                        params.current_scenario_id = row.message.scenario;
                        connectScenario(params);
                        return;
                    } else if (row.type == BOT_TYPE_BUTTON || row.type == BOT_TYPE_GENERIC) {
                        row = variableUrlToValue(params, row);
                        messages.push(
                            row.message
                        );
                    }else if (row.type == BOT_TYPE_MAIL) {
                        sendEmail(params, row.message.mail);
                    }
                    else {
                        messages.push(
                            row.message
                        );
                    }
                    if(messages.length > 0){
                        sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                    }
                }
            }});
    }
}

function sendMessageFacebook(params, data, index){
    var size = data.length;
    if(size > 0 && !index){
        var msg = data[size - 1];
        index = 0;
        saveUserPosition(params, msg.position);
    }
    if(size > 0 && index < size){
        var msg1 = data[index];
        var row = msg1.data[0];
        callSendAPICallback(params, row.type, row.message, index, function (next_index) {
            sendMessageFacebook(params, data, next_index);
        });
        return;
    }

    if(params.connect_scenario_id){
        params.current_scenario_id = params.connect_scenario_id;
        params.connect_scenario_id = undefined;
        connectScenario(params);
    }
}

//from conversation
function sendMessageFacebook2(params, data, index){
    var size = data.length;
    if(size > 0 && !index){
        index = 0;
    }
    if(size > 0 && index < size){
        var row =  data[index];
        callSendAPICallback(params, row.type, row.message, index, function (next_index) {
            sendMessageFacebook2(params, data, next_index);
        });
        return;
    }

    if(params.connect_scenario_id){
        params.current_scenario_id = params.connect_scenario_id;
        params.connect_scenario_id = undefined;
        connectScenario(params);
    }
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
          messageID);
    });
  }

  //console.log("All message before %d were delivered.", watermark);
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 *
 */
function receivedMessageRead(event, secret_key) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timestamp = event.timestamp;
  //console.log("receivedMessageRead");
  //console.log(event);
  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  //console.log("Received message read event for watermark %d and sequence " +
  //    "number %d", watermark, sequenceNumber);

  ConnectPage.findOne({page_id: recipientID, sns_type: SNS_TYPE_FACEBOOK, deleted_at: null}, function(err, result) {
    if (err) throw err;
      if (result && (secret_key == result.validate_token || secret_key == VALIDATION_TOKEN)){
      var system_param = createParameterDefault(result.sns_type, result._id, senderID, recipientID);
      updateNotification(system_param);
    }
  });
}

function listen () {
  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });
}

/*
 * Send a text message using the Send API.
 *
 */
function sendMessageOld(params, type, message, message_type, bid, b_position, btn_next, input_requiment_flg) {
    var messageData;
    if(params.sns_type == SNS_TYPE_EFO) {
        var logCollection = params.logCollection;
        if(!logCollection){
            logCollection = CreateModelLogForName(params.connect_page_id + "_logs");
            params.logCollection = logCollection;
        }

        params.status = 1;
        params.message = message;
        params.bid = bid;
        params.b_position = b_position;
        params.btn_next = btn_next;
        params.input_requiment_flg = input_requiment_flg;

        logCollection.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id, bid: bid, b_position: b_position, error_flg: null}, function(err, result) {
            if (err) throw err;
            if(result){
                if(result.type == BOT_TYPE){
                    result.message = message;
                    result.save();
                }else {
                    var isChange = false;
                    for(var i  = 0; i < message.length; i++) {
                        if (typeof result.message[i] !== 'undefined' && typeof message[i] !== 'undefined') {
                            var row1 = result.message[i];
                            var row2 = message[i];
                            if (row1.type == EFO_USER_TERMS && row2.type == EFO_USER_TERMS) {
                                row1.content = row2.content;
                                isChange = true;
                            } else if (row1.type == EFO_USER_INPUT_TEXTAREA && row2.type == EFO_USER_INPUT_TEXTAREA) {
                                row1.placeholder = row2.placeholder;
                                isChange = true;
                            }
                        }
                    }
                    if(isChange){
                        result.save();
                    }
                }
                io.to(params.user_id).emit('efo_bot_send_message', result);
            }else{
                saveLogChatMessage(params, type, message_type, message, new Date());
            }
        });
    }
    else if(params.sns_type == SNS_TYPE_WEBCHAT) {
        params.status = 1;
        //setTimeout(function(msg) {
        //    params.message = msg;
        //    io.to(params.user_id).emit('webchat_bot_send_message', params);
        //}, 300, message);
        //console.log(message);
        saveLogChatMessage(params, type, BOT_TYPE, message, new Date());
    }else if(params.sns_type == SNS_TYPE_LINE){
        if(params.notification_id){
            //var copy = Object.assign({}, params);
            var user_list = params.user_id;
            params.user_id = {};
            var cnt = Math.ceil(user_list.length / LINE_MAX_USER_PUSH);
            for(var i  = 0; i < cnt; i++){
                var multicast_user_ids = user_list.slice(i * LINE_MAX_USER_PUSH, (i*LINE_MAX_USER_PUSH) + LINE_MAX_USER_PUSH);
                messageData = {
                    to: multicast_user_ids,
                    messages: message
                };
                callSendLineMulticastAPI(params, type, messageData);
            }
        }else if(params.conversation_flg) {
            messageData = {
                to: params.user_id,
                messages: message
            };
            callSendLinePushAPI(params, type, messageData);
        }else{
            var arr = params.page_access_token.split(':');
            //console.log(arr);
            if(arr.length == 2){
                messageData = {
                    replyToken: arr[0],
                    messages: message
                };
                var tmp = params.page_access_token;
                params.page_access_token = arr[1];
                callSendLineReplyAPI(params, BOT_TYPE_TEXT, messageData);
                params.page_access_token = tmp;
            }
        }

    }else if(params.sns_type == SNS_TYPE_CHATWORK){
        console.log("send keywordmaching");
        callSendAPIChatworkCallback(params, type, message, 0, function (next_index) {
            if(params.keyword_scenario_id){
                params.current_scenario_id = params.keyword_scenario_id;
                params.keyword_scenario_id = undefined;
                connectScenario(params);
            }
        });
    }
    else{
        messageData = {
            recipient: {
                id: params.user_id
            },
            message: message
        };
        callSendAPI(params, type, messageData);
    }
}

function sendMessage(params, message, message_type) {
    console.log('func sendMessage: ', params, message, message_type);
    if(message_type == USER_SEND_TEXT || message_type == USER_SEND_FILE) {
        console.log('func USER_SEND_TEXT or USER_SEND_FILE: ');
        var logCollection = params.logCollection;
        if(!logCollection){
            logCollection = CreateModelLogForName(params.room_id + "_logs");
            params.logCollection = logCollection;
        }
        params.message = message;
        var now = new Date();
        var logCollection = new logCollection({
            room_id: params.room_id,
            user_id: params.user_id,
            message_type: message_type,
            message: message,
            created_at : now,
            updated_at : now
        });
        logCollection.save(function(err, logCollectionStore) {
            if (err) throw err;
            console.log('logCollectionStore store');
            var result = {
              'user_id' : params.user_id,
              'room_id' : params.room_id,
              'message_type' : message_type,
              'message' : message,
              'created_at' : moment(now).tz(TIMEZONE).format(date_format_global),
            };
            var member = params.member;
            User.find({ _id: {$in: member}}, {}, {}, function(err, users) {
               if(!err && users){
                   var member_name = [];
                   for (var i = 0; i < users.length; i++){
                       member_name.push({
                           id: users[i]['_id'],
                           name: users[i]['user_name'],
                           avatar: setAvatar(users[i]['avatar'])
                       });
                   }
                   result.member_name = member_name;
                   var client_in_room = params.client_in_room;
                   if(!isEmpty(client_in_room)){
                       result.user_read = client_in_room;
                   }
                   console.log('send message to user  : ', result);
                   io.to(params.room_id).emit('server_send_message', result);
                   updateLastMessage(params, result);
                   var user_id_not_arr = params.user_id_not_arr;
                   if(!isEmpty(user_id_not_arr)){
                       console.log('+++updateUnreadMessage');
                       sendMessageUserArr(params.user_id_not_arr, result);
                       updateUnreadMessage(params);
                   }
                   return;
               }
               result.msg_error = 'ko tim thay user';
                io.to(params.user_id).emit('user_join_room', result);
            });
        });
    }
}

function updateLastMessage(params, msg_data){
    var now = new Date();
    LastMessage.findOne({room_id: params.room_id}, function(err, result) {
        if(err){
            if (err) throw err;
        }
        // Nếu tìm thấy update, ngược lại create
        if(result){
            result.updated_at = now;
            result.user_id = params.user_id;
            result.message_type = msg_data.message_type;
            result.message = msg_data.message;
            result.save();
        }else{
            var LastMessageSave = new LastMessage({
                room_id: params.room_id,
                user_id: params.user_id,
                message_type : msg_data.message_type,
                message : msg_data.message,
                created_at : now,
                updated_at : now
            });
            LastMessageSave.save(function(err) {
                if (err) throw err;
            });
        }
    });
}

function updateUnreadMessage(params){
    console.log('-----------run updateUnreadMessage');
    var now = new Date();

    var data_list_update = UnreadMessage.collection.initializeOrderedBulkOp();
    var data_ids = params.user_id_not_arr;
    for (var i = 0; i < data_ids.length; i++) {
        data_list_update.find({room_id: params.room_id, user_id : data_ids[i]})
            .upsert()
            .update({ $inc: {count: 1}, $set: {room_id: params.room_id, user_id: data_ids[i], updated_at : now}});
    }

    if(data_list_update && data_list_update.s && data_list_update.s.currentBatch
        && data_list_update.s.currentBatch.operations
        && data_list_update.s.currentBatch.operations.length > 0){
        data_list_update.execute(function (error) {
            console.log(error);
        });
    }
}

function setAvatar(avatar_url) {
    if(!isEmpty(avatar_url)){
        if(avatar_url.indexof(avatar_url) == -1){
            avatar_url = server_url + '/' + avatar_url;
        }
    }
    return avatar_url;
}

function sendMessageUserArr(user_ids, message) {
    if(!isEmpty(user_ids) && user_ids.length >0){
        for(var key in user_ids){
            io.to(user_ids[key]).emit('server_send_message', message);
            console.log('send message other room user_id', user_ids[key]);
        }
    }
}

/*
 * Send a text message using the Send API.
 *
 */

function convertTextMessage(sns_type, messageText){
    var messages;
    if(sns_type == SNS_TYPE_LINE){
        messages = [
            {
                type:"text",
                text: messageText
            }
        ];
    }else{
        messages = {
            text: messageText
        }
    }
    return messages;
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(params, message_type, messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: params.page_access_token },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    var now = new Date();
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
      saveLogChatMessage(params, message_type, BOT_TYPE, messageData.message, now);
      //if (messageId) {
      //  console.log("Successfully sent message with id %s to recipient %s",
      //      messageId, recipientId);
      //} else {
      //  console.log("Successfully called Send API for recipient %s",
      //      recipientId);
      //}
    } else {
        console.log(body.error);
        saveLogChatMessage(params, message_type, BOT_TYPE, messageData.message, now, '', 1, body.error);
    }
  });
}

function callSendAPICallback(params, message_type, message, index, callback) {
    var messageData = {
        recipient: {
            id: params.user_id
        },
        message: message
    };
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: params.page_access_token },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        var now = new Date();
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
            saveLogChatMessage(params, message_type, BOT_TYPE, messageData.message, now);
            //if (messageId) {
            //    console.log("Successfully sent message with id %s to recipient %s",
            //        messageId, recipientId);
            //} else {
            //    console.log("Successfully called Send API for recipient %s",
            //        recipientId);
            //}
        } else {
            saveLogChatMessage(params, message_type, BOT_TYPE, messageData.message, now, '', 1, body.error);
        }
        index++;
        return callback(index);
    });
}

function callSendAPIChatworkCallback(params, message_type, message, index, callback) {

    if(typeof message.text === 'undefined' || message.text.length == 0){
        return;
    }
    var headers = {
        'X-ChatWorkToken': params.page_access_token
    };
    request({
        uri: 'https://api.chatwork.com/v2/rooms/' + params.page_id + '/messages',
        method: 'POST',
        headers: headers,
        form: {'body': message.text}
    }, function (error, response, body) {
        var now = new Date();
        if (!error && response.statusCode == 200) {

        } else {

            console.log("error");
        }
        index++;
        return callback(index);
    });
}

function callSendLineReplyAPI(params, message_type, messageData) {
    var headers = {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + params.page_access_token
    };

    request({
        uri: "https://api.line.me/v2/bot/message/reply",
        method: 'POST',
        headers: headers,
        json: messageData
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            saveLogChatMessage(params, message_type, BOT_TYPE, messageData.messages, new Date());
        } else {
            saveLogChatMessage(params, message_type, BOT_TYPE, messageData, new Date(), '', 1, body);
        }
    });
}

function callSendLinePushAPI(params, message_type, messageData) {
    var headers = {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + params.page_access_token
    };
    request({
        uri: "https://api.line.me/v2/bot/message/push",
        method: 'POST',
        headers: headers,
        json: messageData
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            saveLogChatMessage(params, message_type, BOT_TYPE, messageData.messages, new Date());
        } else {
            saveLogChatMessage(params, message_type, BOT_TYPE, messageData.messages, new Date(), '', 1, body);
        }
    });
}

function callSendLineMulticastAPI(params, message_type, messageData) {
    var headers = {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + params.page_access_token
    };
    request({
        uri: "https://api.line.me/v2/bot/message/multicast",
        method: 'POST',
        headers: headers,
        json: messageData
    }, function (error, response, body) {
        //if (!error && response.statusCode == 200) {
        //    var muiticast_user_arr = messageData.to;
        //    console.log("muiticast_user_arr=");
        //    console.log(muiticast_user_arr);
        //    //for(var i  = 0; i < muiticast_user_arr.length; i++){
        //    //    //var copy = Object.assign({}, params);
        //    //    params.user_id = muiticast_user_arr[i];
        //    //    saveLogChatMessage(params, message_type, BOT_TYPE, messageData.messages, new Date());
        //    //}
        //} else {
        //    //saveLogChatMessage(params, message_type, BOT_TYPE, messageData.messages, new Date(), '', 1, body);
        //}
    });
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */

function saveNotificationHistory(connect_page_id, page_id, notification_id, data, user_list, send_count, push_time){
  var now = new Date();
  var notificationHistory = new NotificationHistory({
    connect_page_id: connect_page_id,
    page_id: page_id,
    notification_id: notification_id,
    data: data,
    send_count: send_count,
    user_list: user_list,
    read_count: 0,
    time_of_message: now.getTime(),
    push_time: push_time,
    created_at : now,
    updated_at : now
  });
  notificationHistory.save(function(err) {
    if (err) throw err;
  });
}

function updateNotification(params){
    var now = new Date();
    UserProfile.findOneAndUpdate({ connect_page_id: params.connect_page_id, user_id:  params.user_id}, { $set: {last_active_at: now.getTime(), updated_at : now}}, { upsert: false }, function(err, result) {
        if (err) throw err;
        if(result){
            NotificationHistory.update({ connect_page_id: result.connect_page_id, 'user_list' : [result.user_id], time_of_message : { $gte: result.last_active_at } }, { $inc: {read_count: 1} },
                { upsert: false, multi: true }, function(err) {
                });
        }
    });
}

function updateBotLastTime(connect_page_id, user_id){
    var now = new Date();
    BotLastTime.findOneAndUpdate({ connect_page_id: connect_page_id, user_id: user_id}, { $set: {last_time: now, updated_at : now}}, { upsert: false }, function(err, result) {
        if (err) throw err;
    });
}

function updateUserLastTime(connect_page_id, user_id){
    var now = new Date();
    UserProfile.findOneAndUpdate({ connect_page_id: connect_page_id, user_id: user_id}, { $set: {last_active_at: now.getTime(), updated_at : now, start_flg: 1}}, { upsert: false }, function(err, result) {
        if (err) throw err;
    });
}

function saveUserProfileWebchat(params){
    var now = new Date();
    if(params.connect_page_id && params.user_id){
        UserProfile.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id }, function(err, result) {
            if (err) throw err;
            if(result){
                result.current_url = params.current_url;
                result.last_active_at = now.getTime();
                result.updated_at = now;
                result.user_locale = params.language;
                if(typeof params.start_flg !== 'undefined'){
                    result.start_flg = params.start_flg;
                }
                result.save();
            }else{
                UserProfile.find({connect_page_id : params.connect_page_id, preview_flg: null}).count(function (err, count) {
                    var userProfile = new UserProfile({
                        connect_page_id: params.connect_page_id,
                        page_id: params.page_id,
                        user_id: params.user_id,
                        user_full_name : params.user_full_name,
                        user_email : params.user_email,
                        number_index : count + 1,
                        last_active_at: now.getTime(),
                        user_referral: params.ref,
                        current_url: params.current_url,
                        user_locale: params.language,
                        start_flg: (typeof params.start_flg !== 'undefined') ? params.start_flg : 0,
                        preview_flg:  (typeof params.preview_flg !== 'undefined' &&  params.preview_flg != null) ? 1 : undefined,
                        created_at : now,
                        updated_at : now
                    });
                    userProfile.save(function(err) {
                        if (err) throw err;
                        //send event to conversation
                        io.to(params.connect_page_id).emit('receive_new_user', userProfile);
                        if(!params.limit_user_chat){
                            if(params.sns_type == SNS_TYPE_EFO){
                                params.new_conversation_flg = 1;
                                connectScenarioEfo(params);
                                return;
                            }
                            connectScenario(params);
                        }
                    });
                });
            }
        });
    }
}

function saveUserProfile(params, referral){
  UserProfile.findOne({ connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
    if (err) throw err;
      var ref = ((typeof referral !== 'undefined') ? referral.ref+'' : '');
      callSendAPIGetUserProfile(params, referral, result);
  });
}

function saveUserLineProfile(params, page_access_token){
    //console.log("saveUserLineProfile = " + page_access_token);
    UserProfile.findOne({ connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
        if (err) throw err;
        callAPILineGetUserProfile(params, page_access_token, result);
    });
}

function saveLogChatMessage(params, message_type, type, message, time_of_message, payload, error_flg, error_message){
  var now = new Date();
    if(params.preview_flg == undefined &&  params.sns_type != SNS_TYPE_CHATWORK && params.sns_type != SNS_TYPE_EFO && (!error_flg || params.background_flg != 1)){
        var date = moment().tz(TIMEZONE).format("YYYY-MM-DD"); //dateFormat(now, "yyyy-mm-dd");
        UserProfile.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
            if (err) throw err;
            if(result){
                if(typeof result.last_time_at !== "undefined") {
                    var last_time_at = new Date(result.last_time_at);
                    var diff = timediff(last_time_at, now , 'S');
                    var before_date = moment(last_time_at).tz(TIMEZONE).format("YYYY-MM-DD"); //dateFormat(last_time_at, "yyyy-mm-dd");
                    if(diff.seconds > 1800 && result.get_session_flg != 1){
                        SessionUser.update({connect_page_id: params.connect_page_id, user_id: result.user_id, date: before_date}, {$inc: {session_no: 1}, $set: {updated_at : now}, $setOnInsert: {created_at: now}  },
                            {upsert: true, multi: false}, function (err) {
                            });
                        SessionScenario.update({connect_page_id: params.connect_page_id, scenario_id: result.scenario_id, date: before_date}, {$inc: {session_no: 1}, $set: {updated_at : now}, $setOnInsert: {created_at: now}  },
                            {upsert: true, multi: false}, function (err) {
                            });
                    }
                }
            }
            //else{
            //    SessionUser.update({connect_page_id: params.connect_page_id, user_id: params.user_id, date: date}, {$inc: {session_no: 1}, $set: {updated_at : now}, $setOnInsert: {created_at: now}  },
            //        {upsert: true, multi: false}, function (err) {
            //            if (err) throw err;
            //        });
            //}
            console.log("type=" + type);
            if(type == USER_TYPE){
                UserProfile.update({connect_page_id: params.connect_page_id, user_id: params.user_id}, {$inc: {unread_cnt: 1}, $set: {get_session_flg: 0, scenario_id: params.current_scenario_id, last_time_at: now.getTime(), updated_at : now}, $setOnInsert: {created_at: now}  },
                    {upsert: false, multi: false}, function (err) {
                        if (err) throw err;
                    });
            }else if(result){
                result.scenario_id = params.current_scenario_id;
                result.last_time_at = now.getTime();
                result.get_session_flg = 0;
                result.save();
            }
        });
    }

   var insert_data = {
       connect_page_id: params.connect_page_id + "",
       page_id: params.page_id,
       user_id: params.user_id,
       scenario_id: params.current_scenario_id,
       message_type: message_type,
       notification_id: params.notification_id,
       type: type,
       message: message,
       input_requiment_flg:  (( typeof params.input_requiment_flg !== 'undefined') ? params.input_requiment_flg : undefined),
       time_of_message: time_of_message,
       payload:  (( typeof payload !== 'undefined') ? payload : ''),
       error_flg: error_flg,
       background_flg: (message_type == BOT_TYPE_MAIL) ? 1 : params.background_flg,
       user_said: ((typeof params.user_said !== 'undefined') ? params.user_said : undefined),
       bid: ((typeof params.bid !== 'undefined') ? params.bid : undefined),
       b_position: ((typeof params.b_position    !== 'undefined') ? params.b_position : undefined),
       error_message: error_message,
       btn_next: ((typeof params.btn_next !== 'undefined') ? params.btn_next : undefined),
       created_at : now,
       updated_at : now
   };


  params.background_flg = undefined;
  //collection(params.connect_page_id + "_logs").insertOne(insert_data);
  var logChatMessage;
  if(params.sns_type == SNS_TYPE_CHATWORK){
      insert_data.room_id = params.page_id;
      insert_data.page_id = undefined;
      insert_data.time_of_message = undefined;
      insert_data.send_time = time_of_message;
      insert_data.message_id = params.message_id;
      logChatMessage = new LogChatMessage(insert_data);
      logChatMessage.save(function(err) {
          if (err) throw err;
          if(logChatMessage.background_flg != 1){

          }
      });
  }
  else if(params.sns_type == SNS_TYPE_EFO){
      var logCollection = params.logCollection;
      if(!logCollection){
          logCollection = CreateModelLogForName(params.connect_page_id + "_logs");
      }
      logChatMessage = new logCollection(insert_data);
      logChatMessage.save(function(err) {
          if (err) throw err;
          if(logChatMessage.background_flg != 1){
              if( (params.sns_type == SNS_TYPE_WEBCHAT || params.sns_type == SNS_TYPE_EFO) && params.start_flg){
                  logChatMessage.start_flg = 1;
              }

              if(params.preview_flg === undefined){
                  io.to(params.connect_page_id).emit('receive_new_message', logChatMessage);
              }
              if(params.sns_type == SNS_TYPE_EFO){
                  if(typeof params.question_count !== "undefined"){
                      logChatMessage.question_count = params.question_count;
                  }
                  io.to(params.user_id).emit('efo_bot_send_message', logChatMessage);
              }
          }
      });
  }else{
      logChatMessage = new LogChatMessage(insert_data);
      logChatMessage.save(function(err) {
          if (err) throw err;
          if(logChatMessage.background_flg != 1){
              if( (params.sns_type == SNS_TYPE_WEBCHAT || params.sns_type == SNS_TYPE_EFO) && params.start_flg){
                  logChatMessage.start_flg = 1;
              }
              if(params.preview_flg === undefined){
                  io.to(params.connect_page_id).emit('receive_new_message', logChatMessage);
              }
              if(params.sns_type == SNS_TYPE_EFO){
                  if(typeof params.question_count !== "undefined"){
                      logChatMessage.question_count = params.question_count;
                  }
                  io.to(params.user_id).emit('efo_bot_send_message', logChatMessage);
              }
              if(params.sns_type == SNS_TYPE_WEBCHAT){
                  if(type == USER_TYPE && payload){
                      //console.log(logChatMessage);
                      io.to(params.user_id).emit('webchat_bot_send_message', {message: logChatMessage.message,
                          log_message_id: logChatMessage._id, type: USER_TYPE, message_type: MESSAGE_USER_PAYLOAD, user_id: params.user_id, connect_page_id: params.connect_page_id});
                  }else if(type == BOT_TYPE){
                      io.to(params.user_id).emit('webchat_bot_send_message', {message: logChatMessage.message,
                          log_message_id: logChatMessage._id, type: BOT_TYPE, user_id: params.user_id, connect_page_id: params.connect_page_id});
                  }
              }
              if(params.keyword_scenario_id){
                  params.current_scenario_id = params.keyword_scenario_id;
                  params.keyword_scenario_id = undefined;
                  connectScenario(params);
              }
          }
      });
  }

}

function saveUserCoordinates(params, coordinates) {
    //console.log("saveUserCoordinates");
    //console.log(coordinates);
    UserProfile.findOneAndUpdate({ connect_page_id: params.connect_page_id, user_id: params.user_id}, { $set: {user_lat: coordinates.lat, user_long: coordinates.long, updated_at: new Date()}}, {upsert: false }, function(err, result) {
    });
}

function saveUserPosition(params, position) {
    //console.log("saveUserPosition");
  var now = new Date();
  var date = moment().tz(TIMEZONE).format("YYYY-MM-DD"); //dateFormat(now, "yyyy-mm-dd");

  if(params.sns_type == SNS_TYPE_EFO){

      var logEfoCvCollection = params.logEfoCvCollection;
      if(!logEfoCvCollection){
          logEfoCvCollection = CreateModelEfoCvForName(params.connect_page_id + "_efo_cvs");
      }

      logEfoCvCollection.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id, scenario_id: params.current_scenario_id}, function(err, result) {
          if(result){
              if(position != -1){
                  result.position = position;
              }
              result.cv_flg = params.cv_flg;
              if(params.cv_flg == 1){
                  result.cv_time = timediff(result.created_at, now , 'S').seconds;
                  var minutes = Math.floor(result.cv_time / 60);
                  result.cv_minute = minutes;
                  if(minutes > 10){
                      result.cv_minute = 11;
                  }
              }
              result.date = date;
              result.updated_at = now;
              result.save();
          }else{
              var efoCv = new logEfoCvCollection({
                  connect_page_id: params.connect_page_id,
                  user_id: params.user_id,
                  scenario_id : params.current_scenario_id,
                  position : position,
                  cv_flg : params.cv_flg,
                  date : date,
                  updated_at : now,
                  created_at : now,
                  browser: params.browser,
                  device: params.device,
                  os: params.os,
                  lang: params.lang,
                  answer_count: 0,
                  preview_flg:  (typeof params.preview_flg !== 'undefined' &&  params.preview_flg != null) ? 1 : undefined

              });
              efoCv.save();
          }
      });
  }else if(params.sns_type == SNS_TYPE_CHATWORK){
      RoomList.update({connect_page_id: params.connect_page_id, room_id: params.page_id}, {$set: {scenario_id: params.current_scenario_id, position: position, updated_at : now}, $setOnInsert: {created_at: now}},
          {upsert: true, multi: true}, function (err) {
              if (err) throw err;
          });
  }
  else{
      UserPosition.update({connect_page_id: params.connect_page_id, user_id: params.user_id}, {$set: {page_id: params.page_id, scenario_id: params.current_scenario_id, position: position, updated_at : now}, $setOnInsert: {created_at: now}},
          {upsert: true, multi: true}, function (err) {
              if (err) throw err;
          });
  }
}

function updateEfoPosition(params, position, callback) {
    var logEfoCvCollection = params.logEfoCvCollection;
    if(!logEfoCvCollection){
        logEfoCvCollection = CreateModelEfoCvForName(params.connect_page_id + "_efo_cvs");
    }
    if(params.question_edit_flg){
        var now = new Date();
        logEfoCvCollection.update({connect_page_id: params.connect_page_id, user_id: params.user_id, scenario_id: params.current_scenario_id}, {$set: {answer_count: params.question_answer_count, position: position, updated_at : now}, $setOnInsert: {created_at: now}},
            {upsert: false, multi: false}, function (err) {
                return callback(true);
            });

        //UserPosition.update({connect_page_id: params.connect_page_id, user_id: params.user_id}, {$set: {position: position, updated_at : now}, $setOnInsert: {created_at: now}},
        //    {upsert: false, multi: false}, function (err) {
        //
        //    });
    }else{
        logEfoCvCollection.update({connect_page_id: params.connect_page_id, user_id: params.user_id, scenario_id: params.current_scenario_id}, {$set: {answer_count: params.question_answer_count}},
            {upsert: false, multi: false}, function (err) {
                return callback(true);
            });
    }

}

function getCountQuestionEfo(variable_arr, question_answer_count, current_scenario_id, user_id, position){
    BotMessage.find({ scenario_id: current_scenario_id, position: {$gte: position}}, {}, {sort: {position: 1}}, function(err, result) {
        if (err) throw err;
        if(result && result.length > 0){
            var cnt = 0;
            result.forEach(function (row) {
                if(row.message_type == MESSAGE_USER){
                    var isMatch = checkFilterEfo(variable_arr, row);
                    //console.log("isMatch=" + isMatch);
                    if(isMatch){
                        cnt++;
                    }
                }
            });
            io.to(user_id).emit('efo_bot_send_question_count', {"question_count" : cnt + question_answer_count});
        }else{
            //console.log("cnt=" + (cnt + question_answer_count));
            io.to(user_id).emit('efo_bot_send_question_count', {"question_count" : question_answer_count});
        }
    });
}

function callSendAPIGetUserProfile(params, referral, profile) {
  request({
    uri: 'https://graph.facebook.com/v2.6/' + params.user_id,
    qs: { access_token: params.page_access_token, fields: 'first_name,last_name,profile_pic,locale,timezone,gender' },
    method: 'GET'
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      var now = new Date();
      var first_name = ((typeof body.first_name !== 'undefined') ? body.first_name : '');
      var last_name = ((typeof body.last_name !== 'undefined') ? body.last_name : '');
      var ref =  ((typeof referral !== 'undefined') ? referral.ref+'' : '');


      if(profile){
          console.log("update callSendAPIGetUserProfile");
          UserProfile.update({connect_page_id: params.connect_page_id, user_id: params.user_id}, {$set: {
                  page_id: params.page_id,
                  user_first_name : first_name,
                  user_last_name : last_name,
                  user_full_name : first_name + " " +last_name,
                  profile_pic : ((typeof body.profile_pic !== 'undefined') ? body.profile_pic : ''),
                  user_locale : ((typeof body.locale !== 'undefined') ? body.locale : ''),
                  user_timezone : ((typeof body.timezone !== 'undefined') ? body.timezone : -100),
                  user_gender : ((typeof body.gender !== 'undefined') ? body.gender : ''),
                  is_payment_enabled : ((typeof body.is_payment_enabled !== 'undefined') ? body.is_payment_enabled : ''),
                  user_referral: ref,
                  user_referral_all: referral,
                  updated_at : now
              }},
              {upsert: false, multi: false}, function (err) {
                  if (err) throw err;
                  if(params.payload && params.payload == "GET_STARTED_PAYLOAD"){
                      connectScenario(params);
                  }
              });
      }else{
          console.log("insert callSendAPIGetUserProfile");
          var userProfile = new UserProfile({
              connect_page_id: params.connect_page_id,
              page_id: params.page_id,
              user_id: params.user_id,
              user_first_name : first_name,
              user_last_name : last_name,
              user_full_name : first_name + " " +last_name,
              profile_pic : ((typeof body.profile_pic !== 'undefined') ? body.profile_pic : ''),
              user_locale : ((typeof body.locale !== 'undefined') ? body.locale : ''),
              user_timezone : ((typeof body.timezone !== 'undefined') ? body.timezone : -100),
              user_gender : ((typeof body.gender !== 'undefined') ? body.gender : ''),
              is_payment_enabled : ((typeof body.is_payment_enabled !== 'undefined') ? body.is_payment_enabled : ''),
              user_referral: ref,
              user_referral_all: referral,
              user_lat: '',
              user_long: '',
              last_active_at: now.getTime(),
              created_at : now,
              updated_at : now
          });
          userProfile.save(function(err) {
              if (err) throw err;
              io.to(params.connect_page_id).emit('receive_new_user', userProfile);
              if(params.payload && params.payload == "GET_STARTED_PAYLOAD"){
                  connectScenario(params);
              }
          });
      }
        try {
            var obj = JSON.parse(ref);
            Object.keys(obj).forEach(function(key) {
                var val = obj[key];
                saveRefToVariable(params, key, val);
            });
        } catch (ex) {
        }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

function saveRefToVariable(params, variable_name, variable_value){
    console.log("saveRefToVariable");
    Variable.findOne({  connect_page_id: params.connect_page_id, variable_name: variable_name}, function(err, result) {
        if(result){
            var now = new Date();
            MessageVariable.update({connect_page_id: result.connect_page_id, user_id: params.user_id, variable_id: result._id}, {$set: {page_id: params.page_id, variable_value: variable_value, created_at : now, updated_at : now}},
                {upsert: true, multi: false}, function (err) {
                });
        }
    });
}

function callAPILineGetUserProfile(params, page_access_token, profile) {
    var headers = {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + page_access_token
    };
    request({
        uri: 'https://api.line.me/v2/bot/profile/' + params.user_id,
        headers: headers,
        method: 'GET',
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var now = new Date();
            if(profile){
                UserProfile.update({connect_page_id: params.connect_page_id, user_id: params.user_id}, {$set: {
                        page_id: params.page_id,
                        user_display_name : body.displayName,
                        user_status_message: body.statusMessage,
                        profile_pic : ((typeof body.pictureUrl !== 'undefined') ? body.pictureUrl : ''),
                        unfollow_at : null,
                        last_active_at: now.getTime(),
                        updated_at : now
                    }},
                    {upsert: false, multi: false}, function (err) {
                        if (err) throw err;
                        connectScenario(params);
                    });
            }else{
                //console.log("insert line callSendAPIGetUserProfile");
                var userProfile = new UserProfile({
                    connect_page_id: params.connect_page_id,
                    page_id: params.page_id,
                    user_id: params.user_id,
                    user_display_name : body.displayName,
                    user_status_message: body.statusMessage,
                    profile_pic : ((typeof body.pictureUrl !== 'undefined') ? body.pictureUrl : ''),
                    user_lat: '',
                    user_long: '',
                    last_active_at: now.getTime(),
                    unfollow_at : null,
                    created_at : now,
                    updated_at : now
                });
                userProfile.save(function(err) {
                    if (err) throw err;
                    connectScenario(params);
                    io.to(params.connect_page_id).emit('receive_new_user', userProfile);
                });
            }

        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}

function getApiConnect(params, api_id){
  console.log("getApiConnect");
  ApiConnect.findOne({_id: api_id}, function(err, apiResult) {
    if (err) throw err;
    if (apiResult) {
      var send_data = {};
      var url_params = apiResult.request;
      if(url_params && url_params.length > 0){
          var variable_id_arr1 = [];
          var variable_id_arr2 = [];
          for (var i=0, size = url_params.length; i < size; i++) {
              var api_key = url_params[i].param.toString();
              var api_variable = url_params[i].value.toString();
              var api_variable_type =  url_params[i].variable_type.toString();
              if(api_variable_type == "002"){
                  send_data[api_key] = api_variable;
              }
              else if(typeof params.user_variable[api_variable] !== "undefined"){
                  send_data[api_key] = params.user_variable[api_variable];
              }
          }
      }
      apiResult.params = send_data;
      if(apiResult.api_type == API_TYPE_VARIABLE){
          removeVariableWhenFullSlotVariable(params);
          setTimeout(function() {
              sendRequestApi(params, apiResult, send_data);
          }, 500);
          return;
      }
      sendRequestApi(params, apiResult, send_data);
    }
  });
}
//getTmp("4+BueivP4OrUMDvzVkI0Nxuzygad5JCPrBV+6zkOl3MKj+eXp9tfhjpWau6DXNCEAJuUbsXctiVTpYxq13G0ylaTzKZFpcOQSkslmzb3SJ4oUZv3r8n4v/fytnbNcKdS/YYfchD8ZoH++Pz7zIUEegdB04t89/1O/w1cDnyilFU=");
//
//function getTmp(page_access_token){
//    var headers = {
//        'Content-Type':'application/x-www-form-urlencoded'
//    };
//    request({
//        uri: 'https://api.line.me/v2/oauth/verify',
//        qs: { access_token: page_access_token},
//        headers: headers,
//        method: 'POST',
//        json: true
//    }, function (error, response, body) {
//        console.log(body);
//        if (!error && response.statusCode == 200) {
//        } else {
//            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
//        }
//    });
//    });
//}

function sendRequestApiEfo(result, send_data, callback){
    console.log("sendRequestApiEfo");

    var request_params = {
        uri: result.url,
        method: result.method,
        json: send_data
    };

    if(result.method == "GET"){
        request_params = {
            uri: result.url,
            method: result.method,
            qs: send_data,
            json: true
        };

    }

    request(request_params, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                console.log(body);
                return callback(false, body);
            } catch(e) {
                return callback(true);
                console.error("Failed getApiConnect ");
            }
        } else {
            console.error("Failed getApiConnect ");
            return callback(true);

        }
    });
}

function sendRequestApi(params, result, send_data){
    console.log("sendRequestApi");
    //console.log(params.user_variable);
    //console.log(result);
    //console.log(send_data);
    send_data.sessionId = params.connect_page_id + "_" + params.user_id;

    var messageData = {
        uri: result.url,
        method: result.method,
        json: send_data
    };

    var request_params = {
        uri: result.url,
        method: result.method,
        json: send_data
    };

    if(result.method == "GET"){
         messageData = {
            uri: result.url,
            method: result.method,
            qs: send_data
        };
        request_params = {
            uri: result.url,
            method: result.method,
            qs: send_data,
            json: true
        };

    }
    params.background_flg = 1;
    saveLogChatMessage(params, BOT_TYPE_API, BOT_TYPE, messageData, new Date());

    request(request_params, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                if(result.api_type == API_TYPE_DIRECT){
                    if(body && body.message){
                        if(params.sns_type == SNS_TYPE_LINE){
                            var tmp = params.nosend_messages;
                            tmp.push(body.message);
                            params.nosend_messages = tmp;
                        }
                        else {
                            sendMessage(params, BOT_TYPE_API, body.message);
                        }
                        if(body.repeat_flg){
                            params.current_scenario_id = params.current_user_position.scenario_id;
                            saveUserPosition(params, params.current_user_position.position);
                        }
                    }
                }else if(result.api_type == API_TYPE_VARIABLE){
                    var api_response = result.response;
                    if(api_response && api_response.length > 0){
                        api_response.forEach(function(row) {
                            if(body && body[row.param]){
                                saveQuickReplyToVariable(params, row.value, body[row.param]);
                            }
                        });
                    }
                    setTimeout(function() {
                        checkSlotVariable(params);
                    }, 1000);
                }
            } catch(e) {
                console.error("Failed getApiConnect ");
            }
        } else {
            console.error("Failed getApiConnect ");
        }
        if(typeof params.remain_data !== 'undefined'){
            var remain_arr = params.remain_data;
            if(remain_arr.length > 0){
                params.remain_data = undefined;
                if(params.sns_type == SNS_TYPE_FACEBOOK){
                    if(params.conversation_flg){
                        setTimeout(function() {
                            sendMessageConversationFacebook(params, remain_arr);
                        }, 1500);
                    }else{
                        setTimeout(function() {
                            sendMultiMessage(params, remain_arr, params.remain_position);
                        }, 1500);
                    }
                }else if(params.sns_type == SNS_TYPE_LINE){
                    if(params.conversation_flg){
                        setTimeout(function() {
                            sendMessageConversationLine(params, remain_arr);
                        }, 500);
                    }else{
                        setTimeout(function() {
                            sendMultiMessageLine(params, remain_arr, params.remain_position, params.nosend_messages);
                        }, 500);
                    }
                    return;
                }
            }
        }
        if(params.sns_type == SNS_TYPE_LINE && params.nosend_messages && params.nosend_messages.length > 0){
            if(params.conversation_flg){
                setTimeout(function() {
                    sendMessage(params, BOT_TYPE_API, params.nosend_messages);
                }, 500);
            }else{
                setTimeout(function() {
                    sendMessage(params, BOT_TYPE_API, params.nosend_messages);
                }, 500);
            }
        }
    });
}

function removeVariableWhenFullSlotVariable(params){
    Slot.findOne({ connect_page_id: params.connect_page_id}, function(err, result) {
        if (err) throw err;
        if(result){
            var items = result.item;
            if(items && items.length > 0){
                var isFullVariable = true;
                var variables = [];
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    variables.push(item.variable);
                    if(isFullVariable && !params.user_variable[item.variable]){
                        isFullVariable = false;
                    }
                }
                console.log(variables);
                if(isFullVariable){
                    MessageVariable.remove({ connect_page_id: params.connect_page_id, user_id:  params.user_id, variable_id :{ "$in" : variables}}, function(err, result) {
                        if (err) throw err;
                    });
                }
            }
        }
    });
}

function checkSlotVariable(params){
    getAllVariableValue(params, function (err, result1) {
        params.user_variable = result1.variable_result;
        params.preview_flg = result1.preview_flg;
        Slot.findOne({ connect_page_id: params.connect_page_id}, function(err, result) {
            if (err) throw err;
            if(result){
                var items = result.item;
                if(items && items.length > 0){
                    var isFullVariable = true;
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        if(!params.user_variable[item.variable]){
                            isFullVariable = false;
                            var question = convertTextMessage(params.sns_type, item.question);
                            sendMessage(params, BOT_TYPE_TEXT, question);
                            params.current_scenario_id = params.current_user_position.scenario_id;
                            saveUserPosition(params, params.current_user_position.position);
                            break;
                        }
                    }
                    if(isFullVariable){
                        connectActionSlotVariable(params, result);
                    }
                }
            }
        });
    });
}

function connectActionSlotVariable(params, slot_result){
    if(slot_result.action == SLOT_ACTION_SCENARIO){
        params.current_scenario_id = slot_result.action_data;
        params.connect_scenario_id = undefined;
        connectScenario(params);
    }
}

function subscribedApps(page_access_token){
    request({
        uri: 'https://graph.facebook.com/v2.6/me/subscribed_apps',
        qs: { access_token: page_access_token },
        method: 'POST',
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("subscribedApps SUCCESS");
        } else {
            console.error("subscribedApps failed ", page_access_token);
        }
    });
}

function setGreetingMessage(greeting, page_access_token){
    var messageData = {
        "greeting":[
            {
                "locale":"default",
                "text":greeting
            }
        ]
    };
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
        qs: { access_token: page_access_token },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("setGreetingMessage SUCCESS");
        } else {
            console.error("setGreetingMessage failed ", page_access_token);
        }
    });
}

function unsetGreetingMessage(page_access_token){
    var messageData = {
        "fields":[
            "greeting"
        ]
    };
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
        qs: { access_token: page_access_token },
        method: 'DELETE',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("unsetGreetingMessage SUCCESS");
        } else {
            console.error("unsetGreetingMessage failed ", page_access_token);
        }
    });
}

function startButton(page_access_token){
    var messageData = {
        "get_started":{
            "payload":"GET_STARTED_PAYLOAD"
        }
    };
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messenger_profile',
        qs: { access_token: page_access_token },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("GET_STARTED_PAYLOAD SUCCESS");
        } else {
            console.error("GET_STARTED_PAYLOAD failed ", page_access_token);
        }
    });
}

function isEmpty (value, trim) {
    return value === void 0 || value === null || value.length === 0 || (trim && $.trim(value) === '');
}

function showListRoom(socket) {
    if(isEmpty(socket.rooms)){
        console.log('room empty or error');
        return;
    }
    var rooms = Object.keys(socket.rooms);
    console.log('room current', rooms);
}

function resetUnreadMessage(params) {
    var now = new Date();
    UnreadMessage.findOne({room_id: params.room_id, user_id: params.user_id}, function(err, result) {
        if(err){
            if (err) throw err;
        }
        // Nếu tìm thấy reset
        if(result){
            result.count = 0;
            result.save();
        }
    });
}

function findClientsSocket(socket, roomId, user_id, namespace) {
    // console.log('socket', socket);
    // var client = socket.adapter.rooms;
    var client = socket.adapter.rooms[roomId].sockets;
    var client_key = Object.keys(client);
    var room_list = socket.rooms;
    // console.log('io.sockets.clients()', socket.rooms());
    // console.log('io.sockets.clients(room)', socket.rooms(roomId));
    console.log('room_id', roomId, 'client', client, 'client_key', client_key, 'room_list', room_list, 'UserIdsArr', UserIdsArr);
    // socket.adapter.rooms
    return;
    var res = []
        // the default namespace is "/"
        , ns = io.of(namespace ||"/");

    if (ns) {
        for (var id in ns.connected) {
            if(roomId) {
                var index = ns.connected[id].rooms.indexOf(roomId);
                if(index !== -1) {
                    res.push(ns.connected[id]);
                }
            } else {
                res.push(ns.connected[id]);
            }
        }
    }
    return res;
}

function setNickNameSocket(socket, user_id, callback) {
    console.log('socket_id ', socket.id);
    var nickname_current = socket.nickname;
    var result = false;
    if(user_id && mongoose.Types.ObjectId(user_id)){
        if(isEmpty(nickname_current)){
            socket.nickname = user_id;
            UserIdsArr[user_id] = socket.id;
            result = true;
            console.log('nickname set', user_id);
        }else if(!isEmpty(nickname_current) && nickname_current == user_id){
            result = true;
            console.log('nickname allway', user_id);
        }
    }
    return callback(result);
}

function getUserNotExistsRoom(socket, room_id, member, callback){
    var user_id_not_arr = removeArrayDuplicates(member);
    var client_in_room = [];
    if(room_id && mongoose.Types.ObjectId(room_id)){
        var clients = socket.adapter.rooms[room_id];
        if(!isEmpty(clients) && !isEmpty(clients.sockets) && !isEmpty(UserIdsArr)){
            console.log('---check usser in room is room----- ');
            clients = clients.sockets;
            if(!isEmpty(clients)){
                console.log('UserIdsArr ', UserIdsArr, 'client', clients);
                for(var i = 0; i < member.length; i++){
                    var user_item = member[i];
                    console.log('user_item: ', i, user_item);
                    if(!isEmpty(UserIdsArr[user_item])){
                        console.log('user ', user_item, 'dang online');
                        var client_id_check = UserIdsArr[user_item];
                        if(!isEmpty(clients[client_id_check]) && clients[client_id_check]){
                            user_id_not_arr = removeElementFromArray(user_id_not_arr, user_item);
                            console.log('user ', user_item, 'dang trong room');
                            client_in_room.push(user_item);
                        }else{
                            // user_id_not_arr = removeElementFromArray(user_id_not_arr, user_item);
                        }
                    }else{
                        console.log('trung hop la ');
                        // user_id_not_arr = removeElementFromArray(user_id_not_arr, user_item);
                        // client_in_room.push([user_item] = UserIdsArr[user_item];
                    }
                }
            }
        }
    }
    console.log('member not exits room', user_id_not_arr);
    return callback(user_id_not_arr, client_in_room);
}

function removeArrayDuplicates(num) {
    var x,
        len=num.length,
        out=[],
        obj={};

    for (x =0; x <len; x++) {
        obj[num[x]]=0;
    }
    for (x in obj) {
        out.push(x);
    }
    return out;
}

function removeElementFromArray(array, element) {
    var index = array.indexOf(element);

    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

function getNickNameSocket(socket, user_id) {

}

function checkUserKey(user_id, key){
    var room_obj = {};
    if(!isEmpty(KeyByRoom)){
        Object.keys(KeyByRoom).forEach(function (room_id) {
            var room = KeyByRoom[room_id];
            if(!isEmpty(room[user_id])){
                room[user_id] = key;
                KeyByRoom[room_id][user_id] = key;
                Object.keys(room).forEach(function (user_id) {
                    
                });
            }
        });
    }
    return;
}
// Cập nhật lại trạng thái user: is_login: false => true nếu login thành công
function validUserLogin(user_id, key, callback) {
    if(!isEmpty(user_id) && mongoose.Types.ObjectId(user_id) && !isEmpty(key)){
        User.findOneAndUpdate({_id: user_id, is_login: false, deleted_at: null}, { $set: { is_login: true } }, { new: true }, function(err, result) {
            if(!err && result){
                setUserKey('', user_id, key);
                setUserStatus(user_id);
                callback(true);
            }
        });
    }
    return callback(false);
}

// Cập nhật lại
function validAllUserOffline(user_id) {
    var user_room_key = {},
        room_id_arr = [];
    for (var room_id in UserRoom) {
        var room_current = UserRoom[room_id];
        if(!isEmpty(room_current[user_id])){
            room_id_arr.push(room_id);
        }
    }
    if(room_id_arr.length > 0){
        Room.find({_id: {$in: room_id_arr}, deleted_at: null}, function (err, rooms) {
            if(!err && rooms){
                rooms.forEach(function (row) {
                    var share_key = true;
                    if(!row[_user_id]){
                        share_key = false;
                    }
                });


                for (var _user_id in room_current) {

                }
                if(share_key){
                    //user_room_key[room_id] = UserRoom[room_id];
                    //call event user_share_key
                }

            }
        });
    }
    return user_room_key;
}

function checkUserRoomOnline(room_id) {
    console.log('----------------checkUserRoomOnline---------------------');
    console.log(room_id);
    var status = false;
    if(!isEmpty(UserRoom[room_id])){
        status = true;
        var room_current = UserRoom[room_id];
        for (var user_id in room_current) {
            if(!room_current[user_id]){
                status = false;
            }
        }
    }
    console.log('status', status);
    return status;
}

function setUserStatus(user_id) {
    console.log('----------------setUserStatus---------------------');
    console.log(user_id);
    var room_id_arr = [];
    for (var room_id in UserRoom) {
        var room_current = UserRoom[room_id];
        if(!isEmpty(room_current[user_id])){
            UserRoom[room_id][user_id] = true;
            room_id_arr.push(room_id);
        }
    }
    return room_id_arr;
}

function setUserKey(socket, user_id, key) {
    console.log('------------------setUserKey-----------------');
    console.log(socket, user_id, key);
    console.log('setUserKey', UserKey, UserKey[user_id]);
    if(isEmpty(UserKey[user_id])){
        UserKey[user_id] = key;
    }
}

function getUserRoomKey(room_id){
    var room_user_key = {};
    console.log('----------------getUserRoomKey---------------------');
    console.log(room_id);
    if(!isEmpty(UserRoom[room_id])){
        var room_current = UserRoom[room_id];
        console.log(UserKey, room_current, user_id);
        for (var user_id in room_current) {
            if(!isEmpty(UserKey[user_id]) && !isEmpty(room_current[user_id]) && room_current[user_id]){
                room_user_key[user_id] = UserKey[user_id]; 
            }else{
                console.log('user_share_key error room_id', room_id, 'room_current', room_current);
            }
        }
    }
    return room_user_key;
}

function setUserInRoom(room_id, user_id, user_status){
    if(!isEmpty(UserRoom[room_id]) && user_id){
        var room_current = UserRoom[room_id];
        if(!isEmpty(room_current[user_id])){
            UserRoom[room_id][user_id] = user_status;
        }
    }
}

function getUserInRoom(room_id) {
    var user_room = {};
    if(!isEmpty(UserRoom[room_id])){
        user_room = UserRoom[room_id];
    }
    return user_room;
}

function array_diff(a1, a2) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
        if (a2.indexOf(a1[i]) === -1) {
            result.push(a1[i]);
        }
    }
    return result;
}

function updateUserRoom(room_id, member){
    console.log('----------------update user room---------------------');
    var room_current = {};
    if(!isEmpty(UserRoom[room_id])){
        room_current = UserRoom[room_id];
    }
    for(var i = 0; i < member.length; i++){
        var status = true;
        if(isEmpty(UserKey[member[i]])){
            status = false;
        }
        room_current[member[i]] = status;
    }
    UserRoom[room_id] = room_current;
}

function deleteAllUserInRoom(room_id){
    console.log('-------------delete key in room------------');
    console.log('----', room_id, UserRoom[room_id]);
    if(!isEmpty(UserRoom[room_id])){
        var room_current = UserRoom[room_id];
        Object.keys(room_current).forEach(function(row) {
            if(!isEmpty(UserKey[row])){
                delete UserKey[row];
            }
        });
        delete UserRoom[room_id];
    }
}