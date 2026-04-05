// app/super-admin/subjects.js
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../services/api";

const DEPT_COLORS = ["#00c6ff","#a78bfa","#34d399","#f59e0b","#f87171","#ec4899","#60a5fa"];
const dc = (d = "") => DEPT_COLORS[d.charCodeAt(0) % DEPT_COLORS.length];

export default function SuperAdminSubjects() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | theory | lab
  const [total,      setTotal]      = useState(0);

  useFocusEffect(useCallback(() => { load("all"); }, []));

  const load = async (typ = typeFilter) => {
    setLoading(true);
    try {
      const params = { limit: 300 };
      if (typ !== "all") params.type = typ;
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

  const handleType = (t) => {
    setTypeFilter(t);
    setSearch("");
    load(t);
  };

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

  const getType = (item) => {
    const t = (item.type || item.subjectType || "").toLowerCase();
    return (t === "lab" || t === "practical") ? "lab" : "theory";
  };

  const TYPE_BTNS = [
    { key:"all",    label:"All",     icon:"apps-outline",  color:"#a78bfa" },
    { key:"theory", label:"Theory",  icon:"book-outline",  color:"#00c6ff" },
    { key:"lab",    label:"Lab",     icon:"flask-outline", color:"#34d399" },
  ];

  const renderItem = ({ item }) => {
    const color     = dc(item.department || item.name || "");
    const isLab     = getType(item) === "lab";
    const typeColor = isLab ? "#34d399" : "#00c6ff";
    const typeLabel = isLab ? "LAB" : "THEORY";
    const typeIcon  = isLab ? "flask-outline" : "book-outline";

    return (
      <View style={s.card}>
        <View style={[s.codeBox, { backgroundColor: color+"18", borderColor: color+"35" }]}>
          <Text style={[s.codeText, { color }]} numberOfLines={2} adjustsFontSizeToFit>
            {item.code || item.subjectCode || "N/A"}
          </Text>
        </View>
        <View style={s.cardBody}>
          <View style={s.cardTopRow}>
            <Text style={s.cardName} numberOfLines={1}>{item.name || item.subjectName || "—"}</Text>
            <View style={[s.typePill, { backgroundColor: typeColor+"15", borderColor: typeColor+"40" }]}>
              <Ionicons name={typeIcon} size={9} color={typeColor} />
              <Text style={[s.typePillText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
          </View>
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

      {/* ── Fixed sticky header ── */}
      <LinearGradient colors={["#070d1a","#0b1422"]} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>All Subjects</Text>
          <Text style={s.headerSub}>
            {loading ? "Loading..." : `${filtered.length} of ${total} subjects`}
          </Text>
        </View>
        <Pressable onPress={() => load(typeFilter)} style={s.refreshBtn}>
          <Ionicons name="refresh" size={17} color="#60a5fa" />
        </Pressable>
      </LinearGradient>

      {/* ── Fixed filter bar (does NOT scroll) ── */}
      <View style={s.filterBar}>
        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search" size={14} color="#64748b" />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, code, department..."
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

        {/* Theory / Lab filter */}
        <View style={s.typeRow}>
          {TYPE_BTNS.map(tb => {
            const active = typeFilter === tb.key;
            return (
              <Pressable
                key={tb.key}
                onPress={() => handleType(tb.key)}
                style={[s.typeBtn,
                  active && { backgroundColor: tb.color+"18", borderColor: tb.color+"55" }
                ]}>
                <View style={[s.typeBtnIcon,
                  { backgroundColor: active ? tb.color+"25" : "rgba(255,255,255,0.05)" }]}>
                  <Ionicons name={tb.icon} size={13} color={active ? tb.color : "#64748b"} />
                </View>
                <Text style={[s.typeBtnText, active && { color: tb.color }]}>
                  {tb.label}
                </Text>
                {active && <View style={[s.activeDot, { backgroundColor: tb.color }]} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Scrollable list only ── */}
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
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="book-outline" size={38} color="#374151" />
              </View>
              <Text style={s.emptyTitle}>No subjects found</Text>
              <Text style={s.emptySub}>
                {search
                  ? "Try a different search term"
                  : typeFilter !== "all"
                    ? `No ${typeFilter} subjects found`
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
  container:    { flex:1, backgroundColor:"#070d1a" },

  // Sticky header
  header:       { flexDirection:"row", alignItems:"center", paddingBottom:14, paddingHorizontal:16, gap:12 },
  backBtn:      { width:38, height:38, borderRadius:12, backgroundColor:"rgba(255,255,255,0.07)", justifyContent:"center", alignItems:"center" },
  headerTitle:  { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:    { color:"#374151", fontSize:11, marginTop:1 },
  refreshBtn:   { width:38, height:38, borderRadius:12, backgroundColor:"rgba(96,165,250,0.1)", justifyContent:"center", alignItems:"center" },

  // Fixed filter bar
  filterBar:    { backgroundColor:"#070d1a", paddingHorizontal:16, paddingTop:10, paddingBottom:12, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)" },
  searchBox:    { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1b2d", borderRadius:12, paddingHorizontal:12, paddingVertical:10, gap:8, borderWidth:1, borderColor:"rgba(255,255,255,0.07)", marginBottom:10 },
  searchInput:  { flex:1, color:"#fff", fontSize:13 },

  // Type filter row
  typeRow:      { flexDirection:"row", gap:8 },
  typeBtn:      { flex:1, flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:10, paddingVertical:9, borderRadius:12, borderWidth:1, borderColor:"rgba(255,255,255,0.07)", backgroundColor:"rgba(255,255,255,0.03)", position:"relative", overflow:"hidden" },
  typeBtnIcon:  { width:24, height:24, borderRadius:7, justifyContent:"center", alignItems:"center" },
  typeBtnText:  { color:"#64748b", fontSize:11, fontWeight:"700", flex:1 },
  activeDot:    { position:"absolute", top:5, right:5, width:5, height:5, borderRadius:3 },

  // List
  listContent:  { padding:16, paddingBottom:50 },

  // Cards
  card:         { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1b2d", borderRadius:14, padding:13, marginBottom:8, gap:12, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  codeBox:      { width:58, height:52, borderRadius:12, borderWidth:1, justifyContent:"center", alignItems:"center" },
  codeText:     { fontSize:10, fontWeight:"900", textAlign:"center" },
  cardBody:     { flex:1, gap:5 },
  cardTopRow:   { flexDirection:"row", alignItems:"center", gap:8 },
  cardName:     { color:"#fff", fontSize:13, fontWeight:"700", flex:1 },
  typePill:     { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:7, paddingVertical:3, borderRadius:8, borderWidth:1 },
  typePillText: { fontSize:9, fontWeight:"800" },
  tagsRow:      { flexDirection:"row", gap:6, flexWrap:"wrap" },
  tag:          { paddingHorizontal:7, paddingVertical:3, borderRadius:7, borderWidth:1 },
  tagText:      { fontSize:9, fontWeight:"700" },

  // Empty + Loader
  loaderWrap:   { flex:1, justifyContent:"center", alignItems:"center", gap:12 },
  loaderText:   { color:"#374151", fontSize:13 },
  empty:        { alignItems:"center", paddingTop:70, gap:10 },
  emptyIconWrap:{ width:70, height:70, borderRadius:35, backgroundColor:"rgba(255,255,255,0.04)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  emptyTitle:   { color:"#374151", fontSize:15, fontWeight:"700" },
  emptySub:     { color:"#1f2937", fontSize:12, textAlign:"center", paddingHorizontal:30 },
});