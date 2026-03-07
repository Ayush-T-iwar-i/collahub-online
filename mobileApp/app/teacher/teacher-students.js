import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  TextInput, Modal, ScrollView, Dimensions, Image, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";
import API from "../../services/api";
import { COLLEGE_DEPARTMENTS } from "../../constants/colleges";

const { width, height } = Dimensions.get("window");

const COLLEGES = Object.keys(COLLEGE_DEPARTMENTS);
const SEMESTERS = ["All", "1", "2", "3", "4", "5", "6", "7", "8"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => (CURRENT_YEAR - i).toString());

const DEPT_COLORS = {
  "CSE": "#00c6ff", "ECE": "#a78bfa", "ME": "#f59e0b",
  "CE": "#34d399", "IT": "#f87171", "EE": "#60a5fa",
  "AI": "#fb923c", "DATA": "#34d399", "BDS": "#f472b6",
  "MDS": "#f472b6", "LLB": "#818cf8", "BBA": "#4ade80",
};
const getColor = (dept = "") => {
  const key = Object.keys(DEPT_COLORS).find(k => dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#64748b";
};

// ── Picker Modal (used for department selection) ──
const PickerModal = ({ visible, title, options, selected, onSelect, onClose, accent = "#f59e0b" }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.pickerOverlay} onPress={onClose}>
      <View style={styles.pickerSheet}>
        <View style={styles.handle} />
        <Text style={styles.pickerTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((opt, idx) => (
            <Pressable key={idx}
              style={[styles.pickerOption, selected === opt && { backgroundColor: accent + "18", borderWidth: 1, borderColor: accent + "35" }]}
              onPress={() => { onSelect(opt); onClose(); }}>
              <Text style={[styles.pickerOptionText, selected === opt && { color: accent }]} numberOfLines={2}>{opt}</Text>
              {selected === opt && <Ionicons name="checkmark-circle" size={16} color={accent} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

// ── Student Card (improved visuals) ──
const StudentCard = ({ item, onPress }) => {
  const color = getColor(item.department);
  const initials = item.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "S";
  const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";
  return (
    <Pressable style={styles.card} onPress={() => onPress(item)}>
      <View style={[styles.cardLeft, { backgroundColor: color + "12" }]}>
        {item.profileImage
          ? <Image source={{ uri: item.profileImage }} style={styles.avatarImg} />
          : <View style={[styles.avatarCircle, { backgroundColor: color + "22" }]}>
            <Text style={[styles.avatarText, { color }]}>{initials}</Text>
          </View>
        }
      </View>
      <View style={styles.cardBody}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardCollege} numberOfLines={1}>{item.college || "— College not set"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.cardId}>{item.studentId || "—"}</Text>
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              {item.email ? <Ionicons name="mail-outline" size={16} color="#94a3b8" style={{ marginRight: 8 }} /> : null}
              {item.phone ? <Ionicons name="call-outline" size={16} color="#94a3b8" /> : null}
            </View>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {deptShort ? <View style={[styles.deptBadge, { backgroundColor: color + "20" }]}><Text style={[styles.deptBadgeText, { color }]}>{deptShort}</Text></View> : null}
          {item.semester ? <View style={styles.semBadge}><Text style={styles.semBadgeText}>Sem {item.semester}</Text></View> : null}
          {item.admissionYear ? <View style={styles.yearBadge}><Text style={styles.yearBadgeText}>{item.admissionYear}</Text></View> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#475569" style={{ paddingRight: 14 }} />
    </Pressable>
  );
};

// ── Detail Modal (cleaner layout) ──
const DetailModal = ({ student, visible, onClose }) => {
  if (!student) return null;
  const color = getColor(student.department);
  const initials = student.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "S";
  const InfoRow = ({ icon, label, value, accent }) => (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: (accent || color) + "18" }]}>
        <Ionicons name={icon} size={15} color={accent || color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{value || "—"}</Text>
      </View>
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.handle} />
          <LinearGradient colors={[color + "25", "transparent"]} style={styles.detailHero}>
            <View style={[styles.detailAvatar, { borderColor: color + "60" }]}>
              {student.profileImage
                ? <Image source={{ uri: student.profileImage }} style={styles.detailAvatarImg} />
                : <Text style={[styles.detailAvatarText, { color }]}>{initials}</Text>
              }
            </View>
            <Text style={styles.detailName}>{student.name}</Text>
            <Text style={styles.detailStudentId}>{student.studentId || "—"}</Text>
            <View style={styles.detailBadgesRow}>
              {student.department && (
                <View style={[styles.detailBadge, { backgroundColor: color + "22", borderColor: color + "40" }]}>
                  <Text style={[styles.detailBadgeText, { color }]} numberOfLines={1}>
                    {student.department.match(/\(([^)]+)\)/)?.[1] || student.department.split(" ")[0]}
                  </Text>
                </View>
              )}
              {student.semester && (
                <View style={[styles.detailBadge, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }]}>
                  <Text style={[styles.detailBadgeText, { color: "#94a3b8" }]}>Sem {student.semester}</Text>
                </View>
              )}
              {student.admissionYear && (
                <View style={[styles.detailBadge, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)" }]}>
                  <Text style={[styles.detailBadgeText, { color: "#f59e0b" }]}>{student.admissionYear}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          <ScrollView style={{ maxHeight: height * 0.36 }} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              <InfoRow icon="mail-outline" label="Email" value={student.email} accent="#00c6ff" />
              <InfoRow icon="call-outline" label="Phone" value={student.phone} accent="#34d399" />
              <InfoRow icon="business-outline" label="College" value={student.college} accent="#a78bfa" />
              <InfoRow icon="calendar-outline" label="Admission Year" value={student.admissionYear} accent="#f59e0b" />
              <InfoRow icon="male-female-outline" label="Gender" value={student.gender} accent="#f472b6" />
            </View>
          </ScrollView>
          <Pressable style={styles.detailCloseBtn} onPress={onClose}>
            <Text style={styles.detailCloseTxt}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ══════════════════════════════════════════
export default function TeacherStudents() {
  const navigation = useNavigation();
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selDept, setSelDept] = useState("All");
  const [selSem, setSelSem] = useState("All");
  const [deptList, setDeptList] = useState(["All"]);
  const [semList, setSemList] = useState(["All"]);
  const [selStudent, setSelStudent] = useState(null);
  const [detailVis, setDetailVis] = useState(false);

  // Picker for departments (full list)
  const [deptPickerVis, setDeptPickerVis] = useState(false);
  const [deptPickerOptions, setDeptPickerOptions] = useState([]);

  useFocusEffect(useCallback(() => { loadStudents(); }, []));

  const loadStudents = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/students/all");
      const data = res.data?.students || res.data || [];
      setStudents(data); setFiltered(data);

      // build dept list from students and structured colleges
      const studentDepts = Array.from(new Set(data.map(s => s.department?.trim()).filter(Boolean)));
      const combined = ["All", ...studentDepts];
      setDeptList(combined);

      // semesters from students
      const sems = ["All", ...new Set(data.map(s => String(s.semester)).filter(Boolean))].sort((a, b) => a === "All" ? -1 : Number(a) - Number(b));
      setSemList(sems);
    } catch (e) {
      console.log("Load students error:", e.message);
      setStudents([]); setFiltered([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const applyFilters = (q, dept, sem, list = students) => {
    let r = list;
    if (q?.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(s => (s.name || "").toLowerCase().includes(lq) ||
        (s.studentId || "").toLowerCase().includes(lq) ||
        (s.email || "").toLowerCase().includes(lq));
    }
    if (dept && dept !== "All") r = r.filter(s => (s.department || "").toLowerCase().includes(dept.toLowerCase()));
    if (sem && sem !== "All") r = r.filter(s => String(s.semester) === String(sem));
    setFiltered(r);
  };

  const openDeptPicker = () => {
    // Build options grouped by college + unique students' depts not in constant
    const known = Object.values(COLLEGE_DEPARTMENTS).flat();
    const studentOnly = Array.from(new Set(students.map(s => s.department).filter(d => d && !known.includes(d))));
    const options = ["All", ...known, ...studentOnly];
    setDeptPickerOptions(options);
    setDeptPickerVis(true);
  };

  const selectDeptFromPicker = (val) => {
    setSelDept(val || "All");
    applyFilters(search, val || "All", selSem);
  };

  // Search text change
  const onSearchChange = (t) => {
    setSearch(t);
    applyFilters(t, selDept, selSem);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Students</Text>
          <Text style={styles.headerSub}>{filtered.length} students</Text>
        </View>

        <Pressable style={styles.filterBtn} onPress={openDeptPicker}>
          <Ionicons name="funnel-outline" size={18} color="#fff" />
        </Pressable>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Search name, ID, email..."
          placeholderTextColor="#374151" value={search}
          onChangeText={onSearchChange} />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(""); applyFilters("", selDept, selSem); }}>
            <Ionicons name="close-circle" size={16} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* Dept Chips (horizontal) */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {deptList.map(d => {
            const act = selDept === d;
            const color = d === "All" ? "#f59e0b" : getColor(d);
            return (
              <Pressable key={d} style={[styles.chip, act && { backgroundColor: color + "20", borderColor: color + "44" }]}
                onPress={() => { setSelDept(d); applyFilters(search, d, selSem); }}>
                <Text style={[styles.chipText, act && { color }]} numberOfLines={1}>
                  {d === "All" ? "All Departments" : (d.split("(")[0].trim())}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Sem Chips */}
      {semList.length > 1 && (
        <View style={styles.chipsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {semList.map(s => {
              const act = selSem === s;
              return (
                <Pressable key={s} style={[styles.chip, act && styles.chipSemActive]}
                  onPress={() => { setSelSem(s); applyFilters(search, selDept, s); }}>
                  <Text style={[styles.chipText, act && { color: "#a78bfa" }]}>{s === "All" ? "All Sem" : `Sem ${s}`}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Students list */}
      {loading
        ? <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff" /></View>
        : (
          <FlatList
            data={filtered}
            keyExtractor={i => i._id || i.studentId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStudents(true)} tintColor="#00c6ff" />}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}><Ionicons name="people-outline" size={36} color="#374151" /></View>
                <Text style={styles.emptyTitle}>No Students Found</Text>
                <Text style={styles.emptySub}>Try changing filters or pull to refresh</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <StudentCard item={item} onPress={(s) => { setSelStudent(s); setDetailVis(true); }} />
            )}
          />
        )
      }

      {/* Detail Modal */}
      <DetailModal student={selStudent} visible={detailVis} onClose={() => setDetailVis(false)} />

      {/* Dept Picker Modal */}
      <PickerModal
        visible={deptPickerVis}
        title="Select Department"
        options={deptPickerOptions}
        selected={selDept}
        onSelect={selectDeptFromPicker}
        onClose={() => setDeptPickerVis(false)}
        accent="#a78bfa"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 60 },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", justifyContent: "center", alignItems: "center" },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0f1720", marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },

  // Chips
  chipsRow: { height: 48, marginTop: 10, justifyContent: "center" },
  chipsContent: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#0f1720", borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", justifyContent: "center", alignItems: "center" },
  chipSemActive: { backgroundColor: "rgba(167,139,250,0.14)", borderColor: "rgba(167,139,250,0.3)" },
  chipText: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },

  list: { padding: 16, paddingTop: 10, paddingBottom: 30 },

  // Student Card
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f1724", borderRadius: 14, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  cardLeft: { width: 78, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 18, fontWeight: "800" },
  cardBody: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  cardName: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  cardCollege: { color: "#94a3b8", fontSize: 12 },
  cardId: { color: "#94a3b8", fontSize: 12 },
  cardMeta: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  deptBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  deptBadgeText: { fontSize: 12, fontWeight: "800" },
  semBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(167,139,250,0.12)" },
  semBadgeText: { color: "#a78bfa", fontSize: 11, fontWeight: "700" },
  yearBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(245,158,11,0.10)" },
  yearBadgeText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },

  // Empty
  empty: { alignItems: "center", paddingTop: 50, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#0f1724", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#94a3b8", fontSize: 15, fontWeight: "700" },
  emptySub: { color: "#64748b", fontSize: 12 },

  // Detail Modal
  detailOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  detailSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.82, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  detailHero: { alignItems: "center", padding: 20, paddingBottom: 16 },
  detailAvatar: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center", borderWidth: 2.5, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.03)" },
  detailAvatarImg: { width: 88, height: 88, borderRadius: 44 },
  detailAvatarText: { fontSize: 30, fontWeight: "800" },
  detailName: { color: "#fff", fontSize: 20, fontWeight: "900" },
  detailStudentId: { color: "#94a3b8", fontSize: 12, marginTop: 4, marginBottom: 8 },
  detailBadgesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  detailBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, borderWidth: 1 },
  detailBadgeText: { fontSize: 12, fontWeight: "700" },
  infoCard: { margin: 14, backgroundColor: "#0b1220", borderRadius: 12, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.02)" },
  infoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  infoLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "600", marginBottom: 2 },
  infoValue: { color: "#e2e8f0", fontSize: 14, fontWeight: "700" },
  detailCloseBtn: { margin: 14, marginTop: 6, padding: 14, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, alignItems: "center" },
  detailCloseTxt: { color: "#94a3b8", fontSize: 14, fontWeight: "700" },

  // Picker
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  pickerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.02)" },
  pickerOptionText: { color: "#94a3b8", fontSize: 13, flex: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 0, marginBottom: 10 },
});