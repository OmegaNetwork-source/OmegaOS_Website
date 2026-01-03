#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}/omega-os-landing.html")
    print("Press Ctrl+C to stop the server")
    # Automatically open browser
    webbrowser.open(f'http://localhost:{PORT}/omega-os-landing.html')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


