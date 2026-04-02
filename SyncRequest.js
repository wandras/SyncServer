wa.SyncRequest = class SyncRequest {
	#mandatoryProps; // Mandatory properties to instantiate a request
	#$iframe;
	#receiveResponse;
	
	constructor(options = {}) {
		this.#mandatoryProps = ['targetUrl', 'type'];
		
		if (!this.#isValid(options)) {
			const missingProps = this.#mandatoryProps.filter(key => !(key in options));
			throw new Error('SyncRequest: invalid request parameters, missing "' + missingProps.join('", "') + '"');
		}
		
		this.time = Date.now();
		this.targetUrl = options.targetUrl;
		this.type = options.type;
		this.status = 'REQUEST_CREATED';
		this.requestId = wa.SyncServer.createToken();
		
        this.#$iframe = this.#buildIframe(this.targetUrl);
		
		this.targetWindow = this.#$iframe.contentWindow;
		this.targetOrigin = wa.SyncServer.getOrigin(this.targetUrl);

		this.sourceWindow = window;
		this.sourceOrigin = window.location.origin;
		
		// Request data actually sent to the target
		this.data = {
			requestId: this.requestId,
			time: this.time,
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
	send() {
		this.status = 'REQUEST_PENDING';
		
		this.#$iframe.addEventListener('load', () => {
			// send the request when the target is ready
			let stringData = wa.SyncServer.encode(this.data);
			
			if (stringData !== false) {
				this.targetWindow.postMessage(stringData, this.targetOrigin);
				this.status = 'REQUEST_SENT';
				console.log('SyncRequest: data sent to ' + this.targetUrl, this.data);
			}
		});
	}
	destroy() {
		this.#destroyIframe();
	}
    #buildIframe(src) {
        this.#$iframe = document.createElement('iframe');
        this.#$iframe.style = "position: absolute; z-index: -10000; top: -10000px; left: -10000px; width: 100px; height: 100px;";
        this.#$iframe.src = src;
        
        document.body.appendChild(this.#$iframe);
        return this.#$iframe;
    }
    #destroyIframe() {
        document.body.removeChild(this.#$iframe);
    }
}

