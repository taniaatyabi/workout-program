/* Strength & Mobility: plan viewer, training log and progress tracker.
   No build step, no dependencies. All data lives in localStorage on the device. */
(function () {
"use strict";

/* ---------- logging catalogue ---------- */
// plan: [sets, reps] for weeks 1-4, 5-8, 9-12. unit: kg | reps | sec.
const EX = {
  A1:{name:"Leg press",unit:"kg",plan:[[2,12],[3,10],[3,8]],inc:"one plate (about 5 kg)"},
  A2:{name:"Dumbbell Romanian deadlift",unit:"kg",per:true,plan:[[2,12],[3,10],[3,8]],inc:"1–2 kg per dumbbell"},
  A3:{name:"Goblet box squat",unit:"kg",plan:[[2,10],[3,10],[3,8]],inc:"2 kg"},
  A4:{name:"Outer thigh machine",unit:"kg",plan:[[2,15],[3,15],[3,12]],inc:"one plate"},
  A5:{name:"Dead bug",unit:"reps",plan:[[2,6],[3,8],[3,10]]},
  B1:{name:"Lat pulldown",unit:"kg",plan:[[2,12],[3,10],[3,8]],inc:"one plate"},
  B2:{name:"Seated cable row",unit:"kg",plan:[[2,12],[3,10],[3,8]],inc:"one plate"},
  B3:{name:"Incline dumbbell press",unit:"kg",per:true,plan:[[2,10],[3,10],[3,8]],inc:"1–2 kg per dumbbell"},
  B4:{name:"Cable face pull",unit:"kg",plan:[[2,15],[3,15],[3,15]],inc:"the smallest plate"},
  B5:{name:"Bird dog",unit:"reps",plan:[[2,6],[3,8],[3,10]]},
  C2:{name:"Glute bridge / hip thrust",unit:"kg",plan:[[2,12],[3,10],[3,8]],inc:"2 kg",zero:true},
  C3:{name:"Dumbbell step-up",unit:"kg",per:true,plan:[[2,8],[3,8],[3,10]],inc:"1–2 kg per dumbbell",zero:true},
  C4:{name:"Seated shoulder press",unit:"kg",per:true,plan:[[2,10],[3,10],[3,8]],inc:"1 kg per dumbbell"},
  C5:{name:"Pallof press",unit:"kg",plan:[[2,8],[3,10],[3,10]],inc:"one plate"},
  C6:{name:"Side plank",unit:"sec",plan:[[2,15],[3,20],[3,30]]}
};
const DAYS = {
  A:{name:"Lower body & glutes",ex:["A1","A2","A3","A4","A5"],cardio:"Incline treadmill walk"},
  B:{name:"Upper body & posture",ex:["B1","B2","B3","B4","B5"],cardio:"Rowing machine"},
  C:{name:"Full body & core",ex:["C2","C3","C4","C5","C6"],cardio:"Cross trainer"}
};
const CARDIO_PLAN = [15,20,25];
const PLAN = window.PLAN || {days:[],desk:{moves:[]},guide:{sections:[]}};

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayStr = () => ymd(new Date());
function toDate(s){ const p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function fmt(s, o){ return toDate(s).toLocaleDateString("en-GB", o || {weekday:"short", day:"numeric", month:"short"}); }
function daysBetween(a, b){ return Math.round((toDate(b) - toDate(a)) / 86400000); }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const ls = {
  get(k, f){ try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};

/* ---------- store ---------- */
const KEY = "sm.visits.v1";
let visits = [];
function load(){
  const raw = ls.get(KEY, []);
  visits = Array.isArray(raw) ? raw.filter(v => v && v.id && v.date) : [];
  sortVisits();
}
function sortVisits(){
  visits.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : ((b.createdAt || 0) - (a.createdAt || 0)));
}
function persist(){
  sortVisits();
  const ok = ls.set(KEY, visits);
  if (ok && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  return ok;
}

/* ---------- plan maths ---------- */
function firstDate(excludeId, extra){
  let f = extra || null;
  visits.forEach(v => { if (v.id !== excludeId && (!f || v.date < f)) f = v.date; });
  return f;
}
function weekOf(date, excludeId){ const f = firstDate(excludeId, date); return Math.floor(Math.max(0, daysBetween(f, date)) / 7) + 1; }
const phase = w => w <= 4 ? 0 : w <= 8 ? 1 : 2;
function guessSession(date){ const d = toDate(date).getDay(); return d === 3 || d === 4 ? "B" : d === 5 || d === 6 ? "C" : "A"; }
function entriesFor(ex, beforeDate, excludeId){
  const out = [];
  visits.forEach(v => {
    if (v.id === excludeId) return;
    if (beforeDate && v.date > beforeDate) return;
    (v.entries || []).forEach(e => { if (e.ex === ex) out.push(Object.assign({date:v.date, stamp:v.createdAt || 0}, e)); });
  });
  out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.stamp - b.stamp);
  return out;
}

/* ---------- navigation ---------- */
const VIEWS = ["plan", "log", "progress", "guide"];
function show(view){
  if (!VIEWS.includes(view)) view = "plan";
  VIEWS.forEach(v => { $("view-" + v).hidden = v !== view; });
  document.querySelectorAll(".tabbar button").forEach(b => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  ls.set("sm.view", view);
  if (view === "progress") renderProgress();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tabbar button").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));

/* ---------- PLAN view ---------- */
let planDay = null;
function renderDayTabs(){
  const tabs = PLAN.days.map(d => ({key:d.key, top:"Day " + d.key, sub:d.weekday}));
  tabs.push({key:"desk", top:"Desk", sub:"Every day"});
  $("daytabs").innerHTML = tabs.map(t =>
    '<button type="button" role="tab" data-day="' + t.key + '" aria-selected="' + (t.key === planDay) + '"><b>' + esc(t.top) + '</b>' + esc(t.sub) + '</button>').join("");
}
$("daytabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-day]"); if (!b) return;
  planDay = b.dataset.day; ls.set("sm.planDay", planDay); renderDayTabs(); renderDay(); window.scrollTo(0, 0);
});

function figHTML(f){ return '<figure>' + f.svg + (f.caption ? '<figcaption>' + esc(f.caption) + '</figcaption>' : '') + '</figure>'; }

function renderDay(){
  const box = $("day");
  if (planDay === "desk"){
    const d = PLAN.desk;
    box.innerHTML =
      '<div class="hero teal"><span class="eyebrow">' + esc(d.meta) + '</span><h2>' + esc(d.title) + '</h2><p>' + esc(d.intro) + '</p></div>' +
      d.moves.map((m, i) => '<article class="card"><div class="exhead2"><span class="badge teal">' + (i + 1) + '</span><h3>' + esc(m.name) + '</h3></div>' +
        '<span class="pill teal" style="align-self:flex-start">' + esc(m.dose) + '</span>' +
        '<div class="figs one"><figure>' + m.svg + '</figure></div><p>' + esc(m.how) + '</p></article>').join("") +
      '<div class="card strip"><b>Before bed</b><p>' + esc(d.bedtime) + '</p></div>';
    return;
  }
  const d = PLAN.days.find(x => x.key === planDay) || PLAN.days[0];
  if (!d){ box.innerHTML = ""; return; }
  box.innerHTML =
    '<div class="hero"><span class="eyebrow">' + esc(d.meta) + '</span><h2>' + esc(d.title) + '</h2><p>' + esc(d.focus) + '</p>' +
      '<div class="kit">' + d.kit.map(k => '<span>' + esc(k) + '</span>').join("") + '</div></div>' +
    '<button type="button" class="primary startbtn" data-start="' + d.key + '">Log today as Day ' + d.key + '</button>' +
    '<div class="card strip"><b>Warm-up · 8 min</b><p>' + esc(d.warmup) + '</p></div>' +
    d.exercises.map(e => {
      const dark = /core/i.test(e.tag), teal = /posture/i.test(e.tag);
      return '<article class="card"><div class="exhead2"><span class="badge' + (dark ? ' dark' : teal ? ' teal' : '') + '">' + esc(e.code + (e.tag ? " · " + e.tag : "")) + '</span><h3>' + esc(e.name) + '</h3></div>' +
        (e.kit ? '<span class="kitline">Kit · ' + esc(e.kit) + '</span>' : '') +
        '<div class="pills">' + e.pills.map(p => '<span class="pill"><b>' + esc(p.label) + '</b> ' + esc(p.value) + '</span>').join("") + '</div>' +
        '<div class="figs">' + e.figures.map(figHTML).join("") + '</div>' +
        '<ol class="steps">' + e.steps.map((s, i) => '<li><span>' + (i + 1) + '</span><span>' + esc(s) + '</span></li>').join("") + '</ol>' +
        (e.tip ? '<p class="tip"><strong>' + esc(e.tipLabel) + ':</strong> ' + esc(e.tip) + '</p>' : '') +
      '</article>';
    }).join("") +
    (d.cardio ? '<article class="card cardio"><span class="kitline">Steady cardio · LISS</span><h3>' + esc(d.cardio.name) + '</h3>' +
      '<div class="figs one"><figure>' + d.cardio.svg + '</figure></div>' +
      '<div class="kv">' + d.cardio.rows.map(r => '<b>' + esc(r.label) + '</b><span>' + esc(r.value) + '</span>').join("") + '</div>' +
      '<p class="note">' + esc(d.cardio.note) + '</p></article>' : '') +
    '<div class="card"><h3>Stretch · 5 min</h3><div class="stretches">' + d.stretches.map(s => '<div><b>' + esc(s.name) + '</b><span>' + esc(s.how) + '</span></div>').join("") + '</div></div>';
}
$("day").addEventListener("click", e => {
  const b = e.target.closest("button[data-start]"); if (!b) return;
  if (editingId) exitEdit();
  $("visit-date").value = todayStr();
  $("s-" + b.dataset.start).checked = true;
  renderForm(null);
  show("log");
});

/* ---------- LOG form ---------- */
let editingId = null, pendingDelete = null, formDirty = false;
const currentSession = () => { const r = document.querySelector('input[name="session"]:checked'); return r ? r.value : "A"; };

function renderForm(prefill){
  const date = $("visit-date").value || todayStr();
  const s = currentSession();
  const w = weekOf(date, editingId), ph = phase(w);
  $("form-week").textContent = "Plan week " + w + (w > 12 ? " (past week 12: rerun the heavy block)" : "") + " · " + DAYS[s].name +
    ". Rows are filled from the plan and your last weights. Change anything that was different, untick what you skipped.";
  const byEx = {}; (prefill && prefill.entries || []).forEach(e => { byEx[e.ex] = e; });
  $("exlist").innerHTML = DAYS[s].ex.map(ex => {
    const d = EX[ex], pl = d.plan[ph];
    const prev = entriesFor(ex, date, editingId).pop();
    const e = prefill ? byEx[ex] : null;
    const on = prefill ? !!e : true;
    const kg = e ? e.kg : (prev ? prev.kg : "");
    const sets = e ? e.sets : pl[0], reps = e ? e.reps : pl[1];
    const repsLabel = d.unit === "sec" ? "Seconds held" : d.unit === "reps" ? "Reps each side" : "Reps, hardest set";
    return '<div class="ex' + (on ? '' : ' off') + '">' +
      '<div class="exhead"><label class="check"><input type="checkbox" id="done-' + ex + '"' + (on ? ' checked' : '') + '><span class="code">' + ex + '</span><span>' + esc(d.name) + '</span></label>' +
      '<span class="pill teal">Plan ' + pl[0] + ' × ' + pl[1] + (d.unit === "sec" ? ' s' : '') + '</span></div>' +
      '<div class="fields">' +
      (d.unit === "kg" ? '<label class="field">' + (d.per ? 'kg each' : 'kg') + (prev && !prefill ? ' <span style="font-weight:400">(last ' + esc(prev.kg) + ')</span>' : '') +
        '<input type="number" id="kg-' + ex + '" inputmode="decimal" min="0" step="0.5" value="' + esc(kg) + '"' + (d.zero ? ' placeholder="0 if none"' : '') + '></label>' : '') +
      '<label class="field">Sets<input type="number" id="sets-' + ex + '" inputmode="numeric" min="1" step="1" value="' + esc(sets) + '"></label>' +
      '<label class="field">' + repsLabel + '<input type="number" id="reps-' + ex + '" inputmode="numeric" min="1" step="1" value="' + esc(reps) + '"></label>' +
      '<label class="shook"><input type="checkbox" id="shook-' + ex + '"' + (e && e.shook ? ' checked' : '') + '>It shook</label>' +
      '</div></div>';
  }).join("");
  DAYS[s].ex.forEach(ex => $("done-" + ex).addEventListener("change", ev => ev.target.closest(".ex").classList.toggle("off", !ev.target.checked)));
  $("cardio-name").textContent = (prefill && prefill.cardio && prefill.cardio.machine) || DAYS[s].cardio;
  $("cardio-min").value = prefill ? (prefill.cardio && prefill.cardio.minutes || "") : CARDIO_PLAN[ph];
  $("cardio-min").placeholder = "Plan " + CARDIO_PLAN[ph] + " min";
  formDirty = false;
}
$("form").addEventListener("input", () => { formDirty = true; });

function setMsg(t){ $("form-msg").textContent = t || ""; $("form-msg").hidden = !t; }
function toast(t){ const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2400); }

function collect(){
  const date = $("visit-date").value;
  if (!date) return {err:"Pick the date of the visit."};
  const s = currentSession(), w = weekOf(date, editingId), ph = phase(w);
  const entries = [];
  for (const ex of DAYS[s].ex){
    if (!$("done-" + ex).checked) continue;
    const d = EX[ex];
    const sets = parseInt($("sets-" + ex).value, 10), reps = parseInt($("reps-" + ex).value, 10);
    if (!(sets > 0) || !(reps > 0)) return {err:"Add sets and reps for " + d.name + ", or untick it."};
    let kg = null;
    if (d.unit === "kg"){ kg = parseFloat($("kg-" + ex).value); if (!(kg >= 0)) return {err:"Add the weight for " + d.name + " (0 if you used none), or untick it."}; }
    entries.push({ex, kg, sets, reps, target:d.plan[ph][1], shook:$("shook-" + ex).checked});
  }
  const mins = parseInt($("cardio-min").value, 10);
  const cardio = mins > 0 ? {machine:$("cardio-name").textContent, minutes:mins} : null;
  if (!entries.length && !cardio) return {err:"Tick at least one exercise or add your cardio minutes."};
  return {body:{date, session:s, week:w, entries, cardio, notes:$("notes").value.trim().slice(0, 2000)}};
}

$("form").addEventListener("submit", ev => {
  ev.preventDefault();
  const r = collect();
  if (r.err){ setMsg(r.err); return; }
  setMsg("");
  const now = Date.now();
  if (editingId){
    const i = visits.findIndex(v => v.id === editingId);
    const old = i >= 0 ? visits[i] : {};
    const rec = Object.assign({id:editingId}, r.body, {createdAt:old.createdAt || now, updatedAt:now});
    if (i >= 0) visits[i] = rec; else visits.push(rec);
  } else {
    visits.push(Object.assign({id:uid()}, r.body, {createdAt:now, updatedAt:now}));
  }
  if (!persist()){ setMsg("Your phone couldn't save that. Free up some storage and try again."); load(); return; }
  toast(editingId ? "Visit updated" : "Visit saved");
  const k = r.body.entries.find(e => EX[e.ex].unit === "kg") || r.body.entries[0];
  if (k) pickEx = k.ex;
  exitEdit();
  renderAll();
});

function exitEdit(){
  editingId = null; $("edit-flag").hidden = true; $("cancel-btn").hidden = true; $("save-btn").textContent = "Save visit";
  $("notes").value = ""; $("visit-date").value = todayStr();
  $("s-" + guessSession(todayStr())).checked = true;
  renderForm(null);
}
$("cancel-btn").addEventListener("click", exitEdit);
$("visit-date").addEventListener("change", () => {
  if (!editingId) $("s-" + guessSession($("visit-date").value || todayStr())).checked = true;
  renderForm(editingId ? visits.find(v => v.id === editingId) : null);
});
document.querySelectorAll('input[name="session"]').forEach(r => r.addEventListener("change", () => renderForm(null)));

function startEdit(id){
  const v = visits.find(x => x.id === id); if (!v) return;
  editingId = id; $("edit-flag").hidden = false; $("cancel-btn").hidden = false; $("save-btn").textContent = "Update visit";
  $("visit-date").value = v.date; $("s-" + (v.session || "A")).checked = true; $("notes").value = v.notes || "";
  renderForm(v); setMsg(""); window.scrollTo(0, 0);
}

/* ---------- stats ---------- */
function renderStats(){
  const t = todayStr();
  $("st-visits").textContent = visits.length;
  const now = toDate(t), mon = new Date(now); mon.setDate(now.getDate() - (now.getDay() + 6) % 7);
  const days = new Set(visits.filter(v => v.date >= ymd(mon) && v.date <= t).map(v => v.date));
  $("st-this").textContent = days.size + " / 3";
  $("weekchip").textContent = visits.length ? "Week " + weekOf(t) : "Week 1";
}

/* ---------- history ---------- */
function renderVisits(){
  const box = $("visits");
  if (!visits.length){
    box.innerHTML = '<div class="empty"><b>No visits yet</b>Fill in the form above after your first session. The rows come pre-filled from the plan, so it takes about a minute.</div>';
    return;
  }
  box.innerHTML = visits.map(v => {
    const items = (v.entries || []).map(e => {
      const d = EX[e.ex]; if (!d) return "";
      return '<li><span>' + esc(d.name) + (e.shook ? ' <span class="flag">· shook</span>' : '') + '</span><span>' +
        (d.unit === "kg" ? esc(e.kg) + ' kg · ' : '') + esc(e.sets) + ' × ' + esc(e.reps) + (d.unit === "sec" ? ' s' : '') + '</span></li>';
    }).join("") + (v.cardio ? '<li><span>' + esc(v.cardio.machine) + '</span><span>' + esc(v.cardio.minutes) + ' min</span></li>' : '');
    const del = pendingDelete === v.id;
    return '<article class="visit"><header><h3>' + esc(fmt(v.date, {weekday:"long", day:"numeric", month:"long"})) + '</h3>' +
      '<span style="display:flex;gap:8px;align-items:center"><span class="caption">Week ' + esc(weekOf(v.date)) + '</span><span class="badge">Day ' + esc(v.session || "") + '</span></span></header>' +
      '<ul>' + items + '</ul>' + (v.notes ? '<p class="vnote">' + esc(v.notes) + '</p>' : '') +
      '<div class="btns">' + (del
        ? '<span style="font-weight:600">Delete this visit for good?</span><button type="button" class="small danger" data-act="confirm" data-id="' + esc(v.id) + '">Delete</button><button type="button" class="small" data-act="keep">Keep it</button>'
        : '<button type="button" class="small" data-act="edit" data-id="' + esc(v.id) + '">Edit</button><button type="button" class="small" data-act="del" data-id="' + esc(v.id) + '">Delete</button>') +
      '</div></article>';
  }).join("");
}
$("visits").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-act]"); if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === "edit") startEdit(id);
  else if (act === "del"){ pendingDelete = id; renderVisits(); }
  else if (act === "keep"){ pendingDelete = null; renderVisits(); }
  else if (act === "confirm"){
    visits = visits.filter(v => v.id !== id); pendingDelete = null; persist();
    if (editingId === id) exitEdit();
    toast("Visit deleted"); renderAll();
  }
});

