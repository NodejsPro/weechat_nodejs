/**
 * Created by nguyen.khac.tung on 4/19/2017.
 */
var error_class   = 'validation-failed';
// var success_class = 'validation-pass';

function validation_message (form, validation_data) {
    var validation_result   = true,
        validation_msg_list = [];

    //add language script
    var language = $('body').data('language');
    if (!isEmpty(language) && !isEmpty($.fn.fileinputLocales[language])) {
        validation_msg_list = $.fn.fileinputLocales[language];
    }
    var validate_types = {
        validate_require    : "validate-require",
        validate_url        : "validate-url",
        validate_url_secure : "validate-url-secure",
        validate_max        : "validate-max",
        validate_min        : "validate-min",
        validate_phone      : "validate-phone",
        validate_number     : "validate-number",
        validate_email      : "validate-email",
        validate_length     : "validate-length",
        validate_postalcode_length : "validate-postalcode-length",
        validate_alpha      : "validate-alpha",
        validate_alpha_dash : "validate-alpha-dash",
        validate_alpha_num  : "validate-alpha-num",
        validate_confirm    : "validate-confirm",
        validate_katakana   : "validate-katakana",
        validate_hiragana   : "validate-hiragana",
        validate_zenkaku    : "validate-zenkaku",
        validate_postalcode_invalid : "validate-postalcode-invalid",
        validate_file_upload : "validate-file-upload",
        validate_credit_card : "validate-credit-card",
    };

    //file upload type list: format: input name attribute => type list
    var file_upload_type_list = validation_data.file_upload_type_list;
    var file_upload_max_size = 5; //Mb

    //converse to array
    var validate_value = Object.keys(validate_types).map(function(key) {
        return validate_types[key];
    });

    //remove all old error message in message box
    clearMsg(form);

    //.radio_container and .checkbox_container: check child input
    //input, textarea, select: not have class .hidden, .notset and that parent is not .radio_container and .checkbox_container
    $(form.find('input:not(.hidden, .notset, .readonly), ' +
        'textarea:not(.hidden, .notset, .readonly), ' +
        ' select:not(.hidden, .notset, .readonly), ' +
        '.tel_hyphen_box, ' +
        '.radio_container, ' +
        '.checkbox_container,' +
        '.carousel_container'
    )).each(function (index, elm) {
        var elm_class = $(elm).attr('class');

        if(!$(elm).parents('.radio_container').length
            && !$(elm).parents('.checkbox_container').length
            && !$(elm).parents('.carousel_container').length
            && !isEmpty(elm_class)
        ) {
            //clear old validate class
            $(elm).removeClass(error_class);
            // $(elm).removeClass(success_class);

            check(elm);
        }
    });
    return validation_result;

    function check(elm) {
        var result_check    = true;
        var elm_class       = $(elm).attr('class');
        var elm_class_arr   = $(elm).attr('class').split(' ');
        var value           = null;

        //get value
        if($(elm).hasClass('radio_container') || $(elm).hasClass('checkbox_container')) {
            //check radio, checkbox: have any option selected or checked
            var option_list = $(elm).find('li');
            if(option_list != void 0 && option_list.length) {
                var option_selected = $.map(option_list.find('input.option_input:checked'), function(c){return c.value;});
                if(option_selected.length) {
                    value = 1;
                }
            }
        } else if($(elm).hasClass('carousel_container')) {
            //check have any carousel item actived
            var carousel_active = $(elm).find('.carousel_item.active');
            if(carousel_active != void 0 && carousel_active.length) {
                if(carousel_active.length) {
                    value = 1;
                }
            }
        } else if($(elm).hasClass('tel_hyphen_box')) {
            //get value and join to phone number
            value = '';
            $(elm).find('.input_content input.content').each(function(i, e) {
                value += $.trim($(this).val());
            });
        } else if($(elm).attr('type') == 'radio' || $(elm).attr('type') == 'checkbox') {
            //term of us: check is checked
            if(!isEmpty($(elm)[0]) && !isEmpty($(elm)[0].checked)) {
                value = $(elm)[0].checked;
            }

        } else {
            value = $(elm).val();
        }
        value = $.trim(value);
        // console.log('value: ', value);
        //each class check if is validate class and call to check process
        $(elm_class_arr).each(function (i, class_name) {
            var error_code      = '';
            var error_param_msg = {};

            if(result_check == true && validate_value.indexOf(class_name) != -1) {
                if(class_name == validate_types.validate_require && isEmpty(value)) {
                    result_check = !(elm_class_arr.indexOf(validate_types.validate_require) != -1);

                } else if(class_name != validate_types.validate_require && !isEmpty(value)) {
                    switch (class_name) {
                        //'Valid URL. Required (http://, https:// or ftp://)'
                        case validate_types.validate_url : {
                            var value_replace = value.replace(/[{}]/g, '');
                            result_check = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value_replace);
                        }
                            break;
                        //'Valid URL. Required (http://, https:// or ftp://)'
                        case validate_types.validate_url_secure : {
                            var value_replace = value.replace(/[{}]/g, '');
                            result_check = /^(https):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value_replace);
                        }
                            break;
                        //'Valid phone number. Example (123) 456-7890 or 123-456-7890.'
                            //Origin backup: /^((\d[-. ]?)?((\(\d{3}\))|\d{3}))?[-. ]?\d{3}[-. ]?\d{4}$/.test(value);
                        case validate_types.validate_phone : result_check = /^((\d{1,3}[-. ]?)?((\(\d{1,3}\))|\d{1,3}))?[-. ]?\d{1,3}[-. ]?\d{1,4}$/.test(value);
                            break;
                        //'Valid mail address. Example nguyen.khac.tung@miyatsu.vn
                        case validate_types.validate_email : result_check = /^([a-z0-9,!\#\$%&'\*\+\/=\?\^_`\{\|\}~-]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z0-9,!\#\$%&'\*\+\/=\?\^_`\{\|\}~-]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*@([a-z0-9-]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z0-9-]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*\.(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]){2,})$/i.test(value);
                            break;
                        //'Text length in max range.'
                        case validate_types.validate_max : {
                            var hasMax = /maximum-length-+[0-9]*/.test(elm_class);
                            if (hasMax) {
                                var vMax = elm_class.match(/maximum-length-+[0-9]*/).toString(),
                                    length = vMax.split('-')[2];
                                if (value.length > length) {
                                    result_check = false;
                                    error_param_msg['max'] = length;
                                }
                            }
                        }
                            break;
                        //'Text length in min range.'
                        case validate_types.validate_min : {
                            var hasMin = /minimum-length-+[0-9]*/.test(elm_class);
                            if (hasMin) {
                                var vMin = elm_class.match(/minimum-length-+[0-9]*/).toString(),
                                    length = vMin.split('-')[2];
                                if (value.length < length) {
                                    result_check = false;
                                    error_param_msg['min'] = length;
                                }
                            }
                        }
                            break;
                        case validate_types.validate_number : result_check = !isNaN(value) && /^\s*-?\d*(\.\d*)?\s*$/.test(value);
                            break;
                        case validate_types.validate_length : {
                            var hasLength = /validate-length-+[0-9]*/.test(elm_class);
                            if (hasLength) {
                                var vLength = elm_class.match(/validate-length-+[0-9]*/).toString(),
                                    length = vLength.split('-')[2];
                                if (value.length != length) {
                                    result_check = false;
                                    error_param_msg['num'] = length;
                                }
                            }
                        }
                            break;
                        case validate_types.validate_postalcode_length : {
                            var hasLength = /validate-postalcode-length-+[0-9]*/.test(elm_class);
                            if (hasLength) {
                                var vLength = elm_class.match(/validate-postalcode-length-+[0-9]*/).toString(),
                                    length = vLength.split('-')[3];

                                result_check = (value.length == length);
                            }
                        }
                            break;
                        case validate_types.validate_postalcode_invalid :
                            result_check = false;
                            break;
                        case validate_types.validate_alpha :
                            result_check = /^[A-Z]+$/i.test(value);
                            break;
                        case validate_types.validate_alpha_dash:
                            result_check = /^[0-9A-Z_-]+$/i.test(value);
                            break;
                        case validate_types.validate_alpha_num :
                            result_check = /^[0-9A-Z]+$/i.test(value);
                            break;
                        case validate_types.validate_katakana :
                            result_check = isZenKatakana(value);
                            break;
                        case validate_types.validate_hiragana :
                            result_check = isHiragana(value);
                            break;
                        case validate_types.validate_zenkaku :
                            result_check = isZenKaku(value);
                            break;
                        case validate_types.validate_confirm : {
                            result_check = check_confirm(elm);
                            if(!result_check) {
                                var confirm_type = $(elm).attr('type');
                                if(!isEmpty(validation_msg_list) && !isEmpty(validation_msg_list[confirm_type])) {
                                    confirm_type = validation_msg_list[confirm_type];
                                }
                                error_param_msg['attribute'] = confirm_type;
                            }
                        }
                            break;
                        case validate_types.validate_credit_card : {
                            // var card_type = $(elm).attr('data-card_type');
                            // result_check = is_credit_card(value, card_type);

                            var re = new RegExp(' ', "g");
                            value = value.replace(re, '');
                            result_check = (value.length >= 14);
                        }
                            break;
                        case validate_types.validate_file_upload : {
                            result_check = validate_file_upload(elm);
                            if(!result_check) {
                                error_param_msg['size'] = file_upload_max_size;
                                error_param_msg['type'] = '';
                                //get allow file type list follow upload input name
                                var file_input_name = $(elm).attr('name');
                                if(!isEmpty(file_input_name) && !isEmpty(file_upload_type_list[file_input_name])) {
                                    error_param_msg['type'] = file_upload_type_list[file_input_name].join(', ');
                                }
                            }
                        }
                            break;
                    }
                }
                if(!result_check) {
                    error_code = class_name;
                    validate_view(elm, result_check, error_code, error_param_msg);
                }
            }
        });
        return result_check;
    }

    function isEmpty(v) {
        return (v == '' || (v == null) || (v.length == 0) || /^\s+$/.test(v));
    }

    /**
     * Actions with validate input
     * @param elm
     * @param result_check
     * @param error_code
     * @param error_param_msg
     */
    function validate_view(elm, result_check, error_code, error_param_msg) {
        if($(elm).length) {
            //add message if is error or clear error class if not error
            if (!result_check) {
                validation_result = false;
                //set error class for that elm
                $(elm).addClass(error_class);
                //add message
                if(!isEmpty(error_code)) {
                    error_code = error_code.replace(/-/g, '_');
                    var msg = error_code;

                    if(!isEmpty(validation_msg_list) && !isEmpty(validation_msg_list[error_code])) {
                        //replace attribute message by value
                        msg = setParamMessage(error_param_msg, validation_msg_list[error_code]);
                    }
                    var error_element = "<label class='error'>" + msg + "</label>";

                    if($(elm).hasClass('icheck')) {
                        $(elm).parents('.input_box').after(error_element);
                    } else {
                        //input confirm: show error message for each input
                        //input other, pulldown: show error message is child .msg_group
                        if($(elm).parents('.input_container').not('.confirm_box').length
                            || $(elm).parents('.textarea_group').length
                            || $(elm).parents('.pulldown_container').length
                            || $(elm).parents('.calendar_container').length
                            || $(elm).parents('.captcha_container').length
                        ) {
                            //remove old error messsage in .msg_group
                            clearMsg(elm);
                            $(elm).parents('.msg_group').append(error_element);
                        } else if($(elm).parents('.card_date_box').length) {
                            //remove old error messsage in .msg_group
                            clearMsg(elm, '.card_date_box');
                            $(elm).parents('.card_date_box').append(error_element);
                        } else {
                            $(elm).after(error_element);
                        }
                    }
                }
            } else {
                // $(elm).addClass(success_class);
            }
        }
    }

    /**
     * Clear message
     * @param elm
     */
    function clearMsg(elm, parent_find) {
        $(elm).find('label.error').not('.not_remove').remove();
        if(!isEmpty(parent_find)) {
            $(elm).parents(parent_find).find('label.error').not('.not_remove').remove();
        } else {
            $(elm).parents('.msg_group').find('label.error').not('.not_remove').remove();
        }
    }

    /**
     * set value for attribute code in string
     * @param param
     * @param str
     * @returns {*}
     */
    function setParamMessage(param, str) {
        if(!isEmpty(param) && typeof param == 'object') {
            $.each(param, function(code, value) {
                if(!isEmpty(value)) {
                    code = ':' + code;
                    var re = new RegExp(code, "g");
                    str = str.replace(re, value);
                }
            });
        }
        return str;
    }

    //Validate only Japanese
    function isHiragana(str) {
        str = (str == null) ? "" : str;
        return (str.match(/^[ぁ-んー　]*$/)) ? true : false;
    }
    function isZenKatakana(str) {
        str = (str==null) ? "" : str;
        return (str.match(/^[ァ-ヶー　]*$/)) ? true : false;
    }
    function isZenKaku(str){
        str = (str==null)?"":str;
        return (str.match(/^[^\x01-\x7E\xA1-\xDF]+$/)) ? true : false;
    }

    //validate confirm: password, email
    function check_confirm(elm) {
        if(!isEmpty($(elm))) {
            var confirm_val = $(elm).val();
            var type = $(elm).attr('type');
            if(!isEmpty(confirm_val) && !isEmpty(type) && !isEmpty($(elm).parents('.msg_group').find('input.' + type))) {
                var primary_val = $(elm).parents('.msg_group').find('input.' + type).val();
                primary_val = $.trim(primary_val);
                confirm_val = $.trim(confirm_val);

                return (primary_val == confirm_val);
            }
        }
        return false;
    }

    //validate file upload
    function validate_file_upload(elm) {
        if(!isEmpty($(elm)[0].files[0])) {
            var file_input_name = $(elm).attr('name'),
                file_input = $(elm)[0].files[0],
                file_name_origin = file_input.name,
                file_type = file_name_origin.split('.').pop().toLowerCase(),
                file_size = file_input.size / (1024*1024); //unit mb

            //get allow file type list follow upload input name
            var file_upload_type = [];
            if(!isEmpty(file_input_name) && !isEmpty(file_upload_type_list[file_input_name])) {
                file_upload_type = file_upload_type_list[file_input_name];
            }
            if(file_size > file_upload_max_size || (file_upload_type.length && file_upload_type.indexOf(file_type) < 0)) {
                return false;
            }
        }
        return true;
    }

    //check credit card
    function is_credit_card(card_number, card_type) {
        card_number = card_number.replace(/[- ]+/g, '');

        var credit_card_reg;
        switch (card_type) {
            case 'jcb':
                credit_card_reg = /^(?:2131|1800|35\d{3})\d{11}$/;
                break;
            case 'master_card':
                credit_card_reg = /^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$/;
                break;
            case 'american_express':
                credit_card_reg = /^3[47][0-9]{13}$/;
                break;
            case 'diner_club':
                credit_card_reg = /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/;
                break;
            case 'discover':
                credit_card_reg = /^6(?:011|5[0-9]{2})[0-9]{12}$/;
                break;
            default: //visa
                credit_card_reg = /^4[0-9]{12}(?:[0-9]{3})?$/;
                break;
        }

        if (!credit_card_reg.test(card_number)) {
            return false;
        }
        var sum = 0;
        var digit = void 0;
        var tmpNum = void 0;
        var shouldDouble = void 0;
        for (var i = card_number.length - 1; i >= 0; i--) {
            digit = card_number.substring(i, i + 1);
            tmpNum = parseInt(digit, 10);
            if (shouldDouble) {
                tmpNum *= 2;
                if (tmpNum >= 10) {
                    sum += tmpNum % 10 + 1;
                } else {
                    sum += tmpNum;
                }
            } else {
                sum += tmpNum;
            }
            shouldDouble = !shouldDouble;
        }
        return !!(sum % 10 === 0 ? card_number : false);
    }
}