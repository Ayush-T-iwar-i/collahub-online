// app/admin/subject-requests.js
import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, SafeAreaView, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const STATUS_COLORS = {
  pending:  { bg: "rgba(245,158,11,0.15)",  border: "#f59e0b", text: "#f59e0b" },
  accepted: { bg: "rgba(52,211,153,0.15)",  border: "#34d399", text: "#34d399" },
  rejected: { bg: "rgba(248,113,113,0.15)", border: "#f87171", text: "#f87171" },
};

const DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat" };
const DAY_COLORS= { Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399", Thursday:"#f59e0b", Friday:"#f87171", Saturday:"#fb923c" };

// 8:00 AM → 6:00 PM slots
const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  const label = `${h > 12 ? h-12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
  TIME_SLOTS.push({
    startTime: `${String(h).padStart(2,"0")}:00`,
    endTime:   `${String(h+1).padStart(2,"0")}:00`,
    label,
  });
}

// ── Timetable Assignment Modal ────────────────────────────
const TimetableModal = ({ visible, request, onClose, onSaved }) => {
  const [activeDay,     setActiveDay]     = useState("Monday");
  const [selectedSlots, setSelectedSlots] = useState({});
  const [roomInputs,    setRoomInputs]    = useState({});
  const [saving,        setSaving]        = useState(false);

  // Pre-fill if request already has timetable
  React.useEffect(() => {
    if (visible && request?.timetable?.length > 0) {
      const slots = {}, rooms = {};
      request.timetable.forEach(s => {
        const key = `${s.day}_${s.startTime}`;
        slots[key] = { day: s.day, startTime: s.startTime, endTime: s.endTime };
        rooms[key] = s.room || "";
      });
      setSelectedSlots(slots);
      setRoomInputs(rooms);
    } else if (visible) {
      setSelectedSlots({});
      setRoomInputs({});
    }
  }, [visible, request]);

  const toggleSlot = (day, slot) => {
    const key = `${day}_${slot.startTime}`;
    setSelectedSlots(prev => {
      const updated = { ...prev };
      if (updated[key]) delete updated[key];
      else updated[key] = { day, startTime: slot.startTime, endTime: slot.endTime };
      return updated;
    });
  };

  const totalSlots = Object.keys(selectedSlots).length;

  const handleSave = async () => {
    if (totalSlots === 0) {
      Alert.alert("Error", "Select at least one time slot");
      return;
    }
    const timetable = Object.values(selectedSlots).map(s => ({
      day:       s.day,
      startTime: s.startTime,
      endTime:   s.endTime,
      room:      roomInputs[`${s.day}_${s.startTime}`]?.trim() || "",
    }));

    setSaving(true);
    try {
      await API.put(`/subject-requests/${request._id}/accept`, { timetable });
      onSaved?.();
      onClose();
      Alert.alert("Done! ✅", `"${request.subjectName}" accepted and timetable assigned to ${request.teacherName}!`);
    } catch (e) {
      Alert.alert("Conflict ⚠️", e.response?.data?.message || "Could not assign timetable");
    } finally {
      setSaving(false);
    }
  };

  if (!request) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.timetableSheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.ttHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ttTitle}>Assign Timetable</Text>
              <Text style={styles.ttSub} numberOfLines={1}>
                {request.subjectName} · {request.teacherName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Request info chips */}
          <View style={styles.ttInfoRow}>
            <View style={styles.ttChip}>
              <Ionicons name="school-outline" size={11} color="#a78bfa" />
              <Text style={styles.ttChipText} numberOfLines={1}>
                {request.department?.match(/\(([^)]+)\)/)?.[1] || request.department?.split(" ")[0]}
              </Text>
            </View>
            <View style={styles.ttChip}>
              <Ionicons name="layers-outline" size={11} color="#f59e0b" />
              <Text style={styles.ttChipText}>Sem {request.semester}</Text>
            </View>
            <View style={styles.ttChip}>
              <Ionicons name="calendar-outline" size={11} color="#34d399" />
              <Text style={styles.ttChipText}>Batch {request.admissionYear}</Text>
            </View>
            {request.section && request.section !== "All" && (
              <View style={styles.ttChip}>
                <Ionicons name="people-outline" size={11} color="#00c6ff" />
                <Text style={styles.ttChipText}>Sec {request.section}</Text>
              </View>
            )}
            {totalSlots > 0 && (
              <View style={[styles.ttChip, { backgroundColor:"rgba(52,211,153,0.15)", borderColor:"#34d399" }]}>
                <Ionicons name="checkmark-circle" size={11} color="#34d399" />
                <Text style={[styles.ttChipText, { color:"#34d399" }]}>{totalSlots} slots</Text>
              </View>
            )}
          </View>

          {/* Conflict warning */}
          <View style={styles.conflictNote}>
            <Ionicons name="shield-checkmark-outline" size={12} color="#64748b" />
            <Text style={styles.conflictNoteText}>
              Auto-checks teacher &amp; room conflicts before saving
            </Text>
          </View>

          {/* Day Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.dayTabsScroll} contentContainerStyle={styles.dayTabsContent}>
            {DAYS.map(day => {
              const count = Object.keys(selectedSlots).filter(k => k.startsWith(day)).length;
              const color = DAY_COLORS[day];
              const isAct = activeDay === day;
              return (
                <Pressable key={day}
                  style={[styles.dayTab, isAct && { backgroundColor: color+"20", borderColor: color+"55" }]}
                  onPress={() => setActiveDay(day)}>
                  <Text style={[styles.dayTabText, isAct && { color }]}>{DAY_SHORT[day]}</Text>
                  {count > 0 && (
                    <View style={[styles.dayTabDot, { backgroundColor: color }]}>
                      <Text style={styles.dayTabDotText}>{count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.ttBody}
            keyboardShouldPersistTaps="handled">

            <Text style={[styles.activeDayLabel, { color: DAY_COLORS[activeDay] }]}>
              {activeDay} — tap to select slots
            </Text>

            {/* Time Slots Grid */}
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map(slot => {
                const key      = `${activeDay}_${slot.startTime}`;
                const selected = !!selectedSlots[key];
                const color    = DAY_COLORS[activeDay];
                return (
                  <Pressable key={key}
                    style={[styles.slotChip, selected && { backgroundColor: color+"22", borderColor: color }]}
                    onPress={() => toggleSlot(activeDay, slot)}>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "time-outline"}
                      size={13} color={selected ? color : "#374151"} />
                    <Text style={[styles.slotChipText, selected && { color }]}>{slot.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Room inputs for selected slots of active day */}
            {Object.keys(selectedSlots).filter(k => k.startsWith(activeDay)).length > 0 && (
              <View style={styles.roomSection}>
                <Text style={styles.roomSectionTitle}>Room Numbers (optional)</Text>
                {Object.entries(selectedSlots)
                  .filter(([k]) => k.startsWith(activeDay))
                  .map(([key, slot]) => (
                    <View key={key} style={styles.roomRow}>
                      <View style={[styles.roomTimeTag, { backgroundColor: DAY_COLORS[activeDay]+"18" }]}>
                        <Text style={[styles.roomTimeText, { color: DAY_COLORS[activeDay] }]}>
                          {TIME_SLOTS.find(t => t.startTime === slot.startTime)?.label || slot.startTime}
                        </Text>
                      </View>
                      <TextInput
                        style={styles.roomInput}
                        placeholder="Room no."
                        placeholderTextColor="#374151"
                        value={roomInputs[key] || ""}
                        onChangeText={v => setRoomInputs(prev => ({ ...prev, [key]: v }))}
                        maxLength={10}
                      />
                    </View>
                  ))
                }
              </View>
            )}

            {/* Summary */}
            {totalSlots > 0 && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="calendar-outline" size={13} color="#a78bfa" />
                  <Text style={styles.summaryTitle}>Selected Timetable ({totalSlots} slots)</Text>
                </View>
                {DAYS.map(day => {
                  const daySlots = Object.entries(selectedSlots).filter(([k]) => k.startsWith(day));
                  if (!daySlots.length) return null;
                  return (
                    <View key={day} style={styles.summaryDayRow}>
                      <Text style={[styles.summaryDayName, { color: DAY_COLORS[day] }]}>{DAY_SHORT[day]}</Text>
                      <View style={styles.summarySlots}>
                        {daySlots.map(([key, s]) => (
                          <View key={key} style={[styles.summarySlotBadge, { backgroundColor: DAY_COLORS[day]+"18" }]}>
                            <Text style={[styles.summarySlotText, { color: DAY_COLORS[day] }]}>
                              {TIME_SLOTS.find(t => t.startTime === s.startTime)?.label || s.startTime}
                              {roomInputs[key] ? ` · Rm ${roomInputs[key]}` : ""}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Save button */}
            <Pressable
              style={[styles.saveBtn, (saving || totalSlots === 0) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving || totalSlots === 0}>
              <LinearGradient colors={["#10b981","#059669"]}
                start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={styles.saveBtnGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Accept & Assign Timetable</Text>
                  </>
                }
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Screen ───────────────────────────────────────────
export default function AdminSubjectRequests() {
  const router = useRouter();

  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [filter,      setFilter]      = useState("pending");
  const [acting,      setActing]      = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState(false);
  const [selReq,      setSelReq]      = useState(null);
  const [rejectNote,  setRejectNote]  = useState("");

  // Timetable modal
  const [ttModal,  setTtModal]  = useState(false);
  const [ttReq,    setTtReq]    = useState(null);

  useFocusEffect(useCallback(() => { loadRequests(); }, []));

  const loadRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/subject-requests");
      setRequests(res.data?.requests || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openTimetableModal = (req) => {
    setTtReq(req);
    setTtModal(true);
  };

  const handleReject = async () => {
    try {
      setActing(true);
      await API.put(`/subject-requests/${selReq._id}/reject`, { note: rejectNote });
      setRejectModal(false);
      setRejectNote("");
      await loadRequests();
      Alert.alert("Done", "Request rejected.");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not reject");
    } finally {
      setActing(false);
    }
  };

  const filtered = filter === "all"
    ? requests
    : requests.filter(r => r.status === filter);

  const counts = {
    pending:  requests.filter(r => r.status === "pending").length,
    accepted: requests.filter(r => r.status === "accepted").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    all:      requests.length,
  };

  const renderRequest = ({ item }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("en-IN")
      : "";
    const hasTimetable = item.timetable?.length > 0;

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: sc.border }]} />
        <View style={styles.cardBody}>
          {/* Top Row */}
          <View style={styles.cardTopRow}>
            <View style={{ flex:1, paddingRight:8 }}>
              <Text style={styles.cardSubName} numberOfLines={2}>{item.subjectName}</Text>
              {item.subjectCode ? <Text style={styles.cardSubCode}>{item.subjectCode}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor:sc.bg, borderColor:sc.border }]}>
              <Text style={[styles.statusText, { color:sc.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Teacher */}
          <View style={styles.teacherRow}>
            <Ionicons name="person-circle-outline" size={14} color="#64748b" />
            <Text style={styles.teacherName} numberOfLines={1}>{item.teacherName}</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          {/* Meta chips */}
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="school-outline" size={10} color="#64748b" />
              <Text style={styles.metaChipText}>
                {item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0]}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="layers-outline" size={10} color="#64748b" />
              <Text style={styles.metaChipText}>Sem {item.semester}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={10} color="#64748b" />
              <Text style={styles.metaChipText}>{item.admissionYear}</Text>
            </View>
            {item.section && item.section !== "All" && (
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={10} color="#64748b" />
                <Text style={styles.metaChipText}>Sec {item.section}</Text>
              </View>
            )}
          </View>

          {/* Timetable preview (if assigned) */}
          {hasTimetable && (
            <View style={styles.ttPreview}>
              <Ionicons name="calendar" size={11} color="#34d399" />
              <Text style={styles.ttPreviewText}>
                {item.timetable.map(s => `${DAY_SHORT[s.day] || s.day} ${s.startTime}${s.room ? ` (${s.room})` : ""}`).join("  ·  ")}
              </Text>
            </View>
          )}

          {item.adminNote ? (
            <Text style={[styles.noteText, { color: sc.text }]}>{item.adminNote}</Text>
          ) : null}

          {/* Actions */}
          {item.status === "pending" && (
            <View style={styles.actionRow}>
              <Pressable style={styles.acceptBtn} onPress={() => openTimetableModal(item)}>
                <Ionicons name="calendar-outline" size={14} color="#34d399" />
                <Text style={styles.acceptBtnText}>Accept & Set Timetable</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn}
                onPress={() => { setSelReq(item); setRejectModal(true); }}>
                <Ionicons name="close-circle-outline" size={14} color="#f87171" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
            </View>
          )}
          {item.status === "accepted" && (
            <Pressable style={styles.editTtBtn} onPress={() => openTimetableModal(item)}>
              <Ionicons name="pencil" size={12} color="#a78bfa" />
              <Text style={styles.editTtBtnText}>Edit Timetable</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/dashboard")}
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Subject Requests</Text>
          <Text style={styles.headerSub}>{counts.pending} pending</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadRequests(true)} tintColor="#00c6ff" />
          }
          ListHeaderComponent={() => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {["pending","accepted","rejected","all"].map((f, i) => (
                <Pressable key={f}
                  style={[styles.filterBtn, filter===f && styles.filterBtnActive, i>0 && { marginLeft:10 }]}
                  onPress={() => setFilter(f)}>
                  <Text style={[styles.filterText, filter===f && { color:"#00c6ff" }]}>
                    {f.charAt(0).toUpperCase()+f.slice(1)} ({counts[f]})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No {filter} requests</Text>
            </View>
          )}
          renderItem={renderRequest}
        />
      )}

      {/* Timetable Modal */}
      <TimetableModal
        visible={ttModal}
        request={ttReq}
        onClose={() => setTtModal(false)}
        onSaved={loadRequests}
      />

      {/* Reject Modal */}
      <Modal visible={rejectModal} transparent animationType="slide"
        onRequestClose={() => setRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.rejectSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.modalSubTitle}>{selReq?.subjectName} — {selReq?.teacherName}</Text>
            <Text style={styles.fieldLabel}>Rejection Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Reason for rejection..."
              placeholderTextColor="#374151"
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtnRow}>
              <Pressable style={styles.cancelModalBtn} onPress={() => setRejectModal(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.rejectModalBtn, acting && { opacity:0.7 }]}
                onPress={handleReject} disabled={acting}>
                {acting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.rejectModalText}>Reject</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:"#080d17" },
  center:       { flex:1, justifyContent:"center", alignItems:"center" },
  header:       { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:18, paddingBottom:14 },
  backBtn:      { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter: { flex:1, alignItems:"center", paddingHorizontal:8 },
  headerTitle:  { color:"#fff", fontSize:18, fontWeight:"800" },
  headerSub:    { color:"#f59e0b", fontSize:11, marginTop:2 },

  filterScroll:  { borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.04)" },
  filterContent: { paddingVertical:10, paddingHorizontal:16 },
  filterBtn:     { paddingHorizontal:12, paddingVertical:8, borderRadius:10, backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  filterBtnActive:{ backgroundColor:"rgba(0,198,255,0.12)", borderColor:"#00c6ff" },
  filterText:    { color:"#64748b", fontSize:12, fontWeight:"700" },

  list:          { padding:16, paddingBottom:40 },
  card:          { flexDirection:"row", backgroundColor:"#1a2535", borderRadius:14, marginBottom:12, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  cardAccent:    { width:4, alignSelf:"stretch" },
  cardBody:      { flex:1, padding:14 },
  cardTopRow:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:8 },
  cardSubName:   { color:"#fff", fontSize:15, fontWeight:"800" },
  cardSubCode:   { color:"#64748b", fontSize:11, marginTop:3 },
  statusBadge:   { paddingHorizontal:10, paddingVertical:5, borderRadius:10, borderWidth:1, alignSelf:"flex-start" },
  statusText:    { fontSize:10, fontWeight:"800" },
  teacherRow:    { flexDirection:"row", alignItems:"center", gap:8, marginBottom:8 },
  teacherName:   { color:"#94a3b8", fontSize:13, fontWeight:"600", flex:1 },
  dateText:      { color:"#374151", fontSize:11 },
  metaRow:       { flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:8 },
  metaChip:      { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.05)", paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  metaChipText:  { color:"#64748b", fontSize:10, fontWeight:"600" },
  ttPreview:     { flexDirection:"row", alignItems:"flex-start", gap:6, backgroundColor:"rgba(52,211,153,0.06)", padding:8, borderRadius:8, marginBottom:8, borderWidth:1, borderColor:"rgba(52,211,153,0.15)" },
  ttPreviewText: { color:"#34d399", fontSize:10, flex:1, lineHeight:16 },
  noteText:      { fontSize:12, fontStyle:"italic", marginBottom:6 },
  actionRow:     { flexDirection:"row", gap:10, marginTop:6 },
  acceptBtn:     { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, backgroundColor:"rgba(52,211,153,0.12)", paddingVertical:11, borderRadius:10, borderWidth:1, borderColor:"rgba(52,211,153,0.25)" },
  acceptBtnText: { color:"#34d399", fontWeight:"700", fontSize:12 },
  rejectBtn:     { flex:0.6, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, backgroundColor:"rgba(248,113,113,0.12)", paddingVertical:11, borderRadius:10, borderWidth:1, borderColor:"rgba(248,113,113,0.25)" },
  rejectBtnText: { color:"#f87171", fontWeight:"700", fontSize:12 },
  editTtBtn:     { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(167,139,250,0.12)", paddingVertical:8, paddingHorizontal:12, borderRadius:8, alignSelf:"flex-start", marginTop:6, borderWidth:1, borderColor:"rgba(167,139,250,0.25)" },
  editTtBtnText: { color:"#a78bfa", fontSize:11, fontWeight:"700" },
  empty:         { alignItems:"center", paddingTop:80, gap:12 },
  emptyTitle:    { color:"#374151", fontSize:16, fontWeight:"700" },

  // Timetable modal
  modalOverlay:   { flex:1, backgroundColor:"rgba(0,0,0,0.82)", justifyContent:"flex-end" },
  timetableSheet: { backgroundColor:"#0f1923", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.93, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  handle:         { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:4 },
  ttHeader:       { flexDirection:"row", alignItems:"center", padding:20, paddingBottom:10 },
  ttTitle:        { color:"#fff", fontSize:16, fontWeight:"800" },
  ttSub:          { color:"#64748b", fontSize:11, marginTop:2 },
  closeBtn:       { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  ttInfoRow:      { flexDirection:"row", flexWrap:"wrap", gap:8, paddingHorizontal:20, paddingBottom:10 },
  ttChip:         { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.06)", paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  ttChipText:     { color:"#64748b", fontSize:11, fontWeight:"600" },
  conflictNote:   { flexDirection:"row", alignItems:"center", gap:6, marginHorizontal:20, marginBottom:8, backgroundColor:"rgba(52,211,153,0.06)", padding:8, borderRadius:8 },
  conflictNoteText:{ color:"#64748b", fontSize:11 },
  dayTabsScroll:  { borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)", maxHeight:50 },
  dayTabsContent: { paddingHorizontal:16, gap:8, paddingVertical:8, alignItems:"center" },
  dayTab:         { paddingHorizontal:14, paddingVertical:5, borderRadius:20, backgroundColor:"#1a2535", borderWidth:1, borderColor:"rgba(255,255,255,0.06)", flexDirection:"row", alignItems:"center", gap:5 },
  dayTabText:     { color:"#64748b", fontSize:12, fontWeight:"700" },
  dayTabDot:      { width:16, height:16, borderRadius:8, justifyContent:"center", alignItems:"center" },
  dayTabDotText:  { color:"#000", fontSize:9, fontWeight:"800" },
  ttBody:         { padding:16, paddingBottom:40 },
  activeDayLabel: { fontSize:13, fontWeight:"800", marginBottom:10 },
  slotsGrid:      { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:14 },
  slotChip:       { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:9, borderRadius:10, backgroundColor:"rgba(255,255,255,0.05)", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  slotChipText:   { color:"#64748b", fontSize:11, fontWeight:"600" },
  roomSection:    { backgroundColor:"rgba(255,255,255,0.04)", borderRadius:12, padding:12, marginBottom:12, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  roomSectionTitle:{ color:"#94a3b8", fontSize:12, fontWeight:"700", marginBottom:8 },
  roomRow:        { flexDirection:"row", alignItems:"center", gap:10, marginBottom:8 },
  roomTimeTag:    { paddingHorizontal:10, paddingVertical:5, borderRadius:8 },
  roomTimeText:   { fontSize:11, fontWeight:"700" },
  roomInput:      { flex:1, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:8, paddingHorizontal:12, paddingVertical:8, color:"#fff", fontSize:13, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  summaryBox:     { backgroundColor:"rgba(167,139,250,0.08)", borderRadius:12, padding:12, marginBottom:12, borderWidth:1, borderColor:"rgba(167,139,250,0.2)" },
  summaryHeader:  { flexDirection:"row", alignItems:"center", gap:6, marginBottom:8 },
  summaryTitle:   { color:"#a78bfa", fontSize:12, fontWeight:"700" },
  summaryDayRow:  { flexDirection:"row", alignItems:"center", gap:8, marginBottom:6 },
  summaryDayName: { fontSize:11, fontWeight:"800", width:30 },
  summarySlots:   { flexDirection:"row", flexWrap:"wrap", gap:6, flex:1 },
  summarySlotBadge:{ paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  summarySlotText:{ fontSize:10, fontWeight:"700" },
  saveBtn:        { borderRadius:14, overflow:"hidden", marginTop:8 },
  saveBtnGrad:    { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:16 },
  saveBtnText:    { color:"#fff", fontWeight:"800", fontSize:15 },

  // Reject modal
  rejectSheet:    { backgroundColor:"#0f1923", borderTopLeftRadius:18, borderTopRightRadius:18, padding:20, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  modalTitle:     { color:"#fff", fontSize:17, fontWeight:"800", marginBottom:6 },
  modalSubTitle:  { color:"#64748b", fontSize:13, marginBottom:12 },
  fieldLabel:     { color:"#64748b", fontSize:11, fontWeight:"700", marginBottom:8 },
  noteInput:      { backgroundColor:"rgba(255,255,255,0.06)", borderRadius:12, padding:12, color:"#fff", fontSize:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", minHeight:100, textAlignVertical:"top", marginBottom:16 },
  modalBtnRow:    { flexDirection:"row", gap:12 },
  cancelModalBtn: { flex:1, paddingVertical:12, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", alignItems:"center" },
  cancelModalText:{ color:"#64748b", fontWeight:"700" },
  rejectModalBtn: { flex:1, paddingVertical:12, borderRadius:12, backgroundColor:"rgba(248,113,113,0.85)", alignItems:"center" },
  rejectModalText:{ color:"#fff", fontWeight:"700" },
});