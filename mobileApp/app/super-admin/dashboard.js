// ══════════════════════════════════════════════════════════════
// super-admin/dashboard.js  —  Fully working Super Admin Panel
// ══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, BackHandler, ToastAndroid,
  StatusBar, RefreshControl, Dimensions, Modal,
  Alert, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

// ─── Which routes are actually built ──────────────────────────
const BUILT_ROUTES = {
  "/super-admin/colleges":      true,
  "/super-admin/manage-admins": true,
};
const isBuilt = (route) => !!route && !!BUILT_ROUTES[route];

// ─── Coming Soon toast ────────────────────────────────────────
const comingSoon = (label) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(`${label} — Coming Soon`, ToastAndroid.SHORT);
  } else {
    Alert.alert("Coming Soon", `${label} screen is under development.`);
  }
};

// ─── Stat Card ────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, onPress, built }) => (
  <Pressable style={[styles.statCard, { borderColor: color + "35" }]} onPress={onPress} disabled={!onPress}>
    <LinearGradient colors={[color + "15", color + "04"]} style={styles.statGrad}>
      <View style={[styles.statIconBox, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {onPress && (
        <View style={[styles.statChevron, { backgroundColor: color + "15" }]}>
          <Ionicons name={built ? "chevron-forward" : "time-outline"} size={10} color={color} />
        </View>
      )}
    </LinearGradient>
  </Pressable>
);

// ─── Menu Row ─────────────────────────────────────────────────
const MenuRow = ({ icon, label, subtitle, color, onPress, built, isLast }) => (
  <Pressable style={[styles.menuRow, isLast && styles.menuRowLast]} onPress={onPress}>
    <View style={[styles.menuRowIcon, { backgroundColor: color + "18", borderColor: color + "30" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={styles.menuRowInfo}>
      <View style={styles.menuRowTop}>
        <Text style={styles.menuRowLabel}>{label}</Text>
        {!built && <View style={styles.soonBadge}><Text style={styles.soonBadgeText}>Soon</Text></View>}
      </View>
      <Text style={styles.menuRowSub} numberOfLines={1}>{subtitle}</Text>
    </View>
    <Ionicons name={built ? "chevron-forward" : "lock-closed-outline"} size={14}
      color={built ? color + "80" : "#1f2937"} />
  </Pressable>
);

// ─── Quick Btn ────────────────────────────────────────────────
const QuickBtn = ({ icon, label, color, onPress, built }) => (
  <Pressable style={styles.quickBtn} onPress={onPress}>
    <LinearGradient colors={[color + "25", color + "08"]}
      style={[styles.quickBtnGrad, { borderColor: color + "30" }]}>
      <View style={[styles.quickBtnIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.quickBtnLabel, { color }]} numberOfLines={2}>{label}</Text>
      {!built && <Ionicons name="time-outline" size={9} color={color + "55"} style={styles.quickSoon} />}
    </LinearGradient>
  </Pressable>
);

// ════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const router = useRouter();
  const [superAdminData,    setSuperAdminData]    = useState(null);
  const [stats,             setStats]             = useState(null);
  const [checkingAuth,      setCheckingAuth]      = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [activeTab,         setActiveTab]         = useState("home");
  const [colleges,          setColleges]          = useState([]);

  // Modals
  const [shutdownModal,     setShutdownModal]     = useState(false);
  const [shutdownLoading,   setShutdownLoading]   = useState(false);
  const [shutdownConfirm,   setShutdownConfirm]   = useState("");

  const [addAdminModal,     setAddAdminModal]     = useState(false);
  const [addAdminLoading,   setAddAdminLoading]   = useState(false);
  const [adminForm,  setAdminForm]  = useState({ name:"", email:"", password:"", college:"" });
  const [showPass,   setShowPass]   = useState(false);

  const [broadcastModal,    setBroadcastModal]    = useState(false);
  const [broadcastLoading,  setBroadcastLoading]  = useState(false);
  const [broadcastText,     setBroadcastText]     = useState("");

  const backPressCount = useRef(0);

  // ─── Load ──────────────────────────────────────────────
  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("superAdminLoggedIn");
    if (!token) { router.replace("/login"); return; }
    const raw = await AsyncStorage.getItem("superAdminData");
    if (raw) setSuperAdminData(JSON.parse(raw));
    try { const r = await API.get("/super-admin/stats"); if (r.data) setStats(r.data); } catch {}
    try {
      const r = await API.get("/super-admin/colleges");
      const list = r.data?.colleges || [];
      setColleges(list.map(c => typeof c === "string" ? c : c.name).filter(Boolean));
    } catch {}
    setCheckingAuth(false);
    setRefreshing(false);
  }, [router]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ─── Back handler ──────────────────────────────────────
  useFocusEffect(useCallback(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backPressCount.current === 0) {
        backPressCount.current = 1;
        ToastAndroid?.show?.("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backPressCount.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => handler.remove();
  }, []));

  // ─── Logout ────────────────────────────────────────────
  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    await AsyncStorage.multiRemove(["accessToken","refreshToken","superAdminData","superAdminLoggedIn"]);
    router.replace("/login");
  };

  // ─── Shutdown ──────────────────────────────────────────
  const handleShutdown = async () => {
    if (shutdownConfirm.trim().toUpperCase() !== "SHUTDOWN") {
      Alert.alert("Error", 'Type "SHUTDOWN" to confirm'); return;
    }
    setShutdownLoading(true);
    try {
      await API.post("/super-admin/shutdown");
      setShutdownModal(false);
      Alert.alert("Done", "All users logged out.", [{ text:"OK", onPress: handleLogout }]);
    } catch {
      Alert.alert("Shutdown", "Initiated.", [{ text:"OK", onPress: handleLogout }]);
    } finally { setShutdownLoading(false); }
  };

  // ─── Create Admin ──────────────────────────────────────
  const handleCreateAdmin = async () => {
    const { name, email, password, college } = adminForm;
    if (!name || !email || !password) return Alert.alert("Required", "Name, email, password required");
    if (password.length < 6) return Alert.alert("Password", "Min 6 characters");
    if (!college) return Alert.alert("Required", "College select karo");
    setAddAdminLoading(true);
    try {
      await API.post("/super-admin/create-admin", adminForm);
      setAddAdminModal(false);
      setAdminForm({ name:"", email:"", password:"", college:"" });
      Alert.alert("Done!", "Admin account created!");
      loadAll();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed");
    } finally { setAddAdminLoading(false); }
  };

  // ─── Broadcast ─────────────────────────────────────────
  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return Alert.alert("Required", "Message daalo");
    setBroadcastLoading(true);
    try {
      await API.post("/super-admin/broadcast", { message: broadcastText });
      setBroadcastModal(false);
      setBroadcastText("");
      Alert.alert("Sent!", "All users ko announcement milega");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed");
    } finally { setBroadcastLoading(false); }
  };

  const go = (route, label) => {
    if (!route) return comingSoon(label);
    if (isBuilt(route)) { router.push(route); return; }
    comingSoon(label);
  };

  if (checkingAuth) return (
    <View style={styles.loader}><ActivityIndicator size="large" color="#f87171" /></View>
  );

  const statsData = [
    { icon:"business",         label:"Colleges",    value:stats?.totalColleges,    color:"#00c6ff", route:"/super-admin/colleges"      },
    { icon:"shield-checkmark", label:"Admins",      value:stats?.totalAdmins,      color:"#a78bfa", route:"/super-admin/manage-admins"  },
    { icon:"people",           label:"Students",    value:stats?.totalStudents,    color:"#34d399", route:"/super-admin/students"       },
    { icon:"person",           label:"Teachers",    value:stats?.totalTeachers,    color:"#f59e0b", route:"/super-admin/teachers"       },
    { icon:"book",             label:"Subjects",    value:stats?.totalSubjects,    color:"#60a5fa", route:null                          },
    { icon:"document-text",    label:"Assignments", value:stats?.totalAssignments, color:"#fb923c", route:null                          },
    { icon:"trophy",           label:"Results",     value:stats?.totalResults,     color:"#e879f9", route:null                          },
    { icon:"newspaper",        label:"Posts",       value:stats?.totalPosts,       color:"#f87171", route:null                          },
  ];

  const quickActions = [
    { icon:"business",   label:"Colleges",  color:"#00c6ff", built:true,  action:() => go("/super-admin/colleges","Colleges")       },
    { icon:"person-add", label:"Add Admin", color:"#a78bfa", built:true,  action:() => setAddAdminModal(true)                       },
    { icon:"megaphone",  label:"Broadcast", color:"#f59e0b", built:true,  action:() => setBroadcastModal(true)                      },
    { icon:"people",     label:"Students",  color:"#34d399", built:false, action:() => comingSoon("Students")                       },
    { icon:"person",     label:"Teachers",  color:"#f59e0b", built:false, action:() => comingSoon("Teachers")                       },
    { icon:"bar-chart",  label:"Analytics", color:"#22d3ee", built:false, action:() => comingSoon("Analytics")                      },
  ];

  const menuGroups = [
    {
      title:"✅ Ready to Use", color:"#34d399",
      items:[
        { icon:"business",         label:"Manage Colleges", subtitle:`${stats?.totalColleges||0} colleges registered`, color:"#00c6ff", route:"/super-admin/colleges",      built:true  },
        { icon:"shield-checkmark", label:"Manage Admins",   subtitle:`${stats?.totalAdmins||0} admins active`,         color:"#a78bfa", route:"/super-admin/manage-admins", built:true  },
      ],
    },
    {
      title:"🚧 Coming Soon", color:"#374151",
      items:[
        { icon:"people",       label:"All Students",       subtitle:`${stats?.totalStudents||0} students`,      color:"#34d399", route:"/super-admin/students",      built:false },
        { icon:"person",       label:"All Teachers",       subtitle:`${stats?.totalTeachers||0} teachers`,      color:"#f59e0b", route:"/super-admin/teachers",      built:false },
        { icon:"book",         label:"All Subjects",       subtitle:"System-wide subjects",                     color:"#60a5fa", route:"/super-admin/subjects",      built:false },
        { icon:"calendar",     label:"Attendance Reports", subtitle:"College-wise attendance",                  color:"#34d399", route:"/super-admin/attendance",    built:false },
        { icon:"bar-chart",    label:"System Analytics",   subtitle:"Performance & usage",                      color:"#22d3ee", route:"/super-admin/analytics",     built:false },
        { icon:"trophy",       label:"All Results",        subtitle:"SGPA/CGPA across colleges",                color:"#e879f9", route:"/super-admin/results",       built:false },
        { icon:"time",         label:"All Timetables",     subtitle:"Schedules across colleges",                color:"#fb923c", route:"/super-admin/timetables",    built:false },
        { icon:"document-text",label:"All Assignments",    subtitle:"Assignments system-wide",                  color:"#fbbf24", route:"/super-admin/assignments",   built:false },
        { icon:"newspaper",    label:"All Posts & Feed",   subtitle:"Manage posts",                             color:"#f87171", route:"/super-admin/posts",         built:false },
        { icon:"megaphone",    label:"Announcements",      subtitle:"Global & college notices",                 color:"#f59e0b", route:"/super-admin/announcements", built:false },
        { icon:"receipt",      label:"Fees & Finance",     subtitle:"Fee structure overview",                   color:"#10b981", route:"/super-admin/finance",       built:false },
        { icon:"settings",     label:"System Settings",    subtitle:"App config & preferences",                 color:"#334155", route:"/super-admin/settings",      built:false },
      ],
    },
  ];

  const sections = [
    { type:"welcome" },
    { type:"stats"   },
    { type:"quick"   },
    { type:"menu"    },
    { type:"danger"  },
    { type:"footer"  },
  ];

  const renderSection = ({ item }) => {
    if (item.type === "welcome") return (
      <LinearGradient colors={["#7f1d1d","#b91c1c","#f87171"]}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={styles.welcomeCard}>
        <View style={{ flex:1 }}>
          <Text style={styles.welcomeHi}>Hello, {superAdminData?.name?.split(" ")[0] || "Super Admin"} 👋</Text>
          <Text style={styles.welcomeSub}>Super Administrator • COLLAहUB</Text>
          <View style={styles.superBadge}>
            <Ionicons name="star" size={10} color="#fca5a5" />
            <Text style={styles.superBadgeText}>FULL SYSTEM ACCESS</Text>
          </View>
          <View style={styles.welcomeStats}>
            {[
              { val:stats?.totalColleges, label:"Colleges"  },
              { val:stats?.totalStudents, label:"Students"  },
              { val:stats?.totalAdmins,   label:"Admins"    },
            ].map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.welcomeStatDiv} />}
                <View style={styles.welcomeStat}>
                  <Text style={styles.welcomeStatVal}>{s.val ?? "—"}</Text>
                  <Text style={styles.welcomeStatLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
        <Ionicons name="globe" size={56} color="rgba(255,255,255,0.12)" />
      </LinearGradient>
    );

    if (item.type === "stats") return (
      <>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          {statsData.map((s, i) => (
            <StatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color}
              built={isBuilt(s.route)} onPress={s.route ? () => go(s.route, s.label) : null} />
          ))}
        </View>
      </>
    );

    if (item.type === "quick") return (
      <>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((q, i) => (
            <QuickBtn key={i} icon={q.icon} label={q.label} color={q.color}
              built={q.built} onPress={q.action} />
          ))}
        </View>
      </>
    );

    if (item.type === "menu") return (
      <>
        {menuGroups.map((group, gi) => (
          <View key={gi}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={[styles.groupTitle, { color: group.color }]}>{group.title}</Text>
            </View>
            <View style={styles.menuGroup}>
              {group.items.map((m, mi) => (
                <MenuRow key={mi} icon={m.icon} label={m.label} subtitle={m.subtitle}
                  color={m.color} built={m.built} isLast={mi === group.items.length - 1}
                  onPress={() => go(m.route, m.label)} />
              ))}
            </View>
          </View>
        ))}
      </>
    );

    if (item.type === "danger") return (
      <View style={styles.dangerZone}>
        <View style={styles.dangerHeader}>
          <Ionicons name="warning" size={14} color="#f87171" />
          <Text style={styles.dangerTitle}>Danger Zone</Text>
        </View>
        <Pressable style={styles.shutdownCard} onPress={() => { setShutdownConfirm(""); setShutdownModal(true); }}>
          <LinearGradient colors={["rgba(239,68,68,0.15)","rgba(239,68,68,0.04)"]} style={styles.shutdownGrad}>
            <View style={styles.shutdownIconBox}>
              <Ionicons name="power" size={22} color="#f87171" />
            </View>
            <View style={{ flex:1 }}>
              <Text style={styles.shutdownTitle}>Emergency Shutdown</Text>
              <Text style={styles.shutdownSub}>Instantly logs out ALL users system-wide</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#f87171" />
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.logoutBtn} onPress={() => Alert.alert("Logout","Logout karna chahte ho?",[
          { text:"Cancel", style:"cancel" },
          { text:"Logout", style:"destructive", onPress: handleLogout },
        ])}>
          <Ionicons name="log-out-outline" size={16} color="#f87171" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    );

    if (item.type === "footer") return <View style={{ height:100 }} />;
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <LinearGradient colors={["#080d17","#130505"]} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerBadge}>
            <Ionicons name="star" size={15} color="#f87171" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Super Admin</Text>
            <Text style={styles.headerSub}>Full System Access</Text>
          </View>
        </View>
        <Pressable onPress={() => { setShutdownConfirm(""); setShutdownModal(true); }} style={styles.powerBtn}>
          <Ionicons name="power" size={18} color="#f87171" />
        </Pressable>
      </LinearGradient>

      <FlatList data={sections} keyExtractor={i => i.type} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#f87171" />}
        renderItem={renderSection}
      />

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {[
          { key:"home",     icon:"home",              label:"Home",     action:() => setActiveTab("home")                           },
          { key:"colleges", icon:"business",           label:"Colleges", action:() => go("/super-admin/colleges","Colleges")         },
          { key:"admins",   icon:"shield-checkmark",   label:"Admins",   action:() => go("/super-admin/manage-admins","Admins")      },
          { key:"more",     icon:"ellipsis-horizontal",label:"More",     action:() => comingSoon("More")                             },
        ].map(tab => (
          <Pressable key={tab.key} style={styles.tabItem} onPress={tab.action}>
            <Ionicons
              name={activeTab === tab.key ? tab.icon : tab.icon + "-outline"}
              size={21} color={activeTab === tab.key ? "#f87171" : "#374151"} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            {activeTab === tab.key && <View style={styles.tabDot} />}
          </Pressable>
        ))}
      </View>

      {/* ════ SHUTDOWN MODAL ════ */}
      <Modal visible={shutdownModal} transparent animationType="fade"
        onRequestClose={() => !shutdownLoading && setShutdownModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.shutdownModal}>
            <LinearGradient colors={["#7f1d1d","#ef4444"]} style={styles.shutdownModalIcon}>
              <Ionicons name="power" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.shutdownModalTitle}>Emergency Shutdown</Text>
            <Text style={styles.shutdownModalDesc}>
              Yeh action immediately ALL users ko logout kar dega.
            </Text>
            {[
              "Saare students, teachers, admins logout honge",
              "Saare active sessions expire honge",
              "Database se sab refresh tokens clear honge",
            ].map((pt, i) => (
              <View key={i} style={styles.shutdownPt}>
                <Ionicons name="alert-circle" size={12} color="#f87171" />
                <Text style={styles.shutdownPtText}>{pt}</Text>
              </View>
            ))}
            <View style={styles.shutdownConfirmBox}>
              <Text style={styles.shutdownConfirmLabel}>
                Confirm: <Text style={{ color:"#f87171", fontWeight:"800" }}>SHUTDOWN</Text> type karo
              </Text>
              <TextInput style={styles.shutdownConfirmInput}
                placeholder="SHUTDOWN" placeholderTextColor="#374151"
                value={shutdownConfirm} onChangeText={setShutdownConfirm}
                autoCapitalize="characters" />
            </View>
            <View style={styles.shutdownModalBtns}>
              <Pressable style={styles.shutdownCancelBtn}
                onPress={() => setShutdownModal(false)} disabled={shutdownLoading}>
                <Text style={styles.shutdownCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.shutdownConfirmBtn, shutdownConfirm.trim().toUpperCase() !== "SHUTDOWN" && { opacity:0.35 }]}
                onPress={handleShutdown}
                disabled={shutdownLoading || shutdownConfirm.trim().toUpperCase() !== "SHUTDOWN"}>
                {shutdownLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="power" size={13} color="#fff" /><Text style={styles.shutdownConfirmText}>SHUTDOWN</Text></>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════ ADD ADMIN MODAL ════ */}
      <Modal visible={addAdminModal} transparent animationType="slide"
        onRequestClose={() => !addAdminLoading && setAddAdminModal(false)}>
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetOverlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <LinearGradient colors={["#00c6ff","#0072ff"]} style={styles.sheetHeaderIcon}>
                  <Ionicons name="shield-checkmark" size={17} color="#fff" />
                </LinearGradient>
                <View style={{ flex:1 }}>
                  <Text style={styles.sheetTitle}>Create Admin</Text>
                  <Text style={styles.sheetSub}>New college admin account</Text>
                </View>
                <Pressable onPress={() => setAddAdminModal(false)} style={styles.sheetClose}>
                  <Ionicons name="close" size={17} color="#64748b" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal:20, paddingBottom:50 }}
                keyboardShouldPersistTaps="handled">

                {/* College chips */}
                <Text style={styles.fieldLabel}>College <Text style={{ color:"#f87171" }}>*</Text></Text>
                {colleges.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap:8, marginBottom:10 }}>
                    {colleges.map((c, i) => (
                      <Pressable key={i}
                        style={[styles.collegeChip, adminForm.college === c && styles.collegeChipActive]}
                        onPress={() => setAdminForm(p => ({ ...p, college:c }))}>
                        <Text style={[styles.collegeChipText, adminForm.college === c && { color:"#00c6ff" }]}
                          numberOfLines={1}>{c}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noCollegeWarn}>
                    <Ionicons name="warning-outline" size={13} color="#f59e0b" />
                    <Text style={styles.noCollegeWarnText}>
                      Pehle Manage Colleges se college add karo. Ya neeche manually type karo.
                    </Text>
                  </View>
                )}

                {[
                  { key:"college",  placeholder:"College naam", icon:"business-outline",      auto:"words"  },
                  { key:"name",     placeholder:"Full Name *",  icon:"person-outline",        auto:"words"  },
                  { key:"email",    placeholder:"Email *",      icon:"mail-outline",          auto:"none"   },
                ].map(f => (
                  <View key={f.key} style={styles.formInput}>
                    <Ionicons name={f.icon} size={15} color="#64748b" />
                    <TextInput style={styles.formInputText}
                      placeholder={f.placeholder} placeholderTextColor="#374151"
                      autoCapitalize={f.auto}
                      value={adminForm[f.key]}
                      onChangeText={v => setAdminForm(p => ({ ...p, [f.key]:v }))} />
                  </View>
                ))}

                {/* Password */}
                <View style={styles.formInput}>
                  <Ionicons name="lock-closed-outline" size={15} color="#64748b" />
                  <TextInput style={[styles.formInputText,{ flex:1 }]}
                    placeholder="Password (min 6) *" placeholderTextColor="#374151"
                    secureTextEntry={!showPass}
                    value={adminForm.password}
                    onChangeText={v => setAdminForm(p => ({ ...p, password:v }))} />
                  <Pressable onPress={() => setShowPass(p => !p)} style={{ paddingRight:14 }}>
                    <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={15} color="#64748b" />
                  </Pressable>
                </View>

                <Pressable style={[styles.submitBtn, addAdminLoading && { opacity:0.6 }]}
                  onPress={handleCreateAdmin} disabled={addAdminLoading}>
                  <LinearGradient colors={["#00c6ff","#0072ff"]} style={styles.submitBtnGrad}>
                    {addAdminLoading ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="shield-checkmark-outline" size={15} color="#fff" />
                          <Text style={styles.submitBtnText}>Create Admin Account</Text></>}
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════ BROADCAST MODAL ════ */}
      <Modal visible={broadcastModal} transparent animationType="slide"
        onRequestClose={() => !broadcastLoading && setBroadcastModal(false)}>
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.sheetOverlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <LinearGradient colors={["#f59e0b","#d97706"]} style={styles.sheetHeaderIcon}>
                  <Ionicons name="megaphone" size={17} color="#fff" />
                </LinearGradient>
                <View style={{ flex:1 }}>
                  <Text style={styles.sheetTitle}>Global Broadcast</Text>
                  <Text style={styles.sheetSub}>Sabko notification jayegi</Text>
                </View>
                <Pressable onPress={() => setBroadcastModal(false)} style={styles.sheetClose}>
                  <Ionicons name="close" size={17} color="#64748b" />
                </Pressable>
              </View>
              <View style={{ paddingHorizontal:20, paddingBottom:50 }}>
                <View style={styles.broadcastInfo}>
                  <Ionicons name="information-circle" size={15} color="#60a5fa" />
                  <Text style={styles.broadcastInfoText}>
                    Yeh message ALL students, teachers aur admins ko milega.
                  </Text>
                </View>
                <TextInput style={styles.broadcastInput}
                  placeholder="Announcement message..." placeholderTextColor="#374151"
                  value={broadcastText} onChangeText={setBroadcastText}
                  multiline maxLength={500} textAlignVertical="top" />
                <Text style={styles.broadcastCount}>{broadcastText.length}/500</Text>
                <Pressable style={[styles.submitBtn, broadcastLoading && { opacity:0.6 }]}
                  onPress={handleBroadcast} disabled={broadcastLoading}>
                  <LinearGradient colors={["#f59e0b","#d97706"]} style={styles.submitBtnGrad}>
                    {broadcastLoading ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="megaphone" size={15} color="#fff" />
                          <Text style={styles.submitBtnText}>Send to All Users</Text></>}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ════════════════════════════════════════════
