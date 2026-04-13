import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  Alert, Image, Modal, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../services/api";

const DEPT_COLORS = {
  CSE:"#00c6ff", ECE:"#a78bfa", ME:"#f59e0b",
  CE:"#34d399",  IT:"#f87171", EEE:"#60a5fa",
};
const getColor = (dept="") => {
  const key = Object.keys(DEPT_COLORS).find(k=>dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#64748b";
};
const isBothType   = (sub) => (sub?.subjectType||"").toLowerCase()==="both";
const isLabType    = (sub) => (sub?.subjectType||"").toLowerCase()==="lab";
const isTheoryType = (sub) => {
  const t=(sub?.subjectType||"theory").toLowerCase(); return t==="theory";
};

// ── Date helpers ──────────────────────────────────────────
const fmtDate     = (d)    => d.toISOString().split("T")[0];
const displayDate = (s)    => {
  const d = new Date(s+"T00:00:00");
  return d.toLocaleDateString("en-IN",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
};
const changeDate  = (s,n)  => { const d=new Date(s+"T00:00:00"); d.setDate(d.getDate()+n); return fmtDate(d); };
const isToday     = (s)    => fmtDate(new Date())===s;
const isFuture    = (s)    => s>fmtDate(new Date());

// ── Time helpers ──────────────────────────────────────────
const timeToMin = (t) => {
  if (!t) return -1;
  const [hh,mm] = t.trim().split(":").map(Number);
  return hh*60+(mm||0);
};
const nowMin = () => {
  const n=new Date(); return n.getHours()*60+n.getMinutes();
};
const isCurrentClass = (slot) => {
  if (!slot) return false;
  try {
    const [s,e] = slot.split("-");
    const now=nowMin();
    return now>=timeToMin(s) && now<=timeToMin(e);
  } catch { return false; }
};
const isClassPast = (slot) => {
  if (!slot) return false;
  try {
    const e=slot.split("-")[1];
    return e ? nowMin()>timeToMin(e) : false;
  } catch { return false; }
};

// Sort: current → upcoming → past
const sortByTime = (list) => {
  const cur = list.filter(s=>isCurrentClass(s.timeSlot));
  const upc = list.filter(s=>!isCurrentClass(s.timeSlot)&&!isClassPast(s.timeSlot));
  const pst = list.filter(s=>!isCurrentClass(s.timeSlot)&&isClassPast(s.timeSlot));
  return [...cur,...upc,...pst];
};

// ── Last 30 days ──────────────────────────────────────────
const getLast30 = () => {
  const days=[];
  for(let i=0;i<30;i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    const iso=fmtDate(d);
    const label=d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
    days.push({iso,label,isToday:i===0,isSun:d.getDay()===0});
  }
  return days;
};
const LAST30=getLast30();

// ════════════════════════════════════════════════════════

// ── Subject Card ─────────────────────────────────────────
const SubjectCard=({item,onPress})=>{
  const color=getColor(item.department);
  const short=item.department?.match(/\(([^)]+)\)/)?.[1]||item.department?.split(" ")[0]||"";
  const tl=(item.subjectType||"theory").toUpperCase();
  const tc=tl==="LAB"?"#34d399":tl==="BOTH"?"#a78bfa":"#00c6ff";
  const isCurr=isCurrentClass(item.timeSlot);
  const isPast=!isCurr&&isClassPast(item.timeSlot);
  return(
    <Pressable
      style={[styles.subjectCard,isCurr&&styles.subjectCardNow,isPast&&{opacity:0.5}]}
      onPress={onPress}
    >
      <LinearGradient colors={isCurr?[color+"40",color+"18"]:["#1a2535","#1a2535"]} style={styles.subjectGrad}>
        {isCurr&&(
          <View style={styles.nowBadge}>
            <View style={styles.nowDot}/>
            <Text style={styles.nowText}>NOW</Text>
          </View>
        )}
        <View style={[styles.subjIconBox,{backgroundColor:color+"22"}]}>
          <Ionicons name={tl==="LAB"?"flask":"book"} size={22} color={color}/>
        </View>
        <View style={{flex:1}}>
          <Text style={styles.subjName} numberOfLines={1}>{item.subjectName}</Text>
          {item.subjectCode?<Text style={styles.subjCode}>{item.subjectCode}</Text>:null}
          <View style={styles.subjMeta}>
            <View style={[styles.mBadge,{backgroundColor:color+"18"}]}>
              <Text style={[styles.mBadgeTxt,{color}]}>{short} {item.admissionYear}</Text>
            </View>
            <View style={styles.mBadge}>
              <Text style={styles.mBadgeTxt}>Sem {item.semester}</Text>
            </View>
            <View style={[styles.mBadge,{backgroundColor:tc+"18"}]}>
              <Text style={[styles.mBadgeTxt,{color:tc}]}>{tl}</Text>
            </View>
            {item.timeSlot&&(
              <View style={[styles.mBadge,isCurr&&{backgroundColor:"rgba(52,211,153,0.2)"}]}>
                <Ionicons name="time-outline" size={9} color={isCurr?"#34d399":"#64748b"}/>
                <Text style={[styles.mBadgeTxt,isCurr&&{color:"#34d399"}]}>{item.timeSlot}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#374151"/>
      </LinearGradient>
    </Pressable>
  );
};

// ── Student Row ───────────────────────────────────────────
const StudentRow=({item,status,onToggle})=>{
  const color=getColor(item.department);
  const ini=item.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"S";
  const isP=status==="present"; const isA=status==="absent";
  return(
    <View style={styles.stuRow}>
      <View style={[styles.stuAvatar,{backgroundColor:color+"22"}]}>
        {item.profileImage
          ?<Image source={{uri:item.profileImage}} style={styles.stuAvatarImg}/>
          :<Text style={[styles.stuAvatarTxt,{color}]}>{ini}</Text>}
      </View>
      <View style={styles.stuInfo}>
        <Text style={styles.stuName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.stuId}>{item.studentId||"—"}</Text>
      </View>
      <View style={styles.attBtns}>
        <Pressable style={[styles.attBtn,isP&&styles.presentBtn]} onPress={()=>onToggle(item._id,"present")}>
          <Ionicons name={isP?"checkmark-circle":"checkmark-circle-outline"} size={26} color={isP?"#34d399":"#374151"}/>
        </Pressable>
        <Pressable style={[styles.attBtn,isA&&styles.absentBtn]} onPress={()=>onToggle(item._id,"absent")}>
          <Ionicons name={isA?"close-circle":"close-circle-outline"} size={26} color={isA?"#f87171":"#374151"}/>
        </Pressable>
      </View>
    </View>
  );
};

// ── Date History Modal ────────────────────────────────────
const DateModal=({visible,onClose,markedDates,currentDate,onSelect})=>(
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.dpOverlay} onPress={onClose}>
      <View style={styles.dpSheet}>
        <View style={styles.dpHandle}/>
        <View style={styles.dpHeader}>
          <Ionicons name="calendar" size={18} color="#00c6ff"/>
          <Text style={styles.dpTitle}>Select Date</Text>
          <Pressable onPress={onClose} style={styles.dpClose}>
            <Ionicons name="close" size={20} color="#64748b"/>
          </Pressable>
        </View>
        <View style={styles.dpLegend}>
          <View style={styles.dpLegItem}>
            <View style={[styles.dpLegDot,{backgroundColor:"#34d399"}]}/>
            <Text style={styles.dpLegTxt}>Attendance Marked</Text>
          </View>
          <View style={styles.dpLegItem}>
            <View style={[styles.dpLegDot,{backgroundColor:"#f87171"}]}/>
            <Text style={styles.dpLegTxt}>Not Marked</Text>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,paddingBottom:30}}>
          {LAST30.map(d=>{
            const isSel=currentDate===d.iso;
            const isMkd=markedDates?.includes(d.iso);
            const bar=d.isSun?"#374151":isMkd?"#34d399":"#f87171";
            return(
              <Pressable
                key={d.iso}
                onPress={()=>{ if(!d.isSun){onSelect(d.iso);onClose();} }}
                style={[styles.dpRow,isSel&&styles.dpRowSel,d.isSun&&{opacity:0.35}]}
              >
                <View style={[styles.dpBar,{backgroundColor:bar}]}/>
                <View style={styles.dpContent}>
                  <View style={styles.dpLeft}>
                    {d.isToday&&<View style={styles.todayTag}><Text style={styles.todayTagTxt}>TODAY</Text></View>}
                    {d.isSun&&<View style={styles.sunTag}><Text style={styles.sunTagTxt}>SUN</Text></View>}
                    <Text style={[styles.dpLabel,isSel&&{color:"#00c6ff"},d.isSun&&{color:"#374151"}]}>{d.label}</Text>
                  </View>
                  <View style={styles.dpRight}>
                    {!d.isSun&&(
                      <View style={[styles.dpStatus,{
                        backgroundColor:isMkd?"rgba(52,211,153,0.15)":"rgba(248,113,113,0.15)",
                        borderColor:isMkd?"rgba(52,211,153,0.3)":"rgba(248,113,113,0.3)",
                      }]}>
                        <Ionicons name={isMkd?"checkmark-circle":"close-circle"} size={11} color={isMkd?"#34d399":"#f87171"}/>
                        <Text style={[styles.dpStatusTxt,{color:isMkd?"#34d399":"#f87171"}]}>
                          {isMkd?"Marked":"Pending"}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.dpIso,isSel&&{color:"#00c6ff"}]}>{d.iso}</Text>
                    {isSel&&<Ionicons name="checkmark-circle" size={17} color="#00c6ff"/>}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

// ════════════════════════════════════════════════════════
export default function MarkAttendance(){
  const insets=useSafeAreaInsets();
  const navigation=useNavigation();

  const [allSubs,   setAllSubs]   = useState([]);
  const [subLoad,   setSubLoad]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [subTab,    setSubTab]    = useState("all"); // "all"|"theory"|"lab"

  const [selSub,    setSelSub]    = useState(null);
  const [students,  setStudents]  = useState([]);
  const [stuLoad,   setStuLoad]   = useState(false);
  const [theoryAtt, setTheoryAtt] = useState({});
  const [labAtt,    setLabAtt]    = useState({});
  const [activeTab, setActiveTab] = useState("theory");
  const [submitting,setSubmitting]= useState(false);

  const [date,        setDate]        = useState(fmtDate(new Date()));
  const [alreadyMkd,  setAlreadyMkd]  = useState(false);
  const [dateLd,      setDateLd]      = useState(false);
  const [markedDates, setMarkedDates] = useState([]);
  const [dateModal,   setDateModal]   = useState(false);

  useFocusEffect(useCallback(()=>{
    loadSubs();
    return ()=>{setSelSub(null);setStudents([]);setTheoryAtt({});setLabAtt({});setMarkedDates([]);};
  },[]));

  const loadSubs=async(isRef=false)=>{
    try{
      if(isRef)setRefreshing(true); else setSubLoad(true);
      const r=await API.get("/subject-requests/my-subjects");
      setAllSubs(r.data?.subjects||[]);
    }catch{setAllSubs([]);}
    finally{setSubLoad(false);setRefreshing(false);}
  };

  const filteredSubs=(()=>{
    let list=allSubs;
    if(subTab==="theory")list=list.filter(s=>isTheoryType(s));
    if(subTab==="lab")   list=list.filter(s=>isLabType(s)||isBothType(s));
    return sortByTime(list);
  })();

  const buildDef=(studs)=>{const d={};studs.forEach(s=>{d[s._id]="absent";});return d;};

  const loadMarkedDates=async(subjectId)=>{
    try{
      const res=await API.get(`/attendance/subject/${subjectId}`);
      const records=res.data?.records||[];
      setMarkedDates([...new Set(records.map(r=>r.date).filter(Boolean))]);
    }catch{setMarkedDates([]);}
  };

  const selectSub=async(subject)=>{
    setSelSub(subject);
    setTheoryAtt({});setLabAtt({});
    setAlreadyMkd(false);
    setActiveTab(isLabType(subject)?"lab":"theory");
    setStuLoad(true);
    const today=fmtDate(new Date());
    setDate(today);
    try{
      const r=await API.get(`/subject-requests/${subject._id}/students`);
      const studs=r.data?.students||[];
      setStudents(studs);
      const def=buildDef(studs);
      setTheoryAtt({...def});setLabAtt({...def});
      await fetchAtt(subject._id,today,studs,def,subject);
      loadMarkedDates(subject._id);
    }catch{setStudents([]);}
    finally{setStuLoad(false);}
  };

  const fetchAtt=async(subjectId,checkDate,studs,defMap,subOvr)=>{
    const sub=subOvr||selSub;
    const both=isBothType(sub);
    try{
      const tr=await API.get(`/attendance/check?subjectId=${subjectId}&date=${checkDate}&type=theory`);
      if(tr.data?.marked&&tr.data.records?.length>0){
        setAlreadyMkd(true);
        const tMap={...defMap};
        tr.data.records.forEach(r=>{tMap[r.studentId]=r.status;});
        setTheoryAtt(tMap);
      }else{setAlreadyMkd(false);setTheoryAtt({...defMap});}
      if(both){
        const lr=await API.get(`/attendance/check?subjectId=${subjectId}&date=${checkDate}&type=lab`);
        const lMap={...defMap};
        if(lr.data?.marked&&lr.data.records?.length>0)
          lr.data.records.forEach(r=>{lMap[r.studentId]=r.status;});
        setLabAtt(lMap);
      }
    }catch{setAlreadyMkd(false);setTheoryAtt({...defMap});setLabAtt({...defMap});}
  };

  const goToDate=async(nd)=>{
    if(isFuture(nd)){Alert.alert("Cannot select a future date.");return;}
    setDate(nd);setDateLd(true);
    const sid=selSub?.subjectId?._id||selSub?._id;
    const def=buildDef(students);
    setTheoryAtt({...def});setLabAtt({...def});
    await fetchAtt(sid,nd,students,def);
    setDateLd(false);
  };

  const curAtt   =activeTab==="theory"?theoryAtt:labAtt;
  const setCurAtt=activeTab==="theory"?setTheoryAtt:setLabAtt;
  const toggle   =(id,st)=>setCurAtt(p=>({...p,[id]:st}));
  const markAll  =(st)=>{const a={};students.forEach(s=>{a[s._id]=st;});setCurAtt(a);};

  const gStat=(map)=>({
    present:Object.values(map).filter(v=>v==="present").length,
    absent: Object.values(map).filter(v=>v==="absent").length,
  });
  const tStat=gStat(theoryAtt);
  const lStat=gStat(labAtt);
  const cStat=activeTab==="theory"?tStat:lStat;

  const handleSubmit=async()=>{
    if(students.length===0)return;
    const both=isBothType(selSub);
    Alert.alert(
      alreadyMkd?"Update Attendance":"Submit Attendance",
      `📚 Theory — Present: ${tStat.present} | Absent: ${tStat.absent}`+
      (both?`\n🧪 Lab — Present: ${lStat.present} | Absent: ${lStat.absent}`:"")+
      `\n\n📅 ${displayDate(date)}`,
      [
        {text:"Cancel",style:"cancel"},
        {text:alreadyMkd?"Update":"Submit",onPress:async()=>{
          try{
            setSubmitting(true);
            const sid=selSub?.subjectId?._id||selSub._id;
            const base={subjectName:selSub.subjectName,department:selSub.department,
              semester:selSub.semester,admissionYear:selSub.admissionYear,date};
            await API.post("/attendance/mark",{
              ...base,subjectId:sid,type:"theory",
              records:students.map(s=>({studentId:s._id,status:theoryAtt[s._id]||"absent"})),
            });
            if(both){
              await API.post("/attendance/mark",{
                ...base,subjectId:sid,type:"lab",
                records:students.map(s=>({studentId:s._id,status:labAtt[s._id]||"absent"})),
              });
            }
            if(!markedDates.includes(date))setMarkedDates(p=>[...p,date]);
            Alert.alert("✅ Done!",
              `Attendance ${alreadyMkd?"updated":"submitted"} for ${displayDate(date)}`,
              [
                {text:"← Prev Day",onPress:()=>goToDate(changeDate(date,-1))},
                {text:"Next Day →",onPress:()=>goToDate(changeDate(date,1))},
                {text:"Back to Subjects",onPress:()=>{
                  setSelSub(null);setStudents([]);
                  setTheoryAtt({});setLabAtt({});setDate(fmtDate(new Date()));setMarkedDates([]);
                }},
              ]
            );
          }catch(e){Alert.alert("Error",e.response?.data?.message||"Could not submit");}
          finally{setSubmitting(false);}
        }},
      ]
    );
  };

  // ════════════════════════════════════════════════════
  // STEP 1 — Subject list with tabs + time sort
  // ════════════════════════════════════════════════════
  if(!selSub){
    const currCnt=allSubs.filter(s=>isCurrentClass(s.timeSlot)).length;
    return(
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>
        <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={[styles.header,{paddingTop:insets.top+14}]}>
          <Pressable onPress={()=>navigation.openDrawer()} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color="#fff"/>
          </Pressable>
          <View style={styles.headerCtr}>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSub}>
              {currCnt>0?`${currCnt} class${currCnt>1?"es":""} in progress now`:"Select a subject to begin"}
            </Text>
          </View>
          <View style={{width:40}}/>
        </LinearGradient>

        {/* ── All / Theory / Lab tabs ── */}
        <View style={styles.subTabBar}>
          {[
            {k:"all",   label:"All",    icon:"apps-outline",  color:"#a78bfa", n:allSubs.length},
            {k:"theory",label:"Theory", icon:"book-outline",  color:"#00c6ff", n:allSubs.filter(s=>isTheoryType(s)).length},
            {k:"lab",   label:"Lab",    icon:"flask-outline", color:"#34d399", n:allSubs.filter(s=>isLabType(s)||isBothType(s)).length},
          ].map(tab=>{
            const on=subTab===tab.k;
            return(
              <Pressable
                key={tab.k}
                onPress={()=>setSubTab(tab.k)}
                style={[styles.subTab,on&&{borderColor:tab.color+"66",backgroundColor:tab.color+"12"}]}
              >
                <Ionicons name={tab.icon} size={13} color={on?tab.color:"#374151"}/>
                <Text style={[styles.subTabLbl,on&&{color:tab.color}]}>{tab.label}</Text>
                <View style={[styles.subTabCnt,on&&{backgroundColor:tab.color+"30"}]}>
                  <Text style={[styles.subTabCntTxt,on&&{color:tab.color}]}>{tab.n}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {subLoad
          ?<View style={styles.center}><ActivityIndicator size="large" color="#f59e0b"/></View>
          :filteredSubs.length===0
            ?<View style={styles.center}>
               <View style={styles.emptyWrap}>
                 <Ionicons name="book-outline" size={40} color="#374151"/>
               </View>
               <Text style={styles.emptyTitle}>
                 {subTab==="theory"?"No Theory Subjects":subTab==="lab"?"No Lab Subjects":"No Accepted Subjects"}
               </Text>
               <Text style={styles.emptySub}>
                 {subTab!=="all"?'Switch to "All" tab to see other subjects':"Request subjects and wait for admin approval."}
               </Text>
             </View>
            :<FlatList
               data={filteredSubs}
               keyExtractor={item=>item._id}
               contentContainerStyle={{padding:16,paddingBottom:40}}
               showsVerticalScrollIndicator={false}
               refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadSubs(true)} tintColor="#f59e0b"/>}
               ListHeaderComponent={()=>(
                 <View>
                   {currCnt>0&&(
                     <View style={styles.nowCallout}>
                       <View style={styles.nowDot}/>
                       <Text style={styles.nowCalloutTxt}>
                         {currCnt} class{currCnt>1?"es":""} happening right now — mark attendance!
                       </Text>
                     </View>
                   )}
                   <Text style={styles.listLbl}>
                     {filteredSubs.length} subject{filteredSubs.length!==1?"s":""}
                     {subTab!=="all"?` · ${subTab==="theory"?"Theory only":"Lab/Practical only"}`:""} · sorted by time
                   </Text>
                 </View>
               )}
               renderItem={({item})=><SubjectCard item={item} onPress={()=>selectSub(item)}/>}
             />
        }
      </View>
    );
  }

  // ════════════════════════════════════════════════════
  // STEP 2 — Mark Attendance
  // ════════════════════════════════════════════════════
  const color  =getColor(selSub.department);
  const short  =selSub.department?.match(/\(([^)]+)\)/)?.[1]||selSub.department?.split(" ")[0]||"";
  const section=`${short} ${selSub.admissionYear}`;
  const both   =isBothType(selSub);
  const isCurr =isCurrentClass(selSub.timeSlot);

  return(
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>
      <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={[styles.header,{paddingTop:insets.top+14}]}>
        <Pressable
          onPress={()=>{setSelSub(null);setStudents([]);setTheoryAtt({});setLabAtt({});setDate(fmtDate(new Date()));setMarkedDates([]);}}
          style={styles.menuBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff"/>
        </Pressable>
        <View style={styles.headerCtr}>
          <View style={styles.headerTitleRow}>
            {isCurr&&<View style={[styles.nowDot,{marginRight:6}]}/>}
            <Text style={styles.headerTitle} numberOfLines={1}>{selSub.subjectName}</Text>
          </View>
          <Text style={styles.headerSub}>{section} · Sem {selSub.semester}</Text>
        </View>
        <View style={{width:40}}/>
      </LinearGradient>

      {stuLoad
        ?<View style={styles.center}><ActivityIndicator size="large" color={color}/></View>
        :<FlatList
           data={students}
           keyExtractor={item=>item._id}
           contentContainerStyle={{padding:16,paddingBottom:120}}
           showsVerticalScrollIndicator={false}
           ListHeaderComponent={()=>(
             <View>
               {/* Subject banner */}
               <LinearGradient colors={[color+"30",color+"10"]} style={styles.subjBanner}>
                 <View style={[styles.subjIconBox,{backgroundColor:color+"22",marginRight:12}]}>
                   <Ionicons name={isLabType(selSub)?"flask":"book"} size={20} color={color}/>
                 </View>
                 <View style={{flex:1}}>
                   <Text style={[styles.subjName,{fontSize:15}]}>{selSub.subjectName}</Text>
                   <Text style={styles.subjCode}>{section} · Sem {selSub.semester}</Text>
                   {selSub.timeSlot&&(
                     <View style={styles.timePill}>
                       <Ionicons name="time-outline" size={10} color={isCurr?"#34d399":"#64748b"}/>
                       <Text style={[styles.timePillTxt,isCurr&&{color:"#34d399"}]}>
                         {selSub.timeSlot}{isCurr?" · Ongoing":""}
                       </Text>
                     </View>
                   )}
                 </View>
                 {alreadyMkd&&(
                   <View style={styles.alreadyBadge}>
                     <Ionicons name="checkmark-circle" size={12} color="#34d399"/>
                     <Text style={styles.alreadyBadgeTxt}>Marked</Text>
                   </View>
                 )}
               </LinearGradient>

               {/* ═══ DATE NAVIGATOR ═══ */}
               <View style={styles.dateNav}>
                 <Pressable style={styles.dateArrow} onPress={()=>goToDate(changeDate(date,-1))}>
                   <Ionicons name="chevron-back" size={20} color="#94a3b8"/>
                 </Pressable>
                 <Pressable style={styles.dateCtr} onPress={()=>setDateModal(true)}>
                   {dateLd
                     ?<ActivityIndicator size="small" color="#64748b" style={{height:44}}/>
                     :<>
                        <View style={styles.datePickHint}>
                          <Ionicons name="calendar-outline" size={11} color="#64748b"/>
                          <Text style={styles.datePickHintTxt}>tap to pick date</Text>
                        </View>
                        <Text style={styles.dateMain}>{displayDate(date)}</Text>
                        <View style={styles.datePills}>
                          {isToday(date)&&(
                            <View style={styles.todayPill}><Text style={styles.todayPillTxt}>Today</Text></View>
                          )}
                          {alreadyMkd
                            ?<View style={styles.mkdPill}>
                               <Ionicons name="checkmark-circle" size={10} color="#34d399"/>
                               <Text style={styles.mkdPillTxt}>Marked</Text>
                             </View>
                            :<View style={styles.notMkdPill}>
                               <Ionicons name="close-circle" size={10} color="#f87171"/>
                               <Text style={styles.notMkdPillTxt}>Not Marked</Text>
                             </View>
                          }
                        </View>
                      </>
                   }
                 </Pressable>
                 <Pressable
                   style={[styles.dateArrow,isToday(date)&&{opacity:0.25}]}
                   onPress={()=>goToDate(changeDate(date,1))}
                   disabled={isToday(date)}
                 >
                   <Ionicons name="chevron-forward" size={20} color="#94a3b8"/>
                 </Pressable>
               </View>

               {/* Theory / Lab TABS — both type only */}
               {both&&(
                 <View style={styles.tabBar}>
                   {[
                     {k:"theory",label:"Theory",icon:"book-outline", color:"#00c6ff",stat:`${tStat.present}P · ${tStat.absent}A`},
                     {k:"lab",   label:"Lab",   icon:"flask-outline",color:"#34d399",stat:`${lStat.present}P · ${lStat.absent}A`},
                   ].map(tab=>{
                     const on=activeTab===tab.k;
                     return(
                       <Pressable key={tab.k} onPress={()=>setActiveTab(tab.k)}
                         style={[styles.tabBtn,on&&{borderColor:tab.color+"66",backgroundColor:tab.color+"12"}]}>
                         <View style={[styles.tabIcon,{backgroundColor:on?tab.color+"25":"rgba(255,255,255,0.04)"}]}>
                           <Ionicons name={tab.icon} size={18} color={on?tab.color:"#374151"}/>
                         </View>
                         <View style={{flex:1}}>
                           <Text style={[styles.tabLbl,on&&{color:tab.color}]}>{tab.label}</Text>
                           <Text style={styles.tabStat}>{tab.stat}</Text>
                         </View>
                         {on&&<View style={[styles.tabDot,{backgroundColor:tab.color}]}/>}
                       </Pressable>
                     );
                   })}
                 </View>
               )}

               {/* Stats */}
               <View style={styles.statsRow}>
                 {[
                   {n:cStat.present,label:"Present",bg:"rgba(52,211,153,0.15)",c:"#34d399"},
                   {n:cStat.absent, label:"Absent", bg:"rgba(248,113,113,0.15)",c:"#f87171"},
                   {n:students.length,label:"Total", bg:"rgba(100,116,139,0.15)",c:"#64748b"},
                 ].map(x=>(
                   <View key={x.label} style={[styles.cntBadge,{backgroundColor:x.bg}]}>
                     <Text style={[styles.cntNum,{color:x.c}]}>{x.n}</Text>
                     <Text style={styles.cntLbl}>{x.label}</Text>
                   </View>
                 ))}
               </View>

               {/* Mark all */}
               <View style={styles.mAllRow}>
                 <Pressable style={styles.mAllP} onPress={()=>markAll("present")}>
                   <Ionicons name="checkmark-done" size={14} color="#34d399"/>
                   <Text style={[styles.mAllTxt,{color:"#34d399"}]}>All Present</Text>
                 </Pressable>
                 <Pressable style={styles.mAllA} onPress={()=>markAll("absent")}>
                   <Ionicons name="close" size={14} color="#f87171"/>
                   <Text style={[styles.mAllTxt,{color:"#f87171"}]}>All Absent</Text>
                 </Pressable>
               </View>

               {students.length===0&&(
                 <View style={[styles.emptyWrap,{alignSelf:"center",marginTop:40}]}>
                   <Ionicons name="people-outline" size={40} color="#374151"/>
                   <Text style={[styles.emptyTitle,{marginTop:12}]}>No Students Found</Text>
                   <Text style={styles.emptySub}>No students in {section} Sem {selSub.semester}</Text>
                 </View>
               )}

               {students.length>0&&(
                 <Text style={styles.secLbl}>
                   {both?(activeTab==="theory"?"📚 THEORY":"🧪 LAB"):"STUDENTS"} ({students.length})
                 </Text>
               )}
             </View>
           )}
           renderItem={({item})=><StudentRow item={item} status={curAtt[item._id]} onToggle={toggle}/>}
           ListFooterComponent={()=>
             students.length>0?(
               <Pressable style={[styles.submitBtn,submitting&&{opacity:0.6}]} onPress={handleSubmit} disabled={submitting}>
                 <LinearGradient
                   colors={alreadyMkd?["#f59e0b","#d97706"]:["#34d399","#059669"]}
                   start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitGrad}
                 >
                   {submitting
                     ?<ActivityIndicator color="#fff"/>
                     :<>
                        <Ionicons name={alreadyMkd?"refresh":"checkmark-circle"} size={18} color="#fff"/>
                        <Text style={styles.submitTxt}>{alreadyMkd?"Update Attendance":"Submit Attendance"}</Text>
                      </>
                   }
                 </LinearGradient>
               </Pressable>
             ):null
           }
         />
      }

      <DateModal
        visible={dateModal}
        onClose={()=>setDateModal(false)}
        markedDates={markedDates}
        currentDate={date}
        onSelect={goToDate}
      />
    </View>
  );
}

const styles=StyleSheet.create({
  container:       {flex:1,backgroundColor:"#080d17"},
  center:          {flex:1,justifyContent:"center",alignItems:"center",paddingHorizontal:32},
  header:          {flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingBottom:14},
  menuBtn:         {width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center"},
  headerCtr:       {flex:1,alignItems:"center"},
  headerTitleRow:  {flexDirection:"row",alignItems:"center",justifyContent:"center"},
  headerTitle:     {color:"#fff",fontSize:17,fontWeight:"700"},
  headerSub:       {color:"#64748b",fontSize:11,marginTop:2},

  // Step 1 tabs
  subTabBar:       {flexDirection:"row",gap:8,paddingHorizontal:16,paddingVertical:12,backgroundColor:"rgba(255,255,255,0.02)",borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,0.05)"},
  subTab:          {flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5,paddingVertical:9,borderRadius:12,borderWidth:1.5,borderColor:"rgba(255,255,255,0.07)",backgroundColor:"rgba(255,255,255,0.03)"},
  subTabLbl:       {color:"#374151",fontSize:11,fontWeight:"700"},
  subTabCnt:       {paddingHorizontal:6,paddingVertical:2,borderRadius:8,backgroundColor:"rgba(255,255,255,0.06)"},
  subTabCntTxt:    {color:"#374151",fontSize:10,fontWeight:"800"},

  // Now callout
  nowCallout:      {flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(52,211,153,0.1)",borderRadius:12,padding:12,marginBottom:10,borderWidth:1,borderColor:"rgba(52,211,153,0.25)"},
  nowCalloutTxt:   {color:"#34d399",fontSize:12,fontWeight:"600",flex:1},
  listLbl:         {color:"#374151",fontSize:10,fontWeight:"700",letterSpacing:0.5,marginBottom:10},

  // Subject card
  subjectCard:     {borderRadius:16,marginBottom:10,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.06)"},
  subjectCardNow:  {borderColor:"rgba(52,211,153,0.4)",borderWidth:1.5},
  subjectGrad:     {flexDirection:"row",alignItems:"center",padding:14,gap:12,borderRadius:16},
  subjIconBox:     {width:44,height:44,borderRadius:12,justifyContent:"center",alignItems:"center"},
  subjName:        {color:"#fff",fontSize:14,fontWeight:"700"},
  subjCode:        {color:"#64748b",fontSize:11,marginTop:2},
  subjMeta:        {flexDirection:"row",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"},
  mBadge:          {flexDirection:"row",alignItems:"center",gap:3,paddingHorizontal:8,paddingVertical:3,borderRadius:8,backgroundColor:"rgba(255,255,255,0.06)"},
  mBadgeTxt:       {fontSize:10,fontWeight:"700",color:"#64748b"},

  // NOW badge
  nowBadge:        {position:"absolute",top:8,right:48,flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(52,211,153,0.2)",paddingHorizontal:8,paddingVertical:3,borderRadius:8,borderWidth:1,borderColor:"rgba(52,211,153,0.4)",zIndex:10},
  nowText:         {color:"#34d399",fontSize:9,fontWeight:"900",letterSpacing:1},
  nowDot:          {width:7,height:7,borderRadius:4,backgroundColor:"#34d399"},

  // Subject banner (step 2)
  subjBanner:      {flexDirection:"row",alignItems:"center",borderRadius:16,padding:14,marginBottom:12,borderWidth:1,borderColor:"rgba(255,255,255,0.06)"},
  alreadyBadge:    {flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(52,211,153,0.15)",paddingHorizontal:8,paddingVertical:4,borderRadius:8},
  alreadyBadgeTxt: {color:"#34d399",fontSize:10,fontWeight:"700"},
  timePill:        {flexDirection:"row",alignItems:"center",gap:4,marginTop:4},
  timePillTxt:     {color:"#64748b",fontSize:10},

  // Date navigator
  dateNav:         {flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:16,padding:12,marginBottom:14,borderWidth:1,borderColor:"rgba(255,255,255,0.06)"},
  dateArrow:       {width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.05)",justifyContent:"center",alignItems:"center"},
  dateCtr:         {flex:1,alignItems:"center",paddingHorizontal:8},
  datePickHint:    {flexDirection:"row",alignItems:"center",gap:4,marginBottom:3},
  datePickHintTxt: {color:"#374151",fontSize:9,fontWeight:"600"},
  dateMain:        {color:"#fff",fontSize:14,fontWeight:"700",textAlign:"center"},
  datePills:       {flexDirection:"row",gap:6,marginTop:4,alignItems:"center",flexWrap:"wrap",justifyContent:"center"},
  todayPill:       {backgroundColor:"rgba(0,198,255,0.15)",paddingHorizontal:8,paddingVertical:2,borderRadius:8,borderWidth:1,borderColor:"rgba(0,198,255,0.3)"},
  todayPillTxt:    {color:"#00c6ff",fontSize:10,fontWeight:"700"},
  mkdPill:         {flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(52,211,153,0.12)",paddingHorizontal:8,paddingVertical:2,borderRadius:8,borderWidth:1,borderColor:"rgba(52,211,153,0.3)"},
  mkdPillTxt:      {color:"#34d399",fontSize:10,fontWeight:"600"},
  notMkdPill:      {flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(248,113,113,0.12)",paddingHorizontal:8,paddingVertical:2,borderRadius:8,borderWidth:1,borderColor:"rgba(248,113,113,0.3)"},
  notMkdPillTxt:   {color:"#f87171",fontSize:10,fontWeight:"600"},

  // Theory / Lab tabs
  tabBar:          {flexDirection:"row",gap:10,marginBottom:14},
  tabBtn:          {flex:1,flexDirection:"row",alignItems:"center",gap:10,padding:12,borderRadius:14,borderWidth:1.5,borderColor:"rgba(255,255,255,0.08)",backgroundColor:"rgba(255,255,255,0.03)",position:"relative"},
  tabIcon:         {width:36,height:36,borderRadius:11,justifyContent:"center",alignItems:"center"},
  tabLbl:          {color:"#64748b",fontSize:14,fontWeight:"800"},
  tabStat:         {color:"#374151",fontSize:10,marginTop:2},
  tabDot:          {position:"absolute",top:7,right:7,width:7,height:7,borderRadius:4},

  // Stats
  statsRow:        {flexDirection:"row",gap:8,marginBottom:12},
  cntBadge:        {flex:1,alignItems:"center",paddingVertical:10,borderRadius:12},
  cntNum:          {fontSize:18,fontWeight:"800"},
  cntLbl:          {color:"#64748b",fontSize:9,marginTop:2,fontWeight:"600"},

  // Mark all
  mAllRow:         {flexDirection:"row",gap:10,marginBottom:16},
  mAllP:           {flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"rgba(52,211,153,0.1)",padding:11,borderRadius:12,borderWidth:1,borderColor:"rgba(52,211,153,0.2)"},
  mAllA:           {flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"rgba(248,113,113,0.1)",padding:11,borderRadius:12,borderWidth:1,borderColor:"rgba(248,113,113,0.2)"},
  mAllTxt:         {fontSize:13,fontWeight:"700"},
  secLbl:          {color:"#374151",fontSize:10,fontWeight:"800",letterSpacing:1,marginBottom:10},

  // Student row
  stuRow:          {flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,padding:12,marginBottom:8,borderWidth:1,borderColor:"rgba(255,255,255,0.04)"},
  stuAvatar:       {width:44,height:44,borderRadius:22,justifyContent:"center",alignItems:"center",marginRight:12},
  stuAvatarImg:    {width:44,height:44,borderRadius:22},
  stuAvatarTxt:    {fontSize:15,fontWeight:"800"},
  stuInfo:         {flex:1},
  stuName:         {color:"#fff",fontSize:14,fontWeight:"600"},
  stuId:           {color:"#64748b",fontSize:11,marginTop:2},
  attBtns:         {flexDirection:"row",gap:10},
  attBtn:          {width:42,height:42,borderRadius:21,justifyContent:"center",alignItems:"center",backgroundColor:"rgba(255,255,255,0.04)"},
  presentBtn:      {backgroundColor:"rgba(52,211,153,0.15)"},
  absentBtn:       {backgroundColor:"rgba(248,113,113,0.15)"},

  // Submit
  submitBtn:       {marginTop:20,borderRadius:16,overflow:"hidden"},
  submitGrad:      {flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:18,borderRadius:16},
  submitTxt:       {color:"#fff",fontWeight:"800",fontSize:16},

  // Empty
  emptyWrap:       {alignItems:"center",gap:8},
  emptyTitle:      {color:"#374151",fontSize:16,fontWeight:"700",textAlign:"center"},
  emptySub:        {color:"#1f2937",fontSize:13,textAlign:"center",marginTop:4,lineHeight:18},

  // Date Modal
  dpOverlay:       {flex:1,backgroundColor:"rgba(0,0,0,0.8)",justifyContent:"flex-end"},
  dpSheet:         {backgroundColor:"#0f1923",borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"75%",borderWidth:1,borderColor:"rgba(255,255,255,0.06)"},
  dpHandle:        {width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.12)",alignSelf:"center",marginTop:12,marginBottom:4},
  dpHeader:        {flexDirection:"row",alignItems:"center",gap:10,padding:20,paddingBottom:8},
  dpTitle:         {flex:1,color:"#fff",fontSize:16,fontWeight:"700"},
  dpClose:         {width:36,height:36,borderRadius:18,backgroundColor:"rgba(255,255,255,0.06)",justifyContent:"center",alignItems:"center"},
  dpLegend:        {flexDirection:"row",gap:16,paddingHorizontal:20,paddingBottom:10},
  dpLegItem:       {flexDirection:"row",alignItems:"center",gap:6},
  dpLegDot:        {width:10,height:10,borderRadius:5},
  dpLegTxt:        {color:"#64748b",fontSize:11},
  dpRow:           {flexDirection:"row",alignItems:"center",borderRadius:12,marginBottom:6,overflow:"hidden",backgroundColor:"rgba(255,255,255,0.03)"},
  dpRowSel:        {backgroundColor:"rgba(0,198,255,0.08)",borderWidth:1,borderColor:"rgba(0,198,255,0.3)"},
  dpBar:           {width:4,alignSelf:"stretch"},
  dpContent:       {flex:1,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:12,paddingHorizontal:12},
  dpLeft:          {flexDirection:"row",alignItems:"center",gap:8,flex:1},
  dpRight:         {flexDirection:"row",alignItems:"center",gap:8},
  dpLabel:         {color:"#94a3b8",fontSize:13,fontWeight:"600"},
  dpIso:           {color:"#374151",fontSize:11},
  dpStatus:        {flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:8,paddingVertical:3,borderRadius:8,borderWidth:1},
  dpStatusTxt:     {fontSize:10,fontWeight:"700"},
  todayTag:        {backgroundColor:"rgba(0,198,255,0.15)",paddingHorizontal:7,paddingVertical:2,borderRadius:5},
  todayTagTxt:     {color:"#00c6ff",fontSize:9,fontWeight:"800"},
  sunTag:          {backgroundColor:"rgba(100,116,139,0.15)",paddingHorizontal:7,paddingVertical:2,borderRadius:5},
  sunTagTxt:       {color:"#64748b",fontSize:9,fontWeight:"800"},
});