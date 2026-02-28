import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  TextInput, StatusBar, ActivityIndicator, RefreshControl,
  ScrollView, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const SEMESTERS   = ["All","1","2","3","4","5","6","7","8"];
const DEPARTMENTS = ["All","CSE","IT","ECE","EE","ME","Civil","AI&ML","DS"];

const AttendanceRow = ({ item }) => {
  const pct = item.totalClasses > 0 ? Math.round((item.presentCount / item.totalClasses) * 100) : 0;
  const color = pct >= 75 ? "#34d399" : pct >= 50 ? "#f59e0b" : "#f87171";
  const initials = item.studentName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "S";

  return (
    <View style={styles.row}>
      <View style={[styles.rowAvatar, { backgroundColor: color + "20" }]}>
        <Text style={[styles.rowAvatarText, { color }]}>{initials}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{item.studentName || "Unknown"}</Text>
        <Text style={styles.rowSub}>{item.studentId} • {item.subject || item.subjectName || ""}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.pctText, { color }]}>{pct}%</Text>
        <Text style={styles.rowCount}>{item.presentCount}/{item.totalClasses}</Text>
      </View>
    </View>
  );
};

export default function ViewAttendance() {
  const router = useRouter();
  const [records, setRecords]     = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState("");
  const [selSem, setSelSem]       = useState("All");
  const [selDept, setSelDept]     = useState("All");
  const [stats, setStats]         = useState({ total:0, above75:0, below50:0, avg:0 });

  useFocusEffect(useCallback(() => { loadAttendance(); }, []));

  const loadAttendance = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/attendance/all");
      const data = res.data?.records || res.data || [];
      setRecords(data); applyFilters(data, search, selSem, selDept);
      // Stats
      if (data.length > 0) {
        const pcts = data.map(r => r.totalClasses > 0 ? (r.presentCount/r.totalClasses)*100 : 0);
        setStats({
          total: data.length,
          above75: pcts.filter(p => p >= 75).length,
          below50: pcts.filter(p => p < 50).length,
          avg: Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length),
        });
      }
    } catch (e) { setRecords([]); setFiltered([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const applyFilters = (data, s, sem, dept) => {
    let result = data;
    if (s.trim()) {
      const q = s.toLowerCase();
      result = result.filter(r => r.studentName?.toLowerCase().includes(q) || r.studentId?.toLowerCase().includes(q));
    }
    if (sem !== "All") result = result.filter(r => String(r.semester) === sem);
    if (dept !== "All") result = result.filter(r => r.department?.toUpperCase().includes(dept.toUpperCase()));
    setFiltered(result);
  };

  const handleSearch = (text) => { setSearch(text); applyFilters(records, text, selSem, selDept); };
  const handleSem  = (s) => { setSelSem(s);  applyFilters(records, search, s, selDept); };
  const handleDept = (d) => { setSelDept(d); applyFilters(records, search, selSem, d); };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>View Attendance</Text>
          <Text style={styles.headerSub}>{filtered.length} records</Text>
        </View>
        <View style={{ width:40 }} />
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={[styles.statNum,{color:"#00c6ff"}]}>{stats.total}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum,{color:"#34d399"}]}>{stats.above75}</Text><Text style={styles.statLabel}>≥75%</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum,{color:"#f87171"}]}>{stats.below50}</Text><Text style={styles.statLabel}>{"<50%"}</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum,{color:"#f59e0b"}]}>{stats.avg}%</Text><Text style={styles.statLabel}>Avg</Text></View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Search by name or ID..." placeholderTextColor="#374151"
          value={search} onChangeText={handleSearch} />
        {search.length > 0 && <Pressable onPress={() => handleSearch("")}><Ionicons name="close-circle" size={16} color="#64748b" /></Pressable>}
      </View>

      {/* Semester filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {SEMESTERS.map(s => (
          <Pressable key={s} onPress={() => handleSem(s)}
            style={[styles.chip, selSem===s && { backgroundColor:"rgba(167,139,250,0.2)",borderColor:"rgba(167,139,250,0.4)" }]}>
            <Text style={[styles.chipText, selSem===s && { color:"#a78bfa" }]}>{s==="All"?"All Sem":`Sem ${s}`}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Dept filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {DEPARTMENTS.map(d => (
          <Pressable key={d} onPress={() => handleDept(d)}
            style={[styles.chip, selDept===d && { backgroundColor:"rgba(0,198,255,0.15)",borderColor:"rgba(0,198,255,0.35)" }]}>
            <Text style={[styles.chipText, selDept===d && { color:"#00c6ff" }]}>{d}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#a78bfa" /></View> : (
        <FlatList
          data={filtered} keyExtractor={(item,i) => item._id || i.toString()}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAttendance(true)} tintColor="#a78bfa" />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={40} color="#374151" /></View>
              <Text style={styles.emptyTitle}>No Attendance Records</Text>
            </View>
          )}
          renderItem={({ item }) => <AttendanceRow item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1,backgroundColor:"#080d17" },
  center: { flex:1,justifyContent:"center",alignItems:"center" },
  header: { flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingTop:52,paddingBottom:14,justifyContent:"space-between" },
  backBtn: { width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter: { flex:1,alignItems:"center" },
  headerTitle: { color:"#fff",fontSize:18,fontWeight:"800" },
  headerSub: { color:"#64748b",fontSize:11,marginTop:2 },
  statsRow: { flexDirection:"row",marginHorizontal:16,marginTop:12,gap:8 },
  statBox: { flex:1,backgroundColor:"#1a2535",borderRadius:12,padding:10,alignItems:"center",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  statNum: { fontSize:20,fontWeight:"800" },
  statLabel: { color:"#64748b",fontSize:9,marginTop:2,fontWeight:"700" },
  searchBar: { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#1a2535",marginHorizontal:16,marginTop:12,borderRadius:14,paddingHorizontal:14,paddingVertical:2,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  searchInput: { flex:1,color:"#fff",fontSize:14,paddingVertical:12 },
  filterScroll: { marginTop:10 },
  filterRow: { paddingHorizontal:16,gap:8 },
  chip: { paddingHorizontal:12,paddingVertical:6,borderRadius:20,backgroundColor:"#1a2535",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  chipText: { color:"#64748b",fontSize:11,fontWeight:"600" },
  list: { padding:16,paddingBottom:30 },
  row: { flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,padding:12,marginBottom:8,borderWidth:1,borderColor:"rgba(255,255,255,0.04)",gap:12 },
  rowAvatar: { width:42,height:42,borderRadius:21,justifyContent:"center",alignItems:"center" },
  rowAvatarText: { fontSize:15,fontWeight:"800" },
  rowBody: { flex:1 },
  rowName: { color:"#fff",fontSize:13,fontWeight:"700" },
  rowSub: { color:"#64748b",fontSize:11,marginTop:2,marginBottom:6 },
  progressBar: { height:4,backgroundColor:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden" },
  progressFill: { height:4,borderRadius:2 },
  rowRight: { alignItems:"flex-end" },
  pctText: { fontSize:16,fontWeight:"800" },
  rowCount: { color:"#64748b",fontSize:10,marginTop:2 },
  emptyState: { alignItems:"center",paddingTop:60,gap:12 },
  emptyIcon: { width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle: { color:"#374151",fontSize:16,fontWeight:"700" },
});