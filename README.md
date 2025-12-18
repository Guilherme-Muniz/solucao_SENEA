# 🏥 Solução SENEA - Prontuário Digital Integrado

> Sistema de gestão de pacientes e prontuário eletrônico desenvolvido para a Clínica Escola de Nutrição (SENEA), com integração via API à plataforma Ti Saúde.

![Badge Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow) ![Badge Tech](https://img.shields.io/badge/Tech-HTML_|_CSS_|_JS_|_Python-blue)

## 📋 Sobre o Projeto

Este projeto visa otimizar o fluxo de atendimento na clínica escola, permitindo a busca, visualização e cadastro de pacientes de forma ágil. O sistema atua como uma interface moderna e responsiva, resolvendo problemas de inconsistência de dados (datas, gênero, formatação) vindos da base legada e oferecendo dashboards em tempo real.

### ✨ Principais Funcionalidades

* **Busca Inteligente (Deep Search):**
    * Realiza varredura na API por Nome ou CPF.
    * Busca automática da **ficha detalhada** (Endpoint `/patients/{id}`) para preencher dados sensíveis como Nome da Mãe, Histórico e Dados Clínicos.
* **Dashboard em Tempo Real:**
    * **Status da API:** Monitoramento de conectividade.
    * **Total na Base:** Contagem dinâmica de pacientes.
    * **Perfil Etário:** Gráfico automático que categoriza a base em Jovens, Adultos e Idosos.
* **Persistência de Sessão (Local Storage):**
    * Mantém a lista dos **5 últimos pacientes** visível mesmo após recarregar a página (F5).
* **Sanitização de Dados:**
    * Correção automática de datas (BR/ISO), Gênero e Máscaras de CPF.
    * Varredura profunda de objetos JSON.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
* **HTML5 & CSS3:** Layout responsivo e organizado.
* **JavaScript (Vanilla):** Lógica de negócios, `fetch` API e manipulação de DOM.

### Backend / Ferramentas
* **Python 3.x:** Proxy de requisições e scripts auxiliares.
* **Virtualenv:** Gerenciamento de ambiente isolado.
* **Git:** Versionamento de código.

---

## 📂 Estrutura do Projeto

```text
SOLUCAO_SENEA/
│
├── assets/                 # Recursos estáticos
│   ├── css/
│   │   └── style.css       # Estilos
│   └── js/
│       └── app.js          # Lógica Principal
│
├── venv/                   # Ambiente Virtual (ignorado pelo git)
├── index.html              # Ponto de entrada
├── proxy.py                # Servidor/Script Python
├── requirements.txt        # Dependências
└── README.md               # Documentação
```

---

## 🚀 Como Rodar o Projeto

Siga os passos abaixo para configurar e executar o ambiente localmente.

### 1. Pré-requisitos
Certifique-se de ter instalado:
* **Python 3.8** ou superior.
* **Git**.

### 2. Instalação

Clone o repositório e entre na pasta:
```bash
git clone https://github.com/seu-usuario/solucao-senea.git
cd SOLUCAO_SENEA
```

Crie o ambiente virtual (Recomendado):
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

Instale as dependências:
```bash
pip install -r requirements.txt
```

### 3. Executando a Aplicação

Para rodar o projeto utilizando o script Python (recomendado para evitar problemas de CORS e caminhos):

```bash
python proxy.py
```

Após rodar o comando, o terminal exibirá um endereço local (geralmente `http://127.0.0.1:5000` ou similar). Abra esse link no seu navegador.

---

## 🧠 Detalhes Técnicos

### Normalização de Dados
O sistema utiliza um **Adapter Pattern** no `app.js` (`normalizarPaciente`) para padronizar os dados vindos da API externa, que frequentemente variam de estrutura (objetos aninhados em `client` ou `data`).

### Estratégia de Cache
Para performance e UX, o sistema utiliza `localStorage` do navegador para persistir o histórico recente de atendimentos, evitando consultas repetitivas à API para pacientes recém-acessados.

---

## 📝 Licença

Este projeto foi desenvolvido para fins acadêmicos e profissionais vinculados à SENEA.