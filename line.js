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
var Exception = model.Exception;
var UnreadMessage = model.UnreadMessage;
var LastMessage = model.LastMessage;

var moment = require('moment');

var date_format_global = 'YYYY-MM-DD HH:mm:ss';
var ymd_global = 'YYYY-MM-DD';
var date_format_mini_global = 'YYYY-MM-DD';

var kue = require('kue'),
    queue = kue.createQueue();

// các trường hợp disable log
var list_disable_show_log = [
	'user_typing'
];

var Room = model.Room;

/**
 * format queue_exchange_key: {
 *      to_client_id: [
 *          {
 *              time: time1,
 *              data_client: {
 *                  from_client_id: from_client_id,
 *                  to_client_id: to_client_id,....
 *              }
 *          },
 *          {
 *              time: time2,
 *              data_client: {
 *                  from_client_id: from_client_id,
 *                  to_client_id: to_client_id,....
 *              }
 *          },
 * }
 */

var queue_exchange_key = {};
var queue_time_exchange_key = 5;

const
    ADMIN_KEY_FLG_TRUE=1,
    ADMIN_KEY_FLG_FALSE=0,
    ADMIN_KEY_FLG_UNKNOW=-1;
const
    EXCEPTION_SEND_INFO = '001',
    EXCEPTION_SEND_ERROR = '002';

//var EfoCv = model.EfoCv;
var CreateModelLogForName = model.CreateModelLogForName;

var UserIdsArr = {};
var KeyByRoom = {};
// user đang có key secret nào
// format: {user_id_1: key_1; user_id_2: key_2}
var UserKey = {};
// trong room đang có user nào online, offline
// format: {room_id_1 : {user_id_1: true, user_id_2: false}, room_id_2: {user_id_2 : false, user_id_3: true}} ( true: user online, false: offline)
var UserRoom = {};
//format {user_id_1: 123456, user_id_2: 234567}
var UserTime = {};

const TIME_USER_LOGOUT = 5000;// 5 giây

const filter_variable = ["user_gender", "user_locale", "user_timezone", "user_referral"];

const cluster = require('cluster');
const os = require( "os" );
const numCPUs = os.cpus().length;

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
    USER_TIME_SAVE_LOG_NO = '000',
    USER_TIME_SAVE_LOG_ONE_DAY = '001',
    USER_TIME_SAVE_LOG_ONE_WEEK = '002',
    USER_TIME_SAVE_LOG_ONE_MONTH = '003',
    USER_TIME_SAVE_LOG_ONE_YEAR = '004';

const
    bodyParser = require('body-parser'),
    config = require('config'),
    express = require('express'),
    https = require('https'),
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

