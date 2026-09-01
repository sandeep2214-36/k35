
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

function hideAllRoleContent(){
// Hard reset so HOD/Lecturer/Student/Principal pages never mix
const ids=[
"principalDash","principalGroupsPage","principalHodsPage","principalGroupSubjectsPage","principalSubjectCatsPage","principalCategoryStudentsPage","principalStudentHistoryPage","principalStudentsSearchPage",
"hodDash","hodSubjectCatsPage","hodCategoryStudentsPage","hodStudentHistoryPage","hodStudentsSearchPage","hodTimetablePage","hodNotificationsPage",
"studentDash","stuSubjectHistoryPage","stuMarksPage","stuMarksDetailPage","stuAttendancePage","stuSessionSubmitPage","stuTimetablePage","stuNotificationsPage",
"lecturerDash","lecGroupsPage","lecGroupSubjectsPage","lecSubjectCatsPage","lecCategoryStudentsPage","lecStudentHistoryPage","lecMarksGroupsPage","lecMarksSubjectsPage","lecMarksCatsPage","lecMarksStudentsPage","lecAttendancePage","lecSessionStartPage","lecManualAttendancePage","lecAddMarksPage","lecAddSubjectPage","lecNotificationsPage","lecTimetablePage",
"classesPage"
];
ids.forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
if(typeof hideAllPrincipalDrillPages==="function") hideAllPrincipalDrillPages();
if(typeof hideAllHodDrillPages==="function") hideAllHodDrillPages();
if(typeof hideAllLecDrillPages==="function") hideAllLecDrillPages();
if(typeof hideAllStuPages==="function") hideAllStuPages();
}

function openDashboard(){
hideAll();
document.getElementById("dashboard").classList.remove("hidden");

document.getElementById("dashTitle").innerText="Welcome, "+(currentUser.name||"");
document.getElementById("dashSubtitle").innerText="Role: "+String(currentUser.role||"").toUpperCase();

hideAllRoleContent();
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

