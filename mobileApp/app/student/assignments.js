import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Dimensions, StatusBar
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import API from "../../services/api";

const { width } = Dimensions.get("window");
const CAT_COLORS = ["#00c6ff", "#f59e0b", "#a78bfa", "#f87171", "#34d399", "#fb923c"];

export default function StudentAssignments() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [assnRes, subRes] = await Promise.all([
        API.get("/assignments/my"),
        API.get("/submissions/my")
      ]);
      setAssignments(assnRes.data?.assignments || assnRes.data || []);
      setSubmissions(subRes.data?.submissions || subRes.data || []);
    } catch (e) {
      console.log("Error loading assignments:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const isSubmitted = (assignmentId) => submissions.some(s => s.assignmentId?._id === assignmentId);
  const getSubmission = (assignmentId) => submissions.find(s => s.assignmentId?._id === assignmentId);

  const handleSubmit = async (assignmentId) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      if (file.size > 20 * 1024 * 1024) {
        Alert.alert("File Too Large", "Please select a file smaller than 20MB.");
        return;
      }

      const formData = new FormData();
      formData.append("assignmentId", assignmentId);
      formData.append("file", {
        uri: file.uri,
        type: file.mimeType || "application/octet-stream",
        name: file.name || "submission.file",
      });

      setUploading(assignmentId);
      await API.post("/submissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Success", "Assignment submitted successfully! 🎉");
      loadAll();
    } catch (error) {
      Alert.alert("Upload Failed", error.response?.data?.message || "Could not submit assignment");
    } finally {
      setUploading(null);
    }
  };

  const renderItem = ({ item, index }) => {
    const color = CAT_COLORS[index % CAT_COLORS.length];
    const submitted = isSubmitted(item._id);
    const subRecord = getSubmission(item._id);
    const isOverdue = new Date(item.dueDate) < new Date() && !submitted;

    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: color + "22" }]}>
            <Ionicons name="document-text" size={24} color={color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.subject}>📚 {item.subjectName || "Subject"}</Text>
            <View style={styles.teacherRow}>
              <Ionicons name="person-circle-outline" size={14} color="#64748b" />
              <Text style={styles.teacherName}>{item.teacherName || "Teacher"}</Text>
            </View>
          </View>
        </View>

        {!!item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: "rgba(248,113,113,0.15)" }]}>
            <Ionicons name="time" size={14} color="#f87171" />
            <Text style={[styles.chipText, { color: "#f87171" }]}>
              Due: {new Date(item.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
            <Ionicons name="star" size={14} color="#a78bfa" />
            <Text style={[styles.chipText, { color: "#a78bfa" }]}>
              {item.maxMarks || 100} Marks
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          {submitted ? (
            <View style={styles.statusBox}>
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={[styles.statusText, { color: "#10b981" }]}>Submitted</Text>
              </View>
              {subRecord?.marks !== undefined && subRecord.marks !== null && (
                <View style={styles.marksBadge}>
                  <Text style={styles.marksBadgeText}>{subRecord.marks} / {item.maxMarks || 100}</Text>
                </View>
              )}
            </View>
          ) : isOverdue ? (
            <View style={[styles.actionBtn, { backgroundColor: "rgba(248,113,113,0.15)", borderColor: "rgba(248,113,113,0.3)" }]}>
              <Ionicons name="alert-circle" size={18} color="#f87171" />
              <Text style={[styles.actionBtnText, { color: "#f87171" }]}>Overdue</Text>
            </View>
          ) : (
            <Pressable
              style={styles.actionBtn}
              onPress={() => handleSubmit(item._id)}
              disabled={uploading === item._id}
            >
              {uploading === item._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Upload Submission</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>My Assignments</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00c6ff" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#374151" />
              <Text style={styles.emptyTitle}>No Assignments</Text>
              <Text style={styles.emptyText}>You're all caught up! ✨</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#64748b", marginTop: 12, fontSize: 14 },
  
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)"
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center"
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#1a2535", borderRadius: 16, padding: 16, marginBottom: 16,
    borderLeftWidth: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  title: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  subject: { color: "#a78bfa", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  teacherRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  teacherName: { color: "#94a3b8", fontSize: 12 },
  
  description: { color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 16 },
  
  metaRow: { flexDirection: "row", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  chipText: { fontSize: 12, fontWeight: "700" },
  
  footer: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingTop: 16 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#00c6ff", paddingVertical: 12, borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  
  statusBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(16,185,129,0.1)", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(16,185,129,0.2)" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 14, fontWeight: "700" },
  marksBadge: { backgroundColor: "#10b981", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  marksBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { color: "#94a3b8", fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptyText: { color: "#64748b", fontSize: 14, marginTop: 8 },
});
