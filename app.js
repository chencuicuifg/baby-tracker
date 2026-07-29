const STORAGE_KEY="babyTrackerEntriesV1";
const SETTINGS_KEY="babyTrackerSettingsV1";
let entries=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
let settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{"babyName":"Baby","formulaAmounts":[10,20,30,40,60]}');
let editingId=null,pendingImport=[];

const $=id=>document.getElementById(id);
const dialogs={
  formula:$("formulaDialog"),breast:$("breastDialog"),pump:$("pumpDialog"),
  history:$("historyDialog"),edit:$("editDialog"),import:$("importDialog"),settings:$("settingsDialog")
};

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function id(){return crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());}
function iso(){return new Date().toISOString();}
function endOf(e){return e.type==="breast"?(e.endedAt||new Date(new Date(e.createdAt).getTime()+Number(e.durationMin||0)*60000).toISOString()):e.createdAt;}
function localKey(t){const d=new Date(t),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
function localInput(t){const d=new Date(t),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;}
function fmtTime(t){return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date(t));}
function fmtDay(k){const [y,m,d]=k.split("-").map(Number);return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric"}).format(new Date(y,m-1,d));}
function elapsed(t){const m=Math.max(0,Math.floor((Date.now()-new Date(t))/60000));return m<60?`${m} min`:`${Math.floor(m/60)} hr ${m%60} min`;}
function title(e){if(e.type==="pee")return"💧 Wet Diaper";if(e.type==="poop")return"💩 Dirty Diaper";if(e.type==="formula")return`🍼 Formula ${e.amount} ml`;if(e.type==="pump")return`🥛 Pump Milk ${e.amount} ml`;return"🤱 Breast Feed";}
function meta(e){return e.type==="breast"?`${e.durationMin} min · ${fmtTime(e.createdAt)}–${fmtTime(endOf(e))}`:"Logged";}
function toast(m){const x=$("toast");x.textContent=m;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1600);}
function add(e){entries.push({id:id(),...e});entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));save();render();toast("Record saved.");}

function normalizeExisting(){
  entries=entries.map(e=>{
    if(e.type==="breast"&&!e.endedAt){
      const end=e.createdAt;
      return {...e,endedAt:end,createdAt:new Date(new Date(end).getTime()-Number(e.durationMin||0)*60000).toISOString(),side:undefined};
    }
    if(e.type==="breast"){const c={...e};delete c.side;return c;}
    return e;
  });
  save();
}

function fillGrid(gridId,inputId,values,suffix){
  const g=$(gridId);g.innerHTML="";
  values.forEach(v=>{
    const b=document.createElement("button");
    b.type="button";b.className="amount-btn";b.textContent=`${v} ${suffix}`;
    b.onclick=()=>{$(inputId).value=v;};
    g.appendChild(b);
  });
}
function openFormula(){
  $("formulaAmountInput").value="";
  fillGrid("formulaAmountGrid","formulaAmountInput",settings.formulaAmounts,"ml");
  dialogs.formula.showModal();
}
function openBreast(){
  $("breastDurationInput").value="";
  fillGrid("breastDurationGrid","breastDurationInput",[10,15,20,30,40,45,60],"min");
  dialogs.breast.showModal();
}
function openPump(){
  $("pumpAmountInput").value="";
  fillGrid("pumpAmountGrid","pumpAmountInput",[30,45,60,90,120,150],"ml");
  dialogs.pump.showModal();
}

