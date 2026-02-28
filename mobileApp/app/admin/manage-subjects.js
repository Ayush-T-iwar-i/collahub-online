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

const EMPTY_FORM = { name: "", code: "", department: "", semester: "", credits: "", description: "" };

const SubjectCard = ({ item, onEdit, onDelete }) => {
  const color = "#34d399";
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
        <Ionicons name="book" size={20} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardMetaRow}>
          {item.code && <View style={styles.codeBadge}><Text style={styles.codeBadgeText}>{item.code}</Text></View>}
          {item.semester && <Text style={styles.cardSub}>Sem {item.semester}</Text>}
          {item.credits && <Text style={styles.cardSub}>• {item.credits} credits</Text>}
        </View>
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

const Field = ({ label, icon, value, onChangeText, keyboardType }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={16} color="#64748b" style={{ marginRight: 8 }} />
      <TextInput style={styles.fieldInput} value={value} onChangeText={onChangeText}
        placeholderTextColor="#374151" placeholder={label}
        keyboardType={keyboardType || "default"} autoCapitalize="none" />
    </View>
  </View>
);

const Picker = ({ label, icon, value, options, onSelect, accent = "#34d399" }) => {
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
                <Pressable key={opt} style={[styles.pickerOption, value === opt && { backgroundColor: accent + "15", borderWidth: 1, borderColor: accent + "30" }]}
                  onPress={() => { onSelect(opt); setOpen(false); }}>
                  <Text style={[styles.pickerOptionText, value === opt && { color: accent }]} numberOfLines={2}>{opt}</Text>
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

export default function ManageSubjects() {
  const router = useRouter();
  const [subjects, setSubjects]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useFocusEffect(useCallback(() => { loadSubjects(); }, []));

  const loadSubjects = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/subjects/all");
      const data = res.data?.subjects || res.data || [];
      setSubjects(data); setFiltered(data);
    } catch (e) { Alert.alert("Error", "Could not load subjects"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleSearch = (text) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(subjects.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    ));
  };

  const openAdd = () => { setEditingSubject(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (subject) => {
    setEditingSubject(subject);
    setForm({ name: subject.name||"", code: subject.code||"", department: subject.department||"",
      semester: String(subject.semester||""), credits: String(subject.credits||""), description: subject.description||"" });
    setModalVisible(true);
  };

  const handleDelete = (subject) => {
    Alert.alert("Delete Subject", `Delete "${subject.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await API.delete(`/subjects/${subject._id}`); loadSubjects(); }
        catch (e) { Alert.alert("Error", e.response?.data?.message || "Could not delete"); }
      }},
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim())    return Alert.alert("Error", "Subject name required");
    if (!form.code.trim())    return Alert.alert("Error", "Subject code required");
    if (!form.department)     return Alert.alert("Error", "Department required");
    if (!form.semester)       return Alert.alert("Error", "Semester required");
    try {
      setSaving(true);
      if (editingSubject) await API.put(`/subjects/${editingSubject._id}`, form);
      else await API.post("/subjects/create", form);
      setModalVisible(false); loadSubjects();
      Alert.alert("Success ✅", editingSubject ? "Subject updated!" : "Subject added!");
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
          <Text style={styles.headerTitle}>Manage Subjects</Text>
          <Text style={styles.headerSub}>{filtered.length} subjects</Text>
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: "rgba(52,211,153,0.2)", borderColor: "rgba(52,211,153,0.3)" }]} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#34d399" />
        </Pressable>
      </LinearGradient>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Search subjects..." placeholderTextColor="#374151"
          value={search} onChangeText={handleSearch} />
        {search.length > 0 && <Pressable onPress={() => handleSearch("")}><Ionicons name="close-circle" size={16} color="#64748b" /></Pressable>}
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#34d399" /></View> : (
        <FlatList
          data={filtered} keyExtractor={item => item._id}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSubjects(true)} tintColor="#34d399" />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="book-outline" size={40} color="#374151" /></View>
              <Text style={styles.emptyTitle}>No Subjects Found</Text>
              <Pressable style={[styles.emptyAddBtn, { backgroundColor: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.2)" }]} onPress={openAdd}>
                <Ionicons name="add-circle-outline" size={16} color="#34d399" />
                <Text style={[styles.emptyAddText, { color: "#34d399" }]}>Add First Subject</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => <SubjectCard item={item} onEdit={openEdit} onDelete={handleDelete} />}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.formHeader}>
              <View style={[styles.formHeaderIcon, { backgroundColor: "rgba(52,211,153,0.15)" }]}>
                <Ionicons name={editingSubject ? "pencil" : "add-circle"} size={20} color="#34d399" />
              </View>
              <Text style={styles.formTitle}>{editingSubject ? "Edit Subject" : "Add New Subject"}</Text>
              <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} color="#64748b" /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionLabel}>SUBJECT INFO</Text>
              <Field label="Subject Name"  icon="book-outline"   value={form.name}        onChangeText={f("name")} />
              <Field label="Subject Code"  icon="code-slash"     value={form.code}        onChangeText={f("code")} />
              <Field label="Credits"       icon="star-outline"   value={form.credits}     onChangeText={f("credits")} keyboardType="numeric" />
              <Field label="Description"   icon="document-text-outline" value={form.description} onChangeText={f("description")} />
              <Text style={styles.sectionLabel}>ACADEMIC INFO</Text>
              <Picker label="Department" icon="school-outline" value={form.department} options={DEPARTMENTS} onSelect={f("department")} accent="#34d399" />
              <Picker label="Semester"   icon="layers-outline" value={form.semester}   options={SEMESTERS}   onSelect={f("semester")}   accent="#34d399" />
              <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                <LinearGradient colors={editingSubject ? ["#f59e0b","#d97706"] : ["#10b981","#059669"]}
                  start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name={editingSubject ? "save-outline" : "add-circle-outline"} size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>{editingSubject ? "Save Changes" : "Add Subject"}</Text></>}
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
  container: { flex:1,backgroundColor:"#080d17" },
  center: { flex:1,justifyContent:"center",alignItems:"center" },
  header: { flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingTop:52,paddingBottom:14,justifyContent:"space-between" },
  backBtn: { width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter: { flex:1,alignItems:"center" },
  headerTitle: { color:"#fff",fontSize:18,fontWeight:"800" },
  headerSub: { color:"#64748b",fontSize:11,marginTop:2 },
  addBtn: { width:40,height:40,borderRadius:12,justifyContent:"center",alignItems:"center",borderWidth:1 },
  searchBar: { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#1a2535",marginHorizontal:16,marginTop:12,borderRadius:14,paddingHorizontal:14,paddingVertical:2,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  searchInput: { flex:1,color:"#fff",fontSize:14,paddingVertical:12 },
  list: { padding:16,paddingBottom:30 },
  card: { flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,marginBottom:8,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  cardAccent: { width:3,alignSelf:"stretch" },
  iconBox: { width:44,height:44,borderRadius:12,justifyContent:"center",alignItems:"center",margin:12 },
  cardBody: { flex:1,paddingVertical:12 },
  cardName: { color:"#fff",fontSize:14,fontWeight:"700" },
  cardMetaRow: { flexDirection:"row",alignItems:"center",gap:6,marginTop:4,marginBottom:2 },
  codeBadge: { backgroundColor:"rgba(52,211,153,0.15)",paddingHorizontal:8,paddingVertical:2,borderRadius:6 },
  codeBadgeText: { color:"#34d399",fontSize:10,fontWeight:"700" },
  cardSub: { color:"#64748b",fontSize:11 },
  cardActions: { flexDirection:"row",gap:6,paddingRight:12 },
  editBtn: { width:34,height:34,borderRadius:10,backgroundColor:"rgba(245,158,11,0.12)",justifyContent:"center",alignItems:"center" },
  deleteBtn: { width:34,height:34,borderRadius:10,backgroundColor:"rgba(248,113,113,0.12)",justifyContent:"center",alignItems:"center" },
  emptyState: { alignItems:"center",paddingTop:60,gap:16 },
  emptyIcon: { width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle: { color:"#374151",fontSize:16,fontWeight:"700" },
  emptyAddBtn: { flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:20,paddingVertical:12,borderRadius:12,borderWidth:1 },
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
  pickerOptionText: { color:"#94a3b8",fontSize:13,flex:1 },
  saveBtn: { marginHorizontal:20,marginTop:20,borderRadius:14,overflow:"hidden" },
  saveBtnGrad: { flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:16,borderRadius:14 },
  saveBtnText: { color:"#fff",fontWeight:"700",fontSize:16 },
});