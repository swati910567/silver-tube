import axios from "axios";
//import {BASE_URL} from "../constants.js"

const baseURL = "silver-tube.vercel.app";
 const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
  });
export default axiosInstance;


