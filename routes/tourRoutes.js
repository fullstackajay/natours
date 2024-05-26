const express = require('express')
const {
	getAllTours,
	createTour,
	getTour,
	updateTour,
	deleteTour,
	aliasTopTours,
	getTourStats,
	getMonthlyPlan,
	getToursWithin,
	getDistances,
	uploadTourImages,
	resizeTourImages
} = require('../controllers/tourController')
const { protect, restrictTo } = require('../controllers/authController')
const reviewRouter = require('./reviewRoutes')

const router = express.Router()

// To redirect into review routs if it matches '/:tourId/reviews' in url.
router.use('/:tourId/reviews', reviewRouter)

// This is a param middleware which only runs when there is id param in the URL.
// router.param('id', checkID)

router.route('/top-5-cheap').get(aliasTopTours, getAllTours)
router.route('/tour-stats').get(getTourStats)
router
	.route('/monthly-plan/:year')
	.get(protect, restrictTo('admin', 'lead-guide', 'guide'))
	.get(getMonthlyPlan)

router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(getToursWithin)
router.route('/distances/:latlng/unit/:unit').get(getDistances)

router.route('/').get(getAllTours).post(protect, restrictTo('admin', 'lead-guide'), createTour)
router
	.route('/:id')
	.get(getTour)
	.patch(protect, restrictTo('admin', 'lead-guide'), uploadTourImages, resizeTourImages, updateTour)
	.delete(protect, restrictTo('admin', 'lead-guide'), deleteTour)

// POST /tour/1234/reviews
// GET /tour/1234/reviews
// GET /tour/1234/reviews/1234

// router.route('/:tourId/reviews').post(protect, restrictTo('user'), createReview)

module.exports = router
