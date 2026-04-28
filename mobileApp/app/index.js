// app/index.js
// Checks persisted auth state and redirects to the correct role dashboard.

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Role → route + storage key mapping
const ROLE_MAP = {
  student: { loggedInKey: "studentLoggedIn", route: "/student/dashboard" },
  teacher: { loggedInKey: "teacherLoggedIn", route: "/teacher/dashboard" },
  admin: { loggedInKey: "adminLoggedIn", route: "/admin/dashboard" },
  "super-admin": { loggedInKey: "superAdminLoggedIn", route: "/super-admin/dashboard" },
};

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");

      if (!token) {
        setRedirect("/login");
        setChecking(false);
        return;
      }

      for (const [role, config] of Object.entries(ROLE_MAP)) {
        const isLoggedIn = await AsyncStorage.getItem(config.loggedInKey);
        if (isLoggedIn === "true") {
          const dataKey = role === "super-admin" ? "superAdminData"
            : role === "admin" ? "adminData"
              : role === "teacher" ? "teacherData"
                : "studentData";

          const userData = await AsyncStorage.getItem(dataKey);
          if (userData) {
            setRedirect(config.route);
            setChecking(false);
            return;
          }
        }
      }

      setRedirect("/login");
      setChecking(false);

    } catch (e) {
      console.log("Auth check error:", e.message);
      setRedirect("/login");
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

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