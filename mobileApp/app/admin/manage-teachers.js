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
  "Nims Institute of Engineering and Technology": ["Computer Science Engineering (CSE)","Information Technology (IT)","Electronics and Communication Engineering (ECE)","Electrical Engineering (EE)","Mechanical Engineering (ME)","Civil Engineering","Chemical Engineering","Artificial Intelligence & Machine Learning","Data Science Engineering"],
  "Nims College of Management Studies": ["BBA","MBA","Finance","Marketing","Human Resource"],
  "Nims College of Nursing": ["B.Sc Nursing","GNM","Post Basic Nursing"],
  "Nims College of Pharmacy": ["D.Pharm","B.Pharm","M.Pharm"],
  "Nims College of Law": ["LLB","BA LLB","LLM"],
  "Nims College of Dental": ["BDS","MDS"],
};

import API from "../../services/api";

const genTeacherId = (joiningYear) => {
  const yr  = joiningYear || new Date().getFullYear();
  const num = Math.floor(100 + Math.random() * 900);
  return `${yr}-TEC-${num}`;
};

export default function ManageTeachers() {
  const router = useRouter();

  const [adminCollege, setAdminCollege] = useState("");
  const [collegeDepts, setCollegeDepts] = useState([]);
  const [teachers,     setTeachers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [deptFilter,   setDeptFilter]   = useState("All");
  const [search,       setSearch]       = useState("");
  const [addModal,     setAddModal]     = useState(false);
  const [addForm,      setAddForm]      = useState({ name:"", email:"", password:"", phone:"", teacherId:"", department:"" });
  const [addLoading,   setAddLoading]   = useState(false);

  const loadCollegeInfo = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("adminData");
      if (raw) {
        const d = JSON.parse(raw);
        const college = d.college || d.user?.college || "";
        setAdminCollege(college);
        const depts = COLLEGE_DEPARTMENTS[college] || [];
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
    } catch(e) { console.log("loadCollegeInfo error:", e.message); }
    return "";
  }, []);

  useEffect(() => { loadCollegeInfo(); }, []);

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
      await loadCollegeInfo();
      loadTeachers();
    })();
  }, [loadTeachers]));

  const openAddModal = () => {
    setAddForm({ name:"", email:"", password:"", phone:"", teacherId: genTeacherId(new Date().getFullYear()), department:"" });
    setAddModal(true);
  };

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
      await API.post("/admin/add-teacher", { ...addForm, college: adminCollege });
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
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

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
        <Pressable onPress={openAddModal} style={[styles.addBtn, { backgroundColor:"rgba(245,158,11,0.1)" }]}>
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
            contentContainerStyle={{ paddingBottom:30 }}
            ListHeaderComponent={
              <View>
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
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterRow}
                  contentContainerStyle={{ paddingHorizontal:16, gap:8 }}
                >
                  {["All", ...collegeDepts].map(d => {
                    const short = d === "All" ? "All" : (d.match(/\(([^)]+)\)/)?.[1] || d.split(" ")[0]);
                    return (
                      <Pressable key={d} onPress={() => setDeptFilter(d)}
                        style={[styles.chip, deptFilter === d && styles.chipActive]}>
                        <Text style={[styles.chipText, deptFilter === d && styles.chipTextActive]}>{short}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={styles.countText}>{filtered.length} teachers</Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.emptyText}>No teachers found</Text>}
          />
        )
      }

      {/* ══ ADD TEACHER MODAL ══ */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.handle}/>
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle}>Add New Teacher</Text>
                <Pressable onPress={() => setAddModal(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748b"/>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal:20, paddingBottom:44 }}>

                <View style={styles.collegeInfoBox}>
                  <Ionicons name="business" size={14} color="#f59e0b" />
                  <Text style={styles.collegeInfoText} numberOfLines={1}>
                    College: <Text style={{ color:"#f59e0b", fontWeight:"800" }}>{adminCollege}</Text>
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Teacher ID</Text>
                <View style={styles.teacherIdRow}>
                  <TextInput style={[styles.input, { flex:1, marginBottom:0 }]}
                    value={addForm.teacherId}
                    onChangeText={v => setAddForm(p => ({ ...p, teacherId:v }))}
                    placeholderTextColor="#374151"
                    autoCapitalize="characters" />
                  <Pressable style={styles.regenBtn}
                    onPress={() => setAddForm(p => ({ ...p, teacherId: genTeacherId(new Date().getFullYear()) }))}>
                    <Ionicons name="refresh" size={16} color="#34d399" />
                  </Pressable>
                </View>

                <View style={{ height:14 }}/>

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

                <Text style={styles.fieldLabel}>Department *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap:8, marginBottom:8 }}>
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
                  <Pressable style={[styles.confirmBtn, { backgroundColor:"#f59e0b" }, addLoading && { opacity:0.6 }]}
                    onPress={handleAddTeacher} disabled={addLoading}>
                    {addLoading
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Text style={styles.confirmBtnText}>Add Teacher</Text>
                    }
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  card:            { backgroundColor:"#1a2535", borderRadius:16, marginHorizontal:16, marginBottom:12, borderWidth:1, borderColor:"rgba(255,255,255,0.05)", overflow:"hidden" },
  cardHeader:      { flexDirection:"row", alignItems:"center", padding:14, gap:12 },
  avatar:          { width:46, height:46, borderRadius:23, backgroundColor:"rgba(245,158,11,0.15)", justifyContent:"center", alignItems:"center" },
  avatarText:      { color:"#f59e0b", fontSize:15, fontWeight:"800" },
  info:            { flex:1 },
  name:            { color:"#fff", fontSize:14, fontWeight:"700" },
  sub:             { color:"#64748b", fontSize:12, marginTop:1 },
  email:           { color:"#374151", fontSize:11, marginTop:1 },
  emptyText:       { color:"#374151", textAlign:"center", marginTop:40, fontSize:14 },
  overlay:         { flex:1, backgroundColor:"rgba(0,0,0,0.75)", justifyContent:"flex-end" },
  sheet:           { backgroundColor:"#1a2535", borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:"90%", paddingBottom:Platform.OS==="ios"?34:20 },
  handle:          { width:36, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.15)", alignSelf:"center", marginTop:12, marginBottom:4 },
  sheetTitleRow:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)" },
  sheetTitle:      { color:"#fff", fontSize:16, fontWeight:"800" },
  closeBtn:        { width:32, height:32, borderRadius:16, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  fieldLabel:      { color:"#64748b", fontSize:11, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5, marginBottom:8, marginTop:14 },
  input:           { backgroundColor:"#0f172a", color:"#fff", borderRadius:10, paddingHorizontal:14, paddingVertical:12, marginBottom:10, fontSize:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  modalBtns:       { flexDirection:"row", gap:12, marginTop:16 },
  cancelBtn:       { flex:1, paddingVertical:14, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", alignItems:"center" },
  cancelBtnText:   { color:"#64748b", fontWeight:"700" },
  confirmBtn:      { flex:1, paddingVertical:14, borderRadius:12, alignItems:"center" },
  confirmBtnText:  { color:"#000", fontWeight:"800", fontSize:14 },
  collegeInfoBox:  { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(245,158,11,0.08)", padding:12, borderRadius:10, borderWidth:1, borderColor:"rgba(245,158,11,0.2)", marginTop:16, marginBottom:4 },
  collegeInfoText: { color:"#94a3b8", fontSize:12, flex:1 },
  teacherIdRow:    { flexDirection:"row", alignItems:"center", gap:8 },
  regenBtn:        { width:40, height:44, borderRadius:10, backgroundColor:"rgba(52,211,153,0.1)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(52,211,153,0.25)" },
  selectedDeptBox: { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(245,158,11,0.08)", padding:10, borderRadius:8, marginBottom:10, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  selectedDeptText:{ color:"#f59e0b", fontSize:11, fontWeight:"600", flex:1 },
});