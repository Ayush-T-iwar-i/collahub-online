import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, ScrollView, Pressable,
  Alert, BackHandler, ToastAndroid, StatusBar, ActivityIndicator, Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const InfoRow = ({ icon, label, value, color = "#f59e0b", delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.infoRow, {
      opacity: anim,
      transform: [{ translateX: anim.interpolate({ inputRange: [0,1], outputRange: [30,0] }) }]
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

export default function TeacherProfile() {
  const [teacher, setTeacher] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);
  const router = useRouter();
  const navigation = useNavigation();
  const backPressCount = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem("teacherData");
      if (data) {
        const parsed = JSON.parse(data);
        setTeacher(parsed);
        const img = await AsyncStorage.getItem(`profileImage_${parsed.teacherId || parsed.id}`);
        setProfileImage(img || null);
      }
    };
    load();
  }, []));

  useFocusEffect(useCallback(() => {
    const backAction = () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        ToastAndroid.show("Press back again to go to Dashboard", ToastAndroid.SHORT);
        setTimeout(() => { backPressCount.current = 0; }, 2000);
        return true;
      }
      router.replace("/teacher/dashboard"); return true;
    };
    const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => handler.remove();
  }, []));

  const changeProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem(`profileImage_${teacher.teacherId || teacher.id}`, uri);
    }
  };

  const downloadCard = async () => {
    try {
      setDownloading(true);
      const uri = await captureRef(cardRef.current, { format: "png", quality: 1 });
      const fileUri = FileSystem.documentDirectory + "teacher-id-card.png";
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri);
      else Alert.alert("Saved!", "ID Card saved to device.");
    } catch { Alert.alert("Error", "Could not download ID card"); }
    finally { setDownloading(false); }
  };

  if (!teacher) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#f59e0b" />
    </View>
  );

  const imageSource = profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const headerHeight = scrollY.interpolate({ inputRange: [0,120], outputRange: [260,160], extrapolate: "clamp" });
  const avatarScale = scrollY.interpolate({ inputRange: [0,120], outputRange: [1,0.7], extrapolate: "clamp" });
  const nameFade = scrollY.interpolate({ inputRange: [60,120], outputRange: [1,0], extrapolate: "clamp" });

  const infoItems = [
    { icon: "mail-outline",             label: "Email",      value: teacher.email,      color: "#f59e0b", delay: 0   },
    { icon: "call-outline",             label: "Phone",      value: teacher.phone,      color: "#34d399", delay: 60  },
    { icon: "card-outline",             label: "Teacher ID", value: teacher.teacherId,  color: "#60a5fa", delay: 120 },
    { icon: "school-outline",           label: "Department", value: teacher.department, color: "#a78bfa", delay: 180 },
    { icon: "business-outline",         label: "College",    value: teacher.college,    color: "#fb923c", delay: 240 },
    { icon: "shield-checkmark-outline", label: "Role",       value: "Teacher",          color: "#34d399", delay: 300 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* HERO */}
        <Animated.View style={[styles.hero, { height: headerHeight }]}>
          <LinearGradient colors={["#0a0f1e", "#1a1500", "#0a0800"]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          <View style={styles.heroTopRow}>
            <Pressable onPress={() => navigation.openDrawer()} style={styles.heroBtn}>
              <Ionicons name="menu" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.heroTopTitle}>My Profile</Text>
            <Pressable onPress={changeProfileImage} style={styles.heroBtn}>
              <Ionicons name="camera-outline" size={22} color="#fff" />
            </Pressable>
          </View>

          <Animated.View style={[styles.avatarSection, { transform: [{ scale: avatarScale }] }]}>
            <View style={[styles.avatarRing, { borderColor: "#f59e0b" }]}>
              <View style={styles.avatarRing2}>
                <Image source={{ uri: imageSource }} style={styles.avatar} />
              </View>
            </View>
            <Pressable style={[styles.cameraBtn, { backgroundColor: "#f59e0b" }]} onPress={changeProfileImage}>
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </Pressable>
          </Animated.View>

          <Animated.View style={{ opacity: nameFade, alignItems: "center" }}>
            <Text style={styles.heroName}>{teacher.name}</Text>
            <Text style={styles.heroSub}>{teacher.teacherId || teacher.id} · Teacher</Text>
          </Animated.View>
        </Animated.View>

        {/* BADGES */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)" }]}>
            <Ionicons name="person-circle-outline" size={13} color="#f59e0b" />
            <Text style={[styles.badgeText, { color: "#f59e0b" }]}>Teacher</Text>
          </View>
          {teacher.department && (
            <View style={[styles.badge, { backgroundColor: "rgba(96,165,250,0.12)", borderColor: "rgba(96,165,250,0.25)" }]}>
              <Ionicons name="school-outline" size={13} color="#60a5fa" />
              <Text style={[styles.badgeText, { color: "#60a5fa" }]} numberOfLines={1}>
                {teacher.department.split("(")[0].trim()}
              </Text>
            </View>
          )}
        </View>

        {/* ID CARD */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={16} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Teacher ID Card</Text>
          </View>

          <View ref={cardRef} collapsable={false}>
            <LinearGradient colors={["#1a1500", "#0d0a00", "#1a1200"]} style={styles.idCard}>
              <LinearGradient colors={["#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.idCardAccent} />
              <View style={styles.idCardHeader}>
                <View style={[styles.idCardLogoWrap, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <Ionicons name="school" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.idCardCollege} numberOfLines={1}>{teacher.college || "College Name"}</Text>
                <Text style={[styles.idCardType, { color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.12)" }]}>FACULTY</Text>
              </View>
              <View style={styles.idCardBody}>
                <Image source={{ uri: imageSource }} style={[styles.idCardPhoto, { borderColor: "rgba(245,158,11,0.4)" }]} />
                <View style={styles.idCardInfo}>
                  <Text style={styles.idCardName}>{teacher.name}</Text>
                  <Text style={[styles.idCardId, { color: "#f59e0b" }]}>#{teacher.teacherId || teacher.id}</Text>
                  <View style={styles.idCardDivider} />
                  <Text style={styles.idCardMeta}>{teacher.department || "Faculty"}</Text>
                  <Text style={styles.idCardMeta}>{teacher.email}</Text>
                </View>
              </View>
              <View style={styles.idCardFooter}>
                <View style={styles.idCardQr}>
                  <QRCode value={teacher.teacherId || teacher.id || "N/A"} size={65} backgroundColor="transparent" color="#ffffff" />
                </View>
                <View style={styles.idCardFooterRight}>
                  <View style={[styles.validBadge, { backgroundColor: "rgba(52,211,153,0.12)" }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#34d399" />
                    <Text style={styles.validText}>VALID</Text>
                  </View>
                  <Text style={[styles.idCardWatermark, { color: "rgba(245,158,11,0.12)" }]}>COLLAHUB</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <Pressable style={[styles.downloadBtn, downloading && { opacity: 0.7 }]} onPress={downloadCard} disabled={downloading}>
            <LinearGradient colors={["#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.downloadGrad}>
              {downloading
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="download-outline" size={18} color="#fff" /><Text style={styles.downloadText}>Download ID Card</Text></>
              }
            </LinearGradient>
          </Pressable>
        </View>

        {/* INFO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={16} color="#a78bfa" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          <View style={styles.infoCard}>
            {infoItems.map((item, i) => (
              <InfoRow key={i} icon={item.icon} label={item.label} value={item.value} color={item.color} delay={item.delay} />
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
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#080d17" },
  hero: { alignItems: "center", justifyContent: "flex-end", paddingBottom: 20, overflow: "hidden" },
  circle1: { position: "absolute", width: 200, height: 200, borderRadius: 100, top: -60, left: -60, backgroundColor: "rgba(245,158,11,0.05)" },
  circle2: { position: "absolute", width: 150, height: 150, borderRadius: 75, top: 20, right: -40, backgroundColor: "rgba(167,139,250,0.05)" },
  heroTopRow: { position: "absolute", top: 52, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  heroBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  heroTopTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarSection: { alignItems: "center", marginBottom: 12 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, padding: 3, justifyContent: "center", alignItems: "center" },
  avatarRing2: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: "rgba(245,158,11,0.2)", overflow: "hidden" },
  avatar: { width: "100%", height: "100%" },
  cameraBtn: { position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#080d17" },
  heroName: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  heroSub: { color: "#64748b", fontSize: 12, marginTop: 4 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 16, marginTop: 12 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, maxWidth: 180 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { color: "#cbd5e1", fontSize: 14, fontWeight: "700", letterSpacing: 0.4 },
  idCard: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginBottom: 12 },
  idCardAccent: { height: 4, width: "100%" },
  idCardHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  idCardLogoWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  idCardCollege: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "700" },
  idCardType: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  idCardBody: { flexDirection: "row", gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  idCardPhoto: { width: 72, height: 72, borderRadius: 12, borderWidth: 2 },
  idCardInfo: { flex: 1, justifyContent: "center" },
  idCardName: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 3 },
  idCardId: { fontSize: 12, fontWeight: "700", marginBottom: 8 },
  idCardDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 8 },
  idCardMeta: { color: "#64748b", fontSize: 11, marginBottom: 2 },
  idCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  idCardQr: { padding: 8, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  idCardFooterRight: { alignItems: "flex-end", gap: 8 },
  validBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  validText: { color: "#34d399", fontSize: 10, fontWeight: "800" },
  idCardWatermark: { fontSize: 18, fontWeight: "900", letterSpacing: 3 },
  downloadBtn: { borderRadius: 14, overflow: "hidden" },
  downloadGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  downloadText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  infoCard: { backgroundColor: "#0f1923", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 14 },
  infoContent: { flex: 1 },
  infoLabel: { color: "#374151", fontSize: 11, marginBottom: 2, fontWeight: "600" },
  infoValue: { color: "#e2e8f0", fontSize: 14, fontWeight: "600" },
});