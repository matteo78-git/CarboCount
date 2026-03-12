# CarboCount 🩸

App per il calcolo dei carboidrati nei pasti.

## Deploy su Netlify (3 comandi)

### Requisiti
- [Node.js](https://nodejs.org) versione 18 o superiore

### Istruzioni

```bash
# 1. Entra nella cartella del progetto
cd carbocount

# 2. Installa le dipendenze (solo la prima volta, ~30 secondi)
npm install

# 3. Crea i file statici per il deploy
npm run build
```

Al termine troverai una cartella **`dist/`** con tutti i file pronti.

### Pubblica su Netlify

1. Vai su [netlify.com](https://netlify.com) → crea account gratuito
2. Dashboard → **"Add new site"** → **"Deploy manually"**
3. **Trascina la cartella `dist/`** nella pagina
4. In pochi secondi ottieni il tuo URL pubblico (es. `carbocount-xyz.netlify.app`)

### Installa come app su Android

1. Apri l'URL su **Chrome per Android**
2. Menu (3 puntini) → **"Aggiungi a schermata Home"**
3. Nome: **CarboCount** → conferma

L'app si installa come PWA: icona sull'home screen, nessuna barra browser, funziona come app nativa.

## Sviluppo locale

```bash
npm run dev
# Apre http://localhost:5173
```

## Dati

I dati degli alimenti vengono salvati nel **localStorage** del browser/dispositivo.
