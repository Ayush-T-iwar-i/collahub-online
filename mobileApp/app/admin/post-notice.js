import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  TextInput, StatusBar, ActivityIndicator, RefreshControl,
  Modal, ScrollView, Alert, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const CATEGORIES = ["General","Academic","Event","Holiday","Exam","Alert"];
const CAT_COLORS = { General:"#00c6ff", Academic:"#34d399", Event:"#a78bfa", Holiday:"#34d399", Exam:"#f87171", Alert:"#f59e0b" };

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const mins = Math.floor(diff/60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins/60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
};

const NoticeCard = ({ item, onDelete }) => {
  const color = CAT_COLORS[item.category] || "#64748b";
  return (
    <View style={styles.noticeCard}>
      <View style={styles.noticeTop}>
        <View style={[styles.catBadge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.catBadgeText, { color }]}>{item.category || "General"}</Text>
        </View>
        <Text style={styles.noticeTime}>{item.createdAt ? timeAgo(item.createdAt) : ""}</Text>
        <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={16} color="#f87171" />
        </Pressable>
      </View>
      {item.title && <Text style={styles.noticeTitle}>{item.title}</Text>}
      <Text style={styles.noticeContent} numberOfLines={3}>{item.content}</Text>
      <View style={styles.noticeFooter}>
        <Ionicons name="person-circle-outline" size={14} color="#64748b" />
        <Text style={styles.noticeAuthor}>{item.author?.name || "Admin"}</Text>
      </View>
    </View>
  );
};

