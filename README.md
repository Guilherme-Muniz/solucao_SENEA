# Projeto de Integração SENEA - Ti Saúde

> **Disciplina:** Integração e Evolução de Sistemas da Informação  

> **Alunos:** Guilherme Muniz (gmm9), João Lucas Tavares (jltf), Luiz gouveia (lfcg), Sofia Remides (srpo), Julia Andrade (jalgb), Jean Lucas (jlbd)

> **Instituição:** Centro de Informática (CIn) - UFPE  

## 📌 Visão Geral

Este projeto visa modernizar o fluxo de atendimento da **Clínica Escola de Nutrição (SENEA)**. Atualmente, a gestão de pacientes é feita através de planilhas Excel desconexas, gerando duplicidade de dados e riscos de perda de informação.

A solução desenvolvida é um **Front-end de Prontuário Eletrônico** que se comunica diretamente com a API oficial do sistema **Ti Saúde**, garantindo:
1.  **Fim da Duplicidade:** Busca na base oficial antes de cadastrar.
2.  **Segurança de Dados:** Armazenamento em nuvem (API) em vez de arquivos locais.
3.  **Agilidade:** Preenchimento automático de dados cadastrais.

## 🛠️ Arquitetura da Solução

Para viabilizar a integração entre o ambiente local (desenvolvimento) e a API de produção do Ti Saúde, foi implementada uma arquitetura com **Middleware (Proxy)**.

### O Desafio Técnico (CORS & Autenticação)
Os navegadores bloqueiam requisições diretas de `localhost` para APIs externas (`api.tisaude.com`) devido à política de segurança **CORS**. Além disso, a API exige um **Bearer Token** em todas as chamadas.

### A Solução (Python Proxy)
Foi desenvolvido um servidor intermediário em **Python** (`proxy.py`) que atua como um *Gateway*:
1.  O Front-end solicita dados ao `localhost:8081`.
2.  O Python intercepta, injeta o **Token de Segurança** e repassa a requisição ao Ti Saúde.
3.  O Python recebe a resposta e devolve ao Front-end adicionando os cabeçalhos de permissão CORS (`Access-Control-Allow-Origin`).

```mermaid
Front-end (JS)  <-->  Proxy Local (Python)  <-->  API Ti Saúde (Nuvem)
   [Porta 8081]       [Injeta Token/CORS]          [Banco de Dados]
```


### 🚀 Funcionalidades

    Busca Inteligente (GET): Permite pesquisar pacientes por nome na base do Ti Saúde.

    Auto-Preenchimento: Se o paciente existe, o formulário é populado automaticamente.

    Cadastro de Pacientes (POST): Envia novos pacientes diretamente para o banco de dados do sistema legado.

    Cálculo de IMC: Lógica client-side para feedback imediato do estado nutricional.

### 📂 Estrutura de Arquivos

    index.html: Interface do usuário (Formulários de Identificação e Antropometria).

    style.css: Estilização seguindo a identidade visual clínica (Clean UI).

    app.js: Lógica de controle, validação de formulário e comunicação assíncrona (fetch).

    proxy.py: Servidor de aplicação Python responsável pela autenticação e tunelamento HTTP.

## 🔧 Como Rodar o Projeto
Pré-requisitos

    Python 3.x instalado.

    Navegador Web (Chrome/Firefox).

Passo a Passo

    Clone ou baixe este repositório.

    Abra o terminal na pasta do projeto.

    Execute o servidor Proxy:
    Bash

    python3 proxy.py

    Aguarde a mensagem: "🚀 SERVIDOR PRONTO! Acesse: http://localhost:8081"

    Abra seu navegador e acesse:

        http://localhost:8081

    Teste a Integração:

        Digite um nome na busca e clique em "Pesquisar".

        Verifique no terminal os logs de sucesso (✅ SUCESSO! Ti Saúde respondeu: 200).

## 🔐 Configuração de Token

O token de acesso está configurado diretamente no arquivo proxy.py na variável SEU_TOKEN.