// ══════════════════════════════════════════════════════════════
// admin-biometric.js  →  app/admin/biometric.js
//
// Live gate attendance dashboard
// Essl device se aane wale real-time punch logs
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, ScrollView, TextInput,
  Alert, Modal, StatusBar, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const IS_WEB = Platform.OS === "web";

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

// ─────────────────────────────────────────────────────────
//  Stat Card
// ─────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
  <LinearGradient colors={[color + "18", color + "06"]}
    style={[styles.statCard, { borderColor: color + "30" }]}>
    <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.statVal, { color }]}>{value ?? "—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </LinearGradient>
);

// ─────────────────────────────────────────────────────────
//  Log Row
// ─────────────────────────────────────────────────────────
const LogRow = ({ item, onEnroll }) => {
  const isIn  = item.punchType === "CheckIn";
  const color = isIn ? "#34d399" : "#f87171";

  return (
    <View style={styles.logRow}>
      {/* Avatar */}
      <View style={[styles.logAvatar, { backgroundColor: item.matched ? color + "18" : "rgba(100,116,139,0.15)" }]}>
        <Text style={[styles.logAvatarText, { color: item.matched ? color : "#64748b" }]}>
          {item.matched ? initials(item.name) : "?"}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.logInfo}>
        <Text style={styles.logName} numberOfLines={1}>
          {item.matched ? item.name : `Device ID: ${item.deviceUserId}`}
        </Text>
        <Text style={styles.logMeta} numberOfLines={1}>
          {item.matched
            ? `${item.studentId} · ${item.department?.split("(")[0]?.trim() || "—"}`
            : "Student not found — Please enroll"}
        </Text>
        {item.matched && item.section && (
          <Text style={styles.logSub}>Sem {item.semester} · Sec {item.section}</Text>
        )}
      </View>

      {/* Right side */}
      <View style={styles.logRight}>
        <View style={[styles.punchBadge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
          <Ionicons name={isIn ? "enter-outline" : "exit-outline"} size={11} color={color} />
          <Text style={[styles.punchBadgeText, { color }]}>
            {isIn ? "IN" : "OUT"}
          </Text>
        </View>
        <Text style={styles.logTime}>{fmtTime(item.punchTime)}</Text>
        <View style={[styles.modeBadge, { backgroundColor: item.verifyMode === "Face" ? "rgba(167,139,250,0.15)" : "rgba(245,158,11,0.12)" }]}>
          <Ionicons
            name={item.verifyMode === "Face" ? "scan-outline" : "finger-print-outline"}
            size={10}
            color={item.verifyMode === "Face" ? "#a78bfa" : "#f59e0b"}
          />
          <Text style={[styles.modeBadgeText, { color: item.verifyMode === "Face" ? "#a78bfa" : "#f59e0b" }]}>
            {item.verifyMode}
          </Text>
        </View>
        {!item.matched && (
          <Pressable style={styles.enrollBtn} onPress={() => onEnroll(item)}>
            <Text style={styles.enrollBtnText}>Enroll</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════
export default function BiometricGate() {
  const router = useRouter();

  const [logs,        setLogs]        = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [filter,      setFilter]      = useState("all"); // all | in | out | unmatched
  const [search,      setSearch]      = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Enroll modal
  const [enrollModal,  setEnrollModal]  = useState(false);
  const [enrollLog,    setEnrollLog]    = useState(null);
  const [enrollInput,  setEnrollInput]  = useState("");
  const [enrollLoading,setEnrollLoading]= useState(false);

  // Manual pull modal
  const [pullModal,   setPullModal]   = useState(false);
  const [deviceIp,    setDeviceIp]    = useState("192.168.1.100");
  const [pulling,     setPulling]     = useState(false);

  const intervalRef = useRef(null);

  // ── Fetch logs ──
  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const params = { limit: 100 };
      if (filter === "in")        params.punchType = "CheckIn";
      if (filter === "out")       params.punchType = "CheckOut";
      if (filter === "unmatched") params.matched   = false;

      const res = await API.get("/biometric/logs", { params });
      setLogs(res.data?.logs || []);
      setStats(res.data?.stats || null);
      setLastUpdated(new Date());
    } catch (e) {
      // Silent fail for auto-refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]));

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchLogs(), 10000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchLogs]);

  // ── Enroll ──
  const handleEnroll = async () => {
    if (!enrollInput.trim()) { Alert.alert("Error", "Enter Student ID"); return; }
    setEnrollLoading(true);
    try {
      const res = await API.post("/biometric/enroll", {
        deviceUserId: enrollLog.deviceUserId,
        studentId:    enrollInput.trim().toUpperCase(),
      });
      Alert.alert("✅ Done!", res.data.message);
      setEnrollModal(false);
      setEnrollInput("");
      fetchLogs();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Enrollment failed");
    } finally {
      setEnrollLoading(false);
    }
  };

  // ── Manual Pull ──
  const handlePull = async () => {
    if (!deviceIp.trim()) { Alert.alert("Error", "Device IP daalo"); return; }
    setPulling(true);
    try {
      const res = await API.post("/biometric/pull", { deviceIp: deviceIp.trim() });
      Alert.alert("✅ Done!", `${res.data.saved} new entries saved`);
      setPullModal(false);
      fetchLogs();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Pull failed");
    } finally {
      setPulling(false);
    }
  };

  // ── Filtered list ──
  const filtered = logs.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.studentId?.toLowerCase().includes(q) ||
      l.deviceUserId?.toLowerCase().includes(q) ||
      l.department?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070d1a" />

      {/* ── Header ── */}
      <LinearGradient colors={["#070d1a", "#0b1a30"]} style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/dashboard")} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Gate Attendance</Text>
          <Text style={styles.headerSub}>
            {autoRefresh ? `Live • Auto-refresh ON` : "Auto-refresh OFF"}
            {lastUpdated ? ` • ${fmtTime(lastUpdated)}` : ""}
          </Text>
        </View>
        <Pressable onPress={() => setAutoRefresh(p => !p)}
          style={[styles.headerBtn, { backgroundColor: autoRefresh ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)" }]}>
          <Ionicons name={autoRefresh ? "radio-button-on" : "radio-button-off"} size={18}
            color={autoRefresh ? "#34d399" : "#64748b"} />
        </Pressable>
        <Pressable onPress={() => setPullModal(true)} style={styles.headerBtn}>
          <Ionicons name="download-outline" size={20} color="#f59e0b" />
        </Pressable>
      </LinearGradient>

      {/* ── Stats Row ── */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}>
          <StatCard icon="people-outline"       label="Total Aaj"   value={stats.totalToday}    color="#00c6ff" />
          <StatCard icon="enter-outline"         label="Check Ins"   value={stats.checkInsToday} color="#34d399" />
          <StatCard icon="checkmark-circle"      label="Matched"     value={stats.matchedToday}  color="#a78bfa" />
          <StatCard icon="alert-circle-outline"  label="Unmatched"   value={stats.unmatched}     color="#f87171" />
        </ScrollView>
      )}

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color="#374151" />
          <TextInput style={styles.searchInput} placeholder="Name / Student ID search..."
            placeholderTextColor="#1f2937" value={search} onChangeText={setSearch} />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#374151" />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.refreshBtn} onPress={() => fetchLogs(true)}>
          <Ionicons name="refresh" size={18} color="#00c6ff" />
        </Pressable>
      </View>

      {/* ── Filter Chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {[
          { key: "all",       label: "All",       color: "#00c6ff" },
          { key: "in",        label: "Check In",  color: "#34d399" },
          { key: "out",       label: "Check Out", color: "#f87171" },
          { key: "unmatched", label: "Unmatched", color: "#f59e0b" },
        ].map(f => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)}
            style={[styles.chip,
              filter === f.key && { backgroundColor: f.color + "18", borderColor: f.color + "60" }]}>
            <Text style={[styles.chipText, filter === f.key && { color: f.color }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>{filtered.length} entries</Text>

      {/* ── Log List ── */}
      {loading
        ? <ActivityIndicator size="large" color="#00c6ff" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => item._id || String(i)}
            renderItem={({ item }) => (
              <LogRow item={item} onEnroll={(log) => { setEnrollLog(log); setEnrollModal(true); }} />
            )}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => fetchLogs(true)}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="scan-circle-outline" size={48} color="#1f2937" />
                <Text style={styles.emptyText}>No gate entries today</Text>
                <Text style={styles.emptySub}>Device se data aane par yahan dikhega</Text>
              </View>
            }
          />
        )
      }

      {/* ═══ ENROLL MODAL ═══ */}
      <Modal visible={enrollModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Enroll Student</Text>
            <View style={styles.modalInfo}>
              <Ionicons name="hardware-chip-outline" size={16} color="#f59e0b" />
              <Text style={styles.modalInfoText}>
                Device User ID: <Text style={{ color: "#f59e0b", fontWeight: "800" }}>
                  {enrollLog?.deviceUserId}
                </Text>
              </Text>
            </View>
            <Text style={styles.modalSub}>
              Link this device ID to your COLLAहUB student
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Student ID (e.g. STU2023001)"
              placeholderTextColor="#374151"
              value={enrollInput}
              onChangeText={setEnrollInput}
              autoCapitalize="characters"
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn}
                onPress={() => { setEnrollModal(false); setEnrollInput(""); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={handleEnroll} disabled={enrollLoading}>
                {enrollLoading
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.confirmBtnText}>Enroll</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ MANUAL PULL MODAL ═══ */}
      <Modal visible={pullModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Manual Pull from Device</Text>
            <Text style={styles.modalSub}>
              Enter the local IP address of the Essel device. The server and device must be on the same network.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Device IP (e.g. 192.168.1.100)"
              placeholderTextColor="#374151"
              value={deviceIp}
              onChangeText={setDeviceIp}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn} onPress={() => setPullModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor: "#f59e0b" }]}
                onPress={handlePull} disabled={pulling}>
                {pulling
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.confirmBtnText}>Pull Data</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#070d1a" },

  // Header
  header:         { flexDirection: "row", alignItems: "center", paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 10 },
  headerBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  headerTitle:    { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub:      { color: "#374151", fontSize: 11, marginTop: 1 },

  // Stats
  statsRow:       { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  statCard:       { borderRadius: 16, padding: 14, alignItems: "center", minWidth: 90, borderWidth: 1, gap: 6 },
  statIcon:       { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statVal:        { fontSize: 20, fontWeight: "900" },
  statLabel:      { color: "#374151", fontSize: 10, fontWeight: "600" },

  // Search
  searchRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  searchBox:      { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#0f1b2d", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  searchInput:    { flex: 1, color: "#fff", fontSize: 13 },
  refreshBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,198,255,0.08)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,198,255,0.2)" },

  // Filter chips
  filterRow:      { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" },
  chipText:       { color: "#374151", fontSize: 12, fontWeight: "600" },
  countText:      { color: "#1f2937", fontSize: 11, paddingHorizontal: 16, marginBottom: 6 },

  // Log rows
  logRow:         { flexDirection: "row", alignItems: "center", backgroundColor: "#0f1b2d", borderRadius: 14, marginBottom: 8, padding: 12, gap: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  logAvatar:      { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  logAvatarText:  { fontSize: 14, fontWeight: "800" },
  logInfo:        { flex: 1 },
  logName:        { color: "#fff", fontSize: 13, fontWeight: "700" },
  logMeta:        { color: "#64748b", fontSize: 11, marginTop: 2 },
  logSub:         { color: "#374151", fontSize: 10, marginTop: 1 },
  logRight:       { alignItems: "flex-end", gap: 4 },
  punchBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  punchBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  logTime:        { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  modeBadge:      { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  modeBadgeText:  { fontSize: 9, fontWeight: "700" },
  enrollBtn:      { backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.4)" },
  enrollBtnText:  { color: "#f59e0b", fontSize: 10, fontWeight: "700" },

  // Empty
  empty:          { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText:      { color: "#374151", fontSize: 15, fontWeight: "700" },
  emptySub:       { color: "#1f2937", fontSize: 12, textAlign: "center" },

  // Modal
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modal:          { backgroundColor: "#0f1b2d", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modalTitle:     { color: "#fff", fontSize: 17, fontWeight: "800", marginBottom: 12 },
  modalInfo:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.08)", padding: 12, borderRadius: 12, marginBottom: 10 },
  modalInfoText:  { color: "#94a3b8", fontSize: 13 },
  modalSub:       { color: "#374151", fontSize: 12, marginBottom: 16, lineHeight: 18 },
  modalInput:     { backgroundColor: "#070d1a", color: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 16 },
  modalBtns:      { flexDirection: "row", gap: 12 },
  cancelBtn:      { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelBtnText:  { color: "#64748b", fontWeight: "700" },
  confirmBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#00c6ff", alignItems: "center" },
  confirmBtnText: { color: "#000", fontWeight: "800", fontSize: 14 },
});