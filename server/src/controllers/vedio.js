import {asyncHandler} from "../utils/asyncHandler.js"
import  {ApiError} from "../utils/ApiError.js"
import {Video} from "../models/video.js"
import {User} from "../models/user.js"
import {Comment} from "../models/comments.js"
import { uploadOnCloudinary,deleteOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {like} from "../models/like.js"
import mongoose,{isValidObjectId} from "mongoose"


//get all vedios based on query,sort,pagination
/*Create a pipeline: Define an array of aggregation stages (e.g., $match, $project, $group, $sort, etc.).
Execute the pipeline: Pass the pipeline as an argument to the Video.aggregate() method.
Process data: MongoDB processes the documents in the "Video" collection through each stage of the pipeline.
Return results: The final result of the pipeline is returned as an array of documents.*/

const getAllVideos=asyncHandler(async(req,res)=>{
    const {page=1,limit=10,query,sortBy,sortType,userId}=req.query;
    const pipeline=[];
    if(query){
        pipeline.push({
            $search:{
                index:"search-videos",
                text:{
                    path:["title","description"]
                }
            }
        });
    }

    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400,"Invalid userId");
        }
        pipeline.push({
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        });
    }

    //fetching vedios that are pushlished as true only

    pipeline.push({
        $match:{
            isPublished:true
        }
    });

     //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
if(sortBy && sortType){
    pipeline.push({
        $sort:{
            [sortBy]:sortType==="asc"?1:-1
        }
    });
}
else{
    pipeline.push({$sort:{createdAt:-1}});
}
pipeline.push({
    $lookup:{
        from:"users",
        localField:"owner",
        foreignField:"_id",
        as:"ownerDetails",
        pipeline:[{
            $project:{
                username:1,
                "avatar.url":1
            }
        }]
    }
},{
    //used to flatten array or object for ease
    $unwind:"$ownerDetails"
}
)

const videoAggregate=Video.aggregate(pipeline)

const options={
    page:parseInt(page,10),
    limit:parseInt(limit,10)
};


//Handles complex pagination logic, including calculating total pages, offsets, and limits.
const video=await Video.aggregatePaginate(videoAggregate,options);

return res
.status(200)
.json(new ApiResponse(200, "Videos fetched successfully"))

});

//get vedio, upload to cloudinary,create vedio
const publishAVideo=asyncHandler(async(re,res)=>{
    const {title,description}=req.body;
//The code checks if either title or description is an empty string after 
//trimming whitespace. If at least one of them is empty, the condition evaluates to true

    if([title,description].some((field)=>field?.trim()==="")){
        throw new ApiError(400," All fields are required")
    }

    const videoFileLocalPath=req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;
if(!videoFileLocalPath){
    throw new ApiError(400,"videoLocalPath is required")
}

if(!thumbnailLocalPath){
    throw new ApiError(400,"thumbnailLocalPath is required")
}

const videoFile=await uploadOnCloudinary(videoFileLocalPath);
const thumbnail=await uploadOnCloudinary(thumbnailLocalPath);

if(!videoFile){
    throw new ApiError(400,"Video file not found");
}
if(!thumbnail){
    throw new ApiError(400,"Thumbnail not found");
}


//creating vedio
const video=await Video.create({
    title,
    description,
    duration:videoFile.duration,
    videoFile:{
        url:videoFile.url,
        public_id:thumbnail.public_id
    },
    thumbnail:{
        url:thumbnail.url,
        public_id:thumbnail.public_id
    },
    owner:req.user?._id,
    isPublished:false
});

const videoUploaded=await Video.findById(video._id)
if(!videoUploaded){
    throw new ApiError(400,"Video Upload failed please try again !!!");
}

return res
.status(200)
.json(new ApiResponse (200,"Video uploaded successfully"))
});

