import React, { useState } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet, TextInput, ScrollView, Image } from "react-native";
import { StatusBar } from "expo-status-bar";

const CUPI_YELLOW = "#FFC107";
const DOG_BLUE    = "#00A1E0";
const PINK        = "#FF4FA2";

function themeColor(gender){ return gender === "female" ? PINK : DOG_BLUE; }

function Welcome({ onAuth, gender, setGender }) {
  return (
    <SafeAreaView style={{flex:1, backgroundColor:"#fff"}}>
      <StatusBar style="dark" />
      <View style={{flex:1, alignItems:"center", justifyContent:"center", padding:24}}>
        <Text style={{fontSize:32, fontWeight:"900", marginBottom:8}}>CupiDog</Text>
        <Text style={{color:"#666", marginBottom:16}}>Rencontre entre propriétaires & chiens</Text>

        <View style={{flexDirection:"row", gap:10, marginBottom:16}}>
          <Pressable onPress={()=>setGender("male")} style={[styles.pill, gender==="male" && {backgroundColor:DOG_BLUE, borderColor:DOG_BLUE}]}>
            <Text style={[styles.pillText, gender==="male" && {color:"#fff"}]}>Homme</Text>
          </Pressable>
          <Pressable onPress={()=>setGender("female")} style={[styles.pill, gender==="female" && {backgroundColor:PINK, borderColor:PINK}]}>
            <Text style={[styles.pillText, gender==="female" && {color:"#fff"}]}>Femme</Text>
          </Pressable>
        </View>

        <Pressable onPress={onAuth} style={[styles.btn, {backgroundColor:CUPI_YELLOW, borderColor:CUPI_YELLOW, marginBottom:10}]}>
          <Text style={[styles.btnText, {color:"#1a1a1a"}]}>Inscription</Text>
        </Pressable>
        <Pressable onPress={onAuth} style={[styles.btn, {backgroundColor:themeColor(gender), borderColor:themeColor(gender)}]}>
          <Text style={[styles.btnText, {color:"#fff"}]}>Connexion</Text>
        </Pressable>

        <Text style={{position:"absolute", bottom:16, color:"#999"}}>v1 • SDK 53</Text>
      </View>
    </SafeAreaView>
  );
}

function Frame({ current, setCurrent, gender, bg="#fff", children }) {
  return (
    <SafeAreaView style={{flex:1, backgroundColor:bg}}>
      <StatusBar style="dark" />
      <View style={{paddingTop:18, alignItems:"center"}}>
        <Text style={{fontSize:22, fontWeight:"800"}}>{gender==="female"?"CupiDog (Profil Femme)":"CupiDog (Profil Homme)"}</Text>
      </View>
      <View style={{flex:1}}>{children}</View>
      <View style={styles.tabBar}>
        <Tab id="menu"   cur={current} set={setCurrent} label="Accueil" icon="🏠" />
        <Tab id="dogs"   cur={current} set={setCurrent} label="Mes chiens" icon="🐶" />
        <Tab id="chat"   cur={current} set={setCurrent} label="Chat" icon="💬" />
        <Tab id="likes"  cur={current} set={setCurrent} label="Likes" icon="❤️" />
        <Tab id="owner"  cur={current} set={setCurrent} label="Profil" icon="👤" />
      </View>
    </SafeAreaView>
  );
}
function Tab({id, cur, set, label, icon}) {
  const active = cur===id;
  return (
    <Pressable onPress={()=>set(id)} style={styles.tabItem}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function MainMenu({ setCurrent, onLogout, gender }) {
  const COLOR = themeColor(gender);
  return (
    <Frame current="menu" setCurrent={setCurrent} gender={gender} bg={CUPI_YELLOW}>
      <View style={{flex:1, justifyContent:"space-between"}}>
        <View style={styles.menuGrid}>
          <Tile label="Mes chiens" onPress={()=>setCurrent("dogs")} color={COLOR}/>
          <Tile label="Rencontre / Parc" onPress={()=>setCurrent("park")} color={COLOR}/>
          <Tile label="Éleveur / Reproducteur" onPress={()=>setCurrent("breeders")} color={COLOR}/>
          <Tile label="Vente / Achat" onPress={()=>setCurrent("market")} color={COLOR}/>
        </View>
        <View style={{alignItems:"flex-end", paddingRight:16, paddingBottom:64}}>
          <Pressable onPress={onLogout} style={styles.logoutWhiteBlue}>
            <Text style={{color:DOG_BLUE, fontWeight:"800"}}>Déconnexion</Text>
          </Pressable>
        </View>
      </View>
    </Frame>
  );
}
function Tile({label, onPress, color}) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, {backgroundColor:color}]}>
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
  );
}

