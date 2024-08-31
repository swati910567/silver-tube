import mongoose ,{isValidObjectId} from "mongoose";
import { Comment } from "../models/comments.js";
import { Video } from "../models/video.js";
import { like } from "../models/like.js";
import  {ApiError}  from "../utils/ApiError.js";
import  {ApiResponse}  from "../utils/ApiResponse.js";
import  {asyncHandler}  from "../utils/asyncHandler.js";

//get all comments for a video
const getVideoComments=asyncHandler(async(req,res)=>{
    const {videoId}=req.params
    const {page=1,limit=10}=req.query;
    const video=await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    const commentsAggregate=Comment.aggregate([
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"$likes"
                },
                isLiked:{
                    $cond:{
                        if:{$in:[req.user?._id,,"$likes.likedBy"]},
                    }
                }
            }
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $project:{
                content:1,
                createdAt:1,
                likesCount:1,
                owner:{
                    username:1,
                    fullname:1,
                    "avatar.url":1
                },
                isLiked:1
            }
        }
        
    ]);

    const options={
        page:parseInt(page,10),
        limit:parseInt(page,10)
    };


    const comments=await Comment.aggregatePaginate(commentsAggregate,options);

    return res
    .status(200)
    .json(new ApiResponse(200,comments,"Comments fetchd successfully"))
});

//add a comment to a video

const addComment=asyncHandler(async(req,res)=>{
    const {videoId}=req.params;
    const {content}=req.body;

    if(!content){
        throw new ApiError(400,"Content is required")
    }
    const video=await Video.findById(videoId)

    if(!video){
        throw new ApiError(400,"Video not found");
    }

    const comment=await Comment.create({
        content,
        //This links the comment to a specific video using its ID (videoId).
        video:videoId,
        //This sets the owner of the comment. It checks if there's a user logged in (req.user). If there is, it uses the user's ID (_id) as the owner. 
        //If there's no user, it doesn't set an owner.
        owner:req.user?._id
    });
    if(!comment){
        throw new ApiError(400,"Failed to add comment please try again later")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,comment,"Comment added successfully"))
});

//update comment to a video

const updateComment=asyncHandler(async(req,res)=>{
    const {commentId}=req.params;
    const {content}=req.body;

    if(!content){
        throw new ApiError(400,"content is required")
    }

    const comment=await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(400,"Comment not found")
    }

    if(comment?.owner.toString()!=req.user?._id.toString()){
        throw new ApiError(400,"Comment not found")
    }

    const updatedComment=await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set:{
                content
            }
        },
        {new:true}
    );

    if(!updateComment){
        throw new ApiError(400,"Failed to edit the comment please try again later")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,updatedComment,"Comment edited successfully"))
});

//delete a comment
const deleteComment=asyncHandler(async(req,res)=>{
    const {commentId}=req.params;
    const comment=await Comment.findById(commentId);
if(!comment){
    throw new ApiError(400,"Commemt not found")
}

if(comment?.owner.toString()!=req.user?._id.toString()){
    throw new ApiResponse(400,"only comment owner can delete their comment");
}

await Comment.findByIdAndDelete(commentId);
await like.deleteMany({
    comment:commentId,
    likedBy:req.user
});
return res
.status(200)
.json(200,{commentId},"Comment deleted successfully")

})

export{getVideoComments,
    addComment,
    updateComment,
    deleteComment
}