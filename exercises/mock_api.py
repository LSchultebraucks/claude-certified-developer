"""Tiny local mock of the Claude Messages API for offline exercise tests.

Usage:
    with MockAPI(responses) as api:
        client = anthropic.Anthropic(api_key="test", base_url=api.url, max_retries=0)
`responses` is a list of (status_code, json_body, headers) returned in order; every
received request body is recorded in `api.requests`.
"""
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer


def message(content, stop_reason="end_turn", usage=None):
    return {
        "id": "msg_test", "type": "message", "role": "assistant", "model": "claude-opus-5-5",
        "content": content, "stop_reason": stop_reason, "stop_sequence": None,
        "usage": usage or {"input_tokens": 10, "output_tokens": 5},
    }


def error(status, etype, msg="error"):
    return {"type": "error", "error": {"type": etype, "message": msg}}


class MockAPI:
    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []

    def __enter__(self):
        api = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_POST(self):
                length = int(self.headers.get("content-length", 0))
                api.requests.append(json.loads(self.rfile.read(length) or b"{}"))
                status, body, headers = api.responses.pop(0) if api.responses else (500, error(500, "api_error"), {})
                data = json.dumps(body).encode()
                self.send_response(status)
                self.send_header("content-type", "application/json")
                self.send_header("content-length", str(len(data)))
                for k, v in (headers or {}).items():
                    self.send_header(k, v)
                self.end_headers()
                self.wfile.write(data)

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        return self

    def __exit__(self, *exc):
        self.server.shutdown()
