
let selectedRole=null;
let verifiedPrincipal=null;
let verifiedHod=null;
let currentUser=null;

function getData(key){
return JSON.parse(localStorage.getItem(key)||"[]");
}

function saveData(key,data){
localStorage.setItem(key,JSON.stringify(data));
}

async function hashPassword(password){
const encoder=new TextEncoder();
const data=encoder.encode(password);
const hash=await crypto.subtle.digest("SHA-256",data);
return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function digitsOnly(input){
input.value=input.value.replace(/\D/g,"").slice(0,10);
}

function validMobile(mobile){
return /^\d{10}$/.test(mobile);
}

function validPassword(password){
return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function showMsg(id,text,type="error"){
const el=document.getElementById(id);
el.innerText=text;
el.className="msg "+type;
el.style.display="block";
}

function hideMsg(id){
document.getElementById(id).style.display="none";
}

function togglePassword(inputId,iconId){
const input=document.getElementById(inputId);
const icon=document.getElementById(iconId);
if(input.type==="password"){
input.type="text";
icon.className="fa-solid fa-eye-slash";
}else{
input.type="password";
icon.className="fa-solid fa-eye";
}
}

function generateId(prefix,key){
const data=getData(key);
return prefix+String(data.length+1).padStart(4,"0");
}

function generateCode(prefix){
return prefix+"-"+Math.random().toString(36).substring(2,7).toUpperCase();
}

function mobileAlreadyUsed(mobile){
const principals=getData("principals");
const hods=getData("hods");
const students=getData("students");
const lecturers=getData("lecturers");

return(
principals.some(x=>x.mobile===mobile)||
hods.some(x=>x.mobile===mobile)||
students.some(x=>x.mobile===mobile)||
lecturers.some(x=>x.mobile===mobile)
);
}

/* SIDEBAR DRAWER TOGGLE */
function toggleSidebar(){
const drawer = document.getElementById("sidebarDrawer");
const overlay = document.getElementById("drawerOverlay");
drawer.classList.toggle("open");
overlay.classList.toggle("show");
}

function navigateSidebar(view){
toggleSidebar();
if(view === 'home'){
if(typeof closeHodDrillDown==="function") closeHodDrillDown();
if(typeof closePrincipalDrillDown==="function") closePrincipalDrillDown();
if(typeof closeLecDrillDown==="function") closeLecDrillDown();
if(typeof closeStuPages==="function") closeStuPages();
showMainDashboardView();
if(currentUser && currentUser.role==="hod") loadHodDash();
if(currentUser && currentUser.role==="principal") loadPrincipalDash();
if(currentUser && currentUser.role==="lecturer") loadLecturerDash();
if(currentUser && currentUser.role==="student") loadStudentDash();
}
if(view === 'classes') showClasses();
if(view === 'profile') openProfile();
if(view === 'students'){
if(currentUser && currentUser.role==="principal") openPrincipalStudentsSearch();
if(currentUser && currentUser.role==="hod") openHodStudentsSearch();
}
if(view === 'timetable'){
if(currentUser && currentUser.role==="hod") openHodTimetable();
if(currentUser && currentUser.role==="lecturer") openLecTimetable();
if(currentUser && currentUser.role==="student") openStuTimetablePage();
}
if(view === 'notifications'){
if(currentUser && currentUser.role==="hod") openHodNotifications();
if(currentUser && currentUser.role==="lecturer") openLecNotifications();
if(currentUser && currentUser.role==="student") openStuNotificationsPage();
}
if(view === 'attendance'){
if(currentUser && currentUser.role==="lecturer") openLecAttendancePage();
if(currentUser && currentUser.role==="student") openStuAttendancePage();
}
if(view === 'add'){
if(currentUser && currentUser.role==="lecturer") openLecAddSubjectPage();
}
if(view === 'marks'){
if(currentUser && currentUser.role==="student") openStuMarksPage();
}
}

function hideAll(){
document.querySelectorAll(".screen").forEach(x=>{
x.classList.add("hidden");
});
document.getElementById("dashboard").classList.add("hidden");
document.getElementById("profileModal").classList.add("hidden");
document.getElementById("subjectModal").classList.add("hidden");
}

function showScreen(screenId){
hideAll();
document.getElementById(screenId).classList.remove("hidden");
}

function showLogin(){
showScreen("loginScreen");
}

function showRole(){
showScreen("roleScreen");
selectedRole=null;
document.querySelectorAll(".role").forEach(x=>x.classList.remove("selected"));
}

function selectRole(element,role){
selectedRole=role;
document.querySelectorAll(".role").forEach(x=>x.classList.remove("selected"));
element.classList.add("selected");
}

function submitRole(){
if(!selectedRole){
showMsg("roleMsg","Please select one role.");
return;
}

hideAll();

if(selectedRole==="principal"){
showScreen("principalScreen");
}else if(selectedRole==="hod"){
showScreen("hodCodeScreen");
}else if(selectedRole==="student"){
showScreen("studentCodeScreen");
}else if(selectedRole==="lecturer"){
showScreen("lecturerCodeScreen");
}
}

async function createPrincipal(){
hideMsg("principalMsg");

const college=document.getElementById("pCollege").value.trim();
const name=document.getElementById("pName").value.trim();
const mobile=document.getElementById("pMobile").value.trim();
const password=document.getElementById("pPassword").value;
const confirm=document.getElementById("pConfirm").value;

if(!college||!name||!mobile||!password||!confirm){
showMsg("principalMsg","Please fill all fields.");
return;
}

if(!validMobile(mobile)){
showMsg("principalMsg","Mobile number must contain exactly 10 digits.");
return;
}

if(mobileAlreadyUsed(mobile)){
showMsg("principalMsg","This mobile number is already registered.");
return;
}

if(!validPassword(password)){
showMsg("principalMsg","Password must be 8+ characters with letters, numbers and symbols.");
return;
}

if(password!==confirm){
showMsg("principalMsg","Passwords do not match.");
return;
}

const principals=getData("principals");
const id=generateId("PRI","principals");

const principal={
id,
role:"principal",
college,
name,
mobile,
passwordHash:await hashPassword(password),
hodInviteCode:generateCode("HOD"),
createdAt:new Date().toISOString()
};

principals.push(principal);
saveData("principals",principals);

document.getElementById("successText").innerHTML=`Principal account created successfully.<br><br><b>Your ID: ${id}</b><br>Use your ID or mobile number to login.`;
showScreen("successScreen");
}

function verifyHodCode(){
const code=document.getElementById("hodCode").value.trim().toUpperCase();
const principals=getData("principals");
const principal=principals.find(x=>x.hodInviteCode===code);

if(!principal){
showMsg("hodCodeMsg","Invalid code. Please contact your Principal.");
return;
}

verifiedPrincipal=principal;
document.getElementById("hCollege").value=principal.college;
document.getElementById("hPrincipal").value=principal.name;
showScreen("hodScreen");
}

async function createHod(){
hideMsg("hodMsg");

const name=document.getElementById("hName").value.trim();
const department=document.getElementById("hDepartment").value.trim();
const mobile=document.getElementById("hMobile").value.trim();
const password=document.getElementById("hPassword").value;
const confirm=document.getElementById("hConfirm").value;

if(!name||!department||!mobile||!password||!confirm){
showMsg("hodMsg","Please fill all fields.");
return;
}

if(!validMobile(mobile)){
showMsg("hodMsg","Mobile number must contain exactly 10 digits.");
return;
}

if(mobileAlreadyUsed(mobile)){
showMsg("hodMsg","This mobile number is already registered.");
return;
}

if(!validPassword(password)){
showMsg("hodMsg","Password must be 8+ characters with letters, numbers and symbols.");
return;
}

if(password!==confirm){
showMsg("hodMsg","Passwords do not match.");
return;
}

const hods=getData("hods");
const id=generateId("HOD","hods");

const hod={
id,
role:"hod",
principalId:verifiedPrincipal.id,
college:verifiedPrincipal.college,
principalName:verifiedPrincipal.name,
name,
department,
mobile,
passwordHash:await hashPassword(password),
studentInviteCode:generateCode("STU"),
lecturerInviteCode:generateCode("LEC"),
createdAt:new Date().toISOString()
};

hods.push(hod);
saveData("hods",hods);

document.getElementById("successText").innerHTML=`HOD account created successfully.<br><br><b>Your ID: ${id}</b><br>You can now login.`;
showScreen("successScreen");
}

function verifyStudentCode(){
const code=document.getElementById("studentCode").value.trim().toUpperCase();
const hods=getData("hods");
const hod=hods.find(x=>x.studentInviteCode===code);

if(!hod){
showMsg("studentCodeMsg","Invalid code. Please contact your HOD.");
return;
}

verifiedHod=hod;
document.getElementById("sCollege").value=hod.college;
document.getElementById("sPrincipal").value=hod.principalName;
document.getElementById("sDepartment").value=hod.department;
document.getElementById("sHod").value=hod.name;
showScreen("studentScreen");
}

async function createStudent(){
hideMsg("studentMsg");

const name=document.getElementById("sName").value.trim();
const roll=document.getElementById("sRoll").value.trim();
const mobile=document.getElementById("sMobile").value.trim();
const parent=document.getElementById("sParent").value.trim();
const parentMobile=document.getElementById("sParentMobile").value.trim();
const password=document.getElementById("sPassword").value;
const confirm=document.getElementById("sConfirm").value;

if(!name||!roll||!mobile||!parent||!parentMobile||!password||!confirm){
showMsg("studentMsg","Please fill all fields.");
return;
}

if(!validMobile(mobile)||!validMobile(parentMobile)){
showMsg("studentMsg","Mobile numbers must contain exactly 10 digits.");
return;
}

if(mobileAlreadyUsed(mobile)){
showMsg("studentMsg","This mobile number is already registered.");
return;
}

if(!validPassword(password)){
showMsg("studentMsg","Password must be 8+ characters with letters, numbers and symbols.");
return;
}

if(password!==confirm){
showMsg("studentMsg","Passwords do not match.");
return;
}

const students=getData("students");

if(students.some(x=>x.roll.toLowerCase()===roll.toLowerCase())){
showMsg("studentMsg","This roll number already exists.");
return;
}

const id=generateId("STU","students");

const student={
id,
role:"student",
principalId:verifiedHod.principalId,
hodId:verifiedHod.id,
college:verifiedHod.college,
principalName:verifiedHod.principalName,
department:verifiedHod.department,
hodName:verifiedHod.name,
name,
roll,
mobile,
parentName:parent,
parentMobile,
passwordHash:await hashPassword(password),
attendancePercentage:0,
createdAt:new Date().toISOString()
};

students.push(student);
saveData("students",students);

document.getElementById("successText").innerHTML=`Student account created successfully.<br><br><b>Your Roll No: ${roll}</b><br>Use Roll No or mobile to login.`;
showScreen("successScreen");
}

function verifyLecturerCode(){
const code=document.getElementById("lecturerCode").value.trim().toUpperCase();
const hods=getData("hods");
const hod=hods.find(x=>x.lecturerInviteCode===code);

if(!hod){
showMsg("lecturerCodeMsg","Invalid code. Please contact your HOD.");
return;
}

verifiedHod=hod;
document.getElementById("lCollege").value=hod.college;
document.getElementById("lPrincipal").value=hod.principalName;
document.getElementById("lHod").value=hod.name;
document.getElementById("lDepartment").value=hod.department;

document.getElementById("subjectsContainer").innerHTML="";
addSubject();

showScreen("lecturerScreen");
}

function addSubject(){
const container=document.getElementById("subjectsContainer");
const count=container.children.length+1;

const box=document.createElement("div");
box.className="subject-box";

box.innerHTML=`
<div class="subject-header">
<strong>Subject #${count}</strong>
${count>1?`<button class="remove-subject" onclick="removeSubject(this)"><i class="fa-solid fa-trash"></i></button>`:''}
</div>

<div class="input-group">
<label>Subject Name</label>
<input class="subj-name" placeholder="Example: Mathematics">
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">

<div class="input-group">
<label>Start Time</label>
<input class="subj-start" type="time">
</div>

<div class="input-group">
<label>End Time</label>
<input class="subj-end" type="time">
</div>

</div>

<div class="days-title">Select Week Days</div>

<div class="days">

<label class="day"><input type="checkbox" value="Monday">Mon</label>

<label class="day"><input type="checkbox" value="Tuesday">Tue</label>

<label class="day"><input type="checkbox" value="Wednesday">Wed</label>

<label class="day"><input type="checkbox" value="Thursday">Thu</label>

<label class="day"><input type="checkbox" value="Friday">Fri</label>

<label class="day"><input type="checkbox" value="Saturday">Sat</label>

<label class="day"><input type="checkbox" value="Sunday">Sun</label>

</div>
`;

container.appendChild(box);
bindDaysEvents(box);
}

function removeSubject(btn){
btn.closest(".subject-box").remove();
}

function bindDaysEvents(scope){
scope.querySelectorAll(".day input").forEach(ch=>{
ch.addEventListener("change",function(){
if(this.checked){
this.parentElement.classList.add("active");
}else{
this.parentElement.classList.remove("active");
}
});
});
}

async function createLecturer(){
hideMsg("lecturerMsg");

const name=document.getElementById("lName").value.trim();
const mobile=document.getElementById("lMobile").value.trim();
const password=document.getElementById("lPassword").value;
const confirm=document.getElementById("lConfirm").value;

if(!name||!mobile||!password||!confirm){
showMsg("lecturerMsg","Please fill all fields.");
return;
}

if(!validMobile(mobile)){
showMsg("lecturerMsg","Mobile number must contain exactly 10 digits.");
return;
}

if(mobileAlreadyUsed(mobile)){
showMsg("lecturerMsg","This mobile number is already registered.");
return;
}

const subjectBoxes=document.querySelectorAll("#subjectsContainer .subject-box");

if(!subjectBoxes.length){
showMsg("lecturerMsg","Please add at least one subject.");
return;
}

const subjects=[];

for(let box of subjectBoxes){
const subjName=box.querySelector(".subj-name").value.trim();
const start=box.querySelector(".subj-start").value;
const end=box.querySelector(".subj-end").value;

const days=[];
box.querySelectorAll(".days input:checked").forEach(c=>{
days.push(c.value);
});

if(!subjName||!start||!end||!days.length){
showMsg("lecturerMsg","Please fill all subject details and select days.");
return;
}

subjects.push({
name:subjName,
startTime:start,
endTime:end,
days:days
});
}

if(!validPassword(password)){
showMsg("lecturerMsg","Password must be 8+ characters with letters, numbers and symbols.");
return;
}

if(password!==confirm){
showMsg("lecturerMsg","Passwords do not match.");
return;
}

const lecturers=getData("lecturers");
const id=generateId("LEC","lecturers");

const lecturer={
id,
role:"lecturer",
principalId:verifiedHod.principalId,
hodId:verifiedHod.id,
college:verifiedHod.college,
principalName:verifiedHod.principalName,
department:verifiedHod.department,
hodName:verifiedHod.name,
name,
mobile,
passwordHash:await hashPassword(password),
subjects:subjects,
createdAt:new Date().toISOString()
};

lecturers.push(lecturer);
saveData("lecturers",lecturers);

document.getElementById("successText").innerHTML=`Lecturer account created successfully.<br><br><b>Your ID: ${id}</b><br>Use ID or mobile to login.`;
showScreen("successScreen");
}

async function login(){
hideMsg("loginMsg");

const identity=document.getElementById("loginIdentity").value.trim();
const password=document.getElementById("loginPassword").value;

if(!identity||!password){
showMsg("loginMsg","Please enter login ID and password.");
return;
}

const hash=await hashPassword(password);

const principals=getData("principals");
const hods=getData("hods");
const students=getData("students");
const lecturers=getData("lecturers");

// Collect all credential matches, prefer exact account ID over shared mobile
const candidates=[];
principals.forEach(x=>{ if((x.id===identity||x.mobile===identity)&&x.passwordHash===hash) candidates.push(x); });
hods.forEach(x=>{ if((x.id===identity||x.mobile===identity)&&x.passwordHash===hash) candidates.push(x); });
students.forEach(x=>{ if((x.id===identity||x.roll===identity||x.mobile===identity)&&x.passwordHash===hash) candidates.push(x); });
lecturers.forEach(x=>{ if((x.id===identity||x.mobile===identity)&&x.passwordHash===hash) candidates.push(x); });

let user=candidates.find(x=>x.id===identity) || candidates[0] || null;

if(!user){
showMsg("loginMsg","Invalid credentials.");
return;
}

// Ensure role is always set (old records safety)
if(!user.role){
if(principals.some(p=>p.id===user.id)) user.role="principal";
else if(hods.some(h=>h.id===user.id)) user.role="hod";
else if(students.some(s=>s.id===user.id)) user.role="student";
else if(lecturers.some(l=>l.id===user.id)) user.role="lecturer";
}

currentUser=user;

// Clear other role sessions so pages don't open wrong dashboard
try{
localStorage.removeItem("currentStudentSession");
localStorage.removeItem("currentLecturerSession");
localStorage.removeItem("currentHodSession");
localStorage.removeItem("currentPrincipalSession");
}catch(e){}

if(user.role==="student"){
localStorage.setItem("currentStudentSession",JSON.stringify(user));
}
if(user.role==="lecturer"){
localStorage.setItem("currentLecturerSession",JSON.stringify(user));
}
if(user.role==="hod"){
localStorage.setItem("currentHodSession",JSON.stringify(user));
}
if(user.role==="principal"){
localStorage.setItem("currentPrincipalSession",JSON.stringify(user));
}
openDashboard();
}

function openDashboard(){
hideAll();
document.getElementById("dashboard").classList.remove("hidden");

document.getElementById("dashTitle").innerText="Welcome, "+(currentUser.name||"");
document.getElementById("dashSubtitle").innerText="Role: "+String(currentUser.role||"").toUpperCase();

// Hide all role dashboards + drill pages first (prevent mixed UI)
document.getElementById("principalDash").classList.add("hidden");
document.getElementById("hodDash").classList.add("hidden");
document.getElementById("studentDash").classList.add("hidden");
document.getElementById("lecturerDash").classList.add("hidden");
if(typeof hideAllPrincipalDrillPages==="function") hideAllPrincipalDrillPages();
if(typeof hideAllHodDrillPages==="function") hideAllHodDrillPages();
if(typeof hideAllLecDrillPages==="function") hideAllLecDrillPages();
document.getElementById("mainDashboard").classList.remove("hidden");
const classesPage=document.getElementById("classesPage");
if(classesPage) classesPage.classList.add("hidden");

const classesBtn=document.getElementById("classesNavButton");
const sidebarClassesBtn=document.getElementById("sidebarClassesBtn");
const studentsBtn=document.getElementById("studentsNavButton");
const sidebarStudentsBtn=document.getElementById("sidebarStudentsBtn");

classesBtn.classList.add("hidden");
sidebarClassesBtn.classList.add("hidden");

if(studentsBtn){ studentsBtn.classList.add("hidden"); studentsBtn.style.display="none"; }
const sidebarTimetableBtn=document.getElementById("sidebarTimetableBtn");
const sidebarNotifyBtn=document.getElementById("sidebarNotifyBtn");
const sidebarAttendanceBtn=document.getElementById("sidebarAttendanceBtn");
const sidebarAddBtn=document.getElementById("sidebarAddBtn");
const sidebarMarksBtn=document.getElementById("sidebarMarksBtn");
if(sidebarMarksBtn) sidebarMarksBtn.classList.add("hidden");
if(currentUser.role==="principal"){
if(sidebarStudentsBtn) sidebarStudentsBtn.classList.remove("hidden");
if(sidebarTimetableBtn) sidebarTimetableBtn.classList.add("hidden");
if(sidebarNotifyBtn) sidebarNotifyBtn.classList.add("hidden");
if(sidebarAttendanceBtn) sidebarAttendanceBtn.classList.add("hidden");
if(sidebarAddBtn) sidebarAddBtn.classList.add("hidden");
}else if(currentUser.role==="hod"){
if(sidebarStudentsBtn) sidebarStudentsBtn.classList.remove("hidden");
if(sidebarTimetableBtn) sidebarTimetableBtn.classList.remove("hidden");
if(sidebarNotifyBtn) sidebarNotifyBtn.classList.remove("hidden");
if(sidebarAttendanceBtn) sidebarAttendanceBtn.classList.add("hidden");
if(sidebarAddBtn) sidebarAddBtn.classList.add("hidden");
}else if(currentUser.role==="student"){
if(sidebarStudentsBtn) sidebarStudentsBtn.classList.add("hidden");
if(sidebarTimetableBtn) sidebarTimetableBtn.classList.remove("hidden");
if(sidebarNotifyBtn) sidebarNotifyBtn.classList.remove("hidden");
if(sidebarAttendanceBtn) sidebarAttendanceBtn.classList.remove("hidden");
if(sidebarAddBtn) sidebarAddBtn.classList.add("hidden");
if(sidebarMarksBtn) sidebarMarksBtn.classList.remove("hidden");
}else if(currentUser.role==="lecturer"){
if(sidebarStudentsBtn) sidebarStudentsBtn.classList.add("hidden");
if(sidebarTimetableBtn) sidebarTimetableBtn.classList.remove("hidden");
if(sidebarNotifyBtn) sidebarNotifyBtn.classList.remove("hidden");
if(sidebarAttendanceBtn) sidebarAttendanceBtn.classList.remove("hidden");
if(sidebarAddBtn) sidebarAddBtn.classList.remove("hidden");
}else{
if(sidebarStudentsBtn) sidebarStudentsBtn.classList.add("hidden");
if(sidebarTimetableBtn) sidebarTimetableBtn.classList.add("hidden");
if(sidebarNotifyBtn) sidebarNotifyBtn.classList.add("hidden");
if(sidebarAttendanceBtn) sidebarAttendanceBtn.classList.add("hidden");
if(sidebarAddBtn) sidebarAddBtn.classList.add("hidden");
}

if(currentUser.role==="principal"){
loadPrincipalDash();
}else if(currentUser.role==="hod"){
loadHodDash();
}else if(currentUser.role==="student"){
loadStudentDash();
}else if(currentUser.role==="lecturer"){
loadLecturerDash();
}
}

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
hideAllPrincipalDrillPages();
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
hideAllHodDrillPages();
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
hideAllStuPages();
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

const map={};
records.forEach(r=>{
const n=r.subjectName||"General";
if(!map[n]) map[n]=[];
map[n].push(r);
});
// also subjects from department lecturers
getData("lecturers").forEach(l=>{
(l.subjects||[]).forEach(s=>{
if(!s||!s.name) return;
const ok=!s.department||s.department===currentUser.department||l.department===currentUser.department;
if(ok && !map[s.name]) map[s.name]=[];
});
});
const grid=document.getElementById("stuSubjectsGrid");
grid.innerHTML="";
const names=Object.keys(map);
if(!names.length){ grid.innerHTML=`<div class="today-empty">No subjects yet.</div>`; return; }
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
const marks=getData("marksRecords").filter(m=>m.studentId===currentUser.id);
const bySub={};
marks.forEach(m=>{ const n=m.subject||"General"; if(!bySub[n]) bySub[n]=[]; bySub[n].push(m); });
const names=Object.keys(bySub);
if(!names.length){ list.innerHTML=`<div class="today-empty">No marks added yet.</div>`; return; }
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
const marks=getData("marksRecords").filter(m=>m.studentId===currentUser.id && m.subject===subjectName);
if(!marks.length){ list.innerHTML=`<div class="today-empty">No marks for this subject.</div>`; return; }
list.innerHTML="";
marks.forEach(m=>{
const max=Number(m.maxMarks||0);
const obt=Number(m.marksObtained||0);
const pct=max?Math.round((obt/max)*100):0;
list.innerHTML+=`<div class="group"><div><strong>${m.examType||"Exam"}</strong><br><small style="color:#94a3b8">Marks: ${obt} / ${max}</small></div><span class="badge ${pct>=40?"good":"low"}">${pct}%</span></div>`;
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

let lecDrillState = { subjectName: null, category: null, studentId: null, marksSubject: null, groupDept: null, verifiedHod: null };
let lecActiveSession = null;

function lecPageIds(){
return ["lecturerDash","lecGroupsPage","lecGroupSubjectsPage","lecSubjectCatsPage","lecCategoryStudentsPage","lecStudentHistoryPage","lecMarksGroupsPage","lecMarksSubjectsPage","lecMarksCatsPage","lecMarksStudentsPage","lecAttendancePage","lecSessionStartPage","lecManualAttendancePage","lecAddMarksPage","lecAddSubjectPage","lecNotificationsPage","lecTimetablePage"];
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
hideAllLecDrillPages();
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

function openLecCategoryStudents(category){
lecDrillState.category=category;
hideAllLecDrillPages();
document.getElementById("lecCategoryStudentsPage").classList.remove("hidden");
const titleMap={high:"Above 75%",mid:"50% – 74%",low:"Below 49%"};
document.getElementById("lecCategoryStudentsTitle").innerText=`${lecDrillState.subjectName} – ${titleMap[category]}`;
const students=lecDeptStudents().filter(st=>{
const pct=lecStudentSubjectPct(st.id,lecDrillState.subjectName);
if(category==="high") return pct>=75;
if(category==="mid") return pct>=50 && pct<75;
return pct<50;
});
const list=document.getElementById("lecCategoryStudentsList");
if(!students.length){ list.innerHTML=`<div class="today-empty">No students in this category.</div>`; return; }
list.innerHTML=`<div class="principal-box-grid"></div>`;
const grid=list.querySelector(".principal-box-grid");
students.forEach(st=>{
const pct=lecStudentSubjectPct(st.id,lecDrillState.subjectName);
let badgeClass=pct>=75?"good":(pct>=50?"medium":"low");
grid.innerHTML+=`<div class="principal-box" onclick="openLecStudentHistory('${st.id}')"><div><h4>${st.name}</h4><p>Roll: ${st.roll||"—"}</p><p>Mobile: ${st.mobile||"—"}</p></div><div class="box-footer"><span class="badge ${badgeClass}">${pct}%</span></div></div>`;
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
