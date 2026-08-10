/* Set this after deploying your Cloudflare Worker */
const WORKER_URL = "https://m3ureslover.gom3u-site.workers.dev/";

const state={channels:[],filtered:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function toast(m){const e=$("#toast");e.textContent=m;e.classList.add("show");clearTimeout(window.__t);window.__t=setTimeout(()=>e.classList.remove("show"),2600)}
function attr(t,n){const m=t.match(new RegExp(n+'="([^"]*)"','i'));return m?m[1]:""}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function parseM3U(text){
 const lines=text.replace(/\r/g,"").split("\n"),out=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim(); if(!line.startsWith("#EXTINF"))continue;
  const url=(lines.slice(i+1).find(x=>x.trim()&&!x.trim().startsWith("#"))||"").trim(); if(!url)continue;
  const comma=line.indexOf(","),display=comma>=0?line.slice(comma+1).trim():"Unknown Channel";
  out.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name:display||attr(line,"tvg-name")||"Unknown Channel",logo:attr(line,"tvg-logo"),group:attr(line,"group-title"),url,resolved:"",status:"Not resolved",code:""});
 }
 return out;
}
function render(){
 const q=$("#search").value.trim().toLowerCase();
 state.filtered=state.channels.filter(c=>!q||(c.name+" "+c.url+" "+c.resolved).toLowerCase().includes(q));
 const b=$("#channelBody");
 b.innerHTML=state.filtered.length?state.filtered.map(c=>`<tr><td><input class="select-row" type="checkbox" data-id="${c.id}"></td><td><div class="channel">${c.logo?`<img class="logo" src="${esc(c.logo)}" onerror="this.style.visibility='hidden'">`:`<div class="logo"></div>`}<div><div class="name">${esc(c.name)}</div><div class="meta">${esc(c.group||"")}</div></div></div></td><td><div class="url" title="${esc(c.url)}">${esc(c.url)}</div></td><td>${c.resolved?`<div class="resolved" title="${esc(c.resolved)}">${esc(c.resolved)}</div>`:`<span class="meta">—</span>`}</td><td><span class="status ${c.status==="Resolved"||c.status==="No Redirect"?"ok":c.status==="Failed"?"fail":c.status==="Resolving"?"pending":""}">${esc(c.status)}${c.code?` (${esc(c.code)})`:""}</span></td><td><button class="small resolve-one" data-id="${c.id}">Resolve</button> <button class="small copy-one" data-id="${c.id}" ${c.resolved?"":"disabled"}>Copy</button></td></tr>`).join(""):'<tr><td colspan="6" class="empty">No channels found.</td></tr>';
 $("#totalCount").textContent=`${state.channels.length} channel${state.channels.length===1?"":"s"}`;
 $("#selectedCount").textContent=`${$$(".select-row:checked").length} selected`;
 $("#resolveAll").disabled=!state.channels.length;$("#resolveSelected").disabled=!state.channels.length;$("#exportM3u").disabled=!state.channels.length;
}
async function loadText(t){state.channels=parseM3U(t);render();toast(`${state.channels.length} channel(s) loaded`)}
async function api(path,body){if(WORKER_URL.includes("YOUR-WORKER"))throw new Error("Set WORKER_URL in assets/app.js first");const r=await fetch(WORKER_URL+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!d.ok)throw new Error(d.error||"Request failed");return d}
async function loadUrl(){
 const url=$("#m3uUrl").value.trim();if(!/^https?:\/\//i.test(url))return toast("Enter a valid HTTP/HTTPS URL.");
 try{const d=await api("/fetch",{url});await loadText(d.body)}catch(e){toast(e.message)}
}
async function resolveChannel(c){
 c.status="Resolving";render();
 try{const d=await api("/resolve",{url:c.url});c.resolved=d.final_url||c.url;c.code=String(d.status||"");c.status=d.redirected?"Resolved":"No Redirect"}catch(e){c.status="Failed";c.resolved="";c.code="";toast(`${c.name}: ${e.message}`)}render();
}
async function resolveList(list){for(const c of list)await resolveChannel(c);toast("Resolve completed")}
function selected(){const ids=new Set($$(".select-row:checked").map(x=>x.dataset.id));return state.channels.filter(c=>ids.has(c.id))}
$("#loadUrlBtn").onclick=loadUrl;
$("#parsePasteBtn").onclick=()=>loadText($("#m3uText").value);
$("#m3uFile").onchange=async e=>{const f=e.target.files[0];if(f)loadText(await f.text())};
$("#search").oninput=render;
$("#resolveAll").onclick=()=>resolveList([...state.channels]);
$("#resolveSelected").onclick=()=>resolveList(selected());
$("#selectAll").onchange=e=>{$$(".select-row").forEach(x=>x.checked=e.target.checked);$("#selectedCount").textContent=`${$$(".select-row:checked").length} selected`};
$("#channelBody").onclick=async e=>{const id=e.target.dataset.id;if(!id)return;const c=state.channels.find(x=>x.id===id);if(!c)return;if(e.target.classList.contains("resolve-one"))await resolveChannel(c);if(e.target.classList.contains("copy-one")&&c.resolved){await navigator.clipboard.writeText(c.resolved);toast("URL copied")}};
$("#channelBody").onchange=e=>{if(e.target.classList.contains("select-row"))$("#selectedCount").textContent=`${$$(".select-row:checked").length} selected`};
$("#exportM3u").onclick=()=>{let t="#EXTM3U\n";for(const c of state.channels){const u=c.resolved||c.url;t+=`#EXTINF:-1${c.logo?` tvg-logo="${c.logo}"`:""}${c.group?` group-title="${c.group}"`:""},${c.name}\n${u}\n`}const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"audio/x-mpegurl"}));a.download="resolved.m3u";a.click()};
$$(".tab").forEach(btn=>btn.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));$$(".tab-panel").forEach(x=>x.classList.remove("active"));btn.classList.add("active");$("#"+btn.dataset.tab).classList.add("active")});
