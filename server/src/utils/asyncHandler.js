

//asyncHandler=()=>{()=>{}} high order function mtlb accept as function also return it as function
const asyncHandler=(fn)=> async(req,res,next)=>{
    try{
await fn(req,res,next)
    }
    catch(error){
   res.status(error.code || 500).json({
            success: false,
                 message: error.message
    })
}
}

export {asyncHandler}