// app/super-admin/posts.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Alert, StatusBar, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const timeAgo=(date)=>{
  if(!date)return"—";const diff=Date.now()-new Date(date);const m=Math.floor(diff/60000);
  if(m<1)return"Just now";if(m<60)return`${m}m ago`;const h=Math.floor(m/60);if(h<24)return`${h}h ago`;return`${Math.floor(h/24)}d ago`;
};

export default function SuperAdminPosts(){
  const router=useRouter();
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [college,setCollege]=useState("all");
  const [colleges,setColleges]=useState([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [fetching,setFetching]=useState(false);

  useFocusEffect(useCallback(()=>{load(1,true);loadColleges();},[college]));

  const loadColleges=async()=>{
    try{const r=await API.get("/super-admin/colleges");setColleges((r.data?.colleges||[]).map(c=>typeof c==="string"?c:c.name).filter(Boolean));}catch{}
  };
  const load=async(p=1,reset=false)=>{
    if(fetching)return;setFetching(true);if(reset)setLoading(true);
    try{
      const params={page:p,limit:15};if(college!=="all")params.college=college;
      const r=await API.get("/api/posts",{params});
      const list=r.data?.posts||r.data||[];
      setPosts(prev=>reset?list:[...prev,...list]);
      setTotal(r.data?.total||0);setPage(p);
    }catch{setPosts([]);}
    finally{setLoading(false);setFetching(false);}
  };
  const filtered=posts.filter(p=>{
    if(!search)return true;const q=search.toLowerCase();
    return p.content?.toLowerCase().includes(q)||p.author?.name?.toLowerCase().includes(q)||p.title?.toLowerCase().includes(q);
  });
  const del=(item)=>Alert.alert("Delete Post","Is post ko delete karna chahte ho?",[
    {text:"Cancel",style:"cancel"},
    {text:"Delete",style:"destructive",onPress:async()=>{
      try{await API.delete(`/api/posts/${item._id}`);setPosts(p=>p.filter(x=>x._id!==item._id));setTotal(t=>t-1);}
      catch(e){Alert.alert("Error",e.response?.data?.message||"Failed");}
    }}
  ]);

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>All Posts & Feed</Text><Text style={s.sub}>{total} posts across colleges</Text></View>
        <Pressable onPress={()=>load(1,true)} style={s.refreshBtn}><Ionicons name="refresh" size={18} color="#f87171"/></Pressable>
      </LinearGradient>
      <View style={s.searchRow}>
        <Ionicons name="search" size={14} color="#374151"/>
        <TextInput style={s.searchInput} placeholder="Search posts..." placeholderTextColor="#374151" value={search} onChangeText={setSearch}/>
        {!!search&&<Pressable onPress={()=>setSearch("")}><Ionicons name="close-circle" size={15} color="#374151"/></Pressable>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {["all",...colleges].map(c=>(
          <Pressable key={c} onPress={()=>setCollege(c)} style={[s.chip,college===c&&s.chipA]}>
            <Text style={[s.chipT,college===c&&{color:"#f87171"}]}>{c==="all"?"All Colleges":c.split(" ").slice(0,2).join(" ")}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading?<ActivityIndicator size="large" color="#f87171" style={{marginTop:50}}/>:(
        <FlatList data={filtered} keyExtractor={(i,idx)=>i._id||String(idx)}
          contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}
          onEndReached={()=>{if(posts.length<total)load(page+1);}} onEndReachedThreshold={0.4}
          ListFooterComponent={fetching&&!loading?<ActivityIndicator color="#f87171" style={{marginVertical:14}}/>:null}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="newspaper-outline" size={44} color="#1f2937"/><Text style={s.emptyT}>No posts found</Text></View>}
          renderItem={({item})=>(
            <View style={s.card}>
              <View style={{flex:1}}>
                <View style={s.cardTop}>
                  <Text style={s.author}>{item.author?.name||item.authorName||"Unknown"}</Text>
                  <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
                </View>
                {item.title&&<Text style={s.postTitle} numberOfLines={1}>{item.title}</Text>}
                <Text style={s.content} numberOfLines={3}>{item.content||"No content"}</Text>
                <View style={s.cardBottom}>
                  {item.likes!=null&&<View style={s.stat}><Ionicons name="heart" size={11} color="#f87171"/><Text style={s.statT}>{item.likes}</Text></View>}
                  {item.comments!=null&&<View style={s.stat}><Ionicons name="chatbubble" size={11} color="#60a5fa"/><Text style={s.statT}>{item.comments}</Text></View>}
                  {item.college&&<Text style={s.college} numberOfLines={1}>{item.college.split(" ").slice(0,2).join(" ")}</Text>}
                </View>
              </View>
              <Pressable onPress={()=>del(item)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color="#f87171"/></Pressable>
            </View>
          )}
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
  refreshBtn:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(248,113,113,0.1)",justifyContent:"center",alignItems:"center"},
  searchRow:{flexDirection:"row",alignItems:"center",marginHorizontal:16,marginVertical:10,backgroundColor:"#0f1b2d",borderRadius:12,paddingHorizontal:12,paddingVertical:10,gap:8,borderWidth:1,borderColor:"rgba(255,255,255,0.06)"},
  searchInput:{flex:1,color:"#fff",fontSize:13},
  filterRow:{paddingHorizontal:16,gap:8,paddingBottom:10},
  chip:{paddingHorizontal:14,paddingVertical:6,borderRadius:20,borderWidth:1,borderColor:"rgba(255,255,255,0.08)",backgroundColor:"rgba(255,255,255,0.04)"},
  chipA:{borderColor:"rgba(248,113,113,0.5)",backgroundColor:"rgba(248,113,113,0.1)"},
  chipT:{color:"#64748b",fontSize:11,fontWeight:"600"},
  card:{backgroundColor:"#0f1b2d",borderRadius:14,padding:14,marginBottom:8,flexDirection:"row",gap:10,borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:4},
  author:{color:"#00c6ff",fontSize:12,fontWeight:"700"},time:{color:"#374151",fontSize:10},
  postTitle:{color:"#fff",fontSize:13,fontWeight:"700",marginBottom:4},
  content:{color:"#64748b",fontSize:12,lineHeight:18},
  cardBottom:{flexDirection:"row",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"},
  stat:{flexDirection:"row",alignItems:"center",gap:4},statT:{color:"#64748b",fontSize:11},
  college:{color:"#374151",fontSize:10,flex:1,textAlign:"right"},
  delBtn:{width:28,height:28,borderRadius:8,backgroundColor:"rgba(248,113,113,0.1)",justifyContent:"center",alignItems:"center"},
  empty:{alignItems:"center",paddingTop:60,gap:10},emptyT:{color:"#374151",fontSize:14,fontWeight:"700"},
});