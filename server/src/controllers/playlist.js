import {  playlist } from "../models/playlist.js";
import { Video } from "../models/video.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose,{isValidObjectId} from "mongoose";

const createPlaylist=asyncHandler(async(req,res)=>{
    const {name, description}=req.body;
    if(!name || !description){
        throw new ApiError(400,"name and description both are required");
    }

    const playlist=await playlist.create({
        name,
        description,
        owner:req.user?._id,
    });

    if(!playlist){
        throw new ApiError(500,"failed to create playlist");
    }

    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"playlist created successfully"));
});

const updatePlaylist=asyncHandler(async(req,res)=>{
    const {name,description}=req.body;
    const {playlistId}=req.params;

    if(!name || !description){
        throw new ApiError(400,"name and description both are required")
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid PlaylistId");
    }

    const playlist=await playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(404,"Playlist not found");
    }

    if(playlist.qwner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"only owner can edit the playlist")
    }

    const updatedPlaylist=await playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set:{
                name,
                description,
            },
        },
        {new:true}
    );
    return res
    .status(200)
    .json(
        new ApiResponse(200,updatedPlaylist,"playlist updated successfully")
    );
});

const deletePlaylist=asyncHandler(async(req,res)=>{
    const {playlistId}=req.params;
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlist")
    }

    const playlist=await findById(playlistId)

    if(!playlist){
        throw new ApiError(400,"Playlist nor found")
    }

    if(playlist.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"Only owner can delete the playlist")
    }

    await playlist.findByIdAndDelete(playlist?._id);
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "playlist updated successfully"
        )
    );
});

const addVideoToPlaylist=asyncHandler(async(req,res)=>{
    const {playlistId,videoId}=req.params;

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid PlaylistId or VideoId");
    }

    const playlist=await playlist.findById(playlistId);
    const video=await video.findById(videoId);

    if(!playlist){
        throw new ApiError(400,"Playlist not found")
    }

    if(!video){
        throw new ApiError(400,"Video not found")
    }

    if((playlist.owner?.toString() && video.owner.toString()) !==req.user?._id.toString()){
        throw new ApiError(400,"Only owner can add video to their playlist")
    }

    const updatedPlaylist=await playlist.findByIdAndUpdate(
        playlist?._id,
        {
            //$addToSet: This operator is used to add a value to an array field only if the value is not already present.
            // It ensures that the array contains unique elements
            $addToSet:{
                videos:videoId,
            },
        },
        {new:true}

    );

    if(!updatedPlaylist){
        throw new ApiError(
            400,
            "failed to add video to playlist please try again later"
        );
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
        200,
        updatedPlaylist,
        "Added video to playlist successfully")
    );
});

const removeVideoFromPlaylist=asyncHandler(async(req,res)=>{
    const {playlistId,videoId}=req.params;

    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid PlaylistId or VideoId") 
    }

    const playlist=await playlist.findById(playlistId);

    const video=await video.findById(videoId);

    if(!playlist){
        throw new ApiError(404,"Playlist not found");
    }
    if(!video){
        throw new ApiError(400,"Video not found");
    }

    if((playlist.owner?.toString() && video.owner.toString())!==req.user?._id.toString()){
        throw new ApiError(
            400,
            "only owner can remove video from their playlist"
        );
    }

    const updatedPlaylist=await playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                videos:videoId,
            },
        },
        {new:true}
    );

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Removed video from playlist successfully"
        )
    );

});

const getPlaylistById=asyncHandler(async(req,res)=>{
    const {playlistId}=req.params;
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlist id")
    }

    const playlist=await playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(400,"Playlist not found")
    }

    const playlistVideos=await playlist.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos",
            }
        },
        {
            $match:{
                "videos.isPublished":true
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                },
                owner:{
                    $first:"$owner"
                }
            }
        },
        {
            $project:{
                name:1,
                description:1,
                createdAt:1,
                updatedAt:1,
                totalVideos:1,
                totalViews:1,
                videos:{
                    _id:1,
                    "videoFile.url":1,
                    "thumbnail.url":1,
                    title:1,
                    description:1,
                    duration:1,
                    createdAt:1,
                    views:1
                },
                owner:{
                    username:1,
                    fullname:1,
                    "avatar.url":1
                }
            }
        }
    ]);
    return res
    .status(200)
    .json(new ApiResponse(200,playlistVideos[0],"playlist fetched successfully"))
});

const getUserPlaylists=asyncHandler(async(req,res)=>{
    const {userId}=req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId")
    }

    const playlists=await playlist.aggregate([
        {$match:{
            owner:new mongoose.Types.ObjectId(userId)
        },
    },
    {
        $lookup:{
            from:"videos",
            localField:"videos",
            foreignField:"_id",
            as:"videos"
        }
    },
    {
        $addFields:{
            totalVideos:{
                $size:"$videos"
            },
            totalViews:{
                $sum:"$videos.views"
            }
        }
    },
    {
        $project:{
            _id:1,
            name:1,
            description:1,
            totalVideos:1,
            totalViews:1,
            updatedAt:1
        }
    }
    ]);

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        playlists,
        "User playlists fetched successfully"
    ));
});

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
};


