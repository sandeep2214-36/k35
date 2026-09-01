let stuDrillState={ subjectName:null, session:null };

function stuPageIds(){
return ["studentDash","stuSubjectHistoryPage","stuMarksPage","stuMarksDetailPage","stuAttendancePage","stuSessionSubmitPage","stuTimetablePage","stuNotificationsPage"];
}
function hideAllStuPages(){
stuPageIds().forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
}
function closeStuPages(){
if(!currentUser||currentUser.role!=="student") return;
hideAllStuPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
loadStudentDash();
}

function stuRecords(){
return getData("attendanceRecords").filter(r=>r.studentId===currentUser.id);
}

function loadStudentDash(){
if(typeof hideAllRoleContent==="function") hideAllRoleContent();
else hideAllStuPages();
document.getElementById("studentDash").classList.remove("hidden");
document.getElementById("stuHomeName").innerText=currentUser.name||"Student";
document.getElementById("stuHomeDept").innerText=`Department: ${currentUser.department||"—"} | Roll: ${currentUser.roll||"—"}`;
const records=stuRecords();
const total=records.length;
const present=records.filter(r=>r.status==="Present"||r.status==="Late").length;
const pct=total?Math.round((present/total)*100):(currentUser.attendancePercentage||0);
document.getElementById("stuWorkDays").innerText=total;
document.getElementById("stuPresentDays").innerText=present;
document.getElementById("stuPercentage").innerText=pct+"%";

// Only real attendance subjects for THIS student (no dummy / empty lecturer subjects)
const map={};
records.forEach(r=>{
const n=(r.subjectName||"").trim();
if(!n) return;
if(!map[n]) map[n]=[];
map[n].push(r);
});
const grid=document.getElementById("stuSubjectsGrid");
grid.innerHTML="";
const names=Object.keys(map);
if(!names.length){ grid.innerHTML=`<div class="today-empty">No attendance subjects yet.</div>`; return; }
names.forEach(n=>{
const rec=map[n];
const t=rec.length;
const p=rec.filter(r=>r.status==="Present"||r.status==="Late").length;
const sp=t?Math.round((p/t)*100):0;
let badge=sp>=75?"good":(sp>=50?"medium":"low");
const safe=n.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
grid.innerHTML+=`<div class="principal-box" onclick="openStuSubjectHistory('${safe}')"><div><h4>${n}</h4><p>Working: ${t} | Present: ${p}</p></div><div class="box-footer"><span class="badge ${badge}">${sp}%</span></div></div>`;
});
}

function openStuSubjectHistory(subjectName){
stuDrillState.subjectName=subjectName;
hideAllStuPages();
document.getElementById("stuSubjectHistoryPage").classList.remove("hidden");
document.getElementById("stuSubjectHistoryTitle").innerText=`${subjectName} – Your History`;
const list=document.getElementById("stuSubjectHistoryList");
const records=stuRecords().filter(r=>(r.subjectName||"General")===subjectName).sort((a,b)=>new Date(b.date)-new Date(a.date));
if(!records.length){ list.innerHTML=`<div class="today-empty">No attendance history for this subject.</div>`; return; }
list.innerHTML="";
records.forEach(r=>{
let badge=r.status==="Absent"?"low":(r.status==="Late"?"medium":"good");
list.innerHTML+=`<div class="group"><div><strong>${r.date||"—"}</strong><br><small style="color:#94a3b8">${r.time||""}</small></div><span class="badge ${badge}">${r.status||"—"}</span></div>`;
});
}

function openStuMarksPage(){
if(!currentUser||currentUser.role!=="student") return;
hideAllStuPages();
document.getElementById("mainDashboard").classList.remove("hidden");
document.getElementById("stuMarksPage").classList.remove("hidden");
const list=document.getElementById("stuMarksSubjectsList");
// Only marks entered by lecturer for THIS student id (no dummy subjects)
const marks=getData("marksRecords").filter(m=>
m && m.studentId===currentUser.id &&
String(m.subject||"").trim()!=="" &&
(m.marksObtained!==undefined && m.marksObtained!==null && m.marksObtained!=="")
);
const bySub={};
marks.forEach(m=>{
const n=String(m.subject).trim();
if(!bySub[n]) bySub[n]=[];
bySub[n].push(m);
});
const names=Object.keys(bySub);
if(!names.length){ list.innerHTML=`<div class="today-empty">No marks added yet for you.</div>`; return; }
list.innerHTML="";
names.forEach(n=>{
const safe=n.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
list.innerHTML+=`<div class="principal-box" onclick="openStuMarksDetail('${safe}')"><div><h4>${n}</h4><p>${bySub[n].length} exam(s)</p></div></div>`;
});
}

