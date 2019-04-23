const { URL } = require('url');
const dns = require('dns');

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

const IPv6RestrictedCIDRs = [
	{
		mask: '::',
		bits: 128
	},
	{
		mask: '::1',
		bits: 128
	},
	{
		mask: '::ffff:0:0',
		bits: 96
	},
	{
		mask: '::ffff:0:0:0',
		bits: 96
	},
	{
		mask: '64:ff9b::',
		bits: 96
	},
];

const IPv4Mapped = {
	mask: '0000:0000:0000:0000:0000:ffff',
	bits: 96
};

const IPv4Octets = (ip) => ip.split('.').map(octet => parseInt(octet, 10));

const IPv6Octets = (ip) => ip.split(':')
	.map(hextet => ([hextet.slice(0, 2), hextet.slice(2, 4)])).flat()
	.map(octet => parseInt(octet, 16));

function inCidr (addrOctets, maskOctets, bits) {
	let counter = 0, addrPart, maskPart;
	while (bits > 0) {
		addrPart = addrOctets[counter];
		maskPart = maskOctets[counter];

		bits -= 8;

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

function parseFamily (hostname) {
	let retVal = null;
	if (isValidIPv4(hostname)) {
		retVal = 4
	} else if (/^\[[^\]]*]$/.test(hostname)) {
		retVal = 6;
	}
	return retVal;
}

function dnsLookup (hostnameInfo, IPv6Preferred) {
	let result = hostnameInfo;

	return new Promise ((resolve) => {
		dns.lookup(hostnameInfo, { all: true, verbatim: false }, (err, addresses) => {
			if (!err) {
				if (IPv6Preferred) {
					addresses = addresses.reverse();
				}
				if (addresses.length && addresses[0].address) {
					result = addresses[0];
				}
			}
			resolve(result);
		})
	});
}

function isValidIPv4 (ip) {
	// is ip in valid notation
	return /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip);
}

function isPublicIPv4 (ip) {
	// Restrict meta-address
	if (ip === '0.0.0.0') {
		return false
	}

	const ipOctets = IPv4Octets(ip);
	return !IPv4RestrictedCIDRs.some(({ mask, bits }) => inCidr(ipOctets, IPv4Octets(mask), bits));
}

function isPublicIPv6(ip) {
	const ipOctets = IPv6Octets(ip);
	return !IPv6RestrictedCIDRs.some(({mask, bits}) => inCidr(ipOctets, IPv6Octets(normalizeIPv6Address(mask)), bits));
}

function isPrivateAddress (hostname, family) {
	if (family === 4 && isValidIPv4(hostname) && !isPublicIPv4(hostname)) {
		return true;
	}

	if (family === 6) {
		let match = hostname.match(/^\[([^\]]*)]$/);
		if (match && match[1]) {
			hostname = match[1];
		}
		hostname = normalizeIPv6Address(hostname);
		if (isIPv4Mapped(hostname)) {
			return isPrivateAddress(IPv4MappedToIPv4(hostname), 4);
		}
		return !isPublicIPv6(hostname);
	}

	return false;
}

function normalizeIPv6Address (address) {
	let hextets = address.split(':');
	let last = hextets.length -1;
	if (hextets[0] === '') {
		hextets[0] = '0'
	}
	if (hextets[last] === '') {
		hextets[last] = '0'
	}
	return hextets.map(hextet => {
		if (hextet === '') {
			return new Array(8 - hextets.length + 1).fill('0000').join(':');
		}
		return hextet.padStart(4, '0');
	}).join(':');
}

function isIPv4Mapped (addr) {
	const addrOctets = IPv6Octets(addr);
	return inCidr(addrOctets, IPv6Octets(IPv4Mapped.mask), IPv4Mapped.bits);
}

function IPv4MappedToIPv4 (addr) {
	return IPv6Octets(addr).slice(12, 16).map(octet => octet.toString()).join('.');
}


module.exports = {
	isPrivateAddress,
	dnsLookup,
	parseFamily,
	normalizeIPv6Address
};
