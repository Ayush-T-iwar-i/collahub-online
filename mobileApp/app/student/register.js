import React, { useEffect, useState, useRef } from "react";
import { MaterialIcons } from "@expo/vector-icons";
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
    "Robotics Engineering",
    "Mechatronics Engineering",
    "Automobile Engineering",
    "Aerospace Engineering",
    "Biotechnology Engineering",
    "Production Engineering",
    "Industrial Engineering",
    "Petroleum Engineering",
    "Mining Engineering",
    "Environmental Engineering",
    "Structural Engineering",
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
  const [filteredDepartments, setFilteredDepartments] =
    useState(departments);
  const [showGenderOptions, setShowGenderOptions] =
    useState(false);
    const [showCollegeOptions, setShowCollegeOptions] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    department: "",
    phone: "",
    studentId: "",
    gender: "",
    admissionYear: "",
  });

  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [showEmailOtpInput, setShowEmailOtpInput] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [timer, setTimer] = useState(120);
  const [otpExpired, setOtpExpired] = useState(false);

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 10000 }),
      -1,
      true
    );
  }, []);

  const animatedBgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    let interval;

    if (showEmailOtpInput && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    if (timer === 0 && showEmailOtpInput) {
      setOtpExpired(true);
    }

    return () => clearInterval(interval);
  }, [showEmailOtpInput, timer]);

  const handleSendEmailOtp = async () => {
    if (!form.email) {
      Alert.alert("Error", "Enter email first");
      return;
    }

    try {
      setEmailChecking(true);

      await API.post("/send-email-otp", {
        email: form.email.trim().toLowerCase(),
      });

      setShowEmailOtpInput(true);
      setTimer(120);
      setOtpExpired(false);
      setEmailOtp(["", "", "", "", "", ""]);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Server not reachable"
      );
    } finally {
      setEmailChecking(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const otp = emailOtp.join("");

    if (otp.length !== 6) {
      Alert.alert("Error", "Enter full 6 digit OTP");
      return;
    }

    if (otpExpired) {
      Alert.alert("Error", "OTP Expired. Please resend.");
      return;
    }

    try {
      setVerifyingOtp(true);

      await API.post("/verify-email-otp", {
        email: form.email.trim().toLowerCase(),
        otp,
      });

      setEmailVerified(true);
      setShowEmailOtpInput(false);
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Invalid OTP"
      );
    } finally {
      setVerifyingOtp(false);
    }
  };


const handleRegister = async () => {
  if (!emailVerified) {
    Alert.alert("Error", "Verify email first");
    return;
  }

  if (!form.name.trim())
    return Alert.alert("Error", "Full Name is required");

  if (!form.phone.trim())
    return Alert.alert("Error", "Phone Number is required");

  if (!form.studentId.trim())
    return Alert.alert("Error", "Student ID is required");

  if (!form.admissionYear.trim())
    return Alert.alert("Error", "Admission Year is required");

  if (!form.college)
    return Alert.alert("Error", "Please select college");

  if (!form.department)
    return Alert.alert("Error", "Please select department");

  if (!form.gender)
    return Alert.alert("Error", "Please select gender");

  if (!form.password || form.password.length < 6)
    return Alert.alert("Error", "Password must be at least 6 characters");

  try {
    

    await API.post("/student/register", {
      ...form,
      email: form.email.trim().toLowerCase(),
    });

    Alert.alert("Success", "Registration Successful 🎉", [
      {
        text: "OK",
        onPress: () => router.replace("/student-login"),
      },
    ]);

  } catch (error) {
    console.log("REGISTER ERROR:", error.response?.data);
    Alert.alert(
      "Error",
      error.response?.data?.message || "Registration failed"
    );
  }
};

  const formatTime = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      <Animated.Image
        source={require("../../assets/register-bg.jpg")}
        style={[StyleSheet.absoluteFillObject, animatedBgStyle]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.7)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Student Registration</Text>

        {!emailVerified && !showEmailOtpInput && (
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
              style={styles.verifyBtn}
              onPress={handleSendEmailOtp}
            >
              <Text style={styles.btnText}>
                {emailChecking ? "Sending..." : "Verify Email"}
              </Text>
            </Pressable>
          </>
        )}

        {showEmailOtpInput && (
          <>
          {/* Email Bold Row */}
            <View style={styles.emailRow}>
              <Text style={styles.boldEmail}>{form.email}</Text>
              <Pressable
                style={styles.editIcon}
                onPress={() => {
                  setShowEmailOtpInput(false);
                  setEmailOtp(["", "", "", "", "", ""]);
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

            <Pressable
              style={styles.btn}
              onPress={
                otpExpired ? handleSendEmailOtp : handleVerifyEmailOtp
              }
            >
              <Text style={styles.btnText}>
                {otpExpired
                  ? "Resend OTP"
                  : verifyingOtp
                  ? "Verifying..."
                  : "Submit OTP"}
              </Text>
            </Pressable>

            <Text style={{ color: "#fff", marginTop: 10 }}>
              {otpExpired
                ? "OTP Expired"
                : `OTP expires in ${formatTime()}`}
            </Text>
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
              placeholder="Phone Number"
              placeholderTextColor="#ccc"
              style={styles.input}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(text) =>
                setForm({ ...form, phone: text })
              }
            />

            <TextInput
              placeholder="Student ID"
              placeholderTextColor="#ccc"
              style={styles.input}
              value={form.studentId}
              onChangeText={(text) =>
                setForm({ ...form, studentId: text })
              }
            />

            <TextInput
              placeholder="Admission Year (e.g. 2024)"
              placeholderTextColor="#ccc"
              style={styles.input}
              keyboardType="numeric"
              maxLength={4}
              value={form.admissionYear}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  admissionYear: text.replace(/[^0-9]/g, ""),
                })
              }
            />
{/* College */}
<Pressable
  style={styles.input}
  onPress={() => setShowCollegeOptions(!showCollegeOptions)}
