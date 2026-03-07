import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, Image, Pressable,
  Alert, Animated, Dimensions,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const MenuItem = ({ icon, label, accent, onPress, index }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, speed: 14, bounciness: 4, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }, { translateX }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: accent + "15" }]}
      >
        <View style={[styles.menuIconWrap, { backgroundColor: accent + "20" }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={13} color="#1f2937" />
      </Pressable>
    </Animated.View>
  );
};

const SectionLabel = ({ label }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

export default function TeacherDrawer(props) {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);
  const [localImage, setLocalImage] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const data = await AsyncStorage.getItem("teacherData");
          if (data) {
            const parsed = JSON.parse(data);
            setTeacher(parsed);
            const idKey = parsed.teacherId || parsed.id;
            const img = await AsyncStorage.getItem(`profileImage_${idKey}`);
            setLocalImage(img || null);
          }
        } catch (e) {
          console.log("Teacher Drawer error:", e);
        }
      };
      loadData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          await AsyncStorage.multiRemove([
            "accessToken", "refreshToken",
            "teacherData", "teacherEmail", "teacherLoggedIn",
          ]);
          router.replace("/(auth)/teacher-login");
        },
      },
    ]);
  };

  const imageSource = localImage || teacher?.profileImage
    || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const mainMenu = [
    { icon: "home", label: "Dashboard", route: "/teacher/dashboard", accent: "#f59e0b" },
    { icon: "person", label: "Profile", route: "/teacher/profile", accent: "#a78bfa" },
    { icon: "calendar", label: "Mark Attendance", route: "/teacher/mark-attendance", accent: "#34d399" },
    // ✅ FIXED — was "/teacher/students", now correct route
    { icon: "people", label: "Students", route: "/teacher/teacher-students", accent: "#60a5fa" },
    // ✅ NAYI — Timetable add kiya
    { icon: "time", label: "My Timetable", route: "/teacher/timetable", accent: "#f87171" },
  ];

  const academicMenu = [
    { icon: "document-text", label: "Assignments", route: "/teacher/assignments", accent: "#fb923c" },
    { icon: "notifications", label: "Notifications", route: "/teacher/notifications", accent: "#f472b6" },
  ];

  const initials = teacher?.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "T";

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: "transparent" }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <LinearGradient
            colors={["#0a1628", "#1a1500", "#091520"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Pressable onPress={() => router.push("/teacher/profile")} style={styles.avatarArea}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: imageSource }} style={styles.avatar} />
            </View>
            <View style={styles.onlineDot} />
          </Pressable>
          <Text style={styles.name} numberOfLines={1}>{teacher?.name || "Teacher"}</Text>
          <Text style={styles.teacherId}                   >{teacher?.teacherId || "ID: —"}</Text>
          {teacher?.department && (
            <View style={styles.deptBadge}>
              <Ionicons name="school-outline" size={10} color="#f59e0b" />
              <Text style={styles.deptBadgeText} numberOfLines={1}>
                {teacher.department?.match(/\(([^)]+)\)/)?.[1] || teacher.department?.split(" ")[0]}
              </Text>
            </View>
          )}
          {teacher?.college && (
            <Text style={styles.college} numberOfLines={1}>🏫 {teacher.college}</Text>
          )}
        </View>

        {/* ── Menu ── */}
        <View style={styles.menuSection}>
          <SectionLabel label="MAIN" />
          {mainMenu.map((item, i) => (
            <MenuItem
              key={item.route}
              index={i}
              icon={item.icon}
              label={item.label}
              accent={item.accent}
              onPress={() => router.push(item.route)}
            />
          ))}

          <SectionLabel label="ACADEMIC" />
          {academicMenu.map((item, i) => (
            <MenuItem
              key={item.route}
              index={i + mainMenu.length}
              icon={item.icon}
              label={item.label}
              accent={item.accent}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>

        <View style={styles.divider} />

        {/* ── Logout ── */}
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={18} color="#f87171" />
          </View>
          <Text style={styles.logoutLabel}>Logout</Text>
          <Ionicons name="chevron-forward" size={13} color="#7f1d1d" />
        </Pressable>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>COLLAहUB v1.0.0</Text>
          </View>
        </View>

      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  header: { padding: 24, paddingTop: 50, paddingBottom: 24, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", overflow: "hidden" },
  avatarArea: { position: "relative", marginBottom: 14 },
  avatarRing: { width: 86, height: 86, borderRadius: 43, borderWidth: 2.5, borderColor: "#f59e0b", padding: 3, overflow: "hidden", backgroundColor: "#0f2744" },
  avatar: { width: "100%", height: "100%", borderRadius: 40 },
  onlineDot: { position: "absolute", bottom: 3, right: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: "#34d399", borderWidth: 2.5, borderColor: "#080d17" },
  name: { color: "#f1f5f9", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  teacherId: { color: "#475569", fontSize: 12, marginTop: 4, marginBottom: 6 },
  deptBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  deptBadgeText: { color: "#f59e0b", fontSize: 10, fontWeight: "700" },
  college: { color: "#334155", fontSize: 11, textAlign: "center" },
  menuSection: { padding: 16, paddingTop: 18 },
  sectionLabel: { color: "#1e2d3d", fontSize: 9, fontWeight: "800", letterSpacing: 2, marginBottom: 8, marginTop: 8, marginLeft: 4 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, marginBottom: 3 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuLabel: { flex: 1, color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginHorizontal: 16, marginBottom: 14 },
  logoutBtn: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, padding: 14, borderRadius: 14, backgroundColor: "rgba(239,68,68,0.07)", borderWidth: 1, borderColor: "rgba(239,68,68,0.12)", marginBottom: 8 },
  logoutIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(239,68,68,0.14)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  logoutLabel: { flex: 1, color: "#f87171", fontSize: 14, fontWeight: "700" },
  footer: { alignItems: "center", paddingBottom: 24, paddingTop: 8 },
  footerBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" },
  footerText: { color: "#1e2d3d", fontSize: 11, fontWeight: "600" },
});