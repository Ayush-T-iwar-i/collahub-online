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

export default function TeacherLogin() {
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

  // ✅ Teacher Login → Back = Landing page
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
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    try {
      setLoading(true);
      const response = await API.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const data = response.data;
      if (data.accessToken)  await AsyncStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) await AsyncStorage.setItem("refreshToken", data.refreshToken);
      if (data.user) {
        await AsyncStorage.setItem("teacherData", JSON.stringify(data.user));
        await AsyncStorage.setItem("teacherEmail", data.user.email);
      }
      await AsyncStorage.setItem("teacherLoggedIn", "true");
      router.replace("/teacher/dashboard");
    } catch (error) {
      Alert.alert("Login Failed", error.response?.data?.message || "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0f1e" }}>
      <StatusBar barStyle="light-content" />

      {/* Animated gradient background */}
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedBgStyle]}>
        <LinearGradient
          colors={["#0a0f1e", "#1a1200", "#0a0f1e"]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Glow blobs */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <Animated.View style={[styles.container, animatedCardStyle]}>
        <BlurView intensity={80} tint="dark" style={styles.card}>

          {/* Logo */}
          <Animated.View style={[styles.logoArea, animatedTitleStyle]}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-circle-outline" size={34} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Teacher Login</Text>
            <Text style={styles.subtitle}>Welcome back to CollaHub</Text>
          </Animated.View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              placeholder="Email address"
              placeholderTextColor="#555"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#555"
              style={[styles.input, { flex: 1 }]}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
            </Pressable>
          </View>

          {/* Forgot */}
          <Pressable onPress={() => router.push("/teacher/forgot")} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          {/* Login Button */}
          <Pressable style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={["#f59e0b", "#d97706"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginText}>Login</Text>
              }
            </LinearGradient>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register */}
          <Pressable onPress={() => router.push("/teacher/register")} style={styles.registerBtn}>
            <Text style={styles.registerText}>
              Don't have an account?{" "}
              <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </Pressable>

        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center",
    alignItems: "center", paddingHorizontal: 20,
  },
  glow1: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(245,158,11,0.07)", top: -100, right: -80,
  },
  glow2: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(217,119,6,0.05)", bottom: 60, left: -60,
  },
  card: {
    width: width > 500 ? 460 : "100%", padding: 32, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden",
  },
  logoArea: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(245,158,11,0.12)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
  },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14, marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, color: "#fff", fontSize: 15 },
  eyeBtn: { padding: 4 },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotText: { color: "#f59e0b", fontSize: 13 },
  loginBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 20 },
  loginGradient: { paddingVertical: 16, alignItems: "center", borderRadius: 14 },
  loginText: { color: "#fff", fontWeight: "700", fontSize: 17, letterSpacing: 0.5 },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { color: "#374151", marginHorizontal: 12, fontSize: 13 },
  registerBtn: { alignItems: "center" },
  registerText: { color: "#64748b", fontSize: 14 },
  registerLink: { color: "#f59e0b", fontWeight: "700" },
});