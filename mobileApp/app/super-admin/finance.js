// app/super-admin/finance.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, StatusBar, RefreshControl, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const {width}=Dimensions.get("window");

export default function SuperAdminFinance(){
  const router=useRouter();
  const [stats,setStats]=useState(null);
  const [colleges,setColleges]=useState([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  useFocusEffect(useCallback(()=>{load();},[  ]));
  const load=async(isRefresh=false)=>{
    if(isRefresh)setRefreshing(true);else setLoading(true);
    try{
      const [sr,cr]=await Promise.all([
        API.get("/super-admin/stats"),
        API.get("/super-admin/colleges"),
      ]);
      setStats(sr.data||{});
      setColleges((cr.data?.colleges||[]).map(c=>typeof c==="string"?{name:c,students:0}:c));
    }catch{}
    finally{setLoading(false);setRefreshing(false);}
  };

  const totalStudents=stats?.totalStudents||0;
  const estRevenue=totalStudents*50000;// Estimated avg fee ₹50,000/student

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>Fees & Finance</Text><Text style={s.sub}>System-wide fee overview</Text></View>
        <Pressable onPress={()=>load(true)} style={s.refreshBtn}><Ionicons name="refresh" size={18} color="#10b981"/></Pressable>
      </LinearGradient>

      {loading?<ActivityIndicator size="large" color="#10b981" style={{marginTop:60}}/>:(
        <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} tintColor="#10b981"/>}>

          {/* Hero card */}
          <LinearGradient colors={["#064e3b","#065f46"]} style={s.heroCard}>
            <Ionicons name="card" size={36} color="rgba(255,255,255,0.12)" style={{position:"absolute",right:20,top:20}}/>
            <Text style={s.heroLabel}>Estimated Annual Revenue</Text>
            <Text style={s.heroVal}>₹{(estRevenue/10000000).toFixed(1)}Cr</Text>
            <Text style={s.heroSub}>Based on {totalStudents} students × avg ₹50,000</Text>
          </LinearGradient>

          {/* Stat boxes */}
          <View style={s.statRow}>
            {[
              {label:"Total Students",value:totalStudents,icon:"people",color:"#34d399"},
              {label:"Colleges",value:stats?.totalColleges||0,icon:"business",color:"#00c6ff"},
            ].map((item,i)=>(
              <View key={i} style={[s.statBox,{borderColor:item.color+"30"}]}>
                <LinearGradient colors={[item.color+"15",item.color+"04"]} style={s.statGrad}>
                  <View style={[s.statIcon,{backgroundColor:item.color+"20"}]}><Ionicons name={item.icon} size={18} color={item.color}/></View>
                  <Text style={[s.statVal,{color:item.color}]}>{item.value}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>College-wise Student Count</Text>
          <View style={s.collegeList}>
            {colleges.map((c,i)=>(
              <View key={i} style={s.collegeRow}>
                <View style={s.collegeLeft}>
                  <View style={[s.colDot,{backgroundColor:["#00c6ff","#34d399","#f59e0b","#a78bfa","#f87171"][i%5]}]}/>
                  <Text style={s.collegeName} numberOfLines={1}>{c.name}</Text>
                </View>
                <View style={s.collegeRight}>
                  <Text style={s.collegeStudents}>{c.students||0}</Text>
                  <Text style={s.collegeLabel}>students</Text>
                </View>
              </View>
            ))}
            {colleges.length===0&&<View style={s.empty}><Ionicons name="receipt-outline" size={44} color="#1f2937"/><Text style={s.emptyT}>No college data</Text></View>}
          </View>

          <View style={s.noteCard}>
            <Ionicons name="information-circle" size={16} color="#60a5fa"/>
            <Text style={s.noteText}>Full implementation of the finance model is coming, and it will then display detailed fee collections, pending dues, and payment history.</Text>
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
  refreshBtn:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(16,185,129,0.1)",justifyContent:"center",alignItems:"center"},
  heroCard:{borderRadius:20,padding:22,marginBottom:20,overflow:"hidden"},
  heroLabel:{color:"rgba(255,255,255,0.65)",fontSize:13},heroVal:{color:"#fff",fontSize:40,fontWeight:"900",marginVertical:4},heroSub:{color:"rgba(255,255,255,0.45)",fontSize:11},
  statRow:{flexDirection:"row",gap:10,marginBottom:20},
  statBox:{flex:1,borderRadius:16,overflow:"hidden",borderWidth:1},
  statGrad:{padding:14,minHeight:90},
  statIcon:{width:34,height:34,borderRadius:10,justifyContent:"center",alignItems:"center",marginBottom:8},
  statVal:{fontSize:22,fontWeight:"900"},statLabel:{color:"#64748b",fontSize:11,marginTop:3},
  sectionTitle:{color:"#374151",fontSize:11,fontWeight:"700",letterSpacing:1,textTransform:"uppercase",marginBottom:12},
  collegeList:{backgroundColor:"#0f1b2d",borderRadius:16,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  collegeRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:14,borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,0.04)"},
  collegeLeft:{flexDirection:"row",alignItems:"center",gap:10,flex:1},
  colDot:{width:8,height:8,borderRadius:4},
  collegeName:{color:"#fff",fontSize:13,fontWeight:"600",flex:1},
  collegeRight:{alignItems:"flex-end"},
  collegeStudents:{color:"#34d399",fontSize:16,fontWeight:"800"},
  collegeLabel:{color:"#374151",fontSize:9},
  noteCard:{flexDirection:"row",alignItems:"flex-start",gap:10,backgroundColor:"rgba(96,165,250,0.08)",padding:14,borderRadius:14,marginTop:16,borderWidth:1,borderColor:"rgba(96,165,250,0.2)"},
  noteText:{flex:1,color:"#60a5fa",fontSize:12,lineHeight:18},
  empty:{alignItems:"center",paddingVertical:30,gap:10},emptyT:{color:"#374151",fontSize:14,fontWeight:"700"},
});
