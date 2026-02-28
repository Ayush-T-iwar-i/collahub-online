import React, { useEffect } from "react";
import {
  View, StyleSheet, Dimensions,
  Pressable, StatusBar,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay, withRepeat,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const ROLES = [
  { title: "Student",  icon: "school-outline",        route: "/(auth)/student-login",  colors: ["#0072ff","#00c6ff"], delay: 200 },
  { title: "Teacher",  icon: "person-circle-outline",  route: "/(auth)/teacher-login",  colors: ["#f59e0b","#d97706"], delay: 350 },
  { title: "Admin",    icon: "shield-checkmark-outline",route: "/admin/login",           colors: ["#a78bfa","#7c3aed"], delay: 500 },
];

const RoleButton = ({ title, icon, route, colors, delay, router }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View style={[style, styles.btnWrapper]}>
      <Pressable onPress={() => router.push(route)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.roleBtn}>
          <View style={styles.roleBtnIcon}>
            <Ionicons name={icon} size={22} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.roleBtnText}>{title}</Text>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const fade = useSharedValue(0);
  const slide = useSharedValue(60);
  const bgScale = useSharedValue(1);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 1000 });
    slide.value = withSpring(0, { damping: 15 });
    bgScale.value = withRepeat(withTiming(1.06, { duration: 14000 }), -1, true);
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: slide.value }] }));
  const bgStyle = useAnimatedStyle(() => ({ transform: [{ scale: bgScale.value }] }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Animated BG */}
      <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]}>
        <LinearGradient colors={["#0a0f1e","#0f2744","#0a1628","#050d14"]} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      {/* Glow blobs */}
      <View style={[styles.blob, { top: -60, left: -80, backgroundColor: "rgba(0,114,255,0.12)", width: 250, height: 250 }]} />
      <View style={[styles.blob, { top: height*0.3, right: -80, backgroundColor: "rgba(245,158,11,0.08)", width: 200, height: 200 }]} />
      <View style={[styles.blob, { bottom: 60, left: -60, backgroundColor: "rgba(167,139,250,0.08)", width: 200, height: 200 }]} />

      <Animated.View style={[styles.cardWrapper, cardStyle]}>
        <BlurView intensity={80} tint="dark" style={styles.card}>

          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={32} color="#00c6ff" />
            </View>
            <Text style={styles.title}>COLLAहUB</Text>
            <Text style={styles.subtitle}>Smart College Management Platform</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Choose your role</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Role Buttons */}
          <View style={styles.btnList}>
            {ROLES.map((role) => (
              <RoleButton key={role.title} {...role} router={router} />
            ))}
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Secure · Fast · Reliable</Text>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  blob: { position: "absolute", borderRadius: 200 },
  cardWrapper: { width: width > 500 ? 480 : "92%" },
  card: {
    padding: 36, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  logoArea: { alignItems: "center", marginBottom: 28 },
  logoCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(0,198,255,0.12)",
    borderWidth: 1.5, borderColor: "rgba(0,198,255,0.25)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 36, fontWeight: "900", color: "#fff", letterSpacing: 3 },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 8, textAlign: "center" },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { color: "#374151", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  btnList: { gap: 0 },
  btnWrapper: { marginBottom: 14 },
  roleBtn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 18, gap: 14,
  },
  roleBtnIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  roleBtnText: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  footer: { color: "#1e2d3d", fontSize: 11, textAlign: "center", marginTop: 20, letterSpacing: 1 },
});