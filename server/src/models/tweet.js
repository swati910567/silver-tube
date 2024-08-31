import mongoose ,{Schema} from "mongoose";
const tweetSchema=new Schema(
{
    content:{
        type:String,
        required:true,
    },
    qwner:{
        type:Schema.Types.ObjectId,
        ref:"user"
    }
},{timestamps:true})



export const Tweet=mongoose.model("Tweet",tweetSchema)