function renderDaily(){
  const g={};
  entries.forEach(e=>{
    const k=localKey(e.createdAt);
    if(!g[k])g[k]={wet:0,dirty:0,formula:0,breast:0,pump:0,feeds:0};
    if(e.type==="pee")g[k].wet++;
    if(e.type==="poop")g[k].dirty++;
    if(e.type==="formula"){g[k].formula+=Number(e.amount||0);g[k].feeds++;}
    if(e.type==="breast"){g[k].breast+=Number(e.durationMin||0);g[k].feeds++;}
    if(e.type==="pump")g[k].pump+=Number(e.amount||0);
  });
  const wrap=$("dailyStatsList");wrap.innerHTML="";
  const keys=Object.keys(g).sort().reverse();
  if(!keys.length){wrap.innerHTML="<div class='empty'>No daily statistics yet.</div>";return;}
  keys.slice(0,14).forEach(k=>{
    const s=g[k],c=document.createElement("div");c.className="daily-card";
    c.innerHTML=`<div class="daily-date">${fmtDay(k)}</div><div class="daily-grid">
    <div><strong>${s.wet}</strong><span>Wet</span></div><div><strong>${s.dirty}</strong><span>Dirty</span></div>
    <div><strong>${s.formula} ml</strong><span>Formula</span></div><div><strong>${s.breast} min</strong><span>Breast</span></div>
    <div><strong>${s.pump} ml</strong><span>Pumped</span></div><div><strong>${s.feeds}</strong><span>Feeds</span></div></div>`;
    wrap.appendChild(c);
  });
}
function render(){
  const cutoff=Date.now()-86400000,roll=entries.filter(e=>new Date(e.createdAt).getTime()>=cutoff);
  $("todayTitle").textContent=`${settings.babyName} Tracker`;
  $("peeCount").textContent=roll.filter(e=>e.type==="pee").length;
  $("poopCount").textContent=roll.filter(e=>e.type==="poop").length;
  $("formulaTotal").textContent=`${roll.filter(e=>e.type==="formula").reduce((a,e)=>a+Number(e.amount||0),0)} ml`;
  $("breastTotal").textContent=`${roll.filter(e=>e.type==="breast").reduce((a,e)=>a+Number(e.durationMin||0),0)} min`;
  $("pumpTotal").textContent=`${roll.filter(e=>e.type==="pump").reduce((a,e)=>a+Number(e.amount||0),0)} ml`;
  const feeds=entries.filter(e=>e.type==="formula"||e.type==="breast");
  $("sinceFeed").textContent=feeds.length?elapsed(feeds.at(-1).createdAt):"No feeding logged";
  renderDaily();
  const list=$("historyList");list.innerHTML="";
  entries.slice().reverse().slice(0,50).forEach(e=>{
    const li=document.createElement("li");li.className="log-item";
    li.innerHTML=`<div><div class="log-title">${title(e)}</div><div class="log-meta">${meta(e)}</div></div><div class="log-time">${fmtTime(e.type==="breast"?endOf(e):e.createdAt)}</div>`;
    li.onclick=()=>openEdit(e.id);list.appendChild(li);
  });
  $("emptyState").classList.toggle("hidden",entries.length>0);
  $("undoBtn").disabled=!entries.length;
}

function renderHistoryFields(){
  const t=$("historyType").value,w=$("historyDynamicFields");
  $("historyTimeLabel").childNodes[0].nodeValue=t==="breast"?"End date and time ":"Date and time ";
  if(t==="breast")w.innerHTML=`<label>Duration<div class="duration-row"><input id="historyDuration" type="number" min="1" max="180" placeholder="e.g. 40"><span>min</span></div></label>`;
  else if(t==="formula"||t==="pump")w.innerHTML=`<label>Amount<div class="duration-row"><input id="historyAmount" type="number" min="1" max="${t==="pump"?1000:500}" placeholder="e.g. ${t==="pump"?60:30}"><span>ml</span></div></label>`;
  else w.innerHTML="";
}
function openHistory(){
  $("historyType").value="pee";$("historyTime").value=localInput(iso());renderHistoryFields();dialogs.history.showModal();
}
function openEdit(recordId){
  const e=entries.find(x=>x.id===recordId);if(!e)return;editingId=recordId;
  let h=`<div class="edit-type">${title(e)}</div>`;
  if(e.type==="formula"||e.type==="pump")h+=`<label>Amount<div class="duration-row"><input id="editAmount" type="number" min="1" max="${e.type==="pump"?1000:500}" value="${e.amount}"><span>ml</span></div></label>`;
  if(e.type==="breast")h+=`<label>Duration<div class="duration-row"><input id="editDuration" type="number" min="1" max="180" value="${e.durationMin}"><span>min</span></div></label>`;
  h+=`<label>${e.type==="breast"?"End date and time":"Date and time"}<input id="editTime" type="datetime-local" value="${localInput(e.type==="breast"?endOf(e):e.createdAt)}"></label>`;
  $("editFields").innerHTML=h;dialogs.edit.showModal();
}

