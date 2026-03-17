// app/super-admin/analytics.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, StatusBar, RefreshControl, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const StatBox=({label,value,icon,color,sub})=>(
  <View style={[s.statBox,{borderColor:color+"30"}]}>
    <LinearGradient colors={[color+"15",color+"05"]} style={s.statGrad}>
      <View style={[s.statIcon,{backgroundColor:color+"20"}]}><Ionicons name={icon} size={18} color={color}/></View>
      <Text style={[s.statVal,{color}]}>{value??"—"}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub&&<Text style={s.statSub}>{sub}</Text>}
    </LinearGradient>
  </View>
);

const BarRow=({label,value,max,color})=>{
  const pct=max>0?Math.min((value/max)*100,100):0;
  return(
    <View style={s.barRow}>
      <Text style={s.barLabel} numberOfLines={1}>{label}</Text>
      <View style={s.barTrack}><View style={[s.barFill,{width:`${pct}%`,backgroundColor:color}]}/></View>
      <Text style={[s.barVal,{color}]}>{value}</Text>
    </View>
  );
};

export default function SuperAdminAnalytics(){
  const router=useRouter();
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  useFocusEffect(useCallback(()=>{load();},[  ]));

  const load=async(isRefresh=false)=>{
    if(isRefresh)setRefreshing(true); else setLoading(true);
    try{
      const r=await API.get("/super-admin/stats");
      setStats(r.data||{});
    }catch{}
    finally{setLoading(false);setRefreshing(false);}
  };

  const totalUsers=(stats?.totalStudents||0)+(stats?.totalTeachers||0)+(stats?.totalAdmins||0);

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>System Analytics</Text><Text style={s.sub}>Platform overview</Text></View>
        <Pressable onPress={()=>load(true)} style={s.refreshBtn}><Ionicons name="refresh" size={18} color="#22d3ee"/></Pressable>
      </LinearGradient>

      {loading?<ActivityIndicator size="large" color="#22d3ee" style={{marginTop:60}}/>:(
        <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} tintColor="#22d3ee"/>}>

          {/* Total users card */}
          <LinearGradient colors={["#0e7490","#164e63"]} style={s.heroCard}>
            <Ionicons name="globe" size={36} color="rgba(255,255,255,0.15)" style={{position:"absolute",right:20,top:20}}/>
            <Text style={s.heroLabel}>Total System Users</Text>
            <Text style={s.heroVal}>{totalUsers}</Text>
            <Text style={s.heroSub}>{stats?.totalColleges||0} colleges • Active platform</Text>
          </LinearGradient>

          <Text style={s.sectionTitle}>User Breakdown</Text>
          <View style={s.statGrid}>
            <StatBox label="Students"  value={stats?.totalStudents}  icon="people"           color="#34d399" sub={`${totalUsers>0?((stats?.totalStudents/totalUsers)*100).toFixed(1):0}% of users`}/>
            <StatBox label="Teachers"  value={stats?.totalTeachers}  icon="person"           color="#f59e0b" sub={`${totalUsers>0?((stats?.totalTeachers/totalUsers)*100).toFixed(1):0}% of users`}/>
            <StatBox label="Admins"    value={stats?.totalAdmins}    icon="shield-checkmark" color="#a78bfa" sub="College admins"/>
            <StatBox label="Colleges"  value={stats?.totalColleges}  icon="business"         color="#00c6ff" sub="Registered"/>
          </View>

          <Text style={s.sectionTitle}>Content Stats</Text>
          <View style={s.statGrid}>
            <StatBox label="Subjects"    value={stats?.totalSubjects}    icon="book"          color="#60a5fa"/>
            <StatBox label="Assignments" value={stats?.totalAssignments} icon="document-text" color="#fb923c"/>
            <StatBox label="Results"     value={stats?.totalResults}     icon="trophy"        color="#e879f9"/>
            <StatBox label="Posts"       value={stats?.totalPosts}       icon="newspaper"     color="#f87171"/>
          </View>

          {/* User ratio bars */}
          <Text style={s.sectionTitle}>User Distribution</Text>
          <View style={s.barsCard}>
            <BarRow label="Students" value={stats?.totalStudents||0} max={totalUsers} color="#34d399"/>
            <BarRow label="Teachers" value={stats?.totalTeachers||0} max={totalUsers} color="#f59e0b"/>
            <BarRow label="Admins"   value={stats?.totalAdmins||0}   max={totalUsers} color="#a78bfa"/>
          </View>

          {/* Ratio card */}
          <View style={s.ratioCard}>
            <View style={s.ratioItem}>
              <Text style={s.ratioVal}>{stats?.totalTeachers>0?((stats?.totalStudents||0)/(stats?.totalTeachers)).toFixed(1):"—"}</Text>
              <Text style={s.ratioLabel}>Students per Teacher</Text>
            </View>
            <View style={s.ratioDivider}/>
            <View style={s.ratioItem}>
              <Text style={s.ratioVal}>{stats?.totalAdmins>0?((stats?.totalStudents||0)/(stats?.totalAdmins)).toFixed(0):"—"}</Text>
              <Text style={s.ratioLabel}>Students per Admin</Text>
            </View>
            <View style={s.ratioDivider}/>
            <View style={s.ratioItem}>
              <Text style={s.ratioVal}>{stats?.totalColleges>0?((stats?.totalStudents||0)/(stats?.totalColleges)).toFixed(0):"—"}</Text>
              <Text style={s.ratioLabel}>Avg Students/College</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s=StyleSheet.create({
  container:{flex:1,backgroundColor:"#070d1a"},
  header:{flexDirection:"row",alignItems:"center",paddingTop:52,paddingBottom:14,paddingHorizontal:16,gap:12},
  back:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(255,255,255,0.06)",justifyContent:"center",alignItems:"center"},
  title:{color:"#fff",fontSize:17,fontWeight:"800"},sub:{color:"#374151",fontSize:11,marginTop:1},
  refreshBtn:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(34,211,238,0.1)",justifyContent:"center",alignItems:"center"},
  heroCard:{borderRadius:20,padding:22,marginBottom:22,overflow:"hidden"},
  heroLabel:{color:"rgba(255,255,255,0.7)",fontSize:13,fontWeight:"600"},
  heroVal:{color:"#fff",fontSize:48,fontWeight:"900",marginVertical:4},
  heroSub:{color:"rgba(255,255,255,0.55)",fontSize:12},
  sectionTitle:{color:"#374151",fontSize:11,fontWeight:"700",letterSpacing:1,textTransform:"uppercase",marginBottom:12,marginTop:8},
  statGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:22},
  statBox:{width:(width-52)/2,borderRadius:16,overflow:"hidden",borderWidth:1},
  statGrad:{padding:14,minHeight:90},
  statIcon:{width:34,height:34,borderRadius:10,justifyContent:"center",alignItems:"center",marginBottom:8},
  statVal:{fontSize:22,fontWeight:"900"},
  statLabel:{color:"#64748b",fontSize:11,marginTop:3},
  statSub:{color:"#374151",fontSize:10,marginTop:2},
  barsCard:{backgroundColor:"#0f1b2d",borderRadius:16,padding:16,marginBottom:16,borderWidth:1,borderColor:"rgba(255,255,255,0.05)",gap:14},
  barRow:{flexDirection:"row",alignItems:"center",gap:10},
  barLabel:{color:"#94a3b8",fontSize:12,width:60},
  barTrack:{flex:1,height:6,backgroundColor:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"},
  barFill:{height:6,borderRadius:3},
  barVal:{color:"#fff",fontSize:12,fontWeight:"700",width:36,textAlign:"right"},
  ratioCard:{backgroundColor:"#0f1b2d",borderRadius:16,padding:16,flexDirection:"row",borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  ratioItem:{flex:1,alignItems:"center"},
  ratioVal:{color:"#22d3ee",fontSize:22,fontWeight:"900"},
  ratioLabel:{color:"#64748b",fontSize:10,marginTop:4,textAlign:"center"},
  ratioDivider:{width:1,backgroundColor:"rgba(255,255,255,0.06)",marginVertical:4},
});
