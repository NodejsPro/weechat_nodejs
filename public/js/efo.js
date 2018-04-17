var g_connect_page_id = undefined;
var g_user_id = undefined;
var origin_url = '';

var g_preview_flg_param = '';
var g_refresh_log_flg_param = '';
var g_force_log_param = '';

//name cookie for session conversation
var g_cookie_connect_page_id_name = 'wc_connect_page_id';
var g_cookie_user_id_name = 'wc_user_id';
var g_maximize_flg_name = 'maximize_flg';

var wc_server_url = '';
var g_get_log_message = false;

//list type animation show chatbox PC version
var g_chatbox_show_type_list = {
    'upward'    : '001',
    'leftward'  : '002'
};
//type default animation show chatbox PC version
var g_chatbox_show_type = '001';

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

//change title variable
var original_title = document.title;
var new_msg_title = 'Bot say...';
var new_msg_flg = false;
var g_time_short = 24; //1 day = 24 hours

//create div container
var webchat_ctn = document.createElement("div");
webchat_ctn.setAttribute("class", "wc-webchat-ctn wc-close");
webchat_ctn.setAttribute("status", "closed");
if (isMobile()) {
    webchat_ctn.classList.add('wc-mobile');
}

//create right open chat box
var right_open_box = document.createElement("div");
right_open_box.setAttribute("class", "right_open_box");
var right_open_label = document.createElement("span");
right_open_label.setAttribute("class", "right_open_label");

//create div webchat box for not scroll in outsite
var webchat_box = document.createElement("div");
webchat_box.setAttribute("class", "wc-webchat-box");

//create div container
var iframe = document.createElement("iframe");
iframe.setAttribute("class", "wc-webchat");
iframe.setAttribute("id", "wc-webchat");

//windown hash origin value
var window_efo_hash = 'efo';
//if true: enable auto open webchat function
var first_open_flg = false;

//get data from iframe to config in local
var iframe_setting = '';


