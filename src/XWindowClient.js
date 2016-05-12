import postal from "postal";
//import _ from "lodash";

export default class XWindowClient extends postal.fedx.FederationClient {

    constructor( ...args ) {
	this.transportName = "xwindow";
	super( ...args );
    }

    send( packingSlip ) {
	const msg = postal.fedx.transports.xwindow.wrapForTransport( packingSlip );
	this.target.set( "message", msg );
    }
}
