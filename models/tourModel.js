const slugify = require('slugify')
// const validator = require('validator')
const mongoose = require('mongoose')

const tourSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'A tour must have a name'],
			unique: true,
			trim: true,
			maxlength: [40, 'The tour must have less then 40 characters'],
			minlength: [10, 'The tour must have at least 10 characters']
			// validate: [validator.isAlpha, 'The tour must only contain characters']
		},
		slug: String,
		duration: {
			type: Number,
			required: [true, 'A tour must have a duration']
		},
		maxGroupSize: {
			type: Number,
			required: [true, 'A tour must have a maxGroupSize']
		},
		difficulty: {
			type: String,
			required: [true, 'A tour must have a difficulty'],
			enum: {
				values: ['easy', 'medium', 'difficult'],
				message: "The tour must have a difficulty of easy', 'medium', 'difficult"
			}
		},
		ratingsAverage: {
			type: Number,
			default: 4.5,
			min: [1, 'Rating must be above 1.0'],
			max: [5, 'Rating must be below 5.0'],
			set: val => Math.round(val * 10) / 10 // 4.666666 -> 46.66666 -> 47 -> 4.7
		},
		ratingsQuantity: {
			type: Number,
			default: 0
		},
		price: {
			type: Number,
			required: [true, 'A tour must have a price']
		},
		priceDiscount: {
			type: Number,
			// required: [true, 'A tour must have a priceDiscount'],
			validate: {
				validator: function (val) {
					// this only points to current doc on NEW document creation.
					return val < this.price
				},
				message: 'Discount price ({VALUE}) should be below regular price'
			}
		},
		summary: {
			type: String,
			trim: true
		},
		description: {
			type: String,
			trim: true,
			required: [true, 'A tour must have a summary']
		},
		imageCover: {
			type: String,
			required: [true, 'A tour must have a imageCover']
		},
		images: [String],
		createdAt: {
			type: Date,
			default: Date.now(),
			select: false
		},
		startDates: [Date],
		secretTour: {
			type: Boolean,
			default: false
		},
		startLocation: {
			// GeoJSON
			type: {
				type: String,
				default: 'Point',
				enum: ['Point']
			},
			coordinates: {
				type: [Number],
				index: '2dsphere'
			},
			address: String,
			description: String
		},
		locations: [
			{
				type: {
					type: String,
					default: 'Point',
					enum: ['Point']
				},
				coordinates: {
					type: [Number],
					index: '2dsphere'
				},
				address: String,
				description: String,
				day: Number
			}
		],
		guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
		// guides: Array
	},
	{
		toJSON: { virtual: true },
		toObject: { virtual: true }
	}
)

tourSchema.index({ price: 1, ratingsAverage: -1 })
tourSchema.index({ slug: 1 })
tourSchema.index({ startLocation: '2dsphere' })

tourSchema.virtual('durationWeeks').get(function () {
	return this.duration / 7
})

// Virtual populate
tourSchema.virtual('reviews', {
	ref: 'Review',
	foreignField: 'tour',
	localField: '_id'
})

// DOCUMENT MIDDLEWARE: runs before .save() and .create() not in .insertMany(), .find(), .update()
tourSchema.pre('save', function (next) {
	this.slug = slugify(this.name, { lower: true })
	next()
})

// tourSchema.pre('save', async function (next) {
// 	const guidesPromises = this.guides.map(async id => await User.findById(id))
// 	this.guides = await Promise.all(guidesPromises)
// 	next()
// })

// tourSchema.pre('save', function (next) {
// 	console.log('saving')
// 	next()
// })

// tourSchema.post('save', function (doc, next) {
// 	console.log('A new tour has been created')
// 	next()
// })

// QUERY MIDDLEWARE: runs after .
tourSchema.pre(/^find/, function (next) {
	this.find({ secretTour: { $ne: true } })
	next()
})

tourSchema.pre(/^find/, function (next) {
	this.populate({ path: 'guides', select: '-__v -passwordChangeAt' })
	next()
})

// tourSchema.post(/^find/, function (doc, next) {
// 	// console.log(doc)
// 	next()
// })

// AGGREGATE MIDDLEWARE: runs after .
tourSchema.pre('aggregate', function (next) {
	this.pipeline().unshift({ $match: { secretTour: { $ne: true } } })
	next()
})

const Tour = mongoose.model('Tour', tourSchema)

module.exports = Tour
