import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  TextInput, Modal, ScrollView, Dimensions, Image,
  Alert, Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");
const SEMESTERS = ["All", "1", "2", "3", "4", "5", "6", "7", "8"];

const DEPT_COLORS = {
  "CSE":"#00c6ff","ECE":"#a78bfa","ME":"#f59e0b",
  "CE":"#34d399","IT":"#f87171","EE":"#60a5fa",
  "AI":"#fb923c","DATA":"#34d399","BDS":"#f472b6",
  "MDS":"#f472b6","LLB":"#818cf8","BBA":"#4ade80",
};
const getColor = (dept="") => {
  const key = Object.keys(DEPT_COLORS).find(k => dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#64748b";
};

const openEmail = (email) => {
  if (!email) return;
  Linking.openURL(`mailto:${email}`).catch(() => Alert.alert("Error","Could not open email app"));
};
const openPhone = (phone) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Error","Could not open phone app"));
};

const StudentCard = ({ item, onPress }) => {
  const color    = getColor(item.department);
  const initials = item.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"S";
  const deptShort= item.department?.match(/\(([^)]+)\)/)?.[1]||item.department?.split(" ")[0]||"";
  return (
    <Pressable style={styles.card} onPress={()=>onPress(item)}>
      <View style={[styles.cardLeft,{backgroundColor:color+"12"}]}>
        {item.profileImage
          ? <Image source={{uri:item.profileImage}} style={styles.avatarImg}/>
          : <View style={[styles.avatarCircle,{backgroundColor:color+"22"}]}>
              <Text style={[styles.avatarText,{color}]}>{initials}</Text>
            </View>
        }
      </View>
      <View style={styles.cardBody}>
        <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}>
          <View style={{flex:1,paddingRight:8}}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardId}>{item.studentId||"—"}</Text>
          </View>
          <View style={styles.actionIcons}>
            {item.email&&(
              <Pressable style={styles.actionIcon} onPress={(e)=>{e.stopPropagation?.();openEmail(item.email);}}>
                <Ionicons name="mail-outline" size={17} color="#00c6ff"/>
              </Pressable>
            )}
            {item.phone&&(
              <Pressable style={[styles.actionIcon,{backgroundColor:"rgba(52,211,153,0.12)"}]} onPress={(e)=>{e.stopPropagation?.();openPhone(item.phone);}}>
                <Ionicons name="call-outline" size={17} color="#34d399"/>
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.cardMeta}>
          {deptShort&&<View style={[styles.deptBadge,{backgroundColor:color+"20"}]}><Text style={[styles.deptBadgeText,{color}]}>{deptShort}</Text></View>}
          {item.semester&&<View style={styles.semBadge}><Text style={styles.semBadgeText}>Sem {item.semester}</Text></View>}
          {item.admissionYear&&<View style={styles.yearBadge}><Text style={styles.yearBadgeText}>{item.admissionYear}</Text></View>}
          {item.section&&item.section!=="All"&&<View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>Sec {item.section}</Text></View>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#475569" style={{paddingRight:14}}/>
    </Pressable>
  );
};

