import _ from "lodash";
import postal from "postal";
import {
	_memoRemoteByInstanceId,
	_memoRemoteByTarget,
	_disconnectClient,
	safeSerialize,
	parseUri
} from "./utils";
import { state, env } from "./state";
import XWindowClient from "./XWindowClient";

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
		const clients = options.instanceId ?
		// an instanceId value or array was provided, let's get the client proxy instances for the id(s)
		_.reduce( _.isArray( options.instanceId ) ? options.instanceId : [ options.instanceId ], _memoRemoteByInstanceId, [], this ) :
		// Ok so we don't have instanceId(s), let's try target(s)
		options.target ?
		// Ok, so we have a targets array, we need to iterate over it and get a list of the proxy/client instances
		_.reduce( _.isArray( options.target ) ? options.target : [ options.target ], _memoRemoteByTarget, [], this ) :
		// aww, heck - we don't have instanceId(s) or target(s), so it's ALL THE REMOTES
		this.remotes;
		if ( !options.doNotNotify ) {
			_.each( clients, _disconnectClient, this );
		}
		this.remotes = _.without.apply( null, [ this.remotes ].concat( clients ) );
	},
	getTargets: function() {
		this.tidyStorage();
		return _.reduce( store.namespace( state.config.localStoragePrefix ).getAll(), function( memo, targetData, id ) {
			if ( id.match( /\.targetTimeout$/ ) ) {
				const targetId = id.split( "." )[0];
				const target = store.namespace( state.config.localStoragePrefix + "." + targetId );
				memo.push( {
					targetId: targetId,
					target: target,
					origin: target.get( "targetUrl" )
				} );
			}
			return memo;
		}, [] );
	},
	sendMessage: function( env ) {
		let envelope = env;
		if ( state.config.safeSerialize ) {
			envelope = safeSerialize( _.cloneDeep( env ) );
		}
		const instanceId = postal.instanceId();

		_.each( this.remotes, function( remote ) {
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
		const parsed = this.unwrapFromTransport( event.newValue );

		if ( parsed && parsed.postal ) {
			const packingSlip = parsed.packingSlip;
			const instanceId = packingSlip.instanceId;
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
				const url = parseUri( event.url );
				const origin = url.protocol + "://" + url.authority;

				if ( remote.options.origin == origin ) {
					remote.onMessage( packingSlip );
				}
			}
		}
	},
	signalReady: function( targets, callback ) {
		const instanceId = postal.instanceId();
		const that = this;

		this.target = store.namespace( state.config.localStoragePrefix + "." + instanceId );
		this.target.set( "targetUrl", env.origin );
		this.target.on( "message", _.bind( this.routeMessage, this ) );
		this.keepAlive();

		targets = _.isArray( targets ) ? targets : [ targets ];
		targets = targets.length ? targets : this.getTargets();
		callback = callback || function() {};

		_.each( targets, function( def ) {
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
		}, this );
	},
	keepAlive: function() {
		this.target.set( "targetTimeout", new Date().getTime() + state.config.targetTimeout );

		this.tidyStorage();
		this.tidyRemotes();

		_.delay( _.bind( this.keepAlive, this ), Math.round( state.config.targetTimeout / 2 ) );
	},
	tidyStorage: function() {
		const now = new Date().getTime();
		_.each( store.namespace( state.config.localStoragePrefix ).getAll(), function( value, id ) {
			if ( id.match( /\.targetTimeout$/ ) && value < now ) {
				var instanceId = id.split( "." )[0];
				store.namespace( state.config.localStoragePrefix + "." + instanceId ).clear();
			}
		} );
	},
	tidyRemotes: function() {
		const that = this;
		_.each( this.remotes, function( remote ) {
			if ( _.isEmpty( remote.target.getAll() ) ) {
				that.disconnect( { target: remote.target } );
			}
		} );
	}
};
