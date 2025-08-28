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

  // Corrige a data atual
  const timestamp = firebase.firestore.Timestamp.now();
  const dateObj = timestamp.toDate(); // ← Convertemos para Date
  const dataFormatada =
    dateObj.getFullYear() + '-' +
    String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
    String(dateObj.getDate()).padStart(2, '0');

  db.collection("resultadosCarboidrato").add({
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
    dataFormatada,
    timestamp // Aqui salva a data atual corretamente
  })
  .then(() => {
    mostrarHistorico();  // Atualiza histórico
    mostrarGrafico();    // Atualiza gráfico
  })
  .catch((error) => {
    console.error("Erro ao salvar resultado no Firebase:", error);
  });
}




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
      document.getElementById("resultado").innerText = "Por favor, preencha Peso, Altura e Idade.";
      return;
    }

    let tmb = (sexo === "masculino") 
      ? (10 * peso) + (6.25 * altura) - (5 * idade) + 5 
      : (10 * peso) + (6.25 * altura) - (5 * idade) - 161;

    let fatorMeta = (meta === "perder") ? 0.85 : (meta === "ganhar") ? 1.15 : 1;
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

    const cafe = gramasCarbo * 0.20;
    const almoco = gramasCarbo * 0.35;
    const jantar = gramasCarbo * 0.30;
    const lanches = gramasCarbo * 0.15;

    document.getElementById("resultado").innerHTML = `
      <p><strong>TMB:</strong> ${tmb.toFixed(2)} kcal/dia</p>
      <p><strong>Calorias Totais:</strong> ${caloriasTotais.toFixed(2)} kcal/dia</p>
      <p><strong>Carboidratos Sugeridos:</strong> ${gramasCarbo.toFixed(0)}g/dia (${(percentualCarbo*100).toFixed(0)}%)</p>
      <h4>Divisão por Refeições:</h4>
      <ul>
        <li><strong>Café da manhã:</strong> ${cafe.toFixed(0)}g</li>
        <li><strong>Almoço:</strong> ${almoco.toFixed(0)}g</li>
        <li><strong>Jantar:</strong> ${jantar.toFixed(0)}g</li>
        <li><strong>Lanches/Ceia:</strong> ${lanches.toFixed(0)}g</li>
      </ul>
    `;

    salvarResultado(tmb, caloriasTotais, gramasCarbo);
  }

  function mostrarGrafico() {
    db.collection("resultadosCarboidrato").orderBy("timestamp", "desc").limit(10).get()
      .then((querySnapshot) => {
        const labels = [];
        const carboData = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const dataFormatada = new Date(data.timestamp.toDate()).toLocaleString();
          labels.push(dataFormatada);
          carboData.push(data.carboidratos);
        });

        const ctx = document.getElementById('graficoCarbo').getContext('2d');

        if (graficoInstance) graficoInstance.destroy();

        graficoInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels.reverse(),
            datasets: [{
              label: 'Carboidratos (g/dia)',
              data: carboData.reverse(),
              borderColor: 'orange',
              backgroundColor: 'rgba(255,165,0,0.2)',
              fill: true,
              tension: 0.3
            }]
          },
          options: {
             animation: {
              duration: 1500,
              easing: 'easeOutBounce'
            },
            responsive: true,
            scales: {
              y: { beginAtZero: true },
              x: { ticks: { color: '#fff' } },
            },
            plugins: {
              legend: { labels: { color: '#fff' } }
            }
          }
        });
      })
      .catch((error) => console.error("Erro ao buscar dados:", error));
  }

  function mostrarHistorico() {
  db.collection("resultadosCarboidrato")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get()
    .then((querySnapshot) => {
      let historicoHTML = "<h3>Últimos Cálculos:</h3><ul>";

querySnapshot.forEach((doc) => {
  const data = doc.data();
  const id = doc.id; // ← Pegamos o ID do documento
  const dataFormatada = new Date(data.timestamp.toDate()).toLocaleString();

  historicoHTML += `
    <li>
      <strong>Data:</strong> ${dataFormatada}<br>
      <strong>TMB:</strong> ${data.tmb.toFixed(2)} kcal<br>
      <strong>Calorias:</strong> ${data.calorias.toFixed(2)} kcal<br>
      <strong>Carboidratos:</strong> ${data.carboidratos.toFixed(2)}g <br>
      <strong>Sexo:</strong> ${data.sexo}<br>
      <strong>Peso:</strong> ${data.peso} kg<br>
      <strong>Altura:</strong> ${data.altura} cm<br>
      <strong>Idade:</strong> ${data.idade} anos<br>
      <strong>Tipo de Diabetes:</strong> ${data.tipoDiabetes}<br>
      <strong>Meta:</strong> ${data.meta}<br>
      ${data.glicemiaJejum ? `<strong>Glicemia Jejum:</strong> ${data.glicemiaJejum} mg/dL<br>` : ''}
      ${data.glicemiaPos ? `<strong>Glicemia Pós:</strong> ${data.glicemiaPos} mg/dL<br>` : ''}  
      <br><button onclick="deletarHistorico('${id}')">🗑️ Excluir</button>
      </li><hr>
    `;
});


      historicoHTML += "</ul>";
      document.getElementById("historicoResultados").innerHTML = historicoHTML;
    })
    .catch((error) => {
      console.error("Erro ao buscar histórico:", error);
    });
}


