const { SSRFFreeRequest } = require('./src/ssrf-free-request');

module.exports = SSRFFreeRequest;

const request = new SSRFFreeRequest();

request.request('http://100.63.255.255').then(res => {
	console.info('Success');
}).catch(error => {
	console.info('Error');
	console.error(error);
});
