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
  request = require('request');

var fs = require('fs');
var mailer = require('nodemailer');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

var conversion_text = [];
/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

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

var data = require('./public/data.json');


var transporter = mailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'le.thanh.hai@wevnal.co.jp',
    pass: 'Victori1'
  }
});

//メールの内容
var mailOptions = {
  from: 'le.thanh.hai@wevnal.co.jp',
  to: 'le.thanh.hai@wevnal.co.jp',
  subject: 'Tagtoru問い合わせ（ChatBot経由）',
  text: 'Hello world ?', // plain text body
  html: '<b>Hello world ?</b>' // html body
};



//メールの送信
transporter.sendMail(mailOptions, function(err, res){
  //送信に失敗したとき
  if(err){
    console.log(err);
    //送信に成功したとき
  }else{
    console.log('Message sent: ' + res.message);
  }
  //SMTPの切断
  transporter.close();
});

//console.log(config1.general_text);
//console.log(config1.firstName + ' ' + config1.lastName);
//
//var objs = JSON.parse(fs.readFileSync("./public/data.json", "utf8"));
//console.log(objs);

//console.log(objs);
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


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */

//sendTextMessage(1203788973075686, "auto sent");
app.post('/webhook', function (req, res) {
  var data = req.body;

  console.log("webhook");
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
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

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will 
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
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
  sendTextMessage(senderID, "Authentication successful");
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
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  //console.log(messageText);
  if (messageText) {

    if( (typeof conversion_text[senderID] !== 'undefined') && (typeof conversion_text[senderID]["index"] !== 'undefined')){
      formQuestions(senderID);
      return true;
    }
    conversion_text[senderID] = [];

    var index_arr = [];

    var general_text = data.general_text;
    general_text.some(function (row, index1, _ary1){
      var question = row.question;
      var answer = row.anwers;
      var arr = question.split(",");
      arr.some(function (value, index2, _ary2) {
        var tmp_index = [];
        var arr_key = [value];
        if(value.indexOf("and") > -1){
           arr_key = value.split("and");
        }
        //console.log(arr_key);
        arr_key.some(function (search_key) {
          //console.log(search_key);
          //console.log(messageText.indexOf(search_key));
          if ( messageText.indexOf(search_key) > -1) {
            tmp_index.push({"indexof" : messageText.indexOf(search_key), "answer" : answer, "type" : "general_text" });
          }else {
            tmp_index = [];
            return true;
          }
        });
        //console.log(tmp_index);
        if(tmp_index.length > 0) {
          index_arr = index_arr.concat(tmp_index);
        }
      });
    });

    //console.log(index_arr);


    var form_text = data.form_text;
    form_text.some(function (row, index1, _ary1){
      var question = row.question;
      var answer = row.anwers;
      var arr = question.split(",");
      arr.some(function (value, index2, _ary2) {
        if ( messageText.indexOf(value) > -1) {
          index_arr.push({"indexof" : messageText.indexOf(value), "answer" : answer, "type" : "form_text" });
          //sendTextMessage(senderID, answer);
          //setTimeout( function() {
          //  sendButtonYesNoMessage(senderID, data.inquiry, "INQUIRY");
          //}, 1000);
        }
      });
    });

    var carousel_text = data.carousel_text;
    carousel_text.some(function (row, index1, _ary1){
      var question = row.question;
      var answer = row.anwers;
      var arr = question.split(",");
      arr.some(function (value, index2, _ary2) {
        if ( messageText.indexOf(value) > -1) {
          index_arr.push({"indexof" : messageText.indexOf(value), "answer" : answer.anwers1, "type" : "carousel_all" });
          //sendButtonYesNoMessage(senderID, answer.anwers1, "CAROUSEL");
        }
      });
      var keywords = answer.keywords;
      keywords.some(function (value, index3, _ary3) {
        //console.log(value.keyword);
        var arr = value.keyword.split(",");
        arr.some(function (value) {
          if ( messageText.indexOf(value) > -1) {
            index_arr.push({"indexof" : messageText.indexOf(value), "answer1" : value + "" + answer.one_element, "answer2" : answer.elements[index3], "type" : "carousel_one" });
            //sendTextMessage(senderID, value + "" + answer.one_element);
            //sendOneCarouselMessage(senderID, answer.elements[index3]);
          }
        });
      });
    });

    //console.log(index_arr);
    var element = getMinIndexOf(index_arr);
    if(element != null){
      if(element.type == "general_text"){
        sendTextMessage(senderID, element.answer);
        setTimeout( function() {
          sendTextMessage(senderID, data.next_question);
        }, 1000);
      }else if(element.type == "form_text"){
        sendTextMessage(senderID, element.answer);
        setTimeout( function() {
          sendButtonYesNoMessage(senderID, data.inquiry, "INQUIRY");
        }, 1000);
      }else if(element.type == "carousel_all"){
        sendButtonYesNoMessage(senderID, element.answer, "CAROUSEL");
      }else if(element.type == "carousel_one"){
        sendTextMessage(senderID, element.answer1);
        sendOneCarouselMessage(senderID, element.answer2);
      }
      return true;
    }

    sendButtonYesNoMessage(senderID, data.no_match.anwers, "NO_MATCH");
    return true;
    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {
      case 'image':
        sendImageMessage(senderID);
        break;

      case 'gif':
        sendGifMessage(senderID);
        break;

      case 'audio':
        sendAudioMessage(senderID);
        break;

      case 'video':
        sendVideoMessage(senderID);
        break;

      case 'file':
        sendFileMessage(senderID);
        break;

      case 'button':
        sendButtonMessage(senderID);
        break;

      case 'generic':
        sendGenericMessage(senderID);
        break;

      case 'receipt':
        sendReceiptMessage(senderID);
        break;

      case 'quick reply':
        sendQuickReply(senderID);
        break;        

      case 'read receipt':
        sendReadReceipt(senderID);
        break;        

      case 'typing on':
        sendTypingOn(senderID);
        break;        

      case 'typing off':
        sendTypingOff(senderID);
        break;        

      case 'account linking':
        sendAccountLinking(senderID);
        break;

      default:
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

function getMinIndexOf(arr){
  var min = 10000;
  var tmp = null;
  arr.forEach(function (value) {
    //console.log(value);
    if ( min > value.indexof) {
      min =  value.indexof;
      tmp = value;
    }
  });
  //console.log(tmp);
  return tmp;
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

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;
  if(payload){
    //console.log("payload=" + payload);
    switch (payload) {
      case 'USER_DEFINED_PAYLOAD':
        //startedConv(senderID);
        conversion_text[senderID] = [];
        sendTextMessage(senderID, data.first);
        setTimeout( function() {
          sendTextMessage(senderID, data.first_question);
        }, 500);
        break;
      case 'CAROUSEL_YES_PAYLOAD':
          console.log(data.carousel_text[0].anwers.elements);
        sendCarouselMessage(senderID);
        break;
      case 'INQUIRY_YES_PAYLOAD':
      case 'NO_MATCH_YES_PAYLOAD':
        formQuestions(senderID);
        break;
      case 'CAROUSEL_NO_PAYLOAD':
      case 'NO_MATCH_NO_PAYLOAD':
      case 'INQUIRY_NO_PAYLOAD':
        sendTextMessage(senderID, data.next_question);
        break;
      case 'PUSH_NOTIFICATION_YES_PAYLOAD':
        sendTextMessage(senderID, data.thanks);
        break;
      case 'PUSH_NOTIFICATION_NO_PAYLOAD':
        sendTextMessage(senderID, data.thanks);
        break;
      default:
        //sendTextMessage(senderID, "Postback called");
    }
  }
  //console.log("Received postback for user %d and page %d with payload '%s' " +
  //  "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
}

function sendCarouselMessage(recipientId){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements:data.carousel_text[0].anwers.elements
        }
      }
    }
  };

  callSendAPI(messageData, "carousel");
}

