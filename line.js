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
var date_format_mini_global = 'YYYY-MM-DD';

var kue = require('kue'),
    queue = kue.createQueue();

var Room = model.Room;

const
    ADMIN_KEY_FLG_TRUE=1,
    ADMIN_KEY_FLG_FALSE=0,
    ADMIN_KEY_FLG_UNKNOW=-1;

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

const TIME_USER_LOGOUT = 60000;// 1 phút

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

    // socketIO check connection status
    io.on('connection', function (socket) {
        console.log(io.engine.clientsCount);
        console.log("client connected");
        console.log("connection worker =" + cluster.worker.id);

        socket.on('disconnect', function () {
            console.log('client disconnected');
        });

        socket.on('user_join', function (data) {
            console.log('----------------------------------socket user_join---------------------------', data);
            showListRoom(socket);
            validUserId(data, function (error, result, params) {
                if(!error && result){
                    var user_id = data.user_id;
                    var admin_key_flg = data.admin_key_flg;
                    updateAdminKeyInRoom(user_id, admin_key_flg, function(err){
                        if(!err){
                            userJoinRoom(socket, user_id, function(success){
                                if(success){
                                    setNickNameSocket(socket, user_id, function(success){
                                        if(success){
                                            var data_return = {
                                                success: true,
                                            };
                                            io.to(user_id).emit('status_join', data_return);
                                            return;
                                        }
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
            console.log('----------------------------socket user_join_room-------------------------------', data);
            validRoom(data, function( error, room, param){
                if(!error && room){
                    userJoinRoom(socket, user_id, function(success){
                        if(success){
                            setNickNameSocket(socket, user_id, function(success){
                                if(success){
                                    var data_result = {
                                        success: true,
                                        room_id: param.room_id,
                                        admin_id: room.admin_id,
                                        type: param.room_type,
                                        member: param.member,
                                    };
                                    userJoinRoom(socket, param.room_id, function (success) {
                                        console.log('userJoinRoom success', success);
                                        if(!success){
                                            console.log('send status false');
                                            data.success = false;
                                            data.message = "message.not_join_room ," + param.room_id;
                                            io.to(user_id).emit('status_join_room', data);
                                        }
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
            console.log("---------------------------------socket user_send_message data",data);
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
                                        if(!success){
                                            data.success = false;
                                            data.message = "message.not_join_room ," + params.room_id;
                                            io.to(user_id).emit('status_join_room', data);
                                        }
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
                    if(!isEmpty(UserRoom[value]) || !isEmpty(UserKey[value])){
                        setTimeout(function () {
                            setUserOffline(value)
                        }, TIME_USER_LOGOUT);
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

        socket.on('user_logout', function(data){
            console.log('---------------------------------user logout---------------------------');
            var user_id = data.user_id;
            if(isEmptyMongodbID(user_id)){
                console.log('user_logout miss params');
                var data_return = {
                    'success' : false,
                    'message' : 'user_logout miss params'
                };
                sendEventSocket(user_id, 'status_user_logout', data_return);
                return;
            }
            doUserLogout();
        });

        socket.on('event_ex_key_step1', function(data){
            console.log('---------------------------------event_ex_key_step1---------------------------');
            console.log(data);
            validRoomEx(data, function(error, room){
                if(!error && room){
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
                            sendEventSocket(to_client_id, 'on_event_ex_key_step1', data_client);
                        }
                    });
                }
            });
            // do_ex_key_step(data, 'on_event_ex_key_step1', socket);
        });

        socket.on('event_ex_key_step2', function(data){
            console.log('---------------------------------event_ex_key_step2---------------------------');
            console.log(data);
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
            console.log('---------------------------------event_ex_key_step3---------------------------');
            console.log(data);
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
            console.log('---------------------------------event_ex_key_step4---------------------------');
            console.log(data);
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
            console.log('---------------------------------event_ex_key_step5---------------------------');
            console.log(data);
            data.check_user_id = false;
            validRoomEx(data, function(error, room){
                if(!error && room){
                    updateRoom(data, function(error, room){

                    });
                }
            });
        });

        // lắng nghe client muốn trao đổi key với admin trong 1 room
        //
        socket.on('start_exchange_key', function(data){
            console.log('---------------------------------start_exchange_key---------------------------');
            console.log(data);
            var room_id = data.room_id;
            var user_id = data.user_id;
            validRoomEx2(room_id, user_id, function(error, room){
                if(!error && room){
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
    console.log('**********************send user***************************');
    console.log(req.body);
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
        console.log('data send', data_client);
        io.to(to_client_id).emit(ename, data_client);
        res.status(200).send('ok send');
    }else{
        console.log('miss param');
        res.sendStatus(403);
    }
});

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

function setUserOffline(user_id) {
    var current_time = new Date();
    current_time = current_time.getTime();
    console.log('---------------------setUserOffline---------------------');
    console.log('user_id', user_id, UserTime, UserTime[user_id], current_time, UserTime[user_id] - current_time);
    var time_secound = TIME_USER_LOGOUT/1000;
    console.log(!isEmpty(UserTime[user_id]), current_time - UserTime[user_id], TIME_USER_LOGOUT);
    if(!isEmpty(UserTime[user_id]) && (current_time - UserTime[user_id] > TIME_USER_LOGOUT)){
        console.log('start set user offline');
        setUserStatus(user_id, false);
        deleteUserKey(user_id);
        User.findOne({_id: user_id, deleted_at: null, }, function (err, result) {
            if(!err && result){
                result.is_login = false;
                result.save();
            }
        });
    }
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

function validRoom(data, callback){
    var room_id = data.room_id;
    var user_id = data.user_id;
    var room_type = data.room_type;
    var member = data.member;
    var room_type_arr = [ROOM_TYPE_ONE_MANY, ROOM_TYPE_ONE_ONE];
    console.log('---------------------validRoom-----------------------');
    console.log(data);
    if(isEmptyMongodbID(user_id)){
        data.success = 0;
        data.message = 'user id miss';
        console.log('user_id miss');
        io.to(user_id).emit('status_join_room', data);
        return callback(true);
    }
    if(!isEmptyMongodbID(room_id)){
        var query = {_id: room_id, deleted_at: null};
    }else {
        if (isEmpty(room_type) || !room_type_arr.indexOf(room_type)) {
            data.success = 0;
            data.message = 'message.room_type_validate';
            io.to(user_id).emit('status_join_room', data);
            console.log('room_type_validate');
            return callback(true);
        } else if (isEmpty(member) || !(member instanceof Array) || (room_type == ROOM_TYPE_ONE_ONE && member.length != 2)) {
            data.success = 0;
            data.message = 'message.member_validate_1';
            console.log('member_validate_1');
            io.to(user_id).emit('status_join_room', data);
            return callback(true);
        }
        var query = {member: {$all : member, $size : 2},room_type: room_type, deleted_at: null}
    }
    User.findOne({_id: user_id, deleted_at: null}, function (err, user) {
        console.log('validRoom find user ', user);
        var params = createParameterDefault(room_type, undefined, data.user_id, member);
        if(err || !user){
            data.success = false;
            data.message = "message.user_not_exsits";
            io.to(user_id).emit('status_join_room', data);
            console.log('user_not_exsits');
            return callback(true);
        }
        getRoomEx2(room_id, query, function(err, room){
            // trường hợp room đã tồn tại ( room 1-1, 1-n)
            // trường hợp room 1-1 chưa tồn tại => create room
            // các trường hợp còn lại lỗi hết
            if (!err && room) {
                // room 1-1, admin_key_flg = false => create room
                //           admin_key_flg = true, unknow => tra ve cac thong tin room
                params.room_type = room.room_type;
                params.member = room.member;
                if(room.admin_key_flg == ADMIN_KEY_FLG_FALSE){
                    if(room.room_type == ROOM_TYPE_ONE_ONE){
                        roomCreate(user_id, member, room_type, function(err, roomStore){
                            if (err) throw err;
                            console.log('room create in truong hop 1-1, admin key flag false');
                            params.room_id = roomStore._id;
                            params.admin_key_flg = roomStore.admin_key_flg;
                            return callback(false, roomStore, params);
                        });
                    }else{
                        // admin ko vao duoc room voi truong hop key clear
                        if(user_id == room.admin_id){
                            console.log('admin bi clear data');
                            data.success = 0;
                            data.message = 'message.room_not_exits';
                            io.to(user_id).emit('status_join_room', data);
                            return callback(true);
                        // user binhf thuong van join duoc vao room
                        }else{
                            console.log('room join bin thuong  in truong hop 1-1, admin key flag false');
                            params.room_id = room._id;
                            params.admin_key_flg = room.admin_key_flg;
                            return callback(false, room, params);
                        }
                    }
                }else{
                    params.room_id = room._id;
                    params.admin_key_flg = room.admin_key_flg;
                    console.log('room true', room);
                    return callback(false, room, params);
                }
            }else if(room_type == ROOM_TYPE_ONE_ONE){
                var u1 = member[0];
                var u2 = member[1];
                var contact = user.contact;
                if(!isEmpty(contact) && contact instanceof Array &&
                    ((u1 == user._id && contact.indexOf(u2) >= 0) ||( u2 == user._id && contact.indexOf(u1) >= 0))){
                    roomCreate(user_id, member, room_type, function(err, roomStore){
                        if (err) throw err;
                        params.room_id = roomStore._id;
                        params.admin_key_flg = roomStore.admin_key_flg;
                        return callback(false, roomStore, params);
                    });
                }
            } else{
                console.log('member_validate_3');
                data.success = 0;
                data.message = 'message.room_not_exits';
                io.to(user_id).emit('status_join_room', data);
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
        console.log('room true store');
        params.room_id = roomStore._id;
        params.room_type = roomStore.room_type;
        params.admin_key_flg = roomStore.admin_key_flg;
        params.member = roomStore.member;
        return callback(false, roomStore);
    });
}

function do_ex_key_step(data, event_name, socket){
    console.log('---------------------------sed event---------------------');
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
    console.log('event_name: ',event_name, 'data: ', data, 'to client', to_client_id);
    // sendEventSocket(to_client_id, event_name, data_client);
    io.to(to_client_id).emit(event_name, data_client);
}

function validRoomEx(data, callback){
    console.log('---------------------validRoomEx-----------------------');
    var from_client_id = data.from_client_id,
        to_client_id = data.to_client_id,
        room_id = data.room_id,
        check_user_id = isEmpty(data.check_user_id) ? data.check_user_id : true;
    if(isEmptyMongodbID(room_id) || (check_user_id && (isEmptyMongodbID(from_client_id) || isEmptyMongodbID(to_client_id)))){
        console.log('validRoomEx miss params by data' , data);
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
            console.log('room valid by id', room_id);
            var data_return = {
                'success' : false,
                'message' : 'room valid'
            };
            sendEventSocket(room_id, 'status_ex_key', data_return);
            return callback(true);
        }
        console.log('**********************room true-----------', room);
        if(!isEmpty(data.admin_key_flg)){
            room.admin_key_flg = data.admin_key_flg;
            room.save();
        }
        return callback(false, room);
    });
}

function validRoomEx2(room_id, user_id, callback){
    if(isEmptyMongodbID(room_id) || isEmptyMongodbID(user_id)){
        console.log('miss param, room_id', room_id, 'user_id', user_id);
        return callback(true);
    }
    getRoomEx2(room_id, {}, function(err, room){
        if(err || !room){
            console.log('room_id miss', room_id, 'user_id', user_id);
            return callback(true);
        }
        var room_member = room.member;
        var room_admin_id = room.admin_id;
        if(user_id != room_admin_id && room_member.indexOf(user_id)){
            console.log('valid true');
            return callback(false, room);
        }else if(user_id == room_admin_id){
            console.log('room_id trao doi key admin voi admin');
            return callback(true);
        }
        console.log('room_id error param', room_id, 'user_id', user_id);
        return callback(true);
    });
}

function userJoinRoom(socket, room_id, callback) {
    console.log('-----------------user join room-----------------------');
    console.log(room_id);
    showListRoom(socket);
    var rooms = Object.keys(socket.rooms);
    if (rooms.indexOf(room_id) >= 0) {
        console.log('room_id ton tai');
        showListRoom(socket);
        return callback(true);
    }else if (rooms.indexOf(room_id) == -1) {
        socket.join(room_id, function() {
            showListRoom(socket);
            console.log('room_id vua enjoin');
            return callback(true);
        });
    }else{
        console.log('error join room with ' +room_id);
        return callback(false);
    }
}

function validUserId(data, callback){
    console.log('-----------------valid user id-----------------------');
    var user_id = data.user_id;
    if(!user_id || !mongoose.Types.ObjectId.isValid(user_id)){
        data.success = 0;
        console.log('status_join miss user_id', data);
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
            console.log('status_join user valid', data);
            io.to(user_id).emit('status_join', data);
            return callback(true);
        }
    });
}

function updateAdminKeyInRoom(admin_id, admin_key_flg_arr, callback){
    console.log('-----updateAdminKeyInRoom admin_id: ' , admin_id, ' key: ', admin_key_flg_arr);
    Room.find({admin_id: admin_id, deleted_at: null}, function (err, rooms) {
        if(!err && rooms){
            rooms.forEach(function (row) {
                var current_admin_key_flg = ADMIN_KEY_FLG_FALSE;
                var current_room_id = row._id;
                if(!isEmpty(admin_key_flg_arr) && admin_key_flg_arr.indexof(current_room_id) >= 0){
                    current_admin_key_flg = admin_key_flg_arr[current_room_id];
                }
                row.admin_key_flg = current_admin_key_flg;
                row.save();
            });
        }
        return callback(false);
    })
}

function doUserLogout(data, callback){
    var user_id = data.user_id;
    var data_return = {};
    User.findOne({_id: user_id, deleted_at: null}, function (err, user) {
        if (!err && user) {
            // update login user
            user.is_login = false;
            user.save();
            console.log('user_logout success');
            data_return['success'] = true;
            sendEventSocket(user_id, 'status_user_logout', data_return);
            return callback(false);
        }else{
            data_return.success = false;
            data_return['message'] = 'user not exits';
            sendEventSocket(user_id, 'status_user_logout', data_return);
            return callback(true);
        }
    });
}

function sendKeyUserInRoom(data, params, callback) {
    var user_id = data.user_id;
    console.log('-----------------sendKeyUserInRoom-----------------------');
    var room_id_arr = setUserStatus(user_id);
    Room.find({_id: {$in: room_id_arr}, deleted_at: null}, function (err, rooms) {
        console.log('rooms : ', rooms);
        if(!err && rooms){
            rooms.forEach(function (room) {
                if(isEmpty(room.share_key_flg) || !room.share_key_flg){
                    var member = room.member;
                    var room_id= room._id;
                    console.log('room_id', room_id, 'member', member, ' check all user online');
                    // check all member_onine
                    var room_flg = checkUserRoomOnline(room_id);
                    if(room_flg){
                        console.log('----send key for all user online');
                        var user_room_key = getUserRoomKey(room_id);
                        for(var i = 0; i < member.length; i++){
                            io.to(member[i]).emit('user_share_key', user_room_key);
                        }
                        room.share_key_flg = true;
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
        var params = createParameterDefault(data.message_type, room_id, data.user_id, result.member);
        return callback(false, result, params);
    });
};

function getRoomEx(data, callback){
    console.log('----------------------get Room ex------------');
    var room_id = data.room_id;
    var query = {_id : room_id, deleted_at: null};
    var from_client_id = data.from_client_id,
        to_client_id = data.to_client_id;
    if(!isEmptyMongodbID(from_client_id) && !isEmptyMongodbID(to_client_id)){
        var member = [from_client_id, to_client_id];
        query.member = {$all : member, $size : 2};
    }
    Room.findOne(query, function (err, room) {
        console.log('getRoom', room);
        if(err || !room){
            return callback(true);
        }
        return callback(false, room);
    });
}

function getRoomEx2(room_id, option_query, callback){
    console.log('----------------------get Room ex2------------');
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

function listen () {
    app.listen(app.get('port'), function() {
        console.log('Node app is running on port', app.get('port'));
    });
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
                    setUserTime(params.user_id);
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
        console.log('room empty or error');
        return;
    }
    var rooms = Object.keys(socket.rooms);
    console.log('room current', rooms);
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
    console.log('all member online', status);
    return status;
}

function setUserStatus(user_id, status) {
    console.log('----------------setUserStatus---------------------');
    console.log(user_id);
    if(isEmpty(status)){
        status = true;
    }
    var room_id_arr = [];
    for (var room_id in UserRoom) {
        var room_current = UserRoom[room_id];
        if(!isEmpty(room_current[user_id])){
            UserRoom[room_id][user_id] = status;
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

function deleteUserKey(user_id) {
    console.log('---------------------deleteUserKey---------------------');
    console.log('user_id', user_id);
    if(!isEmpty(UserKey[user_id])){
        delete UserKey[user_id];
        console.log('delete user key success');
        return true;
    }
    console.log('delete user key false');
    return false;
}

function setUserTime(user_id) {
    var current_time = new Date();
    current_time = current_time.getTime();
    UserTime[user_id] = current_time;
    console.log('current_time', current_time, UserTime);
}

function isEmptyMongodbID(id){
    if(isEmpty(id) || !mongoose.Types.ObjectId(id)){
        return true;
    }
    return false;
}

function sendEventSocket(room_id, event_name, data){
    console.log('cakl evnet, ', room_id, event_name);
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
        console.log('room valid');
        var data_return = {
            'success' : false,
            'message' : 'room valid'
        };
        sendEventSocket(room_id, 'status_ex_key', data_return);
        return callback(true);
    }
    getRoomEx(data, function (error, room) {
        if(error || !room){
            console.log('room valid');
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