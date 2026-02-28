import React, { useEffect, useState, useCallback } from "react";
import {
  View, StyleSheet, TextInput, Pressable,
  StatusBar, Dimensions, Alert, ActivityIndicator, BackHandler,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";

const { width } = Dimensions.get("window");

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(50);
  const scale      = useSharedValue(1);
  const titleScale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value    = withTiming(1, { duration: 900 });
    translateY.value = withSpring(0, { damping: 15 });
    titleScale.value = withSpring(1, { damping: 12 });
    scale.value      = withRepeat(withTiming(1.08, { duration: 12000 }), -1, true);
  }, []);

  const animatedCardStyle  = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
  const animatedBgStyle    = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const animatedTitleStyle = useAnimatedStyle(() => ({ transform: [{ scale: titleScale.value }] }));

  // Back → Landing
  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/");
        return true;
      });
      return () => handler.remove();
    }, [])
  );

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Please enter email and password");
    try {
      setLoading(true);
      const res = await API.post("/auth/login", {
        email: email.trim().toLowerCase(), password,
      });
      const data = res.data;
      if (data.accessToken)  await AsyncStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) await AsyncStorage.setItem("refreshToken", data.refreshToken);
      if (data.user) {
        await AsyncStorage.setItem("adminData", JSON.stringify(data.user));
        if (data.user.role !== "admin") {
          Alert.alert("Access Denied", "This account is not an admin account.");
          return;
        }
      }
      await AsyncStorage.setItem("adminLoggedIn", "true");
      router.replace("/admin/dashboard");
    } catch (e) {
      Alert.alert("Login Failed", e.response?.data?.message || "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a1a" }}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[StyleSheet.absoluteFillObject, animatedBgStyle]}>
        <LinearGradient colors={["#0a0a1a","#1a0030","#0a0a1a"]} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      {/* Glow blobs */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <Animated.View style={[styles.container, animatedCardStyle]}>
        <BlurView intensity={80} tint="dark" style={styles.card}>

          <Animated.View style={[styles.logoArea, animatedTitleStyle]}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={32} color="#a78bfa" />
            </View>
            <Text style={styles.title}>Admin Panel</Text>
            <Text style={styles.subtitle}>CollaHub Administration</Text>
          </Animated.View>

          {/* Warning badge */}
          <View style={styles.warningBadge}>
            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
            <Text style={styles.warningText}>Restricted access — Admins only</Text>
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              placeholder="Admin email" placeholderTextColor="#555"
              style={styles.input} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              placeholder="Password" placeholderTextColor="#555"
              style={[styles.input, { flex: 1 }]}
              secureTextEntry={!showPassword} value={password} onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
            </Pressable>
          </View>
          

          {/* Forgot */}
          <Pressable onPress={() => router.push("/admin/forgot")} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          

          {/* Login Button */}
          <Pressable style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={["#7c3aed","#a78bfa"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="shield-checkmark-outline" size={18} color="#fff" /><Text style={styles.loginText}>Login as Admin</Text></>
              }
            </LinearGradient>
          </Pressable>
          {/* Divider */}
<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
  <Text style={{ color: "#64748b", fontSize: 12, marginHorizontal: 10 }}>or</Text>
  <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
</View>

{/* Register Link */}
<Pressable onPress={() => router.push("/admin/register")} style={{ alignItems: "center", marginBottom: 20 }}>
  <Text style={{ color: "#64748b", fontSize: 14 }}>
    Don’t have an account?{" "}
    <Text style={{ color: "#a78bfa", fontWeight: "700" }}>Register</Text>
  </Text>
</Pressable>

          <Pressable onPress={() => router.replace("/")} style={styles.backLink}>
            <Ionicons name="arrow-back" size={14} color="#64748b" />
            <Text style={styles.backLinkText}>Back to Home</Text>
          </Pressable>

        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  glow1: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(124,58,237,0.08)", top: -80, right: -60 },
  glow2: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(167,139,250,0.05)", bottom: 60, left: -60 },
  card: { width: width > 500 ? 460 : "100%", padding: 32, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  logoArea: { alignItems: "center", marginBottom: 24 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(124,58,237,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 14, borderWidth: 1, borderColor: "rgba(167,139,250,0.3)" },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  warningBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.1)", padding: 10, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  warningText: { color: "#f59e0b", fontSize: 12, fontWeight: "600" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, color: "#fff", fontSize: 15 },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotText: { color: "#a78bfa", fontSize: 13 },
  loginBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 20 },
  loginGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  loginText: { color: "#fff", fontWeight: "700", fontSize: 17, letterSpacing: 0.5 },
  backLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  backLinkText: { color: "#64748b", fontSize: 13 },
});