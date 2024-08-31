import mongoose , {Schema} from "mongoose";

const playlistSchema=new Schema({
    name:{
        type:String,
       required:true,
    },
    description:{
        type:String,
     required:true,
    },
    //arrays of object
    vedios:[
        {
        type:Schema.Types.ObjectId,
        ref:"Video",
        }
    ],
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
},{timestamps:true})
export const playlist=mongoose.model("Playlist",playlistSchema)