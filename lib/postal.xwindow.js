/*!
 *  * postal.xwindow - postal.js/postal.federation plugin for federating instances of postal.js across unrelated window boundaries.
 *  * Author: Cornelius Weiß (http://www.metaways.de)
 *  * Version: v0.0.6
 *  * Url: http://github.com/tine20/postal.xwindow
 *  * License(s): (MIT OR GPL-2.0)
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("lodash"), require("postal"));
	else if(typeof define === 'function' && define.amd)
		define(["lodash", "postal"], factory);
	else if(typeof exports === 'object')
		exports["postalXWindow"] = factory(require("lodash"), require("postal"));
	else
		root["postalXWindow"] = factory(root["_"], root["postal"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	var postal = __webpack_require__( 2 );
	var utils = __webpack_require__( 3 );
	var S = __webpack_require__( 4 );
	var state = S.state;
	var env = S.env;
	var XWindowClient = __webpack_require__( 5 );
	
	XWindowClient.getInstance = function( target, options, instanceId ) {
		return new XWindowClient( target, options, instanceId );
	};
	
	postal.fedx.transports.xwindow = {
		eagerSerialize: env.useEagerSerialize,
		remotes: [],
		XWindowClient: XWindowClient,
		configure: function( cfg ) {
			if ( cfg ) {
				state.config = _.defaults( _.extend( state.config, cfg ), state.defaults );
			}
			return state.config;
		},
		clearConfiguration: function() {
			state.config = _.extend( {}, state.defaults );
		},
		disconnect: function( options ) {
			options = options || {};
			var clients = options.instanceId ?
			// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
			_.reduce( _.isArray( options.instanceId ) ? options.instanceId : [ options.instanceId ], _.bind( utils._memoRemoteByInstanceId, this ), [] ) :
			// Ok so we don't have instanceId(s), let's try target(s)
			options.target ?
			// Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
			_.reduce( _.isArray( options.target ) ? options.target : [ options.target ], _.bind( utils._memoRemoteByTarget, this ), [] ) :
			// aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
			this.remotes;
			if ( !options.doNotNotify ) {
				_.forEach( clients, _.bind( utils._disconnectClient, this ) );
			}
			this.remotes = _.without.apply( null, [ this.remotes ].concat( clients ) );
		},
		getTargets: function() {
			return this.tidyStorage();
		},
		sendMessage: function( env ) {
			var envelope = env;
			if ( state.config.safeSerialize ) {
				envelope = utils.safeSerialize( _.cloneDeep( env ) );
			}
			var instanceId = postal.instanceId();
	
			_.forEach( this.remotes, function( remote ) {
				if ( remote.instanceId != instanceId ) {
					remote.sendMessage( envelope );
				}
			} );
		},
		wrapForTransport: env.useEagerSerialize ? function( packingSlip ) {
			return JSON.stringify( {
				postal: true,
				packingSlip: packingSlip
			} );
		} : function( packingSlip ) {
			return {
				postal: true,
				packingSlip: packingSlip
			};
		},
		unwrapFromTransport: function( msgData ) {
			if ( typeof msgData === "string" && ( env.useEagerSerialize || msgData.indexOf( '"postal":true' ) !== -1 ) ) {
				try {
					return JSON.parse( msgData );
				} catch ( ex ) {
					return {};
				}
			} else {
				return msgData;
			}
		},
		routeMessage: function( event ) {
			var parsed = this.unwrapFromTransport( event.newValue );
	
			if ( parsed && parsed.postal ) {
				var packingSlip = parsed.packingSlip;
				var instanceId = packingSlip.instanceId;
				if ( packingSlip && instanceId != postal.instanceId() ) {
					var remote = _.find( this.remotes, function( x ) {
						return x.instanceId === instanceId;
					} );
					if ( !remote ) {
						var target = store.namespace( state.config.localStoragePrefix + "." + instanceId );
						remote = XWindowClient.getInstance( target, { origin: target.get( "targetUrl" ) }, instanceId );
						this.remotes.push( remote );
					}
	
					// origin forgery protection
					var url = utils.parseUri( event.url );
					var origin = url.protocol + "://" + url.authority;
	
					if ( remote.options.origin == origin ) {
						remote.onMessage( packingSlip );
					}
				}
			}
		},
		signalReady: function( targets, callback ) {
			var instanceId = postal.instanceId();
			var that = this;
	
			this.target = store.namespace( state.config.localStoragePrefix + "." + instanceId );
			this.target.on( "message", _.bind( this.routeMessage, this ) );
			this.keepAlive();
	
			targets = _.isArray( targets ) ? targets : [ targets ];
			targets = targets.length ? targets : this.getTargets();
			callback = callback || function() {};
	
			_.forEach( targets, _.bind( function( def ) {
				if ( def.targetId != instanceId ) {
					var remote = _.find( that.remotes, function( x ) {
						return x.instanceId === def.targetId;
					} );
					if ( !remote ) {
						remote = XWindowClient.getInstance( def.target, { origin: def.origin }, def.targetId );
						that.remotes.push( remote );
					}
					remote.sendPing( callback );
				}
			}, this ) );
		},
		keepAlive: function() {
			this.target.set( "targetUrl", env.origin );
			this.target.set( "targetTimeout", new Date().getTime() + state.config.targetTimeout );
	
			this.tidyStorage();
			this.tidyRemotes();
	
			_.delay( _.bind( this.keepAlive, this ), Math.round( state.config.targetTimeout / 2 ) );
		},
		tidyStorage: function() {
			var targetIds = _.reduce( store.namespace( state.config.localStoragePrefix ).getAll(), function( memo, targetData, id ) {
				var targetId = id.split( "." )[0];
				if ( _.indexOf( memo, targetId ) < 0 ) {
					memo.push( targetId );
				}
				return memo;
			}, [] );
	
			var now = new Date().getTime();
			return _.reduce( targetIds, function( memo, targetId ) {
				var target = store.namespace( state.config.localStoragePrefix + "." + targetId );
				if ( target.get( "targetTimeout" ) < now ) {
					target.clear();
				} else {
					memo.push( {
						targetId: targetId,
						target: target,
						origin: target.get( "targetUrl" )
					} );
				}
				return memo;
			}, [] );
		},
		tidyRemotes: function() {
			var that = this;
			_.forEach( this.remotes, function( remote ) {
				if ( _.isEmpty( remote.target.getAll() ) ) {
					that.disconnect( { target: remote.target } );
				}
			} );
		}
	};


/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	
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


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	
	var env = {
		origin: location.origin || location.protocol + "//" + location.host,
		isWorker: ( typeof window === "undefined" ) && postMessage && location,
		// I know, I KNOW. The alternative was very expensive perf & time-wise
		// so I saved you a perf hit by checking the stinking UA. Sigh.
		// I sought the opinion of several other devs. We all traveled
		// to the far east to consult with the wisdom of a monk - turns
		// out he didn"t know JavaScript, and our passports were stolen on the
		// return trip. We stowed away aboard a freighter headed back to the
		// US and by the time we got back, no one had heard of IE 8 or 9. True story.
		useEagerSerialize: /MSIE [8,9]/.test( navigator.userAgent )
	};
	
	var defaults = {
		allowedOrigins: [ env.origin ],
		enabled: true,
		safeSerialize: false,
		localStoragePrefix: "postal.fedx.xwindow",
		targetTimeout: 60000 // 1 minute
	};
	
	var state = {
		workers: [],
		config: _.extend( {}, defaults ),
		defaults: defaults
	};
	
	module.exports = {
		state: state,
		env: env
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	var postal = __webpack_require__( 2 );
	var S = __webpack_require__( 4 );
	var state = S.state;
	var env = S.env;
	
	var XWindowClient = function() {
		postal.fedx.FederationClient.apply( this, arguments );
	};
	
	XWindowClient.prototype = _.create( postal.fedx.FederationClient.prototype, {
		constructor: XWindowClient,
	
		transportName: "xwindow",
	
		shouldProcess: function() {
			var hasDomainFilters = !!state.config.allowedOrigins.length;
			return state.config.enabled &&
					// another frame/window
				( ( this.options.origin === "*" || ( hasDomainFilters && _.includes( state.config.allowedOrigins, this.options.origin ) || !hasDomainFilters ) ) ||
					// worker
				( this.options.isWorker && _.includes( state.workers, this.target ) ) ||
					// we are in a worker
				env.isWorker );
		},
		send: function( packingSlip ) {
			if ( this.shouldProcess() ) {
				var msg = postal.fedx.transports.xwindow.wrapForTransport( packingSlip );
				this.target.set( "message", msg );
			}
		}
	} );
	
	module.exports = XWindowClient;


/***/ }
/******/ ])
});
;