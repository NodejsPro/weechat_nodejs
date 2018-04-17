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
// var helper = require('sendgrid').mail;
var i18n = require("i18n");
var User = model.User;
var Connect = model.Connect;
var ConnectPage = model.ConnectPage;
var Scenario = model.Scenario;
//var UserMessage = model.UserMessage;
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

const default_variable = ["current_url", "user_first_name", "user_last_name", "user_full_name", "user_gender", "user_locale", "user_timezone", "user_referral", "user_lat", "user_long", "user_display_name", "user_id"];
const filter_variable = ["user_gender", "user_locale", "user_timezone", "user_referral"];
const line_user_variable = ["text", "image", "sticker", "location"];

const LOG_MESSAGE_LIMIT = 300;
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
    MENU_TYPE_SUBMENU = "3";
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
var app = express();
app.set('port', process.env.PORT || config.get('appPort'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(abortOnError);
app.use(express.static('public'));
app.use(i18n.init);

var Redis = require('ioredis');
var redis = new Redis({
  port: config.get('redisPort'),
  host: config.get('redisHost')
});

var transporter = mailer.createTransport({
    host: 'localhost',
    port: 25,
    secure: false,
    tls:{
        rejectUnauthorized: false
    }
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/css', express.static(__dirname + '/public/assets/css'));
app.use('/js', express.static(__dirname + '/public/assets/js'));
app.use('/fonts', express.static(__dirname + '/public/assets/fonts'));
app.use('/images', express.static(__dirname + '/public/assets/images/'));


// var sg = require('sendgrid')(config.get('sendgrid_api_key'));

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

var http = require('http');
//var options = {
//    key: fs.readFileSync('/etc/pki/tls/private/embot_dev.key', 'utf8'),
//    cert: fs.readFileSync('/etc/pki/tls/certs/embot_dev.crt', 'utf8'),
//    ca: fs.readFileSync('/etc/pki/tls/certs/embot_dev_chain.crt', 'utf8')
//};

var server = http.createServer(app);

if(APP_ENV != "local"){
    var options = {
        key: fs.readFileSync('/etc/pki/tls/private/' + APP_ENV + '.key', 'utf8'),
        cert: fs.readFileSync('/etc/pki/tls/certs/' + APP_ENV + '.crt', 'utf8'),
        ca: fs.readFileSync('/etc/pki/tls/certs/' + APP_ENV + '_chain.crt', 'utf8'),
        passphrase: config.get('ssl_passphrase')
    };
    server = https.createServer(options, app);
}
const io = require('socket.io')();
//var io = require('socket.io')(app.server);
io.attach( server );
server.listen(config.get('socketPort'), function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log("Server listening at http://%s:%s", host, port)
});

app.get('/webchat', function (req, res) {
	res.sendFile(__dirname + '/public/assets/view/index.html');
});

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

var getUserPosition = function(connect_page_id, user_id){
    return Q.Promise(function (resolve, reject) {(UserPosition.findOne({connect_page_id: connect_page_id, user_id: user_id}).exec())
        .then(function(result) {
            if(result){
                return resolve(result);
            }
            return reject(result);
        });
    });
};

var redisPublicMessage = function(row){
    var new_position = 0;
    var scenarioResult;
    var botResult;
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
                    return Q(UserProfile.find({connect_page_id: row.connect_page_id}).exec());
                }
                return reject();
            })
            .then(function (userProfileResult) {
                if(userProfileResult && userProfileResult.length > 0){
                    sendBroadcastMessage(row, scenarioResult, botResult, userProfileResult);
                    return resolve(userProfileResult);
                }
                return reject();
            })
    });
};

