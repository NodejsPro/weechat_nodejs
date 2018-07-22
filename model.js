/**
 * Created by le.thanh.hai on 17/02/2017.
 */
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
    is_login: String,
    created_at : Date,
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

var TotalUserChatSchema = new Schema({
    user_id: String,
    plan: String,
    total_user_chat: Number,
    cpid: Schema.Types.Mixed
}, { collection: 'total_user_chats' });
TotalUserChatSchema.index({ user_id: 1});

var ConnectSchema = new Schema({
    user_id: String,
    delete_flg: Number
});

var ConnectPageSchema = new Schema({
    page_id: String,
    connect_id: { type: String, ref: 'Connect' },
    picture: String,
    page_access_token : String,
    channel_access_token: String,
    origin_page_access_token: String,
    my_app_flg: Number,
    channel_id: String,
    sns_type: String,
    setting: Schema.Types.Mixed,
    validate_token: String,
    channel_secret: String,
    start_message: String,
    greeting_message: String,
    page_name: String,
    scenario_type: String,
    list_option: Schema.Types.Mixed,
    chatwork_account_id: Number,
    conversion_setting: Schema.Types.Mixed,
    deleted_at: Date
}, { collection: 'connect_pages' });
ConnectPageSchema.index({ connect_id: 1});
ConnectPageSchema.index({ validate_token: 1});

var LibrarySchema  = new Schema({
    name: String,
    connect_page_id: String,
    all_dialog_flg: Number,
    scenario_id: String,
    messages : Schema.Types.Mixed
});
LibrarySchema.index({ connect_page_id: 1});


var ApiSchema  = new Schema({
    name: String,
    connect_page_id: String,
    api_type: String,
    url: String,
    method: String,
    request: Schema.Types.Mixed,
    response: Schema.Types.Mixed
});
ApiSchema.index({ connect_page_id: 1});

var ScenarioSchema = new Schema({
    connect_page_id: String,
    start_flg : Number,
    parent_scenario_id: String,
    filter: Schema.Types.Mixed,
    library: Schema.Types.Mixed,
    deleted_at: Date,
    page_id: { type: String }
});
ScenarioSchema.index({ connect_page_id: 1});

//var UserMessageSchema = new Schema({
//    scenario_id: { type: String, ref: 'Scenario' },
//    position: Number,
//    type: String,
//    text: String,
//    library_id : Schema.Types.Mixed
//}, { collection: 'user_messages' });

var BotMessageSchema = new Schema({
    scenario_id: { type: String, ref: 'Scenario'},
    position: Number,
    filter: Schema.Types.Mixed,
    message_type: String,
    data: Schema.Types.Mixed,
    input_requiment_flg: Number,
    btn_next: String
}, { collection: 'bot_messages', autoIndex: false });

BotMessageSchema.index({ scenario_id: 1, message_type: 1, position: 1});

var BotLastTimeSchema = new Schema({
    connect_page_id: String,
    user_id: String,
    last_time : Date,
    created_at : Date,
    updated_at : Date
}, { collection: 'bot_last_times'});

var UserPositionSchema = new Schema({
    connect_page_id: String,
    page_id: String,
    user_id: String,
    scenario_id: { type: String, ref: 'Scenario' },
    position: Number,
    slot_id: Number,
    created_at : Date ,
    updated_at : Date
}, { collection: 'user_positions' });

UserPositionSchema.index({ connect_page_id: 1, user_id: 1});

var VariableSchema = new Schema({
    connect_page_id: String,
    variable_name: String,
    created_at : Date,
    updated_at : Date
});
VariableSchema.index({ connect_page_id: 1});


var MessageVariableSchema = new Schema({
    connect_page_id: String,
    user_id: String,
    page_id: String,
    variable_id: String,
    variable_value: Schema.Types.Mixed,
    created_at : Date,
    updated_at : Date
}, { collection: 'message_variables' });
MessageVariableSchema.index({ connect_page_id: 1, user_id: 1});

var SlotSchema = new Schema({
    connect_page_id: String,
    action: String,
    action_data : String,
    item: Schema.Types.Mixed,
    created_at : Date,
    updated_at : Date
});

