wa.SyncResponse = class SyncResponse {
	#mandatoryProps; // Mandatory properties to instantiate a request
	
	constructor(options = {}) {
		this.#mandatoryProps = ['requestId', 'type', 'targetWindow', 'targetOrigin'];
		
		if (!this.#isValid(options)) {
			const missingProps = this.#mandatoryProps.filter(key => !(key in options));
			throw new Error('SyncResponse: invalid request parameters, missing "' + missingProps.join('", "') + '"');
		}
		
		this.requestId = options.requestId;
		this.type = options.type;
		
		this.targetWindow = options.targetWindow;
		this.targetOrigin = options.targetOrigin;
		
		this.status = 'RESPONSE_CREATED';
		this.responseId = wa.SyncServer.createToken();
		
		// Response data actually sent to the target
		this.data = {
			requestId: this.requestId,
			responseId: this.responseId,
			type: this.type,
			payload: options.payload
		};
	}
	#isValid(options) {
		return this.#mandatoryProps.every(key => key in options);
	}
	send() {
		this.status = 'RESPONSE_PENDING';
		this.data.time = Date.now();
		
		// send the request when the target is ready
		let stringData = wa.SyncServer.encode(this.data);
		
		if (stringData !== false) {
			this.targetWindow.postMessage(stringData, this.targetOrigin);
			
			this.status = 'RESPONSE_SENT';
			console.log('SyncResponse: data sent back to ' + this.targetOrigin, this.data);
		}
	}
}