function openStuMarksDetail(subjectName){
hideAllStuPages();
document.getElementById("stuMarksDetailPage").classList.remove("hidden");
document.getElementById("stuMarksDetailTitle").innerText=`${subjectName} – Marks`;
const list=document.getElementById("stuMarksDetailList");
const marks=getData("marksRecords").filter(m=>
m && m.studentId===currentUser.id &&
String(m.subject||"").trim()===String(subjectName).trim() &&
(m.marksObtained!==undefined && m.marksObtained!==null && m.marksObtained!=="")
);
if(!marks.length){ list.innerHTML=`<div class="today-empty">No marks for this subject.</div>`; return; }
list.innerHTML="";
marks.forEach(m=>{
const max=Number(m.maxMarks||0);
const obt=Number(m.marksObtained||0);
const pct=max?Math.round((obt/max)*100):0;
const exam=String(m.examType||"").trim()||"Exam";
list.innerHTML+=`<div class="group"><div><strong>${exam}</strong><br><small style="color:#94a3b8">Marks: ${obt} / ${max}</small></div><span class="badge ${pct>=40?"good":"low"}">${pct}%</span></div>`;
});
}

function openStuAttendancePage(){
if(!currentUser||currentUser.role!=="student") return;
hideAllStuPages();
document.getElementById("mainDashboard").classList.remove("hidden");
document.getElementById("stuAttendancePage").classList.remove("hidden");
const box=document.getElementById("stuLiveSessions");
const msg=document.getElementById("stuAttMsg");
msg.style.display="none";
const sessions=getData("attendanceSessions").filter(s=>s.active && s.department===currentUser.department);
if(!sessions.length){ box.innerHTML=`<div class="today-empty">No active attendance session for your group.</div>`; return; }
box.innerHTML="";
sessions.forEach(s=>{
const lec=getData("lecturers").find(l=>l.id===s.lecturerId);
box.innerHTML+=`<div class="principal-box" onclick='openStuSessionSubmit(${JSON.stringify(s.id)})'><div><h4>${s.subject||"Subject"}</h4><p>Lecturer: ${(lec&&lec.name)||"—"}</p><p>Department: ${s.department||"—"}</p><p>Window: ${s.winStart||"—"} – ${s.winEnd||"—"}</p><p>Radius: ${s.radius||50}m</p></div></div>`;
});
}

function openStuSessionSubmit(sessionId){
const session=getData("attendanceSessions").find(s=>s.id===sessionId && s.active);
if(!session){ openStuAttendancePage(); return; }
stuDrillState.session=session;
hideAllStuPages();
document.getElementById("stuSessionSubmitPage").classList.remove("hidden");
const lec=getData("lecturers").find(l=>l.id===session.lecturerId);
document.getElementById("stuSessionInfo").innerHTML=`
<div class="principal-box" style="cursor:default"><div>
<h4>${session.subject||"Subject"}</h4>
<p>Lecturer: ${(lec&&lec.name)||"—"}</p>
<p>Department: ${session.department||"—"}</p>
<p>Time window: ${session.winStart||"—"} – ${session.winEnd||"—"}</p>
<p>Radius: ${session.radius||50}m</p>
</div></div>`;
document.getElementById("stuSessionMsg").style.display="none";
}

function haversineMeters(lat1,lon1,lat2,lon2){
const R=6371000;
const toRad=d=>d*Math.PI/180;
const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
return 2*R*Math.asin(Math.sqrt(a));
}

