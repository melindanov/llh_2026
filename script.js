const $=id=>document.getElementById(id),CATS=['Holz','Metall','Kunststoff','Textil','Sonstiges'],UNITS=['Stück','kg','m²','m','Liter','Bund'],NEXT={'verfügbar':'→ Reserviert','reserviert':'→ Abgeholt','abgeholt':'→ Verfügbar'};
let materials=[],activeFilter='Alle',profile={name:'Tischlerei Mayer',city:'Steyr'},pendingImageUrl=null;
const esc=s=>s==null?'':String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const send=(action,p={})=>{const m=JSON.stringify({action,...p});window.ThunkableWebviewerExtension?ThunkableWebviewerExtension.postMessage(m):console.log('postMessage:',m)};
const getCl=()=>{try{return new Set(JSON.parse(localStorage.getItem('dibs_claimed')||'[]'))}catch(e){return new Set()}},setCl=s=>{try{localStorage.setItem('dibs_claimed',JSON.stringify([...s]))}catch(e){}};
$('feed-chips').innerHTML=['Alle',...CATS].map((c,i)=>`<div class="chip${i?'':' active'}" data-cat="${c}">${c}</div>`).join('');
$('f-cat').innerHTML='<option value="">Wählen…</option>'+CATS.map(c=>`<option>${c}</option>`).join('');
$('f-unit').innerHTML=UNITS.map(u=>`<option>${u}</option>`).join('');
const navigateTo=s=>{document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));$('screen-'+s)?.classList.add('active')};
const setProfile=(name,city)=>{profile={name,city};$('profile-name').textContent=name;$('profile-city').textContent=city;$('profile-avatar').textContent=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()};
const showPhoto=u=>{$('photo-preview').src=u||'';$('photo-preview').style.display=u?'block':'none';$('photo-placeholder').style.display=u?'none':'block';$('photo-overlay').style.display=u?'flex':'none';$('photo-slot').classList.toggle('filled',!!u)};
const renderAll=()=>{renderFeed();renderMine();$('stat-posts').textContent=materials.filter(m=>m.postedBy===profile.name).length};
ThunkableWebviewerExtension.receiveMessage(msg=>{try{const o=JSON.parse(msg);
 if(o.type==='navigate'&&o.screen)navigateTo(o.screen);
 if(o.type==='loadMaterials'){materials=o.data||[];renderAll()}
 if(o.type==='setProfile'){setProfile(o.name,o.city);renderAll()}
 if(o.type==='imageSelected'&&o.url){pendingImageUrl=o.url;showPhoto(o.url)}
}catch(e){console.error('Fehler beim Verarbeiten der Nachricht:',e)}});
function renderFeed(){const cl=getCl(),it=materials.filter(m=>activeFilter==='Alle'||m.category===activeFilter);
 $('feed-list').innerHTML=it.length?it.map((m,i)=>{const mine=cl.has(String(m.id)),btn=m.status!=='verfügbar'?`<button class="btn-claim sent" disabled><i class="fa-solid fa-clock"></i> ${m.status==='reserviert'?'Reserviert':'Abgeholt'}</button>`:`<button class="btn-claim${mine?' sent':''}" data-id="${m.id}" data-claimed="${mine}">${mine?'<i class="fa-solid fa-check"></i> Anfrage gesendet · Abbrechen':'DIBS!'}</button>`;
 return `<div class="card" style="animation-delay:${i*.05}s"><div class="card-header"><div><div class="card-title">${esc(m.title)}</div><div class="card-meta">${esc(m.postedBy)}</div></div><div class="cat-badge cat-${m.category}">${m.category}</div></div><div class="card-qty"><i class="fa-solid fa-box"></i>${m.qty} ${m.unit}${m.plz?`<span style="margin-left:8px;color:var(--muted)"><i class="fa-solid fa-location-dot"></i> ${esc(m.plz)}</span>`:''}</div>${m.imageUrl?`<button class="btn-sm view-photo" data-url="${esc(m.imageUrl)}" style="width:100%;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:6px"><i class="fa-regular fa-image"></i> Foto ansehen</button>`:''}${btn}</div>`}).join(''):'<div style="padding:32px;text-align:center;color:var(--muted)">Keine Materialien in dieser Kategorie</div>'}
function renderMine(){const o=materials.filter(m=>m.postedBy===profile.name);
 $('mine-list').innerHTML=o.length?o.map((m,i)=>`<div class="my-post-card" style="animation-delay:${i*.05}s" data-id="${m.id}"><div class="mp-header"><div class="mp-title">${esc(m.title)}</div><span class="status-pill status-${m.status}">${m.status}</span></div><div class="mp-meta">${m.category} · ${m.qty} ${m.unit} · PLZ ${esc(m.plz)}${m.requestCount>0?`<span class="req-dot">${m.requestCount}</span>`:''}</div><div class="mp-actions"><button class="btn-sm advance" data-action="advance">${NEXT[m.status]}</button><button class="btn-sm danger" data-action="delete"><i class="fa-regular fa-trash-can"></i></button></div></div>`).join(''):'<div style="padding:32px;text-align:center;color:var(--muted)">Noch keine eigenen Posts</div>'}
document.addEventListener('click',e=>{const chip=e.target.closest('#feed-chips .chip'),pick=e.target.closest('.photo-choice-btn'),view=e.target.closest('.view-photo'),claim=e.target.closest('.btn-claim[data-id]'),act=e.target.closest('#mine-list [data-action]');
 if(chip){document.querySelectorAll('#feed-chips .chip').forEach(c=>c.classList.remove('active'));chip.classList.add('active');activeFilter=chip.dataset.cat;return renderFeed()}
 if(pick)return send('pickImage',{source:pick.dataset.source});
 if(view)return send('viewImage',{url:view.dataset.url});
 if(claim){const now=claim.dataset.claimed!=='true',s=getCl();now?s.add(String(claim.dataset.id)):s.delete(String(claim.dataset.id));setCl(s);claim.disabled=true;claim.textContent='Wird gesendet…';return send('toggleClaim',{id:claim.dataset.id,claimed:now})}
 if(act){if(act.dataset.action==='delete'&&!confirm('Wirklich löschen?'))return;send(act.dataset.action,{id:act.closest('[data-id]').dataset.id})}});
$('btn-post').addEventListener('click',()=>{const v=id=>$(id).value.trim(),d={title:v('f-title'),category:v('f-cat'),qty:parseFloat($('f-qty').value),unit:v('f-unit'),plz:v('f-plz'),description:v('f-desc'),imageUrl:pendingImageUrl||''};
 const bad=!d.title?'f-title':!d.category?'f-cat':!d.qty||d.qty<=0?'f-qty':!d.plz?'f-plz':null;
 if(bad){const el=$(bad);el.style.borderColor='var(--red)';setTimeout(()=>el.style.borderColor='',1200);return el.focus()}
 send('post',{data:d});['f-title','f-cat','f-qty','f-plz','f-desc'].forEach(id=>$(id).value='');pendingImageUrl=null;showPhoto(null)});
renderFeed();send('ready');
