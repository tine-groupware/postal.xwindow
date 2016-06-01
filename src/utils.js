require( "lodash" );

var _memoRemoteByInstanceId = function( memo, instanceId ) {
	var proxy = _.find( this.remotes, function( x ) {
		return x.instanceId === instanceId;
	} );
	if ( proxy ) {
		memo.push( proxy );
	}
	return memo;
};

var _memoRemoteByTarget = function( memo, tgt ) {
	var proxy = _.find( this.remotes, function( x ) {
		return x.target === tgt;
	} );
	if ( proxy ) {
		memo.push( proxy );
	}
	return memo;
};

var _disconnectClient = function( client ) {
	client.disconnect();
};

safeSerialize = function safeSerialize( envelope ) {
	var json = JSON.parse( JSON.stringify( envelope, function( key, value ) {
		if ( typeof value === "function" ) {
			return undefined;
		}
		return value;
	} ) );

	return json;
};

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

var parseUri = function( str ) {
	var o = parseUri.options;
	var m = o.parser[o.strictMode ? "strict" : "loose"].exec( str );
	var uri = {};
	var i = 14;

	while ( i-- ) {
		uri[o.key[i]] = m[i] || "";
	}

	uri[o.q.name] = {};
	uri[o.key[12]].replace( o.q.parser, function( $0, $1, $2 ) {
		if ( $1 ) {
			uri[o.q.name][$1] = $2;
		}
	} );

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: [ "source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor" ],
	q: {
		name: "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

module.exports = {
	_memoRemoteByInstanceId: _memoRemoteByInstanceId,
	_memoRemoteByTarget: _memoRemoteByTarget,
	_disconnectClient: _disconnectClient,
	safeSerialize: safeSerialize,
	parseUri: parseUri
};
