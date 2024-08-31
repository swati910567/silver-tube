
import dotenv from 'dotenv';
import {app} from './src/app.js'
import connectDB from './dB/index.js';

dotenv.config({
    path:'./env'
})


connectDB()//async await jb implement hota h tb kuch promises bhi return krta hai 
.then(()=>{
    app.listen((process.env.PORT||3000),()=>{
        console.log(`Server is running at port: ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log("Error",error)
    throw error;
})




















/*
//databe se jab v connect kro always use try catch and async await as issues aati hai connection me

( async ()=>{
try{
    //mongoose connect krne smay hme string dena pdta h jo hm is trh se access krre h process.env.name/databse_name
await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

//ek listener lgate h taakiagr kuch error ho jisme express connenct ni ho para to error throw krega

app.on("error",(error)=>{
    console.log("ERROR: ",error)
    throw error
})

//jb app connect kr para ho tb ya listen kr pa rha h tab
app.listen(process.env.PORT,()=>{
    console.log(`App is listening on port ${process.env.PORT}`)
})

}
catch(error){
   console.log("ERROR:",error) 
   throw error
}

})()

*/
