/* ===========================================================================
   Banka & ATM — Kosovë | Web GIS
   FAZA 1: hartë, basemaps, 3 shtresat, clustering multishkallor, popup, legjendë
   (Fazat 2 & 3 shtohen me poshte ne te njejtin file)
   =========================================================================== */

const CONFIG = {
  center: [42.58, 20.95],
  zoom: 9,
  colors: { bank: '#1d4ed8', atm: '#059669', kom: '#f59e0b' },
  data: { bank: 'data/bankat.geojson', atm: 'data/atm.geojson', kom: 'data/komunat.geojson' }
};

// Gjendja globale e aplikacionit
const STATE = {
  raw: { bank: null, atm: null, kom: null },   // FeatureCollection origjinale
  filtered: { bank: [], atm: [] },             // features pas filtrit (per shkarkim/analiza)
  mode: null                                   // 'buffer' | 'vgi' | null
};

/* ---------------------- Harta & basemaps ---------------------- */
const map = L.map('map', { zoomControl: true }).setView(CONFIG.center, CONFIG.zoom);

const basemaps = {
  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19, attribution: '© OpenStreetMap' }),
  carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 20, attribution: '© OpenStreetMap, © CARTO' }),
  esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles © Esri' })
};
basemaps.osm.addTo(map);
let currentBasemap = basemaps.osm;

document.getElementById('basemapSel').addEventListener('change', e => {
  map.removeLayer(currentBasemap);
  currentBasemap = basemaps[e.target.value];
  currentBasemap.addTo(map);
});

/* ---------------------- Shtresat (layer groups) ---------------------- */
const clusterBank = L.markerClusterGroup({ maxClusterRadius: 50, disableClusteringAtZoom: 14 });
const clusterAtm  = L.markerClusterGroup({ maxClusterRadius: 50, disableClusteringAtZoom: 14 });
let komLayer = null;          // shtresa e komunave (GeoJSON)
let bufferLayer = L.layerGroup().addTo(map);   // per analizen (Faza 2)

function pointStyle(kind) {
  return { radius: 6, fillColor: CONFIG.colors[kind], color: '#fff', weight: 1.5, opacity: 1, fillOpacity: .9 };
}

// Ndertimi i popup-it per nje pike
function pointPopup(p, kind) {
  const tip = kind === 'bank' ? 'Bankë' : 'ATM';
  return `<b>${p.name || tip}</b><br>
          <small>Lloji:</small> ${tip}<br>
          <small>Marka:</small> ${p.banka || '—'}<br>
          <small>Komuna:</small> ${p.komuna || '—'}`;
}

// Krijon markerat nga nje liste features dhe i shton ne cluster-in perkates
function buildMarkers(features, kind, cluster) {
  cluster.clearLayers();
  features.forEach(f => {
    const c = f.geometry.coordinates;       // [lon,lat]
    const m = L.circleMarker([c[1], c[0]], pointStyle(kind));
    m.feature = f;
    m.bindPopup(pointPopup(f.properties, kind));
    cluster.addLayer(m);
  });
}

/* ---------------------- Stili & popup i komunave ---------------------- */
function komStyle() {
  return { color: CONFIG.colors.kom, weight: 1.5, fillColor: CONFIG.colors.kom, fillOpacity: .05 };
}
function komOnEach(feature, layer) {
  const p = feature.properties;
  layer.bindPopup(`<b>${p.name}</b><br><small>Banka:</small> ${p.banka_count} &nbsp; <small>ATM:</small> ${p.atm_count}`);
  layer.on({
    mouseover: e => e.target.setStyle({ fillOpacity: .25, weight: 2.5 }),
    mouseout:  e => { if (!STATE.choropleth) komLayer.resetStyle(e.target); }
  });
}

/* ---------------------- Legjenda / çelësi hartografik ---------------------- */
function buildLegend() {
  document.getElementById('legend').innerHTML = `
    <div class="row"><span class="swatch bank"></span> Bankë</div>
    <div class="row"><span class="swatch atm"></span> ATM</div>
    <div class="row"><span class="swatch line"></span> Kufi komune</div>
    <div class="row" style="margin-top:8px"><small>Në zoom të vogël pikat grupohen (cluster); në zoom të madh shfaqen individualisht.</small></div>`;
}

