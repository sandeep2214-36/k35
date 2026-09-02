let hodDrillState = { subjectName: null, category: null, year: null, studentId: null };

function hideAllHodDrillPages(){
["hodDash","hodSubjectCatsPage","hodCategoryYearsPage","hodCategoryStudentsPage","hodStudentHistoryPage","hodStudentsSearchPage","hodTimetablePage","hodNotificationsPage"].forEach(id=>{
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

function hodDepartmentSubjects(yearFilter){
const hodId=currentUser.id;
const hodDept=currentUser.department||"";
const yr=yearFilter!==undefined ? yearFilter : hodDrillState.year;
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

function loadHodDash(){
if(typeof hideAllRoleContent==="function") hideAllRoleContent();
else hideAllHodDrillPages();
document.getElementById("hodDash").classList.remove("hidden");
hodDrillState.year=null;

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

// Groups = Year-wise (1st/2nd/3rd/4th) based on student data
const yGrid=document.getElementById("hodYearsGrid");
if(yGrid){
yGrid.innerHTML="";
[1,2,3,4].forEach(y=>{
const ys=studentsInYear(students, y);
const subCount=hodDepartmentSubjects(y).length;
let yAvg=0;
if(ys.length) yAvg=Math.round(ys.reduce((a,b)=>a+(b.attendancePercentage||0),0)/ys.length);
let badge=yAvg>=75?"good":(yAvg>=50?"medium":"low");
const label=y===1?"1st":y===2?"2nd":y===3?"3rd":"4th";
yGrid.innerHTML+=`<div class="principal-box" onclick="openHodYearSubjects('${y}')"><div><h4>${label} Year</h4><p>Students: ${ys.length}</p><p>Subjects: ${subCount}</p></div><div class="box-footer"><span class="badge ${badge}">AVG ${yAvg}%</span></div></div>`;
});
}
}

function openHodYearSubjects(year){
// Year group → subjects for this department + year only (lecturer-added)
hodDrillState.year=String(year);
hodDrillState.subjectName=null;
hodDrillState.category=null;
hideAllHodDrillPages();
const subjects=hodDepartmentSubjects(year);
const students=studentsInYear(getData("students").filter(x=>x.hodId===currentUser.id), year);
document.getElementById("hodCategoryYearsPage").classList.remove("hidden");
const label=year==="1"?"1st":year==="2"?"2nd":year==="3"?"3rd":"4th";
document.getElementById("hodCategoryYearsTitle").innerText=`${label} Year – Subjects`;
const list=document.getElementById("hodCategoryYearsList");
list.innerHTML="";
const backBtn=document.querySelector("#hodCategoryYearsPage .back");
if(backBtn) backBtn.setAttribute("onclick","closeHodDrillDown()");
if(!students.length && !subjects.length){
list.innerHTML=`<div class="today-empty">No data for ${label} Year yet (students / subjects).</div>`;
return;
}
if(!subjects.length){
list.innerHTML=`<div class="today-empty">No subjects for ${label} Year. Lecturer must add subject with Year ${year}.</div>`;
return;
}
subjects.forEach(subj=>{
let sum=0,cnt=0;
students.forEach(st=>{ const pct=hodStudentSubjectPct(st.id, subj==="General"?null:subj); sum+=pct; cnt++; });
const subAvg=cnt?Math.round(sum/cnt):0;
let badge=subAvg>=75?"good":(subAvg>=50?"medium":"low");
const safe=subj.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
list.innerHTML+=`<div class="principal-box" onclick="openHodSubjectCatsPage('${safe}')"><div><h4>${subj}</h4><p>Students (Year ${year}): ${students.length}</p></div><div class="box-footer"><span class="badge ${badge}">${subAvg}%</span></div></div>`;
});
}

function openHodSubjectCatsPage(subjectName){
hodDrillState.subjectName=subjectName;
hideAllHodDrillPages();
document.getElementById("hodSubjectCatsPage").classList.remove("hidden");
const yr=hodDrillState.year;
document.getElementById("hodSubjectCatsTitle").innerText=yr?`${subjectName} – Year ${yr} – Categories`:`${subjectName} – Categories`;
let students=getData("students").filter(s=>s.hodId===currentUser.id);
if(yr) students=studentsInYear(students, yr);
let high=0,mid=0,low=0;
students.forEach(st=>{
const pct=hodStudentSubjectPct(st.id, subjectName==="General"?null:subjectName);
if(pct>=75) high++; else if(pct>=50) mid++; else low++;
});
document.getElementById("hodCatHigh").innerText=high;
document.getElementById("hodCatMid").innerText=mid;
document.getElementById("hodCatLow").innerText=low;
}

function openHodCategoryYears(category){
hodDrillState.category=category;
if(hodDrillState.year){
openHodCategoryStudents(category, hodDrillState.year);
return;
}
hideAllHodDrillPages();
document.getElementById("hodCategoryYearsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
document.getElementById("hodCategoryYearsTitle").innerText=`${hodDrillState.subjectName||"Subject"} – ${titleMap[category]||category} – Years`;
const list=document.getElementById("hodCategoryYearsList");
list.innerHTML="";
const backBtn=document.querySelector("#hodCategoryYearsPage .back");
if(backBtn) backBtn.setAttribute("onclick","openHodSubjectCatsPage(hodDrillState.subjectName)");
[1,2,3,4].forEach(y=>{
const students=getData("students").filter(s=>s.hodId===currentUser.id && String(s.year||s.semester||"")===String(y));
const count=students.filter(st=>{
const pct=hodStudentSubjectPct(st.id, hodDrillState.subjectName==="General"?null:hodDrillState.subjectName);
if(category==="high") return pct>=75;
if(category==="mid") return pct>=50 && pct<75;
return pct<50;
}).length;
list.innerHTML+=`<div class="principal-box" onclick="openHodCategoryStudents('${category}','${y}')"><div><h4>${y}${y===1?'st':y===2?'nd':y===3?'rd':'th'} Year</h4><p>Students in this category: ${count}</p></div></div>`;
});
}

function openHodCategoryStudents(category, year){
if(category) hodDrillState.category=category;
if(year!==undefined && year!==null && year!=="") hodDrillState.year=String(year);
const yr=hodDrillState.year;
if(!yr){
openHodCategoryYears(category||hodDrillState.category);
return;
}
hideAllHodDrillPages();
document.getElementById("hodCategoryStudentsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
const cat=hodDrillState.category;
document.getElementById("hodCategoryStudentsTitle").innerText=`${hodDrillState.subjectName||"Subject"} – ${titleMap[cat]||cat} – Year ${yr}`;
const students=studentsInYear(getData("students").filter(s=>s.hodId===currentUser.id), yr);
const list=document.getElementById("hodCategoryStudentsList");
const filtered=students.filter(st=>{
const pct=hodStudentSubjectPct(st.id, hodDrillState.subjectName==="General"?null:hodDrillState.subjectName);
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
const pct=hodStudentSubjectPct(st.id, hodDrillState.subjectName==="General"?null:hodDrillState.subjectName);
let badgeClass="good";
if(pct<50) badgeClass="low";
else if(pct<75) badgeClass="medium";
grid.innerHTML+=`
<div class="principal-box" onclick="openHodStudentHistory('${st.id}')">
<div>
<h4>${st.name}</h4>
<p>Roll: ${st.roll||"—"}</p>
<p>Year: ${st.year||st.semester||"—"}</p>
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

