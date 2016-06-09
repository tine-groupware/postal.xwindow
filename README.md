# postal.xwindow

## Version 0.0.4 (Dual Licensed [MIT](http://www.opensource.org/licenses/mit-license) & [GPL](http://www.opensource.org/licenses/gpl-license))

## What is it?
postal.xwindow is an add-on for [postal.js](https://github.com/postaljs/postal.js) that provides cross window communication capabilities using a localStoreage hack.
A lot of code and boiler plate config is taken from [postal.xframe](https://github.com/postaljs/postal.xframe). 

## What the difference to postal.xframe
postal.xframe needs a reference to the frame to function. There are scenarios where you don't have this reference:

* separately opened windows of your application
* opener reloaded, child still exists
* window chain where some window in the middle of the chain got closed

## How does it work?
postal.xwindow uses [localStorage](http://caniuse.com/#search=localStorage) as a workaround to let separate windows communicate. The same would be possible with [sharedWorkers](http://caniuse.com/#search=sharedWorkers) but browser support is incomplete for it.

* Each postal.xwindow instance has it's own target/key in localStorage `postal.fedx.xwindow`.
* A target contains two keys `message` and `targetTimeout`.
* Each postal.xwindow instance periodically updates its `targetTimeout`. A cleanup process tidys up the storage area from dead targets.
* Each postal.xwindow posts its messages to all other targets `message` key.
* Each postal.xwindow instance listens to the localStorage events for its own `message` key.

## Run-time Dependencies

This is a postal add-on, so it's assumed that you have postal and lodash loaded already.

* [lodash](https://lodash.com/)
* [postal](https://github.com/postaljs/postal.js)
* [postal.federation](https://github.com/postaljs/postal.federation)
* [babel browser polyfill](https://babeljs.io/docs/usage/polyfill/)
* [store2](https://github.com/nbubna/store)
* [store2.bind](https://github.com/nbubna/store/blob/master/src/store.bind.js)

## How do I use it?

* see example
* NOTE: postal.xwindow uses [store2](https://github.com/nbubna/store), but store2 can't be loaded by webpack yet. you need to mangage the include yourself.
```
  <script src="../node_modules/store2/dist/store2.js"></script>
  <script src="../node_modules/store2/src/store.bind.js"></script>
```
* NOTE: as postal.xwindow uses localStorage you might need to take care of what you post and have popper cleanup.

```javascript

// this instance of postal *MUST* have a unique identifier, otherwise
// there is no way to differentiate between this instance of postal
// and a remote instance. You can provide your own server-generated
// GUID, or - if you know a unique value ahead of time - you can set
// it via postal.instanceId(id). Calling postal.instanceId() without any
// arguments acts as a getter - it returns the current instance Id.
postal.instanceId("parent");

// You can optionally configure postal.xwindow with the configure call.
// `allowedOrigins` is an array of origins that you can use to determine
// if you want to federate with postal instances loaded in another window
// from those origins.  If another host attempts to federate with you from
// an origin not listed in that array, the local instance of postal will
// not allow it. The local instance of postal will not send any messages to
// (nor process any from) an origin not listed in this array.
postal.fedx.transports.xwindow.configure({
	allowedOrigins : [ "http://some.host.com", "http://another.com" ],
	enabled: true // this is redundant - just showing that it's here
});

```
## Building, Running Tests

* `npm install` to install dependencies
* `gulp test` to build and run tests
* `gulp coverage` to build, run tests and show an istanbul coverage report
* `gulp` to build
* `gulp watch` to start a file watch which builds as you save changes to the `src/` files
* `npm start` will start a local web server that lets you run browser-based tests or see a _very_simple example of multiple windows communicating.

## TODO
 * cope/support origins?!
 * support rename of instance
 * use newer version of store
 * convert store to be usable by webpack
 * wirte tests
 * push to github
 * implement cleanup on window close