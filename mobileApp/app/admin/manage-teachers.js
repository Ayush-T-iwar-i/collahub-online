// app/admin/manage-teachers.js
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, TextInput, ScrollView,
  Alert, Modal, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
// College departments — inline to avoid import issues
const COLLEGE_DEPARTMENTS = {
  "NIMS Institute of Engineering and Technology": ["Computer Science Engineering (CSE)","Information Technology (IT)","Electronics and Communication Engineering (ECE)","Electrical Engineering (EE)","Mechanical Engineering (ME)","Civil Engineering","Chemical Engineering","Artificial Intelligence & Machine Learning","Data Science Engineering"],
  "NIMS School of Computer Science & AI": ["BCA","MCA","B.Sc Computer Science","Artificial Intelligence","Data Science","Cyber Security"],
  "NIMS College of Management Studies": ["BBA","MBA","Finance","Marketing","Human Resource","International Business"],
  "NIMS School of Commerce": ["B.Com","M.Com","Accounting","Business Economics"],
  "NIMS College of Law": ["LLB","BA LLB","BBA LLB","LLM"],
  "NIMS Medical College": ["MBBS","MD","MS","Medical Research"],
  "NIMS College of Dental": ["BDS","MDS","Orthodontics","Oral Surgery"],
  "NIMS College of Nursing": ["B.Sc Nursing","GNM","Post Basic Nursing","M.Sc Nursing"],
  "NIMS College of Pharmacy": ["D.Pharm","B.Pharm","M.Pharm","Pharm.D"],
  "NIMS Institute of Allied Health Sciences": ["Radiology","Medical Lab Technology","Dialysis Technology","Operation Theatre Technology"],
  "NIMS Institute of Physiotherapy": ["BPT","MPT"],
  "NIMS Institute of Hotel Management": ["Hotel Management","Hospitality Management","Tourism Management"],
  "NIMS Institute of Design & Fashion Technology": ["Fashion Design","Interior Design","Textile Design"],
  "NIMS School of Architecture": ["B.Arch","M.Arch"],
  "NIMS School of Humanities": ["Psychology","English","Sociology","Political Science"],
  "NIMS School of Basic & Applied Sciences": ["Physics","Chemistry","Mathematics","Biotechnology"],
  "NIMS School of Journalism & Mass Communication": ["Journalism","Mass Communication","Digital Media"],
  "NIMS School of Agriculture": ["B.Sc Agriculture","M.Sc Agriculture"],
  "NIMS Veterinary College": ["BVSc & AH","MVSc"],
  "NIMS School of Aviation": ["Aviation Management","Pilot Training"],
  // Fallback for old college names
  "Nims Institute of Engineering and Technology": ["Computer Science Engineering (CSE)","Information Technology (IT)","Electronics and Communication Engineering (ECE)","Electrical Engineering (EE)","Mechanical Engineering (ME)","Civil Engineering","Chemical Engineering","Artificial Intelligence & Machine Learning","Data Science Engineering"],
  "Nims College of Management Studies": ["BBA","MBA","Finance","Marketing","Human Resource"],
  "Nims College of Nursing": ["B.Sc Nursing","GNM","Post Basic Nursing"],
  "Nims College of Pharmacy": ["D.Pharm","B.Pharm","M.Pharm"],
  "Nims College of Law": ["LLB","BA LLB","LLM"],
  "Nims College of Dental": ["BDS","MDS"],
};
import API from "../../services/api";

const DAYS_LIST = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SEMESTERS = [1,2,3,4,5,6,7,8];
const SECTIONS  = ["A","B","C","D","All"];

// Auto-generate Teacher ID — YYYY-TEC-XXX format
const genTeacherId = (joiningYear) => {
  const yr  = joiningYear || new Date().getFullYear();
  const num = Math.floor(100 + Math.random() * 900);
  return `${yr}-TEC-${num}`;
};

