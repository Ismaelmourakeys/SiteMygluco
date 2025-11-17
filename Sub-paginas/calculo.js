// Remove preload class after load
window.addEventListener('load', () => document.documentElement.classList.remove('preload'));

// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
  apiKey: "AIzaSyANqckgjqZxDE8-7HOdlrT8c8zRqM0teUE",
  authDomain: "mygluco-80306.firebaseapp.com",
  projectId: "mygluco-80306",
  storageBucket: "mygluco-80306.appspot.com",
  messagingSenderId: "947177446073",
  appId: "1:947177446073:web:486a6fe53b4ebc9b891968"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let graficoInstance = null;

// ========= HELPERS =========
const $ = id => document.getElementById(id);
const exists = el => el !== null && el !== undefined;

// ========= PREENCHER SELECTS =========
function preencherSelects() {
  if (exists($('sexo'))) {
    $('sexo').innerHTML = '<option value="masculino">Masculino</option><option value="feminino">Feminino</option>';
  }
  if (exists($('atividade'))) {
    $('atividade').innerHTML = `
        <option value="1.2">Sedentário</option>
        <option value="1.375">Leve (1-3x/semana)</option>
        <option value="1.55">Moderado (3-5x/semana)</option>
        <option value="1.725">Intenso (6-7x/semana)</option>
        <option value="1.9">Muito intenso (2 treinos/dia)</option>
      `;
  }
  if (exists($('tipoDiabetes'))) {
    $('tipoDiabetes').innerHTML = `
        <option value="nenhum">Nenhum</option>
        <option value="tipo1">Tipo 1</option>
        <option value="tipo2">Tipo 2</option>
        <option value="gestacional">Gestacional</option>
      `;
  }
  if (exists($('meta'))) {
    $('meta').innerHTML = `
        <option value="manter">Manter peso</option>
        <option value="perder">Perder peso</option>
        <option value="ganhar">Ganhar peso</option>
      `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  preencherSelects();
  restoreTheme();
  // initial loads
  mostrarHistorico();
  mostrarGrafico();
});

// ========= SALVAR NO FIRESTORE =========
function salvarResultado(tmb, caloriasTotais, gramasCarbo) {
  const sexo = $('sexo').value;
  const peso = parseFloat($('peso').value) || null;
  const altura = parseFloat($('altura').value) || null;
  const idade = parseInt($('idade').value) || null;
  const atividade = $('atividade').value;
  const tipoDiabetes = $('tipoDiabetes').value;
  const meta = $('meta').value;
  const glicemiaJejum = parseFloat($('glicemiaJejum').value);
  const glicemiaPos = parseFloat($('glicemiaPos').value);
  const timestamp = firebase.firestore.Timestamp.now();


  db.collection("usuarios")
    .doc(user)
    .collection("resultadosCarboidrato")
    .add({

      tmb,
      calorias: caloriasTotais,
      carboidratos: gramasCarbo,
      sexo, peso, altura, idade, atividade, tipoDiabetes, meta,
      glicemiaJejum: isNaN(glicemiaJejum) ? null : glicemiaJejum,
      glicemiaPos: isNaN(glicemiaPos) ? null : glicemiaPos,
      timestamp
    }).then(() => { mostrarHistorico(); mostrarGrafico(); })
    .catch(err => console.error('Erro ao salvar resultado:', err));
}

// ========= CÁLCULO =========
function calcularCarboidratos() {
  const username = $('username').value;
  localStorage.setItem('username', username);
  const sexo = $('sexo').value;
  const peso = parseFloat($('peso').value);
  const altura = parseFloat($('altura').value);
  const idade = parseInt($('idade').value);
  const atividade = parseFloat($('atividade').value);
  const tipoDiabetes = $('tipoDiabetes').value;
  const meta = $('meta').value;
  const glicemiaJejum = parseFloat($('glicemiaJejum').value);
  const glicemiaPos = parseFloat($('glicemiaPos').value);


  if (!user) {
    alert("Você precisa fazer login para usar a calculadora.");
    // Limpa histórico e gráfico
    if (exists($('historicoResultados'))) $('historicoResultados').innerHTML = '';
    // Não carrega nada
  }


  if (isNaN(peso) || isNaN(altura) || isNaN(idade)) {
    if (exists($('resultado'))) $('resultado').innerText = 'Por favor, preencha Peso, Altura e Idade.';
    return;
  }

  let tmb = sexo === 'masculino' ? 10 * peso + 6.25 * altura - 5 * idade + 5 : 10 * peso + 6.25 * altura - 5 * idade - 161;
  let fatorMeta = meta === 'perder' ? 0.85 : meta === 'ganhar' ? 1.15 : 1;
  const caloriasTotais = tmb * atividade * fatorMeta;

  let percentualCarbo = 0.5;
  if (!isNaN(glicemiaJejum) && !isNaN(glicemiaPos)) {
    if (glicemiaJejum > 130 || glicemiaPos > 180) percentualCarbo = 0.4;
    else if (glicemiaJejum < 80 || glicemiaPos < 90) percentualCarbo = 0.55;
  }
  if (tipoDiabetes === 'tipo1') percentualCarbo -= 0.05;
  if (tipoDiabetes === 'gestacional') percentualCarbo = 0.45;
  percentualCarbo = Math.max(0.35, Math.min(0.55, percentualCarbo));

  const caloriasDeCarbo = caloriasTotais * percentualCarbo;
  const gramasCarbo = caloriasDeCarbo / 4;
  const cafe = gramasCarbo * 0.2;
  const almoco = gramasCarbo * 0.35;
  const jantar = gramasCarbo * 0.3;
  const lanches = gramasCarbo * 0.15;

  if (exists($('resultado'))) {
    $('resultado').innerHTML = `
        <p><strong>TMB:</strong> ${tmb.toFixed(2)} kcal/dia</p>
        <p><strong>Calorias Totais:</strong> ${caloriasTotais.toFixed(2)} kcal/dia</p>
        <p><strong>Carboidratos Sugeridos:</strong> ${gramasCarbo.toFixed(0)}g/dia</p>
        <h4 class="mt-2">Divisão por Refeições:</h4>
        <ul class="list-disc list-inside">
          <li><strong>Café:</strong> ${cafe.toFixed(0)}g</li>
          <li><strong>Almoço:</strong> ${almoco.toFixed(0)}g</li>
          <li><strong>Jantar:</strong> ${jantar.toFixed(0)}g</li>
          <li><strong>Lanches:</strong> ${lanches.toFixed(0)}g</li>
        </ul>
      `;
  }

  salvarResultado(tmb, caloriasTotais, gramasCarbo);
}

