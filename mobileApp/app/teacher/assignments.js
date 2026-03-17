import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert,
  Dimensions, StatusBar, Modal, TextInput, ScrollView, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import DateTimePicker from "@react-native-community/datetimepicker";
import API from "../../services/api";

const { width } = Dimensions.get("window");
const COLORS = ["#fb923c", "#60a5fa", "#34d399", "#f472b6", "#a78bfa"];

export default function TeacherAssignments() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("assignments"); // 'assignments' or 'submissions'
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [mySubjects, setMySubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Modals ----
  const [createVisible, setCreateVisible] = useState(false);
  const [gradeVisible, setGradeVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // ---- Create Form ----
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 3));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maxMarks, setMaxMarks] = useState("100");
  const [file, setFile] = useState(null);
  const [creating, setCreating] = useState(false);

  // ---- Grade Form ----
  const [marksGiven, setMarksGiven] = useState("");
  const [grading, setGrading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [assnRes, subRes, subjRes] = await Promise.all([
        API.get("/assignments/teacher"),
        API.get("/submissions/all"), // We'll filter this on the frontend
        API.get("/assignments/my-subjects")
      ]);
      setAssignments(assnRes.data?.assignments || []);
      setSubmissions(subRes.data?.submissions || []);
      setMySubjects(subjRes.data?.assignments || []);
    } catch (e) {
      console.log("Error loading teacher assignments:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  // ── CREATE ASSIGNMENT ──
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        setFile(result.assets[0]);
      }
    } catch {}
  };

  const handleCreateAssignment = async () => {
    if (!newTitle.trim() || !selectedSubject) {
      return Alert.alert("Required", "Title and Subject are required");
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("title", newTitle);
      formData.append("description", newDesc);
      formData.append("subjectId", selectedSubject.subjectId._id);
      formData.append("subjectName", selectedSubject.subjectName);
      formData.append("dueDate", dueDate.toISOString());
      formData.append("maxMarks", maxMarks);
      formData.append("college", selectedSubject.college);
      formData.append("department", selectedSubject.department);
      formData.append("semester", selectedSubject.semester);

      if (file) {
        formData.append("file", {
          uri: file.uri,
          type: file.mimeType || "application/octet-stream",
          name: file.name
        });
      }

      await API.post("/assignments", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setCreateVisible(false);
      setNewTitle(""); setNewDesc(""); setFile(null);
      loadAll();
      Alert.alert("Success", "Assignment Created Successfully! ✅");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not create assignment");
    } finally {
      setCreating(false);
    }
  };

  // ── GRADE SUBMISSION ──
  const openGradeModal = (sub) => {
    setSelectedSubmission(sub);
    setMarksGiven(sub.marks ? String(sub.marks) : "");
    setGradeVisible(true);
  };

  const handleGiveMarks = async () => {
    if (!marksGiven.trim() || isNaN(marksGiven)) {
      return Alert.alert("Error", "Please enter valid marks");
    }

    setGrading(true);
    try {
      await API.put(`/submissions/${selectedSubmission._id}/marks`, {
        marks: Number(marksGiven)
      });
      setGradeVisible(false);
      loadAll();
    } catch (e) {
      Alert.alert("Error", "Could not submit grades");
    } finally {
      setGrading(false);
    }
  };

  // ── DOWNLOAD SUBMISSION ──
  const handleDownloadFile = async (sub) => {
    try {
      // Very basic handling assuming sub.file holds a public URL or path
      if (!sub.file) return Alert.alert("No File", "Student didn't attach a file");
      Alert.alert("Info", `File path: ${sub.file}`); 
      // In a real app, you would download the file using expo-file-system and share it
    } catch (e) {}
  };

  // Filter submissions to only show those for this teacher's assignments
  const myAssnIds = assignments.map(a => a._id);
  const relevantSubmissions = submissions.filter(s => myAssnIds.includes(s.assignmentId?._id));

  const renderAssignmentItem = ({ item, index }) => {
    const color = COLORS[index % COLORS.length];
    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: color + "22" }]}>
            <Ionicons name="document-text" size={24} color={color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.subject}>📚 {item.subjectName}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: "rgba(248,113,113,0.15)" }]}>
            <Ionicons name="time" size={14} color="#f87171" />
            <Text style={[styles.chipText, { color: "#f87171" }]}>
              {new Date(item.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
            <Ionicons name="star" size={14} color="#a78bfa" />
            <Text style={[styles.chipText, { color: "#a78bfa" }]}>{item.maxMarks} Marks</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            For: {item.department} Sem {item.semester}
          </Text>
          <Ionicons name="trash-outline" size={20} color="#64748b" onPress={() => Alert.alert("Action not implemented yet 😉")} />
        </View>
      </View>
    );
  };

  const renderSubmissionItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={32} color="#00c6ff" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.title}>{item.studentId?.name || "Student"}</Text>
            <Text style={styles.subject}>{item.assignmentId?.title}</Text>
          </View>
          <Pressable onPress={() => handleDownloadFile(item)} style={styles.downloadBtn}>
            <Ionicons name="download-outline" size={20} color="#00c6ff" />
          </Pressable>
        </View>

        {item.marks !== undefined && item.marks !== null ? (
          <View style={styles.gradedBox}>
            <Ionicons name="checkmark-done-circle" size={18} color="#10b981" />
            <Text style={styles.gradedText}>Graded: {item.marks} marks</Text>
          </View>
        ) : (
          <Pressable style={styles.gradeBtn} onPress={() => openGradeModal(item)}>
            <Text style={styles.gradeBtnText}>Grade Submission</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />
      
      <LinearGradient colors={["#0a0f1e", "#1a1500"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Assignments</Text>
        <Pressable onPress={() => setCreateVisible(true)} style={styles.actionBtn}>
          <Ionicons name="add" size={24} color="#f59e0b" />
        </Pressable>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tabBtn, activeTab === "assignments" && styles.tabBtnActive]} 
          onPress={() => setActiveTab("assignments")}
        >
          <Text style={[styles.tabText, activeTab === "assignments" && styles.tabTextActive]}>My Assignments</Text>
        </Pressable>
        <Pressable 
          style={[styles.tabBtn, activeTab === "submissions" && styles.tabBtnActive]} 
          onPress={() => setActiveTab("submissions")}
        >
          <Text style={[styles.tabText, activeTab === "submissions" && styles.tabTextActive]}>Student Submissions</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : activeTab === "assignments" ? (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderAssignmentItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#374151" />
              <Text style={styles.emptyTitle}>No Assignments</Text>
              <Text style={styles.emptyText}>Tap the + icon to create one</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={relevantSubmissions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderSubmissionItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#374151" />
              <Text style={styles.emptyTitle}>No Submissions</Text>
              <Text style={styles.emptyText}>Students haven't submitted yet</Text>
            </View>
          }
        />
      )}

      {/* ── CREATE MODAL ── */}
      <Modal visible={createVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Assignment</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <TextInput style={styles.input} placeholder="Assignment Title" placeholderTextColor="#64748b" value={newTitle} onChangeText={setNewTitle} />
              
              <Text style={styles.label}>Select Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {mySubjects.map((sub, i) => (
                  <Pressable 
                    key={i} 
                    style={[styles.subjectChip, selectedSubject?.subjectId?._id === sub.subjectId?._id && styles.subjectChipActive]}
                    onPress={() => setSelectedSubject(sub)}
                  >
                    <Text style={[styles.subjectChipText, selectedSubject?.subjectId?._id === sub.subjectId?._id && { color: "#f59e0b" }]}>
                      {sub.subjectName} (Sem {sub.semester})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput 
                style={[styles.input, { height: 80 }]} 
                placeholder="Description / Instructions" 
                placeholderTextColor="#64748b" 
                multiline textAlignVertical="top"
                value={newDesc} onChangeText={setNewDesc} 
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Max Marks</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={maxMarks} onChangeText={setMaxMarks} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Due Date</Text>
                  <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <Text style={{ color: "#fff" }}>{dueDate.toLocaleDateString("en-GB")}</Text>
                  </Pressable>
                </View>
              </View>
              {showDatePicker && (
                <DateTimePicker 
                  value={dueDate} mode="date" display="default" 
                  onChange={(e, d) => { setShowDatePicker(false); if (d) setDueDate(d); }} 
                />
              )}

              <Pressable style={styles.uploadBtn} onPress={handlePickDocument}>
                <Ionicons name={file ? "document" : "cloud-upload-outline"} size={20} color="#00c6ff" />
                <Text style={styles.uploadBtnText}>{file ? file.name : "Attach Reference File (Optional)"}</Text>
              </Pressable>
              
              <View style={styles.modalFooter}>
                <Pressable style={styles.cancelBtn} onPress={() => setCreateVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleCreateAssignment} disabled={creating}>
                  {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Create</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── GRADE MODAL ── */}
      <Modal visible={gradeVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Grade Submission</Text>
            <Text style={styles.modalSub}>{selectedSubmission?.studentId?.name}</Text>
            
            <TextInput 
              style={[styles.input, { marginTop: 16 }]} 
              placeholder="Enter Marks" 
              placeholderTextColor="#64748b" 
              keyboardType="numeric"
              value={marksGiven} onChangeText={setMarksGiven} 
            />

            <View style={[styles.modalFooter, { marginTop: 24 }]}>
              <Pressable style={styles.cancelBtn} onPress={() => setGradeVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleGiveMarks} disabled={grading}>
                {grading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Submit Grade</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },

  tabContainer: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.1)" },
  tabBtnActive: { borderBottomColor: "#f59e0b" },
  tabText: { color: "#64748b", fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: "#f59e0b", fontWeight: "800" },

  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#1a2535", borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderColor: "rgba(255,255,255,0.05)" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  title: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 4 },
  subject: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  
  metaRow: { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: "700" },
  
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingTop: 12 },
  footerText: { color: "#64748b", fontSize: 11 },

  downloadBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,198,255,0.1)", justifyContent: "center", alignItems: "center" },
  gradeBtn: { backgroundColor: "#f59e0b", paddingVertical: 10, borderRadius: 10, alignItems: "center", marginTop: 10 },
  gradeBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  gradedBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(16,185,129,0.1)", paddingVertical: 10, borderRadius: 10, marginTop: 10 },
  gradedText: { color: "#10b981", fontWeight: "800", fontSize: 13 },

  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { color: "#94a3b8", fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptyText: { color: "#64748b", fontSize: 14, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#0f1923", padding: 24, paddingBottom: 40, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: "85%" },
  modalContentSmall: { backgroundColor: "#0f1923", padding: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 20 },
  modalSub: { color: "#94a3b8", fontSize: 14, marginTop: -15, marginBottom: 10 },
  
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#fff", fontSize: 14 },
  row: { flexDirection: "row", gap: 12 },
  dateBtn: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, justifyContent: "center", alignItems: "center" },
  
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  subjectChipActive: { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "#f59e0b" },
  subjectChipText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "rgba(0,198,255,0.1)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,198,255,0.2)", marginTop: 10 },
  uploadBtnText: { color: "#00c6ff", fontSize: 13, fontWeight: "700" },

  modalFooter: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center" },
  cancelBtnText: { color: "#fff", fontWeight: "700" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f59e0b", alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
