(function (global) {
  function scalar(annotation) {
    const a=(annotation||'').replace(/\s/g,'');
    if(a==='int')return {type:'integer'};
    if(a==='float')return {type:'number'};
    if(a==='bool')return {type:'boolean'};
    if(a==='str')return {type:'string'};
    return {};
  }
  function schema(r) {
    const properties={};
    if(r.source_variants)return {type:'object',additionalProperties:true,description:'Bu DocType birden fazla uygulamada tanımlı; aktif alan şeması sitede doğrulanmalı. Tüm kaynak varyantları katalogda mevcuttur.'};
    if(r.fields) {
      properties.name={type:'string',description:'Belgenin Frappe kayıt adı.'};
      for(const f of r.fields) {
        if(!f.fieldname||/Break|Button|HTML|Image|Heading/.test(f.fieldtype))continue;
        const type=/^(Int|Check)$/.test(f.fieldtype)?'integer':/^(Float|Currency|Percent)$/.test(f.fieldtype)?'number':f.fieldtype?.startsWith('Table')?'array':'string';
        const s={type,description:[f.label,f.fieldtype,f.reqd?'DocType alanı zorunlu':null,f.options?'Seçenek/hedef: '+f.options:null].filter(Boolean).join(' · ')};
        if(type==='array')s.items={type:'object',additionalProperties:true};
        if(f.read_only)s.readOnly=true;
        if(f.fieldtype==='Password')s.writeOnly=true;
        if(f.fieldtype==='Select'&&f.options)s.enum=f.options.split('\n').filter(Boolean);
        properties[f.fieldname]=s;
      }
    } else {
      for(const p of r.params||[]) properties[p.name]={...scalar(p.annotation),description:[p.annotation?'Python: '+p.annotation:'Tür belirtilmemiş.',p.default_source!==undefined?'Kaynak varsayılanı: '+p.default_source:null].filter(Boolean).join(' ')};
    }
    const result={type:'object',properties,additionalProperties:true};
    const required=(r.params||[]).filter(p=>p.required).map(p=>p.name);
    if(required.length)result.required=required;
    return result;
  }
  function buildSpec(entries, title, data) {
    const spec={openapi:'3.1.0',info:{title:'İstoç API · '+title,version:data.generated.slice(0,10),description:data.scope+'\n\nKaynak taraması; çalışan canlı uç garantisi değildir. Yanıt tipi bilinmeyen alanlar açık bırakılmıştır. Swagger bu katalogda inceleme için kullanılır.'},
      servers:[{url:'http://istoc.localhost',description:'Yerel geliştirme — katalog kaynağı'},{url:'https://alphaistoc.cronbi.com',description:'Kullanıcının belirttiği alpha — sürüm eşitliği doğrulanmadı'}],
      paths:{},components:{securitySchemes:{session:{type:'apiKey',in:'cookie',name:'sid',description:'Mevcut Frappe oturumu. Yazma çağrılarında CSRF de gerekir.'},token:{type:'apiKey',in:'header',name:'Authorization',description:'Frappe token api_key:api_secret biçimi; kullanıcının izinleri uygulanır.'}}}};
    function add(r,path,method,label,body,parameters=[]) {
      if(!['get','post','put','patch','delete'].includes(method))return;
      const source=r.source?'\n\nKaynak: `'+r.source+':'+r.line+'`':'';
      const uses=(r.usages||[]).map(u=>'• `'+u.source+':'+u.line+'` — '+u.http+(u.mock?' — '+u.mock:'')).join('\n');
      const op={tags:[r.app+' · '+(r.kind==='resource'?'Belgeler':r.module||'Kaynak eşleşmesi yok')],
        operationId:(r.id+'_'+method+'_'+label).replace(/[^a-zA-Z0-9_]/g,'_'),summary:label+' · '+r.name,
        description:(r.verified==='missing'?'**Backend kaynak eşleşmesi yok.**\n\n':'')+(r.doc||'Açıklama kaynakta belirtilmemiş.')+source+
          (r.override?'\n\nFrappe hook yönlendirmesi: `'+r.override+'`':'')+
          (r.alias?'\n\nİçe aktarılan fonksiyon: `'+r.alias+'`':'')+
          (r.guest?'\n\nWhitelist misafir çağrısına izin veriyor; fonksiyon içindeki ek kontroller geçerlidir.':'\n\nOturum/API kimliği ve ilgili rol/belge izinleri gerekir.')+
          (r.methods_explicit===false?'\n\nHTTP yöntemleri Frappe varsayılanıdır (GET, POST, PUT, DELETE); fonksiyonun ek kontrolleri olabilir.':'')+
          (r.varargs?'\n\nFonksiyon değişken argüman alıyor; imza bütün gövde alanlarını tanımlamıyor.':'')+
          (r.returns?'\n\nPython dönüş bildirimi: `'+r.returns+'`':'')+
          (uses?'\n\nÖn yüz çağrı yerleri:\n'+uses:''),
        security:r.guest?[]:[{session:[]},{token:[]}],parameters:[],
        responses:{default:{description:r.kind==='resource'?'Frappe belge yanıtı (genellikle data zarfı). Alanlar belge ve kullanıcı izinlerine bağlıdır.':'Yanıt şeması bu statik taramada doğrulanmadı. Frappe normalde sonucu message altında döndürür; dosya/özel response istisnaları olabilir.',content:{'application/json':{schema:{}}}}},
        'x-source-verified':r.verified==='source','x-live-verified':false};
      const names=[...path.matchAll(/\{([^}]+)\}/g)].map(x=>x[1]);
      op.parameters.push(...names.map(name=>({name,in:'path',required:true,schema:{type:'string'}})),...parameters);
      if(!['get'].includes(method))op.parameters.push({name:'X-Frappe-CSRF-Token',in:'header',required:false,schema:{type:'string'},description:'Cookie oturumuyla yazma çağrısı yaparken gerekir. Token kimlik doğrulamasında davranış farklıdır.'});
      if(body)op.requestBody={required:false,content:{'application/json':{schema:body},'application/x-www-form-urlencoded':{schema:body}}};
      if(!spec.paths[path])spec.paths[path]={};
      if(spec.paths[path][method]) {
        // Generic inherited document methods can share a route; retain both source descriptions.
        spec.paths[path][method].description+='\n\nEk kaynak: '+r.source+':'+r.line;
      } else spec.paths[path][method]=op;
    }
    for(const r of entries) {
      if(r.kind==='doctype')continue;
      const body=schema(r);
      if(r.kind==='resource') {
        if(r.istable)continue;
        const item=r.path+'/'+(r.issingle?encodeURIComponent(r.name):'{name}');
        if(!r.issingle) {
          add(r,r.path,'get','Listele',null,['fields','filters','or_filters','order_by','limit_start','limit_page_length'].map(name=>({name,in:'query',schema:{type:'string'},description:['fields','filters','or_filters'].includes(name)?'JSON olarak kodlanmış dizi.':'Frappe liste parametresi.'})));
          add(r,r.path,'post','Oluştur',body);
        }
        add(r,item,'get','Oku');add(r,item,'put','Güncelle',body);
        if(!r.issingle)add(r,item,'delete','Sil');
      } else {
        const methods=r.methods.length?r.methods:[...new Set(r.usages.map(u=>u.http).filter(x=>x!=='?'))];
        for(const m of methods) {
          const params=m==='GET'?(r.params||[]).map(p=>({name:p.name,in:'query',required:p.required,schema:scalar(p.annotation),description:body.properties[p.name]?.description})):[];
          add(r,r.path,m.toLowerCase(),r.kind==='docmethod'?'Belge metodu':'Çağrı',m==='GET'?null:body,params);
        }
      }
    }
    return spec;
  }
  if(typeof module!=='undefined')module.exports=buildSpec;
  else global.buildSpec=buildSpec;
})(typeof window!=='undefined'?window:globalThis);
