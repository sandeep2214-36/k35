let lecDrillState = { subjectName: null, category: null, year: null, studentId: null, marksSubject: null, groupDept: null, verifiedHod: null };
let lecActiveSession = null;

function lecPageIds(){
return ["lecturerDash","lecGroupsPage","lecGroupSubjectsPage","lecSubjectCatsPage","lecCategoryYearsPage","lecCategoryStudentsPage","lecStudentHistoryPage","lecMarksGroupsPage","lecMarksSubjectsPage","lecMarksCatsPage","lecMarksStudentsPage","lecAttendancePage","lecSessionStartPage","lecManualAttendancePage","lecAddMarksPage","lecAddSubjectPage","lecNotificationsPage","lecTimetablePage"];
}

function hideAllLecDrillPages(){
lecPageIds().forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
}

function closeLecDrillDown(){
if(!currentUser || currentUser.role!=="lecturer") return;
hideAllLecDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("lecturerDash").classList.remove("hidden");
loadLecturerDash();
}

function lecDeptStudents(deptOverride){
// Always filter by the selected group department only (not mixed groups)
const dept = deptOverride || lecDrillState.groupDept || currentUser.department || "";
if(!dept) return [];
return getData("students").filter(s => String(s.department||"") === String(dept));
}

function lecStudentSubjectPct(studentId, subjectName){
const records = getData("attendanceRecords").filter(r => r.studentId === studentId && (!subjectName || r.subjectName === subjectName));
if(!records.length){
const st = getData("students").find(s => s.id === studentId);
return st ? (st.attendancePercentage || 0) : 0;
}
const present = records.filter(r => r.status === "Present" || r.status === "Late").length;
return Math.round((present / records.length) * 100);
}

function lecStudentMarksPct(studentId, subjectName){
const marks = getData("marksRecords").filter(m => m.studentId === studentId && (!subjectName || m.subject === subjectName));
if(!marks.length) return 0;
let obt=0,max=0;
marks.forEach(m=>{ obt+=Number(m.marksObtained||0); max+=Number(m.maxMarks||0); });
return max>0 ? Math.round((obt/max)*100) : 0;
}

function lecLecturerGroups(){
const depts=new Set();
if(currentUser.department) depts.add(currentUser.department);
(currentUser.subjects||[]).forEach(s=>{ if(s.department) depts.add(s.department); });
return Array.from(depts);
}

function loadLecturerDash(){
if(typeof hideAllRoleContent==="function") hideAllRoleContent();
else hideAllLecDrillPages();
document.getElementById("lecturerDash").classList.remove("hidden");
const groups=lecLecturerGroups();
const gEl=document.getElementById("lecHomeGroupCount");
const dEl=document.getElementById("lecHomeDeptLine");
if(gEl) gEl.innerText = String(groups.length);
if(dEl) dEl.innerText = `${groups.join(", ") || "—"} • ${currentUser.name || "Lecturer"} • Subjects: ${(currentUser.subjects||[]).length}`;
}

