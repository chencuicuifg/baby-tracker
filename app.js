const STORAGE_KEY="babyTrackerEntriesV1", SETTINGS_KEY="babyTrackerSettingsV1";
let entries=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
let settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{"babyName":"宝宝","formulaAmounts":[10,20,30,40,60]}');
let pendingBreastSide=null, editingId=null;
const $=id=>document.getElementById(id);
const formulaDialog=$("formulaDialog"), breastDialog=$("breastDialog"), historyDialog=$("historyDialog"), editDialog=$("editDialog"), settingsDialog=$("settingsDialog");
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
function nowISO(){return new Date().toISOString();}
function sameLocalDay(iso,date=new Date()){const d=new Date(iso);return d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth()&&d.getDate()===date.getDate();}
function formatTime(iso){return new Intl.DateTimeFormat("zh-CN",{hour:"numeric",minute:"2-digit"}).format(new Date(iso));}
function elapsedText(iso){const mins=Math.max(0,Math.floor((Date.now()-new Date(iso))/60000));if(mins<60)return`${mins} 分钟`;return`${Math.floor(mins/60)} 小时 ${mins%60} 分钟`;}
function typeTitle(e){if(e.type==="pee")return"💧 尿尿";if(e.type==="poop")return"💩 便便";if(e.type==="formula")return`🍼 Formula ${e.amount} ml`;return`🤱 ${e.side==="left"?"左侧":"右侧"}母乳`;}
function metaText(e){return e.type==="breast"?`${e.durationMin} 分钟`:"已记录";}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1600);}
function addEntry(entry){entries.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),createdAt:nowISO(),...entry});save();render();toast(`${typeTitle(entries.at(-1))} · 已记录`);}
function renderFormulaButtons(){const grid=$("amountGrid");grid.innerHTML="";settings.formulaAmounts.forEach(amount=>{const b=document.createElement("button");b.type="button";b.className="amount-btn";b.textContent=`${amount} ml`;b.onclick=()=>{addEntry({type:"formula",amount:Number(amount)});formulaDialog.close();};grid.appendChild(b);});}
function renderDurationButtons(){const grid=$("durationGrid");grid.innerHTML="";[5,10,15,20,25,30].forEach(min=>{const b=document.createElement("button");b.type="button";b.className="amount-btn";b.textContent=`${min} 分钟`;b.onclick=()=>{$("breastDuration").value=min;};grid.appendChild(b);});}
function render(){const today=new Date(),todays=entries.filter(e=>sameLocalDay(e.createdAt,today));$("todayTitle").textContent=`${settings.babyName}记录`;$("peeCount").textContent=todays.filter(e=>e.type==="pee").length;$("poopCount").textContent=todays.filter(e=>e.type==="poop").length;$("formulaTotal").textContent=`${todays.filter(e=>e.type==="formula").reduce((a,e)=>a+Number(e.amount||0),0)} ml`;$("breastTotal").textContent=`${todays.filter(e=>e.type==="breast").reduce((a,e)=>a+Number(e.durationMin||0),0)} 分钟`;const feeds=entries.filter(e=>e.type==="formula"||e.type==="breast");$("sinceFeed").textContent=feeds.length?elapsedText(feeds.at(-1).createdAt):"暂无记录";const list=$("historyList");list.innerHTML="";entries.slice().reverse().slice(0,30).forEach(e=>{const li=document.createElement("li");li.className="log-item";li.innerHTML=`<div><div class="log-title">${typeTitle(e)}</div><div class="log-meta">${metaText(e)}</div></div><div class="log-time">${formatTime(e.createdAt)}</div>`;li.onclick=()=>openEdit(e.id);list.appendChild(li);});$("emptyState").classList.toggle("hidden",entries.length>0);$("undoBtn").disabled=entries.length===0;}
function openBreast(side){pendingBreastSide=side;$("breastDialogTitle").textContent=`记录${side==="left"?"左侧":"右侧"}母乳`;$("breastDuration").value="";renderDurationButtons();breastDialog.showModal();}
function localInputValue(iso){const d=new Date(iso),pad=n=>String(n).padStart(2,"0");return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}

