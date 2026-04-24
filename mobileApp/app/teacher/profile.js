// app/teacher/profile.js
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, Image, ScrollView, Pressable,
  Alert, BackHandler, ToastAndroid, StatusBar, Platform,
  ActivityIndicator, Animated, Dimensions, Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import API from "../../services/api";

const { width } = Dimensions.get("window");
const IS_WEB = Platform.OS === "web";

// ── SafeImage — no blob URLs ──────────────────────────────
const SafeImage = ({ uri, size = 44, initials = "?", color = "#f59e0b", style }) => {
  const [hasError, setHasError] = React.useState(false);
  const isValid = uri && !hasError &&
    (uri.startsWith("http://") || uri.startsWith("https://"));
  if (isValid) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    );
  }
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + "22",
      justifyContent: "center", alignItems: "center",
    }, style]}>
      <Text style={{ color, fontSize: size * 0.36, fontWeight: "800" }}>
        {(initials || "?").substring(0, 2)}
      </Text>
    </View>
  );
};

// ── Info Row ──────────────────────────────────────────────
const InfoRow = ({ icon, label, value, color = "#f59e0b", delay = 0, last = false }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 450, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[
      styles.infoRow,
      !last && styles.infoRowBorder,
      {
        opacity: anim,
        transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      },
    ]}>
      <View style={[styles.infoIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{value || "—"}</Text>
      </View>
    </Animated.View>
  );
};

