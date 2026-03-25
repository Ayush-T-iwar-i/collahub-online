// app/super-admin/dashboard.js
import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, BackHandler, ToastAndroid, StatusBar,
  RefreshControl, Dimensions, Modal, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const StatCard = ({ icon, label, value, color, onPress }) => (
  <Pressable style={[s.statCard, { borderColor: color + "30" }]} onPress={onPress}>
    <LinearGradient colors={[color + "18", color + "05"]} style={s.statGrad}>
      <View style={[s.statIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.statVal, { color }]}>{value ?? "—"}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <View style={[s.statArrow, { backgroundColor: color + "18" }]}>
        <Ionicons name="arrow-forward" size={10} color={color} />
      </View>
    </LinearGradient>
  </Pressable>
);

const MenuItem = ({ icon, label, sub, color, onPress, last }) => (
  <Pressable style={[s.menuItem, last && s.menuItemLast]} onPress={onPress}>
    <View style={[s.menuIcon, { backgroundColor: color + "18", borderColor: color + "25" }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View style={s.menuInfo}>
      <Text style={s.menuLabel}>{label}</Text>
      <Text style={s.menuSub} numberOfLines={1}>{sub}</Text>
    </View>
    <Ionicons name="chevron-forward" size={14} color={color} />
  </Pressable>
);

export default function SuperAdminDashboard() {
  const router  = useRouter();
  const backRef = useRef(0);

  const [data,      setData]      = useState(null);
  const [stats,     setStats]     = useState(null);
  const [colleges,  setColleges]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  // Shutdown modal
  const [sdModal,   setSdModal]   = useState(false);
  const [sdConfirm, setSdConfirm] = useState("");
  const [sdLoading, setSdLoading] = useState(false);

  // Add admin modal
  const [aaModal,   setAaModal]   = useState(false);
  const [aaForm,    setAaForm]    = useState({ name:"", email:"", password:"", college:"" });
  const [aaLoading, setAaLoading] = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);

  // Broadcast modal
  const [bcModal,   setBcModal]   = useState(false);
  const [bcText,    setBcText]    = useState("");
  const [bcLoading, setBcLoading] = useState(false);

  const loadAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const token = await AsyncStorage.getItem("superAdminLoggedIn");
    if (!token) { router.replace("/login"); return; }
    const raw = await AsyncStorage.getItem("superAdminData");
    if (raw) setData(JSON.parse(raw));
    try { const r = await API.get("/super-admin/stats"); setStats(r.data); } catch {}
    try {
      const r = await API.get("/super-admin/colleges");
      setColleges((r.data?.colleges || []).map(c => typeof c === "string" ? c : c.name).filter(Boolean));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  useFocusEffect(useCallback(() => {
    if (Platform.OS === "web") return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (backRef.current === 0) {
        backRef.current = 1;
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        setTimeout(() => { backRef.current = 0; }, 2000);
        return true;
      }
      BackHandler.exitApp(); return true;
    });
    return () => h.remove();
  }, []));

  const logout = () => Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    { text: "Logout", style: "destructive", onPress: async () => {
      try { await API.post("/auth/logout"); } catch {}
      await AsyncStorage.multiRemove(["accessToken","refreshToken","superAdminData","superAdminLoggedIn"]);
      router.replace("/login");
    }},
  ]);

  const shutdown = async () => {
    if (sdConfirm.trim().toUpperCase() !== "SHUTDOWN")
      return Alert.alert("Error", 'Please type "SHUTDOWN" to confirm');
    setSdLoading(true);
    try {
      await API.post("/super-admin/shutdown");
      setSdModal(false);
      Alert.alert("Done", "All users have been logged out.", [{ text: "OK" }]);
    } catch { Alert.alert("Shutdown", "System shutdown initiated."); }
    finally { setSdLoading(false); }
  };

  const createAdmin = async () => {
    const { name, email, password, college } = aaForm;
    if (!name || !email || !password) return Alert.alert("Required", "Name, email and password are required.");
    if (password.length < 6) return Alert.alert("Password", "Minimum 6 characters required.");
    if (!college) return Alert.alert("Required", "Please select a college.");
    setAaLoading(true);
    try {
      await API.post("/super-admin/create-admin", aaForm);
      setAaModal(false);
      setAaForm({ name:"", email:"", password:"", college:"" });
      Alert.alert("Success!", "Admin account created successfully.");
      loadAll();
    } catch (e) { Alert.alert("Error", e.response?.data?.message || "Failed to create admin."); }
    finally { setAaLoading(false); }
  };

  const broadcast = async () => {
    if (!bcText.trim()) return Alert.alert("Required", "Please write a message.");
    setBcLoading(true);
    try {
      await API.post("/super-admin/broadcast", { message: bcText });
      setBcModal(false); setBcText("");
      Alert.alert("Sent!", "Announcement sent to all users.");
    } catch (e) { Alert.alert("Error", e.response?.data?.message || "Failed to send."); }
    finally { setBcLoading(false); }
  };

  const go = (route) => router.push(route);

  if (loading) return (
    <View style={s.loader}><ActivityIndicator size="large" color="#f87171" /></View>
  );

  const statsItems = [
    { icon:"business",         label:"Colleges",  value:stats?.totalColleges,    color:"#00c6ff", route:"/super-admin/colleges"      },
    { icon:"shield-checkmark", label:"Admins",    value:stats?.totalAdmins,      color:"#a78bfa", route:"/super-admin/manage-admins"  },
    { icon:"people",           label:"Students",  value:stats?.totalStudents,    color:"#34d399", route:"/super-admin/students"       },
    { icon:"person",           label:"Teachers",  value:stats?.totalTeachers,    color:"#f59e0b", route:"/super-admin/teachers"       },
    { icon:"book",             label:"Subjects",  value:stats?.totalSubjects,    color:"#60a5fa", route:"/super-admin/subjects"       },
    { icon:"newspaper",        label:"Posts",     value:stats?.totalPosts,       color:"#f87171", route:"/super-admin/posts"          },
    { icon:"trophy",           label:"Results",   value:stats?.totalResults,     color:"#e879f9", route:"/super-admin/results"        },
    { icon:"bar-chart",        label:"Analytics", value:null,                    color:"#22d3ee", route:"/super-admin/analytics"      },
  ];

  const menuItems = [
    { icon:"business",         label:"Manage Colleges",    sub:`${stats?.totalColleges||0} colleges registered`,  color:"#00c6ff", route:"/super-admin/colleges"      },
    { icon:"shield-checkmark", label:"Manage Admins",      sub:`${stats?.totalAdmins||0} admins active`,           color:"#a78bfa", route:"/super-admin/manage-admins"  },
    { icon:"people",           label:"All Students",       sub:`${stats?.totalStudents||0} students`,              color:"#34d399", route:"/super-admin/students"       },
    { icon:"person",           label:"All Teachers",       sub:`${stats?.totalTeachers||0} teachers`,              color:"#f59e0b", route:"/super-admin/teachers"       },
    { icon:"book",             label:"All Subjects",       sub:"System-wide subjects",                             color:"#60a5fa", route:"/super-admin/subjects"       },
    { icon:"calendar",         label:"Attendance Reports", sub:"College-wise attendance",                          color:"#34d399", route:"/super-admin/attendance"     },
    { icon:"trophy",           label:"All Results",        sub:"SGPA / CGPA across colleges",                     color:"#e879f9", route:"/super-admin/results"        },
    { icon:"bar-chart",        label:"Analytics",          sub:"Platform overview & stats",                        color:"#22d3ee", route:"/super-admin/analytics"      },
    { icon:"megaphone",        label:"Announcements",      sub:"Global broadcast & notices",                       color:"#f59e0b", route:"/super-admin/announcements"  },
    { icon:"newspaper",        label:"All Posts",          sub:"Manage posts & feed",                              color:"#f87171", route:"/super-admin/posts"          },
    { icon:"receipt",          label:"Finance Overview",   sub:"Fee & revenue overview",                           color:"#10b981", route:"/super-admin/finance"        },
    { icon:"settings",         label:"System Settings",    sub:"App config & preferences",                         color:"#64748b", route:"/super-admin/settings"       },
  ];

  const quickActions = [
    { icon:"business",   label:"Colleges",  color:"#00c6ff", fn:()=>go("/super-admin/colleges")      },
    { icon:"person-add", label:"Add Admin", color:"#a78bfa", fn:()=>setAaModal(true)                 },
    { icon:"megaphone",  label:"Broadcast", color:"#f59e0b", fn:()=>setBcModal(true)                  },
    { icon:"people",     label:"Students",  color:"#34d399", fn:()=>go("/super-admin/students")      },
    { icon:"person",     label:"Teachers",  color:"#f59e0b", fn:()=>go("/super-admin/teachers")      },
    { icon:"bar-chart",  label:"Analytics", color:"#22d3ee", fn:()=>go("/super-admin/analytics")     },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={["#0d0000","#1a0000"]} style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerBadge}>
            <Ionicons name="star" size={16} color="#f87171" />
          </View>
          <View>
            <Text style={s.headerTitle}>Super Admin</Text>
            <Text style={s.headerSub}>Full System Access</Text>
          </View>
        </View>
        <Pressable onPress={() => { setSdConfirm(""); setSdModal(true); }} style={s.powerBtn}>
          <Ionicons name="power" size={18} color="#f87171" />
        </Pressable>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#f87171" />}
        contentContainerStyle={s.body}>

        {/* Welcome */}
        <LinearGradient colors={["#7f1d1d","#b91c1c"]}
          start={{x:0,y:0}} end={{x:1,y:1}} style={s.welcome}>
          <View style={{flex:1}}>
            <Text style={s.welcomeHi}>Hello, {data?.name?.split(" ")[0] || "Super Admin"} 👋</Text>
            <Text style={s.welcomeSub}>Super Administrator · COLLAहUB</Text>
            <View style={s.welcomeBadge}>
              <Ionicons name="star" size={10} color="#fca5a5" />
              <Text style={s.welcomeBadgeText}>FULL SYSTEM ACCESS</Text>
            </View>
            <View style={s.welcomeRow}>
              {[
                { label:"Colleges", val:stats?.totalColleges },
                { label:"Students", val:stats?.totalStudents },
                { label:"Admins",   val:stats?.totalAdmins   },
              ].map((x,i) => (
                <React.Fragment key={i}>
                  {i>0 && <View style={s.welcomeDivider}/>}
                  <View style={s.welcomeItem}>
                    <Text style={s.welcomeVal}>{x.val??0}</Text>
                    <Text style={s.welcomeItemLabel}>{x.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
          <Ionicons name="globe" size={52} color="rgba(255,255,255,0.1)" />
        </LinearGradient>

        {/* Stats grid */}
        <Text style={s.sectionTitle}>SYSTEM OVERVIEW</Text>
        <View style={s.statsGrid}>
          {statsItems.map((x,i) => (
            <StatCard key={i} icon={x.icon} label={x.label} value={x.value}
              color={x.color} onPress={() => go(x.route)} />
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>QUICK ACTIONS</Text>
        <View style={s.quickGrid}>
          {quickActions.map((q,i) => (
            <Pressable key={i} style={s.quickBtn} onPress={q.fn}>
              <LinearGradient colors={[q.color+"22",q.color+"08"]}
                style={[s.quickGrad,{borderColor:q.color+"30"}]}>
                <View style={[s.quickIcon,{backgroundColor:q.color+"20"}]}>
                  <Ionicons name={q.icon} size={22} color={q.color} />
                </View>
                <Text style={[s.quickLabel,{color:q.color}]}>{q.label}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* Menu */}
        <Text style={s.sectionTitle}>ALL FEATURES</Text>
        <View style={s.menuCard}>
          {menuItems.map((m,i) => (
            <MenuItem key={i} icon={m.icon} label={m.label} sub={m.sub}
              color={m.color} last={i===menuItems.length-1}
              onPress={() => go(m.route)} />
          ))}
        </View>

        {/* Danger */}
        <Text style={[s.sectionTitle,{color:"#f87171"}]}>DANGER ZONE</Text>
        <Pressable style={s.shutdownCard}
          onPress={() => { setSdConfirm(""); setSdModal(true); }}>
          <View style={s.shutdownIconBox}>
            <Ionicons name="power" size={22} color="#f87171" />
          </View>
          <View style={{flex:1}}>
            <Text style={s.shutdownTitle}>Emergency Shutdown</Text>
            <Text style={s.shutdownSub}>Instantly logs out ALL users system-wide</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#f87171" />
        </Pressable>
        <Pressable style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color="#f87171" />
          <Text style={s.logoutText}>Logout</Text>
        </Pressable>

        <View style={{height:100}} />
      </ScrollView>

      {/* Bottom Tab */}
      <View style={s.tabBar}>
        {[
          { icon:"home",             label:"Home",     fn:()=>{}                                  },
          { icon:"business",         label:"Colleges", fn:()=>go("/super-admin/colleges")         },
          { icon:"shield-checkmark", label:"Admins",   fn:()=>go("/super-admin/manage-admins")   },
          { icon:"people",           label:"Students", fn:()=>go("/super-admin/students")        },
          { icon:"settings",         label:"Settings", fn:()=>go("/super-admin/settings")        },
        ].map((t,i) => (
          <Pressable key={i} style={s.tabItem} onPress={t.fn}>
            <Ionicons name={i===0?t.icon:t.icon+"-outline"} size={21}
              color={i===0?"#f87171":"#374151"} />
            <Text style={[s.tabLabel,i===0&&{color:"#f87171"}]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Shutdown Modal ── */}
      <Modal visible={sdModal} transparent animationType="fade"
        onRequestClose={() => !sdLoading && setSdModal(false)}>
        <View style={s.overlay}>
          <View style={s.sdModal}>
            <LinearGradient colors={["#7f1d1d","#ef4444"]} style={s.sdIcon}>
              <Ionicons name="power" size={32} color="#fff" />
            </LinearGradient>
            <Text style={s.sdTitle}>Emergency Shutdown</Text>
            <Text style={s.sdDesc}>This will immediately log out ALL users from the entire system.</Text>
            {[
              "All students, teachers and admins will be signed out",
              "All active sessions will be expired immediately",
              "All refresh tokens will be cleared from database",
            ].map((pt,i) => (
              <View key={i} style={s.sdPt}>
                <Ionicons name="alert-circle" size={12} color="#f87171" />
                <Text style={s.sdPtText}>{pt}</Text>
              </View>
            ))}
            <Text style={s.sdConfirmLabel}>
              Type <Text style={{color:"#f87171",fontWeight:"800"}}>SHUTDOWN</Text> to confirm
            </Text>
            <TextInput style={s.sdInput}
              placeholder="SHUTDOWN" placeholderTextColor="#374151"
              value={sdConfirm} onChangeText={setSdConfirm}
              autoCapitalize="characters" />
            <View style={s.sdBtns}>
              <Pressable style={s.sdCancel} onPress={()=>setSdModal(false)} disabled={sdLoading}>
                <Text style={s.sdCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.sdConfirm, sdConfirm.trim().toUpperCase()!=="SHUTDOWN"&&{opacity:0.3}]}
                onPress={shutdown}
                disabled={sdLoading||sdConfirm.trim().toUpperCase()!=="SHUTDOWN"}>
                {sdLoading
                  ? <ActivityIndicator size="small" color="#fff"/>
                  : <><Ionicons name="power" size={13} color="#fff"/>
                      <Text style={s.sdConfirmText}>SHUTDOWN</Text></>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Admin Modal ── */}
      <Modal visible={aaModal} transparent animationType="slide"
        onRequestClose={()=>!aaLoading&&setAaModal(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
          <View style={s.sheetOverlay}>
            <View style={s.sheet}>
              <View style={s.handle}/>
              <View style={s.sheetHead}>
                <LinearGradient colors={["#00c6ff","#0072ff"]} style={s.sheetHeadIcon}>
                  <Ionicons name="shield-checkmark" size={18} color="#fff"/>
                </LinearGradient>
                <View style={{flex:1}}>
                  <Text style={s.sheetTitle}>Create Admin</Text>
                  <Text style={s.sheetSub}>New college admin account</Text>
                </View>
                <Pressable onPress={()=>setAaModal(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={18} color="#64748b"/>
                </Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled"
                contentContainerStyle={{paddingHorizontal:20,paddingBottom:50}}>
                <Text style={s.fieldLabel}>College *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{gap:8,marginBottom:14}}>
                  {colleges.map((c,i)=>(
                    <Pressable key={i}
                      style={[s.collegeChip, aaForm.college===c&&s.collegeChipActive]}
                      onPress={()=>setAaForm(p=>({...p,college:c}))}>
                      <Text style={[s.collegeChipText,aaForm.college===c&&{color:"#00c6ff"}]}
                        numberOfLines={1}>{c}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {colleges.length===0&&(
                  <TextInput style={s.input} placeholder="College name"
                    placeholderTextColor="#374151" value={aaForm.college}
                    onChangeText={v=>setAaForm(p=>({...p,college:v}))}/>
                )}
                <Text style={s.fieldLabel}>Full Name *</Text>
                <TextInput style={s.input} placeholder="Admin full name"
                  placeholderTextColor="#374151" value={aaForm.name}
                  onChangeText={v=>setAaForm(p=>({...p,name:v}))}/>
                <Text style={s.fieldLabel}>Email *</Text>
                <TextInput style={s.input} placeholder="admin@college.edu"
                  placeholderTextColor="#374151" keyboardType="email-address"
                  autoCapitalize="none" value={aaForm.email}
                  onChangeText={v=>setAaForm(p=>({...p,email:v}))}/>
                <Text style={s.fieldLabel}>Password * (min 6)</Text>
                <View style={[s.input,{flexDirection:"row",alignItems:"center",paddingVertical:0}]}>
                  <TextInput style={{flex:1,color:"#fff",fontSize:14,paddingVertical:12}}
                    placeholder="Password" placeholderTextColor="#374151"
                    secureTextEntry={!showPwd} value={aaForm.password}
                    onChangeText={v=>setAaForm(p=>({...p,password:v}))}/>
                  <Pressable onPress={()=>setShowPwd(p=>!p)} style={{paddingRight:4}}>
                    <Ionicons name={showPwd?"eye-off-outline":"eye-outline"} size={16} color="#64748b"/>
                  </Pressable>
                </View>
                <Pressable style={[s.submitBtn,aaLoading&&{opacity:0.6}]}
                  onPress={createAdmin} disabled={aaLoading}>
                  <LinearGradient colors={["#00c6ff","#0072ff"]} style={s.submitGrad}>
                    {aaLoading
                      ? <ActivityIndicator size="small" color="#fff"/>
                      : <><Ionicons name="shield-checkmark-outline" size={16} color="#fff"/>
                          <Text style={s.submitText}>Create Admin Account</Text></>}
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Broadcast Modal ── */}
      <Modal visible={bcModal} transparent animationType="slide"
        onRequestClose={()=>!bcLoading&&setBcModal(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
          <View style={s.sheetOverlay}>
            <View style={s.sheet}>
              <View style={s.handle}/>
              <View style={s.sheetHead}>
                <LinearGradient colors={["#f59e0b","#d97706"]} style={s.sheetHeadIcon}>
                  <Ionicons name="megaphone" size={18} color="#fff"/>
                </LinearGradient>
                <View style={{flex:1}}>
                  <Text style={s.sheetTitle}>Global Broadcast</Text>
                  <Text style={s.sheetSub}>Send to all users across all colleges</Text>
                </View>
                <Pressable onPress={()=>setBcModal(false)} style={s.closeBtn}>
                  <Ionicons name="close" size={18} color="#64748b"/>
                </Pressable>
              </View>
              <View style={{paddingHorizontal:20,paddingBottom:50}}>
                <View style={s.bcInfo}>
                  <Ionicons name="information-circle" size={15} color="#60a5fa"/>
                  <Text style={s.bcInfoText}>
                    This message will be delivered to ALL students, teachers and admins instantly.
                  </Text>
                </View>
                <TextInput style={s.bcInput}
                  placeholder="Write your announcement here..."
                  placeholderTextColor="#374151"
                  value={bcText} onChangeText={setBcText}
                  multiline maxLength={500} textAlignVertical="top"/>
                <Text style={s.bcCount}>{bcText.length}/500</Text>
                <Pressable style={[s.submitBtn,bcLoading&&{opacity:0.6}]}
                  onPress={broadcast} disabled={bcLoading}>
                  <LinearGradient colors={["#f59e0b","#d97706"]} style={s.submitGrad}>
                    {bcLoading
                      ? <ActivityIndicator size="small" color="#fff"/>
                      : <><Ionicons name="megaphone" size={16} color="#fff"/>
                          <Text style={s.submitText}>Send to All Users</Text></>}
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

const s = StyleSheet.create({
  container:    { flex:1, backgroundColor:"#070d1a" },
  loader:       { flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#070d1a" },
  header:       { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  headerLeft:   { flexDirection:"row", alignItems:"center", gap:12 },
  headerBadge:  { width:40, height:40, borderRadius:12, backgroundColor:"rgba(248,113,113,0.14)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(248,113,113,0.3)" },
  headerTitle:  { color:"#fff", fontSize:16, fontWeight:"800" },
  headerSub:    { color:"#374151", fontSize:11, marginTop:1 },
  powerBtn:     { width:40, height:40, borderRadius:12, backgroundColor:"rgba(248,113,113,0.1)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(248,113,113,0.25)" },
  body:         { paddingHorizontal:16, paddingBottom:30 },
  // Welcome
  welcome:      { borderRadius:22, padding:22, marginTop:14, marginBottom:22, flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start" },
  welcomeHi:    { color:"#fff", fontSize:20, fontWeight:"800", marginBottom:4 },
  welcomeSub:   { color:"rgba(255,255,255,0.65)", fontSize:12, marginBottom:10 },
  welcomeBadge: { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(0,0,0,0.22)", paddingHorizontal:10, paddingVertical:4, borderRadius:20, alignSelf:"flex-start", marginBottom:14 },
  welcomeBadgeText:{ color:"#fca5a5", fontSize:9, fontWeight:"800", letterSpacing:1 },
  welcomeRow:   { flexDirection:"row", backgroundColor:"rgba(0,0,0,0.18)", borderRadius:14, paddingVertical:10, paddingHorizontal:14 },
  welcomeItem:  { alignItems:"center", flex:1 },
  welcomeVal:   { color:"#fff", fontSize:17, fontWeight:"900" },
  welcomeItemLabel:{ color:"rgba(255,255,255,0.5)", fontSize:9, fontWeight:"600", marginTop:2 },
  welcomeDivider:{ width:1, height:26, backgroundColor:"rgba(255,255,255,0.18)" },
  // Section title
  sectionTitle: { color:"#374151", fontSize:10, fontWeight:"800", letterSpacing:1.5, marginBottom:12, marginTop:4 },
  // Stats
  statsGrid:    { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:22 },
  statCard:     { width:(width-52)/2, borderRadius:16, overflow:"hidden", borderWidth:1 },
  statGrad:     { padding:14, minHeight:96 },
  statIcon:     { width:34, height:34, borderRadius:10, justifyContent:"center", alignItems:"center", marginBottom:10 },
  statVal:      { fontSize:22, fontWeight:"900" },
  statLabel:    { color:"#64748b", fontSize:11, marginTop:3 },
  statArrow:    { position:"absolute", bottom:12, right:12, width:20, height:20, borderRadius:10, justifyContent:"center", alignItems:"center" },
  // Quick actions
  quickGrid:    { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:22 },
  quickBtn:     { width:(width-52)/3, borderRadius:14, overflow:"hidden" },
  quickGrad:    { padding:12, alignItems:"center", borderRadius:14, borderWidth:1, gap:8, minHeight:82 },
  quickIcon:    { width:40, height:40, borderRadius:12, justifyContent:"center", alignItems:"center" },
  quickLabel:   { fontSize:11, fontWeight:"700", textAlign:"center" },
  // Menu
  menuCard:     { backgroundColor:"#0f1b2d", borderRadius:18, overflow:"hidden", marginBottom:22, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  menuItem:     { flexDirection:"row", alignItems:"center", padding:14, gap:12, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.04)" },
  menuItemLast: { borderBottomWidth:0 },
  menuIcon:     { width:38, height:38, borderRadius:11, justifyContent:"center", alignItems:"center", borderWidth:1 },
  menuInfo:     { flex:1 },
  menuLabel:    { color:"#fff", fontSize:13, fontWeight:"700" },
  menuSub:      { color:"#374151", fontSize:11, marginTop:2 },
  // Danger
  shutdownCard: { flexDirection:"row", alignItems:"center", gap:14, backgroundColor:"rgba(239,68,68,0.08)", borderRadius:16, padding:16, marginBottom:10, borderWidth:1, borderColor:"rgba(239,68,68,0.25)" },
  shutdownIconBox:{ width:44, height:44, borderRadius:13, backgroundColor:"rgba(239,68,68,0.15)", justifyContent:"center", alignItems:"center" },
  shutdownTitle:{ color:"#f87171", fontSize:14, fontWeight:"800" },
  shutdownSub:  { color:"#64748b", fontSize:11, marginTop:2 },
  logoutBtn:    { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, padding:13, backgroundColor:"rgba(248,113,113,0.06)", borderRadius:14, borderWidth:1, borderColor:"rgba(248,113,113,0.15)" },
  logoutText:   { color:"#f87171", fontWeight:"700", fontSize:14 },
  // Tab bar
  tabBar:       { position:"absolute", bottom:0, left:0, right:0, flexDirection:"row", backgroundColor:"#0a0f1a", borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.06)", paddingBottom:20, paddingTop:10 },
  tabItem:      { flex:1, alignItems:"center", gap:3 },
  tabLabel:     { color:"#374151", fontSize:10, fontWeight:"600" },
  // Shutdown modal
  overlay:      { flex:1, backgroundColor:"rgba(0,0,0,0.92)", justifyContent:"center", alignItems:"center", padding:20 },
  sdModal:      { backgroundColor:"#0f1b2d", borderRadius:24, padding:24, width:"100%", borderWidth:1, borderColor:"rgba(239,68,68,0.3)", alignItems:"center" },
  sdIcon:       { width:68, height:68, borderRadius:34, justifyContent:"center", alignItems:"center", marginBottom:16 },
  sdTitle:      { color:"#fff", fontSize:20, fontWeight:"800", textAlign:"center", marginBottom:8 },
  sdDesc:       { color:"#64748b", fontSize:12, textAlign:"center", lineHeight:18, marginBottom:14 },
  sdPt:         { flexDirection:"row", alignItems:"flex-start", gap:8, marginBottom:7, alignSelf:"flex-start" },
  sdPtText:     { color:"#94a3b8", fontSize:12, flex:1, lineHeight:17 },
  sdConfirmLabel:{ color:"#94a3b8", fontSize:12, marginTop:16, marginBottom:10, textAlign:"center", lineHeight:18 },
  sdInput:      { backgroundColor:"#070d1a", color:"#f87171", borderRadius:12, paddingHorizontal:16, paddingVertical:12, textAlign:"center", fontSize:16, fontWeight:"800", letterSpacing:4, borderWidth:1, borderColor:"rgba(239,68,68,0.4)", width:"100%", marginBottom:18 },
  sdBtns:       { flexDirection:"row", gap:12, width:"100%" },
  sdCancel:     { flex:1, paddingVertical:13, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", alignItems:"center" },
  sdCancelText: { color:"#94a3b8", fontWeight:"700" },
  sdConfirm:    { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:13, borderRadius:12, backgroundColor:"#dc2626" },
  sdConfirmText:{ color:"#fff", fontWeight:"800", letterSpacing:0.5 },
  // Sheets
  sheetOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.82)", justifyContent:"flex-end" },
  sheet:        { backgroundColor:"#0a1220", borderTopLeftRadius:26, borderTopRightRadius:26, maxHeight:"92%", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  handle:       { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.1)", alignSelf:"center", marginTop:12, marginBottom:4 },
  sheetHead:    { flexDirection:"row", alignItems:"center", gap:12, paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)" },
  sheetHeadIcon:{ width:42, height:42, borderRadius:12, justifyContent:"center", alignItems:"center" },
  sheetTitle:   { color:"#fff", fontSize:16, fontWeight:"800" },
  sheetSub:     { color:"#374151", fontSize:11, marginTop:1 },
  closeBtn:     { width:32, height:32, borderRadius:16, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  fieldLabel:   { color:"#94a3b8", fontSize:11, fontWeight:"700", letterSpacing:0.5, textTransform:"uppercase", marginBottom:8, marginTop:14 },
  input:        { backgroundColor:"#0f1b2d", color:"#fff", borderRadius:12, paddingHorizontal:14, paddingVertical:12, fontSize:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", marginBottom:4 },
  collegeChip:  { paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.04)", maxWidth:160 },
  collegeChipActive:{ borderColor:"rgba(0,198,255,0.5)", backgroundColor:"rgba(0,198,255,0.1)" },
  collegeChipText:{ color:"#64748b", fontSize:11, fontWeight:"600" },
  submitBtn:    { borderRadius:14, overflow:"hidden", marginTop:16 },
  submitGrad:   { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:15 },
  submitText:   { color:"#fff", fontSize:15, fontWeight:"800" },
  bcInfo:       { flexDirection:"row", alignItems:"flex-start", gap:8, backgroundColor:"rgba(96,165,250,0.08)", padding:12, borderRadius:12, marginTop:14, marginBottom:14, borderWidth:1, borderColor:"rgba(96,165,250,0.2)" },
  bcInfoText:   { flex:1, color:"#60a5fa", fontSize:12, lineHeight:18 },
  bcInput:      { backgroundColor:"#0f1b2d", borderRadius:14, padding:14, color:"#fff", fontSize:13, minHeight:120, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  bcCount:      { color:"#1f2937", fontSize:11, textAlign:"right", marginTop:5, marginBottom:4 },
});