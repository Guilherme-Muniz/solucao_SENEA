import http.server
import socketserver
import urllib.request
import sys

# === CONFIGURAÇÕES ===
PORT = 8081  # Porta do servidor
TARGET_URL = "https://api.tisaude.com"

# SEU TOKEN (JÁ CONFIGURADO)
SEU_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS50aXNhdWRlLmNvbSIsImlhdCI6MTc2NTg1Mjc0NCwiZXhwIjoxNzY4NDQ0NzQ0LCJuYmYiOjE3NjU4NTI3NDQsImp0aSI6ImxJVjZ5ZFlSaGdpM1VnM28iLCJzdWIiOiI5MTU3OCIsInBydiI6IjU4NzA4NjNkNGE2MmQ3OTE0NDNmYWY5MzZmYzM2ODAzMWQxMTBjNGYifQ.aBDe7q9UvQQgUpVz09No9zjy0sBATa5O45KwkPnoMwM"

class AuthenticatedProxy(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Se não for chamada de API, entrega o site (html, css, js)
        if not self.path.startswith("/api"):
            super().do_GET()
            return

        print(f"🔄 [GET] Buscando no Ti Saúde: {self.path}")
        self.fazer_requisicao_real("GET")

    def do_POST(self):
        if not self.path.startswith("/api"):
            self.send_error(404)
            return

        print(f"🔄 [POST] Enviando dados para o Ti Saúde...")
        self.fazer_requisicao_real("POST")

    def fazer_requisicao_real(self, method):
        try:
            # Monta a URL real
            url = f"{TARGET_URL}{self.path}"
            
            # Se tiver dados (POST), lê o corpo da mensagem
            data = None
            if method == "POST":
                length = int(self.headers['Content-Length'])
                data = self.rfile.read(length)

            # Prepara o pedido
            req = urllib.request.Request(url, data=data, method=method)

            # --- AQUI ESTÁ O SEGREDO (O TOKEN) ---
            req.add_header('Authorization', f'Bearer {SEU_TOKEN}')
            req.add_header('Content-Type', 'application/json')
            req.add_header('User-Agent', 'Mozilla/5.0') 

            # Envia e pega a resposta
            with urllib.request.urlopen(req) as response:
                print(f"✅ SUCESSO! Ti Saúde respondeu: {response.status}")
                
                # Devolve para o seu site liberando o acesso (CORS)
                self.send_response(response.status)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response.read())

        except urllib.error.HTTPError as e:
            print(f"❌ ERRO API ({e.code}): {e.reason}")
            # Repassa o erro para o site saber que falhou
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(e.read())
            
        except Exception as e:
            print(f"❌ ERRO GERAL: {e}")
            self.send_error(500, str(e))

print(f"🚀 SERVIDOR PRONTO! Acesse: http://localhost:{PORT}")
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), AuthenticatedProxy) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass