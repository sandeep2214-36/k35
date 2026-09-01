let hodDrillState = { subjectName: null, category: null, studentId: null };

function hideAllHodDrillPages(){
["hodDash","hodSubjectCatsPage","hodCategoryStudentsPage","hodStudentHistoryPage","hodStudentsSearchPage","hodTimetablePage","hodNotificationsPage"].forEach(id=>{
const el=document.getElementById(id);
if(el) el.classList.add("hidden");
});
}

function closeHodDrillDown(){
if(!currentUser || currentUser.role!=="hod") return;
hideAllHodDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("hodDash").classList.remove("hidden");
loadHodDash();
}

function hodStudentSubjectPct(studentId, subjectName){
const records = getData("attendanceRecords").filter(r => r.studentId === studentId && (!subjectName || r.subjectName === subjectName));
if(!records.length){
const st = getData("students").find(s => s.id === studentId);
return st ? (st.attendancePercentage || 0) : 0;
}
const present = records.filter(r => r.status === "Present" || r.status === "Late").length;
return Math.round((present / records.length) * 100);
}

function hodDepartmentSubjects(){
const hodId=currentUser.id;
const hodDept=currentUser.department||"";
const subjects = [];
// Include subjects tagged to this HOD/department from any lecturer (extra groups)
getData("lecturers").forEach(l => {
if(!Array.isArray(l.subjects)) return;
l.subjects.forEach(s => {
if(!s || !s.name) return;
const taggedHod=s.hodId;
const taggedDept=s.department||"";
const belongs =
(taggedHod && taggedHod===hodId) ||
(taggedDept && hodDept && taggedDept===hodDept) ||
(!taggedHod && !taggedDept && l.hodId===hodId);
if(belongs && !subjects.includes(s.name)) subjects.push(s.name);
});
});
const records = getData("attendanceRecords").filter(r => {
const st = getData("students").find(s => s.id === r.studentId);
return st && st.hodId === hodId && r.subjectName;
});
records.forEach(r => {
if(r.subjectName && !subjects.includes(r.subjectName)) subjects.push(r.subjectName);
});
if(!subjects.length) subjects.push("General");
return subjects;
}

function loadHodDash(){
if(typeof hideAllRoleContent==="function") hideAllRoleContent();
else hideAllHodDrillPages();
document.getElementById("hodDash").classList.remove("hidden");

const students=getData("students").filter(x=>x.hodId===currentUser.id);

const deptTitle=document.getElementById("hodDepartmentTitle");
if(deptTitle) deptTitle.innerText = currentUser.department || "Department";
document.getElementById("hodStudentCount").innerText=students.length;

let avg=0;
if(students.length){
let sum=students.reduce((a,b)=>a+(b.attendancePercentage||0),0);
avg=Math.round(sum/students.length);
}
document.getElementById("hodAttendance").innerText=avg+"%";
document.getElementById("hodStudentCode").innerText=currentUser.studentInviteCode||"—";
document.getElementById("hodLecturerCode").innerText=currentUser.lecturerInviteCode||"—";

const grid=document.getElementById("hodSubjectsGrid");
grid.innerHTML="";
const subjects=hodDepartmentSubjects();
subjects.forEach(subj=>{
let sum=0,cnt=0;
students.forEach(st=>{
const pct=hodStudentSubjectPct(st.id, subj==="General"?null:subj);
sum+=pct; cnt++;
});
const subAvg=cnt?Math.round(sum/cnt):0;
let badgeClass="good";
if(subAvg<50) badgeClass="low";
else if(subAvg<75) badgeClass="medium";
const safe=subj.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
grid.innerHTML+=`
<div class="principal-box" onclick="openHodSubjectCatsPage('${safe}')">
<div>
<h4>${subj}</h4>
<p>${students.length} students</p>
</div>
<div class="box-footer"><span class="badge ${badgeClass}">${subAvg}%</span></div>
</div>`;
});
}

