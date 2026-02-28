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

const SEMESTERS = ["1","2","3","4","5","6","7","8"];
const GENDERS   = ["Male","Female","Other"];

const EMPTY_FORM = {
  name: "", email: "", phone: "", studentId: "",
  admissionYear: "", college: "", department: "",
  semester: "", gender: "", password: "",
};

// ── Student Card ──
const StudentCard = ({ item, onEdit, onDelete }) => {
  const color = "#00c6ff";
  const initials = item.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "S";
  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={[styles.avatar, { backgroundColor: color + "20" }]}>
        <Text style={[styles.avatarText, { color }]}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSub}>{item.studentId || "—"} • Sem {item.semester || "?"}</Text>
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

// ── Field ──
const Field = ({ label, icon, value, onChangeText, keyboardType, secureTextEntry, maxLength }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={16} color="#64748b" style={{ marginRight: 8 }} />
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#374151"
        placeholder={label}
        keyboardType={keyboardType || "default"}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        maxLength={maxLength}
      />
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
                <Pressable
                  key={opt}
                  style={[styles.pickerOption, value === opt && styles.pickerOptionActive]}
                  onPress={() => { onSelect(opt); setOpen(false); }}
                >
                  <Text style={[styles.pickerOptionText, value === opt && { color: "#00c6ff" }]} numberOfLines={2}>
                    {opt}
                  </Text>
                  {value === opt && <Ionicons name="checkmark-circle" size={16} color="#00c6ff" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default function ManageStudents() {
  const router = useRouter();

  const [students, setStudents]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // null = add, obj = edit
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  useFocusEffect(useCallback(() => { loadStudents(); }, []));

  const loadStudents = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await API.get("/students/all");
      const data = res.data?.students || res.data || [];
      setStudents(data);
      setFiltered(data);
    } catch (e) {
      Alert.alert("Error", "Could not load students");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(
      students.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.department?.toLowerCase().includes(q)
      )
    );
  };

  const openAdd = () => {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setForm({
      name:          student.name          || "",
      email:         student.email         || "",
      phone:         student.phone         || "",
      studentId:     student.studentId     || "",
      admissionYear: student.admissionYear || "",
      college:       student.college       || "",
      department:    student.department    || "",
      semester:      String(student.semester || ""),
      gender:        student.gender        || "",
      password:      "",
    });
    setModalVisible(true);
  };

  const handleDelete = (student) => {
    Alert.alert(
      "Delete Student",
      `Are you sure you want to delete ${student.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/students/${student._id}`);
              loadStudents();
            } catch (e) {
              Alert.alert("Error", e.response?.data?.message || "Could not delete");
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!form.name.trim())      return Alert.alert("Error", "Name is required");
    if (!form.email.trim())     return Alert.alert("Error", "Email is required");
    if (!form.studentId.trim()) return Alert.alert("Error", "Student ID is required");
    if (!form.college)          return Alert.alert("Error", "College is required");
    if (!form.department)       return Alert.alert("Error", "Department is required");
    if (!form.semester)         return Alert.alert("Error", "Semester is required");
    if (!editingStudent && !form.password) return Alert.alert("Error", "Password is required for new student");

    try {
      setSaving(true);
      const payload = { ...form };
      if (editingStudent && !payload.password) delete payload.password;

      if (editingStudent) {
        await API.put(`/students/${editingStudent._id}`, payload);
      } else {
        await API.post("/admin/add-student", payload);
      }

      setModalVisible(false);
      loadStudents();
      Alert.alert("Success ✅", editingStudent ? "Student updated!" : "Student added!");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not save student");
    } finally {
      setSaving(false);
    }
  };

  const f = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Students</Text>
          <Text style={styles.headerSub}>{filtered.length} students</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </Pressable>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, email..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{students.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#34d399" }]}>
            {students.filter(s => s.semester <= 4).length}
          </Text>
          <Text style={styles.statLabel}>Junior (1-4)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#f59e0b" }]}>
            {students.filter(s => s.semester > 4).length}
          </Text>
          <Text style={styles.statLabel}>Senior (5-8)</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00c6ff" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id || item.studentId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadStudents(true)} tintColor="#00c6ff" />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={40} color="#374151" />
              </View>
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
                <Ionicons name="person-add-outline" size={16} color="#00c6ff" />
                <Text style={styles.emptyAddText}>Add First Student</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => (
            <StudentCard item={item} onEdit={openEdit} onDelete={handleDelete} />
          )}
        />
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.formHeader}>
              <View style={styles.formHeaderIcon}>
                <Ionicons name={editingStudent ? "pencil" : "person-add"} size={20} color="#00c6ff" />
              </View>
              <Text style={styles.formTitle}>
                {editingStudent ? "Edit Student" : "Add New Student"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Section: Basic Info */}
              <Text style={styles.sectionLabel}>BASIC INFO</Text>
              <Field label="Full Name"    icon="person-outline"   value={form.name}      onChangeText={f("name")} />
              <Field label="Email"        icon="mail-outline"     value={form.email}     onChangeText={f("email")}     keyboardType="email-address" />
              <Field label="Phone"        icon="call-outline"     value={form.phone}     onChangeText={f("phone")}     keyboardType="phone-pad" />
              <Field label="Student ID"   icon="card-outline"     value={form.studentId} onChangeText={f("studentId")} />
              <Field label="Admission Year" icon="calendar-outline" value={form.admissionYear} onChangeText={f("admissionYear")} keyboardType="numeric" maxLength={4} />

              {/* Section: Academic */}
              <Text style={styles.sectionLabel}>ACADEMIC INFO</Text>
              <Picker label="College"    icon="business-outline" value={form.college}    options={COLLEGES}    onSelect={f("college")} />
              <Picker label="Department" icon="school-outline"   value={form.department} options={DEPARTMENTS} onSelect={f("department")} />
              <Picker label="Semester"   icon="layers-outline"   value={form.semester}   options={SEMESTERS}   onSelect={f("semester")} />
              <Picker label="Gender"     icon="people-outline"   value={form.gender}     options={GENDERS}     onSelect={f("gender")} />

              {/* Section: Account */}
              <Text style={styles.sectionLabel}>
                {editingStudent ? "CHANGE PASSWORD (optional)" : "ACCOUNT"}
              </Text>
              <Field
                label="Password"
                icon="lock-closed-outline"
                value={form.password}
                onChangeText={f("password")}
                secureTextEntry
              />

              {/* Save Button */}
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <LinearGradient
                  colors={editingStudent ? ["#f59e0b","#d97706"] : ["#10b981","#059669"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGrad}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name={editingStudent ? "save-outline" : "person-add-outline"} size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>
                          {editingStudent ? "Save Changes" : "Add Student"}
                        </Text>
                      </>
                  }
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

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    justifyContent: "space-between",
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,198,255,0.2)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,198,255,0.3)" },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1a2535", marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },

  statsRow: { flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 10 },
  statBox: { flex: 1, backgroundColor: "#1a2535", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  statNum: { color: "#00c6ff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 10, marginTop: 2, fontWeight: "600" },

  list: { padding: 16, paddingBottom: 30 },

  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  cardAccent: { width: 3, alignSelf: "stretch" },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", margin: 12 },
  avatarText: { fontSize: 16, fontWeight: "800" },
  cardBody: { flex: 1, paddingVertical: 12 },
  cardName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 6, paddingRight: 12 },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.12)", justifyContent: "center", alignItems: "center" },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(248,113,113,0.12)", justifyContent: "center", alignItems: "center" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 16 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,198,255,0.1)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,198,255,0.2)" },
  emptyAddText: { color: "#00c6ff", fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  formSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.92, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  formHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, paddingBottom: 8 },
  formHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,198,255,0.12)", justifyContent: "center", alignItems: "center" },
  formTitle: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "800" },
  sectionLabel: { color: "#374151", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginHorizontal: 20, marginTop: 16, marginBottom: 8 },

  // Field
  fieldWrap: { marginHorizontal: 20, marginBottom: 10 },
  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "600", marginBottom: 6 },
  fieldRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", minHeight: 50 },
  fieldInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 14 },

  // Picker modal
  pickerSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  pickerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  pickerOptionActive: { backgroundColor: "rgba(0,198,255,0.1)", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  pickerOptionText: { color: "#94a3b8", fontSize: 13, flex: 1 },

  // Save
  saveBtn: { marginHorizontal: 20, marginTop: 20, borderRadius: 14, overflow: "hidden" },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});