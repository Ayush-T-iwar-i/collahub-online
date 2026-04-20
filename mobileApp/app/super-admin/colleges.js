// ══════════════════════════════════════════════════════════════
// super-admin-colleges.js  →  app/super-admin/colleges.js
// ══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, Modal, Alert, StatusBar,
  ActivityIndicator, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

// ── Preset college types ──
const COLLEGE_TYPES = [
  "Engineering", "Medical", "Management", "Pharmacy",
  "Nursing", "Law", "Dental", "Arts & Science", "Other"
];

// ── Preset college names (suggestions) ──
const PRESETS = [
  "Nims Institute of Engineering and Technology",
  "Nims College of Management Studies",
  "Nims College of Nursing",
  "Nims College of Pharmacy",
  "Nims College of Law",
  "Nims College of Dental",
];

const EMPTY_FORM = {
  name: "", shortName: "", type: "Engineering",
  address: "", phone: "", email: "", website: "",
};

export default function ManageColleges() {
  const router = useRouter();

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add/Edit modal
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editOldName, setEditOldName] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Detail sheet
  const [detail, setDetail] = useState(null);

  // ── Load colleges ──
  const loadColleges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/super-admin/colleges");
      setColleges(res.data?.colleges || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadColleges(); }, [loadColleges]));

  // ── Add college ──
  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert("Required", "Enter college name"); return; }
    setSaving(true);
    try {
      await API.post("/super-admin/colleges", form);
      Alert.alert("✅ Done!", `"${form.name}" has been added!`);
      setModal(false);
      setForm(EMPTY_FORM);
      loadColleges();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  // ── Update college ──
  const handleUpdate = async () => {
    if (!form.name.trim()) { Alert.alert("Required", "Enter college name"); return; }
    setSaving(true);
    try {
      await API.put(`/super-admin/colleges/${encodeURIComponent(editOldName)}`, form);
      Alert.alert("✅ Done!", "College updated successfully!");
      setModal(false);
      setForm(EMPTY_FORM);
      setEditMode(false);
      setEditOldName("");
      loadColleges();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete college ──
  const handleDelete = (college) => {
    Alert.alert(
      "Delete College",
      `Are you sure you want to delete "${college.name}"?\n\nStudents: ${college.students}\nTeachers: ${college.teachers}\nAdmins: ${college.admins}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/super-admin/colleges/${encodeURIComponent(college.name)}`);
              Alert.alert("✅ Done!", "College deleted successfully!");
              setDetail(null);
              loadColleges();
            } catch (e) {
              Alert.alert("Error", e.response?.data?.message || "Failed to delete");
            }
          },
        },
      ]
    );
  };

  const openEdit = (college) => {
    setEditMode(true);
    setEditOldName(college.name);
    setForm({
      name: college.name || "",
      shortName: college.shortName || "",
      type: college.type || "Engineering",
      address: college.address || "",
      phone: college.phone || "",
      email: college.email || "",
      website: college.website || "",
    });
    setDetail(null);
    setModal(true);
  };

  const filtered = colleges.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── College Card ──
  const CollegeCard = ({ item }) => (
    <Pressable style={styles.card} onPress={() => setDetail(item)}>
      <LinearGradient colors={["rgba(0,198,255,0.08)", "rgba(0,198,255,0.02)"]}
        style={styles.cardGrad}>
        <View style={styles.cardLeft}>
          <View style={styles.cardIcon}>
            <Ionicons name="business" size={20} color="#00c6ff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
            {item.type && <Text style={styles.cardType}>{item.type}</Text>}
            <View style={styles.cardStats}>
              <View style={styles.statChip}>
                <Ionicons name="people" size={10} color="#34d399" />
                <Text style={[styles.statChipText, { color: "#34d399" }]}>{item.students} Students</Text>
              </View>
              <View style={[styles.statChip, { borderColor: "rgba(245,158,11,0.3)" }]}>
                <Ionicons name="person" size={10} color="#f59e0b" />
                <Text style={[styles.statChipText, { color: "#f59e0b" }]}>{item.teachers} Teachers</Text>
              </View>
              <View style={[styles.statChip, { borderColor: "rgba(167,139,250,0.3)" }]}>
                <Ionicons name="shield-checkmark" size={10} color="#a78bfa" />
                <Text style={[styles.statChipText, { color: "#a78bfa" }]}>{item.admins} Admins</Text>
              </View>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#374151" />
      </LinearGradient>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient colors={["#070d1a", "#0b1a30"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Colleges</Text>
          <Text style={styles.headerSub}>{colleges.length} colleges registered</Text>
        </View>
        <Pressable
          style={[styles.headerBtn, { backgroundColor: "rgba(0,198,255,0.12)", borderColor: "rgba(0,198,255,0.3)" }]}
          onPress={() => { setEditMode(false); setForm(EMPTY_FORM); setModal(true); }}>
          <Ionicons name="add" size={22} color="#00c6ff" />
        </Pressable>
      </LinearGradient>

      {/* ── Search ── */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={15} color="#374151" />
        <TextInput style={styles.searchInput} placeholder="Search for colleges..."
          placeholderTextColor="#1f2937" value={search} onChangeText={setSearch} />
        {search ? <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="#374151" /></Pressable> : null}
      </View>

      {/* ── Stats strip ── */}
      <View style={styles.statsStrip}>
        {[
          { label: "Total Colleges", value: colleges.length, color: "#00c6ff", icon: "business" },
          { label: "Total Students", value: colleges.reduce((a, c) => a + (c.students || 0), 0), color: "#34d399", icon: "people" },
          { label: "Total Teachers", value: colleges.reduce((a, c) => a + (c.teachers || 0), 0), color: "#f59e0b", icon: "person" },
        ].map((s, i) => (
          <View key={i} style={styles.statItem}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {loading
        ? <ActivityIndicator size="large" color="#00c6ff" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => <CollegeCard item={item} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={52} color="#1f2937" />
                <Text style={styles.emptyTitle}>No colleges found</Text>
                <Text style={styles.emptySub}>Add a new college using the + button</Text>
                <Pressable style={styles.addFirstBtn}
                  onPress={() => { setEditMode(false); setForm(EMPTY_FORM); setModal(true); }}>
                  <Text style={styles.addFirstBtnText}>+ Add First College</Text>
                </Pressable>
              </View>
            }
          />
        )
      }

      {/* ════════════════════════════════
          ADD / EDIT COLLEGE MODAL
      ════════════════════════════════ */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalBox} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editMode ? "Edit College" : "Add New College"}
            </Text>

            {/* Preset suggestions (only on add) */}
            {!editMode && (
              <>
                <Text style={styles.fieldLabel}>Quick Select (Preset)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                  {PRESETS.map((p, i) => (
                    <Pressable key={i} style={styles.presetChip}
                      onPress={() => setForm(f => ({ ...f, name: p }))}>
                      <Text style={styles.presetChipText} numberOfLines={1}>{p.split(" ").slice(0, 3).join(" ")}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* College Name */}
            <Text style={styles.fieldLabel}>College Name <Text style={{ color: "#f87171" }}>*</Text></Text>
            <TextInput style={styles.input}
              placeholder="e.g. Nims Institute of Engineering and Technology"
              placeholderTextColor="#374151"
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))} />

            {/* Short Name */}
            <Text style={styles.fieldLabel}>Short Name / Code</Text>
            <TextInput style={styles.input}
              placeholder="e.g. NIET"
              placeholderTextColor="#374151"
              value={form.shortName}
              onChangeText={v => setForm(f => ({ ...f, shortName: v }))} />

            {/* Type */}
            <Text style={styles.fieldLabel}>College Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
              {COLLEGE_TYPES.map(t => (
                <Pressable key={t}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}>
                  <Text style={[styles.typeChipText, form.type === t && { color: "#00c6ff" }]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Address */}
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput style={[styles.input, { height: 70 }]}
              placeholder="Enter college address"
              placeholderTextColor="#374151"
              multiline
              value={form.address}
              onChangeText={v => setForm(f => ({ ...f, address: v }))} />

            {/* Phone */}
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.input}
              placeholder="Contact number"
              placeholderTextColor="#374151"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={v => setForm(f => ({ ...f, phone: v }))} />

            {/* Email */}
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input}
              placeholder="College email"
              placeholderTextColor="#374151"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={v => setForm(f => ({ ...f, email: v }))} />

            {/* Website */}
            <Text style={styles.fieldLabel}>Website</Text>
            <TextInput style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#374151"
              autoCapitalize="none"
              value={form.website}
              onChangeText={v => setForm(f => ({ ...f, website: v }))} />

            {/* Buttons */}
            <View style={styles.modalBtns}>
              <Pressable style={styles.cancelBtn}
                onPress={() => { setModal(false); setEditMode(false); setForm(EMPTY_FORM); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, saving && { opacity: 0.7 }]}
                onPress={editMode ? handleUpdate : handleAdd}
                disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.confirmBtnText}>{editMode ? "Save Changes" : "Add College"}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ════════════════════════════════
          COLLEGE DETAIL BOTTOM SHEET
      ════════════════════════════════ */}
      <Modal visible={!!detail} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.detailBox}>
            <View style={styles.modalHandle} />

            <View style={styles.detailHeader}>
              <View style={styles.detailIcon}>
                <Ionicons name="business" size={24} color="#00c6ff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName} numberOfLines={2}>{detail?.name}</Text>
                {detail?.type && <Text style={styles.detailType}>{detail.type}</Text>}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.detailStats}>
              {[
                { label: "Students", value: detail?.students, color: "#34d399", icon: "people" },
                { label: "Teachers", value: detail?.teachers, color: "#f59e0b", icon: "person" },
                { label: "Admins", value: detail?.admins, color: "#a78bfa", icon: "shield-checkmark" },
                { label: "Total", value: detail?.total, color: "#00c6ff", icon: "stats-chart" },
              ].map((s, i) => (
                <View key={i} style={[styles.detailStat, { borderColor: s.color + "30" }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                  <Text style={[styles.detailStatVal, { color: s.color }]}>{s.value ?? 0}</Text>
                  <Text style={styles.detailStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.detailActions}>
              <Pressable style={styles.detailEditBtn} onPress={() => openEdit(detail)}>
                <Ionicons name="create-outline" size={16} color="#f59e0b" />
                <Text style={[styles.detailActionText, { color: "#f59e0b" }]}>Edit</Text>
              </Pressable>
              <Pressable style={styles.detailDeleteBtn} onPress={() => handleDelete(detail)}>
                <Ionicons name="trash-outline" size={16} color="#f87171" />
                <Text style={[styles.detailActionText, { color: "#f87171" }]}>Delete</Text>
              </Pressable>
            </View>

            <Pressable style={styles.closeBtn} onPress={() => setDetail(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070d1a" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 10 },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "#374151", fontSize: 11, marginTop: 1 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f1b2d", marginHorizontal: 16, marginVertical: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 13 },
  statsStrip: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#0f1b2d", marginHorizontal: 16, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  statItem: { alignItems: "center", gap: 4 },
  statVal: { fontSize: 18, fontWeight: "900" },
  statLabel: { color: "#374151", fontSize: 9, fontWeight: "600" },
  // Cards
  card: { borderRadius: 16, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,198,255,0.15)" },
  cardGrad: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  cardLeft: { flex: 1, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(0,198,255,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  cardName: { color: "#fff", fontSize: 13, fontWeight: "700", marginBottom: 3, flex: 1 },
  cardType: { color: "#64748b", fontSize: 11, marginBottom: 8 },
  cardStats: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "rgba(52,211,153,0.3)", backgroundColor: "rgba(52,211,153,0.08)" },
  statChipText: { fontSize: 9, fontWeight: "700" },
  // Empty
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 12 },
  addFirstBtn: { marginTop: 8, backgroundColor: "rgba(0,198,255,0.12)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,198,255,0.3)" },
  addFirstBtnText: { color: "#00c6ff", fontWeight: "700", fontSize: 13 },
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#0f1b2d", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginBottom: 16 },
  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "#070d1a", color: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 14 },
  presetChip: { backgroundColor: "rgba(0,198,255,0.08)", borderWidth: 1, borderColor: "rgba(0,198,255,0.25)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  presetChipText: { color: "#00c6ff", fontSize: 11, fontWeight: "600", maxWidth: 120 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" },
  typeChipActive: { borderColor: "rgba(0,198,255,0.5)", backgroundColor: "rgba(0,198,255,0.1)" },
  typeChipText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontWeight: "700" },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#00c6ff", alignItems: "center" },
  confirmBtnText: { color: "#000", fontWeight: "800", fontSize: 14 },
  // Detail sheet
  detailBox: { backgroundColor: "#0f1b2d", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 20 },
  detailIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: "rgba(0,198,255,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,198,255,0.3)" },
  detailName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  detailType: { color: "#64748b", fontSize: 12, marginTop: 3 },
  detailStats: { flexDirection: "row", gap: 10, marginBottom: 20 },
  detailStat: { flex: 1, alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, paddingVertical: 12, borderWidth: 1 },
  detailStatVal: { fontSize: 20, fontWeight: "900" },
  detailStatLabel: { color: "#374151", fontSize: 9, fontWeight: "600" },
  detailActions: { flexDirection: "row", gap: 12, marginBottom: 14 },
  detailEditBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  detailDeleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: "rgba(248,113,113,0.08)", borderWidth: 1, borderColor: "rgba(248,113,113,0.3)" },
  detailActionText: { fontWeight: "700", fontSize: 13 },
  closeBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(234, 58, 58, 0.69)", alignItems: "center" },
  closeBtnText: { color: "#fdfeff", fontWeight: "700" },
});
