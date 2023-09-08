import { Account, Profile } from 'next-auth'
import { redirect } from 'next/navigation'
import bcrypt from 'bcrypt'
import { getServerSession } from 'next-auth'
import { nextauthOptions } from '@/lib/nextauthOptions'
import connectDB from '@/lib/mongodb'
import User from '@/lib/models/user.model'

export async function getUserSession () {
  const session = await getServerSession(nextauthOptions)
  return ({ session })
}

interface ExtendedProfile extends Profile {
  picture?: string;
}

interface SignInWithOauthParams {
  account: Account,
  profile: ExtendedProfile
}

export async function signInWithOauth ({
  account,
  profile
}: SignInWithOauthParams) {
  // console.log({account, profile})
  connectDB()

  const user = await User.findOne({email: profile.email})

  if (user) return true
  
  const newUser = new User({
    name: profile.name,
    email: profile.email,
    image: profile.picture,
    provider: account.provider
  })

  // console.log(newUser)
  await newUser.save()
  
  return true
}

interface GetUserByEmailParams {
  email: string
}

export async function getUserByEmail({
  email
}: GetUserByEmailParams) {
  connectDB()

  const user = await User.findOne({email}).select('-password')
  
  if (!user) {
    throw new Error('User does not exist!')
  }

  // console.log({user}) // _id: new ObjectId("64f811a7f737a8d376bdabce")
  return {...user._doc, _id: user._id.toString()}
}

export interface UpdateUserProfileParams {
  name: string,
}

export async function updateUserProfile ({
  name
}: UpdateUserProfileParams) {
  'use server'
  const session = await getServerSession(nextauthOptions)
  // console.log(session)

  connectDB()
    
  try {
    if (!session) {
      throw new Error('Unauthorization!')
    }

    const user = await User.findByIdAndUpdate(session?.user?._id, {
      name
    }, { new: true }).select('-password')
  
    if (!user) {
      throw new Error('User does not exist!')
    }
  
    return { success: true }
  } catch (error) {
    redirect(`/error?error=${(error as Error).message}`)
  }
}

export interface SignUpWithCredentialsParams {
  name: string,
  email: string,
  password: string,
}

export async function signUpWithCredentials ({
  name,
  email,
  password
}: SignUpWithCredentialsParams) {
  'use server'
  connectDB()

  try {
    const user = await User.findOne({email})

    if (user) {
      throw new Error('User already exists.')
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    })

    // console.log({newUser})
    await newUser.save()

    return { success: true }
  } catch (error) {
    redirect(`/error?error=${(error as Error).message}`)
  }
}

export interface SignInWithCredentialsParams {
  email: string,
  password: string,
}

export async function signInWithCredentials ({
  email,
  password
}: SignInWithCredentialsParams) {
  connectDB()
  
  const user = await User.findOne({email})

  if (!user) {
    throw new Error('Invalid email or password!')
    // throw new Error('User does not exist!')
  }

  const passwordIsValid = await bcrypt.compare(
    password,
    user.password
  )

  if (!passwordIsValid) {
    throw new Error('Invalid email or password!')
    // throw new Error('Invalid password!')
  }
    
  return {...user._doc, _id: user._id.toString()}
}
