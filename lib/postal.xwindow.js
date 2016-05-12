/*!
 *  * postal.xwindow - postal.js/postal.federation plugin for federating instances of postal.js across unrelated window boundaries.
 *  * Author: Cornelius Weiß (http://www.metaways.de)
 *  * Version: v0.0.1
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

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	var _ = _interopRequire(__webpack_require__(1));
	
	var postal = _interopRequire(__webpack_require__(2));
	
	var _utils = __webpack_require__(3);
	
	var _memoRemoteByInstanceId = _utils._memoRemoteByInstanceId;
	var _memoRemoteByTarget = _utils._memoRemoteByTarget;
	var _disconnectClient = _utils._disconnectClient;
	var safeSerialize = _utils.safeSerialize;
	
	var _state = __webpack_require__(4);
	
	var state = _state.state;
	var env = _state.env;
	
	var XWindowClient = _interopRequire(__webpack_require__(5));
	
	XWindowClient.getInstance = function (target, options, instanceId) {
		return new XWindowClient(target, options, instanceId);
	};
	
	postal.fedx.transports.xwindow = {
		eagerSerialize: env.useEagerSerialize,
		remotes: [],
		XWindowClient: XWindowClient,
		configure: function configure(cfg) {
			if (cfg) {
				state.config = _.defaults(_.extend(state.config, cfg), state.defaults);
			}
			return state.config;
		},
		clearConfiguration: function clearConfiguration() {
			state.config = _.extend({}, state.defaults);
		},
		disconnect: function disconnect(options) {
			options = options || {};
			var clients = options.instanceId ?
			// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
			_.reduce(_.isArray(options.instanceId) ? options.instanceId : [options.instanceId], _memoRemoteByInstanceId, [], this) :
			// Ok so we don't have instanceId(s), let's try target(s)
			options.target ?
			// Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
			_.reduce(_.isArray(options.target) ? options.target : [options.target], _memoRemoteByTarget, [], this) :
			// aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
			this.remotes;
			if (!options.doNotNotify) {
				_.each(clients, _disconnectClient, this);
			}
			this.remotes = _.without.apply(null, [this.remotes].concat(clients));
		},
		getTargets: function getTargets() {
			this.tidyStorage();
			return _.reduce(store.namespace(state.config.localStoragePrefix).getAll(), function (memo, targetData, id) {
				if (id.match(/\.targetTimeout$/)) {
					var targetId = id.split(".")[0];
					memo.push({
						targetId: targetId,
						target: store.namespace(state.config.localStoragePrefix + "." + targetId)
					});
				}
				return memo;
			}, []);
		},
		sendMessage: function sendMessage(env) {
			var envelope = env;
			if (state.config.safeSerialize) {
				envelope = safeSerialize(_.cloneDeep(env));
			}
			var instanceId = postal.instanceId();
	
			_.each(this.remotes, function (remote) {
				if (remote.instanceId != instanceId) {
					remote.sendMessage(envelope);
				}
			});
		},
		wrapForTransport: env.useEagerSerialize ? function (packingSlip) {
			return JSON.stringify({
				postal: true,
				packingSlip: packingSlip
			});
		} : function (packingSlip) {
			return {
				postal: true,
				packingSlip: packingSlip
			};
		},
		unwrapFromTransport: function unwrapFromTransport(msgData) {
			if (typeof msgData === "string" && (env.useEagerSerialize || msgData.indexOf("\"postal\":true") !== -1)) {
				try {
					return JSON.parse(msgData);
				} catch (ex) {
					return {};
				}
			} else {
				return msgData;
			}
		},
		routeMessage: function routeMessage(event) {
			var _this = this;
	
			var parsed = this.unwrapFromTransport(event.newValue);
			if (parsed && parsed.postal) {
				var remote;
	
				(function () {
					var packingSlip = parsed.packingSlip;
					var instanceId = packingSlip.instanceId;
					if (packingSlip && instanceId != postal.instanceId()) {
						remote = _.find(_this.remotes, function (x) {
							return x.instanceId === instanceId;
						});
	
						if (!remote) {
							remote = XWindowClient.getInstance(store.namespace(state.config.localStoragePrefix + "." + instanceId), {}, instanceId);
							_this.remotes.push(remote);
						}
						remote.onMessage(packingSlip);
					}
				})();
			}
		},
		signalReady: function signalReady(targets, callback) {
			var instanceId = postal.instanceId();
			var that = this;
	
			this.target = store.namespace(state.config.localStoragePrefix + "." + instanceId);
			this.target.on("message", _.bind(this.routeMessage, this));
			this.keepAlive();
	
			targets = _.isArray(targets) ? targets : [targets];
			targets = targets.length ? targets : this.getTargets();
			callback = callback || function () {};
	
			_.each(targets, function (def) {
				if (def.targetId != instanceId) {
					var remote = _.find(that.remotes, function (x) {
						return x.instanceId === def.targetId;
					});
					if (!remote) {
						remote = XWindowClient.getInstance(def.target, {}, def.targetId);
						that.remotes.push(remote);
					}
					remote.sendPing(callback);
				}
			}, this);
		},
		keepAlive: function keepAlive() {
			this.target.set("targetTimeout", new Date().getTime() + state.config.targetTimeout);
			this.tidyStorage();
			this.tidyRemotes();
	
			_.delay(_.bind(this.keepAlive, this), Math.round(state.config.targetTimeout / 2));
		},
		tidyStorage: function tidyStorage() {
			var now = new Date().getTime();
			_.each(store.namespace(state.config.localStoragePrefix).getAll(), function (value, id) {
				if (id.match(/\.targetTimeout$/) && value < now) {
					var instanceId = id.split(".")[0];
					store.namespace(state.config.localStoragePrefix + "." + instanceId).clear();
				}
			});
		},
		tidyRemotes: function tidyRemotes() {
			var that = this;
			_.each(this.remotes, function (remote) {
				if (_.isEmpty(remote.target.getAll())) {
					that.disconnect({ target: remote.target });
				}
			});
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

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	// istanbul ignore next
	
	var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };
	
	exports._memoRemoteByInstanceId = _memoRemoteByInstanceId;
	exports._memoRemoteByTarget = _memoRemoteByTarget;
	exports._disconnectClient = _disconnectClient;
	exports.safeSerialize = safeSerialize;
	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	
	var _ = _interopRequire(__webpack_require__(1));
	
	function _memoRemoteByInstanceId(memo, instanceId) {
		var proxy = _.find(this.remotes, function (x) {
			return x.instanceId === instanceId;
		});
		if (proxy) {
			memo.push(proxy);
		}
		return memo;
	}
	
	function _memoRemoteByTarget(memo, tgt) {
		var proxy = _.find(this.remotes, function (x) {
			return x.target === tgt;
		});
		if (proxy) {
			memo.push(proxy);
		}
		return memo;
	}
	
	function _disconnectClient(client) {
		client.disconnect();
	}
	
	function safeSerialize(envelope) {
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;
	
		try {
			for (var _iterator = entries(envelope)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _step$value = _slicedToArray(_step.value, 2);
	
				var key = _step$value[0];
				var val = _step$value[1];
	
				if (typeof val === "function") {
					delete envelope[key];
				}
				if (_.isPlainObject(val)) {
					safeSerialize(val);
				}
				if (_.isArray(val)) {
					_.each(val, safeSerialize);
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator["return"]) {
					_iterator["return"]();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	
		return envelope;
	}
	
	var entries = regeneratorRuntime.mark(function entries(obj) {
		var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, k;
	
		return regeneratorRuntime.wrap(function entries$(context$1$0) {
			while (1) switch (context$1$0.prev = context$1$0.next) {
				case 0:
					if (["object", "function"].indexOf(typeof obj) === -1) {
						obj = {};
					}
					_iteratorNormalCompletion = true;
					_didIteratorError = false;
					_iteratorError = undefined;
					context$1$0.prev = 4;
					_iterator = Object.keys(obj)[Symbol.iterator]();
	
				case 6:
					if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
						context$1$0.next = 13;
						break;
					}
	
					k = _step.value;
					context$1$0.next = 10;
					return [k, obj[k]];
	
				case 10:
					_iteratorNormalCompletion = true;
					context$1$0.next = 6;
					break;
	
				case 13:
					context$1$0.next = 19;
					break;
	
				case 15:
					context$1$0.prev = 15;
					context$1$0.t0 = context$1$0["catch"](4);
					_didIteratorError = true;
					_iteratorError = context$1$0.t0;
	
				case 19:
					context$1$0.prev = 19;
					context$1$0.prev = 20;
	
					if (!_iteratorNormalCompletion && _iterator["return"]) {
						_iterator["return"]();
					}
	
				case 22:
					context$1$0.prev = 22;
	
					if (!_didIteratorError) {
						context$1$0.next = 25;
						break;
					}
	
					throw _iteratorError;
	
				case 25:
					return context$1$0.finish(22);
	
				case 26:
					return context$1$0.finish(19);
	
				case 27:
				case "end":
					return context$1$0.stop();
			}
		}, entries, this, [[4, 15, 19, 27], [20,, 22, 26]]);
	});
	exports.entries = entries;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	
	var _ = _interopRequire(__webpack_require__(1));
	
	var env = {
		origin: location.origin || location.protocol + "//" + location.host,
		isWorker: typeof window === "undefined" && postMessage && location,
		// I know, I KNOW. The alternative was very expensive perf & time-wise
		// so I saved you a perf hit by checking the stinking UA. Sigh.
		// I sought the opinion of several other devs. We all traveled
		// to the far east to consult with the wisdom of a monk - turns
		// out he didn"t know JavaScript, and our passports were stolen on the
		// return trip. We stowed away aboard a freighter headed back to the
		// US and by the time we got back, no one had heard of IE 8 or 9. True story.
		useEagerSerialize: /MSIE [8,9]/.test(navigator.userAgent)
	};
	
	exports.env = env;
	var defaults = {
		enabled: true,
		localStoragePrefix: "postal.fedx.xwindow",
		targetTimeout: 60000, // 1 minute
		safeSerialize: false
	};
	
	var state = {
		workers: [],
		config: _.extend({}, defaults),
		defaults: defaults
	};
	exports.state = state;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	// istanbul ignore next
	
	var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };
	
	// istanbul ignore next
	
	var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();
	
	// istanbul ignore next
	
	var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };
	
	// istanbul ignore next
	
	var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };
	
	// istanbul ignore next
	
	var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };
	
	var postal = _interopRequire(__webpack_require__(2));
	
	//import _ from "lodash";
	
	var XWindowClient = (function (_postal$fedx$FederationClient) {
	   function XWindowClient() {
	      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
	         args[_key] = arguments[_key];
	      }
	
	      _classCallCheck(this, XWindowClient);
	
	      this.transportName = "xwindow";
	      _get(Object.getPrototypeOf(XWindowClient.prototype), "constructor", this).apply(this, args);
	   }
	
	   _inherits(XWindowClient, _postal$fedx$FederationClient);
	
	   _createClass(XWindowClient, {
	      send: {
	         value: function send(packingSlip) {
	            var msg = postal.fedx.transports.xwindow.wrapForTransport(packingSlip);
	            this.target.set("message", msg);
	         }
	      }
	   });
	
	   return XWindowClient;
	})(postal.fedx.FederationClient);
	
	module.exports = XWindowClient;

/***/ }
/******/ ])
});
;