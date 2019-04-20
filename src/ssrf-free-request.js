const { nodeRequestWrapper } = require('./request');
const { isPrivateAddress, dnsLookup, parseFamily, normalizeIPv6Address } = require('./ipParser');
const { URL } = require('url');
const https = require('https');
const http = require('http');

class SSRFFreeRequest {
	constructor (options) {
		this.options = {
			IPv6Preferred: false,
			IPv6Allowed: true
		};
		// Parse options and leave nodejs http module specific
	}

	checkAddress(address, family) {
		if (family === '6' && !this.options.IPv6Allowed) {
			throw new Error('Only IPv4 address is available');
		}
		if (isPrivateAddress(address, family)) {
			throw new Error(`Got private address ${address}`);
		}
	}

	async request(address) {
		// parse ip
		// Parse hostname. If is it just an ip - then, check it.
		// Choose between secure and insecure protocol.
		// Perform a request with custom lookup

		const url = new URL(address);

		const family = parseFamily(url.hostname);

		if (family === '6') {
			url.hostname = normalizeIPv6Address(url.hostname);
		}

		this.checkAddress(url.hostname, family);

		const requestModule = url.protocol === 'https:' ? https : http;

		const lookup = async (hostname, options, callback) => {
			let err = undefined;
			let { address, family } = await dnsLookup(hostname, this.options.IPv6Preferred);

			if (family === '6') {
				address = normalizeIPv6Address(address);
			}

			this.checkAddress(address, family);

			callback(err, address, family);
		};

		const serverAnswer = await new Promise((resolve, reject) => {
			const request = requestModule.get(url, { lookup }, res => {
					if (res.statusCode >= 200 && res.statusCode < 300) {
						let body = '';
						res.on('data', data => {
							body += data;
						});
					res.on('end', () => {
						resolve({ last: true, body, response: res });
					});
				} else if (
					res.statusCode >= 300
					&& res.statusCode < 400
					&& res.headers.hasOwnProperty('location')
				) {
					resolve({ last: false, redirect: res.headers.location });
				} else {
					reject({ code: res.statusCode, response: res });
				}
			});

			request.on('error', err => {
				reject(err);
			});
		});

		if (serverAnswer.last) {
			return serverAnswer
		} else {
			return await this.request(serverAnswer.redirect);
		}
	}
}

module.exports = {
	SSRFFreeRequest
};
