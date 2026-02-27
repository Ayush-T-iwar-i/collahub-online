import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";

const { width } = Dimensions.get("window");

// Steps: 1 = email, 2 = otp, 3 = new password
export default function StudentForgot() {
  const router = useRouter();
  const inputRefs = useRef([]);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 min
  const [otpExpired, setOtpExpired] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withSpring(0, { damping: 15 });
    scale.value = withRepeat(withTiming(1.08, { duration: 12000 }), -1, true);
  }, []);

  // Timer for OTP
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    }
    if (timer === 0) setOtpExpired(true);
    return () => clearInterval(interval);
  }, [step, timer]);

  const animatedCard = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBg = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatTime = () => {
    const m = Math.floor(timer / 60);
    const s = timer % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ── STEP 1: Send OTP ──
  const handleSendOtp = async () => {
    if (!email.trim()) return Alert.alert("Error", "Enter your email");

    try {
      setLoading(true);
      await API.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setStep(2);
      setTimer(300);
      setOtpExpired(false);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    const otpVal = otp.join("");
    if (otpVal.length !== 6) return Alert.alert("Error", "Enter full 6 digit OTP");
    if (otpExpired) return Alert.alert("Error", "OTP expired. Resend it.");

    try {
      setLoading(true);
      // Just validate locally and move to step 3
      // Actual verify happens with resetPassword
      setStep(3);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: Reset Password ──
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return Alert.alert("Error", "Password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match");
    }

    try {
      setLoading(true);
      await API.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.join(""),
        newPassword,
      });
      Alert.alert("Success 🎉", "Password reset successfully!", [
        { text: "Login", onPress: () => router.replace("/(auth)/student-login") },
      ]);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Email", "OTP", "Password"];

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      <Animated.Image
        source={require("../../assets/login-bg.jpg")}
        style={[StyleSheet.absoluteFillObject, animatedBg]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(10,10,30,0.78)", "rgba(0,0,0,0.88)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.container, animatedCard]}>
        <BlurView intensity={90} tint="dark" style={styles.card}>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="lock-open-outline" size={30} color="#00c6ff" />
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 && "Enter your registered email"}
            {step === 2 && "Enter the 6-digit OTP sent to your email"}
            {step === 3 && "Set your new password"}
          </Text>

          {/* Step indicator */}
          <View style={styles.steps}>
            {stepLabels.map((label, i) => {
              const isActive = i + 1 === step;
              const isDone = i + 1 < step;
              return (
                <React.Fragment key={i}>
                  <View style={styles.stepItem}>
                    <View style={[
                      styles.stepCircle,
                      isDone && styles.stepDone,
                      isActive && styles.stepActive,
                    ]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                        : <Text style={styles.stepNum}>{i + 1}</Text>
                      }
                    </View>
                    <Text style={[styles.stepLabel, isActive && { color: "#00c6ff" }]}>
                      {label}
                    </Text>
                  </View>
                  {i < 2 && (
                    <View style={[styles.stepLine, isDone && { backgroundColor: "#34d399" }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* ── STEP 1: EMAIL ── */}
          {step === 1 && (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="Email address"
                  placeholderTextColor="#888"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Pressable style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                <LinearGradient colors={["#0072ff", "#00c6ff"]} style={styles.btnGrad}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Send OTP</Text>
                  }
                </LinearGradient>
              </Pressable>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <>
              <View style={styles.emailBadge}>
                <Ionicons name="mail" size={14} color="#00c6ff" />
                <Text style={styles.emailBadgeText}>{email}</Text>
              </View>

              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={styles.otpBox}
                    keyboardType="numeric"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => {
                      if (!/^[0-9]?$/.test(text)) return;
                      const newOtp = [...otp];
                      newOtp[index] = text;
                      setOtp(newOtp);
                      if (text && index < 5) inputRefs.current[index + 1]?.focus();
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
                        inputRefs.current[index - 1]?.focus();
                      }
                    }}
                  />
                ))}
              </View>

              <Text style={styles.timerText}>
                {otpExpired ? "⚠️ OTP Expired" : `Expires in ${formatTime()}`}
              </Text>

              {otpExpired ? (
                <Pressable style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                  <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.btnGrad}>
                    <Text style={styles.btnText}>Resend OTP</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable style={styles.btn} onPress={handleVerifyOtp} disabled={loading}>
                  <LinearGradient colors={["#0072ff", "#00c6ff"]} style={styles.btnGrad}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnText}>Verify OTP</Text>
                    }
                  </LinearGradient>
                </Pressable>
              )}
            </>
          )}

          {/* ── STEP 3: NEW PASSWORD ── */}
          {step === 3 && (
            <>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="New Password"
                  placeholderTextColor="#888"
                  style={[styles.input, { flex: 1 }]}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={18} color="#888"
                  />
                </Pressable>
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor="#888"
                  style={[styles.input, { flex: 1 }]}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons
                    name={showConfirm ? "eye-outline" : "eye-off-outline"}
                    size={18} color="#888"
                  />
                </Pressable>
              </View>

              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons
                    name={newPassword === confirmPassword ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={newPassword === confirmPassword ? "#34d399" : "#f87171"}
                  />
                  <Text style={{
                    color: newPassword === confirmPassword ? "#34d399" : "#f87171",
                    fontSize: 12, marginLeft: 6,
                  }}>
                    {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </Text>
                </View>
              )}

              <Pressable style={styles.btn} onPress={handleResetPassword} disabled={loading}>
                <LinearGradient colors={["#10b981", "#059669"]} style={styles.btnGrad}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Reset Password</Text>
                  }
                </LinearGradient>
              </Pressable>
            </>
          )}

          {/* Back to login */}
          <Pressable
            onPress={() => router.replace("/(auth)/student-login")}
            style={styles.backLink}
          >
            <Ionicons name="arrow-back" size={14} color="#64748b" />
            <Text style={styles.backText}>Back to Login</Text>
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
  card: {
    width: width > 500 ? 460 : "100%",
    padding: 32, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(0,198,255,0.12)",
    justifyContent: "center", alignItems: "center",
    alignSelf: "center", marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(0,198,255,0.25)",
  },
  title: {
    fontSize: 24, fontWeight: "800", color: "#fff",
    textAlign: "center", letterSpacing: 0.5,
  },
  subtitle: {
    color: "#64748b", fontSize: 13,
    textAlign: "center", marginTop: 6, marginBottom: 24,
  },
  steps: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", marginBottom: 28,
  },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#1a2535",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  stepActive: {
    backgroundColor: "rgba(0,198,255,0.2)",
    borderColor: "#00c6ff",
  },
  stepDone: {
    backgroundColor: "#34d399",
    borderColor: "#34d399",
  },
  stepNum: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  stepLabel: { color: "#374151", fontSize: 10, fontWeight: "600" },
  stepLine: {
    width: 40, height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 6, marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14, marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, color: "#fff",
    fontSize: 15, paddingVertical: 15,
  },
  btn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  btnGrad: {
    paddingVertical: 16, alignItems: "center", borderRadius: 14,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  emailBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,198,255,0.08)",
    padding: 12, borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: "rgba(0,198,255,0.15)",
  },
  emailBadgeText: { color: "#94a3b8", fontSize: 13 },
  otpRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 12,
  },
  otpBox: {
    width: 44, height: 54,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12, textAlign: "center",
    fontSize: 22, color: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  timerText: {
    color: "#64748b", fontSize: 12,
    textAlign: "center", marginBottom: 14,
  },
  matchRow: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 14, marginTop: -6,
  },
  backLink: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    marginTop: 20,
  },
  backText: { color: "#64748b", fontSize: 13 },
});