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

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const EMPTY_FORM = { day: "", subjectId: "", teacherId: "", startTime: "", endTime: "", room: "", semester: "", department: "" };

const SEMESTERS   = ["1","2","3","4","5","6","7","8"];
const DEPARTMENTS = [
  "Computer Science Engineering (CSE)", "Information Technology (IT)",
  "Electronics and Communication Engineering (ECE)", "Electrical Engineering (EE)",
  "Mechanical Engineering (ME)", "Civil Engineering",
  "Artificial Intelligence & Machine Learning", "Data Science Engineering",
];

const DAY_COLORS = { Monday:"#00c6ff", Tuesday:"#34d399", Wednesday:"#f59e0b", Thursday:"#a78bfa", Friday:"#f87171", Saturday:"#fb923c" };

const TimetableCard = ({ item, onEdit, onDelete }) => {
  const color = DAY_COLORS[item.day] || "#64748b";
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.dayBadge, { backgroundColor: color + "20" }]}>
            <Text style={[styles.dayBadgeText, { color }]}>{item.day}</Text>
          </View>
          <Text style={styles.timeText}>{item.startTime} — {item.endTime}</Text>
        </View>
        <Text style={styles.cardSubject} numberOfLines={1}>{item.subjectId?.name || item.subjectName || "Subject"}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>{item.teacherId?.name || "Teacher"}</Text>
          {item.room && <><Text style={styles.cardMetaDot}>•</Text><Text style={styles.cardMetaText}>Room {item.room}</Text></>}
          {item.semester && <><Text style={styles.cardMetaDot}>•</Text><Text style={styles.cardMetaText}>Sem {item.semester}</Text></>}
        </View>
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

