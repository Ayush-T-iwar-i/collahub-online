import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import API from "../services/api";

const ROLE_CONFIG = {
  student:      { color: "#00c6ff", icon: "school",            label: "Student"     },
  teacher:      { color: "#f59e0b", icon: "person",            label: "Teacher"     },
  admin:        { color: "#a78bfa", icon: "shield-checkmark",  label: "Admin"       },
  "super-admin":{ color: "#f87171", icon: "star",              label: "Super Admin" },
};

export default function LoginScreen() {
  const router = useRouter();
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus,  setPassFocus]  = useState(false);

  // Step 1 — Email + Password check → OTP bhejo
  const handleLogin = async () => {
    const trimEmail = email.trim().toLowerCase();
    const trimPass  = password.trim();

    if (!trimEmail || !trimPass) {
      Alert.alert("Error", "Email aur password dono required hain");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/login", {
        email:    trimEmail,
        password: trimPass,
      });

      if (res.data.success) {
        const role = res.data.role; // Backend se role aata hai

        // OTP screen pe bhejo — email aur role saath mein
        router.push({
          pathname: "/verify-otp",
          params: {
            email: trimEmail,
            role:  role || "student",
          },
        });
      }
    } catch (e) {
      const msg = e.response?.data?.message || "Login failed. Check email/password.";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient colors={["#7c3aed", "#a78bfa"]} style={styles.logoCircle}>
              <Text style={styles.logoText}>C</Text>
            </LinearGradient>
            <Text style={styles.appName}>COLLAहUB</Text>
            <Text style={styles.appTagline}>One Nims One World</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back 👋</Text>
            <Text style={styles.cardSub}>Please enter your login credentials.</Text>

            {/* Email Input */}
            <View style={[styles.inputWrap, emailFocus && styles.inputWrapFocus]}>
              <Ionicons name="mail-outline" size={18} color={emailFocus ? "#a78bfa" : "#64748b"} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#4a5568"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocus(true)}
                onBlur={()  => setEmailFocus(false)}
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputWrap, passFocus && styles.inputWrapFocus]}>
              <Ionicons name="lock-closed-outline" size={18} color={passFocus ? "#a78bfa" : "#64748b"} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#4a5568"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                onFocus={() => setPassFocus(true)}
                onBlur={()  => setPassFocus(false)}
              />
              <Pressable onPress={() => setShowPass(!showPass)}>
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={18} color="#64748b"
                />
              </Pressable>
            </View>

            {/* Forgot Password */}
            <Pressable
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotWrap}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

            {/* Login Button */}
            <Pressable
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={["#7c3aed", "#a78bfa"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.loginBtnGrad}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Text style={styles.loginBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                }
              </LinearGradient>
            </Pressable>

            {/* Role Info */}
            <View style={styles.roleInfoWrap}>
              <Text style={styles.roleInfoTitle}>SUPPORTED ROLES</Text>
              <View style={styles.roleRow}>
                {Object.values(ROLE_CONFIG).map(r => (
                  <View key={r.label} style={styles.roleChip}>
                    <Ionicons name={r.icon} size={13} color={r.color} />
                    <Text style={[styles.roleChipText, { color: r.color }]}>{r.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

<Text style={styles.footer}>COLLAहUB © 2026 {"\n"}Developed by Ayush Tiwari</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#080d17" },
  scroll:     { flexGrow: 1, justifyContent: "center", padding: 24, paddingTop: 60 },

  logoWrap:   { alignItems: "center", marginBottom: 36 },
  logoCircle: { width: 72, height: 72, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  logoText:   { color: "#fff", fontSize: 36, fontWeight: "900" },
  appName:    { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: 1 },
  appTagline: { color: "#64748b", fontSize: 12, marginTop: 4 },

  card:       { backgroundColor: "#111827", borderRadius: 30, padding: 24, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.81)" },
  cardTitle:  { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  cardSub:    { color: "#64748b", fontSize: 13, marginBottom: 24 },

  inputWrap:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1a2535", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  inputWrapFocus: { borderColor: "#a78bfa" },
  input:          { flex: 1, color: "#fff", fontSize: 14 },

  forgotWrap: { alignSelf: "flex-end", marginBottom: 22 },
  forgotText: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },

  loginBtn:     { borderRadius: 14, overflow: "hidden", marginBottom: 24 },
  loginBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  roleInfoWrap:  { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingTop: 18 },
  roleInfoTitle: { color: "#374151", fontSize: 11, fontWeight: "700", textAlign: "center", marginBottom: 12, letterSpacing: 0.5 },
  roleRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  roleChip:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#1a2535", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleChipText:  { fontSize: 11, fontWeight: "700" },

  footer: { color: "#a2bde3", fontSize: 11, textAlign: "center", marginTop: 24 },
});