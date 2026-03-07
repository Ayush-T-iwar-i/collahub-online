import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  TextInput, StatusBar, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Alert, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { height, width } = Dimensions.get("window");

// ✅ Full names — DB se match hoga
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

// ✅ Short labels for filter chips (display only)
const COLLEGE_SHORT = {
  "Nims Institute of Engineering and Technology": "NIET",
  "Nims College of Management Studies": "NCMS",
  "Nims College of Nursing": "NCN",
  "Nims College of Pharmacy": "NCP",
  "Nims College of Law": "NCL",
  "Nims College of Dental": "NCD",
};

const COLLEGES = Object.keys(COLLEGE_DEPARTMENTS);
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const TYPES = ["Theory", "Lab", "Both"];

const DEPT_COLORS = {
  CSE: "#00c6ff", ECE: "#a78bfa", ME: "#f59e0b",
  CE: "#34d399", IT: "#f87171", EE: "#60a5fa",
  AI: "#fb923c", DATA: "#34d399",
};
const getColor = (dept = "") => {
  const key = Object.keys(DEPT_COLORS).find(k => dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#34d399";
};
const TYPE_COLORS = { Theory: "#00c6ff", Lab: "#f59e0b", Both: "#a78bfa" };
const EMPTY_SUB_FORM = { name: "", code: "", type: "Theory", credits: "", description: "" };

// ─────────────────────────────────────────
// Subject Card
// ─────────────────────────────────────────
const SubjectCard = ({ item, onEdit, onDelete }) => {
  const color = getColor(item.department);
  const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";
  const typeColor = TYPE_COLORS[item.type] || "#64748b";
  // ✅ Short college name for card display
  const collegeShort = COLLEGE_SHORT[item.college] || item.college?.split(" ")[0] || "";
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
        <Ionicons name="book" size={18} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardMetaRow}>
          {item.code && (
            <View style={[styles.codeBadge, { backgroundColor: color + "20" }]}>
              <Text style={[styles.codeBadgeText, { color }]}>{item.code}</Text>
            </View>
          )}
          <View style={styles.semBadge}>
            <Text style={styles.semBadgeText}>Sem {item.semester}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "25" }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
              {item.type ?? "Theory"}
            </Text>
          </View>
        </View>
        <View style={styles.cardInfoRow}>
          <Ionicons name="business-outline" size={11} color="#64748b" />
          <Text style={styles.cardInfoText}>{collegeShort}</Text>
          <Text style={styles.cardInfoDot}>·</Text>
          <Text style={styles.cardInfoText}>{deptShort}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={14} color="#f59e0b" />
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash" size={14} color="#f87171" />
        </Pressable>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────
// Chip Row (wizard mein)
// ─────────────────────────────────────────
const ChipRow = ({ options, value, onSelect, getChipColor, shortLabels }) => (
  <View style={styles.chipGrid}>
    {options.map(opt => {
      const c = getChipColor ? getChipColor(opt) : "#34d399";
      const selected = value === opt;
      const label = shortLabels?.[opt] || opt;
      return (
        <Pressable
          key={opt}
          style={[styles.chip, selected && { backgroundColor: c + "22", borderColor: c + "66" }]}
          onPress={() => onSelect(opt)}
        >
          {selected && <Ionicons name="checkmark-circle" size={12} color={c} />}
          <Text style={[styles.chipText, selected && { color: c }]}>{label}</Text>
        </Pressable>
      );
    })}
  </View>
);

// ─────────────────────────────────────────
// Filter Chip (top bar mein)
// ─────────────────────────────────────────
const FilterChip = ({ label, active, color, onPress }) => (
  <Pressable
    style={[styles.filterChip, active && { backgroundColor: color + "22", borderColor: color + "55" }]}
    onPress={onPress}
  >
    <Text style={[styles.filterChipText, active && { color }]}>{label}</Text>
  </Pressable>
);

// ─────────────────────────────────────────
// Step Indicator
// ─────────────────────────────────────────
const StepIndicator = ({ current, total }) => (
  <View style={styles.stepRow}>
    {Array.from({ length: total }).map((_, i) => (
      <React.Fragment key={i}>
        <View style={[
          styles.stepDot,
          i < current && { backgroundColor: "#34d399" },
          i === current && { backgroundColor: "#34d399", transform: [{ scale: 1.2 }] },
          i > current && { backgroundColor: "rgba(255,255,255,0.12)" },
        ]}>
          {i < current
            ? <Ionicons name="checkmark" size={10} color="#000" />
            : <Text style={[styles.stepNum, { color: i === current ? "#000" : "#64748b" }]}>{i + 1}</Text>
          }
        </View>
        {i < total - 1 && (
          <View style={[styles.stepLine, { backgroundColor: i < current ? "#34d399" : "rgba(255,255,255,0.08)" }]} />
        )}
      </React.Fragment>
    ))}
  </View>
);

