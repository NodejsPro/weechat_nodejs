var model = require('../model');

var Exception = model.Exception;
var request = require('request');
var config = require('config');

function check(){
    console.log('Exception check');
    Exception.findOne({push_facebook_flg: 0}, function(err, result) {
        if (err) throw err;
        if(result){
            console.log('result: ', result);
            var pushMessageurl = "https://graph.facebook.com/v2.6/me/messages?access_token=:access_token";
            var access_token = config.get('facebook_access_token');
            var fb_user_id = config.get('facebook_user_id');
            var type = result.type;
            pushMessageurl = pushMessageurl.replace(':access_token', access_token);

            var headers = {
                'Content-Type': 'application/json',
            };
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
                if (!error && response.statusCode == 200) {
                    result.message = 'Đã send ok';
                }else{
                    console.log(body);
                    result.message = 'error: '  + JSON.stringify(body);
                }
                result.push_facebook_flg = 1;
                result.save();
            });
        }
    });
}

exports.check = check;

