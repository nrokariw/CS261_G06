import React, {createContext, useContext, useState} from "react";

export const AuthContext = createContext(null);

export function AuthProvider({children}){
    const [user] = useState({
        id: "user-1",
        name: "Ploy S.",
        studentId: "6809000001",
        role: "STUDENT"
    });

    //เพิ่ม state สำหรับ token
    const [token, setToken] = useState(null);
    
    //ฟังก์ชันจำลองการ Login
    const login = async (username, password) => {
        //เชื่อมต่อกับ API ตรงนี้
        console.log("Mock login...");
        setToken("Mock-jwt-token-123")
    };

    //ฟังก์ชันการจำลองการ logout
    const logout = () => {
        setUser(null);
        setToken(null);
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
    