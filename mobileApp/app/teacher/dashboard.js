// app/teacher/dashboard.js
import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, Pressable,
  ActivityIndicator, BackHandler, ToastAndroid,
  StatusBar, FlatList, RefreshControl, Dimensions,
  Modal, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import API from "../../services/api";
import PostCard from "../teacher/components/PostCard";

const { width } = Dimensions.get("window");
const IS_WEB = Platform.OS === "web";

const ROLE_COLORS = { admin: "#a78bfa", teacher: "#f59e0b", student: "#00c6ff" };
const CAT_COLORS = {
  General: "#00c6ff", Academic: "#34d399", Event: "#a78bfa",
  Holiday: "#34d399", Exam: "#f87171", Alert: "#f59e0b",
};
const CATEGORIES = ["General", "Academic", "Event", "Holiday", "Exam", "Alert"];
const DAY_COLORS = {
  Monday: "#00c6ff", Tuesday: "#a78bfa", Wednesday: "#34d399",
  Thursday: "#fbbf24", Friday: "#f87171", Saturday: "#fb923c",
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const SafeImage = ({ uri, size = 44, initials = "?", color = "#f59e0b", style }) => {
  const [err, setErr] = React.useState(false);
  const ok = uri && !err && (uri.startsWith("http://") || uri.startsWith("https://"));
  if (ok) return (
    <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      resizeMode="cover" onError={() => setErr(true)} />
  );
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + "22", justifyContent: "center", alignItems: "center"
    }, style]}>
      <Text style={{ color, fontSize: size * 0.36, fontWeight: "800" }}>
        {(initials || "?").substring(0, 2)}
      </Text>
    </View>
  );
};


