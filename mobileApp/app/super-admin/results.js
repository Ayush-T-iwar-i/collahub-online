// app/super-admin/results.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Alert, StatusBar, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

export default function SuperAdminResults(){
  const router=useRouter();
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [college,setCollege]=useState("all");
  const [colleges,setColleges]=useState([]);

  useFocusEffect(useCallback(()=>{load();loadColleges();},[college]));

  const loadColleges=async()=>{
    try{const r=await API.get("/super-admin/colleges");setColleges((r.data?.colleges||[]).map(c=>typeof c==="string"?c:c.name).filter(Boolean));}catch{}
  };
  const load=async()=>{
    setLoading(true);
    try{
      const params={};
      if(college!=="all")params.college=college;
      const r=await API.get("/super-admin/results",{params});
      setResults(r.data?.results||r.data||[]);
    }catch(e){Alert.alert("Error",e.response?.data?.message||"Failed to load results");}
    finally{setLoading(false);}
  };

  const filtered=results.filter(r=>{
    if(!search)return true;
    const q=search.toLowerCase();
    return r.studentName?.toLowerCase().includes(q)||r.studentId?.toLowerCase().includes(q)||r.subject?.toLowerCase().includes(q);
  });

  const gradeColor=(g)=>{
    if(g==="A"||g==="A+")return"#34d399";
    if(g==="B"||g==="B+")return"#60a5fa";
    if(g==="C")return"#f59e0b";
    if(g==="D")return"#fb923c";
    return"#f87171";
  };

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>All Results</Text><Text style={s.sub}>SGPA / CGPA across colleges</Text></View>
        <Pressable onPress={load} style={s.refreshBtn}><Ionicons name="refresh" size={18} color="#e879f9"/></Pressable>
      </LinearGradient>

      <View style={s.searchRow}>
        <Ionicons name="search" size={14} color="#374151"/>
        <TextInput style={s.searchInput} placeholder="Search student, subject..." placeholderTextColor="#374151" value={search} onChangeText={setSearch}/>
        {!!search&&<Pressable onPress={()=>setSearch("")}><Ionicons name="close-circle" size={15} color="#374151"/></Pressable>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {["all",...colleges].map(c=>(
          <Pressable key={c} onPress={()=>setCollege(c)} style={[s.chip,college===c&&s.chipA]}>
            <Text style={[s.chipT,college===c&&{color:"#e879f9"}]}>{c==="all"?"All Colleges":c.split(" ").slice(0,2).join(" ")}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading?<ActivityIndicator size="large" color="#e879f9" style={{marginTop:50}}/>:(
        <FlatList data={filtered} keyExtractor={(i,idx)=>i._id||String(idx)}
          contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="trophy-outline" size={44} color="#1f2937"/><Text style={s.emptyT}>No results found</Text></View>}
          renderItem={({item})=>{
            const gc=gradeColor(item.grade);
            return(
              <View style={s.card}>
                <View style={[s.gradeBadge,{backgroundColor:gc+"20",borderColor:gc+"50"}]}>
                  <Text style={[s.gradeText,{color:gc}]}>{item.grade||"—"}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.name} numberOfLines={1}>{item.studentName||item.student?.name||"Unknown"}</Text>
                  <Text style={s.sub2} numberOfLines={1}>{item.subject||item.subjectName||"—"}</Text>
                  <View style={s.tags}>
                    {item.semester&&<View style={s.tag}><Text style={s.tagT}>Sem {item.semester}</Text></View>}
                    {item.marks!=null&&<View style={[s.tag,{borderColor:"#e879f940",backgroundColor:"#e879f912"}]}><Text style={[s.tagT,{color:"#e879f9"}]}>{item.marks}/{item.totalMarks||100}</Text></View>}
                  </View>
                </View>
                <View style={s.sgpaBox}>
                  <Text style={[s.sgpaVal,{color:gc}]}>{item.sgpa||item.cgpa||"—"}</Text>
                  <Text style={s.sgpaLabel}>{item.sgpa?"SGPA":"CGPA"}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
const s=StyleSheet.create({
  container:{flex:1,backgroundColor:"#070d1a"},
  header:{flexDirection:"row",alignItems:"center",paddingTop:52,paddingBottom:14,paddingHorizontal:16,gap:12},
  back:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(255,255,255,0.06)",justifyContent:"center",alignItems:"center"},
  title:{color:"#fff",fontSize:17,fontWeight:"800"},sub:{color:"#374151",fontSize:11,marginTop:1},
  refreshBtn:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(232,121,249,0.1)",justifyContent:"center",alignItems:"center"},
  searchRow:{flexDirection:"row",alignItems:"center",marginHorizontal:16,marginVertical:10,backgroundColor:"#0f1b2d",borderRadius:12,paddingHorizontal:12,paddingVertical:10,gap:8,borderWidth:1,borderColor:"rgba(255,255,255,0.06)"},
  searchInput:{flex:1,color:"#fff",fontSize:13},
  filterRow:{paddingHorizontal:16,gap:8,paddingBottom:10},
  chip:{paddingHorizontal:14,paddingVertical:6,borderRadius:20,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",backgroundColor:"rgba(255,255,255,0.04)"},
  chipA:{borderColor:"rgba(232,121,249,0.5)",backgroundColor:"rgba(232,121,249,0.1)"},
  chipT:{color:"#64748b",fontSize:11,fontWeight:"600"},
  card:{flexDirection:"row",alignItems:"center",backgroundColor:"#0f1b2d",borderRadius:14,padding:14,marginBottom:8,gap:12,borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  gradeBadge:{width:44,height:44,borderRadius:12,justifyContent:"center",alignItems:"center",borderWidth:1.5},
  gradeText:{fontSize:16,fontWeight:"900"},
  name:{color:"#fff",fontSize:13,fontWeight:"700"},
  sub2:{color:"#64748b",fontSize:11,marginTop:2},
  tags:{flexDirection:"row",gap:6,marginTop:5},
  tag:{paddingHorizontal:7,paddingVertical:2,borderRadius:7,borderWidth:1,borderColor:"rgba(255,255,255,0.1)",backgroundColor:"rgba(255,255,255,0.04)"},
  tagT:{color:"#64748b",fontSize:9,fontWeight:"700"},
  sgpaBox:{alignItems:"center"},
  sgpaVal:{fontSize:18,fontWeight:"900"},
  sgpaLabel:{color:"#374151",fontSize:9,fontWeight:"700",marginTop:2},
  empty:{alignItems:"center",paddingTop:60,gap:10},emptyT:{color:"#374151",fontSize:14,fontWeight:"700"},
});