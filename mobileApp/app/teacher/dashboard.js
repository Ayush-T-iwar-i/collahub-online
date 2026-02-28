import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, Pressable,
  ActivityIndicator, BackHandler, ToastAndroid,
  StatusBar, ScrollView, FlatList, RefreshControl, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value ?? "—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickCard = ({ icon, label, color, onPress }) => (
  <Pressable onPress={onPress} style={styles.quickCard}>
    <LinearGradient colors={[color + "33", color + "11"]} style={styles.quickGrad}>
      <View style={[styles.quickIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
    </LinearGradient>
  </Pressable>
);

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
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          <Text style={styles.postAvatarText}>{item.author?.name?.[0]?.toUpperCase() || "?"}</Text>
        </View>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{item.author?.name || "Unknown"}</Text>
          <Text style={styles.postTime}>{item.createdAt ? timeAgo(item.createdAt) : ""}</Text>
        </View>
      </View>
      {item.title && <Text style={styles.postTitle}>{item.title}</Text>}
      <Text style={styles.postContent}>{item.content}</Text>
      <View style={styles.postFooter}>
        <View style={styles.postFooterItem}>
          <Ionicons name="heart-outline" size={15} color="#374151" />
          <Text style={styles.postFooterText}>{item.likes?.length || 0}</Text>
        </View>
        <View style={styles.postFooterItem}>
          <Ionicons name="chatbubble-outline" size={15} color="#374151" />
          <Text style={styles.postFooterText}>{item.comments?.length || 0}</Text>
        </View>
      </View>
    </View>
  );
};

export default function TeacherDashboard() {
  const navigation = useNavigation();
  const router = useRouter();
  const [teacherData, setTeacherData] = useState(null);
  const [image, setImage] = useState(null);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const backPressCount = useRef(0);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("teacherLoggedIn");
    if (!token) { router.replace("/(auth)/teacher-login"); return; }

    const raw = await AsyncStorage.getItem("teacherData");
    if (raw) {
      const parsed = JSON.parse(raw);
      setTeacherData(parsed);
      const img = await AsyncStorage.getItem(`profileImage_${parsed.teacherId || parsed.id}`);
      if (img) setImage(img);
    }
    try { const r = await API.get("/dashboard/teacher"); if (r.data) setStats(r.data); } catch (e) {}
    try { const r = await API.get("/api/posts"); setPosts(r.data?.posts || r.data || []); } catch (e) {}
    setCheckingAuth(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    const backAction = () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backPressCount.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp(); return true;
    };
    const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => handler.remove();
  }, []));

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch (e) {}
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "teacherData", "teacherLoggedIn"]);
    router.replace("/");
  };

  if (checkingAuth) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#f59e0b" />
    </View>
  );

  const quickLinks = [
    { icon: "calendar", label: "Attendance", color: "#34d399", route: "/teacher/mark-attendance" },
    { icon: "people",   label: "Students",   color: "#60a5fa", route: "/teacher/students" },
    { icon: "document-text", label: "Assignments", color: "#fb923c", route: "/teacher/assignments" },
    { icon: "person",   label: "Profile",    color: "#a78bfa", route: "/teacher/profile" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      {/* HEADER */}
      <LinearGradient colors={["#0a0f1e", "#1a1500"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CollaHub</Text>
          <Text style={styles.headerSub}>Teacher Portal</Text>
        </View>
        <Pressable onPress={() => router.push("/teacher/profile")}>
          <Image
            source={{ uri: image || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
            style={styles.avatar}
          />
        </Pressable>
      </LinearGradient>

      <FlatList
        data={posts}
        keyExtractor={(item, i) => item._id || i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#f59e0b" />}
        ListHeaderComponent={() => (
          <>
            {/* Welcome */}
            <LinearGradient colors={["#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.welcomeCard}>
              <View>
                <Text style={styles.welcomeHi}>Hello, {teacherData?.name?.split(" ")[0] || "Teacher"} 👨‍🏫</Text>
                <Text style={styles.welcomeSub}>ID: {teacherData?.teacherId || teacherData?.id || "—"}</Text>
                <Text style={styles.welcomeSub} numberOfLines={1}>{teacherData?.college || ""}</Text>
              </View>
              <Ionicons name="school" size={48} color="rgba(0,0,0,0.15)" />
            </LinearGradient>

            {/* Stats */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsRow}>
              <StatCard icon="people"        label="Students"    value={stats?.totalStudents}    color="#f59e0b" />
              <StatCard icon="calendar"      label="Classes"     value={stats?.totalClasses}     color="#34d399" />
              <StatCard icon="document-text" label="Assignments" value={stats?.totalAssignments} color="#60a5fa" />
              <StatCard icon="checkmark-circle" label="Attendance" value={stats?.attendanceMarked} color="#a78bfa" />
            </View>

            {/* Quick Links */}
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickGrid}>
              {quickLinks.map((q, i) => (
                <QuickCard key={i} icon={q.icon} label={q.label} color={q.color} onPress={() => router.push(q.route)} />
              ))}
            </View>

            {/* Feed header */}
            <View style={styles.feedHeaderRow}>
              <Text style={styles.sectionTitle}>Notice Feed</Text>
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
              <Ionicons name="newspaper-outline" size={36} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>No posts yet</Text>
          </View>
        )}
        renderItem={({ item }) => <PostCard item={item} />}
        ListFooterComponent={() => (
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color="#f87171" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#080d17" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "#f59e0b" },
  feedContainer: { paddingHorizontal: 16, paddingBottom: 30 },
  welcomeCard: { borderRadius: 20, padding: 22, marginTop: 14, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcomeHi: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  welcomeSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  sectionTitle: { color: "#cbd5e1", fontSize: 14, fontWeight: "700", marginBottom: 12, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: { width: (width - 52) / 2, backgroundColor: "#1a2535", borderRadius: 14, padding: 14, borderLeftWidth: 3 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 11, marginTop: 2 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  quickCard: { width: (width - 52) / 2, borderRadius: 16, overflow: "hidden" },
  quickGrad: { padding: 20, alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 10, minHeight: 100 },
  quickIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  quickLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  feedHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  feedCount: { backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  feedCountText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
  postCard: { backgroundColor: "#1a2535", borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(245,158,11,0.15)", justifyContent: "center", alignItems: "center", marginRight: 10 },
  postAvatarText: { color: "#f59e0b", fontSize: 15, fontWeight: "800" },
  postAuthorInfo: { flex: 1 },
  postAuthorName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  postTime: { color: "#374151", fontSize: 11, marginTop: 2 },
  postTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  postContent: { color: "#94a3b8", fontSize: 13, lineHeight: 20 },
  postFooter: { flexDirection: "row", gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  postFooterItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  postFooterText: { color: "#374151", fontSize: 12 },
  emptyFeed: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 15, fontWeight: "700" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, padding: 14, backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(248,113,113,0.15)" },
  logoutText: { color: "#f87171", fontWeight: "700", fontSize: 14 },
});