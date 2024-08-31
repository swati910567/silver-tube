import React ,{useEffect} from "react";
import {useSelector}  from 'react-redux';
import {LoginPopup} from "../components";
import {useNavigate} from "react-router-dom";

function AuthLayout({children,authentication}){
    const navigate=useNavigate();
    const authStats=useSelector((state)=>state.auth.status);

    useEffect(()=>{

        if(!authentication && authStats!==authentication){
            return 
        }
    },[authStats,authentication,navigate]);

    if(authentication && authStats!==authentication){
        return <LoginPopup/>;
    }
    return children;
}
export default AuthLayout;