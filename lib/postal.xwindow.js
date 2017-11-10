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
	__webpack_require__( 5 );
	__webpack_require__( 8 );
	var XWindowClient = __webpack_require__( 10 );
	
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

	__webpack_require__(6)(__webpack_require__(7))

/***/ },
/* 6 */
/***/ function(module, exports) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	module.exports = function(src) {
		function log(error) {
			(typeof console !== "undefined")
			&& (console.error || console.log)("[Script Loader]", error);
		}
	
		// Check for IE =< 8
		function isIE() {
			return typeof attachEvent !== "undefined" && typeof addEventListener === "undefined";
		}
	
		try {
			if (typeof execScript !== "undefined" && isIE()) {
				execScript(src);
			} else if (typeof eval !== "undefined") {
				eval.call(null, src);
			} else {
				log("EvalError: No eval function available");
			}
		} catch (error) {
			log(error);
		}
	}


/***/ },
/* 7 */
/***/ function(module, exports) {

	module.exports = "/*! store2 - v2.1.6 - 2014-03-10\n* Copyright (c) 2014 Nathan Bubna; Licensed MIT, GPL */\n;(function(window, define) {\n    var _ = {\n        version: \"2.1.6\",\n        areas: {},\n        apis: {},\n\n        // utilities\n        inherit: function(api, o) {\n            for (var p in api) {\n                if (!o.hasOwnProperty(p)) {\n                    o[p] = api[p];\n                }\n            }\n            return o;\n        },\n        stringify: function(d) {\n            return d === undefined || typeof d === \"function\" ? d+'' : JSON.stringify(d);\n        },\n        parse: function(s) {\n            // if it doesn't parse, return as is\n            try{ return JSON.parse(s); }catch(e){ return s; }\n        },\n\n        // extension hooks\n        fn: function(name, fn) {\n            _.storeAPI[name] = fn;\n            for (var api in _.apis) {\n                _.apis[api][name] = fn;\n            }\n        },\n        get: function(area, key){ return area.getItem(key); },\n        set: function(area, key, string){ area.setItem(key, string); },\n        remove: function(area, key){ area.removeItem(key); },\n        key: function(area, i){ return area.key(i); },\n        length: function(area){ return area.length; },\n        clear: function(area){ area.clear(); },\n\n        // core functions\n        Store: function(id, area, namespace) {\n            var store = _.inherit(_.storeAPI, function(key, data, overwrite) {\n                if (arguments.length === 0){ return store.getAll(); }\n                if (data !== undefined){ return store.set(key, data, overwrite); }\n                if (typeof key === \"string\"){ return store.get(key); }\n                if (!key){ return store.clear(); }\n                return store.setAll(key, data);// overwrite=data, data=key\n            });\n            store._id = id;\n            store._area = area || _.inherit(_.storageAPI, { items: {}, name: 'fake' });\n            store._ns = namespace || '';\n            if (!_.areas[id]) {\n                _.areas[id] = store._area;\n            }\n            if (!_.apis[store._ns+store._id]) {\n                _.apis[store._ns+store._id] = store;\n            }\n            return store;\n        },\n        storeAPI: {\n            // admin functions\n            area: function(id, area) {\n                var store = this[id];\n                if (!store || !store.area) {\n                    store = _.Store(id, area, this._ns);//new area-specific api in this namespace\n                    if (!this[id]){ this[id] = store; }\n                }\n                return store;\n            },\n            namespace: function(namespace, noSession) {\n                if (!namespace){\n                    return this._ns ? this._ns.substring(0,this._ns.length-1) : '';\n                }\n                var ns = namespace, store = this[ns];\n                if (!store || !store.namespace) {\n                    store = _.Store(this._id, this._area, this._ns+ns+'.');//new namespaced api\n                    if (!this[ns]){ this[ns] = store; }\n                    if (!noSession){ store.area('session', _.areas.session); }\n                }\n                return store;\n            },\n            isFake: function(){ return this._area.name === 'fake'; },\n            toString: function() {\n                return 'store'+(this._ns?'.'+this.namespace():'')+'['+this._id+']';\n            },\n\n            // storage functions\n            has: function(key) {\n                if (this._area.has) {\n                    return this._area.has(this._in(key));//extension hook\n                }\n                return !!(this._in(key) in this._area);\n            },\n            size: function(){ return this.keys().length; },\n            each: function(fn, and) {\n                for (var i=0, m=_.length(this._area); i<m; i++) {\n                    var key = this._out(_.key(this._area, i));\n                    if (key !== undefined) {\n                        if (fn.call(this, key, and || this.get(key)) === false) {\n                            break;\n                        }\n                    }\n                    if (m > _.length(this._area)) { m--; i--; }// in case of removeItem\n                }\n                return and || this;\n            },\n            keys: function() {\n                return this.each(function(k, list){ list.push(k); }, []);\n            },\n            get: function(key, alt) {\n                var s = _.get(this._area, this._in(key));\n                return s !== null ? _.parse(s) : alt || s;// support alt for easy default mgmt\n            },\n            getAll: function() {\n                return this.each(function(k, all){ all[k] = this.get(k); }, {});\n            },\n            set: function(key, data, overwrite) {\n                var d = this.get(key);\n                if (d != null && overwrite === false) {\n                    return data;\n                }\n                return _.set(this._area, this._in(key), _.stringify(data), overwrite) || d;\n            },\n            setAll: function(data, overwrite) {\n                var changed, val;\n                for (var key in data) {\n                    val = data[key];\n                    if (this.set(key, val, overwrite) !== val) {\n                        changed = true;\n                    }\n                }\n                return changed;\n            },\n            remove: function(key) {\n                var d = this.get(key);\n                _.remove(this._area, this._in(key));\n                return d;\n            },\n            clear: function() {\n                if (!this._ns) {\n                    _.clear(this._area);\n                } else {\n                    this.each(function(k){ _.remove(this._area, this._in(k)); }, 1);\n                }\n                return this;\n            },\n            clearAll: function() {\n                var area = this._area;\n                for (var id in _.areas) {\n                    if (_.areas.hasOwnProperty(id)) {\n                        this._area = _.areas[id];\n                        this.clear();\n                    }\n                }\n                this._area = area;\n                return this;\n            },\n\n            // internal use functions\n            _in: function(k) {\n                if (typeof k !== \"string\"){ k = _.stringify(k); }\n                return this._ns ? this._ns + k : k;\n            },\n            _out: function(k) {\n                return this._ns ?\n                    k && k.indexOf(this._ns) === 0 ?\n                        k.substring(this._ns.length) :\n                        undefined : // so each() knows to skip it\n                    k;\n            }\n        },// end _.storeAPI\n        storageAPI: {\n            length: 0,\n            has: function(k){ return this.items.hasOwnProperty(k); },\n            key: function(i) {\n                var c = 0;\n                for (var k in this.items){\n                    if (this.has(k) && i === c++) {\n                        return k;\n                    }\n                }\n            },\n            setItem: function(k, v) {\n                if (!this.has(k)) {\n                    this.length++;\n                }\n                this.items[k] = v;\n            },\n            removeItem: function(k) {\n                if (this.has(k)) {\n                    delete this.items[k];\n                    this.length--;\n                }\n            },\n            getItem: function(k){ return this.has(k) ? this.items[k] : null; },\n            clear: function(){ for (var k in this.list){ this.removeItem(k); } },\n            toString: function(){ return this.length+' items in '+this.name+'Storage'; }\n        }// end _.storageAPI\n    };\n\n    // setup the primary store fn\n    if (window.store){ _.conflict = window.store; }\n    var store =\n        // safely set this up (throws error in IE10/32bit mode for local files)\n        _.Store(\"local\", (function(){try{ return localStorage; }catch(e){}})());\n    store.local = store;// for completeness\n    store._ = _;// for extenders and debuggers...\n    // safely setup store.session (throws exception in FF for file:/// urls)\n    store.area(\"session\", (function(){try{ return sessionStorage; }catch(e){}})());\n\n    if (typeof define === 'function' && define.amd !== undefined) {\n        define(function () {\n            return store;\n        });\n    } else if (typeof module !== 'undefined' && module.exports) {\n        module.exports = store;\n    } else {\n        window.store = store;\n    }\n\n})(window, window.define);\n"

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(6)(__webpack_require__(9))

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = "/**\n * Copyright (c) 2013 ESHA Research\n * Dual licensed under the MIT and GPL licenses:\n *   http://www.opensource.org/licenses/mit-license.php\n *   http://www.gnu.org/licenses/gpl.html\n *\n * Makes it easy to watch for storage events by enhancing the events and\n * allowing binding to particular keys and/or namespaces.\n *\n * // listen to particular key storage events (yes, this is namespace sensitive)\n * store.on('foo', function listenToFoo(e){ console.log('foo was changed:', e); });\n * store.off('foo', listenToFoo);\n *\n * // listen to all storage events\n * store.on(function storageEvent(e){ console.log('web storage:', e); });\n * store.off(storageEvent);\n * \n * Status: ALPHA - useful, if you don't mind incomplete browser support for events\n */\n;(function(window, document, _) {\n    _.fn('on', function(key, fn) {\n        if (!fn) { fn = key; key = ''; }// shift args when needed\n        var s = this,\n            bound,\n            id = _.id(this._area);\n        if (window.addEventListener) {\n            window.addEventListener(\"storage\", bound = function(e) {\n                var k = s._out(e.key);\n                if (k && (!key || k === key)) {// must match key if listener has one\n                    var eid = _.id(e.storageArea);\n                    if (!eid || id === eid) {// must match area, if event has a known one\n                        return fn.call(s, _.event(k, s, e));\n                    }\n                }\n            }, false);\n        } else {\n            document.attachEvent(\"onstorage\", bound = function() {\n                return fn.call(s, window.event);\n            });\n        }\n        fn['_'+key+'listener'] = bound;\n        return s;\n    });\n    _.fn('off', function(key, fn) {\n        if (!fn) { fn = key; key = ''; }// shift args when needed\n        var bound = fn['_'+key+'listener'];\n        if (window.removeEventListener) {\n            window.removeEventListener(\"storage\", bound);\n        } else {\n            document.detachEvent(\"onstorage\", bound);\n        }\n        return this;\n    });\n    _.event = function(k, s, e) {\n        var event = {\n            key: k,\n            namespace: s.namespace(),\n            newValue: _.parse(e.newValue),\n            oldValue: _.parse(e.oldValue),\n            url: e.url || e.uri,\n            storageArea: e.storageArea,\n            source: e.source,\n            timeStamp: e.timeStamp,\n            originalEvent: e\n        };\n        if (_.cache) {\n            var min = _.expires(e.newValue || e.oldValue);\n            if (min) {\n                event.expires = _.when(min);\n            }\n        }\n        return event;\n    };\n    _.id = function(area) {\n        for (var id in _.areas) {\n            if (area === _.areas[id]) {\n                return id;\n            }\n        }\n    };\n})(window, document, window.store._);"

/***/ },
/* 10 */
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