// ============================================================
// CONFIGURAÇÃO
// ============================================================
const BASE_URL = ''; 
const API_SEARCH = `${BASE_URL}/api/patients?search=`;
const API_CREATE = `${BASE_URL}/api/patients/create`;

let cacheLocal = [];

// ============================================================
// UTILITÁRIOS: MÁSCARA CPF
// ============================================================
function mascaraCPF(i) {
    let v = i.value;
    if(isNaN(v[v.length-1])){ // impede entrar outro caractere que não seja número
       i.value = v.substring(0, v.length-1);
       return;
    }
    i.setAttribute("maxlength", "14");
    v = v.replace(/\D/g, ""); // Remove tudo o que não é dígito
    v = v.replace(/(\d{3})(\d)/, "$1.$2"); // Coloca um ponto entre o terceiro e o quarto dígitos
    v = v.replace(/(\d{3})(\d)/, "$1.$2"); // Coloca um ponto entre o terceiro e o quarto dígitos
    //de novo (para o segundo bloco de números)
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // Coloca um hífen entre o terceiro e o quarto dígitos
    i.value = v;
}

// Remove formatação para enviar limpo (apenas números)
function limparFormatacao(valor) {
    return valor ? valor.replace(/\D/g, '') : '';
}

// ============================================================
// FUNÇÃO 1: BUSCAR PACIENTE (HÍBRIDA CPF/NOME)
// ============================================================
async function buscarPaciente() {
    const cpfInput = document.getElementById('buscaCpf');
    const nomeInput = document.getElementById('buscaNome');
    const feedback = document.getElementById('resultadoBusca');
    const btn = document.querySelector('.btn-search');

    const termoCpf = limparFormatacao(cpfInput.value);
    const termoNome = nomeInput.value.trim();

    // LÓGICA DE PRIORIDADE:
    // Se tem CPF, busca pelo CPF. Se não, busca pelo Nome.
    let termoFinal = "";
    let tipoBusca = "";

    if (termoCpf.length >= 3) { 
        termoFinal = termoCpf;
        tipoBusca = "CPF";
    } else if (termoNome.length > 0) {
        termoFinal = termoNome;
        tipoBusca = "Nome";
    } else {
        feedback.innerHTML = `<div class="alert-box alert-error"><i class="fa-solid fa-circle-exclamation"></i> Digite o CPF ou o Nome para pesquisar.</div>`;
        return;
    }

    // 1. Verifica Cache Local
    // Verifica se temos esse paciente no cache (pelo CPF ou Nome)
    const encontradoLocal = cacheLocal.find(p => {
        if(tipoBusca === "CPF") return limparFormatacao(p.cpf) === termoFinal;
        return p.name.toLowerCase().includes(termoFinal.toLowerCase());
    });

    if (encontradoLocal) {
        preencherFormulario(encontradoLocal);
        feedback.innerHTML = `<div class="alert-box alert-success"><i class="fa-solid fa-clock-rotate-left"></i> Encontrado no Cache (${tipoBusca}): <strong>${encontradoLocal.name}</strong></div>`;
        return;
    }

    // 2. Busca API
    feedback.innerHTML = `<div class="alert-box alert-info"><i class="fa-solid fa-circle-notch fa-spin"></i> Buscando por ${tipoBusca}...</div>`;
    btn.disabled = true;

    try {
        // Envia o termo (seja CPF ou Nome) para a mesma rota de busca
        const response = await fetch(API_SEARCH + encodeURIComponent(termoFinal));
        
        if (response.ok) {
            const lista = await response.json();
            
            // Filtro de precisão no Front-end (caso a API retorne busca ampla)
            let p = null;
            if (lista && lista.length > 0) {
                if(tipoBusca === "CPF") {
                    // Tenta achar o CPF exato na lista retornada
                    p = lista.find(item => limparFormatacao(item.cpf) === termoFinal) || lista[0]; 
                } else {
                    p = lista[0];
                }
            }

            if (p) {
                preencherFormulario(p);
                feedback.innerHTML = `<div class="alert-box alert-success"><i class="fa-solid fa-check-circle"></i> Paciente encontrado: <strong>${p.name}</strong></div>`;
            } else {
                feedback.innerHTML = `<div class="alert-box alert-info"><i class="fa-solid fa-user-plus"></i> Nada encontrado. Prossiga com o cadastro.</div>`;
                
                // Pré-preenche o formulário se a busca falhou
                if(!document.getElementById('name').value) {
                    document.getElementById('prontuarioForm').reset();
                    // Se buscou por nome, preenche o nome. Se CPF, preenche CPF.
                    if(tipoBusca === "Nome") document.getElementById('name').value = termoNome;
                    if(tipoBusca === "CPF") {
                        document.getElementById('cpf').value = cpfInput.value; // Mantém a máscara visual
                        // Tenta dar foco no campo nome para o usuário digitar
                        setTimeout(() => document.getElementById('name').focus(), 100);
                    }
                }
            }
        } else {
            throw new Error(`Erro API: ${response.status}`);
        }
    } catch (erro) {
        console.error(erro);
        feedback.innerHTML = `<div class="alert-box alert-error"><i class="fa-solid fa-triangle-exclamation"></i> Erro de Conexão.</div>`;
    } finally {
        btn.disabled = false;
    }
}

