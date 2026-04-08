wa.SyncRequest = class SyncRequest {
	#mandatoryProps; // Mandatory properties to instantiate a request
	#$iframe; // DOM reference to the iframe
	#iframeLoaded; // Boolean, to mark if the iframe has been loaded
	
	constructor(options = {}) {
		this.#mandatoryProps = ['targetUrl', 'type'];
		
		if (!this.#isValid(options)) {
			const missingProps = this.#mandatoryProps.filter(key => !(key in options));
			throw new Error('SyncRequest: invalid request parameters, missing "' + missingProps.join('", "') + '"');
		}
		
		this.targetUrl = options.targetUrl;
		this.type = options.type;
		this.status = 'REQUEST_CREATED';
		this.requestId = wa.SyncServer.createToken();
		
		this.#iframeLoaded = false;
        this.#$iframe = this.#buildIframe(this.targetUrl);
		
		this.targetWindow = this.#$iframe.contentWindow;
		this.targetOrigin = wa.SyncServer.getOrigin(this.targetUrl);

		this.sourceWindow = window;
		this.sourceOrigin = window.location.origin;
		
		// Request data actually sent to the target
		this.data = {
			requestId: this.requestId,
			targetUrl: this.targetUrl,
			type: this.type,
			payload: options.payload
		};
	}
	#isValid(options) {
		return this.#mandatoryProps.every(key => key in options);
	}
	onResponse(callback) {
		// Set the handler to the response received event
		if (typeof callback === 'function') {
			this.responseHandler = callback;
		}
	}
	responseHandler(requestData) {
		// Default to empty, to be overridden before starting listening
	}
	#transmit() {
		// Transmit the request to the target
    	let stringData = wa.SyncServer.encode(this.data);
		
		if (stringData !== false) {
			this.targetWindow.postMessage(stringData, this.targetOrigin);
			this.status = 'REQUEST_SENT';
			console.log('SyncRequest: data sent to ' + this.targetUrl, this.data);
		} else {
			console.warn('SyncRequest: failed to encode the request data');
		}
	}
	send() {
		this.status = 'REQUEST_PENDING';
		// Set the timestamp:
		this.data.time = Date.now();
		
		if (this.#iframeLoaded) {
			// iframe already loaded, send the request
			this.#transmit();
		} else {
			// send the request when the target is ready
			this.#$iframe.addEventListener('load', () => this.#transmit(), { once: true });
		}
	}
	destroy() {
		this.#destroyIframe();
	}
	#destroyIframe() {
		if (this.#$iframe && this.#$iframe.parentNode) {
			this.#$iframe.parentNode.removeChild(this.#$iframe);
		}
	}
    #buildIframe(src) {
        this.#$iframe = document.createElement('iframe');
        this.#$iframe.style = "position: absolute; z-index: -10000; top: -10000px; left: -10000px; width: 100px; height: 100px;";
        this.#$iframe.src = src;
        
		this.#$iframe.addEventListener('load', () => {
			this.#iframeLoaded = true; // Mark the first load of the iframe
		}, { once: true });
		
        document.body.appendChild(this.#$iframe);
        return this.#$iframe;
    }
}
