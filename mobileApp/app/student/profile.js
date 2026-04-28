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

// ─────────────────────────────────────────────
//  Helper Functions
// ─────────────────────────────────────────────
const deptShort = (dept = "") =>
  dept.match(/\(([^)]+)\)/)?.[1] ||
  dept.split(" ").filter(w => w.length > 2)[0]?.toUpperCase() ||
  dept.slice(0, 8);

export default function StudentProfile() {
  const router = useRouter();
  const cardRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const backCount = useRef(0);

  const [student, setStudent] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(false);

  // ── Load ──
  useFocusEffect(useCallback(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("studentData");
      if (raw) {
        const d = JSON.parse(raw);
        setStudent(d);
        setProfileImage(d.profileImage || null);
      }
    })();
  }, []));

  // ── Hardware back ──
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

  // ── Profile image upload ──
  const changeProfileImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Need gallery access");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setProfileImage(uri);
    setImageModal(false);
    setUploading(true);

    try {
      const formData = new FormData();
      if (IS_WEB) {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("profileImage", blob, "profile.jpg");
      } else {
        formData.append("profileImage", { uri, name: "profile.jpg", type: "image/jpeg" });
      }
      const resp = await API.post("/student/upload-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newUrl = resp.data?.profileImage || uri;
      setProfileImage(newUrl);
      const raw = await AsyncStorage.getItem("studentData");
      if (raw) {
        const d = JSON.parse(raw);
        d.profileImage = newUrl;
        await AsyncStorage.setItem("studentData", JSON.stringify(d));
        setStudent(d);
      }
      Alert.alert("Success", "Profile photo updated.");
    } catch (e) {
      Alert.alert("Notice", "Photo saved locally. Server sync will continue in the background.");
    } finally {
      setUploading(false);
    }
  };
