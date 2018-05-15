/**
 * Created by nguyen.duc.quyet on 23/02/2018.
 */
'use strict';

var model = require('../model');
var i18n = require("i18n");

var Connect = model.Connect;
var ConnectPage = model.ConnectPage;
var PaymentGateway =  model.PaymentGateway;
var EfoPOrder =  model.EfoPOrder;
var EfoPOrderHistory =  model.EfoPOrderHistory;
var EfoCart =  model.EfoCart;

var connector_gmo = require('../config/connector_gmo.json');
var connector_gmo_honban = require('../config/connector_gmo_honban.json');

const request = require('request'),
    https = require('https'),
      Q = require('q'),
      config = require('config');

i18n.configure({
    locales:['ja', 'en', 'th', 'vn'],
    defaultLocale: 'ja',
    objectNotation: true,
    directory: __dirname + '/../public/assets/locales'
});

const defaul_gmo_gateway = {pgcard_site_id: "tsite00000494", pgcard_site_pass: "7dehg57p", pgcard_shop_id: "tshop00000547", pgcard_shop_pass: "pc4aqes7", mode: "develop"};

function getPaymentGatewayInfo(params, callback) {
    Connect.findOne({_id: params.connect_id}, function (err, res) {
        console.log(res);
        if(res){
            PaymentGateway.findOne({user_id: res.user_id, default_flg: 1}, function (e, data_gateway) {
                if(data_gateway){
                    data_gateway.mode = "develop";
                    return callback(false, data_gateway);
                }else{
                    return callback(false, defaul_gmo_gateway);
                }
            });
        }else{
            return callback(true);
        }
    });
}

function getPaymentGateway(params, callback) {
    Connect.findOne({_id: params.connect_id}, function (err, res) {
        if(res){
            PaymentGateway.findOne({user_id: res.user_id, default_flg: 1}, function (e, data_gateway) {
                console.log(data_gateway);
                if(data_gateway){
                    if (data_gateway.provider == GMO_PAYMENT_GATEWAY) {
                        return callback(false, data_gateway);
                    }else{
                        return callback(true, {msg: i18n.__('payment_gateway_error')})
                    }
                }else{
                    return callback(true, {msg: i18n.__('payment_gateway_error')})
                }
            });
        }else{
            return callback(true, {msg: i18n.__('payment_gateway_error')})
        }
    });
}

function getAmount(params, callback){
    EfoCart.find({cid: params.connect_page_id, uid: params.user_id}, function(err, result) {
        if (err) throw err;
        var amount = 0;
        if(result && result.length > 0){
            result.forEach(function (row) {
                var data = row.data;
                if(data.amount && data.unit_price)
                amount += parseInt(data.amount) * parseInt(data.unit_price);
            });
        }
        return callback(amount);
    });
}

function gmoPaymentDataFormat(data, payment_gmo_error) {
    var result = {};
    if (data) {
        var param_array = data.split('&');
        param_array.forEach(function (row) {
            var param_item = row.split('=');
            var param_name = param_item[0];
            var param_vals = param_item[1].split('|');
            var error_message = [];
            param_vals.forEach(function (val, ind) {
                if (param_name == 'ErrInfo') {
                    //show error message
                    if(payment_gmo_error[val]){
                        error_message.push(payment_gmo_error[val]);
                    }
                }else if(param_name != "ErrCode"){
                    result[param_name] = val;
                }
            });
            if(error_message.length > 0){
                result['message'] = error_message;
            }
        });
    }
    return result;
}

function saveHistoryOrder(p_efo_order, data_response, status_code) {
    //console.log("saveHistoryOrder");
    //console.log(p_efo_order);
    //console.log(data_response);
    //console.log(status_code);
    var now = new Date();
    EfoPOrderHistory.findOneAndUpdate({connect_page_id : p_efo_order.connect_page_id, user_id: p_efo_order.user_id, order_id: p_efo_order.order_id}, {
        $set: {
            p_order_id: p_efo_order._id,
            amount: p_efo_order.amount,
            order_status: status_code ? GMO_PAYMENT_SUCCESS : GMO_PAYMENT_FAIL,
            data: data_response,
            updated_at: now
        },
        $setOnInsert: {created_at: now}
    }, {upsert: true, multi: false }, function(err, result) {

    });
}

function execTranGmo(params, p_efo_order, order_data, post_url, callback) {
    console.log("execTranGmo");
    var options = [];
    var date = new Date(),
        month = String(date.getMonth()),
        year = String(date.getFullYear());
    month = (month < 10 ? '0' : '') + month;
    var expire_day = parseInt(year.slice(2) + month);
    var result = [];
    result['success'] = false;
    var card_info = params.cart_info;
    console.log(card_info);
    if (card_info && card_info.number != undefined && card_info.number != "" && card_info.number.length >= 14
        && card_info.cvc != undefined && card_info.cvc != "" && card_info.cvc.length >= 3
        && card_info.expire != undefined && card_info.expire != "" && card_info.expire > expire_day) {

        options['AccessID'] = order_data.AccessID;
        options['AccessPass'] = order_data.AccessPass;
        options['OrderID'] = order_data.OrderID;
        options['Method'] = 1;
        options['CardNo'] = card_info.number;
        options['Expire'] = card_info.expire;
        options['SecurityCode'] = card_info.cvc;

        request({
            uri: post_url,
            method: 'POST',
            form: options

        }, function (error, response, body) {
            console.log(body);
            if (body.search("ErrCode") != -1) {
                result['success'] = false;
                var payment_gmo_error = require('../public/assets/locales/' + params.lang + '/payment_gmo_error.json');
                result['data'] = gmoPaymentDataFormat(body, payment_gmo_error);
                saveHistoryOrder(p_efo_order, result['data'], false);
            } else {
                result['success'] = true;
                result['data'] = gmoPaymentDataFormat(body);
                saveHistoryOrder(p_efo_order, result['data'], true);
            }
            console.log(result);
            return callback(result);
        });
    }else{
        return callback(result);
    }
}

