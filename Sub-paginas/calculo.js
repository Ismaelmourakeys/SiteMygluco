// 🔥 FIREBASE CONFIG
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


// ============================================
// 🔽 PREENCHER SELECTS AUTOMATICAMENTE
// ============================================
function preencherSelects() {
  document.getElementById("sexo").innerHTML = `
    <option value="masculino">Masculino</option>
    <option value="feminino">Feminino</option>
  `;

  document.getElementById("atividade").innerHTML = `
    <option value="1.2">Sedentário</option>
    <option value="1.375">Leve (1-3x/semana)</option>
    <option value="1.55">Moderado (3-5x/semana)</option>
    <option value="1.725">Intenso (6-7x/semana)</option>
    <option value="1.9">Muito intenso (2 treinos/dia)</option>
  `;

  document.getElementById("tipoDiabetes").innerHTML = `
    <option value="nenhum">Nenhum</option>
    <option value="tipo1">Tipo 1</option>
    <option value="tipo2">Tipo 2</option>
    <option value="gestacional">Gestacional</option>
  `;

  document.getElementById("meta").innerHTML = `
    <option value="manter">Manter peso</option>
    <option value="perder">Perder peso</option>
    <option value="ganhar">Ganhar peso</option>
  `;
}

document.addEventListener("DOMContentLoaded", preencherSelects);


// ============================================
// 🔽 SALVAR NO FIRESTORE
// ============================================
function salvarResultado(tmb, caloriasTotais, gramasCarbo) {
  const sexo = document.getElementById("sexo").value;
  const peso = parseFloat(document.getElementById("peso").value);
  const altura = parseFloat(document.getElementById("altura").value);
  const idade = parseInt(document.getElementById("idade").value);
  const atividade = document.getElementById("atividade").value;
  const tipoDiabetes = document.getElementById("tipoDiabetes").value;
  const meta = document.getElementById("meta").value;
  const glicemiaJejum = parseFloat(document.getElementById("glicemiaJejum").value);
  const glicemiaPos = parseFloat(document.getElementById("glicemiaPos").value);

  const timestamp = firebase.firestore.Timestamp.now();

  db.collection("resultadosCarboidrato")
    .add({
      tmb,
      calorias: caloriasTotais,
      carboidratos: gramasCarbo,
      sexo,
      peso,
      altura,
      idade,
      atividade,
      tipoDiabetes,
      meta,
      glicemiaJejum: isNaN(glicemiaJejum) ? null : glicemiaJejum,
      glicemiaPos: isNaN(glicemiaPos) ? null : glicemiaPos,
      timestamp
    })
    .then(() => {
      mostrarHistorico();
      mostrarGrafico();
    })
    .catch((error) => console.error("Erro ao salvar resultado:", error));
}



// ============================================
// 🔽 FUNÇÃO PRINCIPAL DE CÁLCULO
// ============================================
function calcularCarboidratos() {
  const sexo = document.getElementById("sexo").value;
  const peso = parseFloat(document.getElementById("peso").value);
  const altura = parseFloat(document.getElementById("altura").value);
  const idade = parseInt(document.getElementById("idade").value);
  const atividade = parseFloat(document.getElementById("atividade").value);
  const tipoDiabetes = document.getElementById("tipoDiabetes").value;
  const meta = document.getElementById("meta").value;
  const glicemiaJejum = parseFloat(document.getElementById("glicemiaJejum").value);
  const glicemiaPos = parseFloat(document.getElementById("glicemiaPos").value);

  if (isNaN(peso) || isNaN(altura) || isNaN(idade)) {
    document.getElementById("resultado").innerText =
      "Por favor, preencha Peso, Altura e Idade.";
    return;
  }

  let tmb =
    sexo === "masculino"
      ? 10 * peso + 6.25 * altura - 5 * idade + 5
      : 10 * peso + 6.25 * altura - 5 * idade - 161;

  let fatorMeta = meta === "perder" ? 0.85 : meta === "ganhar" ? 1.15 : 1;
  const caloriasTotais = tmb * atividade * fatorMeta;

  let percentualCarbo = 0.5;

  if (!isNaN(glicemiaJejum) && !isNaN(glicemiaPos)) {
    if (glicemiaJejum > 130 || glicemiaPos > 180) percentualCarbo = 0.4;
    else if (glicemiaJejum < 80 || glicemiaPos < 90) percentualCarbo = 0.55;
  }

  if (tipoDiabetes === "tipo1") percentualCarbo -= 0.05;
  if (tipoDiabetes === "gestacional") percentualCarbo = 0.45;

  percentualCarbo = Math.max(0.35, Math.min(0.55, percentualCarbo));

  const caloriasDeCarbo = caloriasTotais * percentualCarbo;
  const gramasCarbo = caloriasDeCarbo / 4;

  const cafe = gramasCarbo * 0.2;
  const almoco = gramasCarbo * 0.35;
  const jantar = gramasCarbo * 0.3;
  const lanches = gramasCarbo * 0.15;

  document.getElementById("resultado").innerHTML = `
    <p><strong>TMB:</strong> ${tmb.toFixed(2)} kcal/dia</p>
    <p><strong>Calorias Totais:</strong> ${caloriasTotais.toFixed(2)} kcal/dia</p>
    <p><strong>Carboidratos Sugeridos:</strong> ${gramasCarbo.toFixed(0)}g/dia</p>
    <h4>Divisão por Refeições:</h4>
    <ul>
      <li><strong>Café:</strong> ${cafe.toFixed(0)}g</li>
      <li><strong>Almoço:</strong> ${almoco.toFixed(0)}g</li>
      <li><strong>Jantar:</strong> ${jantar.toFixed(0)}g</li>
      <li><strong>Lanches:</strong> ${lanches.toFixed(0)}g</li>
    </ul>
  `;

  salvarResultado(tmb, caloriasTotais, gramasCarbo);
}