const Picker = ({ label, icon, value, options, onSelect, accent = "#a78bfa", displayFn }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.fieldRow} onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={16} color="#64748b" style={{ marginRight: 8 }} />
        <Text style={[styles.fieldInput, { color: value ? "#fff" : "#374151", paddingVertical: 14 }]} numberOfLines={1}>
          {value ? (displayFn ? displayFn(value) : value) : `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#374151" />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>{label}</Text>
            <ScrollView>
              {options.map((opt) => {
                const optVal = typeof opt === "object" ? opt._id : opt;
                const optLabel = typeof opt === "object" ? (opt.name || optVal) : opt;
                return (
                  <Pressable key={optVal} style={[styles.pickerOption, value === optVal && { backgroundColor: accent + "15", borderWidth:1, borderColor: accent + "30" }]}
                    onPress={() => { onSelect(optVal); setOpen(false); }}>
                    <Text style={[styles.pickerOptionText, value === optVal && { color: accent }]} numberOfLines={2}>{optLabel}</Text>
                    {value === optVal && <Ionicons name="checkmark-circle" size={16} color={accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const Field = ({ label, icon, value, onChangeText, placeholder }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={16} color="#64748b" style={{ marginRight: 8 }} />
      <TextInput style={styles.fieldInput} value={value} onChangeText={onChangeText}
        placeholderTextColor="#374151" placeholder={placeholder || label} autoCapitalize="none" />
    </View>
  </View>
);

export default function ManageTimetable() {
  const router = useRouter();
  const [timetable, setTimetable] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState("All");
  const [subjects, setSubjects]   = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [ttRes, subRes, tchRes] = await Promise.all([
        API.get("/timetable/all"),
        API.get("/subjects/all"),
        API.get("/teachers/all"),
      ]);
      const tt = ttRes.data?.timetable || ttRes.data || [];
      setTimetable(tt); setFiltered(tt);
      setSubjects(subRes.data?.subjects || subRes.data || []);
      setTeachers(tchRes.data?.teachers || tchRes.data || []);
    } catch (e) { Alert.alert("Error", "Could not load timetable"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const filterByDay = (day) => {
    setSelectedDay(day);
    setFiltered(day === "All" ? timetable : timetable.filter(t => t.day === day));
  };

  const openAdd  = () => { setEditingEntry(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (entry) => {
    setEditingEntry(entry);
    setForm({
      day: entry.day||"", subjectId: entry.subjectId?._id||entry.subjectId||"",
      teacherId: entry.teacherId?._id||entry.teacherId||"",
      startTime: entry.startTime||"", endTime: entry.endTime||"",
      room: entry.room||"", semester: String(entry.semester||""), department: entry.department||"",
    });
    setModalVisible(true);
  };

  const handleDelete = (entry) => {
    Alert.alert("Delete Entry", "Remove this timetable entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await API.delete(`/timetable/${entry._id}`); loadAll(); }
        catch (e) { Alert.alert("Error", e.response?.data?.message || "Could not delete"); }
      }},
    ]);
  };

  const handleSave = async () => {
    if (!form.day)           return Alert.alert("Error", "Select a day");
    if (!form.subjectId)     return Alert.alert("Error", "Select a subject");
    if (!form.teacherId)     return Alert.alert("Error", "Select a teacher");
    if (!form.startTime.trim()) return Alert.alert("Error", "Enter start time (e.g. 09:00 AM)");
    if (!form.endTime.trim())   return Alert.alert("Error", "Enter end time");
    try {
      setSaving(true);
      if (editingEntry) await API.put(`/timetable/${editingEntry._id}`, form);
      else await API.post("/timetable/create", form);
      setModalVisible(false); loadAll();
      Alert.alert("Success ✅", editingEntry ? "Entry updated!" : "Entry added!");
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
          <Text style={styles.headerTitle}>Manage Timetable</Text>
          <Text style={styles.headerSub}>{filtered.length} entries</Text>
        </View>
        <Pressable style={[styles.addBtn, { backgroundColor: "rgba(167,139,250,0.2)", borderColor: "rgba(167,139,250,0.3)" }]} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#a78bfa" />
        </Pressable>
      </LinearGradient>

      {/* Day filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayRow}>
        {["All", ...DAYS].map((day) => {
          const isActive = selectedDay === day;
          const color = DAY_COLORS[day] || "#a78bfa";
          return (
            <Pressable key={day} onPress={() => filterByDay(day)}
              style={[styles.dayChip, isActive && { backgroundColor: color + "22", borderColor: color + "55" }]}>
              <Text style={[styles.dayChipText, isActive && { color }]}>{day}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#a78bfa" /></View> : (
        <FlatList
          data={filtered} keyExtractor={item => item._id}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#a78bfa" />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={40} color="#374151" /></View>
              <Text style={styles.emptyTitle}>No Timetable Entries</Text>
              <Pressable style={[styles.emptyAddBtn, { backgroundColor: "rgba(167,139,250,0.1)", borderColor: "rgba(167,139,250,0.2)" }]} onPress={openAdd}>
                <Ionicons name="add-circle-outline" size={16} color="#a78bfa" />
                <Text style={[styles.emptyAddText, { color: "#a78bfa" }]}>Add Entry</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => <TimetableCard item={item} onEdit={openEdit} onDelete={handleDelete} />}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.formHeader}>
              <View style={[styles.formHeaderIcon, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
                <Ionicons name={editingEntry ? "pencil" : "calendar"} size={20} color="#a78bfa" />
              </View>
              <Text style={styles.formTitle}>{editingEntry ? "Edit Entry" : "Add Timetable Entry"}</Text>
              <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} color="#64748b" /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionLabel}>SCHEDULE</Text>
              <Picker label="Day" icon="calendar-outline" value={form.day} options={DAYS} onSelect={f("day")} accent="#a78bfa" />
              <Field label="Start Time" icon="time-outline"  value={form.startTime} onChangeText={f("startTime")} placeholder="e.g. 09:00 AM" />
              <Field label="End Time"   icon="time-outline"  value={form.endTime}   onChangeText={f("endTime")}   placeholder="e.g. 10:00 AM" />
              <Field label="Room"       icon="location-outline" value={form.room}   onChangeText={f("room")}      placeholder="e.g. Room 101" />
              <Text style={styles.sectionLabel}>CLASS INFO</Text>
              <Picker label="Subject"    icon="book-outline"    value={form.subjectId} options={subjects}  onSelect={f("subjectId")} accent="#34d399" displayFn={(id) => subjects.find(s=>s._id===id)?.name || id} />
              <Picker label="Teacher"    icon="person-outline"  value={form.teacherId} options={teachers}  onSelect={f("teacherId")} accent="#f59e0b" displayFn={(id) => teachers.find(t=>t._id===id)?.name || id} />
              <Picker label="Semester"   icon="layers-outline"  value={form.semester}  options={SEMESTERS} onSelect={f("semester")}  accent="#a78bfa" />
              <Picker label="Department" icon="school-outline"  value={form.department} options={DEPARTMENTS} onSelect={f("department")} accent="#00c6ff" />
              <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                <LinearGradient colors={editingEntry ? ["#f59e0b","#d97706"] : ["#7c3aed","#a78bfa"]}
                  start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name={editingEntry ? "save-outline" : "add-circle-outline"} size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>{editingEntry ? "Save Changes" : "Add Entry"}</Text></>}
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
  dayScroll: { marginTop:12 },
  dayRow: { paddingHorizontal:16,gap:8,paddingBottom:4 },
  dayChip: { paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:"#1a2535",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  dayChipText: { color:"#64748b",fontSize:12,fontWeight:"600" },
  list: { padding:16,paddingBottom:30 },
  card: { flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,marginBottom:8,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  cardAccent: { width:3,alignSelf:"stretch" },
  cardBody: { flex:1,padding:12 },
  cardTop: { flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:6 },
  dayBadge: { paddingHorizontal:10,paddingVertical:3,borderRadius:8 },
  dayBadgeText: { fontSize:11,fontWeight:"700" },
  timeText: { color:"#94a3b8",fontSize:12,fontWeight:"600" },
  cardSubject: { color:"#fff",fontSize:14,fontWeight:"700",marginBottom:4 },
  cardMeta: { flexDirection:"row",alignItems:"center",gap:4,flexWrap:"wrap" },
  cardMetaText: { color:"#64748b",fontSize:11 },
  cardMetaDot: { color:"#374151",fontSize:11 },
  cardActions: { flexDirection:"row",gap:6,paddingRight:12 },
  editBtn: { width:34,height:34,borderRadius:10,backgroundColor:"rgba(245,158,11,0.12)",justifyContent:"center",alignItems:"center" },
  deleteBtn: { width:34,height:34,borderRadius:10,backgroundColor:"rgba(248,113,113,0.12)",justifyContent:"center",alignItems:"center" },
  emptyState: { alignItems:"center",paddingTop:60,gap:16 },
  emptyIcon: { width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle: { color:"#374151",fontSize:16,fontWeight:"700" },
  emptyAddBtn: { flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:20,paddingVertical:12,borderRadius:12,borderWidth:1 },
  emptyAddText: { fontWeight:"700" },
  modalOverlay: { flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  formSheet: { backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.95,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
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