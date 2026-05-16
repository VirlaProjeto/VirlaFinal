import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  birthDate: true,
  role: true,
  bio: true,
  email: true,
  cpf: true,
  profileImage: true,
  registerNumber: true,
  hourlyRate: true,
  specialties: true,
  approach: true,
  description: true,
  city: true,
  state: true,
}

export const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: USER_PUBLIC_SELECT,
    })

    if (!user) {
      return res.status(404).json({ msg: 'Usuário não encontrado!' })
    }

    res.status(200).json({ user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro interno ao buscar usuário' })
  }
}

/** Body validado por loginBodySchema. */
const LoginUser = async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(404).json({ msg: 'Usuário não encontrado' })
  }

  const checkPassword = await bcrypt.compare(password, user.password)
  if (!checkPassword) {
    return res.status(422).json({ msg: 'Senha inválida!' })
  }

  try {
    const token = jwt.sign({ id: user.id }, process.env.SECRET)
    res.status(200).json({
      msg: 'Autenticação realizada com sucesso!',
      token,
      user: { id: user.id, name: user.name, role: user.role },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ msg: 'Erro ao gerar token.' })
  }
}

export { LoginUser }
