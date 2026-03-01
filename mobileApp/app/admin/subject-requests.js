import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  ScrollView, Alert, Modal, TextInput, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const STATUS_CONFIG = {
  pending:  { color:"#f59e0b", bg:"rgba(245,158,11,0.15)",  icon:"time-outline",             label:"PENDING"  },
  accepted: { color:"#34d399", bg:"rgba(52,211,153,0.15)",  icon:"checkmark-circle-outline", label:"ACCEPTED" },
  rejected: { color:"#f87171", bg:"rgba(248,113,113,0.15)", icon:"close-circle-outline",     label:"REJECTED" },
};

const DEPT_COLORS = {
  CSE:"#00c6ff", ECE:"#a78bfa", ME:"#f59e0b",
  CE:"#34d399",  IT:"#f87171", EEE:"#60a5fa",
};
const getColor = (dept="") => {
  const key = Object.keys(DEPT_COLORS).find(k=>dept.toUpperCase().includes(k));
  return DEPT_COLORS[key]||"#64748b";
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff/60000);
  if (m<1) return "Just now";
  if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};

// ── Request Card ──
const RequestCard = ({ item, onAccept, onReject }) => {
  const cfg   = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const color = getColor(item.department);
  const short = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";
  const teacherInitials = item.teacherName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"T";

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: cfg.color }]}/>

      <View style={styles.cardBody}>
        {/* Subject + Status */}
        <View style={styles.cardTopRow}>
          <View style={[styles.subjectIcon, { backgroundColor: color+"22" }]}>
            <Ionicons name="book" size={16} color={color}/>
          </View>
          <View style={{ flex:1 }}>
            <Text style={styles.subjectName} numberOfLines={1}>{item.subjectName}</Text>
            {item.subjectCode ? <Text style={styles.subjectCode}>{item.subjectCode}</Text> : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={10} color={cfg.color}/>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Teacher info */}
        <View style={styles.teacherRow}>
          <View style={styles.teacherAvatar}>
            <Text style={styles.teacherAvatarText}>{teacherInitials}</Text>
          </View>
          <View>
            <Text style={styles.teacherName}>{item.teacherName}</Text>
            <Text style={styles.teacherLabel}>Teacher · {timeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {/* Class info */}
        <View style={styles.classInfoRow}>
          <View style={[styles.classBadge, { backgroundColor: color+"18" }]}>
            <Ionicons name="people-outline" size={11} color={color}/>
            <Text style={[styles.classBadgeText, { color }]}>{short} {item.admissionYear}</Text>
          </View>
          <View style={styles.classBadge}>
            <Ionicons name="layers-outline" size={11} color="#64748b"/>
            <Text style={styles.classBadgeText}>Semester {item.semester}</Text>
          </View>
          <View style={styles.classBadge}>
            <Ionicons name="business-outline" size={11} color="#64748b"/>
            <Text style={styles.classBadgeText} numberOfLines={1}>
              {item.college?.split(" ").slice(0,2).join(" ")}
            </Text>
          </View>
        </View>

        {/* Rejection note */}
        {item.status==="rejected" && item.adminNote && (
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={13} color="#f87171"/>
            <Text style={styles.noteText}>{item.adminNote}</Text>
          </View>
        )}

        {/* Action buttons — only for pending */}
        {item.status==="pending" && (
          <View style={styles.actionRow}>
            <Pressable style={styles.acceptBtn} onPress={()=>onAccept(item)}>
              <Ionicons name="checkmark-circle-outline" size={15} color="#34d399"/>
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
            <Pressable style={styles.rejectBtn} onPress={()=>onReject(item)}>
              <Ionicons name="close-circle-outline" size={15} color="#f87171"/>
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

// ════════════════════════════════════════════
export default function AdminSubjectRequests() {
  const router = useRouter();

  const [requests, setRequests]       = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  // Reject modal
  const [rejectModal, setRejectModal]   = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote]     = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useFocusEffect(useCallback(() => { loadRequests(); }, []));

  const loadRequests = async (isRefresh=false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const r = await API.get("/admin/subject-requests");
      const data = r.data?.requests || [];
      setRequests(data);
      applyFilter(activeFilter, data);
    } catch { setRequests([]); setFiltered([]); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const applyFilter = (filter, data=requests) => {
    setActiveFilter(filter);
    if (filter==="all") setFiltered(data);
    else setFiltered(data.filter(r=>r.status===filter));
  };

  const handleAccept = (item) => {
    Alert.alert(
      "Accept Request",
      `Allow ${item.teacherName} to teach "${item.subjectName}" to ${item.department?.match(/\(([^)]+)\)/)?.[1]||""} ${item.admissionYear} Sem ${item.semester}?`,
      [
        { text:"Cancel", style:"cancel" },
        { text:"Accept ✅", onPress: async () => {
          try {
            setActionLoading(true);
            await API.put(`/admin/subject-requests/${item._id}/accept`);
            loadRequests();
          } catch(e) { Alert.alert("Error", e.response?.data?.message||"Could not accept"); }
          finally { setActionLoading(false); }
        }},
      ]
    );
  };

  const handleRejectOpen = (item) => {
    setRejectTarget(item); setRejectNote(""); setRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    try {
      setActionLoading(true);
      await API.put(`/admin/subject-requests/${rejectTarget._id}/reject`, { note: rejectNote });
      setRejectModal(false); setRejectTarget(null); setRejectNote("");
      loadRequests();
    } catch(e) { Alert.alert("Error", e.response?.data?.message||"Could not reject"); }
    finally { setActionLoading(false); }
  };

  const pendingCount  = requests.filter(r=>r.status==="pending").length;
  const acceptedCount = requests.filter(r=>r.status==="accepted").length;
  const rejectedCount = requests.filter(r=>r.status==="rejected").length;

  const FILTERS = [
    { key:"all",      label:"All",      count:requests.length,  color:"#64748b" },
    { key:"pending",  label:"Pending",  count:pendingCount,     color:"#f59e0b" },
    { key:"accepted", label:"Accepted", count:acceptedCount,    color:"#34d399" },
    { key:"rejected", label:"Rejected", count:rejectedCount,    color:"#f87171" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>

      {/* Header */}
      <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={()=>router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Subject Requests</Text>
          <Text style={styles.headerSub}>
            {pendingCount > 0 ? `${pendingCount} pending approval` : `${requests.length} total requests`}
          </Text>
        </View>
        <View style={{width:40}}/>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor:"#f59e0b" }]}>
          <Text style={[styles.statNum, { color:"#f59e0b" }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor:"#34d399" }]}>
          <Text style={[styles.statNum, { color:"#34d399" }]}>{acceptedCount}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor:"#f87171" }]}>
          <Text style={[styles.statNum, { color:"#f87171" }]}>{rejectedCount}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor:"#64748b" }]}>
          <Text style={[styles.statNum, { color:"#64748b" }]}>{requests.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ marginBottom:8 }} contentContainerStyle={{ paddingHorizontal:16, gap:8 }}>
        {FILTERS.map(f => (
          <Pressable key={f.key}
            style={[styles.filterChip, activeFilter===f.key && { backgroundColor:f.color+"20", borderColor:f.color+"55" }]}
            onPress={()=>applyFilter(f.key)}>
            <Text style={[styles.filterChipText, activeFilter===f.key && { color:f.color }]}>
              {f.label}
            </Text>
            {f.count > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: f.color+(activeFilter===f.key?"30":"15") }]}>
                <Text style={[styles.filterBadgeText, { color: f.color }]}>{f.count}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {loading
        ? <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b"/></View>
        : (
          <FlatList
            data={filtered}
            keyExtractor={item=>item._id}
            contentContainerStyle={{ padding:16, paddingTop:4, paddingBottom:40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadRequests(true)} tintColor="#f59e0b"/>}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="document-text-outline" size={40} color="#374151"/>
                </View>
                <Text style={styles.emptyTitle}>
                  {activeFilter==="all" ? "No Requests Yet" : `No ${activeFilter} requests`}
                </Text>
                <Text style={styles.emptySubtitle}>
                  Teachers can request subjects from their portal
                </Text>
              </View>
            )}
            renderItem={({item}) => (
              <RequestCard item={item} onAccept={handleAccept} onReject={handleRejectOpen}/>
            )}
          />
        )
      }

      {/* Reject Modal */}
      <Modal visible={rejectModal} transparent animationType="slide" onRequestClose={()=>setRejectModal(false)}>
        <View style={styles.rejectOverlay}>
          <View style={styles.rejectSheet}>
            <View style={styles.handle}/>
            <View style={styles.rejectHeader}>
              <View style={styles.rejectIconBox}>
                <Ionicons name="close-circle-outline" size={20} color="#f87171"/>
              </View>
              <Text style={styles.rejectTitle}>Reject Request</Text>
            </View>
            {rejectTarget && (
              <View style={styles.rejectInfo}>
                <Text style={styles.rejectSubject}>{rejectTarget.subjectName}</Text>
                <Text style={styles.rejectTeacher}>by {rejectTarget.teacherName}</Text>
              </View>
            )}
            <Text style={styles.rejectNoteLabel}>Reason (optional)</Text>
            <View style={styles.rejectInputWrap}>
              <TextInput
                style={styles.rejectInput}
                value={rejectNote}
                onChangeText={setRejectNote}
                placeholder="e.g. Subject already assigned to another teacher..."
                placeholderTextColor="#374151"
                multiline
                maxLength={200}
              />
            </View>
            <View style={styles.rejectBtns}>
              <Pressable style={styles.cancelBtn} onPress={()=>setRejectModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmRejectBtn, actionLoading&&{opacity:0.6}]}
                onPress={handleRejectConfirm}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small"/>
                  : <><Ionicons name="close-circle" size={15} color="#fff"/>
                     <Text style={styles.confirmRejectText}>Reject</Text></>}
              </Pressable>
            </View>
            <View style={{height:24}}/>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#080d17" },
  center:{ flex:1,justifyContent:"center",alignItems:"center" },
  header:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingTop:52,paddingBottom:14 },
  backBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter:{ flex:1,alignItems:"center" },
  headerTitle:{ color:"#fff",fontSize:18,fontWeight:"700" },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  // Stats
  statsRow:{ flexDirection:"row",gap:8,paddingHorizontal:16,marginBottom:12 },
  statCard:{ flex:1,backgroundColor:"#1a2535",borderRadius:12,padding:12,borderLeftWidth:3,alignItems:"center" },
  statNum:{ fontSize:20,fontWeight:"800" },
  statLabel:{ color:"#64748b",fontSize:10,marginTop:2,fontWeight:"600" },
  // Filter
  filterChip:{ flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:"#1a2535",borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  filterChipText:{ color:"#64748b",fontSize:12,fontWeight:"600" },
  filterBadge:{ paddingHorizontal:6,paddingVertical:2,borderRadius:10 },
  filterBadgeText:{ fontSize:10,fontWeight:"800" },
  // Request card
  card:{ flexDirection:"row",backgroundColor:"#1a2535",borderRadius:16,marginBottom:12,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  cardAccent:{ width:3,alignSelf:"stretch" },
  cardBody:{ flex:1,padding:14 },
  cardTopRow:{ flexDirection:"row",alignItems:"flex-start",gap:10,marginBottom:12 },
  subjectIcon:{ width:36,height:36,borderRadius:10,justifyContent:"center",alignItems:"center" },
  subjectName:{ color:"#fff",fontSize:14,fontWeight:"700",flex:1 },
  subjectCode:{ color:"#64748b",fontSize:11,marginTop:2 },
  statusBadge:{ flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:8,paddingVertical:4,borderRadius:8 },
  statusText:{ fontSize:8,fontWeight:"800",letterSpacing:0.5 },
  teacherRow:{ flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"rgba(255,255,255,0.03)",padding:10,borderRadius:10,marginBottom:10 },
  teacherAvatar:{ width:32,height:32,borderRadius:16,backgroundColor:"rgba(245,158,11,0.2)",justifyContent:"center",alignItems:"center" },
  teacherAvatarText:{ color:"#f59e0b",fontSize:12,fontWeight:"800" },
  teacherName:{ color:"#fff",fontSize:13,fontWeight:"700" },
  teacherLabel:{ color:"#64748b",fontSize:10,marginTop:1 },
  classInfoRow:{ flexDirection:"row",gap:6,flexWrap:"wrap",marginBottom:8 },
  classBadge:{ flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(255,255,255,0.06)",paddingHorizontal:8,paddingVertical:4,borderRadius:8 },
  classBadgeText:{ color:"#64748b",fontSize:10,fontWeight:"600" },
  noteRow:{ flexDirection:"row",alignItems:"flex-start",gap:6,backgroundColor:"rgba(248,113,113,0.08)",padding:8,borderRadius:8,marginBottom:8 },
  noteText:{ color:"#f87171",fontSize:11,flex:1 },
  actionRow:{ flexDirection:"row",gap:10,marginTop:4 },
  acceptBtn:{ flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"rgba(52,211,153,0.12)",padding:11,borderRadius:10,borderWidth:1,borderColor:"rgba(52,211,153,0.25)" },
  acceptText:{ color:"#34d399",fontSize:13,fontWeight:"700" },
  rejectBtn:{ flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"rgba(248,113,113,0.12)",padding:11,borderRadius:10,borderWidth:1,borderColor:"rgba(248,113,113,0.25)" },
  rejectText:{ color:"#f87171",fontSize:13,fontWeight:"700" },
  // Empty
  emptyState:{ alignItems:"center",paddingTop:60,gap:12 },
  emptyIcon:{ width:80,height:80,borderRadius:40,backgroundColor:"#1a2535",justifyContent:"center",alignItems:"center" },
  emptyTitle:{ color:"#374151",fontSize:16,fontWeight:"700" },
  emptySubtitle:{ color:"#1f2937",fontSize:13,textAlign:"center" },
  // Reject modal
  rejectOverlay:{ flex:1,backgroundColor:"rgba(0,0,0,0.75)",justifyContent:"flex-end" },
  rejectSheet:{ backgroundColor:"#0f1923",borderTopLeftRadius:28,borderTopRightRadius:28,paddingBottom:20,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  handle:{ width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4 },
  rejectHeader:{ flexDirection:"row",alignItems:"center",gap:12,padding:20,paddingBottom:10 },
  rejectIconBox:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(248,113,113,0.15)",justifyContent:"center",alignItems:"center" },
  rejectTitle:{ color:"#fff",fontSize:17,fontWeight:"800" },
  rejectInfo:{ backgroundColor:"rgba(255,255,255,0.04)",marginHorizontal:20,padding:14,borderRadius:12,marginBottom:12 },
  rejectSubject:{ color:"#fff",fontSize:14,fontWeight:"700" },
  rejectTeacher:{ color:"#64748b",fontSize:12,marginTop:3 },
  rejectNoteLabel:{ color:"#64748b",fontSize:11,fontWeight:"600",marginHorizontal:20,marginBottom:8 },
  rejectInputWrap:{ marginHorizontal:20,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:12,padding:12,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",marginBottom:16 },
  rejectInput:{ color:"#fff",fontSize:14,minHeight:80,textAlignVertical:"top" },
  rejectBtns:{ flexDirection:"row",gap:12,marginHorizontal:20 },
  cancelBtn:{ flex:1,padding:14,borderRadius:12,backgroundColor:"rgba(255,255,255,0.06)",alignItems:"center" },
  cancelBtnText:{ color:"#94a3b8",fontWeight:"700",fontSize:14 },
  confirmRejectBtn:{ flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,padding:14,borderRadius:12,backgroundColor:"#f87171" },
  confirmRejectText:{ color:"#fff",fontWeight:"700",fontSize:14 },
});