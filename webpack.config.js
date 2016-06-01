var pkg = require( "./package.json" );
var _ = require( "lodash" );
var webpack = require( "webpack" );
var banner = [
	" * <%= pkg.name %> - <%= pkg.description %>",
	" * Author: <%= pkg.author %>",
	" * Version: v<%= pkg.version %>",
	" * Url: <%= pkg.homepage %>",
	" * License(s): <%= pkg.license %>"
].join( "\n" );
var header = _.template( banner )( { pkg: pkg } );

module.exports = {
	output: {
		library: "postalXWindow",
		libraryTarget: "umd",
		filename: "postal.xwindow.js"
	},
	devtool: "#inline-source-map",
	externals: [
		{
			postal: true,
			lodash: {
				root: "_",
				commonjs: "lodash",
				commonjs2: "lodash",
				amd: "lodash"
			}
		}
	],
	plugins: [
		new webpack.BannerPlugin( header )
	]
};
