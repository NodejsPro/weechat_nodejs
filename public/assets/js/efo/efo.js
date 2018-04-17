/**
 * Created by le.bach.tung on 15-Jun-17.
 */
var user_send = {
    'message_user_text' : "001",
    'message_user_payload' : "003",
    'message_user_attachment' : "004"
};

/**FILE UPLOAD flow
 * 1. validate require for: input file_name_origin
 * 2. validate type and size (if select new file): input file
 * 3. g_file_upload_type_list: save file input name with type that list. This variable send to validation_message function for validate file type input
 * 4. if not select new file and exist input value file_name_origin and file_path => get value and set answer
 */

/**CAPTCHA flow:
 * 1: createChatMessage function: config captcha inputs set in g_captcha_config_list variable
 * 2: nextMessage function: call verifyCaptchaMessageBox function to verify all captcha in a .msg_group.
     *Send data to efo_user_send_captcha event.
     *List captcha input set in g_captcha_process_list variable
 * 3: efo_bot_send_captcha event: return verify captcha.
     * If true:
     * 3.1: disable captcha input
     * 3.2: remove captcha input name in g_captcha_process_list
     * 3.3: set class "verify" for captcha img to reset img if update message (resetCaptchaInput function)
     * 3.4 call next message function if g_captcha_process_list is empty
 **/

