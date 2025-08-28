const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(bodyParser.json({ limit: '10mb' })); // Para suportar imagens Base64 grandes

app.post('/receitas', (req, res) => {
    const { nome, ingredientes, modoPreparo, descricao, imagemBase64 } = req.body;

    // Simulação de salvar os dados em um JSON
    const receita = {
        nome,
        ingredientes,
        modoPreparo,
        descricao,
        imagemSalvaEm: ""
    };

    // Salvar a imagem como arquivo físico (exemplo)
    if (imagemBase64) {
        const buffer = Buffer.from(imagemBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const nomeArquivo = `receita_${Date.now()}.png`;
        fs.writeFileSync(`./imagens/${nomeArquivo}`, buffer);
        receita.imagemSalvaEm = nomeArquivo;
    }

    // Salvar os dados (aqui só salva num arquivo .json simples, só pra exemplo)
    fs.appendFileSync('receitas.json', JSON.stringify(receita) + '\n');

    res.json({ sucesso: true, mensagem: "Receita salva com sucesso!" });
});

app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
});
