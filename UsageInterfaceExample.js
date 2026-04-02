// Component working as client (requestor), on "example-landingpage.com"
let server = new wa.SyncServer();

// Enable the server
server.listen();

// Prepare the request
let request = server.createRequest({
    targetUrl: 'https://example-eshop.com/',
    type: 'GET_DYNAMIC_URL',
    payload: {}
});

// Decide what to do with the response, when received
request.onResponse(function(responseData) {
    console.log('Response received on ' + window.location.href, responseData);
});

// Send the request
request.send();



// Component working as a server (responder), on "example-eshop.com":
let server = new wa.SyncServer();

// Declare what we accept requests from:
server.setAllowedOrigins(
    "https://example-landingpage.com",
    "https://www.example.com",
    "https://example-eshop.com",
    "https://example-giftcard.com"
);

server.onRequest(function(requestData) {
    console.log('Request received on ' + window.location.href, requestData);
    
    if (requestData.type === 'GET_DYNAMIC_URL') {
        
        // Build the response
        let response = server.createResponse({
            requestId: requestData.requestId,
            payload: {
                dynamic_url: window.utag_data?.dynamic_url // safe access
            }
        });
        
        // Send it back to the client
        response.send();
        
        // Stop if you want only receive once
        // server.stop();
    }
});

// Enable the server
server.listen();
