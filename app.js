const state = { currentDate: null, card: null, door: 'suggested' };
const views = { journal: 'journalView', atlas: 'atlasView', alchemy: 'alchemyView', method: 'methodView' };

const fallbackCards = {
  '2026-08-30': {
    suggested:{movement:'Present',lens:'Identity & Authenticity',depth:'🌿 Gentle',format:'Observation',question:'When I don\'t need to explain, improve, perform, or make sense of myself, what parts of me naturally take up space?'},
    gentler:{question:'What feels distinctly mine today, even if it is small, ordinary, or difficult to explain?'},
    different:{lens:'Joy, Pleasure & Curiosity',question:'What have I wanted to learn, notice, collect, watch, read, or explore lately simply because it interests me?'},
    wildcard:{format:'Curiosity Map',question:'Start with one thing you like. Follow each association wherever it goes until the trail naturally stops.'},
    freewrite:{question:'What has my attention today?'}
  }
};

function localIsoDate(){
  const d = new Date();
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function niceDate(iso){return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});}

function parsePromptMarkdown(md){
  const clean = s => s.replace(/^>\s*\*\*?|\*\*$/g,'').replace(/^>\s*/,'').trim();
  const section = name => {
    const re = new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |\\n### |$)`,'i');
    const m=md.match(re); return m?m[1].trim():'';
  };
  const suggestedBlock = section('Suggested Prompt');
  const field = (label,txt=suggestedBlock) => {const m=txt.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`,'i'));return m?m[1].trim():'';};
  const quoted = txt => {const line=txt.split('\n').find(l=>l.trim().startsWith('>'));return line?clean(line):'';};
  const gentlerBlock=section('🌿 Gentler');
  const differentBlock=section('🔀 Different Direction');
  const wildcardMatch=md.match(/## 🎲 Wildcard(?:\s*[—-]\s*([^\n]+))?\n([\s\S]*?)(?=\n## |\n### |$)/i);
  const freewriteBlock=section('🪶 Freewrite');
  return {
    suggested:{movement:field('Movement'),lens:field('Lens'),depth:field('Depth'),format:field('Format'),question:quoted(suggestedBlock)},
    gentler:{question:quoted(gentlerBlock)},
    different:{lens:field('Lens',differentBlock),question:quoted(differentBlock)},
    wildcard:{format:wildcardMatch?.[1]?.trim()||'Wildcard',question:wildcardMatch?quoted(wildcardMatch[2]):''},
    freewrite:{question:quoted(freewriteBlock)||'What has my attention today?'}
  };
}

async function loadCard(iso){
  if(fallbackCards[iso]) return fallbackCards[iso];
  const path=`prompts/2026/${iso}.md`;
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`Prompt not found: ${iso}`);
  return parsePromptMarkdown(await res.text());
}

function renderDoor(){
  const item=state.card?.[state.door]; if(!item)return;
  const meta=document.getElementById('promptMeta'); meta.innerHTML='';
  const parts=[];
  if(state.door==='suggested') parts.push(item.movement,item.lens,item.depth,item.format);
  else if(state.door==='different' && item.lens) parts.push('Different Direction',item.lens);
  else if(state.door==='wildcard' && item.format) parts.push('Wildcard',item.format);
  else parts.push(state.door==='gentler'?'🌿 Gentler':state.door==='freewrite'?'🪶 Freewrite':'Prompt');
  parts.filter(Boolean).forEach(t=>{const s=document.createElement('span');s.className='meta-pill';s.textContent=t;meta.appendChild(s)});
  document.getElementById('promptQuestion').textContent=item.question||'What has my attention today?';
  document.querySelectorAll('.door-tab').forEach(btn=>{const active=btn.dataset.door===state.door;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));});
}

async function openDate(iso){
  state.currentDate=iso;state.door='suggested';
  document.getElementById('todayEyebrow').textContent=iso===localIsoDate()?'JOURNAL · TODAY':'JOURNAL · PROMPT CARD';
  document.getElementById('todayTitle').textContent=niceDate(iso);
  try{state.card=await loadCard(iso);renderDoor();}
  catch(err){
    state.card=null;
    document.getElementById('promptMeta').innerHTML='';
    document.getElementById('promptQuestion').textContent='No Prompt Card is scheduled for this date.';
  }
  go('journal');window.scrollTo({top:0,behavior:'smooth'});
}

function go(name){
  Object.entries(views).forEach(([key,id])=>document.getElementById(id).classList.toggle('active',key===name));
  document.querySelectorAll('.nav-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.go===name));
  if(name!=='journal') window.scrollTo({top:0,behavior:'smooth'});
}

function buildCalendar(){
  const grid=document.getElementById('calendarGrid');grid.innerHTML='';
  const first=new Date('2026-09-01T12:00:00').getDay();
  for(let i=0;i<first;i++){const e=document.createElement('span');e.className='calendar-day empty';grid.appendChild(e)}
  for(let day=1;day<=30;day++){
    const iso=`2026-09-${String(day).padStart(2,'0')}`;
    const b=document.createElement('button');b.type='button';b.className='calendar-day available';b.textContent=day;b.dataset.date=iso;b.setAttribute('aria-label',niceDate(iso));
    if(iso===localIsoDate())b.classList.add('today');
    grid.appendChild(b);
  }
}

function chooseInitialDate(){
  const today=localIsoDate();
  if(today>='2026-08-30'&&today<='2026-09-30')return today;
  return '2026-09-01';
}

function initTheme(){
  const saved=localStorage.getItem('journal-theme');
  if(saved==='dark')document.documentElement.dataset.theme='dark';
  document.getElementById('themeButton').textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾';
}
function toggleTheme(){
  const dark=document.documentElement.dataset.theme==='dark';
  document.documentElement.dataset.theme=dark?'':'dark';
  localStorage.setItem('journal-theme',dark?'light':'dark');
  document.getElementById('themeButton').textContent=dark?'☾':'☀';
}

document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-go]');if(nav){go(nav.dataset.go);return;}
  const door=e.target.closest('[data-door]');if(door&&state.card){state.door=door.dataset.door;renderDoor();return;}
  const day=e.target.closest('[data-date]');if(day){openDate(day.dataset.date);return;}
});
document.getElementById('august31Button').addEventListener('click',()=>openDate('2026-08-31'));
document.getElementById('themeButton').addEventListener('click',toggleTheme);
const dialog=document.getElementById('artifactDialog');
document.getElementById('artifactImageButton').addEventListener('click',()=>dialog.showModal());
document.getElementById('closeArtifact').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});

initTheme();buildCalendar();openDate(chooseInitialDate());
