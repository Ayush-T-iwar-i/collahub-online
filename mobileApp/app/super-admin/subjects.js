// app/super-admin/subjects.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Alert, StatusBar, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

export default function SuperAdminSubjects(){
  const router=useRouter();
  const [subjects,setSubjects]=useState([]);
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
      const params={};if(college!=="all")params.college=college;
      const r=await API.get("/super-admin/subjects",{params});
      setSubjects(r.data?.subjects||r.data||[]);
    }catch{setSubjects([]);}
    finally{setLoading(false);}
  };
  const filtered=subjects.filter(s=>{
    if(!search)return true;const q=search.toLowerCase();
    return s.name?.toLowerCase().includes(q)||s.code?.toLowerCase().includes(q)||s.department?.toLowerCase().includes(q);
  });

  const DEPT_COLORS=["#00c6ff","#a78bfa","#34d399","#f59e0b","#f87171","#ec4899","#60a5fa"];
  const dc=(d="")=>DEPT_COLORS[d.charCodeAt(0)%DEPT_COLORS.length];

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>All Subjects</Text><Text style={s.sub}>{subjects.length} subjects system-wide</Text></View>
        <Pressable onPress={load} style={s.refreshBtn}><Ionicons name="refresh" size={18} color="#60a5fa"/></Pressable>
      </LinearGradient>
      <View style={s.searchRow}>
        <Ionicons name="search" size={14} color="#374151"/>
        <TextInput style={s.searchInput} placeholder="Search name, code, dept..." placeholderTextColor="#374151" value={search} onChangeText={setSearch}/>
        {!!search&&<Pressable onPress={()=>setSearch("")}><Ionicons name="close-circle" size={15} color="#374151"/></Pressable>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {["all",...colleges].map(c=>(
          <Pressable key={c} onPress={()=>setCollege(c)} style={[s.chip,college===c&&s.chipA]}>
            <Text style={[s.chipT,college===c&&{color:"#60a5fa"}]}>{c==="all"?"All Colleges":c.split(" ").slice(0,2).join(" ")}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading?<ActivityIndicator size="large" color="#60a5fa" style={{marginTop:50}}/>:(
        <FlatList data={filtered} keyExtractor={(i,idx)=>i._id||String(idx)}
          contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="book-outline" size={44} color="#1f2937"/><Text style={s.emptyT}>No subjects found</Text></View>}
          renderItem={({item})=>{
            const color=dc(item.department||item.name||"");
            return(
              <View style={s.card}>
                <View style={[s.codeBox,{backgroundColor:color+"18",borderColor:color+"40"}]}>
                  <Text style={[s.code,{color}]} numberOfLines={1}>{item.code||item.subjectCode||"—"}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.name} numberOfLines={1}>{item.name||item.subjectName||"—"}</Text>
                  <View style={s.tags}>
                    {item.department&&<View style={[s.tag,{borderColor:color+"40",backgroundColor:color+"12"}]}><Text style={[s.tagT,{color}]} numberOfLines={1}>{item.department.split("(")[0].trim()}</Text></View>}
                    {item.semester&&<View style={[s.tag,{borderColor:"#a78bfa40",backgroundColor:"#a78bfa12"}]}><Text style={[s.tagT,{color:"#a78bfa"}]}>Sem {item.semester}</Text></View>}
                    {item.credits&&<View style={[s.tag,{borderColor:"#34d39940",backgroundColor:"#34d39912"}]}><Text style={[s.tagT,{color:"#34d399"}]}>{item.credits} Credits</Text></View>}
                  </View>
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
  refreshBtn:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(96,165,250,0.1)",justifyContent:"center",alignItems:"center"},
  searchRow:{flexDirection:"row",alignItems:"center",marginHorizontal:16,marginVertical:10,backgroundColor:"#0f1b2d",borderRadius:12,paddingHorizontal:12,paddingVertical:10,gap:8,borderWidth:1,borderColor:"rgba(255,255,255,0.06)"},
  searchInput:{flex:1,color:"#fff",fontSize:13},
  filterRow:{paddingHorizontal:16,gap:8,paddingBottom:10},
  chip:{paddingHorizontal:14,paddingVertical:6,borderRadius:20,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",backgroundColor:"rgba(255,255,255,0.04)"},
  chipA:{borderColor:"rgba(96,165,250,0.5)",backgroundColor:"rgba(96,165,250,0.1)"},
  chipT:{color:"#64748b",fontSize:11,fontWeight:"600"},
  card:{flexDirection:"row",alignItems:"center",backgroundColor:"#0f1b2d",borderRadius:14,padding:12,marginBottom:8,gap:12,borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  codeBox:{paddingHorizontal:10,paddingVertical:8,borderRadius:10,borderWidth:1,minWidth:60,alignItems:"center"},
  code:{fontSize:11,fontWeight:"800"},
  name:{color:"#fff",fontSize:13,fontWeight:"700"},
  tags:{flexDirection:"row",gap:6,marginTop:6,flexWrap:"wrap"},
  tag:{paddingHorizontal:7,paddingVertical:2,borderRadius:7,borderWidth:1},
  tagT:{fontSize:9,fontWeight:"700"},
  empty:{alignItems:"center",paddingTop:60,gap:10},emptyT:{color:"#374151",fontSize:14,fontWeight:"700"},
});