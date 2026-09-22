# ARISE Veldassistent

Een volledig offline werkende webapp/PWA voor het raadplegen van ARISE/NMV-paddenstoelengegevens
en het administreren van eigen ARISE-collecties.

Dit is **geen** determinatie-app. Je determineert de paddenstoel zelf en zoekt daarna op de
wetenschappelijke naam om de ARISE/NMV-status te bekijken.

## Wat de app doet

- Zoeken op wetenschappelijke naam, genus of familie (live, tijdens het typen, offline).
- Tonen van soortdetails: familie, genus, NSR-status, NMV-prioriteit en (na ARISE-import)
  ARISE-status, barcodeaantallen, reeds verzameld en "nog nodig".
- Werkt volledig offline na de eerste keer laden (PWA met service worker).
- Alle gegevens lokaal opgeslagen in IndexedDB; niets wordt geüpload.

De app wordt geleverd met de 469 soorten van de NMV-prioriteitenlijst als standaarddatabase.

> Alle vier de fasen zijn geïmplementeerd: projectstructuur, IndexedDB, NMV-seed,
> zoeken, soortdetail, offline PWA, ARISE Targetlist-import, NMV/ARISE-merge,
> statuslogica, importcontrole, collecties met checklist/notities/foto's,
> QR-scan, backup/herstel en export naar XLSX/CSV.

## Techniek

- React + TypeScript + Vite
- Dexie (IndexedDB)
- SheetJS/xlsx (lokaal Excel lezen)
- vite-plugin-pwa (service worker + manifest)
- Geen backend, geen cloud, geen CDN, geen externe assets

## Installatie

```bash
npm install
```

## Development starten

```bash
npm run dev
```

Open vervolgens de getoonde lokale URL in de browser.

## Productiebuild maken

```bash
npm run build
npm run preview
```

`npm run build` draait eerst de TypeScript-controle en daarna de Vite-build. De output staat
in `dist/`.

## Tests uitvoeren

```bash
npm test
```

## PWA installeren

1. Maak een productiebuild en start `npm run preview` (of host de `dist/`-map).
2. Open de app in een ondersteunde browser (Chrome/Edge op desktop en Android, Safari op iOS).
3. Kies "Installeren" / "Toevoegen aan startscherm".

Na installatie draait de app in standalone-modus als een zelfstandige app.

## Offline testen

1. Open de app minstens één keer online zodat de service worker de assets cachet.
2. Schakel wifi en mobiele data uit.
3. Herstart de app. Zoeken en soortdetails blijven werken; de IndexedDB-gegevens blijven
   beschikbaar.

## NMV-bestand vervangen

De standaard-NMV-lijst wordt bij de build gegenereerd uit
`20260724_Priority_Macrofungi.xlsx` (koppen op rij 11, data vanaf rij 12).

Om een nieuwe NMV-lijst te gebruiken:

1. Vervang het Excelbestand in de projectroot.
2. Genereer het seedbestand opnieuw:

   ```bash
   npm run seed:nmv
   ```

3. Maak een nieuwe build.

## Iconen genereren

De lokale PWA-iconen kunnen opnieuw worden gegenereerd met:

```bash
npm run gen:icons
```

## ARISE Targetlist importeren

1. Download een recente export van de ARISE Targetlist (XLSX, XLS of CSV).
2. Ga in de app naar **Instellingen** en kies **ARISE TARGETLIST BIJWERKEN**.
3. Selecteer het bestand. Het wordt uitsluitend lokaal verwerkt en nergens
   geüpload. Alleen Fungi-records worden geïmporteerd.
4. Na de import verschijnt de **Importcontrole** met exact gekoppelde soorten,
   nieuwe ARISE-soorten, NMV-soorten zonder match, dubbele namen en records met
   ontbrekende gegevens.

De import raakt uitsluitend de soortenreferentiedata aan. Collecties, foto's,
notities en Sample ID's blijven behouden. Vóór het vervangen van de
soortendatabase wordt intern een herstelpunt bewaard.

## Backup maken

1. Ga naar **Instellingen** en kies **Backup & export** en daarna **BACKUP MAKEN**.
2. Er wordt één ZIP-bestand gedownload (`arise-veldassistent-backup-JJJJ-MM-DD.zip`)
   met alle databasegegevens als JSON en alle gekoppelde foto's.
3. Bewaar dit bestand veilig; het is je lokale reservekopie.

## Backup herstellen

1. Ga naar **Instellingen > Backup & export** en kies **BACKUP TERUGZETTEN**.
2. Selecteer een backup-ZIP. Het bestand wordt eerst gecontroleerd.
3. Bevestig de melding. Pas daarna worden de bestaande gegevens overschreven.
4. Herlaad de app om alle teruggezette gegevens te zien.

## Collecties exporteren

Via **Instellingen > Backup & export** kun je je collecties exporteren naar
**XLSX** of **CSV** (Sample ID, soortnaam, datum, status, checklist en notities).
Foto's zitten niet in het exportbestand.
