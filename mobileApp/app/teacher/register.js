import React, { useState, useEffect, useRef } from "react";
import {
  View, StyleSheet, TextInput, Pressable,
  Alert, ScrollView, StatusBar, Dimensions,
  ActivityIndicator, Modal, FlatList,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const COLLEGES = [
  "Nims Institute of Engineering and Technology",
  "Nims College of Management Studies",
  "Nims College of Nursing",
  "Nims College of Pharmacy",
  "Nims College of Law",
  "Nims College of Dental",
];

// ── Step indicator ──
const StepBar = ({ step }) => {
  const steps = ["Email", "Verify", "Details"];
  return (
    <View style={styles.stepBar}>
      {steps.map((label, i) => {
        const isActive = i + 1 === step;
        const isDone   = i + 1 < step;
        return (
          <React.Fragment key={i}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                isDone  && styles.stepDone,
                isActive && styles.stepActive,
              ]}>
                {isDone
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : <Text style={styles.stepNum}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, isActive && { color: "#f59e0b" }]}>
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
  );
};

// ── Input field ──
const Field = ({ icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, rightIcon, onRightPress }) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={18} color="#888" style={styles.inputIcon} />
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#555"
      style={[styles.input, { flex: 1 }]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || "default"}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
    />
    {rightIcon && (
      <Pressable onPress={onRightPress}>
        <Ionicons name={rightIcon} size={18} color="#555" />
      </Pressable>
    )}
  </View>
);

export default function TeacherRegister() {
  const router = useRouter();
  const inputRefs = useRef([]);

  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=details
  const [form, setForm] = useState({
    email: "", name: "", age: "", phone: "",
    university: "", college: "", password: "", confirmPassword: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [collegeModal, setCollegeModal] = useState(false);

  // Animation
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(30);
  useEffect(() => {
    opacity.value    = withTiming(1, { duration: 700 });
    translateY.value = withSpring(0, { damping: 14 });
  }, []);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Timer
  useEffect(() => {
    if (timer <= 0) { if (step === 2) setOtpExpired(true); return; }
    const t = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const formatTime = () => {
    const m = Math.floor(timer / 60);
    const s = timer % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ── STEP 1: Send OTP ──
  const handleSendOtp = async () => {
    if (!form.email.trim()) return Alert.alert("Error", "Enter your email first");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return Alert.alert("Error", "Enter a valid email");
    try {
      setSendingOtp(true);
      await API.post("/auth/send-email-otp", {
        email: form.email.trim().toLowerCase(),
      });
      setStep(2);
      setTimer(120);
      setOtpExpired(false);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Server not reachable");
    } finally {
      setSendingOtp(false);
    }
  };

  // ── STEP 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    const otpVal = otp.join("");
    if (otpVal.length !== 6) return Alert.alert("Error", "Enter full 6 digit OTP");
    if (otpExpired) return Alert.alert("Error", "OTP expired. Resend it.");
    try {
      setVerifyingOtp(true);
      await API.post("/auth/verify-email-otp", {
        email: form.email.trim().toLowerCase(),
        otp: otpVal,
      });
      setStep(3);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Invalid OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── STEP 3: Register ──
  const handleRegister = async () => {
    const { name, age, phone, university, college, password, confirmPassword } = form;
    if (!name.trim() || !age.trim() || !phone.trim() || !university.trim() || !college || !password.trim()) {
      return Alert.alert("Error", "All fields are required");
    }
    if (password !== confirmPassword) return Alert.alert("Error", "Passwords do not match");
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");
    try {
      setRegistering(true);
      await API.post("/teacher/register", {
        ...form,
        email: form.email.trim().toLowerCase(),
        role: "teacher",
      });
      Alert.alert("Success 🎉", "Teacher registered successfully!", [
        { text: "Login Now", onPress: () => router.replace("/(auth)/teacher-login") },
      ]);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const filled = otp.filter(Boolean).length;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <LinearGradient
        colors={["#0a0f1e", "#0d1a00", "#0a0f1e"]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Glow */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          <BlurView intensity={70} tint="dark" style={styles.blurInner}>

            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Ionicons name="person-circle-outline" size={28} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.logoTitle}>Teacher Registration</Text>
                <Text style={styles.logoSub}>Create your teacher account</Text>
              </View>
            </View>

            {/* Step Bar */}
            <StepBar step={step} />

            {/* ── STEP 1: EMAIL ── */}
            {step === 1 && (
              <>
                <Text style={styles.stepHeading}>Enter your email</Text>
                <Field
                  icon="mail-outline"
                  placeholder="Email address"
                  value={form.email}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  keyboardType="email-address"
                />
                <Pressable
                  style={[styles.btn, sendingOtp && { opacity: 0.7 }]}
                  onPress={handleSendOtp}
                  disabled={sendingOtp}
                >
                  <LinearGradient colors={["#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                    {sendingOtp
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="mail-outline" size={18} color="#fff" /><Text style={styles.btnText}>Send OTP</Text></>
                    }
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => router.replace("/(auth)/teacher-login")} style={styles.loginLink}>
                  <Text style={styles.loginLinkText}>Already registered? <Text style={{ color: "#f59e0b" }}>Login</Text></Text>
                </Pressable>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 2 && (
              <>
                <Text style={styles.stepHeading}>Verify your email</Text>

                {/* Email + edit */}
                <View style={styles.emailBadge}>
                  <Ionicons name="mail" size={14} color="#f59e0b" />
                  <Text style={styles.emailBadgeText}>{form.email}</Text>
                  <Pressable onPress={() => setStep(1)}>
                    <MaterialIcons name="edit" size={16} color="#64748b" />
                  </Pressable>
                </View>

                {/* OTP Boxes */}
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[
                        styles.otpBox,
                        digit && { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)" },
                      ]}
                      keyboardType="numeric"
                      maxLength={1}
                      value={digit}
                      onChangeText={(text) => {
                        if (!/^[0-9]?$/.test(text)) return;
                        const n = [...otp]; n[index] = text; setOtp(n);
                        if (text && index < 5) inputRefs.current[index + 1]?.focus();
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === "Backspace" && !otp[index] && index > 0)
                          inputRefs.current[index - 1]?.focus();
                      }}
                    />
                  ))}
                </View>

                {/* Progress dots */}
                <View style={styles.dotsRow}>
                  {otp.map((d, i) => (
                    <View key={i} style={[styles.dot, d && styles.dotFilled]} />
                  ))}
                </View>

                {/* Timer */}
                <Text style={[styles.timerText, otpExpired && { color: "#f87171" }]}>
                  {otpExpired ? "⚠️ OTP Expired" : `Expires in ${formatTime()}`}
                </Text>

                {!otpExpired ? (
                  <Pressable
                    style={[styles.btn, (verifyingOtp || filled < 6) && { opacity: 0.6 }]}
                    onPress={handleVerifyOtp}
                    disabled={verifyingOtp || filled < 6}
                  >
                    <LinearGradient colors={filled === 6 ? ["#f59e0b","#d97706"] : ["#1a2535","#1a2535"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={styles.btnGrad}>
                      {verifyingOtp
                        ? <ActivityIndicator color="#fff" />
                        : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.btnText}>Verify OTP</Text></>
                      }
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable style={styles.btn} onPress={handleSendOtp} disabled={sendingOtp}>
                    <LinearGradient colors={["#374151","#1f2937"]} style={styles.btnGrad}>
                      {sendingOtp
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.btnText}>Resend OTP</Text>
                      }
                    </LinearGradient>
                  </Pressable>
                )}
              </>
            )}

            {/* ── STEP 3: DETAILS ── */}
            {step === 3 && (
              <>
                {/* Verified badge */}
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                  <Text style={styles.verifiedText}>{form.email} verified</Text>
                </View>

                <Text style={styles.stepHeading}>Fill your details</Text>

                <Field icon="person-outline"    placeholder="Full Name"   value={form.name}       onChangeText={(t) => setForm({ ...form, name: t })} />
                <Field icon="calendar-outline"  placeholder="Age"         value={form.age}        onChangeText={(t) => setForm({ ...form, age: t.replace(/[^0-9]/g,"") })} keyboardType="numeric" />
                <Field icon="call-outline"      placeholder="Phone"       value={form.phone}      onChangeText={(t) => setForm({ ...form, phone: t })} keyboardType="phone-pad" />
                <Field icon="school-outline"    placeholder="University"  value={form.university} onChangeText={(t) => setForm({ ...form, university: t })} />

                {/* College Picker */}
                <Pressable style={styles.inputWrapper} onPress={() => setCollegeModal(true)}>
                  <Ionicons name="business-outline" size={18} color="#888" style={styles.inputIcon} />
                  <Text style={[styles.input, { flex: 1, color: form.college ? "#fff" : "#555" }]}>
                    {form.college || "Select College"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#555" />
                </Pressable>

                <Field
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={form.password}
                  onChangeText={(t) => setForm({ ...form, password: t })}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? "eye-outline" : "eye-off-outline"}
                  onRightPress={() => setShowPassword(!showPassword)}
                />

                <Field
                  icon="shield-checkmark-outline"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChangeText={(t) => setForm({ ...form, confirmPassword: t })}
                  secureTextEntry={!showConfirm}
                  rightIcon={showConfirm ? "eye-outline" : "eye-off-outline"}
                  onRightPress={() => setShowConfirm(!showConfirm)}
                />

                {/* Password match */}
                {form.confirmPassword.length > 0 && (
                  <View style={styles.matchRow}>
                    <Ionicons
                      name={form.password === form.confirmPassword ? "checkmark-circle" : "close-circle"}
                      size={14}
                      color={form.password === form.confirmPassword ? "#34d399" : "#f87171"}
                    />
                    <Text style={{ color: form.password === form.confirmPassword ? "#34d399" : "#f87171", fontSize: 12, marginLeft: 5 }}>
                      {form.password === form.confirmPassword ? "Passwords match" : "Passwords do not match"}
                    </Text>
                  </View>
                )}

                <Pressable
                  style={[styles.btn, { marginTop: 8 }, registering && { opacity: 0.7 }]}
                  onPress={handleRegister}
                  disabled={registering}
                >
                  <LinearGradient colors={["#10b981","#059669"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={styles.btnGrad}>
                    {registering
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="person-add-outline" size={18} color="#fff" /><Text style={styles.btnText}>Register</Text></>
                    }
                  </LinearGradient>
                </Pressable>
              </>
            )}

          </BlurView>
        </Animated.View>
      </ScrollView>

      {/* ── COLLEGE MODAL ── */}
      <Modal visible={collegeModal} transparent animationType="slide" onRequestClose={() => setCollegeModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCollegeModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select College</Text>
            <FlatList
              data={COLLEGES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.collegeOption, form.college === item && styles.collegeOptionActive]}
                  onPress={() => { setForm({ ...form, college: item }); setCollegeModal(false); }}
                >
                  <View style={styles.collegeOptionLeft}>
                    <Ionicons name="business-outline" size={16} color={form.college === item ? "#f59e0b" : "#64748b"} />
                    <Text style={[styles.collegeOptionText, form.college === item && { color: "#f59e0b" }]} numberOfLines={2}>
                      {item}
                    </Text>
                  </View>
                  {form.college === item && <Ionicons name="checkmark-circle" size={18} color="#f59e0b" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20, paddingVertical: 50 },
  glow1: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(245,158,11,0.06)", top: -80, left: -80 },
  glow2: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(52,211,153,0.04)", bottom: 40, right: -60 },

  card: { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  blurInner: { padding: 28, backgroundColor: "rgba(255,255,255,0.04)" },

  // Logo
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  logoCircle: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", justifyContent: "center", alignItems: "center" },
  logoTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  logoSub: { color: "#64748b", fontSize: 12, marginTop: 2 },

  // Step bar
  stepBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  stepActive: { backgroundColor: "rgba(245,158,11,0.2)", borderColor: "#f59e0b" },
  stepDone:   { backgroundColor: "#34d399", borderColor: "#34d399" },
  stepNum: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  stepLabel: { color: "#374151", fontSize: 9, fontWeight: "700" },
  stepLine: { width: 36, height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 4, marginBottom: 14 },

  stepHeading: { color: "#cbd5e1", fontSize: 14, fontWeight: "700", marginBottom: 16, letterSpacing: 0.3 },

  // Input
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, minHeight: 52 },
  inputIcon: { marginRight: 10 },
  input: { color: "#fff", fontSize: 14, paddingVertical: 14 },

  // Button
  btn: { borderRadius: 14, overflow: "hidden", marginTop: 6 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Email badge
  emailBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.08)", padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  emailBadgeText: { flex: 1, color: "#94a3b8", fontSize: 13 },

  // OTP
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  otpBox: { width: 44, height: 54, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#fff", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)" },
  dotFilled: { backgroundColor: "#f59e0b" },
  timerText: { color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: 16 },

  // Verified badge
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.1)", padding: 10, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  verifiedText: { color: "#34d399", fontSize: 12, fontWeight: "600" },

  // Password match
  matchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: -4 },

  // Login link
  loginLink: { alignItems: "center", marginTop: 16 },
  loginLinkText: { color: "#64748b", fontSize: 13 },

  // College Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 16 },
  collegeOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  collegeOptionActive: { backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  collegeOptionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  collegeOptionText: { color: "#94a3b8", fontSize: 13, fontWeight: "500", flex: 1 },
});