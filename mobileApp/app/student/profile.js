import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Alert,
  BackHandler,
  ToastAndroid,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

// ── Animated Info Row ──
const InfoRow = ({ icon, label, value, color = "#00c6ff", delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.infoRow, {
      opacity: anim,
      transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
    }]}>
      <View style={[styles.infoIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </Animated.View>
  );
};

// ── Stat Pill ──
const StatPill = ({ label, value, color }) => (
  <View style={[styles.statPill, { borderColor: color + "40" }]}>
    <Text style={[styles.statPillValue, { color }]}>{value || "—"}</Text>
    <Text style={styles.statPillLabel}>{label}</Text>
  </View>
);

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const cardRef = useRef(null);
  const router = useRouter();
  const navigation = useNavigation();
  const backPressCount = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const data = await AsyncStorage.getItem("studentData");
        if (data) {
          const parsed = JSON.parse(data);
          setStudent(parsed);
          const savedImage = await AsyncStorage.getItem(`profileImage_${parsed.studentId}`);
          setProfileImage(savedImage || null);
        }
      };
      loadData();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (backPressCount.current === 0) {
          backPressCount.current = 1;
          ToastAndroid.show("Press back again to go to Dashboard", ToastAndroid.SHORT);
          setTimeout(() => { backPressCount.current = 0; }, 2000);
          return true;
        }
        router.replace("/student/dashboard");
        return true;
      };
      const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => handler.remove();
    }, [])
  );

  const changeProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const newImage = result.assets[0].uri;
      setProfileImage(newImage);
      await AsyncStorage.setItem(`profileImage_${student.studentId}`, newImage);
    }
  };

  const downloadCard = async () => {
    try {
      setDownloading(true);
      const uri = await captureRef(cardRef.current, { format: "png", quality: 1 });
      const fileUri = FileSystem.documentDirectory + "student-id-card.png";
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Saved!", "ID Card saved to device.");
      }
    } catch {
      Alert.alert("Error", "Could not download ID card");
    } finally {
      setDownloading(false);
    }
  };

  if (!student) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00c6ff" />
        <Text style={styles.loaderText}>Loading profile...</Text>
      </View>
    );
  }

  const imageSource = profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // Parallax header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [260, 160],
    extrapolate: "clamp",
  });
  const avatarScale = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.7],
    extrapolate: "clamp",
  });
  const nameFade = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const infoItems = [
    { icon: "mail-outline",             label: "Email",           value: student.email,          color: "#00c6ff", delay: 0   },
    { icon: "call-outline",             label: "Phone",           value: student.phone,          color: "#34d399", delay: 50  },
    { icon: "card-outline",             label: "Student ID",      value: student.studentId,      color: "#a78bfa", delay: 100 },
    { icon: "school-outline",           label: "Department",      value: student.department,     color: "#fbbf24", delay: 150 },
    { icon: "business-outline",         label: "College",         value: student.college,        color: "#f87171", delay: 200 },
    { icon: "calendar-outline",         label: "Admission Year",  value: student.admissionYear,  color: "#60a5fa", delay: 250 },
    { icon: "male-female-outline",      label: "Gender",          value: student.gender,         color: "#fb923c", delay: 300 },
    { icon: "shield-checkmark-outline", label: "Role",            value: student.role,           color: "#34d399", delay: 350 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* ── HERO SECTION ── */}
        <Animated.View style={[styles.hero, { height: headerHeight }]}>
          <LinearGradient
            colors={["#0a0f1e", "#0f2744", "#0a1628"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Decorative circles */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          {/* Menu + Edit buttons */}
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => navigation.openDrawer()} style={styles.heroBtn}>
              <Ionicons name="menu" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.heroTopTitle}>My Profile</Text>
            <Pressable onPress={changeProfileImage} style={styles.heroBtn}>
              <Ionicons name="camera-outline" size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Avatar */}
          <Animated.View style={[styles.avatarSection, { transform: [{ scale: avatarScale }] }]}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarRing2}>
                <Image source={{ uri: imageSource }} style={styles.avatar} />
              </View>
            </View>
            <Pressable style={styles.cameraBtn} onPress={changeProfileImage}>
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </Pressable>
          </Animated.View>

          {/* Name */}
          <Animated.View style={{ opacity: nameFade, alignItems: "center" }}>
            <Text style={styles.heroName}>{student.name}</Text>
            <Text style={styles.heroSub}>
              {student.studentId} · {student.role}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* ── STATS ROW ── */}
        <View style={styles.statsSection}>
          <BlurView intensity={20} tint="dark" style={styles.statsBlur}>
            <StatPill label="Year" value={student.admissionYear} color="#00c6ff" />
            <View style={styles.statsDivider} />
            <StatPill label="Gender" value={student.gender} color="#a78bfa" />
            <View style={styles.statsDivider} />
            <StatPill label="Role" value={student.role} color="#34d399" />
          </BlurView>
        </View>

        {/* ── BADGES ── */}
        <View style={styles.badgesRow}>
          {student.department && (
            <LinearGradient colors={["#0072ff33", "#00c6ff22"]} style={styles.deptBadge}>
              <Ionicons name="school" size={13} color="#00c6ff" />
              <Text style={styles.deptBadgeText} numberOfLines={1}>
                {student.department.split("(")[0].trim()}
              </Text>
            </LinearGradient>
          )}
          {student.college && (
            <LinearGradient colors={["#a78bfa33", "#7c3aed22"]} style={styles.deptBadge}>
              <Ionicons name="business" size={13} color="#a78bfa" />
              <Text style={[styles.deptBadgeText, { color: "#a78bfa" }]} numberOfLines={1}>
                {student.college.split(" ").slice(0, 2).join(" ")}
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* ── ID CARD ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={16} color="#00c6ff" />
            <Text style={styles.sectionTitle}>Student ID Card</Text>
          </View>

          <View ref={cardRef} collapsable={false}>
            <LinearGradient
              colors={["#0f2744", "#0a1628", "#0d1f3c"]}
              style={styles.idCard}
            >
              {/* Card top accent */}
              <LinearGradient
                colors={["#00c6ff", "#0072ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.idCardAccent}
              />

              {/* College header */}
              <View style={styles.idCardHeader}>
                <View style={styles.idCardLogoWrap}>
                  <Ionicons name="school" size={18} color="#00c6ff" />
                </View>
                <Text style={styles.idCardCollege} numberOfLines={1}>
                  {student.college || "College Name"}
                </Text>
                <Text style={styles.idCardType}>STUDENT</Text>
              </View>

              {/* Body */}
              <View style={styles.idCardBody}>
                <Image
                  source={{ uri: imageSource }}
                  style={styles.idCardPhoto}
                />
                <View style={styles.idCardInfo}>
                  <Text style={styles.idCardName}>{student.name}</Text>
                  <Text style={styles.idCardId}>#{student.studentId}</Text>
                  <View style={styles.idCardDivider} />
                  <Text style={styles.idCardMeta} numberOfLines={2}>
                    {student.department}
                  </Text>
                  <Text style={styles.idCardMeta}>{student.email}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.idCardFooter}>
                <View style={styles.idCardQr}>
                  <QRCode
                    value={student.studentId || "N/A"}
                    size={65}
                    backgroundColor="transparent"
                    color="#ffffff"
                  />
                </View>
                <View style={styles.idCardFooterRight}>
                  <View style={styles.validBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#34d399" />
                    <Text style={styles.validText}>VALID</Text>
                  </View>
                  <Text style={styles.idCardYear}>Batch {student.admissionYear}</Text>
                  <Text style={styles.idCardWatermark}>COLLAहUB</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <Pressable
            style={[styles.downloadBtn, downloading && { opacity: 0.7 }]}
            onPress={downloadCard}
            disabled={downloading}
          >
            <LinearGradient
              colors={["#0072ff", "#00c6ff"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.downloadGrad}
            >
              {downloading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.downloadText}>Download ID Card</Text>
                  </>
              }
            </LinearGradient>
          </Pressable>
        </View>

        {/* ── INFO SECTION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={16} color="#a78bfa" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.infoCard}>
            {infoItems.map((item, i) => (
              <InfoRow
                key={i}
                icon={item.icon}
                label={item.label}
                value={item.value}
                color={item.color}
                delay={item.delay}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  loaderContainer: {
    flex: 1, justifyContent: "center",
    alignItems: "center", backgroundColor: "#080d17", gap: 12,
  },
  loaderText: { color: "#374151", fontSize: 14 },

  // Hero
  hero: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 20,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 200, height: 200,
    borderRadius: 100, top: -60, left: -60,
    backgroundColor: "rgba(0,198,255,0.06)",
  },
  circle2: {
    position: "absolute", width: 150, height: 150,
    borderRadius: 75, top: 20, right: -40,
    backgroundColor: "rgba(167,139,250,0.06)",
  },
  heroTopRow: {
    position: "absolute", top: 52, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 16,
  },
  heroBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  heroTopTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarSection: { alignItems: "center", marginBottom: 12 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: "rgba(0,198,255,0.4)",
    padding: 3, justifyContent: "center", alignItems: "center",
  },
  avatarRing2: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: "rgba(0,198,255,0.2)",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  cameraBtn: {
    position: "absolute", bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#0072ff",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#080d17",
  },
  heroName: {
    color: "#fff", fontSize: 22, fontWeight: "800",
    letterSpacing: 0.3,
  },
  heroSub: { color: "#64748b", fontSize: 12, marginTop: 4 },

  // Stats
  statsSection: {
    marginHorizontal: 16, marginTop: -1,
    borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  statsBlur: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-around", padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  statsDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.08)" },
  statPill: { alignItems: "center", paddingHorizontal: 12 },
  statPillValue: { fontSize: 16, fontWeight: "800" },
  statPillLabel: { color: "#374151", fontSize: 10, marginTop: 2, fontWeight: "600" },

  // Badges
  badgesRow: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 8, marginHorizontal: 16, marginTop: 12,
  },
  deptBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(0,198,255,0.2)",
  },
  deptBadgeText: {
    color: "#00c6ff", fontSize: 12, fontWeight: "600", maxWidth: 160,
  },

  // Section
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 8, marginBottom: 12,
  },
  sectionTitle: {
    color: "#cbd5e1", fontSize: 14,
    fontWeight: "700", letterSpacing: 0.4,
  },

  // ID Card
  idCard: {
    borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  idCardAccent: { height: 4, width: "100%" },
  idCardHeader: {
    flexDirection: "row", alignItems: "center",
    padding: 16, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  idCardLogoWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "rgba(0,198,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  idCardCollege: {
    flex: 1, color: "#fff", fontSize: 13, fontWeight: "700",
  },
  idCardType: {
    color: "#00c6ff", fontSize: 9, fontWeight: "800",
    letterSpacing: 1.5,
    backgroundColor: "rgba(0,198,255,0.1)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  idCardBody: {
    flexDirection: "row", gap: 14, padding: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  idCardPhoto: {
    width: 72, height: 72, borderRadius: 12,
    borderWidth: 2, borderColor: "rgba(0,198,255,0.3)",
  },
  idCardInfo: { flex: 1, justifyContent: "center" },
  idCardName: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 3 },
  idCardId: { color: "#00c6ff", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  idCardDivider: {
    height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 8,
  },
  idCardMeta: { color: "#64748b", fontSize: 11, marginBottom: 2 },
  idCardFooter: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", padding: 16,
  },
  idCardQr: {
    padding: 8, backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  idCardFooterRight: { alignItems: "flex-end", gap: 6 },
  validBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(52,211,153,0.12)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  validText: { color: "#34d399", fontSize: 10, fontWeight: "800" },
  idCardYear: { color: "#64748b", fontSize: 11 },
  idCardWatermark: {
    color: "rgba(0,198,255,0.15)", fontSize: 18, fontWeight: "900",
    letterSpacing: 3,
  },

  // Download
  downloadBtn: { borderRadius: 14, overflow: "hidden" },
  downloadGrad: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, paddingVertical: 15,
  },
  downloadText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Info card
  infoCard: {
    backgroundColor: "#0f1923",
    borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  infoRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: { color: "#374151", fontSize: 11, marginBottom: 2, fontWeight: "600" },
  infoValue: { color: "#e2e8f0", fontSize: 14, fontWeight: "600" },
});