var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var config = require('config');

mongoose.Promise = global.Promise;

var UserSchema = new Schema({
    authority: String,
    phone: String,
    contact: Array,
    user_name: String,
    code: String,
    is_login: Number,
    created_at : Date,
    avatar: String,
    updated_at : Date
});

var UnreadMessageSchema = new Schema({
    room_id: String,
    user_id: String,
    count: Number,
    created_at : Date,
    updated_at : Date
}, { collection: 'unread_messages' });

var LastMessageSchema = new Schema({
    room_id: String,
    user_id: String,
    message_type: String,
    message : Schema.Types.Mixed,
    created_at : Date,
    updated_at : Date,
}, { collection: 'last_messages' });

var establishedModels = {};
var createModelLogForName = function (name) {
    if (!(name in establishedModels)) {
        var Any = new Schema({
            room_id: String,
            user_id: String,
            message_type: String,
            message : Schema.Types.Mixed,
            message_id: String,
            error_flg: Number,
            background_flg: Number,
            created_at : Date,
            updated_at : Date,
            time_of_message : Date,
        }, { collection: name });
        Any.index({ room_id: 1, user_id: 1, created_at: -1});
        establishedModels[name] = mongoose.model(name, Any);
    }
    return establishedModels[name];
};

var ExceptionSchema = new Schema({
    err: Schema.Types.Mixed,
    push_facebook_flg: Number,
    type: String,
    message: Schema.Types.Mixed,
    created_at: Date,
    updated_at: Date
});

var RoomSchema = new Schema({
    name: String,
    admin_id: String,
    room_type: String,
    share_key_flag: Number,
    admin_key_flg : Number,
    member: Array,
    created_at : Date,
    updated_at : Date
});

var options = {
    //useMongoClient: true,
    socketTimeoutMS: 0,
    keepAlive: true,
    reconnectTries: 30
};
//
//mongoose.connect(config.get('dbURL'), options);
mongoose.connect(config.get('dbURL'), options, function(err) {
    if (err) throw err;
    console.log("connect mongodb done");
});

exports.User = mongoose.model('User', UserSchema);
exports.Exception = mongoose.model('Exception', ExceptionSchema);
exports.Room = mongoose.model('Room', RoomSchema);
exports.UnreadMessage = mongoose.model('UnreadMessage', UnreadMessageSchema);
exports.LastMessage = mongoose.model('LastMessage', LastMessageSchema);

exports.CreateModelLogForName = createModelLogForName;

