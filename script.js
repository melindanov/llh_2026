/* ──────────────────────────────────────────
   STATE — filled by Thunkable, never hardcoded here
────────────────────────────────────────── */
let materials = [];
let activeFilter = 'Alle';
let profile = { name: 'Tischlerei Mayer', city: 'Steyr' };
let pendingImageUrl = null;

/* ──────────────────────────────────────────
   BRIDGE: THUNKABLE → WEBVIEWER
────────────────────────────────────────── */
function navigateTo(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screen);
  if (target) target.classList.add('active');
}

function setProfile(name, city) {
  profile.name = name; profile.city = city;
  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-city').textContent = city;
  document.getElementById('profile-avatar').textContent = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}

ThunkableWebviewerExtension.receiveMessage(function(message) {
  try {
    const obj = JSON.parse(message);

    if (obj.type === 'navigate' && obj.screen) {
      navigateTo(obj.screen);
    }

    if (obj.type === 'loadMaterials') {
      materials = obj.data || [];
      renderFeed();
      renderMine();
      updateStatPosts();
    }

    if (obj.type === 'setProfile') {
      setProfile(obj.name, obj.city);
      renderMine();
      updateStatPosts();
    }

    if (obj.type === 'imageSelected' && obj.url) {
      pendingImageUrl = obj.url;
      const slot = document.getElementById('photo-slot');
      const preview = document.getElementById('photo-preview');
      const placeholder = document.getElementById('photo-placeholder');
      const overlay = document.getElementById('photo-overlay');
      preview.src = obj.url;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      overlay.style.display = 'flex';
      slot.classList.add('filled');
    }
  } catch(e) {
    console.error('Fehler beim Verarbeiten der Nachricht:', e);
  }
});

/* ──────────────────────────────────────────
   BRIDGE: WEBVIEWER → THUNKABLE
────────────────────────────────────────── */
function sendAction(action, payload) {
  const msg = JSON.stringify(Object.assign({ action: action }, payload));
  if (window.ThunkableWebviewerExtension) {
    ThunkableWebviewerExtension.postMessage(msg);
  } else {
    console.log('postMessage (keine Bridge vorhanden):', msg);
  }
}

/* ──────────────────────────────────────────
   FEED
────────────────────────────────────────── */
function getClaimedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('dibs_claimed') || '[]')); } catch(e) { return new Set(); }
}
function saveClaimedSet(s) {
  try { localStorage.setItem('dibs_claimed', JSON.stringify([...s])); } catch(e) {}
}

function renderFeed() {
  const list = document.getElementById('feed-list');
  const claimed = getClaimedSet();
  const items = materials.filter(m => activeFilter === 'Alle' || m.category === activeFilter);

  if (!items.length) {
    list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">Keine Materialien in dieser Kategorie</div>';
    return;
  }

  list.innerHTML = items.map((m, i) => {
    const isClaimedByMe = claimed.has(String(m.id));
    let btnHtml;
    if (m.status !== 'verfügbar') {
      btnHtml = `<button class="btn-claim sent" disabled><i class="fa-solid fa-clock"></i> ${m.status === 'reserviert' ? 'Reserviert' : 'Abgeholt'}</button>`;
    } else if (isClaimedByMe) {
      btnHtml = `<button class="btn-claim sent" data-id="${m.id}" data-claimed="true"><i class="fa-solid fa-check"></i> Anfrage gesendet · Abbrechen</button>`;
    } else {
      btnHtml = `<button class="btn-claim" data-id="${m.id}" data-claimed="false">DIBS!</button>`;
    }
    return `
    <div class="card" style="animation-delay:${i*0.05}s">
      <div class="card-header">
        <div><div class="card-title">${escHtml(m.title)}</div><div class="card-meta">${escHtml(m.postedBy)}</div></div>
        <div class="cat-badge cat-${m.category}">${m.category}</div>
      </div>
      <div class="card-qty"><i class="fa-solid fa-box"></i>${m.qty} ${m.unit}
        ${m.plz ? `<span style="margin-left:8px;color:var(--muted)"><i class="fa-solid fa-location-dot"></i> ${m.plz}</span>` : ''}
      </div>
      ${m.imageUrl ? `<button class="btn-sm view-photo" data-url="${escHtml(m.imageUrl)}" style="width:100%;margin-bottom:8px;justify-content:center;display:flex;align-items:center;gap:6px;"><i class="fa-regular fa-image"></i> Foto ansehen</button>` : ''}
      ${btnHtml}
    </div>`;
  }).join('');

  list.querySelectorAll('.view-photo').forEach(btn => {
    btn.addEventListener('click', () => {
      sendAction('viewImage', { url: btn.dataset.url });
    });
  });

  list.querySelectorAll('.btn-claim[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const wasClaimed = btn.dataset.claimed === 'true';
      const nowClaimed = !wasClaimed;

      const set = getClaimedSet();
      if (nowClaimed) set.add(String(id)); else set.delete(String(id));
      saveClaimedSet(set);

      btn.disabled = true;
      btn.textContent = 'Wird gesendet…';
      sendAction('toggleClaim', { id: id, claimed: nowClaimed });
    });
  });
}

