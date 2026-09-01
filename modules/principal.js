let principalDrillState = { hodId: null, subjectName: null, category: null, studentId: null };

function hideAllPrincipalDrillPages(){
["principalDash","principalGroupsPage","principalHodsPage","principalGroupSubjectsPage","principalSubjectCatsPage","principalCategoryStudentsPage","principalStudentHistoryPage","principalStudentsSearchPage"].forEach(id=>{
const el=document.getElementById(id);
if(el) el.classList.add("hidden");
});
}

function openPrincipalStudentsSearch(){
if(!currentUser || currentUser.role !== "principal") return;
hideAllPrincipalDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");
document.getElementById("principalStudentsSearchPage").classList.remove("hidden");
const input=document.getElementById("principalStudentSearchInput");
const msg=document.getElementById("principalStudentSearchMsg");
const result=document.getElementById("principalStudentSearchResult");
if(input) input.value="";
if(msg){ msg.style.display="none"; msg.innerText=""; }
if(result) result.classList.add("hidden");
}

function searchPrincipalStudent(){
const msg=document.getElementById("principalStudentSearchMsg");
const result=document.getElementById("principalStudentSearchResult");
const details=document.getElementById("principalStudentSearchDetails");
const q=(document.getElementById("principalStudentSearchInput").value||"").trim().toLowerCase();
msg.style.display="none";
result.classList.add("hidden");
details.innerHTML="";

if(!q){
msg.innerText="Please enter roll number or mobile number.";
msg.style.display="block";
return;
}

const students=getData("students").filter(x=>x.principalId===currentUser.id);
const student=students.find(s=>
(s.roll && String(s.roll).toLowerCase()===q) ||
(s.mobile && String(s.mobile).toLowerCase()===q) ||
(s.id && String(s.id).toLowerCase()===q)
);

if(!student){
msg.innerText="No student found with this roll number or mobile.";
msg.style.display="block";
return;
}

const hod=getData("hods").find(h=>h.id===student.hodId);
const att=student.attendancePercentage||0;
let badgeClass="good";
if(att<50) badgeClass="low";
else if(att<75) badgeClass="medium";

details.innerHTML=`
<div class="principal-box-grid">
<div class="principal-box" style="cursor:default; grid-column:1 / -1;">
<div>
<h4>${student.name || "—"}</h4>
<p>Student ID: ${student.id || "—"}</p>
<p>Roll Number: ${student.roll || "—"}</p>
<p>Mobile: ${student.mobile || "—"}</p>
<p>College: ${student.college || "—"}</p>
<p>Department / Group: ${student.department || "—"}</p>
<p>HOD: ${student.hodName || (hod && hod.name) || "—"}</p>
<p>Principal: ${student.principalName || currentUser.name || "—"}</p>
<p>Parent Name: ${student.parentName || "—"}</p>
<p>Parent Mobile: ${student.parentMobile || "—"}</p>
<p>Created: ${student.createdAt ? new Date(student.createdAt).toLocaleString() : "—"}</p>
</div>
<div class="box-footer">
<span class="badge ${badgeClass}">Attendance ${att}%</span>
</div>
</div>
</div>`;
result.classList.remove("hidden");
}

function closePrincipalDrillDown(){
hideAllPrincipalDrillPages();
document.getElementById("principalDash").classList.remove("hidden");
loadPrincipalDash();
}

function principalStudentSubjectPct(studentId, subjectName){
const records = getData("attendanceRecords").filter(r => r.studentId === studentId && (!subjectName || r.subjectName === subjectName));
if(!records.length){
const st = getData("students").find(s => s.id === studentId);
return st ? (st.attendancePercentage || 0) : 0;
}
const present = records.filter(r => r.status === "Present" || r.status === "Late").length;
return Math.round((present / records.length) * 100);
}

