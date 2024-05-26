const Tour = require('../models/tourModel')
const catchAsync = require('../utils/catchAsync')
const User = require('../models/userModel')
const factory = require('./handlerFactory')
const Booking = require('../models/bookingModel')

exports.getOverview = catchAsync(async (req, res, next) => {
	// 1) Get Tour data from collection
	const tours = await Tour.find()

	// 2) Build template

	// 3) Render that template with that data

	res.status(200).render('overview', {
		title: 'All tours',
		tours
	})
})

exports.getTour = catchAsync(async (req, res, next) => {
	// 1) Get the data from requested tour (including reviews and guides)
	const tour = await Tour.findOne({ slug: req.params.slug })
		.populate({
			path: 'reviews',
			fields: 'review rating user'
		})
		.populate({
			path: 'guides',
			select: '-__v -passwordChangeAt'
		})

	if (!tour) {
		return next(new AppError('No tour found with that route', 404))
	}

	// 2) Build template
	res.status(200).render('tour', {
		title: 'tours',
		tour
	})
})

exports.getLoginForm = catchAsync(async (req, res, next) => {
	res.status(200).render('login', {
		title: 'Login'
	})
})

exports.getAccount = catchAsync(async (req, res, next) => {
	res.status(200).render('account', {
		title: 'Account'
	})
})

exports.updateUserData = catchAsync(async (req, res, next) => {
	const updatedUser = await User.findByIdAndUpdate(
		req.user.id,
		{
			name: req.body.name,
			email: req.body.email
		},
		{
			new: true,
			runValidators: true
		}
	)

	res.status(200).render('account', {
		title: 'Account',
		user: updatedUser,
		message: 'Your account has been updated'
	})
})

exports.getMyTours = catchAsync(async (req, res, next) => {
	// 1 ) Find all booking
	const bookings = await Booking.find({ user: req.user.id })

	// 2) Find tours with the tour ids
	const tourIds = bookings.map(el => el.tour)
	const tours = await Tour.find({ _id: { $in: tourIds } })

	res.status(200).render('overview', {
		title: 'My tours',
		tours
	})
})

exports.createBooking = factory.createOne(Booking)
exports.getBooking = factory.getOne(Booking)
exports.getAllBooking = factory.getAll(Booking)
exports.updateBooking = factory.updateOne(Booking)
exports.deleteBooking = factory.deleteOne(Booking)

