import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:3002',
})

// Attach JWT for protected routes (messages, feed, profile, etc.)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('meuToken')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api
