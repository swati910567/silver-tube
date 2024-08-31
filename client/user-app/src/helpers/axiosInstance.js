import axios from "axios";
//import {BASE_URL} from "../constants.js"

const baseURL = "http://localhost:3000/api/v1";
export const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
  });


