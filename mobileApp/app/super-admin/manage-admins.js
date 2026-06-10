import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, TextInput, ScrollView,
  Alert, Modal, StatusBar, Dimensions, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");

// ── Time formatter ────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "—";
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
};

// ── Initials avatar color ─────────────────────────────────────
const AVATAR_COLORS = ["#00c6ff","#a78bfa","#34d399","#f59e0b","#f87171","#ec4899","#60a5fa"];
const avatarColor   = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] || "#00c6ff";

export default function ManageAdmins() {
  const router = useRouter();

  // ── Admin list ──
  const [admins,   setAdmins]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");

  // ── Dynamic colleges from API ──
  const [colleges,        setColleges]        = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(false);

  // ── Create Admin modal ──
  const [createModal,   setCreateModal]   = useState(false);
  const [form,          setForm]          = useState({ name:"", email:"", password:"", phone:"", college:"" });
  const [customCollege, setCustomCollege] = useState(false);
  const [showCollegeList, setShowCollegeList] = useState(false);
  const [creating,      setCreating]      = useState(false);
  const [showPassword,  setShowPassword]  = useState(false);

  // ── Detail sheet ──
  const [detailAdmin, setDetailAdmin] = useState(null);

  // ─────────────────────────────────────────────────────────
  //  LOAD ADMINS + COLLEGES
  // ─────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    loadAdmins();
    loadColleges();
  }, []));

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await API.get("/super-admin/users", { params: { role: "admin" } });
      setAdmins(res.data?.users || res.data?.data || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to load admins");
    } finally { setLoading(false); }
  };

  // Fetch colleges jo super admin ne add ki hain
  const loadColleges = async () => {
    setCollegesLoading(true);
    try {
      const res = await API.get("/super-admin/colleges");
      const list = res.data?.colleges || [];
      // Sirf college names array
      setColleges(list.map(c => typeof c === "string" ? c : c.name).filter(Boolean));
    } catch (e) {
      // Silent fail — custom input still works
      setColleges([]);
    } finally { setCollegesLoading(false); }
  };

  // ─────────────────────────────────────────────────────────
  //  CREATE ADMIN
  // ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const { name, email, password, college } = form;
    if (!name.trim())     return Alert.alert("Required", "Enter Name");
    if (!email.trim())    return Alert.alert("Required", "Enter Email");
    if (!password.trim()) return Alert.alert("Required", "Enter Password");
    if (password.length < 6) return Alert.alert("Password", "Password must be at least 6 characters long");
    if (!college.trim())  return Alert.alert("Required", "Select college or type");

    setCreating(true);
    try {
      await API.post("/super-admin/create-admin", {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        phone:    form.phone.trim(),
        college:  form.college.trim(),
        role:     "admin",
      });
      Alert.alert("✅ Admin Created!", `${form.name} was made an admin.\nCollege: ${form.college}`);
      setCreateModal(false);
      resetForm();
      loadAdmins();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to create admin");
    } finally { setCreating(false); }
  };

  const resetForm = () => {
    setForm({ name:"", email:"", password:"", phone:"", college:"" });
    setCustomCollege(false);
    setShowCollegeList(false);
    setShowPassword(false);
  };

  // ─────────────────────────────────────────────────────────
  //  DELETE ADMIN
  // ─────────────────────────────────────────────────────────
  const handleDelete = (admin) => {
    Alert.alert(
      "Delete Admin",
      `"${admin.name}"Do you want to delete the admin account of ?\n\nis college will no longer have any admin:\n${admin.college || "—"}`,
      [
        { text:"Cancel", style:"cancel" },
        { text:"Delete", style:"destructive", onPress: async () => {
          try {
            await API.delete(`/super-admin/users/${admin._id}`);
            setAdmins(p => p.filter(a => a._id !== admin._id));
            setDetailAdmin(null);
            Alert.alert("Deleted", `${admin.name} got deleted`);
          } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed");
          }
        }},
      ]
    );
  };

  // ─────────────────────────────────────────────────────────
  //  FILTERED
  // ─────────────────────────────────────────────────────────
  const filtered = admins.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.college?.toLowerCase().includes(q)
    );
  });

  const selectCollege = (c) => {
    setForm(p => ({ ...p, college: c }));
    setShowCollegeList(false);
    setCustomCollege(false);
  };

  // ─────────────────────────────────────────────────────────
  //  RENDER ADMIN CARD
  // ─────────────────────────────────────────────────────────
  const renderAdmin = ({ item, index }) => {
    const initials = item.name?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?";
    const color    = avatarColor(item.name || "");
    return (
      <Pressable style={styles.card} onPress={() => setDetailAdmin(item)}>
        <Text style={styles.cardIndex}>#{index + 1}</Text>
        <View style={[styles.avatar, { backgroundColor: color + "22", borderColor: color + "55" }]}>
          <Text style={[styles.avatarText, { color }]}>{initials}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>
          <View style={styles.cardTags}>
            <View style={[styles.tag, { backgroundColor: color + "18", borderColor: color + "44" }]}>
              <Ionicons name="business-outline" size={9} color={color} />
              <Text style={[styles.tagText, { color }]} numberOfLines={1}>{item.college || "No College"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
          <Ionicons name="chevron-forward" size={14} color="#374151" style={{ marginTop:6 }} />
        </View>
      </Pressable>
    );
  };

  // ─────────────────────────────────────────────────────────
  //  MAIN
  // ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060b14" />

      {/* ── HEADER ── */}
      <LinearGradient colors={["#060b14","#0a1628"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>Manage Admins</Text>
          <Text style={styles.headerSub}>{admins.length} college admin{admins.length !== 1 ? "s" : ""}</Text>
        </View>
        <Pressable onPress={() => setCreateModal(true)} style={styles.createHeaderBtn}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </LinearGradient>

      {/* ── SEARCH ── */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={15} color="#4b5563" />
        <TextInput
          style={styles.searchInput}
          placeholder="Name, email, college..."
          placeholderTextColor="#374151"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#4b5563" />
          </Pressable>
        )}
      </View>

      {/* ── STATS STRIP ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight:70 }} contentContainerStyle={styles.statsStrip}>
        {[
          { label:"Total Admins", value: admins.length, color:"#00c6ff", icon:"shield-checkmark" },
          { label:"Colleges",     value: new Set(admins.map(a => a.college).filter(Boolean)).size, color:"#a78bfa", icon:"business" },
          { label:"Active Today", value: admins.filter(a => {
            const d = new Date(a.lastLogin || a.createdAt);
            return Date.now() - d < 86400000;
          }).length, color:"#34d399", icon:"pulse" },
        ].map((s, i) => (
          <View key={i} style={[styles.statPill, { borderColor: s.color + "44" }]}>
            <Ionicons name={s.icon} size={12} color={s.color} />
            <Text style={[styles.statPillNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statPillLabel}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── CREATE ADMIN BUTTON (Big CTA) ── */}
      <Pressable style={styles.bigCTA} onPress={() => setCreateModal(true)}>
        <LinearGradient colors={["#1a2e4a","#1e3a5f"]}
          start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={styles.bigCTAGrad}>
          <View style={styles.bigCTALeft}>
            <View style={styles.bigCTAIcon}>
              <Ionicons name="shield-checkmark" size={22} color="#00c6ff" />
            </View>
            <View>
              <Text style={styles.bigCTATitle}>Create New Admin</Text>
              <Text style={styles.bigCTASub}>Create an admin account for the college</Text>
            </View>
          </View>
          <View style={styles.bigCTAArrow}>
            <Ionicons name="arrow-forward" size={16} color="#00c6ff" />
          </View>
        </LinearGradient>
      </Pressable>

      <Text style={styles.listHeading}>All College Admins</Text>

      {/* ── LIST ── */}
      {loading
        ? <ActivityIndicator size="large" color="#00c6ff" style={{ marginTop:40 }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={i => i._id}
            renderItem={renderAdmin}
            contentContainerStyle={{ paddingHorizontal:16, paddingBottom:40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="shield-outline" size={40} color="#1f2937" />
                </View>
                <Text style={styles.emptyTitle}>no admin</Text>
                <Text style={styles.emptySub}>
                  "Create your first admin using the "Create New Admin" button.
                </Text>
                <Pressable style={styles.emptyBtn} onPress={() => setCreateModal(true)}>
                  <Text style={styles.emptyBtnText}>+ Create Admin</Text>
                </Pressable>
              </View>
            }
          />
        )
      }

      {/* ══════════════════════════════════════════════════════
          CREATE ADMIN MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal visible={createModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex:1, justifyContent:"flex-end" }}>
            <View style={styles.createSheet}>
              <View style={styles.handle} />

              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.sheetIconWrap}>
                  <LinearGradient colors={["#00c6ff","#0072ff"]} style={styles.sheetIcon}>
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles.sheetTitle}>Create Admin</Text>
                  <Text style={styles.sheetSub}>New college admin account</Text>
                </View>
                <Pressable onPress={() => { setCreateModal(false); resetForm(); }} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal:20, paddingBottom:50 }}
                keyboardShouldPersistTaps="handled">

                {/* ── COLLEGE SELECTOR (Dynamic) ── */}
                <Text style={styles.fieldLabel}>
                  <Text style={styles.req}>* </Text>College
                </Text>

                <Pressable
                  style={[styles.collegePicker, showCollegeList && { borderColor:"#00c6ff" }]}
                  onPress={() => { setShowCollegeList(p => !p); setCustomCollege(false); }}>
                  <Ionicons name="business-outline" size={16} color={form.college ? "#00c6ff" : "#4b5563"} />
                  <Text style={[styles.collegePickerText, form.college && { color:"#fff" }]} numberOfLines={1}>
                    {form.college || "Select college..."}
                  </Text>
                  {collegesLoading
                    ? <ActivityIndicator size="small" color="#4b5563" />
                    : <Ionicons name={showCollegeList ? "chevron-up" : "chevron-down"} size={14} color="#4b5563" />
                  }
                </Pressable>

                {/* Dropdown — dynamic colleges from API */}
                {showCollegeList && (
                  <View style={styles.collegeDropdown}>
                    {colleges.length === 0 && !collegesLoading && (
                      <View style={styles.noCollegeMsg}>
                        <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
                        <Text style={styles.noCollegeMsgText}>
                          Could not find any college.{"\n"}
                          First add college from "Manage Colleges", or type custom below.
                        </Text>
                      </View>
                    )}
                    {colleges.map((c, i) => (
                      <Pressable key={i} style={[
                          styles.collegeOption,
                          form.college === c && styles.collegeOptionActive,
                          i < colleges.length - 1 && { borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)" }
                        ]}
                        onPress={() => selectCollege(c)}>
                        <View style={styles.collegeOptionDot} />
                        <Text style={[styles.collegeOptionText, form.college === c && { color:"#00c6ff" }]}
                          numberOfLines={2}>{c}</Text>
                        {form.college === c && <Ionicons name="checkmark-circle" size={16} color="#00c6ff" />}
                      </Pressable>
                    ))}

                    {/* Custom college option */}
                    <Pressable style={[styles.collegeOption, { borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.08)" }]}
                      onPress={() => { setCustomCollege(true); setShowCollegeList(false); setForm(p => ({ ...p, college:"" })); }}>
                      <Ionicons name="add-circle-outline" size={14} color="#a78bfa" />
                      <Text style={[styles.collegeOptionText, { color:"#a78bfa" }]}>Type another college...</Text>
                    </Pressable>
                  </View>
                )}

                {/* Custom college input */}
                {customCollege && (
                  <TextInput
                    style={[styles.input, { marginTop:8, borderColor:"rgba(167,139,250,0.4)" }]}
                    placeholder="College full Name "
                    placeholderTextColor="#374151"
                    value={form.college}
                    onChangeText={v => setForm(p => ({ ...p, college:v }))}
                    autoFocus
                  />
                )}

                {/* ── FIELDS ── */}
                <Text style={styles.sectionDivider}>Admin Information</Text>

                {/* Name */}
                <Text style={styles.fieldLabel}><Text style={styles.req}>* </Text>Full Name</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={16} color="#4b5563" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Admin full name"
                    placeholderTextColor="#374151"
                    value={form.name}
                    onChangeText={v => setForm(p => ({ ...p, name:v }))}
                  />
                </View>

                {/* Email */}
                <Text style={styles.fieldLabel}><Text style={styles.req}>* </Text>Email Address</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={16} color="#4b5563" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="admin@college.edu"
                    placeholderTextColor="#374151"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={v => setForm(p => ({ ...p, email:v }))}
                  />
                </View>

                {/* Password */}
                <Text style={styles.fieldLabel}><Text style={styles.req}>* </Text>Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color="#4b5563" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputField, { flex:1 }]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#374151"
                    secureTextEntry={!showPassword}
                    value={form.password}
                    onChangeText={v => setForm(p => ({ ...p, password:v }))}
                  />
                  <Pressable onPress={() => setShowPassword(p => !p)} style={{ paddingRight:14 }}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={16} color="#4b5563" />
                  </Pressable>
                </View>

                {/* Phone */}
                <Text style={styles.fieldLabel}>Phone <Text style={styles.opt}>(optional)</Text></Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="call-outline" size={16} color="#4b5563" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Mobile number"
                    placeholderTextColor="#374151"
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={v => setForm(p => ({ ...p, phone:v }))}
                  />
                </View>

                {/* Role badge */}
                <View style={styles.roleBadgeRow}>
                  <Text style={styles.fieldLabel}>Role</Text>
                  <View style={styles.roleBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#00c6ff" />
                    <Text style={styles.roleBadgeText}>admin</Text>
                  </View>
                </View>
                <Text style={styles.roleNote}>
                  This admin can manage the students, teachers and timetable of his college.
                </Text>

                {/* CREATE BUTTON */}
                <Pressable style={styles.createBtn} onPress={handleCreate} disabled={creating}>
                  <LinearGradient
                    colors={creating ? ["#1f2937","#1f2937"] : ["#00c6ff","#0072ff"]}
                    start={{ x:0, y:0 }} end={{ x:1, y:0 }}
                    style={styles.createBtnGrad}>
                    {creating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                          <Text style={styles.createBtnText}>Create Admin Account</Text>
                        </>
                    }
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          ADMIN DETAIL SHEET
      ══════════════════════════════════════════════════════ */}
      <Modal visible={!!detailAdmin} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            <View style={styles.handle} />
            {detailAdmin && (() => {
              const color    = avatarColor(detailAdmin.name || "");
              const initials = detailAdmin.name?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?";
              return (
                <>
                  <Pressable onPress={() => setDetailAdmin(null)} style={styles.detailClose}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </Pressable>
                  <View style={styles.detailAvatarWrap}>
                    <View style={[styles.detailAvatar, { backgroundColor: color + "22", borderColor: color }]}>
                      <Text style={[styles.detailAvatarText, { color }]}>{initials}</Text>
                    </View>
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#fff" />
                      <Text style={styles.adminBadgeText}>ADMIN</Text>
                    </View>
                  </View>
                  <Text style={styles.detailName}>{detailAdmin.name}</Text>
                  <Text style={styles.detailEmail}>{detailAdmin.email}</Text>
                  <View style={styles.detailRows}>
                    {[
                      { icon:"business", label:"College",    value: detailAdmin.college || "—",   color:"#00c6ff" },
                      { icon:"call",     label:"Phone",      value: detailAdmin.phone   || "—",   color:"#34d399" },
                      { icon:"calendar", label:"Created",    value: detailAdmin.createdAt ? new Date(detailAdmin.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" }) : "—", color:"#a78bfa" },
                      { icon:"time",     label:"Last Login", value: timeAgo(detailAdmin.lastLogin), color:"#f59e0b" },
                    ].map((r, i) => (
                      <View key={i} style={styles.detailRow}>
                        <View style={[styles.detailRowIcon, { backgroundColor: r.color + "18" }]}>
                          <Ionicons name={r.icon} size={14} color={r.color} />
                        </View>
                        <View style={{ flex:1 }}>
                          <Text style={styles.detailRowLabel}>{r.label}</Text>
                          <Text style={styles.detailRowValue} numberOfLines={2}>{r.value}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={styles.detailActions}>
                    <Pressable style={styles.detailDeleteBtn} onPress={() => handleDelete(detailAdmin)}>
                      <Ionicons name="trash-outline" size={16} color="#f87171" />
                      <Text style={styles.detailDeleteText}>Delete Admin</Text>
                    </Pressable>
                    <Pressable style={styles.detailCloseBtn} onPress={() => setDetailAdmin(null)}>
                      <Text style={styles.detailCloseBtnText}>Close</Text>
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── STYLES ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:          { flex:1, backgroundColor:"#060b14" },
  header:             { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:16, gap:12 },
  backBtn:            { width:38, height:38, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  headerMid:          { flex:1 },
  headerTitle:        { color:"#fff", fontSize:19, fontWeight:"800", letterSpacing:0.2 },
  headerSub:          { color:"#374151", fontSize:12, marginTop:2 },
  createHeaderBtn:    { width:38, height:38, borderRadius:12, backgroundColor:"#00c6ff", justifyContent:"center", alignItems:"center" },
  searchBox:          { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1923", marginHorizontal:16, marginTop:10, borderRadius:12, paddingHorizontal:14, paddingVertical:11, gap:8, borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  searchInput:        { flex:1, color:"#fff", fontSize:14 },
  statsStrip:         { paddingHorizontal:16, gap:10, paddingVertical:12 },
  statPill:           { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1 },
  statPillNum:        { fontSize:15, fontWeight:"800" },
  statPillLabel:      { color:"#4b5563", fontSize:11, fontWeight:"600" },
  bigCTA:             { marginHorizontal:16, marginTop:4, marginBottom:6, borderRadius:16, overflow:"hidden" },
  bigCTAGrad:         { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, paddingVertical:14, borderWidth:1, borderColor:"rgba(0,198,255,0.2)", borderRadius:16 },
  bigCTALeft:         { flexDirection:"row", alignItems:"center", gap:14, flex:1 },
  bigCTAIcon:         { width:44, height:44, borderRadius:13, backgroundColor:"rgba(0,198,255,0.12)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(0,198,255,0.3)" },
  bigCTATitle:        { color:"#fff", fontSize:15, fontWeight:"800" },
  bigCTASub:          { color:"#4b5563", fontSize:11, marginTop:2 },
  bigCTAArrow:        { width:32, height:32, borderRadius:16, backgroundColor:"rgba(0,198,255,0.12)", justifyContent:"center", alignItems:"center" },
  listHeading:        { color:"#374151", fontSize:11, fontWeight:"700", textTransform:"uppercase", letterSpacing:1, paddingHorizontal:16, marginBottom:8, marginTop:4 },
  card:               { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1923", borderRadius:16, padding:14, marginBottom:10, gap:12, borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  cardIndex:          { color:"#1f2937", fontSize:11, fontWeight:"700", width:18, textAlign:"center" },
  avatar:             { width:46, height:46, borderRadius:23, justifyContent:"center", alignItems:"center", borderWidth:1.5 },
  avatarText:         { fontSize:15, fontWeight:"800" },
  cardInfo:           { flex:1 },
  cardName:           { color:"#fff", fontSize:14, fontWeight:"700" },
  cardEmail:          { color:"#4b5563", fontSize:11, marginTop:2 },
  cardTags:           { flexDirection:"row", flexWrap:"wrap", gap:6, marginTop:6 },
  tag:                { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:8, paddingVertical:3, borderRadius:8, borderWidth:1 },
  tagText:            { fontSize:10, fontWeight:"700" },
  cardRight:          { alignItems:"flex-end" },
  cardTime:           { color:"#374151", fontSize:10 },
  empty:              { alignItems:"center", paddingTop:60, gap:12 },
  emptyIcon:          { width:80, height:80, borderRadius:40, backgroundColor:"rgba(255,255,255,0.03)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  emptyTitle:         { color:"#374151", fontSize:16, fontWeight:"700" },
  emptySub:           { color:"#1f2937", fontSize:12, textAlign:"center", paddingHorizontal:32 },
  emptyBtn:           { marginTop:8, paddingHorizontal:24, paddingVertical:12, borderRadius:12, backgroundColor:"rgba(0,198,255,0.1)", borderWidth:1, borderColor:"rgba(0,198,255,0.3)" },
  emptyBtnText:       { color:"#00c6ff", fontWeight:"700", fontSize:13 },
  overlay:            { flex:1, backgroundColor:"rgba(0,0,0,0.85)", justifyContent:"flex-end" },
  createSheet:        { backgroundColor:"#0a1220", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.93, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  handle:             { width:40, height:4, backgroundColor:"rgba(255,255,255,0.1)", borderRadius:2, alignSelf:"center", marginTop:12, marginBottom:6 },
  sheetHeader:        { flexDirection:"row", alignItems:"center", gap:12, paddingHorizontal:20, paddingVertical:16 },
  sheetIconWrap:      {},
  sheetIcon:          { width:46, height:46, borderRadius:14, justifyContent:"center", alignItems:"center" },
  sheetTitle:         { color:"#fff", fontSize:17, fontWeight:"800" },
  sheetSub:           { color:"#4b5563", fontSize:11, marginTop:2 },
  closeBtn:           { width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  fieldLabel:         { color:"#94a3b8", fontSize:11, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5, marginBottom:6, marginTop:16 },
  req:                { color:"#f87171" },
  opt:                { color:"#4b5563", fontWeight:"400" },
  collegePicker:      { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"#0f1923", borderRadius:12, paddingHorizontal:14, paddingVertical:13, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  collegePickerText:  { flex:1, color:"#4b5563", fontSize:14 },
  collegeDropdown:    { backgroundColor:"#111c2d", borderRadius:12, marginTop:4, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", overflow:"hidden" },
  collegeOption:      { flexDirection:"row", alignItems:"center", gap:10, paddingHorizontal:14, paddingVertical:13 },
  collegeOptionActive:{ backgroundColor:"rgba(0,198,255,0.08)" },
  collegeOptionDot:   { width:6, height:6, borderRadius:3, backgroundColor:"rgba(255,255,255,0.15)" },
  collegeOptionText:  { flex:1, color:"#94a3b8", fontSize:13 },
  noCollegeMsg:       { flexDirection:"row", alignItems:"flex-start", gap:8, padding:14, backgroundColor:"rgba(245,158,11,0.08)" },
  noCollegeMsgText:   { flex:1, color:"#f59e0b", fontSize:12, lineHeight:18 },
  inputWrap:          { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1923", borderRadius:12, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", marginBottom:4 },
  inputIcon:          { paddingLeft:14 },
  inputField:         { flex:1, color:"#fff", fontSize:14, paddingHorizontal:10, paddingVertical:13 },
  input:              { backgroundColor:"#0f1923", color:"#fff", borderRadius:12, paddingHorizontal:14, paddingVertical:13, fontSize:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  sectionDivider:     { color:"#1f2937", fontSize:11, fontWeight:"800", textTransform:"uppercase", letterSpacing:1.5, marginTop:24, marginBottom:4, borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.04)", paddingTop:16 },
  roleBadgeRow:       { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  roleBadge:          { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:5, borderRadius:20, backgroundColor:"rgba(0,198,255,0.1)", borderWidth:1, borderColor:"rgba(0,198,255,0.3)" },
  roleBadgeText:      { color:"#00c6ff", fontSize:11, fontWeight:"700" },
  roleNote:           { color:"#374151", fontSize:11, lineHeight:17, marginTop:8, marginBottom:4 },
  createBtn:          { borderRadius:14, overflow:"hidden", marginTop:24 },
  createBtnGrad:      { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:16 },
  createBtnText:      { color:"#fff", fontSize:16, fontWeight:"800" },
  detailSheet:        { backgroundColor:"#0a1220", borderTopLeftRadius:28, borderTopRightRadius:28, paddingBottom:40, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  detailClose:        { position:"absolute", top:20, right:20, zIndex:10, width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  detailAvatarWrap:   { alignItems:"center", marginTop:28 },
  detailAvatar:       { width:80, height:80, borderRadius:40, justifyContent:"center", alignItems:"center", borderWidth:2 },
  detailAvatarText:   { fontSize:26, fontWeight:"800" },
  adminBadge:         { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"#00c6ff", paddingHorizontal:12, paddingVertical:4, borderRadius:20, marginTop:10 },
  adminBadgeText:     { color:"#fff", fontSize:10, fontWeight:"800", letterSpacing:1 },
  detailName:         { color:"#fff", fontSize:20, fontWeight:"800", textAlign:"center", marginTop:10 },
  detailEmail:        { color:"#4b5563", fontSize:13, textAlign:"center", marginTop:4 },
  detailRows:         { marginHorizontal:20, marginTop:20, gap:10 },
  detailRow:          { flexDirection:"row", alignItems:"center", gap:12, backgroundColor:"rgba(255,255,255,0.03)", borderRadius:12, padding:12 },
  detailRowIcon:      { width:36, height:36, borderRadius:10, justifyContent:"center", alignItems:"center" },
  detailRowLabel:     { color:"#4b5563", fontSize:10, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5 },
  detailRowValue:     { color:"#fff", fontSize:13, fontWeight:"600", marginTop:2 },
  detailActions:      { flexDirection:"row", gap:12, marginHorizontal:20, marginTop:24 },
  detailDeleteBtn:    { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:14, borderRadius:12, backgroundColor:"rgba(248,113,113,0.08)", borderWidth:1, borderColor:"rgba(248,113,113,0.2)" },
  detailDeleteText:   { color:"#f87171", fontWeight:"700", fontSize:14 },
  detailCloseBtn:     { flex:1, paddingVertical:14, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", alignItems:"center" },
  detailCloseBtnText: { color:"#64748b", fontWeight:"700", fontSize:14 },
});
