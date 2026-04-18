// app/student/dashboard.js
import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable,
  ActivityIndicator, BackHandler, ToastAndroid,
  StatusBar, FlatList, RefreshControl, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";
import SafeImage from "../../components/SafeImage";
import PostCard from "../teacher/components/PostCard";

const { width } = Dimensions.get("window");

const StatCard = ({ icon, label, value, color }) => (
  <View style={s.statCard}>
    <View style={[s.statIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[s.statValue, { color }]}>{value ?? "—"}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const TABS = [
  { key: "home",       icon: "home",     label: "Home" },
  { key: "attendance", icon: "calendar", label: "Attend.",  route: "/student/attendance" },
  { key: "notes",      icon: "book",     label: "Notes",    route: "/student/notes" },
  { key: "timetable",  icon: "time",     label: "Schedule", route: "/student/timetable" },
  { key: "profile",    icon: "person",   label: "Profile",  route: "/student/profile" },
];

export default function StudentDashboard() {
  const navigation = useNavigation();
  const router     = useRouter();
  const [activeTab,    setActiveTab]    = useState("home");
  const [studentData,  setStudentData]  = useState(null);
  const [image,        setImage]        = useState(null);
  const [stats,        setStats]        = useState(null);
  const [posts,        setPosts]        = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const backRef = useRef(0);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("studentLoggedIn");
    if (!token) { router.replace("/login"); return; }
    const raw = await AsyncStorage.getItem("studentData");
    if (raw) {
      const d = JSON.parse(raw);
      setStudentData(d);
      if (d.profileImage) setImage(d.profileImage);
    }
    try {
      const [me, st, po] = await Promise.allSettled([
        API.get("/student/me"),
        API.get("/dashboard/student"),
        API.get("/api/posts"),
      ]);
      if (me.status === "fulfilled" && me.value.data?.student) {
        const f = me.value.data.student;
        setStudentData(f);
        if (f.profileImage) setImage(f.profileImage);
        await AsyncStorage.setItem("studentData", JSON.stringify(f));
      }
      if (st.status === "fulfilled") setStats(st.value.data);
      if (po.status === "fulfilled") setPosts(po.value.data?.posts || po.value.data || []);
    } catch {}
    setCheckingAuth(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backRef.current === 0) {
        backRef.current = 1;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backRef.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp(); return true;
    });
    return () => h.remove();
  }, []));

  const handleLike = (id, liked, count) => {
    setPosts(prev => prev.map(p => p._id === id ? { ...p, isLiked: liked, likeCount: count } : p));
  };

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "studentData", "studentLoggedIn"]);
    router.replace("/");
  };

  const ini = studentData?.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "S";
  const sectionLabel = (() => {
    if (studentData?.section) return `Section ${studentData.section}`;
    const short = studentData?.department?.match(/\(([^)]+)\)/)?.[1] || studentData?.department?.split(" ")[0];
    return short ? `${short} ${studentData.admissionYear}` : null;
  })();

  if (checkingAuth) return (
    <View style={s.loader}><ActivityIndicator size="large" color="#00c6ff" /></View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={s.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={s.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={s.headerCtr}>
          <Text style={s.headerTitle}>CollaHub</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {studentData?.department?.split("(")[0]?.trim() || "Student Portal"}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/student/profile")}>
          <SafeImage uri={image} size={40} initials={ini} color="#00c6ff"
            style={{ borderWidth: 2, borderColor: "#00c6ff" }} />
        </Pressable>
      </LinearGradient>

      <FlatList
        data={posts}
        keyExtractor={(item, i) => item._id || i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.feed}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#00c6ff" />
        }
        ListHeaderComponent={() => (
          <>
            <LinearGradient colors={["#0072ff", "#00c6ff"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.welcomeCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.welcomeHi}>Hello, {studentData?.name?.split(" ")[0] || "Student"} 👋</Text>
                <Text style={s.welcomeSub}>ID: {studentData?.studentId || "—"}</Text>
                <Text style={s.welcomeSub} numberOfLines={1}>{studentData?.college || ""}</Text>
                <View style={s.badgesRow}>
                  {studentData?.semester && (
                    <View style={s.badge}>
                      <Ionicons name="layers" size={11} color="#fff" />
                      <Text style={s.badgeText}>Semester {studentData.semester}</Text>
                    </View>
                  )}
                  {sectionLabel && (
                    <View style={s.badge}>
                      <Ionicons name="people" size={11} color="rgba(255,255,255,0.85)" />
                      <Text style={s.badgeText}>{sectionLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="school" size={48} color="rgba(255,255,255,0.18)" />
            </LinearGradient>

            <Text style={s.sectionTitle}>Performance</Text>
            <View style={s.statsRow}>
              <StatCard icon="document-text" label="Submissions" value={stats?.totalSubmissions} color="#00c6ff" />
              <StatCard icon="star"           label="Avg Marks"   value={stats?.averageMarks}     color="#f59e0b" />
              <StatCard icon="trending-up"    label="Highest"     value={stats?.highestMarks}     color="#10b981" />
              <StatCard icon="trophy"         label="Total Marks" value={stats?.totalMarks}       color="#a855f7" />
            </View>

            <View style={s.feedHeaderRow}>
              <Text style={s.sectionTitle}>Feed</Text>
              {posts.length > 0 && (
                <View style={s.feedCountBadge}>
                  <Text style={s.feedCountText}>{posts.length} posts</Text>
                </View>
              )}
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="newspaper-outline" size={38} color="#374151" />
            </View>
            <Text style={s.emptyTitle}>No posts yet</Text>
            <Text style={s.emptySub}>Posts from teachers and admins will appear here</Text>
          </View>
        )}
        renderItem={({ item }) => <PostCard item={item} onLike={handleLike} />}
        ListFooterComponent={() =>
          posts.length > 0 ? (
            <Pressable style={s.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#f87171" />
              <Text style={s.logoutText}>Logout</Text>
            </Pressable>
          ) : null
        }
      />

      <View style={s.tabBar}>
        {TABS.map(tab => {
          const active = activeTab === tab.key && !tab.route;
          return (
            <Pressable key={tab.key} style={s.tabItem}
              onPress={() => tab.route ? router.push(tab.route) : setActiveTab(tab.key)}>
              <Ionicons
                name={active ? tab.icon : tab.icon + "-outline"}
                size={22} color={active ? "#00c6ff" : "#374151"}
              />
              <Text style={[s.tabLabel, active && { color: "#00c6ff" }]}>{tab.label}</Text>
              {active && <View style={s.tabDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#0f1923" },
  loader:        { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f1923" },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  menuBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCtr:     { flex: 1, alignItems: "center" },
  headerTitle:   { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub:     { color: "#64748b", fontSize: 11, marginTop: 2 },
  feed:          { paddingHorizontal: 16, paddingBottom: 90 },
  welcomeCard:   { borderRadius: 20, padding: 22, marginTop: 14, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcomeHi:     { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  welcomeSub:    { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 2 },
  badgesRow:     { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  badge:         { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText:     { color: "#fff", fontSize: 11, fontWeight: "700" },
  sectionTitle:  { color: "#cbd5e1", fontSize: 14, fontWeight: "700", marginBottom: 12 },
  statsRow:      { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard:      { width: (width - 52) / 2, backgroundColor: "#1a2535", borderRadius: 14, padding: 14 },
  statIcon:      { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue:     { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel:     { color: "#64748b", fontSize: 11, marginTop: 2 },
  feedHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  feedCountBadge:{ backgroundColor: "rgba(0,198,255,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  feedCountText: { color: "#00c6ff", fontSize: 11, fontWeight: "700" },
  empty:         { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyIcon:     { width: 76, height: 76, borderRadius: 38, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle:    { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub:      { color: "#1f2937", fontSize: 13, textAlign: "center", paddingHorizontal: 30 },
  logoutBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, padding: 14, backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(248,113,113,0.15)" },
  logoutText:    { color: "#f87171", fontWeight: "700", fontSize: 14 },
  tabBar:        { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", backgroundColor: "#111827", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingBottom: 18, paddingTop: 10 },
  tabItem:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, position: "relative" },
  tabLabel:      { color: "#374151", fontSize: 10, fontWeight: "600" },
  tabDot:        { position: "absolute", bottom: -10, width: 4, height: 4, borderRadius: 2, backgroundColor: "#00c6ff" },
});