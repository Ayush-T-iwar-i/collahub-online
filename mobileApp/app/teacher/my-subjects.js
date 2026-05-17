import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const SEMESTERS  = ["1","2","3","4","5","6","7","8"];
const SECTIONS   = ["All","A","B","C","D"];
const YEARS      = ["2020","2021","2022","2023","2024","2025","2026"];

const STATUS_COLORS = {
  pending:  { bg:"rgba(245,158,11,0.15)",  border:"#f59e0b", text:"#f59e0b" },
  accepted: { bg:"rgba(52,211,153,0.15)",  border:"#34d399", text:"#34d399" },
  rejected: { bg:"rgba(248,113,113,0.15)", border:"#f87171", text:"#f87171" },
};

const TYPE_COLORS = { Theory:"#00c6ff", Lab:"#f59e0b", Both:"#a78bfa" };
const SEM_COLORS  = ["#00c6ff","#34d399","#a78bfa","#f59e0b","#f87171","#60a5fa","#fb923c","#e879f9"];

// ─────────────────────────────────────────────────────────
// Subject Card — ✅ Schedule button removed
// ─────────────────────────────────────────────────────────
const SubjectCard = ({ item, request, onRequest }) => {
  const semColor  = SEM_COLORS[(Number(item.semester) - 1) % SEM_COLORS.length];
  const typeColor = TYPE_COLORS[item.type] || "#64748b";
  const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";

  const isAccepted = request?.status === "accepted";
  const isPending  = request?.status === "pending";
  const isRejected = request?.status === "rejected";

  return (
    <View style={[
      styles.subCard,
      isAccepted && { borderColor:"rgba(52,211,153,0.4)", backgroundColor:"rgba(52,211,153,0.03)" },
      isPending  && { borderColor:"rgba(245,158,11,0.35)" },
    ]}>
      <View style={[styles.subIconWrap, { backgroundColor: semColor+"18" }]}>
        <Ionicons name="book" size={22} color={semColor} />
      </View>

      <View style={styles.subInfo}>
        <Text style={styles.subName} numberOfLines={1}>{item.name}</Text>

        <View style={styles.subBadgeRow}>
          {item.code && (
            <View style={[styles.codeBadge, { backgroundColor: semColor+"18" }]}>
              <Text style={[styles.codeBadgeText, { color: semColor }]}>{item.code}</Text>
            </View>
          )}
          <View style={[styles.semBadge, { backgroundColor: semColor+"18" }]}>
            <Text style={[styles.semBadgeText, { color: semColor }]}>Sem {item.semester}</Text>
          </View>
          {item.type && (
            <View style={[styles.typeBadge, { backgroundColor: typeColor+"18" }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.type}</Text>
            </View>
          )}
        </View>

        <View style={styles.subMetaRow}>
          <Ionicons name="business-outline" size={10} color="#64748b" />
          <Text style={styles.subMetaText}>{deptShort}</Text>
          {item.credits > 0 && (
            <>
              <Text style={styles.subDot}>·</Text>
              <Ionicons name="star-outline" size={10} color="#a78bfa" />
              <Text style={[styles.subMetaText, { color:"#a78bfa" }]}>{item.credits} cr</Text>
            </>
          )}
        </View>

        {/* ✅ Status info — no schedule button */}
        {isAccepted && (
          <View style={styles.schedSetRow}>
            <Ionicons name="checkmark-circle" size={11} color="#34d399" />
            <Text style={styles.schedSetText}>Active — timetable assigned by admin</Text>
          </View>
        )}
      </View>

      {/* Right Actions */}
      <View style={styles.subAction}>
        {isAccepted && (
          <View style={styles.acceptedPill}>
            <Ionicons name="checkmark-circle" size={12} color="#34d399" />
            <Text style={styles.acceptedPillText}>Active</Text>
          </View>
        )}
        {isPending && (
          <View style={styles.pendingPill}>
            <Ionicons name="time-outline" size={12} color="#f59e0b" />
            <Text style={styles.pendingPillText}>Pending</Text>
          </View>
        )}
        {isRejected && (
          <Pressable style={styles.requestBtn} onPress={() => onRequest(item)}>
            <Ionicons name="refresh-outline" size={12} color="#fff" />
            <Text style={styles.requestBtnText}>Re-request</Text>
          </Pressable>
        )}
        {!request && (
          <Pressable style={styles.requestBtn} onPress={() => onRequest(item)}>
            <Ionicons name="send-outline" size={12} color="#fff" />
            <Text style={styles.requestBtnText}>Request</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────
// Request Card — ✅ Schedule button removed, Attend button kept
// ─────────────────────────────────────────────────────────
const RequestCard = ({ item, onDelete, onAttendance }) => {
  const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;

  return (
    <View style={[
      styles.reqCard,
      item.status === "accepted" && { borderColor:"rgba(52,211,153,0.3)", backgroundColor:"rgba(52,211,153,0.03)" },
    ]}>
      <View style={[styles.reqAccent, { backgroundColor: sc.border }]} />
      <View style={styles.reqBody}>
        <Text style={styles.reqSubName}>{item.subjectName}</Text>
        {item.subjectCode ? (
          <Text style={styles.reqSubCode}>{item.subjectCode}</Text>
        ) : null}

        <View style={styles.reqChipRow}>
          <View style={styles.reqChip}>
            <Ionicons name="layers-outline" size={10} color="#64748b" />
            <Text style={styles.reqChipText}>Sem {item.semester}</Text>
          </View>
          {item.section && item.section !== "All" && (
            <View style={styles.reqChip}>
              <Ionicons name="people-outline" size={10} color="#64748b" />
              <Text style={styles.reqChipText}>Sec {item.section}</Text>
            </View>
          )}
          {item.admissionYear && (
            <View style={styles.reqChip}>
              <Ionicons name="calendar-outline" size={10} color="#64748b" />
              <Text style={styles.reqChipText}>Batch {item.admissionYear}</Text>
            </View>
          )}
        </View>

        {item.adminNote ? (
          <Text style={[styles.reqNote, { color: sc.text }]}>{item.adminNote}</Text>
        ) : null}

        {/* ✅ Timetable info — admin assigned */}
        {item.status === "accepted" && (
          <View style={styles.timetableInfo}>
            {item.timetable?.length > 0 ? (
              <View style={styles.timetablePreview}>
                <Ionicons name="calendar-outline" size={11} color="#34d399" />
                <Text style={styles.timetablePreviewText} numberOfLines={2}>
                  {item.timetable.map(s =>
                    `${s.day.slice(0,3)} ${s.startTime}${s.room ? ` (${s.room})` : ""}`
                  ).join("  ·  ")}
                </Text>
              </View>
            ) : (
              <View style={styles.schedNotSetRow}>
                <Ionicons name="alert-circle-outline" size={11} color="#f59e0b" />
                <Text style={styles.schedNotSetText}>
                  Timetable not assigned yet by admin
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Right side */}
      <View style={styles.reqRight}>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>

        {item.status === "pending" && (
          <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
            <Ionicons name="trash-outline" size={13} color="#f87171" />
          </Pressable>
        )}

        {/* ✅ Only Attend button — no schedule button */}
        {item.status === "accepted" && (
          <Pressable style={styles.attendBtn} onPress={() => onAttendance(item)}>
            <Ionicons name="calendar" size={12} color="#34d399" />
            <Text style={styles.attendBtnText}>Attend</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function TeacherMySubjects() {
  const router = useRouter();

  const [tab,         setTab]         = useState("available");
  const [subjects,    setSubjects]    = useState([]);
  const [myRequests,  setMyRequests]  = useState([]);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  // Request modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selSubject,   setSelSubject]   = useState(null);
  const [semester,     setSemester]     = useState("");
  const [section,      setSection]      = useState("All");
  const [admYear,      setAdmYear]      = useState("");

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [subRes, reqRes] = await Promise.all([
        API.get("/subjects/for-teacher"),
        API.get("/subject-requests/my"),
      ]);

      setSubjects(subRes.data?.subjects || []);
      setTeacherInfo(subRes.data?.teacher || null);
      setMyRequests(reqRes.data?.requests || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const findRequest = (subject) => {
    if (!subject) return null;
    return myRequests.find(r =>
      r.subjectName === subject.name ||
      (r.subjectCode && subject.code && r.subjectCode === subject.code)
    ) || null;
  };

  // ── Open Request Modal ──
  const openModal = (subject) => {
    setSelSubject(subject);
    setSemester(String(subject.semester || ""));
    setSection("All");
    setAdmYear("");
    setModalVisible(true);
  };

  // ── Send Request ──
  const handleSendRequest = async () => {
    if (!semester) {
      return Alert.alert("Error", "Please select a semester");
    }
    if (!admYear) {
      return Alert.alert("Error", "Batch year is required");
    }
    if (admYear.length !== 4) {
      return Alert.alert("Error", "Enter a valid 4-digit year (e.g. 2023)");
    }
    try {
      setSending(true);
      await API.post("/subject-requests", {
        subjectId:     selSubject._id,
        subjectName:   selSubject.name,
        subjectCode:   selSubject.code || "",
        college:       selSubject.college || teacherInfo?.college || "",
        department:    selSubject.department || teacherInfo?.department || "",
        semester:      Number(semester),
        admissionYear: String(admYear),
        section,
      });
      setModalVisible(false);
      await loadAll();
      Alert.alert(
        "Request Sent!",
        "Your request has been sent to admin. Once approved, timetable will be assigned automatically."
      );
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not send request");
    } finally {
      setSending(false);
    }
  };

  // ── Delete Request ──
  const handleDelete = (req) => {
    Alert.alert(
      "Delete Request",
      `Delete request for "${req.subjectName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/subject-requests/${req._id}`);
              setMyRequests(prev => prev.filter(r => r._id !== req._id));
            } catch (e) {
              Alert.alert("Error", e.response?.data?.message || "Could not delete");
            }
          },
        },
      ]
    );
  };

  // ── Go to Mark Attendance ──
  // ✅ FIX: pass request._id as subjectRequestId
  const goAttendance = (req) => {
    router.push({
      pathname: "/teacher/mark-attendance",
      params:   { subjectRequestId: req._id },
    });
  };

  const pendingCount  = myRequests.filter(r => r.status === "pending").length;
  const acceptedCount = myRequests.filter(r => r.status === "accepted").length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Subjects</Text>
          {teacherInfo && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {teacherInfo.college} · {
                teacherInfo.department?.match(/\(([^)]+)\)/)?.[1] ||
                teacherInfo.department?.split(" ")[0]
              }
            </Text>
          )}
        </View>
        <View style={{ width:40 }} />
      </LinearGradient>

      {/* Info Banner */}
      {teacherInfo && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={13} color="#f59e0b" />
          <Text style={styles.infoBannerText} numberOfLines={1}>
            Timetable is assigned by admin after request approval
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === "available" && styles.tabActive]}
          onPress={() => setTab("available")}>
          <Ionicons name="book-outline" size={14} color={tab === "available" ? "#00c6ff" : "#64748b"} />
          <Text style={[styles.tabText, tab === "available" && { color:"#00c6ff" }]}>
            Available ({subjects.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "requests" && styles.tabActive]}
          onPress={() => setTab("requests")}>
          <Ionicons name="paper-plane-outline" size={14} color={tab === "requests" ? "#a78bfa" : "#64748b"} />
          <Text style={[styles.tabText, tab === "requests" && { color:"#a78bfa" }]}>
            My Requests ({myRequests.length})
          </Text>
          {pendingCount > 0 && (
            <View style={styles.tabDot}>
              <Text style={styles.tabDotText}>{pendingCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <>
          {/* ── AVAILABLE TAB ── */}
          {tab === "available" && (
            <FlatList
              data={subjects}
              keyExtractor={i => i._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onRefresh={() => loadAll(true)}
              refreshing={refreshing}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="book-outline" size={44} color="#374151" />
                  </View>
                  <Text style={styles.emptyTitle}>No Subjects Found</Text>
                  <Text style={styles.emptySub}>
                    Admin has not added subjects for your college and department yet.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <SubjectCard
                  item={item}
                  request={findRequest(item)}
                  onRequest={openModal}
                />
              )}
            />
          )}

          {/* ── REQUESTS TAB ── */}
          {tab === "requests" && (
            <FlatList
              data={myRequests}
              keyExtractor={i => i._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onRefresh={() => loadAll(true)}
              refreshing={refreshing}
              ListHeaderComponent={() =>
                acceptedCount > 0 ? (
                  <View style={styles.listHeader}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#34d399" />
                    <Text style={styles.listHeaderText}>
                      {acceptedCount} subject{acceptedCount > 1 ? "s" : ""} approved —
                      tap Attend to mark attendance
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="paper-plane-outline" size={44} color="#374151" />
                  </View>
                  <Text style={styles.emptyTitle}>No Requests Yet</Text>
                  <Text style={styles.emptySub}>
                    Go to Available tab and tap Request on a subject.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <RequestCard
                  item={item}
                  onDelete={handleDelete}
                  onAttendance={goAttendance}
                />
              )}
            />
          )}
        </>
      )}

      {/* ── REQUEST MODAL ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Ionicons name="send-outline" size={18} color="#f59e0b" />
              <Text style={styles.modalTitle}>Request Subject Access</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal:20, paddingBottom:30 }}>

              {selSubject && (
                <View style={styles.selectedBox}>
                  <Ionicons name="book" size={15} color="#f59e0b" />
                  <View style={{ flex:1 }}>
                    <Text style={styles.selectedName}>{selSubject.name}</Text>
                    <Text style={styles.selectedMeta}>
                      {selSubject.code} · Sem {selSubject.semester}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.fieldLabel}>Semester *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginBottom:16 }}>
                <View style={styles.chipRow}>
                  {SEMESTERS.map(s => (
                    <Pressable key={s}
                      style={[styles.chip, semester === s && styles.chipActive]}
                      onPress={() => setSemester(s)}>
                      <Text style={[styles.chipText, semester === s && { color:"#f59e0b" }]}>
                        Sem {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Section</Text>
              <View style={[styles.chipRow, { marginBottom:16, flexWrap:"wrap" }]}>
                {SECTIONS.map(s => (
                  <Pressable key={s}
                    style={[styles.chip, section === s && styles.chipActive]}
                    onPress={() => setSection(s)}>
                    <Text style={[styles.chipText, section === s && { color:"#f59e0b" }]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Batch Year (Admission Year) *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2023"
                  placeholderTextColor="#374151"
                  value={admYear}
                  onChangeText={t => setAdmYear(t.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>

              <Pressable
                style={[styles.sendBtn, sending && { opacity:0.65 }]}
                onPress={handleSendRequest}
                disabled={sending}>
                <LinearGradient
                  colors={["#f59e0b","#d97706"]}
                  start={{ x:0, y:0 }} end={{ x:1, y:0 }}
                  style={styles.sendBtnGrad}>
                  {sending
                    ? <ActivityIndicator color="#fff" />
                    : <>
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={styles.sendBtnText}>Send Request to Admin</Text>
                    </>
                  }
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex:1, backgroundColor:"#080d17" },
  center:          { flex:1, justifyContent:"center", alignItems:"center" },

  header:          { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  backBtn:         { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:    { flex:1, alignItems:"center" },
  headerTitle:     { color:"#fff", fontSize:18, fontWeight:"800" },
  headerSub:       { color:"#64748b", fontSize:11, marginTop:2 },

  infoBanner:      { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(245,158,11,0.08)", marginHorizontal:16, marginTop:8, padding:10, borderRadius:12, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  infoBannerText:  { flex:1, color:"#94a3b8", fontSize:11 },

  tabRow:          { flexDirection:"row", borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)", marginTop:8 },
  tab:             { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:13 },
  tabActive:       { borderBottomWidth:2, borderBottomColor:"#f59e0b" },
  tabText:         { color:"#64748b", fontSize:12, fontWeight:"700" },
  tabDot:          { backgroundColor:"#f59e0b", borderRadius:10, paddingHorizontal:5, paddingVertical:1 },
  tabDotText:      { color:"#000", fontSize:9, fontWeight:"800" },

  list:            { padding:16, paddingBottom:30 },
  listHeader:      { flexDirection:"row", alignItems:"flex-start", gap:8, padding:12, borderRadius:12, borderWidth:1, marginBottom:14, borderColor:"rgba(52,211,153,0.3)", backgroundColor:"rgba(52,211,153,0.06)" },
  listHeaderText:  { color:"#34d399", fontSize:11, flex:1, lineHeight:16 },

  // Subject card
  subCard:         { flexDirection:"row", alignItems:"center", backgroundColor:"#1a2535", borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:"rgba(255,255,255,0.06)", gap:10 },
  subIconWrap:     { width:46, height:46, borderRadius:13, justifyContent:"center", alignItems:"center" },
  subInfo:         { flex:1 },
  subName:         { color:"#fff", fontSize:14, fontWeight:"700", marginBottom:5 },
  subBadgeRow:     { flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:5 },
  codeBadge:       { paddingHorizontal:8, paddingVertical:2, borderRadius:6 },
  codeBadgeText:   { fontSize:10, fontWeight:"800" },
  semBadge:        { paddingHorizontal:8, paddingVertical:2, borderRadius:6 },
  semBadgeText:    { fontSize:10, fontWeight:"700" },
  typeBadge:       { paddingHorizontal:8, paddingVertical:2, borderRadius:6 },
  typeBadgeText:   { fontSize:10, fontWeight:"700" },
  subMetaRow:      { flexDirection:"row", alignItems:"center", gap:4 },
  subMetaText:     { color:"#64748b", fontSize:10 },
  subDot:          { color:"#374151", fontSize:10 },
  schedSetRow:     { flexDirection:"row", alignItems:"center", gap:4, marginTop:5 },
  schedSetText:    { color:"#34d399", fontSize:10, fontWeight:"600" },
  schedNotSetRow:  { flexDirection:"row", alignItems:"center", gap:4, marginTop:5 },
  schedNotSetText: { color:"#f59e0b", fontSize:10 },
  subAction:       { alignItems:"center", gap:6 },
  acceptedPill:    { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(52,211,153,0.12)", paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:"rgba(52,211,153,0.3)" },
  acceptedPillText:{ color:"#34d399", fontSize:10, fontWeight:"700" },
  pendingPill:     { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(245,158,11,0.12)", paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  pendingPillText: { color:"#f59e0b", fontSize:10, fontWeight:"700" },
  requestBtn:      { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(245,158,11,0.85)", paddingHorizontal:10, paddingVertical:8, borderRadius:10 },
  requestBtnText:  { color:"#fff", fontSize:10, fontWeight:"800" },

  // Request card
  reqCard:         { flexDirection:"row", alignItems:"center", backgroundColor:"#1a2535", borderRadius:14, marginBottom:10, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  reqAccent:       { width:3, alignSelf:"stretch" },
  reqBody:         { flex:1, padding:12 },
  reqSubName:      { color:"#fff", fontSize:14, fontWeight:"700" },
  reqSubCode:      { color:"#64748b", fontSize:11, marginTop:1, marginBottom:5 },
  reqChipRow:      { flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:5 },
  reqChip:         { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.06)", paddingHorizontal:8, paddingVertical:3, borderRadius:6 },
  reqChipText:     { color:"#64748b", fontSize:10 },
  reqNote:         { fontSize:11, fontStyle:"italic", marginTop:4 },
  timetableInfo:   { marginTop:6 },
  timetablePreview:{ flexDirection:"row", alignItems:"flex-start", gap:5, backgroundColor:"rgba(52,211,153,0.06)", padding:8, borderRadius:8, borderWidth:1, borderColor:"rgba(52,211,153,0.15)" },
  timetablePreviewText:{ color:"#34d399", fontSize:10, flex:1, lineHeight:16 },
  reqRight:        { paddingRight:10, alignItems:"center", gap:6 },
  statusBadge:     { paddingHorizontal:8, paddingVertical:4, borderRadius:8, borderWidth:1 },
  statusText:      { fontSize:10, fontWeight:"700" },
  deleteBtn:       { width:30, height:30, borderRadius:8, backgroundColor:"rgba(248,113,113,0.12)", justifyContent:"center", alignItems:"center" },
  attendBtn:       { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(52,211,153,0.12)", paddingHorizontal:8, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:"rgba(52,211,153,0.25)" },
  attendBtnText:   { color:"#34d399", fontSize:10, fontWeight:"700" },

  empty:           { alignItems:"center", paddingTop:70, gap:12, paddingHorizontal:20 },
  emptyIconWrap:   { width:80, height:80, borderRadius:40, backgroundColor:"#1a2535", justifyContent:"center", alignItems:"center" },
  emptyTitle:      { color:"#374151", fontSize:16, fontWeight:"700" },
  emptySub:        { color:"#1f2937", fontSize:12, textAlign:"center", lineHeight:18 },

  // Request Modal
  modalOverlay:    { flex:1, backgroundColor:"rgba(0,0,0,0.78)", justifyContent:"flex-end" },
  modalSheet:      { backgroundColor:"#0f1923", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.85, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  modalHandle:     { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:4 },
  modalHeader:     { flexDirection:"row", alignItems:"center", gap:10, padding:20, paddingBottom:12 },
  modalTitle:      { flex:1, color:"#fff", fontSize:17, fontWeight:"800" },
  selectedBox:     { flexDirection:"row", alignItems:"flex-start", gap:10, backgroundColor:"rgba(245,158,11,0.08)", borderRadius:14, padding:14, marginBottom:18, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  selectedName:    { color:"#fff", fontSize:14, fontWeight:"700" },
  selectedMeta:    { color:"#64748b", fontSize:11, marginTop:2 },
  fieldLabel:      { color:"#64748b", fontSize:11, fontWeight:"700", letterSpacing:0.5, marginBottom:8 },
  chipRow:         { flexDirection:"row", gap:8 },
  chip:            { paddingHorizontal:14, paddingVertical:8, borderRadius:10, backgroundColor:"rgba(255,255,255,0.06)", borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  chipActive:      { backgroundColor:"rgba(245,158,11,0.15)", borderColor:"#f59e0b" },
  chipText:        { color:"#64748b", fontSize:12, fontWeight:"700" },
  inputRow:        { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:12, paddingHorizontal:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", marginBottom:20 },
  input:           { flex:1, color:"#fff", fontSize:15, paddingVertical:14 },
  sendBtn:         { borderRadius:14, overflow:"hidden" },
  sendBtnGrad:     { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:16 },
  sendBtnText:     { color:"#fff", fontWeight:"700", fontSize:15 },
});