document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{
  const a=b.dataset.action;
  if(a==="pee")add({type:"pee",createdAt:iso()});
  if(a==="poop")add({type:"poop",createdAt:iso()});
  if(a==="formula")openFormula();
  if(a==="breast")openBreast();
  if(a==="pump")openPump();
});

$("saveFormulaBtn").onclick=()=>{
  const n=Number($("formulaAmountInput").value);
  if(!n||n<1||n>500)return toast("Enter 1–500 ml.");
  add({type:"formula",amount:n,createdAt:iso()});dialogs.formula.close();
};
$("saveBreastBtn").onclick=()=>{
  const n=Number($("breastDurationInput").value);
  if(!n||n<1||n>180)return toast("Enter 1–180 minutes.");
  const end=iso();add({type:"breast",durationMin:n,endedAt:end,createdAt:new Date(new Date(end)-n*60000).toISOString()});dialogs.breast.close();
};
$("savePumpBtn").onclick=()=>{
  const n=Number($("pumpAmountInput").value);
  if(!n||n<1||n>1000)return toast("Enter 1–1000 ml.");
  add({type:"pump",amount:n,createdAt:iso()});dialogs.pump.close();
};

$("addHistoryBtn").onclick=openHistory;
$("historyType").onchange=renderHistoryFields;
$("saveHistoryBtn").onclick=()=>{
  const type=$("historyType").value,t=$("historyTime").value;
  if(!t)return toast("Choose a date and time.");
  const event=new Date(t).toISOString(),e={id:id(),type,createdAt:event};
  if(type==="breast"){
    const n=Number($("historyDuration").value);if(!n||n<1||n>180)return toast("Enter 1–180 minutes.");
    e.durationMin=n;e.endedAt=event;e.createdAt=new Date(new Date(event)-n*60000).toISOString();
  }
  if(type==="formula"||type==="pump"){
    const n=Number($("historyAmount").value),max=type==="pump"?1000:500;
    if(!n||n<1||n>max)return toast(`Enter 1–${max} ml.`);
    e.amount=n;
  }
  entries.push(e);entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));save();render();dialogs.history.close();toast("Past record added.");
};
$("saveEditBtn").onclick=()=>{
  const e=entries.find(x=>x.id===editingId),t=$("editTime").value;if(!e||!t)return toast("Choose a date and time.");
  if(e.type==="formula"||e.type==="pump"){
    const n=Number($("editAmount").value),max=e.type==="pump"?1000:500;if(!n||n<1||n>max)return toast(`Enter 1–${max} ml.`);
    e.amount=n;e.createdAt=new Date(t).toISOString();
  }else if(e.type==="breast"){
    const n=Number($("editDuration").value);if(!n||n<1||n>180)return toast("Enter 1–180 minutes.");
    e.durationMin=n;e.endedAt=new Date(t).toISOString();e.createdAt=new Date(new Date(e.endedAt)-n*60000).toISOString();
  }else e.createdAt=new Date(t).toISOString();
  save();render();dialogs.edit.close();toast("Record updated.");
};
$("deleteEntryBtn").onclick=()=>{entries=entries.filter(e=>e.id!==editingId);save();render();dialogs.edit.close();toast("Record deleted.");};
$("undoBtn").onclick=()=>{if(entries.length){entries.pop();save();render();toast("Last record removed.");}};
$("settingsBtn").onclick=()=>{$("babyNameInput").value=settings.babyName;$("amountsInput").value=settings.formulaAmounts.join(",");dialogs.settings.showModal();};
$("saveSettings").onclick=()=>{
  const a=$("amountsInput").value.split(",").map(x=>Number(x.trim())).filter(x=>x>0&&x<=500);
  if(!a.length)return toast("Enter at least one valid amount.");
  settings={babyName:$("babyNameInput").value.trim()||"Baby",formulaAmounts:[...new Set(a)]};save();render();dialogs.settings.close();
};
$("clearBtn").onclick=()=>{if(confirm("Clear all records? This cannot be undone.")){entries=[];save();render();toast("All data cleared.");}};

