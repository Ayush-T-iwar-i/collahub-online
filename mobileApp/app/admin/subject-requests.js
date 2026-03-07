import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, RefreshControl,
  Modal, TextInput, ScrollView, SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const STATUS_COLORS = {
  pending: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#f59e0b" },
  accepted: { bg: "rgba(52,211,153,0.15)", border: "#34d399", text: "#34d399" },
  rejected: { bg: "rgba(248,113,113,0.15)", border: "#f87171", text: "#f87171" },
};

export default function AdminSubjectRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending"); // pending | accepted | rejected | all
  const [rejectModal, setRejectModal] = useState(false);
  const [selReq, setSelReq] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [acting, setActing] = useState(false);

  useFocusEffect(useCallback(() => { loadRequests(); }, []));

  const loadRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/subject-requests");
      setRequests(res.data?.requests || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const handleAccept = (req) => {
    Alert.alert(
      "Accept Request ✅",
      `"${req.subjectName}" — ${req.teacherName}\nSem ${req.semester} • Section ${req.section} • ${req.admissionYear}\n\nAccept it?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept ✅", onPress: async () => {
            try {
              setActing(true);
              await API.put(`/subject-requests/${req._id}/accept`);
              await loadRequests();
              Alert.alert("Done! ✅", "Request accepted — Teacher assigned!");
            } catch (e) {
              Alert.alert("Error", e.response?.data?.message || "Could not accept");
            } finally { setActing(false); }
          }
        },
      ]
    );
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
    } finally { setActing(false); }
  };

  const filtered = filter === "all"
    ? requests
    : requests.filter(r => r.status === filter);

  const counts = {
    pending: requests.filter(r => r.status === "pending").length,
    accepted: requests.filter(r => r.status === "accepted").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    all: requests.length,
  };

  const renderRequest = ({ item }) => {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "";
    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: sc.border }]} />
        <View style={styles.cardBody}>
          {/* Top Row */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardSubName} numberOfLines={2} ellipsizeMode="tail">{item.subjectName}</Text>
              {item.subjectCode ? <Text style={styles.cardSubCode} numberOfLines={1}>{item.subjectCode}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>{String(item.status).toUpperCase()}</Text>
            </View>
          </View>

          {/* Teacher Info */}
          <View style={styles.teacherRow}>
            <Ionicons name="person-circle-outline" size={14} color="#64748b" />
            <Text style={styles.teacherName} numberOfLines={1} ellipsizeMode="tail">{item.teacherName}</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="school-outline" size={11} color="#64748b" />
              <Text style={styles.metaText}>Sem {item.semester}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="people-outline" size={11} color="#64748b" />
              <Text style={styles.metaText}>
                {item.section !== "All" ? `Sec ${item.section}` : "All Sec"}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Ionicons name="calendar-outline" size={11} color="#64748b" />
              <Text style={styles.metaText}>{item.admissionYear}</Text>
            </View>
          </View>

          {item.adminNote ? (
            <Text style={[styles.noteText, { color: sc.text }]} numberOfLines={3}>{item.adminNote}</Text>
          ) : null}

          {/* Actions */}
          {item.status === "pending" && (
            <View style={styles.actionRow}>
              <Pressable style={styles.acceptBtn} onPress={() => handleAccept(item)}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#34d399" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn} onPress={() => { setSelReq(item); setRejectModal(true); }}>
                <Ionicons name="close-circle-outline" size={15} color="#f87171" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  // List header combines filter bar + acting banner so list content never overlaps
  const ListHeader = () => (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        <View style={styles.filterRow}>
          {["pending", "accepted", "rejected", "all"].map((f, idx) => (
            <Pressable key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive, idx !== 0 && { marginLeft: 10 }]}
              onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && { color: "#00c6ff" }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {acting && (
        <View style={styles.actingBanner}>
          <ActivityIndicator color="#00c6ff" size="small" />
          <Text style={styles.actingText}>Processing...</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>Subject Requests</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRequests(true)} tintColor="#00c6ff" />}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No {filter} requests</Text>
            </View>
          )}
          renderItem={renderRequest}
        />
      )}

      {/* Reject Modal */}
      <Modal visible={rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
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
              <Pressable style={[styles.rejectModalBtn, acting && { opacity: 0.7 }]}
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
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#f59e0b", fontSize: 11, marginTop: 2 },
  filterScroll: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  filterContent: { paddingVertical: 10, paddingHorizontal: 16 },
  filterRow: { flexDirection: "row", alignItems: "center" },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  filterBtnActive: { backgroundColor: "rgba(0,198,255,0.12)", borderColor: "#00c6ff" },
  filterText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  actingBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,198,255,0.1)", marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10 },
  actingText: { color: "#00c6ff", fontSize: 12, fontWeight: "600" },
  list: { padding: 16, paddingBottom: 40 },

  card: { flexDirection: "row", backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  cardAccent: { width: 4, alignSelf: "stretch" },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitleWrap: { flex: 1, minWidth: 0, marginRight: 12 },
  cardSubName: { color: "#fff", fontSize: 15, fontWeight: "800", flexShrink: 1 },
  cardSubCode: { color: "#64748b", fontSize: 11, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, alignSelf: "flex-start", minWidth: 88, alignItems: "center", justifyContent: "center" },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },

  teacherRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  teacherName: { color: "#94a3b8", fontSize: 13, fontWeight: "600", flex: 1, minWidth: 0 },
  dateText: { color: "#94a3b8", fontSize: 11, marginLeft: 8 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  metaBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.03)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  metaText: { color: "#64748b", fontSize: 11, fontWeight: "600" },

  noteText: { fontSize: 13, fontStyle: "italic", marginTop: 4 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  acceptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.12)", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(52,211,153,0.25)" },
  acceptBtnText: { color: "#34d399", fontWeight: "700", fontSize: 13 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(248,113,113,0.12)", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(248,113,113,0.25)" },
  rejectBtnText: { color: "#f87171", fontWeight: "700", fontSize: 13 },

  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 12 },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginBottom: 6 },
  modalSubTitle: { color: "#64748b", fontSize: 13, marginBottom: 12 },
  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 8 },
  noteInput: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 12, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", minHeight: 100, textAlignVertical: "top", marginBottom: 16 },
  modalBtnRow: { flexDirection: "row", gap: 12 },
  cancelModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelModalText: { color: "#64748b", fontWeight: "700" },
  rejectModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(248,113,113,0.85)", alignItems: "center" },
  rejectModalText: { color: "#fff", fontWeight: "700" },
});