export default function PostNotice() {
  const router = useRouter();
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm]           = useState({ title: "", content: "", category: "General" });
  const [saving, setSaving]       = useState(false);
  const [catModal, setCatModal]   = useState(false);

  useFocusEffect(useCallback(() => { loadPosts(); }, []));

  const loadPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/api/posts");
      setPosts(res.data?.posts || res.data || []);
    } catch (e) { setPosts([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleDelete = (post) => {
    Alert.alert("Delete Notice", "Remove this notice?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await API.delete(`/api/posts/${post._id}`); loadPosts(); }
        catch (e) { Alert.alert("Error", "Could not delete"); }
      }},
    ]);
  };

  const handlePost = async () => {
    if (!form.content.trim()) return Alert.alert("Error", "Content is required");
    try {
      setSaving(true);
      await API.post("/api/posts", form);
      setModalVisible(false);
      setForm({ title: "", content: "", category: "General" });
      loadPosts();
      Alert.alert("Posted ✅", "Notice posted successfully!");
    } catch (e) { Alert.alert("Error", e.response?.data?.message || "Could not post"); }
    finally { setSaving(false); }
  };

  const f = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notice Board</Text>
          <Text style={styles.headerSub}>{posts.length} notices</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color="#fb923c" />
        </Pressable>
      </LinearGradient>

      {/* Post Notice FAB hint */}
      <Pressable style={styles.postHint} onPress={() => setModalVisible(true)}>
        <LinearGradient colors={["rgba(251,146,60,0.15)","rgba(251,146,60,0.05)"]} style={styles.postHintGrad}>
          <Ionicons name="megaphone-outline" size={18} color="#fb923c" />
          <Text style={styles.postHintText}>Tap to post a new notice to all students & teachers</Text>
          <Ionicons name="chevron-forward" size={16} color="#fb923c" />
        </LinearGradient>
      </Pressable>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#fb923c" /></View> : (
        <FlatList
          data={posts} keyExtractor={(item,i) => item._id || i.toString()}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPosts(true)} tintColor="#fb923c" />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="newspaper-outline" size={40} color="#374151" /></View>
              <Text style={styles.emptyTitle}>No Notices Yet</Text>
              <Pressable style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="add-circle-outline" size={16} color="#fb923c" />
                <Text style={[styles.emptyAddText, { color: "#fb923c" }]}>Post First Notice</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => <NoticeCard item={item} onDelete={handleDelete} />}
        />
      )}

      {/* Post Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.formHeader}>
              <View style={[styles.formHeaderIcon, { backgroundColor: "rgba(251,146,60,0.15)" }]}>
                <Ionicons name="megaphone" size={20} color="#fb923c" />
              </View>
              <Text style={styles.formTitle}>Post New Notice</Text>
              <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={22} color="#64748b" /></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Category */}
              <Text style={styles.sectionLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
                {CATEGORIES.map(cat => {
                  const isActive = form.category === cat;
                  const color = CAT_COLORS[cat];
                  return (
                    <Pressable key={cat} onPress={() => setForm(prev=>({...prev,category:cat}))}
                      style={[styles.catChip, isActive && { backgroundColor: color+"22", borderColor: color+"55" }]}>
                      <Text style={[styles.catChipText, isActive && { color }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Title */}
              <Text style={styles.sectionLabel}>TITLE (optional)</Text>
              <View style={styles.fieldRow}>
                <Ionicons name="text-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput style={styles.fieldInput} value={form.title} onChangeText={f("title")}
                  placeholderTextColor="#374151" placeholder="Notice title..." />
              </View>

              {/* Content */}
              <Text style={styles.sectionLabel}>CONTENT *</Text>
              <View style={[styles.fieldRow, { alignItems: "flex-start", paddingVertical: 12, minHeight: 120 }]}>
                <Ionicons name="document-text-outline" size={16} color="#64748b" style={{ marginRight: 8, marginTop: 2 }} />
                <TextInput
                  style={[styles.fieldInput, { textAlignVertical: "top", minHeight: 100 }]}
                  value={form.content} onChangeText={f("content")}
                  placeholderTextColor="#374151" placeholder="Write your notice here..."
                  multiline numberOfLines={5}
                />
              </View>

              <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handlePost} disabled={saving}>
                <LinearGradient colors={["#fb923c","#f97316"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> :
                    <><Ionicons name="megaphone-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Post Notice</Text></>}
                </LinearGradient>
              </Pressable>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1,backgroundColor:"#080d17" },
  center: { flex:1,justifyContent:"center",alignItems:"center" },
  header: { flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingTop:52,paddingBottom:14,justifyContent:"space-between" },
  backBtn: { width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter: { flex:1,alignItems:"center" },
  headerTitle: { color:"#fff",fontSize:18,fontWeight:"800" },
  headerSub: { color:"#64748b",fontSize:11,marginTop:2 },
  addBtn: { width:40,height:40,borderRadius:12,backgroundColor:"rgba(251,146,60,0.2)",justifyContent:"center",alignItems:"center",borderWidth:1,borderColor:"rgba(251,146,60,0.3)" },
  postHint: { marginHorizontal:16,marginTop:12,borderRadius:14,overflow:"hidden",borderWidth:1,borderColor:"rgba(251,146,60,0.2)" },
  postHintGrad: { flexDirection:"row",alignItems:"center",gap:10,padding:14,borderRadius:14 },
  postHintText: { flex:1,color:"#94a3b8",fontSize:13 },
  list: { padding:16,paddingBottom:30 },
  noticeCard: { backgroundColor:"#1a2535",borderRadius:16,padding:16,marginBottom:10,borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  noticeTop: { flexDirection:"row",alignItems:"center",marginBottom:10,gap:8 },
  catBadge: { paddingHorizontal:10,paddingVertical:3,borderRadius:8 },
  catBadgeText: { fontSize:10,fontWeight:"700" },
  noticeTime: { flex:1,color:"#374151",fontSize:11 },
  deleteBtn: { width:32,height:32,borderRadius:8,backgroundColor:"rgba(248,113,113,0.1)",justifyContent:"center",alignItems:"center" },
  noticeTitle: { color:"#fff",fontSize:15,fontWeight:"700",marginBottom:6 },
  noticeContent: { color:"#94a3b8",fontSize:13,lineHeight:20 },
  noticeFooter: { flexDirection:"row",alignItems:"center",gap:6,marginTop:10,paddingTop:10,borderTopWidth:1,borderTopColor:"rgba(255,255,255,0.05)" },
  noticeAuthor: { color:"#374151",fontSize:11 },
  emptyState: { alignItems:"center",paddingTop:60,gap:16 },
  emptyIcon: { width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle: { color:"#374151",fontSize:16,fontWeight:"700" },
  emptyAddBtn: { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(251,146,60,0.1)",paddingHorizontal:20,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:"rgba(251,146,60,0.2)" },
  emptyAddText: { fontWeight:"700" },
  modalOverlay: { flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  formSheet: { backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:height*0.92,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  modalHandle: { width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4 },
  formHeader: { flexDirection:"row",alignItems:"center",gap:12,padding:20,paddingBottom:8 },
  formHeaderIcon: { width:40,height:40,borderRadius:12,justifyContent:"center",alignItems:"center" },
  formTitle: { flex:1,color:"#fff",fontSize:17,fontWeight:"800" },
  sectionLabel: { color:"#374151",fontSize:10,fontWeight:"800",letterSpacing:1,marginHorizontal:20,marginTop:16,marginBottom:8 },
  catScroll: { marginBottom:4 },
  catRow: { paddingHorizontal:20,gap:8 },
  catChip: { paddingHorizontal:14,paddingVertical:7,borderRadius:20,backgroundColor:"#1a2535",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  catChipText: { color:"#64748b",fontSize:12,fontWeight:"600" },
  fieldRow: { flexDirection:"row",alignItems:"center",backgroundColor:"rgba(255,255,255,0.06)",borderRadius:12,paddingHorizontal:12,marginHorizontal:20,marginBottom:4,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",minHeight:50 },
  fieldInput: { flex:1,color:"#fff",fontSize:14,paddingVertical:14 },
  saveBtn: { marginHorizontal:20,marginTop:20,borderRadius:14,overflow:"hidden" },
  saveBtnGrad: { flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:16,borderRadius:14 },
  saveBtnText: { color:"#fff",fontWeight:"700",fontSize:16 },
});