function deletarHistorico(id) {
  if (confirm("Tem certeza que deseja excluir este histórico?")) {
    db.collection("resultadosCarboidrato").doc(id).delete()
      .then(() => {
        mostrarHistorico();
        mostrarGrafico();
      })
      .catch((error) => {
        console.error("Erro ao deletar:", error);
      });
  }
}


function aplicarFiltro() {
  const filtroData = document.getElementById("filtroData").value;

  let query = db.collection("resultadosCarboidrato").orderBy("timestamp", "desc");

  // Se o filtro de data estiver preenchido, aplicamos a comparação
  if (filtroData) {
    const filtroDataObj = new Date(filtroData);  // Converte a data para objeto Date
    query = query.where("timestamp", ">=", firebase.firestore.Timestamp.fromDate(filtroDataObj));
    query = query.where("timestamp", "<", firebase.firestore.Timestamp.fromDate(new Date(filtroDataObj.getTime() + 86400000))); // Filtro para o mesmo dia
  }

  query.get()
    .then((querySnapshot) => {
      let historicoHTML = "<h3>Resultados Filtrados:</h3><ul>";
      let encontrou = false;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;

        // Converte timestamp para "YYYY-MM-DD" com fuso local
        const ts = data.timestamp.toDate();
        const dataFormatada = ts.getFullYear() + '-' + String(ts.getMonth() + 1).padStart(2, '0') + '-' + String(ts.getDate()).padStart(2, '0');

        // Filtro de data já aplicado na consulta do Firestore
        encontrou = true;
        const dataExibicao = ts.toLocaleString("pt-BR");

        historicoHTML += `
          <li>
            <strong>Data:</strong> ${dataExibicao}<br>
            <strong>TMB:</strong> ${data.tmb.toFixed(2)} kcal<br>
            <strong>Calorias:</strong> ${data.calorias.toFixed(2)} kcal<br>
            <strong>Carboidratos:</strong> ${data.carboidratos.toFixed(2)}g<br>
            ${data.tipoDiabetes ? `<strong>Tipo de Diabetes:</strong> ${data.tipoDiabetes}<br>` : ""}
            ${data.meta ? `<strong>Meta:</strong> ${data.meta}<br>` : ""}
            ${data.glicemiaJejum !== undefined ? `<strong>Glicemia Jejum:</strong> ${data.glicemiaJejum} mg/dL<br>` : ""}
            ${data.glicemiaPos !== undefined ? `<strong>Glicemia Pós:</strong> ${data.glicemiaPos} mg/dL<br>` : ""}
            <button onclick="deletarHistorico('${id}')">🗑️ Excluir</button>
          </li><hr>
        `;
      });

      historicoHTML += "</ul>";
      document.getElementById("historicoResultados").innerHTML = encontrou
        ? historicoHTML
        : "<h3>Nenhum resultado encontrado com os filtros aplicados.</h3>";
    })
    .catch((error) => {
      console.error("Erro ao aplicar filtro:", error);
    });
}


const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if(e.isIntersecting) e.target.classList.add('in');
  });
}, { threshold: 0.1 });

document.querySelectorAll('[data-scroll]').forEach(el => obs.observe(el));
