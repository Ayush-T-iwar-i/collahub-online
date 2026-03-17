// app/super-admin/attendance.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, StatusBar, ScrollView, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const {width}=Dimensions.get("window");

const pctColor=(p)=>{ if(p>=75)return"#34d399"; if(p>=60)return"#f59e0b"; return"#f87171"; };

export default function SuperAdminAttendance(){
  const router=useRouter();
  const [colleges,setColleges]=useState([]);
  const [selected,setSelected]=useState(null);
  const [attendanceData,setAttendanceData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [detailLoading,setDetailLoading]=useState(false);

  useFocusEffect(useCallback(()=>{load();},[  ]));

  const load=async()=>{
    setLoading(true);
    try{
      const r=await API.get("/super-admin/colleges");
      const list=(r.data?.colleges||[]).map(c=>typeof c==="string"?{name:c}:c);
      setColleges(list);
      if(list.length>0)loadAttendance(list[0].name);
    }catch{setLoading(false);}
  };

  const loadAttendance=async(collegeName)=>{
    setSelected(collegeName);setDetailLoading(true);
    try{
      const r=await API.get("/super-admin/attendance",{params:{college:collegeName}});
      setAttendanceData(r.data?.summary||r.data||[]);
    }catch{setAttendanceData([]);}
    finally{setDetailLoading(false);setLoading(false);}
  };

  const overallAvg=attendanceData.length>0
    ?Math.round(attendanceData.reduce((a,b)=>a+(b.percentage||0),0)/attendanceData.length)
    :0;

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>Attendance Reports</Text><Text style={s.sub}>College-wise attendance overview</Text></View>
        <Pressable onPress={load} style={s.refreshBtn}><Ionicons name="refresh" size={18} color="#34d399"/></Pressable>
      </LinearGradient>

      {loading?<ActivityIndicator size="large" color="#34d399" style={{marginTop:60}}/>:(
        <>
          {/* College tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.collegeTabs}>
            {colleges.map(c=>(
              <Pressable key={c.name} onPress={()=>loadAttendance(c.name)}
                style={[s.colTab,selected===c.name&&s.colTabA]}>
                <Text style={[s.colTabT,selected===c.name&&{color:"#34d399"}]} numberOfLines={2}>
                  {c.name.split(" ").slice(0,3).join(" ")}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Summary card */}
          {overallAvg>0&&(
            <LinearGradient colors={[pctColor(overallAvg)+"30",pctColor(overallAvg)+"08"]} style={s.summaryCard}>
              <View>
                <Text style={s.summaryLabel}>Overall Avg Attendance</Text>
                <Text style={[s.summaryVal,{color:pctColor(overallAvg)}]}>{overallAvg}%</Text>
                <Text style={s.summarySub}>{selected?.split(" ").slice(0,3).join(" ")}</Text>
              </View>
              <Ionicons name={overallAvg>=75?"checkmark-circle":"warning"} size={44} color={pctColor(overallAvg)+"60"}/>
            </LinearGradient>
          )}

          {detailLoading?<ActivityIndicator color="#34d399" style={{marginTop:30}}/>:(
            <FlatList data={attendanceData} keyExtractor={(i,idx)=>i._id||i.subject||String(idx)}
              contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={s.empty}><Ionicons name="calendar-outline" size={44} color="#1f2937"/><Text style={s.emptyT}>No attendance data</Text></View>}
              renderItem={({item})=>{
                const pct=item.percentage||0;const color=pctColor(pct);
                return(
                  <View style={s.card}>
                    <View style={{flex:1}}>
                      <Text style={s.cardSubject} numberOfLines={1}>{item.subject||item.subjectName||"—"}</Text>
                      <Text style={s.cardTeacher} numberOfLines={1}>{item.teacher||item.teacherName||"—"}</Text>
                      <View style={s.progressTrack}>
                        <View style={[s.progressFill,{width:`${Math.min(pct,100)}%`,backgroundColor:color}]}/>
                      </View>
                    </View>
                    <View style={[s.pctBox,{backgroundColor:color+"15",borderColor:color+"40"}]}>
                      <Text style={[s.pctVal,{color}]}>{pct}%</Text>
                      <Text style={s.pctLabel}>{item.present||0}/{item.total||0}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </View>
  );
}
const s=StyleSheet.create({
  container:{flex:1,backgroundColor:"#070d1a"},
  header:{flexDirection:"row",alignItems:"center",paddingTop:52,paddingBottom:14,paddingHorizontal:16,gap:12},
  back:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(255,255,255,0.06)",justifyContent:"center",alignItems:"center"},
  title:{color:"#fff",fontSize:17,fontWeight:"800"},sub:{color:"#374151",fontSize:11,marginTop:1},
  refreshBtn:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(52,211,153,0.1)",justifyContent:"center",alignItems:"center"},
  collegeTabs:{paddingHorizontal:16,gap:8,paddingVertical:12},
  colTab:{paddingHorizontal:14,paddingVertical:8,borderRadius:16,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",backgroundColor:"rgba(255,255,255,0.04)",maxWidth:130},
  colTabA:{borderColor:"rgba(52,211,153,0.5)",backgroundColor:"rgba(52,211,153,0.1)"},
  colTabT:{color:"#64748b",fontSize:11,fontWeight:"600",textAlign:"center"},
  summaryCard:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginHorizontal:16,marginBottom:16,borderRadius:18,padding:20},
  summaryLabel:{color:"rgba(255,255,255,0.6)",fontSize:12},
  summaryVal:{fontSize:44,fontWeight:"900"},
  summarySub:{color:"rgba(255,255,255,0.4)",fontSize:11,marginTop:4},
  card:{flexDirection:"row",alignItems:"center",backgroundColor:"#0f1b2d",borderRadius:14,padding:14,marginBottom:8,gap:12,borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  cardSubject:{color:"#fff",fontSize:13,fontWeight:"700"},
  cardTeacher:{color:"#64748b",fontSize:11,marginTop:2,marginBottom:8},
  progressTrack:{height:4,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"},
  progressFill:{height:4,borderRadius:2},
  pctBox:{width:58,alignItems:"center",paddingVertical:8,borderRadius:12,borderWidth:1},
  pctVal:{fontSize:16,fontWeight:"900"},
  pctLabel:{color:"#374151",fontSize:9,marginTop:2},
  empty:{alignItems:"center",paddingTop:60,gap:10},emptyT:{color:"#374151",fontSize:14,fontWeight:"700"},
});