import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

// ── Single animated menu item ──
const MenuItem = ({ icon, label, accent, onPress, index }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 300,
        delay: index * 50, useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0, speed: 14,
        bounciness: 4, delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ scale }, { translateX }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={({ pressed }) => [
          styles.menuItem,
          pressed && { backgroundColor: accent + "15" },
        ]}
      >
        <View style={[styles.menuIconWrap, { backgroundColor: accent + "20" }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
        <View style={[styles.menuChevronWrap]}>
          <Ionicons name="chevron-forward" size={13} color="#1f2937" />
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ── Section divider ──
const SectionLabel = ({ label }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

export default function CustomDrawer(props) {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [localImage, setLocalImage] = useState(null);

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const data = await AsyncStorage.getItem("studentData");
          if (data) {
            const parsed = JSON.parse(data);
            setStudent(parsed);
            const img = await AsyncStorage.getItem(`profileImage_${parsed.studentId}`);
            setLocalImage(img || null);
          }
        } catch (e) {
          console.log("Drawer error:", e);
        }
      };
      loadData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "accessToken", "refreshToken",
              "studentData", "studentEmail", "studentLoggedIn",
            ]);
            router.replace("/(auth)/student-login");
          },
        },
      ]
    );
  };

  const imageSource =
    localImage || student?.profileImage ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const mainMenu = [
    { icon: "home",              label: "Dashboard",     route: "/student/dashboard",     accent: "#00c6ff" },
    { icon: "person",            label: "Profile",       route: "/student/profile",       accent: "#a78bfa" },
    { icon: "calendar",          label: "Attendance",    route: "/student/attendance",    accent: "#34d399" },
    { icon: "book",              label: "Notes",         route: "/student/notes",         accent: "#fbbf24" },
    { icon: "time",              label: "Timetable",     route: "/student/timetable",     accent: "#f87171" },
  ];

  const academicMenu = [
    { icon: "bar-chart",         label: "Results",       route: "/student/result",        accent: "#60a5fa" },
    { icon: "document-text",     label: "Assignments",   route: "/student/assignments",   accent: "#fb923c" },
    { icon: "notifications",     label: "Notifications", route: "/student/notifications", accent: "#f472b6" },
  ];

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1], outputRange: [-20, 0],
  });

  // Get initials
  const initials = student?.name
    ?.split(" ").slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase() || "S";

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: "transparent" }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>

        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerTranslateY }],
        }]}>
          <LinearGradient
            colors={["#0a1628", "#0f2744", "#091520"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Decorative glow */}
          <View style={styles.headerGlow} />

          {/* Profile button */}
          <Pressable
            onPress={() => router.push("/student/profile")}
            style={styles.avatarArea}
          >
            <View style={styles.avatarRing}>
              <Image source={{ uri: imageSource }} style={styles.avatar} />
            </View>

            {/* Online dot */}
            <View style={styles.onlineDot} />

            {/* Initial fallback overlay (invisible when image loads) */}
          </Pressable>

          {/* Name */}
          <Text style={styles.name} numberOfLines={1}>
            {student?.name || "Student"}
          </Text>
          <Text style={styles.studentId} numberOfLines={1}>
            {student?.studentId || "ID: —"}
          </Text>

          {/* Info badges */}
          <View style={styles.badges}>
            {student?.department && (
              <View style={[styles.badge, { backgroundColor: "rgba(0,198,255,0.12)", borderColor: "rgba(0,198,255,0.2)" }]}>
                <Ionicons name="school-outline" size={10} color="#00c6ff" />
                <Text style={[styles.badgeText, { color: "#00c6ff" }]} numberOfLines={1}>
                  {student.department.split("(")[0].trim().split(" ").slice(0, 2).join(" ")}
                </Text>
              </View>
            )}
            {student?.admissionYear && (
              <View style={[styles.badge, { backgroundColor: "rgba(167,139,250,0.12)", borderColor: "rgba(167,139,250,0.2)" }]}>
                <Ionicons name="calendar-outline" size={10} color="#a78bfa" />
                <Text style={[styles.badgeText, { color: "#a78bfa" }]}>
                  {student.admissionYear}
                </Text>
              </View>
            )}
          </View>

          {/* College */}
          {student?.college && (
            <Text style={styles.college} numberOfLines={1}>
              🏫 {student.college}
            </Text>
          )}
        </Animated.View>

        {/* ── MENU ── */}
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

        {/* ── DIVIDER ── */}
        <View style={styles.divider} />

        {/* ── LOGOUT ── */}
        <Pressable onPress={handleLogout} style={({ pressed }) => [
          styles.logoutBtn,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}>
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={18} color="#f87171" />
          </View>
          <Text style={styles.logoutLabel}>Logout</Text>
          <Ionicons name="chevron-forward" size={13} color="#7f1d1d" />
        </Pressable>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>CollaHub v1.0.0</Text>
          </View>
        </View>

      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080d17",
  },

  // Header
  header: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0,198,255,0.06)",
    top: -80, left: -40,
  },
  avatarArea: {
    position: "relative",
    marginBottom: 14,
  },
  avatarRing: {
    width: 86, height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: "#00c6ff",
    padding: 3,
    overflow: "hidden",
    backgroundColor: "#0f2744",
  },
  avatar: {
    width: "100%", height: "100%",
    borderRadius: 40,
  },
  onlineDot: {
    position: "absolute",
    bottom: 3, right: 3,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: "#34d399",
    borderWidth: 2.5,
    borderColor: "#080d17",
  },
  name: {
    color: "#f1f5f9",
    fontSize: 18, fontWeight: "800",
    letterSpacing: 0.2,
  },
  studentId: {
    color: "#475569",
    fontSize: 12,
    marginTop: 4, marginBottom: 14,
  },
  badges: {
    flexDirection: "row",
    gap: 8, flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    maxWidth: 140,
  },
  badgeText: {
    fontSize: 10, fontWeight: "700",
  },
  college: {
    color: "#334155",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },

  // Menu
  menuSection: { padding: 16, paddingTop: 18 },
  sectionLabel: {
    color: "#1e2d3d",
    fontSize: 9, fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8, marginTop: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 14, marginBottom: 3,
  },
  menuIconWrap: {
    width: 36, height: 36,
    borderRadius: 11,
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1, color: "#94a3b8",
    fontSize: 14, fontWeight: "600",
  },
  menuChevronWrap: { paddingLeft: 4 },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginHorizontal: 16,
    marginBottom: 14,
  },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.07)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.12)",
    marginBottom: 8,
  },
  logoutIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.14)",
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  logoutLabel: {
    flex: 1, color: "#f87171",
    fontSize: 14, fontWeight: "700",
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingBottom: 24, paddingTop: 8,
  },
  footerBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  footerDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#34d399",
  },
  footerText: {
    color: "#1e2d3d", fontSize: 11, fontWeight: "600",
  },
});