const server_url = config.get('serverURL');
redis.subscribe('notification');
redis.on("message", function(channel, message) {
    if(typeof cluster.worker !== "undefined" && typeof cluster.worker.id !== "undefined"){
        return;
    }
    var data = JSON.parse(message);
    logObject(data);
    data =data.data.arr_notification;
    data.forEach(function(row) {
        //logObject(row.connect_page_id + " " + row.page_access_token + " " + row.scenario_id);
        if(row.sns_type == SNS_TYPE_LINE){
            setPushMessageLine(row);
        }else{
            redisPublicMessage(row)
                .fail(function(){
                    logObject("fail");
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
var domain = config.get('domain');

if(APP_ENV == "dev" || APP_ENV == "staging" ){
    var options = {
        key: fs.readFileSync('/etc/letsencrypt/live/' + domain + '/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/'  + domain + '/cert.pem'),
        ca: fs.readFileSync('/etc/letsencrypt/live/'  + domain + '/chain.pem')
    };
    server = https.createServer(options, app, function(req, res) {
        res.end('worker: ' + cluster.worker.id);
    });
}

app.get('/captcha', function (req, res) {
    logObject('capchat');
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
//    logObject("Server listening at http://%s:%s", host, port)
//});
var svgCaptcha = require('svg-captcha');

if (!sticky.listen(server, config.get('socketPort'))) {
    // Master code
    server.once('listening', function() {
        logObject('server started on socket port', config.get('socketPort'));
    });
} else {
    app.set('port', process.env.PORT || config.get('appPort'));
    app.set('views', __dirname + '/public/assets/view');
    app.set('view engine', 'ejs');
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
        logObject("uncaughtException");
        logObject(err);
        saveException(err);
    });

    process.on('unhandledRejection', function (err) {
        logObject("unhandledRejection");
        logObject(err);
        saveException(err);
    });

    // socketIO check connection status
    io.on('connection', function (socket) {
        logObject(io.engine.clientsCount);
        logObject("client connected");
        logObject("connection worker =" + cluster.worker.id);

        socket.on('disconnect', function () {
            logObject('client disconnected');
        });

        socket.on('user_join', function (data) {
            logObject('----------------------------------socket user_join---------------------------', data);
            showListRoom(socket);
            var user_id = data.user_id;
            var admin_key_flg = data.admin_key_flg;
            if(admin_key_flg == void 0 || (!isEmpty(admin_key_flg) && !(admin_key_flg instanceof Array))){
                logObject('miss param admin_key_flg');
                return;
            }
            validUserIdPromise(data)
                .then(function(data_user_check){
                    logObject('data_user_check: ', data_user_check);
                    if(isEmpty(data_user_check) || isEmpty(data_user_check.error) || (data_user_check.error)){
                        logObject('data_user_check error', data_user_check.reason);
                        throw data_user_check;
                        return;
                    }
                    // set lai nickname cho socket
                    socket.nickname = user_id;
                    return Promise.all([
                        updateAdminKeyInRoomPromise(user_id, admin_key_flg),
                        userJoinRoomPromise(socket, user_id),
                        setNickNameSocketPromise(socket, user_id),
                        UpdateStatusUserInRoomPromise(user_id, true)
                    ]);
                })
                .then(function (data_object) {
                    let [admin_key_result, user_join_result, set_nick_result, update_status_user] = data_object;
                    logObject('---------','admin_key_result', admin_key_result, ', user_join_result', user_join_result, ', set_nick_result', set_nick_result, ', update_status_user', update_status_user);
                    if(isEmpty(admin_key_result) || admin_key_result.error || isEmpty(user_join_result) || user_join_result.error
                        || isEmpty(set_nick_result) || set_nick_result.error || isEmpty(update_status_user) || update_status_user.error){
                        throw data_object;
                    }
                    setUserTime(user_id);
                    var data_return = {
                        success: true,
                    };
                    io.to(user_id).emit('status_join', data_return);
                    return;
                })
                .catch(function(err){
                    err = getErrorException(err);
                    var data = {
                        success : false,
                        message : 'Co loi....'
                    };
                    sendEventSocket(user_id, 'status_join_room', data);
                    logObject('----error user_join', err)
                });
        });

        socket.on('user_join_room', function (data) {
            var user_id = data.user_id;
            logObject('----------------------------socket user_join_room-------------------------------', data);
            validRoom(data, function( error, room, param){
                if(!error && room){
                    userJoinRoom(socket, user_id, function(success){
                        if(success){
                            logObject('nick name before check', socket.nickname, 'user_id', user_id);
                            setNickNameSocket(socket, user_id, function(success){
                                setUserTime(user_id);
								UserIdsArr[user_id] = socket.id;
                                if(success){
                                    var data_result = {
                                        success: true,
                                        room_id: param.room_id,
                                        admin_id: room.admin_id,
                                        type: param.room_type,
                                        member: param.member,
                                        admin_key_flg: room.admin_key_flg,
                                    };
                                    userJoinRoom(socket, param.room_id, function (success) {
                                        logObject('userJoinRoom success', success);
                                        if(!success){
                                            updateUserRoom(param.room_id, param.user_id, false);
                                            logObject('send status false');
                                            data.success = false;
                                            data.message = "message.not_join_room ," + param.room_id;
                                            io.to(user_id).emit('status_join_room', data);
                                            return;
                                        }
                                        updateUserRoom(param.room_id, param.user_id, true);
                                        setUserTime(user_id);
                                        io.to(user_id).emit('status_join_room', data_result);
                                        resetUnreadMessage(param.room_id, user_id);
                                        return;
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });

        socket.on('user_send_message', function (data) {
            logObject("---------------------------------socket user_send_message data",data);
            var room_id = data.room_id;
            var user_id = data.user_id;
            var message_type = data.message_type;
            if(isEmpty(room_id) || isEmpty(user_id) || isEmpty(data.message_type)){
                logObject('data send empty');
                return;
            }
            userJoinRoom(socket, user_id, function(success){
                if(success){
                    setNickNameSocket(socket, user_id, function(success) {
                        if (success) {
							UserIdsArr[user_id] = socket.id;
                            logObject('******************setNickNameSocket ', UserIdsArr);
                            getRoom(data, function( error, result, params){
                                logObject("user_send_message error",error, result, params);
                                if(!error && result){
                                    if(!isEmpty(result.admin_key_flg) && !result.admin_key_flg){
                                        logObject('*********** room bi mat key nen ko chat duoc');
                                        return;
                                    }
                                    userJoinRoom(socket, params.room_id, function (success) {
                                        if(!success){
                                            data.success = false;
                                            data.message = "message.not_join_room ," + params.room_id;
                                            io.to(user_id).emit('status_join_room', data);
                                            return;
                                        }
                                        updateUserRoom(params.room_id, user_id, true);
                                        logObject('******************check userid arr ', UserIdsArr);
                                        getUserNotExistsRoom(params.room_id, params.member, function(user_id_not_arr, client_in_room){
                                            logObject('getUserNotExistsRoom', user_id_not_arr);
                                            user_id_not_arr = removeElementFromArray(user_id_not_arr, params.user_id);
                                            params.user_id_not_arr = user_id_not_arr;
                                            params.client_in_room = client_in_room;
                                            params.admin_id = result.admin_id;
                                            logObject('parama, ', params);
                                            switch (message_type){
                                                case USER_SEND_FILE:
                                                    var message = data.message;
                                                    if(!isEmpty(message) && Array.isArray(message)){
                                                        var msg = [];
                                                        message.forEach(function(row) {
                                                            var obj = {
                                                                'path' : !isEmpty(row.path) ?  row.path : '',
                                                                'name_origin' : !isEmpty(row.name_origin) ?  row.name_origin : '',
                                                                'file_type' : !isEmpty(row.file_type) ?  row.file_type : '',
                                                            };
                                                            msg.push(obj);
                                                        });
                                                        sendMessage(params, msg, data.message_type);
                                                    }

                                                    break;
                                                case USER_SEND_TEXT:
                                                    sendMessage(params, data.message, data.message_type);
                                                    break;
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });

        socket.on('user_typing', function (data) {
            logObject('----------------------------------socket user_typing---------------------------', data);
            var room_id = data.room_id;
            var user_id = data.user_id;
            if(isEmptyMongodbID(room_id) || isEmptyMongodbID(user_id)){
                logObject('data empty room_id', room_id, ', user_id', user_id);
            }else if(isEmpty(data.typing)){
                logObject('data empty typing', data.typing);
            }
            getRoomEx2(room_id, {}, function (error, room) {
                if(error){
                    logObject('err: ', error);
                    return;
                }
                if(!error && room){
                    getUserInfo(user_id, function(err, user){
                        if(!err && !isEmpty(user)){
                            var member = room.member;
                            data.user_name = user.user_name;
                            if(member.indexOf(user_id) >= 0){
                                sendEventSocket(room_id, 'trigger_user_typing', data);
                                return;
                            }
                        }
                    });
                }
            });
        });

        socket.on('user_leave_room', function (data) {
            logObject('----------------------------------socket user_leave_room---------------------------', data);
            var room_id = data.room_id;
            var user_id = data.user_id;
            if(isEmptyMongodbID(room_id) || isEmptyMongodbID(user_id)){
                logObject('data empty room_id', room_id, ', user_id', user_id);
            }
            getRoomEx2(room_id, {}, function (error, room) {
                if(!error && room){
                    updateUserRoom(room_id, user_id, false);
                    setUserTime(user_id);
                }
            });
        });

        socket.on('disconnecting', function () {
            logObject('****************************disconnecting**************************');
            var rooms = Object.keys(socket.rooms);
            if (rooms) {
                rooms.forEach(function (value) {
                    socket.leave(value);
                    logObject('value', value);
                    if(!isEmpty(UserIdsArr[value])){
                        logObject('delete UserIdsArr', UserIdsArr[value]);
                        logObject(UserIdsArr);
                        delete UserIdsArr[value];
                        setTimeout(function () {
                            setUserOffline(value);
                        }, TIME_USER_LOGOUT);
                    }
                });
            }
        });

        socket.on('join', function (data) {
            logObject("join=" ,  data);
            socket.join(data.connect_page_id);
        });

        socket.on('client_to_server_receive_message', function (data) {
            updateBotLastTime(data.connect_page_id, data.user_id);
        });

        socket.on('user_logout', function(data){
            logObject('---------------------------------user logout---------------------------', data);
            var user_id = data.user_id;
            if(isEmptyMongodbID(user_id)){
                logObject('user_logout miss params');
                var data_return = {
                    'success' : false,
                    'message' : 'user_logout miss params'
                };
                sendEventSocket(user_id, 'status_user_logout', data_return);
                return;
            }
            doUserLogout(user_id);
        });

        socket.on('event_ex_key_step1_new_bk', function(data){
            logObject('---------------------------------event_ex_key_step1---------------------------', data);
            validRoomEx(data, function(error, room){
                if(!error && room){
                    var from_client_id = data.from_client_id;
                    var to_client_id = data.to_client_id;
                    var room_id = data.room_id;
                    room.admin_key_flg = ADMIN_KEY_FLG_TRUE;
                    room.save();
                    getUser(to_client_id, function (err, user) {
                        if(err || !user){
                            return;
                        }
                        var data_client = {
                            success: true,
                            room_id: room_id,
                            from_client_id: from_client_id,
                            to_client_id: to_client_id,
                            data: data.data
                        };
                        if(user.is_login){
                            logObject('to_client_id online');
                            userJoinRoom(socket, room_id, function(success){
                                if(success){
                                    sendEventSocket(to_client_id, 'on_event_ex_key_step1', data_client);
                                }
                            });
                        }else{
                            logObject('to_client_id offline');
                            var current_time = new Date();
                            if(!isEmpty(queue_exchange_key[to_client_id])){
                                var queue_to_client_id = queue_exchange_key[to_client_id];
                                for(var i = 0; i < queue_to_client_id.length; i++){
                                    var user_current_exchange_key =  queue_to_client_id[i];
                                    if(!isEmpty(user_current_exchange_key) && !isEmpty(user_current_exchange_key.data_client) && !isEmpty(user_current_exchange_key.data_client.to_client_id)
                                        && user_current_exchange_key.data_client.to_client_id == to_client_id){
                                        user_current_exchange_key.splice(i, 1);
                                    }
                                }
                                queue_to_client_id ='';
                            }
                            current_time = current_time.getTime();
                            queue_exchange_key.push({
                                time: current_time,
                                data_client: data_client,
                            });
                        }
                    });
                }
            });
            // do_ex_key_step(data, 'on_event_ex_key_step1', socket);
        });

        socket.on('event_ex_key_step1', function(data){
            logObject('---------------------------------event_ex_key_step1---------------------------', data);
            validRoomEx(data, function(error, room){
                if(!error && room){
                    var from_client_id = data.from_client_id;
                    var to_client_id = data.to_client_id;
                    var room_id = data.room_id;
                    room.admin_key_flg = ADMIN_KEY_FLG_TRUE;
                    room.save();
                    userJoinRoom(socket, room_id, function(success){
                        if(success){
                            var data_client = {
                                success: true,
                                room_id: room_id,
                                from_client_id: from_client_id,
                                to_client_id: to_client_id,
                                data: data.data
                            };
                            sendEventSocket(to_client_id, 'on_event_ex_key_step1', data_client);
                        }
                    });
                }
            });
            // do_ex_key_step(data, 'on_event_ex_key_step1', socket);
        });

        socket.on('event_ex_key_step2', function(data){
            logObject('---------------------------------event_ex_key_step2---------------------------', data);
            validRoomEx(data, function(error, room){
                var from_client_id = data.from_client_id;
                var to_client_id = data.to_client_id;
                var room_id = data.room_id;
                userJoinRoom(socket, room_id, function(success){
                    if(success){
                        var data_client = {
                            success: true,
                            room_id: room_id,
                            from_client_id: from_client_id,
                            to_client_id: to_client_id,
                            data: data.data
                        };
                        sendEventSocket(to_client_id, 'on_event_ex_key_step2', data_client);
                    }
                });
            });
        });

        socket.on('event_ex_key_step3', function(data){
            logObject('---------------------------------event_ex_key_step3---------------------------', data);
            validRoomEx(data, function(error, room){
                var from_client_id = data.from_client_id;
                var to_client_id = data.to_client_id;
                var room_id = data.room_id;
                userJoinRoom(socket, room_id, function(success){
                    if(success){
                        var data_client = {
                            success: true,
                            room_id: room_id,
                            from_client_id: from_client_id,
                            to_client_id: to_client_id,
                            data: data.data
                        };
                        sendEventSocket(to_client_id, 'on_event_ex_key_step3', data_client);
                    }
                });
            });
        });

        socket.on('event_ex_key_step4', function(data){
            logObject('---------------------------------event_ex_key_step4---------------------------', data);
            validRoomEx(data, function(error, room){
                var from_client_id = data.from_client_id;
                var to_client_id = data.to_client_id;
                var room_id = data.room_id;
                userJoinRoom(socket, room_id, function(success){
                    if(success){
                        var data_client = {
                            success: true,
                            room_id: room_id,
                            from_client_id: from_client_id,
                            to_client_id: to_client_id,
                            data: data.data
                        };
                        sendEventSocket(to_client_id, 'on_event_ex_key_step4', data_client);
                    }
                });
            });
        });

        socket.on('event_ex_key_step5', function(data){
            logObject('---------------------------------event_ex_key_step5---------------------------', data);
            data.check_user_id = false;
            validRoomEx(data, function(error, room){
                if(!error && room){
                    updateRoom(data, function(error, room){

                    });
                }
            });
        });

        socket.on('event_user_clear_log', function(data){
            logObject('---------------------------------event_user_clear_log---------------------------', data);
            var room_id = data.room_id,
                user_id = data.user_id,
                option_query = {
                    deleted_at: null,
                    member: {$in: [user_id]}
                };
            if(isEmptyMongodbID(room_id) || isEmptyMongodbID(user_id)){
                logObject('miss param');
                return;
            }
            getRoomEx2(room_id, option_query, function(err, room){
                if(err || isEmpty(room)){
                    logObject('room lỗi hoặc ko tim thay');
                    return;
                }
                var logCollection = CreateModelLogForName(room_id + "_logs");
                logCollection.deleteMany({uid: user_id}, function(err, data){
                    logObject(err, data);
                });
                data.success = true;
                sendEventSocket(room_id, 'event_server_clear_log', data);
            })
        });

        socket.on('event_user_clear_message', function(data){
            logObject('---------------------------------event_user_clear_message---------------------------', data);
            var room_id = data.room_id,
                user_id = data.user_id,
                log_id = data.log_id,
                option_query = {
                    deleted_at: null,
                    member: {$in: [user_id]}
                };
            if(isEmptyMongodbID(room_id) || isEmptyMongodbID(user_id)){
                logObject('miss param');
                return;
            }
            getRoomEx2(room_id, option_query, function(err, room){
                if(err || isEmpty(room)){
                    logObject('room lỗi hoặc ko tim thay');
                    return;
                }
                var logCollection = CreateModelLogForName(room_id + "_logs");
                logCollection.deleteMany({_id: log_id, uid: user_id}, function(err, data){
                    logObject(err, data);
                });
                sendEventSocket(room_id, 'event_server_clear_message', data);
            })
        });

        // lắng nghe client muốn trao đổi key với admin trong 1 room
        //
        socket.on('start_exchange_key', function(data){
            logObject('---------------------------------start_exchange_key---------------------------', data);
            var room_id = data.room_id;
            var user_id = data.user_id;
            validRoomEx2(room_id, user_id, function(error, room){
                if(!error && room){
                    if(!isEmpty(room.admin_key_flg) && !room.admin_key_flg){
                        logObject('****Room bi mat key thi khong the exchange key');
                        return;
                    }
                    var admin_id = room.admin_id;
                    var data_send = {
                        'room_id' : room_id,
                        'admin_id' : admin_id,
                        'user_id' : user_id,
                    };
                    sendEventSocket(admin_id, 'event_trigger_ex_key', data_send)
                }
            });
        });
    });

    app.post('/webhook/chatwork', function (req, res) {{
        console.error("Failed validation secret_key.");
        res.sendStatus(403);
    }
    });

    app.post('/webhook/line', function (req, res) {
    });

    /*
     * Use your own validation token. Check that the token used in the Webhook
     * setup is the same token used here.
     *
     */
    app.get('/webhook', function(req, res) {
    });

    app.post('/webhook', function (req, res) {
    });

    listen();
    module.exports = app;
}
/* request test send key exchage*/
app.post('/send/user', function (req, res) {
    logObject('**********************send user***************************', req.body);
    var from_client_id = req.body.from_client_id;
    var to_client_id = req.body.to_client_id;
    var room_id = req.body.room_id;
    var ename = req.body.ename;
    var data = req.body.data;
    if(!isEmptyMongodbID(from_client_id) && !isEmptyMongodbID(to_client_id) && !isEmptyMongodbID(room_id) && !isEmpty(ename) && !isEmpty(data)){
        var data_client = {
            success: true,
            room_id: room_id,
            from_client_id: from_client_id,
            to_client_id: to_client_id,
            data: data.data
        };
        logObject('data send', data_client);
        io.to(to_client_id).emit(ename, data_client);
        res.status(200).send('ok send');
    }else{
        logObject('miss param');
        res.sendStatus(403);
    }
});

var redisPublicMessage = function(row){
    logObject("redisPublicMessage=", row);
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

function setUserOffline(user_id) {
    var current_time = new Date();
    current_time = current_time.getTime();
    logObject('---------------------setUserOffline---------------------');
    logObject('user_id', user_id, ', time of user: ', UserTime[user_id], ', current time', current_time, 'sub: >0', (current_time - UserTime[user_id] > TIME_USER_LOGOUT));
    if(!isEmpty(UserTime[user_id]) && (current_time - UserTime[user_id] > TIME_USER_LOGOUT)){
        User.findOne({_id: user_id, deleted_at: null, }, function (err, result) {
            logObject('set user offline success');
            if(!err && result){
                result.is_login = false;
                result.save();
                UpdateStatusUserInRoom(user_id, false, function(err){
                });
            }
        });
    }
}

function sendBroadcastMessage(row, scenarioResult, botResult, userProfileResult){
    logObject("sendBroadcastMessage");
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

// Express error-handling middleware function.
// Read more: http://expressjs.com/en/guide/error-handling.html
function abortOnError(err, req, res, next) {
    if (err) {
        console.error("abortOnError Couldn't validate the signature.");
    } else {
        logObject("next");
        next();
    }
}

function saveException(err){
    var now = new Date();
    var message = getErrorException(err);
    var exception = new Exception({
        err: message,
        push_facebook_flg: 0,
        type: EXCEPTION_SEND_ERROR,
        created_at : now,
        updated_at : now
    });
    exception.save(function(err) {
    });
}

function validRoom(data, callback){
    var room_id = data.room_id;
    var user_id = data.user_id;
    var room_type = data.room_type;
    var member = data.member;
    var room_type_arr = [ROOM_TYPE_ONE_MANY, ROOM_TYPE_ONE_ONE];
    logObject('---------------------validRoom-----------------------', data);
    if(isEmptyMongodbID(user_id)){
        data.success = false;
        data.message = 'user id miss';
        logObject('user_id miss');
        io.to(user_id).emit('status_join_room', data);
        return callback(true);
    }
    if(!isEmptyMongodbID(room_id)){
        var query = {_id: room_id, deleted_at: null};
    }else {
        if (isEmpty(room_type) || !room_type_arr.indexOf(room_type)) {
            data.success = false;
            data.message = 'message.room_type_validate';
            io.to(user_id).emit('status_join_room', data);
            logObject('room_type_validate');
            return callback(true);
        } else if (isEmpty(member) || !(member instanceof Array) || (room_type == ROOM_TYPE_ONE_ONE && member.length != 2)) {
            data.success = false;
            data.message = 'message.member_validate_1';
            logObject('member_validate_1');
            io.to(user_id).emit('status_join_room', data);
            deleteUserRoom(room_id, user_id);
            return callback(true);
        }
        var query = {member: {$all : member, $size : 2},room_type: room_type, deleted_at: null}
    }
    User.findOne({_id: user_id, deleted_at: null}, function (err, user) {
        logObject('validRoom find user ', user);
        var params = createParameterDefault(room_type, undefined, data.user_id, member);
        if(err || !user){
            data.success = false;
            data.message = "message.user_not_exsits";
            io.to(user_id).emit('status_join_room', data);
            logObject('user_not_exsits');
            return callback(true);
        }else if(!user.is_login){
            logObject('user_offline change online');
            user.is_login = true;
            sendUserStatusInContact(user_id, user.contact, true);
        }
        logObject('***************query check room*************** room_id', room_id, 'query: ', query, 'params: ', params);
        getLastRoom(room_id, query, function(err, room){
            // trường hợp room đã tồn tại ( room 1-1, 1-n)
            // trường hợp room 1-1 chưa tồn tại => create room
            // các trường hợp còn lại lỗi hết
            logObject('***************room data***************', 'err', err, ', room', room);
            if (!err && room) {
                // room 1-1, admin_key_flg = false => create room
                //           admin_key_flg = true, unknow => tra ve cac thong tin room
                params.room_type = room.room_type;
                params.member = room.member;
                if(room.admin_key_flg == ADMIN_KEY_FLG_FALSE){
                    logObject('room miss admin key');
                    data.admin_key_flg = ADMIN_KEY_FLG_FALSE;
                    data.admin_id = room.admin_id;
                    data.member = room.member;
                    // Nếu room bị mất admin key và ko có room_id thì tạo room mới
                    if(room.room_type == ROOM_TYPE_ONE_ONE && isEmpty(room_id)){
                        logObject('room create, room_id empty, admin key flag false');
                        roomCreate(room.admin_id, room.member, room.room_type, function(err, roomStore){
                            if (err) throw err;
                            params.room_id = roomStore._id;
                            params.admin_key_flg = roomStore.admin_key_flg;
                            params.admin_id = roomStore.admin_id;
                            params.member = roomStore.member;
                            params.room_type = roomStore.room_type;
                            return callback(false, roomStore, params);
                        });
                    }else{
                        // admin ko vao duoc room voi truong hop key clear
                        if(user_id == room.admin_id){
                            logObject('admin bi clear data');
                            data.success = false;
                            data.message = 'message.room_not_exits';
                            sendEventSocket(user_id, 'status_join_room', data);
                            return callback(true);
                        // user binhf thuong van join duoc vao room
                        }else{
                            logObject('room join bin thuong in truong hop 1-1, admin key flag false');
                            params.room_id = room._id;
                            params.admin_key_flg = room.admin_key_flg;
                            params.admin_id = room.admin_id;
                            params.member = room.member;
                            params.room_type = room.room_type;
                            return callback(false, room, params);
                        }
                    }
                }else{
                    params.room_id = room._id;
                    params.admin_key_flg = room.admin_key_flg;
                    params.admin_id = room.admin_id;
                    params.member = room.member;
                    params.room_type = room.room_type;
                    logObject('room admin key', params.admin_key_flg);
                    return callback(false, room, params);
                }
            }else if(room_type == ROOM_TYPE_ONE_ONE){
                var u1 = member[0];
                var u2 = member[1];
                var contact = user.contact;
                if(!isEmpty(contact) && contact instanceof Array &&
                    ((u1 == user._id && contact.indexOf(u2) >= 0) ||( u2 == user._id && contact.indexOf(u1) >= 0))){
                    logObject('room create, room not exists');
                    roomCreate(user_id, member, room_type, function(err, roomStore){
                        if (err) throw err;
                        params.room_id = roomStore._id;
                        params.admin_key_flg = roomStore.admin_key_flg;
                        params.admin_id = roomStore.admin_id;
                        params.member = roomStore.member;
                        params.room_type = roomStore.room_type;
                        return callback(false, roomStore, params);
                    });
                }
            } else{
                logObject('member_validate_3');
                data.success = false;
                data.message = 'message.room_not_exits';
                io.to(user_id).emit('status_join_room', data);
                deleteUserRoom(room_id, user_id);
                return callback(true);
            }
        });
    });
}

function roomCreate(admin_id, member, room_type, callback){
    var now = new Date();
    var roomStore = new Room({
        name: member.join('_'),
        admin_id: admin_id,
        member: member,
        room_type: room_type,
        admin_key_flg: ADMIN_KEY_FLG_UNKNOW,
        created_at : now,
        updated_at : now
    });
    roomStore.save(function(err, roomStore) {
        if (err){
            return callback(true);
        };
        logObject('room true store');
        return callback(false, roomStore);
    });
}

function do_ex_key_step(data, event_name, socket){
    logObject('---------------------------sed event---------------------');
    // showListRoom(socket);
    var front_client_id = data.from_client_id;
    var to_client_id = data.to_client_id;
    var room_id = data.room_id;
    var data_client = {
        success: true,
        room_id: room_id,
        from_client_id: front_client_id,
        to_client_id: to_client_id,
        data: data.data
    };
    logObject('event_name: ',event_name, 'data: ', data, 'to client', to_client_id);
    // sendEventSocket(to_client_id, event_name, data_client);
    io.to(to_client_id).emit(event_name, data_client);
}

function validRoomEx(data, callback){
    logObject('---------------------validRoomEx-----------------------');
    var from_client_id = data.from_client_id,
        to_client_id = data.to_client_id,
        room_id = data.room_id,
        check_user_id = isEmpty(data.check_user_id) ? data.check_user_id : true;
    if(isEmptyMongodbID(room_id) || (check_user_id && (isEmptyMongodbID(from_client_id) || isEmptyMongodbID(to_client_id)))){
        logObject('validRoomEx miss params by data' , data);
        var data_return = {
            'success' : false,
            'message' : 'validRoomEx miss params'
        };
        if(!isEmptyMongodbID(room_id)){
            sendEventSocket(room_id, 'status_ex_key', data_return);
        }
        return callback(true);
    }
    getRoomEx(data, function(error, room){
        if(error || !room){
            logObject('room valid by id', room_id);
            var data_return = {
                'success' : false,
                'message' : 'room valid'
            };
            sendEventSocket(room_id, 'status_ex_key', data_return);
            return callback(true);
        }
        logObject('**********************room true-----------', room);
        if(!isEmpty(data.admin_key_flg)){
            room.admin_key_flg = data.admin_key_flg;
            room.save();
        }
        return callback(false, room);
    });
}

function validRoomEx2(room_id, user_id, callback){
    if(isEmptyMongodbID(room_id) || isEmptyMongodbID(user_id)){
        logObject('miss param, room_id', room_id, 'user_id', user_id);
        return callback(true);
    }
    getRoomEx2(room_id, {}, function(err, room){
        if(err || !room){
            logObject('room_id miss', room_id, 'user_id', user_id);
            return callback(true);
        }
        var room_member = room.member;
        var room_admin_id = room.admin_id;
        if(user_id != room_admin_id && room_member.indexOf(user_id)){
            logObject('valid true');
            return callback(false, room);
        }else if(user_id == room_admin_id){
            logObject('room_id trao doi key admin voi admin');
            return callback(true);
        }
        logObject('room_id error param', room_id, 'user_id', user_id);
        return callback(true);
    });
}

function userJoinRoom(socket, room_id, callback) {
    logObject('-----------------user join room-----------------------', room_id);
    showListRoom(socket);
    var rooms = Object.keys(socket.rooms);
    if (rooms.indexOf(room_id) >= 0) {
        logObject('room_id ton tai');
        showListRoom(socket);
        return callback(true);
    }else if (rooms.indexOf(room_id) == -1) {
        socket.join(room_id, function() {
            showListRoom(socket);
            logObject('room_id vua enjoin');
            return callback(true);
        });
    }else{
        logObject('error join room with ' +room_id);
        return callback(false);
    }
}

//function Promise
function userJoinRoomPromise(socket, room_id){
    logObject('----userJoinRoomPromise', room_id);
    var rooms = Object.keys(socket.rooms);
    var return_data = {'error' : false, function: 'userJoinRoomPromise'};
    return new Promise(function(resolve, reject) {
        showListRoom(socket);
        if (rooms.indexOf(room_id) >= 0) {
            logObject('room_id ton tai');
            showListRoom(socket);
            return resolve(return_data);
        }else if (rooms.indexOf(room_id) == -1) {
            socket.join(room_id, function() {
                showListRoom(socket);
                logObject('room_id vua enjoin');
                return resolve(return_data);
            });
        }else{
            logObject('error join room with ' +room_id);
            return_data.error = true;
            return reject(return_data);
        }
    })
}

function setNickNameSocketPromise(socket, user_id) {
    logObject('----setNickNameSocketPromise', socket.id, user_id);
    var return_data = {error : true, function: 'setNickNameSocketPromise'};
    return new Promise(function(resolve, reject) {
        var nickname_current = socket.nickname;
        if(user_id && mongoose.Types.ObjectId(user_id)){
            if(isEmpty(nickname_current)){
                socket.nickname = user_id;
                UserIdsArr[user_id] = socket.id;
                return_data.error = false;
                logObject('nickname set', user_id);
            }else if(!isEmpty(nickname_current) && nickname_current == user_id){
                return_data.error = false;
                logObject('nickname allway', user_id);
            }
        }
        if(return_data.error){
            return reject(return_data);
        }else{
            return resolve(return_data);
        }
    });
}

function UpdateStatusUserInRoomPromise(user_id, status){
    // chỉ update trạng thái user_id cho màn hình contact
    logObject('----UpdateStatusUserInRoomPromise------', user_id, '---',status);
    var return_data = {'error' : false, function: 'UpdateStatusUserInRoomPromise'};
    return new Promise(function(resolve, reject) {
        User.findOne({_id: user_id, deleted_at: null}, function (err, user) {
            if(!err && !isEmpty(user)){
                sendUserStatusInContact(user_id, user.contact, status);
                console.log('update status online');
                return resolve(return_data);
            }
            console.log('update status error');
            return_data.error = true;
            return reject(return_data);
        });
    })
}

function updateAdminKeyInRoomPromise(admin_id, admin_key_flg_arr){
    logObject('--------updateAdminKeyInRoomPromise admin_id: ' , admin_id, ' key: ', admin_key_flg_arr);
    var return_data = {'error' : false, function: 'updateAdminKeyInRoomPromise'};
    return new Promise(function(resolve, reject) {
        Room.find({admin_id: admin_id, deleted_at: null}, function (err, rooms) {
            if(!err && rooms){
                rooms.forEach(function (row) {
                    var current_admin_key_flg = ADMIN_KEY_FLG_FALSE;
                    var current_room_id = row._id;
                    if(admin_key_flg_arr == void 0 || (admin_key_flg_arr != void 0 && !(admin_key_flg_arr instanceof Array))){
                        admin_key_flg_arr = [];
                        logObject('room send misss param: admin_key_flg_arr', admin_key_flg_arr);
                        return_data.error = true;
                        return reject(return_data);
                    }
                    logObject('room current: ', current_room_id, admin_key_flg_arr.indexOf(current_room_id));
                    if(!isEmpty(admin_key_flg_arr)){
                        for(var i =0 ; i < admin_key_flg_arr.length; i++){
                            if(admin_key_flg_arr[i] == current_room_id){
                                current_admin_key_flg = ADMIN_KEY_FLG_TRUE;
                                break;
                            }
                        }
                    }
                    row.admin_key_flg = current_admin_key_flg;
                    row.save();
                });
            }
            return resolve(return_data);
        })
    });
}

function validUserIdPromise(data){
    logObject('----validUserIdPromise');
    var user_id = data.user_id;
    var return_data = {'error' : false};
    return new Promise(function(resolve, reject) {
        if(!user_id || !mongoose.Types.ObjectId.isValid(user_id)){
            data.success = 0;
            logObject('status_join miss user_id', data);
            io.to(user_id).emit('status_join', data);
            return_data.error = true;
            return reject(return_data);
        }
        User.findOne({_id: user_id, deleted_at: null}, function (err, result) {
            if (!err && result) {
                // update login user
                result.is_login = true;
                result.save();
                logObject('user ', result.user_name, ' online');
                //update key user room_type, room_id, user_id, member
                var params = createParameterDefault(null, result._id, data.user_id, null);
                return_data.data = data;
                return_data.params = params;
                return resolve(return_data);
            }else{
                data.success = 0;
                logObject('status_join user valid', data);
                io.to(user_id).emit('status_join', data);
                return_data.error = true;
                return reject(return_data);
            }
        });
    });
}

function validUserId(data, callback){
    logObject('-----------------valid user id-----------------------');
    var user_id = data.user_id;
    if(!user_id || !mongoose.Types.ObjectId.isValid(user_id)){
        data.success = 0;
        logObject('status_join miss user_id', data);
        io.to(user_id).emit('status_join', data);
        return callback(true);
    }
    User.findOne({_id: user_id, deleted_at: null}, function (err, result) {
        if (!err && result) {
            // update login user
            result.is_login = true;
            result.save();
            //update key user room_type, room_id, user_id, member
            var params = createParameterDefault(null, result._id, data.user_id, null);
            return callback(false, data, params);
        }else{
            data.success = 0;
            logObject('status_join user valid', data);
            io.to(user_id).emit('status_join', data);
            return callback(true);
        }
    });
}

function updateAdminKeyInRoom(admin_id, admin_key_flg_arr, callback){
    logObject('-----updateAdminKeyInRoom admin_id: ' , admin_id, ' key: ', admin_key_flg_arr);
    Room.find({admin_id: admin_id, deleted_at: null}, function (err, rooms) {
        if(!err && rooms){
            rooms.forEach(function (row) {
                var current_admin_key_flg = ADMIN_KEY_FLG_FALSE;
                var current_room_id = row._id;
                if(isEmpty(admin_key_flg_arr) || (!isEmpty(admin_key_flg_arr) && !(admin_key_flg_arr instanceof Array))){
                    admin_key_flg_arr = [];
                    logObject('room send misss param: admin_key_flg_arr', admin_key_flg_arr);
                }
                logObject('room current: ', current_room_id, admin_key_flg_arr.indexOf(current_room_id));
                if(!isEmpty(admin_key_flg_arr)){
                    for(var i =0 ; i < admin_key_flg_arr.length; i++){
                        if(admin_key_flg_arr[i] == current_room_id){
                            current_admin_key_flg = ADMIN_KEY_FLG_TRUE;
                            break;
                        }
                    }
                }
                row.admin_key_flg = current_admin_key_flg;
                row.save();
            });
        }
        return callback(false);
    })
}

function doUserLogout(user_id, callback){
    var data_return = {};
    User.findOne({_id: user_id, deleted_at: null}, function (err, user) {
        if (!err && user) {
            // update login user
            user.is_login = false;
            user.save();
            logObject('user_logout success');
            data_return['success'] = true;
            UpdateStatusUserInRoom(user_id, false, function(err){
                // return callback(false);
            });
        }else{
            data_return.success = false;
            data_return['message'] = 'user not exits';
            sendEventSocket(user_id, 'status_user_logout', data_return);
            return callback(true);
        }
    });
}


var getRoom = function(data, callback) {
    var user_id = data.user_id;
    var room_id = data.room_id;
    logObject('user_id: ', user_id, 'room_id: ', room_id);
    Room.findOne({_id : room_id, member : {$in: [user_id]}, deleted_at: null}, function (err, result) {
        logObject('getRoom', result);
        if(err || !result){
            logObject('error getroom');
            data.success = false;
            data.message = 'message.room_not-exits';
            io.to(user_id).emit('status_join_room', data);
            return callback(true);
        }
        var params = createParameterDefault(data.message_type, room_id, data.user_id, result.member);
        return callback(false, result, params);
    });
};

function getRoomEx(data, callback){
    logObject('----------------------get Room ex------------');
    var room_id = data.room_id;
    var query = {_id : room_id, deleted_at: null};
    var from_client_id = data.from_client_id,
        to_client_id = data.to_client_id;
    if(!isEmptyMongodbID(from_client_id) && !isEmptyMongodbID(to_client_id)){
        var member = [from_client_id, to_client_id];
        query.member = {$all : member, $size : 2};
    }
    Room.findOne(query, function (err, room) {
        logObject('getRoom', room);
        if(err || !room){
            return callback(true);
        }
        return callback(false, room);
    });
}

function getRoomEx2(room_id, option_query, callback){
    logObject('----------------------get Room ex2------------');
    var query = {deleted_at: null},
        query_room = {};
    if(!isEmptyMongodbID(room_id)){
        query_room = {_id : room_id};
    }
    var option = Object.assign({}, query, query_room, option_query);
    Room.findOne(option, function (err, room) {
        if(!err && room){
            return callback(false, room);
        }
        return callback(true);
    });
}

function getLastRoom(room_id, option_query, callback){
    logObject('----------------------getLastRoom------------');
    var query = {deleted_at: null},
        query_room = {};
    if(!isEmptyMongodbID(room_id)){
        query_room = {_id : room_id};
    }
    var option = Object.assign({}, query, query_room, option_query);
    Room.findOne(option, {}, { sort: { '_id': -1 } }, function (err, room) {
        if(!err && room){
            return callback(false, room);
        }
        return callback(true);
    });
}

//非同期処理
var stepA = function(page_id) {
    //var d = Q.defer();
    //d.reject('piyo');
    //
    //var result = ConnectPage.findOne({page_id: page_id, sns_type: SNS_TYPE_FACEBOOK, deleted_at: null}).exec())
    //.then(function(result) {
    //    logObject(result);
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
    logObject("stepB");
    logObject(val);
    d.resolve('piyo');
    return d.promise;
};

function listen () {
    app.listen(app.get('port'), function() {
        logObject('Node app is running on port', app.get('port'));
    });
}
function sendMessage(params, message, message_type){
    logObject('-----------------------------sendMessageNew--------------------------------');
    var now = new Date();
    var msg_data = {
        'user_id' : params.user_id,
        'admin_id' : params.admin_id,
        'room_id' : params.room_id,
        'message_type' : message_type,
        'message' : message,
        'created_at' : moment(now).tz(TIMEZONE).format(date_format_global),
    };
    var log_ids = {};
    getUserSaveLog(params)
        .then(function(data){
            logObject('-----------------------------getUserSaveLog--------------------------------', data);
            if(isEmpty(data) || isEmpty(data.error) || (data.error)){
                logObject(data.reason);
                return;
            }
            // send message for user in room with room_id
            var user_log = data.user_log;
            var user_send_message = data.user_send_message;
            if(!isEmpty(user_send_message)){
                msg_data.user_name = user_send_message.user_name;
                msg_data.avatar = setAvatar(user_send_message.avatar);
            }
            params.user_name = user_send_message.user_name;
            params.avatar = setAvatar(user_send_message.avatar);
            var client_in_room = params.client_in_room;
            if(!isEmpty(client_in_room)){
                msg_data.user_read = client_in_room;
            }
            logObject('****send message to user:msg_data: ', msg_data, 'user_log: ', user_log, '*************');
            return Promise.all([
                saveUserSaveLog(params, user_log, message, message_type),
                updateLastMessage(params, message, message_type)
            ]);
        })
        .then(function (data2) {
            logObject('-----------------------------updateUnreadMessage then-----------------------------', data2);
            let [dataUserLog, dataUpdateLastMessage] = data2;
            logObject('dataUserLog', dataUserLog, 'client_in_room', params.client_in_room);
            log_ids = dataUserLog.log_ids;
            if(!isEmpty(params.client_in_room)){
                for(var i = 0 ; i < params.client_in_room.length; i++){
                    var current_client_in_room = params.client_in_room[i];
                    var _id = '';
                    logObject('current_client_in_room', current_client_in_room);
                    if(!isEmpty(log_ids[current_client_in_room])){
                        _id = log_ids[current_client_in_room];
                    }
                    msg_data._id = _id;
                    logObject('server_send_message', msg_data);
                    sendEventSocket(current_client_in_room, 'server_send_message', msg_data);
                }
            }
            return updateUnreadMessage(params);
        })
        .then(function (data) {
            logObject('-----------------------------sendMessageOutsideRoom then-----------------------------');
            if(isEmpty(data) || isEmpty(data.error) || (data.error)){
                logObject(data);
                return;
            }
            var unread_message_counts = data.unread_message_counts;
            return sendMessageOutsideRoom(params, message, message_type, unread_message_counts, log_ids);
        })
        .catch(function(err){
            logObject('err: ', err);
        })
}

function sendMessageBK(params, message, message_type) {
    logObject('func sendMessage: ', params, message, message_type);
    if(message_type == USER_SEND_TEXT || message_type == USER_SEND_FILE) {
        logObject('func USER_SEND_TEXT or USER_SEND_FILE: ');
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
            admin_id: params.admin_id,
            message_type: message_type,
            message: message,
            created_at : now,
            updated_at : now
        });
        logCollection.save(function(err, logCollectionStore) {
            if (err) throw err;
            logObject('logCollectionStore store');
            var result = {
                'user_id' : params.user_id,
                'admin_id' : params.admin_id,
                'room_id' : params.room_id,
                'message_type' : message_type,
                'message' : message,
                'created_at' : moment(now).tz(TIMEZONE).format(date_format_global),
            };
            User.findOne({ _id: params.user_id}, {}, {}, function(err, user) {
                if(err || !user){
                    var errors = {
                        msg: 'ko tim thay user',
                        status: false,
                    };
                    console.error('==============ko tim thay user============', params.user_id);
                    io.to(params.user_id).emit('user_join_room', errors);
                    return;
                }
                if(user.time_save_log == USER_TIME_SAVE_LOG_NO){
                    logCollectionStore.clear_log = [params.user_id];
                }
                result.user_name = user.user_name;
                result.avatar = setAvatar(user.avatar);
                var client_in_room = params.client_in_room;
                if(!isEmpty(client_in_room)){
                    result.user_read = client_in_room;
                }
                logObject('send message to user  : ', result);
                io.to(params.room_id).emit('server_send_message', result);
                updateLastMessage(params, result);
                var user_id_not_arr = params.user_id_not_arr;
                if(!isEmpty(user_id_not_arr)){
                    logObject('+++updateUnreadMessage');
                    updateUnreadMessage(params, function(err, unread_message_counts){
                        // sendMessageUserArr(params.user_id_not_arr, result);
                        logObject('err', err, ', unread_message_counts: ', unread_message_counts);
                        if(!err && !isEmpty(unread_message_counts)){
                            Object.keys(unread_message_counts).forEach(function (id) {
                                result.data_unread_message_count = unread_message_counts[id];
                                // send message for user_id not in room
                                logObject('unread.user_id: ', unread_message_counts[id], 'result: ', result);
                                sendEventSocket(id, 'server_send_message', result)
                            });
                        }
                    });
                }
                setUserTime(params.user_id);
                return;
            });
        });
    }
}

function updateLastMessageBK(params, msg_data){
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

function insertUnreadMessage(room_id, user_ids){
    var now = new Date();
    var data_list_update = UnreadMessage.collection.initializeOrderedBulkOp();
    if(!isEmpty(user_ids)){
        for (var i = 0; i < user_ids.length; i++) {
            data_list_update.find({room_id: room_id, user_id : user_ids[i]})
                .upsert()
                .update({ $inc: {count: 1}, $set: {room_id: room_id, user_id: user_ids[i], updated_at : now}});
        }

        if(data_list_update && data_list_update.s && data_list_update.s.currentBatch
            && data_list_update.s.currentBatch.operations
            && data_list_update.s.currentBatch.operations.length > 0){
            data_list_update.execute(function (error) {
                logObject(error);
            });
        }
    }
}
function updateUnreadMessage1(params, callback){
    logObject('-----------run updateUnreadMessage');

    // var data_list_update = UnreadMessage.collection.initializeOrderedBulkOp();
    var data_ids = params.user_id_not_arr;
    var room_id = params.room_id;
    var unread_message_counts = {};
    UnreadMessage.find({room_id: params.room_id, user_id: {$in: data_ids}, deleted_at: null}, function (err, unreads) {
        if(!err){
            // chưa có record trong unread message
            if(isEmpty(unreads)){
                insertUnreadMessage(room_id, data_ids);
                for(var i = 0; i< data_ids.length; i++){
                    unread_message_counts[data_ids[i]] = 1;
                }
            // có ít nhất 1 record trong unread
            }else{
                var user_id_tmp = [];
                unreads.forEach(function(unread) {
                    user_id_tmp.push(unread.user_id);
                    unread.count = unread.count + 1;
                    unread.save();
                    unread_message_counts[unread.user_id] = unread.count;
                });
                logObject('user_id_tmp: ', user_id_tmp, ', data_ids: ', data_ids);
                if(user_id_tmp.length < data_ids.length){
                    var user_id2 = arrayDiff(data_ids, user_id_tmp);
                    logObject('user_id2: ', user_id2);
                    insertUnreadMessage(room_id, user_id2);
                    for(var i = 0; i< user_id2.length; i++){
                        unread_message_counts[user_id2[i]] = 1;
                    }
                }
            }
            return callback(false, unread_message_counts);
        }else{
            return callback(true);
        }
    });
}

function updateUserRoom(room_id, user_id, status){
    logObject('update User in Room room_id', room_id, ' ,user_id', user_id, ', status', status);
    if(!isEmptyMongodbID(room_id) && !isEmptyMongodbID(user_id) && !isEmpty(UserRoom)){
        if(isEmpty(UserRoom[room_id])){
            UserRoom[room_id] = {};
        }
        UserRoom[room_id][user_id] = status;
        logObject('after update', UserRoom);
    }
}

function deleteUserRoom(room_id, user_id){
    if(!isEmptyMongodbID(room_id) && !isEmptyMongodbID(user_id) && !isEmpty(UserRoom) && !isEmpty(UserRoom[room_id])){
            delete UserRoom[room_id];
    }
}

function setAvatar(avatar_url) {
    if(!isEmpty(avatar_url)){
        if(avatar_url.indexOf(server_url) == -1){
            avatar_url = server_url + '/' + avatar_url;
        }
    }
    return avatar_url;
}

function sendMessageUserArr(user_ids, message) {
    if(!isEmpty(user_ids) && user_ids.length >0){
        for(var key in user_ids){
            io.to(user_ids[key]).emit('server_send_message', message);
            logObject('send message other room user_id', user_ids[key]);
        }
    }
}

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

function isEmpty (value, trim) {
    return value === void 0 || value === null || value.length === 0 || (trim && $.trim(value) === '');
}

function showListRoom(socket) {
    if(isEmpty(socket.rooms)){
        logObject('room empty or error');
        return;
    }
    var rooms = Object.keys(socket.rooms);
    logObject('****showListRoom room current', rooms);
}

function resetUnreadMessage(room_id, user_id) {
    var now = new Date();
    UnreadMessage.findOne({room_id: room_id, user_id: user_id}, function(err, result) {
        if(err){
            throw err;
            return;
        }
        // Nếu tìm thấy reset
        if(result){
            result.count = 0;
            result.save();
        }
    });
}

function findClientsSocket(socket, roomId, user_id, namespace) {
    // logObject('socket', socket);
    // var client = socket.adapter.rooms;
    var client = socket.adapter.rooms[roomId].sockets;
    var client_key = Object.keys(client);
    var room_list = socket.rooms;
    // logObject('io.sockets.clients()', socket.rooms());
    // logObject('io.sockets.clients(room)', socket.rooms(roomId));
    logObject('room_id', roomId, 'client', client, 'client_key', client_key, 'room_list', room_list, 'UserIdsArr', UserIdsArr);
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
    logObject('socket_id ', socket.id);
    var nickname_current = socket.nickname;
    var result = false;
    if(user_id && mongoose.Types.ObjectId(user_id)){
        if(isEmpty(nickname_current)){
            socket.nickname = user_id;
            UserIdsArr[user_id] = socket.id;
            result = true;
            logObject('nickname set', user_id);
        }else if(!isEmpty(nickname_current) && nickname_current == user_id){
            result = true;
            logObject('nickname allway', user_id);
        }
    }
    logObject('result setickName: ', nickname_current, user_id);
    return callback(result);
}

function UpdateStatusUserInRoom(user_id, status, callback){
    // chỉ update trạng thái user_id cho màn hình contact
    logObject('--------------------UpdateStatusUserInRoom--------------------', user_id, '---',status);
    User.find({contact : {$in: [user_id]}, deleted_at: null}, {}, {}, function(err, users) {
        if(!err && !isEmpty(users)){
            var data_user_online = {
                user_id: user_id,
                status: status,
            };
            users.forEach(function(user) {
                sendEventSocket(user._id, 'user_online', data_user_online);
            });
            // return callback(false);
        }
        // return callback(true);
    });
}

function getUserInfo(user_id, calback){
    // get user info
    logObject('------------getUserInfo----------------');
    User.findOne({ _id: user_id}, {}, {}, function(err, user) {
        if(!err && user){
            return calback(false, user);
        }
        logObject('error find user: ', user_id);
        return calback(true);
    });
}

function getUserNotExistsRoom(room_id, member, callback){
    var user_id_not_arr = removeArrayDuplicates(member);
    var client_in_room = [];
    var clients = !isEmpty(UserRoom[room_id]) ? UserRoom[room_id] : {};
    if(!isEmptyMongodbID(room_id) && !isEmpty(clients) && !isEmpty(UserIdsArr)){
        logObject('---check usser in room is room----- ');
        logObject('UserIdsArr ', UserIdsArr, 'client', clients);
        for(var i = 0; i < member.length; i++){
            var user_item = member[i];
            logObject('user_item: ', i, user_item);
            if(!isEmpty(UserIdsArr[user_item]) && !isEmpty(clients[user_item]) && clients[user_item]){
                client_in_room.push(user_item);
                logObject('****user_item push online', user_item);
            }
        }
    }
    user_id_not_arr = array_diff(user_id_not_arr, client_in_room);
    logObject('member not exits room', user_id_not_arr);
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

function arrayDiff(arr_source, arr_dest){
    if((arr_source instanceof Array) && (arr_dest instanceof Array)){
        return arr_source.filter(function(obj) { return arr_dest.indexOf(obj) == -1; });
    }
}

function getNickNameSocket(socket, user_id) {

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

function array_diff(a1, a2) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
        if (a2.indexOf(a1[i]) === -1) {
            result.push(a1[i]);
        }
    }
    return result;
}

function setUserTime(user_id) {
    var current_time = new Date();
    current_time = current_time.getTime();
    UserTime[user_id] = current_time;
    logObject('current_time', current_time, UserTime);
}

function isEmptyMongodbID(id){
    if(isEmpty(id) || !mongoose.Types.ObjectId(id)){
        return true;
    }
    return false;
}

function sendEventSocket(room_id, event_name, data){
    logObject('call event, ', room_id, event_name, data);
    io.to(room_id).emit(event_name, data);
}

function createParameterDefault(room_type, room_id, user_id, member){
    var params = {};
    params.room_type = room_type;
    params.room_id = room_id;
    params.user_id = user_id;
    params.member = member;
    return params;
}

function updateRoom(data, callback){
    var room_id = data.room_id;
    if(isEmptyMongodbID(room_id)){
        logObject('room valid');
        var data_return = {
            'success' : false,
            'message' : 'room valid'
        };
        sendEventSocket(room_id, 'status_ex_key', data_return);
        return callback(true);
    }
    getRoomEx(data, function (error, room) {
        if(error || !room){
            logObject('room valid');
            var data_return = {
                'success' : false,
                'message' : 'room valid'
            };
            sendEventSocket(room_id, 'status_ex_key', data_return);
            return callback(true);
        }
        room.share_key_flag = true;
        room.save();
        var data_return = {
            success: true,
        };
        sendEventSocket(room_id, 'on_event_ex_key_finish', data_return);
    });
}

function clearLogUserRoom(user_id){
    // get toan bo room cua user_id
    // for cac room do -> clear log cua tung room theo user_id

    Room.findOne({user_id: {$or: {admin_id: user_id, member: {$in: [user_id]}} }, deleted_at: null}, {}, {}, function (err, rooms) {
        if(err){
            return ;
        }
        rooms.forEach(function(room){
            var room_id = room._id;
            var logName = room_id + "_logs";
            var logCollection = CreateModelLogForName(logName);
            logObject('---clear log by room: ', logName);
            logCollection.updateMany({}, {$addToSet: {clear_log : [user_id]}}, function (err, log) {
                if(err){
                    logObject(' ko tim thay room');
                    return;
                }
            })
        });
    });
}

function getUserSaveLog(params){
    logObject('*******************getUserSaveLog**************');
    // tạo và trả về 1 Promise, khi này Promise ở trang thái pending
    return new Promise(function(resolve, reject) {
        // tâm sinh lý ngẫu nhiên
        var member = params.member;
        User.find({_id : {$in: member}, deleted_at: null}, {}, {}, function(err, users) {
            var result = {};
            if(err || !users){
                result['reason'] = 'khong tim thay user nao';
                result['error'] = true;
                return reject(result);
            }
            var user_log = [],
                user_send_message = {};
            users.forEach(function(user) {
                logObject(params.user_id ,'==', user._id);
                if(isEmpty(user.time_save_log) || (!isEmpty(user.time_save_log.save) && user.time_save_log.save)){
                    user_log.push(user);
                }
                if(params.user_id == user._id){
                    user_send_message = user;
                }
            });
            result['error'] = false;
            result['user_send_message'] = user_send_message;
            result['user_log'] = user_log;
            return resolve(result);
        });
    });
}

function saveUserSaveLog(params, users, message, message_type){
    logObject('*******************saveUserSaveLog**************');
    return new Promise(function(resolve, reject) {
        var user_save_log = [];
        var logCollection = params.logCollection;
        if(!logCollection){
            logCollection = CreateModelLogForName(params.room_id + "_logs");
            params.logCollection = logCollection;
        }
        var now = new Date();
        users.forEach(function(user) {
            user_save_log.push({
                room_id: params.room_id,
                user_id: params.user_id,
                uid: user._id,
                admin_id: params.admin_id,
                message_type: message_type,
                message: message,
                time_of_message: now.getTime(),
                ymd: moment(now).tz(TIMEZONE).format(ymd_global),
                created_at : now,
                updated_at : now
            });
        });
        logObject('user_save_log', user_save_log);
        logCollection.insertMany(user_save_log, function(error, docs) {
            if(error){
                logObject('error when save log', error);
            }
            var log_ids = {};
            docs.forEach(function(doc) {
                log_ids[doc.uid] = doc._id;
            });
            var data = {
                error : false,
                log_ids: log_ids
            };
            return resolve(data);
        });
    });
}

function updateLastMessage(params, message, message_type){
    logObject('*******************updateLastMessage**************');
    return new Promise(function(resolve, reject) {
        var now = new Date();
        LastMessage.findOne({room_id: params.room_id}, function(err, result) {
            if(err){
                var reason = 'Lỗi create last message';
                return reject(true, reason);
            }
            // Nếu tìm thấy update, ngược lại create
            if(result){
                result.updated_at = now;
                result.user_id = params.user_id;
                result.message_type = message_type;
                result.message = message;
                result.save();
                return resolve(false);
            }else{
                var LastMessageSave = new LastMessage({
                    room_id: params.room_id,
                    user_id: params.user_id,
                    message_type : message_type,
                    message : message,
                    created_at : now,
                    updated_at : now
                });
                LastMessageSave.save(function(err) {
                    if (err) {
                        var reason = 'Lỗi save last message';
                        return reject(true, reason);
                    }
                });
            }
        });
    });
}

function updateUnreadMessage(params){
    logObject('*******************updateUnreadMessage**************');
    return new Promise(function(resolve, reject) {
        var data_ids = params.user_id_not_arr;
        var room_id = params.room_id;
        var unread_message_counts = {};
        UnreadMessage.find({room_id: params.room_id, user_id: {$in: data_ids}, deleted_at: null}, function (err, unreads) {
            var result = {error: true};
            if(err){
                return reject(result);
            }
            // chưa có record trong unread message
            if(isEmpty(unreads)){
                insertUnreadMessage(room_id, data_ids);
                for(var i = 0; i< data_ids.length; i++){
                    unread_message_counts[data_ids[i]] = 1;
                }
                // có ít nhất 1 record trong unread
            }else{
                var user_id_tmp = [];
                unreads.forEach(function(unread) {
                    user_id_tmp.push(unread.user_id);
                    unread.count = unread.count + 1;
                    unread.save();
                    unread_message_counts[unread.user_id] = unread.count;
                });
                logObject('user_id_tmp: ', user_id_tmp, ', data_ids: ', data_ids);
                if(user_id_tmp.length < data_ids.length){
                    var user_id2 = arrayDiff(data_ids, user_id_tmp);
                    logObject('user_id2: ', user_id2);
                    insertUnreadMessage(room_id, user_id2);
                    for(var i = 0; i< user_id2.length; i++){
                        unread_message_counts[user_id2[i]] = 1;
                    }
                }
            }
            result['error'] = false;
            result['unread_message_counts'] = unread_message_counts;
            return resolve(result);
        });
    });
}

function sendMessageOutsideRoom(params, message, message_type, unread_message_counts, log_ids){
    logObject('*******************sendMessageOutsideRoom**************');
    var now = new Date();
    var result = {
        'user_id' : params.user_id,
        'user_name' : params.user_name,
        'avatar' : params.avatar,
        'admin_id' : params.admin_id,
        'room_id' : params.room_id,
        'message_type' : message_type,
        'message' : message,
        'created_at' : moment(now).tz(TIMEZONE).format(date_format_global),
    };
    logObject('unread_message_counts: ', unread_message_counts);
    if(!isEmpty(unread_message_counts)){
        Object.keys(unread_message_counts).forEach(function (id) {
            result.data_unread_message_count = unread_message_counts[id];
            // send message for user_id not in room
            logObject('unread.user_id: ', id, ', count: ', unread_message_counts[id], 'result: ', result);
            var _id = '';
            if(!isEmpty(log_ids[id])){
                _id = log_ids[id];
            }
            result._id = _id;
            sendEventSocket(id, 'server_send_message', result)
        });
    }
}

function getUser(user_id, callback){
    User.findOne({_id : user_id, deleted_at: null}, {}, {}, function(err, user) {
      if(err || !user){
          return callback(true);
      }
      return callback(false, user);
    })
}

function userExKeyOnline(user_id){
    if(!isEmpty(queue_exchange_key)){
        var current_time = new Date();
        current_time = current_time.getTime()+2;
        for(var i = 0; i < queue_exchange_key.length; i++){
            var user_current = queue_exchange_key[i];
            logObject('1', user_current.time);
            if(!isEmpty(user_current.time)){
                if(!isEmpty(user_current.data_client) && !isEmpty(user_current.data_client.to_client_id) && user_id == user_current.data_client.to_client_id){
                    if(current_time - user_current.time <= queue_time_exchange_key){
                        // exchange key
                    }
                    queue_exchange_key.splice(i, 1);
                }else if(current_time - user_current.time > queue_time_exchange_key){
                    queue_exchange_key.splice(i, 1);
                }
            }
        }
        logObject('end ',queue_exchange_key );
    }
}

function logObject(name_log, data){
	if(list_disable_show_log.indexOf(name_log) >= 0){
		return;
	}
    var new_line = false;
    var line = [];
    if((typeof name_log === 'string') && name_log.search('----') >= 0){
        new_line = true;
    }
    if(new_line){
        console.log('');
    }
    if(isEmpty(data)){
        console.log(name_log);
        return;
    }
    for(var i = 0; i < arguments.length; i++){
        line.push(arguments[i])
    }
    var now = new Date();
    var date = moment(now).tz(TIMEZONE).format(date_format_global);
    console.log('date: %s: %j', date, line);
}

function getErrorException(err){
    var message = err;
    if(typeof (err) == 'string'){
        message = message.replace(/([ ]+)/gm," ").replace(/(\r\n|\n|\r)/gm,".");
    }
    if(err.stack != void 0){
        let stack = err.stack.replace(/([ ]+)/gm," ").replace(/(\r\n|\n|\r)/gm,".");
        message += ". detail: " + stack;
    }
    return message;
}

function sendUserStatusInContact(user_id, contact, status){
    if(!isEmpty(contact) && !isEmptyMongodbID(user_id)){
        var data_user_online = {
            user_id: user_id,
            status: status,
        };
        for(var i = 0; i< contact.length; i++){
            sendEventSocket(contact[i], 'user_online', data_user_online);
        }
    }
}