function sendBroadcastMessage(row, scenarioResult, botResult, userProfileResult){
    var filter = ((typeof scenarioResult.filter !== 'undefined') ? scenarioResult.filter : []);
    var filter_user_profile = [];
    if(filter.length == 0){
        filter_user_profile = userProfileResult;
    }else{
        userProfileResult.forEach(function (user_profile) {
            var default_value_cnt = 0;
            var match_value_cnt = 0;
            filter.forEach(function (filter_row) {
                var variable = filter_row.condition;
                var variable_value = filter_row.value;
                var compare = filter_row.compare;
                if (filter_variable.indexOf(variable) > -1 && (typeof user_profile[variable] !== 'undefined') ) {
                    default_value_cnt++;
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
    saveNotificationHistory(row.connect_page_id, row.page_id, row.notification_id, botResult, user_list, filter_user_profile.length);
    filter_user_profile.forEach(function (user_profile) {
        var system_param = createParameterDefault(row.sns_type, row.connect_page_id, user_profile.user_id, row.page_id, row.page_access_token, row.scenario_id, row.notification_id);
        if(row.sns_type == SNS_TYPE_LINE){
            sendMultiMessageLine(system_param, botResult, 0);
        }else{
            sendMultiMessage(system_param, botResult, 0);
        }
    });
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

// socketIO check connection status
io.on('connection', function (socket) {
    //console.log(io.engine.clientsCount);
	console.log("client connected");

	socket.on('disconnect', function(){
		console.log('client disconnected');
	});

	//webchat client to server
	socket.on('webchat_join', function(data){
        console.log("webchat_join");
        console.log(data);
        socket.join(data.user_id);
        var connect_page_id = data.connect_page_id;
        if(!connect_page_id || !mongoose.Types.ObjectId.isValid(connect_page_id)){
            data.status = 0;
            io.to(data.user_id).emit('webchat_status_join', data);
            return true;
        }
        getConnectPageBySns(connect_page_id, SNS_TYPE_WEBCHAT)
            .then(function(connect_page) {
                data.status = 1;
                data.picture = SERVER_URL + '/' + connect_page.picture;
                data.setting = connect_page.setting;
                data.page_name = connect_page.page_name;
                //return[
                //    Q(LogChatMessage.find({ connect_page_id: connect_page.id, user_id: data.user_id, background_flg : null, error_flg: null}, {}, {sort: {created_at: 1}}).exec()),
                //    Q(Menu.find({connect_page_id: connect_page.id, parent_id: ""}).exec())
                //]
                return connect_page.id;
            })
            .then(getFullPersistentMenu)
            .then(function(menus){
                data.persistent_menu = menus;
                validConnectPageId(data, function (err, event, params) {
                    console.log(event);
                    if(!err){
                        params.ref = event.ref;
                        socket.broadcast.to(event.user_id).emit("webchat_other_user_start");
                        UserProfile.findOne({connect_page_id: connect_page_id, user_id: data.user_id}, function (err, user_profile) {
                           if(!user_profile){
                               params.disable_flg = 1;
                           }
                            saveUserProfileWebchat(params);
                        });

                        //if(event.new_conversation_flg){
                        //    saveUserProfileWebchat(params);
                        //}
                    }
                });
                socket.emit('webchat_status_join', data);
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
            .fail(function(){
                console.log("fail");
                data.status = 0;
                io.to(data.user_id).emit('webchat_status_join', data);
            })
            .catch(function(err) {
                console.error('Something went wrong: ' + err);
                saveException(err);
                data.status = 0;
                io.to(data.user_id).emit('webchat_status_join', data);
            });
	});

    socket.on('webchat_client_get_log', function(data){
        var connect_page_id = data.connect_page_id;
        var user_id = data.user_id;
        LogChatMessage.find({ connect_page_id: connect_page_id, user_id: data.user_id, background_flg : null, error_flg: null}, {}, {sort: {created_at: -1}, limit: LOG_MESSAGE_LIMIT}, function(err, result) {
            if (err) throw err;
            if(result){
                data.message = result.reverse();
                io.to(user_id).emit('webchat_server_send_log', data);
            }
        });
    });

	// get user information on start
	socket.on('webchat_client_sendinfo', function(data){
        var connect_page_id = data.connect_page_id;
        console.log(connect_page_id);
        validConnectPageId(data, function (err, event, params) {
            if(!err){
                params.user_full_name = event.user_full_name;
                params.user_email = event.user_email;
                params.ref = event.ref;
                socket.broadcast.to(event.user_id).emit("webchat_other_user_start");
                saveUserProfileWebchat(params);
            }
        });
	});

    socket.on('webchat_user_send_postback', function (data) {
        console.log("webchat_user_send_postback");
        console.log(data);
        updateUserLastTime(data.connect_page_id, data.user_id);
        receivedWebchatPostback(data);
    });

    socket.on('webchat_user_send_quickreplies', function (data) {
        console.log("webchat_user_send_quickreplies");
        console.log(data);
        updateUserLastTime(data.connect_page_id, data.user_id);
        receivedWebchatQuickreplies(data);
    });

	socket.on('webchat_user_send_message', function(data){
        console.log("webchat_user_send_message");
        console.log(data);
        validConnectPageId(data, function (err, event, params) {
            if(!err){
                checkLimitUserChat(data.connect_page_id, data.connect_id, data.user_id, SNS_TYPE_WEBCHAT, function (result_check, user) {
                    console.log('result_check: ', result_check);
                    console.log('new_conversation_flg', data.new_conversation_flg);
                   if(result_check){
                       saveLogChatMessage(params, MESSAGE_USER_TEXT, USER_TYPE, event.message, new Date());
                       console.log('continue: ');
                       socket.broadcast.to(event.user_id).emit("webchat_other_user_send_message", event);
                       updateUserLastTime(event.connect_page_id, event.user_id);
                       params.start_flg = 1;
                       receivedTextMessage(params, event.message.text);
                       UserProfile.update({connect_page_id: data.connect_page_id, user_id: data.user_id, disable_flg: 1}, {$set: {disable_flg: 0}},
                           {upsert: false, multi: false}, function (err) {
                               if (err) throw err;
                           });
                   } else {
                       console.log('sendMessageLimit: ');
                       sendMessageLimit(user, SNS_TYPE_WEBCHAT, params);
                   }
                });
            }
        });
	});


    socket.on('disconnecting', function(){
        var rooms = Object.keys(socket.rooms);
        if(rooms){
            rooms.forEach(function(value) {
                socket.leave(value);
            });
        }
    });

    socket.on('join', function (data) {
        console.log("join="+data.connect_page_id);
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
            .then(function(connect_page) {
                result = connect_page;
                return Q(UserPosition.findOne({connect_page_id: connect_page.id, user_id: data.user_id}).exec());
            })
            .then(function(resultPosition) {
                var current_scenario_id = undefined;
                if(resultPosition){
                    current_scenario_id = resultPosition.scenario_id;
                }
                updateBotLastTime(data.connect_page_id, data.user_id);
                var params = {};

                if(result.sns_type == SNS_TYPE_WEBCHAT){
                    params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id);
                    params.current_scenario_id = current_scenario_id;
                    sendMessageWebchat(params, data.data);
                }else if(result.sns_type == SNS_TYPE_LINE){
                    params = createParameterDefault(result.sns_type, result._id, data.user_id, result.channel_id, result.channel_access_token, current_scenario_id);
                    params.conversation_flg = 1;
                    sendMessageConversationLine(params, data.data);
                }else{
                    params = createParameterDefault(result.sns_type, result._id, data.user_id, result.page_id, result.page_access_token, current_scenario_id);
                    sendMessageConversationFacebook(params, data.data);
                }
            })
            .catch(function(err) {
                saveException(err);
            });
    });
});

redis.subscribe('notification');
redis.on("message", function(channel, message) {
  var data = JSON.parse(message);
  console.log(data);
  data =data.data.arr_notification;
  data.forEach(function(row) {
    //console.log(row.connect_page_id + " " + row.page_access_token + " " + row.scenario_id);
      redisPublicMessage(row)
          .fail(function(){
              console.log("fail");
          })
          .catch(function(err) {
              saveException(err);
          });
  });
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */

app.post('/webhook/line', function (req, res) {
    var data = req.body;
    var events = req.body.events;
    console.log("/webhook/line");
    console.log(events);
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
  console.log(req.query['hub.mode']);
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

  console.log("secret_key="+secret_key);
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
        }
        //else if (messagingEvent.account_linking) {
        //  receivedAccountLink(messagingEvent);
        //}
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

function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];
  var signature_line = req.headers["x-line-signature"];
  var secret_key = req.query.secret_key;
  if(signature_line){
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
            checkLimitUserChat(connect_page_id, connect_id, user_chat_id, function (result_check, user) {
                if(result_check){
                    saveLogChatMessage(system_param, MESSAGE_USER_PAYLOAD, USER_TYPE, 'Follow', event.timestamp, event.type);
                    saveUserLineProfile(system_param, page_access_token);
                    getStartScenario(system_param);
                } else {
                    sendMessageLimit(user, result.sns_type, params);
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
            UserProfile.findOneAndUpdate({ connect_page_id: params.connect_page_id, user_id: params.user_id}, { $set: {unfollow_at: event.timestamp, last_active_at: event.timestamp, updated_at: new Date()}}, { upsert: false }, function(err, result) {
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
    if(type == SNS_TYPE_LINE){
        console.log("receivedMessage Line");
        console.log(event);
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
                if (line_user_variable.indexOf(line_user_type) > -1){
                    saveLogChatMessage(system_param, eval("LINE_USER_" +  line_user_type.toUpperCase()), USER_TYPE, message, timeOfMessage);
                }
                if(messageText){
                    UserPosition.findOne({connect_page_id: connect_page_id, user_id: senderID}, function(err, result) {
                        if (err) throw err;
                        console.log("UserPosition");
                        //console.log(result);
                        if(result){
                            updateNotification(system_param);
                            receivedTextMessage(system_param, messageText);
                        }else{
                            saveUserLineProfile(system_param, page_access_token);
                            getStartScenario(system_param);
                            setTimeout(function() {
                                receivedTextMessage(system_param, messageText);
                            }, 2000);
                        }
                    });
                }
            }
        });
    }else{
        var senderID = event.sender.id.toString();
        var recipientID = event.recipient.id.toString();
        var timeOfMessage = event.timestamp;
        var message = event.message;
        console.log("Received message for user %d and page %d at %d with message:",
            senderID, recipientID, timeOfMessage);
        //console.log("ConnectPage");
        console.log(recipientID);
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
                            saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, messageText, timeOfMessage, quickReplyPayload);
                            var quick_replies_index = quickReplyPayload.indexOf("QUICK_REPLIES_");
                            if(quick_replies_index > -1){
                                var current_payload = quickReplyPayload.replace( /QUICK_REPLIES_/g , "");
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
                                    connectScenario(params);
                                    return;
                                }

                            }
                            quickRepliesAfterClickButton(params);
                        }
                    }else if (messageText) {
                        if(result){
                            saveLogChatMessage(params, MESSAGE_USER_TEXT, USER_TYPE, messageText, timeOfMessage);
                            receivedTextMessage(params, messageText);
                        }else{
                            saveLogChatMessage(params, MESSAGE_USER_TEXT, USER_TYPE, messageText, timeOfMessage);
                            params.payload = "GET_STARTED_PAYLOAD";
                            newUserProfile(params);
                            setTimeout(function() {
                                receivedTextMessage(params, messageText);
                            }, 2200);
                        }
                    }else if (messageAttachments) {
                        saveLogChatMessage(params, MESSAGE_USER_ATTACHMENT, USER_TYPE, messageAttachments, timeOfMessage);
                        if(messageAttachments[0] && messageAttachments[0].type == "location"){
                            var coordinates = messageAttachments[0].payload.coordinates;
                            saveUserCoordinates(params, coordinates);
                        }
                    }
                });
            }
        });
    }
  //console.log("Received message for user %d and page %d at %d with message:",
  //    senderID, recipientID, timeOfMessage);
  //console.log(JSON.stringify(message));
}


function receivedTextMessage(params, messageText){
    var messageTextLower = messageText.toLowerCase();
    getAllVariableValue(params, function (err, user_variable) {
        params.user_variable = user_variable;
        UserPosition.findOne({ connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, user_position) {
            if (err) throw err;
            console.log("UserPosition2");
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
                    console.log("allDialogLibrary");
                    allDialogLibrary(params, messageTextLower);
                    return true;
                }
                Scenario.findOne({_id: current_scenario_id, connect_page_id: user_position.connect_page_id, deleted_at: null}, function(err, result) {
                    if (err) throw err;
                    //console.log(result);
                    if(result){
                        var scenario_library_arr = result.library;
                        BotMessage.findOne({ scenario_id: result._id, message_type: MESSAGE_USER, position: current_position + 1}, function(err, result) {
                            if (err) throw err;
                            //console.log("user talk");
                            //console.log(result);
                            if(result && result.data){
                                params.variable_id = result.data[0].variable_id;
                                params.current_user_position = user_position;
                                saveUserSpeechVariable(params, messageText, function (err) {
                                    var new_position;
                                    var content = result.data[0];
                                    //console.log("content");
                                    //console.log(content);
                                    if(content.type == USER_TYPE_TEXT ){
                                        //console.log("user messageText");
                                        var isMatch = true;
                                        if(content.text){
                                            var arr = content.text.toLowerCase().split(",");
                                            isMatch = false;
                                            arr.some(function (value, index2, _ary2) {
                                                if (messageTextLower.indexOf(value) > -1) {
                                                    isMatch = true;
                                                    return true;
                                                }
                                            });
                                        }
                                        if(isMatch){
                                            new_position = current_position + 2;
                                            BotMessage.find({ scenario_id: result.scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                                                if (err) throw err;
                                                console.log("Bot messageText");
                                                //console.log(result);
                                                if(result && result.length > 0){
                                                    if(params.sns_type == SNS_TYPE_LINE){
                                                        sendMultiMessageLine(params, result, new_position);
                                                    }else if(params.sns_type == SNS_TYPE_WEBCHAT){
                                                        sendMultiMessageWebchat(params, result, new_position);
                                                    }else{
                                                        sendMultiMessage(params, result, new_position);
                                                    }
                                                    return true;
                                                }
                                                scenarioDialogLibrary(params, messageTextLower, scenario_library_arr);
                                                return true;
                                                //saveUserPosition(connect_page_id, senderID, recipientID, current_scenario_id, new_position);
                                            });
                                        }else{
                                            scenarioDialogLibrary(params, messageTextLower, scenario_library_arr);
                                            return true;
                                        }
                                    }else if(content.type == USER_TYPE_LIBRARY){
                                        var library_arr = content.library;
                                        if(library_arr && library_arr.length > 0){
                                            Library.find({ _id: { "$in" : library_arr}}, function(err, library_result) {
                                                if (err) throw err;
                                                //console.log("library_result");
                                                //console.log(library_result);
                                                var position_arr = [];
                                                if(library_result && library_result.length > 0){
                                                    position_arr = getMatchData(messageTextLower, library_result);
                                                }
                                                ////console.log("position_arr");
                                                ////console.log(position_arr);
                                                if(position_arr.length > 0){
                                                    ////console.log(tmp_index);
                                                    var element = getMaxLength(position_arr);
                                                    if(element){
                                                        var row = element.data;
                                                        //console.log("params");
                                                        //console.log(params);
                                                        if(row.type == LIBRARY_TEXT){
                                                            row.answer = variableTextToValue(row.answer, params.user_variable);
                                                            var answer = convertTextMessage(params.sns_type, row.answer);
                                                            sendMessage(params, USER_TYPE_TEXT, answer);
                                                            return true;

                                                        }else if(row.type == LIBRARY_SCENARIO){
                                                            params.current_scenario_id = row.answer;
                                                            connectScenario(params);
                                                            return true;
                                                        }
                                                    }
                                                    scenarioDialogLibrary(params, messageTextLower, scenario_library_arr);
                                                    return true;
                                                }else{
                                                    scenarioDialogLibrary(params, messageTextLower, scenario_library_arr);
                                                    return true;
                                                }
                                            })
                                        }else{
                                            scenarioDialogLibrary(params, messageTextLower, scenario_library_arr);
                                            return true;
                                        }
                                    }else if(content.type == USER_TYPE_API){
                                        params.variable_id = content.variable;
                                        params.api_id = content.message.api;
                                        //userVariableSettingApi(params, messageText);
                                        return true;
                                    }
                                });
                            }else{
                                console.log("no botmessage");
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
              UserPosition.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
                  if (err) throw err;
                  switch (payload) {
                      case 'GET_STARTED_PAYLOAD':
                          checkLimitUserChat(connect_page_id, connect_id, senderID, function (result_check, user) {
                              if (err) throw err;
                              if (result_check) {
                                  console.log("GET_STARTED_PAYLOAD");
                                  saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, 'Start', timeOfPostback, payload);
                                  params.current_scenario_id = '';
                                  saveUserPosition(params, -1);
                                  params.payload = payload;
                                  saveUserProfile(params, referral);
                                  if (typeof start_message !== "undefined" && start_message) {
                                      var answer = convertTextMessage(sns_type, start_message);
                                      sendMessage(params, USER_TYPE_TEXT, answer);
                                  }
                              } else {
                                  sendMessageLimit(user, SNS_TYPE_FACEBOOK, params);
                              }
                          });
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
                          } else if (scenario_index2 > -1) {
                              new_payload = payload.replace(/SCENARIO_/g, "");
                              arr = new_payload.split("_");
                          }
                          if(arr.length == 1){
                              current_scenario_id = arr[0];
                          }else if(arr.length > 1){
                              current_scenario_id = arr[0];
                              params.payload_value = arr[1];
                              if(arr[2] && arr[3]){
                                  var item_id = arr[2];
                                  var item_variable = arr[3];
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
                var scenario_index = payload.indexOf("SCENARIO_");
                var current_scenario_id = null;

                var arr  = [];
                var new_payload = '';
                if(scenario_index > -1) {
                    new_payload = payload.replace(/SCENARIO_/g , "");
                    arr = new_payload.split("_");
                }
                if(arr.length == 1){
                    current_scenario_id = arr[0];
                }else if(arr.length == 2){
                    current_scenario_id = arr[0];
                    params.payload_value = arr[1];
                }
                if(current_scenario_id){
                    params.current_scenario_id = current_scenario_id;
                    connectScenario(params);
                }
                saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, params.payload_value, timeOfMessage, payload);
                updateNotification(params);
            }
        }
    });
}

function validConnectPageId(data, callback){
    var connect_page_id = data.connect_page_id;
    if(!connect_page_id || !mongoose.Types.ObjectId.isValid(connect_page_id)){
        data.status = 0;
        io.to(data.user_id).emit('webchat_status_join', data);
        return callback(true);
    }
    ConnectPage.findOne({_id: connect_page_id, sns_type: SNS_TYPE_WEBCHAT, deleted_at: null}, function (err, result) {
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
                    return callback(false, data, params);
                }else{
                    data.status = 0;
                    io.to(data.user_id).emit('webchat_status_join', data);
                    return callback(true);
                }
            });
        }else{
            data.status = 0;
            io.to(data.user_id).emit('webchat_status_join', data);
            return callback(true);
        }
    });
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
                                connectScenario(params);
                                return;
                            }
                            quickRepliesAfterClickButton(params);
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
            console.log(event);
            console.log(payload);
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
                } else if (scenario_index2 > -1) {
                    new_payload = payload.replace(/SCENARIO_/g, "");
                    arr = new_payload.split("_");
                }
                if(arr.length == 1){
                    current_scenario_id = arr[0];
                }else if(arr.length == 2){
                    current_scenario_id = arr[0];
                    params.payload_value = arr[1];
                }
                if(params.payload_value) {
                    saveLogChatMessage(params, MESSAGE_USER_PAYLOAD, USER_TYPE, params.payload_value, new Date(), payload);
                }
                if(current_scenario_id){
                    params.current_scenario_id = current_scenario_id;
                    setTimeout(function() {
                        connectScenario(params);
                    }, 500);
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
        console.log("allDialogLsdsdsdsibrary");
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
                    sendMessage(params, USER_TYPE_TEXT, answer);
                }else if(row.type == LIBRARY_SCENARIO){
                    params.current_scenario_id = row.answer;
                    console.log("LIBRARY_SCENARIO");
                    //console.log(params);
                    connectScenario(params);
                }
            }
        }
    })
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
                            result.push({"length" : value.length, "data" : item});
                        }
                    });
                }
            }
        }
    }
    return result;
}

