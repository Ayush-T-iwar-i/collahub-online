// app/super-admin/posts.js
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, Alert, StatusBar,
  Image, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../services/api";

const { width } = Dimensions.get("window");
const IMG_H = width * 0.55;

// ── Time helper ───────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "—";
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── Role badge color ──────────────────────────────────────
const roleColor = (role = "") => {
  const r = role.toLowerCase();
  if (r === "admin")       return "#a78bfa";
  if (r === "teacher")     return "#f59e0b";
  if (r === "super-admin") return "#f87171";
  return "#00c6ff";
};

// ── College short label ───────────────────────────────────
const shortCollege = (c = "") =>
  c.replace(/^nims\s*/i, "").split(" ").slice(0, 3).join(" ");

// ════════════════════════════════════════════════════════
export default function SuperAdminPosts() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [posts,     setPosts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [college,   setCollege]   = useState("all");
  const [colleges,  setColleges]  = useState([]);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [fetching,  setFetching]  = useState(false);

  // ── Load on focus ─────────────────────────────────────
  useFocusEffect(useCallback(() => {
    loadColleges();
    load(1, true, college);
  }, [college]));

  const loadColleges = async () => {
    try {
      const r = await API.get("/super-admin/colleges");
      setColleges(
        (r.data?.colleges || [])
          .map(c => typeof c === "string" ? c : c.name)
          .filter(Boolean)
      );
    } catch {}
  };

  const load = async (p = 1, reset = false, col = college) => {
    if (fetching && !reset) return;
    setFetching(true);
    if (reset) setLoading(true);
    try {
      const params = { page: p, limit: 15 };
      if (col !== "all") params.college = col;
      const r = await API.get("/api/posts", { params });
      const list = r.data?.posts || r.data || [];
      setPosts(prev => reset ? list : [...prev, ...list]);
      setTotal(r.data?.total || list.length);
      setPage(p);
    } catch {
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  // ── Filter by search (local) ──────────────────────────
  const filtered = posts.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.caption?.toLowerCase().includes(q)  ||
      p.content?.toLowerCase().includes(q)  ||
      p.title?.toLowerCase().includes(q)    ||
      p.authorName?.toLowerCase().includes(q) ||
      p.author?.name?.toLowerCase().includes(q)
    );
  });

  // ── Delete ───────────────────────────────────────────
  const del = (item) => Alert.alert(
    "Delete Post",
    "Are you sure you want to delete this post?",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await API.delete(`/api/posts/${item._id}`);
          setPosts(p => p.filter(x => x._id !== item._id));
          setTotal(t => t - 1);
        } catch (e) {
          Alert.alert("Error", e.response?.data?.message || "Failed to delete");
        }
      }},
    ]
  );

  // ── Post card ─────────────────────────────────────────
  const renderPost = ({ item }) => {
    const authorName  = item.authorName || item.author?.name || "Unknown";
    const authorRole  = item.authorRole || item.author?.role || "student";
    const rColor      = roleColor(authorRole);
    const caption     = item.caption || item.content || "";
    const hasMedia    = !!(item.mediaUrl || item.imageUrl || item.image);
    const mediaUrl    = item.mediaUrl || item.imageUrl || item.image;
    const isVideo     = item.mediaType === "video";
    const likes       = item.likeCount  ?? (Array.isArray(item.likes)    ? item.likes.length    : item.likes    ?? 0);
    const comments    = item.commentCount ?? (Array.isArray(item.comments) ? item.comments.length : item.comments ?? 0);
    const collegeName = item.college ? shortCollege(item.college) : "";

    return (
      <View style={s.card}>
        {/* ── Author row ── */}
        <View style={s.authorRow}>
          <View style={[s.avatar, { backgroundColor: rColor + "22" }]}>
            <Text style={[s.avatarTxt, { color: rColor }]}>
              {authorName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.authorName} numberOfLines={1}>{authorName}</Text>
            <View style={s.authorMeta}>
              <View style={[s.roleBadge, { backgroundColor: rColor + "18", borderColor: rColor + "40" }]}>
                <Text style={[s.roleTxt, { color: rColor }]}>{authorRole.toUpperCase()}</Text>
              </View>
              {!!collegeName && (
                <Text style={s.collegeChip} numberOfLines={1}>{collegeName}</Text>
              )}
              <Text style={s.timeAgo}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
          <Pressable onPress={() => del(item)} style={s.delBtn}>
            <Ionicons name="trash-outline" size={15} color="#f87171" />
          </Pressable>
        </View>

        {/* ── Caption ── */}
        {!!caption && (
          <Text style={s.caption} numberOfLines={4}>{caption}</Text>
        )}

        {/* ── Media ── */}
        {hasMedia && !isVideo && (
          <View style={s.mediaWrap}>
            <Image
              source={{ uri: mediaUrl }}
              style={s.mediaImg}
              resizeMode="cover"
            />
          </View>
        )}
        {hasMedia && isVideo && (
          <View style={s.mediaWrap}>
            <View style={s.videoPlaceholder}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.7)" />
              <Text style={s.videoTxt}>Video</Text>
            </View>
          </View>
        )}

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Ionicons name="heart" size={13} color="#f87171" />
            <Text style={s.statTxt}>{likes}</Text>
          </View>
          <View style={s.stat}>
            <Ionicons name="chatbubble-outline" size={12} color="#60a5fa" />
            <Text style={s.statTxt}>{comments}</Text>
          </View>
          {item.category && item.category !== "General" && (
            <View style={s.catPill}>
              <Text style={s.catTxt}>{item.category}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── List header — scrolls with FlatList ──────────────
  const ListHeader = () => (
    <View>
      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={15} color="#64748b" />
        <TextInput
          style={s.searchInput}
          placeholder="Search posts, authors..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* College filter chips */}
      <View style={s.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["all", ...colleges]}
          keyExtractor={c => c}
          contentContainerStyle={s.filterRow}
          renderItem={({ item: c }) => {
            const active = college === c;
            return (
              <Pressable
                onPress={() => setCollege(c)}
                style={[s.chip, active && s.chipActive]}
              >
                {active && (
                  <Ionicons name="checkmark-circle" size={11} color="#f87171" style={{ marginRight: 3 }} />
                )}
                <Text style={[s.chipTxt, active && { color: "#f87171" }]}>
                  {c === "all" ? "All Colleges" : shortCollege(c)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Count */}
      <View style={s.countRow}>
        <Text style={s.countTxt}>
          {search ? `${filtered.length} of ${posts.length}` : filtered.length} posts
          {college !== "all" ? ` · ${shortCollege(college)}` : ""}
        </Text>
        {search && (
          <Pressable onPress={() => setSearch("")} style={s.clearBtn}>
            <Text style={s.clearTxt}>Clear</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  // ── Render ────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* SINGLE FLATLIST — header + filter + posts all scroll together */}
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item, idx) => item._id || String(idx)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => { if (posts.length < total) load(page + 1); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={() => (
          <View>
            {/* App header */}
            <LinearGradient
              colors={["#070d1a", "#0a1628"]}
              style={[s.header, { paddingTop: insets.top + 14 }]}
            >
              <Pressable onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>All Posts & Feed</Text>
                <Text style={s.headerSub}>{total} posts across all colleges</Text>
              </View>
              <Pressable onPress={() => load(1, true, college)} style={s.refreshBtn}>
                <Ionicons name="refresh" size={17} color="#f87171" />
              </Pressable>
            </LinearGradient>

            <ListHeader />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator size="large" color="#f87171" />
              <Text style={s.loaderTxt}>Loading posts...</Text>
            </View>
          ) : (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="newspaper-outline" size={40} color="#374151" />
              </View>
              <Text style={s.emptyTitle}>No posts found</Text>
              <Text style={s.emptySub}>
                {search ? "Try a different search term" : "No posts in this college yet"}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          fetching && !loading
            ? <ActivityIndicator color="#f87171" style={{ marginVertical: 16 }} />
            : <View style={{ height: 20 }} />
        }
        renderItem={renderPost}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#070d1a" },
  listContent:   { paddingBottom: 50 },

  // Header
  header:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", justifyContent: "center", alignItems: "center" },
  headerTitle:   { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub:     { color: "#374151", fontSize: 11, marginTop: 1 },
  refreshBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(248,113,113,0.1)", justifyContent: "center", alignItems: "center" },

  // Search
  searchBox:     { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 12, marginBottom: 10, backgroundColor: "#0f1b2d", borderRadius: 13, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  searchInput:   { flex: 1, color: "#fff", fontSize: 13 },

  // Filter
  filterWrap:    { marginBottom: 8 },
  filterRow:     { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" },
  chipActive:    { borderColor: "rgba(248,113,113,0.5)", backgroundColor: "rgba(248,113,113,0.1)" },
  chipTxt:       { color: "#64748b", fontSize: 11, fontWeight: "600" },

  // Count row
  countRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 },
  countTxt:      { color: "#374151", fontSize: 11, fontWeight: "600" },
  clearBtn:      { backgroundColor: "rgba(248,113,113,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  clearTxt:      { color: "#f87171", fontSize: 11, fontWeight: "700" },

  // Post card
  card:          { backgroundColor: "#0f1b2d", borderRadius: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden" },

  // Author row
  authorRow:     { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  avatar:        { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  avatarTxt:     { fontSize: 14, fontWeight: "800" },
  authorName:    { color: "#fff", fontSize: 13, fontWeight: "700" },
  authorMeta:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  roleBadge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  roleTxt:       { fontSize: 9, fontWeight: "800" },
  collegeChip:   { color: "#374151", fontSize: 10, flex: 1 },
  timeAgo:       { color: "#374151", fontSize: 10 },
  delBtn:        { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(248,113,113,0.1)", justifyContent: "center", alignItems: "center" },

  // Caption
  caption:       { color: "#cbd5e1", fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 12 },

  // Media
  mediaWrap:     { width: "100%", height: IMG_H, backgroundColor: "#1a2535", overflow: "hidden" },
  mediaImg:      { width: "100%", height: "100%" },
  videoPlaceholder:{ width:"100%", height:"100%", justifyContent:"center", alignItems:"center", backgroundColor:"#0a1020" },
  videoTxt:      { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 6 },

  // Stats
  statsRow:      { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  stat:          { flexDirection: "row", alignItems: "center", gap: 5 },
  statTxt:       { color: "#64748b", fontSize: 12, fontWeight: "600" },
  catPill:       { marginLeft: "auto", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  catTxt:        { color: "#64748b", fontSize: 10, fontWeight: "700" },

  // Empty / Loader
  loaderWrap:    { alignItems: "center", paddingTop: 60, gap: 12 },
  loaderTxt:     { color: "#374151", fontSize: 13 },
  empty:         { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.04)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  emptyTitle:    { color: "#374151", fontSize: 15, fontWeight: "700" },
  emptySub:      { color: "#1f2937", fontSize: 12, textAlign: "center", paddingHorizontal: 30 },
});