function defaultHistoryTime(){
  return localInputValue(new Date().toISOString());
}
function renderHistoryDynamicFields(){
  const type=$("historyType").value;
  const wrap=$("historyDynamicFields");
  if(type==="breast"){
    wrap.innerHTML=`<label>侧别<select id="historySide"><option value="left">左侧</option><option value="right">右侧</option></select></label><label>时长<div class="duration-row"><input id="historyDuration" type="number" inputmode="numeric" min="1" max="180" placeholder="例如 15"><span>分钟</span></div></label>`;
  }else if(type==="formula"){
    wrap.innerHTML=`<label>奶量<div class="duration-row"><input id="historyAmount" type="number" inputmode="decimal" min="1" max="500" placeholder="例如 30"><span>ml</span></div></label>`;
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
function openEdit(id){const e=entries.find(x=>x.id===id);if(!e)return;editingId=id;let html=`<div class="edit-type">${typeTitle(e)}</div>`;if(e.type==="formula")html+=`<label>奶量<div class="duration-row"><input id="editAmount" type="number" min="1" max="500" value="${e.amount}"><span>ml</span></div></label>`;if(e.type==="breast")html+=`<label>侧别<select id="editSide"><option value="left" ${e.side==="left"?"selected":""}>左侧</option><option value="right" ${e.side==="right"?"selected":""}>右侧</option></select></label><label>时长<div class="duration-row"><input id="editDuration" type="number" min="1" max="180" value="${e.durationMin}"><span>分钟</span></div></label>`;html+=`<label>时间<input id="editTime" type="datetime-local" value="${localInputValue(e.createdAt)}"></label>`;$("editFields").innerHTML=html;editDialog.showModal();}
document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>{const a=btn.dataset.action;if(a==="pee")addEntry({type:"pee"});if(a==="poop")addEntry({type:"poop"});if(a==="formula"){renderFormulaButtons();$("customAmount").value="";formulaDialog.showModal();}if(a==="breast-left")openBreast("left");if(a==="breast-right")openBreast("right");}));
$("saveBreast").onclick=ev=>{const n=Number($("breastDuration").value);if(!n||n<1||n>180){ev.preventDefault();toast("请输入 1–180 分钟");return;}addEntry({type:"breast",side:pendingBreastSide,durationMin:n});};
$("saveCustomAmount").onclick=ev=>{const n=Number($("customAmount").value);if(!n||n<1||n>500){ev.preventDefault();toast("请输入 1–500 ml");return;}addEntry({type:"formula",amount:n});};
$("saveEditBtn").onclick=ev=>{const e=entries.find(x=>x.id===editingId);if(!e)return;if(e.type==="formula"){const n=Number($("editAmount").value);if(!n||n<1||n>500){ev.preventDefault();toast("请输入 1–500 ml");return;}e.amount=n;}if(e.type==="breast"){const n=Number($("editDuration").value);if(!n||n<1||n>180){ev.preventDefault();toast("请输入 1–180 分钟");return;}e.durationMin=n;e.side=$("editSide").value;}const t=$("editTime").value;if(t)e.createdAt=new Date(t).toISOString();save();render();toast("记录已修改");};
$("deleteEntryBtn").onclick=ev=>{ev.preventDefault();entries=entries.filter(e=>e.id!==editingId);save();render();editDialog.close();toast("记录已删除");};

$("addHistoryBtn").onclick=openHistoryDialog;
$("historyType").onchange=renderHistoryDynamicFields;
$("saveHistoryBtn").onclick=ev=>{
  const type=$("historyType").value;
  const timeValue=$("historyTime").value;
  if(!timeValue){
    ev.preventDefault();
    toast("请选择发生时间");
    return;
  }
  const entry={
    id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),
    createdAt:new Date(timeValue).toISOString(),
    type
  };
  if(type==="breast"){
    const duration=Number($("historyDuration").value);
    if(!duration||duration<1||duration>180){
      ev.preventDefault();
      toast("请输入 1–180 分钟");
      return;
    }
    entry.side=$("historySide").value;
    entry.durationMin=duration;
  }
  if(type==="formula"){
    const amount=Number($("historyAmount").value);
    if(!amount||amount<1||amount>500){
      ev.preventDefault();
      toast("请输入 1–500 ml");
      return;
    }
    entry.amount=amount;
  }
  entries.push(entry);
  entries.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  save();
  render();
  toast("历史记录已补录");
};
$("undoBtn").onclick=()=>{if(!entries.length)return;const removed=entries.pop();save();render();toast(`已撤销：${typeTitle(removed)}`);};
$("settingsBtn").onclick=()=>{$("babyNameInput").value=settings.babyName;$("amountsInput").value=settings.formulaAmounts.join(",");settingsDialog.showModal();};
$("saveSettings").onclick=ev=>{const amounts=$("amountsInput").value.split(",").map(x=>Number(x.trim())).filter(x=>x>0&&x<=500);if(!amounts.length){ev.preventDefault();toast("至少填写一个有效奶量");return;}settings={babyName:$("babyNameInput").value.trim()||"宝宝",formulaAmounts:[...new Set(amounts)]};save();render();};
$("clearBtn").onclick=()=>{if(confirm("确定清空全部记录吗？这个操作不能撤销。")){entries=[];save();render();toast("全部数据已清空");}};
$("exportBtn").onclick=()=>{const rows=[["时间","类型","侧别","时长分钟","奶量ml"]];entries.forEach(e=>rows.push([new Date(e.createdAt).toLocaleString("zh-CN"),e.type,e.side||"",e.durationMin||"",e.amount||""]));const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`宝宝记录-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);};
document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();setInterval(()=>{const feeds=entries.filter(e=>e.type==="formula"||e.type==="breast");if(feeds.length)$("sinceFeed").textContent=elapsedText(feeds.at(-1).createdAt);},60000);
