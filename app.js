// ============================================================
// CONFIGURAÇÃO DA API
// ============================================================

// URL Real do Ti Saúde (sem a barra no final)
const BASE_URL = 'https://api.tisaude.com'; 

// Endpoints
const API_SEARCH = `${BASE_URL}/api/patients?search=`;
const API_CREATE = `${BASE_URL}/api/patients/create`;

// ============================================================
// FUNÇÃO 1: BUSCAR PACIENTE (GET)
// ============================================================
async function buscarPaciente() {
    // Pega o valor digitado
    const termo = document.getElementById('buscaNome').value.trim();
    const feedback = document.getElementById('resultadoBusca');
    const btn = document.querySelector('.btn-search');

    // Validação básica
    if (!termo) { 
        alert("Por favor, digite um nome para buscar!"); 
        return; 
    }

    // Feedback visual
    feedback.innerHTML = "⏳ Consultando Ti Saúde...";
    feedback.style.color = "blue";
    btn.disabled = true;
    btn.innerText = "Buscando...";

    console.log(`Iniciando busca em: ${API_SEARCH}${termo}`);

    try {
        const response = await fetch(API_SEARCH + encodeURIComponent(termo), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const listaPacientes = await response.json();
            
            if (listaPacientes && listaPacientes.length > 0) {
                // SUCESSO: Paciente encontrado
                const p = listaPacientes[0];
                feedback.innerHTML = `✅ ENCONTRADO: <strong>${p.name}</strong>`;
                feedback.style.color = "green";
                
                // Preenche os campos automaticamente
                document.getElementById('name').value = p.name || '';
                document.getElementById('email').value = p.email || '';
                document.getElementById('mother').value = p.mother || '';
                document.getElementById('cellphone').value = p.cellphone || '';
                document.getElementById('sex').value = p.sex || '';
                
                // Tenta formatar a data se existir
                if(p.birthdate) {
                    try { document.getElementById('birthdate').value = p.birthdate.split('T')[0]; } 
                    catch(e) {}
                }
                
                alert(`Paciente ${p.name} encontrado na base!`);
            } else {
                // SUCESSO: Lista vazia (Paciente não existe)
                feedback.innerHTML = `⚠️ Paciente não encontrado. Preencha os dados abaixo para cadastrar.`;
                feedback.style.color = "#d9534f"; // Vermelho
                
                // Limpa formulário para cadastro novo
                document.getElementById('prontuarioForm').reset();
                document.getElementById('name').value = termo; // Mantém o nome digitado
            }
        } else {
            throw new Error(`Erro do Servidor: ${response.status}`);
        }

    } catch (erro) {
        console.error("Erro detalhado:", erro);
        feedback.innerHTML = `❌ Erro de Conexão.`;
        feedback.style.color = "red";
        
        // Mensagem de ajuda específica para o seu caso
        alert("ERRO DE CONEXÃO!\n\nSe você está vendo isso, provavelmente é bloqueio de CORS.\n\nSOLUÇÃO: Ative a extensão 'Allow CORS' no seu navegador e tente de novo.");
    } finally {
        // Restaura o botão
        btn.disabled = false;
        btn.innerText = "Pesquisar";
    }
}

// ============================================================
// FUNÇÃO 2: SALVAR / CRIAR (POST)
// ============================================================
const form = document.getElementById('prontuarioForm');

// Verifica se o formulário existe antes de adicionar o evento
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); // Impede recarregamento da página
        const btnSave = document.querySelector('.btn-save');

        // Prepara os dados (JSON)
        const payload = {
            name: document.getElementById('name').value,
            birthdate: document.getElementById('birthdate').value,
            sex: document.getElementById('sex').value,
            mother: document.getElementById('mother').value,
            email: document.getElementById('email').value,
            cellphone: document.getElementById('cellphone').value,
            status: "active"
        };

        btnSave.innerText = "Enviando...";
        btnSave.disabled = true;

        try {
            const response = await fetch(API_CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const respostaJson = await response.json();

            if (response.ok) {
                alert(`SUCESSO!\nPaciente cadastrado com ID: ${respostaJson.id || 'OK'}`);
                
                // Limpa a tela após sucesso
                form.reset();
                document.getElementById('resultadoBusca').innerHTML = "";
            } else {
                alert(`Erro ao salvar: ${respostaJson.message || 'Verifique os dados'}`);
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao enviar dados. Verifique a conexão.");
        } finally {
            btnSave.innerText = "Salvar e Integrar";
            btnSave.disabled = false;
        }
    });
}

// ============================================================
// FUNÇÃO EXTRA: CÁLCULO DE IMC
// ============================================================
const pesoInput = document.getElementById('peso');
const alturaInput = document.getElementById('altura');

function calcIMC() {
    const p = parseFloat(pesoInput.value);
    const a = parseFloat(alturaInput.value);
    if(p && a) {
        const imc = p / (a * a);
        document.getElementById('imc').value = imc.toFixed(2);
    }
}

if(pesoInput && alturaInput) {
    pesoInput.addEventListener('input', calcIMC);
    alturaInput.addEventListener('input', calcIMC);
}