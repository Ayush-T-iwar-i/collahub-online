import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  TextInput, Modal, ScrollView, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");

const DEPT_COLORS = {
  "CSE":   "#00c6ff",
  "ECE":   "#a78bfa",
  "ME":    "#f59e0b",
  "CE":    "#34d399",
  "IT":    "#f87171",
  "EEE":  "#60a5fa",
};

const getColor = (dept = "") => {
  const key = Object.keys(DEPT_COLORS).find((k) =>
    dept.toUpperCase().includes(k)
  );
  return DEPT_COLORS[key] || "#64748b";
};

// ── Student Card ──
const StudentCard = ({ item, onPress }) => {
  const color = getColor(item.department);
  const initials = item.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "S";

  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />

      <View style={[styles.avatar, { backgroundColor: color + "20" }]}>
        {item.profileImage
          ? <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
          : <Text style={[styles.avatarText, { color }]}>{initials}</Text>
        }
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardId}>{item.studentId || item.rollNo || "—"}</Text>
        <View style={styles.cardMeta}>
          {item.department && (
            <View style={[styles.deptBadge, { backgroundColor: color + "18" }]}>
              <Text style={[styles.deptBadgeText, { color }]} numberOfLines={1}>
                {item.department.split("(")[0].trim()}
              </Text>
            </View>
          )}
          {item.semester && (
            <View style={styles.semBadge}>
              <Text style={styles.semBadgeText}>Sem {item.semester}</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#374151" />
    </Pressable>
  );
};