function principalGroupSubjects(hodId){
const hod=getData("hods").find(h=>h.id===hodId);
const hodDept=hod ? (hod.department||"") : "";
const subjects = [];
// All lecturers may teach extra groups via Add Subject — filter by subject.hodId / subject.department
getData("lecturers").forEach(l => {
if(!Array.isArray(l.subjects)) return;
l.subjects.forEach(s => {
if(!s || !s.name) return;
const taggedHod=s.hodId;
const taggedDept=s.department||"";
const belongs =
(taggedHod && taggedHod===hodId) ||
(taggedDept && hodDept && taggedDept===hodDept) ||
// legacy subjects (no tag) only under lecturer's primary HOD
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

function loadPrincipalDash(){
if(typeof hideAllRoleContent==="function") hideAllRoleContent();
else hideAllPrincipalDrillPages();
document.getElementById("principalDash").classList.remove("hidden");

const hods=getData("hods").filter(x=>x.principalId===currentUser.id);
const students=getData("students").filter(x=>x.principalId===currentUser.id);

document.getElementById("groupCount").innerText=hods.length;
document.getElementById("hodCount").innerText=hods.length;
document.getElementById("studentCount").innerText=students.length;
document.getElementById("principalHodCode").innerText=currentUser.hodInviteCode;
}

function openPrincipalGroupsPage(){
hideAllPrincipalDrillPages();
document.getElementById("principalGroupsPage").classList.remove("hidden");
const hods=getData("hods").filter(x=>x.principalId===currentUser.id);
const students=getData("students").filter(x=>x.principalId===currentUser.id);
const list=document.getElementById("principalGroupsList");
list.innerHTML="";
if(!hods.length){
list.innerHTML=`<div class="today-empty">No groups found.</div>`;
return;
}
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
hods.forEach(h=>{
const deptStudents=students.filter(s=>s.hodId===h.id);
let deptAvg=0;
if(deptStudents.length){
deptAvg=Math.round(deptStudents.reduce((a,b)=>a+(b.attendancePercentage||0),0)/deptStudents.length);
}
let badgeClass="good";
if(deptAvg<50) badgeClass="low";
else if(deptAvg<75) badgeClass="medium";
grid.innerHTML+=`
<div class="principal-box" onclick="openPrincipalGroupSubjectsPage('${h.id}')">
<div>
<h4>${h.department || "Group"}</h4>
<p>HOD: ${h.name || "—"}</p>
<p>Mobile: ${h.mobile || "—"}</p>
<p>Students: ${deptStudents.length}</p>
</div>
<div class="box-footer">
<span class="badge ${badgeClass}">AVG ${deptAvg}%</span>
</div>
</div>`;
});
}

function openPrincipalHodsPage(){
hideAllPrincipalDrillPages();
document.getElementById("principalHodsPage").classList.remove("hidden");
const hods=getData("hods").filter(x=>x.principalId===currentUser.id);
const students=getData("students").filter(x=>x.principalId===currentUser.id);
const list=document.getElementById("principalHodsList");
list.innerHTML="";
if(!hods.length){
list.innerHTML=`<div class="today-empty">No HODs found.</div>`;
return;
}
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
hods.forEach(h=>{
const count=students.filter(s=>s.hodId===h.id).length;
grid.innerHTML+=`
<div class="principal-box">
<div>
<h4>${h.name || "HOD"}</h4>
<p>Department: ${h.department || "—"}</p>
<p>Mobile: ${h.mobile || "—"}</p>
<p>Students: ${count}</p>
</div>
</div>`;
});
}

function openPrincipalGroupSubjectsPage(hodId){
principalDrillState.hodId=hodId;
hideAllPrincipalDrillPages();
document.getElementById("principalGroupSubjectsPage").classList.remove("hidden");
const hod=getData("hods").find(h=>h.id===hodId);
document.getElementById("principalGroupSubjectsTitle").innerText=`${hod ? (hod.department || "Group") : "Group"} – Subject Attendance`;
const subjects=principalGroupSubjects(hodId);
const students=getData("students").filter(s=>s.hodId===hodId);
const list=document.getElementById("principalGroupSubjectsList");
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
subjects.forEach(subj=>{
let sum=0,cnt=0;
students.forEach(st=>{
const pct=principalStudentSubjectPct(st.id, subj === "General" ? null : subj);
sum+=pct; cnt++;
});
const avg=cnt?Math.round(sum/cnt):0;
let badgeClass="good";
if(avg<50) badgeClass="low";
else if(avg<75) badgeClass="medium";
const safeSubj=subj.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
grid.innerHTML+=`
<div class="principal-box" onclick="openPrincipalSubjectCatsPage('${hodId}', '${safeSubj}')">
<div>
<h4>${subj}</h4>
<p>${students.length} students in this group</p>
</div>
<div class="box-footer">
<span class="badge ${badgeClass}">${avg}%</span>
</div>
</div>`;
});
}

function openPrincipalSubjectCatsPage(hodId, subjectName){
principalDrillState.hodId=hodId;
principalDrillState.subjectName=subjectName;
hideAllPrincipalDrillPages();
document.getElementById("principalSubjectCatsPage").classList.remove("hidden");
document.getElementById("principalSubjectCatsTitle").innerText=`${subjectName} – Categories`;
const students=getData("students").filter(s=>s.hodId===hodId);
let high=0,mid=0,low=0;
students.forEach(st=>{
const pct=principalStudentSubjectPct(st.id, subjectName === "General" ? null : subjectName);
if(pct>=75) high++;
else if(pct>=50) mid++;
else low++;
});
document.getElementById("principalCatHigh").innerText=high;
document.getElementById("principalCatMid").innerText=mid;
document.getElementById("principalCatLow").innerText=low;
}

function openPrincipalCategoryStudents(category){
principalDrillState.category=category;
hideAllPrincipalDrillPages();
document.getElementById("principalCategoryStudentsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
document.getElementById("principalCategoryStudentsTitle").innerText=`${principalDrillState.subjectName || "Subject"} – ${titleMap[category]||category}`;
const students=getData("students").filter(s=>s.hodId===principalDrillState.hodId);
const list=document.getElementById("principalCategoryStudentsList");
list.innerHTML="";
const filtered=students.filter(st=>{
const pct=principalStudentSubjectPct(st.id, principalDrillState.subjectName === "General" ? null : principalDrillState.subjectName);
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
const pct=principalStudentSubjectPct(st.id, principalDrillState.subjectName === "General" ? null : principalDrillState.subjectName);
let badgeClass="good";
if(pct<50) badgeClass="low";
else if(pct<75) badgeClass="medium";
grid.innerHTML+=`
<div class="principal-box" onclick="openPrincipalStudentHistory('${st.id}')">
<div>
<h4>${st.name}</h4>
<p>Roll: ${st.roll || "—"}</p>
<p>Mobile: ${st.mobile || "—"}</p>
</div>
<div class="box-footer">
<span class="badge ${badgeClass}">${pct}%</span>
</div>
</div>`;
});
}

function openPrincipalStudentHistory(studentId){
principalDrillState.studentId=studentId;
hideAllPrincipalDrillPages();
document.getElementById("principalStudentHistoryPage").classList.remove("hidden");
const st=getData("students").find(s=>s.id===studentId);
document.getElementById("principalStudentHistoryTitle").innerText=`${st ? st.name : "Student"} – Attendance History`;
const subjectName=principalDrillState.subjectName === "General" ? null : principalDrillState.subjectName;
let records=getData("attendanceRecords").filter(r=>r.studentId===studentId && (!subjectName || r.subjectName===subjectName));
records.sort((a,b)=>new Date(b.date)-new Date(a.date));
const list=document.getElementById("principalStudentHistoryList");
list.innerHTML="";
if(!records.length){
list.innerHTML=`<div class="today-empty">No attendance history available for this student.</div>`;
return;
}
records.forEach(r=>{
let badgeClass="good";
if(r.status==="Absent") badgeClass="low";
if(r.status==="Late") badgeClass="medium";
list.innerHTML+=`
<div class="group">
<div>
<strong>${r.date || "—"}</strong><br>
<small style="color:#94a3b8">${r.subjectName || "Subject"} ${r.time ? "• "+r.time : ""}</small>
</div>
<span class="badge ${badgeClass}">${r.status || "—"}</span>
</div>`;
});
}

