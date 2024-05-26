const catchAsync = require('../utils/catchAsync')
const jwt = require('jsonwebtoken')
const AppError = require('../utils/appError')
const Email = require('../utils/email')
const User = require('../models/userModel')
const { promisify } = require('util')

const signToken = id => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN
	})
}

const createSendToken = (user, statusCode, res) => {
	const token = signToken(user._id)
	const cookieOptions = {
		expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
		secure: false,
		httpOnly: true
	}

	if (process.env.NODE_ENV === 'production') cookieOptions.secure = true

	res.cookie('jwt', token, cookieOptions)

	user.password = undefined

	res.status(statusCode).json({
		status: 'success',
		token,
		data: {
			user
		}
	})
}

exports.signup = catchAsync(async (req, res, next) => {
	// req.body
	const newUser = await User.create({
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm
	})

	const url = `${req.protocol}://${req.get('host')}/me`
	await new Email(newUser, url).sendWelcome()

	createSendToken(newUser, '201', res)
})

exports.login = catchAsync(async (req, res, next) => {
    console.log('ooooo');
	const { email, password } = req.body

	// 1) Check if email and password exist
	if (!email || !password) {
		return next(new AppError('Please Provide Email and Password', 400))
	}

	// 2) Check if user exists && password is correct
	const user = await User.findOne({ email }).select('+password')
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError('Incorrect Email or Password', 401))
	}

	// 3) If everything ok, send token to client
	createSendToken(user, '200', res)
})

exports.protect = catchAsync(async (req, res, next) => {
	// 1) Getting token and check of it's there
	let token
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
		token = req.headers.authorization.split(' ')[1]
	} else if (req.cookie.jwt) {
		token = req.cookie.jwt
	}

	if (!token) {
		return next(new AppError('You are not logged in! Please log in to get access.', 401))
	}

	// 2) Verification of token
	const decodedToken = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

	// 3) Check if user still exists
	const freshUser = await User.findById(decodedToken.id)
	if (!freshUser) {
		return next(new AppError('The user belonging to this token does no longer exist.', 401))
	}

	// 4) Check if user changed password after the token was issued
	if (freshUser.changedPasswordAfter(decodedToken.iat)) {
		return next(new AppError('User recently changed password! Please log in again.', 401))
	}
	// 5) Check if user is not blocked
	// if (freshUser.isBlocked) {
	// 	return next(new AppError('User account is blocked. Please contact support.', 401))
	// }

	// 6) Add User Role Verification

	// 7) Token Blacklisting
	// Add to your Redis or any fast-access DB
	// if (await tokenBlacklist.isBlacklisted(token)) {
	// 	return next(new AppError('Token has been blacklisted. Please log in again.', 401))
	// }

	// 8) Rate Limiting for Sensitive Routes
	// Implement rate limiting on authentication routes to prevent brute force attacks.

	// Grant access to protected routes
	req.user = freshUser

	// No Need for this if you are creating only API. This is for SER Website on pug.
	res.locals.user = freshUser

	next()
})

// Point no 8
// This would typically be implemented as a separate middleware
// const rateLimit = require('express-rate-limit');

// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // limit each IP to 100 requests per windowMs
//     message: 'Too many attempts from this IP, please try again after 15 minutes',
// });

// app.use('/api/auth', authLimiter);

// Point no 9
// Secure Transmission
// Enforce HTTPS in production
// app.use((req, res, next) => {
//     if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
//         return res.status(403).send('HTTPS Required');
//     }
//     next();
// });

//point np 10
// Comprehensive Logging
// Log attempts
// console.log(`Login attempt for user ID ${decodedToken.id} from IP ${req.ip}`);

exports.restrictTo = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return next(new AppError('You do not have permission to perform this action', 403))
		}
		next()
	}
}

exports.logout = catchAsync(async (req, res, next) => {
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true
	})
	res.status(200).json({
		status: 'success'
	})
})

exports.forgotPassword = catchAsync(async (req, res, next) => {
	// 1) Get user based on POSTed email
	const user = await User.findOne({ email: req.body.email })
	if (!user) {
		return next(new AppError('There is no user with that email address.', 404))
	}

	// 2) Generate the random reset token
	const resetToken = user.createPasswordResetToken()
	// This is to save the user new fields in the createPasswordResetToken and stop the validation process.
	await user.save({ validateBeforeSave: false })

	// 3) Send it to user's email
	const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

	try {
		await new Email(user, resetURL).sendPasswordReset()

		res.status(200).json({
			status: 'success',
			message: 'Token sent to email'
		})
	} catch (err) {
		user.passwordResetToken = undefined
		user.passwordResetExpires = undefined
		await user.save({ validateBeforeSave: false })
		return next(new AppError('There was an error sending the email. Try again later.', 500))
	}
})

exports.resetPassword = catchAsync(async (req, res, next) => {
	// 1) Get user based on the token
	const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

	const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } })

	// 2) If token has not expired, and there is user, set the new password
	if (!user) {
		return next(new AppError('Token is invalid or has expired', 400))
	}

	user.password = req.body.password
	user.passwordConfirm = req.body.passwordConfirm
	user.passwordResetToken = undefined
	user.passwordResetExpires = undefined
	await user.save()

	// 3) Update changedPasswordAt property for the user
	// Use this in logic in the middleware on every save.
	// user.changedPasswordAfter(Date.now() - 1000)

	// 4) Log the user in, send JWT
	createSendToken(user, '200', res)
})

exports.updatePassword = catchAsync(async (req, res, next) => {
	// 1) Get user from collection
	const user = await User.findById(req.user._id).select('+password')
	if (!user) {
		return next(new AppError('No user found with that ID', 404))
	}

	// 2) Check if POSTed current password is correct
	if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
		return next(new AppError('Your current password is wrong.', 401))
	}

	// 3) If so, update password
	user.password = req.body.password
	user.passwordConfirm = req.body.passwordConfirm
	await user.save()
	// user.findByIdAndUpdate will not work as intended! because the pre-save middleware will not work and also the validation.

	// 4) Log user in, send JWT
	createSendToken(user, '200', res)
})

// FOR RENDER
// There will we no error
exports.isLoggedIn = async (req, res, next) => {
	// 1) Getting token and check of it's there
	if (req?.cookie?.jwt) {
		try {
			// 2) Verification of token
			const decodedToken = await promisify(jwt.verify)(req.cookie.jwt, process.env.JWT_SECRET)

			// 3) Check if user still exists
			const freshUser = await User.findById(decodedToken.id)
			if (!freshUser) {
				return next()
			}

			// 4) Check if user changed password after the token was issued
			if (freshUser.changedPasswordAfter(decodedToken.iat)) {
				return next()
			}

			// This is for pug template
			res.locals.user = freshUser
			return next()
		} catch (err) {
			return next()
		}
	}
	next()
}
