import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  BackHandler,
  ToastAndroid,
  StatusBar,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

// ── STAT CARD ──
const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value ?? "—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── POST CARD ──
const PostCard = ({ item }) => {
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isAdmin = item.author?.role === "admin";
  const roleColor = isAdmin ? "#f59e0b" : "#00c6ff";
  const roleLabel = isAdmin ? "Admin" : "Teacher";

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={[styles.postAvatar, { backgroundColor: roleColor + "22" }]}>
          <Text style={[styles.postAvatarText, { color: roleColor }]}>
            {item.author?.name?.[0]?.toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{item.author?.name || "Unknown"}</Text>
          <View style={styles.postMeta}>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
            <Text style={styles.postTime}>
              {item.createdAt ? timeAgo(item.createdAt) : ""}
            </Text>
          </View>
        </View>
      </View>

      {item.title && <Text style={styles.postTitle}>{item.title}</Text>}
      <Text style={styles.postContent}>{item.content}</Text>

      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.postFooter}>
        <View style={styles.postFooterItem}>
          <Ionicons name="heart-outline" size={16} color="#374151" />
          <Text style={styles.postFooterText}>{item.likes?.length || 0}</Text>
        </View>
        <View style={styles.postFooterItem}>
          <Ionicons name="chatbubble-outline" size={16} color="#374151" />
          <Text style={styles.postFooterText}>{item.comments?.length || 0}</Text>
        </View>
        <Ionicons name="share-social-outline" size={16} color="#374151" />
      </View>
    </View>
  );
};

// ── BOTTOM TAB BAR ──
const TABS = [
  { key: "home",       icon: "home",     label: "Home" },
  { key: "attendance", icon: "calendar", label: "Attend.",  route: "/student/attendance" },
  { key: "notes",      icon: "book",     label: "Notes",    route: "/student/notes" },
  { key: "timetable",  icon: "time",     label: "Schedule", route: "/student/timetable" },
  { key: "profile",    icon: "person",   label: "Profile",  route: "/student/profile" },
];

const TabItem = ({ tab, active, onPress }) => (
  <Pressable style={styles.tabItem} onPress={onPress}>
    <Ionicons
      name={active ? tab.icon : tab.icon + "-outline"}
      size={22}
      color={active ? "#00c6ff" : "#374151"}
    />
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
      {tab.label}
    </Text>
    {active && <View style={styles.tabDot} />}
  </Pressable>
);

