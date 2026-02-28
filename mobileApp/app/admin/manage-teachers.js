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

const { height } = Dimensions.get("window");

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

const EMPTY_FORM = {
  name: "", email: "", phone: "", teacherId: "",
  college: "", department: "", password: "",
};

const TeacherCard = ({ item, onEdit, onDelete }) => {
  const initials = item.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "T";
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: "#f59e0b" }]} />
      <View style={[styles.avatar, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
        <Text style={[styles.avatarText, { color: "#f59e0b" }]}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSub}>{item.teacherId || item.id || "—"}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{item.department?.split("(")[0]?.trim() || "—"}</Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil" size={15} color="#f59e0b" />
        </Pressable>
        <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash" size={15} color="#f87171" />
        </Pressable>
      </View>
    </View>
  );
};

const Field = ({ label, icon, value, onChangeText, keyboardType, secureTextEntry }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={16} color="#64748b" style={{ marginRight: 8 }} />
      <TextInput
        style={styles.fieldInput} value={value} onChangeText={onChangeText}
        placeholderTextColor="#374151" placeholder={label}
        keyboardType={keyboardType || "default"} secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
    </View>
  </View>
);

const Picker = ({ label, icon, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.fieldRow} onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={16} color="#64748b" style={{ marginRight: 8 }} />
        <Text style={[styles.fieldInput, { color: value ? "#fff" : "#374151", paddingVertical: 14 }]} numberOfLines={1}>
          {value || `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#374151" />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>{label}</Text>
            <ScrollView>
              {options.map((opt) => (
                <Pressable key={opt} style={[styles.pickerOption, value === opt && styles.pickerOptionActive]}
                  onPress={() => { onSelect(opt); setOpen(false); }}>
                  <Text style={[styles.pickerOptionText, value === opt && { color: "#f59e0b" }]} numberOfLines={2}>{opt}</Text>
                  {value === opt && <Ionicons name="checkmark-circle" size={16} color="#f59e0b" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function ManageTeachers() {
  const router = useRouter();
  const [teachers, setTeachers]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useFocusEffect(useCallback(() => { loadTeachers(); }, []));

  const loadTeachers = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/teachers/all");
      const data = res.data?.teachers || res.data || [];
      setTeachers(data); setFiltered(data);
    } catch (e) { Alert.alert("Error", "Could not load teachers"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleSearch = (text) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(teachers.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.teacherId?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q)
    ));
  };

  const openAdd = () => { setEditingTeacher(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setForm({ name: teacher.name||"", email: teacher.email||"", phone: teacher.phone||"",
      teacherId: teacher.teacherId||"", college: teacher.college||"",
      department: teacher.department||"", password: "" });
    setModalVisible(true);
  };

  const handleDelete = (teacher) => {
    Alert.alert("Delete Teacher", `Delete ${teacher.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await API.delete(`/teachers/${teacher._id}`); loadTeachers(); }
        catch (e) { Alert.alert("Error", e.response?.data?.message || "Could not delete"); }
      }},
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim())  return Alert.alert("Error", "Name is required");
    if (!form.email.trim()) return Alert.alert("Error", "Email is required");
    if (!form.college)      return Alert.alert("Error", "College is required");
    if (!form.department)   return Alert.alert("Error", "Department is required");
    if (!editingTeacher && !form.password) return Alert.alert("Error", "Password required for new teacher");
    try {
      setSaving(true);
      const payload = { ...form };
      if (editingTeacher && !payload.password) delete payload.password;
      if (editingTeacher) await API.put(`/teachers/${editingTeacher._id}`, payload);
      else await API.post("/admin/add-teacher", payload);
      setModalVisible(false); loadTeachers();
      Alert.alert("Success ✅", editingTeacher ? "Teacher updated!" : "Teacher added!");
    } catch (e) { Alert.alert("Error", e.response?.data?.message || "Could not save"); }
    finally { setSaving(false); }
  };

  const f = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Teachers</Text>
          <Text style={styles.headerSub}>{filtered.length} teachers</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </Pressable>
      </LinearGradient>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Search teachers..." placeholderTextColor="#374151"
          value={search} onChangeText={handleSearch} />
        {search.length > 0 && <Pressable onPress={() => handleSearch("")}><Ionicons name="close-circle" size={16} color="#64748b" /></Pressable>}
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View> : (
        <FlatList
          data={filtered} keyExtractor={item => item._id}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTeachers(true)} tintColor="#f59e0b" />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="person-outline" size={40} color="#374151" /></View>
              <Text style={styles.emptyTitle}>No Teachers Found</Text>
              <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
                <Ionicons name="person-add-outline" size={16} color="#f59e0b" />
                <Text style={[styles.emptyAddText, { color: "#f59e0b" }]}>Add First Teacher</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => <TeacherCard item={item} onEdit={openEdit} onDelete={handleDelete} />}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.formHeader}>
              <View style={[styles.formHeaderIcon, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                <Ionicons name={editingTeacher ? "pencil" : "person-add"} size={20} color="#f59e0b" />
              </View>
              <Text style={styles.formTitle}>{editingTeacher ? "Edit Teacher" : "Add New Teacher"}</Text>
              <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} color="#64748b" /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionLabel}>BASIC INFO</Text>
              <Field label="Full Name"   icon="person-outline" value={form.name}      onChangeText={f("name")} />
              <Field label="Email"       icon="mail-outline"   value={form.email}     onChangeText={f("email")} keyboardType="email-address" />
              <Field label="Phone"       icon="call-outline"   value={form.phone}     onChangeText={f("phone")} keyboardType="phone-pad" />
              <Field label="Teacher ID"  icon="card-outline"   value={form.teacherId} onChangeText={f("teacherId")} />
              <Text style={styles.sectionLabel}>ACADEMIC INFO</Text>
              <Picker label="College"    icon="business-outline" value={form.college}    options={COLLEGES}    onSelect={f("college")} />
              <Picker label="Department" icon="school-outline"   value={form.department} options={DEPARTMENTS} onSelect={f("department")} />
              <Text style={styles.sectionLabel}>{editingTeacher ? "CHANGE PASSWORD (optional)" : "ACCOUNT"}</Text>
              <Field label="Password" icon="lock-closed-outline" value={form.password} onChangeText={f("password")} secureTextEntry />
              <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                <LinearGradient colors={editingTeacher ? ["#f59e0b","#d97706"] : ["#10b981","#059669"]}
                  start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name={editingTeacher ? "save-outline" : "person-add-outline"} size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>{editingTeacher ? "Save Changes" : "Add Teacher"}</Text></>}
                </LinearGradient>
              </Pressable>
              <View style={{ height: 40 }} />
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
  header: { flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingTop:52,paddingBottom:14,justifyContent:"space-between" },
  backBtn: { width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter: { flex:1,alignItems:"center" },
  headerTitle: { color:"#fff",fontSize:18,fontWeight:"800" },
  headerSub: { color:"#64748b",fontSize:11,marginTop:2 },
  addBtn: { width:40,height:40,borderRadius:12,backgroundColor:"rgba(245,158,11,0.2)",justifyContent:"center",alignItems:"center",borderWidth:1,borderColor:"rgba(245,158,11,0.3)" },
  searchBar: { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#1a2535",marginHorizontal:16,marginTop:12,borderRadius:14,paddingHorizontal:14,paddingVertical:2,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  searchInput: { flex:1,color:"#fff",fontSize:14,paddingVertical:12 },
  list: { padding:16,paddingBottom:30 },
  card: { flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,marginBottom:8,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  cardAccent: { width:3,alignSelf:"stretch" },
  avatar: { width:44,height:44,borderRadius:22,justifyContent:"center",alignItems:"center",margin:12 },
  avatarText: { fontSize:16,fontWeight:"800" },
  cardBody: { flex:1,paddingVertical:12 },
  cardName: { color:"#fff",fontSize:14,fontWeight:"700" },
  cardSub: { color:"#64748b",fontSize:11,marginTop:2 },
  cardActions: { flexDirection:"row",gap:6,paddingRight:12 },
  editBtn: { width:34,height:34,borderRadius:10,backgroundColor:"rgba(245,158,11,0.12)",justifyContent:"center",alignItems:"center" },
  deleteBtn: { width:34,height:34,borderRadius:10,backgroundColor:"rgba(248,113,113,0.12)",justifyContent:"center",alignItems:"center" },
  emptyState: { alignItems:"center",paddingTop:60,gap:16 },
  emptyIcon: { width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle: { color:"#374151",fontSize:16,fontWeight:"700" },
  emptyAddBtn: { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(245,158,11,0.1)",paddingHorizontal:20,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:"rgba(245,158,11,0.2)" },
  emptyAddText: { fontWeight:"700" },
  modalOverlay: { flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  formSheet: { backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.92,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  modalHandle: { width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4 },
  formHeader: { flexDirection:"row",alignItems:"center",gap:12,padding:20,paddingBottom:8 },
  formHeaderIcon: { width:40,height:40,borderRadius:12,justifyContent:"center",alignItems:"center" },
  formTitle: { flex:1,color:"#fff",fontSize:17,fontWeight:"800" },
  sectionLabel: { color:"#374151",fontSize:10,fontWeight:"800",letterSpacing:1,marginHorizontal:20,marginTop:16,marginBottom:8 },
  fieldWrap: { marginHorizontal:20,marginBottom:10 },
  fieldLabel: { color:"#64748b",fontSize:11,fontWeight:"600",marginBottom:6 },
  fieldRow: { flexDirection:"row",alignItems:"center",backgroundColor:"rgba(255,255,255,0.06)",borderRadius:12,paddingHorizontal:12,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",minHeight:50 },
  fieldInput: { flex:1,color:"#fff",fontSize:14,paddingVertical:14 },
  pickerSheet: { backgroundColor:"#0f1923",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:height*0.6,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  pickerTitle: { color:"#fff",fontSize:16,fontWeight:"700",marginBottom:12 },
  pickerOption: { flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:14,borderRadius:12,marginBottom:6,backgroundColor:"rgba(255,255,255,0.04)" },
  pickerOptionActive: { backgroundColor:"rgba(245,158,11,0.1)",borderWidth:1,borderColor:"rgba(245,158,11,0.25)" },
  pickerOptionText: { color:"#94a3b8",fontSize:13,flex:1 },
  saveBtn: { marginHorizontal:20,marginTop:20,borderRadius:14,overflow:"hidden" },
  saveBtnGrad: { flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:16,borderRadius:14 },
  saveBtnText: { color:"#fff",fontWeight:"700",fontSize:16 },
});