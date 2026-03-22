import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, BackHandler, ToastAndroid,
  StatusBar, RefreshControl, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";
import SafeImage from "../../components/SafeImage";

const { width } = Dimensions.get("window");

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const CAT_COLORS = {
  General: "#00c6ff", Academic: "#34d399", Event: "#a78bfa",
  Holiday: "#34d399", Exam: "#f87171", Alert: "#f59e0b",
};
const ROLE_COLORS = { admin: "#a78bfa", teacher: "#f59e0b", student: "#00c6ff" };

// ── Stat Card ──
const StatCard = ({ icon, label, value, color, onPress, badge }) => (
  <Pressable
    style={[styles.statCard, { borderTopColor: color }]}
    onPress={onPress}
    android_ripple={{ color: color + "30" }}
  >
    <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value ?? "—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {badge > 0 && (
      <View style={[styles.statBadge, { backgroundColor: color }]}>
        <Text style={styles.statBadgeText}>{badge}</Text>
      </View>
    )}
  </Pressable>
);

// ── Menu Card ──
const MenuCard = ({ icon, label, subtitle, color, onPress, badge }) => (
  <Pressable style={styles.menuCard} onPress={onPress} android_ripple={{ color: color + "20" }}>
    <View style={[styles.menuIconWrap, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={styles.menuText}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuSub} numberOfLines={1}>{subtitle}</Text>
    </View>
    {badge > 0 && (
      <View style={[styles.menuBadge, { backgroundColor: color }]}>
        <Text style={styles.menuBadgeText}>{badge}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={16} color="#374151" />
  </Pressable>
);

// ── Post Card ──
const PostCard = ({ item, onLike, onPress }) => {
  const roleColor = ROLE_COLORS[item.authorRole] || "#64748b";
  const catColor  = CAT_COLORS[item.category]    || "#64748b";
  const initials  = item.authorName
    ?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.postAvatar, { backgroundColor: roleColor + "22", borderColor: roleColor + "44" }]}>
          <Text style={[styles.postAvatarText, { color: roleColor }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthorName}>{item.authorName || "Admin"}</Text>
          <View style={styles.postMeta}>
            <View style={[styles.rolePill, { backgroundColor: roleColor + "20" }]}>
              <Text style={[styles.rolePillText, { color: roleColor }]}>
                {(item.authorRole || "admin").toUpperCase()}
              </Text>
            </View>
            <Text style={styles.postTime}>{item.createdAt ? timeAgo(item.createdAt) : ""}</Text>
          </View>
        </View>
        <View style={[styles.catPill, { backgroundColor: catColor + "18", borderColor: catColor + "40" }]}>
          <Text style={[styles.catPillText, { color: catColor }]}>{item.category || "General"}</Text>
        </View>
      </View>

      {!!(item.caption || item.content) && (
        <Text style={styles.postCaption} numberOfLines={4}>
          {item.caption || item.content}
        </Text>
      )}

      {/* ✅ SafeImage */}
      {item.mediaType === "image" && !!item.mediaUrl && (
        <SafeImage uri={item.mediaUrl} style={styles.postImage} size={undefined} />
      )}
      {item.mediaType === "video" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="play-circle" size={18} color="#a78bfa" />
          <Text style={styles.mediaBannerText}>Video attached</Text>
        </View>
      )}
      {item.mediaType === "audio" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="musical-notes" size={18} color="#34d399" />
          <Text style={styles.mediaBannerText}>Audio attached</Text>
        </View>
      )}

      <View style={styles.postActions}>
        <Pressable style={styles.actionBtn} onPress={() => onLike(item)}>
          <Ionicons
            name={item.isLiked ? "heart" : "heart-outline"}
            size={20}
            color={item.isLiked ? "#f87171" : "#64748b"}
          />
          <Text style={[styles.actionCount, item.isLiked && { color: "#f87171" }]}>
            {item.likeCount || 0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onPress}>
          <Ionicons name="chatbubble-outline" size={19} color="#64748b" />
          <Text style={styles.actionCount}>{item.commentCount || 0}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onPress}>
          <Ionicons name="share-social-outline" size={19} color="#64748b" />
        </Pressable>
      </View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const router = useRouter();
  const [adminData,    setAdminData]    = useState(null);
  const [stats,        setStats]        = useState(null);
  const [posts,        setPosts]        = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const backPressCount = useRef(0);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("adminLoggedIn");
    if (!token) { router.replace("/login"); return; }
    const raw = await AsyncStorage.getItem("adminData");
    if (raw) setAdminData(JSON.parse(raw));
    try { const r = await API.get("/dashboard/admin"); if (r.data) setStats(r.data); } catch {}
    try {
      const r = await API.get("/api/posts");
      setPosts(r.data?.posts || r.data || []);
    } catch {}
    setCheckingAuth(false);
    setRefreshing(false);
  }, [router]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  useFocusEffect(useCallback(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backPressCount.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => handler.remove();
  }, []));

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "adminData", "adminLoggedIn"]);
    router.replace("/");
  };

  const handleLike = async (post) => {
    try {
      const r = await API.post(`/api/posts/${post._id}/like`);
      setPosts(prev => prev.map(p =>
        p._id === post._id ? { ...p, isLiked: r.data.liked, likeCount: r.data.likeCount } : p
      ));
    } catch {}
  };

  if (checkingAuth) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#a78bfa" />
    </View>
  );

  const pendingRequests = stats?.pendingRequests || 0;

  const menuItems = [
    { icon:"people",       label:"Manage Students",    subtitle:`${stats?.totalStudents||0} enrolled`,        color:"#00c6ff", route:"/admin/manage-students"   },
    { icon:"person",       label:"Manage Teachers",    subtitle:`${stats?.totalTeachers||0} registered`,      color:"#f59e0b", route:"/admin/manage-teachers"   },
    { icon:"book",         label:"Manage Subjects",    subtitle:`${stats?.totalSubjects||0} subjects`,        color:"#34d399", route:"/admin/manage-subjects"   },
    { icon:"business",     label:"Room Timetable",     subtitle:"View rooms & detect conflicts",              color:"#00c6ff", route:"/admin/room-timetable"    },
    { icon:"calendar",     label:"Student Attendance", subtitle:"View & filter attendance records",           color:"#f87171", route:"/admin/view-attendance"   },
    { icon:"finger-print", label:"Teacher Attendance", subtitle:"Biometric gate punch records",              color:"#34d399", route:"/admin/teacher-attendance" },
    { icon:"megaphone",    label:"Post Notice",        subtitle:"Create announcements for students",         color:"#fb923c", route:"/admin/post-notice"       },
    { icon:"document-text",label:"Subject Requests",   subtitle:pendingRequests>0?`${pendingRequests} pending`:"Review teacher requests", color:"#f59e0b", route:"/admin/subject-requests", badge:pendingRequests },
    { icon:"scan",         label:"Gate Biometric",     subtitle:"Live student gate attendance",              color:"#a78bfa", route:"/admin/biometric"         },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <LinearGradient colors={["#080d17","#0d0020"]} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={15} color="#a78bfa" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {adminData?.college ? adminData.college.split(" ").slice(0,3).join(" ") : "COLLAहUB"}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push("/admin/post-notice")} style={styles.headerBtn}>
            <Ionicons name="add" size={20} color="#fb923c" />
          </Pressable>
          <Pressable onPress={handleLogout} style={[styles.headerBtn,{backgroundColor:"rgba(248,113,113,0.1)"}]}>
            <Ionicons name="log-out-outline" size={18} color="#f87171" />
          </Pressable>
        </View>
      </LinearGradient>

      <FlatList
        data={posts}
        keyExtractor={(item, i) => item._id || String(i)}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#a78bfa" />}
        ListHeaderComponent={() => (
          <>
            <LinearGradient
              colors={["#4c1d95","#7c3aed","#a78bfa"]}
              start={{x:0,y:0}} end={{x:1,y:1}}
              style={styles.welcomeCard}>
              <View style={styles.welcomeLeft}>
                <Text style={styles.welcomeHi}>Hello, {adminData?.name?.split(" ")[0]||"Admin"} 👋</Text>
                <Text style={styles.welcomeRole}>Administrator • COLLAहUB</Text>
                {adminData?.college && (
                  <Text style={styles.welcomeCollege} numberOfLines={2}>{adminData.college}</Text>
                )}
              </View>
              <View style={styles.welcomeBadgeWrap}>
                <View style={styles.welcomeBadge}>
                  <Ionicons name="shield-checkmark" size={28} color="#a78bfa" />
                </View>
                <Text style={styles.welcomeBadgeText}>ADMIN</Text>
              </View>
            </LinearGradient>

            <Text style={styles.sectionLabel}>OVERVIEW — YOUR COLLEGE</Text>
            <View style={styles.statsRow}>
              <StatCard icon="people"        label="Students" value={stats?.totalStudents} color="#00c6ff" onPress={() => router.push("/admin/manage-students")} />
              <StatCard icon="person"        label="Teachers" value={stats?.totalTeachers} color="#f59e0b" onPress={() => router.push("/admin/manage-teachers")} />
              <StatCard icon="book"          label="Subjects" value={stats?.totalSubjects} color="#34d399" />
              <StatCard icon="document-text" label="Pending"  value={pendingRequests}      color="#f87171" badge={pendingRequests} onPress={() => router.push("/admin/subject-requests")} />
            </View>

            <Text style={styles.sectionLabel}>MANAGEMENT</Text>
            <View style={styles.menuGrid}>
              {menuItems.map(item => (
                <MenuCard key={item.label} {...item} onPress={() => router.push(item.route)} />
              ))}
            </View>

            {posts.length > 0 && (
              <View style={styles.postsDivider}>
                <View style={styles.postsDividerLine} />
                <View style={styles.postsDividerBadge}>
                  <Ionicons name="newspaper" size={12} color="#64748b" />
                  <Text style={styles.postsDividerText}>COLLEGE POSTS</Text>
                </View>
                <View style={styles.postsDividerLine} />
              </View>
            )}
          </>
        )}
        renderItem={({ item }) => (
          <PostCard item={item} onLike={handleLike} onPress={() => router.push("/admin/post-notice")} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyPosts}>
            <View style={styles.emptyPostsIcon}>
              <Ionicons name="newspaper-outline" size={32} color="#374151" />
            </View>
            <Text style={styles.emptyPostsText}>No posts yet</Text>
            <Pressable style={styles.createPostBtn} onPress={() => router.push("/admin/post-notice")}>
              <Ionicons name="add-circle-outline" size={15} color="#fb923c" />
              <Text style={styles.createPostBtnText}>Create First Post</Text>
            </Pressable>
          </View>
        )}
        ListFooterComponent={() => <View style={{ height: 40 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex:1, backgroundColor:"#080d17" },
  loaderContainer:{ flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#080d17" },
  header:         { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, paddingTop:52, paddingBottom:12 },
  headerLeft:     { flexDirection:"row", alignItems:"center", gap:10 },
  adminBadge:     { width:38, height:38, borderRadius:12, backgroundColor:"rgba(124,58,237,0.2)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(167,139,250,0.25)" },
  headerTitle:    { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:      { color:"#4b5563", fontSize:10, marginTop:1, maxWidth:200 },
  headerRight:    { flexDirection:"row", gap:8 },
  headerBtn:      { width:36, height:36, borderRadius:11, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  welcomeCard:    { marginHorizontal:16, marginTop:12, marginBottom:8, borderRadius:22, padding:22, flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  welcomeLeft:    { flex:1 },
  welcomeHi:      { color:"#fff", fontSize:21, fontWeight:"900", marginBottom:3 },
  welcomeRole:    { color:"rgba(255,255,255,0.65)", fontSize:12 },
  welcomeCollege: { color:"rgba(255,255,255,0.4)", fontSize:10, marginTop:4, lineHeight:15 },
  welcomeBadgeWrap:{ alignItems:"center", gap:4 },
  welcomeBadge:   { width:54, height:54, borderRadius:27, backgroundColor:"rgba(0,0,0,0.25)", justifyContent:"center", alignItems:"center" },
  welcomeBadgeText:{ color:"rgba(255,255,255,0.5)", fontSize:9, fontWeight:"800", letterSpacing:1 },
  sectionLabel:   { color:"#374151", fontSize:10, fontWeight:"800", letterSpacing:1.2, marginHorizontal:16, marginTop:20, marginBottom:10 },
  statsRow:       { flexDirection:"row", paddingHorizontal:16, gap:8, marginBottom:4 },
  statCard:       { flex:1, backgroundColor:"#111927", borderRadius:14, padding:12, alignItems:"center", borderTopWidth:2, position:"relative" },
  statIconWrap:   { width:32, height:32, borderRadius:9, justifyContent:"center", alignItems:"center", marginBottom:6 },
  statValue:      { fontSize:20, fontWeight:"900" },
  statLabel:      { color:"#374151", fontSize:9, fontWeight:"700", marginTop:2 },
  statBadge:      { position:"absolute", top:6, right:6, minWidth:16, height:16, borderRadius:8, justifyContent:"center", alignItems:"center", paddingHorizontal:3 },
  statBadgeText:  { color:"#000", fontSize:8, fontWeight:"900" },
  menuGrid:       { paddingHorizontal:16, gap:8, marginBottom:4 },
  menuCard:       { flexDirection:"row", alignItems:"center", backgroundColor:"#111927", borderRadius:15, padding:14, gap:12, borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  menuIconWrap:   { width:42, height:42, borderRadius:13, justifyContent:"center", alignItems:"center" },
  menuText:       { flex:1 },
  menuLabel:      { color:"#e2e8f0", fontSize:14, fontWeight:"700" },
  menuSub:        { color:"#374151", fontSize:11, marginTop:2 },
  menuBadge:      { minWidth:22, height:22, borderRadius:11, justifyContent:"center", alignItems:"center", paddingHorizontal:5 },
  menuBadgeText:  { color:"#000", fontSize:10, fontWeight:"800" },
  postsDivider:   { flexDirection:"row", alignItems:"center", marginHorizontal:16, marginTop:24, marginBottom:12, gap:10 },
  postsDividerLine:  { flex:1, height:1, backgroundColor:"rgba(255,255,255,0.06)" },
  postsDividerBadge: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"#111927", paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
  postsDividerText:  { color:"#374151", fontSize:9, fontWeight:"800", letterSpacing:1 },
  postCard:       { backgroundColor:"#111927", marginBottom:2, borderTopWidth:1, borderBottomWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  postHeader:     { flexDirection:"row", alignItems:"center", padding:14, gap:10 },
  postAvatar:     { width:40, height:40, borderRadius:20, justifyContent:"center", alignItems:"center", borderWidth:1.5 },
  postAvatarText: { fontSize:14, fontWeight:"800" },
  postAuthorName: { color:"#fff", fontSize:13, fontWeight:"700" },
  postMeta:       { flexDirection:"row", alignItems:"center", gap:6, marginTop:2 },
  rolePill:       { paddingHorizontal:6, paddingVertical:2, borderRadius:5 },
  rolePillText:   { fontSize:8, fontWeight:"800", letterSpacing:0.5 },
  postTime:       { color:"#374151", fontSize:11 },
  catPill:        { paddingHorizontal:8, paddingVertical:3, borderRadius:8, borderWidth:1 },
  catPillText:    { fontSize:10, fontWeight:"700" },
  postCaption:    { color:"#cbd5e1", fontSize:13, lineHeight:20, paddingHorizontal:14, paddingBottom:12 },
  postImage:      { width:"100%", height:240, backgroundColor:"#1a2535" },
  mediaBanner:    { flexDirection:"row", alignItems:"center", gap:8, marginHorizontal:14, marginBottom:12, backgroundColor:"rgba(255,255,255,0.04)", padding:12, borderRadius:10 },
  mediaBannerText:{ color:"#64748b", fontSize:12 },
  postActions:    { flexDirection:"row", gap:20, paddingHorizontal:14, paddingVertical:12, borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.05)" },
  actionBtn:      { flexDirection:"row", alignItems:"center", gap:5 },
  actionCount:    { color:"#64748b", fontSize:13, fontWeight:"600" },
  emptyPosts:     { alignItems:"center", paddingVertical:30, gap:10 },
  emptyPostsIcon: { width:60, height:60, borderRadius:30, backgroundColor:"#111927", justifyContent:"center", alignItems:"center" },
  emptyPostsText: { color:"#374151", fontSize:13, fontWeight:"600" },
  createPostBtn:  { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(251,146,60,0.08)", paddingHorizontal:16, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:"rgba(251,146,60,0.2)" },
  createPostBtnText:{ color:"#fb923c", fontSize:12, fontWeight:"700" },
});