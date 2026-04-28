import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, StatusBar, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const GradeBadge = ({ grade, status }) => {
  let color = "#10b981"; // Pass / A
  if (grade === "C" || grade === "D") color = "#f59e0b";
  if (status === "fail" || grade === "F") color = "#f87171";

  return (
    <View style={[styles.gradeBadge, { backgroundColor: color + "20", borderColor: color }]}>
      <Text style={[styles.gradeText, { color }]}>{grade || status}</Text>
    </View>
  );
};

export default function StudentResult() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const loadResult = async () => {
    setLoading(true);
    try {
      const r = await API.get("/results/my");
      setData(r.data);
    } catch (e) {
      console.log("Load result error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadResult(); }, []));

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await API.get("/results/export-pdf", { responseType: "blob" });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64data = reader.result.split(",")[1];
        const fileUri = `${FileSystem.documentDirectory}COLLAHUB_Result.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: "base64" });
        await Sharing.shareAsync(fileUri);
      };
      reader.readAsDataURL(response.data);
    } catch (e) {
      Alert.alert("Error", "Could not download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={styles.loadingText}>Fetching results...</Text>
      </View>
    );
  }

  const hasSemResults = data?.semesterResults && data.semesterResults.length > 0;
  const hasAssnResults = data?.subjects && data.subjects.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>My Results</Text>
        <Pressable onPress={handleDownloadPDF} style={styles.actionBtn} disabled={downloading}>
          {downloading ? (
            <ActivityIndicator size="small" color="#a78bfa" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#a78bfa" />
          )}
        </Pressable>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overview Header */}
        <LinearGradient colors={["#7c3aed", "#a78bfa"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.overviewCard}>
          <View style={styles.overviewIconBg}>
            <Ionicons name="trophy" size={32} color="#fff" />
          </View>
          <View style={styles.overviewInfo}>
            <Text style={styles.overviewLabel}>Current Status</Text>
            <Text style={styles.overviewValue}>
               Semester {data?.currentSemester || ""} 
               {data?.isPromoted ? " ðŸŒŸ" : ""}
            </Text>
          </View>
        </LinearGradient>

        {!hasSemResults && !hasAssnResults && (
          <View style={styles.emptyContainer}>
            <Ionicons name="flask-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No Results Declared</Text>
            <Text style={styles.emptyText}>Your exams or assignment marks have not been uploaded yet.</Text>
          </View>
        )}

        {/* Semester Results (Admin Uploaded) */}
        {hasSemResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Semester Results</Text>
            {data.semesterResults.map((sem, idx) => (
              <View key={idx} style={styles.semCard}>
                <View style={styles.semHeaderRow}>
                  <View style={styles.semIcon}>
                    <Ionicons name="school" size={20} color="#a78bfa" />
                  </View>
                  <Text style={styles.semTitle}>Semester {sem.semester}</Text>
                  <View style={[styles.semStatus, { backgroundColor: sem.status === "pass" ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.15)" }]}>
                    <Text style={[styles.semStatusText, { color: sem.status === "pass" ? "#10b981" : "#f87171" }]}>
                      {sem.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.gpaRow}>
                  <View style={styles.gpaBox}>
                    <Text style={styles.gpaLabel}>SGPA</Text>
                    <Text style={styles.gpaValue}>{sem.sgpa || ""}</Text>
                  </View>
                  <View style={styles.gpaBox}>
                    <Text style={styles.gpaLabel}>CGPA</Text>
                    <Text style={styles.gpaValue}>{sem.cgpa || ""}</Text>
                  </View>
                  <View style={styles.gpaBox}>
                    <Text style={styles.gpaLabel}>Year</Text>
                    <Text style={styles.gpaValue}>{sem.year || ""}</Text>
                  </View>
                </View>

                {sem.subjects && sem.subjects.length > 0 && (
                  <View style={styles.subjectsTable}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.th, { flex: 2 }]}>Subject</Text>
                      <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Marks</Text>
                      <Text style={[styles.th, { width: 50, textAlign: "center" }]}>Grade</Text>
                    </View>
                    {sem.subjects.map((sub, i) => (
                      <View key={i} style={styles.tr}>
                        <Text style={[styles.td, { flex: 2, color: "#fff", fontWeight: "600" }]} numberOfLines={1}>{sub.name}</Text>
                        <Text style={[styles.td, { flex: 1, textAlign: "center", color: "#94a3b8" }]}>{sub.marks}/{sub.maxMarks}</Text>
                        <View style={{ width: 50, alignItems: "center" }}>
                          <GradeBadge grade={sub.grade} status={sub.status} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Internals / Assignments Results */}
        {hasAssnResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignment Internals</Text>
            {data.subjects.map((sub, i) => (
              <View key={i} style={styles.internalCard}>
                <View style={styles.internalIcon}>
                  <Ionicons name="document-text" size={18} color="#00c6ff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.internalTitle}>{sub.subject}</Text>
                  <Text style={styles.internalSub}>Total Marks Scored: {sub.totalMarks}</Text>
                </View>
                <View style={styles.internalBadge}>
                  <Text style={styles.internalAvgLabel}>Avg Marks</Text>
                  <Text style={styles.internalAvgValue}>{sub.average}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f1923" },
  loadingText: { color: "#64748b", marginTop: 12, fontSize: 14 },
  
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)"
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  
  scrollContent: { padding: 16, paddingBottom: 40 },
  overviewCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 20, marginBottom: 24 },
  overviewIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  overviewInfo: { flex: 1 },
  overviewLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 2 },
  overviewValue: { color: "#fff", fontSize: 22, fontWeight: "900" },

  section: { marginBottom: 20 },
  sectionTitle: { color: "#cbd5e1", fontSize: 16, fontWeight: "800", marginBottom: 14, letterSpacing: 0.5 },
  
  semCard: { backgroundColor: "#1a2535", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  semHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  semIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.15)", justifyContent: "center", alignItems: "center" },
  semTitle: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800" },
  semStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  semStatusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  
  gpaRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  gpaBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  gpaLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  gpaValue: { color: "#a78bfa", fontSize: 18, fontWeight: "900" },

  subjectsTable: { marginTop: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", paddingBottom: 8, marginBottom: 8 },
  th: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
  td: { fontSize: 13 },
  
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  gradeText: { fontSize: 11, fontWeight: "800" },

  internalCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1a2535", padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(0,198,255,0.1)" },
  internalIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,198,255,0.15)", justifyContent: "center", alignItems: "center" },
  internalTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  internalSub: { color: "#64748b", fontSize: 12 },
  internalBadge: { alignItems: "center", backgroundColor: "rgba(0,198,255,0.08)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  internalAvgLabel: { color: "#00c6ff", fontSize: 10, fontWeight: "700", marginBottom: 2 },
  internalAvgValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { color: "#94a3b8", fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptyText: { color: "#64748b", fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
});