var NlpSchema = new Schema({
    connect_page_id: String,
    app_id: String,
    created_at : Date,
    updated_at : Date
});


var MailSchema = new Schema({
    connect_page_id: String,
    to: String,
    cc : String,
    from_name: String,
    subject: String,
    content : String,
    created_at : Date,
    updated_at : Date
});
MailSchema.index({ connect_page_id: 1});

var UserProfileSchema = new Schema({
    connect_page_id: String,
    page_id: String,
    user_id: String,
    current_url: String,
    user_display_name: String,
    user_status_message: String,
    user_first_name : String,
    user_last_name : String,
    user_full_name : String,
    profile_pic : String,
    user_locale : String,
    user_timezone : Number,
    user_gender : String,
    user_referral: String,
    user_referral_all: Schema.Types.Mixed,
    user_email: String,
    user_lat: Number,
    user_long: Number,
    number_index: Number,
    is_payment_enabled : String,
    last_active_at: Number,
    get_session_flg: Number,
    unfollow_at: Number,
    start_flg: Number,
    new_flg: Number,
    unread_cnt: Number,
    last_time_at: Number,
    scenario_id: String,
    preview_flg: Number,
    created_at : Date,
    updated_at : Date
}, { collection: 'user_profiles' });
UserProfileSchema.index({ connect_page_id: 1, user_id: 1, created_at: -1});

var RoomListSchema = new Schema({
    connect_page_id: String,
    room_id: Number,
    from_account_id: Number,
    to_account_id: Number,
    scenario_id: String,
    position: Number,
    type: Number,
    created_at : Date,
    updated_at : Date
}, { collection: 'room_lists' });
RoomListSchema.index({ connect_page_id: 1, room_id: 1});

var RoomMessageVariableSchema = new Schema({
    connect_page_id: String,
    room_id: Number,
    user_account_id: Number,
    variable_id: String,
    variable_value: Schema.Types.Mixed,
    created_at : Date,
    updated_at : Date
}, { collection: 'room_message_variables' });

var RoomMemberProfileSchema = new Schema({
    connect_page_id: String,
    room_id: Number,
    user_account_id: Number,
    avatar_image_url: String,
    user_organization_name: String,
    user_organization_id: Number,
    user_name: String,
    last_time_at: Number,
    preview_flg: Number,
    created_at : Date,
    updated_at : Date
}, { collection: 'room_member_profiles' });
RoomMemberProfileSchema.index({ connect_page_id: 1, room_id: 1, created_at: -1});


var LogChatMessageSchema = new Schema({
    connect_page_id: String,
    scenario_id: String,
    page_id: String,
    user_id: String,
    room_id: String,
    send_time: Number,
    message_type: String,
    type : Number,
    message : Schema.Types.Mixed,
    message_id: String,
    payload: String,
    notification_id: String,
    error_flg: Number,
    background_flg: Number,
    error_message : Schema.Types.Mixed,
    created_at : Date,
    updated_at : Date,
    start_flg: Number,
    user_said: String,
    time_of_message : Date,
    question_count: Number,
    bid: String,
    b_position: Number
}, { collection: 'log_chat_messages' });
LogChatMessageSchema.index({ connect_page_id: 1, user_id: 1, created_at: -1});

var PGatewaySchema = new Schema({
    user_id: String,
    provider: String,
    gateway_name: String,
    pgcard_shop_id: String,
    pgcard_shop_pass: String,
    pgcard_site_id: String,
    pgcard_site_pass: String,
    default_flg: Number,
    created_at : Date,
    updated_at : Date
}, { collection: 'p_gateways' });

var EfoPOrderSchema = new Schema({
    connect_page_id: String,
    user_id: String,
    order_id: String,
    amount: Number,
    created_at : Date,
    updated_at : Date
}, { collection: 'efo_p_orders' });

var EfoPOrderHistorySchema = new Schema({
    user_id: String,
    connect_page_id: String,
    order_id: String,
    p_order_id: String,
    amount: Number,
    data: Schema.Types.Mixed,
    order_status: String,
    created_at : Date,
    updated_at : Date
}, { collection: 'efo_p_order_histories' });

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

