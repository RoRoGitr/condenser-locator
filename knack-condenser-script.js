// ============================================================
//  CONDENSER LOCATION PICKER — Knack Custom JavaScript
//  Scene: scene_942  |  Form View: view_1815
//
//  SETUP INSTRUCTIONS:
//  1. Host condenser-locator.html at a public URL (e.g. GitHub Pages)
//  2. Replace LOCATOR_URL below with that URL
//  3. Replace field key placeholders with your real Knack field keys
//  4. Paste this entire block into Knack Builder > Settings > API & Code > JavaScript
// ============================================================

$(document).on('knack-view-render.view_1815', function(event, view, data) {

  // ── CONFIG ──────────────────────────────────────────────────
  const LOCATOR_URL       = 'https://YOUR-HOSTED-URL/condenser-locator.html';
  const FIELD_ADDRESS     = 'field_3';     // Property address (read from parent Permit record)
  const FIELD_LAT         = 'field_XXX';   // ← Replace: Latitude field key
  const FIELD_LNG         = 'field_XXX';   // ← Replace: Longitude field key
  const FIELD_MAP_URL     = 'field_XXX';   // ← Replace: Map URL field key
  // ────────────────────────────────────────────────────────────

  // 1. Read the address from the parent Permit record on this page
  //    Knack stores the connected record's field values on the scene's record object
  let address = '';
  try {
    const sceneData = Knack.router.current_scene_key;
    // Try reading address from the page's record data
    const record = Knack.models[sceneData] && Knack.models[sceneData].toJSON
      ? Knack.models[sceneData].toJSON()
      : null;
    if (record && record[FIELD_ADDRESS]) {
      address = record[FIELD_ADDRESS];
    }
  } catch(e) {}

  // Fallback: try reading from any visible field_3 input already on page
  if (!address) {
    const addrEl = document.querySelector('[data-input-id="' + FIELD_ADDRESS + '"]') ||
                   document.querySelector('#kn-input-' + FIELD_ADDRESS);
    if (addrEl) address = addrEl.value || addrEl.textContent || '';
  }

  // 2. Build iframe src with address pre-loaded
  const encodedAddress = encodeURIComponent(address.trim());
  const iframeSrc = LOCATOR_URL + (encodedAddress ? '?address=' + encodedAddress : '');

  // 3. Build the iframe HTML block
  const iframeHTML = `
    <div id="condenser-locator-wrap" style="
      margin: 20px 0;
      border: 1.5px solid #dde3ec;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(15,30,46,0.10);
    ">
      <iframe
        id="condenser-locator-iframe"
        src="${iframeSrc}"
        width="100%"
        height="560"
        frameborder="0"
        style="display:block;"
        allow="geolocation"
      ></iframe>
    </div>
    <div id="condenser-saved-indicator" style="
      display: none;
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: #166534;
      margin-bottom: 12px;
      font-weight: 500;
    ">
      ✓ Condenser location saved — Lat/Lng and map URL have been recorded.
    </div>
  `;

  // 4. Inject iframe — insert it before the "Condenser Location Screenshot" upload field
  //    Targets the file upload field container; falls back to appending to the form
  const uploadField = document.querySelector('.kn-input-file') ||
                      document.querySelector('form.kn-form');

  if (uploadField) {
    uploadField.insertAdjacentHTML('beforebegin', iframeHTML);
  } else {
    // Fallback: append to form body
    const formEl = document.querySelector('#view_1815 form') ||
                   document.querySelector('#view_1815');
    if (formEl) formEl.insertAdjacentHTML('beforeend', iframeHTML);
  }

  // 5. Listen for postMessage from the iframe
  window.addEventListener('message', function onCondenserMessage(e) {
    if (!e.data || e.data.type !== 'CONDENSER_LOCATION') return;

    const { lat, lng, mapURL } = e.data;

    // Write values into hidden Knack form fields
    setKnackField(FIELD_LAT,    String(lat));
    setKnackField(FIELD_LNG,    String(lng));
    setKnackField(FIELD_MAP_URL, mapURL);

    // Show confirmation indicator
    const indicator = document.getElementById('condenser-saved-indicator');
    if (indicator) indicator.style.display = 'block';

    console.log('[Condenser Picker] Location saved:', { lat, lng, mapURL });
  });

});

// ── Helper: write a value into a Knack form field and trigger change ──
function setKnackField(fieldKey, value) {
  // Try standard text input
  const input = document.querySelector('#kn-input-' + fieldKey + ' input') ||
                document.querySelector('#kn-input-' + fieldKey + ' textarea') ||
                document.querySelector('input[name="' + fieldKey + '"]') ||
                document.querySelector('[data-field-key="' + fieldKey + '"] input');

  if (input) {
    input.value = value;
    // Trigger React/Backbone model update
    input.dispatchEvent(new Event('input',  { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    $(input).trigger('change');
  } else {
    console.warn('[Condenser Picker] Could not find field:', fieldKey);
  }
}
