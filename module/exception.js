var model = require('../model');

var Exception = model.Exception;
var request = require('request');
var config = require('config');

function check(){
    // console.log('Exception check');
    Exception.findOne({push_facebook_flg: 0}, function(err, result) {
        if (err) throw err;
        if(result){
            console.log('Exception check', result);
            sendExceptionToChatwork(result.err);
            sendExceptionToFb(result.type, result.err, function(err, message){
                result.message = message;
                result.push_facebook_flg = 1;
                result.save();
            })
        }
    });
}

function sendExceptionToChatwork(err){
    var pushMessageurl = "https://api.chatwork.com/v2/rooms/:group_id/messages";
    var group_id = config.get('chatwork_group_id');
    pushMessageurl = pushMessageurl.replace(':group_id', group_id);

    var headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-ChatWorkToken': config.get('chatwork_token')
    };

    request.post({ url: pushMessageurl, form: {body: "[To:50868401] \n Nodejs " +  JSON.stringify(err)}, headers: headers,  method: 'POST'}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
        }else{
            console.log(body);
        }
    });
}

function sendExceptionToFb(type, err, callback){
    var pushMessageurl = "https://graph.facebook.com/v2.6/me/messages?access_token=:access_token";
    var access_token = config.get('facebook_access_token');
    var fb_user_id = config.get('facebook_user_id');
    pushMessageurl = pushMessageurl.replace(':access_token', access_token);
    var message_frist = '';
    // info
    if(type == '001'){
        message_frist = '---------------------- Info ------------------\n';
    }else if(type == '002'){
        message_frist = '---------------------- Error ------------------\n';
    }
    console.log(pushMessageurl);
    var options = {
        uri: pushMessageurl,
        method: 'POST',
        json: {"messaging_type":"RESPONSE","recipient":{"id": fb_user_id},"message":{"text": message_frist + '\n' + JSON.stringify(result.err)}}
    };
    request(options, function (error, response, body) {
        var message = '';
        if (!error && response.statusCode == 200) {
            message = 'Đã send ok';
        }else{
            console.log(body);
            message = 'error: '  + JSON.stringify(body);
        }
        return callback(false, message);
    });
}

exports.check = check;

