import axios from "axios";
//import {BASE_URL} from "../constants.js"

const baseURL = "https://silver-tube-backend.onrender.com";
export const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
  });


