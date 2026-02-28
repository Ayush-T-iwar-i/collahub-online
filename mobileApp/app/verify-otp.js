import React, { useState, useRef, useEffect } from "react";
import {
  View, StyleSheet, TextInput, Pressable,
  StatusBar, Alert, ActivityIndicator, Dimensions,
} from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../services/api";

const { width } = Dimensions.get("window");

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const inputRefs = useRef([]);
  const [otp, setOtp] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120);
  const [expired, setExpired] = useState(false);
  const [resending, setResending] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withSpring(0, { damping: 15 });
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  useEffect(() => {
    if (timer <= 0) { setExpired(true); return; }
    const t = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  const handleVerify = async () => {
    const otpVal = otp.join("");
    if (otpVal.length !== 6) return Alert.alert("Error","Enter full 6 digit OTP");
    if (expired) return Alert.alert("Error","OTP expired. Please resend.");
    try {
      setLoading(true);
      await API.post("/auth/verify-email-otp", { email, otp: otpVal });
      Alert.alert("Verified! 🎉","Account verified successfully.", [
        { text: "Login Now", onPress: () => router.replace("/(auth)/student-login") },
      ]);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await API.post("/auth/send-email-otp", { email });
      setTimer(120); setExpired(false); setOtp(["","","","","",""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } catch (e) { Alert.alert("Error","Could not resend OTP"); }
    finally { setResending(false); }
  };

  const formatTime = () => `${Math.floor(timer/60)}:${(timer%60).toString().padStart(2,"0")}`;
  const filled = otp.filter(Boolean).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0a0f1e","#050d14"]} style={StyleSheet.absoluteFillObject} />

      <Animated.View style={[styles.wrapper, cardStyle]}>
        <BlurView intensity={80} tint="dark" style={styles.card}>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={30} color="#00c6ff" />
          </View>

          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>OTP sent to</Text>
          <Text style={styles.email}>{email}</Text>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.otpBox, digit && styles.otpBoxFilled]}
                keyboardType="numeric"
                maxLength={1}
                value={digit}
                onChangeText={(text) => {
                  if (!/^[0-9]?$/.test(text)) return;
                  const n = [...otp]; n[index] = text; setOtp(n);
                  if (text && index < 5) inputRefs.current[index+1]?.focus();
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key==="Backspace" && !otp[index] && index>0) inputRefs.current[index-1]?.focus();
                }}
              />
            ))}
          </View>

          {/* Progress dots */}
          <View style={styles.progressRow}>
            {otp.map((d,i) => (
              <View key={i} style={[styles.progressDot, d && styles.progressDotFilled]} />
            ))}
          </View>

          {/* Timer */}
          <Text style={[styles.timerText, expired && { color: "#f87171" }]}>
            {expired ? "⚠️ OTP Expired" : `Expires in ${formatTime()}`}
          </Text>

          {/* Verify Button */}
          {!expired && (
            <Pressable style={styles.btn} onPress={handleVerify} disabled={loading || filled < 6}>
              <LinearGradient
                colors={filled===6 ? ["#0072ff","#00c6ff"] : ["#1a2535","#1a2535"]}
                start={{x:0,y:0}} end={{x:1,y:0}} style={styles.btnGrad}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                     <Text style={styles.btnText}>Verify OTP</Text></>
                }
              </LinearGradient>
            </Pressable>
          )}

          {/* Resend */}
          <Pressable style={styles.resendBtn} onPress={handleResend} disabled={resending || !expired}>
            {resending
              ? <ActivityIndicator size="small" color="#00c6ff" />
              : <Text style={[styles.resendText, !expired && { color: "#374151" }]}>
                  {expired ? "Resend OTP" : `Resend available after expiry`}
                </Text>
            }
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="arrow-back" size={14} color="#64748b" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  wrapper: { width: width > 500 ? 440 : "100%" },
  card: { padding: 32, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,198,255,0.12)", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)", justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { color: "#64748b", fontSize: 13, textAlign: "center", marginTop: 8 },
  email: { color: "#00c6ff", fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 4, marginBottom: 28 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  otpBox: { width: 44, height: 54, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#fff", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)" },
  otpBoxFilled: { borderColor: "#00c6ff", backgroundColor: "rgba(0,198,255,0.08)" },
  progressRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 12 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)" },
  progressDotFilled: { backgroundColor: "#00c6ff" },
  timerText: { color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: 20 },
  btn: { borderRadius: 14, overflow: "hidden", marginBottom: 14 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  resendBtn: { alignItems: "center", paddingVertical: 12 },
  resendText: { color: "#00c6ff", fontSize: 14, fontWeight: "600" },
  backLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 },
  backText: { color: "#64748b", fontSize: 13 },
});