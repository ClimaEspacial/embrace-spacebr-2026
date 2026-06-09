# Space Weather Talks — AEB · SpaceBR Show 2026

Landing page para inscrição em sessões de clima espacial no estande da AEB na SpaceBR Show 2026.

## Visão geral

Visitantes escaneiam QR codes no estande, escolhem um tema, reservam uma vaga em horário fixo e recebem confirmação instantânea. Os dados vão direto para o Google Sheets via Google Apps Script.

```
Visitante
   │
   ▼ escaneia QR code
GitHub Pages (index.html)
   │
   ▼ clica em sessão + preenche formulário
Google Apps Script (Web App)
   │
   ▼ valida + grava
Google Sheets
```

---

## Publicar no GitHub Pages

1. Acesse **Settings → Pages** no repositório.
2. Em **Source**, selecione o branch `main` e a pasta `/ (root)`.
3. Clique em **Save**.
4. A página ficará disponível em:
   ```
   https://climaespacial.github.io/embrace-spacebr-2026/
   ```

> Qualquer push para `main` atualiza o site automaticamente.

---

## Configurar o Google Apps Script (backend)

### 1. Criar a planilha

1. Acesse [sheets.new](https://sheets.new) para criar uma planilha em branco.
2. Copie o **ID** da URL (o trecho entre `/d/` e `/edit`):
   ```
   https://docs.google.com/spreadsheets/d/ESTE_TRECHO_É_O_ID/edit
   ```

### 2. Criar o Apps Script

1. Na planilha, vá em **Extensões → Apps Script**.
2. Apague o código padrão e cole o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs).
3. Substitua o valor de `SPREADSHEET_ID` pelo ID copiado:
   ```javascript
   const SPREADSHEET_ID = 'seu-id-aqui';
   ```
4. Salve o projeto (Ctrl+S ou ⌘+S).

### 3. Configurar a planilha

1. No editor do Apps Script, clique em **Executar → Função → setupSpreadsheet**.
2. Autorize as permissões quando solicitado.
3. Ao concluir, a planilha terá duas abas:
   - **Sessões** — grade de horários pré-carregada
   - **Inscrições** — onde os registros serão salvos

### 4. Implantar como Web App

1. Clique em **Implantar → Nova implantação**.
2. Em **Tipo**, selecione **App da Web**.
3. Configure:
   - **Executar como:** Eu (sua conta Google)
   - **Quem tem acesso:** Qualquer pessoa
4. Clique em **Implantar** e copie a URL gerada.
   ```
   https://script.google.com/macros/s/AKfyc.../exec
   ```

### 5. Conectar o frontend ao backend

Abra `js/config.js` e cole a URL no campo `APPS_SCRIPT_URL`:

```javascript
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfyc.../exec',
  // ...
};
```

Faça commit e push. O site passará a usar o Apps Script real.

> **Nota sobre CORS:** O Apps Script usa `Content-Type: text/plain` no POST
> (padrão desta implementação) para evitar requisições de pré-flight, que são
> bloqueadas pelo Apps Script. Isso é compatível com a leitura do corpo via
> `e.postData.contents` no `doPost`.

---

## Personalizar temas, horários e vagas

Toda a configuração do evento está em **`js/config.js`**:

### Alterar horários ou vagas

```javascript
sessions: [
  { id: 'session-1', topicId: 'lancamentos-foguetes',    time: '10:30', day: '16/06', spots: 15 },
  { id: 'session-2', topicId: 'aviacao-eventos-extremos', time: '14:30', day: '16/06', spots: 15 },
  { id: 'session-3', topicId: 'gics-rede-eletrica',       time: '10:30', day: '17/06', spots: 15 },
  { id: 'session-4', topicId: 'gps-drones-agricultura',   time: '14:30', day: '17/06', spots: 15 },
],
```

- `time`  — horário no formato `HH:MM`
- `day`   — identificador do dia (aparece como filtro e na confirmação)
- `spots` — capacidade máxima da sessão

### Adicionar ou remover temas

```javascript
topics: [
  {
    id: 'meu-tema',              // identificador único (usado em URLs)
    name: 'Meu Tema',            // nome exibido nos cards
    question: 'Pergunta cativante?', // versão para QR code
    emoji: '🔭',
    description: 'Breve descrição...',
  },
  // ...
],
```

> Após alterar temas ou sessões, atualize também a aba **Sessões** na planilha
> (ou execute `setupSpreadsheet()` novamente em ambiente de teste).

---

## Gerar QR codes

Os QR codes podem apontar para URLs com parâmetros que pré-selecionam um tema ou
abrem direto o formulário de uma sessão.

