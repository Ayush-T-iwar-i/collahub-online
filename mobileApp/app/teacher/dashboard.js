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
  const m = Math.floor(diff/60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};

// ─── Stat Card ───
const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard,{borderLeftColor:color}]}>
    <View style={[styles.statIcon,{backgroundColor:color+"22"}]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue,{color}]}>{value??"—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Quick Card ───
const QuickCard = ({ icon, label, color, onPress }) => (
  <Pressable onPress={onPress} style={styles.quickCard}>
    <LinearGradient colors={[color+"33",color+"11"]} style={styles.quickGrad}>
      <View style={[styles.quickIcon,{backgroundColor:color+"22"}]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={[styles.quickLabel,{color}]}>{label}</Text>
    </LinearGradient>
  </Pressable>
);

// ─── Comment Modal ───
const CommentModal = ({ post, visible, onClose, onCommentAdded }) => {
  const [comments,setComments] = useState([]);
  const [text,setText]         = useState("");
  const [loading,setLoading]   = useState(false);
  const [sending,setSending]   = useState(false);

  const load = useCallback(async () => {
    if (!post?._id) return;
    setLoading(true);
    try { const r = await API.get(`/api/posts/${post._id}/comments`); setComments(r.data?.comments||[]); }
    catch {} finally { setLoading(false); }
  },[post?._id]);

  React.useEffect(()=>{ if(visible) load(); },[visible]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await API.post(`/api/posts/${post._id}/comment`,{text});
      setText(""); load(); onCommentAdded?.();
    } catch { Alert.alert("Error","Could not post comment"); }
    finally { setSending(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
        <View style={styles.commentOverlay}>
          <View style={styles.commentSheet}>
            <View style={styles.commentHandle}/>
            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>Comments {comments.length>0?`(${comments.length})`:""}</Text>
              <Pressable onPress={onClose}><Ionicons name="close" size={22} color="#64748b"/></Pressable>
            </View>
            {loading ? <ActivityIndicator color="#f59e0b" style={{margin:20}}/> : (
              <ScrollView style={{maxHeight:320}} contentContainerStyle={{padding:16}} showsVerticalScrollIndicator={false}>
                {comments.length===0 && <Text style={styles.noComments}>No comments yet. Be first! 💬</Text>}
                {comments.map((c,i)=>{
                  const rc = ROLE_COLORS[c.userRole]||"#64748b";
                  const ci = c.userName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
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
                        <Text style={styles.commentTime}>{c.createdAt?timeAgo(c.createdAt):""}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.commentInputRow}>
              <TextInput style={styles.commentInput} value={text} onChangeText={setText}
                placeholder="Write a comment..." placeholderTextColor="#374151" multiline maxLength={300}/>
              <Pressable style={[styles.sendBtn,(!text.trim()||sending)&&{opacity:0.4}]}
                onPress={send} disabled={!text.trim()||sending}>
                {sending ? <ActivityIndicator size="small" color="#fff"/> : <Ionicons name="send" size={17} color="#fff"/>}
              </Pressable>
            </View>
            <View style={{height:20}}/>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Post Card ───
const PostCard = ({ item, onLike, onCommentPress }) => {
  const authorName   = item.authorName  || item.author?.name  || "Unknown";
  const authorRole   = item.authorRole  || item.author?.role  || "admin";
  const caption      = item.caption     || item.content       || "";
  const likeCount    = item.likeCount   ?? (item.likes?.length   ?? 0);
  const commentCount = item.commentCount ?? (item.comments?.length ?? 0);
  const isLiked      = item.isLiked     ?? false;
  const catColor     = CAT_COLORS[item.category]  || "#64748b";
  const roleColor    = ROLE_COLORS[authorRole]     || "#64748b";
  const initials     = authorName.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";

  return (
    <View style={styles.postCard}>
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
            <Text style={styles.postTime}>{item.createdAt?timeAgo(item.createdAt):""}</Text>
          </View>
        </View>
        {item.category && (
          <View style={[styles.catBadge,{backgroundColor:catColor+"20"}]}>
            <Text style={[styles.catBadgeText,{color:catColor}]}>{item.category}</Text>
          </View>
        )}
      </View>
      {!!item.title  && <Text style={styles.postTitle}>{item.title}</Text>}
      {!!caption     && <Text style={styles.postContent}>{caption}</Text>}
      {item.mediaType==="image" && !!item.mediaUrl && (
        <Image source={{uri:item.mediaUrl}} style={styles.postImage} resizeMode="cover"/>
      )}
      {item.mediaType==="video" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="videocam" size={16} color="#a78bfa"/>
          <Text style={styles.mediaBannerText}>Video Attachment</Text>
        </View>
      )}
      {item.mediaType==="audio" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="musical-notes" size={16} color="#34d399"/>
          <Text style={styles.mediaBannerText}>Audio Attachment</Text>
        </View>
      )}
      {!item.mediaType && !!item.image && (
        <Image source={{uri:item.image}} style={styles.postImage} resizeMode="cover"/>
      )}
      <View style={styles.postFooter}>
        <Pressable style={styles.footerBtn} onPress={()=>onLike(item)}>
          <Ionicons name={isLiked?"heart":"heart-outline"} size={21} color={isLiked?"#f87171":"#64748b"}/>
          <Text style={[styles.footerCount,isLiked&&{color:"#f87171"}]}>{likeCount}</Text>
        </Pressable>
        <Pressable style={styles.footerBtn} onPress={()=>onCommentPress(item)}>
          <Ionicons name="chatbubble-outline" size={19} color="#64748b"/>
          <Text style={styles.footerCount}>{commentCount}</Text>
        </Pressable>
        <Ionicons name="share-social-outline" size={18} color="#374151"/>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════
export default function TeacherDashboard() {
  const navigation = useNavigation();
  const router     = useRouter();

  const [teacherData,setTeacherData]     = useState(null);
  const [image,setImage]                 = useState(null);
  const [stats,setStats]                 = useState(null);
  const [posts,setPosts]                 = useState([]);
  const [checkingAuth,setCheckingAuth]   = useState(true);
  const [refreshing,setRefreshing]       = useState(false);
  const [commentPost,setCommentPost]     = useState(null);
  const [commentVisible,setCommentVisible] = useState(false);
  const backPressCount = useRef(0);

  useFocusEffect(useCallback(()=>{ loadAll(); },[]));

  const loadAll = async (isRefresh=false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("teacherLoggedIn");
    if (!token) { router.replace("/(auth)/teacher-login"); return; }
    const raw = await AsyncStorage.getItem("teacherData");
    if (raw) {
      const parsed = JSON.parse(raw);
      setTeacherData(parsed);
      const idKey = parsed.teacherId || parsed.employeeId || parsed._id || parsed.id;
      const img = await AsyncStorage.getItem(`profileImage_${idKey}`);
      if (img) setImage(img);
    }
    try { const r = await API.get("/dashboard/teacher"); if(r.data) setStats(r.data); } catch {}
    try { const r = await API.get("/api/posts"); setPosts(r.data?.posts||r.data||[]); } catch {}
    setCheckingAuth(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(()=>{
    const handler = BackHandler.addEventListener("hardwareBackPress",()=>{
      if (backPressCount.current===0) {
        backPressCount.current=1;
        ToastAndroid.show("Press back again to exit",ToastAndroid.SHORT);
        setTimeout(()=>{backPressCount.current=0;},2000);
        return true;
      }
      BackHandler.exitApp(); return true;
    });
    return ()=>handler.remove();
  },[]));

  const handleLike = async (post) => {
    try {
      const r = await API.post(`/api/posts/${post._id}/like`);
      setPosts(prev=>prev.map(p=>p._id===post._id?{...p,isLiked:r.data.liked,likeCount:r.data.likeCount}:p));
    } catch {}
  };

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    await AsyncStorage.multiRemove(["accessToken","refreshToken","teacherData","teacherLoggedIn"]);
    router.replace("/");
  };

  // Teacher ID — support all possible field names
  const teacherId   = teacherData?.teacherId || teacherData?.employeeId || teacherData?.staffId || null;
  const teacherDept = teacherData?.department || teacherData?.subject || null;

  if (checkingAuth) return (
    <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#f59e0b"/></View>
  );

  const quickLinks = [
    { icon:"calendar",      label:"Attendance",  color:"#34d399", route:"/teacher/mark-attendance" },
    { icon:"people",        label:"Students",    color:"#60a5fa", route:"/teacher/students"         },
    { icon:"document-text", label:"Assignments", color:"#fb923c", route:"/teacher/assignments"      },
    { icon:"person",        label:"Profile",     color:"#a78bfa", route:"/teacher/profile"          },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>

      {/* Sticky Header */}
      <LinearGradient colors={["#0a0f1e","#1a1500"]} style={styles.header}>
        <Pressable onPress={()=>navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>COLLAहUB</Text>
          <Text style={styles.headerSub}>Teacher Portal</Text>
        </View>
        <Pressable onPress={()=>router.push("/teacher/profile")}>
          <Image source={{uri:image||"https://cdn-icons-png.flaticon.com/512/149/149071.png"}} style={styles.avatar}/>
        </Pressable>
      </LinearGradient>

      <FlatList
        data={posts}
        keyExtractor={(item,i)=>item._id||i.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadAll(true)} tintColor="#f59e0b"/>}

        ListHeaderComponent={()=>(
          <>
            {/* Welcome Card */}
            <LinearGradient colors={["#f59e0b","#d97706"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.welcomeCard}>
              <View style={{flex:1}}>
                <Text style={styles.welcomeHi}>Hello, {teacherData?.name?.split(" ")[0]||"Teacher"} 👨‍🏫</Text>
                {/* Teacher ID Badge */}
                {teacherId && (
                  <View style={styles.idBadge}>
                    <Ionicons name="card-outline" size={11} color="rgba(0,0,0,0.6)"/>
                    <Text style={styles.idBadgeText}>ID: {teacherId}</Text>
                  </View>
                )}
                {teacherDept && <Text style={styles.welcomeSub} numberOfLines={1}>{teacherDept}</Text>}
                {teacherData?.college && <Text style={styles.welcomeSub} numberOfLines={1}>{teacherData.college}</Text>}
              </View>
              <View style={styles.welcomeRight}>
                <View style={styles.teacherAvatarLg}>
                  <Text style={styles.teacherAvatarText}>
                    {teacherData?.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"T"}
                  </Text>
                </View>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>TEACHER</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Stats */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsRow}>
              <StatCard icon="people"           label="Students"    value={stats?.totalStudents}    color="#f59e0b"/>
              <StatCard icon="calendar"         label="Classes"     value={stats?.totalClasses}     color="#34d399"/>
              <StatCard icon="document-text"    label="Assignments" value={stats?.totalAssignments} color="#60a5fa"/>
              <StatCard icon="checkmark-circle" label="Attendance"  value={stats?.attendanceMarked} color="#a78bfa"/>
            </View>

            {/* Quick Links */}
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickGrid}>
              {quickLinks.map((q,i)=>(
                <QuickCard key={i} icon={q.icon} label={q.label} color={q.color} onPress={()=>router.push(q.route)}/>
              ))}
            </View>

            {/* Feed header */}
            <View style={styles.feedHeaderRow}>
              <Text style={styles.sectionTitle}>Notice Feed</Text>
              {posts.length>0 && (
                <View style={styles.feedCount}>
                  <Text style={styles.feedCountText}>{posts.length} posts</Text>
                </View>
              )}
            </View>
          </>
        )}

        ListEmptyComponent={()=>(
          <View style={styles.emptyFeed}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="newspaper-outline" size={36} color="#374151"/>
            </View>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Posts from admins will appear here</Text>
          </View>
        )}

        renderItem={({item})=>(
          <PostCard item={item} onLike={handleLike}
            onCommentPress={(p)=>{setCommentPost(p);setCommentVisible(true);}}/>
        )}

        ListFooterComponent={()=>(
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color="#f87171"/>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        )}
      />

      <CommentModal post={commentPost} visible={commentVisible}
        onClose={()=>setCommentVisible(false)}
        onCommentAdded={()=>{
          setPosts(prev=>prev.map(p=>
            p._id===commentPost?._id?{...p,commentCount:(p.commentCount||0)+1}:p
          ));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#080d17" },
  loaderContainer:{ flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#080d17" },
  header:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingTop:52,paddingBottom:14 },
  menuBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter:{ flex:1,alignItems:"center" },
  headerTitle:{ color:"#fff",fontSize:18,fontWeight:"800",letterSpacing:0.5 },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  avatar:{ width:40,height:40,borderRadius:20,borderWidth:2,borderColor:"#f59e0b" },
  feedContainer:{ paddingHorizontal:16,paddingBottom:30 },
  welcomeCard:{ borderRadius:20,padding:22,marginTop:14,marginBottom:20,flexDirection:"row",justifyContent:"space-between",alignItems:"center" },
  welcomeHi:{ color:"#fff",fontSize:20,fontWeight:"800",marginBottom:8 },
  idBadge:{ flexDirection:"row",alignItems:"center",gap:5,backgroundColor:"rgba(0,0,0,0.2)",paddingHorizontal:10,paddingVertical:5,borderRadius:20,alignSelf:"flex-start",marginBottom:6 },
  idBadgeText:{ color:"rgba(0,0,0,0.75)",fontSize:11,fontWeight:"800" },
  welcomeSub:{ color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:3 },
  welcomeRight:{ alignItems:"center",gap:8 },
  teacherAvatarLg:{ width:56,height:56,borderRadius:28,backgroundColor:"rgba(0,0,0,0.2)",justifyContent:"center",alignItems:"center",borderWidth:2,borderColor:"rgba(255,255,255,0.3)" },
  teacherAvatarText:{ color:"#fff",fontSize:20,fontWeight:"900" },
  rolePill:{ backgroundColor:"rgba(0,0,0,0.2)",paddingHorizontal:10,paddingVertical:4,borderRadius:20 },
  rolePillText:{ color:"rgba(255,255,255,0.9)",fontSize:9,fontWeight:"800",letterSpacing:1 },
  sectionTitle:{ color:"#cbd5e1",fontSize:14,fontWeight:"700",marginBottom:12,letterSpacing:0.5 },
  statsRow:{ flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:24 },
  statCard:{ width:(width-52)/2,backgroundColor:"#1a2535",borderRadius:14,padding:14,borderLeftWidth:3 },
  statIcon:{ width:36,height:36,borderRadius:10,justifyContent:"center",alignItems:"center",marginBottom:8 },
  statValue:{ color:"#fff",fontSize:22,fontWeight:"800" },
  statLabel:{ color:"#64748b",fontSize:11,marginTop:2 },
  quickGrid:{ flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:24 },
  quickCard:{ width:(width-52)/2,borderRadius:16,overflow:"hidden" },
  quickGrad:{ padding:20,alignItems:"center",borderRadius:16,borderWidth:1,borderColor:"rgba(255,255,255,0.06)",gap:10,minHeight:100 },
  quickIcon:{ width:48,height:48,borderRadius:14,justifyContent:"center",alignItems:"center" },
  quickLabel:{ fontSize:13,fontWeight:"700",textAlign:"center" },
  feedHeaderRow:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12 },
  feedCount:{ backgroundColor:"rgba(245,158,11,0.12)",paddingHorizontal:10,paddingVertical:4,borderRadius:20 },
  feedCountText:{ color:"#f59e0b",fontSize:11,fontWeight:"700" },
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
  emptyFeed:{ alignItems:"center",paddingVertical:30,gap:8 },
  emptyIconWrap:{ width:70,height:70,borderRadius:35,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle:{ color:"#374151",fontSize:15,fontWeight:"700" },
  emptySubtitle:{ color:"#1f2937",fontSize:12 },
  logoutBtn:{ flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:16,padding:14,backgroundColor:"rgba(248,113,113,0.08)",borderRadius:14,borderWidth:1,borderColor:"rgba(248,113,113,0.15)" },
  logoutText:{ color:"#f87171",fontWeight:"700",fontSize:14 },
  commentOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  commentSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:"75%",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
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
  sendBtn:{ width:44,height:44,borderRadius:22,backgroundColor:"#f59e0b",justifyContent:"center",alignItems:"center" },
});