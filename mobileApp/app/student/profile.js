// app/student/profile.js
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
const ACCENT    = "#00c6ff";

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
export default function StudentProfile() {
  const router    = useRouter();
  const cardRef   = useRef(null);
  const scrollY   = useRef(new Animated.Value(0)).current;
  const backCount = useRef(0);

  const [student,      setStudent]      = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [photoModal,   setPhotoModal]   = useState(false);   // full screen view
  const [changeModal,  setChangeModal]  = useState(false);   // change photo

  useFocusEffect(useCallback(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("studentData");
      if (raw) {
        const d = JSON.parse(raw);
        setStudent(d);
        const img = d.profileImage;
        setProfileImage(img && img.startsWith("http") ? img : null);
      }
    })();
  }, []));

  useFocusEffect(useCallback(() => {
    if (IS_WEB) return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backCount.current === 0) {
        backCount.current = 1;
        ToastAndroid.show("Press back again to go to Dashboard", ToastAndroid.SHORT);
        setTimeout(() => { backCount.current = 0; }, 2000);
        return true;
      }
      router.replace("/student/dashboard");
      return true;
    });
    return () => h.remove();
  }, []));

  // ── Upload profile image ──────────────────────────────
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
      const resp   = await API.post("/student/upload-profile", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const newUrl = resp.data?.profileImage;
      if (newUrl && newUrl.startsWith("http")) {
        setProfileImage(newUrl);
        const raw = await AsyncStorage.getItem("studentData");
        if (raw) {
          const d = JSON.parse(raw);
          d.profileImage = newUrl;
          await AsyncStorage.setItem("studentData", JSON.stringify(d));
          setStudent(d);
        }
        Alert.alert("Updated! ✅", "Profile photo has been updated.");
      }
    } catch {
      Alert.alert("Error", "Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Download ID card → gallery ────────────────────────
  const downloadCard = async () => {
    setDownloading(true);
    try {
      if (IS_WEB) {
        const html2canvas = (await import("html2canvas")).default;
        const el = document.getElementById("student-id-card");
        if (!el) { Alert.alert("Error", "ID card not found."); setDownloading(false); return; }
        const canvas = await html2canvas(el, { backgroundColor: "#0c1f3f", scale: 2 });
        const link   = document.createElement("a");
        link.download = `${student?.studentId || "student"}-id-card.png`;
        link.href     = canvas.toDataURL("image/png");
        link.click();
      } else {
        // Step 1: Ask permission FIRST — before gallery opens
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

  if (!student) return (
    <View style={s.loader}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={s.loaderText}>Loading profile...</Text>
    </View>
  );

  const imgSrc   = profileImage || null;
  const initials = student.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "S";
  const deptName = deptShort(student.department || "");

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
          <LinearGradient colors={["#060d1f", "#0b1e3d", "#091629"]} style={StyleSheet.absoluteFillObject} />
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
              onPress={() => imgSrc && setPhotoModal(true)}
              style={s.avatarRingOuter}
            >
              <View style={s.avatarRingInner}>
                {imgSrc
                  ? <Image source={{ uri: imgSrc }} style={s.avatarImg} />
                  : <View style={s.avatarFallback}>
                      <Text style={s.avatarInitials}>{initials}</Text>
                    </View>
                }
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
            <Text style={s.heroNameText} numberOfLines={1}>{student.name}</Text>
            <Text style={s.heroIdText}>{student.studentId || student.email}</Text>
          </Animated.View>
        </Animated.View>

        {/* ─── STATS STRIP ─── */}
        <View style={s.statsStrip}>
          {[
            { label: "Semester", value: student.semester ? `Sem ${student.semester}` : "—", color: ACCENT    },
            { label: "Section",  value: student.section    || "—",
              { label: "subSection",  value: student.subSection    || "—",                           color: "#a78bfa" },
            { label: "Batch",    value: student.admissionYear || "—",                         color: "#34d399" },
            { label: "Dept",     value: deptName             || "—",                          color: "#f59e0b" },
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <View style={s.statItem}>
                <Text style={[s.statVal, { color: item.color }]}>{item.value}</Text>
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
              { label: "Semester", sub: "Academic Progress", color: ACCENT,    content: <Text style={[s.acadNum, { color: ACCENT }]}>{student.semester || "?"}</Text> },
              { label: "Section",  sub: "Division",          color: "#a78bfa", content: <Text style={[s.acadNum, { color: "#a78bfa", fontSize: 18 }]}>{student.section || "?"}</Text> },
              { label: "Group",  sub: "Division",          color: "#a78bfa", content: <Text style={[s.acadNum, { color: "#a78bfa", fontSize: 18 }]}>{student.subSection || "?"}</Text> },
              { label: student.admissionYear || "—", sub: "Batch Year", color: "#34d399", content: <Ionicons name="calendar" size={24} color="#34d399" /> },
            ].map((box, i) => (
              <LinearGradient key={i}
                colors={[box.color + "15", box.color + "05"]}
                style={[s.acadBox, { borderColor: box.color + "25" }]}
              >
                <View style={[s.acadCircle, { borderColor: box.color + "40", backgroundColor: box.color + "15" }]}>
                  {box.content}
                </View>
                <Text style={[s.acadLabel, { color: box.color }]}>{box.label}</Text>
                <Text style={s.acadSub}>{box.sub}</Text>
              </LinearGradient>
            ))}
          </View>
          {student.department && (
            <View style={s.infoBadge}>
              <Ionicons name="code-working-outline" size={12} color={ACCENT} />
              <Text style={[s.infoBadgeText, { color: ACCENT }]} numberOfLines={2}>{student.department}</Text>
            </View>
          )}
          {student.college && (
            <View style={[s.infoBadge, { marginTop: 8, borderColor: "rgba(167,139,250,0.3)", backgroundColor: "rgba(167,139,250,0.07)" }]}>
              <Ionicons name="business-outline" size={12} color="#a78bfa" />
              <Text style={[s.infoBadgeText, { color: "#a78bfa" }]} numberOfLines={2}>{student.college}</Text>
            </View>
          )}
        </View>

        {/* ─── PERSONAL INFO ─── */}
        <View style={s.card}>
          <SectionHead icon="person-circle-outline" title="Personal Information" color="#a78bfa" />
          <View style={s.infoCard}>
            {[
              { icon: "mail-outline",             label: "Email",      value: student.email,     color: ACCENT,    delay: 0   },
              { icon: "call-outline",             label: "Phone",      value: student.phone,     color: "#34d399", delay: 60  },
              { icon: "card-outline",             label: "Student ID", value: student.studentId, color: "#a78bfa", delay: 120 },
              { icon: "male-female-outline",      label: "Gender",     value: student.gender,    color: "#fb923c", delay: 180 },
              { icon: "shield-checkmark-outline", label: "Role",       value: student.role,      color: "#34d399", delay: 240 },
            ].map((item, i, arr) => (
              <InfoRow key={i} {...item} last={i === arr.length - 1} />
            ))}
          </View>
        </View>

        {/* ─── RESULTS ─── */}
        {student.results?.length > 0 && (
          <View style={s.card}>
            <SectionHead icon="bar-chart-outline" title="Academic Results" color="#f59e0b" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {student.results.slice().reverse().map((r, i) => {
                const pass = r.status === "pass";
                return (
                  <LinearGradient key={i}
                    colors={pass ? ["rgba(52,211,153,0.12)", "rgba(52,211,153,0.04)"] : ["rgba(248,113,113,0.12)", "rgba(248,113,113,0.04)"]}
                    style={[s.resultCard, { borderColor: pass ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)" }]}
                  >
                    <Text style={s.resultSem}>Sem {r.semester}</Text>
                    <Text style={[s.resultSgpa, { color: pass ? "#34d399" : "#f87171" }]}>{r.sgpa?.toFixed(2) || "—"}</Text>
                    <Text style={s.resultSgpaLabel}>SGPA</Text>
                    {r.cgpa ? <Text style={s.resultCgpa}>CGPA {r.cgpa?.toFixed(2)}</Text> : null}
                    <View style={[s.resultBadge, { backgroundColor: pass ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)" }]}>
                      <Text style={{ color: pass ? "#34d399" : "#f87171", fontSize: 9, fontWeight: "800" }}>
                        {(r.status || "—").toUpperCase()}
                      </Text>
                    </View>
                  </LinearGradient>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ─── ID CARD ─── */}
        <View style={s.card}>
          <SectionHead icon="id-card-outline" title="Student ID Card" color="#f59e0b" />

          <View ref={cardRef} collapsable={false} nativeID="student-id-card" style={s.idOuter}>
            <LinearGradient colors={["#0c1f3f", "#0a1628", "#0d2040"]} style={s.idCard}>
              <LinearGradient colors={["#00c6ff", "#0072ff", "#a855f7"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.idStripe} />

              <View style={s.idHeader}>
                <View style={s.idLogoBox}>
                  <Ionicons name="school" size={16} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.idCollegeName} numberOfLines={1}>{student.college || "College"}</Text>
                  <Text style={s.idCollegeSub}>CollaHub Academic System</Text>
                </View>
                <View style={s.idTypePill}>
                  <Text style={s.idTypeText}>STUDENT</Text>
                </View>
              </View>

              <View style={s.idBody}>
                <View style={s.idPhotoFrame}>
                  {imgSrc
                    ? <Image source={{ uri: imgSrc }} style={s.idPhoto} />
                    : <View style={[s.idPhoto, s.idPhotoFallback]}>
                        <Text style={s.idPhotoInitials}>{initials}</Text>
                      </View>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.idName} numberOfLines={1}>{student.name}</Text>
                  <Text style={s.idStudentId}>{student.studentId || "—"}</Text>
                  <View style={s.idDivider} />
                  <Text style={s.idDept} numberOfLines={2}>{student.department || "—"}</Text>
                  <Text style={s.idEmail} numberOfLines={1}>{student.email}</Text>
                  {student.phone && <Text style={s.idPhone}>{student.phone}</Text>}
                  <View style={s.idBadges}>
                    {student.semester && <View style={s.idBadge}><Text style={s.idBadgeText}>Sem {student.semester}</Text></View>}
                    {student.section  && <View style={[s.idBadge, { backgroundColor: "rgba(167,139,250,0.2)" }]}><Text style={[s.idBadgeText, { color: "#a78bfa" }]}>Sec {student.section}</Text></View>}
                    {student.subSection  && <View style={[s.idBadge, { backgroundColor: "rgba(167,139,250,0.2)" }]}><Text style={[s.idBadgeText, { color: "#a78bfa" }]}>Sec {student.subSection}</Text></View>}
                    {student.gender   && <View style={[s.idBadge, { backgroundColor: "rgba(251,146,60,0.15)" }]}><Text style={[s.idBadgeText, { color: "#fb923c" }]}>{student.gender}</Text></View>}
                  </View>
                </View>
              </View>

              <View style={s.idFooter}>
                <View style={s.idQr}>
                  <QRCode
                    value={JSON.stringify({ id: student.studentId || student._id, name: student.name, dept: student.department, batch: student.admissionYear })}
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
                  <Text style={s.idBatch}>Batch {student.admissionYear || "—"}</Text>
                  <Text style={s.idIssued}>
                    {student.createdAt
                      ? new Date(student.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                      : "—"}
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
            <LinearGradient colors={["#0072ff", "#00c6ff"]}
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
          {imgSrc
            ? <Image source={{ uri: imgSrc }} style={s.photoFull} resizeMode="contain" />
            : <View style={s.photoFallback}>
                <Text style={s.photoInitials}>{initials}</Text>
              </View>
          }
          <View style={s.photoInfo}>
            <Text style={s.photoName}>{student.name}</Text>
            <Text style={s.photoRole}>{student.studentId} · {deptName}</Text>
          </View>
        </Pressable>
      </Modal>

      {/* ─── CHANGE PHOTO BOTTOM SHEET ─── */}
      <Modal visible={changeModal} transparent animationType="slide" onRequestClose={() => setChangeModal(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setChangeModal(false)}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />

            <View style={s.sheetAvatarWrap}>
              {imgSrc
                ? <Image source={{ uri: imgSrc }} style={s.sheetAvatar} />
                : <View style={[s.sheetAvatar, s.sheetAvatarFallback]}>
                    <Text style={s.sheetAvatarInitials}>{initials}</Text>
                  </View>
              }
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
              <LinearGradient colors={["#0072ff", "#00c6ff"]}
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
  container:          { flex: 1, backgroundColor: "#070d1a" },
  loader:             { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#070d1a", gap: 14 },
  loaderText:         { color: "#374151", fontSize: 13 },

  // Hero
  hero:               { alignItems: "center", justifyContent: "flex-end", paddingBottom: 24, overflow: "hidden" },
  deco1:              { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -80, left: -60, backgroundColor: "rgba(0,198,255,0.05)" },
  deco2:              { position: "absolute", width: 160, height: 160, borderRadius: 80, top: 30, right: -40, backgroundColor: "rgba(167,139,250,0.05)" },
  heroBar:            { position: "absolute", top: 52, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  heroBtn:            { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  heroBarTitle:       { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarWrap:         { alignItems: "center", marginBottom: 14, position: "relative" },
  avatarRingOuter:    { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: "rgba(0,198,255,0.5)", padding: 3, justifyContent: "center", alignItems: "center" },
  avatarRingInner:    { width: 94, height: 94, borderRadius: 47, overflow: "hidden", borderWidth: 2, borderColor: "rgba(0,198,255,0.2)" },
  avatarImg:          { width: "100%", height: "100%" },
  avatarFallback:     { width: "100%", height: "100%", backgroundColor: "rgba(0,198,255,0.15)", justifyContent: "center", alignItems: "center" },
  avatarInitials:     { color: ACCENT, fontSize: 32, fontWeight: "900" },
  avatarLoading:      { position: "absolute", width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  cameraFab:          { position: "absolute", bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: "#0072ff", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#070d1a" },
  heroName:           { alignItems: "center" },
  heroNameText:       { color: "#fff", fontSize: 21, fontWeight: "800" },
  heroIdText:         { color: "#64748b", fontSize: 12, marginTop: 4 },

  // Stats strip
  statsStrip:         { flexDirection: "row", backgroundColor: "#0f1b2d", marginHorizontal: 16, marginTop: -1, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 14, paddingHorizontal: 10, justifyContent: "space-around", alignItems: "center" },
  statItem:           { alignItems: "center", flex: 1 },
  statVal:            { fontSize: 14, fontWeight: "800" },
  statLabel:          { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDivider:        { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.07)" },

  // Cards
  card:               { marginHorizontal: 16, marginTop: 16, backgroundColor: "#0f1b2d", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  sectionHead:        { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionIcon:        { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionTitle:       { color: "#cbd5e1", fontSize: 14, fontWeight: "700" },

  // Academic
  acadRow:            { flexDirection: "row", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  acadBox:            { flexGrow: 1, flexBasis: "30%", minWidth: 90, borderRadius: 16, padding: 12, alignItems: "center", gap: 6, borderWidth: 1 },
  acadCircle:         { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  acadNum:            { fontSize: 20, fontWeight: "900", color: ACCENT },
  acadLabel:          { fontSize: 11, fontWeight: "700", textAlign: "center" },
  acadSub:            { color: "#64748b", fontSize: 9, textAlign: "center" },
  infoBadge:          { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,198,255,0.25)", backgroundColor: "rgba(0,198,255,0.06)" },
  infoBadgeText:      { fontSize: 12, fontWeight: "600", flex: 1 },

  // Info rows
  infoCard:           { borderRadius: 14, overflow: "hidden", backgroundColor: "#0a1422" },
  infoRow:            { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 14 },
  infoRowBorder:      { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  infoIcon:           { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent:        { flex: 1 },
  infoLabel:          { color: "#64748b", fontSize: 10, fontWeight: "600", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:          { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },

  // Results
  resultCard:         { borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, minWidth: 90 },
  resultSem:          { color: "#64748b", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  resultSgpa:         { fontSize: 22, fontWeight: "900" },
  resultSgpaLabel:    { color: "#374151", fontSize: 9, fontWeight: "600" },
  resultCgpa:         { color: "#94a3b8", fontSize: 10, marginTop: 4 },
  resultBadge:        { marginTop: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },

  // ID Card
  idOuter:            { borderRadius: 20, overflow: "hidden", marginBottom: 14, elevation: 8, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  idCard:             { borderRadius: 20, overflow: "hidden" },
  idStripe:           { height: 5 },
  idHeader:           { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  idLogoBox:          { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(0,198,255,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  idCollegeName:      { color: "#fff", fontSize: 13, fontWeight: "700" },
  idCollegeSub:       { color: "#64748b", fontSize: 9, marginTop: 1 },
  idTypePill:         { backgroundColor: "rgba(0,198,255,0.12)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  idTypeText:         { color: ACCENT, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  idBody:             { flexDirection: "row", gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", flexWrap: "wrap" },
  idPhotoFrame:       { width: 78, height: 78, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(0,198,255,0.3)" },
  idPhoto:            { width: "100%", height: "100%" },
  idPhotoFallback:    { backgroundColor: "rgba(0,198,255,0.15)", justifyContent: "center", alignItems: "center" },
  idPhotoInitials:    { color: ACCENT, fontSize: 28, fontWeight: "900" },
  idName:             { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 3 },
  idStudentId:        { color: ACCENT, fontSize: 11, fontWeight: "700", marginBottom: 8 },
  idDivider:          { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 8 },
  idDept:             { color: "#94a3b8", fontSize: 10, marginBottom: 2, lineHeight: 15 },
  idEmail:            { color: "#64748b", fontSize: 10, marginBottom: 2 },
  idPhone:            { color: "#64748b", fontSize: 10, marginBottom: 4 },
  idBadges:           { flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 4 },
  idBadge:            { backgroundColor: "rgba(0,198,255,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  idBadgeText:        { color: ACCENT, fontSize: 9, fontWeight: "700" },
  idFooter:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, flexWrap: "wrap", gap: 10 },
  idQr:               { backgroundColor: "rgba(255,255,255,0.04)", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  idValidBadge:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idValidText:        { color: "#34d399", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  idBatch:            { color: "#64748b", fontSize: 10 },
  idIssued:           { color: "#374151", fontSize: 9 },
  idWatermark:        { color: "rgba(0,200,255,0.2)", fontSize: 14, fontWeight: "900", letterSpacing: 3, marginTop: 2 },
  idBottomStripe:     { height: 3 },

  // Download
  downloadBtn:        { borderRadius: 14, overflow: "hidden" },
  downloadGrad:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  downloadText:       { color: "#fff", fontWeight: "700", fontSize: 15 },
  downloadHint:       { color: "#374151", fontSize: 11, textAlign: "center", marginTop: 8 },

  // Full photo view
  photoOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center", alignItems: "center", gap: 20 },
  photoClose:         { position: "absolute", top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  photoFull:          { width: "90%", height: "65%", borderRadius: 20 },
  photoFallback:      { width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(0,198,255,0.15)", justifyContent: "center", alignItems: "center" },
  photoInitials:      { color: ACCENT, fontSize: 72, fontWeight: "900" },
  photoInfo:          { alignItems: "center", gap: 4 },
  photoName:          { color: "#fff", fontSize: 20, fontWeight: "800" },
  photoRole:          { color: "#64748b", fontSize: 13 },

  // Change photo bottom sheet
  sheetOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet:              { backgroundColor: "#0f1b2d", borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: "center", paddingHorizontal: 24, paddingTop: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  sheetHandle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 24 },
  sheetAvatarWrap:    { width: 116, height: 116, borderRadius: 58, overflow: "hidden", marginBottom: 16, borderWidth: 3, borderColor: "rgba(0,198,255,0.4)", position: "relative" },
  sheetAvatar:        { width: "100%", height: "100%" },
  sheetAvatarFallback:{ backgroundColor: "rgba(0,198,255,0.15)", justifyContent: "center", alignItems: "center" },
  sheetAvatarInitials:{ color: ACCENT, fontSize: 36, fontWeight: "900" },
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