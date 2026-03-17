// app/admin/manage-subjects.js
import React, { useState, useCallback, useEffect } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  TextInput, StatusBar, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Alert, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import API from "../../services/api";

const { height, width } = Dimensions.get("window");

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

const SEMESTERS   = ["1","2","3","4","5","6","7","8"];
const TYPES       = ["Theory","Lab","Both"];
const TYPE_COLORS = { Theory:"#00c6ff", Lab:"#f59e0b", Both:"#a78bfa" };

const DEPT_COLORS = {
  CSE:"#00c6ff", ECE:"#a78bfa", ME:"#f59e0b",
  CE:"#34d399",  IT:"#f87171",  EE:"#60a5fa",
  AI:"#fb923c",  DATA:"#34d399",
};
const getColor = (dept="") => {
  const key = Object.keys(DEPT_COLORS).find(k => dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#34d399";
};

const EMPTY_FORM = { name:"", code:"", type:"Theory", credits:"", description:"" };

// ── Type Chips ────────────────────────────────────────────
const TypeChips = ({ value, onChange }) => (
  <View style={styles.typeRow}>
    {TYPES.map(t => {
      const tc  = TYPE_COLORS[t];
      const sel = value === t;
      return (
        <Pressable key={t}
          style={[styles.typeChip, { backgroundColor: sel ? tc+"22":"#1a2535", borderColor: sel ? tc:"rgba(255,255,255,0.10)" }]}
          onPress={() => onChange(t)}>
          <Ionicons name={t==="Theory"?"school-outline":t==="Lab"?"flask-outline":"layers-outline"} size={13} color={sel?tc:"#64748b"} />
          <Text style={[styles.typeChipText, sel && { color:tc, fontWeight:"800" }]}>{t}</Text>
          {sel && <Ionicons name="checkmark-circle" size={11} color={tc} />}
        </Pressable>
      );
    })}
  </View>
);

// ── Subject Card ─────────────────────────────────────────
const SubjectCard = ({ item, onEdit, onDelete }) => {
  const color     = getColor(item.department);
  const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";
  const typeColor = TYPE_COLORS[item.type] || "#64748b";
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor:color }]} />
      <View style={[styles.iconBox, { backgroundColor:color+"20" }]}>
        <Ionicons name="book" size={17} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardMetaRow}>
          {item.code && (
            <View style={[styles.codeBadge, { backgroundColor:color+"20" }]}>
              <Text style={[styles.codeBadgeText, { color }]}>{item.code}</Text>
            </View>
          )}
          <View style={styles.semBadge}>
            <Text style={styles.semBadgeText}>Sem {item.semester}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor:typeColor+"25" }]}>
            <Text style={[styles.typeBadgeText, { color:typeColor }]}>{item.type ?? "Theory"}</Text>
          </View>
        </View>
        <Text style={styles.cardDept} numberOfLines={1}>{deptShort}</Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={13} color="#f59e0b" />
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash" size={13} color="#f87171" />
        </Pressable>
      </View>
    </View>
  );
};

// ── Step Indicator ────────────────────────────────────────
const StepIndicator = ({ current, total }) => (
  <View style={styles.stepRow}>
    {Array.from({ length:total }).map((_,i) => (
      <React.Fragment key={i}>
        <View style={[
          styles.stepDot,
          i < current  && { backgroundColor:"#34d399" },
          i === current && { backgroundColor:"#34d399", transform:[{scale:1.2}] },
          i > current  && { backgroundColor:"rgba(255,255,255,0.12)" },
        ]}>
          {i < current
            ? <Ionicons name="checkmark" size={10} color="#000" />
            : <Text style={[styles.stepNum, { color: i===current?"#000":"#64748b" }]}>{i+1}</Text>
          }
        </View>
        {i < total-1 && (
          <View style={[styles.stepLine, { backgroundColor: i<current?"#34d399":"rgba(255,255,255,0.08)" }]} />
        )}
      </React.Fragment>
    ))}
  </View>
);