//get video by ID
const getVideoById=asyncHandler(async(req,res)=>{
    const{videoId}=req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId");
    }
    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400,"Invalid user Id");
    }


    const video=await Video.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline:[
                    {
                        $lookup:{
                            from:"subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as:"subscribers"
                        }
                    },
                    {
                        $addFields:{
                            subscribersCount:{
                                $size:"$subscribers"
                            },
                            isSubscribed:{
                                $cond:{
                                    if:{
                                        $in:[req.user?._id,"$subscribers.subscribe"]
                                    },
                                    then:true,
                                    else:false
                                }
                            }
                        }
                    },
                    {
                        $project:{
                            username:1,
                            "avatar.url":1,
                            subscribersCount:1,
                            isSubscribed:1
                        }
                    }
                ]
            }
            },
            {
                $addFields:{
                    likesCount:{
                        $size:"$likes"
                    },
                    owner:{
                        $first:"$owner"
                    },
                    isLiked:{
                        $cond:{
                            if:{$in:[req.user?._id,"$likes.likedBy"]},
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                $projects:{
                    "videoFile.url":1,
                    title:1,
                    description:1,
                    views:1,
                    createdAt:1,
                    duration:1,
                    comments:1,
                    owner:1,
                    likesCount:1,
                    isLiked:1
                }
            }
        
        ]);
        if(!video){
            throw new ApiError(500,"Failed to fetch video");
        }
        //increment views if vedios fetched successfully
        await Video.findByIdAndUpdate(videoId,{
            $inc:{
                views:1
            }
        });

        //add this video to users watch history
        await User.findByIdAndUpdate(req.user?._id,{
            $addToSet:{
                watchHistory:videoId
            }
        });

        return res
        .status(200)
        .json(
            new ApiResponse(200,video[0],"video details fetched successfully")
        );

    });

    //update video details like,title,decription,thumbnail
    const updateVideo=asyncHandler(async(req,res)=>{
        const {title,description}=req.body;
        const {videoId}=req.params;

        if(!isValidObjectId(videoId)){
            throw new ApiError(400,"title and description are required")
        }
        if(!(title && description)){
            throw new ApiError(400,"title and description are required")
        }

        const video=await Video.findById(videoId);

        if(!video){
            throw new ApiError(404,"No video found");
        }

        if(video?.owner.toString()!==req.user?._id.toString()){
            throw new ApiError(400,"You can't edit this video as you are not the owner")
        }
        //delete old thumbnail and updating with new one
        const thumbnailToDelete=video.thumbnail.public_id;

        //give thumbnail
        const thumbnailLocalPath=req.files?.path;

        if(!thumbnailLocalPath){
            throw new ApiError(400,"Thumbnail is required")
        }
        const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
        
        if(!thumbnail){
            throw new ApiError(400,"Thumbnail not found")
        }

        const updatedVideo=await Video.findByIdAndUpdate(videoId,{
            $det:{
                title,
                description,
                thumbnail:{
                    public_id:thumbnail.public_id,
                    url:thumbnail.url
                }
            }
        },
    {new:true}
);
if(!updateVideo){
    throw new ApiError(500,"Failed to update video please try again later")
}


if(updateVideo){
    await deleteOnCloudinary(thumbnailToDelete);
}
return res
.status(200)
.json(new ApiResponse(200,updatedVideo,"Video Updated Successfully"))
    })

    //delete a video
    const deleteVideo=asyncHandler(async(req,res)=>{
        const {videoId}=req.params;

        if(!isValidObjectId(videoId)){
            throw new ApiError(400, "Invalid videoId");
        }

        const video=await Video.findById(videoId);
        if(!video){
            throw new ApiError(400,"No video found")
        }

        if(video?.owner.toString()!=req.user?._id.toString()){
            throw new ApiError(400,"You can't delete this video as you are not the owner")
        }

        const videoDeleted=await Video.findByIdAndDelete(video?._id);

        if(!videoDeleted){
            throw new ApiError(400,"Failed to delete the video please try again later");
        }

        await deleteOnCloudinary(video.thumbnail.public_id),
       await deleteOnCloudinary(video.videoFile.public_id,"video")

       //delete video likes
       await like.deleteMany({
        video:videoId
       })

       //delete the comments
       await Comment.deleteMany({
        video:videoId,
       })

       return res
       .status(200)
       .json(
        new ApiResponse (200,{},"Video deleted successfully")
       );
    });

    //toggle publish status of video

    const togglePublishStatus=asyncHandler(async(req,res)=>{
        const {videoId}=req.params;

        if(!isValidObjectId(videoId)){
            throw new ApiError(400,"Invalid videoId")
        }

        const video=await Video.findById(videoId);

        if(!video){
            throw new ApiError(400," Video not found")
        }

        if(video?.owner.toString()!=req.user?._id.toString()){
            throw new ApiError(400,"You can't toggle publish status as you are not the owner")
        }

        const toggledVideoPublish=await Video.findByIdAndUpdate(
            videoId,
            {
                $set:{
                    isPublished:!video?.isPublished
                }
            },
            {
                new:true
            }
        )
        if(!toggledVideoPublish){
            throw new ApiError(500,"Failed to toogle video publish status")
        }

        return res
        .status(200)
        .json(new ApiResponse(200,{
            isPublished:toggledVideoPublish.isPublished
        },
    "Video publish toogled successfully"));
    });


    export {
        publishAVideo,
        updateVideo,
        deleteVideo,
        getAllVideos,
        getVideoById,
        togglePublishStatus,
    };