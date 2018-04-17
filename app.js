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

const default_variable = ["user_first_name", "user_last_name", "user_full_name", "user_gender", "user_locale", "user_timezone", "user_referral", "user_lat", "user_long"];
const filter_variable = ["user_gender", "user_locale", "user_timezone", "user_referral"];

const
    MESSAGE_USER = '001',
    MESSAGE_BOT = '002',
    USER_TYPE_TEXT = "001",
    USER_TYPE_LIBRARY = "002",
    BOT_TYPE_QUICK_REPLIES = "005",
    BOT_TYPE_API = "006",
    BOT_TYPE_SCENARIO = "007",
    BOT_TYPE_TEXT = "001",
    BOT_TYPE_BUTTON = "002",
    BOT_TYPE_GENERIC = "003",
    LIBRARY_TEXT = "001",
    LIBRARY_SCENARIO = "002";
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
app.set('port', process.env.PORT || config.get('appPort'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

var Redis = require('ioredis');
var redis = new Redis({
  port: config.get('redisPort'),
  host: config.get('redisHost')
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

redis.subscribe('notification');


redis.on("message", function(channel, message) {
  var data = JSON.parse(message);
  //console.log(data);
  data =data.data.arr_notification;
  data.forEach(function(row) {
    //console.log(row.connect_page_id + " " + row.page_access_token + " " + row.scenario_id);
      var new_position = 0;
      Scenario.findOne({ _id: row.scenario_id, connect_page_id: row.connect_page_id}, function(err, result) {
          if (err) throw err;
          ////console.log(result);
          if (result) {
                var filter = ((typeof result.filter !== 'undefined') ? result.filter : []);
                BotMessage.find({ scenario_id: row.scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, botResult) {
                  if (err) throw err;
                  if(botResult){
                      UserProfile.find({ connect_page_id: row.connect_page_id}, function(err, result) {
                          if (err) throw err;
                          if(result && result.length > 0){
                              var filter_user_profile = [];
                              if(filter.length == 0){
                                  filter_user_profile = result;
                              }else{
                                  result.forEach(function (user_profile) {
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
                              saveNotificationHistory(row.connect_page_id, row.page_id, botResult, user_list, filter_user_profile.length);
                              filter_user_profile.forEach(function (user_profile) {
                                  sendMultiMessage1(row.connect_page_id, user_profile.user_id, row.page_id, row.page_access_token, botResult, new_position, botResult.length);
                              });
                          }
                      });
                  }
              });
          }
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

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  console.log(req.query['hub.mode']);
  console.log(req.query['hub.verify_token'] === VALIDATION_TOKEN);
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

app.post('/webhook', function (req, res) {
  var data = req.body;

  //console.log("webhook");
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
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          //console.log("Webhook received unknown messagingEvent: ", messagingEvent);
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
function receivedMessage(event) {
  var senderID = event.sender.id.toString();
  var recipientID = event.recipient.id.toString();
  var timeOfMessage = event.timestamp;
  var message = event.message;
  //console.log("Received message for user %d and page %d at %d with message:",
  //    senderID, recipientID, timeOfMessage);
  //console.log("ConnectPage");
  //console.log(recipientID);
  ConnectPage.findOne({ page_id: recipientID}, function(err, result) {
    if (err) throw err;
    ////console.log(result);
    if(result){
      var page_access_token = result.page_access_token;
      var connect_page_id = result._id;

      //greeting(page_access_token);
      //startButton(page_access_token);
      //settingChatMenu(page_access_token);
      //removePersistentMenu(page_access_token);
      //return;
      //saveUserProfile(senderID, recipientID, page_access_token);
      //console.log("page_access_token=" + page_access_token);

      var isEcho = message.is_echo;
      var messageId = message.mid;
      var appId = message.app_id;
      var metadata = message.metadata;

      // You may get a text or attachment but not both
      var messageText = message.text;
      var messageAttachments = message.attachments;
      var quickReply = message.quick_reply;
//console.log("quickReply");//console.log(quickReply);
      if (isEcho) {
        // Just logging message echoes to console
        console.log("Received echo for message %s and app %d with metadata %s",
            messageId, appId, metadata);
        return;
      } else if (quickReply) {
        var quickReplyPayload = quickReply.payload;
        saveLogChatMessage(senderID, recipientID, 1, message, timeOfMessage, quickReplyPayload);
        if(quickReplyPayload){
            var quick_replies_index = quickReplyPayload.indexOf("QUICK_REPLIES_");
            if(quick_replies_index > -1){
                var current_payload = quickReplyPayload.replace( /QUICK_REPLIES_/g , "");
                var arr_index = current_payload.split("_");
                if(arr_index.length  == 2){
                    if(parseInt(arr_index[1]) != -1){
                        saveQuickReplyToVariable(connect_page_id, senderID, recipientID, arr_index[1], messageText);
                    }
                    if(parseInt(arr_index[0]) != -1){
                        connectScenario(connect_page_id, senderID, recipientID, page_access_token, arr_index[0]);
                        return;
                    }
                }
            }
            console.log("Quick reply for message %s with payload %s",
                messageId, quickReplyPayload);
            quickRepliesAfterClickButton(connect_page_id, senderID, recipientID, page_access_token);
        }

        return;
      }
      //console.log(messageText);
      if (messageText) {
        //check current position
        var messageTextLower = messageText.toLowerCase();

        saveLogChatMessage(senderID, recipientID, 1, message, timeOfMessage);
        UserPosition.findOne({ connect_page_id: connect_page_id, user_id: senderID}, function(err, result) {
          if (err) throw err;
          //console.log("UserPosition");
          //console.log(result);
          if(result){
              receivedTextMessage(connect_page_id, senderID, recipientID, page_access_token, messageText);
          }else{
              newUserProfile(connect_page_id, senderID, recipientID, page_access_token);
              getStartScenario(senderID, recipientID, page_access_token, connect_page_id);
              setTimeout(function() {
                  receivedTextMessage(connect_page_id, senderID, recipientID, page_access_token, messageText);
              }, 2000);
          }
        });

        //var scenario_id = 100;
        //sendTextMessage(senderID, "Message with received", page_access_token, recipientID);
      } else if (messageAttachments) {
          //console.log(messageAttachments);
        if(messageAttachments[0] && messageAttachments[0].type == "location"){
            var coordinates = messageAttachments[0].payload.coordinates;
            saveUserCoordinates(connect_page_id, senderID, recipientID, coordinates);
        }
        //saveLogChatMessage(senderID, recipientID, 1, message, timeOfMessage);
        //sendTextMessage(senderID, "Message with attachment received");
      }
    }
  });

  console.log("Received message for user %d and page %d at %d with message:",
      senderID, recipientID, timeOfMessage);
  //console.log(JSON.stringify(message));
}


function receivedTextMessage(connect_page_id, senderID, recipientID, page_access_token, messageText){
    var messageTextLower = messageText.toLowerCase();
    UserPosition.findOne({ connect_page_id: connect_page_id, user_id: senderID}, function(err, result) {
        if (err) throw err;
        //console.log("UserPosition2");
        //console.log(result);
        if(result){
            var current_scenario_id = result.scenario_id.toString();
            var current_position =  result.position;
            if(!mongoose.Types.ObjectId.isValid(current_scenario_id)){
                allDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower);
                return true;
            }
            Scenario.findOne({_id: current_scenario_id, connect_page_id: connect_page_id}, function(err, result) {
                if (err) throw err;
                ////console.log(result);
                var scenario_library_arr = result.library;
                if(result){
                    BotMessage.findOne({ scenario_id: current_scenario_id, message_type: MESSAGE_USER, position: current_position + 1}, function(err, result) {
                        if (err) throw err;
                        if(result && result.data){
                            var new_position;
                            var content = result.data[0];
                            //console.log("content");
                            //console.log(content);
                            if(content.type == USER_TYPE_TEXT && content.text){
                                //console.log("user messageText");
                                var arr = content.text.toLowerCase().split(",");
                                var isMatch = false;
                                arr.some(function (value, index2, _ary2) {
                                    if (messageTextLower.indexOf(value) > -1) {
                                        isMatch = true;
                                        return true;
                                    }
                                });
                                if(isMatch){
                                    new_position = current_position + 2;
                                    BotMessage.find({ scenario_id: current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                                        if (err) throw err;
                                        //console.log("Bot messageText");
                                        //console.log(result);
                                        if(result && result.length > 0){
                                            var size = result.length;
                                            sendMultiMessage1(connect_page_id, senderID, recipientID, page_access_token, result, new_position, size);
                                            return true;
                                        }
                                        scenarioDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower, scenario_library_arr);
                                        return true;
                                        //saveUserPosition(connect_page_id, senderID, recipientID, current_scenario_id, new_position);
                                    });
                                }else{
                                    scenarioDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower, scenario_library_arr);
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
                                                if(row.type == LIBRARY_TEXT){
                                                    var variable_arr = getVariableFromText(row.answer);
                                                    getVariableValue1(connect_page_id, senderID, recipientID, page_access_token, variable_arr, row, function (err, message, result) {
                                                        //console.log("getVariableValue1");
                                                        if (!err) {
                                                            row.answer = variableTextToValue(row.answer, result);
                                                            sendTextMessage(senderID, row.answer, page_access_token, recipientID);
                                                        }});
                                                    return true;

                                                }else if(row.type == LIBRARY_SCENARIO){
                                                    var library_scenario_id = row.answer;
                                                    connectScenario(connect_page_id, senderID, recipientID, page_access_token, library_scenario_id);
                                                    return true;
                                                }
                                            }
                                            scenarioDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower, scenario_library_arr);
                                            return true;
                                        }else{
                                            scenarioDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower, scenario_library_arr);
                                            return true;
                                        }
                                    })
                                }else{
                                    scenarioDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower, scenario_library_arr);
                                    return true;
                                }
                            }
                        }else{
                            console.log("no botmessage");
                            scenarioDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower, scenario_library_arr);
                            return true;
                        }
                    });
                    return true;
                }else{
                    allDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, messageTextLower);
                }
            });
        }
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
function receivedPostback(event) {
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
  if(payload){
    console.log("payload=" + payload);
    saveLogChatMessage(senderID, recipientID, 1, '', timeOfPostback, payload);

    switch (payload) {
      case 'GET_STARTED_PAYLOAD':
        ConnectPage.findOne({ page_id: recipientID}, function(err, result) {
          if (err) throw err;
          if(result){
            console.log(result);
            var connect_page_id = result._id;
            saveUserPosition(connect_page_id, senderID, recipientID, 'a', -1);
            var start_message = result.start_message;
            var page_access_token = result.page_access_token;

            saveUserProfile(connect_page_id, senderID, recipientID, referral, page_access_token);
            if(typeof start_message !== "undefined" && start_message){
              sendTextMessage(senderID, start_message, page_access_token, recipientID);
            }
            getStartScenario(senderID, recipientID, page_access_token, connect_page_id);
          }
        });
        break;
      default:
        //sendTextMessage(senderID, "Postback called");
    }
    var scenario_index1 = payload.indexOf("MENU_SCENARIO_");
    var scenario_index2 = payload.indexOf("SCENARIO_");
    var current_scenario_id = null;
    if(scenario_index1 > -1) {
      current_scenario_id = payload.replace( /MENU_SCENARIO_/g , "");
    }else if(scenario_index2 > -1) {
      current_scenario_id = payload.replace( /SCENARIO_/g , "");
    }
    //console.log("current_scenario_id  = " + current_scenario_id);
    if(current_scenario_id){
      //console.log("current_scenario_id  = " + current_scenario_id);
      ConnectPage.findOne({ page_id: recipientID}, function(err, result) {
        if (err) throw err;
        if(result){
          var page_access_token = result.page_access_token;
          var connect_page_id = result._id;
           connectScenario(connect_page_id, senderID, recipientID, page_access_token, current_scenario_id);
        }
      });
    }
  }
  console.log("Received postback for user %d and page %d with payload '%s' " +
      "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
}

//全体適用シナリオ
function allDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, message_text){
    Library.find({connect_page_id: connect_page_id, all_dialog_flg: 1}, function(err, library_result) {
        if (err) throw err;
        //console.log("allDialogLsdsdsdsibrary");
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
                    var variable_arr = getVariableFromText(row.answer);
                    getVariableValue1(connect_page_id, senderID, recipientID, page_access_token, variable_arr, row, function (err, message, result) {
                        //console.log("getVariableValue1");
                        if (!err) {
                            row.answer = variableTextToValue(row.answer, result);
                            sendTextMessage(senderID, row.answer, page_access_token, recipientID);
                        }});

                }else if(row.type == LIBRARY_SCENARIO){
                    var library_scenario_id = row.answer;
                    connectScenario(connect_page_id, senderID, recipientID, page_access_token, library_scenario_id);
                }
            }
        }
    })
}

//シナリオ内キーワードマッチ適用
function scenarioDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, message_text, library_arr){
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
                        var variable_arr = getVariableFromText(row.answer);
                        getVariableValue1(connect_page_id, senderID, recipientID, page_access_token, variable_arr, row, function (err, message, result) {
                            //console.log("getVariableValue1");
                            if (!err) {
                                row.answer = variableTextToValue(row.answer, result);
                                sendTextMessage(senderID, row.answer, page_access_token, recipientID);
                            }});
                        return true;

                    }else if(row.type == LIBRARY_SCENARIO){
                        var library_scenario_id = row.answer;
                        connectScenario(connect_page_id, senderID, recipientID, page_access_token, library_scenario_id);
                        return true;
                    }
                }
                allDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, message_text);
            }else{
                allDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, message_text);
            }
        })
    }else{
        allDialogLibrary(connect_page_id, senderID, recipientID, page_access_token, message_text);
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


function getVariableValue1(connect_page_id, user_id, page_id, page_access_token, variable_arr, data, callback) {
    //console.log("variable_arr");
    ////console.log(variable_arr);
    var variable_result = [];
    UserProfile.findOne({ connect_page_id: connect_page_id, user_id:  user_id}, function(err, result) {
        if (err) throw err;
        if (result) {
            variable_arr.forEach(function (variable) {
                if (result[variable] && default_variable.indexOf(variable) > -1) {
                    variable_result[variable] =  result[variable];
                }
            });
        }
        Variable.find({ connect_page_id: connect_page_id, variable_name: { $in: variable_arr }}, function(err, result) {
            if (err) throw err;
            if (result && result.length > 0) {
                var variable_id_arr1 = [];
                var variable_id_arr2 = [];
                for (var i=0, size = result.length; i < size; i++) {
                    variable_id_arr1.push(result[i]._id);
                    variable_id_arr2[result[i]._id] = result[i].variable_name;
                }
                ////console.log("variable_id_arr");
                ////console.log(variable_id_arr1);
                MessageVariable.find({ connect_page_id: connect_page_id, user_id:  user_id, variable_id: { $in: variable_id_arr1 } }, function(err, result) {
                    if (err) throw err;
                    if (result) {
                        for (var i=0, size = result.length; i < size; i++) {
                            var variable = variable_id_arr2[result[i].variable_id];
                            variable_result[variable] = result[i].variable_value;
                        }
                    }
                    variable_arr.forEach(function (variable) {
                        if (variable_result[variable]) {
                        }else{
                            variable_result[variable] = '';
                        }
                    });
                    return callback(null, data, variable_result);
                });
            }else{
                variable_arr.forEach(function (variable) {
                    if (variable_result[variable]) {
                    }else{
                        variable_result[variable] = '';
                    }
                });
                return callback(null, data, variable_result);
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
    return text;
}

//type = ボタン or カルーセル  URL上の変数参照
function variableUrlToValue(connect_page_id, user_id, page_id, page_access_token, row){
    //console.log("variableUrlToValue");
    var message = row.message;
    var variable_arr = [];
    if(message && message.attachment && message.attachment.payload && ( message.attachment.payload.elements || message.attachment.payload.buttons)) {
        var elements = message.attachment.payload.elements ? message.attachment.payload.elements : message.attachment.payload.buttons;
        //console.log("elements");
        //console.log(elements);
        if (elements) {
            elements.forEach(function (element) {
                if(row.type == BOT_TYPE_GENERIC){
                    if (element.item_url) {
                        var arr = getVariableFromText(element.item_url);
                        variable_arr = variable_arr.concat(arr);
                    }
                    if (element.buttons) {
                        var buttons = element.buttons;
                        buttons.forEach(function (button) {
                            if (button && button.type == "web_url" && button.url) {
                                var arr = getVariableFromText(button.url);
                                variable_arr = variable_arr.concat(arr);
                            }
                        });
                    }
                }else if(row.type == BOT_TYPE_BUTTON){
                    if(elements.length > 0){
                        elements.forEach(function (button) {
                            if (button && button.type == "web_url" && button.url) {
                                var arr = getVariableFromText(button.url);
                                variable_arr = variable_arr.concat(arr);
                            }
                        });
                    }
                }
            });
        }
        //message.attachment.payload.elements = elements;
        variable_arr = arrayUnique(variable_arr);
        if (variable_arr.length > 0) {
            getVariableValue1(connect_page_id, user_id, page_id, page_access_token, variable_arr, row, function (err, message, result) {
                //console.log("getVariableValue1");
                if (!err) {
                    ////console.log(result);
                    ////console.log(elements);
                    var elements = row.message.attachment.payload.elements ? row.message.attachment.payload.elements : row.message.attachment.payload.buttons;
                    variable_arr = result;
                    if (elements) {
                        if(row.type == BOT_TYPE_GENERIC){
                            elements.forEach(function (element) {
                                if (element.item_url) {
                                    element.item_url = variableTextToValue(element.item_url, variable_arr);
                                }
                                if (element.buttons) {
                                    var buttons = element.buttons;
                                    buttons.forEach(function (button) {
                                        if (button && button.type == "web_url" && button.url) {
                                            button.url = variableTextToValue(button.url, variable_arr);
                                        }
                                    });
                                }
                            });
                        }else if(row.type == BOT_TYPE_BUTTON){
                            if(elements.length > 0){
                                elements.forEach(function (button) {
                                    if (button && button.type == "web_url" && button.url) {
                                        button.url = variableTextToValue(button.url, variable_arr);
                                    }
                                });
                            }
                        }
                    }
                    ////console.log(message);
                    sendMessage(user_id, row.message, page_access_token, page_id);
                }
            });
        } else {
            sendMessage(user_id, row.message, page_access_token, page_id);
        }
    }
}


//クイック返信でクリックしたボタンの値を変数に保存する
function saveQuickReplyToVariable(connect_page_id, user_id, page_id, variable_id, msgText){
    //console.log("saveQuickReplyToVariable");
    Variable.findOne({ _id: variable_id, connect_page_id: connect_page_id}, function(err, result) {
        if (err) throw err;
        var new_position = 0;
        if(result){
            var now = new Date();
            MessageVariable.update({connect_page_id: connect_page_id, user_id: user_id, variable_id: variable_id}, {$set: {page_id: page_id, variable_value: msgText, created_at : now, updated_at : now}},
                {upsert: true, multi: false}, function (err) {
                    if (err) throw err;
                });
        }
    });
}

//シナリオ接続
function connectScenario(connect_page_id, senderID, recipientID, page_access_token, current_scenario_id){
    //console.log("connectScenario");
    Scenario.findOne({ _id: current_scenario_id, connect_page_id: connect_page_id}, function(err, result) {
        if (err) throw err;
        var new_position = 0;
        if(result){
            BotMessage.find({ scenario_id: current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                if (err) throw err;
                //console.log(result);
                if(result && result.length > 0){
                    var size = result.length;
                    sendMultiMessage1(connect_page_id, senderID, recipientID, page_access_token, result, new_position, size);
                }
            });
        }else{
            saveUserPosition(connect_page_id, senderID, recipientID, current_scenario_id, 0);
        }
    });
}

//クイック返信のメッセージでボタンを押下した後、次はボットの発言がある場合、そのメッセージを送信する
function quickRepliesAfterClickButton(connect_page_id, senderID, recipientID, page_access_token){
    UserPosition.findOne({ connect_page_id: connect_page_id, user_id: senderID}, function(err, result) {
        if (err) throw err;
        if(result){
            var current_scenario_id = result.scenario_id;
            var current_position =  result.position;
            Scenario.findOne({ _id: current_scenario_id, connect_page_id: connect_page_id }, function(err, result) {
                if (err) throw err;
                if(result){
                    var new_position = current_position + 1;
                    BotMessage.find({ scenario_id: current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
                        if (err) throw err;
                        ////console.log(result);
                        if(result && result.length >0){
                            var size = result.length;
                            sendMultiMessage1(connect_page_id, senderID, recipientID, page_access_token, result, new_position, size);
                        }
                    });
                }
            });
        }
    });
}

function getBotMessage(connect_page_id, current_scenario_id, position, senderID, recipientID, page_access_token){
  var matches_array = str.match(/\{\{[^\}]+\}\}/gi);
  BotMessage.findOne({ scenario_id: current_scenario_id, position: position}, function(err, bot_message_result) {
    if (err) throw err;
    //console.log(bot_message_result);
    if(bot_message_result){
      var size = bot_message_result.data.length;
      sendMultiMessage(senderID, recipientID, page_access_token, bot_message_result.data, size, connect_page_id);
      saveUserPosition(connect_page_id, senderID, recipientID, current_scenario_id, bot_message_result.position);
    }
  });
}

function getStartScenario(user_id, page_id, page_access_token, connect_page_id){
  //console.log("connect_page_id="+connect_page_id);
  Scenario.findOne({ connect_page_id: connect_page_id, start_flg : 1}, function(err, result) {
    if (err) throw err;
    //console.log(result);
    var message = '';
    if(result) {
        //console.log(result);
        var current_scenario_id = result._id;
        var new_position = 0;
        BotMessage.find({ scenario_id: current_scenario_id, message_type: MESSAGE_BOT, position: { $gte: new_position } }, {}, {sort: {position: 1}}, function(err, result) {
            if (err) throw err;
            if(result && result.length > 0){
                var size = result.length;
                sendMultiMessage1(connect_page_id, user_id, page_id, page_access_token, result, new_position, size);
            }else{
                console.log("saveUserPosition");
                saveUserPosition(connect_page_id, user_id, page_id, current_scenario_id, -1);
            }
        });
    }
  });
}

function sendMultiMessage1(connect_page_id, user_id, page_id, page_access_token, data, new_position, times){
    if(times < 1) {
        return;
    }
    setTimeout(function() {
        var msg = data[data.length - times];
        //console.log(msg);
        if(msg.position != new_position){
            //console.log("new_position="+new_position);
            saveUserPosition(connect_page_id, user_id, page_id, msg.scenario_id, new_position - 1);
            return;
        }
        new_position++;
        var row = msg.data[0];
        //console.log("rowrowrow");
        //console.log(row);
        if(row.type == BOT_TYPE_TEXT){
            if(row.message && row.message.text){
                var variable_arr = getVariableFromText(row.message.text);
                getVariableValue1(connect_page_id, user_id, page_id, page_access_token, variable_arr, row, function (err, message, result) {
                    if (!err) {
                        row.message.text = variableTextToValue(row.message.text, result);
                        sendTextMessage(user_id, row.message.text, page_access_token, page_id);
                    }});
            }
        }
        else if(row.type == BOT_TYPE_API){
            getApiConnect(connect_page_id, row.message.api, user_id, page_id, page_access_token);
        }
        else if(row.type == BOT_TYPE_QUICK_REPLIES){
            sendMessage(user_id, row.message , page_access_token, page_id);
            saveUserPosition(connect_page_id, user_id, page_id, msg.scenario_id, msg.position);
            return;
        }
        else if(row.type == BOT_TYPE_SCENARIO){
            //console.log("BOT_TYPE_SCENARIO");
            var scenario_id = row.message.scenario;
            //console.log("scenario_id=" + scenario_id);
            connectScenario(connect_page_id, user_id, page_id, page_access_token, scenario_id);
            return;
        }
        else if(row.type == BOT_TYPE_BUTTON || row.type == BOT_TYPE_GENERIC){
            variableUrlToValue(connect_page_id, user_id, page_id, page_access_token, row);
        }
        else if(row.message){
            sendMessage(user_id, row.message , page_access_token, page_id);
        }
        if(times == 1){
            //console.log("times=",times);
            //console.log(row);
            saveUserPosition(connect_page_id, user_id, page_id, msg.scenario_id, msg.position);
        }
        sendMultiMessage1(connect_page_id, user_id, page_id, page_access_token, data, new_position, times-1);
    }, 600);
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
function receivedMessageRead(event) {
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

  ConnectPage.findOne({ page_id: recipientID}, function(err, result) {
    if (err) throw err;
    if (result) {
      var connect_page_id = result._id;
      UserProfile.findOneAndUpdate({ connect_page_id: connect_page_id, user_id:  senderID}, { $set: {last_active_at: timestamp}}, { upsert: false }, function(err, result) {
        if (err) throw err;
        if(result){
          NotificationHistory.update({ connect_page_id: connect_page_id, 'user_list' : [senderID], time_of_message : { $gte: result.last_active_at } }, { $inc: {read_count: 1} },
              { upsert: false, multi: true }, function(err) {
              });
        }
      });
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
function sendMessage(recipientId, message, page_access_token, page_id) {
  //console.log(message);
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: message
  };

  callSendAPI(messageData, page_access_token, page_id);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText, page_access_token, page_id) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData, page_access_token, page_id);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData, page_access_token, page_id) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: page_access_token },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
      var now = new Date();
      saveLogChatMessage(recipientId, page_id, 2, messageData, now);
      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
            messageId, recipientId);
      } else {
        console.log("Successfully called Send API for recipient %s",
            recipientId);
      }
    } else {
       //console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        console.error("Failed calling Send API");
        console.error(response);
        console.error(body);
        //console.log(messageData);
    }
  });
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */

function getPageInfo(page_id){
  ConnectPage.findOne({ page_id: page_id}, function(err, result) {
    if (err) throw err;
    //console.log(result);
    if(result){
      //console.log("2222");
      return result.page_access_token;
    }
  });
}

function saveNotificationHistory(connect_page_id, page_id, data, user_list, send_count){
  var now = new Date();
  var notificationHistory = new NotificationHistory({
    connect_page_id: connect_page_id,
    page_id: page_id,
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

function saveUserProfile(connect_page_id, user_id, page_id, referral, page_access_token){
  UserProfile.findOne({ connect_page_id: connect_page_id, user_id:  user_id}, function(err, result) {
    if (err) throw err;
      var ref = ((typeof referral !== 'undefined') ? referral.ref+'' : '');
      callSendAPIGetUserProfile(connect_page_id, user_id, page_id, ref, page_access_token, result);
  });
}

function newUserProfile(connect_page_id, user_id, page_id, page_access_token){
    UserProfile.findOne({ connect_page_id: connect_page_id, user_id:  user_id}, function(err, result) {
        if (err) throw err;
        if(!result){
            var ref = '';
            callSendAPIGetUserProfile(connect_page_id, user_id, page_id, ref, page_access_token, result);
        }
    });
}

function saveLogChatMessage(user_id, page_id, type, message, time_of_message, payload){
  var now = new Date();
  var logChatMessage = new LogChatMessage({
    page_id: page_id,
    user_id: user_id,
    type: type,
    message: message,
    time_of_message: time_of_message,
    payload:  ((payload !== 'undefined') ? payload : ''),
    created_at : now,
    updated_at : now
  });
  logChatMessage.save(function(err) {
    if (err) throw err;
  });
}

function saveUserCoordinates(connect_page_id, user_id, page_id, coordinates) {
    //console.log("saveUserCoordinates");
    //console.log(coordinates);
    UserProfile.findOneAndUpdate({ connect_page_id: connect_page_id, user_id:  user_id}, { $set: {user_lat: coordinates.lat, user_long: coordinates.long}}, { upsert: false }, function(err, result) {
    });
}

function saveUserPosition(connect_page_id, user_id, page_id, scenario_id, position) {
    //console.log("saveUserPosition");
  var now = new Date();
  UserPosition.update({connect_page_id: connect_page_id, user_id: user_id}, {$set: {page_id: page_id, scenario_id: scenario_id, position: position, created_at : now, updated_at : now}},
      {upsert: true, multi: true}, function (err) {
        if (err) throw err;
      });
}

function callSendAPIGetUserProfile(connect_page_id, user_id, page_id, ref, page_access_token, profile) {
  request({
    uri: 'https://graph.facebook.com/v2.6/' + user_id,
    qs: { access_token: page_access_token, fields: 'first_name,last_name,profile_pic,locale,timezone,gender' },
    method: 'GET'
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      var now = new Date();
      var first_name = ((typeof body.first_name !== 'undefined') ? body.first_name : '');
      var last_name = ((typeof body.last_name !== 'undefined') ? body.last_name : '');
      if(profile){
          console.log("update callSendAPIGetUserProfile");
          UserProfile.update({connect_page_id: connect_page_id, user_id: user_id}, {$set: {
                  page_id: page_id,
                  user_first_name : first_name,
                  user_last_name : last_name,
                  user_full_name : first_name + " " +last_name,
                  profile_pic : ((typeof body.profile_pic !== 'undefined') ? body.profile_pic : ''),
                  user_locale : ((typeof body.locale !== 'undefined') ? body.locale : ''),
                  user_timezone : ((typeof body.timezone !== 'undefined') ? body.timezone : -100),
                  user_gender : ((typeof body.gender !== 'undefined') ? body.gender : ''),
                  is_payment_enabled : ((typeof body.is_payment_enabled !== 'undefined') ? body.is_payment_enabled : ''),
                  user_referral: ref,
                  updated_at : now
              }},
              {upsert: false, multi: false}, function (err) {
                  if (err) throw err;
              });
      }else{
          console.log("insert callSendAPIGetUserProfile");
          var userProfile = new UserProfile({
              connect_page_id: connect_page_id,
              page_id: page_id,
              user_id: user_id,
              user_first_name : first_name,
              user_last_name : last_name,
              user_full_name : first_name + " " +last_name,
              profile_pic : ((typeof body.profile_pic !== 'undefined') ? body.profile_pic : ''),
              user_locale : ((typeof body.locale !== 'undefined') ? body.locale : ''),
              user_timezone : ((typeof body.timezone !== 'undefined') ? body.timezone : -100),
              user_gender : ((typeof body.gender !== 'undefined') ? body.gender : ''),
              is_payment_enabled : ((typeof body.is_payment_enabled !== 'undefined') ? body.is_payment_enabled : ''),
              user_referral: ref,
              user_lat: '',
              user_long: '',
              last_active_at: now.getTime(),
              created_at : now,
              updated_at : now
          });
          userProfile.save(function(err) {
              if (err) throw err;
          });
      }

    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

function getApiConnect(connect_page_id, api_id, user_id, page_id, page_access_token){
  //console.log("getApiConnect");
  ApiConnect.findOne({_id: api_id}, function(err, apiResult) {
    if (err) throw err;
    //console.log(apiResult);
    if (apiResult) {
      //var send_data =  { category : result.question1, location : result.question2, salary:  result.question3};

      var send_data = {};
      var params = apiResult.params;
      if(params && params.length > 0){
          var variable_id_arr1 = [];
          var variable_id_arr2 = [];
          for (var i=0, size = params.length; i < size; i++) {
              var api_key = params[i].key.toString();
              variable_id_arr1.push(params[i].value);
              variable_id_arr2[api_key] = params[i].value;
          }
          ////console.log("variable_id_arr1");
          ////console.log(variable_id_arr1);
          ////console.log("variable_id_arr2");
          ////console.log(variable_id_arr2);
          UserProfile.findOne({ connect_page_id: connect_page_id, user_id:  user_id}, function(err, result) {
              if (err) throw err;
              ////console.log(result);
              if (result) {
                  for( var key in variable_id_arr2 ) {
                      var api_key = variable_id_arr2[key] + "";
                      if(result[api_key]){
                          send_data.api_key = result[api_key];
                      }
                  }
              }
              ////console.log("send_data");
              ////console.log(send_data);
              MessageVariable.find({ connect_page_id: connect_page_id, user_id:  user_id, variable_id: { $in: variable_id_arr1 } }, function(err, result) {
                  if (err) throw err;
                  ////console.log(result);
                  if (result && result.length > 0) {
                      var data = [];
                      for (var i=0, size = result.length; i < size; i++) {
                          data[result[i].variable_id] = result[i].variable_value;
                      }
                      ////console.log(data);
                      for( var key in variable_id_arr2 ) {
                          var variable_id = variable_id_arr2[key];
                          if(data[variable_id]){
                              send_data.key =  data[variable_id];
                          }
                      }
                  }
                  ////console.log("send_data");
                  ////console.log(send_data);
                  apiResult.params = send_data;
                  sendRequestApi(user_id, page_id, page_access_token, apiResult);
              });
          });
      }else{
          apiResult.params = {};
          sendRequestApi(user_id, page_id, page_access_token, apiResult);
      }
    }
  });
}

function sendRequestApi(user_id, page_id, page_access_token, result){
    request({
        uri: result.url,
        method: result.method,
        json: result.params
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                if(body && body.message){
                    sendMessage(user_id, body.message, page_access_token, page_id);
                }
            } catch(e) {
                console.error("Failed getApiConnect ");
            }
        } else {
            console.error("Failed getApiConnect ");
        }
    });
}

listen();
module.exports = app;