export default function ManageTeachers() {
  const router = useRouter();

  // ── Admin college ──────────────────────────────────────
  const [adminCollege, setAdminCollege] = useState("");
  const [collegeDepts, setCollegeDepts] = useState([]);

  // ── List state ─────────────────────────────────────────
  const [teachers,   setTeachers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [deptFilter, setDeptFilter] = useState("All");
  const [search,     setSearch]     = useState("");

  // ── Assign subject modal ───────────────────────────────
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignModal,     setAssignModal]      = useState(false);
  const [subjectForm,     setSubjectForm]      = useState({
    subjectName:"", subjectCode:"",
    department:"", admissionYear:"2023",
    section:"A", semester:1,
    timeSlot:"9:00-10:00", roomNumber:"",
  });
  const [selectedDays,  setSelectedDays]  = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Add teacher modal ──────────────────────────────────
  const [addModal,   setAddModal]   = useState(false);
  const [addForm,    setAddForm]    = useState({
    name:"", email:"", password:"",
    phone:"", teacherId:"", department:"",
  });
  const [addLoading, setAddLoading] = useState(false);

  // ── Load admin college on mount ────────────────────────
  const loadCollegeInfo = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("adminData");
      if (raw) {
        const d = JSON.parse(raw);
        const college = d.college || d.user?.college || "";
        setAdminCollege(college);
        const depts = COLLEGE_DEPARTMENTS[college] || [];
        // Fallback: if college not found exactly, try partial match
        if (depts.length === 0) {
          const matchKey = Object.keys(COLLEGE_DEPARTMENTS).find(k =>
            k.toLowerCase().includes(college.toLowerCase().split(" ")[1] || college.toLowerCase())
          );
          if (matchKey) setCollegeDepts(COLLEGE_DEPARTMENTS[matchKey]);
        } else {
          setCollegeDepts(depts);
        }
        return college;
      }
    } catch(e) {
      console.log("loadCollegeInfo error:", e.message);
    }
    return "";
  }, []);

  useEffect(() => { loadCollegeInfo(); }, []);

  // ── Load teachers ──────────────────────────────────────
  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (deptFilter !== "All") params.department = deptFilter;
      const res = await API.get("/admin/teachers", { params });
      setTeachers(res.data?.teachers || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, [deptFilter]);

  useFocusEffect(useCallback(() => {
    (async () => {
      await loadCollegeInfo();
      loadTeachers();
    })();
  }, [loadTeachers]));

  const toggleDay = (day) =>
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );

  // ── Assign subject ─────────────────────────────────────
  const handleAssignSubject = async () => {
    if (!subjectForm.subjectName || !subjectForm.department ||
        selectedDays.length === 0 || !subjectForm.timeSlot) {
      Alert.alert("Error", "Subject name, department, days and time slot required");
      return;
    }
    setAssignLoading(true);
    try {
      await API.post("/admin/assign-subject", {
        teacherId: selectedTeacher._id,
        ...subjectForm,
        days: selectedDays,
      });
      Alert.alert("Done!", `Subject assigned to ${selectedTeacher.name}`);
      setAssignModal(false);
      setSelectedDays([]);
      setSubjectForm({ subjectName:"", subjectCode:"", department:"", admissionYear:"2023", section:"A", semester:1, timeSlot:"9:00-10:00", roomNumber:"" });
      loadTeachers();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed");
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Remove subject ─────────────────────────────────────
  const handleRemoveSubject = (teacher, idx, name) => {
    Alert.alert("Remove Subject", `Remove "${name}" from ${teacher.name}?`, [
      { text:"Cancel", style:"cancel" },
      { text:"Remove", style:"destructive", onPress: async () => {
        try {
          await API.delete(`/admin/assign-subject/${teacher._id}/${idx}`);
          loadTeachers();
        } catch (e) {
          Alert.alert("Error", e.response?.data?.message || "Failed");
        }
      }},
    ]);
  };

  // ── Open Add Teacher — auto-fill college + gen ID ──────
  const openAddModal = () => {
    setAddForm({
      name:"", email:"", password:"",
      phone:"", teacherId: genTeacherId(new Date().getFullYear()), department:"",
    });
    setAddModal(true);
  };

  // ── Add teacher ────────────────────────────────────────
  const handleAddTeacher = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      Alert.alert("Error", "Name, email and password required");
      return;
    }
    if (!addForm.department) {
      Alert.alert("Error", "Please select a department");
      return;
    }
    setAddLoading(true);
    try {
      await API.post("/admin/add-teacher", {
        ...addForm,
        college: adminCollege,   // ← auto from admin account
      });
      Alert.alert("Teacher Added!", `ID: ${addForm.teacherId}`);
      setAddModal(false);
      loadTeachers();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed");
    } finally {
      setAddLoading(false);
    }
  };

  const filtered = teachers.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Teacher Card ───────────────────────────────────────
  const renderTeacher = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.sub}>
            {item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "No dept"}
            {item.teacherId ? ` · ${item.teacherId}` : ""}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <Pressable style={styles.assignIconBtn}
          onPress={() => { setSelectedTeacher(item); setAssignModal(true); }}>
          <Ionicons name="add-circle" size={26} color="#f59e0b" />
        </Pressable>
      </View>

      {item.assignedSubjects?.length > 0 && (
        <View style={styles.subList}>
          <Text style={styles.subListTitle}>
            Assigned Subjects ({item.assignedSubjects.length})
          </Text>
          {item.assignedSubjects.map((sub, idx) => (
            <View key={idx} style={styles.subItem}>
              <View style={styles.subIcon}>
                <Ionicons name="book" size={13} color="#f59e0b" />
              </View>
              <View style={styles.subInfo}>
                <Text style={styles.subName}>{sub.subjectName}</Text>
                <Text style={styles.subMeta}>
                  {sub.department?.match(/\(([^)]+)\)/)?.[1] || sub.department?.split(" ")[0]}
                  {sub.semester ? ` · Sem ${sub.semester}` : ""}
                  {sub.section  ? ` · Sec ${sub.section}`  : ""}
                </Text>
                <Text style={styles.subMeta}>
                  {sub.days?.join(", ")} · {sub.timeSlot}
                  {sub.roomNumber ? ` · Room ${sub.roomNumber}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => handleRemoveSubject(item, idx, sub.subjectName)}>
                <Ionicons name="close-circle" size={18} color="#f87171" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17","#120020"]} style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/dashboard")}
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex:1 }}>
          <Text style={styles.headerTitle}>Manage Teachers</Text>
          {!!adminCollege && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {adminCollege.split(" ").slice(0,4).join(" ")}
            </Text>
          )}
        </View>
        <Pressable onPress={openAddModal}
          style={[styles.addBtn, { backgroundColor:"rgba(245,158,11,0.1)" }]}>
          <Ionicons name="person-add" size={20} color="#f59e0b" />
        </Pressable>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#64748b" />
        <TextInput style={styles.searchInput}
          placeholder="Search teachers..."
          placeholderTextColor="#374151"
          value={search} onChangeText={setSearch} />
        {!!search && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* Dept filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal:16, gap:8 }}>
        {["All", ...collegeDepts].map(d => {
          const short = d==="All" ? "All" : (d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0]);
          return (
            <Pressable key={d} onPress={() => setDeptFilter(d)}
              style={[styles.chip, deptFilter===d && styles.chipActive]}>
              <Text style={[styles.chipText, deptFilter===d && styles.chipTextActive]}>{short}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.countText}>{filtered.length} teachers</Text>

      {loading
        ? <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop:40 }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={i => i._id}
            renderItem={renderTeacher}
            contentContainerStyle={{ paddingHorizontal:16, paddingBottom:30 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No teachers found</Text>}
          />
        )
      }

      {/* ══ ASSIGN SUBJECT MODAL ══ */}
      <Modal visible={assignModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              Assign Subject to {selectedTeacher?.name}
            </Text>

            <TextInput style={styles.input} placeholder="Subject Name *"
              placeholderTextColor="#374151" value={subjectForm.subjectName}
              onChangeText={v => setSubjectForm(p => ({ ...p, subjectName:v }))} />
            <TextInput style={styles.input} placeholder="Subject Code (optional)"
              placeholderTextColor="#374151" value={subjectForm.subjectCode}
              onChangeText={v => setSubjectForm(p => ({ ...p, subjectCode:v }))} />

            {/* Department chips */}
            <Text style={styles.modalLabel}>Department *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap:8, marginBottom:14 }}>
              {collegeDepts.map(d => {
                const short = d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0];
                const sel   = subjectForm.department === d;
                return (
                  <Pressable key={d} onPress={() => setSubjectForm(p => ({ ...p, department:d }))}
                    style={[styles.chip, sel && { backgroundColor:"rgba(52,211,153,0.2)", borderColor:"#34d399" }]}>
                    <Text style={[styles.chipText, sel && { color:"#34d399" }]}>{short}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput style={styles.input} placeholder="Batch (Admission Year) e.g. 2023"
              placeholderTextColor="#374151" value={subjectForm.admissionYear}
              onChangeText={v => setSubjectForm(p => ({ ...p, admissionYear:v }))} />
            <TextInput style={styles.input} placeholder="Time Slot * e.g. 9:00-10:00"
              placeholderTextColor="#374151" value={subjectForm.timeSlot}
              onChangeText={v => setSubjectForm(p => ({ ...p, timeSlot:v }))} />
            <TextInput style={styles.input} placeholder="Room Number (optional)"
              placeholderTextColor="#374151" value={subjectForm.roomNumber}
              onChangeText={v => setSubjectForm(p => ({ ...p, roomNumber:v }))} />

            <Text style={styles.modalLabel}>Semester</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap:8, marginBottom:14 }}>
              {SEMESTERS.map(s => (
                <Pressable key={s} onPress={() => setSubjectForm(p => ({ ...p, semester:s }))}
                  style={[styles.chip, subjectForm.semester===s && { backgroundColor:"rgba(245,158,11,0.2)", borderColor:"#f59e0b" }]}>
                  <Text style={[styles.chipText, subjectForm.semester===s && { color:"#f59e0b" }]}>Sem {s}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Section</Text>
            <View style={{ flexDirection:"row", gap:10, marginBottom:14 }}>
              {SECTIONS.map(s => (
                <Pressable key={s} onPress={() => setSubjectForm(p => ({ ...p, section:s }))}
                  style={[styles.chip, subjectForm.section===s && { backgroundColor:"rgba(167,139,250,0.2)", borderColor:"#a78bfa" }]}>
                  <Text style={[styles.chipText, subjectForm.section===s && { color:"#a78bfa" }]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Days *</Text>
            <View style={styles.daysGrid}>
              {DAYS_LIST.map(d => (
                <Pressable key={d} onPress={() => toggleDay(d)}
                  style={[styles.dayChip, selectedDays.includes(d) && styles.dayChipActive]}>
                  <Text style={[styles.dayChipText, selectedDays.includes(d) && { color:"#34d399" }]}>
                    {d.slice(0,3)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn}
                onPress={() => { setAssignModal(false); setSelectedDays([]); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor:"#f59e0b" }]}
                onPress={handleAssignSubject} disabled={assignLoading}>
                {assignLoading
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.confirmBtnText}>Assign Subject</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══ ADD TEACHER MODAL ══ */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Add New Teacher</Text>

            {/* College — auto from admin account */}
            <View style={styles.collegeInfoBox}>
              <Ionicons name="business" size={14} color="#f59e0b" />
              <Text style={styles.collegeInfoText} numberOfLines={1}>
                College: <Text style={{ color:"#f59e0b", fontWeight:"800" }}>{adminCollege}</Text>
              </Text>
            </View>

            {/* Teacher ID — auto generated, editable */}
            <Text style={styles.modalLabel}>Teacher ID (auto-generated)</Text>
            <View style={styles.teacherIdRow}>
              <TextInput style={[styles.input, { flex:1, marginBottom:0 }]}
                value={addForm.teacherId}
                onChangeText={v => setAddForm(p => ({ ...p, teacherId:v }))}
                placeholderTextColor="#374151"
                autoCapitalize="characters" />
              <Pressable style={styles.regenBtn}
                onPress={() => setAddForm(p => ({ ...p, teacherId: genTeacherId(addForm.joiningYear || new Date().getFullYear()) }))}>
                <Ionicons name="refresh" size={16} color="#34d399" />
              </Pressable>
            </View>

            {/* Basic fields */}
            {[
              { key:"name",     label:"Full Name *" },
              { key:"email",    label:"Email *" },
              { key:"password", label:"Password *", secure:true },
              { key:"phone",    label:"Phone (optional)" },
            ].map(f => (
              <TextInput key={f.key} style={styles.input}
                placeholder={f.label}
                placeholderTextColor="#374151"
                secureTextEntry={!!f.secure}
                value={addForm[f.key]}
                onChangeText={v => setAddForm(p => ({ ...p, [f.key]:v }))} />
            ))}

            {/* Department — chips from admin's college */}
            <Text style={styles.modalLabel}>Department *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap:8, marginBottom:16 }}>
              {collegeDepts.map(d => {
                const short = d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0];
                const sel   = addForm.department === d;
                return (
                  <Pressable key={d}
                    onPress={() => setAddForm(p => ({ ...p, department:d }))}
                    style={[styles.chip, sel && { backgroundColor:"rgba(245,158,11,0.2)", borderColor:"#f59e0b" }]}>
                    <Text style={[styles.chipText, sel && { color:"#f59e0b" }]}>{short}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Selected dept full name */}
            {!!addForm.department && (
              <View style={styles.selectedDeptBox}>
                <Ionicons name="school" size={12} color="#f59e0b" />
                <Text style={styles.selectedDeptText} numberOfLines={1}>{addForm.department}</Text>
              </View>
            )}

            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor:"#f59e0b" }]}
                onPress={handleAddTeacher} disabled={addLoading}>
                {addLoading
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.confirmBtnText}>Add Teacher</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex:1, backgroundColor:"#080d17" },
  header:          { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14, gap:12 },
  backBtn:         { width:36, height:36, borderRadius:10, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  headerTitle:     { color:"#fff", fontSize:18, fontWeight:"800" },
  headerSub:       { color:"#64748b", fontSize:10, marginTop:1 },
  addBtn:          { width:36, height:36, borderRadius:10, justifyContent:"center", alignItems:"center" },
  searchBox:       { flexDirection:"row", alignItems:"center", backgroundColor:"#1a2535", marginHorizontal:16, marginTop:12, borderRadius:12, paddingHorizontal:14, paddingVertical:10, gap:8 },
  searchInput:     { flex:1, color:"#fff", fontSize:14 },
  filterRow:       { marginTop:10, maxHeight:44 },
  chip:            { paddingHorizontal:14, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.04)" },
  chipActive:      { backgroundColor:"rgba(245,158,11,0.15)", borderColor:"#f59e0b" },
  chipText:        { color:"#64748b", fontSize:12, fontWeight:"600" },
  chipTextActive:  { color:"#f59e0b" },
  countText:       { color:"#374151", fontSize:11, paddingHorizontal:16, marginTop:8, marginBottom:8 },
  card:            { backgroundColor:"#1a2535", borderRadius:16, marginBottom:12, borderWidth:1, borderColor:"rgba(255,255,255,0.05)", overflow:"hidden" },
  cardHeader:      { flexDirection:"row", alignItems:"center", padding:14, gap:12 },
  avatar:          { width:46, height:46, borderRadius:23, backgroundColor:"rgba(245,158,11,0.15)", justifyContent:"center", alignItems:"center" },
  avatarText:      { color:"#f59e0b", fontSize:15, fontWeight:"800" },
  info:            { flex:1 },
  name:            { color:"#fff", fontSize:14, fontWeight:"700" },
  sub:             { color:"#64748b", fontSize:12, marginTop:1 },
  email:           { color:"#374151", fontSize:11, marginTop:1 },
  assignIconBtn:   { padding:4 },
  subList:         { borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.05)", padding:12, gap:8 },
  subListTitle:    { color:"#64748b", fontSize:10, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5, marginBottom:6 },
  subItem:         { flexDirection:"row", alignItems:"flex-start", gap:10, backgroundColor:"rgba(245,158,11,0.05)", borderRadius:10, padding:10 },
  subIcon:         { width:26, height:26, borderRadius:8, backgroundColor:"rgba(245,158,11,0.15)", justifyContent:"center", alignItems:"center", marginTop:2 },
  subInfo:         { flex:1 },
  subName:         { color:"#fff", fontSize:13, fontWeight:"700" },
  subMeta:         { color:"#64748b", fontSize:11, marginTop:2 },
  emptyText:       { color:"#374151", textAlign:"center", marginTop:40, fontSize:14 },
  overlay:         { flex:1, backgroundColor:"rgba(0,0,0,0.75)", justifyContent:"flex-end" },
  modal:           { backgroundColor:"#1a2535", borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, paddingBottom:44 },
  modalTitle:      { color:"#fff", fontSize:16, fontWeight:"800", marginBottom:16 },
  modalLabel:      { color:"#64748b", fontSize:11, fontWeight:"700", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 },
  input:           { backgroundColor:"#0f172a", color:"#fff", borderRadius:10, paddingHorizontal:14, paddingVertical:12, marginBottom:10, fontSize:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  daysGrid:        { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:16 },
  dayChip:         { paddingHorizontal:14, paddingVertical:8, borderRadius:10, borderWidth:1, borderColor:"rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.04)" },
  dayChipActive:   { backgroundColor:"rgba(52,211,153,0.15)", borderColor:"#34d399" },
  dayChipText:     { color:"#64748b", fontSize:13, fontWeight:"700" },
  modalBtns:       { flexDirection:"row", gap:12, marginTop:8 },
  cancelBtn:       { flex:1, paddingVertical:14, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", alignItems:"center" },
  cancelBtnText:   { color:"#64748b", fontWeight:"700" },
  confirmBtn:      { flex:1, paddingVertical:14, borderRadius:12, alignItems:"center" },
  confirmBtnText:  { color:"#000", fontWeight:"800", fontSize:14 },
  // Add teacher specific
  collegeInfoBox:  { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(245,158,11,0.08)", padding:12, borderRadius:10, borderWidth:1, borderColor:"rgba(245,158,11,0.2)", marginBottom:14 },
  collegeInfoText: { color:"#94a3b8", fontSize:12, flex:1 },
  teacherIdRow:    { flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 },
  regenBtn:        { width:40, height:44, borderRadius:10, backgroundColor:"rgba(52,211,153,0.1)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(52,211,153,0.25)" },
  selectedDeptBox: { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(245,158,11,0.08)", padding:10, borderRadius:8, marginBottom:10, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  selectedDeptText:{ color:"#f59e0b", fontSize:11, fontWeight:"600", flex:1 },
});