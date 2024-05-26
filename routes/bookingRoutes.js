const express = require('express')
const { protect, restrictTo } = require('../controllers/authController')
const { getCheckoutSession } = require('../controllers/bookingController')
const {
	getAllBooking,
	createBooking,
	getBooking,
	updateBooking,
	deleteBooking
} = require('../controllers/viewController')

const router = express.Router()

router.use(protect)

router.get('/checkout-session/:tourId', getCheckoutSession)

router.use(restrictTo('admin', 'lead-guide'))

router.route('/').get(getAllBooking).post(createBooking)
router.route('/:id').get(getBooking).patch(updateBooking).delete(deleteBooking)

module.exports = router