function preencherFormulario(p) {
    document.getElementById('name').value = p.name || '';
    document.getElementById('cpf').value = p.cpf || ''; // Agora preenche o CPF também
    document.getElementById('email').value = p.email || '';
    document.getElementById('mother').value = p.mother || '';
    document.getElementById('cellphone').value = p.cellphone || '';
    document.getElementById('sex').value = p.sex || '';
    if(p.birthdate) document.getElementById('birthdate').value = p.birthdate.split('T')[0];
    
    // Animação visual nos campos principais
    const campos = ['name', 'cpf'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.style.backgroundColor = "#e8f5e9";
            setTimeout(() => el.style.backgroundColor = "", 1000);
        }
    });
}

// ============================================================
// FUNÇÃO 2: SALVAR (POST) - AGORA COM CPF
// ============================================================
const form = document.getElementById('prontuarioForm');
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btnSave = document.querySelector('.btn-save');
        const feedbackBox = document.getElementById('formFeedback'); 
        if(feedbackBox) feedbackBox.innerHTML = '';

        const payload = {
            name: document.getElementById('name').value.trim(),
            cpf: limparFormatacao(document.getElementById('cpf').value), // Envia apenas números
            birthdate: document.getElementById('birthdate').value,
            sex: document.getElementById('sex').value,
            mother: document.getElementById('mother').value,
            email: document.getElementById('email').value,
            cellphone: document.getElementById('cellphone').value,
            status: "active"
        };

        btnSave.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Enviando...';
        btnSave.disabled = true;

        try {
            const response = await fetch(API_CREATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await response.json();

            if (response.ok) {
                if(feedbackBox) feedbackBox.innerHTML = `
                    <div class="alert-box alert-success">
                        <i class="fa-solid fa-check-circle"></i> 
                        Sucesso! Cadastro realizado (ID: ${json.id || 'OK'}).
                    </div>`;
                
                // Adiciona o CPF digitado ao objeto antes de salvar no cache
                // para que a busca local funcione logo em seguida
                payload.cpf = document.getElementById('cpf').value; // Salva com formatação no cache pra facilitar
                cacheLocal.push(payload);
                
                form.reset();
                document.getElementById('resultadoBusca').innerHTML = ""; 
            } else {
                let msgErro = 'Erro desconhecido ao salvar.';
                let dica = '';

                if(json.message === 'patient_with_same_name') {
                    msgErro = '<b>Duplicidade:</b> Já existe um paciente com este Nome ou CPF na base.';
                    dica = '<br><span>💡 Verifique se o CPF já foi cadastrado ou adicione um diferencial ao nome (Ex: Junior, Filho).</span>';
                } else if (json.message) {
                    msgErro = json.message;
                }

                if(feedbackBox) feedbackBox.innerHTML = `
                    <div class="alert-box alert-error" style="flex-direction: column; align-items: flex-start;">
                        <div><i class="fa-solid fa-triangle-exclamation"></i> ${msgErro}</div>
                        ${dica}
                    </div>`;
            }

        } catch (error) {
            console.error(error);
            if(feedbackBox) feedbackBox.innerHTML = `
                <div class="alert-box alert-error">
                    <i class="fa-solid fa-plug-circle-xmark"></i> 
                    Erro de conexão.
                </div>`;
        } finally {
            btnSave.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Salvar e Integrar';
            btnSave.disabled = false;
        }
    });
}

// ============================================================
// VERIFICAÇÃO AUTOMÁTICA (AGORA CONSIDERA CPF)
// ============================================================
const inputNome = document.getElementById('name');
const inputCpf = document.getElementById('cpf');

// Função genérica de checagem
async function checarDuplicidade() {
    const nome = document.getElementById('name').value.trim();
    const cpf = limparFormatacao(document.getElementById('cpf').value);
    const feedbackBox = document.getElementById('formFeedback');

    // Só checa se tiver info suficiente
    if (nome.length < 3 && cpf.length < 11) return;

    // Define qual termo usar para consultar a API (prefere CPF)
    const termoConsulta = (cpf.length >= 11) ? cpf : nome;

    try {
        const response = await fetch(API_SEARCH + encodeURIComponent(termoConsulta));
        if (response.ok) {
            const lista = await response.json();
            
            // Verifica duplicidade exata
            const duplicado = lista.find(p => {
                const mesmoCPF = p.cpf && limparFormatacao(p.cpf) === cpf;
                const mesmoNome = p.name.trim().toLowerCase() === nome.toLowerCase();
                return mesmoCPF || mesmoNome;
            });

            if (duplicado) {
                if(feedbackBox) {
                    feedbackBox.innerHTML = `
                    <div class="alert-box alert-error" style="border-left: 5px solid #d32f2f;">
                        <div>
                            <strong><i class="fa-solid fa-hand"></i> Atenção!</strong><br>
                            O paciente "<strong>${duplicado.name}</strong>" já consta na base.<br>
                            <a href="#" onclick="preencherFormulario({name:'${duplicado.name}', cpf:'${duplicado.cpf||''}', email:'${duplicado.email||''}', mother:'${duplicado.mother||''}', cellphone:'${duplicado.cellphone||''}', sex:'${duplicado.sex||''}', birthdate:'${duplicado.birthdate||''}'}); return false;" style="color: #b71c1c; font-weight: bold;">Carregar dados existentes</a>
                        </div>
                    </div>`;
                }
            } else {
                // Limpa aviso se não houver conflito E não houver erro de post na tela
                if(feedbackBox && !feedbackBox.innerHTML.includes('Duplicidade')) {
                    feedbackBox.innerHTML = '';
                }
            }
        }
    } catch (e) { console.log("Erro check:", e); }
}

// Adiciona os ouvintes nos campos
if(inputNome) inputNome.addEventListener('blur', checarDuplicidade);
if(inputCpf) inputCpf.addEventListener('blur', checarDuplicidade);

// IMC
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