### Por tema (mostra todas as sessões do tema)

```
https://climaespacial.github.io/embrace-spacebr-2026/?tema=lancamentos-foguetes
https://climaespacial.github.io/embrace-spacebr-2026/?tema=aviacao-eventos-extremos
https://climaespacial.github.io/embrace-spacebr-2026/?tema=gics-rede-eletrica
https://climaespacial.github.io/embrace-spacebr-2026/?tema=gps-drones-agricultura
```

### Por sessão específica (abre direto o formulário)

```
https://climaespacial.github.io/embrace-spacebr-2026/?sessao=session-1
https://climaespacial.github.io/embrace-spacebr-2026/?sessao=session-2
https://climaespacial.github.io/embrace-spacebr-2026/?sessao=session-3
https://climaespacial.github.io/embrace-spacebr-2026/?sessao=session-4
```

### Gerar os QR codes

Use qualquer gerador online ou de linha de comando. Exemplo com `qrencode` (Linux/macOS):

```bash
# Instalar (macOS):
brew install qrencode

# Gerar um QR por tema:
qrencode -o qr-lancamentos-foguetes.png \
  "https://climaespacial.github.io/embrace-spacebr-2026/?tema=lancamentos-foguetes"

# Gerar todos os QRs de tema de uma vez:
BASE="https://climaespacial.github.io/embrace-spacebr-2026"
for tema in lancamentos-foguetes aviacao-eventos-extremos gics-rede-eletrica gps-drones-agricultura; do
  qrencode -o "qr-${tema}.png" "${BASE}/?tema=${tema}"
done
```

Alternativamente, use serviços como [qr-code-generator.com](https://www.qr-code-generator.com)
ou [goqr.me](https://goqr.me) colando cada URL.

---

## Estrutura do repositório

```
index.html          ← Landing page principal (SPA)
css/
  style.css         ← Estilo mobile-first, tema espacial
js/
  config.js         ← Configuração: temas, sessões, URL do Apps Script
  app.js            ← Lógica da aplicação (navegação, API, formulário)
apps-script/
  Code.gs           ← Código do Google Apps Script (backend)
README.md
```

---

## Modo demonstração

Enquanto `APPS_SCRIPT_URL` estiver vazio em `config.js`, o site opera em **modo demo**:

- As vagas são simuladas com valores aleatórios.
- O formulário simula o envio e exibe confirmação após 1,4 segundos.
- Um banner amarelo indica o modo ativo.

Isso permite testar o fluxo completo antes de configurar o backend.

---

## Estrutura da planilha

### Aba "Sessões"

| A: ID       | B: Tema ID                  | C: Horário | D: Dia   | E: Nome do Tema                                                                | F: Vagas |
|-------------|-----------------------------|------------|----------|--------------------------------------------------------------------------------|----------|
| session-1   | lancamentos-foguetes        | 10:30      | 16/06    | Monitoramento de clima espacial durante lançamentos de foguetes                | 15       |
| session-2   | aviacao-eventos-extremos    | 14:30      | 16/06    | Os perigos causados à aviação durante eventos extremos de clima espacial       | 15       |
| session-3   | gics-rede-eletrica          | 10:30      | 17/06    | Quando o Sol ameaça a rede elétrica: entendendo as GICs                        | 15       |
| session-4   | gps-drones-agricultura      | 14:30      | 17/06    | Do espaço para o campo: como o clima espacial afeta GPS, drones e agricultura  | 15       |

### Aba "Inscrições"

| A: Timestamp             | B: Session ID | C: Email         | D: Nome  | E: Instituição | F: Interesses     |
|--------------------------|---------------|------------------|----------|----------------|-------------------|
| 2026-11-01T10:05:00.000Z | session-1     | joao@example.com | João     | INPE           | noticias, eventos |
| …                        | …             | …                | …        | …              | …                 |

---

## Endpoints do Apps Script

| Método | Parâmetro / Corpo              | Resposta                                      |
|--------|-------------------------------|-----------------------------------------------|
| GET    | `?action=availability`        | `{ success, availability: { id: vagas } }`   |
| GET    | `?action=sessions`            | `{ success, sessions: [...] }`               |
| POST   | JSON: `{ action: 'register', sessionId, name, email, institution, interests }` | `{ success, message }` ou `{ success: false, error }` |

---

## Tecnologias

- **GitHub Pages** — hospedagem gratuita de site estático
- **HTML / CSS / JavaScript** — sem frameworks, sem dependências externas
- **Google Apps Script** — backend serverless gratuito
- **Google Sheets** — banco de dados simples e acessível

---

## Licença

Este projeto é disponibilizado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).