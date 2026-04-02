/**
 * 
 * SYNC SERVER 20251212
 * Cross-Profile Data Sync'er
 * 
 */
window.wa = window.wa || {};

wa.SyncServer = class SyncServer {
	allowedOrigins;
    incomingRequests; // Object containing the requests received
    outgoingRequests; // Object containing the requests performed
	#cacheNum; // Number of requests to be cached
	#requestCount; // Number of requests performed, in the current instance
    #responseCount; // Number of responses managed, in the current instance
	#boundDispatcher; // dispatcher of requests/responses, bound to the current scope
	
    constructor() {
        this.allowedOrigins = [];
		this.incomingRequests = {};
        this.outgoingRequests = {};
		this.#cacheNum = 10;
		this.#requestCount = 0;
		this.#responseCount = 0;
		
		// Bound the scope for 
		this.#boundDispatcher = this.#dispatch.bind(this);
		
		console.log('SyncServer: server instantiated on ' + window.location.href);
    }
	setAllowedOrigins(...args) {
		this.allowedOrigins.push(
			...args.filter(origin => typeof origin === 'string')
		);
	}
    listen() {
        // Start listening
        this.status = 'RUNNING';
		window.addEventListener('message', this.#boundDispatcher);
    }
    stop() {
		// Stop listening
        window.removeEventListener('message', this.#boundDispatcher);
        this.status = 'STOPPED';
    }
	#dispatch(event) {
		// Receive the message and dispatch to the correct handler
		let data = wa.SyncServer.decode(event.data);
		
		if (data !== false && data.requestId && data.type) {
			if (data.responseId) {
				// It's a response
				this.#receiveResponse(data);
			} else {
				if (this.allowedOrigins.length && !this.allowedOrigins.includes(event.origin)) {
					console.warn('SyncServer: request origin not allowed', event.origin);
					return;
				}
				// It's an incoming request
				this.#receiveRequest(event, data);
			}
		}
	}
	createRequest(requestData) {
		// Create an outgoing request
		let request = new wa.SyncRequest(requestData);
		this.#requestCount++;
        this.outgoingRequests[request.requestId] = request;
		
		return request;
    }
    createResponse(responseData) {
		if (responseData && responseData.requestId && this.incomingRequests[responseData.requestId]) {
			// Get the related request:
			let request = this.incomingRequests[responseData.requestId];
			
			// Add the transport information to the response data
			responseData.targetWindow = request.sourceWindow;
			responseData.targetOrigin = request.sourceOrigin;
			responseData.type = request.type;
			responseData.time = Date.now();
			
			let response = new wa.SyncResponse(responseData);
			this.#responseCount++;
			
			let keys = Object.keys(this.incomingRequests);
			
			if (keys.length > this.#cacheNum) {
				let olderKey = keys[0]; // older request ID
				
				if (olderKey !== responseData.requestId) {
					// Delete the older request, if it's not the current one
					delete this.incomingRequests[olderKey];
				}
			}
			
			return response;
		}
    }
	onRequest(callback) {
		// Registers the given callback as handler of incoming requests
		if (typeof callback === 'function') {
			this.requestHandler = callback;
		}
	}
	requestHandler(requestData) {
		// Default to empty, to be overridden before starting listening
	}
    #receiveRequest(event, requestData) {
		// SyncServer working as responder, for the client
		// Save the source window element and source origin of the request, to send the response back at the right endpoint
		requestData.sourceWindow = event.source;
		requestData.sourceOrigin = event.origin;
		
		// Cache the incoming request
		this.incomingRequests[requestData.requestId] = requestData;
		
		// Handle the request:
		this.requestHandler(requestData);
    }
    #receiveResponse(responseData) {
		// SyncServer working as client, engaging the responder
        if (responseData && responseData.requestId && this.outgoingRequests[responseData.requestId]) {
			// Response refers to an existing request
			let request = this.outgoingRequests[responseData.requestId];
			let elapsed = responseData.time - request.time;
			responseData.roundtrip = elapsed;

			request.status = 'COMPLETE';
			
			let keys = Object.keys(this.outgoingRequests);
			
			if (keys.length > this.#cacheNum) {
				let olderKey = keys[0]; // older request ID
				
				if (olderKey !== responseData.requestId) {
					// Delete the older request, if it's not the current one
					this.outgoingRequests[olderKey].destroy();
					delete this.outgoingRequests[olderKey];
				}
			}
			
			// Handle the response:
			request.responseHandler(responseData);
        } else {
			console.warn('SyncServer: response not related to any request');
		}
    }
    static decode(stringData) {
        // Decode stringified data to object
        try {
            let data = JSON.parse(stringData);
			return data;
        } catch(error) {
			// Only uncomment in DEV, if you want to inspect everything flowing in this channel 
            //console.log('SyncServer: undecodable data in message', stringData, error);
            return false;
        }
    }
    static encode(data) {
        // Encode data object to string
		try {
			let stringData = JSON.stringify(data);
			return stringData;
		} catch(error) {
			console.warn('SyncServer: error while encoding data for the request', error);
			return false;
		}
    }
	static createToken() {
		return Array.from(
			crypto.getRandomValues(new Uint8Array(32)),
			byte => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[byte % 36]
		).join('');
    }
	static getOrigin(url) {
		try {
			return new URL(url).origin;
		} catch(error) {
			console.error("SyncServer: invalid URL", error);
			return null;
		}
	}
}

