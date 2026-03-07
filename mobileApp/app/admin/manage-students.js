import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  TextInput, StatusBar, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Alert, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import XLSX from "xlsx";
import API from "../../services/api";

const { height, width } = Dimensions.get("window");

// ── Constants ──────────────────────────────────────────────────
const COLLEGE_DEPARTMENTS = {
  "Nims Institute of Engineering and Technology": [
    "Computer Science Engineering (CSE)",
    "Information Technology (IT)",
    "Electronics and Communication Engineering (ECE)",
    "Electrical Engineering (EE)",
    "Mechanical Engineering (ME)",
    "Civil Engineering",
    "Chemical Engineering",
    "Artificial Intelligence & Machine Learning",
    "Data Science Engineering",
  ],
  "Nims College of Management Studies": ["Business Administration", "Finance", "Marketing", "Human Resource"],
  "Nims College of Nursing": ["B.Sc Nursing", "GNM", "Post Basic Nursing"],
  "Nims College of Pharmacy": ["B.Pharm", "D.Pharm", "M.Pharm"],
  "Nims College of Law": ["LLB", "BA LLB", "LLM"],
  "Nims College of Dental": ["BDS", "MDS"],
};

const COLLEGES = Object.keys(COLLEGE_DEPARTMENTS);
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const GENDERS = ["Male", "Female", "Other"];

const COLLEGE_SHORT = {
  "Nims Institute of Engineering and Technology": "NIET",
  "Nims College of Management Studies": "NCMS",
  "Nims College of Nursing": "NCN",
  "Nims College of Pharmacy": "NCP",
  "Nims College of Law": "NCL",
  "Nims College of Dental": "NCD",
};

const COLLEGE_COLORS = {
  NIET: "#00c6ff", NCMS: "#34d399", NCN: "#f87171",
  NCP: "#a78bfa", NCL: "#f59e0b", NCD: "#fb923c",
};
const COLLEGE_ICONS = {
  NIET: "hardware-chip-outline", NCMS: "briefcase-outline",
  NCN: "medical-outline", NCP: "flask-outline",
  NCL: "library-outline", NCD: "medkit-outline",
};

const DEPT_COLORS = [
  "#00c6ff", "#34d399", "#f59e0b", "#a78bfa",
  "#f87171", "#fb923c", "#60a5fa", "#e879f9", "#4ade80",
];

const ALL_DEPARTMENTS = Object.values(COLLEGE_DEPARTMENTS).flat();

const EMPTY_FORM = {
  name: "", email: "", phone: "",
  admissionYear: "", college: "", department: "",
  semester: "", gender: "", password: "",
};

// ── Helpers ─────────────────────────────────────────────────────
const getDeptShort = (dept = "") => {
  if (!dept) return "";
  return dept.match(/\(([^)]+)\)/)?.[1] || dept.split(" ").filter(w => w.length > 2)[0]?.toUpperCase() || "DEPT";
};

const getAutoSemester = (admissionYear) => {
  if (!admissionYear) return "";
  const diff = new Date().getFullYear() - parseInt(admissionYear);
  const isOdd = new Date().getMonth() + 1 >= 7;
  let sem = diff * 2 + (isOdd ? 1 : 2);
  if (sem < 1) sem = 1;
  if (sem > 8) sem = 8;
  return String(sem);
};

// ── Breadcrumb ───────────────────────────────────────────────────
const Breadcrumb = ({ college, department, year, onPress }) => (
  <View style={styles.breadcrumb}>
    <Pressable onPress={() => onPress("colleges")}>
      <Text style={[styles.bcText, !college && styles.bcActive]}>All</Text>
    </Pressable>
    {college && <>
      <Ionicons name="chevron-forward" size={10} color="#374151" />
      <Pressable onPress={() => onPress("departments")}>
        <Text style={[styles.bcText, college && !department && styles.bcActive]}>
          {COLLEGE_SHORT[college] || college.split(" ")[0]}
        </Text>
      </Pressable>
    </>}
    {department && <>
      <Ionicons name="chevron-forward" size={10} color="#374151" />
      <Pressable onPress={() => onPress("years")}>
        <Text style={[styles.bcText, department && !year && styles.bcActive]}>
          {getDeptShort(department)}
        </Text>
      </Pressable>
    </>}
    {year && <>
      <Ionicons name="chevron-forward" size={10} color="#374151" />
      <Text style={[styles.bcText, styles.bcActive]}>{year}</Text>
    </>}
  </View>
);

