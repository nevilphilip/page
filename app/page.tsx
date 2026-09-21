"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, BriefcaseMedical, CalendarDays, Check, ChevronRight, CircleHelp,
  ClipboardCheck, Clock3, Download, FlaskConical, GraduationCap, LayoutDashboard,
  Menu, Moon, Plus, Search, Settings, Sparkles, Sun, Upload, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Section = "Today" | "Schedule" | "Cases" | "Learning" | "Ask" | "MRCP" | "Portfolio" | "Projects" | "Settings";
type Task = { id: string; title: string; done: boolean; category: string; priority: "High" | "Medium" | "Low"; due: string; minutes: number };
type CaseLog = { id: string; date: string; setting: string; problem: string; context: string; learning: string; read: string; portfolio: string; specialty: string };
type Learning = { id: string; title: string; notes: string; source: string; confidence: number; review: string };
type Session = { id: string; date: string; topic: string; attempted: number; correct: number; learning: string };
type AppData = { tasks: Task[]; cases: CaseLog[]; learning: Learning[]; sessions: Session[]; priorities: string[]; inbox: string[]; shift: string; review: Record<string,string> };

const today = new Date().toISOString().slice(0, 10);
const initial: AppData = {
  tasks: [
    { id: "sample-1", title: "Review ventilation basics before the ward round", done: false, category: "Clinical learning", priority: "High", due: today, minutes: 20 },
    { id: "sample-2", title: "Complete 20 MRCP questions", done: false, category: "MRCP", priority: "Medium", due: today, minutes: 30 },
    { id: "sample-3", title: "Plan next MSc writing session", done: false, category: "Research", priority: "Low", due: today, minutes: 15 }
  ], cases: [], learning: [], sessions: [], priorities: ["", "", ""], inbox: [], shift: "Normal day", review: {}
};
const nav: {name: Section; icon: React.ElementType}[] = [
  { name: "Today", icon: LayoutDashboard }, { name: "Schedule", icon: CalendarDays }, { name: "Cases", icon: BriefcaseMedical },
  { name: "Learning", icon: BookOpen }, { name: "Ask", icon: CircleHelp }, { name: "MRCP", icon: GraduationCap },
  { name: "Portfolio", icon: ClipboardCheck }, { name: "Projects", icon: FlaskConical }
];
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export default function Home() {
  const [section, setSection] = useState<Section>("Today");
  const [data, setData] = useState<AppData>(initial);
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState("Saved locally");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { const v = localStorage.getItem("nevils-daily-round"); if (v) setData(JSON.parse(v)); setDark(localStorage.getItem("ndr-dark") === "true"); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return; setSaved("Saving…");
    const timer = setTimeout(() => { try { localStorage.setItem("nevils-daily-round", JSON.stringify(data)); setSaved("Saved locally"); } catch { setSaved("Could not save"); } }, 250);
    return () => clearTimeout(timer);
  }, [data, ready]);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("ndr-dark", String(dark)); }, [dark]);
  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: {signal?: AbortSignal}) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: "add_daily_task", title: "Add daily task",
      description: "Add a task to Nevil’s Daily Round and show it on the Today page.",
      inputSchema: { type: "object", properties: { title: {type:"string"}, category: {type:"string"}, minutes: {type:"number",minimum:1} }, required: ["title"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as {title?:unknown;category?:unknown;minutes?:unknown};
        if (typeof value.title !== "string" || !value.title.trim()) throw new Error("A non-empty task title is required.");
        const task: Task = {id:uid(),title:value.title.trim(),done:false,category:typeof value.category==="string"?value.category:"Personal",priority:"Medium",due:today,minutes:typeof value.minutes==="number"?value.minutes:15};
        setData(d=>({...d,tasks:[...d.tasks,task]})); setSection("Today");
        return {id:task.id,status:"created",title:task.title};
      }
    }, {signal:lifecycle.signal})).catch(()=>{});
    return () => lifecycle.abort();
  }, []);

  const due = data.tasks.filter(t => !t.done && t.due <= today);
  const overdue = due.filter(t => t.due < today);
  const todayTasks = due.filter(t => t.due === today);
  const totalAttempted = data.sessions.reduce((n,s)=>n+s.attempted,0);
  const totalCorrect = data.sessions.reduce((n,s)=>n+s.correct,0);
  const matches = useMemo(() => search.trim() ? [
    ...data.tasks.map(x=>({type:"Task",title:x.title})), ...data.cases.map(x=>({type:"Case",title:x.problem})), ...data.learning.map(x=>({type:"Learning",title:x.title}))
  ].filter(x=>x.title.toLowerCase().includes(search.toLowerCase())) : [], [search,data]);
  const patchData = (patch: Partial<AppData>) => setData(d => ({...d,...patch}));
  const open = (s: Section) => { setSection(s); setMobile(false); window.scrollTo({top:0,behavior:"smooth"}); };
  const download = (name:string, text:string, type="application/json") => { const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); };
  const backup = () => download(`nevils-daily-round-${today}.json`, JSON.stringify({version:1, exportedAt:new Date().toISOString(), data},null,2));
  const restore = async (file: File) => { try { const parsed=JSON.parse(await file.text()); if(!parsed?.data?.tasks || !Array.isArray(parsed.data.tasks)) throw new Error(); if(confirm("Replace all current local data with this backup?")) setData(parsed.data); } catch { alert("This does not look like a valid Daily Round backup."); } };
  const exportCsv = () => { const rows=[["Date","Setting","Problem","Specialty","Learning","Portfolio"],...data.cases.map(c=>[c.date,c.setting,c.problem,c.specialty,c.learning,c.portfolio])]; download("case-log.csv",rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv"); };

  return <div className="app-shell">
    <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><Check size={18}/></span><div><b>Daily Round</b><small>Nevil’s workspace</small></div><button className="mobile-close" onClick={()=>setMobile(false)} aria-label="Close navigation"><X/></button></div>
      <nav aria-label="Main navigation">{nav.map(({name,icon:Icon})=><button key={name} className={section===name?"active":""} onClick={()=>open(name)}><Icon size={18}/><span>{name}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className={section==="Settings"?"active":""} onClick={()=>open("Settings")}><Settings size={18}/>Settings</button><div className="save-state"><span></span>{saved}</div></div>
    </aside>
    {mobile && <button className="scrim" aria-label="Close menu" onClick={()=>setMobile(false)}/>} 
    <main><header className="topbar"><button className="menu-btn" onClick={()=>setMobile(true)} aria-label="Open navigation"><Menu/></button><div className="search-wrap"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks, cases and learning…" aria-label="Global search"/>{matches.length>0&&<div className="search-results">{matches.slice(0,6).map((m,i)=><button key={i} onClick={()=>{open(m.type==="Task"?"Today":m.type==="Case"?"Cases":"Learning");setSearch("")}}><small>{m.type}</small>{m.title}</button>)}</div>}</div><button className="icon-btn" onClick={()=>setDark(!dark)} aria-label="Toggle dark mode">{dark?<Sun/>:<Moon/>}</button><span className="avatar">NP</span></header>
      <div className="page">
        {section==="Today" && <Today data={data} setData={setData} todayTasks={todayTasks} overdue={overdue} open={open}/>} 
        {section==="Schedule" && <Schedule/>}{section==="Cases" && <Cases data={data} setData={setData} open={open} exportCsv={exportCsv}/>} 
        {section==="Learning" && <LearningPage data={data} setData={setData}/>} {section==="Ask" && <Ask/>}
        {section==="MRCP" && <Mrcp data={data} setData={setData} totalAttempted={totalAttempted} totalCorrect={totalCorrect}/>} 
        {section==="Portfolio" && <Portfolio/>}{section==="Projects" && <Projects/>}
        {section==="Settings" && <SettingsPage data={data} patchData={patchData} dark={dark} setDark={setDark} backup={backup} exportCsv={exportCsv} fileRef={fileRef} restore={restore}/>} 
      </div>
    </main>
  </div>;
}

function PageHead({eyebrow,title,copy,action}:{eyebrow:string,title:string,copy?:string,action?:React.ReactNode}) { return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{copy&&<p>{copy}</p>}</div>{action}</div> }
function Card({title,children,className=""}:{title?:string,children:React.ReactNode,className?:string}) { return <section className={`card ${className}`}>{title&&<h2>{title}</h2>}{children}</section> }
function Field({label,children}:{label:string,children:React.ReactNode}) { return <label className="field"><span>{label}</span>{children}</label> }
function Empty({children}:{children:React.ReactNode}) { return <div className="empty">{children}</div> }

function Today({data,setData,todayTasks,overdue,open}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>;todayTasks:Task[];overdue:Task[];open:(s:Section)=>void}) {
  const [draft,setDraft]=useState(""); const hour=new Date().getHours(); const greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const updateTask=(id:string,done:boolean)=>setData(d=>({...d,tasks:d.tasks.map(t=>t.id===id?{...t,done}:t)}));
  const add=()=>{if(!draft.trim())return;setData(d=>({...d,tasks:[...d.tasks,{id:uid(),title:draft.trim(),done:false,category:"Personal",priority:"Medium",due:today,minutes:15}]}));setDraft("")};
  const workload=data.shift==="Post-night"||data.shift==="Day off"?"A lighter plan is sensible today. Keep one essential task and make recovery part of the plan.":"Your plan balances clinical learning, exam preparation and one longer-term action.";
  return <><PageHead eyebrow={new Intl.DateTimeFormat("en-GB",{weekday:"long",day:"numeric",month:"long"}).format(new Date())} title={`${greeting}, Nevil`} action={<select className="shift-select" value={data.shift} onChange={e=>setData(d=>({...d,shift:e.target.value}))}>{["Normal day","Long day","Night","Post-night","Study leave","Day off"].map(x=><option key={x}>{x}</option>)}</select>}/><div className="quick-actions"><Quick icon={Plus} label="Add task" onClick={()=>document.getElementById("task-entry")?.focus()}/><Quick icon={BriefcaseMedical} label="Log case" onClick={()=>open("Cases")}/><Quick icon={BookOpen} label="Record learning" onClick={()=>open("Learning")}/><Quick icon={CircleHelp} label="Ask a question" onClick={()=>open("Ask")}/></div>
    <div className="dashboard-grid"><div className="stack"><Card title="Three priorities"><div className="priority-list">{data.priorities.map((p,i)=><div key={i}><span>{i+1}</span><input value={p} onChange={e=>setData(d=>({...d,priorities:d.priorities.map((x,j)=>j===i?e.target.value:x)}))} placeholder={i===0?"Most important today":"Add a priority"}/></div>)}</div></Card>{overdue.length>0&&<Card title="Overdue"><TaskList tasks={overdue} update={updateTask}/></Card>}<Card title="Today’s tasks"><div className="task-entry"><Input id="task-entry" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Add a task…"/><Button onClick={add}>Add</Button></div><TaskList tasks={todayTasks} update={updateTask}/></Card><Card title="Quick inbox"><textarea value={data.inbox.join("\n")} onChange={e=>setData(d=>({...d,inbox:e.target.value.split("\n")}))} placeholder="Capture thoughts—one per line. Organise them later."/></Card><Card title="Two-minute evening round-up"><div className="review-grid">{[["complete","What did I complete?"],["learn","What did I learn?"],["reflect","A case worth reflecting on?"],["carry","What should carry forward?"],["tomorrow","Tomorrow’s main priority?"]].map(([k,l])=><Field key={k} label={l}><Textarea value={data.review[k]||""} onChange={e=>setData(d=>({...d,review:{...d.review,[k]:e.target.value}}))}/></Field>)}</div><p className="hint">Your summary is built only from what you record here.</p></Card></div>
      <div className="stack side-stack"><Card className="next-card"><div className="card-kicker"><Clock3 size={16}/> Next</div><h3>No calendar event loaded</h3><p>Connect Google Calendar or add a manual event in Schedule.</p><Button variant="outline" onClick={()=>open("Schedule")}>Open schedule</Button></Card><Card><div className="study-badge"><Sparkles size={15}/> Suggested for {data.shift.toLowerCase()}</div><h3>Ventilator waveforms</h3><p>{workload}</p><div className="study-times"><button>5 min</button><button>15 min</button><button>30 min</button></div><button className="text-link" onClick={()=>open("Learning")}>Start learning <ChevronRight size={15}/></button></Card><Card title="Review due"><div className="metric"><strong>{data.learning.filter(x=>x.review<=today).length}</strong><span>learning items</span></div><div className="metric"><strong>{data.sessions.length}</strong><span>MRCP sessions logged</span></div></Card></div></div>
  </>;
}
function Quick({icon:Icon,label,onClick}:{icon:React.ElementType;label:string;onClick:()=>void}){return <button onClick={onClick}><Icon size={17}/>{label}</button>}
function TaskList({tasks,update}:{tasks:Task[];update:(id:string,done:boolean)=>void}){return <div className="tasks">{tasks.length===0?<Empty>No tasks here yet.</Empty>:tasks.map(t=><div className={`task ${t.done?"done":""}`} key={t.id}><Checkbox checked={t.done} onCheckedChange={v=>update(t.id,!!v)} aria-label={`Complete ${t.title}`}/><div><b>{t.title}</b><small>{t.category} · {t.minutes} min · {t.priority}</small></div><span className={`pill ${t.priority.toLowerCase()}`}>{t.priority}</span></div>)}</div>}

function Schedule(){return <><PageHead eyebrow="Schedule" title="Your clinical week" copy="Manual entries work now. Calendar integrations are deliberately read-only until configured."/><div className="notice"><CalendarDays/><div><b>Google Calendar is not connected</b><p>Your calendar remains private. Connecting a calendar will require Google sign-in and read-only permission.</p></div><a href="https://calendar.google.com" target="_blank" rel="noreferrer">Open Google Calendar</a></div><div className="week-grid">{["Monday","Tuesday","Wednesday","Thursday","Friday","Weekend"].map((d,i)=><Card key={d}><p className="eyebrow">{d}</p>{i===0?<><div className="event teal"><b>ICU ward round</b><small>08:00–12:30 · Clinical</small></div><div className="event navy"><b>MRCP questions</b><small>19:00–19:30 · Study</small></div></>:<button className="add-event"><Plus size={15}/> Add event</button>}</Card>)}</div></>}

function Cases({data,setData,open,exportCsv}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>;open:(s:Section)=>void;exportCsv:()=>void}){
 const blank={date:today,setting:"ICU",problem:"",context:"",learning:"",read:"",portfolio:"None",specialty:"Intensive care"}; const [form,setForm]=useState<Omit<CaseLog,"id">>(blank); const [show,setShow]=useState(false);
 const save=()=>{if(!form.problem.trim())return;setData(d=>({...d,cases:[{...form,id:uid()},...d.cases]}));setForm(blank);setShow(false)};
 const toLearning=(c:CaseLog)=>{setData(d=>({...d,learning:[{id:uid(),title:c.read||c.problem,notes:c.learning,source:`Case: ${c.problem}`,confidence:2,review:today},...d.learning]}));open("Learning")};
 return <><PageHead eyebrow="Cases" title="Clinical experience log" copy="Educational notes only—never include names, NHS numbers, dates of birth, bed numbers or identifiable documents." action={<Dialog open={show} onOpenChange={setShow}><DialogTrigger asChild><Button><Plus/> Log a case</Button></DialogTrigger><DialogContent className="dialog-wide"><DialogHeader><DialogTitle>Log a case</DialogTitle><DialogDescription>Keep the entry anonymised. Required fields are deliberately minimal.</DialogDescription></DialogHeader><div className="form-grid"><Field label="Date"><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label="Setting"><select value={form.setting} onChange={e=>setForm({...form,setting:e.target.value})}>{["ICU","Acute take","Ward","Clinic","On-call","Other"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Broad presenting problem"><Input value={form.problem} onChange={e=>setForm({...form,problem:e.target.value})} placeholder="e.g. Refractory shock"/></Field><Field label="Specialty"><Input value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})}/></Field><Field label="Anonymised clinical context"><Textarea value={form.context} onChange={e=>setForm({...form,context:e.target.value})}/></Field><Field label="What I learned"><Textarea value={form.learning} onChange={e=>setForm({...form,learning:e.target.value})}/></Field><Field label="What I need to read"><Input value={form.read} onChange={e=>setForm({...form,read:e.target.value})}/></Field><Field label="Possible portfolio use"><select value={form.portfolio} onChange={e=>setForm({...form,portfolio:e.target.value})}>{["None","CBD","Mini-CEX","ACAT","DOPS","Reflection"].map(x=><option key={x}>{x}</option>)}</select></Field></div><Button onClick={save}>Save case</Button></DialogContent></Dialog>}/><div className="toolbar"><Input placeholder="Search cases…"/><Button variant="outline" onClick={exportCsv}><Download/> CSV</Button></div>{data.cases.length===0?<Empty>No real case entries yet. The first entry should take less than a minute.</Empty>:<div className="records">{data.cases.map(c=><Card key={c.id}><div className="record-head"><div><span className="pill teal">{c.setting}</span><h3>{c.problem}</h3></div><time>{new Date(c.date+"T12:00").toLocaleDateString("en-GB")}</time></div><p>{c.context||"No additional context recorded."}</p><div className="record-meta"><span>{c.specialty}</span><span>Portfolio: {c.portfolio}</span></div><button className="text-link" onClick={()=>toLearning(c)}>Create learning topic <ChevronRight size={15}/></button></Card>)}</div>}</>;
}

function LearningPage({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}){
 const [title,setTitle]=useState(""); const [notes,setNotes]=useState("");
 const add=()=>{if(!title.trim())return;setData(d=>({...d,learning:[{id:uid(),title,notes,source:"Self-directed",confidence:2,review:today},...d.learning]}));setTitle("");setNotes("")};
 return <><PageHead eyebrow="Learning" title="Your learning notebook" copy="Your notes stay separate from any future AI-generated explanation."/><div className="split"><Card title="Record learning"><Field label="Topic"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Citrate toxicity in CRRT"/></Field><Field label="My notes"><Textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What changed in my understanding?"/></Field><div className="button-row"><Button onClick={add}>Save learning</Button><Button variant="outline" onClick={()=>navigator.clipboard?.writeText(`Explain ${title} for a UK IMT2 doctor. Include physiology, clinical reasoning, practical points, pitfalls, MRCP relevance, three self-test questions, and verified sources.`)}>Copy study prompt</Button></div><p className="hint">AI is not connected. Copying a prompt sends no notes anywhere.</p></Card><Card title="Tomorrow’s ward round"><p>Based on your current ICU focus:</p><ol className="questions"><li>How do we distinguish poor preload from right ventricular failure at the bedside?</li><li>Which ventilator waveform changes suggest auto-PEEP?</li><li>When would you choose citrate rather than heparin for CRRT?</li></ol></Card></div><div className="records">{data.learning.map(l=><Card key={l.id}><div className="record-head"><div><span className="pill teal">Review {l.review}</span><h3>{l.title}</h3></div><span>Confidence {l.confidence}/5</span></div><p>{l.notes||"No notes yet."}</p><small>{l.source}</small><div className="ratings">{["Again","Hard","Good","Easy"].map(x=><button key={x}>{x}</button>)}</div></Card>)}</div></>;
}
function Ask(){const [q,setQ]=useState("");return <><PageHead eyebrow="Ask" title="Quick medical question" copy="For education—not a substitute for patient-specific assessment, prescribing checks or local guidance."/><Card className="ask-card"><div className="mode-row">{["Quick answer","Explain physiology","Compare conditions","MRCP focus"].map((x,i)=><button className={i===0?"selected":""} key={x}>{x}</button>)}</div><Textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask a focused clinical question…"/><div className="button-row"><Button disabled title="Configure AI in Settings">Ask (AI not connected)</Button><Button variant="outline" onClick={()=>navigator.clipboard?.writeText(`Answer for a UK internal medicine trainee: ${q}\nGive a direct answer, brief explanation, practical points or exceptions, and verified UK sources.`)}>Copy question prompt</Button></div><div className="offline-answer"><CircleHelp/><div><b>No AI connection configured</b><p>The manual app remains fully usable. Your case log and notebook are never sent automatically.</p></div></div></Card></>}

function Mrcp({data,setData,totalAttempted,totalCorrect}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>;totalAttempted:number;totalCorrect:number}){
 const [topic,setTopic]=useState(""); const [attempted,setAttempted]=useState(20); const [correct,setCorrect]=useState(0); const save=()=>{if(!topic||attempted<1)return;setData(d=>({...d,sessions:[{id:uid(),date:today,topic,attempted,correct,learning:""},...d.sessions]}));setTopic("")};
 return <><PageHead eyebrow="MRCP Part 2" title="Revision that fits around shifts" copy="Track learning from question banks without copying their questions."/><div className="stats"><Card><small>Questions logged</small><strong>{totalAttempted}</strong></Card><Card><small>Correct</small><strong>{totalCorrect}</strong></Card><Card><small>Accuracy</small><strong>{totalAttempted?Math.round(totalCorrect/totalAttempted*100):0}%</strong><em>Not a pass prediction</em></Card><Card><small>Study sessions</small><strong>{data.sessions.length}</strong></Card></div><div className="split"><Card title="Log a question-bank session"><Field label="Topic"><Input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Cardiology"/></Field><div className="form-grid"><Field label="Attempted"><Input type="number" min="1" value={attempted} onChange={e=>setAttempted(+e.target.value)}/></Field><Field label="Correct"><Input type="number" min="0" max={attempted} value={correct} onChange={e=>setCorrect(+e.target.value)}/></Field></div><Button onClick={save}>Save session</Button></Card><Card title="This week"><div className="progress-label"><span>Questions</span><b>{totalAttempted} / 100</b></div><div className="progress"><i style={{width:`${Math.min(100,totalAttempted)}%`}}/></div><div className="progress-label"><span>Focused reviews</span><b>{data.learning.length} / 5</b></div><div className="progress"><i style={{width:`${Math.min(100,data.learning.length*20)}%`}}/></div></Card></div><div className="records">{data.sessions.map(s=><Card key={s.id}><div className="record-head"><h3>{s.topic}</h3><time>{s.date}</time></div><p><b>{s.correct}/{s.attempted}</b> correct ({Math.round(s.correct/s.attempted*100)}%)</p></Card>)}</div></>;
}
function Portfolio(){const items=["Clinics","Procedures","Teaching","CBD / Mini-CEX / ACAT","QI activity","Reflections","PDP objectives"];return <><PageHead eyebrow="Portfolio" title="Training evidence" copy="A supporting workspace. You set the targets; recording an activity does not prove competency."/><div className="portfolio-list">{items.map((x,i)=><Card key={x}><div className="portfolio-row"><div><span className="step">0{i+1}</span><h3>{x}</h3><p>{i===0?"Log attendance and one useful learning point.":i===1?"Record procedure, supervision and feedback.":"Keep evidence and the next useful action together."}</p></div><Button variant="outline">{i===4?"Add QI update":i===5?"Draft reflection":"Add record"}</Button></div></Card>)}</div><Card title="Reflection structure"><div className="reflection-cols"><div><b>What? (thinking)</b><p>What happened and what was the clinical context?</p></div><div><b>So what? (feeling)</b><p>What did you think and feel, and why did it matter?</p></div><div><b>Now what? (doing)</b><p>What will you continue or change next time?</p></div></div></Card></>}
function Projects(){const projects=[{name:"MSc by Research",type:"Research",next:"Continue current writing milestone"},{name:"Quality improvement",type:"QI",next:"Add next action"},{name:"Teaching",type:"Teaching",next:"Plan next session"},{name:"Case reports",type:"Writing",next:"Record feedback"}];return <><PageHead eyebrow="Projects" title="Research, teaching and projects" copy="Keep milestones, feedback and the very next action visible." action={<Button><Plus/> New project</Button>}/><div className="project-grid">{projects.map((p,i)=><Card key={p.name}><div className="project-top"><span className="pill teal">{p.type}</span><span className="status">{i===0?"In progress":"To do"}</span></div><h3>{p.name}</h3><p className="next-action"><small>Next action</small>{p.next}</p><div className="project-footer"><span>{i===0?"Chapters · Analysis · Review · Submission":"No deadline set"}</span><ChevronRight size={18}/></div></Card>)}</div><Card title="Writing session"><div className="timer"><strong>25:00</strong><div><Button>Start focus</Button> <Button variant="outline">Set duration</Button></div></div></Card></>}

function SettingsPage({data,patchData,dark,setDark,backup,exportCsv,fileRef,restore}:{data:AppData;patchData:(p:Partial<AppData>)=>void;dark:boolean;setDark:(v:boolean)=>void;backup:()=>void;exportCsv:()=>void;fileRef:React.RefObject<HTMLInputElement|null>;restore:(f:File)=>void}) {return <><PageHead eyebrow="Settings" title="Make Daily Round yours" copy="Connections, personal targets and your local data are managed here."/><div className="settings-grid"><Card title="Profile"><Field label="Current rotation"><Input defaultValue="ICU"/></Field><Field label="Time zone"><Input value="Europe/London" readOnly/></Field><Field label="Default shift"><select value={data.shift} onChange={e=>patchData({shift:e.target.value})}>{["Normal day","Long day","Night","Post-night","Study leave","Day off"].map(x=><option key={x}>{x}</option>)}</select></Field></Card><Card title="Appearance"><label className="toggle-row"><span><b>Dark mode</b><small>Comfortable for evening review</small></span><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/></label></Card><Card title="Google Calendar"><div className="connection"><span className="dot off"/><div><b>Not connected</b><small>No calendar data has been read</small></div></div><p>Private calendar access needs a separately configured Google OAuth client using read-only scope. A public calendar is not required.</p><Button variant="outline" disabled>Connect Google Calendar</Button></Card><Card title="AI service"><div className="connection"><span className="dot off"/><div><b>Not connected</b><small>Provider, usage and cost: none</small></div></div><p>AI needs an authenticated backend with rate limits and a usage cap. Secret keys must never be stored in this browser or repository.</p><Button variant="outline" disabled>Configure backend</Button></Card><Card title="Backup and export"><p>Records are stored only in this browser and device. They are not encrypted or synchronised and may be lost if browser data is cleared.</p><div className="button-row"><Button onClick={backup}><Download/> Full backup</Button><Button variant="outline" onClick={()=>fileRef.current?.click()}><Upload/> Restore</Button><Button variant="outline" onClick={exportCsv}>Cases CSV</Button></div><input ref={fileRef} hidden type="file" accept="application/json" onChange={e=>e.target.files?.[0]&&restore(e.target.files[0])}/></Card><Card title="Sample data"><p>The three starter tasks are clearly labelled and can be removed without affecting your real entries.</p><Button variant="outline" onClick={()=>patchData({tasks:data.tasks.filter(t=>!t.id.startsWith("sample-"))})}>Remove sample tasks</Button></Card></div></>}