const SectionHead = ({ icon, title, color = "#f59e0b" }) => (
  <View style={styles.sectionHead}>
    <View style={[styles.sectionHeadIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <Text style={styles.sectionHeadText}>{title}</Text>
  </View>
);

const deptShort = (dept = "") =>
  dept.match(/\(([^)]+)\)/)?.[1] ||
  dept.split(" ").filter(w => w.length > 2)[0]?.toUpperCase() ||
  dept.slice(0, 8);

// ═══════════════════════════════════════════════════════════
export default function TeacherProfile() {
  const router    = useRouter();
  const cardRef   = useRef(null);
  const scrollY   = useRef(new Animated.Value(0)).current;
  const backCount = useRef(0);

  const [teacher,      setTeacher]      = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [imageModal,   setImageModal]   = useState(false);

  // ── Load ─────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("teacherData");
      if (raw) {
        const d = JSON.parse(raw);
        setTeacher(d);
        const img = d.profileImage;
        setProfileImage(img && img.startsWith("http") ? img : null);
      }
    })();
  }, []));

  // ── Hardware back ─────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    if (IS_WEB) return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backCount.current === 0) {
        backCount.current = 1;
        ToastAndroid.show("Press back again to go to Dashboard", ToastAndroid.SHORT);
        setTimeout(() => { backCount.current = 0; }, 2000);
        return true;
      }
      router.replace("/teacher/dashboard");
      return true;
    });
    return () => h.remove();
  }, []));

  // ── Upload photo ──────────────────────────────────────────
  const changeProfileImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Need gallery access"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setImageModal(false);
    setUploading(true);
    try {
      const formData = new FormData();
      if (IS_WEB) {
        const res  = await fetch(uri);
        const blob = await res.blob();
        formData.append("profileImage", blob, "profile.jpg");
      } else {
        formData.append("profileImage", { uri, name: "profile.jpg", type: "image/jpeg" });
      }
      const resp   = await API.post("/student/upload-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newUrl = resp.data?.profileImage;
      if (newUrl && newUrl.startsWith("http")) {
        setProfileImage(newUrl);
        const raw = await AsyncStorage.getItem("teacherData");
        if (raw) {
          const d = JSON.parse(raw);
          d.profileImage = newUrl;
          await AsyncStorage.setItem("teacherData", JSON.stringify(d));
          setTeacher(d);
        }
        Alert.alert("Success", "Profile photo updated.");
      } else {
        Alert.alert("Notice", "Upload succeeded but no image URL was returned.");
      }
    } catch (e) {
      Alert.alert("Error", "Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Download ID card ──────────────────────────────────────
  const downloadCard = async () => {
    setDownloading(true);
    try {
      if (IS_WEB) {
        const html2canvas = (await import("html2canvas")).default;
        const el = document.getElementById("teacher-id-card");
        if (!el) { Alert.alert("Error", "Card not found"); return; }
        const canvas = await html2canvas(el, { backgroundColor: "#1a1000", scale: 2 });
        const link   = document.createElement("a");
        link.download = `${teacher?.teacherId || "teacher"}-id-card.png`;
        link.href     = canvas.toDataURL("image/png");
        link.click();
      } else {
        const { captureRef }          = await import("react-native-view-shot");
        const { default: FileSystem } = await import("expo-file-system");
        const { default: Sharing }    = await import("expo-sharing");
        const uri     = await captureRef(cardRef.current, { format: "png", quality: 1 });
        const fileUri = FileSystem.documentDirectory + `${teacher?.teacherId || "teacher"}-id-card.png`;
        await FileSystem.copyAsync({ from: uri, to: fileUri });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: "Teacher ID Card" });
        } else {
          Alert.alert("Saved!", "ID Card saved");
        }
      }
    } catch (e) {
      Alert.alert("Error", "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!teacher) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#f59e0b" />
      <Text style={styles.loaderText}>Loading profile...</Text>
    </View>
  );

  const initials      = teacher.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "T";
  const deptShortName = deptShort(teacher.department || "");
  const imgSrc        = profileImage; // SafeImage handles null

  const heroH    = scrollY.interpolate({ inputRange: [0, 120], outputRange: [300, 170], extrapolate: "clamp" });
  const avatarSc = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.72],  extrapolate: "clamp" });
  const nameFade = scrollY.interpolate({ inputRange: [50, 110], outputRange: [1, 0],    extrapolate: "clamp" });

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
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ══ HERO ══ */}
        <Animated.View style={[styles.hero, { height: heroH }]}>
          <LinearGradient colors={["#0d0800", "#1a1000", "#0a0600"]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          <View style={styles.deco3} />

          <View style={styles.heroBar}>
            <Pressable onPress={() => router.back()} style={styles.heroBarBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.heroBarTitle}>My Profile</Text>
            <Pressable onPress={() => setImageModal(true)} style={styles.heroBarBtn}>
              <Ionicons name="camera-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          <Animated.View style={[styles.avatarWrap, { transform: [{ scale: avatarSc }] }]}>
            <View style={styles.avatarRingOuter}>
              <View style={styles.avatarRingInner}>
                <SafeImage uri={imgSrc} size={94} initials={initials} color="#f59e0b" />
              </View>
            </View>
            {uploading
              ? <View style={styles.uploadingOverlay}><ActivityIndicator size="small" color="#fff" /></View>
              : <Pressable style={styles.cameraFab} onPress={() => setImageModal(true)}>
                  <MaterialIcons name="camera-alt" size={13} color="#fff" />
                </Pressable>
            }
          </Animated.View>

          <Animated.View style={[styles.heroNameWrap, { opacity: nameFade }]}>
            <Text style={styles.heroName} numberOfLines={1}>{teacher.name}</Text>
            <Text style={styles.heroId}>{teacher.teacherId || teacher.email}</Text>
          </Animated.View>
        </Animated.View>

        {/* ══ QUICK STATS ══ */}
        <View style={styles.statsStrip}>
          {[
            { label: "Dept",    value: deptShortName || "—",     color: "#f59e0b" },
            { label: "College", value: teacher.college ? teacher.college.split(" ")[0] : "—", color: "#a78bfa" },
            { label: "Role",    value: "Faculty",                  color: "#34d399" },
            { label: "ID",      value: teacher.teacherId || "—",  color: "#fb923c" },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <Text style={[styles.statItemVal, { color: s.color }]} numberOfLines={1}>{s.value}</Text>
                <Text style={styles.statItemLabel}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ══ ACADEMIC CARD ══ */}
        <View style={styles.card}>
          <SectionHead icon="school-outline" title="Academic Details" color="#f59e0b" />
          <View style={styles.acadRow}>
            {[
              {
                label: teacher.department?.match(/\(([^)]+)\)/)?.[1] || "Dept", sub: "Department",
                color: "#f59e0b",
                content: <View style={[styles.acadCircle, { borderColor: "rgba(245,158,11,0.4)", backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <Ionicons name="school" size={22} color="#f59e0b" />
                </View>,
                bg: ["rgba(245,158,11,0.1)", "rgba(245,158,11,0.03)"], border: "rgba(245,158,11,0.2)",
              },
              {
                label: "Faculty", sub: "Role",
                color: "#34d399",
                content: <View style={[styles.acadCircle, { borderColor: "rgba(52,211,153,0.4)", backgroundColor: "rgba(52,211,153,0.15)" }]}>
                  <Ionicons name="person" size={22} color="#34d399" />
                </View>,
                bg: ["rgba(52,211,153,0.1)", "rgba(52,211,153,0.03)"], border: "rgba(52,211,153,0.2)",
              },
              {
                label: teacher.college?.split(" ")[1] || "NIMS", sub: "College",
                color: "#a78bfa",
                content: <View style={[styles.acadCircle, { borderColor: "rgba(167,139,250,0.4)", backgroundColor: "rgba(167,139,250,0.15)" }]}>
                  <Ionicons name="business" size={22} color="#a78bfa" />
                </View>,
                bg: ["rgba(167,139,250,0.1)", "rgba(167,139,250,0.03)"], border: "rgba(167,139,250,0.2)",
              },
            ].map((box, i) => (
              <LinearGradient key={i} colors={box.bg}
                style={[styles.acadBox, { borderColor: box.border }]}>
                {box.content}
                <Text style={[styles.acadBoxTitle, { color: box.color }]} numberOfLines={1}>{box.label}</Text>
                <Text style={styles.acadBoxSub}>{box.sub}</Text>
              </LinearGradient>
            ))}
          </View>

          {teacher.department && (
            <View style={styles.deptBadge}>
              <Ionicons name="code-working-outline" size={12} color="#f59e0b" />
              <Text style={styles.deptBadgeText} numberOfLines={1}>{teacher.department}</Text>
            </View>
          )}
          {teacher.college && (
            <View style={[styles.deptBadge, { marginTop: 8, borderColor: "rgba(167,139,250,0.3)", backgroundColor: "rgba(167,139,250,0.07)" }]}>
              <Ionicons name="business-outline" size={12} color="#a78bfa" />
              <Text style={[styles.deptBadgeText, { color: "#a78bfa" }]} numberOfLines={1}>{teacher.college}</Text>
            </View>
          )}
        </View>

        {/* ══ PERSONAL INFO ══ */}
        <View style={styles.card}>
          <SectionHead icon="person-circle-outline" title="Personal Information" color="#a78bfa" />
          <View style={styles.infoCard}>
            {[
              { icon: "mail-outline",             label: "Email",      value: teacher.email,      color: "#f59e0b", delay: 0   },
              { icon: "call-outline",             label: "Phone",      value: teacher.phone,      color: "#34d399", delay: 60  },
              { icon: "card-outline",             label: "Teacher ID", value: teacher.teacherId,  color: "#a78bfa", delay: 120 },

              { icon: "shield-checkmark-outline", label: "Role",       value: "Teacher",          color: "#34d399", delay: 240 },
            ].map((item, i, arr) => (
              <InfoRow key={i} {...item} last={i === arr.length - 1} />
            ))}
          </View>
        </View>

        {/* ══ TEACHER ID CARD ══ */}
        <View style={styles.card}>
          <SectionHead icon="id-card-outline" title="Teacher ID Card" color="#f59e0b" />

          <View ref={cardRef} collapsable={false} nativeID="teacher-id-card" style={styles.idCardOuter}>
            <LinearGradient colors={["#1a1000", "#0d0800", "#1a0e00"]} style={styles.idCard}>
              <LinearGradient colors={["#f59e0b", "#d97706", "#b45309"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.idStripe} />

              {/* Header */}
              <View style={styles.idHeader}>
                <View style={styles.idLogo}>
                  <Ionicons name="school" size={16} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idCollegeName} numberOfLines={1}>{teacher.college || "College"}</Text>
                  <Text style={styles.idCollegeSub}>COLLAHUB Academic System</Text>
                </View>
                <View style={styles.idTypeBadge}>
                  <Text style={styles.idTypeText}>FACULTY</Text>
                </View>
              </View>

              {/* Body */}
              <View style={styles.idBody}>
                <View style={styles.idPhotoFrame}>
                  <SafeImage uri={imgSrc} size={78} initials={initials} color="#f59e0b"
                    style={{ width: "100%", height: "100%", borderRadius: 12 }} />
                </View>
                <View style={styles.idDetails}>
                  <Text style={styles.idName} numberOfLines={1}>{teacher.name}</Text>
                  <Text style={styles.idTeacherId}>{teacher.teacherId || "—"}</Text>
                  <View style={styles.idDivider} />
                  <Text style={styles.idDept} numberOfLines={2}>{teacher.department || "—"}</Text>
                  <Text style={styles.idEmail} numberOfLines={1}>{teacher.email}</Text>
                  {teacher.phone ? <Text style={styles.idPhone}>{teacher.phone}</Text> : null}
                  <View style={styles.idBadgesRow}>
                    <View style={styles.idBadge}>
                      <Text style={styles.idBadgeText}>Faculty</Text>
                    </View>
                    
                    
                  </View>
                </View>
              </View>

              {/* Footer with QR */}
              <View style={styles.idFooter}>
                <View style={styles.idQrWrap}>
                  <QRCode
                    value={JSON.stringify({
                      id:   teacher.teacherId || teacher._id,
                      name: teacher.name,
                      dept: teacher.department,
                    })}
                    size={62}
                    backgroundColor="transparent"
                    color="#ffffff"
                  />
                </View>
                <View style={styles.idFooterRight}>
                  <View style={styles.idValidBadge}>
                    <Ionicons name="checkmark-circle" size={11} color="#34d399" />
                    <Text style={styles.idValidText}>VALID</Text>
                  </View>
                  <Text style={styles.idBatchLabel}>
                    {teacher.createdAt
                      ? new Date(teacher.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                      : "Faculty"}
                  </Text>
                  <Text style={styles.idWatermark}>COLLAHUB</Text>
                </View>
              </View>

              <LinearGradient colors={["#f59e0b22", "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.idBottomStripe} />
            </LinearGradient>
          </View>

          <Pressable style={[styles.downloadBtn, downloading && { opacity: 0.7 }]}
            onPress={downloadCard} disabled={downloading}>
            <LinearGradient colors={["#d97706", "#f59e0b"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.downloadGrad}>
              {downloading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="download-outline" size={17} color="#fff" />
                    <Text style={styles.downloadText}>Download ID Card</Text>
                  </>
              }
            </LinearGradient>
          </Pressable>
          <Text style={styles.downloadHint}>
            {IS_WEB ? "PNG download starts from your browser." : "Saved locally for sharing and printing."}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ══ IMAGE MODAL ══ */}
      <Modal visible={imageModal} transparent animationType="fade">
        <Pressable style={styles.imgModalBg} onPress={() => setImageModal(false)}>
          <View style={styles.imgModalCard}>
            <Text style={styles.imgModalTitle}>Change Profile Photo</Text>
            <View style={styles.imgPreviewWrap}>
              <SafeImage uri={imgSrc} size={120} initials={initials} color="#f59e0b" />
              {uploading && (
                <View style={styles.imgUploadingOverlay}>
                  <ActivityIndicator size="large" color="#f59e0b" />
                  <Text style={styles.imgUploadingText}>Uploading...</Text>
                </View>
              )}
            </View>
            <Pressable style={styles.imgPickBtn} onPress={changeProfileImage}>
              <LinearGradient colors={["#d97706", "#f59e0b"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.imgPickGrad}>
                <Ionicons name="image-outline" size={17} color="#fff" />
                <Text style={styles.imgPickText}>Select from Gallery</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.imgCancelBtn} onPress={() => setImageModal(false)}>
              <Text style={styles.imgCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#070a0d" },
  loader:           { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#070a0d", gap: 14 },
  loaderText:       { color: "#374151", fontSize: 13 },
  // Hero
  hero:             { alignItems: "center", justifyContent: "flex-end", paddingBottom: 24, overflow: "hidden" },
  deco1:            { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -80,  left: -60,   backgroundColor: "rgba(245,158,11,0.06)" },
  deco2:            { position: "absolute", width: 160, height: 160, borderRadius: 80,  top: 30,   right: -40,  backgroundColor: "rgba(167,139,250,0.05)" },
  deco3:            { position: "absolute", width: 100, height: 100, borderRadius: 50,  bottom: 0, left: "30%", backgroundColor: "rgba(52,211,153,0.04)" },
  heroBar:          { position: "absolute", top: 52, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  heroBarBtn:       { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  heroBarTitle:     { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarWrap:       { alignItems: "center", marginBottom: 14, position: "relative" },
  avatarRingOuter:  { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: "rgba(245,158,11,0.5)", padding: 3, justifyContent: "center", alignItems: "center" },
  avatarRingInner:  { width: 94, height: 94, borderRadius: 47, overflow: "hidden", borderWidth: 2, borderColor: "rgba(245,158,11,0.2)" },
  uploadingOverlay: { position: "absolute", width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  cameraFab:        { position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: "#d97706", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#070a0d" },
  heroNameWrap:     { alignItems: "center" },
  heroName:         { color: "#fff", fontSize: 21, fontWeight: "800", letterSpacing: 0.3 },
  heroId:           { color: "#4b5563", fontSize: 12, marginTop: 4 },
  // Stats strip
  statsStrip:       { flexDirection: "row", backgroundColor: "#121008", marginHorizontal: 16, marginTop: -1, borderRadius: 18, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", paddingVertical: 14, paddingHorizontal: 10, justifyContent: "space-around", alignItems: "center" },
  statItem:         { alignItems: "center", flex: 1 },
  statItemVal:      { fontSize: 13, fontWeight: "800" },
  statItemLabel:    { color: "#374151", fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDivider:      { width: 1, height: 28, backgroundColor: "rgba(245,158,11,0.15)" },
  // Cards
  card:             { marginHorizontal: 16, marginTop: 16, backgroundColor: "#0f0b04", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(245,158,11,0.1)" },
  sectionHead:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionHeadIcon:  { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionHeadText:  { color: "#cbd5e1", fontSize: 14, fontWeight: "700", letterSpacing: 0.3 },
  // Academic
  acadRow:          { flexDirection: "row", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  acadBox:          { flexGrow: 1, flexBasis: "30%", minWidth: 92, borderRadius: 16, padding: 12, alignItems: "center", gap: 6, borderWidth: 1 },
  acadCircle:       { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  acadCircleNum:    { color: "#f59e0b", fontSize: 20, fontWeight: "900" },
  acadBoxTitle:     { fontSize: 11, fontWeight: "700", textAlign: "center" },
  acadBoxSub:       { color: "#374151", fontSize: 9, textAlign: "center" },
  deptBadge:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.07)", flexShrink: 1 },
  deptBadgeText:    { color: "#f59e0b", fontSize: 12, fontWeight: "600", flexShrink: 1 },
  // Info rows
  infoCard:         { borderRadius: 14, overflow: "hidden", backgroundColor: "#0a0800" },
  infoRow:          { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 14 },
  infoRowBorder:    { borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.08)" },
  infoIconWrap:     { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent:      { flex: 1 },
  infoLabel:        { color: "#374151", fontSize: 10, fontWeight: "600", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:        { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  // ID Card
  idCardOuter:      { borderRadius: 20, overflow: "hidden", marginBottom: 14, elevation: 8, shadowColor: "#f59e0b", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  idCard:           { borderRadius: 20, overflow: "hidden" },
  idStripe:         { height: 5, width: "100%" },
  idHeader:         { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  idLogo:           { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  idCollegeName:    { color: "#fff", fontSize: 13, fontWeight: "700" },
  idCollegeSub:     { color: "#374151", fontSize: 9, marginTop: 1 },
  idTypeBadge:      { backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  idTypeText:       { color: "#f59e0b", fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  idBody:           { flexDirection: "row", gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", flexWrap: "wrap" },
  idPhotoFrame:     { width: 78, height: 78, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(245,158,11,0.3)" },
  idDetails:        { flex: 1, minWidth: 170 },
  idName:           { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 3 },
  idTeacherId:      { color: "#f59e0b", fontSize: 11, fontWeight: "700", marginBottom: 8 },
  idDivider:        { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 8 },
  idDept:           { color: "#94a3b8", fontSize: 10, marginBottom: 2, lineHeight: 15 },
  idEmail:          { color: "#64748b", fontSize: 10, marginBottom: 2 },
  idPhone:          { color: "#64748b", fontSize: 10, marginBottom: 4 },
  idBadgesRow:      { flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 4 },
  idBadge:          { backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  idBadgeText:      { color: "#f59e0b", fontSize: 9, fontWeight: "700" },
  idFooter:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, gap: 12, flexWrap: "wrap" },
  idQrWrap:         { backgroundColor: "rgba(255,255,255,0.04)", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  idFooterRight:    { alignItems: "flex-end", gap: 5 },
  idValidBadge:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idValidText:      { color: "#34d399", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  idBatchLabel:     { color: "#64748b", fontSize: 10 },
  idWatermark:      { color: "rgba(245,158,11,0.12)", fontSize: 16, fontWeight: "900", letterSpacing: 4, marginTop: 2 },
  idBottomStripe:   { height: 3, width: "100%" },
  downloadBtn:      { borderRadius: 14, overflow: "hidden" },
  downloadGrad:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  downloadText:     { color: "#fff", fontWeight: "700", fontSize: 15 },
  downloadHint:     { color: "#1f2937", fontSize: 11, textAlign: "center", marginTop: 8 },
  // Image modal
  imgModalBg:       { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  imgModalCard:     { backgroundColor: "#0f0b04", borderRadius: 24, padding: 24, width: width - 60, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" },
  imgModalTitle:    { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 16 },
  imgPreviewWrap:   { width: 120, height: 120, borderRadius: 60, overflow: "hidden", marginBottom: 20, borderWidth: 2, borderColor: "rgba(245,158,11,0.4)", position: "relative" },
  imgUploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", gap: 8 },
  imgUploadingText: { color: "#f59e0b", fontSize: 11, fontWeight: "600" },
  imgPickBtn:       { borderRadius: 14, overflow: "hidden", width: "100%", marginBottom: 10 },
  imgPickGrad:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  imgPickText:      { color: "#fff", fontWeight: "700", fontSize: 14 },
  imgCancelBtn:     { paddingVertical: 12, width: "100%", alignItems: "center" },
  imgCancelText:    { color: "#4b5563", fontWeight: "600", fontSize: 14 },
});