require( "lodash" );
var postal = require( "postal" );
var S = require( "./state" );
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
			( ( this.options.origin === "*" || ( hasDomainFilters && _.contains( state.config.allowedOrigins, this.options.origin ) || !hasDomainFilters ) ) ||
				// worker
			( this.options.isWorker && _.contains( state.workers, this.target ) ) ||
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
