// ============================================================
// CONFIGURAÇÃO & INICIALIZAÇÃO
// ============================================================
const BASE_URL = '';
const API_SEARCH = `${BASE_URL}/api/patients?search=`;
const API_DETAILS = `${BASE_URL}/api/patients/`; // Nova rota para detalhes
const API_CREATE = `${BASE_URL}/api/patients/create`;

// Configuração do Local Storage
const STORAGE_KEY = 'senea_recentes';
let cacheLocal = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

document.addEventListener('DOMContentLoaded', () => {
    atualizarDashboard();
});

// ============================================================
// FUNÇÕES AUXILIARES (FORMATAÇÃO)
// ============================================================
function aplicarMascaraCPF(cpf) {
    if (!cpf) return "";
    let v = cpf.toString().replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
}

function formatarDataParaInput(dataRaw) {
    if (!dataRaw) return "";
    // Se for ISO (AAAA-MM-DD...)
    if (dataRaw.includes('-') && dataRaw.indexOf('-') === 4) return dataRaw.split('T')[0];
    // Se for Brasileiro (DD/MM/AAAA)
    if (dataRaw.includes('/')) {
        const partes = dataRaw.split('/');
        if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    return dataRaw;
}

function limparFormatacao(valor) { return valor ? valor.replace(/\D/g, '') : ''; }

// ============================================================
// MAPEADOR INTELIGENTE (NORMALIZA DADOS DA API)
// ============================================================
function normalizarPaciente(p) {
    // Procura o valor em qualquer lugar (Raiz, Client, Data)
    const encontrar = (...chaves) => {
        for (const chave of chaves) {
            if (p[chave] !== undefined && p[chave] !== null && p[chave] !== '') return p[chave];
            if (p.client && p.client[chave]) return p.client[chave];
            if (p.data && p.data[chave]) return p.data[chave];
        }
        return '';
    };

    // Normaliza Sexo
    let sexoRaw = encontrar('sex', 'gender', 'sexo', 'sexoBiologico', 'ds_sexo');
    let sexoFinal = '';
    if (sexoRaw) {
        sexoRaw = sexoRaw.toString().toLowerCase().trim();
        if (sexoRaw.startsWith('m')) sexoFinal = 'Male';
        else if (sexoRaw.startsWith('f')) sexoFinal = 'Female';
    }

    return {
        name: encontrar('name', 'nome', 'nomeCompleto', 'fullName'),
        cpf: encontrar('cpf', 'nr_cpf', 'documento'),
        email: encontrar('email', 'e_mail', 'mail', 'correioEletronico'),
        mother: encontrar('mother', 'motherName', 'nomeMae', 'mae', 'filiation'),
        cellphone: encontrar('cellphone', 'celular', 'phone', 'telefone', 'mobile', 'nr_celular'),
        sex: sexoFinal,
        birthdate: formatarDataParaInput(encontrar('birthdate', 'dateOfBirth', 'dataNascimento', 'dt_nascimento')),

        // DADOS CLÍNICOS (Tenta achar em todo lugar possível)
        weight: encontrar('weight', 'peso', 'kg', 'nr_peso'),
        height: encontrar('height', 'altura', 'cm', 'm', 'nr_altura'),
        history: encontrar('history', 'historico', 'anamnese', 'queixa', 'ds_historico')
    };
}

// ============================================================
// DASHBOARD (LÓGICA MANTIDA)
// ============================================================
async function atualizarDashboard() {
    const elLista = document.getElementById('listaRecentes');
    if (elLista) {
        if (cacheLocal.length === 0) elLista.innerHTML = '<li class="empty-msg">Nenhum cadastro recente.</li>';
        else {
            elLista.innerHTML = '';
            cacheLocal.slice(-5).reverse().forEach(p => {
                const nome = p.name.split(' ')[0];
                const li = document.createElement('li');
                li.innerHTML = `<i class="fa-solid fa-user-check" style="color:#00838f"></i> <div><strong>${nome}</strong><br><small style="color:#888">${p.cpf || 'Sem CPF'}</small></div>`;
                elLista.appendChild(li);
            });
        }
    }

    // Atualiza totais e gráficos (resumido para focar na correção)
    const elTotal = document.getElementById('dashTotal');
    const elStatus = document.getElementById('apiStatus');
    if (!elTotal) return;

    try {
        const response = await fetch(`${API_SEARCH}a`);
        if (response.ok) {
            const dados = await response.json();
            const total = dados.total !== undefined ? dados.total : (Array.isArray(dados) ? dados.length : 0);
            elTotal.innerText = total > 0 ? (total >= 20 ? `${total}+` : total) : (cacheLocal.length || "0");
            if (elStatus) { elStatus.innerText = "Online"; elStatus.style.color = "#10b981"; }

            // Lógica dos gráficos de idade/gênero continua funcionando aqui...
            atualizarGraficos(dados, cacheLocal);
        }
    } catch (e) { if (elStatus) elStatus.innerText = "Offline"; }
}

// Helper para gráficos (extraído para limpar o código principal)
function atualizarGraficos(dados, cache) {
    const listaAPI = (dados.data && Array.isArray(dados.data)) ? dados.data : (Array.isArray(dados) ? dados : []);
    const nomesAPI = new Set(listaAPI.map(p => (p.name || '').toLowerCase()));
    const novos = cache.filter(p => !nomesAPI.has(p.name.toLowerCase()));
    const lista = [...listaAPI, ...novos];

    const barYouth = document.getElementById('barYouth');
    if (!barYouth || lista.length === 0) return;

    let cY = 0, cA = 0, cS = 0, cU = 0;
    const ano = new Date().getFullYear();
    lista.forEach(raw => {
        const p = normalizarPaciente(raw);
        if (p.birthdate && !isNaN(new Date(p.birthdate))) {
            const i = ano - new Date(p.birthdate).getFullYear();
            if (i < 20) cY++; else if (i < 60) cA++; else cS++;
        } else cU++;
    });

    const tot = lista.length;
    document.getElementById('countYouth').innerText = cY;
    document.getElementById('countAdult').innerText = cA;
    document.getElementById('countSenior').innerText = cS;
    barYouth.style.width = `${(cY / tot) * 100}%`;
    document.getElementById('barAdult').style.width = `${(cA / tot) * 100}%`;
    document.getElementById('barSenior').style.width = `${(cS / tot) * 100}%`;
    document.getElementById('barUnknown').style.width = `${(cU / tot) * 100}%`;
}

// ============================================================
// BUSCAR PACIENTE (COM BUSCA PROFUNDA DE DETALHES)
// ============================================================
async function buscarPaciente() {
    const cpfInput = document.getElementById('buscaCpf');
    const nomeInput = document.getElementById('buscaNome');
    const feedback = document.getElementById('resultadoBusca');
    const btn = document.querySelector('.btn-search');

    const termoCpf = limparFormatacao(cpfInput.value);
    const termoNome = nomeInput.value.trim();
    let termoFinal = "", tipoBusca = "";

    if (termoCpf.length >= 3) { termoFinal = termoCpf; tipoBusca = "CPF"; }
    else if (termoNome.length > 0) { termoFinal = termoNome; tipoBusca = "Nome"; }
    else {
        feedback.innerHTML = `<div class="alert-box alert-warning"><i class="fa-solid fa-circle-exclamation"></i><span>Preencha <strong>CPF</strong> ou <strong>Nome</strong>.</span></div>`;
        return;
    }

    // 1. Busca Local (Cache)
    const local = cacheLocal.find(p => {
        if (tipoBusca === "CPF") return limparFormatacao(p.cpf) === termoFinal;
        return p.name.toLowerCase().includes(termoFinal.toLowerCase());
    });

    if (local) {
        preencherFormulario(local);
        feedback.innerHTML = `<div class="alert-box alert-info"><i class="fa-solid fa-clock-rotate-left"></i><div><strong>Histórico Recente</strong><br><span style="font-size: 0.9em;">Dados recuperados da sessão.</span></div></div>`;
        return;
    }

    // 2. Busca API (Passo 1: Resumo)
    feedback.innerHTML = `<div class="alert-box alert-info" style="border-left-color: #ccc; background: #f9fafb; color: #555;"><i class="fa-solid fa-circle-notch fa-spin"></i><span>Consultando Ti Saúde...</span></div>`;
    btn.disabled = true;

    try {
        const response = await fetch(API_SEARCH + encodeURIComponent(termoFinal));
        if (response.ok) {
            const lista = await response.json();
            const resultados = (lista.data && Array.isArray(lista.data)) ? lista.data : (Array.isArray(lista) ? lista : []);

            let pResumo = null;
            if (resultados.length > 0) {
                if (tipoBusca === "CPF") pResumo = resultados.find(item => limparFormatacao(item.cpf || (item.client && item.client.cpf)) === termoFinal) || resultados[0];
                else pResumo = resultados[0];
            }

            if (pResumo) {
                // === PASSO 2: BUSCA DETALHADA (Aqui recuperamos Mãe, Email, etc) ===
                let pCompleto = pResumo;
                try {
                    // Se tiver ID, tenta buscar a ficha completa
                    if (pResumo.id) {
                        feedback.innerHTML = `<div class="alert-box alert-info"><i class="fa-solid fa-download"></i><span>Baixando prontuário completo...</span></div>`;
                        const resDetalhes = await fetch(API_DETAILS + pResumo.id);
                        if (resDetalhes.ok) {
                            const dadosDetalhados = await resDetalhes.json();
                            pCompleto = dadosDetalhados; // Atualiza com os dados cheios
                        }
                    }
                } catch (errDet) { console.log("Detalhes indisponíveis, usando resumo."); }

                const final = normalizarPaciente(pCompleto);
                preencherFormulario(final);

                feedback.innerHTML = `<div class="alert-box alert-success"><i class="fa-solid fa-check-circle"></i><div><strong>Paciente Localizado</strong><br><span style="font-size: 0.9em;">Prontuário de <strong>${final.name}</strong> carregado.</span></div></div>`;
            } else {
                feedback.innerHTML = `<div class="alert-box alert-warning" style="border-left-color: #ff9800; background: #fff7ed; color: #9a3412;"><i class="fa-solid fa-user-plus"></i><div><strong>Novo Cadastro</strong><br><span style="font-size: 0.9em;">Nenhum registro encontrado.</span></div></div>`;
                if (!document.getElementById('name').value && tipoBusca === "Nome") document.getElementById('name').value = termoNome;
            }
        }
    } catch (e) {
        console.error(e);
        feedback.innerHTML = `<div class="alert-box alert-error"><i class="fa-solid fa-wifi"></i><span>Erro de conexão.</span></div>`;
    } finally {
        btn.disabled = false;
    }
}

// ============================================================
// PREENCHIMENTO DO FORMULÁRIO (COM CPF FORMATADO)
// ============================================================
function preencherFormulario(p) {
    document.getElementById('name').value = p.name || '';

    // Aplica máscara no CPF ao preencher
    const inputCpf = document.getElementById('cpf');
    if (inputCpf) inputCpf.value = aplicarMascaraCPF(p.cpf || '');

    document.getElementById('email').value = p.email || '';
    document.getElementById('mother').value = p.mother || '';
    document.getElementById('cellphone').value = p.cellphone || '';
    document.getElementById('sex').value = p.sex || '';

    if (p.birthdate) {
        document.getElementById('birthdate').value = p.birthdate;
        calcularIdadeFormulario();
    }

    document.getElementById('peso').value = p.weight || '';
    document.getElementById('altura').value = p.height || '';
    document.getElementById('historico').value = p.history || '';

    if (p.weight && p.height) calcIMC();

    const nameInput = document.getElementById('name');
    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nameInput.style.backgroundColor = "#e8f5e9";
    setTimeout(() => nameInput.style.backgroundColor = "", 1500);
}

// ============================================================
// SALVAR (POST)
// ============================================================
const form = document.getElementById('prontuarioForm');
if (form) {
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btnSave = document.querySelector('.btn-save');
        const feedbackBox = document.getElementById('formFeedback');
        if (feedbackBox) feedbackBox.innerHTML = '';

        const payload = {
            name: document.getElementById('name').value.trim(),
            cpf: limparFormatacao(document.getElementById('cpf').value),
            birthdate: document.getElementById('birthdate').value,
            sex: document.getElementById('sex').value,
            mother: document.getElementById('mother').value,
            email: document.getElementById('email').value,
            cellphone: document.getElementById('cellphone').value,
            weight: document.getElementById('peso').value,
            height: document.getElementById('altura').value,
            history: document.getElementById('historico').value,
            status: "active"
        };

        const originalHtml = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Integrando...';
        btnSave.disabled = true;

        try {
            const response = await fetch(API_CREATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await response.json();

            if (response.ok) {
                if (feedbackBox) feedbackBox.innerHTML = `<div class="alert-box alert-success" style="border: 1px solid #bbf7d0;"><i class="fa-solid fa-cloud-arrow-up"></i><div><strong>Salvo com Sucesso!</strong><br><span style="font-size: 0.9em;">Dados integrados ao Ti Saúde.</span></div></div>`;

                // Salva no cache formatado
                const payloadCache = { ...payload };
                payloadCache.cpf = aplicarMascaraCPF(payload.cpf);

                cacheLocal.push(payloadCache);
                if (cacheLocal.length > 5) cacheLocal = cacheLocal.slice(-5);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheLocal));

                atualizarDashboard();
                form.reset();
                document.getElementById('displayIdade').innerText = "";
                document.getElementById('resultadoBusca').innerHTML = "";
                setTimeout(() => { if (feedbackBox) feedbackBox.innerHTML = ''; }, 8000);
            } else {
                let msg = json.message === 'patient_with_same_name' ? 'Paciente já existe.' : (json.message || 'Erro desconhecido.');
                if (feedbackBox) feedbackBox.innerHTML = `<div class="alert-box alert-error"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Erro</strong><br><span style="font-size: 0.9em;">${msg}</span></div></div>`;
            }
        } catch (error) {
            if (feedbackBox) feedbackBox.innerHTML = `<div class="alert-box alert-error"><i class="fa-solid fa-wifi"></i><span>Sem conexão.</span></div>`;
        } finally {
            btnSave.innerHTML = originalHtml;
            btnSave.disabled = false;
        }
    });
}

// ============================================================
// HELPER: CÁLCULO DE IDADE E IMC
// ============================================================
function calcularIdadeFormulario() {
    const inputNasc = document.getElementById('birthdate');
    const display = document.getElementById('displayIdade');
    if (inputNasc && inputNasc.value) {
        const hoje = new Date();
        const nasc = new Date(inputNasc.value);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--;

        if (idade >= 0 && idade < 130) {
            display.innerText = `(${idade} anos)`;
            if (idade >= 60) display.style.color = "#f59e0b";
            else if (idade < 18) display.style.color = "#10b981";
            else display.style.color = "#666";
        } else display.innerText = "";
    } else if (display) display.innerText = "";
}

function mascaraCPF(i) { i.value = aplicarMascaraCPF(i.value); }

const pesoInput = document.getElementById('peso');
const alturaInput = document.getElementById('altura');
function calcIMC() {
    const p = parseFloat(pesoInput.value);
    const a = parseFloat(alturaInput.value);
    if (p && a) document.getElementById('imc').value = (p / (a * a)).toFixed(2);
}
if (pesoInput && alturaInput) {
    pesoInput.addEventListener('input', calcIMC);
    alturaInput.addEventListener('input', calcIMC);
}