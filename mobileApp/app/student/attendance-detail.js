// app/student/attendance-detail.js
// ✅ NAYA FILE — [subject].js ki jagah attendance-detail.js banao
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Pressable, StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api"; // ✅ FIXED: 2 levels up, not 3

const DAY_COLORS = {
  Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399",
  Thursday:"#fbbf24", Friday:"#f87171", Saturday:"#fb923c",
};

export default function AttendanceDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const subjectId   = params?.subjectId;
  const subjectName = params?.subjectName || "Subject";

  const [records, setRecords] = useState([]);
  const [stats,   setStats]   = useState({ total:0, present:0, absent:0, percentage:0 });
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    if (!subjectId) { setLoading(false); return; }
    loadDetails();
  }, [subjectId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/attendance/my/subject/${subjectId}`);
      setRecords(res.data?.records || []);
      setStats(res.data?.stats || { total:0, present:0, absent:0, percentage:0 });
    } catch (e) {
      console.log("Detail error:", e.message);
      setRecords([]);
      setStats({ total:0, present:0, absent:0, percentage:0 });
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

  const filtered = records.filter(r => {
    if (filter === "present") return r.status === "present";
    if (filter === "absent")  return r.status === "absent";
    return true;
  });

  // ✅ Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
    } catch { return dateStr; }
  };

  if (loading) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#00c6ff" />
    </View>
  );

  const pct    = stats?.percentage || 0;
  const pColor = getColor(pct);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      <LinearGradient colors={["#0f1923","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => router.push("/student/attendance")}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subjectName}</Text>
          <Text style={styles.headerSub}>Attendance Detail</Text>
        </View>
        <View style={{ width:40 }} />
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={[styles.percentCircle, { borderColor: pColor }]}>
                <Text style={[styles.percentText, { color: pColor }]}>{pct}%</Text>
                <Text style={styles.percentLabel}>Attendance</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{stats?.total || 0}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color:"#34d399" }]}>{stats?.present || 0}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color:"#f87171" }]}>{stats?.absent || 0}</Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
              </View>

              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: pColor,
                }]} />
              </View>
              <Text style={styles.targetLabel}>75% minimum required</Text>

              {pct < 75 ? (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={14} color="#fbbf24" />
                  <Text style={styles.warningText}>
                    Below 75%!{classesNeeded()
                      ? ` Need ${classesNeeded()} more classes`
                      : " Attendance shortage!"}
                  </Text>
                </View>
              ) : (
                <View style={styles.safeBox}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#34d399" />
                  <Text style={styles.safeText}>Attendance Good ✅</Text>
                </View>
              )}
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
              {[
                { key:"all",     label:`All (${stats.total})`,       color:"#00c6ff" },
                { key:"present", label:`Present (${stats.present})`, color:"#34d399" },
                { key:"absent",  label:`Absent (${stats.absent})`,   color:"#f87171" },
              ].map(f => (
                <Pressable key={f.key}
                  style={[styles.filterBtn, filter === f.key && {
                    backgroundColor: f.color+"18",
                    borderColor: f.color,
                  }]}
                  onPress={() => setFilter(f.key)}>
                  <Text style={[styles.filterText, filter === f.key && { color: f.color }]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {filtered.length > 0 && (
              <Text style={styles.sectionTitle}>
                {filter === "all" ? "All Records" : filter === "present" ? "Present Days" : "Absent Days"} ({filtered.length})
              </Text>
            )}
          </>
        )}

        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#1f2937" />
            <Text style={styles.emptyTitle}>No Records</Text>
            <Text style={styles.emptySub}>
              {filter === "all"
                ? "No attendance records yet"
                : `No ${filter} records found`}
            </Text>
          </View>
        )}

        renderItem={({ item, index }) => {
          const isPresent  = item.status === "present";
          const statusColor= isPresent ? "#34d399" : "#f87171";
          const dayColor   = DAY_COLORS[item.day] || "#64748b";

          return (
            <View style={[
              styles.row,
              isPresent ? styles.rowPresent : styles.rowAbsent,
            ]}>
              {/* Status bar on left */}
              <View style={[styles.rowBar, { backgroundColor: statusColor }]} />

              {/* Date block */}
              <View style={styles.dateBlock}>
                <Text style={styles.dateNum}>
                  {item.date ? new Date(item.date).getDate() : index + 1}
                </Text>
                <Text style={styles.dateMon}>
                  {item.date
                    ? new Date(item.date).toLocaleString("en-IN", { month:"short" })
                    : ""}
                </Text>
              </View>

              <View style={styles.rowDivider} />

              {/* Info */}
              <View style={styles.rowInfo}>
                {/* Day */}
                {item.day ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={11} color={dayColor} />
                    <Text style={[styles.infoDay, { color: dayColor }]}>{item.day}</Text>
                  </View>
                ) : null}

                {/* Time */}
                {item.time ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={11} color="#64748b" />
                    <Text style={styles.infoTime}>{item.time}</Text>
                  </View>
                ) : null}

                {/* Full date */}
                <View style={styles.infoRow}>
                  <Ionicons name="today-outline" size={11} color="#374151" />
                  <Text style={styles.infoDate}>{formatDate(item.date)}</Text>
                </View>
              </View>

              {/* Status badge */}
              <View style={[styles.statusBadge, {
                backgroundColor: statusColor+"15",
                borderColor:     statusColor+"40",
              }]}>
                <Ionicons
                  name={isPresent ? "checkmark-circle" : "close-circle"}
                  size={15} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
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
  container:      { flex:1, backgroundColor:"#0f1923" },
  loaderContainer:{ flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#0f1923" },
  header:         { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:55, paddingBottom:16 },
  backBtn:        { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:   { flex:1, alignItems:"center" },
  headerTitle:    { color:"#fff", fontSize:16, fontWeight:"700" },
  headerSub:      { color:"#64748b", fontSize:12, marginTop:2 },
  listContent:    { paddingBottom:30 },

  // Summary
  summaryCard:    { margin:16, backgroundColor:"#1a2535", borderRadius:20, padding:24, alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  percentCircle:  { width:110, height:110, borderRadius:55, borderWidth:4, justifyContent:"center", alignItems:"center", marginBottom:20, backgroundColor:"rgba(255,255,255,0.03)" },
  percentText:    { fontSize:28, fontWeight:"800" },
  percentLabel:   { color:"#64748b", fontSize:11, marginTop:2 },
  statsRow:       { flexDirection:"row", width:"100%", justifyContent:"space-around", marginBottom:20 },
  statItem:       { alignItems:"center" },
  statNum:        { color:"#fff", fontSize:24, fontWeight:"800" },
  statLabel:      { color:"#64748b", fontSize:12, marginTop:4 },
  statDivider:    { width:1, backgroundColor:"rgba(255,255,255,0.08)" },
  progressBg:     { width:"100%", height:6, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden", marginBottom:6 },
  progressFill:   { height:"100%", borderRadius:3 },
  targetLabel:    { color:"#374151", fontSize:10, alignSelf:"flex-end", marginBottom:14 },
  warningBox:     { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(251,191,36,0.1)", paddingHorizontal:12, paddingVertical:8, borderRadius:10, borderWidth:1, borderColor:"rgba(251,191,36,0.2)", width:"100%" },
  warningText:    { color:"#fbbf24", fontSize:12, fontWeight:"600", flex:1 },
  safeBox:        { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(52,211,153,0.1)", paddingHorizontal:12, paddingVertical:8, borderRadius:10, borderWidth:1, borderColor:"rgba(52,211,153,0.2)", width:"100%" },
  safeText:       { color:"#34d399", fontSize:12, fontWeight:"600" },

  // Filter
  filterRow:      { flexDirection:"row", gap:8, marginHorizontal:16, marginBottom:12 },
  filterBtn:      { flex:1, paddingVertical:8, borderRadius:10, alignItems:"center", backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  filterText:     { color:"#64748b", fontSize:11, fontWeight:"700" },
  sectionTitle:   { color:"#cbd5e1", fontSize:13, fontWeight:"700", marginHorizontal:16, marginBottom:10 },

  // Record row
  row:            { flexDirection:"row", alignItems:"center", marginHorizontal:16, marginBottom:8, borderRadius:12, overflow:"hidden", borderWidth:1 },
  rowPresent:     { backgroundColor:"rgba(52,211,153,0.04)",  borderColor:"rgba(52,211,153,0.15)"  },
  rowAbsent:      { backgroundColor:"rgba(248,113,113,0.04)", borderColor:"rgba(248,113,113,0.15)" },
  rowBar:         { width:3, alignSelf:"stretch" },
  dateBlock:      { width:44, alignItems:"center", paddingVertical:12 },
  dateNum:        { color:"#fff", fontSize:18, fontWeight:"800" },
  dateMon:        { color:"#64748b", fontSize:9, fontWeight:"700" },
  rowDivider:     { width:1, height:36, backgroundColor:"rgba(255,255,255,0.06)" },
  rowInfo:        { flex:1, paddingHorizontal:12, paddingVertical:10, gap:3 },
  infoRow:        { flexDirection:"row", alignItems:"center", gap:5 },
  infoDay:        { fontSize:12, fontWeight:"700" },
  infoTime:       { color:"#94a3b8", fontSize:11 },
  infoDate:       { color:"#374151", fontSize:10 },
  statusBadge:    { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:10, paddingVertical:6, marginRight:10, borderRadius:8, borderWidth:1 },
  statusText:     { fontSize:11, fontWeight:"700" },

  emptyState:     { alignItems:"center", paddingTop:40, gap:10 },
  emptyTitle:     { color:"#374151", fontSize:16, fontWeight:"700" },
  emptySub:       { color:"#1f2937", fontSize:13, textAlign:"center" },
});