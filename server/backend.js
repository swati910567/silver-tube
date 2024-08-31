import dotenv from 'dotenv';
import {app} from './src/app.js'
import connectDB from './src/dB/index.js';

dotenv.config({
    path:'./.env'
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
