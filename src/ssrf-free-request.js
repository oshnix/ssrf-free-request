const { nodeRequestWrapper } = require('./request');
const { parseAndValidateUrl } = require('./ipParser');

class SSRFFreeRequest {
	constructor (options) {
		this.options = {};
		// Parse options and leave nodejs http module specific
	}

	async request(hostname) {
		const url = await parseAndValidateUrl(hostname);
		const result = await nodeRequestWrapper(url);
		if (result.last) {
			return result.body;
		} else {
			return await this.request(result.redirect);
		}
	}
}

module.exports = {
	SSRFFreeRequest
};