/* ---------------------- Ngarkimi i të dhënave ---------------------- */
async function loadData() {
  try {
    const [b, a, k] = await Promise.all([
      fetch(CONFIG.data.bank).then(r => r.json()),
      fetch(CONFIG.data.atm).then(r => r.json()),
      fetch(CONFIG.data.kom).then(r => r.json())
    ]);
    STATE.raw.bank = b; STATE.raw.atm = a; STATE.raw.kom = k;

    // Komunat
    komLayer = L.geoJSON(k, { style: komStyle, onEachFeature: komOnEach }).addTo(map);

    // Pikat
    refreshPoints(b.features, a.features);

    // Ploteso filtrat (Faza 2) + legjenda
    populateFilters();
    buildLegend();
    map.fitBounds(komLayer.getBounds(), { padding: [10, 10] });
  } catch (err) {
    alert('Gabim në ngarkimin e të dhënave. Hape aplikacionin përmes një serveri (jo file://).\n\n' + err);
    console.error(err);
  }
}

// Rifreskon pikat ne harte (perdoret edhe nga filtri ne Faza 2)
function refreshPoints(bankFeatures, atmFeatures) {
  STATE.filtered.bank = bankFeatures;
  STATE.filtered.atm = atmFeatures;
  buildMarkers(bankFeatures, 'bank', clusterBank);
  buildMarkers(atmFeatures, 'atm', clusterAtm);
  if (document.getElementById('lyrBank').checked && !map.hasLayer(clusterBank)) map.addLayer(clusterBank);
  if (document.getElementById('lyrAtm').checked && !map.hasLayer(clusterAtm)) map.addLayer(clusterAtm);
  updateResultCount();
}

function updateResultCount() {
  const n = STATE.filtered.bank.length + STATE.filtered.atm.length;
  document.getElementById('resultCount').textContent =
    `Shfaqen: ${STATE.filtered.bank.length} banka, ${STATE.filtered.atm.length} ATM (gjithsej ${n}).`;
}

/* ---------------------- Kontrolli i shtresave ---------------------- */
function toggleLayer(checkbox, layer) {
  if (checkbox.checked) map.addLayer(layer); else map.removeLayer(layer);
}
document.getElementById('lyrBank').addEventListener('change', e => toggleLayer(e.target, clusterBank));
document.getElementById('lyrAtm').addEventListener('change', e => toggleLayer(e.target, clusterAtm));
document.getElementById('lyrKom').addEventListener('change', e => toggleLayer(e.target, komLayer));

clusterBank.addTo(map);
clusterAtm.addTo(map);

/* ---------------------- Responsive: menu toggle ---------------------- */
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ===========================================================================
   FAZA 2 — Kërkim, filtër, analizë hapësinore, simbolizim dinamik, shkarkim
   =========================================================================== */

/* ---------- Mbushja e filtrave (komuna + marka) ---------- */
function populateFilters() {
  const komSet = new Set(), bankSet = new Set();
  STATE.raw.kom.features.forEach(f => komSet.add(f.properties.name));
  [...STATE.raw.bank.features, ...STATE.raw.atm.features].forEach(f => {
    if (f.properties.banka && f.properties.banka !== 'E panjohur') bankSet.add(f.properties.banka);
  });
  const komSel = document.getElementById('filterKomuna');
  [...komSet].sort((a, b) => a.localeCompare(b)).forEach(k => komSel.add(new Option(k, k)));
  const bankSel = document.getElementById('filterBanka');
  [...bankSet].sort((a, b) => a.localeCompare(b)).forEach(b => bankSel.add(new Option(b, b)));
}

