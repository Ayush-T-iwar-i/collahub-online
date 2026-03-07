import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Pressable, StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../services/api";

export default function SubjectAttendanceDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ✅ subjectId aur subjectName params se lo
  const subjectId = params?.subjectId;
  const subjectName = params?.subjectName || params?.subject || "Subject";

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) { setLoading(false); return; }
    loadDetails();
  }, [subjectId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      // ✅ SAHI API
      const res = await API.get(`/attendance/my/subject/${subjectId}`);
      setRecords(res.data?.records || []);
      setStats(res.data?.stats || { total: 0, present: 0, absent: 0, percentage: 0 });
    } catch (e) {
      console.log("Detail error:", e.message);
      setRecords([]);
      setStats({ total: 0, present: 0, absent: 0, percentage: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getColor = (pct) => {
    if (pct >= 75) return "#34d399";
    if (pct >= 60) return "#fbbf24";
    return "#f87171";
  };

  const classesNeeded = () => {
    if (!stats || stats.percentage >= 75) return null;
    const needed = Math.ceil((0.75 * stats.total - stats.present) / 0.25);
    return needed > 0 ? needed : null;
  };

  if (loading) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#00c6ff" />
    </View>
  );

  const pct = stats?.percentage || 0;
  const pColor = getColor(pct);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* Header */}
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subjectName}</Text>
          <Text style={styles.headerSub}>Attendance Detail</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={records}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}

        ListHeaderComponent={() => (
          <>
            {/* Summary Card */}
            <View style={styles.summaryCard}>

              {/* Big Circle */}
              <View style={[styles.percentCircle, { borderColor: pColor }]}>
                <Text style={[styles.percentText, { color: pColor }]}>{pct}%</Text>
                <Text style={styles.percentLabel}>Attendance</Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{stats?.total || 0}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: "#34d399" }]}>{stats?.present || 0}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: "#f87171" }]}>{stats?.absent || 0}</Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: pColor,
                }]} />
              </View>
              <Text style={styles.targetLabel}>75% minimum required</Text>

              {/* Warning */}
              {pct < 75 && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={14} color="#fbbf24" />
                  <Text style={styles.warningText}>
                    Below 75%!{classesNeeded()
                      ? ` ${classesNeeded()} aur classes attend karo`
                      : " Attendance shortage!"}
                  </Text>
                </View>
              )}

              {/* Safe */}
              {pct >= 75 && (
                <View style={styles.safeBox}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#34d399" />
                  <Text style={styles.safeText}>Attendance Good ✅</Text>
                </View>
              )}
            </View>

            {records.length > 0 && (
              <Text style={styles.sectionTitle}>
                Day-wise Record ({records.length})
              </Text>
            )}
          </>
        )}

        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#1f2937" />
            <Text style={styles.emptyTitle}>No Records Yet</Text>
            <Text style={styles.emptySub}>
              Teacher ne abhi attendance nahi lagayi
            </Text>
          </View>
        )}

        renderItem={({ item, index }) => {
          const isPresent = item.status === "present";
          return (
            <View style={[styles.row, isPresent ? styles.rowPresent : styles.rowAbsent]}>
              <View style={styles.rowLeft}>
                <View style={[styles.statusDot, {
                  backgroundColor: isPresent ? "#34d399" : "#f87171"
                }]} />
                <View>
                  <Text style={styles.rowDate}>
                    {item.date || `Class ${index + 1}`}
                    {item.day ? ` • ${item.day}` : ""}
                  </Text>
                  {item.time ? (
                    <Text style={styles.rowTime}>🕐 {item.time}</Text>
                  ) : null}
                </View>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor: isPresent
                  ? "rgba(52,211,153,0.12)"
                  : "rgba(248,113,113,0.12)",
              }]}>
                <Ionicons
                  name={isPresent ? "checkmark-circle" : "close-circle"}
                  size={14}
                  color={isPresent ? "#34d399" : "#f87171"}
                />
                <Text style={[styles.statusText, {
                  color: isPresent ? "#34d399" : "#f87171"
                }]}>
                  {isPresent ? "Present" : "Absent"}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f1923" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 55, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  listContent: { paddingBottom: 30 },
  summaryCard: { margin: 16, backgroundColor: "#1a2535", borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  percentCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, justifyContent: "center", alignItems: "center", marginBottom: 20, backgroundColor: "rgba(255,255,255,0.03)" },
  percentText: { fontSize: 28, fontWeight: "800" },
  percentLabel: { color: "#64748b", fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: "row", width: "100%", justifyContent: "space-around", marginBottom: 20 },
  statItem: { alignItems: "center" },
  statNum: { color: "#fff", fontSize: 24, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  progressBg: { width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 3 },
  targetLabel: { color: "#374151", fontSize: 10, alignSelf: "flex-end", marginBottom: 14 },
  warningBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(251,191,36,0.1)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(251,191,36,0.2)", width: "100%" },
  warningText: { color: "#fbbf24", fontSize: 12, fontWeight: "600", flex: 1 },
  safeBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(52,211,153,0.1)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", width: "100%" },
  safeText: { color: "#34d399", fontSize: 12, fontWeight: "600" },
  sectionTitle: { color: "#cbd5e1", fontSize: 14, fontWeight: "700", marginHorizontal: 16, marginBottom: 10, letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1 },
  rowPresent: { backgroundColor: "rgba(52,211,153,0.04)", borderColor: "rgba(52,211,153,0.15)" },
  rowAbsent: { backgroundColor: "rgba(248,113,113,0.04)", borderColor: "rgba(248,113,113,0.15)" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  rowDate: { color: "#fff", fontSize: 13, fontWeight: "600" },
  rowTime: { color: "#64748b", fontSize: 11, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 13, textAlign: "center" },
});