function embot_init(url, connect_page_id_param, preview_flg_param, refresh_log_flg_param, force_log_param) {
	//cookie global name
	g_connect_page_id = connect_page_id_param;

    //name cookie for session conversation
    g_preview_flg_param = preview_flg_param;
    g_refresh_log_flg_param = refresh_log_flg_param;
    g_force_log_param = force_log_param;

    if(g_preview_flg_param != void 0 && g_preview_flg_param && g_refresh_log_flg_param != void 0 && g_refresh_log_flg_param) {
        g_cookie_connect_page_id_name = 'wc2_connect_page_id_' + g_connect_page_id;
        g_cookie_user_id_name = 'wc2_user_id_' + g_connect_page_id;
        g_maximize_flg_name = 'maximize2_flg_' + g_connect_page_id;

    } else if(g_preview_flg_param != void 0 && g_preview_flg_param) {
        g_cookie_connect_page_id_name = 'wc1_connect_page_id_' + g_connect_page_id;
        g_cookie_user_id_name = 'wc1_user_id_' + g_connect_page_id;
        g_maximize_flg_name = 'maximize1_flg_' + g_connect_page_id;
	}

	//url variable
	origin_url = url.split('/efo');
	origin_url = origin_url.shift();

	wc_server_url = url;
	if(url.indexOf('?') > 0) {
		wc_server_url += '&';
	} else {
		wc_server_url += '?';
	}
	wc_server_url += 'connect_page_id=' + g_connect_page_id;
    //add param preview_flg if exist
    if(g_preview_flg_param != void 0 && g_preview_flg_param) {
        wc_server_url += '&preview_flg=' + g_preview_flg_param;
    }
    //add param refresh_log_flg if exist
    if(g_refresh_log_flg_param != void 0 && g_refresh_log_flg_param) {
        wc_server_url += '&refresh_log_flg=' + g_refresh_log_flg_param;
    }
    //add param force_log_flg if exist
    if(g_force_log_param != void 0 && g_force_log_param) {
        wc_server_url += '&force_log_flg=' + g_force_log_param;
    }

    iframe.setAttribute("src", wc_server_url);


	if (window.addEventListener) {
		window.addEventListener("message", function(event) {
            if(event.data != void 0) {
                if(event.data.chat_box_open_close){
                    //close, open chat box
                    if(event.data.connect_page_id != void 0 && event.data.connect_page_id == g_connect_page_id) {
                        chatBoxOpenClose();
                    } else {
                        //if conversation was ended. Close chatbox when click to header
                        chatBoxOpenClose(false);
                    }
                }

                if(event.data.connect_page_id != void 0 && event.data.connect_page_id == g_connect_page_id) {
                    //set user id to global variable
                    if(event.data.user_id != void 0) {
                        g_user_id = event.data.user_id;
                    }

                    if(event.data.iframe_setting != void 0) {
                        //notify for client efo is ready
                        createDispatchEvent('efo_load_ready');

                        iframe_setting = event.data.iframe_setting;
                        setSetting(iframe_setting);

                    } else if(event.data.cookie != void 0) {
                        //if browser not allow create cookie of iframe then set cookie to client
                        for(var cookie_name in event.data.cookie) {
                            if(event.data.cookie[cookie_name] != void 0) {
                                setCookie(cookie_name, event.data.cookie[cookie_name], g_time_short);
                            }
                        }

                    } else if(event.data.change_title != void 0 && event.data.change_title) {
                        setTitle(event.data.change_title);

                    } else if(event.data.limit_user_chat){
                        webchat_ctn.style.display = 'none';

                    } else if(event.data.clear_cookie){
                        //clear all cookie
                        clearAllCookie();

                    } else if(event.data.cv_data != void 0) {
                        console.log("preview_flg_param=" + preview_flg_param);
                        if(!(preview_flg_param != void 0 && preview_flg_param)) {
                            console.log("tracking");
                            var g_cv_type = {
                                'google_analytic': '001',
                                'google_adword': '002',
                                'yahoo_link': '003'
                            };

                            var event_cv_data = event.data.cv_data;
                            if(!isEmpty(event_cv_data.list) && event_cv_data.list.length) {
                                $(event_cv_data.list).each(function (i, cv_type) {
                                    switch (cv_type) {
                                        case g_cv_type.google_analytic: {
                                            if(!isEmpty(event.data.gtag_data)) {
                                                //google analytics
                                                try {
                                                    if(typeof ga  === 'function') {
                                                        ga('send', 'event', event.data.gtag_data.event_category, event.data.gtag_data.event_action);
                                                    }else{
                                                        window.dataLayer = window.dataLayer || [];
                                                        function gtag(){dataLayer.push(arguments);}
                                                        gtag('event', 'cv_botchan_efo', {
                                                            'event_category': event.data.gtag_data.event_category,
                                                            'event_action': event.data.gtag_data.event_action
                                                        });
                                                    }
                                                }catch (e) {
                                                    console.log(e);
                                                }
                                            }
                                        }
                                            break;
                                        case g_cv_type.google_adword: {
                                            //google adword
                                            console.log(typeof goog_report_conversion);
                                            console.log(typeof gtag_report_conversion);
                                            try{
                                                if(typeof goog_report_conversion  === 'function'){
                                                    goog_report_conversion();
                                                }else if(typeof gtag_report_conversion  === 'function'){
                                                    gtag_report_conversion();
                                                }
                                            } catch (e) {
                                                console.log(e);
                                            }
                                        }
                                            break;
                                        case g_cv_type.yahoo_link: {
                                            //create iframe request to increase CV
                                            if(!isEmpty(event_cv_data['yahoo_url'])) {
                                                createIframe(event_cv_data['yahoo_url']);
                                            }
                                        }
                                            break;
                                    }

                                });
                            }
                        }

                    } else if (event.data.efo_add_to_cart_event != void 0) {
                        //send event to client update product
                        var cart_event_data = event.data.efo_add_to_cart_event;
                        if(!isEmpty(cart_event_data.action_name) && !isEmpty(cart_event_data.action_data)) {
                            //dispatch event to check in client
                            createDispatchEvent('efo_add_to_cart_event', {'detail' : cart_event_data});
                        }

                    } else if (event.data.efo_document_event != void 0) {
                        //send event to client update product
                        var cart_event_data = event.data.efo_document_event;
                        if(!isEmpty(cart_event_data.action_name) && !isEmpty(cart_event_data.action_data)) {
                            //dispatch event to check in client
                            createDispatchEvent('efo_document_event', {'detail' : cart_event_data});
                        }

                    } else if (event.data.conversation_end != void 0) {
                        createDispatchEvent('efo_conversation_end_event');

                    }

                    if(event.data.new_msg_title != void 0 && event.data.new_msg_title) {
                        new_msg_title = event.data.new_msg_title;
                    }
                }
            }
		}, false);
	}

    //Send data to iframe
    window.addEventListener('load', function () {
        // init after load page
        if (isMobile()) {
            minimizeWc();
        }

        setTimeout(function(){
			var post_msg_data = {};
			var user_id = getCookie(g_cookie_user_id_name),
				connect_page_id = getCookie(g_cookie_connect_page_id_name);

			//exist cookie iframe in client then that browser not allow create cookie for iframe
            var cookie = {};
            cookie['is_mobile'] = isMobile();
            if(user_id && connect_page_id) {
            	cookie[g_cookie_user_id_name] = user_id;
            	cookie[g_cookie_connect_page_id_name] = connect_page_id;
            }
            post_msg_data['cookie'] = cookie;
			postMessageToServer(post_msg_data);
        }, 500);

		//set origin title when click insite
		window.onfocus = function () {
			if(new_msg_flg) {
				setTitle(false);
			}
		};

    }, false);

	//check close chat box when click to back browser
	window.addEventListener("popstate", function(e){
		if(isMobile()) {
			if(window.location.hash != ('#' + window_efo_hash)) {
				if(webchat_ctn.getAttribute('status') == 'opening') {
					minimizeWc();
				}
			} else {
				//case: open chat box and close chat box -> history back. Browser exist next url with hash efo -> history back
				history.back();
			}
		}
	});


	//append child to iframe container
	webchat_box.appendChild(iframe);
	webchat_ctn.appendChild(webchat_box);
	document.body.appendChild(webchat_ctn);

    //open close chat box
    right_open_box.addEventListener('click', function () {
        chatBoxOpenClose();
    });

}