// ════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════
export default function ManageSubjects() {
  const router = useRouter();

  // Admin college — from AsyncStorage
  const [adminCollege, setAdminCollege] = useState("");
  const [collegeDepts, setCollegeDepts] = useState([]);

  // Subject list
  const [subjects,   setSubjects]   = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search,   setSearch]   = useState("");
  const [selDept,  setSelDept]  = useState("All");
  const [selSem,   setSelSem]   = useState("All");

  // Wizard
  const [wizVisible,    setWizVisible]    = useState(false);
  const [step,          setStep]          = useState(0);
  const [wizDept,       setWizDept]       = useState("");
  const [wizSem,        setWizSem]        = useState("");
  const [subjectCount,  setSubjectCount]  = useState("");
  const [subjectForms,  setSubjectForms]  = useState([]);
  const [saving,        setSaving]        = useState(false);

  // Edit modal
  const [editModal,      setEditModal]      = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editForm,       setEditForm]       = useState({ ...EMPTY_FORM });

  // Excel import
  const [importModal,  setImportModal]  = useState(false);
  const [importStage,  setImportStage]  = useState("preview");
  const [importRows,   setImportRows]   = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importDone,   setImportDone]   = useState(0);
  const [importFailed, setImportFailed] = useState([]);

  // ── Load admin college ───────────────────────────────
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
    } catch {}
    return "";
  }, []);

  useEffect(() => { loadCollegeInfo(); }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      await loadCollegeInfo();
      loadSubjects();
    })();
  }, []));

  // ── Load subjects (only admin's college) ─────────────
  const loadSubjects = async (isRefresh=false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const raw = await AsyncStorage.getItem("adminData");
      const d   = raw ? JSON.parse(raw) : {};
      const college = d.college || d.user?.college || "";
      const res = await API.get("/subjects", { params: { college } });
      const data = res.data?.subjects || [];
      setSubjects(data);
      applyFilter(data, search, selDept, selSem);
    } catch {
      Alert.alert("Error", "Could not load subjects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (data=subjects, q=search, dept=selDept, sem=selSem) => {
    let r = [...data];
    if (q.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(s =>
        s.name?.toLowerCase().includes(lq) ||
        s.code?.toLowerCase().includes(lq) ||
        s.department?.toLowerCase().includes(lq)
      );
    }
    if (dept !== "All") r = r.filter(s => s.department === dept);
    if (sem  !== "All") r = r.filter(s => String(s.semester) === sem);
    setFiltered(r);
  };

  // ── Wizard ───────────────────────────────────────────
  const openWizard = () => {
    setStep(0); setWizDept(""); setWizSem("");
    setSubjectCount(""); setSubjectForms([]);
    setWizVisible(true);
  };

  const STEP_TITLES = ["Select Department","Select Semester","How Many Subjects?","Enter Subject Details"];
  const TOTAL_STEPS = 4;

  const wizNext = () => {
    if (step===0 && !wizDept)      return Alert.alert("","Please select a department");
    if (step===1 && !wizSem)       return Alert.alert("","Please select a semester");
    if (step===2) {
      const n = parseInt(subjectCount);
      if (!n || n<1 || n>20) return Alert.alert("Error","Enter a number between 1 and 20");
      setSubjectForms(Array.from({ length:n }, (_,i) => subjectForms[i] || { ...EMPTY_FORM }));
    }
    setStep(p => p+1);
  };

  const updateForm = (idx, key, val) =>
    setSubjectForms(prev => { const a=[...prev]; a[idx]={...a[idx],[key]:val}; return a; });

  const handleWizardSave = async () => {
    for (let i=0; i<subjectForms.length; i++) {
      if (!subjectForms[i].name?.trim()) return Alert.alert("Error",`Subject ${i+1}: Name required`);
      if (!subjectForms[i].code?.trim()) return Alert.alert("Error",`Subject ${i+1}: Code required`);
    }
    setSaving(true);
    let ok=0, fail=0, msg="";
    for (const s of subjectForms) {
      try {
        await API.post("/subjects/create", {
          name:        s.name.trim(),
          code:        s.code.trim().toUpperCase(),
          type:        s.type || "Theory",
          college:     adminCollege,
          department:  wizDept,
          semester:    Number(wizSem),
          credits:     Number(s.credits) || 0,
          description: s.description?.trim() || "",
        });
        ok++;
      } catch(e) {
        fail++;
        msg = e.response?.data?.message || "Error";
      }
    }
    setSaving(false);
    setWizVisible(false);
    loadSubjects();
    Alert.alert("Done!", fail>0 ? `${ok} added, ${fail} failed\n${msg}` : `${ok} subject${ok>1?"s":""} added!`);
  };

  // ── Edit ─────────────────────────────────────────────
  const openEdit = (s) => {
    setEditingSubject(s);
    setEditForm({ name:s.name||"", code:s.code||"", type:s.type||"Theory", credits:String(s.credits||""), description:s.description||"" });
    setEditModal(true);
  };
  const handleEditSave = async () => {
    if (!editForm.name.trim()) return Alert.alert("Error","Name required");
    if (!editForm.code.trim()) return Alert.alert("Error","Code required");
    setSaving(true);
    try {
      await API.put(`/subjects/${editingSubject._id}`, {
        name:        editForm.name.trim(),
        code:        editForm.code.trim().toUpperCase(),
        type:        editForm.type || "Theory",
        credits:     Number(editForm.credits) || 0,
        description: editForm.description?.trim() || "",
      });
      setEditModal(false);
      loadSubjects();
      Alert.alert("Updated!");
    } catch(e) {
      Alert.alert("Error", e.response?.data?.message || "Could not update");
    } finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = (s) => {
    Alert.alert("Delete Subject", `Delete "${s.name}"?`, [
      { text:"Cancel", style:"cancel" },
      { text:"Delete", style:"destructive", onPress: async () => {
        try {
          await API.delete(`/subjects/${s._id}`);
          loadSubjects();
        } catch(e) { Alert.alert("Error", e.response?.data?.message || "Failed"); }
      }},
    ]);
  };

  // ── Excel Import ──────────────────────────────────────
  const pickExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type:["*/*"], copyToCacheDirectory:true });
      const asset  = result.assets?.[0] || (result.type==="success" ? result : null);
      if (!asset) return;

      let college = adminCollege;
      if (!college) college = await loadCollegeInfo();
      if (!college) { Alert.alert("Error","College not found. Please re-login."); return; }

      const response    = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const wb  = XLSX.read(arrayBuffer, { type:"array" });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval:"" });

      if (!raw.length) { Alert.alert("Empty File","No rows found."); return; }

      // Normalize headers
      const rows   = [];
      const errors = [];
      raw.forEach((row, i) => {
        const lower = {};
        Object.keys(row).forEach(k => { lower[k.trim().toLowerCase()] = String(row[k]||"").trim(); });

        const name    = lower["name"] || lower["subject name"] || lower["subjectname"] || "";
        const code    = lower["code"] || lower["subject code"] || lower["subjectcode"] || "";
        const dept    = lower["department"] || lower["dept"] || "";
        const sem     = lower["semester"]   || lower["sem"]  || "";
        const type    = lower["type"] || "Theory";
        const credits = lower["credits"] || "0";

        if (!name || !code || !dept || !sem) {
          errors.push({ row: i+2, reason: `Missing: ${!name?"name ":""}${!code?"code ":""}${!dept?"department ":""}${!sem?"semester":""}`.trim() });
          return;
        }

        rows.push({ name, code, dept, sem, type, credits, college });
      });

      setImportRows(rows);
      setImportErrors(errors);
      setImportStage("preview");
      setImportDone(0);
      setImportFailed([]);
      setImportModal(true);
    } catch(err) {
      Alert.alert("Error", "Could not read file: " + err.message);
    }
  };

  const runExcelImport = async () => {
    if (!importRows.length) return;
    setImportStage("importing");
    const BATCH = 20;
    const failed = [];
    let done = 0;

    for (let i=0; i<importRows.length; i+=BATCH) {
      const batch = importRows.slice(i, i+BATCH);
      for (const row of batch) {
        try {
          await API.post("/subjects/create", {
            name:       row.name,
            code:       row.code.toUpperCase(),
            type:       row.type || "Theory",
            college:    row.college,
            department: row.dept,
            semester:   Number(row.sem),
            credits:    Number(row.credits) || 0,
          });
          done++;
          setImportDone(done);
        } catch(e) {
          failed.push({ row: row.name, error: e.response?.data?.message || "Failed" });
          setImportFailed([...failed]);
        }
      }
      if (i+BATCH < importRows.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    setImportStage("done");
    loadSubjects();
  };

  const importProgress = importRows.length > 0 ? Math.round((importDone/importRows.length)*100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/dashboard")}
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Subjects</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {adminCollege ? adminCollege.split(" ").slice(0,3).join(" ") : "Loading..."}
            {" · "}{filtered.length} subjects
          </Text>
        </View>
        <View style={styles.headerRight}>
          {/* Excel import */}
          <Pressable onPress={pickExcel}
            style={[styles.iconBtn, { backgroundColor:"rgba(52,211,153,0.12)", borderColor:"rgba(52,211,153,0.3)" }]}>
            <Ionicons name="document-text-outline" size={17} color="#34d399" />
          </Pressable>
          {/* Add wizard */}
          <Pressable onPress={openWizard}
            style={[styles.iconBtn, { backgroundColor:"rgba(52,211,153,0.12)", borderColor:"rgba(52,211,153,0.3)" }]}>
            <Ionicons name="add" size={20} color="#34d399" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* College badge */}
      {!!adminCollege && (
        <View style={styles.collegeBadge}>
          <Ionicons name="business" size={12} color="#34d399" />
          <Text style={styles.collegeBadgeText} numberOfLines={1}>{adminCollege}</Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={15} color="#64748b" />
        <TextInput style={styles.searchInput}
          placeholder="Search subjects..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={t => { setSearch(t); applyFilter(subjects, t, selDept, selSem); }} />
        {search.length>0 && (
          <Pressable onPress={() => { setSearch(""); applyFilter(subjects,"",selDept,selSem); }}>
            <Ionicons name="close-circle" size={15} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* Department filter — only admin's college depts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {["All", ...collegeDepts].map(d => {
          const short = d==="All" ? "All" : (d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0]);
          const act   = selDept===d;
          const color = d==="All" ? "#34d399" : getColor(d);
          return (
            <Pressable key={d}
              style={[styles.chip, act && { backgroundColor:color+"22", borderColor:color+"55" }]}
              onPress={() => { setSelDept(d); applyFilter(subjects, search, d, selSem); }}>
              <Text style={[styles.chipText, act && { color }]}>{short}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Semester filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {["All",...SEMESTERS].map(s => {
          const act = selSem===s;
          return (
            <Pressable key={s}
              style={[styles.chip, act && { backgroundColor:"rgba(167,139,250,0.2)", borderColor:"#a78bfa" }]}
              onPress={() => { setSelSem(s); applyFilter(subjects, search, selDept, s); }}>
              <Text style={[styles.chipText, act && { color:"#a78bfa" }]}>{s==="All"?"All Sem":`Sem ${s}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Subject List */}
      {loading
        ? <View style={styles.center}><ActivityIndicator size="large" color="#34d399" /></View>
        : (
          <FlatList
            data={filtered}
            keyExtractor={i => i._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadSubjects(true)} tintColor="#34d399" />}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><Ionicons name="book-outline" size={40} color="#374151" /></View>
                <Text style={styles.emptyTitle}>No Subjects Found</Text>
                <Text style={styles.emptySub}>Use + to add or Excel to bulk import</Text>
                <View style={styles.emptyBtns}>
                  <Pressable style={styles.emptyAddBtn} onPress={openWizard}>
                    <Ionicons name="add-circle-outline" size={15} color="#34d399" />
                    <Text style={styles.emptyAddText}>Add Manually</Text>
                  </Pressable>
                  <Pressable style={[styles.emptyAddBtn, { borderColor:"rgba(52,211,153,0.2)" }]} onPress={pickExcel}>
                    <Ionicons name="document-text-outline" size={15} color="#34d399" />
                    <Text style={styles.emptyAddText}>Excel Import</Text>
                  </Pressable>
                </View>
              </View>
            )}
            renderItem={({ item }) => (
              <SubjectCard item={item} onEdit={openEdit} onDelete={handleDelete} />
            )}
          />
        )
      }

      {/* ════ WIZARD MODAL ════ */}
      <Modal visible={wizVisible} transparent animationType="slide" onRequestClose={() => setWizVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              {step>0
                ? <Pressable onPress={() => setStep(p=>Math.max(0,p-1))} style={styles.sheetBackBtn}>
                    <Ionicons name="arrow-back" size={17} color="#fff" />
                  </Pressable>
                : <View style={{ width:36 }} />
              }
              <View style={{ flex:1, alignItems:"center" }}>
                <Text style={styles.sheetTitle}>{STEP_TITLES[step]}</Text>
                <Text style={styles.sheetSub}>Step {step+1} of {TOTAL_STEPS}</Text>
              </View>
              <Pressable onPress={() => setWizVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={19} color="#64748b" />
              </Pressable>
            </View>
            <StepIndicator current={step} total={TOTAL_STEPS} />

            <ScrollView showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetBody}>

              {/* College info banner */}
              <View style={styles.collegeInfoBanner}>
                <Ionicons name="business" size={13} color="#34d399" />
                <Text style={styles.collegeInfoText} numberOfLines={1}>{adminCollege}</Text>
              </View>

              {/* Step 0 — Department */}
              {step===0 && (
                <>
                  <Text style={styles.hint}>Select department for your college</Text>
                  <View style={styles.chipGrid}>
                    {collegeDepts.map(d => {
                      const sel   = wizDept===d;
                      const color = getColor(d);
                      const short = d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0];
                      return (
                        <Pressable key={d}
                          style={[styles.deptChip, sel && { backgroundColor:color+"22", borderColor:color+"66" }]}
                          onPress={() => setWizDept(d)}>
                          {sel && <Ionicons name="checkmark-circle" size={12} color={color} />}
                          <Text style={[styles.deptChipText, sel && { color }]}>{short}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {wizDept && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="school" size={13} color="#34d399" />
                      <Text style={styles.selectedBadgeText} numberOfLines={2}>{wizDept} ✓</Text>
                    </View>
                  )}
                </>
              )}

              {/* Step 1 — Semester */}
              {step===1 && (
                <>
                  <Text style={styles.hint}>Which semester?</Text>
                  <View style={styles.semGrid}>
                    {SEMESTERS.map(s => (
                      <Pressable key={s}
                        style={[styles.semBox, wizSem===s && { backgroundColor:"rgba(52,211,153,0.2)", borderColor:"#34d399" }]}
                        onPress={() => setWizSem(s)}>
                        <Text style={[styles.semBoxNum, wizSem===s && { color:"#34d399" }]}>{s}</Text>
                        <Text style={styles.semBoxLabel}>Sem</Text>
                      </Pressable>
                    ))}
                  </View>
                  {wizDept && wizSem && (
                    <View style={styles.previewBox}>
                      <Ionicons name="checkmark-circle" size={13} color="#34d399" />
                      <Text style={styles.previewText}>
                        {wizDept.match(/\(([^)]+)\)/)?.[1] || wizDept.split(" ")[0]} · Sem {wizSem}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Step 2 — Count */}
              {step===2 && (
                <>
                  <Text style={styles.hint}>
                    How many subjects for{" "}
                    <Text style={{ color:"#34d399" }}>
                      {wizDept.match(/\(([^)]+)\)/)?.[1]||wizDept.split(" ")[0]} · Sem {wizSem}
                    </Text>?
                  </Text>
                  <View style={styles.countChips}>
                    {["1","2","3","4","5","6","7","8"].map(n => (
                      <Pressable key={n}
                        style={[styles.countChip, subjectCount===n && { backgroundColor:"rgba(52,211,153,0.2)", borderColor:"#34d399" }]}
                        onPress={() => setSubjectCount(n)}>
                        <Text style={[styles.countChipText, subjectCount===n && { color:"#34d399" }]}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.orText}>— or type —</Text>
                  <View style={styles.countInputWrap}>
                    <TextInput style={styles.countInput} value={subjectCount}
                      onChangeText={setSubjectCount} keyboardType="numeric"
                      placeholder="e.g. 10" placeholderTextColor="#374151" maxLength={2} />
                    <Text style={styles.countSuffix}>subjects</Text>
                  </View>
                </>
              )}

              {/* Step 3 — Subject details */}
              {step===3 && (
                <>
                  <Text style={styles.hint}>Fill in details ({subjectForms.length} subjects)</Text>
                  {subjectForms.map((sf, idx) => (
                    <View key={idx} style={styles.subCard}>
                      <View style={styles.subCardHeader}>
                        <View style={styles.subNumBadge}>
                          <Text style={styles.subNum}>{idx+1}</Text>
                        </View>
                        <Text style={styles.subCardTitle}>Subject {idx+1}</Text>
                        {sf.name ? <Text style={styles.subCardPreview} numberOfLines={1}>{sf.name}</Text> : null}
                      </View>

                      <Text style={styles.fieldLabel}>Subject Name *</Text>
                      <View style={styles.fieldRow}>
                        <Ionicons name="book-outline" size={14} color="#64748b" style={{ marginRight:8 }} />
                        <TextInput style={styles.fieldInput} value={sf.name}
                          onChangeText={v => updateForm(idx,"name",v)}
                          placeholder="e.g. Data Structures" placeholderTextColor="#374151" />
                      </View>

                      <Text style={styles.fieldLabel}>Subject Code *</Text>
                      <View style={styles.fieldRow}>
                        <Ionicons name="code-slash" size={14} color="#64748b" style={{ marginRight:8 }} />
                        <TextInput style={styles.fieldInput} value={sf.code}
                          onChangeText={v => updateForm(idx,"code",v)}
                          placeholder="e.g. CS301" placeholderTextColor="#374151"
                          autoCapitalize="characters" />
                      </View>

                      <Text style={styles.fieldLabel}>Type *</Text>
                      <TypeChips value={sf.type||"Theory"} onChange={v => updateForm(idx,"type",v)} />

                      <Text style={styles.fieldLabel}>Credits (optional)</Text>
                      <View style={styles.fieldRow}>
                        <Ionicons name="star-outline" size={14} color="#64748b" style={{ marginRight:8 }} />
                        <TextInput style={styles.fieldInput} value={sf.credits}
                          onChangeText={v => updateForm(idx,"credits",v)}
                          placeholder="e.g. 4" placeholderTextColor="#374151" keyboardType="numeric" />
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.sheetFooter}>
              {step<3
                ? (
                  <Pressable style={styles.nextBtn} onPress={wizNext}>
                    <LinearGradient colors={["#10b981","#059669"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.nextBtnGrad}>
                      <Text style={styles.nextBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={17} color="#fff" />
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.nextBtn, saving && { opacity:0.6 }]}
                    onPress={handleWizardSave} disabled={saving}>
                    <LinearGradient colors={["#10b981","#059669"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.nextBtnGrad}>
                      {saving
                        ? <ActivityIndicator color="#fff" />
                        : <>
                          <Ionicons name="checkmark-circle" size={17} color="#fff" />
                          <Text style={styles.nextBtnText}>Add {subjectForms.length} Subject{subjectForms.length>1?"s":""}</Text>
                        </>
                      }
                    </LinearGradient>
                  </Pressable>
                )
              }
            </View>
          </View>
        </View>
      </Modal>

      {/* ════ EXCEL IMPORT MODAL ════ */}
      <Modal visible={importModal} transparent animationType="slide" onRequestClose={() => setImportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={{ width:36 }} />
              <View style={{ flex:1, alignItems:"center" }}>
                <Text style={styles.sheetTitle}>Excel / CSV Import</Text>
                <Text style={styles.sheetSub}>{adminCollege.split(" ").slice(0,3).join(" ")}</Text>
              </View>
              <Pressable onPress={() => setImportModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={19} color="#64748b" />
              </Pressable>
            </View>

            {/* Preview Stage */}
            {importStage==="preview" && (
              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding:20, paddingBottom:50 }}>
                {/* Stats */}
                <View style={styles.importStats}>
                  <View style={[styles.importStat, { borderTopColor:"#34d399" }]}>
                    <Text style={[styles.importStatNum, { color:"#34d399" }]}>{importRows.length}</Text>
                    <Text style={styles.importStatLabel}>Ready</Text>
                  </View>
                  <View style={[styles.importStat, { borderTopColor:"#f87171" }]}>
                    <Text style={[styles.importStatNum, { color:"#f87171" }]}>{importErrors.length}</Text>
                    <Text style={styles.importStatLabel}>Errors</Text>
                  </View>
                  <View style={[styles.importStat, { borderTopColor:"#f59e0b" }]}>
                    <Text style={[styles.importStatNum, { color:"#f59e0b" }]}>{importRows.length+importErrors.length}</Text>
                    <Text style={styles.importStatLabel}>Total</Text>
                  </View>
                </View>

                {/* Hint */}
                <View style={styles.importHintBox}>
                  <Text style={styles.importHintTitle}>Required Excel Columns</Text>
                  <Text style={styles.importHintReq}>name  ·  code  ·  department  ·  semester</Text>
                  <Text style={styles.importHintOpt}>type  ·  credits  (optional)</Text>
                  <Text style={styles.importHintNote}>
                    • department must match exactly: e.g. "Computer Science Engineering (CSE)"{"\n"}
                    • semester: number only (1-8){"\n"}
                    • College auto-assigned from your account
                  </Text>
                </View>

                {/* Preview rows */}
                {importRows.length>0 && (
                  <>
                    <Text style={styles.sectionHead}>Ready ({importRows.length})</Text>
                    {importRows.slice(0,5).map((r,i) => (
                      <View key={i} style={styles.previewRowCard}>
                        <Text style={styles.previewRowName}>{r.name}</Text>
                        <View style={styles.previewRowTags}>
                          <View style={styles.previewTag}><Text style={styles.previewTagText}>{r.code}</Text></View>
                          <View style={styles.previewTag}><Text style={styles.previewTagText}>{r.dept.match(/\(([^)]+)\)/)?.[1]||r.dept.split(" ")[0]}</Text></View>
                          <View style={styles.previewTag}><Text style={styles.previewTagText}>Sem {r.sem}</Text></View>
                          <View style={styles.previewTag}><Text style={styles.previewTagText}>{r.type}</Text></View>
                        </View>
                      </View>
                    ))}
                    {importRows.length>5 && <Text style={styles.moreText}>...and {importRows.length-5} more</Text>}
                  </>
                )}

                {/* Errors */}
                {importErrors.length>0 && (
                  <>
                    <Text style={[styles.sectionHead, { color:"#f87171", marginTop:12 }]}>
                      Rows with errors ({importErrors.length})
                    </Text>
                    {importErrors.map((e,i) => (
                      <View key={i} style={styles.errorRow}>
                        <Text style={styles.errorRowText}>Row {e.row}: {e.reason}</Text>
                      </View>
                    ))}
                  </>
                )}

                {importRows.length===0 && (
                  <View style={{ alignItems:"center", paddingVertical:30 }}>
                    <Ionicons name="warning" size={36} color="#f87171" />
                    <Text style={styles.noRowsText}>No valid rows found. Check column names.</Text>
                  </View>
                )}

                {importRows.length>0 && (
                  <Pressable style={styles.importBtn} onPress={runExcelImport}>
                    <LinearGradient colors={["#10b981","#059669"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.importBtnGrad}>
                      <Ionicons name="cloud-upload-outline" size={17} color="#fff" />
                      <Text style={styles.importBtnText}>Import {importRows.length} Subject{importRows.length>1?"s":""}</Text>
                    </LinearGradient>
                  </Pressable>
                )}
              </ScrollView>
            )}

            {/* Importing Stage */}
            {importStage==="importing" && (
              <View style={styles.importingWrap}>
                <View style={styles.importRingWrap}>
                  <ActivityIndicator size="large" color="#34d399" style={{ position:"absolute" }} />
                  <Text style={styles.importPct}>{importProgress}%</Text>
                </View>
                <Text style={styles.importingTitle}>Importing Subjects...</Text>
                <Text style={styles.importingCount}>{importDone} of {importRows.length}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width:`${importProgress}%` }]} />
                </View>
                <Text style={styles.importingHint}>Please wait, do not close</Text>
              </View>
            )}

            {/* Done Stage */}
            {importStage==="done" && (
              <ScrollView contentContainerStyle={{ padding:24, paddingBottom:50 }}>
                <View style={{ alignItems:"center", marginBottom:16 }}>
                  <Ionicons name={importFailed.length===0?"checkmark-circle":"warning"} size={54}
                    color={importFailed.length===0?"#34d399":"#f59e0b"} />
                  <Text style={styles.importingTitle}>Import Complete!</Text>
                </View>
                <View style={styles.importStats}>
                  <View style={[styles.importStat, { borderTopColor:"#34d399" }]}>
                    <Text style={[styles.importStatNum, { color:"#34d399" }]}>{importDone}</Text>
                    <Text style={styles.importStatLabel}>Added</Text>
                  </View>
                  <View style={[styles.importStat, { borderTopColor:"#f87171" }]}>
                    <Text style={[styles.importStatNum, { color:"#f87171" }]}>{importFailed.length}</Text>
                    <Text style={styles.importStatLabel}>Failed</Text>
                  </View>
                  <View style={[styles.importStat, { borderTopColor:"#f59e0b" }]}>
                    <Text style={[styles.importStatNum, { color:"#f59e0b" }]}>{importErrors.length}</Text>
                    <Text style={styles.importStatLabel}>Skipped</Text>
                  </View>
                </View>
                {importFailed.length>0 && (
                  <>
                    <Text style={[styles.sectionHead, { color:"#f87171" }]}>Failed</Text>
                    {importFailed.slice(0,8).map((f,i) => (
                      <View key={i} style={styles.errorRow}>
                        <Text style={styles.errorRowText}>{f.row}: {f.error}</Text>
                      </View>
                    ))}
                  </>
                )}
                <Pressable style={[styles.importBtn, { marginTop:20 }]} onPress={() => setImportModal(false)}>
                  <LinearGradient colors={["#10b981","#059669"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.importBtnGrad}>
                    <Ionicons name="checkmark" size={17} color="#fff" />
                    <Text style={styles.importBtnText}>Done</Text>
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ════ EDIT MODAL ════ */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { maxHeight:height*0.82 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={{ width:36 }} />
              <Text style={[styles.sheetTitle, { flex:1, textAlign:"center" }]}>Edit Subject</Text>
              <Pressable onPress={() => setEditModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={19} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding:20, paddingBottom:50 }}>
              {editingSubject && (
                <View style={styles.editInfoBadge}>
                  <Ionicons name="information-circle" size={13} color="#a78bfa" />
                  <Text style={styles.editInfoText}>
                    {editingSubject.department?.match(/\(([^)]+)\)/)?.[1] || editingSubject.department?.split(" ")[0]} · Sem {editingSubject.semester}
                  </Text>
                </View>
              )}
              <Text style={styles.fieldLabel}>Subject Name *</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="book-outline" size={14} color="#64748b" style={{ marginRight:8 }} />
                <TextInput style={styles.fieldInput} value={editForm.name}
                  onChangeText={v => setEditForm(p=>({...p,name:v}))}
                  placeholder="Subject name" placeholderTextColor="#374151" />
              </View>
              <Text style={styles.fieldLabel}>Subject Code *</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="code-slash" size={14} color="#64748b" style={{ marginRight:8 }} />
                <TextInput style={styles.fieldInput} value={editForm.code}
                  onChangeText={v => setEditForm(p=>({...p,code:v}))}
                  placeholder="Subject code" placeholderTextColor="#374151"
                  autoCapitalize="characters" />
              </View>
              <Text style={styles.fieldLabel}>Type *</Text>
              <TypeChips value={editForm.type||"Theory"} onChange={v => setEditForm(p=>({...p,type:v}))} />
              <Text style={styles.fieldLabel}>Credits</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="star-outline" size={14} color="#64748b" style={{ marginRight:8 }} />
                <TextInput style={styles.fieldInput} value={editForm.credits}
                  onChangeText={v => setEditForm(p=>({...p,credits:v}))}
                  placeholder="e.g. 4" placeholderTextColor="#374151" keyboardType="numeric" />
              </View>
              <Pressable style={[styles.nextBtn, { marginTop:20 }, saving && { opacity:0.6 }]}
                onPress={handleEditSave} disabled={saving}>
                <LinearGradient colors={["#f59e0b","#d97706"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.nextBtnGrad}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="save-outline" size={17} color="#fff" /><Text style={styles.nextBtnText}>Save Changes</Text></>
                  }
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex:1, backgroundColor:"#080d17" },
  center:        { flex:1, justifyContent:"center", alignItems:"center" },
  header:        { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:12, justifyContent:"space-between" },
  backBtn:       { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:  { flex:1, alignItems:"center" },
  headerTitle:   { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:     { color:"#64748b", fontSize:10, marginTop:2 },
  headerRight:   { flexDirection:"row", gap:8 },
  iconBtn:       { width:38, height:38, borderRadius:11, justifyContent:"center", alignItems:"center", borderWidth:1 },
  collegeBadge:  { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(52,211,153,0.08)", marginHorizontal:16, marginTop:8, padding:8, borderRadius:10, borderWidth:1, borderColor:"rgba(52,211,153,0.2)" },
  collegeBadgeText:{ color:"#34d399", fontSize:11, fontWeight:"600", flex:1 },
  searchBar:     { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#1a2535", marginHorizontal:16, marginTop:10, borderRadius:12, paddingHorizontal:12, paddingVertical:2, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  searchInput:   { flex:1, color:"#fff", fontSize:14, paddingVertical:10 },
  filterRow:     { marginTop:8, maxHeight:44 },
  filterContent: { paddingHorizontal:16, gap:8, alignItems:"center" },
  chip:          { paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", backgroundColor:"rgba(255,255,255,0.04)" },
  chipText:      { color:"#64748b", fontSize:11, fontWeight:"600" },
  list:          { padding:16, paddingBottom:30 },
  card:          { backgroundColor:"#1a2535", borderRadius:14, marginBottom:9, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.04)", flexDirection:"row", alignItems:"center" },
  cardAccent:    { width:3, alignSelf:"stretch" },
  iconBox:       { width:40, height:40, borderRadius:11, justifyContent:"center", alignItems:"center", margin:11 },
  cardBody:      { flex:1, paddingVertical:11, paddingRight:4 },
  cardName:      { color:"#fff", fontSize:13, fontWeight:"700" },
  cardMetaRow:   { flexDirection:"row", alignItems:"center", gap:5, marginTop:4, marginBottom:3, flexWrap:"wrap" },
  codeBadge:     { paddingHorizontal:7, paddingVertical:2, borderRadius:5 },
  codeBadgeText: { fontSize:9, fontWeight:"800" },
  semBadge:      { paddingHorizontal:7, paddingVertical:2, borderRadius:5, backgroundColor:"rgba(167,139,250,0.15)" },
  semBadgeText:  { color:"#a78bfa", fontSize:9, fontWeight:"700" },
  typeBadge:     { paddingHorizontal:7, paddingVertical:2, borderRadius:5 },
  typeBadgeText: { fontSize:9, fontWeight:"800" },
  cardDept:      { color:"#64748b", fontSize:10 },
  cardActions:   { flexDirection:"column", gap:5, paddingRight:10 },
  editBtn:       { width:32, height:32, borderRadius:9, backgroundColor:"rgba(245,158,11,0.12)", justifyContent:"center", alignItems:"center" },
  deleteBtn:     { width:32, height:32, borderRadius:9, backgroundColor:"rgba(248,113,113,0.12)", justifyContent:"center", alignItems:"center" },
  emptyState:    { alignItems:"center", paddingTop:60, gap:12 },
  emptyIcon:     { width:72, height:72, borderRadius:36, backgroundColor:"#1a2535", justifyContent:"center", alignItems:"center" },
  emptyTitle:    { color:"#374151", fontSize:15, fontWeight:"700" },
  emptySub:      { color:"#1f2937", fontSize:12 },
  emptyBtns:     { flexDirection:"row", gap:10, marginTop:4 },
  emptyAddBtn:   { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:16, paddingVertical:10, borderRadius:10, backgroundColor:"rgba(52,211,153,0.08)", borderWidth:1, borderColor:"rgba(52,211,153,0.25)" },
  emptyAddText:  { color:"#34d399", fontWeight:"700", fontSize:12 },
  // Sheet / modal
  modalOverlay:  { flex:1, backgroundColor:"rgba(0,0,0,0.82)", justifyContent:"flex-end" },
  sheet:         { backgroundColor:"#0f1923", borderTopLeftRadius:26, borderTopRightRadius:26, maxHeight:height*0.94, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  handle:        { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:4 },
  sheetHeader:   { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:12 },
  sheetBackBtn:  { width:36, height:36, borderRadius:10, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  closeBtn:      { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  sheetTitle:    { color:"#fff", fontSize:15, fontWeight:"800" },
  sheetSub:      { color:"#64748b", fontSize:11, marginTop:2 },
  sheetBody:     { padding:20, paddingBottom:20 },
  sheetFooter:   { padding:16, paddingBottom:28, borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.06)" },
  // Wizard content
  collegeInfoBanner:{ flexDirection:"row", alignItems:"center", gap:7, backgroundColor:"rgba(52,211,153,0.08)", padding:10, borderRadius:10, borderWidth:1, borderColor:"rgba(52,211,153,0.2)", marginBottom:16 },
  collegeInfoText:  { color:"#34d399", fontSize:11, fontWeight:"600", flex:1 },
  hint:          { color:"#94a3b8", fontSize:13, marginBottom:16, lineHeight:20 },
  chipGrid:      { flexDirection:"row", flexWrap:"wrap", gap:10 },
  deptChip:      { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:13, paddingVertical:9, borderRadius:11, backgroundColor:"#1a2535", borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  deptChipText:  { color:"#64748b", fontSize:12, fontWeight:"700" },
  selectedBadge: { flexDirection:"row", alignItems:"center", gap:7, backgroundColor:"rgba(52,211,153,0.08)", padding:10, borderRadius:10, borderWidth:1, borderColor:"rgba(52,211,153,0.2)", marginTop:14 },
  selectedBadgeText:{ color:"#34d399", fontSize:12, fontWeight:"600", flex:1 },
  semGrid:       { flexDirection:"row", flexWrap:"wrap", gap:11 },
  semBox:        { width:(width-72)/4, aspectRatio:1, borderRadius:13, backgroundColor:"#1a2535", borderWidth:1, borderColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  semBoxNum:     { color:"#fff", fontSize:21, fontWeight:"800" },
  semBoxLabel:   { color:"#64748b", fontSize:9, marginTop:2 },
  previewBox:    { flexDirection:"row", alignItems:"center", gap:7, backgroundColor:"rgba(52,211,153,0.08)", padding:11, borderRadius:10, borderWidth:1, borderColor:"rgba(52,211,153,0.2)", marginTop:14 },
  previewText:   { color:"#34d399", fontSize:12, fontWeight:"600", flex:1 },
  countChips:    { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:8 },
  countChip:     { width:50, height:50, borderRadius:13, backgroundColor:"#1a2535", borderWidth:1, borderColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  countChipText: { color:"#94a3b8", fontSize:17, fontWeight:"800" },
  orText:        { color:"#374151", fontSize:12, textAlign:"center", marginVertical:10 },
  countInputWrap:{ flexDirection:"row", alignItems:"center", backgroundColor:"rgba(255,255,255,0.06)", borderRadius:11, paddingHorizontal:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  countInput:    { flex:1, color:"#fff", fontSize:19, fontWeight:"700", paddingVertical:13 },
  countSuffix:   { color:"#64748b", fontSize:13 },
  // Step indicator
  stepRow:       { flexDirection:"row", alignItems:"center", paddingHorizontal:20, marginBottom:8 },
  stepDot:       { width:24, height:24, borderRadius:12, justifyContent:"center", alignItems:"center" },
  stepNum:       { fontSize:10, fontWeight:"700" },
  stepLine:      { flex:1, height:2, marginHorizontal:4 },
  // Subject form card
  subCard:       { backgroundColor:"rgba(255,255,255,0.04)", borderRadius:14, padding:14, marginBottom:12, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  subCardHeader: { flexDirection:"row", alignItems:"center", gap:9, marginBottom:5 },
  subNumBadge:   { width:27, height:27, borderRadius:14, backgroundColor:"rgba(52,211,153,0.2)", justifyContent:"center", alignItems:"center" },
  subNum:        { color:"#34d399", fontSize:12, fontWeight:"800" },
  subCardTitle:  { color:"#fff", fontSize:13, fontWeight:"700" },
  subCardPreview:{ color:"#64748b", fontSize:11, flex:1 },
  fieldLabel:    { color:"#64748b", fontSize:11, fontWeight:"600", marginBottom:5, marginTop:9 },
  fieldRow:      { flexDirection:"row", alignItems:"center", backgroundColor:"rgba(255,255,255,0.06)", borderRadius:10, paddingHorizontal:11, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", minHeight:44 },
  fieldInput:    { flex:1, color:"#fff", fontSize:13, paddingVertical:11 },
  typeRow:       { flexDirection:"row", gap:7, marginBottom:3 },
  typeChip:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:4, paddingVertical:9, borderRadius:10, borderWidth:1.5 },
  typeChipText:  { fontSize:11, fontWeight:"700", color:"#64748b" },
  // Edit badge
  editInfoBadge: { flexDirection:"row", alignItems:"center", gap:7, backgroundColor:"rgba(167,139,250,0.08)", padding:11, borderRadius:10, borderWidth:1, borderColor:"rgba(167,139,250,0.2)", marginBottom:14 },
  editInfoText:  { color:"#a78bfa", fontSize:12, flex:1 },
  // Next btn
  nextBtn:       { borderRadius:13, overflow:"hidden" },
  nextBtnGrad:   { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:9, paddingVertical:15 },
  nextBtnText:   { color:"#fff", fontWeight:"800", fontSize:15 },
  // Excel import
  importStats:   { flexDirection:"row", gap:10, marginBottom:14 },
  importStat:    { flex:1, backgroundColor:"#1a2535", borderRadius:11, padding:11, alignItems:"center", borderTopWidth:2 },
  importStatNum: { fontSize:21, fontWeight:"900" },
  importStatLabel:{ color:"#64748b", fontSize:10, fontWeight:"700", marginTop:3 },
  importHintBox: { backgroundColor:"rgba(255,255,255,0.03)", borderRadius:11, padding:13, marginBottom:14, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  importHintTitle:{ color:"#fff", fontSize:12, fontWeight:"700", marginBottom:7 },
  importHintReq: { color:"#f87171", fontSize:12, fontWeight:"700", marginBottom:4 },
  importHintOpt: { color:"#64748b", fontSize:11, marginBottom:6 },
  importHintNote:{ color:"#374151", fontSize:11, lineHeight:17 },
  sectionHead:   { color:"#34d399", fontSize:12, fontWeight:"800", marginBottom:8 },
  previewRowCard:{ backgroundColor:"rgba(255,255,255,0.03)", borderRadius:9, padding:11, marginBottom:7, borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  previewRowName:{ color:"#fff", fontSize:13, fontWeight:"700" },
  previewRowTags:{ flexDirection:"row", gap:5, marginTop:5, flexWrap:"wrap" },
  previewTag:    { backgroundColor:"rgba(52,211,153,0.12)", paddingHorizontal:7, paddingVertical:2, borderRadius:5 },
  previewTagText:{ color:"#34d399", fontSize:10, fontWeight:"700" },
  moreText:      { color:"#374151", fontSize:11, textAlign:"center", marginBottom:8 },
  errorRow:      { backgroundColor:"rgba(248,113,113,0.08)", borderRadius:8, padding:9, marginBottom:5, borderWidth:1, borderColor:"rgba(248,113,113,0.2)" },
  errorRowText:  { color:"#f87171", fontSize:11 },
  noRowsText:    { color:"#f87171", fontSize:13, marginTop:10 },
  importBtn:     { borderRadius:13, overflow:"hidden" },
  importBtnGrad: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:9, paddingVertical:15 },
  importBtnText: { color:"#fff", fontWeight:"800", fontSize:15 },
  importingWrap: { alignItems:"center", padding:44, gap:13 },
  importRingWrap:{ width:90, height:90, justifyContent:"center", alignItems:"center" },
  importPct:     { color:"#34d399", fontSize:22, fontWeight:"900" },
  importingTitle:{ color:"#fff", fontSize:17, fontWeight:"800" },
  importingCount:{ color:"#34d399", fontSize:13, fontWeight:"700" },
  progressTrack: { width:width-80, height:7, backgroundColor:"rgba(255,255,255,0.08)", borderRadius:5, overflow:"hidden" },
  progressFill:  { height:7, backgroundColor:"#34d399", borderRadius:5 },
  importingHint: { color:"#374151", fontSize:11 },
});