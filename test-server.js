#!/usr/bin/env node

/**
 * MCP SuperAssistant Testing Server
 * 
 * Simple HTTP server for sending test messages to the browser extension.
 * This allows developers to test the extension's message injection capabilities
 * without manually typing in the AI chat interfaces.
 * 
 * Usage:
 *   node test-server.js [port]
 *   
 * Default port: 3007
 * 
 * API Endpoints:
 *   GET  /             - Web interface for sending test messages
 *   POST /send-message - Send a test message to the extension
 *   GET  /status       - Get server status
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

// Configuration
const DEFAULT_PORT = 3007;
const port = process.argv[2] || DEFAULT_PORT;

// HTML interface for testing
const testInterface = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP SuperAssistant Testing Interface</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        textarea, input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
        }
        textarea {
            height: 120px;
            resize: vertical;
        }
        button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
        }
        button:hover {
            background: #0056b3;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            font-weight: 600;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .instructions {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .example-messages {
            margin-top: 20px;
        }
        .example-message {
            background: #f8f9fa;
            padding: 10px;
            margin: 5px 0;
            border-radius: 3px;
            cursor: pointer;
            border: 1px solid #e9ecef;
        }
        .example-message:hover {
            background: #e9ecef;
        }
        .api-info {
            margin-top: 30px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 MCP SuperAssistant Testing Interface</h1>
        
        <div class="instructions">
            <strong>Instructions:</strong>
            <ol>
                <li>Make sure the MCP SuperAssistant extension is installed and active</li>
                <li>Navigate to a supported AI platform (ChatGPT, Perplexity, Gemini, etc.)</li>
                <li>Enable testing mode in the extension or set <code>window.__MCP_TEST_MODE = true</code> in console</li>
                <li>Use this interface to send test messages that will be injected into the chat</li>
            </ol>
        </div>

        <form id="messageForm">
            <div class="form-group">
                <label for="messageText">Test Message:</label>
                <textarea id="messageText" placeholder="Enter your test message here..." required></textarea>
            </div>
            
            <div class="form-group">
                <label for="messageId">Message ID (optional):</label>
                <input type="text" id="messageId" placeholder="Optional unique identifier">
            </div>

            <button type="submit" id="sendButton">Send Test Message</button>
            <button type="button" id="clearButton">Clear</button>
        </form>

        <div id="status"></div>

        <div class="example-messages">
            <h3>Example Test Messages:</h3>
            <div class="example-message" onclick="setMessage('Hello! This is a test message from the MCP SuperAssistant testing framework.')">
                💬 Simple greeting message
            </div>
            <div class="example-message" onclick="setMessage('Please help me test the file upload functionality by pretending to upload a document.')">
                📁 File upload test message
            </div>
            <div class="example-message" onclick="setMessage('Can you explain quantum computing in simple terms? This is a test of the extension\\'s ability to inject complex questions.')">
                🧠 Complex question test
            </div>
            <div class="example-message" onclick="setMessage('Testing special characters: @#$%^&*()_+{}|:<>?[];\\'.,/\`~')">
                🔣 Special characters test
            </div>
        </div>

        <div class="api-info">
            <h4>API Information:</h4>
            <p><strong>Server URL:</strong> http://localhost:${port}</p>
            <p><strong>Send Message:</strong> POST /send-message</p>
            <p><strong>Payload:</strong> { "text": "Your message", "id": "optional-id" }</p>
        </div>
    </div>

    <script>
        const form = document.getElementById('messageForm');
        const messageText = document.getElementById('messageText');
        const messageId = document.getElementById('messageId');
        const sendButton = document.getElementById('sendButton');
        const clearButton = document.getElementById('clearButton');
        const status = document.getElementById('status');

        function showStatus(message, type = 'info') {
            status.innerHTML = '<div class="status ' + type + '">' + message + '</div>';
            setTimeout(() => {
                status.innerHTML = '';
            }, 5000);
        }

        function setMessage(text) {
            messageText.value = text;
            messageText.focus();
        }

        clearButton.addEventListener('click', () => {
            messageText.value = '';
            messageId.value = '';
            messageText.focus();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!messageText.value.trim()) {
                showStatus('Please enter a message', 'error');
                return;
            }

            sendButton.disabled = true;
            showStatus('Sending message...', 'info');

            try {
                // Try to send via postMessage to the extension first
                if (window.opener || window.parent) {
                    const message = {
                        type: 'mcp-test-message',
                        text: messageText.value.trim(),
                        id: messageId.value.trim() || undefined,
                        timestamp: Date.now()
                    };
                    
                    if (window.opener) {
                        window.opener.postMessage(message, '*');
                    } else {
                        window.parent.postMessage(message, '*');
                    }
                    
                    showStatus('Message sent via postMessage', 'success');
                } else {
                    // Fallback to HTTP API
                    const response = await fetch('/send-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            text: messageText.value.trim(),
                            id: messageId.value.trim() || undefined
                        })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        showStatus('Message sent successfully! ID: ' + result.messageId, 'success');
                    } else {
                        showStatus('Error: ' + (result.error || 'Unknown error'), 'error');
                    }
                }
            } catch (error) {
                showStatus('Error sending message: ' + error.message, 'error');
            } finally {
                sendButton.disabled = false;
            }
        });

        // Listen for responses from the extension
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'mcp-test-response') {
                if (event.data.success) {
                    showStatus('Extension confirmed message received! ID: ' + event.data.messageId, 'success');
                } else {
                    showStatus('Extension error: ' + (event.data.error || 'Unknown error'), 'error');
                }
            }
        });

        // Focus on message text when page loads
        messageText.focus();
    </script>
</body>
</html>
`;

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Route handlers
    if (pathname === '/' && method === 'GET') {
        // Serve the test interface
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(testInterface);
        
    } else if (pathname === '/send-message' && method === 'POST') {
        // Handle message sending
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.text || typeof data.text !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Missing or invalid text field' 
                    }));
                    return;
                }

                // Log the message
                console.log('[TestServer] Received test message:', {
                    text: data.text.substring(0, 100) + (data.text.length > 100 ? '...' : ''),
                    id: data.id,
                    timestamp: new Date().toISOString()
                });

                // Simulate successful processing
                const response = {
                    success: true,
                    messageId: data.id || `msg-${Date.now()}`,
                    timestamp: Date.now(),
                    note: 'Message logged by test server. Extension should receive via postMessage.'
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
                
            } catch (error) {
                console.error('[TestServer] Error processing message:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Invalid JSON' 
                }));
            }
        });
        
    } else if (pathname === '/status' && method === 'GET') {
        // Server status
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'running',
            port: port,
            timestamp: new Date().toISOString(),
            endpoints: {
                '/': 'Test interface (GET)',
                '/send-message': 'Send test message (POST)',
                '/status': 'Server status (GET)'
            }
        }));
        
    } else {
        // 404 for unknown routes
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Not found',
            availableEndpoints: ['/', '/send-message', '/status']
        }));
    }
});

// Start server
server.listen(port, () => {
    console.log(`🚀 MCP SuperAssistant Testing Server started on port ${port}`);
    console.log(`📱 Test interface: http://localhost:${port}`);
    console.log(`🔧 API endpoint: http://localhost:${port}/send-message`);
    console.log('');
    console.log('🎯 Instructions:');
    console.log('1. Open a browser tab with an AI platform (ChatGPT, Perplexity, etc.)');
    console.log('2. Enable testing mode in the MCP SuperAssistant extension');
    console.log('3. Open the test interface and send messages');
    console.log('');
    console.log('⏹️  Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});