import React, {createContext, useContext, useState} from "react";

const AuthContext = createContext(null);

export function AuthProvider({children}){
    const [user] = useState({
        id: "user-1",
        name: "Ploy S.",
        studentId: "6809000001",
        role: "STUDENT"
    });

    return(
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
}

 export function useAuth(){
        return useContext(AuthContext);
    }