"""
Simple HTTP server for testing Telegram Mini App locally.
For production, use HTTPS (required by Telegram).
"""

import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[SERVER] Running at http://localhost:{PORT}")
        print(f"[SERVER] Serving files from: {DIRECTORY}")
        print(f"[INFO] For Telegram WebApp, you need HTTPS.")
        print(f"[INFO] Use ngrok: ngrok http {PORT}")
        print(f"[INFO] Then set WebApp URL in bot to ngrok HTTPS URL")
        print()
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[SERVER] Stopped")
