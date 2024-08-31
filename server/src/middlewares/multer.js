import multer from "multer";
//basically ye middleware jaisa work karega
//isse hum files accept kr sakege


const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"./public/temp")
    },
    filename:function(req,file,cb){
        cb(null,file.originalname)
    }
})


export const upload=multer({
    storage,
})