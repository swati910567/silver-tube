import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
import { asyncHandler } from "./asyncHandler.js";

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET ,

});




const uploadOnCloudinary= async (localFilePath)=>{
    try{
        if(!localFilePath) return null
        //uploading file on cloudinary
        const response= await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //now file has been uploaded successfully
        //ab hm upload hone k bd jo public url h wo print krre h
       fs.unlinkSync(localFilePath)
        return response;
    }
    //ab ye to pata hai ki server pe file aa chuki h ar agr wo upload ni bhi hua h to 
    // hum use apne srver se hata dete hai taaki koi malicious file ya corrupt file na rh jae
    
    
    catch (error){
       fs.unlinkSync(localFilePath)
       //removes the locally saved temporary file as the upload operation got failed
       return null;
    }
};

const deleteOnCloudinary=async(public_id,resource_type="image")=>{
    try {
        if(!public_id)return null
        //now delete the file from cloudinary
        const response=await cloudinary.uploader.destroy(public_id,{
            resource_type:`${resource_type}`
        });
    } catch (error) {
        return error;
    };
}

export {uploadOnCloudinary,deleteOnCloudinary}