/* ---------- Filtri (kërkim + selektim sipas kritereve) ---------- */
function matchFeature(f, txt, kom, banka) {
  const p = f.properties;
  if (txt && !((p.name || '').toLowerCase().includes(txt) || (p.banka || '').toLowerCase().includes(txt))) return false;
  if (kom && p.komuna !== kom) return false;
  if (banka && p.banka !== banka) return false;
  return true;
}
function applyFilter() {
  const txt = document.getElementById('searchText').value.trim().toLowerCase();
  const kom = document.getElementById('filterKomuna').value;
  const banka = document.getElementById('filterBanka').value;
  const b = STATE.raw.bank.features.filter(f => matchFeature(f, txt, kom, banka));
  const a = STATE.raw.atm.features.filter(f => matchFeature(f, txt, kom, banka));
  refreshPoints(b, a);
  // Zoom te rezultatet nese ka
  const all = [...b, ...a].map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
  if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.2));
}
function resetFilter() {
  document.getElementById('searchText').value = '';
  document.getElementById('filterKomuna').value = '';
  document.getElementById('filterBanka').value = '';
  refreshPoints(STATE.raw.bank.features, STATE.raw.atm.features);
  map.fitBounds(komLayer.getBounds(), { padding: [10, 10] });
}
document.getElementById('applyFilter').addEventListener('click', applyFilter);
document.getElementById('resetFilter').addEventListener('click', resetFilter);
document.getElementById('searchText').addEventListener('keyup', e => { if (e.key === 'Enter') applyFilter(); });

/* ---------- Analizë hapësinore: buffer rreth një pike ---------- */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const bufferBtn = document.getElementById('bufferMode');
bufferBtn.addEventListener('click', () => {
  setMode(STATE.mode === 'buffer' ? null : 'buffer');
  bufferBtn.classList.toggle('active', STATE.mode === 'buffer');
  document.getElementById('analysisInfo').textContent =
    STATE.mode === 'buffer' ? 'Kliko në hartë për qendrën e buffer-it.' : '';
});
function runBuffer(latlng) {
  const radius = parseFloat(document.getElementById('bufferRadius').value) || 500;
  bufferLayer.clearLayers();
  L.circle(latlng, { radius, color: '#ef4444', weight: 2, fillOpacity: .08 }).addTo(bufferLayer);
  L.circleMarker(latlng, { radius: 5, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }).addTo(bufferLayer);

  // Pikat brenda rrezes (selektim + analizë)
  let nb = 0, na = 0;
  const within = [];
  STATE.raw.bank.features.forEach(f => {
    const c = f.geometry.coordinates;
    if (haversine(latlng.lat, latlng.lng, c[1], c[0]) <= radius) { nb++; within.push(['Bankë', f]); }
  });
  STATE.raw.atm.features.forEach(f => {
    const c = f.geometry.coordinates;
    if (haversine(latlng.lat, latlng.lng, c[1], c[0]) <= radius) { na++; within.push(['ATM', f]); }
  });
  // Theksoji rezultatet
  within.forEach(([, f]) => {
    const c = f.geometry.coordinates;
    L.circleMarker([c[1], c[0]], { radius: 8, color: '#ef4444', weight: 2, fill: false }).addTo(bufferLayer);
  });
  document.getElementById('analysisInfo').innerHTML =
    `Brenda <b>${radius} m</b>: <b>${nb}</b> banka, <b>${na}</b> ATM.`;
  STATE.lastAnalysis = within;   // perdoret per shkarkim
}

/* ---------- Simbolizim dinamik: choropleth sipas nr. bankave (6d) ---------- */
function choroColor(n) {
  return n > 30 ? '#7f1d1d' : n > 15 ? '#b91c1c' : n > 8 ? '#ef4444' :
         n > 3 ? '#fb923c' : n > 0 ? '#fde68a' : '#f1f5f9';
}
document.getElementById('symbByCount').addEventListener('change', e => {
  STATE.choropleth = e.target.checked;
  if (e.target.checked) {
    komLayer.setStyle(f => ({ color: '#fff', weight: 1, fillColor: choroColor(f.properties.banka_count), fillOpacity: .75 }));
    buildChoroLegend();
  } else {
    komLayer.setStyle(komStyle());
    buildLegend();
  }
});
function buildChoroLegend() {
  const grades = [0, 1, 4, 9, 16, 31], labels = ['0', '1–3', '4–8', '9–15', '16–30', '>30'];
  let html = '<div class="row"><b>Banka për komunë</b></div><div class="legend-scale">';
  grades.forEach((g, i) => html += `<i style="background:${choroColor(g === 0 ? 0 : g)}" title="${labels[i]}"></i>`);
  html += '</div><div class="row"><small>' + labels.join(' · ') + '</small></div>';
  document.getElementById('legend').innerHTML = html;
}

