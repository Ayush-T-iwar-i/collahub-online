import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, TextInput, ScrollView,
  Alert, Modal, StatusBar, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");

const COLLEGE_DEPARTMENTS = {
  "NIMS Institute of Engineering and Technology": ["Computer Science Engineering (CSE)", "Information Technology (IT)", "Electronics and Communication Engineering (ECE)", "Electrical Engineering (EE)", "Mechanical Engineering (ME)", "Civil Engineering", "Chemical Engineering", "Artificial Intelligence & Machine Learning", "Data Science Engineering"],
  "NIMS College of Management Studies": ["BBA", "MBA", "Finance", "Marketing", "Human Resource", "International Business"],
  "NIMS School of Commerce": ["B.Com", "M.Com", "Accounting", "Business Economics"],
  "NIMS College of Law": ["LLB", "BA LLB", "BBA LLB", "LLM"],
  "NIMS College of Nursing": ["B.Sc Nursing", "GNM", "Post Basic Nursing", "M.Sc Nursing"],
  "NIMS College of Pharmacy": ["D.Pharm", "B.Pharm", "M.Pharm", "Pharm.D"],
  "Nims Institute of Engineering and Technology": ["Computer Science Engineering (CSE)", "Information Technology (IT)", "Electronics and Communication Engineering (ECE)", "Electrical Engineering (EE)", "Mechanical Engineering (ME)", "Civil Engineering", "Chemical Engineering", "Artificial Intelligence & Machine Learning", "Data Science Engineering"],
  "Nims College of Management Studies": ["BBA", "MBA", "Finance", "Marketing", "Human Resource"],
  "Nims College of Nursing": ["B.Sc Nursing", "GNM", "Post Basic Nursing"],
  "Nims College of Pharmacy": ["D.Pharm", "B.Pharm", "M.Pharm"],
  "Nims College of Law": ["LLB", "BA LLB", "LLM"],
  "Nims College of Dental": ["BDS", "MDS"],
};

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ["A", "B", "C", "D"];
const SUB_SECTIONS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "D1", "D2"];
const YEARS = ["All", "2021", "2022", "2023", "2024", "2025", "2026"];

const REQUIRED_FIELDS = ["name", "email", "admissionYear", "department"];
const FIELD_ALIASES = {
  name: ["name", "student name", "full name", "student_name", "fullname"],
  email: ["email", "e-mail", "email address", "emailid", "email_id"],
  phone: ["phone", "mobile", "contact", "phone number", "mobile number"],
  admissionYear: ["admission year", "admissionyear", "year", "batch", "joining year"],
  department: ["department", "dept", "branch", "stream", "course"],
  semester: ["semester", "sem", "current semester"],
  gender: ["gender", "sex"],
  password: ["password", "pass", "pwd"],
  section: ["section", "sec", "division"],
};

const normalizeRow = (rawRow) => {
  const lower = {};
  Object.keys(rawRow).forEach(k => { lower[k.trim().toLowerCase()] = String(rawRow[k] ?? "").trim(); });
  const result = {};
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    for (const alias of aliases) {
      if (lower[alias] !== undefined && lower[alias] !== "") { result[field] = lower[alias]; break; }
    }
    if (!result[field]) result[field] = "";
  });
  return result;
};

const getMissingFields = (row) => REQUIRED_FIELDS.filter(f => !row[f] || row[f].trim() === "");