// ── Download ID card (Fixed Version) ──
  const downloadCard = async () => {
    setDownloading(true);

    try {
      if (IS_WEB) {
        const html2canvas = (await import("html2canvas")).default;
        const el = document.getElementById("student-id-card");

        if (!el) {
          Alert.alert("Error", "ID card not found");
          return;
        }

        const canvas = await html2canvas(el, {
          backgroundColor: "#0c1f3f",
          scale: 3, // Web par thodi high quality rakhi hai
        });

        const link = document.createElement("a");
        link.download = `${student?.studentId || "student"}-id-card.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const { captureRef } = await import("react-native-view-shot");
        const MediaLibrary = await import("expo-media-library");

        // CRITICAL FIX: 'false' pass karne se ye Audio permission skip kar dega
        // Ye sirf Photos/Videos ki permission maangega
        const permission = await MediaLibrary.requestPermissionsAsync(false);

        if (!permission.granted) {
          Alert.alert(
            "Permission Required", 
            "Gallery access is needed to save your ID card. Please enable it in settings."
          );
          return;
        }

        // Capture the view
        const uri = await captureRef(cardRef.current, {
          format: "png",
          quality: 1,
          result: "tmpfile" 
        });

        // Save to Gallery
        const asset = await MediaLibrary.createAssetAsync(uri);
        
        // Optional: Ek alag folder banane ke liye (CollaHub naam se)
        await MediaLibrary.createAlbumAsync("CollaHub", asset, false);

        Alert.alert("Success ✅", "ID card saved to your gallery in 'CollaHub' folder.");
      }
    } catch (error) {
      console.log("ID card download failed:", error);
      Alert.alert("Error", "Failed to save ID card. Check if your gallery is full or permissions are denied.");
    } finally {
      setDownloading(false);
    }
  };
  
  if (!student) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#00c6ff" />
      <Text style={styles.loaderText}>Loading profile...</Text>
    </View>
  );

  const imgSrc = profileImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const deptShortName = deptShort(student.department || "");

  const heroH = scrollY.interpolate({ inputRange: [0, 120], outputRange: [300, 170], extrapolate: "clamp" });
  const avatarSc = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.72], extrapolate: "clamp" });
  const nameFade = scrollY.interpolate({ inputRange: [50, 110], outputRange: [1, 0], extrapolate: "clamp" });

  // Animated Info Row Component
  const InfoRow = ({ icon, label, value, color = "#00c6ff", delay = 0, last = false }) => {
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

  const SectionHead = ({ icon, title, color = "#00c6ff" }) => (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionHeadIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={styles.sectionHeadText}>{title}</Text>
    </View>
  );

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
          <LinearGradient colors={["#060d1f", "#0b1e3d", "#091629"]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.deco1} /><View style={styles.deco2} /><View style={styles.deco3} />

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
                <Pressable onPress={() => setPreviewImageModal(true)}>
                  <Image source={{ uri: imgSrc }} style={styles.avatarImg} />
                </Pressable>
              </View>
            </View>

            {uploading ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <Pressable
                style={styles.cameraFab}
                onPress={() => setImageModal(true)}
              >
                <MaterialIcons name="camera-alt" size={13} color="#fff" />
              </Pressable>
            )}
          </Animated.View>

          <Animated.View style={[styles.heroNameWrap, { opacity: nameFade }]}>
            <Text style={styles.heroName} numberOfLines={1}>{student.name}</Text>
            <Text style={styles.heroId}>{student.studentId || student.email}</Text>
          </Animated.View>
        </Animated.View>

        {/* ══ QUICK STATS ══ */}
        <View style={styles.statsStrip}>
          {[
            { label: "Semester", value: student.semester ? `Sem ${student.semester}` : "—", color: "#00c6ff" },
            { label: "Section", value: student.section || "—", color: "#a78bfa" },
            { label: "Batch", value: student.admissionYear || "—", color: "#34d399" },
            { label: "Dept", value: deptShortName || "—", color: "#f59e0b" },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <Text style={[styles.statItemVal, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statItemLabel}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ══ ACADEMIC CARD ══ */}
        <View style={styles.card}>
          <SectionHead icon="school-outline" title="Academic Details" color="#00c6ff" />
          <View style={styles.acadRow}>
            {[
              {
                label: "Current Semester", sub: "Academic Progress", color: "#00c6ff",
                content: <View style={[styles.acadCircle, { borderColor: "rgba(0,198,255,0.4)", backgroundColor: "rgba(0,198,255,0.15)" }]}><Text style={styles.acadCircleNum}>{student.semester || "?"}</Text></View>,
                bg: ["rgba(0,198,255,0.1)", "rgba(0,198,255,0.03)"], border: "rgba(0,198,255,0.2)"
              },
              {
                label: "Section", sub: "Your Division", color: "#a78bfa",
                content: <View style={[styles.acadCircle, { borderColor: "rgba(167,139,250,0.4)", backgroundColor: "rgba(167,139,250,0.15)" }]}><Text style={[styles.acadCircleNum, { color: "#a78bfa", fontSize: 18 }]}>{student.section || "?"}</Text></View>,
                bg: ["rgba(167,139,250,0.1)", "rgba(167,139,250,0.03)"], border: "rgba(167,139,250,0.2)"
              },
              {
                label: student.admissionYear || "—", sub: "Batch Year", color: "#34d399",
                content: <Ionicons name="calendar" size={24} color="#34d399" />,
                bg: ["rgba(52,211,153,0.1)", "rgba(52,211,153,0.03)"], border: "rgba(52,211,153,0.2)"
              },
            ].map((box, i) => (
              <LinearGradient key={i} colors={box.bg}
                style={[styles.acadBox, { borderColor: box.border }]}>
                {box.content}
                <Text style={[styles.acadBoxTitle, { color: box.color }]}>{box.label}</Text>
                <Text style={styles.acadBoxSub}>{box.sub}</Text>
              </LinearGradient>
            ))}
          </View>

          {student.department && (
            <View style={styles.deptBadge}>
              <Ionicons name="code-working-outline" size={12} color="#00c6ff" />
              <Text style={styles.deptBadgeText} numberOfLines={1}>{student.department}</Text>
            </View>
          )}
          {student.college && (
            <View style={[styles.deptBadge, { marginTop: 8, borderColor: "rgba(167,139,250,0.3)", backgroundColor: "rgba(167,139,250,0.07)" }]}>
              <Ionicons name="business-outline" size={12} color="#a78bfa" />
              <Text style={[styles.deptBadgeText, { color: "#a78bfa" }]} numberOfLines={1}>{student.college}</Text>
            </View>
          )}
        </View>

        {/* ══ PERSONAL INFO ══ */}
        <View style={styles.card}>
          <SectionHead icon="person-circle-outline" title="Personal Information" color="#a78bfa" />
          <View style={styles.infoCard}>
            {[
              { icon: "mail-outline", label: "Email", value: student.email, color: "#00c6ff", delay: 0 },
              { icon: "call-outline", label: "Phone", value: student.phone, color: "#34d399", delay: 60 },
              { icon: "card-outline", label: "Student ID", value: student.studentId, color: "#a78bfa", delay: 120 },
              { icon: "male-female-outline", label: "Gender", value: student.gender, color: "#fb923c", delay: 180 },
              { icon: "shield-checkmark-outline", label: "Role", value: student.role, color: "#34d399", delay: 240 },
            ].map((item, i, arr) => (
              <InfoRow key={i} {...item} last={i === arr.length - 1} />
            ))}
          </View>
        </View>

        {/* ══ RESULTS SNAPSHOT ══ */}
        {student.results?.length > 0 && (
          <View style={styles.card}>
            <SectionHead icon="bar-chart-outline" title="Academic Results" color="#f59e0b" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {student.results.slice().reverse().map((r, i) => (
                <LinearGradient key={i}
                  colors={r.status === "pass"
                    ? ["rgba(52,211,153,0.12)", "rgba(52,211,153,0.04)"]
                    : ["rgba(248,113,113,0.12)", "rgba(248,113,113,0.04)"]}
                  style={styles.resultCard}>
                  <Text style={styles.resultSem}>Sem {r.semester}</Text>
                  <Text style={[styles.resultSgpa, { color: r.status === "pass" ? "#34d399" : "#f87171" }]}>
                    {r.sgpa?.toFixed(2) || "—"}
                  </Text>
                  <Text style={styles.resultLabel}>SGPA</Text>
                  {r.cgpa ? <Text style={styles.resultCgpa}>CGPA {r.cgpa?.toFixed(2)}</Text> : null}
                  <View style={[styles.resultStatusBadge, {
                    backgroundColor: r.status === "pass" ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)"
                  }]}>
                    <Text style={{ color: r.status === "pass" ? "#34d399" : "#f87171", fontSize: 9, fontWeight: "700" }}>
                      {(r.status || "—").toUpperCase()}
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ══ STUDENT ID CARD ══ */}
        <View style={styles.card}>
          <SectionHead icon="id-card-outline" title="Student ID Card" color="#f59e0b" />

          <View ref={cardRef} collapsable={false} nativeID="student-id-card" style={styles.idCardOuter}>
            <LinearGradient colors={["#0c1f3f", "#0a1628", "#0d2040"]} style={styles.idCard}>
              <LinearGradient colors={["#00c6ff", "#0072ff", "#a855f7"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.idStripe} />

              {/* College header */}
              <View style={styles.idHeader}>
                <View style={styles.idLogo}>
                  <Ionicons name="school" size={16} color="#00c6ff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idCollegeName} numberOfLines={1}>{student.college || "College"}</Text>
                  <Text style={styles.idCollegeSub}>COLLAHUB Academic System</Text>
                </View>
                <View style={styles.idTypeBadge}>
                  <Text style={styles.idTypeText}>STUDENT</Text>
                </View>
              </View>

              {/* Body */}
              <View style={styles.idBody}>
                <View style={styles.idPhotoFrame}>
                  <Image source={{ uri: imgSrc }} style={styles.idPhoto} />
                </View>
                <View style={styles.idDetails}>
                  <Text style={styles.idName} numberOfLines={1}>{student.name}</Text>
                  <Text style={styles.idStudentId}>{student.studentId || "—"}</Text>
                  <View style={styles.idDivider} />
                  <Text style={styles.idDept} numberOfLines={2}>{student.department || "—"}</Text>
                  <Text style={styles.idEmail} numberOfLines={1}>{student.email}</Text>
                  {student.phone ? <Text style={styles.idPhone}>{student.phone}</Text> : null}
                  <View style={styles.idBadgesRow}>
                    {student.semester ? <View style={styles.idBadge}><Text style={styles.idBadgeText}>Sem {student.semester}</Text></View> : null}
                    {student.section ? <View style={[styles.idBadge, { backgroundColor: "rgba(167,139,250,0.2)" }]}><Text style={[styles.idBadgeText, { color: "#a78bfa" }]}>Sec {student.section}</Text></View> : null}
                    {student.gender ? <View style={[styles.idBadge, { backgroundColor: "rgba(251,146,60,0.15)" }]}><Text style={[styles.idBadgeText, { color: "#fb923c" }]}>{student.gender}</Text></View> : null}
                  </View>
                </View>
              </View>

              {/* Footer with QR */}
              <View style={styles.idFooter}>
                <View style={styles.idQrWrap}>
                  <QRCode
                    value={JSON.stringify({
                      id: student.studentId || student._id,
                      name: student.name,
                      dept: student.department,
                      batch: student.admissionYear,
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
                  <Text style={styles.idBatchLabel}>Batch {student.admissionYear || "—"}</Text>
                  <Text style={styles.idIssued}>
                    {student.createdAt
                      ? new Date(student.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                      : "—"}
                  </Text>
                  <Text style={styles.idWatermark}>COLLAHUB</Text>
                </View>
              </View>

              <LinearGradient colors={["#00c6ff22", "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.idBottomStripe} />
            </LinearGradient>
          </View>

          {/* Download button */}
          <Pressable style={[styles.downloadBtn, downloading && { opacity: 0.7 }]}
            onPress={downloadCard} disabled={downloading}>
            <LinearGradient colors={["#0072ff", "#00c6ff"]}
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
            {IS_WEB ? "PNG download starts from your browser." : "Saved to your gallery for sharing and printing."}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ══ FULL IMAGE PREVIEW MODAL ══ */}
      <Modal
        visible={previewImageModal}
        transparent
        animationType="fade"
      >
        <Pressable
          style={styles.fullImageModalBg}
          onPress={() => setPreviewImageModal(false)}
        >
          <Image
            source={{ uri: imgSrc }}
            style={styles.fullImagePreview}
          />
        </Pressable>
      </Modal>

      {/* ══ PROFILE IMAGE CHANGE MODAL ══ */}
      <Modal
        visible={imageModal}
        transparent
        animationType="fade"
      >
        <Pressable
          style={styles.imgModalBg}
          onPress={() => setImageModal(false)}
        >
          <View style={styles.imgModalCard}>
            <Text style={styles.imgModalTitle}>
              Change Profile Photo
            </Text>

            <View style={styles.imgPreviewWrap}>
              <Image
                source={{ uri: imgSrc }}
                style={styles.imgPreview}
              />

              {uploading && (
                <View style={styles.imgUploadingOverlay}>
                  <ActivityIndicator
                    size="large"
                    color="#00c6ff"
                  />
                  <Text style={styles.imgUploadingText}>
                    Uploading...
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              style={styles.imgPickBtn}
              onPress={changeProfileImage}
            >
              <LinearGradient
                colors={["#0072ff", "#00c6ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.imgPickGrad}
              >
                <Ionicons
                  name="image-outline"
                  size={17}
                  color="#fff"
                />
                <Text style={styles.imgPickText}>
                  Select from Gallery
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.imgCancelBtn}
              onPress={() => setImageModal(false)}
            >
              <Text style={styles.imgCancelText}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070d1a" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#070d1a", gap: 14 },
  loaderText: { color: "#374151", fontSize: 13 },
  // Hero
  hero: { alignItems: "center", justifyContent: "flex-end", paddingBottom: 24, overflow: "hidden" },
  deco1: { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -80, left: -60, backgroundColor: "rgba(0,198,255,0.05)" },
  deco2: { position: "absolute", width: 160, height: 160, borderRadius: 80, top: 30, right: -40, backgroundColor: "rgba(167,139,250,0.05)" },
  deco3: { position: "absolute", width: 100, height: 100, borderRadius: 50, bottom: 0, left: "30%", backgroundColor: "rgba(52,211,153,0.04)" },
  heroBar: { position: "absolute", top: 52, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  heroBarBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  heroBarTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarWrap: { alignItems: "center", marginBottom: 14, position: "relative" },
  avatarRingOuter: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: "rgba(0,198,255,0.45)", padding: 3, justifyContent: "center", alignItems: "center" },
  avatarRingInner: { width: 94, height: 94, borderRadius: 47, overflow: "hidden", borderWidth: 2, borderColor: "rgba(0,198,255,0.2)" },
  avatarImg: { width: "100%", height: "100%" },
  uploadingOverlay: { position: "absolute", width: 104, height: 104, borderRadius: 52, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  cameraFab: { position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: "#0072ff", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#070d1a" },
  heroNameWrap: { alignItems: "center" },
  heroName: { color: "#fff", fontSize: 21, fontWeight: "800", letterSpacing: 0.3 },
  heroId: { color: "#a8adb5", fontSize: 12, marginTop: 4 },
  // Stats strip
  statsStrip: { flexDirection: "row", backgroundColor: "#0f1b2d", marginHorizontal: 16, marginTop: -1, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingVertical: 14, paddingHorizontal: 10, justifyContent: "space-around", alignItems: "center" },
  statItem: { alignItems: "center", flex: 1 },
  statItemVal: { fontSize: 14, fontWeight: "800" },
  statItemLabel: { color: "#9ea8ba", fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.07)" },
  // Cards
  card: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#0f1b2d", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionHeadIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sectionHeadText: { color: "#cbd5e1", fontSize: 14, fontWeight: "700", letterSpacing: 0.3 },
  // Academic
  acadRow: { flexDirection: "row", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  acadBox: { flexGrow: 1, flexBasis: "30%", minWidth: 92, borderRadius: 16, padding: 12, alignItems: "center", gap: 6, borderWidth: 1 },
  acadCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  acadCircleNum: { color: "#00c6ff", fontSize: 20, fontWeight: "900" },
  acadBoxTitle: { color: "#fff", fontSize: 11, fontWeight: "700", textAlign: "center" },
  acadBoxSub: { color: "#f7f8f9ef", fontSize: 9, textAlign: "center" },
  deptBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,198,255,0.25)", backgroundColor: "rgba(0,198,255,0.06)", flexShrink: 1 },
  deptBadgeText: { color: "#00c6ff", fontSize: 12, fontWeight: "600", flexShrink: 1 },
  // Info rows
  infoCard: { borderRadius: 14, overflow: "hidden", backgroundColor: "#0a1422" },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { color: "#eaecefb6", fontSize: 10, fontWeight: "600", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },
  // Results
  resultCard: { borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(52,211,153,0.15)", minWidth: 88 },
  resultSem: { color: "#64748b", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  resultSgpa: { fontSize: 22, fontWeight: "900" },
  resultLabel: { color: "#374151", fontSize: 9, fontWeight: "600" },
  resultCgpa: { color: "#94a3b8", fontSize: 10, marginTop: 4 },
  resultStatusBadge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  // ID Card
  idCardOuter: { borderRadius: 20, overflow: "hidden", marginBottom: 14, elevation: 8, shadowColor: "#00c6ff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  idCard: { borderRadius: 20, overflow: "hidden" },
  idStripe: { height: 5, width: "100%" },
  idHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  idLogo: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(0,198,255,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  idCollegeName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  idCollegeSub: { color: "#fcfcfcce", fontSize: 9, marginTop: 1 },
  idTypeBadge: { backgroundColor: "rgba(0,198,255,0.12)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  idTypeText: { color: "#00c6ff", fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  idBody: { flexDirection: "row", gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", flexWrap: "wrap" },
  idPhotoFrame: { width: 78, height: 78, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(0,198,255,0.3)" },
  idPhoto: { width: "100%", height: "100%" },
  idDetails: { flex: 1, minWidth: 170 },
  idName: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 3 },
  idStudentId: { color: "#00c6ff", fontSize: 11, fontWeight: "700", marginBottom: 8 },
  idDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 8 },
  idDept: { color: "#fdfeff", fontSize: 10, marginBottom: 2, lineHeight: 15 },
  idEmail: { color: "#ffffff", fontSize: 10, marginBottom: 2 },
  idPhone: { color: "#ffffff", fontSize: 10, marginBottom: 4 },
  idBadgesRow: { flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 4 },
  idBadge: { backgroundColor: "rgba(0,198,255,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  idBadgeText: { color: "#00c6ff", fontSize: 9, fontWeight: "700" },
  idFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, gap: 12, flexWrap: "wrap" },
  idQrWrap: { backgroundColor: "rgba(255,255,255,0.04)", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  idFooterRight: { alignItems: "flex-end", gap: 5 },
  idValidBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idValidText: { color: "#34d399", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  idBatchLabel: { color: "#d2d5d9d4", fontSize: 10 },
  idIssued: { color: "#959ba4", fontSize: 9 },
  idWatermark: { color: "rgba(0, 200, 255, 0.39)", fontSize: 16, fontWeight: "900", letterSpacing: 4, marginTop: 2 },
  idBottomStripe: { height: 3, width: "100%" },
  downloadBtn: { borderRadius: 14, overflow: "hidden" },
  downloadGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  downloadText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  downloadHint: { color: "#1f2937", fontSize: 11, textAlign: "center", marginTop: 8 },
  // Image modal
  imgModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  imgModalCard: { backgroundColor: "#0f1b2d", borderRadius: 24, padding: 24, width: width - 60, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  imgModalTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 16 },
  imgPreviewWrap: { width: 120, height: 120, borderRadius: 60, overflow: "hidden", marginBottom: 20, borderWidth: 2, borderColor: "rgba(0,198,255,0.35)", position: "relative" },
  imgPreview: { width: "100%", height: "100%" },
  imgUploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", gap: 8 },
  imgUploadingText: { color: "#00c6ff", fontSize: 11, fontWeight: "600" },
  imgPickBtn: { borderRadius: 14, overflow: "hidden", width: "100%", marginBottom: 10 },
  imgPickGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  imgPickText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  imgCancelBtn: { paddingVertical: 12, width: "100%", alignItems: "center" },
  imgCancelText: { color: "#4b5563", fontWeight: "600", fontSize: 14 },
  // Full image preview modal
  fullImageModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  fullImagePreview: { width: "90%", height: "70%", resizeMode: "contain", borderRadius: 16 },
});
