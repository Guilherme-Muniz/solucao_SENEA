from flask import Flask, request, jsonify, send_from_directory, Response, session, redirect, url_for, render_template_string
import requests
import os
from datetime import date
from dotenv import load_dotenv  # Importa a biblioteca que lê o .env

# === CARREGAR VARIÁVEIS DE AMBIENTE ===
load_dotenv()  # Lê o arquivo .env automaticamente

# === CONFIGURAÇÕES ===
app = Flask(__name__, static_folder='.')
PORT = 8081
TARGET_URL = "https://api.tisaude.com"

# --- CONFIGURAÇÃO DE SEGURANÇA (BUSCANDO DO .ENV) ---
# Se não encontrar no .env, usa um valor padrão inseguro (apenas para não quebrar em dev) ou None
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'chave_padrao_insegura')

# Credenciais lidas do ambiente
USUARIO_CORRETO = os.getenv('SENEA_USER')
SENHA_CORRETA = os.getenv('SENEA_PASS')
SEU_TOKEN = os.getenv('TISAUDE_TOKEN')

# Validação básica para garantir que as chaves existem
if not all([USUARIO_CORRETO, SENHA_CORRETA, SEU_TOKEN]):
    print("⚠️ ALERTA DE SEGURANÇA: Credenciais ou Token não encontrados no arquivo .env!")

# --- ROTAS DE LOGIN / LOGOUT ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    erro = None
    if request.method == 'POST':
        usuario = request.form.get('username')
        senha = request.form.get('password')
        
        # Compara com as variáveis carregadas do .env
        if usuario == USUARIO_CORRETO and senha == SENHA_CORRETA:
            session['logado'] = True
            return redirect(url_for('index'))
        else:
            erro = "Credenciais inválidas. Tente novamente."
    
    html_login = """
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Seguro - SENEA</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
            .login-box { background: white; padding: 2.5rem; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); width: 100%; max-width: 380px; }
            h2 { text-align: center; color: #333; margin-bottom: 1.5rem; }
            input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 600; }
            button:hover { background-color: #0056b3; }
            .erro { background-color: #ffebee; color: #c62828; padding: 10px; border-radius: 4px; margin-bottom: 15px; text-align: center; font-size: 0.9rem; border: 1px solid #ef9a9a; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Acesso Restrito</h2>
            {% if erro %}<div class="erro">{{ erro }}</div>{% endif %}
            <form method="post">
                <label>Usuário</label><input type="text" name="username" required autofocus>
                <label>Senha</label><input type="password" name="password" required>
                <button type="submit">Entrar no Sistema</button>
            </form>
        </div>
    </body>
    </html>
    """
    return render_template_string(html_login, erro=erro)

@app.route('/logout')
def logout():
    session.pop('logado', None)
    return redirect(url_for('login'))

# --- ROTAS ORIGINAIS (COM PROTEÇÃO) ---

@app.route('/')
def index():
    if not session.get('logado'):
        return redirect(url_for('login'))
    return send_from_directory('.', 'index.html')

@app.route('/api/stats/age-profile', methods=['GET'])
def age_profile():
    if not session.get('logado'):
        return jsonify({"error": "Unauthorized"}), 401

    hoje = date.today()
    youth = adult = senior = unknown = 0

    headers = {
        'Authorization': f'Bearer {SEU_TOKEN}',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }

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
            if nascimento and '/' in nascimento:
                try:
                    dia, mes, ano = nascimento.split('/')
                    nasc = date(int(ano), int(mes), int(dia))
                    idade = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
                    if idade < 20: youth += 1
                    elif idade < 60: adult += 1
                    else: senior += 1
                except Exception: unknown += 1
            else: unknown += 1

    processar_lista(pacientes)

    for page in range(2, last_page + 1):
        resp = requests.get(url, headers=headers, params={"page": page})
        if not resp.ok: break
        data = resp.json()
        processar_lista(data.get('data', []))

    return jsonify({"youth": youth, "adult": adult, "senior": senior, "unknown": unknown, "total": youth + adult + senior + unknown})

@app.route('/<path:filename>')
def serve_static(filename):
    if not session.get('logado') and filename != 'favicon.ico':
         if not (filename.endswith('.css') or filename.endswith('.js') or filename.endswith('.png')):
             return redirect(url_for('login'))
    return send_from_directory('.', filename)

@app.route('/api/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy_api(endpoint):
    if not session.get('logado'):
        return jsonify({"error": "Acesso negado. Faça login."}), 401

    url = f"{TARGET_URL}/api/{endpoint}"
    print(f"🔄 [{request.method}] Proxy para: {url}")

    headers = {
        'Authorization': f'Bearer {SEU_TOKEN}',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }

    try:
        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=request.get_data(),
            params=request.args
        )
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers_resp = [(k, v) for k, v in resp.raw.headers.items() if k.lower() not in excluded_headers]
        return Response(resp.content, resp.status_code, headers_resp)

    except Exception as e:
        print(f"❌ Erro no Proxy: {e}")
        return jsonify({'error': 'Erro ao conectar com Ti Saúde', 'details': str(e)}), 500

if __name__ == '__main__':
    print(f"🚀 SERVIDOR SEGURO RODANDO EM: http://localhost:{PORT}")
    app.run(port=PORT, debug=True)