function searchTradeGmo(params, gateway, OrderID, searchTradeUrl, callback){
    var options = [];

    options['ShopID'] = gateway.pgcard_shop_id;
    options['ShopPass'] = gateway.pgcard_shop_pass;
    options['OrderID'] = OrderID;

    request({
        uri: searchTradeUrl,
        method: 'POST',
        form: options

    }, function (error, response, body) {
        console.log(body);
        var result = [];
        if (body.search("ErrCode") != -1) {
            result['success'] = false;
            var payment_gmo_error = require('../public/assets/locales/' + params.lang + '/payment_gmo_error.json');
            result['data'] = gmoPaymentDataFormat(body, payment_gmo_error);
        } else {
            result['success'] = true;
            result['data'] = gmoPaymentDataFormat(body);
        }
        return callback(result);
    });
}

function entryTranGmo(params, gateway, entryTranUrl, callback){
    console.log("entryTranGmo");
    var options = [], now = new Date();
    var min = 100;
    var max = 999;
    var a = Math.floor( Math.random() * (max + 1 - min) ) + min ;
    var order_id = params.log_order_id + a;
    var result = [];
    var payment_gmo_error = require('../public/assets/locales/' + params.lang + '/payment_gmo_error.json');
    result['success'] = false;

    options['SiteID'] = gateway.pgcard_site_id;
    options['SitePass'] = gateway.pgcard_site_pass;
    options['ShopID'] = gateway.pgcard_shop_id;
    options['ShopPass'] = gateway.pgcard_shop_pass;
    options['OrderID'] = order_id;
    options['JobCd'] = 'CAPTURE';
    options['Amount'] = params.amount;

    request({
        uri: entryTranUrl,
        method: 'POST',
        form: options
    }, function (error, response, body) {
        console.log(body);
        var result = [];
        if (!error && response.statusCode == 200) {
            console.log("create entry");
            if (body.search("ErrCode") != -1) {
                result['success'] = false;
                result['data'] = gmoPaymentDataFormat(body, payment_gmo_error);
                return callback(result);
            } else {
                result['success'] = true;
                result['data'] = gmoPaymentDataFormat(body);
                result['data'].OrderID = order_id;
                var insert_data = {
                    connect_page_id : params.connect_page_id,
                    user_id : params.user_id,
                    order_id : order_id,
                    amount : params.amount,
                    updated_at : now,
                    created_at : now
                };
                var efoPOrder = new EfoPOrder(insert_data);
                efoPOrder.save(function(err) {
                    if(!err){
                        console.log(efoPOrder);
                        return callback(result, efoPOrder);
                    }
                });
            }
        } else {
            result['error'] = body.error;
            return callback(result);
        }
        console.log("result entryTranGmo");
        console.log(result);

    });
}

function executePayment(params, callback){
    console.log("executePayment");
    getPaymentGatewayInfo(params, function (error, gateway) {
        if(error){
            data.cart_error_message = result.msg;
        }
        console.log(gateway);

        EfoPOrder.findOne({connect_page_id: params.connect_page_id, user_id: params.user_id, amount: params.amount}, function (e, result) {
            var entryTranUrl =(gateway.mode != 'honban') ? connector_gmo.EntryTran : connector_gmo_honban.EntryTran;
            var execTranUrl = (gateway.mode != 'honban') ? connector_gmo.ExecTran : connector_gmo_honban.ExecTran;

            if(result){
                var searchTradeUrl = (gateway.mode != 'honban') ? connector_gmo.SearchTrade : connector_gmo_honban.SearchTrade;
                searchTradeGmo(params, gateway, result.order_id, searchTradeUrl, function(p_order_info) {
                    if(!p_order_info.success){
                        entryTranGmo(params, gateway, entryTranUrl, function(p_order_info, p_efo_order) {
                            if(p_order_info.success){
                                execTranGmo(params, p_efo_order, p_order_info.data, execTranUrl, function(p_exec_info) {
                                    if(p_exec_info.success){
                                        return callback(false);
                                    }else{
                                        return callback(true, p_exec_info.data);
                                    }
                                });
                            }else{
                                return callback(true, p_order_info.data);
                            }
                        });
                    }else{
                        execTranGmo(params, result, p_order_info.data, execTranUrl, function(p_exec_info) {
                            if(p_exec_info.success){
                                return callback(false);
                            }else{
                                return callback(true, p_exec_info.data);
                            }
                        });
                    }
                });
            }else{
                entryTranGmo(params, gateway, entryTranUrl, function(p_order_info, p_efo_order) {
                    if(p_order_info.success){
                        execTranGmo(params, p_efo_order, p_order_info.data, execTranUrl, function(p_exec_info) {
                            if(p_exec_info.success){
                                return callback(false);
                            }else{
                                return callback(true, p_exec_info.data);
                            }
                        });
                    }else{
                        return callback(true, p_order_info.data);
                    }
                });
            }
        });
    });
}

exports.getPaymentGateway = getPaymentGateway;
exports.getAmount = getAmount;
exports.executePayment = executePayment;