const styles = StyleSheet.create({
  container:  { flex:1, backgroundColor:"#080d17" },
  loader:     { flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#080d17" },
  header:     { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  headerLeft: { flexDirection:"row", alignItems:"center", gap:12 },
  headerBadge:{ width:40, height:40, borderRadius:12, backgroundColor:"rgba(248,113,113,0.12)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(248,113,113,0.3)" },
  headerTitle:{ color:"#fff", fontSize:16, fontWeight:"800" },
  headerSub:  { color:"#374151", fontSize:11, marginTop:1 },
  powerBtn:   { width:40, height:40, borderRadius:12, backgroundColor:"rgba(248,113,113,0.1)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(248,113,113,0.25)" },
  body:       { paddingHorizontal:16, paddingBottom:80 },

  // Welcome
  welcomeCard:       { borderRadius:22, padding:22, marginTop:14, marginBottom:22, flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start" },
  welcomeHi:         { color:"#fff", fontSize:20, fontWeight:"800", marginBottom:4 },
  welcomeSub:        { color:"rgba(255,255,255,0.7)", fontSize:12, marginBottom:10 },
  superBadge:        { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(0,0,0,0.22)", paddingHorizontal:10, paddingVertical:4, borderRadius:20, alignSelf:"flex-start", marginBottom:14 },
  superBadgeText:    { color:"#fca5a5", fontSize:9, fontWeight:"800", letterSpacing:1 },
  welcomeStats:      { flexDirection:"row", alignItems:"center", backgroundColor:"rgba(0,0,0,0.18)", borderRadius:14, paddingVertical:10, paddingHorizontal:14 },
  welcomeStat:       { alignItems:"center", flex:1 },
  welcomeStatVal:    { color:"#fff", fontSize:18, fontWeight:"900" },
  welcomeStatLabel:  { color:"rgba(255,255,255,0.55)", fontSize:9, fontWeight:"600", marginTop:2 },
  welcomeStatDiv:    { width:1, height:26, backgroundColor:"rgba(255,255,255,0.18)" },

  sectionTitle: { color:"#374151", fontSize:11, fontWeight:"700", letterSpacing:1, marginBottom:12, marginTop:4, textTransform:"uppercase" },

  // Stats
  statsGrid:   { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:22 },
  statCard:    { width:(width-52)/2, borderRadius:16, overflow:"hidden", borderWidth:1 },
  statGrad:    { padding:14, borderRadius:16, minHeight:96 },
  statIconBox: { width:34, height:34, borderRadius:10, justifyContent:"center", alignItems:"center", marginBottom:10 },
  statValue:   { fontSize:22, fontWeight:"900" },
  statLabel:   { color:"#64748b", fontSize:11, marginTop:3 },
  statChevron: { position:"absolute", bottom:12, right:12, width:20, height:20, borderRadius:10, justifyContent:"center", alignItems:"center" },

  // Quick
  quickGrid:     { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:22 },
  quickBtn:      { width:(width-52)/3, borderRadius:14, overflow:"hidden" },
  quickBtnGrad:  { padding:12, alignItems:"center", borderRadius:14, borderWidth:1, gap:8, minHeight:82 },
  quickBtnIcon:  { width:40, height:40, borderRadius:12, justifyContent:"center", alignItems:"center" },
  quickBtnLabel: { fontSize:11, fontWeight:"700", textAlign:"center" },
  quickSoon:     { position:"absolute", top:6, right:6 },

  // Menu
  groupHeader: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:8, marginTop:20 },
  groupDot:    { width:6, height:6, borderRadius:3 },
  groupTitle:  { fontSize:11, fontWeight:"800", letterSpacing:1, textTransform:"uppercase" },
  menuGroup:   { backgroundColor:"#0f1b2d", borderRadius:18, overflow:"hidden", marginBottom:8, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  menuRow:     { flexDirection:"row", alignItems:"center", padding:14, gap:12, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.04)" },
  menuRowLast: { borderBottomWidth:0 },
  menuRowIcon: { width:38, height:38, borderRadius:11, justifyContent:"center", alignItems:"center", borderWidth:1 },
  menuRowInfo: { flex:1 },
  menuRowTop:  { flexDirection:"row", alignItems:"center", gap:8 },
  menuRowLabel:{ color:"#fff", fontSize:13, fontWeight:"700" },
  menuRowSub:  { color:"#374151", fontSize:11, marginTop:2 },
  soonBadge:   { backgroundColor:"rgba(100,116,139,0.18)", paddingHorizontal:7, paddingVertical:2, borderRadius:6 },
  soonBadgeText:{ color:"#64748b", fontSize:9, fontWeight:"700" },

  // Danger zone
  dangerZone:     { marginTop:24, marginBottom:8 },
  dangerHeader:   { flexDirection:"row", alignItems:"center", gap:8, marginBottom:12 },
  dangerTitle:    { color:"#f87171", fontSize:11, fontWeight:"800", textTransform:"uppercase", letterSpacing:1 },
  shutdownCard:   { borderRadius:16, overflow:"hidden", marginBottom:10, borderWidth:1, borderColor:"rgba(239,68,68,0.3)" },
  shutdownGrad:   { flexDirection:"row", alignItems:"center", padding:16, gap:14 },
  shutdownIconBox:{ width:44, height:44, borderRadius:13, backgroundColor:"rgba(239,68,68,0.15)", justifyContent:"center", alignItems:"center" },
  shutdownTitle:  { color:"#f87171", fontSize:14, fontWeight:"800" },
  shutdownSub:    { color:"#64748b", fontSize:11, marginTop:2 },
  logoutBtn:      { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, padding:13, backgroundColor:"rgba(248,113,113,0.06)", borderRadius:14, borderWidth:1, borderColor:"rgba(248,113,113,0.15)" },
  logoutText:     { color:"#f87171", fontWeight:"700", fontSize:14 },

  // Tab bar
  tabBar:        { position:"absolute", bottom:0, left:0, right:0, flexDirection:"row", backgroundColor:"#0a0f1a", borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.06)", paddingBottom:20, paddingTop:10 },
  tabItem:       { flex:1, alignItems:"center", gap:3, position:"relative" },
  tabLabel:      { color:"#374151", fontSize:10, fontWeight:"600" },
  tabLabelActive:{ color:"#f87171" },
  tabDot:        { position:"absolute", bottom:-10, width:4, height:4, borderRadius:2, backgroundColor:"#f87171" },

  // Shutdown modal
  modalOverlay:        { flex:1, backgroundColor:"rgba(0,0,0,0.9)", justifyContent:"center", alignItems:"center", padding:20 },
  shutdownModal:       { backgroundColor:"#0f1b2d", borderRadius:24, padding:24, width:"100%", borderWidth:1, borderColor:"rgba(239,68,68,0.3)", alignItems:"center" },
  shutdownModalIcon:   { width:68, height:68, borderRadius:34, justifyContent:"center", alignItems:"center", marginBottom:16 },
  shutdownModalTitle:  { color:"#fff", fontSize:20, fontWeight:"800", textAlign:"center", marginBottom:8 },
  shutdownModalDesc:   { color:"#64748b", fontSize:12, textAlign:"center", lineHeight:18, marginBottom:14 },
  shutdownPt:          { flexDirection:"row", alignItems:"flex-start", gap:8, marginBottom:7, alignSelf:"flex-start" },
  shutdownPtText:      { color:"#94a3b8", fontSize:12, flex:1, lineHeight:17 },
  shutdownConfirmBox:  { width:"100%", marginTop:16, marginBottom:18 },
  shutdownConfirmLabel:{ color:"#94a3b8", fontSize:12, marginBottom:10, textAlign:"center", lineHeight:18 },
  shutdownConfirmInput:{ backgroundColor:"#070d1a", color:"#f87171", borderRadius:12, paddingHorizontal:16, paddingVertical:12, textAlign:"center", fontSize:16, fontWeight:"800", letterSpacing:4, borderWidth:1, borderColor:"rgba(239,68,68,0.4)" },
  shutdownModalBtns:   { flexDirection:"row", gap:12, width:"100%" },
  shutdownCancelBtn:   { flex:1, paddingVertical:13, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", alignItems:"center" },
  shutdownCancelText:  { color:"#94a3b8", fontWeight:"700" },
  shutdownConfirmBtn:  { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:13, borderRadius:12, backgroundColor:"#dc2626" },
  shutdownConfirmText: { color:"#fff", fontWeight:"800", letterSpacing:0.5 },

  // Bottom sheets
  sheetOverlay:     { flex:1, backgroundColor:"rgba(0,0,0,0.8)", justifyContent:"flex-end" },
  sheet:            { backgroundColor:"#0a1220", borderTopLeftRadius:26, borderTopRightRadius:26, maxHeight:"90%", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  sheetHandle:      { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.1)", alignSelf:"center", marginTop:12, marginBottom:4 },
  sheetHeader:      { flexDirection:"row", alignItems:"center", gap:12, paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)" },
  sheetHeaderIcon:  { width:40, height:40, borderRadius:12, justifyContent:"center", alignItems:"center" },
  sheetTitle:       { color:"#fff", fontSize:16, fontWeight:"800" },
  sheetSub:         { color:"#374151", fontSize:11, marginTop:1 },
  sheetClose:       { width:30, height:30, borderRadius:15, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  fieldLabel:       { color:"#94a3b8", fontSize:11, fontWeight:"700", letterSpacing:0.5, textTransform:"uppercase", marginBottom:8, marginTop:14 },
  collegeChip:      { paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.04)", maxWidth:160 },
  collegeChipActive:{ borderColor:"rgba(0,198,255,0.5)", backgroundColor:"rgba(0,198,255,0.1)" },
  collegeChipText:  { color:"#64748b", fontSize:11, fontWeight:"600" },
  noCollegeWarn:    { flexDirection:"row", alignItems:"flex-start", gap:8, backgroundColor:"rgba(245,158,11,0.08)", padding:12, borderRadius:12, marginBottom:10, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  noCollegeWarnText:{ flex:1, color:"#f59e0b", fontSize:11, lineHeight:17 },
  formInput:        { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"#0f1b2d", borderRadius:12, paddingHorizontal:14, paddingVertical:13, marginBottom:10, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  formInputText:    { flex:1, color:"#fff", fontSize:13 },
  submitBtn:        { borderRadius:14, overflow:"hidden", marginTop:14 },
  submitBtnGrad:    { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:15 },
  submitBtnText:    { color:"#fff", fontSize:15, fontWeight:"800" },
  broadcastInfo:    { flexDirection:"row", alignItems:"flex-start", gap:8, backgroundColor:"rgba(96,165,250,0.08)", padding:12, borderRadius:12, marginTop:14, marginBottom:14, borderWidth:1, borderColor:"rgba(96,165,250,0.2)" },
  broadcastInfoText:{ flex:1, color:"#60a5fa", fontSize:12, lineHeight:18 },
  broadcastInput:   { backgroundColor:"#0f1b2d", borderRadius:14, padding:14, color:"#fff", fontSize:13, minHeight:120, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  broadcastCount:   { color:"#1f2937", fontSize:11, textAlign:"right", marginTop:5, marginBottom:4 },
});
