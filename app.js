/* ===========================================================================
   Banka & ATM — Kosovë | Web GIS
   FAZA 1: hartë, basemaps, 3 shtresat, clustering multishkallor, popup, legjendë
   (Fazat 2 & 3 shtohen me poshte ne te njejtin file)
   =========================================================================== */

const CONFIG = {
  center: [42.58, 20.95],
  zoom: 9,
  colors: { bank: '#1d4ed8', atm: '#059669', transfer: '#7c3aed', kom: '#f59e0b' },
  data: { bank: 'data/bankat.geojson', atm: 'data/atm.geojson', transfer: 'data/transferet.geojson', kom: 'data/komunat.geojson' }
};

// Gjendja globale e aplikacionit
const STATE = {
  raw: { bank: null, atm: null, transfer: null, kom: null },   // FeatureCollection origjinale
  filtered: { bank: [], atm: [], transfer: [] },               // features pas filtrit (per shkarkim/analiza)
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

// Shkalla grafike (poshte-djathtas) — perditesohet automatikisht ne cdo zoom
L.control.scale({ position: 'bottomright', metric: true, imperial: false, maxWidth: 180 }).addTo(map);

document.getElementById('basemapSel').addEventListener('change', e => {
  map.removeLayer(currentBasemap);
  currentBasemap = basemaps[e.target.value];
  currentBasemap.addTo(map);
});

/* ---------------------- Shtresat (layer groups) ---------------------- */
const clusterBank = L.markerClusterGroup({ maxClusterRadius: 40, disableClusteringAtZoom: 12 });
const clusterAtm  = L.markerClusterGroup({ maxClusterRadius: 40, disableClusteringAtZoom: 12 });
const clusterTransfer = L.markerClusterGroup({ maxClusterRadius: 40, disableClusteringAtZoom: 12 });
let komLayer = null;          // shtresa e komunave (GeoJSON)
let bufferLayer = L.layerGroup().addTo(map);   // per analizen (Faza 2)

// Etiketa shqip e llojit
function typeLabel(kind) {
  return kind === 'bank' ? 'Bankë' : kind === 'atm' ? 'ATM' : 'Transfer';
}
// Ikona te ndryshme per cdo lloj (vetem emoji, pa rreth). Banka me e madhe.
const TYPE_ICON = {
  bank:     { emoji: '🏦', size: 30 },
  atm:      { emoji: '🏧', size: 22 },
  transfer: { emoji: '💱', size: 22 }
};
function typeIcon(kind) {
  const t = TYPE_ICON[kind];
  return L.divIcon({
    className: 'type-pin',
    html: `<span class="pin-emoji" style="font-size:${t.size}px">${t.emoji}</span>`,
    iconSize: [t.size, t.size], iconAnchor: [t.size / 2, t.size / 2], popupAnchor: [0, -t.size / 2]
  });
}

// Ndertimi i popup-it per nje pike (pa "Marka" ne detaje)
function pointPopup(p, kind) {
  const tip = typeLabel(kind);
  return `<b>${p.name || tip}</b><br>
          <small>Lloji:</small> ${tip}<br>
          <small>Komuna:</small> ${p.komuna || '—'}
          <div style="margin-top:6px"><button type="button" class="report-btn">⚠️ Raporto problem</button></div>`;
}

// Krijon markerat nga nje liste features dhe i shton ne cluster-in perkates
function buildMarkers(features, kind, cluster) {
  cluster.clearLayers();
  const icon = typeIcon(kind);
  features.forEach(f => {
    const c = f.geometry.coordinates;       // [lon,lat]
    const m = L.marker([c[1], c[0]], { icon });
    m.feature = f;
    m.bindPopup(pointPopup(f.properties, kind));
    // Lidh butonin "Raporto" me te dhenat e kesaj pike kur hapet popup-i
    m.on('popupopen', e => {
      const btn = e.popup.getElement().querySelector('.report-btn');
      if (btn) btn.onclick = () => openReport(f.properties, c);
    });
    cluster.addLayer(m);
  });
}

/* ---------------------- Stili & popup i komunave ---------------------- */
function komStyle() {
  return { color: CONFIG.colors.kom, weight: 1.5, fillColor: CONFIG.colors.kom, fillOpacity: .05, className: 'kom-path' };
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
    <div class="row"><span class="leg-emoji" style="font-size:20px">🏦</span> Bankë</div>
    <div class="row"><span class="leg-emoji">🏧</span> ATM</div>
    <div class="row"><span class="leg-emoji">💱</span> Transfer (WU, Ria, këmbim...)</div>
    <div class="row"><span class="swatch line"></span> Kufi komune</div>
    <div class="row" style="margin-top:8px"><small>Në zoom të vogël pikat grupohen (cluster); në zoom të madh shfaqen individualisht.</small></div>`;
}

/* ---------------------- Ngarkimi i të dhënave ---------------------- */
async function loadData() {
  try {
    const [b, a, t, k] = await Promise.all([
      fetch(CONFIG.data.bank).then(r => r.json()),
      fetch(CONFIG.data.atm).then(r => r.json()),
      fetch(CONFIG.data.transfer).then(r => r.json()),
      fetch(CONFIG.data.kom).then(r => r.json())
    ]);
    STATE.raw.bank = b; STATE.raw.atm = a; STATE.raw.transfer = t; STATE.raw.kom = k;

    // Komunat
    komLayer = L.geoJSON(k, { style: komStyle, onEachFeature: komOnEach }).addTo(map);

    // Pikat
    refreshPoints(b.features, a.features, t.features);

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
function refreshPoints(bankFeatures, atmFeatures, transferFeatures) {
  STATE.filtered.bank = bankFeatures;
  STATE.filtered.atm = atmFeatures;
  STATE.filtered.transfer = transferFeatures;
  buildMarkers(bankFeatures, 'bank', clusterBank);
  buildMarkers(atmFeatures, 'atm', clusterAtm);
  buildMarkers(transferFeatures, 'transfer', clusterTransfer);
  if (document.getElementById('lyrBank').checked && !map.hasLayer(clusterBank)) map.addLayer(clusterBank);
  if (document.getElementById('lyrAtm').checked && !map.hasLayer(clusterAtm)) map.addLayer(clusterAtm);
  if (document.getElementById('lyrTransfer').checked && !map.hasLayer(clusterTransfer)) map.addLayer(clusterTransfer);
  updateResultCount();
}

function updateResultCount() {
  const nb = STATE.filtered.bank.length, na = STATE.filtered.atm.length, nt = STATE.filtered.transfer.length;
  document.getElementById('resultCount').textContent =
    `Shfaqen: ${nb} banka, ${na} ATM, ${nt} transfere (gjithsej ${nb + na + nt}).`;
}

/* ---------------------- Kontrolli i shtresave ---------------------- */
function toggleLayer(checkbox, layer) {
  if (checkbox.checked) map.addLayer(layer); else map.removeLayer(layer);
}
document.getElementById('lyrBank').addEventListener('change', e => toggleLayer(e.target, clusterBank));
document.getElementById('lyrAtm').addEventListener('change', e => toggleLayer(e.target, clusterAtm));
document.getElementById('lyrTransfer').addEventListener('change', e => toggleLayer(e.target, clusterTransfer));
document.getElementById('lyrKom').addEventListener('change', e => toggleLayer(e.target, komLayer));

clusterBank.addTo(map);
clusterAtm.addTo(map);
clusterTransfer.addTo(map);

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
  [...STATE.raw.bank.features, ...STATE.raw.atm.features, ...STATE.raw.transfer.features].forEach(f => {
    if (f.properties.banka && f.properties.banka !== 'E panjohur') bankSet.add(f.properties.banka);
  });
  const komSel = document.getElementById('filterKomuna');
  [...komSet].sort((a, b) => a.localeCompare(b)).forEach(k => komSel.add(new Option(k, k)));
  const bankSel = document.getElementById('filterBanka');
  [...bankSet].sort((a, b) => a.localeCompare(b)).forEach(b => bankSel.add(new Option(b, b)));
  // I njejti liste markash per formularin e raportimit
  const repSel = document.getElementById('repBanka');
  [...bankSet].sort((a, b) => a.localeCompare(b)).forEach(b => repSel.add(new Option(b, b)));
}

/* ---------- Filtri (kërkim + selektim sipas kritereve) ---------- */
function matchFeature(f, txt, kom, banka, lloji) {
  const p = f.properties;
  if (txt && !((p.name || '').toLowerCase().includes(txt) || (p.banka || '').toLowerCase().includes(txt))) return false;
  if (kom && p.komuna !== kom) return false;
  if (banka && p.banka !== banka) return false;
  if (lloji && p.fclass !== lloji) return false;   // Lloji: bank / atm / transfer
  return true;
}
function applyFilter() {
  const txt = document.getElementById('searchText').value.trim().toLowerCase();
  const kom = document.getElementById('filterKomuna').value;
  const banka = document.getElementById('filterBanka').value;
  const lloji = document.getElementById('filterLloji').value;
  const sel = t => STATE.raw[t].features.filter(f => matchFeature(f, txt, kom, banka, lloji));
  const b = sel('bank'), a = sel('atm'), tr = sel('transfer');
  refreshPoints(b, a, tr);
  // Zoom te rezultatet nese ka
  const all = [...b, ...a, ...tr].map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
  if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.2));
}
function resetFilter() {
  document.getElementById('searchText').value = '';
  document.getElementById('filterKomuna').value = '';
  document.getElementById('filterBanka').value = '';
  document.getElementById('filterLloji').value = '';
  refreshPoints(STATE.raw.bank.features, STATE.raw.atm.features, STATE.raw.transfer.features);
  map.fitBounds(komLayer.getBounds(), { padding: [10, 10] });
}
document.getElementById('applyFilter').addEventListener('click', applyFilter);
document.getElementById('resetFilter').addEventListener('click', resetFilter);
document.getElementById('searchText').addEventListener('keyup', e => { if (e.key === 'Enter') applyFilter(); });
// Apliko automatikisht sapo ndryshohet dropdown-i (pa pasur nevoje per butonin "Apliko")
document.getElementById('filterKomuna').addEventListener('change', applyFilter);
document.getElementById('filterBanka').addEventListener('change', applyFilter);
document.getElementById('filterLloji').addEventListener('change', applyFilter);

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
  let nb = 0, na = 0, nt = 0;
  const within = [];
  STATE.raw.bank.features.forEach(f => {
    const c = f.geometry.coordinates;
    if (haversine(latlng.lat, latlng.lng, c[1], c[0]) <= radius) { nb++; within.push(['Bankë', f]); }
  });
  STATE.raw.atm.features.forEach(f => {
    const c = f.geometry.coordinates;
    if (haversine(latlng.lat, latlng.lng, c[1], c[0]) <= radius) { na++; within.push(['ATM', f]); }
  });
  STATE.raw.transfer.features.forEach(f => {
    const c = f.geometry.coordinates;
    if (haversine(latlng.lat, latlng.lng, c[1], c[0]) <= radius) { nt++; within.push(['Transfer', f]); }
  });
  // Theksoji rezultatet
  within.forEach(([, f]) => {
    const c = f.geometry.coordinates;
    L.circleMarker([c[1], c[0]], { radius: 8, color: '#ef4444', weight: 2, fill: false }).addTo(bufferLayer);
  });
  document.getElementById('analysisInfo').innerHTML =
    `Brenda <b>${radius} m</b>: <b>${nb}</b> banka, <b>${na}</b> ATM, <b>${nt}</b> transfere.`;
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

/* ---------- Matja e distancës (klik radhazi në hartë) ---------- */
let measureLayer = L.layerGroup().addTo(map);
const measureBtn = document.getElementById('measureMode');
measureBtn.addEventListener('click', () => {
  const on = STATE.mode !== 'measure';
  setMode(on ? 'measure' : null);
  measureBtn.classList.toggle('active', on);
  if (on) { STATE.measurePts = []; measureLayer.clearLayers(); }
  document.getElementById('analysisInfo').textContent =
    on ? 'Kliko pikat radhazi për të matur distancën (Pastro për të rifilluar).' : '';
});
function fmtDist(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`; }
function runMeasure(latlng) {
  STATE.measurePts = STATE.measurePts || [];
  STATE.measurePts.push(latlng);
  const pts = STATE.measurePts;
  measureLayer.clearLayers();
  L.polyline(pts, { color: '#0ea5e9', weight: 3, dashArray: '6 4' }).addTo(measureLayer);
  let total = 0;
  pts.forEach((p, i) => {
    L.circleMarker(p, { radius: 4, color: '#0ea5e9', fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(measureLayer);
    if (i > 0) total += haversine(pts[i - 1].lat, pts[i - 1].lng, p.lat, p.lng);
  });
  if (pts.length > 1) {
    L.tooltip({ permanent: true, direction: 'top', className: 'measure-tip' })
      .setLatLng(pts[pts.length - 1]).setContent(`Σ ${fmtDist(total)}`).addTo(measureLayer);
  }
  document.getElementById('analysisInfo').innerHTML =
    `Distanca (${pts.length} pika): <b>${fmtDist(total)}</b>. Kliko për të vazhduar.`;
}

/* ---------- Pastro analizën (buffer + matje) ---------- */
document.getElementById('clearAnalysis').addEventListener('click', () => {
  bufferLayer.clearLayers(); measureLayer.clearLayers();
  STATE.measurePts = []; STATE.lastAnalysis = null;
  document.getElementById('analysisInfo').textContent = '';
  setMode(null);
  bufferBtn.classList.remove('active'); measureBtn.classList.remove('active');
});

/* ---------- Klik në hartë (buffer / matje / VGI) ---------- */
map.on('click', e => {
  if (STATE.mode === 'buffer') runBuffer(e.latlng);
  else if (STATE.mode === 'measure') runMeasure(e.latlng);
  else if (STATE.mode === 'vgi') setVgiPoint(e.latlng);   // Faza 3
});
function setMode(m) {
  STATE.mode = m;
  map.getContainer().style.cursor = m ? 'crosshair' : '';
  updateKomClickable();
}

/* ---------- Selektimi i komunave (klik) — mund të ndalohet ---------- */
function updateKomClickable() {
  // Komunat klikueshme vetëm nëse checkbox-i lejon DHE s'ka mode aktive (buffer/matje/vgi)
  const allow = document.getElementById('lyrKomClick').checked && !STATE.mode;
  map.getContainer().classList.toggle('no-kom-click', !allow);
}
document.getElementById('lyrKomClick').addEventListener('change', updateKomClickable);

/* ---------- Shkarkim sipas kriterit (6b) ---------- */
function currentFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: [...STATE.filtered.bank, ...STATE.filtered.atm, ...STATE.filtered.transfer]
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
   RAPORTIM — "ndonjë ATM nuk punon" etj. (raporto saktë bankës + koment)
   Ruan ne Supabase tabelen 'reports' (shih db/supabase-reports.sql);
   nese s'ka lidhje, ruan lokalisht (localStorage).
   =========================================================================== */
function openReport(p, coords) {
  document.getElementById('repType').value = p.fclass || 'atm';
  const repSel = document.getElementById('repBanka');
  if (p.banka && p.banka !== 'E panjohur') {
    if (![...repSel.options].some(o => o.value === p.banka)) repSel.add(new Option(p.banka, p.banka));
    repSel.value = p.banka;
  } else { repSel.value = ''; }
  STATE.reportPoint = coords ? { lon: coords[0], lat: coords[1], name: p.name, osm_id: p.osm_id } : null;
  document.getElementById('repCoord').textContent = coords
    ? `Pika: ${p.name || '—'} (${coords[1].toFixed(5)}, ${coords[0].toFixed(5)})` : 'Pika: — (zgjedh nga harta)';
  document.getElementById('reportPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('repKoment').focus();
}

document.getElementById('reportForm').addEventListener('submit', async e => {
  e.preventDefault();
  const rp = STATE.reportPoint || {};
  const report = {
    fclass:  document.getElementById('repType').value,
    banka:   document.getElementById('repBanka').value || null,
    problem: document.getElementById('repProblem').value,
    koment:  document.getElementById('repKoment').value.trim() || null,
    name:    rp.name || null,
    lon:     rp.lon ?? null,
    lat:     rp.lat ?? null,
    status:  'pending'
  };
  const ok = await saveReport(report);
  document.getElementById('repStatus').textContent = ok
    ? '✅ Faleminderit! Raporti u dërgua.'
    : '⚠️ U ruajt lokalisht (Supabase reports jo i konfiguruar).';
  document.getElementById('reportForm').reset();
  STATE.reportPoint = null;
  document.getElementById('repCoord').textContent = 'Pika: —';
});

async function saveReport(r) {
  if (SUPABASE.url && SUPABASE.anonKey) {
    try {
      const res = await fetch(`${SUPABASE.url}/rest/v1/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE.anonKey,
                   Authorization: `Bearer ${SUPABASE.anonKey}`, Prefer: 'return=minimal' },
        body: JSON.stringify(r)
      });
      if (res.ok) return true;
    } catch (err) { console.warn('Supabase reports dështoi, ruaj lokal:', err); }
  }
  const arr = JSON.parse(localStorage.getItem('reports') || '[]');
  arr.push(r); localStorage.setItem('reports', JSON.stringify(arr));
  return false;
}

/* ===========================================================================
   FAZA 3 — VGI / Crowdsourcing (editim i kufizuar me moderim)
   Punon menjëherë me localStorage; nëse vendos çelësat e Supabase, ruan online.
   =========================================================================== */
const SUPABASE = {
  url: 'https://qqaizejspemlsneqmeav.supabase.co',   // Project URL
  anonKey: 'sb_publishable_h4VK0t3mZSJC49IjjYleuQ_jETsANDD',   // publishable (public) key
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
