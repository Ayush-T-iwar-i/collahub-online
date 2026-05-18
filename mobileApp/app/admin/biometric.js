import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const fmtTime = (iso) => {
  if (!iso) return "-";

  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const StatCard = ({ icon, label, value, color }) => (
  <LinearGradient
    colors={[color + "18", color + "08"]}
    style={[styles.statCard, { borderColor: color + "30" }]}
  >
    <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>

    <Text style={[styles.statVal, { color }]}>{value ?? 0}</Text>

    <Text style={styles.statLabel}>{label}</Text>
  </LinearGradient>
);

const LogRow = ({ item, onEnroll }) => {
  const isIn = item.punchType === "CheckIn";

  const color = isIn ? "#34d399" : "#f87171";

  return (
    <View style={styles.logRow}>
      {/* Avatar */}
      <View
        style={[
          styles.logAvatar,
          {
            backgroundColor: item.matched
              ? color + "18"
              : "rgba(100,116,139,0.15)",
          },
        ]}
      >
        <Text
          style={[
            styles.logAvatarText,
            {
              color: item.matched ? color : "#64748b",
            },
          ]}
        >
          {item.matched ? initials(item.name) : "?"}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.logInfo}>
        <Text style={styles.logName} numberOfLines={1}>
          {item.matched
            ? item.name
            : `Device ID: ${item.deviceUserId}`}
        </Text>

        <Text style={styles.logMeta} numberOfLines={1}>
          {item.matched
            ? `${item.studentId} • ${
                item.department?.split("(")[0]?.trim() || "-"
              }`
            : "Student not found - Please enroll"}
        </Text>

        {item.matched && item.section && (
          <Text style={styles.logSub}>
            Sem {item.semester} • Sec {item.section}
          </Text>
        )}
      </View>

      {/* Right */}
      <View style={styles.logRight}>
        <View
          style={[
            styles.punchBadge,
            {
              backgroundColor: color + "18",
              borderColor: color + "40",
            },
          ]}
        >
          <Ionicons
            name={isIn ? "enter-outline" : "exit-outline"}
            size={11}
            color={color}
          />

          <Text style={[styles.punchBadgeText, { color }]}>
            {isIn ? "IN" : "OUT"}
          </Text>
        </View>

        <Text style={styles.logTime}>
          {fmtTime(item.punchTime)}
        </Text>

        <View
          style={[
            styles.modeBadge,
            {
              backgroundColor:
                item.verifyMode === "Face"
                  ? "rgba(167,139,250,0.15)"
                  : "rgba(245,158,11,0.12)",
            },
          ]}
        >
          <Ionicons
            name={
              item.verifyMode === "Face"
                ? "scan-outline"
                : "finger-print-outline"
            }
            size={10}
            color={
              item.verifyMode === "Face"
                ? "#a78bfa"
                : "#f59e0b"
            }
          />

          <Text
            style={[
              styles.modeBadgeText,
              {
                color:
                  item.verifyMode === "Face"
                    ? "#a78bfa"
                    : "#f59e0b",
              },
            ]}
          >
            {item.verifyMode}
          </Text>
        </View>

        {!item.matched && (
          <Pressable
            style={styles.enrollBtn}
            onPress={() => onEnroll(item)}
          >
            <Text style={styles.enrollBtnText}>Enroll</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default function BiometricGate() {
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [autoRefresh, setAutoRefresh] = useState(true);

  const [lastUpdated, setLastUpdated] = useState(null);

  const [enrollModal, setEnrollModal] = useState(false);
  const [enrollLog, setEnrollLog] = useState(null);
  const [enrollInput, setEnrollInput] = useState("");

  const intervalRef = useRef(null);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      const params = { limit: 100 };

      if (filter === "in") params.punchType = "CheckIn";
      if (filter === "out") params.punchType = "CheckOut";
      if (filter === "unmatched") params.matched = false;

      const res = await API.get("/biometric/logs", { params });

      setLogs(res.data?.logs || []);
      setStats(res.data?.stats || null);

      setLastUpdated(new Date());
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchLogs();
      }, 10000);
    }

    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchLogs]);

  const filtered = logs.filter((l) => {
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
      <StatusBar
        barStyle="light-content"
        backgroundColor="#070d1a"
      />

      {/* HEADER */}
      <LinearGradient
        colors={["#070d1a", "#0b1a30"]}
        style={styles.header}
      >
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/admin/dashboard")
          }
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Gate Attendance
          </Text>

          <Text style={styles.headerSub}>
            {autoRefresh
              ? "Live • Auto-refresh ON"
              : "Auto-refresh OFF"}

            {lastUpdated
              ? ` • ${fmtTime(lastUpdated)}`
              : ""}
          </Text>
        </View>

        <Pressable
          onPress={() => setAutoRefresh((p) => !p)}
          style={[
            styles.headerBtn,
            {
              backgroundColor: autoRefresh
                ? "rgba(52,211,153,0.15)"
                : "rgba(255,255,255,0.06)",
            },
          ]}
        >
          <Ionicons
            name={
              autoRefresh
                ? "radio-button-on"
                : "radio-button-off"
            }
            size={18}
            color={autoRefresh ? "#34d399" : "#64748b"}
          />
        </Pressable>
      </LinearGradient>

      {/* STATS */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={styles.statsRow}
        >
          <StatCard
            icon="people-outline"
            label="Today"
            value={stats.totalToday}
            color="#00c6ff"
          />

          <StatCard
            icon="enter-outline"
            label="Check In"
            value={stats.checkInsToday}
            color="#34d399"
          />

          <StatCard
            icon="checkmark-circle"
            label="Matched"
            value={stats.matchedToday}
            color="#a78bfa"
          />

          <StatCard
            icon="alert-circle-outline"
            label="Unmatched"
            value={stats.unmatched}
            color="#f87171"
          />
        </ScrollView>
      )}

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#64748b" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search student..."
            placeholderTextColor="#475569"
            value={search}
            onChangeText={setSearch}
          />

          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color="#64748b"
              />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={styles.refreshBtn}
          onPress={() => fetchLogs(true)}
        >
          <Ionicons
            name="refresh"
            size={18}
            color="#00c6ff"
          />
        </Pressable>
      </View>

      {/* FILTERS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {[
          {
            key: "all",
            label: "All",
            color: "#00c6ff",
          },
          {
            key: "in",
            label: "Check In",
            color: "#34d399",
          },
          {
            key: "out",
            label: "Check Out",
            color: "#f87171",
          },
          {
            key: "unmatched",
            label: "Unmatched",
            color: "#f59e0b",
          },
        ].map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.chip,
              filter === f.key && {
                backgroundColor: f.color + "18",
                borderColor: f.color + "60",
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                filter === f.key && {
                  color: f.color,
                },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* COUNT */}
      <Text style={styles.countText}>
        {filtered.length} entries
      </Text>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#00c6ff"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) =>
            item._id || String(i)
          }
          renderItem={({ item }) => (
            <LogRow
              item={item}
              onEnroll={(log) => {
                setEnrollLog(log);
                setEnrollModal(true);
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 120,
            flexGrow: 1,
          }}
          refreshing={refreshing}
          onRefresh={() => fetchLogs(true)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="scan-circle-outline"
                size={48}
                color="#1f2937"
              />

              <Text style={styles.emptyText}>
                No entries found
              </Text>

              <Text style={styles.emptySub}>
                Device data will appear here
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL */}
      <Modal
        visible={enrollModal}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === "ios" ? "padding" : undefined
          }
        >
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                Enroll Student
              </Text>

              <Text style={styles.modalSub}>
                Device User ID:
              </Text>

              <Text style={styles.modalDevice}>
                {enrollLog?.deviceUserId}
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter Student ID"
                placeholderTextColor="#475569"
                value={enrollInput}
                onChangeText={setEnrollInput}
              />

              <View style={styles.modalBtns}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setEnrollModal(false);
                    setEnrollInput("");
                  }}
                >
                  <Text style={styles.cancelBtnText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.confirmBtn}
                >
                  <Text style={styles.confirmBtnText}>
                    Enroll
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070d1a",
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 10,
  },

  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  headerSub: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },

  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    flexGrow: 0,
  },

  statCard: {
    width: 110,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    gap: 6,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  statVal: {
    fontSize: 20,
    fontWeight: "900",
  },

  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },

  searchBox: {
    flex: 1,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1b2d",
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
  },

  refreshBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(0,198,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },

  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  chipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },

  countText: {
    color: "#475569",
    fontSize: 11,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  logRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1b2d",
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  logAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  logAvatarText: {
    fontSize: 14,
    fontWeight: "800",
  },

  logInfo: {
    flex: 1,
    minWidth: 0,
  },

  logName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  logMeta: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },

  logSub: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 2,
  },

  logRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
  },

  punchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },

  punchBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  logTime: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },

  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },

  modeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },

  enrollBtn: {
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  enrollBtnText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "700",
  },

  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },

  emptyText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "700",
  },

  emptySub: {
    color: "#334155",
    fontSize: 12,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#0f1b2d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  modalSub: {
    color: "#94a3b8",
    marginBottom: 6,
  },

  modalDevice: {
    color: "#f59e0b",
    fontWeight: "800",
    marginBottom: 18,
  },

  modalInput: {
    backgroundColor: "#070d1a",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },

  modalBtns: {
    flexDirection: "row",
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },

  cancelBtnText: {
    color: "#94a3b8",
    fontWeight: "700",
  },

  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#00c6ff",
    alignItems: "center",
  },

  confirmBtnText: {
    color: "#000",
    fontWeight: "800",
  },
});