function createParameterDefault(sns_type, connect_page_id, user_id, page_id, page_access_token, current_scenario_id, notification_id){
    var params = {};
    params.sns_type = sns_type;
    params.connect_page_id = connect_page_id;
    params.user_id = user_id;
    params.page_id = page_id;
    params.page_access_token = page_access_token;
    params.current_scenario_id = current_scenario_id;
    params.notification_id = notification_id;
    return params;
}


var getAllVariableValueNew = function(connect_page_id, sns_type) {
    return Q.Promise(function (resolve, reject) {(ConnectPage.findOne({_id: connect_page_id, sns_type: sns_type, deleted_at: null}).exec())
        .then(function(result) {
            if(result){
                return resolve(result);
            }
            return reject();
        });
    });
};

function getAllVariableValue(params, callback) {
    console.log("getAllVariableValue");
    var variable_result = [];
    UserProfile.findOne({ connect_page_id: params.connect_page_id, user_id:  params.user_id}, function(err, result) {
        if (err) throw err;
        if (result) {
            default_variable.forEach(function (variable) {
                if (result[variable]) {
                    variable_result[variable] =  result[variable];
                }
            });
        }
        Variable.find({ connect_page_id: params.connect_page_id}, function(err, result) {
            if (err) throw err;
            if (result && result.length > 0) {
                var variable_id_arr = [];
                for (var i=0, size = result.length; i < size; i++) {
                    variable_id_arr[result[i]._id] = result[i].variable_name;
                }
                MessageVariable.find({ connect_page_id: params.connect_page_id, user_id:  params.user_id}, function(err, result) {
                    if (err) throw err;
                    if (result) {
                        for (var i=0, size = result.length; i < size; i++) {
                            var variable = variable_id_arr[result[i].variable_id];
                            variable_result[variable] = result[i].variable_value;
                            var tmp_variable = result[i].variable_value;
                            if(variable instanceof Array){
                                tmp_variable = arrayUnique(tmp_variable);
                            }
                            variable_result[result[i].variable_id] = tmp_variable;
                        }
                    }
                    return callback(null, variable_result);
                });
            }else{
                return callback(null, variable_result);
            }
        });
    });
}

