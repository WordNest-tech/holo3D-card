// src/api/client.js - Standalone Axios Client for HoloCard Studio
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

export default client;
