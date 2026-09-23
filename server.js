const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// Utilitaire pour encoder / décoder proprement en Base64 URL-Safe
function encodeBase64(str) {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

// Style CSS partagé
const styleCSS = `
  <style>
    :root {
      --bg: #0d1117;
      --card: #161b22;
      --text: #c9d1d9;
      --accent: #58a6ff;
      --border: #30363d;
      --font: system-ui, -apple-system, sans-serif;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .container {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 30px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    h1 { margin-top: 0; color: #fff; font-size: 1.8rem; }
    p { line-height: 1.6; color: #8b949e; }
    input[type="text"] {
      width: 100%;
      padding: 12px;
      margin: 10px 0 20px 0;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: #090d16;
      color: #fff;
      box-sizing: border-box;
      font-size: 1rem;
    }
    button, .btn {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      text-decoration: none;
      font-size: 1rem;
      text-align: center;
    }
    button:hover, .btn:hover { opacity: 0.9; }
    .box {
      background: #090d16;
      border: 1px dashed var(--border);
      padding: 15px;
      border-radius: 6px;
      word-break: break-all;
      font-family: monospace;
      color: #7ee787;
      margin: 15px 0;
    }
    nav { margin-bottom: 20px; }
    nav a { color: var(--accent); text-decoration: none; margin-right: 15px; font-weight: 500; }
    nav a:hover { text-decoration: underline; }
  </style>
`;

// PAGE D'ACCUEIL : Générateur d'URL Babel
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Bibliothèque d'URL - Accueil</title>
      ${styleCSS}
    </head>
    <body>
      <div class="container">
        <nav>
          <a href="/">Accueil</a>
          <a href="/search">Recherche</a>
        </nav>
        <h1>Bibliothèque d'URL</h1>
        <p>Entrez une URL (avec ou sans chemin) pour obtenir son emplacement virtuel dans la bibliothèque.</p>
        
        <form action="/generate" method="POST">
          <input type="text" name="url" placeholder="https://exemple.com/mon/chemin" required>
          <button type="submit">Générer le lien Babel</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// ROUTE TRAITEMENT DU FORMULAIRE D'ACCUEIL
app.post('/generate', (req, res) => {
  let targetUrl = req.body.url.trim();
  
  // Ajoute https:// si l'utilisateur oublie le protocole
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  const encoded = encodeBase64(targetUrl);
  res.redirect(`/web/${encoded}`);
});

// PAGE DE RECHERCHE
app.get('/search', (req, res) => {
  const query = req.query.q ? req.query.q.trim() : '';
  let resultHtml = '';

  if (query) {
    let target = query;
    // Si la recherche est déjà une URL Babel (/web/xxxx)
    if (target.includes('/web/')) {
      const parts = target.split('/web/');
      target = parts[parts.length - 1];
    }

    try {
      // Test si c'est du Base64 valide
      const decoded = decodeBase64(target);
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        resultHtml = `
          <p>Résultat trouvé :</p>
          <div class="box">${decoded}</div>
          <a class="btn" href="/web/${target}">Ouvrir la page</a>
        `;
      } else {
        throw new Error('Invalide');
      }
    } catch (e) {
      // Sinon on considère que l'utilisateur a recherché une URL classique
      let formatted = target;
      if (!/^https?:\/\//i.test(formatted)) formatted = 'https://' + formatted;
      const encoded = encodeBase64(formatted);
      resultHtml = `
        <p>Lien généré pour "${formatted}" :</p>
        <div class="box">${req.protocol}://${req.get('host')}/web/${encoded}</div>
        <a class="btn" href="/web/${encoded}">Voir la page</a>
      `;
    }
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Recherche - Bibliothèque d'URL</title>
      ${styleCSS}
    </head>
    <body>
      <div class="container">
        <nav>
          <a href="/">Accueil</a>
          <a href="/search">Recherche</a>
        </nav>
        <h1>Recherche dans la Bibliothèque</h1>
        <p>Recherchez une URL classique ou collez un code Base64 pour retrouver sa destination.</p>
        
        <form action="/search" method="GET">
          <input type="text" name="q" value="${query}" placeholder="Ex: https://site.com ou code Base64" required>
          <button type="submit">Rechercher</button>
        </form>

        ${resultHtml}
      </div>
    </body>
    </html>
  `);
});

// PAGE DU LIEN DECODÉ (Pas de redirection automatique)
app.get('/web/:encodedUrl', (req, res) => {
  const encodedUrl = req.params.encodedUrl;
  
  try {
    const decodedUrl = decodeBase64(encodedUrl);

    // Vérification de base de la validité de l'URL
    const isValid = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(decodedUrl);

    if (!isValid) {
      throw new Error('URL invalide');
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Emplacement Web - ${encodedUrl}</title>
        ${styleCSS}
      </head>
      <body>
        <div class="container">
          <nav>
            <a href="/">Accueil</a>
            <a href="/search">Recherche</a>
          </nav>
          <h1>Emplacement de l'URL</h1>
          <p>Voici l'URL décodée associée à cet emplacement Babel :</p>

          <div class="box">${decodedUrl}</div>

          <p style="margin-top:25px;">
            <a class="btn" href="${decodedUrl}" target="_blank" rel="noopener noreferrer">Accéder au site externe ↗</a>
          </p>
        </div>
      </body>
      </html>
    `);

  } catch (err) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Emplacement Invalide</title>
        ${styleCSS}
      </head>
      <body>
        <div class="container">
          <nav>
            <a href="/">Accueil</a>
            <a href="/search">Recherche</a>
          </nav>
          <h1>Emplacement Invalide</h1>
          <p>Cet emplacement de la bibliothèque ne contient pas d'URL valide ou le code est corrompu.</p>
          <a class="btn" href="/">Retourner à l'accueil</a>
        </div>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