function getVariableFromText(msgText){
    var variable_arr = [];
    var matches_arr = msgText.match(/\{\{[^\}]+\}\}/gi);
    if(matches_arr){
        matches_arr.forEach(function(row) {
            var variable = row.replace( /\{\{/g , "");
            variable = variable.replace( /\}\}/g , "");
            variable_arr.push(variable);
        });
        if(variable_arr.length > 0) {
            variable_arr = variable_arr.filter(function (x, i, self) {
                return self.indexOf(x) === i;
            });
        }
    }
    return variable_arr;
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
        text = text.replace(new RegExp(tmp, 'g'), variable_arr[variable]);
    }
    text = text.replace(/\{\{[^\}]+\}\}/gi, '');
    return text;
}

//type = ボタン or カルーセル  URL上の変数参照
function variableUrlToValue(params, row){
    console.log("variableUrlToValue");
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
    console.log("variableUrlToValue");
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

function saveUserSpeechVariable(params, msgText, callback){
    console.log("saveUserSpeechVariable");
    if(params.variable_id){
        Variable.findOne({ _id: params.variable_id, connect_page_id: params.connect_page_id}, function(err, result) {
            if (err) throw err;
            if(result){
                var now = new Date();
                MessageVariable.update({connect_page_id: result.connect_page_id, user_id: params.user_id, variable_id: result._id}, {$set: {page_id: params.page_id, variable_value: msgText, created_at : now, updated_at : now}},
                    {upsert: true, multi: false}, function (err) {
                        if (err) throw err;
                        return callback(true);
                    });
            }else{
                return callback(true);
            }
        });
    }else{
        return callback(true);
    }
}

//シナリオ接続
function connectScenario(params, messages){
    console.log("connectScenario");
    Scenario.findOne({ _id: params.current_scenario_id, connect_page_id: params.connect_page_id, deleted_at: null}, function(err, result) {
        if (err) throw err;
        var new_position = 0;
        //console.log(result);
        if(result){
            getAllVariableValue(params, function (err, user_variable) {
                params.user_variable = user_variable;
                var is_valid =  checkScenarioCondition(params, result);
                console.log("is_valid=" + is_valid);
                if(is_valid){
                    BotMessage.find({ scenario_id: params.current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                        if (err) throw err;
                        //console.log(result);
                        if(result && result.length > 0){
                            if(params.sns_type == SNS_TYPE_LINE){
                                sendMultiMessageLine(params, result, new_position, messages);
                            }else if(params.sns_type == SNS_TYPE_WEBCHAT){
                                sendMultiMessageWebchat(params, result, new_position, messages);
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
                        }
                    });
                }
            });
        }
    });
}

//クイック返信のメッセージでボタンを押下した後、次はボットの発言がある場合、そのメッセージを送信する
function quickRepliesAfterClickButton(params){
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
                        }
                    });
                }
            });
        }
    });
}

