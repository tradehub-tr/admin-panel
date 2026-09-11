'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data,filtered=[],page=0,view='catalog',single=null;
const pageSize=40;
const kinds={rpc:'Özel işlem / RPC',resource:'Belge / CRUD',docmethod:'Belge metodu',doctype:'Alt tablo şeması'};
const hasFront=r=>r.repos.some(x=>x==='admin-panel'||x==='tradehubfront');
const badges=methods=>(methods||[]).map(m=>'<span class="badge '+esc(m)+'">'+esc(m)+'</span>').join('');
const refs=r=>[...r.usages,...r.references];
function matching(r){
  const repo=$('repo').value,app=$('app').value,kind=$('kind').value,q=$('search').value.toLocaleLowerCase('tr');
  if(repo==='both'&&!(r.repos.includes('admin-panel')&&r.repos.includes('tradehubfront')))return false;
  if(repo==='unmatched'&&hasFront(r))return false;
  if(repo==='missing'&&r.verified!=='missing')return false;
  if(repo==='mock'&&!refs(r).some(u=>u.mock))return false;
  if(repo==='native'&&(!hasFront(r)||!['frappe','crm','erpnext','telephony','helpdesk'].includes(r.app)))return false;
  if(['admin-panel','tradehubfront','tradehub_core'].includes(repo)&&!r.repos.includes(repo))return false;
  if(app&&r.app!==app||kind&&r.kind!==kind)return false;
  if(q&&!([r.name,r.path,r.doc,r.module,r.source,...refs(r).map(u=>u.source)].join(' ').toLocaleLowerCase('tr').includes(q)))return false;
  return true;
}
function current(){return single?[single]:filtered;}
function label(){return single?single.name:$('repo').selectedOptions[0].text+($('app').value?' / '+$('app').value:'');}
function update(){
  filtered=data.entries.filter(matching);
  const rows=current();
  $('result').textContent=rows.length.toLocaleString('tr-TR')+' kayıt'+(single?' · seçilen işlem':'');
  $('page').textContent=(view==='swagger'?'Swagger sayfası ':'')+(page+1)+' / '+Math.max(1,Math.ceil(rows.length/pageSize))+' · sayfada en çok '+pageSize+' kayıt';
  $('pagination').hidden=!['catalog','swagger'].includes(view);
  $('prev').disabled=page===0;$('next').disabled=(page+1)*pageSize>=rows.length;
  if(view==='catalog')renderRows();
  if(view==='swagger')renderSwagger();
  if(view==='dynamic')renderDynamic();
  const params=new URLSearchParams();for(const key of ['repo','app','kind','search'])if($(key).value)params.set(key,$(key).value);
  if(view!=='catalog')params.set('view',view);
  history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));
}
function renderRows(){
  $('rows').innerHTML=filtered.slice(page*pageSize,(page+1)*pageSize).map(r=>{
    const methods=r.methods.length?r.methods:[...new Set(r.usages.map(u=>u.http))];
    const observed=[...new Set(r.usages.map(u=>u.http).filter(x=>x!=='?'))];
    return '<tr><td><button class="endpoint" data-id="'+esc(r.id)+'">'+esc(r.name)+'</button><span class="sub">'+esc(kinds[r.kind])+' · '+esc(r.path)+'</span></td><td>'+badges(methods)+(observed.length?'<span class="sub">Ön yüz: '+esc(observed.join(', '))+'</span>':'')+(r.istable?'<span class="sub">Üst belge içinde</span>':'')+'</td><td>'+esc(r.app)+(r.override?'<span class="sub">→ tradehub_core</span>':'')+'</td><td>'+r.repos.map(x=>'<span class="badge">'+esc(x)+'</span>').join('')+(hasFront(r)?'<span class="sub">'+r.usages.length+' çağrı yeri · '+r.references.length+' adres kaydı</span>':'<span class="sub">Ön yüz eşleşmesi yok</span>')+'</td><td><span class="badge '+(r.verified==='source'?'good':'warning')+'">'+(r.verified==='source'?'Kaynakta mevcut':'Backend eşleşmesi yok')+'</span>'+(refs(r).some(x=>x.mock)?'<span class="sub">Demo/mock notu var</span>':'')+(r.method_mismatches?.length?'<span class="badge warning">HTTP yöntemi farklı</span>':'')+'</td><td><button data-id="'+esc(r.id)+'">İncele ↗</button></td></tr>';
  }).join('')||'<tr><td colspan="6" class="empty">Bu filtrelere uyan kayıt bulunamadı.</td></tr>';
  $('rows').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>detail(data.entries.find(r=>r.id===b.dataset.id)));
}
function changeView(next){view=next;for(const id of ['catalog','swagger','dynamic','scope'])$(id).hidden=id!==view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));update();}
function renderSwagger(spec){
  SwaggerUIBundle({spec:spec||buildSpec(current().slice(page*pageSize,(page+1)*pageSize),label()+' · sayfa '+(page+1),data),dom_id:'#swagger-ui',deepLinking:false,
    docExpansion:'none',filter:true,defaultModelsExpandDepth:-1,validatorUrl:null,
    supportedSubmitMethods:[],tryItOutEnabled:false,showExtensions:false,syntaxHighlight:false,
    requestInterceptor:req=>{if(!req.url.startsWith(location.origin))throw new Error('Katalog inceleme modunda.');return req;}});
}
function download(name,body,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([body],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function detail(r){
  $('detailTitle').textContent=r.name;
  const rows=r.params||[];
  const permission=r.kind==='resource'||r.kind==='doctype'?'Rol ve belge izinleri geçerlidir.':r.guest?'Whitelist misafir erişimine açık; fonksiyonun ek kontrolleri olabilir.':'Oturum/API kimliği gerekir; ek rol ve belge kontrolleri olabilir.';
  $('detailBody').innerHTML='<p>'+badges(r.methods)+' <span class="badge">'+esc(kinds[r.kind])+'</span> <span class="badge">'+esc(r.app)+'</span></p><pre>'+esc(r.path)+'</pre><p>'+esc(permission)+'</p>'+
    (r.verified==='missing'?'<div class="notice">Bu çağrının whitelisted karşılığı taranan kaynaklarda bulunamadı. Canlı ortam ayrıca doğrulanmalı.</div>':'')+
    (r.method_mismatches?.length?'<div class="notice">Ön yüzde '+esc(r.method_mismatches.join(', '))+' kullanılıyor; whitelist yöntemleri '+esc(r.methods.join(', '))+'.</div>':'')+
    '<div class="actions"><button id="oneSwagger">Swagger’da aç</button><button id="copyPath">Adresi kopyala</button></div>'+
    '<h3>Backend karşılığı</h3><p><code>'+esc(r.source||'Kaynak eşleşmesi bulunamadı')+(r.line?':'+r.line:'')+'</code></p>'+
    (r.override?'<p>İstenen adres Frappe hook’u ile <code>'+esc(r.override)+'</code> fonksiyonuna yönlenir.</p>':'')+
    (r.alias?'<p>İçe aktarılan fonksiyon: <code>'+esc(r.alias)+'</code></p>':'')+
    (r.source_variants?'<h3>Aynı belge için diğer kaynak tanımları</h3><p>Aktif şema sitedeki metadata ile belirlenir.</p>'+r.source_variants.map(v=>'<details><summary>'+esc(v.app)+' · '+esc(v.source)+'</summary><pre>'+esc(JSON.stringify(v.fields,null,2))+'</pre></details>').join(''):'')+
    '<h3>Parametreler</h3>'+(rows.length?'<table><thead><tr><th>Alan</th><th>Zorunlu</th><th>Python türü</th><th>Kaynak varsayılanı</th></tr></thead><tbody>'+rows.map(p=>'<tr><td><code>'+esc(p.name)+'</code></td><td>'+(p.required?'Evet':'Hayır')+'</td><td>'+esc(p.annotation||'Belirtilmemiş')+'</td><td>'+esc(p.default_source??'—')+'</td></tr>').join('')+'</tbody></table>':'<p>İmzada açık parametre bulunmuyor. Gövde/form_dict içinden ek alanlar okunabilir.</p>')+
    (r.varargs?'<p>Bu fonksiyon değişken argüman alıyor; imza bütün alanları tanımlamıyor.</p>':'')+
    (r.fields?'<h3>Belge alanları ('+r.fields.filter(f=>f.fieldname).length+')</h3><table><thead><tr><th>Alan</th><th>Açıklama</th><th>Tür</th><th>Hedef/seçenek</th></tr></thead><tbody>'+r.fields.filter(f=>f.fieldname).map(f=>'<tr><td>'+esc(f.fieldname)+'</td><td>'+esc(f.label)+(f.reqd?' *':'')+'</td><td>'+esc(f.fieldtype)+'</td><td>'+esc(f.options||'')+'</td></tr>').join('')+'</tbody></table>':'')+
    '<h3>Kaynak açıklaması</h3><pre>'+esc(r.doc||'Kaynakta açıklama yok.')+'</pre>'+
    '<h3>Yanıt</h3><p>'+esc(r.returns?'Python dönüş bildirimi: '+r.returns:'Yanıt şeması bu taramada doğrulanmadı.')+' Frappe normalde <code>message</code>, belge API’si <code>data</code> kullanır; özel response ve dosya yanıtları farklı olabilir.</p>'+
    '<h3>Ön yüzdeki çağrı yerleri ('+r.usages.length+')</h3>'+locations(r.usages,true)+
    '<h3>Ek adres başvuruları ('+r.references.length+')</h3><p>Bu kayıtlar sabit/metin içinde adres bulunduğunu gösterir; çalıştırılan çağrı olarak sayılmaz.</p>'+locations(r.references,false);
  $('oneSwagger').onclick=()=>{single=r;page=0;$('detail').close();changeView('swagger');};
  $('copyPath').onclick=async()=>{await navigator.clipboard.writeText(r.path);$('copyPath').textContent='Kopyalandı';};
  $('detail').showModal();
}
function locations(items,calls){return items.length?'<ul>'+items.map(u=>'<li><code>'+esc(u.source)+':'+u.line+'</code>'+(calls?' — '+esc(u.http)+' / '+esc(u.call):'')+(u.params?.length?'<br><small>Gönderilen alanlar: '+esc(u.params.join(', '))+'</small>':'')+(u.mock?'<br><span class="badge warning">'+esc(u.mock)+'</span>':'')+'</li>').join('')+'</ul>':'<p>Eşleşme bulunamadı.</p>';}
function renderDynamic(){
  const q=$('search').value.toLowerCase(),repo=$('repo').value;
  const rows=data.dynamic.filter(u=>(!['admin-panel','tradehubfront'].includes(repo)||u.repo===repo)&&(!q||JSON.stringify(u).toLowerCase().includes(q)));
  $('result').textContent=rows.length+' çözülemeyen/değişken çağrı yeri';
  $('dynamic').innerHTML='<p>Adres veya belge türü çalışma anında belirleniyor. Ortak API taşıyıcıları, değişken belge ekranları ve API dışındaki dosya istekleri de burada yer alabilir. Bunlar eksik backend anlamına gelmez.</p><table><thead><tr><th>Repo / dosya</th><th>Çağrı</th><th>Adres ifadesi</th></tr></thead><tbody>'+rows.map(u=>'<tr><td>'+esc(u.source)+':'+u.line+'</td><td>'+esc(u.call)+' '+esc(u.http)+'</td><td><code>'+esc(u.path||u.target)+'</code></td></tr>').join('')+'</tbody></table>';
}
function renderScope(){
  $('scope').innerHTML='<h2>Ne tarandı?</h2><p>'+esc(data.scope)+'</p><p>'+data.frontend_files+' ön yüz dosyası; '+Object.values(data.stats).reduce((n,a)=>n+a.python_files,0)+' Python dosyası. Ayrıştırma hatası: '+data.errors.length+'.</p><table><thead><tr><th>Uygulama</th><th>Yerel sürüm</th><th>RPC fonksiyonu</th><th>Belge metodu</th><th>DocType</th></tr></thead><tbody>'+Object.entries(data.stats).map(([name,s])=>'<tr><td>'+esc(name)+'</td><td>'+esc(data.versions[name])+'</td><td>'+s.rpc+'</td><td>'+s.docmethods+'</td><td>'+s.doctypes+'</td></tr>').join('')+'</tbody></table><h3>Sayım nasıl okunmalı?</h3><p>Bir RPC adresi bir kayıt sayılır; GET/POST/PUT/DELETE ayrı kayıt sayılmaz. Bir DocType da bir kayıt sayılır; Swagger içinde listeleme, oluşturma, okuma, güncelleme ve silme yolları açılır. Kısa Frappe adresleri ve import/hook yönlendirmeleri ek kayıt oluşturabilir. Repo kartları birden fazla yerde kullanılan aynı adresi ayrı ayrı gösterebilir.</p><h3>Kapsam sınırları</h3><ul>'+data.limits.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><h3>Kaynak sürümleri</h3><ul>'+Object.entries(data.repos).map(([name,r])=>'<li>'+esc(name)+' · <code>'+esc(r.commit)+'</code> · tarama anında '+r.changed_files+' değişmiş dosya</li>').join('')+'</ul><h3>Başvuru belgeleri</h3><p><a href="https://docs.frappe.io/framework/user/en/api/rest" target="_blank" rel="noreferrer">Frappe REST API</a> · <a href="https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/" target="_blank" rel="noreferrer">Swagger UI yapılandırması</a> · <a href="media-openapi.yaml">Mevcut medya HTTP sözleşmesi</a></p>';
}
async function init(){
  const response=await fetch('catalog.json');if(!response.ok)throw new Error('Katalog yüklenemedi: '+response.status);data=await response.json();
  $('date').textContent=new Date(data.generated).toLocaleString('tr-TR');
  const count=repo=>data.entries.filter(r=>r.repos.includes(repo)).length;
  $('cards').innerHTML=[['tradehubfront',count('tradehubfront'),'Kodda adres / çağrı başvurusu','tradehubfront'],['admin-panel',count('admin-panel'),'Kodda adres / çağrı başvurusu','admin-panel'],['tradehub_core',data.stats.tradehub_core.rpc,'Whitelisted RPC fonksiyonu','tradehub_core'],['Tüm uygulamalar',Object.values(data.stats).reduce((n,s)=>n+s.doctypes,0),'DocType · alt tablolar dahil','']].map(([name,count,desc,repo])=>'<button class="card" data-repo="'+repo+'"><span>'+name+'</span><strong>'+count.toLocaleString('tr-TR')+'</strong><small>'+desc+'</small></button>').join('');
  document.querySelectorAll('[data-repo]').forEach(b=>b.onclick=()=>{$('repo').value=b.dataset.repo;$('kind').value=b.dataset.repo==='tradehub_core'?'rpc':'';$('app').value='';single=null;page=0;changeView('catalog');});
  const params=new URLSearchParams(location.search);for(const key of ['repo','app','kind','search'])if(params.has(key))$(key).value=params.get(key);
  if(!params.has('repo')) {
    const pageRepo=location.pathname.match(/\/(admin-panel|tradehubfront|tradehub_core)(?:\/|$)/)?.[1];
    if(pageRepo) $('repo').value=pageRepo;
    else if(document.body.dataset.defaultRepo) $('repo').value=document.body.dataset.defaultRepo;
  }
  for(const key of ['repo','app','kind','search'])$(key).addEventListener(key==='search'?'input':'change',()=>{single=null;page=0;update();});
  $('clear').onclick=()=>{for(const k of ['repo','app','kind','search'])$(k).value='';single=null;page=0;update();};
  $('prev').onclick=()=>{page--;update();};$('next').onclick=()=>{page++;update();};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{single=null;changeView(b.dataset.view);});
  $('scopeButton').onclick=()=>changeView('scope');$('closeDetail').onclick=()=>$('detail').close();
  $('json').onclick=()=>download('istoc-openapi.json',JSON.stringify(buildSpec(current(),label(),data),null,2),'application/json');
  $('csv').onclick=()=>{
    const values=[['Ad','Tür','Uygulama','Adres','HTTP','Repo','Durum','Backend kaynağı','Ön yüz çağrıları'],...current().map(r=>[r.name,kinds[r.kind],r.app,r.path,r.methods.join('/'),r.repos.join('/'),r.verified,r.source||'',r.usages.map(u=>u.source+':'+u.line).join(' | ')])];
    download('istoc-api-envanteri.csv','\ufeff'+values.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8');
  };
  $('media').onclick=()=>SwaggerUIBundle({url:'media-openapi.yaml',dom_id:'#swagger-ui',docExpansion:'none',filter:true,validatorUrl:null,supportedSubmitMethods:[],defaultModelsExpandDepth:-1,syntaxHighlight:false});
  renderScope();changeView(['swagger','dynamic','scope'].includes(params.get('view'))?params.get('view'):'catalog');
}
init().catch(e=>{$('result').textContent=e.message;});