const DetailModal = ({ student, visible, onClose }) => {
  if (!student) return null;
  const color    = getColor(student.department);
  const initials = student.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"S";
  const InfoRow  = ({ icon, label, value, accent, onTap }) => (
    <Pressable style={styles.infoRow} onPress={onTap} disabled={!onTap}>
      <View style={[styles.infoIcon,{backgroundColor:(accent||color)+"18"}]}>
        <Ionicons name={icon} size={15} color={accent||color}/>
      </View>
      <View style={{flex:1}}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue,onTap&&{color:accent||color,textDecorationLine:"underline"}]} numberOfLines={2}>{value||"—"}</Text>
      </View>
      {onTap&&<Ionicons name="arrow-forward-outline" size={14} color={accent||color}/>}
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <Pressable style={{flex:1}} onPress={onClose}/>
        <View style={styles.detailSheet}>
          <View style={styles.handle}/>
          <LinearGradient colors={[color+"25","transparent"]} style={styles.detailHero}>
            <View style={[styles.detailAvatar,{borderColor:color+"60"}]}>
              {student.profileImage
                ?<Image source={{uri:student.profileImage}} style={styles.detailAvatarImg}/>
                :<Text style={[styles.detailAvatarText,{color}]}>{initials}</Text>
              }
            </View>
            <Text style={styles.detailName}>{student.name}</Text>
            <Text style={styles.detailStudentId}>{student.studentId||"—"}</Text>
            <View style={styles.quickActions}>
              {student.email&&(
                <Pressable style={[styles.quickBtn,{backgroundColor:"rgba(0,198,255,0.15)",borderColor:"rgba(0,198,255,0.3)"}]} onPress={()=>openEmail(student.email)}>
                  <Ionicons name="mail" size={16} color="#00c6ff"/>
                  <Text style={[styles.quickBtnText,{color:"#00c6ff"}]}>Email</Text>
                </Pressable>
              )}
              {student.phone&&(
                <Pressable style={[styles.quickBtn,{backgroundColor:"rgba(52,211,153,0.15)",borderColor:"rgba(52,211,153,0.3)"}]} onPress={()=>openPhone(student.phone)}>
                  <Ionicons name="call" size={16} color="#34d399"/>
                  <Text style={[styles.quickBtnText,{color:"#34d399"}]}>Call</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.detailBadgesRow}>
              {student.department&&<View style={[styles.detailBadge,{backgroundColor:color+"22",borderColor:color+"40"}]}><Text style={[styles.detailBadgeText,{color}]} numberOfLines={1}>{student.department.match(/\(([^)]+)\)/)?.[1]||student.department.split(" ")[0]}</Text></View>}
              {student.semester&&<View style={[styles.detailBadge,{backgroundColor:"rgba(255,255,255,0.06)",borderColor:"rgba(255,255,255,0.1)"}]}><Text style={[styles.detailBadgeText,{color:"#94a3b8"}]}>Sem {student.semester}</Text></View>}
              {student.admissionYear&&<View style={[styles.detailBadge,{backgroundColor:"rgba(245,158,11,0.12)",borderColor:"rgba(245,158,11,0.25)"}]}><Text style={[styles.detailBadgeText,{color:"#f59e0b"}]}>{student.admissionYear}</Text></View>}
            </View>
          </LinearGradient>
          <ScrollView style={{maxHeight:height*0.36}} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              <InfoRow icon="mail-outline"       label="Email"          value={student.email}         accent="#00c6ff" onTap={student.email ?()=>openEmail(student.email) :null}/>
              <InfoRow icon="call-outline"        label="Phone"          value={student.phone}         accent="#34d399" onTap={student.phone ?()=>openPhone(student.phone) :null}/>
              <InfoRow icon="business-outline"    label="College"        value={student.college}       accent="#a78bfa"/>
              <InfoRow icon="school-outline"      label="Department"     value={student.department}    accent={color}/>
              <InfoRow icon="calendar-outline"    label="Admission Year" value={student.admissionYear} accent="#f59e0b"/>
              <InfoRow icon="people-outline"      label="Section"        value={student.section}       accent="#34d399"/>
              <InfoRow icon="male-female-outline" label="Gender"         value={student.gender}        accent="#f472b6"/>
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

