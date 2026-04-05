// app/super-admin/students.js
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, Alert, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../services/api";

const COLORS = ["#00c6ff","#a78bfa","#34d399","#f59e0b","#f87171","#ec4899","#60a5fa"];
const ac  = (n = "") => COLORS[n.charCodeAt(0) % COLORS.length];
const ini = (n = "") => n.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?";

export default function SuperAdminStudents() {
  const insets = useSafeAreaInsets();
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
    loadColleges();
    load(1, true, "all");
  }, []));

  const loadColleges = async () => {
    try {
      const r = await API.get("/super-admin/colleges");
      setColleges((r.data?.colleges || []).map(c => typeof c === "string" ? c : c.name).filter(Boolean));
    } catch {}
  };

  const load = async (p = 1, reset = false, col = college) => {
    if (fetching && !reset) return;
    setFetching(true);
    if (reset) setLoading(true);
    try {
      const params = { role:"student", page:p, limit:20 };
      if (col !== "all") params.college = col;
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

  const handleCollege = (c) => {
    setCollege(c);
    setSearch("");
    load(1, true, c);
  };

  const del = (item) => Alert.alert(
    "Delete Student",
    `Delete "${item.name}"? This action cannot be undone.`,
    [
      { text:"Cancel", style:"cancel" },
      { text:"Delete", style:"destructive", onPress: async () => {
        try {
          await API.delete(`/super-admin/users/${item._id}`);
          setStudents(p => p.filter(s => s._id !== item._id));
          setTotal(t => t - 1);
        } catch (e) {
          Alert.alert("Error", e.response?.data?.message || "Failed to delete student.");
        }
      }},
    ]
  );

  const filtered = search.trim()
    ? students.filter(s => {
        const q = search.toLowerCase();
        return (
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.studentId?.toLowerCase().includes(q) ||
          s.department?.toLowerCase().includes(q)
        );
      })
    : students;

  const chipLabel = (c) => {
    if (c === "all") return "All";
    return c.replace(/^nims\s*/i,"").split(" ").slice(0,2).join(" ");
  };

  const renderItem = ({ item, index }) => {
    const color = ac(item.name || "");
    return (
      <View style={s.card}>
        <Text style={s.idx}>#{index + 1}</Text>
        <View style={[s.av, { backgroundColor: color+"20", borderColor: color+"50" }]}>
          <Text style={[s.avT, { color }]}>{ini(item.name)}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.cardEmail} numberOfLines={1}>{item.email}</Text>
          <View style={s.tagsRow}>
            {item.studentId && (
              <View style={[s.tag, { borderColor:color+"44", backgroundColor:color+"12" }]}>
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

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* SINGLE FLATLIST — sab kuch scroll hota hai */}
      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => { if (students.length < total) load(page+1, false, college); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={() => (
          <View>
            {/* Header — scrolls with list */}
            <LinearGradient colors={["#070d1a","#0b1422"]} style={[s.header, {paddingTop: insets.top + 14}]}>
              <Pressable onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <View style={{ flex:1 }}>
                <Text style={s.headerTitle}>All Students</Text>
                <Text style={s.headerSub}>{total} students across all colleges}</Text>
              </View>
              <Pressable onPress={() => load(1, true, college)} style={s.refreshBtn}>
                <Ionicons name="refresh" size={17} color="#34d399" />
              </Pressable>
            </LinearGradient>

            {/* Filter bar — scrolls with list */}
            {/* ── Fixed filter bar ── */}
      <View style={s.filterBar}>
        {/* Search */}
        <View style={s.searchBox}>
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

        {/* College chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["all", ...colleges]}
          keyExtractor={c => c}
          contentContainerStyle={s.chipRow}
          renderItem={({ item: c }) => {
            const active = college === c;
            return (
              <Pressable
                onPress={() => handleCollege(c)}
                style={[s.chip, active && s.chipActiveGreen]}>
                {active && <Ionicons name="checkmark-circle" size={11} color="#34d399" style={{ marginRight:2 }} />}
                <Text style={[s.chipText, active && { color:"#34d399" }]}>
                  {chipLabel(c)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
          </View>
        )}
        ListFooterComponent={
          fetching && !loading
            ? <ActivityIndicator color="#34d399" style={{ marginVertical:14 }} />
            : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator size="large" color="#34d399" />
              <Text style={s.loaderText}>Loading...</Text>
            </View>
          ) : (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="people-outline" size={38} color="#374151" />
              </View>
              <Text style={s.emptyTitle}>No results found</Text>
            </View>
          )
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex:1, backgroundColor:"#070d1a" },
  header:         { flexDirection:"row", alignItems:"center", paddingBottom:14, paddingHorizontal:16, gap:12 },
  backBtn:        { width:38, height:38, borderRadius:12, backgroundColor:"rgba(255,255,255,0.07)", justifyContent:"center", alignItems:"center" },
  headerTitle:    { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:      { color:"#374151", fontSize:11, marginTop:1 },
  refreshBtn:     { width:38, height:38, borderRadius:12, backgroundColor:"rgba(52,211,153,0.1)", justifyContent:"center", alignItems:"center" },
  filterBar:      { backgroundColor:"#070d1a", paddingHorizontal:16, paddingTop:10, paddingBottom:10, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)" },
  searchBox:      { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1b2d", borderRadius:12, paddingHorizontal:12, paddingVertical:10, gap:8, borderWidth:1, borderColor:"rgba(255,255,255,0.07)", marginBottom:10 },
  searchInput:    { flex:1, color:"#fff", fontSize:13 },
  chipRow:        { gap:8, paddingVertical:2 },
  chip:           { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:7, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", backgroundColor:"rgba(255,255,255,0.04)", gap:3 },
  chipActiveGreen:{ borderColor:"rgba(52,211,153,0.5)", backgroundColor:"rgba(52,211,153,0.1)" },
  chipText:       { color:"#64748b", fontSize:11, fontWeight:"600" },
  listContent:    { padding:16, paddingBottom:50 },
  card:           { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1b2d", borderRadius:14, padding:12, marginBottom:8, gap:10, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  idx:            { color:"#1f2937", fontSize:10, fontWeight:"700", width:20, textAlign:"center" },
  av:             { width:42, height:42, borderRadius:21, justifyContent:"center", alignItems:"center", borderWidth:1.5 },
  avT:            { fontSize:13, fontWeight:"800" },
  cardName:       { color:"#fff", fontSize:13, fontWeight:"700" },
  cardEmail:      { color:"#64748b", fontSize:11, marginTop:2 },
  tagsRow:        { flexDirection:"row", gap:6, marginTop:5, flexWrap:"wrap" },
  tag:            { paddingHorizontal:7, paddingVertical:2, borderRadius:7, borderWidth:1 },
  tagT:           { fontSize:9, fontWeight:"700" },
  delBtn:         { width:30, height:30, borderRadius:9, backgroundColor:"rgba(248,113,113,0.1)", justifyContent:"center", alignItems:"center" },
  loaderWrap:     { flex:1, justifyContent:"center", alignItems:"center", gap:12 },
  loaderText:     { color:"#374151", fontSize:13 },
  empty:          { alignItems:"center", paddingTop:70, gap:10 },
  emptyIconWrap:  { width:70, height:70, borderRadius:35, backgroundColor:"rgba(255,255,255,0.04)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  emptyTitle:     { color:"#374151", fontSize:15, fontWeight:"700" },
  emptySub:       { color:"#1f2937", fontSize:12, textAlign:"center", paddingHorizontal:30 },
});