from flask import Flask, request, jsonify, send_from_directory, Response
import requests
import os
from datetime import date

# === CONFIGURAÇÕES ===
app = Flask(__name__, static_folder='.')
PORT = 8081
TARGET_URL = "https://api.tisaude.com"

# SEU TOKEN (Configurado)
SEU_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwaS50aXNhdWRlLmNvbSIsImlhdCI6MTc2NTg1Mjc0NCwiZXhwIjoxNzY4NDQ0NzQ0LCJuYmYiOjE3NjU4NTI3NDQsImp0aSI6ImxJVjZ5ZFlSaGdpM1VnM28iLCJzdWIiOiI5MTU3OCIsInBydiI6IjU4NzA4NjNkNGE2MmQ3OTE0NDNmYWY5MzZmYzM2ODAzMWQxMTBjNGYifQ.aBDe7q9UvQQgUpVz09No9zjy0sBATa5O45KwkPnoMwM"

# 1. Rota para entregar o site (index.html)
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# 1.1 Rota para entregar o perfil etário agregado
@app.route('/api/stats/age-profile', methods=['GET'])
def age_profile():
    hoje = date.today()
    youth = adult = senior = unknown = 0

    headers = {
        'Authorization': f'Bearer {SEU_TOKEN}',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }

    # 1️⃣ Busca primeira página
    url = f"{TARGET_URL}/api/patients"
    resp = requests.get(url, headers=headers)

    if not resp.ok:
        return jsonify({"error": "Erro ao buscar pacientes"}), 500

    data = resp.json()
    pacientes = data.get('data', [])
    last_page = data.get('last_page', 1)

    def processar_lista(lista):
        nonlocal youth, adult, senior, unknown
        for p in lista:
            nascimento = p.get('dateOfBirth')

            # Alguns registros têm CPF no lugar da data → ignora
            if nascimento and '/' in nascimento:
                try:
                    dia, mes, ano = nascimento.split('/')
                    nasc = date(int(ano), int(mes), int(dia))
                    idade = hoje.year - nasc.year - (
                        (hoje.month, hoje.day) < (nasc.month, nasc.day)
                    )

                    if idade < 20:
                        youth += 1
                    elif idade < 60:
                        adult += 1
                    else:
                        senior += 1
                except Exception:
                    unknown += 1
            else:
                unknown += 1

    # Processa página 1
    processar_lista(pacientes)

    # 2️⃣ Busca as demais páginas
    for page in range(2, last_page + 1):
        resp = requests.get(
            url,
            headers=headers,
            params={"page": page}
        )

        if not resp.ok:
            break

        data = resp.json()
        pacientes = data.get('data', [])
        processar_lista(pacientes)

    total = youth + adult + senior + unknown

    return jsonify({
        "youth": youth,
        "adult": adult,
        "senior": senior,
        "unknown": unknown,
        "total": total
    })


# 2. Rota para entregar arquivos estáticos (CSS, JS, Imagens)
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# 3. O PROXY (A Mágica acontece aqui)
# Captura qualquer coisa que comece com /api/ e repassa para o Ti Saúde
@app.route('/api/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy_api(endpoint):
    # Monta a URL real (ex: https://api.tisaude.com/api/patients)
    url = f"{TARGET_URL}/api/{endpoint}"
    
    print(f"🔄 [{request.method}] Proxy para: {url}")

    # Cabeçalhos de Segurança
    headers = {
        'Authorization': f'Bearer {SEU_TOKEN}',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }

    try:
        # Faz a requisição real usando a biblioteca 'requests' (muito mais estável)
        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=request.get_data(), # Pega o corpo do JSON (se for POST)
            params=request.args      # Pega os filtros da URL (se for busca)
        )
        
        # Filtra cabeçalhos problemáticos antes de devolver
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers_resp = [
            (k, v) for k, v in resp.raw.headers.items()
            if k.lower() not in excluded_headers
        ]

        # Devolve a resposta exata do Ti Saúde para o seu site
        return Response(resp.content, resp.status_code, headers_resp)

    except Exception as e:
        print(f"❌ Erro no Proxy: {e}")
        return jsonify({'error': 'Erro ao conectar com Ti Saúde', 'details': str(e)}), 500

if __name__ == '__main__':
    print(f"🚀 SERVIDOR PROFISSIONAL (FLASK) RODANDO EM: http://localhost:{PORT}")
    # debug=True faz o servidor reiniciar sozinho se você mexer no código (ótimo para dev)
    app.run(port=PORT, debug=True)