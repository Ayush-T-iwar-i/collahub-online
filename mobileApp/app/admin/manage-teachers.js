// app/admin/manage-teachers.js
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, TextInput, ScrollView,
  Alert, Modal, StatusBar,
  KeyboardAvoidingView,
  Platform   
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
    subjectType:"Theory",  // Theory | Lab
  });
  const [selectedDays,  setSelectedDays]  = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Rooms (from this college) ───────────────────────────
  const [rooms,        setRooms]        = useState([]);
  const [roomConflict, setRoomConflict] = useState(null); // conflict message

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
      Alert.alert("Error", e.response?.data?.message || "Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  }, [deptFilter]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const col = await loadCollegeInfo();
      loadTeachers();
      if (col) loadRooms(col);
    })();
  }, [loadTeachers]));

  // Load rooms for this college
  const loadRooms = async (college) => {
    try {
      const res = await API.get("/rooms", { params:{ college } });
      setRooms(res.data?.rooms || []);
    } catch { setRooms([]); }
  };

  // Check room conflict before assigning
  const checkRoomConflict = async (roomName, day, timeSlot) => {
    if (!roomName || !day || !timeSlot) return;
    try {
      const [startTime] = timeSlot.split("-");
      const res = await API.get("/rooms/check-conflict", {
        params:{ roomName:roomName.trim(), college:adminCollege, day, startTime:startTime.trim() }
      });
      if (res.data?.conflict) setRoomConflict(res.data.message);
      else setRoomConflict(null);
    } catch { setRoomConflict(null); }
  };

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
      setSubjectForm({ subjectName:"", subjectCode:"", department:"", admissionYear:"2023", section:"A", semester:1, timeSlot:"9:00-10:00", roomNumber:"", subjectType:"Theory" });
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
      Alert.alert("Error", "Please select a department.");
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
                  {sub.subjectType ? ` · ${sub.subjectType}` : ""}
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
           

      {loading
        ? <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop:40 }} />
        : (
          <FlatList
  data={filtered}
  keyExtractor={i => i._id}
  renderItem={renderTeacher}
  showsVerticalScrollIndicator={false}

  contentContainerStyle={{ paddingBottom: 30 }}

  ListHeaderComponent={
    <View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teachers..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* Dept filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal:16, gap:8 }}
      >
        {["All", ...collegeDepts].map(d => {
          const short =
            d === "All"
              ? "All"
              : (d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0]);

          return (
            <Pressable
              key={d}
              onPress={() => setDeptFilter(d)}
              style={[styles.chip, deptFilter === d && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  deptFilter === d && styles.chipTextActive,
                ]}
              >
                {short}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Count */}
      <Text style={styles.countText}>
        {filtered.length} teachers
      </Text>

    </View>
  }

  ListEmptyComponent={
    <Text style={styles.emptyText}>No teachers found</Text>
  }
/>
        )
      }

      {/* ══ ASSIGN SUBJECT MODAL ══ */}
      <Modal visible={assignModal} transparent animationType="slide"
        onRequestClose={() => { setAssignModal(false); setSelectedDays([]); }}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.handle}/>
              <View style={styles.sheetTitleRow}>
                <View style={{flex:1}}>
                  <Text style={styles.sheetTitle}>Assign Subject</Text>
                  <Text style={styles.sheetSub} numberOfLines={1}>To: {selectedTeacher?.name}</Text>
                </View>
                <Pressable onPress={() => { setAssignModal(false); setSelectedDays([]); }} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748b"/>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                contentContainerStyle={{paddingBottom:40}}>

                {/* Subject Name */}
                <Text style={styles.fieldLabel}>Subject Name *</Text>
                <TextInput style={styles.input} placeholder="e.g. Data Structures"
                  placeholderTextColor="#374151" value={subjectForm.subjectName}
                  onChangeText={v => setSubjectForm(p => ({ ...p, subjectName:v }))} />

                {/* Subject Code */}
                <Text style={styles.fieldLabel}>Subject Code (optional)</Text>
                <TextInput style={styles.input} placeholder="e.g. CS301"
                  placeholderTextColor="#374151" autoCapitalize="characters"
                  value={subjectForm.subjectCode}
                  onChangeText={v => setSubjectForm(p => ({ ...p, subjectCode:v }))} />

                {/* Subject Type — Theory / Lab */}
                <Text style={styles.fieldLabel}>Subject Type *</Text>
                <View style={styles.subjectTypeRow}>
                  {[
                    { key:"Theory", icon:"book-outline",  color:"#00c6ff", desc:"Classroom lecture" },
                    { key:"Lab",    icon:"flask-outline", color:"#34d399", desc:"Practical / Lab session" },
                  ].map(t => {
                    const sel = subjectForm.subjectType === t.key;
                    return (
                      <Pressable key={t.key}
                        style={[styles.subjectTypeBtn,
                          sel && { backgroundColor:t.color+"18", borderColor:t.color+"60" }
                        ]}
                        onPress={() => setSubjectForm(p => ({ ...p, subjectType:t.key }))}>
                        <View style={[styles.subjectTypeIcon, { backgroundColor: sel ? t.color+"22" : "rgba(255,255,255,0.05)" }]}>
                          <Ionicons name={t.icon} size={20} color={sel ? t.color : "#64748b"} />
                        </View>
                        <Text style={[styles.subjectTypeLabel, sel && { color:t.color }]}>{t.key}</Text>
                        <Text style={styles.subjectTypeDesc}>{t.desc}</Text>
                        {sel && (
                          <View style={[styles.subjectTypeCheck, { backgroundColor:t.color }]}>
                            <Ionicons name="checkmark" size={10} color="#fff"/>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Department */}
                <Text style={styles.fieldLabel}>Department *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap:8, paddingBottom:4 }}>
                  {collegeDepts.map(d => {
                    const short = d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0];
                    const sel   = subjectForm.department === d;
                    return (
                      <Pressable key={d} onPress={() => setSubjectForm(p => ({ ...p, department:d }))}
                        style={[styles.chip, sel && styles.chipGreen]}>
                        <Text style={[styles.chipText, sel && { color:"#34d399" }]}>{short}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Batch Year */}
                <Text style={styles.fieldLabel}>Batch (Admission Year)</Text>
                <TextInput style={styles.input} placeholder="e.g. 2023"
                  placeholderTextColor="#374151" keyboardType="numeric" maxLength={4}
                  value={subjectForm.admissionYear}
                  onChangeText={v => setSubjectForm(p => ({ ...p, admissionYear:v }))} />

                {/* Time Slot */}
                <Text style={styles.fieldLabel}>Time Slot *</Text>
                <TextInput style={styles.input} placeholder="e.g. 9:00-10:00"
                  placeholderTextColor="#374151" value={subjectForm.timeSlot}
                  onChangeText={v => setSubjectForm(p => ({ ...p, timeSlot:v }))} />

                {/* Room Number — with college-scope note */}
                {/* Room selection — from college rooms */}
                <Text style={styles.fieldLabel}>Room</Text>
                {/* Type tag */}
                <View style={[styles.roomTypeTag, {
                  backgroundColor: subjectForm.subjectType==="Lab" ? "rgba(52,211,153,0.12)" : "rgba(0,198,255,0.12)",
                  borderColor:     subjectForm.subjectType==="Lab" ? "rgba(52,211,153,0.4)"  : "rgba(0,198,255,0.4)",
                  marginBottom:8,
                }]}>
                  <Ionicons
                    name={subjectForm.subjectType==="Lab" ? "flask-outline" : "book-outline"}
                    size={12}
                    color={subjectForm.subjectType==="Lab" ? "#34d399" : "#00c6ff"}
                  />
                  <Text style={[styles.roomTypeTagText, {
                    color: subjectForm.subjectType==="Lab" ? "#34d399" : "#00c6ff"
                  }]}>
                    {subjectForm.subjectType==="Lab" ? "Lab Room" : "Class Room"}
                  </Text>
                </View>

                {/* Room chips from DB */}
                {rooms.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{gap:8,marginBottom:8}}>
                    {rooms
                      .filter(r => subjectForm.subjectType==="Lab" ? r.type==="Lab" : r.type!=="Lab")
                      .map(r => {
                        const sel = subjectForm.roomNumber === r.name;
                        const rc  = r.type==="Lab" ? "#34d399" : r.type==="Theater" ? "#a78bfa" : "#00c6ff";
                        return (
                          <Pressable key={r._id}
                            style={[styles.chip, sel&&{backgroundColor:rc+"18",borderColor:rc+"55"}]}
                            onPress={() => {
                              setSubjectForm(p=>({...p,roomNumber:r.name}));
                              // Check conflict for all selected days
                              selectedDays.forEach(day => checkRoomConflict(r.name, day, subjectForm.timeSlot));
                            }}>
                            <Ionicons name={r.type==="Lab"?"flask-outline":r.type==="Theater"?"business-outline":"school-outline"} size={10} color={sel?rc:"#64748b"}/>
                            <Text style={[styles.chipText, sel&&{color:rc}]}>{r.name}</Text>
                          </Pressable>
                        );
                      })
                    }
                  </ScrollView>
                ) : (
                  <View style={styles.noRoomNote}>
                    <Ionicons name="information-circle-outline" size={12} color="#f59e0b"/>
                    <Text style={styles.noRoomNoteText}>No rooms added yet. Add rooms in Room Timetable screen, or type manually below.</Text>
                  </View>
                )}

                {/* Manual room input */}
                <View style={styles.roomInputWrap}>
                  <TextInput style={styles.roomInput} placeholder="Or type room name manually..."
                    placeholderTextColor="#374151" value={subjectForm.roomNumber}
                    onChangeText={v => {
                      setSubjectForm(p=>({...p,roomNumber:v}));
                      setRoomConflict(null);
                    }} />
                </View>

                {/* Conflict warning */}
                {roomConflict && (
                  <View style={styles.roomConflictWarn}>
                    <Ionicons name="warning" size={14} color="#f87171"/>
                    <Text style={styles.roomConflictText}>{roomConflict}</Text>
                  </View>
                )}

                <View style={styles.roomNote}>
                  <Ionicons name="lock-closed-outline" size={10} color="#60a5fa"/>
                  <Text style={styles.roomNoteText}>
                    Rooms are college-specific. Same room number in different colleges is independent.
                  </Text>
                </View>

                {/* Semester */}
                <Text style={styles.fieldLabel}>Semester</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap:8, paddingBottom:4 }}>
                  {SEMESTERS.map(s => (
                    <Pressable key={s} onPress={() => setSubjectForm(p => ({ ...p, semester:s }))}
                      style={[styles.chip, subjectForm.semester===s && styles.chipYellow]}>
                      <Text style={[styles.chipText, subjectForm.semester===s && { color:"#f59e0b" }]}>Sem {s}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Section */}
                <Text style={styles.fieldLabel}>Section</Text>
                <View style={{ flexDirection:"row", gap:8, flexWrap:"wrap", marginBottom:14 }}>
                  {SECTIONS.map(s => (
                    <Pressable key={s} onPress={() => setSubjectForm(p => ({ ...p, section:s }))}
                      style={[styles.chip, subjectForm.section===s && styles.chipPurple]}>
                      <Text style={[styles.chipText, subjectForm.section===s && { color:"#a78bfa" }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Days */}
                <Text style={styles.fieldLabel}>Days *</Text>
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

                {/* Summary card before submit */}
                {(subjectForm.subjectName || subjectForm.roomNumber) && (
                  <View style={styles.assignSummary}>
                    <Text style={styles.assignSummaryTitle}>Assignment Summary</Text>
                    {subjectForm.subjectName && (
                      <View style={styles.assignSummaryRow}>
                        <Ionicons name="book-outline" size={12} color="#64748b"/>
                        <Text style={styles.assignSummaryText}>{subjectForm.subjectName}</Text>
                      </View>
                    )}
                    <View style={styles.assignSummaryRow}>
                      <Ionicons name={subjectForm.subjectType==="Lab"?"flask-outline":"school-outline"} size={12}
                        color={subjectForm.subjectType==="Lab"?"#34d399":"#00c6ff"}/>
                      <Text style={[styles.assignSummaryText,{color:subjectForm.subjectType==="Lab"?"#34d399":"#00c6ff"}]}>
                        {subjectForm.subjectType} Subject
                      </Text>
                    </View>
                    {subjectForm.roomNumber && (
                      <View style={styles.assignSummaryRow}>
                        <Ionicons name="location-outline" size={12} color="#f59e0b"/>
                        <Text style={styles.assignSummaryText}>
                          Room: {subjectForm.roomNumber} · {adminCollege.split(" ").slice(0,3).join(" ")}
                        </Text>
                      </View>
                    )}
                    {selectedDays.length > 0 && (
                      <View style={styles.assignSummaryRow}>
                        <Ionicons name="calendar-outline" size={12} color="#a78bfa"/>
                        <Text style={styles.assignSummaryText}>{selectedDays.map(d=>d.slice(0,3)).join(", ")} · {subjectForm.timeSlot}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.modalBtns}>
                  <Pressable style={styles.cancelBtn}
                    onPress={() => { setAssignModal(false); setSelectedDays([]); setRoomConflict(null); }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.confirmBtn, { backgroundColor:"#f59e0b" }, assignLoading && { opacity:0.6 }]}
                    onPress={handleAssignSubject} disabled={assignLoading}>
                    {assignLoading
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Text style={styles.confirmBtnText}>Assign Subject</Text>
                    }
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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