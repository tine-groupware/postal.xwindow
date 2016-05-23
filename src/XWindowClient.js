import postal from "postal";
import _ from "lodash";
import { state, env } from "./state";

export default class XWindowClient extends postal.fedx.FederationClient {

	constructor( ...args ) {
		this.transportName = "xwindow";
		super( ...args );
	}

	shouldProcess() {
		const hasDomainFilters = !!state.config.allowedOrigins.length;
		return state.config.enabled &&
			// another frame/window
			( ( this.options.origin === "*" || ( hasDomainFilters && _.contains( state.config.allowedOrigins, this.options.origin ) || !hasDomainFilters ) ) ||
			// worker
			( this.options.isWorker && _.contains( state.workers, this.target ) ) ||
			// we are in a worker
			env.isWorker );
	}
	send( packingSlip ) {
		if ( this.shouldProcess() ) {
			const msg = postal.fedx.transports.xwindow.wrapForTransport( packingSlip );
			this.target.set( "message", msg );
		}
	}
}
