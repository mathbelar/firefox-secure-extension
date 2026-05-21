# firefox-secure-extension

Extensão validada em ambiente controlado

# Privacy Monitor

Extensão para Firefox que detecta e exibe ameaças à privacidade durante a navegação web.

---

## Funcionalidades

- **Domínios de terceira parte** — lista todos os domínios externos contactados e o tipo de recurso (script, imagem, iframe, etc.)
- **Cookies** — quantidade total, classificação entre primeira e terceira parte, sessão vs persistentes
- **Supercookies** — detecção de ETags e HSTS supercookies usados como identificadores persistentes
- **Web Storage** — inspeção de localStorage, sessionStorage e IndexedDB (chaves e tamanhos)
- **Browser Fingerprinting** — monitora chamadas à Canvas API, WebGL e AudioContext
- **Hijacking** — detecta scripts externos injetados dinamicamente e redirecionamentos suspeitos
- **Privacy Score** — pontuação de 0 a 100 indicando o nível de privacidade da página

---

## Instalação

### Modo desenvolvedor (temporário)

1. Clone ou baixe este repositório
2. Abra o Firefox e acesse `about:debugging`
3. Clique em **"Este Firefox"**
4. Clique em **"Carregar extensão temporária..."**
5. Selecione o arquivo `manifest.json` dentro da pasta do projeto
6. A extensão aparece instalada — o ícone aparece na barra do Firefox

> A extensão temporária é removida ao fechar o Firefox. Para recarregar após editar o código, clique em **"Recarregar"** no `about:debugging`.

### Estrutura de arquivos

```
privacy-monitor/
├── manifest.json         # Configuração da extensão
├── background.js         # Service worker: captura requisições, cookies, supercookies
├── privacy_monitor.js    # Content script: storage, fingerprinting, hijacking
├── popup.html            # Interface visual do popup
├── popup.js              # Lógica do popup
├── icons/
│   ├── icon48.png
│   └── icon96.png
├── README.md             # Este arquivo
└── validacao.txt         # Data de início do desenvolvimento
```

---

## Como usar

1. Acesse qualquer site no Firefox
2. Clique no ícone do **Privacy Monitor** na barra de ferramentas
3. O popup exibe:
   - **Privacy Score** — pontuação de 0 (péssimo) a 100 (ótimo)
   - Domínios de terceira parte detectados
   - Contagem e classificação de cookies
   - Supercookies (ETags/HSTS)
   - Técnicas de fingerprinting identificadas
   - Ameaças de hijacking
   - Dados armazenados no dispositivo

---

## Metodologia do Privacy Score

O Privacy Score começa em **100 pontos** e desconta conforme as ameaças detectadas:

| Fator | Desconto | Teto |
|---|---|---|
| Cada domínio de terceira parte único | -3 pontos | máx -30 |
| Cada cookie de terceira parte | -5 pontos | máx -20 |
| Cada técnica de fingerprinting | -10 pontos | sem teto |
| Cada supercookie (ETag ou HSTS) | -15 pontos | máx -30 |
| Cada ameaça de hijacking | -10 pontos | máx -20 |

### Faixas de classificação

| Score | Classificação |
|---|---|
| 80 – 100 | ✅ Boa privacidade |
| 60 – 79  | ⚠️ Privacidade moderada |
| 35 – 59  | 🟠 Privacidade comprometida |
| 0 – 34   | 🔴 Rastreamento intenso |

### Justificativa dos pesos

- **Domínios de terceira parte** recebem desconto moderado (-3) pois nem todo recurso externo é um rastreador — CDNs e fontes também aparecem aqui.
- **Cookies de terceira parte** têm desconto maior (-5) pois são o vetor clássico de rastreamento cross-site.
- **Fingerprinting** tem o maior desconto individual (-10 por técnica) pois é o método mais invasivo e difícil de bloquear pelo usuário.
- **Supercookies** têm desconto alto (-15) pois persistem mesmo após limpar cookies e são difíceis de detectar sem ferramentas.
- **Hijacking** recebe desconto significativo (-10) pois indica comportamento potencialmente malicioso.

---

## Sites para testar

| Site | O que testa |
|---|---|
| `coveryourtracks.eff.org` | Fingerprinting completo (Canvas, WebGL, Audio) |
| `amiunique.org` | Fingerprint único do navegador |
| `uol.com.br` | Grande quantidade de trackers de terceiros |
| `globo.com` | Cookies de terceira parte e adtech |

---

## Referências

- [MDN WebExtensions](https://developer.mozilla.org/pt-BR/docs/Mozilla/Add-ons/WebExtensions)
- [webRequest API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest)
- [Cover Your Tracks (EFF)](https://coveryourtracks.eff.org)
- [Am I Unique?](https://amiunique.org)