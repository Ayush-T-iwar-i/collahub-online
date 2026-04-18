// app/index.js
// ✅ App khulte hi check karta hai — user logged in hai ya nahi
// Agar hai → seedha dashboard, nahi → login screen

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Role → route + storage key mapping
const ROLE_MAP = {
  student:       { loggedInKey: "studentLoggedIn",     route: "/student/dashboard"      },
  teacher:       { loggedInKey: "teacherLoggedIn",     route: "/teacher/dashboard"      },
  admin:         { loggedInKey: "adminLoggedIn",       route: "/admin/dashboard"        },
  "super-admin": { loggedInKey: "superAdminLoggedIn",  route: "/super-admin/dashboard"  },
};

export default function Index() {
  const [checking,  setChecking]  = useState(true);  // AsyncStorage check ho raha hai
  const [redirect,  setRedirect]  = useState(null);  // Kahan bhejein

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // Pehle accessToken check karo — hai ya nahi
      const token = await AsyncStorage.getItem("accessToken");

      if (!token) {
        // Token nahi — login pe bhejo
        setRedirect("/login");
        setChecking(false);
        return;
      }

      // Token hai — kaunsa role logged in hai?
      for (const [role, config] of Object.entries(ROLE_MAP)) {
        const isLoggedIn = await AsyncStorage.getItem(config.loggedInKey);
        if (isLoggedIn === "true") {
          // Is role ka data bhi check karo
          const dataKey = role === "super-admin" ? "superAdminData"
                        : role === "admin"       ? "adminData"
                        : role === "teacher"     ? "teacherData"
                        : "studentData";

          const userData = await AsyncStorage.getItem(dataKey);
          if (userData) {
            // ✅ Logged in — seedha dashboard
            setRedirect(config.route);
            setChecking(false);
            return;
          }
        }
      }

      // Token hai but koi role match nahi — login pe bhejo
      setRedirect("/login");
      setChecking(false);

    } catch (e) {
      // Koi error aaye — safe side pe login
      console.log("Auth check error:", e.message);
      setRedirect("/login");
      setChecking(false);
    }
  };

  // AsyncStorage check ho raha hai — loading show karo
  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  // Redirect karo
  return <Redirect href={redirect} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080d17",
    justifyContent: "center",
    alignItems: "center",
  },
});