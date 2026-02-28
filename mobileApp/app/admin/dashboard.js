import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, BackHandler, ToastAndroid,
  StatusBar, RefreshControl, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
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

const MenuCard = ({ icon, label, subtitle, color, onPress }) => (
  <Pressable style={styles.menuCard} onPress={onPress}>
    <LinearGradient colors={[color + "22", color + "08"]} style={styles.menuGrad}>
      <View style={[styles.menuIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color + "80"} />
    </LinearGradient>
  </Pressable>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [adminData, setAdminData]   = useState(null);
  const [stats, setStats]           = useState(null);
  const [posts, setPosts]           = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const backPressCount = useRef(0);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("adminLoggedIn");
    if (!token) { router.replace("/admin/login"); return; }
    const raw = await AsyncStorage.getItem("adminData");
    if (raw) setAdminData(JSON.parse(raw));
    try { const r = await API.get("/dashboard/admin"); if (r.data) setStats(r.data); } catch (e) {}
    try { const r = await API.get("/api/posts"); setPosts(r.data?.posts || r.data || []); } catch (e) {}
    setCheckingAuth(false);
    setRefreshing(false);
  };

  // Double back to exit
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
    await AsyncStorage.multiRemove(["accessToken","refreshToken","adminData","adminLoggedIn"]);
    router.replace("/");
  };

  if (checkingAuth) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#a78bfa" />
    </View>
  );

  const menuItems = [
    { icon: "people",          label: "Manage Students",  subtitle: `${stats?.totalStudents || 0} students`,   color: "#00c6ff", route: "/admin/manage-students" },
    { icon: "person",          label: "Manage Teachers",  subtitle: `${stats?.totalTeachers || 0} teachers`,   color: "#f59e0b", route: "/admin/manage-teachers" },
    { icon: "book",            label: "Manage Subjects",  subtitle: `${stats?.totalSubjects || 0} subjects`,   color: "#34d399", route: "/admin/manage-subjects" },
    { icon: "time",            label: "Manage Timetable", subtitle: "Schedule classes",                        color: "#a78bfa", route: "/admin/manage-timetable" },
    { icon: "calendar",        label: "View Attendance",  subtitle: "All attendance records",                  color: "#f87171", route: "/admin/view-attendance" },
    { icon: "megaphone",       label: "Post Notice",      subtitle: "Create announcements",                    color: "#fb923c", route: "/admin/post-notice" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17","#120020"]} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#a78bfa" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSub}>COLLAहUB</Text>
          </View>
        </View>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
        </Pressable>
      </LinearGradient>

      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.label}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#a78bfa" />
        }
        ListHeaderComponent={() => (
          <>
            {/* Welcome Card */}
            <LinearGradient
              colors={["#7c3aed","#a78bfa"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.welcomeCard}
            >
              <View>
                <Text style={styles.welcomeHi}>Hello, {adminData?.name?.split(" ")[0] || "Admin"} 👋 By COLLAहUB</Text>
                <Text style={styles.welcomeSub}>Administrator • COLLAहUB</Text>
                <View style={styles.adminRoleBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#a78bfa" />
                  <Text style={styles.adminRoleBadgeText}>ADMIN ACCESS</Text>
                </View>
              </View>
              <Ionicons name="settings" size={52} color="rgba(255,255,255,0.15)" />
            </LinearGradient>

            {/* Stats */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="people"        label="Students"  value={stats?.totalStudents}  color="#00c6ff" />
              <StatCard icon="person"        label="Teachers"  value={stats?.totalTeachers}  color="#f59e0b" />
              <StatCard icon="book"          label="Subjects"  value={stats?.totalSubjects}  color="#34d399" />
              <StatCard icon="school"        label="Colleges"  value={stats?.totalColleges}  color="#a78bfa" />
            </View>

            <Text style={styles.sectionTitle}>Management</Text>
          </>
        )}
        renderItem={({ item }) => (
          <MenuCard
            icon={item.icon}
            label={item.label}
            subtitle={item.subtitle}
            color={item.color}
            onPress={() => router.push(item.route)}
          />
        )}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            {posts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent Posts</Text>
                {posts.slice(0, 3).map((post, i) => (
                  <View key={i} style={styles.postCard}>
                    <View style={styles.postAvatar}>
                      <Text style={styles.postAvatarText}>{post.author?.name?.[0]?.toUpperCase() || "A"}</Text>
                    </View>
                    <View style={styles.postInfo}>
                      <Text style={styles.postTitle} numberOfLines={1}>{post.title || post.content}</Text>
                      <Text style={styles.postAuthor}>{post.author?.name || "Admin"}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
            <View style={{ height: 30 }} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#080d17" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  adminBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(124,58,237,0.2)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(167,139,250,0.3)" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(248,113,113,0.1)", justifyContent: "center", alignItems: "center" },
  feedContainer: { paddingHorizontal: 16, paddingBottom: 30 },
  welcomeCard: { borderRadius: 20, padding: 22, marginTop: 14, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcomeHi: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  welcomeSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 10 },
  adminRoleBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  adminRoleBadgeText: { color: "#a78bfa", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sectionTitle: { color: "#64748b", fontSize: 12, fontWeight: "700", letterSpacing: 0.8, marginBottom: 12, marginTop: 4, textTransform: "uppercase" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: { width: (width - 52) / 2, backgroundColor: "#1a2535", borderRadius: 14, padding: 14, borderLeftWidth: 3 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 11, marginTop: 2 },
  menuCard: { borderRadius: 16, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  menuGrad: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16 },
  menuIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuInfo: { flex: 1 },
  menuLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  menuSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  footer: { marginTop: 8 },
  postCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(167,139,250,0.15)", justifyContent: "center", alignItems: "center" },
  postAvatarText: { color: "#a78bfa", fontSize: 14, fontWeight: "800" },
  postInfo: { flex: 1 },
  postTitle: { color: "#fff", fontSize: 13, fontWeight: "600" },
  postAuthor: { color: "#64748b", fontSize: 11, marginTop: 2 },
});