/* ---------- PROGRESS ---------- */
let pickEx = null;
function renderPicker(){
  if (!pickEx){
    const e = visits[0] && visits[0].entries && (visits[0].entries.find(x => EX[x.ex] && EX[x.ex].unit === "kg") || visits[0].entries[0]);
    pickEx = e ? e.ex : "A1";
  }
  $("ex-pick").innerHTML = Object.keys(DAYS).map(d => '<optgroup label="Day ' + d + ' · ' + esc(DAYS[d].name) + '">' +
    DAYS[d].ex.map(ex => { const n = entriesFor(ex).length; return '<option value="' + ex + '"' + (ex === pickEx ? ' selected' : '') + '>' + ex + ' ' + esc(EX[ex].name) + (n ? ' (' + n + ')' : '') + '</option>'; }).join("") +
    '</optgroup>').join("");
}
$("ex-pick").addEventListener("change", e => { pickEx = e.target.value; renderProgress(); });

function verdictFor(ex, list){
  const d = EX[ex];
  if (!list.length) return {cls:"stay", h:"Nothing logged yet", t:"Log " + d.name + " on your next Day " + ex[0] + " and it will show up here."};
  const last = list[list.length - 1];
  if (last.shook) return {cls:"wobble", h:"Hold steady", t:"It shook last time. Stay " + (d.unit === "kg" ? "at " + last.kg + " kg" : "at these numbers") + " until a session feels smooth, and slow the lowering to a count of three."};
  if (list.length < 2) return {cls:"stay", h:"One session in", t:"Log one more session of this to see whether it's time to go up."};
  const prev = list[list.length - 2];
  const same = d.unit !== "kg" || Number(prev.kg) === Number(last.kg);
  const hit = e => Number(e.reps) >= Number(e.target || 0);
  if (same && hit(prev) && hit(last) && !prev.shook){
    if (d.unit === "kg") return {cls:"go", h:"Ready to go up", t:"Your last two sessions hit " + last.target + " reps at " + last.kg + " kg. Add " + d.inc + " next time and expect fewer reps for a week or two."};
    return {cls:"go", h:"Ready for more", t:"Two sessions in a row on target. Add " + (d.unit === "sec" ? "5 seconds to each hold" : "a rep or two each side") + ", or slow every rep down."};
  }
  if (d.unit === "kg") return {cls:"stay", h:"Stay at " + last.kg + " kg", t:"Go up once two sessions in a row hit " + (last.target || "the plan's") + " reps on every set, with no shaking."};
  return {cls:"stay", h:"Keep building", t:"Aim for " + (last.target || "the plan's number") + (d.unit === "sec" ? " seconds" : " reps") + " on every set, two sessions in a row."};
}
function nice(x){ if (!(x > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
const valueOf = e => EX[e.ex].unit === "kg" ? Number(e.kg) : Number(e.reps);
function tipText(ex, e){ const u = EX[ex].unit; return (u === "kg" ? e.kg + " kg · " : "") + e.sets + " × " + e.reps + (u === "sec" ? " s" : "") + (e.shook ? " · shook" : ""); }

function renderProgress(){
  if ($("view-progress").hidden) return;
  const ex = pickEx, d = EX[ex], list = entriesFor(ex);
  const v = verdictFor(ex, list);
  $("verdict").innerHTML = '<div class="verdict ' + v.cls + '"><b>' + esc(v.h) + '</b>' + esc(v.t) + '</div>';
  const box = $("chartbox");
  if (!list.length){
    box.innerHTML = '<div class="empty"><b>No data yet</b>Each time you log ' + esc(d.name) + ', a point appears here and the line climbs as you get stronger.</div>';
    $("chart-cap").textContent = ""; $("tbl").innerHTML = ""; $("tbl-wrap").hidden = true; return;
  }
  $("tbl-wrap").hidden = false;
  drawChart(box, list, ex);
  $("chart-cap").textContent = (d.unit === "kg" ? "Weight in kg" + (d.per ? " per dumbbell" : "") : d.unit === "sec" ? "Seconds held" : "Reps each side") + " per session. Hollow dots mark sessions where it shook.";
  $("tbl").innerHTML = '<table><thead><tr><th>Date</th><th>Week</th>' + (d.unit === "kg" ? '<th>Weight</th>' : '') + '<th>Sets × reps</th><th>Target</th><th>Shook</th></tr></thead><tbody>' +
    list.slice().reverse().map(e => '<tr><td>' + esc(fmt(e.date)) + '</td><td>' + esc(weekOf(e.date)) + '</td>' + (d.unit === "kg" ? '<td>' + esc(e.kg) + ' kg</td>' : '') +
      '<td>' + esc(e.sets) + ' × ' + esc(e.reps) + '</td><td>' + esc(e.target || "") + '</td><td>' + (e.shook ? 'Yes' : '') + '</td></tr>').join("") + '</tbody></table>';
}

function drawChart(box, list, ex){
  const W = Math.max(300, box.clientWidth || 360), H = W < 480 ? 220 : 260;
  const L = 40, R = 66, T = 22, B = 34, pw = W - L - R, ph = H - T - B;
  const vals = list.map(valueOf);
  let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  if (lo === hi){ lo -= 2; hi += 2; }
  const step = nice((hi - lo) / 4);
  lo = Math.max(0, Math.floor(lo / step) * step); hi = Math.ceil(hi / step) * step; if (hi === lo) hi = lo + step;
  const ts = list.map(e => toDate(e.date).getTime()), t0 = ts[0], t1 = ts[ts.length - 1];
  const x = i => list.length === 1 ? L + pw / 2 : (t1 === t0 ? L + pw * i / (list.length - 1) : L + pw * (ts[i] - t0) / (t1 - t0));
  const y = v => T + ph - (v - lo) / (hi - lo) * ph;
  let g = "";
  for (let v = lo; v <= hi + 1e-9; v += step){
    const yy = y(v).toFixed(1);
    g += '<line class="c-grid" x1="' + L + '" x2="' + (W - R + 8) + '" y1="' + yy + '" y2="' + yy + '"/><text class="c-lbl" x="' + (L - 8) + '" y="' + yy + '" dy="4" text-anchor="end">' + (+v.toFixed(1)) + '</text>';
  }
  const pts = list.map((e, i) => [x(i), y(vals[i])]);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = list.length > 1 ? path + " L" + pts[pts.length - 1][0].toFixed(1) + " " + (T + ph) + " L" + pts[0][0].toFixed(1) + " " + (T + ph) + " Z" : "";
  let dots = "", hits = "";
  list.forEach((e, i) => {
    const p = pts[i];
    dots += '<circle class="c-dot' + (e.shook ? ' hollow' : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (e.shook ? 5 : 5.5) + '"/>';
    hits += '<circle class="c-hit" data-i="' + i + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="18" tabindex="0" role="img" aria-label="' + esc(fmt(e.date) + ", " + tipText(ex, e)) + '"/>';
  });
  const lp = pts[pts.length - 1], le = list[list.length - 1];
  const endLbl = EX[ex].unit === "kg" ? (+Number(le.kg).toFixed(1)) + " kg" : le.reps + (EX[ex].unit === "sec" ? " s" : "");
  const xl = '<text class="c-lbl" x="' + pts[0][0].toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' + (list.length === 1 ? "middle" : "start") + '">' + esc(fmt(list[0].date, {day:"numeric", month:"short"})) + '</text>' +
    (list.length > 1 ? '<text class="c-lbl" x="' + lp[0].toFixed(1) + '" y="' + (H - 10) + '" text-anchor="end">' + esc(fmt(le.date, {day:"numeric", month:"short"})) + '</text>' : '');
  box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(EX[ex].name) + ' progress chart">' + g +
    '<line class="c-base" x1="' + L + '" x2="' + (W - R + 8) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '"/>' +
    (area ? '<path class="c-area" d="' + area + '"/>' : '') + (list.length > 1 ? '<path class="c-line" d="' + path + '"/>' : '') +
    dots + '<text class="c-end" x="' + (lp[0] + 12).toFixed(1) + '" y="' + lp[1].toFixed(1) + '" dy="5">' + esc(endLbl) + '</text>' + xl + hits +
    '</svg><div class="ctip" hidden></div>';
  const tip = box.querySelector(".ctip"), svg = box.querySelector("svg");
  const showTip = el => {
    const i = +el.dataset.i, s = svg.getBoundingClientRect().width / W;
    tip.textContent = fmt(list[i].date) + " · " + tipText(ex, list[i]);
    tip.style.left = Math.min(Math.max(pts[i][0] * s, 90), svg.getBoundingClientRect().width - 90) + "px";
    tip.style.top = (pts[i][1] * s) + "px"; tip.hidden = false;
  };
  box.querySelectorAll(".c-hit").forEach(h => {
    h.addEventListener("click", () => showTip(h)); h.addEventListener("mouseenter", () => showTip(h)); h.addEventListener("focus", () => showTip(h));
    h.addEventListener("mouseleave", () => { tip.hidden = true; }); h.addEventListener("blur", () => { tip.hidden = true; });
  });
}
let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(renderProgress, 150); });

/* ---------- GUIDE + backup ---------- */
function renderGuide(){
  const g = PLAN.guide;
  $("guide").innerHTML = '<div class="card">' + g.sections.map(s => '<div class="guide-sec"><h3>' + esc(s.title) + '</h3>' + s.paras.map(p => '<p>' + esc(p) + '</p>').join("") + '</div>').join("") +
    (g.gp ? '<p class="gp">' + esc(g.gp) + '</p>' : '') + '</div>';
}
$("export-btn").addEventListener("click", async () => {
  const data = JSON.stringify({app:"strength-mobility", version:1, exportedAt:new Date().toISOString(), visits}, null, 1);
  const name = "strength-log-" + todayStr() + ".json";
  try {
    const file = new File([data], name, {type:"application/json"});
    if (navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:"Strength log backup"});
      $("data-msg").textContent = "Backup ready. Choose Save to Files to keep it in iCloud Drive or on your phone.";
      return;
    }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], {type:"application/json"})); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  $("data-msg").textContent = "Backup downloaded as " + name + ".";
});
$("import-file").addEventListener("change", ev => {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const raw = JSON.parse(rd.result);
      const list = Array.isArray(raw) ? raw : raw.visits;
      if (!Array.isArray(list)) throw new Error("shape");
      let n = 0;
      list.forEach(v => {
        if (!v || typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !Array.isArray(v.entries)) return;
        const rec = Object.assign({}, v, {id:String(v.id || uid())});
        const i = visits.findIndex(x => x.id === rec.id);
        if (i >= 0) visits[i] = rec; else visits.push(rec);
        n++;
      });
      persist(); renderAll();
      $("data-msg").textContent = n ? "Restored " + n + " visit" + (n === 1 ? "" : "s") + "." : "That file had no visits in it.";
    } catch (e) {
      $("data-msg").textContent = "That file isn't a backup from this app. Pick a file that starts with strength-log.";
    }
    ev.target.value = "";
  };
  rd.readAsText(f);
});

/* ---------- boot ---------- */
function renderAll(){ renderStats(); renderPicker(); renderProgress(); renderVisits(); }
function boot(){
  load();
  const t = todayStr(), dow = new Date().getDay();
  planDay = ls.get("sm.planDay", null) || ({1:"A", 3:"B", 5:"C"}[dow] || "A");
  renderDayTabs(); renderDay(); renderGuide();
  $("visit-date").value = t; $("s-" + guessSession(t)).checked = true;
  renderForm(null); renderAll();
  show(ls.get("sm.view", "plan"));
  window.addEventListener("storage", e => { if (e.key === KEY){ load(); if (!editingId && !formDirty) renderForm(null); renderAll(); } });
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
}
boot();
})();
