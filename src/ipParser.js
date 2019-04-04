const { URL } = require('url');
const dns = require('dns');

function dnsLookup (hostnameInfo, IPv6Preferred) {
	let result = hostnameInfo;

	return new Promise ((resolve) => {
		dns.lookup(hostnameInfo, { all: true, verbatim: false }, (err, addresses) => {
			if (!err) {
				if (IPv6Preferred) {
					addresses = addresses.reverse();
				}
				if (addresses.length && addresses[0].address) {
					result = addresses[0].address;
				}
			}
			resolve(result);
		})
	});
}

const IPv4RestrictedCIDRs = [
	{
		mask: '10.0.0.0',
		bits: 8
	},
	{
		mask: '172.16.0.0',
		bits: 12
	},
	{
		mask: '192.168.0.0',
		bits: 16
	},
	{
		mask: '127.0.0.0',
		bits: 8
	},
	{
		mask: '100.64.0.0',
		bits: 10
	},
	{
		mask: '169.254.0.0',
		bits: 16
	}
];

const IPv4Octets = (ip) => ip.split('.').map(octet => parseInt(octet, 10));

function inCidr (addrOctets, maskOctets, bits) {
	let counter = 0, addrPart, maskPart;
	while (bits > 0) {
		addrPart = addrOctets[counter];
		maskPart = maskOctets[counter];

		bits -= 4;

		if (bits < 0) {
			addrPart >>= -bits;
			maskPart >>= -bits;
		}
		if (addrPart !== maskPart) {
			return false;
		}
		++counter;
	}
	return true;
}

function isValidPublicIPv4 (ip) {
	// is ip in valid notation
	if (!ip.match(/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/)) {
		return false;
	}
	// Restrict meta-address
	if (ip === '0.0.0.0') {
		return false
	}

	const ipOctets = IPv4Octets(ip);

	return IPv4RestrictedCIDRs.every(({ mask, bits }) => inCidr(ipOctets, IPv4Octets(mask), bits));
}

async function parseAndValidateUrl (urlString, { IPv6Preferred = false, IPv6Enabled = false }) {
	const url = new URL(urlString);
	try {
		url.hostname = await dnsLookup(url.hostname, IPv6Preferred)
	} catch (e) { /* Still gonna try parse IPv4 | IPv6 */ }

	if (
		isValidPublicIPv4(url.hostname)
		// || isValidPublicIPv6(url.hostname)
	) {
		return url.hostname
	} else {
		throw new Error('Invalid url string');
	}
}

module.exports = {
	parseAndValidateUrl
};