const StatCard = ({ icon, label, value, color, sub }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

const QuickCard = ({ icon, label, color, onPress, badge }) => (
  <Pressable onPress={onPress} style={styles.quickCard}>
    <LinearGradient colors={[color + "33", color + "11"]} style={styles.quickGrad}>
      <View style={[styles.quickIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
      {badge ? (
        <View style={[styles.quickBadge, { backgroundColor: color }]}>
          <Text style={styles.quickBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </LinearGradient>
  </Pressable>
);

const TodayClasses = ({ timetable }) => {
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const todaySlots = (timetable?.[todayName] || []).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  if (!timetable) return null;
  return (
    <View style={styles.todaySection}>
      <View style={styles.todaySectionHeader}>
        <View style={styles.todayDot} />
        <Text style={styles.todaySectionTitle}>Today's Classes</Text>
        <Text style={styles.todaySectionDay}>{todayName}</Text>
        {todaySlots.length > 0 && (
          <View style={styles.todayCountBadge}>
            <Text style={styles.todayCountText}>{todaySlots.length}</Text>
          </View>
        )}
      </View>
      {todaySlots.length === 0 ? (
        <View style={styles.noClassBox}>
          <Ionicons name="cafe-outline" size={22} color="#374151" />
          <Text style={styles.noClassText}>No classes today ðŸŽ‰</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
          {todaySlots.map((slot, i) => {
            const dayColor = DAY_COLORS[todayName] || "#00c6ff";
            return (
              <View key={i} style={[styles.classCard, { borderLeftColor: dayColor }]}>
                <Text style={styles.classSubject} numberOfLines={1}>{slot.subjectName}</Text>
                <View style={styles.classInfoRow}>
                  <Ionicons name="time-outline" size={12} color="#64748b" />
                  <Text style={styles.classTime}>{slot.startTime} {slot.endTime}</Text>
                </View>
                {slot.room && (
                  <View style={styles.classInfoRow}>
                    <Ionicons name="location-outline" size={12} color="#64748b" />
                    <Text style={styles.classRoom}>Room {slot.room}</Text>
                  </View>
                )}
                <View style={styles.classInfoRow}>
                  <Ionicons name="people-outline" size={12} color="#64748b" />
                  <Text style={styles.classMeta}>
                    Sem {slot.semester}{slot.section && slot.section !== "All" ? `, Sec = ${slot.section}` : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const CreatePostModal = ({ visible, onClose, teacherData, onPosted }) => {
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [posting, setPosting] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [postType, setPostType] = useState("post");

  const resetForm = () => { setTitle(""); setCaption(""); setCategory("General"); setMediaFile(null); setPostType("post"); };
  const handleClose = () => { resetForm(); onClose(); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
    if (!result.canceled) {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop().toLowerCase();
      setMediaFile({ uri: asset.uri, type: "image", name: `photo.${ext}`, mimeType: asset.mimeType || `image/${ext}` });
    }
  };
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 });
    if (!result.canceled) {
      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop().toLowerCase();
      setMediaFile({ uri: asset.uri, type: "video", name: `video.${ext}`, mimeType: asset.mimeType || `video/${ext}` });
    }
  };
  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["audio/*"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setMediaFile({ uri: a.uri, type: "audio", name: a.name || "audio.mp3", mimeType: a.mimeType || "audio/mpeg" });
      }
    } catch { }
  };
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["*/*"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        setMediaFile({ uri: a.uri, type: "document", name: a.name || "document", mimeType: a.mimeType || "application/octet-stream" });
      }
    } catch { }
  };

  const handlePost = async () => {
    if (!caption.trim() && !title.trim() && !mediaFile) return Alert.alert("Error", "Write something or attach media");
    try {
      setPosting(true);
      const formData = new FormData();
      formData.append("caption", caption.trim());
      formData.append("title", title.trim());
      formData.append("category", category);
      formData.append("authorName", teacherData?.name || "Teacher");
      formData.append("authorRole", "teacher");
      formData.append("postType", postType);
      if (mediaFile) formData.append("media", { uri: mediaFile.uri, type: mediaFile.mimeType, name: mediaFile.name });
      await API.post("/api/posts", formData, { headers: { "Content-Type": "multipart/form-data" } });
      resetForm(); onClose(); onPosted?.();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not post");
    } finally { setPosting(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalOverlay}>
          <View style={styles.createSheet}>
            <View style={styles.handle} />
            <View style={styles.createHeader}>
              <View style={styles.createAuthorRow}>
                <View style={styles.createAvatar}>
                  <Text style={styles.createAvatarText}>
                    {teacherData?.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "T"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.createAuthorName}>{teacherData?.name || "Teacher"}</Text>
                  <View style={styles.teacherBadge}><Text style={styles.teacherBadgeText}>TEACHER</Text></View>
                </View>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>

            <View style={styles.postTypeTabs}>
              <Pressable style={[styles.postTypeTab, postType === "post" && styles.postTypeTabActive]}
                onPress={() => setPostType("post")}>
                <Ionicons name="newspaper-outline" size={14} color={postType === "post" ? "#f59e0b" : "#64748b"} />
                <Text style={[styles.postTypeText, postType === "post" && { color: "#f59e0b" }]}>Post</Text>
              </Pressable>
              <Pressable style={[styles.postTypeTab, postType === "note" && styles.postTypeTabActiveNote]}
                onPress={() => setPostType("note")}>
                <Ionicons name="document-text-outline" size={14} color={postType === "note" ? "#00c6ff" : "#64748b"} />
                <Text style={[styles.postTypeText, postType === "note" && { color: "#00c6ff" }]}>Note / Study Material</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}>
              <TextInput style={styles.titleInput}
                placeholder={postType === "note" ? "Note title (e.g. Chapter 3 - Arrays)" : "Post title (optional)"}
                placeholderTextColor="#374151" value={title} onChangeText={setTitle} maxLength={100} />
              <TextInput style={styles.captionInput}
                placeholder={postType === "note" ? "Write note content..." : "Share something..."}
                placeholderTextColor="#374151" value={caption} onChangeText={setCaption}
                multiline maxLength={2000} textAlignVertical="top" />

              {mediaFile && (
                <View style={styles.mediaPreviewBox}>
                  {mediaFile.type === "image" && (
                    <Image source={{ uri: mediaFile.uri }} style={styles.mediaPreviewImg} resizeMode="cover" />
                  )}
                  {(mediaFile.type === "audio" || mediaFile.type === "document" || mediaFile.type === "video") && (
                    <View style={styles.audioPrev}>
                      <View style={styles.audioPrevIcon}>
                        <Ionicons name={mediaFile.type === "audio" ? "musical-notes" : mediaFile.type === "video" ? "videocam" : "document-text"}
                          size={28} color={mediaFile.type === "audio" ? "#34d399" : "#a78bfa"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.audioPrevTitle}>{mediaFile.name}</Text>
                        <Text style={styles.audioPrevSub}>Ready to upload</Text>
                      </View>
                    </View>
                  )}
                  <Pressable style={styles.mediaRemoveBtn} onPress={() => setMediaFile(null)}>
                    <Ionicons name="close-circle" size={22} color="#f87171" />
                  </Pressable>
                </View>
              )}

              {!mediaFile && (
                <View style={styles.mediaPickerRow}>
                  {[
                    { icon: "image", color: "#00c6ff", label: "Image", fn: pickImage },
                    { icon: "videocam", color: "#a78bfa", label: "Video", fn: pickVideo },
                    { icon: "document-attach", color: "#34d399", label: "File", fn: pickDocument },
                    { icon: "musical-notes", color: "#fb923c", label: "Audio", fn: pickAudio },
                  ].map((m, i) => (
                    <Pressable key={i} style={styles.mediaPicker} onPress={m.fn}>
                      <LinearGradient colors={[m.color + "22", m.color + "08"]} style={styles.mediaPickerGrad}>
                        <View style={[styles.mediaPickerIcon, { backgroundColor: m.color + "18" }]}>
                          <Ionicons name={m.icon} size={20} color={m.color} />
                        </View>
                        <Text style={[styles.mediaPickerLabel, { color: m.color }]}>{m.label}</Text>
                      </LinearGradient>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={styles.catLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 4 }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat, cc = CAT_COLORS[cat] || "#64748b";
                  return (
                    <Pressable key={cat}
                      style={[styles.catChip, active && { backgroundColor: cc + "22", borderColor: cc + "55" }]}
                      onPress={() => setCategory(cat)}>
                      <Text style={[styles.catChipText, active && { color: cc }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable style={[styles.postBtn, posting && { opacity: 0.65 }]} onPress={handlePost} disabled={posting}>
                <LinearGradient
                  colors={postType === "note" ? ["#00c6ff", "#0284c7"] : ["#f59e0b", "#d97706"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.postGrad}>
                  {posting
                    ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.postBtnText}>Uploading...</Text></>
                    : <><Ionicons name={postType === "note" ? "document-text" : "send"} size={17} color="#fff" />
                      <Text style={styles.postBtnText}>{postType === "note" ? "Share Note" : "Post Now"}</Text></>
                  }
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const CommentModal = ({ post, visible, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!post?._id) return;
    setLoading(true);
    try { const r = await API.get(`/api/posts/${post._id}/comments`); setComments(r.data?.comments || []); }
    catch { } finally { setLoading(false); }
  }, [post?._id]);

  React.useEffect(() => { if (visible) load(); }, [visible]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await API.post(`/api/posts/${post._id}/comment`, { text });
      setText(""); load(); onCommentAdded?.();
    } catch { Alert.alert("Error", "Could not post comment"); }
    finally { setSending(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalOverlay}>
          <View style={styles.commentSheet}>
            <View style={styles.handle} />
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>Comments {comments.length > 0 ? `(${comments.length})` : ""}</Text>
              <Pressable onPress={onClose}><Ionicons name="close" size={22} color="#64748b" /></Pressable>
            </View>
            {loading ? <ActivityIndicator color="#f59e0b" style={{ margin: 20 }} /> : (
              <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                {comments.length === 0 && <Text style={styles.noComments}>No comments yet ðŸ’¬</Text>}
                {comments.map((c, i) => {
                  const rc = ROLE_COLORS[c.userRole] || "#64748b";
                  const ci = c.userName?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
                  return (
                    <View key={i} style={styles.commentItem}>
                      <View style={[styles.commentAvatar, { backgroundColor: rc + "22" }]}>
                        <Text style={[styles.commentAvatarText, { color: rc }]}>{ci}</Text>
                      </View>
                      <View style={styles.commentBody}>
                        <View style={styles.commentNameRow}>
                          <Text style={styles.commentName}>{c.userName || "Unknown"}</Text>
                          <View style={[styles.miniRole, { backgroundColor: rc + "20" }]}>
                            <Text style={[styles.miniRoleText, { color: rc }]}>{(c.userRole || "user").toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.commentText}>{c.text}</Text>
                        <Text style={styles.commentTime}>{c.createdAt ? timeAgo(c.createdAt) : ""}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.commentInputRow}>
              <TextInput style={styles.commentInput} value={text} onChangeText={setText}
                placeholder="Write a comment..." placeholderTextColor="#374151" multiline maxLength={300} />
              <Pressable style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
                onPress={send} disabled={!text.trim() || sending}>
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={17} color="#fff" />}
              </Pressable>
            </View>
            <View style={{ height: 20 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function TeacherDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  const [teacherData, setTeacherData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [stats, setStats] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [posts, setPosts] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const [commentVisible, setCommentVisible] = useState(false);
  const backCount = useRef(0);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("teacherLoggedIn");
    if (!token) { router.replace("/login"); return; }
    const raw = await AsyncStorage.getItem("teacherData");
    if (raw) {
      try {
        const d = JSON.parse(raw);
        setTeacherData(d);
       
        const img = d.profileImage;
        setProfileImage(img && img.startsWith("http") ? img : null);
      } catch { }
    }
    try {
      const [statsRes, ttRes, postsRes] = await Promise.allSettled([
        API.get("/dashboard/teacher"),
        API.get("/subject-requests/teacher-timetable"),
        API.get("/api/posts"),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (ttRes.status === "fulfilled") setTimetable(ttRes.value.data?.timetable || {});
      if (postsRes.status === "fulfilled") setPosts(postsRes.value.data?.posts || postsRes.value.data || []);
    } catch { }
    // Profile already loaded from AsyncStorage above
    setCheckingAuth(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    if (IS_WEB) return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backCount.current === 0) {
        backCount.current = 1;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backCount.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp(); return true;
    });
    return () => h.remove();
  }, []));

  const handleLike = async (post) => {
    try {
      const r = await API.post(`/api/posts/${post._id}/like`);
      setPosts(prev => prev.map(p => p._id === post._id ? { ...p, isLiked: r.data.liked, likeCount: r.data.likeCount } : p));
    } catch { }
  };

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch { }
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "teacherData", "teacherLoggedIn"]);
    router.replace("/login");
  };

  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const todayClasses = (timetable?.[todayName] || []).length;
  const totalClasses = timetable ? Object.values(timetable).reduce((a, s) => a + s.length, 0) : 0;
  const noteCount = posts.filter(p => p.postType === "note").length;
  const initials = teacherData?.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "T";

  const quickLinks = [
    { icon: "book-outline", label: "My Subjects", color: "#34d399", route: "/teacher/my-subjects" },
    { icon: "people-outline", label: "Students", color: "#60a5fa", route: "/teacher/teacher-students" },
    { icon: "document-text", label: "Notes", color: "#00c6ff", route: "/teacher/notes-upload" },
    { icon: "time-outline", label: "Timetable", color: "#a78bfa", route: "/teacher/timetable", badge: totalClasses > 0 ? `${totalClasses}` : null },
    { icon: "clipboard-outline", label: "Assignments", color: "#fb923c", route: "/teacher/assignments" },
    { icon: "bar-chart-outline", label: "Results", color: "#f59e0b", route: "/teacher/result" },
    { icon: "calendar-outline", label: "Attendance", color: "#f87171", route: "/teacher/mark-attendance" },
    { icon: "chatbubble-outline", label: "Posts", color: "#a78bfa", badge: noteCount > 0 ? `${noteCount}` : null, onPress: () => setCreateVisible(true) },
  ];

  if (checkingAuth) return (
    <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#f59e0b" /></View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      <LinearGradient colors={["#0a0f1e", "#1a1500"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>COLLAHUB</Text>
          <Text style={styles.headerSub}>Teacher Portal</Text>
        </View>

        <Pressable onPress={() => router.push("/teacher/profile")}>
          <SafeImage
            uri={profileImage}
            size={40}
            initials={initials}
            color="#f59e0b"
            style={{ borderWidth: 2, borderColor: "#f59e0b" }}
          />
        </Pressable>
      </LinearGradient>

      <FlatList
        data={posts}
        keyExtractor={(item, i) => item._id || i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#f59e0b" />}
        ListHeaderComponent={() => (
          <>
            {/* Welcome Card */}
            <LinearGradient colors={["#f59e0b", "#d97706"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.welcomeCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeHi}>Hello, {teacherData?.name?.split(" ")[0] || "Teacher"}</Text>
                {teacherData?.teacherId && (
                  <View style={styles.idBadge}>
                    <Ionicons name="card-outline" size={11} color="rgba(0,0,0,0.55)" />
                    <Text style={styles.idBadgeText}>ID: {teacherData.teacherId}</Text>
                  </View>
                )}
                {teacherData?.department && (
                  <Text style={styles.welcomeSub} numberOfLines={1}>{teacherData.department}</Text>
                )}
                {teacherData?.college && (
                  <Text style={styles.welcomeSub} numberOfLines={1}>{teacherData.college}</Text>
                )}
              </View>
              <View style={styles.welcomeRight}>
                
                <SafeImage
                  uri={profileImage}
                  size={60}
                  initials={initials}
                  color="#d97706"
                  style={{ borderWidth: 2.5, borderColor: "rgba(255,255,255,0.4)" }}
                />
                <View style={styles.rolePill}><Text style={styles.rolePillText}>TEACHER</Text></View>
              </View>
            </LinearGradient>

            {/* Stats */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsRow}>
              <StatCard icon="people" label="Dept Students" value={stats?.totalStudents} color="#f59e0b" sub={teacherData?.department?.match(/\(([^)]+)\)/)?.[1] || ""} />
              <StatCard icon="today-outline" label="Today's Classes" value={todayClasses} color="#34d399" sub={todayName} />
              <StatCard icon="calendar" label="Total Classes" value={totalClasses} color="#60a5fa" />
              <StatCard icon="checkmark-circle" label="Attendance" value={stats?.attendanceMarked} color="#a78bfa" />
            </View>

            {/* Today's classes */}
            <TodayClasses timetable={timetable} />


            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickGrid}>
              {quickLinks.map((q, i) => (
                <QuickCard key={i} icon={q.icon} label={q.label} color={q.color}
                  badge={q.badge}
                  onPress={q.onPress || (() => router.push(q.route))} />
              ))}
            </View>

            {/* Create post bar */}
            <Pressable style={styles.createPostBar} onPress={() => setCreateVisible(true)}>
              <View style={styles.createPostLeft}>
                <SafeImage uri={profileImage} size={38} initials={initials} color="#f59e0b" />
                <Text style={styles.createPostPlaceholder}>Share post or study note...</Text>
              </View>
              <View style={styles.createPostActions}>
                {[
                  { icon: "image-outline", color: "#00c6ff" },
                  { icon: "document-text-outline", color: "#34d399" },
                  { icon: "videocam-outline", color: "#a78bfa" },
                ].map((a, i) => (
                  <View key={i} style={[styles.createPostActionBtn, { backgroundColor: a.color + "12" }]}>
                    <Ionicons name={a.icon} size={15} color={a.color} />
                  </View>
                ))}
              </View>
            </Pressable>

            <View style={styles.feedHeaderRow}>
              <Text style={styles.sectionTitle}>Feed</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {noteCount > 0 && (
                  <View style={styles.noteCountBadge}>
                    <Ionicons name="document-text" size={11} color="#00c6ff" />
                    <Text style={styles.noteCountText}>{noteCount} notes</Text>
                  </View>
                )}
                {posts.length > 0 && (
                  <View style={styles.feedCount}>
                    <Text style={styles.feedCountText}>{posts.length} posts</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyFeed}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="newspaper-outline" size={36} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share something!</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <PostCard item={item} onLike={handleLike}
            onCommentPress={(p) => { setCommentPost(p); setCommentVisible(true); }} />
        )}
        ListFooterComponent={() => (
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color="#f87171" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        )}
      />

      <CreatePostModal visible={createVisible} onClose={() => setCreateVisible(false)}
        teacherData={teacherData} onPosted={() => loadAll()} />
      <CommentModal post={commentPost} visible={commentVisible}
        onClose={() => setCommentVisible(false)}
        onCommentAdded={() => {
          setPosts(prev => prev.map(p => p._id === commentPost?._id ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
        }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#080d17" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  feedContainer: { paddingHorizontal: 16, paddingBottom: 30 },
  welcomeCard: { borderRadius: 20, padding: 22, marginTop: 14, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcomeHi: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  idBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  idBadgeText: { color: "rgba(0,0,0,0.7)", fontSize: 11, fontWeight: "800" },
  welcomeSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 3 },
  welcomeRight: { alignItems: "center", gap: 8 },
  rolePill: { backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rolePillText: { color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  sectionTitle: { color: "#cbd5e1", fontSize: 14, fontWeight: "700", marginBottom: 12, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: { width: (width - 52) / 2, backgroundColor: "#1a2535", borderRadius: 14, padding: 14, borderLeftWidth: 3 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 11, marginTop: 2 },
  statSub: { color: "#374151", fontSize: 10, marginTop: 2 },
  todaySection: { backgroundColor: "#1a2535", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  todaySectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34d399" },
  todaySectionTitle: { color: "#fff", fontSize: 14, fontWeight: "700", flex: 1 },
  todaySectionDay: { color: "#64748b", fontSize: 12 },
  todayCountBadge: { backgroundColor: "rgba(52,211,153,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  todayCountText: { color: "#34d399", fontSize: 11, fontWeight: "700" },
  noClassBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  noClassText: { color: "#374151", fontSize: 12 },
  classCard: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 14, borderLeftWidth: 3, width: 180 },
  classSubject: { color: "#fff", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  classInfoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  classTime: { color: "#94a3b8", fontSize: 11 },
  classRoom: { color: "#64748b", fontSize: 11 },
  classMeta: { color: "#64748b", fontSize: 11 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  quickCard: { width: (width - 52) / 2, borderRadius: 16, overflow: "hidden" },
  quickGrad: { padding: 18, alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 8, minHeight: 95 },
  quickIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  quickLabel: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  quickBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  quickBadgeText: { color: "#000", fontSize: 10, fontWeight: "800" },
  createPostBar: { backgroundColor: "#1a2535", borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  createPostLeft: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  createPostPlaceholder: { color: "#374151", fontSize: 13, flex: 1 },
  createPostActions: { flexDirection: "row", gap: 8, paddingLeft: 48 },
  createPostActionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  feedHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  feedCount: { backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  feedCountText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
  noteCountBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,198,255,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  noteCountText: { color: "#00c6ff", fontSize: 11, fontWeight: "700" },
  postCard: { backgroundColor: "#1a2535", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  noteCard: { borderColor: "rgba(0,198,255,0.2)", backgroundColor: "rgba(0,198,255,0.03)" },
  noteBadgeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  noteBadgeText: { color: "#00c6ff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  postAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  postAvatarText: { fontSize: 16, fontWeight: "800" },
  postAuthorInfo: { flex: 1 },
  postAuthorName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  postMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  postTime: { color: "#374151", fontSize: 11 },
  catBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  catBadgeText: { fontSize: 10, fontWeight: "700" },
  postTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  postContent: { color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 4 },
  postImage: { width: "100%", height: 220, borderRadius: 14, marginTop: 8 },
  mediaBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 10, marginTop: 8 },
  mediaBannerText: { color: "#94a3b8", fontSize: 13 },
  postFooter: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerCount: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  emptyFeed: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 15, fontWeight: "700" },
  emptySubtitle: { color: "#1f2937", fontSize: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, padding: 14, backgroundColor: "rgba(248,113,113,0.08)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(248,113,113,0.15)" },
  logoutText: { color: "#f87171", fontWeight: "700", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "flex-end" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  createSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  createHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 10 },
  createAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  createAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(245,158,11,0.15)", justifyContent: "center", alignItems: "center" },
  createAvatarText: { color: "#f59e0b", fontSize: 16, fontWeight: "800" },
  createAuthorName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  teacherBadge: { backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 3 },
  teacherBadgeText: { color: "#f59e0b", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  postTypeTabs: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  postTypeTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  postTypeTabActive: { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.3)" },
  postTypeTabActiveNote: { backgroundColor: "rgba(0,198,255,0.12)", borderColor: "rgba(0,198,255,0.3)" },
  postTypeText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  titleInput: { color: "#fff", fontSize: 16, fontWeight: "700", paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  captionInput: { color: "#fff", fontSize: 14, lineHeight: 22, paddingHorizontal: 20, paddingVertical: 14, minHeight: 110, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  mediaPreviewBox: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, overflow: "hidden", position: "relative" },
  mediaPreviewImg: { width: "100%", height: 200, borderRadius: 16 },
  audioPrev: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(52,211,153,0.1)", padding: 18, borderRadius: 16 },
  audioPrevIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(52,211,153,0.15)", justifyContent: "center", alignItems: "center" },
  audioPrevTitle: { color: "#34d399", fontSize: 13, fontWeight: "700" },
  audioPrevSub: { color: "#64748b", fontSize: 11, marginTop: 3 },
  mediaRemoveBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12 },
  mediaPickerRow: { flexDirection: "row", paddingHorizontal: 20, marginTop: 14, gap: 8 },
  mediaPicker: { flex: 1, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  mediaPickerGrad: { alignItems: "center", padding: 12, gap: 6, borderRadius: 14 },
  mediaPickerIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  mediaPickerLabel: { fontSize: 10, fontWeight: "700" },
  catLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.5 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  catChipText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  postBtn: { marginHorizontal: 20, marginTop: 16, borderRadius: 14, overflow: "hidden" },
  postGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  commentSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "75%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 10 },
  commentTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  noComments: { color: "#374151", textAlign: "center", marginTop: 20, fontSize: 13 },
  commentItem: { flexDirection: "row", gap: 10, marginBottom: 14 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  commentAvatarText: { fontSize: 13, fontWeight: "800" },
  commentBody: { flex: 1 },
  commentNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  commentName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  miniRole: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  miniRoleText: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  commentText: { color: "#94a3b8", fontSize: 13, lineHeight: 19 },
  commentTime: { color: "#374151", fontSize: 10, marginTop: 3 },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", padding: 16, paddingTop: 8, gap: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  commentInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", maxHeight: 80 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f59e0b", justifyContent: "center", alignItems: "center" },
});