//this middleware will just check ki user hai ya nahi hai
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.js";

//miidleware me next use hota hai jo kaam khtm hone pe next destination tak le jata h
export const verifyJWT = asyncHandler(async (req, res, next) => {
  //logout krne ke lie user k through hi hum acces lege cookie ka
 try {
     const token = req.cookies?.accessToken || 
     req.header("Authorization")?.replace("Bearer ","");
   
   
     //agr  token nahi hai to
   if(!token){
       throw new ApiError(401," Unauthorized request")
   }
   
   
   //agr token hai to jwt se match karo ki sahi hai ki nahi
   const decodeToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
   
   //yha _id is name ar ,? means optional hai to
    const user=await User.findById(decodeToken?._id).select("-password -refreshToken")
   
   
    //agr user nahi h to
    if(!user){
       throw new ApiError(401,"Invalid Access Token")
    }
    //adding new object new and giving ref of user
req.user=user;
//next means current kaam ho gaya hai ab next kaam ko 
//krne hai
next();

 } catch (error) {
    throw new ApiError(401,error?.message||
        "Invalid access token"
    )
 }

})
