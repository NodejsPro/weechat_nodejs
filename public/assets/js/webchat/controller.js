/**
 * Created by le.bach.tung on 15-Jun-17.
 */
var user_send = {
    'message_user_text' : "001",
    'message_user_payload' : "003",
    'message_user_attachment' : "004"
};
var BOT_TYPE_QUICK_REPLIES = "005";

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

    var scroll_width = 35;
    var g_time_short = 365; //30 day
    var g_new_conversation_flg;
    var g_bot_name = '';
    var g_language = 'en';

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
    var g_user_full_name = undefined;
    var g_user_email = undefined;
    //attach to url in iframe simple to clear all cookie of webchat before load and can access conversation
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

    var g_avatar_show_type = null;

    //azuze storage node js url
    var g_embed_azure_storage_url = '/';

    //1: user, 2: bot
    var g_sender_type = {
        'user': 1,
        'bot' : 2
    };

    // menu data type
    var menu_type = {
        'postback' : "postback",
        'web_url' : "web_url"
    };


    var main_js_elm = $('#webchat_js_main');
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

    socket.on('webchat_bot_send_message', function (msg) {
        // console.log('new msg', msg);
        if(msg.user_id == g_user_id) {
            receiveMessage(msg);

            //set notification new message to title of client site
            changeTitle(true);

            var message_type = (typeof msg.type !== "undefined") ? msg.type : -1;
            scrollBottom(message_type);
        }
    });
    socket.on('webchat_other_user_send_message', function (data) {
        createUserChat(data);
    });

    socket.on('webchat_other_user_start', function () {
        $('.message-input-wrap').show();
        $('.wc-info').remove();
    });

    socket.on('webchat_status_join', function (msg) {
        //set url azure storage node js for global variable
        if(!isEmpty(msg.embed_azure_storage_url)) {
            g_embed_azure_storage_url = msg.embed_azure_storage_url;
        }

        if (msg.status) {
            g_bot_name = msg.page_name;
            resetCookieTime();
            //menu
            var persistent_menu = msg.persistent_menu;
            if(persistent_menu && persistent_menu.persistent_menu && Array.isArray(persistent_menu.persistent_menu) &&
                persistent_menu.persistent_menu[0].call_to_actions && Array.isArray(persistent_menu.persistent_menu[0].call_to_actions) && persistent_menu.persistent_menu[0].call_to_actions.length > 0){
                var menu_items = persistent_menu.persistent_menu[0].call_to_actions;
                //clear menu before set menu
                $('.menu-container').removeClass('menu-open');
                $('.menu-container .menu-item-list .menu-item').remove();
                if(menu_items && Array.isArray(menu_items)) loadMenu(menu_items, '');
            }else{
                $('.message-menu-container').hide();
                $('.message-input-container').css('left', '5px');
            }
        } else {
            $('#BotChatElement').find('.message-input-wrap').remove();
            if(msg.limit_user_chat){
                if((window == window.parent) && msg.limit_user_msg){
                    $('#wc-message-groups').html(msg.limit_user_msg);
                }
                var post_message_data = {
                    limit_user_chat: true
                };
                postMessageToClient(post_message_data);
            } else {
                $('#BotChatElement').find('.wc-message-pane').remove();
                $('.wc_error_global').show();
            }
        }
        applySetting(msg);
    });

    socket.on('webchat_bot_newconversation', function (msg) {

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
        socket.emit('webchat_user_conversation', data_user_conversation);
    });

    socket.on('webchat_server_send_log', function (msg) {
        // console.log('get history', msg);
        if(msg.user_id == g_user_id) {
            if (msg.message != void 0 && msg.message.length > 0) {
                setMessagesHistory(msg.message);
            }
            setTimeout(function () {
                showMessageContainer();
                scrollBottom(g_sender_type['bot']);
            }, 1000);
        }
    });

    //check to clear cookie or continue exist conversation
    socket.on('webchat_bot_start', function (msg) {
        //clear all cookie before load if new_flg = 1 and exist param refresh_log_flg = 1 in url iframe
        if((!isEmpty(msg.new_flg) && msg.new_flg) || g_refresh_log_flg){
            initNewConversation();
        } else {
            if(!isEmpty(g_preview_flg)) {
                msg.preview_flg = g_preview_flg;
            }
            socket.emit('webchat_join', msg);
        }
    });

    //event open close chatbox from socketIO
    socket.on('server_send_btag_event', function (msg) {
        console.log('server_send_btag_event', msg);
    });

    window.onfocus = function () {
        if(g_new_msg_flg) {
            changeTitle(false);
        }
    };

    //*** bind enter event send message***
    $('input[type=text]').on('keydown', function (e) {
        if (e.which == 13) {
            sendMessage();
        }
    });

    $('.message-button-container').click(function () {
        sendMessage();
    });

    $('.wc-send-info').click(function () {
        sendUserInfo();
    });

    $('.wc-info input[type=text]').on('keydown', function (e) {
        if (e.which == 13) {
            sendUserInfo();
        }
    });

    $('#wc-message-groups').on('click', '.post-back-chat', function () {
        var payload = $(this).attr('payload');
        if (payload != void 0) {
            var post_back = {
                'user_id': g_user_id,
                'connect_page_id': g_connect_page_id,
                'payload': payload
            };
            socket.emit('webchat_user_send_postback', post_back);
        }
    });

    $('#wc-message-groups').on('click', '.quick-replies-item.text', function () {
        var payload = $(this).attr('payload');
        var text = $(this).html();
        if (payload != void 0) {
            var quick_replies = {
                'user_id': g_user_id,
                'connect_page_id': g_connect_page_id,
                'message': {
                    text: text,
                    quick_reply: {
                        payload: payload
                    }
                }
            };
            socket.emit('webchat_user_send_quickreplies', quick_replies);
            $(this).parents('.quick-container').remove();
        }
    });

    //close, open chat when click to header
    $(document).on('click', '.chatview-container .chat-header', function (e) {
        var post_message_data = {
            'chat_box_open_close': true
        };
        postMessageToClient(post_message_data);
    });

    // click on menu child
    $(document).on('click', '.menu-container .menu-item', function () {
        if($(this).attr('parent') == 1) {
            setMenu($(this).attr('id'));
            $('.menu-container .menu-title').attr('parent_id', $(this).attr('parent_id'));
        }
        if($(this).attr('payload')) {
            var postback = {
                user_id: g_user_id,
                connect_page_id: g_connect_page_id,
                payload: $(this).attr('payload')
            };
            socket.emit('webchat_user_send_postback',postback);
            $('.menu-container').removeClass('menu-open');
        }
    });

    // click on menu title
    $('.menu-container .menu-title .menu-prev-btn').click(function () {
        var parent_id = $('.menu-container .menu-title').attr('parent_id');
        setMenu(parent_id);
        if(parent_id) {
            var new_parent_id = $('.menu-container .menu-item#'+parent_id).attr('parent_id');
            $('.menu-container .menu-title').attr('parent_id', new_parent_id);
        }
    });

    $('.message-menu-container').click(function () {
        document.getElementsByClassName('menu-container')[0].classList.toggle("menu-open");
        setMenu("");
    });

    //hide menu when click to outsite
    $(document).on('click', function( e ) {
        var element = $(e.target);
        if($('.menu-container').hasClass('menu-open')
            && !element.hasClass('message-menu-container')
            && !element.parents('.message-menu-container').length
            && (!element.parents('.menu-container').length
            || (element.parents('.menu-container').length && (element.attr('parent') == 0 || element.parents('.menu-item').attr('parent') == 0)))
        ) {
            $('.message-menu-container').click();
        }
    });

    function receiveEventClient(event) {
        if (event != void 0 && event.data != void 0 && event.data.maximize_flg){
            var data_get_log = {
                user_id: g_user_id,
                connect_page_id: g_connect_page_id
            };
            socket.emit('webchat_client_get_log', data_get_log);
            return;
        } else if(event != void 0 && event.data != void 0 && event.data.new_conversation_flg){
            initNewConversation();

        } else if(event != void 0 && event.data != void 0 && !isEmpty(event.data.chatbox_show_status)){
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

    // send message
    function sendMessage() {
        var msg_input = $('.message-input-text').val();

        $('.wc-message-wrapper.chat-left .chat-body .quick-container').hide();
        if (msg_input != '' && g_user_id && g_connect_page_id) {
            createUserChat(msg_input);
            scrollBottom();
            //prepare data send to server
            var user_send_message = {
                'user_id': g_user_id,
                'connect_page_id': g_connect_page_id,
                'type': user_send.message_user_text,
                'message': {
                    'text': msg_input
                }
            };
            if(!isEmpty(g_preview_flg)) {
                user_send_message['preview_flg'] = g_preview_flg;
            }
            socket.emit('webchat_user_send_message', user_send_message);
            $('.message-input-text').val("");

        }
    }

    function setMessagesHistory(data) {
        clearChatMessage();
        var cnt = 1;
        var show_flg = true;
        $(data).each(function (index, message) {
            if (message.type == g_sender_type.user) {
                createUserChat(message);
            } else {
                if(message.message_type == BOT_TYPE_QUICK_REPLIES && data[index +1] != void 0){
                    show_flg = false;
                }

                var isAnimation = false;
                if(index >= data.length - 2){
                    isAnimation = true;
                    setTimeout(function () {
                        createBotChat(message, show_flg, isAnimation);
                        show_flg = true;
                    }, 1000 * cnt);
                    cnt++;
                }else{
                    createBotChat(message, show_flg, isAnimation);
                    show_flg = true;
                }
            }
        });
    }

    // creat view chat for user
    function createUserChat(msg) {
        var log_message_id = msg.log_message_id;
        var text = msg;

        if(msg.message != void 0) {
            if(msg.message.text != void 0) {
                text = msg.message.text;
            } else {
                text = msg.message;
            }
        }

        var chat_msg_elm = $('.template_message .chat-right').clone();

        //set attribute log chat id
        $(chat_msg_elm).find('.chat-body').attr('data-message_id', log_message_id);

        $(chat_msg_elm).find('.chat-body .chat-text').empty().html(text);

        //show, hide avatar
        chat_msg_elm.find('.chat-avatar').css('opacity', showHideAvatar(g_sender_type.user) ? 1 : 0);
        chat_msg_elm.addClass('chat-right-active');

        addChatMessage(chat_msg_elm);
    }

    // receive message
    function receiveMessage(msg) {
        var messages = new Array();
        messages.push(msg);

        $('.wc-message-wrapper.chat-left .chat-body .quick-container').hide();
        var show_flg = true;
        if (msg.type != void 0 && msg.type == g_sender_type.user && msg.message_type == user_send.message_user_payload) {
            createUserChat(msg);
        } else {
            createBotChat(msg, show_flg);
            //set notification new message to title of client site
            changeTitle(true);
        }
    }

    // creat view chat for bot
    function createBotChat(messages, show_flg, isAnimation) {
        // console.log(messages)
        //add message if not exist this message before that
        var log_message_id = messages.log_message_id;

        if(messages.message != void 0 && !$('#wc-message-group-content .chat-left .chat-body[data-message_id="' + log_message_id + '"]').length){
            var messages_data = messages.message;
            var c_cnt = 0;
            $(messages_data).each(function (index, msg) {
                var chat_msg_elm = $('.template_message .chat-left').clone();
                //set attribute log chat id
                $(chat_msg_elm).find('.chat-body').attr('data-message_id', log_message_id);
                //show, hide avatar
                chat_msg_elm.find('.chat-avatar').css('opacity', showHideAvatar(g_sender_type.bot) ? 1 : 0);
                //quick reply type
                if (msg.quick_replies != void 0) {
                    chat_msg_elm = viewQuickReply(chat_msg_elm, msg);
                    if (chat_msg_elm) {
                        if (show_flg != void 0 && !show_flg) {
                            chat_msg_elm.find('.quick-container').hide();
                        } else {
                            chat_msg_elm.find('.quick-container').show();
                        }
                    }
                } else if (msg.attachment != void 0 && msg.attachment.payload != void 0 && msg.attachment.payload.buttons != void 0) {
                    //button type
                    chat_msg_elm = viewButton(chat_msg_elm, msg);
                } else if (msg.text != void 0 && typeof msg.text === 'string') {
                    //text type
                    $(chat_msg_elm).find('.chat-body .chat-text').html(str_replace(msg.text));
                } else if (msg.attachment != void 0 && msg.attachment.payload != void 0 && msg.attachment.payload.elements != void 0) {
                    //carousel type
                    chat_msg_elm = addGeneric(chat_msg_elm, msg, c_cnt);
                    c_cnt++;
                    // is_carousel = true;
                } else if (msg.attachment != void 0 && msg.attachment.payload != void 0 && msg.attachment.payload.url != void 0) {
                    //file type
                    chat_msg_elm = viewFile(chat_msg_elm, msg);
                } else if (msg.mail != void 0 || msg.api != void 0) {
                    ////mail type
                    return;
                }

                chat_msg_elm.addClass('chat-left-active');
                addChatMessage(chat_msg_elm);
            });
        }
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

    function viewButton(bot_chat, message_data) {
        bot_chat.find('.chat-body').addClass('button');
        bot_chat.find('.chat-body .chat-text').addClass('button-title').html(message_data.attachment.payload.text);

        //button item
        bot_chat.find('.chat-body').append('<div class="button-container"></div>');
        viewButtonList(message_data.attachment.payload.buttons, bot_chat.find('.button-container'));
        return bot_chat
    }

    function viewFile(box_chat, message_data) {
        message_data = message_data.attachment;
        box_chat.find('.chat-body').addClass('media');
        box_chat.find('.chat-body .chat-text').remove();

        var file_type = message_data.type,
            file_url = message_data.payload.url,
            file_preview = file_url,
            media = '';

        if (file_type == 'image' || file_type == 'file') {
            if (file_type == 'file') {
                box_chat.find('.chat-body').addClass('file');
                file_preview = '/images/pdf.png';
            }
            media = '<a  target="_blank" href="' + file_url + '"><img src="' + file_preview + '"/></a>';

        } else if (file_type == 'video') {
            media = '<video controls="controls" src="' + file_preview + '" ></video>';
        }
        box_chat.find('.chat-body').append(media);

        return box_chat;
    }

    function addGeneric(box_chat, message_data, index) {
        box_chat.find('.chat-body .chat-text').remove();
        var carousel = $('#wc-message-groups .template_message .carousel_message').clone();
        var carousel_id = 'carousel_' + index;
        //set href for next, prev button
        carousel.find('.carousel-slick-control').attr('href', '#' + carousel_id);
        if (message_data.attachment != void 0 && message_data.attachment.payload != void 0 && message_data.attachment.payload.elements != void 0) {
            $.each(message_data.attachment.payload.elements, function (index, item) {
                var carousel_item = $('#wc-message-groups .template_message .carousel_item .item').clone();
                if (index == 0) {
                    carousel_item.addClass('active');
                }
                if(item.item_url != void 0 && item.item_url != '') {
                    carousel_item.find('a.carousel_item_top').attr('href', item.item_url);
                }
                carousel_item.find('.carousel-caption-top p').html(item.title);
                carousel_item.find('.carousel-sub-caption p').html(item.subtitle);
                if (item.image_url != void 0 && item.image_url != '') {
                    carousel_item.find('.image img').attr('src', item.image_url);
                } else {
                    carousel_item.find('.image img').remove();
                }
                //button list
                if (item.buttons != void 0) {
                    carousel_item = viewButtonList(item.buttons, carousel_item);
                }
                carousel.find('.carousel-inner').append(carousel_item);
            });

            box_chat.find('.chat-body').append(carousel);
        }
        return box_chat;
    }

    function viewQuickReply(bot_chat, message_data, message_id) {
        if(message_data != void 0 && message_data.quick_replies != void 0 && message_data.text != void 0 && message_data.text != '') {
            bot_chat.find('.chat-body').addClass('quick-replies');

            bot_chat.find('.chat-body .chat-text').html(message_data.text);
            bot_chat.find('.chat-body').append('<div class="quick-container">' + '</div>');
            $.each(message_data.quick_replies, function (index, item) {
                var btn_item;
                if(item.content_type == 'location') {
                    btn_item = $('#wc-message-groups .quick_replies_template .location').clone();
                    btn_item.append('Send Location');

                } else {
                    btn_item = $('#wc-message-groups .quick_replies_template .text').clone();
                    btn_item.attr({payload : item.payload});
                    btn_item.html(item.title);
                }
                btn_item.attr('href', item.url);
                bot_chat.find('.quick-container').append(btn_item);
            });
            return bot_chat;
        }
        return '';
    }

    function chMail(email) {
        ml = /.+@.+\..+/;
        if(!email.match(ml)) {
            return false;
        }
        return true;
    }

    function sendUserInfo() {
        // console.log('sendUserInfo');
        var input_name =  $('.wc-txt-name');
        var input_mail =  $('.wc-txt-email');
        //reset validate
        input_mail.css({'border-color': '#ccc'});
        input_name.css({'border-color': '#ccc'});

        //validate
        g_user_full_name = input_name.val();
        g_user_email = input_mail.val();
        var isEmail = chMail(g_user_email);
        var isName = g_user_full_name != '';

        if(isEmail && isName){
            var cookie_data = {
                'wc_user_full_name': g_user_full_name,
                'wc_user_mail': g_user_email
            };
            setCookieValue(cookie_data);

            var msg_input = {
                'user_id': g_user_id,
                'connect_page_id': g_connect_page_id,
                'user_full_name': g_user_full_name,
                'user_email': g_user_email,
                'ref': getParam('ref')
            };
            socket.emit('webchat_client_sendinfo', msg_input);

            var message_input_wrap_h = $('.message-input-wrap').outerHeight();
            $('.wc-info').hide();
            $('.message-input-wrap').show();
            $('.message-container').css({
                'overflow-y': 'scroll',
                'bottom': message_input_wrap_h + 'px'
            });
        } else {
            if(!isEmail){
                input_mail.css({'border-color': 'red'});
            }
            if(!isName){
                input_name.css({'border-color': 'red'});
            }
        }
        return true;
    }

    function viewButtonList(buttons, element) {
        $.each(buttons, function (ind, val) {
            var btn_item = $('#wc-message-groups .template_message .button_template .button').clone().addClass('button-item');
            if (val.type == 'postback') {
                btn_item.addClass('post-back-chat');
                btn_item.removeAttr('target');
                btn_item.removeAttr('href');
                btn_item.attr('payload', val.payload)
            }
            btn_item.attr('href', val.url).html(val.title);
            $(element).append(btn_item)
        });
        return element;
    }

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
            //check to join exist conversation or start new conversation in: webchat_bot_start IO event
            if(!g_new_conversation_flg){
                socket.emit('webchat_user_start', wc_join_room);
            } else {
                socket.emit('webchat_join', wc_join_room);
            }
        }
    }

    //init slick carousel: init_slick_number = delay until #wc-message-group-content show
    var init_slick_number = 0;
    function initSlick() {
        if ($('#wc-message-group-content .carousel_message .carousel-inner').not('.slick-initialized').length) {
            var message_content_w = $('#wc-message-group-content').innerWidth();
            if((isEmpty(message_content_w) || message_content_w <= 0) && init_slick_number <= 10) {
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
                windown_w = (windown_w / 100) * 90 - 35;

                init_slick_number = 0;
                var item_width = 272;
                var item_show_num = 3;

                //set number slide show
                if(Math.floor(windown_w / item_width) < item_show_num) {
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

                $('#wc-message-group-content .carousel_message .carousel-inner').not('.slick-initialized').each(function(i, e) {
                    //set width .carousel_message
                    if(Math.ceil(item_width * item_show_num) > 0) {
                        $(this).parents('.carousel_message').css('width', Math.ceil(item_width * item_show_num) + 'px');
                    }

                    $(e).slick(option);
                    //check to show, hide button after init slide
                    //delay time for issue not show button in IOS
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
                msg_group = $(slick_elm.target).parents('.carousel_message');
            } else {
                msg_group = $(slick_elm).parents('.carousel_message');
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

    function initNewConversation() {
        clearAllCookie();
        //create new conversation
        g_is_join_room = false;
        receiveEventClient();
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
        var setting_data = data.setting;
        var bot_chat = $('#BotChatElement');
        var chat_title = setting_data.title != void 0 ? setting_data.title : '',
            sub_title = setting_data.sub_title != void 0 ? setting_data.sub_title : '',
            sub_sub_title = setting_data.sub_sub_title != void 0 ? setting_data.sub_sub_title : '',
            chat_input_hint_text = setting_data.input_hint_text != void 0 ? setting_data.input_hint_text : '',
            chat_button_text = setting_data.button_text != void 0 ? setting_data.button_text : '',
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
            pc_icon_bottom = !isEmpty(setting_data.pc_icon_bottom ) ? setting_data.pc_icon_bottom : 100,
            chatbox_close_type = !isEmpty(setting_data.design_type) ? setting_data.design_type : '001',
            pc_icon_display_type = !isEmpty(setting_data.pc_icon_display_type) ? setting_data.pc_icon_display_type : '001',
            sp_icon_display_type = !isEmpty(setting_data.sp_icon_display_type) ? setting_data.sp_icon_display_type : '002';

        //COLOR
        if (chat_color_code != void 0 && !isEmpty(g_style_name_list[chat_color_code])) {
            g_style_code_default = chat_color_code;
        }
        //set style file name for webchat follow style code
        if(!isEmpty($('link.webchat_style'))) {
            $('link.webchat_style').attr('href', g_embed_azure_storage_url + 'webchat/' + g_style_name_list[g_style_code_default] + '/style.css?v=' + g_version);
        }

        //chat_color: add prefix # for color and Send to client to set background for minimize element
        var chat_color = '#' + g_style_color_list[g_style_code_default];

        if (chat_color) {

        }
        //END COLOR

        if (chat_lang) {
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

        //set html text follow language
        fillLanguage();

        checkLengthTitle(chat_title, sub_title);

        if(isMobile()) {
            $('body').addClass('is_mobile');
        }

        if (chat_input_hint_text) {
            bot_chat.find('.message-input-wrap input.message-input-text').attr('placeholder', chat_input_hint_text);
        }
        if (chat_button_text) {
            bot_chat.find('.message-input-wrap button.btn-send').html(chat_button_text);
        }
        if (chat_width) {
            var chat_width_css = '#BotChatElement .menu-container {max-width: ' + parseInt(chat_width - scroll_width) + 'px !important;}';
            custom_css = chat_width_css + custom_css;
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
            var data_get_log = {
                user_id: g_user_id,
                connect_page_id: g_connect_page_id
            };
            socket.emit('webchat_client_get_log', data_get_log);
            // setTimeout(function () {
            //     socket.emit('webchat_client_get_log', data_get_log);
            // }, 1000);
        }

        showMessageContainer();
        setTimeout(function () {
            $('#BotChatElement').show();
            var msg_body_w = '90%';
            if (chat_show_chat_avatar != void 0 && chat_show_chat_avatar == '1' && img != void 0) {
                var avatar_width = $('.chat-left .chat-avatar').outerWidth(true);
                msg_body_w = 'calc( 90% - ' + avatar_width + 'px)';
            }
            $('.chat-left .chat-body').css('width', msg_body_w);

            //set top for wc-message-groups auto size follow header
            // var chat_header_h = bot_chat.find('.chat-header').innerHeight();
            // var message_input_wrap_h = bot_chat.find('.message-input-wrap').outerHeight();
            // $('#wc-message-groups').css({
            //     'top' : chat_header_h + 'px',
            //     'bottom' : message_input_wrap_h + 'px',
            // });

            //set height header to webchat
            // var post_message_data = {
            //     'header_height' : chat_header_h,
            // };
            // postMessageToClient(post_message_data);
        }, 1000);

    }

    function scrollBottom(message_type) {
        var message_groups = document.getElementById("wc-message-pane");
        if(message_groups != void 0) {
            if(message_type == g_sender_type['bot']){
                setTimeout(function () {
                    message_groups.scrollTop = message_groups.scrollHeight + 200;
                }, 1000);
            }else{
                $("#wc-message-pane").animate({scrollTop: message_groups.scrollTop + 200}, 500);
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
        var bot_chat = $('#BotChatElement');
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
                if(!isEmpty(l['startChat'])) bot_chat.find('.wc-info .wc-send-info').val(l['startChat']);
                if(!isEmpty(l['fillFormToStart'])) bot_chat.find('.wc-info #preChatFormMessageContainer').html(l['fillFormToStart']);
                if(!isEmpty(l['invalid_access_token'])) bot_chat.find('.wc_error_global .error_content').html(l['invalid_access_token']);
                if(!isEmpty(l['menu'])) bot_chat.find('.menu-container .menu-title .title').data('origin_text', l['menu']);
                if(!isEmpty(l['bot_says_title'])) g_new_msg_title = l['bot_says_title'];
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

	//***menu handle***
    var menu_item_num = 0;
    function loadMenu(menu, parent) {
        var menu_item_list = $('.menu-container .menu-item-list');
		$(menu).each(function (index, value) {
            menu_item_num++;
            var menu_item = $('.template_message .menu-item').clone();
            $(menu_item).find('.menu-label').html(value.title);
            $(menu_item).attr({
                'id': 'menu_item_'+menu_item_num,
                'parent_id': parent,
                'parent': 0,
            });

			if(value.hasOwnProperty('call_to_actions')) {
				$(menu_item).find('.menu-next-btn').show();
                $(menu_item).attr('parent', 1);

				loadMenu(value['call_to_actions'], 'menu_item_' + menu_item_num);
			} else {
                switch (value.type) {
                    case menu_type.web_url:
                        $(menu_item).find('a').attr({
                            'href': value.url,
                            'target': '_blank'
                        });
                        break;
                    case menu_type.postback:
                        $(menu_item).attr({
                            'payload': value.payload
                        });
                        break;
                }
            }
            menu_item_list.append(menu_item);
		});
	}

	function setMenu(parent_id) {
		$('.menu-container .menu-item').each(function (index, menu) {
			if($(menu).attr('parent_id') == parent_id){
				$(menu).show();
			}else{
				$(menu).hide();
			}
		});
        var menu_title = $('.menu-container .menu-title');
        var menu_prev = menu_title.find('.menu-prev-btn');
        var title_new= '';
        if(parent_id != '') {
            title_new = $('#'+parent_id).find('.menu-label').text();
            menu_prev.show();
        } else {
            title_new = menu_title.find('.title').data('origin_text');
            menu_prev.hide();
        }
        menu_title.find('.title').html(title_new);
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

    function showHideAvatar(message_from_type) {
        if(g_avatar_show_type == message_from_type) {
            return false;
        } else {
            g_avatar_show_type = message_from_type;
        }
        return true;
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
            'connect_page_id': g_connect_page_id,
            'clear_cookie': true
        };
        postMessageToClient(post_message_data);

        g_connect_page_id = undefined;
        g_user_id = undefined;
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

    //remove all old message in view
    function clearChatMessage() {
        $('#wc-message-group-content').empty();
    }

    //add message box to chat view
    function addChatMessage(elm_msg) {
        if(elm_msg) {
            $('.wc-message-group-content').append(elm_msg);

            initSlick();
        }
    }

    //show #wc-message-group-content
    function showMessageContainer() {
        if($('#wc-message-group-content').hasClass('hidden')) {
            $('#wc-message-group-content').removeClass('hidden');
        }
        resetSlickCarousel();
    }

    //reset height for message container
    /*function resetMessageContainerHeight() {
        //if screen size < height in setting then get screen size
        var window_h = $(window).innerHeight(),
            message_groups = $("#wc-message-pane"),
            header_h = $(".chatview-container .chat-header").outerHeight(true),
            footer_h = $(".chatview-container .message-input-wrap").outerHeight(true);

        if(!$.isNumeric(header_h)) {
            header_h = 0;
        }
        if(!$.isNumeric(footer_h)) {
            footer_h = 0;
        }

        var message_groups_h = (window_h - header_h - footer_h);
        if(message_groups_h > 0) {
            message_groups.css({
                'height' : message_groups_h + 'px'
            });
        }
    }*/

    //reset slick carousel
    function resetSlickCarousel() {
        $('#wc-message-group-content .carousel_message .carousel-inner.slick-initialized').slick("refresh");
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
        //set class for main to check in close chatbox
        var title_main = $('.chat-header .header-title-box .header-title-main');
        //check title, avatar and gradation
        if($('body').hasClass(g_chatbox_close_class_list[g_chatbox_close_list['gradation_icon']])){
            if(title_length < 21) {
                title_box.addClass('title_big1');

            } else if(title_length < 31) {
                title_box.addClass('title_big2');
            }
            if(main_title_length < 21) {
                title_main.addClass('title_big1');

            }
        }else{
            if(title_length < 31) {
                title_box.addClass('title_big1');

            } else if(title_length < 41) {
                title_box.addClass('title_big2');
            }
            if(main_title_length < 31) {
                title_main.addClass('title_big1');
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

    //event when resize every 250ms
    var timeout_window_resize;
    $(window).resize(function () {
        if(!$('body').hasClass('processing_open_close')) {
            clearTimeout(timeout_window_resize);
            timeout_window_resize = setTimeout(function () {
                resetSlickCarousel();
            }, 200);
        }
    });
});