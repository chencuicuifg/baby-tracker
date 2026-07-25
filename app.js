const STORAGE_KEY="babyTrackerEntriesV1";
const SETTINGS_KEY="babyTrackerSettingsV1";

let entries=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
let settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{"babyName":"Baby","formulaAmounts":[10,20,30,40,60]}');
let pendingBreastSide=null;
let editingId=null;
let pendingImport=[];

const $=id=>document.getElementById(id);
const formulaDialog=$("formulaDialog");
const breastDialog=$("breastDialog");
const historyDialog=$("historyDialog");
const editDialog=$("editDialog");
const importDialog=$("importDialog");
const settingsDialog=$("settingsDialog");

function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));
  localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
}
function makeId(){
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());
}
function nowISO(){return new Date().toISOString();}
function sameLocalDay(iso,date=new Date()){
  const d=new Date(iso);
  return d.getFullYear()===date.getFullYear() &&
         d.getMonth()===date.getMonth() &&
         d.getDate()===date.getDate();
}
function formatTime(iso){
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date(iso));
}
function elapsedText(iso){
  const mins=Math.max(0,Math.floor((Date.now()-new Date(iso))/60000));
  if(mins<60)return `${mins} min`;
  const h=Math.floor(mins/60),m=mins%60;
  return `${h} hr ${m} min`;
}
function typeTitle(e){
  if(e.type==="pee")return "💧 Wet Diaper";
  if(e.type==="poop")return "💩 Dirty Diaper";
  if(e.type==="formula")return `🍼 Formula ${e.amount} ml`;
  return `🤱 ${e.side==="left"?"Left":"Right"} Breast`;
}
function metaText(e){
  return e.type==="breast" ? `${e.durationMin} min` : "Logged";
}
function toast(msg){
  const el=$("toast");
  el.textContent=msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),1800);
}
function addEntry(entry){
  entries.push({id:makeId(),createdAt:nowISO(),...entry});
  entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  save();
  render();
  toast(`${typeTitle(entries.at(-1))} · saved`);
}
function renderFormulaButtons(){
  const grid=$("amountGrid");
  grid.innerHTML="";
  settings.formulaAmounts.forEach(amount=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="amount-btn";
    b.textContent=`${amount} ml`;
    b.onclick=()=>{
      addEntry({type:"formula",amount:Number(amount)});
      formulaDialog.close();
    };
    grid.appendChild(b);
  });
}
function renderDurationButtons(){
  const grid=$("durationGrid");
  grid.innerHTML="";
  [5,10,15,20,25,30].forEach(min=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="amount-btn";
    b.textContent=`${min} min`;
    b.onclick=()=>{$("breastDuration").value=min;};
    grid.appendChild(b);
  });
}
function render(){
  entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const today=new Date();
  const todays=entries.filter(e=>sameLocalDay(e.createdAt,today));

  $("todayTitle").textContent=`${settings.babyName} Tracker`;
  $("peeCount").textContent=todays.filter(e=>e.type==="pee").length;
  $("poopCount").textContent=todays.filter(e=>e.type==="poop").length;
  $("formulaTotal").textContent=`${todays.filter(e=>e.type==="formula").reduce((a,e)=>a+Number(e.amount||0),0)} ml`;
  $("breastTotal").textContent=`${todays.filter(e=>e.type==="breast").reduce((a,e)=>a+Number(e.durationMin||0),0)} min`;

  const feeds=entries.filter(e=>e.type==="formula"||e.type==="breast");
  $("sinceFeed").textContent=feeds.length?elapsedText(feeds.at(-1).createdAt):"No feeding logged";

  const list=$("historyList");
  list.innerHTML="";
  entries.slice().reverse().slice(0,50).forEach(e=>{
    const li=document.createElement("li");
    li.className="log-item";
    li.innerHTML=`<div><div class="log-title">${typeTitle(e)}</div><div class="log-meta">${metaText(e)}</div></div><div class="log-time">${formatTime(e.createdAt)}</div>`;
    li.onclick=()=>openEdit(e.id);
    list.appendChild(li);
  });

  $("emptyState").classList.toggle("hidden",entries.length>0);
  $("undoBtn").disabled=entries.length===0;
}
function openBreast(side){
  pendingBreastSide=side;
  $("breastDialogTitle").textContent=`Log ${side==="left"?"Left":"Right"} Breast`;
  $("breastDuration").value="";
  renderDurationButtons();
  breastDialog.showModal();
}
function localInputValue(iso){
  const d=new Date(iso),pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function defaultHistoryTime(){return localInputValue(nowISO());}
function renderHistoryDynamicFields(){
  const type=$("historyType").value;
  const wrap=$("historyDynamicFields");
  if(type==="breast"){
    wrap.innerHTML=`<label>Side<select id="historySide"><option value="left">Left</option><option value="right">Right</option></select></label><label>Duration<div class="duration-row"><input id="historyDuration" type="number" inputmode="numeric" min="1" max="180" placeholder="e.g. 15"><span>min</span></div></label>`;
  }else if(type==="formula"){
    wrap.innerHTML=`<label>Amount<div class="duration-row"><input id="historyAmount" type="number" inputmode="decimal" min="1" max="500" placeholder="e.g. 30"><span>ml</span></div></label>`;
  }else{
    wrap.innerHTML="";
  }
}
function openHistoryDialog(){
  $("historyType").value="pee";
  $("historyTime").value=defaultHistoryTime();
  renderHistoryDynamicFields();
  historyDialog.showModal();
}
function openEdit(id){
  const e=entries.find(x=>x.id===id);
  if(!e)return;
  editingId=id;
  let html=`<div class="edit-type">${typeTitle(e)}</div>`;
  if(e.type==="formula"){
    html+=`<label>Amount<div class="duration-row"><input id="editAmount" type="number" min="1" max="500" value="${e.amount}"><span>ml</span></div></label>`;
  }
  if(e.type==="breast"){
    html+=`<label>Side<select id="editSide"><option value="left" ${e.side==="left"?"selected":""}>Left</option><option value="right" ${e.side==="right"?"selected":""}>Right</option></select></label><label>Duration<div class="duration-row"><input id="editDuration" type="number" min="1" max="180" value="${e.durationMin}"><span>min</span></div></label>`;
  }
  html+=`<label>Date and time<input id="editTime" type="datetime-local" value="${localInputValue(e.createdAt)}"></label>`;
  $("editFields").innerHTML=html;
  editDialog.showModal();
}

/* CSV helpers: supports both old Chinese exports and new English exports. */
function parseCSV(text){
  text=text.replace(/^\uFEFF/,"");
  const rows=[];
  let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"' && text[i+1]==='"'){field+='"';i++;}
      else if(c==='"'){quoted=false;}
      else field+=c;
    }else{
      if(c==='"')quoted=true;
      else if(c===','){row.push(field);field="";}
      else if(c==='\n'){
        row.push(field);rows.push(row);row=[];field="";
      }else if(c!=='\r')field+=c;
    }
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows.filter(r=>r.some(v=>String(v).trim()!==""));
}
function normalizeHeader(value){
  return String(value||"").trim().toLowerCase().replace(/\s+/g,"");
}
function parseImportedDate(value){
  const raw=String(value||"").trim();
  if(!raw)return null;
  let d=new Date(raw);
  if(!Number.isNaN(d.getTime()))return d.toISOString();

  const m=raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*(?:上午|下午)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(m){
    d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]||0));
    if(!Number.isNaN(d.getTime()))return d.toISOString();
  }
  return null;
}
function normalizeType(raw){
  const v=String(raw||"").trim().toLowerCase();
  if(["pee","wet","wet diaper","尿尿"].includes(v))return"pee";
  if(["poop","dirty","dirty diaper","便便","拉屎"].includes(v))return"poop";
  if(["breast","breastfeeding","母乳"].includes(v))return"breast";
  if(["formula","奶粉"].includes(v))return"formula";
  return null;
}
function normalizeSide(raw){
  const v=String(raw||"").trim().toLowerCase();
  if(["left","l","左","左侧"].includes(v))return"left";
  if(["right","r","右","右侧"].includes(v))return"right";
  return "";
}
function recordSignature(e){
  return [
    new Date(e.createdAt).getTime(),
    e.type,
    e.side||"",
    Number(e.durationMin||0),
    Number(e.amount||0)
  ].join("|");
}
function rowsToEntries(rows){
  if(rows.length<2)throw new Error("The CSV has no data rows.");
  const headers=rows[0].map(normalizeHeader);
  const aliases={
    time:["time","datetime","dateandtime","时间"],
    type:["type","recordtype","类型"],
    side:["side","侧别"],
    duration:["durationminutes","durationmin","duration","时长分钟","时长"],
    amount:["amountml","amount","奶量ml","奶量"]
  };
  function idx(name){
    return headers.findIndex(h=>aliases[name].includes(h));
  }
  const timeIdx=idx("time"),typeIdx=idx("type"),sideIdx=idx("side"),durationIdx=idx("duration"),amountIdx=idx("amount");
  if(timeIdx<0||typeIdx<0)throw new Error("Could not find the time and type columns.");

  const imported=[];
  let skipped=0;
  for(const row of rows.slice(1)){
    const createdAt=parseImportedDate(row[timeIdx]);
    const type=normalizeType(row[typeIdx]);
    if(!createdAt||!type){skipped++;continue;}
    const e={id:makeId(),createdAt,type};
    if(type==="breast"){
      e.side=normalizeSide(sideIdx>=0?row[sideIdx]:"")||"left";
      e.durationMin=Number(durationIdx>=0?row[durationIdx]:0);
      if(!e.durationMin){skipped++;continue;}
    }
    if(type==="formula"){
      e.amount=Number(amountIdx>=0?row[amountIdx]:0);
      if(!e.amount){skipped++;continue;}
    }
    imported.push(e);
  }
  return {imported,skipped};
}

