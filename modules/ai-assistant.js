/**
 * Pro Assist – offline role-based academic assistant
 * No external APIs. Pure JavaScript. Privacy-first.
 */
(function (global) {
  "use strict";

  var PRIVACY_REPLY =
    "I cannot access or share any personal information of users.";

  var role = null;
  var history = [];

  var privacyPatterns = [
    /\b(mobile|phone|email|e-mail|address|password|aadhaar|aadhar|pan card|parent mobile)\b/i,
    /\b(who is|find student|find lecturer|contact number|call him|call her)\b/i,
    /\b(personal (info|data|details)|private data|share .*number)\b/i,
    /\b(list of names|show names|student name|lecturer name|give me name)\b/i
  ];

  function safeGet(key) {
    try {
      if (typeof getData === "function") return getData(key) || [];
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function avgAttendance(students) {
    if (!students || !students.length) return 0;
    var sum = 0;
    students.forEach(function (s) {
      sum += Number(s.attendancePercentage || 0);
    });
    return Math.round(sum / students.length);
  }

  function recordsForStudent(studentId) {
    return safeGet("attendanceRecords").filter(function (r) {
      return r.studentId === studentId;
    });
  }

  function marksForStudent(studentId) {
    return safeGet("marksRecords").filter(function (m) {
      return m.studentId === studentId;
    });
  }

  function isPrivacyQuery(text) {
    for (var i = 0; i < privacyPatterns.length; i++) {
      if (privacyPatterns[i].test(text)) return true;
    }
    return false;
  }

  function setRole(r) {
    role = r ? String(r).toLowerCase() : null;
  }

  function getRole() {
    return role;
  }

  function greet() {
    var r = role || "user";
    return (
      "Hi! I am Pro Assist (offline). Role: " +
      r.toUpperCase() +
      ".\nI can help with attendance, marks, timetable, department/college stats, and general academic questions.\nI never share personal data of any user."
    );
  }

  function matchAny(text, words) {
    for (var i = 0; i < words.length; i++) {
      if (text.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  /* -------- General academic / common offline answers -------- */
  function generalReply(q) {
    var t = q.toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|namaste|hii+|good (morning|evening|afternoon))\b/.test(t)) {
      return "Hello! Ask me anything about attendance, marks, timetable, studying, or how to use Student Pro.";
    }
    if (/how are you|enti|em chestunnav/.test(t)) {
      return "I am Pro Assist, ready to help with your academic and app questions.";
    }
    if (/thank|thanks|dhanyavad/.test(t)) {
      return "You are welcome. Ask anytime.";
    }
    if (/who are you|what are you|nee peru|your name/.test(t)) {
      return "I am Pro Assist — an offline helper inside Student Pro. I do not use internet AI APIs.";
    }

    // App help
    if (/how to (login|use)|login ela|app ela|student pro/.test(t)) {
      return "Student Pro tips:\n• Login with your ID / roll / mobile + password\n• Students: Home shows attendance %, subjects, marks, timetable\n• Lecturers: Add subject with year, take attendance, add marks\n• HOD: Year groups appear when students join with a year tag\n• Principal: Groups and college-level analysis";
    }
    if (/invite code|hod code|lecturer code|student code/.test(t)) {
      return "Invite codes: Principal shares HOD code → HOD creates account. HOD shares student code and lecturer code. Lecturer uses HOD lecturer code when adding subjects.";
    }
    if (/year tag|semester|1st year|2nd year|year box/.test(t)) {
      return "Year (1–4) is set when a student creates an account. HOD home shows year boxes only when students of that year exist. Subjects added by lecturers must also select the same year.";
    }

    // Study / academics
    if (/75%|minimum attendance|attendance rule|detain/.test(t)) {
      return "Most colleges expect around 75% attendance. Below that you may face restrictions for exams. Track weekly and avoid continuous absents.";
    }
    if (/how to improve attendance|attendance penchali|attendance increase/.test(t)) {
      return "To improve attendance: attend all scheduled classes, mark present only in live sessions within radius/time, check subject-wise % weekly, and clear any absences with your lecturer if policy allows.";
    }
    if (/study tip|how to study|exam tip|prepare/.test(t)) {
      return "Study tips: 1) Plan daily slots 2) Revise weak subjects first 3) Practice previous questions 4) Sleep well before exams 5) Keep notes short for last-minute revision.";
    }
    if (/cgpa|gpa|grade|percentage formula/.test(t)) {
      return "Simple percentage = (marks obtained ÷ max marks) × 100. CGPA systems vary by university (often grade points averaged). Check your college regulation book for exact conversion.";
    }
    if (/internal|external|semester exam/.test(t)) {
      return "Internals are continuous assessments (tests, assignments). Externals are end exams. Lecturers enter internal marks in Student Pro via Add Marks.";
    }
    if (/time management|stress|motivation/.test(t)) {
      return "Time management: fixed study hours, short breaks, one goal per day. For stress: sleep, short walks, talk to mentors. Small consistent effort beats last-minute panic.";
    }

    // Tech / offline
    if (/internet|online|openai|chatgpt|gemini|api/.test(t)) {
      return "Pro Assist works fully offline inside this app. It does not call OpenAI, Gemini, or any external AI API.";
    }
    if (/what can you do|help me|capabilities|features/.test(t)) {
      return "I can:\n• Explain your attendance/marks/timetable (role-based app data)\n• Give department/college summary stats without personal names\n• Answer general academic and Student Pro how-to questions\n• Refuse any request for personal data of users";
    }

    // Simple math / education helpers
    if (/what is (photosynthesis|gravity|democracy|computer|algorithm)/.test(t)) {
      if (/photosynthesis/.test(t))
        return "Photosynthesis: plants convert light, water, and CO₂ into food (glucose) and release oxygen.";
      if (/gravity/.test(t))
        return "Gravity is the force that attracts objects with mass toward each other — e.g. Earth pulling us downward.";
      if (/democracy/.test(t))
        return "Democracy is a system where people choose their leaders through elections and have rights protected by law.";
      if (/computer/.test(t))
        return "A computer is an electronic device that processes data using hardware and software to produce information.";
      if (/algorithm/.test(t))
        return "An algorithm is a step-by-step procedure to solve a problem or perform a task.";
    }

    // Language mix support
    if (/attendance enti|marks enti|timetable enti|sare|ok|okay/.test(t)) {
      if (/attendance/.test(t))
        return "Attendance means how many classes you were present for, shown as a percentage in the app.";
      if (/marks/.test(t))
        return "Marks are scores entered by lecturers for exams. You can view subject-wise marks under Marks.";
      if (/timetable/.test(t))
        return "Timetable shows subject timings and days for your department/year.";
      return "Okay. Ask your next question about attendance, marks, timetable, or studies.";
    }

    // Fallback – still useful, not a dead end
    return (
      "I understood your question in offline mode.\n" +
      "I can answer: attendance, marks, timetable, year groups, invite codes, study tips, exam basics, and how to use Student Pro.\n" +
      "Try asking more clearly, for example:\n" +
      "• \"my attendance\"\n• \"department attendance overview\"\n• \"how to add marks\"\n• \"study tips\"\n• \"what is CGPA\"\n" +
      "I cannot share personal details of any user."
    );
  }

  /* ---------- Student ---------- */
  function studentReply(q, user) {
    var lower = q.toLowerCase();
    var records = user && user.id ? recordsForStudent(user.id) : [];
    var present = records.filter(function (r) {
      return r.status === "Present" || r.status === "Late";
    }).length;
    var pct =
      records.length > 0
        ? Math.round((present / records.length) * 100)
        : Number((user && user.attendancePercentage) || 0);

    if (matchAny(lower, ["attendance", "present", "absent", "percentage", "attendence", "attandance", "nundi"])) {
      return (
        "Your attendance (stats only): Working days " +
        records.length +
        ", Present/Late " +
        present +
        ", Percentage " +
        pct +
        "%. Target: keep 75% or above."
      );
    }
    if (matchAny(lower, ["mark", "marks", "exam", "score", "internal", "result"])) {
      var marks = user && user.id ? marksForStudent(user.id) : [];
      if (!marks.length) {
        return "No marks found on your account yet. After your lecturer enters marks, open Marks in the sidebar to view them.";
      }
      var lines = [];
      marks.forEach(function (m) {
        var max = Number(m.maxMarks || 0);
        var obt = Number(m.marksObtained || 0);
        var p = max ? Math.round((obt / max) * 100) : 0;
        lines.push(
          (m.subject || "Subject") +
            " – " +
            (m.examType || "Exam") +
            ": " +
            obt +
            "/" +
            max +
            " (" +
            p +
            "%)"
        );
      });
      return "Your marks:\n• " + lines.join("\n• ");
    }
    if (matchAny(lower, ["timetable", "time table", "schedule", "class time", "period"])) {
      var dept = (user && user.department) || "";
      var yr = user && (user.year || user.semester);
      var items = [];
      safeGet("lecturers").forEach(function (l) {
        (l.subjects || []).forEach(function (s) {
          var d = s.department || l.department || "";
          if (dept && d && d !== dept) return;
          if (yr && s.year && String(s.year) !== String(yr)) return;
          items.push(
            (s.name || "Subject") +
              " | " +
              ((s.days || []).join(", ") || "Days N/A") +
              " | " +
              (s.startTime || s.start || "?") +
              "–" +
              (s.endTime || s.end || "?")
          );
        });
      });
      if (!items.length) return "No timetable found for your department/year yet.";
      return "Your timetable:\n• " + items.slice(0, 15).join("\n• ");
    }
    return null; // fall through to general
  }

  /* ---------- Lecturer ---------- */
  function lecturerReply(q, user) {
    var lower = q.toLowerCase();
    var dept = (user && user.department) || "";
    var students = safeGet("students").filter(function (s) {
      return !dept || s.department === dept || s.hodId === (user && user.hodId);
    });
    var avg = avgAttendance(students);
    var low = students.filter(function (s) {
      return Number(s.attendancePercentage || 0) < 75;
    }).length;

    if (matchAny(lower, ["attendance", "summary", "class strength", "how many student"])) {
      return (
        "Class attendance summary: Students in scope " +
        students.length +
        ", average attendance " +
        avg +
        "%, below 75%: " +
        low +
        " (counts only, no names)."
      );
    }
    if (matchAny(lower, ["low attendance", "alert", "risk", "defaulter", "below 75"])) {
      return "Low attendance alert: " + low + " students are below 75% (count only). Encourage regular classes.";
    }
    if (matchAny(lower, ["mark", "marks entry", "add marks", "exam entry"])) {
      return "Marks entry: Sidebar → related marks flow → select group → subject → exam type → max marks → enter scores. Marks above max are not accepted.";
    }
    if (matchAny(lower, ["timetable", "my subjects", "schedule", "add subject"])) {
      var subs = (user && user.subjects) || [];
      if (!subs.length) {
        return "No subjects yet. Use Add → verify HOD lecturer code → enter subject, year (1–4), days and timings.";
      }
      var lines = subs.map(function (s) {
        return (
          (s.name || "Subject") +
          " | Year " +
          (s.year || "—") +
          " | " +
          ((s.days || []).join(", ") || "—") +
          " | " +
          (s.startTime || "?") +
          "–" +
          (s.endTime || "?")
        );
      });
      return "Your subjects/timetable:\n• " + lines.join("\n• ");
    }
    return null;
  }

  /* ---------- HOD ---------- */
  function hodReply(q, user) {
    var lower = q.toLowerCase();
    var students = safeGet("students").filter(function (s) {
      return s.hodId === (user && user.id);
    });
    var avg = avgAttendance(students);
    var byYear = { 1: 0, 2: 0, 3: 0, 4: 0 };
    students.forEach(function (s) {
      var y = String(s.year || s.semester || "");
      if (byYear[y] !== undefined) byYear[y]++;
    });

    if (matchAny(lower, ["attendance", "overview", "department", "strength", "year"])) {
      return (
        "Department overview: Total students " +
        students.length +
        ", avg attendance " +
        avg +
        "%. Year strength — 1st: " +
        byYear[1] +
        ", 2nd: " +
        byYear[2] +
        ", 3rd: " +
        byYear[3] +
        ", 4th: " +
        byYear[4] +
        ". Year boxes appear on home when students join with that year tag."
      );
    }
    if (matchAny(lower, ["mark", "performance", "result"])) {
      var marks = safeGet("marksRecords");
      var deptMarks = marks.filter(function (m) {
        return students.some(function (s) {
          return s.id === m.studentId;
        });
      });
      return "Department marks entries: " + deptMarks.length + ". Open a year box → subject → categories for analysis.";
    }
    if (matchAny(lower, ["timetable", "subject", "schedule"])) {
      var dept = (user && user.department) || "";
      var items = [];
      safeGet("lecturers").forEach(function (l) {
        (l.subjects || []).forEach(function (s) {
          var d = s.department || l.department || "";
          if (dept && d && d !== dept) return;
          items.push((s.name || "Subject") + " | Year " + (s.year || "—") + " | " + ((s.days || []).join(", ") || "—"));
        });
      });
      if (!items.length) return "No subjects found for this department yet.";
      return "Department subjects:\n• " + items.slice(0, 15).join("\n• ");
    }
    return null;
  }

  /* ---------- Principal ---------- */
  function principalReply(q, user) {
    var lower = q.toLowerCase();
    var students = safeGet("students").filter(function (s) {
      return s.principalId === (user && user.id);
    });
    var hods = safeGet("hods").filter(function (h) {
      return h.principalId === (user && user.id);
    });
    var avg = avgAttendance(students);

    if (matchAny(lower, ["overview", "college", "summary", "trend", "total"])) {
      return (
        "College overview: Departments " +
        hods.length +
        ", students " +
        students.length +
        ", overall avg attendance " +
        avg +
        "%."
      );
    }
    if (matchAny(lower, ["department", "compare", "comparison", "hod"])) {
      if (!hods.length) return "No departments registered yet.";
      var lines = hods.map(function (h) {
        var ds = students.filter(function (s) {
          return s.hodId === h.id;
        });
        return (h.department || "Dept") + ": strength " + ds.length + ", avg " + avgAttendance(ds) + "%";
      });
      return "Department comparison:\n• " + lines.join("\n• ");
    }
    if (matchAny(lower, ["attendance", "academic", "band"])) {
      var high = students.filter(function (s) {
        return Number(s.attendancePercentage || 0) >= 75;
      }).length;
      var mid = students.filter(function (s) {
        var p = Number(s.attendancePercentage || 0);
        return p >= 50 && p < 75;
      }).length;
      var low = students.filter(function (s) {
        return Number(s.attendancePercentage || 0) < 50;
      }).length;
      return "Attendance bands: ≥75%: " + high + ", 50–74%: " + mid + ", <50%: " + low + " (counts only).";
    }
    return null;
  }

  function reply(message, currentUser) {
    var text = String(message || "").trim();
    if (!text) return "Please type a question.";

    if (isPrivacyQuery(text)) {
      history.push({ role: "user", text: text });
      history.push({ role: "bot", text: PRIVACY_REPLY });
      return PRIVACY_REPLY;
    }

    if (!role && currentUser && currentUser.role) {
      setRole(currentUser.role);
    }

    var answer = null;
    switch (role) {
      case "student":
        answer = studentReply(text, currentUser);
        break;
      case "lecturer":
        answer = lecturerReply(text, currentUser);
        break;
      case "hod":
        answer = hodReply(text, currentUser);
        break;
      case "principal":
        answer = principalReply(text, currentUser);
        break;
      default:
        answer = null;
    }

    // Always try general offline knowledge if role had no specific match
    if (!answer) {
      answer = generalReply(text);
    }

    history.push({ role: "user", text: text });
    history.push({ role: "bot", text: answer });
    if (history.length > 40) history = history.slice(-40);
    return answer;
  }

  function getHistory() {
    return history.slice();
  }

  function clearHistory() {
    history = [];
  }

  global.ProAssist = {
    setRole: setRole,
    getRole: getRole,
    reply: reply,
    greet: greet,
    getHistory: getHistory,
    clearHistory: clearHistory,
    PRIVACY_REPLY: PRIVACY_REPLY
  };
})(typeof window !== "undefined" ? window : globalThis);
