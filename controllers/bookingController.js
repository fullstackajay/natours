const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const multer = require('multer')
const Tour = require('../models/tourModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const Booking = require('../models/bookingModel')

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
	// 1) Get the currently booked tour
	const tour = Tour.findById(req.params.tourId)

	// 2) Create checkout session
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				name: `${tour.name} Tour`,
				description: tour.summary,
				images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
				amount: tour.price * 100,
				currency: 'usd',
				quantity: 1
			}
		],
		mode: 'payment',
		customer_email: req.user.email,
		client_reference_id: req.params.tourID,
		success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
		cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`
	})

	// 3) Send session to client
	res.status(200).json({
		status: 'success',
		session
	})
})

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
	const { tour, user, price } = req.query

	if (!tour && !user && !price) return next()
	const booking = await Booking.create({ tour, user, price })
	req.redirect(req.originalUrl.split('?')[0])
})
