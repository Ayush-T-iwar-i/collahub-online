import React, { useState, useCallback, useRef } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  TextInput, StatusBar, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Alert, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const CATEGORIES = ["General","Academic","Event","Holiday","Exam","Alert"];
const CAT_COLORS  = { General:"#00c6ff", Academic:"#34d399", Event:"#a78bfa", Holiday:"#34d399", Exam:"#f87171", Alert:"#f59e0b" };
const ROLE_COLORS = { admin:"#a78bfa", teacher:"#f59e0b", student:"#00c6ff" };

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff/60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};

// ─── Comment Sheet Modal ───
const CommentSheet = ({ post, visible, onClose, onCommentAdded }) => {
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

  React.useEffect(() => { if (visible) load(); }, [visible, load]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await API.post(`/api/posts/${post._id}/comment`, { text });
      setText(""); load(); onCommentAdded?.();
    } catch { Alert.alert("Error","Could not post comment"); }
    finally { setSending(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.commentOverlay}>
        <View style={styles.commentSheet}>
          <View style={styles.handle} />
          <View style={styles.commentHeader}>
            <Text style={styles.commentTitle}>Comments</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color="#64748b" /></Pressable>
          </View>
          {loading
            ? <ActivityIndicator color="#a78bfa" style={{margin:20}} />
            : (
              <FlatList data={comments} keyExtractor={(_,i)=>i.toString()}
                style={{maxHeight:height*0.42}} contentContainerStyle={{paddingHorizontal:16,paddingBottom:8}}
                ListEmptyComponent={() => <Text style={styles.noComments}>No comments yet. Be first!</Text>}
                renderItem={({item:c}) => {
                  const rc = ROLE_COLORS[c.userRole] || "#64748b";
                  const ci = c.userName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?";
                  return (
                    <View style={styles.commentItem}>
                      <View style={[styles.commentAvatar,{backgroundColor:rc+"22"}]}>
                        <Text style={[styles.commentAvatarText,{color:rc}]}>{ci}</Text>
                      </View>
                      <View style={styles.commentBody}>
                        <View style={styles.commentNameRow}>
                          <Text style={styles.commentName}>{c.userName}</Text>
                          <View style={[styles.miniRoleBadge,{backgroundColor:rc+"20"}]}>
                            <Text style={[styles.miniRoleBadgeText,{color:rc}]}>{c.userRole?.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.commentText}>{c.text}</Text>
                        <Text style={styles.commentTime}>{c.createdAt ? timeAgo(c.createdAt) : ""}</Text>
                      </View>
                    </View>
                  );
                }}
              />
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
          <View style={{height:24}} />
        </View>
      </View>
    </Modal>
  );
};

// ─── Post Card ───
const PostCard = ({ item, onDelete, onLike, onCommentPress }) => {
  const catColor  = CAT_COLORS[item.category]    || "#64748b";
  const roleColor = ROLE_COLORS[item.authorRole] || "#64748b";
  const initials  = item.authorName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase() || "?";

  return (
    <View style={styles.postCard}>
      {/* Author row */}
      <View style={styles.postAuthorRow}>
        <View style={[styles.postAvatar,{backgroundColor:roleColor+"22"}]}>
          <Text style={[styles.postAvatarText,{color:roleColor}]}>{initials}</Text>
        </View>
        <View style={styles.postAuthorInfo}>
          <Text style={styles.postAuthorName}>{item.authorName || "Admin"}</Text>
          <View style={styles.postAuthorMeta}>
            <View style={[styles.roleBadge,{backgroundColor:roleColor+"20"}]}>
              <Text style={[styles.roleBadgeText,{color:roleColor}]}>{(item.authorRole||"admin").toUpperCase()}</Text>
            </View>
            <Text style={styles.postTime}>{item.createdAt ? timeAgo(item.createdAt) : ""}</Text>
          </View>
        </View>
        <View style={styles.postTopRight}>
          <View style={[styles.catBadge,{backgroundColor:catColor+"20"}]}>
            <Text style={[styles.catBadgeText,{color:catColor}]}>{item.category||"General"}</Text>
          </View>
          <Pressable style={styles.deleteBtn} onPress={()=>onDelete(item)}>
            <Ionicons name="trash-outline" size={14} color="#f87171" />
          </Pressable>
        </View>
      </View>

      {/* Caption */}
      {!!item.caption && <Text style={styles.postCaption}>{item.caption}</Text>}
      {/* Legacy content field support */}
      {!item.caption && !!item.content && <Text style={styles.postCaption}>{item.content}</Text>}

      {/* Media */}
      {item.mediaType === "image" && !!item.mediaUrl && (
        <Image source={{uri:item.mediaUrl}} style={styles.postImage} resizeMode="cover" />
      )}
      {item.mediaType === "video" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="videocam" size={18} color="#a78bfa" />
          <Text style={styles.mediaBannerText}>Video Attachment</Text>
        </View>
      )}
      {item.mediaType === "audio" && (
        <View style={styles.mediaBanner}>
          <Ionicons name="musical-notes" size={18} color="#34d399" />
          <Text style={styles.mediaBannerText}>Audio Attachment</Text>
        </View>
      )}

      {/* Like + Comment row */}
      <View style={styles.postActions}>
        <Pressable style={styles.actionBtn} onPress={()=>onLike(item)}>
          <Ionicons
            name={item.isLiked ? "heart" : "heart-outline"}
            size={20} color={item.isLiked ? "#f87171" : "#64748b"} />
          <Text style={[styles.actionCount, item.isLiked&&{color:"#f87171"}]}>
            {item.likeCount||0}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={()=>onCommentPress(item)}>
          <Ionicons name="chatbubble-outline" size={18} color="#64748b" />
          <Text style={styles.actionCount}>{item.commentCount||0}</Text>
        </Pressable>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════
export default function PostNotice() {
  const router = useRouter();
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [createVisible, setCreateVisible] = useState(false);
  const [form, setForm]   = useState({ caption:"", category:"General" });
  const [media, setMedia] = useState(null); // { uri, type, name }
  const [saving, setSaving] = useState(false);

  // Comment modal
  const [commentPost, setCommentPost]       = useState(null);
  const [commentVisible, setCommentVisible] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async (isRefresh=false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const r = await API.get("/api/posts");
      setPosts(r.data?.posts || r.data || []);
    } catch { setPosts([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  // ── Media pickers ──
  const pickImageVideo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85,
    });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      setMedia({ uri:a.uri, type:a.type==="video"?"video":"image", name:`media.${a.type==="video"?"mp4":"jpg"}` });
    }
  };
  const pickAudio = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type:"audio/*", copyToCacheDirectory:true });
    if (r.assets?.[0]) setMedia({ uri:r.assets[0].uri, type:"audio", name:r.assets[0].name });
  };

  // ── Post ──
  const handlePost = async () => {
    if (!form.caption.trim() && !media) return Alert.alert("Error","Add caption or media");
    try {
      setSaving(true);
      const data = new FormData();
      data.append("caption",  form.caption);
      data.append("category", form.category);
      if (media) {
        const mimeMap = { image:"image/jpeg", video:"video/mp4", audio:"audio/mpeg" };
        data.append("media", { uri:media.uri, type:mimeMap[media.type], name:media.name });
      }
      await API.post("/api/posts", data, { headers:{"Content-Type":"multipart/form-data"} });
      setCreateVisible(false);
      setForm({ caption:"", category:"General" });
      setMedia(null);
      load();
      Alert.alert("Posted ✅","Your post is live!");
    } catch(e) { Alert.alert("Error", e.response?.data?.message||"Could not post"); }
    finally { setSaving(false); }
  };

  const handleDelete = (post) => {
    Alert.alert("Delete Post","Remove this post?",[
      { text:"Cancel", style:"cancel" },
      { text:"Delete", style:"destructive", onPress: async () => {
        try { await API.delete(`/api/posts/${post._id}`); load(); }
        catch { Alert.alert("Error","Could not delete"); }
      }},
    ]);
  };

  const handleLike = async (post) => {
    try {
      const r = await API.post(`/api/posts/${post._id}/like`);
      setPosts(prev=>prev.map(p=>p._id===post._id
        ? {...p, isLiked:r.data.liked, likeCount:r.data.likeCount} : p));
    } catch {}
  };

  const f = k => v => setForm(p=>({...p,[k]:v}));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Sticky Header */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={()=>router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notice Board</Text>
          <Text style={styles.headerSub}>{posts.length} posts</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={()=>setCreateVisible(true)}>
          <Ionicons name="add" size={22} color="#fb923c" />
        </Pressable>
      </LinearGradient>

      {/* Create hint */}
      <Pressable style={styles.postHint} onPress={()=>setCreateVisible(true)}>
        <LinearGradient colors={["rgba(251,146,60,0.15)","rgba(251,146,60,0.05)"]} style={styles.postHintGrad}>
          <Ionicons name="megaphone-outline" size={17} color="#fb923c" />
          <Text style={styles.postHintText}>Post text, photo, video or audio with caption</Text>
          <Ionicons name="chevron-forward" size={15} color="#fb923c" />
        </LinearGradient>
      </Pressable>

      {loading
        ? <View style={styles.center}><ActivityIndicator size="large" color="#fb923c" /></View>
        : (
          <FlatList data={posts} keyExtractor={(_,i)=>_.id||i.toString()}
            contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} tintColor="#fb923c" />}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><Ionicons name="newspaper-outline" size={40} color="#374151" /></View>
                <Text style={styles.emptyTitle}>No Posts Yet</Text>
                <Pressable style={styles.emptyAddBtn} onPress={()=>setCreateVisible(true)}>
                  <Ionicons name="add-circle-outline" size={15} color="#fb923c" />
                  <Text style={[styles.emptyAddText,{color:"#fb923c"}]}>Create First Post</Text>
                </Pressable>
              </View>
            )}
            renderItem={({item}) => (
              <PostCard item={item} onDelete={handleDelete} onLike={handleLike}
                onCommentPress={(p) => { setCommentPost(p); setCommentVisible(true); }} />
            )}
          />
        )
      }

      {/* ── CREATE MODAL ── */}
      <Modal visible={createVisible} transparent animationType="slide" onRequestClose={()=>setCreateVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.formSheet}>
            <View style={styles.handle} />
            <View style={styles.formHeader}>
              <View style={[styles.formHeaderIcon,{backgroundColor:"rgba(251,146,60,0.15)"}]}>
                <Ionicons name="create" size={19} color="#fb923c" />
              </View>
              <Text style={styles.formTitle}>Create Post</Text>
              <Pressable onPress={()=>setCreateVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Category */}
              <Text style={styles.sectionLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {CATEGORIES.map(cat => {
                  const active = form.category === cat;
                  const color  = CAT_COLORS[cat];
                  return (
                    <Pressable key={cat} onPress={()=>f("category")(cat)}
                      style={[styles.catChip, active&&{backgroundColor:color+"22",borderColor:color+"55"}]}>
                      <Text style={[styles.catChipText, active&&{color}]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Caption */}
              <Text style={styles.sectionLabel}>CAPTION</Text>
              <View style={styles.captionBox}>
                <TextInput style={styles.captionInput} value={form.caption}
                  onChangeText={f("caption")} placeholder="Write something..."
                  placeholderTextColor="#374151" multiline numberOfLines={4}
                  textAlignVertical="top" />
              </View>

              {/* Media preview */}
              {media && (
                <View style={styles.mediaPreviewBox}>
                  {media.type === "image" && (
                    <Image source={{uri:media.uri}} style={styles.mediaImg} resizeMode="cover" />
                  )}
                  {media.type === "video" && (
                    <View style={styles.mediaBannerLg}>
                      <Ionicons name="videocam" size={26} color="#a78bfa" />
                      <Text style={styles.mediaBannerLgText} numberOfLines={1}>{media.name}</Text>
                    </View>
                  )}
                  {media.type === "audio" && (
                    <View style={styles.mediaBannerLg}>
                      <Ionicons name="musical-notes" size={26} color="#34d399" />
                      <Text style={styles.mediaBannerLgText} numberOfLines={1}>{media.name}</Text>
                    </View>
                  )}
                  <Pressable style={styles.removeMedia} onPress={()=>setMedia(null)}>
                    <Ionicons name="close-circle" size={24} color="#f87171" />
                  </Pressable>
                </View>
              )}

              {/* Media buttons */}
              {!media && (
                <>
                  <Text style={styles.sectionLabel}>ATTACH MEDIA (optional)</Text>
                  <View style={styles.mediaButtons}>
                    <Pressable style={styles.mediaBtn} onPress={pickImageVideo}>
                      <Ionicons name="image-outline" size={22} color="#00c6ff" />
                      <Text style={[styles.mediaBtnText,{color:"#00c6ff"}]}>Photo / Video</Text>
                    </Pressable>
                    <Pressable style={styles.mediaBtn} onPress={pickAudio}>
                      <Ionicons name="musical-notes-outline" size={22} color="#34d399" />
                      <Text style={[styles.mediaBtnText,{color:"#34d399"}]}>Audio</Text>
                    </Pressable>
                  </View>
                </>
              )}

              <Pressable style={[styles.saveBtn,saving&&{opacity:0.7}]} onPress={handlePost} disabled={saving}>
                <LinearGradient colors={["#fb923c","#f97316"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name="send-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Post Now</Text></>}
                </LinearGradient>
              </Pressable>
              <View style={{height:40}} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── COMMENT SHEET ── */}
      <CommentSheet
        post={commentPost} visible={commentVisible}
        onClose={()=>setCommentVisible(false)}
        onCommentAdded={()=>{
          setPosts(prev=>prev.map(p=>
            p._id===commentPost?._id ? {...p, commentCount:(p.commentCount||0)+1} : p
          ));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#080d17" },
  center:{ flex:1,justifyContent:"center",alignItems:"center" },
  header:{ flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingTop:52,paddingBottom:14,justifyContent:"space-between" },
  backBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter:{ flex:1,alignItems:"center" },
  headerTitle:{ color:"#fff",fontSize:18,fontWeight:"800" },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  addBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(251,146,60,0.2)",justifyContent:"center",alignItems:"center",borderWidth:1,borderColor:"rgba(251,146,60,0.3)" },
  postHint:{ marginHorizontal:16,marginTop:12,borderRadius:14,overflow:"hidden",borderWidth:1,borderColor:"rgba(251,146,60,0.2)" },
  postHintGrad:{ flexDirection:"row",alignItems:"center",gap:10,padding:13,borderRadius:14 },
  postHintText:{ flex:1,color:"#94a3b8",fontSize:12 },
  list:{ padding:16,paddingBottom:30 },
  // Post card
  postCard:{ backgroundColor:"#1a2535",borderRadius:18,marginBottom:12,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.05)" },
  postAuthorRow:{ flexDirection:"row",alignItems:"center",padding:14,paddingBottom:10,gap:10 },
  postAvatar:{ width:42,height:42,borderRadius:21,justifyContent:"center",alignItems:"center" },
  postAvatarText:{ fontSize:15,fontWeight:"800" },
  postAuthorInfo:{ flex:1 },
  postAuthorName:{ color:"#fff",fontSize:14,fontWeight:"700" },
  postAuthorMeta:{ flexDirection:"row",alignItems:"center",gap:8,marginTop:3 },
  roleBadge:{ paddingHorizontal:8,paddingVertical:2,borderRadius:6 },
  roleBadgeText:{ fontSize:9,fontWeight:"800",letterSpacing:0.5 },
  postTime:{ color:"#374151",fontSize:11 },
  postTopRight:{ flexDirection:"row",alignItems:"center",gap:8 },
  catBadge:{ paddingHorizontal:9,paddingVertical:3,borderRadius:8 },
  catBadgeText:{ fontSize:10,fontWeight:"700" },
  deleteBtn:{ width:30,height:30,borderRadius:8,backgroundColor:"rgba(248,113,113,0.1)",justifyContent:"center",alignItems:"center" },
  postCaption:{ color:"#e2e8f0",fontSize:14,lineHeight:21,paddingHorizontal:14,paddingBottom:10 },
  postImage:{ width:"100%",height:220 },
  mediaBanner:{ flexDirection:"row",alignItems:"center",gap:10,margin:12,backgroundColor:"rgba(255,255,255,0.04)",padding:14,borderRadius:12 },
  mediaBannerText:{ color:"#94a3b8",fontSize:13 },
  postActions:{ flexDirection:"row",gap:24,paddingHorizontal:14,paddingVertical:10,borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.05)" },
  actionBtn:{ flexDirection:"row",alignItems:"center",gap:6 },
  actionCount:{ color:"#64748b",fontSize:13,fontWeight:"600" },
  // Comment sheet
  commentOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  commentSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.75,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  commentHeader:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:20,paddingBottom:10 },
  commentTitle:{ color:"#fff",fontSize:16,fontWeight:"800" },
  noComments:{ color:"#374151",textAlign:"center",marginTop:20,fontSize:13 },
  commentItem:{ flexDirection:"row",gap:10,marginBottom:14 },
  commentAvatar:{ width:36,height:36,borderRadius:18,justifyContent:"center",alignItems:"center" },
  commentAvatarText:{ fontSize:13,fontWeight:"800" },
  commentBody:{ flex:1 },
  commentNameRow:{ flexDirection:"row",alignItems:"center",gap:8,marginBottom:4 },
  commentName:{ color:"#fff",fontSize:13,fontWeight:"700" },
  miniRoleBadge:{ paddingHorizontal:6,paddingVertical:2,borderRadius:5 },
  miniRoleBadgeText:{ fontSize:8,fontWeight:"800",letterSpacing:0.5 },
  commentText:{ color:"#94a3b8",fontSize:13,lineHeight:19 },
  commentTime:{ color:"#374151",fontSize:10,marginTop:3 },
  commentInputRow:{ flexDirection:"row",alignItems:"flex-end",padding:16,paddingTop:8,gap:10,borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.06)" },
  commentInput:{ flex:1,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:14,paddingHorizontal:14,paddingVertical:10,color:"#fff",fontSize:14,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",maxHeight:80 },
  sendBtn:{ width:44,height:44,borderRadius:22,backgroundColor:"#fb923c",justifyContent:"center",alignItems:"center" },
  // Create modal
  overlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  formSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.92,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  handle:{ width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4 },
  formHeader:{ flexDirection:"row",alignItems:"center",gap:12,padding:20,paddingBottom:8 },
  formHeaderIcon:{ width:40,height:40,borderRadius:12,justifyContent:"center",alignItems:"center" },
  formTitle:{ flex:1,color:"#fff",fontSize:17,fontWeight:"800" },
  sectionLabel:{ color:"#374151",fontSize:10,fontWeight:"800",letterSpacing:1,marginHorizontal:20,marginTop:16,marginBottom:8 },
  catRow:{ paddingHorizontal:20,gap:8,marginBottom:4 },
  catChip:{ paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:"#1a2535",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  catChipText:{ color:"#64748b",fontSize:12,fontWeight:"600" },
  captionBox:{ marginHorizontal:20,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:14,padding:14,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",minHeight:100 },
  captionInput:{ color:"#fff",fontSize:14,lineHeight:21,minHeight:80 },
  mediaPreviewBox:{ marginHorizontal:20,marginTop:12,borderRadius:14,overflow:"hidden",position:"relative" },
  mediaImg:{ width:"100%",height:200,borderRadius:14 },
  mediaBannerLg:{ flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"rgba(255,255,255,0.05)",padding:18,borderRadius:14 },
  mediaBannerLgText:{ color:"#94a3b8",fontSize:13,flex:1 },
  removeMedia:{ position:"absolute",top:8,right:8 },
  mediaButtons:{ flexDirection:"row",gap:12,marginHorizontal:20 },
  mediaBtn:{ flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,backgroundColor:"rgba(255,255,255,0.05)",padding:14,borderRadius:14,borderWidth:1,borderColor:"rgba(255,255,255,0.08)" },
  mediaBtnText:{ fontSize:13,fontWeight:"600" },
  saveBtn:{ marginHorizontal:20,marginTop:20,borderRadius:14,overflow:"hidden" },
  saveBtnGrad:{ flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:16,borderRadius:14 },
  saveBtnText:{ color:"#fff",fontWeight:"700",fontSize:16 },
  emptyState:{ alignItems:"center",paddingTop:60,gap:16 },
  emptyIcon:{ width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle:{ color:"#374151",fontSize:16,fontWeight:"700" },
  emptyAddBtn:{ flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:20,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:"rgba(251,146,60,0.2)",backgroundColor:"rgba(251,146,60,0.08)" },
  emptyAddText:{ fontWeight:"700" },
});