document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>{
  const a=btn.dataset.action;
  if(a==="pee")addEntry({type:"pee"});
  if(a==="poop")addEntry({type:"poop"});
  if(a==="formula"){
    renderFormulaButtons();
    $("customAmount").value="";
    formulaDialog.showModal();
  }
  if(a==="breast-left")openBreast("left");
  if(a==="breast-right")openBreast("right");
}));

$("saveBreast").onclick=ev=>{
  const n=Number($("breastDuration").value);
  if(!n||n<1||n>180){
    ev.preventDefault();toast("Enter 1–180 minutes.");return;
  }
  addEntry({type:"breast",side:pendingBreastSide,durationMin:n});
};
$("saveCustomAmount").onclick=ev=>{
  const n=Number($("customAmount").value);
  if(!n||n<1||n>500){
    ev.preventDefault();toast("Enter 1–500 ml.");return;
  }
  addEntry({type:"formula",amount:n});
};
$("saveEditBtn").onclick=ev=>{
  const e=entries.find(x=>x.id===editingId);
  if(!e)return;
  if(e.type==="formula"){
    const n=Number($("editAmount").value);
    if(!n||n<1||n>500){ev.preventDefault();toast("Enter 1–500 ml.");return;}
    e.amount=n;
  }
  if(e.type==="breast"){
    const n=Number($("editDuration").value);
    if(!n||n<1||n>180){ev.preventDefault();toast("Enter 1–180 minutes.");return;}
    e.durationMin=n;
    e.side=$("editSide").value;
  }
  const t=$("editTime").value;
  if(t)e.createdAt=new Date(t).toISOString();
  save();render();toast("Record updated.");
};
$("deleteEntryBtn").onclick=ev=>{
  ev.preventDefault();
  entries=entries.filter(e=>e.id!==editingId);
  save();render();editDialog.close();toast("Record deleted.");
};
$("addHistoryBtn").onclick=openHistoryDialog;
$("historyType").onchange=renderHistoryDynamicFields;
$("saveHistoryBtn").onclick=ev=>{
  const type=$("historyType").value;
  const timeValue=$("historyTime").value;
  if(!timeValue){ev.preventDefault();toast("Choose a date and time.");return;}
  const entry={id:makeId(),createdAt:new Date(timeValue).toISOString(),type};
  if(type==="breast"){
    const duration=Number($("historyDuration").value);
    if(!duration||duration<1||duration>180){ev.preventDefault();toast("Enter 1–180 minutes.");return;}
    entry.side=$("historySide").value;
    entry.durationMin=duration;
  }
  if(type==="formula"){
    const amount=Number($("historyAmount").value);
    if(!amount||amount<1||amount>500){ev.preventDefault();toast("Enter 1–500 ml.");return;}
    entry.amount=amount;
  }
  entries.push(entry);
  entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  save();render();toast("Past record added.");
};
$("undoBtn").onclick=()=>{
  if(!entries.length)return;
  const removed=entries.pop();
  save();render();toast(`Undone: ${typeTitle(removed)}`);
};
$("settingsBtn").onclick=()=>{
  $("babyNameInput").value=settings.babyName;
  $("amountsInput").value=settings.formulaAmounts.join(",");
  settingsDialog.showModal();
};
$("saveSettings").onclick=ev=>{
  const amounts=$("amountsInput").value.split(",").map(x=>Number(x.trim())).filter(x=>x>0&&x<=500);
  if(!amounts.length){ev.preventDefault();toast("Enter at least one valid amount.");return;}
  settings={babyName:$("babyNameInput").value.trim()||"Baby",formulaAmounts:[...new Set(amounts)]};
  save();render();
};
$("clearBtn").onclick=()=>{
  if(confirm("Clear all records? This cannot be undone.")){
    entries=[];save();render();toast("All data cleared.");
  }
};
$("exportBtn").onclick=()=>{
  const rows=[["Time","Type","Side","Duration Minutes","Amount ml"]];
  entries.forEach(e=>rows.push([
    new Date(e.createdAt).toLocaleString("en-US"),
    e.type,e.side||"",e.durationMin||"",e.amount||""
  ]));
  const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");
  a.href=url;
  a.download=`baby-tracker-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
$("importBtn").onclick=()=>$("csvFileInput").click();
$("csvFileInput").onchange=async ev=>{
  const file=ev.target.files?.[0];
  ev.target.value="";
  if(!file)return;
  try{
    const text=await file.text();
    const {imported,skipped}=rowsToEntries(parseCSV(text));
    if(!imported.length)throw new Error("No valid records were found.");
    pendingImport=imported;
    $("importSummary").textContent=`Found ${imported.length} valid record${imported.length===1?"":"s"}${skipped?` and skipped ${skipped} invalid row${skipped===1?"":"s"}`:""}.`;
    importDialog.showModal();
  }catch(err){
    toast(err.message||"Could not read this CSV.");
  }
};
$("confirmImportBtn").onclick=()=>{
  const existing=new Set(entries.map(recordSignature));
  let added=0,duplicates=0;
  for(const e of pendingImport){
    const sig=recordSignature(e);
    if(existing.has(sig)){duplicates++;continue;}
    entries.push(e);
    existing.add(sig);
    added++;
  }
  entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  save();render();
  pendingImport=[];
  toast(`Imported ${added} record${added===1?"":"s"}${duplicates?`; skipped ${duplicates} duplicate${duplicates===1?"":"s"}`:""}.`);
};

document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
setInterval(()=>{
  const feeds=entries.filter(e=>e.type==="formula"||e.type==="breast");
  if(feeds.length)$("sinceFeed").textContent=elapsedText(feeds.at(-1).createdAt);
},60000);