function submitStuAttendance(){
const msg=document.getElementById("stuSessionMsg");
const session=stuDrillState.session;
if(!session||!session.active){ msg.className="msg error"; msg.innerText="Session not active."; msg.style.display="block"; return; }
if(session.department!==currentUser.department){ msg.className="msg error"; msg.innerText="Not your department session."; msg.style.display="block"; return; }

// one present per session per student
const already=getData("attendanceRecords").some(r=>r.sessionId===session.id && r.studentId===currentUser.id);
if(already){ msg.className="msg error"; msg.innerText="Already marked for this session."; msg.style.display="block"; return; }

// device lock: one student per mobile device per session
const deviceKey="stuDeviceSession_"+session.id;
const locked=localStorage.getItem(deviceKey);
if(locked && locked!==currentUser.id){
msg.className="msg error"; msg.innerText="This device already used for another student in this session."; msg.style.display="block"; return;
}

const now=new Date();
const hh=String(now.getHours()).padStart(2,"0");
const mm=String(now.getMinutes()).padStart(2,"0");
const nowT=`${hh}:${mm}`;
if(session.winStart && session.winEnd && (nowT<session.winStart || nowT>session.winEnd)){
msg.className="msg error"; msg.innerText="Outside attendance time window."; msg.style.display="block"; return;
}

if(!navigator.geolocation){ msg.className="msg error"; msg.innerText="Location required."; msg.style.display="block"; return; }
navigator.geolocation.getCurrentPosition((pos)=>{
const dist=haversineMeters(pos.coords.latitude,pos.coords.longitude,session.lat,session.lng);
if(dist>(session.radius||50)){
msg.className="msg error"; msg.innerText=`Outside radius (${Math.round(dist)}m).`; msg.style.display="block"; return;
}
const records=getData("attendanceRecords");
records.push({
id:"att_"+Date.now(),
sessionId:session.id,
date:new Date().toISOString().split("T")[0],
time:nowT,
studentId:currentUser.id,
subjectName:session.subject,
status:"Present",
department:session.department,
lecturerId:session.lecturerId
});
saveData("attendanceRecords",records);
localStorage.setItem(deviceKey,currentUser.id);
// update student percentage
const students=getData("students");
const idx=students.findIndex(s=>s.id===currentUser.id);
if(idx>=0){
const mine=records.filter(r=>r.studentId===currentUser.id);
const p=mine.filter(r=>r.status==="Present"||r.status==="Late").length;
students[idx].attendancePercentage=mine.length?Math.round((p/mine.length)*100):0;
saveData("students",students);
currentUser=students[idx];
}
msg.className="msg success"; msg.innerText="Present marked successfully."; msg.style.display="block";
},()=>{ msg.className="msg error"; msg.innerText="Location permission denied."; msg.style.display="block"; });
}

function openStuTimetablePage(){
if(!currentUser||currentUser.role!=="student") return;
hideAllStuPages();
document.getElementById("mainDashboard").classList.remove("hidden");
document.getElementById("stuTimetablePage").classList.remove("hidden");
const first=document.querySelector("#stuDayFilters .filter-btn");
renderStuTimetable("Monday", first);
}

function renderStuTimetable(day, btn){
if(btn){
document.querySelectorAll("#stuDayFilters .filter-btn").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
}
const list=document.getElementById("stuTimetableList");
const items=[];
getData("lecturers").forEach(l=>{
(l.subjects||[]).forEach(s=>{
const dept=s.department||l.department||"";
if(dept && dept!==currentUser.department) return;
if(!dept && l.department!==currentUser.department) return;
const days=s.days||[];
const ok=!days.length||days.some(d=>String(d).toLowerCase().startsWith(String(day).toLowerCase().slice(0,3)));
if(!ok) return;
items.push({subject:s.name, lecturer:l.name, start:s.startTime||s.start||"—", end:s.endTime||s.end||"—"});
});
});
if(!items.length){ list.innerHTML=`<div class="today-empty">No classes on ${day}.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
items.forEach(it=>{
grid.innerHTML+=`<div class="principal-box" style="cursor:default"><div><h4>${it.subject}</h4><p>Lecturer: ${it.lecturer}</p><p>Time: ${it.start} – ${it.end}</p><p>Day: ${day}</p></div></div>`;
});
}

function openStuNotificationsPage(){
if(!currentUser||currentUser.role!=="student") return;
hideAllStuPages();
document.getElementById("mainDashboard").classList.remove("hidden");
document.getElementById("stuNotificationsPage").classList.remove("hidden");
}

function showSubjectHistory(){ /* legacy removed */ }
function closeSubjectHistory(){ /* legacy removed */ }
function loadStudentDetailedAttendance(){ /* legacy removed */ }