export default function TeacherStudents() {
  const navigation = useNavigation();
  const [students,   setStudents]   = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState("");
  const [selSem,     setSelSem]     = useState("All");
  const [selStudent, setSelStudent] = useState(null);
  const [detailVis,  setDetailVis]  = useState(false);
  const [teacherInfo,setTeacherInfo]= useState(null);

  useFocusEffect(useCallback(()=>{ loadTeacherAndStudents(); },[]) );

  const loadTeacherAndStudents = async (isRefresh=false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const raw     = await AsyncStorage.getItem("teacherData");
      const tData   = raw ? JSON.parse(raw) : {};
      const college = tData.college    || tData.user?.college    || "";
      const dept    = tData.department || tData.user?.department || "";
      setTeacherInfo({ college, department:dept });
      if (!college || !dept) {
        Alert.alert("Error","Teacher college/department not found. Please re-login.");
        setStudents([]); setFiltered([]); return;
      }
      const res  = await API.get("/students/all",{ params:{ college, department:dept } });
      const data = res.data?.students || res.data || [];
      setStudents(data);
      applyFilters("","All",data);
    } catch(e) {
      console.log("Load students error:",e.message);
      setStudents([]); setFiltered([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const applyFilters = (q, sem, list=students) => {
    let r = [...list];
    if (q?.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(s=>(s.name||"").toLowerCase().includes(lq)||(s.studentId||"").toLowerCase().includes(lq)||(s.email||"").toLowerCase().includes(lq));
    }
    if (sem && sem!=="All") r = r.filter(s=>String(s.semester)===String(sem));
    setFiltered(r);
  };

  const deptShort = teacherInfo?.department?.match(/\(([^)]+)\)/)?.[1] || teacherInfo?.department?.split(" ")[0] || "";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17"/>

      {/* Header */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={()=>navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Students</Text>
          <Text style={styles.headerSub}>{filtered.length} students</Text>
        </View>
        <View style={{width:40}}/>
      </LinearGradient>

      {/* ✅ Fixed layout — no gap */}
      {teacherInfo?.college && (
        <View style={styles.teacherBanner}>
          <Ionicons name="filter-outline" size={13} color="#f59e0b"/>
          <Text style={styles.teacherBannerText} numberOfLines={1}>
            Showing: <Text style={{color:"#f59e0b",fontWeight:"700"}}>{deptShort}</Text>
            {" · "}<Text style={{color:"#94a3b8"}}>{teacherInfo.college}</Text>
          </Text>
        </View>
      )}

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#64748b"/>
        <TextInput style={styles.searchInput} placeholder="Search name, ID, email..."
          placeholderTextColor="#374151" value={search}
          onChangeText={t=>{ setSearch(t); applyFilters(t,selSem); }}/>
        {search.length>0&&(
          <Pressable onPress={()=>{ setSearch(""); applyFilters("",selSem); }}>
            <Ionicons name="close-circle" size={16} color="#64748b"/>
          </Pressable>
        )}
      </View>

      {/* ✅ Sem filter — fixed height, no gap */}
      <View style={styles.chipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}>
          {SEMESTERS.map(s=>{
            const act = selSem===s;
            return (
              <Pressable key={s} style={[styles.chip, act&&styles.chipActive]}
                onPress={()=>{ setSelSem(s); applyFilters(search,s); }}>
                <Text style={[styles.chipText, act&&{color:"#a78bfa"}]}>
                  {s==="All"?"All Sem":`Sem ${s}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary */}
      {!loading && students.length>0 && (
        <Text style={styles.summaryText}>
          {filtered.length} of {students.length} students{selSem!=="All"?` · Sem ${selSem}`:""}
        </Text>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff"/></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i=>i._id||i.studentId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadTeacherAndStudents(true)} tintColor="#00c6ff"/>}
          ListEmptyComponent={()=>(
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="people-outline" size={36} color="#374151"/></View>
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptySub}>{search?"Try a different search":"No students in your department"}</Text>
            </View>
          )}
          renderItem={({item})=>(
            <StudentCard item={item} onPress={s=>{ setSelStudent(s); setDetailVis(true); }}/>
          )}
        />
      )}

      <DetailModal student={selStudent} visible={detailVis} onClose={()=>setDetailVis(false)}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex:1, backgroundColor:"#080d17" },
  center:           { flex:1, justifyContent:"center", alignItems:"center" },

  header:           { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:12 },
  menuBtn:          { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  headerCenter:     { flex:1, alignItems:"center" },
  headerTitle:      { color:"#fff", fontSize:18, fontWeight:"800" },
  headerSub:        { color:"#94a3b8", fontSize:12, marginTop:2 },

  teacherBanner:    { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(245,158,11,0.08)", marginHorizontal:16, marginTop:6, marginBottom:6, padding:9, borderRadius:10, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  teacherBannerText:{ flex:1, color:"#94a3b8", fontSize:11 },

  searchBar:        { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#0f1720", marginHorizontal:16, borderRadius:14, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:"rgba(255,255,255,0.04)" },
  searchInput:      { flex:1, color:"#fff", fontSize:14, paddingVertical:0 },

  // ✅ KEY FIX — fixed height wrapper, no margin tricks
  chipsWrapper:     { height:48, marginTop:6 },
  chipsContent:     { paddingHorizontal:16, gap:8, alignItems:"center", height:48 },
  chip:             { height:32, paddingHorizontal:14, borderRadius:16, backgroundColor:"#0f1720", borderWidth:1, borderColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  chipActive:       { backgroundColor:"rgba(167,139,250,0.15)", borderColor:"rgba(167,139,250,0.4)" },
  chipText:         { color:"#64748b", fontSize:12, fontWeight:"700" },

  summaryText:      { color:"#374151", fontSize:11, fontWeight:"600", paddingHorizontal:16, paddingTop:4, paddingBottom:2 },

  list:             { paddingHorizontal:16, paddingTop:6, paddingBottom:30 },

  card:             { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1724", borderRadius:14, marginBottom:10, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  cardLeft:         { width:72, alignItems:"center", justifyContent:"center", paddingVertical:14 },
  avatarImg:        { width:50, height:50, borderRadius:25 },
  avatarCircle:     { width:50, height:50, borderRadius:25, justifyContent:"center", alignItems:"center" },
  avatarText:       { fontSize:18, fontWeight:"800" },
  cardBody:         { flex:1, paddingVertical:12, paddingRight:8 },
  cardName:         { color:"#fff", fontSize:15, fontWeight:"800", marginBottom:2 },
  cardId:           { color:"#64748b", fontSize:11 },
  actionIcons:      { flexDirection:"row", gap:6, marginLeft:4 },
  actionIcon:       { width:34, height:34, borderRadius:10, backgroundColor:"rgba(0,198,255,0.1)", justifyContent:"center", alignItems:"center" },
  cardMeta:         { flexDirection:"row", gap:6, marginTop:8, flexWrap:"wrap" },
  deptBadge:        { paddingHorizontal:9, paddingVertical:3, borderRadius:8 },
  deptBadgeText:    { fontSize:11, fontWeight:"800" },
  semBadge:         { paddingHorizontal:8, paddingVertical:3, borderRadius:8, backgroundColor:"rgba(167,139,250,0.12)" },
  semBadgeText:     { color:"#a78bfa", fontSize:11, fontWeight:"700" },
  yearBadge:        { paddingHorizontal:8, paddingVertical:3, borderRadius:8, backgroundColor:"rgba(245,158,11,0.10)" },
  yearBadgeText:    { color:"#f59e0b", fontSize:11, fontWeight:"700" },
  sectionBadge:     { paddingHorizontal:8, paddingVertical:3, borderRadius:8, backgroundColor:"rgba(52,211,153,0.10)" },
  sectionBadgeText: { color:"#34d399", fontSize:11, fontWeight:"700" },

  empty:            { alignItems:"center", paddingTop:60, gap:12 },
  emptyIcon:        { width:72, height:72, borderRadius:36, backgroundColor:"#0f1724", justifyContent:"center", alignItems:"center" },
  emptyTitle:       { color:"#94a3b8", fontSize:15, fontWeight:"700" },
  emptySub:         { color:"#64748b", fontSize:12 },

  detailOverlay:    { flex:1, backgroundColor:"rgba(0,0,0,0.75)" },
  detailSheet:      { backgroundColor:"#0f1923", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.88, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  detailHero:       { alignItems:"center", paddingTop:20, paddingHorizontal:20, paddingBottom:16 },
  detailAvatar:     { width:88, height:88, borderRadius:44, justifyContent:"center", alignItems:"center", borderWidth:2.5, marginBottom:10, backgroundColor:"rgba(255,255,255,0.03)" },
  detailAvatarImg:  { width:88, height:88, borderRadius:44 },
  detailAvatarText: { fontSize:30, fontWeight:"800" },
  detailName:       { color:"#fff", fontSize:20, fontWeight:"900", textAlign:"center" },
  detailStudentId:  { color:"#94a3b8", fontSize:12, marginTop:4, marginBottom:10 },
  quickActions:     { flexDirection:"row", gap:10, marginBottom:12 },
  quickBtn:         { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:18, paddingVertical:9, borderRadius:10, borderWidth:1 },
  quickBtnText:     { fontSize:12, fontWeight:"700" },
  detailBadgesRow:  { flexDirection:"row", gap:8, flexWrap:"wrap", justifyContent:"center" },
  detailBadge:      { paddingHorizontal:10, paddingVertical:5, borderRadius:18, borderWidth:1 },
  detailBadgeText:  { fontSize:12, fontWeight:"700" },
  infoCard:         { margin:14, backgroundColor:"#0b1220", borderRadius:14, overflow:"hidden" },
  infoRow:          { flexDirection:"row", alignItems:"center", padding:14, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.03)" },
  infoIcon:         { width:36, height:36, borderRadius:10, justifyContent:"center", alignItems:"center", marginRight:12 },
  infoLabel:        { color:"#64748b", fontSize:10, fontWeight:"600", marginBottom:3 },
  infoValue:        { color:"#e2e8f0", fontSize:14, fontWeight:"700" },
  detailCloseBtn:   { margin:14, marginTop:4, padding:14, backgroundColor:"rgba(255,255,255,0.05)", borderRadius:12, alignItems:"center" },
  detailCloseTxt:   { color:"#94a3b8", fontSize:14, fontWeight:"700" },
  handle:           { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:4 },
});