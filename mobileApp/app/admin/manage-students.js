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

const COLLEGES = [
  "Nims Institute of Engineering and Technology",
  "Nims College of Management Studies",
  "Nims College of Nursing",
  "Nims College of Pharmacy",
  "Nims College of Law",
  "Nims College of Dental",
];
const DEPARTMENTS = [
  "Computer Science Engineering (CSE)",
  "Information Technology (IT)",
  "Electronics and Communication Engineering (ECE)",
  "Electrical Engineering (EE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering",
  "Chemical Engineering",
  "Artificial Intelligence & Machine Learning",
  "Data Science Engineering",
];
const SEMESTERS = ["1","2","3","4","5","6","7","8"];
const GENDERS   = ["Male","Female","Other"];

const COLLEGE_SHORT = {
  "Nims Institute of Engineering and Technology": "NIET",
  "Nims College of Management Studies": "NCMS",
  "Nims College of Nursing": "Nursing",
  "Nims College of Pharmacy": "Pharmacy",
  "Nims College of Law": "Law",
  "Nims College of Dental": "Dental",
};

const DEPT_COLORS = [
  "#00c6ff","#34d399","#f59e0b","#a78bfa",
  "#f87171","#fb923c","#60a5fa","#e879f9","#4ade80",
];

const EMPTY_FORM = {
  name:"", email:"", phone:"", studentId:"",
  admissionYear:"", college:"", department:"",
  semester:"", gender:"", password:"",
};

// section label: "CSE 2023"
const getSectionLabel = (admissionYear, department) => {
  if (!admissionYear || !department) return null;
  const short = department.match(/\(([^)]+)\)/)?.[1] || department.split(" ")[0];
  return `${short} ${admissionYear}`;
};

// ── Breadcrumb ──
const Breadcrumb = ({ college, department, year, onPress }) => (
  <View style={styles.breadcrumb}>
    <Pressable onPress={() => onPress("colleges")}>
      <Text style={[styles.bcItem, !college && styles.bcActive]}>All Colleges</Text>
    </Pressable>
    {college && (
      <>
        <Ionicons name="chevron-forward" size={11} color="#374151" />
        <Pressable onPress={() => onPress("departments")}>
          <Text style={[styles.bcItem, college && !department && styles.bcActive]}>
            {COLLEGE_SHORT[college] || college.split(" ")[0]}
          </Text>
        </Pressable>
      </>
    )}
    {department && (
      <>
        <Ionicons name="chevron-forward" size={11} color="#374151" />
        <Pressable onPress={() => onPress("years")}>
          <Text style={[styles.bcItem, department && !year && styles.bcActive]} numberOfLines={1}>
            {department.match(/\(([^)]+)\)/)?.[1] || department.split(" ")[0]}
          </Text>
        </Pressable>
      </>
    )}
    {year && (
      <>
        <Ionicons name="chevron-forward" size={11} color="#374151" />
        <Text style={[styles.bcItem, styles.bcActive]}>{year}</Text>
      </>
    )}
  </View>
);

// ── College Card ──
const CollegeCard = ({ name, count, onPress }) => (
  <Pressable style={styles.browseCard} onPress={onPress}>
    <View style={styles.browseIconWrap}>
      <Ionicons name="business" size={24} color="#a78bfa" />
    </View>
    <View style={styles.browseInfo}>
      <Text style={styles.browseName} numberOfLines={2}>{name}</Text>
      <Text style={styles.browseCount}>{count} students</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#374151" />
  </Pressable>
);

// ── Department Card ──
const DeptCard = ({ name, count, colorIdx, onPress }) => {
  const color = DEPT_COLORS[colorIdx % DEPT_COLORS.length];
  const shortName = name.match(/\(([^)]+)\)/)?.[1] || name.split(" ")[0];
  return (
    <Pressable style={styles.deptCard} onPress={onPress}>
      <View style={[styles.deptAccent, { backgroundColor: color }]} />
      <View style={[styles.deptIconWrap, { backgroundColor: color + "20" }]}>
        <Ionicons name="school" size={20} color={color} />
      </View>
      <View style={styles.browseInfo}>
        <Text style={styles.browseName}>{shortName}</Text>
        <Text style={styles.browseSubName} numberOfLines={1}>{name.split("(")[0].trim()}</Text>
        <Text style={[styles.browseCount, { color }]}>{count} students</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#374151" />
    </Pressable>
  );
};

