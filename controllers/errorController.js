const AppError = require('../utils/appError')

const handleCastError = err => {
	const message = `Invalid ${err.path}: ${err.value}`
	// const message = `Invalid ${err.path.charAt(0).toUpperCase()}${err.path.slice(1)}: ${err.value}`
	return new AppError(message, 400)
}

const handleDuplicateFieldsDB = err => {
	const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]
	const message = `Duplicate field value: ${value}. Please use another value!`
	return new AppError(message, 400)
}

const handleValidationErrorDB = err => {
	const errors = Object.values(err.errors).map(el => el.message)
	const message = `Invalid input data. ${errors.join('. ')}`
	return new AppError(message, 400)
}

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401)
const handleJWTExpiredError = () => new AppError('Expired token. Please log in again.', 401)

const sendErrorDev = (err, req, res) => {
	if (req.originalUrl.startsWith('/api')) {
		res.status(err.statusCode).json({
			status: err.status,
			message: err.message,
			error: err,
			stack: err.stack
		})
	} else {
		res.status(err.statusCode).render('error', {
			title: err.message,
			message: err.message,
			statusCode: err.statusCode
		})
	}
}

const sendErrorProd = (err, req, res) => {
	// A. API Error
	if (req.originalUrl.startsWith('/api')) {
		// Operational error: Trusted error: send message to client
		if (err.isOperational) {
			res.status(err.statusCode).json({
				status: err.status,
				message: err.message
			})
			// Programming error or unknown error: Don't leak a error details.
		} else {
			// 1) Log error: Use logging library to save details to solve the bug.
			console.error('ERROR 💥', err)

			// 2) Send generic message
			res.status(500).json({
				status: 'error',
				message: 'Something went very wrong'
			})
		}
	} else {
		// B. Render Error
		// Operational error: Trusted error: send message to client
		if (err.isOperational) {
			res.status(err.statusCode).render('error', {
				title: err.message,
				message: err.message,
				statusCode: err.statusCode
			})
			// Programming error or unknown error: Don't leak a error details.
		} else {
			// 1) Log error: Use logging library to save details to solve the bug.
			console.error('ERROR 💥', err)

			// 2) Send generic message
			res.status(err.statusCode).render('error', {
				title: 'Something went wrong',
				message: 'Please try again later!',
				statusCode: err.statusCode
			})
		}
	}
}

module.exports = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500
	err.status = err.status || 'error'

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, req, res)
	} else if (process.env.NODE_ENV === 'production') {
		let error = { ...err }
		error.message = err.message

		if (err.name === 'CastError') error = handleCastError(error)
		if (err.code === 11000) error = handleDuplicateFieldsDB(error)
		if (err.name === 'ValidationError') error = handleValidationErrorDB(error)
		if (err.name === 'JsonWebTokenError') error = handleJWTError()
		if (err.name === 'TokenExpiredError') error = handleJWTExpiredError()
		sendErrorProd(error, req, res)
	}
	next()
}
