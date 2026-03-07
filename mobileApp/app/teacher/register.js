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
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";

const { width } = Dimensions.get("window");

// ✅ College → Department Mapping
const COLLEGE_DEPARTMENTS = {
  "Nims Institute of Engineering and Technology": [
    "Computer Science Engineering (CSE)",
    "Information Technology (IT)",
    "Electronics and Communication Engineering (ECE)",
    "Electrical Engineering (EE)",
    "Mechanical Engineering (ME)",
    "Civil Engineering",
    "Chemical Engineering",
    "Artificial Intelligence & Machine Learning",
    "Data Science Engineering",
  ],
  "Nims College of Management Studies": [
    "Business Administration",
    "Finance",
    "Marketing",
    "Human Resource",
  ],
  "Nims College of Nursing": [
    "B.Sc Nursing",
    "GNM",
    "Post Basic Nursing",
  ],
  "Nims College of Pharmacy": [
    "B.Pharm",
    "D.Pharm",
    "M.Pharm",
  ],
  "Nims College of Law": [
    "LLB",
    "BA LLB",
    "LLM",
  ],
  "Nims College of Dental": [
    "BDS",
    "MDS",
  ],
};

const COLLEGES = Object.keys(COLLEGE_DEPARTMENTS);

// ── Step Bar ──
const StepBar = ({ step }) => {
  const steps = ["Email", "Verify", "Details"];
  return (
    <View style={styles.stepBar}>
      {steps.map((label, i) => {
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
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : <Text style={styles.stepNum}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepLabel, isActive && { color: "#f59e0b" }]}>{label}</Text>
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

// ── Input Field ──
const Field = ({ icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, rightIcon, onRightPress }) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={18} color="#888" style={styles.inputIcon} />
    <TextInput
      placeholder={placeholder} placeholderTextColor="#555"
      style={[styles.input, { flex: 1 }]}
      value={value} onChangeText={onChangeText}
      keyboardType={keyboardType || "default"}
      secureTextEntry={secureTextEntry} autoCapitalize="none"
    />
    {rightIcon && (
      <Pressable onPress={onRightPress}>
        <Ionicons name={rightIcon} size={18} color="#555" />
      </Pressable>
    )}
  </View>
);

// ── Picker Row ──
const PickerRow = ({ icon, value, placeholder, onPress, color = "#555" }) => (
  <Pressable style={styles.inputWrapper} onPress={onPress}>
    <Ionicons name={icon} size={18} color="#888" style={styles.inputIcon} />
    <Text style={[styles.input, { paddingVertical: 17, color: value ? "#fff" : color }]} numberOfLines={1}>
      {value || placeholder}
    </Text>
    <Ionicons name="chevron-down" size={16} color="#555" />
  </Pressable>
);

// ── Picker Modal ──
const PickerModal = ({ visible, title, data, selected, onSelect, onClose, accent = "#f59e0b" }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        <FlatList
          data={data}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.modalOption, selected === item && styles.modalOptionActive]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[styles.modalOptionText, selected === item && { color: accent }]} numberOfLines={2}>
                {item}
              </Text>
              {selected === item && <Ionicons name="checkmark-circle" size={16} color={accent} />}
            </Pressable>
          )}
        />
      </View>
    </Pressable>
  </Modal>
);