function getStartScenario(params, payload){
  //console.log("connect_page_id="+connect_page_id);
  Scenario.findOne({ connect_page_id: params.connect_page_id, start_flg : 1, deleted_at: null}, function(err, result) {
    if (err) throw err;
    //console.log(result);
    var message = '';
    if(result) {
        params.current_scenario_id = result._id;
        getAllVariableValue(params, function (err, user_variable) {
            params.user_variable = user_variable;
            var is_valid = checkScenarioCondition(params, result);
            if(is_valid){
                var new_position = 0;
                BotMessage.find({ scenario_id: params.current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                    if (err) throw err;
                    if(result && result.length > 0){
                        if(params.sns_type == SNS_TYPE_LINE){
                            sendMultiMessageLine(params, result, new_position);
                        }else if(params.sns_type == SNS_TYPE_FACEBOOK){
                            sendMultiMessage(params, result, new_position);
                        }else if(params.sns_type == SNS_TYPE_WEBCHAT){
                            sendMultiMessageWebchat(params, result, new_position);
                        }
                    }else{
                        console.log("saveUserPosition");
                        saveUserPosition(params, -1);
                    }
                });
            }
        });
    }
  });
}

function checkScenarioCondition(params, scenarioResult){
    var filter = ((typeof scenarioResult.filter !== 'undefined') ? scenarioResult.filter : []);
    if(filter.length > 0){
        var variables = params.user_variable;

        var match_value_cnt = 0;
        var is_connect_scenario = false;
        for (var i = 0; i < filter.length; i++)
        {
            var filter_row = filter[i];
            var variable = filter_row.condition;
            var variable_value = filter_row.value;
            var compare = filter_row.compare;
            var scenario_id = filter_row.scenario_id;
            var user_variable_value = "";
            if(typeof variables[variable] !== 'undefined'){
                user_variable_value = variables[variable];
            }

            if(typeof scenario_id !== 'undefined' && mongoose.Types.ObjectId.isValid(scenario_id)){
                if((compare == "is" && user_variable_value == variable_value) || (compare == "isNot" && user_variable_value != variable_value)){
                    params.current_scenario_id = scenario_id;
                    is_connect_scenario = true;
                    break;
                }
                match_value_cnt++;
            }else{
                if((compare == "is" && user_variable_value == variable_value) || (compare == "isNot" && user_variable_value != variable_value)){
                    match_value_cnt++;
                }
            }
        }
        if(is_connect_scenario || match_value_cnt == filter.length){
            return true;
        }
        return false;
    }
    return true;
}


