import React, { useState, useRef, useEffect } from "react";
import {
  View, StyleSheet, TextInput, Pressable,
  StatusBar, Alert, ScrollView, ActivityIndicator, Dimensions,
} from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import API from "../../services/api";

const { width } = Dimensions.get("window");

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
              <View style={[styles.stepCircle, isDone && styles.stepDone, isActive && styles.stepActive]}>
                {isDone ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={styles.stepNum}>{i + 1}</Text>}
              </View>
              <Text style={[styles.stepLabel, isActive && { color: "#a78bfa" }]}>{label}</Text>
            </View>
            {i < 2 && <View style={[styles.stepLine, isDone && { backgroundColor: "#34d399" }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const Field = ({ icon, placeholder, value, onChangeText, keyboardType, secureTextEntry, rightIcon, onRightPress }) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={18} color="#888" style={{ marginRight: 10 }} />
    <TextInput
      placeholder={placeholder} placeholderTextColor="#555"
      style={[styles.input, { flex: 1 }]} value={value} onChangeText={onChangeText}
      keyboardType={keyboardType || "default"} secureTextEntry={secureTextEntry} autoCapitalize="none"
    />
    {rightIcon && <Pressable onPress={onRightPress}><Ionicons name={rightIcon} size={18} color="#555" /></Pressable>}
  </View>
);

export default function AdminRegister() {
  const router    = useRouter();
  const inputRefs = useRef([]);

  const [step, setStep]     = useState(1);
  const [email, setEmail]   = useState("");
  const [otp, setOtp]       = useState(["","","","","",""]);
  const [form, setForm]     = useState({ name: "", phone: "", password: "", confirmPassword: "", secretKey: "" });
  const [timer, setTimer]   = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showSecret, setShowSecret]     = useState(false);

  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(30);
  useEffect(() => { opacity.value = withTiming(1,{duration:700}); translateY.value = withSpring(0,{damping:14}); }, []);
  const cardStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  useEffect(() => {
    if (timer <= 0) { if (step === 2) setOtpExpired(true); return; }
    const t = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const formatTime = () => { const m = Math.floor(timer/60); const s = timer%60; return `${m}:${s<10?"0":""}${s}`; };

  const handleSendOtp = async () => {
    if (!email.trim()) return Alert.alert("Error", "Enter email first");
    try {
      setLoading(true);
      await API.post("/auth/send-email-otp", { email: email.trim().toLowerCase() });
      setStep(2); setTimer(120); setOtpExpired(false); setOtp(["","","","","",""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e) { Alert.alert("Error", e.response?.data?.message || "Server not reachable"); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    const otpVal = otp.join("");
    if (otpVal.length !== 6) return Alert.alert("Error", "Enter full 6 digit OTP");
    if (otpExpired) return Alert.alert("Error", "OTP expired. Please resend.");
    try {
      setLoading(true);
      await API.post("/auth/verify-email-otp", { email: email.trim().toLowerCase(), otp: otpVal });
      setStep(3);
    } catch (e) { Alert.alert("Error", e.response?.data?.message || "Invalid OTP"); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!form.name.trim())   return Alert.alert("Error", "Name is required");
    if (!form.phone.trim())  return Alert.alert("Error", "Phone is required");
    if (!form.secretKey.trim()) return Alert.alert("Error", "Admin secret key is required");
    if (!form.password || form.password.length < 6) return Alert.alert("Error", "Password min 6 chars");
    if (form.password !== form.confirmPassword) return Alert.alert("Error", "Passwords do not match");
    try {
      setLoading(true);
      await API.post("/admin/register", {
        name: form.name, email: email.trim().toLowerCase(),
        phone: form.phone, password: form.password,
        secretKey: form.secretKey, role: "admin",
      });
      Alert.alert("Success 🎉", "Admin account created!", [
        { text: "Login Now", onPress: () => router.replace("/admin/login") },
      ]);
    } catch (e) { Alert.alert("Error", e.response?.data?.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  const filled = otp.filter(Boolean).length;
  const f = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a1a" }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0a0a1a","#120020","#0a0a1a"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.glow1} /><View style={styles.glow2} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.card, cardStyle]}>
          <BlurView intensity={70} tint="dark" style={styles.blur}>

            <View style={styles.logoRow}>
              <View style={styles.logoCircle}><Ionicons name="shield-checkmark-outline" size={26} color="#a78bfa" /></View>
              <View><Text style={styles.logoTitle}>Admin Registration</Text><Text style={styles.logoSub}>Create admin account</Text></View>
            </View>

            {/* Secret key warning */}
            <View style={styles.warningBadge}>
              <Ionicons name="warning-outline" size={14} color="#f59e0b" />
              <Text style={styles.warningText}>Admin secret key required to register</Text>
            </View>

            <StepBar step={step} />

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <Text style={styles.stepHeading}>Enter admin email</Text>
                <Field icon="mail-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Pressable style={[styles.btn, loading && {opacity:0.7}]} onPress={handleSendOtp} disabled={loading}>
                  <LinearGradient colors={["#7c3aed","#a78bfa"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.btnGrad}>
                    {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="mail-outline" size={18} color="#fff" /><Text style={styles.btnText}>Send OTP</Text></>}
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={() => router.replace("/admin/login")} style={styles.backLink}>
                  <Ionicons name="arrow-back" size={14} color="#64748b" />
                  <Text style={styles.backLinkText}>Already registered? Login</Text>
                </Pressable>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Text style={styles.stepHeading}>Verify your email</Text>
                <View style={styles.emailBadge}>
                  <Ionicons name="mail" size={14} color="#a78bfa" />
                  <Text style={styles.emailBadgeText}>{email}</Text>
                  <Pressable onPress={() => setStep(1)}><MaterialIcons name="edit" size={16} color="#64748b" /></Pressable>
                </View>
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index} ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[styles.otpBox, digit && { borderColor: "#a78bfa", backgroundColor: "rgba(167,139,250,0.08)" }]}
                      keyboardType="numeric" maxLength={1} value={digit}
                      onChangeText={(text) => {
                        if (!/^[0-9]?$/.test(text)) return;
                        const n = [...otp]; n[index] = text; setOtp(n);
                        if (text && index < 5) inputRefs.current[index+1]?.focus();
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index-1]?.focus();
                      }}
                    />
                  ))}
                </View>
                <View style={styles.dotsRow}>{otp.map((d,i) => <View key={i} style={[styles.dot, d && styles.dotFilled]} />)}</View>
                <Text style={[styles.timerText, otpExpired && {color:"#f87171"}]}>{otpExpired ? "⚠️ OTP Expired" : `Expires in ${formatTime()}`}</Text>
                {!otpExpired ? (
                  <Pressable style={[styles.btn,(loading||filled<6)&&{opacity:0.6}]} onPress={handleVerifyOtp} disabled={loading||filled<6}>
                    <LinearGradient colors={filled===6?["#7c3aed","#a78bfa"]:["#1a2535","#1a2535"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.btnGrad}>
                      {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.btnText}>Verify OTP</Text></>}
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                    <LinearGradient colors={["#374151","#1f2937"]} style={styles.btnGrad}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Resend OTP</Text>}
                    </LinearGradient>
                  </Pressable>
                )}
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                  <Text style={styles.verifiedText}>{email} verified</Text>
                </View>
                <Text style={styles.stepHeading}>Fill admin details</Text>
                <Field icon="person-outline" placeholder="Full Name" value={form.name} onChangeText={f("name")} />
                <Field icon="call-outline" placeholder="Phone Number" value={form.phone} onChangeText={f("phone")} keyboardType="phone-pad" />
                <Field icon="key-outline" placeholder="Admin Secret Key" value={form.secretKey} onChangeText={f("secretKey")}
                  secureTextEntry={!showSecret} rightIcon={showSecret?"eye-outline":"eye-off-outline"} onRightPress={() => setShowSecret(!showSecret)} />
                <Field icon="lock-closed-outline" placeholder="Password (min 6 chars)" value={form.password} onChangeText={f("password")}
                  secureTextEntry={!showPass} rightIcon={showPass?"eye-outline":"eye-off-outline"} onRightPress={() => setShowPass(!showPass)} />
                <Field icon="shield-checkmark-outline" placeholder="Confirm Password" value={form.confirmPassword} onChangeText={f("confirmPassword")}
                  secureTextEntry={!showConfirm} rightIcon={showConfirm?"eye-outline":"eye-off-outline"} onRightPress={() => setShowConfirm(!showConfirm)} />
                {form.confirmPassword.length > 0 && (
                  <View style={styles.matchRow}>
                    <Ionicons name={form.password===form.confirmPassword?"checkmark-circle":"close-circle"} size={14} color={form.password===form.confirmPassword?"#34d399":"#f87171"} />
                    <Text style={{color:form.password===form.confirmPassword?"#34d399":"#f87171",fontSize:12,marginLeft:5}}>
                      {form.password===form.confirmPassword?"Passwords match":"Passwords do not match"}
                    </Text>
                  </View>
                )}
                <Pressable style={[styles.btn,{marginTop:8},loading&&{opacity:0.7}]} onPress={handleRegister} disabled={loading}>
                  <LinearGradient colors={["#10b981","#059669"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.btnGrad}>
                    {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="person-add-outline" size={18} color="#fff" /><Text style={styles.btnText}>Create Admin Account</Text></>}
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </BlurView>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  scroll: { flexGrow:1,justifyContent:"center",padding:20,paddingVertical:50 },

  glow1: { position:"absolute",
    width:260,
    height:260,borderRadius:130,
    backgroundColor:"rgba(124,58,237,0.07)",
    top:-80,right:-60 },

  glow2: { position:"absolute",
    width:200,
    height:200,
    borderRadius:100,
    backgroundColor:"rgba(167,139,250,0.04)",bottom:40,left:-60 },
  card: { borderRadius:28,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.08)" },
  blur: { padding:28,backgroundColor:"rgba(255,255,255,0.04)" },
  logoRow: { flexDirection:"row",alignItems:"center",gap:12,marginBottom:16 },
  logoCircle: { width:52,height:52,borderRadius:16,backgroundColor:"rgba(124,58,237,0.12)",borderWidth:1,borderColor:"rgba(167,139,250,0.25)",justifyContent:"center",alignItems:"center" },
  logoTitle: { color:"#fff",fontSize:18,fontWeight:"800" },
  logoSub: { color:"#64748b",fontSize:12,marginTop:2 },
  warningBadge: { flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(245,158,11,0.1)",padding:10,borderRadius:10,marginBottom:16,borderWidth:1,borderColor:"rgba(245,158,11,0.2)" },
  warningText: { color:"#f59e0b",fontSize:12,fontWeight:"600",flex:1 },
  stepBar: { flexDirection:"row",alignItems:"center",justifyContent:"center",marginBottom:24 },
  stepItem: { alignItems:"center",gap:4 },
  stepCircle: { width:28,height:28,borderRadius:14,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center",borderWidth:1,borderColor:"rgba(255,255,255,0.1)" },
  stepActive: { backgroundColor:"rgba(124,58,237,0.2)",borderColor:"#a78bfa" },
  stepDone: { backgroundColor:"#34d399",borderColor:"#34d399" },
  stepNum: { color:"#64748b",fontSize:11,fontWeight:"700" },
  stepLabel: { color:"#374151",fontSize:9,fontWeight:"700" },
  stepLine: { width:36,height:1,backgroundColor:"rgba(255,255,255,0.08)",marginHorizontal:4,marginBottom:14 },
  stepHeading: { color:"#cbd5e1",fontSize:14,fontWeight:"700",marginBottom:16 },
  inputWrapper: { flexDirection:"row",alignItems:"center",backgroundColor:"rgba(255,255,255,0.06)",borderRadius:14,marginBottom:12,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",paddingHorizontal:14,minHeight:52 },
  input: { color:"#fff",fontSize:14,paddingVertical:14 },
  btn: { borderRadius:14,overflow:"hidden",marginTop:6 },
  btnGrad: { flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:15,borderRadius:14 },
  btnText: { color:"#fff",fontWeight:"700",fontSize:15 },
  emailBadge: { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(124,58,237,0.08)",padding:12,borderRadius:12,marginBottom:20,borderWidth:1,borderColor:"rgba(167,139,250,0.2)" },
  emailBadgeText: { flex:1,color:"#94a3b8",fontSize:13 },
  otpRow: { flexDirection:"row",justifyContent:"space-between",marginBottom:10 },
  otpBox: { width:44,height:54,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:12,textAlign:"center",fontSize:22,fontWeight:"800",color:"#fff",borderWidth:1.5,borderColor:"rgba(255,255,255,0.1)" },
  dotsRow: { flexDirection:"row",justifyContent:"center",gap:6,marginBottom:10 },
  dot: { width:6,height:6,borderRadius:3,backgroundColor:"rgba(255,255,255,0.1)" },
  dotFilled: { backgroundColor:"#a78bfa" },
  timerText: { color:"#64748b",fontSize:12,textAlign:"center",marginBottom:16 },
  verifiedBadge: { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(52,211,153,0.1)",padding:10,borderRadius:10,marginBottom:16,borderWidth:1,borderColor:"rgba(52,211,153,0.2)" },
  verifiedText: { color:"#34d399",fontSize:12,fontWeight:"600" },
  matchRow: { flexDirection:"row",alignItems:"center",marginBottom:8,marginTop:-4 },
  backLink: { flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,marginTop:16 },
  backLinkText: { color:"#64748b",fontSize:13 },
});