// ============================================
// 🔽 GRÁFICO
// ============================================
function mostrarGrafico() {
  db.collection("resultadosCarboidrato")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then((querySnapshot) => {
      const labels = [];
      const carboData = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        labels.push(new Date(data.timestamp.toDate()).toLocaleString());
        carboData.push(data.carboidratos);
      });

      const ctx = document.getElementById("graficoCarbo").getContext("2d");

      if (graficoInstance) graficoInstance.destroy();

      graficoInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels.reverse(),
          datasets: [
            {
              label: "Carboidratos (g/dia)",
              data: carboData.reverse(),
              borderColor: "orange",
              backgroundColor: "rgba(255,165,0,0.2)",
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true },
            x: { ticks: { color: "#fff" } },
          },
          plugins: {
            legend: { labels: { color: "#fff" } },
          },
        },
      });
    });
}


// ============================================
// 🔽 HISTÓRICO
// ============================================
function mostrarHistorico() {
  db.collection("resultadosCarboidrato")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then((querySnapshot) => {
      let html = "<h3>Últimos Cálculos:</h3><ul>";

      querySnapshot.forEach((doc) => {
        const d = doc.data();
        const id = doc.id;

        html += `
          <li class="mb-4 p-3 bg-white/30 dark:bg-gray-700/30 rounded-xl shadow">
            <strong>Data:</strong> ${new Date(d.timestamp.toDate()).toLocaleString()}<br>
            <strong>TMB:</strong> ${d.tmb.toFixed(2)} kcal<br>
            <strong>Calorias:</strong> ${d.calorias.toFixed(2)} kcal<br>
            <strong>Carboidratos:</strong> ${d.carboidratos.toFixed(2)}g <br>
            <button onclick="deletarHistorico('${id}')" class="mt-2 bg-red-500 text-white px-3 py-1 rounded-xl">Excluir</button>
          </li>
        `;
      });

      html += "</ul>";

      document.getElementById("historicoResultados").innerHTML = html;
    });
}

function deletarHistorico(id) {
  if (!confirm("Tem certeza que deseja excluir?")) return;

  db.collection("resultadosCarboidrato")
    .doc(id)
    .delete()
    .then(() => {
      mostrarHistorico();
      mostrarGrafico();
    });
}


// ============================================
// 🔽 FILTRO POR DATA
// ============================================
function aplicarFiltro() {
  const filtroData = document.getElementById("filtroData").value;

  let query = db.collection("resultadosCarboidrato").orderBy("timestamp", "desc");

  if (filtroData) {
    const inicio = new Date(filtroData + "T00:00:00");
    const fim = new Date(filtroData + "T23:59:59");

    query = query
      .where("timestamp", ">=", firebase.firestore.Timestamp.fromDate(inicio))
      .where("timestamp", "<=", firebase.firestore.Timestamp.fromDate(fim));
  }

  query.get().then((qs) => {
    let html = "<h3>Resultados Filtrados:</h3><ul>";

    qs.forEach((doc) => {
      const d = doc.data();
      html += `
        <li class="mb-4 p-3 bg-white/30 dark:bg-gray-700/30 rounded-xl shadow">
          <strong>Data:</strong> ${new Date(d.timestamp.toDate()).toLocaleString()}<br>
          <strong>TMB:</strong> ${d.tmb.toFixed(2)} kcal<br>
          <strong>Carboidratos:</strong> ${d.carboidratos.toFixed(2)}g<br>
        </li>
      `;
    });

    html += "</ul>";

    document.getElementById("historicoResultados").innerHTML = html;
  });
}



// ============================================
// 🔽 MODO ESCURO
// ============================================
function toggleDark() {
  document.documentElement.classList.toggle("dark");
}
