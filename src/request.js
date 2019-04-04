const https = require('https');
const http = require('http');

function nodeRequestWrapper (url, options) {
	const module = url.protocol === 'https:' ? https : http;

	return new Promise((resolve, reject) => {
		const request = module.get(url, options, res => {
			if (res.statusCode >= 200 && res.statusCode < 300) {
				let body = '';
				res.on('data', data => {
					body += data;
				});

				res.on('end', () => {
					resolve({ last: true, body });
				});
			} else if (
				res.statusCode >= 300
				&& res.statusCode < 400
				&& res.headers.hasOwnProperty('location')
			) {
				resolve({ last: false, redirect: res.headers.location });
			} else {
				reject({ code: res.statusCode });
			}
		});

		request.on('error', err => {
			reject(err);
		});
	});
}

module.exports = {
	nodeRequestWrapper
};