// ========= GRÁFICO =========
function mostrarGrafico() {
  if (!user) {
    // No user logged in: clear existing chart and skip loading data
    if (graficoInstance) { graficoInstance.destroy(); graficoInstance = null; }
    return;
  }

  db.collection("usuarios")
    .doc(user)
    .collection("resultadosCarboidrato")
    .orderBy("timestamp", "desc").limit(10).get().then(qs => {
      const labels = [];
      const carboData = [];
      qs.forEach(doc => {
        const d = doc.data();
        labels.push(new Date(d.timestamp.toDate()).toLocaleString());
        carboData.push(d.carboidratos);
      });
      // reverse to show oldest->newest on chart
      labels.reverse(); carboData.reverse();

      const ctx = document.getElementById("graficoCarbo");
      if (!ctx) return;
      const ctx2d = ctx.getContext("2d");
      if (graficoInstance) graficoInstance.destroy();

      graficoInstance = new Chart(ctx2d, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Carboidratos (g/dia)', data: carboData, borderColor: 'orange', backgroundColor: 'rgba(255,165,0,0.2)', fill: true, tension: .3 }] },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, ticks: { color: undefined } },
            x: { ticks: { color: undefined } }
          },
          plugins: { legend: { labels: { color: undefined } } }
        }
      });
    }).catch(err => console.error('Erro ao carregar gráfico:', err));
}

// ========= HISTÓRICO =========
function mostrarHistorico() {
  db.collection("usuarios")
    .doc(user)
    .collection("resultadosCarboidrato")
    .orderBy("timestamp", "desc").limit(10).get().then(qs => {
      let html = '<h3 class="text-lg font-semibold mb-2">Últimos Cálculos:</h3><ul>';
      qs.forEach(doc => {
        const d = doc.data();
        const id = doc.id;
        html += `
          <li class="mb-4 p-3 bg-white/30 dark:bg-gray-700/30 rounded-xl shadow">
            <div><strong>Data:</strong> ${new Date(d.timestamp.toDate()).toLocaleString()}</div>
            <div><strong>TMB:</strong> ${d.tmb.toFixed(2)} kcal</div>
            <div><strong>Calorias:</strong> ${d.calorias.toFixed(2)} kcal</div>
            <div><strong>Carboidratos:</strong> ${d.carboidratos.toFixed(2)} g</div>
            <div class="mt-2"><button onclick="deletarHistorico('${id}')" class="bg-red-500 text-white px-3 py-1 rounded-xl">Excluir</button></div>
          </li>
        `;
      });
      html += '</ul>';
      if (exists($('historicoResultados'))) $('historicoResultados').innerHTML = html;
    }).catch(err => console.error('Erro ao carregar histórico:', err));
}

function deletarHistorico(id) {
  db.collection("usuarios")
    .doc(user)
    .collection("resultadosCarboidrato")
  if (!confirm('Tem certeza que deseja excluir?')) return;
  db.collection("resultadosCarboidrato").doc(id).delete().then(() => { mostrarHistorico(); mostrarGrafico(); });
}