>
  <Text style={{ color: form.college ? "#fff" : "#ccc" }}>
    {form.college || "Select College"}
  </Text>
</Pressable>

{showCollegeOptions && (
  <View
    style={{
      width: 280,
      backgroundColor: "#222",
      borderRadius: 10,
      marginBottom: 15,
    }}
  >
    <ScrollView style={{ maxHeight: 150 }}>

{colleges.map((collegeItem, index) => (
  <Pressable
    key={index}
    style={{ padding: 12 }}
    onPress={() => {
      setForm((prev) => ({
        ...prev,
        college: collegeItem,
      }));
      setShowCollegeOptions(false);
    }}
  >
    <Text style={{ color: "#fff" }}>{collegeItem}</Text>
  </Pressable>
))}


    </ScrollView>
  </View>
)}

              {/* Department */}
            <TextInput
              placeholder="Department"
              placeholderTextColor="#ccc"
              style={styles.input}
              value={form.department}
              onFocus={() => setShowDeptOptions(true)}
              onChangeText={(text) => {
                setForm({ ...form, department: text });
                const filtered = departments.filter((dept) =>
                  dept.toLowerCase().includes(text.toLowerCase())
                );
                setFilteredDepartments(filtered);
              }}
            />

            {showDeptOptions && (
              <View style={{ width: 280, backgroundColor: "#222", borderRadius: 10 }}>
                <ScrollView style={{ maxHeight: 150 }}>
                  {filteredDepartments.map((dept, index) => (
                    <Pressable
                      key={index}
                      style={{ padding: 12 }}
                      onPress={() => {
                        setForm({ ...form, department: dept });
                        setShowDeptOptions(false);
                      }}
                    >
                      <Text style={{ color: "#fff" }}>{dept}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Gender */}
            <Pressable
              style={styles.input}
              onPress={() => setShowGenderOptions(!showGenderOptions)}
            >
              <Text style={{ color: form.gender ? "#fff" : "#ccc" }}>
                {form.gender || "Select Gender"}
              </Text>
            </Pressable>

            {showGenderOptions &&
              genders.map((gender, index) => (
                <Pressable
                  key={index}
                  style={{ padding: 12, width: 280, backgroundColor: "#222" }}
                  onPress={() => {
                    setForm({ ...form, gender });
                    setShowGenderOptions(false);
                  }}
                >
                  <Text style={{ color: "#fff" }}>{gender}</Text>
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
    backgroundColor: "#00c6ff",
    padding: 15,
    width: 280,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  verifyBtn: {
    backgroundColor: "#28a745",
    padding: 12,
    width: 280,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emailRow: {
    width: 280,
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  boldEmail: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  editIcon: {
    position: "absolute",
    right: 0,
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