function DogsScreen({ setCurrent, dogs, addDog, gender }) {
  const [name,setName]=useState("");
  const [sex,setSex]=useState("Mâle");
  const [breed,setBreed]=useState("");
  const [age,setAge]=useState("");
  const [city,setCity]=useState("");
  const [desc,setDesc]=useState("");
  const [photoUrl,setPhotoUrl]=useState("");
  const [goal,setGoal]=useState("REPRODUCTION");

  const save=()=>{
    if(!name.trim()) return alert("Nom du chien obligatoire.");
    const item={ id:Date.now().toString(), name:name.trim(), sex, breed:breed.trim(), age:age.trim(), city:city.trim(), desc:desc.trim(), photoUrl:photoUrl.trim()||"https://picsum.photos/400/300", goal };
    addDog(item);
    setName(""); setBreed(""); setAge(""); setCity(""); setDesc(""); setPhotoUrl(""); setGoal("REPRODUCTION");
  };

  return (
    <Frame current="dogs" setCurrent={setCurrent} gender={gender}>
      <ScrollView contentContainerStyle={{paddingBottom:24}}>
        <View style={{paddingHorizontal:16, paddingTop:12}}>
          <Text style={styles.sectionTitle}>Ajouter un chien</Text>

          <Label>Nom</Label><Input value={name} onChangeText={setName} placeholder="Ex: Rex"/>
          <Label>Sexe</Label>
          <View style={{flexDirection:"row", gap:8}}>
            <Pill active={sex==="Mâle"} onPress={()=>setSex("Mâle")} text="Mâle"/>
            <Pill active={sex==="Femelle"} onPress={()=>setSex("Femelle")} text="Femelle"/>
          </View>
          <Label>Race</Label><Input value={breed} onChangeText={setBreed} placeholder="Ex: Rottweiler"/>
          <Label>Âge</Label><Input value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Ex: 3"/>
          <Label>Ville</Label><Input value={city} onChangeText={setCity} placeholder="Ex: Paris"/>
          <Label>Objectif</Label>
          <View style={{flexDirection:"row", flexWrap:"wrap", gap:8}}>
            <Pill active={goal==="REPRODUCTION"} onPress={()=>setGoal("REPRODUCTION")} text="REPRODUCTION"/>
            <Pill active={goal==="VENTE"} onPress={()=>setGoal("VENTE")} text="VENTE"/>
            <Pill active={goal==="BALADE"} onPress={()=>setGoal("BALADE")} text="SORTIE / BALADE AU PARC"/>
          </View>
          <Label>Description</Label><Input value={desc} onChangeText={setDesc} multiline style={{height:90, textAlignVertical:"top"}} placeholder="Caractère, santé, besoins…"/>
          <Label>Photo (URL)</Label><Input value={photoUrl} onChangeText={setPhotoUrl} autoCapitalize="none" placeholder="https://…/mon-chien.jpg"/>

          <Pressable onPress={save} style={[styles.btn,{backgroundColor:themeColor(gender), borderColor:themeColor(gender), marginTop:12}]}>
            <Text style={[styles.btnText,{color:"#fff"}]}>Enregistrer</Text>
          </Pressable>

          {dogs.length>0 && <Text style={[styles.sectionTitle,{marginTop:24}]}>Mes fiches</Text>}
          <View style={styles.grid}>
            {dogs.map(d=>(
              <View key={d.id} style={styles.card}>
                <Image source={{uri:d.photoUrl||"https://picsum.photos/400/300"}} style={styles.cardImg}/>
                <Text style={styles.cardTitle}>{d.name}</Text>
                <Text style={styles.cardSub}>{d.breed||"Race ?"} • {d.sex} • {d.age?`${d.age} ans`:"Âge ?"} • {d.goal}</Text>
                <Text style={styles.cardCity}>{d.city||"Ville ?"}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Frame>
  );
}

const Simple = ({title, gender, current, setCurrent}) => (
  <Frame current={current} setCurrent={setCurrent} gender={gender}>
    <View style={{padding:16}}><Text style={styles.sectionTitle}>{title}</Text></View>
  </Frame>
);

export default function App(){
  const [isAuthed, setIsAuthed]=useState(false);
  const [screen, setScreen]=useState("menu");
  const [gender, setGender]=useState("male");
  const [dogs, setDogs]=useState([]);

  const onAuth=()=>{ setIsAuthed(true); setScreen("menu"); };
  const onLogout=()=>{ setIsAuthed(false); };

  const addDog = (dog)=> setDogs(prev=>[dog, ...prev]);

  if(!isAuthed) return <Welcome onAuth={onAuth} gender={gender} setGender={setGender}/>;

  if(screen==="menu")     return <MainMenu setCurrent={setScreen} onLogout={onLogout} gender={gender}/>;
  if(screen==="dogs")     return <DogsScreen setCurrent={setScreen} dogs={dogs} addDog={addDog} gender={gender}/>;
  if(screen==="park")     return <Simple title="Rencontre / Parc" gender={gender} current="park" setCurrent={setScreen}/>;
  if(screen==="breeders") return <Simple title="Éleveur / Reproducteur" gender={gender} current="breeders" setCurrent={setScreen}/>;
  if(screen==="market")   return <Simple title="Vente / Achat" gender={gender} current="market" setCurrent={setScreen}/>;
  if(screen==="chat")     return <Simple title="Chat (à venir)" gender={gender} current="chat" setCurrent={setScreen}/>;
  if(screen==="likes")    return <Simple title="Mes Likes" gender={gender} current="likes" setCurrent={setScreen}/>;

  return null;
}

function Label({children}){ return <Text style={styles.label}>{children}</Text>; }
function Input(props){ return <TextInput style={[styles.input, props.style]} {...props}/>; }
function Pill({active, onPress, text}){
  return <Pressable onPress={onPress} style={[styles.pill, active && {backgroundColor:DOG_BLUE, borderColor:DOG_BLUE}]}><Text style={[styles.pillText, active&&{color:"#fff"}]}>{text}</Text></Pressable>;
}

const styles = StyleSheet.create({
  btn:{ paddingVertical:14, borderRadius:12, alignItems:"center", justifyContent:"center", borderWidth:1 },
  btnText:{ fontSize:16, fontWeight:"700" },
  pill:{ paddingVertical:10, paddingHorizontal:14, borderRadius:999, borderWidth:1, borderColor:"#ddd", backgroundColor:"#fff" },
  pillText:{ color:"#333", fontWeight:"700" },
  tabBar:{ flexDirection:"row", alignItems:"center", justifyContent:"space-around", paddingTop:5, paddingBottom:8, borderTopWidth:1, borderColor:"#0077AA", backgroundColor:DOG_BLUE, marginBottom:54, minHeight:50 },
  tabItem:{ alignItems:"center", justifyContent:"center", paddingHorizontal:6 },
  tabIcon:{ fontSize:18, color:"#e5f6ff" }, tabIconActive:{ color:"#fff" },
  tabLabel:{ fontSize:11, color:"#e5f6ff", marginTop:2, fontWeight:"700" }, tabLabelActive:{ color:"#fff" },
  menuGrid:{ alignSelf:"center", width:"100%", flexDirection:"row", flexWrap:"wrap", justifyContent:"center", gap:20, paddingHorizontal:16, marginTop:120, marginBottom:20 },
  tile:{ width:"42%", height:120, borderRadius:16, alignItems:"center", justifyContent:"center", padding:12 },
  tileText:{ color:"#fff", fontSize:16, fontWeight:"800", textAlign:"center" },
  sectionTitle:{ fontSize:18, fontWeight:"700", marginBottom:10 },
  label:{ fontSize:13, color:"#444", marginTop:8, marginBottom:4 },
  input:{ borderWidth:1, borderColor:"#ddd", borderRadius:10, paddingHorizontal:12, height:44 },
  grid:{ flexDirection:"row", flexWrap:"wrap", gap:12, marginTop:12, paddingHorizontal:16 },
  card:{ width:"47%", backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:"#eee", overflow:"hidden" },
  cardImg:{ width:"100%", height:110, backgroundColor:"#eee" },
  cardTitle:{ fontWeight:"700", fontSize:16, marginTop:6, marginHorizontal:8 },
  cardSub:{ color:"#666", marginHorizontal:8, marginTop:2, fontSize:12 },
  cardCity:{ color:"#999", marginHorizontal:8, marginTop:2, marginBottom:8, fontSize:12 },
});
