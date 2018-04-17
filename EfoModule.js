/**
 * Created by le.thanh.hai on 01/03/2018.
 */

var model = require('./EfoModel');
var EfoValidateEmail = model.EfoValidateEmail;
var i18n = require("i18n");
var fs = require('fs');
var mailer = require('nodemailer');

const config = require('config');


i18n.configure({
    locales:['ja', 'en', 'th', 'vn'],
    defaultLocale: 'ja',
    objectNotation: true,
    directory: __dirname + '/public/assets/locales'
});

var transporter = mailer.createTransport({
    host: config.get('mail_host'),
    port: 25,
    secure: false,
    tls:{
        rejectUnauthorized: false
    },
    service: 'gmail',
    auth: {
        user: 'gmail',
        pass: 'password'
    }
});

var validateEmail = function(cid, uid, email){
    // sendValidateEmail("zefredzocohen@gmail.com", "122112");
    i18n.setLocale('ja');
    sendValidateEmail("le.thanh.hai@miyatsu.vn", "122112");

    EfoValidateEmail.findOne({cid: cid, uid: uid}, function (err, result) {
        console.log(result);
        if(!result){
            var now = new Date();
            var confirm_code = Math.floor(Math.random()*(99999-10000)+10000);
            var model = new EfoValidateEmail({
                cid : cid,
                uid : uid,
                email: email,
                code: Math.floor(Math.random()*(99999-10000)+10000),
                confirm_flg: 0,
                updated_at: now,
                created_at: now
            });
            model.save(function(err) {
                if (err) throw err;
            });
            sendValidateEmail(email, confirm_code);
        }
    });
};

function sendValidateEmail(mail_to, confirm_code) {
    console.log("sendValidateEmail");
    var mail_template = fs.readFileSync(__dirname + '/public/assets/view/efo_validate_email.html', 'utf8');
    var subject = i18n.__('mail_subject_validate_mail');
    mail_template = mail_template.replace(':mail_header', i18n.__('mail_subject_limit_chat'));
    mail_template = mail_template.replace(':mail_body', i18n.__('mail_body_validate_mail'));
    mail_template = mail_template.replace(':validate_code', confirm_code);
    var mailOptions = {
        from: '"' +  config.get('appEnv') + '"<' + config.get('mail_from') + '>',
        to: mail_to,
        subject: subject,
        html: mail_template
    };
    console.log(mailOptions);
    transporter.sendMail(mailOptions, function(error, info){
        console.log("dasdsds");
        if(error){
            return;
        }
    });
}


exports.validateEmail = validateEmail;
