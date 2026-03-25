// app/super-admin/subjects.js
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, StatusBar, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const DEPT_COLORS = ["#00c6ff","#a78bfa","#34d399","#f59e0b","#f87171","#ec4899","#60a5fa"];
const dc = (d = "") => DEPT_COLORS[d.charCodeAt(0) % DEPT_COLORS.length];

export default function SuperAdminSubjects() {
  const router = useRouter();

  const [subjects,    setSubjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [college,     setCollege]     = useState("all");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [colleges,    setColleges]    = useState([]);
  const [total,       setTotal]       = useState(0);

  useFocusEffect(useCallback(() => {
    loadColleges();
    load("all", "all");
  }, []));

  const loadColleges = async () => {
    try {
      const r = await API.get("/super-admin/colleges");
      setColleges((r.data?.colleges || []).map(c => typeof c === "string" ? c : c.name).filter(Boolean));
    } catch {}
  };

  const load = async (col = college, typ = typeFilter) => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (col !== "all") params.college = col;
      if (typ !== "all") params.type    = typ;
      const r = await API.get("/super-admin/subjects", { params });
      const list = r.data?.subjects || [];
      setSubjects(list);
      setTotal(r.data?.total || list.length);
    } catch {
      setSubjects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCollege = (c) => {
    setCollege(c);
    setSearch("");
    load(c, typeFilter);
  };

  const handleType = (t) => {
    setTypeFilter(t);
    load(college, t);
  };

  // Local search filter only
  const filtered = search.trim()
    ? subjects.filter(s => {
        const q = search.toLowerCase();
        return (
          s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.department?.toLowerCase().includes(q)
        );
      })
    : subjects;

  // ── College chip label ───────────────────────────────
  const chipLabel = (c) => {
    if (c === "all") return "All Colleges";
    return c.replace(/^nims\s*/i, "").split(" ").slice(0, 3).join(" ");
  };

  // ── Detect subject type ──────────────────────────────
  const getType = (item) => {
    const t = (item.type || item.subjectType || "theory").toLowerCase();
    if (t === "lab" || t === "practical") return "lab";
    return "theory";
  };

  // ── Header component (scrolls with list) ────────────
  const ListHeader = () => (
    <View style={s.listHeaderWrap}>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={15} color="#64748b" />
        <TextInput
          style={s.searchInput}
          placeholder="Search name, code, department..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")} style={s.clearBtn}>
            <Ionicons name="close-circle" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* ── College filter ── */}
      <Text style={s.filterSectionLabel}>COLLEGE</Text>
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
              style={[s.chip, active && s.chipActiveBlue]}>
              {active && (
                <Ionicons name="checkmark-circle" size={11} color="#60a5fa" style={{ marginRight: 2 }} />
              )}
              <Text style={[s.chipText, active && { color:"#60a5fa" }]}>
                {chipLabel(c)}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* ── Type filter ── */}
      <Text style={s.filterSectionLabel}>TYPE</Text>
      <View style={s.typeRow}>
        {[
          { key:"all",    label:"All Types",       icon:"apps-outline",  color:"#a78bfa" },
          { key:"theory", label:"Theory",           icon:"book-outline",  color:"#00c6ff" },
          { key:"lab",    label:"Lab / Practical",  icon:"flask-outline", color:"#34d399" },
        ].map(tf => {
          const active = typeFilter === tf.key;
          return (
            <Pressable
              key={tf.key}
              onPress={() => handleType(tf.key)}
              style={[s.typeBtn,
                active && {
                  backgroundColor: tf.color + "18",
                  borderColor:     tf.color + "55",
                }
              ]}>
              <View style={[s.typeBtnIcon,
                { backgroundColor: active ? tf.color + "25" : "rgba(255,255,255,0.05)" }]}>
                <Ionicons name={tf.icon} size={14}
                  color={active ? tf.color : "#64748b"} />
              </View>
              <Text style={[s.typeBtnText, active && { color: tf.color }]}>
                {tf.label}
              </Text>
              {active && (
                <View style={[s.typeBtnDot, { backgroundColor: tf.color }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Result count */}
      <View style={s.resultRow}>
        <Text style={s.resultText}>
          Showing <Text style={s.resultCount}>{filtered.length}</Text>
          {search ? ` of ${subjects.length}` : ""} subjects
          {college !== "all" ? ` · ${chipLabel(college)}` : ""}
        </Text>
      </View>
    </View>
  );

  // ── Subject card ─────────────────────────────────────
  const renderItem = ({ item }) => {
    const color      = dc(item.department || item.name || "");
    const subType    = getType(item);
    const isLab      = subType === "lab";
    const typeColor  = isLab ? "#34d399" : "#00c6ff";
    const typeLabel  = isLab ? "LAB" : "THEORY";
    const typeIcon   = isLab ? "flask-outline" : "book-outline";

    return (
      <View style={s.card}>
        {/* Left: code box */}
        <View style={[s.codeBox, { backgroundColor: color+"18", borderColor: color+"35" }]}>
          <Text style={[s.codeText, { color }]} numberOfLines={2} adjustsFontSizeToFit>
            {item.code || item.subjectCode || "N/A"}
          </Text>
        </View>

        {/* Middle: info */}
        <View style={s.cardBody}>
          {/* Top row: name + type badge */}
          <View style={s.cardTopRow}>
            <Text style={s.cardName} numberOfLines={1}>{item.name || item.subjectName || "—"}</Text>
            <View style={[s.typePill, { backgroundColor: typeColor+"15", borderColor: typeColor+"40" }]}>
              <Ionicons name={typeIcon} size={9} color={typeColor} />
              <Text style={[s.typePillText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
          </View>

          {/* Tags row */}
          <View style={s.tagsRow}>
            {item.department && (
              <View style={[s.tag, { borderColor: color+"35", backgroundColor: color+"10" }]}>
                <Text style={[s.tagText, { color }]} numberOfLines={1}>
                  {item.department.split("(")[0].trim()}
                </Text>
              </View>
            )}
            {item.semester && (
              <View style={[s.tag, { borderColor:"#a78bfa35", backgroundColor:"#a78bfa10" }]}>
                <Text style={[s.tagText, { color:"#a78bfa" }]}>Sem {item.semester}</Text>
              </View>
            )}
            {item.credits && (
              <View style={[s.tag, { borderColor:"#f59e0b35", backgroundColor:"#f59e0b10" }]}>
                <Text style={[s.tagText, { color:"#f59e0b" }]}>{item.credits} Cr</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Sticky header */}
      <LinearGradient colors={["#070d1a","#0b1422"]} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>All Subjects</Text>
          <Text style={s.headerSub}>
            {loading ? "Loading..." : `${total} subjects system-wide`}
          </Text>
        </View>
        <Pressable onPress={() => load(college, typeFilter)} style={s.refreshBtn}>
          <Ionicons name="refresh" size={17} color="#60a5fa" />
        </Pressable>
      </LinearGradient>

      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={s.loaderText}>Loading subjects...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => item._id || String(idx)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="book-outline" size={40} color="#374151" />
              </View>
              <Text style={s.emptyTitle}>No subjects found</Text>
              <Text style={s.emptySub}>
                {search
                  ? "Try a different search term"
                  : typeFilter !== "all"
                    ? `No ${typeFilter} subjects in this college`
                    : "No subjects added yet"}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex:1, backgroundColor:"#070d1a" },

  // Header
  header:          { flexDirection:"row", alignItems:"center", paddingTop:52, paddingBottom:14, paddingHorizontal:16, gap:12 },
  backBtn:         { width:38, height:38, borderRadius:12, backgroundColor:"rgba(255,255,255,0.07)", justifyContent:"center", alignItems:"center" },
  headerTitle:     { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:       { color:"#374151", fontSize:11, marginTop:1 },
  refreshBtn:      { width:38, height:38, borderRadius:12, backgroundColor:"rgba(96,165,250,0.1)", justifyContent:"center", alignItems:"center" },

  // List
  listContent:     { paddingBottom:50 },
  listHeaderWrap:  { paddingBottom:4 },

  // Search
  searchBox:       { flexDirection:"row", alignItems:"center", marginHorizontal:16, marginTop:12, marginBottom:6, backgroundColor:"#0f1b2d", borderRadius:13, paddingHorizontal:14, paddingVertical:11, gap:10, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  searchInput:     { flex:1, color:"#fff", fontSize:13 },
  clearBtn:        { padding:2 },

  // Filter labels
  filterSectionLabel: { color:"#374151", fontSize:9, fontWeight:"800", letterSpacing:1.5, marginLeft:16, marginTop:14, marginBottom:6 },

  // College chips
  chipRow:         { paddingHorizontal:16, gap:8, paddingVertical:2 },
  chip:            { paddingHorizontal:12, paddingVertical:7, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", backgroundColor:"rgba(255,255,255,0.04)", flexDirection:"row", alignItems:"center", gap:4 },
  chipActiveBlue:  { borderColor:"rgba(96,165,250,0.5)", backgroundColor:"rgba(96,165,250,0.1)" },
  chipText:        { color:"#64748b", fontSize:11, fontWeight:"600" },

  // Type filter buttons
  typeRow:         { flexDirection:"row", paddingHorizontal:16, gap:8, marginTop:2 },
  typeBtn:         { flex:1, flexDirection:"row", alignItems:"center", gap:7, paddingHorizontal:12, paddingVertical:10, borderRadius:13, borderWidth:1, borderColor:"rgba(255,255,255,0.07)", backgroundColor:"rgba(255,255,255,0.03)", position:"relative" },
  typeBtnIcon:     { width:26, height:26, borderRadius:8, justifyContent:"center", alignItems:"center" },
  typeBtnText:     { color:"#64748b", fontSize:11, fontWeight:"700", flex:1 },
  typeBtnDot:      { position:"absolute", top:6, right:6, width:5, height:5, borderRadius:3 },

  // Result count
  resultRow:       { marginHorizontal:16, marginTop:10, marginBottom:4 },
  resultText:      { color:"#374151", fontSize:11 },
  resultCount:     { color:"#60a5fa", fontWeight:"700" },

  // Cards
  card:            { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1b2d", borderRadius:15, padding:13, marginHorizontal:16, marginBottom:8, gap:12, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  codeBox:         { width:58, height:54, borderRadius:12, borderWidth:1, justifyContent:"center", alignItems:"center" },
  codeText:        { fontSize:10, fontWeight:"900", textAlign:"center" },
  cardBody:        { flex:1, gap:6 },
  cardTopRow:      { flexDirection:"row", alignItems:"center", gap:8 },
  cardName:        { color:"#fff", fontSize:13, fontWeight:"700", flex:1 },
  typePill:        { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:7, paddingVertical:3, borderRadius:8, borderWidth:1 },
  typePillText:    { fontSize:9, fontWeight:"800" },
  tagsRow:         { flexDirection:"row", gap:6, flexWrap:"wrap" },
  tag:             { paddingHorizontal:7, paddingVertical:3, borderRadius:7, borderWidth:1 },
  tagText:         { fontSize:9, fontWeight:"700" },

  // Empty
  loaderWrap:      { flex:1, justifyContent:"center", alignItems:"center", gap:12 },
  loaderText:      { color:"#374151", fontSize:13 },
  empty:           { alignItems:"center", paddingTop:60, gap:10 },
  emptyIconWrap:   { width:74, height:74, borderRadius:37, backgroundColor:"rgba(255,255,255,0.04)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  emptyTitle:      { color:"#374151", fontSize:15, fontWeight:"700" },
  emptySub:        { color:"#1f2937", fontSize:12, textAlign:"center", paddingHorizontal:30 },
});