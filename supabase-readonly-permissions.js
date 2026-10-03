import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const COA_EMAIL='coa@cev.com.br';
const base=document.getElementById('base');
let currentEmail='';
let currentName='';
let isCoa=false;
let lastMiddlePush=null;
let lastExtraPush=null;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function ctx(){
  try{
    const middle=base?.contentWindow;
    const middleDoc=base?.contentDocument;
    const monitor=middleDoc?.getElementById('monitor');
    const inner=monitor?.contentWindow;
    const innerDoc=monitor?.contentDocument;
    if(!middle||!inner||!innerDoc?.body)return null;
    return {middle,inner,innerDoc};
  }catch(e){return null}
}

async function loadIdentity(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user)return null;
  currentEmail=String(session.user.email||'').trim().toLowerCase();
  isCoa=currentEmail===COA_EMAIL;
  let profile=null;
  try{
    const {data}=await supabase.from('profiles').select('nome,role,email').eq('id',session.user.id).maybeSingle();
    profile=data||null;
  }catch(e){}
  currentName=isCoa?'COA':String(profile?.nome||session.user.email?.split('@')[0]||'Visualização').trim();
  return {session,profile};
}

function applyIdentity(c){
  if(!c)return;
  try{
    const role=isCoa?'coa':'consulta';
    const user={name:currentName,email:currentEmail,role,readOnly:!isCoa};
    c.middle.__CEV_SUPABASE_USER__={...(c.middle.__CEV_SUPABASE_USER__||{}),...user};
    c.inner.__CEV_SUPABASE_USER__={...(c.inner.__CEV_SUPABASE_USER__||{}),...user};
    if(typeof c.inner.currentUser!=='undefined')c.inner.currentUser=currentName;
    try{
      const lbl=c.innerDoc.getElementById('activeUserLabel');if(lbl)lbl.textContent=currentName;
      const sel=c.innerDoc.getElementById('activeUser');if(sel){sel.value=currentName;sel.disabled=true;}
    }catch(e){}
    try{
      const who=c.middle.document?.getElementById('who');
      if(who)who.textContent=currentName+' • '+(isCoa?'COA':'visualização');
    }catch(e){}
    c.innerDoc.documentElement.dataset.cevPermission=isCoa?'coa':'readonly';
  }catch(e){console.error('[CEV permission identity]',e)}
}

function readonlyNotice(c){
  if(isCoa||!c)return;
  if(c.innerDoc.getElementById('cevReadOnlyBadge'))return;
  const badge=c.innerDoc.createElement('div');
  badge.id='cevReadOnlyBadge';
  badge.textContent='👁 Somente visualização • alterações exclusivas do COA';
  badge.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:20000;background:#102f49;color:#fff;padding:8px 13px;border-radius:999px;font:700 11px Segoe UI,Arial;box-shadow:0 8px 24px #0004;pointer-events:none';
  c.innerDoc.body.appendChild(badge);

  const style=c.innerDoc.createElement('style');
  style.id='cevReadOnlyStyle';
  style.textContent=`html[data-cev-permission="readonly"] input:not([type="search"]),html[data-cev-permission="readonly"] select,html[data-cev-permission="readonly"] textarea{pointer-events:none!important;opacity:.78!important}`;
  c.innerDoc.head.appendChild(style);

  const blockedWords=/salvar|adicionar|excluir|apagar|remover|enviar|confirmar|chegou|quebrou|abastecer|finalizar|editar|alterar|reiniciar|limpar|parar|retomar|chuva|nova viagem|despachar|cancelar/i;
  c.innerDoc.addEventListener('click',ev=>{
    if(isCoa)return;
    const btn=ev.target?.closest?.('button,[role="button"]');
    if(!btn)return;
    const text=String(btn.innerText||btn.textContent||'').trim();
    const onclick=String(btn.getAttribute?.('onclick')||'');
    const mutatingByHandler=/save|delete|remove|add|create|update|confirm|finish|start|toggleBreak|dispatch|assign|setFixed|setTruck|clearDay|admin/i.test(onclick);
    if(blockedWords.test(text)||mutatingByHandler){
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();
      try{c.inner.alert('Somente o usuário COA pode fazer alterações.');}catch(e){}
    }
  },true);
}

function protectWrites(c){
  if(!c)return;
  if(isCoa)return;

  try{
    const db=c.middle.CEV_DB;
    if(db&&typeof db.pushFromMonitor==='function'&&db.pushFromMonitor!==lastMiddlePush){
      const original=db.pushFromMonitor.bind(db);
      const wrapped=function(){
        console.warn('[CEV readonly] escrita de viagens bloqueada para',currentEmail);
        return Promise.resolve();
      };
      wrapped.__cevReadonly=true;wrapped.__original=original;
      db.pushFromMonitor=wrapped;lastMiddlePush=wrapped;
    }
  }catch(e){}

  try{
    if(window.CEV_EXTRA_DB&&typeof window.CEV_EXTRA_DB.pushSetting==='function'&&window.CEV_EXTRA_DB.pushSetting!==lastExtraPush){
      const original=window.CEV_EXTRA_DB.pushSetting.bind(window.CEV_EXTRA_DB);
      const wrapped=function(){
        console.warn('[CEV readonly] escrita de configurações bloqueada para',currentEmail);
        return Promise.resolve();
      };
      wrapped.__cevReadonly=true;wrapped.__original=original;
      window.CEV_EXTRA_DB.pushSetting=wrapped;lastExtraPush=wrapped;
    }
  }catch(e){}
}

function ensure(){
  const c=ctx();if(!c)return;
  applyIdentity(c);
  if(!isCoa){protectWrites(c);readonlyNotice(c)}
}

async function boot(){
  for(let i=0;i<120;i++){
    const id=await loadIdentity();
    if(id)break;
    await sleep(250);
  }
  ensure();
  setInterval(ensure,700);
}

base?.addEventListener('load',()=>setTimeout(ensure,900));
boot();
