import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, StatusBar, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";

// Role config — color + icon + where to navigate after login
const ROLE_CONFIG = {
  student:       { color: "#00c6ff", icon: "school",           label: "Student",     loggedInKey: "studentLoggedIn",     dataKey: "studentData",     route: "/student/dashboard"      },
  teacher:       { color: "#f59e0b", icon: "person",           label: "Teacher",     loggedInKey: "teacherLoggedIn",     dataKey: "teacherData",     route: "/teacher/dashboard"      },
  admin:         { color: "#a78bfa", icon: "shield-checkmark", label: "Admin",       loggedInKey: "adminLoggedIn",       dataKey: "adminData",       route: "/admin/dashboard"        },
  "super-admin": { color: "#f87171", icon: "star",             label: "Super Admin", loggedInKey: "superAdminLoggedIn",  dataKey: "superAdminData",  route: "/super-admin/dashboard"  },
};

export default function VerifyOtp() {
  const router = useRouter();

  // Get email and role passed from login screen
  const { email, role } = useLocalSearchParams();

  // Get role config — fallback to student if role missing
  const config = ROLE_CONFIG[role] || ROLE_CONFIG["student"];

  const [otp,       setOtp]       = useState(["", "", "", "", "", ""]);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [timer,     setTimer]     = useState(60);
  const inputs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  // Handle OTP box input
  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx]  = val;
    setOtp(newOtp);
    // Auto move to next box
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  // Handle backspace — move to previous box
  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  // Step 2 — Verify OTP → get tokens → go to dashboard
  const handleVerify = async () => {
    const otpStr = otp.join("");
    if (otpStr.length < 6) {
      Alert.alert("Error", "6 digit OTP enter karo");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/login-verify-otp", {
        email,
        otp: otpStr,
      });

      if (res.data.success) {
        const { accessToken, refreshToken, user, role: userRole } = res.data;

        // Save tokens
        await AsyncStorage.setItem("accessToken",  accessToken);
        await AsyncStorage.setItem("refreshToken", refreshToken);

        // Get correct config from actual role returned by backend
        const finalConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG["student"];

        // Save role-specific data
        await AsyncStorage.setItem(finalConfig.dataKey,     JSON.stringify(user));
        await AsyncStorage.setItem(finalConfig.loggedInKey, "true");

        // Navigate to correct dashboard
        router.replace(finalConfig.route);
      }
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "OTP galat hai ya expire ho gaya");
    } finally {
      setLoading(false);
    }
  };

  // Resend — go back to login
  const handleResend = () => {
    Alert.alert(
      "Resend OTP",
      "Wapas login page pe jao aur dobara login karo — naya OTP aayega",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Back button */}
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <View style={styles.body}>

        {/* Role badge — shows which role is logging in */}
        <View style={[styles.roleBadge, {
          backgroundColor: config.color + "18",
          borderColor:     config.color + "40"
        }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[styles.roleText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.sub}>
          OTP bheja gaya hai{"\n"}
          <Text style={{ color: "#a78bfa", fontWeight: "700" }}>{email}</Text>
        </Text>

        {/* OTP input boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={r => inputs.current[i] = r}
              style={[styles.otpBox, digit && { borderColor: config.color }]}
              value={digit}
              onChangeText={v => handleOtpChange(v, i)}
              onKeyPress={e  => handleKeyPress(e, i)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <Pressable
          style={[styles.verifyBtn, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          <LinearGradient
            colors={[config.color, config.color + "aa"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.verifyBtnGrad}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.verifyBtnText}>Verify & Login</Text>
            }
          </LinearGradient>
        </Pressable>

        {/* Resend timer */}
        <View style={styles.resendRow}>
          {timer > 0
            ? <Text style={styles.timerText}>Resend in {timer}s</Text>
            : <Pressable onPress={handleResend} disabled={resending}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </Pressable>
          }
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  backBtn:   { marginTop: 56, marginLeft: 20, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  body:      { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },

  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
  roleText:  { fontSize: 13, fontWeight: "700" },

  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  sub:   { color: "#64748b", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 36 },

  otpRow: { flexDirection: "row", gap: 10, marginBottom: 32 },
  otpBox: { width: 46, height: 56, borderRadius: 14, backgroundColor: "#1a2535", borderWidth: 2, borderColor: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },

  verifyBtn:     { width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 20 },
  verifyBtnGrad: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  verifyBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  resendRow:  { flexDirection: "row", alignItems: "center" },
  timerText:  { color: "#374151", fontSize: 13 },
  resendText: { color: "#a78bfa", fontSize: 13, fontWeight: "700" },
});