var createModelUserProfileForName = function (name) {
    if (!(name in establishedModels)) {
        var Any = new Schema({
            connect_page_id: String,
            page_id: String,
            user_id: String,
            current_url: String,
            user_display_name: String,
            user_status_message: String,
            user_first_name : String,
            user_last_name : String,
            user_full_name : String,
            profile_pic : String,
            user_locale : String,
            user_timezone : Number,
            user_gender : String,
            user_referral: String,
            user_referral_all: Schema.Types.Mixed,
            user_email: String,
            user_lat: Number,
            user_long: Number,
            number_index: Number,
            is_payment_enabled : String,
            last_active_at: Number,
            unfollow_at: Number,
            start_flg: Number,
            new_flg: Number,
            cv_flg: Number,
            unread_cnt: Number,
            last_time_at: Number,
            scenario_id: String,
            preview_flg: Number,
            created_at : Date ,
            updated_at : Date
        }, { collection: name });
        Any.index({ connect_page_id: 1, user_id: 1, created_at: -1});
        establishedModels[name] = mongoose.model(name, Any);
    }
    return establishedModels[name];
};

var createModelEfoCvForName = function (name) {
    if (!(name in establishedModels)) {
        var Any = new Schema({
            connect_page_id: String,
            user_id: String,
            scenario_id: String,
            answer_count: Number,
            position: Number,
            cv_flg: Number,
            cv_time: Number,
            cv_minute: Number,
            date: String,
            browser: String,
            device: String,
            os: String,
            lang: String,
            preview_flg: Number,
            created_at: Date,
            updated_at: Date
        }, { collection: name});
        Any.index({ connect_page_id: 1, user_id: 1});
        establishedModels[name] = mongoose.model(name, Any);
    }
    return establishedModels[name];
};

var createModelMessageVariableForName = function (name) {
    if (!(name in establishedModels)) {
        var Any = new Schema({
            connect_page_id: String,
            user_id: String,
            page_id: String,
            variable_id: String,
            variable_value: Schema.Types.Mixed,
            created_at : Date,
            updated_at : Date
        }, { collection: name});
        Any.index({ connect_page_id: 1, user_id: 1});
        establishedModels[name] = mongoose.model(name, Any);
    }
    return establishedModels[name];
};


var createModelScenarioTotalForName = function (name) {
    if (!(name in establishedModels)) {
        var Any = new Schema({
            connect_page_id: String,
            date: String,
            scenario_id: String,
            count: Number
        }, { collection: name});
        Any.index({ connect_page_id: 1, scenario_id: 1, date: -1});
        establishedModels[name] = mongoose.model(name, Any);
    }
    return establishedModels[name];
};

//var createModelUserActiveForName = function (name) {
//    if (!(name in establishedModels)) {
//        var Any = new Schema({
//            connect_page_id: String,
//            user_id: String,
//            date: String
//        }, { collection: name});
//        Any.index({ connect_page_id: 1, user_id: 1, date: -1});
//        establishedModels[name] = mongoose.model(name, Any);
//    }
//    return establishedModels[name];
//};

var createModelUseScenarioForName = function (name) {
    if (!(name in establishedModels)) {
        var Any = new Schema({
            connect_page_id: String,
            user_id: String,
            date: String,
            count: Number
        }, { collection: name});
        Any.index({ connect_page_id: 1, user_id: 1, date: -1});
        establishedModels[name] = mongoose.model(name, Any);
    }
    return establishedModels[name];
};


var LogReportTotalDateSchema = new Schema({
    connect_page_id: String,
    date: String,
    new_user: Number,
    repeat_user: Number,
    scenario_total: Number
}, { collection: "log_report_total_dates"});
LogReportTotalDateSchema.index({ connect_page_id: 1, date: -1});

var NotificationHistorySchema = new Schema({
    connect_page_id: String,
    page_id: String,
    data : Schema.Types.Mixed,
    send_count: Number,
    read_count: Number,
    notification_id: String,
    created_at : Date,
    updated_at : Date,
    user_list : Schema.Types.Mixed,
    push_time: Number,
    time_of_message : Number
}, { collection: 'notification_histories' });
NotificationHistorySchema.index({ connect_page_id: 1});


