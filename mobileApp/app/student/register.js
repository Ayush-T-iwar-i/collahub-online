import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, StyleSheet, TextInput, Pressable,
  StatusBar, Alert, ScrollView, BackHandler,
  ActivityIndicator, Modal, FlatList, Dimensions,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
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

const DEPARTMENTS = [
  "Computer Science Engineering (CSE)",
  "Information Technology (IT)",
  "Electronics and Communication Engineering (ECE)",
  "Electrical Engineering (EE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering",
  "Chemical Engineering",
  "Artificial Intelligence & Machine Learning",
  "Data Science Engineering",
];

const GENDERS = ["Male", "Female", "Other"];

// ── Step Bar ──
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
                isDone   && styles.stepDone,
                isActive && styles.stepActive,
              ]}>
                {isDone
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
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
  );
};

// ── Input Field ──
const Field = ({ icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, rightIcon, onRightPress, maxLength }) => (
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
      maxLength={maxLength}
    />
    {rightIcon && (
      <Pressable onPress={onRightPress}>
        <Ionicons name={rightIcon} size={18} color="#555" />
      </Pressable>
    )}
  </View>
);

export default function StudentRegister() {
  const router    = useRouter();
  const inputRefs = useRef([]);

  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=details
  const [form, setForm] = useState({
    email: "", name: "", phone: "", studentId: "",
    admissionYear: "", college: "", department: "",
    gender: "", password: "", confirmPassword: "",
  });

  const [otp, setOtp]               = useState(["", "", "", "", "", ""]);
  const [timer, setTimer]           = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [registering, setRegistering]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [collegeModal, setCollegeModal]   = useState(false);
  const [genderModal, setGenderModal]     = useState(false);
  const [deptModal, setDeptModal]         = useState(false);
  const [deptSearch, setDeptSearch]       = useState("");

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

  // Timer countdown
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

  // ✅ Back = go to student login
  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/(auth)/student-login");
        return true;
      });
      return () => handler.remove();
    }, [])
  );

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
    } finally { setSendingOtp(false); }
  };

  // ── STEP 2: Verify OTP ──
  const handleVerifyOtp = async () => {
    const otpVal = otp.join("");
    if (otpVal.length !== 6) return Alert.alert("Error", "Enter full 6 digit OTP");
    if (otpExpired) return Alert.alert("Error", "OTP expired. Please resend.");
    try {
      setVerifyingOtp(true);
      await API.post("/auth/verify-email-otp", {
        email: form.email.trim().toLowerCase(),
        otp: otpVal,
      });
      setStep(3);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Invalid OTP");
    } finally { setVerifyingOtp(false); }
  };

  // ── STEP 3: Register ──
  const handleRegister = async () => {
    const { name, phone, studentId, admissionYear, college, department, gender, password, confirmPassword } = form;
    if (!name.trim())         return Alert.alert("Error", "Full Name is required");
    if (!phone.trim())        return Alert.alert("Error", "Phone Number is required");
    if (!studentId.trim())    return Alert.alert("Error", "Student ID is required");
    if (!admissionYear.trim())return Alert.alert("Error", "Admission Year is required");
    if (!college)             return Alert.alert("Error", "Please select college");
    if (!department)          return Alert.alert("Error", "Please select department");
    if (!gender)              return Alert.alert("Error", "Please select gender");
    if (!password || password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");
    if (password !== confirmPassword)     return Alert.alert("Error", "Passwords do not match");
    try {
      setRegistering(true);
      await API.post("/auth/register", {
        ...form,
        email: form.email.trim().toLowerCase(),
      });
      Alert.alert("Success 🎉", "Registration Successful! Please login.", [
        { text: "Login Now", onPress: () => router.replace("/(auth)/student-login") },
      ]);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Registration failed");
    } finally { setRegistering(false); }
  };

  const filled = otp.filter(Boolean).length;
  const filteredDepts = DEPARTMENTS.filter((d) =>
    d.toLowerCase().includes(deptSearch.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      {/* Gradient background */}
      <LinearGradient
        colors={["#060d1f", "#001a10", "#060d1f"]}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Glow blobs */}
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
                <Ionicons name="school-outline" size={26} color="#00c6ff" />
              </View>
              <View>
                <Text style={styles.logoTitle}>Student Registration</Text>
                <Text style={styles.logoSub}>Create your student account</Text>
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
                  <LinearGradient
                    colors={["#0072ff", "#00c6ff"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.btnGrad}
                  >
                    {sendingOtp
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="mail-outline" size={18} color="#fff" /><Text style={styles.btnText}>Send OTP</Text></>
                    }
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => router.replace("/(auth)/student-login")} style={styles.loginLink}>
                  <Text style={styles.loginLinkText}>
                    Already have an account?{" "}
                    <Text style={{ color: "#00c6ff" }}>Login</Text>
                  </Text>
                </Pressable>
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 2 && (
              <>
                <Text style={styles.stepHeading}>Verify your email</Text>

                {/* Email badge */}
                <View style={styles.emailBadge}>
                  <Ionicons name="mail" size={14} color="#00c6ff" />
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
                        digit && { borderColor: "#00c6ff", backgroundColor: "rgba(0,198,255,0.08)" },
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

                <Text style={[styles.timerText, otpExpired && { color: "#f87171" }]}>
                  {otpExpired ? "⚠️ OTP Expired" : `Expires in ${formatTime()}`}
                </Text>

                {!otpExpired ? (
                  <Pressable
                    style={[styles.btn, (verifyingOtp || filled < 6) && { opacity: 0.6 }]}
                    onPress={handleVerifyOtp}
                    disabled={verifyingOtp || filled < 6}
                  >
                    <LinearGradient
                      colors={filled === 6 ? ["#0072ff", "#00c6ff"] : ["#1a2535", "#1a2535"]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.btnGrad}
                    >
                      {verifyingOtp
                        ? <ActivityIndicator color="#fff" />
                        : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.btnText}>Verify OTP</Text></>
                      }
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable style={styles.btn} onPress={handleSendOtp} disabled={sendingOtp}>
                    <LinearGradient colors={["#374151", "#1f2937"]} style={styles.btnGrad}>
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

                <Field icon="person-outline"   placeholder="Full Name"               value={form.name}          onChangeText={(t) => setForm({ ...form, name: t })} />
                <Field icon="call-outline"     placeholder="Phone Number"            value={form.phone}         onChangeText={(t) => setForm({ ...form, phone: t })}         keyboardType="phone-pad" />
                <Field icon="card-outline"     placeholder="Student ID"              value={form.studentId}     onChangeText={(t) => setForm({ ...form, studentId: t })} />
                <Field icon="calendar-outline" placeholder="Admission Year (e.g. 2024)" value={form.admissionYear} onChangeText={(t) => setForm({ ...form, admissionYear: t.replace(/[^0-9]/g, "") })} keyboardType="numeric" maxLength={4} />

                {/* College Picker */}
                <Pressable style={styles.inputWrapper} onPress={() => setCollegeModal(true)}>
                  <Ionicons name="business-outline" size={18} color="#888" style={styles.inputIcon} />
                  <Text style={[styles.input, { flex: 1, color: form.college ? "#fff" : "#555" }]}>
                    {form.college || "Select College"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#555" />
                </Pressable>

                {/* Department Picker */}
                <Pressable style={styles.inputWrapper} onPress={() => setDeptModal(true)}>
                  <Ionicons name="school-outline" size={18} color="#888" style={styles.inputIcon} />
                  <Text style={[styles.input, { flex: 1, color: form.department ? "#fff" : "#555" }]} numberOfLines={1}>
                    {form.department || "Select Department"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#555" />
                </Pressable>

                {/* Gender Picker */}
                <Pressable style={styles.inputWrapper} onPress={() => setGenderModal(true)}>
                  <Ionicons name="people-outline" size={18} color="#888" style={styles.inputIcon} />
                  <Text style={[styles.input, { flex: 1, color: form.gender ? "#fff" : "#555" }]}>
                    {form.gender || "Select Gender"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#555" />
                </Pressable>

                {/* Password */}
                <Field
                  icon="lock-closed-outline"
                  placeholder="Password (min 6 chars)"
                  value={form.password}
                  onChangeText={(t) => setForm({ ...form, password: t })}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? "eye-outline" : "eye-off-outline"}
                  onRightPress={() => setShowPassword(!showPassword)}
                />

                {/* Confirm Password */}
                <Field
                  icon="shield-checkmark-outline"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChangeText={(t) => setForm({ ...form, confirmPassword: t })}
                  secureTextEntry={!showConfirm}
                  rightIcon={showConfirm ? "eye-outline" : "eye-off-outline"}
                  onRightPress={() => setShowConfirm(!showConfirm)}
                />

                {/* Password match indicator */}
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
                  <LinearGradient
                    colors={["#10b981", "#059669"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.btnGrad}
                  >
                    {registering
                      ? <ActivityIndicator color="#fff" />
                      : <><Ionicons name="person-add-outline" size={18} color="#fff" /><Text style={styles.btnText}>Create Account</Text></>
                    }
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => router.replace("/(auth)/student-login")} style={styles.loginLink}>
                  <Text style={styles.loginLinkText}>
                    Already have an account?{" "}
                    <Text style={{ color: "#00c6ff" }}>Login</Text>
                  </Text>
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
                  style={[styles.modalOption, form.college === item && styles.modalOptionActive]}
                  onPress={() => { setForm({ ...form, college: item }); setCollegeModal(false); }}
                >
                  <View style={styles.modalOptionLeft}>
                    <Ionicons name="business-outline" size={16} color={form.college === item ? "#00c6ff" : "#64748b"} />
                    <Text style={[styles.modalOptionText, form.college === item && { color: "#00c6ff" }]} numberOfLines={2}>
                      {item}
                    </Text>
                  </View>
                  {form.college === item && <Ionicons name="checkmark-circle" size={18} color="#00c6ff" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ── DEPARTMENT MODAL ── */}
      <Modal visible={deptModal} transparent animationType="slide" onRequestClose={() => setDeptModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeptModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Department</Text>
            {/* Search */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#64748b" />
              <TextInput
                placeholder="Search department..."
                placeholderTextColor="#374151"
                style={styles.searchInput}
                value={deptSearch}
                onChangeText={setDeptSearch}
              />
            </View>
            <FlatList
              data={filteredDepts}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalOption, form.department === item && styles.modalOptionActive]}
                  onPress={() => { setForm({ ...form, department: item }); setDeptModal(false); setDeptSearch(""); }}
                >
                  <View style={styles.modalOptionLeft}>
                    <Ionicons name="school-outline" size={16} color={form.department === item ? "#00c6ff" : "#64748b"} />
                    <Text style={[styles.modalOptionText, form.department === item && { color: "#00c6ff" }]} numberOfLines={2}>
                      {item}
                    </Text>
                  </View>
                  {form.department === item && <Ionicons name="checkmark-circle" size={18} color="#00c6ff" />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ── GENDER MODAL ── */}
      <Modal visible={genderModal} transparent animationType="slide" onRequestClose={() => setGenderModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGenderModal(false)}>
          <View style={[styles.modalSheet, { maxHeight: 280 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Gender</Text>
            {GENDERS.map((item) => (
              <Pressable
                key={item}
                style={[styles.modalOption, form.gender === item && styles.modalOptionActive]}
                onPress={() => { setForm({ ...form, gender: item }); setGenderModal(false); }}
              >
                <View style={styles.modalOptionLeft}>
                  <Ionicons name="people-outline" size={16} color={form.gender === item ? "#00c6ff" : "#64748b"} />
                  <Text style={[styles.modalOptionText, form.gender === item && { color: "#00c6ff" }]}>{item}</Text>
                </View>
                {form.gender === item && <Ionicons name="checkmark-circle" size={18} color="#00c6ff" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20, paddingVertical: 50 },
  glow1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(0,198,255,0.06)", top: -80, left: -80 },
  glow2: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(16,185,129,0.04)", bottom: 40, right: -60 },

  card: { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  blurInner: { padding: 28, backgroundColor: "rgba(255,255,255,0.04)" },

  logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  logoCircle: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(0,198,255,0.12)", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)", justifyContent: "center", alignItems: "center" },
  logoTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  logoSub: { color: "#64748b", fontSize: 12, marginTop: 2 },

  // Step bar
  stepBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  stepActive: { backgroundColor: "rgba(0,198,255,0.2)", borderColor: "#00c6ff" },
  stepDone:   { backgroundColor: "#34d399", borderColor: "#34d399" },
  stepNum: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  stepLabel: { color: "#374151", fontSize: 9, fontWeight: "700" },
  stepLine: { width: 36, height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 4, marginBottom: 14 },

  stepHeading: { color: "#cbd5e1", fontSize: 14, fontWeight: "700", marginBottom: 16, letterSpacing: 0.3 },

  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, minHeight: 52 },
  inputIcon: { marginRight: 10 },
  input: { color: "#fff", fontSize: 14, paddingVertical: 14 },

  btn: { borderRadius: 14, overflow: "hidden", marginTop: 6 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Email badge
  emailBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,198,255,0.08)", padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(0,198,255,0.2)" },
  emailBadgeText: { flex: 1, color: "#94a3b8", fontSize: 13 },

  // OTP
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  otpBox: { width: 44, height: 54, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#fff", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)" },
  dotFilled: { backgroundColor: "#00c6ff" },
  timerText: { color: "#64748b", fontSize: 12, textAlign: "center", marginBottom: 16 },

  // Verified badge
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.1)", padding: 10, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  verifiedText: { color: "#34d399", fontSize: 12, fontWeight: "600" },

  matchRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: -4 },

  loginLink: { alignItems: "center", marginTop: 16 },
  loginLinkText: { color: "#64748b", fontSize: 13 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  modalOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  modalOptionActive: { backgroundColor: "rgba(0,198,255,0.1)", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  modalOptionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  modalOptionText: { color: "#94a3b8", fontSize: 13, fontWeight: "500", flex: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
});