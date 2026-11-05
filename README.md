# Capitalea EU — versió web

El trivial de les capitals d'Europa per a nens i nenes de 12 anys. Web estàtica (HTML + CSS + JS),
sense servidor ni base de dades. Es pot instal·lar al mòbil com a app (PWA) i funciona sense connexió.

## Fitxers

- `index.html` — pàgina i estils
- `app.js` — lògica del joc (49 països, modes Clàssic, Contrarellotge i Supervivència)
- `manifest.webmanifest`, `icons/` — instal·lació com a app
- `sw.js` — funcionament sense connexió. **Canvia `VERSION` cada cop que publiquis canvis.**

## Publicar a GitHub Pages

1. Puja aquests fitxers a l'arrel d'un repositori de GitHub.
2. *Settings › Pages › Build and deployment*: Source = **Deploy from a branch**, Branch = **main**, carpeta **/ (root)**.
3. En un o dos minuts estarà a `https://<usuari>.github.io/<repositori>/`.

## Provar en local

```
python -m http.server 8000
```
i obre http://localhost:8000
