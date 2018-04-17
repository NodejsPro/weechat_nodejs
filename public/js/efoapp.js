function efoInit(connect_page_id, preview_flg_param, refresh_log_flg_param, force_log_param) {
    if(connect_page_id != void 0) {
        try {
            var chat_server_url = ':APP_URL_IFRAME';
            var chat_storage_url = ':APP_AZURE_STORAGE_URL';

            var chatbbot_css = document.createElement("link");
            chatbbot_css.setAttribute("rel", "stylesheet");
            chatbbot_css.setAttribute("href", chat_storage_url + 'css/efo.css?v=:EMBED_VERSION');

            var chatbbot_js = document.createElement("script");
            chatbbot_js.setAttribute("rel", "stylesheet");
            chatbbot_js.setAttribute("src", chat_storage_url + 'js/efo.js?v=:EMBED_VERSION');

            document.body.appendChild(chatbbot_css);
            document.body.appendChild(chatbbot_js);

            chatbbot_js.onload = function () {
                embot_init(chat_server_url + '/efo', connect_page_id, preview_flg_param, refresh_log_flg_param, force_log_param);
            };
        } catch (e) {
            console.log(e);
        }
    }
}
//# sourceMappingURL=efoapp.js.map
