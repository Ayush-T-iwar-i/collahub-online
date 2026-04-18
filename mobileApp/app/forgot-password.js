import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, StatusBar, Alert, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import API from "../services/api";

export default function ForgotPassword() {
  const router = useRouter();
  const [step,        setStep]        = useState(1); // 1=email, 2=otp+newpass
  const [email,       setEmail]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) { Alert.alert("Error", "Please enter email"); return; }
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      Alert.alert("OTP Sent", "Check your email for OTP");
      setStep(2);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!otp.trim() || !newPassword.trim()) {
      Alert.alert("Error", "Both OTP and new password are required");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await API.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });
      Alert.alert("Success", "Password reset successfully! Now login", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <LinearGradient colors={["#f59e0b22", "#f59e0b08"]} style={styles.iconCircle}>
            <Ionicons name="lock-open-outline" size={36} color="#f59e0b" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.sub}>
          {step === 1
            ? "Enter your registered email — we will send OTP"
            : "Enter OTP and new password"
          }
        </Text>

        <View style={styles.card}>
          {/* Step 1 — Email */}
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#64748b" />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#374151"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={step === 1}
            />
            {step === 2 && <Ionicons name="checkmark-circle" size={18} color="#34d399" />}
          </View>

          {/* Step 2 — OTP + New Password */}
          {step === 2 && (
            <>
              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={18} color="#64748b" />
                <TextInput
                  style={styles.input}
                  placeholder="6-digit OTP"
                  placeholderTextColor="#374151"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
                <TextInput
                  style={styles.input}
                  placeholder="New password (min 6 chars)"
                  placeholderTextColor="#374151"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPass}
                />
                <Pressable onPress={() => setShowPass(!showPass)}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color="#64748b" />
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={step === 1 ? handleSendOtp : handleReset}
            disabled={loading}
          >
            <LinearGradient
              colors={["#f59e0b", "#fbbf24"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.btnText}>
                    {step === 1 ? "Send OTP" : "Reset Password"}
                  </Text>
              }
            </LinearGradient>
          </Pressable>

          {step === 2 && (
            <Pressable onPress={() => setStep(1)} style={styles.backStep}>
              <Text style={styles.backStepText}>← Change email</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  backBtn:   { marginTop: 56, marginLeft: 20, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  body:      { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  iconWrap:   { marginBottom: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center" },

  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  sub:   { color: "#64748b", fontSize: 13, textAlign: "center", marginBottom: 28, lineHeight: 20 },

  card:      { width: "100%", backgroundColor: "#111827", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1a2535", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  input:     { flex: 1, color: "#fff", fontSize: 14 },

  btn:     { borderRadius: 14, overflow: "hidden", marginTop: 6 },
  btnGrad: { paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#000", fontSize: 16, fontWeight: "800" },

  backStep:     { alignItems: "center", marginTop: 16 },
  backStepText: { color: "#64748b", fontSize: 13 },
});