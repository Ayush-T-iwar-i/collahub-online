import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import API from "../../services/api";

export default function Attendance() {
  const router = useRouter();
  const navigation = useNavigation();
  const [subjects, setSubjects] = useState([]);
  const [overall, setOverall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [])
  );

  const loadAttendance = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // ✅ Real API
      const res = await API.get("/attendance/my");
      const all = res.data?.attendance || res.data || [];

      // Group by subject
      const subjectMap = {};
      all.forEach((record) => {
        const name = record.subjectId?.name || record.subjectId || "Unknown";
        if (!subjectMap[name]) {
          subjectMap[name] = { subject: name, total: 0, present: 0 };
        }
        subjectMap[name].total += 1;
        if (record.status === "present") subjectMap[name].present += 1;
      });

      const grouped = Object.values(subjectMap).map((s) => ({
        ...s,
        percentage: s.total === 0 ? 0 : ((s.present / s.total) * 100).toFixed(1),
      }));

      setSubjects(grouped);

      // Overall
      const totalClasses = grouped.reduce((a, s) => a + s.total, 0);
      const totalPresent = grouped.reduce((a, s) => a + s.present, 0);
      const overallPct = totalClasses === 0 ? 0 : ((totalPresent / totalClasses) * 100).toFixed(1);
      setOverall({ totalClasses, totalPresent, percentage: overallPct });

    } catch (error) {
      console.log("Attendance load error:", error.message);
      setSubjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getColor = (pct) => {
    if (pct >= 75) return "#34d399";
    if (pct >= 60) return "#fbbf24";
    return "#f87171";
  };

  const renderItem = ({ item }) => {
    const pct = parseFloat(item.percentage);
    const color = getColor(pct);

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/student/attendance/${item.subject}`)}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.subjectIcon, { backgroundColor: color + "22" }]}>
            <Ionicons name="book-outline" size={20} color={color} />
          </View>
          <View>
            <Text style={styles.subjectName} numberOfLines={1}>{item.subject}</Text>
            <Text style={styles.subjectMeta}>
              {item.present}/{item.total} classes attended
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.percentage, { color }]}>{item.percentage}%</Text>
          <Ionicons name="chevron-forward" size={16} color="#374151" />
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00c6ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* HEADER */}
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.subject}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAttendance(true)}
            tintColor="#00c6ff"
          />
        }
        ListHeaderComponent={() =>
          overall && (
            <View>
              {/* Overall Card */}
              <LinearGradient
                colors={["#0072ff", "#00c6ff"]}
                style={styles.overallCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View>
                  <Text style={styles.overallLabel}>Overall Attendance</Text>
                  <Text style={styles.overallPct}>{overall.percentage}%</Text>
                  <Text style={styles.overallSub}>
                    {overall.totalPresent} present out of {overall.totalClasses} classes
                  </Text>
                </View>
                <View style={styles.overallCircle}>
                  <Ionicons name="calendar" size={40} color="rgba(255,255,255,0.2)" />
                </View>
              </LinearGradient>

              {/* Warning */}
              {parseFloat(overall.percentage) < 75 && (
                <View style={styles.warningCard}>
                  <Ionicons name="warning-outline" size={18} color="#fbbf24" />
                  <Text style={styles.warningText}>
                    Overall attendance below 75%! Take action.
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Subject-wise Attendance</Text>
            </View>
          )
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color="#1f2937" />
            <Text style={styles.emptyTitle}>No Attendance Records</Text>
            <Text style={styles.emptyText}>Your attendance will appear here</Text>
          </View>
        )}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f1923" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 16,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  list: { padding: 16, paddingBottom: 30 },
  overallCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overallLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 4 },
  overallPct: { color: "#fff", fontSize: 42, fontWeight: "800" },
  overallSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
  overallCircle: { opacity: 0.6 },
  warningCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(251,191,36,0.1)",
    padding: 14, borderRadius: 14, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(251,191,36,0.2)",
  },
  warningText: { color: "#fbbf24", fontSize: 13, fontWeight: "600", flex: 1 },
  sectionTitle: {
    color: "#cbd5e1", fontSize: 14, fontWeight: "700",
    marginBottom: 12, letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#1a2535", borderRadius: 16,
    padding: 16, marginBottom: 10, overflow: "hidden",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  subjectIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  subjectName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  subjectMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  cardRight: { position: "absolute", right: 16, top: 16, flexDirection: "row", alignItems: "center", gap: 4 },
  percentage: { fontSize: 18, fontWeight: "800" },
  progressBg: { height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { color: "#374151", fontSize: 17, fontWeight: "700" },
  emptyText: { color: "#1f2937", fontSize: 13 },
});