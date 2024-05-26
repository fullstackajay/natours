const sharp = require('sharp')
const multer = require('multer')
const Tour = require('../models/tourModel')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const { deleteOne, updateOne, getOne } = require('./handlerFactory')

// This is the code if we want to save the image. But i want to resize first thus i need to save as buffer.
// const multerStorage = multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, 'public/img/users')
// 	},
// 	filename: (req, file, cb) => {
// 		const ext = file.mimetype.split('/')[1]
// 		cb(null, `user-${req.user.id}-${Date.now()}.${ext}`)
// 	}
// })

const multerStorage = multer.memoryStorage()

const filterPhoto = (req, file, cb) => {
	if (file.mimetype.startsWith('image')) {
		cb(null, true)
	} else {
		cb(new AppError('Not an image! Please upload only images.', 400), false)
	}
}

const upload = multer({
	storage: multerStorage,
	fileFilter: filterPhoto
})

exports.uploadUserPhoto = upload.single('photo')

// Resize Photo
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
	if (!req.file) return next()

	req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`

	await sharp(req.file.buffer)
		.resize(500, 500)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/img/users/${req.file.filename}`)

	next()
})

const filterObj = (obj, ...allowedFields) => {
	const newObj = {}
	Object.keys(obj).forEach(el => {
		if (allowedFields.includes(el)) {
			newObj[el] = obj[el]
		}
	})
	return newObj
}

exports.getMe = (req, res, next) => {
	req.params.id = req.user.id
	next()
}

exports.getAllUsers = catchAsync(async (req, res, next) => {
	const users = await User.find()

	// SEND RESPONSE
	res.status(200).json({
		status: 'success',
		results: users.length,
		data: {
			users
		}
	})
})

exports.updateMe = catchAsync(async (req, res, next) => {
	// 1) Create error if user POSTs password data
	if (req.body.password || req.body.passwordConfirm) {
		return next(new AppError('This route is not for password updates. Please use /updateMyPassword.', 400))
	}

	// 2) Update user document
	// const user = await User.findById(req.user.id)
	// user.name = 'jon'
	// await user.save()

	// 2) Filtered out unwanted fields name that are not allowed to be updated.
	const filteredBody = filterObj(req.body, 'name', 'email')
	if (req.file) filteredBody.photo = req.file.filename

	// 2) Update user document
	const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
		new: true,
		runValidators: true
	})

	// 4) SEND RESPONSE
	res.status(200).json({
		status: 'success',
		data: {
			user: updatedUser
		}
	})
})

exports.deleteMe = catchAsync(async (req, res, next) => {
	await User.findByIdAndUpdate(req.user.id, { active: false })

	res.status(200).json({
		status: 'success',
		message: 'User deleted'
	})
})

exports.createUser = (req, res) => {
	res.status(500).json({
		status: 'error',
		message: 'Please signup'
	})
}

exports.getUser = getOne(Tour)

// Do not update password with this route.
exports.updateUser = updateOne(Tour)
exports.deleteUser = deleteOne(User)