// ── Detail Modal ──
const DetailModal = ({ student, visible, onClose }) => {
  if (!student) return null;
  const color = getColor(student.department);
  const initials = student.name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "S";

  const InfoRow = ({ icon, label, value, iconColor }) => (
    <View style={styles.modalInfoRow}>
      <View style={[styles.modalInfoIcon, { backgroundColor: (iconColor || color) + "18" }]}>
        <Ionicons name={icon} size={16} color={iconColor || color} />
      </View>
      <View style={styles.modalInfoContent}>
        <Text style={styles.modalInfoLabel}>{label}</Text>
        <Text style={styles.modalInfoValue}>{value || "—"}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHandle} />

          {/* Modal Header */}
          <LinearGradient colors={[color + "22", color + "08"]} style={styles.modalHero}>
            <View style={[styles.modalAvatar, { backgroundColor: color + "25", borderColor: color + "50" }]}>
              {student.profileImage
                ? <Image source={{ uri: student.profileImage }} style={styles.modalAvatarImg} />
                : <Text style={[styles.modalAvatarText, { color }]}>{initials}</Text>
              }
            </View>
            <Text style={styles.modalName}>{student.name}</Text>
            <Text style={styles.modalStudentId}>{student.studentId || student.rollNo || "—"}</Text>
            <View style={styles.modalBadges}>
              {student.department && (
                <View style={[styles.modalBadge, { backgroundColor: color + "20", borderColor: color + "35" }]}>
                  <Text style={[styles.modalBadgeText, { color }]} numberOfLines={1}>
                    {student.department.split("(")[0].trim()}
                  </Text>
                </View>
              )}
              {student.semester && (
                <View style={[styles.modalBadge, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }]}>
                  <Text style={[styles.modalBadgeText, { color: "#94a3b8" }]}>Sem {student.semester}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Info */}
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalInfoCard}>
              <InfoRow icon="mail-outline"     label="Email"          value={student.email}          iconColor="#00c6ff" />
              <InfoRow icon="call-outline"     label="Phone"          value={student.phone}          iconColor="#34d399" />
              <InfoRow icon="business-outline" label="College"        value={student.college}        iconColor="#a78bfa" />
              <InfoRow icon="calendar-outline" label="Admission Year" value={student.admissionYear}  iconColor="#f59e0b" />
              <InfoRow icon="male-female-outline" label="Gender"      value={student.gender}         iconColor="#f472b6" />
            </View>
          </ScrollView>

          <Pressable style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function Students() {
  const navigation = useNavigation();
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedSem, setSelectedSem] = useState("All");
  const [departments, setDepartments] = useState(["All"]);
  const [semesters, setSemesters] = useState(["All"]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(useCallback(() => { loadStudents(); }, []));

  const loadStudents = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await API.get("/students/all");
      const data = res.data?.students || res.data || [];
      setStudents(data);
      setFiltered(data);

      // Extract unique depts & sems
      const depts = ["All", ...new Set(data.map((s) => s.department?.split("(")[0]?.trim()).filter(Boolean))];
      const sems  = ["All", ...new Set(data.map((s) => s.semester).filter(Boolean)).values()].sort();
      setDepartments(depts);
      setSemesters(sems);

    } catch (e) {
      console.log("Students load error:", e.message);
      setStudents([]);
      setFiltered([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (searchText, dept, sem) => {
    let result = students;

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }

    if (dept !== "All") {
      result = result.filter((s) =>
        s.department?.toLowerCase().includes(dept.toLowerCase())
      );
    }

    if (sem !== "All") {
      result = result.filter((s) => String(s.semester) === String(sem));
    }

    setFiltered(result);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(text, selectedDept, selectedSem);
  };

  const handleDeptFilter = (dept) => {
    setSelectedDept(dept);
    applyFilters(search, dept, selectedSem);
  };

  const handleSemFilter = (sem) => {
    setSelectedSem(sem);
    applyFilters(search, selectedDept, sem);
  };

  const openStudent = (student) => {
    setSelectedStudent(student);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00c6ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      {/* Header */}
      <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Students</Text>
          <Text style={styles.headerSub}>{filtered.length} of {students.length} students</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search by name, ID or email..."
          placeholderTextColor="#374151"
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={18} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* Dept Filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterScroll} contentContainerStyle={styles.filterRow}
      >
        {departments.map((dept) => {
          const isActive = selectedDept === dept;
          const color = dept === "All" ? "#00c6ff" : getColor(dept);
          return (
            <Pressable
              key={dept}
              onPress={() => handleDeptFilter(dept)}
              style={[styles.filterChip, isActive && { backgroundColor: color + "22", borderColor: color + "55" }]}
            >
              <Text style={[styles.filterChipText, isActive && { color }]}>{dept}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Semester Filter */}
      {semesters.length > 2 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.semFilterScroll} contentContainerStyle={styles.filterRow}
        >
          {semesters.map((sem) => {
            const isActive = selectedSem === sem;
            return (
              <Pressable
                key={sem}
                onPress={() => handleSemFilter(sem)}
                style={[styles.semChip, isActive && styles.semChipActive]}
              >
                <Text style={[styles.semChipText, isActive && styles.semChipTextActive]}>
                  {sem === "All" ? "All Sem" : `Sem ${sem}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id || item.studentId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadStudents(true)} tintColor="#00c6ff" />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={40} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>
              {search || selectedDept !== "All" || selectedSem !== "All"
                ? "No students match filters"
                : "No Students Found"}
            </Text>
            <Text style={styles.emptyText}>
              {search ? "Try a different search term" : "Students will appear here"}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <StudentCard item={item} onPress={openStudent} />
        )}
      />

      {/* Detail Modal */}
      <DetailModal
        student={selectedStudent}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#080d17" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },

  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1a2535", marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },

  filterScroll: { marginTop: 12 },
  semFilterScroll: { marginTop: 6 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 2 },

  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: "#1a2535",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  filterChipText: { color: "#64748b", fontSize: 12, fontWeight: "600" },

  semChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 16, backgroundColor: "#1a2535",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  semChipActive: { backgroundColor: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.3)" },
  semChipText: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  semChipTextActive: { color: "#a78bfa" },

  list: { padding: 16, paddingTop: 10, paddingBottom: 30 },

  // Card
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1a2535", borderRadius: 16,
    marginBottom: 8, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
  },
  cardAccent: { width: 3, alignSelf: "stretch" },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: "center", alignItems: "center",
    margin: 12,
  },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  avatarText: { fontSize: 17, fontWeight: "800" },
  cardBody: { flex: 1, paddingVertical: 12, paddingRight: 4 },
  cardName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardId: { color: "#64748b", fontSize: 11, marginTop: 2 },
  cardMeta: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  deptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  deptBadgeText: { fontSize: 10, fontWeight: "700" },
  semBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  semBadgeText: { color: "#64748b", fontSize: 10, fontWeight: "600" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: height * 0.85,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  modalHero: { alignItems: "center", padding: 24, borderRadius: 20 },
  modalAvatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2.5, marginBottom: 12,
  },
  modalAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  modalAvatarText: { fontSize: 28, fontWeight: "800" },
  modalName: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalStudentId: { color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 12 },
  modalBadges: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  modalBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  modalBadgeText: { fontSize: 12, fontWeight: "600" },
  modalScroll: { maxHeight: height * 0.35 },
  modalInfoCard: { margin: 16, backgroundColor: "#1a2535", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  modalInfoRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  modalInfoIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  modalInfoContent: { flex: 1 },
  modalInfoLabel: { color: "#374151", fontSize: 10, fontWeight: "600", marginBottom: 2 },
  modalInfoValue: { color: "#e2e8f0", fontSize: 14, fontWeight: "600" },
  modalClose: { margin: 16, marginTop: 4, padding: 16, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, alignItems: "center" },
  modalCloseText: { color: "#94a3b8", fontSize: 15, fontWeight: "700" },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#1f2937", fontSize: 13, textAlign: "center" },
});