export default function ManageStudents() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [adminCollege, setAdminCollege] = useState("");
  const [collegeDepts, setCollegeDepts] = useState([]);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [yearFilter, setYearFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [semFilter, setSemFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Batch modals
  const [batchModal, setBatchModal] = useState(false);
  const [batchType, setBatchType] = useState("semester");
  const [batchYear, setBatchYear] = useState("2023");
  const [batchDept, setBatchDept] = useState("All");
  const [batchSection, setBatchSection] = useState("A");
  const [batchSubSection, setBatchSubSection] = useState("");
  const [batchSemester, setBatchSemester] = useState(1);
  const [batchLoading, setBatchLoading] = useState(false);

  // Add student modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", phone: "", admissionYear: "", department: "", gender: "", section: "" });
  const [addLoading, setAddLoading] = useState(false);

  // Excel import
  const [importModal, setImportModal] = useState(false);
  const [importStage, setImportStage] = useState("preview");
  const [validRows, setValidRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [importDone, setImportDone] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importFailed, setImportFailed] = useState([]);

  const loadCollegeInfo = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("adminData");
      if (raw) {
        const d = JSON.parse(raw);
        const college = d.college || d.user?.college || "";
        setAdminCollege(college);
        setCollegeDepts(COLLEGE_DEPARTMENTS[college] || []);
        return college;
      }
    } catch { }
    return "";
  }, []);

  useEffect(() => { loadCollegeInfo(); }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      await loadCollegeInfo();
      loadStudents();
    })();
  }, [yearFilter, deptFilter, semFilter]));

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (yearFilter !== "All") params.admissionYear = yearFilter;
      if (deptFilter !== "All") params.department = deptFilter;
      if (semFilter !== "All") params.semester = semFilter;
      const res = await API.get("/admin/students", { params });
      setStudents(res.data?.students || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to load students.");
    } finally { setLoading(false); }
  };

  const handleDelete = (s) => {
    Alert.alert("Remove Student", `Remove "${s.name}" from the college?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try {
            await API.delete(`/admin/students/${s._id}`);
            setStudents(p => p.filter(x => x._id !== s._id));
          } catch (e) { Alert.alert("Error", e.response?.data?.message || "Failed to remove student."); }
        }
      },
    ]);
  };

  const handleBatchUpdate = async () => {
    setBatchLoading(true);
    try {
      if (batchType === "semester") {
  const res = await API.put("/admin/update-batch-semester", {
    admissionYear: batchYear,
    department: batchDept === "All" ? undefined : batchDept,
    newSemester: batchSemester,
  });
  Alert.alert("Done!", res.data.message);
} else {
  const res = await API.put("/admin/assign-section", {
    admissionYear: batchYear,
    department: batchDept === "All" ? undefined : batchDept,
    section: batchSection,
    subSection: batchSubSection || undefined,  // ✅ YAHAN HAI
  });
  Alert.alert("Done!", res.data.message);
}
      setBatchModal(false);
      loadStudents();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed.");
    } finally { setBatchLoading(false); }
  };

  const handleAddStudent = async () => {
    if (!addForm.name || !addForm.email || !addForm.password || !addForm.department || !addForm.admissionYear)
      return Alert.alert("Error", "Name, email, password, department and admission year are required.");
    setAddLoading(true);
    try {
      const res = await API.post("/admin/add-student", { ...addForm, college: adminCollege });
      Alert.alert("Student Added!", `Student ID: ${res.data.student.studentId}`);
      setAddModal(false);
      setAddForm({ name: "", email: "", password: "", phone: "", admissionYear: "", department: "", gender: "", section: "" });
      loadStudents();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to add student.");
    } finally { setAddLoading(false); }
  };

  const pickExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["*/*"], copyToCacheDirectory: true });
      const asset = result.assets?.[0] || (result.type === "success" ? result : null);
      if (!asset) return;
      let college = adminCollege;
      if (!college) college = await loadCollegeInfo();
      if (!college) { Alert.alert("Error", "College not found. Please logout and login again."); return; }
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!raw.length) { Alert.alert("Empty File", "No rows found in the file."); return; }
      const valid = [], invalid = [];
      raw.forEach((rawRow, i) => {
        const row = normalizeRow(rawRow);
        const missing = getMissingFields(row);
        row.college = college;
        if (!row.password) row.password = "Welcome@123";
        const entry = { __rowNum: i + 2, ...row };
        if (missing.length > 0) invalid.push({ ...entry, __missing: missing });
        else valid.push(entry);
      });
      setValidRows(valid); setInvalidRows(invalid);
      setImportStage("preview"); setImportDone(0);
      setImportFailed([]); setImportTotal(valid.length);
      setImportModal(true);
    } catch (err) {
      Alert.alert("Error", "Could not read file: " + err.message);
    }
  };

  const runImport = async () => {
    if (!validRows.length) return;
    let college = adminCollege;
    if (!college) college = await loadCollegeInfo();
    if (!college) { Alert.alert("Error", "College not found. Please logout and login again."); return; }
    setImportStage("importing"); setImportDone(0); setImportFailed([]);
    const BATCH_SIZE = 25;
    const allFailed = [];
    let totalDone = 0;
    const payload = validRows.map(row => ({
      name: row.name, email: row.email, phone: row.phone || "",
      password: row.password || "Welcome@123", department: row.department,
      admissionYear: String(row.admissionYear), semester: row.semester ? String(row.semester) : "",
      gender: row.gender || "", section: row.section || "",
    }));
    const batches = [];
    for (let i = 0; i < payload.length; i += BATCH_SIZE) batches.push(payload.slice(i, i + BATCH_SIZE));
    for (let b = 0; b < batches.length; b++) {
      try {
        const res = await API.post("/admin/bulk-add-students", { students: batches[b] });
        totalDone += res.data.imported || 0;
        setImportDone(totalDone);
        if (res.data.failed?.length) { allFailed.push(...res.data.failed); setImportFailed([...allFailed]); }
        if (b < batches.length - 1) await new Promise(r => setTimeout(r, 400));
      } catch (e) {
        const errMsg = e.response?.data?.message || e.message || "Batch failed";
        batches[b].forEach(row => allFailed.push({ email: row.email, error: errMsg }));
        setImportFailed([...allFailed]);
      }
    }
    setImportStage("done");
    loadStudents();
  };

  const resetFilters = () => { setYearFilter("All"); setDeptFilter("All"); setSemFilter("All"); };

  const filtered = students.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(search.toLowerCase())
  );

  const importProgress = importTotal > 0 ? Math.round((importDone / importTotal) * 100) : 0;
  const availableDepts = ["All", ...collegeDepts];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <View>
            {/* HEADER — scrolls with list */}
            <LinearGradient colors={["#080d17", "#0a1628"]} style={[styles.header, { paddingTop: insets.top + 14 }]}>
              <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/dashboard")} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Manage Students</Text>
                {!!adminCollege && <Text style={styles.headerSub} numberOfLines={1}>{adminCollege.split(" ").slice(0, 4).join(" ")}</Text>}
              </View>
              <View style={styles.headerRight}>
                <Pressable onPress={pickExcel}
                  style={[styles.iconBtn, { backgroundColor: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.3)" }]}>
                  <Ionicons name="document-text-outline" size={18} color="#34d399" />
                </Pressable>
                <Pressable onPress={() => setAddModal(true)}
                  style={[styles.iconBtn, { backgroundColor: "rgba(0,198,255,0.12)", borderColor: "rgba(0,198,255,0.3)" }]}>
                  <Ionicons name="person-add" size={18} color="#00c6ff" />
                </Pressable>
              </View>
            </LinearGradient>

            {/* SEARCH */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#64748b" />
              <TextInput style={styles.searchInput}
                placeholder="Search name, email, student ID..."
                placeholderTextColor="#4a5568" value={search} onChangeText={setSearch} />
              {!!search && <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="#64748b" /></Pressable>}
            </View>

            {/* YEAR FILTER */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>ADMISSION YEAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {YEARS.map(y => (
                  <Pressable key={y} onPress={() => { setYearFilter(y); setDeptFilter("All"); setSemFilter("All"); }}
                    style={[styles.chip, yearFilter === y && { backgroundColor: "rgba(167,139,250,0.2)", borderColor: "#a78bfa" }]}>
                    <Text style={[styles.chipText, yearFilter === y && { color: "#a78bfa" }]}>{y}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* DEPT FILTER */}
              {yearFilter !== "All" && (
                <>
                  <Text style={[styles.filterLabel, { marginTop: 10 }]}>COURSE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {["All", ...collegeDepts].map(d => {
                      const short = d === "All" ? "All" : (d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0]);
                      return (
                        <Pressable key={d} onPress={() => { setDeptFilter(d); setSemFilter("All"); }}
                          style={[styles.chip, deptFilter === d && { backgroundColor: "rgba(0,198,255,0.2)", borderColor: "#00c6ff" }]}>
                          <Text style={[styles.chipText, deptFilter === d && { color: "#00c6ff" }]}>{short}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* SEM FILTER */}
              {yearFilter !== "All" && deptFilter !== "All" && (
                <>
                  <Text style={[styles.filterLabel, { marginTop: 10 }]}>SEMESTER</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {["All", ...SEMESTERS.map(String)].map(s => (
                      <Pressable key={s} onPress={() => setSemFilter(s)}
                        style={[styles.chip, semFilter === s && { backgroundColor: "rgba(52,211,153,0.2)", borderColor: "#34d399" }]}>
                        <Text style={[styles.chipText, semFilter === s && { color: "#34d399" }]}>{s === "All" ? "All" : `Sem ${s}`}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* ACTIVE FILTERS */}
              {(yearFilter !== "All" || deptFilter !== "All" || semFilter !== "All") && (
                <View style={styles.activeRow}>
                  {yearFilter !== "All" && <View style={styles.activePill}><Text style={styles.activePillText}>{yearFilter}</Text></View>}
                  {deptFilter !== "All" && <View style={[styles.activePill, { backgroundColor: "rgba(0,198,255,0.12)", borderColor: "rgba(0,198,255,0.3)" }]}><Text style={[styles.activePillText, { color: "#00c6ff" }]}>{deptFilter.match(/\(([^)]+)\)/)?.[1] || deptFilter.split(" ")[0]}</Text></View>}
                  {semFilter !== "All" && <View style={[styles.activePill, { backgroundColor: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.3)" }]}><Text style={[styles.activePillText, { color: "#34d399" }]}>Sem {semFilter}</Text></View>}
                  <Pressable onPress={resetFilters} style={styles.resetBtn}>
                    <Ionicons name="close-circle" size={13} color="#f87171" />
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* BATCH BUTTONS */}
            <View style={styles.batchRow}>
              <Pressable style={styles.batchBtn} onPress={() => { setBatchType("semester"); setBatchModal(true); }}>
                <Ionicons name="sync-outline" size={14} color="#34d399" />
                <Text style={styles.batchBtnText}>Update Semester</Text>
              </Pressable>
              <Pressable style={[styles.batchBtn, { borderColor: "rgba(167,139,250,0.3)", backgroundColor: "rgba(167,139,250,0.06)" }]}
                onPress={() => { setBatchType("section"); setBatchModal(true); }}>
                <Ionicons name="grid-outline" size={14} color="#a78bfa" />
                <Text style={[styles.batchBtnText, { color: "#a78bfa" }]}>Assign Section</Text>
              </Pressable>
            </View>

            <Text style={styles.countText}>{filtered.length} students found</Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#00c6ff" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color="#1f2937" />
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptySub}>Select a year to filter, or import via Excel</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardSid}>{item.studentId || item.email}</Text>
              <View style={styles.tagsRow}>
                <View style={styles.tag}><Text style={styles.tagText}>Sem {item.semester || "?"}</Text></View>
                {item.section && <View style={[styles.tag, { backgroundColor: "rgba(52,211,153,0.15)" }]}>
                  <Text style={[styles.tagText, { color: "#34d399" }]}>Sec {item.section}</Text>
                </View>}
                {/* ✅ ADD YAHAN */}
                {item.subSection && (
                  <View style={[styles.tag, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
                    <Text style={[styles.tagText, { color: "#a78bfa" }]}>Grp {item.subSection}</Text>
                  </View>
                )}
                <View style={[styles.tag, { backgroundColor: "rgba(167,139,250,0.15)" }]}><Text style={[styles.tagText, { color: "#a78bfa" }]}>{item.admissionYear}</Text></View>
                {item.department && <View style={[styles.tag, { backgroundColor: "rgba(245,158,11,0.12)" }]}><Text style={[styles.tagText, { color: "#f59e0b" }]} numberOfLines={1}>{item.department.match(/\(([^)]+)\)/)?.[1] || item.department.split(" ")[0]}</Text></View>}
              </View>
            </View>
            <Pressable onPress={() => handleDelete(item)} style={styles.delBtn}>
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            </Pressable>
          </View>
        )}
      />

      {/* ══ EXCEL IMPORT MODAL ══ */}
      <Modal visible={importModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <View style={[styles.sheetHeadIcon, { backgroundColor: "rgba(52,211,153,0.12)" }]}>
                <Ionicons name="document-text" size={20} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Excel / CSV Bulk Import</Text>
                <Text style={styles.sheetSub}>College auto-assigned from your account</Text>
              </View>
              <Pressable onPress={() => setImportModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>

            {importStage === "preview" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}>
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { borderTopColor: "#34d399" }]}><Text style={[styles.statNum, { color: "#34d399" }]}>{validRows.length}</Text><Text style={styles.statLabel}>Ready</Text></View>
                  <View style={[styles.statBox, { borderTopColor: "#f87171" }]}><Text style={[styles.statNum, { color: "#f87171" }]}>{invalidRows.length}</Text><Text style={styles.statLabel}>Missing Data</Text></View>
                  <View style={[styles.statBox, { borderTopColor: "#f59e0b" }]}><Text style={[styles.statNum, { color: "#f59e0b" }]}>{validRows.length + invalidRows.length}</Text><Text style={styles.statLabel}>Total</Text></View>
                </View>
                <View style={styles.noticeBox}>
                  <Ionicons name="business" size={14} color="#00c6ff" />
                  <Text style={styles.noticeText}>College: <Text style={{ color: "#00c6ff", fontWeight: "800" }}>{adminCollege || "Not found — please login again"}</Text></Text>
                </View>
                <View style={styles.hintBox}>
                  <Text style={styles.hintTitle}>Required Excel Columns</Text>
                  <Text style={styles.hintReq}>name  ·  email  ·  admissionYear  ·  department</Text>
                  <Text style={styles.hintOpt}>phone  ·  semester  ·  gender  ·  section  ·  password</Text>
                  <Text style={styles.hintNote}>• Default password if not provided: <Text style={{ color: "#34d399" }}>Welcome@123</Text></Text>
                </View>
                {validRows.length > 0 && (
                  <>
                    <Text style={styles.sectionHead}>Ready ({validRows.length} rows)</Text>
                    {validRows.slice(0, 5).map((r, i) => (
                      <View key={i} style={styles.previewRow}>
                        <Text style={styles.previewName}>{r.name}</Text>
                        <Text style={styles.previewEmail}>{r.email}</Text>
                        <View style={styles.previewTags}>
                          <View style={styles.previewTag}><Text style={styles.previewTagTxt}>{r.department}</Text></View>
                          <View style={styles.previewTag}><Text style={styles.previewTagTxt}>{r.admissionYear}</Text></View>
                        </View>
                      </View>
                    ))}
                    {validRows.length > 5 && <Text style={styles.moreText}>...and {validRows.length - 5} more rows</Text>}
                    <Pressable style={styles.importBtn} onPress={runImport}>
                      <LinearGradient colors={["#10b981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.importBtnGrad}>
                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                        <Text style={styles.importBtnText}>Import {validRows.length} Student{validRows.length > 1 ? "s" : ""}</Text>
                      </LinearGradient>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            )}

            {importStage === "importing" && (
              <View style={styles.importingWrap}>
                <View style={styles.progressRingWrap}>
                  <ActivityIndicator size="large" color="#34d399" style={{ position: "absolute" }} />
                  <Text style={styles.progressPct}>{importProgress}%</Text>
                </View>
                <Text style={styles.importingTitle}>Importing Students...</Text>
                <Text style={styles.importingCount}>{importDone} of {importTotal} done</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${importProgress}%` }]} />
                </View>
                <Text style={styles.importingHint}>Please wait, do not close this screen</Text>
              </View>
            )}

            {importStage === "done" && (
              <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 50 }}>
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <Ionicons name={importFailed.length === 0 ? "checkmark-circle" : "warning"} size={56} color={importFailed.length === 0 ? "#34d399" : "#f59e0b"} />
                  <Text style={styles.importingTitle}>Import Complete!</Text>
                </View>
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { borderTopColor: "#34d399" }]}><Text style={[styles.statNum, { color: "#34d399" }]}>{importDone}</Text><Text style={styles.statLabel}>Imported</Text></View>
                  <View style={[styles.statBox, { borderTopColor: "#f87171" }]}><Text style={[styles.statNum, { color: "#f87171" }]}>{importFailed.length}</Text><Text style={styles.statLabel}>Failed</Text></View>
                  <View style={[styles.statBox, { borderTopColor: "#f59e0b" }]}><Text style={[styles.statNum, { color: "#f59e0b" }]}>{invalidRows.length}</Text><Text style={styles.statLabel}>Skipped</Text></View>
                </View>
                {importFailed.length > 0 && (
                  <>
                    <Text style={[styles.sectionHead, { color: "#f87171" }]}>Failed Rows ({importFailed.length})</Text>
                    {importFailed.slice(0, 10).map((f, i) => (
                      <View key={i} style={styles.failedRow}>
                        <Text style={styles.failedEmail} numberOfLines={1}>{f.email}</Text>
                        <Text style={styles.failedReason}>{f.error}</Text>
                      </View>
                    ))}
                  </>
                )}
                <Pressable style={[styles.importBtn, { marginTop: 20 }]} onPress={() => setImportModal(false)}>
                  <LinearGradient colors={["#10b981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.importBtnGrad}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.importBtnText}>Done</Text>
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ══ BATCH MODAL ══ */}
      <Modal visible={batchModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{batchType === "semester" ? "Update Semester" : "Assign Section"}</Text>
            <Text style={styles.modalLabel}>Admission Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {["2021", "2022", "2023", "2024", "2025"].map(y => (
                <Pressable key={y} onPress={() => setBatchYear(y)} style={[styles.chip, batchYear === y && styles.chipPurple]}>
                  <Text style={[styles.chipText, batchYear === y && { color: "#a78bfa" }]}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Course (All = entire batch)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {["All", ...collegeDepts].map(d => {
                const short = d === "All" ? "All" : (d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0]);
                return (
                  <Pressable key={d} onPress={() => setBatchDept(d)} style={[styles.chip, batchDept === d && styles.chipBlue]}>
                    <Text style={[styles.chipText, batchDept === d && { color: "#00c6ff" }]}>{short}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
{batchType === "semester" ? (
  <>
    <Text style={styles.modalLabel}>Target Semester</Text>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, marginBottom: 20 }}
    >
      {SEMESTERS.map(s => (
        <Pressable
          key={s}
          onPress={() => setBatchSemester(s)}
          style={[
            styles.chip,
            batchSemester === s && styles.chipGreen
          ]}
        >
          <Text
            style={[
              styles.chipText,
              batchSemester === s && { color: "#34d399" }
            ]}
          >
            Sem {s}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  </>
) : (
  <>
    <Text style={styles.modalLabel}>Section</Text>

    <View
      style={{
        flexDirection: "row",
        gap: 10,
        marginBottom: 14
      }}
    >
      {SECTIONS.map(s => (
        <Pressable
          key={s}
          onPress={() => setBatchSection(s)}
          style={[
            styles.chip,
            batchSection === s && styles.chipPurple
          ]}
        >
          <Text
            style={[
              styles.chipText,
              batchSection === s && { color: "#a78bfa" }
            ]}
          >
            {s}
          </Text>
        </Pressable>
      ))}
    </View>

    {/* ✅ SUB-SECTION */}
    <Text style={styles.modalLabel}>
      Sub-Section (optional)
    </Text>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, marginBottom: 20 }}
    >
      <Pressable
        onPress={() => setBatchSubSection("")}
        style={[
          styles.chip,
          batchSubSection === "" && styles.chipGreen
        ]}
      >
        <Text
          style={[
            styles.chipText,
            batchSubSection === "" && { color: "#34d399" }
          ]}
        >
          None
        </Text>
      </Pressable>

      {SUB_SECTIONS.map(ss => (
        <Pressable
          key={ss}
          onPress={() => setBatchSubSection(ss)}
          style={[
            styles.chip,
            batchSubSection === ss && styles.chipPurple
          ]}
        >
          <Text
            style={[
              styles.chipText,
              batchSubSection === ss && { color: "#a78bfa" }
            ]}
          >
            {ss}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  </>
)}
            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setBatchModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleBatchUpdate} disabled={batchLoading}>
                {batchLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.confirmBtnText}>Apply</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ ADD STUDENT MODAL ══ */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add Student</Text>
            {!!adminCollege && (
              <View style={styles.noticeBox}>
                <Ionicons name="business" size={14} color="#00c6ff" />
                <Text style={styles.noticeText}>College: <Text style={{ color: "#00c6ff", fontWeight: "800" }}>{adminCollege}</Text></Text>
              </View>
            )}
            <Text style={styles.modalLabel}>Admission Year *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {["2021", "2022", "2023", "2024", "2025"].map(y => (
                <Pressable key={y} onPress={() => setAddForm(p => ({ ...p, admissionYear: y, department: "" }))}
                  style={[styles.chip, addForm.admissionYear === y && styles.chipPurple]}>
                  <Text style={[styles.chipText, addForm.admissionYear === y && { color: "#a78bfa" }]}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {!!addForm.admissionYear && (
              <>
                <Text style={styles.modalLabel}>Course / Department *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                  {collegeDepts.map(d => {
                    const short = d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0];
                    return (
                      <Pressable key={d} onPress={() => setAddForm(p => ({ ...p, department: d }))}
                        style={[styles.chip, addForm.department === d && styles.chipBlue]}>
                        <Text style={[styles.chipText, addForm.department === d && { color: "#00c6ff" }]}>{short}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
            {[
              { key: "name", label: "Full Name *" },
              { key: "email", label: "Email *" },
              { key: "password", label: "Password *", secure: true },
              { key: "phone", label: "Phone" },
              { key: "section", label: "Section  (A / B / C / D)" },
              { key: "gender", label: "Gender  (Male / Female / Other)" },
            ].map(f => (
              <TextInput key={f.key} style={styles.input}
                placeholder={f.label} placeholderTextColor="#374151"
                secureTextEntry={!!f.secure}
                value={addForm[f.key] || ""}
                onChangeText={v => setAddForm(p => ({ ...p, [f.key]: v }))} />
            ))}
            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setAddModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleAddStudent} disabled={addLoading}>
                {addLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.confirmBtnText}>Add Student</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", borderWidth: 1 },

  // Fixed filter bar
  filterBar: { backgroundColor: "#080d17", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  filterContent: { backgroundColor: "#080d17", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  filterLabel: { color: "#374151", fontSize: 9, fontWeight: "800", letterSpacing: 1.5, marginBottom: 5, marginTop: 6 },
  chipRow: { gap: 8, paddingVertical: 2 },

  chip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
  chipText: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  chipPurple: { backgroundColor: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.5)" },
  chipBlue: { backgroundColor: "rgba(0,198,255,0.15)", borderColor: "rgba(0,198,255,0.5)" },
  chipGreen: { backgroundColor: "rgba(52,211,153,0.15)", borderColor: "rgba(52,211,153,0.5)" },

  activeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 },
  activePill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(167,139,250,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(167,139,250,0.3)" },
  activePillText: { color: "#a78bfa", fontSize: 11, fontWeight: "700" },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  resetBtnText: { color: "#f87171", fontSize: 11, fontWeight: "700" },

  batchRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  batchBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(52,211,153,0.3)", backgroundColor: "rgba(52,211,153,0.06)" },
  batchBtnText: { color: "#34d399", fontSize: 12, fontWeight: "700" },

  countText: { color: "#374151", fontSize: 11, paddingHorizontal: 16, marginTop: 6, marginBottom: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,198,255,0.15)", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#00c6ff", fontSize: 14, fontWeight: "800" },
  cardInfo: { flex: 1 },
  cardName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardSid: { color: "#64748b", fontSize: 11, marginTop: 2 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(0,198,255,0.1)" },
  tagText: { color: "#00c6ff", fontSize: 10, fontWeight: "700" },
  delBtn: { padding: 8 },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 12, textAlign: "center" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.94, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  sheetHeadIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sheetSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: "#1a2535", borderRadius: 12, padding: 12, alignItems: "center", borderTopWidth: 2 },
  statNum: { fontSize: 22, fontWeight: "900" },
  statLabel: { color: "#64748b", fontSize: 10, fontWeight: "700", marginTop: 3 },
  noticeBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,198,255,0.08)", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,198,255,0.2)", marginBottom: 14 },
  noticeText: { color: "#94a3b8", fontSize: 12, flex: 1 },
  hintBox: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  hintTitle: { color: "#fff", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  hintReq: { color: "#f87171", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  hintOpt: { color: "#64748b", fontSize: 12, marginBottom: 6 },
  hintNote: { color: "#374151", fontSize: 11, lineHeight: 17 },
  sectionHead: { color: "#34d399", fontSize: 12, fontWeight: "800", marginBottom: 10 },
  previewRow: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  previewName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  previewEmail: { color: "#64748b", fontSize: 11, marginTop: 2 },
  previewTags: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  previewTag: { backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  previewTagTxt: { color: "#34d399", fontSize: 10, fontWeight: "700" },
  moreText: { color: "#374151", fontSize: 11, textAlign: "center", marginBottom: 10 },
  importBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20 },
  importBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  importBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  importingWrap: { alignItems: "center", padding: 40, gap: 14 },
  progressRingWrap: { width: 100, height: 100, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  progressPct: { color: "#34d399", fontSize: 24, fontWeight: "900" },
  importingTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  importingCount: { color: "#34d399", fontSize: 14, fontWeight: "700" },
  progressTrack: { width: width - 80, height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: "#34d399", borderRadius: 6 },
  importingHint: { color: "#374151", fontSize: 11, marginTop: 4 },
  failedRow: { backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: "rgba(248,113,113,0.2)" },
  failedEmail: { color: "#fff", fontSize: 12, fontWeight: "700" },
  failedReason: { color: "#f87171", fontSize: 11, marginTop: 3 },

  modal: { backgroundColor: "#1a2535", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 16 },
  modalLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#0f172a", color: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontWeight: "700" },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#00c6ff", alignItems: "center" },
  confirmBtnText: { color: "#000", fontWeight: "800", fontSize: 14 },
});