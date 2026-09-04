/**
 * Pro Assist – ChatGPT-style replies, fully on-device
 * App data NEVER leaves the browser. No external AI APIs.
 * Privacy: no names, mobiles, emails, or personal records in answers.
 */
(function (global) {
  "use strict";

  var PRIVACY_REPLY =
    "I cannot access or share any personal information of users. I only discuss aggregated academic stats and general guidance.";

  var role = null;
  var history = [];

  var privacyPatterns = [
    /\b(mobile|phone|whatsapp|email|e-?mail|address|password|aadhaar|aadhar|pan\b|otp)\b/i,
    /\b(who is|whose|find student|find lecturer|contact number|call him|call her|show (me )?names)\b/i,
    /\b(personal (info|data|details)|private data|share .*number|list of (students|lecturers|hods))\b/i,
    /\b(student name|lecturer name|parent (name|mobile)|roll list|give me .* name)\b/i
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

  function sanitizeOut(text) {
    var t = String(text || "");
    t = t.replace(/\b\d{10}\b/g, "[hidden]");
    t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[hidden]");
    return t;
  }

  function setRole(r) {
    role = r ? String(r).toLowerCase() : null;
  }

  function getRole() {
    return role;
  }

  function greet() {
    var r = (role || "user").toUpperCase();
    return (
      "Hi — I am Pro Assist.\n\n" +
      "I answer in a natural, ChatGPT-style way, but everything runs only inside this app. Your college data stays on this device and is never uploaded.\n\n" +
      "Signed in as: " +
      r +
      ".\nAsk about attendance, marks, timetable, department/college trends, studies, or how to use Student Pro."
    );
  }

  function has(t, arr) {
    for (var i = 0; i < arr.length; i++) {
      if (t.indexOf(arr[i]) !== -1) return true;
    }
    return false;
  }

  function generalReply(q, ctx) {
    var t = q.toLowerCase().trim();
    var follow = history.length > 2 ? "\n\nYou can also ask a follow-up anytime." : "";

    if (/^(hi|hello|hey|hii+|namaste|good (morning|evening|afternoon))\b/.test(t)) {
      return (
        "Hello! How can I help you today?\n" +
        "Examples: \"What is my attendance?\", \"Study tips for exams\", \"How do year groups work?\", \"College attendance overview\"."
      );
    }
    if (/how are you|ela unnav|em chestunnav/.test(t)) {
      return "I am doing well and ready to help. What would you like to know?";
    }
    if (/thank|thanks|dhanyavad|thnx/.test(t)) {
      return "Glad it helped. Feel free to ask anything else.";
    }
    if (/who are you|what are you|nee peru|your name|what is pro assist/.test(t)) {
      return (
        "I am Pro Assist — a built-in assistant for Student Pro. I respond in a natural conversational style, similar to ChatGPT, but I process everything locally in your browser.\n" +
        "I never send student lists, phone numbers, or account data outside the app."
      );
    }
    if (/are you chatgpt|openai|gemini|claude|internet|online api/.test(t)) {
      return (
        "I am not ChatGPT connected to the cloud. I aim for a similar clear, helpful style, while keeping all app data strictly on your device — nothing is sent to external AI services."
      );
    }

    if (has(t, ["how to login", "login ela", "how to use", "app ela", "student pro", "help using"])) {
      return (
        "Here is a simple way to use Student Pro:\n\n" +
        "1) Login with your ID / roll / mobile and password.\n" +
        "2) Students: check Home for attendance %, Marks, Attendance sessions, and Timetable.\n" +
        "3) Lecturers: Add Subject (with Year 1–4), take attendance, enter marks.\n" +
        "4) HOD: year boxes appear when students join with a year tag; open year → subjects → categories.\n" +
        "5) Principal: groups and college-level analysis.\n\n" +
        "If you tell me your role, I can give more specific steps."
      );
    }
    if (has(t, ["invite code", "hod code", "lecturer code", "student code"])) {
      return (
        "Invite codes connect the hierarchy without sharing personal contacts through me:\n" +
        "• Principal → HOD invite code\n" +
        "• HOD → Student invite code and Lecturer invite code\n" +
        "• Lecturer uses the HOD lecturer code when adding a subject\n\n" +
        "I will not reveal any code values or personal details from accounts."
      );
    }
    if (has(t, ["year tag", "year box", "1st year", "2nd year", "year group", "semester"])) {
      return (
        "Year works like this:\n" +
        "• Students choose Year (1–4) while creating an account.\n" +
        "• On HOD home, a year box is created only when that department has students with that year tag.\n" +
        "• Lecturers must attach the same year when adding a subject so filters stay strict.\n" +
        "• Analysis path: Year → Subjects → Categories (75+ / 50–74 / below 49) → Students → subject history."
      );
    }

    if (has(t, ["75%", "minimum attendance", "detain", "attendance rule", "shortage"])) {
      return (
        "Most colleges treat about 75% as the safe attendance line. Below that you may face exam or internal restrictions.\n\n" +
        "Practical advice: track subject-wise %, avoid long continuous absences, and clear doubts with your class teacher early."
      );
    }
    if (has(t, ["improve attendance", "attendance pencha", "increase attendance"])) {
      return (
        "To raise attendance:\n" +
        "• Attend every scheduled period you can\n" +
        "• Mark present only in valid live sessions (time + radius rules in the app)\n" +
        "• Review weekly subject percentages\n" +
        "• If you were present but marked absent, raise it through the proper college process (I cannot change records myself)"
      );
    }
    if (has(t, ["study tip", "how to study", "exam tip", "prepare for exam", "revision"])) {
      return (
        "A simple plan that works well:\n\n" +
        "1) List subjects from weakest to strongest.\n" +
        "2) Study the weakest first in short 40–50 minute blocks.\n" +
        "3) After each block, write 5 recall points without looking.\n" +
        "4) Practice previous questions under time limits.\n" +
        "5) Sleep enough the night before exams — memory consolidates during sleep.\n\n" +
        "If you share which subject feels hardest (subject name only), I can suggest a tighter plan."
      );
    }
    if (has(t, ["cgpa", "gpa", "grade point", "percentage formula"])) {
      return (
        "Percentage is straightforward: (obtained ÷ maximum) × 100.\n\n" +
        "CGPA is usually the average of grade points across subjects/credits. Exact grade tables differ by university, so use your regulation handbook for conversion. In Student Pro, marks screens already show per-exam percentage when max marks are set."
      );
    }
    if (has(t, ["internal", "external", "semester exam", "mid exam"])) {
      return (
        "Internals are continuous assessments (mids, assignments, labs). Externals are end-term exams.\n" +
        "Lecturers enter scores through the marks flow; students see subject-wise results under Marks — without exposing other students scores to you."
      );
    }
    if (has(t, ["time management", "stress", "motivation", "focus"])) {
      return (
        "Try this: pick 3 priorities for today, work in focused blocks, take short breaks, and stop doom-scrolling during study time.\n" +
        "If stress is high, talk to a mentor or counsellor — that is stronger support than any chatbot. I am here for academic structure and app guidance."
      );
    }

    if (/what is photosynthesis/.test(t)) {
      return "Photosynthesis is how green plants make food: they use sunlight, water, and carbon dioxide to produce glucose and release oxygen. It is the base of most food chains.";
    }
    if (/what is gravity/.test(t)) {
      return "Gravity is the attractive force between masses. Earth gravity keeps us on the ground and governs orbits of the Moon and satellites.";
    }
    if (/what is (an )?algorithm/.test(t)) {
      return "An algorithm is a clear sequence of steps to solve a problem — like a recipe for computation. Good algorithms are correct, efficient, and understandable.";
    }
    if (/what is (a )?computer/.test(t)) {
      return "A computer processes input data with hardware and software to produce useful output. Student Pro itself is a web app running in your browser.";
    }
    if (/what is democracy/.test(t)) {
      return "Democracy is governance by the people, usually through free elections, rule of law, and protected rights.";
    }

    if (ctx && ctx.lastTopic === "attendance") {
      if (has(t, ["why", "how", "detail", "more", "explain"])) {
        return (
          "Attendance percentage is calculated from stored session records for your account only: present (and late) divided by total recorded sessions, times 100.\n" +
          "Other students individual records are never shown through this chat."
        );
      }
    }

    return (
      "I hear you. I will answer as clearly as I can inside Student Pro.\n\n" +
      "I am strongest on:\n" +
      "• Your role academic stats (aggregated, no personal data leaks)\n" +
      "• How the app works (years, subjects, attendance, marks)\n" +
      "• Study planning, attendance rules, and exam basics\n\n" +
      "Try a direct ask, for example:\n" +
      "\"Show my attendance summary\"\n" +
      "\"Department year strength\"\n" +
      "\"How do I add a subject with year?\"\n" +
      "\"Give me a 7-day study plan\"\n\n" +
      "I will not reveal anyone name, mobile, email, or private account data." +
      follow
    );
  }

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

    if (has(lower, ["attendance", "present", "absent", "percentage", "attendence", "nundi"])) {
      var tip =
        pct >= 75
          ? "You are in a safer zone — keep consistency."
          : pct >= 50
          ? "You are in a risk band. Prioritise upcoming classes."
          : "This is critical. Focus on attending every remaining session.";
      return (
        "Here is your attendance summary (only your account, no personal fields shared):\n\n" +
        "• Sessions recorded: " +
        records.length +
        "\n• Present / Late: " +
        present +
        "\n• Percentage: " +
        pct +
        "%\n\n" +
        tip
      );
    }
    if (has(lower, ["mark", "marks", "exam", "score", "internal", "result"])) {
      var marks = user && user.id ? marksForStudent(user.id) : [];
      if (!marks.length) {
        return "I do not see marks on your account yet. Once a lecturer posts marks, open the Marks section — I will summarize percentages here without exposing other students.";
      }
      var lines = [];
      marks.forEach(function (m) {
        var max = Number(m.maxMarks || 0);
        var obt = Number(m.marksObtained || 0);
        var p = max ? Math.round((obt / max) * 100) : 0;
        lines.push((m.subject || "Subject") + " · " + (m.examType || "Exam") + ": " + obt + "/" + max + " (" + p + "%)");
      });
      return "Your marks overview:\n\n• " + lines.join("\n• ");
    }
    if (has(lower, ["timetable", "time table", "schedule", "class time", "period"])) {
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
              " · " +
              ((s.days || []).join(", ") || "Days N/A") +
              " · " +
              (s.startTime || "?") +
              "–" +
              (s.endTime || "?")
          );
        });
      });
      if (!items.length) {
        return "No timetable rows matched your department/year yet. After lecturers add subjects with the correct year, they will show up here.";
      }
      return "Timetable for your department/year (subject slots only):\n\n• " + items.slice(0, 15).join("\n• ");
    }
    return null;
  }

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

    if (has(lower, ["attendance", "summary", "class strength", "how many student"])) {
      return (
        "Class attendance snapshot (aggregates only — no names or numbers):\n\n" +
        "• Students in scope: " +
        students.length +
        "\n• Average attendance: " +
        avg +
        "%\n• Below 75%: " +
        low +
        " students"
      );
    }
    if (has(lower, ["low attendance", "alert", "risk", "defaulter", "below 75"])) {
      return (
        "Low-attendance alert: " +
        low +
        " students are under 75%. I will not list identities. Use your dashboard categories if you need structured follow-up."
      );
    }
    if (has(lower, ["mark", "marks entry", "add marks", "exam entry"])) {
      return (
        "Marks entry checklist:\n" +
        "1) Open the marks flow for your group\n" +
        "2) Choose subject and exam type\n" +
        "3) Set max marks\n" +
        "4) Enter scores (values above max should be rejected)\n\n" +
        "I can explain steps, but I will not dump student personal data into chat."
      );
    }
    if (has(lower, ["timetable", "my subjects", "schedule", "add subject"])) {
      var subs = (user && user.subjects) || [];
      if (!subs.length) {
        return "You do not have subjects yet. Use Add → verify HOD lecturer invite code → subject name → Year 1–4 → days & timings. Year tagging keeps HOD filters accurate.";
      }
      var lines = subs.map(function (s) {
        return (
          (s.name || "Subject") +
          " · Year " +
          (s.year || "—") +
          " · " +
          ((s.days || []).join(", ") || "—") +
          " · " +
          (s.startTime || "?") +
          "–" +
          (s.endTime || "?")
        );
      });
      return "Your subjects:\n\n• " + lines.join("\n• ");
    }
    return null;
  }

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

    if (has(lower, ["attendance", "overview", "department", "strength", "year"])) {
      return (
        "Department overview (counts only):\n\n" +
        "• Total students: " +
        students.length +
        "\n• Average attendance: " +
        avg +
        "%\n• Year strength — 1st: " +
        byYear[1] +
        ", 2nd: " +
        byYear[2] +
        ", 3rd: " +
        byYear[3] +
        ", 4th: " +
        byYear[4] +
        "\n\nYear boxes on home appear when students exist with that year tag."
      );
    }
    if (has(lower, ["mark", "performance", "result"])) {
      var marks = safeGet("marksRecords");
      var deptMarks = marks.filter(function (m) {
        return students.some(function (s) {
          return s.id === m.studentId;
        });
      });
      return (
        "There are " +
        deptMarks.length +
        " marks entries linked to your department students. For analysis use: Year box → Subject → Categories. Chat will not list personal rows."
      );
    }
    if (has(lower, ["timetable", "subject", "schedule"])) {
      var dept = (user && user.department) || "";
      var items = [];
      safeGet("lecturers").forEach(function (l) {
        (l.subjects || []).forEach(function (s) {
          var d = s.department || l.department || "";
          if (dept && d && d !== dept) return;
          items.push((s.name || "Subject") + " · Year " + (s.year || "—") + " · " + ((s.days || []).join(", ") || "—"));
        });
      });
      if (!items.length) return "No subjects found for this department yet.";
      return "Department subjects (no staff personal data):\n\n• " + items.slice(0, 15).join("\n• ");
    }
    return null;
  }

  function principalReply(q, user) {
    var lower = q.toLowerCase();
    var students = safeGet("students").filter(function (s) {
      return s.principalId === (user && user.id);
    });
    var hods = safeGet("hods").filter(function (h) {
      return h.principalId === (user && user.id);
    });
    var avg = avgAttendance(students);

    if (has(lower, ["overview", "college", "summary", "trend", "total"])) {
      return (
        "College overview:\n\n" +
        "• Departments: " +
        hods.length +
        "\n• Students: " +
        students.length +
        "\n• Overall average attendance: " +
        avg +
        "%\n\nAll figures are aggregates — no personal records."
      );
    }
    if (has(lower, ["department", "compare", "comparison", "hod"])) {
      if (!hods.length) return "No departments are registered yet.";
      var lines = hods.map(function (h) {
        var ds = students.filter(function (s) {
          return s.hodId === h.id;
        });
        return (h.department || "Department") + ": strength " + ds.length + ", avg " + avgAttendance(ds) + "%";
      });
      return "Department comparison (department labels + counts only):\n\n• " + lines.join("\n• ");
    }
    if (has(lower, ["attendance", "academic", "band"])) {
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
      return "Attendance bands (counts only):\n• ≥75%: " + high + "\n• 50–74%: " + mid + "\n• <50%: " + low;
    }
    return null;
  }

  function lastTopicFromHistory() {
    for (var i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "user") {
        var t = String(history[i].text || "").toLowerCase();
        if (has(t, ["attendance", "present", "absent"])) return "attendance";
        if (has(t, ["mark", "exam", "score"])) return "marks";
        if (has(t, ["timetable", "schedule"])) return "timetable";
      }
    }
    return null;
  }

  function reply(message, currentUser) {
    var text = String(message || "").trim();
    if (!text) return "Go ahead — type your question and I will answer.";

    if (isPrivacyQuery(text)) {
      history.push({ role: "user", text: text });
      history.push({ role: "bot", text: PRIVACY_REPLY });
      return PRIVACY_REPLY;
    }

    if (!role && currentUser && currentUser.role) setRole(currentUser.role);

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

    if (!answer) {
      answer = generalReply(text, { lastTopic: lastTopicFromHistory() });
    }

    answer = sanitizeOut(answer);

    history.push({ role: "user", text: text });
    history.push({ role: "bot", text: answer });
    if (history.length > 50) history = history.slice(-50);
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
