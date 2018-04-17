/**
 * Created by le.thanh.hai on 17/02/2017.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EfoValidateEmailSchema = new Schema({
    cid: String,
    uid: String,
    code: String,
    email: String,
    confirm_flg: Number,
    created_at : Date,
    updated_at : Date
}, { collection: 'efo_validate_emails' });

exports.EfoValidateEmail = mongoose.model('EfoValidateEmail', EfoValidateEmailSchema);

