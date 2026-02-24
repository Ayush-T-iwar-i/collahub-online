import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import API from "../../services/api";

export default function TeacherRegister() {
  const router = useRouter();
  const inputRefs = useRef([]);

  const colleges = [
    "Nims Institute of Engineering and Technology",
    "Nims College of Management Studies",
    "Nims College of Nursing",
    "Nims College of Pharmacy",
    "Nims College of Law",
    "Nims College of Dental",
  ];

  const [form, setForm] = useState({
    email: "",
    name: "",
    age: "",
    phone: "",
    university: "",
    college: "",
    password: "",
  });

  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showCollegeOptions, setShowCollegeOptions] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // TIMER
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && showOtpInput) {
      setOtpExpired(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // SEND OTP
  const handleSendEmailOtp = async () => {
    if (!form.email) {
      Alert.alert("Error", "Enter email first");
      return;
    }

    try {
      setSendingOtp(true);
      await API.post("/send-email-otp", {
        email: form.email.trim().toLowerCase(),
      });

      setShowOtpInput(true);
      setTimer(120);
      setOtpExpired(false);
      setEmailOtp(["", "", "", "", "", ""]);

      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Server not reachable"
      );
    } finally {
      setSendingOtp(false);
    }
  };

  // VERIFY OTP
  const handleVerifyEmailOtp = async () => {
    const finalOtp = emailOtp.join("");

    if (finalOtp.length !== 6) {
      Alert.alert("Error", "Enter complete 6 digit OTP");
      return;
    }

    try {
      setVerifyingOtp(true);

      await API.post("/verify-email-otp", {
        email: form.email.trim().toLowerCase(),
        otp: finalOtp,
      });

      setEmailVerified(true);
      setShowOtpInput(false);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Invalid OTP"
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  // REGISTER
const handleRegister = async () => {
  if (!emailVerified) {
    Alert.alert("Error", "Please verify your email first");
    return;
  }

  if (
    !form.email.trim() ||
    !form.name.trim() ||
    !form.age.trim() ||
    !form.phone.trim() ||
    !form.university.trim() ||
    !form.college.trim() ||
    !form.password.trim()
  ) {
    Alert.alert("Error", "All fields are required");
    return;
  }

  try {
    await API.post("/teacher/register", {
      ...form,
      email: form.email.trim().toLowerCase(),
      role: "teacher",
    });

    Alert.alert("Success", "Teacher Registered 🎉", [
      {
        text: "OK",
        onPress: () => router.replace("/teacher-login"),
      },
    ]);
  } catch (error) {
    Alert.alert(
      "Error",
      error.response?.data?.message || "Registration failed"
    );
  }
};

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      <Image
        source={require("../../assets/teacher-reg-bg.jpg")}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.8)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Teacher Registration</Text>

        {!emailVerified && (
          <>
            {!showOtpInput && (
              <>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#ccc"
                  style={styles.input}
                  value={form.email}
                  onChangeText={(text) =>
                    setForm({ ...form, email: text })
                  }
                />

                <Pressable
                  style={styles.btn}
                  onPress={handleSendEmailOtp}
                  disabled={sendingOtp}
                >
                  <Text style={styles.btnText}>
                    {sendingOtp ? "Sending..." : "Verify Email"}
                  </Text>
                </Pressable>
              </>
            )}

            {showOtpInput && (
              <>
                {/* Email Bold Row */}
                <View style={styles.emailRow}>
                  <Text style={styles.verifiedEmail}>
                    {form.email}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setShowOtpInput(false);
                      setEmailOtp(["", "", "", "", "", ""]);
                      setTimer(0);
                    }}
                  >
                    <MaterialIcons name="edit" size={22} color="#fff" />
                  </Pressable>
                </View>

                {/* OTP BOXES */}
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

                        if (text && index < 5) {
                          inputRefs.current[index + 1]?.focus();
                        }
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (
                          nativeEvent.key === "Backspace" &&
                          !emailOtp[index] &&
                          index > 0
                        ) {
                          inputRefs.current[index - 1]?.focus();
                        }
                      }}
                    />
                  ))}
                </View>

                {!otpExpired ? (
                  <Pressable
                    style={styles.btn}
                    onPress={handleVerifyEmailOtp}
                    disabled={verifyingOtp}
                  >
                    <Text style={styles.btnText}>
                      {verifyingOtp ? "Verifying..." : "Submit OTP"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.btn}
                    onPress={handleSendEmailOtp}
                  >
                    <Text style={styles.btnText}>Resend OTP</Text>
                  </Pressable>
                )}

                <Text style={{ color: "#fff" }}>
                  {timer > 0
                    ? `OTP expires in ${timer}s`
                    : "OTP Expired"}
                </Text>
              </>
            )}
          </>
        )}

        {emailVerified && (
          <>
           <View style={{ alignItems: "center", marginBottom: 15 }}>
                        <MaterialIcons name="check-circle" size={50} color="#28a745" />
                      </View>

            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#ccc"
              style={styles.input}
              value={form.name}
              onChangeText={(text) =>
                setForm({ ...form, name: text })
              }
            />

            <TextInput
              placeholder="Age"
              placeholderTextColor="#ccc"
              style={styles.input}
              keyboardType="numeric"
              value={form.age}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  age: text.replace(/[^0-9]/g, ""),
                })
              }
            />

            <TextInput
              placeholder="Phone"
              placeholderTextColor="#ccc"
              style={styles.input}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(text) =>
                setForm({ ...form, phone: text })
              }
            />

            <TextInput
              placeholder="University"
              placeholderTextColor="#ccc"
              style={styles.input}
              value={form.university}
              onChangeText={(text) =>
                setForm({ ...form, university: text })
              }
            />

            <Pressable
              style={styles.input}
              onPress={() =>
                setShowCollegeOptions(!showCollegeOptions)
              }
            >
              <Text style={{ color: form.college ? "#fff" : "#ccc" }}>
                {form.college || "Select College"}
              </Text>
            </Pressable>

            {showCollegeOptions &&
              colleges.map((college, index) => (
                <Pressable
                  key={index}
                  style={styles.option}
                  onPress={() => {
                    setForm({ ...form, college });
                    setShowCollegeOptions(false);
                  }}
                >
                  <Text style={{ color: "#fff" }}>
                    {college}
                  </Text>
                </Pressable>
              ))}

            <TextInput
              placeholder="Password"
              placeholderTextColor="#ccc"
              style={styles.input}
              secureTextEntry
              value={form.password}
              onChangeText={(text) =>
                setForm({ ...form, password: text })
              }
            />

            <Pressable style={styles.btn} onPress={handleRegister}>
              <Text style={styles.btnText}>Register</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  title: {
    fontSize: 26,
    color: "#fff",
    marginBottom: 30,
    fontWeight: "bold",
  },
  input: {
    width: 280,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    color: "#fff",
  },
  btn: {
    backgroundColor: "#0077B5",
    padding: 15,
    width: 280,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  option: {
    width: 280,
    padding: 12,
    backgroundColor: "#222",
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 280,
    marginBottom: 20,
  },
  verifiedEmail: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 280,
    marginBottom: 20,
  },
  otpBox: {
    width: 40,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 20,
    color: "#fff",
  },
});