function openLecGroupsPage(){
hideAllLecDrillPages();
document.getElementById("lecGroupsPage").classList.remove("hidden");
const list=document.getElementById("lecGroupsList");
const groups=lecLecturerGroups();
if(!groups.length){ list.innerHTML=`<div class="today-empty">No groups found.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
groups.forEach(dept=>{
const students=getData("students").filter(s=>s.department===dept);
const safe=String(dept).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
const isPrimary = dept === (currentUser.department||"");
grid.innerHTML+=`<div class="principal-box"><div onclick="openLecGroupSubjectsPage('${safe}')" style="cursor:pointer"><h4>${dept}</h4><p>Students: ${students.length}</p><p>Your teaching group</p></div><div class="box-footer">${isPrimary?`<span class="badge good">Primary</span>`:`<button class="nav-btn" style="padding:6px 10px;font-size:11px;color:#fca5a5;" onclick="event.stopPropagation(); removeLecGroup('${safe}')"><i class="fa-solid fa-trash"></i> Remove Group</button>`}</div></div>`;
});
}

function openLecGroupSubjectsPage(deptName){
if(deptName) lecDrillState.groupDept=deptName;
const dept=lecDrillState.groupDept||currentUser.department||"Group";
hideAllLecDrillPages();
document.getElementById("lecGroupSubjectsPage").classList.remove("hidden");
document.getElementById("lecGroupSubjectsTitle").innerText=`${dept} – Subjects`;
const list=document.getElementById("lecGroupSubjectsList");
const subjects=(currentUser.subjects||[]).filter(s=>!s.department || s.department===dept || (!s.department && dept===(currentUser.department||"")));
if(!subjects.length){ list.innerHTML=`<div class="today-empty">No subjects in this group yet. Use Add in sidebar.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
const students=getData("students").filter(s=>s.department===dept);
subjects.forEach((s, idx)=>{
let sum=0; students.forEach(st=>{ sum+=lecStudentSubjectPct(st.id,s.name); });
const avg=students.length?Math.round(sum/students.length):0;
let badgeClass=avg>=75?"good":(avg>=50?"medium":"low");
const safe=(s.name||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");
const safeDept=String(dept).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
grid.innerHTML+=`<div class="principal-box"><div onclick="openLecSubjectCatsPage('${safe}')" style="cursor:pointer"><h4>${s.name}</h4><p>${s.startTime||"—"} – ${s.endTime||"—"}</p><p>Days: ${(s.days||[]).join(", ")||"—"}</p></div><div class="box-footer"><span class="badge ${badgeClass}">${avg}%</span><button class="nav-btn" style="padding:6px 10px;font-size:11px;color:#fca5a5;" onclick="event.stopPropagation(); removeLecSubject('${safe}','${safeDept}')"><i class="fa-solid fa-trash"></i> Remove</button></div></div>`;
});
}

function openLecSubjectCatsPage(subjectName){
lecDrillState.subjectName=subjectName;
hideAllLecDrillPages();
document.getElementById("lecSubjectCatsPage").classList.remove("hidden");
document.getElementById("lecSubjectCatsTitle").innerText=`${subjectName} – Categories`;
const students=lecDeptStudents();
let high=0,mid=0,low=0;
students.forEach(st=>{
const pct=lecStudentSubjectPct(st.id,subjectName);
if(pct>=75) high++; else if(pct>=50) mid++; else low++;
});
document.getElementById("lecCatHigh").innerText=high;
document.getElementById("lecCatMid").innerText=mid;
document.getElementById("lecCatLow").innerText=low;
}

function openLecCategoryYears(category){
lecDrillState.category=category;
lecDrillState.year=null;
hideAllLecDrillPages();
document.getElementById("lecCategoryYearsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
document.getElementById("lecCategoryYearsTitle").innerText=`${lecDrillState.subjectName||"Subject"} – ${titleMap[category]||category} – Years`;
const list=document.getElementById("lecCategoryYearsList");
list.innerHTML="";
[1,2,3,4].forEach(y=>{
const students=lecDeptStudents().filter(st=>String(st.year||st.semester||"")===String(y));
const count=students.filter(st=>{
const pct=lecStudentSubjectPct(st.id,lecDrillState.subjectName);
if(category==="high") return pct>=75;
if(category==="mid") return pct>=50 && pct<75;
return pct<50;
}).length;
list.innerHTML+=`<div class="principal-box" onclick="openLecCategoryStudents('${category}','${y}')"><div><h4>${y}${y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</h4><p>Students in this category: ${count}</p></div></div>`;
});
}

function openLecCategoryStudents(category, year){
if(category) lecDrillState.category=category;
if(year) lecDrillState.year=String(year);
hideAllLecDrillPages();
document.getElementById("lecCategoryStudentsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
const cat=lecDrillState.category;
const yr=lecDrillState.year;
document.getElementById("lecCategoryStudentsTitle").innerText=`${lecDrillState.subjectName} – ${titleMap[cat]||cat} – Year ${yr||"—"}`;
const students=lecDeptStudents().filter(st=>{
if(yr && String(st.year||st.semester||"")!==String(yr)) return false;
const pct=lecStudentSubjectPct(st.id,lecDrillState.subjectName);
if(cat==="high") return pct>=75;
if(cat==="mid") return pct>=50 && pct<75;
return pct<50;
});
const list=document.getElementById("lecCategoryStudentsList");
if(!students.length){ list.innerHTML=`<div class="today-empty">No students in this category for this year.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
students.forEach(st=>{
const pct=lecStudentSubjectPct(st.id,lecDrillState.subjectName);
let badgeClass=pct>=75?"good":(pct>=50?"medium":"low");
grid.innerHTML+=`<div class="principal-box" onclick="openLecStudentHistory('${st.id}')"><div><h4>${st.name}</h4><p>Roll: ${st.roll||"—"}</p><p>Year: ${st.year||st.semester||"—"}</p><p>Mobile: ${st.mobile||"—"}</p></div><div class="box-footer"><span class="badge ${badgeClass}">${pct}%</span></div></div>`;
});
}

function openLecStudentHistory(studentId){
lecDrillState.studentId=studentId;
hideAllLecDrillPages();
document.getElementById("lecStudentHistoryPage").classList.remove("hidden");
const st=getData("students").find(s=>s.id===studentId);
document.getElementById("lecStudentHistoryTitle").innerText=`${st?st.name:"Student"} – History`;
let records=getData("attendanceRecords").filter(r=>r.studentId===studentId && (!lecDrillState.subjectName || r.subjectName===lecDrillState.subjectName));
records.sort((a,b)=>new Date(b.date)-new Date(a.date));
const list=document.getElementById("lecStudentHistoryList");
if(!records.length){ list.innerHTML=`<div class="today-empty">No attendance history.</div>`; return; }
list.innerHTML="";
records.forEach(r=>{
let badgeClass=r.status==="Absent"?"low":(r.status==="Late"?"medium":"good");
list.innerHTML+=`<div class="group"><div><strong>${r.date||"—"}</strong><br><small style="color:#94a3b8">${r.subjectName||""} ${r.time?"• "+r.time:""}</small></div><span class="badge ${badgeClass}">${r.status||"—"}</span></div>`;
});
}

function openLecMarksHome(){
hideAllLecDrillPages();
document.getElementById("lecMarksGroupsPage").classList.remove("hidden");
const groups=lecLecturerGroups();
const list=document.getElementById("lecMarksGroupsList");
if(!groups.length){
list.innerHTML=`<div class="today-empty">No groups found.</div>`;
return;
}
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
groups.forEach(dept=>{
const safe=String(dept).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
grid.innerHTML+=`<div class="principal-box" onclick="openLecMarksSubjectsPage('${safe}')"><div><h4>${dept}</h4><p>View marks by subject for this group</p></div></div>`;
});
grid.innerHTML+=`<div class="principal-box" onclick="openLecAddMarksPage()"><div><h4>Add Marks</h4><p>Enter exam marks for a selected group</p></div></div>`;
}

function openLecMarksSubjectsPage(deptName){
if(deptName) lecDrillState.groupDept=deptName;
const dept=lecDrillState.groupDept||currentUser.department||"Group";
hideAllLecDrillPages();
document.getElementById("lecMarksSubjectsPage").classList.remove("hidden");
document.getElementById("lecMarksSubjectsTitle").innerText=`${dept} – Marks Subjects`;
const list=document.getElementById("lecMarksSubjectsList");
const subjects=(currentUser.subjects||[]).filter(s=>!s.department || s.department===dept || (!s.department && dept===(currentUser.department||"")));
if(!subjects.length){ list.innerHTML=`<div class="today-empty">No subjects found for this group.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
subjects.forEach(s=>{
const safe=(s.name||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");
grid.innerHTML+=`<div class="principal-box" onclick="openLecMarksCatsPage('${safe}')"><div><h4>${s.name}</h4><p>Group: ${dept}</p></div></div>`;
});
}

function openLecMarksCatsPage(subjectName){
lecDrillState.marksSubject=subjectName;
lecDrillState.subjectName=subjectName;
hideAllLecDrillPages();
document.getElementById("lecMarksCatsPage").classList.remove("hidden");
document.getElementById("lecMarksCatsTitle").innerText=`${subjectName} – Marks Categories`;
const students=lecDeptStudents();
let high=0,mid=0,low=0;
students.forEach(st=>{
const pct=lecStudentMarksPct(st.id,subjectName);
if(pct>=80) high++; else if(pct>=41) mid++; else low++;
});
document.getElementById("lecMarksCatHigh").innerText=high;
document.getElementById("lecMarksCatMid").innerText=mid;
document.getElementById("lecMarksCatLow").innerText=low;
}

function openLecMarksStudents(category){
hideAllLecDrillPages();
document.getElementById("lecMarksStudentsPage").classList.remove("hidden");
const titleMap={high:"80%+",mid:"41% – 74%",low:"Below 40%"};
document.getElementById("lecMarksStudentsTitle").innerText=`${lecDrillState.marksSubject} – ${titleMap[category]}`;
const students=lecDeptStudents().filter(st=>{
const pct=lecStudentMarksPct(st.id,lecDrillState.marksSubject);
if(category==="high") return pct>=80;
if(category==="mid") return pct>=41 && pct<80;
return pct<41;
});
const list=document.getElementById("lecMarksStudentsList");
if(!students.length){ list.innerHTML=`<div class="today-empty">No students in this category.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
students.forEach(st=>{
const pct=lecStudentMarksPct(st.id,lecDrillState.marksSubject);
let badgeClass=pct>=80?"good":(pct>=41?"medium":"low");
grid.innerHTML+=`<div class="principal-box" style="cursor:default"><div><h4>${st.name}</h4><p>Roll: ${st.roll||"—"}</p></div><div class="box-footer"><span class="badge ${badgeClass}">${pct}%</span></div></div>`;
});
}

function lecNormalizeDay(d){
const x=String(d||"").trim().toLowerCase();
if(x.startsWith("mon")) return "monday";
if(x.startsWith("tue")) return "tuesday";
if(x.startsWith("wed")) return "wednesday";
if(x.startsWith("thu")) return "thursday";
if(x.startsWith("fri")) return "friday";
if(x.startsWith("sat")) return "saturday";
if(x.startsWith("sun")) return "sunday";
return x;
}

function lecSubjectOnDay(s, dayName){
const days=s.days||s.weekDays||[];
if(!days.length) return true;
const target=lecNormalizeDay(dayName);
return days.some(d=>lecNormalizeDay(d)===target);
}

function refreshCurrentLecturer(){
if(!currentUser||currentUser.role!=="lecturer") return;
const latest=getData("lecturers").find(l=>l.id===currentUser.id);
if(latest) currentUser=latest;
}

function openLecAttendancePage(){
if(!currentUser||currentUser.role!=="lecturer") return;
refreshCurrentLecturer();
hideAllLecDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("lecAttendancePage").classList.remove("hidden");
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today=days[new Date().getDay()];
const box=document.getElementById("lecSessionBoxes");
box.innerHTML="";
const allSubjects=currentUser.subjects||[];
const subjects=allSubjects.filter(s=>lecSubjectOnDay(s, today));
if(!subjects.length){
box.innerHTML=`<div class="today-empty">No classes scheduled for ${today}. (Total subjects: ${allSubjects.length})</div>`;
return;
}
subjects.forEach(s=>{
const safe=(s.name||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");
const dept=s.department||currentUser.department||"—";
const start=s.startTime||s.start||"";
const end=s.endTime||s.end||"";
box.innerHTML+=`<div class="principal-box" onclick="openLecSessionStart('${safe}','${start}','${end}','${String(dept).replace(/'/g,"\\'")}')"><div><h4>${s.name}</h4><p>Group: ${dept}</p><p>Time: ${start||"—"} – ${end||"—"}</p><p>Day: ${today}</p></div></div>`;
});
}

function openLecSessionStart(subject,start,end,dept){
hideAllLecDrillPages();
document.getElementById("lecSessionStartPage").classList.remove("hidden");
const group=dept||lecDrillState.groupDept||currentUser.department||"";
if(dept) lecDrillState.groupDept=dept;
document.getElementById("lecSessionStartTitle").innerText=`${subject} • ${group}`;
document.getElementById("lecSessionMsg").style.display="none";
document.getElementById("lecSessionWinStart").value=start||"";
document.getElementById("lecSessionWinEnd").value=end||"";
document.getElementById("lecActiveSessionPanel").classList.add("hidden");
lecDrillState.subjectName=subject;
}

function startLecAttendanceSession(){
const radius=Number(document.getElementById("lecSessionRadius").value)||50;
const winStart=document.getElementById("lecSessionWinStart").value;
const winEnd=document.getElementById("lecSessionWinEnd").value;
const msg=document.getElementById("lecSessionMsg");
if(!winStart||!winEnd){ msg.innerText="Please set time window."; msg.style.display="block"; return; }
if(!navigator.geolocation){ msg.innerText="Geolocation not supported."; msg.style.display="block"; return; }
navigator.geolocation.getCurrentPosition((pos)=>{
lecActiveSession={
id:"sess_"+Date.now(),
lecturerId:currentUser.id,
department:currentUser.department,
subject:lecDrillState.subjectName,
radius,
winStart,winEnd,
lat:pos.coords.latitude,
lng:pos.coords.longitude,
active:true,
date:new Date().toISOString().split("T")[0]
};
const sessions=getData("attendanceSessions");
sessions.push(lecActiveSession);
saveData("attendanceSessions",sessions);
localStorage.setItem("activeLecSession",JSON.stringify(lecActiveSession));
document.getElementById("lecActiveSessionPanel").classList.remove("hidden");
document.getElementById("lecActiveSessionInfo").innerText=`${lecActiveSession.subject} | ${lecActiveSession.department} | Window ${winStart}-${winEnd} | Radius ${radius}m`;
msg.style.display="none";
},()=>{ msg.innerText="Location permission required to start session."; msg.style.display="block"; });
}

function closeLecAttendanceSession(){
if(lecActiveSession){
lecActiveSession.active=false;
const sessions=getData("attendanceSessions").map(s=>s.id===lecActiveSession.id?{...s,active:false}:s);
saveData("attendanceSessions",sessions);
}
lecActiveSession=null;
localStorage.removeItem("activeLecSession");
document.getElementById("lecActiveSessionPanel").classList.add("hidden");
}

function fillLecManualSubjects(){
const dept=document.getElementById("lecManGroup").value;
lecDrillState.groupDept=dept;
const sel=document.getElementById("lecManSubject");
sel.innerHTML="";
const subjects=(currentUser.subjects||[]).filter(s=>
!s.department || s.department===dept || (!s.department && dept===(currentUser.department||""))
);
if(!subjects.length){
sel.innerHTML=`<option value="">No subjects in this group</option>`;
return;
}
subjects.forEach(s=>{ sel.innerHTML+=`<option value="${s.name}">${s.name}</option>`; });
}

function openLecManualAttendance(){
if(!currentUser||currentUser.role!=="lecturer") return;
hideAllLecDrillPages();
document.getElementById("lecManualAttendancePage").classList.remove("hidden");
document.getElementById("lecManRoll").value="";
document.getElementById("lecManStatus").value="Present";
document.getElementById("lecManAttMsg").style.display="none";
document.getElementById("lecManAttMsg").innerText="";
const groupSel=document.getElementById("lecManGroup");
groupSel.innerHTML="";
const groups=lecLecturerGroups();
if(!groups.length){
groupSel.innerHTML=`<option value="">No groups</option>`;
document.getElementById("lecManSubject").innerHTML=`<option value="">No subjects</option>`;
return;
}
groups.forEach(d=>{ groupSel.innerHTML+=`<option value="${d}">${d}</option>`; });
if(lecDrillState.groupDept && groups.includes(lecDrillState.groupDept)){
groupSel.value=lecDrillState.groupDept;
}
fillLecManualSubjects();
}

function submitLecManualAttendance(){
const msg=document.getElementById("lecManAttMsg");
const dept=(document.getElementById("lecManGroup").value||"").trim();
const roll=(document.getElementById("lecManRoll").value||"").trim();
const subject=document.getElementById("lecManSubject").value;
const status=document.getElementById("lecManStatus").value;
lecDrillState.groupDept=dept;
if(!dept||!roll||!subject){ msg.className="msg error"; msg.innerText="Select group, enter roll and subject."; msg.style.display="block"; return; }
const student=lecDeptStudents(dept).find(s=>String(s.roll).toLowerCase()===roll.toLowerCase());
if(!student){ msg.className="msg error"; msg.innerText="Student not found in selected group."; msg.style.display="block"; return; }
const records=getData("attendanceRecords");
records.push({
id:"att_"+Date.now(),
date:new Date().toISOString().split("T")[0],
time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
studentId:student.id,
subjectName:subject,
status,
department:dept,
lecturerId:currentUser.id
});
saveData("attendanceRecords",records);
document.getElementById("lecManRoll").value="";
document.getElementById("lecManStatus").value="Present";
msg.className="msg success";
msg.innerText="Saved successfully.";
msg.style.display="block";
setTimeout(()=>{ msg.style.display="none"; msg.innerText=""; }, 1500);
}

function fillLecAddMarksSubjects(){
const dept=document.getElementById("lecAddMarksDept").value;
lecDrillState.groupDept=dept;
const sel=document.getElementById("lecAddMarksSubject");
sel.innerHTML="";
(currentUser.subjects||[]).filter(s=>!s.department || s.department===dept || (!s.department && dept===(currentUser.department||"")))
.forEach(s=>{ sel.innerHTML+=`<option value="${s.name}">${s.name}</option>`; });
}

function openLecAddMarksPage(){
hideAllLecDrillPages();
document.getElementById("lecAddMarksPage").classList.remove("hidden");
document.getElementById("lecAddMarksMsg").style.display="none";
document.getElementById("lecMarksEntrySection").classList.add("hidden");
const deptSel=document.getElementById("lecAddMarksDept");
deptSel.innerHTML="";
lecLecturerGroups().forEach(d=>{ deptSel.innerHTML+=`<option value="${d}">${d}</option>`; });
if(lecDrillState.groupDept) deptSel.value=lecDrillState.groupDept;
fillLecAddMarksSubjects();
}

function loadLecMarksEntryRows(){
const exam=(document.getElementById("lecAddMarksExam").value||"").trim();
const max=Number(document.getElementById("lecAddMarksMax").value);
const msg=document.getElementById("lecAddMarksMsg");
const dept=document.getElementById("lecAddMarksDept").value;
lecDrillState.groupDept=dept;
if(!exam||!max){ msg.innerText="Enter exam type and max marks."; msg.style.display="block"; return; }
msg.style.display="none";
const students=lecDeptStudents(dept);
const list=document.getElementById("lecMarksEntryList");
if(!students.length){ list.innerHTML=`<div class="today-empty">No students in this group.</div>`; document.getElementById("lecMarksEntrySection").classList.remove("hidden"); return; }
list.innerHTML="";
students.forEach(st=>{
list.innerHTML+=`<div class="group"><div><strong>${st.name}</strong><br><small style="color:#94a3b8">Roll: ${st.roll||"—"}</small></div><input type="number" class="lec-mark-input" data-student-id="${st.id}" min="0" max="${max}" placeholder="Marks" style="width:100px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(15,23,42,0.6);color:#fff;"></div>`;
});
document.getElementById("lecMarksEntrySection").classList.remove("hidden");
}

function saveLecMarksEntry(){
const exam=(document.getElementById("lecAddMarksExam").value||"").trim();
const max=Number(document.getElementById("lecAddMarksMax").value);
const subject=document.getElementById("lecAddMarksSubject").value;
const msg=document.getElementById("lecAddMarksMsg");
const inputs=document.querySelectorAll(".lec-mark-input");
let saved=0;
for(const input of inputs){
const val=input.value.trim();
if(val==="") continue;
const num=Number(val);
if(num>max){ msg.className="msg error"; msg.innerText=`Marks cannot exceed max (${max}).`; msg.style.display="block"; return; }
if(num<0){ msg.className="msg error"; msg.innerText="Marks cannot be negative."; msg.style.display="block"; return; }
const marks=getData("marksRecords");
marks.push({
id:"mark_"+Date.now()+"_"+Math.random(),
studentId:input.getAttribute("data-student-id"),
subject, examType:exam, maxMarks:max, marksObtained:num,
department:currentUser.department, lecturerId:currentUser.id,
date:new Date().toISOString().split("T")[0]
});
saveData("marksRecords",marks);
saved++;
}
msg.className="msg success";
msg.innerText=`Saved ${saved} marks records.`;
msg.style.display="block";
}

function removeLecSubject(subjectName, deptName){
if(!currentUser||currentUser.role!=="lecturer") return;
if(!confirm(`Remove subject "${subjectName}"?`)) return;
const lecturers=getData("lecturers");
const idx=lecturers.findIndex(l=>l.id===currentUser.id);
if(idx<0) return;
lecturers[idx].subjects=(lecturers[idx].subjects||[]).filter(s=>{
const sameName=s.name===subjectName;
const sameDept=!deptName || !s.department || s.department===deptName || (!s.department && deptName===(currentUser.department||""));
return !(sameName && sameDept);
});
saveData("lecturers",lecturers);
currentUser=lecturers[idx];
openLecGroupSubjectsPage(deptName||currentUser.department);
}

function removeLecGroup(deptName){
if(!currentUser||currentUser.role!=="lecturer") return;
if(!deptName) return;
if(deptName===(currentUser.department||"")){
alert("Primary department group cannot be removed.");
return;
}
if(!confirm(`Remove all subjects under group "${deptName}"?`)) return;
const lecturers=getData("lecturers");
const idx=lecturers.findIndex(l=>l.id===currentUser.id);
if(idx<0) return;
lecturers[idx].subjects=(lecturers[idx].subjects||[]).filter(s=>s.department!==deptName);
saveData("lecturers",lecturers);
currentUser=lecturers[idx];
openLecGroupsPage();
}

function openLecAddSubjectPage(){
if(!currentUser||currentUser.role!=="lecturer") return;
hideAllLecDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("lecAddSubjectPage").classList.remove("hidden");
lecDrillState.verifiedHod=null;
document.getElementById("lecAddCodeStep").classList.remove("hidden");
document.getElementById("lecAddFormStep").classList.add("hidden");
document.getElementById("lecAddSubCode").value="";
document.getElementById("lecAddSubMsg").style.display="none";
document.getElementById("lecAddSubMsg").innerText="";
}

function verifyLecAddCode(){
const msg=document.getElementById("lecAddSubMsg");
const code=(document.getElementById("lecAddSubCode").value||"").trim().toUpperCase();
if(!code){ msg.className="msg error"; msg.innerText="Enter HOD lecturer invite code."; msg.style.display="block"; return; }
const hod=getData("hods").find(h=>String(h.lecturerInviteCode||"").toUpperCase()===code);
if(!hod){ msg.className="msg error"; msg.innerText="Invalid HOD lecturer code."; msg.style.display="block"; return; }
lecDrillState.verifiedHod=hod;
document.getElementById("lecAddCodeStep").classList.add("hidden");
document.getElementById("lecAddFormStep").classList.remove("hidden");
document.getElementById("lecAddSubName").value=currentUser.name||"";
document.getElementById("lecAddSubMobile").value=currentUser.mobile||"";
document.getElementById("lecAddSubDept").value=hod.department||"";
document.getElementById("lecAddSubHodName").value=hod.name||"";
document.getElementById("lecAddSubNameField").value="";
document.getElementById("lecAddSubStart").value="";
document.getElementById("lecAddSubEnd").value="";
document.querySelectorAll("#lecAddSubDays input").forEach(c=>{ c.checked=false; });
document.querySelectorAll("#lecAddSubDays .day").forEach(d=>d.classList.remove("active"));
msg.style.display="none";
msg.innerText="";
}

function submitLecAddSubject(){
const msg=document.getElementById("lecAddSubMsg");
const hod=lecDrillState.verifiedHod;
if(!hod){ msg.className="msg error"; msg.innerText="Verify HOD code first."; msg.style.display="block"; return; }
const subj=(document.getElementById("lecAddSubNameField").value||"").trim();
const start=document.getElementById("lecAddSubStart").value;
const end=document.getElementById("lecAddSubEnd").value;
const days=[];
document.querySelectorAll("#lecAddSubDays input:checked").forEach(c=>days.push(c.value));
if(!subj||!start||!end||!days.length){
msg.className="msg error";
msg.innerText="Fill subject, timings and select at least one day.";
msg.style.display="block";
return;
}
const lecturers=getData("lecturers");
const idx=lecturers.findIndex(l=>l.id===currentUser.id);
if(idx<0){ msg.className="msg error"; msg.innerText="Lecturer account not found."; msg.style.display="block"; return; }
if(!Array.isArray(lecturers[idx].subjects)) lecturers[idx].subjects=[];
// Keep original lecturer department. Only tag subject with HOD department.
lecturers[idx].subjects.push({
name:subj,
startTime:start,
endTime:end,
days:days,
department:hod.department||"",
hodId:hod.id||null
});
saveData("lecturers",lecturers);
currentUser=lecturers[idx];
msg.className="msg success";
msg.innerText="Subject added. Old groups remain. You can add another.";
msg.style.display="block";
document.getElementById("lecAddSubNameField").value="";
document.getElementById("lecAddSubStart").value="";
document.getElementById("lecAddSubEnd").value="";
document.querySelectorAll("#lecAddSubDays input").forEach(c=>{ c.checked=false; });
document.querySelectorAll("#lecAddSubDays .day").forEach(d=>d.classList.remove("active"));
}

function openLecNotifications(){
if(!currentUser||currentUser.role!=="lecturer") return;
hideAllLecDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("lecNotificationsPage").classList.remove("hidden");
}

function toggleLecDayChip(e, el){
if(e) e.preventDefault();
const input=el.querySelector("input[type='checkbox']");
if(!input) return;
input.checked=!input.checked;
el.classList.toggle("active", input.checked);
}

function openLecTimetable(){
if(!currentUser||currentUser.role!=="lecturer") return;
hideAllLecDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("lecTimetablePage").classList.remove("hidden");
const firstBtn=document.querySelector("#lecDayFilters .filter-btn");
renderLecTimetable("Monday", firstBtn);
}

function renderLecTimetable(day, btn){
if(btn){
document.querySelectorAll("#lecDayFilters .filter-btn").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
}
refreshCurrentLecturer();
const list=document.getElementById("lecTimetableList");
const items=(currentUser.subjects||[]).filter(s=>lecSubjectOnDay(s, day));
if(!items.length){
list.innerHTML=`<div class="today-empty">No classes on ${day}.</div>`;
return;
}
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
items.forEach(s=>{
const dept=s.department||currentUser.department||"—";
grid.innerHTML+=`<div class="principal-box" style="cursor:default"><div><h4>${s.name||"—"}</h4><p>Group: ${dept}</p><p>Time: ${s.startTime||s.start||"—"} – ${s.endTime||s.end||"—"}</p><p>Day: ${day}</p></div></div>`;
});
}

function toggleLecturerGroupFilter(){}
function showLecturerStudentsList(){}
function hideLecturerDynamicList(){}
function toggleManualAttendance(){ openLecManualAttendance(); }
function populateManualAttendanceDropdowns(){}

function fetchLocation(){
if(navigator.geolocation){
navigator.geolocation.getCurrentPosition(position => {
const lat = position.coords.latitude.toFixed(5);
const lon = position.coords.longitude.toFixed(5);
document.getElementById("attLocation").value = `Lat: ${lat}, Lon: ${lon}`;
}, err => {
alert("Unable to fetch location. Please check browser permissions.");
});
}else{
alert("Geolocation is not supported by your browser.");
}
}

function submitAttendanceRecord(){
hideMsg("attMsg");
const subjectName = document.getElementById("attSubjectSelect").value;
const studentId = document.getElementById("attStudentSelect").value;
const date = document.getElementById("attDate").value;
const status = document.getElementById("attStatus").value;
const location = document.getElementById("attLocation").value;

if(!subjectName || !studentId || !date){
showMsg("attMsg", "Please select Subject, Student, and Date.");
return;
}

const attendanceRecords = getData("attendanceRecords");
const newRecord = {
id: generateId("ATT", "attendanceRecords"),
subjectName,
studentId,
lecturerId: currentUser.id,
date,
status,
location: location || "Not Recorded",
createdAt: new Date().toISOString()
};

attendanceRecords.push(newRecord);
saveData("attendanceRecords", attendanceRecords);
updateStudentAttendancePercentage(studentId);
showMsg("attMsg", "Attendance submitted successfully!", "success");
}

function updateStudentAttendancePercentage(studentId){
const attendanceRecords = getData("attendanceRecords");
const studentRecords = attendanceRecords.filter(r => r.studentId === studentId);
if(!studentRecords.length) return;

const presentCount = studentRecords.filter(r => r.status === "Present" || r.status === "Late").length;
const totalCount = studentRecords.length;
const percentage = Math.round((presentCount / totalCount) * 100);

const students = getData("students");
const index = students.findIndex(s => s.id === studentId);
if(index !== -1){
students[index].attendancePercentage = percentage;
saveData("students", students);
}
}

function showClasses(){
document.getElementById("mainDashboard").classList.add("hidden");
document.getElementById("classesPage").classList.remove("hidden");

const addBtn=document.getElementById("addClassFromClasses");
if(currentUser.role==="lecturer"){
addBtn.classList.remove("hidden");
}else{
addBtn.classList.add("hidden");
}

renderClasses();
}

function showMainDashboardView(){
document.getElementById("mainDashboard").classList.remove("hidden");
document.getElementById("classesPage").classList.add("hidden");
}

function changeClassTab(tab,btn){
document.querySelectorAll(".classes-tab").forEach(x=>x.classList.remove("active"));
btn.classList.add("active");

if(tab==="today"){
document.getElementById("todayClasses").classList.remove("hidden");
document.getElementById("weekClasses").classList.add("hidden");
}else{
document.getElementById("todayClasses").classList.add("hidden");
document.getElementById("weekClasses").classList.remove("hidden");
}
}

function renderClasses(){
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const todayName=days[new Date().getDay()];

document.getElementById("classesSubtitle").innerText="Today is "+todayName;

let subjectsList=[];

if(currentUser.role==="lecturer"){
subjectsList=currentUser.subjects.map(s=>({...s,lecturerName:currentUser.name}));
}else if(currentUser.role==="student"){
const lecturers=getData("lecturers").filter(x=>x.department===currentUser.department);
lecturers.forEach(l=>{
l.subjects.forEach(s=>{
subjectsList.push({
...s,
lecturerName:l.name
});
});
});
}

const todayListEl=document.getElementById("todayClassList");
todayListEl.innerHTML="";

const todayClasses=subjectsList.filter(s=>s.days.includes(todayName));

if(!todayClasses.length){
todayListEl.innerHTML=`<div class="today-empty">No classes scheduled for today (${todayName}).</div>`;
}else{
todayClasses.forEach(s=>{
todayListEl.innerHTML+=`
<div class="class-card">
<div class="class-top">
<div>
<div class="class-subject">${s.name}</div>
<div class="class-meta">Lecturer: ${s.lecturerName}</div>
</div>
<div class="class-time">${s.startTime} - ${s.endTime}</div>
</div>
</div>
`;
});
}

const weeklyListEl=document.getElementById("weeklyClassList");
weeklyListEl.innerHTML="";

const weekDays=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

weekDays.forEach(day=>{
const dayClasses=subjectsList.filter(s=>s.days.includes(day));

let html=`<div class="week-day-title">${day}</div>`;

if(!dayClasses.length){
html+=`<div class="today-empty" style="padding:15px; margin-bottom:12px;">No classes scheduled</div>`;
}else{
dayClasses.forEach(s=>{
html+=`
<div class="class-card">
<div class="class-top">
<div>
<div class="class-subject">${s.name}</div>
<div class="class-meta">Lecturer: ${s.lecturerName}</div>
</div>
<div class="class-time">${s.startTime} - ${s.endTime}</div>
</div>
</div>
`;
});
}

weeklyListEl.innerHTML+=html;
});
}

function openProfile(){
const container=document.getElementById("profileContent");
container.innerHTML="";

if(currentUser.role==="principal"){
container.innerHTML=`
<div class="profile-row"><span>Role</span><strong>Principal</strong></div>
<div class="profile-row"><span>ID</span><strong>${currentUser.id}</strong></div>
<div class="profile-row"><span>Name</span><strong>${currentUser.name}</strong></div>
<div class="profile-row"><span>College</span><strong>${currentUser.college}</strong></div>
<div class="profile-row"><span>Mobile</span><strong>${currentUser.mobile}</strong></div>
<div class="profile-row"><span>HOD Code</span><strong>${currentUser.hodInviteCode}</strong></div>
`;
}else if(currentUser.role==="hod"){
container.innerHTML=`
<div class="profile-row"><span>Role</span><strong>HOD</strong></div>
<div class="profile-row"><span>ID</span><strong>${currentUser.id}</strong></div>
<div class="profile-row"><span>Name</span><strong>${currentUser.name}</strong></div>
<div class="profile-row"><span>Department</span><strong>${currentUser.department}</strong></div>
<div class="profile-row"><span>College</span><strong>${currentUser.college}</strong></div>
<div class="profile-row"><span>Mobile</span><strong>${currentUser.mobile}</strong></div>
<div class="profile-row"><span>Student Code</span><strong>${currentUser.studentInviteCode}</strong></div>
<div class="profile-row"><span>Lecturer Code</span><strong>${currentUser.lecturerInviteCode}</strong></div>
`;
}else if(currentUser.role==="student"){
container.innerHTML=`
<div class="profile-row"><span>Role</span><strong>Student</strong></div>
<div class="profile-row"><span>ID</span><strong>${currentUser.id}</strong></div>
<div class="profile-row"><span>Name</span><strong>${currentUser.name}</strong></div>
<div class="profile-row"><span>Roll Number</span><strong>${currentUser.roll}</strong></div>
<div class="profile-row"><span>Department</span><strong>${currentUser.department}</strong></div>
<div class="profile-row"><span>College</span><strong>${currentUser.college}</strong></div>
<div class="profile-row"><span>Mobile</span><strong>${currentUser.mobile}</strong></div>
<div class="profile-row"><span>Parent</span><strong>${currentUser.parentName} (${currentUser.parentMobile})</strong></div>
`;
}else if(currentUser.role==="lecturer"){
container.innerHTML=`
<div class="profile-row"><span>Role</span><strong>Lecturer</strong></div>
<div class="profile-row"><span>ID</span><strong>${currentUser.id}</strong></div>
<div class="profile-row"><span>Name</span><strong>${currentUser.name}</strong></div>
<div class="profile-row"><span>Department</span><strong>${currentUser.department}</strong></div>
<div class="profile-row"><span>College</span><strong>${currentUser.college}</strong></div>
<div class="profile-row"><span>Mobile</span><strong>${currentUser.mobile}</strong></div>
`;
}

document.getElementById("profileModal").classList.remove("hidden");
}

function closeProfile(){
document.getElementById("profileModal").classList.add("hidden");
}

function openAddSubjectModal(){
hideMsg("addSubjectMsg");
document.getElementById("newSubjectName").value="";
document.getElementById("newSubjectStart").value="";
document.getElementById("newSubjectEnd").value="";
document.querySelectorAll("#newSubjectDays input").forEach(c=>{
c.checked=false;
c.parentElement.classList.remove("active");
});

document.getElementById("subjectModal").classList.remove("hidden");
bindDaysEvents(document.getElementById("subjectModal"));
}

function closeAddSubjectModal(){
document.getElementById("subjectModal").classList.add("hidden");
}

function saveAdditionalSubject(){
hideMsg("addSubjectMsg");

const name=document.getElementById("newSubjectName").value.trim();
const start=document.getElementById("newSubjectStart").value;
const end=document.getElementById("newSubjectEnd").value;

const days=[];
document.querySelectorAll("#newSubjectDays input:checked").forEach(c=>{
days.push(c.value);
});

if(!name||!start||!end||!days.length){
showMsg("addSubjectMsg","Please fill all details and select days.");
return;
}

const newSubject={
name,
startTime:start,
endTime:end,
days
};

currentUser.subjects.push(newSubject);

const lecturers=getData("lecturers");
const idx=lecturers.findIndex(l=>l.id===currentUser.id);
if(idx!==-1){
lecturers[idx]=currentUser;
saveData("lecturers",lecturers);
}

closeAddSubjectModal();
if(!document.getElementById("classesPage").classList.contains("hidden")){
renderClasses();
}
if(currentUser.role==="lecturer"){
loadLecturerDash();
}
}

function logout(){
currentUser=null;
verifiedPrincipal=null;
verifiedHod=null;
showLogin();
}