function openHodSubjectCatsPage(subjectName){
hodDrillState.subjectName=subjectName;
hideAllHodDrillPages();
document.getElementById("hodSubjectCatsPage").classList.remove("hidden");
document.getElementById("hodSubjectCatsTitle").innerText=`${subjectName} – Categories`;
const students=getData("students").filter(s=>s.hodId===currentUser.id);
let high=0,mid=0,low=0;
students.forEach(st=>{
const pct=hodStudentSubjectPct(st.id, subjectName==="General"?null:subjectName);
if(pct>=75) high++; else if(pct>=50) mid++; else low++;
});
document.getElementById("hodCatHigh").innerText=high;
document.getElementById("hodCatMid").innerText=mid;
document.getElementById("hodCatLow").innerText=low;
}

function openHodCategoryStudents(category){
hodDrillState.category=category;
hideAllHodDrillPages();
document.getElementById("hodCategoryStudentsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
document.getElementById("hodCategoryStudentsTitle").innerText=`${hodDrillState.subjectName||"Subject"} – ${titleMap[category]||category}`;
const students=getData("students").filter(s=>s.hodId===currentUser.id);
const list=document.getElementById("hodCategoryStudentsList");
const filtered=students.filter(st=>{
const pct=hodStudentSubjectPct(st.id, hodDrillState.subjectName==="General"?null:hodDrillState.subjectName);
if(category==="high") return pct>=75;
if(category==="mid") return pct>=50 && pct<75;
return pct<50;
});
if(!filtered.length){
list.innerHTML=`<div class="today-empty">No students in this category.</div>`;
return;
}
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
filtered.forEach(st=>{
const pct=hodStudentSubjectPct(st.id, hodDrillState.subjectName==="General"?null:hodDrillState.subjectName);
let badgeClass="good";
if(pct<50) badgeClass="low";
else if(pct<75) badgeClass="medium";
grid.innerHTML+=`
<div class="principal-box" onclick="openHodStudentHistory('${st.id}')">
<div>
<h4>${st.name}</h4>
<p>Roll: ${st.roll||"—"}</p>
<p>Mobile: ${st.mobile||"—"}</p>
</div>
<div class="box-footer"><span class="badge ${badgeClass}">${pct}%</span></div>
</div>`;
});
}

function openHodStudentHistory(studentId){
hodDrillState.studentId=studentId;
hideAllHodDrillPages();
document.getElementById("hodStudentHistoryPage").classList.remove("hidden");
const st=getData("students").find(s=>s.id===studentId);
document.getElementById("hodStudentHistoryTitle").innerText=`${st?st.name:"Student"} – Attendance History`;
const subjectName=hodDrillState.subjectName==="General"?null:hodDrillState.subjectName;
let records=getData("attendanceRecords").filter(r=>r.studentId===studentId && (!subjectName || r.subjectName===subjectName));
records.sort((a,b)=>new Date(b.date)-new Date(a.date));
const list=document.getElementById("hodStudentHistoryList");
if(!records.length){
list.innerHTML=`<div class="today-empty">No attendance history available.</div>`;
return;
}
list.innerHTML="";
records.forEach(r=>{
let badgeClass="good";
if(r.status==="Absent") badgeClass="low";
if(r.status==="Late") badgeClass="medium";
list.innerHTML+=`
<div class="group">
<div>
<strong>${r.date||"—"}</strong><br>
<small style="color:#94a3b8">${r.subjectName||"Subject"} ${r.time?"• "+r.time:""}</small>
</div>
<span class="badge ${badgeClass}">${r.status||"—"}</span>
</div>`;
});
}

function openHodStudentsSearch(){
if(!currentUser || currentUser.role!=="hod") return;
hideAllHodDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("hodStudentsSearchPage").classList.remove("hidden");
const input=document.getElementById("hodStudentSearchInput");
const msg=document.getElementById("hodStudentSearchMsg");
const result=document.getElementById("hodStudentSearchResult");
if(input) input.value="";
if(msg){ msg.style.display="none"; msg.innerText=""; }
if(result) result.classList.add("hidden");
}

function searchHodStudent(){
const msg=document.getElementById("hodStudentSearchMsg");
const result=document.getElementById("hodStudentSearchResult");
const details=document.getElementById("hodStudentSearchDetails");
const q=(document.getElementById("hodStudentSearchInput").value||"").trim().toLowerCase();
msg.style.display="none";
result.classList.add("hidden");
details.innerHTML="";
if(!q){
msg.innerText="Please enter roll number or mobile number.";
msg.style.display="block";
return;
}
const students=getData("students").filter(x=>x.hodId===currentUser.id);
const student=students.find(s=>
(s.roll && String(s.roll).toLowerCase()===q) ||
(s.mobile && String(s.mobile).toLowerCase()===q) ||
(s.id && String(s.id).toLowerCase()===q)
);
if(!student){
msg.innerText="No student found in your department with this roll/mobile.";
msg.style.display="block";
return;
}
const att=student.attendancePercentage||0;
let badgeClass="good";
if(att<50) badgeClass="low";
else if(att<75) badgeClass="medium";
details.innerHTML=`
<div class="principal-box-grid">
<div class="principal-box" style="cursor:default; grid-column:1 / -1;">
<div>
<h4>${student.name||"—"}</h4>
<p>Student ID: ${student.id||"—"}</p>
<p>Roll Number: ${student.roll||"—"}</p>
<p>Mobile: ${student.mobile||"—"}</p>
<p>College: ${student.college||"—"}</p>
<p>Department / Group: ${student.department||"—"}</p>
<p>HOD: ${student.hodName||currentUser.name||"—"}</p>
<p>Principal: ${student.principalName||"—"}</p>
<p>Parent Name: ${student.parentName||"—"}</p>
<p>Parent Mobile: ${student.parentMobile||"—"}</p>
<p>Created: ${student.createdAt ? new Date(student.createdAt).toLocaleString() : "—"}</p>
</div>
<div class="box-footer"><span class="badge ${badgeClass}">Attendance ${att}%</span></div>
</div>
</div>`;
result.classList.remove("hidden");
}

function openHodTimetable(){
if(!currentUser || currentUser.role!=="hod") return;
hideAllHodDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("hodTimetablePage").classList.remove("hidden");
const firstBtn=document.querySelector("#hodDayFilters .filter-btn");
renderHodTimetable("Monday", firstBtn);
}

function renderHodTimetable(day, btn){
if(btn){
document.querySelectorAll("#hodDayFilters .filter-btn").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
}
const list=document.getElementById("hodTimetableList");
const hodId=currentUser.id;
const hodDept=currentUser.department||"";
const items=[];
// Only subjects belonging to this HOD department (tagged or primary)
getData("lecturers").forEach(l=>{
if(!Array.isArray(l.subjects)) return;
l.subjects.forEach(s=>{
const taggedHod=s.hodId;
const taggedDept=s.department||"";
const belongs=
(taggedHod && taggedHod===hodId) ||
(taggedDept && hodDept && taggedDept===hodDept) ||
(!taggedHod && !taggedDept && l.hodId===hodId);
if(!belongs) return;
const days=s.days||s.weekDays||[];
const dayMatch=!days.length || days.some(d=>String(d).toLowerCase()===String(day).toLowerCase());
if(dayMatch){
items.push({
lecturer:l.name||"—",
subject:s.name||"—",
start:s.start||s.startTime||"—",
end:s.end||s.endTime||"—",
department:taggedDept||hodDept||"—"
});
}
});
});
if(!items.length){
list.innerHTML=`<div class="today-empty">No classes scheduled for ${day}.</div>`;
return;
}
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
items.forEach(it=>{
grid.innerHTML+=`
<div class="principal-box" style="cursor:default">
<div>
<h4>${it.subject}</h4>
<p>Lecturer: ${it.lecturer}</p>
<p>Group: ${it.department}</p>
<p>Time: ${it.start} – ${it.end}</p>
<p>Day: ${day}</p>
</div>
</div>`;
});
}

function openHodNotifications(){
if(!currentUser || currentUser.role!=="hod") return;
hideAllHodDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("hodNotificationsPage").classList.remove("hidden");
}

function showHodLecturersList(){ /* legacy removed – HOD uses subject drill-down */ }
function hideHodDynamicList(){ /* legacy removed */ }