// ─────────────────────────────────────────
// TypeChips
// ─────────────────────────────────────────
const TypeChips = ({ value, onChange }) => (
  <View style={styles.typeRow}>
    {TYPES.map(t => {
      const tc = TYPE_COLORS[t];
      const sel = value === t;
      return (
        <Pressable
          key={t}
          style={[styles.typeChip, {
            backgroundColor: sel ? tc + "22" : "#1a2535",
            borderColor: sel ? tc : "rgba(255,255,255,0.10)",
          }]}
          onPress={() => onChange(t)}
        >
          <Ionicons
            name={t === "Theory" ? "school-outline" : t === "Lab" ? "flask-outline" : "layers-outline"}
            size={14}
            color={sel ? tc : "#64748b"}
          />
          <Text style={[styles.typeChipText, sel && { color: tc, fontWeight: "800" }]}>{t}</Text>
          {sel && <Ionicons name="checkmark-circle" size={12} color={tc} />}
        </Pressable>
      );
    })}
  </View>
);

// ═══════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════
export default function ManageSubjects() {
  const router = useRouter();

  const [subjects, setSubjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selCollege, setSelCollege] = useState("All");
  const [selSem, setSelSem] = useState("All");

  const [wizardVisible, setWizardVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [wizCollege, setWizCollege] = useState("");
  const [wizDept, setWizDept] = useState("");
  const [wizSem, setWizSem] = useState("");
  const [subjectCount, setSubjectCount] = useState("");
  const [subjectForms, setSubjectForms] = useState([]);
  const [saving, setSaving] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_SUB_FORM });

  useFocusEffect(useCallback(() => { loadSubjects(); }, []));

  const loadSubjects = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/subjects");
      const data = res.data?.subjects || [];
      setSubjects(data);
      applyFiltersOnData(data, search, selCollege, selSem);
    } catch {
      Alert.alert("Error", "Could not load subjects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFiltersOnData = (data, q, college, sem) => {
    let r = [...data];
    if (q.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(s =>
        s.name?.toLowerCase().includes(lq) ||
        s.code?.toLowerCase().includes(lq) ||
        s.department?.toLowerCase().includes(lq)
      );
    }
    // ✅ Full name se compare karo (DB mein full name hai)
    if (college !== "All") r = r.filter(s => s.college === college);
    if (sem !== "All") r = r.filter(s => String(s.semester) === sem);
    setFiltered(r);
  };

  const applyFilters = (q, college, sem) => applyFiltersOnData(subjects, q, college, sem);

  // ─── Wizard ───
  const openWizard = () => {
    setStep(0);
    setWizCollege(""); setWizDept(""); setWizSem("");
    setSubjectCount(""); setSubjectForms([]);
    setWizardVisible(true);
  };

  const wizNext = () => {
    if (step === 0 && !wizCollege) return Alert.alert("⚠️", "Please select a college");
    if (step === 1 && !wizDept) return Alert.alert("⚠️", "Please select a department");
    if (step === 2 && !wizSem) return Alert.alert("⚠️", "Please select a semester");
    if (step === 3) {
      const n = parseInt(subjectCount);
      if (!n || n < 1 || n > 20) return Alert.alert("Error", "Enter valid count (1–20)");
      const forms = Array.from({ length: n }, (_, i) => subjectForms[i] || { ...EMPTY_SUB_FORM });
      setSubjectForms(forms);
    }
    setStep(p => p + 1);
  };

  const wizBack = () => setStep(p => Math.max(0, p - 1));

  const updateSubjectForm = (idx, key, val) => {
    setSubjectForms(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };
      return arr;
    });
  };

  const handleWizardSave = async () => {
    for (let i = 0; i < subjectForms.length; i++) {
      const s = subjectForms[i];
      if (!s.name?.trim()) return Alert.alert("Error", `Subject ${i + 1}: Name required`);
      if (!s.code?.trim()) return Alert.alert("Error", `Subject ${i + 1}: Code required`);
    }
    try {
      setSaving(true);
      let success = 0, fail = 0, failMsg = "";
      for (const s of subjectForms) {
        try {
          await API.post("/subjects/create", {
            name: s.name.trim(),
            code: s.code.trim().toUpperCase(),
            type: s.type || "Theory",
            college: wizCollege,   // ✅ Full name save hoga
            department: wizDept,
            semester: Number(wizSem),
            credits: Number(s.credits) || 0,
            description: s.description?.trim() || "",
          });
          success++;
        } catch (e) {
          fail++;
          failMsg = e.response?.data?.message || "Unknown error";
        }
      }
      setWizardVisible(false);
      await loadSubjects();
      if (fail > 0) {
        Alert.alert("Done ✅", `${success} added, ${fail} failed\n${failMsg}`);
      } else {
        Alert.alert("Done! ✅", `${success} subject${success > 1 ? "s" : ""} added!`);
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit ───
  const openEdit = (subject) => {
    setEditingSubject(subject);
    setEditForm({
      name: subject.name || "",
      code: subject.code || "",
      type: subject.type || "Theory",
      credits: String(subject.credits || ""),
      description: subject.description || "",
    });
    setEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) return Alert.alert("Error", "Name required");
    if (!editForm.code.trim()) return Alert.alert("Error", "Code required");
    try {
      setSaving(true);
      const res = await API.put(`/subjects/${editingSubject._id}`, {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        type: editForm.type || "Theory",
        credits: Number(editForm.credits) || 0,
        description: editForm.description?.trim() || "",
      });
      const updated = res.data?.subject;
      if (updated) {
        setSubjects(prev => prev.map(s => s._id === updated._id ? updated : s));
        setFiltered(prev => prev.map(s => s._id === updated._id ? updated : s));
      }
      setEditModal(false);
      Alert.alert("Updated! ✅");
      loadSubjects();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not update");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───
  const handleDelete = (subject) => {
    Alert.alert("Delete Subject", `Delete "${subject.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await API.delete(`/subjects/${subject._id}`);
            setSubjects(prev => prev.filter(s => s._id !== subject._id));
            setFiltered(prev => prev.filter(s => s._id !== subject._id));
          } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Could not delete");
          }
        },
      },
    ]);
  };

  const STEP_TITLES = [
    "Select College", "Select Department", "Select Semester",
    "How Many Subjects?", "Enter Subject Details",
  ];
  const TOTAL_STEPS = 5;

  // ✅ Available departments based on selected college
  const availableDepts = COLLEGE_DEPARTMENTS[wizCollege] || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Subjects</Text>
          <Text style={styles.headerSub}>{filtered.length} subjects</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openWizard}>
          <Ionicons name="add" size={22} color="#34d399" />
        </Pressable>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subjects..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={t => { setSearch(t); applyFilters(t, selCollege, selSem); }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(""); applyFilters("", selCollege, selSem); }}>
            <Ionicons name="close-circle" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* ✅ College Filter — short labels dikhenge (NIET, NCMS etc) */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          <FilterChip label="All" active={selCollege === "All"} color="#34d399"
            onPress={() => { setSelCollege("All"); applyFilters(search, "All", selSem); }} />
          {COLLEGES.map(c => (
            <FilterChip
              key={c}
              label={COLLEGE_SHORT[c]}        // ✅ "NIET" dikhega, full name save hoga
              active={selCollege === c}
              color="#34d399"
              onPress={() => { setSelCollege(c); applyFilters(search, c, selSem); }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Semester Filter */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {["All", ...SEMESTERS].map(s => (
            <FilterChip key={s} label={s === "All" ? "All Sem" : `Sem ${s}`}
              active={selSem === s} color="#a78bfa"
              onPress={() => { setSelSem(s); applyFilters(search, selCollege, s); }} />
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading
        ? <View style={styles.center}><ActivityIndicator size="large" color="#34d399" /></View>
        : (
          <FlatList
            data={filtered}
            keyExtractor={i => i._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadSubjects(true)} tintColor="#34d399" />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="book-outline" size={40} color="#374151" />
                </View>
                <Text style={styles.emptyTitle}>No Subjects Found</Text>
                <Pressable style={styles.emptyAddBtn} onPress={openWizard}>
                  <Ionicons name="add-circle-outline" size={16} color="#34d399" />
                  <Text style={styles.emptyAddText}>Add Subjects</Text>
                </Pressable>
              </View>
            )}
            renderItem={({ item }) => (
              <SubjectCard item={item} onEdit={openEdit} onDelete={handleDelete} />
            )}
          />
        )
      }

      {/* WIZARD MODAL */}
      <Modal visible={wizardVisible} transparent animationType="slide"
        onRequestClose={() => setWizardVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.wizSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.wizHeader}>
              {step > 0
                ? <Pressable onPress={wizBack} style={styles.wizBackBtn}>
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                </Pressable>
                : <View style={{ width: 36 }} />
              }
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.wizTitle}>{STEP_TITLES[step]}</Text>
                <Text style={styles.wizSub}>Step {step + 1} of {TOTAL_STEPS}</Text>
              </View>
              <Pressable onPress={() => setWizardVisible(false)} style={styles.wizCloseBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>

            <StepIndicator current={step} total={TOTAL_STEPS} />

            <ScrollView showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.wizBody}>

              {/* ✅ Step 0: College — short labels dikhenge */}
              {step === 0 && (
                <>
                  <Text style={styles.wizHint}>Which college are these subjects for?</Text>
                  <ChipRow
                    options={COLLEGES}
                    value={wizCollege}
                    onSelect={v => { setWizCollege(v); setWizDept(""); }}
                    getChipColor={() => "#34d399"}
                    shortLabels={COLLEGE_SHORT}   // ✅ "NIET" dikhega
                  />
                  {wizCollege && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="business" size={14} color="#34d399" />
                      <Text style={styles.selectedBadgeText}>
                        {COLLEGE_SHORT[wizCollege]} — {wizCollege} ✅
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* ✅ Step 1: Department — sirf selected college ke depts */}
              {step === 1 && (
                <>
                  <Text style={styles.wizHint}>
                    Select department for{" "}
                    <Text style={{ color: "#34d399" }}>{COLLEGE_SHORT[wizCollege]}</Text>
                  </Text>
                  {availableDepts.length === 0 ? (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                      <Text style={[styles.selectedBadgeText, { color: "#f59e0b" }]}>
                        No departments found for this college
                      </Text>
                    </View>
                  ) : (
                    <ChipRow
                      options={availableDepts}
                      value={wizDept}
                      onSelect={setWizDept}
                      getChipColor={getColor}
                    />
                  )}
                  {wizDept && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="school" size={14} color="#34d399" />
                      <Text style={styles.selectedBadgeText} numberOfLines={2}>{wizDept} ✅</Text>
                    </View>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.wizHint}>Which semester?</Text>
                  <View style={styles.semGrid}>
                    {SEMESTERS.map(s => (
                      <Pressable key={s}
                        style={[styles.semBox, wizSem === s && { backgroundColor: "rgba(52,211,153,0.2)", borderColor: "#34d399" }]}
                        onPress={() => setWizSem(s)}>
                        <Text style={[styles.semBoxNum, wizSem === s && { color: "#34d399" }]}>{s}</Text>
                        <Text style={styles.semBoxLabel}>Sem</Text>
                      </Pressable>
                    ))}
                  </View>
                  {wizCollege && wizDept && wizSem && (
                    <View style={styles.previewBox}>
                      <Ionicons name="checkmark-circle" size={14} color="#34d399" />
                      <Text style={styles.previewText}>
                        {COLLEGE_SHORT[wizCollege]} · {wizDept.match(/\(([^)]+)\)/)?.[1] || wizDept.split(" ")[0]} · Sem {wizSem}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={styles.wizHint}>
                    How many subjects for{" "}
                    <Text style={{ color: "#34d399" }}>{COLLEGE_SHORT[wizCollege]} · Sem {wizSem}</Text>?
                  </Text>
                  <View style={styles.countChips}>
                    {["1", "2", "3", "4", "5", "6", "7", "8"].map(n => (
                      <Pressable key={n}
                        style={[styles.countChip, subjectCount === n && { backgroundColor: "rgba(52,211,153,0.2)", borderColor: "#34d399" }]}
                        onPress={() => setSubjectCount(n)}>
                        <Text style={[styles.countChipText, subjectCount === n && { color: "#34d399" }]}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.wizOrText}>— or type manually —</Text>
                  <View style={styles.countInputWrap}>
                    <TextInput style={styles.countInput} value={subjectCount}
                      onChangeText={setSubjectCount} keyboardType="numeric"
                      placeholder="e.g. 6" placeholderTextColor="#374151" maxLength={2} />
                    <Text style={styles.countInputSuffix}>subjects</Text>
                  </View>
                </>
              )}

              {step === 4 && (
                <>
                  <Text style={styles.wizHint}>Fill details for each subject ({subjectForms.length} total)</Text>
                  {subjectForms.map((sf, idx) => (
                    <View key={idx} style={styles.subFormCard}>
                      <View style={styles.subFormHeader}>
                        <View style={styles.subFormNumBadge}>
                          <Text style={styles.subFormNum}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.subFormTitle}>Subject {idx + 1}</Text>
                        {sf.name ? <Text style={styles.subFormPreview} numberOfLines={1}>{sf.name}</Text> : null}
                      </View>

                      <Text style={styles.subFieldLabel}>Subject Name *</Text>
                      <View style={styles.subFieldRow}>
                        <Ionicons name="book-outline" size={15} color="#64748b" style={{ marginRight: 8 }} />
                        <TextInput style={styles.subFieldInput} value={sf.name}
                          onChangeText={v => updateSubjectForm(idx, "name", v)}
                          placeholder="e.g. Data Structures" placeholderTextColor="#374151" />
                      </View>

                      <Text style={styles.subFieldLabel}>Subject Code *</Text>
                      <View style={styles.subFieldRow}>
                        <Ionicons name="code-slash" size={15} color="#64748b" style={{ marginRight: 8 }} />
                        <TextInput style={styles.subFieldInput} value={sf.code}
                          onChangeText={v => updateSubjectForm(idx, "code", v)}
                          placeholder="e.g. CS301" placeholderTextColor="#374151"
                          autoCapitalize="characters" />
                      </View>

                      <Text style={styles.subFieldLabel}>Type *</Text>
                      <TypeChips value={sf.type || "Theory"} onChange={v => updateSubjectForm(idx, "type", v)} />

                      <Text style={styles.subFieldLabel}>Credits (optional)</Text>
                      <View style={styles.subFieldRow}>
                        <Ionicons name="star-outline" size={15} color="#64748b" style={{ marginRight: 8 }} />
                        <TextInput style={styles.subFieldInput} value={sf.credits}
                          onChangeText={v => updateSubjectForm(idx, "credits", v)}
                          placeholder="e.g. 4" placeholderTextColor="#374151" keyboardType="numeric" />
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.wizFooter}>
              {step < 4 ? (
                <Pressable style={styles.nextBtn} onPress={wizNext}>
                  <LinearGradient colors={["#10b981", "#059669"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                    <Text style={styles.nextBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable style={[styles.nextBtn, saving && { opacity: 0.6 }]}
                  onPress={handleWizardSave} disabled={saving}>
                  <LinearGradient colors={["#10b981", "#059669"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                    {saving
                      ? <ActivityIndicator color="#fff" />
                      : <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.nextBtnText}>
                          Add {subjectForms.length} Subject{subjectForms.length > 1 ? "s" : ""}
                        </Text>
                      </>
                    }
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={editModal} transparent animationType="slide"
        onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.wizHeader}>
              <View style={{ width: 36 }} />
              <Text style={[styles.wizTitle, { flex: 1, textAlign: "center" }]}>Edit Subject</Text>
              <Pressable onPress={() => setEditModal(false)} style={styles.wizCloseBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>

              {editingSubject && (
                <View style={styles.editInfoBox}>
                  <Ionicons name="information-circle" size={14} color="#a78bfa" />
                  <Text style={styles.editInfoText}>
                    {COLLEGE_SHORT[editingSubject.college] || editingSubject.college} ·{" "}
                    {editingSubject.department?.match(/\(([^)]+)\)/)?.[1] || editingSubject.department?.split(" ")[0]} ·{" "}
                    Sem {editingSubject.semester}
                  </Text>
                </View>
              )}

              <Text style={styles.subFieldLabel}>Subject Name *</Text>
              <View style={styles.subFieldRow}>
                <Ionicons name="book-outline" size={15} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput style={styles.subFieldInput} value={editForm.name}
                  onChangeText={v => setEditForm(p => ({ ...p, name: v }))}
                  placeholderTextColor="#374151" placeholder="Subject name" />
              </View>

              <Text style={styles.subFieldLabel}>Subject Code *</Text>
              <View style={styles.subFieldRow}>
                <Ionicons name="code-slash" size={15} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput style={styles.subFieldInput} value={editForm.code}
                  onChangeText={v => setEditForm(p => ({ ...p, code: v }))}
                  placeholderTextColor="#374151" placeholder="Subject code"
                  autoCapitalize="characters" />
              </View>

              <Text style={styles.subFieldLabel}>Type *</Text>
              <TypeChips
                value={editForm.type || "Theory"}
                onChange={v => setEditForm(p => ({ ...p, type: v }))}
              />

              <Text style={styles.subFieldLabel}>Credits</Text>
              <View style={styles.subFieldRow}>
                <Ionicons name="star-outline" size={15} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput style={styles.subFieldInput} value={editForm.credits}
                  onChangeText={v => setEditForm(p => ({ ...p, credits: v }))}
                  placeholderTextColor="#374151" placeholder="e.g. 4" keyboardType="numeric" />
              </View>

              <Pressable style={[styles.nextBtn, { marginTop: 20 }, saving && { opacity: 0.6 }]}
                onPress={handleEditSave} disabled={saving}>
                <LinearGradient colors={["#f59e0b", "#d97706"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={styles.nextBtnText}>Save Changes</Text>
                    </>
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
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(52,211,153,0.15)", justifyContent: "center", alignItems: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1a2535", marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },
  chipsRow: { height: 46, justifyContent: "center", marginTop: 4 },
  chipsContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  filterChip: { height: 30, paddingHorizontal: 14, borderRadius: 15, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  filterChipText: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 30 },
  card: { backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", flexDirection: "row", alignItems: "center" },
  cardAccent: { width: 3, alignSelf: "stretch" },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", margin: 12 },
  cardBody: { flex: 1, paddingVertical: 12, paddingRight: 4 },
  cardName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 4, flexWrap: "wrap" },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  codeBadgeText: { fontSize: 10, fontWeight: "800" },
  semBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(167,139,250,0.15)" },
  semBadgeText: { color: "#a78bfa", fontSize: 10, fontWeight: "700" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: "800" },
  cardInfoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardInfoText: { color: "#64748b", fontSize: 11 },
  cardInfoDot: { color: "#374151", fontSize: 11 },
  cardActions: { flexDirection: "column", gap: 6, paddingRight: 12 },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.12)", justifyContent: "center", alignItems: "center" },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(248,113,113,0.12)", justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 16 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(52,211,153,0.1)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  emptyAddText: { color: "#34d399", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  wizSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.93, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  editSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.85, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  wizHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  wizBackBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  wizCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  wizTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  wizSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  wizBody: { padding: 20, paddingBottom: 20 },
  wizHint: { color: "#94a3b8", fontSize: 13, marginBottom: 16, lineHeight: 20 },
  wizFooter: { padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  wizOrText: { color: "#374151", fontSize: 12, textAlign: "center", marginVertical: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 8 },
  stepDot: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  stepNum: { fontSize: 10, fontWeight: "700" },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  selectedBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.08)", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", marginTop: 16 },
  selectedBadgeText: { color: "#34d399", fontSize: 12, fontWeight: "600", flex: 1 },
  semGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  semBox: { width: (width - 72) / 4, aspectRatio: 1, borderRadius: 14, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  semBoxNum: { color: "#fff", fontSize: 22, fontWeight: "800" },
  semBoxLabel: { color: "#64748b", fontSize: 10, marginTop: 2 },
  countChips: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  countChip: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  countChipText: { color: "#94a3b8", fontSize: 18, fontWeight: "800" },
  countInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  countInput: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "700", paddingVertical: 14 },
  countInputSuffix: { color: "#64748b", fontSize: 13 },
  subFormCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  subFormHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  subFormNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(52,211,153,0.2)", justifyContent: "center", alignItems: "center" },
  subFormNum: { color: "#34d399", fontSize: 13, fontWeight: "800" },
  subFormTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  subFormPreview: { color: "#64748b", fontSize: 11, flex: 1 },
  subFieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "600", marginBottom: 6, marginTop: 10 },
  subFieldRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", minHeight: 46 },
  subFieldInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  typeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  typeChipText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  previewBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.08)", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", marginTop: 16 },
  previewText: { color: "#34d399", fontSize: 12, fontWeight: "600", flex: 1 },
  editInfoBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(167,139,250,0.08)", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(167,139,250,0.2)", marginBottom: 16 },
  editInfoText: { color: "#a78bfa", fontSize: 12, flex: 1 },
  nextBtn: { borderRadius: 14, overflow: "hidden" },
  nextBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});