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
    /\b(mobile|phone|number|email|address|password|aadhaar|aadhar|pan|parent)\b/i,
    /\b(who is|whose|find student|find lecturer|contact|call)\b/i,
    /\b(personal (info|data|details)|private)\b/i,
    /\b(name of|list of names|show names|student name|lecturer name)\b/i
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
    history = [];
  }

  function getRole() {
    return role;
  }

  function greet() {
    var r = role || "user";
    return (
      "Hi, I am Pro Assist. You are signed in as " +
      r.toUpperCase() +
      ". Ask me about attendance, marks, timetable, or academic guidance. I never share personal data."
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

    if (/attendance|present|absent|percentage/.test(lower)) {
      return (
        "Your attendance summary (anonymous stats only): Working days recorded: " +
        records.length +
        ", Present/Late: " +
        present +
        ", Percentage: " +
        pct +
        "%. Aim for 75%+ to stay safe for exams."
      );
    }
    if (/mark|exam|score|internal/.test(lower)) {
      var marks = user && user.id ? marksForStudent(user.id) : [];
      if (!marks.length) {
        return "No marks records found for your account yet. When your lecturer adds marks, they will appear here as totals only.";
      }
      var lines = [];
      var bySub = {};
      marks.forEach(function (m) {
        var s = m.subject || "Subject";
        if (!bySub[s]) bySub[s] = [];
        bySub[s].push(m);
      });
      Object.keys(bySub).forEach(function (s) {
        bySub[s].forEach(function (m) {
          var max = Number(m.maxMarks || 0);
          var obt = Number(m.marksObtained || 0);
          var p = max ? Math.round((obt / max) * 100) : 0;
          lines.push(s + " (" + (m.examType || "Exam") + "): " + obt + "/" + max + " = " + p + "%");
        });
      });
      return "Your marks overview:\n• " + lines.join("\n• ");
    }
    if (/timetable|schedule|class|period/.test(lower)) {
      var dept = (user && user.department) || "";
      var items = [];
      safeGet("lecturers").forEach(function (l) {
        (l.subjects || []).forEach(function (s) {
          var d = s.department || l.department || "";
          if (dept && d && d !== dept) return;
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
      if (!items.length) {
        return "No timetable entries found for your department yet.";
      }
      return "Department timetable (subjects & slots only):\n• " + items.slice(0, 12).join("\n• ");
    }
    if (/help|guide|tip|study|improve/.test(lower)) {
      return "Academic tips: Track attendance weekly, prepare internals early, revise low-score subjects first, and keep above 75% attendance.";
    }
    return (
      "As a student I can help with your attendance %, marks overview, department timetable, and study tips. Ask something like “my attendance” or “timetable”."
    );
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

    if (/attendance|summary|class/.test(lower)) {
      return (
        "Class attendance summary (no personal data): Students in scope: " +
        students.length +
        ", Average attendance: " +
        avg +
        "%, Below 75%: " +
        low +
        " students."
      );
    }
    if (/low|alert|risk|defaulter/.test(lower)) {
      return (
        "Low attendance alert: " +
        low +
        " students are below 75% (counts only, no names). Consider a short attendance drive."
      );
    }
    if (/mark|entry|exam/.test(lower)) {
      return "Marks entry guidance: Open Add Marks → select group/year → subject → exam type → max marks → enter scores. Values above max marks are rejected.";
    }
    if (/timetable|schedule/.test(lower)) {
      var subs = (user && user.subjects) || [];
      if (!subs.length) return "You have no subjects scheduled yet. Use Add Subject with year tag.";
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
      return "Your timetable:\n• " + lines.join("\n• ");
    }
    return "As a lecturer I can help with attendance summary, low-attendance counts, marks entry steps, and your timetable.";
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

    if (/attendance|overview|department/.test(lower)) {
      return (
        "Department attendance overview: Strength " +
        students.length +
        ", Avg attendance " +
        avg +
        "%. Year strength — 1st: " +
        byYear[1] +
        ", 2nd: " +
        byYear[2] +
        ", 3rd: " +
        byYear[3] +
        ", 4th: " +
        byYear[4] +
        "."
      );
    }
    if (/mark|performance|result/.test(lower)) {
      var marks = safeGet("marksRecords");
      var deptMarks = marks.filter(function (m) {
        return students.some(function (s) {
          return s.id === m.studentId;
        });
      });
      return (
        "Department marks records count: " +
        deptMarks.length +
        ". Use year groups and subject categories on the dashboard for deeper analysis (no personal lists here)."
      );
    }
    if (/timetable|schedule/.test(lower)) {
      var dept = (user && user.department) || "";
      var items = [];
      safeGet("lecturers").forEach(function (l) {
        (l.subjects || []).forEach(function (s) {
          var d = s.department || l.department || "";
          if (dept && d && d !== dept) return;
          if (s.hodId && user && s.hodId !== user.id && d !== dept) return;
          items.push(
            (s.name || "Subject") +
              " | Year " +
              (s.year || "—") +
              " | " +
              ((s.days || []).join(", ") || "—")
          );
        });
      });
      if (!items.length) return "No department timetable subjects found yet.";
      return "Department subjects (no staff personal data):\n• " + items.slice(0, 15).join("\n• ");
    }
    return "As HOD I can help with department attendance overview, year strength counts, marks record counts, and department subject timetable.";
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

    if (/overview|college|summary|trend/.test(lower)) {
      return (
        "College overview: Departments/HODs " +
        hods.length +
        ", Students " +
        students.length +
        ", Overall avg attendance " +
        avg +
        "%."
      );
    }
    if (/department|compare|comparison|hod/.test(lower)) {
      if (!hods.length) return "No departments registered yet.";
      var lines = hods.map(function (h) {
        var ds = students.filter(function (s) {
          return s.hodId === h.id;
        });
        return (h.department || "Dept") + ": strength " + ds.length + ", avg " + avgAttendance(ds) + "%";
      });
      return "Department comparison (names of departments only):\n• " + lines.join("\n• ");
    }
    if (/attendance|academic/.test(lower)) {
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
      return (
        "College attendance bands: ≥75%: " +
        high +
        ", 50–74%: " +
        mid +
        ", <50%: " +
        low +
        " (counts only)."
      );
    }
    return "As Principal I can help with college overview, department comparison (department names + counts only), and attendance band trends.";
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

    var answer;
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
        answer =
          "Please log in so Pro Assist can use your role. I support Student, Lecturer, HOD, and Principal.";
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
