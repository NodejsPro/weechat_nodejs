var cron = require('node-cron');
// var removeInfoEfo = require('./module/removeInfoEfo');
var exceptions = require('./module/exception');
// var sendEmailPending = require('./module/sendEmailPending');
// console.log('cron run');
cron.schedule('*/5 * * * *', function() {
    // removeInfoEfo.deleteUserInfoEfo();
    // console.log('cron check');
    exceptions.check();
    // sendEmailPending.check();
});