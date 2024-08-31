import mongoose, { Schema } from 'mongoose';
import  jwt  from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const userSchema=new Schema(
    {
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true//isliye krte hai takki searching in databse easy ho jae
    },
    email:{
         type:String,
         required:true,
         unique:true,
         lowercase:true,
         trim:true,
    },
    fullname:{
        type:String,
        required:true,
        index:true,
        trim:true,
    },
    avatar:{
        type:String,//cloudinary url
        required:true,
    },
    coverImage:{
        type:String,
    },
    watchHistory:[
       {
           type:Schema.Types.ObjectId,
           ref:"Video",
       }
    ],
    password:{
        type:String,
        required:[true,'Password is required']
    },
    refreshToken:{
        type:String
    }


},{
    timestamps:true
}
)

//pre hooks are used immediate brfore the final submission eg encrypting the passwords
//next isilie kyuki ye middleware h to next ka access hona cahiye also isme time lgta h so we used asunc await
userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();

    this.password=await bcrypt.hash(this.password,10)
    next()
})


//to check the incrypted and user ke type ka( like number and string password) same h ya nahi

userSchema.methods.isPasswordCorrect=async function(password){
return await bcrypt.compare(password,this.password)

//password--*string wala password jo user diya*
//this.password--*encrypted password* ya jo user ka password saved ho pehle se
//we use async await kyuki encryption methods me time lagta hai
}

userSchema.methods.generateAccessToken=function(){
    //sign method generates tokens
   return  jwt.sign(
        {
            _id:this._id,
            email:this.email,
            fullname:this.fullname,
            username:this.username
        },process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


userSchema.methods.generateRefreshToken=function(){
    return  jwt.sign(
        {
            _id:this._id,
        },process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",userSchema)