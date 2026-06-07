# 🏦 Banka & ATM — Kosovë | Web GIS

Aplikacion Web GIS për lokalizimin, kërkimin dhe analizën e **bankave** dhe **bankomatëve (ATM)**
në territorin e **Kosovës**. Detyrë kursi për lëndën **Web GIS**.

**Aplikacioni live:** <https://leunisf.github.io/web-gis-bank/>  
**Repo:** <https://github.com/leunisf/web-gis-bank>

---

## Përmbajtja
- Hartë interaktive (Leaflet) me 213 banka, 138 ATM dhe 38 komuna.
- Paraqitje **multishkallore** (clustering) dhe çelës hartografik.
- Kërkim, filtrim, **analizë hapësinore** (buffer, point-in-polygon), **choropleth**.
- **Shkarkim** i të dhënave të filtruara (GeoJSON / CSV).
- **VGI / Crowdsourcing**: shtim i të dhënave nga përdoruesit me moderim.
- Shërbime **WMS / WFS** përmes GeoServer.
- Plotësisht **responsive** (web + telefon).

## Struktura
```
index.html / style.css / app.js   → aplikacioni web (klienti Leaflet)
data/*.geojson                     → të dhënat e përgatitura (Faza 0)
scripts/prepare-data.ps1           → konvertim SHP→GeoJSON + riprojektim + pastrim
scripts/serve.ps1                  → server lokal për parapamje
geoserver/                         → docker-compose + udhëzime WMS/WFS (Faza 4)
db/supabase-contributions.sql      → tabela VGI për Supabase (Faza 3)
docs/                              → raporti i detyrës (10 pikat)
Shapefiles/                        → të dhënat origjinale (burim)
```

## Si ta hapësh lokalisht
```powershell
# 1) Nis server-in lokal (fetch nuk punon nga file://)
.\scripts\serve.ps1
# 2) Hap në browser:
#    http://localhost:8080
```
> Për të rigjeneruar të dhënat nga shapefile-t: `.\scripts\prepare-data.ps1`

## Publikim në GitHub Pages
```bash
git init
git add .
git commit -m "Web GIS: Banka & ATM Kosovë"
git branch -M main
git remote add origin https://github.com/leunisf/web-gis-bank.git
git push -u origin main
```
Pastaj: **GitHub → Settings → Pages → Source: `main` / root → Save**.
Aplikacioni del te <https://leunisf.github.io/web-gis-bank/>.

## Të dhënat & CRS
- Banka/ATM: OpenStreetMap, **EPSG:4326**.
- Komunat: zyrtare, **KOSOVAREF01 / Balkans Zone 7 (EPSG:6870)** → të riprojektuara në **EPSG:4326** (Faza 0).

## Teknologjitë
Leaflet · Leaflet.markercluster · GeoServer (WMS/WFS) · Supabase/PostGIS (VGI) · GitHub Pages.
