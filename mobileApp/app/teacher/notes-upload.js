// app/teacher/notes-upload.js
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  StatusBar, ActivityIndicator, Alert, Modal, TextInput, Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import API from "../../services/api";

const FILE_TYPES = [
  { key: "pdf", icon: "document-text", color: "#f87171", label: "PDF" },
  { key: "ppt", icon: "easel", color: "#fb923c", label: "PPT/PPTX" },
  { key: "doc", icon: "document", color: "#60a5fa", label: "Word" },
  { key: "image", icon: "image", color: "#34d399", label: "Image" },
  { key: "other", icon: "attach", color: "#a78bfa", label: "Any File" },
];

const getFileIcon = (fileType, color) => {
  const ft = FILE_TYPES.find(f => f.key === fileType) || FILE_TYPES[4];
  return { icon: ft.icon, color: ft.color };
};

export default function TeacherNotesUpload() {
  const router = useRouter();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selSubject, setSelSubject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Upload modal state
  const [uploadModal, setUploadModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDesc, setNoteDesc] = useState("");
  const [selFile, setSelFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(useCallback(() => { loadSubjects(); }, []));

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await API.get("/subject-requests/my-subjects");
      setSubjects(res.data?.subjects || []);
    } catch { Alert.alert("Error", "Could not load subjects"); }
    finally { setLoading(false); }
  };

  const loadNotes = async (subject) => {
    if (!subject) return;
    setNotesLoading(true);
    try {
      const res = await API.get("/teacher-notes/my", {
        params: { subjectName: subject.subjectName },
      });
      setNotes(res.data?.notes || []);
    } catch (e) {
      console.log("loadNotes error:", e.response?.status, e.response?.data?.message);
      setNotes([]);
    }
    finally { setNotesLoading(false); }
  };

  const selectSubject = (s) => {
    setSelSubject(s);
    loadNotes(s);
  };

  // Pick file based on type
  const pickFile = async (ft) => {
    try {
      if (ft.key === "image") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return;
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
        if (!result.canceled && result.assets?.[0]) {
          const a = result.assets[0];
          setSelFile({ uri: a.uri, name: `image.${a.uri.split(".").pop()}`, mimeType: a.mimeType || "image/jpeg", fileKey: "image" });
        }
      } else {
        const types = ft.key === "pdf" ? ["application/pdf"]
          : ft.key === "ppt" ? ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]
            : ft.key === "doc" ? ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
              : ["*/*"];
        const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
        if (!result.canceled && result.assets?.[0]) {
          const a = result.assets[0];
          setSelFile({ uri: a.uri, name: a.name || "file", mimeType: a.mimeType || "application/octet-stream", fileKey: ft.key });
        }
      }
    } catch { Alert.alert("Error", "Could not pick file"); }
  };

  const handleUpload = async () => {
    if (!noteTitle.trim()) return Alert.alert("Error", "Enter a note title");
    if (!selFile) return Alert.alert("Error", "Select a file to upload");
    if (!selSubject) return Alert.alert("Error", "Select a subject first");

    setUploading(true);
    try {
      const formData = new FormData();
      // Web: fetch blob, Native: object
      if (selFile.uri.startsWith("blob:") || selFile.uri.startsWith("http")) {
        const response = await fetch(selFile.uri);
        const blob = await response.blob();
        formData.append("file", blob, selFile.name);
      } else {
        formData.append("file", { uri: selFile.uri, type: selFile.mimeType, name: selFile.name });
      }
      formData.append("title", noteTitle.trim());
      formData.append("description", noteDesc.trim());
      formData.append("subjectRequestId", selSubject._id);
      formData.append("subjectName", selSubject.subjectName);
      formData.append("subjectCode", selSubject.subjectCode || "");
      formData.append("college", selSubject.college || "");
      formData.append("department", selSubject.department);
      formData.append("semester", String(selSubject.semester));
      formData.append("admissionYear", String(selSubject.admissionYear || ""));
      formData.append("section", selSubject.section || "All");

      await API.post("/teacher-notes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      Alert.alert("✅ Uploaded!",
        `"${noteTitle}" uploaded for ${selSubject.subjectName}.\nStudents will see it when they open this subject.`
      );
      setUploadModal(false);
      setNoteTitle(""); setNoteDesc(""); setSelFile(null);
      loadNotes(selSubject);
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.message || e.message || "Unknown error";
      Alert.alert(`Error ${status || ""}`, `${msg}

Check: Are you logged in as teacher?`);
    } finally { setUploading(false); }
  };

  const deleteNote = (note) => {
    Alert.alert("Delete Note", `Delete "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await API.delete(`/teacher-notes/${note._id}`);
            setNotes(prev => prev.filter(n => n._id !== note._id));
          } catch { Alert.alert("Error", "Could not delete"); }
        }
      },
    ]);
  };

  const openFile = (url) => {
    if (url) Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open file"));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/teacher/dashboard")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notes & Study Material</Text>
          <Text style={styles.headerSub}>Select subject → upload files</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

        {/* ── Step 1: Subject List ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT SUBJECT</Text>
          {loading
            ? <ActivityIndicator color="#f59e0b" style={{ marginTop: 20 }} />
            : subjects.length === 0
              ? (
                <View style={styles.empty}>
                  <Ionicons name="book-outline" size={44} color="#374151" />
                  <Text style={styles.emptyTitle}>No subjects assigned</Text>
                  <Text style={styles.emptySub}>Request subjects from admin first</Text>
                  <Pressable style={styles.emptyBtn} onPress={() => router.push("/teacher/my-subjects")}>
                    <Text style={styles.emptyBtnText}>Go to My Subjects</Text>
                  </Pressable>
                </View>
              )
              : subjects.map(s => {
                const isSelected = selSubject?._id === s._id;
                const deptShort = s.department?.match(/\(([^)]+)\)/)?.[1] || s.department?.split(" ")[0] || "";
                return (
                  <Pressable key={s._id} onPress={() => selectSubject(s)}
                    style={[styles.subjectCard, isSelected && styles.subjectCardActive]}>
                    <View style={[styles.subjectIcon, isSelected && { backgroundColor: "rgba(52,211,153,0.2)" }]}>
                      <Ionicons name="book" size={20} color={isSelected ? "#34d399" : "#64748b"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subjectName, isSelected && { color: "#34d399" }]} numberOfLines={1}>
                        {s.subjectName}
                      </Text>
                      <Text style={styles.subjectMeta}>
                        {deptShort} · Sem {s.semester}
                        {s.admissionYear ? ` · ${s.admissionYear}` : ""}
                        {s.section && s.section !== "All" ? ` · Sec ${s.section}` : ""}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color="#34d399" />}
                  </Pressable>
                );
              })
          }
        </View>

        {/* ── Step 2: Upload + Notes (when subject selected) ── */}
        {selSubject && (
          <>
            {/* Selected subject banner */}
            <View style={styles.selectedBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#34d399" />
              <Text style={styles.selectedBannerText} numberOfLines={1}>
                {selSubject.subjectName} · Sem {selSubject.semester}
                {selSubject.section && selSubject.section !== "All" ? ` · Sec ${selSubject.section}` : ""}
              </Text>
              <Pressable style={styles.uploadFab} onPress={() => setUploadModal(true)}>
                <Ionicons name="cloud-upload" size={16} color="#fff" />
                <Text style={styles.uploadFabText}>Upload</Text>
              </Pressable>
            </View>

            {/* Notes uploaded for this subject */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>UPLOADED NOTES ({notes.length})</Text>
              {notesLoading
                ? <ActivityIndicator color="#a78bfa" style={{ marginTop: 16 }} />
                : notes.length === 0
                  ? (
                    <View style={[styles.empty, { paddingTop: 16 }]}>
                      <Ionicons name="documents-outline" size={36} color="#374151" />
                      <Text style={[styles.emptyTitle, { fontSize: 14 }]}>No notes uploaded yet</Text>
                      <Pressable style={[styles.emptyBtn, { backgroundColor: "rgba(0,198,255,0.1)", borderColor: "rgba(0,198,255,0.25)" }]}
                        onPress={() => setUploadModal(true)}>
                        <Text style={[styles.emptyBtnText, { color: "#00c6ff" }]}>Upload First Note</Text>
                      </Pressable>
                    </View>
                  )
                  : notes.map(n => {
                    const { icon, color } = getFileIcon(n.fileType);
                    return (
                      <Pressable key={n._id} style={styles.noteCard} onPress={() => openFile(n.fileUrl)}>
                        <View style={[styles.noteIcon, { backgroundColor: color + "18" }]}>
                          <Ionicons name={icon} size={20} color={color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noteTitle} numberOfLines={1}>{n.title}</Text>
                          {n.description ? <Text style={styles.noteDesc} numberOfLines={1}>{n.description}</Text> : null}
                          <View style={styles.noteMeta}>
                            <View style={[styles.fileTypeBadge, { backgroundColor: color + "18" }]}>
                              <Text style={[styles.fileTypeBadgeText, { color }]}>{n.fileType?.toUpperCase()}</Text>
                            </View>
                            <Text style={styles.noteDate}>
                              {n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                            </Text>
                          </View>
                        </View>
                        <Pressable onPress={() => deleteNote(n)} style={styles.deleteBtn}>
                          <Ionicons name="trash-outline" size={16} color="#f87171" />
                        </Pressable>
                      </Pressable>
                    );
                  })
              }
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Upload Modal ── */}
      <Modal visible={uploadModal} transparent animationType="slide"
        onRequestClose={() => { setUploadModal(false); setSelFile(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Upload Note</Text>
                <Text style={styles.modalSub} numberOfLines={1}>{selSubject?.subjectName}</Text>
              </View>
              <Pressable onPress={() => { setUploadModal(false); setSelFile(null); }} style={styles.closeBtn}>
                <Ionicons name="close" size={19} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>

              <Text style={styles.fieldLabel}>Note Title *</Text>
              <TextInput style={styles.input}
                placeholder="e.g. Chapter 5 — Linked Lists"
                placeholderTextColor="#374151"
                value={noteTitle} onChangeText={setNoteTitle} maxLength={100} />

              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder="Topics covered, page numbers, etc..."
                placeholderTextColor="#374151"
                value={noteDesc} onChangeText={setNoteDesc} multiline maxLength={300} />

              <Text style={styles.fieldLabel}>Select File Type *</Text>
              <View style={styles.fileTypeGrid}>
                {FILE_TYPES.map(ft => {
                  const picked = selFile?.fileKey === ft.key;
                  return (
                    <Pressable key={ft.key}
                      style={[styles.fileTypeBtn, picked && { backgroundColor: ft.color + "22", borderColor: ft.color }]}
                      onPress={() => pickFile(ft)}>
                      <Ionicons name={ft.icon} size={20} color={picked ? ft.color : "#64748b"} />
                      <Text style={[styles.fileTypeBtnLabel, picked && { color: ft.color }]}>{ft.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {selFile && (
                <View style={styles.selectedFile}>
                  <Ionicons name="document-attach" size={15} color="#34d399" />
                  <Text style={styles.selectedFileName} numberOfLines={1}>{selFile.name}</Text>
                  <Pressable onPress={() => setSelFile(null)}>
                    <Ionicons name="close-circle" size={18} color="#f87171" />
                  </Pressable>
                </View>
              )}

              {/* Visibility info */}
              {selSubject && (
                <View style={styles.visibilityBox}>
                  <Ionicons name="eye-outline" size={13} color="#00c6ff" />
                  <Text style={styles.visibilityText}>
                    Students will see this note when they open{" "}
                    <Text style={{ color: "#00c6ff", fontWeight: "700" }}>{selSubject.subjectName}</Text>
                    {" "}in their Notes tab
                    {"\n"}Dept: {selSubject.department?.match(/\(([^)]+)\)/)?.[1] || selSubject.department?.split(" ")[0]}
                    {" "}· Sem {selSubject.semester}
                    {selSubject.admissionYear ? ` · Batch ${selSubject.admissionYear}` : ""}
                    {selSubject.section && selSubject.section !== "All" ? ` · Sec ${selSubject.section}` : " · All sections"}
                  </Text>
                </View>
              )}

              <Pressable style={[styles.submitBtn, uploading && { opacity: 0.6 }]}
                onPress={handleUpload} disabled={uploading}>
                <LinearGradient colors={["#00c6ff", "#0072ff"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
                  {uploading
                    ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.submitText}>Uploading...</Text></>
                    : <><Ionicons name="cloud-upload" size={18} color="#fff" /><Text style={styles.submitText}>Upload Note</Text></>
                  }
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 10, marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionLabel: { color: "#374151", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 12 },
  // Subject cards
  subjectCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1a2535", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  subjectCardActive: { borderColor: "#34d399", backgroundColor: "rgba(52,211,153,0.05)" },
  subjectIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  subjectName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  subjectMeta: { color: "#64748b", fontSize: 11, marginTop: 3 },
  // Selected banner
  selectedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.08)", marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  selectedBannerText: { color: "#34d399", fontSize: 12, fontWeight: "600", flex: 1 },
  uploadFab: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#00c6ff", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  uploadFabText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  // Note cards
  noteCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1a2535", borderRadius: 13, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  noteIcon: { width: 40, height: 40, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  noteTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  noteDesc: { color: "#64748b", fontSize: 11, marginTop: 2 },
  noteMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  fileTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  fileTypeBadgeText: { fontSize: 9, fontWeight: "800" },
  noteDate: { color: "#374151", fontSize: 10 },
  deleteBtn: { padding: 6 },
  // Empty state
  empty: { alignItems: "center", paddingVertical: 24, gap: 10 },
  emptyTitle: { color: "#374151", fontSize: 15, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 12 },
  emptyBtn: { backgroundColor: "rgba(245,158,11,0.1)", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  emptyBtnText: { color: "#f59e0b", fontWeight: "700", fontSize: 13 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: "92%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  modalSub: { color: "#64748b", fontSize: 11, marginTop: 3 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 8 },
  input: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 14 },
  fileTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  fileTypeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  fileTypeBtnLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  selectedFile: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.08)", padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  selectedFileName: { color: "#34d399", fontSize: 12, fontWeight: "600", flex: 1 },
  visibilityBox: { backgroundColor: "rgba(0,198,255,0.06)", padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: "rgba(0,198,255,0.15)" },
  visibilityText: { color: "#64748b", fontSize: 11, lineHeight: 18 },
  submitBtn: { borderRadius: 13, overflow: "hidden" },
  submitGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});