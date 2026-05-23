import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  // Volta duas pastas (sai de config, sai de src) e entra em uploads
  destination: path.resolve(__dirname, '..', '..', 'uploads'),
  
  filename: (request, file, callback) => {
    const hash = crypto.randomBytes(6).toString('hex')
    const timestamp = Date.now()
    const fileName = `${timestamp}-${hash}.webm`
    
    callback(null, fileName)
  }
})

const upload = multer({ storage })
export default upload