document.querySelectorAll('.photo-choice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendAction('pickImage', { source: btn.dataset.source });
  });
});

document.querySelectorAll('#feed-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#feed-chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.cat;
    renderFeed();
  });
});

/* ──────────────────────────────────────────
   POST
────────────────────────────────────────── */
document.getElementById('btn-post').addEventListener('click', () => {
  const title = document.getElementById('f-title').value.trim();
  const category = document.getElementById('f-cat').value;
  const qty = parseFloat(document.getElementById('f-qty').value);
  const unit = document.getElementById('f-unit').value;
  const plz = document.getElementById('f-plz').value.trim();
  const description = document.getElementById('f-desc').value.trim();

  if (!title) return shakeInput('f-title');
  if (!category) return shakeInput('f-cat');
  if (!qty || qty <= 0) return shakeInput('f-qty');
  if (!plz) return shakeInput('f-plz');

  sendAction('post', { data: { title, category, qty, unit, plz, description, imageUrl: pendingImageUrl || '' } });

  document.getElementById('f-title').value = '';
  document.getElementById('f-cat').value = '';
  document.getElementById('f-qty').value = '';
  document.getElementById('f-plz').value = '';
  document.getElementById('f-desc').value = '';
  pendingImageUrl = null;
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-placeholder').style.display = 'block';
  document.getElementById('photo-overlay').style.display = 'none';
  document.getElementById('photo-slot').classList.remove('filled');
});

function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = 'var(--red)';
  setTimeout(() => { el.style.borderColor = ''; }, 1200);
  el.focus();
}

/* ──────────────────────────────────────────
   MY POSTS
────────────────────────────────────────── */
const STATUS_NEXT_LABEL = { 'verfügbar': '→ Reserviert', 'reserviert': '→ Abgeholt', 'abgeholt': '→ Verfügbar' };

function renderMine() {
  const owned = materials.filter(m => m.postedBy === profile.name);
  const list = document.getElementById('mine-list');

  if (!owned.length) {
    list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">Noch keine eigenen Posts</div>';
    return;
  }

  list.innerHTML = owned.map((m, i) => `
    <div class="my-post-card" style="animation-delay:${i*0.05}s" data-id="${m.id}">
      <div class="mp-header">
        <div class="mp-title">${escHtml(m.title)}</div>
        <span class="status-pill status-${m.status}">${m.status}</span>
      </div>
      <div class="mp-meta">${m.category} · ${m.qty} ${m.unit} · PLZ ${m.plz}
        ${m.requestCount > 0 ? `<span class="req-dot">${m.requestCount}</span>` : ''}
      </div>
      <div class="mp-actions">
        <button class="btn-sm advance" data-action="advance">${STATUS_NEXT_LABEL[m.status]}</button>
        <button class="btn-sm danger" data-action="delete"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('[data-id]').dataset.id;
      const action = btn.dataset.action;
      if (action === 'delete' && !confirm('Wirklich löschen?')) return;
      sendAction(action, { id: id });
    });
  });
}

function updateStatPosts() {
  document.getElementById('stat-posts').textContent = materials.filter(m => m.postedBy === profile.name).length;
}

function escHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ──────────────────────────────────────────
   INIT — render empty state, then tell Thunkable we're ready
────────────────────────────────────────── */
renderFeed();
sendAction('ready', {});