//check to show, hide chat box
function chatBoxOpenClose(create_cookie_flg) {
    if(webchat_ctn.getAttribute('status') == 'opening'){
        //close chat box then history back
        if(isMobile() && window.location.hash == ('#' + window_efo_hash)) {
            history.back();
        }
        minimizeWc(create_cookie_flg);
    }else{
        maximizeWc(create_cookie_flg);
    }
}

function setSetting(iframe_setting) {
    //set setting for iframe
    var iframe_width = iframe_setting.width,
        iframe_height = iframe_setting.height,
        show_onload = iframe_setting.show_onload,
        chat_color = iframe_setting.color,
        chat_color_name = iframe_setting.color_name,
        time_show_onload = iframe_setting.time_show_onload,
        sp_icon_bottom = iframe_setting.sp_icon_bottom,
        sp_icon_right = iframe_setting.sp_icon_right,
        pc_icon_type = iframe_setting.pc_icon_type,
        pc_icon_bottom = iframe_setting.pc_icon_bottom,
        chat_lang = iframe_setting.chat_lang,
        sub_title = iframe_setting.sub_title,
        sub_sub_title = iframe_setting.sub_sub_title,
        close_type_code = iframe_setting.close_type_code;

    if(iframe_width && iframe_width > 0) {
        webchat_ctn.style.width = iframe_width + 'px';
        webchat_ctn.setAttribute('data-width', iframe_width);
    }
    if(iframe_height && iframe_height > 0) {
        webchat_ctn.style.height = iframe_height + 'px';
        //data-width, data-height to get in minimize case
        webchat_ctn.setAttribute('data-height', iframe_height);
    }
    if (chat_lang) {
        //set language to webchat_ctn
        webchat_ctn.classList.add(chat_lang);
    }
    //set minimize open type
    if(pc_icon_type && pc_icon_type == g_chatbox_show_type_list.leftward) {
        g_chatbox_show_type = g_chatbox_show_type_list.leftward;
    }

    //add class close type to body
    webchat_ctn.classList.add(g_chatbox_close_class_list[close_type_code]);
    if(chat_color_name) {
        webchat_ctn.classList.add('theme_' + chat_color_name);
    }

    if(!isMobile()) {
        //PC and minimize box is right: add right_open_box to webchat_ctn and set style
        if(g_chatbox_show_type == g_chatbox_show_type_list.leftward) {
            if(chat_color) {
                right_open_box.style.backgroundColor = chat_color;
                right_open_box.style.border = 'none';
                right_open_box.style.color = '#fff';
                right_open_box.style.display = 'none';
                right_open_box.style.bottom = (pc_icon_bottom - 40) + 'px';
            }
            right_open_label.innerHTML = sub_sub_title;
            right_open_box.appendChild(right_open_label);
            //add to top in webchat box
            webchat_ctn.insertBefore(right_open_box, webchat_ctn.firstChild);
            webchat_ctn.classList.add('leftward');
            webchat_ctn.style.right = '-' + (iframe_width) + 'px';
        } else {
            webchat_ctn.classList.add('upward');
        }

        //g_maximize_flg_name is NULL and is show_onload then waiting time to show and create cookie g_maximize_flg_name = 1
        var maximize_flg = getCookie(g_maximize_flg_name);
        if(maximize_flg == 1){
            chatBoxOpenClose();
        } else if(maximize_flg == '0') {
            minimizeWc();
        } else {
            if(g_preview_flg_param == void 0 || !g_preview_flg_param) {
                minimizeWc();

            } else if(show_onload && show_onload == 1) {
                //not exist g_maximize_flg_name cookie
                minimizeWc();
                setTimeout(function () {
                    //check exist g_maximize_flg_name. Because user open and close webchat before setTimeout then do not action
                    if(!first_open_flg) {
                        maximizeWc();
                    }
                }, time_show_onload * 1000);
            } else {
                minimizeWc();
            }
        }
        setTimeout(function () {
            iframe.style.display = 'block';
            right_open_box.style.display = 'block';
        }, 1000);

    } else {
        //set bottom, right for webchat mobile
        if(sp_icon_bottom && sp_icon_bottom > 0) {
            webchat_ctn.style.bottom = sp_icon_bottom + 'px';
        }
        if(sp_icon_right && sp_icon_right > 0) {
            webchat_ctn.style.right = sp_icon_right + 'px';
        }
    }
}

