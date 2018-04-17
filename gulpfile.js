const elixir = require('laravel-elixir');

/*
 |--------------------------------------------------------------------------
 | Elixir Asset Management
 |--------------------------------------------------------------------------
 |
 | Elixir provides a clean, fluent API for defining some basic Gulp tasks
 | for your Laravel application. By default, we are compiling the Sass
 | file for your application as well as publishing vendor resources.
 |
 */


elixir(function (mix) {
    mix.copy('public/assets/maps/bootstrap.min.css.map', 'public/css/bootstrap.min.css.map');

    //WECHAT IFRAME
    mix.styles([
        'public/assets/css/slick.css',
        'public/assets/css/slick-theme.css',
        'public/assets/css/bootstrap.min.css',
        'public/assets/css/webchat/botchat.css'
    ], 'public/css/app.css','./');

    
    mix.scripts([
        'public/assets/js/jquery.min.js',
        'public/assets/js/bootstrap.min.js',
        'public/assets/js/efo/ua-parser.js',
        'public/assets/js/slick.min.js',
        'public/assets/js/socket.io.js',
        'public/assets/js/webchat/controller.js'
    ], 'public/js/app.js','./');

    //WECHAT CLIENT VIEW
    mix.scripts([
        'public/assets/js/webchat/init.js'
    ], 'public/js/webchatapp.js','./');

    mix.scripts([
        'public/assets/css/webchat/wc.style.css'
    ], 'public/css/webchat.css','./');

    mix.scripts([
        'public/assets/js/webchat/wc.controller.js'
    ], 'public/js/webchat.js','./');

    //EFO IFRAME
    mix.styles([
        'public/assets/css/bootstrap.min.css',
        'public/assets/css/slick.css',
        'public/assets/css/slick-theme.css',
        'public/assets/css/bootstrap-datetimepicker.min.css',
        'public/assets/css/select2/4.0.2/select2.min.css',
        'public/assets/css/iCheck/skins/minimal/_all.css',
        'public/assets/css/efo/efo.css'
    ], 'public/css/efo_app.css','./');

    mix.scripts([
        'public/assets/js/jquery.min.js',
        'public/assets/js/bootstrap.min.js',
        'public/assets/js/efo/ua-parser.js',
        'public/assets/js/slick.min.js',
        'public/assets/js/socket.io.js',
        'public/assets/js/moment/moment.js',
        'public/assets/js/moment/locale/en.js',
        'public/assets/js/moment/locale/ja.js',
        'public/assets/js/moment/locale/th.js',
        'public/assets/js/moment/locale/vn.js',
        'public/assets/js/bootstrap-datetimepicker.min.js',
        'public/assets/js/select2/4.0.2/select2.min.js',
        'public/assets/js/iCheck/jquery.icheck.js',
        'public/assets/js/autoKana/jquery.autoKana.js',
        'public/assets/js/efo/efo.js',
        'public/assets/js/efo/validation.js'
    ], 'public/js/efo_app.js','./');

    //EFO CLIENT VIEW
    mix.scripts([
        'public/assets/js/efo/init.js'
    ], 'public/js/efoapp.js','./');

    mix.scripts([
        'public/assets/css/efo/efo.style.css'
    ], 'public/css/efo.css','./');

    mix.scripts([
        'public/assets/js/efo/controller.js'
    ], 'public/js/efo.js','./');


    mix.version([
        'public/css/app.css',
        'public/js/app.js',
        'public/css/webchat.css',
        'public/js/webchat.js',
        'public/css/efo_app.css',
        'public/js/efo_app.js',
        'public/css/efo.css',
        'public/js/efo.js',
        'public/js/webchatapp.js',
        'public/js/efoapp.js',
    ]);
});
