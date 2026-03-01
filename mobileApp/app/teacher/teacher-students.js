import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  TextInput, Modal, ScrollView, Dimensions, Image, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");

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
const SEMESTERS     = ["1","2","3","4","5","6","7","8"];
const CURRENT_YEAR  = new Date().getFullYear();
const YEARS         = Array.from({length:6},(_,i)=>(CURRENT_YEAR-i).toString());

const DEPT_COLORS = {
  "CSE":"#00c6ff","ECE":"#a78bfa","ME":"#f59e0b",
  "CE":"#34d399","IT":"#f87171","EEE":"#60a5fa","AI":"#fb923c","DATA":"#34d399",
};
const getColor = (dept="") => {
  const key = Object.keys(DEPT_COLORS).find(k => dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#64748b";
};

const STATUS_CONFIG = {
  pending:  { color:"#f59e0b", bg:"rgba(245,158,11,0.15)",  icon:"time-outline" },
  accepted: { color:"#34d399", bg:"rgba(52,211,153,0.15)",  icon:"checkmark-circle-outline" },
  rejected: { color:"#f87171", bg:"rgba(248,113,113,0.15)", icon:"close-circle-outline" },
};

// ── Picker Sheet ──
const PickerModal = ({ visible, title, options, selected, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.pickerOverlay} onPress={onClose}>
      <View style={styles.pickerSheet}>
        <View style={styles.handle}/>
        <Text style={styles.pickerTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map(opt=>(
            <Pressable key={opt} style={[styles.pickerOption, selected===opt&&styles.pickerOptionActive]}
              onPress={()=>{ onSelect(opt); onClose(); }}>
              <Text style={[styles.pickerOptionText, selected===opt&&{color:"#00c6ff"}]} numberOfLines={2}>{opt}</Text>
              {selected===opt && <Ionicons name="checkmark-circle" size={16} color="#00c6ff"/>}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

// ── Student Card ──
const StudentCard = ({ item, onPress }) => {
  const color    = getColor(item.department);
  const initials = item.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"S";
  return (
    <Pressable style={styles.card} onPress={()=>onPress(item)}>
      <View style={[styles.cardAccent,{backgroundColor:color}]}/>
      <View style={[styles.avatar,{backgroundColor:color+"20"}]}>
        {item.profileImage
          ? <Image source={{uri:item.profileImage}} style={styles.avatarImg}/>
          : <Text style={[styles.avatarText,{color}]}>{initials}</Text>}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardId}>{item.studentId||"—"}</Text>
        <View style={styles.cardMeta}>
          {item.department && (
            <View style={[styles.deptBadge,{backgroundColor:color+"18"}]}>
              <Text style={[styles.deptBadgeText,{color}]} numberOfLines={1}>
                {item.department.split("(")[0].trim()}
              </Text>
            </View>
          )}
          {item.semester && (
            <View style={styles.semBadge}>
              <Text style={styles.semBadgeText}>Sem {item.semester}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#374151"/>
    </Pressable>
  );
};

// ── Detail Modal ──
const DetailModal = ({ student, visible, onClose }) => {
  if (!student) return null;
  const color    = getColor(student.department);
  const initials = student.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"S";
  const InfoRow  = ({ icon, label, value, iconColor }) => (
    <View style={styles.modalInfoRow}>
      <View style={[styles.modalInfoIcon,{backgroundColor:(iconColor||color)+"18"}]}>
        <Ionicons name={icon} size={16} color={iconColor||color}/>
      </View>
      <View style={styles.modalInfoContent}>
        <Text style={styles.modalInfoLabel}>{label}</Text>
        <Text style={styles.modalInfoValue}>{value||"—"}</Text>
      </View>
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={e=>e.stopPropagation()}>
          <View style={styles.handle}/>
          <LinearGradient colors={[color+"22",color+"08"]} style={styles.modalHero}>
            <View style={[styles.modalAvatar,{backgroundColor:color+"25",borderColor:color+"50"}]}>
              {student.profileImage
                ? <Image source={{uri:student.profileImage}} style={styles.modalAvatarImg}/>
                : <Text style={[styles.modalAvatarText,{color}]}>{initials}</Text>}
            </View>
            <Text style={styles.modalName}>{student.name}</Text>
            <Text style={styles.modalStudentId}>{student.studentId||"—"}</Text>
            <View style={styles.modalBadges}>
              {student.department && (
                <View style={[styles.modalBadge,{backgroundColor:color+"20",borderColor:color+"35"}]}>
                  <Text style={[styles.modalBadgeText,{color}]} numberOfLines={1}>
                    {student.department.split("(")[0].trim()}
                  </Text>
                </View>
              )}
              {student.semester && (
                <View style={[styles.modalBadge,{backgroundColor:"rgba(255,255,255,0.06)",borderColor:"rgba(255,255,255,0.1)"}]}>
                  <Text style={[styles.modalBadgeText,{color:"#94a3b8"}]}>Sem {student.semester}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
          <ScrollView style={{maxHeight:height*0.35}} showsVerticalScrollIndicator={false}>
            <View style={styles.modalInfoCard}>
              <InfoRow icon="mail-outline"        label="Email"          value={student.email}         iconColor="#00c6ff"/>
              <InfoRow icon="call-outline"        label="Phone"          value={student.phone}         iconColor="#34d399"/>
              <InfoRow icon="business-outline"    label="College"        value={student.college}       iconColor="#a78bfa"/>
              <InfoRow icon="calendar-outline"    label="Admission Year" value={student.admissionYear} iconColor="#f59e0b"/>
              <InfoRow icon="male-female-outline" label="Gender"         value={student.gender}        iconColor="#f472b6"/>
            </View>
          </ScrollView>
          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ── Subject Request Card ──
const RequestCard = ({ item, onDelete }) => {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";
  return (
    <View style={styles.reqCard}>
      <View style={[styles.reqAccent,{backgroundColor:cfg.color}]}/>
      <View style={styles.reqBody}>
        <View style={styles.reqTopRow}>
          <Text style={styles.reqSubject} numberOfLines={1}>{item.subjectName}</Text>
          <View style={[styles.statusBadge,{backgroundColor:cfg.bg}]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color}/>
            <Text style={[styles.statusText,{color:cfg.color}]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {item.subjectCode ? <Text style={styles.reqCode}>{item.subjectCode}</Text> : null}
        <View style={styles.reqMeta}>
          <View style={styles.reqMetaItem}>
            <Ionicons name="people-outline" size={12} color="#64748b"/>
            <Text style={styles.reqMetaText}>{deptShort} {item.admissionYear}</Text>
          </View>
          <View style={styles.reqMetaItem}>
            <Ionicons name="layers-outline" size={12} color="#64748b"/>
            <Text style={styles.reqMetaText}>Sem {item.semester}</Text>
          </View>
        </View>
        {item.status==="rejected" && item.adminNote && (
          <Text style={styles.reqNote}>Note: {item.adminNote}</Text>
        )}
        {item.status==="accepted" && (
          <Text style={styles.reqAcceptedNote}>✅ You can now mark attendance for this class</Text>
        )}
      </View>
      {item.status==="pending" && (
        <Pressable style={styles.reqDelete} onPress={()=>onDelete(item._id)}>
          <Ionicons name="trash-outline" size={16} color="#f87171"/>
        </Pressable>
      )}
    </View>
  );
};

// ════════════════════════════════════════════
export default function TeacherStudents() {
  const navigation = useNavigation();
  const [tab, setTab] = useState("students"); // "students" | "requests"

  // Students state
  const [students, setStudents]       = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedSem, setSelectedSem]   = useState("All");
  const [departments, setDepartments]   = useState(["All"]);
  const [semesters, setSemesters]       = useState(["All"]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailVisible, setDetailVisible]     = useState(false);

  // Request state
  const [requests, setRequests]     = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form, setForm] = useState({
    subjectName:"", subjectCode:"", college:"", department:"", semester:"", admissionYear:"",
  });

  // Pickers
  const [picker, setPicker] = useState({ visible:false, field:"", title:"", options:[] });

  useFocusEffect(useCallback(()=>{
    loadStudents();
    loadRequests();
  },[]));

  const loadStudents = async (isRefresh=false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/students/all");
      const data = res.data?.students || res.data || [];
      setStudents(data); setFiltered(data);
      const depts = ["All",...new Set(data.map(s=>s.department?.split("(")[0]?.trim()).filter(Boolean))];
      const sems  = ["All",...new Set(data.map(s=>s.semester).filter(Boolean))].sort();
      setDepartments(depts); setSemesters(sems);
    } catch { setStudents([]); setFiltered([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadRequests = async () => {
    try {
      setReqLoading(true);
      const r = await API.get("/subject-requests/my");
      setRequests(r.data?.requests || []);
    } catch {}
    finally { setReqLoading(false); }
  };

  const applyFilters = (q, dept, sem, list=students) => {
    let result = list;
    if (q.trim()) {
      const lq = q.toLowerCase();
      result = result.filter(s=>
        s.name?.toLowerCase().includes(lq)||
        s.studentId?.toLowerCase().includes(lq)||
        s.email?.toLowerCase().includes(lq)
      );
    }
    if (dept!=="All") result = result.filter(s=>s.department?.toLowerCase().includes(dept.toLowerCase()));
    if (sem!=="All")  result = result.filter(s=>String(s.semester)===String(sem));
    setFiltered(result);
  };

  const openPicker = (field, title, options) => setPicker({visible:true,field,title,options});
  const closePicker = () => setPicker(p=>({...p,visible:false}));
  const setPickerValue = (val) => setForm(p=>({...p,[picker.field]:val}));

  // Pre-fill college from teacher data
  const openForm = async () => {
    try {
      const raw = await AsyncStorage.getItem("teacherData");
      if (raw) {
        const t = JSON.parse(raw);
        setForm(p=>({...p, college:t.college||""}));
      }
    } catch {}
    setFormVisible(true);
  };

  const handleSendRequest = async () => {
    const { subjectName, college, department, semester, admissionYear } = form;
    if (!subjectName.trim()) return Alert.alert("Error","Subject name required");
    if (!college)            return Alert.alert("Error","College required");
    if (!department)         return Alert.alert("Error","Department required");
    if (!semester)           return Alert.alert("Error","Semester required");
    if (!admissionYear)      return Alert.alert("Error","Admission year required");
    try {
      setSaving(true);
      await API.post("/subject-requests", { ...form, semester:Number(form.semester) });
      setFormVisible(false);
      setForm({subjectName:"",subjectCode:"",college:"",department:"",semester:"",admissionYear:""});
      loadRequests();
      Alert.alert("Sent! ✅","Your request has been sent to admin for approval.");
    } catch(e) { Alert.alert("Error", e.response?.data?.message||"Could not send request"); }
    finally { setSaving(false); }
  };

  const handleDeleteRequest = (id) => {
    Alert.alert("Delete Request","Remove this request?",[
      {text:"Cancel",style:"cancel"},
      {text:"Delete",style:"destructive", onPress: async ()=>{
        try { await API.delete(`/subject-requests/${id}`); loadRequests(); }
        catch(e) { Alert.alert("Error",e.response?.data?.message||"Could not delete"); }
      }},
    ]);
  };

  const deptShortForm = (dept) => dept?.match(/\(([^)]+)\)/)?.[1] || dept?.split(" ")[0] || "";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>

      {/* Header */}
      <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={()=>navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {tab==="students" ? "Students" : "Subject Requests"}
          </Text>
          <Text style={styles.headerSub}>
            {tab==="students"
              ? `${filtered.length} students`
              : `${requests.length} requests`}
          </Text>
        </View>
        {tab==="requests" && (
          <Pressable style={styles.addBtn} onPress={openForm}>
            <Ionicons name="add" size={22} color="#f59e0b"/>
          </Pressable>
        )}
        {tab==="students" && <View style={{width:40}}/>}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab==="students"&&styles.tabActive]} onPress={()=>setTab("students")}>
          <Ionicons name="people-outline" size={15} color={tab==="students"?"#f59e0b":"#64748b"}/>
          <Text style={[styles.tabText, tab==="students"&&styles.tabTextActive]}>All Students</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab==="requests"&&styles.tabActive]} onPress={()=>setTab("requests")}>
          <Ionicons name="document-text-outline" size={15} color={tab==="requests"?"#f59e0b":"#64748b"}/>
          <Text style={[styles.tabText, tab==="requests"&&styles.tabTextActive]}>My Subjects</Text>
          {requests.filter(r=>r.status==="pending").length>0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{requests.filter(r=>r.status==="pending").length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── STUDENTS TAB ── */}
      {tab==="students" && (
        <>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{marginRight:8}}/>
            <TextInput placeholder="Search by name, ID or email..." placeholderTextColor="#374151"
              style={styles.searchInput} value={search}
              onChangeText={t=>{setSearch(t); applyFilters(t,selectedDept,selectedSem);}}/>
            {search.length>0 && (
              <Pressable onPress={()=>{setSearch(""); applyFilters("",selectedDept,selectedSem);}}>
                <Ionicons name="close-circle" size={18} color="#64748b"/>
              </Pressable>
            )}
          </View>
          {/* Dept filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{marginTop:10}} contentContainerStyle={{paddingHorizontal:16,gap:8}}>
            {departments.map(dept=>{
              const isActive = selectedDept===dept;
              const color    = dept==="All"?"#f59e0b":getColor(dept);
              return (
                <Pressable key={dept}
                  style={[styles.filterChip, isActive&&{backgroundColor:color+"22",borderColor:color+"55"}]}
                  onPress={()=>{setSelectedDept(dept); applyFilters(search,dept,selectedSem);}}>
                  <Text style={[styles.filterChipText, isActive&&{color}]}>{dept}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {/* Sem filter */}
          {semesters.length>2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{marginTop:6,marginBottom:2}} contentContainerStyle={{paddingHorizontal:16,gap:8}}>
              {semesters.map(sem=>{
                const isActive = selectedSem===sem;
                return (
                  <Pressable key={sem}
                    style={[styles.semChip, isActive&&styles.semChipActive]}
                    onPress={()=>{setSelectedSem(sem); applyFilters(search,selectedDept,sem);}}>
                    <Text style={[styles.semChipText, isActive&&styles.semChipTextActive]}>
                      {sem==="All"?"All Sem":`Sem ${sem}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {loading
            ? <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff"/></View>
            : (
              <FlatList data={filtered} keyExtractor={item=>item._id||item.studentId}
                contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadStudents(true)} tintColor="#00c6ff"/>}
                ListEmptyComponent={()=>(
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}><Ionicons name="people-outline" size={40} color="#374151"/></View>
                    <Text style={styles.emptyTitle}>No Students Found</Text>
                  </View>
                )}
                renderItem={({item})=>(
                  <StudentCard item={item} onPress={s=>{setSelectedStudent(s);setDetailVisible(true);}}/>
                )}
              />
            )
          }
        </>
      )}

      {/* ── REQUESTS TAB ── */}
      {tab==="requests" && (
        <>
          {reqLoading
            ? <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b"/></View>
            : (
              <FlatList data={requests} keyExtractor={item=>item._id}
                contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRequests} tintColor="#f59e0b"/>}
                ListHeaderComponent={()=>(
                  <Pressable style={styles.newReqBtn} onPress={openForm}>
                    <LinearGradient colors={["rgba(245,158,11,0.2)","rgba(245,158,11,0.08)"]} style={styles.newReqGrad}>
                      <Ionicons name="add-circle-outline" size={20} color="#f59e0b"/>
                      <View>
                        <Text style={styles.newReqTitle}>Request New Subject</Text>
                        <Text style={styles.newReqSub}>Send request to admin for approval</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#f59e0b"/>
                    </LinearGradient>
                  </Pressable>
                )}
                ListEmptyComponent={()=>(
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={40} color="#374151"/></View>
                    <Text style={styles.emptyTitle}>No Requests Yet</Text>
                    <Text style={styles.emptySubtitle}>Request a subject to start taking attendance</Text>
                  </View>
                )}
                renderItem={({item})=>(
                  <RequestCard item={item} onDelete={handleDeleteRequest}/>
                )}
              />
            )
          }
        </>
      )}

      {/* ── STUDENT DETAIL MODAL ── */}
      <DetailModal student={selectedStudent} visible={detailVisible} onClose={()=>setDetailVisible(false)}/>

      {/* ── REQUEST FORM MODAL ── */}
      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={()=>setFormVisible(false)}>
        <View style={styles.formOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.handle}/>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderIcon}>
                <Ionicons name="book-outline" size={18} color="#f59e0b"/>
              </View>
              <Text style={styles.formTitle}>Request Subject</Text>
              <Pressable onPress={()=>setFormVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b"/>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formSectionLabel}>SUBJECT DETAILS</Text>

              {/* Subject Name */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Subject Name *</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="book-outline" size={15} color="#64748b" style={{marginRight:8}}/>
                  <TextInput style={styles.fieldInput} value={form.subjectName}
                    onChangeText={v=>setForm(p=>({...p,subjectName:v}))}
                    placeholder="e.g. Data Structures" placeholderTextColor="#374151"/>
                </View>
              </View>

              {/* Subject Code */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Subject Code (optional)</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="code-outline" size={15} color="#64748b" style={{marginRight:8}}/>
                  <TextInput style={styles.fieldInput} value={form.subjectCode}
                    onChangeText={v=>setForm(p=>({...p,subjectCode:v}))}
                    placeholder="e.g. CS301" placeholderTextColor="#374151"/>
                </View>
              </View>

              <Text style={styles.formSectionLabel}>TARGET CLASS</Text>

              {/* College */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>College *</Text>
                <Pressable style={styles.fieldRow} onPress={()=>openPicker("college","Select College",COLLEGES)}>
                  <Ionicons name="business-outline" size={15} color="#64748b" style={{marginRight:8}}/>
                  <Text style={[styles.fieldInput,{paddingVertical:14,color:form.college?"#fff":"#374151"}]} numberOfLines={1}>
                    {form.college||"Select College"}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#374151"/>
                </Pressable>
              </View>

              {/* Department */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Department *</Text>
                <Pressable style={styles.fieldRow} onPress={()=>openPicker("department","Select Department",DEPARTMENTS)}>
                  <Ionicons name="school-outline" size={15} color="#64748b" style={{marginRight:8}}/>
                  <Text style={[styles.fieldInput,{paddingVertical:14,color:form.department?"#fff":"#374151"}]} numberOfLines={1}>
                    {form.department||"Select Department"}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#374151"/>
                </Pressable>
              </View>

              {/* Semester */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Semester *</Text>
                <Pressable style={styles.fieldRow} onPress={()=>openPicker("semester","Select Semester",SEMESTERS)}>
                  <Ionicons name="layers-outline" size={15} color="#64748b" style={{marginRight:8}}/>
                  <Text style={[styles.fieldInput,{paddingVertical:14,color:form.semester?"#fff":"#374151"}]}>
                    {form.semester?`Semester ${form.semester}`:"Select Semester"}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#374151"/>
                </Pressable>
              </View>

              {/* Admission Year */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Admission Year (Batch) *</Text>
                <Pressable style={styles.fieldRow} onPress={()=>openPicker("admissionYear","Select Admission Year",YEARS)}>
                  <Ionicons name="calendar-outline" size={15} color="#64748b" style={{marginRight:8}}/>
                  <Text style={[styles.fieldInput,{paddingVertical:14,color:form.admissionYear?"#fff":"#374151"}]}>
                    {form.admissionYear||"Select Year (e.g. 2023)"}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#374151"/>
                </Pressable>
              </View>

              {/* Section Preview */}
              {form.department && form.admissionYear && (
                <View style={styles.sectionPreview}>
                  <Ionicons name="people" size={14} color="#f59e0b"/>
                  <Text style={styles.sectionPreviewText}>
                    Section: {deptShortForm(form.department)} {form.admissionYear}
                    {form.semester ? `  •  Sem ${form.semester}` : ""}
                  </Text>
                </View>
              )}

              {/* Submit */}
              <Pressable style={[styles.submitBtn,saving&&{opacity:0.7}]} onPress={handleSendRequest} disabled={saving}>
                <LinearGradient colors={["#f59e0b","#d97706"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitGrad}>
                  {saving
                    ? <ActivityIndicator color="#fff"/>
                    : <><Ionicons name="send-outline" size={17} color="#fff"/>
                       <Text style={styles.submitText}>Send Request to Admin</Text></>}
                </LinearGradient>
              </Pressable>
              <View style={{height:40}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Picker Modal */}
      <PickerModal
        visible={picker.visible} title={picker.title} options={picker.options}
        selected={form[picker.field]} onSelect={setPickerValue} onClose={closePicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#080d17" },
  center:{ flex:1,justifyContent:"center",alignItems:"center",marginTop:60 },
  header:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingTop:52,paddingBottom:14 },
  menuBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter:{ flex:1,alignItems:"center" },
  headerTitle:{ color:"#fff",fontSize:18,fontWeight:"700" },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  addBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(245,158,11,0.15)",justifyContent:"center",alignItems:"center" },
  // Tabs
  tabs:{ flexDirection:"row",backgroundColor:"#0f1923",marginHorizontal:16,marginTop:12,borderRadius:14,padding:4,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  tab:{ flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,paddingVertical:10,borderRadius:10 },
  tabActive:{ backgroundColor:"rgba(245,158,11,0.15)" },
  tabText:{ color:"#64748b",fontSize:12,fontWeight:"600" },
  tabTextActive:{ color:"#f59e0b" },
  tabBadge:{ backgroundColor:"#f59e0b",borderRadius:10,paddingHorizontal:5,paddingVertical:1 },
  tabBadgeText:{ color:"#000",fontSize:9,fontWeight:"800" },
  // Search
  searchWrapper:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",marginHorizontal:16,marginTop:12,borderRadius:14,paddingHorizontal:14,paddingVertical:2,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  searchInput:{ flex:1,color:"#fff",fontSize:14,paddingVertical:12 },
  // Filters
  filterChip:{ paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:"#1a2535",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  filterChipText:{ color:"#64748b",fontSize:12,fontWeight:"600" },
  semChip:{ paddingHorizontal:12,paddingVertical:5,borderRadius:16,backgroundColor:"#1a2535",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  semChipActive:{ backgroundColor:"rgba(167,139,250,0.15)",borderColor:"rgba(167,139,250,0.3)" },
  semChipText:{ color:"#64748b",fontSize:11,fontWeight:"600" },
  semChipTextActive:{ color:"#a78bfa" },
  list:{ padding:16,paddingTop:10,paddingBottom:30 },
  // Student card
  card:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:16,marginBottom:8,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  cardAccent:{ width:3,alignSelf:"stretch" },
  avatar:{ width:46,height:46,borderRadius:23,justifyContent:"center",alignItems:"center",margin:12 },
  avatarImg:{ width:46,height:46,borderRadius:23 },
  avatarText:{ fontSize:17,fontWeight:"800" },
  cardBody:{ flex:1,paddingVertical:12,paddingRight:4 },
  cardName:{ color:"#fff",fontSize:14,fontWeight:"700" },
  cardId:{ color:"#64748b",fontSize:11,marginTop:2 },
  cardMeta:{ flexDirection:"row",gap:6,marginTop:6,flexWrap:"wrap" },
  deptBadge:{ paddingHorizontal:8,paddingVertical:3,borderRadius:8 },
  deptBadgeText:{ fontSize:10,fontWeight:"700" },
  semBadge:{ paddingHorizontal:8,paddingVertical:3,borderRadius:8,backgroundColor:"rgba(255,255,255,0.06)" },
  semBadgeText:{ color:"#64748b",fontSize:10,fontWeight:"600" },
  // Request card
  reqCard:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,marginBottom:10,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  reqAccent:{ width:3,alignSelf:"stretch" },
  reqBody:{ flex:1,padding:14 },
  reqTopRow:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:4 },
  reqSubject:{ color:"#fff",fontSize:14,fontWeight:"700",flex:1,marginRight:8 },
  reqCode:{ color:"#64748b",fontSize:11,marginBottom:6 },
  statusBadge:{ flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:8,paddingVertical:3,borderRadius:8 },
  statusText:{ fontSize:9,fontWeight:"800",letterSpacing:0.5 },
  reqMeta:{ flexDirection:"row",gap:12,marginTop:4 },
  reqMetaItem:{ flexDirection:"row",alignItems:"center",gap:4 },
  reqMetaText:{ color:"#64748b",fontSize:11 },
  reqNote:{ color:"#f87171",fontSize:11,marginTop:6,fontStyle:"italic" },
  reqAcceptedNote:{ color:"#34d399",fontSize:11,marginTop:6 },
  reqDelete:{ width:40,height:40,justifyContent:"center",alignItems:"center",marginRight:8 },
  newReqBtn:{ borderRadius:14,overflow:"hidden",marginBottom:14,borderWidth:1,borderColor:"rgba(245,158,11,0.2)" },
  newReqGrad:{ flexDirection:"row",alignItems:"center",gap:12,padding:16,borderRadius:14 },
  newReqTitle:{ color:"#f59e0b",fontSize:13,fontWeight:"700" },
  newReqSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  // Empty
  emptyState:{ alignItems:"center",paddingTop:60,gap:12 },
  emptyIcon:{ width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle:{ color:"#374151",fontSize:16,fontWeight:"700" },
  emptySubtitle:{ color:"#1f2937",fontSize:13 },
  // Form modal
  formOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  formSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.92,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  handle:{ width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4 },
  formHeader:{ flexDirection:"row",alignItems:"center",gap:12,padding:20,paddingBottom:8 },
  formHeaderIcon:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(245,158,11,0.15)",justifyContent:"center",alignItems:"center" },
  formTitle:{ flex:1,color:"#fff",fontSize:17,fontWeight:"800" },
  formSectionLabel:{ color:"#374151",fontSize:10,fontWeight:"800",letterSpacing:1,marginHorizontal:20,marginTop:16,marginBottom:8 },
  fieldWrap:{ marginHorizontal:20,marginBottom:10 },
  fieldLabel:{ color:"#64748b",fontSize:11,fontWeight:"600",marginBottom:6 },
  fieldRow:{ flexDirection:"row",alignItems:"center",backgroundColor:"rgba(255,255,255,0.06)",borderRadius:12,paddingHorizontal:12,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",minHeight:50 },
  fieldInput:{ flex:1,color:"#fff",fontSize:14,paddingVertical:14 },
  sectionPreview:{ flexDirection:"row",alignItems:"center",gap:8,marginHorizontal:20,marginTop:4,backgroundColor:"rgba(245,158,11,0.1)",padding:12,borderRadius:10,borderWidth:1,borderColor:"rgba(245,158,11,0.2)" },
  sectionPreviewText:{ color:"#f59e0b",fontSize:13,fontWeight:"600" },
  submitBtn:{ marginHorizontal:20,marginTop:20,borderRadius:14,overflow:"hidden" },
  submitGrad:{ flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:16,borderRadius:14 },
  submitText:{ color:"#fff",fontWeight:"700",fontSize:15 },
  // Picker
  pickerOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  pickerSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:height*0.6,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  pickerTitle:{ color:"#fff",fontSize:16,fontWeight:"700",marginBottom:12 },
  pickerOption:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:14,borderRadius:12,marginBottom:6,backgroundColor:"rgba(255,255,255,0.04)" },
  pickerOptionActive:{ backgroundColor:"rgba(0,198,255,0.1)",borderWidth:1,borderColor:"rgba(0,198,255,0.25)" },
  pickerOptionText:{ color:"#94a3b8",fontSize:13,flex:1 },
  // Detail modal
  modalOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end" },
  modalSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.85,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  modalHero:{ alignItems:"center",padding:24,borderRadius:20 },
  modalAvatar:{ width:80,height:80,borderRadius:40,justifyContent:"center",alignItems:"center",borderWidth:2.5,marginBottom:12 },
  modalAvatarImg:{ width:80,height:80,borderRadius:40 },
  modalAvatarText:{ fontSize:28,fontWeight:"800" },
  modalName:{ color:"#fff",fontSize:20,fontWeight:"800" },
  modalStudentId:{ color:"#64748b",fontSize:13,marginTop:4,marginBottom:12 },
  modalBadges:{ flexDirection:"row",gap:8,flexWrap:"wrap",justifyContent:"center" },
  modalBadge:{ paddingHorizontal:12,paddingVertical:5,borderRadius:20,borderWidth:1 },
  modalBadgeText:{ fontSize:12,fontWeight:"600" },
  modalInfoCard:{ margin:16,backgroundColor:"#1a2535",borderRadius:16,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  modalInfoRow:{ flexDirection:"row",alignItems:"center",padding:14,borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,0.04)" },
  modalInfoIcon:{ width:34,height:34,borderRadius:10,justifyContent:"center",alignItems:"center",marginRight:12 },
  modalInfoContent:{ flex:1 },
  modalInfoLabel:{ color:"#374151",fontSize:10,fontWeight:"600",marginBottom:2 },
  modalInfoValue:{ color:"#e2e8f0",fontSize:14,fontWeight:"600" },
  modalClose:{ margin:16,marginTop:4,padding:16,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:14,alignItems:"center" },
  modalCloseText:{ color:"#94a3b8",fontSize:15,fontWeight:"700" },
});