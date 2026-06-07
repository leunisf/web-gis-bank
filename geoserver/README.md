# Faza 4 — GeoServer: WMS & WFS (pikat 9 & 10)

Ky folder publikon shtresat tona si **WMS** (pika 9a) dhe **WFS** (pika 9b), që pastaj i konsumon
aplikacioni ynë dhe palë të treta (pika 10).

---

## A. Nisja e GeoServer (lokal me Docker)

> Kërkon **Docker Desktop** të instaluar. (Për cloud, shih seksionin C.)

```bash
cd geoserver
docker compose up -d
```

- GeoServer: <http://localhost:8080/geoserver>  → login **admin / geoserver**
- Të dhënat tona janë të montuara brenda në:
  - `data/shapefiles/` (shapefile origjinal)
  - `data/geojson/` (GeoJSON i përgatitur në Fazën 0)

## B. Publikimi i shtresave

1. **Workspace:** `Data → Workspaces → Add new` → emri `webgis`, namespace URI `http://webgis.local`.
2. **Store (shapefile):** `Data → Stores → Add new store → Shapefile`
   - Workspace: `webgis`, emri: `bankat`
   - File: `file:data/shapefiles/Bankat/Bankat.shp` → Save
   - Përsërit për `ATM/ATM.shp` dhe `Shapefile_Komunat/eks-mun-border.shp`.
   - *(Alternativë: një "Directory of spatial files" për të tria njëherësh.)*
3. **Publish layer:** te çdo store kliko **Publish**.
   - Te skeda **Data**: vendos **Declared SRS** (`EPSG:4326` për banka/ATM, `EPSG:6870` për komunat),
     dhe **Compute from data / native bounds** → **Compute from native bounds**.
   - Save.
4. **Stili (opsional):** `Data → Styles` — ngarko një SLD për banka/ATM/komuna (shih `styles/` ose përdor default).

## C. URL-të e shërbimeve (këto i jep për palë të treta — pika 9)

Pas publikimit, shërbimet janë gati:

**WMS — GetCapabilities**
```
http://localhost:8080/geoserver/webgis/wms?service=WMS&version=1.3.0&request=GetCapabilities
```
**WMS — GetMap (shembull tile për një shtresë)**
```
http://localhost:8080/geoserver/webgis/wms?service=WMS&version=1.1.1&request=GetMap
   &layers=webgis:bankat&bbox=20.0,41.8,21.9,43.3&width=768&height=600&srs=EPSG:4326&format=image/png
```
**WFS — GetCapabilities**
```
http://localhost:8080/geoserver/webgis/wfs?service=WFS&version=2.0.0&request=GetCapabilities
```
**WFS — GetFeature (GeoJSON)**
```
http://localhost:8080/geoserver/webgis/wfs?service=WFS&version=2.0.0&request=GetFeature
   &typeNames=webgis:bankat&outputFormat=application/json
```

## D. Konsumimi i shërbimeve (pika 10)

1. **Në aplikacionin tonë:** hap `app.js`, te objekti `GEOSERVER` vendos `url` (p.sh. `http://localhost:8080/geoserver`)
   dhe `workspace: 'webgis'`. Pastaj në panelin **Shtresat** shfaqet checkbox-i “WMS nga GeoServer”.
2. **Në QGIS (palë e tretë):** `Layer → Add Layer → Add WMS/WFS Layer` → New → vendos URL-në e GetCapabilities → Connect → zgjedh shtresat.

---

## E. Deploy në CLOUD (që të jetë “krejt online”)

GeoServer-i është imazh Docker, pra hostohet kudo ku pranon Docker:

| Platformë | Si |
|---|---|
| **Render.com** | New → Web Service → “Deploy an existing image” → `kartoza/geoserver:2.25.2`, port 8080. Free tier (fle pas pasivitetit). |
| **Koyeb / Fly.io** | Njëlloj, deploy nga imazhi Docker. |
| **VPS (Hetzner/DigitalOcean)** | `docker compose up -d` direkt në server. |

> Pas deploy, ndrysho `GEOSERVER.url` në `app.js` me URL-në publike (https) dhe sigurohu që **CORS** është i lejuar
> (te compose: `CORS_ENABLED=true`), që GitHub Pages të mund t’i thërrasë shërbimet nga browser-i.

> **Siguria:** ndrysho fjalëkalimin `admin/geoserver` para se ta nxjerrësh online.
