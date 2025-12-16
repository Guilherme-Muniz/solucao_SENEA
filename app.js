// ============================================================
// CONFIGURAÇÃO
// ============================================================

// DEIXE VAZIO. Isso força o site a usar o proxy local.
const BASE_URL = ''; 

const API_SEARCH = `${BASE_URL}/api/patients?search=`;
const API_CREATE = `${BASE_URL}/api/patients/create`;

// ============================================================
// FUNÇÃO 1: BUSCAR PACIENTE (GET)
// ============================================================
async function buscarPaciente() {
    const termo = document.getElementById('buscaNome').value.trim();
    const feedback = document.getElementById('resultadoBusca');
    const btn = document.querySelector('.btn-search');

    if (!termo) { alert("Digite um nome!"); return; }

    feedback.innerHTML = "⏳ Consultando Ti Saúde...";
    feedback.style.color = "blue";
    btn.disabled = true;

    try {
        const response = await fetch(API_SEARCH + encodeURIComponent(termo), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const lista = await response.json();
            
            if (lista && lista.length > 0) {
                const p = lista[0];
                feedback.innerHTML = `✅ ENCONTRADO: <strong>${p.name}</strong>`;
                feedback.style.color = "green";
                
                // Preenche formulário
                document.getElementById('name').value = p.name || '';
                document.getElementById('email').value = p.email || '';
                document.getElementById('mother').value = p.mother || '';
                document.getElementById('cellphone').value = p.cellphone || '';
                document.getElementById('sex').value = p.sex || '';
                if(p.birthdate) document.getElementById('birthdate').value = p.birthdate.split('T')[0];
                
                alert(`Paciente ${p.name} encontrado na base oficial!`);
            } else {
                feedback.innerHTML = `⚠️ Não encontrado no Ti Saúde. Liberado para cadastro.`;
                feedback.style.color = "#d9534f";
                document.getElementById('prontuarioForm').reset();
                document.getElementById('name').value = termo;
            }
        } else {
            throw new Error(`Erro API: ${response.status}`);
        }
    } catch (erro) {
        console.error(erro);
        feedback.innerHTML = `❌ Erro de Conexão. Verifique o terminal.`;
        feedback.style.color = "red";
    } finally {
        btn.disabled = false;
    }
}

// ============================================================
// FUNÇÃO 2: SALVAR (POST)
// ============================================================
const form = document.getElementById('prontuarioForm');
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btnSave = document.querySelector('.btn-save');

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await response.json();

            if (response.ok) {
                alert(`SUCESSO REAL! Paciente cadastrado.\nID Ti Saúde: ${json.id || 'OK'}`);
                form.reset();
                document.getElementById('resultadoBusca').innerHTML = "";
            } else {
                alert(`Erro ao salvar: ${json.message || 'Verifique os dados'}`);
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com o servidor.");
        } finally {
            btnSave.innerText = "Salvar e Integrar";
            btnSave.disabled = false;
        }
    });
}

// IMC Automático
const pesoInput = document.getElementById('peso');
const alturaInput = document.getElementById('altura');
function calcIMC() {
    const p = parseFloat(pesoInput.value);
    const a = parseFloat(alturaInput.value);
    if(p && a) document.getElementById('imc').value = (p / (a*a)).toFixed(2);
}
if(pesoInput && alturaInput) {
    pesoInput.addEventListener('input', calcIMC);
    alturaInput.addEventListener('input', calcIMC);
}