import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, Pressable,
  ActivityIndicator, BackHandler, ToastAndroid,
  StatusBar, FlatList, RefreshControl, Dimensions,
  Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const ROLE_COLORS = { admin:"#a78bfa", teacher:"#f59e0b", student:"#00c6ff" };
const CAT_COLORS  = {
  General:"#00c6ff", Academic:"#34d399", Event:"#a78bfa",
  Holiday:"#34d399", Exam:"#f87171", Alert:"#f59e0b",
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

// ─── Stat Card ───
const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value ?? "—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Comment Modal ───
const CommentModal = ({ post, visible, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [sending, setSending]   = useState(false);

  const load = useCallback(async () => {
    if (!post?._id) return;
    setLoading(true);
    try {
      const r = await API.get(`/api/posts/${post._id}/comments`);
      setComments(r.data?.comments || []);
    } catch {}
    finally { setLoading(false); }
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
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
        <View style={styles.commentOverlay}>
          <View style={styles.commentSheet}>
            <View style={styles.commentHandle} />
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>
                Comments {comments.length > 0 ? `(${comments.length})` : ""}
              </Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            {loading
              ? <ActivityIndicator color="#00c6ff" style={{margin:20}} />
              : (
                <ScrollView style={{maxHeight:320}} contentContainerStyle={{padding:16}} showsVerticalScrollIndicator={false}>
                  {comments.length === 0 && (
                    <Text style={styles.noComments}>No comments yet. Be first! 💬</Text>
                  )}
                  {comments.map((c, i) => {
                    const rc = ROLE_COLORS[c.userRole] || "#64748b";
                    const ci = c.userName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";
                    return (
                      <View key={i} style={styles.commentItem}>
                        <View style={[styles.commentAvatar,{backgroundColor:rc+"22"}]}>
                          <Text style={[styles.commentAvatarText,{color:rc}]}>{ci}</Text>
                        </View>
                        <View style={styles.commentBody}>
                          <View style={styles.commentNameRow}>
                            <Text style={styles.commentName}>{c.userName}</Text>
                            <View style={[styles.miniRole,{backgroundColor:rc+"20"}]}>
                              <Text style={[styles.miniRoleText,{color:rc}]}>{c.userRole?.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={styles.commentText}>{c.text}</Text>
                          <Text style={styles.commentTime}>{c.createdAt ? timeAgo(c.createdAt) : ""}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )
            }
            <View style={styles.commentInputRow}>
              <TextInput style={styles.commentInput} value={text} onChangeText={setText}
                placeholder="Write a comment..." placeholderTextColor="#374151"
                multiline maxLength={300} />
              <Pressable style={[styles.sendBtn,(!text.trim()||sending)&&{opacity:0.4}]}
                onPress={send} disabled={!text.trim()||sending}>
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="send" size={17} color="#fff" />}
              </Pressable>
            </View>
            <View style={{height:20}} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Post Card ───
const PostCard = ({ item, onLike, onCommentPress }) => {
  // Support both new Post model AND old notice model
  const authorName   = item.authorName  || item.author?.name  || "Unknown";
  const authorRole   = item.authorRole  || item.author?.role  || "admin";
  const caption      = item.caption     || item.content       || "";
  const likeCount    = item.likeCount   ?? (item.likes?.length   ?? 0);
  const commentCount = item.commentCount ?? (item.comments?.length ?? 0);
  const isLiked      = item.isLiked     ?? false;
  const catColor     = CAT_COLORS[item.category]   || "#64748b";
  const roleColor    = ROLE_COLORS[authorRole]      || "#64748b";
  const initials     = authorName.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";

  return (
    <View style={styles.postCard}>
      {/* Author row */}
      <View style={styles.postHeader}>
        <View style={[styles.postAvatar,{backgroundColor:roleColor+"22"}]}>
          <Text style={[styles.postAvatarText,{color:roleColor}]}>{initials}</Text>
        </View>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{authorName}</Text>
          <View style={styles.postMeta}>
            <View style={[styles.roleBadge,{backgroundColor:roleColor+"20"}]}>
              <Text style={[styles.roleBadgeText,{color:roleColor}]}>{authorRole.toUpperCase()}</Text>
            </View>
            <Text style={styles.postTime}>{item.createdAt ? timeAgo(item.createdAt) : ""}</Text>
          </View>
        </View>
        {item.category && (
          <View style={[styles.catBadge,{backgroundColor:catColor+"20"}]}>
            <Text style={[styles.catBadgeText,{color:catColor}]}>{item.category}</Text>
          </View>
        )}
      </View>
      {!!item.title && <Text style={styles.postTitle}>{item.title}</Text>}
      {!!caption && <Text style={styles.postContent}>{caption}</Text>}
      {item.mediaType==="image" && !!item.mediaUrl && (
        <Image source={{uri:item.mediaUrl}} style={styles.postImage} resizeMode="cover" />
      )}
      {item.mediaType==="video" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="videocam" size={16} color="#a78bfa" />
          <Text style={styles.mediaBannerText}>Video Attachment</Text>
        </View>
      )}
      {item.mediaType==="audio" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="musical-notes" size={16} color="#34d399" />
          <Text style={styles.mediaBannerText}>Audio Attachment</Text>
        </View>
      )}
      {!item.mediaType && !!item.image && (
        <Image source={{uri:item.image}} style={styles.postImage} resizeMode="cover" />
      )}
      {/* Like + Comment */}
      <View style={styles.postFooter}>
        <Pressable style={styles.footerBtn} onPress={()=>onLike(item)}>
          <Ionicons
            name={isLiked?"heart":"heart-outline"} size={21}
            color={isLiked?"#f87171":"#64748b"} />
          <Text style={[styles.footerCount,isLiked&&{color:"#f87171"}]}>{likeCount}</Text>
        </Pressable>
        <Pressable style={styles.footerBtn} onPress={()=>onCommentPress(item)}>
          <Ionicons name="chatbubble-outline" size={19} color="#64748b" />
          <Text style={styles.footerCount}>{commentCount}</Text>
        </Pressable>
        <Ionicons name="share-social-outline" size={18} color="#374151" />
      </View>
    </View>
  );
};

// ─── Tab Bar ───
const TABS = [
  { key:"home",       icon:"home",     label:"Home" },
  { key:"attendance", icon:"calendar", label:"Attend.",  route:"/student/attendance" },
  { key:"notes",      icon:"book",     label:"Notes",    route:"/student/notes" },
  { key:"timetable",  icon:"time",     label:"Schedule", route:"/student/timetable" },
  { key:"profile",    icon:"person",   label:"Profile",  route:"/student/profile" },
];
const TabItem = ({ tab, active, onPress }) => (
  <Pressable style={styles.tabItem} onPress={onPress}>
    <Ionicons name={active?tab.icon:tab.icon+"-outline"} size={22} color={active?"#00c6ff":"#374151"} />
    <Text style={[styles.tabLabel,active&&styles.tabLabelActive]}>{tab.label}</Text>
    {active && <View style={styles.tabDot} />}
  </Pressable>
);

// ════════════════════════════════════════════
export default function StudentDashboard() {
  const navigation = useNavigation();
  const router     = useRouter();

  const [activeTab, setActiveTab]       = useState("home");
  const [studentData, setStudentData]   = useState(null);
  const [image, setImage]               = useState(null);
  const [stats, setStats]               = useState(null);
  const [posts, setPosts]               = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [commentPost, setCommentPost]   = useState(null);
  const [commentVisible, setCommentVisible] = useState(false);
  const backPressCount = useRef(0);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh=false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("studentLoggedIn");
    if (!token) { router.replace("/(auth)/student-login"); return; }
    const raw = await AsyncStorage.getItem("studentData");
    if (raw) {
      const parsed = JSON.parse(raw);
      setStudentData(parsed);
      const img = await AsyncStorage.getItem(`profileImage_${parsed.studentId}`);
      if (img) setImage(img);
    }
    try { const r = await API.get("/dashboard/student"); if (r.data) setStats(r.data); } catch {}
    try {
      const r = await API.get("/api/posts");
      setPosts(r.data?.posts || r.data || []);
    } catch {}
    setCheckingAuth(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backPressCount.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp(); return true;
    });
    return () => handler.remove();
  }, []));

  const handleLike = async (post) => {
    try {
      const r = await API.post(`/api/posts/${post._id}/like`);
      setPosts(prev => prev.map(p =>
        p._id===post._id ? {...p, isLiked:r.data.liked, likeCount:r.data.likeCount} : p
      ));
    } catch {}
  };

  const handleTabPress = (tab) => {
    if (tab.route) router.push(tab.route);
    else setActiveTab(tab.key);
  };

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    await AsyncStorage.multiRemove(["accessToken","refreshToken","studentData","studentEmail","studentLoggedIn"]);
    router.replace("/");
  };

  // Section: "CSE 2023"
  const sectionLabel = (() => {
    if (!studentData?.admissionYear || !studentData?.department) return null;
    const short = studentData.department.match(/\(([^)]+)\)/)?.[1] || studentData.department.split(" ")[0];
    return `${short} ${studentData.admissionYear}`;
  })();

  if (checkingAuth) return (
    <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#00c6ff" /></View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* Sticky Header */}
      <LinearGradient colors={["#0f1923","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={()=>navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>COLLAहUB</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {studentData?.department?.split("(")[0]?.trim() || "Student Portal"}
          </Text>
        </View>
        <Pressable onPress={()=>router.push("/student/profile")}>
          <Image
            source={{uri:image||"https://cdn-icons-png.flaticon.com/512/149/149071.png"}}
            style={styles.avatar}
          />
        </Pressable>
      </LinearGradient>

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item,i)=>item._id||i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadAll(true)} tintColor="#00c6ff" />}
        ListHeaderComponent={() => (
          <>
            {/* Welcome */}
            <LinearGradient colors={["#0072ff","#00c6ff"]}
              start={{x:0,y:0}} end={{x:1,y:1}} style={styles.welcomeCard}>
              <View style={{flex:1}}>
                <Text style={styles.welcomeHi}>Hello, {studentData?.name?.split(" ")[0]||"Student"} 👋</Text>
                <Text style={styles.welcomeSub}>ID: {studentData?.studentId||"—"}</Text>
                <Text style={styles.welcomeSub} numberOfLines={1}>{studentData?.college||""}</Text>
                {/* Semester + Section */}
                <View style={styles.badgesRow}>
                  {studentData?.semester && (
                    <View style={styles.semBadge}>
                      <Ionicons name="layers" size={11} color="#fff" />
                      <Text style={styles.semBadgeText}>Semester {studentData.semester}</Text>
                    </View>
                  )}
                  {sectionLabel && (
                    <View style={styles.sectionBadge}>
                      <Ionicons name="people" size={11} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.sectionBadgeText}>{sectionLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="school" size={48} color="rgba(255,255,255,0.18)" />
            </LinearGradient>

            {/* Stats */}
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.statsRow}>
              <StatCard icon="document-text" label="Submissions" value={stats?.totalSubmissions} color="#00c6ff" />
              <StatCard icon="star"           label="Avg Marks"   value={stats?.averageMarks}     color="#f59e0b" />
              <StatCard icon="trending-up"    label="Highest"     value={stats?.highestMarks}     color="#10b981" />
              <StatCard icon="trophy"         label="Total Marks" value={stats?.totalMarks}       color="#a855f7" />
            </View>

            <View style={styles.feedHeaderRow}>
              <Text style={styles.sectionTitle}>Feed</Text>
              {posts.length > 0 && (
                <View style={styles.feedCount}>
                  <Text style={styles.feedCountText}>{posts.length} posts</Text>
                </View>
              )}
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyFeed}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="newspaper-outline" size={38} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>Posts from teachers & admins will appear here</Text>
          </View>
        )}
        renderItem={({item}) => (
          <PostCard item={item} onLike={handleLike}
            onCommentPress={(p)=>{setCommentPost(p);setCommentVisible(true);}} />
        )}
        ListFooterComponent={() =>
          posts.length > 0 ? (
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#f87171" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TabItem key={tab.key} tab={tab}
            active={activeTab===tab.key&&!tab.route}
            onPress={()=>handleTabPress(tab)} />
        ))}
      </View>

      {/* Comment Modal */}
      <CommentModal post={commentPost} visible={commentVisible}
        onClose={()=>setCommentVisible(false)}
        onCommentAdded={()=>{
          setPosts(prev=>prev.map(p=>
            p._id===commentPost?._id ? {...p,commentCount:(p.commentCount||0)+1} : p
          ));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#0f1923" },
  loaderContainer:{ flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#0f1923" },
  header:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingTop:52,paddingBottom:14 },
  menuBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter:{ flex:1,alignItems:"center" },
  headerTitle:{ color:"#fff",fontSize:18,fontWeight:"800",letterSpacing:0.5 },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  avatar:{ width:40,height:40,borderRadius:20,borderWidth:2,borderColor:"#00c6ff" },
  feedContainer:{ paddingHorizontal:16,paddingBottom:90 },
  welcomeCard:{ borderRadius:20,padding:22,marginTop:14,marginBottom:20,flexDirection:"row",justifyContent:"space-between",alignItems:"center" },
  welcomeHi:{ color:"#fff",fontSize:20,fontWeight:"800",marginBottom:4 },
  welcomeSub:{ color:"rgba(255,255,255,0.72)",fontSize:12,marginTop:2 },
  badgesRow:{ flexDirection:"row",gap:8,marginTop:12,flexWrap:"wrap" },
  semBadge:{ flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(0,0,0,0.25)",paddingHorizontal:10,paddingVertical:5,borderRadius:20 },
  semBadgeText:{ color:"#fff",fontSize:11,fontWeight:"800" },
  sectionBadge:{ flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(0,0,0,0.2)",paddingHorizontal:10,paddingVertical:5,borderRadius:20 },
  sectionBadgeText:{ color:"rgba(255,255,255,0.85)",fontSize:11,fontWeight:"600" },
  sectionTitle:{ color:"#cbd5e1",fontSize:14,fontWeight:"700",marginBottom:12,letterSpacing:0.5 },
  statsRow:{ flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:24 },
  statCard:{ width:(width-52)/2,backgroundColor:"#1a2535",borderRadius:14,padding:14,borderLeftWidth:3 },
  statIcon:{ width:36,height:36,borderRadius:10,justifyContent:"center",alignItems:"center",marginBottom:8 },
  statValue:{ color:"#fff",fontSize:22,fontWeight:"800" },
  statLabel:{ color:"#64748b",fontSize:11,marginTop:2 },
  feedHeaderRow:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12 },
  feedCount:{ backgroundColor:"rgba(0,198,255,0.1)",paddingHorizontal:10,paddingVertical:4,borderRadius:20 },
  feedCountText:{ color:"#00c6ff",fontSize:11,fontWeight:"700" },
  postCard:{ backgroundColor:"#1a2535",borderRadius:18,padding:16,marginBottom:12,borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  postHeader:{ flexDirection:"row",alignItems:"center",marginBottom:12,gap:10 },
  postAvatar:{ width:44,height:44,borderRadius:22,justifyContent:"center",alignItems:"center" },
  postAvatarText:{ fontSize:16,fontWeight:"800" },
  postAuthorInfo:{ flex:1 },
  postAuthorName:{ color:"#fff",fontSize:14,fontWeight:"700" },
  postMeta:{ flexDirection:"row",alignItems:"center",gap:8,marginTop:3 },
  roleBadge:{ paddingHorizontal:8,paddingVertical:2,borderRadius:6 },
  roleBadgeText:{ fontSize:9,fontWeight:"800",letterSpacing:0.5 },
  postTime:{ color:"#374151",fontSize:11 },
  catBadge:{ paddingHorizontal:9,paddingVertical:3,borderRadius:8 },
  catBadgeText:{ fontSize:10,fontWeight:"700" },
  postTitle:{ color:"#fff",fontSize:15,fontWeight:"700",marginBottom:6 },
  postContent:{ color:"#94a3b8",fontSize:13,lineHeight:20,marginBottom:4 },
  postImage:{ width:"100%",height:200,borderRadius:12,marginTop:8 },
  mediaBanner:{ flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"rgba(255,255,255,0.04)",padding:12,borderRadius:10,marginTop:8 },
  mediaBannerText:{ color:"#94a3b8",fontSize:13 },
  postFooter:{ flexDirection:"row",alignItems:"center",gap:24,marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.05)" },
  footerBtn:{ flexDirection:"row",alignItems:"center",gap:6 },
  footerCount:{ color:"#64748b",fontSize:13,fontWeight:"600" },
  emptyFeed:{ alignItems:"center",paddingVertical:40,gap:10 },
  emptyIconWrap:{ width:76,height:76,borderRadius:38,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle:{ color:"#374151",fontSize:16,fontWeight:"700" },
  emptyText:{ color:"#1f2937",fontSize:13,textAlign:"center",paddingHorizontal:30 },
  logoutBtn:{ flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:16,padding:14,backgroundColor:"rgba(248,113,113,0.08)",borderRadius:14,borderWidth:1,borderColor:"rgba(248,113,113,0.15)" },
  logoutText:{ color:"#f87171",fontWeight:"700",fontSize:14 },
  tabBar:{ position:"absolute",bottom:0,left:0,right:0,flexDirection:"row",backgroundColor:"#111827",borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.05)",paddingBottom:18,paddingTop:10 },
  tabItem:{ flex:1,alignItems:"center",justifyContent:"center",gap:3,position:"relative" },
  tabLabel:{ color:"#374151",fontSize:10,fontWeight:"600" },
  tabLabelActive:{ color:"#00c6ff" },
  tabDot:{ position:"absolute",bottom:-10,width:4,height:4,borderRadius:2,backgroundColor:"#00c6ff" },
  commentOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  commentSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:"78%",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  commentHandle:{ width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4 },
  commentHeader:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:20,paddingBottom:10 },
  commentTitle:{ color:"#fff",fontSize:16,fontWeight:"800" },
  noComments:{ color:"#374151",textAlign:"center",marginTop:20,fontSize:13 },
  commentItem:{ flexDirection:"row",gap:10,marginBottom:14 },
  commentAvatar:{ width:36,height:36,borderRadius:18,justifyContent:"center",alignItems:"center" },
  commentAvatarText:{ fontSize:13,fontWeight:"800" },
  commentBody:{ flex:1 },
  commentNameRow:{ flexDirection:"row",alignItems:"center",gap:8,marginBottom:3 },
  commentName:{ color:"#fff",fontSize:13,fontWeight:"700" },
  miniRole:{ paddingHorizontal:6,paddingVertical:2,borderRadius:5 },
  miniRoleText:{ fontSize:8,fontWeight:"800",letterSpacing:0.5 },
  commentText:{ color:"#94a3b8",fontSize:13,lineHeight:19 },
  commentTime:{ color:"#374151",fontSize:10,marginTop:3 },
  commentInputRow:{ flexDirection:"row",alignItems:"flex-end",padding:16,paddingTop:8,gap:10,borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.06)" },
  commentInput:{ flex:1,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:14,paddingHorizontal:14,paddingVertical:10,color:"#fff",fontSize:14,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",maxHeight:80 },
  sendBtn:{ width:44,height:44,borderRadius:22,backgroundColor:"#00c6ff",justifyContent:"center",alignItems:"center" },
});