/* ---------- Klik në hartë (buffer ose VGI) ---------- */
map.on('click', e => {
  if (STATE.mode === 'buffer') runBuffer(e.latlng);
  else if (STATE.mode === 'vgi') setVgiPoint(e.latlng);   // Faza 3
});
function setMode(m) { STATE.mode = m; map.getContainer().style.cursor = m ? 'crosshair' : ''; }

/* ---------- Shkarkim sipas kriterit (6b) ---------- */
function currentFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: [...STATE.filtered.bank, ...STATE.filtered.atm]
  };
}
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}
document.getElementById('dlGeojson').addEventListener('click', () => {
  downloadFile('banka_atm_filtruar.geojson', JSON.stringify(currentFeatureCollection(), null, 2), 'application/json');
});
document.getElementById('dlCsv').addEventListener('click', () => {
  const rows = [['lloji', 'name', 'banka', 'komuna', 'lon', 'lat']];
  currentFeatureCollection().features.forEach(f => {
    const p = f.properties, c = f.geometry.coordinates;
    rows.push([p.fclass, p.name, p.banka, p.komuna, c[0], c[1]]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile('banka_atm_filtruar.csv', '﻿' + csv, 'text/csv;charset=utf-8');
});

/* ===========================================================================
   FAZA 3 — VGI / Crowdsourcing (editim i kufizuar me moderim)
   Punon menjëherë me localStorage; nëse vendos çelësat e Supabase, ruan online.
   =========================================================================== */
const SUPABASE = {
  url: '',          // p.sh. 'https://xxxx.supabase.co'  (lere bosh per modalitet lokal)
  anonKey: '',      // anon public key
  table: 'contributions'
};
const vgiPendingLayer = L.layerGroup().addTo(map);
let vgiPoint = null;

const vgiBtn = document.getElementById('vgiMode');
vgiBtn.addEventListener('click', () => {
  const on = STATE.mode !== 'vgi';
  setMode(on ? 'vgi' : null);
  vgiBtn.classList.toggle('active', on);
  document.getElementById('vgiForm').classList.toggle('hidden', !on);
  document.getElementById('vgiStatus').textContent = on ? 'Kliko në hartë për vendndodhjen.' : '';
});
function setVgiPoint(latlng) {
  vgiPoint = latlng;
  vgiPendingLayer.clearLayers();
  L.marker(latlng).addTo(vgiPendingLayer);
  document.getElementById('vgiCoord').textContent =
    `Koordinatat: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}
document.getElementById('vgiCancel').addEventListener('click', () => {
  document.getElementById('vgiForm').classList.add('hidden');
  vgiBtn.classList.remove('active'); setMode(null); vgiPoint = null; vgiPendingLayer.clearLayers();
});

document.getElementById('vgiForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!vgiPoint) { alert('Zgjedh fillimisht një pikë në hartë.'); return; }
  const contrib = {
    fclass: document.getElementById('vgiType').value,
    name: document.getElementById('vgiName').value.trim() || '(pa emër)',
    banka: getBrandClient(document.getElementById('vgiName').value),
    lon: +vgiPoint.lng.toFixed(6), lat: +vgiPoint.lat.toFixed(6),
    status: 'pending'                 // editim i KUFIZUAR: pret moderim nga prodhuesi
  };
  const ok = await saveContribution(contrib);
  document.getElementById('vgiStatus').textContent = ok
    ? '✅ Faleminderit! Kontributi u ruajt për moderim.'
    : '⚠️ U ruajt lokalisht (Supabase jo i konfiguruar).';
  document.getElementById('vgiForm').reset();
  document.getElementById('vgiForm').classList.add('hidden');
  vgiBtn.classList.remove('active'); setMode(null); vgiPoint = null;
  renderPending();
});

// Normalizim marke ne klient (njesoj si ne prepare-data.ps1)
function getBrandClient(name) {
  const n = (name || '').toLowerCase();
  if (/raif/.test(n)) return 'Raiffeisen Bank';
  if (/procredit|pro credit/.test(n)) return 'ProCredit Bank';
  if (/\bteb\b|t e b/.test(n)) return 'TEB';
  if (/nlb/.test(n)) return 'NLB Banka';
  if (/bpb|biznes/.test(n)) return 'Banka per Biznes (BPB)';
  if (/ekonomik/.test(n)) return 'Banka Ekonomike';
  if (/bkt|kombetare/.test(n)) return 'BKT';
  return name || 'E panjohur';
}

async function saveContribution(c) {
  if (SUPABASE.url && SUPABASE.anonKey) {
    try {
      const r = await fetch(`${SUPABASE.url}/rest/v1/${SUPABASE.table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE.anonKey,
                   Authorization: `Bearer ${SUPABASE.anonKey}`, Prefer: 'return=minimal' },
        body: JSON.stringify(c)
      });
      if (r.ok) return true;
    } catch (err) { console.warn('Supabase dështoi, ruaj lokal:', err); }
  }
  const arr = JSON.parse(localStorage.getItem('vgi') || '[]');
  arr.push(c); localStorage.setItem('vgi', JSON.stringify(arr));
  return false;   // false = ruajtur vetem lokalisht
}
async function getPending() {
  if (SUPABASE.url && SUPABASE.anonKey) {
    try {
      const r = await fetch(`${SUPABASE.url}/rest/v1/${SUPABASE.table}?status=eq.pending&select=*`,
        { headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}` } });
      if (r.ok) return await r.json();
    } catch (err) { /* fallback */ }
  }
  return JSON.parse(localStorage.getItem('vgi') || '[]');
}
async function renderPending() {
  const list = await getPending();
  list.forEach(c => {
    const icon = L.divIcon({ className: '', html: '📌', iconSize: [20, 20] });
    L.marker([c.lat, c.lon], { icon })
      .bindPopup(`<b>${c.name}</b> <small>(propozim/pending)</small><br>Lloji: ${c.fclass}<br>Marka: ${c.banka || '—'}`)
      .addTo(vgiPendingLayer);
  });
}

/* ===========================================================================
   FAZA 4 — Konsumimi i shërbimeve WMS/WFS të GeoServer (pikat 9 & 10)
   Vendos url-në pasi të nisësh GeoServer (lokal ose cloud).
   =========================================================================== */
const GEOSERVER = {
  url: '',                 // p.sh. 'http://localhost:8080/geoserver'  (bosh = çaktivizuar)
  workspace: 'webgis',
  wmsLayers: 'webgis:komunat,webgis:bankat,webgis:atm'
};
let wmsLayer = null;
let wfsLayer = L.layerGroup();

document.getElementById('lyrWms').addEventListener('change', e => {
  if (!GEOSERVER.url) {
    e.target.checked = false;
    document.getElementById('wmsStatus').textContent =
      '⚠️ GEOSERVER.url është bosh. Nise GeoServer dhe vendos URL-në në app.js.';
    return;
  }
  if (e.target.checked) {
    wmsLayer = L.tileLayer.wms(`${GEOSERVER.url}/${GEOSERVER.workspace}/wms`, {
      layers: GEOSERVER.wmsLayers, format: 'image/png', transparent: true, version: '1.3.0'
    }).addTo(map);
    document.getElementById('wmsStatus').textContent = '✅ Shtresa WMS u ngarkua nga GeoServer.';
  } else if (wmsLayer) {
    map.removeLayer(wmsLayer);
  }
});

// Test WFS: merr bankat si GeoJSON nga WFS-i ynë dhe i vizato (deshmon pikën 10)
document.getElementById('wfsTest').addEventListener('click', async () => {
  if (!GEOSERVER.url) { document.getElementById('wmsStatus').textContent = '⚠️ Vendos GEOSERVER.url në app.js.'; return; }
  const u = `${GEOSERVER.url}/${GEOSERVER.workspace}/wfs?service=WFS&version=2.0.0&request=GetFeature` +
            `&typeNames=${GEOSERVER.workspace}:bankat&outputFormat=application/json&srsName=EPSG:4326`;
  try {
    const r = await fetch(u); const gj = await r.json();
    wfsLayer.clearLayers();
    L.geoJSON(gj, { pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 7, color: '#a21caf', fillOpacity: .8 }) }).addTo(wfsLayer);
    wfsLayer.addTo(map);
    document.getElementById('wmsStatus').textContent = `✅ WFS: u morën ${gj.features.length} objekte nga GeoServer.`;
  } catch (err) {
    document.getElementById('wmsStatus').textContent = '⚠️ WFS dështoi (kontrollo URL/CORS): ' + err;
  }
});

loadData().then(renderPending);
