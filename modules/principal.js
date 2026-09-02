let principalDrillState = { hodId: null, subjectName: null, category: null, year: null, studentId: null };

function hideAllPrincipalDrillPages(){
["principalDash","principalGroupsPage","principalYearGroupsPage","principalHodsPage","principalGroupSubjectsPage","principalSubjectCatsPage","principalCategoryYearsPage","principalCategoryStudentsPage","principalStudentHistoryPage","principalStudentsSearchPage"].forEach(id=>{
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

function principalGroupSubjects(hodId, yearFilter){
const hod=getData("hods").find(h=>h.id===hodId);
const hodDept=hod ? (hod.department||"") : "";
const yr=yearFilter!==undefined ? yearFilter : principalDrillState.year;
const subjects = [];
getData("lecturers").forEach(l => {
if(!Array.isArray(l.subjects)) return;
l.subjects.forEach(s => {
if(!s || !s.name) return;
if(yr && !subjectMatchesYear(s, yr)) return;
const taggedHod=s.hodId;
const taggedDept=s.department||"";
const belongs =
(taggedHod && taggedHod===hodId) ||
(taggedDept && hodDept && taggedDept===hodDept) ||
(!taggedHod && !taggedDept && l.hodId===hodId);
if(belongs && !subjects.includes(s.name)) subjects.push(s.name);
});
});
// Attendance records only if student year matches when filtering
const records = getData("attendanceRecords").filter(r => {
const st = getData("students").find(s => s.id === r.studentId);
if(!st || st.hodId !== hodId || !r.subjectName) return false;
if(yr && studentYearValue(st)!==String(yr)) return false;
return true;
});
records.forEach(r => {
if(r.subjectName && !subjects.includes(r.subjectName)) subjects.push(r.subjectName);
});
if(!subjects.length && !yr) subjects.push("General");
return subjects;
}

function loadPrincipalDash(){
if(typeof hideAllRoleContent==="function") hideAllRoleContent();
else hideAllPrincipalDrillPages();
document.getElementById("principalDash").classList.remove("hidden");
principalDrillState.year=null;

const hods=getData("hods").filter(x=>x.principalId===currentUser.id);
const students=getData("students").filter(x=>x.principalId===currentUser.id);

document.getElementById("groupCount").innerText=hods.length;
document.getElementById("hodCount").innerText=hods.length;
document.getElementById("studentCount").innerText=students.length;
document.getElementById("principalHodCode").innerText=currentUser.hodInviteCode;

// Year-wise Analysis on home
const yGrid=document.getElementById("principalYearsGrid");
if(yGrid){
yGrid.innerHTML="";
[1,2,3,4].forEach(y=>{
const ys=students.filter(s=>String(s.year||s.semester||"")===String(y));
let avg=0;
if(ys.length) avg=Math.round(ys.reduce((a,b)=>a+(b.attendancePercentage||0),0)/ys.length);
let badge=avg>=75?"good":(avg>=50?"medium":"low");
const label=y===1?"1st":y===2?"2nd":y===3?"3rd":"4th";
yGrid.innerHTML+=`<div class="principal-box" onclick="openPrincipalYearGroups('${y}')"><div><h4>${label} Year</h4><p>Students: ${ys.length}</p></div><div class="box-footer"><span class="badge ${badge}">AVG ${avg}%</span></div></div>`;
});
}
}

function openPrincipalYearGroups(year){
principalDrillState.year=String(year);
hideAllPrincipalDrillPages();
document.getElementById("principalYearGroupsPage").classList.remove("hidden");
const label=year==="1"?"1st":year==="2"?"2nd":year==="3"?"3rd":"4th";
document.getElementById("principalYearGroupsTitle").innerText=`${label} Year – Groups`;
const hods=getData("hods").filter(x=>x.principalId===currentUser.id);
const students=getData("students").filter(x=>x.principalId===currentUser.id && String(x.year||x.semester||"")===String(year));
const list=document.getElementById("principalYearGroupsList");
if(!hods.length){ list.innerHTML=`<div class="today-empty">No groups found.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
hods.forEach(h=>{
const deptStudents=students.filter(s=>s.hodId===h.id);
let deptAvg=0;
if(deptStudents.length) deptAvg=Math.round(deptStudents.reduce((a,b)=>a+(b.attendancePercentage||0),0)/deptStudents.length);
let badgeClass=deptAvg>=75?"good":(deptAvg>=50?"medium":"low");
grid.innerHTML+=`<div class="principal-box" onclick="openPrincipalGroupSubjectsPage('${h.id}')"><div><h4>${h.department||"Group"}</h4><p>HOD: ${h.name||"—"}</p><p>Mobile: ${h.mobile||"—"}</p><p>Students (Year ${year}): ${deptStudents.length}</p></div><div class="box-footer"><span class="badge ${badgeClass}">AVG ${deptAvg}%</span></div></div>`;
});
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
const yr=principalDrillState.year;
const titleBase=hod ? (hod.department || "Group") : "Group";
document.getElementById("principalGroupSubjectsTitle").innerText=yr?`${titleBase} – Year ${yr} – Subjects`:`${titleBase} – Subject Attendance`;
const subjects=principalGroupSubjects(hodId);
let students=getData("students").filter(s=>s.hodId===hodId);
if(yr) students=studentsInYear(students, yr);
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
<p>${students.length} students${yr?` (Year ${yr})`:""}</p>
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
const yr=principalDrillState.year;
document.getElementById("principalSubjectCatsTitle").innerText=yr?`${subjectName} – Year ${yr} – Categories`:`${subjectName} – Categories`;
let students=getData("students").filter(s=>s.hodId===hodId);
if(yr) students=studentsInYear(students, yr);
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

function openPrincipalCategoryYears(category){
principalDrillState.category=category;
// If year already chosen from Year-wise Analysis, go to students for that year only
if(principalDrillState.year){
openPrincipalCategoryStudents(category, principalDrillState.year);
return;
}
hideAllPrincipalDrillPages();
document.getElementById("principalCategoryYearsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
document.getElementById("principalCategoryYearsTitle").innerText=`${principalDrillState.subjectName||"Subject"} – ${titleMap[category]||category} – Years`;
const list=document.getElementById("principalCategoryYearsList");
list.innerHTML="";
[1,2,3,4].forEach(y=>{
const students=studentsInYear(getData("students").filter(s=>s.hodId===principalDrillState.hodId), y);
const count=students.filter(st=>{
const pct=principalStudentSubjectPct(st.id, principalDrillState.subjectName==="General"?null:principalDrillState.subjectName);
if(category==="high") return pct>=75;
if(category==="mid") return pct>=50 && pct<75;
return pct<50;
}).length;
list.innerHTML+=`<div class="principal-box" onclick="openPrincipalCategoryStudents('${category}','${y}')"><div><h4>${y}${y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</h4><p>Students in this category: ${count}</p></div></div>`;
});
}

function openPrincipalCategoryStudents(category, year){
if(category) principalDrillState.category=category;
if(year!==undefined && year!==null && year!=="") principalDrillState.year=String(year);
const yr=principalDrillState.year;
// Year mandatory – never show all students
if(!yr){
openPrincipalCategoryYears(category||principalDrillState.category);
return;
}
hideAllPrincipalDrillPages();
document.getElementById("principalCategoryStudentsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
const cat=principalDrillState.category;
document.getElementById("principalCategoryStudentsTitle").innerText=`${principalDrillState.subjectName || "Subject"} – ${titleMap[cat]||cat} – Year ${yr}`;
const students=studentsInYear(getData("students").filter(s=>s.hodId===principalDrillState.hodId), yr);
const list=document.getElementById("principalCategoryStudentsList");
list.innerHTML="";
const filtered=students.filter(st=>{
const pct=principalStudentSubjectPct(st.id, principalDrillState.subjectName === "General" ? null : principalDrillState.subjectName);
if(cat==="high") return pct>=75;
if(cat==="mid") return pct>=50 && pct<75;
return pct<50;
});
if(!filtered.length){
list.innerHTML=`<div class="today-empty">No students in this category for Year ${yr}.</div>`;
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
<p>Year: ${studentYearValue(st)||"—"}</p>
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

