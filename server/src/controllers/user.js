import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  //ye method isiliye jab hme dono access and refresh tokens banane pade
  //async handler tb use krte h jb web request handle krni ho yha pe ni krni to we are
  //using simple async
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //basically user ko ek object ki trh hi treat krre h nd so object me things add kiye
    //basically hme save krke bhi rakhna hota h tokens to database me taaki br br passwords na puchna pade
    user.refreshToken = refreshToken;
    //mtlb ki validation kuch mt lgao bs chup chap jke save krdo
    await user.save({ validateBeforeSave: false });

    //returnig access and refresh tokens
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "something went wrong");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validations or correct format--not empty
  //check if user already exists:username or email
  //check for images,avatar
  //upload them to cloudinary,avatar
  //create user object as mongodb me nosql databases me object hi banana pdta h
  //create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return response

  const { fullname, email, username, password } = req.body;
  //console.log("email: ", email);

  if (
    [fullname, email, username, password].some((field) => (field?.trim() === "")
  )) {
    throw new ApiError(400, "All fields are required");
  }

  //agr previously username ya same email se linked username hoga to will throw error ar is trh se check horra h
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists");
  }

  //handling images with middlewares as multer gives us access of req.files
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath= req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  //if avatar image is not prpoperly uploaded
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //uploading on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath).catch((error) => console.log(error));
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //creating object for db ab db se to sirf user bi baat kar sakata hai na
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    //upr code ka mtlb h ki agr coverimage h to url nikal lo nahi to empty rhne do
    //kyuki hmne coverimage k liye check nahi lagaya hai upr to code crash ho skta hai
    email,
    password,
    username: username.toLowerCase(),
  });

  //ab user bana bhi hai ya nahi ye check krege ar mongodb har entry k sth usko ek unique
  //id de dta hai agr to wo id mil gayi to means user create hua hai agr nahi mili to nhi hua create

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
    //is select field me hum wo cheez dalte h as string jo hame nahi cahiye hoti hai with negative sign
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //ab sb user wgera create ho gya to ab response bhjna hai
  return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"))
});

const loginUser = asyncHandler(async (req, res) => {
  //req body se data laao
  //username or email hai ya nahi
  //find the user
  //password check
  //access and refresh tokens
  //send tokens in form of cookies
  //send response of logged in

  const { email, password, username } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    //User.findOne ye moongose ya mongodb k through mila hua object h
    //$or use krke hm dono me se kisi ko bhi check kr skte h ki agr
    //dono m se koi bhi mil gaya to hume find krke dedo
    $or: [{ username }, { email }],
  })
  //ab agr dono m se ek v nahi mila means user kabhi registered tha hi nahi

  if (!user) {
    throw new ApiError(400, "User not found");
  }

  //ab agr user mil gya h to check password
  //yha pe user. jo h wo hmne khud method banaya hai
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  //now make access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  //ab user me bht sare chie m jo hm return ni krte after the
  //user logged in like password and refreshtokens so we must remove them
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken");

  //sending cookies
  //applying  these will ensure that cookies are not modified by any other only by the server
  const options = {
    httpOnly: true,
    secure: true,
  };
  //returning response to user
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //clear refresh tokens from databse
  await User.findByIdAndUpdate(
    req.user._id,
    {
      //to update
      $unset: {
        refreshToken:1,
      },
    },
    {
      //return me response milne p new updated value milegi
      //agr purani hi mil gyi to refresh token bhi mil jaega
      new: true
    }
  );

  //now for cookies
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //refresh token cahiye to cookies se access kr lete hai
  const incomingRefreshToken =
    req.cookies.refreshToken || refreshAccessToken.body.refreshToken;

  //if tokens aai hi nahi to error bhej do
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  //now verifying the tokens
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //momgodb pe query krre h jissse hme user ki id mil ske
    const user = await User.findById(decodedToken?._id);
    //agr glt token aa rha to
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Tokens");
    }

    //ab jo token save h ar incoming token ko compare krwana hai
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired");
    }
    //ab same hai dono to ek naya refresh token bna ke dedo ar usko save rakh lo
    //cookies me bhejne ke lie
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  //req.user means yha pe auth middleware k through data aa raha
  const user = await User.findById(req.user?._id);
  //hmne auth m ek method banaya tha to check for password correctness
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Password");
  }
  //setting new password in object
  user.password = newPassword;
  //saving it
  //as bki validations hme check nahi akrna hai sirf save krna h
  //to we are hsing validate before save
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User fetched Successfully"));
});

const updateAcoountDetails = asyncHandler(async (req, res) => {
  //req.user object se datas nikal rhi hu jo updation me use hona hai
  const { fullname, email } = req.user;
  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
        email: email,
      },
    },
    //update hone ke baad jo datas hai wo return honge new:true se
    { new: true }
  ).select("-password ");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//update files
const updateUserAvatar = asyncHandler(async (req, res) => {
  //multer k through milega req.file ar fir path leke hum multer m store kr dege
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  //uploading on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  //update krna h ab new avatar ko
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        //sirf avatar likhne se object pass hoga but hme to uski url update krni hai
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //multer k through milega req.file ar fir path leke hum multer m store kr dege
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }
  //uploading on cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage");
  }

  //update krna h ab new avatar ko
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        //sirf avatar likhne se object pass hoga but hme to uski url update krni hai
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"));
});


const getUserChannelProfile = asyncHandler(async (req, res) => {
  //ye hum uske url se nikalege
  const { username } = req.params
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    //ab ye ek document bn gaya
    {
      $match: {
        username: username?.toLowerCase(),
      }
    },
    //ab subscriber find out krre h to lookup use krege
    //as channel to select krne se milege subscriber ki
    //channel ke kitte subscriber hai
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      }
    },
    //ab maine kitne subscribe kiye hai usse nikalna hai
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      }
    },
    {
        //now sare fields ko rakhega hi plus add bhi krega additional cheezo ko
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelsSubscribedToCount:{
                $size:"$subscribedTo"
            },
            //ab dekhna h ki mai subscribers m hu ki nahi
            //$ denotes ki wo field h ar uske ander bhi further jaya ja skta hai
            //in array ar object dono k ander se calculate krke de skta hai
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullname:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
])

if (!channel?.length) {
    throw new ApiError(404,"Channel does  ot exist")
}
return res
.status(200)
.json(
    new ApiResponse(200,channel[0],"User Channel fetched successfully")
)

});


const getWatchHistory=asyncHandler(async(req,res)=>{
  const user=await User.aggregate([
    {
      //match k use se hm values find kr skte h id:value
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"vedios",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        //owner m sara hi aagya object but hume sirf uska pehla elemnent hi cahiye hoga 
        //to use lie further ek pipeline lagay hai
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[ 
                {
                  $project:{
                    fullname:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200,user[0].watchHistory,
      "Watch history fetched successfully")
  )
});


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAcoountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
