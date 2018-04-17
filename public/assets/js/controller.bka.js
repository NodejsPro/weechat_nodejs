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
    var message_type = {
        'text': '001',
        'generic': '003'
    };
    var scroll_width = 28;
    // var g_time_short = 1 / 24; //1 hour
    var g_time_short = 365; //1 year
    var g_time_short_day = 1; //1 day
    var g_time_long =  2 * 24; //2 years
    var g_new_conversation_flg;
    var ssid = 0;
    var g_bot_name = '';

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
    var g_is_join_room = false;
    var g_mb_get_log_message = false;

    // constants
    var message_from = {
        'user': 1,
        'bot': 2
    };

    // menu data type
    var menu_type = {
        'postback' : "postback",
        'web_url' : "web_url"
    };



    const socket = io();
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
        if(g_mb_get_log_message){
            receiveMessage(msg);
        }
    });
    socket.on('webchat_other_user_send_message', function (data) {
        createUserChat(data)
    });

    socket.on('webchat_other_user_start', function () {
        $('.wc-console').show();
        $('.wc-info').remove();
    });

    socket.on('webchat_status_join', function (msg) {
        // console.log('webchat_status_join');
        // console.log(msg);
        if (msg.status) {
            g_bot_name = msg.page_name;
            resetCookieTime();
            //menu
            var persistent_menu = msg.persistent_menu;
            if(persistent_menu && persistent_menu.persistent_menu && Array.isArray(persistent_menu.persistent_menu)){
                var menu_items = persistent_menu.persistent_menu[0].call_to_actions;
                //clear menu before set menu
                $('.wc-menu-container').removeClass('menu-open');
                $('.menu-item-content .menu-add-content').remove();
                if(menu_items && Array.isArray(menu_items)) loadMenu(menu_items, '');
            }else{
                $('.wc-menu').hide();
                $('.wc-textbox').css('left', '5px');
            }
        } else {
            $('#BotChatElement').find('.wc-message-pane, .wc-console').remove();
            $('.wc_error_global').show();
        }
        applySetting(msg);
    });

    socket.on('webchat_server_send_log', function (msg) {
        if (msg.message != void 0 && msg.message.constructor == Array && msg.message.length > 0) {
            setMessagesHistory(msg.message);
        }
        g_mb_get_log_message = true;
        setTimeout(function () {
            $('#wc-message-group-content').show();
            scrollBottom();
        }, 1000)
    });

    window.onfocus = function () {
        if(g_new_msg_flg) {
            changeTitle(false);
        }
    };

    function receiveEventClient(event) {
        if (event != void 0 && event.data != void 0 && event.data.maximize_flg){
            var data_get_log = {
                user_id: g_user_id,
                connect_page_id: g_connect_page_id
            };
            socket.emit('webchat_client_get_log', data_get_log);
            return;
        }
        if(g_is_join_room) return;
        //not create cookie then set g_is_safari follow event.data.is_safari
        /*if (!g_cookie_support && event != void 0 && event.data != void 0 && event.data.is_safari != void 0 && event.data.is_safari) {
            g_is_safari = true;
        }*/
        //if exist user variable in param then use it
        var param_connect_page_id = getParam('connect_page_id'),
            param_user_id = getParam('user_id');
        // param_user_full_name = getParam('user_full_name'),
        // param_user_mail = getParam('user_mail');

        if(param_connect_page_id && param_user_id) {
            var cookie_data = {
                'wc_connect_page_id': param_connect_page_id,
                'wc_user_id': param_user_id,
                // 'wc_user_full_name': param_user_full_name,
                // 'wc_user_mail': param_user_mail
            };
            setCookieValue(cookie_data);
        }
        if(g_cookie_support) {
            g_user_id = getCookie('wc_user_id_' + param_connect_page_id);
            g_connect_page_id = getCookie('wc_connect_page_id_' + param_connect_page_id);
            // g_user_full_name = getCookie('wc_user_full_name');
            // g_user_email = getCookie('wc_user_mail');

        } else if (event != void 0 && event.data != void 0 && event.data.cookie != void 0) {
            var cookies = event.data.cookie;
            if(cookies['is_mobile'] != void 0){
                g_mobile_flg = cookies['is_mobile'];
            }
            if (cookies['wc_user_id_' + param_connect_page_id] != void 0) {
                g_user_id = cookies['wc_user_id_' + param_connect_page_id];
            }
            if (cookies['wc_connect_page_id_' + param_connect_page_id] != void 0) {
                g_connect_page_id = cookies['wc_connect_page_id_' + param_connect_page_id];
            }
            // if (event.data.cookie.wc_user_full_name != void 0) {
            //     g_user_full_name = event.data.cookie.wc_user_full_name;
            // }
            // if (event.data.cookie.wc_user_mail != void 0) {
            //     g_user_email = event.data.cookie.wc_user_mail;
            // }
        }
        checkConnectPageid();
        g_is_join_room = true;
    }

    // send message
    function sendMessage() {
        var msg_input = $('.wc-shellinput').val();

        $('.wc-message-wrapper .wc-message-from-bot .quick-container').hide();
        if (msg_input != '' && g_user_id && g_connect_page_id) {
            createUserChat(msg_input);
            //prepare data send to server
            var user_send_message = {
                'user_id': g_user_id,
                'connect_page_id': g_connect_page_id,
                'type': user_send.message_user_text,
                'message': {
                    'text': msg_input
                }
            };
            socket.emit('webchat_user_send_message', user_send_message);
            $('.wc-shellinput').val("");

        }
    }

    // creat view chat for user
    function createUserChat(msg) {
        var text = msg;
        if (msg.message_type == user_send.message_user_payload) {
            text = msg.message;
        } else if (msg.message != void 0 && msg.message.text != void 0) {
            text = msg.message.text;
        }
        var send = $('.send_message_clone').clone();
        $(send).show();
        $(send).attr({'class': 'wc-message-wrapper list'});
        $(send).find('.format-markdown p').empty().html(text);
        $('.wc-message-group-content').append(send);
        // scrollBottom();
    }

    // receive message
    function receiveMessage(msg) {
        var messages = new Array();
        messages.push(msg);

        $('.wc-message-wrapper .wc-message-from-bot .quick-container').hide();
        var show_flg = true;
        if (msg.type != void 0 && msg.type == message_from.user && msg.message_type == user_send.message_user_payload) {
            createUserChat(msg)
        } else {
            createBotChat(msg, show_flg);
            //set notification new message to title of client site
            changeTitle(true);
        }
        scrollBottom();
        // initCarouselPreview();
    }

    // creat view chat for bot
    function createBotChat(messages, show_flg) {
        // console.log(messages)
        if(messages.message != void 0){
            var messages_data = messages.message;
            // var is_carousel = false;
            var c_msg = [];
            var c_cnt = 0;
            $(messages_data).each(function (index, msg) {
                var receive = $('.receive_message_clone').clone().show();
                $(receive).removeClass('receive_message_clone');
                if (msg.quick_replies != void 0) {
                    receive = viewQuickReply(receive, msg);
                    if(show_flg != void 0 && !show_flg){
                        receive.find('.quick-container').hide();
                    }else{
                        receive.find('.quick-container').show();
                    }
                }else if (msg.attachment != void 0 && msg.attachment.payload != void 0 && msg.attachment.payload.buttons != void 0) {
                    receive = viewButton(receive, msg);
                }else if (msg.text != void 0 && typeof msg.text === 'string') {
                    $(receive).attr({'class': 'wc-message-wrapper list'});
                    $(receive).find('.wc-message-content').addClass('wc-text');
                    $(receive).find('.text-message').empty().html(str_replace(msg.text));
                    if (typeof msg.from !== 'undefined') {
                        $(receive).find('.wc-message-from-bot span').empty().html(msg.from.name);
                    }
                }else if (msg.attachment != void 0 && msg.attachment.payload != void 0 && msg.attachment.payload.elements != void 0) {
                    c_msg.push(msg);
                    receive = setTmpGeneric(receive, msg, c_cnt);
                    c_cnt++;
                    // is_carousel = true;
                }else if (msg.attachment != void 0 && msg.attachment.payload != void 0 && msg.attachment.payload.url != void 0) {
                    receive = viewFile(receive, msg);
                }else if(msg.mail != void 0 || msg.api != void 0 ){
                    return;
                }
                $('.wc-message-group-content').append(receive);
                if(c_msg.length > 0){
                    setTimeout(function () {
                        viewGeneric(c_msg);
                        callInitCarouselPreview();
                        scrollBottom();
                    }, 1100)
                }
            });
        }

        // scrollTop();
    }

    function callInitCarouselPreview() {
        initCarouselPreview();
        $('#wc-message-group-content .carousel_message .carousel-inner').slick("refresh");
    }
    // scroll bot bottom of chat box
    function scrollTop() {
        var elem = document.getElementById('wc-message-groups');
        elem.style.bottom = '50px';
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

    function setMessagesHistory(messages) {
        $('#wc-message-group-content').empty();
        var show_flg = true;
        $(messages).each(function (index, value) {
            if (value.type == message_from.user) {
                createUserChat(value);
            } else {
                if(value.message_type == BOT_TYPE_QUICK_REPLIES && messages[index +1] != void 0){
                    show_flg = false;
                }
                createBotChat(value, show_flg);
                show_flg = true;
            }
        });

        //init carousel
        // initCarouselPreview();
        // $('#wc-message-group-content .carousel_message .carousel-inner').slick("refresh");
        //
        // scrollBottom();
    }

    function viewButton(bot_chat, message_data) {
        bot_chat.find('.wc-message-content').addClass('wc-button');
        bot_chat.find('.text-message').addClass('button-title').html(message_data.attachment.payload.text);
        var buttons = viewButtonList(message_data.attachment.payload.buttons, bot_chat.find('.format-markdown'));
        bot_chat.find('.format-markdown').append(buttons);
        return bot_chat
    }

    function viewFile(box_chat, message_data) {
        message_data = message_data.attachment;
        box_chat.find('.wc-message-content').addClass('wc-file');
        box_chat.find('.format-markdown .text-message').remove();

        var image = '<a class="link_file" target="_blank"><img class="img_file"></a>',
            video = '<video controls="controls" class="video" src="" ></video>';
        var file_type = message_data.type,
            file_url = message_data.payload.url,
            file_preview = file_url;

        var conversation_file = $('#wc-message-groups .template .conversation_file').clone();
        if (file_type == 'image' || file_type == 'file') {
            conversation_file.append(image);
            conversation_file.find('.img_file').attr('src', file_preview);
            if (message_data.payload.sticker_id == void 0) {
                conversation_file.find('.link_file').attr('href', file_url);
            }
            if (file_type == 'file') {
                conversation_file.find('.img_file').addClass('file');
            }
            //if is sticker then not use tyle border radius
            if (message_data.payload.sticker_id != void 0 && message_data.payload.sticker_id != '') {
                conversation_file.removeClass('radius');
            }

        } else if (file_type == 'video') {
            conversation_file.append(video);
            conversation_file.find('.video').attr('src', file_url);
        }
        box_chat.find('.format-markdown').append(conversation_file);

        return box_chat;
    }

    function viewGeneric(message_data) {
        for( var id in message_data){
            var carousel_message = $('#carousel_' + id);
            var message_data_item = message_data[id];
            if (message_data_item.attachment != void 0 && message_data_item.attachment.payload != void 0 && message_data_item.attachment.payload.elements != void 0) {
                $.each(message_data_item.attachment.payload.elements, function (index, item) {
                    var carousel_item = $('#wc-message-groups .template_message .carousel_item .item').clone();
                    if (index == 0) {
                        carousel_item.addClass('active');
                    }
                    carousel_item.find('.carousel-caption-top').html(item.title);
                    carousel_item.find('.carousel-sub-caption').html(item.subtitle);
                    if (item.image_url != void 0 && item.image_url != '') {
                        carousel_item.find('.image img').attr('src', item.image_url);
                    } else {
                        carousel_item.find('.image img').remove();
                    }
                    //button list
                    if (item.buttons != void 0) {
                        carousel_item = viewButtonList(item.buttons, carousel_item);
                        carousel_message.find('.carousel-inner').append(carousel_item);
                    }
                });
            }
            carousel_message.attr('id', '');
        }
    }

    function setTmpGeneric(box_chat, message_data, index) {
        box_chat.find('.wc-text-format').empty();
        var carousel = $('#wc-message-groups .template_message .carousel_message').clone();
        var carousel_id = 'carousel_' + index;
        carousel.find('.carousel-slick-control').attr('href', '#' + carousel_id);
        if (message_data.attachment != void 0 && message_data.attachment.payload != void 0 && message_data.attachment.payload.elements != void 0) {
            carousel.attr('id', carousel_id);
            box_chat.find('.wc-text-format').append(carousel);
        }
        return box_chat;
    }

    function viewQuickReply(bot_chat, message_data, message_id) {
        if(message_data != void 0 && message_data.quick_replies != void 0) {
            var quick_wrap = bot_chat.find('.wc-text-format').addClass('quick-replies');
            bot_chat.find('.text-message').html('<span class="quick-reply-text">' + ((message_data.text != void 0) ? message_data.text : '' + '</span>'));
            bot_chat.find('.text-message').append('<div class="quick-container">' + '</div>');
            $.each(message_data.quick_replies, function (index, item) {
                var btn_item;
                if(item.content_type == 'location'){
                    btn_item = $('#wc-message-groups .fb_template .quick-replies-location-item').clone();
                    btn_item.append('Send Location');
                }else{
                    btn_item = $('#wc-message-groups .fb_template .quick-replies-item').clone();
                    btn_item.attr({payload : item.payload});
                    btn_item.html(item.title);
                }
                btn_item.attr('href', item.url);
                bot_chat.find('.quick-container').append(btn_item);
            });
        }
        return bot_chat;
    }

    function chMail(email) {
        ml = /.+@.+\..+/;
        if(!email.match(ml)) {
            return false;
        }
        return true;
    }

    function sendUserInfo() {
        console.log('sendUserInfo');
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

            $('.wc-info').hide();
            $('.wc-console').show();
            $('.wc-message-groups').css({
                'overflow-y': 'scroll',
                'bottom': '50px'
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

    // function showWebChat() {
    //     $('.wc-info').remove();
    //     $('.wc-console').show();
    //     $('.wc-message-groups').css({
    //         'overflow-y': 'scroll',
    //         'bottom': '50px'
    //     });
    // }

    function viewButtonList(buttons, element) {
        $.each(buttons, function (ind, val) {
            var btn_item = $('#wc-message-groups .template .button').clone().addClass('button-item');
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
            socket.emit('webchat_join', wc_join_room);
        }
    }

    function initCarouselPreview() {
        var carousels = $('#wc-message-group-content .carousel_message .carousel-inner').not('.slick-initialized');
        if (carousels.length) {
            var webchat_w = $(document).width();
            var item_width = 272;
            var item_show_num = 3;
            var carousel_width;

            //set number slide show
            if(Math.ceil(webchat_w / item_width) < item_show_num) {
                item_show_num = Math.floor(webchat_w / item_width);
            }
            carousel_width = Math.ceil(item_width * item_show_num);
            $(carousels).each(function (i, e) {
                $(this).parent().css('width', carousel_width);
                var next = $(this).parent().find('.right.carousel-slick-control'),
                    prev = $(this).parent().find('.left.carousel-slick-control');
                var option = {
                    slidesToScroll: 1,
                    arrows: true,
                    dots: false,
                    infinite: false,
                    autoplay: false,
                    cssEase: 'linear',
                    nextArrow: next,
                    prevArrow: prev,
                    slidesToShow: item_show_num
                };

                $(this).on('init', function(event, slick){
                    CheckCarousel(prev, next);
                    var number_button = slick.$list.find('.slick-current .button').length;
                    if(number_button != void 0){
                        prev.addClass('type_' + number_button);
                        next.addClass('type_' + number_button);
                    }
                });

                $(this).slick(option).on('afterChange', function(event, slick, currentSlide, nextSlide){
                    CheckCarousel(prev, next)
                });
            });
        }
    }

    function CheckCarousel(prev, next) {
        if(prev.hasClass('slick-disabled') || prev.hasClass('slick-hidden')){
            prev.hide();
        }else{
            prev.show();
        }
        if(next.hasClass('slick-disabled') || next.hasClass('slick-hidden')){
            next.hide();
        }else{
            next.show();
        }
    }
    // function newConversation(data) {
    //     console.log('new conversation', data);
    //     if(g_cookie_support){
    //         var user_id = getCookie('wc_user_id'),
    //             connect_page_id = getCookie('wc_connect_page_id');
    //         if(user_id == void 0 && connect_page_id == void 0){
    //             console.log('newConversation set cookies');
    //             setCookieValue(data);
    //         }
    //         g_user_id = data.user_id;
    //         g_connect_page_id = data.connect_page_id;
    //         showWebChat();
    //     }
    // }

    //reset cookie time
    function resetCookieTime() {
        var current_time = Math.round(new Date() / 1000);
        if(g_cookie_time_flg == void 0 || (current_time - g_cookie_time_flg > g_cookie_time_update)) {
            var cookie_data = {
                'wc_user_id': g_user_id,
                'wc_connect_page_id': g_connect_page_id,
                // 'wc_user_full_name': g_user_full_name,
                // 'wc_user_mail': g_user_email
            };
            setCookieValue(cookie_data);
            //update flg time to set cookie
            g_cookie_time_flg = current_time;
        }
    }

    function setCookieValue(data) {
        var data_user_id = (data != void 0 && data.wc_user_id != void 0) ? data.wc_user_id : '',
            data_connect_page_id = (data != void 0 && data.wc_connect_page_id != void 0) ? data.wc_connect_page_id : '';
            // data_user_full_name = (data != void 0 && data.wc_user_full_name != void 0) ? data.wc_user_full_name : '',
            // data_user_mail = (data != void 0 && data.wc_user_mail != void 0) ? data.wc_user_mail : '';

        if(g_reset_cookie_time_flg != void 0 && g_reset_cookie_time_flg){
            if(g_cookie_support) {
                setCookie("wc_user_id_" + data_connect_page_id, data_user_id, g_time_short);
                setCookie("wc_connect_page_id_" + data_connect_page_id, data_connect_page_id, g_time_short);
                // setCookie("wc_user_full_name", data_user_full_name, g_time_long);
                // setCookie("wc_user_mail", data_user_mail, g_time_long);
            } else {
                //SAFARI browser: reset cookie in client site
                var cookie = {};
                cookie['wc_user_id_' + data_connect_page_id] = data_user_id;
                cookie['wc_connect_page_id_' + data_connect_page_id] = data_connect_page_id;
                var post_message_data = {
                    // 'cookie' : {
                    //     'wc_user_id': data_user_id,
                    //     'wc_connect_page_id': data_connect_page_id,
                    //     // 'wc_user_full_name': data_user_full_name,
                    //     // 'wc_user_mail': data_user_mail
                    // }
                    'cookie' : cookie
                };
                postMessageToClient(post_message_data);
            }
            g_reset_cookie_time_flg = false;
        }
    }

    //*** bind enter event send message***
    $('input[type=text]').on('keydown', function (e) {
        if (e.which == 13) {
            sendMessage();
        }
    });

    $('.wc-send').click(function () {
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

    $('#wc-message-groups').on('click', '.quick-replies-item', function () {
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

    function applySetting(data) {
        if(data.setting == void 0){
            data.setting = {};
        }
        var setting_data = data.setting;
        var bot_chat = $('#BotChatElement');
        var chat_title = setting_data.title != void 0 ? setting_data.title : '',
            chat_input_hint_text = setting_data.input_hint_text != void 0 ? setting_data.input_hint_text : '',
            chat_button_text = setting_data.button_text != void 0 ? setting_data.button_text : '',
            chat_color = setting_data.color != void 0 ? setting_data.color : '',
            chat_lang = setting_data.lang != void 0 ? setting_data.lang : 'ja',
            chat_show_chat_avatar = setting_data.show_chat_avatar != void 0 ? setting_data.show_chat_avatar : '',
            chat_width = setting_data.width != void 0 ? setting_data.width : 300,
            chat_height = setting_data.height != void 0 ? setting_data.height : 400,
            show_onload = setting_data.show_onload != void 0 ? setting_data.show_onload : '';

        //add prefix # for color
        if (chat_color != void 0 && chat_color.search('rgba') < 0) {
            chat_color = '#' + chat_color;
        }
        if (chat_lang) {
            fillLanguage(chat_lang);
        }
        g_new_msg_title = g_bot_name + g_new_msg_title;

        var post_message_data = {
            'iframe_setting' : {
                'width': chat_width,
                'height': chat_height,
                'show_onload': show_onload,
                'color': chat_color
            },
            'new_msg_title' : g_new_msg_title,
        };

        var img = data.picture;
        if (chat_show_chat_avatar != void 0 && chat_show_chat_avatar == '1' && img != void 0) {
            $('.chat-avatar.bot-avatar').show();
            $('.chat-avatar.bot-avatar img').attr('src', img);
            changeFavicon(img);
        } else {
            $('.chat-avatar').hide();
        }

        if (chat_title) {
            bot_chat.find('.wc-header-text').html(chat_title);
        }
        if (chat_input_hint_text) {
            bot_chat.find('.wc-console input.wc-shellinput').attr('placeholder', chat_input_hint_text);
        }
        if (chat_button_text) {
            bot_chat.find('.wc-console button.btn-send').html(chat_button_text);
        }
        if (chat_color) {
            bot_chat.find('.wc-header, .wc-send-info, .wc-send .btn-send').css({
                'background-color': chat_color
            });
        }
        if (chat_width) {
            bot_chat.find('.menu-list').css('max-width', parseInt(chat_width - scroll_width) + 'px');
        }

        postMessageToClient(post_message_data);

        if(!isMobile() || (window == window.parent)){
            var data_get_log = {
                user_id: g_user_id,
                connect_page_id: g_connect_page_id
            };
            setTimeout(function () {
                socket.emit('webchat_client_get_log', data_get_log);
            }, 1000);
        }

        setTimeout(function () {
            $('#BotChatElement').show();
        }, 1000)

    }

    function scrollBottom() {
        var message_groups = document.getElementById("wc-message-groups");
        if(message_groups != void 0) {
            message_groups.style.bottom = '50px';
            message_groups.scrollTop = message_groups.scrollHeight;
        }
    }

    function postMessageToClient(data) {
        //send data to local
        // console.log('server send msg: ', data);
        parent.postMessage(data, '*');
    }

    function fillLanguage(lang) {
        var bot_chat = $('#BotChatElement');
        var lang_scrip = document.createElement('script');
        lang_scrip.type = 'text/javascript';
        lang_scrip.async = 1;
        lang_scrip.src = '/js/locales/' + lang + '.js';
        bot_chat.after(lang_scrip);

        if (!isEmpty($.fn.fileinputLocales[lang])) {
            //add language script
            var l = $.fn.fileinputLocales[lang];
            if(!isEmpty(l['startChat'])) bot_chat.find('.wc-info .wc-send-info').val(l['startChat']);
            if(!isEmpty(l['fillFormToStart'])) bot_chat.find('.wc-info #preChatFormMessageContainer').html(l['fillFormToStart']);
            // if(!isEmpty(l['your_name'])) bot_chat.find('.wc-info input.wc-txt-name').attr('placeholder', l['your_name']);
            // if(!isEmpty(l['your_mail'])) bot_chat.find('.wc-info input.wc-txt-email').attr('placeholder', l['your_mail']);
            if(!isEmpty(l['invalid_access_token'])) bot_chat.find('.wc_error_global .error_content').html(l['invalid_access_token']);
            if(!isEmpty(l['menu'])) bot_chat.find('.wc-menu-container #menu-header-text, .wc-menu-container #menu-header-hide').html(l['menu']);
            if(!isEmpty(l['bot_says_title'])) g_new_msg_title = l['bot_says_title'];
        }
    }

    function changeFavicon(src) {
        var link = document.createElement('link'),
            oldLink = document.getElementById('dynamic-favicon');
        link.id = 'dynamic-favicon';
        link.rel = 'shortcut icon';
        link.href = src;
        if (oldLink) {
            document.head.removeChild(oldLink);
        }
        document.head.appendChild(link);
    }

    function isEmpty (value, trim) {
        return value === undefined || value === null || value.length === 0 || (trim && $.trim(value) === '');
    }

	//***menu handle***
    function loadMenu(menu, parent) {
        var menu_content = $('.menu-item-content');
		$(menu).each(function (index, value) {
			ssid++;
			if(value.hasOwnProperty('call_to_actions')){
				var menu_parent = $('.clone_menu .menu-add-content').clone();
				$(menu_parent).find('.submenu-title').html(value.title);
				$(menu_parent).find('.btn-next-menu').show();
				$(menu_parent).attr({
					'id': 'ssid_'+ssid,
					'parent': parent,
					'isParent': 1,
				});
                menu_content.append(menu_parent);

				loadMenu(value['call_to_actions'], 'ssid_'+ssid);
			}else {
                var menu_child = $('.clone_menu .menu-add-content').clone();
                $(menu_child).find('.submenu-title').html(value.title);
                $(menu_child).attr({
                    'id': 'ssid_' + ssid,
                    'parent': parent,
                    'isParent': 0
                });
                switch (value.type) {
                    case menu_type.web_url:
                        $(menu_child).find('.menu-item-link').attr({
                            'href': value.url,
                            'target': '_blank'
                        });
                        break;
                    case menu_type.postback:
                        $(menu_child).attr({
                            'payload': value.payload
                        });
                        break;
                }
                menu_content.append(menu_child);
            }
		});
		// menu_tab++;
	}

	function setMenu(parent) {
		$('.menu-add-content').each(function (index, menu) {
			if($(menu).attr('parent') == parent){
				$(menu).show();
			}else{
				$(menu).hide();
			}
		});
        var menu_prev = $('.btn-prev-menu');
        if(parent != ''){
            var name = $('#'+parent).find('.submenu-title').text();
            menu_prev.show();
        }else{
            var name = $('#menu-header-hide').html();
            menu_prev.hide();
        }
        $('.menu-title .title').html(name);
	}

	// click on menu child
    $(document).on('click', '.menu-add-content', function () {
        if($(this).attr('isParent') == 1){
            setMenu($(this).attr('id'));
            $('.menu-title').attr('parent', $(this).attr('parent'));
        }
        if($(this).attr('payload')){
			var postback = {
				user_id: g_user_id,
				connect_page_id: g_connect_page_id,
				payload: $(this).attr('payload')
			};
			socket.emit('webchat_user_send_postback',postback);
			$('.wc-menu-container').removeClass('menu-open');
        }
    });

	// click on menu title
	$('.menu-title').click(function () {
		setMenu($(this).attr('parent'));
		var parent_id = $(this).attr('parent');
		var new_parent_id = $('#'+parent_id).attr('parent');
		$('.menu-title').attr('parent', new_parent_id);
    });

	$('.wc-menu').click(function () {
		document.getElementsByClassName('wc-menu-container')[0].classList.toggle("menu-open");
		setMenu("");
	});

    //hide menu when click to outsite
    $(document).on('click', function( e ) {
        var element = $(e.target);
        if($('.wc-menu-container').hasClass('menu-open')
            && !element.hasClass('wc-menu') && !element.parents('.wc-menu').length
            && !element.hasClass('menu-title') && !element.parents('.menu-title').length
            && !(element.hasClass('menu-add-content').length && element.attr('isparent') === '1')
            && !(element.parents('.menu-add-content').length && element.parents('.menu-add-content').attr('isparent') === '1')
        ) {
            $('.wc-menu').click();
        }
    });

    //get param url
    function getParam(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
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

});