// ══════════════════════════════════════════
export default function TeacherRegister() {
  const router = useRouter();
  const inputRefs = useRef([]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "", name: "", age: "", phone: "",
    university: "", college: "", department: "",
    password: "", confirmPassword: "",
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
  const [deptModal, setDeptModal] = useState(false);

  // ✅ Departments based on selected college
  const availableDepts = form.college ? COLLEGE_DEPARTMENTS[form.college] || [] : [];

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withSpring(0, { damping: 14 });
  }, [opacity, translateY]);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value, transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (timer <= 0) { if (step === 2) setOtpExpired(true); return; }
    const t = setInterval(() => setTimer(p => p - 1), 1000);
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
      await API.post("/auth/send-email-otp", { email: form.email.trim().toLowerCase() });
      setStep(2); setTimer(120); setOtpExpired(false);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Server not reachable");
    } finally { setSendingOtp(false); }
  };

  // ── STEP 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    const otpVal = otp.join("");
    if (otpVal.length !== 6) return Alert.alert("Error", "Enter full 6 digit OTP");
    if (otpExpired) return Alert.alert("Error", "OTP expired. Resend it.");
    try {
      setVerifyingOtp(true);
      await API.post("/auth/verify-email-otp", {
        email: form.email.trim().toLowerCase(), otp: otpVal,
      });
      setStep(3);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Invalid OTP");
    } finally { setVerifyingOtp(false); }
  };

  // ── STEP 3: Register ──
  const handleRegister = async () => {
    const { name, phone, college, department, password, confirmPassword } = form;
    if (!name.trim()) return Alert.alert("Error", "Name is required");
    if (!phone.trim()) return Alert.alert("Error", "Phone is required");
    if (!college.trim()) return Alert.alert("Error", "College is required");
    if (!department.trim()) return Alert.alert("Error", "Department is required");
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");
    if (password !== confirmPassword) return Alert.alert("Error", "Passwords do not match");

    try {
      setRegistering(true);
      await API.post("/teacher/register", {
        name: name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: phone.trim(),
        college: college.trim(),
        department: department.trim(),
        university: form.university.trim(),
        age: form.age ? Number(form.age) : undefined,
        password,
      });
      Alert.alert(
        "Success 🎉",
        "Teacher account created! You can now login.",
        [{ text: "Login", onPress: () => router.replace("/(auth)/teacher-login") }]
      );
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Registration failed");
    } finally { setRegistering(false); }
  };

  const f = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  // ✅ College select — reset department
  const handleCollegeSelect = (college) => {
    setForm(prev => ({ ...prev, college, department: "" }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0f1e" }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0a0f1e", "#1a1200", "#0a0f1e"]} style={StyleSheet.absoluteFillObject} />

      <ScrollView contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.container, cardStyle]}>
          <BlurView intensity={80} tint="dark" style={styles.card}>

            {/* Logo */}
            <View style={styles.logoArea}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-add" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.title}>Teacher Registration</Text>
              <Text style={styles.subtitle}>Create your COLLAहUB account</Text>
            </View>

            <StepBar step={step} />

            {/* ── STEP 1: Email ── */}
            {step === 1 && (
              <>
                <Field icon="mail-outline" placeholder="Email address"
                  value={form.email} onChangeText={f("email")} keyboardType="email-address" />
                <Pressable style={styles.btn} onPress={handleSendOtp} disabled={sendingOtp}>
                  <LinearGradient colors={["#f59e0b", "#d97706"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                    {sendingOtp
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnText}>Send OTP</Text>}
                  </LinearGradient>
                </Pressable>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 2 && (
              <>
                <View style={styles.emailBadge}>
                  <Ionicons name="mail" size={14} color="#f59e0b" />
                  <Text style={styles.emailBadgeText}>{form.email}</Text>
                </View>
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput key={index}
                      ref={ref => inputRefs.current[index] = ref}
                      style={[styles.otpBox, { borderColor: digit ? "#f59e0b" : "rgba(255,255,255,0.12)" }]}
                      keyboardType="numeric" maxLength={1} value={digit}
                      onChangeText={text => {
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
                <Text style={styles.timerText}>
                  {otpExpired ? "⚠️ OTP Expired" : `Expires in ${formatTime()}`}
                </Text>
                {otpExpired ? (
                  <Pressable style={styles.btn} onPress={handleSendOtp} disabled={sendingOtp}>
                    <LinearGradient colors={["#374151", "#1f2937"]} style={styles.btnGrad}>
                      {sendingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Resend OTP</Text>}
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable style={styles.btn} onPress={handleVerifyOtp} disabled={verifyingOtp}>
                    <LinearGradient colors={["#f59e0b", "#d97706"]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                      {verifyingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
                    </LinearGradient>
                  </Pressable>
                )}
              </>
            )}

            {/* ── STEP 3: Details ── */}
            {step === 3 && (
              <>
                <Field icon="person-outline" placeholder="Full Name" value={form.name} onChangeText={f("name")} />
                <Field icon="call-outline" placeholder="Phone Number" value={form.phone} onChangeText={f("phone")} keyboardType="phone-pad" />
                <Field icon="calendar-outline" placeholder="Age (optional)" value={form.age} onChangeText={f("age")} keyboardType="numeric" />
                <Field icon="school-outline" placeholder="University (optional)" value={form.university} onChangeText={f("university")} />

                {/* ✅ College Picker */}
                <PickerRow
                  icon="business-outline"
                  value={form.college}
                  placeholder="Select College *"
                  onPress={() => setCollegeModal(true)}
                />

                {/* ✅ Department Picker — college select hone ke baad hi active */}
                <Pressable
                  style={[styles.inputWrapper, !form.college && { opacity: 0.5 }]}
                  onPress={() => {
                    if (!form.college) {
                      Alert.alert("Select College First", "Please select a college before choosing department");
                      return;
                    }
                    setDeptModal(true);
                  }}
                >
                  <Ionicons name="layers-outline" size={18} color="#888" style={styles.inputIcon} />
                  <Text style={[styles.input, { paddingVertical: 17, color: form.department ? "#fff" : "#555" }]} numberOfLines={1}>
                    {form.department || (form.college ? "Select Department *" : "Select College first")}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#555" />
                </Pressable>

                {/* College + Dept selected preview */}
                {form.college && form.department && (
                  <View style={styles.selectedPreview}>
                    <View style={styles.previewItem}>
                      <Ionicons name="business" size={12} color="#34d399" />
                      <Text style={styles.previewText} numberOfLines={1}>{form.college}</Text>
                    </View>
                    <View style={styles.previewItem}>
                      <Ionicons name="layers" size={12} color="#f59e0b" />
                      <Text style={[styles.previewText, { color: "#f59e0b" }]} numberOfLines={1}>{form.department}</Text>
                    </View>
                  </View>
                )}

                <Field icon="lock-closed-outline"
                  placeholder="Password"
                  value={form.password} onChangeText={f("password")}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? "eye-outline" : "eye-off-outline"}
                  onRightPress={() => setShowPassword(!showPassword)} />

                <Field icon="shield-checkmark-outline"
                  placeholder="Confirm Password"
                  value={form.confirmPassword} onChangeText={f("confirmPassword")}
                  secureTextEntry={!showConfirm}
                  rightIcon={showConfirm ? "eye-outline" : "eye-off-outline"}
                  onRightPress={() => setShowConfirm(!showConfirm)} />

                {form.confirmPassword.length > 0 && (
                  <View style={styles.matchRow}>
                    <Ionicons
                      name={form.password === form.confirmPassword ? "checkmark-circle" : "close-circle"}
                      size={16}
                      color={form.password === form.confirmPassword ? "#34d399" : "#f87171"}
                    />
                    <Text style={{ color: form.password === form.confirmPassword ? "#34d399" : "#f87171", fontSize: 12, marginLeft: 6 }}>
                      {form.password === form.confirmPassword ? "Passwords match" : "Passwords do not match"}
                    </Text>
                  </View>
                )}

                <Pressable style={styles.btn} onPress={handleRegister} disabled={registering}>
                  <LinearGradient colors={["#10b981", "#059669"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGrad}>
                    {registering
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnText}>Create Account</Text>}
                  </LinearGradient>
                </Pressable>
              </>
            )}

            <Pressable onPress={() => router.replace("/(auth)/teacher-login")} style={styles.backLink}>
              <Ionicons name="arrow-back" size={14} color="#64748b" />
              <Text style={styles.backText}>Back to Login</Text>
            </Pressable>

          </BlurView>
        </Animated.View>
      </ScrollView>

      {/* ✅ College Modal */}
      <PickerModal
        visible={collegeModal}
        title="Select College"
        data={COLLEGES}
        selected={form.college}
        onSelect={handleCollegeSelect}
        onClose={() => setCollegeModal(false)}
        accent="#34d399"
      />

      {/* ✅ Department Modal — only shows college's departments */}
      <PickerModal
        visible={deptModal}
        title={`Departments — ${form.college?.split(" ").slice(0, 3).join(" ") || ""}`}
        data={availableDepts}
        selected={form.department}
        onSelect={f("department")}
        onClose={() => setDeptModal(false)}
        accent="#f59e0b"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: "center", paddingVertical: 40 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  card: { width: width > 500 ? 460 : "100%", padding: 28, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  logoArea: { alignItems: "center", marginBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(245,158,11,0.12)", justifyContent: "center", alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },
  stepBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  stepDone: { backgroundColor: "#34d399", borderColor: "#34d399" },
  stepActive: { backgroundColor: "rgba(245,158,11,0.2)", borderColor: "#f59e0b" },
  stepNum: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  stepLabel: { color: "#374151", fontSize: 10, fontWeight: "600" },
  stepLine: { width: 36, height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 6, marginBottom: 16 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, color: "#fff", fontSize: 14 },
  btn: { borderRadius: 14, overflow: "hidden", marginTop: 6, marginBottom: 8 },
  btnGrad: { paddingVertical: 16, alignItems: "center", borderRadius: 14 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  emailBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.08)", padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  emailBadgeText: { color: "#94a3b8", fontSize: 13 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 6 },
  otpBox: { width: 42, height: 52, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, textAlign: "center", fontSize: 20, color: "#fff", borderWidth: 1.5 },
  timerText: { color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: 12 },
  matchRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: -4 },
  backLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 },
  backText: { color: "#64748b", fontSize: 13 },
  // Preview
  selectedPreview: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 10, marginBottom: 12, gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  previewItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewText: { color: "#34d399", fontSize: 11, flex: 1 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "65%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 12 },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  modalOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  modalOptionActive: { backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  modalOptionText: { color: "#94a3b8", fontSize: 13, flex: 1 },
});