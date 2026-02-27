import React, { useState, useRef, useEffect } from "react";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  Alert,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import API from "../../services/api";

export default function StudentRegister() {
  const router = useRouter();
  const inputRefs = useRef([]);

  const departments = [
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

  const colleges = [
    "Nims Institute of Engineering and Technology",
    "Nims College of Management Studies",
    "Nims College of Nursing",
    "Nims College of Pharmacy",
    "Nims College of Law",
    "Nims College of Dental",
  ];

  const genders = ["Male", "Female", "Other"];

  const [showDeptOptions, setShowDeptOptions] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState(departments);
  const [showGenderOptions, setShowGenderOptions] = useState(false);
  const [showCollegeOptions, setShowCollegeOptions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", college: "",
    department: "", phone: "", studentId: "", gender: "", admissionYear: "",
  });

  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [showEmailOtpInput, setShowEmailOtpInput] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [timer, setTimer] = useState(120);
  const [otpExpired, setOtpExpired] = useState(false);

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.2, { duration: 12000 }), -1, true);
  }, []);

  const animatedBgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    let interval;
    if (showEmailOtpInput && timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    }
    if (timer === 0 && showEmailOtpInput) setOtpExpired(true);
    return () => clearInterval(interval);
  }, [showEmailOtpInput, timer]);

  const handleSendEmailOtp = async () => {
    if (!form.email) return Alert.alert("Error", "Enter email first");
    try {
      setEmailChecking(true);
      // ✅ Fixed: /auth/send-email-otp
      await API.post("/auth/send-email-otp", {
        email: form.email.trim().toLowerCase(),
      });
      setShowEmailOtpInput(true);
      setTimer(120);
      setOtpExpired(false);
      setEmailOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Server not reachable");
    } finally {
      setEmailChecking(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const otp = emailOtp.join("");
    if (otp.length !== 6) return Alert.alert("Error", "Enter full 6 digit OTP");
    if (otpExpired) return Alert.alert("Error", "OTP Expired. Please resend.");
    try {
      setVerifyingOtp(true);
      // ✅ Fixed: /auth/verify-email-otp
      await API.post("/auth/verify-email-otp", {
        email: form.email.trim().toLowerCase(),
        otp,
      });
      setEmailVerified(true);
      setShowEmailOtpInput(false);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Invalid OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegister = async () => {
    if (!emailVerified) return Alert.alert("Error", "Verify email first");
    if (!form.name.trim()) return Alert.alert("Error", "Full Name is required");
    if (!form.phone.trim()) return Alert.alert("Error", "Phone Number is required");
    if (!form.studentId.trim()) return Alert.alert("Error", "Student ID is required");
    if (!form.admissionYear.trim()) return Alert.alert("Error", "Admission Year is required");
    if (!form.college) return Alert.alert("Error", "Please select college");
    if (!form.department) return Alert.alert("Error", "Please select department");
    if (!form.gender) return Alert.alert("Error", "Please select gender");
    if (!form.password || form.password.length < 6)
      return Alert.alert("Error", "Password must be at least 6 characters");

    try {
      setRegistering(true);
      // ✅ Fixed: /auth/register
      await API.post("/auth/register", {
        ...form,
        email: form.email.trim().toLowerCase(),
      });
      Alert.alert("Success 🎉", "Registration Successful! Please verify your email OTP to login.", [
        { text: "OK", onPress: () => router.replace("/(auth)/student-login") },
      ]);
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const formatTime = () => {
    const m = Math.floor(timer / 60);
    const s = timer % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const InputField = ({ placeholder, value, onChangeText, keyboardType, secureEntry, maxLength }) => (
    <View style={styles.inputWrapper}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#888"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureEntry}
        maxLength={maxLength}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      <Animated.Image
        source={require("../../assets/register-bg.jpg")}
        style={[StyleSheet.absoluteFillObject, animatedBgStyle]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "rgba(0,10,30,0.88)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Student Registration</Text>
        <Text style={styles.subtitle}>Join CollaHub today</Text>

        {/* STEP 1 — Email Verification */}
        {!emailVerified && !showEmailOtpInput && (
          <View style={styles.section}>
            <Text style={styles.stepLabel}>Step 1 — Verify your email</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput
                placeholder="Email address"
                placeholderTextColor="#888"
                style={styles.input}
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <Pressable style={styles.verifyBtn} onPress={handleSendEmailOtp} disabled={emailChecking}>
              <LinearGradient colors={["#10b981", "#059669"]} style={styles.btnGrad}>
                <Text style={styles.btnText}>
                  {emailChecking ? "Sending OTP..." : "Send OTP"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* OTP INPUT */}
        {showEmailOtpInput && (
          <View style={styles.section}>
            <View style={styles.emailRow}>
              <Text style={styles.boldEmail}>{form.email}</Text>
              <Pressable onPress={() => { setShowEmailOtpInput(false); setEmailOtp(["", "", "", "", "", ""]); }}>
                <MaterialIcons name="edit" size={20} color="#00c6ff" />
              </Pressable>
            </View>

            <View style={styles.otpContainer}>
              {emailOtp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={styles.otpBox}
                  keyboardType="numeric"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => {
                    if (!/^[0-9]?$/.test(text)) return;
                    const newOtp = [...emailOtp];
                    newOtp[index] = text;
                    setEmailOtp(newOtp);
                    if (text && index < 5) inputRefs.current[index + 1]?.focus();
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !emailOtp[index] && index > 0) {
                      inputRefs.current[index - 1]?.focus();
                    }
                  }}
                />
              ))}
            </View>

            <Text style={styles.timerText}>
              {otpExpired ? "⚠️ OTP Expired" : `Expires in ${formatTime()}`}
            </Text>

            <Pressable
              style={styles.verifyBtn}
              onPress={otpExpired ? handleSendEmailOtp : handleVerifyEmailOtp}
              disabled={verifyingOtp}
            >
              <LinearGradient colors={["#0072ff", "#00c6ff"]} style={styles.btnGrad}>
                <Text style={styles.btnText}>
                  {otpExpired ? "Resend OTP" : verifyingOtp ? "Verifying..." : "Verify OTP"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* STEP 2 — Registration Form */}
        {emailVerified && (
          <View style={styles.section}>
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="check-circle" size={22} color="#10b981" />
              <Text style={styles.verifiedText}>Email Verified</Text>
            </View>

            <Text style={styles.stepLabel}>Step 2 — Fill your details</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput placeholder="Full Name" placeholderTextColor="#888" style={styles.input}
                value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput placeholder="Phone Number" placeholderTextColor="#888" style={styles.input}
                keyboardType="phone-pad" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput placeholder="Student ID" placeholderTextColor="#888" style={styles.input}
                value={form.studentId} onChangeText={(t) => setForm({ ...form, studentId: t })} />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput placeholder="Admission Year (e.g. 2024)" placeholderTextColor="#888" style={styles.input}
                keyboardType="numeric" maxLength={4} value={form.admissionYear}
                onChangeText={(t) => setForm({ ...form, admissionYear: t.replace(/[^0-9]/g, "") })} />
            </View>

            {/* College Picker */}
            <Pressable style={styles.inputWrapper} onPress={() => setShowCollegeOptions(!showCollegeOptions)}>
              <Ionicons name="business-outline" size={18} color="#888" style={styles.inputIcon} />
              <Text style={[styles.input, { color: form.college ? "#fff" : "#888", paddingVertical: 16 }]}>
                {form.college || "Select College"}
              </Text>
              <Ionicons name={showCollegeOptions ? "chevron-up" : "chevron-down"} size={18} color="#888" />
            </Pressable>
            {showCollegeOptions && (
              <View style={styles.dropdown}>
                {colleges.map((c, i) => (
                  <Pressable key={i} style={styles.dropdownItem}
                    onPress={() => { setForm({ ...form, college: c }); setShowCollegeOptions(false); }}>
                    <Text style={styles.dropdownText}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Department */}
            <View style={styles.inputWrapper}>
              <Ionicons name="school-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput placeholder="Department" placeholderTextColor="#888" style={styles.input}
                value={form.department}
                onFocus={() => setShowDeptOptions(true)}
                onChangeText={(t) => {
                  setForm({ ...form, department: t });
                  setFilteredDepartments(departments.filter(d => d.toLowerCase().includes(t.toLowerCase())));
                }} />
            </View>
            {showDeptOptions && (
              <View style={styles.dropdown}>
                <ScrollView style={{ maxHeight: 160 }}>
                  {filteredDepartments.map((d, i) => (
                    <Pressable key={i} style={styles.dropdownItem}
                      onPress={() => { setForm({ ...form, department: d }); setShowDeptOptions(false); }}>
                      <Text style={styles.dropdownText}>{d}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Gender */}
            <Pressable style={styles.inputWrapper} onPress={() => setShowGenderOptions(!showGenderOptions)}>
              <Ionicons name="people-outline" size={18} color="#888" style={styles.inputIcon} />
              <Text style={[styles.input, { color: form.gender ? "#fff" : "#888", paddingVertical: 16 }]}>
                {form.gender || "Select Gender"}
              </Text>
              <Ionicons name={showGenderOptions ? "chevron-up" : "chevron-down"} size={18} color="#888" />
            </Pressable>
            {showGenderOptions && (
              <View style={styles.dropdown}>
                {genders.map((g, i) => (
                  <Pressable key={i} style={styles.dropdownItem}
                    onPress={() => { setForm({ ...form, gender: g }); setShowGenderOptions(false); }}>
                    <Text style={styles.dropdownText}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Password */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#888" style={styles.inputIcon} />
              <TextInput placeholder="Password (min 6 chars)" placeholderTextColor="#888"
                style={[styles.input, { flex: 1 }]}
                secureTextEntry={!showPassword} value={form.password}
                onChangeText={(t) => setForm({ ...form, password: t })} />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color="#888" />
              </Pressable>
            </View>

            <Pressable style={styles.registerBtn} onPress={handleRegister} disabled={registering}>
              <LinearGradient colors={["#0072ff", "#00c6ff"]} style={styles.btnGrad}>
                <Text style={styles.btnText}>
                  {registering ? "Registering..." : "Create Account"}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/student-login")} style={{ alignItems: "center", marginTop: 16 }}>
              <Text style={{ color: "#888" }}>
                Already have an account? <Text style={{ color: "#00c6ff", fontWeight: "700" }}>Login</Text>
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    marginBottom: 28,
  },
  section: {
    width: "100%",
    maxWidth: 420,
  },
  stepLabel: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 14,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 15,
  },
  verifyBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 6,
    marginBottom: 10,
  },
  registerBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
  },
  btnGrad: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 14,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "rgba(0,198,255,0.08)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,198,255,0.2)",
  },
  boldEmail: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  otpBox: {
    width: 46,
    height: 56,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  timerText: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  verifiedText: {
    color: "#10b981",
    fontWeight: "700",
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: "#1a2535",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dropdownText: {
    color: "#cbd5e1",
    fontSize: 14,
  },
});