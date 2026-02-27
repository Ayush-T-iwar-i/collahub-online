import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../services/api";

export default function SubjectAttendanceDetail() {
  const { subject } = useLocalSearchParams();
  const router = useRouter();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    try {
      // ✅ Real API call
      const res = await API.get("/attendance/my");
      const all = res.data?.attendance || res.data || [];

      // Filter by subject name
      const filtered = all.filter(
        (r) => r.subjectId?.name === subject || r.subjectId === subject
      );

      const total = filtered.length;
      const present = filtered.filter(
        (r) => r.status === "present"
      ).length;
      const absent = total - present;
      const percentage = total === 0 ? 0 : ((present / total) * 100).toFixed(1);

      setSummary({ total, present, absent, percentage });
      setRecords(filtered.reverse()); // latest first

    } catch (error) {
      console.log("Subject detail error:", error.message);
      setSummary({ total: 0, present: 0, absent: 0, percentage: 0 });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (p) => {
    if (p >= 75) return "#34d399";
    if (p >= 60) return "#fbbf24";
    return "#f87171";
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00c6ff" />
      </View>
    );
  }

  const pColor = getPercentageColor(parseFloat(summary.percentage));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* HEADER */}
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subject}</Text>
          <Text style={styles.headerSub}>Attendance Detail</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* SUMMARY CARD */}
      <View style={styles.summaryCard}>

        {/* Big percentage circle */}
        <View style={[styles.percentageCircle, { borderColor: pColor }]}>
          <Text style={[styles.percentageText, { color: pColor }]}>
            {summary.percentage}%
          </Text>
          <Text style={styles.percentageLabel}>Attendance</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#34d399" }]}>
              {summary.present}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#f87171" }]}>
              {summary.absent}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${summary.percentage}%`,
                backgroundColor: pColor,
              },
            ]}
          />
        </View>

        {/* Warning */}
        {parseFloat(summary.percentage) < 75 && (
          <View style={styles.warningBadge}>
            <Ionicons name="warning-outline" size={14} color="#fbbf24" />
            <Text style={styles.warningText}>
              Below 75% — Attendance shortage!
            </Text>
          </View>
        )}
      </View>

      {/* RECORDS LIST */}
      <Text style={styles.sectionTitle}>Day-wise Record</Text>

      {records.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#1f2937" />
          <Text style={styles.emptyText}>No records found</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: item.status === "present" ? "#34d399" : "#f87171" }
                ]} />
                <View>
                  <Text style={styles.rowDate}>
                    {item.date ? formatDate(item.date) : `Class ${index + 1}`}
                  </Text>
                  <Text style={styles.rowSub}>
                    {item.subjectId?.name || subject}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: item.status === "present"
                    ? "rgba(52,211,153,0.12)"
                    : "rgba(248,113,113,0.12)",
                }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: item.status === "present" ? "#34d399" : "#f87171" }
                ]}>
                  {item.status === "present" ? "Present" : "Absent"}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1923",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f1923",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  summaryCard: {
    margin: 16,
    backgroundColor: "#1a2535",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  percentageCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  percentageText: {
    fontSize: 28,
    fontWeight: "800",
  },
  percentageLabel: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressBg: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251,191,36,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
  },
  warningText: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "#374151",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a2535",
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowDate: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rowSub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});