// ── College Card ─────────────────────────────────────────────────
const CollegeCard = ({ name, count, onPress }) => {
  const short = COLLEGE_SHORT[name] || "COL";
  const color = COLLEGE_COLORS[short] || "#64748b";
  const icon = COLLEGE_ICONS[short] || "business-outline";
  return (
    <Pressable onPress={onPress} style={styles.collegeCard}>
      <LinearGradient
        colors={[color + "20", color + "06"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.collegeGrad}>
        <View style={[styles.collegeIcon, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.collegeInfo}>
          <Text style={[styles.collegeShort, { color }]}>{short}</Text>
          <Text style={styles.collegeName} numberOfLines={2}>{name}</Text>
        </View>
        <View style={styles.collegeRight}>
          <Text style={[styles.collegeCount, { color }]}>{count}</Text>
          <Text style={styles.collegeCountLabel}>students</Text>
          <Ionicons name="chevron-forward" size={14} color={color} style={{ marginTop: 2 }} />
        </View>
      </LinearGradient>
    </Pressable>
  );
};

// ── Department Card ───────────────────────────────────────────────
const DeptCard = ({ name, count, colorIdx, onPress }) => {
  const color = DEPT_COLORS[colorIdx % DEPT_COLORS.length];
  const short = getDeptShort(name);
  const full = name.split("(")[0].trim();
  return (
    <Pressable style={[styles.deptCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={[styles.deptShortBox, { backgroundColor: color + "18" }]}>
        <Text style={[styles.deptShort, { color }]}>{short}</Text>
      </View>
      <View style={styles.deptInfo}>
        <Text style={styles.deptName} numberOfLines={1}>{full}</Text>
        <Text style={[styles.deptCount, { color }]}>{count} enrolled</Text>
      </View>
      <View style={[styles.deptArrow, { backgroundColor: color + "18" }]}>
        <Ionicons name="arrow-forward" size={14} color={color} />
      </View>
    </Pressable>
  );
};

// ── Year / Batch Card ─────────────────────────────────────────────
const YearCard = ({ year, count, dept, color, currentSem, autoSem, onPress, onUpdateSem }) => {
  const short = getDeptShort(dept);
  const isSame = String(currentSem) === String(autoSem);
  return (
    <Pressable style={[styles.yearCard, { borderLeftColor: color }]} onPress={onPress}>
      <LinearGradient
        colors={[color + "1a", color + "08"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.yearGrad}>
        {/* Year circle */}
        <View style={[styles.yearCircle, { backgroundColor: color + "22", borderColor: color + "44" }]}>
          <Text style={[styles.yearNum, { color }]}>{year}</Text>
          <Text style={[styles.yearShort, { color: color + "bb" }]}>{short}</Text>
        </View>

        {/* Info */}
        <View style={styles.yearInfo}>
          <Text style={styles.yearTitle}>{short} Batch {year}</Text>
          <Text style={styles.yearCount}>{count} students</Text>
          <View style={styles.yearSemRow}>
            <View style={[styles.semPill, { backgroundColor: color + "20" }]}>
              <Ionicons name="layers-outline" size={9} color={color} />
              <Text style={[styles.semPillText, { color }]}>Sem {currentSem || "?"}</Text>
            </View>
            {!isSame && (
              <View style={styles.suggestPill}>
                <Ionicons name="bulb-outline" size={9} color="#34d399" />
                <Text style={styles.suggestPillText}>→ Sem {autoSem}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sem update button */}
        <Pressable
          style={[styles.semUpdateBtn, { borderColor: color + "55", backgroundColor: color + "12" }]}
          onPress={e => { e.stopPropagation?.(); onUpdateSem(); }}>
          <Ionicons name="sync-outline" size={15} color={color} />
          <Text style={[styles.semUpdateText, { color }]}>Sem</Text>
        </Pressable>

        <Ionicons name="chevron-forward" size={16} color={color + "88"} style={{ marginLeft: 4 }} />
      </LinearGradient>
    </Pressable>
  );
};

// ── Student Card ──────────────────────────────────────────────────
const StudentCard = ({ item, color, onEdit, onDelete }) => {
  const initials = item.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  return (
    <View style={[styles.studentCard, { borderLeftColor: color }]}>
      <View style={[styles.studentAvatar, { backgroundColor: color + "20" }]}>
        <Text style={[styles.studentInitials, { color }]}>{initials}</Text>
      </View>
      <View style={styles.studentBody}>
        <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.studentIdRow}>
          <Ionicons name="card-outline" size={11} color="#64748b" />
          <Text style={styles.studentId}>{item.studentId || "—"}</Text>
        </View>
        <View style={styles.studentChips}>
          <View style={[styles.semChip, { backgroundColor: color + "20" }]}>
            <Text style={[styles.semChipText, { color }]}>Sem {item.semester || "?"}</Text>
          </View>
          {item.gender && (
            <View style={styles.genderChip}>
              <Ionicons
                name={item.gender === "Female" ? "female-outline" : item.gender === "Male" ? "male-outline" : "person-outline"}
                size={10} color="#64748b" />
            </View>
          )}
          {item.phone && (
            <Text style={styles.phoneText} numberOfLines={1}>{item.phone}</Text>
          )}
        </View>
        <Text style={styles.studentEmail} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={styles.studentActions}>
        <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={13} color="#f59e0b" />
        </Pressable>
        <Pressable style={styles.delBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash" size={13} color="#f87171" />
        </Pressable>
      </View>
    </View>
  );
};

// ── Form Field ────────────────────────────────────────────────────
const Field = ({ label, icon, value, onChangeText, keyboardType, secureTextEntry, maxLength, editable = true, accent = "#00c6ff", hint }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.fieldRow, value && { borderColor: accent + "44" }, !editable && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={15} color={value ? accent : "#64748b"} style={{ marginRight: 8 }} />
      <TextInput style={styles.fieldInput} value={value} onChangeText={onChangeText}
        placeholderTextColor="#374151" placeholder={hint || label}
        keyboardType={keyboardType || "default"} secureTextEntry={secureTextEntry}
        autoCapitalize="none" maxLength={maxLength} editable={editable} />
    </View>
  </View>
);

// ── Picker ────────────────────────────────────────────────────────
const PickerField = ({ label, icon, value, options, onSelect, accent = "#00c6ff" }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={[styles.fieldRow, value && { borderColor: accent + "44" }]} onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={15} color={value ? accent : "#64748b"} style={{ marginRight: 8 }} />
        <Text style={[styles.fieldInput, { color: value ? "#fff" : "#374151", paddingVertical: 14 }]} numberOfLines={1}>
          {value || `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={13} color="#374151" />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.handle} />
            <Text style={styles.pickerTitle}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <Pressable key={opt}
                  style={[styles.pickerRow, value === opt && { backgroundColor: accent + "18", borderColor: accent + "40", borderWidth: 1 }]}
                  onPress={() => { onSelect(opt); setOpen(false); }}>
                  <Text style={[styles.pickerRowText, value === opt && { color: accent }]} numberOfLines={2}>{opt}</Text>
                  {value === opt && <Ionicons name="checkmark-circle" size={16} color={accent} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════
export default function ManageStudents() {
  const router = useRouter();

  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Navigation state
  const [view, setView] = useState("colleges");
  const [selCollege, setSelCollege] = useState(null);
  const [selDept, setSelDept] = useState(null);
  const [selYear, setSelYear] = useState(null);
  const [search, setSearch] = useState("");

  // Form state
  const [formModal, setFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Batch semester update
  const [batchModal, setBatchModal] = useState(false);
  const [batchInfo, setBatchInfo] = useState(null);
  const [batchTarget, setBatchTarget] = useState(null);
  const [updatingSem, setUpdatingSem] = useState(false);

  // Excel import
  const [importModal, setImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState({ total: 0, done: 0, errors: [] });
  const [importing, setImporting] = useState(false);

  useFocusEffect(useCallback(() => { loadStudents(); }, []));

  const loadStudents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await API.get("/students/all");
      setAllStudents(res.data?.students || res.data || []);
    } catch { Alert.alert("Error", "Could not load students"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  // ── Excel Import ──────────────────────────────────────────────
  const pickAndImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel", "text/csv", "*/*"],
        copyToCacheDirectory: true,
      });
      if (res.type !== "success") return;

      setImporting(true);
      setImportStatus({ total: 0, done: 0, errors: [] });
      setImportModal(true);

      const b64 = await FileSystem.readAsStringAsync(res.uri, { encoding: "base64" });
      const wb = XLSX.read(b64, { type: "base64" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

      if (!rows.length) {
        setImporting(false);
        return Alert.alert("Empty file", "No rows found");
      }

      // Normalize header keys
      const normalized = rows.map(r => {
        const obj = {};
        Object.keys(r).forEach(k => { obj[k.trim().toLowerCase()] = r[k]; });
        return obj;
      });

      // Map to student payload
      const mapped = normalized.map((r, i) => ({
        __row: i + 2,
        name: String(r.name || r["student name"] || r["full name"] || "").trim(),
        email: String(r.email || r["e-mail"] || "").trim(),
        phone: String(r.phone || r.mobile || r.contact || r["phone number"] || "").trim(),
        password: String(r.password || r.pass || "") || "changeme123",
        college: String(r.college || "").trim(),
        department: String(r.department || r.dept || "").trim(),
        admissionYear: String(r["admission year"] || r["admissionyear"] || r.year || "").trim(),
        semester: String(r.semester || r.sem || "").trim(),
        gender: String(r.gender || "").trim(),
      }));

      // Validate
      const valid = [], errors = [];
      mapped.forEach(m => {
        const miss = [];
        if (!m.name) miss.push("name");
        if (!m.email) miss.push("email");
        if (!m.college) miss.push("college");
        if (!m.department) miss.push("department");
        if (!m.admissionYear) miss.push("admissionYear");
        if (miss.length) errors.push({ row: m.__row, error: `Missing: ${miss.join(", ")}` });
        else valid.push(m);
      });

      if (!valid.length) {
        setImporting(false);
        return Alert.alert("No valid rows", `${errors.length} errors found`);
      }

      Alert.alert(
        "Confirm Import",
        `✅ Valid: ${valid.length}\n❌ Invalid: ${errors.length}\n\nImport karo?`,
        [
          { text: "Cancel", onPress: () => { setImporting(false); setImportModal(false); } },
          { text: "Import", onPress: () => runImport(valid, errors) },
        ]
      );
    } catch (e) {
      setImporting(false);
      setImportModal(false);
      Alert.alert("Error", "Could not read file");
    }
  };

  const runImport = async (validRows, initialErrors) => {
    const errors = [...(initialErrors || [])];
    let done = 0;
    setImportStatus({ total: validRows.length, done: 0, errors });
    for (const row of validRows) {
      try {
        await API.post("/admin/add-student", {
          name: row.name,
          email: row.email,
          phone: row.phone,
          password: row.password || "changeme123",
          college: row.college,
          department: row.department,
          admissionYear: row.admissionYear,
          semester: row.semester || "",
          gender: row.gender || "",
        });
        done++;
        setImportStatus(p => ({ ...p, done }));
      } catch (e) {
        errors.push({ row: row.__row, error: e.response?.data?.message || "Failed" });
        setImportStatus(p => ({ ...p, errors: [...errors] }));
      }
    }
    setImporting(false);
    await loadStudents();
    Alert.alert("Done!", `Imported: ${done} / ${validRows.length}\nFailed: ${errors.length}`);
  };

  // ── Data computations ─────────────────────────────────────────
  const collegeData = COLLEGES.map(c => ({
    name: c,
    count: allStudents.filter(s => s.college === c).length,
  }));

  const deptData = selCollege
    ? (COLLEGE_DEPARTMENTS[selCollege] || []).map((d, i) => ({
      name: d, colorIdx: i,
      count: allStudents.filter(s => s.college === selCollege && s.department === d).length,
    })).filter(d => d.count > 0)
    : [];

  const yearData = (selCollege && selDept)
    ? [...new Set(allStudents
      .filter(s => s.college === selCollege && s.department === selDept && s.admissionYear)
      .map(s => s.admissionYear)
    )].sort()
      .map(year => {
        const batch = allStudents.filter(
          s => s.college === selCollege && s.department === selDept && s.admissionYear === year
        );
        return {
          year, count: batch.length,
          currentSem: batch[0]?.semester ? String(batch[0].semester) : getAutoSemester(year),
          autoSem: getAutoSemester(year),
        };
      })
    : [];

  const studentData = (() => {
    let list = allStudents;
    if (selCollege) list = list.filter(s => s.college === selCollege);
    if (selDept) list = list.filter(s => s.department === selDept);
    if (selYear) list = list.filter(s => s.admissionYear === selYear);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      );
    }
    return list;
  })();

  const deptColorIdx = selDept ? (ALL_DEPARTMENTS.indexOf(selDept) % DEPT_COLORS.length) : 0;
  const deptColor = DEPT_COLORS[deptColorIdx];

  // ── Navigation ────────────────────────────────────────────────
  const navTo = (target) => {
    if (target === "colleges") { setSelCollege(null); setSelDept(null); setSelYear(null); }
    if (target === "departments") { setSelDept(null); setSelYear(null); }
    if (target === "years") { setSelYear(null); }
    setView(target); setSearch("");
  };

  const goBack = () => {
    if (view === "students") return navTo("years");
    if (view === "years") return navTo("departments");
    if (view === "departments") return navTo("colleges");
    router.back();
  };

  // ── Batch Semester Update ─────────────────────────────────────
  const openBatchModal = (yearObj) => {
    setBatchInfo(yearObj);
    setBatchTarget(null);
    setBatchModal(true);
  };

  const confirmBatchUpdate = async () => {
    if (!batchTarget) return Alert.alert("", "Semester select karo");
    try {
      setUpdatingSem(true);
      const res = await API.put("/admin/update-batch-semester", {
        college: selCollege,
        department: selDept,
        admissionYear: batchInfo.year,
        newSemester: Number(batchTarget),
      });
      setBatchModal(false);
      await loadStudents();
      Alert.alert("✅ Updated", `${res.data.updatedCount || "All"} students → Sem ${batchTarget}`);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed");
    } finally { setUpdatingSem(false); }
  };

  // ── Add / Edit / Delete ───────────────────────────────────────
  const openAdd = () => {
    setEditingStudent(null);
    setForm({ ...EMPTY_FORM, college: selCollege || "", department: selDept || "", admissionYear: selYear || "" });
    setFormModal(true);
  };

  const openEdit = (s) => {
    setEditingStudent(s);
    setForm({
      name: s.name || "", email: s.email || "", phone: s.phone || "",
      admissionYear: s.admissionYear || "", college: s.college || "",
      department: s.department || "", semester: String(s.semester || ""),
      gender: s.gender || "", password: "",
    });
    setFormModal(true);
  };

  const handleDelete = (s) => {
    Alert.alert("Delete Student", `"${s.name}" ko delete karo?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await API.delete(`/students/${s._id}`);
            setAllStudents(p => p.filter(st => st._id !== s._id));
          } catch (e) { Alert.alert("Error", e.response?.data?.message || "Failed"); }
        }
      },
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("", "Name required");
    if (!form.email.trim()) return Alert.alert("", "Email required");
    if (!form.college) return Alert.alert("", "College required");
    if (!form.department) return Alert.alert("", "Department required");
    if (!form.admissionYear) return Alert.alert("", "Admission Year required");
    if (!editingStudent && !form.password) return Alert.alert("", "Password required");
    try {
      setSaving(true);
      const payload = { ...form };
      if (editingStudent && !payload.password) delete payload.password;

      if (editingStudent) {
        await API.put(`/students/${editingStudent._id}`, payload);
        Alert.alert("✅ Updated", "Student info saved!");
      } else {
        const res = await API.post("/admin/add-student", payload);
        const newId = res.data?.student?.studentId;
        Alert.alert("✅ Student Added!", `Student ID:\n${newId || "Generated automatically"}`);
      }
      setFormModal(false);
      await loadStudents();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not save");
    } finally { setSaving(false); }
  };

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  // ── Preview: what ID will be generated ───────────────────────
  const idPreview = form.admissionYear?.length === 4 && form.department
    ? `${form.admissionYear}-${getDeptShort(form.department)}-???`
    : null;

  // ── Header strings ─────────────────────────────────────────────
  const HEADER = {
    colleges: { title: "Manage Students", sub: `${allStudents.length} total students` },
    departments: { title: COLLEGE_SHORT[selCollege] || selCollege || "College", sub: `${allStudents.filter(s => s.college === selCollege).length} students` },
    years: { title: getDeptShort(selDept) || "Department", sub: `${allStudents.filter(s => s.college === selCollege && s.department === selDept).length} students` },
    students: { title: ((getDeptShort(selDept) || "") + " " + (selYear || "")).trim() || "Students", sub: `${studentData.length} students` },
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* ── Header ── */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={goBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle} numberOfLines={1}>{HEADER[view].title}</Text>
          <Text style={styles.headerSub}>{HEADER[view].sub}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.importBtn} onPress={pickAndImport}>
            <Ionicons name="download-outline" size={18} color="#a78bfa" />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="person-add" size={18} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* ── Breadcrumb ── */}
      <Breadcrumb college={selCollege} department={selDept} year={selYear} onPress={navTo} />

      {/* ── Search (students view) ── */}
      {view === "students" && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color="#64748b" />
          <TextInput style={styles.searchInput}
            placeholder="Name, ID, email ya phone..." placeholderTextColor="#374151"
            value={search} onChangeText={setSearch} />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={14} color="#64748b" />
            </Pressable>
          )}
        </View>
      )}

      {/* ── Updating banner ── */}
      {updatingSem && (
        <View style={styles.updatingBar}>
          <ActivityIndicator size="small" color="#a78bfa" />
          <Text style={styles.updatingText}>Semesters are being updated..</Text>
        </View>
      )}

      {/* ── Main Content ── */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff" /></View>
      ) : (
        <>
          {/* COLLEGES */}
          {view === "colleges" && (
            <FlatList
              data={collegeData} keyExtractor={i => i.name}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStudents(true)} tintColor="#00c6ff" />}
              ListHeaderComponent={() => (
                <View style={styles.statsRow}>
                  {[
                    { label: "Total", val: allStudents.length, color: "#00c6ff" },
                    { label: "Junior", val: allStudents.filter(s => Number(s.semester) <= 4).length, color: "#34d399" },
                    { label: "Senior", val: allStudents.filter(s => Number(s.semester) > 4).length, color: "#f59e0b" },
                    { label: "Coll.", val: COLLEGES.length, color: "#a78bfa" },
                  ].map(s => (
                    <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                      <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              renderItem={({ item }) => (
                <CollegeCard name={item.name} count={item.count}
                  onPress={() => { setSelCollege(item.name); setView("departments"); }} />
              )}
            />
          )}

          {/* DEPARTMENTS */}
          {view === "departments" && (
            <FlatList
              data={deptData} keyExtractor={i => i.name}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}><Ionicons name="school-outline" size={38} color="#374151" /></View>
                  <Text style={styles.emptyTitle}>No Departments</Text>
                  <Text style={styles.emptySub}>There are currently no students in this college.</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <DeptCard name={item.name} count={item.count} colorIdx={item.colorIdx}
                  onPress={() => { setSelDept(item.name); setView("years"); }} />
              )}
            />
          )}

          {/* YEARS */}
          {view === "years" && (
            <FlatList
              data={yearData} keyExtractor={i => i.year}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <View style={[styles.tipBanner, { borderLeftColor: deptColor }]}>
                  <Ionicons name="information-circle-outline" size={14} color={deptColor} />
                  <Text style={[styles.tipText, { color: deptColor }]}>
                    &quot;Update semester of entire batch at once using &quot;Sem&quot; button
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={38} color="#374151" /></View>
                  <Text style={styles.emptyTitle}>No Batches</Text>
                  <Text style={styles.emptySub}>Set admission year for students</Text>
                  <Pressable style={styles.emptyBtn} onPress={openAdd}>
                    <Ionicons name="person-add-outline" size={14} color="#00c6ff" />
                    <Text style={styles.emptyBtnText}>Add Student</Text>
                  </Pressable>
                </View>
              )}
              renderItem={({ item }) => (
                <YearCard year={item.year} count={item.count} dept={selDept}
                  color={deptColor} currentSem={item.currentSem} autoSem={item.autoSem}
                  onPress={() => { setSelYear(item.year); setView("students"); }}
                  onUpdateSem={() => openBatchModal(item)} />
              )}
            />
          )}

          {/* STUDENTS */}
          {view === "students" && (
            <FlatList
              data={studentData} keyExtractor={i => i._id || i.studentId}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStudents(true)} tintColor="#00c6ff" />}
              ListHeaderComponent={() => (
                <View style={[styles.tipBanner, { borderLeftColor: deptColor }]}>
                  <Ionicons name="people" size={13} color={deptColor} />
                  <Text style={[styles.tipText, { color: deptColor }]}>
                    {getDeptShort(selDept)} · Batch {selYear} · {studentData.length} students
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}><Ionicons name="people-outline" size={38} color="#374151" /></View>
                  <Text style={styles.emptyTitle}>No Students</Text>
                  <Pressable style={styles.emptyBtn} onPress={openAdd}>
                    <Ionicons name="person-add-outline" size={14} color="#00c6ff" />
                    <Text style={styles.emptyBtnText}>Add Student</Text>
                  </Pressable>
                </View>
              )}
              renderItem={({ item }) => (
                <StudentCard item={item} color={deptColor}
                  onEdit={openEdit} onDelete={handleDelete} />
              )}
            />
          )}
        </>
      )}

      {/* ══ ADD / EDIT MODAL ══ */}
      <Modal visible={formModal} transparent animationType="slide" onRequestClose={() => setFormModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: editingStudent ? "rgba(245,158,11,0.15)" : "rgba(0,198,255,0.15)" }]}>
                <Ionicons name={editingStudent ? "pencil" : "person-add"} size={17}
                  color={editingStudent ? "#f59e0b" : "#00c6ff"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{editingStudent ? "Edit Student" : "Add New Student"}</Text>
                {editingStudent && <Text style={styles.sheetSub}>{editingStudent.studentId}</Text>}
              </View>
              <Pressable onPress={() => setFormModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}>

              {/* ✅ ID Preview — only for new student */}
              {!editingStudent && idPreview && (
                <View style={styles.idPreview}>
                  <Ionicons name="card" size={14} color="#f59e0b" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.idPreviewLabel}>Auto-generated Student ID</Text>
                    <Text style={styles.idPreviewVal}>{idPreview}</Text>
                  </View>
                  <View style={styles.autoBadge}>
                    <Text style={styles.autoBadgeText}>AUTO</Text>
                  </View>
                </View>
              )}

              <Text style={styles.sectionHead}>👤 BASIC INFO</Text>
              <Field label="Full Name" icon="person-outline" value={form.name} onChangeText={f("name")} accent="#00c6ff" />
              <Field label="Email" icon="mail-outline" value={form.email} onChangeText={f("email")} keyboardType="email-address" accent="#00c6ff" />
              <Field label="Phone" icon="call-outline" value={form.phone} onChangeText={f("phone")} keyboardType="phone-pad" accent="#34d399" />
              <Field label="Admission Year" icon="calendar-outline" value={form.admissionYear} onChangeText={f("admissionYear")} keyboardType="numeric" maxLength={4} hint="e.g. 2023" accent="#f59e0b" />

              <Text style={styles.sectionHead}>🏫 ACADEMIC</Text>
              <PickerField label="College" icon="business-outline" value={form.college}
                options={COLLEGES}
                onSelect={v => { f("college")(v); f("department")(""); }}
                accent="#a78bfa" />
              <PickerField label="Department" icon="school-outline" value={form.department}
                options={form.college ? (COLLEGE_DEPARTMENTS[form.college] || []) : ALL_DEPARTMENTS}
                onSelect={f("department")} accent="#a78bfa" />
              <PickerField label="Semester" icon="layers-outline" value={form.semester}
                options={SEMESTERS} onSelect={f("semester")} accent="#34d399" />
              <PickerField label="Gender" icon="people-outline" value={form.gender}
                options={GENDERS} onSelect={f("gender")} accent="#f87171" />

              <Text style={styles.sectionHead}>{editingStudent ? "🔐 CHANGE PASSWORD" : "🔐 ACCOUNT"}</Text>
              <Field label="Password" icon="lock-closed-outline" value={form.password}
                onChangeText={f("password")} secureTextEntry accent="#f87171" />

              {/* Section label preview */}
              {form.department && form.admissionYear && (
                <View style={styles.sectionPreview}>
                  <Ionicons name="people" size={13} color="#00c6ff" />
                  <Text style={styles.sectionPreviewText}>
                    Section: {getDeptShort(form.department)} {form.admissionYear}
                  </Text>
                </View>
              )}

              <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                <LinearGradient
                  colors={editingStudent ? ["#f59e0b", "#d97706"] : ["#10b981", "#059669"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name={editingStudent ? "save-outline" : "person-add-outline"} size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>{editingStudent ? "Save Changes" : "Add Student"}</Text></>}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ BATCH SEMESTER MODAL ══ */}
      <Modal visible={batchModal} transparent animationType="slide" onRequestClose={() => setBatchModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: height * 0.65 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
                <Ionicons name="sync-outline" size={17} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Update Batch Semester</Text>
                <Text style={styles.sheetSub}>
                  {getDeptShort(selDept)} · Batch {batchInfo?.year} · {batchInfo?.count} students
                </Text>
              </View>
              <Pressable onPress={() => setBatchModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
              {/* Current vs Suggested */}
              <View style={styles.semCompare}>
                <View style={styles.semCompareBox}>
                  <Text style={styles.semCompareLabel}>Current</Text>
                  <Text style={[styles.semCompareVal, { color: "#94a3b8" }]}>Sem {batchInfo?.currentSem || "?"}</Text>
                </View>
                <View style={[styles.semCompareArrow]}>
                  <Ionicons name="arrow-forward" size={20} color="#374151" />
                </View>
                <View style={styles.semCompareBox}>
                  <Text style={styles.semCompareLabel}>Suggested</Text>
                  <Text style={[styles.semCompareVal, { color: "#34d399" }]}>Sem {batchInfo?.autoSem}</Text>
                </View>
              </View>

              <Text style={[styles.sectionHead, { marginTop: 4 }]}>TARGET SEMESTER</Text>
              <View style={styles.semGrid}>
                {SEMESTERS.map(s => {
                  const sel = batchTarget === s;
                  const sug = s === batchInfo?.autoSem;
                  return (
                    <Pressable key={s} style={[styles.semBox, sel && styles.semBoxActive, sug && !sel && styles.semBoxSuggested]}
                      onPress={() => setBatchTarget(s)}>
                      <Text style={[styles.semBoxNum, sel && { color: "#a78bfa" }]}>{s}</Text>
                      <Text style={styles.semBoxLabel}>Sem</Text>
                      {sug && <View style={styles.sugDot} />}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.saveBtn, { marginTop: 16 }, (!batchTarget || updatingSem) && { opacity: 0.5 }]}
                onPress={confirmBatchUpdate} disabled={!batchTarget || updatingSem}>
                <LinearGradient colors={["#7c3aed", "#a78bfa"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
                  {updatingSem ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name="sync-outline" size={16} color="#fff" />
                      <Text style={styles.saveBtnText}>
                        {batchInfo?.count} Students → Sem {batchTarget || "?"}
                      </Text></>}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ IMPORT PROGRESS MODAL ══ */}
      <Modal visible={importModal} transparent animationType="fade" onRequestClose={() => setImportModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { padding: 24, maxHeight: height * 0.65 }]}>
            <View style={styles.handle} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <View style={[styles.sheetIcon, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
                <Ionicons name="cloud-upload-outline" size={17} color="#a78bfa" />
              </View>
              <Text style={styles.sheetTitle}>Excel Import</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: importStatus.total
                  ? `${Math.round(importStatus.done / importStatus.total * 100)}%`
                  : "0%"
              }]} />
            </View>
            <Text style={styles.progressText}>
              {importing ? `${importStatus.done} / ${importStatus.total} imported...` : "Import complete!"}
            </Text>

            {/* Errors */}
            {importStatus.errors.length > 0 && (
              <ScrollView style={styles.errorScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.errorHeading}>⚠️ {importStatus.errors.length} error(s):</Text>
                {importStatus.errors.slice(0, 8).map((e, i) => (
                  <Text key={i} style={styles.errorRow}>Row {e.row}: {e.error}</Text>
                ))}
                {importStatus.errors.length > 8 && (
                  <Text style={styles.errorRow}>...aur {importStatus.errors.length - 8} errors</Text>
                )}
              </ScrollView>
            )}

            {!importing && (
              <Pressable style={[styles.saveBtn, { marginTop: 16 }]} onPress={() => setImportModal(false)}>
                <LinearGradient colors={["#10b981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Done</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, gap: 10 },
  headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerMid: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8 },
  importBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(167,139,250,0.25)" },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,198,255,0.18)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,198,255,0.3)" },

  // Breadcrumb
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", flexWrap: "wrap" },
  bcText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  bcActive: { color: "#00c6ff" },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1a2535", marginHorizontal: 16, marginTop: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },

  // Updating banner
  updatingBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(167,139,250,0.1)", marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10 },
  updatingText: { color: "#a78bfa", fontSize: 12, fontWeight: "600" },

  list: { padding: 16, paddingBottom: 30 },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#1a2535", borderRadius: 14, padding: 12, alignItems: "center", borderTopWidth: 2 },
  statNum: { fontSize: 22, fontWeight: "800", color: "#fff" },
  statLabel: { color: "#64748b", fontSize: 9, fontWeight: "700", marginTop: 2 },

  // College card
  collegeCard: { borderRadius: 16, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  collegeGrad: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  collegeIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  collegeInfo: { flex: 1 },
  collegeShort: { fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  collegeName: { color: "#64748b", fontSize: 11, marginTop: 3, lineHeight: 16 },
  collegeRight: { alignItems: "center", gap: 2 },
  collegeCount: { fontSize: 18, fontWeight: "800" },
  collegeCountLabel: { color: "#374151", fontSize: 10 },

  // Dept card
  deptCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", borderLeftWidth: 3, gap: 12 },
  deptShortBox: { width: 58, height: 58, justifyContent: "center", alignItems: "center" },
  deptShort: { fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  deptInfo: { flex: 1, paddingVertical: 14 },
  deptName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  deptCount: { fontSize: 11, fontWeight: "600", marginTop: 3 },
  deptArrow: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },

  // Year card
  yearCard: { borderRadius: 16, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderLeftWidth: 3 },
  yearGrad: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  yearCircle: { width: 58, height: 58, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 1.5 },
  yearNum: { fontSize: 16, fontWeight: "900" },
  yearShort: { fontSize: 9, fontWeight: "700" },
  yearInfo: { flex: 1 },
  yearTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  yearCount: { color: "#64748b", fontSize: 11, marginTop: 2 },
  yearSemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  semPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  semPillText: { fontSize: 10, fontWeight: "800" },
  suggestPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  suggestPillText: { color: "#34d399", fontSize: 10, fontWeight: "700" },
  semUpdateBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center", gap: 3 },
  semUpdateText: { fontSize: 9, fontWeight: "800" },

  // Student card
  studentCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", borderLeftWidth: 3 },
  studentAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", margin: 12 },
  studentInitials: { fontSize: 16, fontWeight: "800" },
  studentBody: { flex: 1, paddingVertical: 10 },
  studentName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  studentIdRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  studentId: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  studentChips: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  semChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  semChipText: { fontSize: 10, fontWeight: "700" },
  genderChip: { width: 22, height: 22, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  phoneText: { color: "#374151", fontSize: 10 },
  studentEmail: { color: "#374151", fontSize: 11, marginTop: 3 },
  studentActions: { flexDirection: "row", gap: 6, paddingRight: 12 },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.12)", justifyContent: "center", alignItems: "center" },
  delBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(248,113,113,0.12)", justifyContent: "center", alignItems: "center" },

  // Tip banner
  tipBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12, marginBottom: 14, borderLeftWidth: 3 },
  tipText: { flex: 1, fontSize: 12, fontWeight: "600" },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 15, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 12 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,198,255,0.1)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,198,255,0.2)" },
  emptyBtnText: { color: "#00c6ff", fontWeight: "700" },

  // Modal base
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.93, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, paddingBottom: 8 },
  sheetIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sheetTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sheetSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },

  // ID Preview box
  idPreview: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(245,158,11,0.1)", marginHorizontal: 20, marginTop: 12, marginBottom: 4, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  idPreviewLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
  idPreviewVal: { color: "#f59e0b", fontSize: 16, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
  autoBadge: { backgroundColor: "rgba(245,158,11,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  autoBadgeText: { color: "#f59e0b", fontSize: 9, fontWeight: "800", letterSpacing: 1 },

  sectionHead: { color: "#374151", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginHorizontal: 20, marginTop: 16, marginBottom: 8 },
  sectionPreview: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 8, backgroundColor: "rgba(0,198,255,0.08)", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,198,255,0.2)" },
  sectionPreviewText: { color: "#00c6ff", fontSize: 13, fontWeight: "600" },

  // Form fields
  fieldWrap: { marginHorizontal: 20, marginBottom: 10 },
  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "600", marginBottom: 6 },
  fieldRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", minHeight: 50 },
  fieldInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 14 },

  // Picker
  pickerSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  pickerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  pickerRowText: { color: "#94a3b8", fontSize: 13, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },

  // Batch modal
  semCompare: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, marginTop: 12, marginBottom: 4 },
  semCompareBox: { alignItems: "center" },
  semCompareLabel: { color: "#374151", fontSize: 10, fontWeight: "700" },
  semCompareVal: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 },
  semCompareArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", justifyContent: "center", alignItems: "center" },
  semGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  semBox: { width: (width - 72) / 4, aspectRatio: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)" },
  semBoxActive: { backgroundColor: "rgba(167,139,250,0.2)", borderColor: "#a78bfa" },
  semBoxSuggested: { borderColor: "rgba(52,211,153,0.45)" },
  semBoxNum: { color: "#fff", fontSize: 20, fontWeight: "800" },
  semBoxLabel: { color: "#374151", fontSize: 9, marginTop: 1 },
  sugDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399", position: "absolute", top: 8, right: 8 },

  // Save button
  saveBtn: { marginHorizontal: 20, borderRadius: 14, overflow: "hidden" },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Import modal
  progressTrack: { height: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: 10, backgroundColor: "#a78bfa", borderRadius: 6 },
  progressText: { color: "#94a3b8", fontSize: 12, marginBottom: 10, fontWeight: "600" },
  errorScroll: { maxHeight: 140, marginBottom: 8 },
  errorHeading: { color: "#f87171", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  errorRow: { color: "#f87171", fontSize: 11, marginBottom: 4, opacity: 0.8 },
});