const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const xss = require('xss-clean')
const mongoSanitize = require('express-mongo-sanitize')
const hpp = require('hpp')
const path = require('path')
const cookieParser = require('cookie-parser')
const compress = require('compression')

const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')
const viewRouter = require('./routes/viewRoutes')
const bookingRouter = require('./routes/bookingRoutes')

const globalErrorHandler = require('./controllers/errorController')
const AppError = require('./utils/appError')

const app = express()

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

// Global middlewares
// SECURITY HTTP HEADERS
app.use(helmet())

// DEVELOPMENT LOGGING
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

// LIMIT REQUESTS
const limiter = rateLimit({
	max: 100,
	windowMs: 60 * 60 * 1000,
	message: 'Too many requests from this IP, please try again in an hour!'
})
app.use('/api', limiter)

// BODY PARSER, reading data from body into req.body
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// DATA SANITIZATION against NoSQL query injection
app.use(mongoSanitize())

// DATA SANITIZATION against XSS
app.use(xss())

// PREVENT PARAMETER POLLUTION
app.use(
	hpp({
		whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price']
	})
)

// SERVING STATIC FILES
app.use(express.static(path.join(__dirname, 'public')))

// TEST MIDDLEWARE
app.use((req, res, next) => {
	req.requestTime = new Date().toISOString()
	// console.log(req.header);
	next()
})

app.use((req, res, next) => {
	if (req.originalUrl.startsWith('/api')) {
		res.status(503).json({
			status: 'error',
			message: 'API is currently down, check back soon!'
		})
	} else {
		next()
	}
})

app.use(compress())

// ROUTES

app.use('/', viewRouter)
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/bookings', bookingRouter)

// We only reach this code if the routes is wrong.
// If Code is executed until here, that means there is no route to be executed.
// For all kind of routes i.e. GET, POST, DELETE, etc.
// This will catch all routs.
app.all('*', (req, res, next) => {
	// TYPE - 1
	// const err = new Error(`Can't find ${req.originalUrl} on this server.`)
	// err.statusCode = 404
	// err.status = 'fail'

	// The below code will be executed only when there is an error.
	// If we pass anything in the next it will means that is for err.
	// If a next function received an argument express assumes that it is a error.
	// thus code will go to a global error middleware.
	// next(err)

	// TYPE - 2
	next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404))
})

// The express will recognize this is a error handling middleware.
// If we use 4 arguments.
// Only call when there is error.
app.use(globalErrorHandler)

module.exports = app