var MenuSchema = new Schema({
    connect_page_id: String,
    parent_id: String,
    scenario_id : String,
    priority_order: Number,
    title: String,
    type: String,
    url : String,
    created_at : Date,
    updated_at : Date,
}, { collection: 'menus' });
MenuSchema.index({ connect_page_id: 1});


var ExceptionSchema = new Schema({
    err: String,
    created_at: Date,
    updated_at: Date
});

var PlanSchema = new Schema({
    code: String,
    name_ja : String,
    name_en : String,
    name_vn : String,
    name_th : String,
    initialization_fee : Number,
    monthly_fee : Number,
    fee_unit_ja : String,
    fee_unit_en : String,
    fee_unit_vn : String,
    max_user : Number,
    max_bot : Number,
    max_admin : Number,
    option : Array,
    support_ja : String,
    support_en : String,
    support_vn : String,
    support_th : String
});

var EfoAnalyticSchema = new Schema({
    cid: String,
    date : String,
    pcnt : Number,
    scnt : Number,
    new_user: Number,
    repeat_user: Number
}, { collection: 'efo_analytics' });


var EfoCookieSchema = new Schema({
    cid: String,
    cookie_value: String,
    first: Date,
    previous: Date,
    current: Date
}, { collection: 'efo_cookies' });

var EfoCaptchaSchema = new Schema({
    cid: String,
    uid: String,
    text: String,
    created_at : Date,
    updated_at : Date
}, { collection: 'efo_captchas' });


var EfoCartSchema = new Schema({
    cid: String,
    uid: String,
    p_id: String,
    data : Schema.Types.Mixed,
    created_at : Date,
    updated_at : Date
}, { collection: 'efo_carts' });

//var UnreadMessageSchema = new Schema({
//    connect_page_id: String,
//    user_id: String,
//    count: Number,
//    last_time_at: Date,
//    scenario_id: String,
//    created_at: Date,
//    updated_at: Date
//}, { collection: 'unread_messages' });
//UnreadMessageSchema.index({ connect_page_id: 1, user_id: 1});

var SessionUserSchema = new Schema({
    connect_page_id: String,
    user_id: String,
    date: String,
    session_no: Number,
    created_at: Date,
    updated_at: Date
}, { collection: 'session_users' });
SessionUserSchema.index({ connect_page_id: 1, date: 1});

var SessionScenarioSchema = new Schema({
    connect_page_id: String,
    scenario_id: String,
    session_no: Number,
    date: String,
    created_at: Date,
    updated_at: Date
}, { collection: 'session_scenarios' });
SessionScenarioSchema.index({ connect_page_id: 1, scenario_id: 1, date: 1});

var UserScenarioSchema = new Schema({
    connect_page_id: String,
    user_id: String,
    scenario_id: String,
    count: Number,
    date: String,
    created_at: Date,
    updated_at: Date
}, { collection: 'user_scenarios' });
UserScenarioSchema.index({ connect_page_id: 1, date: 1, user_id: 1, scenario_id: 1});

var BotNoReplySchema = new Schema({
    connect_page_id: String,
    user_id: String,
    date: String,
    user_said: Schema.Types.Mixed,
    count: Number,
    created_at: Date,
    updated_at: Date
}, { collection: 'bot_no_replies' });
BotNoReplySchema.index({ connect_page_id: 1, user_id : 1, date: 1});


var ZipcodeSchema = new Schema({
    zipcode: String,
    zipcode1: String,
    pref: String,
    city: String,
    street: String
}, { collection: 'zipcodes' });
ZipcodeSchema.index({ zipcode: 1});

var PrefJpSchema = new Schema({
    pref: String
}, { collection: 'pref_jps' });

var PrefCityJpSchema = new Schema({
    pref: String,
    city: String
}, { collection: 'pref_city_jps' });