function sendOneCarouselMessage(recipientId, element){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements:[element]
        }
      }
    }
  };

  callSendAPI(messageData, "carousel_one");
}

function formQuestions(senderID){
  var index = 1;
  if( (typeof conversion_text[senderID] !== 'undefined') && (typeof conversion_text[senderID]["index"] !== 'undefined')){
    index = parseInt(conversion_text[senderID]['index']) + 1;
  }else{
    conversion_text[senderID] = [];
    conversion_text[senderID]["index"] = 1;
  }
  if(index > 4){
    delete conversion_text[senderID]["index"];
    sendButtonYesNoMessage(senderID,  data.finish, "PUSH_NOTIFICATION");
  }else{
    conversion_text[senderID]['index'] = index;
    console.log("data.no_match.questions.question"+ index);
    sendTextMessage(senderID, eval("data.no_match.questions.question"+ index));
  }
}

//function startedConv(recipientId){
//  var name;
//
//  request({
//    url: 'https://graph.facebook.com/v2.6/'+ recipientId +'?fields=first_name',
//    qs: {access_token: PAGE_ACCESS_TOKEN},
//    method: 'GET'
//  }, function(error, response, body) {
//    if (error) {
//      console.log('Error sending message: ', error);
//    } else if (response.body.error) {
//      console.log('Error: ', response.body.error);
//    }else{
//      name = JSON.parse(body);
//      sendTextMessage(recipientId, "Hello "+ name.first_name+", how can i help you ? ")
//    }
//  });
//}


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

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

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

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/rift.png"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: SERVER_URL + "/assets/instagram_logo.gif"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "audio",
        payload: {
          url: SERVER_URL + "/assets/sample.mp3"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
function sendVideoMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "video",
        payload: {
          url: SERVER_URL + "/assets/allofus480.mov"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
function sendFileMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "file",
        payload: {
          url: SERVER_URL + "/assets/test.txt"
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Trigger Postback",
            payload: "DEVELOPER_DEFINED_PAYLOAD"
          }, {
            type: "phone_number",
            title: "Call Phone Number",
            payload: "+16505551234"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendButtonYesNoMessage(recipientId, messageText, payload_name) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: messageText,
          buttons:[{
            type: "postback",
            title: "はい",
            payload: payload_name + "_YES_PAYLOAD"
          }, {
            type: "postback",
            title: "いいえ",
            payload: payload_name + "_NO_PAYLOAD"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

function sendForm(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          text: messageText
        }
      }
    }
  };

  callSendAPI(messageData);
}


/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
function sendReceiptMessage(recipientId) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = "order" + Math.floor(Math.random()*1000);

  var messageData = {
    recipient: {
      id: recipientId
    },
    message:{
      attachment: {
        type: "template",
        payload: {
          template_type: "receipt",
          recipient_name: "Peter Chang",
          order_number: receiptId,
          currency: "USD",
          payment_method: "Visa 1234",
          timestamp: "1428444852",
          elements: [{
            title: "Oculus Rift",
            subtitle: "Includes: headset, sensor, remote",
            quantity: 1,
            price: 599.00,
            currency: "USD",
            image_url: SERVER_URL + "/assets/riftsq.png"
          }, {
            title: "Samsung Gear VR",
            subtitle: "Frost White",
            quantity: 1,
            price: 99.99,
            currency: "USD",
            image_url: SERVER_URL + "/assets/gearvrsq.png"
          }],
          address: {
            street_1: "1 Hacker Way",
            street_2: "",
            city: "Menlo Park",
            postal_code: "94025",
            state: "CA",
            country: "US"
          },
          summary: {
            subtotal: 698.99,
            shipping_cost: 20.00,
            total_tax: 57.67,
            total_cost: 626.66
          },
          adjustments: [{
            name: "New Customer Discount",
            amount: -50
          }, {
            name: "$100 Off Coupon",
            amount: -100
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type":"text",
          "title":"Action",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type":"text",
          "title":"Comedy",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type":"text",
          "title":"Drama",
          "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll 
 * get the message id in a response 
 *
 */
function callSendAPI(messageData, type) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
        if(type == "carousel"){
          sendTextMessage(recipientId, data.carousel_text[0].anwers.anwers2);
          setTimeout( function() {
            sendButtonYesNoMessage(recipientId, data.inquiry, "INQUIRY");
          }, 1000);
        }
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

//startButton();
//greeting();
function startButton(){
  var messageData1 = {
    "setting_type":"call_to_actions",
    "thread_state":"new_thread",
    "call_to_actions":[
      {
        "payload":"USER_DEFINED_PAYLOAD"
      }
    ]
  };

  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData1

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
       console.log(body);
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

function greeting() {
  var messageData1 = {
    "setting_type":"greeting",
    "greeting":{
      "text":" Tagtoruについてご質問をメッセージで送ってください。"
    }
  };

  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData1

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

