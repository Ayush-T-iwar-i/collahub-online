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
const IS_WEB    = Platform.OS === "web";
const ACCENT    = "#f59e0b";

// ── Safe image with initials fallback ────────────────────
const SafeImage = ({ uri, size = 44, initials = "?", color = ACCENT, style }) => {
  const [err, setErr] = React.useState(false);
  const ok = uri && !err && (uri.startsWith("http://") || uri.startsWith("https://"));
  if (ok) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        resizeMode="cover"
        onError={() => setErr(true)}
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

// ── Animated info row ─────────────────────────────────────
const InfoRow = ({ icon, label, value, color = ACCENT, delay = 0, last = false }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 450, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[
      s.infoRow, !last && s.infoRowBorder,
      { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
    ]}>
      <View style={[s.infoIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>{value || "—"}</Text>
      </View>
    </Animated.View>
  );
};

const SectionHead = ({ icon, title, color = ACCENT }) => (
  <View style={s.sectionHead}>
    <View style={[s.sectionIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const deptShort = (d = "") =>
  d.match(/\(([^)]+)\)/)?.[1] || d.split(" ").filter(w => w.length > 2)[0]?.toUpperCase() || d.slice(0, 8);

// ════════════════════════════════════════════════════════
export default function TeacherProfile() {
  const router    = useRouter();
  const cardRef   = useRef(null);
  const scrollY   = useRef(new Animated.Value(0)).current;
  const backCount = useRef(0);

  const [teacher,      setTeacher]      = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [photoModal,   setPhotoModal]   = useState(false);   // full screen view
  const [changeModal,  setChangeModal]  = useState(false);   // change photo

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
    if (!perm.granted) { Alert.alert("Permission Required", "Gallery access is needed."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setChangeModal(false);
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
      const resp   = await API.post("/teacher/upload-profile", formData, {
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
        Alert.alert("Updated! ✅", "Profile photo has been updated.");
      }
    } catch {
      Alert.alert("Error", "Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Download ID card → gallery ────────────────────────────
  const downloadCard = async () => {
    setDownloading(true);
    try {
      if (IS_WEB) {
        const html2canvas = (await import("html2canvas")).default;
        const el = document.getElementById("teacher-id-card");
        if (!el) { Alert.alert("Error", "ID card not found."); setDownloading(false); return; }
        const canvas = await html2canvas(el, { backgroundColor: "#1a1000", scale: 2 });
        const link   = document.createElement("a");
        link.download = `${teacher?.teacherId || "teacher"}-id-card.png`;
        link.href     = canvas.toDataURL("image/png");
        link.click();
      } else {
        // Step 1: Ask permission FIRST (before gallery opens)
        const MediaLibrary = await import("expo-media-library");
        const { status }   = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Please allow gallery access to save the ID card.");
          setDownloading(false);
          return;
        }

        // Step 2: Capture card as image
        const { captureRef } = await import("react-native-view-shot");
        const uri = await captureRef(cardRef.current, {
          format:  "png",
          quality: 1,
          result:  "tmpfile",
        });

        // Step 3: Save to gallery in CollaHub album
        const asset = await MediaLibrary.createAssetAsync(uri);
        try {
          const album = await MediaLibrary.getAlbumAsync("CollaHub");
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          } else {
            await MediaLibrary.createAlbumAsync("CollaHub", asset, false);
          }
        } catch {
          // Album step failed — asset still saved to camera roll
        }
        Alert.alert("Saved! ✅", "ID card saved to gallery in CollaHub album.");
      }
    } catch (e) {
      console.log("Download error:", e.message);
      Alert.alert("Error", "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (!teacher) return (
    <View style={s.loader}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={s.loaderText}>Loading profile...</Text>
    </View>
  );

  const initials = teacher.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "T";
  const deptName = deptShort(teacher.department || "");

  const heroH    = scrollY.interpolate({ inputRange: [0, 120], outputRange: [300, 175], extrapolate: "clamp" });
  const avatarSc = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.72],  extrapolate: "clamp" });
  const nameFade = scrollY.interpolate({ inputRange: [50, 110], outputRange: [1, 0],    extrapolate: "clamp" });

  return (
    <View style={s.container}>
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
        {/* ─── HERO ─── */}
        <Animated.View style={[s.hero, { height: heroH }]}>
          <LinearGradient colors={["#0d0800", "#1a1000", "#0a0600"]} style={StyleSheet.absoluteFillObject} />
          <View style={s.deco1} />
          <View style={s.deco2} />

          <View style={s.heroBar}>
            <Pressable onPress={() => router.back()} style={s.heroBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={s.heroBarTitle}>My Profile</Text>
            <Pressable onPress={() => setChangeModal(true)} style={s.heroBtn}>
              <Ionicons name="camera-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Avatar — tap to view full screen */}
          <Animated.View style={[s.avatarWrap, { transform: [{ scale: avatarSc }] }]}>
            <Pressable
              onPress={() => profileImage && setPhotoModal(true)}
              style={s.avatarRingOuter}
            >
              <View style={s.avatarRingInner}>
                <SafeImage uri={profileImage} size={94} initials={initials} color={ACCENT} />
              </View>
            </Pressable>
            {uploading
              ? <View style={s.avatarLoading}><ActivityIndicator size="small" color="#fff" /></View>
              : <Pressable style={s.cameraFab} onPress={() => setChangeModal(true)}>
                  <MaterialIcons name="camera-alt" size={13} color="#fff" />
                </Pressable>
            }
          </Animated.View>

          <Animated.View style={[s.heroName, { opacity: nameFade }]}>
            <Text style={s.heroNameText} numberOfLines={1}>{teacher.name}</Text>
            <Text style={s.heroIdText}>{teacher.teacherId || teacher.email}</Text>
          </Animated.View>
        </Animated.View>

        {/* ─── STATS STRIP ─── */}
        <View style={s.statsStrip}>
          {[
            { label: "Dept",    value: deptName                                           || "—", color: ACCENT    },
            { label: "College", value: teacher.college?.split(" ")[0]                     || "—", color: "#a78bfa" },
            { label: "Role",    value: "Faculty",                                                 color: "#34d399" },
            { label: "ID",      value: teacher.teacherId                                  || "—", color: "#fb923c" },
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: item.color }]} numberOfLines={1}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ─── ACADEMIC DETAILS ─── */}
        <View style={s.card}>
          <SectionHead icon="school-outline" title="Academic Details" color={ACCENT} />
          <View style={s.acadRow}>
            {[
              {
                label: teacher.department?.match(/\(([^)]+)\)/)?.[1] || "Dept",
                sub: "Department", color: ACCENT,
                icon: "school",
              },
              { label: "Faculty", sub: "Role",    color: "#34d399", icon: "person"   },
              { label: teacher.college?.split(" ")[1] || "College", sub: "College", color: "#a78bfa", icon: "business" },
            ].map((box, i) => (
              <LinearGradient key={i}
                colors={[box.color + "15", box.color + "05"]}
                style={[s.acadBox, { borderColor: box.color + "25" }]}
              >
                <View style={[s.acadCircle, { borderColor: box.color + "40", backgroundColor: box.color + "15" }]}>
                  <Ionicons name={box.icon} size={22} color={box.color} />
                </View>
                <Text style={[s.acadLabel, { color: box.color }]} numberOfLines={1}>{box.label}</Text>
                <Text style={s.acadSub}>{box.sub}</Text>
              </LinearGradient>
            ))}
          </View>
          {teacher.department && (
            <View style={s.infoBadge}>
              <Ionicons name="code-working-outline" size={12} color={ACCENT} />
              <Text style={[s.infoBadgeText, { color: ACCENT }]} numberOfLines={2}>{teacher.department}</Text>
            </View>
          )}
          {teacher.college && (
            <View style={[s.infoBadge, { marginTop: 8, borderColor: "rgba(167,139,250,0.3)", backgroundColor: "rgba(167,139,250,0.07)" }]}>
              <Ionicons name="business-outline" size={12} color="#a78bfa" />
              <Text style={[s.infoBadgeText, { color: "#a78bfa" }]} numberOfLines={2}>{teacher.college}</Text>
            </View>
          )}
        </View>

        {/* ─── PERSONAL INFO ─── */}
        <View style={s.card}>
          <SectionHead icon="person-circle-outline" title="Personal Information" color="#a78bfa" />
          <View style={s.infoCard}>
            {[
              { icon: "mail-outline",             label: "Email",      value: teacher.email,     color: ACCENT,    delay: 0   },
              { icon: "call-outline",             label: "Phone",      value: teacher.phone,     color: "#34d399", delay: 60  },
              { icon: "card-outline",             label: "Teacher ID", value: teacher.teacherId, color: "#a78bfa", delay: 120 },
              { icon: "shield-checkmark-outline", label: "Role",       value: "Teacher",         color: "#34d399", delay: 180 },
            ].map((item, i, arr) => (
              <InfoRow key={i} {...item} last={i === arr.length - 1} />
            ))}
          </View>
        </View>

        {/* ─── ID CARD ─── */}
        <View style={s.card}>
          <SectionHead icon="id-card-outline" title="Teacher ID Card" color={ACCENT} />

          <View ref={cardRef} collapsable={false} nativeID="teacher-id-card" style={s.idOuter}>
            <LinearGradient colors={["#1a1000", "#0d0800", "#1a0e00"]} style={s.idCard}>
              <LinearGradient colors={["#f59e0b", "#d97706", "#b45309"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.idStripe} />

              {/* Header */}
              <View style={s.idHeader}>
                <View style={s.idLogoBox}>
                  <Ionicons name="school" size={16} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.idCollegeName} numberOfLines={1}>{teacher.college || "College"}</Text>
                  <Text style={s.idCollegeSub}>CollaHub Academic System</Text>
                </View>
                <View style={s.idTypePill}>
                  <Text style={s.idTypeText}>FACULTY</Text>
                </View>
              </View>

              {/* Body */}
              <View style={s.idBody}>
                <View style={s.idPhotoFrame}>
                  <SafeImage
                    uri={profileImage}
                    size={78}
                    initials={initials}
                    color={ACCENT}
                    style={{ width: "100%", height: "100%", borderRadius: 12 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.idName} numberOfLines={1}>{teacher.name}</Text>
                  <Text style={s.idTeacherId}>{teacher.teacherId || "—"}</Text>
                  <View style={s.idDivider} />
                  <Text style={s.idDept} numberOfLines={2}>{teacher.department || "—"}</Text>
                  <Text style={s.idEmail} numberOfLines={1}>{teacher.email}</Text>
                  {teacher.phone && <Text style={s.idPhone}>{teacher.phone}</Text>}
                  <View style={s.idBadges}>
                    <View style={s.idBadge}><Text style={s.idBadgeText}>Faculty</Text></View>
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View style={s.idFooter}>
                <View style={s.idQr}>
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
                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  <View style={s.idValidBadge}>
                    <Ionicons name="checkmark-circle" size={11} color="#34d399" />
                    <Text style={s.idValidText}>VALID</Text>
                  </View>
                  <Text style={s.idBatch}>
                    {teacher.createdAt
                      ? new Date(teacher.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                      : "Faculty"}
                  </Text>
                  <Text style={s.idWatermark}>COLLAHUB</Text>
                </View>
              </View>

              <LinearGradient colors={[ACCENT + "22", "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.idBottomStripe} />
            </LinearGradient>
          </View>

          <Pressable
            style={[s.downloadBtn, downloading && { opacity: 0.7 }]}
            onPress={downloadCard}
            disabled={downloading}
          >
            <LinearGradient colors={["#d97706", "#f59e0b"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.downloadGrad}>
              {downloading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={s.downloadText}>Download ID Card</Text>
                  </>
              }
            </LinearGradient>
          </Pressable>
          <Text style={s.downloadHint}>
            {IS_WEB ? "PNG will be downloaded via browser" : "Saved to gallery in CollaHub album"}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ─── FULL SCREEN PHOTO VIEW ─── */}
      <Modal visible={photoModal} transparent animationType="fade" onRequestClose={() => setPhotoModal(false)}>
        <Pressable style={s.photoOverlay} onPress={() => setPhotoModal(false)}>
          <View style={s.photoClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </View>
          <SafeImage uri={profileImage} size={280} initials={initials} color={ACCENT}
            style={{ borderRadius: 20 }} />
          <View style={s.photoInfo}>
            <Text style={s.photoName}>{teacher.name}</Text>
            <Text style={s.photoRole}>Faculty · {deptName}</Text>
          </View>
        </Pressable>
      </Modal>

      {/* ─── CHANGE PHOTO BOTTOM SHEET ─── */}
      <Modal visible={changeModal} transparent animationType="slide" onRequestClose={() => setChangeModal(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setChangeModal(false)}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />

            <View style={s.sheetAvatarWrap}>
              <SafeImage uri={profileImage} size={110} initials={initials} color={ACCENT}
                style={{ borderRadius: 55, borderWidth: 3, borderColor: ACCENT + "60" }} />
              {uploading && (
                <View style={s.sheetAvatarOverlay}>
                  <ActivityIndicator size="large" color={ACCENT} />
                  <Text style={s.sheetUploadText}>Uploading...</Text>
                </View>
              )}
            </View>

            <Text style={s.sheetTitle}>Change Profile Photo</Text>
            <Text style={s.sheetSub}>Choose a clear photo for your ID card</Text>

            <Pressable style={s.sheetBtn} onPress={changeProfileImage} disabled={uploading}>
              <LinearGradient colors={["#d97706", "#f59e0b"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sheetBtnGrad}>
                <Ionicons name="image-outline" size={18} color="#fff" />
                <Text style={s.sheetBtnText}>Select from Gallery</Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={s.sheetCancel} onPress={() => setChangeModal(false)}>
              <Text style={s.sheetCancelText}>Cancel</Text>
            </Pressable>
            <View style={{ height: 20 }} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: "#070a0d" },
  loader:             { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#070a0d", gap: 14 },
  loaderText:         { color: "#374151", fontSize: 13 },

  // Hero
  hero:               { alignItems: "center", justifyContent: "flex-end", paddingBottom: 24, overflow: "hidden" },
  deco1:              { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -80, left: -60, backgroundColor: "rgba(245,158,11,0.06)" },
  deco2:              { position: "absolute", width: 160, height: 160, borderRadius: 80, top: 30, right: -40, backgroundColor: "rgba(167,139,250,0.05)" },
  heroBar:            { position: "absolute", top: 52, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  heroBtn:            { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  heroBarTitle:       { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarWrap:         { alignItems: "center", marginBottom: 14, position: "relative" },
  avatarRingOuter:    { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: "rgba(245,158,11,0.5)", padding: 3, justifyContent: "center", alignItems: "center" },
  avatarRingInner:    { width: 94, height: 94, borderRadius: 47, overflow: "hidden", borderWidth: 2, borderColor: "rgba(245,158,11,0.2)" },
  avatarLoading:      { position: "absolute", width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  cameraFab:          { position: "absolute", bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: "#d97706", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#070a0d" },
  heroName:           { alignItems: "center" },
  heroNameText:       { color: "#fff", fontSize: 21, fontWeight: "800" },
  heroIdText:         { color: "#64748b", fontSize: 12, marginTop: 4 },

  // Stats strip
  statsStrip:         { flexDirection: "row", backgroundColor: "#121008", marginHorizontal: 16, marginTop: -1, borderRadius: 18, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", paddingVertical: 14, paddingHorizontal: 10, justifyContent: "space-around", alignItems: "center" },
  statItem:           { alignItems: "center", flex: 1 },
  statVal:            { fontSize: 13, fontWeight: "800" },
  statLabel:          { color: "#374151", fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDivider:        { width: 1, height: 28, backgroundColor: "rgba(245,158,11,0.15)" },

  // Cards
  card:               { marginHorizontal: 16, marginTop: 16, backgroundColor: "#0f0b04", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(245,158,11,0.1)" },
  sectionHead:        { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionIcon:        { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionTitle:       { color: "#cbd5e1", fontSize: 14, fontWeight: "700" },

  // Academic
  acadRow:            { flexDirection: "row", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  acadBox:            { flexGrow: 1, flexBasis: "30%", minWidth: 90, borderRadius: 16, padding: 12, alignItems: "center", gap: 6, borderWidth: 1 },
  acadCircle:         { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  acadLabel:          { fontSize: 11, fontWeight: "700", textAlign: "center" },
  acadSub:            { color: "#374151", fontSize: 9, textAlign: "center" },
  infoBadge:          { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.07)" },
  infoBadgeText:      { fontSize: 12, fontWeight: "600", flex: 1 },

  // Info rows
  infoCard:           { borderRadius: 14, overflow: "hidden", backgroundColor: "#0a0800" },
  infoRow:            { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 14 },
  infoRowBorder:      { borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.08)" },
  infoIcon:           { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent:        { flex: 1 },
  infoLabel:          { color: "#64748b", fontSize: 10, fontWeight: "600", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:          { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },

  // ID Card
  idOuter:            { borderRadius: 20, overflow: "hidden", marginBottom: 14, elevation: 8, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  idCard:             { borderRadius: 20, overflow: "hidden" },
  idStripe:           { height: 5 },
  idHeader:           { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  idLogoBox:          { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  idCollegeName:      { color: "#fff", fontSize: 13, fontWeight: "700" },
  idCollegeSub:       { color: "#64748b", fontSize: 9, marginTop: 1 },
  idTypePill:         { backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  idTypeText:         { color: ACCENT, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  idBody:             { flexDirection: "row", gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", flexWrap: "wrap" },
  idPhotoFrame:       { width: 78, height: 78, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(245,158,11,0.3)" },
  idName:             { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 3 },
  idTeacherId:        { color: ACCENT, fontSize: 11, fontWeight: "700", marginBottom: 8 },
  idDivider:          { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 8 },
  idDept:             { color: "#94a3b8", fontSize: 10, marginBottom: 2, lineHeight: 15 },
  idEmail:            { color: "#64748b", fontSize: 10, marginBottom: 2 },
  idPhone:            { color: "#64748b", fontSize: 10, marginBottom: 4 },
  idBadges:           { flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 4 },
  idBadge:            { backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  idBadgeText:        { color: ACCENT, fontSize: 9, fontWeight: "700" },
  idFooter:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, flexWrap: "wrap", gap: 10 },
  idQr:               { backgroundColor: "rgba(255,255,255,0.04)", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  idValidBadge:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idValidText:        { color: "#34d399", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  idBatch:            { color: "#64748b", fontSize: 10 },
  idWatermark:        { color: "rgba(245,158,11,0.15)", fontSize: 14, fontWeight: "900", letterSpacing: 3, marginTop: 2 },
  idBottomStripe:     { height: 3 },

  // Download
  downloadBtn:        { borderRadius: 14, overflow: "hidden" },
  downloadGrad:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  downloadText:       { color: "#fff", fontWeight: "700", fontSize: 15 },
  downloadHint:       { color: "#374151", fontSize: 11, textAlign: "center", marginTop: 8 },

  // Full photo view
  photoOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center", alignItems: "center", gap: 20 },
  photoClose:         { position: "absolute", top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  photoInfo:          { alignItems: "center", gap: 4 },
  photoName:          { color: "#fff", fontSize: 20, fontWeight: "800" },
  photoRole:          { color: "#64748b", fontSize: 13 },

  // Change photo bottom sheet
  sheetOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet:              { backgroundColor: "#0f0b04", borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: "center", paddingHorizontal: 24, paddingTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.1)" },
  sheetHandle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 24 },
  sheetAvatarWrap:    { width: 116, height: 116, borderRadius: 58, overflow: "hidden", marginBottom: 16, position: "relative" },
  sheetAvatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", gap: 8 },
  sheetUploadText:    { color: ACCENT, fontSize: 12, fontWeight: "600" },
  sheetTitle:         { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  sheetSub:           { color: "#64748b", fontSize: 13, marginBottom: 24, textAlign: "center" },
  sheetBtn:           { width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  sheetBtnGrad:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  sheetBtnText:       { color: "#fff", fontWeight: "700", fontSize: 15 },
  sheetCancel:        { paddingVertical: 14, width: "100%", alignItems: "center" },
  sheetCancelText:    { color: "#64748b", fontWeight: "600", fontSize: 14 },
});