function getBotMessage(data, position){
    var size = data.length;
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

function sendMultiMessageLine(params, data, new_position, messages){
    var msg_arr = getBotMessage(data, new_position);
    if(msg_arr.length == 0){
        saveUserPosition(params, -1);
        return;
    }
    getAllVariableValue(params, function (err, user_variable) {
        if (!err) {
            if(!messages){
                messages = [];
            }
            params.user_variable = user_variable;
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
                }else if(row.type == BOT_TYPE_SCENARIO){
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
        getAllVariableValue(params, function (err, user_variable) {
            params.user_variable = user_variable;
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

function sendMultiMessage(params, data, new_position){
    var msg_arr = getBotMessage(data, new_position);
    if(msg_arr.length == 0){
        saveUserPosition(params, -1);
        return;
    }
    getAllVariableValue(params, function (err, user_variable) {
        if (!err) {
            params.user_variable = user_variable;
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
                    getApiConnect(params, row.message.api);
                }else if(row.type == BOT_TYPE_QUICK_REPLIES){
                    row = variableUrlToValue(params, row);
                    messages.push(msg);
                    sendMessageFacebook(params, messages);
                    return;
                }
                else if(row.type == BOT_TYPE_SCENARIO){
                    params.connect_scenario_id = row.message.scenario;
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
        getAllVariableValue(params, function (err, user_variable) {
            if (!err) {
                params.user_variable = user_variable;
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
                        getApiConnect(params, row.message.api);
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
                console.log("messagesvfacbeook=");
                console.log(messages);
                sendMessageFacebook2(params, messages);
            }});
    }

}

function sendMessageWebchat(params, msg_arr){
    console.log(msg_arr);
    if(msg_arr && Array.isArray(msg_arr)){
        getAllVariableValue(params, function (err, user_variable) {
            if (!err) {
                params.user_variable = user_variable;
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

function sendMultiMessageWebchat(params, data, new_position, messages){
    var msg_arr = getBotMessage(data, new_position);
    if(msg_arr.length == 0){
        saveUserPosition(params, -1);
        return;
    }
    getAllVariableValue(params, function (err, user_variable) {
        if (!err) {
            if(!messages){
                messages = [];
            }
            params.user_variable = user_variable;
            for (var i=0; i < msg_arr.length; i++) {
                var msg = msg_arr[i];
                var row = msg.data[0];
                var messages = [];
                if(row.type == BOT_TYPE_TEXT){
                    if(row.message && row.message.text){
                        row.message.text = variableTextToValue(row.message.text, user_variable);
                        messages.push(
                            row.message
                        );
                        sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                    }
                }
                else if(row.type == BOT_TYPE_API){
                    getApiConnect(params, row.message.api);
                }else if(row.type == BOT_TYPE_QUICK_REPLIES){
                    row = variableUrlToValue(params, row);
                    messages.push(
                        row.message
                    );
                    sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                    params.current_scenario_id = msg.scenario_id;
                    saveUserPosition(params, msg.position);
                    return;
                }
                else if(row.type == BOT_TYPE_SCENARIO){
                    sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                    params.current_scenario_id = row.message.scenario;
                    connectScenario(params);
                    return;
                }else if(row.type == BOT_TYPE_BUTTON || row.type == BOT_TYPE_GENERIC){
                    row = variableUrlToValue(params, row);
                    messages.push(
                        row.message
                    );
                    sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                }else if(row.type == BOT_TYPE_MAIL){
                    sendEmail(params, row.message.mail);
                }
                else{
                    messages.push(
                        row.message
                    );
                    sendMessage(params, row ? row.type : USER_TYPE_TEXT,  messages);
                }
            }
            var last_msg = msg_arr[msg_arr.length - 1];
            if(last_msg){
                params.current_scenario_id = last_msg.scenario_id;
                saveUserPosition(params, last_msg.position);
            }else{
                saveUserPosition(params, -1);
            }
        }});
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
    //console.log('Node app is running on port', app.get('port'));
  });
}

/*
 * Send a text message using the Send API.
 *
 */
function sendMessage(params, type, message) {
    var messageData;
    if(params.sns_type == SNS_TYPE_WEBCHAT) {
        params.status = 1;
        setTimeout(function(msg) {
            params.message = msg;
            io.to(params.user_id).emit('webchat_bot_send_message', params);
        }, 300, message);
        saveLogChatMessage(params, type, BOT_TYPE, message, new Date());
    }else if(params.sns_type == SNS_TYPE_LINE){
        if(params.notification_id || params.conversation_flg) {
            messageData = {
                to: params.user_id,
                messages: message
            };
            callSendLinePushAPI(params, type, messageData);
        }else{
            var arr = params.page_access_token.split(':');
            console.log(arr);
            if(arr.length == 2){
                messageData = {
                    replyToken: arr[0],
                    messages: message
                };
                params.page_access_token = arr[1];
                callSendLineReplyAPI(params, BOT_TYPE_TEXT, messageData);
            }
        }

    }else{
        messageData = {
            recipient: {
                id: params.user_id
            },
            message: message
        };
        callSendAPI(params, type, messageData);
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
            saveLogChatMessage(params, message_type, BOT_TYPE, messageData.messages, new Date(), '', 1, body);
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

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */

function saveNotificationHistory(connect_page_id, page_id, notification_id, data, user_list, send_count){
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
                result.disable_flg = params.disable_flg ? params.disable_flg : undefined;
                result.save();
            }else{
                UserProfile.find({connect_page_id : params.connect_page_id}).count(function (err, count) {
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
                        disable_flg: params.disable_flg ? params.disable_flg : undefined,
                        created_at : now,
                        updated_at : now
                    });
                    userProfile.save(function(err) {
                        if (err) throw err;
                        //send event to conversation
                        io.to(params.connect_page_id).emit('receive_new_user', userProfile);
                        getStartScenario(params);
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
    console.log("saveUserLineProfile = " + page_access_token);
    UserProfile.findOne({ connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
        if (err) throw err;
        callAPILineGetUserProfile(params, page_access_token, result);
    });
}

function newUserProfile(params){
    UserProfile.findOne({ connect_page_id: params.connect_page_id, user_id: params.user_id}, function(err, result) {
        if (err) throw err;
        if(!result){
            var ref = '';
            callSendAPIGetUserProfile(params, ref, result);
        }else{
            if(params.payload && params.payload == "GET_STARTED_PAYLOAD"){
                getStartScenario(params, params.payload);
            }
        }
    });
}

function saveLogChatMessage(params, message_type, type, message, time_of_message, payload, error_flg, error_message){
  var now = new Date();
  var logChatMessage = new LogChatMessage({
    connect_page_id: params.connect_page_id,
    page_id: params.page_id,
    user_id: params.user_id,
    scenario_id: params.current_scenario_id,
    message_type: message_type,
    notification_id: params.notification_id,
    type: type,
    message: message,
    time_of_message: time_of_message,
    payload:  ((payload !== 'undefined') ? payload : ''),
    error_flg: error_flg,
    background_flg: (message_type == BOT_TYPE_MAIL) ? 1 : params.background_flg,
    error_message: error_message,
    created_at : now,
    updated_at : now
  });
  params.background_flg = undefined;
  logChatMessage.save(function(err) {
    if (err) throw err;
    if(logChatMessage.background_flg != 1){
        if(params.start_flg){
            logChatMessage.start_flg = 1;
        }
        io.to(params.connect_page_id).emit('receive_new_message', logChatMessage);
        if(params.sns_type == SNS_TYPE_WEBCHAT && type == USER_TYPE && payload){
            io.to(params.user_id).emit('webchat_bot_send_message', logChatMessage);
        }
    }
  });
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
  UserPosition.update({connect_page_id: params.connect_page_id, user_id: params.user_id}, {$set: {page_id: params.page_id, scenario_id: params.current_scenario_id, position: position, created_at : now, updated_at : now}},
      {upsert: true, multi: true}, function (err) {
        if (err) throw err;
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
                      getStartScenario(params, params.payload);
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
                  getStartScenario(params, params.payload);
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
                    });
            }else{
                console.log("insert callSendAPIGetUserProfile");
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
function sendRequestApi(params, result, send_data){
    console.log("sendRequestApi");
    //console.log(params.user_variable);
    //console.log(result);
    //console.log(send_data);
    if(result.method == "GET"){
        var messageData1 = {
            uri: result.url,
            method: result.method,
            qs: send_data
        };
        params.background_flg = 1;
        saveLogChatMessage(params, BOT_TYPE_API, BOT_TYPE, messageData1, new Date());

        request({
            uri: result.url,
            method: result.method,
            qs: send_data,
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    if(result.api_type == API_TYPE_DIRECT){
                        if(body && body.message){
                            sendMessage(params, BOT_TYPE_API, body.message);
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
        });
    }else{
        var messageData2 = {
            uri: result.url,
            method: result.method,
            json: send_data
        };
        params.background_flg = 1;
        saveLogChatMessage(params, BOT_TYPE_API, BOT_TYPE, messageData2, new Date());

        send_data.sessionId = params.connect_page_id + "_" + params.user_id;
        request({
            uri: result.url,
            method: result.method,
            json: send_data
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    if(result.api_type == API_TYPE_DIRECT){
                        if(body && body.message){
                            sendMessage(params, BOT_TYPE_API, body.message);
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
        });
    }

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
    getAllVariableValue(params, function (err, user_variable) {
        params.user_variable = user_variable;
        console.log("user_variable");
        console.log(user_variable);
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

//sendEmail();
function sendEmail(params, mail_id){
    Email.findOne({_id: mail_id}, function(err, result) {
        if (err) throw err;
        console.log(result);
        if (result) {
            var subject = variableTextToValue(result.subject, params.user_variable);
            var content = variableTextToValue(result.content, params.user_variable);
            //content = new helper.Content('text/plain', content);
            var mailOptions = {
                from: '"Botchan"<' + config.get('mail_from') + '>',
                to: result.to,
                subject: subject,
                text: content
            };
            transporter.sendMail(mailOptions, function(error, info){
                var messageData = {
                    "content": content,
                    "to" : result.to
                };
                if(error){
                    saveLogChatMessage(params, BOT_TYPE_MAIL, BOT_TYPE, messageData, new Date(), '', 1, error);
                    return;
                }
                saveLogChatMessage(params, BOT_TYPE_MAIL, BOT_TYPE, messageData, new Date());
            });
            //var fromEmail = new helper.Email("info@wevnal.co.jp");
            //var toEmail = new helper.Email(result.to);
            //var mail = new helper.Mail(fromEmail, subject, toEmail, content);
            //var request = sg.emptyRequest({
            //    method: 'POST',
            //    path: '/v3/mail/send',
            //    body: mail.toJSON()
            //});
            //
            //sg.API(request, function (error, response) {
            //    var messageData = {
            //        "content": content,
            //        "to" : toEmail
            //    };
            //    if (error) {
            //        console.log('Error response received');
            //        saveLogChatMessage(params, BOT_TYPE_MAIL, BOT_TYPE, messageData, new Date(), '', 1);
            //        return;
            //    }
            //    saveLogChatMessage(params, BOT_TYPE_MAIL, BOT_TYPE, messageData, new Date());
            //    console.log(response.statusCode);
            //});
        }
    });
}

function getPersistentMenu(menu_mains) {
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
    return result;
}

function getMainMenu(connect_page_id) {
    return Q.Promise(function (resolve, reject) {(Menu.find({connect_page_id: connect_page_id, parent_id: ""}).exec())
        .then(function(result) {
            if(result){
                return resolve(result);
            }
            return reject(result);
        });
    });
}

function getSubSubMenu(menu) {
    return Q.Promise(function (resolve, reject) {(Menu.find({connect_page_id: menu.connect_page_id, parent_id: menu.id}, {}, {sort: {priority_order: 1}}).exec())
        .then(function(result) {
            return resolve({main: menu, sub: result});
        });
    });
}

function getSubMenu(menu) {
    return Q.Promise(function (resolve, reject) {(Menu.find({connect_page_id: menu.connect_page_id, parent_id: menu.id}, {}, {sort: {priority_order: 1}}).exec())
        .then(getSubSubEachmenu)
        .then(function (result) {
            return resolve({main: menu, sub: result});
        })
    });
}


function getSubEachmenu(data){
    return Q.all(data.map(getSubMenu))
    .then(function(data){
        return data;
    });
}

function getSubSubEachmenu(data){
    return Q.all(data.map(getSubSubMenu))
        .then(function(result){
            return result;
        });
}

//getFullPersistentMenu("596c21109a89204be35e77a6");
function getFullPersistentMenu(connect_page_id) {
    return Q.Promise(function (resolve, reject) {(Menu.find({connect_page_id: connect_page_id, parent_id: ""}, {}, {sort: {priority_order: 1}}).exec())
            .then(getSubEachmenu)
            .then(function (result) {
                var data = [];
                var index = 0;
                result.forEach(function (row) {
                    //console.log(row);
                    var menu_main = row.main;
                    //console.log(menu_main);
                    data[index] = generateDataMenu(menu_main);
                    if (menu_main.type == MENU_TYPE_SUBMENU) {
                        var subs = row.sub;
                        //console.log(subs);
                        var data_subs = [];
                        var index2 = 0;
                        if (subs && subs.length) {
                            subs.forEach(function (sub) {
                                var main_sub = sub.main;
                                if (main_sub) {
                                    data_subs.push(generateDataMenu(main_sub));
                                }
                                var data_sub_subs = [];
                                var sub_subs = sub.sub;
                                if (sub_subs && sub_subs.length) {
                                    sub_subs.forEach(function (main_sub_sub) {
                                        data_sub_subs.push(generateDataMenu(main_sub_sub));
                                    });
                                }
                                if (data_sub_subs.length > 0) {
                                    data_subs[index2]['call_to_actions'] = data_sub_subs;
                                }
                                index2++;
                            });
                        }
                        if (data_subs.length > 0) {
                            data[index]['call_to_actions'] = data_subs;
                        }
                    }
                    index++;
                });
                var result_data = {
                    "persistent_menu": [
                        {
                            "locale": "default",
                            "composer_input_disabled": true,
                            "call_to_actions": data
                        }
                    ]
                };
                return resolve(result_data);
            })
    });
}

function decodeBase64(b64string){
    if (typeof Buffer.from === "function") {
       return Buffer.from(b64string, 'base64').toString();
    } else {
        return new Buffer(b64string, 'base64').toString();
    }
}

function generateDataMenu(item){
    var result = {};
    if(item){
        if (item.type == MENU_TYPE_URL) {
            result = {title: item.title, type: 'web_url', url: item.url};
        }else if(item.type == MENU_TYPE_SCENARIO) {
            result = {title: item.title, type: 'postback', payload: 'MENU_SCENARIO_' + item.scenario_id};
        }else{
            result = {title: item.title, type: 'nested', call_to_actions: []};
        }
    }
    return result;
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

function checkLimitUserChat(connect_page_id, connect_id, user_chat_id, sns_type, callback) {
    var query = {connect_page_id: connect_page_id, user_id: user_chat_id};
    if(sns_type == SNS_TYPE_WEBCHAT){
        query.disable_flg = 0;
    }
    UserProfile.findOne(query, function (err, user_profile) {
        if (err) throw err;
        if(user_profile){
            return callback(true)
        }
        Connect.findOne({_id: connect_id}, function(err, connect) {
            if (err) throw err;
            if(connect){
                User.findOne({_id: connect.user_id, deleted_at: null}, function(err, user) {
                    if (err) throw err;
                    if(!user){
                        return callback(false);
                    }
                    if(!user.plan){
                        return callback(true, user)
                    }
                    Plan.findOne({code: user.plan}, function(err, plan) {
                        if (err) throw err;
                        if(!plan) {
                            return callback(false, user);
                        }
                        checkPlanUser(user, plan.max_user, sns_type, function (result) {
                            console.log('result:', result, ',user: ', user);
                            return callback(result, user);
                        })
                    });
                })
            } else {
                return callback(false);
            }
        })
    });
}

function checkPlanUser(user, max_user_number, sns_type, callback) {
    Connect.find({user_id: user._id, type: {$in: [SNS_TYPE_FACEBOOK, SNS_TYPE_LINE, SNS_TYPE_WEBCHAT]}}, function(err, connects) {
       if (err) throw err;
       if(connects){
           var connect_arr = [];
           for(var i = 0; i < connects.length; i++){
               connect_arr.push(connects[i]._id);
           }
           ConnectPage.find({connect_id: {$in: connect_arr}, template_flg: {$ne: 1}}, function(err, connect_pages) {
               if (err) throw err;
               if(connect_pages){
                   var connect_page_arr = [];
                   for(var j = 0; j < connect_pages.length; j++){
                       connect_page_arr.push(connect_pages[j]._id);
                   }
                   var query = {connect_page_id : {$in: connect_page_arr}}
                   if(sns_type == SNS_TYPE_WEBCHAT){
                       query.disable_flg = {$ne : 1};
                   }
                   console.log('cmd: ', query);
                   UserProfile.find(query).count(function (err, count) {
                       if (err) throw err;
                       console.log('count:', count, ',max_user_number: ', max_user_number);
                       if(count < max_user_number){
                           return callback(true);
                       } else {
                           return callback(false);
                       }
                   });
               } else {
                   return callback(false);
               }
           })
       } else {
           return callback(false);
       }
    });
}

function sendMessageLimit(user, sns_type, params) {
    var locale = 'ja';
    if(params.locale){
        locale = params.locale;
    } else if(user && user.locale){
        locale = user.locale;
    }
    i18n.setLocale(locale);
    var answer = convertTextMessage(sns_type, i18n.__('max_limit_user_chat'));
    params.background_flg = 1;
    // if(sns_type != SNS_TYPE_WEBCHAT){
    // }
    sendMessage(params, USER_TYPE_TEXT, answer);
    if(user && user.email && !user.limit_user_flg){
        sendEmailLimitChat(user.email);
        User.update({_id: user._id}, {$set: {limit_user_flg: 1}},
            {upsert: false, multi: false}, function (err) {
                if (err) throw err;
            });
    }
}

function sendEmailLimitChat(mail_to) {
    var mail_template = fs.readFileSync(__dirname + '/public/assets/view/mail_limit_user_chat.html', 'utf8');
    // var subject = i18n.__('mail_subject_limit_chat');
    // mail_template = mail_template.replace(':mail_header', i18n.__('mail_subject_limit_chat'));
    // mail_template = mail_template.replace(':mail_body', i18n.__('mail_body_limit_chat'));
    // mail_template = mail_template.replace(':button_update_plan', i18n.__('button.update_plan'));
    // mail_template = mail_template.replace(':link', config.get('serverURL') + 'plan');
    // var fromEmail = new helper.Email('"Botchan"<' + config.get('mail_from') + '>');
    // var toEmail = new helper.Email(mail_to);
    // var content = new helper.Content('text/html', mail_template);
    // var mail = new helper.Mail(fromEmail, subject, toEmail, content);
    //
    // var request = sg.emptyRequest({
    //     method: 'POST',
    //     path: '/v3/mail/send',
    //     body: mail.toJSON()
    // });
    //
    // sg.API(request, function (error, response) {
    //     if (error) {
    //         console.log('Error response received');
    //         return;
    //     }
    // });
    var subject = i18n.__('mail_subject_limit_chat');
    mail_template = mail_template.replace(':mail_header', i18n.__('mail_subject_limit_chat'));
    mail_template = mail_template.replace(':mail_body', i18n.__('mail_body_limit_chat'));
    mail_template = mail_template.replace(':button_update_plan', i18n.__('button.update_plan'));
    mail_template = mail_template.replace(':link', config.get('serverURL') + 'plan');
    //content = new helper.Content('text/plain', content);
    var mailOptions = {
        from: '"Botchan"<' + config.get('mail_from') + '>',
        to: mail_to,
        subject: subject,
        html: mail_template
    };
    transporter.sendMail(mailOptions, function(error, info){
        var messageData = {
            "content": mail_template,
            "to" : mail_to
        };
        if(error){
            saveLogChatMessage(params, BOT_TYPE_MAIL, BOT_TYPE, messageData, new Date(), '', 1, error);
        }
    });
}
listen();
module.exports = app;