// ── Year / Batch Card ──
const YearCard = ({ year, count, dept, color, onPress }) => {
  const deptShort = dept?.match(/\(([^)]+)\)/)?.[1] || dept?.split(" ")[0] || "";
  return (
    <Pressable style={styles.yearCard} onPress={onPress}>
      <View style={[styles.yearBadgeWrap, { backgroundColor: color + "20" }]}>
        <Text style={[styles.yearBadgeYear, { color }]}>{year}</Text>
        <Text style={[styles.yearBadgeDept, { color: color + "cc" }]}>{deptShort}</Text>
      </View>
      <View style={styles.browseInfo}>
        <Text style={styles.browseName}>{deptShort} Batch {year}</Text>
        <Text style={styles.browseSubName}>Section: {deptShort} {year}</Text>
        <Text style={[styles.browseCount, { color }]}>{count} students enrolled</Text>
      </View>
      <View style={[styles.yearCountBadge, { backgroundColor: color + "15" }]}>
        <Text style={[styles.yearCountText, { color }]}>{count}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#374151" />
    </Pressable>
  );
};

// ── Student Card ──
const StudentCard = ({ item, colorIdx, onEdit, onDelete }) => {
  const color    = DEPT_COLORS[colorIdx % DEPT_COLORS.length];
  const initials = item.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "S";
  const section  = getSectionLabel(item.admissionYear, item.department);
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={[styles.avatar, { backgroundColor: color + "20" }]}>
        <Text style={[styles.avatarText, { color }]}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardBadgeRow}>
          <Text style={styles.cardSub}>{item.studentId || "—"}</Text>
          <View style={[styles.semBadge, { backgroundColor: color + "20" }]}>
            <Text style={[styles.semBadgeText, { color }]}>Sem {item.semester || "?"}</Text>
          </View>
          {section && (
            <View style={styles.sectionBadge}>
              <Ionicons name="people" size={9} color="#94a3b8" />
              <Text style={styles.sectionBadgeText}>{section}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSub} numberOfLines={1}>{item.email}</Text>
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

// ── Field ──
const Field = ({ label, icon, value, onChangeText, keyboardType, secureTextEntry, maxLength }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={15} color="#64748b" style={{ marginRight: 8 }} />
      <TextInput style={styles.fieldInput} value={value} onChangeText={onChangeText}
        placeholderTextColor="#374151" placeholder={label}
        keyboardType={keyboardType || "default"} secureTextEntry={secureTextEntry}
        autoCapitalize="none" maxLength={maxLength} />
    </View>
  </View>
);

// ── Picker ──
const Picker = ({ label, icon, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.fieldRow} onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={15} color="#64748b" style={{ marginRight: 8 }} />
        <Text style={[styles.fieldInput, { color: value ? "#fff" : "#374151", paddingVertical: 14 }]} numberOfLines={1}>
          {value || `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={13} color="#374151" />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>{label}</Text>
            <ScrollView>
              {options.map(opt => (
                <Pressable key={opt}
                  style={[styles.pickerOption, value === opt && styles.pickerOptionActive]}
                  onPress={() => { onSelect(opt); setOpen(false); }}>
                  <Text style={[styles.pickerOptionText, value === opt && { color: "#00c6ff" }]} numberOfLines={2}>{opt}</Text>
                  {value === opt && <Ionicons name="checkmark-circle" size={15} color="#00c6ff" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// ════════════════════════════════════════════════
export default function ManageStudents() {
  const router = useRouter();
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // view: "colleges" | "departments" | "years" | "students"
  const [view, setView]           = useState("colleges");
  const [selCollege, setSelCollege] = useState(null);
  const [selDept, setSelDept]     = useState(null);
  const [selYear, setSelYear]     = useState(null);
  const [search, setSearch]       = useState("");

  const [modalVisible, setModalVisible]     = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [saving, setSaving]                 = useState(false);

  useFocusEffect(useCallback(() => { loadStudents(); }, []));

  const loadStudents = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/students/all");
      setAllStudents(res.data?.students || res.data || []);
    } catch { Alert.alert("Error", "Could not load students"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  // ── Derived data ──
  const collegeData = COLLEGES.map(c => ({
    name: c,
    count: allStudents.filter(s => s.college === c).length,
  }));

  const deptData = selCollege
    ? DEPARTMENTS.map((d, i) => ({
        name: d, colorIdx: i,
        count: allStudents.filter(s => s.college === selCollege && s.department === d).length,
      })).filter(d => d.count > 0)
    : [];

  // Unique years for selected college+dept
  const yearData = (selCollege && selDept)
    ? [...new Set(
        allStudents
          .filter(s => s.college === selCollege && s.department === selDept && s.admissionYear)
          .map(s => s.admissionYear)
      )].sort()
      .map(year => ({
        year,
        count: allStudents.filter(
          s => s.college === selCollege && s.department === selDept && s.admissionYear === year
        ).length,
      }))
    : [];

  const studentData = (() => {
    let list = allStudents;
    if (selCollege) list = list.filter(s => s.college === selCollege);
    if (selDept)    list = list.filter(s => s.department === selDept);
    if (selYear)    list = list.filter(s => s.admissionYear === selYear);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return list;
  })();

  const deptColorIdx = selDept ? DEPARTMENTS.indexOf(selDept) : 0;
  const deptColor    = DEPT_COLORS[deptColorIdx % DEPT_COLORS.length];

  // ── Navigation ──
  const navTo = (target) => {
    if (target === "colleges")    { setSelCollege(null); setSelDept(null); setSelYear(null); }
    if (target === "departments") { setSelDept(null); setSelYear(null); }
    if (target === "years")       { setSelYear(null); }
    setView(target); setSearch("");
  };

  const goBack = () => {
    if (view === "students")    return navTo("years");
    if (view === "years")       return navTo("departments");
    if (view === "departments") return navTo("colleges");
    router.back();
  };

  // ── Form ──
  const openAdd = () => {
    setEditingStudent(null);
    setForm({ ...EMPTY_FORM, college: selCollege||"", department: selDept||"", admissionYear: selYear||"" });
    setModalVisible(true);
  };
  const openEdit = (s) => {
    setEditingStudent(s);
    setForm({
      name:s.name||"", email:s.email||"", phone:s.phone||"", studentId:s.studentId||"",
      admissionYear:s.admissionYear||"", college:s.college||"", department:s.department||"",
      semester:String(s.semester||""), gender:s.gender||"", password:"",
    });
    setModalVisible(true);
  };
  const handleDelete = (s) => {
    Alert.alert("Delete Student", `Delete ${s.name}?`, [
      { text:"Cancel", style:"cancel" },
      { text:"Delete", style:"destructive", onPress: async () => {
        try { await API.delete(`/students/${s._id}`); loadStudents(); }
        catch(e) { Alert.alert("Error", e.response?.data?.message||"Could not delete"); }
      }},
    ]);
  };
  const handleSave = async () => {
    if (!form.name.trim())      return Alert.alert("Error","Name is required");
    if (!form.email.trim())     return Alert.alert("Error","Email is required");
    if (!form.studentId.trim()) return Alert.alert("Error","Student ID is required");
    if (!form.college)          return Alert.alert("Error","College is required");
    if (!form.department)       return Alert.alert("Error","Department is required");
    if (!form.semester)         return Alert.alert("Error","Semester is required");
    if (!editingStudent && !form.password) return Alert.alert("Error","Password is required");
    try {
      setSaving(true);
      const payload = { ...form };
      if (editingStudent && !payload.password) delete payload.password;
      if (editingStudent) await API.put(`/students/${editingStudent._id}`, payload);
      else await API.post("/admin/add-student", payload);
      setModalVisible(false); loadStudents();
      Alert.alert("Success ✅", editingStudent ? "Student updated!" : "Student added!");
    } catch(e) { Alert.alert("Error", e.response?.data?.message||"Could not save student"); }
    finally { setSaving(false); }
  };
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  // ── Header labels ──
  const headerTitles = {
    colleges:    "Manage Students",
    departments: COLLEGE_SHORT[selCollege] || selCollege?.split(" ")[0] || "",
    years:       selDept?.match(/\(([^)]+)\)/)?.[1] || selDept?.split(" ")[0] || "",
    students:    `${selDept?.match(/\(([^)]+)\)/)?.[1]||""} ${selYear||""}`.trim(),
  };
  const headerSubs = {
    colleges:    `${allStudents.length} total students`,
    departments: `${allStudents.filter(s=>s.college===selCollege).length} students`,
    years:       `${allStudents.filter(s=>s.college===selCollege&&s.department===selDept).length} students`,
    students:    `${studentData.length} students`,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* ── Header ── */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{headerTitles[view]}</Text>
          <Text style={styles.headerSub}>{headerSubs[view]}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="person-add" size={19} color="#fff" />
        </Pressable>
      </LinearGradient>

      {/* ── Breadcrumb ── */}
      <Breadcrumb
        college={selCollege} department={selDept} year={selYear}
        onPress={navTo}
      />

      {/* ── Search (students only) ── */}
      {view === "students" && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color="#64748b" />
          <TextInput style={styles.searchInput} placeholder="Search students..."
            placeholderTextColor="#374151" value={search} onChangeText={setSearch} />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={15} color="#64748b" />
            </Pressable>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff" /></View>
      ) : (
        <>
          {/* ── COLLEGES ── */}
          {view === "colleges" && (
            <FlatList data={collegeData} keyExtractor={i=>i.name}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadStudents(true)} tintColor="#00c6ff" />}
              ListHeaderComponent={() => (
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{allStudents.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statNum,{color:"#34d399"}]}>
                      {allStudents.filter(s=>Number(s.semester)<=4).length}
                    </Text>
                    <Text style={styles.statLabel}>Junior</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statNum,{color:"#f59e0b"}]}>
                      {allStudents.filter(s=>Number(s.semester)>4).length}
                    </Text>
                    <Text style={styles.statLabel}>Senior</Text>
                  </View>
                </View>
              )}
              renderItem={({item}) => (
                <CollegeCard name={item.name} count={item.count}
                  onPress={() => { setSelCollege(item.name); setView("departments"); }} />
              )}
            />
          )}

          {/* ── DEPARTMENTS ── */}
          {view === "departments" && (
            <FlatList data={deptData} keyExtractor={i=>i.name}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}><Ionicons name="school-outline" size={40} color="#374151" /></View>
                  <Text style={styles.emptyTitle}>No Departments Found</Text>
                  <Text style={styles.emptySubtitle}>Add students to see departments</Text>
                </View>
              )}
              renderItem={({item}) => (
                <DeptCard name={item.name} count={item.count} colorIdx={item.colorIdx}
                  onPress={() => { setSelDept(item.name); setView("years"); }} />
              )}
            />
          )}

          {/* ── YEARS / BATCHES ── */}
          {view === "years" && (
            <FlatList data={yearData} keyExtractor={i=>i.year}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              ListHeaderComponent={() => (
                <View style={[styles.infoBanner, { borderLeftColor: deptColor }]}>
                  <Ionicons name="information-circle-outline" size={15} color={deptColor} />
                  <Text style={[styles.infoBannerText, { color: deptColor }]}>
                    Select batch year to view students of that section
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={40} color="#374151" /></View>
                  <Text style={styles.emptyTitle}>No Batches Found</Text>
                  <Text style={styles.emptySubtitle}>Students need Admission Year to appear here</Text>
                  <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
                    <Ionicons name="person-add-outline" size={15} color="#00c6ff" />
                    <Text style={styles.emptyAddText}>Add Student</Text>
                  </Pressable>
                </View>
              )}
              renderItem={({item}) => (
                <YearCard year={item.year} count={item.count} dept={selDept} color={deptColor}
                  onPress={() => { setSelYear(item.year); setView("students"); }} />
              )}
            />
          )}

          {/* ── STUDENTS ── */}
          {view === "students" && (
            <FlatList data={studentData} keyExtractor={i=>i._id||i.studentId}
              contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadStudents(true)} tintColor="#00c6ff" />}
              ListHeaderComponent={() => (
                <View style={[styles.infoBanner, { borderLeftColor: deptColor }]}>
                  <Ionicons name="people" size={14} color={deptColor} />
                  <Text style={[styles.infoBannerText, { color: deptColor }]}>
                    Section: {selDept?.match(/\(([^)]+)\)/)?.[1] || ""} {selYear}
                  </Text>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}><Ionicons name="people-outline" size={40} color="#374151" /></View>
                  <Text style={styles.emptyTitle}>No Students Found</Text>
                  <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
                    <Ionicons name="person-add-outline" size={15} color="#00c6ff" />
                    <Text style={styles.emptyAddText}>Add Student</Text>
                  </Pressable>
                </View>
              )}
              renderItem={({item}) => (
                <StudentCard item={item} colorIdx={deptColorIdx}
                  onEdit={openEdit} onDelete={handleDelete} />
              )}
            />
          )}
        </>
      )}

      {/* ── FORM MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={()=>setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.formHeader}>
              <View style={styles.formHeaderIcon}>
                <Ionicons name={editingStudent?"pencil":"person-add"} size={18} color="#00c6ff" />
              </View>
              <Text style={styles.formTitle}>{editingStudent?"Edit Student":"Add New Student"}</Text>
              <Pressable onPress={()=>setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionLabel}>BASIC INFO</Text>
              <Field label="Full Name"      icon="person-outline"   value={form.name}          onChangeText={f("name")} />
              <Field label="Email"          icon="mail-outline"     value={form.email}         onChangeText={f("email")}         keyboardType="email-address" />
              <Field label="Phone"          icon="call-outline"     value={form.phone}         onChangeText={f("phone")}         keyboardType="phone-pad" />
              <Field label="Student ID"     icon="card-outline"     value={form.studentId}     onChangeText={f("studentId")} />
              <Field label="Admission Year" icon="calendar-outline" value={form.admissionYear} onChangeText={f("admissionYear")} keyboardType="numeric" maxLength={4} />
              <Text style={styles.sectionLabel}>ACADEMIC INFO</Text>
              <Picker label="College"    icon="business-outline" value={form.college}    options={COLLEGES}    onSelect={f("college")} />
              <Picker label="Department" icon="school-outline"   value={form.department} options={DEPARTMENTS} onSelect={f("department")} />
              <Picker label="Semester"   icon="layers-outline"   value={form.semester}   options={SEMESTERS}   onSelect={f("semester")} />
              <Picker label="Gender"     icon="people-outline"   value={form.gender}     options={GENDERS}     onSelect={f("gender")} />
              <Text style={styles.sectionLabel}>{editingStudent?"CHANGE PASSWORD (optional)":"ACCOUNT"}</Text>
              <Field label="Password" icon="lock-closed-outline" value={form.password} onChangeText={f("password")} secureTextEntry />
              {/* Section preview */}
              {form.department && form.admissionYear ? (
                <View style={styles.sectionPreview}>
                  <Ionicons name="people" size={14} color="#00c6ff" />
                  <Text style={styles.sectionPreviewText}>
                    Section: {getSectionLabel(form.admissionYear, form.department)}
                  </Text>
                </View>
              ) : null}
              <Pressable style={[styles.saveBtn, saving&&{opacity:0.7}]} onPress={handleSave} disabled={saving}>
                <LinearGradient
                  colors={editingStudent?["#f59e0b","#d97706"]:["#10b981","#059669"]}
                  start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name={editingStudent?"save-outline":"person-add-outline"} size={17} color="#fff" />
                    <Text style={styles.saveBtnText}>{editingStudent?"Save Changes":"Add Student"}</Text></>}
                </LinearGradient>
              </Pressable>
              <View style={{height:40}} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#080d17" },
  center:{ flex:1,justifyContent:"center",alignItems:"center" },
  header:{ flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingTop:52,paddingBottom:14,justifyContent:"space-between" },
  backBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter:{ flex:1,alignItems:"center" },
  headerTitle:{ color:"#fff",fontSize:18,fontWeight:"800" },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  addBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(0,198,255,0.2)",justifyContent:"center",alignItems:"center",borderWidth:1,borderColor:"rgba(0,198,255,0.3)" },
  breadcrumb:{ flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,0.04)",flexWrap:"wrap" },
  bcItem:{ color:"#374151",fontSize:12,fontWeight:"600" },
  bcActive:{ color:"#00c6ff" },
  searchBar:{ flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#1a2535",marginHorizontal:16,marginTop:10,borderRadius:14,paddingHorizontal:14,paddingVertical:2,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  searchInput:{ flex:1,color:"#fff",fontSize:14,paddingVertical:12 },
  statsRow:{ flexDirection:"row",marginBottom:16,gap:10 },
  statBox:{ flex:1,backgroundColor:"#1a2535",borderRadius:12,padding:12,alignItems:"center",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  statNum:{ color:"#00c6ff",fontSize:22,fontWeight:"800" },
  statLabel:{ color:"#64748b",fontSize:10,marginTop:2,fontWeight:"600" },
  list:{ padding:16,paddingBottom:30 },
  browseCard:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:16,padding:16,marginBottom:10,borderWidth:1,borderColor:"rgba(255,255,255,0.04)",gap:14 },
  browseIconWrap:{ width:48,height:48,borderRadius:14,backgroundColor:"rgba(167,139,250,0.15)",justifyContent:"center",alignItems:"center" },
  browseInfo:{ flex:1 },
  browseName:{ color:"#fff",fontSize:14,fontWeight:"700" },
  browseSubName:{ color:"#64748b",fontSize:11,marginTop:2 },
  browseCount:{ color:"#64748b",fontSize:12,marginTop:4,fontWeight:"600" },
  deptCard:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:16,marginBottom:10,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)",gap:14 },
  deptAccent:{ width:3,alignSelf:"stretch" },
  deptIconWrap:{ width:44,height:44,borderRadius:12,justifyContent:"center",alignItems:"center",marginLeft:8 },
  // Year card
  yearCard:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:16,padding:14,marginBottom:10,borderWidth:1,borderColor:"rgba(255,255,255,0.04)",gap:12 },
  yearBadgeWrap:{ width:58,height:58,borderRadius:14,justifyContent:"center",alignItems:"center" },
  yearBadgeYear:{ fontSize:18,fontWeight:"800" },
  yearBadgeDept:{ fontSize:10,fontWeight:"600" },
  yearCountBadge:{ paddingHorizontal:12,paddingVertical:8,borderRadius:10 },
  yearCountText:{ fontSize:16,fontWeight:"800" },
  infoBanner:{ flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(255,255,255,0.03)",borderRadius:12,padding:12,marginBottom:14,borderLeftWidth:3 },
  infoBannerText:{ fontSize:12,fontWeight:"600",flex:1 },
  // Student card
  card:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,marginBottom:8,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  cardAccent:{ width:3,alignSelf:"stretch" },
  avatar:{ width:44,height:44,borderRadius:22,justifyContent:"center",alignItems:"center",margin:12 },
  avatarText:{ fontSize:16,fontWeight:"800" },
  cardBody:{ flex:1,paddingVertical:10 },
  cardName:{ color:"#fff",fontSize:14,fontWeight:"700" },
  cardBadgeRow:{ flexDirection:"row",alignItems:"center",gap:6,marginTop:4,marginBottom:2,flexWrap:"wrap" },
  cardSub:{ color:"#64748b",fontSize:11 },
  semBadge:{ paddingHorizontal:7,paddingVertical:2,borderRadius:6 },
  semBadgeText:{ fontSize:10,fontWeight:"700" },
  sectionBadge:{ flexDirection:"row",alignItems:"center",gap:3,backgroundColor:"rgba(255,255,255,0.06)",paddingHorizontal:7,paddingVertical:2,borderRadius:6 },
  sectionBadgeText:{ color:"#94a3b8",fontSize:10,fontWeight:"600" },
  cardActions:{ flexDirection:"row",gap:6,paddingRight:12 },
  editBtn:{ width:34,height:34,borderRadius:10,backgroundColor:"rgba(245,158,11,0.12)",justifyContent:"center",alignItems:"center" },
  deleteBtn:{ width:34,height:34,borderRadius:10,backgroundColor:"rgba(248,113,113,0.12)",justifyContent:"center",alignItems:"center" },
  emptyState:{ alignItems:"center",paddingTop:60,gap:12 },
  emptyIcon:{ width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle:{ color:"#374151",fontSize:16,fontWeight:"700" },
  emptySubtitle:{ color:"#1f2937",fontSize:13 },
  emptyAddBtn:{ flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(0,198,255,0.1)",paddingHorizontal:20,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:"rgba(0,198,255,0.2)" },
  emptyAddText:{ color:"#00c6ff",fontWeight:"700" },
  modalOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  formSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.92,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  modalHandle:{ width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4 },
  formHeader:{ flexDirection:"row",alignItems:"center",gap:12,padding:20,paddingBottom:8 },
  formHeaderIcon:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(0,198,255,0.12)",justifyContent:"center",alignItems:"center" },
  formTitle:{ flex:1,color:"#fff",fontSize:17,fontWeight:"800" },
  sectionLabel:{ color:"#374151",fontSize:10,fontWeight:"800",letterSpacing:1,marginHorizontal:20,marginTop:16,marginBottom:8 },
  sectionPreview:{ flexDirection:"row",alignItems:"center",gap:8,marginHorizontal:20,marginTop:8,backgroundColor:"rgba(0,198,255,0.08)",padding:12,borderRadius:10,borderWidth:1,borderColor:"rgba(0,198,255,0.2)" },
  sectionPreviewText:{ color:"#00c6ff",fontSize:13,fontWeight:"600" },
  fieldWrap:{ marginHorizontal:20,marginBottom:10 },
  fieldLabel:{ color:"#64748b",fontSize:11,fontWeight:"600",marginBottom:6 },
  fieldRow:{ flexDirection:"row",alignItems:"center",backgroundColor:"rgba(255,255,255,0.06)",borderRadius:12,paddingHorizontal:12,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",minHeight:50 },
  fieldInput:{ flex:1,color:"#fff",fontSize:14,paddingVertical:14 },
  pickerSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:height*0.6,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  pickerTitle:{ color:"#fff",fontSize:16,fontWeight:"700",marginBottom:12 },
  pickerOption:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:14,borderRadius:12,marginBottom:6,backgroundColor:"rgba(255,255,255,0.04)" },
  pickerOptionActive:{ backgroundColor:"rgba(0,198,255,0.1)",borderWidth:1,borderColor:"rgba(0,198,255,0.25)" },
  pickerOptionText:{ color:"#94a3b8",fontSize:13,flex:1 },
  saveBtn:{ marginHorizontal:20,marginTop:20,borderRadius:14,overflow:"hidden" },
  saveBtnGrad:{ flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:16,borderRadius:14 },
  saveBtnText:{ color:"#fff",fontWeight:"700",fontSize:16 },
});