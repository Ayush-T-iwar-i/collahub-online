import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const getColor = (pct) => {
  if (pct >= 75) return "#34d399";
  if (pct >= 60) return "#f59e0b";
  return "#f87171";
};

export default function StudentAttendance() {
  const router = useRouter();

  const [summary,    setSummary]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadAttendance(); }, []));

  const loadAttendance = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/attendance/my");
      setSummary(res.data?.summary || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load attendance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ FIXED: attendance-detail page pe navigate karo
  const openDetail = (subject) => {
    router.push({
      pathname: "/student/attendance-detail",
      params: {
        subjectId:   subject.subjectId,
        subjectName: subject.subjectName,
      },
    });
  };

  const overallPct = summary.length > 0
    ? Math.round(summary.reduce((acc, s) => acc + s.percentage, 0) / summary.length)
    : 0;

  const renderSubject = ({ item }) => {
    const color = getColor(item.percentage);
    return (
      <Pressable style={styles.subCard} onPress={() => openDetail(item)}>
        <View style={[styles.subAccent, { backgroundColor: color }]} />
        <View style={styles.subBody}>
          <View style={styles.subTopRow}>
            <Text style={styles.subName} numberOfLines={1}>{item.subjectName}</Text>
            <View style={[styles.pctBadge, { backgroundColor: color+"20", borderColor: color }]}>
              <Text style={[styles.pctText, { color }]}>{item.percentage}%</Text>
            </View>
          </View>
          {item.teacherName ? (
            <View style={styles.teacherRow}>
              <Ionicons name="person-outline" size={11} color="#64748b" />
              <Text style={styles.teacherName}>{item.teacherName}</Text>
            </View>
          ) : null}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${Math.min(item.percentage, 100)}%`,
              backgroundColor: color,
            }]} />
          </View>
          <View style={styles.subStatsRow}>
            <Text style={[styles.subStat, { color:"#34d399" }]}>✓ {item.present} Present</Text>
            <Text style={[styles.subStat, { color:"#f87171" }]}>✗ {item.absent} Absent</Text>
            <Text style={styles.subStat}>{item.total} Total</Text>
          </View>
          {item.percentage < 75 && (
            <View style={styles.warningRow}>
              <Ionicons name="warning-outline" size={12} color="#f87171" />
              <Text style={styles.warningText}>
                {Math.ceil((75 * item.total - 100 * item.present) / 25)} more classes needed
              </Text>
            </View>
          )}
        </View>
        <View style={styles.arrowWrap}>
          <Ionicons name="chevron-forward" size={18} color="#374151" />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Attendance</Text>
          <Text style={styles.headerSub}>{summary.length} subjects</Text>
        </View>
        <View style={{ width:40 }} />
      </LinearGradient>

      {summary.length > 0 && (
        <View style={styles.overallBox}>
          <View style={[styles.overallCircle, { borderColor: getColor(overallPct) }]}>
            <Text style={[styles.overallPct, { color: getColor(overallPct) }]}>{overallPct}%</Text>
            <Text style={styles.overallLabel}>Overall</Text>
          </View>
          <View style={styles.overallStats}>
            <Text style={styles.overallStatTitle}>Attendance Summary</Text>
            <Text style={styles.overallStatSub}>
              {summary.filter(s => s.percentage >= 75).length} subjects above 75%
            </Text>
            <Text style={styles.overallStatSub}>
              {summary.filter(s => s.percentage < 75).length} subjects below 75%
            </Text>
            {overallPct < 75 && (
              <View style={styles.dangerBadge}>
                <Ionicons name="warning" size={12} color="#f87171" />
                <Text style={styles.dangerText}>Attendance low!</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00c6ff" />
        </View>
      ) : (
        <FlatList
          data={summary}
          keyExtractor={i => i.subjectId?.toString() || i.subjectName}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadAttendance(true)} tintColor="#00c6ff" />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No Attendance Yet</Text>
              <Text style={styles.emptySub}>Teacher has not marked attendance yet</Text>
            </View>
          )}
          renderItem={renderSubject}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex:1, backgroundColor:"#080d17" },
  center:          { flex:1, justifyContent:"center", alignItems:"center" },
  header:          { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  backBtn:         { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:    { flex:1, alignItems:"center" },
  headerTitle:     { color:"#fff", fontSize:18, fontWeight:"800" },
  headerSub:       { color:"#64748b", fontSize:11, marginTop:2 },
  overallBox:      { flexDirection:"row", alignItems:"center", gap:16, margin:16, backgroundColor:"#1a2535", borderRadius:16, padding:16, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  overallCircle:   { width:72, height:72, borderRadius:36, borderWidth:3, justifyContent:"center", alignItems:"center" },
  overallPct:      { fontSize:20, fontWeight:"800" },
  overallLabel:    { color:"#64748b", fontSize:10, fontWeight:"600" },
  overallStats:    { flex:1 },
  overallStatTitle:{ color:"#fff", fontSize:14, fontWeight:"700", marginBottom:4 },
  overallStatSub:  { color:"#64748b", fontSize:12, marginTop:2 },
  dangerBadge:     { flexDirection:"row", alignItems:"center", gap:4, marginTop:6, backgroundColor:"rgba(248,113,113,0.12)", paddingHorizontal:8, paddingVertical:4, borderRadius:6, alignSelf:"flex-start" },
  dangerText:      { color:"#f87171", fontSize:11, fontWeight:"700" },
  list:            { padding:16, paddingBottom:30 },
  subCard:         { flexDirection:"row", alignItems:"center", backgroundColor:"#1a2535", borderRadius:14, marginBottom:10, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  subAccent:       { width:3, alignSelf:"stretch" },
  subBody:         { flex:1, padding:12 },
  subTopRow:       { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:4 },
  subName:         { color:"#fff", fontSize:14, fontWeight:"700", flex:1, marginRight:8 },
  pctBadge:        { paddingHorizontal:10, paddingVertical:3, borderRadius:8, borderWidth:1 },
  pctText:         { fontSize:13, fontWeight:"800" },
  teacherRow:      { flexDirection:"row", alignItems:"center", gap:5, marginBottom:8 },
  teacherName:     { color:"#64748b", fontSize:11 },
  progressBg:      { height:4, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:2, marginBottom:8, overflow:"hidden" },
  progressFill:    { height:4, borderRadius:2 },
  subStatsRow:     { flexDirection:"row", gap:12 },
  subStat:         { color:"#64748b", fontSize:11, fontWeight:"600" },
  warningRow:      { flexDirection:"row", alignItems:"center", gap:4, marginTop:6, backgroundColor:"rgba(248,113,113,0.08)", paddingHorizontal:8, paddingVertical:4, borderRadius:6 },
  warningText:     { color:"#f87171", fontSize:11 },
  arrowWrap:       { paddingRight:12 },
  emptyState:      { alignItems:"center", paddingTop:80, gap:12 },
  emptyTitle:      { color:"#374151", fontSize:16, fontWeight:"700" },
  emptySub:        { color:"#1f2937", fontSize:13 },
});