var RoomSchema = new Schema({
    name: String,
    user_id: String,
    room_type: String,
    share_key_flag: Number,
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
exports.Connect = mongoose.model('Connect', ConnectSchema);
exports.ConnectPage = mongoose.model('ConnectPage', ConnectPageSchema);

exports.Library = mongoose.model('Library', LibrarySchema);
exports.Api = mongoose.model('Api', ApiSchema);

//exports.UserMessage = mongoose.model('UserMessage', UserMessageSchema);
exports.BotMessage = mongoose.model('BotMessage', BotMessageSchema);
exports.UserProfile = mongoose.model('UserProfile', UserProfileSchema);
exports.UserPosition = mongoose.model('UserPosition', UserPositionSchema);
exports.LogChatMessage = mongoose.model('LogChatMessage', LogChatMessageSchema);
exports.Scenario = mongoose.model('Scenario', ScenarioSchema);
exports.NotificationHistory = mongoose.model('NotificationHistory', NotificationHistorySchema);
exports.Variable = mongoose.model("Variable", VariableSchema);
exports.MessageVariable = mongoose.model('MessageVariable', MessageVariableSchema);
exports.Slot = mongoose.model('Slot', SlotSchema);
exports.Email = mongoose.model('Mail', MailSchema);
exports.BotLastTime = mongoose.model('BotLastTime', BotLastTimeSchema);
exports.Menu = mongoose.model('Menu', MenuSchema);
exports.Exception = mongoose.model('Exception', ExceptionSchema);
exports.Plan = mongoose.model('Plan', PlanSchema);
exports.Nlp = mongoose.model('Nlp', NlpSchema);

exports.SessionUser = mongoose.model('SessionUser', SessionUserSchema);
exports.SessionScenario = mongoose.model('SessionScenario', SessionScenarioSchema);
exports.UserScenario = mongoose.model('UserScenario', UserScenarioSchema);
exports.BotNoReply = mongoose.model('BotNoReply', BotNoReplySchema);
exports.Zipcode = mongoose.model('Zipcode', ZipcodeSchema);
exports.PrefJp = mongoose.model('PrefJp', PrefJpSchema);
exports.PrefCityJp = mongoose.model('PrefCityJp', PrefCityJpSchema);

exports.LogReportTotalDate = mongoose.model('LogReportTotalDate', LogReportTotalDateSchema);

exports.TotalUserChat = mongoose.model('TotalUserChat', TotalUserChatSchema);
exports.EfoAnalytic = mongoose.model('EfoAnalytic', EfoAnalyticSchema);
exports.EfoCookie = mongoose.model('EfoCookie', EfoCookieSchema);
exports.EfoCaptcha = mongoose.model('EfoCaptcha', EfoCaptchaSchema);
exports.EfoCart = mongoose.model('EfoCart', EfoCartSchema);

exports.Room = mongoose.model('Room', RoomSchema);
exports.UnreadMessage = mongoose.model('UnreadMessage', UnreadMessageSchema);
exports.LastMessage = mongoose.model('LastMessage', LastMessageSchema);

exports.RoomList = mongoose.model('RoomList', RoomListSchema);
exports.RoomMessageVariable = mongoose.model('RoomMessageVariable', RoomMessageVariableSchema);
exports.RoomMemberProfile = mongoose.model('RoomMemberProfile', RoomMemberProfileSchema);
exports.PaymentGateway = mongoose.model('PaymentGateway', PGatewaySchema);
exports.EfoPOrder = mongoose.model('EfoPOrder', EfoPOrderSchema);
exports.EfoPOrderHistory = mongoose.model('EfoPOrderHistory', EfoPOrderHistorySchema);

exports.CreateModelLogForName = createModelLogForName;
exports.CreateModelUserProfileForName = createModelUserProfileForName;
exports.CreateModelEfoCvForName = createModelEfoCvForName;
exports.CreateModelMessageVariableForName = createModelMessageVariableForName;
exports.CreateModelScenarioTotalForName = createModelScenarioTotalForName;
//exports.CreateModelUserActiveForName = createModelUserActiveForName;
exports.CreateModelUseScenarioForName = createModelUseScenarioForName;

