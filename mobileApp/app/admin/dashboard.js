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

const { width } = Dimensions.get("window");

const ROLE_COLORS = { admin:"#a78bfa", teacher:"#f59e0b", student:"#00c6ff" };
const CAT_COLORS  = { General:"#00c6ff", Academic:"#34d399", Event:"#a78bfa", Holiday:"#34d399", Exam:"#f87171", Alert:"#f59e0b" };

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff/60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};

// ─── Stat Card — CLICKABLE ───
const StatCard = ({ icon, label, value, color, onPress }) => (
  <Pressable
    style={[styles.statCard, { borderLeftColor: color }]}
    onPress={onPress}
    android_ripple={{ color: color+"30", borderless:false }}
  >
    <View style={[styles.statIcon, { backgroundColor: color+"22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value ?? "—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {onPress && (
      <View style={styles.statArrow}>
        <Ionicons name="chevron-forward" size={11} color={color+"80"} />
      </View>
    )}
  </Pressable>
);

// ─── Menu Card ───
const MenuCard = ({ icon, label, subtitle, color, onPress }) => (
  <Pressable style={styles.menuCard} onPress={onPress}>
    <LinearGradient colors={[color+"22", color+"08"]} style={styles.menuGrad}>
      <View style={[styles.menuIcon, { backgroundColor: color+"20" }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color+"80"} />
    </LinearGradient>
  </Pressable>
);

// ─── Post Feed Card ───
const PostFeedCard = ({ item, onLike, onPress }) => {
  const roleColor = ROLE_COLORS[item.authorRole] || "#64748b";
  const catColor  = CAT_COLORS[item.category]    || "#64748b";
  const initials  = item.authorName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";

  return (
    <Pressable style={styles.postCard} onPress={onPress}>
      {/* Author row */}
      <View style={styles.postAuthorRow}>
        <View style={[styles.postAvatar,{backgroundColor:roleColor+"22"}]}>
          <Text style={[styles.postAvatarText,{color:roleColor}]}>{initials}</Text>
        </View>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{item.authorName || "Admin"}</Text>
          <View style={styles.postAuthorMeta}>
            <View style={[styles.roleBadge,{backgroundColor:roleColor+"20"}]}>
              <Text style={[styles.roleBadgeText,{color:roleColor}]}>{(item.authorRole||"admin").toUpperCase()}</Text>
            </View>
            <Text style={styles.postTime}>{item.createdAt ? timeAgo(item.createdAt) : ""}</Text>
          </View>
        </View>
        <View style={[styles.catBadge,{backgroundColor:catColor+"20"}]}>
          <Text style={[styles.catBadgeText,{color:catColor}]}>{item.category||"General"}</Text>
        </View>
      </View>

      {/* Content */}
      {!!(item.caption||item.content) && (
        <Text style={styles.postCaption} numberOfLines={3}>{item.caption||item.content}</Text>
      )}

      {/* Media */}
      {item.mediaType==="image" && !!item.mediaUrl && (
        <Image source={{uri:item.mediaUrl}} style={styles.postImage} resizeMode="cover" />
      )}
      {item.mediaType==="video" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="videocam" size={15} color="#a78bfa" />
          <Text style={styles.mediaBannerText}>Video</Text>
        </View>
      )}
      {item.mediaType==="audio" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="musical-notes" size={15} color="#34d399" />
          <Text style={styles.mediaBannerText}>Audio</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.postActions}>
        <Pressable style={styles.actionBtn} onPress={()=>onLike(item)}>
          <Ionicons name={item.isLiked?"heart":"heart-outline"} size={18}
            color={item.isLiked?"#f87171":"#64748b"} />
          <Text style={[styles.actionCount,item.isLiked&&{color:"#f87171"}]}>
            {item.likeCount||0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onPress}>
          <Ionicons name="chatbubble-outline" size={17} color="#64748b" />
          <Text style={styles.actionCount}>{item.commentCount||0}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

// ══════════════════════════════════════════
export default function AdminDashboard() {
  const router = useRouter();
  const [adminData, setAdminData]       = useState(null);
  const [stats, setStats]               = useState(null);
  const [posts, setPosts]               = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const backPressCount = useRef(0);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh=false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("adminLoggedIn");
    if (!token) { router.replace("/admin/login"); return; }
    const raw = await AsyncStorage.getItem("adminData");
    if (raw) setAdminData(JSON.parse(raw));
    try { const r = await API.get("/dashboard/admin"); if (r.data) setStats(r.data); } catch {}
    try {
      const r = await API.get("/api/posts");
      setPosts(r.data?.posts || r.data || []);
    } catch {}
    setCheckingAuth(false);
    setRefreshing(false);
  };

  // Double back to exit
  useFocusEffect(useCallback(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backPressCount.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp(); return true;
    });
    return () => handler.remove();
  }, []));

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    await AsyncStorage.multiRemove(["accessToken","refreshToken","adminData","adminLoggedIn"]);
    router.replace("/");
  };

  const handleSyncSemesters = async () => {
    setSyncing(true);
    try {
      const res = await API.post("/results/sync-semesters");
      ToastAndroid.show(
        `✅ ${res.data?.updated || 0} students' semesters updated!`,
        ToastAndroid.LONG
      );
      loadAll(); // refresh stats
    } catch (e) {
      ToastAndroid.show("❌ Sync failed: " + (e.response?.data?.message || e.message), ToastAndroid.LONG);
    } finally {
      setSyncing(false);
    }
  };

  const handleLike = async (post) => {
    try {
      const r = await API.post(`/api/posts/${post._id}/like`);
      setPosts(prev=>prev.map(p=>p._id===post._id
        ? {...p, isLiked:r.data.liked, likeCount:r.data.likeCount} : p));
    } catch {}
  };

  if (checkingAuth) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#a78bfa" />
    </View>
  );

  const menuItems = [
    { icon:"people",   label:"Manage Students",  subtitle:`${stats?.totalStudents||0} students`,  color:"#00c6ff", route:"/admin/manage-students" },
    { icon:"person",   label:"Manage Teachers",  subtitle:`${stats?.totalTeachers||0} teachers`,  color:"#f59e0b", route:"/admin/manage-teachers" },
    { icon:"book",     label:"Manage Subjects",  subtitle:`${stats?.totalSubjects||0} subjects`,  color:"#34d399", route:"/admin/manage-subjects" },
    { icon:"time",     label:"Manage Timetable", subtitle:"Schedule classes",                      color:"#a78bfa", route:"/admin/manage-timetable" },
    { icon:"calendar", label:"View Attendance",  subtitle:"All attendance records",                color:"#f87171", route:"/admin/view-attendance" },
    { icon:"megaphone",label:"Post Notice",       subtitle:"Create announcements",                  color:"#fb923c", route:"/admin/post-notice" },
  ];

  // Single flat data: sections rendered via ListHeaderComponent + renderItem for posts
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* ═══ STICKY HEADER — stays fixed, never scrolls ═══ */}
      <LinearGradient colors={["#080d17","#120020"]} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#a78bfa" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSub}>CollaHub</Text>
          </View>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
        </Pressable>
      </LinearGradient>

      {/* ═══ SCROLLABLE BODY — everything below header scrolls ═══ */}
      <FlatList
        data={posts}
        keyExtractor={(_,i)=>_.id||i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadAll(true)} tintColor="#a78bfa" />}

        // ─── All static content above posts ───
        ListHeaderComponent={() => (
          <>
            {/* Welcome Card */}
            <LinearGradient colors={["#7c3aed","#a78bfa"]}
              start={{x:0,y:0}} end={{x:1,y:1}} style={styles.welcomeCard}>
              <View style={{flex:1}}>
                <Text style={styles.welcomeHi}>Hello, {adminData?.name?.split(" ")[0]||"Admin"} 👋</Text>
                <Text style={styles.welcomeSub}>Administrator • CollaHub</Text>
                <View style={styles.adminRoleBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#a78bfa" />
                  <Text style={styles.adminRoleBadgeText}>ADMIN ACCESS</Text>
                </View>
              </View>
              <Ionicons name="settings" size={52} color="rgba(255,255,255,0.12)" />
            </LinearGradient>

            {/* ─── Clickable Overview Stats ─── */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="people"  label="Students" value={stats?.totalStudents} color="#00c6ff"
                onPress={() => router.push("/admin/manage-students")} />
              <StatCard icon="person"  label="Teachers" value={stats?.totalTeachers} color="#f59e0b"
                onPress={() => router.push("/admin/manage-teachers")} />
              <StatCard icon="book"    label="Subjects" value={stats?.totalSubjects} color="#34d399"
                onPress={() => router.push("/admin/manage-subjects")} />
              <StatCard icon="school"  label="Colleges" value={stats?.totalColleges} color="#a78bfa" />
            </View>

            {/* ─── Sync Semesters Banner ─── */}
            <Pressable
              style={[styles.syncBanner, syncing && { opacity: 0.6 }]}
              onPress={handleSyncSemesters}
              disabled={syncing}
            >
              <LinearGradient
                colors={["rgba(52,211,153,0.15)", "rgba(52,211,153,0.05)"]}
                style={styles.syncBannerGrad}
              >
                {syncing
                  ? <ActivityIndicator size="small" color="#34d399" />
                  : <Ionicons name="sync-outline" size={18} color="#34d399" />
                }
                <View style={{ flex: 1 }}>
                  <Text style={styles.syncBannerTitle}>
                    {syncing ? "Syncing semesters..." : "Auto-Sync All Semesters"}
                  </Text>
                  <Text style={styles.syncBannerSub}>
                    Updates semester based on admission year for students without results
                  </Text>
                </View>
                {!syncing && <Ionicons name="chevron-forward" size={15} color="#34d399" />}
              </LinearGradient>
            </Pressable>

            {/* ─── Management Cards ─── */}
            <Text style={styles.sectionTitle}>Management</Text>
            {menuItems.map(item => (
              <MenuCard key={item.label} {...item} onPress={() => router.push(item.route)} />
            ))}

            {/* ─── Posts section header ─── */}
            {posts.length > 0 && (
              <View style={styles.postsSectionHeader}>
                <Text style={styles.sectionTitle}>All Posts</Text>
                <Pressable onPress={() => router.push("/admin/post-notice")}>
                  <Text style={styles.seeAllText}>See All</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        // ─── Empty state for posts ───
        ListEmptyComponent={() => (
          <View style={styles.emptyPosts}>
            <Ionicons name="newspaper-outline" size={30} color="#374151" />
            <Text style={styles.emptyPostsText}>No posts yet</Text>
            <Pressable style={styles.emptyPostBtn} onPress={() => router.push("/admin/post-notice")}>
              <Text style={styles.emptyPostBtnText}>Create First Post</Text>
            </Pressable>
          </View>
        )}

        // ─── Each post card ───
        renderItem={({item}) => (
          <PostFeedCard item={item} onLike={handleLike}
            onPress={() => router.push("/admin/post-notice")} />
        )}

        ListFooterComponent={() => <View style={{height:30}} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#080d17" },
  loaderContainer:{ flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#080d17" },

  // Sticky header — outside FlatList, always on top
  header:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingTop:52,paddingBottom:14 },
  headerLeft:{ flexDirection:"row",alignItems:"center",gap:12 },
  adminBadge:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(124,58,237,0.2)",justifyContent:"center",alignItems:"center",borderWidth:1,borderColor:"rgba(167,139,250,0.3)" },
  headerTitle:{ color:"#fff",fontSize:18,fontWeight:"800" },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  logoutBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(248,113,113,0.1)",justifyContent:"center",alignItems:"center" },

  // Feed
  feedContainer:{ paddingHorizontal:16,paddingBottom:30 },

  // Welcome
  welcomeCard:{ borderRadius:20,padding:22,marginTop:14,marginBottom:22,flexDirection:"row",justifyContent:"space-between",alignItems:"center" },
  welcomeHi:{ color:"#fff",fontSize:20,fontWeight:"800",marginBottom:4 },
  welcomeSub:{ color:"rgba(255,255,255,0.7)",fontSize:12,marginBottom:10 },
  adminRoleBadge:{ flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(0,0,0,0.2)",paddingHorizontal:10,paddingVertical:4,borderRadius:20,alignSelf:"flex-start" },
  adminRoleBadgeText:{ color:"#a78bfa",fontSize:9,fontWeight:"800",letterSpacing:1 },

  sectionTitle:{ color:"#64748b",fontSize:12,fontWeight:"700",letterSpacing:0.8,marginBottom:12,marginTop:4,textTransform:"uppercase" },

  // Stats grid — 2 columns
  statsGrid:{ flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:24 },
  statCard:{ width:(width-52)/2,backgroundColor:"#1a2535",borderRadius:14,padding:14,borderLeftWidth:3,position:"relative" },
  statIcon:{ width:36,height:36,borderRadius:10,justifyContent:"center",alignItems:"center",marginBottom:8 },
  statValue:{ fontSize:22,fontWeight:"800" },
  statLabel:{ color:"#64748b",fontSize:11,marginTop:2 },
  statArrow:{ position:"absolute",bottom:12,right:12 },

  // Menu
  menuCard:{ borderRadius:16,overflow:"hidden",marginBottom:10,borderWidth:1,borderColor:"rgba(255,255,255,0.05)" },
  menuGrad:{ flexDirection:"row",alignItems:"center",padding:16,borderRadius:16 },
  menuIcon:{ width:48,height:48,borderRadius:14,justifyContent:"center",alignItems:"center",marginRight:14 },
  menuInfo:{ flex:1 },
  menuLabel:{ color:"#fff",fontSize:15,fontWeight:"700" },
  menuSub:{ color:"#64748b",fontSize:12,marginTop:2 },

  // Posts header row
  postsSectionHeader:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:20,marginBottom:12 },
  seeAllText:{ color:"#a78bfa",fontSize:12,fontWeight:"700" },

  // Post card
  postCard:{ backgroundColor:"#1a2535",borderRadius:18,marginBottom:12,borderWidth:1,borderColor:"rgba(255,255,255,0.05)",overflow:"hidden" },
  postAuthorRow:{ flexDirection:"row",alignItems:"center",padding:14,paddingBottom:10,gap:10 },
  postAvatar:{ width:40,height:40,borderRadius:20,justifyContent:"center",alignItems:"center" },
  postAvatarText:{ fontSize:14,fontWeight:"800" },
  postAuthorInfo:{ flex:1 },
  postAuthorName:{ color:"#fff",fontSize:13,fontWeight:"700" },
  postAuthorMeta:{ flexDirection:"row",alignItems:"center",gap:8,marginTop:2 },
  roleBadge:{ paddingHorizontal:7,paddingVertical:2,borderRadius:6 },
  roleBadgeText:{ fontSize:9,fontWeight:"800",letterSpacing:0.5 },
  postTime:{ color:"#374151",fontSize:11 },
  catBadge:{ paddingHorizontal:9,paddingVertical:3,borderRadius:8 },
  catBadgeText:{ fontSize:10,fontWeight:"700" },
  postCaption:{ color:"#e2e8f0",fontSize:13,lineHeight:20,paddingHorizontal:14,paddingBottom:10 },
  postImage:{ width:"100%",height:200 },
  mediaBanner:{ flexDirection:"row",alignItems:"center",gap:8,marginHorizontal:14,marginBottom:10,backgroundColor:"rgba(255,255,255,0.04)",padding:10,borderRadius:10 },
  mediaBannerText:{ color:"#94a3b8",fontSize:12 },
  postActions:{ flexDirection:"row",gap:20,paddingHorizontal:14,paddingVertical:10,borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.05)" },
  actionBtn:{ flexDirection:"row",alignItems:"center",gap:5 },
  actionCount:{ color:"#64748b",fontSize:13,fontWeight:"600" },

  // Sync banner
  syncBanner:{ borderRadius:14,overflow:"hidden",marginBottom:20,borderWidth:1,borderColor:"rgba(52,211,153,0.2)" },
  syncBannerGrad:{ flexDirection:"row",alignItems:"center",gap:12,padding:14,borderRadius:14 },
  syncBannerTitle:{ color:"#34d399",fontSize:13,fontWeight:"700" },
  syncBannerSub:{ color:"#64748b",fontSize:11,marginTop:2 },

  // Empty posts
  emptyPosts:{ alignItems:"center",paddingVertical:30,gap:10 },
  emptyPostsText:{ color:"#374151",fontSize:13 },
  emptyPostBtn:{ backgroundColor:"rgba(251,146,60,0.08)",paddingHorizontal:16,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:"rgba(251,146,60,0.2)" },
  emptyPostBtnText:{ color:"#fb923c",fontSize:13,fontWeight:"600" },
});