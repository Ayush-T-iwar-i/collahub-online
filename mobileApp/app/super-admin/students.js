// app/super-admin/students.js
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, Alert, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const COLORS = ["#00c6ff","#a78bfa","#34d399","#f59e0b","#f87171","#ec4899","#60a5fa"];
const ac  = (n = "") => COLORS[n.charCodeAt(0) % COLORS.length];
const ini = (n = "") => n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";

export default function SuperAdminStudents() {
  const router = useRouter();
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [college,   setCollege]   = useState("all");
  const [colleges,  setColleges]  = useState([]);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [fetching,  setFetching]  = useState(false);

  useFocusEffect(useCallback(() => {
    load(1, true);
    loadColleges();
  }, [college]));

  const loadColleges = async () => {
    try {
      const r = await API.get("/super-admin/colleges");
      setColleges((r.data?.colleges || []).map(c => typeof c === "string" ? c : c.name).filter(Boolean));
    } catch {}
  };

  const load = async (p = 1, reset = false) => {
    if (fetching) return;
    setFetching(true);
    if (reset) setLoading(true);
    try {
      const params = { role: "student", page: p, limit: 20 };
      if (college !== "all") params.college = college;
      const r = await API.get("/super-admin/users", { params });
      const list = r.data?.users || [];
      setStudents(prev => reset ? list : [...prev, ...list]);
      setTotal(r.data?.total || 0);
      setPage(p);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to load students.");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const del = (item) => Alert.alert(
    "Delete Student",
    `Delete "${item.name}"? This cannot be undone.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await API.delete(`/super-admin/users/${item._id}`);
          setStudents(p => p.filter(s => s._id !== item._id));
          setTotal(t => t - 1);
        } catch (e) {
          Alert.alert("Error", e.response?.data?.message || "Failed to delete.");
        }
      }},
    ]
  );

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  });

  const renderItem = ({ item, index }) => {
    const color = ac(item.name || "");
    return (
      <View style={s.card}>
        <Text style={s.idx}>#{index + 1}</Text>
        <View style={[s.av, { backgroundColor: color + "20", borderColor: color + "50" }]}>
          <Text style={[s.avT, { color }]}>{ini(item.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          <Text style={s.email} numberOfLines={1}>{item.email}</Text>
          <View style={s.tags}>
            {item.studentId && (
              <View style={[s.tag, { borderColor: color+"44", backgroundColor: color+"12" }]}>
                <Text style={[s.tagT, { color }]}>{item.studentId}</Text>
              </View>
            )}
            {item.department && (
              <View style={[s.tag, { borderColor:"#34d39940", backgroundColor:"#34d39912" }]}>
                <Text style={[s.tagT, { color:"#34d399" }]} numberOfLines={1}>
                  {item.department.split("(")[0].trim()}
                </Text>
              </View>
            )}
            {item.section && (
              <View style={[s.tag, { borderColor:"#60a5fa40", backgroundColor:"#60a5fa12" }]}>
                <Text style={[s.tagT, { color:"#60a5fa" }]}>Sec {item.section}</Text>
              </View>
            )}
            {item.semester && (
              <View style={[s.tag, { borderColor:"#a78bfa40", backgroundColor:"#a78bfa12" }]}>
                <Text style={[s.tagT, { color:"#a78bfa" }]}>Sem {item.semester}</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={() => del(item)} style={s.delBtn}>
          <Ionicons name="trash-outline" size={14} color="#f87171" />
        </Pressable>
      </View>
    );
  };

  // ── Everything above the list (scrolls with list) ──
  const ListHeader = () => (
    <View>
      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search" size={14} color="#64748b" />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, ID, department..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* College filter chips — horizontal scroll inside FlatList header */}
      <View style={s.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["all", ...colleges]}
          keyExtractor={c => c}
          contentContainerStyle={s.filterRow}
          renderItem={({ item: c }) => (
            <Pressable
              key={c}
              onPress={() => setCollege(c)}
              style={[s.chip, college === c && s.chipA]}>
              <Text style={[s.chipT, college === c && { color: "#34d399" }]}>
                {c === "all" ? "All Colleges" : c.replace("Nims ","").split(" ").slice(0,3).join(" ")}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Fixed Header — stays on top always */}
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>All Students</Text>
          <Text style={s.sub}>{total} students across all colleges</Text>
        </View>
        <Pressable onPress={() => load(1, true)} style={s.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#34d399" />
        </Pressable>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#34d399" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<ListHeader />}
          onEndReached={() => { if (students.length < total) load(page + 1); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            fetching && !loading
              ? <ActivityIndicator color="#34d399" style={{ marginVertical: 14 }} />
              : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={44} color="#1f2937" />
              <Text style={s.emptyT}>No students found</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#070d1a" },
  // Fixed header
  header:      { flexDirection:"row", alignItems:"center", paddingTop:52, paddingBottom:14, paddingHorizontal:16, gap:12 },
  back:        { width:38, height:38, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  title:       { color:"#fff", fontSize:17, fontWeight:"800" },
  sub:         { color:"#374151", fontSize:11, marginTop:1 },
  refreshBtn:  { width:38, height:38, borderRadius:12, backgroundColor:"rgba(52,211,153,0.1)", justifyContent:"center", alignItems:"center" },
  // Scrollable content
  listContent: { paddingBottom: 40 },
  searchRow:   { flexDirection:"row", alignItems:"center", marginHorizontal:16, marginTop:12, marginBottom:8, backgroundColor:"#0f1b2d", borderRadius:12, paddingHorizontal:12, paddingVertical:10, gap:8, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  searchInput: { flex:1, color:"#fff", fontSize:13 },
  filterWrap:  { marginBottom:8 },
  filterRow:   { paddingHorizontal:16, gap:8, paddingVertical:6 },
  chip:        { paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", backgroundColor:"rgba(255,255,255,0.04)" },
  chipA:       { borderColor:"rgba(52,211,153,0.5)", backgroundColor:"rgba(52,211,153,0.1)" },
  chipT:       { color:"#64748b", fontSize:11, fontWeight:"600" },
  // Cards
  card:        { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1b2d", borderRadius:14, padding:12, marginHorizontal:16, marginBottom:8, gap:10, borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  idx:         { color:"#1f2937", fontSize:10, fontWeight:"700", width:20, textAlign:"center" },
  av:          { width:42, height:42, borderRadius:21, justifyContent:"center", alignItems:"center", borderWidth:1.5 },
  avT:         { fontSize:13, fontWeight:"800" },
  name:        { color:"#fff", fontSize:13, fontWeight:"700" },
  email:       { color:"#64748b", fontSize:11, marginTop:2 },
  tags:        { flexDirection:"row", gap:6, marginTop:5, flexWrap:"wrap" },
  tag:         { paddingHorizontal:7, paddingVertical:2, borderRadius:7, borderWidth:1 },
  tagT:        { fontSize:9, fontWeight:"700" },
  delBtn:      { width:30, height:30, borderRadius:9, backgroundColor:"rgba(248,113,113,0.1)", justifyContent:"center", alignItems:"center" },
  empty:       { alignItems:"center", paddingTop:60, gap:10 },
  emptyT:      { color:"#374151", fontSize:14, fontWeight:"700" },
});