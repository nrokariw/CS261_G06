import React, { createContext, useContext, useState } from "react";
import { loginWithTuAccount } from "../api/authApi";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState({
        id: "user-1",
        name: "Ploy S.",
        studentId: "6809000001",
        role: "STUDENT"
    });

    //เพิ่ม state สำหรับ token
    const [token, setToken] = useState(() => {
        try {
            return localStorage.getItem("token") || "Mock-jwt-token-123";
        } catch {
            return "Mock-jwt-token-123";
        }
    });
    
    //ฟังก์ชันจำลองการ Login
    const login = async (username, password) => {
        //เชื่อมต่อกับ API ตรงนี้
        const data = await loginWithTuAccount(username, password);
        const nextToken = data?.token || "Mock-jwt-token-123";
        setToken(nextToken);
        try {
            localStorage.setItem("token", nextToken);
        } catch {
            // Ignore storage errors
        }
        if (data?.userProfile || data?.user) {
            setUser(data.userProfile || data.user);
        }
        return data;
    };

    //ฟังก์ชันการจำลองการ logout
    const logout = () => {
        setUser(null);
        setToken(null);
        try {
            localStorage.removeItem("token");
        } catch {
            // Ignore storage errors
        }
    };

    return(
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

 export function useAuth(){
        return useContext(AuthContext);
    }