export default function StudentDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("home");
  const [studentData, setStudentData] = useState(null);
  const [image, setImage] = useState(null);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const backPressCount = useRef(0);

  useFocusEffect(
    useCallback(() => { loadAll(); }, [])
  );

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    const token = await AsyncStorage.getItem("studentLoggedIn");
    if (!token) {
      router.replace("/(auth)/student-login");
      return;
    }

    const raw = await AsyncStorage.getItem("studentData");
    if (raw) {
      const parsed = JSON.parse(raw);
      setStudentData(parsed);
      const img = await AsyncStorage.getItem(`profileImage_${parsed.studentId}`);
      if (img) setImage(img);
    }

    try {
      const res = await API.get("/dashboard/student");
      if (res.data) setStats(res.data);
    } catch (e) {}

    try {
      const res = await API.get("/api/posts");
      setPosts(res.data?.posts || res.data || []);
    } catch (e) {}

    setCheckingAuth(false);
    setRefreshing(false);
  };

  // Double back to exit
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (backPressCount.current === 0) {
          backPressCount.current = 1;
          ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
          setTimeout(() => { backPressCount.current = 0; }, 2000);
          return true;
        }
        BackHandler.exitApp();
        return true;
      };
      const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => handler.remove();
    }, [])
  );

  const handleTabPress = (tab) => {
    if (tab.route) {
      router.push(tab.route);
    } else {
      setActiveTab(tab.key);
    }
  };

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch (e) {}
    await AsyncStorage.multiRemove([
      "accessToken", "refreshToken", "studentData",
      "studentEmail", "studentLoggedIn",
    ]);
    router.replace("/");
  };

  if (checkingAuth) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00c6ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* ── HEADER ── */}
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CollaHub</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {studentData?.department?.split("(")[0]?.trim() || "Student Portal"}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/student/profile")}>
          <Image
            source={{ uri: image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
            style={styles.avatar}
          />
        </Pressable>
      </LinearGradient>

      {/* ── FEED ── */}
      <FlatList
        data={posts}
        keyExtractor={(item, i) => item._id || i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAll(true)}
            tintColor="#00c6ff"
          />
        }

        ListHeaderComponent={() => (
          <>
            {/* Welcome Card */}
            <LinearGradient
              colors={["#0072ff", "#00c6ff"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.welcomeCard}
            >
              <View>
                <Text style={styles.welcomeHi}>
                  Hello, {studentData?.name?.split(" ")[0] || "Student"} 👋
                </Text>
                <Text style={styles.welcomeSub}>ID: {studentData?.studentId || "—"}</Text>
                <Text style={styles.welcomeSub} numberOfLines={1}>
                  {studentData?.college || ""}
                </Text>
              </View>
              <Ionicons name="school" size={48} color="rgba(255,255,255,0.18)" />
            </LinearGradient>

            {/* Stats */}
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.statsRow}>
              <StatCard icon="document-text" label="Submissions" value={stats?.totalSubmissions} color="#00c6ff" />
              <StatCard icon="star"           label="Avg Marks"   value={stats?.averageMarks}     color="#f59e0b" />
              <StatCard icon="trending-up"    label="Highest"     value={stats?.highestMarks}     color="#10b981" />
              <StatCard icon="trophy"         label="Total Marks" value={stats?.totalMarks}       color="#a855f7" />
            </View>

            {/* Feed Header */}
            <View style={styles.feedHeaderRow}>
              <Text style={styles.sectionTitle}>Feed</Text>
              {posts.length > 0 && (
                <View style={styles.feedCount}>
                  <Text style={styles.feedCountText}>{posts.length} posts</Text>
                </View>
              )}
            </View>
          </>
        )}

        ListEmptyComponent={() => (
          <View style={styles.emptyFeed}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="newspaper-outline" size={38} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Posts from teachers & admins will appear here
            </Text>
          </View>
        )}

        renderItem={({ item }) => <PostCard item={item} />}

        ListFooterComponent={() => (
          posts.length > 0
            ? <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={16} color="#f87171" />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
            : null
        )}
      />

      {/* ── BOTTOM TAB BAR ── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            active={activeTab === tab.key && !tab.route}
            onPress={() => handleTabPress(tab)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  loaderContainer: {
    flex: 1, justifyContent: "center",
    alignItems: "center", backgroundColor: "#0f1923",
  },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: "#00c6ff",
  },

  // Feed
  feedContainer: { paddingHorizontal: 16, paddingBottom: 90 },

  // Welcome
  welcomeCard: {
    borderRadius: 20, padding: 22, marginTop: 14, marginBottom: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  welcomeHi: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  welcomeSub: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 2 },

  // Stats
  sectionTitle: {
    color: "#cbd5e1", fontSize: 14, fontWeight: "700",
    marginBottom: 12, letterSpacing: 0.5,
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: {
    width: (width - 52) / 2, backgroundColor: "#1a2535",
    borderRadius: 14, padding: 14, borderLeftWidth: 3,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 11, marginTop: 2 },

  // Feed header row
  feedHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12,
  },
  feedCount: {
    backgroundColor: "rgba(0,198,255,0.1)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  feedCountText: { color: "#00c6ff", fontSize: 11, fontWeight: "700" },

  // Post Card
  postCard: {
    backgroundColor: "#1a2535", borderRadius: 18,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
  },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  postAvatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  postAvatarText: { fontSize: 17, fontWeight: "800" },
  postAuthorInfo: { flex: 1 },
  postAuthorName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  postMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 10, fontWeight: "700" },
  postTime: { color: "#374151", fontSize: 11 },
  postTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  postContent: { color: "#94a3b8", fontSize: 13, lineHeight: 20 },
  postImage: { width: "100%", height: 180, borderRadius: 12, marginTop: 12 },
  postFooter: {
    flexDirection: "row", alignItems: "center",
    gap: 16, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)",
  },
  postFooterItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  postFooterText: { color: "#374151", fontSize: 13 },

  // Empty feed
  emptyFeed: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyIconWrap: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "#1a2535",
    justifyContent: "center", alignItems: "center",
  },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#1f2937", fontSize: 13, textAlign: "center", paddingHorizontal: 30 },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    marginTop: 16, padding: 14,
    backgroundColor: "rgba(248,113,113,0.08)",
    borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(248,113,113,0.15)",
  },
  logoutText: { color: "#f87171", fontWeight: "700", fontSize: 14 },

  // ── BOTTOM TAB BAR ──
  tabBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    backgroundColor: "#111827",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingBottom: 18,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1, alignItems: "center",
    justifyContent: "center", gap: 3,
    position: "relative",
  },
  tabLabel: {
    color: "#374151", fontSize: 10, fontWeight: "600",
  },
  tabLabelActive: { color: "#00c6ff" },
  tabDot: {
    position: "absolute", bottom: -10,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: "#00c6ff",
  },
});