// cookie handle
function setCookie(cname, cvalue, hours) {
    var d = new Date();
    d.setTime(d.getTime() + (hours * 60 * 60 * 1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

//get cookie, return "" if is not exist
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

//clear cookie existing in client
function clearAllCookie() {
    setCookie(g_cookie_user_id_name, '', 0);
    setCookie(g_cookie_connect_page_id_name, '', 0);
    setCookie(g_maximize_flg_name, '', 0);

    //dispatch event to check in client
    createDispatchEvent('efo_clear_event');
}

// iframe action
function minimizeWc(create_cookie_flg) {
    if(webchat_ctn.getAttribute('status') == 'opening') {
        //send status to server
        postMessageToServer({
            'chatbox_show_status': 0
        });

        if (isMobile()) {
            //remove class to unlock client page
            document.documentElement.classList.remove('efo-lock-screen');

        } else {
            setTimeout(function () {
                right_open_box.classList.remove('hidden');
            }, 500);
        }
        webchat_ctn.classList.remove('wc-open');
        webchat_ctn.classList.add('wc-close');
        webchat_ctn.setAttribute("status", "closed");

        //PC and minimize box is right: set bottom follow data-width or data-height of webchat_ctn
        if (!isMobile()) {
            if (g_chatbox_show_type == g_chatbox_show_type_list.leftward) {
                var ifm_width_attr = webchat_ctn.getAttribute('data-width');
                webchat_ctn.style.right = '-' + ifm_width_attr + 'px';
            }
        }

        if (create_cookie_flg == void 0 || create_cookie_flg) {
            setCookie(g_maximize_flg_name, 0, g_time_short);
        }
    }
}

function maximizeWc(create_cookie_flg) {
    if(webchat_ctn.getAttribute('status') == 'closed') {
        //send status to server
        postMessageToServer({
            'chatbox_show_status': 1
        });

        if (!g_get_log_message) {
            postMessageToServer({
                'maximize_flg': 1
            });
            g_get_log_message = true;
        }
        if (isMobile()) {
            //set hash is efo to check close chat box when click to back browser
            history.pushState("efo", null, "#" + window_efo_hash);

            //add class to lock client page. Delay with animation open chatbox
            setTimeout(function () {
                document.documentElement.classList.add('efo-lock-screen');
            }, 500);
        } else {
            right_open_box.classList.add('hidden');
        }

        webchat_ctn.classList.remove('wc-close');
        webchat_ctn.classList.add('wc-open');
        webchat_ctn.setAttribute("status", "opening");

        if (create_cookie_flg == void 0 || create_cookie_flg) {
            setCookie(g_maximize_flg_name, 1, g_time_short);
        }

        first_open_flg = true;
    }
}

function getParam(name, params) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(params);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

function isMobile() {
    // return true;
    var check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
}

//check safari browser
function isSafari() {
    var is_safari = (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0);
    return is_safari;
}

//send postmessage event to iframe
function postMessageToServer(data) {
    //send data to server
    data['connect_page_id'] = g_connect_page_id;
    data['user_id'] = g_user_id;

    // console.log('client send msg: ', data);
    var wc_irame = document.getElementById("wc-webchat").contentWindow;
    wc_irame.postMessage(data, origin_url);
}

//chage title when have new message
function setTitle(is_new_msg) {
    if(is_new_msg != void 0) {
        new_msg_flg = is_new_msg;
    }
    if(new_msg_flg && document.hasFocus()) {
        new_msg_flg = false;
    }

    if(new_msg_flg) {
        document.title = (document.title == original_title) ? new_msg_title : original_title;
        setTimeout(function(){
            setTitle();
        }, 3000);
    } else {
        if(document.title != original_title) {
            document.title = original_title;
        }
    }
}

function isEmpty (value, trim) {
    return value === void 0 || value === null || value.length === 0 || (trim && $.trim(value) === '');
}

//create dispatch event to listen in client
function createDispatchEvent(event_name, event_data) {
    if(event_data == void 0) {
        event_data = {};
    }
    var dispatch_event = new CustomEvent(event_name, event_data);
    document.dispatchEvent(dispatch_event);
}

//create iframe in after body element
function createIframe(url) {
    if(!isEmpty(url)) {
        //create div container
        var iframe_elm = document.createElement("iframe");
        iframe_elm.setAttribute("src", url);
        iframe_elm.style.display = 'none';
        iframe_elm.style.width = '0';
        iframe_elm.style.height = '0';

        document.body.appendChild(iframe_elm);
    }
}

/*create element in client site for call request open, close chatbox*/
/*function createImgElement (url) {
    var elm = document.createElement("img");
    elm.width = 1;
    elm.height = 1;
    elm.src = url;
    console.log(url);
    return elm
}

function createUrlParam (data){
    var b = [];
    for (var i in data) {
        if(data[i]){
            b.push(i + "=" + encodeUrl(data[i]));
        }
    }
    return b.join("&")
}

function encodeUrl (url) {
    if (encodeURIComponent instanceof Function)return encodeURIComponent(url);
    return url
}

function decodeUrl (url) {
    if (decodeURIComponent instanceof Function)return decodeURIComponent(url);
    return url
}*/

/*
* Execute action by action name
* Ex: btag('event', 'action_name', {'category': 'category name', 'value': '1'});
* */
function btag (event, action_name, data) {
    //change open, close chatbox
    if(action_name == 'open') {
        maximizeWc();
    } else if(action_name == 'close') {
        minimizeWc();
    } else if(action_name == 'open_close')  {
        chatBoxOpenClose();

    }

    if(event == 'cart' || event == 'doc') {
        if(['add','update','remove'].indexOf(action_name) != -1) {
            var post_msg_data = {
                'cart_action' : {
                    'action_name' : action_name,
                    'action_data' : data
                }
            };
            postMessageToServer(post_msg_data);
        }

    }

    /*if(isEmpty(data)) {
        data = [];
    }
    if(typeof data == 'object') {
        data = JSON.stringify(data);
    }

    var img_elm = createImgElement(origin_url + "/botchanevent?" + event + "=" + event + "&" + createUrlParam(params));
    // src="origin_url?event=event&action_name=open_close&data=...
    img_elm.onload = img_elm.onerror = function () {
        img_elm.onload = null;
        img_elm.onerror = function() {
            console.log('Create img element error!');
        };

        //add to before first script element
        var first_script = document.getElementsByTagName('script')[0];
        first_script.parentNode.insertBefore(img_elm, first_script);
    };*/
}


/*btag('cart', 'add', {
    id: 'care_11',
    name: 'product 1 sản phẩm dưỡng da tự nhiên 100% tinh dầu abc',
    sub_name: 'mô tả product 1 sản phẩm dưỡng da tự nhiên 100% tinh dầu abc',
    url: 'https://momentjs.com/docs/#/parsing/',
    image: 'https://botchancms.blob.core.windows.net/tungnk/uploads/bot_picture/782b2ec6a54f5e3632ae.jpg',
    category: 'book,love',
    amount: 4,
    price: '100.2',
    currency: 'VND'
});
btag('cart', 'remove', {'id': 'care_20'});
btag('cart', 'update', {
    id: 'care_7',
    name: 'product 1 sản phẩm dưỡng da tự nhiên 100% tinh dầu abc',
    amount: 4,
    price: '100.2',
    currency: 'VND'
});

btag('doc', 'add', {
    id: 'care_11',
    name: 'product 1 sản phẩm dưỡng da tự nhiên 100% tinh dầu abc',
    sub_name: 'mô tả product 1 sản phẩm dưỡng da tự nhiên 100% tinh dầu abc',
    url: 'https://momentjs.com/docs/#/parsing/',
    image: 'https://botchancms.blob.core.windows.net/tungnk/uploads/bot_picture/782b2ec6a54f5e3632ae.jpg',
    category: 'book,love',
});
btag('doc', 'remove', {'id': 'care_20'});
btag('doc', 'update', {
    name: 'product 1 sản phẩm dưỡng da tự nhiên 100% tinh dầu abc',
    sub_name: 'mô tả product 1 sản phẩm dưỡng da tự nhiên 100% tinh dầu abc',
    url: 'https://momentjs.com/docs/#/parsing/',
    image: 'https://botchancms.blob.core.windows.net/tungnk/uploads/bot_picture/782b2ec6a54f5e3632ae.jpg',
});*/

//# sourceMappingURL=efo.js.map