$(function () {
    // Globe variable
    $.fn.fileinputLocales = {};
    var userAgent = window.navigator.userAgent;

    //list style
    var g_style_color_list = {
        '001': '0084FF',
        '002': '44bec7',
        '003': 'FFCC00',
        '004': 'FA3C4C',
        '005': 'C77DA8',
        '006': '58B240',
        '007': 'FA7117',
        '008': 'CB6D6D',
        '009': '7E63CD',
        '010': '588CBF',
        '011': '12C3EB',
        '012': '8BA16B',
        '013': '7D573F',
        '014': 'F4579A',
        '015': '8B819E',
        '016': '262525',
        '017': '040980',
    };
    var g_style_name_list = {
        '001': 'blue',
        '002': 'turquoise',
        '003': 'yellow',
        '004': 'red',
        '005': 'palepurple',
        '006': 'green',
        '007': 'orange',
        '008': 'azuki',
        '009': 'purple',
        '010': 'navyblue',
        '011': 'skyblue',
        '012': 'khaki',
        '013': 'chocolate',
        '014': 'pink',
        '015': 'grayblue',
        '016': 'black',
        '017': 'darkblue',
    };
    var g_style_code_default = '001';

    //status open, close chatbox
    var g_chatbox_show_status = false;

    /*CLOSE TYPE*/
    //list type animation show chatbox PC version
    var g_chatbox_show_type_list = {
        'upward'    : '001',
        'leftward'  : '002'
    };
    //type default animation show chatbox PC version
    var g_chatbox_show_type = '001';

    /** List close type (minimize type) chatbox
     * g_chatbox_close_list:
     - Gradation_icon (001): PC , Mobile: follow option (icon and title, icon only)
     - Gradation (002): PC: 003, Mobile: 003 (change avatar to image)
     - Monochromatic (003): PC: 004, Mobile: 004 (hange avatar to image + not gradation)
     * */
    var g_chatbox_close_list = {
        //title, avatar and gradation
        'gradation_icon': '001',
        //title and gradation
        'gradation': '002',
        //only title
        'monochromatic': '003'
    };
    //Gradation icon close list type
    var g_chatbox_close_gradation_icon_list = {
        //title and avatar
        'icon_title': '001',
        //only avatar
        'icon_only': '002'
    };
    //list class for close type (minimize type) chatbox
    var g_chatbox_close_class_list = {
        //avatar and title
        '001'  : 'close_type_001',
        //only avatar
        '002'  : 'close_type_002',
        //only title and gradation
        '003'  : 'close_type_003',
        //only title and no gradation
        '004'  : 'close_type_004',
    };
    /*END CLOSE TYPE*/


    //time set to cookie
    var g_time_short = 1; //1 day
    var g_new_conversation_flg;
    var g_end_conversation_flg = false;
    var g_bot_name = '';
    var g_language = 'en';
    //template html require for message
    var g_required_text = '<span class="required">※Required</span>';

    //cookie variable
    var g_cookie_support = cookieSupport();
    var g_is_safari = false;
    var g_cookie_time_update = 20 * 60; //20 minutes
    var g_cookie_time_flg = undefined;
    var g_reset_cookie_time_flg = true;

    //change title variable
    var g_original_title = document.title;
    var g_new_msg_title = 'Bot say...';
    var g_new_msg_flg = false;
    var g_mobile_flg = false;

    var g_connect_page_id = undefined;
    var g_user_id = undefined;

    //attach to url in iframe simple to clear all cookie of efo before load and can access conversation
    var g_refresh_log_flg = getParam('refresh_log_flg');
    //check to save log, if is preview then not save
    var g_preview_flg = getParam('preview_flg');

    /*Force call event efo_client_get_log for show conversation in iframe in client not include js client file
    * 1: force load log, not use controller.js file in client => not postMessage to client and not using check close open chatbox
    * */
    var g_force_log_flg = getParam('force_log_flg');

    //name cookie for session conversation
    var g_cookie_connect_page_id_name = 'wc_connect_page_id';
    var g_cookie_user_id_name = 'wc_user_id';

    if(g_preview_flg && g_refresh_log_flg) {
        g_cookie_connect_page_id_name = 'wc2_connect_page_id';
        g_cookie_user_id_name = 'wc2_user_id';

    } else if(g_preview_flg) {
        g_cookie_connect_page_id_name = 'wc1_connect_page_id';
        g_cookie_user_id_name = 'wc1_user_id';
    }

    var g_is_join_room = false;
    //question count
    var g_question_count = 0;

    //check to show avatar at first message in seamless messages
    var g_avatar_show_type = null; //1: user, 2: bot

    //check to next message. Except error double click to next
    var g_next_mesage_flg = true;
    //if edit message then value is true. Next message call again will check value this variable
    var g_question_edit_flg = false;
    //contain log_message_id list require
    var g_block_message_require_list = [];

    var g_cms_server_url = '';
    //azuze storage node js url
    var g_embed_azure_storage_url = '/';

    var g_sender_type = {
        'user': 1,
        'bot' : 2
    };
    var g_message_bot_type = {
        'text'  : '001',
        'file'  : '002',
        'mail'  : '003',
        'scenario_connect' : '004',
    };

    var g_message_user_type = {
        'text'          : '001',
        'input'         : '002',
        'textarea'      : '003',
        'radio'         : '004',
        'checkbox'      : '005',
        'pulldown'      : '006',
        'postal_code'   : '007',
        'file'          : '008',
        'calendar'      : '009',
        'terms_of_use'  : '010',
        'confirmation'  : '011',
        'carousel'      : '012',
        'card_payment'  : '013',
        'captcha'       : '014',
        'add_to_cart'   : '015',
        'request_document' : '016',
    };
    //Textarea type.
    //Textarea type: read only, input
    var g_textarea_type = {
        'input'     : '001',
        'readonly'  : '002'
    };
    //Input type.
    var g_input_type = {
        'text'  : '001',
        'url'   : '002',
        'email' : '003',
        'tel'   : '004',
        'password' : '005',
        'email_confirm' : '006',
        'password_confirm' : '007'
    };
    //Pulldown type
    var g_input_tel_type = {
        'no_hyphen' : '001',
        'hyphen'    : '002'
    };
    //Input: validation
    var g_input_validation_type = {
        'only_alpha'            : '001',
        'alpha_dash'            : '002',
        'alpha_num'             : '003',
        'higarana_full_width'   : '004',
        'katakana_full_width'   : '005',
        'zenkaku_full_width'    : '006'
    };
    // term of use
    var g_term_of_use_type = {
        'detail_content'  : '001',
        'only_link' : '002'
    };
    //Pulldown type
    var g_pulldown_type = {
        'customize' : '001',
        'time'      : '002',
        'date'      : '003',
        'date_time' : '004',
        'brithday'  : '005',
        'period_of_time' : '006',
        'period_of_day'  : '007',
        'the_provinces_of_japan' : '008',
        'month_date'     : '009',
        'birthday_y_m'   : '010',
        'towns_and_villages' : '100'
    };
    //Radio type
    var g_radio_type = {
        'default' : '001',
        'image_radio' : '002'
    };
    //Calendar type
    var g_calendar_type = {
        'select'    : '001',
        'embed'     : '002',
        'period_of_time' : '003'
    };
    var g_calendar_format = 'DD/MM/YYYY';
    //Card payment type
    var g_credit_card_type = {
        '001' : 'visa',
        '002' : 'jcb',
        '003' : 'master_card',
        '004' : 'american_express',
        '005' : 'diner_club',
        '006' : 'discover'
    };
    //File upload: array for validate: format: file input name => allow file type upload
    var g_file_upload_type_list = [];
    //File upload: url azuze, value set from server
    var g_azure_storage_upload_url = null;
    //Captcha url request
    var g_captcha_url_request = '';
    //Capcha type
    var g_captcha_type = {
        'only_numbers'  : '001',
        'letters_and_numbers' : '002',
        'only_letters'  : '003'
    };
    //Capcha: array for config each captcha item: format: file input name => config array
    var g_captcha_config_list = [];
    //Capcha: array captcha item name in processing to verify
    var g_captcha_process_list = [];

    //save postal code response from server
    var g_postal_code = null;

    //Scenario type list
    var g_scenario_type_list = {
        'add_to_cart': '001',
        'request_document': '002',
        'other': '100'
    };
    //Scenario type default
    var g_scenario_type = '100';

    //Product cart: list key option product
    var g_cart_option_list = {
        id      : 'id',
        name    : 'name',
        sub_name: 'sub_name',
        url     : 'url',
        image   : 'image',
        category: 'category',
        quantity : 'amount',
        price   : 'unit_price',
        currency: 'currency'
    };
    //Product cart list
    var g_cart_product_list = [];
    //Product cart document type list
    var g_cart_document_type_list = {
        'all': '001',
        'title_sub_title': '002',
        'title': '003'
    };
    var g_cart_header_document_type = null;


    //check enable, disable change event when input checked by code
    var g_icheck_change_event_flg = true;

    //validate class
    var g_validate_types = {
        validate_require    : "validate-require",
        validate_url        : "validate-url",
        validate_url_secure : "validate-url-secure",
        validate_max        : "validate-max",
        validate_min        : "validate-min",
        validate_phone      : "validate-phone",
        validate_white_list : "validate-white-list",
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

    //save CV setting from CMS to call analytic when conversation is end
    var g_cv_setting = {};

    var main_js_elm = $('#efo_js_main');
    var g_version = getParam('v', main_js_elm.attr('src'));
    var socket_server_url = main_js_elm.attr('data-socket-url');

    const socket = io(socket_server_url);
    socket.on('connect', function () {
        //get data from client site
        //webchat in iframe
        // if (window != window.parent) {
        if (window.addEventListener) {
            window.addEventListener("message", receiveEventClient, false);
        }
        if(g_cookie_support){
            //webchat not in iframe
            receiveEventClient();
        }
        //if (!g_cookie_support) {
        //    if (window.addEventListener) {
        //        window.addEventListener("message", receiveEventClient, false);
        //    }
        //} else {
        //    //webchat not in iframe
        //    receiveEventClient();
        //}
    });

    socket.on('efo_bot_send_message', function (msg) {
        // console.log('new msg', msg);
        if(msg.user_id == g_user_id) {
            //set question count to global variable
            if (!isEmpty(msg) && !isEmpty(msg['question_count'])) {
                g_question_count = msg['question_count'];
            }

            createChatMessage(msg, true);
            //set notification new message to title of client site
            changeTitle(true);

            var message_type = (typeof msg.type !== "undefined") ? msg.type : -1;
            scrollBottom(message_type);
        }
    });
    socket.on('efo_other_user_send_message', function (data) {

    });

    socket.on('efo_other_user_start', function () {

    });

    socket.on('efo_status_join', function (msg) {
        //set value for server_url global variable
        if(!isEmpty(msg.server_url)) {
            g_cms_server_url = msg.server_url;
        }
        //set value for azure_storage_upload_url global variable
        if(!isEmpty(msg.azure_storage_upload_url)) {
            g_azure_storage_upload_url = msg.azure_storage_upload_url;
        }
        //set value for g_captcha_url_request global variable
        if(!isEmpty(msg.app_url)) {
            g_captcha_url_request = msg.app_url + '/captcha';
        }
        //set url azure storage node js for global variable
        if(!isEmpty(msg.embed_azure_storage_url)) {
            g_embed_azure_storage_url = msg.embed_azure_storage_url;
        }
        //set cv setting global variable
        if(!isEmpty(msg.cv_setting)) {
            g_cv_setting = msg.cv_setting;
        }
        //Product cart: show common message
        if(!isEmpty(msg.cart_error_message)) {
            createNotify(msg.cart_error_message, $('#botchan-chat .cart_error_common_box'), 'not_remove', false, false);
        }

        if (msg.status) {
            g_bot_name = msg.page_name;
            resetCookieTime();
        } else {
            if(msg.limit_user_chat){
                if((window == window.parent) && msg.limit_user_msg){
                    $('#wc-message-groups').html(msg.limit_user_msg);
                }
                var post_message_data = {
                    limit_user_chat: true
                };
                postMessageToClient(post_message_data);
            } else {
                $('#botchan-chat').find('#wc-message-groups').remove();
                $('.wc_error_global').show();
            }
        }
        applySetting(msg);
    });

    socket.on('efo_bot_newconversation', function (msg) {

        console.log(userAgent);
        var parser = new UAParser();
        parser.setUA(userAgent);
        var result = parser.getResult();
        var userLang = navigator.language || navigator.userLanguage;

        var data_user_conversation = {
            data: msg, userAgent: result,
            userLang: userLang,
        };
        if(!isEmpty(g_preview_flg)) {
            data_user_conversation.preview_flg = g_preview_flg;
        }
        socketIOEmit('efo_user_conversation', data_user_conversation);
    });

    socket.on('efo_server_send_log', function (msg) {
        // console.log('get history', msg);
        if(msg.user_id == g_user_id) {
            if (msg.message != void 0 && msg.message.constructor == Array && msg.message.length > 0) {
                setMessagesHistory(msg.message);
            }
            //get product cart and set to global variable and view
            if (msg.data_cart != void 0 && msg.data_cart.length > 0) {
                $(msg.data_cart).each(function (i, e) {
                    if(!isEmpty(e.data) && typeof e.data == 'object') {
                        productCartAdd(e.data, false);
                    }
                });
            }

            setTimeout(function () {
                showMessageContainer();
                scrollBottom(g_sender_type['bot']);
            }, 1000);
        }
    });

    //check to clear cookie or continue exist conversation
    socket.on('efo_bot_start', function (msg) {
        //clear all cookie before load if new_flg = 1 and exist param refresh_log_flg = 1 in url iframe
        if((!isEmpty(msg.new_flg) && msg.new_flg) || g_refresh_log_flg){
            initNewConversation();
        } else {
            if(!isEmpty(g_preview_flg)) {
                msg.preview_flg = g_preview_flg;
            }
            socketIOEmit('efo_join', msg);
        }
    });

    //Question number pass. Reduction question count number in process bar
    socket.on('efo_bot_send_question_pass', function (msg) {
        if(!isEmpty(msg.question_pass_count)) {
            g_question_count = g_question_count - parseInt(msg.question_pass_count);
        }
    });

    //reset question count
    socket.on('efo_bot_send_question_count', function (msg) {
        if(!isEmpty(msg.question_count)) {
            g_question_count = msg.question_count;
        }
    });

    //change message for other window: edit, update answer
    socket.on('efo_bot_other_user_answer', function (msg) {
        if(!isEmpty(msg.result) && !isEmpty(msg.result._id)) {
            var log_message_id = msg.result._id;
            //if edit: clear after message
            if(!isEmpty(msg.question_edit_flg) && msg.question_edit_flg) {
                removeAfterMessage(log_message_id);
            }
            //set new answer to msg_group existing in other window
            var message_box = getMessageBox(log_message_id);
            if(!isEmpty(message_box) && !isEmpty(msg.result.message)) {
                var message_item = msg.result.message;
                $(message_box).find('.msg_group').each(function (msg_group_index, msg_group_elm) {
                    if(!isEmpty(message_item[msg_group_index]) && !isEmpty(message_item[msg_group_index].answer)) {
                        setAnswerMessage(msg_group_elm, message_item[msg_group_index].answer);
                    }
                });
                //reinit select2 for show option selected
                message_box.find('select.select2-hidden-accessible').trigger('change.select2');
            }
        }
    });

    //event when conversation is end
    socket.on('efo_bot_send_question_end', function () {
        endConversation();
    });

    //Portal code: get portal code data from server
    socket.on('efo_bot_send_postal', function (msg) {
        if(!isEmpty(msg) && !isEmpty(msg.data.log_message_id)) {
            var message_box = getMessageBox(msg.data.log_message_id),
                postal_code_input = message_box.find('.postalcode_group .postal_code input');

            if(!isEmpty(msg.success)  && msg.success && !isEmpty(msg.data)) {
                g_postal_code = msg;
                setPostalCodeDataToForm(null, msg.data.log_message_id, msg);

                //remove validate postal code result
                postal_code_input.removeClass(g_validate_types.validate_postalcode_invalid);
            } else {
                //add validate postal code result
                postal_code_input.addClass(g_validate_types.validate_postalcode_invalid);
            }
        }
    });

    //Pulldown type: towns_and_villages: get prefecture data from server
    socket.on('efo_bot_send_pref', function (data) {
        var pref_select = $('#wc-message-group-content .pulldown_group .prefecture_city_box .pref_box select').not('.option_flg_done');
        if(pref_select.length && !isEmpty(data) && !isEmpty(data.result)) {
            //remove old option
            pref_select.find('option').not('.first').remove();
            //add new option
            $(data.result).each(function (option_index, option_label) {
                if(!isEmpty(option_label)) {
                    pref_select.append('<option value="' + option_label + '">' + option_label + '</option>');
                }
            });

            //set value if exist in data-value
            $(pref_select).each(function(i, select_elm) {
                if(!isEmpty($(select_elm).attr('data-value'))) {
                    var pref_old_val = $(select_elm).attr('data-value');

                    $(select_elm).val(pref_old_val).trigger('change.select2');
                    $(select_elm).attr('data-value', null);
                }
            });

            //add class option_flg_done for not reset option from after efo_bot_send_pref
            pref_select.addClass('option_flg_done');
        }
    });

    //Pulldown type: towns_and_villages: get city data from server
    socket.on('efo_bot_send_city', function (data) {
        if(!isEmpty(data) && !isEmpty(data.result) && !isEmpty(data.param) && !isEmpty(data.param.pref_city_id)) {
            var pref_city_box = $('#wc-message-group-content .pulldown_group .prefecture_city_box#' + data.param.pref_city_id);
            if(pref_city_box.length && $(pref_city_box).find('.city_box select').length) {
                var city_select = $(pref_city_box).find('.city_box select'),
                    city_old_val = $(city_select).attr('data-value');

                //remove old option
                city_select.find('option').not('.first').remove();
                //add new option
                $(data.result).each(function (option_index, option_label) {
                    if(!isEmpty(option_label)) {
                        city_select.append('<option value="' + option_label + '">' + option_label + '</option>');
                    }
                });

                //set value if exist in data-value
                if(!isEmpty(city_old_val)) {
                    $(city_select).val(city_old_val);
                    $(city_select).attr('data-value', null);
                } else {
                    //select first option
                    city_select.val('');
                }
                city_select.trigger('change.select2');
            }
        }
    });

    //Captcha type: get result check valid captcha from input user
    socket.on('efo_bot_send_captcha', function (data) {
        if(!isEmpty(data)) {
            if(!isEmpty(data.log_message_id) && !isEmpty(data.captcha_name)) {
                var message_box = getMessageBox(data.log_message_id);
                var captcha_input = message_box.find('input[name="' + data.captcha_name + '"]');

                var captcha_group = captcha_input.parents('.captcha_group');
                var captcha_img = captcha_group.find('.captcha_box img');

                if(!isEmpty(data.status) && data.status) {
                    if(g_captcha_process_list.indexOf(data.captcha_name) != -1) {
                        //remove 1 element at position index in array g_captcha_process_list
                        g_captcha_process_list.splice(g_captcha_process_list.indexOf(data.captcha_name), 1);
                    }

                    //disable captcha input
                    if(captcha_input.length) {
                        captcha_input.attr('disabled', 'disabled').addClass('notset');
                    }
                    //add class verify to reset when edit message. Only reset captcha when captcha_img exist verify class
                    captcha_img.addClass('verify');

                    //next message after verify success and all captcha verified
                    if(!g_captcha_process_list.length) {
                        //param 2: false: not check captcha in message group
                        nextMessage(data.log_message_id, false);
                    }
                } else {
                    if(!isEmpty($.fn.fileinputLocales[g_language])) {
                        if(!isEmpty($.fn.fileinputLocales[g_language]['verification_incorrect'])) {
                            var captcha_error_elm = "<label class='error'>" + $.fn.fileinputLocales[g_language]['verification_incorrect'] + "</label>";
                            captcha_group.append(captcha_error_elm);
                        }
                    }
                }
            }
        }
    });

    //show error fog block message
    socket.on('efo_bot_send_message_error', function (msg) {
        if(!isEmpty(msg.message) && !isEmpty(msg.log_message_id)) {
            var msg_group = getMessageBox(msg.log_message_id);
            var error_msg = '';

            if(typeof msg.message == 'object') {
                $(msg.message).each(function (i, e) {
                    error_msg += '- ' + e + '<br/>';
                });
            } else {
                error_msg = msg.message;
            }
            msg_group.find('.chat-body > .error').not('.not_remove').remove();
            createNotify(error_msg, msg_group.find('.chat-body'), null, false, false);
        }
    });

    window.onfocus = function () {
        if(g_new_msg_flg) {
            changeTitle(false);
        }
    };

    //press enter when focus in input.
    // If exist next input, textarea then focus to it.
    // and not exist next message -> next message
    $(document).on('keypress', 'input', function (e) {
        var log_message_id = $(this).parents('.chat-body').attr('data-message_id');
        if (!isMobile() && e.which == 13) {
            var message_box = getMessageBox(log_message_id);

            //focus next input
            var message_box_input_list = message_box.find('input, textarea').not('[readonly], .disabled, .hide, .hidden, .icheck');
            var current_input_index = $(message_box_input_list).index($(this));

            if(message_box_input_list.length && current_input_index < (message_box_input_list.length - 1)) {
                message_box_input_list.eq(current_input_index + 1).focus();

            } else {
                //check is last message
                var msg_group_index = message_box.find('.msg_group');
                var current_msg_group_index = msg_group_index.index($(this).parents('.msg_group'));
                if(current_msg_group_index >= (msg_group_index.length - 1)) {
                    //next message
                    //call blur for not focus for next button not enable
                    $(this).trigger('blur');
                    nextMessage(log_message_id, true);
                }
            }
        }
    });

    //set not focus for input, textarea is readonly in IOS
    $(document).on('focus', 'input[readonly], textarea[readonly]', function(e) {
        if(!$(this).parents('.calendar_group').length) {
            $(this).trigger('blur');
        }
    });

    //disable event scroll with type number input
    $(document).on("wheel", "input[type=number]", function (e) {
        $(this).blur();
    });

    //close, open chat when click to header
    $(document).on('click', '.chatview-container .chat-header', function (e) {
        var action_flg = true;
        if(($(e.target).hasClass('header_cart_box') || $(e.target).parents('.header_cart_box').length) && g_chatbox_show_status) {
            action_flg = false;
        }

        if(action_flg) {
            var post_message_data = {
                'chat_box_open_close': true
            };
            postMessageToClient(post_message_data);
        }
    });

    //close, open preview cart
    $(document).on('click', '.chat-header .header_cart_box:not(.disabled)', function(e) {
        productCartPreviewShow();
    });

    //check common when click to any elemenr in chatbox
    $(document).on('click touchstart', function(e) {
        //hide cart header if it is show
        if($('#botchan-chat .cart_preview_box').css('display') == 'block') {
            //$(e.target).parents('body') to check if remove item cart -> elm remove not exist
            if($(e.target).parents('body').length && !$(e.target).parents('.cart_preview_box').length && !$(e.target).parents('.chat-header').length) {
                productCartPreviewShow(false);
            }
        }
    });

    //Next Mesage event: Checkbox, radio
    $(document).on('click', '#wc-message-group-content .next_message button:not(.disabled)', function (e) {
        var log_message_id = $(e.target).parents('.chat-body').attr('data-message_id');
        var next_message = nextMessage(log_message_id, true);
        if(next_message) {
            removeNextMessageAloneGroup(log_message_id);
        }
    });
    //Next Mesage event: radio if exist class: is_next_message
    $(document).on('ifChecked', '#wc-message-group-content .chat-right .radio_group.is_next_message .option_input', function (e) {
        var log_message_id = $(e.target).parents('.chat-body').attr('data-message_id');
        var next_message = nextMessage(log_message_id, true);
        if(next_message) {
            removeNextMessageAloneGroup(log_message_id);
        }
    });

    //Active option: Radio, checkbox: set active for item when select
    $(document).on('ifChecked', '#wc-message-group-content .chat-right .radio_group .option_input', function (e) {
        // var log_message_id = $(e.target).parents('.chat-body').attr('data-message_id');

        activeOptionSelected($(e.target));
    });
    $(document).on('ifChanged', '#wc-message-group-content .chat-right .checkbox_group .option_input', function (e) {
        // var log_message_id = $(e.target).parents('.chat-body').attr('data-message_id');

        activeOptionSelected($(e.target));
    });

    //Enable Next Mesage event: input, change input, dp.change: datetimepicker change
    $(document).on('input change dp.change', '#wc-message-group-content .chat-right input, ' +
        '#wc-message-group-content .chat-right textarea, ' +
        '#wc-message-group-content .chat-right select', function (e) {

        var log_message_id = $(e.target).parents('.chat-body').attr('data-message_id');
        //enable next button when change option, value
        enableNextMessageButton(log_message_id);
    });

    //Input
    //input tel hyphen value is not null and not require-> add require validate for other input in input form
    $(document).on('input change', '#wc-message-group-content .input_group .tel_hyphen_box input', function (e) {
        var inputr_val = $(this).val();
        var input_frm = $(this).parents('.input_group');
        if(!$(this).hasClass(g_validate_types.validate_require)) {
            if(isEmpty(inputr_val)) {
                input_frm.find('.tel_hyphen_box input').removeClass(g_validate_types.validate_require);
            } else {
                input_frm.find('.tel_hyphen_box input').addClass(g_validate_types.validate_require);
            }
        }
    });
    //Postal code: get data in server from postal code
    $(document).on('input', '#wc-message-group-content .chat-right .postalcode_group .postal_code input', function (e) {
        var log_message_id = $(this).parents('.chat-body').data('message_id');
        var postalcode_val = $(this).val();

        if(!isEmpty(postalcode_val) && !isEmpty(log_message_id)) {
            postalcode_val = postalcode_val.replace(/-/g, '');
            if(postalcode_val.length >= 7) {
                var portal_data = {
                    'zipcode' : postalcode_val,
                    'log_message_id' : log_message_id
                };
                //efo_bot_send_postal socket IO will response
                socketIOEmit('efo_user_send_postal', portal_data);
            }
        }
    });

    //Pulldown: set day follow year, month
    $(document).on('change', '#wc-message-group-content .pulldown_group .select_year_box, #wc-message-group-content .pulldown_group .select_month_box', function (e) {
        //not apply with month_date type
        if(!$(this).parents('.month_date_box').length) {
            var select_box = $(this).parents('.select_box');
            if(!isEmpty(select_box)) {
                getDayinMonth(select_box);
            }
        }
    });
    //Pulldown: add validate_require for all select if msg_group is not require and any select selected
    $(document).on('change change.select2', '#wc-message-group-content .pulldown_group select', function (e) {
        if(!$(this).parents('.pulldown_container').hasClass(g_validate_types.validate_require) && $(this).parents('.pulldown_container').find('select').length > 1) {
            var select_empty = true;
            $(this).parents('.pulldown_container').find('select').each(function(select_index, select_elm) {
                if(!isEmpty($(select_elm).val())) {
                    select_empty = false;
                }
            });
            if(select_empty) {
                $(this).parents('.pulldown_container').find('select').removeClass(g_validate_types.validate_require);
            } else {
                $(this).parents('.pulldown_container').find('select').addClass(g_validate_types.validate_require);
            }
        }
    });
    //Pulldown: towns_and_villages pulldown type: get city data in server from prefecture
    $(document).on('change change.select2', '#wc-message-group-content .pulldown_group .pref_box select', function (e) {
        var pref_val = $(this).val();
        var pref_city_box_id = $(this).parents('.prefecture_city_box').attr('id');
        var city_select = $(this).parents('.prefecture_city_box').find('.city_box select.content');

        if(!isEmpty(pref_val)) {
            //efo_bot_send_city socket IO will response
            socketIOEmit('efo_user_send_city', {
                'pref' : pref_val,
                'pref_city_id' : pref_city_box_id,
            });
        } else {
            //if select empty then remove all city option and select first option
            city_select.find('option').not('.first').remove();
            city_select.val('').trigger('change.select2');
        }
    });

    //Carousel: select carousel item
    $(document).on('click', '#wc-message-group-content .carousel_group button.carousel_select:not(.disabled)', function (e) {
        var log_message_id = $(e.target).parents('.chat-body').attr('data-message_id');
        var carousel_container = $(this).parents('.carousel_container');
        carousel_container.find('.carousel_item').removeClass('active');
        if(carousel_container.length) {
            $(this).parents('.carousel_item').addClass('active');
        }
        enableNextMessageButton(log_message_id);
    });

    //Carousel: carousel item if exist class: is_next_message
    $(document).on('click', '#wc-message-group-content .carousel_group.is_next_message button.carousel_select:not(.disabled)', function (e) {
        var log_message_id = $(e.target).parents('.chat-body').attr('data-message_id');
        var next_message = nextMessage(log_message_id, true);
        if(next_message) {
            removeNextMessageAloneGroup(log_message_id);
        }
    });

    //Card payment: select card type
    $(document).on('click', '.chat-right .chat-body .card_payment_group .card_type_box .card_type_item', function(e) {
        var card_type = $(this).attr('data-card_type');
        $('.chat-right .chat-body .card_payment_group .card_type_box .card_type_item img').removeClass('active');
        $(this).find('img').addClass('active');
        //set sttribute card_type for card number
        $(this).parents('.msg_group').find('.card_number_box input.content').attr('data-card_type', card_type);
    });
    //Card payment: format card number
    $(document).on('input change', '#wc-message-group-content .card_payment_group .card_number_box input', function (e) {
        var card_number_val = $(this).val();
        if(!isEmpty(card_number_val)) {
            $(this).val(card_number_format($(this).val()));
        }
    });
    //Card payment: add validate_require for all input if card number not null
    $(document).on('input change', '#wc-message-group-content .card_payment_group input, #wc-message-group-content .card_payment_group select', function (e) {
        var card_frm = $(this).parents('.card_payment_group');
        if(!card_frm.find('.card_number_box input').hasClass(card_frm.validate_require)) {
            var card_number_val = card_frm.find('.card_number_box input').val();
            if(isEmpty(card_number_val)) {
                card_frm.find('.card_holder_box input, .card_date_box select, .card_code_box input').removeClass(g_validate_types.validate_require);
            } else {
                card_frm.find('.card_holder_box input, .card_date_box select, .card_code_box input').addClass(g_validate_types.validate_require);
            }
        }
    });
    //Card payment: only input max 4 number for card security
    $(document).on('input change', '#wc-message-group-content .card_payment_group .card_code_box input', function (e) {
        if(!isEmpty($(this).val())) {
            var number = $(this).val().replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            var val_new = number.match(/\d{1,4}/g);
            $(this).val((val_new && val_new[0] || ''));
        }
    });

    //File Upload
    $(document).on('click', '.chat-right .chat-body .upload_group button.file_select_btn:not(.disabled)', function (e) {
        $(this).parents('.msg_group').find('input.file_input').click();
    });
    //File Upload: get file name and set to title
    $(document).on('change', '.chat-right .chat-body .upload_group input.file_input', function (e) {
        if(!isEmpty($(this).val()) && $(this)[0].files[0]) {
            var file_data = $(this)[0].files[0],
                file_name = file_data.name;
            $(this).parents('.msg_group').find('.title a').html(file_name);
            $(this).parents('.msg_group').find('input.file_name_origin').val(file_name);
            $(this).parents('.msg_group').find('input.file_path').val('');
        } else {
            //clear data if not select file
            $(this).parents('.msg_group').find('.title a').html('');
            $(this).parents('.msg_group').find('input.file_name_origin, input.file_path').val('');
            $(this).parents('.msg_group').find('.error').not('.not_remove').remove();
        }
        //select new file => remove href when click to file name label
        $(this).parents('.msg_group').find('.title a').attr('href', null);
    });

    //Calendar
    //Calendar: add validate_require for all input if msg_group is not require and any input has value
    $(document).on('input change dp.change', '#wc-message-group-content .calendar_group .calendar_period input', function (e) {
        if(!$(this).parents('.calendar_container').hasClass(g_validate_types.validate_require)) {
            var calendar_empty = true;
            $(this).parents('.calendar_container').find('input.content').each(function(i, e) {
                if(!isEmpty($(e).val())) {
                    calendar_empty = false;
                }
            });
            if(calendar_empty) {
                $(this).parents('.calendar_container').find('input.content').removeClass(g_validate_types.validate_require);
            } else {
                $(this).parents('.calendar_container').find('input.content').addClass(g_validate_types.validate_require);
            }
        }
    });
    //Calendar: focus calendar input when click to icon right
    $(document).on('click', '.input-group-addon', function (e) {
        if($(this).parents('.input_content').find('input.content').length) {
            $(this).parents('.input_content').find('input.content').first().focus();
        }
    });
    //Calendar: change z-index of message box for show calendar select type above
    $(document).on('dp.show', '#wc-message-group-content .calendar_group .calendar_select input, #wc-message-group-content .calendar_group .calendar_period input', function (e) {
        $(this).parents('.chat-right').css('z-index', 2);
    });
    $(document).on('dp.hide', '#wc-message-group-content .calendar_group .calendar_select input, #wc-message-group-content .calendar_group .calendar_period input', function (e) {
        $(this).parents('.chat-right').css('z-index', 1);
    });
    //Calendar: disable event click to header calendar
    $(document).on('dp.show', '#wc-message-group-content .calendar_group input', function (e) {
        $(this).parent().find('.picker-switch')
            .removeAttr('title')
            .on('click', function (e) {
                e.stopPropagation();
            });
    });

    //Product Cart
    //Product Cart: remove procuct
    $(document).on('click', '.chatview-container .cart_item .product_remove_box', function(e) {
        var product_code = $(this).parents('.cart_item').attr('data-product_code');
        productCartRemove(product_code);

        //re-focus preview cart after remove an item
        if($(this).parents('.cart_preview_box').length) {
            $(this).parents('.cart_preview_box').focus();
        }

    });
    //Product Cart: update quantity procuct
    $(document).on('change', '.chatview-container .cart_item .product_quantity_box input', function(e) {
        var cart_item = $(this).parents('.cart_item');
        var product_code = cart_item.attr('data-product_code');
        var quantity_val = $(this).val();

        if(!isEmpty(product_code)) {
            //set quantity 1 if quantity is empty or not number
            if(isEmpty(quantity_val) || isNaN(quantity_val) || parseInt(quantity_val) <= 0) {
                $(this).val(1);
            } else {
                $(this).val(Math.round(quantity_val));
            }
            var quantity_val_new = parseInt($(this).val());
            if(quantity_val_new > 0) {
                var data_update = {};
                data_update[g_cart_option_list.quantity] = quantity_val_new;
                productCartUpdate(product_code, data_update);
            }
        }
    });

    $(document).on('click', '.number_input_box .incr-btn button', function (e) {
        var input_elm = $(this).parents('.number_input_box').find('input.content'),
            old_val = input_elm.val(),
            min_val = !isEmpty(input_elm.attr('min')) ? input_elm.attr('min') : 0,
            new_val = 1;

        if ($(this).data('action') == 'increase') {
            new_val = parseInt(old_val) + 1;
        } else {
            //Don't allow decrementing below 1
            if (old_val > min_val) {
                new_val = parseInt(old_val) - 1;
            }
        }
        input_elm.val(new_val);

        //update cart
        if(new_val > 0 && $(this).parents('.cart_item').length) {
            var cart_item = $(this).parents('.cart_item');
            var product_code = cart_item.attr('data-product_code');
            if(!isEmpty(product_code)) {
                var data_update = {};
                data_update[g_cart_option_list.quantity] = new_val;
                productCartUpdate(product_code, data_update);
            }
        }

        e.preventDefault();
    });

    function receiveEventClient(event){
        if(event != void 0 && event.data != void 0) {
            if (event.data.maximize_flg){
                var data_get_log = {
                    user_id: g_user_id,
                    connect_page_id: g_connect_page_id
                };
                socketIOEmit('efo_client_get_log', data_get_log);
                return;
            } else if(event.data.new_conversation_flg){
                initNewConversation();

            } else if(!isEmpty(event.data.chatbox_show_status)){
                if(event.data.chatbox_show_status) {
                    g_chatbox_show_status = true;
                } else {
                    g_chatbox_show_status = false;
                }
                //upward show type: add, remove class .wc-close in in body
                if(isMobile() || g_chatbox_show_type != g_chatbox_show_type_list.leftward) {
                    //check chatbox close or open
                    chatboxShowHideClass(g_chatbox_show_status);
                }

            } else if(event.data.cart_action != void 0) {
                var cart_action = event.data.cart_action;
                if(cart_action.action_name != void 0 && cart_action.action_data != void 0) {
                    var action_data = cart_action.action_data;

                    switch (cart_action.action_name) {
                        case 'add': {
                            productCartAdd(action_data);
                        }
                            break;
                        case 'remove': {
                            productCartRemove(action_data[g_cart_option_list.id]);
                        }
                            break;
                        case 'update': {
                            productCartUpdate(action_data[g_cart_option_list.id], action_data);
                        }
                            break;
                    }
                }
            }
        }
        if(g_is_join_room) return;

        //if exist user variable in param then use it
        var param_connect_page_id = getParam('connect_page_id'),
            param_user_id = getParam('user_id');

        if(param_connect_page_id && param_user_id) {
            var cookie_data = {};
            cookie_data[g_cookie_connect_page_id_name] = param_connect_page_id;
            cookie_data[g_cookie_user_id_name] = param_user_id;

            setCookieValue(cookie_data);
        }
        if(g_cookie_support) {
            g_user_id = getCookie(g_cookie_user_id_name + '_' + param_connect_page_id);
            g_connect_page_id = getCookie(g_cookie_connect_page_id_name + '_' + param_connect_page_id);

        } else if (event != void 0 && event.data != void 0 && event.data.cookie != void 0) {
            var cookies = event.data.cookie;
            if (cookies['is_mobile'] != void 0) {
                g_mobile_flg = cookies['is_mobile'];
            }
            if (cookies[g_cookie_user_id_name + '_' + param_connect_page_id] != void 0) {
                g_user_id = cookies[g_cookie_user_id_name + '_' + param_connect_page_id];
            }
            if (cookies[g_cookie_connect_page_id_name + '_' + param_connect_page_id] != void 0) {
                g_connect_page_id = cookies[g_cookie_connect_page_id_name + '_' + param_connect_page_id];
            }
        }
        checkConnectPageid();
        g_is_join_room = true;
    }

    function setMessagesHistory(data) {
        clearChatMessage();
        var cnt = 1;
        $(data).each(function (index, message) {
            var isAnimation = false;
            if(index >= data.length - 2){
                isAnimation = true;
                setTimeout(function () {
                    createChatMessage(message, isAnimation);
                }, 1000 * cnt);
                cnt++;
            }else{
                createChatMessage(message, isAnimation);
            }
        });

        //set notification new message to title of client site
        //changeTitle(true);
        //scrollBottom(g_sender_type['bot']);
    }

    // creat view chat for user
    function createChatMessage(data, isAnimation) {
        if(data != void 0) {
            var break_msg = false;
            //create message element
            var add_next_button = false;
            var log_message_id = data['_id'];

            //check exist data and not exist this message width data-message_id=log_message_id before that
            if(!isEmpty(data['message']) && !isEmpty(data['type']) && !$('#wc-message-group-content .chat-body[data-message_id="' + log_message_id + '"]').length) {
                var message_radio_num = 0,
                    message_checkbox_num = 0,
                    message_terms_use_num = 0,
                    message_towns_and_villages_num = 0,
                    message_file_upload_num = 0,
                    message_captcha_num = 0;

                //add log_message_id to check require 1 message
                if(!isEmpty(data.input_requiment_flg) && data.input_requiment_flg) {
                    g_block_message_require_list.push(log_message_id);
                }

                //check type and add message box
                var template_message =  $('.template_message');
                var clone;
                if (data['type'] == g_sender_type['bot']) {
                    clone = template_message.find('.chat-left').clone();
                    //show, hide avatar
                    clone.find('.chat-avatar').css('opacity', showHideAvatar(g_sender_type['bot']) ? 1 : 0);

                    //add message group to clone
                    $(data['message']).each(function (msg_index, msg_group) {
                        // console.log(msg_group);
                        $(msg_group).each(function (msg_item_index, msg_item) {
                            var msg_item_type = msg_item['type'];
                            var msg_group_clone;
                            switch (msg_item_type) {
                                case g_message_bot_type['text']: {
                                    if(!isEmpty(msg_item['content'])) {
                                        msg_group_clone = template_message.find('.message_type p.text_group').clone();
                                        msg_group_clone.html(strip(msg_item['content']));
                                    } else {
                                        break_msg = true;
                                        return;
                                    }
                                }
                                break;
                                case g_message_bot_type['file']: {
                                    if(!isEmpty(msg_item['file_type']) && !isEmpty(msg_item['url'])) {
                                        if(msg_item['file_type'] == 'image') {
                                            msg_group_clone = template_message.find('.message_type .image_group').clone();
                                            msg_group_clone.find('img').attr('src', msg_item['url']);

                                        } else if(msg_item['file_type'] == 'video') {
                                            msg_group_clone = template_message.find('.message_type .video_group').clone();
                                            msg_group_clone.find('video').attr('src', msg_item['url']);

                                        } else if(msg_item['file_type'] == 'file') {
                                            msg_group_clone = template_message.find('.message_type .document_group').clone();
                                            msg_group_clone.find('a').attr('href', msg_item['url']);
                                        }
                                    }
                                }
                                break;
                            }

                            if(msg_group_clone) {
                                //set message type for .msg_group
                                msg_group_clone.attr('data-message_type', msg_item_type);
                                clone.find('.chat-body').append(msg_group_clone);
                            }
                        });
                    });
                } else {
                    add_next_button = true;
                    clone = template_message.find('.chat-right').clone();
                    //show, hide avatar
                    clone.find('.chat-avatar').css('opacity', showHideAvatar(g_sender_type['user']) ? 1 : 0);

                    //add message group to clone
                    $(data['message']).each(function (msg_index, msg_group) {
                        // console.log(msg_group);
                        $(msg_group).each(function (msg_item_index, msg_item) {
                            var msg_item_type = msg_item['type'];
                            var msg_group_clone;
                            switch (msg_item_type) {
                                case g_message_user_type['text']: {
                                    msg_group_clone =  template_message.find('.message_type div.text_group').clone();
                                    msg_group_clone.find('.option_label').html(msg_item['content']);
                                }
                                    break;
                                case g_message_user_type['input']: {
                                    if(!isEmpty(msg_item['template_type'])) {
                                        msg_group_clone =  template_message.find('.message_type .input_group').clone();
                                        //set input type for .msg_group
                                        msg_group_clone.attr('data-input_type', msg_item['template_type']);

                                        var input_title = msg_group_clone.find('.title');
                                        //show hide and set title
                                        if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                            var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                            input_title.html(title_text);
                                        } else {
                                            input_title.remove();
                                        }

                                        //check number input and add input box
                                        if(!isEmpty(msg_item['list']) && msg_item['list'].length) {
                                            var input_box;
                                            if(msg_item['list'].length <= 1) {
                                                input_box = template_message.find('.message_type .input_template .input_one').clone();

                                            } else if(msg_item['template_type'] == g_input_type['tel'] && msg_item['tel_input_type'] == g_input_tel_type['hyphen']) {
                                                input_box = template_message.find('.message_type .input_template .three_input_one_row').clone();

                                            } else {
                                                if(msg_item['template_type'] != g_input_type['password_confirm'] && msg_item['template_type'] != g_input_type['email_confirm']) {
                                                    input_box = template_message.find('.message_type .input_template .two_input_one_row').clone();

                                                } else {
                                                    input_box = template_message.find('.message_type .input_template .input_two_row').clone();
                                                }

                                            }
                                            msg_group_clone.find('.input_container').append(input_box);

                                            //set require class
                                            if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                                msg_group_clone.find('input').addClass(g_validate_types.validate_require);
                                            }

                                            //set type and value for input
                                            var input_input = msg_group_clone.find('input.content');

                                            switch (msg_item['template_type']) {
                                                case g_input_type['text']: {
                                                    input_input.attr('type', 'text');

                                                    //add validation follow data
                                                    if(!isEmpty(msg_item['validation_type'])) {
                                                        switch (msg_item['validation_type']) {
                                                            case g_input_validation_type['only_alpha']:
                                                                input_input.addClass(g_validate_types.validate_alpha);
                                                                break;
                                                            case g_input_validation_type['alpha_dash']:
                                                                input_input.addClass(g_validate_types.validate_alpha_dash);
                                                                break;
                                                            case g_input_validation_type['alpha_num']:
                                                                input_input.addClass(g_validate_types.validate_alpha_num);
                                                                break;
                                                            case g_input_validation_type['higarana_full_width']:
                                                                input_input.addClass(g_validate_types.validate_hiragana);
                                                                break;
                                                            case g_input_validation_type['katakana_full_width']:
                                                                input_input.addClass(g_validate_types.validate_katakana);
                                                                break;
                                                            case g_input_validation_type['zenkaku_full_width']:
                                                                input_input.addClass(g_validate_types.validate_zenkaku);
                                                                break;
                                                        }
                                                    }
                                                }
                                                    break;
                                                case g_input_type['url']: {
                                                    input_input.attr('type', 'url');
                                                    input_input.addClass(g_validate_types.validate_url);
                                                }
                                                    break;
                                                case g_input_type['email']: {
                                                    input_input.attr('type', 'email');
                                                    input_input.addClass(g_validate_types.validate_email);
                                                }
                                                    break;
                                                case g_input_type['tel']: {
                                                    if(msg_item['tel_input_type'] == g_input_tel_type['hyphen']) {
                                                        input_box.addClass('tel_hyphen_box');
                                                        input_box.addClass(g_validate_types.validate_phone);
                                                    } else {
                                                        input_input.attr('type', 'tel');
                                                        input_input.addClass(g_validate_types.validate_phone);
                                                    }
                                                }
                                                    break;
                                                case g_input_type['password']: {
                                                    input_input.attr('type', 'password');
                                                    input_input.addClass(g_validate_types.validate_alpha_num);
                                                }
                                                    break;
                                                case g_input_type['password_confirm']: {
                                                    msg_group_clone.find('.input_container').addClass('confirm_box');

                                                    input_input.attr('type', 'password');
                                                    input_input.addClass(g_validate_types.validate_alpha_num);

                                                    //add class to confirm
                                                    input_input.first().addClass('password');
                                                    input_input.last().addClass(g_validate_types.validate_confirm);
                                                }
                                                    break;
                                                case g_input_type['email_confirm']: {
                                                    msg_group_clone.find('.input_container').addClass('confirm_box');

                                                    input_input.attr('type', 'email');
                                                    input_input.addClass(g_validate_types.validate_email);

                                                    //add class to confirm
                                                    input_input.first().addClass('email');
                                                    input_input.last().addClass(g_validate_types.validate_confirm);
                                                }
                                                    break;
                                            }

                                            //add validate max, min
                                            if(!isEmpty(msg_item['max_length']) || !isEmpty(msg_item['min_length'])) {
                                                var input_validate_length = input_input;
                                                //Password confirm: only set max, min for first input
                                                if(msg_item['template_type'] == g_input_type['password_confirm']) {
                                                    input_validate_length = input_input.first();
                                                }
                                                if(!isEmpty(msg_item['max_length'])) {
                                                    input_validate_length.addClass(g_validate_types.validate_max + ' maximum-length-' + msg_item['max_length']);
                                                }
                                                if(!isEmpty(msg_item['min_length'])) {
                                                    input_validate_length.addClass(g_validate_types.validate_min + ' minimum-length-' + msg_item['min_length']);
                                                }
                                            }

                                            //set place holder for each input
                                            $(msg_item['list']).each(function(i, e) {
                                                if(!isEmpty(e['placeholder']) && !isEmpty(input_input.eq(i))) {
                                                    input_input.eq(i).attr('placeholder', e['placeholder']);
                                                }
                                            });
                                        }
                                    } else {
                                        break_msg = true;
                                        return;
                                    }
                                }
                                    break;
                                case g_message_user_type['textarea']: {
                                    msg_group_clone =  template_message.find('.message_type .textarea_group').clone();

                                    var textarea_title = msg_group_clone.find('.title');
                                    var textarea_input = msg_group_clone.find('textarea.content');

                                    //set require class
                                    if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                        textarea_input.addClass(g_validate_types.validate_require);
                                    }

                                    //show hide and set title
                                    if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                        var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                        textarea_title.html(title_text);
                                    } else {
                                        textarea_title.remove();
                                    }

                                    //set type for textarea input and value
                                    //if is readonly then set value is placeholder
                                    if(isEmpty(msg_item['template_type']) || msg_item['template_type'] == g_textarea_type['readonly']) {
                                        msg_group_clone.find('.textarea_content').addClass('readonly');
                                        textarea_input.addClass('readonly');
                                        textarea_input.attr('readonly', 'readonly');
                                        if(!isEmpty(msg_item['placeholder'])) {
                                            textarea_input.val(msg_item['placeholder']);
                                        }
                                    } else {
                                        //if is input then set placeholder is placeholder
                                        if(!isEmpty(msg_item['placeholder'])) {
                                            textarea_input.attr('placeholder', msg_item['placeholder']);
                                        }
                                    }
                                }
                                    break;
                                case g_message_user_type['radio']: {
                                    msg_group_clone = template_message.find('.message_type .radio_group').clone();
                                    //set title
                                    var radio_title = msg_group_clone.find('.title');
                                    if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                        var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                        radio_title.html(title_text);
                                    } else {
                                        radio_title.remove();
                                    }

                                    //radio option
                                    if(!isEmpty(msg_item['list'])) {
                                        var option_index = 0;
                                        $(msg_item['list']).each(function (option_item_index, option_item) {
                                            var radio_option = template_message.find('.message_type .radio_template .radio_option').clone();

                                            if(msg_item['template_type'] == g_radio_type.image_radio) {
                                                var option_img_num = option_item.length;
                                                $(option_item).each(function (option_img_index, option_img_item) {
                                                    if(!isEmpty(option_img_item['image_url'])) {
                                                        var radio_img_item = template_message.find('.message_type .radio_template .radio_img_item').clone();
                                                        var radio_img_item_name = log_message_id + '_radio_' + message_radio_num;
                                                        var radio_img_item_id = log_message_id + '_radio_' + message_radio_num + '_' + option_index;

                                                        radio_img_item.find('input.option_input').attr('name', radio_img_item_name);
                                                        radio_img_item.find('input.option_input').attr('id', radio_img_item_id);
                                                        radio_img_item.find('input.option_input').val(option_item_index + ',' + option_img_index);

                                                        if (!isEmpty(option_img_item['comment'])) {
                                                            radio_img_item.find('.option_label').html(option_img_item['comment']);
                                                        }

                                                        radio_img_item.find('img').attr('src', option_img_item['image_url']);
                                                        radio_img_item.find('.option_label, .image_box').attr('for', radio_img_item_id);

                                                        //add class num image option in line
                                                        if (option_img_num >= 3) {
                                                            radio_img_item.addClass('col-xs-4');
                                                        } else if (option_img_num >= 2) {
                                                            radio_img_item.addClass('col-xs-6');
                                                        } else {
                                                            radio_img_item.addClass('col-xs-12');
                                                        }

                                                        radio_option.append(radio_img_item);
                                                        msg_group_clone.find('.radio_container').addClass('radio_image_container');
                                                    }
                                                    option_index++;
                                                });
                                            } else {
                                                var radio_item = template_message.find('.message_type .radio_template .radio_item').clone();
                                                var radio_item_name = log_message_id + '_radio_' + message_radio_num;
                                                var radio_item_id = log_message_id + '_radio_' + message_radio_num + '_' + option_index;

                                                radio_item.find('input.option_input').attr('name', radio_item_name);
                                                radio_item.find('input.option_input').attr('id', radio_item_id);
                                                //position to get and save to answer
                                                radio_item.find('input.option_input').val(option_index);
                                                radio_item.find('.option_label').html(option_item);
                                                radio_item.find('.option_label').attr('for', radio_item_id);

                                                radio_option.append(radio_item);
                                                option_index++;
                                            }

                                            msg_group_clone.find('.radio_container').append(radio_option);
                                        });
                                    }

                                    //if radio message is alone: call next msg when select a option (check by class: is_next_message)
                                    if($(data['message']).length <= 1) {
                                        msg_group_clone.addClass('is_next_message');

                                        //show next message button if question have an answer
                                        if(isEmpty(msg_item['answer'])) {
                                            add_next_button = false;
                                        }
                                    } else {
                                        //set require class if radio group not is alone
                                        if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                            msg_group_clone.find('.radio_container').addClass(g_validate_types.validate_require);
                                        }
                                    }


                                    message_radio_num++;
                                }
                                    break;
                                case g_message_user_type['checkbox']: {
                                    msg_group_clone = template_message.find('.message_type .checkbox_group').clone();

                                    //set require class
                                    if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                        msg_group_clone.find('.checkbox_container').addClass(g_validate_types.validate_require);
                                    }

                                    //set title
                                    var checkbox_title = msg_group_clone.find('.title');
                                    if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                        var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                        checkbox_title.html(title_text);
                                    } else {
                                        checkbox_title.remove();
                                    }

                                    //radio option
                                    if(!isEmpty(msg_item['list'])) {
                                        $(msg_item['list']).each(function (option_index, option_label) {
                                            var checkbox_option = template_message.find('.message_type .checkbox_option').clone();
                                            var checkbox_option_name = log_message_id + '_checkbox_' + message_checkbox_num;
                                            var checkbox_option_id = log_message_id + '_checkbox_' + message_checkbox_num + '_' + option_index;

                                            checkbox_option.find('input.option_input').attr('name', checkbox_option_name);
                                            checkbox_option.find('input.option_input').attr('id', checkbox_option_id);
                                            checkbox_option.find('input.option_input').val(option_index);
                                            checkbox_option.find('.option_label').html(option_label);
                                            checkbox_option.find('.option_label').attr('for', checkbox_option_id);

                                            msg_group_clone.find('.checkbox_container').append(checkbox_option);
                                        })
                                    }

                                    message_checkbox_num++;
                                }
                                    break;
                                case g_message_user_type['postal_code']: {
                                    msg_group_clone =  template_message.find('.message_type .postalcode_group').clone();

                                    if(!isEmpty(msg_item['list'])) {
                                        $(msg_item['list']).each(function(input_index, input_data) {
                                            if(!isEmpty(input_data['type'])) {
                                                var postalcode_input = template_message.find('.message_type .postalcode_template .' + input_data['type']).clone();
                                                if(!isEmpty(postalcode_input)) {
                                                    postalcode_input.find('input.content').attr('placeholder', input_data['placeholder']);
                                                    msg_group_clone.append(postalcode_input);
                                                }

                                                //reset g_postal_code when start new postal code message
                                                if(input_data['type'] == 'postal_code') {
                                                    g_postal_code = null;
                                                }
                                            }
                                        });
                                        //set require class
                                        if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                            //set require to title
                                            var post_code_title = msg_group_clone.find('.postal_code .title');
                                            var title_text = post_code_title.html() + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                            post_code_title.html(title_text);

                                            //set require postal_code input
                                            msg_group_clone.find('.postal_code input').addClass(g_validate_types.validate_require);
                                        }
                                        msg_group_clone.find('.postal_code input').addClass(g_validate_types.validate_number);
                                        //postcode Japan is 7 characters
                                        msg_group_clone.find('.postal_code input').addClass(g_validate_types.validate_postalcode_length + ' validate-postalcode-length-7');
                                        msg_group_clone.find('.postal_code input').attr('maxlength', 7);

                                        //get value from before postal code message. value in g_postal_code
                                        if(g_postal_code) {
                                            msg_item['answer'] = g_postal_code;
                                        }
                                    }
                                }
                                    break;
                                case g_message_user_type['terms_of_use']: {
                                    msg_group_clone =  template_message.find('.message_type .terms_use_group').clone();

                                    //title
                                    if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                        var terms_use_title = template_message.find('.message_type .terms_use_template .terms_use_label').clone();
                                        var title_text = msg_item['title'] + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                        terms_use_title.html(title_text);
                                        msg_group_clone.append(terms_use_title);
                                    }
                                    //content
                                    var terms_use_content;
                                    switch (msg_item['template_type']) {
                                        case g_term_of_use_type['only_link']: {
                                            if(!isEmpty(msg_item['list'])) {
                                                $(msg_item['list']).each(function (link_index, link_item) {
                                                     //link
                                                    terms_use_content = template_message.find('.message_type .terms_use_template .link_box').clone();
                                                    if(!isEmpty(link_item.link)) {
                                                         if (isEmpty(link_item.link_text)) {
                                                            terms_use_content.find('.content').html(link_item.link);
                                                         }else {
                                                            terms_use_content.find('.content').html(link_item.link_text);
                                                         }
                                                         terms_use_content.find('.content').attr('href', link_item.link);
                                                     }
                                                     //first title
                                                     if (!isEmpty(link_item.link_first_title)) {
                                                        terms_use_content.find('.first_title').html(link_item.link_first_title);
                                                     }
                                                     //last title
                                                     if (!isEmpty(link_item.link_last_title)) {
                                                        terms_use_content.find('.last_title').html(link_item.link_last_title);
                                                     }
                                                    msg_group_clone.append(terms_use_content);
                                                });
                                            }
                                        }
                                            break;
                                       default: {
                                            //text
                                            if(!isEmpty(msg_item['content'])) {
                                                terms_use_content = template_message.find('.message_type .terms_use_template .content_box').clone();
                                                terms_use_content.find('.content').html(msg_item['content']);
                                                msg_group_clone.append(terms_use_content);
                                            }
                                        }
                                            break;
                                    }
                                    // msg_group_clone.append(terms_use_content);
                                    //input
                                    var terms_use_input = template_message.find('.message_type .terms_use_template .input_box').clone();
                                    var terms_use_name = log_message_id + '_terms_use_' + message_terms_use_num;
                                    var terms_use_name_id = log_message_id + '_terms_use_' + message_terms_use_num;

                                    //input: set label input
                                    if(!isEmpty(msg_item['text_confirm'])) {
                                        terms_use_input.find('.option_label').html(msg_item['text_confirm']);
                                        terms_use_input.find('.option_label').attr('for', terms_use_name_id);
                                    }
                                    //input: set require class
                                    terms_use_input.find('input.option_input').addClass(g_validate_types.validate_require);

                                    terms_use_input.find('input.option_input').attr('name', terms_use_name);
                                    terms_use_input.find('input.option_input').attr('id', terms_use_name_id);
                                    msg_group_clone.append(terms_use_input);

                                    message_terms_use_num++;
                                }
                                    break;
                                case g_message_user_type['pulldown']: {
                                    msg_group_clone =  template_message.find('.message_type .pulldown_group').clone();

                                    var pulldown_title = msg_group_clone.find('.title');
                                    //show hide and set title
                                    if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                        var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                        pulldown_title.html(title_text);
                                    } else {
                                        pulldown_title.remove();
                                    }

                                    if(!isEmpty(msg_item['template_type'])) {
                                        switch (msg_item['template_type']) {
                                            case g_pulldown_type['brithday']: {
                                                var brithday_box = template_message.find('.message_type .pulldown_template .birthday_box').clone();
                                                msg_group_clone.find('.pulldown_container').append(brithday_box);
                                            }
                                                break;
                                            case g_pulldown_type['date']: {
                                                var date_box = template_message.find('.message_type .pulldown_template .date_box').clone();
                                                msg_group_clone.find('.pulldown_container').append(date_box);
                                            }
                                                break;
                                            case g_pulldown_type['time']: {
                                                var time_box = template_message.find('.message_type .pulldown_template .time_box').clone();
                                                msg_group_clone.find('.pulldown_container').append(time_box);
                                            }
                                                break;
                                            case g_pulldown_type['date_time']: {
                                                var date_box = template_message.find('.message_type .pulldown_template .date_box').clone();
                                                var time_box = template_message.find('.message_type .pulldown_template .time_box').clone();
                                                date_box.addClass('padding_bottom');
                                                msg_group_clone.find('.pulldown_container').append(date_box);
                                                msg_group_clone.find('.pulldown_container').append(time_box);
                                            }
                                                break;
                                            case g_pulldown_type['period_of_time']: {
                                                var period_time_box = template_message.find('.message_type .pulldown_template .period_time_box').clone();
                                                //set Minute select follow spacing
                                                if(!isEmpty(msg_item['start_spacing_minute']) && msg_item['start_spacing_minute'] > 0) {
                                                    setSpacingMinuterSelect(period_time_box.find('.select_minute_box select').first(), msg_item['start_spacing_minute']);
                                                }
                                                if(!isEmpty(msg_item['end_spacing_minute']) && msg_item['end_spacing_minute'] > 0) {
                                                    setSpacingMinuterSelect(period_time_box.find('.select_minute_box select').last(), msg_item['end_spacing_minute']);
                                                }

                                                msg_group_clone.find('.pulldown_container').append(period_time_box);
                                            }
                                                break;
                                            case g_pulldown_type['period_of_day']: {
                                                var date_box1 = template_message.find('.message_type .pulldown_template .date_box').clone();
                                                var date_box2 = template_message.find('.message_type .pulldown_template .date_box').clone();
                                                msg_group_clone.find('.pulldown_container').append(date_box1);
                                                msg_group_clone.find('.pulldown_container').append('<p class="period_day_spacing col-xs-12">~</p>');
                                                msg_group_clone.find('.pulldown_container').append(date_box2);
                                            }
                                                break;
                                            case g_pulldown_type['customize']: {
                                                if(!isEmpty(msg_item['list']) && !isEmpty(msg_item['list'][0])) {
                                                    var customize_box;
                                                    if(msg_item['list'].length <= 1) {
                                                        customize_box = template_message.find('.message_type .pulldown_template .customize_box.one_select').clone();
                                                    } else {
                                                        customize_box = template_message.find('.message_type .pulldown_template .customize_box.two_select').clone();
                                                    }
                                                    $(msg_item['list']).each(function (list_index, list_index_option) {
                                                        $(list_index_option).each(function (option_index, option_label) {
                                                            if(!isEmpty(option_label)) {
                                                                var customize_option = '<option value="' + option_index + '">' + option_label + '</option>';
                                                                if(customize_box.find('select').eq(list_index).length) {
                                                                    customize_box.find('select').eq(list_index).append(customize_option);
                                                                }
                                                            }
                                                        });
                                                    });

                                                    //Add first and last title
                                                    if(!isEmpty(msg_item['first_title'])) {
                                                        customize_box.find('.first_title').html(msg_item['first_title']);
                                                    } else {
                                                        customize_box.find('.first_title').parent('.title_box').remove();
                                                    }
                                                    if(!isEmpty(msg_item['last_title'])) {
                                                        customize_box.find('.last_title').html(msg_item['last_title']);
                                                    } else {
                                                        customize_box.find('.last_title').parent('.title_box').remove();
                                                    }

                                                    //reset width for one_select input_content
                                                    if(customize_box.hasClass('one_select') && (!customize_box.find('.first_title').length || !customize_box.find('.last_title').length)) {
                                                        var width_class = 'col-xs-12';

                                                        if(!customize_box.find('.first_title').length && customize_box.find('.last_title').length) {
                                                            width_class = 'col-xs-10';
                                                        } else if(!customize_box.find('.last_title').length && customize_box.find('.first_title').length) {
                                                            width_class = 'col-xs-6';
                                                        }
                                                        customize_box.find('.input_content').removeClass('col-xs-4');
                                                        customize_box.find('.input_content').addClass(width_class);
                                                    }

                                                    //check and change label first option of .one_select: if exist first and last title
                                                    if(isMobile() && !isEmpty($.fn.fileinputLocales[g_language]) && customize_box.hasClass('one_select') && customize_box.find('.first_title').length && customize_box.find('.last_title').length) {
                                                        if(!isEmpty($.fn.fileinputLocales[g_language]['select'])) customize_box.find('option.first').html($.fn.fileinputLocales[g_language]['select']);
                                                    }

                                                    msg_group_clone.find('.pulldown_container').append(customize_box);
                                                } else {
                                                    break_msg = true;
                                                    return;
                                                }
                                            }
                                                break;
                                            case g_pulldown_type['month_date']: {
                                                var month_day = template_message.find('.message_type .pulldown_template .month_date_box').clone();
                                                msg_group_clone.find('.pulldown_container').append(month_day);
                                            }
                                                break;
                                            case g_pulldown_type['the_provinces_of_japan']: {
                                                var prefecture_box = template_message.find('.message_type .pulldown_template .prefecture_box').clone();
                                                if(!isEmpty(msg_item['list']) && !isEmpty(msg_item['list'][0])) {
                                                    $(msg_item['list'][0]).each(function (option_index, option_label) {
                                                        if(!isEmpty(option_label)) {
                                                            var prefecture_option = '<option value="' + option_index + '">' + option_label + '</option>';
                                                            if(prefecture_box.find('select')) {
                                                                prefecture_box.find('select').append(prefecture_option);
                                                            }
                                                        }
                                                    });
                                                }
                                                msg_group_clone.find('.pulldown_container').append(prefecture_box);
                                            }
                                                break;
                                            case g_pulldown_type['towns_and_villages']: {
                                                var prefecture_city_box = template_message.find('.message_type .pulldown_template .prefecture_city_box').clone();

                                                //add id for prefecture_city_box. Get separate data for each city follow prefecture
                                                var towns_and_villages_id = log_message_id + '_prefecture_city_' + message_towns_and_villages_num;
                                                prefecture_city_box.attr('id', towns_and_villages_id);

                                                //Add first and last title
                                                if(!isEmpty(msg_item['first_title'])) {
                                                    prefecture_city_box.find('.first_title').html(msg_item['first_title']);
                                                } else {
                                                    prefecture_city_box.find('.first_title').parent('.title_box').remove();
                                                }
                                                if(!isEmpty(msg_item['last_title'])) {
                                                    prefecture_city_box.find('.last_title').html(msg_item['last_title']);
                                                } else {
                                                    prefecture_city_box.find('.last_title').parent('.title_box').remove();
                                                }
                                                msg_group_clone.find('.pulldown_container').append(prefecture_city_box);

                                                message_towns_and_villages_num++;
                                            }
                                                break;
                                            case g_pulldown_type['birthday_y_m']: {
                                                var birthday_y_m_box = template_message.find('.message_type .pulldown_template .birthday_y_m_box').clone();
                                                msg_group_clone.find('.pulldown_container').append(birthday_y_m_box);
                                            }
                                                break;
                                        }
                                    }

                                    //Add label
                                    if(!isEmpty(msg_item['comment'])) {
                                        var pulldown_label = template_message.find('.message_type .pulldown_template .pulldown_label').clone();
                                        pulldown_label.html(msg_item['comment']);
                                        msg_group_clone.find('.select_box').last().append(pulldown_label);
                                    }

                                    //set Minute select follow spacing
                                    if(!isEmpty(msg_item['spacing_minute']) && msg_item['spacing_minute'] > 0) {
                                        setSpacingMinuterSelect(msg_group_clone.find('.time_box .select_minute_box select'), msg_item['spacing_minute']);
                                    }

                                    //set require class
                                    if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                        //add require class to pulldown_container: check if have any select then require all select
                                        msg_group_clone.parents('.pulldown_container').addClass(g_validate_types.validate_require);
                                        msg_group_clone.find('select').addClass(g_validate_types.validate_require);
                                    }
                                }
                                    break;
                                case g_message_user_type['carousel']: {
                                    msg_group_clone =  template_message.find('.message_type .carousel_group').clone();
                                    //carousel title
                                    if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                        var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                        msg_group_clone.find('.title').html(title_text);
                                    }

                                    if(!isEmpty(msg_item['list']) && msg_item['list'].length) {
                                        $(msg_item['list']).each(function(carousel_item_index, carousel_item) {
                                            var carousel_item_clone =  template_message.find('.message_type .carousel_template .carousel_item').clone();
                                            if(!isEmpty(carousel_item['title'])) {
                                                carousel_item_clone.find('.item_title').html(carousel_item['title']);
                                            }
                                            if(!isEmpty(carousel_item['subtitle'])) {
                                                carousel_item_clone.find('.item_subtitle').html(carousel_item['subtitle']);
                                            }
                                            if(!isEmpty(carousel_item['item_url'])) {
                                                carousel_item_clone.find('a.item_url_box').attr('href', carousel_item['item_url']);
                                            }
                                            if(!isEmpty(carousel_item['image_url'])) {
                                                carousel_item_clone.find('.image_box img').attr('src', carousel_item['image_url']);
                                            }
                                            if(!isEmpty(carousel_item['button']) && !isEmpty(carousel_item['button']['title'])) {
                                                carousel_item_clone.find('.select_box button').html(carousel_item['button']['title']);
                                            }
                                            msg_group_clone.find('.carousel_container').append(carousel_item_clone);
                                        });
                                    }

                                    //if radio message is alone: call next msg when select a option (check by class: is_next_message)
                                    if($(data['message']).length <= 1 && !isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                        msg_group_clone.addClass('is_next_message');

                                        //show next message button if question have an answer
                                        if(isEmpty(msg_item['answer'])) {
                                            add_next_button = false;
                                        }
                                    }
                                    //set require class
                                    if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                        msg_group_clone.find('.carousel_container').addClass(g_validate_types.validate_require);
                                    }
                                }
                                    break;
                                case g_message_user_type['card_payment']: {
                                    msg_group_clone =  template_message.find('.message_type .card_payment_group').clone();
                                    //carousel title
                                    if(!isEmpty(msg_item['title'])) {
                                        msg_group_clone.find('.title').first().html(msg_item['title']);
                                    }

                                    //get and show card type
                                    var card_tyle_default = '';
                                    /*if(!isEmpty(msg_item['card_type'])) {
                                        $(msg_item['card_type']).each(function(card_type_index, card_type_code) {
                                            //set first card is card type default
                                            if(card_type_index <= 0) {
                                                card_tyle_default = g_credit_card_type[card_type_code];
                                            }
                                            var card_type_item =  template_message.find('.message_type .card_payment_template .card_type_item').clone();
                                            card_type_item.attr('data-card_type', g_credit_card_type[card_type_code]);
                                            card_type_item.find('img').attr('src', 'images/card_type/' + g_credit_card_type[card_type_code] + '.png');
                                            card_type_item.find('img').attr('alt', g_credit_card_type[card_type_code]);

                                            //set active card default
                                            if(card_tyle_default == g_credit_card_type[card_type_code]) {
                                                card_type_item.find('img').addClass('active');
                                            }

                                            msg_group_clone.find('.card_type_box').append(card_type_item);
                                        });
                                    }*/

                                    //set card_tyle_default for card number
                                    msg_group_clone.find('.card_number_box input.content').attr('data-card_type', card_tyle_default);

                                    //add placeholder
                                    if(!isEmpty(msg_item['list']) && msg_item['list'].length) {
                                        $(msg_item['list']).each(function(item_index, item) {
                                            if(!isEmpty(item['type']) && !isEmpty(item['placeholder'])) {
                                                var card_payment_input = '';
                                                if(item['type'] == 'card_name') {
                                                    card_payment_input = msg_group_clone.find('.card_holder_box input.content');

                                                } else if(item['type'] == 'card_number') {
                                                    card_payment_input = msg_group_clone.find('.card_number_box input.content');

                                                } else if(item['type'] == 'card_cvc') {
                                                    card_payment_input = msg_group_clone.find('.card_code_box input.content');
                                                }

                                                if(!isEmpty(card_payment_input)) {
                                                    card_payment_input.attr('placeholder', item['placeholder']);
                                                }
                                            }
                                        });
                                    }

                                    //set require class if carousel group not is alone
                                    // if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                        //set always require
                                        msg_group_clone.find('input, select').addClass(g_validate_types.validate_require);
                                    // }
                                }
                                    break;
                                case g_message_user_type['file']: {
                                    msg_group_clone =  template_message.find('.message_type .upload_group').clone();

                                    //set name for input upload to check file type upload
                                    var file_upload_name = log_message_id + '_radio_' + message_file_upload_num;
                                    msg_group_clone.find('input.file_input').attr('name', file_upload_name);


                                    //set allow file type upload to global variable for validate
                                    if(!isEmpty(msg_item['file_type']) && msg_item['file_type']) {
                                        g_file_upload_type_list[file_upload_name] = msg_item['file_type'];
                                    }

                                    //set require class
                                    if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                        msg_group_clone.find('input.file_name_origin').addClass(g_validate_types.validate_require);
                                    }
                                    message_file_upload_num++;
                                }
                                    break;
                                case g_message_user_type['calendar']: {
                                    if(!isEmpty(msg_item['template_type'])) {
                                        msg_group_clone = template_message.find('.message_type .calendar_group').clone();

                                        //show hide and set title
                                        var calendar_title = msg_group_clone.find('.title');
                                        if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                            var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                            calendar_title.html(title_text);
                                        } else {
                                            calendar_title.remove();
                                        }

                                        //check calendar type
                                        var calendar_box;
                                        if(msg_item['template_type'] == g_calendar_type['embed']) {
                                            calendar_box = template_message.find('.message_type .calendar_template .calendar_embed').clone();

                                        } else if(msg_item['template_type'] == g_calendar_type['period_of_time']) {
                                            calendar_box = template_message.find('.message_type .calendar_template .calendar_period').clone();

                                        } else {
                                            calendar_box = template_message.find('.message_type .calendar_template .calendar_select').clone();
                                        }

                                        //set weekend off
                                        if(!isEmpty(msg_item['weekend_off_flg']) && parseInt(msg_item['weekend_off_flg']) == 1){
                                            calendar_box.find('input.content').addClass('weekend_off');
                                        }
                                        // set value start date calendar
                                        if(!isEmpty(msg_item['start_date'])){
                                            calendar_box.find('input.content').first().attr('data-start_date', msg_item['start_date']);
                                        }
                                        //set require class
                                        if(!isEmpty(msg_item['required_flg']) && msg_item['required_flg']) {
                                            if(msg_item['template_type'] == g_calendar_type['period_of_time']) {
                                                //add require class to calendar_container: check if have any input then require all input
                                                msg_group_clone.find('.calendar_container').addClass(g_validate_types.validate_require);
                                            }
                                            calendar_box.find('input.content').addClass(g_validate_types.validate_require);
                                        }
                                        //set placeholder is format date
                                        calendar_box.find('input.content').attr('placeholder', g_calendar_format);

                                        msg_group_clone.find('.calendar_container').append(calendar_box);
                                    } else {
                                        break_msg = true;
                                        return;
                                    }
                                }
                                    break;
                                case g_message_user_type['captcha']: {
                                    msg_group_clone =  template_message.find('.message_type .captcha_group').clone();

                                    var captcha_title = msg_group_clone.find('.title');
                                    var captcha_input = msg_group_clone.find('input.content');
                                    var captcha_img = msg_group_clone.find('.captcha_box img');

                                    //set name for input upload to check file type upload
                                    var captcha_name = log_message_id + '_radio_' + message_captcha_num;
                                    captcha_input.attr('name', captcha_name);

                                    //set require class
                                    captcha_input.addClass(g_validate_types.validate_require);

                                    //show hide and set title. Captcha alwayss require
                                    var title_text = (!isEmpty(msg_item['title']) ? msg_item['title'] : '') + ' ' + g_required_text;
                                    captcha_title.html(title_text);

                                    //init captcha option
                                    var captcha_option = {
                                        'cid' : g_connect_page_id,
                                        'uid': g_user_id,
                                        'size': !isEmpty(msg_item['size']) ? msg_item['size'] : 6,
                                        'charPreset': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
                                    };
                                    //set option follow custom
                                    //add validate min length
                                    captcha_input.addClass(g_validate_types.validate_min + ' minimum-length-' + captcha_option['size']);

                                    if(!isEmpty(msg_item['color']) && parseInt(msg_item['color']) == 1) {
                                        captcha_option['color'] = 'true';
                                    }
                                    if(!isEmpty(msg_item['captcha_type'])) {
                                        if(msg_item['captcha_type'] == g_captcha_type.only_letters) {
                                            captcha_option['charPreset'] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

                                        } else if(msg_item['captcha_type'] == g_captcha_type.only_numbers) {
                                            captcha_option['charPreset'] = '1234567890';
                                        }
                                    }
                                    //init captcha url
                                    var captcha_img_src = g_captcha_url_request;
                                    var captcha_index = 0;
                                    $.each(captcha_option, function(key, value) {
                                        if(captcha_index <= 0) {
                                            captcha_img_src += '?';
                                        } else {
                                            captcha_img_src += '&';
                                        }
                                        captcha_img_src += key + '=' + value;

                                        captcha_index++;
                                    });

                                    //set captcha option to send to server to verify captcha value
                                    g_captcha_config_list[captcha_name] = captcha_option;

                                    //add param time for not get cache image
                                    captcha_img_src += '&time=' + Date.now();
                                    captcha_img.attr('src', captcha_img_src);

                                    message_captcha_num++;
                                }
                                    break;
                                case g_message_user_type['add_to_cart']: {
                                    if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                                        //add cart_type class to style block message include cart type
                                        clone.addClass('cart_type');

                                        msg_group_clone =  template_message.find('.message_type .shopping_cart_group').clone();

                                        //show hide and set title
                                        var cart_title  = msg_group_clone.find('.title');
                                        if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                            var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                            cart_title.html(title_text);
                                        } else {
                                            cart_title.remove();
                                        }
                                    }
                                }
                                    break;
                                case g_message_user_type['request_document']: {
                                    if(g_scenario_type == g_scenario_type_list.request_document) {
                                        //add cart_type class to style block message include cart type
                                        clone.addClass('cart_type');

                                        msg_group_clone =  template_message.find('.message_type .document_cart_group').clone();

                                        //show hide and set title
                                        var cart_title  = msg_group_clone.find('.title');
                                        if(!isEmpty(msg_item['title']) || (!isEmpty(msg_item['required_flg']) && msg_item['required_flg'])) {
                                            var title_text = (msg_item['title'] ? msg_item['title'] : '') + (msg_item['required_flg'] ? (' ' + g_required_text) : '');
                                            cart_title.html(title_text);
                                        } else {
                                            cart_title.remove();
                                        }

                                        //set document type
                                        if(!isEmpty(msg_item['template_type'])) {
                                            msg_group_clone.find('.cart_container').attr('data-cart_document_type', msg_item['template_type']);
                                            //set value to header document global variable
                                            if(!g_cart_header_document_type) {
                                                g_cart_header_document_type = msg_item['template_type'];
                                            }
                                        }
                                    }
                                }
                                    break;
                            }

                            if(msg_group_clone) {
                                //set message type for .msg_group
                                msg_group_clone.attr('data-message_type', msg_item_type);
                                //set b_position for body
                                var b_position = '';
                                if(!isEmpty(data['b_position'])) {
                                    b_position = data['b_position'];
                                }
                                clone.find('.chat-body').attr('data-b_position', b_position);
                                clone.find('.chat-body').append(msg_group_clone);

                                setAnswerMessage(msg_group_clone, msg_item['answer']);
                            }
                        });
                    });
                }

                //if break this message
                if(break_msg) {
                    return;
                }
                //set log_message_id to message chat body
                clone.find('.chat-body').attr('data-message_id', log_message_id);

                if(data["type"] == g_sender_type["user"] && isAnimation){
                    clone.addClass('chat-right-active');
                }else  if(data["type"] == g_sender_type["bot"] && isAnimation){
                    clone.addClass('chat-left-active');
                }

                if (add_next_button) {
                    addNextMessageButton(clone, data['btn_next']);
                }
                addChatMessage(clone);
            }
        }
    }

    //remove html tag in string
    function strip(html){
        var doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    // scroll bot bottom of chat box
    function scrollTop() {
        var elem = document.getElementById('wc-message-pane');
        var message_input_wrap_h = $('.message-input-wrap').outerHeight();
        elem.style.bottom = message_input_wrap_h + 'px';
        elem.scrollTop = elem.scrollHeight;
    }

    //***cookie handle***
    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toGMTString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    function getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    //***END cookie handle***

    // create uuid
    function guid() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    function checkConnectPageid() {
        var param_connect_page_id = getParam('connect_page_id');
        g_new_conversation_flg = false;

        if (param_connect_page_id) {
            if(!g_user_id || g_connect_page_id != param_connect_page_id) {
                g_connect_page_id = param_connect_page_id;
                g_user_id = g_connect_page_id + '_' + guid();
                g_new_conversation_flg = true;
            }
            var wc_join_room = {
                'user_id': g_user_id,
                'connect_page_id': g_connect_page_id,
                'new_conversation_flg': g_new_conversation_flg,
                'ref': getParam('ref'),
                'current_url': document.referrer,
                'language' : navigator.language
            };
            if(!isEmpty(g_preview_flg)) {
                wc_join_room['preview_flg'] = g_preview_flg;
            }
            //check to join exist conversation or start new conversation in: efo_bot_start IO event
            if(!g_new_conversation_flg){
                socketIOEmit('efo_user_start', wc_join_room);
            } else {
                socketIOEmit('efo_join', wc_join_room);
            }
        }
    }

    //reset cookie time
    function resetCookieTime() {
        var current_time = Math.round(new Date() / 1000);
        if(g_cookie_time_flg == void 0 || (current_time - g_cookie_time_flg > g_cookie_time_update)) {
            var cookie_data = {};
            cookie_data[g_cookie_connect_page_id_name] = g_connect_page_id;
            cookie_data[g_cookie_user_id_name] = g_user_id;

            setCookieValue(cookie_data);
            //update flg time to set cookie
            g_cookie_time_flg = current_time;
        }
    }

    function setCookieValue(data) {
        var data_user_id = (data != void 0 && data[g_cookie_user_id_name] != void 0) ? data[g_cookie_user_id_name] : '',
            data_connect_page_id = (data != void 0 && data[g_cookie_connect_page_id_name] != void 0) ? data[g_cookie_connect_page_id_name] : '';

        if(g_reset_cookie_time_flg != void 0 && g_reset_cookie_time_flg){
            if(g_cookie_support) {
                setCookie(g_cookie_user_id_name + '_' + data_connect_page_id, data_user_id, g_time_short);
                setCookie(g_cookie_connect_page_id_name + '_' + data_connect_page_id, data_connect_page_id, g_time_short);
            } else {
                //SAFARI browser: reset cookie in client site
                var cookie = {};
                cookie[g_cookie_user_id_name + '_' + data_connect_page_id] = data_user_id;
                cookie[g_cookie_connect_page_id_name + '_' + data_connect_page_id] = data_connect_page_id;
                var post_message_data = {
                    'cookie' : cookie
                };
                postMessageToClient(post_message_data);
            }
            g_reset_cookie_time_flg = false;
        }
    }

    function applySetting(data) {
        //apply bot avatar to header
        var header_image = $('.chat-header img.header-image');
        if(data.picture != void 0 && data.picture != '') {
            header_image.attr('src', data.picture);
        } else {
            header_image.hide();
        }

        //apply setting custom
        if(data.setting == void 0){
            data.setting = {};
        }
        var device_h = screen.availHeight; //excluding OS taskbars
        var setting_data = data.setting;
        var bot_chat = $('#botchan-chat');
        var chat_title = setting_data.title != void 0 ? setting_data.title : '',
            sub_title = setting_data.sub_title != void 0 ? setting_data.sub_title : '',
            sub_sub_title = setting_data.sub_sub_title != void 0 ? setting_data.sub_sub_title : '',
            chat_color_code = setting_data.color_code != void 0 ? setting_data.color_code : '',
            chat_lang = !isEmpty(setting_data.lang) ? setting_data.lang : 'ja',
            chat_show_chat_avatar = setting_data.show_chat_avatar != void 0 ? setting_data.show_chat_avatar : '',
            chat_width = !isEmpty(setting_data.width) ? setting_data.width : 300,
            chat_height = !isEmpty(setting_data.height) ? setting_data.height : 400,
            show_onload = setting_data.show_onload != void 0 ? setting_data.show_onload : '',
            time_show_onload = (setting_data.time_show_onload != void 0 && parseInt(setting_data.time_show_onload) >= 0) ? setting_data.time_show_onload : 0,
            sp_icon_bottom = !isEmpty(setting_data.sp_icon_bottom) ? setting_data.sp_icon_bottom : 10,
            sp_icon_right = !isEmpty(setting_data.sp_icon_right) ? setting_data.sp_icon_right : 10,
            custom_css = setting_data.custom_css != void 0 ? setting_data.custom_css : '',
            pc_icon_type = !isEmpty(setting_data.pc_icon_type) ? setting_data.pc_icon_type : '001',
            pc_icon_bottom = !isEmpty(setting_data.pc_icon_bottom) ? setting_data.pc_icon_bottom : 100,
            chatbox_close_type = !isEmpty(setting_data.design_type) ? setting_data.design_type : '001',
            pc_icon_display_type = !isEmpty(setting_data.pc_icon_display_type) ? setting_data.pc_icon_display_type : '001',
            sp_icon_display_type = !isEmpty(setting_data.sp_icon_display_type) ? setting_data.sp_icon_display_type : '002',
            scenario_type = !isEmpty(data.scenario_type) ? data.scenario_type : '';

        //COLOR
        if (chat_color_code != void 0 && !isEmpty(g_style_name_list[chat_color_code])) {
            g_style_code_default = chat_color_code;
        }
        //set style file name for webchat follow style code
        if(!isEmpty($('link.efo_style'))) {
            $('link.efo_style').attr('href', g_embed_azure_storage_url + 'efo/' + g_style_name_list[g_style_code_default] + '/style.css?v=' + g_version);
        }

        //chat_color: add prefix # for color and Send to client to set background for minimize element
        var chat_color = '#' + g_style_color_list[g_style_code_default];

        if (chat_color) {

        }
        //END COLOR

        if (chat_lang) {
            if(chat_lang == 'ja') {
                g_calendar_format = 'YYYY/MM/DD';
            }
            //set language to body to check in validate
            $('body').attr('data-language', chat_lang);
            $('body').addClass(chat_lang);
            g_language = chat_lang;
        }
        //type show in PC version
        if (pc_icon_type) {
            g_chatbox_show_type = pc_icon_type;
        }
        //add class show type animation chatbox
        if(g_chatbox_show_type == g_chatbox_show_type_list.leftward) {
            $('body').addClass('leftward');

        } else {
            $('body').addClass('upward');
        }

        //upward show type: add, remove class .wc-close in in body
        /*
        * window != window.parent: chatbox in iframe
        * g_force_log_flg = 1: not use controller.js file
        * */
        if((isMobile() || g_chatbox_show_type != g_chatbox_show_type_list.leftward) && (window != window.parent && g_force_log_flg != 1)) {
            //check chatbox close or open
            chatboxShowHideClass(g_chatbox_show_status);
        }

        //check device and set to using SP or PC variable
        var gradation_icon_type = pc_icon_display_type;
        if(isMobile()) {
            gradation_icon_type = sp_icon_display_type;
        }

        //get header code style
        var close_type_code = getCloseTypeCode(chatbox_close_type, gradation_icon_type);
        $('body').addClass(g_chatbox_close_class_list[close_type_code]);


        g_new_msg_title = g_bot_name + g_new_msg_title;

        var img = data.picture;
        if (chat_show_chat_avatar != void 0 && chat_show_chat_avatar == '1' && img != void 0) {
            $('.chat-left .chat-avatar').show();
            $('.chat-left .chat-avatar img').attr('src', img);
            changeFavicon(img);
        } else {
            $('.chat-avatar').hide();
        }

        if (chat_title) {
            //set title for page
            document.title = chat_title;
            g_original_title  = document.title;

            //set title iframe chat
            bot_chat.find('.header-title-main').html(chat_title);
        }
        if (sub_title) {
            //set sub title for page
            var page_title = document.title;
            document.title = page_title + ' :: ' + sub_title;
            g_original_title  = document.title;

            //set sub title iframe chat
            bot_chat.find('.header-title-sub').html(sub_title);
        }
        checkLengthTitle(chat_title, sub_title);

        //set scrnario type for global variable
        if(scenario_type) {
            g_scenario_type = scenario_type;
        }

        //show cart header
        if(g_scenario_type != g_scenario_type_list.other) {
            $('.chat-header .header_cart_box').removeClass('hidden');
        }
        if(g_scenario_type == g_scenario_type_list.add_to_cart) {
            $('.chat-header').addClass('shopping_type');
            $('.chat-header .header_cart_box .shopping-cart').removeClass('hidden');

        } else if(g_scenario_type == g_scenario_type_list.request_document) {
            $('.chat-header').addClass('document_type');
            $('.chat-header .header_cart_box .document-cart').removeClass('hidden');
            //remove total price box
            $('.cart_preview_box .price_total_box').remove();

        }

        if(isMobile()) {
            $('body').addClass('is_mobile');
            //set height cart header preview = 70% chat height
            console.log(device_h);
            bot_chat.find('.cart_preview_box .cart_preview_container').css('max-height', ((device_h / 10) * 7) + 'px');
        } else {
            //set height cart header preview = 70% chat height
            if (chat_height) {
                bot_chat.find('.cart_preview_box .cart_preview_container').css('max-height', ((chat_height / 10) * 7) + 'px');
            }
        }

        //add style element to head of Iframe chat
        if (custom_css) {
            if($('head .customize_css').length) {
                $('head .customize_css').html(custom_css);
            } else {
                var custom_css_elm = '<style type="text/css" class="customize_css">' + custom_css + '</style>';
                $('head').append(custom_css_elm);
            }
        }
        //set html text follow language
        fillLanguage();
        //call part 1: for init option item
        initPulldownOption();

        var post_message_data = {
            'iframe_setting' : {
                'width': chat_width,
                'height': chat_height,
                'show_onload': show_onload,
                'time_show_onload': time_show_onload,
                'color': chat_color,
                'color_name': g_style_name_list[g_style_code_default],
                'sp_icon_bottom': sp_icon_bottom,
                'sp_icon_right': sp_icon_right,
                'pc_icon_type': g_chatbox_show_type,
                'pc_icon_bottom': pc_icon_bottom,
                'chat_lang': chat_lang,
                'sub_title': sub_title ? sub_title : chat_title,
                'sub_sub_title': sub_sub_title ? sub_sub_title : chat_title,
                'close_type_code': close_type_code,
            },
            'new_msg_title' : g_new_msg_title,
        };
        postMessageToClient(post_message_data);

        //if access by url or attach url to iframe simple
        if((window == window.parent || g_force_log_flg) && data.status){
            var  data_get_log = {
                user_id: g_user_id,
                connect_page_id: g_connect_page_id
            };
            socketIOEmit('efo_client_get_log', data_get_log);
        }

        showMessageContainer();
        setTimeout(function () {
            $('#botchan-chat').show();
            var msg_body_w = '90%';
            if (chat_show_chat_avatar != void 0 && chat_show_chat_avatar == '1' && img != void 0) {
                var avatar_width = $('.chat-left .chat-avatar').outerWidth(true);
                msg_body_w = 'calc( 90% - ' + avatar_width + 'px)';
            }
            $('.chat-left .chat-body').css('width', msg_body_w);
        }, 1200);

    }

    function scrollBottom(message_type) {
        var message_groups = document.getElementById("wc-message-pane");
        if(message_groups != void 0) {
            if(message_type == g_sender_type['bot']){
                message_groups.scrollTop = message_groups.scrollHeight;
            }else{
                setTimeout(function () {
                    $("#wc-message-pane").animate({scrollTop: message_groups.scrollTop + 200}, 500);
                }, 1000);

            }
        }
    }

    //send data to client
    function postMessageToClient(data) {
        // console.log('server send msg: ', data);
        //window != window.parent: chatbox in iframe
        if(window != window.parent) {
            data['connect_page_id'] = g_connect_page_id;
            data['user_id'] = g_user_id;
            parent.postMessage(data, '*');
        }
    }

    function fillLanguage() {
        var bot_chat = $('#botchan-chat');
        //add lang global
        var lang_scrip = document.createElement('script');
        lang_scrip.type = 'text/javascript';
        lang_scrip.async = 1;
        lang_scrip.src = g_embed_azure_storage_url + 'js/locale/' + g_language + '/' + g_language + '.js?v=' + g_version;
        document.body.appendChild(lang_scrip);

        lang_scrip.onload = function () {
            if (!isEmpty($.fn.fileinputLocales[g_language])) {
                //add language script
                var l = $.fn.fileinputLocales[g_language];
                if(!isEmpty(l['required'])) g_required_text = '<span class="required">' + l['required'] + '</span>';
                if(!isEmpty(l['startChat'])) bot_chat.find('.wc-info .wc-send-info').val(l['startChat']);
                if(!isEmpty(l['fillFormToStart'])) bot_chat.find('.wc-info #preChatFormMessageContainer').html(l['fillFormToStart']);
                // if(!isEmpty(l['your_name'])) bot_chat.find('.wc-info input.wc-txt-name').attr('placeholder', l['your_name']);
                // if(!isEmpty(l['your_mail'])) bot_chat.find('.wc-info input.wc-txt-email').attr('placeholder', l['your_mail']);
                if(!isEmpty(l['invalid_access_token'])) bot_chat.find('.wc_error_global .error_content').html(l['invalid_access_token']);
                if(!isEmpty(l['next'])) bot_chat.find('.template_message .next_message button').html(l['next']);
                if(!isEmpty(l['bot_says_title'])) g_new_msg_title = l['bot_says_title'];
                //Postal code message
                if(!isEmpty(l['postal_code'])) bot_chat.find('.template_message .postalcode_template .postal_code .title').html(l['postal_code']);
                if(!isEmpty(l['prefectures'])) bot_chat.find('.template_message .postalcode_template .prefectures .title').html(l['prefectures']);
                if(!isEmpty(l['municipality'])) bot_chat.find('.template_message .postalcode_template .municipality .title').html(l['municipality']);
                if(!isEmpty(l['street_number'])) bot_chat.find('.template_message .postalcode_template .street_number .title').html(l['street_number']);
                if(!isEmpty(l['building_name'])) bot_chat.find('.template_message .postalcode_template .building_name .title').html(l['building_name']);
                //Pulldown
                if(!isEmpty(l['please_select'])) bot_chat.find('select option.first').not('.custom_label').html(l['please_select']);
                if(!isEmpty(l['select'])) bot_chat.find('.customize_box.two_select option.first').html(l['select']);
                if(!isEmpty(l['select'])) bot_chat.find('.prefecture_city_box.two_select option.first').html(l['select']);
                //Carousel
                if(!isEmpty(l['select'])) bot_chat.find('.template_message .carousel_template .select_box button').html(l['select']);
                //Card payment
                if(!isEmpty(l['card_number'])) bot_chat.find('.template_message .card_payment_template .card_number_box .title').html(l['card_number']);
                if(!isEmpty(l['card_holder_name'])) bot_chat.find('.template_message .card_payment_template .card_holder_box .title').html(l['card_holder_name']);
                if(!isEmpty(l['card_expiry_date'])) bot_chat.find('.template_message .card_payment_template .card_date_box .title').html(l['card_expiry_date']);
                if(!isEmpty(l['card_security_code'])) bot_chat.find('.template_message .card_payment_template .card_code_box .title').html(l['card_security_code']);
                //File upload
                if(!isEmpty(l['select_file'])) bot_chat.find('.template_message .upload_template button.file_select_btn').html(l['select_file']);
                if(!isEmpty(l['uploading'])) bot_chat.find('.template_message .upload_template .loading span').html(l['uploading']);
                //Product cart
                if(!isEmpty(l['price_total'])) {
                    bot_chat.find('.cart_preview_box .price_total_label').html(l['price_total']);
                    bot_chat.find('.cart_group .price_total_label').html(l['price_total']);
                }
                if(!isEmpty(l['unit_price'])) bot_chat.find('.product_price_box .product_price_label').html(l['unit_price']);
                if(!isEmpty(l['amount'])) bot_chat.find('.product_price_total_box .product_price_label').html(l['amount']);
                if(!isEmpty(l['quantity'])) bot_chat.find('.product_quantity_box .product_quantity_label').html(l['quantity']);
                if(!isEmpty(l['cart_empty'])) bot_chat.find('.shopping_cart_group .empty_label').html(l['cart_empty']);
                if(!isEmpty(l['document_empty'])) bot_chat.find('.document_cart_group .empty_label').html(l['document_empty']);
                if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                    bot_chat.find('.cart_preview_box .empty_label').html(l['cart_empty']);

                } else if(g_scenario_type == g_scenario_type_list.request_document) {
                    bot_chat.find('.cart_preview_box .empty_label').html(l['document_empty']);
                }

                //call part 2: for apply language
                initPulldownOption(false);
            }
        };
    }

    function changeFavicon(src) {
        var link = document.createElement('link'),
            oldLink = document.getElementById('dynamic-favicon');
        link.id = 'dynamic-favicon';
        link.rel = 'shortcut icon';

        if(isEmpty(src)) {
            src = '../images/favicon.ico';
        }
        link.href = src;
        if (oldLink) {
            document.head.removeChild(oldLink);
        }
        document.head.appendChild(link);
    }

    function isEmpty (value, trim) {
        return value === void 0 || value === null || value.length === 0 || (trim && $.trim(value) === '');
    }

    //get param url
    function getParam(name, url) {
        if(url == void 0) {
            url = window.location.search;
        }
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(url);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    //check safari browser
    function cookieSupport() {
        setCookie('cookie_support', '1', g_time_short);
        console.log('cookie_support: ', getCookie('cookie_support'));
        if(getCookie('cookie_support')) {
            return true;
        }
        return false;
    }

    //set notification new message to title of client site
    function changeTitle(new_msg) {
        if(new_msg && !window.document.hasFocus()) {
            new_msg = true;
        }

        if (window != window.parent) {
            var post_message_data = {
                'change_title' : new_msg
            };
            postMessageToClient(post_message_data);
        } else {
            setTitle(new_msg);
        }
    }

    function setTitle(is_new_msg) {
        if(is_new_msg != void 0) {
            g_new_msg_flg = is_new_msg;
        }
        if(g_new_msg_flg && document.hasFocus()) {
            g_new_msg_flg = false;
        }
        if(g_new_msg_flg) {
            document.title = (document.title == g_original_title) ? g_new_msg_title : g_original_title;
            setTimeout(function(){
                setTitle();
            }, 3000);
        } else {
            if(document.title != g_original_title) {
                document.title = g_original_title;
            }
        }
    }

    function isMobile() {
        // return true;
        var check = false;
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
        })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    }

    function str_replace(str) {
        if(str){
            return str.replace(/\n/g, '<br/>');
        }
    }

    //Pulldown, Card payment create option for select input
    function initPulldownOption(init_option_flg) {
        if(init_option_flg == void 0) {
            init_option_flg = true;
        }

        var botchan_chat = $('#botchan-chat'),
            pulldown_template = $('#botchan-chat .pulldown_template'),
            pulldown_birthday_box = botchan_chat.find('.birthday_box'),
            pulldown_birthday_y_m_box = botchan_chat.find('.birthday_y_m_box'),
            pulldown_date_box = botchan_chat.find('.date_box'),
            pulldown_month_date_box = botchan_chat.find('.month_date_box'),

            card_payment_template   = $('.template_message .card_payment_template'),

            current_time = new Date(),
            current_year = current_time.getFullYear();

        //add width 100% for select2 not oversize
        pulldown_template.find('select').attr('style', 'width: 100%');
        card_payment_template.find('select').attr('style', 'width: 100%');

        //first option select
        var option_year_label = 'Year',
            option_month_label = 'Month',
            option_day_label = 'Day',
            option_hour_label = 'Hour',
            option_minute_label = 'Minute';
        if (!isEmpty($.fn.fileinputLocales[g_language])) {
            //add language script
            var l = $.fn.fileinputLocales[g_language];
            if (!isEmpty(l['year'])) option_year_label = l['year'];
            if (!isEmpty(l['month'])) option_month_label = l['month'];
            if (!isEmpty(l['day'])) option_day_label = l['day'];
            if (!isEmpty(l['hour'])) option_hour_label = l['hour'];
            if (!isEmpty(l['minute'])) option_minute_label = l['minute'];
        }
        var option_year_first = '<option class="first custom_label" value="">' + option_year_label + '</option>',
            option_month_first = '<option class="first custom_label" value="">' + option_month_label + '</option>',
            option_day_first = '<option class="first custom_label" value="">' + option_day_label + '</option>',
            option_hour_first = '<option class="first custom_label" value="">' + option_hour_label + '</option>',
            option_minute_first = '<option class="first custom_label" value="">' + option_minute_label + '</option>';

        //YEAR OPTION
        //Pulldown: select_year_box: 1935 to now
        var birthday_year_select;
        //Pulldown Birthday type
        if(pulldown_birthday_box.find('.select_year_box select').length) {
            birthday_year_select = pulldown_birthday_box.find('.select_year_box select');
            //create or change label first option
            if(!birthday_year_select.find('option.first').length) {
                birthday_year_select.append(option_year_first);
            } else {
                birthday_year_select.find('option.first').html(option_year_label);
            }

            if(init_option_flg) {
                for (var i=1935; i<=current_year; i++) {
                    birthday_year_select.append('<option value="'+i+'">' + i + '</option>');
                }
            }
        }
        //Pulldown Birthday Y-M type
        if(!isEmpty(pulldown_birthday_y_m_box.find('.select_year_box select'))) {
            birthday_year_select = pulldown_birthday_y_m_box.find('.select_year_box select');
            //create or change label first option
            if(!birthday_year_select.find('option.first').length) {
                birthday_year_select.append(option_year_first);
            } else {
                birthday_year_select.find('option.first').html(option_year_label);
            }

            if(init_option_flg) {
                for (var i=1935; i<=current_year; i++) {
                    birthday_year_select.append('<option value="'+i+'">' + i + '</option>');
                }
            }
        }

        //Pulldown: select_year_box: current year to +1
        if(!isEmpty(pulldown_date_box.find('.select_year_box select'))) {
            var date_year_select = pulldown_date_box.find('.select_year_box select');
            //create or change label first option
            if(!date_year_select.find('option.first').length) {
                date_year_select.append(option_year_first);
            } else {
                date_year_select.find('option.first').html(option_year_label);
            }

            if(init_option_flg) {
                for (var i=current_year; i<=(current_year+1); i++) {
                    date_year_select.append('<option value="'+i+'">' + i + '</option>');
                }
            }
        }

        //Card payment: select_year_box: current year to +10
        if(!isEmpty(card_payment_template.find('.select_year_box select'))) {
            var card_year_select = card_payment_template.find('.select_year_box select');
            //create or change label first option
            if(!card_year_select.find('option.first').length) {
                card_year_select.append(option_year_first);
            } else {
                card_year_select.find('option.first').html(option_year_label);
            }

            if(init_option_flg) {
                for (var i=current_year; i<=(current_year+10); i++) {
                    //convert 2018 -> 18
                    var new_val = i.toString().substring(2, 4);
                    card_year_select.append('<option value="'+new_val+'">' + new_val + '</option>');
                }
            }
        }

        //MONTH OPTION
        //Pulldown: select_month_box
        var pulldown_select_month_elm = null;
        if(!isEmpty(botchan_chat.find('.select_month_box select'))) {
            pulldown_select_month_elm = botchan_chat.find('.select_month_box select');
            //create or change label first option
            if(!pulldown_select_month_elm.find('option.first').length) {
                pulldown_select_month_elm.append(option_month_first);
            } else {
                pulldown_select_month_elm.find('option.first').html(option_month_label);
            }
        }

        if(init_option_flg) {
            for (var i=1; i<=12; i++) {
                if(i < 10) {
                    i = ('0' + i);
                }
                var option = '<option value="'+i+'">' + i + '</option>';
                if(pulldown_select_month_elm) {
                    pulldown_select_month_elm.append(option);
                }
            }
        }

        //DAY OPTTION
        //Pulldown: select_day_box
        var pulldown_select_day_elm = null;
        if(!isEmpty(botchan_chat.find('.select_day_box select'))) {
            pulldown_select_day_elm = botchan_chat.find('.select_day_box select');
            //create or change label first option
            if(!pulldown_select_day_elm.find('option.first').length) {
                pulldown_select_day_elm.append(option_day_first);
            } else {
                pulldown_select_day_elm.find('option.first').html(option_day_label);
            }
        }
        if(init_option_flg) {
            //Pulldown: add day option for month_date type: 1 to 31
            if(!isEmpty(pulldown_month_date_box.find('.select_day_box select'))) {
                for (var i=1; i<=31; i++) {
                    if(i < 10) {
                        i = ('0' + i);
                    }
                    var option = '<option value="'+i+'">' + i + '</option>';
                    pulldown_month_date_box.find('.select_day_box select').append(option);
                }
            }
        }


        //HOUR, MINUTE OPTION
        //Pulldown: select_hour_box
        if(!isEmpty(botchan_chat.find('.select_hour_box select'))) {
            var time_hour_select = botchan_chat.find('.select_hour_box select');
            //create or change label first option
            if(!time_hour_select.find('option.first').length) {
                time_hour_select.append(option_hour_first);
            } else {
                time_hour_select.find('option.first').html(option_hour_label);
            }

            if(init_option_flg) {
                for (var i=0; i<=23; i++) {
                    if(i < 10) {
                        i = ('0' + i);
                    }
                    time_hour_select.append('<option value="'+i+'">' + i + '</option>');
                }
            }
        }
        //Pulldown: select_minute_box
        if(!isEmpty(botchan_chat.find('.select_minute_box select'))) {
            var time_minute_select = botchan_chat.find('.select_minute_box select');
            //create or change label first option
            if(!time_minute_select.find('option.first').length) {
                time_minute_select.append(option_minute_first);
            } else {
                time_minute_select.find('option.first').html(option_minute_label);
            }

            if(init_option_flg) {
                for (var i=0; i<=59; i++) {
                    if(i < 10) {
                        i = ('0' + i);
                    }
                    time_minute_select.append('<option value="'+i+'">' + i + '</option>');
                }
            }
        }

        //refresh select2 existing to apply new label option
        initSelect2('refresh');
    }

    //set number day in month
    function getDayinMonth(date_box) {
        if(!isEmpty($(date_box))) {
            var select_year_val  = date_box.find('.select_year_box select').val(),
                select_month_val = date_box.find('.select_month_box select').val(),
                select_day       = date_box.find('.select_day_box select');

            if(!isEmpty(select_day)) {
                var option_selected = $(select_day).val();
                //remove old option
                $(select_day).find('option').not('.first').remove();

                //set new number day option
                if(!isEmpty(select_year_val) && !isEmpty(select_month_val)) {
                    var day_number = new Date(select_year_val, select_month_val, 0).getDate();
                    for (var i=1; i<=day_number; i++) {
                        if(i < 10) {
                            i = ('0' + i);
                        }
                        var option = '<option value="'+i+'">' + i + '</option>';
                        $(select_day).append(option);
                    }
                }

                //select option selected
                if(!isEmpty(option_selected) && !isEmpty($(select_day).find('option[value="' + option_selected + '"]'))) {
                    $(select_day).val(option_selected);
                } else {
                    $(select_day).val($(select_day).find('option').eq(0).val());
                }
                //reinit select2 for show option selected
                $(select_day).trigger('change.select2');
            }
        }
    }

    //set Minute select follow spacing
    function setSpacingMinuterSelect(select_elm, spacing) {
        if(!isEmpty(select_elm) && spacing > 0) {
            $(select_elm).find('option').not('.first').remove();

            for (var i=0; i<=59; i++) {
                if(i % parseInt(spacing) == 0) {
                    if(i < 10) {
                        i = ('0' + i);
                    }
                    $(select_elm).append('<option value="'+i+'">' + i + '</option>');
                }
            }
        }
    }

    //hide avatar if next message is sent by same from type bot or user
    function showHideAvatar(message_from_type) {
        if(g_avatar_show_type == message_from_type) {
            return false;
        } else {
            g_avatar_show_type = message_from_type;
        }
        return true;
    }

    //show #wc-message-group-content
    function showMessageContainer() {
        if($('#wc-message-group-content').hasClass('hidden')) {
            $('#wc-message-group-content').removeClass('hidden');
        }
        resetSlickCarousel();
    }

    //remove all old message in view
    function clearChatMessage() {
        $('#wc-message-group-content').empty();
    }

    //add message box to chat view
    function addChatMessage(elm_msg) {
        if(elm_msg) {
            //disble old next button and old form before add new message
            disableNextMessageButton();

            $('#wc-message-group-content').append(elm_msg);
            //focus for fix error not scroll textarea
            if(isMobile() && $('#wc-message-group-content .chat-right').last().find('textarea.readonly').length) {
                $('#wc-message-group-content .chat-right').last().find('textarea.readonly').focus().scrollTop(0);
            }
            //get prefecture list for towns_and_villages pulldown type if exist towns_and_villages select
            if(elm_msg.find('.pulldown_group .prefecture_city_box').length) {
                //efo_bot_send_pref socket IO will response
                socketIOEmit('efo_user_send_pref');
            }

            //add product to cart message and cart header view
            if(elm_msg.find('.cart_group').length) {
                for(var i = 0; i < g_cart_product_list.length; i++) {
                    productCartCreateElement(g_cart_product_list[i]);
                }
            }
            initIcheck();
            initSelect2();
            initAutokana();
            initSlick();
            initDateTimePicker();
            setTimeout(function () {
                reFormatPulldown();
            }, 1500);


            //remove button next message in radio, carousel alone not last message
            removeNextMessageAloneGroup();

            //init and view process question bar
            setProcessQuestion();
        }
    }

    //init icheck for input is not icheck
    function initIcheck() {
        var style = g_style_name_list[g_style_code_default];
        style = '-' + style;
        $('#wc-message-group-content input.icheck').each(function(i, e) {
            if(!$(this).parents('.icheck_input_box').length) {
                $(this).iCheck({
                    checkboxClass: 'icheck_input_box icheckbox_minimal' + style,
                    radioClass: 'icheck_input_box iradio_minimal' + style
                });
            }
        });
    }

    //init select2 for select is not select2
    function initSelect2(action) {
        var select2_option = {
            // language: {
            //     "noResults": function(){
            //         return "no_results_found'";
            //     }
            // },
            minimumResultsForSearch: -1,
            // dropdownParent: $('#wc-message-pane')
        };

        if(action != void 0 && !isEmpty(action)) {
            var select2_list = $('#wc-message-group-content select.select2-hidden-accessible');
            if(select2_list.length) {
                //if refresh: destroy and re-init
                if(action == 'refresh') {
                    select2_list.select2('destroy');
                    select2_list.select2(select2_option);
                }
            }

        } else {
            //init
            if(!isEmpty($('#wc-message-group-content select').not('.select2-hidden-accessible'))) {
                $('#wc-message-group-content select').not('.select2-hidden-accessible').select2(select2_option);
            }
        }
        //input.val(value).trigger('change.select2');
    }

    // check or uncheck item
    function icheckAuto(event, element) {
        if(element != void 0 && element != '') {
            if(event == 'check') {
                element.iCheck('check');

            } else if(event == 'uncheck') {
                element.iCheck('uncheck');

            } else if(event == 'disable') {
                element.iCheck('disable');
            }
        }
    }

    //init datetime picker
    function initDateTimePicker() {
        /*var curent_date = new Date();
        var curent_year = curent_date.getFullYear();
        var curent_month = curent_date.getMonth() + 1;
        var day_of_month = new Date(curent_year, curent_month, 0).getDate();
        if(curent_month < 9) {
            curent_month = '0' + curent_month;
        }*/

        $('#wc-message-group-content .calendar_group .calendar_select,' +
            ' #wc-message-group-content .calendar_group .calendar_period').find('input.content').each(function(i, e) {

            var widget_positioning = {
                horizontal: 'auto',
                vertical: 'auto'
            };

            if($(e).parents('.calendar_period').length && $(e).parents('.input_content').index() <= 0) {
                widget_positioning = {
                    horizontal: 'left',
                    vertical: 'auto'
                };
            }
            if(!$(e).hasClass('.datetimepicker')) {
                $(e).datetimepicker({
                    inline : false,
                    format: g_calendar_format,
                    widgetPositioning: widget_positioning,
                    ignoreReadonly: true,
                    useCurrent: false,
                    minDate: (!isEmpty($(e).attr('data-start_date'))) ? $(e).attr('data-start_date') : false,
                    daysOfWeekDisabled: ($(e).hasClass('weekend_off')) ? [0,6] : []
                    // minDate:  moment(curent_year + '/' + curent_month + '/1'),
                    // maxDate:  moment(curent_year + '/' + curent_month + '/' + day_of_month),
                    // debug: true
                }).addClass('datetimepicker');
                $(e).data("DateTimePicker").locale((g_language == 'vn') ? 'vi' : g_language);
            }
        });
        $('#wc-message-group-content .calendar_group .calendar_embed input.content').each(function(i, e) {
            if(!$(e).hasClass('.datetimepicker')) {
                $(e).datetimepicker({
                    inline: true,
                    format: g_calendar_format,
                    useCurrent: false,
                    minDate: (!isEmpty($(e).attr('data-start_date'))) ? $(e).attr('data-start_date') : false,
                    daysOfWeekDisabled: ($(e).hasClass('weekend_off')) ? [0,6] : []
                    // minDate:  moment(curent_year + '/' + curent_month + '/1'),
                    // maxDate:  moment(curent_year + '/' + curent_month + '/' + day_of_month)
                }).addClass('datetimepicker');
                $(e).data("DateTimePicker").locale((g_language == 'vn') ? 'vi' : g_language);
            }
        });
    }

    //reformat pulldown customize type
    function reFormatPulldown() {
        //Note: if add class .resize_width: case not or show scroll in webchat -> width .pulldown_group is change -> select in pulldown was fixed width is break
        $('#wc-message-group-content .chat-right').each(function(right_msg_index, right_msg) {
            var pulldown_group_width = $(right_msg).find('.pulldown_group').innerWidth();

            //set width for all customize one select
            if($(right_msg).find('.pulldown_group .one_select').not('.resize_width').find('.first_title').length
                || $(right_msg).find('.pulldown_group .one_select').not('.resize_width').find('.last_title').length) {

                var first_title_list = $(right_msg).find('.pulldown_group .one_select .first_title');
                var last_title_list = $(right_msg).find('.pulldown_group .one_select .last_title');

                var first_title_max_w = 0;
                var first_title_max_w_percent = 0;
                var last_title_max_w = 0;
                var last_title_max_w_percent = 0;

                //Set all width title follow first title max width
                $(first_title_list).each(function(i, e) {
                    if(!isEmpty($(e).innerWidth()) && $(e).innerWidth() > first_title_max_w) {
                        first_title_max_w = $(e).innerWidth();
                    }
                });
                $(last_title_list).each(function(i, e) {
                    if(!isEmpty($(e).innerWidth()) && $(e).innerWidth() > last_title_max_w) {
                        last_title_max_w = $(e).innerWidth();
                    }
                });
                if(first_title_max_w > 0) {
                    first_title_max_w_percent = Math.ceil(first_title_max_w / (pulldown_group_width / 100));
                    first_title_list.parent('.title_box').css('width', first_title_max_w_percent + '%');
                }
                if(last_title_max_w > 0) {
                    last_title_max_w_percent = Math.ceil(last_title_max_w / Math.floor(pulldown_group_width / 100));
                    last_title_list.parent('.title_box').css('width', last_title_max_w_percent + '%');
                }

                //Set width input_content: 100% - percentage of width of first title and last title
                $(right_msg).find('.pulldown_group .one_select').not('.customize_auto_size').each(function (i, e) {
                    var select_new_w = 100;
                    if($(e).find('.first_title').length) {
                        select_new_w -= first_title_max_w_percent;
                    }
                    if($(e).find('.last_title').length) {
                        select_new_w -= last_title_max_w_percent;
                    }
                    if(select_new_w > 0 && select_new_w < 100) {
                        $(e).find('.input_content').css('width', select_new_w + '%');
                        // $(e).addClass('resize_width');
                    }
                });
            }

            //set width for all customize two select
            if($(right_msg).find('.pulldown_group .two_select').not('.resize_width').length) {
                var input_separate = $(right_msg).find('.pulldown_group .two_select .input-group-addon');
                var input_separate_w = 0;
                // var input_separate_w_percent = 0;

                //get percentage of separate
                if(input_separate.length && !isEmpty(input_separate.innerWidth()) && input_separate.innerWidth()) {
                    // input_separate_w_percent = Math.ceil(input_separate.innerWidth() / (pulldown_group_width / 100));
                    input_separate_w = input_separate.innerWidth();
                }
                //Set width input_content: 100% - percentage of width separate
                // var input_content_w_percent = (100 - input_separate_w_percent) / 2;
                var input_content_w_new = (pulldown_group_width - input_separate_w - 2) / 2;
                if(input_content_w_new > 0) {
                    $(right_msg).find('.pulldown_group .two_select .input_content').css('width', input_content_w_new + 'px');
                    // $(right_msg).find('.pulldown_group .two_select').addClass('resize_width');
                }
            }

            //set width for all period time select
            if($(right_msg).find('.pulldown_group .period_time_box').not('.resize_width').length) {
                var input_separate = $(right_msg).find('.pulldown_group .period_time_box .input-group-addon');
                var input_separate_w = 0;
                // var input_separate_w_percent = 0;

                //get percentage of separate
                if(input_separate.length && !isEmpty(input_separate.innerWidth()) && input_separate.innerWidth()) {
                    // input_separate_w_percent = Math.ceil(input_separate.innerWidth() / (pulldown_group_width / 100));
                    input_separate_w = input_separate.innerWidth();
                }

                //Set width input_content: 100% - percentage of width separate
                // var input_content_w_percent = (100 - input_separate_w_percent) / 2;
                var input_content_w_new = (pulldown_group_width - input_separate_w - 1) / 2;
                if(input_content_w_new > 0) {
                    $(right_msg).find('.pulldown_group .period_time_box .period_time_item').css('width', input_content_w_new + 'px');
                    // $(right_msg).find('.pulldown_group .period_time_box').addClass('resize_width');
                }
            }
        });
    }

    //add next message button for each message
    function addNextMessageButton(msg_group, btn_text) {
        var next_message = $('.template_message .next_message').clone();
        //if msg_group is null then add next button to last right message
        if(isEmpty(msg_group )) {
            msg_group = $('#wc-message-group-content .chat-right').last();
        }
        if(!$(msg_group).find('.chat-body .next_message').length) {
            //change text button
            if(!isEmpty(btn_text)) {
                next_message.find('button').html(btn_text);
                next_message.find('button').attr('data-btn_next', btn_text);
            }
            $(msg_group).find('.chat-body').append(next_message);
        }
    }

    //disble old next button before add new
    function disableNextMessageButton(button_elm) {
        //if button_elm is null then disable all next button
        if(isEmpty(button_elm)) {
            if(!g_end_conversation_flg) {
                button_elm = $('#wc-message-group-content .next_message button').not('.updating');
            } else {
                button_elm = $('#wc-message-group-content .next_message button');
            }
        }
        if (!isEmpty($.fn.fileinputLocales[g_language])) {
            //set label ok for old message
            $(button_elm).each(function(i, e) {
                //not updating and exist language
                if(!$(e).hasClass('updating') && !isEmpty($.fn.fileinputLocales[g_language]['ok'])) {
                    $(e).html($.fn.fileinputLocales[g_language]['ok']);
                }
            });
        }
        if(!isEmpty(button_elm)) {
            button_elm.addClass('disabled');
        }
    }

    //enable next button
    function enableNextMessageButton(log_message_id) {
        if(!g_end_conversation_flg && !isEmpty(log_message_id)) {
            var message_box = getMessageBox(log_message_id);
            //reset captcha when edit data
            resetCaptchaInput(log_message_id);

            //enable next button
            if(!isEmpty(message_box.find('.next_message button'))) {
                var next_message_btn = message_box.find('.next_message button');
                //set class updating if update exist message. Check by disabled
                if(next_message_btn.hasClass('disabled')) {
                    next_message_btn.addClass('updating');
                }

                //set label next for old message
                //get btn_next text from custom db set in attr button
                if(!isEmpty(next_message_btn.attr('data-btn_next'))) {
                    next_message_btn.html(next_message_btn.attr('data-btn_next'));

                } else if (!isEmpty($.fn.fileinputLocales[g_language])) {
                    //set button label from default
                    if(next_message_btn.hasClass('updating')) {
                        if (!isEmpty($.fn.fileinputLocales[g_language]['update'])) next_message_btn.html($.fn.fileinputLocales[g_language]['update']);

                    } else {
                        if (!isEmpty($.fn.fileinputLocales[g_language]['next'])) next_message_btn.html($.fn.fileinputLocales[g_language]['next']);
                    }
                }
                next_message_btn.removeClass('disabled');
            }
        }
    }

    //disble old message form before add new
    function disableOldMessageForm() {
        var msg_group = $('#wc-message-group-content .chat-right');
        //Input, Textarea
        msg_group.find('.msg_group input:not(.icheck), .msg_group textarea').attr('readonly', 'readonly').addClass('notset');
        msg_group.find('.msg_group select').attr('disabled', 'disabled').addClass('notset');

        //Radio and Checked: set iCheck disable
        //disable icheck event before checked input by code
        g_icheck_change_event_flg = false;

        var icheck_input = msg_group.find('.msg_group input.icheck');
        icheckAuto('disable', icheck_input);
        icheck_input.addClass('notset');

        //enable icheck event after checked input by code
        g_icheck_change_event_flg = true;

        //Carousel: add class disable for carousel button
        msg_group.find('.carousel_group button.carousel_select').addClass('disabled');

        //File upload: add class disable for button upload
        msg_group.find('.upload_group button.file_select_btn').addClass('disabled');

        //Calendar
        $('#wc-message-group-content .calendar_group .calendar_select,' +
            '#wc-message-group-content .calendar_group .calendar_period').find('input.content').each(function(i, e) {
                $(this).data("DateTimePicker").disable();
        });
    }

    //set active option after selected
    function activeOptionSelected(elm) {
        var msg_group = $(elm).parents('.msg_group');
        if(g_icheck_change_event_flg && !isEmpty(msg_group)) {
            var log_message_id = $(elm).parents('.chat-body').attr('data-message_id');
            setTimeout(function () {
                if(msg_group.find('li').length) {
                    msg_group.find('li').each(function (i, e) {
                        $(e).find('.icheck_input_box').each(function (icheck_input_index, icheck_input_box) {
                            if($(icheck_input_box).hasClass('checked')) {
                                $(e).addClass('active');

                                //set active for item radio image type
                                if($(icheck_input_box).parents('.radio_img_item').length) {
                                    $(icheck_input_box).parents('.radio_img_item').first().addClass('active');
                                }

                            } else {
                                $(e).removeClass('active');

                                //remove active for item radio image type
                                if($(icheck_input_box).parents('.radio_img_item').length) {
                                    $(icheck_input_box).parents('.radio_img_item').first().removeClass('active');
                                }
                            }
                        });
                    });
                }
                //enable next button when change option
                enableNextMessageButton(log_message_id);
            }, 100);
        }
    }

    //validae and show next message button
    function validateMessage(log_message_id) {
        var result = true;
        var message_box = getMessageBox(log_message_id);

        if(!isEmpty(message_box)) {
            var validation_data = {
                'file_upload_type_list' : g_file_upload_type_list,
            };
            result = validation_message(message_box, validation_data);
            // console.log('validate: ' + result);
        }
        return result;
    }

    //call next message event
    function nextMessage(log_message_id, verify_captcha_flg) {
        if(g_next_mesage_flg && g_icheck_change_event_flg && log_message_id != void 0 && log_message_id != '') {

            //if edit: clear next message and add question_edit_flg send to server
            var is_remove_after_msg = removeAfterMessage(log_message_id);
            if(is_remove_after_msg) {
                g_question_edit_flg = true;
            }

            var product_cart_validate = productCartEmptyValidate(log_message_id);
            if(product_cart_validate) {
                var message_validate = validateMessage(log_message_id);
                if(message_validate) {
                    var answer_data = getMessageAnswer(log_message_id);
                    //validate block message, need a message is not empty in block message for next message
                    var block_message_validate = validateBlockMessage(log_message_id, answer_data);

                    if(block_message_validate) {
                        var message_box = getMessageBox(log_message_id);

                        //verify captcha if exist
                        var wait_verify = false;
                        if(verify_captcha_flg != void 0 && verify_captcha_flg && message_box.find('.captcha_group').not('.verified').length) {
                            wait_verify = verifyCaptchaMessageBox(log_message_id);
                            //Note: after captcha verified. nextMessage function will called to next message
                        }
                        //if not wait verify
                        if(!wait_verify) {
                            g_next_mesage_flg = false;

                            //if edit: clear next message and add question_edit_flg send to server
                            if(g_question_edit_flg) {
                                answer_data['question_edit_flg'] = true;
                                g_question_edit_flg = false;
                            }
                            //send question count to server
                            answer_data['question_count'] = $('#wc-message-group-content .chat-right').length;
                            //send preview_flg to server
                            if(!isEmpty(g_preview_flg)) {
                                answer_data['preview_flg'] = g_preview_flg;
                            }

                            //console.log('answer_data: ', answer_data);
                            socketIOEmit('efo_user_send_message', answer_data);

                            //disable next button after answer
                            disableNextMessageButton(message_box.find('.next_message button'));

                            //reset g_next_mesage_flg to can add next message
                            if(!g_next_mesage_flg) {
                                setTimeout(function () {
                                    g_next_mesage_flg = true;
                                }, 2000);
                            }

                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    //remove all message after message have log_message_id
    //return true: if have remove after message
    function removeAfterMessage(log_message_id) {
        var message_box = getMessageBox(log_message_id);
        if($('#wc-message-group-content .wc-message-wrapper:gt(' + message_box.index() + ')').length) {
            $('#wc-message-group-content .wc-message-wrapper:gt(' + message_box.index() + ')').remove();
            return true;
        }
        return false;
    }

    //get answer in message box
    function getMessageAnswer(log_message_id) {
        var result = {
            "connect_page_id" : g_connect_page_id,
            "user_id" : g_user_id,
            "log_message_id" : log_message_id,
            "b_position" : '',
            "answer" : [],
        };
        var message_box = getMessageBox(log_message_id);
        if(message_box != void 0) {
            result['b_position'] = message_box.find('.chat-body').data('b_position');

            $(message_box).find('.msg_group').each(function(msg_index, msg_group) {
                var msg_item_type = $(msg_group).data('message_type');
                switch (msg_item_type) {
                    case g_message_user_type['text']:
                    case g_message_user_type['captcha']:
                    case g_message_user_type['add_to_cart']:
                    case g_message_user_type['request_document']:
                    {
                        result['answer'].push(null);
                    }
                        break;
                    case g_message_user_type['input']: {
                        var input_type = $(msg_group).data('input_type');
                        if(!isEmpty(input_type)) {
                            if(input_type == g_input_type['password_confirm'] || input_type == g_input_type['email_confirm']) {
                                var input_first = $(msg_group).find('input.content').first();
                                if(!isEmpty(input_first)) {
                                    result['answer'].push([input_first.val()]);
                                }
                            } else {
                                var input_list = $(msg_group).find('input.content');
                                if(input_list != void 0 && input_list.length) {
                                    var input_value_list = $.map(input_list, function(c){return c.value;});
                                    result['answer'].push(input_value_list);
                                }
                            }
                        }
                    }
                        break;
                    case g_message_user_type['textarea']: {
                        var textarea_input = $(msg_group).find('textarea.content'),
                            textarea_value = '';

                        //if textarea input is not readonly type then get value
                        if(!textarea_input.hasClass('readonly')) {
                            textarea_value = textarea_input.val();
                        }
                        result['answer'].push(textarea_value);
                    }
                        break;
                    case g_message_user_type['radio']: {
                        var radio_container = $(msg_group).find('.radio_container li');
                        if(radio_container != void 0 && radio_container.length) {
                            var radio_selected = $.map(radio_container.find('input.option_input:checked'), function(c){return c.value;});
                            result['answer'].push(radio_selected);
                        }
                    }
                        break;
                    case g_message_user_type['checkbox']: {
                        var checkbox_container = $(msg_group).find('.checkbox_container li');
                        if(checkbox_container != void 0 && checkbox_container.length) {
                            var checkbox_selected = $.map(checkbox_container.find('input.option_input:checked'), function(c){return c.value;});
                            result['answer'].push(checkbox_selected);
                        }
                    }
                        break;
                    case g_message_user_type['postal_code']: {
                        var postalcode_input_list = $(msg_group).find('input.content');

                        if(postalcode_input_list != void 0 && postalcode_input_list.length) {
                            var postalcode_answer = {};
                            $(postalcode_input_list).each(function(input_index, input_elm) {
                                var postalcode_input_name = $(input_elm).attr('name');
                                if(!isEmpty(postalcode_input_name)) {
                                    postalcode_answer[postalcode_input_name] = $(input_elm).val();
                                }
                            });
                            result['answer'].push(postalcode_answer);
                        }
                    }
                        break;
                    case g_message_user_type['terms_of_use']: {
                        var terms_use_input_box = $(msg_group).find('.input_box');
                        if(!isEmpty(terms_use_input_box)) {
                            var terms_selected = $.map(terms_use_input_box.find('input.option_input:checked'), function(c){return c.value;});
                            result['answer'].push(terms_selected);
                        }
                    }
                        break;
                    case g_message_user_type['pulldown']: {
                        var pulldown_select = $(msg_group).find('.select_box select');
                        if(!isEmpty(pulldown_select)) {
                            var pulldown_select_val = $.map(pulldown_select, function(c){return c.value;});
                            result['answer'].push(pulldown_select_val);
                        }
                    }
                        break;
                    case g_message_user_type['carousel']: {
                        var carousel_item_active = $(msg_group).find('.carousel_item.active'),
                            carousel_item_index = '';
                        if(!isEmpty(carousel_item_active)) {
                            carousel_item_index = carousel_item_active.index()
                        }
                        result['answer'].push([carousel_item_index]);
                    }
                        break;
                    case g_message_user_type['card_payment']: {
                        var card_input = $(msg_group).find('.input_box input, .select_box select');
                        if(!isEmpty(card_input)) {
                            var card_data = {};
                            card_input.each(function(i, e) {
                                var input_name = $(e).attr('name');
                                if(!isEmpty(input_name)) {
                                    input_name = input_name.replace(/card_/g, '');
                                    card_data[input_name] = $(e).val();
                                }
                            });
                            card_data['expire'] = card_data['year'] + card_data['month'];
                            result['answer'].push(card_data);
                        }
                    }
                        break;
                    case g_message_user_type['file']: {
                        var file_input = $(msg_group).find('input.file_input');
                        if(g_cms_server_url && !isEmpty(file_input) && !isEmpty(file_input[0].files[0])) {
                            var url = g_cms_server_url + '/efo/' + g_connect_page_id + '/file_upload';
                            //create file name
                            file_input = file_input[0].files[0];

                            var file_upload_index = $(msg_group).index(),
                                file_name_origin = file_input.name,
                                file_type = file_name_origin.split('.').pop(),
                                file_name_new = g_user_id.replace(g_connect_page_id + '_','') + '_' + file_upload_index + '.' + file_type;

                            //init and add file to form data
                            var form_data = new FormData();
                            form_data.append('file', file_input);
                            form_data.append('file_name', file_name_new);

                            //upload process
                            var ajax_upload = ajaxUpload(url, form_data, msg_group);
                            result['answer'].push({
                                'file_name_origin' : file_name_origin,
                                'file_path' : ajax_upload.file_path
                            });

                            //create link open file
                            if(g_azure_storage_upload_url && !isEmpty(ajax_upload.file_path)) {
                                $(msg_group).find('.title a').attr('href', g_azure_storage_upload_url + ajax_upload.file_path);
                                $(msg_group).find('.title a').attr('target', '_blank');
                            }

                        } else {
                            result['answer'].push({
                                'file_name_origin' : $(msg_group).find('input.file_name_origin').val(),
                                'file_path' : $(msg_group).find('input.file_path').val(),
                            });
                        }
                    }
                        break;
                    case g_message_user_type['calendar']: {
                        var calendar_input = $(msg_group).find('input.content');

                        if(calendar_input.length <= 1) {
                            var calendar_date = getDateFromString(calendar_input.val());
                            result['answer'].push({
                                'year' : calendar_date.year,
                                'month' : calendar_date.month,
                                'day' : calendar_date.day
                            });
                        } else {
                            var calendar_period_value = [];
                            $(calendar_input).each(function (i, e) {
                                var calendar_date = getDateFromString($(e).val());
                                calendar_period_value.push({
                                    'year' : calendar_date.year,
                                    'month' : calendar_date.month,
                                    'day' : calendar_date.day
                                });
                            });
                            result['answer'].push(calendar_period_value);
                        }
                    }
                        break;
                }
            });
        }
        return result;
    }

    //set value from answer data to input
    function setAnswerMessage(msg_group, answer_data) {
        if(answer_data != void 0 && msg_group != void 0) {
            var msg_item_type = $(msg_group).data('message_type');

            //disable icheck event before checked input by code
            g_icheck_change_event_flg = false;

            switch (msg_item_type) {
                case g_message_user_type['input']: {
                    var input_type = $(msg_group).data('input_type');
                    if(!isEmpty(input_type)) {
                        //if is password_confirm, email_confirm: set value for all input
                        if(input_type == g_input_type['password_confirm'] || input_type == g_input_type['email_confirm']) {
                            $(msg_group).find('input.content').val(answer_data[0]);

                        } else {
                            //set value for all input follow index
                            $(answer_data).each(function (input_index, input_value) {
                                var input_input = $(msg_group).find('input.content').eq(input_index);
                                if(!isEmpty(input_input) && !isEmpty(input_value)) {
                                    input_input.val(input_value);
                                }
                            });
                        }
                    }
                }
                    break;
                case g_message_user_type['textarea']: {
                    var textarea_input = $(msg_group).find('textarea.content'),
                        textarea_value = '';

                    //if textarea input is not readonly type then get value
                    if(!isEmpty(textarea_input) && !textarea_input.hasClass('readonly')) {
                        textarea_value = textarea_input.val(answer_data);
                    }
                }
                    break;
                case g_message_user_type['radio']: {
                    var radio_container = $(msg_group).find('.radio_container li');
                    if(!isEmpty(radio_container)) {
                        $(answer_data).each(function (input_index, input_value) {
                            if(!isEmpty($(radio_container).find('input[value="'+input_value+'"]'))) {
                                var radio_item = $(radio_container).find('input[value="'+input_value+'"]');
                                icheckAuto('check', radio_item);
                                //set active for this item
                                radio_item.parents('li').addClass('active');

                                //set active for item radio image type
                                if(radio_item.parents('.radio_img_item').length) {
                                    radio_item.parents('.radio_img_item').first().addClass('active');
                                }
                            }
                        });
                    }
                }
                    break;
                case g_message_user_type['checkbox']: {
                    var checkbox_container = $(msg_group).find('.checkbox_container li');
                    if(!isEmpty(checkbox_container)) {
                        //uncheck and recheck
                        icheckAuto('uncheck', $(checkbox_container).find('input.icheck'));
                        $(checkbox_container).removeClass('active');

                        $(answer_data).each(function (input_index, input_value) {
                            if(!isEmpty($(checkbox_container).find('input[value='+input_value+']'))) {
                                var checkbox_item = $(checkbox_container).find('input[value='+input_value+']');
                                icheckAuto('check', checkbox_item);
                                //set active for this item
                                checkbox_item.parents('li').addClass('active');
                            }
                        });
                    }
                }
                    break;
                case g_message_user_type['postal_code']: {
                    setPostalCodeDataToForm(msg_group, null, answer_data);
                }
                    break;
                case g_message_user_type['terms_of_use']: {
                    var terms_use_input_box = $(msg_group).find('.input_box');
                    if(!isEmpty(terms_use_input_box)) {
                        $(answer_data).each(function (input_index, input_value) {
                            icheckAuto('check', $(terms_use_input_box).find('input[value='+input_value+']'));
                        });
                    }
                }
                    break;
                case g_message_user_type['pulldown']: {
                    var pulldown_select = $(msg_group).find('.select_box select');
                    if(!isEmpty(pulldown_select)) {
                        $(answer_data).each(function (select_index, select_value) {
                            if(!isEmpty(pulldown_select.eq(select_index))) {
                                //if is day select then init option for day select before set value. Except month_date type
                                if(!pulldown_select.eq(select_index).parents('.month_date_box').length && pulldown_select.eq(select_index).parent().hasClass('select_day_box')) {
                                    getDayinMonth(pulldown_select.parents('.select_box'));
                                }
                                if(pulldown_select.eq(select_index).parents('.prefecture_city_box').length) {
                                    pulldown_select.eq(select_index).attr('data-value', select_value);
                                }

                                //select option
                                if(!isEmpty(pulldown_select.eq(select_index).find('option[value="' + select_value + '"]'))) {
                                    pulldown_select.eq(select_index).val(select_value);
                                }
                            }
                        });
                    }
                }
                    break;
                case g_message_user_type['carousel']: {
                    var carousel_container = $(msg_group).find('.carousel_container');
                    if(!isEmpty(carousel_container) && !isEmpty(answer_data[0])) {
                        if(Number.isInteger(answer_data[0])) {
                            $(carousel_container).find('.carousel_item').eq(answer_data[0]).addClass('active');
                        }
                    }
                }
                    break;
                case g_message_user_type['card_payment']: {
                    var card_input_list = $(msg_group).find('.input_box input, .select_box select');
                    if(!isEmpty(card_input_list)) {
                        for(var input_name in answer_data) {
                            var input_name_elm = 'card_' + input_name;

                            if(!isEmpty(answer_data[input_name])) {
                                var card_input = $(msg_group).find('.input_box input[name="' + input_name_elm +'"], .select_box select[name="' + input_name_elm + '"]');
                                if(!isEmpty(card_input)) {
                                    card_input.val(answer_data[input_name]);
                                }
                            }
                        }
                    }
                }
                    break;
                case g_message_user_type['file']: {
                    if(!isEmpty(answer_data['file_name_origin'])) {
                        //create link open file
                        if(g_azure_storage_upload_url && !isEmpty(answer_data['file_path'])) {
                            $(msg_group).find('.title a').attr('href', g_azure_storage_upload_url + answer_data['file_path']);
                            $(msg_group).find('.title a').attr('target', '_blank');
                        }
                        $(msg_group).find('.title a').html(answer_data['file_name_origin']);

                        $(msg_group).find('input.file_name_origin').val(answer_data['file_name_origin']);
                        $(msg_group).find('input.file_path').val(answer_data['file_path']);
                    }
                }
                    break;
                case g_message_user_type['calendar']: {
                    var calendar_input = $(msg_group).find('input.content');
                    if(!isEmpty(calendar_input)) {
                        if(calendar_input.length <= 1) {
                            var calendar_value = g_calendar_format;
                            calendar_value = calendar_value.replace(/Y/g, answer_data['year']);
                            calendar_value = calendar_value.replace(/MM/g, answer_data['month']);
                            calendar_value = calendar_value.replace(/DD/g, answer_data['day']);
                            calendar_input.val(calendar_value);
                        } else {
                            $(calendar_input).each(function(i, e) {
                                if(!isEmpty(answer_data[i])) {
                                    var calendar_value = g_calendar_format;
                                    calendar_value = calendar_value.replace(/Y/g, answer_data[i]['year']);
                                    calendar_value = calendar_value.replace(/MM/g, answer_data[i]['month']);
                                    calendar_value = calendar_value.replace(/DD/g, answer_data[i]['day']);
                                    $(e).val(calendar_value);
                                }
                            });
                        }
                    }
                }
                    break;
            }

            //enable icheck event after checked input by code
            g_icheck_change_event_flg = true;
        }
    }

    //set postcal code data to form
    function setPostalCodeDataToForm(msg_group, log_message_id, data) {
        //get msg_group follow log_message_id
        if(!isEmpty(log_message_id)) {
            msg_group = getMessageBox(log_message_id);
        }

        if(!isEmpty(msg_group) && !isEmpty(data)) {
            var postal_code_input = $(msg_group).find('.postal_code input');
            var prefectures_input = $(msg_group).find('.prefectures input');
            var municipality_input = $(msg_group).find('.municipality input');
            var street_number_input = $(msg_group).find('.street_number input');
            var building_name_input = $(msg_group).find('.building_name input');

            if(!isEmpty(postal_code_input)) {
                var postalcode_val = (!isEmpty(data.data) && !isEmpty(data.data.zipcode)) ? data.data.zipcode : data.postal_code;
                if(!isEmpty(postalcode_val)) {
                    postal_code_input.val(postalcode_val);
                }
            }
            if(!isEmpty(prefectures_input)) {
                var prefectures_val = (!isEmpty(data.pref)) ? data.pref : data.prefectures;
                if(!isEmpty(prefectures_val)) {
                    prefectures_input.val(prefectures_val);
                }
            }
            if(!isEmpty(municipality_input)) {
                var municipality_val = (!isEmpty(data.city)) ? data.city : data.municipality;
                if(!isEmpty(municipality_val)) {
                    municipality_input.val(municipality_val);
                }
            }
            if(!isEmpty(street_number_input)) {
                var street_val = (!isEmpty(data.street)) ? data.street : data.street_number;
                if(!isEmpty(street_val)) {
                    street_number_input.val(street_val);
                }
            }
            if(!isEmpty(building_name_input)) {
                var building_val = (!isEmpty(data.building)) ? data.building : data.building_name;
                if(!isEmpty(building_val)) {
                    building_name_input.val(building_val);
                }
            }
        }
    }

    //validate block message, need a message is not empty in block message for next message
    function validateBlockMessage(log_message_id, answer_data) {
        /*var result = false;

        if(!isEmpty(answer_data)) {
            $(answer_data.answer).each(function(answer_index, answer_item) {
                if (answer_item.length) {
                    $(answer_item).each(function (item_index, item_value) {
                        console.log(item_value);
                        if (item_value != "" && item_value != null) {
                            result = true;
                            return;
                        }
                    });
                }
            });
        }*/
        var result = true;
        if(!isEmpty(log_message_id) && !isEmpty(answer_data) && g_block_message_require_list.indexOf(log_message_id) != -1) {
            result = false;
            $(answer_data.answer).each(function(answer_index, answer_item) {
                if ($.isArray(answer_item)) {
                    var number_answers_on_field_not_null = 0;
                    $(answer_item).each(function (item_index, item_value) {
                        if (item_value != "" && item_value != null) {
                            number_answers_on_field_not_null += 1;
                        }
                    });
                    if (answer_item.length != 0 && answer_item.length == number_answers_on_field_not_null) {
                        result = true;
                        return;
                    }
                }
            });
        }

        //show error message
        if(!result) {
            var error_msg = 'Please input at least 1 field.';
            var msg_group = getMessageBox(log_message_id);

            if(!isEmpty($.fn.fileinputLocales[g_language]) && !isEmpty($.fn.fileinputLocales[g_language]['validate_require_one_field'])) {
                error_msg = $.fn.fileinputLocales[g_language]['validate_require_one_field'];
            }
            createNotify(error_msg, msg_group.find('.chat-body'), null, false, false);
        }
        return result;
    }

    //get message box element by log_message_id
    function getMessageBox(log_message_id) {
        return $('#wc-message-group-content .chat-body[data-message_id=' + log_message_id + ']').parents('.wc-message-wrapper.chat-right');
    }

    //check end conversation: return true if is end
    function endConversation() {
        console.log('End this conversation.');
        g_end_conversation_flg = true;

        //disable cart header
        g_cart_product_list = [];
        $('.chat-header .header_cart_box').addClass('disabled');
        //disable old message and all next button
        disableNextMessageButton();
        disableOldMessageForm();
        //view process question bar
        setProcessQuestion();

        cvGoogleAnalytics();

        //send to end conversation to client
        var post_message_data = {
            'conversation_end': {}
        };
        postMessageToClient(post_message_data);

        //Must run after all postmessage event
        clearAllCookie();
    }

    //clear cookie existing
    function clearAllCookie() {
        //clear cookie in server site
        if(g_cookie_support) {
            setCookie(g_cookie_user_id_name + '_' + g_connect_page_id, g_user_id, 0);
            setCookie(g_cookie_connect_page_id_name + '_' + g_connect_page_id, g_connect_page_id, 0);
        }
        //clear cookie in client site
        var post_message_data = {
            'clear_cookie': true
        };
        postMessageToClient(post_message_data);

        g_connect_page_id = undefined;
        g_user_id = undefined;
    }

    //clear cookie and init new conversation
    function initNewConversation() {
        clearAllCookie();
        //create new conversation
        g_is_join_room = false;
        receiveEventClient();
    }

    //set process question status
    function setProcessQuestion() {
        if(g_question_count != void 0) {
            var footer = $('.chatview-container .panel-footer'),
                process_label = footer.find('.process_label'),
                progress_bar = footer.find('.progress-bar');

            if($('#wc-message-group-content .chat-right').length) {
                var process_time_update = 0;
                //show footer, process bar if exist any right .msg_group
                if(footer.find('.progress').hasClass('hidden')) {
                    //set show after showMessageContainer function
                    process_time_update = 1150;
                    setTimeout(function () {
                        footer.find('.progress').removeClass('hidden');
                    }, 1100);
                }

                setTimeout(function () {
                    var question_current = $('#wc-message-group-content .chat-right').length;
                    //if conversation is end then current question = question total
                    if(g_end_conversation_flg) {
                        g_question_count = question_current;
                    }
                    var process_percentage = (question_current / g_question_count) * 100;

                    process_label.html(question_current + ' / '+ g_question_count);
                    progress_bar.css('width', process_percentage + '%');
                }, process_time_update);
            }
        }
    }

    //check exist file
    function checkFileExist(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, false);
        xhr.send();

        if (xhr.status == "404") {
            return false;
        } else {
            return true;
        }
    }

    //remove next button when select an option in radio alone OR radio alone, carousel alone is not last message
    function removeNextMessageAloneGroup(log_message_id) {
        if(isEmpty(log_message_id)) {
            //remove next message button in radio, carousel message alone and is not last message
            var question_showing = $('#wc-message-group-content .chat-right').length;
            $('#wc-message-group-content .chat-right').each(function(msg_right_index, msg_right_elm) {
                //remove button if is not last message and radio only, OR only 1 message is radio type only
                if((question_showing <= 1 || ((msg_right_index + 1) < question_showing))
                    && $(msg_right_elm).find('.msg_group').length == 1
                    && ($(msg_right_elm).find('.msg_group.radio_group').length == 1 || $(msg_right_elm).find('.msg_group.carousel_group.is_next_message').length == 1)
                ) {
                    $(msg_right_elm).find('.next_message').remove();
                }
            });
        } else {
            //remove in msg_group have log_message_id
            var message_box = getMessageBox(log_message_id);
            if(!isEmpty(message_box)) {
                if(message_box.find('.msg_group').length <= 1
                    && (message_box.find('.msg_group').hasClass('radio_group')
                    || (message_box.find('.msg_group').hasClass('carousel_group') && message_box.find('.msg_group').hasClass('is_next_message'))
                    )
                ) {
                    message_box.find('.next_message').fadeOut(500, function(){
                        $(this).remove();
                    });
                }
            }
        }
    }

    //check input is text and next message is katakana type: write converse from autokana to katakana input
    function initAutokana() {
        $('#wc-message-group-content .chat-right').not('.autokana').each(function (chat_index, chat) {
            //Only 2 input in a .chat-right: 1: input text, 2: input katakana
            if($(chat).find('.input_group').length == 2) {
                $(chat).find('.input_group').each(function (input_group_index, input_group) {

                    var input_type = $(input_group).data('input_type');
                    if(!isEmpty(input_type) && input_type == g_input_type['text']) {
                        $(input_group).find('input.content').each(function (input_index, input_elm) {

                            //set autokana in next .msg_group for input is katakana type
                            var input_group_next  = $(input_group).next('.input_group');
                            if(input_group_next.length) {
                                var input_input_next = input_group_next.find('input.content');

                                //input after　is katakana type
                                if(input_input_next.length && input_input_next.hasClass(g_validate_types.validate_katakana)) {
                                    //case: one input in a row
                                    if(input_input_next.length <= 1) {
                                        $.fn.autoKana($(input_elm), input_input_next, {
                                            katakana : true
                                        });
                                    } else if(input_input_next.length == 2) {
                                        //case: two input in a row
                                        $.fn.autoKana($(input_elm), input_input_next.eq(input_index), {
                                            katakana : true
                                        });
                                    }
                                }
                            }
                        });
                    }
                });
                //add class to chat box
                $(chat).addClass('autokana');
            }
        });
    }

    //init slick carousel: init_slick_number = delay until #wc-message-group-content show
    var init_slick_number = 0;
    function initSlick() {
        if($('#wc-message-group-content .chat-body .carousel_container').not('.slick-initialized').length) {
            if(!$('#wc-message-group-content').innerWidth() && init_slick_number <= 10) {
                init_slick_number++;
                setTimeout(function () {
                    initSlick();
                }, 1000);
            } else {
                var windown_w;
                if(isMobile()) {
                    windown_w = screen.width - 25;
                    //fix carousel in iphone
                    $('#wc-message-group-content').css('width', windown_w);
                } else {
                    windown_w = $('#wc-message-group-content').innerWidth();
                }
                init_slick_number = 0;
                var item_width = 272;
                var item_show_num = 3;

                //set number slide show
                if(Math.ceil(windown_w / item_width) < item_show_num) {
                    item_show_num = Math.floor(windown_w / item_width);
                    if(item_show_num > 3) {
                        item_show_num = 3;
                    }
                    item_show_num = (item_show_num > 0) ? item_show_num : 1;
                }

                var option = {
                    slidesToScroll: 1,
                    arrows: true,
                    dots: false,
                    infinite: false,
                    autoplay: false,
                    cssEase: 'linear',
                    slidesToShow: item_show_num
                };

                $('#wc-message-group-content .chat-body .carousel_container').not('.slick-initialized').each(function(i, e) {
                    $(e).slick(option);
                    //active slide have .active class
                    var carousel_item_active = $(e).find('.carousel_item.active');
                    if(carousel_item_active.length) {
                        $(e).slick('slickGoTo', carousel_item_active.index());
                    }

                    //check to show, hide button after init slide
                    //delay 1500 ms for issue not show button in IOS
                    setTimeout(function () {
                        checkCarouselButton($(e));
                    }, 1500);
                    //check to show, hide button after click next, prev slide
                    $(e).on('afterChange', function(event, slick, currentSlide, nextSlide) {
                        checkCarouselButton(event);
                    });
                });
            }
        }
    }

    //check button next, prev carousel
    function checkCarouselButton(slick_elm) {
        if(!isEmpty(slick_elm)) {
            var msg_group;
            if(!isEmpty(slick_elm.target)) {
                msg_group = $(slick_elm.target).parents('.msg_group');
            } else {
                msg_group = $(slick_elm).parents('.msg_group');
            }

            if(!isEmpty(msg_group)) {
                var button_prev = $(msg_group).find('button.slick-prev'),
                    button_next = $(msg_group).find('button.slick-next');
                if(button_prev.hasClass('slick-disabled') || button_prev.hasClass('slick-hidden')){
                    button_prev.hide();
                } else {
                    button_prev.show();
                }
                if(button_next.hasClass('slick-disabled') || button_next.hasClass('slick-hidden')){
                    button_next.hide();
                } else {
                    button_next.show();
                }
            }
        }
    }

    //reset slick carousel
    function resetSlickCarousel() {
        $('#wc-message-group-content .chat-body .carousel_container.slick-initialized').slick("refresh");
    }

    //return format card number
    function card_number_format(value) {
        var number = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        var matches = number.match(/\d{4,16}/g);
        var match = matches && matches[0] || '';
        var parts = [];
        for (i=0, len=match.length; i<len; i+=4) {
            parts.push(match.substring(i, i+4));
        }
        if (parts.length) {
            // return parts.join(' ');
            return parts.join('');
        } else {
            return number;
        }
    }

    // event end form efo
    function cvGoogleAnalytics() {
        try {
            var post_message_data =  {
                'cv_data' : g_cv_setting,
                'gtag_data' : {
                    'event_category': 'botchan_efo',
                    'event_action': 'end_form'
                }
            };
            postMessageToClient(post_message_data);

        } catch(e) {
            window.console && window.console.log(e);
        }
    }

    /**
     * upload file to url
     * @param url
     * @param data
     * @returns {boolean}
     */
    function ajaxUpload(url, data, msg_group) {
        var result = false;
        if(!isEmpty(url) && !isEmpty(data)) {
            //show upload process label
            if(!isEmpty(msg_group)) {
                $(msg_group).find('.loading').removeClass('hidden');
            }

            $.ajax({
                url: url,
                type: 'POST',
                data: data,
                async: false,
                processData: false,
                contentType: false,
                mimeTypes: 'multipart/form-data',
                beforeSend: function () {
                    console.log('Uploading');
                },
                complete: function () {
                    console.log('Upload complete');
                    if(!isEmpty(msg_group)) {
                        $(msg_group).find('input.file_input').val('');
                        $(msg_group).find('.loading').addClass('hidden');
                    }
                },
                success: function(response) {
                    // console.log('Upload success', response);
                    result = response;
                    console.log(result);
                },
                error: function(response) {
                    //console.log('Upload error', response);
                    result = response;
                    var error = response.responseJSON;
                    if(!isEmpty(msg_group) && !isEmpty(error.errors)) {
                        $(msg_group).append("<label class='error'>" + error.errors + "</label>");
                    }
                }
            });
        }
        return result;
    }

    //get year, month, day from string
    function getDateFromString(date_str) {
        var calendar_year = '';
        var calendar_month = '';
        var calendar_day = '';
        if(!isEmpty(date_str)) {
            date_str = moment(date_str, g_calendar_format);
            calendar_year = date_str.year();
            calendar_month = date_str.month() + 1;
            calendar_day = date_str.date();
        }
        return {
            'year' : calendar_year,
            'month' : calendar_month,
            'day' : calendar_day
        }
    }

    //send captcha text in a message box to server to verify
    function verifyCaptchaMessageBox(log_message_id) {
        //is_wait_verify = fasle: not captcha vefiry. True: need wait for verify captcha in efo_bot_send_captcha event socket
        var is_wait_verify = false;

        var message_box = getMessageBox(log_message_id);
        g_captcha_process_list = [];
        if(message_box.find('.captcha_group').length) {
            //get all captcha input in .captcha_group
            $(message_box.find('.captcha_group')).each(function(captcha_group_index, captcha_group) {
                var input = $(captcha_group).find('input.content'),
                    input_name = input.attr('name'),
                    input_val = input.val();

                //check not exist in process and exist config of that input
                if(!isEmpty(input_val)
                    && g_captcha_process_list.indexOf(input_name) == -1
                    && !isEmpty(g_captcha_config_list[input_name])
                ) {
                    //add input captcha name to process list global variable
                    g_captcha_process_list.push(input_name);

                    var input_config = g_captcha_config_list[input_name];
                    input_config['connect_page_id'] = input_config['cid'];
                    input_config['log_message_id'] = log_message_id;
                    input_config['captcha_name'] = input_name;
                    input_config['text'] = input_val;
                    //update captcha config input
                    g_captcha_config_list[input_name] = input_config;
                }
            });

            //send socket event to verify
            if(g_captcha_process_list.length) {
                is_wait_verify = true;
                $(g_captcha_process_list).each(function(i, input_name_item) {
                    if(!isEmpty(g_captcha_config_list[input_name_item])) {
                        var captcha_send_data = g_captcha_config_list[input_name_item];
                        //efo_bot_send_captcha socket IO will response
                        socketIOEmit('efo_user_send_captcha', captcha_send_data);
                    }
                });
            }
        }

        return is_wait_verify;
    }

    //reset captcha input in message box log_message_id
    function resetCaptchaInput(log_message_id) {
        var message_box = getMessageBox(log_message_id);
        if(message_box.find('.captcha_group').length) {
            $(message_box.find('.captcha_group')).each(function(captcha_group_index, captcha_group) {
                var captcha_input = $(captcha_group).find('input.content'),
                    captcha_img = $(captcha_group).find('.captcha_box img'),
                    captcha_img_src = captcha_img.attr('src');

                if(captcha_img.hasClass('verify')) {
                    //input: remove readonly and class notset
                    captcha_input.attr('disabled', null).removeClass('notset');

                    //reset src img captcha
                    //add param time for not get cache image
                    captcha_img_src = captcha_img_src.replace('&time=', '&time=' + Date.now());
                    captcha_img.attr('src', captcha_img_src);
                    captcha_img.removeClass('verify');
                }
            });
        }
    }

    //add, remove class .wc-close in body for check open, close for animation open, close
    var timeout_processing_open_close;
    function chatboxShowHideClass(is_show) {
        if(is_show == void 0) {
            is_show = false;
        }

        //in opening then not call resize function
        $('body').addClass('processing_open_close');

        //fix error processing_open_close class remove and add unlimit when user click unlimit, will call to resize function
        clearTimeout(timeout_processing_open_close);
        timeout_processing_open_close = setTimeout(function () {
            $('body').removeClass('processing_open_close');
        }, 500);

        if(is_show) {
            $('body').removeClass('wc-close');
            $('body').addClass('wc-open');
        } else {
            $('body').addClass('wc-close');
            $('body').removeClass('wc-open');

            //hide cart header if it is show
            if($('#botchan-chat .cart_preview_box').css('display') == 'block') {
                productCartPreviewShow(false);
            }
        }
    }

    //check japan text string
    function includeJapanText(str) {
        if (!str.match(/^(\w| |'|,|&)+$/) ){
            return true;
        }
    }

    //check length title to set font size
    function checkLengthTitle(main_title, sub_title) {
        var title_length = 0;
        var main_title_length = 0;

        //main title
        if(!isEmpty(main_title)) {
            main_title_length = main_title.length;
            if(includeJapanText(main_title)) {
                main_title_length *= 2;
            }
            if(title_length < main_title_length) {
                title_length = main_title_length;
            }
        }
        //sub title
        if(!isEmpty(sub_title)) {
            var sub_title_length = sub_title.length;
            if(includeJapanText(sub_title)) {
                sub_title_length *= 2;
            }
            if(title_length < sub_title_length) {
                title_length = sub_title_length;
            }
        }

        //set class for title box to check in open chatbox
        var title_box = $('.chat-header .header-title-box');
        if(title_length < 21) {
            title_box.addClass('title_big1');

        } else if(title_length < 31) {
            title_box.addClass('title_big2');
        }

        //set class for main to check in close chatbox
        var title_main = $('.chat-header .header-title-box .header-title-main');
        if(main_title_length < 21) {
            title_main.addClass('title_big1');

        }
    }

    //create notify
    function createNotify(message, element, class_str, type_flg, is_prepend_flg) {
        if(!isEmpty(message) && !isEmpty(element) && $(element).length) {
            var type_class = 'success';
            if(!isEmpty(type_flg) && !type_flg){
                type_class = 'error';
            }
            if(isEmpty(class_str)){
                class_str = '';
            } else {
                $(element).find('.' + class_str).remove();
            }

            var error_element = "<label class='" + type_class + ' ' + class_str + "' style='padding-top: 5px'>" + message + "</label>";
            if(is_prepend_flg != void 0 && is_prepend_flg) {
                element.prepend(error_element);
            } else {
                element.append(error_element);
            }
        }
    }

    /**
     * Return close class code for chatbox
     * g_chatbox_close_class_list: list class for close type (minimize type) chatbox
     //avatar and title
     '001'  : 'close_type_001',

     //only avatar
     '002'  : 'close_type_002',

     //old type: only title and gradation
     '003'  : 'close_type_003',

     //old type: only title and no gradation
     '004'  : 'close_type_004',
     ------------------------------------------------------------------------------------
     * g_chatbox_close_list:
     - Gradation_icon (001): PC , Mobile: follow option (icon and title, icon only)
     - Gradation (002): PC: 003, Mobile: 003 (change avatar to image)
     - Monochromatic (003): PC: 004, Mobile: 004 (hange avatar to image + not gradation)
     * */
    function getCloseTypeCode(chatbox_close_type, gradation_icon_type) {
        //set default type
        var result = '001';
        if(isMobile()) {
            result = '002';
        }

        //add class for use gradation
        $('.chatview-container .chat-header').addClass('is_gradation');
        $('.chatview-container .panel-footer .progress-bar').addClass('is_gradation');

        if(!isEmpty(chatbox_close_type)) {
            switch (chatbox_close_type) {
                case g_chatbox_close_list.gradation: {
                    result = '003';
                }
                    break;
                case g_chatbox_close_list.monochromatic: {
                    //remove class for use gradation
                    $('.chatview-container .chat-header').removeClass('is_gradation');
                    $('.chatview-container .panel-footer .progress-bar').removeClass('is_gradation');

                    result = '004';
                }
                    break;
                default: { //gradation_icon type
                    if(!isEmpty(gradation_icon_type)) {
                        if(gradation_icon_type == g_chatbox_close_gradation_icon_list.icon_title) {
                            result = '001';
                        } else {
                            result = '002';
                        }
                    }
                }
                    break;
            }
        }
        return result;
    }

    //START CART FUNCTION
    //add product o cart: cart product list variable and add to view
    function productCartAdd(product_data, socketIO_send_flg) {
        if(!isEmpty(product_data)) {
            //set default send data to server
            if(socketIO_send_flg == void 0) {
                socketIO_send_flg = true;
            }

            if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                productCartShoppingAdd(product_data, socketIO_send_flg);

            } else if(g_scenario_type == g_scenario_type_list.request_document) {
                productCartDocumentAdd(product_data, socketIO_send_flg);
            }
            //update view
            productCartViewUpdate();
        }
    }

    function productCartShoppingAdd(product_data, socketIO_send_flg) {
        var success_flg = true;

        if(!isEmpty(product_data) && !isEmpty(product_data[g_cart_option_list.id])) {
            var product_code = product_data[g_cart_option_list.id];
            var existing_flg = false;
            //check product code exist in product list and update quantity
            $(g_cart_product_list).each(function(i, product_item) {
                if(product_item[g_cart_option_list.id] == product_code) {
                    existing_flg = true;

                    var product_add_quantity = product_data[g_cart_option_list.quantity];
                    //update quantity or remove if quantity = 0
                    if(!isEmpty(product_add_quantity) && !isNaN(product_add_quantity)) {
                        product_add_quantity = parseFloat(product_add_quantity);

                        if(product_add_quantity > 0) {
                            var product_quantity_new = g_cart_product_list[i][g_cart_option_list.quantity] + product_add_quantity;
                            g_cart_product_list[i][g_cart_option_list.quantity] = product_quantity_new;
                            //update quantity in view
                            var product_item_view = $('.cart_item[data-product_code="' + product_code + '"]');
                            if(product_item_view.length) {
                                product_item_view.find('.product_quantity_box input').val(product_quantity_new);
                            }

                        } else {
                            //remove if quantity = 0
                            success_flg = false;
                            productCartRemove(product_code);
                        }
                    }
                }
            });

            if(success_flg) {
                if(!existing_flg) {
                    g_cart_product_list.push(product_data);
                }

                //sent data to server
                if(socketIO_send_flg) {
                    var emit_data = {
                        'action_name' : 'add',
                        'action_data' : product_data,
                        'connect_page_id' : g_connect_page_id,
                        'user_id' : g_user_id
                    };
                    if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                        socketIOEmit('efo_add_to_cart_event', emit_data);

                    } else if(g_scenario_type == g_scenario_type_list.request_document) {
                        socketIOEmit('efo_document_event', emit_data);
                    }
                }

                //update view
                productCartCreateElement(product_data);

                // console.log('Add success: ', product_code);
                // console.table(g_cart_product_list);

            } else {
                console.log('Add failed: ', product_code);
            }
        }
    }

    function productCartDocumentAdd(product_data, socketIO_send_flg) {
        var success_flg = true;

        if(!isEmpty(product_data) && !isEmpty(product_data[g_cart_option_list.id])) {
            var product_code = product_data[g_cart_option_list.id];

            //check product code exist in product list
            $(g_cart_product_list).each(function(i, product_item) {
                if(product_item[g_cart_option_list.id] == product_code) {
                    success_flg = false;
                    console.log('Product ID: ' + product_code + ' is already in the cart!');
                    return;
                }
            });

            if(success_flg) {
                g_cart_product_list.push(product_data);

                //sent data to server
                if(socketIO_send_flg) {
                    var emit_data = {
                        'action_name' : 'add_or_update',
                        'action_data' : product_data,
                        'connect_page_id' : g_connect_page_id,
                        'user_id' : g_user_id
                    };
                    if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                        socketIOEmit('efo_add_to_cart_event', emit_data);

                    } else if(g_scenario_type == g_scenario_type_list.request_document) {
                        socketIOEmit('efo_document_event', emit_data);
                    }
                }

                //update view
                productCartCreateElement(product_data);

                // console.log('Add success: ', product_code);
                // console.table(g_cart_product_list);
            }
        }
    }

    //remove product in cart: cart product list variable and view
    function productCartRemove(product_code) {
        var success_flg = false;

        if(!isEmpty(product_code)) {
            //remove in global variable product cart
            $(g_cart_product_list).each(function(i, product_item) {
                if(product_item[g_cart_option_list.id] == product_code) {
                    g_cart_product_list.splice(i, 1);

                    //sent data to server and client
                    var send_event_name = '';
                    if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                        send_event_name = 'efo_add_to_cart_event';

                    } else if(g_scenario_type == g_scenario_type_list.request_document) {
                        send_event_name = 'efo_document_event';
                    }

                    if(send_event_name) {
                        var emit_data = {
                            'action_name' : 'remove',
                            'action_data' : {'id' : product_code},
                            'connect_page_id' : g_connect_page_id,
                            'user_id' : g_user_id
                        };
                        var post_message_data = {
                            'action_name' : 'remove',
                            'action_data' : {'id' : product_code}
                        };

                        //sent data to server
                        socketIOEmit(send_event_name, emit_data);

                        //send event to client
                        var post_message_data_new = {};
                        post_message_data_new[send_event_name] = post_message_data;
                        postMessageToClient(post_message_data_new);
                    }

                    //remove in view
                    $('.cart_item[data-product_code="' + product_code + '"]').remove();
                    //update view
                    productCartCheckEmpty();
                    productCartViewUpdate();

                    // console.log('Remove success: ', product_code);
                    // console.table(g_cart_product_list);
                    success_flg = true;
                    return;
                }
            });

            if(!success_flg) {
                console.log('Product ID: ' + product_code + ' does not exist in the cart!');
            }
        }
    }

    //update data product in cart
    function productCartUpdate(product_code, product_data) {
        var success_flg = false;

        if(!isEmpty(product_code) && !isEmpty(product_data)) {
            $(g_cart_product_list).each(function(i, product_item) {
                //set new data for product code
                if(product_item[g_cart_option_list.id] == product_code) {
                    var product_item_view = $('.cart_item[data-product_code="' + product_code + '"]');
                    for (var column in product_data) {
                        if(column == g_cart_option_list.quantity) {
                            g_cart_product_list[i][column] = product_data[column];

                            //update view
                            product_item_view.find('.product_quantity_box input').val(product_data[column]);
                        }
                    }

                    //sent data to server and client
                    var send_event_name = '';
                    var send_event_action_name = '';
                    if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                        send_event_name = 'efo_add_to_cart_event';
                        send_event_action_name = 'update';

                    } else if(g_scenario_type == g_scenario_type_list.request_document) {
                        send_event_name = 'efo_document_event';
                        send_event_action_name = 'add_or_update';
                    }

                    if(send_event_name) {
                        product_data[g_cart_option_list.id] = product_code;
                        var emit_data = {
                            'action_name' : send_event_action_name,
                            'action_data' : product_data,
                            'connect_page_id' : g_connect_page_id,
                            'user_id' : g_user_id
                        };
                        var post_message_data = {
                            'action_name' : 'update',
                            'action_data' : product_data
                        };

                        //sent data to server
                        socketIOEmit(send_event_name, emit_data);

                        //send event to client
                        var post_message_data_new = {};
                        post_message_data_new[send_event_name] = post_message_data;
                        postMessageToClient(post_message_data_new);
                    }

                    //update view
                    productCartViewUpdate();

                    success_flg = true;
                    // console.log('Update success: ', product_code);
                    // console.table(g_cart_product_list);
                }
            });

            if(!success_flg) {
                console.log('Product ID: ' + product_code + ' does not exist in the cart!');
            }
        }
    }

    //create cart item
    function productCartCreateElement(product_data) {
        if(!isEmpty(product_data)) {
            if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                productCartCreateShoppingElement(product_data);

            } else if(g_scenario_type == g_scenario_type_list.request_document) {
                productCartCreateDocumentElement(product_data);
            }
            productCartCheckEmpty();
        }
    }
    //create shopping cart item
    function productCartCreateShoppingElement(product_data) {
        var template_message =  $('.template_message');
        var cart_item_clone =  template_message.find('.message_type .shopping_cart_template .cart_item').clone(),
            product_name_elm = cart_item_clone.find('.product_name'),
            product_detail_box = cart_item_clone.find('.cart_detail_box'),
            product_code    = product_data[g_cart_option_list.id],
            product_name    = product_data[g_cart_option_list.name],
            product_desc    = product_data[g_cart_option_list.sub_name],
            product_image   = product_data[g_cart_option_list.image],
            product_price   = product_data[g_cart_option_list.price],
            product_quantity = product_data[g_cart_option_list.quantity],
            product_currency = product_data[g_cart_option_list.currency];

        cart_item_clone.attr('data-product_code', product_code);
        //product title
        product_name_elm.html(product_name);
        if(!isEmpty(product_data[g_cart_option_list.url])) {
            product_name_elm.attr('href', product_data[g_cart_option_list.url]);
            product_name_elm.attr('target', '_blank');
        }
        //product image
        if(!isEmpty(product_image)) {
            var product_img_clone = template_message.find('.message_type .shopping_cart_template .cart_image_box').clone();
            product_img_clone.find('img').attr('src', product_image);
            cart_item_clone.prepend(product_img_clone);

            //set width for detail box
            product_detail_box.removeClass('col-xs-12').addClass('col-xs-9');
        }
        //product sub title
        if(!isEmpty(product_desc)) {
            var product_desc_clone = template_message.find('.message_type .shopping_cart_template .product_desc_box').clone();
            product_desc_clone.find('.product_desc').html(product_desc);
            product_detail_box.append(product_desc_clone);
        }
        //product price
        if(!isEmpty(product_price)) {
            var product_price_clone = template_message.find('.message_type .shopping_cart_template .product_price_box').clone();
            var price_label = getHtmlPrice(product_price, product_currency);

            product_price_clone.find('.product_price').html(price_label);
            product_detail_box.append(product_price_clone);
        }
        //product quantity
        if(!isEmpty(product_quantity)) {
            var product_quantity_box_clone = template_message.find('.message_type .shopping_cart_template .product_quantity_box').clone();
            //set quantity
            product_quantity_box_clone.find('input.content').val(product_quantity);
            product_detail_box.append(product_quantity_box_clone);
        }

        //product quantity
        if(!isEmpty(product_quantity) && !isEmpty(product_price)) {
            var product_price_total_box_clone = template_message.find('.message_type .shopping_cart_template .product_price_total_box').clone();
            //set product price total
            var product_price_total = '';
            if(!isNaN(product_price) && !isNaN(product_quantity)) {
                product_price_total = parseFloat(product_price) * parseFloat(product_quantity);
                product_price_total = getHtmlPrice(product_price_total, product_currency);
            }
            product_price_total_box_clone.find('.product_price').html(product_price_total);
            product_detail_box.append(product_price_total_box_clone);
        }

        //add to cart header
        if(!$('.cart_preview_container .cart_item[data-product_code="' + product_code + '"]').length) {
            $('.cart_preview_container ul').append(cart_item_clone);
        }
        //add to message
        $('#wc-message-group-content .shopping_cart_group .cart_container').each(function(i, e) {
            if(!$(this).find('.cart_item[data-product_code="' + product_code + '"]').length) {
                $(this).append(cart_item_clone.clone());
            }
        });
    }

    //create document cart item
    function productCartCreateDocumentElement(product_data) {
        var template_message =  $('.template_message');
        var cart_item_clone  =  template_message.find('.message_type .document_cart_template .cart_item').clone(),
            product_name_elm = cart_item_clone.find('.product_name'),
            product_detail_box = cart_item_clone.find('.cart_detail_box'),
            product_code    = product_data[g_cart_option_list.id],
            product_name    = product_data[g_cart_option_list.name],
            product_desc    = product_data[g_cart_option_list.sub_name],
            product_image   = product_data[g_cart_option_list.image];

        cart_item_clone.attr('data-product_code', product_code);
        //product title
        product_name_elm.html(product_name);
        if(!isEmpty(product_data[g_cart_option_list.url])) {
            product_name_elm.attr('href', product_data[g_cart_option_list.url]);
            product_name_elm.attr('target', '_blank');
        }
        //product image
        if(!isEmpty(product_image)) {
            var product_img_clone = template_message.find('.message_type .document_cart_template .cart_image_box').clone();
            product_img_clone.find('img').attr('src', product_image);
            cart_item_clone.prepend(product_img_clone);

            //set width for detail box
            product_detail_box.removeClass('col-xs-12').addClass('col-xs-9');
        }
        //product sub title
        if(!isEmpty(product_desc)) {
            var product_desc_clone = template_message.find('.message_type .document_cart_template .product_desc_box').clone();
            product_desc_clone.find('.product_desc').html(product_desc);
            product_detail_box.append(product_desc_clone);
        }

        var cart_item_clone_msg2 = cart_item_clone.clone();
        //add to cart header
        if(!$('.cart_preview_container .cart_item[data-product_code="' + product_code + '"]').length) {
            //remove option not using
            /*if(g_cart_header_document_type == g_cart_document_type_list.title) {
                cart_item_clone.find('.product_desc_box, .cart_image_box').remove();
                product_detail_box.removeClass('col-xs-9').addClass('col-xs-12');

            } else if(g_cart_header_document_type == g_cart_document_type_list.title_sub_title) {
                cart_item_clone.find('.cart_image_box').remove();
                product_detail_box.removeClass('col-xs-9').addClass('col-xs-12');
            }*/
            $('.cart_preview_container ul').append(cart_item_clone);
        }

        //add to message
        $('#wc-message-group-content .document_cart_group .cart_container').each(function(i, e) {
            if(!$(this).find('.cart_item[data-product_code="' + product_code + '"]').length) {
                var cart_msg_document_type = $(this).attr('data-cart_document_type');
                var cart_item_clone_msg3 = cart_item_clone_msg2.clone();
                //remove option not using
                if(cart_msg_document_type == g_cart_document_type_list.title) {
                    cart_item_clone_msg3.find('.product_desc_box, .cart_image_box').remove();
                    cart_item_clone_msg3.find('.cart_detail_box').removeClass('col-xs-9').addClass('col-xs-12');

                } else if(cart_msg_document_type == g_cart_document_type_list.title_sub_title) {
                    cart_item_clone_msg3.find('.cart_image_box').remove();
                    cart_item_clone_msg3.find('.cart_detail_box').removeClass('col-xs-9').addClass('col-xs-12');
                }
                $(this).append(cart_item_clone_msg3);
            }
        });
    }

    //update price total cart
    function productCartViewUpdate() {
        var item_count = 0;
        var price_total_label = 0;
        var currency_label = '';

        $(g_cart_product_list).each(function(i, product_item) {
            var product_code = product_item[g_cart_option_list.id];
            var product_quantity = product_item[g_cart_option_list.quantity];
            var product_price = product_item[g_cart_option_list.price];
            var product_currency = product_item[g_cart_option_list.currency];
            var product_price_total_label = 0;

            if(!isEmpty(product_quantity) && !isNaN(product_quantity)) {
                //update quantity
                item_count += product_quantity;
                //get currency
                if(isEmpty(currency_label) && !isEmpty(product_currency)) {
                    currency_label = product_currency;
                }
                //update price
                if(!isEmpty(product_price) && !isNaN(product_price)) {
                    product_price_total_label = (parseFloat(product_quantity) * parseFloat(product_price));
                    price_total_label += product_price_total_label;
                }
                //update price total for product item
                var product_item_view = $('.cart_item[data-product_code="' + product_code + '"]');
                if(product_item_view.length) {
                    product_price_total_label = getHtmlPrice(product_price_total_label, currency_label);
                    product_item_view.find('.product_price_total_box .product_price').html(product_price_total_label);
                }
            } else {
                item_count += 1;
            }
        });

        //update quantity
        $('.header_cart_box .cart_quantity').html(item_count);

        if(g_scenario_type == g_scenario_type_list.add_to_cart) {
            //update price and total price
            price_total_label = getHtmlPrice(price_total_label, currency_label);
            $('.cart_preview_box .price_total_box .price_total').html(price_total_label);
            $('.cart_group .price_total_box .price_total').html(price_total_label);

        }
        //remove error message require document
        if(g_cart_product_list.length) {
            $('.message-container .error.cart_require_item').remove();
        }
    }

    //check show hide preview cart
    function productCartPreviewShow(show_flg) {
        var cart_preview_box = $('.cart_preview_box');
        if(show_flg != void 0) {
            if(show_flg) {
                cart_preview_box.show();
            } else {
                cart_preview_box.hide();
            }
        } else {
            cart_preview_box.toggle();
        }
        showBackdrop((cart_preview_box.css('display') == 'block'));
    }

    //check show hide empty label in cart header
    function productCartCheckEmpty() {
        if(g_cart_product_list.length) {
            $('.cart_preview_container .empty_label, #wc-message-group-content .cart_group .empty_label').addClass('hidden');
            $('.cart_preview_box .price_total_box').removeClass('hidden');
            $('.cart_group .price_total_box').removeClass('hidden');
        } else {
            $('.cart_preview_container .empty_label, #wc-message-group-content .cart_group .empty_label').removeClass('hidden');
            $('.cart_preview_box .price_total_box').addClass('hidden');
            $('.cart_group .price_total_box').addClass('hidden');
        }
    }

    //validate if cart is empty
    function productCartEmptyValidate(log_message_id) {
        if(g_scenario_type == g_scenario_type_list.request_document || g_scenario_type == g_scenario_type_list.add_to_cart) {
            if(!g_cart_product_list.length) {
                var error_msg = 'Please select at least one item..';
                var msg_group = getMessageBox(log_message_id);

                if(g_scenario_type == g_scenario_type_list.request_document) {
                    if(!isEmpty($.fn.fileinputLocales[g_language]) && !isEmpty($.fn.fileinputLocales[g_language]['validate_require_document_item'])) {
                        error_msg = $.fn.fileinputLocales[g_language]['validate_require_document_item'];
                    }

                } else if(g_scenario_type == g_scenario_type_list.add_to_cart) {
                    if(!isEmpty($.fn.fileinputLocales[g_language]) && !isEmpty($.fn.fileinputLocales[g_language]['validate_require_product_item'])) {
                        error_msg = $.fn.fileinputLocales[g_language]['validate_require_product_item'];
                    }
                }

                createNotify(error_msg, msg_group.find('.chat-body'), 'cart_require_item', false, false);

                return false;
            }
        }
        return true;
    }

    //return html price with currency follow language
    function getHtmlPrice(price, currency_label) {
        var result = '';
        if(!isEmpty(price)) {
            result = formatNumber(price);
            if(!isEmpty(currency_label)) {
                // if(g_language != 'vn') {
                //     result = '<span class="currency">' + curency + '</span> ' + formatNumber(price);
                // } else {
                //     result = formatNumber(price) + ' <span class="currency">' + curency + '</span>';
                // }
                result += ' <span class="currency">' + currency_label + '</span>';
            }
        }
        return result;
    }
    //END CART FUNCTION

    //format number
    function formatNumber(number) {
        if(!isEmpty(number) && !isNaN(number)) {
            return parseFloat(number).toLocaleString();
        }
        return null;
    }
    
    //emit socket o server
    function socketIOEmit(emit_name, emit_data) {
        if(!isEmpty(emit_name)) {
            if(isEmpty(emit_data)) {
                emit_data = '';
            }
            socket.emit(emit_name, emit_data);
        }
    }

    //show hide modal backdrop to body
    function showBackdrop(show_flg) {
        if(show_flg == void 0) {
            show_flg = false;
        }
        if(show_flg) {
            if(!$('body > .modal-backdrop').length) {
                $('body').append('<div class="modal-backdrop in"></div>');
            }
        } else {
            $('body > .modal-backdrop').remove();
        }
    }

    //event when resize
    var timeout_window_resize;
    $(window).resize(function () {
        if(!$('body').hasClass('processing_open_close')) {
            clearTimeout(timeout_window_resize);
            console.log('resize');
            timeout_window_resize = setTimeout(function () {
                resetSlickCarousel();
            }, 200);
        }
    });
});