// ========= FILTROS =========
function aplicarFiltro() {
  db.collection("usuarios")
    .doc(user)
    .collection("resultadosCarboidrato")
  const filtroData = $('filtroData').value;
  let query = db.collection("resultadosCarboidrato").orderBy("timestamp", "desc");
  if (filtroData) {
    const inicio = new Date(filtroData + 'T00:00:00');
    const fim = new Date(filtroData + 'T23:59:59');
    query = query.where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(inicio))
      .where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(fim));
  }
  query.get().then(qs => {
    let html = '<h3 class="text-lg font-semibold mb-2">Resultados Filtrados:</h3><ul>';
    qs.forEach(doc => {
      const d = doc.data();
      html += `
          <li class="mb-4 p-3 bg-white/30 dark:bg-gray-700/30 rounded-xl shadow">
            <div><strong>Data:</strong> ${new Date(d.timestamp.toDate()).toLocaleString()}</div>
            <div><strong>TMB:</strong> ${d.tmb.toFixed(2)} kcal</div>
            <div><strong>Carboidratos:</strong> ${d.carboidratos.toFixed(2)} g</div>
          </li>
        `;
    });
    html += '</ul>';
    if (exists($('historicoResultados'))) $('historicoResultados').innerHTML = html;
  }).catch(err => console.error('Erro ao aplicar filtro:', err));
}

function limparFiltro() { if (exists($('filtroData'))) $('filtroData').value = ''; mostrarHistorico(); }

// ========= TEMA ESCURO / SALVAR =========
function applyTheme(isDark) {
  if (isDark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  // update icons
  const dt = $('darkToggle');
  const dm = $('darkToggleMobile');
  if (dt) dt.textContent = isDark ? '☀️' : '🌙';
  if (dm) dm.textContent = (isDark ? '☀️' : '🌙') + ' Alternar Tema';
}

function toggleDark() {
  const isDarkNow = document.documentElement.classList.toggle('dark');
  localStorage.setItem('mygluco-theme', isDarkNow ? 'dark' : 'light');
  applyTheme(isDarkNow);
}

function restoreTheme() {
  const saved = localStorage.getItem('mygluco-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const startDark = saved ? (saved === 'dark') : prefersDark;
  applyTheme(startDark);
}

// ========= MOBILE MENU =========
function openPanel() {
  const p = $('mobilePanel');
  if (!p) return;
  p.classList.remove('hidden');
  p.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overflow-hidden');
  const hb = $('hamburgerBtn');
  if (hb) hb.setAttribute('aria-expanded', 'true');
  document.querySelector('.hamburger')?.classList.add('open');
}
function closePanel() {
  const p = $('mobilePanel');
  if (!p) return;
  p.classList.add('hidden');
  p.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('overflow-hidden');
  const hb = $('hamburgerBtn');
  if (hb) hb.setAttribute('aria-expanded', 'false');
  document.querySelector('.hamburger')?.classList.remove('open');
}

// ========= EVENT LISTENERS =========
// DOM-ready safe bindings
(function attachListeners() {
  // buttons
  document.addEventListener('click', (ev) => {
    // delegate for close etc not necessary — explicit listeners below
  });

  if (exists($('calcularBtn'))) $('calcularBtn').addEventListener('click', calcularCarboidratos);
  if (exists($('mostrarGraficoBtn'))) $('mostrarGraficoBtn').addEventListener('click', mostrarGrafico);
  if (exists($('mostrarHistoricoBtn'))) $('mostrarHistoricoBtn').addEventListener('click', mostrarHistorico);
  if (exists($('filtrarBtn'))) $('filtrarBtn').addEventListener('click', aplicarFiltro);
  if (exists($('limparFiltroBtn'))) $('limparFiltroBtn').addEventListener('click', limparFiltro);

  // theme buttons
  if (exists($('darkToggle'))) $('darkToggle').addEventListener('click', toggleDark);
  if (exists($('darkToggleMobile'))) $('darkToggleMobile').addEventListener('click', () => { toggleDark(); closePanel(); });

  // mobile menu
  if (exists($('hamburgerBtn'))) $('hamburgerBtn').addEventListener('click', () => { openPanel(); });
  if (exists($('closeMobile'))) $('closeMobile').addEventListener('click', closePanel);
  if (exists($('mobileBackdrop'))) $('mobileBackdrop').addEventListener('click', closePanel);

  // ESC closes panel
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

  // prevent duplicate body scroll when panel open/close is toggled via other code
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') {/* no-op */ } });
})();



// Expose some functions to window for inline onclick usage (if any)
window.calcularCarboidratos = calcularCarboidratos;
window.mostrarGrafico = mostrarGrafico;
window.mostrarHistorico = mostrarHistorico;
window.aplicarFiltro = aplicarFiltro;
window.limparFiltro = limparFiltro;
window.deletarHistorico = deletarHistorico;
window.toggleDark = toggleDark;

function openModal() { $('modal') && $('modal').classList.remove('hidden'); }
function closeModal() { $('modal') && $('modal').classList.add('hidden'); }

function saveUser() {
  const username = $('username') && $('username').value.trim();
  if (!username) return alert('Digite seu nome.');
  localStorage.setItem('username', username);
  const saud = $('saudacao');
  if (saud) saud.innerText = `Olá, ${username}! Bem-vindo!`;
  closeModal();
}