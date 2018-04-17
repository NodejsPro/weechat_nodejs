var config = require('config');
var azure = require('azure-storage');

var fs = require('fs');
var walk = require('walk');
var container = config.get('app_azure_storage_container');
var blob = 'model';

const version = config.get('embed_version');
const APP_URL = config.get('appURL');
const EMBED_AZURE_STORAGE_URL = 'https://' + config.get('app_azure_storage_name') + '.blob.core.windows.net/' + config.get('app_azure_storage_container') + "/";
console.log(EMBED_AZURE_STORAGE_URL);
var blobService = azure.createBlobService(config.get('app_azure_connectstring'));

//console.log(blobService);
//
//blobService.createBlockBlobFromLocalFile(container, "abc", 'model.js', function(error, result, response) {
//    console.log(error);
//    if (!error) {
//        console.log("error");
//    }
//});

var css_path = "./public/css";
var js_path = "./public/js";
var theme_efo_css_path = "./public/assets/css/efo";
var theme_webchat_css_path = "./public/assets/css/webchat";
var moment_locale = "./public/assets/js/moment/locale";
var locale = "./public/assets/js/locales";
var images = "./public/assets/images";
var fonts = "./public/assets/fonts";

function uploadBlobs(sourceDirectoryPath, containerName, callback) {
    console.log('Entering uploadBlobs.');
    var files   = [];
    // validate directory is valid.
    if (!fs.existsSync(sourceDirectoryPath)) {
        console.log(sourceDirectoryPath + ' is an invalid directory path.');
    } else {

        var walker  = walk.walk(sourceDirectoryPath, { followLinks: false });

        walker.on('file', function(root, stat, next) {
            // Add this file to the list of files
            root = root.replace(/\\/g, '/');
            //console.log(root);
            files.push(root + '/' + stat.name);
            next();
        });

        walker.on('end', function() {
            console.log(files);
            var finished = 0;
            files.forEach(function (file) {
                var file_arr = file.split("/");
                var blobName = file_arr[file_arr.length - 2] +  "/" + file.replace(/^.*[\\\/]/, '');
                if(sourceDirectoryPath == theme_webchat_css_path || sourceDirectoryPath == theme_efo_css_path){
                    blobName = file_arr[file_arr.length - 3] + "/" + file_arr[file_arr.length - 2] +  "/" + file.replace(/^.*[\\\/]/, '');
                }else if(sourceDirectoryPath == moment_locale){
                    blobName = "js/moment/" + file_arr[file_arr.length - 2] +  "/" + file.replace(/^.*[\\\/]/, '');
                }else if(sourceDirectoryPath == locale){
                    blobName = "js/locale/" + file_arr[file_arr.length - 2] +  "/" + file.replace(/^.*[\\\/]/, '');
                }else if(sourceDirectoryPath == images){
                    if(file.indexOf("minimal") > -1){
                        blobName = "images/iCheck/skins/" + file_arr[file_arr.length - 2] +  "/" + file.replace(/^.*[\\\/]/, '');
                    }else if(file.indexOf("card_type") > -1){
                        blobName = "images/" + file_arr[file_arr.length - 2] +  "/" + file.replace(/^.*[\\\/]/, '');
                    }else{
                        lobName = "images/" + file.replace(/^.*[\\\/]/, '');
                    }

                }
                console.log(blobName);
                blobService.createBlockBlobFromLocalFile(containerName, blobName, file, function (error) {
                    finished++;
                    if (error) {
                        console.log(error);
                    } else {
                        console.log(' Blob ' + blobName + ' upload finished.');
                        if (finished === files.length) {
                            // Wait until all workers complete and the blobs are uploaded to the server.
                            console.log('All files uploaded');
                            callback();
                        }
                    }
                });
            });
        });
    }
}
copyFileContent("./public/js/efoapp.js");
copyFileContent("./public/js/webchatapp.js");

function getFileContent(srcPath, callback) {
    fs.readFile(srcPath, 'utf8', function (err, data) {
            if (err) throw err;

            if(data){
                data = data.replace(":APP_URL_IFRAME", APP_URL);
                data = data.replace(":APP_AZURE_STORAGE_URL", EMBED_AZURE_STORAGE_URL);
                data = data.replace(":EMBED_VERSION", version);
            }
            callback(data);
        }
    );
}

function copyFileContent(srcPath) {
    getFileContent(srcPath, function(data) {
        fs.writeFile (srcPath, data, function(err) {
            if (err) throw err;
            console.log('complete');
        });
    });
}


blobService.createBlockBlobFromLocalFile(container, 'js/bootstrap-datetimepicker.min.js', './public/assets/js/bootstrap-datetimepicker.min.js', function(error, result, response) {
   if (!error) {
       // file uploaded
   }
});

uploadBlobs(images, container, function () {

});

uploadBlobs(css_path, container, function () {

});

uploadBlobs(js_path, container, function () {

});

uploadBlobs(theme_webchat_css_path, container, function () {

});

uploadBlobs(theme_efo_css_path, container, function () {

});

uploadBlobs(moment_locale, container, function () {

});

uploadBlobs(locale, container, function () {

});


uploadBlobs(fonts, container, function () {

});