function parseCSV(text){
  text=text.replace(/^\uFEFF/,"");const rows=[];let r=[],f="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'&&text[i+1]==='"'){f+='"';i++;}else if(c==='"')q=false;else f+=c;}
    else{if(c==='"')q=true;else if(c===','){r.push(f);f="";}else if(c==='\n'){r.push(f);rows.push(r);r=[];f="";}else if(c!=='\r')f+=c;}
  }
  if(f.length||r.length){r.push(f);rows.push(r);}return rows.filter(r=>r.some(v=>String(v).trim()));
}
function norm(v){return String(v||"").trim().toLowerCase().replace(/\s+/g,"");}
function normType(v){v=String(v||"").trim().toLowerCase();if(["pee","wet","wet diaper","尿尿"].includes(v))return"pee";if(["poop","dirty","dirty diaper","便便","拉屎"].includes(v))return"poop";if(["breast","breastfeeding","breast feed","母乳"].includes(v))return"breast";if(["formula","奶粉"].includes(v))return"formula";if(["pump","pumped","pumped milk","pump milk","泵奶","吸奶"].includes(v))return"pump";return null;}
function rowsToEntries(rows){
  if(rows.length<2)throw Error("No data rows.");
  const h=rows[0].map(norm),find=a=>h.findIndex(x=>a.includes(x));
  const ti=find(["time","datetime","dateandtime","时间"]),ei=find(["endtime","enddatetime","结束时间"]),yi=find(["type","recordtype","类型"]),di=find(["durationminutes","durationmin","duration","时长分钟","时长"]),ai=find(["amountml","amount","奶量ml","奶量"]);
  if(ti<0||yi<0)throw Error("Missing time or type column.");
  const out=[];let skipped=0;
  rows.slice(1).forEach(r=>{
    const type=normType(r[yi]),d=new Date(r[ti]);if(!type||Number.isNaN(d.getTime())){skipped++;return;}
    const e={id:id(),type,createdAt:d.toISOString()};
    if(type==="breast"){const n=Number(r[di]);if(!n){skipped++;return;}e.durationMin=n;const end=ei>=0&&!Number.isNaN(new Date(r[ei]).getTime())?new Date(r[ei]).toISOString():e.createdAt;e.endedAt=end;e.createdAt=new Date(new Date(end)-n*60000).toISOString();}
    if(type==="formula"||type==="pump"){const n=Number(r[ai]);if(!n){skipped++;return;}e.amount=n;}
    out.push(e);
  });
  return {out,skipped};
}
function sig(e){return [new Date(e.createdAt).getTime(),e.type,Number(e.durationMin||0),Number(e.amount||0)].join("|");}
$("exportBtn").onclick=()=>{
  const rows=[["Time","End Time","Type","Duration Minutes","Amount ml"]];
  entries.forEach(e=>rows.push([new Date(e.createdAt).toLocaleString("en-US"),e.type==="breast"?new Date(endOf(e)).toLocaleString("en-US"):"",e.type,e.durationMin||"",e.amount||""]));
  const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const u=URL.createObjectURL(new Blob([csv],{type:"text/csv"})),a=document.createElement("a");a.href=u;a.download=`baby-tracker-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(u);
};
$("importBtn").onclick=()=>$("csvFileInput").click();
$("csvFileInput").onchange=async e=>{
  const f=e.target.files?.[0];e.target.value="";if(!f)return;
  try{const {out,skipped}=rowsToEntries(parseCSV(await f.text()));if(!out.length)throw Error("No valid records found.");pendingImport=out;$("importSummary").textContent=`Found ${out.length} valid records${skipped?` and skipped ${skipped}`:""}.`;dialogs.import.showModal();}catch(err){toast(err.message);}
};
$("confirmImportBtn").onclick=()=>{
  const seen=new Set(entries.map(sig));let added=0,dup=0;
  pendingImport.forEach(e=>{const s=sig(e);if(seen.has(s))dup++;else{entries.push(e);seen.add(s);added++;}});
  entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));save();render();dialogs.import.close();toast(`Imported ${added}${dup?`; skipped ${dup} duplicates`:""}.`);
};

normalizeExisting();
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
setInterval(render,60000);
