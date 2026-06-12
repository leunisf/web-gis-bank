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

/* ===========================================================================
   PERKTHIMI / I18N — Shqip (sq) & Anglisht (en)
   Butoni #langToggle ne header e ndron gjuhen; zgjedhja ruhet ne localStorage.
   Tekstet statike vijne nga atributet data-i18n / data-i18n-html / data-i18n-ph
   ne index.html; tekstet dinamike thirren me t('celesi', ...args).
   =========================================================================== */
const I18N = {
  sq: {
    doc_title: 'Banka & ATM — Kosovë | Web GIS',
    brand_h1: '🏦 Banka & ATM', subtitle: 'Kosovë — Web GIS',
    search_h2: '🔎 Kërkim & Filtër', search_ph: 'Kërko emër banke / ATM...',
    lbl_komuna: 'Komuna', opt_all: '— Të gjitha —', lbl_lloji: 'Lloji',
    opt_bank: 'Bankë', opt_atm: 'ATM', opt_transfer: 'Transfer',
    lbl_marka: 'Marka / Banka', btn_apply: 'Apliko', btn_reset: 'Pastro',
    analysis_h2: '📐 Analizë hapësinore',
    lbl_buffer: 'Buffer rreth një pike (klik në hartë)', btn_buffer: '📍 Zgjedh pikën',
    lbl_measure: 'Matje distance (klik pika radhazi)', btn_measure: '📏 Mat distancën', btn_clear: '🧹 Pastro',
    chk_komclick: 'Lejo selektimin e komunave (klik)',
    chk_choro: 'Ngjyros komunat sipas nr. bankave (choropleth - 6d)',
    dl_h2: '⬇️ Shkarkim', dl_hint: 'Shkarko rezultatin aktual (sipas filtrit):',
    rep_h2: '⚠️ Raporto problem',
    rep_hint: 'Raporto nëse një ATM nuk punon ose ka problem. Kliko <b>“⚠️ Raporto problem”</b> te një pikë në hartë (plotësohet vetë), ose zgjedh këtu.',
    lbl_banka: 'Banka', opt_choose_bank: '— Zgjedh bankën —', lbl_problem: 'Problemi',
    rep_p_nuk: 'ATM nuk punon', rep_p_jashte: 'Jashtë shërbimit / pa para',
    rep_p_vend: 'Vendndodhje e gabuar', rep_p_mbyllur: "E mbyllur / s'ekziston më", rep_p_tjeter: 'Tjetër',
    lbl_pershkrim: 'Përshkrim / koment', rep_ph: 'Përshkruaj problemin...',
    rep_coord_empty: 'Pika: —', btn_send_report: 'Dërgo raportin',
    vgi_h2: '➕ Kontribo (VGI)', vgi_hint: 'Shto një bankë/ATM të re. Kontributi ruhet për moderim.',
    btn_vgi_add: '📌 Shto në hartë', lbl_emri: 'Emri / Marka', vgi_ph: 'p.sh. NLB Banka',
    vgi_coord_empty: 'Koordinatat: —', btn_save: 'Ruaj', btn_cancel: 'Anulo',
    layers_h2: '🗂️ Shtresat', chk_kom: 'Komunat (kufijtë)', chk_bank: 'Bankat',
    chk_atm: 'ATM', chk_transfer: 'Transferet (WU, Ria...)', lbl_basemap: 'Sfondi (basemap)',
    opt_esri: 'Esri Satelit', chk_wms: 'WMS nga GeoServer (pika 9/10)',
    wms_status_default: 'Konfiguro <code>GEOSERVER.url</code> në app.js pasi të nisësh GeoServer.',
    legend_h2: '🗝️ Çelësi hartografik',
    credits: 'Të dhënat: OpenStreetMap (WGS84).',
    // --- Tekste dinamike ---
    type_bank: 'Bankë', type_atm: 'ATM', type_transfer: 'Transfer',
    pop_lloji: 'Lloji:', pop_komuna: 'Komuna:', pop_banka: 'Banka:', pop_atm: 'ATM:',
    pop_histori: 'Historiku', pop_report_btn: '⚠️ Raporto problem',
    legend_bank: 'Bankë', legend_atm: 'ATM', legend_transfer: 'Transfer (WU, Ria, këmbim...)',
    legend_kom: 'Kufi komune',
    legend_note: 'Në zoom të vogël pikat grupohen (cluster); në zoom të madh shfaqen individualisht.',
    result_count: (nb, na, nt) => `Shfaqen: ${nb} banka, ${na} ATM, ${nt} transfere (gjithsej ${nb + na + nt}).`,
    err_load: 'Gabim në ngarkimin e të dhënave. Hape aplikacionin përmes një serveri (jo file://).',
    buffer_prompt: 'Kliko në hartë për qendrën e buffer-it.',
    buffer_result: (r, nb, na, nt) => `Brenda <b>${r} m</b>: <b>${nb}</b> banka, <b>${na}</b> ATM, <b>${nt}</b> transfere.`,
    measure_prompt: 'Kliko pikat radhazi për të matur distancën (Pastro për të rifilluar).',
    measure_result: (n, d) => `Distanca (${n} pika): <b>${d}</b>. Kliko për të vazhduar.`,
    choro_title: 'Banka për komunë',
    report_ok: '✅ Faleminderit! Raporti u dërgua.',
    report_local: '⚠️ U ruajt lokalisht (Supabase reports jo i konfiguruar).',
    rep_coord_full: (name, lat, lon) => `Pika: ${name || '—'} (${lat}, ${lon})`,
    rep_coord_pick: 'Pika: — (zgjedh nga harta)',
    vgi_prompt: 'Kliko në hartë për vendndodhjen.',
    vgi_pick_first: 'Zgjedh fillimisht një pikë në hartë.',
    vgi_ok: '✅ Faleminderit! Kontributi u ruajt për moderim.',
    vgi_local: '⚠️ U ruajt lokalisht (Supabase jo i konfiguruar).',
    vgi_coord: (lat, lon) => `Koordinatat: ${lat}, ${lon}`,
    vgi_pending_tag: '(propozim/pending)', vgi_marka: 'Marka:', vgi_del_btn: '🗑️ Fshi këtë pikë',
    vgi_del_confirm: 'Të fshihet kjo pikë e shtuar?', vgi_deleted: '🗑️ Pika u fshi.',
    vgi_del_fail: "⚠️ S'u fshi dot online (kërkohet leja në Supabase). U hoq nga ruajtja lokale nëse ekzistonte.",
    wms_empty: '⚠️ GEOSERVER.url është bosh. Nise GeoServer dhe vendos URL-në në app.js.',
    wms_loaded: '✅ Shtresa WMS u ngarkua nga GeoServer.',
    wfs_empty: '⚠️ Vendos GEOSERVER.url në app.js.',
    wfs_ok: (n) => `✅ WFS: u morën ${n} objekte nga GeoServer.`,
    wfs_fail: (e) => '⚠️ WFS dështoi (kontrollo URL/CORS): ' + e
  },
  en: {
    doc_title: 'Banks & ATMs — Kosovo | Web GIS',
    brand_h1: '🏦 Banks & ATMs', subtitle: 'Kosovo — Web GIS',
    search_h2: '🔎 Search & Filter', search_ph: 'Search bank / ATM name...',
    lbl_komuna: 'Municipality', opt_all: '— All —', lbl_lloji: 'Type',
    opt_bank: 'Bank', opt_atm: 'ATM', opt_transfer: 'Transfer',
    lbl_marka: 'Brand / Bank', btn_apply: 'Apply', btn_reset: 'Clear',
    analysis_h2: '📐 Spatial analysis',
    lbl_buffer: 'Buffer around a point (click on map)', btn_buffer: '📍 Pick point',
    lbl_measure: 'Distance measurement (click points in sequence)', btn_measure: '📏 Measure distance', btn_clear: '🧹 Clear',
    chk_komclick: 'Allow selecting municipalities (click)',
    chk_choro: 'Color municipalities by bank count (choropleth - 6d)',
    dl_h2: '⬇️ Download', dl_hint: 'Download the current result (per filter):',
    rep_h2: '⚠️ Report a problem',
    rep_hint: 'Report if an ATM is out of order or has an issue. Click <b>“⚠️ Report a problem”</b> on a map point (auto-filled), or choose here.',
    lbl_banka: 'Bank', opt_choose_bank: '— Choose bank —', lbl_problem: 'Problem',
    rep_p_nuk: 'ATM not working', rep_p_jashte: 'Out of service / no cash',
    rep_p_vend: 'Wrong location', rep_p_mbyllur: "Closed / no longer exists", rep_p_tjeter: 'Other',
    lbl_pershkrim: 'Description / comment', rep_ph: 'Describe the problem...',
    rep_coord_empty: 'Point: —', btn_send_report: 'Send report',
    vgi_h2: '➕ Contribute (VGI)', vgi_hint: 'Add a new bank/ATM. The contribution is saved for moderation.',
    btn_vgi_add: '📌 Add on map', lbl_emri: 'Name / Brand', vgi_ph: 'e.g. NLB Banka',
    vgi_coord_empty: 'Coordinates: —', btn_save: 'Save', btn_cancel: 'Cancel',
    layers_h2: '🗂️ Layers', chk_kom: 'Municipalities (borders)', chk_bank: 'Banks',
    chk_atm: 'ATMs', chk_transfer: 'Transfers (WU, Ria...)', lbl_basemap: 'Background (basemap)',
    opt_esri: 'Esri Satellite', chk_wms: 'WMS from GeoServer (point 9/10)',
    wms_status_default: 'Configure <code>GEOSERVER.url</code> in app.js after starting GeoServer.',
    legend_h2: '🗝️ Map legend',
    credits: 'Data: OpenStreetMap (WGS84).',
    // --- Dynamic text ---
    type_bank: 'Bank', type_atm: 'ATM', type_transfer: 'Transfer',
    pop_lloji: 'Type:', pop_komuna: 'Municipality:', pop_banka: 'Banks:', pop_atm: 'ATMs:',
    pop_histori: 'History', pop_report_btn: '⚠️ Report a problem',
    legend_bank: 'Bank', legend_atm: 'ATM', legend_transfer: 'Transfer (WU, Ria, exchange...)',
    legend_kom: 'Municipality border',
    legend_note: 'At low zoom points are grouped (cluster); at high zoom they show individually.',
    result_count: (nb, na, nt) => `Showing: ${nb} banks, ${na} ATMs, ${nt} transfers (total ${nb + na + nt}).`,
    err_load: 'Error loading data. Open the app through a server (not file://).',
    buffer_prompt: 'Click on the map for the buffer center.',
    buffer_result: (r, nb, na, nt) => `Within <b>${r} m</b>: <b>${nb}</b> banks, <b>${na}</b> ATMs, <b>${nt}</b> transfers.`,
    measure_prompt: 'Click points in sequence to measure distance (Clear to restart).',
    measure_result: (n, d) => `Distance (${n} points): <b>${d}</b>. Click to continue.`,
    choro_title: 'Banks per municipality',
    report_ok: '✅ Thank you! The report was sent.',
    report_local: '⚠️ Saved locally (Supabase reports not configured).',
    rep_coord_full: (name, lat, lon) => `Point: ${name || '—'} (${lat}, ${lon})`,
    rep_coord_pick: 'Point: — (choose from map)',
    vgi_prompt: 'Click on the map for the location.',
    vgi_pick_first: 'First choose a point on the map.',
    vgi_ok: '✅ Thank you! The contribution was saved for moderation.',
    vgi_local: '⚠️ Saved locally (Supabase not configured).',
    vgi_coord: (lat, lon) => `Coordinates: ${lat}, ${lon}`,
    vgi_pending_tag: '(proposal/pending)', vgi_marka: 'Brand:', vgi_del_btn: '🗑️ Delete this point',
    vgi_del_confirm: 'Delete this added point?', vgi_deleted: '🗑️ Point deleted.',
    vgi_del_fail: "⚠️ Could not delete online (Supabase permission required). Removed from local storage if it existed.",
    wms_empty: '⚠️ GEOSERVER.url is empty. Start GeoServer and set the URL in app.js.',
    wms_loaded: '✅ WMS layer loaded from GeoServer.',
    wfs_empty: '⚠️ Set GEOSERVER.url in app.js.',
    wfs_ok: (n) => `✅ WFS: fetched ${n} features from GeoServer.`,
    wfs_fail: (e) => '⚠️ WFS failed (check URL/CORS): ' + e
  }
};
let LANG = localStorage.getItem('lang') || 'sq';
// Perkthen nje celes; nese vlera eshte funksion, e thirr me argumentet e dhena.
function t(key, ...args) {
  const v = (I18N[LANG] || {})[key] ?? I18N.sq[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
// Vendos tekstet statike ne DOM sipas atributeve data-i18n*.
function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
}
// Ri-lidh popup-et e komunave me gjuhen aktuale.
function rebindKomPopups() {
  if (komLayer) komLayer.eachLayer(l => { if (l.feature) komOnEach(l.feature, l); });
}
// Ndron gjuhen, ruan zgjedhjen dhe rifreskon te gjitha tekstet (statike + dinamike).
function setLang(lang) {
  LANG = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.title = t('doc_title');
  applyStaticI18n();
  const btn = document.getElementById('langToggle');
  if (btn) btn.textContent = lang === 'sq' ? 'EN' : 'SQ';   // shfaq gjuhen ne te cilen kalon
  if (STATE.raw.bank) {                                     // rifresko vetem pasi jane ngarkuar te dhenat
    refreshPoints(STATE.filtered.bank, STATE.filtered.atm, STATE.filtered.transfer);
    rebindKomPopups();
    if (STATE.choropleth) buildChoroLegend(); else buildLegend();
    renderPending();
  }
}
document.getElementById('langToggle').addEventListener('click', () => setLang(LANG === 'sq' ? 'en' : 'sq'));

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

// Etiketa e llojit sipas gjuhes aktuale
function typeLabel(kind) {
  return kind === 'bank' ? t('type_bank') : kind === 'atm' ? t('type_atm') : t('type_transfer');
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

// Historiku i shkurtër i bankave (feature shtesë VETËM për bankat).
// Burimi: njohuri të përgjithshme publike mbi sektorin bankar të Kosovës.
const HISTORIK = {
  'Raiffeisen Bank': { viti: '2002',
    sq: 'Pjesë e grupit austriak Raiffeisen Bank International. Hyri në Kosovë në 2002 me blerjen e American Bank of Kosovo; sot ndër bankat më të mëdha në vend.',
    en: 'Part of the Austrian group Raiffeisen Bank International. Entered Kosovo in 2002 by acquiring American Bank of Kosovo; today one of the largest banks in the country.' },
  'ProCredit Bank': { viti: '1999',
    sq: 'Themeluar në 1999 si “Micro Enterprise Bank” (MEB) — banka e parë private në Kosovën e pasluftës. U riemërua ProCredit Bank në 2003 (ProCredit Holding, Gjermani).',
    en: 'Founded in 1999 as “Micro Enterprise Bank” (MEB) — the first private bank in post-war Kosovo. Renamed ProCredit Bank in 2003 (ProCredit Holding, Germany).' },
  'TEB': { viti: '2008',
    sq: 'TEB Sh.A. — bankë me kapital turk (TEB, partner i BNP Paribas). Nisi veprimtarinë në Kosovë në vitin 2008.',
    en: 'TEB Sh.A. — a bank with Turkish capital (TEB, partner of BNP Paribas). Started operating in Kosovo in 2008.' },
  'NLB Banka': { viti: '2008',
    sq: 'Pjesë e grupit slloven Nova Ljubljanska Banka (NLB); dikur e njohur si NLB Prishtina. Ndër bankat kryesore në treg.',
    en: 'Part of the Slovenian group Nova Ljubljanska Banka (NLB); formerly known as NLB Prishtina. One of the leading banks on the market.' },
  'BKT': { viti: '2007',
    sq: 'Banka Kombëtare Tregtare — banka më e vjetër në Shqipëri (1925). Hapi degën e parë në Kosovë në vitin 2007.',
    en: 'Banka Kombëtare Tregtare (National Commercial Bank) — the oldest bank in Albania (1925). Opened its first branch in Kosovo in 2007.' },
  'Banka Ekonomike': { viti: '2001',
    sq: 'Bankë vendore kosovare, e themeluar në 2001; ndër bankat e para me kapital vendor.',
    en: 'A local Kosovar bank, founded in 2001; among the first banks with domestic capital.' },
  'Banka per Biznes (BPB)': { viti: '2001',
    sq: 'Banka për Biznes — bankë vendore kosovare e themeluar në 2001, e fokusuar te ndërmarrjet dhe bizneset.',
    en: 'Banka për Biznes (Bank for Business) — a local Kosovar bank founded in 2001, focused on enterprises and businesses.' },
  'Credins Bank': { viti: '2003',
    sq: 'Bankë me origjinë shqiptare (themeluar në Shqipëri më 2003); zgjeroi veprimtarinë në Kosovë vitet e fundit.',
    en: 'A bank of Albanian origin (founded in Albania in 2003); expanded its operations into Kosovo in recent years.' },
  'Ziraat Bank': { viti: '1863',
    sq: 'Türkiye Cumhuriyeti Ziraat Bankası — bankë shtetërore turke me histori që nga 1863; vepron me degë në Kosovë.',
    en: 'Türkiye Cumhuriyeti Ziraat Bankası — a Turkish state bank with a history dating to 1863; operates branches in Kosovo.' },
  'Isbank': { viti: '1924',
    sq: 'Türkiye İş Bankası — bankë turke e themeluar në 1924; e pranishme në Kosovë me degë.',
    en: 'Türkiye İş Bankası — a Turkish bank founded in 1924; present in Kosovo with branches.' },
  'Banka Qendrore': { viti: '2008',
    sq: 'Banka Qendrore e Republikës së Kosovës (BQK) — autoriteti monetar i vendit, e themeluar në 2008, pasardhëse e Autoritetit Qendror Bankar.',
    en: 'Central Bank of the Republic of Kosovo (CBK) — the country’s monetary authority, established in 2008, successor of the Central Banking Authority.' },
  'Komercijalna Banka': { viti: '',
    sq: 'Bankë me kapital serb që vepron kryesisht në komunat me shumicë serbe në veri të Kosovës.',
    en: 'A bank with Serbian capital operating mainly in Serbian-majority municipalities in northern Kosovo.' },
  'Postanska Stedionica': { viti: '',
    sq: 'Banka Poštanska štedionica (kapital serb), vepron kryesisht në komunat veriore me shumicë serbe.',
    en: 'Banka Poštanska štedionica (Serbian capital), operating mainly in northern Serbian-majority municipalities.' },
  'Narodna Banka': { viti: '',
    sq: 'Degë e sistemit bankar serb, e pranishme në komunat veriore me shumicë serbe.',
    en: 'A branch of the Serbian banking system, present in northern Serbian-majority municipalities.' }
};

// Logot e markave (skedare lokale ne ./logos). Çelesi = vlera e fushes 'banka'.
// Markat pa logo (E panjohur, Kembimore, Postanska, Komercijalna...) bien te emri pa imazh.
const BRAND_LOGO = {
  'Ria / Capital': 'ria', 'Raiffeisen Bank': 'raiffeisen', 'TEB': 'teb', 'NLB Banka': 'nlb',
  'ProCredit Bank': 'procredit', 'Banka Ekonomike': 'ekonomike', 'BKT': 'bkt',
  'Banka per Biznes (BPB)': 'bpb', 'Western Union': 'wu', 'Ziraat Bank': 'ziraat',
  'Credins Bank': 'credins', 'Isbank': 'isbank', 'MoneyGram': 'moneygram',
  'Banka Qendrore': 'bqk', 'Narodna Banka': 'narodna'
};
function brandLogo(banka) {
  const s = BRAND_LOGO[banka];
  return s ? `logos/${s}.png` : null;
}

// Ndertimi i popup-it per nje pike (logo e markes ngjitur emrit lart)
function pointPopup(p, kind) {
  const tip = typeLabel(kind);
  let extra = '';
  if (kind === 'bank') {                       // historiku — feature vetëm për bankat
    const h = HISTORIK[p.banka];
    if (h) extra = `<div class="histori"><b>ℹ️ ${t('pop_histori')}${h.viti ? ' (' + h.viti + ')' : ''}:</b> ${h[LANG] || h.sq}</div>`;
  }
  const logo = brandLogo(p.banka);
  const logoImg = logo ? `<img class="popup-logo" src="${logo}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  return `<div class="popup-title">${logoImg}<b>${p.name || tip}</b></div>
          <small>${t('pop_lloji')}</small> ${tip}<br>
          <small>${t('pop_komuna')}</small> ${p.komuna || '—'}${extra}
          <div style="margin-top:6px"><button type="button" class="report-btn">${t('pop_report_btn')}</button></div>`;
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
// Stili bazë i një komune, sipas modalitetit (choropleth ose normal)
function komBaseStyle(feature) {
  return STATE.choropleth
    ? { color: '#fff', weight: 1, fillColor: choroColor(feature.properties.banka_count), fillOpacity: .75 }
    : komStyle();
}
function komOnEach(feature, layer) {
  const p = feature.properties;
  layer.bindPopup(`<b>${p.name}</b><br><small>${t('pop_banka')}</small> ${p.banka_count} &nbsp; <small>${t('pop_atm')}</small> ${p.atm_count}`);
  layer.on({
    mouseover: e => e.target.setStyle({ weight: 3, fillOpacity: STATE.choropleth ? .9 : .25 }),
    // Kthe gjithmonë në stilin bazë (rregullon mbetjen e hijezimit gjatë choropleth-it)
    mouseout:  e => e.target.setStyle(komBaseStyle(e.target.feature))
  });
}

/* ---------------------- Legjenda / çelësi hartografik ---------------------- */
function buildLegend() {
  document.getElementById('legend').innerHTML = `
    <div class="row"><span class="leg-emoji" style="font-size:20px">🏦</span> ${t('legend_bank')}</div>
    <div class="row"><span class="leg-emoji">🏧</span> ${t('legend_atm')}</div>
    <div class="row"><span class="leg-emoji">💱</span> ${t('legend_transfer')}</div>
    <div class="row"><span class="swatch line"></span> ${t('legend_kom')}</div>
    <div class="row" style="margin-top:8px"><small>${t('legend_note')}</small></div>`;
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
    alert(t('err_load') + '\n\n' + err);
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
  document.getElementById('resultCount').textContent = t('result_count', nb, na, nt);
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
    STATE.mode === 'buffer' ? t('buffer_prompt') : '';
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
  document.getElementById('analysisInfo').innerHTML = t('buffer_result', radius, nb, na, nt);
  STATE.lastAnalysis = within;   // perdoret per shkarkim
}

/* ---------- Simbolizim dinamik: choropleth sipas nr. bankave (6d) ---------- */
function choroColor(n) {
  return n > 30 ? '#7f1d1d' : n > 15 ? '#b91c1c' : n > 8 ? '#ef4444' :
         n > 3 ? '#fb923c' : n > 0 ? '#fde68a' : '#f1f5f9';
}
// Fsheh/shfaq pikat (banka/atm/transfer) sipas checkbox-eve perkatese
function setPointsVisible(visible) {
  [['lyrBank', clusterBank], ['lyrAtm', clusterAtm], ['lyrTransfer', clusterTransfer]].forEach(([id, cl]) => {
    if (visible) { if (document.getElementById(id).checked) map.addLayer(cl); }
    else map.removeLayer(cl);
  });
}
// Etiketat me emrin e komunes ne qender te secilit poligon
let komLabelLayer = L.layerGroup();
// Centroid (qender mase) i unazes me te madhe — bie BRENDA poligonit, ndryshe nga
// qendra e bounding-box-it qe mund te bjere mbi nje komune fqinje (p.sh. Viti mbi Kllokot).
function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  if (Math.abs(a) < 1e-12) {                       // unaze e degjeneruar -> mesatare e thjeshte
    const m = ring.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
    return [m[1] / ring.length, m[0] / ring.length];
  }
  a *= 0.5;
  return [cy / (6 * a), cx / (6 * a)];             // [lat, lon] per Leaflet
}
function komLabelPoint(feature) {
  const g = feature.geometry;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  let best = null, bestArea = -1;
  polys.forEach(poly => {                          // zgjedh unazen e jashtme me siperfaqen me te madhe
    const ring = poly[0];
    let area = 0;
    for (let i = 0, n = ring.length - 1; i < n; i++) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    area = Math.abs(area);
    if (area > bestArea) { bestArea = area; best = ring; }
  });
  return best ? ringCentroid(best) : null;
}
function showKomLabels(show) {
  komLabelLayer.clearLayers();
  if (!show) { map.removeLayer(komLabelLayer); return; }
  komLayer.eachLayer(l => {
    if (!l.feature) return;
    const center = komLabelPoint(l.feature) || l.getBounds().getCenter();
    L.marker(center, {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: 'kom-label', html: `<span>${l.feature.properties.name}</span>`, iconSize: [0, 0] })
    }).addTo(komLabelLayer);
  });
  map.addLayer(komLabelLayer);
}
document.getElementById('symbByCount').addEventListener('change', e => {
  STATE.choropleth = e.target.checked;
  if (e.target.checked) {
    komLayer.setStyle(f => ({ color: '#fff', weight: 1, fillColor: choroColor(f.properties.banka_count), fillOpacity: .75 }));
    setPointsVisible(false);   // fsheh bankat/atm/transferet
    showKomLabels(true);       // shfaq emrat e komunave ne qender
    buildChoroLegend();
  } else {
    komLayer.setStyle(komStyle());
    showKomLabels(false);      // hiq etiketat
    setPointsVisible(true);    // rikthe pikat (sipas checkbox-eve)
    buildLegend();
  }
});
function buildChoroLegend() {
  const grades = [0, 1, 4, 9, 16, 31], labels = ['0', '1–3', '4–8', '9–15', '16–30', '>30'];
  let html = `<div class="row"><b>${t('choro_title')}</b></div><div class="legend-scale">`;
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
  document.getElementById('analysisInfo').textContent = on ? t('measure_prompt') : '';
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
  document.getElementById('analysisInfo').innerHTML = t('measure_result', pts.length, fmtDist(total));
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
  // Zgjidhje e sigurt: çaktivizo klikimin direkt mbi poligonet SVG të komunave
  if (komLayer) komLayer.eachLayer(l => { if (l._path) l._path.style.pointerEvents = allow ? '' : 'none'; });
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
    ? t('rep_coord_full', p.name, coords[1].toFixed(5), coords[0].toFixed(5)) : t('rep_coord_pick');
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
  document.getElementById('repStatus').textContent = ok ? t('report_ok') : t('report_local');
  document.getElementById('reportForm').reset();
  STATE.reportPoint = null;
  document.getElementById('repCoord').textContent = t('rep_coord_empty');
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
  document.getElementById('vgiStatus').textContent = on ? t('vgi_prompt') : '';
});
function setVgiPoint(latlng) {
  vgiPoint = latlng;
  vgiPendingLayer.clearLayers();
  L.marker(latlng).addTo(vgiPendingLayer);
  document.getElementById('vgiCoord').textContent =
    t('vgi_coord', latlng.lat.toFixed(5), latlng.lng.toFixed(5));
}
document.getElementById('vgiCancel').addEventListener('click', () => {
  document.getElementById('vgiForm').classList.add('hidden');
  vgiBtn.classList.remove('active'); setMode(null); vgiPoint = null; vgiPendingLayer.clearLayers();
});

document.getElementById('vgiForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!vgiPoint) { alert(t('vgi_pick_first')); return; }
  const contrib = {
    fclass: document.getElementById('vgiType').value,
    name: document.getElementById('vgiName').value.trim() || '(pa emër)',
    banka: getBrandClient(document.getElementById('vgiName').value),
    lon: +vgiPoint.lng.toFixed(6), lat: +vgiPoint.lat.toFixed(6),
    status: 'pending'                 // editim i KUFIZUAR: pret moderim nga prodhuesi
  };
  const ok = await saveContribution(contrib);
  document.getElementById('vgiStatus').textContent = ok ? t('vgi_ok') : t('vgi_local');
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
  vgiPendingLayer.clearLayers();
  const list = await getPending();
  list.forEach(c => {
    const icon = L.divIcon({ className: '', html: '📌', iconSize: [20, 20] });
    const m = L.marker([c.lat, c.lon], { icon }).addTo(vgiPendingLayer);
    m.bindPopup(`<b>${c.name}</b> <small>${t('vgi_pending_tag')}</small><br>${t('pop_lloji')} ${c.fclass}<br>${t('vgi_marka')} ${c.banka || '—'}
      <div style="margin-top:6px"><button type="button" class="del-vgi">${t('vgi_del_btn')}</button></div>`);
    m.on('popupopen', e => {
      const btn = e.popup.getElement().querySelector('.del-vgi');
      if (btn) btn.onclick = async () => {
        if (!confirm(t('vgi_del_confirm'))) return;
        const ok = await deleteContribution(c, m);
        document.getElementById('vgiStatus').textContent = ok ? t('vgi_deleted') : t('vgi_del_fail');
      };
    });
  });
}

// Fshin nje kontribut: provon Supabase (DELETE sipas id), pastaj localStorage
async function deleteContribution(c, marker) {
  let ok = false;
  if (SUPABASE.url && SUPABASE.anonKey && c.id != null) {
    try {
      const r = await fetch(`${SUPABASE.url}/rest/v1/${SUPABASE.table}?id=eq.${c.id}`, {
        method: 'DELETE',
        headers: { apikey: SUPABASE.anonKey, Authorization: `Bearer ${SUPABASE.anonKey}` }
      });
      ok = r.ok;
    } catch (err) { /* fallback */ }
  }
  // Hiq edhe nga ruajtja lokale (nëse pika u shtua offline)
  const arr = JSON.parse(localStorage.getItem('vgi') || '[]');
  const arr2 = arr.filter(x => !(x.lat === c.lat && x.lon === c.lon && x.name === c.name));
  if (arr2.length !== arr.length) { localStorage.setItem('vgi', JSON.stringify(arr2)); ok = true; }
  if (ok && marker) vgiPendingLayer.removeLayer(marker);
  return ok;
}

// Vendos gjuhen fillestare (statike) menjehere; rifreskimi dinamik behet pas ngarkimit.
document.documentElement.lang = LANG;
document.title = t('doc_title');
applyStaticI18n();
document.getElementById('langToggle').textContent = LANG === 'sq' ? 'EN' : 'SQ';

loadData().then(renderPending);
